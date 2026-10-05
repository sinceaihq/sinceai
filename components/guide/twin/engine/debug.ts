import * as THREE from "three";
import type { V3 } from "./types";

/**
 * window.__twin — the QA/debug surface used by the screenshot scripts and
 * the other module authors (DESIGN §9). Installed when the page runs with
 * ?twin=debug or outside production builds.
 */

export interface TwinStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  totalCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
  programs: number;
  tier: string;
  tierReason: string;
  modules: string[];
  pixelRatio: number;
  exposure: number;
  time: string;
  sun: { elevation: number; azimuth: number };
  mode: string;
  /** What asked for the last rendered frame ("flight", "orbit", "walk", "tour", "exposure", "camera", "dirty", module ids…). */
  busy?: string[];
  /** Frames the engine has rendered so far (idle = it stops counting). */
  frames?: number;
  /** Estimated memory (MB): GPU textures, geometry buffers, render targets (incl. shadows), total; JS heap where exposed. */
  memory?: MemoryEstimate;
}

export interface MemoryEstimate {
  texturesMB: number;
  geometriesMB: number;
  targetsMB: number;
  gpuMB: number;
  /** performance.memory (Chromium only); null elsewhere. */
  jsHeapMB: number | null;
  /** The budget the tier enforces (MB), and whether the engine had to drop features to meet it. */
  budgetMB: number;
  reduced: string[];
}

export interface TwinDebugApi {
  /** Resolves when everything is built, textures are in and frames were rendered. */
  ready(): Promise<void>;
  stats(): TwinStats;
  goto(view: string): boolean;
  focus(id: string): boolean;
  /** ISO local time or "HH:MM" (Friday 6 Nov 2026). */
  setTime(time: string): void;
  setLabels(on: boolean): void;
  /** Render a subset of modules (builds missing ones); [] or null = all. */
  only(ids: string[] | null): Promise<string[]>;
  errors(): { module: string; message: string }[];
  camera(): { position: V3; target: V3; fov: number };
  setCamera(position: V3, target: V3, fov?: number): void;
  /** lib TARGETS_3D ids that no loaded module provides. */
  missingTargets(): string[];
  seekTour(t: number): void;
  /** Walk mode on (from a target id or view key) or off — as the UI's walk button does. */
  walk(on: boolean, start?: string): void;
  /** Start a route (lib TOURS_3D id) or stop it (null); false when it cannot play. */
  tour(id: string | null, mode?: "chase" | "first"): boolean;
  /** The running route's captions (at = progress 0…1) and levels, for QA. */
  tourPath(): { id: string; captions: { at: number; text: string }[]; levels: string[] | null } | null;
  views(): string[];
  targets(): string[];
  modules(): string[];
  /** Force a frame (e.g. after changing a uniform by hand). */
  invalidate(): void;
  /** Switch post passes / scale exposure for diagnosis (null resets). */
  post(opts: { bloom?: boolean; gtao?: boolean; smaa?: boolean; exposureScale?: number } | null): void;
  /** Sky look preset: "default" (broken overcast, low sun break), "clear", "overcast". */
  setLook(look: "default" | "clear" | "overcast"): void;
  /** Render continuously for `seconds` (slow orbit) and report frame times. */
  bench(seconds?: number): Promise<{ fps: number; frameMs: number; p95Ms: number; frames: number }>;
  /** A loaded module's scene graph (by its id: "ground", "biocity", "routes"…), for QA scripts; null when not loaded. */
  root?(moduleId: string): THREE.Group | null;
  /** Pause or resume the running route (reduced motion: "resume" steps to the next still). */
  pauseTour?(on: boolean): void;
  /** Zoom by a factor (> 1 = closer), as the +/− buttons do. */
  zoom?(factor: number): void;
  /** What a click at a client point picks (null = nothing, or hidden behind a wall), and how long it took. */
  pick?(x: number, y: number): { id: string | null; ms: number };
  /** Where a double-click at a client point would fly to. */
  groundPoint?(x: number, y: number): V3 | null;
  /**
   * Walk a route leg (routes.json) with the real walk world, steering along it: how closely the floor
   * follows the route's heights, how far it got, and where it got stuck.
   */
  walkRoute?(legId: string): Promise<WalkRouteReport | null>;
  /** Fly every ordered pair of views and targets as the engine would: flights that pass inside a closed building. */
  flightAudit?(): FlightAuditReport;
  /** What walk mode knows at a point: the walk areas over it (level, floor), the terrain and the ground's surface. */
  walkProbe?(x: number, z: number): WalkProbeReport;
  /**
   * Walk headlessly from a start with scripted input (each part held for some seconds) in the real walk
   * world: the track (every `every` steps), the levels passed and where it ended.
   */
  walkSim?(
    start: { position: [number, number]; level?: string; yawDeg: number; y?: number } | string,
    script: { forward?: number; strafe?: number; turn?: number; run?: boolean; seconds: number }[],
    every?: number,
  ): Promise<WalkSimReport | null>;
  /** The running tour's camera framing now ("chase", "pulled", "shoulder", "front", "first") and the walker. */
  tourFrame?(): { framing: string | null; camera: V3; walker: V3; level: string | null; cameraLevel: string | null } | null;
  /**
   * Heights of the modelled surfaces on a grid (rows of z, columns of x): the surface nearest `hint`
   * within [hint − 0.4, hint + 2] (planters, steps, benches stand out), null where none.
   */
  surfaceGrid?(x0: number, z0: number, x1: number, z1: number, step: number, hint: number): Promise<(number | null)[][]>;
  /** Walk colliders (all levels) whose bounds touch a box. */
  collidersIn?(x0: number, z0: number, x1: number, z1: number): { level: string; kind: string; a?: [number, number]; b?: [number, number]; c?: [number, number]; r?: number }[];
  /** Play a route headlessly at 60 fps in the real scene and measure the chase camera (see TourAuditReport). */
  tourAudit?(id: string): Promise<TourAuditReport | null>;
  /** Meshes whose world bounds contain (x, z) between y0 and y1: module, name, material, flags (QA). */
  meshesAt?(x: number, z: number, y0: number, y1: number): { module: string; name: string; material: string; visible: boolean; instanced: boolean; transparent: boolean; opacity: number; minY: number; maxY: number }[];
  /** Names of the compiled shader programs (QA: which ones compile after the warm-up); `keys` appends each program's cache key. */
  programList?(keys?: boolean): string[];
  /** Memory estimate with the largest textures (QA). */
  memory?(): { estimate: MemoryEstimate; info: { geometries: number; textures: number }; textures: number; top: { name: string; w: number; h: number; mb: number }[] };
  /** Shader programs compiled so far and whether the warm-up (precompile) has finished. */
  warmup?(): { programs: number; done: boolean; ms: number };
}

export interface WalkProbeReport {
  areas: { level: string; floor: number; slope: boolean; terrain: boolean }[];
  terrain: number | null;
  surface: number | null;
}

export interface WalkSimReport {
  track: { x: number; z: number; floor: number; eye: number; level: string }[];
  levels: string[];
  end: { x: number; z: number; floor: number; level: string };
  /** Largest drop of the floor between two steps (m). */
  maxDrop: number;
}

export interface WalkRouteReport {
  leg: string;
  length: number;
  /** Fraction of the route walked before the end or getting stuck. */
  reached: number;
  /** Largest |floor − route height| (m), where it happened, and the mean. */
  maxFloorError: number;
  worstAt: V3 | null;
  meanFloorError: number;
  stuckAt: [number, number] | null;
  levels: string[];
}

export interface FlightAuditReport {
  flights: number;
  /** Flights with any sample inside a closed building (endpoint buildings excluded). */
  through: number;
  /** The same with the plain arc the engine used before (for comparison). */
  throughPlainArc: number;
  cuts: number;
  cranes: number;
  worst: { from: string; to: string; frames: number }[];
}

declare global {
  interface Window {
    __twin?: TwinDebugApi | Record<string, unknown>;
  }
}

export function debugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const param = new URLSearchParams(window.location.search).get("twin");
  return param === "debug" || process.env.NODE_ENV !== "production";
}

/** "15:30" → "2026-11-06T15:30"; ISO strings pass through. */
export function normaliseTime(time: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(time)) return time.slice(0, 16);
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (m) return `2026-11-06T${m[1].padStart(2, "0")}:${m[2]}`;
  return time;
}

/** Install the API; returns an uninstaller that only removes our own object. */
export function installDebug(api: TwinDebugApi): () => void {
  if (!debugEnabled()) return () => undefined;
  window.__twin = api;
  return () => {
    if (window.__twin === api) delete window.__twin;
  };
}

export interface TourAuditReport {
  id: string;
  frames: number;
  /** Largest camera move in one frame (m) and where (progress t). */
  maxJump: number;
  maxJumpAt: number | null;
  /** Frames with the camera inside a closed building, in a ceiling (within 0.1 m under to 1.5 m over), behind a wall. */
  inSolid: number;
  inCeiling: number;
  behindWall: number;
  /** Frames per framing ("chase", "pulled", "shoulder", "front"), and the first frame's. */
  framing: Record<string, number>;
  start: string | null;
  /** Largest distance (m) of the walker from the modelled floor outdoors, and where. */
  floorErr: number;
  floorErrAt: number | null;
  /** Frames a last-resort clamp fired, by kind. */
  clamps: Record<string, number>;
  /** The first frames with a jump over 0.5 m or the camera in a solid. */
  events: { t: number; framing: string; clamp: string | null; jump: number; solid: boolean; cam: V3; walker: V3; roof?: number }[];
}

// ── Memory estimates (stats().memory) ───────────────────────────────────────

const MB = 1024 * 1024;

/** Bytes per texel of a texture's format and type (uncompressed; 3-channel data is stored as 4). */
function texelBytes(t: THREE.Texture): number {
  const channels =
    t.format === THREE.RedFormat || t.format === THREE.RedIntegerFormat || t.format === THREE.DepthFormat
      ? 1
      : t.format === THREE.RGFormat || t.format === THREE.RGIntegerFormat || t.format === THREE.DepthStencilFormat
        ? 2
        : 4;
  const size =
    t.type === THREE.FloatType || t.type === THREE.UnsignedIntType || t.type === THREE.IntType || t.type === THREE.UnsignedInt248Type
      ? 4
      : t.type === THREE.HalfFloatType || t.type === THREE.UnsignedShortType || t.type === THREE.ShortType
        ? 2
        : 1;
  return t.format === THREE.DepthFormat || t.format === THREE.DepthStencilFormat ? 4 : channels * size;
}

/** Estimated GPU bytes of a texture: width × height (× depth, × 6 faces) × texel size × 4/3 with mipmaps. */
export function textureBytes(t: THREE.Texture): number {
  const img = t.image as
    | { width?: number; height?: number; depth?: number; videoWidth?: number; videoHeight?: number }
    | { width?: number; height?: number }[]
    | null
    | undefined;
  if (!img) return 0;
  const first = Array.isArray(img) ? img[0] : img;
  const w = (first as { width?: number; videoWidth?: number })?.width ?? (first as { videoWidth?: number })?.videoWidth ?? 0;
  const h = (first as { height?: number; videoHeight?: number })?.height ?? (first as { videoHeight?: number })?.videoHeight ?? 0;
  const depth = (first as { depth?: number }).depth ?? 1;
  const faces = Array.isArray(img) ? img.length : (t as THREE.CubeTexture).isCubeTexture ? 6 : 1;
  const mips =
    t.generateMipmaps && t.minFilter !== THREE.NearestFilter && t.minFilter !== THREE.LinearFilter ? 4 / 3 : 1;
  return w * h * depth * faces * texelBytes(t) * mips;
}

/** Every texture the scene uses: material maps and uniforms, the environment, shadow maps. */
export function sceneTextures(scene: THREE.Object3D): Set<THREE.Texture> {
  const out = new Set<THREE.Texture>();
  const add = (v: unknown) => {
    if (v && (v as THREE.Texture).isTexture) out.add(v as THREE.Texture);
  };
  const seen = new Set<THREE.Material>();
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.material) {
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        if (!m || seen.has(m)) continue;
        seen.add(m);
        for (const v of Object.values(m)) add(v);
        const uniforms = (m as THREE.ShaderMaterial).uniforms;
        if (uniforms) for (const u of Object.values(uniforms)) add(u?.value);
      }
    }
    const light = o as THREE.Light & { shadow?: THREE.LightShadow };
    if (light.isLight && light.shadow?.map) add(light.shadow.map.texture);
  });
  const s = scene as THREE.Scene;
  add(s.environment);
  add(s.background);
  return out;
}

/** Estimated GPU bytes of every geometry buffer in the scene (attributes and indices, shared once). */
export function geometryBytes(scene: THREE.Object3D): number {
  const arrays = new Set<ArrayBufferLike>();
  let bytes = 0;
  const seen = new Set<THREE.BufferGeometry>();
  scene.traverse((o) => {
    const g = (o as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (!g || seen.has(g)) return;
    seen.add(g);
    const attrs: (THREE.BufferAttribute | THREE.InterleavedBufferAttribute | null)[] = [...Object.values(g.attributes), g.index];
    for (const a of attrs) {
      if (!a) continue;
      const arr = (a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute
        ? (a as THREE.InterleavedBufferAttribute).data.array
        : (a as THREE.BufferAttribute).array;
      if (arrays.has(arr.buffer)) continue;
      arrays.add(arr.buffer);
      bytes += arr.byteLength;
    }
    const inst = (o as THREE.InstancedMesh).instanceMatrix;
    if (inst && !arrays.has(inst.array.buffer)) {
      arrays.add(inst.array.buffer);
      bytes += inst.array.byteLength;
    }
  });
  return bytes;
}

/**
 * Estimated bytes of the frame's render targets at the drawing-buffer size: the canvas (colour + depth),
 * the composer's two HDR targets (half-float colour + depth texture, × MSAA samples + resolve), GTAO's
 * targets at its scale, bloom's bright pass and mip chain, SMAA's edge and weight targets.
 */
export function targetBytes(o: {
  pixels: number;
  msaa: number;
  gtao: boolean;
  gtaoScale: number;
  bloom: boolean;
  smaa: boolean;
}): number {
  const P = o.pixels;
  let b = P * 8; // canvas colour (+ back buffer) and depth
  b += 2 * P * 12 * (1 + Math.max(0, o.msaa)); // composer targets: RGBA16F + depth, multisampled + resolved
  if (o.gtao) b += P * o.gtaoScale * o.gtaoScale * 4 * 12; // normal/depth, AO, denoise, blend copies
  if (o.bloom) b += P * 8 + P * 8 * 2 * (1 / 3); // bright pass + horizontal/vertical mip chain
  if (o.smaa) b += P * 4 * 2;
  return b;
}

export function toMB(bytes: number): number {
  return Math.round((bytes / MB) * 10) / 10;
}
