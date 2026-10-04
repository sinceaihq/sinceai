# Campus twin — engineering design

> The 3D model of the Hackathon 2026 campus on the Field Guide venue page. Start with `README.md` in this folder.

Owner brief (4 Oct 2026, translated): make the 3D cover the whole event site — EduCity, BioCity, Joki
(incl. the round Q&A floors) and the outdoors between them — so accurate and realistic that people think it
cost a million. Easy to move around and look; realistic enough that it looks like real life. Simulate the
outdoor arrival routes (where partners come in). In front of BioCity runs the big road Tykistökatu; next to it
is the BioCity entrance where the companies come in; in the recess ("syvänne") by the road next to BioCity
there will be a few supercars (a Mercedes-Benz G-Wagon). Make it the easiest event in the world for partners
to arrive at. Test it to Google-level standards.

Site facts live in `SITE-FACTS.md` (from the 4 Oct 2026 site research). This file is the engineering contract.
Repo: this repository (`sinceaihq/sinceai`), branch `feature/hackathon-2026-field-guide`.

## 1. Quality bar

- **Architectural visualisation, not a game.** Real proportions in metres, real materials (CC0 PBR textures at
  real-world tile sizes), physically based lighting with the real sun position for Turku on 6–8 Nov 2026,
  soft shadows, ambient occlusion, reflective glass, emissive windows and street lights at dusk/night.
- Real-world colours everywhere. The Since AI event violet (`#8b7bff`, strong `#6d4dff`) is used **only** for
  event dressing: route lines, banners/flags, entrance markers, stand light lines, the Showroom LED wall glow.
- Every building recognisable from the street by someone who has been there (massing, facade rhythm, colour,
  entrances, signage), every event space correct in layout and scale (plans are the reference).
- Smooth: 60 fps on an M-series MacBook ("ultra"), ≥ 30 fps on a mid laptop ("high"), usable ≥ 24 fps on a
  2022+ phone ("low"). Renders on demand when idle (battery), animates life only while visible.
- Nothing broken: no z-fighting, no flicker, no floating/intersecting objects, no black/white texture
  failures, no NaN shadows, no labels in wrong places, no console errors.

## 2. Architecture and file ownership

```
components/guide/twin/
  Twin.tsx                     UI shell (client): places, controls, modes, tours, time, text alternative
  TwinTeaser.tsx               poster + title link used on other guide pages
  engine/
    types.ts                   CONTRACTS (do not change without the lead)
    index.ts                   createTwinEngine(): world container, module loading, places/views/targets,
                               picking, labels, cut-aways, tours, time, render loop, debug API
    frame.ts                   geo ↔ local frame helpers, campus constants (origin, bearings)
    util.ts                    shared helpers (deterministic PRNG, disposeDeep, polygon helpers)
    labels.ts                  CSS2D labels (aria-hidden)
    data/campus.ts             generated from data/campus-twin/sources (scripts/twin/build-campus-data.mjs)
    render/quality.ts          tier detection + runtime downgrade
    render/pipeline.ts         renderer + EffectComposer (RenderPass → GTAO → Bloom → SMAA → Output)
    render/materials.ts        MaterialLibrary (CC0 textures in public/assets/guide/3d/tex/)
    render/uv.ts               metre UVs for any geometry (box / planar / along-path)
    render/facade.ts           procedural facade material + wall extrusion with facade UVs
    render/canvas.ts           canvas textures (LED wall, signs, banners)
    sky/sun.ts                 solar position (NOAA) for Turku
    sky/sky.ts                 Sky + sun light + PMREM env + fog/exposure for a time of day
    nav/orbit.ts               orbit/map camera behaviour
    nav/walk.ts                first-person walking with 2D collision, levels, connectors
    nav/collision.ts           circle-vs-segment/circle resolver (pure, unit-tested)
    nav/tour.ts                route following (chase / first person), captions
    nav/joystick.ts            touch joystick (DOM)
    world/ground.ts            terrain, roads (lanes, markings), kerbs, sidewalks, squares, grass
    world/context.ts           every other campus building from OSM (massing + styled facades)
    world/landscape.ts         trees, street lamps, benches, bike racks, bus stops, bollards, signs
    world/event.ts             Since AI flags/banners/totems, entrance markers
    world/routes.ts            arrival routes: animated ground ribbons + walker avatars
    buildings/biocity.ts       BioCity exterior + ground-floor interior (build hall, stands, Aulagalleria)
    buildings/joki.ts          Joki exterior + floor 1 (Aula, Cave, ramp, Showroom, Company Lounge)
    buildings/jokiTower.ts     Joki floors 2–3 (round plates, company stands, Chill Zone)
    buildings/showroom.ts      the Showroom (upgrade of the current one)
    buildings/educity.ts       EduCity exterior + floors 1–2 (lobby, Taidon portaat, atrium, rooms)
    props/furniture.ts         tables, chairs, stools, counters, booths, laptops (instanced)
    props/vehicles.ts          G-Class display cars (procedural), parked + moving cars
    props/people.ts            pedestrians (instanced, animated in the vertex shader)
    props/trees.ts             procedural trees (birch, pine, maple; November: mostly bare)
lib/hackathon-2026/twin.ts     places, views, targets, tours, time presets (texts; no three.js)
```

Each workflow agent owns the files assigned to it. Never edit another agent's files; if you need a change in
a shared file (types.ts, index.ts, materials), report it as a request in your final answer.

## 3. Conventions

- TypeScript strict, no `any`, no `@ts-ignore`. Comment density like the existing code in
  `components/guide/venue3d/engine/` (short "why" comments, doc comments on exports).
- Shared frame (types.ts): metres; origin BioCity centroid; +x east, +z south, +y up. Compass bearing 0 = north.
- Deterministic content: use `mulberry32(seed)` for any randomness (posters must be identical between runs).
- Geometry: merge static geometry per material (`mergeGeometries`) and instance repeated objects
  (`InstancedMesh`). Budget per module below. Dispose everything you create (the engine calls `disposeDeep`).
- Every mesh with a textured material needs **metre UVs** (`render/uv.ts`), so textures tile at real scale.
- Shadows: `castShadow` only for things whose shadow matters (buildings, cars, trees, people, furniture in
  the build hall); `receiveShadow` for ground, floors and walls. Tiny objects never cast.
- Labels: `makeLabel(text, kind, x, y, z, group?, detail?)`; aria-hidden — the text alternative lives in lib.
- Accessibility & motion: no autonomous camera motion when `ctx.reducedMotion`; ambient animation (cars,
  people, trees) stops when reduced motion is on.
- Legal: only CC0 textures/HDRIs/models from the manifest (`public/assets/guide/3d/tex/LICENSES.md`), our own
  procedural geometry, partner logos already in the repo (`public/assets/guide/3d/logos/`, `public/assets/sponsors/`),
  OSM data (credit "© OpenStreetMap contributors" in the UI). No car-maker logos or other trademarks.

## 4. Rendering

- Tone mapping `AgXToneMapping`, `outputColorSpace = SRGBColorSpace`, physically based lights (candela/lux).
- Tiers (`render/quality.ts`): ultra = Apple M-series / discrete GPU (DPR ≤ 2, shadows 4096, GTAO, bloom,
  SMAA, transmission glass on hero windows), high = integrated laptop GPU (DPR ≤ 1.5, shadows 2048, GTAO half
  resolution, bloom, SMAA), low = phones/tablets (DPR ≤ 1.25, shadows 1024 near the camera only, no GTAO,
  light bloom, FXAA/none, fewer instances). Runtime downgrade if frame time stays > 40 ms.
- Sky & time (`sky/`): three/addons `Sky` driven by the NOAA sun position for 60.4493 N, 22.2933 E and the
  chosen local time; PMREM environment rebuilt when the time changes; directional sun light + hemisphere fill;
  exposure and fog follow the time; night = sun < −6°. Presets in lib (arrival Fri 15:30, dusk 16:30,
  evening 18:00, night 01:00, Saturday 11:00).
- Materials (`render/materials.ts`): CC0 WebP textures from `public/assets/guide/3d/tex/<name>/` (color,
  normal, roughness, ao); low tier uses 1K, ultra 2K where provided. Glass = MeshPhysicalMaterial
  (low roughness, env reflections; transmission only for a few hero panes on ultra).
- Facades (`render/facade.ts`): one material per style; the fragment shader draws windows, frames, mullions and
  spandrels from a per-face facade UV (metres along the wall, metres up) — thousands of windows with no
  geometry. Night: per-window lit/unlit via a hash, warm/cool variation, some blinds. Styles: grid, ribbon,
  curtain wall, scatter (EduCity's square windows of several sizes).

## 5. Performance budgets (per module, ultra / low)

| Module | Draw calls | Triangles | Textures |
|---|---|---|---|
| ground + context + landscape | ≤ 120 / 60 | ≤ 600k / 200k | shared library |
| each building (shell + interior) | ≤ 150 / 80 | ≤ 400k / 150k | shared + 1–3 canvas |
| vehicles + people | ≤ 30 / 15 | ≤ 250k / 60k | shared |
| event + routes | ≤ 40 / 20 | ≤ 50k | 2–4 canvas |

Total target: ≤ 600 draw calls, ≤ 2.5 M triangles on ultra; ≤ 250 draw calls, ≤ 700k triangles on low.

## 6. Navigation

- Orbit (default): OrbitControls with map-style panning, target clamped to the campus, camera never below
  ground or inside a closed building's walls; double-click/tap = fly to the point.
- Walk: eye height 1.65 m; WASD/arrows (+Shift run), drag to look; touch: left joystick + drag to look.
  Collision against `colliders` of the current level (circle radius 0.3 m); floor height from `walkAreas`;
  `connectors` show "Go up / Go down" buttons. Entering a building through a door switches level automatically
  when the walker stands inside that level's walk area.
- Tours: route polylines (data/campus.ts routes + building interior legs) followed by an avatar with a chase
  camera (or first person); captions at waypoints; play/pause/restart; reduced motion → step-by-step stills.

## 7. Places, views, targets, tours (lib/hackathon-2026/twin.ts)

- Places: `campus` (outdoor overview + arrival), `educity`, `biocity`, `joki` (views: Aula & Cave, Showroom,
  Company Lounge, Floors 2–3).
- View keys are `"<place>:<view>"`; every place has `"<place>:default"`.
- Target ids: company ids (Saturday Q&A stand, e.g. `elisa`), `room-<companyId>` (Friday briefing room),
  stand ids `bc-1…bc-4` (and partner ids `red-hat`, `solita` normalise to their stand), entrances
  `entrance-<name>`, areas (`lounge`, `build-hall`, `cave`, `aula`, `taidon-portaat`, `registration`, …),
  `supercars`.
- Backward-compatible deep links: `?scene=showroom|joki-tower|biocity`, `?focus=<company|partner|stand>`;
  new: `?place=`, `?view=`, `?time=HH:MM` or preset id, `?tour=<id>`, `?walk=1`.

## 8. UI (Twin.tsx)

Poster first; the engine loads on "Explore in 3D". Place tabs, view chips, "Go to" select (all targets),
target card with "Walk me there" + "Details", time-of-day control (presets + slider), walk-mode toggle,
labels toggle, full screen (phones open full screen), zoom. Loading progress. Text alternative under the
canvas (places, targets, tours as lists). Credits line: "3D model: Since AI — illustrative · Map data ©
OpenStreetMap contributors · Textures: ambientCG, Poly Haven (CC0)". Keyboard: arrows/WASD move (walk),
+/− zoom, 0 reset, Escape exits full screen, Tab order sane, focus trapped in full screen.

## 9. Testing harness

- Dev server: `npm run dev -- -p 3200` (or any port; pass `--base` / `TWIN_BASE` to the tools).
- Page: `/hackathon-2026/guide/venue?place=<id>&view=<id>&time=<HH:MM>&twin=debug#preview-3d` auto-starts the
  engine and exposes `window.__twin` (see engine/debug.ts: `ready()`, `stats()`, `goto(view)`, `focus(id)`,
  `setTime(iso)`, `only(moduleIds)`, `errors()`, `walk()`, `tour()`, `seekTour()`, `root()`, `pick()`, `bench()` …).
- Screenshots on the real GPU (macOS, Chromium with `--use-angle=metal`): `node scripts/twin/qa/shot.mjs --place=biocity
  --view=default --time=15:30 --size=1280x800 --out=/tmp/x.png`. Every browser goes through
  `scripts/twin/qa/gpu.mjs` (`launchGpu()`): at most 2 GPU browsers at once machine-wide and none while free memory is
  under 25 %. On a shared 16 GB machine also run `scripts/twin/qa/memguard.sh` (kills this repo's test browsers below
  15 % free memory).
- `npx tsc --noEmit -p .`, `npx eslint`, `npx jest --maxWorkers=2 components/guide/twin lib/hackathon-2026`.

## 10. Interfaces between agents (implement exactly; extend only by adding optional fields)

### engine/data/campus.ts (generated, committed)
```ts
import type { V2 } from "../types";
export interface CampusBuilding {
  id: string;            // "osm-48381050"
  osmId: number;
  name?: string;         // "Biocity", "Joukahaisenkatu 7" …
  role?: "biocity" | "joki" | "educity" | "electrocity" | "eurocity" | "pharmacity" | "datacity" | "ict-city"
       | "parkcity" | "civilcity" | "station" | "other";
  levels: number;
  height: number;        // metres (tag or research estimate)
  minHeight?: number;
  polygon: V2[];         // outer ring, counter-clockwise seen from above (+y), no repeated last point
  holes?: V2[][];
}
export interface CampusRoad {
  id: string; name?: string;
  kind: "trunk" | "secondary" | "tertiary" | "unclassified" | "residential" | "service" | "living_street"
      | "pedestrian" | "footway" | "cycleway" | "path" | "steps" | "track";
  width: number;         // carriageway or path width (m)
  lanes?: number; oneway?: boolean; layer?: number; bridge?: boolean; tunnel?: boolean;
  centerline: V2[];
}
export interface CampusArea { id: string; kind: string; name?: string; polygon: V2[] }   // parking, grass, square…
export interface CampusEntrance { id: string; kind: string; name?: string; building?: string; at: V2 }
export interface CampusData {
  origin: { lat: number; lon: number };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  buildings: CampusBuilding[];
  roads: CampusRoad[];
  areas: CampusArea[];
  entrances: CampusEntrance[];
  trees: V2[];
  lamps: V2[];
  railway: { kind: string; line: V2[] }[];
  /** Outdoor arrival routes (walking polylines), keyed by tour leg id. */
  routes: Record<string, V2[]>;
}
export const CAMPUS: CampusData;
export function campusBuilding(role: NonNullable<CampusBuilding["role"]>): CampusBuilding | undefined;
```

### lib/hackathon-2026/twin.ts (texts; no three.js)
```ts
export type PlaceId = "campus" | "educity" | "biocity" | "joki";
export interface Place3D { id: PlaceId; tab: string; title: string; caption: string; alt: string; poster: string;
  views: { id: string; label: string }[] }            // view ids without the place prefix; first = default
export interface Target3D { id: string; label: string; detail: string; place: PlaceId;
  kind: "company" | "room" | "stand" | "entrance" | "area" | "landmark"; href?: string }
export interface Tour3D { id: string; label: string; audience: string; summary: string; place: PlaceId;
  /** Ids of route legs in CAMPUS.routes and/or interior legs provided by building modules, in order. */
  legs: string[];
  /** Target id where the tour ends (camera settles there). */
  to: string;
  distanceM: number; minutes: number;
  steps: { text: string }[] }
export interface TimePreset { id: string; label: string; iso: string }
export const PLACES_3D: readonly Place3D[];
export const TARGETS_3D: readonly Target3D[];
export const TOURS_3D: readonly Tour3D[];
export const TIME_PRESETS: readonly TimePreset[];
export const DEFAULT_TIME: string;                  // "2026-11-06T15:30"
export function getPlace3D(id: PlaceId): Place3D;
export function placeForTarget(id: string | null | undefined): PlaceId;
export function normaliseTarget(id: string | null | undefined): string | null;   // red-hat → bc-1 …
export function legacyScene(scene: string | null): { place: PlaceId; view?: string } | null;
```

### nav/collision.ts (pure)
```ts
export function pointInPolygon(p: V2, poly: V2[]): boolean;
/** Move a circle (radius r) from `from` towards `to`, sliding along colliders; returns the final position. */
export function moveCircle(from: V2, to: V2, r: number, colliders: Collider2D[]): V2;
```

### nav/walk.ts
```ts
export interface WalkWorld { colliders: Collider2D[]; walkAreas: WalkArea[]; connectors: Connector[] }
export interface WalkState { position: V2; level: LevelId; yawDeg: number; pitchDeg: number }
export interface WalkController {
  enable(start: WalkState): void;
  disable(): void;
  setWorld(world: WalkWorld): void;
  /** Advance by dt seconds; writes camera position/orientation. True when the camera moved. */
  update(dt: number): boolean;
  state(): WalkState;
  nearConnector(): Connector | null;
  useConnector(id: string): void;
  dispose(): void;
}
export function createWalkController(camera: THREE.PerspectiveCamera, dom: HTMLElement,
  opts: { reducedMotion: boolean; eyeHeight?: number; onLevel?(level: LevelId): void;
          onConnector?(c: Connector | null): void }): WalkController;
```

### nav/tour.ts
```ts
export interface TourPath { id: string; points: V3[]; captions: { at: number; text: string }[] }  // at = 0..1 of length
export interface TourFrame { position: THREE.Vector3; target: THREE.Vector3; t: number; caption: string | null;
  walker: THREE.Vector3; heading: number }
export interface TourController {
  start(path: TourPath, mode: "chase" | "first"): void;
  stop(): void; pause(on: boolean): void; paused(): boolean; seek(t: number): void;
  /** Advance; null when no tour is running. */
  update(dt: number): TourFrame | null;
}
export function createTourController(opts?: { speed?: number /* m/s, default 1.6 */ }): TourController;
```

### engine/index.ts
```ts
export interface TwinOptions {
  tier?: Tier;                    // override auto detection (?quality=)
  reducedMotion: boolean;
  time: string;                   // ISO local Turku time
  onSelect?(id: string | null): void;
  onPlace?(place: PlaceId): void;
  onMode?(mode: "orbit" | "walk" | "tour"): void;
  onTour?(state: { id: string; t: number; caption: string | null } | null): void;
  onConnector?(c: { id: string; label: string } | null): void;
  onLabels?(on: boolean): void;
  onProgress?(p: { loaded: number; total: number }): void;
  onContextLost?(): void;
  preserveDrawingBuffer?: boolean;
}
export interface TwinEngine {
  load(): Promise<void>;          // builds all modules (progress events), resolves after first full frame
  goto(viewKey: string, animate?: boolean): boolean;      // "biocity:default"
  focus(targetId: string, animate?: boolean): boolean;
  setTime(iso: string): void;
  setLabels(on: boolean): void;
  walk(on: boolean, start?: string /* target id or view key */): void;
  useConnector(id: string): void;
  tour(id: string | null, mode?: "chase" | "first"): boolean;
  pauseTour(on: boolean): void;
  zoom(factor: number): void;
  resize(): void;
  whenReady(): Promise<void>;
  dispose(): void;
}
export function isWebGL2Available(): boolean;
export function createTwinEngine(container: HTMLElement, opts: TwinOptions): TwinEngine;
// debug (only when ?twin=debug or NODE_ENV !== "production"): window.__twin = { ready, stats, goto, focus,
//   setTime, only, errors, camera, setCamera, missingTargets }
```


## 11. Changes after the research (4 Oct, lead) — these override earlier sections

- **Data is fetched at runtime, not bundled.** Generated JSON lives in `public/assets/guide/3d/data/` (campus.json,
  lod2.json, streets.json, routes.json, interiors.json as needed) + the terrain heightfield
  `public/assets/guide/3d/terrain/dtm.png` (+ `dtm.json` metadata: extent, resolution, y = value/1000 + offset).
  `engine/data/campus.ts` exports the TYPES from §10 plus `loadCampus(): Promise<CampusData>` (cached; one fetch),
  `loadLod2()`, `loadStreets()`, `loadTerrain(): Promise<Terrain>` where
  `interface Terrain { heightAt(x: number, z: number): number; extent: {minX,maxX,minZ,maxZ}; resolution: number }`.
  Builders are async — `await loadCampus()` etc. Unit tests read the JSON from disk.
- **Heights:** y = h_N2000 − 23.20 (SPEC §1.2). The campus is NOT flat (EduCity deck +3.40, Joki Aula −1.70,
  Lemminkäisenkatu −1.1…−3.7, Jussin aukio +0.3/+2.1…). Every module places things on the terrain / its levels.
- **Shadows:** use three r186 `lights/SunLight.js` (two built-in cascades) if it works with the composer; else one
  fitted directional shadow. `PCFSoftShadowMap` was removed in r186 (PCF/VSM only). `THREE.Clock` → `THREE.Timer`.
- **Look (SPEC §8.2):** default "November afternoon, broken overcast with a low sun break" (Sky turbidity 8–10,
  rayleigh 2.5, mie 0.008/0.85, exposure −0.3 EV, fog exp2 ≈0.0012, damp ground). At 15:30 the street is in shade;
  only SW-facing tops catch warm light. Optional clear-cold and overcast presets.
- **Hero facts:** BioCity/Joki/EduCity plan frames B/J/E with exact transforms (SPEC §1.3); interiors from the CAD walls
  (`data/campus-twin/sources/interiors-walls.json`, `data/campus-twin/sources/interiors.json`); Showroom LED wall r 8.45 at J-bearings 194.2°→346.8°, counters at
  the J-bearings in SPEC §7.2 (the old scene is wrong — fix); the supercar recess = BioCity's Tykistökatu entrance recess
  (SPEC §5) with exact car placements.
- **Routes & tours:** `data/campus-twin/sources/spec_routes.json` (27 legs incl. interior 3D legs, 10 tours with lengths/times) is the
  source for TOURS_3D and the route legs.
- **Guide copy corrections (SPEC §10)** are handled by the lead in lib/ — do not edit those files.

## 12. Contract changes after the foundation (lead) — these override earlier sections

- **Materials:** `MaterialName` now also has `asphaltFootway`, `asphaltRed`, `setts`, `mulch`, `leafLitter`,
  `manhole`, `roadLineDecal`, `barkBirch` — use `ctx.materials.get(...)` for them (no more `extraMaterial`).
  `variant(name, { tile: [u, v], ... })` gives an owned copy with a different real-world tile size (metres per tile).
- **Light units:** 1 scene unit of illuminance = 1 klux; emissive/luminance 1 = 1000 cd/m². Use `LUMINANCE` presets
  (sky/sky.ts) for every emissive: windowLit 0.12, shopfront 0.25, lampHead 18, bollard 3, ledWall 0.6, signLit 1.2,
  ceilingPanel 2.5, eventLight 4. Interiors are exposed for `INTERIOR_EXPOSURE` (3.2) — an interior that looks right
  with the camera inside must not be blown out from outside at dusk (engine blends exposure).
- **Interior visibility:** `BuildingModule.setInterior?(on)` — the engine calls it with true while the building is
  open, in walk/tour mode, or when the camera is within ~240 m of the footprint; false when far and closed. While
  off, keep a cheap stand-in so glazing never goes dark (lit slabs / glow plane). Without the hook, the interior is
  always visible. Never hide an interior that the active view, a tour or walk mode can see.
- **Occlusion & orbit solids** come from `campus.buildings` footprints (role biocity/joki/educity); no `solids` field.
- Engine owns `index.ts`; module agents report needed engine changes as requests (the lead applies them).
- **Active tour:** `WorldModule.setTour?({ id, points } | null)` — the engine passes the full resolved path of the
  running tour (outdoor legs from routes.json + indoor legs from the buildings' `routeLegs`). world/routes.ts draws
  the active route from it; faint overview routes may use routes.json outdoor legs.
- **Indoor legs:** each building module provides `routeLegs` for its `int-*` legs (routes.json has rough versions):
  biocity → int-bio-tyk-to-gallery, int-bio-event-to-lobby, int-bio-lobby-to-event, int-bio-tyk-to-joki (to the Joki
  threshold; the joki agent may extend via int-joki-aula-to-showroom); joki → int-joki-aula-to-showroom; educity →
  int-edu-east-to-registration, int-edu-west-to-taidon, int-edu-doorB-to-1002. Points follow real doors, corridors,
  stairs and ramps at walking height 0 above the floor (the engine adds eye/avatar height). Keep each leg's first/last
  point where routes.json has it (outdoor legs join there) unless the door is elsewhere — then tell the lead.
- **Engine API additions (core fixes, 4 Oct):** `load()` rejects when campus data or terrain fail; `whenReady()` rejects
  promptly when the context is lost before the first frame; optional `setReducedMotion(on)`; `CameraView.indoor?: number`
  (0…1) overrides the exposure blend (default: 1 inside a hero building below its roof, 0.55 over an opened building,
  0 outside); labels inside a building hide everything outside it; declutter runs on camera motion only and a focused
  target's label always wins; orbit solids and label prisms come from LOD2 roof parts; flights are planned around
  buildings (arc / higher arc / crane / cut); walk mode follows structure walk areas (bridges, decks) over the DTM.
