import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { V2 } from "../../types";
import { boxUV } from "../../render/uv";
import { cleanRing, ensureCCW, ringArea } from "../../util";

/**
 * Geometry helpers for the BioCity module: metre-UV primitives in plan frame
 * B, facade runs with the attributes render/facade.ts expects, and Buckets —
 * geometry collected per (layer, material) and merged into one mesh each, so
 * the whole building stays within its draw-call budget (DESIGN §5).
 */

// ── Buckets ──────────────────────────────────────────────────────────────────

/**
 * Layers of the building:
 * - shell: exterior up to the dollhouse cut (always visible)
 * - upper: exterior above the cut, roofs, vault (hidden in the dollhouse)
 * - ceiling: ground-floor ceilings and soffits seen from inside (hidden in the dollhouse)
 * - interior: ground-floor fit-out, furniture, signs (switched by setInterior)
 * - interiorUpper: interior parts above the cut (lift towers, bridges, upper atrium walls)
 */
export type Layer = "shell" | "upper" | "ceiling" | "interior" | "interiorUpper";
export const LAYERS: Layer[] = ["shell", "upper", "ceiling", "interior", "interiorUpper"];

export interface BucketOptions {
  castShadow?: boolean;
  receiveShadow?: boolean;
  renderOrder?: number;
  /** Do not cull when the camera is inside the merged bounds (large shells). */
  frustumCulled?: boolean;
}

export class Buckets {
  private parts = new Map<string, THREE.BufferGeometry[]>();

  add(layer: Layer, key: string, ...geos: THREE.BufferGeometry[]) {
    const k = `${layer}|${key}`;
    let list = this.parts.get(k);
    if (!list) {
      list = [];
      this.parts.set(k, list);
    }
    for (const g of geos) list.push(g);
  }

  /**
   * Re-key buckets: geometry of a material key in `map` joins its target key (one draw call
   * instead of two for near-identical surfaces). Only for solid geometry (position/normal/uv).
   */
  alias(map: Readonly<Record<string, string>>) {
    for (const [k, list] of [...this.parts]) {
      const bar = k.indexOf("|");
      const layer = k.slice(0, bar) as Layer;
      const key = k.slice(bar + 1);
      const to = map[key];
      if (!to || to === key) continue;
      this.parts.delete(k);
      this.add(layer, to, ...list);
    }
  }

  /** Triangles per "layer|material" bucket (for budgets and tests). */
  stats(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, list] of this.parts) {
      let t = 0;
      for (const g of list) t += (g.index ? g.index.count : g.getAttribute("position").count) / 3;
      out[k] = Math.round(t);
    }
    return out;
  }

  /** Merge every bucket into one mesh per (layer, material); inputs are disposed. */
  build(
    groups: Record<Layer, THREE.Group>,
    materials: Record<string, THREE.Material>,
    options: Record<string, BucketOptions> = {},
  ): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const [k, list] of this.parts) {
      if (!list.length) continue;
      const [layer, key] = k.split("|") as [Layer, string];
      const material = materials[key];
      if (!material) throw new Error(`biocity: no material "${key}"`);
      const geo = mergeAll(list);
      const mesh = new THREE.Mesh(geo, material);
      mesh.name = `biocity-${layer}-${key}`;
      const o = options[key] ?? {};
      mesh.castShadow = o.castShadow ?? false;
      mesh.receiveShadow = o.receiveShadow ?? true;
      if (o.renderOrder !== undefined) mesh.renderOrder = o.renderOrder;
      if (o.frustumCulled !== undefined) mesh.frustumCulled = o.frustumCulled;
      groups[layer].add(mesh);
      meshes.push(mesh);
    }
    this.parts.clear();
    return meshes;
  }
}

/** Merge geometries with the same attribute set (non-indexed → indexed as needed); disposes the inputs. */
export function mergeAll(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const indexed = list.map((g) => (g.index ? g : toIndexed(g)));
  const merged = mergeGeometries(indexed, false);
  if (!merged) {
    const names = indexed.map((g) => Object.keys(g.attributes).sort().join(",")).join(" | ");
    throw new Error(`biocity: cannot merge geometries (${names.slice(0, 200)})`);
  }
  for (const g of list) g.dispose();
  for (const g of indexed) if (!list.includes(g)) g.dispose();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

function toIndexed(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const n = g.getAttribute("position").count;
  const idx = new Array<number>(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  const out = g.clone();
  out.setIndex(idx);
  return out;
}

// ── Primitives (metre UVs) ───────────────────────────────────────────────────

/** Axis-aligned box from (x0, y0, z0) to (x1, y1, z1). */
export function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): THREE.BufferGeometry {
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  const d = Math.abs(z1 - z0);
  const g = new THREE.BoxGeometry(Math.max(w, 1e-3), Math.max(h, 1e-3), Math.max(d, 1e-3));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return boxUV(g);
}

/**
 * Box along a plan segment a→b (length = |ab| + extend·2), `width` across it
 * (centred on the line, or offset by `offset` along the outward normal), from y0 to y1.
 */
export function segmentBox(a: V2, b: V2, width: number, y0: number, y1: number, opts: { offset?: number; extend?: number } = {}): THREE.BufferGeometry {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const ext = opts.extend ?? 0;
  const g = new THREE.BoxGeometry(len + 2 * ext, Math.max(y1 - y0, 1e-3), width);
  const ux = dx / len;
  const uz = dz / len;
  // Outward normal of a run a→b: (−dz, dx).
  const nx = -uz;
  const nz = ux;
  const off = opts.offset ?? 0;
  g.rotateY(-Math.atan2(dz, dx));
  g.translate((a[0] + b[0]) / 2 + nx * off, (y0 + y1) / 2, (a[1] + b[1]) / 2 + nz * off);
  return boxUV(g);
}

/** Vertical cylinder at (x, z) from y0 to y1. */
export function cylinder(x: number, z: number, r: number, y0: number, y1: number, segments = 16, openEnded = false): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, segments, 1, openEnded);
  g.translate(x, (y0 + y1) / 2, z);
  return boxUV(g);
}

/** Elliptic (oval) column: radii rx, rz. */
export function ovalColumn(x: number, z: number, rx: number, rz: number, y0: number, y1: number, segments = 20): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(1, 1, y1 - y0, segments, 1, false);
  g.scale(rx, 1, rz);
  g.translate(x, (y0 + y1) / 2, z);
  g.computeVertexNormals();
  return boxUV(g);
}

/** Tube between two 3D points. */
export function rod(a: THREE.Vector3Like, b: THREE.Vector3Like, r: number, segments = 6): THREE.BufferGeometry {
  const pa = new THREE.Vector3(a.x, a.y, a.z);
  const pb = new THREE.Vector3(b.x, b.y, b.z);
  const dir = pb.clone().sub(pa);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, segments, 1, true);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate(pa.x, pa.y, pa.z);
  return boxUV(g);
}

/** Bar (square section) between two 3D points. */
export function bar(a: THREE.Vector3Like, b: THREE.Vector3Like, w: number, h = w): THREE.BufferGeometry {
  const pa = new THREE.Vector3(a.x, a.y, a.z);
  const pb = new THREE.Vector3(b.x, b.y, b.z);
  const dir = pb.clone().sub(pa);
  const len = dir.length();
  const g = new THREE.BoxGeometry(w, len, h);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate(pa.x, pa.y, pa.z);
  return boxUV(g);
}

/**
 * Vertical quad along a→b from y0 to y1 facing the outward normal (−dz, dx);
 * u = metres along the run, v = height. `doubleSided` adds the back face.
 */
export function wallQuad(a: V2, b: V2, y0: number, y1: number, opts: { doubleSided?: boolean; uOffset?: number } = {}): THREE.BufferGeometry {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = -(b[1] - a[1]) / len;
  const nz = (b[0] - a[0]) / len;
  const u0 = opts.uOffset ?? 0;
  const pos = [a[0], y0, a[1], b[0], y0, b[1], b[0], y1, b[1], a[0], y1, a[1]];
  const nor = [nx, 0, nz, nx, 0, nz, nx, 0, nz, nx, 0, nz];
  const uv = [u0, y0, u0 + len, y0, u0 + len, y1, u0, y1];
  const idx = [0, 1, 2, 0, 2, 3];
  if (opts.doubleSided) {
    pos.push(b[0], y0, b[1], a[0], y0, a[1], a[0], y1, a[1], b[0], y1, b[1]);
    nor.push(-nx, 0, -nz, -nx, 0, -nz, -nx, 0, -nz, -nx, 0, -nz);
    uv.push(u0, y0, u0 + len, y0, u0 + len, y1, u0, y1);
    idx.push(4, 5, 6, 4, 6, 7);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Walls along an open polyline (quads per segment), facing (−dz, dx) of each segment. */
export function polylineWall(points: V2[], y0: number, y1: number | ((i: number) => number), opts: { doubleSided?: boolean } = {}): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  let u = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const top = typeof y1 === "number" ? y1 : y1(i);
    parts.push(wallQuad(points[i], points[i + 1], y0, top, { doubleSided: opts.doubleSided, uOffset: u }));
    u += Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
  }
  return mergeAll(parts);
}

/** Flat polygon (with holes) at height y facing up (or down), plan metre UVs (u = x, v = −z). */
export function flatPolygon(ring: V2[], y: number, opts: { holes?: V2[][]; down?: boolean } = {}): THREE.BufferGeometry {
  const outer = ensureCCW(cleanRing(ring));
  const holes = (opts.holes ?? []).map((h) => cleanRing(h)).filter((h) => h.length >= 3);
  const contour = outer.map(([x, z]) => new THREE.Vector2(x, -z));
  const holeVs = holes.map((h) => (ringArea(h) > 0 ? h.slice().reverse() : h).map(([x, z]) => new THREE.Vector2(x, -z)));
  const faces = THREE.ShapeUtils.triangulateShape(contour, holeVs);
  const all = [...contour, ...holeVs.flat()];
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  const ny = opts.down ? -1 : 1;
  for (const v of all) {
    pos.push(v.x, y, -v.y);
    uv.push(v.x, v.y);
    nor.push(0, ny, 0);
  }
  const idx: number[] = [];
  for (const [a, b, c] of faces) {
    // Triangulated CCW in (x, −z) → in three.js space that faces +y; flip for down.
    if (opts.down) idx.push(a, c, b);
    else idx.push(a, b, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  // Make sure the winding matches the normal.
  g.computeVertexNormals();
  const n = g.getAttribute("normal");
  if (n.count && Math.sign(n.getY(0)) !== ny) {
    const arr = g.getIndex()!.array as Uint16Array | Uint32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const t = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = t;
    }
    g.getIndex()!.needsUpdate = true;
    g.computeVertexNormals();
  }
  return g;
}

/** Closed prism of a polygon from y0 to y1 (sides + optional caps), metre UVs. */
export function prism(ring: V2[], y0: number, y1: number, opts: { top?: boolean; bottom?: boolean } = {}): THREE.BufferGeometry {
  const outer = ensureCCW(cleanRing(ring));
  const parts: THREE.BufferGeometry[] = [];
  // Rings counter-clockwise from above: each wall a→b faces outwards with (−dz, dx).
  parts.push(polylineWall([...outer, outer[0]], y0, y1));
  if (opts.top !== false) parts.push(flatPolygon(outer, y1));
  if (opts.bottom) parts.push(flatPolygon(outer, y0, { down: true }));
  return mergeAll(parts);
}

// ── Facade runs (render/facade.ts attribute layout) ──────────────────────────

export interface FacadeRunOptions {
  /** v = 0 level (storeys count from here). */
  vRef: number;
  /** Top of the wall for the shader's coping/top-edge logic (default y1). */
  top?: number;
  /** Ground under the wall for the shader (no windows below; default y0). */
  ground?: number | ((x: number, z: number) => number);
  /** Seed 0…1 for window randomness. */
  seed?: number;
  /** u at the start of the run (continuing a rhythm). */
  uOffset?: number;
  /** Stretch u so the run is a whole number of bays of about this width (mullions on the corners). */
  fitBay?: number;
}

/**
 * Facade walls along an open polyline from y0 to y1 with the attributes of
 * render/facade.ts (uv, facade = (u, v, seed, top), facadeGround). Each
 * segment faces (−dz, dx) — list points left → right as seen from outside.
 * Returns the geometry and the u at the end (to continue another run).
 */
export function facadeRun(points: V2[], y0: number, y1: number, o: FacadeRunOptions): { geometry: THREE.BufferGeometry; uEnd: number } {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const facade: number[] = [];
  const ground: number[] = [];
  const index: number[] = [];
  const seed = o.seed ?? 0.37;
  const top = (o.top ?? y1) - o.vRef;
  let u = o.uOffset ?? 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 1e-3) continue;
    let ulen = len;
    if (o.fitBay) {
      const n = Math.max(1, Math.round(len / o.fitBay));
      ulen = n * o.fitBay;
    }
    const nx = -dz / len;
    const nz = dx / len;
    const g0 = typeof o.ground === "function" ? o.ground(a[0], a[1]) : (o.ground ?? y0);
    const g1 = typeof o.ground === "function" ? o.ground(b[0], b[1]) : (o.ground ?? y0);
    const base = positions.length / 3;
    const verts: [number, number, number, number, number][] = [
      [a[0], y0, a[1], u, g0],
      [b[0], y0, b[1], u + ulen, g1],
      [b[0], y1, b[1], u + ulen, g1],
      [a[0], y1, a[1], u, g0],
    ];
    for (const [x, y, z, uu, g] of verts) {
      positions.push(x, y, z);
      normals.push(nx, 0, nz);
      uvs.push(uu, y - o.vRef);
      facade.push(uu, y - o.vRef, seed, top);
      ground.push(g - o.vRef);
    }
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    u += ulen;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("facade", new THREE.Float32BufferAttribute(facade, 4));
  geo.setAttribute("facadeGround", new THREE.Float32BufferAttribute(ground, 1));
  geo.setIndex(index);
  return { geometry: geo, uEnd: u };
}

/** Split a facade run at a height (the dollhouse cut) into the part below and above. */
export function facadeRunSplit(
  points: V2[],
  y0: number,
  y1: number,
  cut: number,
  o: FacadeRunOptions,
): { below: THREE.BufferGeometry | null; above: THREE.BufferGeometry | null; uEnd: number } {
  const top = o.top ?? y1;
  if (y1 <= cut) {
    const r = facadeRun(points, y0, y1, { ...o, top });
    return { below: r.geometry, above: null, uEnd: r.uEnd };
  }
  if (y0 >= cut) {
    const r = facadeRun(points, y0, y1, { ...o, top });
    return { below: null, above: r.geometry, uEnd: r.uEnd };
  }
  const lo = facadeRun(points, y0, cut, { ...o, top });
  const hi = facadeRun(points, cut, y1, { ...o, top });
  return { below: lo.geometry, above: hi.geometry, uEnd: hi.uEnd };
}

