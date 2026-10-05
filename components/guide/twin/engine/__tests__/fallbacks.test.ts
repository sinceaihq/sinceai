import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { PLACES_3D, TARGETS_3D } from "@/lib/hackathon-2026/twin";
import { createTerrain, decodePng, type CampusData, type RoutesData, type Terrain, type TerrainMeta } from "../data/campus";
import { FALLBACK_TARGETS, FALLBACK_VIEWS, WALK_START_LEGS, WALK_STARTS, doorStart, legLevel, legStart, pushOutOfRing } from "../fallbacks";
import type { V2, V3 } from "../types";

/**
 * The engine's stand-ins until (or without) the building modules: every view
 * chip and event target must show something sensible, and walk mode must
 * start on open ground — checked against the generated campus data.
 */

const ASSETS = path.join(process.cwd(), "public/assets/guide/3d");
const campus = JSON.parse(fs.readFileSync(path.join(ASSETS, "data/campus.json"), "utf8")) as CampusData;
const terrainMeta = JSON.parse(fs.readFileSync(path.join(ASSETS, "terrain/dtm.json"), "utf8")) as TerrainMeta;

/** Even-odd point in polygon (util.ts has one too, but it pulls in three.js). */
function pointInRing(p: V2, ring: readonly V2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

let terrain: Terrain;
beforeAll(async () => {
  const png = await decodePng(new Uint8Array(fs.readFileSync(path.join(ASSETS, "terrain/dtm.png"))), (d) =>
    Promise.resolve(new Uint8Array(zlib.inflateSync(d))),
  );
  terrain = createTerrain(terrainMeta, png.data);
});

/** Closed buildings (canopies and bridges stand on posts) whose footprint contains p. */
const buildingsAt = (p: V2) =>
  campus.buildings.filter(
    (b) =>
      !(b.minHeight && b.minHeight > 2) &&
      b.baseY === undefined &&
      pointInRing(p, b.polygon) &&
      !(b.holes ?? []).some((h) => pointInRing(p, h)),
  );

/** A camera is inside a building when it is in a footprint below the roof. */
const insideBuilding = ([x, y, z]: V3) =>
  buildingsAt([x, z]).some((b) => y < (b.topY ?? b.roofY ?? (b.groundY ?? 0) + b.height) + 0.5);

describe("fallback views and targets", () => {
  it("give every view of every place something to show", () => {
    for (const place of PLACES_3D) {
      for (const view of place.views) expect(FALLBACK_VIEWS[`${place.id}:${view.id}`]).toBeDefined();
    }
  });

  it("only stand in for real targets", () => {
    const ids = new Set(TARGETS_3D.map((t) => t.id));
    for (const id of Object.keys(FALLBACK_TARGETS)) expect(ids.has(id)).toBe(true);
  });

  it("never put the camera inside a building or under the ground", () => {
    const poses = { ...FALLBACK_VIEWS, ...FALLBACK_TARGETS };
    for (const [key, view] of Object.entries(poses)) {
      const cameras = [view.position, view.portrait?.position].filter((p): p is V3 => !!p);
      for (const p of cameras) {
        expect({ key, inside: insideBuilding(p) }).toEqual({ key, inside: false });
        expect({ key, clearance: p[1] - terrain.heightAt(p[0], p[2]) > 1.2 }).toEqual({ key, clearance: true });
      }
    }
  });
});

describe("walk starts", () => {
  it("stand on open ground inside the terrain, never in a building", () => {
    const { minX, maxX, minZ, maxZ } = terrain.extent;
    for (const [key, start] of Object.entries(WALK_STARTS)) {
      const [x, z] = start.position;
      expect({ key, inExtent: x > minX && x < maxX && z > minZ && z < maxZ }).toEqual({ key, inExtent: true });
      expect({ key, buildings: buildingsAt(start.position).map((b) => b.id) }).toEqual({ key, buildings: [] });
      expect(start.yawDeg).toBeGreaterThanOrEqual(0);
      expect(start.yawDeg).toBeLessThan(360);
    }
  });

  it("cover every place", () => {
    for (const place of PLACES_3D) expect(WALK_STARTS[place.id]).toBeDefined();
  });

  it("step out of a footprint through the nearest wall", () => {
    const square: V2[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const [x, z] = pushOutOfRing([2, 5], square, 0.6);
    expect(x).toBeCloseTo(-0.6, 9);
    expect(z).toBeCloseTo(5, 9);
    expect(pointInRing([x, z], square)).toBe(false);
  });

  it("stand in front of a door: clear of the wall, on the threshold's level, not off a deck", () => {
    const inside = (p: V2) => p[0] >= 0 && p[0] <= 10 && p[1] >= 0 && p[1] <= 10;
    // A door on the east wall facing east (90°), flat ground: 8 m beyond the wall (≤ 1 m back from the limit).
    const flat = doorStart([10, 5], 90, { blocked: inside, groundAt: () => 0 });
    expect(flat[0]).toBeCloseTo(18, 6);
    expect(flat[1]).toBeCloseTo(5, 6);
    // A walkway that ends in a 2 m drop at x = 14: stop a metre short of the edge.
    const deck = doorStart([10, 5], 90, { blocked: inside, groundAt: ([x]) => (x > 14 ? -2 : 0), doorY: 0 });
    expect(deck[0]).toBeGreaterThanOrEqual(11.5);
    expect(deck[0]).toBeLessThanOrEqual(13.5);
    // The real EduCity west door (CAD, 5 m inside the OSM outline): out onto the deck.
    const west = campus.entrances.find((e) => e.target === "entrance-educity-west")!;
    const p = doorStart(west.at, west.facing!, {
      blocked: (q) => buildingsAt(q).length > 0,
      groundAt: (q) => terrain.heightAt(q[0], q[1]),
      doorY: west.y,
    });
    expect(buildingsAt(p)).toHaveLength(0);
    expect(Math.abs(terrain.heightAt(p[0], p[1]) - (west.y ?? 0))).toBeLessThan(0.6);
  });
});

describe("route levels", () => {
  it("walk outdoor legs outdoors and indoor legs on their building's floor", () => {
    expect(legLevel("out-xfer-edu-west-bio-event", true, 3.4)).toBe("outdoor");
    expect(legLevel("int-edu-east-to-registration", false, 3.4)).toBe("educity-1");
    expect(legLevel("int-edu-to-room-2001", false, 8.4)).toBe("educity-2");
    expect(legLevel("int-joki-aula-to-showroom", false, -1.7)).toBe("joki-1");
    expect(legLevel("int-joki-aula-to-showroom", false, -1.1)).toBe("joki-1");
    expect(legLevel("int-joki-tower", false, 2.9)).toBe("joki-2");
    expect(legLevel("int-joki-tower", false, 6.9)).toBe("joki-3");
    expect(legLevel("int-bio-tyk-to-joki", false, 0.06)).toBe("biocity-1");
    // Down the passage stair: Joki's floor 1.
    expect(legLevel("int-bio-tyk-to-joki", false, -1.7)).toBe("joki-1");
    expect(legLevel("somewhere-else", false, 0)).toBeNull();
  });
});

describe("arrival walk starts", () => {
  const routes = JSON.parse(fs.readFileSync(path.join(ASSETS, "data/routes.json"), "utf8")) as RoutesData;
  it("start the station's walk on the island platform, facing along the way out", () => {
    const leg = routes.legs[WALK_START_LEGS["kupittaa-station"]];
    expect(leg).toBeDefined();
    const s = legStart(leg.points)!;
    // On the platform (the leg's own floor, −4.84), not on the tracks or the hall's bridge.
    expect(s.y).toBeCloseTo(leg.points[0][1], 6);
    expect(Math.hypot(s.position[0] - leg.points[0][0], s.position[1] - leg.points[0][2])).toBeCloseTo(0.8, 6);
    const [x1, , z1] = leg.points[2];
    const want = ((Math.atan2(x1 - leg.points[0][0], -(z1 - leg.points[0][2])) * 180) / Math.PI + 360) % 360;
    expect(Math.abs(((s.yawDeg - want + 540) % 360) - 180)).toBeLessThan(25);
  });
  it("needs a real leg", () => {
    expect(legStart([[0, 0, 0]])).toBeNull();
  });
});
