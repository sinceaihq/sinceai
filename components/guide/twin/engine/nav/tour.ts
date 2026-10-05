import { Vector3 } from "three";
import type { Collider2D, LevelId, V2, V3, WalkArea } from "../types";
import { castCircle, clearance, indexColliders, levelAt, type ColliderIndex } from "./collision";

/**
 * Guided tours: an avatar walks a route polyline at a steady pace while the
 * camera follows it — chase (7 m behind, 3.2 m up, looking 6 m ahead; tighter
 * indoors and under roofs) or first person at eye height. The chase camera
 * trails on the route itself, as far back as it can still see the walker
 * (walls, closed buildings), and keeps under every ceiling it passes beneath;
 * it rides on spring-smoothed offsets from the walker, so straights have no
 * lag, bends swing gently, stairs glide and doors pull it in over a fraction of
 * a second (it starts before the door) instead of cutting. A route that starts
 * at a building's door is framed from the open side, looking back at the door.
 * Pure maths plus one THREE.Vector3 per frame value; deterministic for a given
 * sequence of dt values (no clocks, no randomness), so posters and tests are
 * repeatable.
 *
 * The route is cleaned (duplicate points, tiny back-and-forth jogs), its
 * corners are rounded with a bounded cut (≤ 0.4 m from the corner, and never
 * closer to a wall than the original line or 0.3 m when walls are known), and
 * a centripetal Catmull-Rom curve runs through the result. Walking uses an
 * arc-length table, so the pace is constant on straights and curves alike.
 * Progress `t` and caption positions are fractions of the *input* polyline's
 * length, mapped onto the smoothed curve at every route vertex — a caption at
 * a waypoint shows exactly when the walker passes it.
 */

export interface TourPath {
  id: string;
  /** Route polyline: floor positions (y = floor height, not eye height). */
  points: V3[];
  /** at = 0..1 of the polyline's length. */
  captions: { at: number; text: string }[];
  /** Per-segment pace multiplier (points[i] → points[i + 1]), e.g. 2.5 on long outdoor legs. Blended smoothly. */
  speed?: number[];
  /** Level of each point: picks the walls for the camera and is reported in frames. */
  levels?: LevelId[];
}

export interface TourFrame {
  position: Vector3;
  target: Vector3;
  t: number;
  caption: string | null;
  /** Avatar position (feet). */
  walker: Vector3;
  /** Walking direction as a compass bearing in degrees (0 = north, 90 = east). */
  heading: number;
  /** Index of the current caption (−1 before the first). */
  step?: number;
  /** Level under the walker, when the path has levels (or walk areas were given). */
  level?: LevelId;
  /**
   * Level the camera is on, when the path has levels: the chase camera trails the walker by a few
   * metres along the route, so it passes a door after the walker does (first person: the walker's).
   * Exposure follows this one — indoors once the camera is in.
   */
  cameraLevel?: LevelId;
  /** The walker has arrived (t = 1); the camera may still be settling. */
  done?: boolean;
  /**
   * How the camera frames the walker: trailing on the route ("chase"), pulled in short of it by a wall
   * or a bend ("pulled"), close behind its shoulder ("shoulder"), from the open side at a start by a
   * door ("front"), or first person ("first").
   */
  framing?: "chase" | "pulled" | "shoulder" | "front" | "first";
  /** A last-resort clamp moved the camera this frame (the springs normally keep it clear): for QA. */
  clamped?: "wall" | "ceiling";
}

export interface TourController {
  start(path: TourPath, mode: "chase" | "first"): void;
  stop(): void;
  pause(on: boolean): void;
  paused(): boolean;
  seek(t: number): void;
  /** Advance; null when no tour is running. */
  update(dt: number): TourFrame | null;
  /** Switch between chase and first person without restarting (the camera eases over). */
  setMode(mode: "chase" | "first"): void;
  /** Walls the chase camera must not pass through (and corners must not cut into). */
  setColliders(colliders: Collider2D[], walkAreas?: WalkArea[]): void;
  /** Length (m) and walking time (s) of the running tour; null when none. */
  info(): { id: string; length: number; duration: number } | null;
  /**
   * The modelled surfaces along the running route (nav/corridor.ts), once they are indexed: the
   * avatar then stands on what is drawn, and the chase camera stays under every roof. null = none.
   */
  setSurfaces?(surfaces: TourSurfaces | null): void;
}

/** Floors and ceilings the scene really has along a route (see nav/corridor.ts CorridorIndex). */
export interface TourSurfaces {
  /** The walking surface at (x, z) nearest to `hint` (the route's own height); null = none modelled. */
  floorAt(x: number, z: number, hint: number): number | null;
  /** The lowest surface over (x, z) at least ~1.9 m above `floor` (a roof, a canopy, a ceiling); null = sky. */
  ceilingAt(x: number, z: number, floor: number): number | null;
}

export interface TourOptions {
  /** Walking pace (m/s), default 1.6. */
  speed?: number;
  colliders?: Collider2D[];
  /** Used to tell the level under the walker when the path has no `levels`. */
  walkAreas?: WalkArea[];
  chase?: { back?: number; up?: number; ahead?: number };
  /**
   * Chase framing inside buildings, where ceilings are ≈ 3–3.5 m: default 5 m behind, 2.3 m up, 5 m
   * ahead. Applies where the path's `levels` (or the walk areas) say the walker is indoors; null = as outdoors.
   */
  chaseIndoor?: { back?: number; up?: number; ahead?: number } | null;
  /**
   * Ground height for the outdoor parts of a route (needs `levels`): the walker is snapped onto it.
   * `routeY` is the route's own height there — a bridge deck must not snap to the street below.
   */
  heightAt?(x: number, z: number, routeY: number): number | null | undefined;
  /**
   * A closed building fills (x, y, z): the chase camera never goes there. `levels`: the walker's and the
   * camera's levels (a building the route walks through is not closed to its camera).
   */
  solidAt?(x: number, y: number, z: number, levels?: readonly (LevelId | undefined)[]): boolean;
  /**
   * Nothing tall stands in plan between a and b at a walker's floor `floor` on these levels — building
   * walls, not the railings, fences and planters a camera a few metres up sees over. Given, it replaces
   * the colliders for the camera's sight lines.
   */
  sightClear?(a: V2, b: V2, floor: number, levels: readonly (LevelId | undefined)[]): boolean;
  /** Something solid (a closed building) stands between two points: the camera must see the walker. */
  sightBlocked?(a: V3, b: V3): boolean;
  eyeHeight?: number;
  /** Largest corner cut (m), default 0.4. */
  maxCut?: number;
  /** Metres over which the walker speeds up at the start and slows to a stop at the end (default 1.2; 0 = off). */
  ease?: number;
  /** Last word on the chase camera each frame (e.g. keep it under a ceiling). */
  constrain?(camera: Vector3, walker: Vector3): void;
}

const DEG = 180 / Math.PI;
/** Spacing (m) of the samples in the arc-length table. */
const SAMPLE = 0.1;
/** Straight runs keep a control point at least every this many metres. */
const STRAIGHT_STEP = 2;
/** Body radius the rounded corners keep from walls (when walls are known). */
const BODY = 0.3;

// ── Path building (pure) ────────────────────────────────────────────────────

interface Vertex {
  x: number;
  y: number;
  z: number;
  /** Index of the input point it came from. */
  src: number;
}

const dist3 = (a: Vertex, b: Vertex) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);

/** Drop invalid and duplicate points and tiny jogs that double back (e.g. a 0.2 m router zig-zag). */
export function cleanPolyline(points: V3[]): Vertex[] {
  const out: Vertex[] = [];
  points.forEach((p, src) => {
    if (!p || p.length < 3 || !p.every(Number.isFinite)) return;
    const v = { x: p[0], y: p[1], z: p[2], src };
    const last = out[out.length - 1];
    if (last && dist3(last, v) < 0.05) return;
    out.push(v);
  });
  const cosLimit = Math.cos((100 * Math.PI) / 180);
  for (let i = 1; i < out.length - 1; ) {
    const a = out[i - 1];
    const b = out[i];
    const c = out[i + 1];
    const l1 = dist3(a, b);
    const l2 = dist3(b, c);
    const cos = ((b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y) + (b.z - a.z) * (c.z - b.z)) / (l1 * l2);
    if (Math.min(l1, l2) < 0.6 && cos < cosLimit) {
      out.splice(i, 1);
      i = Math.max(1, i - 1);
    } else i++;
  }
  // Removing a jog can leave its neighbours on top of each other; keep the true end point.
  const final: Vertex[] = [];
  out.forEach((v, i) => {
    const last = final[final.length - 1];
    if (last && dist3(last, v) < 0.05) {
      if (i === out.length - 1 && final.length > 1) final[final.length - 1] = v;
      return;
    }
    final.push(v);
  });
  return final;
}

export interface TourCurve {
  /** Curve length (m). */
  length: number;
  /** Position on the curve at distance s (clamped), written into out. */
  pointAt(s: number, out?: V3): V3;
  /** Horizontal unit direction of travel at s: [dx, dz]. */
  directionAt(s: number): V2;
  /** Progress 0..1 (fraction of the input polyline) at curve distance s. */
  tOf(s: number): number;
  /** Curve distance for progress t. */
  sOf(t: number): number;
  /** Curve distance of each cleaned vertex (where its caption/level applies). */
  anchors: Float64Array;
  /** The cleaned route vertices. */
  vertices: Vertex[];
  /** Largest distance of the curve from the cleaned polyline (m) — for tests and QA. */
  maxDeviation(): number;
}

export interface CurveOptions {
  maxCut?: number;
  /** Walls per vertex (by index into the cleaned vertices) for corner validation. */
  wallsNear?(vertex: Vertex): ColliderIndex | null;
}

/** Clearance of point (x, z) to the walls of an index (∞ when none are near). */
function clearanceAt(index: ColliderIndex, x: number, z: number, reach: number): number {
  const near = index.query(x - reach, z - reach, x + reach, z + reach);
  return near.length ? Math.min(reach, clearance([x, z], near)) : reach;
}

/**
 * Smooth a route polyline into an arc-length-parametrised curve: rounded
 * corners (quadratic Bézier fillets, cut ≤ maxCut) sampled into control points,
 * then centripetal Catmull-Rom through them.
 */
export function buildTourCurve(points: V3[], opts: CurveOptions = {}): TourCurve {
  const maxCut = Math.max(0, opts.maxCut ?? 0.4);
  const verts = cleanPolyline(points);
  if (verts.length === 0) verts.push({ x: 0, y: 0, z: 0, src: 0 });
  const n = verts.length;

  // Directions and lengths of the cleaned segments.
  const segLen: number[] = [];
  const dir: V3[] = [];
  for (let i = 0; i < n - 1; i++) {
    const l = dist3(verts[i], verts[i + 1]);
    segLen.push(l);
    dir.push([(verts[i + 1].x - verts[i].x) / l, (verts[i + 1].y - verts[i].y) / l, (verts[i + 1].z - verts[i].z) / l]);
  }

  // Corner rounding distance at each interior vertex.
  const cut = new Float64Array(n);
  const turn = new Float64Array(n);
  for (let i = 1; i < n - 1; i++) {
    const u1 = dir[i - 1];
    const u2 = dir[i];
    const cos = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2]));
    const theta = Math.acos(cos);
    turn[i] = theta;
    if (theta < (1 * Math.PI) / 180 || maxCut === 0) continue;
    // A quadratic fillet from V − u1·d to V + u2·d passes d·sin(θ/2)/2 from the corner.
    const sinHalf = Math.sin(theta / 2);
    let d = Math.min(
      (2 * Math.max(0, maxCut - 0.02)) / sinHalf,
      8,
      segLen[i - 1] * (i - 1 === 0 ? 0.95 : 0.5),
      segLen[i] * (i + 1 === n - 1 ? 0.95 : 0.5),
    );
    const walls = opts.wallsNear?.(verts[i]);
    if (walls && d > 0) {
      const v = verts[i];
      const reach = d + 1;
      // Clearance of the original corner within d of the vertex…
      let original = Infinity;
      for (let k = 0; k <= 20; k++) {
        const f = (k / 20) * d;
        original = Math.min(
          original,
          clearanceAt(walls, v.x - u1[0] * f, v.z - u1[2] * f, reach),
          clearanceAt(walls, v.x + u2[0] * f, v.z + u2[2] * f, reach),
        );
      }
      // …which the fillet may not undercut (nor go within a body radius of a wall).
      const need = Math.min(original, BODY) - 0.02;
      let ok = false;
      for (let attempt = 0; attempt < 6 && !ok; attempt++) {
        ok = true;
        for (let k = 0; k <= 12 && ok; k++) {
          const t = k / 12;
          const ax = v.x - u1[0] * d;
          const az = v.z - u1[2] * d;
          const bx = v.x + u2[0] * d;
          const bz = v.z + u2[2] * d;
          const x = (1 - t) * (1 - t) * ax + 2 * (1 - t) * t * v.x + t * t * bx;
          const z = (1 - t) * (1 - t) * az + 2 * (1 - t) * t * v.z + t * t * bz;
          if (clearanceAt(walls, x, z, reach) < need) ok = false;
        }
        if (!ok) d *= 0.6;
      }
      if (!ok) d = 0;
    }
    cut[i] = d;
  }

  // Control points: straight runs (a point every ≤ 2 m) and sampled fillets.
  const cp: number[] = [];
  const add = (x: number, y: number, z: number) => {
    const k = cp.length - 3;
    if (k >= 0 && Math.hypot(cp[k] - x, cp[k + 1] - y, cp[k + 2] - z) < 1e-4) return cp.length / 3 - 1;
    cp.push(x, y, z);
    return cp.length / 3 - 1;
  };
  const anchorCp = new Int32Array(n);
  anchorCp[0] = add(verts[0].x, verts[0].y, verts[0].z);
  for (let i = 0; i < n - 1; i++) {
    const a = verts[i];
    const b = verts[i + 1];
    const u = dir[i];
    const sx = a.x + u[0] * cut[i];
    const sy = a.y + u[1] * cut[i];
    const sz = a.z + u[2] * cut[i];
    const ex = b.x - u[0] * cut[i + 1];
    const ey = b.y - u[1] * cut[i + 1];
    const ez = b.z - u[2] * cut[i + 1];
    const runLen = Math.hypot(ex - sx, ey - sy, ez - sz);
    const k = Math.max(1, Math.ceil(runLen / STRAIGHT_STEP));
    for (let j = 1; j < k; j++) add(sx + ((ex - sx) * j) / k, sy + ((ey - sy) * j) / k, sz + ((ez - sz) * j) / k);
    const entry = add(ex, ey, ez);
    if (i + 1 === n - 1 || cut[i + 1] === 0) {
      anchorCp[i + 1] = entry;
      continue;
    }
    // Fillet around vertex i + 1 (control point = the vertex), an even number of samples so one lands mid-way.
    const d = cut[i + 1];
    const u2 = dir[i + 1];
    const m = 2 * Math.max(2, Math.min(8, Math.ceil((turn[i + 1] * DEG) / 22.5)));
    const fx = b.x + u2[0] * d;
    const fy = b.y + u2[1] * d;
    const fz = b.z + u2[2] * d;
    for (let j = 1; j <= m; j++) {
      const t = j / m;
      const w0 = (1 - t) * (1 - t);
      const w1 = 2 * (1 - t) * t;
      const w2 = t * t;
      const idx = add(w0 * ex + w1 * b.x + w2 * fx, w0 * ey + w1 * b.y + w2 * fy, w0 * ez + w1 * b.z + w2 * fz);
      if (j === m / 2) anchorCp[i + 1] = idx;
    }
  }

  // Centripetal Catmull-Rom through the control points, sampled into an arc-length table.
  const N = cp.length / 3;
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  const cpSample = new Int32Array(N);
  const P = (i: number, c: number) => {
    if (i < 0) return 2 * cp[c] - cp[3 + c];
    if (i >= N) return 2 * cp[(N - 1) * 3 + c] - cp[(N - 2) * 3 + c];
    return cp[i * 3 + c];
  };
  for (let j = 0; j < N - 1; j++) {
    cpSample[j] = xs.length;
    const p0 = [P(j - 1, 0), P(j - 1, 1), P(j - 1, 2)];
    const p1 = [P(j, 0), P(j, 1), P(j, 2)];
    const p2 = [P(j + 1, 0), P(j + 1, 1), P(j + 1, 2)];
    const p3 = [P(j + 2, 0), P(j + 2, 1), P(j + 2, 2)];
    const knot = (a: number[], b: number[]) => Math.max(1e-6, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])));
    const t1 = knot(p0, p1);
    const t2 = t1 + knot(p1, p2);
    const t3 = t2 + knot(p2, p3);
    const chord = Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
    const k = Math.max(1, Math.ceil(chord / SAMPLE));
    for (let q = 0; q < k; q++) {
      const t = t1 + ((t2 - t1) * q) / k;
      const out = [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        const a1 = ((t1 - t) / t1) * p0[c] + (t / t1) * p1[c];
        const a2 = ((t2 - t) / (t2 - t1)) * p1[c] + ((t - t1) / (t2 - t1)) * p2[c];
        const a3 = ((t3 - t) / (t3 - t2)) * p2[c] + ((t - t2) / (t3 - t2)) * p3[c];
        const b1 = ((t2 - t) / t2) * a1 + (t / t2) * a2;
        const b2 = ((t3 - t) / (t3 - t1)) * a2 + ((t - t1) / (t3 - t1)) * a3;
        out[c] = ((t2 - t) / (t2 - t1)) * b1 + ((t - t1) / (t2 - t1)) * b2;
      }
      xs.push(out[0]);
      ys.push(out[1]);
      zs.push(out[2]);
    }
  }
  cpSample[N - 1] = xs.length;
  xs.push(cp[(N - 1) * 3]);
  ys.push(cp[(N - 1) * 3 + 1]);
  zs.push(cp[(N - 1) * 3 + 2]);

  const M = xs.length;
  const S = new Float64Array(M);
  for (let i = 1; i < M; i++) S[i] = S[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1], zs[i] - zs[i - 1]);
  const length = S[M - 1];

  // Progress mapping: polyline fraction at each vertex ↔ curve distance of its anchor.
  const polyCum = new Float64Array(n);
  for (let i = 1; i < n; i++) polyCum[i] = polyCum[i - 1] + segLen[i - 1];
  const polyLen = polyCum[n - 1];
  const anchors = new Float64Array(n);
  const fractions = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    anchors[i] = S[cpSample[anchorCp[i]]];
    fractions[i] = polyLen > 0 ? polyCum[i] / polyLen : i === n - 1 ? 1 : 0;
  }
  anchors[0] = 0;
  anchors[n - 1] = length;
  for (let i = 1; i < n; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1]);
  if (n === 1) fractions[0] = 1;

  /** Piecewise-linear lookup in a non-decreasing table. */
  const interp = (xsTab: Float64Array, ysTab: Float64Array, x: number) => {
    if (xsTab.length === 1) return ysTab[0];
    if (x <= xsTab[0]) return ysTab[0];
    const last = xsTab.length - 1;
    if (x >= xsTab[last]) return ysTab[last];
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xsTab[mid] <= x) lo = mid;
      else hi = mid;
    }
    const span = xsTab[hi] - xsTab[lo];
    return span > 0 ? ysTab[lo] + ((ysTab[hi] - ysTab[lo]) * (x - xsTab[lo])) / span : ysTab[hi];
  };

  const pointAt = (s: number, out: V3 = [0, 0, 0]): V3 => {
    if (!(s > 0)) {
      out[0] = xs[0];
      out[1] = ys[0];
      out[2] = zs[0];
      return out;
    }
    if (s >= length) {
      out[0] = xs[M - 1];
      out[1] = ys[M - 1];
      out[2] = zs[M - 1];
      return out;
    }
    let lo = 0;
    let hi = M - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (S[mid] <= s) lo = mid;
      else hi = mid;
    }
    const f = (s - S[lo]) / (S[hi] - S[lo] || 1);
    out[0] = xs[lo] + (xs[hi] - xs[lo]) * f;
    out[1] = ys[lo] + (ys[hi] - ys[lo]) * f;
    out[2] = zs[lo] + (zs[hi] - zs[lo]) * f;
    return out;
  };

  const a: V3 = [0, 0, 0];
  const b: V3 = [0, 0, 0];
  const directionAt = (s: number): V2 => {
    // Widen the window until it spans some horizontal distance (stairs, single points).
    for (const h of [0.4, 1.5, 6, length]) {
      pointAt(Math.max(0, Math.min(length, s) - h), a);
      pointAt(Math.min(length, Math.max(0, s) + h), b);
      const dx = b[0] - a[0];
      const dz = b[2] - a[2];
      const l = Math.hypot(dx, dz);
      if (l > 1e-3) return [dx / l, dz / l];
    }
    return [0, -1];
  };

  return {
    length,
    pointAt,
    directionAt,
    tOf: (s) => interp(anchors, fractions, s),
    sOf: (t) => interp(fractions, anchors, t),
    anchors,
    vertices: verts,
    maxDeviation() {
      let worst = 0;
      for (let i = 0; i < M; i++) {
        let best = Infinity;
        for (let k = 0; k < n - 1; k++) {
          const p = verts[k];
          const q = verts[k + 1];
          const ex = q.x - p.x;
          const ey = q.y - p.y;
          const ez = q.z - p.z;
          const l2 = ex * ex + ey * ey + ez * ez;
          const u = Math.max(0, Math.min(1, ((xs[i] - p.x) * ex + (ys[i] - p.y) * ey + (zs[i] - p.z) * ez) / l2));
          best = Math.min(best, Math.hypot(xs[i] - p.x - ex * u, ys[i] - p.y - ey * u, zs[i] - p.z - ez * u));
        }
        if (n === 1) best = Math.hypot(xs[i] - verts[0].x, ys[i] - verts[0].y, zs[i] - verts[0].z);
        worst = Math.max(worst, best);
      }
      return worst;
    },
  };
}

/** Caption shown at progress t: the last one whose `at` has been reached. */
export function captionAt(captions: { at: number; text: string }[], t: number): { index: number; text: string | null } {
  let index = -1;
  for (let i = 0; i < captions.length; i++) if (captions[i].at <= t + 1e-9) index = i;
  return { index, text: index >= 0 ? captions[index].text : null };
}

// ── Springs ─────────────────────────────────────────────────────────────────

/** Critically damped spring for one value: exact step, stable for any dt. */
function springStep(state: Float64Array, i: number, target: number, omega: number, dt: number) {
  const x = state[i];
  const v = state[i + 3];
  const e = Math.exp(-omega * dt);
  const delta = x - target;
  const temp = (v + omega * delta) * dt;
  state[i] = target + (delta + temp) * e;
  state[i + 3] = (v - omega * temp) * e;
}

/** A 3D spring: [x, y, z, vx, vy, vz]. */
function springTo(state: Float64Array, tx: number, ty: number, tz: number, omega: number, dt: number) {
  springStep(state, 0, tx, omega, dt);
  springStep(state, 1, ty, omega, dt);
  springStep(state, 2, tz, omega, dt);
}

function springSnap(state: Float64Array, x: number, y: number, z: number) {
  state[0] = x;
  state[1] = y;
  state[2] = z;
  state[3] = state[4] = state[5] = 0;
}

const smoothstep = (e0: number, e1: number, x: number) => {
  if (e1 <= e0) return x >= e1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ── Controller ──────────────────────────────────────────────────────────────

interface Running {
  path: TourPath;
  curve: TourCurve;
  captions: { at: number; text: string }[];
  /** Pace multiplier sampled every PROFILE_STEP metres (null = 1 everywhere). */
  profile: Float64Array | null;
  levels: (LevelId | undefined)[] | null;
  duration: number;
  /** Floor under the walker every TABLE_STEP m along the curve (NaN = not yet known): the modelled surface. */
  floors: Float32Array;
  /** Lowest ceiling over the route every TABLE_STEP m (Infinity = open sky; NaN = not yet known). */
  ceilings: Float32Array;
  /**
   * The route starts at a door with a building behind it: the camera first waits out on the route ahead
   * (at `at` m, `side` m to its side), looking back at the walker. null = no need (or no spot); undefined = undecided.
   */
  front: { at: number; side: number } | null | undefined;
}

const PROFILE_STEP = 0.5;
/** Half-width (m) of the blend between segment paces. */
const PROFILE_BLEND = 5;
/** Spacing (m) of the floor and ceiling tables along the curve. */
const TABLE_STEP = 0.25;
/** The chase camera keeps this far (m) under a ceiling… */
const CEILING_GAP = 0.35;
/** …and at least this high (m) over the walker's floor. */
const MIN_UP = 1.2;
/** Closest the chase camera trails on the route (m); nearer than that it goes over the shoulder. */
const MIN_TRAIL = 2.2;
/** How far ahead (m) the walker is checked for sight lines: the camera pulls in before a door. */
const LOOKAHEAD = 1.6;
/** Spring rates (1/s): pulling in (a door, a roof) is quick; easing back out and following are gentle. */
const PULL_IN = 10;
const FOLLOW = 2.6;
const EASE_OUT = 2;
/** Body radius for the camera's sight line past walls. */
const SIGHT_RADIUS = 0.2;

export function createTourController(opts: TourOptions = {}): TourController {
  const pace = opts.speed && opts.speed > 0 ? opts.speed : 1.6;
  const outdoorChase = { back: opts.chase?.back ?? 7, up: opts.chase?.up ?? 3.2, ahead: opts.chase?.ahead ?? 6 };
  const indoorChase =
    opts.chaseIndoor === null
      ? outdoorChase
      : { back: opts.chaseIndoor?.back ?? 5, up: opts.chaseIndoor?.up ?? 2.3, ahead: opts.chaseIndoor?.ahead ?? 5 };
  const eye = opts.eyeHeight ?? 1.65;
  const easeDist = Math.max(0, opts.ease ?? 1.2);
  const maxCut = opts.maxCut ?? 0.4;

  let walls: Collider2D[] = opts.colliders ?? [];
  let areas: WalkArea[] = opts.walkAreas ?? [];
  let surfaces: TourSurfaces | null = null;
  const indexes = new Map<string, ColliderIndex>();
  const indexFor = (level: LevelId | undefined): ColliderIndex | null => {
    if (walls.length === 0) return null;
    const key = level ?? "*";
    let index = indexes.get(key);
    if (!index) {
      index = indexColliders(level ? walls.filter((w) => w.level === level) : walls, 4);
      indexes.set(key, index);
    }
    return index;
  };

  let run: Running | null = null;
  let mode: "chase" | "first" = "chase";
  let s = 0;
  let isPaused = false;
  let snap = true;
  const cam = new Float64Array(6);
  const look = new Float64Array(6);
  /** Height the camera rides on: the walker's floor, smoothed so stairs glide rather than step. */
  const base = new Float64Array(6);
  const pW: V3 = [0, 0, 0];
  /** The route's own height at the walker (before snapping to the ground). */
  let routeY = 0;
  const pA: V3 = [0, 0, 0];
  const pB: V3 = [0, 0, 0];
  const pC: V3 = [0, 0, 0];
  /** How the chase camera frames the walker now (for QA and the engine). */
  let framing: TourFrame["framing"] = "chase";
  /** The floor under the chase camera (the higher of the walker's and its trailing point's). */
  let camFloor = 0;

  const levelOfVertex = (r: Running, i: number): LevelId | undefined => r.levels?.[i] ?? undefined;

  /** Level under the walker at curve distance s (nearest route vertex, or the walk areas). */
  function levelAtS(r: Running, at: number, y: number, x: number, z: number): LevelId | undefined {
    if (r.levels) {
      const anchors = r.curve.anchors;
      let best = 0;
      for (let i = 1; i < anchors.length; i++) if (Math.abs(anchors[i] - at) < Math.abs(anchors[best] - at)) best = i;
      return levelOfVertex(r, best);
    }
    if (areas.length) {
      const ground = opts.heightAt;
      return levelAt([x, z], areas, {
        y,
        tolerance: 1.2,
        heightAt: ground ? (gx, gz, level) => (level === "outdoor" ? ground(gx, gz, y) : null) : undefined,
      })?.level;
    }
    return undefined;
  }

  /**
   * Level of the route segment at curve distance `at`: the level of the vertex the segment leads to,
   * so a door point (it carries the level of the leg it ends) switches to the next leg right after it.
   */
  function segmentLevel(r: Running, at: number): LevelId | undefined {
    if (!r.levels) return undefined;
    const anchors = r.curve.anchors;
    let i = 1;
    while (i < anchors.length - 1 && anchors[i] <= at) i++;
    return levelOfVertex(r, Math.min(i, anchors.length - 1));
  }

  function multiplierAt(r: Running, at: number) {
    if (!r.profile) return 1;
    const f = at / PROFILE_STEP;
    const i = Math.max(0, Math.min(r.profile.length - 1, Math.floor(f)));
    const j = Math.min(r.profile.length - 1, i + 1);
    return r.profile[i] + (r.profile[j] - r.profile[i]) * Math.max(0, Math.min(1, f - i));
  }

  function velocity(r: Running, at: number) {
    const L = r.curve.length;
    let ease = 1;
    if (easeDist > 0) {
      ease *= 0.25 + 0.75 * smoothstep(0, easeDist, at);
      ease *= 0.15 + 0.85 * smoothstep(0, easeDist, L - at);
    }
    return pace * multiplierAt(r, at) * ease;
  }

  function prepare(path: TourPath): Running {
    const vertsLevel = (v: Vertex) => path.levels?.[v.src];
    const curve = buildTourCurve(path.points, {
      maxCut,
      wallsNear: walls.length ? (v) => indexFor(vertsLevel(v)) : undefined,
    });
    const levels = path.levels ? curve.vertices.map((v) => path.levels?.[v.src]) : null;
    const captions = (path.captions ?? [])
      .filter((c) => Number.isFinite(c.at))
      .map((c) => ({ at: Math.max(0, Math.min(1, c.at)), text: c.text }))
      .sort((a, b) => a.at - b.at);

    // Pace profile: each cleaned segment takes the multiplier of the input segment it starts on.
    let profile: Float64Array | null = null;
    const mult = curve.vertices.slice(0, -1).map((v) => {
      const m = path.speed?.[v.src];
      return m !== undefined && Number.isFinite(m) && m > 0 ? Math.min(20, Math.max(0.1, m)) : 1;
    });
    if (mult.some((m) => m !== 1)) {
      const count = Math.max(2, Math.ceil(curve.length / PROFILE_STEP) + 1);
      const raw = new Float64Array(count);
      let seg = 0;
      for (let k = 0; k < count; k++) {
        const at = k * PROFILE_STEP;
        while (seg < mult.length - 1 && at > curve.anchors[seg + 1]) seg++;
        raw[k] = mult[Math.min(seg, mult.length - 1)] ?? 1;
      }
      // Two box blurs ≈ a smooth blend of the pace across segment changes.
      const half = Math.round(PROFILE_BLEND / PROFILE_STEP);
      let src = raw;
      for (let pass = 0; pass < 2; pass++) {
        const prefix = new Float64Array(count + 1);
        for (let k = 0; k < count; k++) prefix[k + 1] = prefix[k] + src[k];
        const out = new Float64Array(count);
        for (let k = 0; k < count; k++) {
          const lo = Math.max(0, k - half);
          const hi = Math.min(count - 1, k + half);
          out[k] = (prefix[hi + 1] - prefix[lo]) / (hi - lo + 1);
        }
        src = out;
      }
      profile = src;
    }
    const n = Math.max(2, Math.ceil(curve.length / TABLE_STEP) + 1);
    const r: Running = {
      path,
      curve,
      captions,
      profile,
      levels,
      duration: 0,
      floors: new Float32Array(n).fill(Number.NaN),
      ceilings: new Float32Array(n).fill(Number.NaN),
      front: undefined,
    };
    // Walking time at the configured pace (for the UI).
    let duration = 0;
    const steps = Math.max(1, Math.ceil(curve.length / 0.25));
    for (let k = 0; k < steps; k++) {
      const a = (curve.length * k) / steps;
      const b = (curve.length * (k + 1)) / steps;
      duration += (b - a) / velocity(r, (a + b) / 2);
    }
    r.duration = duration;
    return r;
  }

  // ── Floors and ceilings along the route ──

  /**
   * Floor of table sample i: outdoors the modelled surface nearest the route's height (else the
   * ground's height model while it is near the route — a deck keeps its own), indoors the route's own.
   */
  function rawFloor(r: Running, i: number): number {
    const at = Math.min(r.curve.length, i * TABLE_STEP);
    r.curve.pointAt(at, pC);
    const level = levelAtS(r, at, pC[1], pC[0], pC[2]);
    if (level !== "outdoor" && !(level === undefined && !r.levels)) return pC[1];
    const surface = surfaces?.floorAt(pC[0], pC[2], pC[1]);
    if (surface !== null && surface !== undefined && Number.isFinite(surface)) return surface;
    const h = opts.heightAt?.(pC[0], pC[2], pC[1]);
    if (h !== null && h !== undefined && Number.isFinite(h) && Math.abs(h - pC[1]) < 0.9) return h;
    return pC[1];
  }

  /** Floor at table sample i: the median of five raw samples, so one stray surface never makes a hop. */
  function floorSample(r: Running, i: number): number {
    const k = Math.max(0, Math.min(r.floors.length - 1, i));
    let v = r.floors[k];
    if (Number.isNaN(v)) {
      const raw: number[] = [];
      for (let j = k - 2; j <= k + 2; j++) raw.push(rawFloor(r, Math.max(0, Math.min(r.floors.length - 1, j))));
      raw.sort((a, b) => a - b);
      v = raw[2];
      r.floors[k] = v;
    }
    return v;
  }

  function floorAtS(r: Running, at: number): number {
    const f = Math.max(0, at) / TABLE_STEP;
    const i = Math.floor(f);
    const a = floorSample(r, i);
    const b = floorSample(r, i + 1);
    return a + (b - a) * Math.min(1, f - i);
  }

  /** Lowest ceiling over the route at curve distance `at` (absolute y; Infinity = open sky). */
  function ceilingAtS(r: Running, at: number): number {
    if (!surfaces) return Infinity;
    const k = Math.max(0, Math.min(r.ceilings.length - 1, Math.round(Math.max(0, at) / TABLE_STEP)));
    let v = r.ceilings[k];
    if (Number.isNaN(v)) {
      r.curve.pointAt(Math.min(r.curve.length, k * TABLE_STEP), pC);
      const c = surfaces.ceilingAt(pC[0], pC[2], floorSample(r, k));
      v = c === null || !Number.isFinite(c) ? Infinity : c;
      r.ceilings[k] = v;
    }
    return v;
  }

  /** Lowest ceiling over the route between two curve distances (the camera's sight line runs under it). */
  function lowestCeiling(r: Running, from: number, to: number): number {
    let low = Infinity;
    const a = Math.max(0, Math.min(from, to));
    const b = Math.min(r.curve.length, Math.max(from, to));
    for (let at = a; at <= b + 1e-6; at += TABLE_STEP * 2) low = Math.min(low, ceilingAtS(r, at));
    return Math.min(low, ceilingAtS(r, b));
  }

  /** Put the walker at s (on the modelled floor outdoors); returns its level. */
  function placeWalker(r: Running): LevelId | undefined {
    r.curve.pointAt(s, pW);
    routeY = pW[1];
    const level = levelAtS(r, s, pW[1], pW[0], pW[2]);
    if (level === "outdoor" || (level === undefined && !r.levels && (opts.heightAt || surfaces))) {
      if (surfaces) pW[1] = floorAtS(r, s);
      else if (opts.heightAt && level === "outdoor") {
        const h = opts.heightAt(pW[0], pW[2], pW[1]);
        if (h !== null && h !== undefined && Number.isFinite(h)) pW[1] = h;
      }
    }
    return level;
  }

  // ── Chase framing ──

  /** Point `d` m behind the walker on the route (beyond the start: the first direction extended back). */
  function trailPoint(r: Running, d: number, out: V3): V3 {
    if (s - d >= 0) return r.curve.pointAt(s - d, out);
    r.curve.pointAt(0, out);
    const [sx, sz] = r.curve.directionAt(0);
    out[0] -= sx * (d - s);
    out[2] -= sz * (d - s);
    return out;
  }

  /** Nothing in plan between two points that hides the walker (the engine's sight walls, else the colliders). */
  function wallsClear(a: V2, b: V2, levels: (LevelId | undefined)[]): boolean {
    if (opts.sightClear) return opts.sightClear(a, b, pW[1], levels);
    const seen = new Set<string>();
    for (const level of levels) {
      const key = level ?? "*";
      if (seen.has(key)) continue;
      seen.add(key);
      const index = indexFor(level);
      if (!index) continue;
      const near = index.query(
        Math.min(a[0], b[0]) - 0.5,
        Math.min(a[1], b[1]) - 0.5,
        Math.max(a[0], b[0]) + 0.5,
        Math.max(a[1], b[1]) + 0.5,
      );
      if (near.length && castCircle(a, b, SIGHT_RADIUS, near) < 1) return false;
    }
    return true;
  }

  /**
   * The camera may stand at `p` (y = camera height) and see the walker from there: not inside a closed
   * building, no wall in between — now, and from where the walker will be in a second (so the camera
   * pulls in before a door, not at it).
   */
  function viewpointClear(r: Running, p: V3, level: LevelId | undefined, pLevel: LevelId | undefined): boolean {
    const levels = [level, pLevel];
    if (opts.solidAt?.(p[0], p[1], p[2], levels)) return false;
    if (!wallsClear([pW[0], pW[2]], [p[0], p[2]], levels)) return false;
    // Where the walker will be in about 0.8 s (outdoor legs walk faster): the pull-in starts in time.
    const ahead = r.curve.pointAt(Math.min(r.curve.length, s + Math.max(LOOKAHEAD, velocity(r, s) * 0.8)), pB);
    if (!wallsClear([ahead[0], ahead[2]], [p[0], p[2]], levels)) return false;
    if (opts.sightBlocked?.([pW[0], pW[1] + 1.5, pW[2]], p)) return false;
    return true;
  }

  interface Want {
    cam: V3;
    look: V3;
    /** Lowest ceiling (absolute y) the camera and its sight line pass under (Infinity: none). */
    roof: number;
  }

  /** Desired camera and look-at offsets from the walker's base height. */
  function desired(r: Running, frameMode: "chase" | "first", level: LevelId | undefined): Want {
    const curve = r.curve;
    const L = curve.length;
    const [hx, hz] = curve.directionAt(s);
    const floor = pW[1];
    if (frameMode === "first") {
      framing = "first";
      // Look 4 m ahead along the route at eye height; at the end keep looking the way we were going.
      curve.pointAt(Math.min(L, s + 4), pA);
      let lx = pA[0] - pW[0];
      let ly = pA[1] - routeY;
      let lz = pA[2] - pW[2];
      if (Math.hypot(lx, lz) < 2) {
        lx = hx * 4;
        ly = 0;
        lz = hz * 4;
      }
      return { cam: [0, eye, 0], look: [lx, eye + ly, lz], roof: Infinity };
    }
    camFloor = floor;
    const indoor = level !== undefined && level !== "outdoor";
    let { back, up, ahead } = indoor ? indoorChase : outdoorChase;
    // Under a roof (a covered bridge, a canopy, a stair roof, a ceiling): the indoor framing, low under it.
    const over = ceilingAtS(r, s);
    if (over - floor < 7) {
      back = Math.min(back, indoorChase.back);
      ahead = Math.min(ahead, indoorChase.ahead);
      up = Math.min(up, Math.max(MIN_UP, over - floor - CEILING_GAP - 0.2));
    }
    // Trail on the route, as far back (up to `back`) as the camera still sees the walker.
    let trail = -1;
    for (const d of [back, back * 0.8, back * 0.62, back * 0.46, MIN_TRAIL]) {
      if (d < MIN_TRAIL - 1e-6) continue;
      const p = trailPoint(r, d, pB);
      const dist = Math.hypot(p[0] - pW[0], p[2] - pW[2]);
      // A tight bend (a stair's U-turn) brings the route behind right next to the walker.
      if (dist < Math.min(d * 0.5, MIN_TRAIL) || dist < 1.5) continue;
      const roofHere = lowestCeiling(r, s - d, s);
      // Up a covered stair the roof over a trailing point far down the flight is lower than the walker's
      // head: trail closer, where the camera fits under the roof and still looks down on the walker.
      if (roofHere - CEILING_GAP < floor + MIN_UP * 0.8) continue;
      const camY = Math.min(Math.max(p[1], floor) + up, roofHere - CEILING_GAP);
      const q: V3 = [p[0], Math.max(camY, floor + MIN_UP), p[2]];
      if (viewpointClear(r, q, level, segmentLevel(r, Math.max(0, s - d)) ?? level)) {
        trail = d;
        break;
      }
    }
    // A route that starts at a door with a building behind it: until the walker is a few metres out,
    // the camera waits out on the route ahead, to one side, looking back at the door and the walker.
    if (r.front === undefined) r.front = trail < 0 && s < back ? frontSpot(r, level) : null;
    if (r.front && s < r.front.at + 1.5) {
      framing = "front";
      const { at, side } = r.front;
      curve.pointAt(at, pA);
      const [fx, fz] = curve.directionAt(at);
      const px = pA[0] - fz * side;
      const pz = pA[2] + fx * side;
      const roof = Math.min(ceilingAtS(r, at), ceilingAtS(r, s));
      const camY = Math.max(floor + MIN_UP, Math.min(pA[1] + 2.6, roof - CEILING_GAP));
      return { cam: [px - pW[0], camY - floor, pz - pW[2]], look: [hx * 1.5, 1.2, hz * 1.5], roof };
    }
    if (trail < 0) {
      // Nowhere on the route behind sees the walker (just through a door into a turn): over the shoulder.
      framing = "shoulder";
      const roof = ceilingAtS(r, s);
      const oy = Math.max(MIN_UP, Math.min(1.9, roof - floor - CEILING_GAP));
      curve.pointAt(Math.min(L, s + 6), pA);
      return { cam: [-hx * MIN_TRAIL, oy, -hz * MIN_TRAIL], look: [pA[0] - pW[0], pA[1] - routeY + 1.2, pA[2] - pW[2]], roof };
    }
    framing = trail < back - 1e-6 ? "pulled" : "chase";
    const p = trailPoint(r, trail, pB);
    // Every ceiling the camera may meet in the next half second: over the route from its trailing point
    // to just ahead of the walker, over where the camera is now and over where it is heading.
    let roof = lowestCeiling(r, s - trail, Math.min(L, s + LOOKAHEAD + 1.2));
    // Over the camera, the floor that counts is the higher of the walker's and the trailing point's: coming
    // down a stair, the landing the camera hovers over is under it, not a ceiling.
    // Better still, the modelled floor under the trailing point: going up a covered stair to a deck, the
    // stair's roof over the camera sits less than a storey over the walker but well over the treads.
    camFloor = surfaces?.floorAt(p[0], p[2], p[1]) ?? Math.max(floor, p[1]);
    if (surfaces) {
      // Along the camera's way from where it is to where it is heading, and a second of walking on.
      const cx = pW[0] + cam[0];
      const cz = pW[2] + cam[2];
      const v = velocity(r, s);
      for (let k = 0; k <= 4; k++) {
        const f = k / 4;
        const x = cx + (p[0] - cx) * f + hx * v * f;
        const z = cz + (p[2] - cz) * f + hz * v * f;
        const c = surfaces.ceilingAt(x, z, camFloor);
        if (c !== null && Number.isFinite(c)) roof = Math.min(roof, c);
      }
    }
    // Coming down a stair the route behind is higher: stay clear above it — but under every ceiling.
    let oy = Math.max(up, p[1] - routeY + 1.2);
    oy = Math.max(MIN_UP, Math.min(oy, roof - CEILING_GAP - floor));
    curve.pointAt(Math.min(L, s + ahead), pA);
    return {
      cam: [p[0] - pW[0], oy, p[2] - pW[2]],
      look: [pA[0] - pW[0], pA[1] - routeY + 1.0, pA[2] - pW[2]],
      roof,
    };
  }

  /**
   * Where the start camera waits: a spot on or beside the route ahead (6, 9 or 12 m out, 2.6 m to
   * either side or on the route itself) that is in the open and sees the start. null = none.
   */
  function frontSpot(r: Running, level: LevelId | undefined): { at: number; side: number } | null {
    const start = r.curve.pointAt(0, pC);
    const sx = start[0];
    const sy = start[1];
    const sz = start[2];
    for (const at of [6, 9, 12]) {
      if (at > r.curve.length * 0.5) break;
      r.curve.pointAt(at, pA);
      const [fx, fz] = r.curve.directionAt(at);
      for (const side of [2.6, -2.6, 0]) {
        const p: V3 = [pA[0] - fz * side, pA[1] + 2.6, pA[2] + fx * side];
        if (opts.solidAt?.(p[0], p[1], p[2], [level, segmentLevel(r, at)])) continue;
        if (!wallsClear([p[0], p[2]], [sx, sz], [level, segmentLevel(r, at)])) continue;
        if (opts.sightBlocked?.([sx, sy + 1.5, sz], p)) continue;
        return { at, side };
      }
    }
    // Last resort: on the route itself a few metres out, wherever it is open — never behind the walker,
    // in the building it is leaving.
    const at = Math.min(6, r.curve.length * 0.4);
    r.curve.pointAt(at, pA);
    return opts.solidAt?.(pA[0], pA[1] + 2.6, pA[2], [level, segmentLevel(r, at)]) ? null : { at, side: 0 };
  }

  function frame(r: Running, dt: number): TourFrame {
    const level = placeWalker(r);
    const want = desired(r, mode, level);
    if (snap) {
      springSnap(cam, want.cam[0], want.cam[1], want.cam[2]);
      springSnap(look, want.look[0], want.look[1], want.look[2]);
      springSnap(base, pW[1], 0, 0);
      snap = false;
    } else if (dt > 0) {
      // Smooth only the *offsets* from the walker: no lag on straights, gentle swings on bends
      // (a first-person offset is constant, so its rate only shapes the switch between modes).
      if (mode === "first") {
        springTo(cam, want.cam[0], want.cam[1], want.cam[2], 6, dt);
      } else {
        // Pulling in (a door, a turn behind it) is quick; easing back out afterwards is gentle.
        const now = Math.hypot(cam[0], cam[2]);
        const next = Math.hypot(want.cam[0], want.cam[2]);
        const horizontal = next < now - 0.25 ? PULL_IN : framing === "chase" && next > now + 0.25 ? EASE_OUT : FOLLOW;
        springStep(cam, 0, want.cam[0], horizontal, dt);
        springStep(cam, 2, want.cam[2], horizontal, dt);
        // Down under a roof quickly, back up slowly.
        springStep(cam, 1, want.cam[1], want.cam[1] < cam[1] - 0.1 ? PULL_IN : FOLLOW, dt);
      }
      springTo(look, want.look[0], want.look[1], want.look[2], mode === "first" ? 4 : 3.5, dt);
      springStep(base, 0, pW[1], 6, dt);
    }
    const by = base[0];
    const walker = new Vector3(pW[0], pW[1], pW[2]);
    const position = new Vector3(pW[0] + cam[0], by + cam[1], pW[2] + cam[2]);
    let clamped: TourFrame["clamped"];
    if (mode === "chase" && opts.sightClear) {
      // Last resort (the springs normally get there first): never behind a wall — pulled in as far as
      // the walker shows (bisected).
      const from: V2 = [pW[0], pW[2]];
      const camLevel = r.levels ? segmentLevel(r, Math.max(0, s - Math.hypot(cam[0], cam[2]))) : level;
      if (!opts.sightClear(from, [position.x, position.z], pW[1], [level, camLevel])) {
        let lo = 0;
        let hi = 1;
        for (let i = 0; i < 6; i++) {
          const mid = (lo + hi) / 2;
          if (opts.sightClear(from, [pW[0] + cam[0] * mid, pW[2] + cam[2] * mid], pW[1], [level, camLevel])) lo = mid;
          else hi = mid;
        }
        position.set(pW[0] + cam[0] * lo, by + cam[1], pW[2] + cam[2] * lo);
        clamped = "wall";
      }
    } else if (mode === "chase") {
      // Last resort (the springs normally get there first): never through a wall…
      const index = indexFor(level);
      if (index) {
        const from: V2 = [pW[0], pW[2]];
        const to: V2 = [position.x, position.z];
        const near = index.query(
          Math.min(from[0], to[0]) - 0.5,
          Math.min(from[1], to[1]) - 0.5,
          Math.max(from[0], to[0]) + 0.5,
          Math.max(from[1], to[1]) + 0.5,
        );
        if (near.length) {
          const f = castCircle(from, to, 0.25, near);
          if (f < 1) {
            const k = Math.max(0, f - 0.02);
            position.set(pW[0] + cam[0] * k, by + cam[1], pW[2] + cam[2] * k);
            clamped = "wall";
          }
        }
      }
    }
    if (mode === "chase" && opts.solidAt) {
      // …nor inside a closed building (a route along its wall, a lateral swing): towards the walker.
      const levels = [level, r.levels ? segmentLevel(r, Math.max(0, s - Math.hypot(cam[0], cam[2]))) : level];
      if (opts.solidAt(position.x, position.y, position.z, levels) && !opts.solidAt(pW[0], position.y, pW[2], levels)) {
        let lo = 0;
        let hi = 1;
        const ox = position.x - pW[0];
        const oz = position.z - pW[2];
        for (let i = 0; i < 6; i++) {
          const mid = (lo + hi) / 2;
          if (opts.solidAt(pW[0] + ox * mid, position.y, pW[2] + oz * mid, levels)) hi = mid;
          else lo = mid;
        }
        position.set(pW[0] + ox * lo, position.y, pW[2] + oz * lo);
        clamped ??= "wall";
      }
    }
    if (mode === "chase") {
      // …and never in a ceiling: under the lowest one over the camera and its sight line.
      const roof = Math.min(want.roof, surfaces?.ceilingAt(position.x, position.z, camFloor) ?? Infinity);
      if (Number.isFinite(roof)) {
        // Above the walker's shoulders when the roof leaves room — under the roof always (a steep covered
        // stair: lower than the walker rather than inside the roof).
        const y = Math.max(Math.min(pW[1] + MIN_UP * 0.8, roof - CEILING_GAP), Math.min(position.y, roof - CEILING_GAP));
        if (y < position.y - 1e-6) clamped ??= "ceiling";
        position.y = y;
      }
      opts.constrain?.(position, walker);
    }
    const target = new Vector3(pW[0] + look[0], by + look[1], pW[2] + look[2]);
    // Where the camera is along the route: as far behind the walker as it trails (pulled in by walls).
    const trail = mode === "chase" && framing !== "front" ? Math.hypot(position.x - pW[0], position.z - pW[2]) : 0;
    const cameraLevel = r.levels ? (segmentLevel(r, Math.max(0, s - trail)) ?? level) : level;
    const [hx, hz] = r.curve.directionAt(s);
    const heading = ((Math.atan2(hx, -hz) * DEG) % 360 + 360) % 360;
    const t = r.curve.tOf(s);
    const caption = captionAt(r.captions, t);
    return {
      position,
      target,
      t,
      caption: caption.text,
      walker,
      heading,
      step: caption.index,
      level,
      cameraLevel,
      done: s >= r.curve.length,
      framing,
      clamped,
    };
  }

  return {
    start(path, startMode) {
      if (!path || !Array.isArray(path.points) || path.points.length === 0) {
        run = null;
        return;
      }
      run = prepare(path);
      mode = startMode;
      s = 0;
      isPaused = false;
      snap = true;
    },
    stop() {
      run = null;
    },
    pause(on) {
      isPaused = on;
    },
    paused: () => isPaused,
    seek(t) {
      if (!run) return;
      const clamped = Number.isFinite(t) ? Math.max(0, Math.min(1, t)) : 0;
      s = run.curve.sOf(clamped);
      run.front = undefined;
      snap = true;
    },
    setMode(next) {
      mode = next;
    },
    setColliders(colliders, walkAreas) {
      walls = colliders;
      if (walkAreas) areas = walkAreas;
      indexes.clear();
    },
    setSurfaces(next) {
      surfaces = next;
      if (run) {
        run.floors.fill(Number.NaN);
        run.ceilings.fill(Number.NaN);
      }
    },
    info: () => (run ? { id: run.path.id, length: run.curve.length, duration: run.duration } : null),
    update(dt) {
      if (!run) return null;
      const step = Number.isFinite(dt) ? Math.max(0, Math.min(0.25, dt)) : 0;
      const L = run.curve.length;
      if (!isPaused && s < L && step > 0) {
        // Midpoint integration of ds/dt = v(s): steady, deterministic, no overshoot of the end.
        const mid = Math.min(L, s + (velocity(run, s) * step) / 2);
        s = Math.min(L, s + velocity(run, mid) * step);
      }
      return frame(run, step);
    },
  };
}
