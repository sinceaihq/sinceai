import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { BuildingModule, LevelId, LightingState, TwinContext, V2 } from "../types";
import { INTERIOR_EXPOSURE, LUMINANCE, exposureFor, kelvinToLinear } from "../sky/sky";
import { makeLabel } from "../labels";
import { E, Y0, eToLocal3 } from "./educity/frame";
import { allWindows, facadeLength, facadeTop, type Facade } from "./educity/data";
import { BAND_COUNT, CUTS, Kit } from "./educity/kit";
import { FACADES, WALL, brickBase, buildMantle, fp, type WindowInfo } from "./educity/mantle";
import { buildVolumes, copings } from "./educity/volumes";
import { buildOutdoor } from "./educity/outdoor";
import { modelledRoomAt } from "./educity/rooms";
import { makeSignAtlas } from "./educity/signs";
import {
  emissiveMaterial,
  makeBrickMaterial,
  makeCeilingMaterial,
  makeClearGlass,
  makeFritGlass,
  makePlantMaterial,
  makeRailingMaterial,
  makeSlatMaterial,
  makeUberMaterial,
  makeWindowGlassMaterial,
  interiorLight,
  interiorLightUniforms,
} from "./educity/materials";
import { buildInterior, doorSigns } from "./educity/interior";
import { emitStorageFront } from "./educity/taidon";
import { buildNav } from "./educity/nav";
import { edInteriorLevel, edLitFraction } from "./educity/lighting";
import { rectSlab } from "./educity/geom";

/**
 * EduCity (Joukahaisenkatu 7; SPEC §3.3, §7.4) — the brick building with the
 * random square windows where builders register and challenge partners hold
 * their Friday briefings.
 *
 * Exterior: the Kolumba brick mantle with its inclined top and ≈270 square
 * windows (measured lists on the north-east and south-east facades), the
 * stepped terraces, the satin plant room (uplit at night), the fritted
 * atrium roof, the glass entrance pavilion with both main entrances, door B
 * in its brick portal, the outdoor Main Stairs, the south-east walkway, the
 * link bridges to ICT-City and the street storey on Joukahaisenkatu (with
 * the lime-green room of the night photograph).
 * Interior (floors 1–2): the lobby with registration and the team formation
 * area, Taidon portaat with the opening-ceremony stage, Ravintola Kisälli,
 * the atrium and the 15 company briefing rooms with door signs and logos.
 *
 * Authored in the plan frame E (SPEC §1.3) inside one group. The dollhouse
 * hides horizontal bands of the shell (cut at y_E 4.2 / 8.6, capped) —
 * mesh visibility, no shader clipping, so shadows and GTAO stay right.
 */

export async function buildEduCity(ctx: TwinContext): Promise<BuildingModule> {
  const root = new THREE.Group();
  root.name = "educity";
  const eRoot = new THREE.Group();
  eRoot.name = "educity:E";
  eRoot.rotation.y = (-E.theta * Math.PI) / 180;
  eRoot.position.set(E.tx, Y0, E.tz);
  root.add(eRoot);
  const kit = new Kit(eRoot);
  const lib = ctx.materials;
  const tier = ctx.tier;
  const low = tier === "low";

  // ── Materials ──
  const night = { value: ctx.lighting().night };
  const winUniforms = { uEdLit: { value: edLitFraction(ctx.lighting().iso, ctx.lighting().night) } };
  const brick = makeBrickMaterial();
  const uber = makeUberMaterial(lib, { textured: "concreteFacade", name: "shell" });
  const uberInt = makeUberMaterial(lib, { name: "interior", env: ctx.envInterior });
  const winGlass = makeWindowGlassMaterial(winUniforms, tier);
  const clearGlass = makeClearGlass(lib, 0.14);
  const alwaysGlass = makeClearGlass(lib, 0.12, "#0f1518");
  const plant = makePlantMaterial(night);
  const frit = makeFritGlass(lib);
  const sedum = lib.variant("grass", { color: "#7f5544", roughness: 1 });
  const deck = lib.variant("oak", { color: "#c9c4b9", roughness: 0.85, tile: [1.6, 1.6] });
  const pavers = lib.variant("pavers", { color: "#8d8580", tile: [1.2, 1.2] });
  const lights = emissiveMaterial("#ffe6c4", 0);
  const ceiling = makeCeilingMaterial(ctx);
  const slats = makeSlatMaterial(ctx, true);
  const signsExt = new THREE.MeshStandardMaterial({ roughness: 0.5, alphaTest: 0.35, emissive: "#ffffff", emissiveIntensity: 0 });
  signsExt.name = "educity:lettering";
  const railMat = makeRailingMaterial();
  for (const m of [brick, uber, uberInt, winGlass, clearGlass, alwaysGlass, plant, frit, sedum, deck, pavers, lights, ceiling, slats, signsExt, railMat]) kit.materials.add(m);
  // The shell is single-sided: three would render only back faces into the shadow map, so a wall or
  // roof facing the sun would cast nothing and the low sun would light the rooms through the brick.
  // Both sides cast; the sun then reaches the interiors through the clear windows only.
  for (const m of [brick, uber, uberInt, plant, sedum, deck]) m.shadowSide = THREE.DoubleSide;

  // ── Signs ──
  const doors = doorSigns();
  const atlas = makeSignAtlas(doors, low ? 0.5 : 1);
  signsExt.map = atlas.texture;
  signsExt.emissiveMap = atlas.texture;
  signsExt.needsUpdate = true;

  // ── Exterior shell ──
  const shell = { group: "shell", split: true, castShadow: true, receiveShadow: true } as const;
  const uberX = { color: 3, aEdRM: 2 } as const;
  const winX = { aWinA: 4, aWinB: 4 } as const;
  const windows: WindowInfo[] = allWindows().map((w) => {
    const F = FACADES[w.facade];
    const [x, , z] = fp(F, w.s, w.y, 1.5);
    const level = w.y > 0 && w.y < 4.6 ? "f1" : w.y >= 5 && w.y < 8.6 ? "f2" : null;
    return { ...w, clear: !w.open && level !== null && modelledRoomAt(level, x, z) !== null };
  });
  const frame = kit.bucket("frame", uber, { ...shell, extra: uberX }).paint("#1f1a18", 0.45, 0);
  const mantle = {
    brick: kit.bucket("brick", brick, shell),
    frame,
    // Window glass never casts: the sun comes in through the windows.
    glass: kit.bucket("win-glass", winGlass, { ...shell, castShadow: false, extra: winX }),
    glassStandIn: kit.bucket("win-glass-standin", winGlass, { group: "standin", split: true, extra: winX }),
    glassClear: kit.bucket("win-glass-clear", clearGlass, { group: "clear", split: true, receiveShadow: false }),
    innerF1: kit.bucket("inner-f1", uberInt, { group: "f1", extra: uberX }).paint("#e6e5e1", 0.85),
    innerF2: kit.bucket("inner-f2", uberInt, { group: "f2", extra: uberX }).paint("#e6e5e1", 0.85),
  };
  buildMantle(mantle, windows);

  const plantBucket = kit.bucket("plant", plant, { ...shell, extra: { aEdUp: 1 } });
  plantBucket.onVertex = (p) => plantBucket.set("aEdUp", [Math.min(1, Math.max(0, (p[1] - 25) / 8.94))]);
  const vol = {
    render: kit.bucket("render", uber, { ...shell, extra: uberX }).paint("#c6c9c7", 0.9),
    plant: plantBucket,
    frame,
    glass: mantle.glass,
    sedum: kit.bucket("sedum", sedum, shell),
    deck: kit.bucket("deck", deck, shell),
    roof: kit.bucket("roof", uber, { ...shell, extra: uberX }).paint("#7d8083", 0.95),
    metal: kit.bucket("metal", uber, { ...shell, extra: uberX }).paint("#9aa1a4", 0.45, 0.55),
    rail: kit.bucket("rail", railMat, { group: "shell", split: true, castShadow: false, renderOrder: 1 }),
    frit: kit.bucket("frit", frit, { group: "shell", split: true, renderOrder: 2, receiveShadow: false }),
    coping: frame,
  };
  buildVolumes(vol, plantBucket);
  const coping = kit.bucket("coping", uber, { ...shell, extra: uberX }).paint("#2e2b2a", 0.55, 0.2);
  copings(
    coping,
    [
      { f: "NE", s0: -0.035, s1: 51.835, kinks: [] },
      { f: "SE", s0: 0.45, s1: 64.75, kinks: [36.46] },
      { f: "SW", s0: -0.035, s1: 51.835, kinks: [] },
      { f: "NW", s0: 0.45, s1: 64.75, kinks: [53.94] },
    ],
    (f, s, d) => {
      const p = fp(FACADES[f], s, 0, d);
      return [p[0], p[2]];
    },
  );

  const outdoor = {
    render: vol.render,
    metal: vol.metal,
    rail: vol.rail,
    frame,
    sedum: vol.sedum,
    pavers: kit.bucket("pavers", pavers, shell),
    lights: kit.bucket("lights", lights, { group: "shell", split: true }),
    signs: kit.bucket("signs", signsExt, { group: "shell", split: true }),
    glassStandIn: mantle.glassStandIn,
    glassClear: mantle.glassClear,
    glassAlways: kit.bucket("glass-always", alwaysGlass, { group: "shell", split: true, receiveShadow: false }),
    streetWalls: kit.bucket("street-walls", uberInt, { group: "street", extra: uberX }).paint("#d9dad8", 0.85),
    streetCeiling: kit.bucket("street-ceiling", ceiling, { group: "street" }),
  };
  buildOutdoor(outdoor, { educity: atlas.rect("educity"), B: atlas.rect("B") });

  // Dollhouse caps: the cut faces of the mantle (dark "poche") at each cut height.
  for (const [i, cut] of CUTS.entries()) {
    const capB = kit.bucket(`cap-${i}`, uber, { group: `caps.${i === 0 ? "A" : "B"}`, extra: uberX }).paint("#2b2b2d", 0.9);
    for (const f of ["NE", "SE", "SW", "NW"] as Facade[]) {
      const F = FACADES[f];
      const len = facadeLength(f);
      let start: number | null = null;
      for (let s = 0; s <= len + 1e-6; s += 0.1) {
        const inside = brickBase(f, s) < cut && facadeTop(f, s) > cut + 0.05;
        if (inside && start === null) start = s;
        if ((!inside || s + 0.1 > len + 1e-6) && start !== null) {
          const end = inside ? len : s;
          const a = fp(F, start, cut, 0);
          const b = fp(F, end, cut, 0);
          const c = fp(F, end, cut, WALL);
          const d = fp(F, start, cut, WALL);
          const xs = [a[0], b[0], c[0], d[0]];
          const zs = [a[2], b[2], c[2], d[2]];
          rectSlab(capB, Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs), cut + 0.002, true);
          start = null;
        }
      }
    }
  }

  // ── Interior (floors 1–2, atrium) ──
  const light = interiorLightUniforms();
  for (const m of [uberInt, ceiling, slats]) interiorLight(m, light);
  const inside = buildInterior(kit, ctx, { atlas, doors, uberInt, ceiling, slats, winGlass, light });
  // Faceted birch storage front under Taidon portaat (faces the north aula).
  emitStorageFront(kit.bucket("storage-front", slats, { group: "f1" }), 4.56);

  const triangles = kit.finish();

  // ── Labels: the building name and the entrances outside, their counterparts inside ──
  const labels: CSS2DObject[] = [...inside.labels];
  const exterior = (text: string, kind: "entrance" | "building", x: number, y: number, z: number, group: string | undefined, detail?: string) => {
    const p = eToLocal3(x, y, z);
    const l = makeLabel(text, kind, p[0], p[1], p[2], group, detail);
    l.userData.exterior = true;
    labels.push(l);
    return l;
  };
  const nameLabel = exterior("EduCity", "building", 26, 37.6, 32, "campus");
  // Entrance labels stand just outside the building's outline (and above the pavilion canopy), so
  // the engine's occlusion test hides them whenever the building is between the camera and the door.
  exterior("EduCity west main entrance", "entrance", -1.0, 6.6, 74.6, "edu-entrance", "builders · to BioCity");
  exterior("EduCity east main entrance", "entrance", 52.6, 6.6, 74.7, "edu-entrance", "registration");
  exterior("Door B", "entrance", 53.4, 4.2, 32.7, "edu-entrance", "company arrivals → 1002");
  exterior("Step-free entrance", "entrance", -2.0, -1.4, 29.4, "edu-gateway", "lifts in the passage");
  // Inside counterparts for the lobby / rooms views.
  for (const [text, x, z, group] of [
    ["West main entrance", 9.4, 75.8, "edu-lobby"],
    ["East main entrance", 43.2, 76.0, "edu-lobby"],
    ["Door B", 50.2, 32.7, "edu-rooms1"],
  ] as const) {
    const p = eToLocal3(x, 2.6, z);
    const l = makeLabel(text, "entrance", p[0], p[1], p[2], group);
    l.userData.level = "educity-1";
    l.userData.interior = true;
    labels.push(l);
  }

  // ── State: open level and interior visibility ──
  let openLevel: LevelId | null = null;
  let interiorOn = true;
  const g = (key: string) => kit.group(key);
  const setVis = (key: string, on: boolean) => {
    const grp = kit.groups.get(key);
    if (grp) grp.visible = on;
  };
  const apply = () => {
    const bands = openLevel === "educity-1" ? 1 : openLevel === "educity-2" ? 2 : BAND_COUNT;
    kit.setBands("shell", bands);
    // Windows in front of furnished rooms: clear glass with the interior on, an interior-mapped stand-in without.
    kit.setBands("standin", interiorOn ? 0 : bands);
    kit.setBands("clear", interiorOn ? bands : 0);
    setVis("caps.A", openLevel === "educity-1");
    setVis("caps.B", openLevel === "educity-2");
    setVis("f1", interiorOn);
    setVis("f2", interiorOn && openLevel !== "educity-1");
    setVis("f1.ceil", openLevel !== "educity-1");
    setVis("f2.ceil", openLevel === null);
    setVis("upper", interiorOn && openLevel === null);
    inside.setPickLevel(openLevel === "educity-1" ? "f1" : openLevel === "educity-2" ? "f2" : null);
    for (const l of labels) {
      if (l.userData.interior) l.userData.hidden = l.userData.level !== openLevel;
    }
    nameLabel.userData.hidden = openLevel !== null;
    updateInteriorLight();
    ctx.invalidate();
  };

  // ── Interior light: designed for INTERIOR_EXPOSURE; rescaled while the dollhouse is open ──
  let sunElevation = ctx.lighting().sunElevationDeg;
  let lateNight = edInteriorLevel(ctx.lighting().iso);
  // The engine's interior environment is a 3500 K office; EduCity's LEDs are 4000 K and photographs of
  // the building are white-balanced for them — shift the environment to read neutral (≈5000 K/3500 K).
  const kOut = kelvinToLinear(5000);
  const k35 = kelvinToLinear(3500);
  const tint = new THREE.Color(kOut.r / k35.r, kOut.g / k35.g, kOut.b / k35.b);
  function updateInteriorLight() {
    const k = openLevel === null ? 1 : interiorScale(sunElevation);
    // Open: the rooms read as lit by their own (4000 K) lights, the low sun only grazes them.
    light.uEdSun.value = openLevel === null ? 1 : 0.15;
    light.uEdEnv.value.set(tint.r * k, tint.g * k, tint.b * k);
    for (const e of inside.emissives) e.material.emissiveIntensity = e.base * k * lateNight;
  }

  // ── Lighting (time of day) ──
  const setLighting = (s: LightingState) => {
    night.value = s.night;
    sunElevation = s.sunElevationDeg;
    lateNight = edInteriorLevel(s.iso);
    updateInteriorLight();
    winUniforms.uEdLit.value = edLitFraction(s.iso, s.night);
    lights.emissiveIntensity = LUMINANCE.bollard * 0.6 * s.night;
    signsExt.emissiveIntensity = LUMINANCE.signLit * 0.2 * s.night;
    inside.setLighting(s);
    ctx.invalidate();
  };

  const nav = buildNav();
  apply();

  const edu: BuildingModule = {
    id: "educity",
    building: "educity",
    root,
    shell: g("shell"),
    levels: [
      { id: "educity-1", name: "Floor 1", y: Y0, group: g("f1") },
      { id: "educity-2", name: "Floor 2", y: Y0 + 5, group: g("f2") },
    ],
    labels,
    pickables: inside.pickables,
    targets: nav.targets,
    views: nav.views,
    colliders: nav.colliders,
    walkAreas: nav.walkAreas,
    connectors: nav.connectors,
    routeLegs: nav.routeLegs,
    claims: [731925812, 1212766524, 1212766525, 1212766526],
    ready: Promise.all([atlas.ready, inside.ready]).then(() => {
      ctx.invalidate();
      return triangles;
    }),
    setOpen(level) {
      openLevel = level === "educity-1" || level === "educity-2" ? level : null;
      apply();
    },
    setInterior(on) {
      interiorOn = on;
      apply();
    },
    setLighting,
    dispose() {
      atlas.texture.dispose();
      inside.dispose();
      for (const m of kit.materials) m.dispose();
    },
  };
  return edu;
}

/**
 * Interior light scale while the dollhouse is open: the engine then exposes for
 * a blend of exterior and interior (55 % interior, in log space), so the
 * interior is rescaled to read as it would at INTERIOR_EXPOSURE — brighter
 * by day (it is open to the sky), calmer at night (it still glows).
 */
export function interiorScale(sunElevationDeg: number): number {
  const ext = exposureFor(sunElevationDeg);
  return Math.min(2.2, Math.max(0.3, Math.pow(INTERIOR_EXPOSURE / ext, 0.45)));
}

/** Plan point of a facade coordinate (exported for tests). */
export function facadePoint(f: Facade, s: number, d: number): V2 {
  const p = fp(FACADES[f], s, 0, d);
  return [p[0], p[2]];
}
