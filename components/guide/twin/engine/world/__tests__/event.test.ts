/**
 * three (and its addons) are ESM; this Jest setup runs CommonJS. Node 24 can
 * require() ES modules natively, so the mocks hand over the real modules
 * (process.getBuiltinModule bypasses Jest's registry) — real three.js.
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));
jest.mock("three/addons/utils/BufferGeometryUtils.js", () => nodeRequire()("three/addons/utils/BufferGeometryUtils.js"));
jest.mock("three/addons/renderers/CSS2DRenderer.js", () => nodeRequire()("three/addons/renderers/CSS2DRenderer.js"));
jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));

import fs from "node:fs";
import path from "node:path";
import type { CampusData, StreetsData } from "../../data/campus";
import type { V2 } from "../../types";
import { FACES, ITEMS, featherEdges, featherSailGeometry, fromDoor, itemsInside, regionUV, type Item } from "../event";
import { pointInRing } from "../../util";

const DATA = path.join(process.cwd(), "public/assets/guide/3d/data");
const campus = JSON.parse(fs.readFileSync(path.join(DATA, "campus.json"), "utf8")) as CampusData;
const streets = JSON.parse(fs.readFileSync(path.join(DATA, "streets.json"), "utf8")) as StreetsData;

const pointsOf = (it: Item): V2[] => (it.kind === "lineLight" ? [it.from, it.to] : it.kind === "stanchions" ? it.points : [it.at]);

describe("event dressing placements", () => {
  it("uses unique ids", () => {
    const ids = ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("stands outside every building except the EduCity lobby sign and under Joki's street canopy", () => {
    // OSM draws Joki's outline round the deep street canopy; the closed door's belts and totem stand under it.
    const inside = itemsInside(ITEMS, campus.buildings);
    expect(inside.sort()).toEqual(["edu-reg-hang", "joki-belts", "joki-totem"]);
  });

  it("never stands on a carriageway", () => {
    const roads = streets.areas.filter((a) => a.part === "carriageway");
    const onRoad = ITEMS.filter((it) => pointsOf(it).some((p) => roads.some((r) => pointInRing(p, r.poly)))).map((i) => i.id);
    expect(onRoad).toEqual([]);
  });

  it("keeps the supercar display and the door corridor in BioCity's recess clear", () => {
    // SPEC §5.3 car footprints (A, B) and the door corridor from the mouth to the canopy.
    const carA: V2[] = [
      [-26.25, -22.1],
      [-27.88, -20.97],
      [-25.09, -16.97],
      [-23.47, -18.11],
    ];
    const carB: V2[] = [
      [-32.66, -14.69],
      [-33.76, -13.04],
      [-29.71, -10.34],
      [-28.61, -11.99],
    ];
    const totem = ITEMS.find((i) => i.id === "bio-recess-totem");
    expect(totem && "at" in totem).toBe(true);
    if (!totem || !("at" in totem)) return;
    for (const car of [carA, carB]) expect(pointInRing(totem.at, car)).toBe(false);
    const dist = (a: V2, b: V2) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    expect(Math.min(...carA.map((c) => dist(c, totem.at)))).toBeGreaterThan(1.2);
  });

  it("places door-relative items in front of the door", () => {
    const p = fromDoor([0, 0], 90, 2, 1);
    // Facing east: 2 m east, 1 m to the right (south, +z).
    expect(p[0]).toBeCloseTo(2, 6);
    expect(p[1]).toBeCloseTo(1, 6);
  });

  it("gives every totem face a design", () => {
    for (const it of ITEMS) if (it.kind === "totem") expect(FACES[it.front] && FACES[it.back]).toBeTruthy();
  });
});

describe("event prints and sails", () => {
  it("maps atlas regions with v = 0 at the canvas bottom", () => {
    const uv = regionUV({ x: 0, y: 0, w: 1024, h: 512 }, 2048);
    expect(uv).toEqual({ u0: 0, u1: 0.5, v0: 0.75, v1: 1 });
  });

  it("shapes a feather sail: pole edge straight at x = 0, trailing edge bulging, one tip", () => {
    const e = featherEdges(0.8, 3.3, 0.75);
    expect(e.lead(0)).toEqual([0, 0.75]);
    expect(e.lead(0.5)[0]).toBe(0);
    expect(e.trail(1)[0]).toBeCloseTo(e.lead(1)[0], 6);
    expect(e.trail(1)[1]).toBeCloseTo(e.lead(1)[1], 6);
    const widest = Math.max(...Array.from({ length: 21 }, (_, i) => e.trail(i / 20)[0]));
    expect(widest).toBeGreaterThan(0.75);
    expect(widest).toBeLessThan(0.9);
  });

  it("builds a two-layer sail with flex attributes and UVs in 0..1", () => {
    const g = featherSailGeometry();
    const uv = g.getAttribute("uv");
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeGreaterThanOrEqual(-1e-6);
      expect(uv.getX(i)).toBeLessThanOrEqual(1 + 1e-6);
      expect(uv.getY(i)).toBeGreaterThanOrEqual(-1e-6);
      expect(uv.getY(i)).toBeLessThanOrEqual(1 + 1e-6);
    }
    expect(g.getAttribute("aFlex").count).toBe(g.getAttribute("position").count);
    // Front and back layers: half the normals face +z, half −z.
    const n = g.getAttribute("normal");
    let front = 0;
    for (let i = 0; i < n.count; i++) if (n.getZ(i) > 0) front++;
    expect(front).toBe(n.count / 2);
  });
});

describe("placements report", () => {
  it("writes positions for QA plots", () => {
    const out = process.env.EVENT_PLACEMENTS_OUT;
    if (!out) return;
    const rows = ITEMS.flatMap((it) =>
      pointsOf(it).map((p) => ({ at: p, label: it.id, facing: "facing" in it ? it.facing : undefined, color: it.kind === "flag" ? "#c0f" : it.kind === "totem" ? "#40c" : "#0aa", r: it.kind === "decal" ? it.size / 2 : 0.35 })),
    );
    fs.writeFileSync(out, JSON.stringify(rows));
  });
});
