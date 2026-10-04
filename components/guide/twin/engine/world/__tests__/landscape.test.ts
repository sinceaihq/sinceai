function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));
jest.mock("three/addons/renderers/CSS2DRenderer.js", () => nodeRequire()("three/addons/renderers/CSS2DRenderer.js"));
jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));
jest.mock("three/addons/utils/BufferGeometryUtils.js", () => nodeRequire()("three/addons/utils/BufferGeometryUtils.js"));

import { Kit, signFacing } from "../landscape";

describe("landscape kit", () => {
  it("merges primitives per material with outward normals", () => {
    const kit = new Kit();
    kit.box("galv", [0, 0, 0], [1, 2, 1]);
    kit.cyl("galv", [5, 0, 0], 3, 0.1, 8);
    kit.quad("signFace", [
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ]);
    const galv = kit.buf("galv");
    expect(galv.idx.length / 3).toBe(12 + 8 * 4);
    // The box spans y 0 … 2 (its bottom sits on the given point).
    const ys = galv.pos.filter((_, i) => i % 3 === 1).slice(0, 36);
    expect(Math.min(...ys)).toBeCloseTo(0, 6);
    expect(Math.max(...ys)).toBeCloseTo(2, 6);
    const face = kit.buf("signFace");
    expect(face.idx.length).toBe(6);
    // Quad corners counter-clockwise seen from +z: the normal points at the viewer.
    expect(face.nor[2]).toBeCloseTo(1, 6);
  });

  it("turns sign plates to face oncoming right-hand traffic", () => {
    // Kerb due east of the sign (bearing 90°): near-side traffic heads south, so the plate faces north (−z).
    const f = signFacing(90);
    expect(f[0]).toBeCloseTo(0, 6);
    expect(f[1]).toBeCloseTo(-1, 6);
    const g = signFacing(0);
    expect(g[0]).toBeCloseTo(-1, 6);
  });
});
