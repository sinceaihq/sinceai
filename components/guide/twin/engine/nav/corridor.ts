import * as THREE from "three";
import type { V2 } from "../types";

/**
 * The modelled surfaces along a route: every near-horizontal triangle of the
 * scene (floors, treads, decks, terraces, kerbs — and the undersides of roofs,
 * canopies, bridges and ceilings) in 1 m cells around the path. Tours use it
 * to stand the avatar on what is drawn (not on the route data's straight-line
 * heights) and to keep the chase camera under every roof it passes beneath.
 *
 * Built from the live scene's triangles in time slices (never a long frame),
 * once per tour start; queries are a cell lookup and a few barycentric tests.
 */

/** Triangles flatter than this (|normal.y|) are surfaces; walls and steep faces are not indexed. */
const MIN_NORMAL_Y = 0.3;
/** Surfaces closer than this (m) are layers of one floor (paving over ground, a mat, paint). */
const LAYER = 0.2;
const KEY_BIAS = 4096;

const cellKey = (ix: number, iz: number) => (ix + KEY_BIAS) * 8192 + (iz + KEY_BIAS);

export class CorridorIndex {
  private readonly cells = new Map<number, number[]>();
  private tris = new Float32Array(10 * 4096);
  private count = 0;

  get triangleCount(): number {
    return this.count;
  }

  /** Add a world-space triangle to every wanted cell its plan bounds touch. `seeThrough`: glazing (never a floor). */
  add(v: ArrayLike<number>, seeThrough: boolean, wanted: ReadonlySet<number>): void {
    const x0 = Math.floor(Math.min(v[0], v[3], v[6]));
    const x1 = Math.floor(Math.max(v[0], v[3], v[6]));
    const z0 = Math.floor(Math.min(v[2], v[5], v[8]));
    const z1 = Math.floor(Math.max(v[2], v[5], v[8]));
    let id = -1;
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const k = cellKey(ix, iz);
        if (!wanted.has(k)) continue;
        if (id < 0) {
          if ((this.count + 1) * 10 > this.tris.length) {
            const bigger = new Float32Array(this.tris.length * 2);
            bigger.set(this.tris);
            this.tris = bigger;
          }
          id = this.count++;
          for (let i = 0; i < 9; i++) this.tris[id * 10 + i] = v[i];
          this.tris[id * 10 + 9] = seeThrough ? 1 : 0;
        }
        const list = this.cells.get(k);
        if (list) list.push(id);
        else this.cells.set(k, [id]);
      }
    }
  }

  /** Heights of every indexed surface over (x, z), with their see-through flag. */
  private heights(x: number, z: number, out: { y: number; glass: boolean }[]): void {
    out.length = 0;
    const list = this.cells.get(cellKey(Math.floor(x), Math.floor(z)));
    if (!list) return;
    const t = this.tris;
    for (const id of list) {
      const o = id * 10;
      const ax = t[o];
      const az = t[o + 2];
      const bx = t[o + 3];
      const bz = t[o + 5];
      const cx = t[o + 6];
      const cz = t[o + 8];
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      if (Math.abs(det) < 1e-9) continue;
      const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det;
      const l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
      out.push({ y: l1 * t[o + 1] + l2 * t[o + 4] + l3 * t[o + 7], glass: t[o + 9] > 0.5 });
    }
  }

  private readonly scratch: { y: number; glass: boolean }[] = [];

  /**
   * The walking surface at (x, z) nearest to `hint` within [hint − below, hint + above] (one a little
   * above costs a little more); the top of its layer stack. Glazing is never a floor. null = none.
   */
  floorAt(x: number, z: number, hint: number, below = 1, above = 1.2): number | null {
    const hs = this.scratch;
    this.heights(x, z, hs);
    let best: number | null = null;
    let bestCost = Infinity;
    for (const h of hs) {
      if (h.glass || h.y < hint - below || h.y > hint + above) continue;
      const cost = Math.abs(h.y - hint) + (h.y > hint ? 0.1 : 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = h.y;
      }
    }
    if (best === null) return null;
    let top = best;
    for (const h of hs) if (!h.glass && h.y > top && h.y - best <= LAYER) top = h.y;
    return top;
  }

  /**
   * The lowest surface over (x, z) at least `clearance` above `floor` and within `reach` of it — the
   * underside of a roof, a canopy, a bridge, a ceiling (glazed roofs count). null = open sky.
   */
  ceilingAt(x: number, z: number, floor: number, clearance = 1.9, reach = 14): number | null {
    const hs = this.scratch;
    this.heights(x, z, hs);
    let best: number | null = null;
    for (const h of hs) {
      if (h.y < floor + clearance || h.y > floor + reach) continue;
      if (best === null || h.y < best) best = h.y;
    }
    return best;
  }
}

/** Cell keys within `radius` m of each point. */
export function corridorCells(points: Iterable<V2>, radius: number, into = new Set<number>()): Set<number> {
  const r = Math.ceil(radius);
  for (const [x, z] of points) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) into.add(cellKey(ix + dx, iz + dz));
  }
  return into;
}

/** Meshes the index never reads: things that are not surfaces to stand on or under (trees, people, cars, ribbons…). */
const SKIP_NAME = /tree|trunk|branch|foliage|leaf|leaves|hedge|people|person|walker|avatar|route|ribbon|chevron|label|flag|banner|vehicle|traffic|glow|halo|beam|lamp-?head|light-?cone/i;

export interface CorridorOptions {
  /** Skip a subtree (e.g. a module root that holds no surfaces). */
  skip?(o: THREE.Object3D): boolean;
  /** Stop early (the tour ended, the engine was disposed). */
  shouldStop?(): boolean;
  /** Triangles per time slice before yielding to the event loop (default 40 000). */
  slice?: number;
}

/**
 * Index the near-horizontal triangles of every visible, non-instanced mesh under `roots` that touch
 * the wanted cells. Yields between slices so the frame loop keeps running; resolves null when stopped.
 */
export async function buildCorridorIndex(
  roots: readonly THREE.Object3D[],
  wanted: ReadonlySet<number>,
  opts: CorridorOptions = {},
): Promise<CorridorIndex | null> {
  const index = new CorridorIndex();
  if (wanted.size === 0) return index;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const k of wanted) {
    const ix = Math.floor(k / 8192) - KEY_BIAS;
    const iz = (k % 8192) - KEY_BIAS;
    minX = Math.min(minX, ix);
    maxX = Math.max(maxX, ix + 1);
    minZ = Math.min(minZ, iz);
    maxZ = Math.max(maxZ, iz + 1);
  }
  const meshes: { mesh: THREE.Mesh; seeThrough: boolean }[] = [];
  const stack: THREE.Object3D[] = [...roots];
  while (stack.length) {
    const o = stack.pop() as THREE.Object3D;
    if (!o.visible || opts.skip?.(o) || SKIP_NAME.test(o.name)) continue;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh && !(o as THREE.SkinnedMesh).isSkinnedMesh) {
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).filter((m) => m && m.visible);
      const shader = mats.length > 0 && mats.every((m) => (m as THREE.ShaderMaterial).isShaderMaterial === true);
      const geo = mesh.geometry;
      if (mats.length && !shader && geo?.getAttribute("position") && !(geo as THREE.InstancedBufferGeometry).isInstancedBufferGeometry) {
        const glass = mats.every(
          (m) => /glass|glazing/i.test(m.name) || (m.transparent && m.opacity < 0.6) || ((m as THREE.MeshPhysicalMaterial).transmission ?? 0) > 0.01,
        );
        // Nearly invisible helpers (fades, decals) are not surfaces.
        if (!mats.every((m) => m.transparent && m.opacity < 0.1)) meshes.push({ mesh, seeThrough: glass });
      }
    }
    for (const c of o.children) stack.push(c);
  }
  const box = new THREE.Box3();
  const e = new Float64Array(16);
  const v = new Float64Array(9);
  const slice = opts.slice ?? 40_000;
  let work = 0;
  for (const { mesh, seeThrough } of meshes) {
    if (opts.shouldStop?.()) return null;
    const geo = mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    if (!geo.boundingBox) continue;
    mesh.updateWorldMatrix(true, false);
    box.copy(geo.boundingBox).applyMatrix4(mesh.matrixWorld);
    if (box.max.x < minX || box.min.x > maxX || box.max.z < minZ || box.min.z > maxZ) continue;
    const pos = geo.getAttribute("position");
    const idx = geo.getIndex();
    e.set(mesh.matrixWorld.elements);
    const start = geo.drawRange.start;
    const total = idx ? idx.count : pos.count;
    const end = Math.min(total, start + (Number.isFinite(geo.drawRange.count) ? geo.drawRange.count : total));
    for (let i = start; i + 2 < end; i += 3) {
      for (let c = 0; c < 3; c++) {
        const vi = idx ? idx.getX(i + c) : i + c;
        const x = pos.getX(vi);
        const y = pos.getY(vi);
        const z = pos.getZ(vi);
        v[c * 3] = e[0] * x + e[4] * y + e[8] * z + e[12];
        v[c * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
        v[c * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      }
      if (Math.max(v[0], v[3], v[6]) < minX || Math.min(v[0], v[3], v[6]) > maxX) continue;
      if (Math.max(v[2], v[5], v[8]) < minZ || Math.min(v[2], v[5], v[8]) > maxZ) continue;
      const ux = v[3] - v[0];
      const uy = v[4] - v[1];
      const uz = v[5] - v[2];
      const wx = v[6] - v[0];
      const wy = v[7] - v[1];
      const wz = v[8] - v[2];
      const ny = uz * wx - ux * wz;
      const nl = Math.hypot(uy * wz - uz * wy, ny, ux * wy - uy * wx);
      if (nl < 1e-10 || Math.abs(ny) / nl < MIN_NORMAL_Y) continue;
      index.add(v, seeThrough, wanted);
    }
    work += (end - start) / 3;
    if (work > slice) {
      work = 0;
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
  return index;
}
