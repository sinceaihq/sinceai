import * as THREE from "three";
import type { TwinContext } from "../../types";
import { facadeStyle, makeFacadeMaterial, type FacadeStyle } from "../../render/facade";
import { canvasTexture, makeCanvas } from "../../render/canvas";
import { LUMINANCE, kelvinToLinear } from "../../sky/sky";
import { GROUND_STOREY, LEVEL, STOREY } from "./plan";

/**
 * BioCity's materials (SPEC §3.1.2–3.1.3 colours): facade-shader styles for
 * the black ribbon facades, the reflective curtain walls and crown band, the
 * white recess wall and the atrium's inner walls; library variants for steel,
 * glass, roofs, stone and the interior (lit by ctx.envInterior). Everything
 * here is owned by the module and disposed with it.
 */

export type BioMaterials = Record<string, THREE.Material>;

/** Raise the facade shader's coated-glass reflectance (BioCity's glass is mirror-like, SPEC §3.1.3). */
function withReflectance<T extends THREE.MeshStandardMaterial>(m: T, f0: number): T {
  const prev = m.onBeforeCompile;
  const prevKey = m.customProgramCacheKey.bind(m);
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace("vec3 F0 = vec3( 0.085 );", `vec3 F0 = vec3( ${f0.toFixed(3)} );`);
  };
  m.customProgramCacheKey = () => `${prevKey()}-bio-f0-${f0.toFixed(3)}`;
  return m;
}

/**
 * Vertical corrugation (trapezoidal sheet profile) as a normal perturbation from the metre
 * u coordinate: light/shade stripes up close, averaged out (filtered) far away.
 */
function withCorrugation<T extends THREE.MeshStandardMaterial>(m: T, pitch: number, strength: number): T {
  const prevKey = m.customProgramCacheKey.bind(m);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.uniforms.uBioCorrPitch = { value: pitch };
    shader.uniforms.uBioCorrStrength = { value: strength };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vBioUv;\nvarying vec3 vBioWN;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvBioUv = uv;\nvBioWN = normalize( mat3( modelMatrix ) * objectNormal );",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec2 vBioUv;\nvarying vec3 vBioWN;\nuniform float uBioCorrPitch;\nuniform float uBioCorrStrength;",
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
	{
		vec3 nW = normalize( vBioWN );
		if ( abs( nW.y ) < 0.5 ) {
			vec3 tW = normalize( vec3( nW.z, 0.0, -nW.x ) );
			float ph = vBioUv.x / uBioCorrPitch;
			float fw = fwidth( ph );
			// Trapezoid profile slope: +s, 0, -s, 0 over one pitch; fades to flat when sub-pixel.
			float f = fract( ph );
			float slope = f < 0.2 ? 1.0 : f < 0.5 ? 0.0 : f < 0.7 ? -1.0 : 0.0;
			float fade = 1.0 - smoothstep( 0.15, 0.6, fw );
			slope *= uBioCorrStrength * fade;
			vec3 pW = normalize( nW + tW * slope );
			normal = normalize( ( viewMatrix * vec4( pW, 0.0 ) ).xyz );
			diffuseColor.rgb *= 1.0 - 0.06 * abs( slope ) / max( uBioCorrStrength, 1e-3 ) * fade;
		}
	}`,
      );
  };
  m.customProgramCacheKey = () => `${prevKey()}-bio-corr`;
  return m;
}

/** Uniforms shared by the interior materials of one BioCity instance. */
export interface InteriorLight {
  /** Share of direct sunlight (0 in the dollhouse: the hidden floors would shade the hall). */
  sun: { value: number };
  /** Daylight through the vault and glazing as an ambient irradiance (klux, linear RGB). */
  daylight: { value: THREE.Color };
}

export function createInteriorLight(): InteriorLight {
  return { sun: { value: 1 }, daylight: { value: new THREE.Color(0, 0, 0) } };
}

/**
 * Interior lighting patch: scales the sun by `sun` and adds the daylight ambient on top of
 * the material's environment (ctx.envInterior = artificial light). Chains existing patches.
 */
export function withSunScale<T extends THREE.Material>(m: T, light: InteriorLight): T {
  if (m.userData.bioSun) return m;
  m.userData.bioSun = true;
  const prev = m.onBeforeCompile;
  const prevKey = m.customProgramCacheKey.bind(m);
  const chunk =
    THREE.ShaderChunk.lights_fragment_begin
      .replace("getSunLightInfo( sunLight, directLight );", "getSunLightInfo( sunLight, directLight );\n\t\tdirectLight.color *= uBioSun;")
      .replace("getDirectionalLightInfo( directionalLight, directLight );", "getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= uBioSun;") +
    "\n#if defined( RE_IndirectDiffuse )\n\tirradiance += uBioDaylight;\n#endif\n";
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.uniforms.uBioSun = light.sun;
    shader.uniforms.uBioDaylight = light.daylight;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uBioSun;\nuniform vec3 uBioDaylight;")
      .replace("#include <lights_fragment_begin>", chunk);
  };
  m.customProgramCacheKey = () => `${prevKey()}-biosun`;
  m.needsUpdate = true;
  return m;
}

/**
 * The interior environment (ctx.envInterior) is a warm 3500 K office light; BioCity's interior
 * also gets daylight (InteriorLight.daylight). A mild constant tint keeps white walls and the
 * light-grey floor from reading beige under the LEDs. Interior materials are registered here so
 * the module can scale their artificial light by time of day.
 */
const TINT = new THREE.Color(0.93, 1.0, 1.12);
export function neutralise<T extends THREE.Material & { color?: THREE.Color }>(m: T): T {
  if (m.userData.bioBase || !m.color) return m;
  m.userData.bioBase = m.color.clone();
  m.color.multiply(TINT);
  return m;
}

/** Small square ceramic tiles (black tile wall of the entrance, SPEC §3.1.2). */
function tileTexture(base: string, grout: string, tilesPerSide: number, size = 256): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, size, size);
  const cell = size / tilesPerSide;
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < tilesPerSide; i++) {
    for (let j = 0; j < tilesPerSide; j++) {
      const c = new THREE.Color(base);
      c.offsetHSL(0, 0, (rnd() - 0.5) * 0.025);
      ctx.fillStyle = `#${c.getHexString()}`;
      ctx.fillRect(i * cell + 1.5, j * cell + 1.5, cell - 3, cell - 3);
    }
  }
  const t = canvasTexture(canvas, { repeat: true, anisotropy: 8 });
  return t;
}

/** Ceiling: 600 mm acoustic tiles with a darker grid (repeat 0.6 m). */
function ceilingTexture(size = 128): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.fillStyle = "#e8e6e1";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#bdbab3";
  ctx.fillRect(0, 0, size, 2);
  ctx.fillRect(0, 0, 2, size);
  // Fine perforation speckle.
  ctx.fillStyle = "rgba(0,0,0,0.035)";
  for (let y = 6; y < size; y += 6) for (let x = 6; x < size; x += 6) ctx.fillRect(x, y, 1, 1);
  return canvasTexture(canvas, { repeat: true, anisotropy: 8 });
}

export interface BioStyles {
  ribbonBlack: FacadeStyle;
  crown: FacadeStyle;
  tower: FacadeStyle;
  field: FacadeStyle;
  panelBlack: FacadeStyle;
  ribbonWhite: FacadeStyle;
  whiteGrid: FacadeStyle;
  shopfront: FacadeStyle;
  atrium: FacadeStyle;
  atriumPlain: FacadeStyle;
  slotGlass: FacadeStyle;
  officeFront: FacadeStyle;
  shopClosed: FacadeStyle;
}

/** Facade-shader styles of BioCity (SPEC §3.1.2). */
export function bioStyles(): BioStyles {
  const glassColor = "#2f3d4a";
  return {
    // F2–F7 ribbon windows in 1.2 m units on satin black panels (louvres are real geometry).
    ribbonBlack: facadeStyle("blackPanelRibbon", {
      storey: STOREY,
      groundStorey: GROUND_STOREY,
      window: [1.2, 1.4],
      sill: 0.9,
      louvre: undefined,
      ribbonGroups: { units: 7, gap: 0.6 },
      groundFloor: { kind: "solid" },
      coping: { height: 0.18, color: "#1e1e22" },
      glassColor: "#1d2630",
      glassTransmittance: 0.4,
      blinds: 0.3,
    }),
    // F7 glass crown band: continuous curtain wall, 1.2 m modules, three pane rows (y 22.45 → 26.8).
    crown: facadeStyle("curtainWall", {
      storey: LEVEL.parapet - LEVEL.f7,
      groundStorey: 0.001,
      bay: 1.2,
      transoms: [1.45, 2.9],
      spandrel: undefined,
      mullion: 0.07,
      frame: 0.05,
      frameColor: "#1e1e22",
      wall: "metalDark",
      glassColor,
      glassTransmittance: 0.28,
      interior: "office",
      roomDepth: 6,
      blinds: 0.15,
      // Mirror glass: fewer rooms read as lit from outside than behind ordinary windows.
      occupancy: 0.6,
    }),
    // Glass corner tower: square panes (1.2 × 1.235 m) from the pilotis soffit to the top.
    tower: facadeStyle("curtainWall", {
      storey: 3.705,
      groundStorey: 0.001,
      bay: 1.2,
      transoms: [1.235, 2.47],
      spandrel: undefined,
      mullion: 0.07,
      frame: 0.05,
      frameColor: "#1e1e22",
      wall: "metalDark",
      glassColor,
      glassTransmittance: 0.26,
      roomDepth: 7,
      blinds: 0.1,
      occupancy: 0.6,
    }),
    // N-block curtain-wall field over F2–F6 (three rows per storey).
    field: facadeStyle("curtainWall", {
      storey: STOREY,
      groundStorey: 0.001,
      bay: 1.2,
      transoms: [1.22, 2.43],
      spandrel: undefined,
      mullion: 0.07,
      frame: 0.05,
      frameColor: "#1e1e22",
      wall: "metalDark",
      glassColor,
      glassTransmittance: 0.28,
      roomDepth: 6,
      blinds: 0.15,
      occupancy: 0.6,
    }),
    // Plain black panels, 3.6 m modules aligned with the floors.
    panelBlack: facadeStyle("plain", {
      wall: "panelBlack",
      storey: STOREY,
      panelJoints: { w: 3.6, h: STOREY, width: 0.014, color: "#141417" },
      coping: { height: 0.18, color: "#1e1e22" },
    }),
    // White recess wall: white panels, ribbons with white frames (black louvres are geometry).
    ribbonWhite: facadeStyle("blackPanelRibbon", {
      wall: "metalWhite",
      wallColor: "#e8eaed",
      storey: STOREY,
      groundStorey: GROUND_STOREY,
      window: [1.2, 1.45],
      sill: 0.85,
      frame: 0.05,
      frameColor: "#f1f2f2",
      mullion: 0.07,
      louvre: undefined,
      ribbonGroups: { units: 9, gap: 1.4 },
      panelJoints: { w: 1.2, h: STOREY, width: 0.01, color: "#c9ccd0" },
      coping: undefined,
      groundFloor: { kind: "solid" },
      glassColor: "#1f2a33",
      glassTransmittance: 0.5,
    }),
    // White end walls facing the gap over the Joki connector (punched windows).
    whiteGrid: facadeStyle("whitePanelGrid", {
      wallColor: "#e6e8ea",
      storey: STOREY,
      groundStorey: GROUND_STOREY,
      bay: 2.4,
      window: [1.8, 1.45],
      sill: 0.9,
      frameColor: "#e0e2e4",
      groundFloor: { kind: "solid" },
      coping: { height: 0.2, color: "#d8dadd" },
    }),
    // Ground-storey shopfronts behind the arcades.
    shopfront: facadeStyle("plain", {
      wall: "metalDark",
      wallColor: "#1e1e22",
      storey: STOREY,
      groundStorey: 3.95,
      groundFloor: { kind: "storefront" },
      interior: "retail",
      roomDepth: 8,
      coping: undefined,
      glassColor: "#1b2228",
      glassTransmittance: 0.7,
    }),
    // Atrium inner walls: white panels with white-framed window bands (office floors F2–F7).
    atrium: facadeStyle("blackPanelRibbon", {
      wall: "plasterWhite",
      wallColor: "#e6e6e8",
      storey: STOREY,
      groundStorey: GROUND_STOREY,
      window: [1.2, 1.5],
      sill: 0.95,
      frame: 0.05,
      frameColor: "#f4f4f2",
      mullion: 0.07,
      louvre: undefined,
      ribbonGroups: { units: 6, gap: 0.6 },
      panelJoints: { w: 2.4, h: STOREY, width: 0.008, color: "#cfd0d2" },
      coping: undefined,
      groundFloor: { kind: "solid" },
      glassColor: "#222a30",
      glassTransmittance: 0.62,
      blinds: 0.35,
      warmth: 0.35,
    }),
    atriumPlain: facadeStyle("plain", {
      wall: "plasterWhite",
      wallColor: "#e3e3e5",
      storey: STOREY,
      panelJoints: { w: 2.4, h: 1.2, width: 0.008, color: "#cfd0d2" },
      coping: undefined,
    }),
    // The lobby's shop units are closed over the event weekend: dim, most blinds down.
    shopClosed: facadeStyle("plain", {
      wall: "metalDark",
      wallColor: "#1e1e22",
      storey: STOREY,
      groundStorey: 3.95,
      groundFloor: { kind: "storefront" },
      interior: "retail",
      roomDepth: 8,
      coping: undefined,
      glassColor: "#1b2228",
      glassTransmittance: 0.6,
      occupancy: 0.12,
      blinds: 0.65,
    }),
    // Glazed meeting-room fronts on the lobby (frosted band, dark frames).
    officeFront: facadeStyle("curtainWall", {
      storey: 3.44,
      groundStorey: 0.001,
      bay: 1.2,
      transoms: [0.95, 1.65, 2.6],
      spandrel: undefined,
      mullion: 0.06,
      frame: 0.04,
      frameColor: "#2a2b2e",
      wall: "metalDark",
      glassColor: "#3a4148",
      glassTransmittance: 0.75,
      interior: "office",
      roomDepth: 6,
      blinds: 0.4,
      warmth: 0.4,
    }),
    // Back of the SW slots: full-height glazing.
    slotGlass: facadeStyle("curtainWall", {
      storey: STOREY,
      groundStorey: 0.001,
      bay: 1.25,
      transoms: [1.22, 2.43],
      spandrel: { height: 0.5, color: "#1a1d21" },
      mullion: 0.07,
      frameColor: "#1e1e22",
      wall: "metalDark",
      glassColor,
      glassTransmittance: 0.35,
    }),
  };
}

/** All materials keyed for Buckets. */
export function createBioMaterials(ctx: TwinContext): { materials: BioMaterials; textures: THREE.Texture[]; light: InteriorLight } {
  const light = createInteriorLight();
  const lib = ctx.materials;
  const tier = ctx.tier;
  const S = bioStyles();
  const textures: THREE.Texture[] = [];
  const facade = (style: FacadeStyle) => makeFacadeMaterial(lib, style, { tier });
  const env = ctx.envInterior;
  const indoor = <T extends THREE.MeshStandardMaterial>(m: T, intensity = 1): T => {
    if (env) {
      m.envMap = env;
      m.envMapIntensity = intensity;
    }
    neutralise(m);
    m.userData.bioEnv = intensity;
    return withSunScale(m, light);
  };

  const tiles = tileTexture("#222527", "#121314", 4);
  tiles.repeat.set(1 / 0.6, 1 / 0.6);
  textures.push(tiles);
  const ceilingTex = ceilingTexture();
  ceilingTex.repeat.set(1 / 0.6, 1 / 0.6);
  textures.push(ceilingTex);

  const tileWall = lib.variant("blackMatte", { color: "#ffffff", roughness: 0.32 });
  tileWall.map = tiles;
  tileWall.needsUpdate = true;

  const ceiling = indoor(lib.variant("ceiling", { color: "#ffffff", roughness: 0.92 }), 1);
  ceiling.map = ceilingTex;
  ceiling.needsUpdate = true;

  const warm = kelvinToLinear(3000);
  const neutral = kelvinToLinear(3800);

  // Float glass: crisp reflections (a sun glint is a small bright spot, not a glowing pane).
  const glass = (coverage: number, color: string, env = 1.2) => {
    const m = lib.variant("glassInterior", { color, opacity: coverage, envMapIntensity: env, roughness: 0.03 });
    m.normalScale.set(0.015, 0.015);
    return m;
  };

  const materials: BioMaterials = {
    // ── Facades (shader) ──
    ribbonBlack: facade(S.ribbonBlack),
    crown: withReflectance(facade(S.crown), 0.2),
    tower: withReflectance(facade(S.tower), 0.2),
    field: withReflectance(facade(S.field), 0.2),
    panelBlack: facade(S.panelBlack),
    ribbonWhite: facade(S.ribbonWhite),
    whiteGrid: facade(S.whiteGrid),
    shopfront: facade(S.shopfront),
    slotGlass: withReflectance(facade(S.slotGlass), 0.2),
    atrium: indoor(facade(S.atrium), 1.0),
    shopfrontIn: indoor(facade(S.shopClosed), 1.0),
    officeFront: indoor(facade(S.officeFront), 1.0),
    atriumPlain: indoor(facade(S.atriumPlain), 1.0),
    // ── Exterior solids ──
    blackSteel: lib.variant("metalDark", { color: "#1e1e22", roughness: 0.78 }),
    soffitExt: lib.variant("metalDark", { color: "#1b1b1e", roughness: 0.85, envMapIntensity: 0.7 }),
    blackPanel: lib.variant("panelBlack", { color: "#26252a" }),
    techStorey: withCorrugation(lib.variant("panelGrey", { color: "#c8ccce", roughness: 0.55 }), 0.2, 0.55),
    roof: lib.variant("concreteFacade", { color: "#a8a8a2", roughness: 0.95 }),
    coping: lib.variant("metalWhite", { color: "#dadde0", roughness: 0.5 }),
    silver: lib.variant("steel", { color: "#a8b0b6", roughness: 0.45 }),
    whiteSteel: lib.variant("metalWhite", { color: "#e9ebec", roughness: 0.45 }),
    tileWall,
    granite: lib.variant("granite", { color: "#a39885" }),
    paving: (() => {
      // Light-grey slabs (SPEC #7F7D79); wins over the street paving it overlaps at the recess edges.
      const m = lib.variant("pavers", { color: "#7f7d79" });
      m.polygonOffset = true;
      m.polygonOffsetFactor = -1;
      m.polygonOffsetUnits = -2;
      return m;
    })(),
    decking: lib.variant("oak", { color: "#8a7560", roughness: 1 }),
    planter: lib.variant("metalDark", { color: "#2a2b2d", roughness: 0.7 }),
    soil: lib.variant("soil", {}),
    flagpole: lib.variant("metalWhite", { color: "#eef0f1", roughness: 0.35 }),
    // Black corrugated duct cladding: satin, not glossy (the roughness map of the set is dark).
    ductBlack: withCorrugation(lib.variant("metalDark", { color: "#141416", roughness: 1.6, envMapIntensity: 0.35 }), 0.12, 0.3),
    // High glazing (gables over the roofs) reflects the sky; street-level glazing mostly reflects the
    // buildings across the street, not open sky, so its sky reflection is turned down (no milky veil).
    glassClear: glass(0.2, "#0e1418", 0.5),
    glassLow: glass(0.24, "#0e1418", 0.26),
    glassVault: glass(0.2, "#101820", 1.0),
    glassDoor: glass(0.1, "#0c1013", 0.75),
    plantGrey: lib.variant("metalWhite", { color: "#b9bec1", roughness: 0.7 }),
    signPanel: lib.variant("metalDark", { color: "#121214", roughness: 0.6 }),
    lightWarm: new THREE.MeshBasicMaterial({ color: warm.clone().multiplyScalar(LUMINANCE.bollard) }),
    lightStrip: new THREE.MeshBasicMaterial({ color: neutral.clone().multiplyScalar(LUMINANCE.ceilingPanel) }),
    // ── Interior ──
    floorLobby: indoor(lib.variant("stoneFloor", { color: "#cfcdc8", roughness: 0.55 }), 0.85),
    floorMauno: (() => {
      // Laid over the lobby floor (2 mm): wins the depth test at any distance.
      const m = indoor(lib.variant("stoneFloor", { color: "#6e6a67", roughness: 0.6 }), 0.85);
      m.polygonOffset = true;
      m.polygonOffsetFactor = -1;
      m.polygonOffsetUnits = -2;
      return m;
    })(),
    plaster: indoor(lib.variant("plasterWhite", { color: "#e6e6e8" }), 0.8),
    wallCap: indoor(lib.variant("plasterGrey", { color: "#3b3c40", roughness: 0.9 }), 0.8),
    plasterGrey: indoor(lib.variant("plasterGrey", { color: "#9a9ca0" }), 1),
    ceiling,
    soffit: indoor(lib.variant("metalDark", { color: "#1c1c1f", roughness: 0.8 }), 0.6),
    columnBlack: indoor(lib.variant("metalDark", { color: "#26252a", roughness: 0.5 }), 1),
    steelIn: indoor(lib.variant("metalDark", { color: "#18181b", roughness: 0.45, metalness: 0.5 }), 1),
    silverIn: indoor(lib.variant("steel", { color: "#b5bcc1", roughness: 0.4 }), 1),
    whiteIn: indoor(lib.variant("metalWhite", { color: "#f0f1f1", roughness: 0.45 }), 1),
    glassIn: indoor(glass(0.08, "#0d1012", 0.35), 0.35),
    concreteIn: indoor(lib.variant("concreteFloor", { color: "#c9c8c3" }), 1),
    timber: indoor(lib.variant("oak", { color: "#b0774e", roughness: 0.7 }), 1),
    moss: indoor(lib.variant("grass", { color: "#878d2c", roughness: 1 }), 0.8),
    darkIn: indoor(lib.variant("blackMatte", { color: "#151517", roughness: 0.6 }), 1),
    whiteTop: indoor(lib.variant("plasterWhite", { color: "#f2f2f0", roughness: 0.35 }), 1),
    stainless: indoor(lib.variant("steel", { color: "#c8ccd0", roughness: 0.3 }), 1),
    greenChair: indoor(lib.variant("blackMatte", { color: "#8fb57d", roughness: 0.55 }), 1),
    whiteChair: indoor(lib.variant("blackMatte", { color: "#e9e9e6", roughness: 0.5 }), 1),
    curtain: indoor(lib.variant("fabricDark", { color: "#494647" }), 1),
    pendant: new THREE.MeshBasicMaterial({ color: kelvinToLinear(2900).multiplyScalar(LUMINANCE.ceilingPanel * 0.5) }),
    liftCar: indoor(lib.variant("steel", { color: "#d3d6d8", roughness: 0.35 }), 1),
    stairTread: indoor(lib.variant("metalDark", { color: "#2b2b2e", roughness: 0.7 }), 1),
    downlight: new THREE.MeshBasicMaterial({ color: warm.clone().multiplyScalar(LUMINANCE.ceilingPanel * 1.6) }),
    standBlack: indoor(lib.variant("blackMatte", { color: "#0e0e10", roughness: 0.45 }), 1),
    violetLine: new THREE.MeshBasicMaterial({ color: new THREE.Color("#8b7bff").multiplyScalar(LUMINANCE.eventLight * 0.5) }),
    panelLight: new THREE.MeshBasicMaterial({ color: neutral.clone().multiplyScalar(LUMINANCE.ceilingPanel) }),
  };
  return { materials, textures, light };
}
