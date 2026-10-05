import * as THREE from "three";
import type { LevelId, TwinContext, V2 } from "../../types";
import {
  Batcher,
  DEG,
  FACETS,
  FACET_DEG,
  FIN_PITCH,
  F3_DOOR_BEARING,
  J,
  MULLION_START,
  R,
  Y,
  angleBetween,
  annulus,
  arcStrip,
  box,
  chainPatch,
  cylinder,
  finLayout,
  instanceMatrix,
  merge,
  metreUV,
  paint,
  pbr,
  polar,
  ringPrism,
  rod,
  yawToBearing,
} from "./kit";
import type { JokiMaterials } from "./mats";
import { boardFormed, boltedPanels, checkerPlate } from "./textures";
import { kelvinToLinear } from "../../sky/sky";

/**
 * The round tower's exterior (SPEC §3.2.2): board-formed concrete drum
 * (floor 1, below the deck), white slab bands, the 64-facet curtain wall of
 * floors 2–3 with dark mullion caps, 16 black columns, the 448-element fin
 * screen (384 fins + 64 posts) with its two "smile" cut-outs and the opening
 * at the floor-3 door, bracket rings, roof with plant, the north-east door
 * steps and the external floor-3 exit stair.
 *
 * Every vertical element is one instance of a unit prism, so a dollhouse
 * cut is a per-instance height clip and a camera-facing sector cut (no
 * shader discard — the AO and shadow passes see the same geometry).
 */

/** One vertical element of the screen/curtain wall: a unit box instance. */
interface Element {
  bearing: number;
  r: number;
  y0: number;
  y1: number;
  /** Tangential width, radial depth (m). */
  w: number;
  d: number;
  /** Bands and rails stay out of the sector cut (they belong to the slabs). */
  sector: boolean;
  /** Extra yaw (diagonal brackets). */
  yaw?: number;
  /** Frames set only: colour (sRGB hex), roughness, metalness. */
  color?: string;
  rough?: number;
  metal?: number;
}

interface ElementSet {
  mesh: THREE.InstancedMesh;
  items: Element[];
}

export interface TowerShell {
  /** Static exterior (drum, steps, stair, roof) — in the J group. */
  ext: THREE.Group;
  /** Instanced curtain wall, columns, fins and bands — cut when open. */
  shell: THREE.Group;
  /** Roof (hidden when the tower is open). */
  roof: THREE.Group;
  /** Inner faces of the drum: the Showroom's wall (west) and the lounge's (north-east). */
  drumInner: { showroom: THREE.BufferGeometry; lounge: THREE.BufferGeometry };
  setOpen(level: LevelId | null): void;
  /** Camera in the J frame (plan x, y, plan z). Re-cuts when the view direction changes. */
  update(cameraJ: THREE.Vector3): boolean;
  setNight(night: number): void;
  /** Direction towards the sun (world): the fins' own shading. */
  setSun(dir: THREE.Vector3): void;
  /** Far fins as a filtered band (closed tower only; the dollhouse cuts draw the real fins). */
  setFinLod(on: boolean): void;
  ready: Promise<unknown>;
  dispose(): void;
}

/** Drum arcs with walls (J-bearings); the south-east is the storage block of the low wing. */
export const DRUM_ARCS: readonly [number, number][] = [
  [186.7, 322.3],
  [322.3, 332.6],
  [332.6, 358.7],
  [6.3, 83.5],
];

/** Floor-2 north-east door and the doors' facets. */
export const DOORS = {
  f2ne: { bearing: 0.5, level: Y.f2, width: 1.7 },
  f2ssw: { bearing: 158, level: Y.f2, width: 1.7 },
  f3se: { bearing: F3_DOOR_BEARING, level: Y.f3, width: 1.7 },
} as const;

export function buildTowerShell(ctx: TwinContext, mats: JokiMaterials): TowerShell {
  const low = ctx.tier === "low";
  const ext = new THREE.Group();
  ext.name = "joki-tower-ext";
  const shell = new THREE.Group();
  shell.name = "joki-tower-shell";
  const roof = new THREE.Group();
  roof.name = "joki-tower-roof";
  const batch = new Batcher();
  const owned: { dispose(): void }[] = [];

  // ── Materials ──
  const board = boardFormed({ px: low ? 512 : 1024 });
  owned.push(board.texture);
  const concrete = mats.get("concreteFacade", "ext", { roughness: 1.0 }, "jk-drum");
  concrete.map = board.texture;
  concrete.color.set("#ffffff");
  concrete.needsUpdate = true;

  const panels = boltedPanels({ base: "#c3c6c8" });
  owned.push(panels.texture);
  const alu = mats.get("panelGrey", "ext", { roughness: 0.55, metalness: 0.35 }, "jk-alu");
  alu.map = panels.texture;
  alu.color.set("#ffffff");
  alu.needsUpdate = true;

  const finMat = mats.get("metalWhite", "ext", { color: "#dcdfe2", roughness: 0.42, metalness: 0.55 }, "jk-fin");
  const finBase = finMat.color.clone();
  // Bands, mullion caps and profiles, bracket rails: one instanced mesh, colour and PBR per instance.
  const framesMat = mats.uber("ext");
  const column = mats.get("metalDark", "ext", { color: "#151a1e", roughness: 0.5, metalness: 0.4 }, "jk-column");
  // Clear float glass (no smudge haze); the fin screen hides much of the sky it would reflect.
  // Closed thin boxes: front faces only, one pass.
  const glass = mats.glass("ext", { opacity: 0.1, envMapIntensity: 0.3, roughness: 0.025 }, "jk-glass");
  glass.normalScale.set(0.008, 0.008);
  const membrane = mats.get("asphaltFootway", "ext", { color: "#8a8d8f" }, "jk-membrane");
  const checker = checkerPlate();
  owned.push(checker.texture);
  const tread = mats.get("steel", "ext", { color: "#a3a7a9", roughness: 0.6 }, "jk-tread");
  tread.map = checker.texture;
  tread.color.set("#ffffff");
  tread.needsUpdate = true;
  const balustrade = mats.glass("ext", { opacity: 0.08 }, "jk-balustrade");
  // Flat-painted parts (coping, plant, steelwork): the exterior uber material.
  const uber = mats.uber("ext");
  const COPING = (g: THREE.BufferGeometry) => pbr(g, "#dadde0", 0.5, 0);
  const PLANT = (g: THREE.BufferGeometry) => pbr(g, "#3a3d40", 0.6, 0.2);
  const PLANT_LIGHT = (g: THREE.BufferGeometry) => pbr(g, "#b8bcbf", 0.6, 0.2);
  const STAINLESS = (g: THREE.BufferGeometry) => pbr(g, "#c9cbcc", 0.32, 1);
  const GALV = (g: THREE.BufferGeometry) => pbr(g, "#c8cbcd", 0.45, 1);
  const BLACK_STEEL = (g: THREE.BufferGeometry) => pbr(g, "#151a1e", 0.5, 0.4);

  // Uplight at the base of the fins after dusk (warm-white LED strip) — painted into the emissive: about
  // 50 cd/m² at the foot of a fin, gone within the first 2–3 m (photos: blue hour — a soft warm band at the
  // base, the comb above it stays silver).
  const uplight = { value: 0 };
  const warm = kelvinToLinear(3500);
  chainPatch(finMat, "jk-uplight", (shader) => {
    shader.uniforms.uJkUp = uplight;
    shader.uniforms.uJkWarm = { value: warm };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vJkUp;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
	#ifdef USE_INSTANCING
		vJkUp = position.y * length( instanceMatrix[ 1 ].xyz );
	#else
		vJkUp = 100.0;
	#endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uJkUp;\nuniform vec3 uJkWarm;\nvarying float vJkUp;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
	totalEmissiveRadiance += uJkWarm * uJkUp * ( 0.85 * exp( -vJkUp / 0.6 ) + 0.15 * exp( -vJkUp / 2.5 ) );`,
      );
  });
  // Sun on the fin screen without shadow-map texels (a 20 mm fin is far below a shadow texel): the fins
  // look the shadow map up 0.5 m towards the sun — past their neighbours, so only real occluders (the
  // tower, other buildings) shade them — and shade each other analytically: a side face is lit where
  // the sun reaches past the next fin (gap 0.122 m, depth 0.09 m), the face towards the glass never;
  // the gaps darken towards the glass (ambient occlusion).
  const sunDir = { value: new THREE.Vector3(0, 1, 0) };
  /** 1 = far fins hand over to the filtered band (closed tower); 0 = real fins only (dollhouse cuts). */
  const finLod = { value: 1 };
  chainPatch(finMat, "jk-finsun", (shader) => {
    shader.uniforms.uJkSunDir = sunDir;
    shader.uniforms.uJkLod = finLod;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vJkRad;\nvarying vec3 vJkTan;\nvarying vec3 vJkN;\nvarying float vJkDepth;\nvarying vec3 vJkWorld;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
	#ifdef USE_INSTANCING
		mat4 jkM = modelMatrix * instanceMatrix;
		vJkWorld = ( jkM * vec4( transformed, 1.0 ) ).xyz;
		vJkRad = normalize( ( jkM * vec4( 0.0, 0.0, 1.0, 0.0 ) ).xyz );
		vJkTan = normalize( ( jkM * vec4( 1.0, 0.0, 0.0, 0.0 ) ).xyz );
		vJkN = normalize( ( jkM * vec4( objectNormal, 0.0 ) ).xyz );
		vJkDepth = position.z + 0.5;
	#else
		vJkWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
		vJkRad = vec3( 0.0, 0.0, 1.0 );
		vJkTan = vec3( 1.0, 0.0, 0.0 );
		vJkN = vec3( 0.0, 0.0, 1.0 );
		vJkDepth = 1.0;
	#endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 uJkSunDir;\nuniform float uJkLod;\nvarying vec3 vJkRad;\nvarying vec3 vJkTan;\nvarying vec3 vJkN;\nvarying float vJkDepth;\nvarying vec3 vJkWorld;",
      )
      .replace(
        "#include <clipping_planes_fragment>",
        `#include <clipping_planes_fragment>
	// Far away a 20 mm fin is under a pixel and breaks into dashes: it hands over (dithered) to the
	// filtered band (finBand below) as its width drops under about 1.5 px.
	if ( uJkLod > 0.5 ) {
		float jkPx = length( fwidth( vJkWorld ) );
		float jkFade = smoothstep( ${FIN_LOD_PX[0].toFixed(4)}, ${FIN_LOD_PX[1].toFixed(4)}, jkPx );
		float jkIgn = fract( 52.9829189 * fract( dot( gl_FragCoord.xy, vec2( 0.06711056, 0.00583715 ) ) ) );
		if ( jkFade > 0.0 && jkIgn < jkFade ) discard;
	}`,
      )
      .replace(
        "vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );",
        "vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias + uJkSunDir * 0.5, 1.0 );",
      )
      .replace(
        "#include <lights_fragment_begin>",
        `float jkLit = 1.0;
	{
		float sr = dot( uJkSunDir, vJkRad );
		float st = dot( uJkSunDir, vJkTan );
		float ft = dot( vJkN, vJkTan );
		if ( abs( ft ) > 0.5 ) {
			float facing = st * sign( ft );
			jkLit = facing > 0.0 ? clamp( 1.36 * sr / max( facing, 1e-3 ), 0.0, 1.0 ) * smoothstep( -0.02, 0.06, sr ) : 0.0;
		} else if ( dot( vJkN, vJkRad ) < -0.5 ) jkLit = 0.0;
	}
	${THREE.ShaderChunk.lights_fragment_begin.replace("getSunLightInfo( sunLight, directLight );", "getSunLightInfo( sunLight, directLight ); directLight.color *= jkLit;")}`,
      )
      .replace(
        "#include <aomap_fragment>",
        `#include <aomap_fragment>
	{
		float jkAO = abs( dot( vJkN, vJkTan ) ) > 0.5 ? mix( 0.5, 1.0, vJkDepth ) : ( dot( vJkN, vJkRad ) < -0.5 ? 0.45 : 1.0 );
		reflectedLight.indirectDiffuse *= jkAO;
		reflectedLight.indirectSpecular *= jkAO;
	}`,
      );
  });

  // ── Drum (floor 1): outer face in the exterior, inner face for the interior ──
  const drumBottom = Y.serviceYard - 0.2;
  const drumTop = Y.f1Soffit;
  const drumOuter: THREE.BufferGeometry[] = [];
  const drumInnerParts: THREE.BufferGeometry[] = [];
  const drumInnerLounge: THREE.BufferGeometry[] = [];
  for (const [b0, b1raw] of DRUM_ARCS) {
    const b1 = b1raw < b0 ? b1raw + 360 : b1raw;
    const thin = b0 === 322.3;
    const rOut = thin ? 8.94 : R.drumOut;
    drumOuter.push(arcStrip(rOut, b0, b1, drumBottom, drumTop, { seg: Math.ceil((b1 - b0) / 1.5) }));
    (b0 < 90 ? drumInnerLounge : drumInnerParts).push(arcStrip(R.drumIn, b0, b1, Y.f1, drumTop, { seg: Math.ceil((b1 - b0) / 1.5), inward: true }));
    // End faces of each wall piece.
    for (const b of [b0, b1]) {
      const [xi, zi] = polar(R.drumIn, b);
      const [xo, zo] = polar(rOut, b);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute([xi, drumBottom, zi, xo, drumBottom, zo, xo, drumTop, zo, xi, drumTop, zi], 3));
      g.setIndex(b === b0 ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
      g.computeVertexNormals();
      drumOuter.push(metreUV(g));
    }
  }
  // Louvre in the thinner north-west wall piece (air intake), dark slats.
  for (let i = 0; i < 9; i++) {
    const y = 0.7 + i * 0.16;
    drumOuter.push(ringPrism(8.94, 9.12, 323.5, 331.4, y, y + 0.05, { seg: 6 }));
  }
  batch.add(ext, concrete, drumOuter, { cast: true, receive: true });

  // Drum cap under the slab band.
  batch.add(ext, concrete, annulus(R.drumIn, R.drumOut, 0, 360, drumTop - 0.001, { seg: 128 }), { receive: true });

  // ── Slab edge bands (instanced unit boxes per facet) ──
  const sets: ElementSet[] = [];
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  unitBox.translate(0, 0.5, 0);
  metreUV(unitBox);
  owned.push(unitBox);

  function addSet(items: Element[], material: THREE.Material, cast: boolean, name: string, geometry = unitBox): ElementSet {
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    mesh.name = `joki:${name}`;
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    const set = { mesh, items };
    sets.push(set);
    shell.add(mesh);
    return set;
  }

  const facetChord = 2 * R.glassOut * Math.sin((FACET_DEG / 2) * DEG);
  const frameItems: Element[] = [];
  const BAND = { color: "#d9dcde", rough: 0.45, metal: 0.3 };
  for (let k = 0; k < FACETS; k++) {
    const b = MULLION_START + (k + 0.5) * FACET_DEG;
    frameItems.push({ bearing: b, r: 9.27, y0: 2.5, y1: 2.97, w: facetChord + 0.03, d: 0.12, sector: false, ...BAND });
    frameItems.push({ bearing: b, r: 9.27, y0: 6.5, y1: 6.97, w: facetChord + 0.03, d: 0.12, sector: false, ...BAND });
    frameItems.push({ bearing: b, r: 9.27, y0: 10.85, y1: 11.4, w: facetChord + 0.03, d: 0.12, sector: false, ...BAND });
  }

  // ── Curtain wall: glass facets per storey ──
  const glassItems: Element[] = [];
  for (let k = 0; k < FACETS; k++) {
    const b = MULLION_START + (k + 0.5) * FACET_DEG;
    glassItems.push({ bearing: b, r: 9.19, y0: 2.97, y1: 6.5, w: facetChord, d: 0.024, sector: true });
    glassItems.push({ bearing: b, r: 9.19, y0: 6.97, y1: 10.85, w: facetChord, d: 0.024, sector: true });
  }
  const glassSet = addSet(glassItems, glass, false, "glass");
  // The fins' shadows fall on the glass too (no sun glare where the screen shades it).
  glassSet.mesh.receiveShadow = true;
  glassSet.mesh.renderOrder = 2;

  // Mullions: dark caps outside, silver profiles inside, full height of floors 2–3.
  for (let k = 0; k < FACETS; k++) {
    const b = MULLION_START + k * FACET_DEG;
    frameItems.push({ bearing: b, r: 9.27, y0: 2.97, y1: 10.85, w: 0.06, d: 0.08, sector: true, color: "#33373b", rough: 0.55, metal: 0.5 });
    frameItems.push({ bearing: b, r: 9.1, y0: 2.97, y1: 10.85, w: 0.05, d: 0.12, sector: true, color: "#b9bcbe", rough: 0.45, metal: 1 });
  }

  // 16 black steel columns Ø0.21 at r 8.80, J 33.76° + 22.5°k (floors 2–3).
  const colGeo = new THREE.CylinderGeometry(0.105, 0.105, 1, 12);
  colGeo.translate(0, 0.5, 0);
  metreUV(colGeo);
  owned.push(colGeo);
  const colItems: Element[] = [];
  for (let k = 0; k < 16; k++) colItems.push({ bearing: 33.76 + 22.5 * k, r: R.column, y0: Y.f2, y1: Y.roof - 0.05, w: 1, d: 1, sector: true });
  const colMesh = new THREE.InstancedMesh(colGeo, column, colItems.length);
  colMesh.name = "joki:columns";
  // Inside the glass and behind the fins: their shadow never shows outside.
  colMesh.castShadow = false;
  colMesh.receiveShadow = true;
  shell.add(colMesh);
  sets.push({ mesh: colMesh, items: colItems });

  // ── Fin screen: 448 elements (posts deeper), split at the floor-3 door ──
  const finItems: Element[] = [];
  for (const f of finLayout()) {
    for (const [y0, y1] of f.pieces) {
      finItems.push({
        bearing: f.bearing,
        r: f.post ? (R.postIn + R.postOut) / 2 : (R.finIn + R.finOut) / 2,
        y0,
        y1,
        w: f.post ? 0.03 : 0.02,
        d: f.post ? R.postOut - R.postIn : R.finOut - R.finIn,
        sector: true,
      });
    }
  }
  const finSet = addSet(finItems, finMat, true, "fins");
  // Receives with the lifted lookup above (real occluders only).
  finSet.mesh.receiveShadow = true;
  const band = finBand(mats, { finLod, sunDir, uplight, warm });
  shell.add(band.mesh);
  owned.push(band.mesh.geometry);

  // Bracket rings at the floor-3 slab and the roof: a rail behind the fins + a zig-zag of
  // flat bars to the glass (the triangulated brackets drawn on the plans).
  const RAIL = { color: "#d8dbde", rough: 0.42, metal: 0.55 };
  const bracketSteps = low ? 2 : 1;
  for (const y of [6.62, 10.95]) {
    for (let k = 0; k < FACETS; k++) {
      const b = MULLION_START + (k + 0.5) * FACET_DEG;
      const chord = 2 * 10.02 * Math.sin((FACET_DEG / 2) * DEG);
      frameItems.push({ bearing: b, r: 10.02, y0: y, y1: y + 0.06, w: chord + 0.01, d: 0.05, sector: true, ...RAIL });
      if (k % bracketSteps) continue;
      // Diagonal from the mullion at the glass to the rail mid-facet.
      const [ax, az] = polar(9.32, MULLION_START + k * FACET_DEG);
      const [bx, bz] = polar(9.98, b);
      const len = Math.hypot(bx - ax, bz - az);
      const mid: [number, number] = [(ax + bx) / 2, (az + bz) / 2];
      const midBearing = (Math.atan2(mid[0], -mid[1]) / DEG + 360) % 360;
      const yaw = Math.atan2(bx - ax, bz - az);
      frameItems.push({ bearing: midBearing, r: Math.hypot(mid[0], mid[1]), y0: y + 0.01, y1: y + 0.05, w: 0.012, d: len, sector: true, yaw, ...RAIL });
    }
  }
  // One instanced mesh for all of them: white unit box × instance colour, PBR per instance.
  {
    const frameBox = unitBox.clone();
    paint(frameBox, "#ffffff");
    const rm = new Float32Array(frameItems.length * 2);
    frameItems.forEach((it, i) => {
      rm[i * 2] = it.rough ?? 0.5;
      rm[i * 2 + 1] = it.metal ?? 0;
    });
    frameBox.setAttribute("jkRM", new THREE.InstancedBufferAttribute(rm, 2));
    owned.push(frameBox);
    // Phones: the thin bands and mullions cast no shadows (sub-texel in the low tier's shadow map).
    const set = addSet(frameItems, framesMat, !low, "frames", frameBox);
    const c = new THREE.Color();
    frameItems.forEach((it, i) => set.mesh.setColorAt(i, c.set(it.color ?? "#ffffff")));
    if (set.mesh.instanceColor) set.mesh.instanceColor.needsUpdate = true;
  }

  // ── Roof ──
  const roofParts: THREE.BufferGeometry[] = [];
  const roofDisc = new THREE.CircleGeometry(9.18, 96);
  roofDisc.rotateX(-Math.PI / 2);
  roofDisc.translate(0, Y.roof, 0);
  roofParts.push(metreUV(roofDisc));
  // Slab underside (seen in cutaways from below) + thickness.
  roofParts.push(arcStrip(9.18, 0, 360, Y.roof - 0.55, Y.roof, { seg: 96 }));
  batch.add(roof, membrane, roofParts, { cast: true, receive: true });
  // Coping ring on the parapet, plant cluster north-east of the centre, hatches, a duct.
  batch.add(
    roof,
    uber,
    [
      COPING(ringPrism(9.05, 9.36, 0, 360, Y.parapet - 0.06, Y.parapet + 0.02, { seg: 128, ends: false })),
      COPING(arcStrip(9.05, 0, 360, Y.roof, Y.parapet, { seg: 96, inward: true })),
      PLANT(box(2.0, 1.05, 2.5, 1.2, Y.roof, -2.6, 0)),
      PLANT(box(2.0, 0.95, 2.4, 3.5, Y.roof, -1.4, 0)),
      PLANT(box(1.1, 0.5, 1.1, -3.2, Y.roof, 3.4, 0.3)),
      PLANT_LIGHT(box(0.8, 0.85, 2.5, 5.0, Y.roof, -0.2, 0)),
      PLANT_LIGHT(box(0.9, 0.35, 0.9, -1.8, Y.roof, -4.6, 0.2)),
      STAINLESS(rod([1.2, Y.roof + 0.6, -1.3], [1.2, Y.roof + 0.6, 0.6], 0.16, 12)),
      STAINLESS(rod([1.2, Y.roof + 0.6, 0.6], [1.2, Y.roof + 0.05, 0.6], 0.16, 12)),
    ],
    { cast: true, receive: true },
  );

  // ── Doors (frames in their own groups: a dollhouse cut takes them away with the glazing they stand
  // in — no free-standing "goal posts" on the cut drum) ──
  const doorsF2 = new THREE.Group();
  doorsF2.name = "joki-doors-f2";
  const doorsF3 = new THREE.Group();
  doorsF3.name = "joki-doors-f3";
  ext.add(doorsF2, doorsF3);
  const doorParts: Record<"f2" | "f3", THREE.BufferGeometry[]> = { f2: [], f3: [] };
  for (const d of Object.values(DOORS)) {
    const parts = d.level === Y.f3 ? doorParts.f3 : doorParts.f2;
    const [x, z] = polar(9.29, d.bearing);
    const yaw = yawToBearing(d.bearing);
    const h = 2.35;
    // Frame: two jambs + head + middle stile.
    for (const s of [-1, 1]) {
      const [jx, jz] = [x + Math.cos(yaw) * s * (d.width / 2), z - Math.sin(yaw) * s * (d.width / 2)];
      parts.push(box(0.07, h, 0.12, jx, d.level, jz, yaw));
    }
    parts.push(box(d.width + 0.14, 0.09, 0.12, x, d.level + h, z, yaw));
    parts.push(box(0.05, h, 0.06, x, d.level, z, yaw));
    // Push bars.
    parts.push(box(0.6, 0.04, 0.05, x + Math.cos(yaw) * 0.45, d.level + 1.0, z - Math.sin(yaw) * 0.45, yaw));
    parts.push(box(0.6, 0.04, 0.05, x - Math.cos(yaw) * 0.45, d.level + 1.0, z + Math.sin(yaw) * 0.45, yaw));
  }
  batch.add(doorsF2, uber, doorParts.f2.map(GALV), { receive: true });
  batch.add(doorsF3, uber, doorParts.f3.map(GALV), { receive: true });

  // Floor-2 north-east door: landing and four galvanised checker-plate steps down to the deck,
  // glass balustrades and stainless rails (photo: Arosuo / Vesa Loikas).
  {
    const b = DOORS.f2ne.bearing;
    const yaw = yawToBearing(b);
    const ux = Math.sin(b * DEG);
    const uz = -Math.cos(b * DEG);
    const tx = Math.cos(b * DEG);
    const tz = Math.sin(b * DEG);
    const at = (r: number, s: number): [number, number] => [ux * r + tx * s, uz * r + tz * s];
    const steps: THREE.BufferGeometry[] = [];
    const landingR0 = 9.25;
    const landingR1 = 10.55;
    const [lx, lz] = at((landingR0 + landingR1) / 2, 0);
    steps.push(box(2.1, 0.06, landingR1 - landingR0, lx, Y.f2 - 0.06, lz, yaw));
    const rise = (Y.f2 - Y.deck) / 4;
    for (let i = 0; i < 3; i++) {
      const r = landingR1 + 0.3 * i + 0.15;
      const [sx, sz] = at(r, 0);
      steps.push(box(2.1, 0.05, 0.3, sx, Y.f2 - rise * (i + 1) - 0.05, sz, yaw));
    }
    batch.add(ext, tread, steps, { cast: true, receive: true });
    // Steel cheeks under the treads.
    const cheeks: THREE.BufferGeometry[] = [];
    for (const s of [-1.08, 1.08]) {
      const [cx, cz] = at((landingR0 + landingR1 + 0.9) / 2, s);
      cheeks.push(box(0.04, Y.f2 - Y.deck + 0.1, landingR1 - landingR0 + 0.9, cx, Y.deck - 0.1, cz, yaw));
    }
    batch.add(ext, uber, cheeks.map(GALV), { receive: true });
    const glassPanels: THREE.BufferGeometry[] = [];
    const railGeos: THREE.BufferGeometry[] = [];
    for (const s of [-1.05, 1.05]) {
      const [gx, gz] = at((landingR0 + landingR1) / 2 + 0.2, s);
      glassPanels.push(box(0.012, 1.0, landingR1 - landingR0 + 0.3, gx, Y.f2, gz, yaw));
      const [r0x, r0z] = at(landingR0 + 0.05, s);
      const [r1x, r1z] = at(landingR1, s);
      const [r2x, r2z] = at(landingR1 + 0.95, s);
      railGeos.push(rod([r0x, Y.f2 + 1.0, r0z], [r1x, Y.f2 + 1.0, r1z], 0.021, 10));
      railGeos.push(rod([r1x, Y.f2 + 1.0, r1z], [r2x, Y.deck + 1.0, r2z], 0.021, 10));
      railGeos.push(rod([r2x, Y.deck + 1.0, r2z], [r2x, Y.deck, r2z], 0.021, 10));
    }
    batch.add(ext, balustrade, glassPanels);
    batch.add(ext, uber, railGeos.map(STAINLESS), { receive: true });
  }

  // ── External floor-3 exit stair (SPEC §3.2.2): out along J +x, 1.6 m wide, 0.30 goings,
  // solid parapets in bolted aluminium panels, galvanised treads, landing at roof-walkway level.
  // (In its own group: with floors 2–3 lifted off it would climb to nothing.)
  const stairGroup = new THREE.Group();
  stairGroup.name = "joki-f3-stair";
  ext.add(stairGroup);
  const stair = f3Stair();
  batch.add(stairGroup, tread, stair.treads, { cast: true, receive: true });
  batch.add(stairGroup, alu, stair.parapets, { cast: true, receive: true });
  batch.add(stairGroup, uber, [...stair.rails.map(STAINLESS), ...stair.posts.map(BLACK_STEEL)], { receive: true });

  batch.flush();

  // ── Instance placement and cuts ──
  const tmpM = new THREE.Matrix4();
  let yTop = Infinity;
  let sectorOn = false;
  let sectorDir = 0;
  const SECTOR_HALF = 62;
  let lastKey = "";

  function place(set: ElementSet) {
    const { mesh, items } = set;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const hidden =
        it.y0 >= yTop ||
        (sectorOn && it.sector && it.y1 > Y.f2 + 0.05 && angleBetween(it.bearing, sectorDir) < SECTOR_HALF);
      if (hidden) {
        tmpM.makeScale(0, 0, 0);
        mesh.setMatrixAt(i, tmpM);
        continue;
      }
      const top = Math.min(it.y1, yTop);
      const [x, z] = polar(it.r, it.bearing);
      const yaw = it.yaw ?? yawToBearing(it.bearing);
      // Unit box: x = tangential width, z = radial depth (columns use their own radius).
      if (mesh === colMesh) instanceMatrix(x, it.y0, z, 0, 1, top - it.y0, 1, tmpM);
      else instanceMatrix(x, it.y0, z, yaw, it.w, top - it.y0, it.d, tmpM);
      mesh.setMatrixAt(i, tmpM);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function placeAll() {
    for (const s of sets) place(s);
  }
  placeAll();
  for (const s of sets) {
    s.mesh.computeBoundingSphere();
    s.mesh.computeBoundingBox();
  }

  let open: LevelId | null = null;
  return {
    ext,
    shell,
    roof,
    drumInner: { showroom: merge(drumInnerParts), lounge: merge(drumInnerLounge) },
    setOpen(level) {
      open = level;
      shell.visible = level !== "joki-1";
      doorsF2.visible = level !== "joki-1" && level !== "joki-2";
      doorsF3.visible = level === null;
      stairGroup.visible = level !== "joki-1" && level !== "joki-2";
      roof.visible = level === null;
      yTop = level === "joki-2" ? Y.f2 + 1.05 : level === "joki-3" ? Y.f3 + 1.05 : Infinity;
      sectorOn = level === "joki-3";
      lastKey = "";
      placeAll();
    },
    update(cam) {
      if (open !== "joki-3") return false;
      // Cut the half of the lower storey that faces the camera (follows the orbit).
      const b = (Math.atan2(cam.x, -cam.z) / DEG + 360) % 360;
      const key = String(Math.round(b / 3));
      if (key === lastKey) return false;
      lastKey = key;
      sectorDir = Math.round(b / 3) * 3;
      placeAll();
      return true;
    },
    setNight(night) {
      // Uplights switch on at sunset and reach full output by civil dusk.
      uplight.value = 0.055 * THREE.MathUtils.smoothstep(night, 0.05, 0.6);
      // After dark the satin fins mirror a dim sky: keep them a mid-grey silver under the night exposure.
      const dark = THREE.MathUtils.smoothstep(night, 0.1, 0.8);
      const env = THREE.MathUtils.lerp(1, 0.12, dark);
      const bandMat = band.mesh.material as THREE.MeshStandardMaterial;
      finMat.envMapIntensity = env;
      bandMat.envMapIntensity = env;
      // Under the night exposure the street's fill light turned the pale satin comb into a lit curtain
      // up to its top; the photos show it mid-grey above the warm band at its base.
      finMat.color.copy(finBase).multiplyScalar(1 - 0.6 * dark);
      bandMat.color.copy(finBase).multiplyScalar(1 - 0.6 * dark);
    },
    setSun(dir) {
      sunDir.value.copy(dir).normalize();
    },
    setFinLod(on) {
      finLod.value = on ? 1 : 0;
      band.mesh.visible = on;
    },
    ready: Promise.resolve(),
    dispose() {
      for (const o of owned) o.dispose();
    },
  };

  /** The floor-3 exit stair, in the J frame. */
  function f3Stair() {
    const width = 1.6;
    const going = 0.3;
    const risers = 22;
    const rise = (Y.f3 - Y.hallRoof) / risers;
    const x0 = 9.3;
    const landing0 = 10.55;
    const landEnd = landing0 + (risers - 1) * going;
    const z0 = -width / 2;
    const z1 = width / 2;
    const treads: THREE.BufferGeometry[] = [];
    const parapets: THREE.BufferGeometry[] = [];
    const rails: THREE.BufferGeometry[] = [];
    const posts: THREE.BufferGeometry[] = [];
    // Top landing from the door through the fin ring.
    treads.push(box(landing0 - x0, 0.06, width, (x0 + landing0) / 2, Y.f3 - 0.06, 0));
    for (let i = 1; i < risers; i++) {
      const x = landing0 + (i - 0.5) * going;
      treads.push(box(going + 0.02, 0.05, width, x, Y.f3 - rise * i - 0.05, 0));
    }
    // Bottom landing at roof-walkway level.
    treads.push(box(1.6, 0.08, width, landEnd + 0.8, Y.hallRoof - 0.06, 0));
    // Solid parapets (clad both faces + soffit): a sloped slab on each side.
    const slope = (x: number) => (x <= landing0 ? Y.f3 : x >= landEnd ? Y.hallRoof : Y.f3 - ((x - landing0) / (landEnd - landing0)) * (Y.f3 - Y.hallRoof));
    for (const zEdge of [z0 - 0.06, z1 + 0.06]) {
      const pts: [number, number][] = [];
      const xs = [x0, landing0, landEnd, landEnd + 1.6];
      for (const x of xs) pts.push([x, slope(x) + 1.1]);
      for (const x of xs.slice().reverse()) pts.push([x, slope(x) - 0.45]);
      const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
      g.translate(0, 0, zEdge - 0.06);
      parapets.push(metreUV(g));
    }
    // Soffit cladding under the flight.
    {
      const len = Math.hypot(landEnd - landing0, Y.f3 - Y.hallRoof);
      const g = new THREE.BoxGeometry(len, 0.04, width + 0.24);
      g.rotateZ(Math.atan2(Y.f3 - Y.hallRoof, landEnd - landing0));
      g.translate((landing0 + landEnd) / 2, (Y.f3 + Y.hallRoof) / 2 - 0.42, 0);
      parapets.push(metreUV(g));
    }
    // Handrails on the inner faces of the parapets.
    for (const z of [z0 + 0.05, z1 - 0.05]) {
      rails.push(rod([landing0, Y.f3 + 0.9, z], [landEnd, Y.hallRoof + 0.9, z], 0.02, 8));
      rails.push(rod([x0 + 0.1, Y.f3 + 0.9, z], [landing0, Y.f3 + 0.9, z], 0.02, 8));
    }
    // Steel posts under the landing and mid-flight.
    for (const x of [landEnd + 1.4, (landing0 + landEnd) / 2]) {
      for (const z of [z0 + 0.1, z1 - 0.1]) posts.push(cylinder(0.07, Y.serviceYard, slope(x) - 0.45, x, z, 10));
    }
    return { treads, parapets, rails, posts };
  }
}

/**
 * Pixel size (m per pixel at the fin) over which the real fins hand over to the band: a fin (20 mm) under
 * ≈ 2.3 → 1.4 px. The band's own fade uses the same range in fin pitches (0.142 m).
 */
const FIN_LOD_PX: [number, number] = [0.0085, 0.0142];

/**
 * The fin screen as one filtered band (far LOD): a quad per fin pitch on the fins' mid radius, drawn
 * transparent over the glass. Its shader works out, per pixel, how much of the pitch the fins cover
 * from this view (20 mm face plus the 90 mm depth seen at an angle — denser towards the edges of the
 * drum), box-filters the stripes to the pixel, and lights the visible mix of outer and side faces with
 * the same analytic sun as the fins. No sub-pixel dashes, no moiré.
 */
function finBand(
  mats: JokiMaterials,
  u: { finLod: { value: number }; sunDir: { value: THREE.Vector3 }; uplight: { value: number }; warm: THREE.Color },
): { mesh: THREE.Mesh } {
  const pos: number[] = [];
  const nor: number[] = [];
  const jkU: number[] = [];
  const jkPost: number[] = [];
  const jkH: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  const r = (R.finIn + R.finOut) / 2;
  const pitchM = (r * FIN_PITCH * Math.PI) / 180;
  finLayout().forEach((f, i) => {
    const b0 = f.bearing - FIN_PITCH / 2;
    const b1 = f.bearing + FIN_PITCH / 2;
    const [x0, z0] = polar(r, b0);
    const [x1, z1] = polar(r, b1);
    const [nx, nz] = polar(1, f.bearing);
    for (const [y0, y1] of f.pieces) {
      const base = pos.length / 3;
      pos.push(x0, y0, z0, x1, y0, z1, x1, y1, z1, x0, y1, z0);
      for (let k = 0; k < 4; k++) nor.push(nx, 0, nz);
      jkU.push(i, i + 1, i + 1, i);
      // Metre UVs (the material's normal map needs a real tangent frame).
      uvs.push(i * pitchM, y0, (i + 1) * pitchM, y0, (i + 1) * pitchM, y1, i * pitchM, y1);
      for (let k = 0; k < 4; k++) jkPost.push(f.post ? 1 : 0);
      const hb = y0 - f.pieces[0][0];
      jkH.push(hb, hb, hb + (y1 - y0), hb + (y1 - y0));
      // Outward-facing (counter-clockwise seen from outside).
      idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute("jkU", new THREE.Float32BufferAttribute(jkU, 1));
  g.setAttribute("jkPost", new THREE.Float32BufferAttribute(jkPost, 1));
  g.setAttribute("jkH", new THREE.Float32BufferAttribute(jkH, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  const m = mats.get("metalWhite", "ext", { color: "#dcdfe2", roughness: 0.42, metalness: 0.55 }, "jk-fin-band");
  m.transparent = true;
  m.depthWrite = false;
  m.side = THREE.FrontSide;
  chainPatch(m, "jk-finband", (shader) => {
    shader.uniforms.uJkSunDir = u.sunDir;
    shader.uniforms.uJkLod = u.finLod;
    shader.uniforms.uJkUp = u.uplight;
    shader.uniforms.uJkWarm = { value: u.warm };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float jkU;\nattribute float jkPost;\nattribute float jkH;\nvarying float vJkU;\nvarying float vJkPost;\nvarying float vJkH;\nvarying vec3 vJkWorld;\nvarying vec3 vJkRad;",
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
	vJkU = jkU;
	vJkPost = jkPost;
	vJkH = jkH;
	vJkWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
	vJkRad = normalize( ( modelMatrix * vec4( objectNormal, 0.0 ) ).xyz );`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 uJkSunDir;\nuniform float uJkLod;\nuniform float uJkUp;\nuniform vec3 uJkWarm;\nvarying float vJkU;\nvarying float vJkPost;\nvarying float vJkH;\nvarying vec3 vJkWorld;\nvarying vec3 vJkRad;",
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
	vec3 jkV = normalize( cameraPosition - vJkWorld );
	vec3 jkR = normalize( vec3( vJkRad.x, 0.0, vJkRad.z ) );
	vec3 jkT = vec3( -jkR.z, 0.0, jkR.x );
	float jkVr = max( dot( jkV, jkR ), 0.03 );
	float jkVt = dot( jkV, jkT );
	float jkW = mix( 0.02, 0.03, vJkPost );
	float jkD = mix( 0.09, 0.13, vJkPost );
	float jkDepthSeen = jkD * abs( jkVt ) / jkVr;
	// Fraction of the pitch the fins hide from this direction, the part of it that is side face.
	float jkCov = clamp( ( jkW + jkDepthSeen ) / 0.142, 0.0, 1.0 );
	float jkSide = jkDepthSeen / ( jkW + jkDepthSeen );
	float jkFw = fwidth( vJkU );
	float jkF = abs( fract( vJkU ) - 0.5 );
	float jkPulse = clamp( ( jkCov * 0.5 - jkF ) / max( jkFw, 1e-4 ) + 0.5, 0.0, 1.0 );
	float jkA = mix( jkPulse, jkCov, smoothstep( 0.35, 0.9, jkFw ) );
	float jkLodA = smoothstep( ${(FIN_LOD_PX[0] / 0.142).toFixed(4)}, ${(FIN_LOD_PX[1] / 0.142).toFixed(4)}, jkFw ) * uJkLod;
	diffuseColor.a *= jkA * jkLodA;
	if ( diffuseColor.a < 0.004 ) discard;`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
	{
		// Light the visible mix: the side faces turned to the viewer and the outer faces.
		vec3 jkTv = normalize( ( viewMatrix * vec4( jkT * sign( jkVt ), 0.0 ) ).xyz );
		normal = normalize( mix( normal, jkTv, jkSide ) );
	}`,
      )
      .replace(
        "#include <lights_fragment_begin>",
        `float jkLit = 1.0;
	{
		float sr = dot( uJkSunDir, jkR );
		float facing = dot( uJkSunDir, jkT ) * sign( jkVt );
		float sideLit = facing > 0.0 ? clamp( 1.36 * sr / max( facing, 1e-3 ), 0.0, 1.0 ) * smoothstep( -0.02, 0.06, sr ) : 0.0;
		jkLit = mix( smoothstep( -0.02, 0.06, sr ), sideLit, jkSide );
	}
	${THREE.ShaderChunk.lights_fragment_begin.replace("getSunLightInfo( sunLight, directLight );", "getSunLightInfo( sunLight, directLight ); directLight.color *= jkLit;")}`,
      )
      .replace(
        "#include <aomap_fragment>",
        `#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= mix( 1.0, 0.7, jkSide );
	reflectedLight.indirectSpecular *= mix( 1.0, 0.7, jkSide );`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
	totalEmissiveRadiance += uJkWarm * uJkUp * ( 0.85 * exp( -vJkH / 0.6 ) + 0.15 * exp( -vJkH / 2.5 ) );`,
      )
      .replace(
        "vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );",
        "vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias + uJkSunDir * 0.5, 1.0 );",
      );
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.name = "joki:fin-band";
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  // After the curtain-wall glass (renderOrder 2): the band lies in front of it.
  mesh.renderOrder = 3;
  return { mesh };
}

/** The floor-3 exit stair's steel posts (J x, z), for walk colliders. */
export const F3_STAIR_POSTS: readonly V2[] = (() => {
  const landing0 = 10.55;
  const landEnd = landing0 + 21 * 0.3;
  const out: V2[] = [];
  for (const x of [landEnd + 1.4, (landing0 + landEnd) / 2]) for (const z of [-0.7, 0.7]) out.push([x, z]);
  return out;
})();

/** J-frame transform helper for consumers (re-exported for tests). */
export const TOWER_FRAME = J;
