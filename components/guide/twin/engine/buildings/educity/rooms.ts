import type { V2 } from "../../types";
import { type Rect, rect } from "./frame";

/**
 * EduCity floors 1–2 in the E frame (SPEC §7.4; TUAS wayfinding maps scaled
 * to OSM, ±0.3–0.5 m; doors from the Since AI event maps). Rooms are plan
 * polygons; `door` is the door centre on the wall named by `side` (the
 * corridor side), `sign` where the door sign hangs.
 */

export type LevelKey = "f1" | "f2";

export interface BriefingRoom {
  /** Room number as in lib/hackathon-2026/companies.ts (briefing.room). */
  number: string;
  name?: string;
  level: LevelKey;
  polygon: V2[];
  /** Door centre (on the polygon edge) and the direction the corridor lies in (E unit vector). */
  door: V2;
  out: V2;
  /** Glass partitions towards the corridor (the central pop-up boxes), else solid walls. */
  glass?: boolean;
  /** Open plan (2072): no walls, a sign totem instead of a door. */
  open?: boolean;
  /** Label offset [up, along z] from the room's centre (neighbours in a row are staggered). */
  labelOffset?: [number, number];
}

const poly = (r: Rect): V2[] => [
  [r.x0, r.z0],
  [r.x0, r.z1],
  [r.x1, r.z1],
  [r.x1, r.z0],
];

export const BRIEFING_ROOMS: BriefingRoom[] = [
  // ── Floor 1: along the north-east facade and the glass pop-up box (event map "1. kerros") ──
  { number: "1001", name: "Dromberg", level: "f1", polygon: poly(rect(0.45, 17.5, 0.45, 8.5)), door: [8.3, 8.5], out: [0, 1] },
  { number: "1002", name: "Moriaberg", level: "f1", polygon: poly(rect(17.5, 39.4, 0.45, 8.5)), door: [26.7, 8.5], out: [0, 1] },
  { number: "1090", name: "Ringsberg", level: "f1", polygon: poly(rect(17.5, 34.1, 10.2, 16.56)), door: [19.85, 10.2], out: [0, -1], glass: true },
  { number: "1091", name: "Hammarbacka", level: "f1", polygon: poly(rect(17.5, 34.1, 16.56, 24.8)), door: [19.85, 24.8], out: [0, 1], glass: true },
  // ── Floor 2 (event map "2. kerros") ──
  { number: "2001", name: "Elias", level: "f2", polygon: poly(rect(0.45, 12.38, 0.45, 8.58)), door: [8.1, 8.58], out: [0, 1] },
  { number: "2002", name: "Ivar", level: "f2", polygon: poly(rect(12.38, 22.34, 0.45, 8.58)), door: [18.3, 8.58], out: [0, 1], labelOffset: [-1.2, 2.6] },
  { number: "2003", name: "Erik", level: "f2", polygon: poly(rect(22.34, 32.07, 0.45, 8.58)), door: [27.7, 8.58], out: [0, 1] },
  { number: "2004", name: "Johannes", level: "f2", polygon: poly(rect(32.07, 42.5, 0.45, 8.58)), door: [38.1, 8.58], out: [0, 1], labelOffset: [-1.2, 2.6] },
  { number: "2067", level: "f2", polygon: poly(rect(0.45, 7.4, 8.58, 20.7)), door: [7.4, 11.0], out: [1, 0] },
  {
    number: "2006 / 2007",
    level: "f2",
    polygon: [
      [44.2, 8.9],
      [44.2, 20.7],
      [51.35, 20.7],
      [51.35, 5.4],
      [46.0, 5.4],
      [46.0, 8.9],
    ],
    door: [44.2, 12.0],
    out: [-1, 0],
  },
  {
    // Open work café: no walls — a sign totem at the top of Taidon portaat instead of a door.
    number: "2072",
    name: "Työkahvila / Aurinkokylpy",
    level: "f2",
    polygon: poly(rect(14.15, 37.2, 16.8, 35.3)),
    door: [19.2, 34.4],
    out: [0, 1],
    open: true,
  },
  {
    number: "2026",
    name: "Orvokki",
    level: "f2",
    polygon: [
      [34.21, 41.2],
      [34.21, 48.7],
      [51.35, 48.7],
      [51.35, 36.6],
      [46.0, 36.6],
      [46.0, 35.53],
      [42.6, 35.53],
      [42.6, 41.2],
    ],
    door: [44.3, 35.53],
    out: [0, -1],
  },
  {
    number: "2029 / 2031",
    level: "f2",
    polygon: [
      [14.23, 45.42],
      [14.23, 55.21],
      [34.93, 55.21],
      [34.93, 48.9],
      [17.6, 48.9],
      [17.6, 45.42],
    ],
    door: [14.23, 50.0],
    out: [-1, 0],
  },
  { number: "2030", name: "Evert", level: "f2", polygon: poly(rect(9.16, 20.74, 56.84, 64.75)), door: [13.3, 56.84], out: [0, -1] },
  { number: "2027", name: "Frans", level: "f2", polygon: poly(rect(24.5, 34.78, 56.84, 64.75)), door: [25.2, 56.84], out: [0, -1] },
];

/** Closed blocks (WCs, small rooms, cores) drawn as plain walls; not furnished. */
export const BLOCKS: Record<LevelKey, Rect[]> = {
  f1: [
    rect(0.35, 7.26, 8.8, 16.36), // 1089 Maskulin
    rect(9.19, 12.78, 10.43, 22.99), // rooms 1081–1087
    rect(9.19, 12.78, 24.95, 30.72), // WC
    rect(39.57, 43.09, 10.43, 23.15), // rooms 1008–1017 / WC
    rect(39.6, 43.34, 0.35, 8.37), // 1003 a/b
    rect(46.16, 51.46, 5.55, 8.66), // 1005
    rect(46.16, 51.46, 9.04, 21.69), // 1006–1007 (test room)
    rect(39.57, 43.09, 37.7, 43.82), // WC east
    rect(39.3, 43.3, 48.2, 61.4), // service centre
    rect(46.16, 51.46, 36.65, 64.81), // services K/L/M
    rect(0.35, 10.94, 34.62, 55.49), // Kisälli kitchen
    rect(0.35, 5.7, 59.9, 65.0), // SW stair
    rect(0.13, 5.7, 24.7, 30.9), // W stair
    rect(45.9, 51.8, 24.6, 30.9), // E stair
    rect(45.85, 51.8, 0.14, 5.34), // NE stair
    rect(0.35, 5.33, 34.27, 37.48), // W lifts
    rect(46.2, 51.01, 34.43, 36.27), // E lifts
  ],
  f2: [
    rect(14.2, 37.1, 10.1, 16.67), // 2068–2070
    rect(14.23, 17.6, 35.41, 40.99), // 2049
    rect(14.32, 19.32, 41.35, 45.09), // 2048 Lyyli
    rect(34.24, 37.07, 35.53, 41.05), // 2023
    rect(37.43, 42.53, 35.53, 41.05), // 2024
    rect(0.27, 7.11, 43.4, 48.46), // 2042
    rect(0.27, 5.67, 52.23, 59.92), // 2033
    rect(21.07, 24.17, 56.84, 64.98), // 2028
    rect(38.85, 42.53, 27.25, 30.92), // 2018
    rect(9.19, 12.78, 10.43, 22.99), // WC / small rooms west
    rect(9.19, 12.78, 26.0, 31.5), // WC
    rect(39.57, 43.09, 10.43, 23.15), // WC / small rooms east
    rect(0.13, 5.7, 24.7, 30.9), // W stair
    rect(45.9, 51.8, 24.6, 30.9), // E stair
    rect(45.85, 51.8, 0.14, 5.34), // NE stair
    rect(0.27, 5.33, 34.6, 37.55), // W lifts
    rect(46.26, 51.12, 34.51, 36.38), // E lifts
    rect(0.27, 5.8, 59.9, 65.0), // SW stair
  ],
};

/** Event points (SPEC §7.4 / §6.3, E frame). */
export const POINTS = {
  registration: [36.8, 54.0] as V2,
  teamFormation: [29.9, 31.5] as V2,
  teamZone: rect(18.0, 34.0, 25.2, 34.6),
  snacks: [15.0, 50.0] as V2,
  stage: rect(21.53, 31.01, 44.71, 47.34),
  /** The screen ("sermi") behind the stage, Kisälli behind it. */
  screen: { a: [18.17, 47.6] as V2, b: [34.91, 47.2] as V2 },
  kisalli: rect(13.0, 39.3, 47.5, 64.95),
  kaivo: { c: [28.95, 25.76] as V2, r: 2.7 },
  info: rect(39.57, 43.06, 34.59, 37.32),
} as const;

/** Room behind a facade point at a level, if furnished in the twin (exterior uses clear glass there). */
export function modelledRoomAt(level: LevelKey, x: number, z: number): BriefingRoom | null {
  for (const r of BRIEFING_ROOMS) {
    if (r.level !== level || r.open) continue;
    if (pointIn([x, z], r.polygon)) return r;
  }
  return null;
}

export function pointIn(p: V2, ring: readonly V2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Bounding rectangle of a plan polygon. */
export function polygonRect(poly: readonly V2[]): Rect {
  const xs = poly.map((p) => p[0]);
  const zs = poly.map((p) => p[1]);
  return rect(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs));
}

/** A representative inside point of a room (largest rectangle's centre for L-shapes). */
export function centroidOf(room: BriefingRoom): V2 {
  const r = mainRect(room);
  return [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
}

/** The largest axis-aligned rectangle of a room polygon (rooms are rectangles or Ls). */
export function mainRect(room: BriefingRoom): Rect {
  const bb = polygonRect(room.polygon);
  if (room.polygon.length === 4) return bb;
  // L-shape: try the candidate rectangles from the polygon's coordinates.
  const xs = [...new Set(room.polygon.map((p) => p[0]))].sort((a, b) => a - b);
  const zs = [...new Set(room.polygon.map((p) => p[1]))].sort((a, b) => a - b);
  let best = bb;
  let bestArea = 0;
  for (let i = 0; i < xs.length; i++)
    for (let j = i + 1; j < xs.length; j++)
      for (let k = 0; k < zs.length; k++)
        for (let l = k + 1; l < zs.length; l++) {
          const r = rect(xs[i], xs[j], zs[k], zs[l]);
          const corners: V2[] = [
            [r.x0 + 0.01, r.z0 + 0.01],
            [r.x1 - 0.01, r.z0 + 0.01],
            [r.x1 - 0.01, r.z1 - 0.01],
            [r.x0 + 0.01, r.z1 - 0.01],
            [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2],
          ];
          if (!corners.every((c) => pointIn(c, room.polygon))) continue;
          const a = (r.x1 - r.x0) * (r.z1 - r.z0);
          if (a > bestArea) {
            bestArea = a;
            best = r;
          }
        }
  return best;
}

