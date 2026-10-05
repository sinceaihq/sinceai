/**
 * @jest-environment node
 */
/**
 * BioCity's phone budget (DESIGN §5: ≤ 80 draw calls, ≤ 150k triangles per building on "low"): the
 * shell and the ground floor merged per (layer, material) after the low-tier aliases, and the alias
 * maps' own rules. three runs through Node's loader (ESM); merging is stubbed to a counter (typed
 * arrays differ between Jest's realm and Node's, so real merges cannot mix them here).
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));
jest.mock("three/addons/utils/BufferGeometryUtils.js", () => {
  const T = nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`);
  return {
    mergeGeometries(list: { index: { count: number } | null; getAttribute(n: string): { count: number } }[]) {
      let v = 0;
      let i = 0;
      for (const g of list) {
        v += g.getAttribute("position").count;
        i += g.index ? g.index.count : g.getAttribute("position").count;
      }
      const out = new T.BufferGeometry();
      out.setAttribute("position", new T.BufferAttribute(new Float32Array(v * 3), 3));
      out.setIndex(new T.BufferAttribute(new Uint32Array(i), 1));
      return out;
    },
  };
});

jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));

import { Buckets } from "../geom";
import { buildExterior } from "../exterior";
import { buildInteriorStructure } from "../interior";
import { ALIAS, ALIAS_LOW } from "../aliases";
import { bioStyles } from "../materials";

function buckets(tier: "low" | "high") {
  const b = new Buckets();
  buildExterior(b, { groundB: () => -0.8, tier });
  buildInteriorStructure(b, { tier });
  b.alias(tier === "low" ? ALIAS_LOW : ALIAS);
  return b.stats();
}

describe("BioCity draw-call and triangle budget", () => {
  it("keeps the shell and the ground floor within the phone budget (fit-out and dressing get the rest)", () => {
    const st = buckets("low");
    const calls = Object.keys(st).length;
    const tris = Object.values(st).reduce((a, n) => a + n, 0);
    // ≤ 80 per building: ≤ 42 for shell + structure leaves the rest for furniture, signs and people.
    expect(calls).toBeLessThanOrEqual(42);
    expect(tris).toBeLessThan(60_000);
  });

  it("stays within the ultra budget on high", () => {
    const st = buckets("high");
    expect(Object.keys(st).length).toBeLessThanOrEqual(95);
  });
});

describe("BioCity material aliases", () => {
  const facadeKeys = new Set([...Object.keys(bioStyles()), "shopfrontIn"]);
  for (const [name, map] of [
    ["high", ALIAS],
    ["low", ALIAS_LOW],
  ] as const) {
    it(`${name}: never chains and never mixes facade-shader with solid geometry`, () => {
      for (const [from, to] of Object.entries(map)) {
        expect(map[to]).toBeUndefined();
        expect(facadeKeys.has(from)).toBe(facadeKeys.has(to));
      }
    });
  }
});
