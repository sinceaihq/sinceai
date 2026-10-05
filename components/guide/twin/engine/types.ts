import type * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

/**
 * Contracts for the campus twin — the 3D model of the event campus
 * (EduCity, BioCity, Joki and their surroundings).
 *
 * One shared frame for everything: metres, origin = BioCity's OSM centroid
 * (60.44932 N, 22.29326 E), +x = east, +z = south (north = −z), +y = up.
 * Modules build in this frame (or in a local plan frame placed with a
 * documented transform) so the whole campus lines up with the map.
 */

/** [x, z] on the ground plane. */
export type V2 = [number, number];
/** [x, y, z]. */
export type V3 = [number, number, number];

/** Rendering tier, picked from the GPU and screen (see render/quality.ts). */
export type Tier = "ultra" | "high" | "low";

export type BuildingId = "biocity" | "joki" | "educity";

/** Walkable levels. "outdoor" is the street level of the whole campus. */
export type LevelId = "outdoor" | "biocity-1" | "joki-1" | "joki-2" | "joki-3" | "educity-1" | "educity-2";

export interface CameraView {
  position: V3;
  target: V3;
  /** Vertical field of view (degrees). */
  fov?: number;
  /** Horizontal field of view to keep (degrees); the vertical FOV follows the screen shape. */
  hfov?: number;
  /** Portrait screens: radius (m) around `target` that must fit the width. */
  fit?: number;
  /** Pose overrides for portrait screens. */
  portrait?: Partial<Pick<CameraView, "position" | "target" | "fov" | "hfov" | "fit">>;
  /** Show the floating labels in this view. */
  labels?: boolean;
  /** Only show labels of this group (plus ungrouped ones). */
  labelGroup?: string;
  /** Open a building at a level (dollhouse cut) while this view is active; null closes all. */
  open?: { building: BuildingId; level: LevelId } | null;
  /**
   * Exposure while this view is shown: 0 = exterior … 1 = INTERIOR_EXPOSURE. Without it the engine
   * follows the camera (1 inside a building, a blend over an opened one, 0 outside).
   */
  indoor?: number;
}

/** Lighting for the current time of day (see sky/). */
export interface LightingState {
  /** 0 = full daylight … 1 = night (sun ≥ 6° below the horizon). */
  night: number;
  /** Unit vector from the scene towards the sun. */
  sunDir: THREE.Vector3;
  sunElevationDeg: number;
  /** Compass bearing of the sun: 0 = north, 90 = east. */
  sunAzimuthDeg: number;
  /** Local Turku time (ISO, no offset), e.g. "2026-11-06T15:30". */
  iso: string;
}

/** Everything a module may use while building. */
export interface TwinContext {
  tier: Tier;
  reducedMotion: boolean;
  materials: MaterialLibrary;
  /** PMREM environment for interiors (exteriors use scene.environment = the sky). */
  envInterior: THREE.Texture | null;
  /** Request a new frame (rendering is on demand). */
  invalidate(): void;
  /** Lighting at build time; later changes arrive through WorldModule.setLighting. */
  lighting(): LightingState;
  /** Where the person the camera follows stands (walk: the walker's feet; a route: its avatar); null otherwise. */
  actor?(): V3 | null;
}

/**
 * Named, shared PBR materials. Textures load lazily; meshes need metre UVs (see render/uv.ts).
 *
 * Light units across the twin: 1 scene unit of illuminance = 1 klux, so an
 * emissive/luminance of 1 = 1000 cd/m². Use the LUMINANCE presets in
 * sky/sky.ts for emissives (lit windows, lamps, signs, LED walls, panels);
 * interiors are lit for INTERIOR_EXPOSURE and get ctx.envInterior.
 */
export type MaterialName =
  // ground
  | "asphalt"
  | "roadMarking"
  | "pavers"
  | "granite"
  | "kerb"
  | "grass"
  | "soil"
  | "gravel"
  | "asphaltFootway"
  | "asphaltRed"
  | "setts"
  | "mulch"
  | "leafLitter"
  | "manhole"
  | "roadLineDecal"
  // facades
  | "brickDark"
  | "panelBlack"
  | "panelGrey"
  | "concreteFacade"
  | "metalDark"
  | "metalWhite"
  | "glassFacade"
  // interiors
  | "glassInterior"
  | "concreteFloor"
  | "terrazzo"
  | "stoneFloor"
  | "birch"
  | "oak"
  | "carpetDark"
  | "carpetGrey"
  | "plasterWhite"
  | "plasterGrey"
  | "ceiling"
  | "fabricPink"
  | "fabricTeal"
  | "fabricDark"
  | "leather"
  // objects
  | "steel"
  | "chrome"
  | "blackMatte"
  | "rubber"
  | "carPaintBlack"
  | "carGlass"
  | "bark"
  | "barkBirch"
  | "foliage"
  | "screen";

export interface MaterialLibrary {
  /** Shared instance — never mutate it; use variant() for local changes. */
  get(name: MaterialName): THREE.MeshStandardMaterial;
  /** Owned copy with overrides (shares textures). Disposed with the module. */
  variant(
    name: MaterialName,
    overrides: Partial<{
      color: THREE.ColorRepresentation;
      roughness: number;
      metalness: number;
      emissive: THREE.ColorRepresentation;
      emissiveIntensity: number;
      opacity: number;
      envMapIntensity: number;
      /** Metres per texture tile [u, v] (e.g. a larger paving grid). */
      tile: [number, number];
    }>,
  ): THREE.MeshStandardMaterial;
  /** Metres covered by one texture tile (for reference; metre UVs handle tiling). */
  tileSize(name: MaterialName): number;
  /** Resolves when every texture requested so far has loaded. */
  ready(): Promise<void>;
}

/** Walk-mode obstacles on one level (2D, metres). */
export type Collider2D =
  | { level: LevelId; kind: "segment"; a: V2; b: V2 }
  | { level: LevelId; kind: "circle"; c: V2; r: number };

/** Walkable floor area of a level (walls/obstacles come from colliders). */
export interface WalkArea {
  level: LevelId;
  polygon: V2[];
  /** Floor height (m). Ramps: give `slope`. */
  y: number;
  slope?: { from: V2; to: V2; y0: number; y1: number };
}

/** Stairs, lifts and doors between levels — "Go up / Go down" hotspots in walk mode. */
export interface Connector {
  id: string;
  label: string;
  from: LevelId;
  to: LevelId;
  /** Where the hotspot sits on `from`, and where you arrive on `to`. */
  at: V2;
  arrive: V2;
}

/** A focusable thing: a company counter, a stand, a room, an entrance. Ids match lib/hackathon-2026/twin.ts. */
export interface TwinTarget {
  id: string;
  view: CameraView;
  level?: LevelId;
  /** Where "Walk me there" ends (ground position). */
  walkTo?: V2;
  /** Which way "Walk me there" faces at that point (bearing in degrees); default: the target view's bearing. */
  walkYawDeg?: number;
}

/** A piece of the world: the campus ground, a building, the cars, the people… */
export interface WorldModule {
  id: string;
  root: THREE.Group;
  labels: CSS2DObject[];
  /** Clickable objects; each (or an ancestor) carries userData.pickId = target id. */
  pickables: THREE.Object3D[];
  targets: TwinTarget[];
  /** Named camera views, keyed "<place>:<view>" (see lib PLACES_3D). */
  views?: Record<string, CameraView>;
  colliders?: Collider2D[];
  walkAreas?: WalkArea[];
  connectors?: Connector[];
  /** OSM way ids of campus buildings this module models (the fallback massing skips them). */
  claims?: number[];
  /** LOD2 record ids (lod2.json, e.g. "lod2-k50") of small structures this module models instead of the massing. */
  claimsLod2?: string[];
  /** Walking route legs this module provides (e.g. inside a building), keyed by leg id; points in the shared frame. */
  routeLegs?: Record<string, V3[]>;
  /**
   * A tour started — its full resolved path (outdoor legs + the buildings' indoor legs) — or
   * stopped (null). The routes module draws the active route from this.
   */
  setTour?(tour: { id: string; points: V3[] } | null): void;
  /** Time of day changed — update emissive windows, lamps, interior lights. */
  setLighting?(state: LightingState): void;
  /** Per frame. Return true while something moves (keeps the renderer awake). */
  tick?(dt: number, elapsed: number, camera: THREE.PerspectiveCamera): boolean | void;
  /** Resolves when async textures (logos, signs) are drawn. */
  ready: Promise<unknown>;
  dispose?(): void;
}

/** A building with an exterior shell and walkable interior levels. */
export interface BuildingModule extends WorldModule {
  building: BuildingId;
  levels: { id: LevelId; name: string; y: number; group: THREE.Group }[];
  /** Facades and roof — hidden or cut while the building is open. */
  shell: THREE.Group;
  /**
   * null = closed (exterior only; interiors may glow through windows).
   * A level = dollhouse: roof and everything above that level hidden, the
   * shell cut down to that level, its interior shown.
   */
  setOpen(level: LevelId | null): void;
  /**
   * The engine calls setInterior(true) whenever the camera may see inside —
   * the building is open, walk or tour mode, or the camera within ~240 m of
   * the footprint — and false when it is far away and closed (to save draw
   * calls). Interiors must stay lit and complete while on. While off, keep a
   * cheap stand-in (lit floor slabs, glow behind glazing) so windows never go
   * dark. Without this hook the interior is always visible.
   */
  setInterior?(on: boolean): void;
}

export type ModuleBuilder = (ctx: TwinContext) => Promise<WorldModule> | WorldModule;

/** Picked places in the UI. */
export type PlaceId = "campus" | "educity" | "biocity" | "joki";

export type LabelKind = "company" | "area" | "floor" | "stand" | "open" | "landmark" | "entrance" | "building" | "street";

export type { CSS2DObject };
