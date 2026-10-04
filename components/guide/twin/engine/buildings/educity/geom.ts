import * as THREE from "three";
import type { V2 } from "../../types";

/**
 * Geometry accumulation for EduCity: everything is authored in the E plan
 * frame (x_E, y_E, z_E) as flat-shaded triangles with metre UVs and merged
 * into one mesh per material ("bucket"), so the whole building stays inside
 * the per-module draw-call budget. Buckets can carry extra per-vertex
 * attributes (vertex colours, window data for the glass shader).
 *
 * UV convention (metres): vertical faces u = along the face (left → right
 * seen from the side the normal points to), v = y_E; horizontal faces u = x_E,
 * v = z_E.
 */

export type Vec3 = [number, number, number];

export class Bucket {
  readonly pos: number[] = [];
  readonly nor: number[] = [];
  readonly uv: number[] = [];
  readonly ext: Record<string, { size: number; data: number[]; cur: number[] }> = {};

  constructor(
    readonly name: string,
    extra: Record<string, number> = {},
  ) {
    for (const [k, size] of Object.entries(extra)) this.ext[k] = { size, data: [], cur: new Array(size).fill(0) };
  }

  /** Value of an extra attribute for the vertices that follow. */
  set(attr: string, values: readonly number[]): this {
    const e = this.ext[attr];
    if (e) for (let i = 0; i < e.size; i++) e.cur[i] = values[i] ?? 0;
    return this;
  }

  /** Vertex colour (sRGB hex) for buckets with a "color" attribute. */
  color(hex: THREE.ColorRepresentation, scale = 1): this {
    const c = new THREE.Color(hex);
    return this.set("color", [c.r * scale, c.g * scale, c.b * scale]);
  }

  /** Colour, roughness and metalness for buckets of an "uber" material (attributes color + aEdRM). */
  paint(hex: THREE.ColorRepresentation, roughness: number, metalness = 0): this {
    this.color(hex);
    return this.set("aEdRM", [roughness, metalness]);
  }

  get vertexCount(): number {
    return this.pos.length / 3;
  }

  /** Per-vertex hook (e.g. an attribute that follows the height); may call set(). */
  onVertex: ((p: Vec3) => void) | null = null;

  vertex(p: Vec3, n: Vec3, uv: readonly [number, number]): void {
    this.onVertex?.(p);
    this.pos.push(p[0], p[1], p[2]);
    this.nor.push(n[0], n[1], n[2]);
    this.uv.push(uv[0], uv[1]);
    for (const e of Object.values(this.ext)) for (let i = 0; i < e.size; i++) e.data.push(e.cur[i]);
  }

  /** Triangle with a per-vertex extra override hook (used by the window glass). */
  tri(a: Vec3, b: Vec3, c: Vec3, n: Vec3, ua: readonly [number, number], ub: readonly [number, number], uc: readonly [number, number]) {
    this.vertex(a, n, ua);
    this.vertex(b, n, ub);
    this.vertex(c, n, uc);
  }

  /** Quad p0 p1 p2 p3 (counter-clockwise seen from the normal side). */
  quad(p: [Vec3, Vec3, Vec3, Vec3], n: Vec3, uv: [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]]) {
    this.tri(p[0], p[1], p[2], n, uv[0], uv[1], uv[2]);
    this.tri(p[0], p[2], p[3], n, uv[0], uv[2], uv[3]);
  }

  /** Append another bucket's triangles (same attribute layout). */
  append(other: Bucket): void {
    // Loops, not spread: buckets can hold hundreds of thousands of values.
    const copy = (to: number[], from: readonly number[]) => {
      for (let i = 0; i < from.length; i++) to.push(from[i]);
    };
    copy(this.pos, other.pos);
    copy(this.nor, other.nor);
    copy(this.uv, other.uv);
    for (const [k, e] of Object.entries(this.ext)) {
      const o = other.ext[k];
      if (o) copy(e.data, o.data);
      else for (let i = 0; i < other.vertexCount * e.size; i++) e.data.push(0);
    }
  }

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    for (const [k, e] of Object.entries(this.ext)) g.setAttribute(k, new THREE.Float32BufferAttribute(e.data, e.size));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// ── Primitives ──────────────────────────────────────────────────────────────

export interface BoxFaces {
  px?: boolean;
  nx?: boolean;
  py?: boolean;
  ny?: boolean;
  pz?: boolean;
  nz?: boolean;
}

/**
 * Quad with an explicit facing: the corners may come in any rotation order
 * around the quad; the winding is fixed so the face points along `n`.
 */
export function quadN(
  b: Bucket,
  p: [Vec3, Vec3, Vec3, Vec3],
  n: Vec3,
  uv: [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]],
): void {
  const ab = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]];
  const ac = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
  const cx = ab[1] * ac[2] - ab[2] * ac[1];
  const cy = ab[2] * ac[0] - ab[0] * ac[2];
  const cz = ab[0] * ac[1] - ab[1] * ac[0];
  if (cx * n[0] + cy * n[1] + cz * n[2] >= 0) b.quad(p, n, uv);
  else b.quad([p[0], p[3], p[2], p[1]], n, [uv[0], uv[3], uv[2], uv[1]]);
}

/** Triangle with an explicit facing (winding fixed to face along n). */
export function triN(b: Bucket, a: Vec3, c: Vec3, d: Vec3, n: Vec3, ua: readonly [number, number], uc: readonly [number, number], ud: readonly [number, number]): void {
  const ab = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const ac = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
  const cx = ab[1] * ac[2] - ab[2] * ac[1];
  const cy = ab[2] * ac[0] - ab[0] * ac[2];
  const cz = ab[0] * ac[1] - ab[1] * ac[0];
  if (cx * n[0] + cy * n[1] + cz * n[2] >= 0) b.tri(a, c, d, n, ua, uc, ud);
  else b.tri(a, d, c, n, ua, ud, uc);
}

/** Unit normal of a planar polygon from its first three points (Newell would be safer for long thin quads). */
export function faceNormal(a: Vec3, c: Vec3, d: Vec3): Vec3 {
  const ab = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const ac = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
  const n: Vec3 = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

/** Axis-aligned box (E frame) with metre UVs; `faces` limits the emitted faces. */
export function box(b: Bucket, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, faces: BoxFaces = {}): void {
  const all = Object.keys(faces).length === 0;
  const on = (k: keyof BoxFaces) => all || faces[k] === true;
  if (on("px"))
    b.quad(
      [
        [x1, y0, z1],
        [x1, y0, z0],
        [x1, y1, z0],
        [x1, y1, z1],
      ],
      [1, 0, 0],
      [
        [-z1, y0],
        [-z0, y0],
        [-z0, y1],
        [-z1, y1],
      ],
    );
  if (on("nx"))
    b.quad(
      [
        [x0, y0, z0],
        [x0, y0, z1],
        [x0, y1, z1],
        [x0, y1, z0],
      ],
      [-1, 0, 0],
      [
        [z0, y0],
        [z1, y0],
        [z1, y1],
        [z0, y1],
      ],
    );
  if (on("pz"))
    b.quad(
      [
        [x0, y0, z1],
        [x1, y0, z1],
        [x1, y1, z1],
        [x0, y1, z1],
      ],
      [0, 0, 1],
      [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1],
      ],
    );
  if (on("nz"))
    b.quad(
      [
        [x1, y0, z0],
        [x0, y0, z0],
        [x0, y1, z0],
        [x1, y1, z0],
      ],
      [0, 0, -1],
      [
        [-x1, y0],
        [-x0, y0],
        [-x0, y1],
        [-x1, y1],
      ],
    );
  if (on("py"))
    b.quad(
      [
        [x0, y1, z1],
        [x1, y1, z1],
        [x1, y1, z0],
        [x0, y1, z0],
      ],
      [0, 1, 0],
      [
        [x0, z1],
        [x1, z1],
        [x1, z0],
        [x0, z0],
      ],
    );
  if (on("ny"))
    b.quad(
      [
        [x0, y0, z0],
        [x1, y0, z0],
        [x1, y0, z1],
        [x0, y0, z1],
      ],
      [0, -1, 0],
      [
        [x0, z0],
        [x1, z0],
        [x1, z1],
        [x0, z1],
      ],
    );
}

/** Box centred at (cx, cz) in plan, rotated by `ry` (radians, three.js rotation.y) — for furniture-like parts. */
export function orientedBox(
  b: Bucket,
  cx: number,
  y0: number,
  cz: number,
  w: number,
  h: number,
  d: number,
  ry: number,
): void {
  const c = Math.cos(ry);
  const s = Math.sin(ry);
  // Local x axis (w) and z axis (d) after rotation.y = ry.
  const ax: Vec3 = [c, 0, -s];
  const az: Vec3 = [s, 0, c];
  const corner = (sx: number, sy: number, sz: number): Vec3 => [
    cx + ax[0] * sx * (w / 2) + az[0] * sz * (d / 2),
    y0 + (sy > 0 ? h : 0),
    cz + ax[2] * sx * (w / 2) + az[2] * sz * (d / 2),
  ];
  const faces: [Vec3, [number, number, number][]][] = [
    [ax, [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]]],
    [[-ax[0], 0, -ax[2]], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]],
    [az, [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    [[-az[0], 0, -az[2]], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]],
    [[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]],
    [[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
  ];
  for (const [n, cs] of faces) {
    const p = cs.map(([a, bb, cc]) => corner(a, bb, cc)) as [Vec3, Vec3, Vec3, Vec3];
    const uvs = p.map((q) => (Math.abs(n[1]) > 0.5 ? ([q[0], q[2]] as const) : ([q[0] * n[2] - q[2] * n[0], q[1]] as const)));
    quadN(b, p, n, uvs as [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]]);
  }
}

/** Horizontal polygon at height y (plan ring in E), facing up or down. */
export function slab(b: Bucket, ring: readonly V2[], y: number, up = true, holes: readonly (readonly V2[])[] = []): void {
  const contour = ring.map(([x, z]) => new THREE.Vector2(x, z));
  const hs = holes.map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
  const tris = THREE.ShapeUtils.triangulateShape(contour, hs);
  const all = [...contour, ...hs.flat()];
  const n: Vec3 = up ? [0, 1, 0] : [0, -1, 0];
  for (const [i, j, k] of tris) {
    const a = all[i];
    const bb = all[j];
    const c = all[k];
    // Orientation: (x, z) with +z "down" — a triangle is CCW from above when its 2D cross product is negative.
    const cross = (bb.x - a.x) * (c.y - a.y) - (bb.y - a.y) * (c.x - a.x);
    const flip = up ? cross > 0 : cross < 0;
    const p = [a, flip ? c : bb, flip ? bb : c];
    b.tri(
      [p[0].x, y, p[0].y],
      [p[1].x, y, p[1].y],
      [p[2].x, y, p[2].y],
      n,
      [p[0].x, p[0].y],
      [p[1].x, p[1].y],
      [p[2].x, p[2].y],
    );
  }
}

/** Rectangle slab helper. */
export function rectSlab(b: Bucket, x0: number, x1: number, z0: number, z1: number, y: number, up = true): void {
  slab(
    b,
    [
      [x0, z0],
      [x0, z1],
      [x1, z1],
      [x1, z0],
    ],
    y,
    up,
  );
}

/**
 * A vertical wall plane along the plan segment a → b, with the normal on the
 * left of a→b seen from above ((−dz, dx) in x,z) when `outwardLeft`, else on
 * the right. The outline is given in wall coordinates (s along a→b from a,
 * y = y_E) and may have rectangular holes. UV: u = s (mirrored so it runs
 * left → right seen from the normal side), v = y.
 */
export function wallPlane(
  b: Bucket,
  a: V2,
  e: V2,
  outline: readonly V2[],
  holes: readonly (readonly V2[])[],
  normalLeft: boolean,
  uOffset = 0,
): void {
  const dx = e[0] - a[0];
  const dz = e[1] - a[1];
  const len = Math.hypot(dx, dz) || 1;
  const tx = dx / len;
  const tz = dz / len;
  // Left of the direction of travel seen from above (+y): (tz, −tx) for a frame with +z south.
  const nl: Vec3 = [tz, 0, -tx];
  const n: Vec3 = normalLeft ? nl : [-nl[0], 0, -nl[2]];
  const contour = outline.map(([s, y]) => new THREE.Vector2(s, y));
  const hs = holes.map((h) => h.map(([s, y]) => new THREE.Vector2(s, y)));
  const tris = THREE.ShapeUtils.triangulateShape(contour, hs);
  const all = [...contour, ...hs.flat()];
  // Seen from the normal side, "right" is +s when the normal is on the right of a→b... derive by cross product.
  // right = up × n  (y × n) = (n.z, 0, −n.x); u grows to the right when t·right > 0.
  const right: Vec3 = [n[2], 0, -n[0]];
  const sgn = tx * right[0] + tz * right[2] >= 0 ? 1 : -1;
  for (const [i, j, k] of tris) {
    const p = [all[i], all[j], all[k]];
    const P = p.map((q): Vec3 => [a[0] + tx * q.x, q.y, a[1] + tz * q.x]);
    // Winding: counter-clockwise seen from the normal side.
    const ab: Vec3 = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]];
    const ac: Vec3 = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
    const cr: Vec3 = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const facing = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2];
    const order = facing >= 0 ? [0, 1, 2] : [0, 2, 1];
    const uv = (q: THREE.Vector2) => [uOffset + sgn * q.x, q.y] as const;
    b.tri(P[order[0]], P[order[1]], P[order[2]], n, uv(p[order[0]]), uv(p[order[1]]), uv(p[order[2]]));
  }
}

/** Extruded plan polygon (prism) from y0 to y1: sides (outward), top and bottom caps. */
export function prism(
  b: Bucket,
  ring: readonly V2[],
  y0: number,
  y1: number,
  opts: { top?: boolean; bottom?: boolean; sides?: boolean } = {},
): void {
  const ccw = ringIsCCW(ring);
  if (opts.sides !== false) {
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i];
      const q = ring[(i + 1) % ring.length];
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (len < 1e-4) continue;
      wallPlane(
        b,
        p,
        q,
        [
          [0, y0],
          [len, y0],
          [len, y1],
          [0, y1],
        ],
        [],
        // CCW from above: the outside is on the right of p→q (+z south frame).
        !ccw,
      );
    }
  }
  if (opts.top !== false) slab(b, ring, y1, true);
  if (opts.bottom) slab(b, ring, y0, false);
}

/** True when a plan ring (x, z) runs counter-clockwise seen from above (+y). */
export function ringIsCCW(ring: readonly V2[]): boolean {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s < 0;
}

/** Vertical cylinder side (outward or inward), metre UVs (u = arc length, left → right seen from the normal side). */
export function cylinder(
  b: Bucket,
  cx: number,
  cz: number,
  r: number,
  y0: number,
  y1: number,
  segments: number,
  opts: { inward?: boolean; a0?: number; a1?: number } = {},
): void {
  const a0 = opts.a0 ?? 0;
  const a1 = opts.a1 ?? Math.PI * 2;
  for (let i = 0; i < segments; i++) {
    const t0 = a0 + ((a1 - a0) * i) / segments;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / segments;
    const tm = (t0 + t1) / 2;
    const at = (t: number, y: number): Vec3 => [cx + Math.cos(t) * r, y, cz + Math.sin(t) * r];
    // Increasing angle runs clockwise seen from above (+z is south).
    if (opts.inward)
      b.quad([at(t0, y0), at(t1, y0), at(t1, y1), at(t0, y1)], [-Math.cos(tm), 0, -Math.sin(tm)], [
        [r * t0, y0],
        [r * t1, y0],
        [r * t1, y1],
        [r * t0, y1],
      ]);
    else
      b.quad([at(t1, y0), at(t0, y0), at(t0, y1), at(t1, y1)], [Math.cos(tm), 0, Math.sin(tm)], [
        [-r * t1, y0],
        [-r * t0, y0],
        [-r * t0, y1],
        [-r * t1, y1],
      ]);
  }
}

/** Flat annulus (or disc when r0 = 0) at height y, facing up or down. */
export function ring(b: Bucket, cx: number, cz: number, r0: number, r1: number, y: number, segments: number, up = true, a0 = 0, a1 = Math.PI * 2): void {
  const n: Vec3 = up ? [0, 1, 0] : [0, -1, 0];
  for (let i = 0; i < segments; i++) {
    const t0 = a0 + ((a1 - a0) * i) / segments;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / segments;
    const P = (r: number, t: number): Vec3 => [cx + Math.cos(t) * r, y, cz + Math.sin(t) * r];
    const pts = [P(r0, t0), P(r1, t0), P(r1, t1), P(r0, t1)];
    const uvs = pts.map((p) => [p[0], p[2]] as const) as [readonly [number, number], readonly [number, number], readonly [number, number], readonly [number, number]];
    // In (x, z) with +z south, increasing angle t runs clockwise seen from above.
    if (up) b.quad([pts[0], pts[3], pts[2], pts[1]], n, [uvs[0], uvs[3], uvs[2], uvs[1]]);
    else b.quad(pts as [Vec3, Vec3, Vec3, Vec3], n, uvs);
  }
}

// ── Band splitting (dollhouse cuts) ─────────────────────────────────────────

/**
 * Split a non-indexed geometry into horizontal bands at the given cut heights
 * (ascending, local y): triangles crossing a cut are clipped and every
 * attribute interpolated, so each band can be shown or hidden on its own.
 * Returns one geometry per band (cuts.length + 1); empty bands are null.
 */
export function splitBands(geometry: THREE.BufferGeometry, cuts: readonly number[]): (THREE.BufferGeometry | null)[] {
  const names = Object.keys(geometry.attributes);
  const attrs = names.map((n) => geometry.getAttribute(n) as THREE.BufferAttribute);
  const sizes = attrs.map((a) => a.itemSize);
  const posIndex = names.indexOf("position");
  const pos = attrs[posIndex];
  const bands: number[][][] = Array.from({ length: cuts.length + 1 }, () => names.map(() => [] as number[]));
  const count = pos.count;
  const vert = (i: number): number[][] => attrs.map((a, k) => Array.from({ length: sizes[k] }, (_, c) => a.array[i * sizes[k] + c] as number));
  const lerpV = (p: number[][], q: number[][], t: number) => p.map((arr, k) => arr.map((v, c) => v + (q[k][c] - v) * t));
  const yOf = (v: number[][]) => v[posIndex][1];
  const bandOf = (y: number) => {
    let i = 0;
    while (i < cuts.length && y >= cuts[i]) i++;
    return i;
  };
  const pushVertex = (band: number, v: number[][]) => v.forEach((arr, k) => bands[band][k].push(...arr));
  for (let t = 0; t + 2 < count; t += 3) {
    const y0 = pos.getY(t);
    const y1 = pos.getY(t + 1);
    const y2 = pos.getY(t + 2);
    const lo = Math.min(y0, y1, y2);
    const hi = Math.max(y0, y1, y2);
    const bLo = bandOf(lo);
    // Fast path: the triangle lies in one band (touching a cut from below counts as below).
    if (bLo === bandOf(hi) || cuts.every((c) => !(c > lo && c < hi))) {
      const band = bandOf((lo + hi) / 2);
      for (let k = 0; k < 3; k++) pushVertex(band, vert(t + k));
      continue;
    }
    let polys: number[][][][] = [[vert(t), vert(t + 1), vert(t + 2)]];
    const out: { band: number; poly: number[][][] }[] = [];
    for (let c = 0; c < cuts.length; c++) {
      const next: number[][][][] = [];
      for (const poly of polys) {
        const below: number[][][] = [];
        const above: number[][][] = [];
        for (let i = 0; i < poly.length; i++) {
          const p = poly[i];
          const q = poly[(i + 1) % poly.length];
          const yp = yOf(p);
          const yq = yOf(q);
          const pb = yp < cuts[c];
          const qb = yq < cuts[c];
          if (pb) below.push(p);
          else above.push(p);
          if (pb !== qb) {
            const m = lerpV(p, q, (cuts[c] - yp) / (yq - yp));
            m[posIndex][1] = cuts[c];
            below.push(m);
            above.push(m);
          }
        }
        if (below.length >= 3) out.push({ band: c, poly: below });
        if (above.length >= 3) next.push(above);
      }
      polys = next;
    }
    for (const poly of polys) out.push({ band: cuts.length, poly });
    // Fan triangulation (clipped triangles stay convex).
    for (const { band, poly } of out) {
      for (let i = 1; i + 1 < poly.length; i++) {
        pushVertex(band, poly[0]);
        pushVertex(band, poly[i]);
        pushVertex(band, poly[i + 1]);
      }
    }
  }
  return bands.map((data) => {
    if (data[posIndex].length === 0) return null;
    const g = new THREE.BufferGeometry();
    names.forEach((n, k) => g.setAttribute(n, new THREE.Float32BufferAttribute(data[k], sizes[k])));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  });
}
