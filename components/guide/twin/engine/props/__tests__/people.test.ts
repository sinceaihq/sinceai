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

import * as THREE from "three";
import { mulberry32 } from "../../util";
import {
  FEATURE,
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
  randomLook,
  walkerDistance,
  wrapAngle,
} from "../people";

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
