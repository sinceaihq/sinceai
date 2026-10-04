import type { Collider2D, LevelId, V2, WalkArea } from "../types";

/**
 * Walk-mode collision in 2D (x, z metres): a circle — the walker, r ≈ 0.3 m —
 * among the wall segments and round columns of one level, plus the walk-area
 * helpers (which level and floor height is under a point). Pure functions,
 * no three.js, unit-tested in __tests__/collision.test.ts.
 *
 * moveCircle is "collide and slide" with swept (continuous) contact: the
 * circle travels to its first contact, the rest of the move is projected onto
 * the wall, and that repeats. Long moves are cut into sub-steps shorter than
 * the radius, so sliding past the end of a wall turns back into the wanted
 * direction; a push-out pass separates a circle that starts inside a wall
 * (after a level change or a teleport). A thin wall can't be tunnelled
 * through at any speed, and a concave corner stops the circle without jitter.
 */

/** Gap kept between the circle and a wall after a contact (m). */
const SKIN = 1e-3;
/** Slides per sub-step: wall, corner, and two more for curved walls made of short segments. */
const MAX_SLIDES = 4;
/** Push-out passes for a circle that starts overlapping something. */
const MAX_PUSH = 8;
/** Sub-steps per move (≈ 11 m at full fidelity for r = 0.3; a walking frame needs one). */
const MAX_SUBSTEPS = 48;
const EPS = 1e-12;

/** Even-odd test; works with or without a repeated last vertex and with either winding. */
export function pointInPolygon(p: V2, poly: V2[]): boolean {
  const x = p[0];
  const z = p[1];
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// ── Contacts ────────────────────────────────────────────────────────────────

interface Contact {
  /** Fraction of the move at first contact (0…1). */
  t: number;
  /** Contact normal, pointing from the obstacle towards the circle. */
  nx: number;
  nz: number;
  /** Index of the collider in the candidate list; −1 = none. */
  i: number;
}

function record(hit: Contact, t: number, nx: number, nz: number, i: number) {
  if (t <= hit.t) {
    hit.t = t;
    hit.nx = nx;
    hit.nz = nz;
    hit.i = i;
  }
}

/** Circle (centre p, radius R) moving by d against a point q. */
function sweepPoint(
  px: number,
  pz: number,
  dx: number,
  dz: number,
  R: number,
  qx: number,
  qz: number,
  i: number,
  hit: Contact,
) {
  const fx = px - qx;
  const fz = pz - qz;
  const c = fx * fx + fz * fz - R * R;
  const b = fx * dx + fz * dz;
  if (c < 0) {
    // Already overlapping: only block motion further in (push-out separates them).
    if (b < 0) {
      const d = Math.sqrt(fx * fx + fz * fz);
      if (d > 1e-7) record(hit, 0, fx / d, fz / d, i);
      else {
        const m = Math.sqrt(dx * dx + dz * dz);
        if (m > EPS) record(hit, 0, -dx / m, -dz / m, i);
      }
    }
    return;
  }
  if (b >= 0) return;
  const a = dx * dx + dz * dz;
  if (a < EPS) return;
  const disc = b * b - a * c;
  if (disc < 0) return;
  const t = (-b - Math.sqrt(disc)) / a;
  if (t < 0 || t > hit.t) return;
  record(hit, t, (fx + dx * t) / R, (fz + dz * t) / R, i);
}

/** Circle (centre p, radius r) moving by d against one collider; keeps the earliest contact in `hit`. */
function sweepCollider(
  px: number,
  pz: number,
  dx: number,
  dz: number,
  r: number,
  col: Collider2D,
  i: number,
  hit: Contact,
) {
  if (col.kind === "circle") {
    sweepPoint(px, pz, dx, dz, r + col.r, col.c[0], col.c[1], i, hit);
    return;
  }
  const ax = col.a[0];
  const az = col.a[1];
  const bx = col.b[0];
  const bz = col.b[1];
  const ex = bx - ax;
  const ez = bz - az;
  const len2 = ex * ex + ez * ez;
  if (len2 < EPS) {
    sweepPoint(px, pz, dx, dz, r, ax, az, i, hit);
    return;
  }
  let u = ((px - ax) * ex + (pz - az) * ez) / len2;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const ox = px - (ax + ex * u);
  const oz = pz - (az + ez * u);
  const d2 = ox * ox + oz * oz;
  if (d2 < r * r) {
    // Already overlapping: block motion further in only.
    let nx: number;
    let nz: number;
    const d = Math.sqrt(d2);
    if (d > 1e-7) {
      nx = ox / d;
      nz = oz / d;
    } else {
      // Centre exactly on the wall: treat the wall as facing against the motion.
      const len = Math.sqrt(len2);
      nx = -ez / len;
      nz = ex / len;
      if (nx * dx + nz * dz > 0) {
        nx = -nx;
        nz = -nz;
      }
    }
    if (nx * dx + nz * dz < 0) record(hit, 0, nx, nz, i);
    return;
  }
  // The face: the circle touches the wall's line where its distance to it equals r.
  const len = Math.sqrt(len2);
  let nx = -ez / len;
  let nz = ex / len;
  let s0 = (px - ax) * nx + (pz - az) * nz;
  if (s0 < 0) {
    nx = -nx;
    nz = -nz;
    s0 = -s0;
  }
  if (s0 >= r) {
    const vn = dx * nx + dz * nz;
    // Parallel or moving away: neither the face nor an end can be reached.
    if (vn >= -EPS) return;
    const t = (s0 - r) / -vn;
    // Nothing on this wall can be touched before its line is reached.
    if (t > hit.t) return;
    const qx = px + dx * t - nx * r - ax;
    const qz = pz + dz * t - nz * r - az;
    const along = (qx * ex + qz * ez) / len2;
    if (along >= 0 && along <= 1) {
      record(hit, t, nx, nz, i);
      return;
    }
  }
  // Otherwise the first contact (if any) is one of the ends.
  sweepPoint(px, pz, dx, dz, r, ax, az, i, hit);
  sweepPoint(px, pz, dx, dz, r, bx, bz, i, hit);
}

const scratch: Contact = { t: 1, nx: 0, nz: 0, i: -1 };

function earliest(px: number, pz: number, dx: number, dz: number, r: number, cand: Collider2D[]): Contact {
  scratch.t = 1;
  scratch.i = -1;
  scratch.nx = 0;
  scratch.nz = 0;
  for (let i = 0; i < cand.length; i++) sweepCollider(px, pz, dx, dz, r, cand[i], i, scratch);
  return scratch;
}

/** Nearest point of a collider's surface to p: writes [qx, qz] and returns the signed gap (distance − radius). */
function surfaceGap(px: number, pz: number, col: Collider2D, q: number[]): number {
  if (col.kind === "circle") {
    q[0] = col.c[0];
    q[1] = col.c[1];
    return Math.hypot(px - q[0], pz - q[1]) - col.r;
  }
  const ax = col.a[0];
  const az = col.a[1];
  const ex = col.b[0] - ax;
  const ez = col.b[1] - az;
  const len2 = ex * ex + ez * ez;
  let u = len2 < EPS ? 0 : ((px - ax) * ex + (pz - az) * ez) / len2;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  q[0] = ax + ex * u;
  q[1] = az + ez * u;
  return Math.hypot(px - q[0], pz - q[1]);
}

const nearest = [0, 0];

/**
 * Separate a circle that overlaps colliders (after a teleport or a level
 * change). Every wall within reach is a half-plane constraint n·Δ ≥ need (its
 * outward normal, the distance still missing to the skin); cyclic projection
 * finds a small Δ meeting them all. Distance to a segment or a circle is
 * convex, so a Δ with n·Δ ≥ 0 for every nearby wall never brings any of them
 * closer — the push cannot cross a wall — and walls further away than the
 * push length can't be reached at all. Squeezed between walls closer than the
 * diameter, there is no such Δ and the circle stays put. `hint` decides the
 * side when the centre lies exactly on a wall.
 */
function pushOut(p: number[], r: number, cand: Collider2D[], hintX: number, hintZ: number) {
  const cons: number[] = [];
  for (let pass = 0; pass < MAX_PUSH; pass++) {
    cons.length = 0;
    let overlap = false;
    for (const col of cand) {
      const gap = surfaceGap(p[0], p[1], col, nearest);
      const reach = col.kind === "circle" ? r + col.r : r;
      const dist = col.kind === "circle" ? gap + col.r : gap;
      if (dist >= reach + SKIN) continue;
      if (reach - dist > 1e-6) overlap = true;
      let nx = p[0] - nearest[0];
      let nz = p[1] - nearest[1];
      const d = Math.hypot(nx, nz);
      if (d > 1e-7) {
        nx /= d;
        nz /= d;
      } else if (col.kind === "segment") {
        const ex = col.b[0] - col.a[0];
        const ez = col.b[1] - col.a[1];
        const len = Math.hypot(ex, ez) || 1;
        nx = -ez / len;
        nz = ex / len;
        if ((hintX - col.a[0]) * nx + (hintZ - col.a[1]) * nz < 0) {
          nx = -nx;
          nz = -nz;
        }
      } else {
        const hx = hintX - p[0];
        const hz = hintZ - p[1];
        const hl = Math.hypot(hx, hz);
        nx = hl > EPS ? hx / hl : 1;
        nz = hl > EPS ? hz / hl : 0;
      }
      cons.push(nx, nz, reach + SKIN - dist);
    }
    if (!overlap) return;
    let dx = 0;
    let dz = 0;
    for (let it = 0; it < 24; it++) {
      let moved = false;
      for (let k = 0; k < cons.length; k += 3) {
        const short = cons[k + 2] - (cons[k] * dx + cons[k + 1] * dz);
        if (short > 1e-9) {
          dx += cons[k] * short;
          dz += cons[k + 1] * short;
          moved = true;
        }
      }
      if (!moved) break;
    }
    for (let k = 0; k < cons.length; k += 3) if (cons[k] * dx + cons[k + 1] * dz < -1e-9) return;
    const len = Math.hypot(dx, dz);
    if (len < 1e-9) return;
    // At most r per pass: anything further than r + skin away stays out of reach.
    const k = len > r ? r / len : 1;
    p[0] += dx * k;
    p[1] += dz * k;
  }
}

/** Move by (mx, mz) sliding along whatever is hit; updates p in place. */
function slideStep(p: number[], mx: number, mz: number, r: number, cand: Collider2D[]) {
  let rx = mx;
  let rz = mz;
  for (let k = 0; k < MAX_SLIDES; k++) {
    const len = Math.hypot(rx, rz);
    if (len < 1e-9) return;
    const hit = earliest(p[0], p[1], rx, rz, r, cand);
    if (hit.i < 0) {
      p[0] += rx;
      p[1] += rz;
      return;
    }
    const adv = Math.max(0, hit.t - SKIN / len);
    p[0] += rx * adv;
    p[1] += rz * adv;
    let lx = rx * (1 - adv);
    let lz = rz * (1 - adv);
    const vn = lx * hit.nx + lz * hit.nz;
    if (vn < 0) {
      lx -= hit.nx * vn;
      lz -= hit.nz * vn;
    }
    // Never slide backwards against the wanted move (acute wedges).
    if (lx * mx + lz * mz <= 0) return;
    rx = lx;
    rz = lz;
  }
}

function colliderBox(col: Collider2D, out: number[]) {
  if (col.kind === "circle") {
    out[0] = col.c[0] - col.r;
    out[1] = col.c[1] - col.r;
    out[2] = col.c[0] + col.r;
    out[3] = col.c[1] + col.r;
  } else {
    out[0] = Math.min(col.a[0], col.b[0]);
    out[1] = Math.min(col.a[1], col.b[1]);
    out[2] = Math.max(col.a[0], col.b[0]);
    out[3] = Math.max(col.a[1], col.b[1]);
  }
}

const box = [0, 0, 0, 0];

/** Colliders whose bounds touch the box (minX, minZ, maxX, maxZ). */
function within(colliders: Collider2D[], minX: number, minZ: number, maxX: number, maxZ: number): Collider2D[] {
  const out: Collider2D[] = [];
  for (const col of colliders) {
    colliderBox(col, box);
    if (box[0] <= maxX && box[2] >= minX && box[1] <= maxZ && box[3] >= minZ) out.push(col);
  }
  return out;
}

/**
 * How far from `from` a moveCircle(from, to, r) can touch anything: the move's length (a slide
 * never travels further than that) plus a push-out and a margin. Pre-filter colliders with a box
 * of this half-size around `from` — not the box of from → to.
 */
export function moveReach(from: V2, to: V2, r: number): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1]) + 2 * r + 0.05;
}

/**
 * Move a circle (radius r) from `from` towards `to`, sliding along colliders;
 * returns the final position. Pass the colliders of one level (the caller
 * filters by level); a start inside a wall is pushed out first.
 */
export function moveCircle(from: V2, to: V2, r: number, colliders: Collider2D[]): V2 {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  if (!Number.isFinite(dx) || !Number.isFinite(dz) || !Number.isFinite(r) || r < 0) return [from[0], from[1]];
  // Sliding can carry the circle anywhere within the move's length of the start (along a slanted
  // wall, well outside the box of from → to), and a push-out by up to about r.
  const reach = moveReach(from, to, r);
  const cand = within(colliders, from[0] - reach, from[1] - reach, from[0] + reach, from[1] + reach);
  if (cand.length === 0) return [to[0], to[1]];
  const p = [from[0], from[1]];
  pushOut(p, r, cand, from[0] - dx, from[1] - dz);
  if (earliest(p[0], p[1], dx, dz, r, cand).i < 0) {
    // Nothing in the way: one swept test is enough.
    p[0] += dx;
    p[1] += dz;
  } else {
    // Sub-steps shorter than the radius make a slide turn back into the wanted direction once the wall
    // ends. Contacts are swept, so a step-count cap (absurdly long moves) only coarsens that, never tunnels.
    const dist = Math.hypot(dx, dz);
    const steps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(dist / Math.max(0.05, r * 0.75))));
    const sx = dx / steps;
    const sz = dz / steps;
    for (let s = 0; s < steps; s++) slideStep(p, sx, sz, r, cand);
  }
  pushOut(p, r, cand, from[0], from[1]);
  return [p[0], p[1]];
}

/**
 * How far a circle can travel from `from` to `to` before it touches a
 * collider, as a fraction 0…1 (1 = clear). Used for camera lines of sight.
 */
export function castCircle(from: V2, to: V2, r: number, colliders: Collider2D[]): number {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const pad = r + 0.05;
  const cand = within(
    colliders,
    Math.min(from[0], to[0]) - pad,
    Math.min(from[1], to[1]) - pad,
    Math.max(from[0], to[0]) + pad,
    Math.max(from[1], to[1]) + pad,
  );
  if (cand.length === 0) return 1;
  const hit = earliest(from[0], from[1], dx, dz, r, cand);
  return hit.i < 0 ? 1 : hit.t;
}

/** Distance from p to the nearest collider surface (Infinity when there are none). */
export function clearance(p: V2, colliders: Collider2D[]): number {
  let best = Infinity;
  for (const col of colliders) {
    const gap = surfaceGap(p[0], p[1], col, nearest);
    if (gap < best) best = gap;
  }
  return best;
}

// ── Spatial index ───────────────────────────────────────────────────────────

/** Uniform grid over colliders so a frame only tests the walls near the walker. */
export interface ColliderIndex {
  readonly colliders: Collider2D[];
  /** Colliders whose cells touch the box (each once). */
  query(minX: number, minZ: number, maxX: number, maxZ: number): Collider2D[];
}

const CELL_BIAS = 32768;
/** A collider spanning more cells than this goes to the always-tested list. */
const MAX_CELLS = 4096;

export function indexColliders(colliders: Collider2D[], cell = 2): ColliderIndex {
  const cells = new Map<number, number[]>();
  const always: number[] = [];
  const key = (i: number, j: number) => (i + CELL_BIAS) * 65536 + (j + CELL_BIAS);
  const add = (i: number, j: number, idx: number) => {
    const k = key(i, j);
    const list = cells.get(k);
    if (list) {
      if (list[list.length - 1] !== idx) list.push(idx);
    } else cells.set(k, [idx]);
  };
  colliders.forEach((col, idx) => {
    colliderBox(col, box);
    const i0 = Math.floor(box[0] / cell);
    const i1 = Math.floor(box[2] / cell);
    const j0 = Math.floor(box[1] / cell);
    const j1 = Math.floor(box[3] / cell);
    if (![i0, i1, j0, j1].every(Number.isFinite) || (i1 - i0 + 1) * (j1 - j0 + 1) > MAX_CELLS) {
      if ((i1 - i0 + 1) * (j1 - j0 + 1) > MAX_CELLS) always.push(idx);
      return;
    }
    if (col.kind === "circle" || i0 === i1 || j0 === j1) {
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) add(i, j, idx);
      return;
    }
    // A slanted segment: per row of cells, only the x-range the segment crosses.
    const [ax, az] = col.a;
    const [bx, bz] = col.b;
    const xAt = (z: number) => ax + ((bx - ax) * (z - az)) / (bz - az);
    for (let j = j0; j <= j1; j++) {
      const zLo = Math.max(box[1], j * cell);
      const zHi = Math.min(box[3], (j + 1) * cell);
      const xa = xAt(zLo);
      const xb = xAt(zHi);
      const lo = Math.floor(Math.min(xa, xb) / cell);
      const hi = Math.floor(Math.max(xa, xb) / cell);
      for (let i = Math.max(lo, i0); i <= Math.min(hi, i1); i++) add(i, j, idx);
    }
  });
  const stamp = new Uint32Array(colliders.length);
  let tick = 0;
  return {
    colliders,
    query(minX, minZ, maxX, maxZ) {
      tick = (tick + 1) >>> 0;
      if (tick === 0) {
        stamp.fill(0);
        tick = 1;
      }
      const out: Collider2D[] = [];
      for (const idx of always) {
        stamp[idx] = tick;
        out.push(colliders[idx]);
      }
      const i0 = Math.floor(minX / cell);
      const i1 = Math.floor(maxX / cell);
      const j0 = Math.floor(minZ / cell);
      const j1 = Math.floor(maxZ / cell);
      if ((i1 - i0 + 1) * (j1 - j0 + 1) > MAX_CELLS) return colliders.slice();
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          const list = cells.get(key(i, j));
          if (!list) continue;
          for (const idx of list) {
            if (stamp[idx] === tick) continue;
            stamp[idx] = tick;
            out.push(colliders[idx]);
          }
        }
      }
      return out;
    },
  };
}

// ── Walk areas: level and floor height under a point ───────────────────────

/** Floor height of a walk area at p; a ramp interpolates along slope.from → slope.to (clamped at the ends). */
export function floorY(area: WalkArea, p: V2): number {
  const s = area.slope;
  if (!s) return area.y;
  const dx = s.to[0] - s.from[0];
  const dz = s.to[1] - s.from[1];
  const len2 = dx * dx + dz * dz;
  if (len2 < EPS) return s.y0;
  let t = ((p[0] - s.from[0]) * dx + (p[1] - s.from[1]) * dz) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return s.y0 + (s.y1 - s.y0) * t;
}

/**
 * Optional floor-height override, e.g. the terrain for "outdoor"; null/undefined → the area's own
 * height. `area` is the walk area being asked about (undefined off every area), so an override can
 * leave areas with a floor of their own — bridge decks, stairs — alone.
 */
export type HeightAt = (x: number, z: number, level: LevelId, area?: WalkArea) => number | null | undefined;

/** Floor height at p on an area, honouring the override. */
export function areaFloor(area: WalkArea, p: V2, heightAt?: HeightAt): number {
  const h = heightAt?.(p[0], p[1], area.level, area);
  return h ?? floorY(area, p);
}

export interface LevelQuery {
  /** The level the walker is on now — kept while it still has floor here. */
  level?: LevelId;
  /** The walker's floor height now: only areas within ±tolerance count. */
  y?: number;
  /** Height window for changing level (default 0.6 m). */
  tolerance?: number;
  heightAt?: HeightAt;
}

export interface LevelHit {
  level: LevelId;
  /** Floor height at the point. */
  y: number;
  area: WalkArea;
}

/**
 * Which level (and floor height) is under p. Areas containing p are
 * candidates; with a current height only those within ±tolerance count (a
 * door between two levels at the same height switches level, a balcony above
 * doesn't). Preference: stay on the current indoor level; else an indoor level
 * (stepping in through a door wins over the street around it); else outdoor —
 * where a structure with a floor of its own (a stair, a bridge deck) wins over
 * the terrain under it, so a walker at the foot of a stair takes the stair
 * rather than walking on underneath it. Ties go to the floor nearest the
 * current height (or the lowest floor).
 */
export function levelAt(p: V2, walkAreas: WalkArea[], q: LevelQuery = {}): LevelHit | null {
  const tolerance = q.tolerance ?? 0.6;
  let best: LevelHit | null = null;
  let bestRank = Infinity;
  let bestScore = Infinity;
  for (const area of walkAreas) {
    if (!pointInPolygon(p, area.polygon)) continue;
    const own = q.heightAt?.(p[0], p[1], area.level, area);
    const onTerrain = own !== null && own !== undefined;
    const y = onTerrain ? own : floorY(area, p);
    if (q.y !== undefined && Math.abs(y - q.y) > tolerance + 1e-9) continue;
    const sameLevel = q.level !== undefined && area.level === q.level;
    const rank =
      (sameLevel && (q.level !== "outdoor" || q.y === undefined) ? 0 : area.level !== "outdoor" ? 1 : 2) * 2 + (onTerrain ? 1 : 0);
    const score = q.y !== undefined ? Math.abs(y - q.y) : y;
    if (rank < bestRank || (rank === bestRank && score < bestScore)) {
      best = { level: area.level, y, area };
      bestRank = rank;
      bestScore = score;
    }
  }
  return best;
}

/** Floor height of `level` at p (the area nearest `nearY` where floors overlap); null outside the level. */
export function floorHeight(
  p: V2,
  walkAreas: WalkArea[],
  level: LevelId,
  nearY?: number,
  heightAt?: HeightAt,
): number | null {
  let best: number | null = null;
  let bestScore = Infinity;
  for (const area of walkAreas) {
    if (area.level !== level || !pointInPolygon(p, area.polygon)) continue;
    const y = areaFloor(area, p, heightAt);
    const score = nearY !== undefined ? Math.abs(y - nearY) : y;
    if (score < bestScore) {
      best = y;
      bestScore = score;
    }
  }
  return best;
}

/**
 * First edge of a polygon crossed by the segment a→b, as the edge's unit
 * direction and the crossing fraction along a→b; null when none is crossed.
 */
export function crossedEdge(a: V2, b: V2, poly: V2[]): { t: number; ux: number; uz: number } | null {
  const rx = b[0] - a[0];
  const rz = b[1] - a[1];
  let best: { t: number; ux: number; uz: number } | null = null;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const sx = poly[i][0] - poly[j][0];
    const sz = poly[i][1] - poly[j][1];
    const den = rx * sz - rz * sx;
    if (Math.abs(den) < EPS) continue;
    const qx = poly[j][0] - a[0];
    const qz = poly[j][1] - a[1];
    const t = (qx * sz - qz * sx) / den;
    const u = (qx * rz - qz * rx) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) continue;
    if (!best || t < best.t) {
      const len = Math.hypot(sx, sz);
      best = { t, ux: sx / len, uz: sz / len };
    }
  }
  return best;
}
