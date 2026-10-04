/**
 * Pure logic of props/vehicles.ts against the real campus data: lane geometry,
 * signal plan, car following, parking layout and occupancy, the display
 * placements and the procedural car models' dimensions.
 *
 * three (and its addons) are ESM; Node 24 can require() them natively, so the
 * mocks hand over the real modules (as in world/__tests__/massing.test.ts).
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));
jest.mock("three/addons/utils/BufferGeometryUtils.js", () => nodeRequire()("three/addons/utils/BufferGeometryUtils.js"));
jest.mock("three/addons/geometries/RoundedBoxGeometry.js", () => nodeRequire()("three/addons/geometries/RoundedBoxGeometry.js"));
jest.mock("three/addons/renderers/CSS2DRenderer.js", () => nodeRequire()("three/addons/renderers/CSS2DRenderer.js"));
jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));

import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import type { CampusData, StreetsData } from "../../data/campus";
import type { V2 } from "../../types";
import { pointInRing } from "../../util";
import { PLAN_FRAMES, localToPlan } from "../../frame";
import { GABLE_W_X } from "../../buildings/biocity/plan";
import {
  CAR_SPECS,
  DISPLAY_CARS,
  GCLASS,
  LANES,
  PARKING_STRIPS,
  PROBE_AT,
  PROBE_BOX,
  Polyline,
  SIGNAL_PLAN,
  buildBusGeometry,
  buildCarBoxGeometry,
  buildCarGeometry,
  buildGClass,
  buildGClassFar,
  buildRoutes,
  collectStalls,
  dropoffInterval,
  idmAccel,
  JUNCTIONS,
  TrafficSim,
  layoutStalls,
  parkingOccupancy,
  pickCarColour,
  pickCarType,
  signalColour,
  stallsFromSpaces,
  stripStalls,
  trafficLevel,
} from "../vehicles";

const DATA = path.join(process.cwd(), "public/assets/guide/3d/data");
const campus = JSON.parse(fs.readFileSync(path.join(DATA, "campus.json"), "utf8")) as CampusData;
const streets = JSON.parse(fs.readFileSync(path.join(DATA, "streets.json"), "utf8")) as StreetsData;

const triangles = (g: THREE.BufferGeometry) => (g.index ? g.index.count : g.getAttribute("position").count) / 3;
const noNaN = (g: THREE.BufferGeometry) => Array.from(g.getAttribute("position").array as Float32Array).every(Number.isFinite);

describe("Polyline", () => {
  const line = new Polyline([0, 0, 10, 0, 10, 10]);
  it("measures and samples by arc length", () => {
    expect(line.length).toBeCloseTo(20);
    expect(line.at(5)).toEqual([5, 0]);
    expect(line.at(15)).toEqual([10, 5]);
    expect(line.at(-3)).toEqual([0, 0]);
    expect(line.at(99)).toEqual([10, 10]);
  });
  it("gives smoothed unit directions", () => {
    const d = line.dir(3);
    expect(d[0]).toBeCloseTo(1);
    expect(Math.hypot(d[0], d[1])).toBeCloseTo(1);
  });
  it("still gives a direction at and beyond the ends (a bus spawning at s = 0 sits 6 m back)", () => {
    for (const s of [-6, 0, 0.5]) expect(line.dir(s, 2.4)).toEqual([1, 0]);
    for (const s of [20, 25]) {
      const d = line.dir(s, 2.4);
      expect(d[0]).toBeCloseTo(0);
      expect(d[1]).toBeCloseTo(1);
    }
  });
  it("projects points and finds crossings", () => {
    expect(line.project([4, 2])).toEqual({ s: 4, d: 2 });
    expect(line.crossings([5, -1], [5, 1])).toEqual([5]);
    expect(line.crossings([20, 20], [21, 21])).toEqual([]);
  });
});

describe("signal plan", () => {
  const cycle = SIGNAL_PLAN.greenA + SIGNAL_PLAN.greenB + 2 * (SIGNAL_PLAN.amber + SIGNAL_PLAN.allRed);
  it("never shows green to both phases, and gives each a green", () => {
    let greenA = 0;
    let greenB = 0;
    for (let t = 0; t < cycle; t += 0.25) {
      const a = signalColour("A", t);
      const b = signalColour("B", t);
      expect(a === "green" && b === "green").toBe(false);
      if (a === "green") greenA++;
      if (b === "green") greenB++;
    }
    expect(greenA * 0.25).toBeCloseTo(SIGNAL_PLAN.greenA, 0);
    expect(greenB * 0.25).toBeCloseTo(SIGNAL_PLAN.greenB, 0);
  });
  it("is periodic and honours the junction offset", () => {
    expect(signalColour("A", 5)).toBe(signalColour("A", 5 + cycle));
    expect(signalColour("A", 0, 30.5)).toBe("amber");
  });
});

describe("car following (IDM)", () => {
  it("accelerates on a free road and holds the desired speed", () => {
    expect(idmAccel(0, 11, Infinity, 0)).toBeGreaterThan(1.3);
    expect(Math.abs(idmAccel(11, 11, Infinity, 0))).toBeLessThan(1e-9);
  });
  it("brakes hard for a stopped queue close ahead and stays put at the minimum gap", () => {
    expect(idmAccel(11, 11, 12, 11)).toBeLessThan(-3);
    expect(idmAccel(0, 11, 2.2, 0)).toBeLessThanOrEqual(0.001);
  });
});

describe("lanes and parking strips (street data)", () => {
  it("every lane is a long, clean polyline inside the campus", () => {
    for (const [id, flat] of Object.entries(LANES)) {
      const line = new Polyline(flat);
      expect(line.pts.length).toBeGreaterThan(8);
      expect(line.length).toBeGreaterThan(100);
      for (const [x, z] of line.pts) {
        expect(x).toBeGreaterThan(-185);
        expect(x).toBeLessThan(345);
        expect(z).toBeGreaterThan(-210);
        expect(z).toBeLessThan(280);
      }
      for (let i = 1; i < line.pts.length; i++) expect(line.cum[i]).toBeGreaterThan(line.cum[i - 1]);
      void id;
    }
  });
  it("opposite directions keep right, 3–6 m apart (Lemminkäisenkatu at DataCity)", () => {
    const se = new Polyline(LANES["lem-se"]);
    const nw = new Polyline(LANES["lem-nw"]);
    const p: V2 = [20, 82];
    const a = se.at(se.project(p).s);
    const b = nw.at(nw.project(p).s);
    const gap = Math.hypot(a[0] - b[0], a[1] - b[1]);
    expect(gap).toBeGreaterThan(2.8);
    expect(gap).toBeLessThan(6);
    // South-east-bound traffic is on the south-west side (right-hand traffic).
    const d = se.dir(se.project(p).s);
    const right = (b[0] - a[0]) * -d[1] + (b[1] - a[1]) * d[0];
    expect(right).toBeLessThan(0);
  });
  it("parking strips are long enough for cars and leave the lanes clear", () => {
    for (const [lane, runs] of Object.entries(PARKING_STRIPS)) {
      const line = LANES[lane] ? new Polyline(LANES[lane]) : null;
      for (const run of runs) {
        const strip = new Polyline(run);
        expect(strip.length).toBeGreaterThan(10);
        if (!line) continue;
        for (const p of strip.pts) expect(line.project(p).d).toBeGreaterThan(1.6);
      }
    }
  });
});

describe("routes from the City's signalised crossings", () => {
  const routes = buildRoutes(streets, 1);
  const byId = Object.fromEntries(routes.map((r) => [r.id, r]));
  it("builds every route with stop lines where it enters a signalled junction", () => {
    expect(routes.map((r) => r.id).sort()).toEqual(Object.keys(LANES).filter((k) => !k.startsWith("sirk")).sort());
    // Tykistökatu passes both signalled junctions; the side streets one each.
    expect(byId["tyk-ne-1"].stops.length).toBe(2);
    expect(byId["tyk-sw-1"].stops.length).toBe(2);
    expect(byId["lem-se"].stops.length).toBe(1);
    expect(byId["jouk-nw"].stops.length).toBe(1);
    for (const r of routes) for (const s of r.stops) expect(s.s).toBeLessThan(r.line.length);
  });
  it("lets the ring-line buses stop at the DataCity stops on Lemminkäisenkatu", () => {
    expect(byId["lem-se"].busStops.length + byId["lem-nw"].busStops.length).toBeGreaterThanOrEqual(2);
  });
});

describe("traffic by the clock", () => {
  it("peaks on Friday afternoon, nearly empty in the small hours, no buses at night", () => {
    const peak = trafficLevel("2026-11-06T16:00");
    const night = trafficLevel("2026-11-07T01:00");
    expect(peak.cars).toBeCloseTo(1, 1);
    expect(peak.buses).toBe(1);
    expect(night.cars).toBeLessThan(0.15);
    expect(night.buses).toBe(0);
    expect(trafficLevel("2026-11-07T11:00").cars).toBeLessThan(peak.cars);
  });
  it("sends drop-off taxis to BioCity while companies arrive, none in the early hours", () => {
    expect(dropoffInterval("2026-11-06T15:30")).toBeGreaterThan(0);
    expect(dropoffInterval("2026-11-06T15:30")).toBeLessThan(120);
    expect(dropoffInterval("2026-11-07T04:00")).toBe(0);
    expect(dropoffInterval("2026-11-07T09:00")).toBeGreaterThan(0);
  });
});

describe("traffic simulation (headless, 15 minutes at the Friday peak)", () => {
  const routes = buildRoutes(streets, 1);
  const sim = new TrafficSim(routes, 60, 7);
  sim.setLevel({ cars: 1, buses: 1 });
  sim.taxiEvery = 60;
  const h = 1 / 30;
  let redRuns = 0;
  let oldest = 0;
  let busDwells = 0;
  let dropoffs = 0;
  let maxMovers = 0;
  const prev = new Map<unknown, number>();
  for (let step = 0; step < 900 * 30; step++) {
    sim.step(h);
    const t = sim.time;
    maxMovers = Math.max(maxMovers, sim.movers.length);
    for (const m of sim.movers) {
      oldest = Math.max(oldest, m.age);
      if (m.type === "bus" && m.dwell > 0) busDwells++;
      if (m.dropoff === -2) dropoffs++;
      const before = prev.get(m) ?? m.s;
      // Front bumper crossing a stop line on red (amber is allowed once too close to stop).
      for (const st of sim.routes[m.route].stops) {
        if (before < st.s && m.s >= st.s && signalColour(st.phase, t, JUNCTIONS[st.junction].offset) === "red") redRuns++;
      }
      prev.set(m, m.s);
    }
  }
  it("keeps the streets moving: nobody stuck, a busy but not jammed street", () => {
    expect(oldest).toBeLessThan(240);
    expect(maxMovers).toBeGreaterThan(15);
    expect(maxMovers).toBeLessThan(60);
  });
  it("stops at red lights", () => {
    expect(redRuns).toBe(0);
  });
  it("lets buses dwell at their stops and taxis drop partners at BioCity", () => {
    expect(busDwells).toBeGreaterThan(0);
    expect(dropoffs).toBeGreaterThan(0);
  });
});

describe("parking", () => {
  it("lays bays out inside a car park, clear of each other", () => {
    const lot: V2[] = [
      [0, 0],
      [0, 22],
      [30, 22],
      [30, 0],
    ];
    const stalls = layoutStalls(lot, [], 1);
    expect(stalls.length).toBeGreaterThan(20);
    for (const s of stalls) expect(pointInRing([s.x, s.z], lot)).toBe(true);
    for (let i = 0; i < stalls.length; i++) {
      for (let j = i + 1; j < stalls.length; j++) {
        expect(Math.hypot(stalls[i].x - stalls[j].x, stalls[i].z - stalls[j].z)).toBeGreaterThan(2.3);
      }
    }
  });
  it("takes a mapped space's centre and long axis", () => {
    const [s] = stallsFromSpaces(
      [
        [
          [0, 0],
          [2.5, 0],
          [2.5, 5],
          [0, 5],
        ],
      ],
      3,
    );
    expect(s.x).toBeCloseTo(1.25);
    expect(s.z).toBeCloseTo(2.5);
    // Nose north or south (± a few degrees).
    const h = ((s.heading % 180) + 180) % 180;
    expect(Math.min(h, 180 - h)).toBeLessThan(3);
  });
  it("parks kerbside cars at least one car length apart", () => {
    const stalls = stripStalls(new Polyline([0, 0, 60, 0]), () => 90, 9);
    expect(stalls.length).toBeGreaterThanOrEqual(8);
    for (let i = 1; i < stalls.length; i++) expect(stalls[i].x - stalls[i - 1].x).toBeGreaterThan(5.5);
  });
  it("fills the real car parks and kerbs, never inside a building", () => {
    const stalls = collectStalls(campus, 5000, [60, 0]);
    expect(stalls.length).toBeGreaterThan(400);
    const rings = campus.buildings.filter((b) => !(b.minHeight && b.minHeight > 2)).map((b) => b.polygon);
    const inside = stalls.filter((s) => rings.some((r) => pointInRing([s.x, s.z], r)));
    expect(inside.length).toBe(0);
    // The tier limit keeps the cars nearest the event.
    const few = collectStalls(campus, 100, [60, 0]);
    expect(few.length).toBe(100);
  });
  it("follows the working week: full office car parks on Friday afternoon, empty at night", () => {
    expect(parkingOccupancy("2026-11-06T15:30", "lot")).toBeGreaterThan(0.75);
    expect(parkingOccupancy("2026-11-07T01:00", "lot")).toBeLessThan(0.2);
    expect(parkingOccupancy("2026-11-07T01:00", "street")).toBeGreaterThan(parkingOccupancy("2026-11-07T01:00", "lot"));
  });
  it("picks Finnish colours and body types from the whole range", () => {
    expect(pickCarColour(0).color).toBe("#e9eaeb");
    expect(pickCarColour(0.999).color).toMatch(/^#/);
    expect(pickCarType(0)).toBe("hatch");
    expect(pickCarType(0.99)).toBe("van");
  });
});

describe("supercar display", () => {
  it("places the cars on the organiser's bays (footprints as in SPEC §5.3)", () => {
    // SPEC footprint corners of car A: (−26.25,−22.10) (−27.88,−20.97) (−25.09,−16.97) (−23.47,−18.11).
    const a = DISPLAY_CARS[0];
    const h = (a.heading * Math.PI) / 180;
    const f: V2 = [Math.sin(h), -Math.cos(h)];
    const r: V2 = [-f[1], f[0]];
    const corner = (lf: number, lr: number): V2 => [a.at[0] + f[0] * lf + r[0] * lr, a.at[1] + f[1] * lf + r[1] * lr];
    const spec: V2[] = [
      [-26.25, -22.1],
      [-27.88, -20.97],
      [-25.09, -16.97],
      [-23.47, -18.11],
    ];
    const ours = [corner(2.435, 0.99), corner(2.435, -0.99), corner(-2.435, -0.99), corner(-2.435, 0.99)];
    for (const p of spec) expect(Math.min(...ours.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])))).toBeLessThan(0.08);
  });
  it("keeps the cars clear of each other", () => {
    for (let i = 0; i < DISPLAY_CARS.length; i++) {
      for (let j = i + 1; j < DISPLAY_CARS.length; j++) {
        const [a, b] = [DISPLAY_CARS[i].at, DISPLAY_CARS[j].at];
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(5);
      }
    }
  });
  it("builds the off-roader to its real size, within the triangle budget", () => {
    for (const detail of [1, 0.5]) {
      const bag = buildGClass({ detail, bodyColouredTrim: true, spareCentre: "black", caliper: "#5a5d61" });
      const box = new THREE.Box3();
      let tris = 0;
      for (const list of bag.parts.values()) {
        for (const g of list) {
          expect(noNaN(g)).toBe(true);
          g.computeBoundingBox();
          if (g.boundingBox) box.union(g.boundingBox);
          tris += triangles(g);
        }
      }
      const size = box.getSize(new THREE.Vector3());
      expect(size.z).toBeGreaterThan(GCLASS.lengthWithSpare - 0.12);
      expect(size.z).toBeLessThan(GCLASS.lengthWithSpare + 0.12);
      expect(size.x).toBeGreaterThan(GCLASS.widthMirrors - 0.1);
      expect(size.x).toBeLessThan(GCLASS.widthMirrors + 0.1);
      expect(size.y).toBeGreaterThan(GCLASS.height - 0.08);
      expect(size.y).toBeLessThan(GCLASS.height + 0.08);
      expect(box.min.y).toBeGreaterThanOrEqual(-0.001);
      expect(tris).toBeLessThan(detail === 1 ? 19000 : 10000);
    }
    expect(triangles(buildGClassFar())).toBeLessThan(700);
  });
  it("projects the reflections on a box round the recess that holds the probe and every car", () => {
    // Box-projected probe (plan frame B): the glass gable is its far face; the probe and all of
    // every car (footprint corners, sills to roof) must lie inside, or a door would reflect the wrong wall.
    const inside = (x: number, y: number, z: number) => {
      const [px, pz] = localToPlan(PLAN_FRAMES.B, x, z);
      return (
        px > PROBE_BOX.min[0] && px < PROBE_BOX.max[0] && y > PROBE_BOX.min[1] && y < PROBE_BOX.max[1] && pz > PROBE_BOX.min[2] && pz < PROBE_BOX.max[2]
      );
    };
    expect(PROBE_BOX.max[0]).toBeCloseTo(GABLE_W_X, 2);
    expect(inside(...PROBE_AT)).toBe(true);
    for (const c of DISPLAY_CARS) {
      const h = (c.heading * Math.PI) / 180;
      const f: V2 = [Math.sin(h), -Math.cos(h)];
      for (const [lf, lr] of [
        [GCLASS.lengthWithSpare / 2, GCLASS.widthMirrors / 2],
        [GCLASS.lengthWithSpare / 2, -GCLASS.widthMirrors / 2],
        [-GCLASS.lengthWithSpare / 2, GCLASS.widthMirrors / 2],
        [-GCLASS.lengthWithSpare / 2, -GCLASS.widthMirrors / 2],
      ]) {
        const x = c.at[0] + f[0] * lf - f[1] * lr;
        const z = c.at[1] + f[1] * lf + f[0] * lr;
        for (const y of [0.2, GCLASS.height]) expect(inside(x, y, z)).toBe(true);
      }
    }
  });
});

describe("everyday vehicles", () => {
  it("builds every body type to its size with part ids, near and far", () => {
    for (const type of Object.keys(CAR_SPECS) as (keyof typeof CAR_SPECS)[]) {
      const spec = CAR_SPECS[type];
      for (const lod of [0, 1] as const) {
        const g = buildCarGeometry(type, lod);
        expect(noNaN(g)).toBe(true);
        expect(g.getAttribute("aPart")).toBeDefined();
        g.computeBoundingBox();
        const size = g.boundingBox!.getSize(new THREE.Vector3());
        expect(size.z).toBeGreaterThan(spec.L - 0.1);
        expect(size.z).toBeLessThan(spec.L + 0.1);
        expect(size.x).toBeLessThan(spec.W + 0.35);
        expect(triangles(g)).toBeLessThan(lod === 0 ? 1900 : 650);
      }
      expect(triangles(buildCarBoxGeometry(type))).toBeLessThan(150);
    }
    // Taxis are estates with a roof sign (part 9).
    const taxi = buildCarGeometry("taxi", 0);
    expect(Array.from(taxi.getAttribute("aPart").array as Float32Array)).toContain(9);
    const bus = buildBusGeometry(0);
    bus.computeBoundingBox();
    expect(bus.boundingBox!.getSize(new THREE.Vector3()).z).toBeGreaterThan(11.9);
  });
});
