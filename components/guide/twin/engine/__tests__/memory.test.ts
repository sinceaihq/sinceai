/**
 * three is ESM; this Jest setup runs CommonJS — the real module through Node's own loader.
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));

import * as THREE from "three";
import { geometryBytes, sceneTextures, targetBytes, textureBytes, toMB } from "../debug";

describe("memory estimates (stats().memory)", () => {
  it("counts a texture's texels, mip chain and format", () => {
    const t = new THREE.Texture({ width: 2048, height: 2048 });
    expect(toMB(textureBytes(t))).toBeCloseTo(21.3, 1);
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    expect(toMB(textureBytes(t))).toBeCloseTo(16, 1);
    const half = new THREE.DataTexture(new Uint16Array(64 * 64 * 4), 64, 64, THREE.RGBAFormat, THREE.HalfFloatType);
    expect(textureBytes(half)).toBe(64 * 64 * 8);
    expect(textureBytes(new THREE.Texture())).toBe(0);
  });

  it("finds the textures a scene uses (maps and uniforms, shared ones once) and its geometry buffers", () => {
    const scene = new THREE.Scene();
    const map = new THREE.Texture({ width: 512, height: 512 });
    const a = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map }));
    const b = new THREE.Mesh(a.geometry, new THREE.MeshStandardMaterial({ map, roughnessMap: map }));
    const u = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.ShaderMaterial({ uniforms: { tex: { value: new THREE.Texture({ width: 8, height: 8 }) } } }));
    scene.add(a, b, u);
    expect(sceneTextures(scene).size).toBe(2);
    const box = a.geometry;
    const plane = u.geometry;
    const bytes = [box, plane].reduce((n, g) => n + Object.values(g.attributes).reduce((m, x) => m + (x as THREE.BufferAttribute).array.byteLength, 0) + (g.index?.array.byteLength ?? 0), 0);
    expect(geometryBytes(scene)).toBe(bytes);
  });

  it("estimates the frame's render targets: MSAA dominates on a phone", () => {
    const phone = { pixels: 515 * 1144, gtao: false, gtaoScale: 0.5, bloom: true, smaa: false };
    const msaa = targetBytes({ ...phone, msaa: 4 });
    const smaa = targetBytes({ ...phone, msaa: 0, smaa: true });
    expect(toMB(msaa)).toBeGreaterThan(60);
    expect(toMB(smaa)).toBeLessThan(35);
  });
});
