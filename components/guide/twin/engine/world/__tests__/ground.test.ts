/**
 * three (and its addons) are ESM; this Jest setup runs CommonJS. The mocks
 * hand over the real modules through Node's own loader (as in massing.test.ts).
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));
jest.mock("three/addons/renderers/CSS2DRenderer.js", () => nodeRequire()("three/addons/renderers/CSS2DRenderer.js"));
jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { buildingVolumes, createTerrain, decodePng, type CampusData, type Lod2Data, type StreetsData, type Terrain, type TerrainMeta } from "../../data/campus";
import type { CameraView, V2, V3 } from "../../types";
import { pointInRing, ringArea } from "../../util";
import {
  GROUND_TARGETS,
  GROUND_VIEWS,
  HERO_PLANTERS,
  buildGroundGeometry,
  sanitizeMesh,
  heroCut,
  linesOutside,
  subtractConvex,
  HERO_SURFACES,
  KerbField,
  MeshBuf,
  POOL_SCALE,
  arrowOutline,
  bridgeHoles,
  bufferPolyline,
  buildMarkings,
  buildPoolMap,
  CarriagewayIndex,
  clipRingToBox,
  createHeightModel,
  dashes,
  decodeRunMask,
  densify,
  dominantAngle,
  drapeRing,
  encodeRunMask,
  erodeBit,
  lampSpecs,
  makeRaster,
  offsetPolyline,
  osmAreaKind,
  osmRoadKind,
  prepareGround,
  rampFn,
  rasterAt,
  rasterFill,
  segmentsCross,
  smoothEdges,
  streetSurfaceKind,
  vegetationMask,
  type LampSpec,
} from "../ground";

const ASSETS = path.join(process.cwd(), "public/assets/guide/3d");
const readJson = <T,>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ASSETS, rel), "utf8")) as T;

const square = (x0: number, z0: number, s: number): V2[] => [
  [x0, z0],
  [x0, z0 + s],
  [x0 + s, z0 + s],
  [x0 + s, z0],
];

/** A flat synthetic terrain (height `f(x, z)`) for the height-model tests. */
function syntheticTerrain(f: (x: number, z: number) => number): Terrain {
  const res = 0.5;
  const w = 81;
  const h = 81;
  const meta: TerrainMeta = {
    version: 1,
    file: "",
    width: w,
    height: h,
    resolution: res,
    extent: { minX: -20, maxX: 20.5, minZ: -20, maxZ: 20.5 },
    scale: 0.001,
    offset: -10,
    minY: 0,
    maxY: 0,
    source: "",
    licence: "",
  };
  const values = new Float64Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) values[j * w + i] = (f(-20 + (i + 0.5) * res, -20 + (j + 0.5) * res) + 10) / 0.001;
  return createTerrain(meta, values);
}

describe("polygon helpers", () => {
  it("clips rings to boxes (convex and concave)", () => {
    const sq = square(0, 0, 10);
    expect(Math.abs(ringArea(clipRingToBox(sq, 2, 2, 4, 5)))).toBeCloseTo(6, 6);
    expect(clipRingToBox(sq, 20, 20, 30, 30)).toHaveLength(0);
    // An L-shape: the clip keeps only the arm inside the box.
    const L: V2[] = [
      [0, 0],
      [0, 10],
      [10, 10],
      [10, 8],
      [2, 8],
      [2, 0],
    ];
    expect(Math.abs(ringArea(clipRingToBox(L, 0, 0, 10, 10)))).toBeCloseTo(Math.abs(ringArea(L)), 6);
    expect(Math.abs(ringArea(clipRingToBox(L, 4, 0, 10, 10)))).toBeCloseTo(12, 6);
  });

  it("bridges holes into one ring with the right area", () => {
    const outer = square(0, 0, 10);
    const hole = square(3, 3, 2);
    const ring = bridgeHoles(outer, [hole]);
    expect(Math.abs(ringArea(ring))).toBeCloseTo(100 - 4, 6);
  });

  it("detects proper segment crossings only", () => {
    expect(segmentsCross([0, 0], [2, 2], [0, 2], [2, 0])).toBe(true);
    expect(segmentsCross([0, 0], [1, 1], [1, 1], [2, 0])).toBe(false);
    expect(segmentsCross([0, 0], [1, 0], [0, 1], [1, 1])).toBe(false);
  });

  it("finds the longest edge's direction", () => {
    const thin: V2[] = [
      [0, 0],
      [0, 1],
      [10, 1],
      [10, 0],
    ];
    expect(Math.abs(Math.cos(dominantAngle(thin)))).toBeCloseTo(1, 6);
  });

  it("offsets and buffers polylines", () => {
    const line: V2[] = [
      [0, 0],
      [10, 0],
    ];
    // Left of +x travel (with +z south) is −z.
    expect(offsetPolyline(line, 2)[0][1]).toBeCloseTo(-2, 6);
    expect(Math.abs(ringArea(bufferPolyline(line, 3)))).toBeCloseTo(30, 6);
  });

  it("densifies keeping the original vertices", () => {
    const pts = densify(
      [
        [0, 0],
        [10, 0],
        [10, 1],
      ],
      3,
    );
    expect(pts[0].p).toEqual([0, 0]);
    expect(pts.some((q) => q.p[0] === 10 && q.p[1] === 0)).toBe(true);
    for (let i = 1; i < pts.length; i++) expect(Math.hypot(pts[i].p[0] - pts[i - 1].p[0], pts[i].p[1] - pts[i - 1].p[1])).toBeLessThanOrEqual(3 + 1e-9);
    expect(pts[pts.length - 1].s).toBeCloseTo(11, 6);
  });
});

describe("hero footprint cut", () => {
  it("subtracts a convex polygon exactly", () => {
    const sq = square(0, 0, 10);
    const tri: V2[] = [
      [2, 2],
      [2, 6],
      [6, 2],
    ];
    const rest = subtractConvex(sq, tri);
    expect(rest.reduce((s, p) => s + Math.abs(ringArea(p)), 0)).toBeCloseTo(100 - 8, 9);
    // A clipper that misses leaves the ring whole; one that covers it leaves nothing.
    expect(subtractConvex(sq, square(20, 20, 1)).reduce((s, p) => s + Math.abs(ringArea(p)), 0)).toBeCloseTo(100, 9);
    expect(subtractConvex(square(1, 1, 1), square(0, 0, 10))).toHaveLength(0);
  });

  it("keeps the parts of lines outside", () => {
    const inside = (x: number) => x > 4 && x < 6;
    const runs = linesOutside(
      [
        [0, 0],
        [10, 0],
      ],
      inside,
    );
    expect(runs).toHaveLength(2);
    expect(Math.max(...runs[0].map((p) => p[0]))).toBeLessThanOrEqual(4);
    expect(Math.min(...runs[1].map((p) => p[0]))).toBeGreaterThanOrEqual(6);
  });
});

describe("rasters and the vegetation mask", () => {
  it("scan-converts rings and erodes masks", () => {
    const r = makeRaster({ minX: 0, maxX: 10, minZ: 0, maxZ: 10 }, 0.5);
    rasterFill(r, square(2, 2, 4), (k) => (r.data[k] |= 1));
    expect(rasterAt(r, 4, 4)).toBe(1);
    expect(rasterAt(r, 1, 1)).toBe(0);
    let n = 0;
    for (const v of r.data) n += v;
    expect(n * 0.25).toBeCloseTo(16, 6);
    const eroded = erodeBit(r, 1, 1);
    expect(eroded.reduce((s, v) => s + v, 0) * 0.25).toBeCloseTo(9, 6);
  });

  it("round-trips run-length masks and decodes the traced vegetation", () => {
    const mask = Uint8Array.from({ length: 700 }, (_, i) => (Math.sin(i * 0.37) > 0.3 || i % 97 < 70 ? 1 : 0));
    expect([...decodeRunMask(encodeRunMask(mask, 70, 10), 70, 10)]).toEqual([...mask]);
    const veg = vegetationMask();
    expect(veg.data.length).toBe(veg.w * veg.h);
    const share = veg.data.reduce((s, v) => s + v, 0) / veg.data.length;
    // About an eighth of the terrain extent is planted (lawns, embankments).
    expect(share).toBeGreaterThan(0.08);
    expect(share).toBeLessThan(0.25);
  });
});

describe("kerb-aware height model", () => {
  // A kerb along x = 0: footway (x < 0) 0.12 m above the carriageway, smeared over 1 m like the DTM.
  const terrain = syntheticTerrain((x) => (x < -0.5 ? 0.12 : x > 0.5 ? 0 : 0.06 - x * 0.12));
  const kerbs = new KerbField([{ ax: 0, az: -10, bx: 0, bz: 10, nx: -1, nz: 0 }]);
  const h = createHeightModel(terrain, kerbs);

  it("gives each side its own level right up to the kerb line", () => {
    expect(h.y(-0.05, 0, "high")).toBeCloseTo(0.12, 2);
    expect(h.y(0.05, 0, "low")).toBeCloseTo(0, 2);
    // Away from kerbs it is the DTM.
    expect(h.y(-5, 0)).toBeCloseTo(0.12, 3);
    expect(h.y(5, 0)).toBeCloseTo(0, 3);
  });

  it("honours sinks and floors", () => {
    const h2 = createHeightModel(
      terrain,
      kerbs,
      () => 0.3,
      () => 1.5,
    );
    expect(h2.y(5, 5)).toBeCloseTo(1.2, 3);
  });

  it("drapes polygons watertight on the model", () => {
    const buf = new MeshBuf();
    drapeRing(buf, square(-4, -4, 8), { cell: 2, y: (x, z) => h.y(x, z), n: () => [0, 1, 0], skirt: 0 });
    // 4 × 4 whole cells → 25 shared vertices, 32 triangles.
    expect(buf.vertexCount).toBe(25);
    expect(buf.idx.length / 3).toBe(32);
    // Every triangle faces up (positive y normal from its winding).
    for (let i = 0; i < buf.idx.length; i += 3) {
      const [a, b, c] = [buf.idx[i], buf.idx[i + 1], buf.idx[i + 2]].map((k) => [buf.pos[k * 3], buf.pos[k * 3 + 1], buf.pos[k * 3 + 2]]);
      const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      expect(ny).toBeGreaterThan(0);
    }
  });

  it("drapes concave rings with a skirt", () => {
    const buf = new MeshBuf();
    const L: V2[] = [
      [0, 0],
      [0, 5],
      [5, 5],
      [5, 4],
      [1, 4],
      [1, 0],
    ];
    drapeRing(buf, L, { cell: 2, y: () => 1, n: () => [0, 1, 0], skirt: 0.2 });
    let area = 0;
    for (let i = 0; i < buf.idx.length; i += 3) {
      const [a, b, c] = [buf.idx[i], buf.idx[i + 1], buf.idx[i + 2]].map((k) => [buf.pos[k * 3], buf.pos[k * 3 + 1], buf.pos[k * 3 + 2]]);
      if (a[1] === 1 && b[1] === 1 && c[1] === 1) area += Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0])) / 2;
    }
    expect(area).toBeCloseTo(9, 6);
    expect(buf.pos.some((v, i) => i % 3 === 1 && Math.abs(v - 0.8) < 1e-9)).toBe(true);
  });

  it("builds planar ramps", () => {
    const r = rampFn({ from: [0, 0], to: [10, 0], y0: 0, y1: -2 });
    expect(r.y(5, 3)).toBeCloseTo(-1, 9);
    expect(r.y(-5, 0)).toBe(0);
    expect(r.n[0]).toBeGreaterThan(0);
  });
});

describe("surface classes", () => {
  it("maps the street register's parts and surfaces", () => {
    expect(streetSurfaceKind({ part: "carriageway", surface: "asphalt" })).toBe("road");
    expect(streetSurfaceKind({ part: "footway", surface: "concrete_slab" })).toBe("slabs");
    expect(streetSurfaceKind({ part: "shared_path", surface: "asphalt" })).toBe("footway");
    expect(streetSurfaceKind({ part: "cycle_lane", surface: "asphalt_red" })).toBe("red");
    expect(streetSurfaceKind({ part: "verge", surface: "fieldstone" })).toBe("setts");
    expect(streetSurfaceKind({ part: "bridge", surface: "wood" })).toBe("deck");
    expect(streetSurfaceKind({ part: "steps", surface: "metal" })).toBeNull();
  });

  it("maps OSM areas and ways", () => {
    expect(osmAreaKind("parking")).toBe("yard");
    expect(osmAreaKind("platform")).toBe("platform");
    expect(osmAreaKind("grass")).toBeNull();
    expect(osmRoadKind("secondary")).toBe("road");
    expect(osmRoadKind("footway", "paving_stones")).toBe("slabs");
    expect(osmRoadKind("footway", "gravel")).toBeNull();
    expect(osmRoadKind("steps")).toBeNull();
  });
});

describe("road markings", () => {
  it("dashes 1 m on, 3 m off", () => {
    const d = dashes(
      [
        [0, 0],
        [20, 0],
      ],
      1,
      3,
    );
    expect(d).toHaveLength(5);
    for (const seg of d) expect(Math.hypot(seg[1][0] - seg[0][0], seg[1][1] - seg[0][1])).toBeCloseTo(1, 6);
  });

  it("outlines lane arrows as simple polygons ≈5 m long", () => {
    for (const shape of ["through", "left", "right", "throughRight", "throughLeft"] as const) {
      const ring = arrowOutline(shape, [0, 0], [0, -1]);
      expect(Math.abs(ringArea(ring))).toBeGreaterThan(0.6);
      const zs = ring.map((p) => p[1]);
      expect(Math.max(...zs) - Math.min(...zs)).toBeLessThanOrEqual(5.01);
    }
  });

  it("smooths lane edges past kerb flares", () => {
    const v = Array.from({ length: 40 }, (_, i) => (i > 33 ? 9 : 6.3));
    const s = smoothEdges(v);
    expect(s[39]).toBeCloseTo(6.3, 6);
    expect(s[10]).toBeCloseTo(6.3, 6);
  });
});

describe("street-light pools", () => {
  it("peaks under the luminaire and falls off", () => {
    const lamp: LampSpec = { at: [0, 0], y: 0, style: "path", head: [0, 4.4, 0], bearing: 0, lux: 0.01, kelvin: 4000 };
    const ext = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
    const m = buildPoolMap([lamp], ext, 1);
    const at = (x: number, z: number) => {
      const i = Math.floor(x - ext.minX);
      const j = Math.floor(z - ext.minZ);
      const k = (j * m.w + i) * 4;
      return (0.2126 * m.data[k] + 0.7152 * m.data[k + 1] + 0.0722 * m.data[k + 2]) / 255 * POOL_SCALE;
    };
    expect(at(0.5, 0.5)).toBeGreaterThan(0.0085);
    expect(at(0.5, 0.5)).toBeLessThan(0.0115);
    expect(at(6.5, 0.5)).toBeLessThan(at(2.5, 0.5));
    expect(at(19.5, 19.5)).toBe(0);
  });
});

describe("campus data", () => {
  const campus = readJson<CampusData>("data/campus.json");
  const streets = readJson<StreetsData>("data/streets.json");
  let terrain: Terrain;
  beforeAll(async () => {
    const meta = readJson<TerrainMeta>("terrain/dtm.json");
    const png = await decodePng(new Uint8Array(fs.readFileSync(path.join(ASSETS, "terrain/dtm.png"))), (d) => new Uint8Array(zlib.inflateSync(d)));
    terrain = createTerrain(meta, png.data);
  });

  it("keeps every view and target camera a metre clear of the camera volumes", () => {
    // The orbit pushes a camera that starts inside a building volume onto the roof (nav/orbit.ts).
    const volumes = buildingVolumes(campus, readJson<Lod2Data>("data/lod2.json"));
    const cams: [string, V3][] = [];
    const add = (name: string, v: CameraView) => {
      cams.push([name, v.position]);
      if (v.portrait?.position) cams.push([`${name} (portrait)`, v.portrait.position]);
    };
    for (const [key, v] of Object.entries(GROUND_VIEWS)) add(key, v);
    for (const t of GROUND_TARGETS) add(t.id, t.view);
    expect(cams.length).toBeGreaterThanOrEqual(7);
    const near = (x: number, z: number, ring: readonly V2[]) => {
      if (pointInRing([x, z], ring)) return true;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [ax, az] = ring[j];
        const ex = ring[i][0] - ax;
        const ez = ring[i][1] - az;
        const l2 = ex * ex + ez * ez || 1;
        const u = Math.min(1, Math.max(0, ((x - ax) * ex + (z - az) * ez) / l2));
        if (Math.hypot(ax + ex * u - x, az + ez * u - z) < 1) return true;
      }
      return false;
    };
    const inside: string[] = [];
    for (const [name, [x, y, z]] of cams)
      for (const v of volumes) if (y <= v.top + 1 && y >= v.bottom && near(x, z, v.polygon)) inside.push(`${name} in ${v.building}`);
    expect(inside).toEqual([]);
  });

  it("prepares surfaces, breaklines and real levels", () => {
    const plan = prepareGround(campus, streets, terrain);
    expect(plan.surfaces.length).toBeGreaterThan(400);
    // Kerbs: most carriageway edges carry a real upstand (SPEC §2.2: ≈0.12 m); raised path edges join them.
    const kerbs = plan.kerbField.segs.filter((sg) => sg.reach === undefined);
    const steps = kerbs.map((k) => {
      const mx = (k.ax + k.bx) / 2;
      const mz = (k.az + k.bz) / 2;
      return plan.heights.y(mx + k.nx * 0.1, mz + k.nz * 0.1, "high") - plan.heights.y(mx - k.nx * 0.1, mz - k.nz * 0.1, "low");
    });
    // (A point near a corner can belong to the neighbouring kerb: allow a few.)
    expect(steps.filter((st) => st < -0.01).length / steps.length).toBeLessThan(0.03);
    expect(steps.filter((st) => st > 0.04 && st < 0.3).length / steps.length).toBeGreaterThan(0.6);
    expect(plan.kerbField.segs.some((sg) => sg.reach === 0.5)).toBe(true);
    // The entrance recess is flush with the pavement (y −0.10…0.00, SPEC §1.2).
    expect(plan.heights.y(-27.6, -17)).toBeGreaterThan(-0.2);
    expect(plan.heights.y(-27.6, -17)).toBeLessThan(0.1);
    // Jussin aukio: lower plaza ≈ +0.5, upper deck ≈ +2.1.
    expect(plan.heights.y(50, 10)).toBeGreaterThan(0.2);
    expect(plan.heights.y(75, 5)).toBeGreaterThan(1.7);
    // The garage-tunnel fill keeps the deck over the opening.
    expect(plan.heights.y(81.5, -24.5)).toBeGreaterThan(1.6);
    // Same object on a second call (shared with world/landscape.ts).
    expect(prepareGround(campus, streets, terrain)).toBe(plan);
  });

  it("cuts the hero footprints exactly (Joki, BioCity, EduCity) but keeps arcades and pilotis open", () => {
    const cut = heroCut(campus);
    const area = (role: string) => {
      const b = campus.buildings.find((x) => x.role === role)!;
      return Math.abs(ringArea(b.polygon));
    };
    const pieceArea = cut.pieces.reduce((s, p) => s + Math.abs(ringArea(p)), 0);
    const total = area("joki") + area("biocity") + area("educity");
    // BioCity's arcades and pilotis (min_level 1) stay outside the cut.
    expect(pieceArea).toBeLessThan(total - 50);
    expect(pieceArea).toBeGreaterThan(total * 0.9);
    // Where the Joki agent found terrain and a railing inside Joki (lounge in the drum, Aula glazing, Aula).
    for (const [x, z] of [
      [67.18, 17.16],
      [65.15, 19.63],
      [48.89, 25.83],
      [47.95, 26.21],
      [30.06, 36.08],
      [28.9, 36.3],
    ] as V2[])
      expect(cut.inside(x, z)).toBe(true);
    // The pilotis under BioCity's glass tower, the recess and Tykistökatu are outside.
    expect(cut.inside(-36.4, -6.5)).toBe(false);
    expect(cut.inside(-27.6, -17)).toBe(false);
    expect(cut.inside(-40, -30)).toBe(false);
    // A cell straddling Joki's wall keeps exactly its outside part.
    const cell: V2[] = square(40, 27, 4);
    const kept = cut.subtract(cell).reduce((s, p) => s + Math.abs(ringArea(p)), 0);
    expect(kept).toBeGreaterThan(0.5);
    expect(kept).toBeLessThan(15.5);
    for (const p of cut.subtract(cell)) for (const q of p) expect(cut.inside(q[0], q[1], 0.01)).toBe(false);
  });

  it("builds every ground mesh with finite positions and unit normals (no NaN shading)", () => {
    const g = buildGroundGeometry(campus, streets, terrain, "ultra");
    const all: [string, import("three").BufferGeometry][] = [
      ...g.surfaces.map((s): [string, import("three").BufferGeometry] => [`surface-${s.group}`, s.geometry]),
      ...g.parts.map((p): [string, import("three").BufferGeometry] => [`part-${p.name}`, p.geometry]),
      ["terrain", g.terrain],
      ["far", g.far],
      ...(g.kerbs ? [["kerbs", g.kerbs] as [string, import("three").BufferGeometry]] : []),
      ...(g.markings ? [["markings", g.markings] as [string, import("three").BufferGeometry]] : []),
    ];
    expect(all.length).toBeGreaterThan(12);
    // Plain typed-array loops: millions of vertices, one expect per mesh.
    for (const [name, geo] of all) {
      const pos = geo.getAttribute("position").array as Float32Array;
      const nor = geo.getAttribute("normal").array as Float32Array;
      const count = pos.length / 3;
      expect(count).toBeGreaterThan(0);
      let badPos = 0;
      let badNor = 0;
      for (let i = 0; i < pos.length; i += 3) {
        if (!Number.isFinite(pos[i]) || !Number.isFinite(pos[i + 1]) || !Number.isFinite(pos[i + 2])) badPos++;
        const l = Math.hypot(nor[i], nor[i + 1], nor[i + 2]);
        if (!(Math.abs(l - 1) < 0.01)) badNor++;
      }
      let badIdx = 0;
      const idx = geo.getIndex()?.array;
      if (idx) for (let i = 0; i < idx.length; i++) if (!(idx[i] < count)) badIdx++;
      expect(`${name}: ${badPos} bad positions, ${badNor} bad normals, ${badIdx} bad indices`).toBe(`${name}: 0 bad positions, 0 bad normals, 0 bad indices`);
    }
    // Nothing of the ground inside Joki's Company Lounge (drum) or the Aula.
    const probes: V2[] = [
      [67.18, 17.16],
      [48.89, 25.83],
      [30.06, 36.08],
    ];
    const hits: string[] = [];
    for (const [name, geo] of all) {
      const pos = geo.getAttribute("position").array as Float32Array;
      const idx = geo.getIndex()?.array;
      const n = idx ? idx.length : pos.length / 3;
      for (let t = 0; t < n; t += 3) {
        const a = (idx ? idx[t] : t) * 3;
        const b = (idx ? idx[t + 1] : t + 1) * 3;
        const c = (idx ? idx[t + 2] : t + 2) * 3;
        const minX = Math.min(pos[a], pos[b], pos[c]);
        const maxX = Math.max(pos[a], pos[b], pos[c]);
        const minZ = Math.min(pos[a + 2], pos[b + 2], pos[c + 2]);
        const maxZ = Math.max(pos[a + 2], pos[b + 2], pos[c + 2]);
        for (const [px, pz] of probes) {
          if (px < minX || px > maxX || pz < minZ || pz > maxZ) continue;
          const d = (i: number, j: number) => (px - pos[j]) * (pos[i + 2] - pos[j + 2]) - (pos[i] - pos[j]) * (pz - pos[j + 2]);
          const d1 = d(a, b);
          const d2 = d(b, c);
          const d3 = d(c, a);
          const inside = !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
          // Vertical faces (walls, kerbs) have zero plan area: only flat-ish triangles count.
          if (inside && Math.abs(d1) + Math.abs(d2) + Math.abs(d3) > 1e-6) hits.push(`${name} at (${px}, ${pz})`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("sanitizes degenerate normals and NaN positions", () => {
    const pos = [0, 0, 0, 1, 0, 0, 0, 0, 1, NaN, 0, 0];
    const nor = [0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 0];
    const idx = [0, 2, 1, 0, 1, 3];
    const r = sanitizeMesh(pos, nor, idx);
    expect(r.droppedTris).toBe(1);
    expect(idx).toEqual([0, 2, 1]);
    for (let i = 0; i < 3; i++) expect(Math.hypot(nor[i * 3], nor[i * 3 + 1], nor[i * 3 + 2])).toBeCloseTo(1, 6);
    // The face (0,0,0)-(0,0,1)-(1,0,0) faces +y.
    expect(nor[1]).toBeCloseTo(1, 6);
  });

  it("paints markings on Tykistökatu", () => {
    const plan = prepareGround(campus, streets, terrain);
    const carr = new CarriagewayIndex(streets.areas.filter((a) => a.part === "carriageway").map((a) => a.poly));
    const buf = buildMarkings({ campus, streets, heights: plan.heights, carr });
    expect(buf.idx.length / 3).toBeGreaterThan(2000);
    // Some paint lies on the BioCity stretch of Tykistökatu.
    let near = 0;
    for (let i = 0; i < buf.pos.length; i += 3) if (Math.hypot(buf.pos[i] + 33, buf.pos[i + 2] + 36) < 6) near++;
    expect(near).toBeGreaterThan(20);
  });

  it("keeps the traced hero surfaces valid", () => {
    for (const h of [...HERO_SURFACES, ...HERO_PLANTERS]) {
      expect(h.ring.length).toBeGreaterThanOrEqual(3);
      expect(Math.abs(ringArea(h.ring))).toBeGreaterThan(1);
      for (const [x, z] of h.ring) {
        expect(x).toBeGreaterThan(-60);
        expect(x).toBeLessThan(280);
        expect(z).toBeGreaterThan(-90);
        expect(z).toBeLessThan(160);
      }
    }
  });

  it("styles every street light", () => {
    const lamps = lampSpecs(streets, terrain);
    expect(lamps.length).toBeGreaterThan(streets.lamps.length);
    expect(lamps.some((l) => l.style === "street")).toBe(true);
    expect(lamps.some((l) => l.style === "lantern")).toBe(true);
    for (const l of lamps) {
      expect(l.head[1] - l.y).toBeGreaterThan(3.5);
      expect(Number.isFinite(l.head[0] + l.head[2])).toBe(true);
    }
    // With the campus: linear luminaires under the Kupittaa platform canopies, between the columns.
    const withCanopies = lampSpecs(streets, terrain, campus);
    const canopy = withCanopies.filter((l) => l.style === "canopy");
    expect(canopy.length).toBeGreaterThan(6);
    expect(withCanopies.length).toBe(lamps.length + canopy.length);
    for (const l of canopy) {
      // Platform canopy soffit ≈ 3–6 m over the platform, near the station (SPEC §4.5).
      expect(l.head[1] - l.y).toBeGreaterThan(2.5);
      expect(l.head[1] - l.y).toBeLessThan(7);
      expect(Math.hypot(l.at[0] - 212, l.at[1] + 122)).toBeLessThan(160);
    }
  });
});
