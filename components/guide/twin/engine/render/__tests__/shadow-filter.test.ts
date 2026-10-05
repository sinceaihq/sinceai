/**
 * three is ESM; this Jest setup runs CommonJS. Node 24 can require() ES modules natively, so the
 * mock hands over the real module through Node's own loader — the tests run against real three.js.
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));

import * as THREE from "three";
import { patchShadowChunk, pcfAxis } from "../shadowFilter";

/** 1D shadow-map texels lit from index `edge` on (texel centres at i + 0.5). */
const lit = (i: number, edge: number) => (i >= edge ? 1 : 0);
/** Hardware bilinear PCF at x (texels). */
const bilinear = (x: number, edge: number) => {
  const i0 = Math.floor(x - 0.5);
  const a = x - 0.5 - i0;
  return (1 - a) * lit(i0, edge) + a * lit(i0 + 1, edge);
};
/** The optimised PCF of the GLSL, along one axis, for a receiver at x (texels). */
function filtered(x: number, size: 3 | 5 | 7, edge: number): number {
  const base = Math.floor(x + 0.5);
  const s = x + 0.5 - base;
  const { offsets, weights, norm } = pcfAxis(s, size);
  let sum = 0;
  for (let k = 0; k < offsets.length; k++) sum += weights[k] * bilinear(base - 0.5 + offsets[k], edge);
  return sum / norm;
}

describe("optimised PCF (render/shadowFilter.ts)", () => {
  it("patches three's shadow chunk: no per-pixel noise in the 2D kernel, per-cascade normal offsets", () => {
    const original = (THREE.ShaderChunk as unknown as Record<string, string>).shadowmap_pars_fragment;
    const patch = patchShadowChunk(original);
    expect(patch.pcf).toBe(true);
    expect(patch.perCascadeBias).toBe(true);
    const getShadow = patch.source.slice(patch.source.indexOf("float getShadow( sampler2DShadow"), patch.source.indexOf("#elif defined( SHADOWMAP_TYPE_VSM )"));
    expect(getShadow).toContain("TW_PCF");
    expect(getShadow).not.toContain("interleavedGradientNoise");
    expect(patch.source).toContain("cascade.w > 0.0");
    // Sun cascades: the receiver-plane PCF replaces r186's getSunShadow.
    expect(patch.source).toContain("twSunShadowPCF");
    expect(patch.source.match(/float getSunShadow\(/g)).toHaveLength(1);
    // Without it, only the per-cascade normal offset changes there.
    const plain = patchShadowChunk(original, false);
    expect(plain.perCascadeBias).toBe(true);
    expect(plain.source).not.toContain("twSunShadowPCF");
    // Idempotent (HMR runs module code again against the patched chunk).
    expect(patchShadowChunk(patch.source).source).toBe(patch.source);
  });

  it("weights each axis to exactly one and keeps taps inside the cascade tile inset", () => {
    for (const size of [3, 5, 7] as const) {
      for (let s = 0; s < 1; s += 0.05) {
        const { offsets, weights, norm } = pcfAxis(s, size);
        expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(norm, 9);
        for (const w of weights) expect(w / norm).toBeGreaterThan(0);
        for (const o of offsets) expect(Math.abs(o)).toBeLessThanOrEqual(size / 2 + 0.5);
      }
    }
  });

  it("filters a shadow edge into a smooth, monotonic tent — no steps, no noise", () => {
    for (const size of [3, 5, 7] as const) {
      let prev: number | null = null;
      for (let x = 2; x <= 18; x += 0.01) {
        const v = filtered(x, size, 10);
        if (prev !== null) {
          expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
          // Continuous: the slope of a tent at least 3 texels wide is ≤ 0.5 per texel.
          expect(v - prev).toBeLessThanOrEqual(0.0051);
        }
        prev = v;
      }
      expect(filtered(10, size, 10)).toBeCloseTo(0.5, 6);
      expect(filtered(10 - size / 2 - 1, size, 10)).toBeCloseTo(0, 12);
      expect(filtered(10 + size / 2 + 1, size, 10)).toBeCloseTo(1, 12);
    }
  });
});
