import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { BuildingModule, LevelId, LightingState, TwinContext } from "../types";
import { loadTerrain, type Terrain } from "../data/campus";
import { disposeDeep } from "../util";
import { FRAME_B, bToLocal, groundFloorRing, routeLegsLocal } from "./biocity/plan";
import { pointInRing } from "../util";
import { Buckets, LAYERS, type Layer } from "./biocity/geom";
import { createBioMaterials, neutralise, withSunScale } from "./biocity/materials";
import { kelvinToLinear, skyIlluminance } from "../sky/sky";
import { buildExterior } from "./biocity/exterior";
import { buildInteriorStructure } from "./biocity/interior";
import { buildFitout } from "./biocity/fitout";
import { BIOCITY_VIEWS, biocityTargets } from "./biocity/views";
import { biocityWalk } from "./biocity/nav";

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
 * - setLighting: lit glazing and signs follow the time of day.
 */

/** OSM ways this module models (the fallback massing skips them). */
export const BIOCITY_CLAIMS = [48381050, 580071163, 782074009, 1328195307, 1328195308, 1328195311];

/**
 * Near-identical solid surfaces share one material (and one draw call per layer); phones merge a few
 * more (DESIGN §5: ≤ 150 draw calls ultra, ≤ 80 low per building).
 */
const ALIAS: Record<string, string> = {
  blackPanel: "blackSteel",
  signPanel: "blackSteel",
  planter: "blackSteel",
  coping: "whiteSteel",
  flagpole: "whiteSteel",
  glassDoor: "glassLow",
  downlight: "lightWarm",
  standBlack: "darkIn",
  steelIn: "darkIn",
  stairTread: "darkIn",
  columnBlack: "darkIn",
  wallCap: "darkIn",
  whiteTop: "plaster",
  whiteIn: "plaster",
  liftCar: "stainless",
};
const ALIAS_LOW: Record<string, string> = {
  ...ALIAS,
  silver: "plantGrey",
  concreteIn: "plaster",
  curtain: "darkIn",
  moss: "timber",
  lightStrip: "panelLight",
};

/** Facade-shader glass whose see-through share follows daylight (reflective by day, interiors at night). */
const GLASS_TRANS: Record<string, [number, number]> = {
  crown: [0.12, 0.34],
  tower: [0.1, 0.32],
  field: [0.12, 0.34],
  slotGlass: [0.16, 0.4],
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
  buckets.build(groups, materials, {
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
    plaster: shadow,
    columnBlack: shadow,
    atrium: shadow,
    atriumPlain: shadow,
    steelIn: shadow,
    stairTread: shadow,
    whiteIn: shadow,
    concreteIn: shadow,
    standBlack: shadow,
    ceiling: shadow,
    glassClear: { castShadow: false, receiveShadow: false, renderOrder: 2 },
    glassLow: { castShadow: false, receiveShadow: false, renderOrder: 2 },
    glassVault: { castShadow: false, receiveShadow: false, renderOrder: 3 },
    glassDoor: { castShadow: false, receiveShadow: false, renderOrder: 2 },
    glassIn: { castShadow: false, receiveShadow: false, renderOrder: 2 },
    flagpole: shadow,
  });

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

  const walk = biocityWalk();
  const alwaysLabel = labels.find((l) => !interiorLabels.includes(l)) ?? null;
  const floorRing = groundFloorRing();

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
    tick(_dt, _elapsed, camera) {
      // Cheap per-frame check (only when the camera moved by ≥ 0.5 m).
      const p = camera.position;
      const key = `${Math.round(p.x * 2)},${Math.round(p.y * 2)},${Math.round(p.z * 2)}`;
      if (key === lastCam) return false;
      lastCam = key;
      camB.copy(p);
      frame.worldToLocal(camB);
      inside = camB.y < 4.2 && pointInRing([camB.x, camB.z], floorRing);
      const before = interiorLabels.map((l) => l.userData.hidden);
      applyLabels();
      if (interiorLabels.some((l, i) => l.userData.hidden !== before[i])) ctx.invalidate();
      return false;
    },
    setLighting(state: LightingState) {
      const n = state.night;
      // Daylight through the glass vault and the glazing (daylight factor ≈ 10 % under the vault,
      // less at the edges) and the 3000–3500 K LEDs, which carry the hall once it gets dark.
      const sky = skyIlluminance(state.sunElevationDeg);
      light.daylight.value.copy(daylightColor).multiplyScalar(0.1 * sky);
      const art = 0.45 + 0.55 * n;
      for (const m of lit) m.envMapIntensity = (m.userData.bioEnv as number) * art;
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
