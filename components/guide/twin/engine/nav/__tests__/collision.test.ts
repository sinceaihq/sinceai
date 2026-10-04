import type { Collider2D, V2, WalkArea } from "../../types";
import {
  areaFloor,
  castCircle,
  clearance,
  crossedEdge,
  floorHeight,
  floorY,
  indexColliders,
  levelAt,
  moveCircle,
  moveReach,
  pointInPolygon,
  type HeightAt,
} from "../collision";

const R = 0.3;

const seg = (a: V2, b: V2): Collider2D => ({ level: "outdoor", kind: "segment", a, b });
const col = (c: V2, r: number): Collider2D => ({ level: "outdoor", kind: "circle", c, r });

/** Deterministic PRNG (same as the engine's util) so property tests are repeatable. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function distToSegment(p: V2, a: V2, b: V2): number {
  const ex = b[0] - a[0];
  const ez = b[1] - a[1];
  const len2 = ex * ex + ez * ez;
  const u = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ez) / len2));
  return Math.hypot(p[0] - (a[0] + ex * u), p[1] - (a[1] + ez * u));
}

/** Proper intersection of segments p1→p2 and q1→q2. */
function crosses(p1: V2, p2: V2, q1: V2, q2: V2): boolean {
  const o = (a: V2, b: V2, c: V2) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = o(q1, q2, p1);
  const d2 = o(q1, q2, p2);
  const d3 = o(p1, p2, q1);
  const d4 = o(p1, p2, q2);
  return d1 * d2 < 0 && d3 * d4 < 0;
}

describe("pointInPolygon", () => {
  const square: V2[] = [
    [0, 0],
    [4, 0],
    [4, 4],
    [0, 4],
  ];
  const ell: V2[] = [
    [0, 0],
    [6, 0],
    [6, 2],
    [2, 2],
    [2, 6],
    [0, 6],
  ];

  it("handles convex and concave rings in either winding", () => {
    expect(pointInPolygon([2, 2], square)).toBe(true);
    expect(pointInPolygon([5, 2], square)).toBe(false);
    expect(pointInPolygon([2, 2], [...square].reverse())).toBe(true);
    expect(pointInPolygon([1, 5], ell)).toBe(true);
    expect(pointInPolygon([4, 4], ell)).toBe(false);
    expect(pointInPolygon([5, 1], ell)).toBe(true);
  });

  it("ignores a repeated closing vertex", () => {
    expect(pointInPolygon([2, 2], [...square, square[0]])).toBe(true);
    expect(pointInPolygon([-1, 2], [...square, square[0]])).toBe(false);
  });
});

describe("moveCircle", () => {
  it("moves freely when nothing is in the way", () => {
    expect(moveCircle([0, 0], [3, -4], R, [])).toEqual([3, -4]);
    expect(moveCircle([0, 0], [3, -4], R, [seg([10, 10], [12, 10])])).toEqual([3, -4]);
  });

  it("stops a head-on move at the radius from the wall", () => {
    const wall = seg([-5, 0], [5, 0]);
    const [x, z] = moveCircle([0, -2], [0, 2], R, [wall]);
    expect(x).toBeCloseTo(0, 6);
    expect(z).toBeLessThanOrEqual(-R);
    expect(z).toBeGreaterThan(-R - 0.01);
  });

  it("keeps the tangential part of the move when sliding along a wall", () => {
    const wall = seg([-10, 0], [10, 0]);
    const [x, z] = moveCircle([0, -1], [3, 1], R, [wall]);
    // 0.7 m of the 2 m inward move is used up reaching the wall; all 3 m along it remain.
    expect(x).toBeCloseTo(3, 2);
    expect(z).toBeLessThanOrEqual(-R);
    expect(z).toBeGreaterThan(-R - 0.01);
  });

  it("stops cleanly in a concave corner and stays put when pushed again", () => {
    const walls = [seg([-5, 0], [0, 0]), seg([0, 0], [0, -5])];
    let p: V2 = [-1, -1];
    p = moveCircle(p, [p[0] + 2, p[1] + 2], R, walls);
    expect(p[0]).toBeLessThanOrEqual(-R);
    expect(p[1]).toBeLessThanOrEqual(-R);
    expect(p[0]).toBeGreaterThan(-R - 0.01);
    expect(p[1]).toBeGreaterThan(-R - 0.01);
    // A hundred frames of pushing into the corner from different angles: no jitter, no escape.
    for (let i = 0; i < 100; i++) {
      const a = (i / 100) * (Math.PI / 2);
      const next = moveCircle(p, [p[0] + Math.cos(a) * 0.05, p[1] + Math.sin(a) * 0.05], R, walls);
      expect(Math.hypot(next[0] - p[0], next[1] - p[1])).toBeLessThan(0.002);
      p = next;
    }
  });

  it("slides past the end of a wall and turns back into the wanted direction", () => {
    const wall = seg([-5, 0], [0, 0]);
    let p: V2 = [-2, -1];
    for (let i = 0; i < 60; i++) p = moveCircle(p, [p[0] + 0.05, p[1] + 0.05], R, [wall]);
    // Past the end (x > 0) the circle is free to go down (+z) again.
    expect(p[0]).toBeGreaterThan(0.5);
    expect(p[1]).toBeGreaterThan(0);
    expect(distToSegment(p, [-5, 0], [0, 0])).toBeGreaterThanOrEqual(R - 1e-6);
  });

  describe("doorways", () => {
    // A wall along z = 0 with a gap centred on x = 0.
    const door = (width: number) => [seg([-6, 0], [-width / 2, 0]), seg([width / 2, 0], [6, 0])];

    it("lets a 0.6 m circle through a 0.9 m door", () => {
      expect(moveCircle([0, -2], [0, 2], R, door(0.9))[1]).toBeCloseTo(2, 6);
    });

    it("funnels a slightly misaligned walker through the door", () => {
      for (const offset of [0.1, 0.2, 0.3, -0.35]) {
        let p: V2 = [offset, -2];
        for (let i = 0; i < 120; i++) p = moveCircle(p, [p[0], p[1] + 0.04], R, door(0.9));
        expect(p[1]).toBeGreaterThan(1);
      }
    });

    it("blocks a 0.5 m gap", () => {
      const [, z] = moveCircle([0, -2], [0, 2], R, door(0.5));
      expect(z).toBeLessThan(0);
      let p: V2 = [0.1, -1];
      for (let i = 0; i < 200; i++) p = moveCircle(p, [p[0] + 0.01 * Math.sin(i), p[1] + 0.05], R, door(0.5));
      expect(p[1]).toBeLessThan(0);
    });
  });

  it("treats columns as circles: blocks head-on, slides around off-centre", () => {
    const column = col([0, 0], 0.4);
    const [x0, z0] = moveCircle([0, -3], [0, 3], R, [column]);
    expect(x0).toBeCloseTo(0, 6);
    expect(z0).toBeLessThanOrEqual(-0.7);
    expect(z0).toBeGreaterThan(-0.72);
    let p: V2 = [0.15, -3];
    for (let i = 0; i < 150; i++) p = moveCircle(p, [p[0], p[1] + 0.05], R, [column]);
    expect(p[1]).toBeGreaterThan(2);
  });

  it("never tunnels through a thin wall, however fast", () => {
    // Long enough that sliding along it can't reach an end within the move.
    const thin = [seg([-5000, 0], [5000, 0])];
    for (const speed of [1, 10, 100, 1000]) {
      const [, z] = moveCircle([0, -1], [0.3 * speed, speed], R, thin);
      expect(z).toBeLessThan(0);
    }
    // Both faces of a 0.1 m wall.
    const thick = [seg([-50, 0], [50, 0]), seg([-50, 0.1], [50, 0.1])];
    const [, z] = moveCircle([0, -1], [0, 500], R, thick);
    expect(z).toBeLessThan(0);
  });

  it("sees walls a slide reaches outside the box of the move (regression)", () => {
    // Moving east into a 45° wall slides the circle south-east, far outside the straight move's box,
    // into a second wall there.
    const slanted = seg([1, 1], [11, -9]);
    const below = seg([3, -3], [8, -3]);
    const [x, z] = moveCircle([0, 0], [10, 0], R, [slanted, below]);
    expect(z).toBeGreaterThan(-3);
    expect(distToSegment([x, z], [3, -3], [8, -3])).toBeGreaterThanOrEqual(R - 1e-6);
    expect(distToSegment([x, z], [1, 1], [11, -9])).toBeGreaterThanOrEqual(R - 1e-6);
  });

  it("pushes out of a cluster of short wall edges without crossing any", () => {
    // Real CAD junction (BioCity): a 3.85 m wall meeting 0.1–0.8 m edges at one vertex.
    const cluster = [
      seg([-12.86, -8.71], [-15.06, -11.87]),
      seg([-15.06, -11.87], [-14.96, -11.94]),
      seg([-14.96, -11.94], [-12.76, -8.78]),
      seg([-15.06, -11.87], [-15.12, -11.95]),
      seg([-15.12, -11.95], [-14.46, -12.41]),
      seg([-14.41, -12.33], [-15.06, -11.87]),
    ];
    const start: V2 = [-15.3269, -11.7323];
    const [x, z] = moveCircle(start, start, R, cluster);
    for (const w of cluster) if (w.kind === "segment") expect(distToSegment([x, z], w.a, w.b)).toBeGreaterThanOrEqual(R - 1e-6);
    expect(Math.hypot(x - start[0], z - start[1])).toBeLessThan(0.05);
  });

  it("pushes a circle that starts inside a wall out on its own side", () => {
    const wall = seg([-5, 0], [5, 0]);
    const [, z] = moveCircle([0, -0.1], [0, -0.1], R, [wall]);
    expect(z).toBeLessThanOrEqual(-R + 1e-6);
    const [, z2] = moveCircle([0, 0.12], [0.5, 0.12], R, [wall]);
    expect(z2).toBeGreaterThanOrEqual(R - 1e-6);
  });

  it("follows a curved wall made of short segments without sticking", () => {
    // Inside a 6 m-radius room drawn with 48 segments; push outwards while walking around.
    const ring: Collider2D[] = [];
    for (let i = 0; i < 48; i++) {
      const a0 = (i / 48) * Math.PI * 2;
      const a1 = ((i + 1) / 48) * Math.PI * 2;
      ring.push(seg([6 * Math.cos(a0), 6 * Math.sin(a0)], [6 * Math.cos(a1), 6 * Math.sin(a1)]));
    }
    let p: V2 = [5, 0];
    let travelled = 0;
    for (let i = 0; i < 400; i++) {
      const ang = Math.atan2(p[1], p[0]);
      // Tangential plus outward push.
      const mx = -Math.sin(ang) * 0.04 + Math.cos(ang) * 0.02;
      const mz = Math.cos(ang) * 0.04 + Math.sin(ang) * 0.02;
      const next = moveCircle(p, [p[0] + mx, p[1] + mz], R, ring);
      travelled += Math.hypot(next[0] - p[0], next[1] - p[1]);
      p = next;
      expect(Math.hypot(p[0], p[1])).toBeLessThan(6 - R * Math.cos(Math.PI / 48) + 1e-6);
    }
    // Nearly the full tangential speed is kept (0.04 m per frame).
    expect(travelled).toBeGreaterThan(400 * 0.04 * 0.9);
  });

  it("never leaves a closed room or overlaps a wall in a random maze (property test)", () => {
    const room: V2[] = [
      [-20, -20],
      [20, -20],
      [20, 20],
      [-20, 20],
    ];
    for (const seed of [1, 7, 42, 1234]) {
      const rnd = mulberry32(seed);
      const walls: Collider2D[] = room.map((a, i) => seg(a, room[(i + 1) % room.length]));
      for (let i = 0; i < 60; i++) {
        const x = rnd() * 36 - 18;
        const z = rnd() * 36 - 18;
        const a = rnd() * Math.PI;
        const l = 0.5 + rnd() * 6;
        walls.push(seg([x, z], [x + Math.cos(a) * l, z + Math.sin(a) * l]));
      }
      for (let i = 0; i < 12; i++) walls.push(col([rnd() * 36 - 18, rnd() * 36 - 18], 0.2 + rnd() * 0.5));
      // Start somewhere clear.
      let p: V2 = [0, 0];
      for (let tries = 0; clearance(p, walls) < R + 0.05 && tries < 100; tries++) p = [rnd() * 30 - 15, rnd() * 30 - 15];
      let heading = rnd() * Math.PI * 2;
      const problems: string[] = [];
      let minGap = Infinity;
      for (let step = 0; step < 1500; step++) {
        heading += (rnd() - 0.5) * 0.8;
        // Mostly walking-sized moves, sometimes absurdly long ones (a stalled frame, a teleport).
        const len = rnd() < 0.05 ? 3 + rnd() * 500 : 0.02 + rnd() * 0.12;
        const next = moveCircle(p, [p[0] + Math.cos(heading) * len, p[1] + Math.sin(heading) * len], R, walls);
        if (!pointInPolygon(next, room)) problems.push(`left the room at step ${step}`);
        for (const w of walls) {
          if (w.kind === "segment") {
            if (len < 2 * R && crosses(p, next, w.a, w.b)) problems.push(`crossed a wall at step ${step}`);
            minGap = Math.min(minGap, distToSegment(next, w.a, w.b) - R);
          } else {
            minGap = Math.min(minGap, Math.hypot(next[0] - w.c[0], next[1] - w.c[1]) - R - w.r);
          }
        }
        p = next;
      }
      expect(problems).toEqual([]);
      expect(minGap).toBeGreaterThan(-1e-4);
    }
  });

  it("gives the same result with an indexed subset of colliders", () => {
    const rnd = mulberry32(99);
    const walls: Collider2D[] = [];
    for (let i = 0; i < 400; i++) {
      const x = rnd() * 200 - 100;
      const z = rnd() * 200 - 100;
      const a = rnd() * Math.PI;
      const l = 0.5 + rnd() * 12;
      walls.push(seg([x, z], [x + Math.cos(a) * l, z + Math.sin(a) * l]));
    }
    const index = indexColliders(walls, 2);
    let p: V2 = [0, 0];
    for (let i = 0; i < 300; i++) {
      const to: V2 = [p[0] + (rnd() - 0.5) * 2, p[1] + (rnd() - 0.5) * 2];
      const reach = moveReach(p, to, R);
      const near = index.query(p[0] - reach, p[1] - reach, p[0] + reach, p[1] + reach);
      const a = moveCircle(p, to, R, walls);
      const b = moveCircle(p, to, R, near);
      expect(b[0]).toBeCloseTo(a[0], 9);
      expect(b[1]).toBeCloseTo(a[1], 9);
      p = a;
    }
  });
});

describe("indexColliders", () => {
  it("returns each nearby collider once and skips far ones", () => {
    const walls = [seg([0, 0], [10, 7]), seg([50, 50], [52, 50]), col([3, 3], 0.5), seg([-1, 1], [-1, 9])];
    const index = indexColliders(walls, 2);
    const near = index.query(2, 1, 4, 3);
    expect(near).toContain(walls[0]);
    expect(near).toContain(walls[2]);
    expect(near).not.toContain(walls[1]);
    expect(new Set(near).size).toBe(near.length);
    // A slanted segment is only filed under the cells it crosses.
    expect(index.query(8, -2, 9, -1)).not.toContain(walls[0]);
    expect(index.query(-1.5, 4, -0.5, 5)).toContain(walls[3]);
  });
});

describe("castCircle and clearance", () => {
  it("reports how far a line of sight is free", () => {
    const wall = [seg([-5, 5], [5, 5])];
    expect(castCircle([0, 0], [0, 10], 0, wall)).toBeCloseTo(0.5, 6);
    expect(castCircle([0, 0], [0, 10], 0.25, wall)).toBeCloseTo(0.475, 6);
    expect(castCircle([0, 0], [0, -10], 0.25, wall)).toBe(1);
    expect(clearance([0, 0], wall)).toBeCloseTo(5, 9);
    expect(clearance([0, 0], [col([3, 4], 1)])).toBeCloseTo(4, 9);
    expect(clearance([0, 0], [])).toBe(Infinity);
  });
});

describe("walk areas", () => {
  const rect = (x0: number, z0: number, x1: number, z1: number): V2[] => [
    [x0, z0],
    [x1, z0],
    [x1, z1],
    [x0, z1],
  ];
  const street: WalkArea = { level: "outdoor", polygon: rect(-50, -50, 50, 50), y: 0 };
  const lobby: WalkArea = { level: "biocity-1", polygon: rect(0, 0, 20, 10), y: 0.06 };
  const aula: WalkArea = { level: "joki-1", polygon: rect(20, 0, 30, 10), y: -1.7 };
  const ramp: WalkArea = {
    level: "joki-1",
    polygon: rect(30, 0, 40, 3),
    y: -1.4,
    slope: { from: [30, 1.5], to: [40, 1.5], y0: -1.7, y1: -1.1 },
  };
  const upstairs: WalkArea = { level: "joki-2", polygon: rect(20, 0, 30, 10), y: 2.9 };
  const areas = [street, lobby, aula, ramp, upstairs];

  it("interpolates ramps and clamps beyond their ends", () => {
    expect(floorY(ramp, [30, 1])).toBeCloseTo(-1.7, 9);
    expect(floorY(ramp, [35, 2])).toBeCloseTo(-1.4, 9);
    expect(floorY(ramp, [45, 2])).toBeCloseTo(-1.1, 9);
    expect(floorY(lobby, [5, 5])).toBe(0.06);
  });

  it("steps in through a door when the floors match (±0.6 m)", () => {
    const hit = levelAt([5, 5], areas, { level: "outdoor", y: 0 });
    expect(hit?.level).toBe("biocity-1");
    expect(hit?.y).toBe(0.06);
  });

  it("stays on the current indoor level and steps back out where it ends", () => {
    expect(levelAt([5, 5], areas, { level: "biocity-1", y: 0.06 })?.level).toBe("biocity-1");
    expect(levelAt([-5, 5], areas, { level: "biocity-1", y: 0.06 })?.level).toBe("outdoor");
  });

  it("does not change level across a height difference", () => {
    // The Joki aula is 1.76 m below the lobby; nothing else is there at lobby height.
    expect(levelAt([25, 5], [lobby, aula, upstairs], { level: "biocity-1", y: 0.06 })).toBeNull();
    // From the aula, the floor above is not reachable either.
    expect(levelAt([25, 5], areas, { level: "joki-1", y: -1.7 })?.level).toBe("joki-1");
  });

  it("follows a ramp within the same level", () => {
    const hit = levelAt([39, 1], areas, { level: "joki-1", y: -1.15 });
    expect(hit?.level).toBe("joki-1");
    expect(hit?.y).toBeCloseTo(-1.16, 9);
  });

  it("without context prefers the lowest indoor floor", () => {
    expect(levelAt([25, 5], areas)?.level).toBe("joki-1");
    expect(levelAt([-20, 5], areas)?.level).toBe("outdoor");
    expect(levelAt([500, 5], areas)).toBeNull();
    expect(levelAt([25, 5], areas, { level: "joki-2" })?.level).toBe("joki-2");
  });

  it("honours a terrain override for the street", () => {
    const heightAt = (x: number, _z: number, level: string) => (level === "outdoor" ? x * 0.1 : null);
    const hit = levelAt([-10, 5], areas, { level: "outdoor", y: -1, heightAt });
    expect(hit?.y).toBeCloseTo(-1, 9);
    expect(floorHeight([-10, 5], areas, "outdoor", undefined, heightAt)).toBeCloseTo(-1, 9);
    expect(floorHeight([25, 5], areas, "joki-2")).toBe(2.9);
    expect(floorHeight([0, -40], areas, "joki-2")).toBeNull();
  });

  it("lets a terrain override leave areas with a floor of their own (decks, stairs) alone", () => {
    const deck: WalkArea = { level: "outdoor", polygon: rect(-30, -2, -10, 2), y: 4.3 };
    // The terrain under the deck is the railway cutting, 9 m lower.
    const heightAt: HeightAt = (_x, _z, level, area) => (level === "outdoor" && area !== deck ? -5 : null);
    expect(areaFloor(street, [-20, 0], heightAt)).toBe(-5);
    expect(areaFloor(deck, [-20, 0], heightAt)).toBe(4.3);
    // On the deck the walker stays on it; in the cutting below, on the ground.
    expect(levelAt([-20, 0], [street, deck], { level: "outdoor", y: 4.3, heightAt })?.area).toBe(deck);
    expect(levelAt([-20, 0], [street, deck], { level: "outdoor", y: -5, heightAt })?.area).toBe(street);
  });

  it("puts a walker at the foot of a stair onto the stair, not underneath it", () => {
    const stair: WalkArea = {
      level: "outdoor",
      polygon: rect(-30, 10, -20, 12),
      y: 0,
      slope: { from: [-30, 11], to: [-20, 11], y0: 0, y1: 5 },
    };
    const heightAt: HeightAt = (_x, _z, level, area) => (level === "outdoor" && area !== stair ? 0 : null);
    // At the first step both floors are within reach: the structure wins over the terrain it stands on.
    expect(levelAt([-29.8, 11], [street, stair], { level: "outdoor", y: 0, heightAt })?.area).toBe(stair);
    // Without an override (every floor its own) the nearest floor still decides.
    expect(levelAt([-29.8, 11], [street, stair], { level: "outdoor", y: 0 })?.area).toBe(street);
  });

  it("finds the polygon edge a move crosses", () => {
    const edge = crossedEdge([5, 5], [5, 12], rect(0, 0, 20, 10));
    expect(edge?.t).toBeCloseTo(5 / 7, 9);
    expect(Math.abs(edge?.ux ?? 0)).toBeCloseTo(1, 9);
    expect(crossedEdge([5, 5], [6, 6], rect(0, 0, 20, 10))).toBeNull();
  });
});
