import * as THREE from "three";
import type { V2 } from "./types";

/**
 * Shared helpers for the campus twin: deterministic randomness, disposal and
 * 2D polygon maths on the ground plane ([x, z], metres).
 *
 * Polygon orientation: "counter-clockwise seen from above (+y)" as in the
 * campus data. Because +z points south, that is the order (west → south →
 * east → north) and its shoelace sum over (x, z) is negative; `ringArea`
 * flips the sign so CCW rings have a positive area.
 */

/** Deterministic PRNG so content looks the same for everyone (and in posters). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 32-bit FNV-1a hash of a string — stable seeds from ids ("osm-48381050"). */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Marks a material or texture as owned by a shared library: disposeDeep skips it. */
export function markShared<T extends THREE.Material | THREE.Texture>(item: T): T {
  item.userData.shared = true;
  return item;
}

export function isShared(item: THREE.Material | THREE.Texture): boolean {
  return item.userData.shared === true;
}

/**
 * Dispose every geometry, material and texture below a root (and remove DOM
 * labels). Shared library materials/textures are left alone — the library
 * owns them and several modules use the same instances.
 */
export function disposeDeep(root: THREE.Object3D): void {
  const textures = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  root.traverse((obj) => {
    const element = (obj as THREE.Object3D & { element?: unknown }).element;
    if (element instanceof Element) element.remove();
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry instanceof THREE.BufferGeometry) geometries.add(mesh.geometry);
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    const list = Array.isArray(material) ? material : material ? [material] : [];
    for (const m of list) materials.add(m);
    if ((obj as THREE.InstancedMesh).isInstancedMesh) (obj as THREE.InstancedMesh).dispose();
  });
  for (const m of materials) {
    for (const value of Object.values(m)) {
      if (value instanceof THREE.Texture) textures.add(value);
    }
    const uniforms = (m as THREE.ShaderMaterial).uniforms;
    if (uniforms) {
      for (const u of Object.values(uniforms)) {
        if (u && u.value instanceof THREE.Texture) textures.add(u.value);
      }
    }
    if (!isShared(m)) m.dispose();
  }
  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => {
    if (!isShared(t)) t.dispose();
  });
}

// ── Polygons on the ground plane ────────────────────────────────────────────

/** Area with sign: positive for rings counter-clockwise seen from above (+y). */
export function ringArea(poly: readonly V2[]): number {
  let s = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return -s / 2;
}

/** Returns the ring counter-clockwise seen from above (copy when reversed). */
export function ensureCCW(poly: readonly V2[]): V2[] {
  return ringArea(poly) >= 0 ? poly.slice() : poly.slice().reverse();
}

/** Drops a repeated closing vertex and consecutive duplicates (< 1 mm). */
export function cleanRing(poly: readonly V2[]): V2[] {
  const out: V2[] = [];
  for (const p of poly) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-3) out.push([p[0], p[1]]);
  }
  while (out.length > 2) {
    const a = out[0];
    const b = out[out.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 1e-3) break;
    out.pop();
  }
  return out;
}

export function polygonCentroid(poly: readonly V2[]): V2 {
  let cx = 0;
  let cz = 0;
  let a = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    const cross = p[0] * q[1] - q[0] * p[1];
    a += cross;
    cx += (p[0] + q[0]) * cross;
    cz += (p[1] + q[1]) * cross;
  }
  if (Math.abs(a) < 1e-9) {
    const sx = poly.reduce((s, p) => s + p[0], 0);
    const sz = poly.reduce((s, p) => s + p[1], 0);
    return [sx / poly.length, sz / poly.length];
  }
  return [cx / (3 * a), cz / (3 * a)];
}

export interface Bounds2 {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function polygonBounds(poly: readonly V2[]): Bounds2 {
  const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const [x, z] of poly) {
    if (x < b.minX) b.minX = x;
    if (x > b.maxX) b.maxX = x;
    if (z < b.minZ) b.minZ = z;
    if (z > b.maxZ) b.maxZ = z;
  }
  return b;
}

/** Even-odd point-in-polygon test (holes: pass each ring and xor the results). */
export function pointInRing(p: V2, poly: readonly V2[]): boolean {
  let inside = false;
  const [x, z] = p;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Approximate overlap area of two rings, sampled on a grid (default 0.5 m)
 * over the intersection of their bounds. Robust for concave footprints;
 * used to match City of Turku LOD2 records to OSM buildings.
 */
export function overlapArea(a: readonly V2[], b: readonly V2[], step = 0.5): number {
  const ba = polygonBounds(a);
  const bb = polygonBounds(b);
  const minX = Math.max(ba.minX, bb.minX);
  const maxX = Math.min(ba.maxX, bb.maxX);
  const minZ = Math.max(ba.minZ, bb.minZ);
  const maxZ = Math.min(ba.maxZ, bb.maxZ);
  if (minX >= maxX || minZ >= maxZ) return 0;
  // Keep the sample count bounded for very large footprints.
  const s = Math.max(step, Math.sqrt(((maxX - minX) * (maxZ - minZ)) / 40000));
  let hits = 0;
  for (let x = minX + s / 2; x < maxX; x += s) {
    for (let z = minZ + s / 2; z < maxZ; z += s) {
      const p: V2 = [x, z];
      if (pointInRing(p, a) && pointInRing(p, b)) hits++;
    }
  }
  return hits * s * s;
}

/** Distance from a point to a segment on the ground plane. */
export function distanceToSegment(p: V2, a: V2, b: V2): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  const t = len2 > 0 ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2, 0, 1) : 0;
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz));
}

/** Length of a polyline. */
export function polylineLength(line: readonly V2[]): number {
  let len = 0;
  for (let i = 1; i < line.length; i++) len += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
  return len;
}

// ── Images and fonts ─────────────────────────────────────────────────────────

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

/**
 * Same-origin image loader; resolves null on error so a missing logo never breaks a scene. A failed
 * load is not cached: the next call (reopening the 3D, "Try again") asks the network again.
 */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  let promise = imageCache.get(src);
  if (!promise) {
    promise = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => {
        imageCache.delete(src);
        resolve(null);
      };
      img.src = src;
    });
    imageCache.set(src, promise);
  }
  return promise;
}

/** Font family actually loaded by next/font for JetBrains Mono (falls back to monospace). */
export function monoFont(): string {
  if (typeof document === "undefined") return "monospace";
  const value = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim();
  return value ? `${value}, ui-monospace, monospace` : "ui-monospace, monospace";
}

/** Inter (the site's sans) for signage lettering. */
export function sansFont(): string {
  if (typeof document === "undefined") return "sans-serif";
  const value = getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim();
  return value ? `${value}, system-ui, sans-serif` : "system-ui, sans-serif";
}

/** Reject after `ms` — keeps a stuck fetch from blocking the load forever. */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}
