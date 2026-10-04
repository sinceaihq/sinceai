import * as THREE from "three";
import { Bucket, splitBands } from "./geom";

/**
 * Bookkeeping for EduCity's meshes: one bucket per (material, target group),
 * finished into one mesh each (buckets sharing a material and a group are
 * merged — one draw call per material and group).
 *
 * Shell buckets are "banded": their triangles are clipped at the dollhouse
 * cuts and sorted bottom-up (band A below 4.2 m, B to 8.6 m, C above), so
 * setOpen() hides everything above a floor by shortening the geometry's draw
 * range — no clipping planes, no extra draw calls, and the shadow and GTAO
 * passes see exactly what the camera sees.
 */

/** Dollhouse cut heights (y_E): above the floor-1 ceiling, above the floor-2 ceiling. */
export const CUTS = [4.2, 8.6] as const;
export const BAND_COUNT = CUTS.length + 1;

export interface SlotOptions {
  /** Target group key (dot = child group: "f1.ceil" lives inside "f1"). */
  group: string;
  extra?: Record<string, number>;
  castShadow?: boolean;
  receiveShadow?: boolean;
  renderOrder?: number;
  /** Clip into dollhouse bands (shell geometry); see setBands(). */
  split?: boolean;
}

interface Slot {
  bucket: Bucket;
  material: THREE.Material;
  opts: SlotOptions;
}

interface Banded {
  mesh: THREE.Mesh;
  /** Vertex count up to and including band i. */
  ends: number[];
}

/** Concatenate non-indexed geometries with the same attributes (nulls skipped). */
export function concatGeometries(parts: readonly (THREE.BufferGeometry | null)[]): { geometry: THREE.BufferGeometry; ends: number[] } {
  const first = parts.find((p): p is THREE.BufferGeometry => p !== null);
  const geometry = new THREE.BufferGeometry();
  const ends: number[] = [];
  if (!first) return { geometry, ends: parts.map(() => 0) };
  let count = 0;
  for (const p of parts) {
    count += p ? p.getAttribute("position").count : 0;
    ends.push(count);
  }
  for (const name of Object.keys(first.attributes)) {
    const size = first.getAttribute(name).itemSize;
    const data = new Float32Array(count * size);
    let offset = 0;
    for (const p of parts) {
      if (!p) continue;
      const a = p.getAttribute(name) as THREE.BufferAttribute;
      data.set(a.array as Float32Array, offset);
      offset += a.count * size;
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(data, size));
  }
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return { geometry, ends };
}

export class Kit {
  private slots = new Map<string, Slot>();
  private banded = new Map<string, Banded[]>();
  readonly groups = new Map<string, THREE.Group>();
  /** Materials the module owns (disposed by disposeDeep through the meshes, plus these). */
  readonly materials = new Set<THREE.Material>();

  constructor(readonly root: THREE.Group) {}

  group(key: string): THREE.Group {
    let g = this.groups.get(key);
    if (!g) {
      g = new THREE.Group();
      g.name = `educity:${key}`;
      const dot = key.lastIndexOf(".");
      const parent = dot > 0 ? this.group(key.slice(0, dot)) : this.root;
      parent.add(g);
      this.groups.set(key, g);
    }
    return g;
  }

  /** The bucket for a material in a group (created on first use). */
  bucket(name: string, material: THREE.Material, opts: SlotOptions): Bucket {
    const key = `${opts.group}|${name}`;
    let slot = this.slots.get(key);
    if (!slot) {
      slot = { bucket: new Bucket(name, opts.extra ?? {}), material, opts };
      this.slots.set(key, slot);
      this.materials.add(material);
    }
    return slot.bucket;
  }

  /**
   * Build every mesh: buckets that share a material and a target group are
   * merged into one geometry. Returns the triangle count.
   */
  finish(): number {
    let tris = 0;
    const merged = new Map<string, Slot>();
    for (const slot of this.slots.values()) {
      if (slot.bucket.vertexCount === 0) continue;
      const key = `${slot.opts.group}|${slot.material.uuid}|${slot.opts.split ? 1 : 0}`;
      const into = merged.get(key);
      if (into) into.bucket.append(slot.bucket);
      else {
        const b = new Bucket(slot.bucket.name, Object.fromEntries(Object.entries(slot.bucket.ext).map(([k, e]) => [k, e.size])));
        b.append(slot.bucket);
        merged.set(key, { bucket: b, material: slot.material, opts: slot.opts });
      }
    }
    for (const { bucket, material, opts } of merged.values()) {
      let geometry = bucket.geometry();
      let ends: number[] | null = null;
      if (opts.split) {
        const bands = splitBands(geometry, CUTS);
        geometry.dispose();
        ({ geometry, ends } = concatGeometries(bands));
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `educity:${bucket.name}`;
      mesh.castShadow = opts.castShadow ?? false;
      mesh.receiveShadow = opts.receiveShadow ?? true;
      if (opts.renderOrder !== undefined) mesh.renderOrder = opts.renderOrder;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      this.group(opts.group).add(mesh);
      if (ends) {
        const list = this.banded.get(opts.group) ?? [];
        list.push({ mesh, ends });
        this.banded.set(opts.group, list);
      }
      tris += geometry.getAttribute("position").count / 3;
    }
    this.slots.clear();
    return tris;
  }

  /**
   * Show the lowest `n` bands of a banded group (0 = none, BAND_COUNT = all):
   * shortens the draw range of every banded mesh in it.
   */
  setBands(group: string, n: number): void {
    for (const { mesh, ends } of this.banded.get(group) ?? []) {
      const count = n <= 0 ? 0 : ends[Math.min(n, ends.length) - 1];
      mesh.geometry.setDrawRange(0, count);
      mesh.visible = count > 0;
    }
  }

  /** Add an extra object (special meshes) to a group. */
  add(groupKey: string, obj: THREE.Object3D): void {
    this.group(groupKey).add(obj);
  }
}
