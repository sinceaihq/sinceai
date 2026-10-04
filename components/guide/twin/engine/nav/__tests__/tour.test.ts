import type { Collider2D, V3 } from "../../types";
import { buildTourCurve, captionAt, cleanPolyline, createTourController, type TourFrame, type TourPath } from "../tour";

// three is ESM-only (Jest runs CommonJS); the tour only constructs Vector3s.
jest.mock("three", () => {
  class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
  }
  return { Vector3 };
});

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

const flat = (pts: [number, number][], y = 0): V3[] => pts.map(([x, z]) => [x, y, z]);
const hdist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

/** Real legs from the research route file (spec_routes.json), local frame. */
const LEGS: Record<string, V3[]> = {
  "int-bio-tyk-to-joki": [
    [-24.51, 0.06, -11.75],
    [-23.4, 0.06, -10.01],
    [-21.13, 0.06, -8.56],
    [10.02, 0.06, 36.16],
    [9.69, 0.06, 37.36],
    [11.52, 0.06, 39.98],
    [13.47, -1.7, 42.78],
    [14.04, -1.7, 43.59],
  ],
  "int-joki-aula-to-showroom": [
    [14.04, -1.7, 43.59],
    [20.81, -1.7, 41.78],
    [25.49, -1.7, 42.33],
    [31.74, -1.7, 40.94],
    [39.64, -1.7, 35.1],
    [46.84, -1.7, 29.34],
    [51.18, -1.35, 25.77],
    [53.62, -1.1, 22.73],
    [54.75, -1.1, 20.3],
    [55.54, -1.1, 14.52],
  ],
  // Includes the router's 0.22 m back-step at the kerb.
  "out-co-kerb-bio-main": flat([
    [-35.6, -22.0],
    [-33.7, -20.8],
    [-33.6, -21.0],
    [-24.6, -11.3],
  ]),
  "out-xfer-edu-west-bio-event": flat([
    [177.8, 115.1],
    [176.1, 108.8],
    [95.9, 37.7],
    [62.9, 3.9],
    [59.5, 3.0],
    [56.1, 3.5],
    [53.3, 4.6],
    [50.0, 7.0],
    [43.6, -2.2],
    [43.6, -2.1],
    [22.1, -7.5],
  ]),
};

function polylineLength(points: V3[]) {
  let l = 0;
  for (let i = 1; i < points.length; i++)
    l += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]);
  return l;
}

function run(controller: ReturnType<typeof createTourController>, seconds: number, dt = 1 / 60) {
  let frame: TourFrame | null = null;
  for (let i = 0; i < Math.round(seconds / dt); i++) frame = controller.update(dt);
  return frame;
}

describe("cleanPolyline", () => {
  it("drops duplicates, invalid points and tiny back-steps but keeps the ends", () => {
    const cleaned = cleanPolyline(LEGS["out-co-kerb-bio-main"]);
    expect(cleaned.map((v) => [v.x, v.z])).toEqual([
      [-35.6, -22.0],
      [-33.7, -20.8],
      [-24.6, -11.3],
    ]);
    const messy: V3[] = [
      [0, 0, 0],
      [0, 0, 0.01],
      [Number.NaN, 0, 3],
      [5, 0, 0],
      [5, 0, 0],
    ];
    expect(cleanPolyline(messy).map((v) => v.src)).toEqual([0, 3]);
  });
});

describe("buildTourCurve", () => {
  it("is exact on a straight line", () => {
    const curve = buildTourCurve(flat([
      [0, 0],
      [30, 40],
    ]));
    expect(curve.length).toBeCloseTo(50, 6);
    const p = curve.pointAt(25);
    expect(p[0]).toBeCloseTo(15, 6);
    expect(p[2]).toBeCloseTo(20, 6);
    expect(curve.tOf(25)).toBeCloseTo(0.5, 6);
    expect(curve.sOf(0.2)).toBeCloseTo(10, 6);
  });

  it("samples by arc length: equal steps along straights and bends", () => {
    const curve = buildTourCurve(flat([
      [0, 0],
      [20, 0],
      [20, 20],
      [5, 32],
    ]));
    const step = 0.25;
    let prev = curve.pointAt(0);
    let worst = 0;
    for (let s = step; s <= curve.length; s += step) {
      const p = curve.pointAt(s);
      const chord = Math.hypot(p[0] - prev[0], p[2] - prev[2]);
      worst = Math.max(worst, Math.abs(chord - step) / step);
      prev = p;
    }
    // A chord is a hair shorter than its arc on the tightest bend only.
    expect(worst).toBeLessThan(0.01);
  });

  it("cuts corners by at most 0.4 m, at any angle", () => {
    for (const deg of [20, 60, 90, 135, 170, 179]) {
      const a = (deg * Math.PI) / 180;
      const curve = buildTourCurve(flat([
        [0, 0],
        [12, 0],
        [12 + Math.cos(a) * 12, Math.sin(a) * 12],
      ]));
      expect(curve.maxDeviation()).toBeLessThanOrEqual(0.4);
      // The corner is rounded (passes inside the vertex), not overshot.
      const mid = curve.pointAt(curve.anchors[1]);
      const toVertex = Math.hypot(mid[0] - 12, mid[2]);
      expect(toVertex).toBeGreaterThan(0.02);
      expect(toVertex).toBeLessThanOrEqual(0.4);
    }
  });

  it("stays within 0.4 m of random routes (property test)", () => {
    const rnd = mulberry32(2026);
    for (let k = 0; k < 25; k++) {
      const pts: V3[] = [[0, 0, 0]];
      let heading = rnd() * Math.PI * 2;
      for (let i = 0; i < 8; i++) {
        heading += (rnd() - 0.5) * Math.PI * 1.6;
        const l = 0.7 + rnd() * 30;
        const last = pts[pts.length - 1];
        pts.push([last[0] + Math.cos(heading) * l, last[1] + (rnd() - 0.5) * 0.8, last[2] + Math.sin(heading) * l]);
      }
      const curve = buildTourCurve(pts);
      expect(curve.maxDeviation()).toBeLessThanOrEqual(0.4);
      expect(curve.length).toBeGreaterThan(0);
      expect(curve.length).toBeLessThanOrEqual(polylineLength(pts) + 1e-6);
    }
  });

  it("follows the real tour legs within 0.4 m and maps every waypoint exactly", () => {
    for (const [id, pts] of Object.entries(LEGS)) {
      const curve = buildTourCurve(pts);
      expect({ id, deviation: curve.maxDeviation() <= 0.4 }).toEqual({ id, deviation: true });
      const total = polylineLength(curve.vertices.map((v) => [v.x, v.y, v.z]));
      let cum = 0;
      curve.vertices.forEach((v, i) => {
        if (i > 0) {
          const u = curve.vertices[i - 1];
          cum += Math.hypot(v.x - u.x, v.y - u.y, v.z - u.z);
        }
        expect(curve.tOf(curve.anchors[i])).toBeCloseTo(cum / total, 9);
        // The anchor point on the curve is the waypoint itself, or within the corner cut of it.
        const p = curve.pointAt(curve.anchors[i]);
        expect(Math.hypot(p[0] - v.x, p[1] - v.y, p[2] - v.z)).toBeLessThanOrEqual(0.41);
      });
    }
  });

  it("keeps rounded corners clear of walls the route avoided", () => {
    // A column at the inside of a right-hand corner, 0.3 m clear of the route.
    const column: Collider2D = { level: "outdoor", kind: "circle", c: [9.6, 0.4], r: 0.1 };
    const route = flat([
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    const { indexColliders, clearance } = jest.requireActual("../collision") as typeof import("../collision");
    const index = indexColliders([column], 2);
    const minClear = (curve: ReturnType<typeof buildTourCurve>) => {
      let m = Infinity;
      for (let s = 0; s <= curve.length; s += 0.02) {
        const p = curve.pointAt(s);
        m = Math.min(m, clearance([p[0], p[2]], [column]));
      }
      return m;
    };
    const blind = buildTourCurve(route);
    const aware = buildTourCurve(route, { wallsNear: () => index });
    expect(minClear(blind)).toBeLessThan(0.2);
    expect(minClear(aware)).toBeGreaterThanOrEqual(0.27);
    expect(aware.maxDeviation()).toBeLessThanOrEqual(0.4);
  });

  it("copes with degenerate input", () => {
    const one = buildTourCurve([[3, 1, 4]]);
    expect(one.length).toBe(0);
    expect(one.pointAt(10)).toEqual([3, 1, 4]);
    expect(one.tOf(0)).toBe(1);
    const dupes = buildTourCurve([
      [1, 0, 1],
      [1, 0, 1],
      [1, 0, 1],
    ]);
    expect(dupes.length).toBe(0);
    const stair = buildTourCurve([
      [0, 0, 0],
      [0, 0, 3],
      [0, -1.76, 6.4],
    ]);
    expect(Number.isFinite(stair.length)).toBe(true);
    expect(stair.directionAt(4)[1]).toBeCloseTo(1, 6);
  });
});

describe("captionAt", () => {
  const caps = [
    { at: 0.2, text: "a" },
    { at: 0.5, text: "b" },
    { at: 0.9, text: "c" },
  ];
  it("shows the last caption reached", () => {
    expect(captionAt(caps, 0.1)).toEqual({ index: -1, text: null });
    expect(captionAt(caps, 0.2)).toEqual({ index: 0, text: "a" });
    expect(captionAt(caps, 0.7)).toEqual({ index: 1, text: "b" });
    expect(captionAt(caps, 1)).toEqual({ index: 2, text: "c" });
  });
});

describe("createTourController", () => {
  const straight: TourPath = {
    id: "straight",
    points: flat([
      [0, 0],
      [100, 0],
    ]),
    captions: [
      { at: 0.5, text: "Halfway" },
      { at: 0, text: "Start" },
      { at: 0.9, text: "Almost there" },
    ],
  };

  it("returns null until a tour starts and after it stops", () => {
    const tour = createTourController();
    expect(tour.update(0.016)).toBeNull();
    tour.start(straight, "chase");
    expect(tour.update(0.016)).not.toBeNull();
    tour.stop();
    expect(tour.update(0.016)).toBeNull();
    tour.start({ id: "empty", points: [], captions: [] }, "chase");
    expect(tour.update(0.016)).toBeNull();
  });

  it("walks at a constant 1.6 m/s", () => {
    const tour = createTourController({ ease: 0 });
    tour.start(straight, "chase");
    const a = run(tour, 5)!;
    const b = run(tour, 10)!;
    expect(b.walker.x - a.walker.x).toBeCloseTo(16, 1);
    expect(a.walker.x).toBeCloseTo(8, 1);
  });

  it("eases in and out but still arrives", () => {
    const tour = createTourController();
    tour.start(straight, "chase");
    const first = tour.update(0.1)!;
    expect(first.walker.x).toBeLessThan(0.16 * 0.5);
    const end = run(tour, 120)!;
    expect(end.t).toBe(1);
    expect(end.done).toBe(true);
    expect(end.walker.x).toBeCloseTo(100, 6);
    expect(end.caption).toBe("Almost there");
  });

  it("speeds up on segments with a pace multiplier", () => {
    const legs: TourPath = {
      id: "legs",
      points: flat([
        [0, 0],
        [60, 0],
        [120, 0],
      ]),
      captions: [],
      speed: [1, 3],
    };
    const plain = createTourController({ ease: 0 });
    plain.start({ ...legs, speed: undefined }, "chase");
    const fast = createTourController({ ease: 0 });
    fast.start(legs, "chase");
    const expected = 60 / 1.6 + 60 / 4.8;
    expect(fast.info()!.duration).toBeGreaterThan(expected * 0.93);
    expect(fast.info()!.duration).toBeLessThan(expected * 1.07);
    expect(plain.info()!.duration).toBeCloseTo(120 / 1.6, 1);
    // Mid-way through the fast leg the pace is three times the base pace (one update covers ≤ 0.25 s).
    fast.seek(0.85);
    const p0 = fast.update(0)!.walker.x;
    const p1 = fast.update(0.2)!.walker.x;
    expect((p1 - p0) / 0.2).toBeCloseTo(4.8, 1);
  });

  it("shows captions by arc length and switches exactly at a waypoint", () => {
    const tour = createTourController({ ease: 0 });
    tour.start(straight, "chase");
    expect(tour.update(0)!.caption).toBe("Start");
    tour.seek(0.49);
    expect(tour.update(0)!.caption).toBe("Start");
    tour.seek(0.5);
    const f = tour.update(0)!;
    expect(f.caption).toBe("Halfway");
    expect(f.step).toBe(1);

    // A caption placed at a corner's polyline fraction appears as the walker rounds that corner.
    const route = flat([
      [0, 0],
      [30, 0],
      [30, 30],
    ]);
    const corner: TourPath = { id: "corner", points: route, captions: [{ at: 0.5, text: "Turn right" }] };
    const walk = createTourController({ ease: 0 });
    walk.start(corner, "first");
    let switched: TourFrame | null = null;
    for (let i = 0; i < 3000 && !switched; i++) {
      const fr = walk.update(1 / 60)!;
      if (fr.caption) switched = fr;
    }
    expect(switched).not.toBeNull();
    expect(hdist(switched!.walker, { x: 30, z: 0 })).toBeLessThan(0.45);
  });

  it("seeks to a progress value and snaps the camera there", () => {
    const tour = createTourController({ ease: 0 });
    tour.start(straight, "chase");
    run(tour, 3);
    tour.seek(0.75);
    const f = tour.update(0)!;
    expect(f.t).toBeCloseTo(0.75, 9);
    expect(f.walker.x).toBeCloseTo(75, 6);
    // Snapped: 7 m behind and 3.2 m up straight away, no flight from the old spot.
    expect(f.position.x).toBeCloseTo(68, 6);
    expect(f.position.y).toBeCloseTo(3.2, 6);
    tour.seek(-3);
    expect(tour.update(0)!.t).toBe(0);
    tour.seek(7);
    expect(tour.update(0)!.t).toBe(1);
  });

  it("pauses and resumes", () => {
    const tour = createTourController({ ease: 0 });
    tour.start(straight, "chase");
    run(tour, 2);
    tour.pause(true);
    expect(tour.paused()).toBe(true);
    const a = tour.update(0.1)!.t;
    run(tour, 5);
    expect(tour.update(0.1)!.t).toBe(a);
    tour.pause(false);
    expect(run(tour, 1)!.t).toBeGreaterThan(a);
  });

  it("frames the walker from 7 m behind, 3.2 m up, looking 6 m ahead", () => {
    const tour = createTourController({ ease: 0 });
    tour.start({ ...straight, points: flat([
      [0, 0],
      [100, 0],
    ], 2) }, "chase");
    const f = run(tour, 20)!;
    expect(hdist(f.position, f.walker)).toBeCloseTo(7, 3);
    expect(f.position.x).toBeLessThan(f.walker.x);
    expect(f.position.y - f.walker.y).toBeCloseTo(3.2, 6);
    expect(f.target.x - f.walker.x).toBeCloseTo(6, 3);
    expect(f.target.y - f.walker.y).toBeCloseTo(1, 6);
    expect(f.heading).toBeCloseTo(90, 6);
  });

  it("swings the chase camera smoothly round a bend", () => {
    const tour = createTourController({ ease: 0 });
    tour.start({ id: "bend", points: flat([
      [0, 0],
      [40, 0],
      [40, -40],
    ]), captions: [] }, "chase");
    let prev: TourFrame | null = null;
    let worstJump = 0;
    for (let i = 0; i < 60 * 45; i++) {
      const f = tour.update(1 / 60)!;
      if (prev) worstJump = Math.max(worstJump, hdist(f.position, prev.position));
      prev = f;
    }
    // Never faster than a brisk 2.5× the walking pace.
    expect(worstJump).toBeLessThan((1.6 * 2.5) / 60);
    expect(prev!.heading).toBeCloseTo(0, 3);
  });

  it("pulls the camera in rather than through a wall", () => {
    // The tour starts at a door with a wall right behind it.
    const wall: Collider2D = { level: "outdoor", kind: "segment", a: [-2, -10], b: [-2, 10] };
    const tour = createTourController({ ease: 0, colliders: [wall] });
    tour.start(straight, "chase");
    const f = tour.update(1 / 60)!;
    expect(f.position.x).toBeGreaterThan(-2 + 0.2);
    expect(f.position.x).toBeLessThan(f.walker.x);
    // Walls on another level don't count.
    const other = createTourController({ ease: 0, colliders: [{ ...wall, level: "biocity-1" }] });
    other.start({ ...straight, levels: ["outdoor", "outdoor"] }, "chase");
    expect(other.update(1 / 60)!.position.x).toBeCloseTo(-7 + 1.6 / 60, 2);
    // Once clear of the wall the camera eases back out to 7 m.
    const later = run(tour, 12)!;
    expect(hdist(later.position, later.walker)).toBeCloseTo(7, 1);
  });

  it("rides at eye height in first person and can switch modes mid-tour", () => {
    const tour = createTourController({ ease: 0 });
    tour.start(straight, "first");
    const f = run(tour, 4)!;
    expect(f.position.x).toBeCloseTo(f.walker.x, 6);
    expect(f.position.y).toBeCloseTo(1.65, 6);
    expect(f.target.x - f.position.x).toBeCloseTo(4, 3);
    expect(f.target.y).toBeCloseTo(1.65, 6);
    tour.setMode("chase");
    const g = run(tour, 4)!;
    expect(hdist(g.position, g.walker)).toBeCloseTo(7, 1);
    tour.setMode("first");
    const h = run(tour, 3)!;
    expect(hdist(h.position, h.walker)).toBeLessThan(0.05);
  });

  it("reports levels from the path", () => {
    const tour = createTourController({ ease: 0 });
    tour.start({ id: "in", points: LEGS["int-bio-tyk-to-joki"], captions: [], levels: [
      "biocity-1", "biocity-1", "biocity-1", "biocity-1", "biocity-1", "biocity-1", "joki-1", "joki-1",
    ] }, "chase");
    expect(tour.update(0)!.level).toBe("biocity-1");
    tour.seek(1);
    expect(tour.update(0)!.level).toBe("joki-1");
  });

  it("reports where the camera is: the chase camera comes through a door after the walker", () => {
    // Outdoors along x to a door at x = 30, then indoors (the door point carries the outdoor leg's level).
    const path: TourPath = {
      id: "door",
      points: flat([
        [0, 0],
        [10, 0],
        [20, 0],
        [30, 0],
        [40, 0],
        [50, 0],
        [60, 0],
      ]),
      captions: [],
      levels: ["outdoor", "outdoor", "outdoor", "outdoor", "biocity-1", "biocity-1", "biocity-1"],
    };
    const tour = createTourController({ ease: 0 });
    tour.start(path, "chase");
    let walkerIn: number | null = null;
    let cameraIn: number | null = null;
    for (let i = 0; i < 60 * 40 && cameraIn === null; i++) {
      const f = tour.update(1 / 60)!;
      // In through the door: past x = 30 the walker's segment is indoors.
      if (walkerIn === null && f.walker.x > 30.5) {
        walkerIn = f.walker.x;
        expect(f.cameraLevel).toBe("outdoor");
      }
      if (f.cameraLevel === "biocity-1") cameraIn = f.walker.x;
    }
    expect(walkerIn).not.toBeNull();
    // The camera trails ≈ 5–7 m behind: it is in once the walker is that far past the door.
    expect(cameraIn! - 30).toBeGreaterThan(4);
    expect(cameraIn! - 30).toBeLessThan(8);
    // First person: the camera is the walker.
    const first = createTourController({ ease: 0 });
    first.start(path, "first");
    for (let i = 0; i < 60 * 40; i++) {
      const f = first.update(1 / 60)!;
      if (f.walker.x > 30.5 && f.walker.x < 50) {
        expect(f.cameraLevel).toBe("biocity-1");
        break;
      }
      if (f.walker.x < 29.5) expect(f.cameraLevel).toBe("outdoor");
    }
  });

  it("frames tighter indoors, under the ceilings", () => {
    const tour = createTourController({ ease: 0 });
    tour.start({ ...straight, levels: ["biocity-1", "biocity-1"] }, "chase");
    const f = run(tour, 20)!;
    expect(f.level).toBe("biocity-1");
    expect(hdist(f.position, f.walker)).toBeCloseTo(5, 3);
    expect(f.position.y - f.walker.y).toBeCloseTo(2.3, 6);
    // Walking out of a door, the camera eases up and back to the street framing.
    const out = createTourController({ ease: 0 });
    out.start({ id: "out", points: flat([
      [0, 0],
      [30, 0],
      [80, 0],
    ]), captions: [], levels: ["biocity-1", "outdoor", "outdoor"] }, "chase");
    let prevY = out.update(0)!.position.y;
    let worst = 0;
    let last: TourFrame | null = null;
    for (let i = 0; i < 60 * 40; i++) {
      last = out.update(1 / 60)!;
      worst = Math.max(worst, Math.abs(last.position.y - prevY));
      prevY = last.position.y;
    }
    expect(last!.position.y).toBeCloseTo(3.2, 3);
    expect(worst).toBeLessThan(0.05);
  });

  it("snaps the walker onto the ground outdoors and glides down stairs", () => {
    const heightAt = (x: number) => x * 0.05;
    const tour = createTourController({ ease: 0, heightAt });
    tour.start({ ...straight, levels: ["outdoor", "outdoor"] }, "first");
    tour.seek(0.4);
    const f = tour.update(0)!;
    expect(f.walker.y).toBeCloseTo(2, 9);
    expect(f.position.y).toBeCloseTo(2 + 1.65, 9);
    // Indoors the route's own floor heights rule (no snapping).
    const stair = createTourController({ ease: 0, heightAt });
    stair.start({ id: "stair", points: LEGS["int-bio-tyk-to-joki"], captions: [], levels: [
      "biocity-1", "biocity-1", "biocity-1", "biocity-1", "biocity-1", "biocity-1", "joki-1", "joki-1",
    ] }, "first");
    let prev = stair.update(0)!.position.y;
    let worst = 0;
    let g: TourFrame | null = null;
    for (let i = 0; i < 60 * 60; i++) {
      g = stair.update(1 / 60)!;
      worst = Math.max(worst, Math.abs(g.position.y - prev));
      prev = g.position.y;
    }
    expect(g!.walker.y).toBeCloseTo(-1.7, 9);
    expect(g!.position.y).toBeCloseTo(-1.7 + 1.65, 3);
    // 1.76 m down a 10-tread stair without a single jolt.
    expect(worst).toBeLessThan(0.02);
  });

  it("is deterministic for a given dt sequence", () => {
    const rnd = mulberry32(5);
    const dts = Array.from({ length: 900 }, () => 0.004 + rnd() * 0.05);
    const path: TourPath = { id: "x", points: LEGS["out-xfer-edu-west-bio-event"], captions: [{ at: 0.3, text: "Deck" }] };
    const record = () => {
      const tour = createTourController({ speed: 2 });
      tour.start(path, "chase");
      return dts.map((dt) => {
        const f = tour.update(dt)!;
        return [f.position.x, f.position.y, f.position.z, f.target.x, f.target.z, f.t, f.heading, f.caption];
      });
    };
    expect(record()).toEqual(record());
  });

  it("handles a single-point tour", () => {
    const tour = createTourController();
    tour.start({ id: "here", points: [[5, 1, 5]], captions: [{ at: 0, text: "You are here" }] }, "chase");
    const f = tour.update(0.016)!;
    expect(f.t).toBe(1);
    expect(f.done).toBe(true);
    expect(f.walker.x).toBe(5);
    expect(Number.isFinite(f.position.x) && Number.isFinite(f.target.z)).toBe(true);
    expect(f.caption).toBe("You are here");
  });
});
