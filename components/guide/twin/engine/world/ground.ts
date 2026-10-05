import * as THREE from "three";
import type { CameraView, Collider2D, LightingState, TwinContext, TwinTarget, V2, V3, WalkArea, WorldModule } from "../types";
import {
  loadCampus,
  loadStreets,
  loadTerrain,
  type CampusData,
  type StreetArea,
  type StreetsData,
  type Terrain,
} from "../data/campus";
import { cleanRing, clamp, ensureCCW, mulberry32, pointInRing, polygonBounds, polygonCentroid, ringArea, smoothstep } from "../util";
import { boxUV } from "../render/uv";
import { makeLabel } from "../labels";

/**
 * The ground of the whole campus (DESIGN §2, SPEC §2 and §4): terrain from
 * the 2021 laser DTM, every street surface of the City's street register
 * (carriageways, footways, cycle paths, verges, islands) draped on it with
 * crisp edges and real granite kerbs, OSM areas and paths beyond the
 * register, a land-cover splat for lawns, planting beds and yards, and a far
 * ring to the horizon.
 *
 * Height model: every surface follows the DTM, except within KERB_REACH of a
 * kerb line, where each side takes its own level (the 0.5 m DTM smooths the
 * 10–12 cm kerb upstand into a ramp) — so the step sits exactly on the kerb
 * line and the kerb stone fills it. Hard surfaces float SURFACE_LIFT above
 * the ground they meet; the terrain is sunk under them so it never shows
 * through.
 */

// ── Tunables ─────────────────────────────────────────────────────────────────

/** Band either side of a kerb line (m) where each side keeps its own level. */
export const KERB_REACH = 0.7;
/** Granite kerb: visible top width (m). */
const KERB_TOP = 0.15;
/** Hard surfaces float this much above the terrain they meet (m). */
const SURFACE_LIFT = 0.015;
/** Vertical skirt under the open edges of hard surfaces (m). */
const SKIRT = 0.2;
/** The terrain sinks this far under hard surfaces (m). */
const TERRAIN_SINK = 0.14;

// ── Small geometry helpers (pure, unit-tested) ───────────────────────────────

/** Sutherland–Hodgman: the part of a ring inside an axis-aligned box (may be empty). */
export function clipRingToBox(ring: readonly V2[], minX: number, minZ: number, maxX: number, maxZ: number): V2[] {
  let out: V2[] = ring.slice();
  const planes: [0 | 1, number, 1 | -1][] = [
    [0, minX, 1],
    [0, maxX, -1],
    [1, minZ, 1],
    [1, maxZ, -1],
  ];
  for (const [axis, value, keep] of planes) {
    if (out.length < 3) return [];
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i];
      const b = input[(i + 1) % input.length];
      const ina = (a[axis] - value) * keep >= 0;
      const inb = (b[axis] - value) * keep >= 0;
      if (ina) out.push(a);
      if (ina !== inb) {
        const t = (value - a[axis]) / (b[axis] - a[axis]);
        const p: V2 = axis === 0 ? [value, a[1] + (b[1] - a[1]) * t] : [a[0] + (b[0] - a[0]) * t, value];
        out.push(p);
      }
    }
  }
  return out;
}

/**
 * One ring from a polygon with holes: each hole is joined to the outer ring
 * by a pair of coincident bridge edges (as earcut does internally), so the
 * result can be clipped cell by cell like any simple ring.
 */
export function bridgeHoles(outer: readonly V2[], holes: readonly (readonly V2[])[]): V2[] {
  let ring = outer.slice();
  const sorted = holes
    .filter((h) => h.length >= 3)
    .map((h) => {
      // Holes run clockwise (opposite to the outer ring).
      const cw = ringArea(h) > 0 ? h.slice().reverse() : h.slice();
      let k = 0;
      for (let i = 1; i < cw.length; i++) if (cw[i][0] > cw[k][0]) k = i;
      return { hole: cw, k };
    })
    .sort((a, b) => b.hole[b.k][0] - a.hole[a.k][0]);
  for (const { hole, k } of sorted) {
    const hp = hole[k];
    // Nearest outer vertex that the bridge can reach without crossing the ring (nearest by distance is fine for convex-ish data).
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < ring.length; i++) {
      const d = Math.hypot(ring[i][0] - hp[0], ring[i][1] - hp[1]);
      if (d < bestD && !segmentCrossesRing(hp, ring[i], ring)) {
        bestD = d;
        best = i;
      }
    }
    const rotated = [...hole.slice(k), ...hole.slice(0, k), hole[k]];
    ring = [...ring.slice(0, best + 1), ...rotated, ring[best], ...ring.slice(best + 1)];
  }
  return ring;
}

function segmentCrossesRing(a: V2, b: V2, ring: readonly V2[]): boolean {
  for (let i = 0; i < ring.length; i++) {
    const c = ring[i];
    const d = ring[(i + 1) % ring.length];
    if (segmentsCross(a, b, c, d)) return true;
  }
  return false;
}

/** Proper crossing of two segments (shared end points do not count). */
export function segmentsCross(a: V2, b: V2, c: V2, d: V2): boolean {
  const o = (p: V2, q: V2, r: V2) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const d1 = o(a, b, c);
  const d2 = o(a, b, d);
  const d3 = o(c, d, a);
  const d4 = o(c, d, b);
  return d1 * d2 < -1e-12 && d3 * d4 < -1e-12;
}

/** Direction (radians, in the x-z plane) of a ring's longest edge — paving joints follow it. */
export function dominantAngle(ring: readonly V2[]): number {
  let best = -1;
  let angle = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l > best) {
      best = l;
      angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    }
  }
  return angle;
}

/** Offset a polyline sideways (positive = left of travel, seen from above with +z south). */
export function offsetPolyline(line: readonly V2[], offset: number): V2[] {
  const n = line.length;
  const out: V2[] = [];
  for (let i = 0; i < n; i++) {
    const p = line[i];
    const prev = line[Math.max(0, i - 1)];
    const next = line[Math.min(n - 1, i + 1)];
    let d0x = p[0] - prev[0];
    let d0z = p[1] - prev[1];
    let d1x = next[0] - p[0];
    let d1z = next[1] - p[1];
    const l0 = Math.hypot(d0x, d0z) || 1;
    const l1 = Math.hypot(d1x, d1z) || 1;
    d0x /= l0;
    d0z /= l0;
    d1x /= l1;
    d1z /= l1;
    if (i === 0) {
      d0x = d1x;
      d0z = d1z;
    }
    if (i === n - 1) {
      d1x = d0x;
      d1z = d0z;
    }
    let tx = d0x + d1x;
    let tz = d0z + d1z;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl;
    tz /= tl;
    // Left of travel: (tz, −tx) when +z is south.
    const nx = tz;
    const nz = -tx;
    const cosPhi = Math.max(0.35, nx * d1z - nz * d1x);
    out.push([p[0] + (nx * offset) / cosPhi, p[1] + (nz * offset) / cosPhi]);
  }
  return out;
}

/** Points along a polyline every `step` metres (plus the end), with their tangent. */
export function samplePolyline(line: readonly V2[], step: number, from = 0, to = Infinity): { p: V2; t: V2; s: number }[] {
  const out: { p: V2; t: V2; s: number }[] = [];
  let acc = 0;
  let next = from;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-9) continue;
    const t: V2 = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    while (next <= acc + l && next <= to) {
      const u = (next - acc) / l;
      out.push({ p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], t, s: next });
      next += step;
    }
    acc += l;
  }
  return out;
}

export function polylineLength(line: readonly V2[]): number {
  let s = 0;
  for (let i = 1; i < line.length; i++) s += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
  return s;
}

/** A ribbon polygon (closed ring) around a polyline, `width` wide. */
export function bufferPolyline(line: readonly V2[], width: number): V2[] {
  const left = offsetPolyline(line, width / 2);
  const right = offsetPolyline(line, -width / 2).reverse();
  return ensureCCW([...left, ...right]);
}

// ── Hero footprints: an exact cut for the terrain and every surface ──────────

/** Keep the part of a ring where the linear function f ≥ 0 (Sutherland–Hodgman, one half-plane). */
function clipHalfPlane(ring: readonly V2[], f: (p: V2) => number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    const fp = f(p);
    const fq = f(q);
    if (fp >= 0) out.push(p);
    if (fp >= 0 !== fq >= 0) {
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/**
 * A ring minus a convex polygon: the pieces of the ring outside it (each is
 * the ring clipped to "outside edge i, inside edges 0 … i−1"), so they tile
 * the difference exactly. Works for concave rings (the clipper is convex).
 */
export function subtractConvex(ring: readonly V2[], convex: readonly V2[]): V2[][] {
  const ccw = ringArea(convex) >= 0;
  const pieces: V2[][] = [];
  let rest: V2[] = ring.slice();
  for (let i = 0; i < convex.length && rest.length >= 3; i++) {
    const a = convex[i];
    const b = convex[(i + 1) % convex.length];
    // With +z south, a CCW ring (seen from above) has its inside where cross(b − a, p − a) < 0.
    const sgn = ccw ? -1 : 1;
    const side = (p: V2) => sgn * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
    const out = clipHalfPlane(rest, (p) => -side(p));
    if (out.length >= 3 && Math.abs(ringArea(out)) > 1e-7) pieces.push(out);
    rest = clipHalfPlane(rest, side);
  }
  return pieces;
}

/** Enclosed footprints of the hero buildings — their modules model floors, walls and everything inside. */
export interface HeroCut {
  /** Convex pieces (triangles and their clips) tiling the enclosed footprints. */
  pieces: V2[][];
  /** Is (x, z) inside an enclosed footprint, at least `margin` m from its edge? */
  inside(x: number, z: number, margin?: number): boolean;
  /** May the box touch a footprint? */
  touches(minX: number, minZ: number, maxX: number, maxZ: number): boolean;
  /** The parts of a ring outside every footprint (the ring itself when it does not touch one). */
  subtract(ring: readonly V2[]): V2[][];
}

/** Buildings whose modules model their own ground floor (DESIGN §2). */
export const HERO_ROLES = ["biocity", "joki", "educity"] as const;

/**
 * The cut for the hero buildings: each footprint (with its holes) minus its
 * open parts — arcades and the glass tower's pilotis (building:min_level ≥ 1)
 * keep the ground's paving.
 */
export function heroCut(campus: CampusData): HeroCut {
  const pieces: V2[][] = [];
  for (const b of campus.buildings) {
    if (!b.role || !(HERO_ROLES as readonly string[]).includes(b.role)) continue;
    const outer = ensureCCW(cleanRing(b.polygon));
    const holes = (b.holes ?? []).map((h) => cleanRing(h)).filter((h) => h.length >= 3);
    const tris = THREE.ShapeUtils.triangulateShape(
      outer.map(([x, z]) => new THREE.Vector2(x, z)),
      holes.map((h) => h.map(([x, z]) => new THREE.Vector2(x, z))),
    );
    const all = [...outer, ...holes.flat()];
    let convex: V2[][] = tris.map(([i, j, k]) => [all[i], all[j], all[k]]);
    for (const part of b.parts ?? []) {
      if (!((part.minLevel ?? 0) >= 1 || (part.minHeight ?? 0) > 2)) continue;
      const open = ensureCCW(cleanRing(part.polygon));
      const openTris = THREE.ShapeUtils.triangulateShape(open.map(([x, z]) => new THREE.Vector2(x, z)), []).map(
        ([i, j, k]) => [open[i], open[j], open[k]] as V2[],
      );
      // A convex piece minus a convex triangle leaves convex pieces: the decomposition stays convex.
      for (const t of openTris) convex = convex.flatMap((c) => (boxesOverlap(c, t) ? subtractConvex(c, t) : [c]));
    }
    pieces.push(...convex.filter((c) => Math.abs(ringArea(c)) > 1e-6));
  }
  const boxes = pieces.map((p) => polygonBounds(p));
  const all = boxes.reduce(
    (acc, bb) => ({
      minX: Math.min(acc.minX, bb.minX),
      maxX: Math.max(acc.maxX, bb.maxX),
      minZ: Math.min(acc.minZ, bb.minZ),
      maxZ: Math.max(acc.maxZ, bb.maxZ),
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
  );
  const insidePoint = (x: number, z: number) => {
    for (let i = 0; i < pieces.length; i++) {
      const bb = boxes[i];
      if (x < bb.minX || x > bb.maxX || z < bb.minZ || z > bb.maxZ) continue;
      if (pointInRing([x, z], pieces[i])) return true;
    }
    return false;
  };
  return {
    pieces,
    inside(x, z, margin = 0) {
      if (x < all.minX || x > all.maxX || z < all.minZ || z > all.maxZ) return false;
      if (!insidePoint(x, z)) return false;
      if (margin <= 0) return true;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        if (!insidePoint(x + Math.cos(a) * margin, z + Math.sin(a) * margin)) return false;
      }
      return true;
    },
    touches(minX, minZ, maxX, maxZ) {
      if (maxX < all.minX || minX > all.maxX || maxZ < all.minZ || minZ > all.maxZ) return false;
      return boxes.some((bb) => !(maxX < bb.minX || minX > bb.maxX || maxZ < bb.minZ || minZ > bb.maxZ));
    },
    subtract(ring) {
      const rb = polygonBounds(ring);
      let out: V2[][] = [ring.slice()];
      for (let i = 0; i < pieces.length; i++) {
        const bb = boxes[i];
        if (bb.maxX < rb.minX || bb.minX > rb.maxX || bb.maxZ < rb.minZ || bb.minZ > rb.maxZ) continue;
        out = out.flatMap((p) => (boxesOverlap(p, pieces[i]) ? subtractConvex(p, pieces[i]) : [p]));
        if (!out.length) break;
      }
      return out;
    },
  };
}

/**
 * What the surfaces drawn so far already cover (convex pieces in a spatial
 * hash): later, lower-priority surfaces are clipped against it, so no two
 * ground surfaces ever overlap — no z-fighting, no polygon offsets, and one
 * merged mesh per texture set.
 */
export class Coverage {
  /** Grid cell (m): pieces are stored clipped to their cell, so lookups only see local, small pieces. */
  static readonly CELL = 6;
  private readonly grid = new Map<number, { piece: V2[]; minX: number; maxX: number; minZ: number; maxZ: number }[]>();
  /** Add a ring (earcut into convex triangles, each clipped into the grid cells it spans). */
  add(ring: readonly V2[]) {
    if (ring.length < 3) return;
    const tris = THREE.ShapeUtils.triangulateShape(
      ring.map(([x, z]) => new THREE.Vector2(x, z)),
      [],
    );
    const C = Coverage.CELL;
    for (const [a, b, c] of tris) {
      const t: V2[] = [ring[a], ring[b], ring[c]];
      if (Math.abs(ringArea(t)) < 1e-6) continue;
      const bb = polygonBounds(t);
      for (let i = Math.floor(bb.minX / C); i <= Math.floor(bb.maxX / C); i++) {
        for (let j = Math.floor(bb.minZ / C); j <= Math.floor(bb.maxZ / C); j++) {
          const piece = clipRingToBox(t, i * C, j * C, (i + 1) * C, (j + 1) * C);
          if (piece.length < 3 || Math.abs(ringArea(piece)) < 1e-6) continue;
          const pb = polygonBounds(piece);
          const k = key(i, j);
          const list = this.grid.get(k);
          const entry = { piece, ...pb };
          if (list) list.push(entry);
          else this.grid.set(k, [entry]);
        }
      }
    }
  }
  /** The parts of a ring not yet covered. */
  subtract(ring: readonly V2[]): V2[][] {
    const rb = polygonBounds(ring);
    const C = Coverage.CELL;
    let out: V2[][] = [ring.slice()];
    for (let i = Math.floor(rb.minX / C); i <= Math.floor(rb.maxX / C) && out.length; i++) {
      for (let j = Math.floor(rb.minZ / C); j <= Math.floor(rb.maxZ / C) && out.length; j++) {
        for (const e of this.grid.get(key(i, j)) ?? []) {
          if (e.maxX < rb.minX || e.minX > rb.maxX || e.maxZ < rb.minZ || e.minZ > rb.maxZ) continue;
          out = out.flatMap((p) => (boxesOverlap(p, e.piece) ? subtractConvex(p, e.piece) : [p]));
          if (!out.length) break;
        }
      }
    }
    return out;
  }
  /** May a box touch covered ground? */
  touches(minX: number, minZ: number, maxX: number, maxZ: number): boolean {
    const C = Coverage.CELL;
    for (let i = Math.floor(minX / C); i <= Math.floor(maxX / C); i++) {
      for (let j = Math.floor(minZ / C); j <= Math.floor(maxZ / C); j++) {
        for (const e of this.grid.get(key(i, j)) ?? []) {
          if (!(e.maxX < minX || e.minX > maxX || e.maxZ < minZ || e.minZ > maxZ)) return true;
        }
      }
    }
    return false;
  }
}

/** [minX, minZ, maxX, maxZ] of a point list. */
export function boundsOf(pts: readonly V2[]): [number, number, number, number] {
  const b = polygonBounds(pts);
  return [b.minX, b.minZ, b.maxX, b.maxZ];
}

function boxesOverlap(a: readonly V2[], b: readonly V2[]): boolean {
  const ba = polygonBounds(a);
  const bb = polygonBounds(b);
  return !(ba.maxX < bb.minX || ba.minX > bb.maxX || ba.maxZ < bb.minZ || ba.minZ > bb.maxZ);
}

/** The runs of a polyline outside a cut (densified to ≤ `step` m; a run needs two points). */
export function linesOutside(line: readonly V2[], inside: (x: number, z: number) => boolean, step = 1): V2[][] {
  const runs: V2[][] = [];
  let cur: V2[] = [];
  const flush = () => {
    if (cur.length >= 2) runs.push(cur);
    cur = [];
  };
  for (let i = 0; i < line.length; i++) {
    const a = line[i];
    const b = line[i + 1];
    const pts: V2[] = [a];
    if (b) {
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let k = 1; k < n; k++) pts.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    for (const p of pts) {
      if (inside(p[0], p[1])) flush();
      else cur.push(p);
    }
  }
  flush();
  // Drop the extra points again where a run kept the whole line (keeps vertex counts low).
  return runs.length === 1 && runs[0].length > line.length && line.every((p) => !inside(p[0], p[1])) ? [line.slice()] : runs;
}

// ── Rasters (land cover, masks) ──────────────────────────────────────────────

export interface Raster {
  w: number;
  h: number;
  /** World x / z of the outer edge of cell (0, 0). */
  x0: number;
  z0: number;
  res: number;
  data: Uint8Array;
}

export function makeRaster(ext: { minX: number; maxX: number; minZ: number; maxZ: number }, res: number): Raster {
  const w = Math.ceil((ext.maxX - ext.minX) / res);
  const h = Math.ceil((ext.maxZ - ext.minZ) / res);
  return { w, h, x0: ext.minX, z0: ext.minZ, res, data: new Uint8Array(w * h) };
}

/** Scan-convert a ring (even-odd, cell centres) and apply `op` to every covered cell. */
export function rasterFill(r: Raster, ring: readonly V2[], op: (index: number) => void): void {
  if (ring.length < 3) return;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of ring) {
    if (p[1] < minZ) minZ = p[1];
    if (p[1] > maxZ) maxZ = p[1];
  }
  const j0 = Math.max(0, Math.floor((minZ - r.z0) / r.res));
  const j1 = Math.min(r.h - 1, Math.ceil((maxZ - r.z0) / r.res));
  const xs: number[] = [];
  for (let j = j0; j <= j1; j++) {
    const z = r.z0 + (j + 0.5) * r.res;
    xs.length = 0;
    for (let i = 0, k = ring.length - 1; i < ring.length; k = i++) {
      const a = ring[k];
      const b = ring[i];
      if (a[1] > z !== b[1] > z) xs.push(a[0] + ((z - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - r.x0) / r.res - 0.5));
      const i1 = Math.min(r.w - 1, Math.floor((xs[k + 1] - r.x0) / r.res - 0.5));
      for (let i = i0; i <= i1; i++) op(j * r.w + i);
    }
  }
}

/** Value of the cell under (x, z); 0 outside. */
export function rasterAt(r: Raster, x: number, z: number): number {
  const i = Math.floor((x - r.x0) / r.res);
  const j = Math.floor((z - r.z0) / r.res);
  if (i < 0 || j < 0 || i >= r.w || j >= r.h) return 0;
  return r.data[j * r.w + i];
}

/** Morphological erosion of a bit (cells keep the bit only if every cell within `radius` cells has it). */
export function erodeBit(r: Raster, bit: number, radius: number): Uint8Array {
  const out = new Uint8Array(r.w * r.h);
  // Separable min filter on the bit: rows, then columns.
  const tmp = new Uint8Array(r.w * r.h);
  for (let j = 0; j < r.h; j++) {
    for (let i = 0; i < r.w; i++) {
      let all = 1;
      for (let d = -radius; d <= radius && all; d++) {
        const ii = i + d;
        if (ii < 0 || ii >= r.w || !(r.data[j * r.w + ii] & bit)) all = 0;
      }
      tmp[j * r.w + i] = all;
    }
  }
  for (let j = 0; j < r.h; j++) {
    for (let i = 0; i < r.w; i++) {
      let all = 1;
      for (let d = -radius; d <= radius && all; d++) {
        const jj = j + d;
        if (jj < 0 || jj >= r.h || !tmp[jj * r.w + i]) all = 0;
      }
      out[j * r.w + i] = all;
    }
  }
  return out;
}

// ── Vegetation mask (traced from the City's 2025 leaf-off orthophoto) ────────

/**
 * Where the ground is planted (lawns, beds, embankments), 1 m cells over the
 * terrain extent, row by row from the north: alternating run lengths of
 * paved/planted cells, base-62, "~" + 2 digits for runs ≥ 62. Derived from
 * the City of Turku 2025 orthophoto (© Turun kaupunki, CC BY 4.0) by an
 * excess-green/saturation test and a 3×3 majority filter; used only where no
 * street register, OSM area or hand-traced surface says what the ground is.
 */
const VEG_GRID = { x0: -178.98, z0: -207.81, w: 522, h: 487 } as const;
const B62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Decode a run-length mask (see VEG_RLE). */
export function decodeRunMask(rle: string, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const rows = rle.split(",");
  for (let j = 0; j < rows.length && j < h; j++) {
    const row = rows[j];
    let i = 0;
    let v = 0;
    let k = 0;
    while (k < row.length && i < w) {
      let n: number;
      if (row[k] === "~") {
        n = B62.indexOf(row[k + 1]) * 62 + B62.indexOf(row[k + 2]);
        k += 3;
      } else {
        n = B62.indexOf(row[k]);
        k++;
      }
      if (v) out.fill(1, j * w + i, j * w + Math.min(w, i + n));
      i += n;
      v ^= 1;
    }
  }
  return out;
}

/** Encode a 0/1 mask as runs (inverse of decodeRunMask; used by tests and the offline tracer). */
export function encodeRunMask(mask: ArrayLike<number>, w: number, h: number): string {
  const rows: string[] = [];
  for (let j = 0; j < h; j++) {
    let cur = 0;
    let len = 0;
    let row = "";
    const put = (n: number) => {
      row += n < 62 ? B62[n] : `~${B62[Math.floor(n / 62)]}${B62[n % 62]}`;
    };
    for (let i = 0; i < w; i++) {
      const v = mask[j * w + i] ? 1 : 0;
      if (v === cur) len++;
      else {
        put(len);
        cur = v;
        len = 1;
      }
    }
    put(len);
    rows.push(row);
  }
  return rows.join(",");
}

/** The decoded vegetation mask (1 = planted), 1 m cells from VEG_GRID's corner. */
export function vegetationMask(): { data: Uint8Array; w: number; h: number; x0: number; z0: number } {
  return { data: decodeRunMask(VEG_RLE, VEG_GRID.w, VEG_GRID.h), w: VEG_GRID.w, h: VEG_GRID.h, x0: VEG_GRID.x0, z0: VEG_GRID.z0 };
}

// VEG_RLE is appended at the end of this file (generated data).

// ── Kerbs and the height model ───────────────────────────────────────────────

export type Side = "low" | "high";

export interface KerbSeg {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  /** Unit normal pointing to the high (footway) side. */
  nx: number;
  nz: number;
  /** Band (m) either side where each side keeps its own level (kerbs 0.7, retaining walls 1.2). */
  reach?: number;
}

export interface KerbHit {
  seg: KerbSeg;
  /** Closest point on the segment. */
  qx: number;
  qz: number;
  /** Distance to the kerb line. */
  d: number;
  /** Signed distance: positive on the high side. */
  s: number;
}

/** Spatial hash of kerb segments for nearest-kerb queries. */
export class KerbField {
  private readonly cells = new Map<number, number[]>();
  constructor(
    readonly segs: KerbSeg[],
    private readonly cell = 2,
  ) {
    segs.forEach((s, i) => {
      const r = s.reach ?? KERB_REACH;
      const i0 = Math.floor((Math.min(s.ax, s.bx) - r) / cell);
      const i1 = Math.floor((Math.max(s.ax, s.bx) + r) / cell);
      const j0 = Math.floor((Math.min(s.az, s.bz) - r) / cell);
      const j1 = Math.floor((Math.max(s.az, s.bz) + r) / cell);
      for (let a = i0; a <= i1; a++) {
        for (let b = j0; b <= j1; b++) {
          const k = key(a, b);
          const list = this.cells.get(k);
          if (list) list.push(i);
          else this.cells.set(k, [i]);
        }
      }
    });
  }

  nearest(x: number, z: number, maxD = Infinity): KerbHit | null {
    const list = this.cells.get(key(Math.floor(x / this.cell), Math.floor(z / this.cell)));
    if (!list) return null;
    let best: KerbHit | null = null;
    for (const i of list) {
      const s = this.segs[i];
      const dx = s.bx - s.ax;
      const dz = s.bz - s.az;
      const l2 = dx * dx + dz * dz;
      const t = l2 > 0 ? clamp(((x - s.ax) * dx + (z - s.az) * dz) / l2, 0, 1) : 0;
      const qx = s.ax + dx * t;
      const qz = s.az + dz * t;
      const d = Math.hypot(x - qx, z - qz);
      if (d <= Math.min(maxD, s.reach ?? KERB_REACH) && (!best || d < best.d)) best = { seg: s, qx, qz, d, s: (x - qx) * s.nx + (z - qz) * s.nz };
    }
    return best;
  }
}

const key = (i: number, j: number) => (i + 32768) * 65536 + (j + 32768);

/**
 * Kerb segments from the street register's kerb lines; each knows which side
 * is the footway (high): the side that is not carriageway, else the higher
 * DTM side.
 */
/** A kerb (or a raised path edge) as a polyline; `lines` and `buildKerbs` agree on which edges count. */
export interface KerbLine {
  line: V2[];
  /** "kerb" = carriageway edge; "path" = a path/strip edge the DTM shows a step at (≥ 5 cm). */
  kind: "kerb" | "path";
}

/** DTM step across a line at its middle (+ = left side higher), median over the segments. */
function edgeStep(line: readonly V2[], terrain: Terrain): number {
  const steps: number[] = [];
  for (let i = 1; i < line.length; i++) {
    const [ax, az] = line[i - 1];
    const [bx, bz] = line[i];
    const l = Math.hypot(bx - ax, bz - az);
    if (l < 0.2) continue;
    const nx = (bz - az) / l;
    const nz = -(bx - ax) / l;
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    steps.push(terrain.heightAt(mx + nx * 0.6, mz + nz * 0.6) - terrain.heightAt(mx - nx * 0.6, mz - nz * 0.6));
  }
  steps.sort((a, b) => a - b);
  return steps.length ? steps[Math.floor(steps.length / 2)] : 0;
}

/**
 * The street register's kerb lines, plus the path edges where the DTM shows a
 * raised edge (along BioCity the upstand sits between the gutter strip and
 * the cycle path, a "path" edge in the register).
 */
export function kerbLines(streets: StreetsData, terrain: Terrain): KerbLine[] {
  const out: KerbLine[] = [];
  for (const e of streets.edges) {
    if (e.under) continue;
    const line: V2[] = e.line.map(([x, , z]) => [x, z]);
    if (line.length < 2) continue;
    if (e.kind === "kerb") out.push({ line, kind: "kerb" });
    else if (Math.abs(edgeStep(line, terrain)) >= 0.05) out.push({ line, kind: "path" });
  }
  return out;
}

/**
 * Kerb segments from the kerb lines; each knows which side is the footway
 * (high): for carriageway edges the side that is not carriageway (else the
 * higher DTM side), for raised path edges the higher DTM side.
 */
export function buildKerbs(streets: StreetsData, terrain: Terrain, isCarriageway: (x: number, z: number) => boolean): KerbSeg[] {
  const segs: KerbSeg[] = [];
  for (const k of kerbLines(streets, terrain)) {
    for (let i = 1; i < k.line.length; i++) {
      const [ax, az] = k.line[i - 1];
      const [bx, bz] = k.line[i];
      const l = Math.hypot(bx - ax, bz - az);
      if (l < 0.02) continue;
      // Left normal (seen from above, +z south).
      let nx = (bz - az) / l;
      let nz = -(bx - ax) / l;
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      let flip: boolean;
      const higherLeft = terrain.heightAt(mx + nx * 0.6, mz + nz * 0.6) >= terrain.heightAt(mx - nx * 0.6, mz - nz * 0.6);
      if (k.kind === "kerb") {
        const leftCarr = isCarriageway(mx + nx * 0.4, mz + nz * 0.4);
        const rightCarr = isCarriageway(mx - nx * 0.4, mz - nz * 0.4);
        flip = leftCarr !== rightCarr ? leftCarr : !higherLeft;
      } else flip = !higherLeft;
      if (flip) {
        nx = -nx;
        nz = -nz;
      }
      segs.push({ ax, az, bx, bz, nx, nz, reach: k.kind === "path" ? 0.5 : undefined });
    }
  }
  return segs;
}

export interface HeightModel {
  /** Bare DTM. */
  dtm(x: number, z: number): number;
  /** Surface level: the DTM, or near a kerb the level of the given side (default: the side the point is on). */
  y(x: number, z: number, side?: Side): number;
  /** Surface normal matching y(). */
  normal(x: number, z: number, side?: Side): V3;
  kerbs: KerbField;
}

export function createHeightModel(
  terrain: Terrain,
  kerbs: KerbField,
  sink?: (x: number, z: number) => number,
  floor?: (x: number, z: number) => number,
): HeightModel {
  const sample = (hit: KerbHit, side: Side): { y: number; x: number; z: number } => {
    // Sample this side a little way off the kerb; on the high side take the highest sample, on the low side
    // the lowest, so a narrow island never borrows the carriageway beyond it (and vice versa).
    const k = side === "high" ? 1 : -1;
    let best = side === "high" ? -Infinity : Infinity;
    let bx = hit.qx;
    let bz = hit.qz;
    const reach = hit.seg.reach ?? KERB_REACH;
    for (const r of [0.3, 0.5, reach]) {
      const x = hit.qx + hit.seg.nx * r * k;
      const z = hit.qz + hit.seg.nz * r * k;
      const y = Math.max(terrain.heightAt(x, z), floor ? floor(x, z) : -Infinity);
      if ((side === "high" && y > best) || (side === "low" && y < best)) {
        best = y;
        bx = x;
        bz = z;
      }
    }
    return { y: best, x: bx, z: bz };
  };
  /** Level of one side; where the survey shows no upstand (dropped or flush kerbs) both sides meet halfway. */
  const sideLevel = (hit: KerbHit, side: Side): { y: number; x: number; z: number } => {
    const own = sample(hit, side);
    const other = sample(hit, side === "high" ? "low" : "high");
    const hi = side === "high" ? own.y : other.y;
    const lo = side === "high" ? other.y : own.y;
    if (hi - lo < 0.03) return { y: (hi + lo) / 2, x: own.x, z: own.z };
    return own;
  };
  return {
    kerbs,
    dtm: (x, z) => terrain.heightAt(x, z),
    y(x, z, side) {
      const base = Math.max(terrain.heightAt(x, z), floor ? floor(x, z) : -Infinity) - (sink ? sink(x, z) : 0);
      const hit = kerbs.nearest(x, z);
      if (!hit) return base;
      const lv = sideLevel(hit, side ?? (hit.s >= 0 ? "high" : "low"));
      const reach = hit.seg.reach ?? KERB_REACH;
      const w = smoothstep(reach, reach * 0.5, hit.d);
      return lv.y * w + base * (1 - w);
    },
    normal(x, z, side) {
      const hit = kerbs.nearest(x, z);
      if (!hit) return terrain.normalAt(x, z);
      const lv = sideLevel(hit, side ?? (hit.s >= 0 ? "high" : "low"));
      const reach = hit.seg.reach ?? KERB_REACH;
      const w = smoothstep(reach, reach * 0.5, hit.d);
      if (w > 0.5) return terrain.normalAt(lv.x, lv.z);
      return terrain.normalAt(x, z);
    },
  };
}

// ── Draping polygons on the height model ────────────────────────────────────

/** Growing vertex/index buffers for one merged mesh. */
export class MeshBuf {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  /** Linear vertex colour (albedo multiplier) — set `color` before adding vertices. */
  col: number[] = [];
  idx: number[] = [];
  /** Colour given to the next vertices (linear RGB). */
  color: V3 = [1, 1, 1];
  get vertexCount() {
    return this.pos.length / 3;
  }
  vertex(x: number, y: number, z: number, n: V3, u: number, v: number): number {
    this.pos.push(x, y, z);
    this.nor.push(n[0], n[1], n[2]);
    this.uv.push(u, v);
    this.col.push(this.color[0], this.color[1], this.color[2]);
    return this.pos.length / 3 - 1;
  }
  tri(a: number, b: number, c: number) {
    this.idx.push(a, b, c);
  }
  /** Set the colour from an sRGB hex (stored linear). */
  tint(hex: THREE.ColorRepresentation): this {
    const c = new THREE.Color(hex);
    this.color = [c.r, c.g, c.b];
    return this;
  }
  /** Append another buffer. */
  append(o: MeshBuf) {
    const base = this.vertexCount;
    for (const v of o.pos) this.pos.push(v);
    for (const v of o.nor) this.nor.push(v);
    for (const v of o.uv) this.uv.push(v);
    for (const v of o.col) this.col.push(v);
    for (const i of o.idx) this.idx.push(i + base);
  }
  geometry(withColor = false): THREE.BufferGeometry | null {
    sanitizeMesh(this.pos, this.nor, this.idx);
    if (!this.idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    if (withColor) g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.vertexCount > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/**
 * Guard every generated mesh against shading NaNs (one NaN pixel blacks out
 * the frame through the bloom): triangles with a non-finite position are
 * dropped; zero, non-finite or degenerate vertex normals get the normal of a
 * face that uses them (else +y); all normals are unit length afterwards.
 * Returns the number of fixes (for tests).
 */
export function sanitizeMesh(pos: number[], nor: number[], idx: number[]): { droppedTris: number; fixedNormals: number } {
  let droppedTris = 0;
  let fixedNormals = 0;
  const finite = (i: number) => Number.isFinite(pos[i * 3]) && Number.isFinite(pos[i * 3 + 1]) && Number.isFinite(pos[i * 3 + 2]);
  // Drop triangles with non-finite corners (in place).
  let w = 0;
  for (let t = 0; t + 2 < idx.length; t += 3) {
    const a = idx[t];
    const b = idx[t + 1];
    const c = idx[t + 2];
    if (!finite(a) || !finite(b) || !finite(c)) {
      droppedTris++;
      continue;
    }
    idx[w++] = a;
    idx[w++] = b;
    idx[w++] = c;
  }
  idx.length = w;
  // Fix bad normals with the normal of a face that uses the vertex.
  const n = pos.length / 3;
  const bad = new Uint8Array(n);
  let anyBad = false;
  for (let i = 0; i < n; i++) {
    const x = nor[i * 3];
    const y = nor[i * 3 + 1];
    const z = nor[i * 3 + 2];
    const l = Math.hypot(x, y, z);
    if (!Number.isFinite(l) || l < 1e-6) {
      bad[i] = 1;
      anyBad = true;
    } else if (Math.abs(l - 1) > 1e-3) {
      nor[i * 3] = x / l;
      nor[i * 3 + 1] = y / l;
      nor[i * 3 + 2] = z / l;
    }
  }
  if (!anyBad) return { droppedTris, fixedNormals };
  for (let t = 0; t + 2 < idx.length; t += 3) {
    const v = [idx[t], idx[t + 1], idx[t + 2]];
    if (!bad[v[0]] && !bad[v[1]] && !bad[v[2]]) continue;
    const ax = pos[v[1] * 3] - pos[v[0] * 3];
    const ay = pos[v[1] * 3 + 1] - pos[v[0] * 3 + 1];
    const az = pos[v[1] * 3 + 2] - pos[v[0] * 3 + 2];
    const bx = pos[v[2] * 3] - pos[v[0] * 3];
    const by = pos[v[2] * 3 + 1] - pos[v[0] * 3 + 1];
    const bz = pos[v[2] * 3 + 2] - pos[v[0] * 3 + 2];
    const fx = ay * bz - az * by;
    const fy = az * bx - ax * bz;
    const fz = ax * by - ay * bx;
    const fl = Math.hypot(fx, fy, fz);
    if (!(fl > 1e-12)) continue;
    for (const k of v) {
      if (bad[k] !== 1) continue;
      nor[k * 3] = fx / fl;
      nor[k * 3 + 1] = fy / fl;
      nor[k * 3 + 2] = fz / fl;
      bad[k] = 2;
      fixedNormals++;
    }
  }
  for (let i = 0; i < n; i++) {
    if (bad[i] !== 1) continue;
    nor[i * 3] = 0;
    nor[i * 3 + 1] = 1;
    nor[i * 3 + 2] = 0;
    fixedNormals++;
  }
  return { droppedTris, fixedNormals };
}

export interface DrapeOptions {
  /** Grid cell (m) the surface is split on so it follows the terrain. */
  cell: number;
  /** Surface height and normal at (x, z). */
  y(x: number, z: number): number;
  n(x: number, z: number): V3;
  /** Texture direction (radians in the x-z plane): u runs along it. */
  angle?: number;
  /** Skirt depth under the outer edge (0 = none). */
  skirt?: number;
  /** Skip a cell (e.g. inside a building, or under a higher-priority surface): its bounds. */
  skip?(x0: number, z0: number, x1: number, z1: number): boolean;
  /** UV scale (texture tiles at another size than the material's). */
  uvScale?: [number, number];
  /** Footprints the surface must not enter (the hero buildings model their own floors). */
  cut?: HeroCut;
  /** Ground already covered by other surfaces: this one fills only the rest. */
  cover?: Coverage;
  /** Leave the skirt out along this part of the outline (midpoint test). */
  skipSkirt?(x: number, z: number): boolean;
}

/**
 * Drape a simple ring on the height model: the ring is cut on a world-aligned
 * grid, each piece triangulated (earcut), every vertex placed on the surface.
 * Vertices are shared between neighbouring pieces, so the surface is
 * watertight; an optional skirt hangs under the outline.
 */
export function drapeRing(buf: MeshBuf, ring: readonly V2[], o: DrapeOptions): void {
  if (ring.length < 3) return;
  const cell = o.cell;
  const cos = Math.cos(o.angle ?? 0);
  const sin = Math.sin(o.angle ?? 0);
  const [su, sv] = o.uvScale ?? [1, 1];
  const weld = new Map<number, number>();
  const vert = (x: number, z: number): number => {
    const k = Math.round(x * 500) * 4e6 + Math.round(z * 500);
    let i = weld.get(k);
    if (i === undefined) {
      i = buf.vertex(x, o.y(x, z), z, o.n(x, z), (x * cos + z * sin) * su, (x * sin - z * cos) * sv);
      weld.set(k, i);
    }
    return i;
  };
  const b = polygonBounds(ring);
  const i0 = Math.floor(b.minX / cell);
  const i1 = Math.ceil(b.maxX / cell);
  const j0 = Math.floor(b.minZ / cell);
  const j1 = Math.ceil(b.maxZ / cell);
  for (let i = i0; i < i1; i++) {
    const x0 = i * cell;
    const x1 = x0 + cell;
    for (let j = j0; j < j1; j++) {
      const z0 = j * cell;
      const z1 = z0 + cell;
      if (o.skip?.(x0, z0, x1, z1)) continue;
      const piece = clipRingToBox(ring, x0, z0, x1, z1);
      if (piece.length < 3) continue;
      const area = Math.abs(ringArea(piece));
      if (area < 1e-5) continue;
      const cutHere = o.cut?.touches(x0, z0, x1, z1) ?? false;
      const coverHere = o.cover?.touches(x0, z0, x1, z1) ?? false;
      if (!cutHere && !coverHere && area > cell * cell - 1e-6 && piece.length === 4) {
        // Whole cell: two triangles, same diagonal everywhere.
        const a = vert(x0, z0);
        const bb = vert(x0, z1);
        const c = vert(x1, z1);
        const d = vert(x1, z0);
        buf.tri(a, bb, c);
        buf.tri(a, c, d);
        continue;
      }
      let parts = cutHere && o.cut ? o.cut.subtract(piece) : [piece];
      if (coverHere && o.cover) {
        const cover = o.cover;
        parts = parts.flatMap((p) => cover.subtract(p));
      }
      for (const part of parts) triangulateUp(buf, part, vert);
    }
  }
  if (o.skirt) addSkirt(buf, ring, o, cos, sin);
}

/** Earcut a ring and add its triangles facing up (+y), through a vertex welder. */
function triangulateUp(buf: MeshBuf, piece: readonly V2[], vert: (x: number, z: number) => number) {
  if (piece.length < 3) return;
  const contour = piece.map(([x, z]) => new THREE.Vector2(x, z));
  const tris = THREE.ShapeUtils.triangulateShape(contour, []);
  for (const [ta, tb, tc] of tris) {
    const pa = piece[ta];
    const pb = piece[tb];
    const pc = piece[tc];
    // Face up (+y): with x right and z down the screen, (b − a) × (c − a) must be negative.
    const cross = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
    if (Math.abs(cross) < 1e-9) continue;
    const va = vert(pa[0], pa[1]);
    const vb = vert(pb[0], pb[1]);
    const vc = vert(pc[0], pc[1]);
    if (cross < 0) buf.tri(va, vb, vc);
    else buf.tri(va, vc, vb);
  }
}

/** Vertical skirt under a ring's outline, split where the drape grid cuts the edges (no T-junctions). */
function addSkirt(buf: MeshBuf, ring: readonly V2[], o: DrapeOptions, cos: number, sin: number) {
  const depth = o.skirt ?? 0;
  const ccw = ringArea(ring) >= 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const ts = [0, 1];
    for (const axis of [0, 1] as const) {
      const lo = Math.min(a[axis], b[axis]);
      const hi = Math.max(a[axis], b[axis]);
      for (let k = Math.ceil(lo / o.cell); k * o.cell < hi; k++) {
        const t = (k * o.cell - a[axis]) / (b[axis] - a[axis]);
        if (t > 1e-6 && t < 1 - 1e-6) ts.push(t);
      }
    }
    ts.sort((p, q) => p - q);
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-6) continue;
    // Outward normal of a CCW ring (seen from above): (−dz, dx).
    let nx = -(b[1] - a[1]) / len;
    let nz = (b[0] - a[0]) / len;
    if (!ccw) {
      nx = -nx;
      nz = -nz;
    }
    const n: V3 = [nx, 0, nz];
    for (let k = 1; k < ts.length; k++) {
      const p: V2 = [a[0] + (b[0] - a[0]) * ts[k - 1], a[1] + (b[1] - a[1]) * ts[k - 1]];
      const q: V2 = [a[0] + (b[0] - a[0]) * ts[k], a[1] + (b[1] - a[1]) * ts[k]];
      if (o.cut?.inside((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)) continue;
      if (o.skipSkirt?.((p[0] + q[0]) / 2, (p[1] + q[1]) / 2)) continue;
      const yp = o.y(p[0], p[1]);
      const yq = o.y(q[0], q[1]);
      const up = p[0] * cos + p[1] * sin;
      const uq = q[0] * cos + q[1] * sin;
      const v0 = buf.vertex(p[0], yp, p[1], n, up, yp);
      const v1 = buf.vertex(q[0], yq, q[1], n, uq, yq);
      const v2 = buf.vertex(p[0], yp - depth, p[1], n, up, yp - depth);
      const v3 = buf.vertex(q[0], yq - depth, q[1], n, uq, yq - depth);
      // Front face towards the outward normal.
      const ex = q[0] - p[0];
      const ez = q[1] - p[1];
      // (q − p) × (down) · n  → sign picks the winding.
      const facing = ez * nx - ex * nz;
      if (facing > 0) {
        buf.tri(v0, v2, v1);
        buf.tri(v1, v2, v3);
      } else {
        buf.tri(v0, v1, v2);
        buf.tri(v1, v3, v2);
      }
    }
  }
}

// ── Surface classes ──────────────────────────────────────────────────────────

/** Paving / surfacing families the ground builds meshes for (one draw call each). */
export type SurfaceKind =
  | "road" // carriageway asphalt
  | "yard" // parking lots, yards, driveways (asphalt, lighter, more patched)
  | "footway" // asphalt footway / cycle path
  | "red" // red asphalt cycle lane
  | "slabs" // concrete slab footway (0.4 m slabs)
  | "verge" // concrete pavers strip
  | "setts" // granite setts / fieldstone
  | "plaza" // Jussin aukio upper plaza (beige 0.4 m pavers)
  | "plazaGrey" // grey concrete plazas, recess
  | "platform" // station platform pavers
  | "deck" // timber decks and bridge boards
  | "concrete"; // bridge decks, ramps

export interface Surface {
  kind: SurfaceKind;
  ring: V2[];
  side: Side;
  /** Higher wins where surfaces overlap (street register 3 … OSM paths 0). */
  priority: number;
  /** Fixed deck level (bridges) instead of the terrain. */
  deckY?: number;
  angle: number;
  /** Extra height above the ground (timber decks). */
  lift?: number;
  slope?: HeroSurface["slope"];
}

/** Texture sets the surface kinds share (one merged mesh and material each). */
export type SurfaceGroup = "asphalt" | "footway" | "pavers" | "setts" | "deck" | "concrete";

/**
 * Surface kind → material group, albedo (sRGB, the measured target colour)
 * and texture tile relative to the group's (uvScale = groupTile / ownTile).
 * The group material is calibrated to the first kind listed for it; the
 * others are vertex tints (linear ratio of the albedos).
 */
export const SURFACE_LOOK: Record<SurfaceKind, { group: SurfaceGroup; albedo: string; uvScale?: [number, number] }> = {
  road: { group: "asphalt", albedo: "#474644" },
  yard: { group: "asphalt", albedo: "#53514d" },
  footway: { group: "footway", albedo: "#57575a" },
  red: { group: "footway", albedo: "#6a4a43" },
  slabs: { group: "pavers", albedo: "#8f8b85" },
  plaza: { group: "pavers", albedo: "#c6bcb1" },
  plazaGrey: { group: "pavers", albedo: "#8a8884", uvScale: [1.2 / 1.8, 1.2 / 1.8] },
  setts: { group: "setts", albedo: "#77777a" },
  verge: { group: "setts", albedo: "#7f7670", uvScale: [2.2 / 1.6, 1.1 / 0.8] },
  platform: { group: "setts", albedo: "#857d76", uvScale: [2.2 / 1.3, 1.1 / 1.3] },
  deck: { group: "deck", albedo: "#7b7166" },
  concrete: { group: "concrete", albedo: "#8d8c88" },
};

/** The kind whose albedo calibrates each group's material. */
export const GROUP_BASE: Record<SurfaceGroup, SurfaceKind> = {
  asphalt: "road",
  footway: "footway",
  pavers: "slabs",
  setts: "setts",
  deck: "deck",
  concrete: "concrete",
};

/** Linear vertex tint of a kind relative to its group's base albedo. */
export function surfaceTint(kind: SurfaceKind): V3 {
  const look = SURFACE_LOOK[kind];
  const a = new THREE.Color(look.albedo);
  const b = new THREE.Color(SURFACE_LOOK[GROUP_BASE[look.group]].albedo);
  return [a.r / Math.max(b.r, 1e-4), a.g / Math.max(b.g, 1e-4), a.b / Math.max(b.b, 1e-4)];
}

/** Street register area → surface kind (SPEC §4.2 material mapping). */
export function streetSurfaceKind(a: Pick<StreetArea, "part" | "surface">): SurfaceKind | null {
  const s = a.surface;
  switch (a.part) {
    case "carriageway":
      return s === "concrete_slab" ? "slabs" : "road";
    case "driveway":
      return s === "concrete_slab" || s === "concrete_pavers" ? "verge" : "yard";
    case "footway":
    case "waiting":
      return s === "asphalt" ? "footway" : "slabs";
    case "shared_path":
      return s === "asphalt" ? "footway" : s === "concrete_pavers" ? "verge" : "slabs";
    case "cycle_lane":
      return s === "asphalt_red" ? "red" : "footway";
    case "verge":
      if (s === "asphalt") return "footway";
      if (s === "concrete_slab") return "slabs";
      if (s === "concrete_pavers") return "verge";
      return "setts";
    case "bridge":
      return s === "wood" ? "deck" : s === "asphalt" ? "road" : "concrete";
    case "steps":
      return null;
    default:
      return s === "asphalt" ? "yard" : "slabs";
  }
}

// ── Hero zone: traced surfaces and structures (SPEC §2.2, §4.3, §4.4, §5.2) ──

/**
 * OSM areas the hero zone re-surfaces (id → kind): the upper plaza and the
 * campus deck in Jussin aukio's beige 40 × 40 cm pavers, the lower plaza in
 * grey concrete slabs (draped on the DTM; its tagged level is an estimate).
 */
/** TTK's private campus ground between the buildings (paved; the City's register stops at the streets). */
const CAMPUS_GROUND: V2[] = [
  [-15, -55],
  [30, -30],
  [100, -50],
  [185, 100],
  [175, 125],
  [100, 140],
  [20, 70],
  [0, 40],
];

/**
 * Kupittaa's island platform: the full 10.5 m between the two tracks. OSM maps it as two half-platforms
 * (one per track; only w856064136, the south-west half, is in the extract), so the north-east half was drawn
 * as track-side gravel; the flat −4.8 m top of the 2021 DTM gives both edges.
 */
export const ISLAND_PLATFORM: V2[] = [
  [153.6, -196.8],
  [316.3, 39.4],
  [324.9, 33.5],
  [162.2, -202.8],
];

const OSM_AREA_KIND: Record<string, SurfaceKind> = {
  "osm-1212594779": "plaza",
  "est-jussin-aukio": "plazaGrey",
};

interface HeroSurface {
  kind: SurfaceKind;
  ring: V2[];
  /** Extra height above the ground (decks, raised beds). */
  lift?: number;
  /** A planar ramp instead of the terrain: level y0 at `from`, y1 at `to` (linear along from → to). */
  slope?: { from: V2; to: V2; y0: number; y1: number };
  note: string;
}

/** Traced on the City's 2025 orthophoto (© Turun kaupunki, CC BY 4.0) and the CAD plans, campus frame. */
export const HERO_SURFACES: HeroSurface[] = [
  {
    kind: "yard",
    note: "BioCity–Electrocity yard (Tykistökatu mouth) and the courtyard passage to Jussin aukio, between the two outlines",
    ring: [
      [-13.5, -51.5],
      [-10.7, -48],
      [2.3, -29.3],
      [4, -30.8],
      [6.7, -32.3],
      [9.8, -32.9],
      [13, -32.9],
      [15.4, -32.1],
      [19.1, -30.1],
      [23.2, -27.6],
      [25.8, -24.4],
      [19.3, -19.8],
      [16.3, -12.1],
      [18.4, -10.9],
      [19.8, -9],
      [21.5, -9.7],
      [23.9, -6.6],
      [22.3, -5.8],
      [24.5, -0.7],
      [32.5, -0.8],
      [38.5, -3.3],
      [46.4, -4.1],
      [29.9, -28.4],
      [3.4, -67.3],
      [0.4, -71.8],
      [-0.6, -72.6],
    ],
  },
  {
    kind: "deck",
    note: "timber terrace outside the Aulagalleria and the event entrance (SPEC §4.3), boards ≈#8a7560",
    lift: 0.06,
    ring: [
      [19.3, -19.8],
      [25.4, -24.0],
      [27.3, -21.4],
      [27.5, -17.0],
      [26.7, -13.4],
      [28.6, -10.6],
      [31.6, -9.6],
      [35.6, -9.4],
      [38.9, -7.9],
      [41.3, -5.5],
      [43.0, -3.6],
      [38.5, -3.3],
      [32.5, -0.8],
      [24.5, -0.7],
      [22.3, -5.8],
      [23.9, -6.6],
      [21.5, -9.7],
      [19.8, -9],
      [18.4, -10.9],
      [16.3, -12.1],
    ],
  },
  {
    kind: "yard",
    note: "yard between Electrocity/Eurocity and the deck arm (over the BioCity garage), asphalt",
    ring: [
      [48.9, -0.4],
      [66.4, -12.1],
      [59.3, -22.8],
      [61.3, -24.1],
      [62.6, -22.2],
      [65.3, -23.9],
      [64.1, -26],
      [65.4, -27],
      [66.9, -28],
      [67.3, -27.4],
      [71.3, -30.1],
      [74.7, -24.9],
      [94.2, -48.8],
      [99.0, -50.5],
      [81.4, -28.8],
      [85.2, -23.7],
      [79.6, -16.8],
      [62.9, 3.9],
      [55.0, -4.5],
    ],
  },
  {
    kind: "road",
    note: "garage ramp (Aimo) from Joukahaisenkatu down to BioCity's basement parking, between retaining walls",
    // DTM: −0.2 at the street end, −3.0 at the portal under the deck (SPEC §2.2: → −3.0).
    slope: { from: [101.6, -46.6], to: [83.3, -26.2], y0: -0.25, y1: -3.05 },
    ring: [
      [81.4, -28.8],
      [99.0, -50.5],
      [103.9, -46.5],
      [100.9, -42.8],
      [88.4, -27.5],
      [85.2, -23.7],
    ],
  },
  {
    kind: "slabs",
    note: "Electrocity's sunken light-well walk along its south-east facade (SPEC §2.2): floor y −1.45",
    slope: { from: [48.9, -0.4], to: [66.4, -12.1], y0: -1.45, y1: -1.45 },
    ring: [
      [52.7, -2.13],
      [61.2, -7.82],
      [62.15, -6.4],
      [53.65, -0.71],
    ],
  },
  {
    kind: "platform",
    note: "Kupittaa's whole island platform (both halves; OSM has only the south-west one)",
    ring: ISLAND_PLATFORM,
  },
  {
    kind: "slabs",
    note: "light concrete pavers along ParkCity's east side to the foot of Kalevansilta's street stair (2025 orthophoto)",
    ring: [
      [258.5, -12.0],
      [262.5, -14.0],
      [276.5, 2.0],
      [277.5, 5.0],
      [274.5, 15.0],
      [270.5, 15.0],
      [271.5, 7.0],
    ],
  },
  {
    kind: "plazaGrey",
    note: "BioCity entrance recess floor (CAD, SPEC §5.2), light-grey slabs #7F7D79",
    ring: [
      [-27.62, -25.13],
      [-20.08, -14.84],
      [-28.7, -8.84],
      [-29.01, -9.29],
      [-35.17, -13.41],
    ],
  },
];

/**
 * Fills: where the DTM sees through an opening (the garage tunnel under the yard), the surfaces keep at
 * least this level.
 */
export const HERO_FILLS: { ring: V2[]; minY: number; note: string }[] = [
  {
    note: "paved walk along ParkCity's east side where Kalevansilta's street stair lands (built 2022–23, after the 2021 laser: the DTM still has the old hollow there)",
    minY: -0.9,
    ring: [
      [258.5, -12.0],
      [262.5, -14.0],
      [276.5, 2.0],
      [277.5, 5.0],
      [274.5, 15.0],
      [270.5, 15.0],
      [271.5, 7.0],
    ],
  },
  {
    note: "deck over the garage tunnel mouth (the 2021 laser looked into the opening)",
    minY: 1.72,
    ring: [
      [80.5, -30.0],
      [86.1, -22.5],
      [83.76, -19.9],
      [78.16, -27.4],
    ],
  },
];

/** Raised planting beds (soil top, steel or concrete edging), traced on the orthophoto. */
export const HERO_PLANTERS: { ring: V2[]; height: number; edge: "steel" | "concrete"; note: string }[] = [
  {
    note: "curved bed round the skylight in the terrace pocket",
    height: 0.4,
    edge: "steel",
    ring: [
      [24.6, -22.6],
      [25.8, -22.9],
      [26.9, -20.5],
      [27.3, -17.5],
      [26.9, -14.5],
      [26.0, -12.4],
      [25.0, -12.8],
      [25.8, -14.8],
      [26.1, -17.5],
      [25.8, -20.2],
    ],
  },
  {
    note: "kidney bed along the terrace edge",
    height: 0.4,
    edge: "steel",
    ring: [
      [29.0, -8.6],
      [30.6, -10.2],
      [33.0, -10.8],
      [35.6, -10.5],
      [38.0, -9.3],
      [40.2, -7.4],
      [42.2, -4.9],
      [43.6, -3.1],
      [42.4, -2.6],
      [41.0, -4.3],
      [39.2, -6.4],
      [37.2, -8.0],
      [35.3, -9.1],
      [33.1, -9.5],
      [31.0, -9.1],
      [29.8, -7.9],
    ],
  },
  {
    note: "curved bed on the lower plaza west of the tower (benches along it)",
    height: 0.45,
    edge: "concrete",
    ring: [
      [43.6, 7.6],
      [45.2, 6.6],
      [47.0, 6.9],
      [48.4, 8.4],
      [49.6, 10.8],
      [49.8, 13.4],
      [48.9, 15.6],
      [47.4, 16.0],
      [46.6, 14.4],
      [46.9, 12.0],
      [46.0, 9.6],
      [44.4, 8.6],
    ],
  },
  // Round planter drums on the terrace, planted (dark tops on the 2025 orthophoto; round 1 drew them as
  // faceted solid white cylinders).
  ...([
    [25.9, -5.6],
    [26.1, -3.3],
    [28.7, -3.3],
    [31.7, -3.4],
    [34.8, -3.6],
  ] as V2[]).map((c) => ({
    note: `round planter drum on the terrace at (${c[0]}, ${c[1]})`,
    height: 0.45,
    edge: "concrete" as const,
    ring: Array.from({ length: 40 }, (_, i): V2 => {
      const a = (i / 40) * Math.PI * 2;
      return [c[0] + Math.cos(a) * 0.775, c[1] + Math.sin(a) * 0.775];
    }),
  })),
  {
    note: "round bed by Pihakansi with a small tree",
    height: 0.45,
    edge: "concrete",
    ring: Array.from({ length: 20 }, (_, i): V2 => {
      const a = (i / 20) * Math.PI * 2;
      return [44.4 + Math.cos(a) * 2.7, 20.0 + Math.sin(a) * 2.7];
    }),
  },
];

/** Hand-placed walls the City data lacks: line, height above the higher side, coping. */
export const HERO_WALLS: { line: V2[]; height: number; coping: "white" | "concrete"; note: string }[] = [
  {
    note: "edge of Electrocity's light well (white coping; the City's railing stands on it)",
    line: [
      [49.7, 1.2],
      [65.6, -9.5],
    ],
    height: 0.12,
    coping: "white",
  },
  {
    note: "Jussin aukio level edge (SPEC §2.2): low wall with white coping between the yard and the deck arm",
    line: [
      [62.9, 3.9],
      [79.6, -16.8],
      [85.3, -23.8],
    ],
    height: 0.45,
    coping: "white",
  },
];

/** Boxes and drums the ground places itself (portal, skylight, terrace drums). y0 "ground" = on the surface. */
export const HERO_BOXES: {
  center: V2;
  /** Along / across the axis (m); a single number = a round drum of that diameter. */
  size: [number, number] | number;
  /** Axis direction in the x-z plane (degrees from +x towards +z). */
  angle?: number;
  y0: number | "ground";
  height: number;
  material: "concrete" | "coping" | "steel" | "dark" | "soil";
  note: string;
}[] = [
  {
    note: "garage portal: concrete header over the ramp's mouth under the deck",
    center: [83.1, -26.03],
    size: [6.7, 0.6],
    angle: 53.3,
    y0: -0.45,
    height: 2.4,
    material: "concrete",
  },
  {
    note: "garage portal: darkness inside the opening",
    center: [82.63, -25.51],
    size: [6.5, 0.1],
    angle: 53.3,
    y0: -3.15,
    height: 2.75,
    material: "dark",
  },
  {
    note: "skylight box in the terrace pocket (light frame, dark glass top)",
    center: [22.6, -16.2],
    size: [4.8, 2.7],
    angle: 129.7,
    y0: "ground",
    height: 0.86,
    material: "coping",
  },
  {
    note: "skylight glass",
    center: [22.6, -16.2],
    size: [4.5, 2.4],
    angle: 129.7,
    y0: "ground",
    height: 0.9,
    material: "dark",
  },
];

/** Stairs the City data lacks (SPEC §2.2). Same shape as streets.json stairs. */
export const HERO_STAIRS: { outline: V2[]; yBottom: number; yTop: number; upBearing: number; risers: number; note: string }[] = [
  {
    note: "light well, south-west flight (SPEC §2.2 stairs at (50.1, −0.2))",
    outline: [
      [49.5, -0.35],
      [52.7, -2.49],
      [53.53, -1.25],
      [50.33, 0.89],
    ],
    yBottom: -1.45,
    yTop: 0.3,
    upBearing: 236.2,
    risers: 10,
  },
  {
    note: "light well, north-east flight (SPEC §2.2 stairs at (63.1, −8.9))",
    outline: [
      [61.2, -7.82],
      [64.4, -9.96],
      [65.23, -8.72],
      [62.03, -6.58],
    ],
    yBottom: -1.45,
    yTop: 0.55,
    upBearing: 56.2,
    risers: 11,
  },
];

// ── Stairs, walls, railings ──────────────────────────────────────────────────

/** Part of a ring between two lines perpendicular to u (s ∈ [a, b], s = (p − o)·u). */
function clipRingToSlab(ring: readonly V2[], o: V2, u: V2, a: number, b: number): V2[] {
  const clipHalf = (input: V2[], keep: (s: number) => number): V2[] => {
    const out: V2[] = [];
    for (let i = 0; i < input.length; i++) {
      const p = input[i];
      const q = input[(i + 1) % input.length];
      const sp = keep((p[0] - o[0]) * u[0] + (p[1] - o[1]) * u[1]);
      const sq = keep((q[0] - o[0]) * u[0] + (q[1] - o[1]) * u[1]);
      if (sp >= 0) out.push(p);
      if (sp >= 0 !== sq >= 0) {
        const t = sp / (sp - sq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    return out;
  };
  return clipHalf(clipHalf(ring.slice(), (s) => s - a), (s) => b - s);
}

/** A vertical prism over a ring, from y0 to y1 (top + sides), with box UVs in metres. */
function prism(buf: MeshBuf, ring: readonly V2[], y0: number, y1: number, opts: { top?: boolean; bottom?: boolean } = {}) {
  const r = ensureCCW(cleanRing(ring));
  if (r.length < 3) return;
  if (opts.top !== false) {
    const contour = r.map(([x, z]) => new THREE.Vector2(x, z));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    const base = buf.vertexCount;
    for (const [x, z] of r) buf.vertex(x, y1, z, [0, 1, 0], x, -z);
    for (const [a, b, c] of tris) {
      const pa = r[a];
      const pb = r[b];
      const pc = r[c];
      const cross = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
      if (cross < 0) buf.tri(base + a, base + b, base + c);
      else buf.tri(base + a, base + c, base + b);
    }
  }
  let u = 0;
  for (let i = 0; i < r.length; i++) {
    const a = r[i];
    const b = r[(i + 1) % r.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-4) continue;
    // Outward normal of a CCW ring: (−dz, dx).
    const n: V3 = [-(b[1] - a[1]) / len, 0, (b[0] - a[0]) / len];
    const v0 = buf.vertex(a[0], y1, a[1], n, u, y1);
    const v1 = buf.vertex(b[0], y1, b[1], n, u + len, y1);
    const v2 = buf.vertex(a[0], y0, a[1], n, u, y0);
    const v3 = buf.vertex(b[0], y0, b[1], n, u + len, y0);
    // Seen from outside (along −n), a → b runs right to left on a CCW ring: wind (a, b, a↓) clockwise → flip.
    buf.tri(v0, v2, v1);
    buf.tri(v1, v2, v3);
    u += len;
  }
}

export interface StairSpec {
  outline: V2[];
  yBottom: number;
  yTop: number;
  upBearing: number;
  risers: number;
}

/** Steps as solid blocks (concrete), with stainless handrails on flights that climb ≥ 0.45 m. */
function buildStairs(stairs: StairSpec[], steps: MeshBuf, rails: MeshBuf): { colliders: Collider2D[] } {
  const colliders: Collider2D[] = [];
  for (const st of stairs) {
    const ring = ensureCCW(cleanRing(st.outline));
    if (ring.length < 3) continue;
    const b = (st.upBearing * Math.PI) / 180;
    const u: V2 = [Math.sin(b), -Math.cos(b)];
    const o = ring[0];
    const ss = ring.map((p) => (p[0] - o[0]) * u[0] + (p[1] - o[1]) * u[1]);
    const s0 = Math.min(...ss);
    const s1 = Math.max(...ss);
    const run = s1 - s0;
    const rise = st.yTop - st.yBottom;
    if (run < 0.2) continue;
    const n = Math.max(1, st.risers || Math.round(Math.abs(rise) / 0.16));
    const g = run / n;
    for (let k = 1; k <= n; k++) {
      const piece = clipRingToSlab(ring, o, u, s0 + (k - 1) * g, s0 + k * g);
      if (piece.length < 3) continue;
      prism(steps, piece, st.yBottom - 0.35, st.yBottom + (rise * k) / n);
    }
    // Handrails along the two sides that run up the flight.
    if (Math.abs(rise) >= 0.45) {
      const side: V2 = [-u[1], u[0]];
      const ts = ring.map((p) => (p[0] - o[0]) * side[0] + (p[1] - o[1]) * side[1]);
      const t0 = Math.min(...ts) + 0.12;
      const t1 = Math.max(...ts) - 0.12;
      for (const t of [t0, t1]) {
        const at = (s: number): V2 => [o[0] + u[0] * s + side[0] * t, o[1] + u[1] * s + side[1] * t];
        const yAt = (s: number) => st.yBottom + clamp((s - s0) / run, 0, 1) * rise;
        const posts = Math.max(2, Math.ceil(run / 1.4) + 1);
        for (let i = 0; i < posts; i++) {
          const s = s0 + 0.15 + ((run - 0.3) * i) / (posts - 1);
          const p = at(s);
          const y = yAt(Math.min(s1, s + g / 2));
          tube(rails, [p[0], y, p[1]], [p[0], y + 0.92, p[1]], 0.022, 6);
        }
        const a = at(s0 + 0.05);
        const c = at(s1 - 0.05);
        tube(rails, [a[0], st.yBottom + 0.92 + g * 0.0, a[1]], [c[0], st.yTop + 0.92, c[1]], 0.024, 8);
        colliders.push({ level: "outdoor", kind: "segment", a, b: c });
      }
    }
  }
  return { colliders };
}

/** A round tube (cylinder) between two points. */
function tube(buf: MeshBuf, a: V3, b: V3, r: number, sides: number) {
  const ax = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = ax.length();
  if (len < 1e-4) return;
  ax.normalize();
  const tmp = Math.abs(ax.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const e1 = new THREE.Vector3().crossVectors(ax, tmp).normalize();
  const e2 = new THREE.Vector3().crossVectors(ax, e1).normalize();
  const base = buf.vertexCount;
  for (let i = 0; i <= sides; i++) {
    const t = (i / sides) * Math.PI * 2;
    const nx = e1.x * Math.cos(t) + e2.x * Math.sin(t);
    const ny = e1.y * Math.cos(t) + e2.y * Math.sin(t);
    const nz = e1.z * Math.cos(t) + e2.z * Math.sin(t);
    buf.vertex(a[0] + nx * r, a[1] + ny * r, a[2] + nz * r, [nx, ny, nz], i / sides, 0);
    buf.vertex(b[0] + nx * r, b[1] + ny * r, b[2] + nz * r, [nx, ny, nz], i / sides, len);
  }
  for (let i = 0; i < sides; i++) {
    const p = base + i * 2;
    buf.tri(p, p + 2, p + 1);
    buf.tri(p + 1, p + 2, p + 3);
  }
}

/** A box between two plan points (a wall piece), thickness across, from y0 to y1 (varying along). */
function wallStrip(buf: MeshBuf, line: readonly V2[], ys: readonly [number, number][], offset0: number, offset1: number) {
  // Quad strip faces: inner face, outer face, top.
  const l0 = offsetPolyline(line, offset0);
  const l1 = offsetPolyline(line, offset1);
  const faces: [V2[], V2[], "side0" | "side1" | "top"][] = [
    [l0, l0, "side0"],
    [l1, l1, "side1"],
    [l0, l1, "top"],
  ];
  for (const [pa, pb, kind] of faces) {
    const base = buf.vertexCount;
    let s = 0;
    for (let i = 0; i < line.length; i++) {
      if (i) s += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
      const [y0, y1] = ys[i];
      const t = tangentAt(line, i);
      const left: V3 = [t[1], 0, -t[0]];
      if (kind === "top") {
        buf.vertex(pa[i][0], y1, pa[i][1], [0, 1, 0], s, 0);
        buf.vertex(pb[i][0], y1, pb[i][1], [0, 1, 0], s, offset1 - offset0);
      } else {
        const n: V3 = kind === "side0" ? (offset0 > offset1 ? left : [-left[0], 0, -left[2]]) : offset1 > offset0 ? left : [-left[0], 0, -left[2]];
        buf.vertex(pa[i][0], y1, pa[i][1], n, s, y1);
        buf.vertex(pa[i][0], y0, pa[i][1], n, s, y0);
      }
    }
    for (let i = 1; i < line.length; i++) {
      const a = base + (i - 1) * 2;
      const b = base + i * 2;
      buf.tri(a, a + 1, b);
      buf.tri(b, a + 1, b + 1);
    }
  }
}

/** Unit tangent of a polyline at vertex i, skipping zero-length segments (never [0, 0] for a non-degenerate line). */
export function tangentAt(line: readonly V2[], i: number): V2 {
  for (let k = 1; k < line.length; k++) {
    const a = line[Math.max(0, i - k)];
    const b = line[Math.min(line.length - 1, i + k)];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l = Math.hypot(dx, dz);
    if (l > 1e-6) return [dx / l, dz / l];
  }
  return [1, 0];
}

/** A polyline without consecutive duplicate points (< 1 mm apart). */
export function cleanLine(line: readonly V2[]): V2[] {
  const out: V2[] = [];
  for (const p of line) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-3) out.push([p[0], p[1]]);
  }
  return out;
}

/** A planar ramp: height along from → to (clamped), and its normal. */
export function rampFn(sl: { from: V2; to: V2; y0: number; y1: number }): { y(x: number, z: number): number; n: V3 } {
  const dx = sl.to[0] - sl.from[0];
  const dz = sl.to[1] - sl.from[1];
  const l2 = dx * dx + dz * dz || 1;
  const len = Math.sqrt(l2);
  const grade = (sl.y1 - sl.y0) / len;
  const n = new THREE.Vector3((-grade * dx) / len, 1, (-grade * dz) / len).normalize();
  return {
    y: (x, z) => sl.y0 + (sl.y1 - sl.y0) * clamp(((x - sl.from[0]) * dx + (z - sl.from[1]) * dz) / l2, 0, 1),
    n: [n.x, n.y, n.z],
  };
}

/** Retaining walls as breaklines (reach 1.2 m), the high side found on the DTM. */
export function wallBreaklines(lines: readonly V2[][], terrain: Terrain): KerbSeg[] {
  const out: KerbSeg[] = [];
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const [ax, az] = line[i - 1];
      const [bx, bz] = line[i];
      const l = Math.hypot(bx - ax, bz - az);
      if (l < 0.05) continue;
      let nx = (bz - az) / l;
      let nz = -(bx - ax) / l;
      const mx = (ax + bx) / 2;
      const mz = (az + bz) / 2;
      if (terrain.heightAt(mx + nx * 1.2, mz + nz * 1.2) < terrain.heightAt(mx - nx * 1.2, mz - nz * 1.2)) {
        nx = -nx;
        nz = -nz;
      }
      out.push({ ax, az, bx, bz, nx, nz, reach: 1.2 });
    }
  }
  return out;
}

interface Structures {
  concrete: MeshBuf;
  coping: MeshBuf;
  steel: MeshBuf;
  rails: MeshBuf;
  soil: MeshBuf;
  dark: MeshBuf;
  colliders: Collider2D[];
}

/** Stairs, retaining walls (with coping), the level-edge wall, raised planting beds, the hero details. */
function buildStructures(o: { heights: HeightModel; stairs: StairSpec[]; streets: StreetsData; lift: number; hero: HeroCut }): Structures {
  const out: Structures = {
    concrete: new MeshBuf(),
    coping: new MeshBuf(),
    steel: new MeshBuf(),
    rails: new MeshBuf(),
    soil: new MeshBuf(),
    dark: new MeshBuf(),
    colliders: [],
  };
  const { heights } = o;
  // Stairs.
  out.colliders.push(...buildStairs(o.stairs, out.concrete, out.rails).colliders);
  // Retaining walls: 0.25 m thick on the low side of the top line, from the foot to the top, concrete coping.
  const walls: { line: V2[]; top: number[]; foot: number[]; coping: "white" | "concrete"; height?: number }[] = [
    // The City's retaining walls, without the parts inside hero buildings.
    ...o.streets.walls.flatMap((w) => {
      const line = w.line.map(([x, , z]): V2 => [x, z]);
      const at = (p: V2) => {
        // Top and foot interpolated along the surveyed line.
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i < line.length; i++) {
          const d = Math.hypot(line[i][0] - p[0], line[i][1] - p[1]);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        return { top: w.line[best][1], foot: w.base[best] };
      };
      const runs = o.hero.touches(...boundsOf(line)) ? linesOutside(line, (x, z) => o.hero.inside(x, z)) : [line];
      return runs.map((run) =>
        run === line
          ? { line, top: w.line.map(([, y]) => y), foot: w.base, coping: "concrete" as const }
          : { line: run, top: run.map((p) => at(p).top), foot: run.map((p) => at(p).foot), coping: "concrete" as const },
      );
    }),
    ...HERO_WALLS.map((w) => ({
      line: w.line,
      top: w.line.map(([x, z]) => Math.max(heights.y(x, z, "high"), heights.y(x, z, "low")) + w.height),
      foot: w.line.map(([x, z]) => Math.min(heights.y(x, z, "high"), heights.y(x, z, "low"))),
      coping: w.coping,
      height: w.height,
    })),
  ];
  for (const w of walls) {
    if (w.line.length < 2) continue;
    // Which side is low: the side with the lower ground 1.5 m out (sampled at the middle).
    const m = Math.floor(w.line.length / 2);
    const a = w.line[Math.max(0, m - 1)];
    const b = w.line[Math.min(w.line.length - 1, m)];
    const t = unit([b[0] - a[0], b[1] - a[1]]);
    const left: V2 = [t[1], -t[0]];
    const mid: V2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const yl = heights.dtm(mid[0] + left[0] * 1.5, mid[1] + left[1] * 1.5);
    const yr = heights.dtm(mid[0] - left[0] * 1.5, mid[1] - left[1] * 1.5);
    const lowLeft = yl < yr;
    const thick = 0.25;
    const o0 = 0;
    const o1 = lowLeft ? thick : -thick;
    const ys = w.line.map((_, i): [number, number] => [Math.min(w.foot[i], w.top[i] - 0.3) - 0.25, w.top[i]]);
    wallStrip(out.concrete, w.line, ys, o0, o1);
    // Coping: 0.05 m cap, 3 cm proud each side.
    const cap = w.line.map((_, i): [number, number] => [w.top[i], w.top[i] + 0.05]);
    wallStrip(w.coping === "white" ? out.coping : out.concrete, w.line, cap, lowLeft ? -0.03 : 0.03, o1 + (lowLeft ? 0.03 : -0.03));
    for (let i = 1; i < w.line.length; i++) out.colliders.push({ level: "outdoor", kind: "segment", a: w.line[i - 1], b: w.line[i] });
  }
  // Raised planting beds: soil top, steel or concrete edging.
  for (const p of HERO_PLANTERS) {
    const ring = ensureCCW(cleanRing(p.ring));
    const ground = Math.max(...ring.map(([x, z]) => heights.y(x, z, "high")));
    const top = ground + p.height;
    drapeRing(out.soil, ring, { cell: 2, y: () => top - 0.06, n: () => [0, 1, 0], skirt: 0 });
    const edge = p.edge === "steel" ? out.steel : out.concrete;
    const closed = [...ring, ring[0]];
    const ys = closed.map(([x, z]): [number, number] => [heights.y(x, z, "high") - 0.1, top]);
    wallStrip(edge, closed, ys, 0, p.edge === "steel" ? 0.012 : 0.12);
    for (let i = 1; i < closed.length; i++) out.colliders.push({ level: "outdoor", kind: "segment", a: closed[i - 1], b: closed[i] });
  }
  // Boxes and drums.
  for (const b of HERO_BOXES) {
    const buf = out[b.material];
    let ring: V2[];
    if (typeof b.size === "number") {
      const r = b.size / 2;
      ring = Array.from({ length: 18 }, (_, i): V2 => [b.center[0] + Math.cos((i / 18) * Math.PI * 2) * r, b.center[1] + Math.sin((i / 18) * Math.PI * 2) * r]);
      out.colliders.push({ level: "outdoor", kind: "circle", c: b.center, r });
    } else {
      const a = ((b.angle ?? 0) * Math.PI) / 180;
      const u: V2 = [Math.cos(a), Math.sin(a)];
      const v: V2 = [-u[1], u[0]];
      const [l, w] = [b.size[0] / 2, b.size[1] / 2];
      ring = [
        [b.center[0] - u[0] * l - v[0] * w, b.center[1] - u[1] * l - v[1] * w],
        [b.center[0] + u[0] * l - v[0] * w, b.center[1] + u[1] * l - v[1] * w],
        [b.center[0] + u[0] * l + v[0] * w, b.center[1] + u[1] * l + v[1] * w],
        [b.center[0] - u[0] * l + v[0] * w, b.center[1] - u[1] * l + v[1] * w],
      ];
      if (b.material !== "dark") for (let i = 0; i < 4; i++) out.colliders.push({ level: "outdoor", kind: "segment", a: ring[i], b: ring[(i + 1) % 4] });
    }
    const y0 = b.y0 === "ground" ? Math.min(...ring.map(([x, z]) => heights.y(x, z, "high"))) - 0.05 : b.y0;
    prism(buf, ring, y0, y0 + b.height + (b.y0 === "ground" ? 0.05 : 0));
  }
  return out;
}

// ── Railway, platform and Kalevansilta (SPEC §4.5) ───────────────────────────

/** Metre UVs on a box geometry (sleepers, small props). */
function boxUVGeometry(g: THREE.BufferGeometry) {
  boxUV(g);
}

/** Finnish broad gauge (m). */
const GAUGE = 1.524;

const CANOPY_IDS = ["osm-526090188", "osm-526090187"];

/**
 * Kalevansilta's stair down to Joukahaisenkatu at the ParkCity end (head on the deck, foot on the street):
 * the City's flights there carry DTM levels from under the bridge, so the ground skips them — the stair is
 * world/context/bridges.ts's.
 */
const KALEVANSILTA_STREET_STAIR = { top: [267.4, -10.4] as V2, bottom: [274.9, 1.1] as V2 };

export interface RailwayParts {
  ballast: MeshBuf;
  rails: MeshBuf;
  railHeads: MeshBuf;
  masts: MeshBuf;
  wires: MeshBuf;
  edge: MeshBuf;
  red: MeshBuf;
  sleepers: THREE.Matrix4[];
  soffit: MeshBuf;
  colliders: Collider2D[];
  /** Breaklines for the platform edges (the DTM smooths the 0.9 m step). */
  breaks: KerbSeg[];
}

/** Running median of a series (odd window). */
function medianFilter(v: readonly number[], half: number): number[] {
  return v.map((_, i) => {
    const w = v.slice(Math.max(0, i - half), Math.min(v.length, i + half + 1)).sort((a, b) => a - b);
    return w[Math.floor(w.length / 2)];
  });
}

/** A swept box (w × h) along a 3D polyline: bottom-centre points, constant up = +y. */
function sweptBox(buf: MeshBuf, pts: readonly V3[], w: number, h: number, offset = 0) {
  if (pts.length < 2) return;
  const plan: V2[] = pts.map(([x, , z]) => [x, z]);
  const l = offsetPolyline(plan, offset + w / 2);
  const r = offsetPolyline(plan, offset - w / 2);
  const ring = (i: number): V3[] => [
    [l[i][0], pts[i][1], l[i][1]],
    [r[i][0], pts[i][1], r[i][1]],
    [r[i][0], pts[i][1] + h, r[i][1]],
    [l[i][0], pts[i][1] + h, l[i][1]],
  ];
  let s = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = ring(i - 1);
    const b = ring(i);
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]);
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      const p0 = a[k];
      const p1 = a[k2];
      const p2 = b[k2];
      const p3 = b[k];
      const e1 = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
      const e2 = new THREE.Vector3(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]);
      const n = e1.clone().cross(e2).normalize();
      const nn: V3 = [n.x, n.y, n.z];
      const v0 = buf.vertex(p0[0], p0[1], p0[2], nn, s, 0);
      const v1 = buf.vertex(p1[0], p1[1], p1[2], nn, s, 1);
      const v2 = buf.vertex(p2[0], p2[1], p2[2], nn, s + len, 1);
      const v3 = buf.vertex(p3[0], p3[1], p3[2], nn, s + len, 0);
      buf.tri(v0, v1, v2);
      buf.tri(v0, v2, v3);
    }
    s += len;
  }
}

/** A box between two points (centre line a → b), w wide, h tall, from each point's y up. */
function beam(buf: MeshBuf, a: V3, b: V3, w: number, h: number) {
  sweptBox(buf, [a, b], w, h);
}

/** The platform canopies' long axis and column span (columns every 6.4 m from s0 to s1 along u). */
export interface CanopyFrame {
  ring: V2[];
  cx: number;
  cz: number;
  u: V2;
  s0: number;
  s1: number;
  /** Underside of the canopy slab (y). */
  baseY: number;
}

export function canopyFrames(campus: CampusData): CanopyFrame[] {
  const out: CanopyFrame[] = [];
  for (const id of CANOPY_IDS) {
    const c = campus.buildings.find((b) => b.id === id);
    if (!c || c.baseY === undefined) continue;
    const ring = cleanRing(c.polygon);
    // Long axis: the longest edge's direction through the centroid.
    const ang = dominantAngle(ring);
    const u: V2 = [Math.cos(ang), Math.sin(ang)];
    const cx = ring.reduce((acc, p) => acc + p[0], 0) / ring.length;
    const cz = ring.reduce((acc, p) => acc + p[1], 0) / ring.length;
    const ss = ring.map((p) => (p[0] - cx) * u[0] + (p[1] - cz) * u[1]);
    out.push({ ring, cx, cz, u, s0: Math.min(...ss) + 2.5, s1: Math.max(...ss) - 2.5, baseY: c.baseY });
  }
  return out;
}

function buildRailway(campus: CampusData, terrain: Terrain): RailwayParts {
  const out: RailwayParts = {
    ballast: new MeshBuf(),
    rails: new MeshBuf(),
    railHeads: new MeshBuf(),
    masts: new MeshBuf(),
    wires: new MeshBuf(),
    edge: new MeshBuf(),
    red: new MeshBuf(),
    sleepers: [],
    soffit: new MeshBuf(),
    colliders: [],
    breaks: [],
  };
  const platformRing = ensureCCW(cleanRing(ISLAND_PLATFORM));
  const ext = terrain.extent;
  const inside = (p: V2) => p[0] > ext.minX + 1 && p[0] < ext.maxX - 1 && p[1] > ext.minZ + 1 && p[1] < ext.maxZ - 1;

  // ── Tracks.
  for (const r of campus.railway) {
    const line = r.line.filter(inside);
    if (line.length < 2 || polylineLength(line) < 4) continue;
    const samples = densify(line, 2.5);
    // Bed level: the DTM along the centre line, median-filtered (the 0.5 m DTM catches rails and sleepers).
    const bed = medianFilter(
      samples.map(({ p }) => terrain.heightAt(p[0], p[1])),
      4,
    );
    const pts: V3[] = samples.map(({ p }, i) => [p[0], bed[i], p[1]]);
    const plan: V2[] = samples.map(({ p }) => p);
    // Ballast: 3.4 m crown, 0.3 m shoulders down to 4.8 m.
    const crown = pts.map(([x, y, z]): V3 => [x, y + 0.04, z]);
    const lCrown = offsetPolyline(plan, 1.7);
    const rCrown = offsetPolyline(plan, -1.7);
    const lToe = offsetPolyline(plan, 2.4);
    const rToe = offsetPolyline(plan, -2.4);
    const base = out.ballast.vertexCount;
    for (let i = 0; i < crown.length; i++) {
      const y = crown[i][1];
      const s = samples[i].s;
      out.ballast.vertex(lToe[i][0], y - 0.32, lToe[i][1], [0, 1, 0], s, 2.4);
      out.ballast.vertex(lCrown[i][0], y, lCrown[i][1], [0, 1, 0], s, 1.7);
      out.ballast.vertex(rCrown[i][0], y, rCrown[i][1], [0, 1, 0], s, -1.7);
      out.ballast.vertex(rToe[i][0], y - 0.32, rToe[i][1], [0, 1, 0], s, -2.4);
    }
    for (let i = 1; i < crown.length; i++) {
      for (let k = 0; k < 3; k++) {
        const a = base + (i - 1) * 4 + k;
        const b = base + i * 4 + k;
        out.ballast.tri(a, a + 1, b);
        out.ballast.tri(b, a + 1, b + 1);
      }
    }
    // Bed level by arc length (samples are ≤ 2.5 m apart).
    const bedAt = (s: number) => {
      let k = 1;
      while (k < samples.length - 1 && samples[k].s < s) k++;
      const a = samples[k - 1];
      const b = samples[k];
      const f = b.s > a.s ? clamp((s - a.s) / (b.s - a.s), 0, 1) : 0;
      return pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f;
    };
    const atS = (s: number) => {
      let k = 1;
      while (k < samples.length - 1 && samples[k].s < s) k++;
      return samples[Math.min(samples.length - 1, k)];
    };
    // Sleepers every 0.6 m (concrete, 2.6 m).
    for (const { p, t, s } of samplePolyline(plan, 0.6, 0.3)) {
      const y = bedAt(s) + 0.06;
      const m = new THREE.Matrix4().makeRotationY(-Math.atan2(t[1], t[0]));
      m.setPosition(p[0], y, p[1]);
      out.sleepers.push(m);
    }
    // Rails: web + foot as one box, a polished head on top.
    for (const side of [1, -1]) {
      const rail = pts.map(([x, y, z]): V3 => [x, y + 0.13, z]);
      sweptBox(out.rails, rail, 0.12, 0.13, (side * GAUGE) / 2);
      const head = pts.map(([x, y, z]): V3 => [x, y + 0.26, z]);
      sweptBox(out.railHeads, head, 0.07, 0.04, (side * GAUGE) / 2);
    }
    // Overhead line: masts every 50 m on the side away from the platform, cantilevers, contact + messenger wires.
    const total = samples[samples.length - 1].s;
    const awayFromPlatform = (p: V2, t: V2) => {
      if (!platformRing) return 1;
      const left: V2 = [p[0] + t[1] * 6, p[1] - t[0] * 6];
      return pointInRing(left, platformRing) ? -1 : 1;
    };
    const mastAt: { p: V2; t: V2; y: number; side: number }[] = [];
    for (let s = 12; s < total - 4; s += 50) {
      const q = samplePolyline(plan, 1e9, s)[0] ?? atS(s);
      mastAt.push({ p: q.p, t: q.t, y: bedAt(s), side: awayFromPlatform(q.p, q.t) });
    }
    for (const m of mastAt) {
      const left: V2 = [m.t[1], -m.t[0]];
      const off = 3.3 * m.side;
      const mp: V2 = [m.p[0] + left[0] * off, m.p[1] + left[1] * off];
      const railTop = m.y + 0.3;
      beam(out.masts, [mp[0] - m.t[0] * 0.13, m.y - 0.4, mp[1] - m.t[1] * 0.13], [mp[0] + m.t[0] * 0.13, m.y - 0.4, mp[1] + m.t[1] * 0.13], 0.3, 8.0);
      // Cantilever (tube) and brace to the contact wire over the track.
      const over: V2 = [m.p[0] + left[0] * 0.2 * m.side, m.p[1] + left[1] * 0.2 * m.side];
      tube(out.masts, [mp[0], railTop + 6.9, mp[1]], [over[0], railTop + 6.9, over[1]], 0.04, 6);
      tube(out.masts, [mp[0], railTop + 5.75, mp[1]], [over[0], railTop + 5.65, over[1]], 0.035, 6);
      tube(out.masts, [mp[0], railTop + 5.75, mp[1]], [mp[0] + (over[0] - mp[0]) * 0.55, railTop + 6.9, mp[1] + (over[1] - mp[1]) * 0.55], 0.03, 5);
      out.colliders.push({ level: "outdoor", kind: "circle", c: mp, r: 0.3 });
    }
    // Wires: contact wire 5.6 m over the rail top (zig-zag ±0.2 m between masts), messenger 6.9 m with sag.
    for (let k = 1; k < mastAt.length; k++) {
      const a = mastAt[k - 1];
      const b = mastAt[k];
      const n = 10;
      const contact: V3[] = [];
      const messenger: V3[] = [];
      for (let j = 0; j <= n; j++) {
        const f = j / n;
        const x = a.p[0] + (b.p[0] - a.p[0]) * f;
        const z = a.p[1] + (b.p[1] - a.p[1]) * f;
        const y = a.y + (b.y - a.y) * f + 0.3;
        const zig = (k % 2 ? 0.2 : -0.2) * (1 - 2 * f);
        const left: V2 = [a.t[1], -a.t[0]];
        contact.push([x + left[0] * zig, y + 5.6, z + left[1] * zig]);
        messenger.push([x, y + 6.9 - 0.45 * Math.sin(Math.PI * f), z]);
      }
      sweptBox(out.wires, contact, 0.014, 0.014);
      sweptBox(out.wires, messenger, 0.012, 0.012);
    }
  }

  // ── Platform edges: vertical faces down to the track bed, a darker coping band; breaklines keep the top flat.
  if (platformRing) {
    for (let i = 0; i < platformRing.length; i++) {
      const a = platformRing[i];
      const b = platformRing[(i + 1) % platformRing.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 6) continue; // long edges only (the ends meet stairs and slopes)
      const t = unit([b[0] - a[0], b[1] - a[1]]);
      // Outward normal of the CCW ring.
      const out2: V2 = [-t[1], t[0]];
      const segs = samplePolyline([a, b], 1, 0);
      segs.push({ p: b, t, s: len });
      const top = segs.map(({ p }) => terrain.heightAt(p[0] - out2[0] * 1.2, p[1] - out2[1] * 1.2));
      const bed = segs.map(({ p }) => terrain.heightAt(p[0] + out2[0] * 1.6, p[1] + out2[1] * 1.6));
      if (top.reduce((s, v, k) => s + v - bed[k], 0) / top.length < 0.35) continue; // not a raised edge
      out.breaks.push({ ax: a[0], az: a[1], bx: b[0], bz: b[1], nx: -out2[0], nz: -out2[1], reach: 0.9 });
      const line: V2[] = segs.map(({ p }) => p);
      const ys = segs.map((_, k): [number, number] => [bed[k] - 0.3, top[k] + SURFACE_LIFT - 0.002]);
      wallStrip(out.edge, line, ys, 0, -0.32);
      for (let k = 1; k < line.length; k++) out.colliders.push({ level: "outdoor", kind: "segment", a: line[k - 1], b: line[k] });
    }
  }

  // ── Canopy columns: rust-red tubes along each canopy's centre line, every 6.4 m.
  for (const f of canopyFrames(campus)) {
    const { ring, cx, cz, u, s0, s1 } = f;
    const c = { baseY: f.baseY };
    for (let s = s0; s <= s1 + 0.01; s += 6.4) {
      const p: V2 = [cx + u[0] * s, cz + u[1] * s];
      if (!pointInRing(p, ring)) continue;
      const y0 = terrain.heightAt(p[0], p[1]);
      tube(out.red, [p[0], y0 - 0.1, p[1]], [p[0], c.baseY, p[1]], 0.18, 12);
      // Cross beam under the roof (rust-red), across the canopy.
      const v: V2 = [-u[1], u[0]];
      const half = 2.3;
      beam(out.red, [p[0] - v[0] * half, c.baseY - 0.42, p[1] - v[1] * half], [p[0] + v[0] * half, c.baseY - 0.42, p[1] + v[1] * half], 0.18, 0.42);
      out.colliders.push({ level: "outdoor", kind: "circle", c: p, r: 0.25 });
    }
    // Longitudinal beam along the columns.
    const a: V2 = [cx + u[0] * (s0 - 2), cz + u[1] * (s0 - 2)];
    const b: V2 = [cx + u[0] * (s1 + 2), cz + u[1] * (s1 + 2)];
    beam(out.red, [a[0], c.baseY - 0.36, a[1]], [b[0], c.baseY - 0.36, b[1]], 0.24, 0.36);
    // Light soffit under the canopy slab (the slab itself is the context massing's).
    const soffit = ensureCCW(ring);
    const contour = soffit.map(([x, z]) => new THREE.Vector2(x, z));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    const base = out.soffit.vertexCount;
    for (const [x, z] of soffit) out.soffit.vertex(x, c.baseY - 0.02, z, [0, -1, 0], x, z);
    for (const [ta, tb, tc] of tris) {
      const pa = soffit[ta];
      const pb = soffit[tb];
      const pc = soffit[tc];
      const cross = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
      // Facing down: the opposite winding of an up-facing triangle.
      if (cross < 0) out.soffit.tri(base + ta, base + tc, base + tb);
      else out.soffit.tri(base + ta, base + tb, base + tc);
    }
  }

  // Kalevansilta itself (truss, glazing, roof, piers and both stairs) is world/context/bridges.ts's; the
  // ground only draws its walking deck (the street register's bridge area, a "deck" surface).
  return out;
}

// ── Module ───────────────────────────────────────────────────────────────────

export interface GroundModule extends WorldModule {
  /** Walking surface height (m) at (x, z) — the height model the ground is built on. */
  surfaceAt(x: number, z: number): number;
}

// ── Street lights (positions shared with world/landscape.ts) ─────────────────

/** "canopy": linear luminaires under the Kupittaa platform canopies (no pole). */
export type LampStyle = "street" | "path" | "lantern" | "globe" | "deck" | "canopy" | "bollard" | "spill";

export interface LampSpec {
  at: V2;
  /** Ground level at the pole. */
  y: number;
  style: LampStyle;
  /** Light centre (the luminaire) — over the road for arm lamps. */
  head: V3;
  /** Compass bearing the arm points (street lamps). */
  bearing: number;
  /** Irradiance straight below the luminaire at night (klux) and colour temperature (K). */
  lux: number;
  kelvin: number;
}

/** Jussin aukio and the campus deck (pole-top lanterns, SPEC §4.3) and the EduCity frontage (twin globes, §8.3). */
const LANTERN_ZONE: V2[] = [
  [30, -30],
  [100, -50],
  [185, 100],
  [165, 125],
  [30, 30],
];
const GLOBE_ZONE: V2[] = [
  [200, 15],
  [280, 70],
  [270, 110],
  [190, 45],
];

/**
 * Lights on TTK's private ground, which neither the City's register nor OSM records: warm pole-top
 * lanterns on Jussin aukio and in the courtyard (SPEC §4.3), slim black box-head poles along the
 * campus deck to EduCity (SPEC §8.3). Placed on the orthophoto's plan, ≈20 m apart.
 */
export const HERO_LAMPS: { at: V2; style: LampStyle }[] = [
  { at: [11.5, -40.5], style: "lantern" },
  { at: [27.5, -26.0], style: "lantern" },
  { at: [41.8, -6.8], style: "lantern" },
  { at: [45.2, 4.4], style: "lantern" },
  { at: [53.6, -1.6], style: "lantern" },
  { at: [39.6, 15.2], style: "lantern" },
  { at: [69.6, -3.6], style: "lantern" },
  { at: [76.4, 9.4], style: "lantern" },
  { at: [74.5, 25.5], style: "lantern" },
  { at: [88.8, 21.0], style: "lantern" },
  { at: [80.4, -14.6], style: "lantern" },
  { at: [92.2, -29.2], style: "lantern" },
  ...([
    [101.5, 47.2],
    [118.6, 61.2],
    [135.9, 75.0],
    [152.6, 88.6],
    [168.0, 101.3],
  ] as V2[]).map((at) => ({ at, style: "deck" as const })),
  // Black bollard lights (≈0.8 m): along the timber terrace's edge by the courtyard passage (round heads on
  // the City's 2022 true orthophoto) and on the Joki NE deck (SPEC §4.3).
  ...([
    [29.6, -17.9],
    [33.1, -12.75],
    [43.4, 1.9],
    [66.7, 6.4],
    [73.0, -3.1],
    [78.2, 22.2],
    [77.1, 27.9],
    [82.6, 16.6],
    [70.8, 2.0],
    [69.0, 9.6],
  ] as V2[]).map((at) => ({ at, style: "bollard" as const })),
  // Light spilling onto the terrace from the Aulagalleria's glass wall (the build area is lit all night):
  // just outside the glass arc (centre (4.9, 4.4), glass r ≈ 20.5 m) in front of the event entrance.
  ...[-58, -46, -34, -22, -10].map((deg): { at: V2; style: LampStyle } => ({
    at: [4.9 + 22.6 * Math.cos((deg * Math.PI) / 180), 4.4 + 22.6 * Math.sin((deg * Math.PI) / 180)],
    style: "spill",
  })),
];

/**
 * Every street and path light of the register (SPEC §4.1, §8.3): ≈10 m
 * galvanised masts with an arm and a flat LED head over the carriageway
 * (≈3000 K), ≈4.5 m path lights, warm pole-top lanterns on Jussin aukio and
 * the deck, twin globes along EduCity on Joukahaisenkatu.
 */
export function lampSpecs(streets: StreetsData, terrain: Terrain, campus?: CampusData): LampSpec[] {
  // Linear LED luminaires under the platform canopies, between the columns (≈20 lux on the platform).
  const canopy: LampSpec[] = [];
  for (const f of campus ? canopyFrames(campus) : []) {
    const bearing = (Math.atan2(f.u[1], f.u[0]) * 180) / Math.PI;
    for (let s = f.s0 + 3.2; s < f.s1; s += 6.4) {
      const at: V2 = [f.cx + f.u[0] * s, f.cz + f.u[1] * s];
      if (!pointInRing(at, f.ring)) continue;
      const y = terrain.heightAt(at[0], at[1]);
      canopy.push({ at, y, style: "canopy", head: [at[0], f.baseY - 0.12, at[1]], bearing, lux: 0.02, kelvin: 4000 });
    }
  }
  const hero = HERO_LAMPS.map((l): LampSpec => {
    const y = terrain.heightAt(l.at[0], l.at[1]);
    if (l.style === "deck") return { at: l.at, y, style: "deck", head: [l.at[0], y + 3.6, l.at[1]], bearing: 0, lux: 0.008, kelvin: 3500 };
    if (l.style === "bollard") return { at: l.at, y, style: "bollard", head: [l.at[0], y + 0.7, l.at[1]], bearing: 0, lux: 0.007, kelvin: 3000 };
    if (l.style === "spill") return { at: l.at, y, style: "spill", head: [l.at[0], y + 2.6, l.at[1]], bearing: 0, lux: 0.0085, kelvin: 3500 };
    return { at: l.at, y, style: "lantern", head: [l.at[0], y + 4.0, l.at[1]], bearing: 0, lux: 0.01, kelvin: 3000 };
  });
  return [...hero, ...canopy, ...streets.lamps.map((l): LampSpec => {
    const y = terrain.heightAt(l.at[0], l.at[1]);
    let style: LampStyle = l.kind === "street" ? "street" : "path";
    if (style === "path" && pointInRing(l.at, LANTERN_ZONE)) style = "lantern";
    if (style === "street" && pointInRing(l.at, GLOBE_ZONE)) style = "globe";
    const bearing = l.road?.bearing ?? 0;
    const b = (bearing * Math.PI) / 180;
    if (style === "street") {
      // Arm towards the kerb: 1.2–1.6 m, head 9.6 m up; ≈15 lux under the head (SPEC §8.3: pools 15–20 lux).
      const arm = clamp((l.road?.distance ?? 2) * 0.7, 1.0, 1.6);
      return { at: l.at, y, style, head: [l.at[0] + Math.sin(b) * arm, y + 9.6, l.at[1] - Math.cos(b) * arm], bearing, lux: 0.016, kelvin: 3600 };
    }
    if (style === "globe") return { at: l.at, y, style, head: [l.at[0], y + 4.6, l.at[1]], bearing, lux: 0.011, kelvin: 3800 };
    if (style === "lantern") return { at: l.at, y, style, head: [l.at[0], y + 4.0, l.at[1]], bearing, lux: 0.01, kelvin: 3000 };
    return { at: l.at, y, style, head: [l.at[0], y + 4.4, l.at[1]], bearing, lux: 0.008, kelvin: 3400 };
  })];
}

/** Irradiance the map stores at 255 (klux). */
export const POOL_SCALE = 0.05;

/**
 * Ground irradiance from every street light at night (RGB, 1 m cells over
 * the terrain extent, 255 = POOL_SCALE klux): a full-cut-off luminaire with a
 * bat-wing distribution, stretched along the road for street lamps.
 */
export function buildPoolMap(lamps: LampSpec[], ext: { minX: number; maxX: number; minZ: number; maxZ: number }, res = 1): { data: Uint8Array; w: number; h: number } {
  const w = Math.ceil((ext.maxX - ext.minX) / res);
  const h = Math.ceil((ext.maxZ - ext.minZ) / res);
  const acc = new Float32Array(w * h * 3);
  const col = new THREE.Color();
  for (const l of lamps) {
    const hgt = Math.max(2, l.head[1] - l.y);
    lampColor(l.kelvin, col);
    const I0 = l.lux * hgt * hgt;
    const reach = hgt * 3.2;
    const b = (l.bearing * Math.PI) / 180;
    // Road axis is perpendicular to the arm.
    const ax = Math.cos(b);
    const az = Math.sin(b);
    const along = l.style === "street" ? 1.35 : l.style === "canopy" ? 1.6 : 1;
    const across = l.style === "street" ? 0.85 : l.style === "canopy" ? 0.8 : 1;
    const i0 = Math.max(0, Math.floor((l.head[0] - reach - ext.minX) / res));
    const i1 = Math.min(w - 1, Math.ceil((l.head[0] + reach - ext.minX) / res));
    const j0 = Math.max(0, Math.floor((l.head[2] - reach - ext.minZ) / res));
    const j1 = Math.min(h - 1, Math.ceil((l.head[2] + reach - ext.minZ) / res));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const dx = ext.minX + (i + 0.5) * res - l.head[0];
        const dz = ext.minZ + (j + 0.5) * res - l.head[2];
        // Distance in the stretched frame (along the road / across).
        const u = (dx * ax + dz * az) / along;
        const v = (-dx * az + dz * ax) / across;
        const r2 = u * u + v * v;
        const d2 = r2 + hgt * hgt;
        const cos = hgt / Math.sqrt(d2);
        const theta = Math.acos(cos);
        const sin2 = 1 - cos * cos;
        const cutoff = 1 - smoothstep(1.22, 1.43, theta); // 70° → 82°
        const E = ((I0 * (1 + 0.9 * sin2)) * cos * cutoff) / d2;
        if (E < 1e-5) continue;
        const k = (j * w + i) * 3;
        acc[k] += E * col.r;
        acc[k + 1] += E * col.g;
        acc[k + 2] += E * col.b;
      }
    }
  }
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = Math.min(255, Math.round((acc[i * 3] / POOL_SCALE) * 255));
    data[i * 4 + 1] = Math.min(255, Math.round((acc[i * 3 + 1] / POOL_SCALE) * 255));
    data[i * 4 + 2] = Math.min(255, Math.round((acc[i * 3 + 2] / POOL_SCALE) * 255));
    data[i * 4 + 3] = 255;
  }
  return { data, w, h };
}

/** White point the night street scene is seen at (a camera at night balances to ≈ 4100 K, not daylight). */
const NIGHT_WHITE_K = 4100;
const nightWhite = new THREE.Color();

/**
 * Colour of an LED street light (linear sRGB, luminance 1) as it reads at night: its blackbody colour
 * relative to the night white point, so 3000 K reads warm white and 4000 K near neutral — not the
 * sodium orange the raw 3000 K blackbody gives against the daylight (D65) white.
 */
export function lampColor(kelvin: number, target: THREE.Color): THREE.Color {
  kelvinRGB(kelvin, target);
  kelvinRGB(NIGHT_WHITE_K, nightWhite);
  target.setRGB(target.r / nightWhite.r, target.g / nightWhite.g, target.b / nightWhite.b);
  const lum = 0.2126 * target.r + 0.7152 * target.g + 0.0722 * target.b;
  return lum > 0 ? target.multiplyScalar(1 / lum) : target;
}

/** Blackbody colour (linear sRGB, luminance 1) — same fit as sky/sky.ts kelvinToLinear. */
function kelvinRGB(kelvin: number, target: THREE.Color): THREE.Color {
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
  target.setRGB(clamp(r, 0, 255) / 255, clamp(g, 0, 255) / 255, clamp(b, 0, 255) / 255, THREE.SRGBColorSpace);
  const lum = 0.2126 * target.r + 0.7152 * target.g + 0.0722 * target.b;
  return lum > 0 ? target.multiplyScalar(1 / lum) : target;
}

/** Everything the ground derives from the data (shared with world/landscape.ts; built once per data set). */
export interface GroundPlan {
  mask: Raster;
  bits: { BUILDING: number; HARD: number; CARRIAGEWAY: number; STAIRS: number };
  insideBuilding: Uint8Array;
  surfaces: Surface[];
  heights: HeightModel;
  kerbField: KerbField;
  railway: RailwayParts;
  stairSpecs: StairSpec[];
  /** Hard surface (any paving) under (x, z). */
  paved(x: number, z: number): boolean;
  /** On a carriageway. */
  carriageway(x: number, z: number): boolean;
  /** Enclosed hero footprints: nothing of the ground or the landscape goes inside. */
  hero: HeroCut;
}

const plans = new WeakMap<Terrain, GroundPlan>();

/** Masks, surfaces, breaklines and the height model for the loaded data (cached per terrain). */
export function prepareGround(campus: CampusData, streets: StreetsData, terrain: Terrain): GroundPlan {
  const cached = plans.get(terrain);
  if (cached) return cached;
  const ext = terrain.extent;
  // ── Masks: buildings (interior only — arcades and pilotis stay open), hard surfaces, carriageways.
  const MASK_RES = 0.5;
  const mask = makeRaster(ext, MASK_RES);
  const BUILDING = 1;
  const HARD = 2;
  const CARRIAGEWAY = 4;
  const STAIRS = 8;
  for (const b of campus.buildings) {
    if (b.baseY !== undefined || (b.minHeight ?? 0) > 2 || b.use === "roof") continue;
    rasterFill(mask, b.polygon, (k) => (mask.data[k] |= BUILDING));
    for (const h of b.holes ?? []) rasterFill(mask, h, (k) => (mask.data[k] &= ~BUILDING));
    for (const part of b.parts ?? []) {
      if ((part.minLevel ?? 0) >= 1 || (part.minHeight ?? 0) > 2) rasterFill(mask, part.polygon, (k) => (mask.data[k] &= ~BUILDING));
    }
  }
  const insideBuilding = erodeBit(mask, BUILDING, 2); // ≥ 1 m inside a footprint
  const hero = heroCut(campus);

  // ── Surfaces: street register (priority 3), hero zone (2), OSM areas (1), OSM paths (0).
  const surfaces: Surface[] = [];
  for (const a of streets.areas) {
    const kind = streetSurfaceKind(a);
    if (!kind) continue;
    const ring = ensureCCW(cleanRing(a.poly));
    if (ring.length < 3) continue;
    const side: Side = a.part === "carriageway" ? "low" : "high";
    surfaces.push({ kind, ring, side, priority: 3, deckY: a.deckY, angle: dominantAngle(ring) });
    if (a.part === "carriageway") rasterFill(mask, ring, (k) => (mask.data[k] |= CARRIAGEWAY));
  }
  const registerCover = makeRaster(ext, MASK_RES);
  for (const sf of surfaces) rasterFill(registerCover, sf.ring, (k) => (registerCover.data[k] = 1));
  const inRegister = (x: number, z: number) => rasterAt(registerCover, x, z) === 1;
  // Hand-traced hero surfaces and the hero zone's OSM areas, arcades and pilotis under buildings.
  for (const h of HERO_SURFACES) {
    const ring = ensureCCW(cleanRing(h.ring));
    surfaces.push({ kind: h.kind, ring, side: h.kind === "road" ? "low" : "high", priority: 2, angle: dominantAngle(ring), lift: h.lift, slope: h.slope });
    rasterFill(registerCover, ring, (k) => (registerCover.data[k] = 2));
  }
  for (const b of campus.buildings) {
    for (const part of b.parts ?? []) {
      if (!((part.minLevel ?? 0) >= 1 || (part.minHeight ?? 0) > 2)) continue;
      const ring = ensureCCW(cleanRing(part.polygon));
      if (ring.length < 3 || coveredFraction(ring, inRegister) > 0.8) continue;
      surfaces.push({ kind: "slabs", ring, side: "high", priority: 2, angle: dominantAngle(ring) });
      rasterFill(registerCover, ring, (k) => (registerCover.data[k] = 2));
    }
  }
  for (const a of campus.areas) {
    const hero = OSM_AREA_KIND[a.id];
    const kind = hero ?? osmAreaKind(a.kind, a.surface);
    if (!kind || (a.y !== undefined && !hero)) continue;
    const ring = ensureCCW(cleanRing(a.polygon));
    if (ring.length < 3) continue;
    // Skip OSM areas the street register already surfaces.
    if (!hero && coveredFraction(ring, inRegister) > 0.8) continue;
    surfaces.push({ kind, ring, side: "high", priority: hero ? 2 : 1, angle: dominantAngle(ring) });
    rasterFill(registerCover, ring, (k) => (registerCover.data[k] = 2));
  }
  const covered = (x: number, z: number) => rasterAt(registerCover, x, z) !== 0;
  for (const r of campus.roads) {
    if (r.tunnel || r.bridge || (r.layer ?? 0) !== 0 || r.kind === "steps") continue;
    const kind = osmRoadKind(r.kind, r.surface, r.service);
    if (!kind) continue;
    const line = r.centerline;
    if (line.length < 2) continue;
    // Only where nothing else surfaces the ground: sidewalks and register streets are already there.
    const along = samplePolyline(line, 2);
    const share = along.filter(({ p }) => covered(p[0], p[1])).length / Math.max(1, along.length);
    if (share > 0.5) continue;
    const width = clamp(r.width, kind === "road" ? 4 : 1.2, 14);
    const ring = bufferPolyline(line, width);
    // On TTK's campus ground (courtyards, Pihakansi, the deck) untagged paths are paved, not asphalt.
    const mid = line[Math.floor(line.length / 2)];
    const paved = kind === "footway" && !r.surface && pointInRing(mid, CAMPUS_GROUND);
    surfaces.push({ kind: paved ? "slabs" : kind, ring, side: kind === "road" ? "low" : "high", priority: 0, angle: paved ? dominantAngle(ring) : 0 });
  }
  for (const sf of surfaces) rasterFill(mask, sf.ring, (k) => (mask.data[k] |= HARD));

  // ── Height model: kerbs, retaining walls and platform edges are breaklines; surfaces dive under stairs.
  const wallLines = [
    ...streets.walls.map((w) => w.line.map(([x, , z]): V2 => [x, z])),
    ...HERO_WALLS.map((w) => w.line),
  ];
  const railway = buildRailway(campus, terrain);
  const breaks = [
    ...buildKerbs(streets, terrain, (x, z) => (rasterAt(mask, x, z) & CARRIAGEWAY) !== 0),
    ...wallBreaklines(wallLines, terrain),
    ...railway.breaks,
  ];
  const kerbField = new KerbField(breaks);
  // Kalevansilta's street stair is modelled with the bridge (the City's flights carry DTM levels from under it).
  const nearStreetStair = (ring: V2[]) => {
    const c = polygonCentroid(ring);
    return distSeg(c, KALEVANSILTA_STREET_STAIR.top, KALEVANSILTA_STREET_STAIR.bottom) < 4;
  };
  const stairSpecs: StairSpec[] = [
    ...streets.stairs
      .filter((st) => !nearStreetStair(st.outline) && !hero.inside(...polygonCentroid(st.outline)))
      .map((st) => ({ outline: st.outline, yBottom: st.yBottom, yTop: st.yTop, upBearing: st.upBearing, risers: st.steps.length })),
    ...HERO_STAIRS,
  ];
  for (const st of stairSpecs) rasterFill(mask, st.outline, (k) => (mask.data[k] |= STAIRS));
  const fills = HERO_FILLS.map((f) => ({ ring: ensureCCW(f.ring), minY: f.minY, b: polygonBounds(f.ring) }));
  const floorAt = (x: number, z: number) => {
    let y = -Infinity;
    for (const f of fills) if (x >= f.b.minX && x <= f.b.maxX && z >= f.b.minZ && z <= f.b.maxZ && pointInRing([x, z], f.ring)) y = Math.max(y, f.minY);
    return y;
  };
  const heights = createHeightModel(terrain, kerbField, (x, z) => ((rasterAt(mask, x, z) & STAIRS) !== 0 ? 0.3 : 0), floorAt);
  const plan: GroundPlan = {
    mask,
    bits: { BUILDING, HARD, CARRIAGEWAY, STAIRS },
    insideBuilding,
    surfaces,
    heights,
    kerbField,
    railway,
    stairSpecs,
    paved: (x, z) => (rasterAt(mask, x, z) & HARD) !== 0,
    carriageway: (x, z) => (rasterAt(mask, x, z) & CARRIAGEWAY) !== 0,
    hero,
  };
  plans.set(terrain, plan);
  return plan;
}

type LibName = Parameters<TwinContext["materials"]["variant"]>[0];

/** Everything the ground draws, as plain geometry (no materials, no textures — unit-testable). */
export interface GroundGeometry {
  plan: GroundPlan;
  /** One merged, overlap-free surface mesh per texture set (vertex colours = per-kind tints). */
  surfaces: { group: SurfaceGroup; geometry: THREE.BufferGeometry }[];
  kerbs: THREE.BufferGeometry | null;
  /** Stairs, walls, beds, the railway and Kalevansilta, merged per library material (vertex-colour tints). */
  parts: { name: string; lib: LibName; base: string; rough?: number; tile?: [number, number]; cast: boolean; geometry: THREE.BufferGeometry }[];
  markings: THREE.BufferGeometry | null;
  /** Wheel paths of every lane (for the asphalt detail map). */
  tracks: V2[][];
  terrain: THREE.BufferGeometry;
  far: THREE.BufferGeometry;
  colliders: Collider2D[];
}

/** Build every ground geometry for the loaded data (pure; buildGround adds materials). */
export function buildGroundGeometry(campus: CampusData, streets: StreetsData, terrain: Terrain, tier: TwinContext["tier"]): GroundGeometry {
  const plan = prepareGround(campus, streets, terrain);
  const { mask, insideBuilding, surfaces, heights, kerbField, railway, stairSpecs } = plan;
  const { HARD } = plan.bits;
  const deepInBuilding = (x: number, z: number) => {
    const i = Math.floor((x - mask.x0) / mask.res);
    const j = Math.floor((z - mask.z0) / mask.res);
    return i >= 0 && j >= 0 && i < mask.w && j < mask.h && insideBuilding[j * mask.w + i] === 1;
  };

  // ── Hard surfaces: overlap-free (each surface fills only ground nothing above it in priority, nor an
  // earlier one of its own priority, covers), merged into one mesh per texture set with per-vertex tints.
  const cellFor = (s: Surface) => {
    const b = polygonBounds(s.ring);
    const far = b.maxX < -60 || b.minX > 340 || b.maxZ < -260 || b.minZ > 150;
    return tier === "low" ? (far ? 12 : 7) : far ? 6 : 3;
  };
  const groups = new Map<SurfaceGroup, MeshBuf>();
  const cover = new Coverage();
  // Priority first; within a priority the smaller (more specific) surface wins — the timber terrace over the
  // courtyard yard it sits in, a pedestrian area over the car park around it.
  const ordered = surfaces
    .map((s, i) => ({ s, i, area: Math.abs(ringArea(s.ring)) }))
    .sort((a, b) => b.s.priority - a.s.priority || a.area - b.area || a.i - b.i);
  for (const { s } of ordered) {
    const look = SURFACE_LOOK[s.kind];
    let buf = groups.get(look.group);
    if (!buf) {
      buf = new MeshBuf();
      groups.set(look.group, buf);
    }
    buf.color = surfaceTint(s.kind);
    // Higher-priority layers sit a millimetre or two higher (belt and braces: they no longer overlap).
    const lift = SURFACE_LIFT + (s.priority - 3) * 0.002 + (s.lift ?? 0);
    const deck = s.deckY;
    const ramp = s.slope ? rampFn(s.slope) : null;
    // Bridge decks are at another level: they neither clip nor get clipped by the ground below.
    const onGround = deck === undefined;
    drapeRing(buf, s.ring, {
      cell: cellFor(s),
      y: deck !== undefined ? () => deck : ramp ? (x, z) => ramp.y(x, z) + lift : (x, z) => heights.y(x, z, s.side) + lift,
      n: deck !== undefined ? () => [0, 1, 0] : ramp ? () => ramp.n : (x, z) => heights.normal(x, z, s.side),
      angle: s.angle,
      uvScale: look.uvScale,
      skirt: deck !== undefined ? 0.6 : SKIRT,
      // Only cells wholly deep inside a building (all four corners): a coarse cell whose centre is just
      // inside a wall still paves the strip outside it.
      skip: onGround
        ? (x0, z0, x1, z1) => deepInBuilding(x0, z0) && deepInBuilding(x1, z0) && deepInBuilding(x0, z1) && deepInBuilding(x1, z1)
        : undefined,
      cut: plan.hero,
      // The street register is a partition: its own areas are not clipped against each other.
      cover: onGround && s.priority < 3 ? cover : undefined,
    });
    if (onGround) cover.add(s.ring);
  }
  const surfaceGeos: GroundGeometry["surfaces"] = [];
  for (const [group, buf] of groups) {
    const geometry = buf.geometry(true);
    if (geometry) surfaceGeos.push({ group, geometry });
  }

  // ── Kerbs (cut at the hero buildings' walls).
  const kerbs = buildKerbGeometry(
    kerbLines(streets, terrain).flatMap((k) =>
      plan.hero.touches(...boundsOf(k.line)) ? linesOutside(k.line, (x, z) => plan.hero.inside(x, z)).map((line) => ({ ...k, line })) : [k],
    ),
    heights,
    kerbField,
    tier === "low" ? 6 : 3,
  );

  // ── Planters, stairs, retaining walls, railings, the railway and Kalevansilta: merged per library material,
  // each part tinted by vertex colour (one draw call per material instead of one per part).
  const structures = buildStructures({ heights, stairs: stairSpecs, streets, lift: SURFACE_LIFT, hero: plan.hero });
  // Sleepers: baked into the flat concrete mesh (they never cast).
  const sleeperBuf = new MeshBuf();
  // (Phones: the ballast alone; a sleeper is twelve triangles and there are hundreds.)
  if (railway.sleepers.length && tier !== "low") {
    const box = new THREE.BoxGeometry(0.26, 0.2, 2.6).toNonIndexed();
    boxUVGeometry(box);
    const p = box.getAttribute("position");
    const nrm = box.getAttribute("normal");
    const uvA = box.getAttribute("uv");
    const v = new THREE.Vector3();
    const nv = new THREE.Vector3();
    const nm = new THREE.Matrix3();
    for (const m of railway.sleepers) {
      nm.getNormalMatrix(m);
      const base = sleeperBuf.vertexCount;
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(m);
        nv.fromBufferAttribute(nrm, i).applyMatrix3(nm).normalize();
        sleeperBuf.vertex(v.x, v.y, v.z, [nv.x, nv.y, nv.z], uvA.getX(i), uvA.getY(i));
      }
      for (let i = 0; i < p.count; i++) sleeperBuf.idx.push(base + i);
    }
    box.dispose();
  }
  const mergedParts: { name: string; lib: LibName; base: string; rough?: number; cast: boolean; parts: [MeshBuf, string][]; tile?: [number, number] }[] = [
    { name: "concrete", lib: "concreteFacade", base: "#9a9893", rough: 0.92, cast: true, parts: [[structures.concrete, "#9a9893"]] },
    {
      // Flat or low concrete that never needs to cast: platform edges, the canopy soffit, sleepers.
      name: "concrete-flat",
      lib: "concreteFacade",
      base: "#a8a59f",
      rough: 0.92,
      cast: false,
      parts: [
        [railway.edge, "#a8a59f"],
        [railway.soffit, "#cfc6b6"],
        [sleeperBuf, "#8e8a83"],
      ],
    },
    {
      // Shadow casters only where the shadow reads: the garage portal and boxes, the canopy columns
      // (every caster is drawn again into each shadow cascade it touches).
      name: "metal",
      lib: "metalDark",
      base: "#2a2b2e",
      rough: 0.62,
      cast: true,
      parts: [
        [structures.dark, "#08090b"],
        [railway.red, "#a2472f"],
      ],
    },
    {
      // Low or thin dark metal: planter edges, rails, the catenary wires.
      name: "metal-thin",
      lib: "metalDark",
      base: "#2a2b2e",
      rough: 0.62,
      cast: false,
      parts: [
        [structures.steel, "#2a2b2e"],
        [railway.rails, "#4a3a30"],
        [railway.wires, "#2c2a28"],
      ],
    },
    {
      // Handrails, rail heads and catenary masts: thin, no shadows.
      name: "steel",
      lib: "steel",
      base: "#a6aaad",
      cast: false,
      parts: [
        [structures.rails, "#c4c7c9"],
        [railway.railHeads, "#b8b9ba"],
        [railway.masts, "#9ea3a6"],
      ],
    },
    {
      name: "white",
      lib: "metalWhite",
      base: "#e6e8e8",
      rough: 0.58,
      cast: true,
      parts: [
        [structures.coping, "#e4e6e7"],
      ],
    },
    { name: "ballast", lib: "gravel", base: "#625c55", rough: 1, cast: false, parts: [[railway.ballast, "#625c55"]] },
    { name: "beds", lib: "mulch", base: "#3e2c1c", cast: false, parts: [[structures.soil, "#3e2c1c"]] },
  ];
  const parts: GroundGeometry["parts"] = [];
  for (const g of mergedParts) {
    const merged = new MeshBuf();
    const baseC = new THREE.Color(g.base);
    for (const [part, hex] of g.parts) {
      const c = new THREE.Color(hex);
      appendTinted(merged, part, [c.r / Math.max(baseC.r, 1e-4), c.g / Math.max(baseC.g, 1e-4), c.b / Math.max(baseC.b, 1e-4)]);
    }
    const geometry = merged.geometry(true);
    if (!geometry) continue;
    fixWinding(geometry);
    parts.push({ name: g.name, lib: g.lib, base: g.base, rough: g.rough, tile: g.tile, cast: g.cast && (tier !== "low" || g.name === "concrete"), geometry });
  }

  // ── Road markings (and the lanes' wheel paths).
  const carr = new CarriagewayIndex(streets.areas.filter((a) => a.part === "carriageway").map((a) => ensureCCW(cleanRing(a.poly))));
  const painted = paintRoads({ campus, streets, heights, carr });

  // ── Terrain (exactly outside the hero footprints) and the far ring.
  const terrainGeo = buildTerrainGeometry(
    terrain,
    mask,
    tier === "low" ? 5 : 2.5,
    HARD,
    insideBuilding,
    (x, z) => Math.min(terrain.heightAt(x, z), heights.y(x, z, "low")),
    plan.hero,
  );
  return {
    plan,
    surfaces: surfaceGeos,
    kerbs,
    parts,
    markings: painted.buf.geometry(),
    tracks: painted.tracks,
    terrain: terrainGeo,
    far: buildFarGeometry(terrain),
    colliders: [...structures.colliders, ...railway.colliders],
  };
}

// ── Views and targets (SPEC §6, DESIGN §7). Every camera stays at least a metre clear of the camera
// volumes of data/campus.ts buildingVolumes() (tested): the orbit pushes a camera inside one onto its roof.
export const GROUND_VIEWS: Readonly<Record<string, CameraView>> = {
  // Jussin aukio from above its south-east corner (over Joki's hall roof, clear of BioCity's south-east end):
  // the plaza and its main stair down from the campus deck, the Joki drum at the bottom right, the timber
  // terrace and BioCity's event entrance at the apex of the curved Aulagalleria, Electrocity's striped wall
  // behind (round 1: the pose over ICT-City's one-storey wing spent a third of the frame on its roof).
  "campus:courtyard": {
    position: [54, 46, 36],
    target: [38, 0, -2],
    hfov: 60,
    portrait: { position: [52, 60, 42], target: [38, 0, 0], fit: 34 },
    open: null,
  },
  // Plan view framed inside the terrain data (x −179…343): from the station's platform in the north to
  // EduCity in the south, BioCity on Tykistökatu in the west to ParkCity and Kalevansilta in the east.
  "campus:top": {
    position: [100, 470, 40],
    target: [100, 0, -6],
    fov: 38,
    fit: 165,
    labels: true,
    open: null,
  },
};
export const GROUND_TARGETS: readonly TwinTarget[] = [
  {
    id: "jussin-aukio",
    // From above Lemminkäisenkatu's pedestrian end, between ICT-City and Electrocity (Eurocity's corner
    // blocks anything further north-east).
    view: { position: [98, 40, -32], target: [50, 1, 5], hfov: 62, portrait: { position: [84, 34, -18], target: [50, 1, 6] }, open: null },
    level: "outdoor",
    walkTo: [52.5, 6.5],
  },
  {
    id: "kupittaa-station",
    view: { position: [252, 34, -84], target: [212, -3, -122], hfov: 62, open: null },
    level: "outdoor",
    walkTo: [214.6, -116.4],
  },
  {
    id: "parkcity",
    view: { position: [182, 26, 34], target: [222, 8, -8], hfov: 62, open: null },
    level: "outdoor",
    walkTo: [207.5, 2.5],
  },
];

export async function buildGround(ctx: TwinContext): Promise<GroundModule> {
  const [campus, streets, terrain] = await Promise.all([loadCampus(), loadStreets(), loadTerrain()]);
  const root = new THREE.Group();
  root.name = "ground";
  const owned: { dispose(): void }[] = [];
  const tier = ctx.tier;
  const ext = terrain.extent;
  const geo = buildGroundGeometry(campus, streets, terrain, tier);
  const { plan } = geo;
  const { heights } = plan;

  // ── Materials, with the street-light pools.
  const mats = createSurfaceMaterials(ctx);
  owned.push({ dispose: () => mats.dispose() });
  const pool = buildPoolMap(lampSpecs(streets, terrain, campus), ext, tier === "low" ? 2 : 1);
  const poolTex = new THREE.DataTexture(pool.data, pool.w, pool.h, THREE.RGBAFormat);
  poolTex.magFilter = THREE.LinearFilter;
  poolTex.minFilter = THREE.LinearFilter;
  poolTex.generateMipmaps = false;
  poolTex.colorSpace = THREE.NoColorSpace;
  poolTex.flipY = false;
  poolTex.needsUpdate = true;
  owned.push(poolTex);
  mats.setPoolMap(poolTex, ext);
  const detailTex = buildAsphaltDetail(plan, terrain, kerbLines(streets, terrain), geo.tracks, tier === "low" ? 0.5 : 0.25);
  if (detailTex) {
    owned.push(detailTex);
    mats.setDetailMap(detailTex, DETAIL_EXT);
  }

  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, name: string, cast = false) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    root.add(mesh);
  };
  for (const s of geo.surfaces) add(s.geometry, mats.group(s.group), `ground-${s.group}`);
  if (geo.kerbs) add(geo.kerbs, mats.kerb, "ground-kerbs");
  for (const part of geo.parts) {
    const mat = mats.extra(part.lib, { color: part.base, ...(part.rough !== undefined ? { roughness: part.rough } : {}), ...(part.tile ? { tile: part.tile } : {}) });
    mat.vertexColors = true;
    mat.needsUpdate = true;
    add(part.geometry, mat, `ground-${part.name}`, part.cast);
  }
  if (geo.markings) add(geo.markings, mats.marking, "ground-markings");

  // ── Terrain and land cover.
  const splat = buildSplat(campus, streets, terrain, plan.mask, vegetationMask().data);
  owned.push(splat);
  mats.setLeafMap(splat, ext);
  const terrainMat = makeTerrainMaterial(ctx, splat, ext, mats.pools);
  owned.push(terrainMat);
  add(geo.terrain, terrainMat, "ground-terrain");
  const farMat = makeFarGroundMaterial(ext);
  owned.push(farMat);
  add(geo.far, farMat, "ground-far");

  // ── Views and targets: copies, so the engine may annotate them per build.
  const views: Record<string, CameraView> = structuredClone(GROUND_VIEWS) as Record<string, CameraView>;
  const targets: TwinTarget[] = structuredClone(GROUND_TARGETS) as TwinTarget[];
  // Street names on the carriageway centre lines, 3 m up, at least 25 m from the entrance labels (the
  // EduCity address, the taxi and drop-off instructions use them).
  const street = (name: string, x: number, z: number) => makeLabel(name, "street", x, heights.y(x, z, "low") + 3, z, "campus");
  const labels = [
    makeLabel("Jussin aukio", "landmark", 52, 6, 6, "campus"),
    makeLabel("Kupittaa station", "landmark", 212, 4, -122, "campus"),
    street("Tykistökatu", -38, -38),
    street("Tykistökatu", 4, -95),
    street("Lemminkäisenkatu", -36, 16),
    street("Lemminkäisenkatu", 28, 88),
    street("Lemminkäisenkatu", 88, 136),
    street("Joukahaisenkatu", 121, -46),
    street("Joukahaisenkatu", 170, -6.5),
    street("Joukahaisenkatu", 252, 62),
  ];
  for (const l of labels) root.add(l);

  // ── Walking: the whole outdoor ground (buildings, walls and furniture are colliders of their own modules).
  const walkAreas: WalkArea[] = [
    {
      level: "outdoor",
      y: 0,
      polygon: [
        [ext.minX + 2, ext.minZ + 2],
        [ext.minX + 2, ext.maxZ - 2],
        [ext.maxX - 2, ext.maxZ - 2],
        [ext.maxX - 2, ext.minZ + 2],
      ],
    },
  ];
  const colliders: Collider2D[] = geo.colliders;

  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("groundDebug")) {
    const rows: string[] = [];
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const idx = m.geometry.getIndex();
      const tris = (idx ? idx.count : m.geometry.getAttribute("position").count) / 3;
      rows.push(`${m.name}: ${Math.round(tris * ((m as THREE.InstancedMesh).count ?? 1))}`);
    });
    console.warn(`[ground] ${rows.join(" | ")}`);
    (window as unknown as { __ground?: THREE.Object3D }).__ground = root;
  }
  const ground: GroundModule = {
    id: "ground",
    root,
    labels,
    pickables: [],
    targets,
    views,
    walkAreas,
    colliders,
    ready: ctx.materials.ready(),
    surfaceAt: (x, z) => heights.y(x, z),
    setLighting(state: LightingState) {
      mats.setLighting(state);
    },
    dispose() {
      for (const o of owned) o.dispose();
    },
  };
  return ground;
}

/** Share of a ring's sample points that satisfy `covered` (coarse, for overlap tests). */
function coveredFraction(ring: readonly V2[], covered: (x: number, z: number) => boolean): number {
  const b = polygonBounds(ring);
  const step = Math.max(1, Math.sqrt(((b.maxX - b.minX) * (b.maxZ - b.minZ)) / 400));
  let n = 0;
  let hit = 0;
  for (let x = b.minX + step / 2; x < b.maxX; x += step) {
    for (let z = b.minZ + step / 2; z < b.maxZ; z += step) {
      if (!pointInRing([x, z], ring)) continue;
      n++;
      if (covered(x, z)) hit++;
    }
  }
  return n ? hit / n : 1;
}

/** OSM area kind → surface (null = soft ground or not ours). */
export function osmAreaKind(kind: string, surface?: string): SurfaceKind | null {
  if (kind === "parking") return surface === "paving_stones" || surface === "concrete" ? "verge" : "yard";
  if (kind === "pedestrian" || kind === "square") return surface === "asphalt" ? "footway" : "plazaGrey";
  if (kind === "platform") return "platform";
  if (kind === "traffic_island") return "setts";
  if (kind === "bicycle_parking" || kind === "shelter" || kind === "recycling") return "slabs";
  return null;
}

/** OSM way kind → surface (null = not a surface: steps, tracks…). */
export function osmRoadKind(kind: string, surface?: string, service?: string): SurfaceKind | null {
  switch (kind) {
    case "trunk":
    case "secondary":
    case "tertiary":
    case "unclassified":
    case "residential":
    case "living_street":
      return "road";
    case "service":
      return service === "parking_aisle" || service === "driveway" ? "yard" : "yard";
    case "footway":
    case "pedestrian":
    case "path":
      if (surface === "paving_stones" || surface === "concrete" || surface === "sett") return "slabs";
      if (surface === "gravel" || surface === "fine_gravel" || surface === "dirt" || surface === "ground") return null;
      return "footway";
    case "cycleway":
      return "footway";
    default:
      return null;
  }
}

// ── Kerb stones ──────────────────────────────────────────────────────────────

function buildKerbGeometry(lines: KerbLine[], heights: HeightModel, kerbs: KerbField, step = 3): THREE.BufferGeometry | null {
  const buf = new MeshBuf();
  for (const k of lines) {
    const line = k.line;
    const pts = densify(line, step);
    if (pts.length < 2) continue;
    // Cross-section per sample: n points to the high side.
    const rows: { p: V2; n: V2; low: number; high: number; s: number }[] = [];
    for (const { p, t, s } of pts) {
      const hit = kerbs.nearest(p[0], p[1], 0.3);
      let n: V2 = hit ? [hit.seg.nx, hit.seg.nz] : [-t[1], t[0]];
      // Keep n perpendicular to this kerb's own tangent, on the high side.
      const perp: V2 = [t[1], -t[0]];
      n = perp[0] * n[0] + perp[1] * n[1] >= 0 ? perp : [-perp[0], -perp[1]];
      const high = heights.y(p[0] + n[0] * 0.05, p[1] + n[1] * 0.05, "high") + SURFACE_LIFT;
      const low = heights.y(p[0] - n[0] * 0.05, p[1] - n[1] * 0.05, "low") + SURFACE_LIFT;
      rows.push({ p, n, low: Math.min(low, high - 0.02), high, s });
    }
    // Profile (d across from the kerb line towards the footway, y): buried foot, face, chamfer, top. Phones
    // (coarser step) get face and top only.
    const full: { d: number; dy: (r: (typeof rows)[number]) => number; nrm: (n: V2) => V3 }[] = [
      { d: -0.005, dy: (r) => r.low - 0.08, nrm: (n) => [-n[0], 0, -n[1]] },
      { d: -0.005, dy: (r) => r.high - 0.012, nrm: (n) => [-n[0], 0, -n[1]] },
      { d: 0.008, dy: (r) => r.high + 0.004, nrm: (n) => [-n[0] * 0.6, 0.8, -n[1] * 0.6] },
      { d: KERB_TOP, dy: (r) => r.high + 0.004, nrm: () => [0, 1, 0] },
    ];
    const ring = step > 3 ? [full[0], { ...full[1], dy: full[2].dy }, full[3]] : full;
    const base = buf.vertexCount;
    for (const r of rows) {
      for (const pr of ring) {
        const x = r.p[0] + r.n[0] * pr.d;
        const z = r.p[1] + r.n[1] * pr.d;
        const y = pr.dy(r);
        // u along the kerb, v across/up (granite grain).
        buf.vertex(x, y, z, pr.nrm(r.n), r.s, pr.d * 3 + y);
      }
    }
    const m = ring.length;
    for (let i = 1; i < rows.length; i++) {
      for (let k = 0; k + 1 < m; k++) {
        const a = base + (i - 1) * m + k;
        const b = base + i * m + k;
        const c = base + i * m + k + 1;
        const d = base + (i - 1) * m + k + 1;
        // Orientation: kerb runs along t; profile goes from the road side up to the top.
        buf.tri(a, b, c);
        buf.tri(a, c, d);
      }
    }
  }
  const g = buf.geometry();
  if (!g) return null;
  fixWinding(g);
  return g;
}

/** The polyline's own vertices plus extra points so no step exceeds `max` m, with tangents and arc length. */
export function densify(line: readonly V2[], max: number): { p: V2; t: V2; s: number }[] {
  const out: { p: V2; t: V2; s: number }[] = [];
  let s = 0;
  for (let i = 0; i < line.length; i++) {
    const a = line[i];
    const b = line[Math.min(line.length - 1, i + 1)];
    const prev = line[Math.max(0, i - 1)];
    // Tangent: average of the adjoining segments.
    const t = unit([b[0] - prev[0], b[1] - prev[1]]);
    out.push({ p: a, t, s });
    if (i === line.length - 1) break;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.ceil(len / max);
    const tt = unit([b[0] - a[0], b[1] - a[1]]);
    for (let k = 1; k < n; k++) out.push({ p: [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n], t: tt, s: s + (len * k) / n });
    s += len;
  }
  return out;
}

/** Append a buffer's geometry with its vertex colours multiplied by a linear tint. */
export function appendTinted(dst: MeshBuf, src: MeshBuf, tint: V3) {
  const base = dst.vertexCount;
  for (const v of src.pos) dst.pos.push(v);
  for (const v of src.nor) dst.nor.push(v);
  for (const v of src.uv) dst.uv.push(v);
  for (let i = 0; i < src.vertexCount; i++) {
    const r = src.col[i * 3] ?? 1;
    const g = src.col[i * 3 + 1] ?? 1;
    const b = src.col[i * 3 + 2] ?? 1;
    dst.col.push(r * tint[0], g * tint[1], b * tint[2]);
  }
  for (const i of src.idx) dst.idx.push(i + base);
}

/** Make every triangle's winding agree with its vertex normals (robust for generated strips). */
function fixWinding(g: THREE.BufferGeometry) {
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const index = g.getIndex();
  if (!index) return;
  const arr = index.array as Uint16Array | Uint32Array;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  for (let i = 0; i < arr.length; i += 3) {
    a.fromBufferAttribute(pos, arr[i]);
    b.fromBufferAttribute(pos, arr[i + 1]);
    c.fromBufferAttribute(pos, arr[i + 2]);
    const face = b.sub(a).cross(c.sub(a));
    n.fromBufferAttribute(nor, arr[i]);
    n.x += nor.getX(arr[i + 1]) + nor.getX(arr[i + 2]);
    n.y += nor.getY(arr[i + 1]) + nor.getY(arr[i + 2]);
    n.z += nor.getZ(arr[i + 1]) + nor.getZ(arr[i + 2]);
    if (face.dot(n) < 0) {
      const t = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = t;
    }
  }
  index.needsUpdate = true;
}

// ── Land cover splat and terrain ─────────────────────────────────────────────

/** Separable box blur per channel (radius in cells; 0 = untouched), in place. */
export function boxBlurRGBA(data: Uint8Array, w: number, h: number, radius: [number, number, number, number]): void {
  const tmp = new Float32Array(Math.max(w, h));
  for (let c = 0; c < 4; c++) {
    const r = radius[c];
    if (!r) continue;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        let s = 0;
        let n = 0;
        for (let d = -r; d <= r; d++) {
          const ii = i + d;
          if (ii < 0 || ii >= w) continue;
          s += data[(j * w + ii) * 4 + c];
          n++;
        }
        tmp[i] = s / n;
      }
      for (let i = 0; i < w; i++) data[(j * w + i) * 4 + c] = Math.round(tmp[i]);
    }
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        let s = 0;
        let n = 0;
        for (let d = -r; d <= r; d++) {
          const jj = j + d;
          if (jj < 0 || jj >= h) continue;
          s += data[(jj * w + i) * 4 + c];
          n++;
        }
        tmp[j] = s / n;
      }
      for (let j = 0; j < h; j++) data[(j * w + i) * 4 + c] = Math.round(tmp[j]);
    }
  }
}

/**
 * Land cover at the DTM's 0.5 m grid (RGBA): R planting beds (soil/mulch),
 * G gravel (ballast, construction), B paved yards the vector surfaces do not
 * cover, A fallen leaves. Lawn is what remains.
 */
function buildSplat(campus: CampusData, streets: StreetsData, terrain: Terrain, mask: Raster, veg: Uint8Array): THREE.DataTexture {
  const r = makeRaster(terrain.extent, 0.5);
  const w = r.w;
  const h = r.h;
  const data = new Uint8Array(w * h * 4);
  // Paved by default where the orthophoto shows no vegetation.
  for (let j = 0; j < h; j++) {
    const z = r.z0 + (j + 0.5) * r.res;
    const vj = Math.floor(z - VEG_GRID.z0);
    for (let i = 0; i < w; i++) {
      const x = r.x0 + (i + 0.5) * r.res;
      const vi = Math.floor(x - VEG_GRID.x0);
      const planted = vi >= 0 && vj >= 0 && vi < VEG_GRID.w && vj < VEG_GRID.h && veg[vj * VEG_GRID.w + vi] === 1;
      if (!planted) data[(j * w + i) * 4 + 2] = 255;
    }
  }
  const paint = (ring: readonly V2[], channel: number, value: number, clearOthers = false) =>
    rasterFill(r, ring, (k) => {
      if (clearOthers) data[k * 4] = data[k * 4 + 1] = data[k * 4 + 2] = 0;
      if (channel >= 0) data[k * 4 + channel] = value;
    });
  for (const a of campus.areas) {
    const k = a.kind;
    if (/grass|grassland|meadow|park|garden|playground|pitch/.test(k)) paint(a.polygon, -1, 0, true);
    else if (/scrub|wood|flowerbed/.test(k)) paint(a.polygon, 0, 255, true);
    else if (/construction|brownfield|shingle/.test(k)) paint(a.polygon, 1, 255, true);
    else if (k === "railway") paint(a.polygon, 1, 255, true);
  }
  for (const a of streets.areas) if (a.part === "verge" && a.surface === "unknown") paint(a.poly, -1, 0, true);
  // Fallen leaves under deciduous crowns (early November), stronger close to the trunk.
  const rnd = mulberry32(911);
  for (const t of streets.trees) {
    if (t.kind !== "deciduous") continue;
    const cr = (t.crownR ?? (t.size === "large" ? 5.5 : t.size === "small" ? 2.5 : 4)) * (1.2 + rnd() * 0.5);
    const i0 = Math.max(0, Math.floor((t.at[0] - cr - r.x0) / r.res));
    const i1 = Math.min(w - 1, Math.ceil((t.at[0] + cr - r.x0) / r.res));
    const j0 = Math.max(0, Math.floor((t.at[1] - cr - r.z0) / r.res));
    const j1 = Math.min(h - 1, Math.ceil((t.at[1] + cr - r.z0) / r.res));
    // Drift with the prevailing south-westerly wind.
    const ox = 0.25 * cr;
    const oz = -0.2 * cr;
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const x = r.x0 + (i + 0.5) * r.res;
        const z = r.z0 + (j + 0.5) * r.res;
        const d = Math.hypot(x - t.at[0] - ox, z - t.at[1] - oz) / cr;
        if (d >= 1) continue;
        const k = (j * w + i) * 4 + 3;
        data[k] = Math.max(data[k], Math.round(255 * (1 - d * d) * 0.85));
      }
    }
  }
  // Soften the 1 m tracing (the shader breaks the edges up with noise).
  void mask;
  boxBlurRGBA(data, w, h, [2, 2, 2, 1]);
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.flipY = false;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Terrain grid over the DTM: cells deep inside buildings or entirely under
 * hard surfaces are left out (they are never seen); vertices under hard
 * surfaces sink TERRAIN_SINK so nothing pokes through.
 */
function buildTerrainGeometry(
  terrain: Terrain,
  mask: Raster,
  cell: number,
  hardBit: number,
  insideBuilding: Uint8Array,
  /** Lowest surface level at (x, z) — under hard surfaces the terrain sinks below it (breaklines smooth big steps). */
  lowest: (x: number, z: number) => number,
  /** Hero footprints: cut out exactly (their modules model the floors inside). */
  cut?: HeroCut,
): THREE.BufferGeometry {
  const ext = terrain.extent;
  const nx = Math.ceil((ext.maxX - ext.minX) / cell) + 1;
  const nz = Math.ceil((ext.maxZ - ext.minZ) / cell) + 1;
  const xAt = (i: number) => Math.min(ext.maxX, ext.minX + i * cell);
  const zAt = (j: number) => Math.min(ext.maxZ, ext.minZ + j * cell);
  const hardDeep = erodeBit(mask, hardBit, 1);
  // Per mask cell: 1 = the terrain shows there (not deep inside a building, not deep under paving).
  const shows = new Uint8Array(mask.w * mask.h);
  for (let k = 0; k < shows.length; k++) shows[k] = insideBuilding[k] === 1 || hardDeep[k] === 1 ? 0 : 1;
  const maskIndex = (x: number, z: number) => {
    const i = Math.floor((Math.min(x, ext.maxX - 0.01) - mask.x0) / mask.res);
    const j = Math.floor((Math.min(z, ext.maxZ - 0.01) - mask.z0) / mask.res);
    return i < 0 || j < 0 || i >= mask.w || j >= mask.h ? -1 : j * mask.w + i;
  };
  // Which cells to draw: any mask cell inside the terrain cell where the terrain shows.
  const keep = new Uint8Array((nx - 1) * (nz - 1));
  for (let j = 0; j < nz - 1; j++) {
    const mj0 = Math.max(0, Math.floor((zAt(j) - mask.z0) / mask.res));
    const mj1 = Math.min(mask.h - 1, Math.floor((zAt(j + 1) - mask.z0) / mask.res));
    for (let i = 0; i < nx - 1; i++) {
      const mi0 = Math.max(0, Math.floor((xAt(i) - mask.x0) / mask.res));
      const mi1 = Math.min(mask.w - 1, Math.floor((xAt(i + 1) - mask.x0) / mask.res));
      let visible = 0;
      for (let mj = mj0; mj <= mj1 && !visible; mj++) for (let mi = mi0; mi <= mi1 && !visible; mi++) visible = shows[mj * mask.w + mi];
      keep[j * (nx - 1) + i] = visible;
    }
  }
  const buf = new MeshBuf();
  const yAt = (x: number, z: number) => {
    const k = maskIndex(x, z);
    let y = terrain.heightAt(x, z);
    if (k < 0) return y;
    if (hardDeep[k] === 1) y = lowest(x, z) - TERRAIN_SINK - 0.2;
    else if ((mask.data[k] & hardBit) !== 0) y = Math.min(y, lowest(x, z) - 0.02);
    else if (insideBuilding[k] === 1) y -= 0.3;
    return y;
  };
  // Grid corners by index; extra vertices of cut cells (on the hero walls) welded by position.
  const corner = new Int32Array(nx * nz).fill(-1);
  const grid = (i: number, j: number) => {
    const k = j * nx + i;
    if (corner[k] < 0) {
      const x = xAt(i);
      const z = zAt(j);
      corner[k] = buf.vertex(x, yAt(x, z), z, terrain.normalAt(x, z), x, -z);
    }
    return corner[k];
  };
  const weld = new Map<string, number>();
  const cutVert = (x: number, z: number): number => {
    // A cut piece's vertex on a grid corner shares the corner.
    const fi = (x - ext.minX) / cell;
    const fj = (z - ext.minZ) / cell;
    const ri = Math.round(fi);
    const rj = Math.round(fj);
    if (Math.abs(fi - ri) < 1e-6 && Math.abs(fj - rj) < 1e-6 && ri >= 0 && rj >= 0 && ri < nx && rj < nz) return grid(ri, rj);
    const k = `${Math.round(x * 500)},${Math.round(z * 500)}`;
    let v = weld.get(k);
    if (v === undefined) {
      v = buf.vertex(x, yAt(x, z), z, terrain.normalAt(x, z), x, -z);
      weld.set(k, v);
    }
    return v;
  };
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      if (!keep[j * (nx - 1) + i]) continue;
      const x0 = xAt(i);
      const x1 = xAt(i + 1);
      const z0 = zAt(j);
      const z1 = zAt(j + 1);
      if (cut?.touches(x0, z0, x1, z1)) {
        // Exactly outside the hero footprints (no erosion band inside their floors).
        for (const piece of cut.subtract([
          [x0, z0],
          [x0, z1],
          [x1, z1],
          [x1, z0],
        ]))
          triangulateUp(buf, piece, cutVert);
        continue;
      }
      const a = grid(i, j);
      const b = grid(i, j + 1);
      const c = grid(i + 1, j + 1);
      const d = grid(i + 1, j);
      buf.tri(a, b, c);
      buf.tri(a, c, d);
    }
  }
  return buf.geometry() ?? new THREE.BufferGeometry();
}

/** Lawn, planting beds, gravel, paved yards and leaf litter blended by the splat (one draw call). */
function makeTerrainMaterial(ctx: TwinContext, splat: THREE.Texture, ext: { minX: number; maxX: number; minZ: number; maxZ: number }, pools: PoolUniforms) {
  const lib = ctx.materials;
  const grass = lib.get("grass");
  const soil = lib.get("mulch");
  const gravel = lib.get("gravel");
  const paved = lib.get("asphaltFootway");
  const leaves = lib.get("leafLitter");
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: grass.map,
    normalMap: grass.normalMap,
    roughness: 1,
    metalness: 0,
  });
  m.name = "ground-terrain";
  m.normalScale.set(0.9, 0.9);
  const uniforms: Record<string, THREE.IUniform> = {
    uGrSplat: { value: splat },
    uGrExt: { value: new THREE.Vector4(ext.minX, ext.minZ, 1 / (ext.maxX - ext.minX), 1 / (ext.maxZ - ext.minZ)) },
    uGrGrassC: { value: grass.color.clone() },
    uGrWorn: { value: (grass.userData.twPatch as { uniforms?: Record<string, THREE.IUniform> } | undefined)?.uniforms?.uTwBlendMap?.value ?? grass.map },
    uGrSoil: { value: soil.map },
    uGrSoilN: { value: soil.normalMap },
    uGrSoilC: { value: soil.color.clone() },
    uGrGravel: { value: gravel.map },
    uGrGravelN: { value: gravel.normalMap },
    uGrGravelC: { value: gravel.color.clone() },
    uGrPaved: { value: paved.map },
    uGrPavedN: { value: paved.normalMap },
    uGrPavedC: { value: paved.color.clone() },
    uGrLeaves: { value: leaves.map },
    uGrLeavesC: { value: leaves.color.clone() },
  };
  m.customProgramCacheKey = () => "ground-terrain-v2";
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, pools);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vGrWorld;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvGrWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vGrWorld;
uniform sampler2D uGrSplat; uniform vec4 uGrExt;
uniform vec3 uGrGrassC; uniform sampler2D uGrWorn;
uniform sampler2D uGrSoil; uniform sampler2D uGrSoilN; uniform vec3 uGrSoilC;
uniform sampler2D uGrGravel; uniform sampler2D uGrGravelN; uniform vec3 uGrGravelC;
uniform sampler2D uGrPaved; uniform sampler2D uGrPavedN; uniform vec3 uGrPavedC;
uniform sampler2D uGrLeaves; uniform vec3 uGrLeavesC;
uniform sampler2D uGrPool; uniform vec4 uGrPoolExt; uniform float uGrPoolGain;
float grHash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
float grNoise( vec2 p ) { vec2 i = floor( p ); vec2 f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( grHash( i ), grHash( i + vec2( 1, 0 ) ), u.x ), mix( grHash( i + vec2( 0, 1 ) ), grHash( i + vec2( 1, 1 ) ), u.x ), u.y ); }
float grFbm( vec2 p ) { return 0.5 * grNoise( p ) + 0.25 * grNoise( p * 2.03 + 7.1 ) + 0.125 * grNoise( p * 4.01 + 3.7 ) + 0.0625 * grNoise( p * 8.07 + 1.3 ); }
vec4 grW; float grLeaf; float grRough;`,
      )
      .replace(
        "#include <map_fragment>",
        `
	vec2 gp = vec2( vGrWorld.x, -vGrWorld.z );
	vec4 sp = texture2D( uGrSplat, ( vGrWorld.xz - uGrExt.xy ) * uGrExt.zw );
	// Break up the 0.5 m raster: noisy thresholds instead of straight blurry edges.
	float n1 = grFbm( vGrWorld.xz * 0.9 );
	vec3 cls = smoothstep( vec3( 0.25 ), vec3( 0.75 ), sp.rgb + ( n1 - 0.5 ) * 0.55 );
	float tot = cls.r + cls.g + cls.b;
	if ( tot > 1.0 ) cls /= tot;
	grW = vec4( cls, max( 0.0, 1.0 - cls.r - cls.g - cls.b ) );
	// Lawn: autumn grass and worn patches, two rotated samples against tiling.
	vec2 rp = mat2( 0.7986, 0.6018, -0.6018, 0.7986 ) * gp + 0.37;
	float tileMix = smoothstep( 0.3, 0.7, grNoise( vGrWorld.xz / 6.3 + 11.0 ) );
	vec3 g1 = mix( texture2D( map, gp / 2.0 ).rgb, texture2D( map, rp / 2.0 ).rgb, tileMix );
	float worn = smoothstep( 0.42, 0.78, grFbm( vGrWorld.xz / 9.0 ) );
	vec3 g2 = texture2D( uGrWorn, gp / 2.51 ).rgb;
	vec3 cGrass = mix( g1, g2, worn * 0.65 ) * uGrGrassC * ( 0.82 + 0.36 * grFbm( vGrWorld.xz / 23.0 ) );
	vec3 cSoil = texture2D( uGrSoil, gp / 2.0 ).rgb * uGrSoilC;
	// Track ballast and site gravel: dark crushed granite, rust-stained.
	// Track ballast and the cutting's slopes (2025 orthophoto): grey crushed granite, rust-stained near the
	// rails, with patches of dry brown weeds — not sand (round 2: it read as desert dunes under the low sun).
	vec3 cGravel = texture2D( uGrGravel, gp ).rgb * uGrGravelC;
	cGravel = mix( cGravel, vec3( dot( cGravel, vec3( 0.2126, 0.7152, 0.0722 ) ) ), 0.65 ) * vec3( 0.4, 0.4, 0.41 );
	cGravel *= 0.8 + 0.4 * grNoise( vGrWorld.xz * 6.0 + 2.0 );
	float weeds = smoothstep( 0.52, 0.75, grFbm( vGrWorld.xz / 3.7 + 5.0 ) );
	cGravel = mix( cGravel, cGrass * vec3( 0.75, 0.62, 0.45 ), weeds * 0.55 );
	vec3 cPaved = texture2D( uGrPaved, gp / 2.1 ).rgb * uGrPavedC * ( 0.85 + 0.3 * grFbm( vGrWorld.xz / 15.0 ) );
	vec3 col = cGrass * grW.a + cSoil * grW.r + cGravel * grW.g + cPaved * grW.b;
	// Fallen leaves: scattered decal texture where the splat says so (and a few everywhere on the lawn).
	vec4 lv = texture2D( uGrLeaves, gp / 1.0 );
	float leafAmt = clamp( sp.a + ( grFbm( vGrWorld.xz / 4.0 ) - 0.62 ) * 0.9 * grW.a, 0.0, 1.0 );
	grLeaf = lv.a * smoothstep( 0.15, 0.6, leafAmt + ( n1 - 0.5 ) * 0.3 ) * ( 1.0 - grW.b * 0.85 );
	col = mix( col, lv.rgb * uGrLeavesC, grLeaf );
	diffuseColor.rgb *= col;
	grRough = 0.97 * grW.a + 0.95 * grW.r + 0.9 * grW.g + 0.78 * grW.b;
`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `float roughnessFactor = clamp( mix( grRough, 0.9, grLeaf ), 0.05, 1.0 );`,
      )
      .replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
	if ( uGrPoolGain > 0.0 ) {
		vec3 grE = texture2D( uGrPool, ( vGrWorld.xz - uGrPoolExt.xy ) * uGrPoolExt.zw ).rgb * uGrPoolGain;
		reflectedLight.directDiffuse += grE * BRDF_Lambert( material.diffuseColor );
	}`,
      )
      .replace(
        "vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;",
        `vec3 mapN = normalize(
		( texture2D( normalMap, gp / 2.0 ).xyz * 2.0 - 1.0 ) * grW.a
		+ ( texture2D( uGrSoilN, gp / 2.0 ).xyz * 2.0 - 1.0 ) * grW.r
		+ ( texture2D( uGrGravelN, gp ).xyz * 2.0 - 1.0 ) * grW.g
		+ ( texture2D( uGrPavedN, gp / 2.1 ).xyz * 2.0 - 1.0 ) * grW.b
		+ vec3( 0.0, 0.0, 0.002 ) );`,
      );
  };
  return m;
}

/**
 * Far ground: a ring from the terrain border to the horizon (6 km), meeting
 * the DTM edge heights, sinking gently outwards (the provisional ground of
 * world/massing.ts is dropped when this module loads).
 */
function buildFarGeometry(terrain: Terrain): THREE.BufferGeometry {
  const ext = terrain.extent;
  const border: V2[] = [];
  const step = 8;
  for (let x = ext.minX; x < ext.maxX; x += step) border.push([x, ext.minZ]);
  for (let z = ext.minZ; z < ext.maxZ; z += step) border.push([ext.maxX, z]);
  for (let x = ext.maxX; x > ext.minX; x -= step) border.push([x, ext.maxZ]);
  for (let z = ext.maxZ; z > ext.minZ; z -= step) border.push([ext.minX, z]);
  const cx = (ext.minX + ext.maxX) / 2;
  const cz = (ext.minZ + ext.maxZ) / 2;
  const rings = [0, 40, 160, 600, 2000, 6000];
  const positions: number[] = [];
  const n = border.length;
  for (const r of rings) {
    for (const [bx, bz] of border) {
      const dx = bx - cx;
      const dz = bz - cz;
      const len = Math.hypot(dx, dz) || 1;
      const x = bx + (dx / len) * r;
      const z = bz + (dz / len) * r;
      const edgeY = terrain.heightAt(bx, bz) - 0.02;
      const k = Math.min(1, r / 400);
      positions.push(x, edgeY * (1 - k) - 3.5 * k, z);
    }
  }
  const index: number[] = [];
  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let i = 0; i < n; i++) {
      const a = ri * n + i;
      const b = ri * n + ((i + 1) % n);
      const c = (ri + 1) * n + i;
      const d = (ri + 1) * n + ((i + 1) % n);
      index.push(a, b, c, b, d, c);
    }
  }
  // Face the triangles up (+y seen from above).
  for (let i = 0; i < index.length; i += 3) {
    const a = index[i] * 3;
    const b = index[i + 1] * 3;
    const c = index[i + 2] * 3;
    const ny = (positions[b + 2] - positions[a + 2]) * (positions[c] - positions[a]) - (positions[b] - positions[a]) * (positions[c + 2] - positions[a + 2]);
    if (ny < 0) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(index);
  // Normals straight up: the ring's long, thin triangles between border spokes of different edge heights
  // would tilt computed normals by up to ≈20° and the low sun turns that into radial light/dark curtains;
  // the regional slope out here is under 1°.
  const normals = new Float32Array(positions.length);
  for (let i = 1; i < normals.length; i += 3) normals[i] = 1;
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  return geo;
}

/** Urban fabric beyond the data: paving, lawns and street grids on the campus bearings, blending into the terrain edge. */
function makeFarGroundMaterial(ext: { minX: number; maxX: number; minZ: number; maxZ: number }): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  m.name = "ground-far";
  m.customProgramCacheKey = () => "ground-far-v2";
  const uExt = { value: new THREE.Vector4(ext.minX, ext.minZ, ext.maxX, ext.maxZ) };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uFgExt = uExt;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vFgWorld;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvFgWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vFgWorld;
uniform vec4 uFgExt;
float fgHash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
float fgNoise( vec2 p ) { vec2 i = floor( p ); vec2 f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( fgHash( i ), fgHash( i + vec2( 1, 0 ) ), u.x ), mix( fgHash( i + vec2( 0, 1 ) ), fgHash( i + vec2( 1, 1 ) ), u.x ), u.y ); }
float fgStreets( vec2 p, float theta, float s, float w ) {
	vec2 a = vec2( cos( theta ), sin( theta ) );
	vec2 q = vec2( dot( p, a ), dot( p, vec2( -a.y, a.x ) ) );
	vec2 fw = max( fwidth( q ), vec2( 1e-3 ) );
	vec2 r = abs( fract( q / s + 0.5 ) - 0.5 ) * s;
	vec2 c = clamp( ( w * 0.5 - r ) / fw + 0.5, 0.0, 1.0 );
	return max( c.x, c.y );
}`,
      )
      .replace(
        "#include <map_fragment>",
        `
	vec2 p = vFgWorld.xz;
	float n1 = fgNoise( p / 48.0 ) * 0.6 + fgNoise( p / 17.0 ) * 0.4;
	float lawn = smoothstep( 0.55, 0.75, fgNoise( p / 140.0 + 3.1 ) );
	vec3 paved = mix( vec3( 0.075, 0.075, 0.072 ), vec3( 0.16, 0.155, 0.145 ), n1 );
	vec3 grassC = mix( vec3( 0.07, 0.075, 0.045 ), vec3( 0.11, 0.105, 0.07 ), n1 );
	vec3 col = mix( paved, grassC, lawn * 0.85 );
	vec2 warp = vec2( fgNoise( p / 300.0 ), fgNoise( p / 300.0 + 7.0 ) ) * 30.0;
	float st = max( fgStreets( p + warp, radians( 55.3 ), 96.0, 14.0 ), fgStreets( p - warp, radians( 38.8 ), 112.0, 12.0 ) );
	col = mix( col, vec3( 0.06, 0.061, 0.063 ), st * 0.6 );
	vec2 outside = max( max( uFgExt.xy - p, p - uFgExt.zw ), vec2( 0.0 ) );
	// Blend over 160 m from the data's edge (round 1: a hard border showed in the plan view).
	float edge = smoothstep( 0.0, 160.0, length( outside ) );
	col = mix( mix( vec3( 0.085, 0.088, 0.068 ), vec3( 0.12, 0.118, 0.11 ), n1 * 0.5 ), col, edge );
	diffuseColor.rgb *= col;
`,
      );
  };
  return m;
}

// ── Road markings (SPEC §4.1: Traficom, all white; drawn as geometry) ────────

/**
 * Exact "is this point on a carriageway" over the register's carriageway
 * polygons, fast: a 0.25 m raster answers inside/outside directly and only
 * cells crossed by a polygon edge run the exact point-in-polygon test.
 */
export class CarriagewayIndex {
  private readonly cells = new Map<number, number[]>();
  private static readonly CELL = 8;
  private readonly raster: Raster | null = null;
  constructor(readonly polys: V2[][]) {
    polys.forEach((p, i) => {
      const b = polygonBounds(p);
      const c = CarriagewayIndex.CELL;
      for (let a = Math.floor(b.minX / c); a <= Math.floor(b.maxX / c); a++) {
        for (let d = Math.floor(b.minZ / c); d <= Math.floor(b.maxZ / c); d++) {
          const k = key(a, d);
          const list = this.cells.get(k);
          if (list) list.push(i);
          else this.cells.set(k, [i]);
        }
      }
    });
    if (!polys.length) return;
    const all = polygonBounds(polys.flat());
    const r = makeRaster({ minX: all.minX - 1, maxX: all.maxX + 1, minZ: all.minZ - 1, maxZ: all.maxZ + 1 }, 0.25);
    // 1 = inside (cell centre), then 2 = an edge passes through the cell (exact test needed).
    for (const p of polys) rasterFill(r, p, (k) => (r.data[k] = 1));
    for (const p of polys) {
      for (let i = 0; i < p.length; i++) {
        const a = p[i];
        const b = p[(i + 1) % p.length];
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (r.res * 0.5)));
        for (let k = 0; k <= n; k++) {
          const x = a[0] + ((b[0] - a[0]) * k) / n;
          const z = a[1] + ((b[1] - a[1]) * k) / n;
          const ci = Math.floor((x - r.x0) / r.res);
          const cj = Math.floor((z - r.z0) / r.res);
          for (let dj = -1; dj <= 1; dj++) {
            for (let di = -1; di <= 1; di++) {
              const ii = ci + di;
              const jj = cj + dj;
              if (ii >= 0 && jj >= 0 && ii < r.w && jj < r.h) r.data[jj * r.w + ii] = 2;
            }
          }
        }
      }
    }
    this.raster = r;
  }
  inside(x: number, z: number): boolean {
    const r = this.raster;
    if (r) {
      const i = Math.floor((x - r.x0) / r.res);
      const j = Math.floor((z - r.z0) / r.res);
      if (i < 0 || j < 0 || i >= r.w || j >= r.h) return false;
      const v = r.data[j * r.w + i];
      if (v !== 2) return v === 1;
    }
    const c = CarriagewayIndex.CELL;
    const list = this.cells.get(key(Math.floor(x / c), Math.floor(z / c)));
    if (!list) return false;
    for (const i of list) if (pointInRing([x, z], this.polys[i])) return true;
    return false;
  }
  /** Distance from (x, z) along (dx, dz) to where the carriageway ends; null when (x, z) is not on it. */
  edgeDistance(x: number, z: number, dx: number, dz: number, maxD = 18): number | null {
    if (!this.inside(x, z)) return null;
    let lo = 0;
    let hi = -1;
    for (let s = 0.3; s <= maxD; s += 0.3) {
      if (!this.inside(x + dx * s, z + dz * s)) {
        hi = s;
        break;
      }
      lo = s;
    }
    if (hi < 0) return null;
    for (let k = 0; k < 7; k++) {
      const mid = (lo + hi) / 2;
      if (this.inside(x + dx * mid, z + dz * mid)) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }
}

type ArrowShape = "through" | "left" | "right" | "throughRight" | "throughLeft";

/** Lane arrows painted on hero approaches (lanes left → right in the travel direction). SPEC §4.1. */
const LANE_ARROWS: Record<string, { atEnd: boolean; lanes: ArrowShape[] }> = {
  // Tykistökatu, south-west-bound towards the BioCity junction (the far side of the street from the recess).
  "osm-924357701": { atEnd: true, lanes: ["left", "throughRight"] },
};

export interface MarkingInput {
  campus: CampusData;
  streets: StreetsData;
  heights: HeightModel;
  carr: CarriagewayIndex;
}

/** Paint on the carriageway: a ribbon of quads following the surface. */
class Painter {
  readonly buf = new MeshBuf();
  constructor(private readonly heights: HeightModel) {}
  private y(x: number, z: number) {
    return this.heights.y(x, z, "low") + SURFACE_LIFT + 0.004;
  }
  /** A line of `width` along `pts` (≥ 2 points), subdivided every ≤ 1.5 m. */
  line(pts: readonly V2[], width: number) {
    if (pts.length < 2) return;
    const dense: V2[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(l / 1.5));
      for (let k = 1; k <= n; k++) dense.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    const left = offsetPolyline(dense, width / 2);
    const right = offsetPolyline(dense, -width / 2);
    const base = this.buf.vertexCount;
    let s = 0;
    for (let i = 0; i < dense.length; i++) {
      if (i) s += Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]);
      const [lx, lz] = left[i];
      const [rx, rz] = right[i];
      this.buf.vertex(lx, this.y(lx, lz), lz, [0, 1, 0], s, width / 2);
      this.buf.vertex(rx, this.y(rx, rz), rz, [0, 1, 0], s, -width / 2);
    }
    for (let i = 1; i < dense.length; i++) {
      const a = base + (i - 1) * 2;
      const b = base + i * 2;
      // (left, right) pairs: with +z south, left-then-right winds clockwise from above — flip to face up.
      this.buf.tri(a, a + 1, b);
      this.buf.tri(b, a + 1, b + 1);
    }
  }
  /** A filled polygon (arrows, triangles) on the surface. */
  polygon(ring: readonly V2[]) {
    if (ring.length < 3) return;
    const contour = ring.map(([x, z]) => new THREE.Vector2(x, z));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    const base = this.buf.vertexCount;
    for (const [x, z] of ring) this.buf.vertex(x, this.y(x, z), z, [0, 1, 0], x, z);
    for (const [a, b, c] of tris) {
      const pa = ring[a];
      const pb = ring[b];
      const pc = ring[c];
      const cross = (pb[0] - pa[0]) * (pc[1] - pa[1]) - (pb[1] - pa[1]) * (pc[0] - pa[0]);
      if (cross < 0) this.buf.tri(base + a, base + b, base + c);
      else this.buf.tri(base + a, base + c, base + b);
    }
  }
  /** Rectangle centred at c, `along` long in direction t, `across` wide. */
  rect(c: V2, t: V2, along: number, across: number) {
    const n: V2 = [t[1], -t[0]];
    const a = along / 2;
    const w = across / 2;
    this.polygon([
      [c[0] - t[0] * a - n[0] * w, c[1] - t[1] * a - n[1] * w],
      [c[0] + t[0] * a - n[0] * w, c[1] + t[1] * a - n[1] * w],
      [c[0] + t[0] * a + n[0] * w, c[1] + t[1] * a + n[1] * w],
      [c[0] - t[0] * a + n[0] * w, c[1] - t[1] * a + n[1] * w],
    ]);
  }
}

/** Dashed copy of a polyline: [on, off] metres, starting with `phase` metres into the pattern. */
export function dashes(line: readonly V2[], on: number, off: number, phase = 0): V2[][] {
  const out: V2[][] = [];
  const period = on + off;
  let s = 0;
  let cur: V2[] | null = null;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 1e-9) continue;
    let u = 0;
    while (u < l - 1e-9) {
      const pos = (s + u + phase) % period;
      const isOn = pos < on;
      const left = isOn ? on - pos : period - pos;
      const stepU = Math.min(left, l - u);
      const p0: V2 = [a[0] + ((b[0] - a[0]) * u) / l, a[1] + ((b[1] - a[1]) * u) / l];
      const p1: V2 = [a[0] + ((b[0] - a[0]) * (u + stepU)) / l, a[1] + ((b[1] - a[1]) * (u + stepU)) / l];
      if (isOn) {
        if (!cur) {
          cur = [p0];
          out.push(cur);
        }
        cur.push(p1);
      } else cur = null;
      u += stepU;
    }
    s += l;
  }
  return out.filter((d) => d.length >= 2 && polylineLength(d) > 0.05);
}

/** Lane arrow outline (≈5 m long), pointing along +t from `at`, in local units (metres). */
export function arrowOutline(shape: ArrowShape, at: V2, t: V2): V2[] {
  // Local frame: x across (right = −left normal), y along t.
  const n: V2 = [-t[1], t[0]]; // right of travel (+z south): rotate t clockwise seen from above
  const P = (x: number, y: number): V2 => [at[0] + n[0] * x + t[0] * y, at[1] + n[1] * x + t[1] * y];
  const sw = 0.15; // half shaft width
  switch (shape) {
    case "through":
      return [P(-sw, 0), P(sw, 0), P(sw, 3.4), P(0.45, 3.4), P(0, 5), P(-0.45, 3.4), P(-sw, 3.4)];
    case "left":
    case "right": {
      const s = shape === "left" ? -1 : 1;
      // Shaft, then a bend sideways with the head pointing across.
      const pts: V2[] = [P(-sw * s, 0), P(sw * s, 0), P(sw * s, 2.6), P(0.9 * s, 3.4), P(0.9 * s, 3.0), P(1.6 * s, 3.6), P(0.9 * s, 4.2), P(0.9 * s, 3.8), P(-sw * s, 3.0)];
      return s < 0 ? pts : pts.reverse();
    }
    case "throughRight":
    case "throughLeft": {
      const s = shape === "throughLeft" ? -1 : 1;
      const pts: V2[] = [
        P(-sw * s, 0),
        P(sw * s, 0),
        P(sw * s, 1.9),
        P(0.85 * s, 2.5),
        P(0.85 * s, 2.15),
        P(1.5 * s, 2.75),
        P(0.85 * s, 3.35),
        P(0.85 * s, 3.0),
        P(sw * s, 2.45),
        P(sw * s, 3.4),
        P(0.45 * s, 3.4),
        P(0, 5),
        P(-0.45 * s, 3.4),
        P(-sw * s, 3.4),
      ];
      return s > 0 ? pts : pts.reverse();
    }
  }
}

/**
 * Every marking: lane and centre lines from the OSM lane counts fitted to the
 * register's carriageway edges, solid near junctions, stop lines at signals,
 * give-way teeth on minor approaches, zebras and cycle crossings at the
 * register's crossings, lane arrows on the hero approach, parking bays.
 */
export function buildMarkings({ campus, streets, heights, carr }: MarkingInput): MeshBuf {
  return paintRoads({ campus, streets, heights, carr }).buf;
}

/** Markings plus the wheel paths of every lane (for the asphalt detail map). */
export function paintRoads({ campus, streets, heights, carr }: MarkingInput): { buf: MeshBuf; tracks: V2[][] } {
  const paint = new Painter(heights);
  const tracks: V2[][] = [];
  const drive = campus.roads.filter(
    (r) => /^(trunk|secondary|tertiary|unclassified|residential|living_street)$/.test(r.kind) && !r.tunnel && !r.bridge && (r.layer ?? 0) === 0,
  );
  // ── Junctions: nodes where three or more road arms meet.
  const nodeKey = (p: V2) => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`;
  const arms = new Map<string, { p: V2; arms: number; width: number }>();
  for (const r of drive) {
    r.centerline.forEach((p, i) => {
      const k = nodeKey(p);
      const end = i === 0 || i === r.centerline.length - 1;
      const e = arms.get(k) ?? { p, arms: 0, width: 0 };
      e.arms += end ? 1 : 2;
      e.width = Math.max(e.width, r.width);
      arms.set(k, e);
    });
  }
  const signalised = streets.crossings.filter((c) => c.kind === "signals");
  const junctions = [...arms.values()]
    .filter((j) => j.arms >= 3)
    .map((j) => ({
      p: j.p,
      r: Math.min(16, j.width / 2 + 3.5),
      signals: signalised.some((c) => c.line.some((q) => Math.hypot(q[0] - j.p[0], q[1] - j.p[1]) < 32)),
    }));
  const zebraLen = (w: number | undefined) => ((w ?? 10) > 16 ? 4 : 3);
  // Crossing centre lines, for keeping lane lines off zebras.
  const crossingLines = streets.crossings.map((c) => ({ line: c.line, half: zebraLen(c.width) / 2 }));
  const nearCrossing = (p: V2, pad: number) =>
    crossingLines.some(({ line, half }) => {
      for (let i = 1; i < line.length; i++) {
        if (distSeg(p, line[i - 1], line[i]) < half + pad) return true;
      }
      return false;
    });

  for (const road of drive) {
    const line = road.centerline;
    const total = polylineLength(line);
    if (total < 6) continue;
    const lanes = Math.max(1, road.lanes ?? (road.oneway ? 1 : 2));
    const fwd = road.oneway ? lanes : Math.ceil(lanes / 2);
    // Junctions at either end of this way (or on it).
    const startJ = junctions.find((j) => Math.hypot(j.p[0] - line[0][0], j.p[1] - line[0][1]) < 0.5);
    const endJ = junctions.find(
      (j) => Math.hypot(j.p[0] - line[line.length - 1][0], j.p[1] - line[line.length - 1][1]) < 0.5,
    );
    // Cross-sections every metre: right edge distance (−) and left edge distance (+).
    const step = 1;
    const samples = samplePolyline(line, step, 0.5);
    interface XS {
      p: V2;
      t: V2;
      s: number;
      wl: number;
      wr: number;
      ok: boolean;
    }
    const xs: XS[] = samples.map(({ p, t, s }) => {
      const nl: V2 = [t[1], -t[0]];
      const wl = carr.edgeDistance(p[0], p[1], nl[0], nl[1]);
      const wr = carr.edgeDistance(p[0], p[1], -nl[0], -nl[1]);
      return { p, t, s, wl: wl ?? 0, wr: wr ?? 0, ok: wl !== null && wr !== null };
    });
    // Robust widths: median of ±3 samples; reject jumps (bus bays, turn pockets, junction mouths).
    const expected = lanes * 3.2;
    for (let i = 0; i < xs.length; i++) {
      const win: number[] = [];
      for (let k = Math.max(0, i - 3); k <= Math.min(xs.length - 1, i + 3); k++) if (xs[k].ok) win.push(xs[k].wl + xs[k].wr);
      win.sort((a, b) => a - b);
      const med = win.length ? win[Math.floor(win.length / 2)] : 0;
      const w = xs[i].wl + xs[i].wr;
      if (!xs[i].ok || Math.abs(w - med) > 0.8 || w < expected * 0.6 || w > expected * 1.55 + 1.2) xs[i].ok = false;
      const sFromStart = xs[i].s;
      const sToEnd = total - xs[i].s;
      if (startJ && sFromStart < startJ.r) xs[i].ok = false;
      if (endJ && sToEnd < endJ.r) xs[i].ok = false;
      for (const j of junctions) if (Math.hypot(j.p[0] - xs[i].p[0], j.p[1] - xs[i].p[1]) < j.r) xs[i].ok = false;
      if (nearCrossing(xs[i].p, 1.2)) xs[i].ok = false;
    }
    // Runs of good samples → lines.
    const runs: XS[][] = [];
    let run: XS[] = [];
    for (const x of xs) {
      if (x.ok) run.push(x);
      else {
        if (run.length >= 5) runs.push(run);
        run = [];
      }
    }
    if (run.length >= 5) runs.push(run);
    for (const r of runs) {
      // Edges from a 21-sample running median (shifted inwards at the run ends), then a 5-tap mean:
      // kerb flares at junction mouths and bus bays no longer bend the lane lines.
      const wl = smoothEdges(r.map((x) => x.wl));
      const wr = smoothEdges(r.map((x) => x.wr));
      const at = (i: number, c: number): V2 => {
        const { p, t } = r[i];
        return [p[0] + t[1] * c, p[1] - t[0] * c];
      };
      const nearJunctionEnd = (i: number) => {
        const sFromStart = r[i].s;
        const sToEnd = total - r[i].s;
        return (startJ && sFromStart < startJ.r + 15) || (endJ && sToEnd < endJ.r + 15);
      };
      // Wheel paths: ±0.85 m either side of every lane centre.
      for (let k = 0; k < lanes; k++) {
        for (const w of [-0.85, 0.85]) tracks.push(r.map((_, i) => at(i, -wr[i] + ((wl[i] + wr[i]) * (k + 0.5)) / lanes + w)));
      }
      for (let k = 1; k < lanes; k++) {
        // Divider k from the right edge (lanes are counted from the right in the travel direction).
        const pts = r.map((_, i) => at(i, -wr[i] + ((wl[i] + wr[i]) * k) / lanes));
        const solidMask = r.map((_, i) => nearJunctionEnd(i));
        const isCentre = !road.oneway && k === fwd;
        if (isCentre && lanes >= 4) {
          // Double solid centre line (Tykistökatu along BioCity).
          paint.line(offsetPolyline(pts, 0.1), 0.1);
          paint.line(offsetPolyline(pts, -0.1), 0.1);
          continue;
        }
        // Solid where near a junction, dashed elsewhere.
        let seg: V2[] = [];
        let segSolid = solidMask[0];
        const flush = () => {
          if (seg.length >= 2) {
            if (segSolid) paint.line(seg, 0.1);
            else for (const d of dashes(seg, 1, 3, r[0].s % 4)) paint.line(d, 0.1);
          }
        };
        for (let i = 0; i < pts.length; i++) {
          if (solidMask[i] !== segSolid) {
            seg.push(pts[i]);
            flush();
            seg = [pts[i]];
            segSolid = solidMask[i];
          } else seg.push(pts[i]);
        }
        flush();
      }
      // Stop line / give-way teeth where this run meets a junction.
      // A run that stops at a junction, or at a zebra in front of one, gets the stop line / teeth.
      const ends: { i: number; j: (typeof junctions)[number] | undefined; forwardInto: boolean }[] = [
        {
          i: r.length - 1,
          j: endJ && (total - r[r.length - 1].s < endJ.r + 3 || (total - r[r.length - 1].s < endJ.r + 12 && nearCrossing(r[r.length - 1].p, 3))) ? endJ : undefined,
          forwardInto: true,
        },
        {
          i: 0,
          j: startJ && (r[0].s < startJ.r + 3 || (r[0].s < startJ.r + 12 && nearCrossing(r[0].p, 3))) ? startJ : undefined,
          forwardInto: false,
        },
      ];
      for (const e of ends) {
        if (!e.j) continue;
        const i = e.i;
        const W = wl[i] + wr[i];
        // Approach lanes: forward lanes (right side) arrive at the end; backward lanes (left side) at the start.
        const c0 = e.forwardInto ? -wr[i] : -wr[i] + (W * fwd) / lanes;
        const c1 = e.forwardInto ? -wr[i] + (W * fwd) / lanes : wl[i];
        if (road.oneway && !e.forwardInto) continue;
        const t = e.forwardInto ? r[i].t : ([-r[i].t[0], -r[i].t[1]] as V2);
        const a = at(i, c0 + 0.05);
        const b = at(i, c1 - 0.05);
        if (e.j.signals || road.kind === "secondary" || road.kind === "trunk") {
          // 0.5 m stop line across the approach lanes, 0.6 m back from the run's end.
          const back: V2 = [-t[0] * 0.6, -t[1] * 0.6];
          paint.line(
            [
              [a[0] + back[0], a[1] + back[1]],
              [b[0] + back[0], b[1] + back[1]],
            ],
            0.5,
          );
        } else {
          // Give-way teeth: 0.5 m base, 0.6 m long, 0.5 m apart, pointing at the driver.
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const u: V2 = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
          for (let s = 0.4; s + 0.5 <= len; s += 1.0) {
            const p0: V2 = [a[0] + u[0] * s, a[1] + u[1] * s];
            const p1: V2 = [a[0] + u[0] * (s + 0.5), a[1] + u[1] * (s + 0.5)];
            const tip: V2 = [(p0[0] + p1[0]) / 2 - t[0] * 0.6, (p0[1] + p1[1]) / 2 - t[1] * 0.6];
            paint.polygon([p0, p1, tip]);
          }
        }
      }
      // Lane arrows on hero approaches.
      const arrows = LANE_ARROWS[road.id];
      if (arrows && arrows.atEnd && endJ) {
        for (const back of [9, 34]) {
          const i = Math.max(0, r.length - 1 - back);
          const W = wl[i] + wr[i];
          const nL = arrows.lanes.length;
          arrows.lanes.forEach((shape, li) => {
            // Lanes listed left → right; the rightmost lane is at c = −wr.
            const laneFromRight = nL - 1 - li;
            const c = -wr[i] + (W * fwd) / lanes / nL * (laneFromRight + 0.5);
            const p = at(i, c);
            paint.polygon(arrowOutline(shape, [p[0] - r[i].t[0] * 2.5, p[1] - r[i].t[1] * 2.5], r[i].t));
          });
        }
      }
    }
  }

  // ── Zebras (and stop lines in front of signalised ones), cycle crossings.
  const sharedPaths = streets.areas.filter((a) => a.part === "shared_path" || a.part === "cycle_lane");
  /** 2 = asphalt cycle surface, 1 = other shared path, 0 = none. */
  const sharedAt = (p: V2) => {
    let k = 0;
    for (const a of sharedPaths) {
      if (!pointInRing(p, a.poly)) continue;
      k = Math.max(k, a.surface === "asphalt" || a.surface === "asphalt_red" ? 2 : 1);
    }
    return k;
  };
  for (const c of streets.crossings) {
    const L = zebraLen(c.width);
    const pts = c.line;
    // Sample the crossing every 1.0 m (0.5 m bar + 0.5 m gap).
    const total = polylineLength(pts);
    if (total < 2) continue;
    const along = samplePolyline(pts, 1.0, 0.5);
    for (const { p, t } of along) {
      // Bars run with the traffic: perpendicular to the crossing line.
      const tr: V2 = [-t[1], t[0]];
      const ends: V2[] = [
        [p[0] + tr[0] * (L / 2 - 0.05), p[1] + tr[1] * (L / 2 - 0.05)],
        [p[0] - tr[0] * (L / 2 - 0.05), p[1] - tr[1] * (L / 2 - 0.05)],
      ];
      if (!carr.inside(p[0], p[1]) || !carr.inside(ends[0][0], ends[0][1]) || !carr.inside(ends[1][0], ends[1][1])) continue;
      paint.rect(p, tr, L, 0.5);
    }
    // Cycle crossing ("pyörätien jatke"): a line of 0.5 m squares beside the zebra on the side where the
    // cycle paths meet both kerbs (at least one of them asphalt — the register's cycle-path surface).
    const a = pts[0];
    const b = pts[pts.length - 1];
    const tA = unit([pts[1][0] - a[0], pts[1][1] - a[1]]);
    const tB = unit([b[0] - pts[pts.length - 2][0], b[1] - pts[pts.length - 2][1]]);
    let best: { side: number; score: number } | null = null;
    for (const side of [1, -1]) {
      let score = 0;
      let both = true;
      for (const [end, t, out] of [
        [a, tA, -1],
        [b, tB, 1],
      ] as [V2, V2, number][]) {
        const tr: V2 = [-t[1], t[0]];
        let hit = 0;
        for (const off of [L / 2 + 1.0, L / 2 + 2.0]) {
          const q: V2 = [end[0] + tr[0] * off * side + t[0] * 1.5 * out, end[1] + tr[1] * off * side + t[1] * 1.5 * out];
          const k = sharedAt(q);
          if (k) hit = Math.max(hit, k);
        }
        if (!hit) both = false;
        score += hit;
      }
      if (both && score >= 2 && (!best || score > best.score)) best = { side, score };
    }
    if (best) {
      // Zebra bars span ±L/2 across the crossing line's normal (tr = (−t.z, t.x)); offsetPolyline is positive to the left = −tr.
      const edge = offsetPolyline(pts, -best.side * (L / 2 + 2.6));
      for (const { p, t } of samplePolyline(edge, 1.0, 0.25)) {
        if (carr.inside(p[0], p[1])) paint.rect(p, t, 0.5, 0.5);
      }
    }
  }

  // ── Parking bays: separators along the long sides of mapped spaces.
  for (const a of campus.areas) {
    if (a.kind !== "parking_space") continue;
    const ring = cleanRing(a.polygon);
    if (ring.length !== 4) continue;
    const e = ring.map((p, i) => ({ a: p, b: ring[(i + 1) % 4], l: Math.hypot(ring[(i + 1) % 4][0] - p[0], ring[(i + 1) % 4][1] - p[1]) }));
    const long = e[0].l + e[2].l >= e[1].l + e[3].l ? [e[0], e[2]] : [e[1], e[3]];
    for (const s of long) paint.line([s.a, s.b], 0.1);
  }
  // ── Bicycle symbols on the two-way cycle path in front of BioCity's entrance recess (SPEC §5.2).
  for (const c of CYCLE_SYMBOLS) bicycleSymbol(paint, c.at, c.bearing);
  return { buf: paint.buf, tracks };
}

/**
 * White bicycle symbols on the two-way cycle path along BioCity's Tykistökatu side (SPEC §5.2, "white
 * bicycle symbols on the adjacent two-way cycle path"): a pair per spot, one per direction, each in the
 * right-hand half of the 2.3 m asphalt path (centre line traced on the City's register polygon).
 */
const CYCLE_SYMBOLS: { at: V2; bearing: number }[] = (() => {
  const t: V2 = [Math.sin((34 * Math.PI) / 180), -Math.cos((34 * Math.PI) / 180)];
  const right: V2 = [-t[1], t[0]];
  const out: { at: V2; bearing: number }[] = [];
  for (const c of [
    [-29.7, -26.3],
    [-34.9, -17.8],
  ] as V2[]) {
    out.push({ at: [c[0] + right[0] * 0.55, c[1] + right[1] * 0.55], bearing: 34 });
    out.push({ at: [c[0] - right[0] * 0.55, c[1] - right[1] * 0.55], bearing: 214 });
  }
  return out;
})();

/**
 * A painted bicycle (≈ 0.95 × 0.7 m) read upright by a cyclist riding along `bearing`: the wheels side by
 * side across the path, the frame "up" pointing ahead.
 */
export function bicycleSymbol(paint: { line(pts: readonly V2[], width: number): void }, at: V2, bearing: number) {
  const b = (bearing * Math.PI) / 180;
  const up: V2 = [Math.sin(b), -Math.cos(b)];
  const rx: V2 = [-up[1], up[0]];
  const P = (x: number, y: number): V2 => [at[0] + rx[0] * x + up[0] * y, at[1] + rx[1] * x + up[1] * y];
  const w = 0.055;
  for (const cx of [-0.34, 0.34]) {
    const ring: V2[] = [];
    for (let k = 0; k <= 16; k++) ring.push(P(cx + Math.cos((k / 16) * Math.PI * 2) * 0.2, -0.12 + Math.sin((k / 16) * Math.PI * 2) * 0.2));
    paint.line(ring, w);
  }
  paint.line([P(-0.34, -0.12), P(-0.05, 0.2), P(0.24, 0.2), P(0.34, -0.12)], w);
  paint.line([P(-0.34, -0.12), P(0.02, -0.12), P(-0.05, 0.2)], w);
  paint.line([P(0.02, -0.12), P(0.24, 0.2)], w);
  paint.line([P(-0.13, 0.3), P(0.03, 0.3)], w * 1.3);
  paint.line([P(0.24, 0.2), P(0.2, 0.34), P(0.31, 0.36)], w);
}

/** The detail map covers the hero and arrival zones (SPEC §2.1). */
export const DETAIL_EXT = { minX: -75, maxX: 345, minZ: -215, maxZ: 160 } as const;

/**
 * Asphalt detail (R wet, G wheel-track polish, B patch repairs), painted on a
 * canvas over DETAIL_EXT: damp gutters on the low side of every kerb,
 * puddles in the DTM's hollows on carriageways and yards, polished wheel
 * paths in every lane, utility-trench patches and strip repairs. November in
 * Turku: the streets are rarely fully dry (SPEC §8.2).
 */
function buildAsphaltDetail(plan: GroundPlan, terrain: Terrain, lines: KerbLine[], tracks: V2[][], res: number): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const E = DETAIL_EXT;
  const w = Math.round((E.maxX - E.minX) / res);
  const h = Math.round((E.maxZ - E.minZ) / res);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const X = (x: number) => (x - E.minX) / res;
  const Z = (z: number) => (z - E.minZ) / res;
  const stroke = (line: readonly V2[], width: number, color: string) => {
    if (line.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width / res;
    ctx.beginPath();
    line.forEach(([x, z], i) => (i ? ctx.lineTo(X(x), Z(z)) : ctx.moveTo(X(x), Z(z))));
    ctx.stroke();
  };
  const rnd = mulberry32(2026);
  // Damp gutters along the low side of every kerb.
  ctx.filter = `blur(${Math.max(1, 0.25 / res)}px)`;
  for (const k of lines) {
    if (k.kind !== "kerb" || k.line.length < 2) continue;
    const [a, b] = [k.line[0], k.line[1]];
    const hit = plan.kerbField.nearest((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.2);
    if (!hit) continue;
    const t = unit([b[0] - a[0], b[1] - a[1]]);
    const left: V2 = [t[1], -t[0]];
    // Low side = −n; offsetPolyline's positive offset is to the left.
    const lowIsLeft = left[0] * hit.seg.nx + left[1] * hit.seg.nz < 0;
    stroke(offsetPolyline(k.line, (lowIsLeft ? 1 : -1) * 0.22), 0.42, "rgba(255,0,0,0.36)");
  }
  // Wheel paths.
  for (const tr of tracks) stroke(tr, 0.55, "rgba(0,255,0,0.38)");
  ctx.filter = "none";
  // Puddles in the true low spots of carriageways and yards: the hollow is measured on the smoothed DTM (a
  // 1.5 m disc against a 4 m ring, so the laser's ±2 cm noise does not count), the deepest win, and they
  // cover at most ≈ 4 % of the paved ground (round 1: milky blotches everywhere on Tykistökatu).
  const disc = (x: number, z: number, r: number) => {
    let sum = terrain.heightAt(x, z);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      sum += terrain.heightAt(x + Math.cos(a) * r, z + Math.sin(a) * r);
    }
    return sum / 7;
  };
  const candidates: { x: number; z: number; depth: number }[] = [];
  let pavedCells = 0;
  for (let z = E.minZ + 2; z < E.maxZ - 2; z += 1.6) {
    for (let x = E.minX + 2; x < E.maxX - 2; x += 1.6) {
      if (!plan.paved(x, z)) continue;
      pavedCells++;
      const depth = disc(x, z, 4) - disc(x, z, 0.75);
      if (depth >= 0.025) candidates.push({ x, z, depth });
    }
  }
  candidates.sort((a, b) => b.depth - a.depth);
  const budget = pavedCells * 1.6 * 1.6 * 0.04;
  let used = 0;
  for (const c of candidates) {
    if (used > budget) break;
    const r = Math.min(2.2, 0.5 + rnd() * 0.6 + c.depth * 18);
    const sy = 0.45 + rnd() * 0.45;
    used += Math.PI * r * r * sy * 0.6;
    ctx.save();
    ctx.translate(X(c.x + (rnd() - 0.5)), Z(c.z + (rnd() - 0.5)));
    ctx.rotate(rnd() * Math.PI);
    ctx.scale(1, sy);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r / res);
    g.addColorStop(0, "rgba(255,0,0,0.95)");
    g.addColorStop(0.5, "rgba(255,0,0,0.6)");
    g.addColorStop(1, "rgba(255,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r / res, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Patch repairs: utility trenches and strips, aligned with the nearest kerb.
  for (let z = E.minZ + 2; z < E.maxZ - 2; z += 5) {
    for (let x = E.minX + 2; x < E.maxX - 2; x += 5) {
      if (!plan.carriageway(x, z) || rnd() > 0.14) continue;
      const hit = plan.kerbField.nearest(x, z, 30);
      const ang = hit ? Math.atan2(hit.seg.bz - hit.seg.az, hit.seg.bx - hit.seg.ax) : rnd() * Math.PI;
      const strip = rnd() < 0.2;
      const len = strip ? 8 + rnd() * 22 : 1.4 + rnd() * 4;
      const wid = strip ? 0.7 + rnd() * 0.5 : 1.0 + rnd() * 2.2;
      ctx.save();
      ctx.translate(X(x), Z(z));
      ctx.rotate(ang + (strip ? 0 : (rnd() < 0.5 ? 0 : Math.PI / 2)));
      ctx.fillStyle = `rgba(0,0,255,${0.65 + rnd() * 0.3})`;
      ctx.fillRect((-len / 2) / res, (-wid / 2) / res, len / res, wid / res);
      ctx.restore();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

const unit = (v: V2): V2 => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};

/** Lane-edge distances: running median over 21 samples (window kept full at the ends), then a 5-tap mean. */
export function smoothEdges(v: readonly number[]): number[] {
  const n = v.length;
  const med = v.map((_, i) => {
    let lo = i - 10;
    let hi = i + 10;
    if (lo < 0) {
      hi = Math.min(n - 1, hi - lo);
      lo = 0;
    }
    if (hi > n - 1) {
      lo = Math.max(0, lo - (hi - (n - 1)));
      hi = n - 1;
    }
    const w = v.slice(lo, hi + 1).sort((a, b) => a - b);
    return w[Math.floor(w.length / 2)];
  });
  return med.map((_, i) => {
    let s = 0;
    let c = 0;
    for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) {
      s += med[k];
      c++;
    }
    return s / c;
  });
}

function distSeg(p: V2, a: V2, b: V2): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2, 0, 1) : 0;
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
}

// ── Materials ────────────────────────────────────────────────────────────────

/** Noise used by the ground's shader patches (prefixed so it never clashes with the library's). */
const GR_NOISE = /* glsl */ `
float grHash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
float grNoise( vec2 p ) { vec2 i = floor( p ); vec2 f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( grHash( i ), grHash( i + vec2( 1, 0 ) ), u.x ), mix( grHash( i + vec2( 0, 1 ) ), grHash( i + vec2( 1, 1 ) ), u.x ), u.y ); }
float grFbm( vec2 p ) { return 0.5 * grNoise( p ) + 0.25 * grNoise( p * 2.03 + 7.1 ) + 0.125 * grNoise( p * 4.01 + 3.7 ) + 0.0625 * grNoise( p * 8.07 + 1.3 ); }
`;

/** Street-light pools on the ground at night: irradiance map (klux, see setPoolMap) × gain. Shared by every ground material. */
export interface PoolUniforms {
  uGrPool: THREE.IUniform<THREE.Texture | null>;
  uGrPoolExt: THREE.IUniform<THREE.Vector4>;
  uGrPoolGain: THREE.IUniform<number>;
}

export interface GroundPatch {
  /** Worn paint: fraction worn off (discarded), 0–1. */
  wear?: number;
  /** Street-light pools at night. */
  pools?: boolean;
  /** Asphalt detail map: wet gutters and puddles, wheel-track polish, patch repairs. */
  detail?: boolean;
  /**
   * Weathered timber decking drawn over the wood grain from the metre UVs (u along the boards): 0.145 m
   * boards with dark 6 mm gaps, staggered butt joints, per-board tone, damp patches.
   */
  boards?: boolean;
  /**
   * Fallen leaves (early November) from the terrain splat's leaf channel: under the crowns, drifted
   * downwind, swept thinner on carriageways. The value scales the density (1 = as on the lawns).
   */
  leaves?: number;
}

/** Leaf channel of the terrain splat and the scattered-leaves decal shared by the paved materials. */
export interface LeafUniforms {
  uGrLeafSplat: THREE.IUniform<THREE.Texture | null>;
  uGrLeafExt: THREE.IUniform<THREE.Vector4>;
  uGrLeafTex: THREE.IUniform<THREE.Texture | null>;
  uGrLeafC: THREE.IUniform<THREE.Color>;
}

/** Asphalt detail map (R wet, G wheel-track polish, B patch repairs) over the hero and arrival zones. */
export interface DetailUniforms {
  uGrDetail: THREE.IUniform<THREE.Texture | null>;
  uGrDetailExt: THREE.IUniform<THREE.Vector4>;
}

/**
 * Chain the ground's own shader patch after the library's (variants keep
 * their anti-tiling/macro patch, which replaces map_fragment and
 * roughnessmap_fragment — so this one hooks in after color_fragment and
 * metalnessmap_fragment): worn paint, the asphalt detail map, and the
 * street-light pools added as diffuse light (irradiance × albedo / π) so
 * asphalt, paving and grass each brighten by their own albedo.
 */
export function patchGroundMaterial(m: THREE.MeshStandardMaterial, pools: PoolUniforms, o: GroundPatch, detail?: DetailUniforms, leafU?: LeafUniforms): void {
  const prev = m.onBeforeCompile;
  const prevKey = m.customProgramCacheKey();
  const wear = { value: o.wear ?? 0 };
  const leafAmt = { value: o.leaves ?? 0 };
  const useDetail = !!(o.detail && detail);
  const useLeaves = !!(o.leaves && leafU);
  m.customProgramCacheKey = () => `${prevKey}|gr-${o.wear ? "w" : ""}${o.pools ? "p" : ""}${useDetail ? "d" : ""}${o.boards ? "b" : ""}${useLeaves ? "l" : ""}`;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.uniforms.uGrWear = wear;
    shader.uniforms.uGrLeafAmt = leafAmt;
    if (o.pools) Object.assign(shader.uniforms, pools);
    if (useDetail && detail) Object.assign(shader.uniforms, detail);
    if (useLeaves && leafU) Object.assign(shader.uniforms, leafU);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\nvarying vec3 vGrWorld;${o.boards ? "\nvarying vec2 vGrBoardUv;" : ""}`)
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
	{
		vec4 grWp = vec4( transformed, 1.0 );
		#ifdef USE_INSTANCING
			grWp = instanceMatrix * grWp;
		#endif
		vGrWorld = ( modelMatrix * grWp ).xyz;
		${o.boards ? "vGrBoardUv = uv;" : ""}
	}`,
      );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>
varying vec3 vGrWorld;
${o.boards ? "varying vec2 vGrBoardUv;\nfloat grGapR = 0.0;" : ""}
uniform float uGrWear;
${o.pools ? "uniform sampler2D uGrPool; uniform vec4 uGrPoolExt; uniform float uGrPoolGain;" : ""}
${useDetail ? "uniform sampler2D uGrDetail; uniform vec4 uGrDetailExt;" : ""}
${useLeaves ? "uniform sampler2D uGrLeafSplat; uniform vec4 uGrLeafExt; uniform sampler2D uGrLeafTex; uniform vec3 uGrLeafC; uniform float uGrLeafAmt;" : ""}
float grLeafCov = 0.0;
float grDampG = 0.0;
float grWet = 0.0;
float grPolish = 0.0;
float grPatch = 0.0;
${GR_NOISE}`,
    );
    let albedo = "";
    if (o.wear) {
      albedo += `
	{
		// Worn road paint: crackled loss along the line, a few bare patches.
		float grW = grFbm( vGrWorld.xz * 2.7 ) * 0.62 + grFbm( vGrWorld.xz * 13.0 + 3.1 ) * 0.38;
		if ( grW < uGrWear ) discard;
		diffuseColor.rgb *= 0.86 + 0.22 * smoothstep( uGrWear, uGrWear + 0.3, grW );
	}`;
    }
    if (o.boards) {
      albedo += `
	{
		// Boards along u: 0.145 m pitch, 6 mm gaps; butt joints every 2.4–4.8 m, staggered per board.
		vec2 q = vGrBoardUv;
		float pitch = 0.145;
		float row = floor( q.y / pitch );
		float fy = fract( q.y / pitch );
		float lenB = 2.4 + 2.4 * grHash( vec2( row, 1.7 ) );
		float xb = q.x + grHash( vec2( row, 5.3 ) ) * lenB;
		float colB = floor( xb / lenB );
		float fx = fract( xb / lenB );
		float tone = grHash( vec2( row, colB ) );
		vec2 fw = max( fwidth( q ), vec2( 1e-4 ) );
		// Gap coverage, box-filtered; far away it becomes the average darkening of the gaps.
		float gw = 0.006 / pitch;
		float fyw = fw.y / pitch;
		float edgeY = min( fy, 1.0 - fy );
		float gapY = 1.0 - smoothstep( gw * 0.5 - fyw * 0.5, gw * 0.5 + fyw * 0.5, edgeY );
		float edgeX = min( fx, 1.0 - fx ) * lenB;
		float gapX = 1.0 - smoothstep( 0.003 - fw.x * 0.5, 0.003 + fw.x * 0.5, edgeX );
		float near = 1.0 - smoothstep( 0.25, 0.7, fyw );
		float gap = mix( gw, max( gapY, gapX ), near );
		// Weathering: per-board tone (silver-grey to brown), streaks along the grain, damp patches.
		float streak = grNoise( vec2( q.x * 0.6, q.y * 9.0 ) );
		float damp = smoothstep( 0.45, 0.8, grFbm( vGrWorld.xz * 0.35 ) );
		diffuseColor.rgb *= mix( 0.82, 1.14, tone ) * mix( 0.92, 1.06, streak );
		diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.93, 0.95, 1.0 ), 0.5 * tone );
		diffuseColor.rgb *= mix( 1.0, 0.72, damp );
		diffuseColor.rgb *= 1.0 - 0.75 * gap;
		grGapR = gap;
		grPolish = max( grPolish, damp * 1.4 );
	}`;
    }
    if (useDetail) {
      albedo += `
	{
		vec2 grUv = ( vGrWorld.xz - uGrDetailExt.xy ) * uGrDetailExt.zw;
		vec4 grD = texture2D( uGrDetail, grUv );
		float grInside = step( 0.0, grUv.x ) * step( grUv.x, 1.0 ) * step( 0.0, grUv.y ) * step( grUv.y, 1.0 );
		grD *= grInside;
		// Break the raster up: water collects unevenly, repairs have ragged edges.
		float grN = grNoise( vGrWorld.xz * 1.9 ) * 0.55 + grNoise( vGrWorld.xz * 6.3 ) * 0.45;
		// Damp (gutters, R ≈ 0.35) darkens and sheens; standing water (puddle cores, R → 1) mirrors.
		float grR = grD.r * ( 0.7 + 0.6 * grN );
		grWet = smoothstep( 0.6, 0.95, grR );
		float grDamp = smoothstep( 0.08, 0.4, grR );
		grDampG = grDamp;
		grPolish = grD.g;
		grPatch = smoothstep( 0.35, 0.6, grD.b + ( grN - 0.5 ) * 0.25 );
		diffuseColor.rgb *= mix( 1.0, 0.8, grDamp ) * mix( 1.0, 0.6, grWet ) * mix( 1.0, 0.8, grPatch ) * ( 1.0 + 0.09 * grPolish );
		grPolish = max( grPolish, grDamp * 2.0 );
	}`;
    }
    if (useLeaves) {
      albedo += `
	{
		// Fallen leaves: the splat's leaf channel (under the crowns) and the damp gutters where they collect.
		float sA = texture2D( uGrLeafSplat, ( vGrWorld.xz - uGrLeafExt.xy ) * uGrLeafExt.zw ).a;
		float lAmt = sA * uGrLeafAmt;
		// Gutters near trees catch what the traffic and the wind sweep off the carriageway.
		lAmt = max( lAmt, grDampG * min( 1.0, sA * 2.5 + 0.12 ) * 0.75 );
		float lN = grFbm( vGrWorld.xz * 0.45 + 17.0 );
		vec4 lv = texture2D( uGrLeafTex, vec2( vGrWorld.x, -vGrWorld.z ) * 0.9 );
		grLeafCov = lv.a * smoothstep( 0.22, 0.62, lAmt + ( lN - 0.5 ) * 0.45 );
		// Wet leaves: darker and glossier than dry ones.
		diffuseColor.rgb = mix( diffuseColor.rgb, lv.rgb * uGrLeafC * 0.85, grLeafCov );
	}`;
    }
    if (albedo) shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>${albedo}`);
    if (o.boards && !useDetail) {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <metalnessmap_fragment>",
        `#include <metalnessmap_fragment>
	roughnessFactor = clamp( roughnessFactor * mix( 1.0, 0.78, min( grPolish, 1.0 ) ) * mix( 1.0, 1.1, grGapR ), 0.05, 1.0 );`,
      );
    }
    if (useDetail) {
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <metalnessmap_fragment>",
          `#include <metalnessmap_fragment>
	roughnessFactor = clamp( mix( roughnessFactor * mix( 1.0, 0.82, min( grPolish, 1.0 ) ) * mix( 1.0, 1.08, grPatch ), 0.07, grWet ), 0.05, 1.0 );`,
        )
        .replace(
          "#include <lights_fragment_maps>",
          `#include <lights_fragment_maps>
	// Standing water mirrors the street canyon (facades, trees), not the open sky the env map holds: dim
	// the sky reflection in puddles so they read dark and glassy rather than milky.
	radiance *= mix( 1.0, 0.45, grWet );`,
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
	normal = normalize( mix( normal, nonPerturbedNormal, smoothstep( 0.45, 0.85, grWet ) ) );`,
        );
    }
    if (o.pools) {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <lights_fragment_end>",
        `#include <lights_fragment_end>
	if ( uGrPoolGain > 0.0 ) {
		vec3 grE = texture2D( uGrPool, ( vGrWorld.xz - uGrPoolExt.xy ) * uGrPoolExt.zw ).rgb * uGrPoolGain;
		reflectedLight.directDiffuse += grE * BRDF_Lambert( material.diffuseColor );
	}`,
      );
    }
  };
  m.needsUpdate = true;
}

interface SurfaceMaterials {
  /** One material per texture set (vertex colours tint the kinds). */
  group(group: SurfaceGroup): THREE.MeshStandardMaterial;
  kerb: THREE.MeshStandardMaterial;
  marking: THREE.MeshStandardMaterial;
  /** Ground-coloured materials for walls, steps and structures, with the pools. */
  extra(name: Parameters<TwinContext["materials"]["variant"]>[0], overrides: Parameters<TwinContext["materials"]["variant"]>[1]): THREE.MeshStandardMaterial;
  pools: PoolUniforms;
  setPoolMap(tex: THREE.Texture, ext: { minX: number; maxX: number; minZ: number; maxZ: number }): void;
  setDetailMap(tex: THREE.Texture, ext: { minX: number; maxX: number; minZ: number; maxZ: number }): void;
  /** The terrain splat (its alpha = fallen leaves) for the paved materials. */
  setLeafMap(tex: THREE.Texture, ext: { minX: number; maxX: number; minZ: number; maxZ: number }): void;
  setLighting(state: LightingState): void;
  dispose(): void;
}

function createSurfaceMaterials(ctx: TwinContext): SurfaceMaterials {
  const lib = ctx.materials;
  const made: THREE.Material[] = [];
  const cache = new Map<string, THREE.MeshStandardMaterial>();
  const black = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  black.needsUpdate = true;
  const pools: PoolUniforms = {
    uGrPool: { value: black },
    uGrPoolExt: { value: new THREE.Vector4(0, 0, 1, 1) },
    uGrPoolGain: { value: 0 },
  };
  const detail: DetailUniforms = {
    uGrDetail: { value: black },
    uGrDetailExt: { value: new THREE.Vector4(0, 0, 1, 1) },
  };
  // Fallen leaves: the terrain splat (set later, setLeafMap) and the scattered-leaves decal.
  const clear = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  clear.needsUpdate = true;
  const leafLib = lib.get("leafLitter");
  const leafU: LeafUniforms = {
    uGrLeafSplat: { value: clear },
    uGrLeafExt: { value: new THREE.Vector4(0, 0, 1, 1) },
    uGrLeafTex: { value: leafLib.map },
    uGrLeafC: { value: leafLib.color.clone() },
  };
  const own = (m: THREE.MeshStandardMaterial, patch: GroundPatch = { pools: true }) => {
    patchGroundMaterial(m, pools, patch, detail, leafU);
    made.push(m);
    return m;
  };
  // Carriageways: leaves swept to the gutters; footways and paving under the crowns keep more.
  const asphalt = { pools: true, detail: true, leaves: 0.35 };
  const base = (group: SurfaceGroup): THREE.MeshStandardMaterial => {
    const albedo = SURFACE_LOOK[GROUP_BASE[group]].albedo;
    switch (group) {
      // Street canyons hide most of the sky the asphalt would mirror (no screen-space reflections): envMapIntensity < 1.
      case "asphalt":
        // (0.5: the street read cool and light, RGB ≈ 95/105/114, against SPEC's #4a4a4a–#5c5c5a.)
        return own(lib.variant("asphalt", { color: albedo, roughness: 0.97, envMapIntensity: 0.5 }), asphalt);
      case "footway":
        return own(lib.variant("asphaltFootway", { color: albedo, roughness: 0.92, envMapIntensity: 0.55 }), { pools: true, detail: true, leaves: 0.8 });
      case "pavers":
        return own(lib.variant("pavers", { color: albedo, tile: [1.2, 1.2] }), { pools: true, leaves: 0.8 });
      case "setts":
        return own(lib.variant("setts", { color: albedo, tile: [2.2, 1.1] }), { pools: true, leaves: 0.8 });
      case "deck":
        // Weathered outdoor timber (SPEC §4.3 ≈#8a7560; the 2025 orthophoto reads silver-grey): the pale oak
        // grain under procedural boards — never the interior birch lamella, which read snow-white outdoors.
        return own(lib.variant("oak", { color: albedo, roughness: 0.9, tile: [1.3, 1.3] }), { pools: true, boards: true, leaves: 0.7 });
      case "concrete":
        return own(lib.variant("concreteFacade", { color: albedo, roughness: 0.9 }));
    }
  };
  const kerb = own(lib.variant("kerb", { color: "#a49b95" }));
  const marking = own(lib.variant("roadMarking", { color: "#dcdcd6", roughness: 0.55 }), { wear: 0.24, pools: true });
  return {
    group(group) {
      let m = cache.get(group);
      if (!m) {
        m = base(group);
        m.vertexColors = true;
        m.needsUpdate = true;
        cache.set(group, m);
      }
      return m;
    },
    kerb,
    marking,
    extra(name, overrides) {
      return own(lib.variant(name, overrides));
    },
    pools,
    setPoolMap(tex, ext) {
      pools.uGrPool.value = tex;
      // Stored irradiance × POOL_SCALE; uv = (xz − min) / size.
      pools.uGrPoolExt.value.set(ext.minX, ext.minZ, 1 / (ext.maxX - ext.minX), 1 / (ext.maxZ - ext.minZ));
    },
    setDetailMap(tex, ext) {
      detail.uGrDetail.value = tex;
      detail.uGrDetailExt.value.set(ext.minX, ext.minZ, 1 / (ext.maxX - ext.minX), 1 / (ext.maxZ - ext.minZ));
    },
    setLeafMap(tex, ext) {
      leafU.uGrLeafSplat.value = tex;
      leafU.uGrLeafExt.value.set(ext.minX, ext.minZ, 1 / (ext.maxX - ext.minX), 1 / (ext.maxZ - ext.minZ));
    },
    setLighting(state) {
      // Street lights switch on at sunset and are full by civil dusk (SPEC §8.3).
      pools.uGrPoolGain.value = smoothstep(1.0, -4.0, state.sunElevationDeg) * POOL_SCALE;
    },
    dispose() {
      for (const m of made) m.dispose();
      black.dispose();
      clear.dispose();
    },
  };
}

// ── Generated data ───────────────────────────────────────────────────────────

const VEG_RLE =
  "0b~123~18e~3I75934~1n4d,0b~123~18e~3I75935~1m3e,0b~132~18e~3J66763~1D,0b~132~18e~3J676~1M,0c~123~16f~3K666~1M," +
  "1dZ4~15g~3L746~1M,2dW6~15f~3Mhh1~1u,3cV6~16e~3Ohf3~1t,3cT6~18e~3Phe4~1s,4bS5~1ae~3P818e492~1h,5aQ6~1ae~3R726e4" +
  "94~1g,6aN83424Ve~3U626e494~1g,6bD35nSd~3Xeg1a4~1g,7aB63oRd~3Zdr4~1g,7aAxQe~40ep571~18,89ywSe~42dka81~17,98xwRe" +
  "~45dic~1f,a7vxQe~48dhc~1f,a7uwRe~49egb~1g,b6sxQe~4cdga~1h,c6qwRe~4edg8~1i,c7pvQe~4hcg7~1j,d7nvQe~4idf7~1j,e7iy" +
  "Pey5~3Idc9~1j,e8gANey8~3Hdb9~1j,fcaCKeyb~3Gea9~1j,gc8DJeyd~3Gdb7~1k,hb8DHeze~3Hdc3~1m,hb7EFfzg~3Gdk1~1g,ib6EEe" +
  "Bh~3Gdi5~1d,jb4t3234CfBj~3Gdh7~1b,ka4rb4AfCk~3Feh7~1a,kb3qd4xfFj~3Gdi761c3N,la2qf3wfGk~3Gdh933b4M,mAg4tfIl~3Gd" +
  "hec4L,02lyi3seJn~3Fdice2A2a,03kxk3pfJp~3FdiaQ49,13k61ol4neLp~3Gdi8R58,23j53mn3leMr~3Fei5T58,24j34kq3ifC1as~3Fd" +
  "~1e6333,24k25gt4gfB49t~3Fd~1c7342,34k24ew4eeC59t~3Gd~1b7333,35k14cz4cdE4au~3Gc~1c5a,35obB68dG3bv~3Fd~1c2c,45ld" +
  "C66cWw~3Fc~1q,64kcE64cYv~3Fd~1j24,73kcF53cZw~3Fe~1g43,74kcE53b~11w~3Fe~1f52,75jdE43a~13v~3Fg~1e51,85jdE248~16v" +
  "~3Fg~1e5,94kcJ8~17w~3Fg~1d5,95kaK7~19v~3Fh~1c5,a5j9N3R4hv~3Fg~1d4,b4k8~1F7hu~3Gg~1d3,c4k7t2~199gv~3Fh~1c3,c4k7" +
  "s9~139hu~3Gi~1b2,d4k5scB4m8iu~3Hi~1a2,e4j4sez5l8kt~261~1Ai~1c,f3k3sex6m8ls~3Ii~1b,f4Nfw5p7ms~3Ih~1b,g4Lgv5v3ls" +
  "~3Jh~1a,h4Iit6x3lr~3Jh~1a,h4Hjs5A2lr~3Kh~19,i4Elq5C3lp~3Mh~18,j4Cmo5F3kp~3Mi~17,k3D22hn5H2ln~3Oi~16,l3Ggm5K2lm" +
  "~3Ph~16,l4Egm4M3kl~2f2~1zi22~11,e345Bhl5O2lj~2g2~1Am~10,d545q45ik5Q2li~2g3~1Al~10,c744p73hj6R2lh~2i3~1zk~11,b9" +
  "44n92gj5U2lg~2i3~1Ah~13,ab35lb222ai6V3kg~2j3~1Af~14,9c44kda4i6X2le~2l3~1Ac~16,9d34kdw3B1p2lc~2n2~1Ab~17,8e44jc" +
  "x2B3p2kb~419~18,7e54k9~1c2q2l9~438~18,7e64k7~1G2l8~448~17,6g64k4~1J2l6~3o2F9~16,6g74~263k6~3o3F8~16,7e93~272l4" +
  "~3q3E9~15,222f94M1~1k2~3P3E951Y,1ja5K3~1j3~3O4E946O23,1jb5H4~1l2~3P3E946N24,2d22d4i2m5~1m2~3P3E944O15,29l5f5j7" +
  "~1m3~3O4E9~11,19m5e5i8~1o2~3P4E8X22,09m5d5j9F2I2~3P4D9V41,08m6c5jaF2J2~3O5D9U5,06m8c4j336E3I3~3O4E9U4,05lad2k3" +
  "36F3I2~3P4E8V3,04lbz417G2I2~3Q4D9X,03lbBbG3I2~3P4E8X,02lbCbH3I2~3P4E8W,maFaH4H2~3Q4D9V,jbk2m9I3~4z5D9U,hck4l9I" +
  "3~4A4E8U,gbk6m8J3~4A4D9T,eck6o7J3~4A5D9S,dbk6r6J4~4A5D8S,cbk5u5J5~4A4D9R,bbm3q235J7~4y5D8R,aaQ434Je~4s5D8Q,a8R" +
  "633Je~4s6C9P,a7S641Ke~4t6C9O,a5U6Pe~4u6C8O,b2X4Qe~4v5D8N,~1b2Rd~4w6C9M,~24d~4x6C8M,~24c~4z5D8L,~24ag3~4i6C9K,~" +
  "23ah4~4i5D8K,~229k3~4i6D8J,~215p3~4i7C9I,~214r1~4k7C8I,~213w2~4g6D8H,~2z4~4g6C9G,~2y6~4g5D8G,~2z5~4g6D8F,~1q1~" +
  "193~4i6C9E,~1p3~5u6C8E,~1q2~5u6D8D,~6X6C9C,Z5o6~5q6C9B,Y7mb~5n6C8B,X9lk~5e6C9A,Xakl~5e6C8A,Y9jl~5f7C7A,Z8ik~5i" +
  "7B8z,~107ijL4~4v6C9x,~125jhL6~4v6C9w,~134k61115M7~4w6Bav,~143r1R8~4w6Cau,~143q3Q8~4x6Cbs,S583p4P7~4z6Cbr,Q882q" +
  "4Ic~4A7Bcq,Pa82p4Hc~4C6Cdo,Pa83n5Fd~4E5Ddn,P9a1o4Fd~4G5Cem,Q7~1id~4H6Cel,R6~1id~492x6Cfj,S4~1kb~4a1z5Dfi,T2~1m" +
  "a~4K6Chg,~2h9~4M6Chd2,~2ga~4N5Dgb4,~2fa~4O6Cf97,~2g8~4Q6Cca8,r3~1Q3~4S6C9b9,p6d3~1z2~4T6D7ab,o7d4l7~152~4V6D5a" +
  "c,n7e5i9~143~4V6Rd,n5hab9K5g3~4W6Of,o1kba8K7f2~4Y6Mg,34Da6228I9e3~4Y7Kh,26D324542321Hcb4y2~4q7Jh,18J14623Je85z" +
  "2~4r6Kg,0aMcIe86~527Md,0bx39a21Je77~528P63,0fs579Od78~537Y,0gr568Rd69~537X,0hr458Tf2a~547W,0hs366Vl22~566W,0i~" +
  "1Ck~5a7V,0i~1Fg~5c7U,0h~1Hf~5c8T,033b~1He~5e7T,024a~1Id~5g7S,6a~1Jc~5g8R,6b~1Ic~5h8Q,7427~1Fb~5j7Q,e8k6~1d9~5m" +
  "5R,e9ia~1b7~5o3S,dbha~1b6~6k,dbga~1d4~6l,dbga~1e2~6m,dbfa~7D,ccfa~6P2M,bdfa~6O4L,afdb~6O5K,9gcb~6P6J,8c14a442~" +
  "6T5J,8b3393~725I,9bc4~736H,aba3~766G,ba92~795G,ca81~7a6F,c514~2W2~4m6E,d341~2W4~4l6E,d2R2~294~4m6D,d2Q4~293~4m" +
  "7C,c4N7~291~4o7B,b5M8~6z6B,6aLa~6z6A,5bLc~6y5A,4dKd~6x6z,2fJe~6x7y,1fGj~6x6y,0fGk~6y6x,0cJl~451~2s6w,0aLm~434~" +
  "2q7v,08Nn~434~2q7u,07On~453~2p7i1b,06Qn~453~2p7g3a,04Sn~464~2o7f3a,03Um~474~2n8f39,03Wk~482~2p7f48,03~11e~6B7e" +
  "48,03~12c~1B3~4Y8d57,0a~2I4~4Y8d47,0d~2G3~1r1~3x7e37,0e~7I7e27,0f~753A6n,2dh2~6L5z7m,3df4~6J7z7l,4dd5~6J8z7k,4" +
  "dd4~6K9z6k,5dc2~6N9y7j,5d~728z7f12,6c~3j3~3H7A6e31,7a~3k3~3H8A6d4,7a~3k3~3I8z7d3,89t4~2N3~3J7A7d2,89r6~2O2~3K7" +
  "A7e,9223r5~2R2~3J8z7e,H4~3W1~2H8z7d,G4~3W2~2I7A7c,F4~2N4~3Q8z8b,E4~2N6~3Q7A7b,F1~2P6~3Q7B7a,~3w5~3R7A89,~3w4~1" +
  "91~2J6B79,~3x2~193~2I6C78,~4J1~2K6B87,~7v6B86,~7w7A85,~7w8z94,~2G1~4Q7A84,~2G1~4R7A83,~7y8z92,~7z7A91,~7A7za,~" +
  "7A8z9,~7B8z8,~7C8y8,~3M2~3P7z7,~3J5~3P8y7,~212~1G2~3T8y6,~212~351~2w7z5,~212~4N2N8z4,~212~4M5M7z4,~213~4K7M7z3" +
  ",~224~2y2x2~1z8M7z2,~224~2x4w2~1z9L8z1,~233~2y4~279L8z,~242~263r3~27aL7y,~4b5r3~27bK6y,~281~225s3~27bK5y,~273~" +
  "205u3~27bJ5y,~273~213v4~27bI5y,~272~2A4~28bI4y,~3a1~1y4~29bI3y,~393~1y4~29b~1i,~384~1z5~28b~1h,~375~1A5~27c~1g" +
  ",~375~1B5~27624~1f,~375~1D4~27444~1e,~1t3~1C4~1E5~2d4~1e,~1s5~1C2~1G5~2c4~1e,~1t4~3m4~2a4~1f,~1u2~3p4~283~1g,~" +
  "4W4~271~1i,~4X4~3p,~4Y2~3q,~8q,~8q,~8q,~8q,~7o3Z,~2E2~4H5Y,~2D5~4F6X,~2A9~4D8W,~2zb~312~1A134V,~2yc~371~1A3V,~" +
  "1g2~1gc~371~1B3U,~1g2~1gd~4I4T,~1g2~1hd~1D2~326B2e,~1c7~1h823~1B4~30aw6c,~1b8~1h743~1A4~30brbb,~1c132~1h763~1A" +
  "2~32bpf8,~2x6a3~4Ebmi7,~2v7c2~4Fbj42e7,~2u7~4Vbh44e6,~2s7~4Z523f55e5,~2r7~51433c75f4,h2~278~52432c74h3,i1~268~" +
  "544g73i3,~2p7~571j22n2,33X2~1l6~5wm2,16V3~1f344~2j1~3dn1,07V2~1e6~2p3~112~29n1,06~2a8~2o4~105~28m1,14~2a9~2n4~" +
  "116~29k1,~2e9~2o3~136~29i2,~2e7~3x6~28i2,~123~1a5~3z7~27h2,~124~1b2~3A8t3~1Bg2,~125~4M9r5~1Bf2,~134~4Maq6~1Cd2" +
  ",~144~4Map7~1Cd1,~144~4N9p9~1G8,~153~1N4~2O457r9~1G7,~163~1L6g2~1P1E6D9~1F7,~173~1l3m7f3~1O1E7D9~1F6,~174~1k4k" +
  "ae3~2s8d3i159~1D6,~174~1l4icf1~2s9b5g449~1D5,~175~1l3he~261zc96g448~1D5,~166~1Eg~251ye79f455~1E5,~158~1C926~2D" +
  "f6ba23454g1~1n5,~149~1B937~2Bg5d852542g223~1j4,~139~1j1b34838~272rg5f8525k225~1j3,~125~1n3b32847~282rf6g9434i3" +
  "25~1j3,~124~1n4cc55~283qg6g415433h434~1j3,~124t2R5d34634~283qi5f435252g5~1q3,~133t4O6l614~283qk5e53t693~1d3,~1" +
  "z7K7n8~283ra296b73r786~1c2,~1A7I8o7~273t8496994o797~1c1,~1B6I7r4~282v74b665154n5c7~1b1,~1C4I8r3~2H64c645353n4e" +
  "7~192,~1L2A9q3~2K52635627352o2g8~163,~1K4z8q4~2Lb558254M8~144,~1K5x8r3~2Na665454M8~134,~1L5v8s3~2O9673663F258~" +
  "133,~1N2v8~3l9491861F558~14,~1k3i3C7i4~3274kK658~13,~1j3i5A7h7~3272mK568~12,~1h4j5z7haC2~2nvL288~11,02~1e4l4m2" +
  "b6hcA4g2~25vV9Z,03~1c4n2m497gey7e3~1g1Pt~105Y,04q6D6L668f565x8e3~1e3Pa3e~143X,14o8B6v2g648g494vaf1~1f1R85c~172" +
  "W,24m9A7u4h529u4tc~2n66b~192V,33may7v5idw4r535~2o56b~13162U,42may6u8iag27465c1c446~2p35bV17443T,s9A4v9i8g46556" +
  "a4b337~2q33bV37443S,t8~1a323j6h5556694c146~2sfX28351T,t7~1c322k3i75466a3h6~2td~191~10,u5~1e3Hae4w4~2wb~2a,v2q9" +
  "I3FdG261~2y9~1m3M,UdH453wfD4~2F7~1m5L,TeH454vhg4h452~2z5~1m6L,RhG373vn5316h253~2B2~1n6L,PkF292sr3dm2~406M,OmD2" +
  "e2ns3e~4n5N,NoA4e3lt4e~4n3O,Mf29y6d4kt8be1~4Y,K31b58x8d4it9db3~4X,J33976y9d4gg1d9ea3~4X,I51987x9e4fu8ga2~4X,Hg" +
  "8bu8f4et7j92~4X,Ek8bu7h5cs5l~58,Dm8av722d6bq5lP2~4i,Cn98xbd7ao6lG451~4j,Bnb7xce6bialF7~4n,Aob8vee5chalF8~4m,ye" +
  "2badqef5cgalEa~4l,u8282ba626q427h4cfalD416~4l,t83la545x5j4cf9lD426~4k,se3ga545z2m1fdaja3c1e426~4k,sc6627a545~1" +
  "11cd9j9693e326~4k,rc8447a355~104bc433h9883f154~4k,qbc166i5~105ca353e8c82b293~3W322h,q9e265j4~114da254badk392~3" +
  "D3g8g,q8f355k2~123f925j24ek381~3C6ccf,q9d626A1N3g834i43fk5~3H8afd,pbcez4L3i642j44el5~3F9agc,n446bfy5K442c58e43" +
  "4fl4~3Eab11fa,m465bgx6K424c46iagj3~241~1zcdh7,m383i252z6K422e25m8hh4~215~1xe22421i7,5342~1n6K4no8gh4~206~1w91a" +
  "3l7,4515~1n5K5lq9eh5~1Z5~1xl2k8,3dH1E5K6kqaeh5~1Y5~1wm2hb,2fF3D6J7kofbi5~1W5~1vm3gc,2fF3D8I8jnhad145~1V5~1un2h" +
  "723,1hE3CbB338jljab435~1V3~1ud381j614,0jD3Bdz53761dimab435~3r716182jb,0px3zgy635mge289c345~3q71g153bb,0qw3y71a" +
  "w834a2cdp8l4K4~2Cp9a524,0qw3x81bua32a4ccp7k122L5~2Cd1a8a714,0qw3xb28taf5cap4a493O7~2Bb3897f,0nz4wa47sah4dan4a5" +
  "93O8~2A4a797g,0mB3w777rbi4e9759682d3P8~2z3b5b7g,4gD3w777rb43c6c8749952~169~2y3b4c7g,5fD3v88643kb35d5c7ja43~15c" +
  "~2w3c4e4g,6eD3ua7725jb36d5d5ia52~15e~2v3c5e3c13,7eC3ub6726j938d5d44b37v2Hg~2h583c56353b32,8fA3n43c4827j829g3d2" +
  "3e35v3G35a~2f782d54551d22,8hz1n62d3829j538i3ge43y1G37a~2e7o437m,8i3142L72e282aj428j3ge3371~1748bB2~1z7a1fdl,8i" +
  "38K72f182bjcl1he3273~1639cz5~1y6sbl,8i38K73n2cl9q3bi81~163bcy6~1y5u9l,8e2157m1m83n2dk8q5bg~1f3dcx6~1z4uak,c9a6" +
  "l3gd3n2fj6s4dd~1f3fdv5~27bk,02b7b5m39k3n2gj4t4ec~1f3hct6~26ck,0593e5m38l2HO4gb~1e3jcs7~1Z33ck,06n7m37m2c5rN4i8" +
  "~1e3mbr9~1X43bk,07n7k47l4a7sL4j6~1e4nbr9~1W467l,07o6k47l588tL432e4~1e5ocqa~1V2z,07o7i56l858vL324~1u6pcqa~2v,08" +
  "o6h65mlwN6~1t8pcr8~2v,08o7g55olxL7~1s9pcr7~2v,08p8e55pkyK7~1rbpcs4~2w,08aa6cb25qkzJ8~1pdpb~32,089c5d348skAI9~1" +
  "ngna~2i1K,098c6c257tkBHa~1lilaE2~1D2J,097d7b257tkDC22ai3Zc25ka43w4~1D1A18,367d8a32askEA429j3Yb55h44246t6~2c37," +
  "538g77grl52zy527l1Zb75f3b7s7~2b37,fi84iql52Bv725~1n32585d3b9r8~1F3s28,fiupm52Ct83453a1~1b2a4c3car7~1F4B,fiunp4" +
  "2Ds7526393~1n2d2dat6~1F4A,fitfy42Er7p4~142L9u6~1F4z,01fiqgz42Fr722k4~142M8v6~1G2z,02ghohy52b3sqcj3~143s1k642s5" +
  "~1G2y,01kepgg2g52a5spdj1c1R4r3j545r6~1F1u22,s6qfh2f6287tpdu3P6p3k456r6~2931,t4sdz5379tsas3P7p2k467r7~2b,02k2~1" +
  "n535ctsaq3Q8n3j478r7~2a,03i4Y2m534dvq9r3Pal3j499r6~29,04h4X4l5lvp8t1P436i3k3aar6~28,04i2E2i5k4nvo7~1j456i1k3ac" +
  "r6~27,04Gc2743a5k4nwo5~1k376B49er5~27,03Br3587j3px~1K2a5A49hr4~1U2a,Ds2768j3qx~1I2c4d1l49jr5~1S39,w34B59j3qyn3" +
  "~1g3d2d2j59lr5~1S47,v53B5a23d352kyn1~1h2s3i5amr5~1T36,uL4gc344kz~1C3r3i6934iq5~21,tN2ja344kA~1A4q3j5936ir5~1Z," +
  "tx1B9345kA~1y5q3j5919ir8~1V,ta2i5A9346kA~1w6p3j691air7~1V,g4994g6A9347jC~1t8n4j5mir5~1W,g4998b7A9347kC~1s9l4j4" +
  "qir2~1X,b1i7b89z9348kC~1qbj4k3si~2p,b1j5d79r16a348kD~1o535h4k3v31d~2o,w2f6bp34c249kE~1l383h4j3x13d~123~1i,O4do" +
  "j249lE~1k2a3g3j3CeZ6~1h,~15oi348mF~1i2c3g1j368ohX6~1h,42~10ni346pF~1g3c2A459oiW6~1h,25Znh453sG~1d3O45boiW6~1g," +
  "16Ypg3CG~1b4K84dojW5~1f,08Xpf3DH~1a3r2i75dpjW5~1e,09Xof2FH~184q4h74fokX4~1d,0aXnf2GH~166o5i54gnmY3~1c,0aYne2GI" +
  "W268m5j44hnnw1r3~1b,0bh4Cod2HIU53al4j44728d2aot4q1~1c,0b9dBod2IJRkj4j45656d39ps6~1B,0c7eApd2IKOe27h4j54675d38r" +
  "s8p3~16,0f2gzqd2JKMe56f4j54685e1847jq8o5~15,0wzrd2KKL9c5d5i54694p2bhq7n6~15,0wzrd2LKK8f3d4i54695Dhq6o6~14,0wzr" +
  "d2LLI9g2c4i455a5Ggr4p7~12,0wp2761ld2M22HGat5h464b4Igr3q7~11,0wm6571mc2R61AEbs5h465a5Ihr1s7~10,0wl74vb3S43ACbs6" +
  "g46794j3njU6Z,2uk92xa3T4195nm3ccr6d859u5njU6Y,4skIa3Ubakl5aep7c85at7njU6X,6qkIa3V7dkm76fo7d769saoiU5X,8nl83b2j" +
  "b4V5ba48o74835o6d769scoiU4X,037l54d5694hb6~15f92p82855m6e669teniU2Y,048j4f25874h9a~11iBg88g6f659tj22gj~1S,059g" +
  "5n656i7c~10nydb8e6g559tpgj~1R,04dc6o366j5dZtvbd8c6g649tqkg~1Q,03h87w6k4dZxt9f7a7h548uqmg~1P,zu7l3dYAt8g697h557" +
  "urng~1O,zt7n2cYBu7h4a7g467utmi~1M,0dnm238n2aZCv6v6g468tvmi~1L,0fo23e246o29~10Cw5u5h558uxli~1K,0g77k7453p27~13B" +
  "x5s5h568tzli~1J,0h5bt52p33~16Bz6p4i469sBliu2k2Q,0h5gq24o32~18A34t7m5h469sDlit3i3Q,0i4iuo~1dA26t7k5i459tEliu6c3" +
  "R,0i5ito~1ez17u6j5i459tGliu6a3S,0j4j76fo~1fx27v6h5i468tJkjs766S,0k3j69en~1gg3d27w7f4i468tLkjriE3c,0k3i6ddl~1gf" +
  "5lx7f2i469sNkjrgE5b,0l2i6fdj~1fe8jz7x559tPjktbE7a,0l2h6m9h~1fcbiz8w469tQiltaE89,0l3g6mag~1fbchB7w379tQilu8G79";
