/**
 * three (and its addons) are ESM; this Jest setup runs CommonJS. Node 24 can
 * require() ES modules natively, so the mocks below hand over the real
 * modules through Node's own loader (process.getBuiltinModule bypasses
 * Jest's module registry) — the tests run against real three.js.
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
import type { V2 } from "../../types";
import type { CampusData, Lod2Data } from "../../data/campus";
import { insetRing, makeSolid, pilasterCentres, planeThrough, segmentCrossing, SolidIndex, storeyScale, wallSpans } from "../context/envelope";
import { assignRoofParts } from "../context/parts";
import { doorOnSolids } from "../context/details";
import { bearingDiff, recipeFor, spanFacing, type BuildingInfo } from "../context/recipes";
import { FAMILIES, renderFamily, wallTint } from "../context/styles";
import { FacadeBuilder, MeshBuilder, capRing } from "../context/kit";
import { ringArea } from "../../util";

const DATA = path.join(process.cwd(), "public/assets/guide/3d/data");
const campus = JSON.parse(fs.readFileSync(path.join(DATA, "campus.json"), "utf8")) as CampusData;
const lod2 = JSON.parse(fs.readFileSync(path.join(DATA, "lod2.json"), "utf8")) as Lod2Data;

const square = (x0: number, z0: number, s: number): V2[] => [
  [x0, z0],
  [x0, z0 + s],
  [x0 + s, z0 + s],
  [x0 + s, z0],
];

describe("context envelope", () => {
  it("orients solids counter-clockwise and fits sloped roof planes", () => {
    const cw: V2[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const s = makeSolid("a", "b", cw, -0.3, 12);
    expect(s).not.toBeNull();
    expect(ringArea(s!.ring)).toBeGreaterThan(0);
    expect(s!.flatY).toBe(12);
    // A plane rising 1 m per 10 m in x.
    const plane = planeThrough(
      [
        [0, 0],
        [10, 0],
        [10, 5],
        [0, 5],
      ],
      [20, 21, 21, 20],
    );
    expect(plane(5, 2)).toBeCloseTo(20.5, 6);
    expect(plane(0, 4)).toBeCloseTo(20, 6);
    const sloped = makeSolid("s", "b", square(0, 0, 10), 0, { ys: [20, 20, 21, 21] });
    expect(sloped!.flatY).toBeNull();
  });

  it("drops degenerate rings", () => {
    expect(
      makeSolid("x", "b", [
        [0, 0],
        [1, 0],
        [2, 0],
      ], 0, 3),
    ).toBeNull();
  });

  it("finds proper crossings only", () => {
    expect(segmentCrossing([0, 0], [10, 0], [5, -1], [5, 1])).toBeCloseTo(0.5, 6);
    expect(segmentCrossing([0, 0], [10, 0], [0, 1], [10, 1])).toBeNull();
    expect(segmentCrossing([0, 0], [10, 0], [12, -1], [12, 1])).toBeNull();
  });

  it("hides walls behind a taller neighbour and starts walls above a lower roof", () => {
    // Two 10 m cubes side by side: A (roof 20) west of B (roof 10).
    const a = makeSolid("A", "x", square(0, 0, 10), 0, 20)!;
    const b = makeSolid("B", "x", square(10, 0, 10), 0, 10)!;
    const index = new SolidIndex([a, b]);
    const spansA = wallSpans(a, index);
    const spansB = wallSpans(b, index);
    // A's east wall (x = 10) is covered by B up to 10.
    const eastA = spansA.filter((s) => Math.abs(s.a[0] - 10) < 1e-6 && Math.abs(s.b[0] - 10) < 1e-6);
    expect(eastA).toHaveLength(1);
    expect(eastA[0].coverSolid).toBe(b);
    expect(eastA[0].cover0).toBeCloseTo(10, 6);
    // B's west wall is covered by taller A.
    const westB = spansB.filter((s) => Math.abs(s.a[0] - 10) < 1e-6 && Math.abs(s.b[0] - 10) < 1e-6);
    expect(westB).toHaveLength(1);
    expect(westB[0].cover0).toBeCloseTo(20, 6);
    // Open walls report no cover.
    expect(spansA.filter((s) => s.coverSolid === null).length).toBe(3);
  });

  it("splits a wall where a neighbour covers only part of it", () => {
    // A long block with a short lower block against half of its south face.
    const a = makeSolid("A", "x", [
      [0, 0],
      [0, 10],
      [20, 10],
      [20, 0],
    ], 0, 20)!;
    const b = makeSolid("B", "x", [
      [5, 10],
      [5, 16],
      [12, 16],
      [12, 10],
    ], 0, 8)!;
    const spans = wallSpans(a, new SolidIndex([a, b]));
    // A's south face (z = 10) splits into 0–5 open, 5–12 covered at 8, 12–20 open.
    const south = spans.filter((s) => Math.abs(s.a[1] - 10) < 1e-6 && Math.abs(s.b[1] - 10) < 1e-6);
    expect(south).toHaveLength(3);
    const covered = south.filter((s) => s.coverSolid === b);
    expect(covered).toHaveLength(1);
    const len = Math.hypot(covered[0].b[0] - covered[0].a[0], covered[0].b[1] - covered[0].a[1]);
    expect(len).toBeCloseTo(7, 4);
    // u runs continuously round the ring.
    for (const s of spans) expect(s.u1).toBeGreaterThan(s.u0);
  });

  it("insets rings by mitred offsets", () => {
    const inner = insetRing(makeSolid("A", "x", square(0, 0, 10), 0, 3)!.ring, 1);
    const xs = inner.map((p) => p[0]).sort((p, q) => p - q);
    expect(xs[0]).toBeCloseTo(1, 6);
    expect(xs[3]).toBeCloseTo(9, 6);
  });

  it("fits the storey grid to the real storeys within ±25 %", () => {
    // 7 storeys of 3.6 + a 4.2 ground storey + 0.5 parapet allowance over 26.8 m.
    expect(storeyScale(26.8, 7, 3.6, 4.2, 0.5)).toBeCloseTo((4.2 + 6 * 3.6 + 0.5) / 26.8, 6);
    expect(storeyScale(10, 12, 3.6)).toBe(1.25);
    expect(storeyScale(30, undefined, 3.6)).toBe(1);
  });
});

describe("context data and recipes", () => {
  const info = (over: Partial<BuildingInfo> = {}): BuildingInfo => ({
    b: campus.buildings[0],
    ground: 0,
    roofY: 20,
    glassParts: [],
    colouredParts: [],
    overhangs: [],
    ...over,
  });

  it("covers every non-hero campus building with a known family", () => {
    for (const b of campus.buildings) {
      if (b.role === "biocity" || b.role === "joki" || b.role === "educity") continue;
      const r = recipeFor(b, info({ b }));
      expect(FAMILIES[r.family]).toBeDefined();
    }
  });

  it("gives the hero-adjacent buildings their bespoke families", () => {
    const byRole = (role: string) => campus.buildings.find((b) => b.role === role)!;
    expect(recipeFor(byRole("datacity"), info()).family).toBe("data");
    expect(recipeFor(byRole("parkcity"), info()).family).toBe("park");
    expect(recipeFor(byRole("ict-city"), info()).family).toBe("ictRed");
    expect(recipeFor(byRole("electrocity"), info()).label).toBe("Electrocity");
  });

  it("collapses families onto tinted low-tier families that keep the wall colour", () => {
    const fam = FAMILIES.data;
    const low = renderFamily("data", "low");
    expect(low.key).toBe("lowBrick");
    const tint = wallTint(fam, low);
    // Wanted colour = tint × rendered colour (linear).
    expect(tint.every((c) => c > 0 && c <= 4)).toBe(true);
    expect(renderFamily("data", "ultra").key).toBe("data");
  });

  it("measures facings as compass bearings", () => {
    const s = makeSolid("A", "x", square(0, 0, 10), 0, 10)!;
    const spans = wallSpans(s, new SolidIndex([s]));
    const facings = spans.map(spanFacing).map((f) => Math.round(f)).sort((p, q) => p - q);
    expect(facings).toEqual([0, 90, 180, 270]);
    expect(bearingDiff(350, 10)).toBeCloseTo(20, 6);
  });

  it("builds walls from the LOD2 roofs of the real context buildings", () => {
    // DataCity's record holds Joki's hall and tower (claimed): they must hide DataCity's walls, not be built.
    const rec = lod2.buildings.find((r) => r.id === "lod2-103454371S")!;
    const solids = rec.roofs
      .map((roof, k) => makeSolid(`d${k}`, roof.claimedBy ?? "datacity", roof.ring, rec.baseY, roof.ys ? { ys: roof.ys } : (roof.y ?? rec.roofY), { ghost: !!roof.claimedBy }))
      .filter((s): s is NonNullable<typeof s> => !!s);
    const index = new SolidIndex(solids);
    let covered = 0;
    let total = 0;
    for (const s of solids.filter((x) => !x.ghost)) {
      for (const span of wallSpans(s, index)) {
        total++;
        if (span.coverSolid?.ghost) covered++;
      }
    }
    expect(total).toBeGreaterThan(100);
    expect(covered).toBeGreaterThan(0);
  });
});

describe("context parts, pilasters and doors", () => {
  it("splits LOD2 records that span several OSM buildings", () => {
    const heroes = new Set(["biocity", "joki", "educity"]);
    // As the module: no heroes, no raised roofs on posts (canopies are built separately).
    const mine = campus.buildings.filter((b) => !(b.role && heroes.has(b.role)) && b.baseY === undefined && !((b.minHeight ?? 0) > 0) && b.use !== "roof");
    const byId = new Map(lod2.buildings.map((r) => [r.id, r]));
    const recsOf = new Map(mine.map((b) => [b.id, (b.lod2 ?? []).map((id) => byId.get(id)!).filter(Boolean)]));
    const { partsOf, splitRecs } = assignRoofParts(mine, mine, recsOf);
    // Intelligate II's record also holds Intelligate I and the hotel tower: they get their own parts.
    const shared = lod2.buildings.find((r) => r.id === "lod2-102217649H")!;
    expect(splitRecs.has(shared)).toBe(true);
    const of = (osmId: number) => partsOf.get(campus.buildings.find((b) => b.osmId === osmId)!.id) ?? [];
    expect(of(9166253).some((p) => p.rec === shared)).toBe(true); // Intelligate I
    expect(of(731925814).some((p) => p.rec === shared && (p.roof.y ?? 0) > 39)).toBe(true); // the hotel tower
    expect(of(365954554).every((p) => p.rec === shared)).toBe(true); // Intelligate II keeps the rest
    // A building with records of its own never receives parts of another building's record.
    for (const b of mine) {
      const own = new Set(recsOf.get(b.id) ?? []);
      if (!own.size) continue;
      expect((partsOf.get(b.id) ?? []).every((p) => own.has(p.rec))).toBe(true);
    }
    // Every unclaimed part of an unsplit record stays with its building.
    const data = campus.buildings.find((b) => b.role === "datacity")!;
    const rec = byId.get(data.lod2![0])!;
    expect(of(data.osmId).length).toBe(rec.roofs.filter((r) => !r.claimedBy).length);
  });

  it("spaces pilasters on the wall line's own grid, with corner piers", () => {
    const a = pilasterCentres({ a: [0, 0], b: [20, 0], atStart: true, atEnd: true }, 5.4, 0.9);
    expect(a.map((x) => Math.round(x * 100) / 100)).toEqual([0.45, 5.4, 10.8, 16.2, 19.55]);
    // A collinear continuation keeps the rhythm (u = 21.6, 27 on the same 5.4 m grid).
    const b = pilasterCentres({ a: [20, 0], b: [30, 0], atStart: false, atEnd: true }, 5.4, 0.9);
    expect(b.map((x) => Math.round(x * 100) / 100)).toEqual([1.6, 7, 9.55]);
    expect(pilasterCentres({ a: [0, 0], b: [1, 0], atStart: true, atEnd: true }, 5.4, 0.9)).toEqual([]);
  });

  it("puts doors on open walls of the building's own solids", () => {
    // Two blocks side by side: the wall between them is covered, the street wall (z = 0) is open.
    const left = makeSolid("L", "x", square(0, 0, 10), 0, 12)!;
    const right = makeSolid("R", "x", square(10, 0, 10), 0, 12)!;
    const index = new SolidIndex([left, right]);
    const door = doorOnSolids([10.2, -1], [left, right], index, 0)!;
    expect(door).not.toBeNull();
    expect(door.p[1]).toBeCloseTo(0, 6);
    expect(door.n[1]).toBeCloseTo(-1, 6);
    // Next to the shared wall but inside: the covered wall (x = 10, facing ±x) is never chosen.
    const inner = doorOnSolids([10.1, 5], [left, right], index, 0)!;
    expect(Math.abs(inner.n[0])).toBeLessThan(0.01);
  });
});

describe("context geometry kit", () => {
  it("writes the facade attributes the facade shader reads", () => {
    const fb = new FacadeBuilder();
    const v = (x: number, y: number) => ({ x, y, z: 0, u: x, v: y, vt: y, top: 10, ground: 0 });
    fb.quad([v(0, 0), v(5, 0), v(5, 10), v(0, 10)], [0, -1], 0.5, [1, 1, 1]);
    const g = fb.build()!;
    expect(g.getAttribute("facade").itemSize).toBe(4);
    expect(g.getAttribute("facadeGround").itemSize).toBe(1);
    expect(g.getAttribute("ctxTint").itemSize).toBe(3);
    expect(g.index!.count).toBe(6);
  });

  it("caps rings facing up (and down)", () => {
    const up = new MeshBuilder();
    capRing(up, square(0, 0, 4), 3, [1, 1, 1], false);
    const g = up.build()!;
    g.computeVertexNormals();
    const n = g.getAttribute("normal");
    for (let i = 0; i < n.count; i++) expect(n.getY(i)).toBeGreaterThan(0.99);
    const down = new MeshBuilder();
    capRing(down, square(0, 0, 4), 3, [1, 1, 1], true);
    const gd = down.build()!;
    gd.computeVertexNormals();
    const nd = gd.getAttribute("normal");
    for (let i = 0; i < nd.count; i++) expect(nd.getY(i)).toBeLessThan(-0.99);
  });
});

describe("Kalevansilta (context/bridges)", () => {
  // Imported lazily: bridges.ts pulls in the sky module (LUMINANCE).
  const { stairFlights, kalevansilta } = jest.requireActual("../context/bridges") as typeof import("../context/bridges");

  it("splits a stair into equal flights with landings, comfortable risers and the exact rise", () => {
    // Platform stair: −4.72 → 4.30 over 19.6 m in three flights with 1.5 m landings.
    const f = stairFlights(19.6, 9.02, 3, 1.5);
    expect(f).toHaveLength(3);
    const risers = f.reduce((s, x) => s + x.risers, 0);
    expect(9.02 / risers).toBeLessThan(0.18);
    expect(f[f.length - 1].y1).toBeCloseTo(9.02, 6);
    expect(f[f.length - 1].s1).toBeCloseTo(19.6, 6);
    for (let i = 1; i < f.length; i++) {
      expect(f[i].s0 - f[i - 1].s1).toBeCloseTo(1.5, 6);
      expect(f[i].y0).toBeCloseTo(f[i - 1].y1, 6);
    }
    // Goings between 0.28 and 0.45 m.
    for (const x of f) {
      const going = (x.s1 - x.s0) / x.risers;
      expect(going).toBeGreaterThan(0.28);
      expect(going).toBeLessThan(0.45);
    }
    // Street stair with a head landing: the last flight stops `head` metres short of the top.
    const g = stairFlights(13.7, 4.98, 2, 1.6, 1.0);
    expect(g[1].s1).toBeCloseTo(13.7 - 1.0, 6);
    expect(g[1].y1).toBeCloseTo(4.98, 6);
  });

  it("builds the bridge once, with its stairs, colliders and see-through glazing", () => {
    const mb = () => new MeshBuilder();
    const kit = {
      tier: "high" as const,
      concrete: mb(),
      paint: mb(),
      metal: mb(),
      glazing: mb(),
      clearGlass: mb(),
      emissive: mb(),
      pools: mb(),
      roofs: mb(),
      trims: mb(),
      heightAt: () => -2,
      facadeFor: () => new FacadeBuilder(),
      calibrate: () => [1, 1, 1] as [number, number, number],
      paintCap: () => {},
      emissiveCap: () => {},
      solar: () => {},
    };
    const colliders = kalevansilta(kit);
    expect(colliders.length).toBeGreaterThan(2);
    expect(kit.clearGlass.vertexCount).toBeGreaterThan(100);
    // Opaque glazing is not used for the bridge (its sides must be see-through).
    expect(kit.glazing.vertexCount).toBe(0);
    const paint = kit.paint.build();
    expect(paint).not.toBeNull();
    // The roof sits ≈ 3.4 m over the 4.3 m deck (laser roof 7.5–8.9 m).
    const bb = paint!.boundingBox!;
    expect(bb.max.y).toBeGreaterThan(7.5);
    expect(bb.max.y).toBeLessThan(8.2);
  });
});
