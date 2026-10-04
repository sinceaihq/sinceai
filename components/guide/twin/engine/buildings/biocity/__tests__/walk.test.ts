import { simulateWalk, type WalkWorld } from "../../../nav/walk";
import { biocityWalk } from "../nav";
import { FRAME_B, JOKI_PASSAGE, LEVEL, WALKWAY_Z, bToLocal, localToB } from "../plan";
import type { V2, WalkArea } from "../../../types";

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
  it("enters from Tykistökatu through the revolving door onto the ground floor", () => {
    const start = bToLocal(-36.5, 0.58);
    const sim = simulateWalk({ position: start, level: "outdoor", yawDeg: bearingOfPlan(1, 0), pitchDeg: 0 }, world(), walkFor(9));
    const [px] = localToB(sim.position[0], sim.position[1]);
    expect(sim.level).toBe("biocity-1");
    expect(px).toBeGreaterThan(-27.5);
    expect(sim.floor).toBeCloseTo(LEVEL.gf, 2);
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

export type { V2 };
