import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { BuildingModule, LevelId, LightingState, TwinContext, V2, V3 } from "../types";
import { loadTerrain, type Terrain } from "../data/campus";
import { disposeDeep, pointInRing } from "../util";
import { FRAME_B, LEVEL, bToLocal, groundFloorRing, routeLegsLocal } from "./biocity/plan";
import { DOOR, doorTargetAngle, stepDoorAngle } from "./biocity/door";
import { makeLabel } from "../labels";
import { Buckets, LAYERS, type Layer } from "./biocity/geom";
import { createBioMaterials, neutralise, withSunScale } from "./biocity/materials";
import { kelvinToLinear, openedInteriorScale, outsideInteriorScale, skyIlluminance } from "../sky/sky";
import { buildExterior } from "./biocity/exterior";
import { buildInteriorStructure } from "./biocity/interior";
import { buildFitout } from "./biocity/fitout";
import { BIOCITY_VIEWS, biocityTargets } from "./biocity/views";
import { biocityWalk } from "./biocity/nav";
import { ALIAS, ALIAS_LOW } from "./biocity/aliases";

/**
 * BioCity (Tykistökatu 6) — exterior and ground floor (DESIGN §2, SPEC §3.1,
 * §5, §7.1). Built in plan frame B (buildings/biocity/plan.ts) inside one
 * group placed with the frame's transform; everything handed to the engine
 * (views, targets, colliders, walk areas, route legs) is in the campus frame.
 *
 * - setOpen(level): dollhouse — roofs, upper floors, the vault and the GF
 *   ceilings hidden, the shell cut at 4.5 m, interior labels shown.
 * - setInterior(on): furniture, people and signs only while the camera may
 *   see inside; floors, walls, fronts and the atrium stay as the stand-in.
 * - setLighting: lit glazing and signs follow the time of day; after dark the
 *   hall's light is toned down while the camera looks in from outside.
 * - tick: the revolving door's wings turn with whoever walks through (door.ts).
 */

/** OSM ways this module models (the fallback massing skips them). */
export const BIOCITY_CLAIMS = [48381050, 580071163, 782074009, 1328195307, 1328195308, 1328195311];

/** Facade-shader glass whose see-through share follows daylight (reflective by day, interiors at night). */
const GLASS_TRANS: Record<string, [number, number]> = {
  crown: [0.12, 0.34],
  tower: [0.1, 0.32],
  field: [0.12, 0.34],
  slotGlass: [0.16, 0.4],
  // Street-level shopfronts: clear by day; after dark the night exposure would turn a lit shop into a
  // white panel, so the glass passes less (the K-Market stays the brightest).
  shopfront: [0.4, 0.06],
  kmarket: [0.46, 0.12],
  groundOffice: [0.36, 0.05],
};

export async function buildBioCity(ctx: TwinContext): Promise<BuildingModule> {
  const terrain: Terrain | null = await loadTerrain().catch(() => null);
  const groundB = (x: number, z: number) => {
    const [lx, lz] = bToLocal(x, z);
    return terrain ? terrain.heightAt(lx, lz) : 0;
  };

  const root = new THREE.Group();
  root.name = "biocity";
  const frame = new THREE.Group();
  frame.name = "biocity-frame-B";
  frame.rotation.y = -(FRAME_B.theta * Math.PI) / 180;
  frame.position.set(FRAME_B.tx, 0, FRAME_B.tz);
  root.add(frame);
  const groups = {} as Record<Layer, THREE.Group>;
  for (const l of LAYERS) {
    const g = new THREE.Group();
    g.name = `biocity-${l}`;
    frame.add(g);
    groups[l] = g;
  }

  const { materials, textures, light } = createBioMaterials(ctx);
  const buckets = new Buckets();
  const ext = buildExterior(buckets, { groundB, tier: ctx.tier });
  for (const e of ext.extra) groups[e.layer].add(e.object);
  // The revolving door's wings: their own pivot on the post, turned by tick() (door.ts).
  const doorPivot = new THREE.Group();
  doorPivot.name = "biocity-revolving-door";
  doorPivot.position.set(ext.door.centre[0], 0, ext.door.centre[1]);
  {
    const glass = new THREE.Mesh(ext.door.glass, materials[ctx.tier === "low" ? "glassLow" : "glassDoor"]);
    glass.name = "biocity-door-wings-glass";
    glass.renderOrder = 2;
    const frameMesh = new THREE.Mesh(ext.door.frame, materials.blackSteel);
    frameMesh.name = "biocity-door-wings-frame";
    frameMesh.castShadow = ctx.tier !== "low";
    frameMesh.receiveShadow = true;
    doorPivot.add(glass, frameMesh);
  }
  groups.shell.add(doorPivot);
  buildInteriorStructure(buckets, { tier: ctx.tier });
  const fit = buildFitout(buckets, ctx);
  for (const o of fit.interior) groups.interior.add(o);
  for (const e of fit.exterior) groups[e.layer].add(e.object);
  for (const m of fit.materials) {
    neutralise(m);
    if (m.userData.bioEnv === undefined) m.userData.bioEnv = (m as THREE.MeshStandardMaterial).envMapIntensity ?? 1;
    withSunScale(m, light);
  }

  buckets.alias(ctx.tier === "low" ? ALIAS_LOW : ALIAS);
  const shadow = { castShadow: true, receiveShadow: true };
  // Phones: the interior casts no shadows (the low-sun November light never reaches the hall floor;
  // each caster is one more draw call in the shadow pass).
  const inner = ctx.tier === "low" ? { castShadow: false, receiveShadow: true } : shadow;
  const built = buckets.build(groups, materials, {
    ribbonBlack: shadow,
    crown: shadow,
    tower: shadow,
    field: shadow,
    panelBlack: shadow,
    ribbonWhite: shadow,
    whiteGrid: shadow,
    blackPanel: shadow,
    blackSteel: shadow,
    techStorey: shadow,
    roof: shadow,
    ductBlack: shadow,
    silver: shadow,
    whiteSteel: shadow,
    coping: shadow,
    signPanel: shadow,
    plaster: inner,
    columnBlack: inner,
    atrium: inner,
    atriumPlain: inner,
    steelIn: inner,
    stairTread: inner,
    whiteIn: inner,
    concreteIn: inner,
    standBlack: inner,
    ceiling: inner,
    glassClear: { castShadow: false, receiveShadow: false, renderOrder: 2 },
    glassLow: { castShadow: false, receiveShadow: false, renderOrder: 2 },
    glassVault: { castShadow: false, receiveShadow: false, renderOrder: 3 },
    vaultGrid: { castShadow: false, receiveShadow: false, renderOrder: 2 },
    glassDoor: { castShadow: false, receiveShadow: false, renderOrder: 2 },
    glassIn: { castShadow: false, receiveShadow: false, renderOrder: 2 },
    flagpole: inner,
    mural: shadow,
    plinth: shadow,
  });
  if (ctx.tier === "low") {
    // Phones: only the tall upper volume casts the building's (long, low-sun) shadow; the ground storey,
    // the soffits and the vault's glass grid are in its shadow anyway (each caster is a shadow-pass call).
    const keep = /^biocity-upper-(ribbonBlack|crown|panelBlack|blackSteel|roof|techStorey)$/;
    for (const m of built) if (!keep.test(m.name)) m.castShadow = false;
  }

  // Seated builders at the tables (props/people.ts, when it is there), lit like the interior.
  const people = await import("../props/people").catch(() => null);
  if (people && typeof people.placeSeatedPeople === "function") {
    try {
      // About half the seats taken (the module thins this further on phones).
      const occupancy = ctx.tier === "low" ? 0.25 : 0.45;
      const mesh = people.placeSeatedPeople(groups.interior, fit.seats, ctx, { occupancy, seed: 61106, lanyard: 0.85 });
      if (mesh) {
        // Indoors the November sun never reaches the floor: no shadow passes for 100+ figures.
        mesh.castShadow = false;
        // The figures are posed in the vertex shader; the AO prepass (scene.overrideMaterial) would
        // draw them in their bind pose and leave standing "ghost" silhouettes in the AO. Skip them
        // in override passes (instance count 0 for that draw only).
        mesh.userData.noAO = true;
        const count = mesh.count;
        const before = mesh.onBeforeRender;
        mesh.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
          before.call(mesh, renderer, scene, camera, geometry, material, group);
          mesh.count = scene.overrideMaterial ? 0 : count;
        };
        mesh.onAfterRender = () => {
          mesh.count = count;
        };
        const m = mesh.material as THREE.MeshStandardMaterial;
        if (ctx.envInterior) m.envMap = ctx.envInterior;
        m.userData.bioEnv = 1;
        withSunScale(m, light);
      }
    } catch {
      // Builders are dressing; the hall stands without them.
    }
  }

  // Labels live in plan frame B; interior ones only show in the dollhouse.
  const labels: CSS2DObject[] = [];
  const interiorLabels: CSS2DObject[] = [];
  for (const { label, interior } of fit.labels) {
    frame.add(label);
    labels.push(label);
    if (interior) interiorLabels.push(label);
  }

  // The building's name over the campus (like Joki's and EduCity's): above the vault, on the footprint's
  // centroid (the campus origin), in every campus view.
  const nameLabel = makeLabel("BioCity", "building", 0, LEVEL.vaultCrown + 4.5, 0, "campus");
  nameLabel.userData.exterior = true;
  root.add(nameLabel);
  labels.push(nameLabel);

  const walk = biocityWalk();
  const alwaysLabel = labels.find((l) => !interiorLabels.includes(l)) ?? null;
  const floorRing = groundFloorRing();

  // ── Revolving door: the wings follow whoever walks through it (door.ts) ──
  let doorAngle = 0;
  /** The running tour's path (campus frame) with cumulative lengths: estimates the avatar in chase mode. */
  let tourPath: { pts: V3[]; cum: number[] } | null = null;
  const [doorLX, doorLZ] = bToLocal(DOOR.x, DOOR.z);
  const actorB = new THREE.Vector3();
  const floorRingLocal = groundFloorRing().map(([x, z]) => bToLocal(x, z));
  /** The walker (walk mode / first person) or the route's avatar near the door, in plan B; else null. */
  const actorNearDoor = (camera: THREE.PerspectiveCamera): V2 | null => {
    const hook = (ctx as TwinContext & { actor?: () => V3 | null }).actor;
    let p: V3 | null = hook ? hook() : null;
    const c = camera.position;
    if (!hook) {
      if (Math.hypot(c.x - doorLX, c.z - doorLZ) > 16) return null;
      if (c.y < 2.4) p = [c.x, c.y, c.z];
      else if (tourPath) {
        // Chase camera: it trails the avatar along the route (≈5 m indoors, 7 m outdoors).
        const { pts, cum } = tourPath;
        let best = Infinity;
        let s = 0;
        for (let i = 0; i + 1 < pts.length; i++) {
          const ax = pts[i][0];
          const az = pts[i][2];
          const dx = pts[i + 1][0] - ax;
          const dz = pts[i + 1][2] - az;
          const l2 = dx * dx + dz * dz || 1;
          const t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.z - az) * dz) / l2));
          const d = Math.hypot(c.x - ax - dx * t, c.z - az - dz * t);
          if (d < best) {
            best = d;
            s = cum[i] + (cum[i + 1] - cum[i]) * t;
          }
        }
        const back = pointInRing([c.x, c.z], floorRingLocal) ? 5 : 7;
        const target = Math.min(cum[cum.length - 1], s + back);
        let i = 1;
        while (i < cum.length - 1 && cum[i] < target) i++;
        const f = (target - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
        p = [0, 1, 2].map((k) => pts[i - 1][k] + (pts[i][k] - pts[i - 1][k]) * f) as V3;
      }
    }
    if (!p) return null;
    actorB.set(p[0], p[1], p[2]);
    frame.worldToLocal(actorB);
    return [actorB.x, actorB.z];
  };
  const turnDoor = (dt: number, camera: THREE.PerspectiveCamera): boolean => {
    const target = doorTargetAngle(actorNearDoor(camera), doorAngle);
    const next = ctx.reducedMotion && target !== null ? target : stepDoorAngle(doorAngle, target, dt);
    if (next === doorAngle) return false;
    doorAngle = next;
    // Plan bearing b ↔ rotation.y = −b (bearing 0 = −z).
    doorPivot.rotation.y = (-doorAngle * Math.PI) / 180;
    return true;
  };

  // ── The hall seen from outside or opened ──
  // The engine exposes the street, not the lit hall: seen through the gables, the vault or the gallery
  // glass from outside, a hall lit for the inside would burn to white after dark. Its own light (the
  // interior environment, the daylight term, the light panels and the interior-mapped fronts) follows
  // sky.ts's outsideInteriorScale while the camera is outside the closed building, and
  // openedInteriorScale over the dollhouse; 1 inside. Eased, so walking in through a door blends with
  // the engine's own exposure change.
  let sunElev = 0;
  let art = 1;
  let skyKlux = 0;
  let outsideDim = 1;
  /** The lobby's interior-mapped fronts (meeting rooms, shops, atrium windows): their rooms glow too. */
  const indoorGlass: { u: THREE.IUniform<number>; base: number }[] = [];
  /** The interior's light panels (emissive basic materials) with their full colours. */
  const panels = (["panelLight", "liftLight", "lineLight", "pendant"] as const)
    .map((k) => materials[k])
    .filter((m): m is THREE.MeshBasicMaterial => m instanceof THREE.MeshBasicMaterial)
    .map((m) => ({ m, base: m.color.clone() }));
  const applyInteriorLight = () => {
    for (const m of lit) m.envMapIntensity = (m.userData.bioEnv as number) * art * outsideDim;
    for (const g of indoorGlass) g.u.value = g.base * outsideDim;
    for (const p of panels) p.m.color.copy(p.base).multiplyScalar(outsideDim);
    light.daylight.value.copy(daylightColor).multiplyScalar(0.1 * skyKlux * outsideDim);
  };
  const easeOutsideDim = (dt: number): boolean => {
    const target = inside ? 1 : open !== null ? openedInteriorScale(sunElev) : outsideInteriorScale(sunElev);
    if (Math.abs(target - outsideDim) < 1e-3) return false;
    const next = outsideDim + (target - outsideDim) * (1 - Math.exp(-6 * Math.max(dt, 1 / 60)));
    outsideDim = Math.abs(target - next) < 2e-3 ? target : next;
    applyInteriorLight();
    return true;
  };

  let open: LevelId | null = null;
  let interiorOn = true;
  /**
   * Interior labels show in the dollhouse, when the camera is inside the ground floor, and —
   * stand labels only — from just outside the glass (e.g. stand 1 seen from the event entrance).
   */
  let inside = false;
  const camB = new THREE.Vector3();
  const labelB = new THREE.Vector3();
  const applyLabels = () => {
    for (const l of interiorLabels) {
      let show = open !== null || inside;
      if (!show && (l.userData.kind === "stand" || l.userData.kind === "open") && camB.y < 6) {
        labelB.copy(l.position);
        show = Math.hypot(labelB.x - camB.x, labelB.z - camB.z) < 11;
      }
      if (l.userData.hidden === !show) continue;
      l.userData.hidden = !show;
      // The engine recomputes `visible` on its next label refresh; follow an always-on label until then.
      l.visible = show && (alwaysLabel ? alwaysLabel.visible : true);
    }
  };
  const applyVisibility = () => {
    const isOpen = open !== null;
    // Opened as a dollhouse, the floor plan speaks for itself: no building name floating over it.
    nameLabel.userData.hidden = isOpen;
    if (isOpen) nameLabel.visible = false;
    groups.upper.visible = !isOpen;
    groups.ceiling.visible = !isOpen;
    groups.interiorUpper.visible = !isOpen && interiorOn;
    groups.interior.visible = interiorOn || isOpen;
    // The dollhouse keeps a little sun for modelling; the hidden floors no longer shade the hall.
    light.sun.value = isOpen ? 0.12 : 1;
    applyLabels();
  };
  applyVisibility();
  let lastCam = "";

  // Interior materials of this instance: their artificial light (envInterior) follows the time of day.
  const lit: THREE.MeshStandardMaterial[] = [];
  root.traverse((o) => {
    const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (mm && mm.userData.bioEnv !== undefined && !lit.includes(mm)) lit.push(mm);
  });
  const daylightColor = kelvinToLinear(6200);

  const glassUniforms: { u: THREE.IUniform<number>; range: [number, number] }[] = [];
  for (const [key, range] of Object.entries(GLASS_TRANS)) {
    const m = materials[key] as THREE.MeshStandardMaterial | undefined;
    const u = (m?.userData.facade as { uniforms?: Record<string, THREE.IUniform<number>> } | undefined)?.uniforms?.uFcTrans;
    if (u) glassUniforms.push({ u, range });
  }
  for (const key of ["officeFront", "shopfrontIn", "atrium"]) {
    const u = (materials[key]?.userData.facade as { uniforms?: Record<string, THREE.IUniform<number>> } | undefined)?.uniforms?.uFcTrans;
    if (u) indoorGlass.push({ u, base: u.value });
  }

  const bio: BuildingModule = {
    id: "biocity",
    building: "biocity",
    root,
    shell: groups.upper,
    labels,
    pickables: fit.pickables,
    targets: biocityTargets(),
    views: BIOCITY_VIEWS,
    claims: BIOCITY_CLAIMS,
    colliders: walk.colliders,
    walkAreas: walk.walkAreas,
    connectors: walk.connectors,
    routeLegs: routeLegsLocal(),
    levels: [{ id: "biocity-1", name: "Ground floor", y: 0.06, group: groups.interior }],
    ready: Promise.all([ctx.materials.ready(), fit.ready]),
    setOpen(level) {
      open = level;
      applyVisibility();
      ctx.invalidate();
    },
    setInterior(on) {
      interiorOn = on;
      applyVisibility();
      ctx.invalidate();
    },
    setTour(tour) {
      if (!tour || tour.points.length < 2) {
        tourPath = null;
        return;
      }
      const cum = [0];
      for (let i = 1; i < tour.points.length; i++) {
        const a = tour.points[i - 1];
        const b = tour.points[i];
        cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[2] - a[2]));
      }
      tourPath = { pts: tour.points, cum };
    },
    tick(dt, _elapsed, camera) {
      const turning = turnDoor(dt, camera);
      const dimming = easeOutsideDim(dt);
      // Cheap per-frame check (only when the camera moved by ≥ 0.5 m).
      const p = camera.position;
      const key = `${Math.round(p.x * 2)},${Math.round(p.y * 2)},${Math.round(p.z * 2)}`;
      if (key === lastCam) return turning || dimming;
      lastCam = key;
      camB.copy(p);
      frame.worldToLocal(camB);
      inside = camB.y < 4.2 && pointInRing([camB.x, camB.z], floorRing);
      const before = interiorLabels.map((l) => l.userData.hidden);
      applyLabels();
      if (interiorLabels.some((l, i) => l.userData.hidden !== before[i])) ctx.invalidate();
      return turning || dimming;
    },
    setLighting(state: LightingState) {
      const n = state.night;
      sunElev = state.sunElevationDeg;
      // Daylight through the glass vault and the glazing (daylight factor ≈ 10 % under the vault,
      // less at the edges) and the 3000–3500 K LEDs, which carry the hall once it gets dark.
      skyKlux = skyIlluminance(state.sunElevationDeg);
      art = 0.45 + 0.55 * n;
      applyInteriorLight();
      for (const g of glassUniforms) g.u.value = g.range[0] + (g.range[1] - g.range[0]) * n;
      for (const s of fit.nightSigns) s.material.emissiveIntensity = s.day + (s.night - s.day) * n;
      ctx.invalidate();
    },
    dispose() {
      for (const t of textures) t.dispose();
      for (const t of fit.textures) t.dispose();
      for (const m of Object.values(materials)) m.dispose();
      for (const m of fit.materials) m.dispose();
      disposeDeep(root);
    },
  };
  return bio;
}
