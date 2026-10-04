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
  ROUTE_J,
  buildLayout,
  counterPose,
  floor1Obstacles,
  obstacleDistance,
  polylineClearance,
} from "../joki/layout";
import { hallRoofOutline, WALKWAY } from "../joki/lowwing";
import { TOWER_STANDS, slabHides, standLabelHeight, standPose } from "../jokiTower";
import { f1Visible, walkData } from "../joki";
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
