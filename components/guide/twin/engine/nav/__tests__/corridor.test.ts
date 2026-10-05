/**
 * three is ESM; this Jest setup runs CommonJS — the real module through Node's own loader.
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));

import * as THREE from "three";
import { buildCorridorIndex, corridorCells } from "../corridor";

/** A horizontal slab (a deck, a roof) of w × d at height y, centred on (x, z). */
function slab(x: number, z: number, w: number, d: number, y: number, material: THREE.Material = new THREE.MeshStandardMaterial()) {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, material);
  m.position.set(x, y, z);
  m.updateMatrixWorld();
  return m;
}

describe("corridor surface index", () => {
  // A street at 0, a footbridge deck at 4.3 with a roof at 7.2 over x 10…30, a wall (never a surface),
  // a glazed canopy at 3 over x 40…44, a tree (skipped by name).
  const root = new THREE.Group();
  root.add(slab(20, 0, 80, 10, 0));
  root.add(slab(20, 0, 20, 3, 4.3));
  root.add(slab(20, 0, 20, 3.4, 7.2));
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), new THREE.MeshStandardMaterial());
  wall.position.set(5, 2.5, 0);
  root.add(wall);
  const glass = new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.3 });
  glass.name = "canopy-glass";
  root.add(slab(42, 0, 4, 3, 3, glass));
  const tree = slab(50, 0, 4, 4, 2.5);
  tree.name = "trees-crowns";
  root.add(tree);
  root.updateMatrixWorld(true);
  const path: [number, number][] = [];
  for (let x = -10; x <= 60; x += 1) path.push([x, 0]);

  it("finds the floor nearest the route's height: the deck on the bridge, the street under it", async () => {
    const index = (await buildCorridorIndex([root], corridorCells(path, 2)))!;
    expect(index.floorAt(20, 0, 3.6)).toBeCloseTo(4.3, 6);
    expect(index.floorAt(20, 0, 0.2)).toBeCloseTo(0, 6);
    expect(index.floorAt(-5, 0, 0)).toBeCloseTo(0, 6);
    // Glazing is never a floor; outside the indexed cells there is nothing.
    expect(index.floorAt(42, 0, 3)).toBeNull();
    expect(index.floorAt(42, 0, 0.2)).toBeCloseTo(0, 6);
    expect(index.floorAt(20, 30, 0)).toBeNull();
  });

  it("finds the lowest ceiling over a floor — roofs and glazed canopies, not walls or trees", async () => {
    const index = (await buildCorridorIndex([root], corridorCells(path, 2)))!;
    expect(index.ceilingAt(20, 0, 4.3)).toBeCloseTo(7.2, 6);
    // From the street, the deck itself is the ceiling.
    expect(index.ceilingAt(20, 0, 0)).toBeCloseTo(4.3, 6);
    expect(index.ceilingAt(42, 0, 0)).toBeCloseTo(3, 6);
    expect(index.ceilingAt(50, 0, 0)).toBeNull();
    expect(index.ceilingAt(5, 0, 0)).toBeNull();
  });

  it("stops when asked (a route ended while it was indexing)", async () => {
    expect(await buildCorridorIndex([root], corridorCells(path, 2), { shouldStop: () => true })).toBeNull();
  });
});
