import * as THREE from "three";

/**
 * Plan convention used by every scene: metres, +x = east, +z = south,
 * north = −z. Compass bearings: 0 = north, 90 = east, 180 = south.
 */
export function polar(bearingDeg: number, r: number): [number, number] {
  const b = THREE.MathUtils.degToRad(bearingDeg);
  return [r * Math.sin(b), -r * Math.cos(b)];
}

/** Rotation (y) that makes an object's +z axis point radially outward at a bearing. */
export function facingOutward(bearingDeg: number): number {
  const [x, z] = polar(bearingDeg, 1);
  return Math.atan2(x, z);
}

/** Rotation (y) so that the object's +z axis points at (tx, tz) from (x, z). */
export function lookYaw(x: number, z: number, tx: number, tz: number): number {
  return Math.atan2(tx - x, tz - z);
}

export type V3 = [number, number, number];

export interface CameraView {
  position: V3;
  target: V3;
  /** Vertical field of view (degrees). */
  fov?: number;
  /**
   * Horizontal field of view to preserve (degrees). When set, the vertical
   * FOV adapts to the screen's aspect ratio (portrait phones get a taller FOV).
   */
  hfov?: number;
  /** Show the floating labels in this view. */
  labels?: boolean;
  /** Only show labels of this group (plus ungrouped ones). */
  labelGroup?: string;
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

/** Same-origin image loader; resolves null on error so a missing logo never breaks a scene. */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  let promise = imageCache.get(src);
  if (!promise) {
    promise = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imageCache.set(src, promise);
  }
  return promise;
}

/** Deterministic PRNG so textures look the same for everyone (and in posters). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dispose every geometry, material and texture below a root. */
export function disposeDeep(root: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    const materials = Array.isArray(material) ? material : material ? [material] : [];
    for (const m of materials) {
      for (const value of Object.values(m)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
      m.dispose();
    }
  });
  textures.forEach((t) => t.dispose());
}

/** Font family actually loaded by next/font for JetBrains Mono (falls back to monospace). */
export function monoFont(): string {
  if (typeof document === "undefined") return "monospace";
  const value = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim();
  return value ? `${value}, ui-monospace, monospace` : "ui-monospace, monospace";
}
