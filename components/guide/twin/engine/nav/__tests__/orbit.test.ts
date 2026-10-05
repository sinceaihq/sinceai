import fs from "node:fs";
import path from "node:path";
import type * as THREE from "three";
import { buildingVolumes, type CampusData, type Lod2Data } from "../../data/campus";
import { FALLBACK_TARGETS, FALLBACK_VIEWS } from "../../fallbacks";
import type { CameraView, V3 } from "../../types";
import {
  CAMPUS_BOUNDS,
  clampTarget,
  createOrbit,
  flightPoint,
  insideSolid,
  ORBIT_LIMITS,
  planFlight,
  pushOutOfSolids,
  type FlightShape,
  type OrbitSolid,
  zoomAnchor,
} from "../orbit";

// three and its addons are ESM-only (Jest runs CommonJS): stand-ins for the parts orbit.ts touches.
jest.mock("three", () => ({
  MOUSE: { ROTATE: 0, DOLLY: 1, PAN: 2 },
  TOUCH: { ROTATE: 0, PAN: 1, DOLLY_PAN: 2, DOLLY_ROTATE: 3 },
}));

jest.mock("three/addons/controls/OrbitControls.js", () => {
  class V {
    x = 0;
    y = 0;
    z = 0;
    set(x: number, y: number, z: number) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
  }
  class OrbitControls {
    object: unknown;
    domElement: unknown;
    target = new V();
    enabled = true;
    enableDamping = false;
    dampingFactor = 0.05;
    screenSpacePanning = true;
    zoomToCursor = false;
    rotateSpeed = 1;
    panSpeed = 1;
    zoomSpeed = 1;
    keyPanSpeed = 7;
    minDistance = 0;
    maxDistance = Infinity;
    minPolarAngle = 0;
    maxPolarAngle = Math.PI;
    mouseButtons = {};
    touches = {};
    keyElement: unknown = null;
    disposed = false;
    private listeners = new Map<string, Set<() => void>>();
    constructor(object: unknown, domElement: unknown) {
      this.object = object;
      this.domElement = domElement;
    }
    listenToKeyEvents(el: unknown) {
      this.keyElement = el;
    }
    stopListenToKeyEvents() {
      this.keyElement = null;
    }
    addEventListener(type: string, fn: () => void) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type)!.add(fn);
    }
    removeEventListener(type: string, fn: () => void) {
      this.listeners.get(type)?.delete(fn);
    }
    dispatchEvent(e: { type: string }) {
      this.listeners.get(e.type)?.forEach((fn) => fn());
    }
    /** enableDamping at every update() call (setPose flushes inertia with damping off). */
    updates: boolean[] = [];
    update() {
      this.updates.push(this.enableDamping);
      return false;
    }
    dispose() {
      this.disposed = true;
    }
  }
  return { OrbitControls };
});

interface FakeControls {
  target: { x: number; y: number; z: number; set(x: number, y: number, z: number): unknown };
  enabled: boolean;
  enableDamping: boolean;
  dampingFactor: number;
  screenSpacePanning: boolean;
  zoomToCursor: boolean;
  minDistance: number;
  maxDistance: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  mouseButtons: Record<string, number>;
  keyElement: unknown;
  disposed: boolean;
  updates: boolean[];
  dispatchEvent(e: { type: string }): void;
}

function fakeCamera() {
  return {
    position: {
      x: 0,
      y: 0,
      z: 0,
      set(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
      },
    },
    lookAt: jest.fn(),
  };
}

const dist = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

function setup(opts: Parameters<typeof createOrbit>[2] = {}) {
  const camera = fakeCamera();
  const dom = document.createElement("div");
  const orbit = createOrbit(camera as unknown as THREE.PerspectiveCamera, dom, opts);
  const controls = orbit.controls as unknown as FakeControls;
  return { camera, dom, orbit, controls };
}

describe("createOrbit", () => {
  it("sets OrbitControls up like a map", () => {
    const { controls, dom } = setup();
    expect(controls.enableDamping).toBe(true);
    expect(controls.screenSpacePanning).toBe(false);
    expect(controls.zoomToCursor).toBe(true);
    expect(controls.mouseButtons).toEqual({ LEFT: 0, MIDDLE: 1, RIGHT: 2 });
    expect(controls.keyElement).toBe(dom);
    expect(controls.minDistance).toBe(ORBIT_LIMITS.campus.minDistance);
    expect(controls.maxDistance).toBe(ORBIT_LIMITS.campus.maxDistance);
  });

  it("applies distance and tilt limits per place", () => {
    const { orbit, controls } = setup({ limits: { joki: { minDistance: 2 } } });
    orbit.setPlace("joki");
    expect(controls.minDistance).toBe(2);
    expect(controls.maxDistance).toBe(ORBIT_LIMITS.joki.maxDistance);
    expect(controls.maxPolarAngle).toBeCloseTo((ORBIT_LIMITS.joki.maxPolarDeg * Math.PI) / 180, 9);
    orbit.setPlace("campus");
    expect(controls.minDistance).toBe(ORBIT_LIMITS.campus.minDistance);
  });

  it("damps at the same speed whatever the frame rate", () => {
    const { orbit, controls } = setup();
    orbit.update(1 / 60);
    const at60 = controls.dampingFactor;
    orbit.update(1 / 30);
    const at30 = controls.dampingFactor;
    // Two 60 fps frames leave as much motion as one 30 fps frame.
    expect((1 - at60) ** 2).toBeCloseTo(1 - at30, 9);
  });

  it("keeps the target on the campus and moves the camera with it", () => {
    const { orbit, camera, controls } = setup();
    controls.target.set(1000, 0, 0);
    camera.position.set(1000, 50, 80);
    orbit.update(1 / 60);
    expect(controls.target.x).toBe(CAMPUS_BOUNDS.maxX);
    expect(camera.position.x).toBe(CAMPUS_BOUNDS.maxX);
    expect(camera.position.z).toBe(80);
    expect(camera.lookAt).toHaveBeenLastCalledWith(CAMPUS_BOUNDS.maxX, 0, 0);
  });

  it("never lets the camera within 1.5 m of the ground", () => {
    const groundAt = (x: number) => x * 0.05;
    const { orbit, camera, controls } = setup({ groundAt });
    controls.target.set(100, 5, 0);
    camera.position.set(140, 3, 0);
    orbit.update(1 / 60);
    expect(camera.position.y).toBeCloseTo(140 * 0.05 + 1.5, 9);
    // The target is never left under the ground either.
    controls.target.set(200, -20, 0);
    camera.position.set(200, 60, 60);
    orbit.update(1 / 60);
    expect(controls.target.y).toBeCloseTo(200 * 0.05 - 0.5, 9);
  });

  it("keeps the camera out of closed buildings", () => {
    const tower: OrbitSolid = {
      polygon: [
        [0, 0],
        [20, 0],
        [20, 20],
        [0, 20],
      ],
      top: 30,
    };
    const { orbit, camera, controls } = setup();
    orbit.setSolids([tower]);
    controls.target.set(-30, 0, 10);
    camera.position.set(1, 10, 10);
    orbit.update(1 / 60);
    // Out through the nearest wall (x = 0) with a little room.
    expect(camera.position.x).toBeCloseTo(-0.6, 9);
    // Near the roof it goes over the top instead.
    camera.position.set(10, 29.5, 10);
    orbit.update(1 / 60);
    expect(camera.position.y).toBe(31);
    expect(camera.position.x).toBe(10);
  });

  it("flies to a point keeping the view direction, instantly with reduced motion", () => {
    const { orbit, camera, controls } = setup();
    controls.target.set(0, 0, 0);
    camera.position.set(0, 60, 80);
    orbit.flyTo([100, 0, 50], { distance: 50 });
    orbit.update(0.3);
    expect(controls.target.x).toBeGreaterThan(0);
    expect(controls.target.x).toBeLessThan(100);
    for (let i = 0; i < 120; i++) orbit.update(1 / 60);
    expect(controls.target).toMatchObject({ x: 100, y: 0, z: 50 });
    expect(dist(camera.position, controls.target)).toBeCloseTo(50, 6);
    // Same direction as before: (0, 60, 80) / 100.
    expect((camera.position.y - controls.target.y) / 50).toBeCloseTo(0.6, 6);

    const calm = setup({ reducedMotion: true });
    calm.controls.target.set(0, 0, 0);
    calm.camera.position.set(0, 60, 80);
    calm.orbit.flyTo([10, 0, 10]);
    expect(calm.controls.target).toMatchObject({ x: 10, y: 0, z: 10 });
  });

  it("follows a live change of reduced motion: a glide in progress lands, the next ones are instant", () => {
    const { orbit, camera, controls } = setup();
    controls.target.set(0, 0, 0);
    camera.position.set(0, 60, 80);
    orbit.flyTo([100, 0, 50], { distance: 50 });
    orbit.update(0.2);
    expect(controls.target.x).toBeLessThan(100);
    orbit.setReducedMotion?.(true);
    expect(controls.target).toMatchObject({ x: 100, y: 0, z: 50 });
    expect(dist(camera.position, controls.target)).toBeCloseTo(50, 6);
    orbit.flyTo([0, 0, 0]);
    expect(controls.target).toMatchObject({ x: 0, y: 0, z: 0 });
    orbit.zoom(2);
    expect(dist(camera.position, controls.target)).toBeCloseTo(25, 6);
    // And eased again when the preference goes back.
    orbit.setReducedMotion?.(false);
    orbit.flyTo([100, 0, 50]);
    expect(controls.target.x).toBe(0);
  });

  it("cancels a flight when the user grabs the view", () => {
    const { orbit, camera, controls } = setup();
    controls.target.set(0, 0, 0);
    camera.position.set(0, 60, 80);
    orbit.flyTo([100, 0, 50]);
    orbit.update(0.2);
    const x = controls.target.x;
    controls.dispatchEvent({ type: "start" });
    orbit.update(0.5);
    expect(controls.target.x).toBe(x);
  });

  it("zooms by a factor, eased and within the limits", () => {
    const { orbit, camera, controls } = setup();
    controls.target.set(0, 0, 0);
    camera.position.set(0, 60, 80);
    orbit.zoom(2);
    orbit.update(1 / 60);
    expect(dist(camera.position, controls.target)).toBeGreaterThan(50);
    for (let i = 0; i < 90; i++) orbit.update(1 / 60);
    expect(dist(camera.position, controls.target)).toBeCloseTo(50, 0);
    orbit.zoom(1000);
    for (let i = 0; i < 120; i++) orbit.update(1 / 60);
    expect(dist(camera.position, controls.target)).toBeCloseTo(ORBIT_LIMITS.campus.minDistance, 1);
  });

  it("drops the drag inertia when code places the camera (a flight's landing, a reduced-motion jump)", () => {
    const { orbit, controls } = setup();
    controls.updates = [];
    orbit.setPose([0, 30, 40], [0, 0, 0]);
    // First an update with damping off (applies and clears the leftover deltas), then the pose.
    expect(controls.updates[0]).toBe(false);
    expect(controls.enableDamping).toBe(true);
  });

  it("stops a zoom towards a target inside a closed building instead of animating forever", () => {
    const hall: OrbitSolid = {
      polygon: [
        [0, 0],
        [40, 0],
        [40, 30],
        [0, 30],
      ],
      top: 18,
      bottom: -1,
    };
    const { orbit, camera, controls } = setup();
    orbit.setSolids([hall]);
    controls.target.set(20, 6, 15);
    camera.position.set(-40, 20, 15);
    for (let i = 0; i < 8; i++) orbit.zoom(1.25);
    let lastBusy = -1;
    for (let i = 0; i < 600; i++) if (orbit.update(1 / 60)) lastBusy = i;
    // It settles within a second or two (the old dolly ran on all 600 frames).
    expect(lastBusy).toBeLessThan(120);
    expect(insideSolid(hall, camera.position.x, camera.position.y, camera.position.z)).toBe(false);
  });

  it("widens the limits for a pose that needs it", () => {
    const { orbit, camera, controls } = setup();
    orbit.setPose([0, 3, 4], [0, 0, 0]);
    expect(dist(camera.position, controls.target)).toBeCloseTo(5, 9);
    expect(controls.minDistance).toBeLessThanOrEqual(5);
    orbit.setPlace("campus");
    expect(controls.minDistance).toBe(ORBIT_LIMITS.campus.minDistance);
  });

  it("switches off and cleans up", () => {
    const { orbit, controls } = setup();
    orbit.setEnabled(false);
    expect(controls.enabled).toBe(false);
    orbit.dispose();
    expect(controls.disposed).toBe(true);
    expect(controls.keyElement).toBeNull();
  });
});

describe("pure helpers", () => {
  it("clampTarget preserves the camera offset", () => {
    const target = { x: -100, y: 2, z: 500 };
    const cam = { x: -80, y: 40, z: 530 };
    expect(clampTarget(target, cam, CAMPUS_BOUNDS)).toBe(true);
    expect(cam.x - target.x).toBe(20);
    expect(cam.z - target.z).toBe(30);
    expect(clampTarget(target, cam, CAMPUS_BOUNDS)).toBe(false);
  });

  it("pushOutOfSolids ignores cameras above, below or outside", () => {
    const box: OrbitSolid = {
      polygon: [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
      top: 12,
      bottom: 0,
    };
    expect(pushOutOfSolids({ x: 5, y: 13, z: 5 }, [box])).toBe(false);
    expect(pushOutOfSolids({ x: 5, y: -1, z: 5 }, [box])).toBe(false);
    expect(pushOutOfSolids({ x: 15, y: 5, z: 5 }, [box])).toBe(false);
    const cam = { x: 9.5, y: 5, z: 5 };
    expect(pushOutOfSolids(cam, [box])).toBe(true);
    expect(cam.x).toBeCloseTo(10.6, 9);
  });
});

describe("pushOutOfSolids between touching buildings", () => {
  const box = (x0: number, x1: number, top: number): OrbitSolid => ({
    polygon: [
      [x0, 0],
      [x1, 0],
      [x1, 10],
      [x0, 10],
    ],
    top,
    bottom: -1,
  });

  it("goes over the roofs when the nearest wall leads into the neighbour (no ping-pong)", () => {
    const a = box(0, 10, 20);
    const b = box(10, 20, 12);
    const cam = { x: 9.8, y: 5, z: 5 };
    expect(pushOutOfSolids(cam, [a, b])).toBe(true);
    expect([a, b].some((s) => insideSolid(s, cam.x, cam.y, cam.z))).toBe(false);
    expect(cam.y).toBe(21);
    // Settled: the next frame changes nothing.
    expect(pushOutOfSolids(cam, [a, b])).toBe(false);
  });

  it("clears every camera position inside the real campus buildings in one call", () => {
    let inside = 0;
    for (let x = -70; x <= 130; x += 2) {
      for (let z = -70; z <= 90; z += 2) {
        for (const y of [4, 10, 18]) {
          if (!volumes.some((s) => insideSolid(s, x, y, z))) continue;
          inside++;
          const cam = { x, y, z };
          pushOutOfSolids(cam, volumes);
          expect(volumes.some((s) => insideSolid(s, cam.x, cam.y, cam.z))).toBe(false);
          expect(pushOutOfSolids(cam, volumes)).toBe(false);
        }
      }
    }
    expect(inside).toBeGreaterThan(1000);
  });

  it("keeps Joki's solid to its parts: 9 m up over the low hall is free air, the tower is not", () => {
    const joki = volumes.filter((v) => v.role === "joki");
    expect(joki.length).toBeGreaterThanOrEqual(2);
    expect(Math.min(...joki.map((v) => v.top))).toBeLessThan(4);
    expect(Math.max(...joki.map((v) => v.top))).toBeGreaterThan(11);
    // The showroom view's orbit height (≈ 9–10 m) over the hall roof (3.2 m) is outside every solid.
    const hall = joki.reduce((lo, v) => (v.top < lo.top ? v : lo));
    const [hx, hz] = hall.polygon.reduce(([sx, sz], [x, z]) => [sx + x / hall.polygon.length, sz + z / hall.polygon.length], [0, 0]);
    if (insideSolid(hall, hx, 2, hz)) expect(volumes.some((s) => insideSolid(s, hx, 9.5, hz))).toBe(false);
  });
});

const ASSETS = path.join(process.cwd(), "public/assets/guide/3d");
const campus = JSON.parse(fs.readFileSync(path.join(ASSETS, "data/campus.json"), "utf8")) as CampusData;
const lod2 = JSON.parse(fs.readFileSync(path.join(ASSETS, "data/lod2.json"), "utf8")) as Lod2Data;
const volumes: (OrbitSolid & { role?: string })[] = buildingVolumes(campus, lod2);

/** Samples of a flight (eased like the engine's) that are inside a solid, endpoint buildings excluded. */
function framesInside(from: V3, to: V3, shape: FlightShape, solids: readonly OrbitSolid[]): number {
  const relevant = solids.filter((s) => !insideSolid(s, ...from) && !insideSolid(s, ...to));
  let frames = 0;
  for (let i = 1; i < 200; i++) {
    const t = i / 200;
    const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const p = flightPoint(from, to, shape, k);
    if (relevant.some((s) => insideSolid(s, p[0], p[1], p[2]))) frames++;
  }
  return frames;
}

describe("planFlight", () => {
  const tower: OrbitSolid = {
    polygon: [
      [40, -10],
      [60, -10],
      [60, 10],
      [40, 10],
    ],
    top: 50,
    bottom: -1,
  };

  it("keeps the usual arc when nothing is in the way", () => {
    expect(planFlight([0, 10, 0], [100, 10, 0], [], { lift: 12 })).toEqual({ lift: 12, crane: 0 });
  });

  it("lifts the flight over a tall building in the way", () => {
    const plain = { lift: 12, crane: 0 };
    expect(framesInside([0, 10, 0], [100, 10, 0], plain, [tower])).toBeGreaterThan(0);
    const shape = planFlight([0, 10, 0], [100, 10, 0], [tower], { lift: 12 });
    expect(shape).not.toBeNull();
    expect(framesInside([0, 10, 0], [100, 10, 0], shape!, [tower])).toBe(0);
  });

  it("cranes up and over when the tall wall stands right next to the start", () => {
    const wall: OrbitSolid = {
      polygon: [
        [2, -50],
        [30, -50],
        [30, 50],
        [2, 50],
      ],
      top: 40,
      bottom: -1,
    };
    const shape = planFlight([0, 2, 0], [60, 2, 0], [wall], { lift: 7 });
    expect(shape?.crane).toBeGreaterThan(0);
    expect(framesInside([0, 2, 0], [60, 2, 0], shape!, [wall])).toBe(0);
  });

  it("cuts (null) when nothing within the lift limit clears", () => {
    expect(planFlight([0, 10, 0], [100, 10, 0], [tower], { lift: 12, maxLift: 20 })).toBeNull();
  });

  it("never flies through a closed campus building between the engine's views and targets", () => {
    const items: { key: string; view: CameraView }[] = [
      ...Object.entries(FALLBACK_VIEWS).map(([key, view]) => ({ key, view })),
      ...Object.entries(FALLBACK_TARGETS).map(([key, view]) => ({ key, view })),
    ];
    let plainThrough = 0;
    const through: string[] = [];
    for (const a of items) {
      for (const b of items) {
        if (a === b) continue;
        const open = b.view.open?.building;
        const solids = volumes.filter((v) => !(open && v.role === open));
        const travel =
          Math.hypot(b.view.position[0] - a.view.position[0], b.view.position[1] - a.view.position[1], b.view.position[2] - a.view.position[2]) +
          Math.hypot(b.view.target[0] - a.view.target[0], b.view.target[1] - a.view.target[1], b.view.target[2] - a.view.target[2]);
        const lift = Math.min(80, travel * 0.12);
        if (framesInside(a.view.position, b.view.position, { lift, crane: 0 }, solids)) plainThrough++;
        const shape = planFlight(a.view.position, b.view.position, solids, { lift });
        if (shape && framesInside(a.view.position, b.view.position, shape, solids)) through.push(`${a.key} → ${b.key}`);
      }
    }
    // The plain arcs (the engine before) crossed buildings on hundreds of these flights.
    expect(plainThrough).toBeGreaterThan(100);
    expect(through).toEqual([]);
  });
});

describe("zoomAnchor", () => {
  const ground = (x: number) => 0.2 + x * 0.01;
  it("zooms onto a roof or the ground where the pointer is", () => {
    expect(zoomAnchor([10, 19.9, -5], [0, 1, 0], ground)).toEqual([10, 19.9, -5]);
    expect(zoomAnchor([10, 0.3, -5], null, ground)).toEqual([10, 0.3, -5]);
  });
  it("turns a pointer on a facade into the ground 3 m in front of it", () => {
    // BioCity's NW facade at the recess, facing NW (−x, −z).
    const n: V3 = [-Math.SQRT1_2, 0.05, -Math.SQRT1_2];
    const a = zoomAnchor([-20, 19.9, -12], n, ground);
    expect(Math.hypot(a[0] + 20, a[2] + 12)).toBeCloseTo(3, 6);
    expect(a[0]).toBeLessThan(-20);
    expect(a[1]).toBeCloseTo(ground(a[0]), 9);
  });
});
