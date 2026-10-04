/**
 * props/furniture.ts: sizes, orientation conventions and instanced placement.
 * three is handed over through Node's own loader (as in world/__tests__/massing.test.ts).
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));
jest.mock("three/addons/utils/BufferGeometryUtils.js", () => nodeRequire()("three/addons/utils/BufferGeometryUtils.js"));
jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));

import * as THREE from "three";
import {
  barStoolGeometry,
  cafeChairGeometry,
  cafeTableGeometry,
  counterGeometry,
  laptopGeometry,
  placeInstanced,
  placementMatrix,
  rollupGeometry,
  stackingChairGeometry,
  workTableGeometry,
} from "../furniture";

/** Bounding box of a geometry. */
const bbox = (g: THREE.BufferGeometry) => {
  g.computeBoundingBox();
  return g.boundingBox!;
};

/** Every piece is indexed with position, normal and uv (InstancedMesh + library materials). */
function expectRenderable(g: THREE.BufferGeometry) {
  expect(g.getAttribute("position")).toBeDefined();
  expect(g.getAttribute("normal")).toBeDefined();
  expect(g.getAttribute("uv")).toBeDefined();
  const pos = g.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    expect(Number.isFinite(pos.getX(i)) && Number.isFinite(pos.getY(i)) && Number.isFinite(pos.getZ(i))).toBe(true);
  }
}

describe("props/furniture", () => {
  it("builds a 1.8 × 0.8 m work table, 0.74 m high, long side along z", () => {
    const t = workTableGeometry();
    expectRenderable(t.top);
    expectRenderable(t.frame);
    const top = bbox(t.top);
    expect(top.max.y).toBeCloseTo(0.74, 3);
    expect(top.max.x - top.min.x).toBeCloseTo(0.8, 3);
    expect(top.max.z - top.min.z).toBeCloseTo(1.8, 3);
    const frame = bbox(t.frame);
    expect(frame.min.y).toBeCloseTo(0, 3);
    expect(frame.max.y).toBeLessThanOrEqual(0.74);
  });

  it("seats sitters at 0.46 m facing −z (backrest on +z)", () => {
    const c = stackingChairGeometry();
    expectRenderable(c.shell);
    expectRenderable(c.frame);
    const shell = bbox(c.shell);
    expect(shell.max.y).toBeGreaterThan(0.8);
    expect(shell.max.z).toBeGreaterThan(0.2);
    expect(shell.min.z).toBeGreaterThan(-0.3);
    expect(bbox(c.frame).min.y).toBeCloseTo(0, 2);
    const cafe = cafeChairGeometry();
    expect(bbox(cafe.shell).max.z).toBeGreaterThan(0.15);
  });

  it("puts the laptop screen at its −z edge, facing +z", () => {
    const l = laptopGeometry();
    const s = bbox(l.screen);
    expect(s.max.z).toBeLessThan(0);
    expect(s.max.y).toBeGreaterThan(0.15);
    const n = l.screen.getAttribute("normal");
    expect(n.getZ(0)).toBeGreaterThan(0.8);
  });

  it("faces counter fronts and roll-up prints towards −z", () => {
    const c = counterGeometry(1.5, 1.05, 0.55);
    expect(bbox(c.top).max.y).toBeCloseTo(1.05, 3);
    expect(c.front.getAttribute("normal").getZ(0)).toBeLessThan(-0.9);
    const r = rollupGeometry(0.85, 2.0);
    expect(r.panel.getAttribute("normal").getZ(0)).toBeLessThan(-0.9);
    expect(bbox(r.panel).max.y).toBeCloseTo(2.09, 2);
  });

  it("has stools and café tables standing on the floor", () => {
    const st = barStoolGeometry();
    expect(bbox(st.frame).min.y).toBeCloseTo(0, 2);
    expect(bbox(st.seat).max.y).toBeGreaterThan(0.75);
    const ct = cafeTableGeometry({ length: 1.6, width: 0.8 });
    expect(bbox(ct.top).max.y).toBeCloseTo(0.74, 3);
    expect(bbox(ct.base).min.y).toBeGreaterThanOrEqual(0);
  });

  it("places instances with yaw and floor height (deterministic)", () => {
    const m = placementMatrix({ x: 2, z: -3, y: 0.06, ry: Math.PI / 2 });
    const p = new THREE.Vector3(0, 0, -1).applyMatrix4(m);
    // A piece facing −z turned by +90° faces −x.
    expect(p.x).toBeCloseTo(1, 6);
    expect(p.y).toBeCloseTo(0.06, 6);
    expect(p.z).toBeCloseTo(-3, 6);
    const g = workTableGeometry();
    const mat = new THREE.MeshBasicMaterial();
    const mesh = placeInstanced(g.top, mat, [
      { x: 0, z: 0 },
      { x: 2.2, z: 0 },
    ]);
    expect(mesh.count).toBe(2);
    expect(mesh.castShadow).toBe(false);
    const empty = placeInstanced(g.frame, mat, []);
    expect(empty.count).toBe(0);
  });
});
