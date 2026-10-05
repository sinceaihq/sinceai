import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { PlaceId, V2, V3 } from "../types";
import { pointInPolygon } from "./collision";

/**
 * Orbit / map camera for the campus. OrbitControls set up like a map: left
 * drag orbits, right drag (or Shift/Ctrl/⌘ + drag, or two fingers) pans
 * across the ground plane, the wheel zooms towards the pointer. On top of it:
 * frame-rate independent damping, the orbit target kept inside the campus
 * (the camera moves with it, so the view simply stops at the edge), the
 * camera kept ≥ 1.5 m above the terrain and out of closed buildings, distance
 * limits per place, and eased fly-to / zoom helpers that respect reduced
 * motion. Call update(dt) once per frame.
 */

export interface OrbitLimits {
  minDistance: number;
  maxDistance: number;
  /** 0 = looking straight down. */
  minPolarDeg: number;
  /** 90 = looking level with the horizon. */
  maxPolarDeg: number;
}

/** Distance and tilt limits per place (the campus overview reaches ParkCity and the station). */
export const ORBIT_LIMITS: Record<PlaceId, OrbitLimits> = {
  campus: { minDistance: 12, maxDistance: 1100, minPolarDeg: 0, maxPolarDeg: 86 },
  biocity: { minDistance: 4, maxDistance: 450, minPolarDeg: 0, maxPolarDeg: 88 },
  joki: { minDistance: 3, maxDistance: 320, minPolarDeg: 0, maxPolarDeg: 88 },
  educity: { minDistance: 4, maxDistance: 450, minPolarDeg: 0, maxPolarDeg: 88 },
};

export interface OrbitBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Hero + arrival zones (SPEC §2.1): BioCity, Joki, EduCity, Kupittaa station, ParkCity. */
export const CAMPUS_BOUNDS: OrbitBounds = { minX: -60, maxX: 340, minZ: -260, maxZ: 150 };

/** A closed building the camera must stay out of (footprint, roof height, optional base). */
export interface OrbitSolid {
  polygon: V2[];
  top: number;
  bottom?: number;
}

export interface OrbitOptions {
  reducedMotion?: boolean;
  /** Where the orbit target may go (default CAMPUS_BOUNDS). */
  bounds?: OrbitBounds;
  /** Ground height (terrain) under a point; default 0. */
  groundAt?(x: number, z: number): number;
  /** Camera clearance above the ground (default 1.5 m). */
  minHeight?: number;
  place?: PlaceId;
  limits?: Partial<Record<PlaceId, Partial<OrbitLimits>>>;
  /** Damping rate per second (default 6 ≈ OrbitControls' 0.1 at 60 fps). */
  damping?: number;
  /** Element whose arrow keys pan (default: dom). null = no keyboard. */
  keyEvents?: HTMLElement | null;
  /**
   * What the scene shows under a screen point (client px): the surface hit and its normal (world). A
   * wheel zoom then heads for that point — for a wall, the ground 3 m in front of it — and makes it
   * the orbit target. Without it, OrbitControls' own zoom-to-cursor (onto the target's plane).
   */
  cursorPoint?(clientX: number, clientY: number): { point: V3; normal: V3 | null } | null;
}

/**
 * Where a wheel zoom aimed at a scene point should head: the point itself, or — for a near-vertical
 * surface (a facade) — the ground `standOff` m in front of it, so the zoom ends looking at the
 * building from the street instead of nose-to-wall. Pure (unit-tested).
 */
export function zoomAnchor(point: V3, normal: V3 | null, groundAt: (x: number, z: number) => number, standOff = 3): V3 {
  if (!normal || Math.abs(normal[1]) >= 0.3) return [point[0], point[1], point[2]];
  const l = Math.hypot(normal[0], normal[2]) || 1;
  const x = point[0] + (normal[0] / l) * standOff;
  const z = point[2] + (normal[2] / l) * standOff;
  return [x, groundAt(x, z), z];
}

export interface Orbit {
  readonly controls: OrbitControls;
  /** Apply a place's distance/tilt limits. */
  setPlace(place: PlaceId): void;
  /** Closed buildings to keep the camera out of (replace the list when a building opens). */
  setSolids(solids: OrbitSolid[]): void;
  /** Put the camera somewhere; limits widen as needed until the next setPlace. */
  setPose(position: V3, target: V3): void;
  /** Glide the target to a point (keeping the view direction), optionally to a new distance. */
  flyTo(target: V3, opts?: { distance?: number; duration?: number }): void;
  /** Zoom by a factor (> 1 = closer), eased. */
  zoom(factor: number): void;
  setEnabled(on: boolean): void;
  /** Reduced motion changed (live): fly-to and zoom become instant (or eased again). */
  setReducedMotion?(on: boolean): void;
  /** Once per frame; true when the camera moved. */
  update(dt: number): boolean;
  dispose(): void;
}

const DEG = Math.PI / 180;
const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface XYZ {
  x: number;
  y: number;
  z: number;
}

/** Shift the target into the bounds and move the camera by the same amount. True when it moved. */
export function clampTarget(target: XYZ, camera: XYZ, b: OrbitBounds): boolean {
  const x = clamp(target.x, b.minX, b.maxX);
  const z = clamp(target.z, b.minZ, b.maxZ);
  if (x === target.x && z === target.z) return false;
  camera.x += x - target.x;
  camera.z += z - target.z;
  target.x = x;
  target.z = z;
  return true;
}

/** Push-out passes per call: a wall exit that lands in a touching neighbour goes over the roofs instead. */
const MAX_PUSH_PASSES = 4;

interface SolidBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const solidBounds = new WeakMap<OrbitSolid, SolidBounds>();

function boundsOf(s: OrbitSolid): SolidBounds {
  let b = solidBounds.get(s);
  if (!b) {
    b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
    for (const [x, z] of s.polygon) {
      if (x < b.minX) b.minX = x;
      if (x > b.maxX) b.maxX = x;
      if (z < b.minZ) b.minZ = z;
      if (z > b.maxZ) b.maxZ = z;
    }
    solidBounds.set(s, b);
  }
  return b;
}

/** The footprint contains (x, z). */
function coversXZ(s: OrbitSolid, x: number, z: number): boolean {
  const b = boundsOf(s);
  return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && pointInPolygon([x, z], s.polygon);
}

/** (x, y, z) is inside the solid (between its bottom and its roof, inside the footprint). */
export function insideSolid(s: OrbitSolid, x: number, y: number, z: number): boolean {
  return y <= s.top && y >= (s.bottom ?? -Infinity) && coversXZ(s, x, z);
}

/**
 * Keep the camera out of closed buildings: out through the nearest wall or over the roof, whichever is
 * shorter. Repeats until the camera is in no solid at all, so touching footprints (BioCity and Joki,
 * DataCity and Joki…) can't bounce it from one into the other frame after frame: a wall exit that lands
 * in a neighbour goes over the roofs instead. True when the camera moved.
 */
export function pushOutOfSolids(camera: XYZ, solids: readonly OrbitSolid[]): boolean {
  const x0 = camera.x;
  const y0 = camera.y;
  const z0 = camera.z;
  for (let pass = 0; pass < MAX_PUSH_PASSES; pass++) {
    const s = solids.find((o) => insideSolid(o, camera.x, camera.y, camera.z));
    if (!s) break;
    let best = Infinity;
    let qx = 0;
    let qz = 0;
    const poly = s.polygon;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [ax, az] = poly[j];
      const ex = poly[i][0] - ax;
      const ez = poly[i][1] - az;
      const l2 = ex * ex + ez * ez;
      const u = l2 > 0 ? clamp(((camera.x - ax) * ex + (camera.z - az) * ez) / l2, 0, 1) : 0;
      const x = ax + ex * u;
      const z = az + ez * u;
      const d = Math.hypot(x - camera.x, z - camera.z);
      if (d < best) {
        best = d;
        qx = x;
        qz = z;
      }
    }
    const up = s.top + 1 - camera.y;
    const out = best + 0.6;
    if (out < up && best > 1e-6) {
      const nx = camera.x + ((qx - camera.x) / best) * out;
      const nz = camera.z + ((qz - camera.z) / best) * out;
      if (!solids.some((o) => o !== s && insideSolid(o, nx, camera.y, nz))) {
        camera.x = nx;
        camera.z = nz;
        continue;
      }
    }
    camera.y = s.top + 1;
  }
  // Still inside after the passes (stacked solids): above everything standing at this spot.
  if (solids.some((o) => insideSolid(o, camera.x, camera.y, camera.z))) {
    let top = camera.y - 1;
    for (const o of solids) if (coversXZ(o, camera.x, camera.z) && o.top > top) top = o.top;
    camera.y = top + 1;
  }
  return camera.x !== x0 || camera.y !== y0 || camera.z !== z0;
}

// ── Engine flights over the campus ─────────────────────────────────────────

/**
 * Shape of a camera flight between two poses. `crane` = 0 is a plain arc (the camera rises by
 * `lift`·sin(πk) on the way); `crane` > 0 rises first, travels at height and comes down at the end
 * (that fraction of the flight is spent rising, and as much descending) — for hops next to tall
 * buildings, where an arc would have to be absurdly high to clear them.
 */
export interface FlightShape {
  lift: number;
  crane: number;
}

const smooth01 = (e0: number, e1: number, x: number) => {
  if (e1 <= e0) return x >= e1 ? 1 : 0;
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/**
 * Progress of a flight at k (0…1, already eased): `h` = how far along from → to the camera (and its
 * target, its field of view) has come, `up` = the lift factor (0…1) added on top.
 */
export function flightProgress(shape: FlightShape, k: number): { h: number; up: number } {
  const t = clamp(k, 0, 1);
  if (!(shape.crane > 0)) return { h: t, up: Math.sin(Math.PI * t) };
  const a = Math.min(0.45, shape.crane);
  // Moving starts once half the rise is done, and ends half-way down.
  return { h: smooth01(a * 0.5, 1 - a * 0.5, t), up: smooth01(0, a, t) * smooth01(0, a, 1 - t) };
}

/** Camera position of a flight at k. */
export function flightPoint(from: V3, to: V3, shape: FlightShape, k: number): V3 {
  const { h, up } = flightProgress(shape, k);
  return [
    from[0] + (to[0] - from[0]) * h,
    from[1] + (to[1] - from[1]) * h + shape.lift * up,
    from[2] + (to[2] - from[2]) * h,
  ];
}

/**
 * Lift a flight of this shape needs to clear the solids by `margin` (0 = clear as it is; Infinity =
 * no lift can, e.g. an arc leaving right next to a tall wall). Sampled every half metre of the way
 * (thin roof corners next to a pose count too). The margin fades in over the first and last stretch
 * of the climb, so a pose a metre above a roof can still take off and land there.
 */
function liftNeeded(from: V3, to: V3, crane: number, solids: readonly OrbitSolid[], margin: number): number {
  if (!solids.length) return 0;
  const run = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const n = Math.min(1600, Math.max(96, Math.ceil(run / 0.5)));
  let need = 0;
  for (let i = 1; i < n; i++) {
    const { h, up } = flightProgress({ lift: 0, crane }, i / n);
    const x = from[0] + (to[0] - from[0]) * h;
    const y = from[1] + (to[1] - from[1]) * h;
    const z = from[2] + (to[2] - from[2]) * h;
    for (const s of solids) {
      const clearAt = s.top + margin * Math.min(1, up / 0.25);
      if (y >= clearAt || !coversXZ(s, x, z)) continue;
      if (up < 1e-6) return Infinity;
      need = Math.max(need, (clearAt - y) / up);
    }
  }
  return need;
}

/**
 * Plan an engine flight (view chips, "Go to", picks) that never passes through a closed building:
 * the usual arc when it clears every solid; a somewhat higher arc when that is enough; else a crane
 * move (up, across at height, down) — whichever needs less height. Solids that contain either end are
 * left out (the flight has to leave or enter those anyway). null = nothing within `maxLift` clears
 * them (cut instead).
 */
export function planFlight(
  from: V3,
  to: V3,
  solids: readonly OrbitSolid[],
  opts: { lift?: number; margin?: number; maxLift?: number } = {},
): FlightShape | null {
  const travel = Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const lift = opts.lift ?? Math.min(80, travel * 0.12);
  const margin = opts.margin ?? 3;
  const maxLift = opts.maxLift ?? 220;
  // Only buildings under the flight's ground track matter.
  const minX = Math.min(from[0], to[0]) - 1;
  const maxX = Math.max(from[0], to[0]) + 1;
  const minZ = Math.min(from[2], to[2]) - 1;
  const maxZ = Math.max(from[2], to[2]) + 1;
  const relevant = solids.filter((s) => {
    const b = boundsOf(s);
    if (b.maxX < minX || b.minX > maxX || b.maxZ < minZ || b.minZ > maxZ) return false;
    return !insideSolid(s, from[0], from[1], from[2]) && !insideSolid(s, to[0], to[1], to[2]);
  });
  const arc = liftNeeded(from, to, 0, relevant, margin);
  if (arc <= lift) return { lift, crane: 0 };
  const higher: FlightShape | null = arc + 1 <= maxLift ? { lift: arc + 1, crane: 0 } : null;
  // A modestly higher arc is the most natural move.
  if (higher && higher.lift <= Math.max(lift * 1.6, lift + 15)) return higher;
  let crane: FlightShape | null = null;
  for (const c of [0.22, 0.32, 0.42]) {
    const need = liftNeeded(from, to, c, relevant, margin);
    if (need + 1 > maxLift) continue;
    const shape = { lift: Math.max(need + 1, Math.min(lift, need + 12)), crane: c };
    if (!crane || shape.lift < crane.lift) crane = shape;
  }
  if (crane && (!higher || crane.lift < higher.lift)) return crane;
  return higher;
}

export function createOrbit(
  camera: THREE.PerspectiveCamera,
  dom: HTMLElement,
  opts: OrbitOptions = {},
): Orbit {
  const bounds = opts.bounds ?? CAMPUS_BOUNDS;
  const groundAt = opts.groundAt ?? (() => 0);
  const minHeight = opts.minHeight ?? 1.5;
  const rate = opts.damping ?? 6;
  const keyEl = opts.keyEvents === undefined ? dom : opts.keyEvents;
  let reducedMotion = !!opts.reducedMotion;

  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  // Map-like: panning slides across the ground, zoom goes where the pointer points.
  controls.screenSpacePanning = false;
  controls.zoomToCursor = true;
  controls.rotateSpeed = 0.55;
  controls.panSpeed = 1;
  controls.zoomSpeed = 1;
  controls.keyPanSpeed = 14;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  if (keyEl) controls.listenToKeyEvents(keyEl);

  let solids: OrbitSolid[] = [];
  let fly: {
    fromT: V3;
    toT: V3;
    fromD: number;
    toD: number;
    dir: V3;
    t: number;
    dur: number;
  } | null = null;
  let dolly: number | null = null;
  /** A wheel zoom towards a scene point (opts.cursorPoint): its anchor, held while the wheel keeps turning. */
  let cursorZoom: { anchor: V3; until: number } | null = null;
  const onWheel = (e: WheelEvent) => {
    if (!controls.enabled || !opts.cursorPoint) return;
    const now = performance.now();
    if (cursorZoom && now < cursorZoom.until) {
      cursorZoom.until = now + 260;
      return;
    }
    const hit = opts.cursorPoint(e.clientX, e.clientY);
    if (!hit) {
      cursorZoom = null;
      controls.zoomToCursor = true;
      return;
    }
    cursorZoom = { anchor: zoomAnchor(hit.point, hit.normal, groundAt), until: now + 260 };
    // OrbitControls dollies towards its target; update() then slides the target towards the anchor.
    controls.zoomToCursor = false;
  };
  // Capture: decide before OrbitControls handles the same wheel event.
  if (opts.cursorPoint) dom.addEventListener("wheel", onWheel, { capture: true, passive: true });

  function applyLimits(l: OrbitLimits) {
    controls.minDistance = l.minDistance;
    controls.maxDistance = l.maxDistance;
    controls.minPolarAngle = l.minPolarDeg * DEG;
    controls.maxPolarAngle = l.maxPolarDeg * DEG;
  }

  function limitsFor(place: PlaceId): OrbitLimits {
    return { ...ORBIT_LIMITS[place], ...opts.limits?.[place] };
  }

  const offset = () => {
    const p = camera.position;
    const t = controls.target;
    return [p.x - t.x, p.y - t.y, p.z - t.z] as V3;
  };

  /** Keep the camera minHeight above the terrain. */
  function aboveGround(p: XYZ) {
    const floor = groundAt(p.x, p.z) + minHeight;
    if (p.y < floor) p.y = floor;
  }

  /** Constraints after OrbitControls moved the camera; true when the pose had to be corrected. */
  function constrain(): boolean {
    const t = controls.target;
    const p = camera.position;
    const before = [p.x, p.y, p.z, t.x, t.y, t.z];
    clampTarget(t, p, bounds);
    // The target never sinks below the ground (map panning keeps it at a constant height).
    const gt = groundAt(t.x, t.z) - 0.5;
    if (t.y < gt) {
      p.y += gt - t.y;
      t.y = gt;
    }
    aboveGround(p);
    // Out of closed buildings (against every solid: a push can land next to another one), then the
    // ground again where the push went.
    if (solids.length && pushOutOfSolids(p, solids)) aboveGround(p);
    const changed =
      p.x !== before[0] || p.y !== before[1] || p.z !== before[2] || t.x !== before[3] || t.y !== before[4] || t.z !== before[5];
    if (changed) camera.lookAt(t.x, t.y, t.z);
    return changed;
  }

  /**
   * Drop the drag inertia OrbitControls still carries (rotation, pan), so a pose placed by code —
   * a flight's landing, a reduced-motion jump — stays exactly where it was put.
   */
  function flushInertia() {
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    controls.update();
    controls.enableDamping = damping;
  }

  function cancel() {
    fly = null;
    dolly = null;
  }
  controls.addEventListener("start", cancel);

  function place(position: V3, target: V3) {
    camera.position.set(position[0], position[1], position[2]);
    controls.target.set(target[0], target[1], target[2]);
    camera.lookAt(target[0], target[1], target[2]);
  }

  applyLimits(limitsFor(opts.place ?? "campus"));

  return {
    controls,
    setPlace(p) {
      applyLimits(limitsFor(p));
    },
    setSolids(list) {
      solids = list.slice();
    },
    setPose(position, target) {
      cancel();
      flushInertia();
      const d = Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2]);
      if (d < controls.minDistance) controls.minDistance = d * 0.98;
      if (d > controls.maxDistance) controls.maxDistance = d * 1.02;
      const polar = Math.acos(clamp((position[1] - target[1]) / Math.max(d, 1e-9), -1, 1));
      if (polar > controls.maxPolarAngle) controls.maxPolarAngle = Math.min(Math.PI, polar + 0.01);
      if (polar < controls.minPolarAngle) controls.minPolarAngle = Math.max(0, polar - 0.01);
      place(position, target);
      controls.update();
      constrain();
    },
    flyTo(target, o = {}) {
      dolly = null;
      const from: V3 = [controls.target.x, controls.target.y, controls.target.z];
      const off = offset();
      const fromD = Math.max(1e-6, Math.hypot(off[0], off[1], off[2]));
      const toT: V3 = [clamp(target[0], bounds.minX, bounds.maxX), target[1], clamp(target[2], bounds.minZ, bounds.maxZ)];
      const toD = clamp(o.distance ?? fromD, controls.minDistance, controls.maxDistance);
      const dir: V3 = [off[0] / fromD, off[1] / fromD, off[2] / fromD];
      flushInertia();
      if (reducedMotion) {
        fly = null;
        place([toT[0] + dir[0] * toD, toT[1] + dir[1] * toD, toT[2] + dir[2] * toD], toT);
        controls.update();
        constrain();
        return;
      }
      const travel = Math.hypot(toT[0] - from[0], toT[1] - from[1], toT[2] - from[2]);
      const dur = o.duration ?? clamp(0.6 + travel / 150 + Math.abs(Math.log(toD / fromD)) * 0.25, 0.6, 1.8);
      fly = { fromT: from, toT, fromD, toD, dir, t: 0, dur };
    },
    zoom(factor) {
      if (!(factor > 0)) return;
      fly = null;
      const off = offset();
      const current = Math.hypot(off[0], off[1], off[2]);
      const to = clamp((dolly ?? current) / factor, controls.minDistance, controls.maxDistance);
      if (reducedMotion) {
        flushInertia();
        const k = to / Math.max(current, 1e-9);
        const t = controls.target;
        camera.position.set(t.x + off[0] * k, t.y + off[1] * k, t.z + off[2] * k);
        dolly = null;
        controls.update();
        constrain();
        return;
      }
      dolly = to;
    },
    setEnabled(on) {
      controls.enabled = on;
      if (!on) cancel();
    },
    setReducedMotion(on) {
      reducedMotion = on;
      // A glide in progress lands at once.
      if (on) {
        if (fly) {
          const f = fly;
          fly = null;
          place([f.toT[0] + f.dir[0] * f.toD, f.toT[1] + f.dir[1] * f.toD, f.toT[2] + f.dir[2] * f.toD], f.toT);
          controls.update();
          constrain();
        }
        if (dolly !== null) {
          const off = offset();
          const k = dolly / Math.max(Math.hypot(off[0], off[1], off[2]), 1e-9);
          const t = controls.target;
          camera.position.set(t.x + off[0] * k, t.y + off[1] * k, t.z + off[2] * k);
          dolly = null;
          controls.update();
          constrain();
        }
      }
    },
    update(dt) {
      const step = Number.isFinite(dt) ? clamp(dt, 0, 0.1) : 0;
      controls.dampingFactor = clamp(1 - Math.exp(-rate * step), 0.01, 1);
      let animating = false;
      /** Distance before this frame's dolly step (null = no dolly running). */
      let dollyFrom: number | null = null;
      if (fly) {
        fly.t = Math.min(fly.dur, fly.t + step);
        const k = easeInOut(fly.t / fly.dur);
        const tx = fly.fromT[0] + (fly.toT[0] - fly.fromT[0]) * k;
        const ty = fly.fromT[1] + (fly.toT[1] - fly.fromT[1]) * k;
        const tz = fly.fromT[2] + (fly.toT[2] - fly.fromT[2]) * k;
        // Distance changes geometrically, so a big zoom feels even.
        const d = fly.fromD * Math.pow(fly.toD / fly.fromD, k);
        place([tx + fly.dir[0] * d, ty + fly.dir[1] * d, tz + fly.dir[2] * d], [tx, ty, tz]);
        animating = true;
        if (fly.t >= fly.dur) fly = null;
      } else if (dolly !== null) {
        const off = offset();
        const current = Math.hypot(off[0], off[1], off[2]);
        const next = current + (dolly - current) * (1 - Math.exp(-12 * step));
        const k = next / Math.max(current, 1e-9);
        const t = controls.target;
        camera.position.set(t.x + off[0] * k, t.y + off[1] * k, t.z + off[2] * k);
        animating = true;
        if (Math.abs(next - dolly) < dolly * 1e-3) dolly = null;
        else dollyFrom = current;
      }
      const cz = cursorZoom;
      const c0 = cz ? [camera.position.x, camera.position.y, camera.position.z] : null;
      const t0 = cz ? [controls.target.x, controls.target.y, controls.target.z] : null;
      const moved = controls.update(step);
      if (cz && c0 && t0) {
        // Zoom about the anchor: the target moves towards it by the ratio the distance shrank (or grew),
        // keeping OrbitControls' new offset (dolly and any rotation) from the target.
        const d0 = Math.hypot(c0[0] - t0[0], c0[1] - t0[1], c0[2] - t0[2]);
        const off = offset();
        const d1 = Math.hypot(off[0], off[1], off[2]);
        const r = d1 / Math.max(d0, 1e-9);
        if (Math.abs(r - 1) > 1e-5) {
          const a = cz.anchor;
          const t = controls.target;
          t.set(a[0] + (t0[0] - a[0]) * r, a[1] + (t0[1] - a[1]) * r, a[2] + (t0[2] - a[2]) * r);
          camera.position.set(t.x + off[0], t.y + off[1], t.z + off[2]);
          camera.lookAt(t.x, t.y, t.z);
        }
        if (performance.now() > cz.until) {
          cursorZoom = null;
          controls.zoomToCursor = true;
        }
      }
      const fixed = constrain();
      if (dolly !== null && dollyFrom !== null && step > 0) {
        // A zoom the constraints keep undoing (towards a target inside a closed building, into the
        // ground) stops where the camera got to, instead of animating against them forever.
        const off = offset();
        const reached = Math.hypot(off[0], off[1], off[2]);
        if (Math.abs(dollyFrom - dolly) - Math.abs(reached - dolly) < 1e-3) dolly = null;
      }
      return moved || fixed || animating;
    },
    dispose() {
      cancel();
      dom.removeEventListener("wheel", onWheel, { capture: true });
      controls.removeEventListener("start", cancel);
      controls.stopListenToKeyEvents();
      controls.dispose();
    },
  };
}
