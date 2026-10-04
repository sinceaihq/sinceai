import * as THREE from "three";
import type { V2, V3 } from "../types";

/**
 * Metre UVs for any geometry, so library textures tile at real-world scale
 * (MaterialLibrary sets texture.repeat = 1 / tileSize). All functions write
 * the `uv` attribute in place and return the geometry.
 */

/**
 * Box projection by the dominant axis of each vertex normal. Walls get
 * u = horizontal metres (never mirrored when seen from outside), v = height;
 * tops/bottoms get plan coordinates (north up).
 * `metresPerUnit` converts geometry units to metres (1 when built in metres).
 */
export function boxUV(geometry: THREE.BufferGeometry, metresPerUnit = 1): THREE.BufferGeometry {
  const pos = geometry.getAttribute("position");
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  const nor = geometry.getAttribute("normal");
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) * metresPerUnit;
    const y = pos.getY(i) * metresPerUnit;
    const z = pos.getZ(i) * metresPerUnit;
    const nx = nor.getX(i);
    const ny = nor.getY(i);
    const nz = nor.getZ(i);
    const ax = Math.abs(nx);
    const ay = Math.abs(ny);
    const az = Math.abs(nz);
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = x;
      v = ny >= 0 ? -z : z;
    } else if (ax >= az) {
      u = nx >= 0 ? -z : z;
      v = y;
    } else {
      u = nz >= 0 ? x : -x;
      v = y;
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}

/** Planar projection along one axis ("y" = plan view: u = x, v = −z). */
export function planarUV(
  geometry: THREE.BufferGeometry,
  axis: "x" | "y" | "z" = "y",
  metresPerUnit = 1,
): THREE.BufferGeometry {
  const pos = geometry.getAttribute("position");
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) * metresPerUnit;
    const y = pos.getY(i) * metresPerUnit;
    const z = pos.getZ(i) * metresPerUnit;
    if (axis === "y") {
      uv[i * 2] = x;
      uv[i * 2 + 1] = -z;
    } else if (axis === "x") {
      uv[i * 2] = -z;
      uv[i * 2 + 1] = y;
    } else {
      uv[i * 2] = x;
      uv[i * 2 + 1] = y;
    }
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}

/** Cumulative arc length at each vertex of a polyline on the ground plane. */
export function arcLengths(path: readonly V2[]): number[] {
  const out = [0];
  for (let i = 1; i < path.length; i++) {
    out.push(out[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  }
  return out;
}

/**
 * Along-path UVs for ribbons (roads, kerbs, route lines): u = metres along
 * `path` at the closest point, v = signed lateral offset (left of the travel
 * direction is positive). Works on any geometry laid out along the path.
 */
export function pathUV(geometry: THREE.BufferGeometry, path: readonly V2[], metresPerUnit = 1): THREE.BufferGeometry {
  const pos = geometry.getAttribute("position");
  const lengths = arcLengths(path);
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i) * metresPerUnit;
    const pz = pos.getZ(i) * metresPerUnit;
    let best = Infinity;
    let bestU = 0;
    let bestV = 0;
    for (let s = 1; s < path.length; s++) {
      const [ax, az] = path[s - 1];
      const [bx, bz] = path[s];
      const dx = bx - ax;
      const dz = bz - az;
      const len2 = dx * dx + dz * dz;
      if (len2 < 1e-12) continue;
      const t = Math.min(1, Math.max(0, ((px - ax) * dx + (pz - az) * dz) / len2));
      const cx = ax + dx * t;
      const cz = az + dz * t;
      const d = Math.hypot(px - cx, pz - cz);
      if (d < best) {
        best = d;
        const len = Math.sqrt(len2);
        bestU = lengths[s - 1] + t * len;
        // Left of travel (seen from above, +z south): cross(dir, p − c) sign.
        const side = dx * (pz - cz) - dz * (px - cx);
        bestV = side < 0 ? d : -d;
      }
    }
    uv[i * 2] = bestU;
    uv[i * 2 + 1] = bestV;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}

/**
 * A flat ribbon along a polyline with mitred joins and metre UVs
 * (u along, v across from −width/2 to +width/2). Heights come from the
 * path's own y (V3) or `heightAt`, plus `lift` (e.g. 0.02 m above the ground).
 */
export function ribbonGeometry(
  path: readonly (V2 | V3)[],
  width: number,
  opts: { heightAt?: (x: number, z: number) => number; lift?: number; maxMiter?: number } = {},
): THREE.BufferGeometry {
  const pts = path.map((p) => (p.length === 3 ? { x: p[0], y: p[1], z: p[2] } : { x: p[0], y: NaN, z: p[1] }));
  const n = pts.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const half = width / 2;
  const lift = opts.lift ?? 0;
  const maxMiter = opts.maxMiter ?? 3;
  let along = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const prev = pts[Math.max(0, i - 1)];
    const next = pts[Math.min(n - 1, i + 1)];
    // Unit directions of the incoming and outgoing segments.
    let d0x = p.x - prev.x;
    let d0z = p.z - prev.z;
    let d1x = next.x - p.x;
    let d1z = next.z - p.z;
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
    // Left normal of the averaged tangent (+z is south, so left of +x travel is −z).
    const nx = tz;
    const nz = -tx;
    // Mitre: stretch the half width by 1/cos of the angle to the segment normal (capped).
    const cosPhi = Math.max(1 / maxMiter, nx * d1z - nz * d1x);
    const miter = half / cosPhi;
    if (i > 0) along += Math.hypot(p.x - prev.x, p.z - prev.z);
    for (const side of [1, -1]) {
      const x = p.x + nx * miter * side;
      const z = p.z + nz * miter * side;
      const yBase = Number.isNaN(p.y) ? (opts.heightAt ? opts.heightAt(x, z) : 0) : p.y;
      positions.push(x, yBase + lift, z);
      uvs.push(along, side * half);
    }
    if (i > 0) {
      const a = (i - 1) * 2;
      const b = i * 2;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  // Ribbons lie on the ground: make sure they face up even if the path winds clockwise.
  const nor = geometry.getAttribute("normal");
  let up = 0;
  for (let i = 0; i < nor.count; i++) up += nor.getY(i);
  if (up < 0) {
    const index = geometry.getIndex();
    if (index) {
      const arr = index.array as Uint16Array | Uint32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const t = arr[i + 1];
        arr[i + 1] = arr[i + 2];
        arr[i + 2] = t;
      }
      index.needsUpdate = true;
    }
    geometry.computeVertexNormals();
  }
  return geometry;
}
