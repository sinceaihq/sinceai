import fs from "node:fs";
import path from "node:path";
import {
  ATRIUM,
  COLUMN_ROWS,
  COLUMN_X,
  DOOR_PATH_B,
  ENTRANCE_TYK,
  GALLERY,
  ISLANDS,
  JOKI_PASSAGE,
  LEVEL,
  MAUNO,
  OVAL_COLUMNS,
  PASSAGE_MOUTH,
  RETAIL_FRONT,
  ROUTE_LEGS_B,
  STANDS,
  TERRACE,
  VAULT,
  VESTIBULE,
  VESTIBULE_DOOR,
  WALKWAY_Z,
  bToLocal,
  buildTables,
  chairsFor,
  localToB,
  routeLegsLocal,
  vaultY,
  vestibuleLeaves,
} from "../plan";
import { QUIET_ROOMS } from "../rooms";
import { GF_WALLS } from "../walls";
import { biocityWalk } from "../nav";
import { BIOCITY_VIEWS, biocityTargets } from "../views";
import { pointInPolygon } from "../../../nav/collision";
import type { V2, V3 } from "../../../types";

/** Distance from p to segment ab. */
function segDist(p: V2, a: V2, b: V2): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}

/** Distance between two segments (sampled along the first — fine at 5 cm). */
function segSegDist(a: V2, b: V2, c: V2, d: V2): number {
  const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05));
  let best = Infinity;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    best = Math.min(best, segDist([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], c, d));
  }
  return best;
}

/** A stand's footprint corners in order (plan B). */
function standRing(s: (typeof STANDS)[number]): V2[] {
  const [fx, fz] = s.face;
  const ax = -fz;
  const az = fx;
  const out: V2[] = [];
  for (const [u, v] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ])
    out.push([s.x + ax * u * (s.width / 2) + fx * v * (s.depth / 2), s.z + az * u * (s.width / 2) + fz * v * (s.depth / 2)]);
  return out;
}

const wallRings: V2[][] = GF_WALLS.map((flat) => {
  const ring: V2[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) ring.push([flat[i], flat[i + 1]]);
  return ring;
});

/** Clearance (m) of a plan-B polyline from the CAD walls and the columns. */
function clearance(points: V2[]): { d: number; where: string } {
  let best = { d: Infinity, where: "" };
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    wallRings.forEach((ring, k) => {
      for (let j = 0; j < ring.length; j++) {
        const d = segSegDist(a, b, ring[j], ring[(j + 1) % ring.length]);
        if (d < best.d) best = { d, where: `wall ${k} near segment ${i}` };
      }
    });
    const cols: { c: V2; r: number }[] = [
      ...[COLUMN_ROWS.lobbyNE, COLUMN_ROWS.lobbySW].flatMap((z) => COLUMN_X.filter((x) => x < 30.5).map((x) => ({ c: [x, z] as V2, r: 0.27 }))),
      ...OVAL_COLUMNS.map((c) => ({ c, r: 0.65 })),
    ];
    for (const col of cols) {
      const d = segDist(col.c, a, b) - col.r;
      if (d < best.d) best = { d, where: `column ${col.c} near segment ${i}` };
    }
  }
  return best;
}

describe("BioCity plan frame B", () => {
  it("round-trips plan ↔ campus coordinates", () => {
    for (const p of [
      [0, 0],
      [-30.05, 0.5],
      [36.66, 0.53],
      [-55.5, -31.63],
    ] as V2[]) {
      const [x, z] = bToLocal(p[0], p[1]);
      const back = localToB(x, z);
      expect(back[0]).toBeCloseTo(p[0], 6);
      expect(back[1]).toBeCloseTo(p[1], 6);
    }
  });

  it("puts the entrances where SPEC §3.1.4 has them (campus frame)", () => {
    const [dx, dz] = bToLocal(ENTRANCE_TYK.drum.x, ENTRANCE_TYK.drum.z);
    expect(dx).toBeCloseTo(-23.4, 1);
    expect(dz).toBeCloseTo(-10.0, 1);
    const [jx, jz] = bToLocal(JOKI_PASSAGE.wallX0 + 0.25, 0.53);
    expect(Math.hypot(jx - 13.59, jz - 43.0)).toBeLessThan(0.2);
    const [vx, vz] = bToLocal(0.02, -35.3);
    expect(Math.hypot(vx - 22.05, vz + 7.54)).toBeLessThan(0.05);
  });

  it("models the atrium vault from the LOD2 eaves (30.64) to the crown (33.87)", () => {
    expect(vaultY(VAULT.cz)).toBeCloseTo(LEVEL.vaultCrown, 2);
    expect(vaultY(ATRIUM.z0)).toBeCloseTo(LEVEL.vaultEaves, 2);
    expect(vaultY(ATRIUM.z1)).toBeCloseTo(LEVEL.vaultEaves, 2);
    expect(VAULT.half * 2).toBeCloseTo(10.9, 1);
  });
});

describe("BioCity build tables (SPEC §7.1)", () => {
  const tables = buildTables();

  it("has 56 tables and 280 chairs", () => {
    expect(tables).toHaveLength(56);
    expect(tables.flatMap(chairsFor)).toHaveLength(280);
  });

  it("keeps the central walkway, the retail glass and the column faces clear", () => {
    for (const t of tables) {
      const z0 = t.z - 0.9;
      const z1 = t.z + 0.9;
      // Central walkway z −1.04…+0.40 (≥ 1.4 m wide).
      expect(z1 <= -1.04 + 1e-6 || z0 >= 0.4 - 1e-6).toBe(true);
      // Columns at z −4.95 (faces at −4.76) and the retail glass (z 4.05).
      expect(z0).toBeGreaterThanOrEqual(-4.76 + 0.1);
      if (t.x > RETAIL_FRONT.x0 - 0.5 && t.x < RETAIL_FRONT.x1 + 0.5) expect(z1).toBeLessThanOrEqual(RETAIL_FRONT.z + 0.01);
    }
    // The walkway is the route.
    expect(WALKWAY_Z).toBeGreaterThan(-1.04 + 0.3);
    expect(WALKWAY_Z).toBeLessThan(0.4 - 0.3);
  });

  it("stays off the islands, the terrace and the ring-corridor mouths", () => {
    const boxes = [ISLANDS.stairA, ISLANDS.liftsA, ISLANDS.kiosk, ISLANDS.liftsB, ISLANDS.stairB];
    for (const t of tables) {
      // Table + chairs: x ± 0.85, z ± 0.9.
      for (const b of boxes) {
        const overlap = t.x + 0.85 > b.x0 && t.x - 0.85 < b.x1 && t.z + 0.9 > b.z0 && t.z - 0.9 < b.z1;
        expect(overlap).toBe(false);
      }
      expect(t.x - 0.85 >= TERRACE.x1 || t.z - 0.9 >= TERRACE.z1).toBe(true);
      expect(t.x + 0.85 <= -20.3 || t.x - 0.85 >= -17.8 || t.z < -4).toBe(true);
    }
  });
});

describe("BioCity stands (SPEC §7.1)", () => {
  it("groups every stand in the partner corner, Solita where it was", () => {
    const solita = STANDS.find((s) => s.id === "bc-2")!;
    expect([solita.x, solita.z, ...solita.face]).toEqual([26.35, -2.81, -1, 0]);
    expect(STANDS).toHaveLength(5);
    for (const s of STANDS) {
      for (const [x, z] of standRing(s)) {
        expect(x).toBeGreaterThan(20.9);
        expect(x).toBeLessThan(30.0);
        expect(z).toBeGreaterThan(-8.5);
        expect(z).toBeLessThan(-1.3);
      }
    }
  });

  it("never overlaps another stand (≥ 0.15 m apart)", () => {
    for (let i = 0; i < STANDS.length; i++)
      for (let j = i + 1; j < STANDS.length; j++) {
        const a = standRing(STANDS[i]);
        const b = standRing(STANDS[j]);
        let d = Infinity;
        for (let k = 0; k < 4; k++) for (let m = 0; m < 4; m++) d = Math.min(d, segSegDist(a[k], a[(k + 1) % 4], b[m], b[(m + 1) % 4]));
        expect(d).toBeGreaterThanOrEqual(0.15);
      }
  });

  it("keeps 0.3 m from every CAD wall and column and 0.8 m from the bistro bar", () => {
    for (const s of STANDS) {
      const ring = standRing(s);
      const c = clearance([...ring, ring[0]]);
      if (c.d < 0.3) throw new Error(`${s.id}: ${c.d.toFixed(2)} m from ${c.where}`);
      const bar = MAUNO.bar;
      const barRing: V2[] = [
        [bar.x0, bar.z0],
        [bar.x1, bar.z0],
        [bar.x1, bar.z1],
        [bar.x0, bar.z1],
      ];
      let d = Infinity;
      for (let k = 0; k < 4; k++) for (let m = 0; m < 4; m++) d = Math.min(d, segSegDist(ring[k], ring[(k + 1) % 4], barRing[m], barRing[(m + 1) % 4]));
      expect(d).toBeGreaterThanOrEqual(0.8);
    }
  });

  it("leaves every walking route at least 1 m clear", () => {
    for (const [id, pts] of Object.entries(ROUTE_LEGS_B)) {
      const line = pts.map((p): V2 => [p[0], p[2]]);
      for (const s of STANDS) {
        const ring = standRing(s);
        for (let i = 0; i + 1 < line.length; i++)
          for (let k = 0; k < 4; k++) {
            const d = segSegDist(line[i], line[i + 1], ring[k], ring[(k + 1) % 4]);
            if (d < 1.0) throw new Error(`${id} passes ${d.toFixed(2)} m from ${s.id}`);
          }
      }
    }
  });

  it("keeps the corner's side door and the passage to Joki clear", () => {
    // In front of the east wall's door (z −3.58…−2.67) and of the passage mouth: 1.5 m deep.
    const zones = [
      { x0: 28.6, x1: 30.2, z0: -3.9, z1: -2.3 },
      { x0: 28.6, x1: 30.2, z0: PASSAGE_MOUTH.z0 - 0.3, z1: PASSAGE_MOUTH.z1 + 0.3 },
    ];
    for (const s of STANDS)
      for (const [x, z] of standRing(s))
        for (const zn of zones) expect(x > zn.x0 && x < zn.x1 && z > zn.z0 && z < zn.z1).toBe(false);
  });
});

describe("BioCity route legs (DESIGN §12)", () => {
  const local = routeLegsLocal();

  it("provides every int-bio leg, joining routes.json at the doors", () => {
    expect(Object.keys(local).sort()).toEqual(["int-bio-event-to-lobby", "int-bio-lobby-to-event", "int-bio-tyk-to-joki", "int-bio-tyk-to-stands"]);
    const routes = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/assets/guide/3d/data/routes.json"), "utf8")) as {
      legs: Record<string, { points: V3[] }>;
    };
    const near = (a: V3, b: V3, tol = 0.6) => Math.hypot(a[0] - b[0], a[2] - b[2]) < tol;
    for (const id of Object.keys(local)) {
      const ours = local[id];
      const theirs = routes.legs[id]?.points;
      expect(theirs).toBeDefined();
      expect(near(ours[0], theirs[0])).toBe(true);
      if (id !== "int-bio-event-to-lobby" && id !== "int-bio-lobby-to-event") {
        expect(near(ours[ours.length - 1], theirs[theirs.length - 1])).toBe(true);
      }
    }
    // The Joki leg ends where int-joki-aula-to-showroom starts, on Joki's floor (−1.70).
    const joki = local["int-bio-tyk-to-joki"];
    expect(joki[joki.length - 1][1]).toBeCloseTo(-1.7, 2);
    expect(near(joki[joki.length - 1], [14.04, -1.7, 43.59], 0.15)).toBe(true);
    // Reverse leg.
    expect(local["int-bio-lobby-to-event"]).toEqual([...local["int-bio-event-to-lobby"]].reverse());
  });

  it("keeps 0.3 m from every CAD wall and column", () => {
    for (const [id, pts] of Object.entries(ROUTE_LEGS_B)) {
      const plan = pts.map((p): V2 => [p[0], p[2]]);
      const c = clearance(plan);
      if (c.d < 0.3) throw new Error(`${id}: ${c.d.toFixed(2)} m from ${c.where}`);
    }
  });

  it("stays on BioCity's walkable floor", () => {
    const walk = biocityWalk();
    for (const pts of Object.values(local)) {
      for (const p of pts) {
        const inside = walk.walkAreas.some((a) => pointInPolygon([p[0], p[2]], a.polygon));
        expect(inside).toBe(true);
      }
    }
  });
});

describe("BioCity walk data", () => {
  const walk = biocityWalk();

  it("has finite colliders on biocity-1 and a passage to Joki", () => {
    expect(walk.colliders.length).toBeGreaterThan(500);
    for (const c of walk.colliders) {
      expect(c.level).toBe("biocity-1");
      const nums = c.kind === "segment" ? [...c.a, ...c.b] : [...c.c, c.r];
      for (const n of nums) expect(Number.isFinite(n)).toBe(true);
    }
    const down = walk.connectors.find((c) => c.to === "joki-1");
    expect(down).toBeDefined();
    const ramp = walk.walkAreas.find((a) => a.slope);
    expect(ramp?.slope?.y0).toBeCloseTo(LEVEL.gf, 3);
    expect(ramp?.slope?.y1).toBeCloseTo(JOKI_PASSAGE.bottom, 3);
  });

  it("leaves the doors open: the Tykistökatu revolving door and the event-entrance vestibule", () => {
    const blocked = (p: V2, q: V2) =>
      walk.colliders.some((c) => {
        if (c.kind === "circle") return segDist(c.c, p, q) < c.r;
        // Segment intersection.
        const d = (a: V2, b: V2, e: V2) => (b[0] - a[0]) * (e[1] - a[1]) - (b[1] - a[1]) * (e[0] - a[0]);
        const s1 = d(p, q, c.a);
        const s2 = d(p, q, c.b);
        const s3 = d(c.a, c.b, p);
        const s4 = d(c.a, c.b, q);
        return s1 * s2 < 0 && s3 * s4 < 0;
      });
    // Through the revolving door round its centre post (the route's line) from the recess into the lobby;
    // straight down the axis, the post is in the way.
    for (let i = 0; i + 1 < DOOR_PATH_B.length; i++) {
      expect(blocked(bToLocal(DOOR_PATH_B[i][0], DOOR_PATH_B[i][2]), bToLocal(DOOR_PATH_B[i + 1][0], DOOR_PATH_B[i + 1][2]))).toBe(false);
    }
    expect(blocked(bToLocal(-33, DOOR_PATH_B[0][2]), bToLocal(DOOR_PATH_B[0][0], DOOR_PATH_B[0][2]))).toBe(false);
    expect(blocked(bToLocal(-33, 0.58), bToLocal(-25.5, 0.58))).toBe(true);
    // In through the vestibule from the courtyard.
    expect(blocked(bToLocal(0.02, -38.5), bToLocal(0.02, -33.5))).toBe(false);
    // The gable glass beside the doors is a wall.
    expect(blocked(bToLocal(-33, 4.5), bToLocal(-28, 4.5))).toBe(true);
  });
});

describe("BioCity views and targets", () => {
  it("covers every BioCity view of lib PLACES_3D and every BioCity target", () => {
    for (const key of ["biocity:default", "biocity:entrance", "biocity:gallery", "biocity:stands"]) expect(BIOCITY_VIEWS[key]).toBeDefined();
    const ids = biocityTargets().map((t) => t.id).sort();
    expect(ids).toEqual(
      ["bc-1", "bc-2", "bc-3", "bc-4", "bc-5", "build-hall", "entrance-biocity-courtyard", "entrance-biocity-tykistokatu", "serving-lines"].sort(),
    );
    for (const t of biocityTargets()) {
      for (const n of [...t.view.position, ...t.view.target]) expect(Number.isFinite(n)).toBe(true);
      if (t.walkTo) for (const n of t.walkTo) expect(Number.isFinite(n)).toBe(true);
    }
  });

  it("starts interior walks on the walkable floor", () => {
    const walk = biocityWalk();
    for (const t of biocityTargets()) {
      if (t.level !== "biocity-1" || !t.walkTo) continue;
      expect(walk.walkAreas.some((a) => pointInPolygon(t.walkTo!, a.polygon))).toBe(true);
    }
  });
});

describe("BioCity doors and rooms", () => {
  it("stands the event entrance's doors open: leaves swung clear of a ≥ 1.8 m opening, the route between them", () => {
    const leaves = vestibuleLeaves();
    expect(leaves).toHaveLength(4);
    for (const [a, c] of leaves) {
      // Open ≈ 90°: the leaf runs across the facade line (mostly along z).
      expect(Math.abs(c[1] - a[1])).toBeGreaterThan(0.85);
      expect(Math.abs(c[0] - a[0])).toBeLessThan(0.1);
    }
    const outer = leaves.filter(([a]) => Math.abs(a[1] - VESTIBULE.z0) < 0.1);
    const clear = Math.min(...outer.map(([a, c]) => Math.min(Math.abs(a[0]), Math.abs(c[0])))) * 2;
    expect(clear).toBeGreaterThanOrEqual(1.8);
    for (const p of ROUTE_LEGS_B["int-bio-event-to-lobby"].slice(0, 2)) expect(Math.abs(p[0])).toBeLessThan(VESTIBULE_DOOR.half - 0.3);
  });

  it("routes to Joki through the passage's mouth between the plan's wall stubs", () => {
    const leg = ROUTE_LEGS_B["int-bio-tyk-to-joki"];
    for (let i = 0; i + 1 < leg.length; i++) {
      const [x0, , z0] = leg[i];
      const [x1, , z1] = leg[i + 1];
      if ((x0 - PASSAGE_MOUTH.x) * (x1 - PASSAGE_MOUTH.x) > 0) continue;
      const z = z0 + ((z1 - z0) * (PASSAGE_MOUTH.x - x0)) / (x1 - x0);
      expect(z).toBeGreaterThan(PASSAGE_MOUTH.z0 + 0.3);
      expect(z).toBeLessThan(PASSAGE_MOUTH.z1 - 0.3);
    }
  });

  it("keeps the event's spaces out of the darker 'quiet' rooms (stands, tables, routes)", () => {
    const rings = QUIET_ROOMS.map((r) => {
      const ring: V2[] = [];
      for (let i = 0; i + 1 < r.ring.length; i += 2) ring.push([r.ring[i], r.ring[i + 1]]);
      return { id: r.id, ring };
    });
    const pts: V2[] = [
      ...STANDS.map((s): V2 => [s.x, s.z]),
      ...buildTables().map((t): V2 => [t.x, t.z]),
      ...Object.values(ROUTE_LEGS_B).flat().map((p): V2 => [p[0], p[2]]),
    ];
    for (const p of pts) for (const r of rings) if (pointInPolygon(p, r.ring)) throw new Error(`${p} lies in ${r.id}`);
  });
});
