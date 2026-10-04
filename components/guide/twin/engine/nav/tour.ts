import { Vector3 } from "three";
import type { Collider2D, LevelId, V2, V3, WalkArea } from "../types";
import { castCircle, clearance, indexColliders, levelAt, type ColliderIndex } from "./collision";

/**
 * Guided tours: an avatar walks a route polyline at a steady pace while the
 * camera follows it — chase (7 m behind, 3.2 m up, looking 6 m ahead; tighter
 * indoors, under the ceilings) or first person at eye height. The camera rides
 * on spring-smoothed offsets from the walker, so straights have no lag, bends
 * swing gently and stairs glide; walls between walker and camera pull it in.
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
  /** Ground height for the outdoor parts of a route (needs `levels`): the walker is snapped onto it. */
  heightAt?(x: number, z: number): number | null | undefined;
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
}

const PROFILE_STEP = 0.5;
/** Half-width (m) of the blend between segment paces. */
const PROFILE_BLEND = 5;

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
        heightAt: ground ? (gx, gz, level) => (level === "outdoor" ? ground(gx, gz) : null) : undefined,
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
    const r: Running = { path, curve, captions, profile, levels, duration: 0 };
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

  /** Put the walker at s (snapped to the ground outdoors when heightAt is given); returns its level. */
  function placeWalker(r: Running): LevelId | undefined {
    r.curve.pointAt(s, pW);
    routeY = pW[1];
    const level = levelAtS(r, s, pW[1], pW[0], pW[2]);
    if (opts.heightAt && level === "outdoor") {
      const h = opts.heightAt(pW[0], pW[2]);
      if (h !== null && h !== undefined && Number.isFinite(h)) pW[1] = h;
    }
    return level;
  }

  /** Desired camera and look-at offsets from the walker's base height. */
  function desired(r: Running, frameMode: "chase" | "first", level: LevelId | undefined) {
    const curve = r.curve;
    const L = curve.length;
    const [hx, hz] = curve.directionAt(s);
    if (frameMode === "first") {
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
      return { cam: [0, eye, 0], look: [lx, eye + ly, lz] };
    }
    const { back, up, ahead } = level !== undefined && level !== "outdoor" ? indoorChase : outdoorChase;
    // Chase: trail the route `back` metres behind (beyond the start, extend the first direction backwards).
    let bx: number;
    let by: number;
    let bz: number;
    if (s >= back) {
      curve.pointAt(s - back, pB);
      bx = pB[0];
      by = pB[1];
      bz = pB[2];
    } else {
      curve.pointAt(0, pB);
      const [sx, sz] = curve.directionAt(0);
      bx = pB[0] - sx * (back - s);
      by = pB[1];
      bz = pB[2] - sz * (back - s);
    }
    let ox = bx - pW[0];
    let oz = bz - pW[2];
    const ol = Math.hypot(ox, oz);
    // Tight bends bring the trailing point close; keep at least 60 % of the distance, directly behind.
    if (ol < 0.5) {
      ox = -hx * back * 0.6;
      oz = -hz * back * 0.6;
    } else if (ol < back * 0.6) {
      ox *= (back * 0.6) / ol;
      oz *= (back * 0.6) / ol;
    }
    // Coming down a stair the route behind is higher: stay clear above it.
    const oy = Math.max(up, by - routeY + 1.2);
    curve.pointAt(Math.min(L, s + ahead), pA);
    return { cam: [ox, oy, oz], look: [pA[0] - pW[0], pA[1] - routeY + 1.0, pA[2] - pW[2]] };
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
      springTo(cam, want.cam[0], want.cam[1], want.cam[2], mode === "first" ? 6 : 2.6, dt);
      springTo(look, want.look[0], want.look[1], want.look[2], mode === "first" ? 4 : 3.5, dt);
      springStep(base, 0, pW[1], 6, dt);
    }
    const by = base[0];
    const walker = new Vector3(pW[0], pW[1], pW[2]);
    const position = new Vector3(pW[0] + cam[0], by + cam[1], pW[2] + cam[2]);
    if (mode === "chase") {
      // Never through a wall: pull in along the line of sight, then ease back out from there.
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
            cam[0] *= k;
            cam[2] *= k;
            cam[3] = 0;
            cam[5] = 0;
            position.set(pW[0] + cam[0], by + cam[1], pW[2] + cam[2]);
          }
        }
      }
      opts.constrain?.(position, walker);
    }
    const target = new Vector3(pW[0] + look[0], by + look[1], pW[2] + look[2]);
    // Where the camera is along the route: as far behind the walker as it trails (pulled in by walls).
    const trail = mode === "chase" ? Math.hypot(position.x - pW[0], position.z - pW[2]) : 0;
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
