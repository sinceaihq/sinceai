import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, type CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type {
  BuildingModule,
  CameraView,
  Collider2D,
  Connector,
  LevelId,
  PlaceId,
  Tier,
  TwinContext,
  TwinTarget,
  V2,
  V3,
  WalkArea,
  WorldModule,
} from "./types";
import { TIER_SETTINGS, createFrameMonitor, detectTier, lowerTier, type TierSettings } from "./render/quality";
import { createPipeline } from "./render/pipeline";
import { TwinMaterialLibrary } from "./render/materials";
import { setFacadeLighting } from "./render/facade";
import { createSky } from "./sky/sky";
import { disposeDeep, pointInRing, polygonBounds, withTimeout } from "./util";
import { eyeLevelPick, eyeLevelReach, labelRank, nudgeInto, type LabelBox, type LabelRank } from "./labels";
import { castCircle, floorY, indexColliders, type ColliderIndex } from "./nav/collision";
import { vectorBearing, yawForBearing } from "./frame";
import { FALLBACK_TARGETS, FALLBACK_VIEWS, WALK_START_LEGS, WALK_STARTS, doorStart, legLevel, legStart, pushOutOfRing } from "./fallbacks";
import {
  geometryBytes,
  installDebug,
  normaliseTime,
  sceneTextures,
  targetBytes,
  textureBytes,
  toMB,
  type FlightAuditReport,
  type MemoryEstimate,
  type TourAuditReport,
  type TwinStats,
  type WalkRouteReport,
} from "./debug";
import type { MassingModule } from "./world/massing";
import type { FlightShape, Orbit, OrbitSolid } from "./nav/orbit";
import type { WalkController } from "./nav/walk";
import type { HeightAt } from "./nav/collision";
import type { TourController, TourFrame, TourPath } from "./nav/tour";
import { buildCorridorIndex, corridorCells, type CorridorIndex } from "./nav/corridor";
import {
  anchorFractions,
  buildingVolumes,
  volumeAt,
  type BuildingRole,
  type BuildingVolume,
  type CampusData,
  type Lod2Data,
  type RoutesData,
  type StreetsData,
  type Terrain,
} from "./data/campus";
import type * as TwinLib from "@/lib/hackathon-2026/twin";

/**
 * Campus twin engine (DESIGN §10). Loaded only when someone opens the 3D.
 *
 * - Modules (ground, buildings, props…) are built by async builders listed
 *   in BUILDERS; a builder whose file is missing or throws is skipped and
 *   reported in errors() — the page never breaks. world/massing.ts fills in
 *   every building no module claims (and a provisional terrain).
 * - Renders on demand: idle = no frames; animates while a module ticks, a
 *   flight/walk/tour runs or the camera moves; pauses off-screen/hidden.
 * - Sky, sun, exposure and every module follow setTime() (real sun for Turku).
 * - Reduced motion: instant camera moves, no ambient animation, tours as stills.
 */

export interface TwinOptions {
  /** Override auto detection (?quality=). */
  tier?: Tier;
  reducedMotion: boolean;
  /** ISO local Turku time. */
  time: string;
  onSelect?(id: string | null): void;
  onPlace?(place: PlaceId): void;
  onMode?(mode: "orbit" | "walk" | "tour"): void;
  onTour?(state: { id: string; t: number; caption: string | null } | null): void;
  onConnector?(c: { id: string; label: string } | null): void;
  /** Every connector within reach while walking, nearest first (a lift: one per floor); [] when none. */
  onConnectors?(list: { id: string; label: string }[]): void;
  /** The scene's time changed through setTime() (any caller, window.__twin included): the normalised ISO time. */
  onTime?(iso: string): void;
  /**
   * Even the lowest tier stays far too slow on this device (median frame over 100 ms for 5 s of
   * rendering): called once, so the UI can offer the text version.
   */
  onSlow?(): void;
  onLabels?(on: boolean): void;
  onProgress?(p: { loaded: number; total: number }): void;
  onContextLost?(): void;
  /**
   * Frames stayed slow and the engine lightened its rendering (a lower tier, fewer pixels). `struggling`:
   * nothing is left to lighten — the device can't show the 3D smoothly (the UI may point to the plans).
   */
  onPerformance?(state: { tier: Tier; pixelRatio: number; struggling: boolean }): void;
  preserveDrawingBuffer?: boolean;
}

export interface TwinEngine {
  /**
   * Builds all modules (progress events) and frames the initial view; resolves once the scene is
   * assembled — textures may still be streaming in. whenReady() resolves after the first full frame
   * with every texture (or the 20 s asset timeout). Rejects when the campus data itself can't be
   * loaded (offline, a stalled connection): the UI then offers "Try again".
   */
  load(): Promise<void>;
  goto(viewKey: string, animate?: boolean): boolean;
  focus(targetId: string, animate?: boolean): boolean;
  setTime(iso: string): void;
  setLabels(on: boolean): void;
  walk(on: boolean, start?: string): void;
  useConnector(id: string): void;
  tour(id: string | null, mode?: "chase" | "first"): boolean;
  pauseTour(on: boolean): void;
  zoom(factor: number): void;
  resize(): void;
  /**
   * Resolves after the first full frame with every texture (or the asset timeout); rejects promptly
   * when the WebGL context is lost first.
   */
  whenReady(): Promise<void>;
  /**
   * The reduced-motion preference changed: camera moves become instant (or animated again), ambient
   * animation stops (or resumes), routes started from now on play as step-by-step stills.
   */
  setReducedMotion?(on: boolean): void;
  /**
   * The parts of the scene the UI's controls cover, in CSS px from each edge: views, targets and the
   * walker on a route are framed in the free part (the projection centre moves there) and labels stay
   * out from under the controls. All zero: the whole canvas.
   */
  setInsets?(insets: SceneInsets): void;
  dispose(): void;
}

/** Edges of the scene covered by the UI's controls, in CSS px. */
export interface SceneInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function isWebGL2Available(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = window.WebGL2RenderingContext ? canvas.getContext("webgl2") : null;
    // Free the probe at once: browsers cap live contexts (16 in Chrome) and phones are short of GPU memory.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

/** Free whatever a module (or a builder's late result) holds: its own dispose(), then its scene graph. */
function discardModule(v: unknown) {
  if (!isObject(v)) return;
  try {
    if (typeof v.dispose === "function") (v.dispose as () => void)();
  } catch {
    // Disposing is best effort.
  }
  if (v.root instanceof THREE.Object3D) disposeDeep(v.root);
}

// ── Module registry ─────────────────────────────────────────────────────────

interface BuilderEntry {
  file: string;
  exportName: string;
  /** 0 = needed for the first frame (terrain + massing), 1 = everything else. */
  phase: 0 | 1;
  load(): Promise<unknown>;
}

/*
 * Builders other agents write in parallel may not exist yet. The import
 * paths are cast to string so TypeScript does not resolve them, and marked
 * turbopackOptional so the bundler does not fail: a missing file simply
 * rejects at runtime and the module is skipped.
 */
const BUILDERS: Record<string, BuilderEntry> = {
  massing: { file: "world/massing.ts", exportName: "buildMassing", phase: 0, load: () => import("./world/massing") },
  ground: {
    file: "world/ground.ts",
    exportName: "buildGround",
    phase: 0,
    load: () => import(/* turbopackOptional: true */ ("./world/ground" as string)),
  },
  landscape: {
    file: "world/landscape.ts",
    exportName: "buildLandscape",
    phase: 1,
    load: () => import(/* turbopackOptional: true */ ("./world/landscape" as string)),
  },
  context: {
    file: "world/context.ts",
    exportName: "buildContext",
    phase: 1,
    load: () => import(/* turbopackOptional: true */ ("./world/context" as string)),
  },
  biocity: {
    file: "buildings/biocity.ts",
    exportName: "buildBioCity",
    phase: 1,
    load: () => import(/* turbopackOptional: true */ ("./buildings/biocity" as string)),
  },
  joki: {
    file: "buildings/joki.ts",
    exportName: "buildJoki",
    phase: 1,
    load: () => import(/* turbopackOptional: true */ ("./buildings/joki" as string)),
  },
  educity: {
    file: "buildings/educity.ts",
    exportName: "buildEduCity",
    phase: 1,
    load: () => import(/* turbopackOptional: true */ ("./buildings/educity" as string)),
  },
  vehicles: {
    file: "props/vehicles.ts",
    exportName: "buildVehicles",
    phase: 1,
    load: () => import(/* turbopackOptional: true */ ("./props/vehicles" as string)),
  },
  people: {
    file: "props/people.ts",
    exportName: "buildPeople",
    phase: 1,
    load: () => import(/* turbopackOptional: true */ ("./props/people" as string)),
  },
  event: {
    file: "world/event.ts",
    exportName: "buildEvent",
    phase: 1,
    load: () => import(/* turbopackOptional: true */ ("./world/event" as string)),
  },
  routes: {
    file: "world/routes.ts",
    exportName: "buildRoutes",
    phase: 1,
    load: () => import(/* turbopackOptional: true */ ("./world/routes" as string)),
  },
};

export const MODULE_IDS = Object.keys(BUILDERS);

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

function asModule(v: unknown, id: string): WorldModule {
  if (!isObject(v)) throw new Error(`${id}: builder returned nothing`);
  if (!(v.root instanceof THREE.Object3D)) throw new Error(`${id}: module.root is not an Object3D`);
  const m = v as unknown as WorldModule;
  if (!Array.isArray(m.labels)) (m as { labels: CSS2DObject[] }).labels = [];
  if (!Array.isArray(m.pickables)) (m as { pickables: THREE.Object3D[] }).pickables = [];
  if (!Array.isArray(m.targets)) (m as { targets: TwinTarget[] }).targets = [];
  if (!(m.ready instanceof Promise)) (m as { ready: Promise<unknown> }).ready = Promise.resolve();
  // The engine addresses modules by their BUILDERS key ("ground", "context", "people"…).
  (m as { id: string }).id = id;
  return m;
}

const isBuilding = (m: WorldModule): m is BuildingModule =>
  typeof (m as BuildingModule).setOpen === "function" && typeof (m as BuildingModule).building === "string";

const PLACE_OF_MODULE: Record<string, PlaceId> = { biocity: "biocity", joki: "joki", educity: "educity" };

// ── Helpers ─────────────────────────────────────────────────────────────────

const floorYOf = (a: WalkArea, x: number, z: number) => floorY(a, [x, z]);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const v3 = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);
const toV3 = (v: THREE.Vector3): V3 => [round(v.x), round(v.y), round(v.z)];
const round = (x: number) => Math.round(x * 100) / 100;

interface Flight {
  fromP: THREE.Vector3;
  toP: THREE.Vector3;
  fromT: THREE.Vector3;
  toT: THREE.Vector3;
  fromFov: number;
  toFov: number;
  /** Arc or crane move that clears the closed buildings on the way (nav/orbit planFlight). */
  shape: FlightShape;
  t: number;
  dur: number;
}

interface NavModules {
  orbit: typeof import("./nav/orbit") | null;
  walk: typeof import("./nav/walk") | null;
  tour: typeof import("./nav/tour") | null;
}

interface TourRun {
  id: string;
  controller: TourController;
  avatar: THREE.Object3D;
  /** Caption texts in route order (TourFrame.step indexes them). */
  captions: string[];
  /** Caption shown now (index; −1 = none yet) and since when (ms). */
  shown: number;
  shownAt: number;
  /** Follow the walker's caption at once (after a seek) instead of pacing up to it. */
  resync: boolean;
  lastCaption: string | null;
  lastReport: number;
  doneAt: number | null;
  /** Reduced motion: one still per step (progress and caption index; −1 = the start, before any step). */
  stills: { at: number; caption: number }[] | null;
  stillIndex: number;
  /** Where the walker is now (feet) and on which level — the hand-back to the orbit camera starts there. */
  walker: THREE.Vector3;
  level: LevelId | null;
  /** Level the (chase) camera is on — it trails the walker through doors. */
  cameraLevel: LevelId | null;
  /** Chase or first person: in first person (and with the camera at the walker) the avatar's body is hidden. */
  mode: "chase" | "first";
  /** The avatar's body is shown (its ground ring always is). */
  bodyShown: boolean;
}

/** Modules whose triangles are surfaces a route walks on or passes under (nav/corridor.ts). */
const SURFACE_MODULES = new Set(["ground", "massing", "landscape", "context", "biocity", "joki", "educity"]);

/**
 * Each route step stays on screen at least this long (ms): steps can be anchored a few metres apart
 * (kerb → cycle path → recess), which the walker covers in under a second. Later steps queue up.
 */
const CAPTION_MIN_MS = 2400;

// ── The engine ──────────────────────────────────────────────────────────────

export function createTwinEngine(container: HTMLElement, opts: TwinOptions): TwinEngine {
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const decision = detectTier(opts.tier);
  let tier: Tier = decision.tier;
  let settings: TierSettings = TIER_SETTINGS[tier];
  const errors: { module: string; message: string }[] = [];
  const recordError = (module: string, message: string) => {
    if (errors.some((e) => e.module === module && e.message === message)) return;
    errors.push({ module, message });
  };

  // Scene and camera.
  const scene = new THREE.Scene();
  scene.name = "campus-twin";
  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 7000);
  camera.position.set(-128, 205, 262);
  camera.lookAt(112, 2, 42);

  if (getComputedStyle(container).position === "static") container.style.position = "relative";
  const pipeline = createPipeline(container, scene, camera, settings, { preserveDrawingBuffer: opts.preserveDrawingBuffer });
  const renderer = pipeline.renderer;
  const canvas = pipeline.canvas;

  const labelRenderer = new CSS2DRenderer();
  Object.assign(labelRenderer.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none", overflow: "hidden" });
  labelRenderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(labelRenderer.domElement);

  const sky = createSky(renderer, scene, {
    tier,
    shadows: true,
    shadowMapSize: settings.shadowMapSize,
    lensflare: settings.lensflare,
  });
  scene.add(sky.group);

  const materials = new TwinMaterialLibrary(tier, {
    maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    onTexture: () => invalidate(),
  });

  let dirty = true;
  const invalidate = () => {
    dirty = true;
  };

  let lighting = sky.setTime(opts.time || normaliseTime(params.get("time") ?? "15:30"));
  setFacadeLighting(lighting);

  const ctx: TwinContext = {
    tier,
    reducedMotion: opts.reducedMotion,
    materials,
    envInterior: sky.envInterior,
    invalidate,
    lighting: () => lighting,
    // Where the person the camera follows stands: the walker's feet, the route avatar, else none.
    actor: () => {
      if (mode === "walk") return [camera.position.x, camera.position.y - 1.65, camera.position.z];
      if (mode === "tour" && tourRun) {
        const p = tourRun.avatar.position;
        return [p.x, p.y, p.z];
      }
      return null;
    },
  };

  // ── State ──
  const modules = new Map<string, WorldModule>();
  let massing: MassingModule | null = null;
  const views = new Map<string, { view: CameraView; module: string | null }>();
  const targets = new Map<string, { target: TwinTarget; module: string | null }>();
  for (const [k, v] of Object.entries(FALLBACK_VIEWS)) views.set(k, { view: v, module: null });
  for (const [k, v] of Object.entries(FALLBACK_TARGETS)) targets.set(k, { target: { id: k, view: v }, module: null });

  const only = (params.get("only") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let wanted: Set<string> | null = only.length ? new Set(only) : null;

  let disposed = false;
  /** The UI's callbacks — silent once dispose() has run (late builders, timers, the walker's own teardown). */
  const live =
    <A extends unknown[]>(fn: ((...args: A) => void) | undefined) =>
    (...args: A) => {
      if (!disposed) fn?.(...args);
    };
  const emit = {
    onSelect: live(opts.onSelect),
    onPlace: live(opts.onPlace),
    onMode: live(opts.onMode),
    onTour: live(opts.onTour),
    onConnector: live(opts.onConnector),
    onConnectors: live(opts.onConnectors),
    onTime: live(opts.onTime),
    onSlow: live(opts.onSlow),
    onLabels: live(opts.onLabels),
    onProgress: live(opts.onProgress),
    onContextLost: live(opts.onContextLost),
    onPerformance: live(opts.onPerformance),
  };
  /** Reduced motion now (the UI may change it live, see setReducedMotion). */
  let reducedMotion = opts.reducedMotion;
  /** Whether each module was built for reduced motion (modules read it while building). */
  const builtReduced = new Map<string, boolean>();
  /** Clock the motion-built modules see while reduced motion is on (frozen). */
  let frozenElapsed = 0;
  let inView = true;
  let contextLost = false;
  let labelsOn = true;
  let labelGroup: string | undefined;
  /** Label passes still owed for the latest pose or label set (see labelPasses). */
  let occlusionDue = true;
  let declutterDue = true;
  /** The target the user focused or picked, and its label — which wins the declutter. */
  let focusTargetId: string | null = null;
  let focusLabel: CSS2DObject | null = null;
  let activeView: CameraView | null = null;
  let activePlace: PlaceId = "campus";
  let userMoved = false;
  let flight: Flight | null = null;
  let indoor = 0;
  let indoorTarget = 0;
  let mode: "orbit" | "walk" | "tour" = "orbit";
  let terrain: Terrain | null = null;
  let campus: CampusData | null = null;
  let routes: RoutesData | null = null;
  let streets: StreetsData | null = null;
  let lod2: Lod2Data | null = null;
  /** Campus buildings as camera volumes (LOD2 roof parts); the closed ones are orbit solids and flight obstacles. */
  let volumes: (OrbitSolid & { role?: string })[] = [];
  let closedSolids: OrbitSolid[] = [];
  /** The hero buildings' parts and outlines: where the camera counts as indoors. */
  let heroParts: BuildingVolume[] = [];
  const heroOutlines = new Map<string, V2[]>();
  /** The active view's own exposure (CameraView.indoor), until the camera is handed elsewhere. */
  let viewIndoor: number | undefined;
  let lib: typeof TwinLib | null = null;
  const nav: NavModules = { orbit: null, walk: null, tour: null };
  let orbit: Orbit | null = null;
  let fallbackControls: OrbitControls | null = null;
  let walker: WalkController | null = null;
  let tourRun: TourRun | null = null;
  let tourController: TourController | null = null;
  /** The running tour's latest frame (debug: tourFrame). */
  let lastTourFrame: TourFrame | null = null;
  /** Shader warm-up after load (see warmUp): done, and how long it took. */
  const warm = { done: false, ms: 0 };
  /** props/people.ts may export makeWalkerAvatar(ctx); the capsule below stands in until it does. */
  let avatarFactory: ((c: TwinContext) => THREE.Object3D) | null = null;
  const timer = new THREE.Timer();
  let elapsed = 0;
  let benchActive = false;

  // Ready / load bookkeeping.
  let loadPromise: Promise<void> | null = null;
  let resolveReady: () => void = () => undefined;
  let rejectReady: (e: Error) => void = () => undefined;
  const readyPromise = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  // Callers that never ask must not see an unhandled rejection; those that do still get it.
  readyPromise.catch(() => undefined);
  let framesUntilReady = -1;
  let readyDone = false;

  // Stats.
  let fps = 0;
  let frameMs = 0;
  let framesThisSecond = 0;
  let secondStart = performance.now();
  const monitor = createFrameMonitor({
    onSlow: () => {
      // An explicit ?quality= is a request (QA, comparisons): keep it even when frames are slow.
      if (opts.tier) return;
      const next = lowerTier(tier);
      if (next) {
        tier = next;
        settings = TIER_SETTINGS[next];
        pipeline.apply(settings);
        // The sun's lens flare follows the tier (ultra only).
        sky.setLensflare(settings.lensflare);
        recordError("engine", `frame time over budget — downgraded to "${next}"`);
      } else if (settings.maxDpr > 0.75 || settings.bloom || settings.msaa > 0) {
        // Already the lowest tier (a weak phone): fewer pixels, no bloom, no MSAA, a smaller shadow
        // map — nothing that changes a shader, so no frame stalls on a recompile.
        settings = {
          ...settings,
          maxDpr: Math.max(0.75, Math.min(settings.maxDpr, Math.min(window.devicePixelRatio || 1, 1.25)) - 0.25),
          bloom: false,
          msaa: 0,
          shadowMapSize: Math.min(settings.shadowMapSize, 512),
          shadowDistance: Math.min(settings.shadowDistance, 160),
        };
        pipeline.apply(settings);
        recordError("engine", `frame time over budget on "low" — lighter rendering (pixel ratio ≤ ${settings.maxDpr})`);
      } else {
        // Nothing left to lighten: the UI can point to the floor plans and lists.
        emit.onPerformance({ tier, pixelRatio: pipeline.stats().pixelRatio, struggling: true });
        return;
      }
      emit.onPerformance({ tier, pixelRatio: pipeline.stats().pixelRatio, struggling: false });
      fitShadows(true);
      invalidate();
    },
  });

  // ── Controls ──
  function controlsTarget(): THREE.Vector3 {
    return orbit ? orbit.controls.target : fallbackControls ? fallbackControls.target : new THREE.Vector3();
  }

  function makeFallbackControls() {
    const c = new OrbitControls(camera, canvas);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.screenSpacePanning = false;
    c.maxPolarAngle = THREE.MathUtils.degToRad(86);
    c.minDistance = 3;
    c.maxDistance = 1400;
    c.listenToKeyEvents(container);
    c.addEventListener("start", onUserStart);
    return c;
  }

  function onUserStart() {
    flight = null;
    userMoved = true;
  }

  function setupOrbit() {
    const mod = nav.orbit;
    if (mod && !orbit) {
      try {
        const target = controlsTarget().clone();
        fallbackControls?.dispose();
        fallbackControls = null;
        orbit = mod.createOrbit(camera, canvas, {
          reducedMotion,
          groundAt: (x, z) => (terrain ? terrain.heightAt(x, z) : 0),
          minHeight: 1.5,
          place: activePlace,
          keyEvents: container,
          // A wheel zoom heads for what is under the pointer (a wall: the street in front of it).
          cursorPoint: (x, y) => {
            setNdc(x, y);
            const hit = raycaster
              .intersectObjects(surfaceRoots(), true)
              .find((h) => (h.object as THREE.Mesh).isMesh && shown(h.object) && !seeThrough((h.object as THREE.Mesh).material));
            if (!hit) return null;
            const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : null;
            return { point: toV3(hit.point), normal: n ? [n.x, n.y, n.z] : null };
          },
        });
        orbit.controls.addEventListener("start", onUserStart);
        orbit.setPose(toV3(camera.position), toV3(target));
        updateSolids();
      } catch (e) {
        recordError("nav/orbit", e instanceof Error ? e.message : String(e));
        orbit = null;
        fallbackControls ??= makeFallbackControls();
      }
    }
  }
  fallbackControls = makeFallbackControls();

  /** Closed buildings — the camera stays out of them and flights pass over them (open ones are dollhouses). */
  function updateSolids() {
    const open = new Set<string>();
    for (const m of modules.values()) if (isBuilding(m) && openState.get(m.building)) open.add(m.building);
    closedSolids = volumes.filter((v) => !(v.role && open.has(v.role)));
    orbit?.setSolids(closedSolids);
  }

  // ── Insets (the UI's controls over the scene) ──
  /** setInsets: the edges the UI's controls cover, CSS px. */
  let sceneInsets: SceneInsets = { top: 0, right: 0, bottom: 0, left: 0 };

  /** The insets for a w × h canvas, shrunk so the free part keeps at least 45 % of each side. */
  function insetsFor(w: number, h: number): SceneInsets {
    const fit = (a: number, b: number, size: number): [number, number] => {
      const sum = a + b;
      const max = size * 0.55;
      return sum > max ? [(a * max) / sum, (b * max) / sum] : [a, b];
    };
    const [left, right] = fit(sceneInsets.left, sceneInsets.right, w);
    const [top, bottom] = fit(sceneInsets.top, sceneInsets.bottom, h);
    return { top, right, bottom, left };
  }

  /** Share of the canvas width (x) and height (y) the controls leave free. */
  function freeShare(): { x: number; y: number } {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    const e = insetsFor(w, h);
    return { x: (w - e.left - e.right) / w, y: (h - e.top - e.bottom) / h };
  }

  /** The projection centre in the middle of the free part (a view offset of the whole canvas). */
  function applyViewOffset() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    const e = insetsFor(w, h);
    if (!e.top && !e.right && !e.bottom && !e.left) {
      if (camera.view?.enabled) camera.clearViewOffset();
      return;
    }
    const cx = e.left + (w - e.left - e.right) / 2;
    const cy = e.top + (h - e.top - e.bottom) / 2;
    camera.setViewOffset(w, h, w / 2 - cx, h / 2 - cy, w, h);
  }

  // ── Views ──
  function fovFor(v: CameraView): number {
    if (v.hfov) {
      // The view's horizontal field spans the free part of the canvas, not the part under the controls.
      const aspect = Math.max(camera.aspect * freeShare().x, 0.3);
      const vfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(v.hfov) / 2) / aspect));
      return THREE.MathUtils.clamp(vfov, 25, 92);
    }
    return v.fov ?? 45;
  }

  /** Final pose of a view on this screen shape (portrait fit as in the first 3D preview). */
  function resolveView(input: CameraView) {
    const portrait = camera.aspect < 1;
    const v: CameraView = portrait && input.portrait ? { ...input, ...input.portrait } : input;
    const target = v3(v.target);
    const position = v3(v.position);
    if (!portrait || !v.fit) return { position, target, fov: fovFor(v) };
    const vfov = 62;
    // Fit the radius inside the free part (phones: the cards stacked over the bottom of the scene).
    const share = freeShare();
    const half = Math.tan(THREE.MathUtils.degToRad(vfov) / 2);
    const hfov = 2 * Math.atan(half * Math.max(camera.aspect * share.x, 0.3));
    const vfree = 2 * Math.atan(half * share.y);
    const offset = position.clone().sub(target);
    const distance = Math.max(offset.length(), v.fit / Math.sin(hfov / 2), v.fit / Math.sin(vfree / 2));
    return { position: target.clone().add(offset.setLength(distance)), target, fov: vfov };
  }

  function placePose(position: THREE.Vector3, target: THREE.Vector3, fov: number) {
    camera.position.copy(position);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    if (orbit) orbit.setPose(toV3(position), toV3(target));
    else if (fallbackControls) {
      fallbackControls.target.copy(target);
      camera.lookAt(target);
      fallbackControls.update();
    } else camera.lookAt(target);
    invalidate();
  }

  const openState = new Map<string, LevelId | null>();

  function applyOpen(open: CameraView["open"]) {
    for (const m of modules.values()) {
      if (!isBuilding(m)) continue;
      const level = open && open.building === m.building ? open.level : null;
      if (openState.get(m.building) === level) continue;
      openState.set(m.building, level);
      try {
        m.setOpen(level);
      } catch (e) {
        recordError(m.id, `setOpen: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    updateSolids();
    updateInteriors();
  }

  /**
   * The cut-away the current view (or the hand-back after walking) asked for, and where: orbiting away
   * from it — down to eye level outside the building, or more than OPEN_REACH m off — closes the
   * building again; coming back reopens it (checkCutaway).
   */
  let intendedOpen: CameraView["open"] = null;
  let openAnchor: THREE.Vector3 | null = null;
  const OPEN_REACH = 80;
  function intendOpen(open: CameraView["open"], anchor: THREE.Vector3 | null) {
    intendedOpen = open ?? null;
    openAnchor = anchor;
    applyOpen(intendedOpen);
  }

  function checkCutaway() {
    if (mode !== "orbit" || !intendedOpen || !openAnchor || flight) return;
    const open = intendedOpen;
    const c = camera.position;
    const band = levelBand(open.building, open.level);
    const far = Math.hypot(c.x - openAnchor.x, c.z - openAnchor.z) > OPEN_REACH;
    // Down at the cut's height outside the footprint: the floor would stand alone in the street.
    const low = band !== null && c.y < band.ceiling + 1.5 && !inHero(open.building, c.x, c.z);
    const want = far || low ? null : open;
    const now = openState.get(open.building) ?? null;
    if ((want === null) !== (now === null)) {
      applyOpen(want);
      // Labels belong to what is shown now (the open floor's, or the closed building's).
      refreshLabels();
    }
  }

  // Interiors are switched on while the camera may see inside them (BuildingModule.setInterior).
  const interiorState = new Map<string, boolean>();
  function updateInteriors() {
    const c = camera.position;
    for (const m of modules.values()) {
      if (!isBuilding(m) || !m.setInterior) continue;
      const was = interiorState.get(m.id);
      // Walking or on a route every interior is on — on phones only those within reach (below).
      let on = Boolean(openState.get(m.building)) || (mode !== "orbit" && tier !== "low");
      // Phones, while another building is open as a dollhouse: this one's interior is only glimpsed through
      // its glazing — its stand-in (lit slabs) carries that, and the draw calls go to the open building.
      const otherOpen = [...openState.entries()].some(([b, level]) => level && b !== m.building);
      if (!on && !(tier === "low" && otherOpen)) {
        // Hysteresis so a camera hovering at the edge does not flicker the interior. Phones keep interiors
        // for the buildings close by only (a far one shows its stand-in behind its glazing).
        const reach = tier === "low" ? (was ? 150 : 110) : was ? 300 : 240;
        for (const pr of prisms) {
          if (pr.role !== m.building) continue;
          const dx = Math.max(pr.minX - c.x, 0, c.x - pr.maxX);
          const dz = Math.max(pr.minZ - c.z, 0, c.z - pr.maxZ);
          const dy = Math.max(c.y - pr.top, 0);
          if (Math.hypot(dx, dz, dy) < reach) {
            on = true;
            break;
          }
        }
        if (!prisms.some((pr) => pr.role === m.building)) on = true;
      }
      if (was === on) continue;
      interiorState.set(m.id, on);
      try {
        m.setInterior(on);
      } catch (e) {
        recordError(m.id, `setInterior: ${e instanceof Error ? e.message : String(e)}`);
      }
      invalidate();
      // A route's floors and ceilings come from what is shown: index them again with this interior.
      if (on && tourRun) {
        const built = buildTourPath(tourRun.id);
        if (built) buildTourSurfaces(tourRun.id, built.path.points);
      }
    }
  }

  function applyView(v: CameraView, animate: boolean, place?: PlaceId) {
    activeView = v;
    userMoved = false;
    viewIndoor = v.indoor !== undefined && Number.isFinite(v.indoor) ? THREE.MathUtils.clamp(v.indoor, 0, 1) : undefined;
    labelGroup = v.labelGroup;
    intendOpen(v.open ?? null, resolveView(v).target);
    if (v.labels !== undefined) setLabelsInternal(v.labels);
    else {
      refreshLabels();
      // Report the state even when the view leaves it alone, so the UI's toggle matches what is shown.
      emit.onLabels(labelsOn);
    }
    if (place && place !== activePlace) {
      activePlace = place;
      orbit?.setPlace(place);
      emit.onPlace(place);
    }
    const pose = resolveView(v);
    if (!animate || reducedMotion || mode !== "orbit") {
      flight = null;
      placePose(pose.position, pose.target, pose.fov);
      return;
    }
    flyToPose(pose.position, pose.target, pose.fov);
  }

  /**
   * Animated move of the orbit camera to a pose, over the closed buildings on the way (a higher arc,
   * or up–across–down next to tall ones); a cut when nothing reasonable clears them.
   */
  function flyToPose(toP: THREE.Vector3, toT: THREE.Vector3, toFov: number) {
    const fromP = camera.position.clone();
    const fromT = controlsTarget().clone();
    const travel = fromP.distanceTo(toP) + fromT.distanceTo(toT);
    const lift = Math.min(80, travel * 0.12);
    let shape: FlightShape | null = { lift, crane: 0 };
    if (nav.orbit && closedSolids.length) {
      shape = nav.orbit.planFlight([fromP.x, fromP.y, fromP.z], [toP.x, toP.y, toP.z], closedSolids, { lift });
    }
    if (!shape) {
      flight = null;
      placePose(toP, toT, toFov);
      return;
    }
    const climb = shape.crane > 0 ? 2 * shape.lift : 0;
    flight = {
      fromP,
      toP: toP.clone(),
      fromT,
      toT: toT.clone(),
      fromFov: camera.fov,
      toFov,
      shape,
      t: 0,
      dur: THREE.MathUtils.clamp(0.9 + (travel + climb) / 420, 1.0, shape.crane > 0 ? 3 : 2.4),
    };
    invalidate();
  }

  function stepFlight(dt: number): boolean {
    if (!flight) return false;
    const f = flight;
    f.t = Math.min(f.dur, f.t + dt);
    const k = easeInOut(f.t / f.dur);
    const { h, up } = nav.orbit ? nav.orbit.flightProgress(f.shape, k) : { h: k, up: Math.sin(Math.PI * k) };
    camera.position.lerpVectors(f.fromP, f.toP, h);
    camera.position.y += up * f.shape.lift;
    const target = new THREE.Vector3().lerpVectors(f.fromT, f.toT, h);
    camera.fov = THREE.MathUtils.lerp(f.fromFov, f.toFov, h);
    camera.updateProjectionMatrix();
    camera.lookAt(target);
    if (f.t >= f.dur) {
      flight = null;
      placePose(f.toP, f.toT, f.toFov);
    } else {
      const t = controlsTarget();
      t.copy(target);
    }
    return true;
  }

  /** Hero buildings in the order a point is tested (Joki's hall lies inside DataCity's outline, not BioCity's). */
  const HERO_PLACES: readonly PlaceId[] = ["joki", "biocity", "educity"];

  function placeOfView(key: string): PlaceId {
    const p = key.split(":")[0];
    return p === "biocity" || p === "joki" || p === "educity" ? p : "campus";
  }

  function placeOfTarget(id: string, moduleId: string | null): PlaceId {
    if (lib) {
      try {
        return lib.placeForTarget(id);
      } catch {
        // fall through
      }
    }
    return (moduleId && PLACE_OF_MODULE[moduleId]) || "campus";
  }

  function normaliseTarget(id: string): string {
    const raw = id.trim();
    if (lib) {
      try {
        return lib.normaliseTarget(raw) ?? raw.toLowerCase();
      } catch {
        // fall through
      }
    }
    return raw.toLowerCase();
  }

  // ── Labels ──
  function allLabels(): CSS2DObject[] {
    const out: CSS2DObject[] = [];
    for (const m of modules.values()) if (m.root.visible) out.push(...m.labels);
    return out;
  }

  function refreshLabels() {
    // A module that just loaded may carry the focused target's label.
    if (focusTargetId && !focusLabel) focusLabel = labelForTarget(focusTargetId);
    const compact = !labelGroup && container.clientWidth < 640;
    for (const l of allLabels()) {
      const group = l.userData.group as string | undefined;
      const kind = l.userData.kind as string;
      let visible: boolean;
      if (!labelsOn) visible = false;
      // The focused target's own label shows whatever its kind (phones drop landmarks otherwise).
      else if (l === focusLabel) visible = true;
      else if (kind === "floor") visible = !labelGroup;
      // Phones drop context labels — never the event-critical ones (arrival points, entrances, venues).
      else if (compact && (kind === "open" || kind === "landmark" || kind === "street") && !rankOf(l).pinned) visible = false;
      else visible = !labelGroup || !group || group === labelGroup || group === "campus";
      // Modules can hide a label of their own (e.g. massing for buildings another module models).
      if (l.userData.hidden === true) visible = false;
      // CSS2DRenderer derives the element's display from `visible` on every render.
      l.visible = visible;
    }
    // The next frame draws the new set; occlusion and declutter follow it.
    occlusionDue = true;
    declutterDue = true;
    invalidate();
  }

  /**
   * A target's own label: the one nearest the thing itself (its pickable, else its view's look-at
   * point), from the module that provides the target when it has one close by, else from any module.
   */
  function labelForTarget(id: string): CSS2DObject | null {
    const entry = targets.get(id);
    if (!entry) return null;
    const mod = entry.module ? modules.get(entry.module) : undefined;
    const box = new THREE.Box3();
    for (const p of mod?.pickables ?? []) {
      p.traverse((o) => {
        if (o.userData.pickId === id) box.expandByObject(o);
      });
    }
    const anchor = box.isEmpty() ? v3(entry.target.view.target) : box.getCenter(new THREE.Vector3());
    const nearest = (pool: CSS2DObject[]) => {
      let best: CSS2DObject | null = null;
      let bestD = 15;
      for (const l of pool) {
        l.getWorldPosition(labelWorld);
        // Labels float above what they name: height counts half.
        const d = Math.hypot(labelWorld.x - anchor.x, (labelWorld.y - anchor.y) * 0.5, labelWorld.z - anchor.z);
        if (d < bestD) {
          bestD = d;
          best = l;
        }
      }
      return best;
    };
    return (mod && nearest(mod.labels)) || nearest(allLabels());
  }

  /** Focus (or clear) the target whose label must stay readable over its neighbours. */
  function setFocusTarget(id: string | null) {
    const next = id ? normaliseTarget(id) : null;
    if (next === focusTargetId && (!next || focusLabel)) return;
    focusTargetId = next;
    focusLabel = next ? labelForTarget(next) : null;
    refreshLabels();
  }

  function setLabelsInternal(on: boolean) {
    labelsOn = on;
    refreshLabels();
    emit.onLabels(on);
  }

  // Occluders for labels (and the sun's glare, picks): the campus buildings as their LOD2 roof parts —
  // each part its own prism (a low wing doesn't hide what its tall neighbour would), else the footprint.
  interface Prism {
    poly: V2[];
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    bottom: number;
    top: number;
    role?: string;
    /** CampusBuilding id. */
    building: string;
  }
  let prisms: Prism[] = [];
  /** Building outlines: the building a label (or the camera) is in never hides it. */
  let outlines: { id: string; poly: V2[]; minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  function buildPrisms(parts: BuildingVolume[]) {
    if (!campus) return;
    prisms = parts.map((v) => ({
      poly: v.polygon,
      ...polygonBounds(v.polygon),
      bottom: v.bottom,
      top: v.top,
      role: v.role,
      building: v.building,
    }));
    outlines = campus.buildings.map((b) => ({ id: b.id, poly: b.polygon, ...polygonBounds(b.polygon) }));
  }

  /**
   * True when a building stands between the camera and the point. The point's own building never hides
   * it — unless `strict` (an entrance label seen from the air: its own building does hide a door on the
   * far side, or under an overhang).
   */
  function occluded(p: THREE.Vector3, strict = false): boolean {
    const c = camera.position;
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const minX = Math.min(c.x, p.x);
    const maxX = Math.max(c.x, p.x);
    const minZ = Math.min(c.z, p.z);
    const maxZ = Math.max(c.z, p.z);
    // The label's own building, and the one the camera stands in, never hide it.
    let own: string[] | null = null;
    for (const o of outlines) {
      const inP = !strict && p.x >= o.minX && p.x <= o.maxX && p.z >= o.minZ && p.z <= o.maxZ && pointInRing([p.x, p.z], o.poly);
      const inC = !inP && c.x >= o.minX && c.x <= o.maxX && c.z >= o.minZ && c.z <= o.maxZ && pointInRing([c.x, c.z], o.poly);
      if (inP || inC) (own ??= []).push(o.id);
    }
    for (const pr of prisms) {
      if (pr.maxX < minX || pr.minX > maxX || pr.maxZ < minZ || pr.minZ > maxZ) continue;
      if (pr.role && openState.get(pr.role)) continue;
      if (own?.includes(pr.building)) continue;
      // Parameters where the ground segment crosses the footprint edges.
      const ts: number[] = [];
      const poly = pr.poly;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const ax = poly[j][0];
        const az = poly[j][1];
        const ex = poly[i][0] - ax;
        const ez = poly[i][1] - az;
        const den = dx * ez - dz * ex;
        if (Math.abs(den) < 1e-9) continue;
        const t = ((ax - c.x) * ez - (az - c.z) * ex) / den;
        const u = ((ax - c.x) * dz - (az - c.z) * dx) / den;
        if (t > 0 && t < 1 && u >= 0 && u <= 1) ts.push(t);
      }
      if (ts.length < 2) continue;
      ts.sort((a, b) => a - b);
      for (let k = 0; k + 1 < ts.length; k += 2) {
        const y0 = c.y + (p.y - c.y) * ts[k];
        const y1 = c.y + (p.y - c.y) * ts[k + 1];
        if (Math.min(y0, y1) < pr.top && Math.max(y0, y1) > pr.bottom) return true;
      }
    }
    return false;
  }

  const labelWorld = new THREE.Vector3();

  /** Floor and ceiling (y) of a building's level: from its floor up to the next level's (or a storey). */
  function levelBand(building: string, level: LevelId): { floor: number; ceiling: number } | null {
    for (const m of modules.values()) {
      if (!isBuilding(m) || m.building !== building) continue;
      const l = m.levels.find((x) => x.id === level);
      if (!l) return null;
      const above = m.levels.filter((x) => x.y > l.y + 1).map((x) => x.y);
      return { floor: l.y, ceiling: above.length ? Math.min(...above) : l.y + 4.5 };
    }
    return null;
  }

  /**
   * The hero building the camera is in — walking or on a route, by the level it is on (with that
   * level's floor and ceiling); orbiting, by its position: inside a part of the building below its roof,
   * or, for a building opened as a dollhouse, below the open level's ceiling. null = outdoors.
   */
  function cameraInside(): { building: string; floor?: number; ceiling?: number } | null {
    if (mode === "walk" || mode === "tour") {
      const level = mode === "walk" ? (walker?.state().level ?? null) : (tourRun?.cameraLevel ?? null);
      const building = buildingOfLevel(level);
      if (!building || !level) return null;
      return { building, ...levelBand(building, level) };
    }
    const ceilings: Partial<Record<BuildingRole, number>> = {};
    for (const m of modules.values()) {
      if (!isBuilding(m)) continue;
      const level = openState.get(m.building);
      const band = level ? levelBand(m.building, level) : null;
      if (band) ceilings[m.building] = band.ceiling;
    }
    const c = camera.position;
    const v = volumeAt(heroParts, c.x, c.y, c.z, { ceilings });
    return v?.role ? { building: v.role } : null;
  }

  /** Orbit exposure: the view's own, else interior light inside a building, a blend over an opened one, else exterior. */
  function orbitIndoor(): number {
    if (viewIndoor !== undefined) return viewIndoor;
    if (cameraInside()) return 1;
    for (const level of openState.values()) if (level) return 0.55;
    return 0;
  }

  /**
   * A label shows unless a building hides it (occlusion), a more important one overlaps it (declutter)
   * or, at eye level, it is not among the few nearest useful ones (capped). An event-critical label
   * behind a building in the map views is dimmed instead of hidden.
   */
  function applyLabelVisibility(l: CSS2DObject) {
    l.element.style.visibility = l.userData.occluded || l.userData.cluttered || l.userData.capped || l.userData.edge ? "hidden" : "";
    l.element.style.opacity = l.userData.dim && l !== focusLabel ? "0.55" : "";
  }

  /** Wayfinding rank of a label (labels.ts labelRank), cached on the label. */
  function rankOf(l: CSS2DObject): LabelRank {
    let r = l.userData.rank as LabelRank | undefined;
    if (!r) {
      r = labelRank({
        kind: l.userData.kind as string | undefined,
        text: l.userData.text as string | undefined,
        group: l.userData.group as string | undefined,
        closed: l.userData.closed === true,
        pinned: l.userData.pinned === true,
      });
      l.userData.rank = r;
    }
    return r;
  }

  /** (x, z) is in a hero building: its outline, or one of its LOD2 parts (Joki's hall lies in DataCity's outline). */
  function inHero(building: string, x: number, z: number): boolean {
    const outline = heroOutlines.get(building);
    if (outline && pointInRing([x, z], outline)) return true;
    return heroParts.some((v) => v.role === building && pointInRing([x, z], v.polygon));
  }

  /**
   * Building walls for eye-level lines of sight: the hero buildings' wall segments per level (columns
   * and furniture — circles — never hide a label), indexed once per set of modules.
   */
  let losCache: { level: LevelId; y: number; index: ColliderIndex }[] | null = null;
  function losLevels() {
    if (losCache) return losCache;
    const byLevel = new Map<LevelId, Collider2D[]>();
    const floors = new Map<LevelId, number>();
    for (const m of modules.values()) {
      if (!isBuilding(m) || !m.root.visible) continue;
      for (const lv of m.levels) floors.set(lv.id, lv.y);
      for (const c of m.colliders ?? []) {
        if (c.kind !== "segment" || c.level === "outdoor") continue;
        const list = byLevel.get(c.level) ?? [];
        list.push(c);
        byLevel.set(c.level, list);
      }
    }
    losCache = [...byLevel].map(([level, list]) => ({ level, y: floors.get(level) ?? 0, index: indexColliders(list, 4) }));
    return losCache;
  }

  /**
   * A wall of a level near `floor` (±1.6 m) stands between the eye and a label, in plan. The last 2.4 m
   * before the label don't count: labels float over their own stand, counter or door frame.
   */
  function wallBetween(c: THREE.Vector3, p: THREE.Vector3, floor: number): boolean {
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const len = Math.hypot(dx, dz);
    if (len < 3) return false;
    const ux = dx / len;
    const uz = dz / len;
    const a: V2 = [c.x + ux * 0.3, c.z + uz * 0.3];
    const b: V2 = [p.x - ux * 2.4, p.z - uz * 2.4];
    for (const lv of losLevels()) {
      if (lv.y < floor - 1.6 || lv.y > floor + 1.6) continue;
      const near = lv.index.query(Math.min(a[0], b[0]) - 0.1, Math.min(a[1], b[1]) - 0.1, Math.max(a[0], b[0]) + 0.1, Math.max(a[1], b[1]) + 0.1);
      if (near.length && castCircle(a, b, 0.02, near) < 1) return true;
    }
    return false;
  }

  /**
   * Smallest lift (m) that clears an occluded entrance label's anchor of the buildings in front; 0 = none
   * does, or the door faces away from the camera (a door on the far side stays dimmed where it is).
   */
  function clearLift(at: THREE.Vector3): number {
    let door: { at: V2; facing: number } | null = null;
    let best = 6;
    for (const e of campus?.entrances ?? []) {
      if (e.facing === undefined) continue;
      const d = Math.hypot(e.at[0] - at.x, e.at[1] - at.z);
      if (d < best) {
        best = d;
        door = { at: e.at, facing: e.facing };
      }
    }
    if (door) {
      const f = (door.facing * Math.PI) / 180;
      if (Math.sin(f) * (camera.position.x - door.at[0]) - Math.cos(f) * (camera.position.z - door.at[1]) < 0) return 0;
    }
    const p = new THREE.Vector3();
    for (const lift of [5, 9, 14, 20, 27]) {
      p.set(at.x, at.y + lift, at.z);
      if (!occluded(p, true)) return lift;
    }
    return 0;
  }

  const liftA = new THREE.Vector3();
  const liftB = new THREE.Vector3();
  /**
   * Raise a label by `lift` m over its own anchor (labels sit in frames that only turn about y, so
   * local y is world y) with a 1 px leader line down to where it belongs; 0 puts it back.
   */
  function setLift(l: CSS2DObject, lift: number, anchor: THREE.Vector3) {
    const was = (l.userData.lift as number | undefined) ?? 0;
    if (was !== lift) {
      l.position.y += lift - was;
      l.userData.lift = lift;
      l.updateMatrixWorld();
    }
    let leader = l.userData.leader as HTMLDivElement | undefined;
    if (!lift) {
      if (leader) leader.style.display = "none";
      return;
    }
    if (!leader) {
      leader = document.createElement("div");
      leader.setAttribute("aria-hidden", "true");
      Object.assign(leader.style, { position: "absolute", left: "50%", top: "100%", width: "1px", background: "var(--color-event, #8b7bff)", opacity: "0.85" });
      l.element.appendChild(leader);
      l.userData.leader = leader;
    }
    // The line's length on screen: from the label's bottom edge down to the anchor's projection.
    liftA.copy(anchor).project(camera);
    liftB.set(anchor.x, anchor.y + lift, anchor.z).project(camera);
    const px = ((liftA.y - liftB.y) / 2) * container.clientHeight - l.element.offsetHeight / 2;
    leader.style.height = `${Math.max(0, Math.round(px))}px`;
    leader.style.display = px > 4 ? "block" : "none";
  }

  /** Height of the eye over the ground (orbit: over the terrain under the camera). */
  function cameraHeight(): number {
    return camera.position.y - (terrain ? terrain.heightAt(camera.position.x, camera.position.z) : 0);
  }

  /** Floor the eye stands on, walking or on a route (null: orbiting). */
  function eyeFloor(): number | null {
    if (mode === "walk") return camera.position.y - 1.65;
    if (mode === "tour") return tourRun ? tourRun.walker.y : camera.position.y - 2;
    return null;
  }

  /**
   * Which labels a building (or, at eye level, a wall, the distance or the cap) hides. Map views
   * (orbit): an event-critical label behind a building is dimmed, never hidden; a closed door shows
   * only in close views. Eye level (walking, routes): only what is in sight — not through walls, not
   * from other floors, within each kind's reach — and at most a few, the nearest useful ones.
   */
  function updateOcclusion() {
    // Inside a building, its walls hide whatever is outside it — and, walking or on a route, its other
    // floors (a level's lower parts, like Joki's Aula below the Showroom, still count as that level).
    const inside = cameraInside();
    const floor = eyeFloor();
    const eye = floor !== null;
    const height = cameraHeight();
    const aerial = !eye && height > 25;
    const c = camera.position;
    const candidates: { item: CSS2DObject; distance: number; prio: number }[] = [];
    for (const l of allLabels()) {
      if (!l.visible) continue;
      l.getWorldPosition(labelWorld);
      // Where the label belongs (a lift for an aerial view is undone first).
      labelWorld.y -= (l.userData.lift as number | undefined) ?? 0;
      const r = rankOf(l);
      const distance = labelWorld.distanceTo(c);
      let hidden = false;
      let dim = false;
      let lift = 0;
      if (inside) {
        hidden = !inHero(inside.building, labelWorld.x, labelWorld.z);
        if (!hidden && inside.floor !== undefined && inside.ceiling !== undefined) {
          hidden = labelWorld.y < inside.floor - 1.5 || labelWorld.y > inside.ceiling + 0.5;
        }
      }
      if (!hidden && r.closeOnly && (aerial || distance > 60)) hidden = true;
      if (!hidden && l !== focusLabel) {
        if (eye) {
          const info = { kind: l.userData.kind as string, text: l.userData.text as string, closed: l.userData.closed === true };
          if (distance > eyeLevelReach(info)) hidden = true;
          else if (occluded(labelWorld)) hidden = true;
          // Signs high over the street (a building's name on its roof) are seen over the walls.
          else if (labelWorld.y - c.y < 6 && wallBetween(c, labelWorld, floor)) hidden = true;
        } else if (occluded(labelWorld, aerial && l.userData.kind === "entrance")) {
          // An event entrance under an overhang (BioCity's main entrance under the crown bridge): from
          // the air its label rises above what covers it, on a leader line down to the door.
          if (r.pinned && aerial && l.userData.kind === "entrance") lift = clearLift(labelWorld);
          // Low over the street the map keeps only the nearer event-critical labels.
          // An orbit camera down at eye height sees walls as a walker does: what is behind one is hidden.
          if (lift > 0) dim = false;
          // A venue's name behind another building reads as that building's name low over the street
          // (Joki over BioCity's north block from Tykistökatu): only the map from the air keeps it, dimmed.
          else if (r.pinned && height > 8 && (l.userData.kind === "building" ? aerial : height > 15 || distance < 160)) dim = true;
          else hidden = true;
        }
      } else if (!hidden && occluded(labelWorld)) {
        // The focused target's own label: a building in front still hides it at eye level.
        if (eye) hidden = true;
        else dim = true;
      }
      setLift(l, hidden ? 0 : lift, labelWorld);
      l.userData.occluded = hidden;
      l.userData.dim = dim;
      l.userData.capped = false;
      if (eye && !hidden) candidates.push({ item: l, distance, prio: r.prio });
    }
    if (eye) {
      // A few labels at a time at eye level (phones fewer): the nearest useful ones. The event-critical
      // ones in reach and in sight (an event entrance, a venue's name) come on top: a cluster of company
      // signs next to the walker never hides the door builders walk to.
      const pinned = candidates.filter((c) => rankOf(c.item).pinned);
      const keep = eyeLevelPick(candidates.filter((c) => !rankOf(c.item).pinned), container.clientWidth < 640 ? 3 : 5, focusLabel);
      for (const c of pinned) keep.add(c.item);
      for (const { item } of candidates) item.userData.capped = !keep.has(item);
    }
    for (const l of allLabels()) if (l.visible) applyLabelVisibility(l);
  }

  /**
   * Hide overlapping labels: the higher wayfinding rank wins (labels.ts labelRank — venues and event
   * entrances first), a dimmed one loses to a clear one of the same rank, and a label cut by the
   * canvas edge is hidden rather than shown in part. The result sticks until the next pass, so
   * occlusion updates while the camera moves don't flash decluttered labels back on.
   */
  function declutter() {
    const shown: { rect: LabelBox; prio: number }[] = [];
    const frame = labelRenderer.domElement.getBoundingClientRect();
    const free = freeBox(frame.left, frame.top, frame.width, frame.height);
    const list = allLabels()
      .filter((l) => l.visible && !l.userData.occluded && !l.userData.capped)
      // The focused target's label first: overlap never hides it (a building in front still does). The
      // active view's own labels (its stands, its rooms) come next, before the venues and entrances.
      .map((l) => ({
        l,
        prio:
          l === focusLabel
            ? 100
            : rankOf(l).prio - dimPenalty(l) + (ownViewLabel(l) ? 3 : 0),
      }))
      .sort((a, b) => b.prio - a.prio);
    const overlaps = (r: LabelBox) =>
      shown.some((s) => r.left < s.rect.right + 4 && r.right > s.rect.left - 4 && r.top < s.rect.bottom + 2 && r.bottom > s.rect.top - 2);
    // Two modules may name the same door (the route network's end and the building's own label), and
    // phones drop the detail that tells a building's doors apart: one label per name within 60 m.
    const said: { text: string; at: THREE.Vector3 }[] = [];
    const sayingOf = (l: CSS2DObject) => (l.userData.kind === "street" ? "" : String(l.userData.text ?? "").trim().toLowerCase());
    for (const { l, prio } of list) {
      // visibility: hidden keeps the layout box, so hidden labels measure like shown ones.
      setLabelShift(l, 0, 0);
      l.userData.edge = false;
      const measured = l.element.getBoundingClientRect();
      let rect: LabelBox = measured;
      let hit = false;
      let stack = 0;
      let nudge: { dx: number; dy: number } | null = { dx: 0, dy: 0 };
      if (measured.width > 0) {
        // Partly off the canvas or under the controls: nudged in while its anchor is in the free part,
        // else hidden (the focused target's label stays, wherever it is).
        nudge = nudgeInto(measured, free);
        if (nudge) rect = shiftBox(measured, nudge.dx, nudge.dy);
        else if (l !== focusLabel) hit = true;
        const text = sayingOf(l);
        l.getWorldPosition(labelWorld);
        const dup = !hit && l !== focusLabel && !!text && said.some((x) => x.text === text && x.at.distanceTo(labelWorld) < 60);
        if (dup) hit = true;
        if (!hit && overlaps(rect)) hit = true;
        // Two event-critical labels on top of each other (an entrance next to its venue's other
        // entrance): stack them rather than drop one.
        if (hit && !dup && nudge && rankOf(l).pinned) {
          for (const dy of [-(measured.height + 4), measured.height + 4]) {
            const moved = shiftBox(rect, 0, dy);
            const back = nudgeInto(moved, free);
            if (back && back.dx === 0 && back.dy === 0 && !overlaps(moved)) {
              rect = moved;
              stack = dy;
              hit = false;
              break;
            }
          }
        }
        l.userData.box = { w: measured.width, h: measured.height };
      }
      l.userData.stack = hit ? 0 : stack;
      if (!hit && nudge) setLabelShift(l, nudge.dx, nudge.dy + stack);
      l.userData.cluttered = hit;
      applyLabelVisibility(l);
      if (!hit && measured.width > 0) {
        shown.push({ rect, prio });
        const text = sayingOf(l);
        if (text) said.push({ text, at: l.getWorldPosition(new THREE.Vector3()) });
      }
    }
  }

  /**
   * A label the active view is about: its label group (biocity:stands' four stands), or in a view that
   * opens a building, the stands and company rooms inside (biocity:gallery) — they win the declutter
   * over the venue names and entrances around them.
   */
  function ownViewLabel(l: CSS2DObject): boolean {
    if (labelGroup && l.userData.group === labelGroup) return true;
    const kind = l.userData.kind;
    return mode === "orbit" && !!activeView?.open && (kind === "stand" || kind === "company");
  }

  /**
   * A dimmed label (behind a building) loses an overlap to a clear one of its rank — but an event
   * entrance still outranks the venue names: the door builders must find is behind BioCity from most
   * overviews.
   */
  function dimPenalty(l: CSS2DObject): number {
    if (!l.userData.dim) return 0;
    return l.userData.kind === "entrance" && rankOf(l).pinned ? 0.4 : 1.5;
  }

  function shiftBox(r: LabelBox, dx: number, dy: number): LabelBox {
    return { left: r.left + dx, right: r.right + dx, top: r.top + dy, bottom: r.bottom + dy, width: r.width, height: r.height };
  }

  /** The part of a w × h label layer at (x, y) the controls leave free, 2 px in. */
  function freeBox(x: number, y: number, w: number, h: number) {
    const e = insetsFor(w, h);
    return { left: x + e.left + 2, right: x + w - e.right - 2, top: y + e.top + 2, bottom: y + h - e.bottom - 2 };
  }

  /** Shift a label's element on screen (margins: CSS2DRenderer owns its transform). */
  function setLabelShift(l: CSS2DObject, dx: number, dy: number) {
    const left = Math.abs(dx) < 0.5 ? "" : `${Math.round(dx)}px`;
    const top = Math.abs(dy) < 0.5 ? "" : `${Math.round(dy)}px`;
    if (l.element.style.marginLeft !== left) l.element.style.marginLeft = left;
    if (l.element.style.marginTop !== top) l.element.style.marginTop = top;
  }

  const keepAt = new THREE.Vector3();
  /**
   * Every frame, between the label passes: keep each shown label inside the free part as the camera
   * moves (walking turns a label into the canvas edge long before the next declutter) — nudged in
   * while its anchor is in, hidden once the anchor leaves. Projection only: no layout reads.
   */
  function keepLabelsInside() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    const f = freeBox(0, 0, w, h);
    for (const l of allLabels()) {
      if (!l.visible || l.userData.occluded || l.userData.cluttered || l.userData.capped) continue;
      const box = l.userData.box as { w: number; h: number } | undefined;
      if (!box) continue;
      l.getWorldPosition(keepAt).project(camera);
      if (keepAt.z > 1) continue;
      const stack = (l.userData.stack as number | undefined) ?? 0;
      const cx = ((keepAt.x + 1) / 2) * w;
      const cy = ((1 - keepAt.y) / 2) * h + stack;
      const n = nudgeInto({ left: cx - box.w / 2, right: cx + box.w / 2, top: cy - box.h / 2, bottom: cy + box.h / 2, width: box.w, height: box.h }, f);
      const edge = !n && l !== focusLabel;
      if (edge !== (l.userData.edge === true)) {
        l.userData.edge = edge;
        applyLabelVisibility(l);
      }
      setLabelShift(l, n?.dx ?? 0, (n?.dy ?? 0) + stack);
    }
  }

  // ── Time ──
  function setTimeInternal(iso: string) {
    lighting = sky.setTime(normaliseTime(iso));
    setFacadeLighting(lighting);
    for (const m of modules.values()) {
      try {
        m.setLighting?.(lighting);
      } catch (e) {
        recordError(m.id, `setLighting: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    invalidate();
  }

  // ── Module loading ──
  async function buildOne(id: string): Promise<WorldModule | null> {
    const entry = BUILDERS[id];
    if (!entry) {
      recordError(id, "unknown module id");
      return null;
    }
    let mod: unknown;
    try {
      mod = await entry.load();
    } catch {
      recordError(id, `not available yet (${entry.file} is missing or failed to compile)`);
      return null;
    }
    // Closed while the code was loading: build nothing (the user has moved on; a new engine may be loading).
    if (disposed) return null;
    const fn = isObject(mod) ? mod[entry.exportName] : undefined;
    if (typeof fn !== "function") {
      recordError(id, `${entry.file} does not export ${entry.exportName}()`);
      return null;
    }
    builtReduced.set(id, ctx.reducedMotion);
    // Promise.resolve().then also turns a builder that throws synchronously into a rejection.
    const building = Promise.resolve().then(() => (fn as (c: TwinContext) => unknown)(ctx));
    try {
      const built = await withTimeout(building, 90_000, id);
      return asModule(built, id);
    } catch (e) {
      recordError(id, e instanceof Error ? e.message : String(e));
      // A builder that finishes after the timeout (or returns something unusable) still holds timers,
      // listeners and GPU buffers: free them when it does.
      building.then(discardModule, () => undefined);
      return null;
    }
  }

  function addModule(m: WorldModule) {
    if (disposed) {
      // Finished after dispose(): free it at once (modules attach timers and listeners while building).
      discardModule(m);
      return;
    }
    const prev = modules.get(m.id);
    if (prev) removeModule(prev.id);
    modules.set(m.id, m);
    losCache = null;
    for (const l of m.labels) if (!l.parent) m.root.add(l);
    scene.add(m.root);
    if (m.id === "massing") {
      massing = m as MassingModule;
      for (const w of massing.warnings ?? []) recordError("massing", w);
    }
    for (const [key, view] of Object.entries(m.views ?? {})) views.set(key, { view, module: m.id });
    for (const t of m.targets) targets.set(t.id, { target: t, module: m.id });
    try {
      m.setLighting?.(lighting);
    } catch (e) {
      recordError(m.id, `setLighting: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (isBuilding(m)) {
      openState.set(m.building, null);
      try {
        m.setOpen(activeView?.open && activeView.open.building === m.building ? activeView.open.level : null);
      } catch (e) {
        recordError(m.id, `setOpen: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    m.ready.catch((e: unknown) => recordError(m.id, `ready: ${e instanceof Error ? e.message : String(e)}`));
    interiorState.delete(m.id);
    updateInteriors();
    refreshLabels();
    invalidate();
  }

  function removeModule(id: string) {
    const m = modules.get(id);
    if (!m) return;
    modules.delete(id);
    losCache = null;
    scene.remove(m.root);
    try {
      m.dispose?.();
    } catch (e) {
      recordError(id, `dispose: ${e instanceof Error ? e.message : String(e)}`);
    }
    disposeDeep(m.root);
    for (const [k, v] of [...views]) if (v.module === id) views.delete(k);
    for (const [k, v] of [...targets]) if (v.module === id) targets.delete(k);
    for (const [k, v] of Object.entries(FALLBACK_VIEWS)) if (!views.has(k)) views.set(k, { view: v, module: null });
    for (const [k, v] of Object.entries(FALLBACK_TARGETS)) if (!targets.has(k)) targets.set(k, { target: { id: k, view: v }, module: null });
    if (id === "massing") massing = null;
    interiorState.delete(id);
  }

  function applyClaims() {
    if (!massing) return;
    const claimed = new Set<number>();
    const claimedLod2 = new Set<string>();
    for (const m of modules.values()) {
      if (!m.root.visible || m.id === "massing") continue;
      for (const c of m.claims ?? []) claimed.add(c);
      for (const c of m.claimsLod2 ?? []) claimedLod2.add(c);
    }
    massing.applyClaims(claimed, {
      ground: !!modules.get("ground")?.root.visible,
      context: !!modules.get("context")?.root.visible,
      lod2: claimedLod2,
    });
    // A venue's name stays on the map even when the module that models the building brings no name
    // label of its own (BioCity): the massing's label stands in for it.
    const names = new Set<string>();
    for (const m of modules.values()) {
      if (m.id === "massing" || !m.root.visible) continue;
      for (const l of m.labels) if (l.userData.kind === "building") names.add(String(l.userData.text ?? "").toLowerCase());
    }
    for (const l of massing.labels) {
      if (rankOf(l).pinned && l.userData.hidden === true && !names.has(String(l.userData.text ?? "").toLowerCase())) l.userData.hidden = false;
    }
    refreshLabels();
  }

  /** Data the scene can't be shown without; its failure rejects load() so the UI offers "Try again". */
  const dataFailures: string[] = [];

  async function loadSupport() {
    // Data and navigation used by the engine itself (terrain heights, solids, decks, tours). The data
    // loaders are cached: the modules' requests for the same files share these fetches.
    const data = (what: string, essential: boolean) => (e: unknown) => {
      const message = e instanceof Error ? e.message : String(e);
      recordError("data", `${what}: ${message}`);
      if (essential) dataFailures.push(message);
      return null;
    };
    const [t, c, r, st, l2, l, o, w, tr] = await Promise.all([
      import("./data/campus").then((d) => d.loadTerrain()).catch(data("terrain", true)),
      import("./data/campus").then((d) => d.loadCampus()).catch(data("campus.json", true)),
      import("./data/campus").then((d) => d.loadRoutes()).catch(data("routes.json", false)),
      import("./data/campus").then((d) => d.loadStreets()).catch(data("streets.json", false)),
      import("./data/campus").then((d) => d.loadLod2()).catch(data("lod2.json", false)),
      import("@/lib/hackathon-2026/twin").catch(() => null),
      import("./nav/orbit").catch(() => null),
      import("./nav/walk").catch(() => null),
      import("./nav/tour").catch(() => null),
    ]);
    terrain = t;
    campus = c;
    routes = r;
    streets = st;
    lod2 = l2;
    // The buildings as LOD2 parts (else footprints), once: label/glare/pick occluders and camera solids.
    const parts = campus ? buildingVolumes(campus, lod2) : [];
    heroParts = parts.filter((v) => v.role === "biocity" || v.role === "joki" || v.role === "educity");
    for (const b of campus?.buildings ?? []) if (b.role === "biocity" || b.role === "joki" || b.role === "educity") heroOutlines.set(b.role, b.polygon);
    buildPrisms(parts);
    volumes = parts.map((v) => ({ polygon: v.polygon, top: v.top, bottom: v.bottom, role: v.role }));
    updateSolids();
    lib = l;
    nav.orbit = o;
    nav.walk = w;
    nav.tour = tr;
    if (!t) recordError("engine", "terrain (terrain/dtm.png) not available — heights default to 0");
    if (!o) recordError("engine", "nav/orbit.ts not available — plain OrbitControls");
    if (!w) recordError("engine", "nav/walk.ts not available — walk mode disabled");
    if (!tr) recordError("engine", "nav/tour.ts not available — tours disabled");
    if (!disposed) setupOrbit();
  }

  async function loadModules(ids: string[]) {
    const phase0 = ids.filter((id) => BUILDERS[id]?.phase === 0);
    const phase1 = ids.filter((id) => BUILDERS[id]?.phase !== 0);
    const total = ids.length;
    let loaded = 0;
    const progress = () => emit.onProgress({ loaded, total });
    progress();
    const run = async (id: string) => {
      const m = await buildOne(id);
      loaded++;
      if (m) {
        // After dispose(), addModule frees it instead.
        addModule(m);
        if (!disposed) applyClaims();
      }
      if (!disposed) progress();
    };
    await Promise.all(phase0.map(run));
    if (disposed) return;
    // First frame as early as possible: terrain + massing are in.
    invalidate();
    await Promise.all(phase1.map(run));
    if (disposed) return;
    if (modules.has("people")) {
      try {
        const people = await BUILDERS.people.load();
        const factory = isObject(people) ? people.makeWalkerAvatar : undefined;
        if (typeof factory === "function") avatarFactory = factory as (c: TwinContext) => THREE.Object3D;
      } catch {
        // Keep the capsule.
      }
    }
  }

  function moduleIdsToLoad(): string[] {
    if (!wanted) return MODULE_IDS;
    const ids = MODULE_IDS.filter((id) => wanted?.has(id));
    // Keep a ground under subsets: massing provides the provisional terrain.
    if (!ids.includes("ground") && !ids.includes("massing")) ids.unshift("massing");
    return ids;
  }

  function initialView() {
    const focusParam = params.get("focus");
    const viewParam = params.get("view");
    const placeParam = params.get("place");
    if (focusParam) {
      const id = normaliseTarget(focusParam);
      const entry = targets.get(id);
      if (entry) {
        applyView(entry.target.view, false, placeOfTarget(id, entry.module));
        setFocusTarget(id);
        return;
      }
    }
    const place = placeParam === "biocity" || placeParam === "joki" || placeParam === "educity" ? placeParam : "campus";
    const key = viewParam ? (viewParam.includes(":") ? viewParam : `${place}:${viewParam}`) : `${place}:default`;
    const entry = views.get(key) ?? views.get(`${place}:default`) ?? views.get("campus:default");
    if (entry) applyView(entry.view, false, placeOfView(key));
  }

  async function load(): Promise<void> {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      const support = loadSupport();
      initialView();
      await loadModules(moduleIdsToLoad());
      await support;
      if (disposed) return;
      if (dataFailures.length) {
        throw new Error(`The campus data could not be loaded — ${dataFailures.join("; ")}`);
      }
      applyClaims();
      // A module may have brought a better version of the current view.
      initialView();
      // The UI's labels toggle hears the state the scene shows (whatever the views said or didn't).
      emit.onLabels(labelsOn);
      // Wait for textures and module assets, then render a few frames before "ready".
      const assets = [materials.ready(), ...[...modules.values()].map((m) => m.ready.catch(() => undefined))];
      void withTimeout(Promise.all(assets), 20_000, "assets")
        .catch((e: unknown) => recordError("engine", e instanceof Error ? e.message : String(e)))
        // Every shader the user can reach compiles now, behind the loader — not on the first visit to
        // an interior or the first route (a frozen frame of a second or more on phones).
        .then(() => withTimeout(warmUp(), 45_000, "shader warm-up"))
        .catch((e: unknown) => recordError("engine", e instanceof Error ? e.message : String(e)))
        .finally(() => {
          enforceMemoryBudget();
          framesUntilReady = 3;
          invalidate();
        });
    })();
    return loadPromise;
  }

  /** The frame loop draws nothing while the warm-up has the scene in another time of day. */
  let warming = false;
  /** Materials the warm-up compiled (QA: programList lists the ones made later). */
  const warmMaterials = new WeakSet<THREE.Material>();

  /**
   * Compile the shader program of every material in the scene — hidden interiors, cut-away parts,
   * the route ribbon and the tour avatar included — for the render target the scene is drawn into
   * (HDR, linear: the composer's), at the lighting states the time control reaches (light counts
   * and shadow casters are part of a program's key). The scene is switched through the times and
   * back within one synchronous step (no frame sees it); the driver then compiles in parallel
   * (KHR_parallel_shader_compile) while frames go on, and this resolves when every program is linked.
   */
  async function warmUp(): Promise<void> {
    if (disposed || contextLost || typeof renderer.compile !== "function") return;
    const t0 = performance.now();
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace });
    const iso = lighting.iso;
    const day = iso.slice(0, 10);
    const times = [...new Set([iso, `${day}T11:00`, `${day}T16:45`, "2026-11-07T01:00"])];
    const avatar = tourAvatar();
    const hadAvatar = avatar.parent === scene;
    if (!hadAvatar) scene.add(avatar);
    const prev = renderer.getRenderTarget();
    scene.traverse((o) => {
      const mat = (o as THREE.Mesh).material;
      if (mat) for (const m of Array.isArray(mat) ? mat : [mat]) warmMaterials.add(m);
    });
    const pending: Promise<unknown>[] = [];
    // Without parallel compilation (some browsers, software GL) the programs are queued all the same;
    // compileAsync would only add a console warning.
    const parallel = renderer.extensions.has("KHR_parallel_shader_compile");
    warming = true;
    // Lights a module shows and hides with its level of detail (the supercar display's two spots, on
    // only near the display): every light count is a program of its own for each lit material, so
    // the warm-up compiles the scene with those lights counted and without (a first close view would
    // otherwise compile ~150 programs in one frame).
    const moduleLights: THREE.Light[] = [];
    for (const m of modules.values()) {
      m.root.traverse((o) => {
        if ((o as THREE.Light).isLight) moduleLights.push(o as THREE.Light);
      });
    }
    const counted = (o: THREE.Object3D) => {
      for (let p: THREE.Object3D | null = o; p; p = p.parent) if (!p.visible) return false;
      return true;
    };
    const flipped: { o: THREE.Object3D; visible: boolean }[] = [];
    try {
      const compile = () => {
        renderer.setRenderTarget(rt);
        if (parallel) pending.push(renderer.compileAsync(scene, camera));
        else renderer.compile(scene, camera);
        renderer.setRenderTarget(prev);
      };
      const passes = () => {
        for (const time of times) {
          if (time !== lighting.iso) setTimeInternal(time);
          scene.environment = sky.environment();
          compile();
        }
        if (lighting.iso !== iso) setTimeInternal(iso);
        scene.environment = sky.environment();
        // Every building opened at each of its levels, with its interior on: cut-aways and dollhouse
        // lighting switch materials (sides, environment maps, shadows), each variant a program of its own.
        for (const m of modules.values()) {
          if (!isBuilding(m)) continue;
          const wasInterior = interiorState.get(m.id);
          try {
            m.setInterior?.(true);
            for (const lv of m.levels) {
              m.setOpen(lv.id);
              compile();
            }
          } catch (e) {
            recordError(m.id, `warm-up: ${e instanceof Error ? e.message : String(e)}`);
          } finally {
            try {
              m.setOpen(openState.get(m.building) ?? null);
              if (wasInterior !== undefined) m.setInterior?.(wasInterior);
            } catch {
              // Restored as far as the module allows.
            }
          }
        }
      };
      passes();
      if (moduleLights.length) {
        // The other light count: the module lights on if they are off now (their hidden groups shown
        // for the pass), else off.
        const on = !moduleLights.some(counted);
        const flip = (o: THREE.Object3D, visible: boolean) => {
          if (o.visible === visible) return;
          flipped.push({ o, visible: o.visible });
          o.visible = visible;
        };
        for (const light of moduleLights) {
          if (on) for (let p: THREE.Object3D | null = light; p && p !== scene; p = p.parent) flip(p, true);
          else flip(light, false);
        }
        passes();
      }
    } finally {
      for (let i = flipped.length - 1; i >= 0; i--) flipped[i].o.visible = flipped[i].visible;
      renderer.setRenderTarget(prev);
      if (lighting.iso !== iso) setTimeInternal(iso);
      scene.environment = sky.environment();
      if (!hadAvatar) scene.remove(avatar);
      warming = false;
      invalidate();
    }
    try {
      await Promise.all(pending);
    } finally {
      rt.dispose();
      warm.done = true;
      warm.ms = performance.now() - t0;
    }
  }

  // ── Walk ──

  /** The ground's walking surface: the ground module's height model (kerbs, fills, stair sinks), else the DTM. */
  function surfaceAt(x: number, z: number): number | null {
    const ground = modules.get("ground") as (WorldModule & { surfaceAt?: (x: number, z: number) => number }) | undefined;
    if (ground?.root.visible && typeof ground.surfaceAt === "function") {
      try {
        const y = ground.surfaceAt(x, z);
        if (Number.isFinite(y)) return y;
      } catch {
        // The terrain below.
      }
    }
    return terrain ? terrain.heightAt(x, z) : null;
  }

  /** Bridge decks and the stairs the routes take up to them (nav/walk structureWalkAreas), built once per world. */
  let structures: { key: string; areas: WalkArea[] } | null = null;
  function structureAreas(): WalkArea[] {
    // Only where the ground module draws the decks and stairs (the provisional terrain has none).
    const ground = modules.get("ground");
    if (!nav.walk || !ground?.root.visible) return [];
    const key = `${modules.size}|${routes ? 1 : 0}|${streets ? 1 : 0}`;
    if (structures?.key === key) return structures.areas;
    const decks = (streets?.areas ?? [])
      .filter((a) => a.deckY !== undefined && a.poly.length >= 3)
      .map((a) => ({ polygon: a.poly, y: a.deckY as number }));
    const legs = Object.values(routes?.legs ?? {})
      .filter((l) => l.mode === "outdoor" && !l.reverseOf)
      .map((l) => l.points);
    let areas: WalkArea[] = [];
    try {
      areas = nav.walk.structureWalkAreas({ decks, routes: legs, surface: (x, z) => surfaceAt(x, z) ?? 0 });
    } catch (e) {
      recordError("nav/walk", `structures: ${e instanceof Error ? e.message : String(e)}`);
    }
    structures = { key, areas };
    return areas;
  }

  /**
   * Outdoor walk areas that follow the terrain: the campus-wide ground (the ground module's, or the
   * engine's own below) — at least half the terrain extent. Every other outdoor area (a deck, a stair,
   * a platform) keeps its own floor.
   */
  const terrainFollowing = new WeakMap<WalkArea, boolean>();
  function followsTerrain(area: WalkArea): boolean {
    let on = terrainFollowing.get(area);
    if (on === undefined) {
      const ext = terrain?.extent ?? campus?.bounds;
      const bb = polygonBounds(area.polygon);
      on =
        area.level === "outdoor" &&
        !area.slope &&
        (!ext || (bb.maxX - bb.minX) * (bb.maxZ - bb.minZ) >= 0.5 * (ext.maxX - ext.minX) * (ext.maxZ - ext.minZ));
      terrainFollowing.set(area, on);
    }
    return on;
  }

  // ── Walk surfaces: the modelled floors around the walker (nav/corridor.ts), rebuilt as it walks ──
  /** Half-size (m) of the square of surfaces indexed round the walker; rebuilt after REBUILD m. */
  const WALK_SURFACE_REACH = 30;
  const WALK_SURFACE_REBUILD = 12;
  const walkSurf: { index: CorridorIndex | null; cx: number; cz: number; job: number; busy: boolean } = {
    index: null,
    cx: 0,
    cz: 0,
    job: 0,
    busy: false,
  };

  function surfaceRoots(): THREE.Object3D[] {
    return [...modules.values()].filter((m) => m.root.visible && SURFACE_MODULES.has(m.id)).map((m) => m.root);
  }

  /** Index the surfaces round (x, z) when the walker has moved far enough from the last index (time-sliced). */
  function ensureWalkSurfaces(x: number, z: number, force = false) {
    if (walkSurf.busy && !force) return;
    if (!force && walkSurf.index && Math.hypot(x - walkSurf.cx, z - walkSurf.cz) < WALK_SURFACE_REBUILD) return;
    const job = ++walkSurf.job;
    walkSurf.busy = true;
    void buildCorridorIndex(surfaceRoots(), corridorCells([[x, z]], WALK_SURFACE_REACH), {
      shouldStop: () => disposed || job !== walkSurf.job,
    })
      .then((index) => {
        if (job !== walkSurf.job) return;
        walkSurf.busy = false;
        if (!index) return;
        walkSurf.index = index;
        walkSurf.cx = x;
        walkSurf.cz = z;
        invalidate();
      })
      .catch((e: unknown) => {
        walkSurf.busy = false;
        recordError("nav/corridor", e instanceof Error ? e.message : String(e));
      });
  }

  /**
   * The outdoor walking floor at (x, z): the modelled surface nearest the walker's floor (`hint`) —
   * decks, terraces, treads and kerbs as drawn — where the surfaces round the walker are indexed; else
   * the ground's height model. Where nothing is modelled near the walker's floor (the deck ends, the
   * ground is metres below) the ground's height is the answer, which the walk refuses as a ledge.
   */
  function walkFloorAt(x: number, z: number, hint: number | undefined, index: CorridorIndex | null, cx: number, cz: number, reach: number): number | null {
    const ground = surfaceAt(x, z);
    if (index && Math.abs(x - cx) < reach - 1 && Math.abs(z - cz) < reach - 1) {
      const h = index.floorAt(x, z, hint ?? ground ?? 0, 0.7, 0.55);
      if (h !== null) return h;
    }
    return ground;
  }

  function walkWorld(surfaces: { index: CorridorIndex | null; cx: number; cz: number; reach: number } | null = null) {
    const colliders: Collider2D[] = [];
    const walkAreas: WalkArea[] = [];
    const connectors: Connector[] = [];
    for (const m of modules.values()) {
      if (!m.root.visible) continue;
      colliders.push(...(m.colliders ?? []));
      walkAreas.push(...(m.walkAreas ?? []));
      connectors.push(...(m.connectors ?? []));
    }
    walkAreas.push(...structureAreas());
    // Without a ground module, the whole campus is walkable on the terrain.
    if (!walkAreas.some((a) => a.level === "outdoor")) {
      const b = terrain?.extent ?? { minX: -179, maxX: 343, minZ: -208, maxZ: 279 };
      walkAreas.push({
        level: "outdoor",
        y: 0,
        polygon: [
          [b.minX + 2, b.minZ + 2],
          [b.minX + 2, b.maxZ - 2],
          [b.maxX - 2, b.maxZ - 2],
          [b.maxX - 2, b.minZ + 2],
        ],
      });
    }
    // Outdoors the floor is the ground's surface — except on areas with a floor of their own (bridge decks,
    // stairs), which keep it: walkers no longer drop through Kalevansilta into the railway cutting.
    const heightAt: HeightAt = (x, z, level, area, hint) => {
      if (level !== "outdoor" || (area && !followsTerrain(area))) return null;
      const surf = surfaces ?? { index: walkSurf.index, cx: walkSurf.cx, cz: walkSurf.cz, reach: WALK_SURFACE_REACH };
      return walkFloorAt(x, z, hint, surf.index, surf.cx, surf.cz, surf.reach);
    };
    return { colliders, walkAreas, connectors, heightAt };
  }

  /** Closed campus buildings: a walker never starts inside one (canopies and bridges stand on posts). */
  function blockingBuildingAt(p: V2): V2[] | null {
    if (!campus) return null;
    for (const b of campus.buildings) {
      if ((b.minHeight && b.minHeight > 2) || b.baseY !== undefined) continue;
      if (!pointInRing(p, b.polygon) || (b.holes ?? []).some((h) => pointInRing(p, h))) continue;
      return b.polygon;
    }
    return null;
  }

  /** Move an outdoor point out of any building it is in: to the nearest wall, then 0.6 m beyond. */
  function outsideBuildings(p: V2): V2 {
    let q: V2 = p;
    for (let pass = 0; pass < 4; pass++) {
      const ring = blockingBuildingAt(q);
      if (!ring) return q;
      q = pushOutOfRing(q, ring, 0.6);
    }
    return q;
  }

  /**
   * Where walk mode starts. A target (or a view a module provides) starts on its own level: at the
   * module's walkTo, in front of an event door (campus.json entrances), where an eye-level view was
   * taken, or a few metres in front of the target. Views and targets with no module behind them use
   * the place's curated start (WALK_STARTS) — the overview's look-at point is a rooftop. Outdoors,
   * the start is never inside a building.
   */
  function startStateFor(
    start: string | undefined,
    walkAreas: WalkArea[],
  ): { position: V2; level: LevelId; yawDeg: number; y?: number } {
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    let position: V2 = [controlsTarget().x, controlsTarget().z];
    let level: LevelId = "outdoor";
    let yawDeg = vectorBearing(fwd.x, fwd.z);
    let place: PlaceId = activePlace;
    let curated = false;
    /** Floor hint: a door's threshold (decks stand over lower ground, e.g. EduCity's west entrance). */
    let y: number | undefined;
    const viewBearing = (view: CameraView) =>
      vectorBearing(view.target[0] - view.position[0], view.target[2] - view.position[2]);
    if (start) {
      const id = normaliseTarget(start);
      const t = targets.get(id);
      const v = views.get(start);
      const fixed = t ? WALK_STARTS[t.target.id] : undefined;
      if (t && fixed) {
        // A curated start for this target (a campus landmark): before its walkTo and the step back.
        place = placeOfTarget(t.target.id, t.module);
        position = fixed.position;
        yawDeg = fixed.yawDeg;
        level = "outdoor";
      } else if (t) {
        const view = t.target.view;
        place = placeOfTarget(t.target.id, t.module);
        level = t.target.level ?? view.open?.level ?? "outdoor";
        yawDeg = viewBearing(view);
        const eye = view.position[1] - (terrain ? terrain.heightAt(view.position[0], view.position[2]) : 0);
        const door = campus?.entrances.find((e) => e.target === t.target.id && e.facing !== undefined);
        if (t.target.walkTo) position = t.target.walkTo;
        else if (door && door.facing !== undefined && level === "outdoor") {
          position = doorStart(door.at, door.facing, {
            doorY: door.y,
            blocked: (p) => blockingBuildingAt(p) !== null,
            groundAt: (p) => (terrain ? terrain.heightAt(p[0], p[1]) : 0),
          });
          yawDeg = (door.facing + 180) % 360;
          y = door.y;
        } else if (level === "outdoor" && eye < 2.6) position = [view.position[0], view.position[2]];
        else {
          // Stand a few metres back from the target, facing it.
          const r = (yawDeg * Math.PI) / 180;
          position = [view.target[0] - Math.sin(r) * 4, view.target[2] + Math.cos(r) * 4];
        }
        if (t.target.walkYawDeg !== undefined) yawDeg = t.target.walkYawDeg;
      } else if (v) {
        place = placeOfView(start);
        if (v.module) {
          position = [v.view.target[0], v.view.target[2]];
          level = v.view.open?.level ?? "outdoor";
          yawDeg = viewBearing(v.view);
        } else curated = true;
      } else {
        place = placeOfTarget(id, null);
        curated = true;
      }
    }
    // Where people arrive (the station's platform): the start of that arrival leg.
    const startLeg = start ? routes?.legs[WALK_START_LEGS[normaliseTarget(start)] ?? ""] : undefined;
    const onLeg = startLeg ? legStart(startLeg.points) : null;
    if (onLeg) return { position: onLeg.position, level: "outdoor", yawDeg: onLeg.yawDeg, y: onLeg.y };
    // A level nobody has made walkable yet (its building module is missing): start outdoors instead.
    if (level !== "outdoor" && !walkAreas.some((a) => a.level === level)) curated = true;
    if (curated) {
      const s = (start && WALK_STARTS[start]) || WALK_STARTS[place] || WALK_STARTS.campus;
      position = s.position;
      yawDeg = s.yawDeg;
      level = "outdoor";
    }
    if (level === "outdoor") position = outsideBuildings(position);
    return { position, level, yawDeg, y: curated ? undefined : y };
  }

  function setMode(next: "orbit" | "walk" | "tour") {
    if (mode === next) return;
    mode = next;
    updateInteriors();
    emit.onMode(next);
  }

  function walk(on: boolean, start?: string) {
    if (on) {
      const mod = nav.walk;
      if (!mod) {
        recordError("engine", "walk mode unavailable (nav/walk.ts)");
        return;
      }
      if (tourRun) stopTour(false);
      try {
        walker ??= mod.createWalkController(camera, container, {
          reducedMotion,
          // The level the walker actually stands on (also the one enable() resolves): exposure follows it.
          onLevel: (level) => {
            indoorTarget = level === "outdoor" ? 0 : 1;
            invalidate();
          },
          onConnector: (c) => emit.onConnector(c ? { id: c.id, label: c.label } : null),
          onConnectors: (list) => emit.onConnectors(list.map((c) => ({ id: c.id, label: c.label }))),
        });
        const world = walkWorld();
        walker.setWorld(world);
        const s = startStateFor(start, world.walkAreas);
        applyOpen(null);
        walker.enable({ position: s.position, level: s.level, yawDeg: s.yawDeg, pitchDeg: -4, y: s.y });
        // Interiors are about to be on (walk mode): index the floors round the start.
        walkSurf.index = null;
        ensureWalkSurfaces(s.position[0], s.position[1], true);
      } catch (e) {
        // The map keeps (or, if this was a re-start while walking, gets back) its controls and its view's cut-away.
        recordError("nav/walk", e instanceof Error ? e.message : String(e));
        try {
          walker?.disable();
        } catch {
          // Never enabled.
        }
        orbit?.setEnabled(true);
        if (fallbackControls) fallbackControls.enabled = true;
        applyOpen(activeView?.open ?? null);
        if (mode === "walk") {
          emit.onConnector(null);
          emit.onConnectors([]);
          camera.fov = 45;
          camera.updateProjectionMatrix();
          setMode("orbit");
        }
        return;
      }
      flight = null;
      orbit?.setEnabled(false);
      if (fallbackControls) fallbackControls.enabled = false;
      camera.fov = 70;
      camera.updateProjectionMatrix();
      setMode("walk");
      invalidate();
    } else if (walker && mode === "walk") {
      const state = walker.state();
      walker.disable();
      emit.onConnector(null);
      emit.onConnectors([]);
      const feet = camera.position.clone().setY(camera.position.y - 1.65);
      handBack(feet, horizontalForward(), state.level, false);
    }
  }

  function horizontalForward(): THREE.Vector3 {
    const fwd = camera.getWorldDirection(new THREE.Vector3()).setY(0);
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    return fwd.normalize();
  }

  /** The building a walking level belongs to (null outdoors). */
  function buildingOfLevel(level: LevelId | null): BuildingModule["building"] | null {
    if (!level || level === "outdoor") return null;
    return level.startsWith("biocity") ? "biocity" : level.startsWith("joki") ? "joki" : level.startsWith("educity") ? "educity" : null;
  }

  /**
   * Give the camera back to the orbit controls after walking or a route: up and behind the spot, looking
   * at it. Inside a building, that building opens at the walker's level (a dollhouse cut) so the view
   * shows the room rather than the closed shell from inside; outdoors everything stays closed. `stay`
   * (a route ending outdoors) keeps the chase camera where it is, looking where it looked.
   */
  function handBack(feet: THREE.Vector3, fwd: THREE.Vector3, level: LevelId | null, stay: boolean) {
    if (disposed) return;
    orbit?.setEnabled(true);
    if (fallbackControls) fallbackControls.enabled = true;
    const building = buildingOfLevel(level);
    const hasModule = !!building && [...modules.values()].some((m) => isBuilding(m) && m.building === building);
    const indoors = hasModule && level !== null;
    intendOpen(indoors && building && level ? { building, level } : null, feet.clone());
    setMode("orbit");
    // The view now is the walker's, not the last view chip's: a resize must not snap back to that one,
    // nor its exposure apply.
    userMoved = true;
    viewIndoor = undefined;
    if (stay && !indoors) {
      // Orbit around where the camera was looking.
      const target = camera.position.clone().addScaledVector(camera.getWorldDirection(new THREE.Vector3()), 15);
      if (terrain) target.y = Math.max(target.y, terrain.heightAt(target.x, target.z) + 0.5);
      flight = null;
      placePose(camera.position.clone(), target, 45);
      return;
    }
    // Looking at the spot — the walker may be facing a wall, so don't aim past it.
    const target = feet.clone().addScaledVector(fwd, 3);
    target.y = indoors || !terrain ? feet.y : Math.max(feet.y, terrain.heightAt(target.x, target.z));
    const back = feet.clone().addScaledVector(fwd, -15).setY(feet.y + 11);
    // Never into a closed neighbour, nor under the ground.
    nav.orbit?.pushOutOfSolids(back, closedSolids);
    if (terrain) back.y = Math.max(back.y, terrain.heightAt(back.x, back.z) + 1.5);
    if (reducedMotion) {
      flight = null;
      placePose(back, target, 45);
    } else flyToPose(back, target, 45);
  }

  // ── Tours ──
  function makeAvatar(): THREE.Object3D {
    const g = new THREE.Group();
    g.name = "tour-walker";
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.24, 1.1, 6, 14),
      new THREE.MeshStandardMaterial({ color: "#6d4dff", roughness: 0.55, emissive: "#6d4dff", emissiveIntensity: 0.04 }),
    );
    body.position.y = 0.79;
    body.castShadow = true;
    body.name = "tour-walker-body";
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 20, 14),
      new THREE.MeshStandardMaterial({ color: "#c99f86", roughness: 0.6 }),
    );
    head.position.y = 1.62;
    head.castShadow = true;
    head.name = "tour-walker-head";
    // A soft violet ring on the ground so the walker reads from far away.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.55, 40),
      new THREE.MeshBasicMaterial({ color: "#8b7bff", transparent: true, opacity: 0.85, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    ring.renderOrder = 2;
    ring.name = "tour-walker-ring";
    g.add(body, head, ring);
    return g;
  }

  /** The route walker: one per engine, made on first use (or by the shader warm-up) and reused by every route. */
  let avatarObject: THREE.Object3D | null = null;
  function tourAvatar(): THREE.Object3D {
    if (avatarObject) return avatarObject;
    try {
      avatarObject = avatarFactory ? avatarFactory(ctx) : makeAvatar();
    } catch (e) {
      recordError("props/people", `makeWalkerAvatar: ${e instanceof Error ? e.message : String(e)}`);
      avatarObject = makeAvatar();
    }
    return avatarObject;
  }

  /** Show or hide the avatar's body (everything but its ground ring): first person sees from inside it. */
  function setAvatarBody(run: TourRun, on: boolean) {
    if (run.bodyShown === on) return;
    run.bodyShown = on;
    for (const c of run.avatar.children) if (!/ring$/i.test(c.name)) c.visible = on;
    invalidate();
  }

  // ── Route surfaces: the modelled floors and ceilings along the running tour (nav/corridor.ts) ──
  let corridorJob = 0;
  const corridorCache = new Map<string, CorridorIndex>();

  /** Index the scene's surfaces along a tour's path (time-sliced) and hand them to the tour controller. */
  function buildTourSurfaces(id: string, points: V3[]) {
    const job = ++corridorJob;
    const key = `${id}|${[...modules.keys()].join(",")}|${[...interiorState].filter(([, on]) => on).map(([k]) => k).join(",")}`;
    const give = (index: CorridorIndex) => {
      tourController?.setSurfaces?.({
        floorAt: (x, z, hint) => index.floorAt(x, z, hint),
        ceilingAt: (x, z, floor) => index.ceilingAt(x, z, floor),
      });
      invalidate();
    };
    const cached = corridorCache.get(key);
    if (cached) {
      give(cached);
      return;
    }
    tourController?.setSurfaces?.(null);
    const xz: V2[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[Math.min(points.length - 1, i + 1)];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2])));
      for (let k = 0; k < n; k++) xz.push([a[0] + ((b[0] - a[0]) * k) / n, a[2] + ((b[2] - a[2]) * k) / n]);
    }
    const roots = [...modules.values()].filter((m) => m.root.visible && SURFACE_MODULES.has(m.id)).map((m) => m.root);
    void buildCorridorIndex(roots, corridorCells(xz, 3.2), { shouldStop: () => disposed || job !== corridorJob })
      .then((index) => {
        if (!index || disposed) return;
        if (corridorCache.size > 6) corridorCache.clear();
        corridorCache.set(key, index);
        if (job === corridorJob && tourRun?.id === id) give(index);
      })
      .catch((e: unknown) => recordError("nav/corridor", e instanceof Error ? e.message : String(e)));
  }

  /** The tour controller's view of the world: the ground's heights, closed buildings, sight lines. */
  function tourOptions(): Parameters<NonNullable<NavModules["tour"]>["createTourController"]>[0] {
    return {
      speed: 1.6,
      // The ground's own height model while it is near the route's height (a deck keeps its own).
      heightAt: (x, z, routeY) => {
        const h = surfaceAt(x, z);
        return h !== null && Math.abs(h - routeY) < 0.9 ? h : null;
      },
      solidAt: (x, y, z, levels) => solidAtPoint(tourSolids(levels, y), x, y, z),
      sightBlocked: (a, b) => solidBetween(a, b),
      // Building walls only: the camera a few metres up sees over railings, fences and planters.
      sightClear: (a, b, floor, levels) => !wallsAcross(a, b, floor, levels, 0.2),
    };
  }

  /**
   * A building wall of one of `levels`, or of a level with its floor near `floor` (±1.6 m), crosses the
   * plan segment a → b (a body of radius r).
   */
  function wallsAcross(a: V2, b: V2, floor: number, levels: readonly (LevelId | undefined)[], r: number): boolean {
    for (const lv of losLevels()) {
      if (!levels.includes(lv.level) && Math.abs(lv.y - floor) > 1.6) continue;
      const near = lv.index.query(Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r);
      if (near.length && castCircle(a, b, r, near) < 1) return true;
    }
    return false;
  }

  /**
   * QA: play a route headlessly at 60 fps with the real walls, solids and indexed surfaces (as the
   * engine would) and measure the camera: the largest move in one frame, frames inside a closed
   * building, frames in or above a ceiling over it, frames with a wall between it and the walker,
   * how it framed the walker, and how far the walker stood off the modelled floor.
   */
  async function tourAuditProbe(id: string): Promise<TourAuditReport | null> {
    const mod = nav.tour;
    const built = buildTourPath(id);
    if (!mod || !built) return null;
    const pts = built.path.points;
    const xz: V2[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2])));
      for (let k = 0; k < n; k++) xz.push([a[0] + ((b[0] - a[0]) * k) / n, a[2] + ((b[2] - a[2]) * k) / n]);
    }
    const prevMode = mode;
    // Interiors on, as on a route.
    if (mode === "orbit") setMode("tour");
    const index = await buildCorridorIndex(surfaceRoots(), corridorCells(xz, 3.2));
    if (prevMode === "orbit" && !tourRun) setMode("orbit");
    const c = mod.createTourController(tourOptions());
    const world = walkWorld();
    c.setColliders(world.colliders, world.walkAreas);
    if (index) c.setSurfaces?.({ floorAt: (x, z, h) => index.floorAt(x, z, h), ceilingAt: (x, z, f) => index.ceilingAt(x, z, f) });
    c.start(built.path, "chase");
    const report: TourAuditReport = { id, frames: 0, maxJump: 0, maxJumpAt: null, inSolid: 0, inCeiling: 0, behindWall: 0, framing: {}, start: null, floorErr: 0, floorErrAt: null, clamps: {}, events: [] };
    let prev: THREE.Vector3 | null = null;
    for (let i = 0; i < 60 * 900; i++) {
      const f = c.update(i === 0 ? 0 : 1 / 60);
      if (!f) break;
      report.frames++;
      const fr = f.framing ?? "chase";
      report.framing[fr] = (report.framing[fr] ?? 0) + 1;
      if (i === 0) report.start = fr;
      if (f.clamped) report.clamps[f.clamped] = (report.clamps[f.clamped] ?? 0) + 1;
      let jump = 0;
      if (prev) {
        jump = prev.distanceTo(f.position);
        if (jump > report.maxJump) {
          report.maxJump = round(jump);
          report.maxJumpAt = round(f.t * 1000) / 1000;
        }
      }
      prev = f.position.clone();
      const p = f.position;
      const solid = solidAtPoint(tourSolids([f.level, f.cameraLevel], p.y), p.x, p.y, p.z);
      if (solid) report.inSolid++;
      // The roof over the camera, measured from the walker's floor — unless that "roof" is the floor the
      // camera stands over (trailing on a deck while the walker goes down a stair below it).
      let roof = index?.ceilingAt(p.x, p.z, f.walker.y);
      const camFloor = index?.floorAt(p.x, p.z, p.y - 1.4, 5, 0.4);
      if (roof != null && camFloor != null && roof <= camFloor + 0.05) roof = index?.ceilingAt(p.x, p.z, camFloor);
      const inRoof = roof !== null && roof !== undefined && p.y > roof - 0.1 && p.y < roof + 1.5;
      if (inRoof) report.inCeiling++;
      if ((jump > 0.5 || solid || (inRoof && report.inCeiling <= 3)) && report.events.length < 24) {
        report.events.push({ t: round(f.t * 1000) / 1000, framing: fr, clamp: f.clamped ?? null, jump: round(jump), solid, cam: toV3(p), walker: toV3(f.walker), ...(inRoof ? { roof: round(roof as number) } : {}) });
      }
      if (wallsAcross([f.walker.x, f.walker.z], [p.x, p.z], f.walker.y, [f.level, f.cameraLevel], 0.05)) report.behindWall++;
      if (f.level === "outdoor" && index) {
        const floor = index.floorAt(f.walker.x, f.walker.z, f.walker.y, 1, 1.2);
        if (floor !== null && Math.abs(floor - f.walker.y) > report.floorErr) {
          report.floorErr = round(Math.abs(floor - f.walker.y));
          report.floorErrAt = round(f.t * 1000) / 1000;
        }
      }
      if (f.done) break;
    }
    return report;
  }

  /**
   * Closed buildings a tour camera stays out of: all but the venue the route is in (`levels`: the
   * walker's and the camera's) — inside it, its walls are the camera's limits.
   */
  function tourSolids(levels: readonly (LevelId | undefined)[] = [], y?: number): OrbitSolid[] {
    // A venue whose walkable floor is at this height (or that the route is in) has its walls as sight
    // walls (its colliders): its volume — an OSM outline a metre or two wider than the glass, over canopies
    // the routes walk under — would only push the camera off the route. Below its floors (EduCity's street
    // side under the deck) the volume is all there is.
    const inside = new Set(levels.map((l) => buildingOfLevel(l ?? null)).filter(Boolean) as string[]);
    for (const m of modules.values()) {
      if (!isBuilding(m) || y === undefined) continue;
      if (m.levels.some((lv) => lv.y <= y + 0.5 && lv.y >= y - 4.5)) inside.add(m.building);
    }
    return closedSolids.filter((v) => {
      const role = (v as OrbitSolid & { role?: string }).role;
      return !(role && (role === "biocity" || role === "joki" || role === "educity") && (y === undefined || inside.has(role)));
    });
  }

  function solidAtPoint(solids: OrbitSolid[], x: number, y: number, z: number): boolean {
    const mod = nav.orbit;
    if (!mod) return false;
    for (const v of solids) if (mod.insideSolid(v, x, y, z)) return true;
    return false;
  }

  /** A closed building between two points (sampled every 1.5 m, the ends left out). */
  function solidBetween(a: V3, b: V3): boolean {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (len < 1.2) return false;
    const minX = Math.min(a[0], b[0]);
    const maxX = Math.max(a[0], b[0]);
    const minZ = Math.min(a[2], b[2]);
    const maxZ = Math.max(a[2], b[2]);
    const near = tourSolids().filter((v) => {
      const bb = polygonBounds(v.polygon);
      return bb.maxX >= minX && bb.minX <= maxX && bb.maxZ >= minZ && bb.minZ <= maxZ;
    });
    if (!near.length) return false;
    const n = Math.max(1, Math.ceil(len / 1.5));
    for (let k = 1; k < n; k++) {
      const t = k / n;
      if (solidAtPoint(near, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)) return true;
    }
    return false;
  }

  /** Points of a leg: module-provided indoor legs win, then routes.json, then CAMPUS.routes on the terrain. */
  function legPoints(id: string): { points: V3[]; outdoor: boolean } | null {
    for (const m of modules.values()) {
      const leg = m.routeLegs?.[id];
      if (leg && leg.length > 1) return { points: leg, outdoor: false };
    }
    const r = routes?.legs[id];
    if (r && r.points.length > 1) return { points: r.points, outdoor: r.mode === "outdoor" };
    const c = campus?.routes[id];
    if (c && c.length > 1) return { points: c.map(([x, z]) => [x, terrain ? terrain.heightAt(x, z) : 0, z] as V3), outdoor: true };
    return null;
  }

  function buildTourPath(id: string): { path: TourPath; to: string } | null {
    const t = lib?.getTour3D(id);
    const legIds = t?.legs ?? routes?.tours.find((x) => x.id === id)?.legs;
    if (!legIds?.length) return null;
    const points: V3[] = [];
    const speed: number[] = [];
    const levels: (LevelId | null)[] = [];
    for (const legId of legIds) {
      const leg = legPoints(legId);
      if (!leg) {
        recordError("tour", `${id}: route leg "${legId}" not found`);
        continue;
      }
      for (const p of leg.points) {
        const last = points[points.length - 1];
        if (last && Math.hypot(p[0] - last[0], p[2] - last[2]) < 0.05) continue;
        if (points.length) speed.push(leg.outdoor ? 2.2 : 1);
        points.push(p);
        levels.push(legLevel(legId, leg.outdoor, p[1]));
      }
    }
    if (points.length < 2) return null;
    // Captions start where each step is anchored on the map (lib TourStep.at); steps without an
    // anchor spread out in order. Fractions are of the 3D path length, like the tour's progress t.
    const steps = t?.steps ?? [];
    const at = anchorFractions(
      points,
      steps.map((s) => s.at),
    );
    const captions = steps.map((s, i) => ({ at: at[i], text: s.text }));
    const known = levels.every((l): l is LevelId => l !== null);
    return { path: { id, points, captions, speed, levels: known ? levels : undefined }, to: t?.to ?? "" };
  }

  /** Tell modules (the routes ribbon) which route is being walked — indoor legs included. */
  function notifyTour(tour: { id: string; points: V3[] } | null) {
    for (const m of modules.values()) {
      if (!m.setTour) continue;
      try {
        m.setTour(tour);
      } catch (e) {
        recordError(m.id, `setTour: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    invalidate();
  }

  function stopTour(report = true) {
    if (!tourRun) return;
    const run = tourRun;
    tourRun = null;
    notifyTour(null);
    try {
      run.controller.stop();
    } catch {
      // already stopped
    }
    // Kept for the next route (its shaders stay compiled); freed with the engine.
    scene.remove(run.avatar);
    // Outdoors the chase camera stays put; indoors it rises out of the (opened) building. Orbit mode is
    // back before the UI hears the route ended, so the destination it then focuses is a real flight.
    handBack(run.walker.clone(), horizontalForward(), run.level, true);
    if (report) emit.onTour(null);
  }

  function startTour(id: string, tourMode: "chase" | "first"): boolean {
    const mod = nav.tour;
    if (!mod) return false;
    const built = buildTourPath(id);
    if (!built) return false;
    if (tourRun) stopTour();
    if (mode === "walk") walk(false);
    try {
      tourController ??= mod.createTourController(tourOptions());
      const world = walkWorld();
      tourController.setColliders?.(world.colliders, world.walkAreas);
      tourController.start(built.path, tourMode);
    } catch (e) {
      recordError("nav/tour", e instanceof Error ? e.message : String(e));
      return false;
    }
    flight = null;
    orbit?.setEnabled(false);
    if (fallbackControls) fallbackControls.enabled = false;
    applyOpen(null);
    const avatar = tourAvatar();
    for (const c of avatar.children) c.visible = true;
    scene.add(avatar);
    notifyTour({ id, points: built.path.points });
    tourRun = {
      id,
      controller: tourController,
      avatar,
      captions: built.path.captions.map((c) => c.text),
      shown: -1,
      shownAt: 0,
      resync: false,
      lastCaption: null,
      lastReport: 0,
      doneAt: null,
      stills: null,
      stillIndex: 0,
      walker: new THREE.Vector3(...built.path.points[0]),
      level: built.path.levels?.[0] ?? null,
      cameraLevel: built.path.levels?.[0] ?? null,
      mode: tourMode,
      bodyShown: true,
    };
    // First person sees from inside the avatar: only its ground ring stays.
    if (tourMode === "first") setAvatarBody(tourRun, false);
    // Reduced motion: step-by-step stills instead of motion — the start, every step (even two at
    // the same spot), then the arrival (the UI then shows the destination).
    if (reducedMotion) {
      const caps = built.path.captions;
      const stills = caps.map((c, i) => ({ at: c.at, caption: i }));
      if (!stills.length || stills[0].at > 0.001) stills.unshift({ at: 0, caption: -1 });
      stills.push({ at: 1, caption: caps.length - 1 });
      tourRun.stills = stills;
      tourController.seek(stills[0].at);
      tourController.pause(true);
    }
    camera.fov = tourMode === "first" ? 70 : 55;
    camera.updateProjectionMatrix();
    setMode("tour");
    // Interiors are on now (tour mode): index the floors and ceilings the route passes.
    buildTourSurfaces(id, built.path.points);
    invalidate();
    return true;
  }

  function stepTour(dt: number): boolean {
    const run = tourRun;
    if (!run) return false;
    let f: TourFrame | null;
    try {
      f = run.controller.update(dt);
    } catch (e) {
      recordError("nav/tour", e instanceof Error ? e.message : String(e));
      stopTour();
      return false;
    }
    if (!f) {
      stopTour();
      return false;
    }
    lastTourFrame = f;
    camera.position.copy(f.position);
    camera.lookAt(f.target);
    run.avatar.position.copy(f.walker);
    // props/people.ts lights the avatar with the interior environment on indoor levels.
    run.avatar.userData.level = f.level ?? null;
    // The place tabs follow the walker (street → BioCity → Joki), so the header always names where the route is.
    const here: PlaceId = HERO_PLACES.find((b) => inHero(b, f.walker.x, f.walker.z)) ?? "campus";
    if (here !== activePlace) {
      activePlace = here;
      orbit?.setPlace(here);
      emit.onPlace(here);
    }
    // The avatar's body never fills the view: hidden in first person and when the camera is at it.
    const close =
      Math.hypot(f.position.x - f.walker.x, f.position.z - f.walker.z) < 1.2 && f.position.y < f.walker.y + 2.1;
    setAvatarBody(run, run.mode !== "first" && !close);
    run.avatar.rotation.y = yawForBearing(f.heading, "-z");
    run.walker.copy(f.walker);
    run.level = f.level ?? null;
    // Exposure follows the camera in and out of buildings (the chase camera passes a door after the
    // walker), as walk mode's does: interiors are lit for INTERIOR_EXPOSURE.
    const seen = f.cameraLevel ?? f.level;
    run.cameraLevel = seen ?? null;
    if (seen) indoorTarget = seen === "outdoor" ? 0 : 1;
    const now = performance.now();
    let caption: string | null;
    if (run.stills) {
      const k = run.stills[run.stillIndex]?.caption ?? -1;
      caption = k >= 0 ? (run.captions[k] ?? null) : null;
    } else {
      // Pace the steps: each one stays up CAPTION_MIN_MS before the next (they queue, in order).
      const step = f.step ?? -1;
      if (run.resync || step < run.shown) {
        run.resync = false;
        run.shown = step;
        run.shownAt = now;
      } else if (step > run.shown && (run.shown < 0 || now - run.shownAt >= CAPTION_MIN_MS)) {
        run.shown++;
        run.shownAt = now;
      }
      caption = run.shown >= 0 ? (run.captions[run.shown] ?? null) : null;
    }
    if (caption !== run.lastCaption || now - run.lastReport > 100) {
      run.lastCaption = caption;
      run.lastReport = now;
      emit.onTour({ id: run.id, t: f.t, caption });
    }
    if ((f.done || f.t >= 1) && !run.stills) {
      run.doneAt ??= now;
      // Let the chase camera settle and the last step be read, then hand over (the UI then focuses
      // the destination).
      const lastRead = run.shown >= run.captions.length - 1 && now - run.shownAt >= CAPTION_MIN_MS;
      if (now - run.doneAt > 1200 && lastRead) {
        emit.onTour({ id: run.id, t: 1, caption });
        stopTour();
        return false;
      }
    }
    // Moving only while the walker walks: a paused route (and every reduced-motion still) is one frame,
    // not a frame per display refresh. The springs settling after a pause or a seek move the camera,
    // which the frame loop sees anyway.
    return !run.controller.paused() && !f.done;
  }

  // ── Picking and gestures ──
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down: { x: number; y: number; t: number } | null = null;
  let lastTap = { t: 0, x: 0, y: 0 };
  /** Pointers down on the canvas; a second finger turns the gesture into a pinch/pan — never a tap. */
  const pointersDown = new Set<number>();
  let multiTouch = false;

  function setNdc(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }

  /** Visible all the way up: three's Raycaster also hits hidden objects (closed-off floors, hidden interiors). */
  function shown(o: THREE.Object3D | null): boolean {
    for (let x = o; x; x = x.parent) if (!x.visible) return false;
    return true;
  }

  /** Surfaces a pick sees through: glazing (by name), see-through panes, transmissive glass. */
  function seeThrough(material: THREE.Material | THREE.Material[]): boolean {
    const m = Array.isArray(material) ? material[0] : material;
    if (!m) return true;
    // By name: "glassFacade", "glassInterior", "…-glazing" (not "panelBlack" and other solid finishes).
    if (/glass|glazing/i.test(m.name)) return true;
    if (m.transparent && m.opacity < 0.9) return true;
    return ((m as THREE.MeshPhysicalMaterial).transmission ?? 0) > 0.01;
  }

  /** The module whose scene graph holds an object. */
  function moduleOf(o: THREE.Object3D): WorldModule | null {
    let top: THREE.Object3D = o;
    while (top.parent && top.parent !== scene) top = top.parent;
    for (const m of modules.values()) if (m.root === top) return m;
    return null;
  }

  /**
   * True when something solid stands between the camera and a picked point: another building (its
   * footprint prism — cheap), or, while the picked thing's own building is closed, that building's own
   * walls, roof and floors (only meshes closer than the point are tested, glazing doesn't count).
   */
  function pickHidden(hit: THREE.Intersection, holder: THREE.Object3D): boolean {
    if (occluded(hit.point)) return true;
    const owner = moduleOf(holder);
    if (!owner || !isBuilding(owner) || openState.get(owner.building)) return false;
    raycaster.far = Math.max(0, hit.distance - 0.05);
    try {
      const blockers = raycaster.intersectObject(owner.root, true);
      return blockers.some((b) => {
        if (!(b.object as THREE.Mesh).isMesh || !shown(b.object)) return false;
        for (let x: THREE.Object3D | null = b.object; x; x = x.parent) if (x === holder) return false;
        return !seeThrough((b.object as THREE.Mesh).material);
      });
    } finally {
      raycaster.far = Infinity;
    }
  }

  /** Target under a screen point: the nearest visible pickable, unless it is hidden behind something. */
  function pick(clientX: number, clientY: number): string | null {
    setNdc(clientX, clientY);
    const pickables: THREE.Object3D[] = [];
    for (const m of modules.values()) if (m.root.visible) pickables.push(...m.pickables);
    if (!pickables.length) return null;
    const hits = raycaster.intersectObjects(pickables, true);
    for (const hit of hits) {
      if (!shown(hit.object)) continue;
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.pickId) o = o.parent;
      if (!o) continue;
      // Anything further along the ray is behind the same wall.
      return pickHidden(hit, o) ? null : String(o.userData.pickId);
    }
    return null;
  }

  function groundPoint(clientX: number, clientY: number): THREE.Vector3 | null {
    setNdc(clientX, clientY);
    const roots: THREE.Object3D[] = [];
    for (const m of modules.values()) if (m.root.visible) roots.push(m.root);
    const hit = raycaster.intersectObjects(roots, true).find((h) => (h.object as THREE.Mesh).isMesh && shown(h.object));
    if (hit) return hit.point;
    // Fall back to the terrain plane at the target height.
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -controlsTarget().y);
    const p = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, p);
  }

  const onPointerDown = (e: PointerEvent) => {
    // A new primary pointer starts a new gesture (lifts outside the canvas are never missed for long).
    if (e.isPrimary) {
      pointersDown.clear();
      multiTouch = false;
    }
    pointersDown.add(e.pointerId);
    if (pointersDown.size > 1) {
      multiTouch = true;
      down = null;
      return;
    }
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const onPointerCancel = (e: PointerEvent) => {
    pointersDown.delete(e.pointerId);
    down = null;
  };
  const onPointerUp = (e: PointerEvent) => {
    pointersDown.delete(e.pointerId);
    if (multiTouch) {
      // A finger lifting out of a pinch is not a tap; the next gesture starts clean.
      if (pointersDown.size === 0) multiTouch = false;
      down = null;
      return;
    }
    if (!down || mode !== "orbit") return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 450;
    down = null;
    if (moved > 6 || !quick || e.button > 0) return;
    const now = performance.now();
    // Second tap within 320 ms near the first: fly towards that point.
    if (now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 24) {
      lastTap.t = 0;
      const p = groundPoint(e.clientX, e.clientY);
      if (p) {
        const dist = camera.position.distanceTo(controlsTarget());
        if (orbit) orbit.flyTo(toV3(p), { distance: Math.max(25, dist * 0.55) });
        else if (fallbackControls) {
          fallbackControls.target.copy(p);
          fallbackControls.update();
        }
        userMoved = true;
        invalidate();
      }
      return;
    }
    lastTap = { t: now, x: e.clientX, y: e.clientY };
    const id = pick(e.clientX, e.clientY);
    if (id) {
      const entry = targets.get(normaliseTarget(id));
      if (entry) applyView(entry.target.view, true, placeOfTarget(entry.target.id, entry.module));
    }
    setFocusTarget(id);
    emit.onSelect(id);
  };
  // Hover: the pointer cursor over pickable things, at most every 100 ms (a pick with its occlusion
  // test can take a few ms inside a big building) and always for the last position.
  let hoverAt: { x: number; y: number } | null = null;
  let hoverTimer = 0;
  let lastHover = 0;
  const runHover = () => {
    hoverTimer = 0;
    if (disposed || !hoverAt || mode !== "orbit") return;
    lastHover = performance.now();
    canvas.style.cursor = pick(hoverAt.x, hoverAt.y) ? "pointer" : "grab";
  };
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || mode !== "orbit" || e.buttons) return;
    hoverAt = { x: e.clientX, y: e.clientY };
    if (!hoverTimer) hoverTimer = window.setTimeout(runHover, Math.max(0, 100 - (performance.now() - lastHover)));
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);
  canvas.addEventListener("pointermove", onPointerMove);

  const onContextLost = (e: Event) => {
    e.preventDefault();
    contextLost = true;
    recordError("engine", "WebGL context lost");
    // Nothing more will render: whoever waits for the first frame hears it now.
    if (!readyDone) {
      readyDone = true;
      rejectReady(new Error("WebGL context lost before the first frame"));
    }
    emit.onContextLost();
  };
  /**
   * A lost context is final: the restored one lacks every GPU-only resource (the PMREM sky and interior
   * environments, render targets), so it would draw a near-black scene behind the UI's "stopped" notice.
   * Rendering stays off; the UI's "Try again" builds a new engine.
   */
  const onContextRestored = () => {
    recordError("engine", "WebGL context restored — not resumed; a new engine is needed");
    emit.onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);

  // ── Size, visibility ──
  /**
   * Drawing-buffer size waiting for the next frame. Resizing the buffer clears it, and ResizeObserver
   * runs after this frame's render and before paint: resizing right away would paint a black frame on
   * every step (full screen, rotation, dragging a window edge). The frame resizes, then renders.
   */
  let pendingSize: { w: number; h: number } | null = null;

  function applyPendingSize() {
    if (!pendingSize) return;
    const { w, h } = pendingSize;
    pendingSize = null;
    // A new device-pixel ratio (window moved to another display, browser zoom) re-derives the buffer scale.
    const dpr = Math.min(window.devicePixelRatio || 1, settings.maxDpr);
    if (dpr !== pipeline.stats().pixelRatio) pipeline.apply(settings);
    pipeline.setSize(w, h);
  }

  function resize() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    applyViewOffset();
    pendingSize = { w, h };
    labelRenderer.setSize(w, h);
    if (activeView && !flight && !userMoved && mode === "orbit") {
      const pose = resolveView(activeView);
      placePose(pose.position, pose.target, pose.fov);
    }
    refreshLabels();
    invalidate();
  }
  const ro = new ResizeObserver(() => resize());
  ro.observe(container);
  resize();
  // The first size goes in at once (nothing is on screen yet).
  applyPendingSize();

  // Device-pixel ratio changes don't resize the container: watch for them (re-armed for each new ratio;
  // the frame loop also compares the ratio, for browsers that don't fire the query's change event).
  let lastDpr = window.devicePixelRatio || 1;
  let dprQuery: MediaQueryList | null = null;
  const onDprChange = () => {
    lastDpr = window.devicePixelRatio || 1;
    watchDpr();
    resize();
  };
  function watchDpr() {
    dprQuery?.removeEventListener("change", onDprChange);
    dprQuery = typeof window.matchMedia === "function" ? window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`) : null;
    dprQuery?.addEventListener("change", onDprChange);
  }
  watchDpr();

  const io = new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting);
    if (inView) invalidate();
  });
  io.observe(container);
  const onVisibility = () => {
    if (!document.hidden) {
      timer.reset();
      invalidate();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  // ── Frame ──
  const lastCam = new THREE.Matrix4();
  /** What asked for the last rendered frame, and how many frames were rendered (debug stats). */
  let lastBusy: string[] = [];
  let framesRendered = 0;
  let lastDeclutter = 0;
  let lastOcclusion = 0;
  let lastInteriorCheck = 0;
  let lastMemoryCheck = 0;
  let settle = 0;
  let lastFrameTime = performance.now();
  /** The previous drawn frame was part of a motion too (its interval measures rendering, not idling). */
  let wasActive = false;
  /** onSlow: the lowest tier's frame intervals over the last 5 s of motion; told once. */
  const slowWatch = { since: 0, samples: [] as number[], told: false };
  function watchSlow(now: number, interval: number) {
    // Only an auto-detected lowest tier (an explicit ?quality= is a request), once loaded.
    if (slowWatch.told || opts.tier || !readyDone || lowerTier(tier) !== null || interval > 3000) {
      slowWatch.samples.length = 0;
      slowWatch.since = 0;
      return;
    }
    if (!slowWatch.since) slowWatch.since = now;
    slowWatch.samples.push(interval);
    if (now - slowWatch.since < 5000) return;
    const sorted = slowWatch.samples.slice().sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    slowWatch.samples.length = 0;
    slowWatch.since = now;
    if (median > 100) {
      slowWatch.told = true;
      emit.onSlow();
    }
  }

  /**
   * Labels: occlusion (cheap 2D tests) while the camera moves, at most every 90 ms; declutter (layout
   * reads) once it settles — and every 150 ms while walking or on a route, whose camera never settles. A pass a
   * throttle skipped stays due and runs on a later tick (even one that draws nothing), so the labels
   * always end up matching the pose on screen.
   */
  function labelPasses(now: number, moving: boolean) {
    // At eye level the camera never stops for long and the set changes with every step (walls, reach,
    // the cap): both passes run while moving, a few times a second.
    const eye = mode !== "orbit";
    if (occlusionDue && now - lastOcclusion > (eye ? 150 : 90)) {
      lastOcclusion = now;
      occlusionDue = false;
      updateOcclusion();
    }
    const every = !moving ? 120 : eye ? 150 : Infinity;
    if (declutterDue && now - lastDeclutter > every) {
      lastDeclutter = now;
      if (!moving) declutterDue = false;
      updateOcclusion();
      declutter();
    }
  }

  function fitShadows(force = false) {
    const dist = camera.position.distanceTo(controlsTarget());
    const viewDistance = mode === "orbit" ? dist : 30;
    sky.fitShadows(viewDistance, settings.shadowDistance, settings.shadowMapSize, settings.shadowRadius);
    if (force) invalidate();
  }

  function adaptClip() {
    const dist = mode === "orbit" ? camera.position.distanceTo(controlsTarget()) : 2;
    const height = terrain ? camera.position.y - terrain.heightAt(camera.position.x, camera.position.z) : camera.position.y;
    const near = THREE.MathUtils.clamp(Math.min(dist * 0.004, Math.max(height, 0.5) * 0.05), 0.06, 2.5);
    if (Math.abs(near - camera.near) / camera.near > 0.1) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }
  }

  function frame(now: number) {
    // A lost context is final (see onContextRestored): the loop stops with it.
    if (disposed || contextLost) return;
    requestAnimationFrame(frame);
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.1);
    if (!inView || document.hidden || warming) return;
    if ((window.devicePixelRatio || 1) !== lastDpr) onDprChange();
    try {
      elapsed += dt;
      let active = false;
      const busy: string[] = [];
      const ask = (on: boolean | void, why: string) => {
        if (!on) return;
        active = true;
        busy.push(why);
      };
      if (flight) ask(stepFlight(dt), "flight");
      else if (mode === "orbit") {
        if (orbit) ask(orbit.update(dt), "orbit");
        else if (fallbackControls) ask(fallbackControls.update(dt), "orbit");
      }
      if (mode === "walk" && walker) {
        ask(walker.update(dt), "walk");
        const p = walker.state().position;
        ensureWalkSurfaces(p[0], p[1]);
      }
      if (mode === "tour") ask(stepTour(dt), "tour");
      for (const m of modules.values()) {
        if (!m.tick || !m.root.visible) continue;
        // Built for motion while motion is now off: its clock stops, and its animation no longer keeps
        // the loop awake (modules built for reduced motion report only real changes).
        const frozen = reducedMotion && builtReduced.get(m.id) === false;
        try {
          const moved = m.tick(frozen ? 0 : dt, frozen ? frozenElapsed : elapsed, camera);
          if (!frozen) ask(moved, m.id);
        } catch (e) {
          recordError(m.id, `tick: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      // Orbiting, exposure follows where the camera is (walk and routes set it by level).
      if (mode === "orbit") indoorTarget = orbitIndoor();
      // Exposure follows indoor/outdoor smoothly.
      if (Math.abs(indoor - indoorTarget) > 1e-3) {
        indoor += (indoorTarget - indoor) * (1 - Math.exp(-dt * 5));
        if (Math.abs(indoor - indoorTarget) < 0.002) indoor = indoorTarget;
        ask(true, "exposure");
      }
      // Metering into a low sun (by the share of its disc and aureole the buildings leave visible) and
      // the after-dark fill around an opened building adapt over about a second instead of jumping.
      ask(sky.adapt(dt, camera, occluded, indoorTarget > 0 && indoorTarget < 1 ? 1 : 0), "exposure");
      ask(framesUntilReady > 0, "ready");
      camera.updateMatrixWorld();
      const camMoved = !lastCam.equals(camera.matrixWorld);
      if (camMoved) {
        occlusionDue = true;
        declutterDue = true;
      }
      // A couple of frames after motion stops let the labels settle (declutter).
      if (!(dirty || active || camMoved || settle > 0 || pendingSize)) {
        labelPasses(now, false);
        return;
      }
      if (active || camMoved) settle = 2;
      else if (settle > 0) settle--;
      if (camMoved) busy.push("camera");
      if (dirty) busy.push("dirty");
      if (pendingSize) busy.push("resize");
      lastBusy = busy;
      dirty = false;
      if (camMoved) {
        lastCam.copy(camera.matrixWorld);
        adaptClip();
        fitShadows();
        if (now - lastInteriorCheck > 250) {
          lastInteriorCheck = now;
          checkCutaway();
          updateInteriors();
        }
        // Textures and targets that arrived since (interiors, late textures): still within the budget.
        if (readyDone && now - lastMemoryCheck > 4000) {
          lastMemoryCheck = now;
          enforceMemoryBudget();
        }
        const dist = camera.position.distanceTo(controlsTarget());
        pipeline.setAoRadius(THREE.MathUtils.clamp((mode === "orbit" ? dist : 6) * 0.012, 0.35, 6));
      }
      // Exposure: the exterior's (with the adapted low-sun metering) blended in log space towards the
      // interior's, which follows the daylight through the glazing (sky.ts cameraExposure).
      pipeline.setExposure(sky.cameraExposure(indoor));
      scene.environment = sky.environment();
      sky.update(camera);
      const t0 = performance.now();
      applyPendingSize();
      pipeline.render();
      labelRenderer.render(scene, camera);
      frameMs = frameMs * 0.9 + (performance.now() - t0) * 0.1;
      // Labels move on screen only with the camera: animated people or cars don't hold back declutter.
      labelPasses(now, camMoved);
      if (camMoved) keepLabelsInside();
      framesRendered++;
      framesThisSecond++;
      if (now - secondStart >= 1000) {
        fps = (framesThisSecond * 1000) / (now - secondStart);
        framesThisSecond = 0;
        secondStart = now;
      }
      const interval = now - lastFrameTime;
      lastFrameTime = now;
      // Benchmarks measure; they never trigger a downgrade.
      if (active && !benchActive && interval < 1000) monitor.sample(interval);
      if (active && wasActive && !benchActive) watchSlow(now, interval);
      wasActive = active;
      if (framesUntilReady > 0 && --framesUntilReady === 0 && !readyDone) {
        readyDone = true;
        resolveReady();
      }
    } catch (e) {
      // Never let one bad frame stop the loop.
      recordError("frame", e instanceof Error ? e.message : String(e));
    }
  }
  requestAnimationFrame(frame);

  // ── Memory: estimate and the phone budget ──
  /**
   * GPU memory the tier may use (MB, estimated): phones kill a tab that grows too large (iOS Safari:
   * "A problem repeatedly occurred"), so the low tier drops features rather than exceed this. Laptops and
   * desktops are only measured (stats().memory).
   */
  const MEMORY_BUDGET_MB: Record<Tier, number> = { ultra: Infinity, high: Infinity, low: 300 };
  const reduced: string[] = [];
  let memoryCache: { at: number; value: MemoryEstimate } | null = null;

  function estimateMemory(fresh = false): MemoryEstimate {
    const now = performance.now();
    if (!fresh && memoryCache && now - memoryCache.at < 2000) return memoryCache.value;
    let tex = 0;
    for (const t of sceneTextures(scene)) tex += textureBytes(t);
    const geo = geometryBytes(scene);
    const st = pipeline.stats();
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    const pixels = w * h * st.pixelRatio * st.pixelRatio;
    const targets = targetBytes({ pixels, msaa: settings.msaa, gtao: settings.gtao, gtaoScale: settings.gtaoScale, bloom: settings.bloom, smaa: settings.smaa });
    const heap = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;
    const value: MemoryEstimate = {
      texturesMB: toMB(tex),
      geometriesMB: toMB(geo),
      targetsMB: toMB(targets),
      gpuMB: toMB(tex + geo + targets),
      jsHeapMB: heap ? toMB(heap) : null,
      budgetMB: MEMORY_BUDGET_MB[tier],
      reduced: reduced.slice(),
    };
    memoryCache = { at: now, value };
    return value;
  }

  /**
   * Phones: no texture bigger than ≈ 512 × 512 px (longest side ≤ 1024 — a wide sign strip keeps its
   * width). Oversized canvas and image textures are redrawn at that size; a module that redraws its own
   * canvas later and flags the texture gets its drawing, scaled again. Data, depth, cube and render-
   * target textures (and those with nearest-neighbour filtering — lookup data) are left alone.
   */
  const cappedTextures = new WeakSet<THREE.Texture>();
  function capTextures(maxPixels: number, maxSide: number): number {
    let saved = 0;
    for (const t of sceneTextures(scene)) {
      if (cappedTextures.has(t)) continue;
      const tx = t as THREE.Texture & { isRenderTargetTexture?: boolean; isDataTexture?: boolean; isCompressedTexture?: boolean; isVideoTexture?: boolean; isCubeTexture?: boolean; isDepthTexture?: boolean };
      const img = t.image as (CanvasImageSource & { width: number; height: number }) | null;
      // Not loaded yet: looked at again on a later pass.
      if (!img || typeof img.width !== "number" || typeof img.height !== "number" || !img.width || !img.height) continue;
      cappedTextures.add(t);
      if (tx.isRenderTargetTexture || tx.isDataTexture || tx.isCompressedTexture || tx.isVideoTexture || tx.isCubeTexture || tx.isDepthTexture) continue;
      if (t.magFilter === THREE.NearestFilter || t.userData?.noCap) continue;
      const isCanvas = typeof HTMLCanvasElement !== "undefined" && img instanceof HTMLCanvasElement;
      const drawable = isCanvas || (typeof ImageBitmap !== "undefined" && img instanceof ImageBitmap) || (typeof HTMLImageElement !== "undefined" && img instanceof HTMLImageElement);
      if (!drawable) continue;
      const k = Math.min(1, Math.sqrt(maxPixels / (img.width * img.height)), maxSide / Math.max(img.width, img.height));
      if (k > 0.97) continue;
      const small = document.createElement("canvas");
      small.width = Math.max(1, Math.round(img.width * k));
      small.height = Math.max(1, Math.round(img.height * k));
      const c2 = small.getContext("2d");
      if (!c2) continue;
      c2.imageSmoothingQuality = "high";
      const draw = () => {
        c2.clearRect(0, 0, small.width, small.height);
        c2.drawImage(img, 0, 0, small.width, small.height);
      };
      const before = textureBytes(t);
      try {
        draw();
      } catch {
        continue;
      }
      t.image = small;
      t.needsUpdate = true;
      saved += before - textureBytes(t);
      if (isCanvas) {
        // The module still draws into its own canvas: a later "needsUpdate" redraws the small copy.
        Object.defineProperty(t, "needsUpdate", {
          configurable: true,
          get: () => false,
          set: (v: boolean) => {
            if (!v) return;
            draw();
            t.version++;
            t.source.needsUpdate = true;
          },
        });
      }
    }
    if (saved > 0) invalidate();
    return saved;
  }

  /**
   * Keep the estimated GPU memory under the tier's budget: drop what costs memory without changing a
   * shader — MSAA (SMAA instead), bloom's targets, the shadow map's size, then pixels — one step at a time.
   */
  function enforceMemoryBudget() {
    if (disposed || contextLost) return;
    if (tier === "low") {
      const saved = capTextures(512 * 512, 1024);
      if (saved > 0 && !reduced.includes("textures ≤ 512²")) reduced.push("textures ≤ 512²");
    }
    const steps: { name: string; can: () => boolean; apply: () => void }[] = [
      { name: "SMAA instead of MSAA", can: () => settings.msaa > 0, apply: () => (settings = { ...settings, msaa: 0, smaa: true }) },
      { name: "no bloom", can: () => settings.bloom, apply: () => (settings = { ...settings, bloom: false }) },
      {
        name: "512 px shadow map",
        can: () => settings.shadowMapSize > 512,
        apply: () => (settings = { ...settings, shadowMapSize: 512, shadowDistance: Math.min(settings.shadowDistance, 180) }),
      },
      { name: "pixel ratio 1", can: () => settings.maxDpr > 1, apply: () => (settings = { ...settings, maxDpr: 1 }) },
      { name: "pixel ratio 0.8", can: () => settings.maxDpr > 0.8, apply: () => (settings = { ...settings, maxDpr: 0.8 }) },
    ];
    for (const step of steps) {
      if (!step.can()) continue;
      const m = estimateMemory(true);
      if (m.gpuMB <= MEMORY_BUDGET_MB[tier]) return;
      step.apply();
      reduced.push(step.name);
      pipeline.apply(settings);
      fitShadows(true);
      // Expected on phones, not an error: stats().memory.reduced lists what was dropped (and from what size).
      reduced[reduced.length - 1] = `${step.name} (at ${m.gpuMB} MB)`;
    }
    // Nothing left to drop and still over: the UI may point to the plans (the tab could be killed).
    if (!memoryStruggling && estimateMemory(true).gpuMB > MEMORY_BUDGET_MB[tier] * 1.15) {
      memoryStruggling = true;
      emit.onPerformance({ tier, pixelRatio: pipeline.stats().pixelRatio, struggling: true });
    }
  }
  let memoryStruggling = false;

  // ── Debug ──
  function stats(): TwinStats {
    const s = pipeline.stats();
    return {
      fps: Math.round(fps * 10) / 10,
      frameMs: Math.round(frameMs * 100) / 100,
      drawCalls: s.drawCalls,
      totalCalls: s.totalCalls,
      triangles: s.triangles,
      textures: s.textures,
      geometries: s.geometries,
      programs: s.programs,
      tier,
      tierReason: decision.reason,
      modules: [...modules.keys()],
      pixelRatio: s.pixelRatio,
      exposure: Math.round(renderer.toneMappingExposure * 1000) / 1000,
      busy: lastBusy.slice(),
      frames: framesRendered,
      time: lighting.iso,
      sun: { elevation: Math.round(lighting.sunElevationDeg * 100) / 100, azimuth: Math.round(lighting.sunAzimuthDeg * 100) / 100 },
      mode,
      memory: estimateMemory(),
    };
  }

  async function onlyModules(ids: string[] | null): Promise<string[]> {
    wanted = ids && ids.length ? new Set(ids) : null;
    const want = moduleIdsToLoad();
    for (const [id, m] of modules) m.root.visible = !wanted || want.includes(id);
    losCache = null;
    const missing = want.filter((id) => !modules.has(id));
    if (missing.length) await loadModules(missing);
    applyClaims();
    refreshLabels();
    invalidate();
    return [...modules.keys()].filter((id) => modules.get(id)?.root.visible);
  }

  /** QA: walk a routes.json leg with the real walk world, steering along it (window.__twin.walkRoute). */
  async function walkRouteProbe(legId: string): Promise<WalkRouteReport | null> {
    const mod = nav.walk;
    // The leg as tours play it: a building module's own leg (int-bio-*) before routes.json's.
    const leg = legPoints(legId);
    if (!mod || !leg || leg.points.length < 2) return null;
    const pts = leg.points;
    // The modelled surfaces along the leg, as walk mode indexes them round the walker.
    const xz: V2[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const n = Math.max(1, Math.ceil(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][2] - pts[i][2])));
      for (let k = 0; k < n; k++) xz.push([pts[i][0] + ((pts[i + 1][0] - pts[i][0]) * k) / n, pts[i][2] + ((pts[i + 1][2] - pts[i][2]) * k) / n]);
    }
    const surfaces = await buildCorridorIndex(surfaceRoots(), corridorCells(xz, 4));
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
    const total = cum[cum.length - 1];
    const at = (d: number): V3 => {
      const x = THREE.MathUtils.clamp(d, 0, total);
      let i = 1;
      while (i < pts.length - 1 && cum[i] < x) i++;
      const f = (x - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
      return [0, 1, 2].map((c) => pts[i - 1][c] + (pts[i][c] - pts[i - 1][c]) * f) as V3;
    };
    const world = mod.prepareWalkWorld(walkWorld({ index: surfaces, cx: 0, cz: 0, reach: Infinity }));
    // Start a step along the route: legs begin on door thresholds, inside the building's own outline.
    const p0 = at(1.5);
    const p1 = at(3);
    const level = legLevel(legId, leg.outdoor, p0[1]) ?? "outdoor";
    const sim = mod.startSim({ position: [p0[0], p0[2]], level, yawDeg: vectorBearing(p1[0] - p0[0], p1[2] - p0[2]), pitchDeg: 0 }, world);
    const levels: string[] = [sim.level];
    let progress = 1.5;
    let best = 1.5;
    let lastGain = 0;
    let maxErr = 0;
    let sum = 0;
    let n = 0;
    let worstAt: V3 | null = null;
    let stuckAt: [number, number] | null = null;
    const dt = 1 / 60;
    for (let t = 0; t < total / 1.2 + 60; t += dt) {
      // Progress: the nearest point of the route a little behind or ahead of the last one.
      let bestD = Infinity;
      for (let d = Math.max(0, progress - 3); d <= Math.min(total, progress + 6); d += 0.1) {
        const q = at(d);
        const e = Math.hypot(q[0] - sim.position[0], q[2] - sim.position[1]);
        if (e < bestD) {
          bestD = e;
          progress = d;
        }
      }
      const q = at(progress);
      if (sim.level === "outdoor") {
        const err = Math.abs(sim.floor - q[1]);
        sum += err;
        n++;
        if (err > maxErr) {
          maxErr = err;
          worstAt = [round(q[0]), round(q[1]), round(q[2])];
        }
      }
      if (progress >= total - 0.6) break;
      if (progress > best + 0.05) {
        best = progress;
        lastGain = t;
      } else if (t - lastGain > 4) {
        stuckAt = [round(sim.position[0]), round(sim.position[1])];
        break;
      }
      const aim = at(progress + 1.5);
      sim.yawDeg = vectorBearing(aim[0] - sim.position[0], aim[2] - sim.position[1]);
      if (mod.stepWalk(sim, { forward: 1, strafe: 0, turn: 0, run: false }, world, dt).levelChanged) levels.push(sim.level);
    }
    return {
      leg: legId,
      length: round(total),
      reached: round(Math.max(best, progress) / total),
      maxFloorError: round(maxErr),
      worstAt,
      meanFloorError: round(sum / Math.max(1, n)),
      stuckAt,
      levels,
    };
  }

  /** QA: every ordered pair of views and fallback targets flown as the engine would (window.__twin.flightAudit). */
  function flightAuditProbe(): FlightAuditReport {
    const report: FlightAuditReport = { flights: 0, through: 0, throughPlainArc: 0, cuts: 0, cranes: 0, worst: [] };
    const mod = nav.orbit;
    if (!mod) return report;
    const items = [
      ...[...views.entries()].map(([key, v]) => ({ key, view: v.view })),
      ...Object.keys(FALLBACK_TARGETS).flatMap((id) => {
        const t = targets.get(id);
        return t ? [{ key: id, view: t.target.view }] : [];
      }),
    ].map((it) => ({ ...it, pose: resolveView(it.view) }));
    const v3a = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];
    for (const a of items) {
      for (const b of items) {
        if (a === b) continue;
        const open = b.view.open?.building ?? null;
        const solids = volumes.filter((v) => !(v.role && v.role === open));
        const from = v3a(a.pose.position);
        const to = v3a(b.pose.position);
        const travel = a.pose.position.distanceTo(b.pose.position) + a.pose.target.distanceTo(b.pose.target);
        const lift = Math.min(80, travel * 0.12);
        const relevant = solids.filter((s) => !mod.insideSolid(s, ...from) && !mod.insideSolid(s, ...to));
        const inside = (shape: FlightShape) => {
          let frames = 0;
          for (let i = 1; i < 200; i++) {
            const p = mod.flightPoint(from, to, shape, easeInOut(i / 200));
            if (relevant.some((s) => mod.insideSolid(s, p[0], p[1], p[2]))) frames++;
          }
          return frames;
        };
        report.flights++;
        if (inside({ lift, crane: 0 })) report.throughPlainArc++;
        const shape = mod.planFlight(from, to, solids, { lift });
        if (!shape) {
          report.cuts++;
          continue;
        }
        if (shape.crane > 0) report.cranes++;
        const frames = inside(shape);
        if (frames) {
          report.through++;
          report.worst.push({ from: a.key, to: b.key, frames });
        }
      }
    }
    report.worst.sort((x, y) => y.frames - x.frames);
    report.worst = report.worst.slice(0, 12);
    return report;
  }

  const uninstallDebug = installDebug({
    ready: () => readyPromise,
    stats,
    goto: (v) => engine.goto(v, false),
    focus: (id) => engine.focus(id, false),
    setTime: (t) => engine.setTime(t),
    setLabels: (on) => engine.setLabels(on),
    only: onlyModules,
    errors: () => errors.slice(),
    camera: () => ({ position: toV3(camera.position), target: toV3(controlsTarget()), fov: round(camera.fov) }),
    setCamera: (p, t, fov) => {
      flight = null;
      userMoved = true;
      placePose(v3(p), v3(t), fov ?? camera.fov);
    },
    missingTargets: () => {
      if (!lib) return [];
      const provided = new Set([...targets.values()].filter((t) => t.module !== null).map((t) => t.target.id));
      return lib.TARGETS_3D.map((t) => t.id).filter((id) => !provided.has(id));
    },
    seekTour: (t) => {
      if (!tourRun) return;
      tourRun.controller.seek(THREE.MathUtils.clamp(t, 0, 1));
      tourRun.controller.pause(true);
      tourRun.resync = true;
      invalidate();
    },
    walk: (on, start) => engine.walk(on, start),
    tour: (id, tourMode) => engine.tour(id, tourMode),
    tourPath: () => {
      if (!tourRun) return null;
      const built = buildTourPath(tourRun.id);
      return built
        ? { id: tourRun.id, captions: built.path.captions, levels: built.path.levels ? [...built.path.levels] : null }
        : null;
    },
    views: () => [...views.keys()].sort(),
    targets: () => [...targets.keys()].sort(),
    modules: () => [...modules.keys()],
    invalidate,
    post: (o) => {
      pipeline.debugPost(o);
      invalidate();
    },
    setLook: (look) => {
      sky.setLook(look);
      setTimeInternal(lighting.iso);
    },
    root: (id) => modules.get(id)?.root ?? null,
    pauseTour: (on) => engine.pauseTour(on),
    zoom: (factor) => engine.zoom(factor),
    pick: (x, y) => {
      const t0 = performance.now();
      const id = pick(x, y);
      return { id, ms: Math.round((performance.now() - t0) * 100) / 100 };
    },
    groundPoint: (x, y) => {
      const p = groundPoint(x, y);
      return p ? toV3(p) : null;
    },
    walkRoute: walkRouteProbe,
    flightAudit: flightAuditProbe,
    walkProbe: (x, z) => {
      const world = walkWorld();
      const areas = world.walkAreas
        .filter((a) => pointInRing([x, z], a.polygon))
        .map((a) => {
          const own = world.heightAt(x, z, a.level, a);
          const floor = own ?? (a.slope ? floorYOf(a, x, z) : a.y);
          return { level: a.level, floor: round(floor), slope: !!a.slope, terrain: own !== null && own !== undefined };
        });
      const surface = surfaceAt(x, z);
      return { areas, terrain: terrain ? round(terrain.heightAt(x, z)) : null, surface: surface === null ? null : round(surface) };
    },
    walkSim: async (start, script, every = 10) => {
      const mod = nav.walk;
      if (!mod) return null;
      const pre = startStateFor(typeof start === "string" ? start : undefined, walkWorld().walkAreas);
      const at = typeof start === "string" ? pre.position : start.position;
      // The modelled surfaces round the start, as walk mode indexes them round the walker.
      const index = await buildCorridorIndex(surfaceRoots(), corridorCells([at], 45));
      const raw = walkWorld({ index, cx: at[0], cz: at[1], reach: 45 });
      const world = mod.prepareWalkWorld(raw);
      const s0 =
        typeof start === "string"
          ? (() => {
              const st = startStateFor(start, raw.walkAreas);
              return { position: st.position, level: st.level, yawDeg: st.yawDeg, pitchDeg: 0, y: st.y };
            })()
          : { position: start.position, level: (start.level ?? "outdoor") as LevelId, yawDeg: start.yawDeg, pitchDeg: 0, y: start.y };
      const sim = mod.startSim(s0, world);
      const track: { x: number; z: number; floor: number; eye: number; level: string }[] = [];
      const levels: string[] = [sim.level];
      let maxDrop = 0;
      let n = 0;
      const dt = 1 / 60;
      const sample = () => track.push({ x: round(sim.position[0]), z: round(sim.position[1]), floor: round(sim.floor), eye: round(sim.eye), level: sim.level });
      sample();
      for (const part of script) {
        for (let i = 0; i < Math.round(part.seconds / dt); i++) {
          const before = sim.floor;
          const r = mod.stepWalk(sim, { forward: part.forward ?? 0, strafe: part.strafe ?? 0, turn: part.turn ?? 0, run: !!part.run }, world, dt);
          if (r.levelChanged) levels.push(sim.level);
          maxDrop = Math.max(maxDrop, before - sim.floor);
          if (++n % every === 0) sample();
        }
      }
      sample();
      return { track, levels, end: { x: round(sim.position[0]), z: round(sim.position[1]), floor: round(sim.floor), level: sim.level }, maxDrop: round(maxDrop) };
    },
    surfaceGrid: async (x0, z0, x1, z1, step, hint) => {
      const pts: V2[] = [];
      for (let z = z0; z <= z1 + 1e-6; z += step) for (let x = x0; x <= x1 + 1e-6; x += step) pts.push([x, z]);
      const index = await buildCorridorIndex(surfaceRoots(), corridorCells(pts, 1));
      const rows: (number | null)[][] = [];
      for (let z = z0; z <= z1 + 1e-6; z += step) {
        const row: (number | null)[] = [];
        for (let x = x0; x <= x1 + 1e-6; x += step) {
          const h = index?.floorAt(x, z, hint, 0.4, 2) ?? null;
          row.push(h === null ? null : round(h));
        }
        rows.push(row);
      }
      return rows;
    },
    collidersIn: (x0, z0, x1, z1) => {
      const out: { level: string; kind: string; a?: [number, number]; b?: [number, number]; c?: [number, number]; r?: number }[] = [];
      for (const c of walkWorld().colliders) {
        if (c.kind === "segment") {
          if (Math.max(c.a[0], c.b[0]) < x0 || Math.min(c.a[0], c.b[0]) > x1 || Math.max(c.a[1], c.b[1]) < z0 || Math.min(c.a[1], c.b[1]) > z1) continue;
          out.push({ level: c.level, kind: c.kind, a: [round(c.a[0]), round(c.a[1])], b: [round(c.b[0]), round(c.b[1])] });
        } else {
          if (c.c[0] + c.r < x0 || c.c[0] - c.r > x1 || c.c[1] + c.r < z0 || c.c[1] - c.r > z1) continue;
          out.push({ level: c.level, kind: c.kind, c: [round(c.c[0]), round(c.c[1])], r: round(c.r) });
        }
      }
      return out;
    },
    tourAudit: (id) => tourAuditProbe(id),
    programList: (keys = false) => {
      // Materials in the scene now that the warm-up did not see (made later: lazy interiors, the walker…).
      const late: string[] = [];
      for (const m of modules.values()) {
        m.root.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.material) return;
          for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            if (!warmMaterials.has(mat)) late.push(`${m.id}/${mesh.name}/${mat.name || mat.type}`);
          }
        });
      }
      return [...new Set(late)].concat(
        (renderer.info.programs ?? []).map((pr) => `program ${pr.name}#${pr.id}${keys ? `\t${pr.cacheKey}` : ""}`),
      );
    },
    memory: () => {
      // Who uses each texture: module, mesh and material (for the owners' budgets).
      const users = new Map<THREE.Texture, string>();
      for (const m of modules.values()) {
        m.root.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.material) return;
          for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
            for (const v of Object.values(mat)) {
              if (v && (v as THREE.Texture).isTexture && !users.has(v as THREE.Texture)) users.set(v as THREE.Texture, `${m.id}/${mesh.name}/${mat.name}`);
            }
          }
        });
      }
      const list = [...sceneTextures(scene)].map((t) => {
        const img = t.image as { width?: number; height?: number; src?: string } | null;
        return {
          name: `${t.name || (img?.src ? img.src.split("/").slice(-2).join("/") : t.constructor.name)} @ ${users.get(t) ?? "?"}`,
          w: img?.width ?? 0,
          h: img?.height ?? 0,
          mb: toMB(textureBytes(t)),
        };
      });
      list.sort((a, b) => b.mb - a.mb);
      return { estimate: estimateMemory(true), info: { ...renderer.info.memory }, textures: list.length, top: list.slice(0, 25) };
    },
    meshesAt: (x, z, y0, y1) => {
      const out: ReturnType<NonNullable<import("./debug").TwinDebugApi["meshesAt"]>> = [];
      const box = new THREE.Box3();
      for (const m of modules.values()) {
        m.root.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh || !mesh.geometry) return;
          if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
          box.copy(mesh.geometry.boundingBox as THREE.Box3).applyMatrix4(mesh.matrixWorld);
          if (x < box.min.x || x > box.max.x || z < box.min.z || z > box.max.z || box.max.y < y0 || box.min.y > y1) return;
          const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material;
          out.push({
            module: m.id,
            name: mesh.name,
            material: mat?.name ?? "",
            visible: shown(mesh),
            instanced: !!(mesh as THREE.InstancedMesh).isInstancedMesh,
            transparent: !!mat?.transparent,
            opacity: round(mat?.opacity ?? 1),
            minY: round(box.min.y),
            maxY: round(box.max.y),
          });
        });
      }
      return out;
    },
    tourFrame: () => {
      const f = lastTourFrame;
      if (!tourRun || !f) return null;
      return { framing: f.framing ?? null, camera: toV3(f.position), walker: toV3(f.walker), level: f.level ?? null, cameraLevel: f.cameraLevel ?? null };
    },
    warmup: () => ({ programs: pipeline.stats().programs, done: warm.done, ms: Math.round(warm.ms) }),
    bench: (seconds = 4) =>
      new Promise((resolve) => {
        // Orbit slowly round the current target so every frame really renders.
        const target = controlsTarget().clone();
        const offset = camera.position.clone().sub(target);
        const times: number[] = [];
        const start = performance.now();
        let last = start;
        benchActive = true;
        const step = (now: number) => {
          times.push(now - last);
          last = now;
          const a = ((now - start) / 1000) * 0.15;
          camera.position.copy(target).add(offset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), a));
          camera.lookAt(target);
          invalidate();
          if (now - start < seconds * 1000) requestAnimationFrame(step);
          else {
            benchActive = false;
            camera.position.copy(target).add(offset);
            camera.lookAt(target);
            invalidate();
            const sorted = times.slice(2).sort((x, y) => x - y);
            const avg = sorted.reduce((s2, x) => s2 + x, 0) / Math.max(1, sorted.length);
            resolve({
              fps: Math.round((1000 / avg) * 10) / 10,
              frameMs: Math.round(avg * 100) / 100,
              p95Ms: Math.round((sorted[Math.floor(sorted.length * 0.95)] ?? 0) * 100) / 100,
              frames: sorted.length,
            });
          }
        };
        requestAnimationFrame(step);
      }),
  });

  // ── Public API ──
  const engine: TwinEngine = {
    load,
    goto(viewKey, animate = true) {
      const entry = views.get(viewKey);
      if (!entry) return false;
      if (mode === "walk") walk(false);
      if (mode === "tour") stopTour();
      applyView(entry.view, animate, placeOfView(viewKey));
      setFocusTarget(null);
      return true;
    },
    focus(targetId, animate = true) {
      const id = normaliseTarget(targetId);
      const entry = targets.get(id);
      if (!entry) return false;
      if (mode === "walk") walk(false);
      if (mode === "tour") stopTour();
      applyView(entry.target.view, animate, placeOfTarget(id, entry.module));
      setFocusTarget(id);
      return true;
    },
    setTime(iso) {
      setTimeInternal(iso);
      emit.onTime(lighting.iso);
    },
    setLabels(on) {
      setLabelsInternal(on);
    },
    walk,
    useConnector(id) {
      walker?.useConnector(id);
      invalidate();
    },
    tour(id, tourMode = "chase") {
      if (id === null) {
        stopTour();
        return true;
      }
      return startTour(id, tourMode);
    },
    pauseTour(on) {
      const run = tourRun;
      if (!run) return;
      if (run.stills) {
        // Reduced motion: "play" advances to the next still.
        if (!on && run.stillIndex < run.stills.length - 1) {
          run.stillIndex++;
          run.controller.seek(run.stills[run.stillIndex].at);
          run.controller.pause(true);
          if (run.stillIndex === run.stills.length - 1) {
            emit.onTour({ id: run.id, t: 1, caption: run.lastCaption });
            stopTour();
          }
        }
      } else run.controller.pause(on);
      invalidate();
    },
    zoom(factor) {
      if (mode !== "orbit") return;
      userMoved = true;
      flight = null;
      if (orbit) orbit.zoom(factor);
      else if (fallbackControls) {
        const t = fallbackControls.target;
        const offset = camera.position.clone().sub(t);
        offset.setLength(THREE.MathUtils.clamp(offset.length() / factor, fallbackControls.minDistance, fallbackControls.maxDistance));
        camera.position.copy(t).add(offset);
        fallbackControls.update();
      }
      invalidate();
    },
    resize,
    whenReady: () => readyPromise,
    setInsets(next) {
      const clean = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : 0);
      const ins: SceneInsets = { top: clean(next?.top), right: clean(next?.right), bottom: clean(next?.bottom), left: clean(next?.left) };
      if (ins.top === sceneInsets.top && ins.right === sceneInsets.right && ins.bottom === sceneInsets.bottom && ins.left === sceneInsets.left) return;
      sceneInsets = ins;
      // resize() re-centres the projection and re-frames the active view (unless the user moved).
      resize();
    },
    setReducedMotion(on) {
      if (on === reducedMotion) return;
      reducedMotion = on;
      // Modules that read it while ticking follow at once; those built for motion are frozen in frame().
      ctx.reducedMotion = on;
      frozenElapsed = elapsed;
      orbit?.setReducedMotion?.(on);
      walker?.setReducedMotion?.(on);
      if (on && flight) {
        // A flight in progress lands at once.
        const f = flight;
        flight = null;
        placePose(f.toP, f.toT, f.toFov);
      }
      invalidate();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      uninstallDebug();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      dprQuery?.removeEventListener("change", onDprChange);
      if (hoverTimer) window.clearTimeout(hoverTimer);
      if (tourRun) stopTour(false);
      if (avatarObject) disposeDeep(avatarObject);
      avatarObject = null;
      walker?.dispose();
      orbit?.dispose();
      fallbackControls?.dispose();
      for (const id of [...modules.keys()]) removeModule(id);
      sky.dispose();
      materials.dispose();
      const gl = renderer.getContext();
      pipeline.dispose();
      // Give the GPU context back now rather than at garbage collection (phones close and reopen the 3D;
      // browsers cap live contexts).
      try {
        if (!gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
      } catch {
        // Already gone.
      }
      labelRenderer.domElement.remove();
      resolveReady();
    },
  };
  return engine;
}

/** Bounds of a polygon list (exported for modules that build views from data). */
export function boundsOf(polys: V2[][]) {
  return polygonBounds(polys.flat());
}
