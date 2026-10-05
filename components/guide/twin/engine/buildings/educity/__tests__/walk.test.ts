/**
 * three is ESM; this Jest setup runs CommonJS — the mock hands over the real module through
 * Node's own loader (as the other twin tests do).
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { simulateWalk, type WalkWorld } from "../../../nav/walk";
import { castCircle, pointInPolygon } from "../../../nav/collision";
import { buildNav, educityRouteLegs, educityTargets } from "../nav";
import { BLOCK, MAIN_DOORS, PAVILION, Y0, eBearing, eToLocal, localToE } from "../frame";
import { DOOR_B } from "../data";
import type { Collider2D, V2, V3, WalkArea } from "../../../types";

/**
 * Walking into EduCity with the real walk simulation (nav/walk.ts) — the round-1 failures: at the
 * west door the walker fell 3.9 m under the pavilion, at the east door it met an invisible wall.
 * The ground module cuts the terrain under the campus outline (which stands 1.3 m outside the
 * pavilion's glass) and the DTM there is the surface lot; the world below models exactly that:
 * the deck at y 3.40 outside the outline, the lot (−0.5) inside it.
 */

const campus = JSON.parse(readFileSync(join(process.cwd(), "public/assets/guide/3d/data/campus.json"), "utf8")) as {
  buildings: { id: string; polygon: V2[] }[];
};
const outline = campus.buildings.find((b) => b.id === "osm-731925812")!.polygon;

function world(): WalkWorld {
  const nav = buildNav();
  const ground: WalkArea = {
    level: "outdoor",
    y: 0,
    polygon: [
      [100, 0],
      [100, 200],
      [320, 200],
      [320, 0],
    ],
  };
  return {
    colliders: nav.colliders,
    walkAreas: [...nav.walkAreas, ground],
    connectors: nav.connectors,
    // The ground's surface: deck level round the building, the lot under its (cut) outline.
    heightAt: (x, z, level, area) => (level === "outdoor" && (!area || area === ground) ? (pointInPolygon([x, z], outline) ? -0.5 : Y0) : null),
  };
}

const walkFor = (seconds: number) => [{ input: { forward: 1 }, seconds }];

/** Walk from an E point heading along an E direction; returns the end in E and the lowest floor met. */
function walkE(from: V2, dir: V2, seconds: number, level: "outdoor" | "educity-1" = "outdoor") {
  let lowest = Infinity;
  const sim = simulateWalk(
    { position: eToLocal(from[0], from[1]), level, yawDeg: eBearing(dir[0], dir[1]), pitchDeg: 0 },
    world(),
    walkFor(seconds),
    { onStep: (s) => (lowest = Math.min(lowest, s.floor)) },
  );
  return { sim, e: localToE(sim.position[0], sim.position[1]), lowest };
}

describe("walking into EduCity", () => {
  it("enters through the west revolving door on any line through its mouth — no drop under the pavilion", () => {
    const W = MAIN_DOORS.west;
    for (const dz of [0, -0.45, 0.45, -0.62, 0.62]) {
      const { sim, e, lowest } = walkE([1.6, W.z + dz], [1, 0], 7);
      expect([dz, sim.level]).toEqual([dz, "educity-1"]);
      expect(e[0]).toBeGreaterThan(W.x + W.r + 0.5);
      expect(lowest).toBeGreaterThan(Y0 - 0.05);
      expect(sim.floor).toBeCloseTo(Y0, 2);
    }
  });

  it("enters through the east sliding door from the walkway plaza — no invisible wall", () => {
    const D = MAIN_DOORS.east;
    for (const z of [(D.z0 + D.z1) / 2, D.z0 + 0.45, D.z1 - 0.45]) {
      const { sim, e, lowest } = walkE([51.5, z], [-1, 0], 6);
      expect(sim.level).toBe("educity-1");
      expect(e[0]).toBeLessThan(PAVILION.glassSE - 2);
      expect(lowest).toBeGreaterThan(Y0 - 0.05);
    }
  });

  it("enters through door B's portal from the south-east walkway", () => {
    const { sim, e, lowest } = walkE([55.5, (DOOR_B.z0 + DOOR_B.z1) / 2], [-1, 0], 6);
    expect(sim.level).toBe("educity-1");
    expect(e[0]).toBeLessThan(BLOCK.w - 2);
    expect(lowest).toBeGreaterThan(Y0 - 0.05);
  });

  it("walks out again: lobby → west door → the campus deck at deck level", () => {
    const { sim, e, lowest } = walkE([9, MAIN_DOORS.west.z - 0.5], [-1, 0], 7, "educity-1");
    expect(sim.level).toBe("outdoor");
    expect(e[0]).toBeLessThan(2.5);
    expect(lowest).toBeGreaterThan(Y0 - 0.05);
  });

  it("keeps the pavilion's glass solid beside the doors", () => {
    // Into the glass north of the revolving door and south of the sliding door.
    const west = walkE([1.6, 68], [1, 0], 6);
    expect(west.e[0]).toBeLessThan(PAVILION.glassNW);
    const east = walkE([51.5, 70], [-1, 0], 6);
    expect(east.e[0]).toBeGreaterThan(PAVILION.glassSE);
  });

  it("starts the step-free gateway walk within reach of the lift button, outside the bridges' outline", () => {
    const t = educityTargets().find((x) => x.id === "entrance-educity-gateway")!;
    const lift = buildNav().connectors.find((c) => c.id === "edu-gateway-up")!;
    // The engine pushes outdoor starts out of building outlines (the bridges' part included).
    expect(pointInPolygon(t.walkTo!, outline)).toBe(false);
    expect(Math.hypot(t.walkTo![0] - lift.at[0], t.walkTo![1] - lift.at[1])).toBeLessThan(1.5);
  });

  it("starts 'Walk me there' at the entrances facing the door and walks straight in", () => {
    for (const id of ["entrance-educity-west", "entrance-educity-east", "entrance-educity-b"]) {
      const t = educityTargets().find((x) => x.id === id)!;
      const v = t.view;
      const yaw = (Math.atan2(v.target[0] - v.position[0], -(v.target[2] - v.position[2])) * 180) / Math.PI;
      const sim = simulateWalk({ position: t.walkTo!, level: "outdoor", yawDeg: yaw, pitchDeg: 0 }, world(), walkFor(9));
      expect([id, sim.level]).toEqual([id, "educity-1"]);
    }
  });
});

/** Fraction of a polyline a 0.3 m-radius walker sweeps before touching a collider (1 = clear all the way). */
function sweep(points: V2[], colliders: Collider2D[]): { ok: boolean; at: V2 | null } {
  for (let i = 1; i < points.length; i++) {
    if (castCircle(points[i - 1], points[i], 0.3, colliders) < 1) return { ok: false, at: points[i - 1] };
  }
  return { ok: true, at: null };
}

const routes = JSON.parse(readFileSync(join(process.cwd(), "public/assets/guide/3d/data/routes.json"), "utf8")) as {
  legs: Record<string, { points: V3[] }>;
};
/** The part of a leg near EduCity (within 6 m of its outline's box, E frame). */
const nearEduCity = (pts: V3[]): V2[] =>
  pts
    .map((p): V2 => [p[0], p[2]])
    .filter((p) => {
      const [x, z] = localToE(p[0], p[1]);
      return x > -14 && x < BLOCK.w + 8 && z > -6 && z < PAVILION.z1 + 6;
    });

describe("route legs through EduCity's doors (0.3 m sweep)", () => {
  const colliders = buildNav().colliders;

  it("walks every indoor leg clear of floor 1's walls, desks and columns", () => {
    const f1 = colliders.filter((c) => c.level === "educity-1");
    for (const [id, pts] of Object.entries(educityRouteLegs())) {
      expect([id, sweep(pts.map((p): V2 => [p[0], p[2]]), f1).ok]).toEqual([id, true]);
    }
  });

  it("reaches door B and the step-free gateway door through their openings", () => {
    const out = colliders.filter((c) => c.level === "outdoor");
    for (const id of ["out-arr-parkcity-edu-b", "out-arr-train-edu-b", "out-parkcity-gw-zebra", "out-b-sw2-gw"]) {
      expect([id, sweep(nearEduCity(routes.legs[id].points), out)]).toEqual([id, { ok: true, at: null }]);
    }
  });

  // The legs come in square through both main entrances (the doors are where the plans put them).
  it("reaches the east and west main entrances through their doors", () => {
    const out = colliders.filter((c) => c.level === "outdoor");
    for (const id of ["out-arr-train-edu-east", "out-arr-stdoor-edu-east", "out-arr-bus870-edu-east", "out-arr-parkcity-edu-east", "out-xfer-edu-west-bio-event"]) {
      expect([id, sweep(nearEduCity(routes.legs[id].points), out)]).toEqual([id, { ok: true, at: null }]);
    }
  });
});
