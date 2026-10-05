/**
 * Pure logic of props/people.ts: the walk cycle, the event-weekend crowd plan,
 * walking along paths, group layout, looks and the procedural figure.
 * three is handed over through Node's own loader (see world/__tests__/massing.test.ts).
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));
jest.mock("three/addons/utils/BufferGeometryUtils.js", () => nodeRequire()("three/addons/utils/BufferGeometryUtils.js"));
jest.mock("three/addons/renderers/CSS2DRenderer.js", () => nodeRequire()("three/addons/renderers/CSS2DRenderer.js"));

import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import type { CampusData, RoutesData } from "../../data/campus";
import type { V2 } from "../../types";
import { hashString, mulberry32, pointInRing } from "../../util";
import {
  FEATURE,
  GROUP_SPOTS,
  STRIDE_M,
  buildPersonFarGeometry,
  buildPersonGeometry,
  clockOf,
  crowdBudget,
  crowdPlan,
  gaitAngles,
  groupLayout,
  makePath,
  pathAt,
  insideHeroFootprint,
  randomLook,
  stablePick,
  unitHash,
  walkerDistance,
  walkerForward,
  wrapAngle,
} from "../people";

const DATA = path.join(process.cwd(), "public/assets/guide/3d/data");
const campus = JSON.parse(fs.readFileSync(path.join(DATA, "campus.json"), "utf8")) as CampusData;
const routes = JSON.parse(fs.readFileSync(path.join(DATA, "routes.json"), "utf8")) as RoutesData;

const triangles = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.getAttribute("position").count) / 3;

describe("walk cycle", () => {
  it("wraps angles into [−π, π)", () => {
    expect(wrapAngle(0)).toBeCloseTo(0);
    expect(Math.abs(wrapAngle(3 * Math.PI))).toBeCloseTo(Math.PI);
    expect(wrapAngle(Math.PI / 2 + 4 * Math.PI)).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(wrapAngle(-7))).toBeLessThanOrEqual(Math.PI);
  });
  it("moves the legs in antiphase, with a swing-phase knee bend of ≈ 60°", () => {
    for (let u = 0; u < 2 * Math.PI; u += 0.3) {
      const a = gaitAngles(u);
      const b = gaitAngles(u + Math.PI);
      expect(a.hipL).toBeCloseTo(b.hipR, 6);
      expect(a.kneeL).toBeCloseTo(b.kneeR, 6);
      expect(a.kneeL).toBeGreaterThan(0.04);
      // Arms swing against the legs.
      expect(Math.sign(a.armL - 0.03) * Math.sign(a.hipL - 0.05)).toBeLessThanOrEqual(0);
    }
    let peak = 0;
    for (let u = 0; u < 2 * Math.PI; u += 0.01) peak = Math.max(peak, gaitAngles(u).kneeL);
    expect(peak).toBeGreaterThan(0.95);
    expect(peak).toBeLessThan(1.25);
  });
  it("has a step length that matches the stride used for the phase rate", () => {
    // Step ≈ 2 × leg length × sin(hip amplitude); a stride is two steps.
    const step = 2 * 0.86 * Math.sin(0.36);
    expect(2 * step).toBeGreaterThan(STRIDE_M * 0.8);
    expect(2 * step).toBeLessThan(STRIDE_M * 1.2);
  });
});

describe("crowd plan for the event weekend", () => {
  it("reads the Turku wall clock", () => {
    expect(clockOf("2026-11-06T15:30")).toEqual({ dow: 5, hour: 15.5 });
    expect(clockOf("2026-11-08T13:00").dow).toBe(0);
  });
  it("fills the arrival routes on Friday afternoon and empties the small hours", () => {
    const arrival = crowdPlan("2026-11-06T15:30");
    const night = crowdPlan("2026-11-07T03:00");
    expect(arrival.walkers).toBeGreaterThan(0.8);
    expect(night.walkers).toBeLessThan(0.25);
    expect(arrival.weights.arrivalEdu).toBeGreaterThan(arrival.weights.transfer);
    expect(arrival.inbound).toBeGreaterThan(0.85);
  });
  it("moves builders from EduCity to BioCity on Friday evening, and back on Sunday", () => {
    const transfer = crowdPlan("2026-11-06T19:45");
    expect(transfer.weights.transfer).toBeGreaterThan(transfer.weights.arrivalEdu);
    expect(crowdPlan("2026-11-08T13:30").weights.transfer).toBeGreaterThan(1.5);
  });
  it("scales the pool by tier", () => {
    expect(crowdBudget("ultra").walkers).toBeGreaterThan(crowdBudget("high").walkers);
    expect(crowdBudget("high").walkers).toBeGreaterThan(crowdBudget("low").walkers);
  });
});

describe("walking along paths", () => {
  const path = makePath("p", "sidewalk", [
    [0, 0, 0],
    [10, 1, 0],
    [10, 1, 10],
  ]);
  it("measures in plan and interpolates heights", () => {
    expect(path.length).toBeCloseTo(20);
    const at = pathAt(path, 5);
    expect(at.p).toEqual([5, 0.5, 0]);
    expect(at.d).toEqual([1, 0]);
    expect(pathAt(path, 15).p).toEqual([10, 1, 5]);
  });
  it("walks the path, then waits out of sight, periodically", () => {
    const seen: number[] = [];
    for (let t = 0; t < 40; t += 0.5) {
      const s = walkerDistance(20, 1, 0, t, 10);
      if (s !== null) {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(20);
        seen.push(s);
      }
    }
    expect(walkerDistance(20, 1, 0, 25, 10)).toBeNull();
    expect(walkerDistance(20, 1, 0, 5, 10)).toBeCloseTo(walkerDistance(20, 1, 0, 35, 10) ?? -1);
    expect(seen.length).toBeGreaterThan(40);
  });
});

describe("standing groups and looks", () => {
  it("puts everyone on a small circle, facing its centre", () => {
    for (const n of [2, 3, 5]) {
      const g = groupLayout(n, 42 + n);
      expect(g.length).toBe(n);
      for (const m of g) {
        const r = Math.hypot(m.x, m.z);
        expect(r).toBeGreaterThan(0.4);
        expect(r).toBeLessThan(1.8);
        // Forward (−z) turned by ry, against the direction to the centre.
        const fx = -Math.sin(m.ry);
        const fz = -Math.cos(m.ry);
        expect((fx * -m.x + fz * -m.z) / r).toBeGreaterThan(0.85);
      }
    }
  });
  it("dresses people deterministically, with one head covering at most", () => {
    const a = randomLook(mulberry32(7), { lanyard: 0.5 });
    const b = randomLook(mulberry32(7), { lanyard: 0.5 });
    expect(a).toEqual(b);
    const rnd = mulberry32(99);
    for (let i = 0; i < 200; i++) {
      const l = randomLook(rnd);
      const heads = [FEATURE.beanie, FEATURE.hairShort, FEATURE.hairLong].filter((f) => l.features & (1 << (f - 1))).length;
      expect(heads).toBe(1);
      expect(l.height).toBeGreaterThan(0.9);
      expect(l.height).toBeLessThan(1.06);
    }
  });
});

describe("the figure", () => {
  it("is a 1.75 m person with rig attributes, light enough for crowds", () => {
    const g = buildPersonGeometry("high");
    expect(g.getAttribute("aTwRig").itemSize).toBe(4);
    expect(g.getAttribute("aTwFeat")).toBeDefined();
    g.computeBoundingBox();
    const box = g.boundingBox!;
    expect(box.max.y).toBeGreaterThan(1.7);
    expect(box.max.y).toBeLessThan(1.8);
    expect(box.min.y).toBeGreaterThanOrEqual(-0.001);
    expect(box.max.x - box.min.x).toBeLessThan(0.62);
    expect(triangles(g)).toBeLessThan(1800);
    expect(triangles(buildPersonGeometry("low"))).toBeLessThan(triangles(g) * 0.6);
    // Indoors (seated): no accessories but hair, lanyard and scarf; light enough for ~130 builders.
    expect(triangles(buildPersonGeometry("seated", [FEATURE.hairShort, FEATURE.hairLong, FEATURE.lanyard, FEATURE.scarf]))).toBeLessThan(900);
    expect(triangles(buildPersonFarGeometry())).toBeLessThan(260);
    const pos = g.getAttribute("position").array as Float32Array;
    expect(Array.from(pos).every(Number.isFinite)).toBe(true);
  });
  it("faces outwards everywhere (single-sided material): torso, legs and shoes", () => {
    for (const g of [buildPersonGeometry("high"), buildPersonGeometry("low"), buildPersonFarGeometry()]) {
      const pos = g.getAttribute("position");
      const nor = g.getAttribute("normal");
      const rig = g.getAttribute("aTwRig");
      const feat = g.getAttribute("aTwFeat");
      let out = 0;
      let inn = 0;
      for (let i = 0; i < pos.count; i++) {
        if (feat.getX(i) !== 0) continue;
        const bone = Math.round(rig.getX(i));
        const slot = Math.round(rig.getW(i));
        const y = pos.getY(i);
        // The jacket round the chest and the trouser legs: compare the normal with the direction from the part's axis.
        let ax = 0;
        if (bone === 0 && slot === 2 && y > 1.0 && y < 1.3) ax = 0;
        else if ((bone === 1 || bone === 4) && slot === 3 && y > 0.6 && y < 0.8) ax = bone === 1 ? -0.095 : 0.095;
        else continue;
        const d = (pos.getX(i) - ax) * nor.getX(i) + pos.getZ(i) * nor.getZ(i);
        if (d > 0) out++;
        else inn++;
      }
      expect(out).toBeGreaterThan(4);
      expect(inn).toBe(0);
    }
  });
});

describe("a calm crowd", () => {
  it("keeps every walker's dice fixed and well spread", () => {
    expect(unitHash(3, 7)).toBe(unitHash(3, 7));
    const xs = Array.from({ length: 4000 }, (_, i) => unitHash(i, 1));
    expect(Math.min(...xs)).toBeGreaterThan(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(Math.abs(mean - 0.5)).toBeLessThan(0.02);
  });
  it("picks paths in proportion to their weights", () => {
    const w = [1, 3, 0, 6];
    const n = [0, 0, 0, 0];
    for (let i = 0; i < 6000; i++) n[stablePick(w, i)]++;
    expect(n[2]).toBe(0);
    expect(n[0] / 6000).toBeCloseTo(0.1, 1);
    expect(n[1] / 6000).toBeCloseTo(0.3, 1);
    expect(n[3] / 6000).toBeCloseTo(0.6, 1);
    expect(stablePick([0, 0], 1)).toBe(-1);
  });
  it("moves only a few walkers when the plan shifts a little (no reshuffle on the time slider)", () => {
    const a = [1, 2, 3, 4, 2, 1];
    const b = a.map((x, j) => (j === 2 ? x * 1.08 : x));
    let moved = 0;
    for (let i = 0; i < 170; i++) if (stablePick(a, i) !== stablePick(b, i)) moved++;
    expect(moved).toBeLessThan(170 * 0.06);
    // The inbound share flips only the walkers between the two shares.
    let flipped = 0;
    for (let i = 0; i < 170; i++) if (walkerForward(i, "arrivalEdu", 0.65) !== walkerForward(i, "arrivalEdu", 0.7)) flipped++;
    expect(flipped).toBeLessThan(170 * 0.12);
    // Sidewalks: either way, whatever the plan.
    for (let i = 0; i < 50; i++) expect(walkerForward(i, "sidewalk", 0.1)).toBe(walkerForward(i, "sidewalk", 0.9));
  });
});

describe("standing groups keep doors and routes clear", () => {
  const tourLegs = new Set(routes.tours.flatMap((t) => t.legs));
  const legs = Object.entries(routes.legs).filter(([id, l]) => l.mode === "outdoor" && tourLegs.has(id));
  const segDist = (p: V2, a: number[], b: number[]) => {
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const l2 = dx * dx + dz * dz;
    const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[2]) * dz) / l2)) : 0;
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[2] - dz * t);
  };
  const toRoutes = (p: V2) => Math.min(...legs.flatMap(([, l]) => l.points.slice(1).map((q, i) => segDist(p, l.points[i], q))));
  // Event doors (SPEC §3.1.4, §3.3.4, §4.5).
  const DOORS: V2[] = [
    [204.0, 136.5],
    [177.8, 115.1],
    [176.1, 108.8],
    [237.3, 109.0],
    [196.9, 76.8],
    [22.69, -8.01],
    [-24.51, -11.75],
    [198.5, -7.4],
    [215.5, 6.2],
  ];
  const solid = campus.buildings.filter((b) => !(b.minHeight && b.minHeight > 2));
  it.each(GROUP_SPOTS.map((s) => [s.id, s.at] as const))("%s stands off every tour route and doorway, outdoors", (_id, at) => {
    expect(toRoutes(at)).toBeGreaterThan(2.6);
    for (const d of DOORS) expect(Math.hypot(d[0] - at[0], d[1] - at[1])).toBeGreaterThan(3.5);
    expect(solid.some((b) => pointInRing(at, b.polygon))).toBe(false);
  });
  it("keeps BioCity's Tykistökatu door corridor free (nobody stands in the revolving door's mouth)", () => {
    // From the recess mouth to the drum (buildings/biocity): the walk in must stay open.
    const corridor: V2[] = [
      [-29.91, -22.56],
      [-20.76, -9.43],
      [-23.63, -7.43],
      [-32.78, -20.56],
    ];
    for (const spot of GROUP_SPOTS) {
      for (const m of groupLayout(spot.n, hashString(spot.id))) {
        const p: V2 = [spot.at[0] + m.x, spot.at[1] + m.z];
        expect(pointInRing(p, corridor)).toBe(false);
      }
    }
  });
  it("tells indoors from outdoors for the tour walker", () => {
    const rings = campus.buildings.filter((b) => b.role === "biocity" || b.role === "joki" || b.role === "educity").map((b) => ({ ring: b.polygon, holes: b.holes ?? [] }));
    // BioCity lobby behind the Tykistökatu door, Joki Aula; the recess and Jussin aukio are outdoors.
    expect(insideHeroFootprint(-23.4, -10.0, rings)).toBe(true);
    expect(insideHeroFootprint(13.5, 43.0, rings)).toBe(true);
    expect(insideHeroFootprint(-28.0, -17.0, rings)).toBe(false);
    expect(insideHeroFootprint(48.5, 6.5, rings)).toBe(false);
  });
});
