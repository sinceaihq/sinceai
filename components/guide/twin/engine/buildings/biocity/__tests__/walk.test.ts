import { simulateWalk, type WalkWorld } from "../../../nav/walk";
import { biocityWalk } from "../nav";
import { DOOR_PATH_B, ENTRANCE_TYK, FRAME_B, JOKI_PASSAGE, LEVEL, WALKWAY_Z, bToLocal, localToB } from "../plan";
import { biocityTargets } from "../views";
import { DOOR, bearingDir, doorTargetAngle, stepDoorAngle, wingClearance } from "../door";
import type { Collider2D, V2, WalkArea } from "../../../types";

/**
 * Walking into and through BioCity with the real walk simulation (nav/walk.ts): in from
 * Tykistökatu through the revolving door, down the build hall's central walkway and the passage
 * stair to Joki's floor, and in from the courtyard through the event-entrance vestibule.
 */

/** Compass bearing of a plan-B direction. */
const bearingOfPlan = (dx: number, dz: number) => {
  const [x0, z0] = bToLocal(0, 0);
  const [x1, z1] = bToLocal(dx, dz);
  return ((Math.atan2(x1 - x0, -(z1 - z0)) * 180) / Math.PI + 360) % 360;
};

/** BioCity's walk data plus a flat street around it (the ground module's job in the app). */
function world(): WalkWorld {
  const bio = biocityWalk();
  const street: WalkArea = {
    level: "outdoor",
    y: 0,
    polygon: [
      [-120, -120],
      [-120, 120],
      [120, 120],
      [120, -120],
    ],
  };
  return { colliders: bio.colliders, walkAreas: [...bio.walkAreas, street], connectors: bio.connectors };
}

const walkFor = (seconds: number) => [{ input: { forward: 1 }, seconds }];

describe("walking into BioCity", () => {
  it("enters from Tykistökatu through the revolving door onto the ground floor (W held, any line through the mouth)", () => {
    // Dead centre, the keep-right side, the route's threshold point and the left edge of the mouth.
    for (const z of [ENTRANCE_TYK.drum.z, ENTRANCE_TYK.drum.z + 0.25, 0.5, 0.25]) {
      const start = bToLocal(-36.5, z);
      const sim = simulateWalk({ position: start, level: "outdoor", yawDeg: bearingOfPlan(1, 0), pitchDeg: 0 }, world(), walkFor(10));
      const [px] = localToB(sim.position[0], sim.position[1]);
      expect(sim.level).toBe("biocity-1");
      expect(px).toBeGreaterThan(-25.5);
      expect(sim.floor).toBeCloseTo(LEVEL.gf, 2);
    }
  });

  it("'Walk me there' at the Tykistökatu entrance walks straight in (start on the door axis, heading from the view)", () => {
    const t = biocityTargets().find((x) => x.id === "entrance-biocity-tykistokatu")!;
    const v = t.view;
    const yaw = (Math.atan2(v.target[0] - v.position[0], -(v.target[2] - v.position[2])) * 180) / Math.PI;
    const sim = simulateWalk({ position: t.walkTo!, level: "outdoor", yawDeg: yaw, pitchDeg: 0 }, world(), walkFor(9));
    const [px] = localToB(sim.position[0], sim.position[1]);
    expect(sim.level).toBe("biocity-1");
    expect(px).toBeGreaterThan(-25.5);
  });

  it("is stopped by the gable glass beside the door", () => {
    const start = bToLocal(-36.5, 4.0);
    const sim = simulateWalk({ position: start, level: "outdoor", yawDeg: bearingOfPlan(1, 0), pitchDeg: 0 }, world(), walkFor(9));
    const [px] = localToB(sim.position[0], sim.position[1]);
    expect(px).toBeLessThan(-30.05);
  });

  it("walks the central walkway and down the passage stair to Joki's floor (−1.70)", () => {
    const start = bToLocal(-25.5, WALKWAY_Z);
    const sim = simulateWalk({ position: start, level: "biocity-1", yawDeg: bearingOfPlan(1, 0), pitchDeg: 0 }, world(), walkFor(50));
    const [px, pz] = localToB(sim.position[0], sim.position[1]);
    expect(px).toBeGreaterThan(JOKI_PASSAGE.wallX0);
    expect(Math.abs(pz - WALKWAY_Z)).toBeLessThan(0.3);
    expect(sim.floor).toBeCloseTo(JOKI_PASSAGE.bottom, 1);
  });

  it("enters from the courtyard through the event-entrance vestibule into the Aulagalleria", () => {
    const start = bToLocal(0.02, -39.5);
    const sim = simulateWalk({ position: start, level: "outdoor", yawDeg: bearingOfPlan(0, 1), pitchDeg: 0 }, world(), walkFor(5));
    const [, pz] = localToB(sim.position[0], sim.position[1]);
    expect(sim.level).toBe("biocity-1");
    expect(pz).toBeGreaterThan(-34.4);
  });

  it("starts every 'Walk me there' at least 0.4 m clear of walls, columns, counters and tables", () => {
    const cols = biocityWalk().colliders;
    const clearance = (p: V2, c: Collider2D) => {
      if (c.kind === "circle") return Math.hypot(p[0] - c.c[0], p[1] - c.c[1]) - c.r;
      const dx = c.b[0] - c.a[0];
      const dz = c.b[1] - c.a[1];
      const l2 = dx * dx + dz * dz;
      const t = l2 ? Math.max(0, Math.min(1, ((p[0] - c.a[0]) * dx + (p[1] - c.a[1]) * dz) / l2)) : 0;
      return Math.hypot(p[0] - c.a[0] - t * dx, p[1] - c.a[1] - t * dz);
    };
    for (const t of biocityTargets()) {
      if (!t.walkTo) continue;
      const level = t.level ?? "outdoor";
      const d = Math.min(...cols.filter((c) => c.level === level).map((c) => clearance(t.walkTo!, c)));
      if (d < 0.4) throw new Error(`${t.id}: walkTo ${t.walkTo} is ${d.toFixed(2)} m from a collider`);
    }
  });

  it("offers the stair to Joki as a connector next to the passage", () => {
    const c = biocityWalk().connectors.find((x) => x.id === "biocity-stair-to-joki");
    expect(c).toBeDefined();
    const [ax] = localToB(c!.at[0], c!.at[1]);
    const [rx] = localToB(c!.arrive[0], c!.arrive[1]);
    expect(ax).toBeLessThan(JOKI_PASSAGE.stairX0);
    expect(rx).toBeGreaterThan(JOKI_PASSAGE.wallX1);
    expect(FRAME_B.theta).toBeCloseTo(55.141, 3);
  });
});

describe("the revolving door", () => {
  it("keeps whoever walks the route through it in the middle of a compartment", () => {
    // Sample the route through the drum every 5 cm; the wings follow (eased per 1/60 s step at 1 m/s).
    let angle = 0;
    for (let i = 0; i + 1 < DOOR_PATH_B.length; i++) {
      const a: V2 = [DOOR_PATH_B[i][0], DOOR_PATH_B[i][2]];
      const b: V2 = [DOOR_PATH_B[i + 1][0], DOOR_PATH_B[i + 1][2]];
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (1 / 60));
      for (let k = 0; k <= n; k++) {
        const p: V2 = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
        angle = stepDoorAngle(angle, doorTargetAngle(p, angle), 1 / 60);
        if (Math.hypot(p[0] - DOOR.x, p[1] - DOOR.z) < DOOR.r) expect(wingClearance(p, angle)).toBeGreaterThan(0.35);
      }
    }
  });

  it("seals at rest: no straight line from the recess mouth to the lobby mouth misses every wing", () => {
    // The mouths are 56° wide; a compartment is 120°, so a still door is always closed (an airlock).
    const cross = (p: V2, q: V2, a: V2, b: V2) => {
      const d = (u: V2, v: V2, w: V2) => (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]);
      return d(p, q, a) * d(p, q, b) <= 0 && d(a, b, p) * d(a, b, q) <= 0;
    };
    for (let angle = 0; angle < 120; angle += 5) {
      const wings = [0, 1, 2].map((i): [V2, V2] => {
        const [dx, dz] = bearingDir(angle + i * 120);
        return [
          [DOOR.x, DOOR.z],
          [DOOR.x + dx * (DOOR.r - 0.03), DOOR.z + dz * (DOOR.r - 0.03)],
        ];
      });
      for (const zs of [-0.6, -0.3, 0, 0.3, 0.6]) {
        for (const ze of [-0.6, -0.3, 0, 0.3, 0.6]) {
          const a: V2 = [DOOR.x - 1.2, DOOR.z + zs];
          const b: V2 = [DOOR.x + 1.2, DOOR.z + ze];
          expect(wings.some(([w0, w1]) => cross(a, b, w0, w1))).toBe(true);
        }
      }
    }
    expect(bearingDir(90)[0]).toBeCloseTo(1, 6);
  });
});

export type { V2 };
