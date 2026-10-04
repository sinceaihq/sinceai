import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { SunLight } from "three/addons/lights/SunLight.js";
import { Lensflare, LensflareElement } from "three/addons/objects/Lensflare.js";
import type { LightingState, Tier } from "../types";
import { nightFactor, sunAtTurku } from "./sun";

/**
 * Sky, sun and atmosphere for a Turku wall-clock time (DESIGN §4, §11).
 *
 * Light units: 1 scene unit of illuminance = 1 klux, so radiance/luminance
 * 1 unit = 1000 cd/m² (a Lambertian surface of albedo ρ under E klux has
 * radiance E·ρ/π). The sun, the sky dome, the image-based light and every
 * emissive in the twin use these units; the camera exposure (exposureFor)
 * then adapts like a photographer would — only partly, so night stays night.
 * Emissive presets for modules: LUMINANCE.
 */

/** Emissive luminance presets (scene units, 1 = 1000 cd/m²) for modules. */
export const LUMINANCE = {
  /** A lit office window seen from outside. */
  windowLit: 0.12,
  /** Shopfront / lobby glazing at night. */
  shopfront: 0.25,
  /** LED street-lamp head (diffuser). */
  lampHead: 18,
  /** Bollard / small wall light lens. */
  bollard: 3,
  /** Showroom LED wall content (bright parts). */
  ledWall: 0.6,
  /** Backlit sign letters (e.g. "SCIENCE PARK" at night). */
  signLit: 1.2,
  /** Indoor LED panel / linear light. */
  ceilingPanel: 2.5,
  /** Event uplight lens / violet line light. */
  eventLight: 4,
} as const;

/** Look presets (SPEC §8.2). */
export type SkyLook = "default" | "clear" | "overcast";

interface LookParams {
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  cloudCoverage: number;
  cloudDensity: number;
  /** Fraction of direct sun that gets through the cloud deck (0..1). */
  sunThrough: number;
  /** Turbidity the direct beam passes through (a sun break through cloud edges is dimmer than the open sky suggests). */
  sunTurbidity: number;
  /** Exponential² fog density (1/m). */
  fogDensity: number;
  /** Exposure compensation (EV) on top of the adaptation model. */
  ev: number;
  /** Diffuse-sky multiplier (overcast skies are brighter at low sun than the clear model). */
  skyGain: number;
  /** Colour saturation of the daylight dome (overcast light is close to neutral). */
  saturation?: number;
}

const LOOKS: Record<SkyLook, LookParams> = {
  // "November afternoon, broken overcast with a low sun break". Mie kept low: the
  // Preetham aureole explodes at a 4° sun with the textbook mie 0.008 / g 0.85.
  default: {
    turbidity: 6,
    rayleigh: 2.6,
    mieCoefficient: 0.0012,
    mieDirectionalG: 0.85,
    cloudCoverage: 0.72,
    cloudDensity: 0.6,
    sunThrough: 1,
    sunTurbidity: 10,
    // FogExp2 ≈ 4 km visibility: depth across the campus, the city beyond dissolves.
    fogDensity: 0.00045,
    ev: -0.3,
    skyGain: 1,
    saturation: 0.7,
  },
  clear: {
    turbidity: 3.5,
    rayleigh: 2,
    mieCoefficient: 0.0025,
    mieDirectionalG: 0.75,
    cloudCoverage: 0.12,
    cloudDensity: 0.35,
    sunThrough: 1,
    sunTurbidity: 4,
    fogDensity: 0.00022,
    ev: -0.5,
    skyGain: 1,
  },
  overcast: {
    turbidity: 9,
    rayleigh: 3,
    mieCoefficient: 0.003,
    mieDirectionalG: 0.65,
    cloudCoverage: 0.97,
    cloudDensity: 0.9,
    sunThrough: 0.06,
    sunTurbidity: 10,
    fogDensity: 0.0007,
    ev: -0.15,
    skyGain: 1.35,
  },
};

const RAD = Math.PI / 180;

// ── Photometric models (pure, unit-tested) ──────────────────────────────────

/**
 * Relative optical air mass (Kasten & Young 1989); large but finite at the horizon. The fit is for
 * elevations ≥ 0 — below, it would shrink again (a brighter beam after sunset), so it holds at ≈ 38.
 */
export function airMass(elevationDeg: number): number {
  const h = Math.max(elevationDeg, 0);
  return 1 / (Math.sin(h * RAD) + 0.50572 * Math.pow(h + 6.07995, -1.6364));
}

/** Direct-beam illuminance normal to the sun (klux) through a turbid atmosphere. */
export function sunIlluminance(elevationDeg: number, turbidity = 9): number {
  if (elevationDeg <= -0.8) return 0;
  const m = airMass(elevationDeg);
  // Broadband luminous extinction per air mass, growing with turbidity.
  const tau = 0.09 + 0.021 * turbidity;
  const beam = 128 * Math.exp(-tau * m);
  // Fade the disc out as it sinks behind the horizon (refraction + terrain).
  const t = Math.min(1, Math.max(0, (elevationDeg + 0.8) / 1.6));
  return beam * t * t * (3 - 2 * t);
}

/**
 * Diffuse horizontal illuminance (log10 lux) by sun elevation: overcast/hazy
 * daylight above the horizon, measured twilight below (≈400–700 lux at sunset,
 * ≈3 lux at the end of civil twilight, ≈0.008 lux at nautical, ≈0.001 at night).
 */
const SKY_TABLE: [number, number][] = [
  [-18, -3.1],
  [-12, -2.1],
  [-9, -1.1],
  [-6, 0.5],
  [-4, 1.45],
  [-2, 2.1],
  [0, 2.65],
  [2, 3.05],
  [5, 3.3],
  [10, 3.6],
  [20, 3.95],
  [40, 4.25],
  [90, 4.4],
];

/** Diffuse sky illuminance on a horizontal surface (klux) for an overcast/hazy sky. */
export function skyIlluminance(elevationDeg: number): number {
  const t = SKY_TABLE;
  if (elevationDeg <= t[0][0]) return Math.pow(10, t[0][1]) / 1000;
  for (let i = 1; i < t.length; i++) {
    if (elevationDeg <= t[i][0]) {
      const [e0, l0] = t[i - 1];
      const [e1, l1] = t[i];
      const k = (elevationDeg - e0) / (e1 - e0);
      return Math.pow(10, l0 + (l1 - l0) * k) / 1000;
    }
  }
  return Math.pow(10, t[t.length - 1][1]) / 1000;
}

/** Correlated colour temperature of direct sunlight at an elevation (K). */
export function sunColorTemperature(elevationDeg: number): number {
  const h = Math.max(0, elevationDeg);
  return 1850 + 3900 * (1 - Math.exp(-h / 11));
}

/** Blackbody colour (Tanner Helland fit) → linear sRGB, normalised to luminance 1. */
export function kelvinToLinear(kelvin: number, target = new THREE.Color()): THREE.Color {
  const t = Math.min(40000, Math.max(1000, kelvin)) / 100;
  let r: number;
  let g: number;
  let b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
    b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = 255;
  }
  target.setRGB(
    Math.min(255, Math.max(0, r)) / 255,
    Math.min(255, Math.max(0, g)) / 255,
    Math.min(255, Math.max(0, b)) / 255,
    THREE.SRGBColorSpace,
  );
  const lum = 0.2126 * target.r + 0.7152 * target.g + 0.0722 * target.b;
  return lum > 0 ? target.multiplyScalar(1 / lum) : target;
}

/**
 * Photographer's exposure value (EV100) for the exterior by sun elevation:
 * dull November daylight, sunset, blue hour and a street-lit city night.
 */
const EV_TABLE: [number, number][] = [
  [-18, 6.0],
  [-12, 6.2],
  [-9, 6.6],
  [-6, 6.8],
  [-4, 7.5],
  [-2, 8.6],
  [0, 9.3],
  [2, 9.9],
  [5, 10.6],
  [8, 11.3],
  [12, 12.0],
  [20, 13.0],
  [40, 14.0],
  [90, 14.5],
];

/** EV100 a photographer would use at this sun elevation (interpolated). */
export function exposureValue(elevationDeg: number): number {
  const t = EV_TABLE;
  if (elevationDeg <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (elevationDeg <= t[i][0]) {
      const [e0, v0] = t[i - 1];
      const [e1, v1] = t[i];
      return v0 + ((v1 - v0) * (elevationDeg - e0)) / (e1 - e0);
    }
  }
  return t[t.length - 1][1];
}

/** Scene exposure for EV100 in our units (calibrated: 1.5 at EV 10.5, Friday 15:30). */
const EXPOSURE_K = 2172;

/**
 * Camera exposure (linear multiplier) for exterior views. `ev` = look
 * compensation relative to the default look (which already includes −0.3 EV).
 */
export function exposureFor(elevationDeg: number, ev = 0): number {
  return (EXPOSURE_K / Math.pow(2, exposureValue(elevationDeg))) * Math.pow(2, ev + 0.3);
}

/** Exposure for interiors (artificial light ≈ 400 lux) — used inside buildings and dollhouse views. */
export const INTERIOR_EXPOSURE = 3.2;

/** Unit vector towards the sun (campus frame). */
export function sunDirection(elevationDeg: number, azimuthDeg: number, target = new THREE.Vector3()): THREE.Vector3 {
  const el = elevationDeg * RAD;
  const az = azimuthDeg * RAD;
  return target.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
}

/** LightingState for a Turku wall-clock time (no three.js scene needed). */
export function lightingFor(iso: string): LightingState {
  const sun = sunAtTurku(iso);
  return {
    night: nightFactor(sun.elevation),
    sunDir: sunDirection(sun.elevation, sun.azimuth),
    sunElevationDeg: sun.elevation,
    sunAzimuthDeg: sun.azimuth,
    iso,
  };
}

// ── Preetham sky on the CPU (same maths as three/addons Sky) for fog colours ─

const TOTAL_RAYLEIGH = new THREE.Vector3(5.804542996261093e-6, 1.3562911419845635e-5, 3.0265902468824876e-5);
const MIE_CONST = new THREE.Vector3(1.8399918514433978e14, 2.7798023919660528e14, 4.0790479543861094e14);

/** Radiance of the clear Preetham sky (shader units, before our scale) in a direction. */
export function preethamRadiance(
  dir: THREE.Vector3,
  sunDir: THREE.Vector3,
  p: { turbidity: number; rayleigh: number; mieCoefficient: number; mieDirectionalG: number },
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const cutoff = 1.6110731556870734;
  const zen = Math.acos(Math.min(1, Math.max(-1, sunDir.y)));
  const sunE = 1000 * Math.max(0, 1 - Math.exp(-(cutoff - zen) / 1.5));
  const betaR = TOTAL_RAYLEIGH.clone().multiplyScalar(p.rayleigh);
  const c = 0.2 * p.turbidity * 10e-18;
  const betaM = MIE_CONST.clone().multiplyScalar(0.434 * c * p.mieCoefficient);
  const zenithAngle = Math.acos(Math.max(0, dir.y));
  const inverse = 1 / (Math.cos(zenithAngle) + 0.15 * Math.pow(93.885 - (zenithAngle * 180) / Math.PI, -1.253));
  const sR = 8.4e3 * inverse;
  const sM = 1.25e3 * inverse;
  const fex = new THREE.Vector3(
    Math.exp(-(betaR.x * sR + betaM.x * sM)),
    Math.exp(-(betaR.y * sR + betaM.y * sM)),
    Math.exp(-(betaR.z * sR + betaM.z * sM)),
  );
  const cosTheta = dir.dot(sunDir);
  const rc = cosTheta * 0.5 + 0.5;
  const rPhase = (3 / (16 * Math.PI)) * (1 + rc * rc);
  const g = p.mieDirectionalG;
  const mPhase = (1 / (4 * Math.PI)) * ((1 - g * g) / Math.pow(1 - 2 * g * cosTheta + g * g, 1.5));
  const k = Math.min(1, Math.max(0, Math.pow(1 - sunDir.y, 5)));
  const comp = (i: "x" | "y" | "z") => {
    const ratio = (betaR[i] * rPhase + betaM[i] * mPhase) / (betaR[i] + betaM[i]);
    let lin = Math.pow(sunE * ratio * (1 - fex[i]), 1.5);
    lin *= 1 + (Math.pow(Math.max(0, sunE * ratio * fex[i]), 0.5) - 1) * k;
    const l0 = 0.1 * fex[i];
    return (lin + l0) * 0.04;
  };
  out.set(comp("x"), comp("y") + 0.0003, comp("z") + 0.00075);
  return out;
}

// ── Sky dome shader patch ───────────────────────────────────────────────────

/** Scale from Preetham shader units to scene units (calibrated: clear summer zenith ≈ 4 kcd/m²). */
const SKY_SCALE = 1.35;

/** Luminance of the clear-sky zenith in scene units (before the daylight fade). */
export function zenithLuminance(
  sunDir: THREE.Vector3,
  p: { turbidity: number; rayleigh: number; mieCoefficient: number; mieDirectionalG: number; skyGain?: number },
): number {
  const zen = preethamRadiance(new THREE.Vector3(0, 1, 0), sunDir, p, new THREE.Vector3());
  return (0.2126 * zen.x + 0.7152 * zen.y + 0.0722 * zen.z) * SKY_SCALE * (p.skyGain ?? 1);
}

/**
 * Soft cap of the visible daylight dome: 8× its (faded) zenith, at least 0.02. Continuous in time —
 * no switch-off at dusk, because the cap only acts on the daylight term that fades with dayMix.
 */
export function visibleDomeCap(zenith: number, dayMix: number): number {
  return Math.max(zenith * dayMix * 8, 0.02);
}

/** Cap of the daylight term in the environment probe: 3× the zenith (the aureole adds ≈ 10–20 % of the beam). */
export function probeCap(zenith: number): number {
  return Math.max(zenith * 3, 0.002);
}

const SKY_PATCH_UNIFORMS = /* glsl */ `
uniform float uSkyScale;
uniform float uDayMix;
uniform vec3 uTwiZenith;
uniform vec3 uTwiHorizon;
uniform vec3 uTwiGlow;
uniform vec3 uNightZenith;
uniform vec3 uNightHorizon;
uniform vec3 uCityGlow;
uniform vec3 uGround;
uniform vec3 uSunFlat;
uniform float uGroundBlend;
uniform float uEnvCap;
uniform float uSkySat;
uniform vec3 uHorizonHaze;
uniform float uHazeBlend;
uniform float uVisCap;
`;

const SKY_PATCH_OUTPUT = /* glsl */ `
	{
		const vec3 twLum = vec3( 0.2126, 0.7152, 0.0722 );
		float hy = direction.y;
		vec3 dayRad = texColor * uSkyScale * uDayMix;
		float dayLum = dot( dayRad, twLum );
		dayRad = mix( vec3( dayLum ), dayRad, uSkySat );
		// The caps act on the daylight (Preetham) dome only — its aureole and cloud silver linings.
		// The twilight and night terms are added uncapped afterwards, so dusk stays continuous: the
		// caps fade out with the daylight term instead of squashing the twilight glow.
		// Environment probe only: tame the circumsolar aureole so image-based light stays physical
		// (the visible dome keeps the full glow for bloom).
		float lumD = dot( dayRad, twLum );
		if ( lumD > uEnvCap ) dayRad *= uEnvCap / lumD;
		// Visible dome: soft-limit everything but the sun disc (cloud silver linings would bloom across half the frame).
		lumD = dot( dayRad, twLum );
		if ( sundisc < 0.5 && lumD > uVisCap ) dayRad *= ( uVisCap + log( 1.0 + lumD - uVisCap ) * uVisCap * 0.25 ) / lumD;
		// Twilight: brighter towards the horizon, glow towards the sun's azimuth.
		vec2 flat2 = normalize( direction.xz + vec2( 1e-5 ) );
		float towardsSun = max( dot( flat2, normalize( uSunFlat.xz + vec2( 1e-5 ) ) ), 0.0 );
		float up = clamp( hy, 0.0, 1.0 );
		vec3 twi = mix( uTwiHorizon, uTwiZenith, pow( up, 0.55 ) );
		twi += uTwiGlow * pow( towardsSun, 3.0 ) * exp( -up * 9.0 );
		// Night floor: deep blue zenith, city glow under low cloud near the horizon.
		vec3 night = mix( uNightHorizon, uNightZenith, pow( up, 0.45 ) ) + uCityGlow * exp( -up * 10.0 );
		vec3 radiance = dayRad + twi + night;
		// The disc keeps a strong star in the bloom without flooding the whole frame with veiling glare.
		float lumV = dot( radiance, twLum );
		if ( sundisc >= 0.5 && lumV > uVisCap * 40.0 ) radiance *= uVisCap * 40.0 / lumV;
		// Visible dome: the lowest few degrees dissolve into the haze so the far ground meets the sky without a seam.
		radiance = mix( radiance, uHorizonHaze, uHazeBlend * ( 1.0 - smoothstep( 0.0, 0.07, hy ) ) );
		// Below the horizon: ground radiance (only seen by the environment probe; terrain hides it in view).
		float g = smoothstep( 0.015, -0.08, hy ) * uGroundBlend;
		radiance = mix( radiance, uGround, g );
		gl_FragColor = vec4( radiance, 1.0 );
	}
`;

function makeSkyMesh(): Sky {
  const sky = new Sky();
  const material = sky.material as THREE.ShaderMaterial;
  const extra: Record<string, THREE.IUniform> = {
    uSkyScale: { value: SKY_SCALE },
    uDayMix: { value: 1 },
    uTwiZenith: { value: new THREE.Vector3() },
    uTwiHorizon: { value: new THREE.Vector3() },
    uTwiGlow: { value: new THREE.Vector3() },
    uNightZenith: { value: new THREE.Vector3() },
    uNightHorizon: { value: new THREE.Vector3() },
    uCityGlow: { value: new THREE.Vector3() },
    uGround: { value: new THREE.Vector3() },
    uSunFlat: { value: new THREE.Vector3(0, 0, -1) },
    uGroundBlend: { value: 1 },
    uEnvCap: { value: 1e9 },
    uSkySat: { value: 1 },
    uHorizonHaze: { value: new THREE.Color() },
    uHazeBlend: { value: 1 },
    uVisCap: { value: 1e9 },
  };
  Object.assign(material.uniforms, extra);
  const fs = material.fragmentShader;
  const marker = "gl_FragColor = vec4( texColor, 1.0 );";
  if (!fs.includes(marker)) throw new Error("Sky shader changed: cannot patch output");
  material.fragmentShader = SKY_PATCH_UNIFORMS + fs.replace(marker, SKY_PATCH_OUTPUT);
  material.needsUpdate = true;
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  sky.name = "sky";
  return sky;
}

// ── Interior environment (calibrated office light, ≈400 lux at 3500 K) ─────

function buildInteriorScene(): THREE.Scene {
  const scene = new THREE.Scene();
  const warm = kelvinToLinear(3500);
  const basic = (radiance: number, color = warm) =>
    new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(radiance), side: THREE.BackSide });
  // Room shell: walls 0.4 klux × 0.6 albedo / π, darker floor, dim ceiling.
  const room = new THREE.Mesh(new THREE.BoxGeometry(24, 4, 24), [
    basic(0.075),
    basic(0.075),
    basic(0.045),
    basic(0.034, kelvinToLinear(3200)),
    basic(0.07),
    basic(0.07),
  ]);
  room.position.y = 1.4;
  scene.add(room);
  // Ceiling LED panels (front side faces down).
  const panelMat = new THREE.MeshBasicMaterial({ color: kelvinToLinear(4000).multiplyScalar(LUMINANCE.ceilingPanel) });
  const panelGeo = new THREE.PlaneGeometry(1.2, 0.6);
  for (let x = -9; x <= 9; x += 3.6) {
    for (let z = -9; z <= 9; z += 3) {
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.rotation.x = Math.PI / 2;
      panel.position.set(x, 3.38, z);
      scene.add(panel);
    }
  }
  // A daylight window band on one wall.
  const windowMat = new THREE.MeshBasicMaterial({ color: kelvinToLinear(6500).multiplyScalar(0.45) });
  const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(18, 1.6), windowMat);
  windowMesh.position.set(0, 1.8, -11.95);
  scene.add(windowMesh);
  return scene;
}

// ── Lens flare (ultra, low sun) ─────────────────────────────────────────────

function flareTexture(kind: "core" | "ring" | "hex"): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const c = size / 2;
    if (kind === "core") {
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, "rgba(255,247,230,1)");
      g.addColorStop(0.08, "rgba(255,225,180,0.55)");
      g.addColorStop(0.3, "rgba(255,180,120,0.12)");
      g.addColorStop(1, "rgba(255,160,100,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    } else if (kind === "ring") {
      const g = ctx.createRadialGradient(c, c, c * 0.62, c, c, c);
      g.addColorStop(0, "rgba(160,200,255,0)");
      g.addColorStop(0.5, "rgba(170,210,255,0.22)");
      g.addColorStop(0.7, "rgba(255,190,150,0.12)");
      g.addColorStop(1, "rgba(255,180,140,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    } else {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const x = c + Math.cos(a) * c * 0.9;
        const y = c + Math.sin(a) * c * 0.9;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0, "rgba(200,220,255,0.10)");
      g.addColorStop(1, "rgba(200,220,255,0.03)");
      ctx.fillStyle = g;
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ── The sky system ──────────────────────────────────────────────────────────

export interface SkySystem {
  /** Add to the scene: sky dome, sun, hemisphere fill (and lens flare on ultra). */
  readonly group: THREE.Group;
  readonly sun: SunLight;
  readonly hemi: THREE.HemisphereLight;
  readonly sky: Sky;
  /** PMREM of a calibrated office interior, built once (TwinContext.envInterior). */
  readonly envInterior: THREE.Texture | null;
  setTime(iso: string): LightingState;
  setLook(look: SkyLook): void;
  look(): SkyLook;
  lighting(): LightingState;
  /** Exterior exposure for the current time and look; with a view direction, metering into a low sun. */
  exposure(viewDir?: THREE.Vector3): number;
  /** Environment for scene.environment (rebuilt on time/look change). */
  environment(): THREE.Texture | null;
  /** Per frame: keeps the dome on the camera, steers the haze colour to the view direction. */
  update(camera: THREE.PerspectiveCamera): void;
  /** Shadow range and normal bias for the current view scale (m from camera to its target). */
  fitShadows(viewDistance: number, maxDistance: number, mapSize: number, radius: number): void;
  /** Lens flare on/off (tier setting; e.g. after a runtime downgrade). No-op without a flare. */
  setLensflare(on: boolean): void;
  dispose(): void;
}

export function createSky(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  opts: { tier: Tier; shadows: boolean; shadowMapSize: number; lensflare: boolean },
): SkySystem {
  const group = new THREE.Group();
  group.name = "sky-system";

  const sky = makeSkyMesh();
  sky.scale.setScalar(4000);
  group.add(sky);

  const sun = new SunLight(0xffffff, 1);
  sun.name = "sun";
  // Visible and shadow-casting for the whole session, whatever the time: toggling either changes
  // every program's light hash and recompiles every lit material (seconds of freeze at sunset).
  // Below the horizon the sun keeps its slot at intensity 0 (see apply()).
  sun.visible = true;
  sun.castShadow = opts.shadows;
  sun.shadow.mapSize.set(opts.shadowMapSize, opts.shadowMapSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 600;
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.05;
  sun.shadow.radius = 2;
  group.add(sun);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x202020, 0);
  hemi.name = "fill";
  group.add(hemi);

  // Environment scene for the PMREM: its own sky copy (shares the material).
  const envScene = new THREE.Scene();
  const envSky = new THREE.Mesh(sky.geometry, sky.material);
  envSky.scale.setScalar(50);
  envSky.frustumCulled = false;
  envScene.add(envSky);

  const pmrem = new THREE.PMREMGenerator(renderer);
  let envTarget: THREE.WebGLRenderTarget | null = null;
  let envDirty = true;

  /** PMREM of the calibrated office interior (built once; rebuilt into the same texture after a context restore). */
  function renderInterior(): THREE.WebGLRenderTarget | null {
    try {
      const interior = buildInteriorScene();
      const target = pmrem.fromScene(interior, 0.035, 0.1, 50);
      interior.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      return target;
    } catch {
      return null;
    }
  }
  const interiorTarget = renderInterior();
  const envInterior: THREE.Texture | null = interiorTarget ? interiorTarget.texture : null;

  // Lens flare: only on ultra, only when the low sun is on screen (occlusion handled by the addon).
  let lensflare: Lensflare | null = null;
  let flareOn = opts.lensflare;
  const flareTextures: THREE.Texture[] = [];
  if (opts.lensflare && typeof document !== "undefined") {
    const flare = new Lensflare();
    lensflare = flare;
    // The addon's occlusion test copies pixels from the bound framebuffer, which WebGL refuses for a
    // multisampled target (MSAA after a runtime downgrade to low): skip the flare there.
    const drawFlare = flare.onBeforeRender;
    flare.onBeforeRender = (r, sc, cam, geo, mat, grp) => {
      const target = r.getRenderTarget();
      if (!flareOn || (target !== null && target.samples > 0)) return;
      drawFlare.call(flare, r, sc, cam, geo, mat, grp);
    };
    const core = flareTexture("core");
    const ring = flareTexture("ring");
    const hex = flareTexture("hex");
    flareTextures.push(core, ring, hex);
    // Flare sprites are added in HDR; keep them faint (a camera artefact, not a light).
    const warm = new THREE.Color(1, 0.86, 0.7).multiplyScalar(0.6);
    flare.addElement(new LensflareElement(core, 360, 0, warm));
    flare.addElement(new LensflareElement(hex, 60, 0.45, new THREE.Color(0.6, 0.7, 1).multiplyScalar(0.12)));
    flare.addElement(new LensflareElement(hex, 95, 0.7, new THREE.Color(0.7, 0.75, 1).multiplyScalar(0.1)));
    flare.addElement(new LensflareElement(ring, 200, 1, new THREE.Color(1, 0.9, 0.85).multiplyScalar(0.08)));
    flare.visible = false;
    group.add(flare);
  }

  let look: SkyLook = "default";
  let state: LightingState = lightingFor("2026-11-06T15:30");
  let exposure = 1;
  const fog = new THREE.FogExp2(0x8a9099, LOOKS.default.fogDensity);
  scene.fog = fog;
  const horizonAvg = new THREE.Color();
  const tmpV = new THREE.Vector3();
  const tmpC = new THREE.Vector3();
  const sunColor = new THREE.Color();

  function uniforms() {
    return (sky.material as THREE.ShaderMaterial).uniforms;
  }

  /**
   * Every lit shader samples the sun's shadow map, at any time of day, so the map must exist: a
   * session that starts after dark would otherwise bind three's placeholder, which has no depth
   * compare mode (r186 shadow-sampler arrays) — GL_INVALID_OPERATION on every draw, a black scene.
   * Render it once whenever it is missing, even inside renders that skip shadow updates.
   */
  function ensureShadowMap() {
    if (!opts.shadows || sun.shadow.map) return;
    sun.shadow.needsUpdate = true;
    renderer.shadowMap.needsUpdate = true;
  }

  /** Flare only while the low sun can be in view (and the tier still wants it). */
  function updateFlare() {
    if (!lensflare) return;
    const el = state.sunElevationDeg;
    lensflare.visible = flareOn && opts.tier === "ultra" && LOOKS[look].sunThrough > 0.5 && el > -0.5 && el < 14;
  }

  /**
   * Horizon radiance (shader units) for the haze: 16 bearings at 3° elevation,
   * each capped at 3× the median so the sun's aureole brightens the haze
   * towards the sun without flooding it. `bearingDeg` = one direction only.
   */
  const HORIZON_BEARINGS = Array.from({ length: 16 }, (_, i) => i * 22.5);
  function horizonRadiance(params: LookParams, sunDir: THREE.Vector3, bearingDeg: number | null, out: THREE.Color) {
    const samples = HORIZON_BEARINGS.map((b) => {
      const d = tmpV.set(Math.sin(b * RAD), 0.052, -Math.cos(b * RAD)).normalize();
      return preethamRadiance(d, sunDir, params, new THREE.Vector3());
    });
    const lum = (v: THREE.Vector3) => 0.2126 * v.x + 0.7152 * v.y + 0.0722 * v.z;
    const sorted = samples.map(lum).sort((a, b) => a - b);
    const cap = 1.6 * sorted[Math.floor(sorted.length / 2)];
    const capped = (v: THREE.Vector3) => {
      const l = lum(v);
      return l > cap && l > 0 ? v.clone().multiplyScalar(cap / l) : v;
    };
    const acc = new THREE.Vector3();
    if (bearingDeg === null) {
      for (const v of samples) acc.add(capped(v));
      acc.multiplyScalar(1 / samples.length);
    } else {
      const d = tmpV.set(Math.sin(bearingDeg * RAD), 0.052, -Math.cos(bearingDeg * RAD)).normalize();
      acc.copy(capped(preethamRadiance(d, sunDir, params, tmpC)));
    }
    out.setRGB(acc.x, acc.y, acc.z, THREE.LinearSRGBColorSpace);
    return out;
  }

  function apply() {
    const p = LOOKS[look];
    const el = state.sunElevationDeg;
    const u = uniforms();
    u.turbidity.value = p.turbidity;
    u.rayleigh.value = p.rayleigh;
    u.mieCoefficient.value = p.mieCoefficient;
    u.mieDirectionalG.value = p.mieDirectionalG;
    u.cloudCoverage.value = p.cloudCoverage;
    u.cloudDensity.value = p.cloudDensity;
    u.cloudScale.value = 0.00022;
    u.cloudElevation.value = 0.55;
    u.time.value = 37;
    (u.sunPosition.value as THREE.Vector3).copy(state.sunDir);
    // Hide the sun disc behind a full overcast deck.
    u.showSunDisc.value = p.sunThrough > 0.5 ? 1 : 0;

    const dayMix = THREE.MathUtils.smoothstep(el, -2.5, 2.0);
    u.uDayMix.value = dayMix;
    u.uSkyScale.value = SKY_SCALE * p.skyGain;
    u.uSkySat.value = p.saturation ?? 1;

    // Soft cap for the daylight dome: 8× its zenith (the sun disc itself is exempt). It acts on the
    // daylight term only, which fades with dayMix, so it needs no switch-off at dusk.
    u.uVisCap.value = visibleDomeCap(zenithLuminance(state.sunDir, p), dayMix);

    // Twilight dome (civil + nautical): luminance from the measured illuminance curve.
    const twiK = (1 - dayMix) * skyIlluminance(el) / Math.PI;
    const depression = THREE.MathUtils.clamp(-el / 12, 0, 1);
    (u.uTwiZenith.value as THREE.Vector3).set(0.32, 0.45, 1.0).multiplyScalar(twiK * 0.55);
    (u.uTwiHorizon.value as THREE.Vector3).set(0.75, 0.68, 0.82).multiplyScalar(twiK * 1.05);
    const glow = new THREE.Color().lerpColors(new THREE.Color(1.0, 0.5, 0.22), new THREE.Color(0.55, 0.22, 0.42), depression);
    (u.uTwiGlow.value as THREE.Vector3).set(glow.r, glow.g, glow.b).multiplyScalar(twiK * 1.9);

    // Night floor: light-polluted, often overcast sky over Turku.
    const nightK = state.night;
    // Units: zenith ≈ 0.4 cd/m², horizon glow ≈ 2 cd/m² (city light on low cloud).
    (u.uNightZenith.value as THREE.Vector3).set(0.22, 0.3, 0.55).multiplyScalar(nightK * 0.0012);
    (u.uNightHorizon.value as THREE.Vector3).set(0.6, 0.55, 0.62).multiplyScalar(nightK * 0.0016);
    (u.uCityGlow.value as THREE.Vector3).set(0.95, 0.7, 0.55).multiplyScalar(nightK * 0.0014);
    (u.uSunFlat.value as THREE.Vector3).set(state.sunDir.x, 0, state.sunDir.z);

    // Direct sun.
    const sunKlux = sunIlluminance(el, p.sunTurbidity) * p.sunThrough;
    kelvinToLinear(sunColorTemperature(el), sunColor);
    sun.color.copy(sunColor);
    sun.intensity = sunKlux;
    sun.position.copy(state.sunDir);
    // The cascades only re-render while the sun gives light (one refresh when it returns); the stale
    // map is harmless at intensity 0. visible/castShadow stay constant (see createSky).
    const sunLit = sunKlux > 0;
    if (sunLit && !sun.shadow.autoUpdate) sun.shadow.needsUpdate = true;
    sun.shadow.autoUpdate = sunLit;
    ensureShadowMap();

    // Ground radiance seen from above (for the environment probe): damp mixed surfaces, albedo ≈ 0.11.
    const groundE = skyIlluminance(el) * p.skyGain + sunKlux * Math.max(0, Math.sin(el * RAD)) * 0.5 + 0.008 * nightK;
    const groundTint = new THREE.Color(0.95, 0.92, 0.86);
    (u.uGround.value as THREE.Vector3).set(groundTint.r, groundTint.g, groundTint.b).multiplyScalar((0.11 * groundE) / Math.PI);

    // Night fill: glow of the low cloud over the lit city from above (cool-neutral), street light
    // bounced off the ground from below (warm). Keeps unlit facades legible but dark.
    hemi.color.copy(kelvinToLinear(5200));
    hemi.groundColor.copy(kelvinToLinear(3200)).multiplyScalar(0.55);
    hemi.intensity = 0.005 * nightK;

    // Exposure and haze.
    exposure = exposureFor(el, p.ev);
    fog.density = p.fogDensity * (1 + 0.35 * nightK);
    horizonRadiance(p, state.sunDir, null, horizonAvg);
    horizonAvg.multiplyScalar(SKY_SCALE * p.skyGain * dayMix);
    // Add the twilight/night horizon terms so the haze matches the dome after sunset.
    const t = u.uTwiHorizon.value as THREE.Vector3;
    const n = u.uNightHorizon.value as THREE.Vector3;
    const cg = u.uCityGlow.value as THREE.Vector3;
    horizonAvg.r += t.x + n.x + cg.x * 0.7;
    horizonAvg.g += t.y + n.y + cg.y * 0.7;
    horizonAvg.b += t.z + n.z + cg.z * 0.7;
    // Same saturation as the dome, and overcast haze is a little greyer still.
    const grey = 0.2126 * horizonAvg.r + 0.7152 * horizonAvg.g + 0.0722 * horizonAvg.b;
    horizonAvg.lerp(new THREE.Color(grey, grey, grey * 1.03), 1 - (p.saturation ?? 1) * 0.8);
    fog.color.copy(horizonAvg);
    (u.uHorizonHaze.value as THREE.Color).copy(fog.color);

    updateFlare();
    envDirty = true;
  }

  function rebuildEnvironment() {
    if (!envDirty) return;
    envDirty = false;
    const u = uniforms();
    // Cap the probe at a multiple of the zenith luminance: the aureole then adds roughly the
    // 10–20 % of the direct beam that real circumsolar skylight does.
    u.uEnvCap.value = probeCap(zenithLuminance(state.sunDir, LOOKS[look]));
    u.uHazeBlend.value = 0;
    const visCap = u.uVisCap.value as number;
    u.uVisCap.value = 1e9;
    const previous = envTarget;
    envTarget = pmrem.fromScene(envScene, 0, 0.1, 100);
    previous?.dispose();
    u.uEnvCap.value = 1e9;
    u.uHazeBlend.value = 1;
    u.uVisCap.value = visCap;
  }

  const viewHorizon = new THREE.Color();
  const forward = new THREE.Vector3();

  // After a WebGL context restore every render target is empty: rebuild the sky probe on the next
  // frame, and the interior probe now — into the same texture, which modules hold as ctx.envInterior.
  const canvas = renderer.domElement;
  const onContextRestored = () => {
    envDirty = true;
    // The shadow map's GPU texture is gone too: draw it again even if the sun is down.
    if (opts.shadows) {
      sun.shadow.needsUpdate = true;
      renderer.shadowMap.needsUpdate = true;
    }
    if (!interiorTarget) return;
    const fresh = renderInterior();
    if (!fresh) return;
    renderer.initRenderTarget(interiorTarget);
    renderer.copyTextureToTexture(fresh.texture, interiorTarget.texture);
    fresh.dispose();
  };
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  apply();

  return {
    group,
    sun,
    hemi,
    sky,
    envInterior,
    setTime(iso: string) {
      state = lightingFor(iso);
      apply();
      return state;
    },
    setLook(next: SkyLook) {
      look = next;
      apply();
    },
    look: () => look,
    lighting: () => state,
    exposure(viewDir?: THREE.Vector3) {
      if (!viewDir) return exposure;
      // A camera metering into the low sun stops down (≤ 0.8 EV) — buildings read as silhouettes.
      const el = state.sunElevationDeg;
      const facing = Math.max(0, viewDir.dot(state.sunDir));
      const lowSun = THREE.MathUtils.smoothstep(el, -1.5, 1) * (1 - THREE.MathUtils.smoothstep(el, 12, 25));
      const k = Math.pow(facing, 3) * lowSun * (LOOKS[look].sunThrough > 0.5 ? 1 : 0);
      return exposure * Math.pow(2, -0.8 * k);
    },
    environment() {
      rebuildEnvironment();
      return envTarget ? envTarget.texture : null;
    },
    update(camera: THREE.PerspectiveCamera) {
      sky.position.copy(camera.position);
      if (lensflare) lensflare.position.copy(camera.position).addScaledVector(state.sunDir, 3000);
      // Haze towards the view direction: 70 % compass average + 30 % this bearing.
      camera.getWorldDirection(forward);
      const p = LOOKS[look];
      if (state.sunElevationDeg > -3) {
        const bearing = (Math.atan2(forward.x, -forward.z) / RAD + 360) % 360;
        horizonRadiance(p, state.sunDir, bearing, viewHorizon);
        const dayMix = THREE.MathUtils.smoothstep(state.sunElevationDeg, -2.5, 2.0);
        viewHorizon.multiplyScalar(SKY_SCALE * p.skyGain * dayMix);
        const vg = 0.2126 * viewHorizon.r + 0.7152 * viewHorizon.g + 0.0722 * viewHorizon.b;
        viewHorizon.lerp(new THREE.Color(vg, vg, vg * 1.03), 1 - (p.saturation ?? 1) * 0.8);
        fog.color.copy(horizonAvg).lerp(viewHorizon.add(new THREE.Color().copy(horizonAvg).multiplyScalar(1 - dayMix)), 0.45);
      } else {
        fog.color.copy(horizonAvg);
      }
      (uniforms().uHorizonHaze.value as THREE.Color).copy(fog.color);
    },
    fitShadows(viewDistance: number, maxDistance: number, mapSize: number, radius: number) {
      // Close views get a short shadow range (sharper near cascade); overviews reach the whole campus.
      const range = THREE.MathUtils.clamp(viewDistance * 5.5, 140, maxDistance);
      sun.shadow.camera.far = range;
      if (sun.shadow.mapSize.x !== mapSize) {
        sun.shadow.mapSize.set(mapSize, mapSize);
        sun.shadow.map?.dispose();
        sun.shadow.map = null;
        ensureShadowMap();
      }
      sun.shadow.radius = radius;
      // Texel size of the far cascade ≈ range / mapSize; bias in metres along the normal.
      const texel = range / mapSize;
      sun.shadow.normalBias = THREE.MathUtils.clamp(texel * 0.9, 0.02, 0.45);
      // Grazing sun stretches texels along the ground: a little more depth bias when low.
      const grazing = 1 / Math.max(0.12, Math.sin(Math.max(1, state.sunElevationDeg) * RAD));
      sun.shadow.bias = -0.00008 * Math.min(grazing, 6);
    },
    setLensflare(on: boolean) {
      flareOn = on && opts.lensflare;
      updateFlare();
    },
    dispose() {
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      envTarget?.dispose();
      interiorTarget?.dispose();
      pmrem.dispose();
      sky.geometry.dispose();
      (sky.material as THREE.Material).dispose();
      sun.dispose();
      hemi.dispose();
      flareTextures.forEach((t) => t.dispose());
      lensflare?.dispose();
      if (scene.fog === fog) scene.fog = null;
      group.removeFromParent();
    },
  };
}
