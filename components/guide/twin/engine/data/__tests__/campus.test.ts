import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {
  anchorFractions,
  buildingVolumes,
  volumeAt,
  CAMPUS_DATA_VERSION,
  FETCH_STALL_MS,
  campusBuilding,
  createTerrain,
  DATA_ATTRIBUTION,
  decodePng,
  inflateZlib,
  loadCampus,
  loadLod2,
  loadRoutes,
  loadStreets,
  loadTerrain,
  resetCampusDataCache,
  routeLegs,
  type BuildingRole,
  type CampusData,
  type Lod2Data,
  type RoutesData,
  type StreetsData,
  type Terrain,
  type TerrainMeta,
} from "../campus";
import type { V2 } from "../../types";

/**
 * The generated campus data (public/assets/guide/3d) — read from disk, and
 * through the real loaders with fetch mocked onto the same files.
 */

const PUBLIC = path.join(process.cwd(), "public");
const ASSETS = path.join(PUBLIC, "assets/guide/3d");
const readJson = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ASSETS, rel), "utf8")) as T;

const campus = readJson<CampusData>("data/campus.json");
const lod2 = readJson<Lod2Data>("data/lod2.json");
const streets = readJson<StreetsData>("data/streets.json");
const routes = readJson<RoutesData>("data/routes.json");
const terrainMeta = readJson<TerrainMeta>("terrain/dtm.json");
const dtmPng = new Uint8Array(fs.readFileSync(path.join(ASSETS, "terrain/dtm.png")));

/** Shoelace over (x, z): negative = counter-clockwise seen from above (+y). */
const shoelace = (ring: V2[]) => {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % ring.length];
    s += x1 * z2 - x2 * z1;
  }
  return s / 2;
};
const isTenth = (v: number) => Math.abs(v * 10 - Math.round(v * 10)) < 1e-6;
const nodeInflate = (data: Uint8Array) => new Uint8Array(zlib.inflateSync(data));

let terrain: Terrain;
beforeAll(async () => {
  const png = await decodePng(dtmPng, nodeInflate);
  terrain = createTerrain(terrainMeta, png.data);
});

describe("generated files", () => {
  it("share the loader's format version and carry the attribution", () => {
    for (const data of [campus, lod2, streets, routes, terrainMeta]) expect(data.version).toBe(CAMPUS_DATA_VERSION);
    expect(campus.attribution).toBe(DATA_ATTRIBUTION);
    expect(lod2.licence).toContain("Turun kaupunki");
    expect(streets.licence).toContain("OpenStreetMap");
    expect(terrainMeta.licence).toContain("CC BY 4.0");
  });

  it("stay small: JSON under 2.5 MB, the heightfield under 1.5 MB", () => {
    const json = ["campus", "lod2", "streets", "routes"].reduce(
      (n, f) => n + fs.statSync(path.join(ASSETS, `data/${f}.json`)).size,
      0,
    );
    expect(json).toBeLessThan(2.5 * 1024 * 1024);
    expect(dtmPng.length).toBeLessThan(1.5 * 1024 * 1024);
  });

  it("use the shared frame and cover the terrain extent", () => {
    expect(campus.origin).toEqual({ lat: 60.44932, lon: 22.29326 });
    const e = terrainMeta.extent;
    expect(campus.bounds.minX).toBeCloseTo(e.minX, 1);
    expect(campus.bounds.maxX).toBeCloseTo(e.maxX, 1);
    expect(campus.bounds.minZ).toBeCloseTo(e.minZ, 1);
    expect(campus.bounds.maxZ).toBeCloseTo(e.maxZ, 1);
    expect(e.maxX - e.minX).toBeCloseTo(terrainMeta.width * terrainMeta.resolution, 1);
  });
});

describe("campus.json", () => {
  it("has the OSM campus in useful numbers", () => {
    expect(campus.buildings.length).toBeGreaterThanOrEqual(60);
    expect(campus.roads.length).toBeGreaterThanOrEqual(400);
    expect(campus.areas.length).toBeGreaterThanOrEqual(200);
    expect(campus.entrances.length).toBeGreaterThanOrEqual(50);
    expect(campus.trees.length).toBeGreaterThanOrEqual(250);
    expect(campus.lamps.length).toBeGreaterThanOrEqual(100);
    expect(campus.railway.length).toBeGreaterThan(0);
  });

  it("stores rings counter-clockwise from above, unclosed, rounded to 0.1 m", () => {
    const rings: V2[][] = [
      ...campus.buildings.flatMap((b) => [b.polygon, ...(b.parts ?? []).map((p) => p.polygon)]),
      ...campus.areas.map((a) => a.polygon),
    ];
    for (const ring of rings) {
      expect(ring.length).toBeGreaterThanOrEqual(3);
      expect(shoelace(ring)).toBeLessThan(0);
      const [a, b] = [ring[0], ring[ring.length - 1]];
      expect(a[0] === b[0] && a[1] === b[1]).toBe(false);
      for (const [x, z] of ring) expect(isTenth(x) && isTenth(z)).toBe(true);
    }
  });

  it("keeps every building and road inside the data extent", () => {
    const { minX, maxX, minZ, maxZ } = campus.bounds;
    const inside = ([x, z]: V2) => x >= minX - 60 && x <= maxX + 60 && z >= minZ - 60 && z <= maxZ + 60;
    for (const b of campus.buildings) expect(b.polygon.every(inside)).toBe(true);
    for (const r of campus.roads) {
      expect(
        r.centerline.every(([x, z]) => x >= minX - 0.1 && x <= maxX + 0.1 && z >= minZ - 0.1 && z <= maxZ + 0.1),
      ).toBe(true);
      expect(r.width).toBeGreaterThan(0);
    }
  });

  const HEROES: [BuildingRole, number, string][] = [
    ["biocity", 48381050, "Biocity"],
    ["joki", 625297895, "Vierailu- ja innovaatiokeskus Joki"],
    ["educity", 731925812, "Joukahaisenkatu 7"],
  ];
  it.each(HEROES)("has the hero building %s (OSM way %i)", (role, osmId, name) => {
    const matches = campus.buildings.filter((b) => b.role === role);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ id: `osm-${osmId}`, osmId, name });
    expect(campusBuilding(campus, role)).toBe(matches[0]);
  });

  it("assigns every campus role to exactly one building", () => {
    const roles: BuildingRole[] = [
      "biocity",
      "joki",
      "educity",
      "electrocity",
      "eurocity",
      "pharmacity",
      "datacity",
      "ict-city",
      "parkcity",
      "civilcity",
      "station",
    ];
    for (const role of roles) expect(campus.buildings.filter((b) => b.role === role)).toHaveLength(1);
  });

  it("gives buildings measured heights (BioCity's technical storey, EduCity's plant room, ParkCity)", () => {
    const b = campusBuilding(campus, "biocity")!;
    expect(b.heightSource).toBe("lod2");
    expect(b.roofY).toBeCloseTo(30.68, 1); // technical storey roof, N2000 53.88
    expect(b.topY).toBeCloseTo(33.87, 1); // barrel vault crown, N2000 57.07
    expect(campusBuilding(campus, "educity")!.topY).toBeCloseTo(37.34, 1); // plant room, N2000 60.54
    expect(campusBuilding(campus, "parkcity")!.roofY).toBeCloseTo(34.71, 1); // LOD1 57.91 (SPEC §3.4)
    for (const x of campus.buildings) {
      expect(x.height).toBeGreaterThan(0);
      expect(x.roofY! - x.groundY!).toBeCloseTo(x.height, 0);
    }
  });

  it("measures buildings without LOD2 on the laser DSM and lifts canopies off the ground", () => {
    const intelligate = campus.buildings.find((b) => b.osmId === 9166253)!;
    expect(intelligate.heightSource).toBe("dsm");
    expect(intelligate.height).toBeGreaterThan(28); // 6 storeys of office ≈ 31 m, not 6 × 3.6
    const canopies = campus.buildings.filter((b) => b.use === "roof");
    expect(canopies.length).toBeGreaterThanOrEqual(5);
    for (const c of canopies) {
      expect(c.baseY).toBeDefined();
      expect(c.baseY!).toBeGreaterThanOrEqual(c.groundY! + 2.2 - 0.01);
      expect(c.baseY!).toBeLessThan(c.roofY!);
      expect(c.minHeight).toBeCloseTo(c.baseY! - c.groundY!, 1);
    }
    // Kupittaa platform canopy: well above the platform (y ≈ −4.75), so the tour walks under it.
    const platform = campus.buildings.find((b) => b.osmId === 526090188)!;
    expect(platform.baseY!).toBeGreaterThan(-4.75 + 3);
  });

  it("keeps BioCity's overhang parts (arcades, glass corner tower) with their min_level", () => {
    const parts = campusBuilding(campus, "biocity")!.parts ?? [];
    expect(
      parts
        .filter((p) => p.minLevel === 1)
        .map((p) => p.osmId)
        .sort(),
    ).toEqual([580071163, 1328195307, 1328195308, 1328195311].sort());
  });

  it("places the event entrances per the CAD plans, with threshold levels", () => {
    const at = (id: string) => campus.entrances.find((e) => e.id === id)!;
    expect(at("entrance-biocity-tykistokatu")).toMatchObject({
      at: [-24.51, -11.75],
      y: 0.06,
      facing: 325,
      target: "entrance-biocity-tykistokatu",
      building: "osm-48381050",
    });
    expect(at("entrance-biocity-courtyard")).toMatchObject({ at: [22.69, -8.01], y: 0.06, facing: 55 });
    expect(at("entrance-educity-west")).toMatchObject({ at: [177.8, 115.1], y: 3.4 });
    expect(at("entrance-educity-east")).toMatchObject({ at: [204.0, 136.5], y: 3.4 });
    expect(at("entrance-educity-b")).toMatchObject({ at: [237.3, 109.0], y: 3.4 });
    expect(at("entrance-educity-gateway")).toMatchObject({ at: [196.9, 76.8], y: -1.55 });
    expect(at("entrance-joki-street")).toMatchObject({ at: [8.58, 50.94], y: -1.7, building: "osm-625297895" });
    // The OSM nodes for the same doors are replaced, not duplicated.
    expect(campus.entrances.some((e) => e.id === "osm-11432405620")).toBe(false);
    expect(new Set(campus.entrances.map((e) => e.id)).size).toBe(campus.entrances.length);
  });

  it("lists the outdoor route legs in 2D for the tours", () => {
    for (const [id, line] of Object.entries(campus.routes)) {
      expect(routes.legs[id]?.mode).toBe("outdoor");
      expect(line.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("lod2.json", () => {
  it("covers the context ring with roofs from the City of Turku model", () => {
    expect(lod2.buildings.length).toBeGreaterThanOrEqual(55);
    expect(new Set(lod2.buildings.map((b) => b.id)).size).toBe(lod2.buildings.length);
    for (const b of lod2.buildings) {
      expect(b.baseY).toBeLessThanOrEqual(b.groundY + 0.01 + (b.prt === "103430220P" ? 10 : 0));
      expect(b.topY).toBeGreaterThanOrEqual(b.roofY - 0.01);
      expect(b.footprint.length).toBeGreaterThan(0);
      expect(b.roofs.length).toBeGreaterThan(0);
      for (const r of b.roofs) {
        expect(shoelace(r.ring)).toBeLessThan(0);
        if (r.ys) expect(r.ys).toHaveLength(r.ring.length);
        else expect(Number.isFinite(r.y)).toBe(true);
      }
    }
  });

  it("marks the hero records so the context ring skips them", () => {
    const claimed = (hero: string) => lod2.buildings.filter((b) => b.claimedBy === hero).map((b) => b.prt ?? b.id);
    expect(claimed("biocity")).toHaveLength(3);
    expect(claimed("biocity")).toEqual(expect.arrayContaining(["103454363H", "103454368N"]));
    expect(claimed("educity")).toEqual(["103650280D"]);
    // Joki is inside DataCity's record: only its hall and tower roofs are claimed.
    const datacity = lod2.buildings.find((b) => b.prt === "103454371S")!;
    expect(datacity.claimedBy).toBeUndefined();
    const joki = datacity.roofs.filter((r) => r.claimedBy === "joki");
    expect(joki.some((r) => r.y === 12.11)).toBe(true); // tower roof N2000 35.31
    expect(joki.some((r) => r.y === 3.22)).toBe(true); // hall roof N2000 26.42
  });

  it("rebuilds sloped roofs as planar faces with per-vertex heights", () => {
    const sloped = lod2.buildings.flatMap((b) => b.roofs.filter((r) => r.ys));
    expect(sloped.length).toBeGreaterThan(100);
    // A gable keeps its ridge: some faces rise more than 2 m.
    expect(sloped.some((r) => Math.max(...r.ys!) - Math.min(...r.ys!) > 2)).toBe(true);
  });

  it("lifts the station hall off the tracks (it stands on a deck over the cutting)", () => {
    const station = lod2.buildings.find((b) => b.role === "station")!;
    expect(station.baseY).toBeGreaterThan(station.groundY + 5);
  });
});

describe("terrain", () => {
  it("decodes the 16-bit heightfield exactly as described in dtm.json", () => {
    expect(terrain.width).toBe(terrainMeta.width);
    expect(terrain.height).toBe(terrainMeta.height);
    expect(terrain.minY).toBeCloseTo(terrainMeta.minY, 2);
    expect(terrain.maxY).toBeCloseTo(terrainMeta.maxY, 2);
  });

  // SPEC §1.2 reference levels (± 0.3 m).
  const REFERENCE = [
    { name: "BioCity Tykistökatu entrance", x: -24.51, z: -11.75, y: 0.0 },
    { name: "EduCity deck door", x: 176.1, z: 108.8, y: 3.4 },
    { name: "Joki street door", x: 8.58, z: 50.94, y: -1.9 },
    { name: "Jussin aukio upper plaza", x: 75, z: 0, y: 2.1 },
    { name: "Jussin aukio lower plaza", x: 48, z: 0, y: 0.4 },
    { name: "Tykistökatu kerb at the recess", x: -35.6, z: -22.0, y: -0.1 },
    { name: "ParkCity street door", x: 215.5, z: 6.2, y: -0.95 },
    { name: "Kupittaa station hall street door", x: 155.4, z: -153.5, y: 2.9 },
    { name: "Joukahaisenkatu zebra at EduCity", x: 236, z: 47, y: -1.6 },
  ];
  it.each(REFERENCE)("$name is at y ≈ $y", ({ x, z, y }) => {
    expect(Math.abs(terrain.heightAt(x, z) - y)).toBeLessThanOrEqual(0.3);
  });

  it("carries the corrections: platform surface, EduCity's walkway, capped hero interiors", () => {
    // Island platform under the canopy: the measured surface (≈ −4.8), not the tracks.
    expect(terrain.heightAt(210, -125)).toBeGreaterThan(-4.95);
    // EduCity south-east walkway at deck level (3.40 − 0.15).
    expect(terrain.heightAt(235, 117)).toBeCloseTo(3.25, 1);
    // Ground inside the hero buildings stays below their floors.
    expect(terrain.heightAt(0, 0)).toBeLessThanOrEqual(0.06 - 0.24); // BioCity lobby
    expect(terrain.heightAt(30, 38)).toBeLessThanOrEqual(-1.7 - 0.24); // Joki Aula
    expect(terrain.heightAt(58.9, 15.9)).toBeLessThanOrEqual(-1.7 - 0.24); // Joki Showroom
  });

  it("interpolates bilinearly between sample centres and clamps at the edges", () => {
    const { minX, minZ } = terrain.extent;
    const res = terrain.resolution;
    const at = (i: number, j: number) => terrain.heights[j * terrain.width + i];
    const x = minX + 500.5 * res;
    const z = minZ + 400.5 * res;
    expect(terrain.heightAt(x, z)).toBeCloseTo(at(500, 400), 5);
    const mid = terrain.heightAt(x + res / 2, z + res / 2);
    expect(mid).toBeCloseTo((at(500, 400) + at(501, 400) + at(500, 401) + at(501, 401)) / 4, 5);
    expect(terrain.heightAt(-1e6, -1e6)).toBeCloseTo(at(0, 0), 5);
    expect(Number.isFinite(terrain.heightAt(Number.NaN, 0))).toBe(true);
    const n = terrain.normalAt(60, 3.7); // Jussin aukio main stair
    expect(Math.hypot(...n)).toBeCloseTo(1, 5);
    expect(n[1]).toBeGreaterThan(0);
  });
});

describe("PNG and zlib decoding (browser fallback path)", () => {
  it("inflates zlib streams like Node (stored, fixed and dynamic blocks)", () => {
    const text = new Uint8Array(Buffer.from("Kupittaa campus — ".repeat(400), "utf8"));
    const noise = Uint8Array.from({ length: 5000 }, (_, i) => (i * 7919) % 251);
    for (const data of [text, noise, new Uint8Array(0)]) {
      for (const level of [0, 1, 9]) {
        const z = new Uint8Array(zlib.deflateSync(data, { level }));
        expect(Array.from(inflateZlib(z))).toEqual(Array.from(data));
      }
    }
    const fixed = new Uint8Array(zlib.deflateSync(text, { strategy: zlib.constants.Z_FIXED }));
    expect(Array.from(inflateZlib(fixed))).toEqual(Array.from(text));
  });

  it("decodes dtm.png with the JS inflater identically to Node's", async () => {
    const js = await decodePng(dtmPng, (z, size) => inflateZlib(z, size));
    const node = await decodePng(dtmPng, nodeInflate);
    expect(js.width).toBe(node.width);
    expect(js.data.length).toBe(node.data.length);
    let same = true;
    for (let i = 0; i < js.data.length; i += 997) if (js.data[i] !== node.data[i]) same = false;
    expect(same).toBe(true);
  });

  it("rejects files that are not PNGs", async () => {
    await expect(decodePng(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]))).rejects.toThrow("Not a PNG");
  });
});

describe("routes.json", () => {
  it("has every tour's legs, connected end to end", () => {
    for (const tour of routes.tours) {
      const legs = routeLegs(routes, tour.legs);
      expect(legs).toHaveLength(tour.legs.length);
      for (let i = 1; i < legs.length; i++) {
        const a = legs[i - 1].points[legs[i - 1].points.length - 1];
        const b = legs[i].points[0];
        expect(Math.hypot(a[0] - b[0], a[2] - b[2])).toBeLessThan(0.6);
      }
      const sum = legs.reduce((n, l) => n + l.lengthM, 0);
      expect(Math.abs(tour.distanceM - sum)).toBeLessThanOrEqual(1);
      expect(tour.minutes).toBeCloseTo(tour.distanceM / routes.walkSpeed / 60, 1);
    }
  });

  it("densifies outdoor legs and gives every point a plausible walking level", () => {
    for (const leg of Object.values(routes.legs)) {
      for (const [x, y, z] of leg.points) {
        expect(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)).toBe(true);
        expect(y).toBeGreaterThan(-6);
        expect(y).toBeLessThan(6);
      }
      if (leg.mode !== "outdoor") continue;
      for (let i = 1; i < leg.points.length; i++) {
        const [ax, ay, az] = leg.points[i - 1];
        const [bx, by, bz] = leg.points[i];
        const run = Math.hypot(bx - ax, bz - az);
        expect(run).toBeLessThanOrEqual(2.05);
        // No cliffs: steeper than a stair (≈ 0.6) only over a short door threshold.
        expect(Math.abs(by - ay) / Math.max(run, 0.3)).toBeLessThan(1.2);
      }
    }
  });

  it("walks the tours' doors at their threshold levels", () => {
    const end = (id: string) => routes.legs[id].points[routes.legs[id].points.length - 1];
    const start = (id: string) => routes.legs[id].points[0];
    expect(end("out-co-kerb-bio-main")[1]).toBeCloseTo(0.06, 2); // BioCity Tykistökatu door
    expect(end("out-xfer-edu-west-bio-event")[1]).toBeCloseTo(0.06, 2); // BioCity event entrance
    expect(start("out-xfer-edu-west-bio-event")[1]).toBeCloseTo(3.4, 2); // EduCity west main entrance
    expect(end("out-arr-train-edu-east")[1]).toBeCloseTo(3.4, 2); // EduCity east main entrance
    expect(end("out-parkcity-gw-zebra")[1]).toBeCloseTo(-1.55, 2); // step-free gateway door
    expect(start("out-arr-train-edu-east")[1]).toBeLessThan(-4.5); // station platform
  });

  it("goes around the glazed box on BioCity's terrace", () => {
    const box: V2[] = [
      [28.8, -5.0],
      [27.5, -7.0],
      [29.7, -8.5],
      [31.1, -6.5],
    ];
    const inside = ([x, z]: V2) => {
      let c = false;
      for (let i = 0, j = box.length - 1; i < box.length; j = i++) {
        const [xi, zi] = box[i];
        const [xj, zj] = box[j];
        if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
      }
      return c;
    };
    for (const id of ["out-xfer-edu-west-bio-event", "out-xfer-bio-event-edu-west", "out-c-deck"]) {
      expect(routes.legs[id].points.some(([x, , z]) => inside([x, z]))).toBe(false);
    }
  });

  it("turns step anchors into caption positions along a tour", () => {
    const tour = routes.tours.find((t) => t.id === "builders-train-checkin")!;
    const path = routeLegs(routes, tour.legs).flatMap((l) => l.points);
    const f = anchorFractions(path, [[218.9, -111.5], [278.5, -25.2], undefined, [251.2, 97.0], [999, 999]]);
    expect(f[0]).toBeCloseTo(0, 3);
    expect(f[1]).toBeGreaterThan(0.2); // the footbridge, ≈ 100 m into 391 m
    expect(f[1]).toBeLessThan(0.35);
    expect(f[2]).toBeGreaterThanOrEqual(f[1]); // no anchor: never before the previous step
    expect(f[3]).toBeCloseTo(276 / 391, 1); // the top of EduCity's outdoor stairs, ≈ 276 m in
    expect(f[4]).toBeGreaterThanOrEqual(f[3]); // off the route: falls back, still in order
    for (let i = 1; i < f.length; i++) expect(f[i]).toBeGreaterThanOrEqual(f[i - 1]);
    expect(anchorFractions([], [undefined, undefined])).toEqual([0, 0.48]);
  });

  it("keeps unanchored steps between their anchored neighbours", () => {
    const line: [number, number, number][] = [
      [0, 0, 0],
      [100, 0, 0],
    ];
    // An even spread would put the middle step at 0.32 — after the third step's anchor (0.1).
    expect(anchorFractions(line, [[0, 0], undefined, [10, 0]])).toEqual([0, 0.05, 0.1]);
    // Leading steps start the route; trailing ones spread out towards its end.
    const f = anchorFractions(line, [undefined, undefined, [50, 0], undefined]);
    expect(f[0]).toBe(0);
    expect(f[1]).toBeCloseTo(0.25, 6);
    expect(f[2]).toBeCloseTo(0.5, 6);
    expect(f[3]).toBeCloseTo(0.73, 6);
  });

  it("measures caption positions along the 3D path, like the tour's progress", () => {
    // A 3 m stair down 1.8 m, then 7 m level: the stair foot is 3.50 m of 10.50 m along.
    const path: [number, number, number][] = [
      [0, 0, 0],
      [3, -1.8, 0],
      [10, -1.8, 0],
    ];
    const [atFoot] = anchorFractions(path, [[3, 0]]);
    expect(atFoot).toBeCloseTo(Math.hypot(3, 1.8) / (Math.hypot(3, 1.8) + 7), 6);
  });

  it("generates the reversed legs from their originals", () => {
    const fwd = routes.legs["int-bio-event-to-lobby"].points;
    const rev = routes.legs["int-bio-lobby-to-event"].points;
    expect(rev).toEqual([...fwd].reverse());
    expect(routes.legs["out-xfer-bio-event-edu-west"].lengthM).toBeCloseTo(
      routes.legs["out-xfer-edu-west-bio-event"].lengthM,
      1,
    );
  });
});

describe("streets.json", () => {
  it("has the street register and base-map layers", () => {
    expect(streets.areas.length).toBeGreaterThan(150);
    expect(streets.edges.length).toBeGreaterThan(100);
    expect(streets.lamps.length).toBeGreaterThan(100);
    expect(streets.trees.length).toBeGreaterThan(250);
    expect(streets.signs.length).toBeGreaterThan(100);
    expect(streets.stairs.length).toBeGreaterThan(10);
    expect(streets.crossings.length).toBeGreaterThan(20);
    for (const a of streets.areas) expect(shoelace(a.poly)).toBeLessThan(0);
    for (const e of streets.edges) for (const p of e.line) expect(Number.isFinite(p[1])).toBe(true);
    for (const s of streets.signs) expect(s.plates.length).toBeGreaterThan(0);
    for (const st of streets.stairs) expect(st.yTop).toBeGreaterThanOrEqual(st.yBottom);
    for (const w of streets.walls) w.line.forEach(([, y], i) => expect(y).toBeGreaterThanOrEqual(w.base[i]));
  });

  it("gives bridge decks a walking level (the terrain below is the railway cutting)", () => {
    const bridges = streets.areas.filter((a) => a.part === "bridge");
    expect(bridges.length).toBeGreaterThan(0);
    for (const b of bridges) expect(Number.isFinite(b.deckY)).toBe(true);
    expect(bridges.find((b) => b.street.startsWith("Kalevansil"))?.deckY).toBe(4.3);
  });

  it("knows the Föli stops by the station and DataCity", () => {
    const refs = streets.busStops.map((b) => b.ref);
    expect(refs).toEqual(expect.arrayContaining(["870", "846", "1046", "1032"]));
  });
});

describe("loaders", () => {
  const realFetch = global.fetch;
  let calls: string[] = [];
  beforeEach(() => {
    resetCampusDataCache();
    calls = [];
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      const file = path.join(PUBLIC, url);
      if (!fs.existsSync(file)) return { ok: false, status: 404 } as Response;
      const buf = fs.readFileSync(file);
      return {
        ok: true,
        status: 200,
        json: async () => JSON.parse(buf.toString("utf8")),
        arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      } as Response;
    }) as typeof fetch;
  });
  afterAll(() => {
    global.fetch = realFetch;
    resetCampusDataCache();
  });

  it("fetch each file once and cache it", async () => {
    const [a, b] = await Promise.all([loadCampus(), loadCampus()]);
    expect(a).toBe(b);
    await loadLod2();
    await loadStreets();
    await loadRoutes();
    expect(calls.sort()).toEqual(
      [
        "/assets/guide/3d/data/campus.json",
        "/assets/guide/3d/data/lod2.json",
        "/assets/guide/3d/data/routes.json",
        "/assets/guide/3d/data/streets.json",
      ].sort(),
    );
    expect(campusBuilding("joki")?.osmId).toBe(625297895);
  });

  it("decode the terrain in the browser path", async () => {
    const t = await loadTerrain();
    expect(Math.abs(t.heightAt(176.1, 108.8) - 3.4)).toBeLessThanOrEqual(0.3);
    expect(calls).toEqual(["/assets/guide/3d/terrain/dtm.json", "/assets/guide/3d/terrain/dtm.png"]);
  });

  it("retry after a failed fetch", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(async () => ({ ok: false, status: 503 }) as Response);
    await expect(loadRoutes()).rejects.toThrow("HTTP 503");
    await expect(loadRoutes()).resolves.toMatchObject({ version: CAMPUS_DATA_VERSION });
  });

  it("refuse campusBuilding(role) before the campus is loaded", () => {
    expect(() => campusBuilding("biocity")).toThrow("loadCampus");
  });

  it("give up on a stalled request with a clear error, and fetch again on the next call", async () => {
    jest.useFakeTimers();
    try {
      let aborted = false;
      (global.fetch as jest.Mock).mockImplementationOnce(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_, reject) => {
            // A connection that never answers (until the loader aborts it).
            init?.signal?.addEventListener("abort", () => {
              aborted = true;
              reject(new Error("aborted"));
            });
          }),
      );
      const stalled = loadRoutes();
      const settled = expect(stalled).rejects.toThrow(/routes\.json stalled/);
      await jest.advanceTimersByTimeAsync(FETCH_STALL_MS + 10);
      await settled;
      expect(aborted).toBe(true);
    } finally {
      jest.useRealTimers();
    }
    // The failure is not cached: the next call (the UI's "Try again") asks the network again.
    await expect(loadRoutes()).resolves.toMatchObject({ version: CAMPUS_DATA_VERSION });
  });
});

describe("buildingVolumes (camera solids)", () => {
  const campusData = JSON.parse(fs.readFileSync(path.join(ASSETS, "data/campus.json"), "utf8")) as CampusData;
  const lod2Data = JSON.parse(fs.readFileSync(path.join(ASSETS, "data/lod2.json"), "utf8")) as Lod2Data;
  const volumes = buildingVolumes(campusData, lod2Data);

  it("cuts Joki into its LOD2 parts: the low hall and the round tower, not the tower's height everywhere", () => {
    const joki = volumes.filter((v) => v.role === "joki");
    expect(joki.map((v) => Math.round(v.top * 100) / 100).sort((a, b) => a - b)).toEqual([3.22, 12.11]);
  });

  it("has every closed building, and none of the canopies, bridges and overhangs on posts", () => {
    const ids = new Set(volumes.map((v) => v.building));
    for (const b of campusData.buildings) {
      const raised = (b.minHeight ?? 0) > 2 || b.baseY !== undefined;
      expect(ids.has(b.id)).toBe(!raised);
    }
    // Footprint-only buildings stop at their main roof (plant rooms are not walls).
    for (const v of volumes) expect(v.top).toBeGreaterThan(v.bottom);
    const noLod2 = campusData.buildings.find((b) => !b.lod2?.length && !b.role && b.roofY !== undefined && b.topY !== undefined && b.topY > b.roofY + 1 && !(b.minHeight ?? 0) && b.baseY === undefined);
    if (noLod2) expect(volumes.find((v) => v.building === noLod2.id)?.top).toBe(noLod2.roofY);
  });

  it("lifts the station hall's volume onto its deck (the camera may pass under it in the cutting)", () => {
    const station = volumes.filter((v) => v.role === "station");
    expect(station.length).toBeGreaterThan(0);
    expect(Math.max(...station.map((v) => v.bottom))).toBeGreaterThan(1.5);
  });

  it("tells where the camera is indoors: inside a hero part below its roof, or below an opened level's ceiling", () => {
    const heroes = ["biocity", "joki", "educity"] as const;
    const joki = volumes.filter((v) => v.role === "joki");
    const hall = joki.reduce((lo, v) => (v.top < lo.top ? v : lo));
    // A point well inside the hall part (its vertex average works for this convex-ish ring).
    const [hx, hz] = hall.polygon.reduce(([sx, sz], [x, z]) => [sx + x / hall.polygon.length, sz + z / hall.polygon.length], [0, 0]);
    expect(volumeAt(volumes, hx, 0, hz, { roles: heroes })?.role).toBe("joki");
    // Above the hall's roof: outdoors.
    expect(volumeAt(volumes, hx, hall.top + 2, hz, { roles: heroes })).toBeNull();
    // Opened at floor 1 with a ceiling at 1.5: the Showroom's eye level is in, a dollhouse view from above is not.
    expect(volumeAt(volumes, hx, 0.5, hz, { roles: heroes, ceilings: { joki: 1.5 } })?.role).toBe("joki");
    expect(volumeAt(volumes, hx, 2.5, hz, { roles: heroes, ceilings: { joki: 1.5 } })).toBeNull();
    // Far from every building.
    expect(volumeAt(volumes, -150, 2, 250, { roles: heroes })).toBeNull();
    // Without roles, any building counts.
    const anyPart = volumes.find((v) => v.role === "datacity")!;
    const [dx, dz] = anyPart.polygon.reduce(([sx, sz], [x, z]) => [sx + x / anyPart.polygon.length, sz + z / anyPart.polygon.length], [0, 0]);
    if (volumeAt(volumes, dx, anyPart.bottom + 1, dz)) expect(volumeAt(volumes, dx, anyPart.bottom + 1, dz, { roles: heroes })?.role ?? null).not.toBe("datacity");
  });

  it("works without the LOD2 file (footprints up to the main roof)", () => {
    const plain = buildingVolumes(campusData, null);
    const joki = plain.filter((v) => v.role === "joki");
    expect(joki).toHaveLength(1);
    expect(joki[0].top).toBeCloseTo(campusData.buildings.find((b) => b.role === "joki")!.roofY!, 6);
  });
});
