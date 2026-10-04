/**
 * three (and its addons) are ESM; this Jest setup runs CommonJS. Node 24 can
 * require() ES modules natively, so the mocks hand over the real modules
 * (process.getBuiltinModule bypasses Jest's registry) — real three.js.
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));
jest.mock("three/addons/utils/BufferGeometryUtils.js", () => nodeRequire()("three/addons/utils/BufferGeometryUtils.js"));
jest.mock("three/addons/renderers/CSS2DRenderer.js", () => nodeRequire()("three/addons/renderers/CSS2DRenderer.js"));
jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));

import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import type { RoutesData } from "../../data/campus";
import type { V3 } from "../../types";
import { TOURS_3D } from "@/lib/hackathon-2026/twin";
import {
  SurfaceIndex,
  buildSurfaceIndex,
  cellsAround,
  dedupeRuns,
  destinationName,
  envelopeHeights,
  formatLegDistance,
  outdoorSpan,
  ribbonGeometry,
  runFades,
  sampleRoute,
} from "../routes";

const routes = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/assets/guide/3d/data/routes.json"), "utf8")) as RoutesData;

describe("route labels", () => {
  it("formats distance markers like the guide", () => {
    expect(formatLegDistance(344.1, 4.4)).toBe("340 m · 4.4 min");
    expect(formatLegDistance(155.1, 2)).toBe("160 m · 2 min");
    expect(formatLegDistance(15.7, 0.2)).toBe("16 m · 10 s");
    expect(formatLegDistance(517.3, 6.6)).toBe("520 m · 6.6 min");
    expect(formatLegDistance(1200, 15.4)).toBe("1200 m · 15 min");
  });

  it("names where each network leg leads", () => {
    expect(destinationName("out-arr-parkcity-edu-b")).toBe("EduCity door B");
    expect(destinationName("out-co-kerb-bio-main")).toBe("BioCity main entrance");
    expect(destinationName("out-unknown", "Platform -> Somewhere nice (note)")).toBe("Somewhere nice");
    expect(destinationName("out-unknown")).toBeNull();
  });
});

describe("route sampling", () => {
  it("samples a polyline evenly with plan arc length and travel directions", () => {
    const pts: V3[] = [
      [0, 0, 0],
      [10, 0, 0],
      [10, 0, 10],
    ];
    const s = sampleRoute(pts, 0.5);
    expect(s.length).toBeGreaterThan(35);
    expect(s[0].p).toEqual([0, 0, 0]);
    const last = s[s.length - 1];
    expect(last.p[0]).toBeCloseTo(10, 6);
    expect(last.p[2]).toBeCloseTo(10, 6);
    // The rounded corner makes the walk a little shorter than 20 m.
    expect(last.u).toBeGreaterThan(19.5);
    expect(last.u).toBeLessThan(20.01);
    // Heading east at the start, south at the end (+z is south).
    expect(s[0].dir[0]).toBeCloseTo(1, 3);
    expect(last.dir[1]).toBeCloseTo(1, 3);
    for (let i = 1; i < s.length; i++) expect(s[i].u).toBeGreaterThan(s[i - 1].u);
  });

  it("samples every outdoor leg of every tour without gaps", () => {
    for (const t of TOURS_3D) {
      for (const id of t.legs) {
        const leg = routes.legs[id];
        expect(leg).toBeDefined();
        if (leg.mode !== "outdoor") continue;
        const s = sampleRoute(leg.points);
        for (let i = 1; i < s.length; i++) {
          const d = Math.hypot(s[i].p[0] - s[i - 1].p[0], s[i].p[2] - s[i - 1].p[2]);
          expect(d).toBeLessThan(0.75);
        }
        // Ends where the leg ends (the door, the kerb).
        const end = leg.points[leg.points.length - 1];
        expect(Math.hypot(s[s.length - 1].p[0] - end[0], s[s.length - 1].p[2] - end[2])).toBeLessThan(0.01);
      }
    }
  });
});

describe("route network dedupe", () => {
  const line = (x0: number, x1: number, z: number): V3[] => [
    [x0, 0, z],
    [x1, 0, z],
  ];

  it("draws a shared stretch once and keeps the unshared parts", () => {
    const a = sampleRoute(line(0, 50, 0));
    const b = sampleRoute([
      [20, 0, 20],
      [20, 0, 0],
      [45, 0, 0],
    ]);
    const runs = dedupeRuns([a, b]);
    expect(runs.filter((r) => r.leg === 0)).toHaveLength(1);
    const bRuns = runs.filter((r) => r.leg === 1);
    expect(bRuns).toHaveLength(1);
    // B's run covers its own approach from z = 20 and merges into A with an overlap (join fade).
    expect(bRuns[0].from).toBe(0);
    expect(bRuns[0].joinEnd).toBe(true);
    expect(b[bRuns[0].to].p[2]).toBeLessThan(1.5);
  });

  it("drops a leg that is the reverse of one already drawn", () => {
    const a = sampleRoute(line(0, 50, 0));
    const back = sampleRoute(line(50, 0, 0));
    expect(dedupeRuns([a, back]).filter((r) => r.leg === 1)).toHaveLength(0);
  });

  it("keeps crossing legs (not parallel) whole", () => {
    const a = sampleRoute(line(0, 50, 0));
    const cross = sampleRoute([
      [25, 0, -20],
      [25, 0, 20],
    ]);
    const runs = dedupeRuns([a, cross]).filter((r) => r.leg === 1);
    expect(runs).toHaveLength(1);
    expect(runs[0].from).toBe(0);
    expect(runs[0].to).toBe(cross.length - 1);
  });

  it("dedupes the real network: the reverse transfer is fully covered", () => {
    const ids = ["out-xfer-edu-west-bio-event", "out-xfer-bio-event-edu-west"];
    const legs = ids.map((id) => sampleRoute(routes.legs[id].points));
    expect(dedupeRuns(legs).filter((r) => r.leg === 1)).toHaveLength(0);
  });
});

describe("outdoor span", () => {
  it("trims a leg's start and end inside a building, keeps a pass under nothing", () => {
    const s = sampleRoute(
      [
        [0, 0, 0],
        [20, 0, 0],
      ],
      1,
    );
    const inside = (x: number) => x < 3 || x > 17;
    const [a, b] = outdoorSpan(s, inside);
    expect(s[a].p[0]).toBeGreaterThanOrEqual(3);
    expect(s[a - 1].p[0]).toBeLessThan(3);
    expect(s[b].p[0]).toBeLessThanOrEqual(17);
    expect(s[b + 1].p[0]).toBeGreaterThan(17);
    // Nothing inside: the whole leg.
    expect(outdoorSpan(s, () => false)).toEqual([0, s.length - 1]);
  });
});

describe("ribbon heights and fades", () => {
  it("rides stair nosings instead of a saw-tooth and leaves flat ground alone", () => {
    const flat = Array.from({ length: 20 }, () => 1.5);
    expect(envelopeHeights(flat)).toEqual(flat);
    // Steps: 0.3 m goings sampled every 0.1 m, 0.17 m risers.
    const steps = Array.from({ length: 60 }, (_, i) => Math.floor(i / 3) * 0.17);
    const env = envelopeHeights(steps, 0.1);
    for (let i = 0; i < steps.length; i++) expect(env[i]).toBeGreaterThanOrEqual(steps[i] - 1e-9);
    // Monotonic and with no tread-sized plateaus in the middle.
    for (let i = 1; i < env.length; i++) expect(env[i]).toBeGreaterThanOrEqual(env[i - 1] - 1e-9);
  });

  it("fades in and out at true ends and over the overlap at joins", () => {
    const u = Array.from({ length: 21 }, (_, i) => i * 0.2);
    const f = runFades(u, false, true, 0.6, 1.1);
    expect(f[0]).toBe(0);
    expect(f[10]).toBe(1);
    expect(f[20]).toBe(0);
    expect(f[19]).toBeLessThan(f[16]);
  });

  it("builds centre-line ribbon geometry with two vertices per sample", () => {
    const s = sampleRoute(
      [
        [0, 0, 0],
        [4, 0, 0],
      ],
      0.5,
    );
    const g = ribbonGeometry([{ samples: s, fades: s.map(() => 1) }]);
    expect(g.getAttribute("position").count).toBe(s.length * 2);
    expect(g.getIndex()?.count).toBe((s.length - 1) * 6);
    // Both vertices of a sample sit on the centre line; the shader pushes them apart.
    const pos = g.getAttribute("position");
    expect(pos.getX(0)).toBe(pos.getX(1));
    const lat = g.getAttribute("aLat");
    // Heading east: left of travel is north (−z).
    expect(lat.getX(0)).toBeCloseTo(0, 6);
    expect(lat.getY(0)).toBeCloseTo(-1, 6);
  });
});

describe("surface probe", () => {
  it("finds the surface nearest the hint and ignores roofs and car parks", () => {
    const wanted = cellsAround([[0.5, 0.5]], 1);
    const idx = new SurfaceIndex();
    const quad = (y: number) => {
      idx.add(-1, y, -1, 2, y, -1, -1, y, 2, wanted);
      idx.add(2, y, -1, 2, y, 2, -1, y, 2, wanted);
    };
    quad(0.12); // pavement
    quad(3.4); // canopy above
    quad(-2.5); // car park below
    expect(idx.heightAt(0.5, 0.5, 0)).toBeCloseTo(0.12, 6);
    expect(idx.heightAt(0.5, 0.5, 3.3)).toBeCloseTo(3.4, 6);
    expect(idx.heightAt(0.5, 0.5, -2.2)).toBeCloseTo(-2.5, 6);
    expect(idx.heightAt(0.5, 0.5, 1.6)).toBeNull();
    expect(idx.heightAt(50, 50, 0)).toBeNull();
  });

  it("returns the top of layered surfaces (paving laid over the ground) but not a bench above", () => {
    const wanted = cellsAround([[0.5, 0.5]], 1);
    const idx = new SurfaceIndex();
    const quad = (y: number) => {
      idx.add(-1, y, -1, 2, y, -1, -1, y, 2, wanted);
      idx.add(2, y, -1, 2, y, 2, -1, y, 2, wanted);
    };
    quad(0.008); // ground under the paving
    quad(0.015); // the recess paving
    quad(0.45); // a bench seat
    expect(idx.heightAt(0.5, 0.5, 0.01)).toBeCloseTo(0.015, 6);
  });

  it("indexes the walkable faces of scene meshes (world transforms, no walls, nothing of ours)", async () => {
    const scene = new THREE.Scene();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial());
    ground.position.set(0, 0.4, 0);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), new THREE.MeshStandardMaterial());
    const ours = new THREE.Mesh(new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial());
    ours.position.y = 0.45;
    ours.userData.twinProbeIgnore = true;
    scene.add(ground, wall, ours);
    scene.updateMatrixWorld(true);
    const idx = await buildSurfaceIndex(scene, cellsAround([[0, 0]], 2));
    expect(idx).not.toBeNull();
    expect(idx?.heightAt(0.3, -0.2, 0)).toBeCloseTo(0.4, 6);
    // The wall is vertical: never a walking surface.
    expect(idx?.triangleCount).toBe(2);
  });
});
