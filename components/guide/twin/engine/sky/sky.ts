import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { SunLight } from "three/addons/lights/SunLight.js";
import { Lensflare, LensflareElement } from "three/addons/objects/Lensflare.js";
import type { LightingState, Tier } from "../types";
import { installShadowFilter, trackCascadeTexels } from "../render/shadowFilter";
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
 * Photographer's exposure value (EV100) for the exterior in daylight, by sun elevation: dull
 * November daylight down to sunset. Below the horizon see exposureValue.
 */
const EV_TABLE: [number, number][] = [
  [0, 9.3],
  [2, 9.9],
  [5, 10.65],
  // A sun break at Saturday noon (12°) lights white facades with ≈ 30 klux: expose for them, not for
  // the shade (half a stop under the old table, which bleached them and veiled the street milky).
  [8, 11.65],
  [12, 12.5],
  [20, 13.5],
  [40, 14.5],
  [90, 15.0],
];

/**
 * Urban night floor (lux on the ground, away from any lamp): low cloud lit by the city and street
 * light scattered between the buildings on an overcast November night in Turku. A real night is lit
 * by its lamps, windows and signs; this floor only keeps unlit facades from going pure black.
 */
export const NIGHT_FLOOR_LUX = 2.0;

/**
 * The calibrated daylight dome's share of the measured diffuse illuminance (Friday 15:30: ≈ 0.83 of
 * 1.82 klux) — the daytime look the exposure table was tuned with.
 */
const DAY_DOME_SHARE = 0.46;
/**
 * …and its share by a midday sun break (11° up): the clear Preetham dome alone (≈ 2.5 of a measured
 * 4.7 klux at Saturday 11:00) left walls in shade about a stop under the reference photos while the
 * low sun lit the others; the dome is topped up with a near-neutral overcast fill (domeTerms).
 */
const DAY_FILL_SHARE = 0.75;

/**
 * Diffuse sky light the dome stands for (klux): the calibrated daylight look by day, the measured
 * twilight curve from 3.5° below the horizon, a smooth handover around sunset (shaped so that the
 * image of an ambient-lit surface only ever darkens as the sun sinks — see exposureValue).
 */
export function twilightTarget(elevationDeg: number): number {
  const twilight = 1 - THREE.MathUtils.smoothstep(elevationDeg, -3.5, 2);
  const share = DAY_DOME_SHARE + (DAY_FILL_SHARE - DAY_DOME_SHARE) * THREE.MathUtils.smoothstep(elevationDeg, 6, 11);
  return skyIlluminance(elevationDeg) * (share + (1 - share) * twilight);
}

/** Ambient light after sunset that the exposure follows (klux): the twilight sky + the urban floor; street lights excluded. */
export function twilightAmbient(elevationDeg: number): number {
  return twilightTarget(elevationDeg) + (NIGHT_FLOOR_LUX / 1000) * nightFactor(elevationDeg);
}

/**
 * Share of the fall in ambient light after sunset that the exposure follows: a photographer opens up
 * through dusk, but less than the light drops — blue hour is darker than day, night darker still.
 * Below 1, the image of an ambient-lit surface can only get darker as the sun sinks.
 */
export const TWILIGHT_ADAPTATION = 0.65;

/**
 * EV100 of a street-lit city night. The exposure stops opening up here (about 5.5° below the horizon,
 * as the lamps take over): the ambient keeps falling into the night and the lights carry the image.
 */
export const NIGHT_EV = 4.8;

/** EV100 a photographer would use at this sun elevation. */
export function exposureValue(elevationDeg: number): number {
  const t = EV_TABLE;
  if (elevationDeg < 0) {
    const ev = t[0][1] + TWILIGHT_ADAPTATION * Math.log2(twilightAmbient(elevationDeg) / twilightAmbient(0));
    return Math.max(NIGHT_EV, ev);
  }
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

/**
 * Exposure for interiors under their own light alone (≈ 400 lux at 3500 K) — at night, and the
 * reference every interior module is calibrated for (DESIGN §12).
 */
export const INTERIOR_EXPOSURE = 3.2;

/** Interior lighting the reference exposure is calibrated for (klux). */
const INTERIOR_LAMPS = 0.4;
/**
 * Daylight factor of the event interiors on average — glazed lobbies, the BioCity vault, Joki's glass
 * drum (≈ 2–10 %): the share of the exterior daylight that reaches the floor indoors.
 */
const INTERIOR_DAYLIGHT_FACTOR = 0.07;
/**
 * By day an interior is exposed at most this many stops over the exterior: in glazed lobbies the
 * windows pull a camera's metering down, so the street through the glass keeps some detail.
 */
const INTERIOR_HEADROOM_EV = 2.2;
/** Share of a change in interior light that the camera's metering follows. */
const INTERIOR_ADAPTATION = 0.85;

/**
 * Interior exposure for the time of day: a camera inside meters the room, lit by its lamps and by the
 * daylight through its glazing — about a stop less exposure at Saturday noon than at night, so glazed
 * halls do not wash out and the street through the glass keeps its detail.
 */
export function interiorExposureFor(elevationDeg: number, sunThrough = 1, ev = 0): number {
  const sun = sunIlluminance(elevationDeg, 10) * sunThrough * Math.max(0, Math.sin(elevationDeg * RAD));
  // Direct sun reaches only part of a room: a third of it counts towards what the camera meters.
  const daylight = INTERIOR_DAYLIGHT_FACTOR * (skyIlluminance(elevationDeg) + 0.3 * sun);
  const metered = INTERIOR_EXPOSURE * Math.pow(INTERIOR_LAMPS / (INTERIOR_LAMPS + daylight), INTERIOR_ADAPTATION);
  return Math.min(metered, exposureFor(elevationDeg, ev) * Math.pow(2, INTERIOR_HEADROOM_EV));
}

/**
 * Camera exposure between the exterior's and the interior's (log space), for the engine's indoor
 * weight (0 = outdoors … 1 = inside a building; 0.55 over an opened dollhouse). After dark the
 * weight leans to the interior — the lit rooms of an opened building expose right instead of
 * bleaching, and its dark surroundings get the view fill (viewFill) rather than more exposure.
 */
export function blendExposure(exterior: number, interior: number, indoor: number, night: number): number {
  const w = indoor <= 0 ? 0 : indoor >= 1 ? 1 : Math.pow(indoor, 1 - 0.8 * THREE.MathUtils.clamp(night, 0, 1));
  return Math.exp(Math.log(exterior) * (1 - w) + Math.log(interior) * w);
}

/**
 * For building modules — scale of an interior's own light while the camera is OUTSIDE the closed
 * building (DESIGN §12). The engine then exposes for the street, after dark up to ≈ 20× the
 * interior's exposure, so lit rooms would clip to flat white. 80 % of that (in log space) is taken
 * back: at night the rooms still read about a stop brighter than from inside, glowing over the
 * street, with ceilings, desks and walls legible. Never brightened (by day it is 1).
 */
export function outsideInteriorScale(elevationDeg: number, ev = 0): number {
  return THREE.MathUtils.clamp(Math.pow(INTERIOR_EXPOSURE / exposureFor(elevationDeg, ev), 0.8), 0.05, 1);
}

/**
 * For building modules — scale of an interior's own light in an opened (dollhouse) view, where the
 * engine exposes for the blend of exterior and interior (blendExposure at weight 0.55): the rooms
 * then read as they would at INTERIOR_EXPOSURE — brighter by day (open to the sky), never dimmer
 * than half at night.
 */
export function openedInteriorScale(elevationDeg: number, ev = 0): number {
  const e = blendExposure(exposureFor(elevationDeg, ev), interiorExposureFor(elevationDeg), 0.55, nightFactor(elevationDeg));
  return THREE.MathUtils.clamp(INTERIOR_EXPOSURE / e, 0.5, 2.2);
}

/**
 * Exterior light (E·exposure, klux) at which asphalt (albedo ≈ 0.12) reads at about sRGB 25 and a
 * mid-grey facade at about 50: the view fill tops an opened building's surroundings up to it after dark.
 */
const VIEW_FILL_TARGET = 0.42;

/**
 * Cool, dim "map" fill (klux) for the surroundings of an opened building after dark: what the camera
 * exposure (set for the lit interior) leaves of the outside ambient, topped up so streets, entrances
 * and neighbours stay legible around the dollhouse. 0 by day and whenever the ambient suffices.
 */
export function viewFill(exposure: number, ambientKlux: number): number {
  return Math.max(0, VIEW_FILL_TARGET / Math.max(exposure, 1e-3) - ambientKlux);
}

/**
 * Stops a camera metering into a low sun takes off (≤ 0.8 EV): buildings against the sun read as
 * silhouettes. `facing` = view direction · sun direction; `visible` = share of the sun disc and its
 * aureole not hidden by buildings (a sun sliding behind an edge stops down gradually).
 */
export function lowSunStops(facing: number, elevationDeg: number, visible: number, sunThrough = 1): number {
  const lowSun = THREE.MathUtils.smoothstep(elevationDeg, -1.5, 1) * (1 - THREE.MathUtils.smoothstep(elevationDeg, 12, 25));
  const through = sunThrough > 0.5 ? 1 : 0;
  return 0.8 * Math.pow(Math.max(0, facing), 3) * lowSun * through * THREE.MathUtils.clamp(visible, 0, 1);
}

/** Exponential adaptation from `current` towards `target` over `dt` s (time constant 1/rate s). */
export function adaptToward(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-Math.max(0, dt) * rate));
}

/**
 * Directions over the sun disc and its aureole (unit vectors): the centre and a ring of `ring` at
 * `radiusDeg` around it — the engine tests each against the buildings for the visible share.
 */
export function sunSampleDirections(sunDir: THREE.Vector3, radiusDeg = 2, ring = 6): THREE.Vector3[] {
  const d = sunDir.clone().normalize();
  const helper = Math.abs(d.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = new THREE.Vector3().crossVectors(d, helper).normalize();
  const v = new THREE.Vector3().crossVectors(d, u).normalize();
  const r = Math.tan(radiusDeg * RAD);
  const out = [d];
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2;
    out.push(d.clone().addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r).normalize());
  }
  return out;
}

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

// ── Twilight and night dome (pure, unit-tested) ─────────────────────────────

/** Twilight and night terms of the sky dome (scene units, linear RGB) — the uniforms of the patch below. */
export interface DomeTerms {
  twiZenith: THREE.Vector3;
  twiHorizon: THREE.Vector3;
  /** Glow towards the sun's azimuth, low on the horizon. */
  twiGlow: THREE.Vector3;
  nightZenith: THREE.Vector3;
  nightHorizon: THREE.Vector3;
  /** City light on the low cloud, near the horizon. */
  cityGlow: THREE.Vector3;
}

const TWI_GLOW_EARLY = new THREE.Color(1.0, 0.5, 0.22);
const TWI_GLOW_LATE = new THREE.Color(0.55, 0.22, 0.42);
const TWI_GLOW_TMP = new THREE.Color();

/**
 * Twilight dome (civil + nautical, luminance from the measured illuminance curve) and the night
 * floor of a light-polluted, mostly overcast Turku sky: zenith ≈ 0.09 cd/m², horizon ≈ 0.6 cd/m²
 * with the city glow (the old floor, 0.4 and 2 cd/m², lit the night like a dull day). The twilight sky stays bright towards the sun's azimuth well into civil dusk.
 */
export function domeTerms(elevationDeg: number, night: number, out: DomeTerms, twilightKlux?: number): DomeTerms {
  const dayMix = THREE.MathUtils.smoothstep(elevationDeg, -2.5, 2.0);
  // Scale of the twilight shape: its irradiance on the ground is the twilight light it stands for.
  const twiK = (twilightKlux ?? (1 - dayMix) * skyIlluminance(elevationDeg)) / TWILIGHT_SHAPE_IRRADIANCE;
  const depression = THREE.MathUtils.clamp(-elevationDeg / 12, 0, 1);
  // By day the same terms are a near-neutral overcast fill (no glow); at dusk, twilight colours.
  const day = THREE.MathUtils.smoothstep(elevationDeg, 3, 8);
  out.twiZenith.set(0.34 + 0.5 * day, 0.47 + 0.44 * day, 1.0 + 0.04 * day).multiplyScalar(twiK * 0.55);
  // A warm-grey band (not lavender): the blue comes from the zenith, the colour from the glow.
  out.twiHorizon.set(0.8 + 0.18 * day, 0.72 + 0.25 * day, 0.72 + 0.24 * day).multiplyScalar(twiK * 1.05);
  // Gold towards the set sun at first, rose and violet as it sinks.
  const glow = TWI_GLOW_TMP.lerpColors(TWI_GLOW_EARLY, TWI_GLOW_LATE, depression);
  out.twiGlow.set(glow.r, glow.g, glow.b).multiplyScalar(twiK * 1.9 * (1 - day));
  const n = THREE.MathUtils.clamp(night, 0, 1);
  out.nightZenith.set(0.22, 0.3, 0.55).multiplyScalar(n * 0.00031);
  out.nightHorizon.set(0.6, 0.57, 0.64).multiplyScalar(n * 0.00052);
  out.cityGlow.set(0.9, 0.72, 0.6).multiplyScalar(n * 0.00045);
  return out;
}

/** Irradiance of a twilight dome shape (twiK = 1) on the ground: numerical, the shader's falloffs. */
function twilightShapeIrradiance(): number {
  const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const h = lum(0.8, 0.72, 0.72) * 1.05;
  const z = lum(0.34, 0.47, 1.0) * 0.55;
  const g = ((lum(1.0, 0.5, 0.22) + lum(0.55, 0.22, 0.42)) / 2) * 1.9;
  const nT = 48;
  const nP = 96;
  let e = 0;
  for (let i = 0; i < nT; i++) {
    const th = ((i + 0.5) / nT) * (Math.PI / 2);
    const up = Math.cos(th);
    const a = Math.pow(up, 0.55);
    for (let j = 0; j < nP; j++) {
      const ph = ((j + 0.5) / nP) * Math.PI * 2;
      const towards = Math.max(0, Math.cos(ph));
      const l = h * (1 - a) + z * a + g * towards ** 3 * Math.exp(-up * 9);
      e += l * up * Math.sin(th) * (Math.PI / 2 / nT) * ((Math.PI * 2) / nP);
    }
  }
  return e;
}
const TWILIGHT_SHAPE_IRRADIANCE = twilightShapeIrradiance();

/**
 * Irradiance (klux) of the daylight (Preetham) dome on the ground as the environment probe sees it
 * (aureole capped like rebuildEnvironment), × dayMix. Clouds are not modelled here.
 */
export function daylightDomeIrradiance(
  sunDir: THREE.Vector3,
  p: { turbidity: number; rayleigh: number; mieCoefficient: number; mieDirectionalG: number; skyGain?: number },
  dayMix: number,
): number {
  if (dayMix <= 0) return 0;
  const cap = probeCap(zenithLuminance(sunDir, p));
  const scale = SKY_SCALE * (p.skyGain ?? 1) * dayMix;
  const nT = 10;
  const nP = 24;
  const dir = new THREE.Vector3();
  const rad = new THREE.Vector3();
  let e = 0;
  for (let i = 0; i < nT; i++) {
    const th = ((i + 0.5) / nT) * (Math.PI / 2);
    for (let j = 0; j < nP; j++) {
      const ph = ((j + 0.5) / nP) * Math.PI * 2;
      dir.set(Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph));
      preethamRadiance(dir, sunDir, p, rad);
      const l = Math.min((0.2126 * rad.x + 0.7152 * rad.y + 0.0722 * rad.z) * scale, cap * dayMix);
      e += l * Math.cos(th) * Math.sin(th) * (Math.PI / 2 / nT) * ((Math.PI * 2) / nP);
    }
  }
  return e;
}

/**
 * Twilight light (klux) the dome adds so its total follows twilightTarget from sunset through dusk:
 * the Preetham dome alone goes dark minutes before the sun sets (≈ 0.08 klux at 0° against a
 * measured 0.45); by day, the overcast fill up to DAY_FILL_SHARE of the measured light.
 */
export function twilightTopUp(elevationDeg: number, daylightDomeKlux: number, skyGain = 1): number {
  return Math.max(0, twilightTarget(elevationDeg) * skyGain - daylightDomeKlux);
}
/** Luminance (scene units) of the twilight + night dome in a direction `up` (0 = horizon … 1 = zenith), `towardsSun` 0…1 — mirrors the shader. */
export function domeLuminance(t: DomeTerms, up: number, towardsSun = 0): number {
  const lum = (v: THREE.Vector3) => 0.2126 * v.x + 0.7152 * v.y + 0.0722 * v.z;
  const u = THREE.MathUtils.clamp(up, 0, 1);
  const a = Math.pow(u, 0.55);
  const b = Math.pow(u, 0.45);
  const twi = lum(t.twiHorizon) * (1 - a) + lum(t.twiZenith) * a + lum(t.twiGlow) * Math.pow(towardsSun, 3) * Math.exp(-u * 9);
  const night = lum(t.nightHorizon) * (1 - b) + lum(t.nightZenith) * b + lum(t.cityGlow) * Math.exp(-u * 10);
  return twi + night;
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
  /** Exterior exposure for the current time and look; with a view direction, metering into a low sun (`sunVisible` = unhidden share). */
  exposure(viewDir?: THREE.Vector3, sunVisible?: number): number;
  /** Interior exposure for the current time (daylight through the glazing lowers it by day). */
  interiorExposure(): number;
  /**
   * Per frame, before the engine decides whether to draw: adapts the low-sun metering (the share of
   * the sun disc and aureole that `hidden(point)` — a building between camera and point — leaves
   * visible) and the opened-view fill (`opened` 0/1). True while either is still settling.
   */
  adapt(dt: number, camera: THREE.Camera, hidden: (point: THREE.Vector3) => boolean, opened: number): boolean;
  /** Camera exposure for the engine's indoor weight (adapted metering included); sets the view fill that depends on it. */
  cameraExposure(indoor: number): number;
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

  // Smooth, noise-free PCF and per-cascade normal offsets (render/shadowFilter.ts) — before anything compiles.
  const shadowPatch = installShadowFilter();
  const sun = new SunLight(0xffffff, 1);
  sun.name = "sun";
  const cascadeTexels = shadowPatch.perCascadeBias && trackCascadeTexels(sun.shadow);
  // Visible and shadow-casting for the whole session, whatever the time: toggling either changes
  // every program's light hash and recompiles every lit material (seconds of freeze at sunset).
  // Below the horizon the sun keeps its slot at intensity 0 (see apply()).
  sun.visible = true;
  sun.castShadow = opts.shadows;
  sun.shadow.mapSize.set(opts.shadowMapSize, opts.shadowMapSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 600;
  sun.shadow.bias = -0.00025;
  // In texels of each cascade when the shader takes per-cascade offsets, else metres (fitShadows refines it).
  sun.shadow.normalBias = cascadeTexels ? 1.4 : 0.05;
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
  let interiorExp = INTERIOR_EXPOSURE;
  /** Bumped on every time/look change: metering snaps instead of adapting across a cut. */
  let version = 0;
  /** Night fill of the hemisphere light (klux) before the opened-view fill. */
  let hemiBase = 0;
  // Low-sun metering: stops taken off now and the unhidden share of the sun (re-tested when the camera moves).
  const meter = { stops: 0, visible: 1, version: -1, cam: new THREE.Matrix4(), pos: new THREE.Vector3(), samples: [] as THREE.Vector3[], samplesVersion: -1 };
  /** Opened-view fill: 0…1, adapted. */
  let fillAmount = 0;
  const meterDir = new THREE.Vector3();
  const meterPoint = new THREE.Vector3();
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

    // Twilight dome and the night floor (see domeTerms): from sunset the twilight term tops the fading
    // daylight dome up to the measured diffuse illuminance, so dusk is lit like dusk (not like night).
    const nightK = state.night;
    const dayDome = daylightDomeIrradiance(state.sunDir, p, dayMix);
    const twilight = twilightTopUp(el, dayDome, p.skyGain);
    domeTerms(el, nightK, {
      twiZenith: u.uTwiZenith.value as THREE.Vector3,
      twiHorizon: u.uTwiHorizon.value as THREE.Vector3,
      twiGlow: u.uTwiGlow.value as THREE.Vector3,
      nightZenith: u.uNightZenith.value as THREE.Vector3,
      nightHorizon: u.uNightHorizon.value as THREE.Vector3,
      cityGlow: u.uCityGlow.value as THREE.Vector3,
    }, twilight);
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
    // At night the ground averages ≈ 3 lux (lamp pools over a third of it, the urban floor elsewhere).
    const groundE = skyIlluminance(el) * p.skyGain + sunKlux * Math.max(0, Math.sin(el * RAD)) * 0.5 + 0.003 * nightK;
    const groundTint = new THREE.Color(0.95, 0.92, 0.86);
    (u.uGround.value as THREE.Vector3).set(groundTint.r, groundTint.g, groundTint.b).multiplyScalar((0.11 * groundE) / Math.PI);

    // Night fill on top of the probe's dim night dome: a little glow from the low cloud above
    // (neutral-cool), street light bounced off the ground from below (neutral-warm). Together with the
    // probe ≈ NIGHT_FLOOR_LUX — unlit facades stay dark, so lamps, windows and signs carry the night.
    hemi.color.copy(kelvinToLinear(6500));
    hemi.groundColor.copy(kelvinToLinear(4000)).multiplyScalar(0.6);
    hemiBase = (NIGHT_FLOOR_LUX / 1000) * 0.35 * nightK;
    hemi.intensity = hemiBase;

    // Exposure and haze.
    exposure = exposureFor(el, p.ev);
    interiorExp = interiorExposureFor(el, p.sunThrough, p.ev);
    version++;
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
    exposure(viewDir?: THREE.Vector3, sunVisible = 1) {
      if (!viewDir) return exposure;
      // A camera metering into the low sun stops down (≤ 0.8 EV) — buildings read as silhouettes.
      return exposure * Math.pow(2, -lowSunStops(viewDir.dot(state.sunDir), state.sunElevationDeg, sunVisible, LOOKS[look].sunThrough));
    },
    interiorExposure: () => interiorExp,
    adapt(dt, camera, hidden, opened) {
      camera.getWorldDirection(meterDir);
      const el = state.sunElevationDeg;
      const sunThrough = LOOKS[look].sunThrough;
      const facing = meterDir.dot(state.sunDir);
      let target = 0;
      if (lowSunStops(facing, el, 1, sunThrough) > 0.002) {
        // The unhidden share of the sun: 7 rays over the disc and aureole, re-tested only when the camera or the sun moved.
        if (meter.version !== version || !meter.cam.equals(camera.matrixWorld)) {
          if (meter.samplesVersion !== version) {
            meter.samples = sunSampleDirections(state.sunDir, 2, 6);
            meter.samplesVersion = version;
          }
          let seen = 0;
          for (const d of meter.samples) if (!hidden(meterPoint.copy(camera.position).addScaledVector(d, 900))) seen++;
          meter.visible = seen / meter.samples.length;
        }
        target = lowSunStops(facing, el, meter.visible, sunThrough);
      }
      // A cut (new time or look, a jump of the camera) takes the new metering at once; motion adapts.
      const cut = meter.version !== version || meter.pos.distanceToSquared(camera.position) > 30 * 30;
      meter.stops = cut ? target : adaptToward(meter.stops, target, dt, 1.5);
      if (Math.abs(meter.stops - target) < 0.004) meter.stops = target;
      meter.version = version;
      meter.cam.copy(camera.matrixWorld);
      meter.pos.copy(camera.position);
      const fillTarget = THREE.MathUtils.clamp(opened, 0, 1);
      fillAmount = adaptToward(fillAmount, fillTarget, dt, 4);
      if (Math.abs(fillAmount - fillTarget) < 0.01) fillAmount = fillTarget;
      return meter.stops !== target || fillAmount !== fillTarget;
    },
    cameraExposure(indoor) {
      const e = blendExposure(exposure * Math.pow(2, -meter.stops), interiorExp, indoor, state.night);
      // An opened building's surroundings after dark: a dim cool fill instead of a black void.
      const fill = fillAmount > 0 ? fillAmount * viewFill(e, twilightAmbient(state.sunElevationDeg)) : 0;
      hemi.intensity = hemiBase + fill;
      return e;
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
      // Grazing sun stretches texels along the ground: a little more offset and depth bias when low.
      const grazing = Math.min(6, 1 / Math.max(0.12, Math.sin(Math.max(1, state.sunElevationDeg) * RAD)));
      if (cascadeTexels) {
        // Normal offset in texels of each cascade (the shader multiplies by the cascade's texel size); the
        // receiver-plane bias handles the slope, so about a texel keeps thin geometry's contact shadows.
        sun.shadow.normalBias = radius < 1.75 ? 0.8 : 1.0;
      } else {
        // Texel size of the far cascade ≈ range / mapSize; bias in metres along the normal.
        sun.shadow.normalBias = THREE.MathUtils.clamp((range / mapSize) * 0.9, 0.02, 0.45);
      }
      sun.shadow.bias = (cascadeTexels ? -0.00004 : -0.00008) * grazing;
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
