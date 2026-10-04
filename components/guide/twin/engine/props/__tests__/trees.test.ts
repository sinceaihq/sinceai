function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));
// trees.ts shares the mesh sanitiser of world/ground, which pulls in the label and sky addons.
jest.mock("three/addons/renderers/CSS2DRenderer.js", () => nodeRequire()("three/addons/renderers/CSS2DRenderer.js"));
jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));

import { generateTree, SPECIES, speciesFor, treeSize, type TreeSpecies } from "../trees";

const tris = (t: ReturnType<typeof generateTree>) => (t.wood.idx.length + t.twigs.idx.length + t.leaves.idx.length) / 3;

describe("procedural trees", () => {
  const all = Object.keys(SPECIES) as TreeSpecies[];

  it("is deterministic per seed", () => {
    const a = generateTree("tilia", 42, 0);
    const b = generateTree("tilia", 42, 0);
    expect(a.wood.pos).toEqual(b.wood.pos);
    expect(a.twigs.uv).toEqual(b.twigs.uv);
    expect(generateTree("tilia", 43, 0).wood.pos).not.toEqual(a.wood.pos);
  });

  it("builds every species at three levels of detail within budget", () => {
    for (const sp of all) {
      const l0 = generateTree(sp, 7, 0);
      const l1 = generateTree(sp, 7, 1);
      const l2 = generateTree(sp, 7, 2);
      expect(tris(l0)).toBeGreaterThan(tris(l1));
      expect(tris(l1)).toBeGreaterThan(tris(l2));
      // Close-up trees stay under ≈16k triangles, far ones under ≈1k (DESIGN §5 budget).
      expect(tris(l0)).toBeLessThan(16000);
      expect(tris(l2)).toBeLessThan(1000);
      for (const v of l0.wood.pos) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("grows to the nominal height and crown", () => {
    for (const sp of all) {
      const t = generateTree(sp, 3, 1);
      let maxY = -Infinity;
      let maxR = 0;
      for (let i = 0; i < t.wood.pos.length; i += 3) {
        maxY = Math.max(maxY, t.wood.pos[i + 1]);
        maxR = Math.max(maxR, Math.hypot(t.wood.pos[i], t.wood.pos[i + 2]));
      }
      expect(maxY).toBeGreaterThan(SPECIES[sp].height * 0.55);
      expect(maxY).toBeLessThan(SPECIES[sp].height * 1.3);
      expect(maxR).toBeLessThan(SPECIES[sp].crown * 2.2 + 1);
    }
  });

  it("keeps November deciduous trees nearly bare, oaks brown", () => {
    const lime = generateTree("tilia", 5, 0);
    const oak = generateTree("quercus", 5, 0);
    expect(lime.leaves.idx.length / 3).toBeLessThan(1000);
    expect(oak.leaves.idx.length).toBeGreaterThan(lime.leaves.idx.length);
    expect(generateTree("fraxinus", 5, 0).leaves.idx.length).toBe(0);
  });

  it("maps register genera and sizes to models", () => {
    expect(speciesFor("Tilia", false, "large", 1)).toBe("tilia");
    expect(speciesFor("Picea", true, undefined, 1)).toBe("picea");
    expect(["picea", "pinus", "thuja"]).toContain(speciesFor(undefined, true, undefined, 9));
    expect(["sorbus", "malus", "prunus", "betula"]).toContain(speciesFor(undefined, false, "small", 9));
    expect(speciesFor(undefined, false, "medium", 11)).toBe(speciesFor(undefined, false, "medium", 11));
    const big = treeSize("tilia", "large", undefined, 1);
    const small = treeSize("tilia", "small", undefined, 1);
    expect(big.height).toBeGreaterThan(small.height);
    expect(treeSize("acer", "large", 7.5, 2).crown).toBeCloseTo(7.5, 6);
  });
});
