import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { CameraView, LightingState, TwinContext, V2, V3, WorldModule } from "../types";
import { loadCampus, loadRoutes, loadTerrain, type CampusData, type Terrain } from "../data/campus";
import { buildTourCurve } from "../nav/tour";
import { makeLabel } from "../labels";
import { pointInRing } from "../util";
import { TOURS_3D, getTarget3D, type Tour3D } from "@/lib/hackathon-2026/twin";

/**
 * Walking routes on the ground (DESIGN §2, §11–§12): the outdoor legs of every
 * lib TOURS_3D tour as one route network — soft violet ribbons with glowing
 * chevrons that move in the walking direction — plus distance markers, start
 * and finish pins, and the running tour's full route (WorldModule.setTour:
 * outdoor legs + the buildings' indoor legs), which animates indoors too as a
 * slimmer floor guide line.
 *
 * - Ribbons are drawn on the real walking surface: once the other modules are
 *   in the scene, a surface probe (SurfaceIndex below) reads the heights of the
 *   modelled ground, kerbs, decks and stairs under every route, so ribbons hug
 *   kerbs and steps instead of the bare DTM. 2 cm lift + a view-space depth
 *   bias (same pixel, nearer depth) — never z-fighting, at any distance.
 * - Readable from far, subtle up close: the ribbon is ≈0.8 m wide in the world
 *   but never thinner than ≈4.5 CSS px; when it is only a few pixels wide its
 *   chevrons fold into a cased line (like a route on a map), and near the
 *   camera it dims. The network's chevrons move on ultra/high only; the
 *   running tour's always (both stop with reduced motion).
 * - campus:arrival (lib PLACES_3D) is this module's view: the partner arrival.
 * - Brightness is display-referred (divided by the camera exposure every frame),
 *   so the routes read the same at noon, at dusk and at night.
 * - Shared overlapping parts (the Tykistökatu pavement, EduCity's outdoor
 *   stairs, the transfer and its reverse) are drawn once, so nothing doubles up.
 *
 * Ribbon vertices sit on the centre line and are pushed sideways in the vertex
 * shader, so passes that render the scene with an override material (the GTAO
 * normal/depth prepass) and raycasts see zero-area triangles: routes never
 * darken the ground with ambient occlusion and never catch double-clicks.
 */

// ── Colours and styles ───────────────────────────────────────────────────────

/** Since AI event violets (globals.css --color-event / --color-event-strong), linear. */
const VIOLET = new THREE.Color("#8b7bff");
const VIOLET_STRONG = new THREE.Color("#6d4dff");
/** Chevron core: violet-white so it reads on dark asphalt and light paving alike. */
const VIOLET_GLOW = new THREE.Color("#c4b9ff");

export interface RibbonStyle {
  /** Ribbon width outdoors / indoors (m). */
  width: number;
  indoorWidth: number;
  /** Never thinner than this on screen (CSS px). */
  minPx: number;
  /** Opacity of the soft band, the two edge lines and the chevrons. */
  fill: number;
  edge: number;
  chevron: number;
  /** Display-referred brightness of the band/edges and of the chevrons. */
  glow: number;
  chevronGlow: number;
  /** Chevron speed (m/s, in the walking direction). */
  speed: number;
}

/** The route network (no tour running). */
const NETWORK_STYLE: RibbonStyle = {
  width: 0.8,
  indoorWidth: 0.34,
  minPx: 4.5,
  fill: 0.2,
  edge: 0.72,
  chevron: 0.92,
  glow: 1.0,
  chevronGlow: 1.8,
  speed: 1.25,
};

/** The running tour's route: a little wider and brighter; indoors a slim floor guide line. */
const ACTIVE_STYLE: RibbonStyle = {
  width: 0.95,
  indoorWidth: 0.36,
  minPx: 5.5,
  fill: 0.24,
  edge: 0.8,
  chevron: 0.95,
  glow: 1.15,
  chevronGlow: 2.3,
  speed: 1.7,
};

/** Metres between ribbon samples. */
const STEP = 0.4;
/** Lift above the walking surface (m). */
const LIFT = 0.02;

// ── Pure helpers (exported for tests) ────────────────────────────────────────

/** "120 m · 2 min" — whole minutes above 10, one decimal below, seconds under a minute. */
export function formatLegDistance(lengthM: number, minutes: number): string {
  const metres = lengthM >= 100 ? Math.round(lengthM / 10) * 10 : Math.round(lengthM);
  let time: string;
  if (minutes < 1) time = `${Math.max(5, Math.round((minutes * 60) / 5) * 5)} s`;
  else if (minutes >= 10) time = `${Math.round(minutes)} min`;
  else {
    const m = Math.round(minutes * 10) / 10;
    time = `${Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1)} min`;
  }
  return `${metres} m · ${time}`;
}

/** Arc length at each point of a 3D polyline (plan distance; stairs count by their run). */
export function planLengths(points: readonly V3[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) {
    out.push(out[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][2] - points[i - 1][2]));
  }
  return out;
}

export interface RouteSample {
  /** Point on the walking surface (y = floor/ground, no lift). */
  p: V3;
  /** The route's own walking height here (routes.json / building legs): the hint for the surface probe. */
  route: number;
  /** Metres along the leg (chevron phase). */
  u: number;
  /** Horizontal unit direction of travel. */
  dir: V2;
  /** 1 inside a hero building (floor guide line), 0 outdoors. */
  indoor: number;
}

/**
 * Sample a route polyline the way the tour walker walks it: the tour's own
 * smoothing (rounded corners, Catmull-Rom — nav/tour.ts) every `step` metres.
 */
export function sampleRoute(points: readonly V3[], step = STEP): RouteSample[] {
  if (points.length < 2) return [];
  const curve = buildTourCurve(points.map((p) => [p[0], p[1], p[2]] as V3));
  const n = Math.max(2, Math.ceil(curve.length / step) + 1);
  const out: RouteSample[] = [];
  let u = 0;
  let prev: V3 | null = null;
  for (let i = 0; i < n; i++) {
    const s = (curve.length * i) / (n - 1);
    const p = curve.pointAt(s, [0, 0, 0]);
    if (prev) u += Math.hypot(p[0] - prev[0], p[2] - prev[2]);
    out.push({ p, route: p[1], u, dir: curve.directionAt(s), indoor: 0 });
    prev = p;
  }
  return out;
}

export interface Run {
  /** Index of the leg in the input list. */
  leg: number;
  /** First and last sample (inclusive). */
  from: number;
  to: number;
  /** The run starts / ends where it merges into a ribbon drawn earlier (fade there). */
  joinStart: boolean;
  joinEnd: boolean;
}

/**
 * Split legs into the runs that still need drawing: a sample is covered when a
 * sample of an earlier leg lies within `radius` (plan), within 1.2 m in height
 * and runs (anti)parallel — shared pavements are drawn once, by the first leg.
 * Runs are extended `overlap` samples into the ribbon they join so the two
 * meet without a gap; slivers shorter than `minLength` m are dropped.
 */
export function dedupeRuns(
  legs: readonly RouteSample[][],
  opts: { radius?: number; cosMin?: number; overlap?: number; minLength?: number } = {},
): Run[] {
  const radius = opts.radius ?? 0.85;
  const cosMin = opts.cosMin ?? 0.55;
  const overlap = opts.overlap ?? 3;
  const minLength = opts.minLength ?? 1.6;
  const cell = 2;
  const grid = new Map<string, RouteSample[]>();
  const keyOf = (x: number, z: number) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  const covered = (s: RouteSample): boolean => {
    const cx = Math.floor(s.p[0] / cell);
    const cz = Math.floor(s.p[2] / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const list = grid.get(`${cx + dx},${cz + dz}`);
        if (!list) continue;
        for (const o of list) {
          if (Math.hypot(o.p[0] - s.p[0], o.p[2] - s.p[2]) > radius) continue;
          if (Math.abs(o.p[1] - s.p[1]) > 1.2) continue;
          if (Math.abs(o.dir[0] * s.dir[0] + o.dir[1] * s.dir[1]) < cosMin) continue;
          return true;
        }
      }
    }
    return false;
  };
  const runs: Run[] = [];
  legs.forEach((samples, leg) => {
    const flags = samples.map(covered);
    let i = 0;
    while (i < samples.length) {
      if (flags[i]) {
        i++;
        continue;
      }
      let j = i;
      while (j + 1 < samples.length && !flags[j + 1]) j++;
      const joinStart = i > 0;
      const joinEnd = j < samples.length - 1;
      const from = joinStart ? Math.max(0, i - overlap) : i;
      const to = joinEnd ? Math.min(samples.length - 1, j + overlap) : j;
      if (samples[to].u - samples[from].u >= minLength) runs.push({ leg, from, to, joinStart, joinEnd });
      i = j + 1;
    }
    // This leg now covers its whole length for the legs after it.
    for (const s of samples) {
      const k = keyOf(s.p[0], s.p[2]);
      const list = grid.get(k);
      if (list) list.push(s);
      else grid.set(k, [s]);
    }
  });
  return runs;
}

/**
 * The outdoor part of a leg: drop the samples at its start and end that lie
 * inside a building (routes.json lets outdoor legs begin and end at the door
 * point inside the glass, e.g. EduCity's pavilion; the network shows outdoors).
 */
export function outdoorSpan(samples: readonly RouteSample[], inside: (x: number, z: number) => boolean): [number, number] {
  let a = 0;
  let b = samples.length - 1;
  while (a < b && inside(samples[a].p[0], samples[a].p[2])) a++;
  while (b > a && inside(samples[b].p[0], samples[b].p[2])) b--;
  return [a, b];
}

/**
 * Upper envelope then box blur of a height profile (samples `step` m apart):
 * on stairs the ribbon rides the nosings (a straight pitch line) instead of a
 * saw-tooth, over a kerb it eases across; on flat ground nothing changes.
 */
export function envelopeHeights(ys: readonly number[], step = STEP, reach = 0.35, blur = 0.45): number[] {
  const n = ys.length;
  const r = Math.max(0, Math.round(reach / step));
  const b = Math.max(0, Math.round(blur / step));
  const env = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let m = -Infinity;
    for (let k = Math.max(0, i - r); k <= Math.min(n - 1, i + r); k++) m = Math.max(m, ys[k]);
    env[i] = m;
  }
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    let c = 0;
    for (let k = Math.max(0, i - b); k <= Math.min(n - 1, i + b); k++) {
      s += env[k];
      c++;
    }
    // Never below the surface itself.
    out[i] = Math.max(ys[i], s / c);
  }
  return out;
}

/** Fade (0..1) of each sample of a run: in/out over `fadeEnd` m at true ends, over the overlap at joins. */
export function runFades(u: readonly number[], joinStart: boolean, joinEnd: boolean, fadeEnd = 0.6, fadeJoin = 1.1): number[] {
  const u0 = u[0];
  const u1 = u[u.length - 1];
  const fs = joinStart ? fadeJoin : fadeEnd;
  const fe = joinEnd ? fadeJoin : fadeEnd;
  return u.map((x) => {
    const a = fs > 0 ? Math.min(1, (x - u0) / fs) : 1;
    const b = fe > 0 ? Math.min(1, (u1 - x) / fe) : 1;
    const t = Math.max(0, Math.min(a, b));
    return t * t * (3 - 2 * t);
  });
}

// ── Surface probe ────────────────────────────────────────────────────────────

/**
 * Heights of the walkable surfaces the other modules modelled (ground, kerbs,
 * decks, stairs, terraces, floors) in a set of 1 m cells around the routes and
 * the event dressing. Built from the scene's triangles, so it follows whatever
 * the ground and building modules made — not just the DTM.
 */
export class SurfaceIndex {
  private readonly cells = new Map<number, number[]>();
  private tris = new Float32Array(9 * 4096);
  private count = 0;
  /** Bumps on every rebuild (consumers re-settle when it changes). */
  version = 0;

  static key(ix: number, iz: number): number {
    return (ix + 4096) * 8192 + (iz + 4096);
  }

  get triangleCount(): number {
    return this.count;
  }

  /** Add one triangle (world coordinates) to every wanted cell its plan bounds touch. */
  add(ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number, wanted: ReadonlySet<number>): void {
    const x0 = Math.floor(Math.min(ax, bx, cx));
    const x1 = Math.floor(Math.max(ax, bx, cx));
    const z0 = Math.floor(Math.min(az, bz, cz));
    const z1 = Math.floor(Math.max(az, bz, cz));
    let id = -1;
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const k = SurfaceIndex.key(ix, iz);
        if (!wanted.has(k)) continue;
        if (id < 0) {
          if ((this.count + 1) * 9 > this.tris.length) {
            const bigger = new Float32Array(this.tris.length * 2);
            bigger.set(this.tris);
            this.tris = bigger;
          }
          id = this.count++;
          this.tris.set([ax, ay, az, bx, by, bz, cx, cy, cz], id * 9);
        }
        const list = this.cells.get(k);
        if (list) list.push(id);
        else this.cells.set(k, [id]);
      }
    }
  }

  /**
   * The walking surface at (x, z) nearest to `hint` within [hint − below, hint + above]
   * (canopies, bridges and roofs above, car parks below are ignored). Layers a few
   * centimetres apart (paving laid over the ground, a doormat, road paint) count as
   * one surface and its top is returned — overlays must sit on what is visible.
   */
  heightAt(x: number, z: number, hint: number, below = 0.9, above = 0.6): number | null {
    const list = this.cells.get(SurfaceIndex.key(Math.floor(x), Math.floor(z)));
    if (!list) return null;
    const t = this.tris;
    const ys: number[] = [];
    for (const id of list) {
      const o = id * 9;
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
      const y = l1 * t[o + 1] + l2 * t[o + 4] + l3 * t[o + 7];
      if (y >= hint - below && y <= hint + above) ys.push(y);
    }
    if (!ys.length) return null;
    // Nearest surface to the hint (one a little above costs a little more)…
    let best = ys[0];
    let bestCost = Infinity;
    for (const y of ys) {
      const cost = Math.abs(y - hint) + (y > hint ? 0.05 : 0);
      if (cost < bestCost) {
        bestCost = cost;
        best = y;
      }
    }
    // …and the top of its layer stack.
    let top = best;
    for (const y of ys) if (y > top && y - best <= LAYER) top = y;
    return top;
  }
}

/** Surfaces closer than this (m) are layers of one floor (paving over ground, mats, paint). */
const LAYER = 0.2;

/** Cell keys within `radius` m of each point. */
export function cellsAround(points: Iterable<V2>, radius: number, into = new Set<number>()): Set<number> {
  const r = Math.ceil(radius);
  for (const [x, z] of points) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) into.add(SurfaceIndex.key(ix + dx, iz + dz));
  }
  return into;
}

/** Marks an object tree as ours: the surface probe never reads it (decals, ribbons, signs). */
export const PROBE_IGNORE = "twinProbeIgnore";

/** Walkable-ish triangles (|normal.y| ≥ this) are indexed; walls and steep faces are not. */
const MIN_NORMAL_Y = 0.35;

/**
 * Index the walkable triangles of every visible, opaque, non-instanced mesh in
 * `scene` that touch the wanted cells. Yields to the event loop every ~60k
 * triangles so loading stays responsive.
 */
export async function buildSurfaceIndex(scene: THREE.Object3D, wanted: ReadonlySet<number>, shouldStop: () => boolean = () => false): Promise<SurfaceIndex | null> {
  const index = new SurfaceIndex();
  if (wanted.size === 0) return index;
  // Bounds of the wanted cells (cheap per-mesh rejection).
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const k of wanted) {
    const ix = Math.floor(k / 8192) - 4096;
    const iz = (k % 8192) - 4096;
    minX = Math.min(minX, ix);
    maxX = Math.max(maxX, ix + 1);
    minZ = Math.min(minZ, iz);
    maxZ = Math.max(maxZ, iz + 1);
  }
  const meshes: THREE.Mesh[] = [];
  const stack: THREE.Object3D[] = [scene];
  while (stack.length) {
    const o = stack.pop() as THREE.Object3D;
    if (!o.visible || o.userData[PROBE_IGNORE]) continue;
    if (o.name === "sky-system" || o.name === "tour-walker") continue;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !(o as THREE.InstancedMesh).isInstancedMesh && !(o as THREE.SkinnedMesh).isSkinnedMesh) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const solid = mats.some((m) => m && m.visible && !(m.transparent && m.opacity < 0.6) && (m as THREE.ShaderMaterial).isShaderMaterial !== true);
      const geo = mesh.geometry;
      if (solid && geo?.getAttribute("position") && !(geo as THREE.InstancedBufferGeometry).isInstancedBufferGeometry) meshes.push(mesh);
    }
    for (const c of o.children) stack.push(c);
  }
  const box = new THREE.Box3();
  const e = new Float64Array(16);
  let work = 0;
  for (const mesh of meshes) {
    if (shouldStop()) return null;
    const geo = mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    if (!geo.boundingBox) continue;
    mesh.updateWorldMatrix(true, false);
    box.copy(geo.boundingBox).applyMatrix4(mesh.matrixWorld);
    if (box.max.x < minX || box.min.x > maxX || box.max.z < minZ || box.min.z > maxZ) continue;
    const pos = geo.getAttribute("position");
    const idx = geo.getIndex();
    e.set(mesh.matrixWorld.elements);
    const identity = mesh.matrixWorld.equals(IDENTITY);
    const start = geo.drawRange.start;
    const total = idx ? idx.count : pos.count;
    const end = Math.min(total, start + (Number.isFinite(geo.drawRange.count) ? geo.drawRange.count : total));
    const v = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = start; i + 2 < end; i += 3) {
      for (let c = 0; c < 3; c++) {
        const vi = idx ? idx.getX(i + c) : i + c;
        const x = pos.getX(vi);
        const y = pos.getY(vi);
        const z = pos.getZ(vi);
        if (identity) {
          v[c * 3] = x;
          v[c * 3 + 1] = y;
          v[c * 3 + 2] = z;
        } else {
          v[c * 3] = e[0] * x + e[4] * y + e[8] * z + e[12];
          v[c * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13];
          v[c * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        }
      }
      // Plan bounds outside the wanted area: skip early.
      const tminX = Math.min(v[0], v[3], v[6]);
      const tmaxX = Math.max(v[0], v[3], v[6]);
      const tminZ = Math.min(v[2], v[5], v[8]);
      const tmaxZ = Math.max(v[2], v[5], v[8]);
      if (tmaxX < minX || tminX > maxX || tmaxZ < minZ || tminZ > maxZ) continue;
      // Normal: keep upward/downward facing (floors, treads, decks — either winding).
      const ux = v[3] - v[0];
      const uy = v[4] - v[1];
      const uz = v[5] - v[2];
      const wx = v[6] - v[0];
      const wy = v[7] - v[1];
      const wz = v[8] - v[2];
      const nx = uy * wz - uz * wy;
      const ny = uz * wx - ux * wz;
      const nz = ux * wy - uy * wx;
      const nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-10 || Math.abs(ny) / nl < MIN_NORMAL_Y) continue;
      index.add(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], wanted);
    }
    work += (end - start) / 3;
    if (work > 60000) {
      work = 0;
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }
  return index;
}

const IDENTITY = new THREE.Matrix4();

type SurfaceListener = (index: SurfaceIndex) => void;

/**
 * One probe for the event dressing and the routes (whichever module loads):
 * modules attach their root (the probe reads the scene it lands in), ask for
 * the cells they stand on, and are told when a new index is ready. The probe
 * re-runs (debounced) when modules are added to the scene.
 */
class SurfaceService {
  private roots = new Set<THREE.Object3D>();
  private wanted = new Set<number>();
  private listeners = new Set<SurfaceListener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastCount = -1;
  private changedAt = 0;
  private dirty = true;
  private running = false;
  private paused = false;
  private disposed = false;
  private settledWaiters: (() => void)[] = [];
  private startedAt = 0;
  index: SurfaceIndex | null = null;

  attach(root: THREE.Object3D): void {
    this.roots.add(root);
    this.disposed = false;
    if (!this.timer) {
      this.startedAt = performance.now();
      this.timer = setInterval(() => this.poll(), 250);
    }
  }

  detach(root: THREE.Object3D): void {
    this.roots.delete(root);
    if (this.roots.size === 0) {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.index = null;
      this.lastCount = -1;
      this.dirty = true;
      this.disposed = true;
      this.wanted.clear();
      this.listeners.clear();
      for (const w of this.settledWaiters.splice(0)) w();
    }
  }

  /** Cells (around points) the caller needs heights for; triggers a rebuild when new. */
  request(points: Iterable<V2>, radius: number): void {
    const before = this.wanted.size;
    cellsAround(points, radius, this.wanted);
    if (this.wanted.size !== before) this.dirty = true;
  }

  listen(fn: SurfaceListener): () => void {
    this.listeners.add(fn);
    if (this.index) fn(this.index);
    return () => this.listeners.delete(fn);
  }

  /**
   * Probe again soon (debounced like a scene change): what is visible may have changed since the last
   * scan — e.g. a building's interior, hidden while the camera was far, is on for a tour now.
   */
  refresh(): void {
    this.dirty = true;
    this.changedAt = performance.now();
  }

  /** Hold re-probing (e.g. while a tour avatar walks — it is not a module). */
  pause(on: boolean): void {
    this.paused = on;
  }

  /** Resolves once a probe has run on a settled scene (or after 15 s). */
  settled(): Promise<void> {
    return new Promise((resolve) => {
      if (this.index && !this.dirty) resolve();
      else this.settledWaiters.push(resolve);
    });
  }

  private scene(): THREE.Object3D | null {
    for (const r of this.roots) {
      let o: THREE.Object3D = r;
      while (o.parent) o = o.parent;
      if (o !== r && (o as THREE.Scene).isScene) return o;
    }
    return null;
  }

  private poll(): void {
    if (this.disposed || this.running) return;
    const scene = this.scene();
    const now = performance.now();
    if (now - this.startedAt > 15000 && this.settledWaiters.length) for (const w of this.settledWaiters.splice(0)) w();
    if (!scene) return;
    const count = scene.children.length;
    if (count !== this.lastCount && !this.paused) {
      this.lastCount = count;
      this.changedAt = now;
      this.dirty = true;
      return;
    }
    if (!this.dirty || now - this.changedAt < 700) return;
    this.dirty = false;
    this.running = true;
    void buildSurfaceIndex(scene, this.wanted, () => this.disposed)
      .then((index) => {
        if (!index || this.disposed) return;
        index.version = (this.index?.version ?? 0) + 1;
        this.index = index;
        for (const fn of this.listeners) {
          try {
            fn(index);
          } catch {
            // A listener's failure must not stop the others.
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        this.running = false;
        if (!this.dirty) for (const w of this.settledWaiters.splice(0)) w();
      });
  }
}

/** Shared by world/event.ts and world/routes.ts (one scan of the scene for both). */
export const surfaceService = new SurfaceService();

// ── Display-referred brightness ──────────────────────────────────────────────

/**
 * Keeps an unlit overlay at a fixed brightness on screen: every frame the
 * material's `uGain` = 1 / camera exposure (pipeline: AgX after exposure), and
 * `uPxAngle` = view angle of one CSS pixel (for minimum on-screen widths).
 */
export function displayReferred(mesh: THREE.Object3D, uniforms: { uGain: THREE.IUniform<number>; uPxAngle?: THREE.IUniform<number> }, dim: () => number = () => 1): void {
  const size = new THREE.Vector2();
  mesh.onBeforeRender = (renderer, _scene, camera) => {
    const exposure = renderer.toneMappingExposure > 0 ? renderer.toneMappingExposure : 1;
    uniforms.uGain.value = dim() / exposure;
    if (uniforms.uPxAngle) {
      const cam = camera as THREE.PerspectiveCamera;
      // CSS size from setSize (no layout read — labels are moved every frame).
      const h = Math.max(1, renderer.getSize(size).y);
      uniforms.uPxAngle.value = cam.isPerspectiveCamera ? (2 * Math.tan((cam.fov * Math.PI) / 360)) / h : 0.002;
    }
  };
}

// ── Ribbon shader ────────────────────────────────────────────────────────────

const RIBBON_VERTEX = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
uniform float uWidth;
uniform float uIndoorWidth;
uniform float uMinPx;
uniform float uPxAngle;
uniform float uLift;
attribute float aSide;
attribute vec2 aLat;
attribute float aAlong;
attribute float aFade;
attribute float aIndoor;
varying float vAcross;
varying float vAlong;
varying float vWidth;
varying float vFade;
varying float vIndoor;
varying float vPxM;
varying float vNear;
void main() {
	vec4 world = modelMatrix * vec4( position, 1.0 );
	float dist = max( distance( cameraPosition, world.xyz ), 0.05 );
	// Metres covered by one CSS pixel at this distance.
	float pxM = dist * uPxAngle;
	float base = mix( uWidth, uIndoorWidth, aIndoor );
	float width = max( base, uMinPx * pxM );
	world.xz += aLat * aSide * 0.5 * width;
	// Lift grows a little with distance (depth precision); never visible as a float.
	world.y += uLift + dist * 0.00025;
	vec4 mvPosition = viewMatrix * world;
	// Depth bias: slide along the view ray towards the camera — same pixel, nearer depth.
	mvPosition.xyz *= 1.0 - min( 0.0009 + 0.012 / dist, 0.5 );
	gl_Position = projectionMatrix * mvPosition;
	vAcross = aSide;
	vAlong = aAlong;
	vWidth = width;
	vFade = aFade;
	vIndoor = aIndoor;
	vPxM = pxM;
	// Subtle up close: dim within a few metres of the camera (you walk on it, you don't need it shouting) —
	// less so indoors, where the slim guide line on a light floor is all there is to follow.
	vNear = mix( mix( 0.38, 0.75, aIndoor ), 1.0, smoothstep( 2.0, 18.0, dist ) );
	#include <fog_vertex>
}
`;

const RIBBON_FRAGMENT = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uFillColor;
uniform vec3 uEdgeColor;
uniform vec3 uGlowColor;
uniform float uGain;
uniform float uTime;
uniform float uSpeed;
uniform float uOpacity;
uniform float uFill;
uniform float uEdge;
uniform float uChevron;
uniform float uGlow;
uniform float uChevronGlow;
uniform float uChevronsOn;
varying float vAcross;
varying float vAlong;
varying float vWidth;
varying float vFade;
varying float vIndoor;
varying float vPxM;
varying float vNear;

vec4 over( vec4 dst, vec3 c, float a ) {
	return vec4( dst.rgb * ( 1.0 - a ) + c * a, dst.a * ( 1.0 - a ) + a );
}

void main() {
	float a = abs( vAcross );
	float aaA = max( fwidth( vAcross ), 1e-4 );
	float px = vWidth / max( vPxM, 1e-5 );
	// Chevrons need ≈ 12 px of ribbon; thinner, the ribbon folds into a solid line.
	float lod = smoothstep( 7.0, 15.0, px );
	// Soft band with a feathered edge, a little stronger along the middle.
	float band = 1.0 - smoothstep( 1.0 - 2.5 * aaA, 1.0, a );
	// Indoors the line lies on light floors (terrazzo, concrete): a denser, deeper violet keeps it legible.
	float fill = uFill * mix( 1.0, 2.6, vIndoor ) * band * mix( 0.55, 1.0, 1.0 - a ) * mix( 0.6, 1.0, vNear );
	// Two thin edge lines (≈ 6 % of the width each), anti-aliased.
	float e0 = 0.8;
	float e1 = 0.91;
	float edge = smoothstep( e0 - aaA, e0 + aaA, a ) * ( 1.0 - smoothstep( e1 - aaA, e1 + aaA, a ) );
	edge *= uEdge * lod * mix( 0.55, 1.0, vNear );
	// Chevrons (›) pointing along the walk, moving with it. Spacing in metres scales with the width.
	float spacing = max( vWidth * 2.3, 0.75 );
	float s = ( vAlong - uTime * uSpeed ) / spacing;
	float f = fract( s );
	float halfW = 0.5 * vWidth;
	float back = a * halfW * 0.95 / spacing;
	float d = f - 0.55 + back;
	float thick = clamp( 0.085 * vWidth / spacing, 0.03, 0.2 );
	float aaS = max( fwidth( s ), 1e-4 ) * 1.2;
	float chev = 1.0 - smoothstep( thick - aaS, thick + aaS, abs( d ) );
	chev *= 1.0 - smoothstep( 0.6, 0.68, a );
	// A short comet tail behind each chevron reads as motion even in a still frame.
	float lead = 0.55 - back;
	float tail = smoothstep( lead - 0.42, lead - thick, f ) * step( f, lead - thick ) * ( 1.0 - smoothstep( 0.2, 0.6, a ) );
	chev = max( chev, tail * 0.2 );
	chev *= uChevron * lod * uChevronsOn;
	// Far: a bright core line with a dark casing, like a route on a map.
	float far = 1.0 - lod;
	float core = far * ( 1.0 - smoothstep( 0.5 - aaA, 0.58 + aaA, a ) );
	float casing = far * band * 0.5;

	vec4 acc = vec4( 0.0 );
	acc = over( acc, uFillColor * uGlow * mix( 0.7, 0.45, vIndoor ), fill );
	acc = over( acc, uEdgeColor * uGlow * 1.25, edge );
	acc = over( acc, vec3( 0.012, 0.008, 0.035 ), casing );
	acc = over( acc, mix( uEdgeColor, uGlowColor, 0.12 ) * uGlow * 1.3, core );
	acc = over( acc, uGlowColor * uChevronGlow * mix( 0.65, 1.0, vNear ), chev );
	float alpha = acc.a * vFade * uOpacity * mix( 1.0, vNear, lod );
	vec3 color = acc.rgb / max( acc.a, 1e-4 );
	gl_FragColor = vec4( color * uGain, alpha );
	#include <fog_fragment>
}
`;

interface RibbonUniforms {
  [name: string]: THREE.IUniform;
  uWidth: THREE.IUniform<number>;
  uIndoorWidth: THREE.IUniform<number>;
  uMinPx: THREE.IUniform<number>;
  uPxAngle: THREE.IUniform<number>;
  uLift: THREE.IUniform<number>;
  uFillColor: THREE.IUniform<THREE.Color>;
  uEdgeColor: THREE.IUniform<THREE.Color>;
  uGlowColor: THREE.IUniform<THREE.Color>;
  uGain: THREE.IUniform<number>;
  uTime: THREE.IUniform<number>;
  uSpeed: THREE.IUniform<number>;
  uOpacity: THREE.IUniform<number>;
  uFill: THREE.IUniform<number>;
  uEdge: THREE.IUniform<number>;
  uChevron: THREE.IUniform<number>;
  uGlow: THREE.IUniform<number>;
  uChevronGlow: THREE.IUniform<number>;
  uChevronsOn: THREE.IUniform<number>;
}

function ribbonMaterial(style: RibbonStyle): THREE.ShaderMaterial & { uniforms: RibbonUniforms } {
  const uniforms: RibbonUniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uWidth: { value: style.width },
    uIndoorWidth: { value: style.indoorWidth },
    uMinPx: { value: style.minPx },
    uPxAngle: { value: 0.0012 },
    uLift: { value: LIFT },
    uFillColor: { value: VIOLET_STRONG.clone() },
    uEdgeColor: { value: VIOLET.clone() },
    uGlowColor: { value: VIOLET_GLOW.clone() },
    uGain: { value: 1 },
    uTime: { value: 0 },
    uSpeed: { value: style.speed },
    uOpacity: { value: 1 },
    uFill: { value: style.fill },
    uEdge: { value: style.edge },
    uChevron: { value: style.chevron },
    uGlow: { value: style.glow },
    uChevronGlow: { value: style.chevronGlow },
    uChevronsOn: { value: 1 },
  };
  const m = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: RIBBON_VERTEX,
    fragmentShader: RIBBON_FRAGMENT,
    transparent: true,
    depthWrite: false,
    fog: true,
    side: THREE.DoubleSide,
    // Flat on the ground: one pass (no back-then-front split for double-sided transparency).
    forceSinglePass: true,
  });
  m.name = "route-ribbon";
  return m as THREE.ShaderMaterial & { uniforms: RibbonUniforms };
}

/** One ribbon piece: samples with heights, per-sample fade, indoor flag. */
export interface RibbonPiece {
  samples: RouteSample[];
  fades: number[];
}

/**
 * Ribbon geometry for pieces of route: two vertices per sample on the centre
 * line (pushed sideways in the shader) with the lateral mitre direction, the
 * distance along the leg, the fade and the indoor flag.
 */
export function ribbonGeometry(pieces: readonly RibbonPiece[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const side: number[] = [];
  const lat: number[] = [];
  const along: number[] = [];
  const fade: number[] = [];
  const indoor: number[] = [];
  const index: number[] = [];
  for (const piece of pieces) {
    const s = piece.samples;
    const base = pos.length / 3;
    for (let i = 0; i < s.length; i++) {
      const prev = s[Math.max(0, i - 1)];
      const next = s[Math.min(s.length - 1, i + 1)];
      let tx = next.p[0] - prev.p[0];
      let tz = next.p[2] - prev.p[2];
      let tl = Math.hypot(tx, tz);
      if (tl < 1e-6) {
        tx = s[i].dir[0];
        tz = s[i].dir[1];
        tl = Math.hypot(tx, tz) || 1;
      }
      tx /= tl;
      tz /= tl;
      // Left of travel seen from above (+z south): (tz, −tx). Samples follow a smooth curve, so no mitre is needed.
      const lx = tz;
      const lz = -tx;
      for (const sd of [1, -1]) {
        pos.push(s[i].p[0], s[i].p[1], s[i].p[2]);
        side.push(sd);
        lat.push(lx, lz);
        along.push(s[i].u);
        fade.push(piece.fades[i] ?? 1);
        indoor.push(s[i].indoor);
      }
      if (i > 0) {
        const a0 = base + (i - 1) * 2;
        const b0 = base + i * 2;
        index.push(a0, a0 + 1, b0, b0, a0 + 1, b0 + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aSide", new THREE.Float32BufferAttribute(side, 1));
  g.setAttribute("aLat", new THREE.Float32BufferAttribute(lat, 2));
  g.setAttribute("aAlong", new THREE.Float32BufferAttribute(along, 1));
  g.setAttribute("aFade", new THREE.Float32BufferAttribute(fade, 1));
  g.setAttribute("aIndoor", new THREE.Float32BufferAttribute(indoor, 1));
  g.setIndex(index);
  return g;
}

// ── Pins (start / finish markers) ────────────────────────────────────────────

const PIN_VERTEX = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
uniform float uPxAngle;
uniform float uTime;
attribute vec3 aCenter;
// x: kind (0 start, 1 finish), y: shown (0/1), z: active (0/1), w: phase
attribute vec4 aPin;
varying vec2 vUv;
varying vec4 vPin;
varying float vNear;
void main() {
	float dist = max( distance( cameraPosition, aCenter ), 0.1 );
	float pxM = dist * uPxAngle;
	// ≈ 1.6 m across, never smaller than 26 px.
	float radius = max( 0.8 + 0.25 * aPin.x, 13.0 * pxM ) * aPin.y;
	vec3 world = aCenter + vec3( position.x * radius, 0.0, position.z * radius );
	world.y += 0.025 + dist * 0.0003;
	vec4 mvPosition = viewMatrix * vec4( world, 1.0 );
	mvPosition.xyz *= 1.0 - min( 0.0012 + 0.015 / dist, 0.5 );
	gl_Position = projectionMatrix * mvPosition;
	vUv = position.xz;
	vPin = aPin;
	vNear = mix( 0.55, 1.0, smoothstep( 3.0, 16.0, dist ) );
	#include <fog_vertex>
}
`;

const PIN_FRAGMENT = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
uniform vec3 uGlowColor;
uniform float uGain;
uniform float uTime;
varying vec2 vUv;
varying vec4 vPin;
varying float vNear;
float ring( float r, float c, float w, float aa ) {
	return smoothstep( c - w - aa, c - w + aa, r ) * ( 1.0 - smoothstep( c + w - aa, c + w + aa, r ) );
}
void main() {
	float r = length( vUv );
	if ( r > 1.0 || vPin.y < 0.5 ) discard;
	float aa = max( fwidth( r ), 1e-4 ) * 1.2;
	float finish = vPin.x;
	float disc = ( 1.0 - smoothstep( 0.8 - aa, 0.8 + aa, r ) ) * 0.2;
	float outer = ring( r, 0.74, 0.055, aa );
	float inner = mix( 1.0 - smoothstep( 0.2 - aa, 0.2 + aa, r ), ring( r, 0.42, 0.06, aa ) + ( 1.0 - smoothstep( 0.13 - aa, 0.13 + aa, r ) ), finish );
	// The active tour's finish pulses outwards (a static ring when motion is reduced: uTime frozen).
	float p = fract( uTime * 0.55 + vPin.w );
	float pulse = vPin.z * finish * ring( r, 0.35 + 0.6 * p, 0.04, aa ) * ( 1.0 - p ) * 0.9;
	float halo = ( 1.0 - smoothstep( 0.78, 1.0, r ) ) * smoothstep( 0.6, 0.85, r ) * 0.25;
	float a = clamp( disc + outer * 0.95 + inner * 0.95 + pulse + halo, 0.0, 1.0 );
	vec3 c = mix( uColor * 1.2, uGlowColor * 2.2, clamp( outer + inner + pulse, 0.0, 1.0 ) );
	gl_FragColor = vec4( c * uGain, a * vNear );
	#include <fog_fragment>
}
`;

const BEAM_VERTEX = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
uniform float uPxAngle;
attribute vec3 aCenter;
attribute vec4 aPin;
varying vec2 vUv;
varying float vShow;
varying float vActive;
void main() {
	float dist = max( distance( cameraPosition, aCenter ), 0.1 );
	float pxM = dist * uPxAngle;
	// Light column: ≈ 5 m tall, taller from far so a pin reads like a map pin; ≥ 3 px wide.
	float height = mix( 4.0, 5.5, aPin.z ) * max( 1.0, dist / 140.0 );
	float width = max( 0.22, 3.0 * pxM );
	vec3 toCam = cameraPosition - aCenter;
	vec2 right = normalize( vec2( -toCam.z, toCam.x ) + vec2( 1e-5, 0.0 ) );
	vec3 world = aCenter + vec3( right.x * position.x * width, position.y * height * aPin.y, right.y * position.x * width );
	vec4 mvPosition = viewMatrix * vec4( world, 1.0 );
	gl_Position = projectionMatrix * mvPosition;
	vUv = vec2( position.x * 2.0, position.y );
	vShow = aPin.y;
	vActive = aPin.z;
	#include <fog_vertex>
}
`;

const BEAM_FRAGMENT = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
uniform float uGain;
varying vec2 vUv;
varying float vShow;
varying float vActive;
void main() {
	if ( vShow < 0.5 ) discard;
	float across = 1.0 - smoothstep( 0.15, 1.0, abs( vUv.x ) );
	float up = pow( 1.0 - clamp( vUv.y, 0.0, 1.0 ), 1.6 );
	float a = across * up * mix( 0.45, 0.7, vActive );
	gl_FragColor = vec4( uColor * uGain * a, 1.0 );
	#include <fog_fragment>
}
`;

// ── Tours and pins ───────────────────────────────────────────────────────────

/** Overview priority: partner arrivals first (they own shared pavements), then builders. */
function tourPriority(t: Tour3D): number {
  if (t.id.startsWith("companies-") || t.id.startsWith("partners-")) return 0;
  return 1;
}

/** Short names of transport start points (route network pins). */
const START_NAMES: { at: V2; name: string; detail: string }[] = [
  { at: [218.9, -111.5], name: "Kupittaa platform", detail: "trains" },
  { at: [155.4, -153.5], name: "Station hall", detail: "bus 3 / 3A" },
  { at: [215.5, 6.2], name: "ParkCity", detail: "street door" },
  { at: [198.5, -7.4], name: "ParkCity", detail: "south-west door" },
  { at: [-35.6, -22.0], name: "Drop-off", detail: "Tykistökatu" },
];

function startName(at: V2): { name: string; detail: string } | null {
  for (const s of START_NAMES) if (Math.hypot(s.at[0] - at[0], s.at[1] - at[1]) < 4) return s;
  return null;
}

/** Where a leg's text marker goes: the middle of its longest run. */
function markerSample(samples: RouteSample[], runs: Run[]): RouteSample | null {
  let best: Run | null = null;
  for (const r of runs) if (!best || samples[r.to].u - samples[r.from].u > samples[best.to].u - samples[best.from].u) best = r;
  if (!best) return null;
  const mid = (samples[best.from].u + samples[best.to].u) / 2;
  let pick = samples[best.from];
  for (let i = best.from; i <= best.to; i++) if (Math.abs(samples[i].u - mid) < Math.abs(pick.u - mid)) pick = samples[i];
  return pick;
}

interface Pin {
  at: V3;
  kind: 0 | 1;
  /** Tours this pin belongs to (start or finish). */
  tours: Set<string>;
  /** Shown in the network (no tour running). */
  network: boolean;
}

/**
 * The partner arrival on Tykistökatu (SPEC §5.5, §6.3): from the far pavement, square on to the
 * recess — the drop-off kerb and its pin, the walk across the cycle path between the two cars, the
 * banners on the flagpoles, the revolving door under the canopy.
 */
export const ARRIVAL_VIEW: CameraView = {
  // 2.3 m south-west of the street lamp at (−47, −31.5) (City lamp register): its mast and sign arm
  // stay out of the frame.
  position: [-48.8, 6.5, -30.0],
  target: [-28.5, 1.8, -17],
  hfov: 66,
  fit: 15,
  // Phones: a drone's view over the street trees (portrait fits push the camera back).
  portrait: { position: [-44, 22, -34], target: [-29, 0.5, -18], fit: 11 },
  labels: true,
  open: null,
};

// ── The module ───────────────────────────────────────────────────────────────

/** world/routes.ts — arrival routes, distance markers, start/finish pins and the running tour's route. */
export async function buildRoutes(ctx: TwinContext): Promise<WorldModule> {
  const root = new THREE.Group();
  root.name = "routes";
  root.userData[PROBE_IGNORE] = true;
  const labels: CSS2DObject[] = [];

  const [routes, campus, terrain] = await Promise.all([
    loadRoutes(),
    loadCampus().catch(() => null as CampusData | null),
    loadTerrain().catch(() => null as Terrain | null),
  ]);

  const heroRings = heroFootprints(campus);
  const isIndoor = (x: number, z: number) => heroRings.some((r) => pointInRing([x, z], r.outer) && !r.holes.some((h) => pointInRing([x, z], h)));
  const groundAt = (x: number, z: number) => (terrain ? terrain.heightAt(x, z) : 0);

  // ── Network legs (outdoor legs of every tour, partner arrivals first) ──
  const tours = [...TOURS_3D].sort((a, b) => tourPriority(a) - tourPriority(b));
  const legIds: string[] = [];
  for (const t of tours) {
    for (const id of t.legs) {
      const leg = routes.legs[id];
      if (leg && leg.mode === "outdoor" && leg.points.length > 1 && !legIds.includes(id)) legIds.push(id);
    }
  }
  const legSamples = legIds.map((id) => {
    const all = sampleRoute(routes.legs[id].points);
    const [a, b] = outdoorSpan(all, isIndoor);
    return all.slice(a, b + 1);
  });
  // Before the probe has run: follow the DTM where the route is on the ground (not on decks, bridges, stairs).
  for (const samples of legSamples) for (const s of samples) s.p[1] = dtmOrRoute(s.p, groundAt);
  const runs = dedupeRuns(legSamples);

  // ── Materials and meshes ──
  const networkMat = ribbonMaterial(NETWORK_STYLE);
  const activeMat = ribbonMaterial(ACTIVE_STYLE);
  let night = ctx.lighting().night;
  const dimAtNight = () => 1 - 0.28 * night;
  const network = new THREE.Mesh(new THREE.BufferGeometry(), networkMat);
  network.name = "route-network";
  network.frustumCulled = false;
  network.renderOrder = -1;
  displayReferred(network, networkMat.uniforms, dimAtNight);
  const active = new THREE.Mesh(new THREE.BufferGeometry(), activeMat);
  active.name = "route-active";
  active.frustumCulled = false;
  active.renderOrder = 0;
  active.visible = false;
  displayReferred(active, activeMat.uniforms, dimAtNight);
  root.add(network, active);

  const rebuildNetwork = () => {
    const pieces: RibbonPiece[] = runs.map((r) => {
      const samples = legSamples[r.leg].slice(r.from, r.to + 1);
      return { samples, fades: runFades(samples.map((s) => s.u), r.joinStart, r.joinEnd) };
    });
    network.geometry.dispose();
    network.geometry = ribbonGeometry(pieces);
  };
  rebuildNetwork();

  // ── Pins ──
  const pins: Pin[] = [];
  const pinAt = (p: V3, kind: 0 | 1): Pin => {
    for (const q of pins) if (q.kind === kind && Math.hypot(q.at[0] - p[0], q.at[2] - p[2]) < 3) return q;
    const pin: Pin = { at: [p[0], p[1], p[2]], kind, tours: new Set(), network: false };
    pins.push(pin);
    return pin;
  };
  const tourEnds = new Map<string, { start: Pin; finish: Pin }>();
  for (const t of TOURS_3D) {
    const first = routes.legs[t.legs[0]];
    const last = routes.legs[t.legs[t.legs.length - 1]];
    if (!first || !last) continue;
    const startPoint = first.points[0];
    const endPoint = last.points[last.points.length - 1];
    const start = pinAt(startPoint, 0);
    const finish = pinAt(endPoint, 1);
    start.tours.add(t.id);
    finish.tours.add(t.id);
    tourEnds.set(t.id, { start, finish });
    // In the network: transport starts (outdoor first leg) and the outdoor legs' destinations.
    if (first.mode === "outdoor" && startName([startPoint[0], startPoint[2]])) start.network = true;
  }
  // Finish pins of the network: where outdoor legs reach an entrance (the door, or the glass line when
  // the leg runs on to a door point inside).
  legIds.forEach((id, i) => {
    const samples = legSamples[i];
    if (!samples.length) return;
    const end = samples[samples.length - 1].p;
    if (startName([end[0], end[2]])) return;
    const pin = pinAt(end, 1);
    pin.network = true;
  });

  const pinCount = Math.max(1, pins.length);
  const pinCenter = new Float32Array(pinCount * 3);
  const pinData = new Float32Array(pinCount * 4);
  const ringGeo = new THREE.InstancedBufferGeometry();
  {
    const quad = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
    ringGeo.index = quad.index;
    ringGeo.setAttribute("position", quad.getAttribute("position"));
    quad.dispose();
  }
  const beamGeo = new THREE.InstancedBufferGeometry();
  {
    const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    beamGeo.index = quad.index;
    beamGeo.setAttribute("position", quad.getAttribute("position"));
    quad.dispose();
  }
  const centerAttr = new THREE.InstancedBufferAttribute(pinCenter, 3);
  const pinAttr = new THREE.InstancedBufferAttribute(pinData, 4);
  centerAttr.setUsage(THREE.DynamicDrawUsage);
  pinAttr.setUsage(THREE.DynamicDrawUsage);
  for (const g of [ringGeo, beamGeo]) {
    g.setAttribute("aCenter", centerAttr);
    g.setAttribute("aPin", pinAttr);
    g.instanceCount = pins.length;
  }
  const pinUniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uColor: { value: VIOLET.clone() },
    uGlowColor: { value: VIOLET_GLOW.clone() },
    uGain: { value: 1 },
    uPxAngle: { value: 0.0012 },
    uTime: { value: 0 },
  };
  const ringMat = new THREE.ShaderMaterial({
    uniforms: pinUniforms,
    vertexShader: PIN_VERTEX,
    fragmentShader: PIN_FRAGMENT,
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  ringMat.name = "route-pin";
  const beamUniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uColor: { value: VIOLET.clone().lerp(VIOLET_GLOW, 0.35) },
    uGain: { value: 1 },
    uPxAngle: { value: 0.0012 },
  };
  const beamMat = new THREE.ShaderMaterial({
    uniforms: beamUniforms,
    vertexShader: BEAM_VERTEX,
    fragmentShader: BEAM_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    side: THREE.DoubleSide,
    forceSinglePass: true,
  });
  beamMat.name = "route-beam";
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.name = "route-pins";
  ringMesh.frustumCulled = false;
  ringMesh.renderOrder = 1;
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.name = "route-beams";
  beamMesh.frustumCulled = false;
  beamMesh.renderOrder = 2;
  displayReferred(ringMesh, pinUniforms, dimAtNight);
  displayReferred(beamMesh, beamUniforms, () => 0.9 * dimAtNight());
  root.add(ringMesh, beamMesh);

  let activeTour: string | null = null;
  const writePins = () => {
    pins.forEach((p, i) => {
      pinCenter.set([p.at[0], p.at[1], p.at[2]], i * 3);
      const ends = activeTour ? tourEnds.get(activeTour) : undefined;
      const shown = activeTour ? ends?.start === p || ends?.finish === p : p.network;
      const isActive = activeTour !== null && shown;
      pinData.set([p.kind, shown ? 1 : 0, isActive ? 1 : 0, (i * 0.37) % 1], i * 4);
    });
    centerAttr.needsUpdate = true;
    pinAttr.needsUpdate = true;
  };
  writePins();

  // ── Labels ──
  /**
   * Every label sits in its own holder group: the engine owns each label's `visible`
   * (labels toggle, view groups); hiding the holder hides it for our own reasons —
   * too far away, or another tour running.
   */
  interface Anchored {
    holder: THREE.Group;
    label: CSS2DObject;
    x: number;
    z: number;
    ground: number;
    above: number;
    /** Hide beyond this camera distance (m). */
    near: number;
  }
  const anchored: Anchored[] = [];
  const place = (label: CSS2DObject, parent: THREE.Object3D, at: V3, above: number, near = Infinity): Anchored => {
    const holder = new THREE.Group();
    holder.add(label);
    parent.add(holder);
    labels.push(label);
    const a: Anchored = { holder, label, x: at[0], z: at[2], ground: at[1], above, near };
    label.position.set(a.x, a.ground + a.above, a.z);
    anchored.push(a);
    return a;
  };
  const moveTo = (a: Anchored, at: V3) => {
    a.x = at[0];
    a.ground = at[1];
    a.z = at[2];
    a.label.position.set(a.x, a.ground + a.above, a.z);
  };
  const networkLabels = new THREE.Group();
  networkLabels.name = "route-network-labels";
  root.add(networkLabels);
  // Distance markers: one per network leg, on its own (not shared) stretch.
  legIds.forEach((id, i) => {
    const leg = routes.legs[id];
    // Short legs (the drop-off kerb → door) need no marker: their pins say it all.
    if (leg.lengthM < 40) return;
    const at = markerSample(
      legSamples[i],
      runs.filter((r) => r.leg === i),
    );
    if (!at) return;
    const to = destinationName(id, leg.title);
    const label = makeLabel(formatLegDistance(leg.lengthM, leg.minutes), "area", 0, 0, 0, "routes", to ? `to ${to}` : undefined);
    label.userData.routeLeg = id;
    place(label, networkLabels, at.p, 0.7, 820);
  });
  // Transport starts.
  for (const p of pins) {
    if (!p.network || p.kind !== 0) continue;
    const name = startName([p.at[0], p.at[2]]);
    if (!name) continue;
    place(makeLabel(name.name, "landmark", 0, 0, 0, "routes", name.detail), networkLabels, p.at, 2.7, 760);
  }
  // Per tour: start and finish (shown while that tour runs).
  const tourLabels = new Map<string, { group: THREE.Group; start: Anchored; finish: Anchored }>();
  for (const t of TOURS_3D) {
    const ends = tourEnds.get(t.id);
    if (!ends) continue;
    const group = new THREE.Group();
    group.name = `route-labels-${t.id}`;
    group.visible = false;
    root.add(group);
    const from = t.label.split("→")[0]?.trim() || "Start";
    const finishName = getTarget3D(t.to)?.label ?? t.label.split("→")[1]?.trim() ?? "";
    const start = place(makeLabel(`Start · ${from}`, "landmark", 0, 0, 0), group, ends.start.at, 3.4);
    const finish = place(makeLabel(`Finish · ${finishName}`, "entrance", 0, 0, 0), group, ends.finish.at, 3.6);
    tourLabels.set(t.id, { group, start, finish });
  }

  // ── Running tour ──
  let activeSamples: RouteSample[] = [];
  let activeProbe: V3[] = [];
  const settleActive = () => {
    if (!activeSamples.length) return;
    const index = surfaceService.index;
    // Every sample on the surface drawn under it — indoors too (the passage stair to Joki, ramps, decks):
    // the route's own height is only the hint. Indoors the probe stays within the slim guide line's width.
    const ys = activeSamples.map((s) => (index ? (probeCross(index, s, s.route, s.indoor > 0.5 ? 0.16 : 0.4) ?? s.p[1]) : s.p[1]));
    const env = envelopeHeights(ys);
    const samples = activeSamples.map((s, i) => ({ ...s, p: [s.p[0], env[i], s.p[2]] as V3 }));
    active.geometry.dispose();
    active.geometry = ribbonGeometry([{ samples, fades: runFades(samples.map((s) => s.u), false, false, 0.8, 0.8) }]);
    activeProbe = samples.filter((_, i) => i % 8 === 0).map((s) => s.p);
  };
  const buildActive = (points: V3[]) => {
    // Heights under the whole route, indoor legs included (cells already known cost nothing).
    surfaceService.request(
      points.map((p) => [p[0], p[2]] as V2),
      1.5,
    );
    // Interiors far from the camera were hidden at the last scan; they are on for a tour.
    if (points.some((p) => isIndoor(p[0], p[2]))) surfaceService.refresh();
    const samples = sampleRoute(points);
    for (const s of samples) s.indoor = isIndoor(s.p[0], s.p[2]) ? 1 : 0;
    // Ease the floor-guide width over ±1.5 m at doors.
    smoothIndoor(samples, 1.5);
    for (const s of samples) if (s.indoor < 0.5) s.p[1] = dtmOrRoute(s.p, groundAt);
    activeSamples = samples;
    settleActive();
  };

  const setTour = (tour: { id: string; points: V3[] } | null) => {
    activeTour = tour && tour.points.length > 1 ? tour.id : null;
    surfaceService.pause(activeTour !== null);
    for (const [id, l] of tourLabels) l.group.visible = id === activeTour;
    networkLabels.visible = activeTour === null;
    if (tour && activeTour) {
      buildActive(tour.points);
      active.visible = true;
      // The rest of the network stays as faint context, without chevrons.
      networkMat.uniforms.uOpacity.value = 0.3;
      networkMat.uniforms.uChevronsOn.value = 0;
      // Pins and labels follow the real path ends (indoor legs come from the building modules).
      const first = tour.points[0];
      const last = tour.points[tour.points.length - 1];
      const ends = tourEnds.get(tour.id);
      if (ends) {
        ends.start.at = [first[0], first[1], first[2]];
        ends.finish.at = [last[0], last[1], last[2]];
      }
      const l = tourLabels.get(tour.id);
      if (l) {
        moveTo(l.start, first);
        moveTo(l.finish, last);
      }
    } else {
      active.visible = false;
      activeSamples = [];
      activeProbe = [];
      networkMat.uniforms.uOpacity.value = 1;
      networkMat.uniforms.uChevronsOn.value = 1;
    }
    writePins();
    ctx.invalidate();
  };

  // ── Surface probe: settle every ribbon onto the modelled ground ──
  surfaceService.attach(root);
  const corridor: V2[] = [];
  // Every leg, indoor ones too (routes.json has them within ≈ 1 m of the buildings' own): a running
  // tour's floor guide then settles at once.
  for (const leg of Object.values(routes.legs)) for (const p of leg.points) corridor.push([p[0], p[2]]);
  for (const samples of legSamples) for (const s of samples) corridor.push([s.p[0], s.p[2]]);
  for (const p of pins) corridor.push([p.at[0], p.at[2]]);
  surfaceService.request(corridor, 2);
  const unlisten = surfaceService.listen((index) => {
    for (const samples of legSamples) {
      const ys = samples.map((s) => probeCross(index, s, s.route) ?? dtmOrRoute(s.p, groundAt));
      const env = envelopeHeights(ys);
      samples.forEach((s, i) => (s.p[1] = env[i]));
    }
    rebuildNetwork();
    for (const p of pins) {
      if (isIndoor(p.at[0], p.at[2])) continue;
      const y = index.heightAt(p.at[0], p.at[2], p.at[1]);
      if (y !== null) p.at[1] = y;
    }
    writePins();
    for (const a of anchored) {
      if (isIndoor(a.x, a.z)) continue;
      const y = index.heightAt(a.x, a.z, a.ground);
      if (y !== null) moveTo(a, [a.x, y, a.z]);
    }
    settleActive();
    ctx.invalidate();
  });
  const ready = surfaceService.settled();

  // ── Animation ──
  let time = 0;
  const frustum = new THREE.Frustum();
  const projScreen = new THREE.Matrix4();
  const camPos = new THREE.Vector3();
  const networkProbe: V3[] = [];
  for (const samples of legSamples) for (let i = 0; i < samples.length; i += 12) networkProbe.push(samples[i].p);
  const tmp = new THREE.Vector3();
  /** Some animated ribbon is on screen and close enough to see its chevrons move. */
  const nearAnimated = (camera: THREE.PerspectiveCamera): boolean => {
    projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreen);
    for (const p of activeTour ? activeProbe : networkProbe) {
      tmp.set(p[0], p[1], p[2]);
      if (camPos.distanceTo(tmp) < 170 && frustum.containsPoint(tmp)) return true;
    }
    return false;
  };

  const tick = (dt: number, _elapsed: number, camera: THREE.PerspectiveCamera): boolean => {
    camera.getWorldPosition(camPos);
    // Far labels fold away so the overview stays calm.
    for (const a of anchored) {
      if (!Number.isFinite(a.near)) continue;
      tmp.set(a.x, a.ground + a.above, a.z);
      a.holder.visible = camPos.distanceTo(tmp) < a.near;
    }
    if (ctx.reducedMotion) return false;
    const animating = (activeTour !== null || NETWORK_ANIMATES[ctx.tier]) && nearAnimated(camera);
    // The running tour's finish pin pulses even from afar.
    if (!animating && activeTour === null) return false;
    time += dt;
    networkMat.uniforms.uTime.value = time;
    activeMat.uniforms.uTime.value = time;
    pinUniforms.uTime.value = time;
    return true;
  };

  const setLighting = (state: LightingState) => {
    night = state.night;
  };

  const dispose = () => {
    unlisten();
    surfaceService.detach(root);
    ringGeo.dispose();
    beamGeo.dispose();
  };

  return {
    id: "routes",
    root,
    labels,
    pickables: [],
    targets: [],
    views: { "campus:arrival": ARRIVAL_VIEW },
    setTour,
    setLighting,
    tick,
    ready,
    dispose,
  };
}

/** The network's chevrons move on ultra/high; phones animate only the running tour (battery). */
const NETWORK_ANIMATES: Record<TwinContext["tier"], boolean> = { ultra: true, high: true, low: false };

/** Footprints of BioCity, Joki and EduCity (inside = the floor guide line). */
function heroFootprints(campus: CampusData | null): { outer: V2[]; holes: V2[][] }[] {
  if (!campus) return [];
  return campus.buildings
    .filter((b) => b.role === "biocity" || b.role === "joki" || b.role === "educity")
    .map((b) => ({ outer: b.polygon, holes: b.holes ?? [] }));
}

/** Route height, or the DTM where the route walks on the ground (not a deck, bridge or stair). */
function dtmOrRoute(p: V3, groundAt: (x: number, z: number) => number): number {
  const g = groundAt(p[0], p[2]);
  return Math.abs(g - p[1]) < 0.35 ? g : p[1];
}

/** Highest surface across the ribbon (centre and both edges, `half` m out), so neither edge sinks into a kerb or step. */
function probeCross(index: SurfaceIndex, s: RouteSample, hint: number, half = 0.4): number | null {
  const lx = s.dir[1] * half;
  const lz = -s.dir[0] * half;
  let best: number | null = null;
  for (const [x, z] of [
    [s.p[0], s.p[2]],
    [s.p[0] + lx, s.p[2] + lz],
    [s.p[0] - lx, s.p[2] - lz],
  ] as V2[]) {
    const y = index.heightAt(x, z, hint);
    if (y !== null && (best === null || y > best)) best = y;
  }
  return best;
}

/** Ease 0/1 indoor flags over `reach` metres either side of a door. */
function smoothIndoor(samples: RouteSample[], reach: number): void {
  const raw = samples.map((s) => s.indoor);
  const k = Math.max(1, Math.round(reach / STEP));
  for (let i = 0; i < samples.length; i++) {
    let sum = 0;
    let c = 0;
    for (let j = Math.max(0, i - k); j <= Math.min(samples.length - 1, i + k); j++) {
      sum += raw[j];
      c++;
    }
    samples[i].indoor = sum / c;
  }
}

/** Where a network leg leads, for its distance marker ("to EduCity door B"). */
const DESTINATIONS: Record<string, string> = {
  "out-arr-train-edu-east": "EduCity east entrance",
  "out-arr-stdoor-edu-east": "EduCity east entrance",
  "out-arr-bus870-edu-east": "EduCity east entrance",
  "out-arr-parkcity-edu-east": "EduCity east entrance",
  "out-arr-parkcity-edu-b": "EduCity door B",
  "out-arr-train-edu-b": "EduCity door B",
  "out-parkcity-gw-zebra": "the step-free lifts",
  "out-b-sw2-gw": "the step-free lifts",
  "out-co-kerb-bio-main": "BioCity main entrance",
  "out-co-parkcity-bio-main": "BioCity main entrance",
  "out-co-stdoor-bio-main": "BioCity main entrance",
  "out-co-train-bio-main": "BioCity main entrance",
  "out-xfer-edu-west-bio-event": "BioCity event entrance",
  "out-xfer-edu-east-bio-event": "BioCity event entrance",
  "out-xfer-bio-event-edu-west": "EduCity west entrance",
};

/** Destination of a leg: the table above, else the part of its title after the arrow. */
export function destinationName(legId: string, title = ""): string | null {
  if (DESTINATIONS[legId]) return DESTINATIONS[legId];
  const after = title.split(/->|→/)[1];
  const name = after?.split("(")[0]?.trim();
  return name ? name : null;
}
