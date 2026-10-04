import type { V2 } from "../../types";
import { cleanRing, ensureCCW, pointInRing, polygonBounds, ringArea } from "../../util";

/**
 * Building envelopes for the context ring (pure maths, unit-tested).
 *
 * A building is a set of prisms ("solids") — one per City of Turku LOD2 roof
 * part (or OSM part / outline) — standing on the ground and topped by a flat
 * or planar roof. Neighbouring solids hide parts of each other's walls: a wall
 * that runs along a taller neighbour is not built at all, one that rises above
 * a lower roof starts at that roof (so its first windows sit a storey above
 * it, like a real setback). wallSpans() splits every ring edge wherever the
 * neighbourhood changes and reports, per span, what covers it from outside.
 *
 * Frame: metres, +x east, +z south; rings counter-clockwise seen from above
 * (util.ringArea > 0); the outward normal of edge a→b is (−t.z, t.x).
 */

export interface Solid {
  /** Unique id ("osm-9033960#12"). */
  id: string;
  /** Owner (campus building id) — solids of one building share facade rules. */
  building: string;
  ring: V2[];
  /** Bottom of the walls (y). */
  base: number;
  /** Roof height at a point. */
  top: (x: number, z: number) => number;
  /** Flat roof level (y) when the roof is flat. */
  flatY: number | null;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Modelled by another module (a hero building): hides walls but is never built here. */
  ghost?: boolean;
  /** Free tag for style rules ("glass", "plant", "canopy" …). */
  tag?: string;
  /** Year of the LOD2 record (style rules for mixed old/new buildings). */
  year?: number;
}

/** A solid from a ring and a flat roof or a roof plane through the ring's vertices. */
export function makeSolid(
  id: string,
  building: string,
  ring: readonly V2[],
  base: number,
  roof: number | { ys: readonly number[] },
  extra: Partial<Pick<Solid, "ghost" | "tag" | "year">> = {},
): Solid | null {
  const cleaned = cleanRing(ring);
  if (cleaned.length < 3 || Math.abs(ringArea(cleaned)) < 0.5) return null;
  // Keep the ys aligned with the cleaned ring before re-orienting.
  let ys: number[] | null = null;
  if (typeof roof !== "number") {
    ys = alignHeights(ring, cleaned, roof.ys);
    if (!ys) return null;
  }
  const ccw = ringArea(cleaned) >= 0;
  const finalRing = ccw ? cleaned : cleaned.slice().reverse();
  const b = polygonBounds(finalRing);
  let top: (x: number, z: number) => number;
  let flatY: number | null = null;
  if (typeof roof === "number") {
    flatY = roof;
    top = () => roof;
  } else {
    top = planeThrough(cleaned, ys as number[]);
  }
  return { id, building, ring: finalRing, base, top, flatY, ...b, ...extra };
}

/** Heights of the cleaned ring's vertices, looked up from the original ring (same points, some dropped). */
function alignHeights(original: readonly V2[], cleaned: readonly V2[], ys: readonly number[]): number[] | null {
  if (ys.length !== original.length) return null;
  const out: number[] = [];
  let j = 0;
  for (const p of cleaned) {
    while (j < original.length && Math.hypot(original[j][0] - p[0], original[j][1] - p[1]) > 1e-3) j++;
    if (j >= original.length) return null;
    out.push(ys[j]);
  }
  return out;
}

/** Least-squares plane y = a·x + b·z + c through points (sloped LOD2 roof faces). */
export function planeThrough(ring: readonly V2[], ys: readonly number[]): (x: number, z: number) => number {
  let sx = 0, sz = 0, sy = 0, sxx = 0, szz = 0, sxz = 0, sxy = 0, szy = 0;
  const n = ring.length;
  // Centre the coordinates for numerical stability.
  let cx = 0;
  let cz = 0;
  for (const [x, z] of ring) {
    cx += x / n;
    cz += z / n;
  }
  for (let i = 0; i < n; i++) {
    const x = ring[i][0] - cx;
    const z = ring[i][1] - cz;
    const y = ys[i];
    sx += x;
    sz += z;
    sy += y;
    sxx += x * x;
    szz += z * z;
    sxz += x * z;
    sxy += x * y;
    szy += z * y;
  }
  // Solve [sxx sxz sx; sxz szz sz; sx sz n] · [a b c] = [sxy szy sy].
  const m = [sxx, sxz, sx, sxz, szz, sz, sx, sz, n];
  const det = det3(m);
  if (Math.abs(det) < 1e-9) {
    const avg = sy / Math.max(1, n);
    return () => avg;
  }
  const a = det3([sxy, sxz, sx, szy, szz, sz, sy, sz, n]) / det;
  const b = det3([sxx, sxy, sx, sxz, szy, sz, sx, sy, n]) / det;
  const c = det3([sxx, sxz, sxy, sxz, szz, szy, sx, sz, sy]) / det;
  return (x, z) => a * (x - cx) + b * (z - cz) + c;
}

function det3(m: readonly number[]): number {
  return m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
}

// ── Spatial index ────────────────────────────────────────────────────────────

/** Uniform grid over solid bounds — neighbour queries for wallSpans(). */
export class SolidIndex {
  private cells = new Map<string, Solid[]>();
  constructor(
    readonly solids: readonly Solid[],
    private cell = 24,
  ) {
    for (const s of solids) {
      for (let i = Math.floor(s.minX / cell); i <= Math.floor(s.maxX / cell); i++) {
        for (let j = Math.floor(s.minZ / cell); j <= Math.floor(s.maxZ / cell); j++) {
          const k = `${i},${j}`;
          let list = this.cells.get(k);
          if (!list) this.cells.set(k, (list = []));
          list.push(s);
        }
      }
    }
  }

  /** Solids whose bounds touch the box (each once). */
  query(minX: number, maxX: number, minZ: number, maxZ: number): Solid[] {
    const out = new Set<Solid>();
    const c = this.cell;
    for (let i = Math.floor(minX / c); i <= Math.floor(maxX / c); i++) {
      for (let j = Math.floor(minZ / c); j <= Math.floor(maxZ / c); j++) {
        for (const s of this.cells.get(`${i},${j}`) ?? []) {
          if (s.maxX >= minX && s.minX <= maxX && s.maxZ >= minZ && s.minZ <= maxZ) out.add(s);
        }
      }
    }
    return [...out];
  }

  /** Highest solid (other than `self`) containing the point, and its roof there. */
  coverAt(p: V2, self: Solid | null): { solid: Solid | null; y: number } {
    let best: Solid | null = null;
    let y = -Infinity;
    for (const s of this.query(p[0], p[0], p[1], p[1])) {
      if (s === self) continue;
      if (!pointInRing(p, s.ring)) continue;
      const t = s.top(p[0], p[1]);
      if (t > y) {
        y = t;
        best = s;
      }
    }
    return { solid: best, y };
  }
}

// ── Wall spans ───────────────────────────────────────────────────────────────

export interface WallSpan {
  solid: Solid;
  /** Ring edge index (a = ring[edge], b = ring[edge + 1]). */
  edge: number;
  a: V2;
  b: V2;
  /** Metres along the ring from vertex 0 (continuous round the building). */
  u0: number;
  u1: number;
  /** Outward unit normal. */
  n: V2;
  /** True where the span starts / ends at a ring vertex. */
  atStart: boolean;
  atEnd: boolean;
  /** Roof of whatever stands against the wall outside (−Infinity = open air), at a and b. */
  cover0: number;
  cover1: number;
  coverSolid: Solid | null;
}

const EPS_T = 1e-6;

/**
 * The visible wall spans of a solid: each ring edge split where neighbouring
 * solids start or stop touching it, with the neighbour's roof as the cover.
 * `probe` = how far outside the wall the neighbourhood is sampled (m).
 */
export function wallSpans(solid: Solid, index: SolidIndex, opts: { probe?: number; tol?: number; minSpan?: number } = {}): WallSpan[] {
  const probe = opts.probe ?? 0.2;
  const tol = opts.tol ?? 0.12;
  const minSpan = opts.minSpan ?? 0.05;
  const ring = solid.ring;
  const n = ring.length;
  const out: WallSpan[] = [];
  let u = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 1e-3) continue;
    const tx = dx / len;
    const tz = dz / len;
    const nx = -tz;
    const nz = tx;
    const ts = [0, 1];
    const pad = tol + probe;
    const near = index.query(Math.min(a[0], b[0]) - pad, Math.max(a[0], b[0]) + pad, Math.min(a[1], b[1]) - pad, Math.max(a[1], b[1]) + pad);
    for (const o of near) {
      if (o === solid) continue;
      const r = o.ring;
      for (let j = 0; j < r.length; j++) {
        const c = r[j];
        const d = r[(j + 1) % r.length];
        // Vertices of the neighbour lying on (or next to) this edge.
        for (const p of [c, d]) {
          const along = (p[0] - a[0]) * tx + (p[1] - a[1]) * tz;
          const off = Math.abs((p[0] - a[0]) * nx + (p[1] - a[1]) * nz);
          if (off <= tol && along > 0 && along < len) ts.push(along / len);
        }
        // Proper crossings.
        const t = segmentCrossing(a, b, c, d);
        if (t !== null) ts.push(t);
      }
    }
    ts.sort((p, q) => p - q);
    const cuts: number[] = [];
    for (const t of ts) {
      if (!cuts.length || (t - cuts[cuts.length - 1]) * len > minSpan) cuts.push(t);
      else if (t === 1) cuts[cuts.length - 1] = 1;
    }
    if (cuts[cuts.length - 1] !== 1) cuts.push(1);
    for (let k = 0; k + 1 < cuts.length; k++) {
      const t0 = cuts[k];
      const t1 = cuts[k + 1];
      if ((t1 - t0) * len < minSpan) continue;
      const pa: V2 = [a[0] + dx * t0, a[1] + dz * t0];
      const pb: V2 = [a[0] + dx * t1, a[1] + dz * t1];
      // Sample the neighbourhood just outside the middle of the span; ends nudged inwards.
      const tm = (t0 + t1) / 2;
      const mid: V2 = [a[0] + dx * tm + nx * probe, a[1] + dz * tm + nz * probe];
      const { solid: cs } = index.coverAt(mid, solid);
      let c0 = -Infinity;
      let c1 = -Infinity;
      if (cs) {
        const inset = Math.min(0.1, ((t1 - t0) * len) / 4);
        const e0: V2 = [pa[0] + tx * inset + nx * probe, pa[1] + tz * inset + nz * probe];
        const e1: V2 = [pb[0] - tx * inset + nx * probe, pb[1] - tz * inset + nz * probe];
        c0 = cs.top(e0[0], e0[1]);
        c1 = cs.top(e1[0], e1[1]);
      }
      out.push({
        solid,
        edge: i,
        a: pa,
        b: pb,
        u0: u + t0 * len,
        u1: u + t1 * len,
        n: [nx, nz],
        atStart: t0 < EPS_T,
        atEnd: t1 > 1 - EPS_T,
        cover0: c0,
        cover1: c1,
        coverSolid: cs,
      });
    }
    u += len;
  }
  return out;
}

/** Parameter t on a→b where it properly crosses c→d (null when parallel or not crossing). */
export function segmentCrossing(a: V2, b: V2, c: V2, d: V2): number | null {
  const rx = b[0] - a[0];
  const rz = b[1] - a[1];
  const sx = d[0] - c[0];
  const sz = d[1] - c[1];
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const qx = c[0] - a[0];
  const qz = c[1] - a[1];
  const t = (qx * sz - qz * sx) / den;
  const s = (qx * rz - qz * rx) / den;
  if (t <= EPS_T || t >= 1 - EPS_T || s < -EPS_T || s > 1 + EPS_T) return null;
  return t;
}

// ── Pilasters ────────────────────────────────────────────────────────────────

/**
 * Centres of pilasters along a wall span (metres from span.a): one at each end that is a ring
 * corner, then every `pitch` m on the wall line's own grid (u = position along the line, so
 * collinear spans share the rhythm), clear of the corner piers.
 */
export function pilasterCentres(span: Pick<WallSpan, "a" | "b" | "atStart" | "atEnd">, pitch: number, width: number): number[] {
  const len = Math.hypot(span.b[0] - span.a[0], span.b[1] - span.a[1]);
  if (len < width + 0.4 || pitch <= width) return [];
  const t: V2 = [(span.b[0] - span.a[0]) / len, (span.b[1] - span.a[1]) / len];
  const u0 = span.a[0] * t[0] + span.a[1] * t[1];
  const at: number[] = [];
  if (span.atStart) at.push(width / 2);
  if (span.atEnd) at.push(len - width / 2);
  for (let k = Math.ceil((u0 + width) / pitch); k * pitch - u0 < len - width; k++) {
    const s = k * pitch - u0;
    if (at.some((x) => Math.abs(x - s) < pitch * 0.45)) continue;
    at.push(s);
  }
  return at.sort((p, q) => p - q);
}

// ── Parapet insets ───────────────────────────────────────────────────────────

/**
 * The ring moved inwards by `d` (mitred, capped at `cap`·d for sharp corners):
 * the inner line of a parapet. Index i matches ring[i].
 */
export function insetRing(ring: readonly V2[], d: number, cap = 3): V2[] {
  const n = ring.length;
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const p = ring[(i + n - 1) % n];
    const c = ring[i];
    const q = ring[(i + 1) % n];
    const n0 = edgeNormal(p, c);
    const n1 = edgeNormal(c, q);
    let mx = n0[0] + n1[0];
    let mz = n0[1] + n1[1];
    const ml = Math.hypot(mx, mz);
    if (ml < 1e-6) {
      mx = n1[0];
      mz = n1[1];
    } else {
      mx /= ml;
      mz /= ml;
    }
    // Distance along the bisector so both edges move by d.
    const cos = Math.max(1 / cap, mx * n1[0] + mz * n1[1]);
    const k = d / cos;
    out.push([c[0] - mx * k, c[1] - mz * k]);
  }
  return out;
}

/** Outward unit normal of a→b for a CCW ring. */
export function edgeNormal(a: V2, b: V2): V2 {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l = Math.hypot(dx, dz) || 1;
  return [-dz / l, dx / l];
}

// ── Storeys ──────────────────────────────────────────────────────────────────

/**
 * Scale for the facade's storey grid so a building of `levels` storeys and
 * main-roof height `height` (above its lowest ground) shows exactly that many
 * floors with a family's storey heights: v_facade = (y − ground)·k.
 * 1 when the data is missing or implausible; clamped to ±25 %.
 */
export function storeyScale(height: number, levels: number | undefined, storey: number, groundStorey = storey, parapet = 0.5): number {
  if (!levels || levels < 1 || !(height > 2)) return 1;
  const natural = groundStorey + (levels - 1) * storey + parapet;
  const k = natural / height;
  return Math.min(1.25, Math.max(0.8, k));
}

/** Ensure counter-clockwise orientation and drop duplicate points (re-exported for builders). */
export function tidyRing(ring: readonly V2[]): V2[] {
  return ensureCCW(cleanRing(ring));
}
