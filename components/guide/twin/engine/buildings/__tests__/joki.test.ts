/**
 * three (and its addons) are ESM; this Jest setup runs CommonJS. Node 24 can
 * require() ES modules natively, so the mocks below hand over the real
 * modules through Node's own loader — the tests run against real three.js.
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));
jest.mock("three/addons/utils/BufferGeometryUtils.js", () => nodeRequire()("three/addons/utils/BufferGeometryUtils.js"));
jest.mock("three/addons/renderers/CSS2DRenderer.js", () => nodeRequire()("three/addons/renderers/CSS2DRenderer.js"));
jest.mock("three/addons/geometries/RoundedBoxGeometry.js", () => nodeRequire()("three/addons/geometries/RoundedBoxGeometry.js"));
jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));

import fs from "fs";
import path from "path";
import * as THREE from "three";
import type { V2, WalkArea } from "../../types";
import { FIN_COUNT, FIN_CUTOUTS, angleBetween, finBottom, finLayout, jl, lj, polar, prism, signedArea, Y } from "../joki/kit";
import {
  AULA_OUTLINE,
  AULA_TABLE_SPECS,
  COUNTER_BEARINGS,
  ROUTE_F2_J,
  ROUTE_F3_J,
  ROUTE_J,
  buildLayout,
  counterPose,
  floor1Obstacles,
  obstacleDistance,
  polylineClearance,
} from "../joki/layout";
import { hallRoofOutline, WALKWAY } from "../joki/lowwing";
import { TOWER_STANDS, coreHides, slabHides, standLabelHeight, standPose } from "../jokiTower";
import { CUT_EYE_LEVEL, ROOM_LABELS, f1RoomAt, f1Visible, jokiLevelAt, walkData } from "../joki";
import type { Collider2D, LevelId } from "../../types";
import { CHALLENGE_COMPANIES, SHOWROOM_ORDER } from "@/lib/hackathon-2026/companies";
import { TARGETS_3D, PLACES_3D } from "@/lib/hackathon-2026/twin";
import { pointInPolygon } from "../../nav/collision";

const routes = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/assets/guide/3d/data/routes.json"), "utf8")) as {
  legs: Record<string, { points: [number, number, number][] }>;
};

describe("Joki fin screen (SPEC §3.2.2)", () => {
  const fins = finLayout();

  it("has 448 elements: 384 fins and 64 posts on the mullion lines", () => {
    expect(fins).toHaveLength(FIN_COUNT);
    expect(fins.filter((f) => f.post)).toHaveLength(64);
    const pitch = angleBetween(fins[1].bearing, fins[0].bearing);
    expect(pitch).toBeCloseTo(0.8036, 3);
  });

  it("hangs 0.2 m above floor 2 except over the two smile cut-outs", () => {
    for (const f of fins) {
      for (const [y0, y1] of f.pieces) {
        expect(y0).toBeGreaterThanOrEqual(Y.finBottom - 1e-9);
        expect(y1).toBeLessThanOrEqual(Y.finTop + 1e-9);
        expect(y1).toBeGreaterThan(y0);
      }
    }
    for (const c of FIN_CUTOUTS) expect(finBottom(c.centre)).toBeCloseTo(c.apex, 5);
    expect(finBottom(90)).toBeCloseTo(Y.finBottom, 5);
    // The profile falls monotonically from the apex to the plain edge.
    let prev = Infinity;
    for (let d = 0; d <= 60; d += 5) {
      const y = finBottom(0.5 + d);
      expect(y).toBeLessThanOrEqual(prev + 1e-9);
      prev = y;
    }
  });

  it("opens at the floor-3 door to the external stair", () => {
    const atDoor = fins.filter((f) => angleBetween(f.bearing, 90.5) < 5);
    expect(atDoor.length).toBeGreaterThan(8);
    for (const f of atDoor) {
      expect(f.pieces).toHaveLength(2);
      // Nothing between the stair's underside and the door head.
      expect(f.pieces[0][1]).toBeLessThan(Y.f3 - 0.8);
      expect(f.pieces[1][0]).toBeGreaterThan(Y.f3 + 2.3);
    }
  });
});

describe("J frame helpers", () => {
  it("puts the tower centre where SPEC §1.3 has it and round-trips", () => {
    const [x, z] = jl(0, 0);
    expect(x).toBeCloseTo(58.894, 3);
    expect(z).toBeCloseTo(15.934, 3);
    const p = jl(-17.3, 58.8);
    expect(p[0]).toBeCloseTo(8.58, 1);
    expect(p[1]).toBeCloseTo(50.94, 1);
    const back = lj(p[0], p[1]);
    expect(back[0]).toBeCloseTo(-17.3, 6);
    expect(back[1]).toBeCloseTo(58.8, 6);
  });

  it("builds prisms with outward side normals for either ring orientation", () => {
    for (const ring of [
      [
        [0, 0],
        [2, 0],
        [2, 1],
        [0, 1],
      ],
      [
        [0, 0],
        [0, 1],
        [2, 1],
        [2, 0],
      ],
    ] as V2[][]) {
      const g = prism(ring, 0, 1, { top: true, bottom: true });
      const pos = g.getAttribute("position");
      const nor = g.getAttribute("normal");
      const c = new THREE.Vector3(1, 0.5, 0.5);
      for (let i = 0; i < pos.count; i++) {
        const p = new THREE.Vector3().fromBufferAttribute(pos, i);
        const n = new THREE.Vector3().fromBufferAttribute(nor, i);
        expect(n.dot(p.clone().sub(c))).toBeGreaterThan(0);
      }
    }
    expect(signedArea(AULA_OUTLINE)).not.toBe(0);
  });
});

describe("Joki floor 1 event layout (TTK placement plans)", () => {
  const layout = buildLayout();

  it("has the Aula's 33 tables and the Cave's 42 tables with 210 seats", () => {
    expect(AULA_TABLE_SPECS).toHaveLength(33);
    expect(layout.aula).toHaveLength(33);
    expect(layout.cave).toHaveLength(42);
    expect(layout.cave.reduce((s, t) => s + t.seats.length, 0)).toBe(210);
    expect(layout.aula.reduce((s, t) => s + t.seats.length, 0)).toBeGreaterThan(120);
  });

  it("keeps every Aula table inside the Aula and off the ramp", () => {
    for (const t of layout.aula) {
      expect(pointInPolygon([t.x, t.z], AULA_OUTLINE)).toBe(true);
      expect(t.z).toBeGreaterThan(18.07);
    }
  });

  it("never puts a chair inside a table", () => {
    const tables = [...layout.aula, ...layout.cave];
    const obs = floor1Obstacles({ aula: tables.map((t) => ({ ...t, seats: [] })), cave: [] });
    for (const t of tables)
      for (const s of t.seats) {
        const d = Math.min(...obs.filter((o) => o.poly).map((o) => obstacleDistance([s.x, s.z], o)));
        expect(d).toBeGreaterThan(0.2);
      }
  });
});

describe("int-joki-aula-to-showroom (DESIGN §12)", () => {
  const leg = routes.legs["int-joki-aula-to-showroom"].points;

  it("starts and ends where routes.json has the leg", () => {
    const first = jl(ROUTE_J[0][0], ROUTE_J[0][2]);
    const last = jl(ROUTE_J[ROUTE_J.length - 1][0], ROUTE_J[ROUTE_J.length - 1][2]);
    expect(first[0]).toBeCloseTo(leg[0][0], 1);
    expect(first[1]).toBeCloseTo(leg[0][2], 1);
    expect(last[0]).toBeCloseTo(leg[leg.length - 1][0], 1);
    expect(last[1]).toBeCloseTo(leg[leg.length - 1][2], 1);
    expect(ROUTE_J[0][1]).toBeCloseTo(Y.aula, 5);
    expect(ROUTE_J[ROUTE_J.length - 1][1]).toBeCloseTo(Y.f1, 5);
  });

  it("walks clear of the tables and chairs (≥ 0.4 m)", () => {
    const layout = buildLayout();
    const aulaPart = ROUTE_J.filter((p) => p[2] > 17).map((p) => [p[0], p[2]] as V2);
    expect(polylineClearance(aulaPart, floor1Obstacles(layout))).toBeGreaterThan(0.4);
  });

  it("climbs the ramp (+0.6 m) and never steps up or down abruptly", () => {
    for (let i = 1; i < ROUTE_J.length; i++) {
      const a = ROUTE_J[i - 1];
      const b = ROUTE_J[i];
      const run = Math.hypot(b[0] - a[0], b[2] - a[2]);
      expect(Math.abs(b[1] - a[1])).toBeLessThanOrEqual(run * 0.09 + 1e-6);
    }
  });
});

describe("int-joki-showroom-to-f2 / -f3: up the tower stair", () => {
  for (const [name, leg, top] of [
    ["f2", ROUTE_F2_J, Y.f2],
    ["f3", ROUTE_F3_J, Y.f3],
  ] as const) {
    it(`${name}: continues from the Showroom leg's end and arrives on its floor inside the glass`, () => {
      expect(leg[0]).toEqual(ROUTE_J[ROUTE_J.length - 1]);
      const end = leg[leg.length - 1];
      expect(end[1]).toBeCloseTo(top, 5);
      expect(Math.hypot(end[0], end[2])).toBeLessThan(8.5);
    });

    it(`${name}: climbs at a stair's pitch (≤ 35°) and never drops`, () => {
      for (let i = 1; i < leg.length; i++) {
        const a = leg[i - 1];
        const b = leg[i];
        const run = Math.hypot(b[0] - a[0], b[2] - a[2]);
        expect(b[1]).toBeGreaterThanOrEqual(a[1] - 1e-9);
        expect(b[1] - a[1]).toBeLessThanOrEqual(run * Math.tan((35 * Math.PI) / 180) + 1e-6);
      }
    });
  }
});

describe("Showroom counters (SPEC §7.2)", () => {
  it("sits the six counters at the corrected J-bearings, facing the centre", () => {
    expect(COUNTER_BEARINGS).toEqual([186.7, 218, 250, 281, 312, 341]);
    expect(SHOWROOM_ORDER).toHaveLength(6);
    COUNTER_BEARINGS.forEach((_, i) => {
      const c = counterPose(i);
      expect(Math.hypot(c.x, c.z)).toBeCloseTo(7.55, 2);
      // Front (+z of the model) points at the tower centre.
      const fx = Math.sin(c.yaw);
      const fz = Math.cos(c.yaw);
      expect(fx * -c.x + fz * -c.z).toBeGreaterThan(0.99 * Math.hypot(c.x, c.z));
    });
  });
});

describe("Tower stands (SPEC §7.3, event map joki-2-3)", () => {
  it("places every floor-2/3 company where the event map has it", () => {
    for (const c of CHALLENGE_COMPANIES.filter((x) => x.qa.floor !== 1)) {
      const s = TOWER_STANDS[c.id];
      expect(s).toBeDefined();
      expect(s.floor).toBe(c.qa.floor);
      expect(Math.hypot(s.x, s.z)).toBeLessThan(7.2);
      const p = standPose(c.id);
      expect(Math.sin(p.yaw) * -s.x + Math.cos(p.yaw) * -s.z).toBeGreaterThan(0);
    }
  });
});

describe("Joki walk data", () => {
  const { walkAreas, colliders, connectors } = walkData(buildLayout());
  const areasOf = (level: string): WalkArea[] => walkAreas.filter((a) => a.level === level);

  it("has walk areas and colliders on all three floors", () => {
    for (const level of ["joki-1", "joki-2", "joki-3"]) {
      expect(areasOf(level).length).toBeGreaterThan(0);
      expect(colliders.some((c) => c.level === level)).toBe(true);
    }
    const ramp = walkAreas.find((a) => a.slope);
    expect(ramp?.slope?.y0).toBeCloseTo(Y.aula, 5);
    expect(ramp?.slope?.y1).toBeCloseTo(Y.f1, 5);
  });

  it("connects floors 1–3 by stair and lift, each hotspot and arrival on a walk area", () => {
    const ids = connectors.map((c) => c.id);
    for (const id of ["joki-stair-1-2", "joki-stair-2-1", "joki-stair-2-3", "joki-stair-3-2", "joki-lift-1-3", "joki-lift-3-1"]) {
      expect(ids).toContain(id);
    }
    for (const c of connectors) {
      if (c.to === "biocity-1") continue;
      expect(areasOf(c.from).some((a) => pointInPolygon(c.at, a.polygon))).toBe(true);
      expect(areasOf(c.to).some((a) => pointInPolygon(c.arrive, a.polygon))).toBe(true);
    }
  });

  it("keeps the BioCity passage open (no wall across it)", () => {
    const a = jl(-17.66, 48.01);
    const b = jl(-18.56, 51.1);
    const mid: V2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const near = colliders.filter((c) => c.level === "joki-1" && c.kind === "segment" && distToSeg(mid, c.a, c.b) < 0.4);
    expect(near).toHaveLength(0);
  });
});

/**
 * Flood fill over a level's walk data: 0.1 m cells inside a walk area whose centre clears every collider
 * by the walker's radius (0.3 m, less a hair for the grid), 4-connected.
 */
function reachable(walk: ReturnType<typeof walkData>, level: LevelId, from: V2) {
  const areas = walk.walkAreas.filter((a) => a.level === level);
  const cols = walk.colliders.filter((c) => c.level === level);
  const xs = areas.flatMap((a) => a.polygon.map((p) => p[0]));
  const zs = areas.flatMap((a) => a.polygon.map((p) => p[1]));
  const step = 0.1;
  const x0 = Math.min(...xs);
  const z0 = Math.min(...zs);
  const nx = Math.ceil((Math.max(...xs) - x0) / step) + 1;
  const nz = Math.ceil((Math.max(...zs) - z0) / step) + 1;
  // Colliders bucketed per metre, padded by the radius.
  const buckets = new Map<string, Collider2D[]>();
  const key = (i: number, j: number) => `${i},${j}`;
  for (const c of cols) {
    const [ax, az, bx, bz, pad] = c.kind === "segment" ? [c.a[0], c.a[1], c.b[0], c.b[1], 0.35] : [c.c[0], c.c[1], c.c[0], c.c[1], c.r + 0.35];
    for (let i = Math.floor(Math.min(ax, bx) - pad); i <= Math.floor(Math.max(ax, bx) + pad); i++)
      for (let j = Math.floor(Math.min(az, bz) - pad); j <= Math.floor(Math.max(az, bz) + pad); j++) {
        const list = buckets.get(key(i, j)) ?? [];
        list.push(c);
        buckets.set(key(i, j), list);
      }
  }
  const clear = (p: V2) =>
    (buckets.get(key(Math.floor(p[0]), Math.floor(p[1]))) ?? []).every((c) =>
      c.kind === "segment" ? distToSeg(p, c.a, c.b) > 0.29 : Math.hypot(p[0] - c.c[0], p[1] - c.c[1]) > c.r + 0.29,
    );
  const free = new Uint8Array(nx * nz);
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const p: V2 = [x0 + i * step, z0 + j * step];
      if (areas.some((a) => pointInPolygon(p, a.polygon)) && clear(p)) free[i * nz + j] = 1;
    }
  const seen = new Uint8Array(nx * nz);
  const cell = (p: V2): [number, number] => [Math.round((p[0] - x0) / step), Math.round((p[1] - z0) / step)];
  // Start from the free cell nearest to `from`.
  const nearestFree = (p: V2): number => {
    const [ci, cj] = cell(p);
    let best = -1;
    let bestD = Infinity;
    for (let i = ci - 4; i <= ci + 4; i++)
      for (let j = cj - 4; j <= cj + 4; j++) {
        if (i < 0 || j < 0 || i >= nx || j >= nz || !free[i * nz + j]) continue;
        const d = (i - ci) ** 2 + (j - cj) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i * nz + j;
        }
      }
    return best;
  };
  const start = nearestFree(from);
  const queue: number[] = start >= 0 ? [start] : [];
  if (start >= 0) seen[start] = 1;
  while (queue.length) {
    const k = queue.pop() as number;
    const i = Math.floor(k / nz);
    const j = k % nz;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const a = i + di;
      const b = j + dj;
      if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const q = a * nz + b;
      if (free[q] && !seen[q]) {
        seen[q] = 1;
        queue.push(q);
      }
    }
  }
  return {
    started: start >= 0,
    /** A point counts as reached when a reached cell lies within 0.25 m of it. */
    reaches(p: V2): boolean {
      const k = nearestFree(p);
      if (k < 0 || !seen[k]) return false;
      const [ci, cj] = cell(p);
      return (Math.floor(k / nz) - ci) ** 2 + ((k % nz) - cj) ** 2 <= 6.5;
    },
  };
}

describe("Joki floor 1 is one walkable floor (BioCity passage → Aula → ramp → Showroom)", () => {
  const walk = walkData(buildLayout());
  // Where BioCity's passage stair lands in the Aula (BioCity's walk data / routes.json).
  const fromPassage = reachable(walk, "joki-1", [14.34, 44.02]);

  it("starts on the floor", () => expect(fromPassage.started).toBe(true));

  it("reaches every Showroom counter's walk-to spot up the ramp", () => {
    SHOWROOM_ORDER.forEach((_, i) => {
      const c = counterPose(i);
      const [wx, wz] = polar(4.4, c.bearing);
      expect(fromPassage.reaches(jl(wx, wz))).toBe(true);
    });
  });

  it("reaches the ramp's top, the Company Lounge rim, the stair foot and the lift", () => {
    for (const p of [
      [0.15, 9.5],
      [3.4, 1.0],
      [0.45, 2.3],
      [0.8, 4.3],
    ] as V2[])
      expect(fromPassage.reaches(jl(p[0], p[1]))).toBe(true);
  });

  it("reaches the Cave through its door by the stage", () => {
    // The door, the walkway along the Cave's west wall, its north-west corner.
    for (const p of [
      [1.4, 24.6],
      [1.8, 24.1],
      [2.0, 22.0],
      [2.0, 15.0],
      [2.0, 9.4],
    ] as V2[])
      expect([p, fromPassage.reaches(jl(p[0], p[1]))]).toEqual([p, true]);
  });

  it("has no wall across the ramp's foot, and ≥ 1.2 m clear width up the ramp", () => {
    const foot = [jl(-3.23, 18.07), jl(1.3, 18.07)];
    const across = walk.colliders.filter(
      (c) => c.level === "joki-1" && c.kind === "segment" && distToSeg(jl(0.2, 18.07), c.a, c.b) < 0.05 && distToSeg(foot[0], c.a, c.b) + distToSeg(foot[1], c.a, c.b) < 1,
    );
    expect(across).toHaveLength(0);
    // Free cells across the ramp at its narrowest (the top, 2.3 m wide between the glazing and the Cave wall).
    let run = 0;
    let best = 0;
    for (let x = -1.0; x <= 1.3; x += 0.05) {
      const ok = fromPassage.reaches(jl(x, 9.2));
      run = ok ? run + 0.05 : 0;
      best = Math.max(best, run);
    }
    // Walker centres need 0.6 m less than the clear width.
    expect(best + 0.6).toBeGreaterThanOrEqual(1.2);
  });
});

describe("Joki floors 2–3: every stand reachable from the stair and the lift", () => {
  const walk = walkData(buildLayout());
  for (const level of ["joki-2", "joki-3"] as const) {
    it(`${level}: stands from the stair and the lift arrivals`, () => {
      const arrivals = walk.connectors.filter((c) => c.to === level).map((c) => c.arrive);
      expect(arrivals.length).toBeGreaterThanOrEqual(3);
      const fill = reachable(walk, level, arrivals[0]);
      for (const a of arrivals) expect(fill.reaches(a)).toBe(true);
      for (const [id, s] of Object.entries(TOWER_STANDS)) {
        if ((s.floor === 2) !== (level === "joki-2")) continue;
        const p = standPose(id);
        const r = Math.hypot(p.x, p.z);
        expect(fill.reaches(jl(p.x - (p.x / r) * 1.7, p.z - (p.z / r) * 1.7))).toBe(true);
      }
    });
  }

  it("serves floors 1–3 by lift from every floor, each destination with its own call point", () => {
    for (const from of ["joki-1", "joki-2", "joki-3"]) {
      const lifts = walk.connectors.filter((c) => c.from === from && c.id.startsWith("joki-lift"));
      expect(lifts.map((c) => c.to).sort()).toEqual(["joki-1", "joki-2", "joki-3"].filter((l) => l !== from));
      expect(Math.hypot(lifts[0].at[0] - lifts[1].at[0], lifts[0].at[1] - lifts[1].at[1])).toBeGreaterThan(0.7);
    }
  });
});

describe("Where the camera is (labels, cut-aways)", () => {
  it("puts a camera on the hall-roof walkway outdoors, not on floor 2", () => {
    // Eye height on the walkway (membrane +2.87) by the tower's south-south-west door and further along.
    expect(jokiLevelAt({ x: -4.9 + 1.0, y: 4.5, z: 25.4 })).toBeNull();
    expect(jokiLevelAt({ x: 8.2, y: 4.5, z: 7.0 })).toBeNull();
    // The north-east deck next to the glass.
    expect(jokiLevelAt({ x: 1.0, y: 4.0, z: -10.5 })).toBeNull();
  });

  it("knows the floors inside", () => {
    expect(jokiLevelAt({ x: -3, y: Y.aula + 1.65, z: 35 })).toBe("joki-1");
    expect(jokiLevelAt({ x: -4, y: Y.f1 + 1.65, z: 1 })).toBe("joki-1");
    expect(jokiLevelAt({ x: 3, y: Y.f2 + 1.65, z: 3 })).toBe("joki-2");
    expect(jokiLevelAt({ x: 3, y: Y.f3 + 1.65, z: 3 })).toBe("joki-3");
  });

  it("names the floor-1 rooms and shows only a room's own labels and exits", () => {
    expect(f1RoomAt(-4, 1)).toBe("showroom");
    expect(f1RoomAt(0.2, 6)).toBe("showroom");
    expect(f1RoomAt(5, -2)).toBe("lounge");
    expect(f1RoomAt(0, 13)).toBe("ramp");
    expect(f1RoomAt(8, 15)).toBe("cave");
    expect(f1RoomAt(-5, 35)).toBe("aula");
    // From the Showroom nothing of the Aula, the Cave or the lounge (behind the drum and the core).
    expect(ROOM_LABELS.showroom).not.toContain("passage");
    expect(ROOM_LABELS.showroom).not.toContain("lounge");
    expect(ROOM_LABELS.showroom).toContain("counters");
    // The BioCity passage only from the Aula.
    for (const room of ["cave", "ramp", "showroom", "lounge"] as const) expect(ROOM_LABELS[room]).not.toContain("passage");
  });

  it("closes the dollhouse cut below eye-level thresholds above each cut", () => {
    expect(CUT_EYE_LEVEL["joki-1"]).toBeGreaterThan(Y.hallRoof + 1.65);
    expect(CUT_EYE_LEVEL["joki-2"]).toBeGreaterThan(Y.f2 + 1.05);
    expect(CUT_EYE_LEVEL["joki-3"]).toBeGreaterThan(Y.f3 + 1.05);
  });
});

describe("Floor 1 visibility from outside (draw-call saver)", () => {
  it("draws floor 1 only where it can be seen: through the NW glazing or the street door", () => {
    // Pihakansi, west of the Aula glazing, eye height.
    expect(f1Visible({ x: -12, y: 2.1, z: 20 })).toBe(true);
    // Lemminkäisenkatu, in front of the street door.
    expect(f1Visible({ x: -14.3, y: -0.2, z: 73.8 })).toBe(true);
    // The north-east deck (only the drum's concrete and the tower are visible from there).
    expect(f1Visible({ x: 1.5, y: 3.95, z: -25 })).toBe(false);
    // Anything above the hall roof looks at the roof.
    expect(f1Visible({ x: -12, y: 30, z: 20 })).toBe(false);
    // Far along the street.
    expect(f1Visible({ x: -14, y: -0.2, z: 160 })).toBe(false);
    // On BioCity's passage stair, looking down into the Aula.
    expect(f1Visible({ x: -19.09, y: 0.6, z: 47.9 })).toBe(true);
  });
});

describe("Tower labels stay on what the camera can see", () => {
  // The Floors 2–3 view: high over the north-east, floor 3 open, floor 2 below it.
  const floorsCam = { x: 25, y: 17.5, z: -10 };

  it("keeps floor-3 stand labels at the roll-up top", () => {
    for (const s of Object.values(TOWER_STANDS).filter((t) => t.floor === 3)) {
      expect(standLabelHeight(floorsCam, 3, s.x, s.z, true)).toBe(2.45);
    }
  });

  it("slides floor-2 stand labels down below the floor-3 slab edge instead of floating over floor 3", () => {
    const revvity = standLabelHeight(floorsCam, 2, TOWER_STANDS.revvity.x, TOWER_STANDS.revvity.z, true);
    const valmet = standLabelHeight(floorsCam, 2, TOWER_STANDS.valmet.x, TOWER_STANDS.valmet.z, true);
    const traficom = standLabelHeight(floorsCam, 2, TOWER_STANDS.traficom.x, TOWER_STANDS.traficom.z, true);
    expect(revvity).toBe(2.45);
    expect(valmet).toBe(2.0);
    expect(traficom).toBe(1.6);
    // At the preferred height the slab hides Valmet's and Traficom's labels.
    expect(slabHides(floorsCam, TOWER_STANDS.valmet.x, Y.f2 + 2.45, TOWER_STANDS.valmet.z, true)).toBe(true);
  });

  it("hides the Chill Zone label (west, under floor 3) from the Floors view, shows it with floor 3 cut away", () => {
    expect(standLabelHeight(floorsCam, 2, -4.65, -0.17, true, [1.6, 1.2, 0.9])).toBeNull();
    expect(standLabelHeight(floorsCam, 2, -4.65, -0.17, false, [1.6, 1.2, 0.9])).toBe(1.6);
  });

  it("never hides a label from a camera standing on its floor", () => {
    const onFloor2 = { x: 2, y: Y.f2 + 1.65, z: 4 };
    const onFloor3 = { x: -3, y: Y.f3 + 1.65, z: 2 };
    for (const s of Object.values(TOWER_STANDS)) {
      const cam = s.floor === 2 ? onFloor2 : onFloor3;
      expect(standLabelHeight(cam, s.floor, s.x, s.z, true)).toBe(2.45);
    }
  });

  it("hides a stand round the other side of the core from a camera on the floor", () => {
    // In the Chill Zone (west), looking east through the core at Valmet.
    expect(coreHides({ x: -5, z: -1 }, TOWER_STANDS.valmet.x, TOWER_STANDS.valmet.z)).toBe(true);
    // North of the core, Revvity is in plain sight.
    expect(coreHides({ x: 1, z: -8 }, TOWER_STANDS.revvity.x, TOWER_STANDS.revvity.z)).toBe(false);
    // On the east side, every east stand is visible.
    for (const id of ["revvity", "valmet", "traficom"]) expect(coreHides({ x: 4, z: 0 }, TOWER_STANDS[id].x, TOWER_STANDS[id].z)).toBe(false);
  });

  it("hides floor-2 labels behind floor 2's own slab from below", () => {
    // Under the tower on the floor-1 deck level, looking up through the slab.
    expect(slabHides({ x: 1, y: 1.5, z: 1 }, TOWER_STANDS.revvity.x, Y.f2 + 2.45, TOWER_STANDS.revvity.z, true)).toBe(true);
  });
});

describe("Joki targets and views cover lib/hackathon-2026/twin.ts", () => {
  it("lists every Joki target id the module provides", () => {
    const joki = TARGETS_3D.filter((t) => t.place === "joki").map((t) => t.id);
    const provided = new Set([
      ...CHALLENGE_COMPANIES.map((c) => c.id),
      "showroom",
      "lounge",
      "aula",
      "cave",
      "chill-zone",
      "entrance-joki-street",
    ]);
    for (const id of joki) expect(provided.has(id)).toBe(true);
    const views = PLACES_3D.find((p) => p.id === "joki")?.views.map((v) => v.id);
    expect(views).toEqual(["default", "showroom", "lounge", "floors"]);
  });
});

describe("Hall roof and walkway (SPEC §3.2.3)", () => {
  it("keeps the public walkway on the hall roof (after the rainbow-stair landing)", () => {
    const roof = hallRoofOutline();
    for (const p of WALKWAY.slice(1, -1)) expect(pointInPolygon(p, roof)).toBe(true);
    // Sampled along the way too.
    for (let i = 2; i < WALKWAY.length - 1; i++) {
      const a = WALKWAY[i - 1];
      const b = WALKWAY[i];
      for (let t = 0; t <= 1; t += 0.1) expect(pointInPolygon([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], roof)).toBe(true);
    }
  });

  it("follows the tower outside its fin ring", () => {
    for (const p of hallRoofOutline()) {
      const r = Math.hypot(p[0], p[1]);
      if (r < 12) expect(r).toBeGreaterThan(9.2);
    }
    expect(polar(9.36, 180)[1]).toBeCloseTo(9.36, 5);
  });
});

function distToSeg(p: V2, a: V2, b: V2): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
}
