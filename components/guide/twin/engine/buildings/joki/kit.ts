import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { V2, V3 } from "../../types";
import { PLAN_FRAMES, localToPlan, planToLocal } from "../../frame";

/**
 * Shared kit for the Joki modules (joki.ts, showroom.ts, jokiTower.ts):
 * the J plan frame, levels and radii from SPEC §3.2 / §7.2–7.3, pure
 * geometry maths (unit-tested), metre-UV geometry builders, a merge-by-
 * material batcher and the shader patches the interiors need.
 *
 * Everything inside Joki is modelled in the J plan frame (origin = tower
 * centre, plan up −z = compass 38.781°), in a group placed with
 * planGroupTransform(J); y is the campus height (y = N2000 − 23.20).
 */

export const J = PLAN_FRAMES.J;
export const DEG = Math.PI / 180;

/** Campus heights (SPEC §3.2.1, §7.0). */
export const Y = {
  street: -1.9,
  serviceYard: -3.0,
  aula: -1.7,
  f1: -1.1,
  aulaCeil: 1.4,
  showroomCeil: 2.3,
  f1Soffit: 2.55,
  pihakansi: 0.5,
  deck: 2.35,
  hallRoof: 2.87,
  hallEdge: 3.22,
  f2: 2.9,
  f2Ceil: 6.4,
  f3Soffit: 6.55,
  f3: 6.9,
  f3Ceil: 9.9,
  roof: 10.9,
  parapet: 11.4,
  finBottom: 3.1,
  finTop: 11.9,
} as const;

/** Tower radii (m, from the tower centre). */
export const R = {
  drumIn: 8.62,
  drumOut: 9.19,
  glassIn: 9.15,
  glassOut: 9.23,
  column: 8.8,
  finIn: 10.09,
  finOut: 10.18,
  postIn: 10.07,
  postOut: 10.2,
  led: 8.45,
} as const;

/** J plan → campus [x, z]. */
export const jl = (x: number, z: number): V2 => planToLocal(J, x, z);
/** Campus → J plan [x, z]. */
export const lj = (x: number, z: number): V2 => localToPlan(J, x, z);
/** J plan point at a height → campus V3. */
export const jv3 = (x: number, y: number, z: number): V3 => {
  const [lx, lz] = jl(x, z);
  return [round2(lx), round2(y), round2(lz)];
};
export const round2 = (v: number) => Math.round(v * 100) / 100;

/** Point at radius r and J-bearing b (clockwise from plan up, −z). */
export function polar(r: number, bearingDeg: number): V2 {
  const b = bearingDeg * DEG;
  return [r * Math.sin(b), -r * Math.cos(b)];
}

/** J-bearing (0…360) of a plan point seen from the tower centre. */
export function bearingOf(x: number, z: number): number {
  return ((Math.atan2(x, -z) / DEG) % 360 + 360) % 360;
}

/** Smallest angle between two bearings (degrees, 0…180). */
export function angleBetween(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return d;
}

/** rotation.y that turns a model whose front is +z to face J-bearing b (in the J group). */
export function yawToBearing(bearingDeg: number): number {
  const [x, z] = polar(1, bearingDeg);
  return Math.atan2(x, z);
}

/** rotation.y for a model (front +z) at (x, z) facing the point (tx, tz). */
export function yawTowards(x: number, z: number, tx: number, tz: number): number {
  return Math.atan2(tx - x, tz - z);
}

// ── Fin screen (SPEC §3.2.2) ─────────────────────────────────────────────────

/** 448 elements: 384 flat fins + 64 posts (every 7th, on the mullion lines). */
export const FIN_COUNT = 448;
export const FIN_PITCH = 360 / FIN_COUNT;
/** Mullions (and posts) at J −33.53° + k·5.625°. */
export const MULLION_START = -33.53;
export const FACETS = 64;
export const FACET_DEG = 360 / FACETS;

/** "Smile" cut-outs in the fin bottom edge: centre J-bearing, half-width, apex height. */
export const FIN_CUTOUTS: readonly { centre: number; half: number; apex: number }[] = [
  // Over the floor-2 north-east door (compass 39.3°).
  { centre: 0.5, half: 55, apex: 5.8 },
  // Round the south-south-west door / roof walkway (compass ≈ 212°).
  { centre: 173.2, half: 55, apex: 5.8 },
];
/** Floor-3 south-east door to the external stair (compass 129.3°): the screen opens there. */
export const F3_DOOR_BEARING = 90.5;
export const F3_DOOR_HALF = 5.6;

/** Bottom of a fin at J-bearing b: 0.2 m above floor 2, rising to the apex over the doors (cosine profile). */
export function finBottom(bearingDeg: number): number {
  let y: number = Y.finBottom;
  for (const c of FIN_CUTOUTS) {
    const d = angleBetween(bearingDeg, c.centre);
    if (d < c.half) y = Math.max(y, Y.finBottom + (c.apex - Y.finBottom) * Math.cos((Math.PI / 2) * (d / c.half)));
  }
  return y;
}

export interface FinSpan {
  bearing: number;
  post: boolean;
  /** Vertical pieces [bottom, top]; the floor-3 door splits a fin in two. */
  pieces: [number, number][];
}

/** All 448 fin elements with their vertical extents (pure; unit-tested). */
export function finLayout(): FinSpan[] {
  const out: FinSpan[] = [];
  for (let i = 0; i < FIN_COUNT; i++) {
    const bearing = (((MULLION_START + i * FIN_PITCH) % 360) + 360) % 360;
    const post = i % 7 === 0;
    const bottom = finBottom(bearing);
    const pieces: [number, number][] =
      angleBetween(bearing, F3_DOOR_BEARING) < F3_DOOR_HALF
        ? [
            [bottom, 5.9],
            [9.45, Y.finTop],
          ]
        : [[bottom, Y.finTop]];
    out.push({ bearing, post, pieces });
  }
  return out;
}

// ── Geometry (metre UVs) ─────────────────────────────────────────────────────

/** Ensure an index and exactly the attributes position/normal/uv (+ optional extras). */
export function normalise(g: THREE.BufferGeometry, keep: readonly string[] = []): THREE.BufferGeometry {
  if (!g.index) {
    const n = g.getAttribute("position").count;
    const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
    for (let i = 0; i < n; i++) idx[i] = i;
    g.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  if (!g.getAttribute("uv")) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute("position").count * 2), 2));
  for (const name of Object.keys(g.attributes)) {
    if (name === "position" || name === "normal" || name === "uv" || keep.includes(name)) continue;
    g.deleteAttribute(name);
  }
  g.morphAttributes = {};
  g.clearGroups();
  return g;
}

/** Box-projected metre UVs on any geometry (dominant normal axis; tops in plan). */
export function metreUV(g: THREE.BufferGeometry, scale = 1): THREE.BufferGeometry {
  const pos = g.getAttribute("position");
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  const nor = g.getAttribute("normal");
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) * scale;
    const y = pos.getY(i) * scale;
    const z = pos.getZ(i) * scale;
    const ax = Math.abs(nor.getX(i));
    const ay = Math.abs(nor.getY(i));
    const az = Math.abs(nor.getZ(i));
    if (ay >= ax && ay >= az) {
      uv[i * 2] = x;
      uv[i * 2 + 1] = -z;
    } else if (ax >= az) {
      uv[i * 2] = nor.getX(i) >= 0 ? -z : z;
      uv[i * 2 + 1] = y;
    } else {
      uv[i * 2] = nor.getZ(i) >= 0 ? x : -x;
      uv[i * 2 + 1] = y;
    }
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** Axis-aligned box (in its own frame) placed at (x, y, z) — y = bottom — and turned by rotY; metre UVs. */
export function box(w: number, h: number, d: number, x: number, y: number, z: number, rotY = 0, uv = true): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  return uv ? metreUV(g) : g;
}

/** Box between two plan points (a wall segment), thickness t, from y0 to y1. */
export function wallSeg(a: V2, b: V2, t: number, y0: number, y1: number): THREE.BufferGeometry {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const g = new THREE.BoxGeometry(len, y1 - y0, t);
  g.translate(0, (y1 - y0) / 2, 0);
  g.rotateY(-Math.atan2(dz, dx));
  g.translate((a[0] + b[0]) / 2, y0, (a[1] + b[1]) / 2);
  return metreUV(g);
}

/** Cylinder (vertical) from y0 to y1. */
export function cylinder(r: number, y0: number, y1: number, x: number, z: number, seg = 16, rTop = r): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, r, y1 - y0, seg);
  g.translate(x, (y0 + y1) / 2, z);
  return metreUV(g);
}

/** Straight tube between two points (rails, posts). */
export function rod(a: V3, b: V3, r: number, seg = 8): THREE.BufferGeometry {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, true);
  _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  _m.compose(va.clone().add(vb).multiplyScalar(0.5), _q, _s.set(1, 1, 1));
  g.applyMatrix4(_m);
  return metreUV(g);
}

/** Tube along a polyline (rails with bends). */
export function tubePath(points: V3[], r: number, radial = 8, tension = 0): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    false,
    "catmullrom",
    tension,
  );
  const segs = Math.max(4, Math.ceil(curve.getLength() / 0.12));
  const g = new THREE.TubeGeometry(curve, segs, r, radial, false);
  return metreUV(g);
}

/**
 * Prism from a plan polygon (walls, columns, slabs): sides with metre UVs
 * (u = along the outline, v = y), optional top/bottom caps in plan UVs.
 */
export function prism(
  poly: readonly V2[],
  y0: number,
  y1: number,
  opts: { top?: boolean; bottom?: boolean; sides?: boolean } = {},
): THREE.BufferGeometry {
  const ring = cleanPoly(poly);
  const ccw = signedArea(ring) > 0;
  const pts = ccw ? ring : ring.slice().reverse();
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  if (opts.sides !== false) {
    let u = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 1e-4) continue;
      // Outward normal for a CCW-in-(x,−z) ring: see signedArea.
      const nx = -(b[1] - a[1]) / len;
      const nz = (b[0] - a[0]) / len;
      const base = pos.length / 3;
      pos.push(a[0], y0, a[1], b[0], y0, b[1], b[0], y1, b[1], a[0], y1, a[1]);
      for (let k = 0; k < 4; k++) nor.push(nx, 0, nz);
      uv.push(u, y0, u + len, y0, u + len, y1, u, y1);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      u += len;
    }
  }
  const caps: [number, number][] = [];
  if (opts.top !== false) caps.push([y1, 1]);
  if (opts.bottom) caps.push([y0, -1]);
  if (caps.length) {
    const contour = pts.map(([x, z]) => new THREE.Vector2(x, -z));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    for (const [y, up] of caps) {
      const base = pos.length / 3;
      for (const [x, z] of pts) {
        pos.push(x, y, z);
        nor.push(0, up, 0);
        uv.push(x, -z);
      }
      for (const t of tris) {
        if (up > 0) idx.push(base + t[0], base + t[1], base + t[2]);
        else idx.push(base + t[0], base + t[2], base + t[1]);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Shoelace area with the sign convention used by prism(): positive = CCW in (x, −z). */
export function signedArea(poly: readonly V2[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    s += a[0] * -b[1] - b[0] * -a[1];
  }
  return s / 2;
}

/** Drop repeated points and a closing duplicate. */
export function cleanPoly(poly: readonly V2[]): V2[] {
  const out: V2[] = [];
  for (const p of poly) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-3) out.push([p[0], p[1]]);
  }
  if (out.length > 2) {
    const a = out[0];
    const b = out[out.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= 1e-3) out.pop();
  }
  return out;
}

/**
 * Curved strip on a circle (r, bearings b0 → b1 clockwise), from y0 to y1.
 * `inward` = faces the centre. UVs: u = arc length (m) or 0…1 (`unitU`), v = y or 0…1.
 */
export function arcStrip(
  r: number,
  b0: number,
  b1: number,
  y0: number,
  y1: number,
  opts: { inward?: boolean; seg?: number; unitU?: boolean; unitV?: boolean } = {},
): THREE.BufferGeometry {
  const seg = opts.seg ?? Math.max(8, Math.ceil(Math.abs(b1 - b0) / 2));
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const arcLen = (Math.abs(b1 - b0) * DEG) * r;
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const b = b0 + (b1 - b0) * t;
    const [x, z] = polar(r, b);
    const [nx, nz] = polar(1, b);
    const s = opts.inward ? -1 : 1;
    pos.push(x, y0, z, x, y1, z);
    nor.push(nx * s, 0, nz * s, nx * s, 0, nz * s);
    const u = opts.unitU ? t : t * arcLen * (opts.inward ? 1 : -1);
    uv.push(u, opts.unitV ? 0 : y0, u, opts.unitV ? 1 : y1);
    if (i < seg) {
      const a = i * 2;
      // Bearings grow clockwise seen from above; the front face is the side the normal points to.
      if (opts.inward) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Flat ring sector (floor bands, ceilings, caps) at height y, facing up (or down). Plan UVs. */
export function annulus(
  rIn: number,
  rOut: number,
  b0: number,
  b1: number,
  y: number,
  opts: { down?: boolean; seg?: number } = {},
): THREE.BufferGeometry {
  const seg = opts.seg ?? Math.max(8, Math.ceil(Math.abs(b1 - b0) / 2));
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const b = b0 + ((b1 - b0) * i) / seg;
    const [xo, zo] = polar(rOut, b);
    const [xi, zi] = polar(rIn, b);
    pos.push(xo, y, zo, xi, y, zi);
    const ny = opts.down ? -1 : 1;
    nor.push(0, ny, 0, 0, ny, 0);
    uv.push(xo, -zo, xi, -zi);
    if (i < seg) {
      const a = i * 2;
      if (opts.down) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Thick ring sector (drum wall, kerbs): inner + outer faces, top, optional bottom and end caps. */
export function ringPrism(
  rIn: number,
  rOut: number,
  b0: number,
  b1: number,
  y0: number,
  y1: number,
  opts: { seg?: number; ends?: boolean; bottom?: boolean; top?: boolean } = {},
): THREE.BufferGeometry {
  const seg = opts.seg ?? Math.max(8, Math.ceil(Math.abs(b1 - b0) / 2));
  const parts = [
    arcStrip(rOut, b0, b1, y0, y1, { seg }),
    arcStrip(rIn, b0, b1, y0, y1, { seg, inward: true }),
  ];
  if (opts.top !== false) parts.push(annulus(rIn, rOut, b0, b1, y1, { seg }));
  if (opts.bottom) parts.push(annulus(rIn, rOut, b0, b1, y0, { seg, down: true }));
  if (opts.ends !== false && Math.abs(b1 - b0) < 359.9) {
    const [x0, z0] = polar(rIn, b0);
    const [x1, z1] = polar(rOut, b0);
    const [x2, z2] = polar(rIn, b1);
    const [x3, z3] = polar(rOut, b1);
    parts.push(quad([x1, y0, z1], [x0, y0, z0], [x0, y1, z0], [x1, y1, z1]));
    parts.push(quad([x2, y0, z2], [x3, y0, z3], [x3, y1, z3], [x2, y1, z2]));
  }
  return merge(parts);
}

/** A quad from four corners (counter-clockwise seen from the front). */
export function quad(a: V3, b: V3, c: V3, d: V3): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  return metreUV(g);
}

/** Merge geometries (normalised to position/normal/uv + extras). */
export function merge(parts: THREE.BufferGeometry[], keep: readonly string[] = []): THREE.BufferGeometry {
  const list = parts.filter((p) => p.getAttribute("position").count > 0).map((p) => normalise(p, keep));
  if (!list.length) return new THREE.BufferGeometry();
  if (list.length === 1) return list[0];
  const merged = mergeGeometries(list, false);
  list.forEach((p) => p.dispose());
  if (!merged) throw new Error("joki: mergeGeometries failed (attribute mismatch)");
  return merged;
}

/** Fill a constant vertex colour (sRGB hex → linear). */
export function paint(g: THREE.BufferGeometry, color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const n = g.getAttribute("position").count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

/**
 * Flat PBR paint for a zone's "uber" material (JokiMaterials.uber): vertex
 * colour (sRGB hex) plus roughness and metalness in the `jkRM` attribute, so
 * every flat-coloured surface of a room merges into one draw call.
 */
export function pbr(g: THREE.BufferGeometry, color: THREE.ColorRepresentation, roughness: number, metalness = 0): THREE.BufferGeometry {
  paint(g, color);
  const n = g.getAttribute("position").count;
  const rm = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    rm[i * 2] = roughness;
    rm[i * 2 + 1] = metalness;
  }
  g.setAttribute("jkRM", new THREE.BufferAttribute(rm, 2));
  return g;
}

/** Shader patch for uber materials: roughness and metalness come from the `jkRM` vertex attribute. */
export function uberPatch(material: THREE.Material): void {
  material.userData.jkUber = true;
  chainPatch(material, "jk-uber", (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 jkRM;\nvarying vec2 vJkRM;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n\tvJkRM = jkRM;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vJkRM;")
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = clamp( vJkRM.x, 0.04, 1.0 );")
      .replace("#include <metalnessmap_fragment>", "float metalnessFactor = vJkRM.y;");
  });
}

/** Fill a constant linear (HDR) vertex colour — for emissive fixtures on a shared glow material. */
export function glow(g: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const n = g.getAttribute("position").count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Transform a geometry in place (position, rotation y, uniform scale). */
export function place(g: THREE.BufferGeometry, x: number, y: number, z: number, rotY = 0, scale = 1): THREE.BufferGeometry {
  _e.set(0, rotY, 0);
  _q.setFromEuler(_e);
  _m.compose(_p.set(x, y, z), _q, _s.set(scale, scale, scale));
  g.applyMatrix4(_m);
  return g;
}

/** Matrix for an instance: position, rotation y, scale (x, y, z). */
export function instanceMatrix(
  x: number,
  y: number,
  z: number,
  rotY: number,
  sx = 1,
  sy = 1,
  sz = 1,
  out = new THREE.Matrix4(),
): THREE.Matrix4 {
  _e.set(0, rotY, 0);
  _q.setFromEuler(_e);
  return out.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

// ── Batching ─────────────────────────────────────────────────────────────────

interface Bucket {
  parent: THREE.Object3D;
  material: THREE.Material;
  geos: THREE.BufferGeometry[];
  cast: boolean;
  receive: boolean;
  keep: string[];
  name: string;
}

/**
 * Collects static geometry per (parent group, material) and merges each
 * bucket into one mesh — one draw call per material per visibility group.
 */
export class Batcher {
  private buckets = new Map<string, Bucket>();
  private ids = new WeakMap<object, number>();
  private next = 1;

  private id(o: object): number {
    let v = this.ids.get(o);
    if (!v) {
      v = this.next++;
      this.ids.set(o, v);
    }
    return v;
  }

  add(
    parent: THREE.Object3D,
    material: THREE.Material,
    geometry: THREE.BufferGeometry | THREE.BufferGeometry[],
    opts: { cast?: boolean; receive?: boolean; keep?: string[]; name?: string } = {},
  ): void {
    const key = `${this.id(parent)}:${this.id(material)}:${opts.cast ? 1 : 0}${opts.receive ? 1 : 0}`;
    let b = this.buckets.get(key);
    if (!b) {
      b = {
        parent,
        material,
        geos: [],
        cast: !!opts.cast,
        receive: !!opts.receive,
        keep: opts.keep ?? (material.userData.jkUber ? ["color", "jkRM"] : material.vertexColors ? ["color"] : []),
        name: opts.name ?? material.name,
      };
      this.buckets.set(key, b);
    }
    for (const g of Array.isArray(geometry) ? geometry : [geometry]) b.geos.push(g);
  }

  /** Merge every bucket into its parent. */
  flush(): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const b of this.buckets.values()) {
      if (!b.geos.length) continue;
      const g = merge(b.geos, b.keep);
      g.computeBoundingSphere();
      g.computeBoundingBox();
      const mesh = new THREE.Mesh(g, b.material);
      mesh.name = `joki:${b.name}`;
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.receive;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      b.parent.add(mesh);
      out.push(mesh);
    }
    this.buckets.clear();
    return out;
  }
}

// ── Shader patches ───────────────────────────────────────────────────────────

/**
 * Chain a shader patch onto a material, keeping any patch it already has
 * (the library's macro/anti-tiling patches). `key` must name the GLSL variant.
 */
export function chainPatch(
  material: THREE.Material,
  key: string,
  patch: (shader: THREE.WebGLProgramParametersWithUniforms) => void,
): void {
  const prev = material.onBeforeCompile.bind(material);
  const prevKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    prev(shader, renderer);
    patch(shader);
  };
  material.customProgramCacheKey = () => `${prevKey()}|${key}`;
  material.needsUpdate = true;
}

const LIGHTS_BEGIN = "#include <lights_fragment_begin>";

/**
 * Interior surfaces of an enclosed room: the sun never reaches them (no
 * shadow lookups needed). Scales the sun's direct light by a uniform (0 = off).
 */
export function sunMask(material: THREE.Material, uniform: THREE.IUniform<number>): void {
  chainPatch(material, "jk-sun", (shader) => {
    shader.uniforms.uJkSun = uniform;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uJkSun;")
      .replace(
        LIGHTS_BEGIN,
        THREE.ShaderChunk.lights_fragment_begin.replace(
          "getSunLightInfo( sunLight, directLight );",
          "getSunLightInfo( sunLight, directLight ); directLight.color *= uJkSun;",
        ),
      );
  });
}

// ── Misc ─────────────────────────────────────────────────────────────────────

/** Deterministic integer hash → 0…1 (for per-item variation without a PRNG stream). */
export function hash01(n: number): number {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

/** Distance from point p to segment ab (plan). */
export function segDistance(p: V2, a: V2, b: V2): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0;
  return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dz * t));
}

/** Corners of a rectangle (centre, length along its axis, width, axis angle in the plan, radians from +x). */
export function rectCorners(cx: number, cz: number, length: number, width: number, angle: number): V2[] {
  const ux = Math.cos(angle);
  const uz = Math.sin(angle);
  const vx = -uz;
  const vz = ux;
  const hl = length / 2;
  const hw = width / 2;
  return [
    [cx - ux * hl - vx * hw, cz - uz * hl - vz * hw],
    [cx + ux * hl - vx * hw, cz + uz * hl - vz * hw],
    [cx + ux * hl + vx * hw, cz + uz * hl + vz * hw],
    [cx - ux * hl + vx * hw, cz - uz * hl + vz * hw],
  ];
}
