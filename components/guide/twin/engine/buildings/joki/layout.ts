import type { V2, V3 } from "../../types";
import { Y, polar, rectCorners, segDistance } from "./kit";

/**
 * Event layouts on Joki floor 1, in the J plan frame (pure data + maths,
 * unit-tested): the Aula's 33 tables 180 × 80 (TTK placement plan
 * "Joki_aula_pöytien_sijoittelu", ±0.5 m), the Cave's 42 tables in six rows
 * (Cave setup plan), chairs placed clear of every table and wall, and the
 * walking route from the BioCity passage up the ramp to the Showroom.
 */

export interface Seat {
  x: number;
  z: number;
  /** rotation.y of a chair whose front faces +z. */
  yaw: number;
}

export interface Table {
  x: number;
  z: number;
  /** Long-axis angle in the plan (radians from +x towards +z). */
  angle: number;
  length: number;
  width: number;
  seats: Seat[];
  /** 0…1 per table: who has a laptop open, etc. (deterministic). */
  seed: number;
}

/** Long axis along the slanted NW glazing of the Aula (direction (−0.278, 0.961)). */
const GLAZING_DIR: V2 = [-0.278, 0.961];
const GLAZING_ANGLE = Math.atan2(GLAZING_DIR[1], GLAZING_DIR[0]);
/** The wall shared with BioCity runs at ≈107° in the plan; tables stand perpendicular to it. */
const SHARED_WALL_ANGLE = Math.atan2(11.3, -3.5);

interface TableSpec {
  x: number;
  z: number;
  angle: number;
  /** Which long sides get chairs: "both", "a" (left of the axis = −normal), "b" (+normal). */
  sides?: "both" | "a" | "b";
}

const ALONG_X = 0;
const ALONG_Z = Math.PI / 2;

/** The Aula's 33 tables (centres from the placement plan; the three window tables re-spaced off the ramp). */
export const AULA_TABLE_SPECS: readonly TableSpec[] = [
  // Window line along the NW glazing, people facing the glass.
  ...[2.55, 4.35, 6.15].map((s) => ({ x: -2.08 - 0.278 * s, z: 16.71 + 0.961 * s, angle: GLAZING_ANGLE, sides: "a" as const })),
  // The first two rows sit 0.4–0.8 m further south than drawn, clear of the window tables.
  { x: -3.44, z: 24.05, angle: ALONG_X },
  { x: -1.14, z: 24.05, angle: ALONG_X },
  { x: -4.06, z: 26.0, angle: ALONG_X },
  { x: -1.77, z: 26.0, angle: ALONG_X },
  { x: -5.24, z: 27.99, angle: ALONG_X },
  { x: -2.9, z: 27.99, angle: ALONG_X },
  { x: -5.24, z: 30.33, angle: ALONG_X },
  { x: -2.9, z: 30.33, angle: ALONG_X },
  { x: -5.24, z: 32.12, angle: ALONG_X },
  { x: -2.9, z: 32.12, angle: ALONG_X },
  { x: 2.36, z: 33.55, angle: ALONG_X },
  { x: -7.58, z: 36.13, angle: ALONG_X },
  { x: -5.25, z: 36.13, angle: ALONG_X },
  { x: -2.92, z: 36.13, angle: ALONG_X },
  { x: -6.94, z: 38.4, angle: ALONG_X },
  { x: -4.61, z: 38.4, angle: ALONG_X },
  { x: 2.45, z: 37.33, angle: ALONG_Z },
  { x: 2.45, z: 39.66, angle: ALONG_Z },
  { x: -8.11, z: 41.31, angle: ALONG_X },
  { x: -5.77, z: 41.31, angle: ALONG_X },
  { x: -3.44, z: 41.31, angle: ALONG_X },
  { x: -1.1, z: 41.31, angle: ALONG_X },
  // Along the wall shared with BioCity, standing out from it.
  { x: -13.94, z: 38.4, angle: SHARED_WALL_ANGLE - Math.PI / 2 },
  { x: -14.54, z: 40.24, angle: SHARED_WALL_ANGLE - Math.PI / 2 },
  { x: -15.0, z: 42.19, angle: SHARED_WALL_ANGLE - Math.PI / 2 },
  { x: -15.71, z: 44.31, angle: SHARED_WALL_ANGLE - Math.PI / 2 },
  { x: -16.23, z: 46.79, angle: SHARED_WALL_ANGLE - Math.PI / 2 },
  { x: -11.07, z: 45.55, angle: ALONG_Z },
  // Drawn at (−12.24, 47.85) across the corridor from the BioCity passage — the event's main
  // way in — so it moves to the free bay north of the NW door pocket.
  { x: -8.4, z: 33.9, angle: ALONG_X },
  { x: -14.11, z: 50.68, angle: (60 * Math.PI) / 180 },
];

/** The Cave: 6 rows × 7 tables, alternating 120 × 60 / 140 × 60, rows 2.3 m apart, 3 chairs north + 2 south. */
export function caveTableSpecs(): { x: number; z: number; length: number; width: number }[] {
  const rows = [10.2, 12.5, 14.8, 17.1, 19.4, 21.7];
  const out: { x: number; z: number; length: number; width: number }[] = [];
  rows.forEach((z, r) => {
    const length = r % 2 === 0 ? 1.2 : 1.4;
    const x0 = 2.39 + 0.12 + length / 2;
    const x1 = 14.57 - 0.12 - length / 2;
    for (let i = 0; i < 7; i++) out.push({ x: x0 + ((x1 - x0) * i) / 6, z, length, width: 0.6 });
  });
  return out;
}

export interface Obstacle {
  /** Convex polygon (tables, counters) or segment walls. */
  poly?: V2[];
  a?: V2;
  b?: V2;
  /** Circle (columns). */
  c?: V2;
  r?: number;
}

function pointInConvex(p: V2, poly: V2[]): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(cross) < 1e-12) continue;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

/** Distance from a point to an obstacle (0 inside). */
export function obstacleDistance(p: V2, o: Obstacle): number {
  if (o.c && o.r !== undefined) return Math.max(0, Math.hypot(p[0] - o.c[0], p[1] - o.c[1]) - o.r);
  if (o.a && o.b) return segDistance(p, o.a, o.b);
  if (o.poly) {
    if (pointInConvex(p, o.poly)) return 0;
    let d = Infinity;
    for (let i = 0; i < o.poly.length; i++) d = Math.min(d, segDistance(p, o.poly[i], o.poly[(i + 1) % o.poly.length]));
    return d;
  }
  return Infinity;
}

/**
 * Chairs round a table: `counts` per long side (a = −normal side, b = +normal),
 * 0.36 m out from the edge, kept only where a 0.46 m chair clears every other
 * table, wall and chair by `gap`.
 */
export function seatTable(
  t: { x: number; z: number; angle: number; length: number; width: number },
  counts: { a: number; b: number },
  obstacles: Obstacle[],
  chairs: V2[],
  gap = 0.04,
): Seat[] {
  const ux = Math.cos(t.angle);
  const uz = Math.sin(t.angle);
  const nx = -uz;
  const nz = ux;
  const out: Seat[] = [];
  for (const [side, n] of [
    [-1, counts.a],
    [1, counts.b],
  ] as const) {
    for (let i = 0; i < n; i++) {
      const spread = n >= 3 ? Math.min(0.55, t.length / 2 - 0.18) : Math.min(0.45, t.length / 2 - 0.3);
      const along = n === 1 ? 0 : ((i / (n - 1)) * 2 - 1) * spread;
      const off = t.width / 2 + 0.3;
      const p: V2 = [t.x + ux * along + nx * off * side, t.z + uz * along + nz * off * side];
      const clear =
        obstacles.every((o) => obstacleDistance(p, o) > 0.23 + gap) && chairs.every((c) => Math.hypot(c[0] - p[0], c[1] - p[1]) > 0.4);
      if (!clear) continue;
      chairs.push(p);
      // Face the table: front (+z model) towards the table centre line.
      out.push({ x: p[0], z: p[1], yaw: Math.atan2(-nx * side, -nz * side) });
    }
  }
  return out;
}

/** Walls of the Aula as segments (for chair clearance): the plan outline and its pillars. */
export const AULA_OUTLINE: V2[] = [
  [-19.56, 54.49],
  [-14.5, 37.26],
  [-12.63, 37.8],
  [-10.54, 30.67],
  [-7.52, 31.56],
  [-7.89, 32.81],
  [-6.46, 32.81],
  [-6.46, 29.07],
  [-4.94, 23.89],
  [-4.85, 23.59],
  [-3.23, 18.07],
  [1.3, 18.07],
  [1.3, 23.63],
  [1.23, 23.63],
  [1.23, 27.65],
  [1.3, 27.65],
  [1.3, 31.1],
  [7.26, 31.1],
  [7.26, 44.86],
  [-10.32, 44.86],
  [-10.32, 49.11],
  [-12.82, 49.11],
  [-13.89, 52.75],
  [-13.89, 54.49],
];

/** Round columns in the Aula (centre, radius). */
export const AULA_COLUMNS: { c: V2; r: number }[] = [
  { c: [-1.75, 38.17], r: 0.3 },
  { c: [-0.8, 38.17], r: 0.3 },
  { c: [-7.6, 38.17], r: 0.13 },
  { c: [-4.8, 23.77], r: 0.13 },
  { c: [-2.65, 16.43], r: 0.13 },
];

/** Fixed furniture of the Aula that stays during the event (reception counter, round sofa). */
export const AULA_FIXTURES = {
  counter: { x0: 5.0, x1: 6.3, z0: 35.4, z1: 39.8 },
  sofa: { c: [-1.27, 38.17] as V2, r: 1.45 },
};

function outlineObstacles(poly: V2[]): Obstacle[] {
  const out: Obstacle[] = [];
  for (let i = 0; i < poly.length; i++) out.push({ a: poly[i], b: poly[(i + 1) % poly.length] });
  return out;
}

export interface Layout {
  aula: Table[];
  cave: Table[];
}

/** Both build areas, fully seated (deterministic). */
export function buildLayout(): Layout {
  const aulaRects = AULA_TABLE_SPECS.map((s) => ({ ...s, length: 1.8, width: 0.8 }));
  const fixed: Obstacle[] = [
    ...outlineObstacles(AULA_OUTLINE),
    ...AULA_COLUMNS.map((c) => ({ c: c.c, r: c.r })),
    { poly: rectCorners(5.65, 37.6, 4.4, 1.3, Math.PI / 2) },
    { c: AULA_FIXTURES.sofa.c, r: AULA_FIXTURES.sofa.r },
  ];
  const tableObs: Obstacle[] = aulaRects.map((t) => ({ poly: rectCorners(t.x, t.z, t.length, t.width, t.angle) }));
  const chairs: V2[] = [];
  const aula: Table[] = aulaRects.map((t, i) => {
    const others = tableObs.filter((_, k) => k !== i);
    const sides = t.sides ?? "both";
    const counts = sides === "both" ? { a: 3, b: 2 } : sides === "a" ? { a: 3, b: 0 } : { a: 0, b: 3 };
    const seats = seatTable(t, counts, [...fixed, ...others], chairs);
    // A table whose three-chair side was blocked gets its chairs on the other side.
    if (sides === "both" && seats.length < 3) seats.push(...seatTable(t, { a: 0, b: 3 - seats.length > 0 ? 1 : 0 }, [...fixed, ...others], chairs));
    return { x: t.x, z: t.z, angle: t.angle, length: t.length, width: t.width, seats, seed: (i * 0.6180339887) % 1 };
  });
  const caveSpecs = caveTableSpecs();
  const caveWalls: Obstacle[] = outlineObstacles([
    [1.59, 8.75],
    [14.67, 8.75],
    [14.67, 24.2],
    [1.59, 24.2],
  ]);
  const caveObs: Obstacle[] = caveSpecs.map((t) => ({ poly: rectCorners(t.x, t.z, t.length, t.width, 0) }));
  const caveChairs: V2[] = [];
  const cave: Table[] = caveSpecs.map((t, i) => {
    const seats = seatTable({ ...t, angle: 0 }, { a: 3, b: 2 }, [...caveWalls, ...caveObs.filter((_, k) => k !== i)], caveChairs);
    return { x: t.x, z: t.z, angle: 0, length: t.length, width: t.width, seats, seed: (i * 0.7548776662) % 1 };
  });
  return { aula, cave };
}

// ── Showroom counters (SPEC §7.2) ────────────────────────────────────────────

/** Counter J-bearings, in order from the entrance (Meyer Turku … Bayer). */
export const COUNTER_BEARINGS: readonly number[] = [186.7, 218, 250, 281, 312, 341];
/** Counter centre radius: back 0.6 m in front of the LED wall (r 8.45). */
export const COUNTER_R = 7.55;

export function counterPose(i: number): { x: number; z: number; yaw: number; bearing: number } {
  const b = COUNTER_BEARINGS[i];
  const [x, z] = polar(COUNTER_R, b);
  // Front (+z model) faces the room centre.
  return { x, z, yaw: Math.atan2(-x, -z), bearing: b };
}

// ── The route from the BioCity passage to the Showroom (DESIGN §12) ─────────

/**
 * int-joki-aula-to-showroom in the J frame: from the foot of the BioCity
 * passage stair (first point as in routes.json), along the corridor by the
 * shared wall, through the aisle between the table blocks and the round
 * sofa, up the clear lane by the Cave wall to the ramp, up the ramp (+0.6 m)
 * and into the round Showroom (last point as in routes.json).
 */
export const ROUTE_J: readonly V3[] = [
  [-17.64, Y.aula, 49.65],
  [-15.2, Y.aula, 48.95],
  [-13.25, Y.aula, 47.6],
  [-12.9, Y.aula, 43.35],
  [-9.6, Y.aula, 43.2],
  [0.6, Y.aula, 43.25],
  [0.65, Y.aula, 35.5],
  [0.6, Y.aula, 31.0],
  [0.45, Y.aula, 25.5],
  [0.3, Y.aula, 18.6],
  [0.35, -1.42, 13.4],
  [0.4, Y.f1, 8.75],
  [0.6, Y.f1, 6.4],
  [-1.2, Y.f1, 3.3],
  [-3.5, Y.f1, 1.0],
];

/** Clearance of a polyline from obstacles (min distance over sampled points). */
export function polylineClearance(points: readonly V2[], obstacles: Obstacle[], step = 0.1): number {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k <= n; k++) {
      const p: V2 = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
      for (const o of obstacles) best = Math.min(best, obstacleDistance(p, o));
    }
  }
  return best;
}

/** Obstacles a walker meets on floor 1 (tables + seated chairs + fixed furniture). */
export function floor1Obstacles(layout: Layout): Obstacle[] {
  const out: Obstacle[] = [];
  for (const t of [...layout.aula, ...layout.cave]) {
    out.push({ poly: rectCorners(t.x, t.z, t.length, t.width, t.angle) });
    for (const s of t.seats) out.push({ c: [s.x, s.z], r: 0.25 });
  }
  out.push({ poly: rectCorners(5.65, 37.6, 4.4, 1.3, Math.PI / 2) });
  out.push({ c: AULA_FIXTURES.sofa.c, r: AULA_FIXTURES.sofa.r });
  for (const c of AULA_COLUMNS) out.push({ c: c.c, r: c.r });
  return out;
}
