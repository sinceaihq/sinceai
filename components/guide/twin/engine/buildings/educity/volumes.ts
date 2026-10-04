import type { V2 } from "../../types";
import { ATRIUM_ROOF, BLOCK, LEVEL, MASS, type MassCell, atriumRoofY } from "./frame";
import { facadeTop, type Facade } from "./data";
import { Bucket, box, quadN, rectSlab, type Vec3 } from "./geom";
import { WALL } from "./mantle";

/**
 * The stepped volume inside the brick mantle (SPEC §3.3.2, LOD2 roof parts):
 * a grid of columns, each a roof or terrace at its height, the plant room on
 * top of three of them and the atrium under its sloped glass roof. Faces
 * the mantle does not cover are rendered light-grey (terrace walls get a
 * glazed band towards the terrace), the plant room is clad in satin panels,
 * terraces get sedum, decking and galvanised railings.
 */

const XB = [0, 18.4, 33.7, BLOCK.w];
const ZB = [0, 6.4, 17.2, 30.5, 36.7, 41.9, 49.35, 54.4, 59.75, BLOCK.d];

export interface Column {
  i: number;
  j: number;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  cell: MassCell;
}

export function columns(): Column[] {
  const out: Column[] = [];
  for (let i = 0; i < XB.length - 1; i++) {
    for (let j = 0; j < ZB.length - 1; j++) {
      const cx = (XB[i] + XB[i + 1]) / 2;
      const cz = (ZB[j] + ZB[j + 1]) / 2;
      const cell = MASS.find((c) => cx >= c.x0 && cx <= c.x1 && cz >= c.z0 && cz <= c.z1);
      if (!cell) throw new Error(`educity: no massing cell at ${cx}, ${cz}`);
      out.push({ i, j, x0: XB[i], x1: XB[i + 1], z0: ZB[j], z1: ZB[j + 1], cell });
    }
  }
  return out;
}

/** Solid height intervals of a column above floor 1 (atrium columns are open). */
function solids(c: Column): [number, number][] {
  if (c.cell.kind === "atrium") return [];
  const out: [number, number][] = [[0, c.cell.top]];
  if (c.cell.plant) out.push([LEVEL.roof, LEVEL.plantTop]);
  return out;
}

export interface VolumeBuckets {
  render: Bucket;
  plant: Bucket;
  frame: Bucket;
  glass: Bucket;
  sedum: Bucket;
  deck: Bucket;
  roof: Bucket;
  metal: Bucket;
  /** Railing infill quads (alpha-textured bars). */
  rail: Bucket;
  frit: Bucket;
  coping: Bucket;
}

/** Edge of a column: plan segment and outward normal, with the neighbour's cover along it. */
interface Side {
  col: Column;
  /** Plan endpoints along the edge (a → b) and the outward normal. */
  a: V2;
  b: V2;
  n: Vec3;
  /** Neighbour's cover height at a and b (−∞ = nothing). */
  cover: (t: number) => number;
  /** Neighbour column (null outside or atrium). */
  other: Column | null;
  atrium: boolean;
  perimeter: Facade | null;
}

function sidesOf(c: Column, all: Column[]): Side[] {
  const at = (i: number, j: number) => all.find((k) => k.i === i && k.j === j) ?? null;
  const out: Side[] = [];
  const mk = (a: V2, b: V2, n: Vec3, ni: number, nj: number, perimeter: Facade) => {
    const other = at(ni, nj);
    if (!other) {
      // Outside: the brick mantle covers up to its top line.
      const s = (t: number) => {
        const p: V2 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        return perimeter === "NE" || perimeter === "SW" ? p[0] : p[1];
      };
      out.push({ col: c, a, b, n, cover: (t) => facadeTop(perimeter, s(t)), other: null, atrium: false, perimeter });
      return;
    }
    if (other.cell.kind === "atrium") {
      out.push({
        col: c,
        a,
        b,
        n,
        cover: (t) => atriumRoofY(a[1] + (b[1] - a[1]) * t),
        other,
        atrium: true,
        perimeter: null,
      });
      return;
    }
    const sol = solids(other);
    // Cover is piecewise: below the neighbour's top everything is covered; plant intervals handled by subtraction later.
    out.push({ col: c, a, b, n, cover: () => sol[0]?.[1] ?? -Infinity, other, atrium: false, perimeter: null });
  };
  mk([c.x1, c.z0], [c.x1, c.z1], [1, 0, 0], c.i + 1, c.j, "SE");
  mk([c.x0, c.z0], [c.x0, c.z1], [-1, 0, 0], c.i - 1, c.j, "NW");
  mk([c.x0, c.z1], [c.x1, c.z1], [0, 0, 1], c.i, c.j + 1, "SW");
  mk([c.x0, c.z0], [c.x1, c.z0], [0, 0, -1], c.i, c.j - 1, "NE");
  return out;
}

/** Polygon(s) in (t, y) for an interval [y0, y1] above a linear cover c(t) over t ∈ [0, 1]. */
export function exposed(c0: number, c1: number, y0: number, y1: number): [number, number][] | null {
  const lo = (t: number) => Math.max(y0, c0 + (c1 - c0) * t);
  const ts = new Set([0, 1]);
  for (const level of [y0, y1]) {
    if ((c0 - level) * (c1 - level) < 0) ts.add((level - c0) / (c1 - c0));
  }
  const sorted = [...ts].sort((a, b) => a - b);
  const bottom: [number, number][] = [];
  for (const t of sorted) bottom.push([t, Math.min(lo(t), y1)]);
  // Region exists where lo < y1.
  if (bottom.every(([, y]) => y >= y1 - 1e-6)) return null;
  const top: [number, number][] = sorted
    .slice()
    .reverse()
    .map((t) => [t, y1] as [number, number]);
  return [...bottom, ...top];
}

/** Emit a planar polygon on a vertical side (t ∈ [0, 1] along a → b, y) as a fan (convex regions only). */
function sidePoly(b: Bucket, s: Side, poly: [number, number][]): void {
  const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
  // Drop zero-height columns of the polygon to avoid degenerate triangles.
  const pts: Vec3[] = poly.map(([t, y]) => [s.a[0] + (s.b[0] - s.a[0]) * t, y, s.a[1] + (s.b[1] - s.a[1]) * t]);
  const uv = poly.map(([t, y]) => [t * len * (s.n[0] + s.n[2] > 0 ? 1 : -1), y] as const);
  for (let i = 1; i + 1 < pts.length; i++) {
    const ab = [pts[i][0] - pts[0][0], pts[i][1] - pts[0][1], pts[i][2] - pts[0][2]];
    const ac = [pts[i + 1][0] - pts[0][0], pts[i + 1][1] - pts[0][1], pts[i + 1][2] - pts[0][2]];
    const cr = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const area = Math.hypot(cr[0], cr[1], cr[2]);
    if (area < 1e-8) continue;
    if (cr[0] * s.n[0] + cr[1] * s.n[1] + cr[2] * s.n[2] >= 0) b.tri(pts[0], pts[i], pts[i + 1], s.n, uv[0], uv[i], uv[i + 1]);
    else b.tri(pts[0], pts[i + 1], pts[i], s.n, uv[0], uv[i + 1], uv[i]);
  }
}

/** All exposed walls, roofs and terrace dressing of the stepped volume. */
export function buildVolumes(b: VolumeBuckets, plantUp: Bucket): void {
  const all = columns();
  for (const c of all) {
    if (c.cell.kind === "atrium") continue;
    for (const side of sidesOf(c, all)) {
      for (const [y0, y1] of solids(c)) {
        let c0 = side.cover(0);
        let c1 = side.cover(1);
        if (side.other && !side.atrium) {
          // Subtract the neighbour's intervals (its main volume and plant room).
          const theirs = solids(side.other);
          const coverTop = theirs.reduce((m, [a, bb]) => (a <= y0 + 1e-6 ? Math.max(m, bb) : m), -Infinity);
          c0 = c1 = coverTop;
          // A neighbour's plant room covers our plant interval too.
          if (y0 >= LEVEL.roof - 1e-6 && side.other.cell.plant) continue;
        }
        if (!Number.isFinite(c0)) c0 = c1 = -1e3;
        const poly = exposed(c0, c1, y0, y1);
        if (!poly) continue;
        const plant = y0 >= LEVEL.roof - 1e-6;
        // On the perimeter the exposed part sits on the brick top line: recess render 0.1 m less than nothing (flush).
        sidePoly(plant ? plantUp : b.render, side, poly);
        if (!plant && side.other && !side.atrium && side.other.cell.kind === "terrace") {
          glazedBand(b, side, side.other.cell.top, y1);
        }
      }
    }
    // Roof or terrace surface.
    const top = c.cell.top;
    if (c.cell.plant) {
      plantRoof(b, c);
    } else if (c.cell.kind === "terrace") {
      terrace(b, c, all);
    } else {
      rectSlab(b.roof, c.x0 + (c.i === 0 ? WALL : 0), c.x1 - (c.i === XB.length - 2 ? WALL : 0), c.z0 + (c.j === 0 ? WALL : 0), c.z1, top, true);
    }
  }
  atriumRoof(b);
}

/** Glazed band (doors/windows onto a terrace) on a terrace-facing wall. */
function glazedBand(b: VolumeBuckets, s: Side, floor: number, wallTop: number): void {
  const h = Math.min(2.75, wallTop - floor - 0.45);
  if (h < 1.8) return;
  const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
  const ux = (s.b[0] - s.a[0]) / len;
  const uz = (s.b[1] - s.a[1]) / len;
  const t0 = 0.6;
  const t1 = len - 0.6;
  if (t1 - t0 < 1.5) return;
  const off = 0.02;
  const P = (t: number, y: number): Vec3 => [s.a[0] + ux * t + s.n[0] * off, y, s.a[1] + uz * t + s.n[2] * off];
  const y0 = floor + 0.12;
  const y1 = y0 + h;
  // Glass (interior-mapped) and a dark frame with mullions every 1.2 m.
  const w = t1 - t0;
  const seed = Math.abs((s.a[0] * 7.13 + s.a[1] * 3.71 + floor) % 1);
  const rightSign = s.n[0] + s.n[2] > 0 ? 1 : -1;
  b.glass.set("aWinB", [-0.12, 4.0, seed, 0]);
  const corners: [number, number][] = [
    [t0, y0],
    [t1, y0],
    [t1, y1],
    [t0, y1],
  ];
  // "Right, seen from outside" = (n.z, −n.x): lx runs that way.
  const along = ux * s.n[2] + uz * -s.n[0];
  const lx = (t: number) => (along > 0 ? t - t0 : t1 - t);
  const pts = corners.map(([t, y]) => P(t, y));
  const ab = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]];
  const ac = [pts[2][0] - pts[0][0], pts[2][1] - pts[0][1], pts[2][2] - pts[0][2]];
  const cr = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
  const order = cr[0] * s.n[0] + cr[1] * s.n[1] + cr[2] * s.n[2] >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
  for (const idx of order) {
    b.glass.set("aWinA", [lx(corners[idx][0]), corners[idx][1] - y0, w, h]);
    b.glass.vertex(pts[idx], s.n, [corners[idx][0] * rightSign, corners[idx][1]]);
  }
  // Frame: sill, head, mullions.
  const fb = (ta: number, tb: number, ya: number, yb: number) => {
    const q = [P(ta, ya), P(tb, ya), P(tb, yb), P(ta, yb)] as [Vec3, Vec3, Vec3, Vec3];
    const outN: Vec3 = s.n;
    const pushed = q.map((p) => [p[0] + outN[0] * 0.03, p[1], p[2] + outN[2] * 0.03] as Vec3) as [Vec3, Vec3, Vec3, Vec3];
    quadN(b.frame, pushed, outN, [
      [ta, ya],
      [tb, ya],
      [tb, yb],
      [ta, yb],
    ]);
  };
  fb(t0 - 0.05, t1 + 0.05, y0 - 0.06, y0);
  fb(t0 - 0.05, t1 + 0.05, y1, y1 + 0.08);
  for (let t = t0; t <= t1 + 1e-6; t += Math.max(1.2, w / Math.round(w / 1.2))) fb(t - 0.03, t + 0.03, y0, y1);
}

/** Plant room roof (33.94): membrane, PV rows and air-handling units, metal coping. */
function plantRoof(b: VolumeBuckets, c: Column): void {
  const y = LEVEL.plantTop;
  rectSlab(b.roof, c.x0, c.x1, c.z0, c.z1, y, true);
  // PV rows (dark blue, tilted) — only on the large parts.
  const area = (c.x1 - c.x0) * (c.z1 - c.z0);
  if (area > 120) {
    b.metal.color("#1d2738");
    for (let z = c.z0 + 1.6; z < c.z1 - 1.6; z += 2.4) {
      for (let x = c.x0 + 1.4; x < c.x1 - 3.6; x += 4.4) box(b.metal, x, y, z, x + 3.9, y + 0.45, z + 1.1);
    }
  } else {
    b.metal.color("#8a9094");
    box(b.metal, c.x0 + 1.5, y, c.z0 + 1.5, Math.min(c.x1 - 1.5, c.x0 + 8), y + 1.6, Math.min(c.z1 - 1.5, c.z0 + 4));
  }
}

/** Terrace: sedum with a decking strip along its back wall, benches, railings at the drops. */
function terrace(b: VolumeBuckets, c: Column, all: Column[]): void {
  const y = c.cell.top;
  const inset = (side: "x0" | "x1" | "z0" | "z1") => {
    // On the perimeter the brick wall takes WALL of the column.
    if (side === "x0" && c.i === 0) return WALL;
    if (side === "x1" && c.i === XB.length - 2) return WALL;
    if (side === "z0" && c.j === 0) return WALL;
    if (side === "z1" && c.j === ZB.length - 2) return WALL;
    return 0;
  };
  const x0 = c.x0 + inset("x0");
  const x1 = c.x1 - inset("x1");
  const z0 = c.z0 + inset("z0");
  const z1 = c.z1 - inset("z1");
  const sides = sidesOf(c, all);
  // Back wall = the side with the tallest neighbour.
  let back: Side | null = null;
  let tallest = y + 0.5;
  for (const s of sides) {
    if (!s.other || s.atrium) continue;
    const t = Math.max(...solids(s.other).map(([, top]) => top));
    if (t > tallest) {
      tallest = t;
      back = s;
    }
  }
  const strip = c.cell.surface === "deck" ? 99 : 2.0;
  let dx0 = x0;
  let dx1 = x1;
  let dz0 = z0;
  let dz1 = z1;
  if (back && strip < 99) {
    if (back.n[0] > 0.5) dx0 = x1 - strip;
    else if (back.n[0] < -0.5) dx1 = x0 + strip;
    else if (back.n[2] > 0.5) dz0 = z1 - strip;
    else dz1 = z0 + strip;
    rectSlab(b.deck, dx0, dx1, dz0, dz1, y + 0.06, true);
    // Sedum fills the rest.
    const rest: [number, number, number, number][] = [];
    if (back.n[0] > 0.5) rest.push([x0, dx0, z0, z1]);
    else if (back.n[0] < -0.5) rest.push([dx1, x1, z0, z1]);
    else if (back.n[2] > 0.5) rest.push([x0, x1, z0, dz0]);
    else rest.push([x0, x1, dz1, z1]);
    for (const [a0, a1, b0, b1] of rest) rectSlab(b.sedum, a0, a1, b0, b1, y + 0.03, true);
    // Two long timber benches on the decking.
    const alongX = Math.abs(back.n[2]) > 0.5;
    const cx = (dx0 + dx1) / 2;
    const cz = (dz0 + dz1) / 2;
    if (alongX) for (const k of [-0.25, 0.25]) box(b.deck, cx + k * (dx1 - dx0) - 1.2, y + 0.06, cz - 0.25, cx + k * (dx1 - dx0) + 1.2, y + 0.5, cz + 0.25);
    else for (const k of [-0.25, 0.25]) box(b.deck, cx - 0.25, y + 0.06, cz + k * (dz1 - dz0) - 1.2, cx + 0.25, y + 0.5, cz + k * (dz1 - dz0) + 1.2);
  } else {
    rectSlab(c.cell.surface === "deck" ? b.deck : b.sedum, x0, x1, z0, z1, y + 0.05, true);
  }
  // Railings where the terrace drops (to a lower neighbour or the atrium) or the screen wall is low.
  for (const s of sides) {
    let needs = false;
    if (s.atrium) needs = true;
    else if (s.other) needs = Math.max(...solids(s.other).map(([, t]) => t), -1) < y - 0.6;
    else if (s.perimeter) needs = Math.min(s.cover(0), s.cover(1)) < y + 1.05;
    if (!needs) continue;
    const inN = -1;
    const off = s.perimeter ? WALL + 0.15 : 0.12;
    const a: V2 = [s.a[0] + s.n[0] * inN * off, s.a[1] + s.n[2] * inN * off];
    const e: V2 = [s.b[0] + s.n[0] * inN * off, s.b[1] + s.n[2] * inN * off];
    railing(b.metal, b.rail, a, e, y + 0.05, 1.1);
  }
}

/**
 * Galvanised railing between two plan points at floor height y: top and
 * bottom rails and posts as geometry, the flat-bar infill as one textured
 * quad in `infill` (u = metres along the run, v = height; see makeRailingMaterial).
 */
export function railing(b: Bucket, infill: Bucket, a: V2, e: V2, y: number, h: number): void {
  b.paint("#9aa1a4", 0.45, 0.5);
  const len = Math.hypot(e[0] - a[0], e[1] - a[1]);
  if (len < 0.3) return;
  const ux = (e[0] - a[0]) / len;
  const uz = (e[1] - a[1]) / len;
  const rail = (yy: number, th: number, w: number) => segmentBox(b, a, e, yy, yy + th, w);
  rail(y + h - 0.05, 0.05, 0.06);
  rail(y + 0.1, 0.04, 0.04);
  // Posts every ~1.6 m.
  const posts = Math.max(1, Math.round(len / 1.6));
  for (let k = 0; k <= posts; k++) {
    const t = (k / posts) * len;
    const p: V2 = [a[0] + ux * t, a[1] + uz * t];
    box(b, p[0] - 0.03, y, p[1] - 0.03, p[0] + 0.03, y + h, p[1] + 0.03);
  }
  // Infill: bars from the bottom rail to the top rail.
  const y0 = y + 0.14;
  const y1 = y + h - 0.05;
  const n: Vec3 = [-uz, 0, ux];
  quadN(infill, [[a[0], y0, a[1]], [e[0], y0, e[1]], [e[0], y1, e[1]], [a[0], y1, a[1]]], n, [
    [0, y0],
    [len, y0],
    [len, y1],
    [0, y1],
  ]);
}

/** An axis-aligned box following a plan segment (the segment must be axis-aligned in E). */
export function segmentBox(b: Bucket, a: V2, e: V2, y0: number, y1: number, w: number): void {
  const x0 = Math.min(a[0], e[0]) - (Math.abs(e[0] - a[0]) < 1e-6 ? w / 2 : 0);
  const x1 = Math.max(a[0], e[0]) + (Math.abs(e[0] - a[0]) < 1e-6 ? w / 2 : 0);
  const z0 = Math.min(a[1], e[1]) - (Math.abs(e[1] - a[1]) < 1e-6 ? w / 2 : 0);
  const z1 = Math.max(a[1], e[1]) + (Math.abs(e[1] - a[1]) < 1e-6 ? w / 2 : 0);
  box(b, x0, y0, z0, x1, y1, z1);
}

/** The fritted glass roof over the atrium with its steel beams and the maintenance rail. */
function atriumRoof(b: VolumeBuckets): void {
  const r = ATRIUM_ROOF;
  const p00: Vec3 = [r.x0, r.y0, r.z0];
  const p10: Vec3 = [r.x1, r.y0, r.z0];
  const p11: Vec3 = [r.x1, r.y1, r.z1];
  const p01: Vec3 = [r.x0, r.y1, r.z1];
  const slope = Math.hypot(r.z1 - r.z0, r.y0 - r.y1);
  const ny = (r.z1 - r.z0) / slope;
  const nz = (r.y0 - r.y1) / slope;
  quadN(b.frit, [p00, p10, p11, p01], [0, ny, nz], [
    [r.x0, 0],
    [r.x1, 0],
    [r.x1, slope],
    [r.x0, slope],
  ]);
  // Light-grey steel: main beams down the slope every ≈2.55 m, purlins every ≈1.5 m of slope.
  b.metal.color("#c4c8ca");
  const beams = 6;
  for (let k = 0; k <= beams; k++) {
    const x = r.x0 + ((r.x1 - r.x0) * k) / beams;
    slopedBar(b.metal, [x, r.y0, r.z0], [x, r.y1, r.z1], 0.14, 0.42);
  }
  const purlins = Math.round(slope / 1.5);
  for (let k = 1; k < purlins; k++) {
    const t = k / purlins;
    const y = r.y0 + (r.y1 - r.y0) * t;
    const z = r.z0 + (r.z1 - r.z0) * t;
    box(b.metal, r.x0, y - 0.16, z - 0.04, r.x1, y - 0.06, z + 0.04);
  }
  // Maintenance rail and ladder along the south-east edge.
  slopedBar(b.metal, [r.x1 - 0.5, r.y0 + 0.5, r.z0], [r.x1 - 0.5, r.y1 + 0.5, r.z1], 0.05, 0.05);
  slopedBar(b.metal, [r.x1 - 1.1, r.y0 + 0.12, r.z0], [r.x1 - 1.1, r.y1 + 0.12, r.z1], 0.05, 0.05);
}

/** A bar of rectangular section (w across x, d deep below the line) along a sloped line in the y–z plane. */
function slopedBar(b: Bucket, p: Vec3, q: Vec3, w: number, d: number): void {
  const x0 = p[0] - w / 2;
  const x1 = p[0] + w / 2;
  const top = (P: Vec3): Vec3 => [P[0], P[1] - 0.02, P[2]];
  const bot = (P: Vec3): Vec3 => [P[0], P[1] - d, P[2]];
  const A = top(p);
  const B = top(q);
  const C = bot(q);
  const D = bot(p);
  const sideQuad = (x: number, nx: number) =>
    quadN(b, [[x, A[1], A[2]], [x, B[1], B[2]], [x, C[1], C[2]], [x, D[1], D[2]]], [nx, 0, 0], [
      [A[2], A[1]],
      [B[2], B[1]],
      [C[2], C[1]],
      [D[2], D[1]],
    ]);
  sideQuad(x0, -1);
  sideQuad(x1, 1);
  quadN(b, [[x0, D[1], D[2]], [x1, D[1], D[2]], [x1, C[1], C[2]], [x0, C[1], C[2]]], [0, -1, 0], [
    [x0, D[2]],
    [x1, D[2]],
    [x1, C[2]],
    [x0, C[2]],
  ]);
}

/**
 * Coping on the brick top: a dark metal cap following the sloped top line of
 * each facade (NE and SW run over the corners, SE and NW butt into them).
 */
export function copings(b: Bucket, tops: { f: Facade; s0: number; s1: number; kinks: number[] }[], point: (f: Facade, s: number, d: number) => V2): void {
  for (const { f, s0, s1, kinks } of tops) {
    const ss = [s0, ...kinks.filter((k) => k > s0 && k < s1), s1];
    for (let i = 0; i + 1 < ss.length; i++) {
      const a = ss[i];
      const e = ss[i + 1];
      const ya = facadeTop(f, a);
      const ye = facadeTop(f, e);
      const P = (s: number, y: number, d: number): Vec3 => {
        const [x, z] = point(f, s, d);
        return [x, y, z];
      };
      const th = 0.06;
      const d0 = -0.035;
      const d1 = WALL + 0.035;
      // Top surface.
      quadN(b, [P(a, ya + th, d0), P(e, ye + th, d0), P(e, ye + th, d1), P(a, ya + th, d1)], [0, 1, 0], [
        [a, d0],
        [e, d0],
        [e, d1],
        [a, d1],
      ]);
      // Outer and inner fascias (drip edges).
      const out = point(f, 0, -1);
      const org = point(f, 0, 0);
      const n: Vec3 = [out[0] - org[0], 0, out[1] - org[1]];
      quadN(b, [P(a, ya - 0.04, d0), P(e, ye - 0.04, d0), P(e, ye + th, d0), P(a, ya + th, d0)], n, [
        [a, ya],
        [e, ye],
        [e, ye + th],
        [a, ya + th],
      ]);
      quadN(b, [P(a, ya - 0.04, d1), P(e, ye - 0.04, d1), P(e, ye + th, d1), P(a, ya + th, d1)], [-n[0], 0, -n[2]], [
        [a, ya],
        [e, ye],
        [e, ye + th],
        [a, ya + th],
      ]);
    }
  }
}
