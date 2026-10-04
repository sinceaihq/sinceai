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
jest.mock("three", () =>
  nodeRequire()(
    `${process.cwd()}/node_modules/three/build/three.module.js`,
  ),
);

import { PLAN_FRAMES, bearingVector, geoToLocal, localToGeo, localToPlan, planPolar, planToLocal, vectorBearing, yawForBearing } from "../frame";
import { cleanRing, ensureCCW, hashString, loadImage, mulberry32, overlapArea, pointInRing, polygonCentroid, ringArea } from "../util";
import { normaliseTime } from "../debug";
import type { V2 } from "../types";

const close = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

describe("campus frame", () => {
  it("round-trips geo ↔ local and puts BioCity's centroid at the origin", () => {
    const [x, z] = geoToLocal(60.44932, 22.29326);
    close(x, 0, 1e-9);
    close(z, 0, 1e-9);
    const p = localToGeo(213, 98);
    const [x2, z2] = geoToLocal(p.lat, p.lon);
    close(x2, 213, 1e-6);
    close(z2, 98, 1e-6);
  });

  it("maps compass bearings to ground vectors (north = −z, east = +x)", () => {
    const n = bearingVector(0);
    close(n[0], 0, 1e-12);
    close(n[1], -1, 1e-12);
    const e = bearingVector(90);
    close(e[0], 1, 1e-12);
    close(vectorBearing(1, 0), 90, 1e-9);
    close(vectorBearing(0, 1), 180, 1e-9);
    close(vectorBearing(-1, 0), 270, 1e-9);
  });

  it("turns a −z-front model to face a bearing", () => {
    // rotation.y = −β for a model facing −z (SPEC §1.1): the G-Class nose to compass 325.1°.
    close(yawForBearing(325.1), (-325.1 * Math.PI) / 180, 1e-12);
    close(yawForBearing(90, "+x"), 0, 1e-12);
  });

  it("matches SPEC plan-frame examples (B: supercar A, J: LED wall centre and counters)", () => {
    const carA = planToLocal(PLAN_FRAMES.B, -37.1, -3.0);
    close(carA[0], -25.67, 0.05);
    close(carA[1], -19.54, 0.05);
    const recess = planToLocal(PLAN_FRAMES.B, -42.8, -4.6);
    close(recess[0], -27.62, 0.05);
    close(recess[1], -25.13, 0.05);
    const [px, pz] = planPolar(8.45, 270.5);
    const led = planToLocal(PLAN_FRAMES.J, px, pz);
    close(led[0], 52.35, 0.05);
    close(led[1], 10.59, 0.05);
    const [ex, ez] = planToLocal(PLAN_FRAMES.E, 0, 0);
    close(ex, 217.472, 1e-9);
    close(ez, 51.22, 1e-9);
  });

  it("inverts plan transforms", () => {
    for (const f of Object.values(PLAN_FRAMES)) {
      const [x, z] = planToLocal(f, 12.3, -45.6);
      const [px, pz] = localToPlan(f, x, z);
      close(px, 12.3, 1e-9);
      close(pz, -45.6, 1e-9);
    }
  });

  it("reads HH:MM times as Friday 6 November", () => {
    expect(normaliseTime("15:30")).toBe("2026-11-06T15:30");
    expect(normaliseTime("2026-11-07T01:00:00")).toBe("2026-11-07T01:00");
  });
});

describe("polygon helpers", () => {
  // Counter-clockwise seen from above (+y): west → south → east → north.
  const ccw: V2[] = [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
  ];

  it("gives CCW-from-above rings a positive area and fixes orientation", () => {
    expect(ringArea(ccw)).toBeCloseTo(100);
    expect(ringArea(ccw.slice().reverse())).toBeCloseTo(-100);
    expect(ringArea(ensureCCW(ccw.slice().reverse()))).toBeCloseTo(100);
  });

  it("cleans closing duplicates", () => {
    expect(cleanRing([...ccw, [0, 0]])).toHaveLength(4);
  });

  it("tests points, centroids and overlap", () => {
    expect(pointInRing([5, 5], ccw)).toBe(true);
    expect(pointInRing([15, 5], ccw)).toBe(false);
    const c = polygonCentroid(ccw);
    close(c[0], 5, 1e-9);
    close(c[1], 5, 1e-9);
    const shifted: V2[] = ccw.map(([x, z]) => [x + 5, z]);
    close(overlapArea(ccw, shifted), 50, 2);
    expect(overlapArea(ccw, ccw.map(([x, z]) => [x + 20, z] as V2))).toBe(0);
  });

  it("is deterministic", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(hashString("osm-48381050")).toBe(hashString("osm-48381050"));
    expect(hashString("osm-48381050")).not.toBe(hashString("osm-731925812"));
  });
});

describe("loadImage", () => {
  const RealImage = window.Image;
  afterEach(() => {
    window.Image = RealImage;
  });

  it("caches a loaded image but not a failure (the next call tries the network again)", async () => {
    let attempts = 0;
    let fail = true;
    class FakeImage {
      decoding = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        attempts++;
        const ok = !fail;
        setTimeout(() => (ok ? this.onload?.() : this.onerror?.()), 0);
      }
    }
    window.Image = FakeImage as unknown as typeof Image;
    expect(await loadImage("/flaky.png")).toBeNull();
    fail = false;
    const img = await loadImage("/flaky.png");
    expect(img).not.toBeNull();
    expect(attempts).toBe(2);
    // Loaded once: cached.
    expect(await loadImage("/flaky.png")).toBe(img);
    expect(attempts).toBe(2);
  });
});
