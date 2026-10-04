import type { V2, V3 } from "../../types";
import { PLAN_FRAMES, planToLocal } from "../../frame";

/**
 * EduCity plan frame "E" (SPEC §1.3, §3.3): metres, origin = the outer north
 * corner of the main block, +x along the north-east facade towards the east
 * corner (compass 129°), +z towards the south-west (the entrance pavilion),
 * y_E = 0 at the floor-1 lobby = the deck level (campus y 3.40).
 *
 * Everything EduCity builds is authored in this frame inside one group
 * (rotation.y = −θ, position (tx, 3.40, tz)); this file converts the few
 * things the engine needs in the campus frame (views, targets, walk data).
 * Pure maths — unit-tested.
 */

export const E = PLAN_FRAMES.E;

/** Campus y of y_E = 0 (floor 1, the lobby and the campus deck). */
export const Y0 = E.y0;

/** Floor levels (y_E). The street storey on Joukahaisenkatu is 5 m below the lobby. */
export const LEVEL = {
  street: -5.0,
  f1: 0,
  f2: 5.0,
  f3: 9.0,
  f4: 13.0,
  f5: 17.0,
  f6: 21.0,
  roof: 25.0,
  /** Top of the brick parapet coping (LOD2 52.64 N2000). */
  parapet: 26.04,
  /** Plant room roof (LOD2 60.54 N2000). */
  plantTop: 33.94,
} as const;

/** Storey floors from floor 1 up (y_E) and the storey height above each. */
export const STOREYS: { floor: number; height: number }[] = [
  { floor: LEVEL.f1, height: 5 },
  { floor: LEVEL.f2, height: 4 },
  { floor: LEVEL.f3, height: 4 },
  { floor: LEVEL.f4, height: 4 },
  { floor: LEVEL.f5, height: 4 },
  { floor: LEVEL.f6, height: 4 },
];

/** Main block (x 0…51.8, z 0…65.2) and the single-storey entrance pavilion on its south-west side. */
export const BLOCK = { w: 51.8, d: 65.2 } as const;
export const PAVILION = {
  /** Roof / canopy outline (LOD2). */
  x0: 4.0,
  x1: 48.5,
  z0: 65.2,
  z1: 80.2,
  /** Glass lines under the canopy (CAD annex x 5.4 / 47.1, solid south-west wall at z 80.05). */
  glassNW: 5.4,
  glassSE: 47.1,
  wallSW: 80.05,
  /** Roof top (LOD2 31.81 N2000) and the 1.3 m brushed-aluminium fascia under it. */
  roof: 5.21,
  fascia: 1.3,
} as const;

const RAD = Math.PI / 180;
const COS = Math.cos(E.theta * RAD);
const SIN = Math.sin(E.theta * RAD);

/** E (x, z) → campus (x, z). */
export function eToLocal(x: number, z: number): V2 {
  return planToLocal(E, x, z);
}

/** E (x, y_E, z) → campus (x, y, z). */
export function eToLocal3(x: number, y: number, z: number): V3 {
  const [lx, lz] = eToLocal(x, z);
  return [round3(lx), round3(y + Y0), round3(lz)];
}

/** Campus (x, z) → E (x, z). */
export function localToE(x: number, z: number): V2 {
  const dx = x - E.tx;
  const dz = z - E.tz;
  return [dx * COS + dz * SIN, -dx * SIN + dz * COS];
}

/** A direction (dx, dz) in E → campus. */
export function eDir(dx: number, dz: number): V2 {
  return [dx * COS - dz * SIN, dx * SIN + dz * COS];
}

/** Compass bearing of an E direction (dx, dz). */
export function eBearing(dx: number, dz: number): number {
  const [x, z] = eDir(dx, dz);
  return ((Math.atan2(x, -z) / RAD) % 360 + 360) % 360;
}

const round3 = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Top of the brick mantle (y_E) — one inclined plane cut through the whole
 * block, flat (parapet) where it rises above the roof (SPEC §3.3.2, from the
 * architect's south-east elevation and the terrace levels):
 * y_top = min(26.04, 65.2 − 0.726·z − 0.245·x).
 */
export function brickTop(x: number, z: number): number {
  return Math.min(LEVEL.parapet, 65.2 - 0.726 * z - 0.245 * x);
}

/** A rectangle in plan (E metres). */
export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export const rect = (x0: number, x1: number, z0: number, z1: number): Rect => ({ x0, x1, z0, z1 });

export const inRect = (r: Rect, x: number, z: number, pad = 0) =>
  x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad;

/** Rectangle corners (E) counter-clockwise seen from above in the campus frame. */
export function rectRing(r: Rect): V2[] {
  // In E, +x → 129° and +z → 219°: (x0,z0)→(x0,z1)→(x1,z1)→(x1,z0) runs counter-clockwise from above.
  return [
    [r.x0, r.z0],
    [r.x0, r.z1],
    [r.x1, r.z1],
    [r.x1, r.z0],
  ];
}

/** An E ring → campus ring. */
export const ringToLocal = (ring: readonly V2[]): V2[] => ring.map(([x, z]) => eToLocal(x, z));

/**
 * Massing of the main block above floor 1 (LOD2 roof parts, axis-aligned in
 * E — SPEC §3.3.2): each cell is a roof or terrace at `top` (y_E). The
 * atrium cell has the sloped glass roof instead; the plant room stands on the
 * cells marked `plant`.
 */
export interface MassCell extends Rect {
  top: number;
  kind: "roof" | "terrace" | "atrium";
  /** Plant room (to LEVEL.plantTop) on this roof. */
  plant?: boolean;
  /** Surface of a terrace. */
  surface?: "sedum" | "deck" | "membrane";
  name: string;
}

export const MASS: readonly MassCell[] = [
  { ...rect(0, 51.8, 0, 6.4), top: LEVEL.roof, kind: "roof", surface: "membrane", name: "north-east roof strip" },
  { ...rect(0, 51.8, 6.4, 17.2), top: LEVEL.roof, kind: "roof", plant: true, name: "plant room, north-east bar" },
  { ...rect(0, 18.4, 17.2, 49.35), top: LEVEL.roof, kind: "roof", plant: true, name: "plant room, north-west arm" },
  { ...rect(33.7, 51.8, 17.2, 30.5), top: LEVEL.roof, kind: "roof", plant: true, name: "plant room, south-east arm" },
  { ...rect(18.4, 33.7, 17.2, 49.35), top: 13.2, kind: "atrium", name: "atrium" },
  { ...rect(0, 18.4, 49.35, 54.4), top: 25.1, kind: "terrace", surface: "sedum", name: "north-west terrace 3" },
  { ...rect(0, 18.4, 54.4, 59.75), top: 21.1, kind: "terrace", surface: "sedum", name: "north-west terrace 2" },
  { ...rect(0, 18.4, 59.75, 65.2), top: 17.1, kind: "terrace", surface: "sedum", name: "north-west terrace 1" },
  { ...rect(33.7, 51.8, 30.5, 36.7), top: 25.1, kind: "terrace", surface: "sedum", name: "south-east terrace 3" },
  { ...rect(33.7, 51.8, 36.7, 41.9), top: 21.1, kind: "terrace", surface: "sedum", name: "south-east terrace 2" },
  { ...rect(33.7, 51.8, 41.9, 49.35), top: 17.1, kind: "terrace", surface: "sedum", name: "south-east terrace 1" },
  { ...rect(18.4, 51.8, 49.35, 54.4), top: 13.2, kind: "terrace", surface: "sedum", name: "terrace R" },
  { ...rect(18.4, 33.7, 54.4, 65.2), top: 13.2, kind: "terrace", surface: "sedum", name: "terrace R, south" },
  { ...rect(33.7, 51.8, 54.4, 59.75), top: 9.1, kind: "terrace", surface: "deck", name: "south corner terrace" },
  { ...rect(33.7, 51.8, 59.75, 65.2), top: 5.2, kind: "terrace", surface: "deck", name: "floor-2 terrace (TERASSI)" },
];

/** Atrium glass roof: 28.39 at z 17.2 down to 13.22 at z 49.3 (25°), over x 18.4…33.7. */
export const ATRIUM_ROOF = { x0: 18.4, x1: 33.7, z0: 17.2, z1: 49.35, y0: 28.39, y1: 13.22 } as const;

/** Height of the atrium glass at z (y_E). */
export function atriumRoofY(z: number): number {
  const t = (z - ATRIUM_ROOF.z0) / (ATRIUM_ROOF.z1 - ATRIUM_ROOF.z0);
  return ATRIUM_ROOF.y0 + (ATRIUM_ROOF.y1 - ATRIUM_ROOF.y0) * Math.min(1, Math.max(0, t));
}

/** Top of the building volume at (x, z) inside the main block (y_E): roof, terrace or atrium glass. */
export function massTop(x: number, z: number): number {
  for (const c of MASS) {
    if (x >= c.x0 && x <= c.x1 && z >= c.z0 && z <= c.z1) {
      if (c.kind === "atrium") return atriumRoofY(z);
      return c.top;
    }
  }
  return LEVEL.f2;
}

/** The floor-1 → floor-2 Taidon portaat seating stair (SPEC §7.4): 16.2 m wide, rising north. */
export const TAIDON = { x0: 17.76, x1: 34.0, zFoot: 44.0, zTop: 35.3 } as const;

/** Glazed link bridges to ICT-City over the 12 m gateway (SPEC §3.3.2), in E. */
export const BRIDGES = {
  x0: -12.2,
  x1: 0,
  z0: 30.87,
  z1: 34.45,
  lower: { floor: 0, roof: 4.0, under: -0.8 },
  upper: { floor: 13.0, roof: 17.0, under: 12.2 },
} as const;

/** Outdoor Main Stairs at the east corner (Joukahaisenkatu → south-east walkway) and the walkway. */
export const MAIN_STAIRS = { x0: 52.0, x1: 58.0, zFoot: -0.9, zTop: 14.2, yFoot: -5.2, yTop: 0 } as const;
export const SE_WALKWAY = { x0: 51.8, x1: 58.0, z0: 14.2, z1: 80.2 } as const;
