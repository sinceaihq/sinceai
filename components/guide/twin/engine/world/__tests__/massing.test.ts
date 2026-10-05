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
jest.mock("three/addons/utils/BufferGeometryUtils.js", () => nodeRequire()("three/addons/utils/BufferGeometryUtils.js"));
jest.mock("three/addons/renderers/CSS2DRenderer.js", () => nodeRequire()("three/addons/renderers/CSS2DRenderer.js"));
jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));

import fs from "node:fs";
import path from "node:path";
import type { CampusBuilding, Lod2Building, TerrainMeta } from "../../data/campus";
import { buildFromLod2, buildFromOutline, farCity, farTreeGeometry, gableRoof, offsetRing, planeThrough, soffitGeometry, styleFor, techBoxGeometry, TECH_BOX_AREA, TECH_BOX_HEIGHT } from "../massing";

const building = (over: Partial<CampusBuilding>): CampusBuilding => ({
  id: "osm-1",
  osmId: 1,
  levels: 4,
  height: 14,
  polygon: [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
  ],
  ...over,
});

describe("fallback massing", () => {
  it("gives the hero buildings their facade families", () => {
    expect(styleFor(building({ role: "biocity" })).style.pattern).toBe("ribbon");
    expect(styleFor(building({ role: "educity" })).style.pattern).toBe("scatter");
    expect(styleFor(building({ role: "joki" })).style.pattern).toBe("curtain");
    expect(styleFor(building({ role: "datacity" })).style.wall).toBe("brickDark");
    expect(styleFor(building({ role: "parkcity" })).style.interior).toBe("parking");
  });

  it("styles the context by OSM use", () => {
    expect(styleFor(building({ use: "apartments" })).style.interior).toBe("residential");
    expect(styleFor(building({ use: "garages", height: 3 })).style.pattern).toBe("none");
    expect(styleFor(building({ use: "office" })).key).toBe("office");
  });

  it("builds canopies as slabs from their base, with no rooftop plant and nothing to bump into", () => {
    const lowestWall = (b: CampusBuilding) => {
      const built = buildFromOutline(b, styleFor(b), null);
      built.walls[0].computeBoundingBox();
      return { ...built, bottom: built.walls[0].boundingBox!.min.y, top: built.walls[0].boundingBox!.max.y };
    };
    // The station platform canopy: ground −5.13, slab −0.44 … −0.04 (campus.json osm-526090187).
    const canopy = lowestWall(
      building({ use: "roof", height: 5.1, minHeight: 4.7, groundY: -5.13, baseY: -0.44, roofY: -0.04 }),
    );
    expect(canopy.bottom).toBeCloseTo(-0.44, 6);
    expect(canopy.top).toBeCloseTo(-0.04, 6);
    expect(canopy.units).toHaveLength(0);
    expect(canopy.colliders).toHaveLength(0);
    // An overhang known only by its min height starts there too.
    expect(lowestWall(building({ minHeight: 3, groundY: 1, roofY: 8 })).bottom).toBeCloseTo(4, 6);
    // An ordinary building (big enough for plant, ≥ 260 m²) stands 0.3 m into the ground and blocks walking.
    const office = lowestWall(
      building({
        use: "office",
        groundY: 1,
        roofY: 15,
        polygon: [
          [0, 0],
          [0, 20],
          [30, 20],
          [30, 0],
        ],
      }),
    );
    expect(office.bottom).toBeCloseTo(0.7, 6);
    expect(office.units.length).toBeGreaterThan(0);
    expect(office.colliders).toHaveLength(4);
  });

  it("fits sloped LOD2 roof planes", () => {
    // y = 0.5 x − 0.25 z + 20
    const ring: [number, number][] = [
      [0, 0],
      [0, 8],
      [12, 8],
      [12, 0],
    ];
    const ys = ring.map(([x, z]) => 0.5 * x - 0.25 * z + 20);
    const f = planeThrough(ring, ys);
    expect(f(6, 4)).toBeCloseTo(22, 6);
    expect(f(0, 0)).toBeCloseTo(20, 6);
    // Degenerate input falls back to the mean height.
    expect(planeThrough([[0, 0], [0, 0], [0, 0]], [3, 3, 3])(5, 5)).toBeCloseTo(3);
  });
});

describe("raised massing (canopies, the station hall on its deck)", () => {
  /** Mean y and mean normal y of a geometry. */
  const facing = (g: import("three").BufferGeometry) => {
    const pos = g.getAttribute("position");
    const nor = g.getAttribute("normal");
    let y = 0;
    let ny = 0;
    for (let i = 0; i < pos.count; i++) {
      y += pos.getY(i) / pos.count;
      ny += nor.getY(i) / nor.count;
    }
    return { y, ny };
  };

  it("closes a raised slab underneath, facing down (seen from the platform, and casting a shadow)", () => {
    const canopy = buildFromOutline(
      building({ use: "roof", height: 5.1, minHeight: 4.7, groundY: -5.13, baseY: -0.44, roofY: -0.04 }),
      styleFor(building({ use: "roof", height: 5.1 })),
      null,
    );
    expect(canopy.roofs).toHaveLength(2);
    expect(facing(canopy.roofs[0])).toMatchObject({ y: expect.closeTo(-0.04, 6) });
    expect(facing(canopy.roofs[0]).ny).toBeGreaterThan(0.99);
    expect(facing(canopy.roofs[1]).y).toBeCloseTo(-0.44, 6);
    expect(facing(canopy.roofs[1]).ny).toBeLessThan(-0.99);
    // Same attributes as the roofs it is merged with.
    expect(Object.keys(canopy.roofs[1].attributes).sort()).toEqual(Object.keys(canopy.roofs[0].attributes).sort());
    expect(soffitGeometry(building({}).polygon, [], 3).getIndex()?.count).toBe(canopy.roofs[0].getIndex()?.count);
    // Ordinary buildings have no underside.
    expect(buildFromOutline(building({ groundY: 0, roofY: 14 }), styleFor(building({})), null).roofs).toHaveLength(1);
  });

  it("lets people walk under the station hall: no ground colliders for a LOD2 record on its deck", () => {
    const ring: [number, number][] = [
      [0, 0],
      [0, 20],
      [30, 20],
      [30, 0],
    ];
    const rec = (baseY: number): Lod2Building => ({
      id: "lod2-x",
      lod: 2,
      osmId: 7,
      groundY: -5.74,
      baseY,
      roofY: 6.83,
      topY: 9.57,
      footprint: [ring],
      roofs: [{ ring, y: 6.83 }],
    });
    const station = building({ id: "osm-7", osmId: 7, role: "station", polygon: ring, groundY: -5.74, roofY: 6.83 });
    const raised = buildFromLod2(station, [{ rec: rec(1.9), roof: rec(1.9).roofs[0] }], styleFor(station), null);
    expect(raised.colliders).toHaveLength(0);
    expect(raised.roofs.map((g) => facing(g).ny < 0)).toEqual([false, true]);
    // The same hall on the ground keeps its walls.
    const grounded = buildFromLod2(station, [{ rec: rec(-6.04), roof: rec(-6.04).roofs[0] }], styleFor(station), null);
    expect(grounded.colliders).toHaveLength(4);
    expect(grounded.roofs).toHaveLength(1);
  });
});

describe("far city backdrop", () => {
  const ext = (JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/assets/guide/3d/terrain/dtm.json"), "utf8")) as TerrainMeta).extent;
  /** Signed distance from the Rantarata track through the station (campus.json: (217, −128.2), direction (−0.57, −0.82)). */
  const railSide = (x: number, z: number) => (x - 217) * 0.82 - (z + 128) * 0.57;

  it("leaves the railway cutting open along the tracks (not across them)", () => {
    const city = farCity(ext, 4242);
    expect(city.roofs.length).toBeGreaterThan(1500);
    let across = 0;
    for (const g of city.roofs) {
      const pos = g.getAttribute("position");
      const sides: number[] = [];
      for (let i = 0; i < pos.count; i++) sides.push(railSide(pos.getX(i), pos.getZ(i)));
      // The two tracks run 0 … −15.5 m off that line: no slab within 12 m of them.
      expect(Math.max(...sides) > -27.5 && Math.min(...sides) < 12).toBe(false);
      // Tykistökatu's line, at right angles to the tracks, is city again (the old corridor ran along it).
      const pos0 = [pos.getX(0), pos.getZ(0)];
      if (Math.abs((pos0[0] - 217) * 0.57 + (pos0[1] + 128) * 0.82) < 45) across++;
    }
    expect(across).toBeGreaterThan(10);
  });
});

describe("far city variety", () => {
  const ext = { minX: -179, maxX: 343, minZ: -208, maxZ: 279 };
  it("mixes heights, facade families, flat and gabled roofs and tree clumps (deterministic)", () => {
    const a = farCity(ext, 4242);
    const b = farCity(ext, 4242);
    expect(a.roofs.length).toBe(b.roofs.length);
    expect(a.trees.length).toBe(b.trees.length);
    // Every facade family is used, none dominates.
    const counts = a.families.map((f) => f.length);
    const total = counts.reduce((x, y) => x + y, 0);
    for (const c of counts) {
      expect(c).toBeGreaterThan(total * 0.04);
      expect(c).toBeLessThan(total * 0.5);
    }
    // Flat bitumen, flat membrane, red and dark tin gables.
    const kinds = new Set(a.roofKinds);
    expect([...kinds].sort()).toEqual([0, 1, 2, 3]);
    expect(a.roofKinds.filter((k) => k >= 2).length).toBeGreaterThan(a.roofKinds.length * 0.05);
    // Heights: from 2-storey houses to the odd 10–12 storey tower.
    const tops = a.roofs.map((g) => {
      g.computeBoundingBox();
      return g.boundingBox!.max.y;
    });
    expect(Math.min(...tops)).toBeLessThan(5);
    expect(Math.max(...tops)).toBeGreaterThan(28);
    expect(a.trees.length).toBeGreaterThan(800);
    expect(farCity(ext, 4242, { trees: 0.5 }).trees.length).toBeLessThan(a.trees.length * 0.7);
  });

  it("builds gabled roofs with outward faces and the trees as one coloured geometry", () => {
    const g = gableRoof(0, 0, 30, 12, 0, 10, 3);
    g.computeBoundingBox();
    expect(g.boundingBox!.max.y).toBeCloseTo(13, 6);
    const n = g.getAttribute("normal");
    let up = 0;
    for (let i = 0; i < n.count; i++) up += n.getY(i);
    expect(up).toBeGreaterThan(0);
    const trees = farTreeGeometry([{ x: 0, z: 0, r: 3, h: 12, conifer: false }, { x: 10, z: 0, r: 2, h: 14, conifer: true }], 1)!;
    expect(trees.getAttribute("color").count).toBe(trees.getAttribute("position").count);
  });
});

describe("technical boxes (small LOD records)", () => {
  it("are vent/stair housings: a dark louvre band at the top, a light coping, no windows", () => {
    // lod2-k50 on BioCity's terrace: a 2.55 m diamond, 3.46 m tall (2021 surface model: 3.4 m).
    const ring: [number, number][] = [
      [29.3, -8.6],
      [31.1, -6.8],
      [29.3, -5.0],
      [27.5, -6.8],
    ];
    const g = techBoxGeometry(ring, -0.09, 3.67);
    g.computeBoundingBox();
    expect(g.boundingBox!.min.y).toBeCloseTo(-0.09, 6);
    expect(g.boundingBox!.max.y).toBeGreaterThan(3.67);
    expect(g.boundingBox!.max.y).toBeLessThan(3.8);
    expect(Object.keys(g.attributes).sort()).toEqual(["color", "normal", "position"]);
    // The top 1.2 m is dark (louvres), the walls below are lighter.
    const pos = g.getAttribute("position");
    const col = g.getAttribute("color");
    let topLum = 0;
    let topN = 0;
    let lowLum = 0;
    let lowN = 0;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const lum = col.getX(i) + col.getY(i) + col.getZ(i);
      if (y > 2.6 && y < 3.55) {
        topLum += lum;
        topN++;
      } else if (y < 1.5) {
        lowLum += lum;
        lowN++;
      }
    }
    expect(topLum / topN).toBeLessThan((lowLum / lowN) * 0.6);
    expect(TECH_BOX_AREA).toBeGreaterThan(9.5);
    expect(TECH_BOX_HEIGHT).toBeGreaterThan(3.5);
  });

  it("offsets rings outwards whichever their orientation", () => {
    const ccw: [number, number][] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];
    for (const ring of [ccw, [...ccw].reverse()]) {
      const out = offsetRing(ring, 0.1);
      for (const [x, z] of out) expect(Math.hypot(x - 1, z - 1)).toBeGreaterThan(Math.SQRT2);
    }
  });
});
