import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import type * as THREE from "three";
import { createTerrain, decodePng, type RoutesData, type StreetsData, type Terrain, type TerrainMeta } from "../../data/campus";
import type { Collider2D, Connector, LevelId, V2, V3, WalkArea } from "../../types";
import type { HeightAt } from "../collision";
import {
  createWalkController,
  prepareWalkWorld,
  simulateWalk,
  startSim,
  stepWalk,
  structureWalkAreas,
  WALK,
  type WalkController,
  type WalkWorld,
} from "../walk";

const rect = (x0: number, z0: number, x1: number, z1: number): V2[] => [
  [x0, z0],
  [x1, z0],
  [x1, z1],
  [x0, z1],
];
const seg = (level: LevelId, a: V2, b: V2): Collider2D => ({ level, kind: "segment", a, b });

/**
 * A small campus: a street (outdoor, y 0) with a building whose lobby
 * (biocity-1, y 0.06) is entered through a 1.2 m door in its south wall at
 * x = 0. Inside, a stair connector goes down to a hall (joki-1, y −1.7).
 */
function campus(): WalkWorld {
  const walls: Collider2D[] = [];
  // Building outline x −10…10, z −20…0, door gap x −0.6…0.6 on z = 0 — on both levels' collider sets.
  for (const level of ["outdoor", "biocity-1"] as LevelId[]) {
    walls.push(
      seg(level, [-10, 0], [-0.6, 0]),
      seg(level, [0.6, 0], [10, 0]),
      seg(level, [-10, -20], [10, -20]),
      seg(level, [-10, -20], [-10, 0]),
      seg(level, [10, -20], [10, 0]),
    );
  }
  walls.push({ level: "biocity-1", kind: "circle", c: [5, -10], r: 0.4 });
  const areas: WalkArea[] = [
    { level: "outdoor", polygon: rect(-40, -40, 40, 30), y: 0 },
    { level: "biocity-1", polygon: rect(-10, -20, 10, 0), y: 0.06 },
    { level: "joki-1", polygon: rect(30, -20, 60, 0), y: -1.7 },
    // A hall upstairs at a different height directly next to the street: must never be stepped onto.
    { level: "joki-2", polygon: rect(40, 0, 60, 20), y: 2.9 },
  ];
  const connectors: Connector[] = [
    { id: "stair-down", label: "Go down", from: "biocity-1", to: "joki-1", at: [-8, -18], arrive: [32, -2] },
    { id: "stair-up", label: "Go up", from: "joki-1", to: "biocity-1", at: [32, -2], arrive: [-8, -18] },
  ];
  return { colliders: walls, walkAreas: areas, connectors };
}

const NORTH = 0;
const EAST = 90;

describe("simulateWalk (pure)", () => {
  it("walks at 1.4 m/s with a smooth start", () => {
    let firstStep = Infinity;
    let prevZ = 10;
    const end = simulateWalk(
      { position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 },
      campus(),
      [{ input: { forward: 1 }, seconds: 5 }],
      {
        onStep: (sim) => {
          firstStep = Math.min(firstStep, prevZ - sim.position[1]);
          prevZ = sim.position[1];
        },
      },
    );
    expect(Math.hypot(end.velocity[0], end.velocity[1])).toBeCloseTo(1.4, 3);
    // 5 s at 1.4 m/s, less the ≈0.12 s ramp-up.
    expect(10 - end.position[1]).toBeCloseTo(1.4 * (5 - WALK.accel), 1);
    // The first frame does not jump to full speed.
    expect(firstStep).toBeLessThan((1.4 / 60) * 0.3);
  });

  it("runs at 3.0 m/s with Shift and normalises diagonals", () => {
    const run = simulateWalk({ position: [-20, 25], level: "outdoor", yawDeg: EAST, pitchDeg: 0 }, campus(), [
      { input: { forward: 1, run: true }, seconds: 3 },
    ]);
    expect(Math.hypot(run.velocity[0], run.velocity[1])).toBeCloseTo(3.0, 3);
    const diagonal = simulateWalk({ position: [-20, 25], level: "outdoor", yawDeg: EAST, pitchDeg: 0 }, campus(), [
      { input: { forward: 1, strafe: 1 }, seconds: 3 },
    ]);
    expect(Math.hypot(diagonal.velocity[0], diagonal.velocity[1])).toBeCloseTo(1.4, 3);
  });

  it("stops at walls and slides along them", () => {
    // Walk north into the building's south wall well away from the door.
    const head = simulateWalk({ position: [5, 3], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 }, campus(), [
      { input: { forward: 1 }, seconds: 5 },
    ]);
    expect(head.position[1]).toBeGreaterThanOrEqual(0.3 - 1e-6);
    expect(head.position[1]).toBeLessThan(0.32);
    expect(head.level).toBe("outdoor");
    // At 45° to the wall the walker keeps moving along it.
    const slide = simulateWalk({ position: [5, 3], level: "outdoor", yawDeg: 45, pitchDeg: 0 }, campus(), [
      { input: { forward: 1 }, seconds: 4 },
    ]);
    expect(slide.position[0]).toBeGreaterThan(8);
    expect(slide.position[1]).toBeGreaterThanOrEqual(0.3 - 1e-6);
  });

  it("enters a building through its door and changes level", () => {
    const end = simulateWalk({ position: [0, 6], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 }, campus(), [
      { input: { forward: 1 }, seconds: 10 },
    ]);
    expect(end.level).toBe("biocity-1");
    expect(end.levels).toEqual(["outdoor", "biocity-1"]);
    expect(end.position[1]).toBeLessThan(-5);
    expect(end.floor).toBeCloseTo(0.06, 9);
    // And back out again.
    const out = simulateWalk({ position: [0, -5], level: "biocity-1", yawDeg: 180, pitchDeg: 0 }, campus(), [
      { input: { forward: 1 }, seconds: 8 },
    ]);
    expect(out.levels).toEqual(["biocity-1", "outdoor"]);
  });

  it("keeps the street out of a building whose walls only its own level has", () => {
    // The street level has no collider for the building: its outer walls exist on biocity-1 only.
    const world = campus();
    world.colliders = world.colliders.filter((c) => c.level !== "outdoor");
    const zs: number[] = [];
    const wall = simulateWalk({ position: [5, 4], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 }, world, [
      { input: { forward: 1 }, seconds: 8 },
    ], { onStep: (sim) => zs.push(sim.position[1]) });
    expect(wall.level).toBe("outdoor");
    expect(wall.position[1]).toBeGreaterThanOrEqual(0.3 - 1e-6);
    // Pressing on into the facade: perfectly still, no creeping in and popping back.
    const late = zs.slice(-120);
    expect(Math.max(...late) - Math.min(...late)).toBeLessThan(1e-6);
    // At 45° it slides along the outside of the wall instead of slipping in.
    const glance = simulateWalk({ position: [3, 3], level: "outdoor", yawDeg: 45, pitchDeg: 0 }, world, [
      { input: { forward: 1 }, seconds: 6 },
    ]);
    expect(glance.level).toBe("outdoor");
    expect(glance.position[0]).toBeGreaterThan(8);
    // The door still lets you in.
    const door = simulateWalk({ position: [0, 6], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 }, world, [
      { input: { forward: 1 }, seconds: 10 },
    ]);
    expect(door.level).toBe("biocity-1");
    expect(door.position[1]).toBeLessThan(-5);
  });

  it("cannot leave the walkable area and slides along its edge", () => {
    // The street ends at x = 40; walk east-north-east into that edge.
    const end = simulateWalk({ position: [35, 20], level: "outdoor", yawDeg: 70, pitchDeg: 0 }, campus(), [
      { input: { forward: 1 }, seconds: 10 },
    ]);
    expect(end.position[0]).toBeLessThanOrEqual(40);
    expect(end.position[0]).toBeGreaterThan(39.5);
    // Tangential progress along the edge (north = −z).
    expect(end.position[1]).toBeLessThan(18);
    expect(end.level).toBe("outdoor");
  });

  it("never steps onto a floor at a different height", () => {
    // joki-2 (y 2.9) adjoins the street at x 40…60, z 0…20 — but the street ends at x = 40 anyway;
    // put the walker on a street that overlaps it to be sure only height decides.
    const world = campus();
    world.walkAreas.push({ level: "outdoor", polygon: rect(40, -40, 70, 30), y: 0 });
    const end = simulateWalk({ position: [38, 10], level: "outdoor", yawDeg: EAST, pitchDeg: 0 }, world, [
      { input: { forward: 1 }, seconds: 8 },
    ]);
    expect(end.level).toBe("outdoor");
    expect(end.levels).toEqual(["outdoor"]);
    expect(end.position[0]).toBeGreaterThan(45);
  });

  it("follows ramps and keeps the eye 1.65 m above the floor", () => {
    const world = campus();
    world.walkAreas.push({
      level: "outdoor",
      polygon: rect(-40, 30, 40, 50),
      y: 0,
      slope: { from: [0, 30], to: [0, 50], y0: 0, y1: 2 },
    });
    const end = simulateWalk({ position: [0, 25], level: "outdoor", yawDeg: 180, pitchDeg: 0 }, world, [
      { input: { forward: 1 }, seconds: 12 },
      { input: {}, seconds: 2 },
    ]);
    const expectedFloor = ((end.position[1] - 30) / 20) * 2;
    expect(end.floor).toBeCloseTo(expectedFloor, 6);
    expect(end.eye).toBeCloseTo(expectedFloor + 1.65, 3);
  });

  it("bobs the head while walking, not with reduced motion", () => {
    const eyes: number[] = [];
    simulateWalk({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 }, campus(), [
      { input: { forward: 1 }, seconds: 4 },
    ], { onStep: (sim) => eyes.push(sim.eye - sim.bobAmp * 0.5 * (1 - Math.cos(sim.bobPhase))) });
    const late = eyes.slice(120);
    expect(Math.max(...late) - Math.min(...late)).toBeGreaterThan(0.015);
    expect(Math.max(...late) - Math.min(...late)).toBeLessThan(0.03);

    const calm: number[] = [];
    simulateWalk({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 }, campus(), [
      { input: { forward: 1 }, seconds: 4 },
    ], { reducedMotion: true, onStep: (sim) => calm.push(sim.eye - sim.bobAmp * 0.5 * (1 - Math.cos(sim.bobPhase))) });
    expect(new Set(calm.slice(60).map((y) => y.toFixed(9))).size).toBe(1);
  });

  it("turns with the keyboard at 90°/s", () => {
    const end = simulateWalk({ position: [-20, 10], level: "outdoor", yawDeg: 0, pitchDeg: 0 }, campus(), [
      { input: { turn: 1 }, seconds: 2 },
      { input: {}, seconds: 0.5 },
    ]);
    // 2 s at 90°/s, less the ease-in, plus a little ease-out.
    expect(end.yawDeg).toBeGreaterThan(170);
    expect(end.yawDeg).toBeLessThan(185);
  });

  it("takes a wheel step of about a stride", () => {
    const end = simulateWalk({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 }, campus(), [
      { input: { glide: WALK.wheelStep }, seconds: 1.5 },
    ]);
    expect(10 - end.position[1]).toBeCloseTo(0.75, 2);
  });

  it("pushes a walker that starts inside a wall clear of it", () => {
    const end = simulateWalk({ position: [5, -0.1], level: "biocity-1", yawDeg: 0, pitchDeg: 0 }, campus(), []);
    expect(end.position[1]).toBeLessThanOrEqual(-0.3 + 1e-6);
  });
});

// ── DOM controller ──────────────────────────────────────────────────────────

function fakeCamera() {
  const camera = {
    fov: 60,
    position: { x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } },
    quaternion: { x: 0, y: 0, z: 0, w: 1, set(x: number, y: number, z: number, w: number) { Object.assign(this, { x, y, z, w }); } },
    updateMatrixWorld: jest.fn(),
  };
  return camera;
}

/** Forward direction of a quaternion (camera looks down −z). */
function forwardOf(q: { x: number; y: number; z: number; w: number }) {
  const { x, y, z, w } = q;
  // Rotate (0, 0, −1).
  return [-(2 * (x * z + w * y)), -(2 * (y * z - w * x)), -(1 - 2 * (x * x + y * y))];
}

function pointer(type: string, init: { id?: number; x: number; y: number; pointerType?: string; button?: number; buttons?: number }) {
  // Like a real drag: the button is held from pointerdown until pointerup.
  const buttons = init.buttons ?? (type === "pointerup" ? 0 : 1);
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: init.x, clientY: init.y, button: init.button ?? 0, buttons });
  Object.defineProperty(e, "pointerId", { value: init.id ?? 1 });
  Object.defineProperty(e, "pointerType", { value: init.pointerType ?? "mouse" });
  return e;
}

function key(type: "keydown" | "keyup", code: string, extra: KeyboardEventInit = {}) {
  return new KeyboardEvent(type, { code, key: code.replace(/^Key/, "").toLowerCase(), bubbles: true, cancelable: true, ...extra });
}

describe("createWalkController (DOM)", () => {
  let host: HTMLDivElement;
  let other: HTMLButtonElement;
  let camera: ReturnType<typeof fakeCamera>;
  let walk: WalkController;
  let levels: LevelId[];
  let connectors: (string | null)[];

  beforeEach(() => {
    host = document.createElement("div");
    host.tabIndex = 0;
    Object.defineProperty(host, "clientHeight", { value: 600 });
    host.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 600, right: 1000, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
    other = document.createElement("button");
    document.body.append(host, other);
    camera = fakeCamera();
    levels = [];
    connectors = [];
    walk = createWalkController(camera as unknown as THREE.PerspectiveCamera, host, {
      reducedMotion: false,
      onLevel: (l) => levels.push(l),
      onConnector: (c) => connectors.push(c?.id ?? null),
    });
    walk.setWorld(campus());
  });

  afterEach(() => {
    walk.dispose();
    host.remove();
    other.remove();
  });

  const tick = (seconds: number) => {
    let moved = false;
    for (let i = 0; i < Math.round(seconds * 60); i++) moved = walk.update(1 / 60) || moved;
    return moved;
  };

  it("places the camera at eye height facing the start bearing", () => {
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: EAST, pitchDeg: 0 });
    expect(camera.position).toMatchObject({ x: -20, y: 1.65, z: 10 });
    const [fx, fy, fz] = forwardOf(camera.quaternion);
    expect(fx).toBeCloseTo(1, 6);
    expect(fy).toBeCloseTo(0, 6);
    expect(fz).toBeCloseTo(0, 6);
    expect(levels).toEqual(["outdoor"]);
  });

  it("walks with W only while the scene has keyboard focus", () => {
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 });
    // Focus elsewhere: the key never reaches the host.
    other.focus();
    other.dispatchEvent(key("keydown", "KeyW"));
    tick(1);
    expect(camera.position.z).toBeCloseTo(10, 6);

    host.focus();
    const down = key("keydown", "KeyW");
    host.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(tick(1)).toBe(true);
    expect(camera.position.z).toBeLessThan(9);
    host.dispatchEvent(key("keyup", "KeyW"));
    tick(1);
    const stopped = camera.position.z;
    expect(tick(1)).toBe(false);
    expect(camera.position.z).toBeCloseTo(stopped, 6);
  });

  it("ignores browser shortcuts and keys typed into controls inside the scene", () => {
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 });
    host.focus();
    const shortcut = key("keydown", "KeyW", { metaKey: true });
    host.dispatchEvent(shortcut);
    expect(shortcut.defaultPrevented).toBe(false);
    const ctrl = key("keydown", "KeyW", { ctrlKey: true });
    host.dispatchEvent(ctrl);
    expect(ctrl.defaultPrevented).toBe(false);

    const slider = document.createElement("input");
    slider.type = "range";
    host.appendChild(slider);
    slider.focus();
    const arrow = key("keydown", "ArrowUp");
    slider.dispatchEvent(arrow);
    expect(arrow.defaultPrevented).toBe(false);
    tick(1);
    expect(camera.position.z).toBeCloseTo(10, 6);
    slider.remove();
  });

  it("lets go of keys when focus leaves the scene", () => {
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 });
    host.focus();
    host.dispatchEvent(key("keydown", "ArrowUp"));
    tick(0.5);
    other.focus();
    tick(1);
    const z = camera.position.z;
    tick(1);
    expect(camera.position.z).toBeCloseTo(z, 6);
  });

  it("turns with ←/→ and runs with Shift", () => {
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 });
    host.focus();
    host.dispatchEvent(key("keydown", "ArrowRight"));
    tick(1);
    host.dispatchEvent(key("keyup", "ArrowRight"));
    tick(0.3);
    expect(walk.state().yawDeg).toBeGreaterThan(80);
    expect(walk.state().yawDeg).toBeLessThan(100);

    host.dispatchEvent(key("keydown", "ShiftLeft", { shiftKey: true }));
    host.dispatchEvent(key("keydown", "KeyW", { shiftKey: true }));
    const x0 = camera.position.x;
    tick(2);
    // ≈ 3 m/s eastwards.
    expect(camera.position.x - x0).toBeGreaterThan(5.4);
  });

  it("drags to look like holding a photo, with pitch limited to ±80°", () => {
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: 90, pitchDeg: 0 });
    host.dispatchEvent(pointer("pointerdown", { x: 500, y: 300 }));
    expect(document.activeElement).toBe(host);
    // Drag right by 100 px: the view turns left by 100 × (60° / 600 px) = 10°.
    host.dispatchEvent(pointer("pointermove", { x: 600, y: 300 }));
    walk.update(1 / 60);
    expect(walk.state().yawDeg).toBeCloseTo(80, 6);
    // Drag far down: look up, but no further than 80°.
    host.dispatchEvent(pointer("pointermove", { x: 600, y: 5000 }));
    walk.update(1 / 60);
    expect(walk.state().pitchDeg).toBe(80);
    host.dispatchEvent(pointer("pointerup", { x: 600, y: 5000 }));
    host.dispatchEvent(pointer("pointermove", { x: 0, y: 0 }));
    walk.update(1 / 60);
    expect(walk.state().yawDeg).toBeCloseTo(80, 6);
  });

  it("ends a mouse drag whose button came up outside the scene (no stuck look)", () => {
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: 90, pitchDeg: 0 });
    host.dispatchEvent(pointer("pointerdown", { x: 500, y: 300 }));
    // The release happened outside (no capture yet): the next move over the scene has no button held.
    host.dispatchEvent(pointer("pointermove", { x: 520, y: 300, buttons: 0 }));
    host.dispatchEvent(pointer("pointermove", { x: 990, y: 300, buttons: 0 }));
    walk.update(1 / 60);
    expect(walk.state().yawDeg).toBeCloseTo(90, 6);
    // A new drag works as usual.
    host.dispatchEvent(pointer("pointerdown", { x: 500, y: 300 }));
    host.dispatchEvent(pointer("pointermove", { x: 600, y: 300 }));
    walk.update(1 / 60);
    expect(walk.state().yawDeg).toBeCloseTo(80, 6);
  });

  it("lets go of held keys when ⌘ goes down (macOS sends no keyup under ⌘)", () => {
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 });
    host.dispatchEvent(key("keydown", "KeyW"));
    tick(0.5);
    const z = camera.position.z;
    expect(z).toBeLessThan(10);
    // ⌘ down, W released while it is held (that keyup never arrives), ⌘ released.
    host.dispatchEvent(key("keydown", "MetaLeft", { metaKey: true }));
    host.dispatchEvent(key("keyup", "MetaLeft"));
    tick(1.5);
    const stopped = camera.position.z;
    tick(1);
    expect(camera.position.z).toBeCloseTo(stopped, 6);
  });

  it("steps forward with the wheel", () => {
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 });
    const wheel = new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true });
    host.dispatchEvent(wheel);
    expect(wheel.defaultPrevented).toBe(true);
    tick(1.5);
    expect(10 - camera.position.z).toBeCloseTo(0.75, 2);
  });

  it("walks with the touch joystick on the left half and looks on the right", () => {
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 });
    // Thumb down on the left, pushed fully up (forward).
    host.dispatchEvent(pointer("pointerdown", { id: 7, pointerType: "touch", x: 150, y: 450 }));
    host.dispatchEvent(pointer("pointermove", { id: 7, pointerType: "touch", x: 150, y: 300 }));
    // Another finger on the right drags to look.
    host.dispatchEvent(pointer("pointerdown", { id: 8, pointerType: "touch", x: 800, y: 300 }));
    host.dispatchEvent(pointer("pointermove", { id: 8, pointerType: "touch", x: 830, y: 300 }));
    tick(2);
    expect(walk.state().yawDeg).toBeCloseTo(360 - 3, 6);
    // Full deflection runs: well over the walking distance in 2 s.
    expect(10 - camera.position.z).toBeGreaterThan(4);
    host.dispatchEvent(pointer("pointerup", { id: 7, pointerType: "touch", x: 150, y: 300 }));
    const z = camera.position.z;
    tick(1);
    // Eases to a stop within a few centimetres.
    expect(Math.abs(camera.position.z - z)).toBeLessThan(0.5);
    const knob = host.querySelector("[data-twin-joystick]");
    expect(knob?.getAttribute("aria-hidden")).toBe("true");
  });

  it("hands the joystick over with walk mode: no stick in orbit or tours, back when walking again", () => {
    const base = () => host.querySelector("[data-twin-joystick]")?.firstElementChild as HTMLElement;
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 });
    host.dispatchEvent(pointer("pointerdown", { id: 3, pointerType: "touch", x: 150, y: 450 }));
    expect(base().style.opacity).toBe("1");
    host.dispatchEvent(pointer("pointerup", { id: 3, pointerType: "touch", x: 150, y: 450 }));
    walk.disable();
    // Orbiting with one finger on the left half: no ghost stick follows the thumb.
    expect(() => host.dispatchEvent(pointer("pointerdown", { id: 4, pointerType: "touch", x: 150, y: 450 }))).not.toThrow();
    host.dispatchEvent(pointer("pointermove", { id: 4, pointerType: "touch", x: 200, y: 400 }));
    expect(base().style.opacity).toBe("0");
    expect(base().firstElementChild?.getAttribute("style") ?? "").not.toMatch(/translate\((?!0px, 0px)/);
    host.dispatchEvent(pointer("pointerup", { id: 4, pointerType: "touch", x: 200, y: 400 }));
    // Walking again: the same stick answers.
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 });
    host.dispatchEvent(pointer("pointerdown", { id: 5, pointerType: "touch", x: 150, y: 450 }));
    host.dispatchEvent(pointer("pointermove", { id: 5, pointerType: "touch", x: 150, y: 300 }));
    expect(base().style.opacity).toBe("1");
    tick(1);
    expect(10 - camera.position.z).toBeGreaterThan(1);
  });

  it("offers the stair within 1.5 m and goes down with a short fade", () => {
    walk.enable({ position: [-5, -15], level: "biocity-1", yawDeg: NORTH, pitchDeg: 0 });
    expect(walk.nearConnector()).toBeNull();
    walk.disable();
    walk.enable({ position: [-7.2, -17.2], level: "biocity-1", yawDeg: NORTH, pitchDeg: 0 });
    expect(walk.nearConnector()?.id).toBe("stair-down");
    // Every start reports what is there (nothing at the first spot, the stair at the second).
    expect(connectors).toEqual([null, "stair-down"]);
    connectors.length = 0;
    walk.useConnector("stair-down");
    // Mid-fade the walker is still upstairs…
    walk.update(0.05);
    expect(walk.state().level).toBe("biocity-1");
    tick(0.6);
    // …then arrives below, next to the way back up.
    expect(walk.state().level).toBe("joki-1");
    expect(walk.state().position[0]).toBeCloseTo(32, 6);
    expect(camera.position.y).toBeCloseTo(-1.7 + 1.65, 6);
    expect(levels).toEqual(["biocity-1", "biocity-1", "joki-1"]);
    expect(walk.nearConnector()?.id).toBe("stair-up");
    expect(connectors).toEqual(["stair-up"]);
  });

  it("tells the UI at once when walking restarts away from a connector (no stale Go up / Go down)", () => {
    walk.enable({ position: [-7.2, -17.2], level: "biocity-1", yawDeg: NORTH, pitchDeg: 0 });
    expect(connectors).toEqual(["stair-down"]);
    // Re-started elsewhere without stopping first (a new "walk me there"): the button goes right away.
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 });
    expect(connectors).toEqual(["stair-down", null]);
    expect(walk.nearConnector()).toBeNull();
    // …and back at the stair it comes back without a step.
    walk.enable({ position: [-7.2, -17.2], level: "biocity-1", yawDeg: NORTH, pitchDeg: 0 });
    expect(connectors).toEqual(["stair-down", null, "stair-down"]);
  });

  it("follows a live change of reduced motion: no head bob, connectors without the fade", () => {
    walk.enable({ position: [-7.2, -17.2], level: "biocity-1", yawDeg: NORTH, pitchDeg: 0 });
    walk.setReducedMotion?.(true);
    walk.useConnector("stair-down");
    // At once, no fade.
    expect(walk.state().level).toBe("joki-1");
    expect(host.querySelector("[aria-hidden='true'][style*='z-index: 3']")).toBeNull();
    walk.setReducedMotion?.(false);
    walk.useConnector("stair-up");
    walk.update(0.05);
    // With motion back, the fade runs again (still downstairs mid-fade).
    expect(walk.state().level).toBe("joki-1");
  });

  it("uses connectors instantly with reduced motion", () => {
    const calm = createWalkController(camera as unknown as THREE.PerspectiveCamera, host, { reducedMotion: true });
    calm.setWorld(campus());
    calm.enable({ position: [-8, -17.5], level: "biocity-1", yawDeg: 0, pitchDeg: 0 });
    calm.useConnector("stair-down");
    expect(calm.state().level).toBe("joki-1");
    calm.dispose();
  });

  it("stops listening when disabled and cleans up on dispose", () => {
    walk.enable({ position: [-20, 10], level: "outdoor", yawDeg: NORTH, pitchDeg: 0 });
    walk.disable();
    host.focus();
    const down = key("keydown", "KeyW");
    host.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(false);
    expect(walk.update(1 / 60)).toBe(false);
    walk.dispose();
    expect(host.querySelector("[data-twin-joystick]")).toBeNull();
  });
});

// ── Structures: bridge decks and the stairs up to them ──────────────────────

/** Bearing (0 = north) of a ground direction. */
const bearing = (dx: number, dz: number) => ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;

/**
 * Steer a walker along a route (aiming 1.5 m ahead on it) until the end or until it stops making
 * progress; reports how far it got and how closely its floor followed the route's heights.
 */
function followRoute(world: WalkWorld, route: V3[], level: LevelId = "outdoor") {
  const cum = [0];
  for (let i = 1; i < route.length; i++) cum.push(cum[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][2] - route[i - 1][2]));
  const total = cum[cum.length - 1];
  const at = (d: number): V3 => {
    const x = Math.min(Math.max(d, 0), total);
    let i = 1;
    while (i < route.length - 1 && cum[i] < x) i++;
    const f = (x - cum[i - 1]) / Math.max(1e-9, cum[i] - cum[i - 1]);
    return [0, 1, 2].map((c) => route[i - 1][c] + (route[i][c] - route[i - 1][c]) * f) as V3;
  };
  const prepared = prepareWalkWorld(world);
  const sim = startSim(
    { position: [route[0][0], route[0][2]], level, yawDeg: bearing(route[1][0] - route[0][0], route[1][2] - route[0][2]), pitchDeg: 0 },
    prepared,
  );
  let progress = 0;
  let best = 0;
  let lastGain = 0;
  let maxErr = 0;
  for (let t = 0; t < total / 1.2 + 30; t += 1 / 60) {
    let bestD = Infinity;
    for (let d = Math.max(0, progress - 3); d <= Math.min(total, progress + 6); d += 0.1) {
      const q = at(d);
      const e = Math.hypot(q[0] - sim.position[0], q[2] - sim.position[1]);
      if (e < bestD) {
        bestD = e;
        progress = d;
      }
    }
    maxErr = Math.max(maxErr, Math.abs(sim.floor - at(progress)[1]));
    if (progress >= total - 0.6) break;
    if (progress > best + 0.05) {
      best = progress;
      lastGain = t;
    } else if (t - lastGain > 4) break;
    const aim = at(progress + 1.5);
    sim.yawDeg = bearing(aim[0] - sim.position[0], aim[2] - sim.position[1]);
    stepWalk(sim, { forward: 1, strafe: 0, turn: 0, run: false }, prepared, 1 / 60);
  }
  return { reached: Math.max(best, progress) / total, maxErr, at: sim.position };
}

describe("structures: bridge decks and the stairs up to them", () => {
  // Ground at y 0, with a railway cutting (y −6) between x = 0 and x = 40, a bridge deck over it along z = 0
  // and a fence across the cutting floor (under the deck).
  const surface = (x: number) => (x > 0 && x < 40 ? -6 : 0);
  const deck = { polygon: rect(-1, -2, 41, 2), y: 0 };
  const fence = seg("outdoor", [20, -10], [20, 10]);
  const ground: WalkArea = { level: "outdoor", polygon: rect(-60, -60, 100, 60), y: 0 };
  /** As the engine builds it: the ground follows the terrain, structures keep their own floors. */
  const world = (structures: WalkArea[]): WalkWorld => {
    const own = new Set(structures);
    const heightAt: HeightAt = (x, _z, level, area) => (level !== "outdoor" || (area && own.has(area)) ? null : surface(x));
    return { colliders: [fence], walkAreas: [ground, ...structures], connectors: [], heightAt };
  };
  const over = flatRoute([-10, 0, 10, 20, 30, 40, 50]);

  function flatRoute(xs: number[]): V3[] {
    return xs.map((x) => [x, 0, 0] as V3);
  }

  it("turns the stretches of a route that leave the ground into walkable corridors (and the decks into floors)", () => {
    const areas = structureWalkAreas({ decks: [deck], routes: [over], surface });
    expect(areas[0]).toEqual({ level: "outdoor", y: 0, polygon: deck.polygon });
    // Every segment over the cutting, plus one either side, at the route's own heights.
    const corridors = areas.slice(1);
    expect(corridors.length).toBe(6);
    for (const c of corridors) expect(c.slope).toMatchObject({ y0: 0, y1: 0 });
    // A route that stays on the ground needs nothing.
    expect(structureWalkAreas({ decks: [], routes: [[[-30, 0, 10], [-20, 0, 10]]], surface })).toEqual([]);
  });

  it("walks over the bridge: no drop into the cutting, and the fence below is not in the way", () => {
    const r = followRoute(world(structureWalkAreas({ decks: [deck], routes: [over], surface })), over);
    expect(r.reached).toBeGreaterThan(0.98);
    expect(r.maxErr).toBeLessThan(0.05);
  });

  it("is stopped at the cutting's edge by the terrain alone (the old behaviour)", () => {
    expect(followRoute(world([]), over).reached).toBeLessThan(0.3);
  });

  it("starts on the deck over the cutting — or below it, given the floor height to start at", () => {
    const prepared = prepareWalkWorld(world(structureWalkAreas({ decks: [deck], routes: [over], surface })));
    const on = startSim({ position: [20, 0], level: "outdoor", yawDeg: 90, pitchDeg: 0 }, prepared);
    expect(on.floor).toBe(0);
    const below = startSim({ position: [20, 0], level: "outdoor", yawDeg: 90, pitchDeg: 0, y: -6 }, prepared);
    expect(below.floor).toBe(-6);
  });

  it("climbs a stair from the cutting floor up onto the deck", () => {
    const stair: V3[] = [
      [10, -6, 16],
      [10, -6, 12],
      [10, -4, 8.7],
      [10, -2, 5.3],
      [10, 0, 2],
      [10, 0, 0],
      [30, 0, 0],
    ];
    const r = followRoute(world(structureWalkAreas({ decks: [deck], routes: [stair], surface })), stair);
    expect(r.reached).toBeGreaterThan(0.98);
    expect(r.maxErr).toBeLessThan(0.15);
  });

  describe("on the real campus (DTM, the City's bridge decks, the routes)", () => {
    const ASSETS = path.join(process.cwd(), "public/assets/guide/3d");
    const read = <T,>(rel: string) => JSON.parse(fs.readFileSync(path.join(ASSETS, rel), "utf8")) as T;
    let terrain: Terrain;
    let real: WalkWorld;
    const routes = read<RoutesData>("data/routes.json");
    beforeAll(async () => {
      const png = await decodePng(new Uint8Array(fs.readFileSync(path.join(ASSETS, "terrain/dtm.png"))), (d) =>
        Promise.resolve(new Uint8Array(zlib.inflateSync(d))),
      );
      terrain = createTerrain(read<TerrainMeta>("terrain/dtm.json"), png.data);
      const streets = read<StreetsData>("data/streets.json");
      const structures = structureWalkAreas({
        decks: streets.areas.filter((a) => a.deckY !== undefined).map((a) => ({ polygon: a.poly, y: a.deckY as number })),
        routes: Object.values(routes.legs)
          .filter((l) => l.mode === "outdoor" && !l.reverseOf)
          .map((l) => l.points),
        surface: (x, z) => terrain.heightAt(x, z),
      });
      const e = terrain.extent;
      const campusGround: WalkArea = { level: "outdoor", polygon: rect(e.minX + 2, e.minZ + 2, e.maxX - 2, e.maxZ - 2), y: 0 };
      const own = new Set(structures);
      real = {
        colliders: [],
        walkAreas: [campusGround, ...structures],
        connectors: [],
        heightAt: (x, z, level, area) => (level !== "outdoor" || (area && own.has(area)) ? null : terrain.heightAt(x, z)),
      };
    });

    // Before: 9.7 m under Kalevansilta's deck (in the railway cutting), 7 m under Kupittaansilta. Now within a
    // step everywhere (the worst is a deck edge by EduCity's door, where the real world has EduCity's floor).
    it.each(["out-arr-train-edu-east", "out-co-train-bio-main", "out-a2-gw", "out-xfer-edu-west-bio-event"])(
      "%s: the floor follows the route over decks and stairs to the end",
      (id) => {
        const r = followRoute(real, routes.legs[id].points);
        expect(r.reached).toBeGreaterThan(0.97);
        expect(r.maxErr).toBeLessThan(WALK.levelTolerance);
      },
    );
  });
});
