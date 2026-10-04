import type { V2, V3 } from "./types";

/**
 * The campus frame (SPEC §1): metres, origin = BioCity's OSM centroid,
 * +x east, +z south (north = −z), +y up, y = h(N2000) − 23.20.
 * Compass bearing β (0 = north, clockwise) ↔ ground direction (sin β, −cos β).
 *
 * Plan frames (SPEC §1.3) place CAD content of the hero buildings:
 *   local = (x·cosθ − z·sinθ + tx, x·sinθ + z·cosθ + tz)
 * i.e. a three.js group with rotation.y = −θ and position (tx, 0, tz).
 */

export const ORIGIN = { lat: 60.44932, lon: 22.29326 } as const;
/** Metres per degree (111320·cos 60.44932° east, 110540 north). */
export const M_PER_DEG_LON = 54902.3;
export const M_PER_DEG_LAT = 110540;
/** N2000 height of y = 0 (Tykistökatu sidewalk at the BioCity entrance). */
export const DATUM_N2000 = 23.2;

const RAD = Math.PI / 180;

export function geoToLocal(lat: number, lon: number): V2 {
  return [(lon - ORIGIN.lon) * M_PER_DEG_LON, -(lat - ORIGIN.lat) * M_PER_DEG_LAT];
}

export function localToGeo(x: number, z: number): { lat: number; lon: number } {
  return { lat: ORIGIN.lat - z / M_PER_DEG_LAT, lon: ORIGIN.lon + x / M_PER_DEG_LON };
}

export const n2000ToY = (h: number) => h - DATUM_N2000;
export const yToN2000 = (y: number) => y + DATUM_N2000;

/** Unit ground vector [x, z] for a compass bearing. */
export function bearingVector(bearingDeg: number): V2 {
  const b = bearingDeg * RAD;
  return [Math.sin(b), -Math.cos(b)];
}

/** Compass bearing (0…360) of a ground direction. */
export function vectorBearing(dx: number, dz: number): number {
  return ((Math.atan2(dx, -dz) / RAD) % 360 + 360) % 360;
}

/**
 * rotation.y for a model whose front faces a compass bearing.
 * `front` = the model's forward axis in its own space (SPEC §1.1).
 */
export function yawForBearing(bearingDeg: number, front: "-z" | "+z" | "+x" = "-z"): number {
  if (front === "+x") return (90 - bearingDeg) * RAD;
  if (front === "+z") return Math.PI - bearingDeg * RAD;
  return -bearingDeg * RAD;
}

export interface PlanFrame {
  id: "B" | "J" | "E";
  /** Compass bearing of plan up (−z), degrees. */
  theta: number;
  tx: number;
  tz: number;
  /** y of the plan's level 0 in the campus frame. */
  y0: number;
}

/** SPEC §1.3 — fitted to the CAD plans, OSM vertices and LOD2 roofs. */
export const PLAN_FRAMES: Record<PlanFrame["id"], PlanFrame> = {
  /** BioCity ground floor (TTK setup plan); lobby floor y 0.06. */
  B: { id: "B", theta: 55.141, tx: -6.928, tz: 12.619, y0: 0 },
  /** Joki (origin = round tower centre). */
  J: { id: "J", theta: 38.781, tx: 58.894, tz: 15.934, y0: 0 },
  /** EduCity (origin = outer N corner of the main block); y_E 0 = 1F lobby = y 3.40. */
  E: { id: "E", theta: 38.983, tx: 217.472, tz: 51.22, y0: 3.4 },
};

/** Plan (x, z) → campus (x, z). */
export function planToLocal(frame: PlanFrame, x: number, z: number): V2 {
  const t = frame.theta * RAD;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [x * c - z * s + frame.tx, x * s + z * c + frame.tz];
}

/** Campus (x, z) → plan (x, z). */
export function localToPlan(frame: PlanFrame, x: number, z: number): V2 {
  const t = frame.theta * RAD;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const dx = x - frame.tx;
  const dz = z - frame.tz;
  return [dx * c + dz * s, -dx * s + dz * c];
}

/** Transform for a three.js group holding plan content. */
export function planGroupTransform(frame: PlanFrame): { position: V3; rotationY: number } {
  return { position: [frame.tx, frame.y0, frame.tz], rotationY: -frame.theta * RAD };
}

/** Point at radius r and plan bearing b (clockwise from plan up) in plan coordinates. */
export function planPolar(r: number, bearingDeg: number): V2 {
  const b = bearingDeg * RAD;
  return [r * Math.sin(b), -r * Math.cos(b)];
}

/** Compass bearing of a direction given in a plan frame's bearings ("J-bearing"). */
export const planBearingToCompass = (frame: PlanFrame, bearingDeg: number) => (bearingDeg + frame.theta + 360) % 360;

// ── Campus extents and landmarks ────────────────────────────────────────────

/** DTM / context ring extent (SPEC §1.4, §2.1). */
export const CAMPUS_BOUNDS = { minX: -179, maxX: 343, minZ: -208, maxZ: 279 } as const;
/** Full-detail hero zone (BioCity, Joki, EduCity and the spaces between). */
export const HERO_ZONE = { minX: -60, maxX: 275, minZ: -80, maxZ: 150 } as const;
/** Street-detail arrival zone (station, Kalevansilta, ParkCity, Tykistökatu). */
export const ARRIVAL_ZONE = { minX: -60, maxX: 340, minZ: -260, maxZ: 150 } as const;

/** Reference points (campus frame, y on the real ground/floor). */
export const LANDMARKS = {
  biocity: [0.4, 0.06, 2.4] as V3,
  biocityPartnerEntrance: [-24.51, 0.06, -11.75] as V3,
  biocityCourtyardEntrance: [22.05, 0.25, -7.54] as V3,
  supercarRecess: [-27.6, 0.0, -17.0] as V3,
  jokiTower: [58.894, -1.1, 15.934] as V3,
  jokiStreetDoor: [8.58, -1.9, 50.94] as V3,
  jussinAukio: [55, 2.1, 0] as V3,
  educity: [212.8, 3.4, 97.6] as V3,
  educityWestEntrance: [177.8, 3.4, 115.1] as V3,
  educityEastEntrance: [204.0, 3.4, 136.5] as V3,
  educityDoorB: [237.3, 3.4, 109.0] as V3,
  kupittaaStation: [205.1, 2.9, -129.8] as V3,
  parkcity: [223.5, -0.95, -13.8] as V3,
} as const;

/** Street grids (SPEC §2.1): long-axis bearings of the two building families. */
export const GRID_BEARINGS = { biocity: 145.3, educity: 128.8, tykistokatu: 34 } as const;
