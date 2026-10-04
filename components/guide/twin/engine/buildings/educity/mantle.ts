import type { V2 } from "../../types";
import { BLOCK, BRIDGES, STOREYS, massTop } from "./frame";
import { DOOR_B, facadeLength, facadeTop, type Facade, type WindowSpec } from "./data";
import { Bucket, quadN, type Vec3, wallPlane } from "./geom";

/**
 * The brick mantle (SPEC §3.3.2–3): four facade walls 0.45 m thick, cut at the
 * top by one inclined plane, punched by the square windows — brick reveals
 * 0.14 m deep, black-bronze frames with a 70 mm sightline, glass, a dark sill
 * flashing — and, where floors step back behind it, standing free as a screen
 * wall with open square holes in front of the terraces.
 */

export const WALL = 0.45;
const REVEAL = 0.14;
const FRAME_DEPTH = 0.1;
const SIGHT = 0.07;
const GLASS_DEPTH = REVEAL + 0.05;

export interface FacadeFrame {
  f: Facade;
  /** Plan point at s = 0 on the outer face. */
  o: V2;
  /** Unit plan vector along s. */
  sAxis: V2;
  /** Unit plan vector into the building. */
  inAxis: V2;
  /** +1 when "right, seen from outside" is +s. */
  rs: 1 | -1;
  len: number;
}

export const FACADES: Record<Facade, FacadeFrame> = {
  NE: { f: "NE", o: [0, 0], sAxis: [1, 0], inAxis: [0, 1], rs: -1, len: BLOCK.w },
  SE: { f: "SE", o: [BLOCK.w, 0], sAxis: [0, 1], inAxis: [-1, 0], rs: -1, len: BLOCK.d },
  SW: { f: "SW", o: [0, BLOCK.d], sAxis: [1, 0], inAxis: [0, -1], rs: 1, len: BLOCK.w },
  NW: { f: "NW", o: [0, 0], sAxis: [0, 1], inAxis: [1, 0], rs: 1, len: BLOCK.d },
};

/** Plan → 3D point of facade coordinates (s along, y up, d into the building). */
export function fp(F: FacadeFrame, s: number, y: number, d: number): Vec3 {
  return [F.o[0] + F.sAxis[0] * s + F.inAxis[0] * d, y, F.o[1] + F.sAxis[1] * s + F.inAxis[1] * d];
}

export const outward = (F: FacadeFrame): Vec3 => [-F.inAxis[0], 0, -F.inAxis[1]];
const inward = (F: FacadeFrame): Vec3 => [F.inAxis[0], 0, F.inAxis[1]];
const sDir = (F: FacadeFrame, sign: number): Vec3 => [F.sAxis[0] * sign, 0, F.sAxis[1] * sign];

/** Bottom of the brick along a facade (y_E): street storey, walkway, pavilion roof. */
export function brickBase(f: Facade, s: number): number {
  switch (f) {
    case "NE":
      return s > 0.7 && s < 44.5 ? -0.35 : -5.3;
    case "SE":
      return s < 14.2 ? -5.3 : -0.3;
    case "SW":
      return s > 4.0 && s < 48.5 ? 5.16 : -0.3;
    case "NW":
      return -5.3;
  }
}

/** Breakpoints along a facade where the base steps or the top kinks. */
function breaks(f: Facade): number[] {
  const len = facadeLength(f);
  const pts = new Set<number>([0, len]);
  if (f === "NE") [0.7, 44.5].forEach((v) => pts.add(v));
  if (f === "SE") [14.2, 36.46].forEach((v) => pts.add(v));
  if (f === "SW") [4.0, 48.5].forEach((v) => pts.add(v));
  if (f === "NW") pts.add(53.94);
  return [...pts].sort((a, b) => a - b);
}

/** Outline of the outer face in (s, y): base steps along the bottom, the sloped top. */
export function facadeOutline(f: Facade): V2[] {
  const bs = breaks(f);
  const bottom: V2[] = [];
  for (let i = 0; i < bs.length - 1; i++) {
    const mid = (bs[i] + bs[i + 1]) / 2;
    const y = brickBase(f, mid);
    bottom.push([bs[i], y], [bs[i + 1], y]);
  }
  const top: V2[] = bs
    .slice()
    .reverse()
    .map((s) => [s, facadeTop(f, s)] as V2);
  // Drop duplicate consecutive points (the steps share s).
  const out: V2[] = [];
  for (const p of [...bottom, ...top]) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6) out.push(p);
  }
  return out;
}

/** Rectangular openings that are not windows (doors, bridges). */
export function doorOpenings(f: Facade): { s0: number; s1: number; y0: number; y1: number; kind: string }[] {
  if (f === "SE")
    return [
      { s0: DOOR_B.z0, s1: DOOR_B.z1, y0: 0, y1: DOOR_B.top, kind: "portal" },
      { s0: DOOR_B.side.z0, s1: DOOR_B.side.z1, y0: 0, y1: DOOR_B.side.top, kind: "side" },
    ];
  if (f === "NW")
    return [
      { s0: BRIDGES.z0 + 0.25, s1: BRIDGES.z1 - 0.25, y0: BRIDGES.lower.floor, y1: BRIDGES.lower.roof - 0.4, kind: "bridge" },
      { s0: BRIDGES.z0 + 0.25, s1: BRIDGES.z1 - 0.25, y0: BRIDGES.upper.floor, y1: BRIDGES.upper.roof - 0.4, kind: "bridge" },
      { s0: 31.5, s1: 34.0, y0: -5.0, y1: -2.35, kind: "gateway" },
    ];
  return [];
}

export interface MantleBuckets {
  brick: Bucket;
  frame: Bucket;
  /** Interior-mapped glass (always). */
  glass: Bucket;
  /** Interior-mapped glass of windows in front of furnished rooms (shown while the interior is off). */
  glassStandIn: Bucket;
  /** Clear glass of the same windows (shown while the interior is on). */
  glassClear: Bucket;
  /** Plaster inner reveals/faces at floors 1–2 (interior). */
  innerF1: Bucket;
  innerF2: Bucket;
}

export interface WindowInfo extends WindowSpec {
  /** Room behind is furnished (floor 1 or 2): clear glass while the interior is shown. */
  clear: boolean;
}

/** Storey that contains a height (y_E) — the street storey below floor 1. */
export function storeyAt(y: number): { floor: number; height: number } {
  if (y < 0) return { floor: -5, height: 5 };
  for (let i = STOREYS.length - 1; i >= 0; i--) if (y >= STOREYS[i].floor) return STOREYS[i];
  return STOREYS[0];
}

/** Room kind behind a facade point for the window shader (stairs show no desks). */
function windowKind(f: Facade, s: number): number {
  if (f === "NE" && s > 45.85) return 1;
  if (f === "SE" && s > 24.6 && s < 30.9) return 1;
  if (f === "NW" && ((s > 24.7 && s < 30.9) || s > 59.9)) return 1;
  return 0;
}

/** Build the four facade walls with their windows. */
export function buildMantle(b: MantleBuckets, windows: WindowInfo[]): void {
  for (const f of ["NE", "SE", "SW", "NW"] as Facade[]) {
    const F = FACADES[f];
    const mine = windows.filter((w) => w.facade === f);
    const doors = doorOpenings(f);
    const outline = facadeOutline(f);
    const holeRects = [
      ...mine.map((w) => ({ s0: w.s - w.size / 2, s1: w.s + w.size / 2, y0: w.y - w.size / 2, y1: w.y + w.size / 2 })),
      ...doors,
    ];
    const holes = holeRects.map((h) => [
      [h.s0, h.y0],
      [h.s1, h.y0],
      [h.s1, h.y1],
      [h.s0, h.y1],
    ] as V2[]);
    // Outer face (brick). wallPlane: normal on the left of s-travel for NE/SE, on the right for SW/NW.
    const a = F.o;
    const e: V2 = [F.o[0] + F.sAxis[0] * F.len, F.o[1] + F.sAxis[1] * F.len];
    wallPlane(b.brick, a, e, outline, holes, f === "NE" || f === "SE");

    for (const w of mine) emitWindow(b, F, w);
    for (const d of doors) {
      // Reveals of door openings and bridge junctions (full depth, brick).
      revealRing(b.brick, F, d.s0, d.s1, d.y0, d.y1, 0, d.kind === "portal" ? DOOR_B.depth : WALL, false);
    }
    emitScreenInnerFace(b.brick, F, mine);
    emitInnerFaces(b, F, mine, doors);
  }
}

/** One window: reveals, frame, glass, sill — or a full-depth hole in a screen wall. */
function emitWindow(b: MantleBuckets, F: FacadeFrame, w: WindowInfo): void {
  const s0 = w.s - w.size / 2;
  const s1 = w.s + w.size / 2;
  const y0 = w.y - w.size / 2;
  const y1 = w.y + w.size / 2;
  if (w.open) {
    revealRing(b.brick, F, s0, s1, y0, y1, 0, WALL, true);
    return;
  }
  revealRing(b.brick, F, s0, s1, y0, y1, 0, REVEAL, false);
  // Sill flashing (dark metal) projecting 35 mm, covering the bottom reveal.
  const n = outward(F);
  const sill = (sa: number, sb: number, ya: number, yb: number, da: number, db: number) => box3(b.frame, F, sa, sb, ya, yb, da, db);
  sill(s0 - 0.02, s1 + 0.02, y0 - 0.005, y0 + 0.025, -0.035, REVEAL);
  // Frame ring (front face + inner edges).
  const fa = REVEAL;
  const fb = REVEAL + FRAME_DEPTH;
  const bars: [number, number, number, number][] = [
    [s0, s1, y1 - SIGHT, y1],
    [s0, s1, y0, y0 + SIGHT],
    [s0, s0 + SIGHT, y0 + SIGHT, y1 - SIGHT],
    [s1 - SIGHT, s1, y0 + SIGHT, y1 - SIGHT],
  ];
  for (const [sa, sb, ya, yb] of bars) box3(b.frame, F, sa, sb, ya, yb, fa, fb, { back: false });
  // Glass: interior-mapped (always or as a stand-in) and clear where the room is furnished.
  const g0 = s0 + SIGHT;
  const g1 = s1 - SIGHT;
  const h0 = y0 + SIGHT;
  const h1 = y1 - SIGHT;
  const st = storeyAt(h0 + 0.05);
  const seed = fract(Math.sin(w.s * 12.9898 + w.y * 78.233 + F.len) * 43758.5453);
  const glassBuckets = w.clear ? [b.glassStandIn] : [b.glass];
  for (const gb of glassBuckets) {
    glassQuad(gb, F, g0, g1, h0, h1, GLASS_DEPTH, [st.floor - h0, st.height, seed, windowKind(F.f, w.s)]);
  }
  if (w.clear) {
    const p = [fp(F, g0, h0, GLASS_DEPTH), fp(F, g1, h0, GLASS_DEPTH), fp(F, g1, h1, GLASS_DEPTH), fp(F, g0, h1, GLASS_DEPTH)] as [Vec3, Vec3, Vec3, Vec3];
    quadN(b.glassClear, p, n, [
      [g0, h0],
      [g1, h0],
      [g1, h1],
      [g0, h1],
    ]);
    // Inner reveals (plaster) from the frame back to the inner face.
    const inner = w.y < 4.6 ? b.innerF1 : b.innerF2;
    revealRing(inner, F, s0, s1, y0, y1, fb, WALL, true);
  }
}

const fract = (v: number) => v - Math.floor(v);

/** Window glass quad with the shader attributes (lx from the left seen from outside). */
function glassQuad(b: Bucket, F: FacadeFrame, s0: number, s1: number, y0: number, y1: number, d: number, info: [number, number, number, number]): void {
  const n = outward(F);
  const w = s1 - s0;
  const h = y1 - y0;
  const lx = (s: number) => (F.rs > 0 ? s - s0 : s1 - s);
  const corners: [number, number][] = [
    [s0, y0],
    [s1, y0],
    [s1, y1],
    [s0, y1],
  ];
  const pts = corners.map(([s, y]) => fp(F, s, y, d));
  // Emit two triangles with per-vertex window data.
  const order = F.rs > 0 ? [0, 1, 2, 0, 2, 3] : [1, 0, 3, 1, 3, 2];
  b.set("aWinB", info);
  for (const i of order) {
    const [s, y] = corners[i];
    b.set("aWinA", [lx(s), y - y0, w, h]);
    b.vertex(pts[i], n, [F.rs * s, y]);
  }
}

/**
 * Reveal of a rectangular opening between depths da and db: jambs, head and
 * sill faces pointing into the opening. `withSill` false leaves the sill to
 * the flashing.
 */
export function revealRing(b: Bucket, F: FacadeFrame, s0: number, s1: number, y0: number, y1: number, da: number, db: number, withSill: boolean): void {
  // Jambs: at s0 facing +s, at s1 facing −s. UV: u = depth, v = y.
  const jamb = (s: number, sign: number) => {
    const p = [fp(F, s, y0, da), fp(F, s, y0, db), fp(F, s, y1, db), fp(F, s, y1, da)] as [Vec3, Vec3, Vec3, Vec3];
    quadN(b, p, sDir(F, sign), [
      [da, y0],
      [db, y0],
      [db, y1],
      [da, y1],
    ]);
  };
  jamb(s0, 1);
  jamb(s1, -1);
  // Head (facing down) and sill (facing up). UV: u = along, v = depth.
  const flat = (y: number, up: boolean) => {
    const p = [fp(F, s0, y, da), fp(F, s1, y, da), fp(F, s1, y, db), fp(F, s0, y, db)] as [Vec3, Vec3, Vec3, Vec3];
    quadN(b, p, up ? [0, 1, 0] : [0, -1, 0], [
      [F.rs * s0, da],
      [F.rs * s1, da],
      [F.rs * s1, db],
      [F.rs * s0, db],
    ]);
  };
  flat(y1, false);
  if (withSill) flat(y0, true);
}

/** A box in facade coordinates (s, y, depth) — frames, sills, fins. */
export function box3(
  b: Bucket,
  F: FacadeFrame,
  s0: number,
  s1: number,
  y0: number,
  y1: number,
  d0: number,
  d1: number,
  opts: { back?: boolean } = {},
): void {
  const n = outward(F);
  const inN = inward(F);
  const P = (s: number, y: number, d: number) => fp(F, s, y, d);
  const U = (s: number) => F.rs * s;
  // Front (outward) at d0.
  quadN(b, [P(s0, y0, d0), P(s1, y0, d0), P(s1, y1, d0), P(s0, y1, d0)], n, [
    [U(s0), y0],
    [U(s1), y0],
    [U(s1), y1],
    [U(s0), y1],
  ]);
  if (opts.back !== false)
    quadN(b, [P(s0, y0, d1), P(s1, y0, d1), P(s1, y1, d1), P(s0, y1, d1)], inN, [
      [U(s0), y0],
      [U(s1), y0],
      [U(s1), y1],
      [U(s0), y1],
    ]);
  // Sides.
  quadN(b, [P(s0, y0, d0), P(s0, y0, d1), P(s0, y1, d1), P(s0, y1, d0)], sDir(F, -1), [
    [d0, y0],
    [d1, y0],
    [d1, y1],
    [d0, y1],
  ]);
  quadN(b, [P(s1, y0, d0), P(s1, y0, d1), P(s1, y1, d1), P(s1, y1, d0)], sDir(F, 1), [
    [d0, y0],
    [d1, y0],
    [d1, y1],
    [d0, y1],
  ]);
  quadN(b, [P(s0, y1, d0), P(s1, y1, d0), P(s1, y1, d1), P(s0, y1, d1)], [0, 1, 0], [
    [U(s0), d0],
    [U(s1), d0],
    [U(s1), d1],
    [U(s0), d1],
  ]);
  quadN(b, [P(s0, y0, d0), P(s1, y0, d0), P(s1, y0, d1), P(s0, y0, d1)], [0, -1, 0], [
    [U(s0), d0],
    [U(s1), d0],
    [U(s1), d1],
    [U(s0), d1],
  ]);
}

/**
 * Inner face of the screen walls: where the floors behind the brick step down
 * to a terrace, the mantle stands free above it and its inside is brick too.
 */
function emitScreenInnerFace(b: Bucket, F: FacadeFrame, windows: WindowInfo[]): void {
  const len = F.len;
  // Sample the terrace floor behind the wall (step function) and the brick top (linear).
  const step = 0.05;
  const xs: number[] = [];
  for (let s = 0; s <= len + 1e-6; s += step) xs.push(Math.min(s, len));
  const behind = (s: number) => {
    const [x, z] = [F.o[0] + F.sAxis[0] * s + F.inAxis[0] * (WALL + 0.3), F.o[1] + F.sAxis[1] * s + F.inAxis[1] * (WALL + 0.3)];
    return massTop(x, z);
  };
  // Runs of s where the brick rises above the floor behind it.
  let run: number[] = [];
  const flush = () => {
    if (run.length < 2) {
      run = [];
      return;
    }
    const s0 = run[0];
    const s1 = run[run.length - 1];
    // Outline: floor steps along the bottom, the sloped top back.
    const bottom: V2[] = [];
    let prevY = NaN;
    for (const s of run) {
      const y = behind(s);
      if (y !== prevY && !Number.isNaN(prevY)) bottom.push([s, prevY]);
      bottom.push([s, y]);
      prevY = y;
    }
    const kinks = breaks(F.f).filter((k) => k > s0 + 1e-6 && k < s1 - 1e-6);
    const top: V2[] = [s1, ...kinks.reverse(), s0].map((s) => [s, facadeTop(F.f, s)] as V2);
    const outline = simplify([...bottom, ...top]);
    const holes = windows
      .filter((w) => w.open && w.s - w.size / 2 >= s0 - 1e-6 && w.s + w.size / 2 <= s1 + 1e-6)
      .map((w) => [
        [w.s - w.size / 2, w.y - w.size / 2],
        [w.s + w.size / 2, w.y - w.size / 2],
        [w.s + w.size / 2, w.y + w.size / 2],
        [w.s - w.size / 2, w.y + w.size / 2],
      ] as V2[]);
    const a: V2 = [F.o[0] + F.inAxis[0] * WALL, F.o[1] + F.inAxis[1] * WALL];
    const e: V2 = [a[0] + F.sAxis[0] * len, a[1] + F.sAxis[1] * len];
    // Normal into the building (towards the terrace): opposite side of the outer face.
    wallPlane(b, a, e, outline, holes, !(F.f === "NE" || F.f === "SE"));
    run = [];
  };
  for (const s of xs) {
    const top = facadeTop(F.f, s);
    if (top > behind(s) + 0.02) run.push(s);
    else flush();
  }
  flush();
}

/** Remove collinear/duplicate points of an outline. */
function simplify(pts: V2[]): V2[] {
  const out: V2[] = [];
  for (const p of pts) {
    const q = out[out.length - 1];
    if (q && Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6) continue;
    out.push(p);
  }
  // Drop middle points of straight horizontal/vertical runs.
  const res: V2[] = [];
  for (let i = 0; i < out.length; i++) {
    const a = out[(i - 1 + out.length) % out.length];
    const b = out[i];
    const c = out[(i + 1) % out.length];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cross) < 1e-9) continue;
    res.push(b);
  }
  return res;
}

/** Plaster inner faces of floors 1–2 (shown with the interior). */
function emitInnerFaces(b: MantleBuckets, F: FacadeFrame, windows: WindowInfo[], doors: ReturnType<typeof doorOpenings>): void {
  const len = F.len;
  const a: V2 = [F.o[0] + F.inAxis[0] * WALL, F.o[1] + F.inAxis[1] * WALL];
  const e: V2 = [a[0] + F.sAxis[0] * len, a[1] + F.sAxis[1] * len];
  // Up to the dollhouse cut heights, so the cut shows a clean wall section.
  const bands: [Bucket, number, number][] = [
    [b.innerF1, 0, 4.2],
    [b.innerF2, 5.0, 8.6],
  ];
  for (const [bucket, y0, y1] of bands) {
    // Skip stretches with a terrace behind at this band (the floor-2 terrace in the south corner).
    const segs: [number, number][] = [];
    let start: number | null = null;
    for (let s = 0; s <= len + 1e-6; s += 0.1) {
      const [x, z] = [F.o[0] + F.sAxis[0] * s + F.inAxis[0] * 1, F.o[1] + F.sAxis[1] * s + F.inAxis[1] * 1];
      const inside = massTop(x, z) > y1 - 0.5 || y1 < 5;
      if (inside && start === null) start = s;
      if (!inside && start !== null) {
        segs.push([start, s]);
        start = null;
      }
    }
    if (start !== null) segs.push([start, len]);
    for (const [s0, s1] of segs) {
      const outline: V2[] = [
        [s0, y0],
        [s1, y0],
        [s1, y1],
        [s0, y1],
      ];
      const holes = [
        ...windows.map((w) => ({ s0: w.s - w.size / 2, s1: w.s + w.size / 2, y0: w.y - w.size / 2, y1: w.y + w.size / 2 })),
        ...doors,
      ]
        .map((h) => ({ s0: Math.max(h.s0, s0 + 0.01), s1: Math.min(h.s1, s1 - 0.01), y0: Math.max(h.y0, y0 + 0.01), y1: Math.min(h.y1, y1 - 0.01) }))
        .filter((h) => h.s1 - h.s0 > 0.05 && h.y1 - h.y0 > 0.05)
        .map((h) => [
          [h.s0, h.y0],
          [h.s1, h.y0],
          [h.s1, h.y1],
          [h.s0, h.y1],
        ] as V2[]);
      wallPlane(bucket, a, e, outline, holes, !(F.f === "NE" || F.f === "SE"));
    }
  }
}
