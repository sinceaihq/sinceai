import * as THREE from "three";
import type { V2 } from "../../types";

/**
 * Geometry accumulators and primitives for the context ring.
 *
 * Everything static is appended into a few big buffers (one draw call per
 * material): FacadeBuilder for procedural facades (render/facade.ts
 * attributes + the per-vertex wall tint), MeshBuilder for roofs, trims and
 * details (position, normal, metre UV, linear vertex colour). Primitives
 * write metre UVs so library textures tile at real scale.
 */

type Vec3 = [number, number, number];

/** Growable Float32 buffer. */
class Buf {
  data: Float32Array;
  length = 0;
  constructor(initial = 1024) {
    this.data = new Float32Array(initial);
  }
  push(...v: number[]) {
    if (this.length + v.length > this.data.length) {
      const next = new Float32Array(Math.max(this.data.length * 2, this.length + v.length));
      next.set(this.data.subarray(0, this.length));
      this.data = next;
    }
    for (let i = 0; i < v.length; i++) this.data[this.length++] = v[i];
  }
  view(): Float32Array {
    return this.data.slice(0, this.length);
  }
}

class IndexBuf {
  data: number[] = [];
  push(...v: number[]) {
    for (const x of v) this.data.push(x);
  }
}

// ── Facade walls ─────────────────────────────────────────────────────────────

export interface FacadeVertex {
  x: number;
  y: number;
  z: number;
  /** Metres along the wall (continuous round the building). */
  u: number;
  /** Facade v (storey-scaled height above the reference). */
  v: number;
  /** Metric height above the reference (texture v). */
  vt: number;
  /** Facade top (scaled) and local ground (scaled), relative to the reference. */
  top: number;
  ground: number;
}

/** Walls carrying the procedural-facade attributes (render/facade.ts) + `ctxTint`. */
export class FacadeBuilder {
  private pos = new Buf();
  private nor = new Buf();
  private uv = new Buf();
  private fac = new Buf();
  private gnd = new Buf();
  private tint = new Buf();
  private idx = new IndexBuf();
  private count = 0;

  get vertexCount(): number {
    return this.count;
  }

  /** One wall quad: bottom-left, bottom-right, top-right, top-left seen from outside. */
  quad(v: [FacadeVertex, FacadeVertex, FacadeVertex, FacadeVertex], normal: V2, seed: number, tint: Vec3) {
    const base = this.count;
    for (const p of v) {
      this.pos.push(p.x, p.y, p.z);
      this.nor.push(normal[0], 0, normal[1]);
      this.uv.push(p.u, p.vt);
      this.fac.push(p.u, p.v, seed, p.top);
      this.gnd.push(p.ground);
      this.tint.push(tint[0], tint[1], tint[2]);
    }
    this.count += 4;
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  build(): THREE.BufferGeometry | null {
    if (!this.count) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos.view(), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(this.nor.view(), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(this.uv.view(), 2));
    g.setAttribute("facade", new THREE.BufferAttribute(this.fac.view(), 4));
    g.setAttribute("facadeGround", new THREE.BufferAttribute(this.gnd.view(), 1));
    g.setAttribute("ctxTint", new THREE.BufferAttribute(this.tint.view(), 3));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.idx.data, 1) : new THREE.Uint16BufferAttribute(this.idx.data, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// ── Generic meshes ───────────────────────────────────────────────────────────

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m3 = new THREE.Matrix3();

/** Position, normal, metre UV and linear vertex colour; appended from primitives or any geometry. */
export class MeshBuilder {
  private pos = new Buf();
  private nor = new Buf();
  private uv = new Buf();
  private col = new Buf();
  private idx = new IndexBuf();
  private count = 0;

  get vertexCount(): number {
    return this.count;
  }

  /** Append a geometry (indexed or not) transformed by `matrix`, coloured `color` (linear rgb). */
  add(geo: THREE.BufferGeometry, color: Vec3, matrix?: THREE.Matrix4, uvMode: "keep" | "box" = "keep") {
    const p = geo.getAttribute("position");
    if (!geo.getAttribute("normal")) geo.computeVertexNormals();
    const n = geo.getAttribute("normal");
    const t = geo.getAttribute("uv");
    if (matrix) _m3.getNormalMatrix(matrix);
    const base = this.count;
    for (let i = 0; i < p.count; i++) {
      _v.set(p.getX(i), p.getY(i), p.getZ(i));
      _n.set(n.getX(i), n.getY(i), n.getZ(i));
      if (matrix) {
        _v.applyMatrix4(matrix);
        _n.applyMatrix3(_m3).normalize();
      }
      this.pos.push(_v.x, _v.y, _v.z);
      this.nor.push(_n.x, _n.y, _n.z);
      if (uvMode === "box" || !t) {
        const [u, vv] = boxUv(_v, _n);
        this.uv.push(u, vv);
      } else this.uv.push(t.getX(i), t.getY(i));
      this.col.push(color[0], color[1], color[2]);
    }
    const index = geo.getIndex();
    if (index) for (let i = 0; i < index.count; i++) this.idx.push(base + index.getX(i));
    else for (let i = 0; i < p.count; i++) this.idx.push(base + i);
    this.count += p.count;
  }

  /** A planar quad (CCW seen from the side the normal points to). */
  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, color: Vec3, uv?: [V2, V2, V2, V2]) {
    const e1 = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const e2 = new THREE.Vector3(d[0] - a[0], d[1] - a[1], d[2] - a[2]);
    const nn = new THREE.Vector3().crossVectors(e1, e2).normalize();
    const base = this.count;
    const pts = [a, b, c, d];
    pts.forEach((p, i) => {
      this.pos.push(p[0], p[1], p[2]);
      this.nor.push(nn.x, nn.y, nn.z);
      if (uv) this.uv.push(uv[i][0], uv[i][1]);
      else {
        const [u, vv] = boxUv(_v.set(p[0], p[1], p[2]), _n.copy(nn));
        this.uv.push(u, vv);
      }
      this.col.push(color[0], color[1], color[2]);
    });
    this.count += 4;
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  /** Raw triangles with per-vertex normals (shared vertices). */
  raw(positions: number[], normals: number[], uvs: number[], indices: number[], color: Vec3) {
    const base = this.count;
    const n = positions.length / 3;
    for (let i = 0; i < n; i++) {
      this.pos.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      this.nor.push(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
      this.uv.push(uvs[i * 2] ?? 0, uvs[i * 2 + 1] ?? 0);
      this.col.push(color[0], color[1], color[2]);
    }
    for (const i of indices) this.idx.push(base + i);
    this.count += n;
  }

  build(): THREE.BufferGeometry | null {
    if (!this.count) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(this.pos.view(), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(this.nor.view(), 3));
    g.setAttribute("uv", new THREE.BufferAttribute(this.uv.view(), 2));
    g.setAttribute("color", new THREE.BufferAttribute(this.col.view(), 3));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.idx.data, 1) : new THREE.Uint16BufferAttribute(this.idx.data, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** Box projection UV (metres) for one vertex — as render/uv.ts boxUV. */
function boxUv(p: THREE.Vector3, n: THREE.Vector3): [number, number] {
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);
  if (ay >= ax && ay >= az) return [p.x, n.y >= 0 ? -p.z : p.z];
  if (ax >= az) return [n.x >= 0 ? -p.z : p.z, p.y];
  return [n.z >= 0 ? p.x : -p.x, p.y];
}

// ── Primitives ───────────────────────────────────────────────────────────────

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _e = new THREE.Euler();
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL_CACHE = new Map<string, THREE.CylinderGeometry>();

function cylinder(segments: number, open: boolean): THREE.CylinderGeometry {
  const key = `${segments}:${open}`;
  let g = CYL_CACHE.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(1, 1, 1, segments, 1, open);
    CYL_CACHE.set(key, g);
  }
  return g;
}

/** Linear colour from sRGB hex. */
export function lin(hex: string): Vec3 {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

/** Box centred at (x, y, z) with size (w along local x, h, d along local z), turned by yaw (rad, three.js rotation.y). */
export function box(mb: MeshBuilder, x: number, y: number, z: number, w: number, h: number, d: number, yaw: number, color: Vec3) {
  _e.set(0, yaw, 0);
  _q.setFromEuler(_e);
  _m.compose(_p.set(x, y, z), _q, _s.set(w, h, d));
  mb.add(UNIT_BOX, color, _m, "box");
}

/** Box spanning a→b on the ground plane (centre line), width w, from y0 to y1. */
export function beam(mb: MeshBuilder, a: V2, b: V2, w: number, y0: number, y1: number, color: Vec3) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  if (len < 1e-3) return;
  const yaw = -Math.atan2(dz, dx);
  box(mb, (a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2, len, y1 - y0, w, yaw, color);
}

/** Vertical cylinder (radius r) from y0 to y1. */
export function column(mb: MeshBuilder, x: number, z: number, r: number, y0: number, y1: number, color: Vec3, segments = 10, open = true) {
  _m.compose(_p.set(x, (y0 + y1) / 2, z), _q.identity(), _s.set(r, y1 - y0, r));
  mb.add(cylinder(segments, open), color, _m, "box");
}

/** Cylinder between two 3D points (ducts, pipes, rails). */
export function pipe(mb: MeshBuilder, a: Vec3, b: Vec3, r: number, color: Vec3, segments = 8, open = true) {
  const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = dir.length();
  if (len < 1e-3) return;
  dir.normalize();
  _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  _m.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _s.set(r, len, r));
  mb.add(cylinder(segments, open), color, _m, "box");
}

/** Horizontal disc (fan face, light lens) facing up (or down). */
export function disc(mb: MeshBuilder, x: number, y: number, z: number, r: number, color: Vec3, down = false, segments = 12) {
  const positions: number[] = [x, y, z];
  const normals: number[] = [0, down ? -1 : 1, 0];
  const uvs: number[] = [x, -z];
  const idx: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    positions.push(px, y, pz);
    normals.push(0, down ? -1 : 1, 0);
    uvs.push(px, -pz);
    if (i > 0) {
      if (down) idx.push(0, i, i + 1);
      else idx.push(0, i + 1, i);
    }
  }
  mb.raw(positions, normals, uvs, idx, color);
}

/** Extruded prism of a ring (walls + top cap; optional bottom cap). */
export function prism(mb: MeshBuilder, ring: readonly V2[], y0: number, y1: number, color: Vec3, opts: { top?: boolean; bottom?: boolean } = {}) {
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    // Outward for CCW rings (seen from above): bottom-left a, bottom-right b.
    mb.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], color);
  }
  if (opts.top !== false) capRing(mb, ring, y1, color, false);
  if (opts.bottom) capRing(mb, ring, y0, color, true);
}

/** Flat cap of a ring (earcut), facing up or down, plan UVs. */
export function capRing(mb: MeshBuilder, ring: readonly V2[], y: number, color: Vec3, down: boolean) {
  const contour = ring.map(([x, z]) => new THREE.Vector2(x, -z));
  const faces = THREE.ShapeUtils.triangulateShape(contour, []);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  for (const [x, z] of ring) {
    positions.push(x, y, z);
    normals.push(0, down ? -1 : 1, 0);
    uvs.push(x, -z);
  }
  const idx: number[] = [];
  for (const [a, b, c] of faces) {
    const ax = ring[a][0], az = ring[a][1];
    const bx = ring[b][0], bz = ring[b][1];
    const cx = ring[c][0], cz = ring[c][1];
    // y of the face normal (b − a) × (c − a) = (b−a).z·(c−a).x − (b−a).x·(c−a).z.
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const up = ny > 0;
    if (up !== down) idx.push(a, b, c);
    else idx.push(a, c, b);
  }
  mb.raw(positions, normals, uvs, idx, color);
}

/** A thin vertical panel between a and b (both faces), e.g. signs, railings infill. */
export function panel(mb: MeshBuilder, a: V2, b: V2, y0: number, y1: number, color: Vec3, thickness = 0.04) {
  beam(mb, a, b, thickness, y0, y1, color);
}

/** Railing along a polyline: posts every `pitch` m and a top rail (metal). */
export function railing(mb: MeshBuilder, line: readonly V2[], y: number | ((x: number, z: number) => number), h: number, color: Vec3, pitch = 1.5) {
  const yAt = (x: number, z: number) => (typeof y === "number" ? y : y(x, z));
  for (let i = 0; i + 1 < line.length; i++) {
    const a = line[i];
    const b = line[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / pitch));
    for (let k = 0; k <= n; k++) {
      if (k === 0 && i > 0) continue;
      const t = k / n;
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      const y0 = yAt(x, z);
      box(mb, x, y0 + h / 2, z, 0.05, h, 0.05, 0, color);
    }
    const ya = yAt(a[0], a[1]);
    const yb = yAt(b[0], b[1]);
    pipe(mb, [a[0], ya + h, a[1]], [b[0], yb + h, b[1]], 0.025, color, 6);
    pipe(mb, [a[0], ya + h * 0.5, a[1]], [b[0], yb + h * 0.5, b[1]], 0.012, color, 4);
  }
}

/** Free shared primitive geometries (module dispose). */
export function disposeKit() {
  // Cached primitives are tiny and shared between rebuilds; keep them for the page's lifetime.
}
