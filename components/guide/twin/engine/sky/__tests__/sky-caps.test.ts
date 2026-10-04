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
jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));

import * as THREE from "three";
import { lightingFor, probeCap, sunIlluminance, visibleDomeCap, zenithLuminance } from "../sky";

const LOOK = { turbidity: 6, rayleigh: 2.6, mieCoefficient: 0.0012, mieDirectionalG: 0.85, skyGain: 1 };
const dayMixAt = (el: number) => THREE.MathUtils.smoothstep(el, -2.5, 2.0);

/** Friday 6 Nov, 15:50 → 17:10 in one-minute steps. */
const minutes = Array.from({ length: 81 }, (_, i) => {
  const t = 15 * 60 + 50 + i;
  return `2026-11-06T${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
});

describe("dusk sky caps", () => {
  it("never switches the visible-dome cap off and changes it smoothly through dusk", () => {
    let prev: number | null = null;
    for (const iso of minutes) {
      const l = lightingFor(iso);
      const cap = visibleDomeCap(zenithLuminance(l.sunDir, LOOK), dayMixAt(l.sunElevationDeg));
      expect(Number.isFinite(cap)).toBe(true);
      expect(cap).toBeGreaterThanOrEqual(0.02);
      expect(cap).toBeLessThan(10);
      if (prev !== null) expect(Math.max(cap, prev) / Math.min(cap, prev)).toBeLessThan(1.3);
      prev = cap;
    }
  });

  it("settles on the floor once the daylight term has faded (nothing left to cap)", () => {
    const night = lightingFor("2026-11-06T17:30");
    expect(dayMixAt(night.sunElevationDeg)).toBe(0);
    expect(visibleDomeCap(zenithLuminance(night.sunDir, LOOK), 0)).toBe(0.02);
  });

  it("keeps the probe cap finite and positive", () => {
    for (const iso of minutes) {
      const cap = probeCap(zenithLuminance(lightingFor(iso).sunDir, LOOK));
      expect(Number.isFinite(cap)).toBe(true);
      expect(cap).toBeGreaterThanOrEqual(0.002);
    }
  });
});

describe("sun at sunset", () => {
  it("fades the direct beam to exactly zero below the horizon (the light keeps its slot at intensity 0)", () => {
    let prev = Infinity;
    for (const iso of minutes) {
      const k = sunIlluminance(lightingFor(iso).sunElevationDeg, 10);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(prev + 1e-9);
      prev = k;
    }
    expect(sunIlluminance(lightingFor("2026-11-06T16:40").sunElevationDeg, 10)).toBe(0);
  });
});
