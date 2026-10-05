import type * as THREE from "three";
import type { Collider2D, Connector, LevelId, V2, V3, WalkArea } from "../types";
import {
  areaFloor,
  crossedEdge,
  floorY,
  indexColliders,
  levelAt,
  moveCircle,
  moveReach,
  type ColliderIndex,
  type HeightAt,
  type LevelHit,
} from "./collision";
import { createJoystick, type Joystick } from "./joystick";

/**
 * First-person walking: eye height 1.65 m, 1.4 m/s (Shift: 3.0 m/s) with
 * smooth acceleration, a circle of 0.3 m against the current level's walls,
 * floors (and ramps) from the walk areas, automatic level changes through
 * doors, and "Go up / Go down" connectors.
 *
 * Input: W/S or ↑/↓ walk, A/D step sideways, ←/→ turn (so the keyboard alone
 * can look around), Shift runs; drag to look — mouse or pen anywhere, a finger
 * on the right half — and the scene follows the pointer like a photo; the
 * wheel takes a step forward or back; a finger on the left half is a joystick.
 * Keys only count while the scene host has focus, never in a form control.
 *
 * The simulation is pure and exported (stepWalk / simulateWalk) so walking,
 * collisions and level changes are unit-tested without a browser; the
 * controller only turns DOM input into WalkInput and writes the camera.
 */

export interface WalkWorld {
  colliders: Collider2D[];
  walkAreas: WalkArea[];
  connectors: Connector[];
  /** Floor-height override, e.g. the terrain under "outdoor"; null/undefined → the walk area's height. */
  heightAt?: HeightAt;
}

export interface WalkState {
  position: V2;
  level: LevelId;
  /** View direction as a compass bearing (0 = north, 90 = east). */
  yawDeg: number;
  /** Up is positive; limited to ±80°. */
  pitchDeg: number;
  /**
   * Floor height hint for a start (a door's threshold): where floors overlap (a deck over the ground),
   * the start takes the one nearest to it. Without it, a structure wins over the terrain under it.
   */
  y?: number;
}

export interface WalkController {
  enable(start: WalkState): void;
  disable(): void;
  setWorld(world: WalkWorld): void;
  /** Advance by dt seconds; writes camera position/orientation. True when the camera moved. */
  update(dt: number): boolean;
  state(): WalkState;
  nearConnector(): Connector | null;
  /** Every connector within reach on the walker's level, nearest first (a lift: one per floor). */
  nearConnectors?(): Connector[];
  useConnector(id: string): void;
  /** Reduced motion changed (live): no head bob, connectors without the fade. */
  setReducedMotion?(on: boolean): void;
  dispose(): void;
}

export interface WalkOptions {
  reducedMotion: boolean;
  eyeHeight?: number;
  onLevel?(level: LevelId): void;
  onConnector?(c: Connector | null): void;
  /** Every connector within reach on the walker's level, nearest first; called when the set changes. */
  onConnectors?(list: Connector[]): void;
}

/** Tunables (SI units). */
export const WALK = {
  eyeHeight: 1.65,
  radius: 0.3,
  walkSpeed: 1.4,
  runSpeed: 3.0,
  /** Keyboard turning (°/s). */
  turnSpeed: 90,
  /** Time constant of speeding up / slowing down (s). */
  accel: 0.12,
  pitchLimit: 80,
  connectorRange: 1.5,
  /** Floors within this height of each other join (doors between levels). */
  levelTolerance: 0.6,
  /** One wheel notch (m) — about a stride. */
  wheelStep: 0.75,
  /** On a terrain override, refuse floors that rise or drop more than this within the next 0.35 m. */
  maxStep: 0.5,
  /**
   * …or more than this within the next metre: a bank in the height model steeper than a stair (≈33°)
   * is a ledge — the edge of a deck over lower ground, a retaining wall — not a slope to walk down.
   */
  maxRise: 0.65,
  /** Standing this high above the terrain (a bridge deck, a stair up to it), the ground's own walls, fences and posts are below. */
  elevated: 1.8,
  /** Head bob: dip per step (m) and stride (m). */
  bob: 0.02,
  stride: 0.7,
} as const;

export interface WalkParams {
  eyeHeight: number;
  radius: number;
  walkSpeed: number;
  runSpeed: number;
  reducedMotion: boolean;
}

export interface WalkInput {
  /** −1…1: forward (+) / back. */
  forward: number;
  /** −1…1: step right (+) / left. */
  strafe: number;
  /** −1…1: turn right (+) / left (keyboard). */
  turn: number;
  run: boolean;
  /** Metres to glide forward (+) or back, added this frame (wheel steps). */
  glide?: number;
  /** Speed override (m/s) for analog input (the joystick). */
  speed?: number;
}

/** Everything the simulation keeps between frames. */
export interface WalkSim {
  position: V2;
  level: LevelId;
  yawDeg: number;
  pitchDeg: number;
  velocity: V2;
  turnRate: number;
  /** Floor height under the walker. */
  floor: number;
  /** Smoothed eye height (world y, before head bob). */
  eye: number;
  eyeVel: number;
  bobPhase: number;
  bobAmp: number;
  /** Wheel glide still to travel (m). */
  glide: number;
  /** The walk area underfoot; null = off the map (moves are not limited until it enters one). */
  area: WalkArea | null;
}

export interface PreparedWalkWorld {
  world: WalkWorld;
  /** Colliders of one level, indexed. */
  colliders(level: LevelId): ColliderIndex;
  /** Walk areas whose bounds contain p. */
  areasAt(p: V2): WalkArea[];
  /** Walk areas whose bounds touch a box. */
  areasIn(minX: number, minZ: number, maxX: number, maxZ: number): WalkArea[];
  /** Areas of one level. */
  levelAreas(level: LevelId): WalkArea[];
}

const DEFAULTS: WalkParams = {
  eyeHeight: WALK.eyeHeight,
  radius: WALK.radius,
  walkSpeed: WALK.walkSpeed,
  runSpeed: WALK.runSpeed,
  reducedMotion: false,
};

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
const wrap360 = (deg: number) => ((deg % 360) + 360) % 360;
const finite = (x: number | undefined, fallback = 0) => (x !== undefined && Number.isFinite(x) ? x : fallback);

export function prepareWalkWorld(world: WalkWorld): PreparedWalkWorld {
  const indexes = new Map<LevelId, ColliderIndex>();
  const boxes = world.walkAreas.map((area) => {
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of area.polygon) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
    return { area, minX, minZ, maxX, maxZ };
  });
  return {
    world,
    colliders(level) {
      let index = indexes.get(level);
      if (!index) {
        index = indexColliders(
          world.colliders.filter((c) => c.level === level),
          2,
        );
        indexes.set(level, index);
      }
      return index;
    },
    areasAt([x, z]) {
      const out: WalkArea[] = [];
      for (const b of boxes) if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) out.push(b.area);
      return out;
    },
    areasIn(minX, minZ, maxX, maxZ) {
      const out: WalkArea[] = [];
      for (const b of boxes) if (b.minX <= maxX && b.maxX >= minX && b.minZ <= maxZ && b.maxZ >= minZ) out.push(b.area);
      return out;
    },
    levelAreas: (level) => world.walkAreas.filter((a) => a.level === level),
  };
}

/**
 * Colliders a move from → to can touch (sliding included): its own level's, plus — given the floor
 * height — those of every level with floor at the same height nearby (±0.6 m). Walls on the same
 * plane are obstacles whichever level lists them: a building's outer walls keep the street out
 * even where the street has no collider for them, and its doors let you in.
 */
function nearby(world: PreparedWalkWorld, level: LevelId, from: V2, to: V2, r: number, floor?: number): Collider2D[] {
  const reach = moveReach(from, to, r);
  const minX = from[0] - reach;
  const minZ = from[1] - reach;
  const maxX = from[0] + reach;
  const maxZ = from[1] + reach;
  // Up on a deck (a bridge over the railway cutting) the obstacles of the ground below — fences,
  // posts, the platform's columns — are not in the way; the deck's own edges are its walk area's.
  // (No floor hint: the ground under a deck, not the deck the walker stands on.)
  const ground = floor !== undefined ? world.world.heightAt?.(from[0], from[1], level) : undefined;
  const elevated = floor !== undefined && ground !== null && ground !== undefined && floor - ground > WALK.elevated;
  const out = elevated ? [] : world.colliders(level).query(minX, minZ, maxX, maxZ);
  if (floor === undefined) return out;
  const seen: LevelId[] = [level];
  for (const area of world.areasIn(minX, minZ, maxX, maxZ)) {
    if (seen.includes(area.level)) continue;
    if (Math.abs(areaFloor(area, from, world.world.heightAt, floor) - floor) > WALK.levelTolerance) continue;
    seen.push(area.level);
    for (const c of world.colliders(area.level).query(minX, minZ, maxX, maxZ)) out.push(c);
  }
  return out;
}

/** Floor of a level near p when p is off its areas: the area whose outline is closest. */
function nearestFloor(world: PreparedWalkWorld, level: LevelId, p: V2): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const area of world.levelAreas(level)) {
    const poly = area.polygon;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [ax, az] = poly[j];
      const ex = poly[i][0] - ax;
      const ez = poly[i][1] - az;
      const l2 = ex * ex + ez * ez;
      const u = l2 > 0 ? clamp(((p[0] - ax) * ex + (p[1] - az) * ez) / l2, 0, 1) : 0;
      const d = Math.hypot(p[0] - ax - ex * u, p[1] - az - ez * u);
      if (d < bestD) {
        bestD = d;
        best = floorY(area, p);
      }
    }
  }
  return best;
}

/** Initial simulation state for a start pose (level resolved, pushed clear of walls). */
export function startSim(start: WalkState, world: PreparedWalkWorld, params: WalkParams = DEFAULTS): WalkSim {
  const p: V2 = [finite(start.position[0]), finite(start.position[1])];
  const areas = world.areasAt(p);
  const heightAt = world.world.heightAt;
  const hit =
    (start.y !== undefined && Number.isFinite(start.y)
      ? levelAt(p, areas, { level: start.level, y: start.y, tolerance: 1.5, heightAt })
      : null) ?? levelAt(p, areas, { level: start.level, heightAt });
  const level = hit?.level ?? start.level;
  const floor =
    hit?.y ?? world.world.heightAt?.(p[0], p[1], level, undefined, start.y) ?? nearestFloor(world, level, p) ?? 0;
  const position = moveCircle(p, p, params.radius, nearby(world, level, p, p, params.radius, floor));
  return {
    position,
    level,
    yawDeg: wrap360(finite(start.yawDeg)),
    pitchDeg: clamp(finite(start.pitchDeg), -WALK.pitchLimit, WALK.pitchLimit),
    velocity: [0, 0],
    turnRate: 0,
    floor,
    eye: floor + params.eyeHeight,
    eyeVel: 0,
    bobPhase: 0,
    bobAmp: 0,
    glide: 0,
    area: hit?.area ?? null,
  };
}

interface MoveResult {
  position: V2;
  hit: LevelHit | { level: LevelId; y: number; area: null };
}

/** Collide a move on the current level and find the floor at the result; null = not walkable there. */
function tryMove(sim: WalkSim, to: V2, world: PreparedWalkWorld, params: WalkParams): MoveResult | null {
  const from = sim.position;
  const position = moveCircle(from, to, params.radius, nearby(world, sim.level, from, to, params.radius, sim.floor));
  const heightAt = world.world.heightAt;
  const hit = levelAt(position, world.areasAt(position), {
    level: sim.level,
    y: sim.floor,
    tolerance: WALK.levelTolerance,
    heightAt,
  });
  if (!hit) {
    // Off the map (or a world without walk areas): free movement until it enters an area.
    if (sim.area) return null;
    return { position, hit: { level: sim.level, y: heightAt?.(position[0], position[1], sim.level, undefined, sim.floor) ?? sim.floor, area: null } };
  }
  if (heightAt && hit.level === sim.level) {
    // On the terrain (not a deck or a stair with a floor of its own): refuse to climb walls or walk off
    // ledges the height field shows as steep ramps — unless a walkable floor carries on within a step
    // there (the foot of a stair up to a bridge).
    const own = hit.area ? heightAt(position[0], position[1], hit.level, hit.area, sim.floor) : hit.y;
    const dx = position[0] - from[0];
    const dz = position[1] - from[1];
    const len = Math.hypot(dx, dz);
    if (own !== null && own !== undefined && len > 1e-6) {
      for (const [reach, limit] of [
        [0.35, WALK.maxStep],
        [1, WALK.maxRise],
      ] as const) {
        const probe: V2 = [position[0] + (dx / len) * reach, position[1] + (dz / len) * reach];
        const ahead = heightAt(probe[0], probe[1], hit.level, undefined, hit.y);
        if (
          ahead !== null &&
          ahead !== undefined &&
          Math.abs(ahead - hit.y) > limit &&
          // …unless a walkable floor carries on there (a stair or a ramp with a floor of its own, a door).
          !levelAt(probe, world.areasAt(probe), { level: hit.level, y: hit.y, tolerance: limit + 0.45, heightAt })?.area?.slope &&
          !levelAt(probe, world.areasAt(probe), { level: hit.level, y: hit.y, tolerance: WALK.maxStep, heightAt })
        ) {
          return null;
        }
      }
    }
  }
  return { position, hit };
}

/**
 * One simulation step: turn, accelerate, collide, keep to the walkable areas
 * (sliding along their edges), change level through doors, smooth the eye
 * height and the head bob. Mutates `sim`.
 */
export function stepWalk(
  sim: WalkSim,
  input: WalkInput,
  world: PreparedWalkWorld,
  dt: number,
  params: WalkParams = DEFAULTS,
): { levelChanged: boolean; blocked: boolean } {
  const step = Number.isFinite(dt) ? clamp(dt, 0, 0.1) : 0;
  let levelChanged = false;
  let blocked = false;
  if (step === 0) return { levelChanged, blocked };

  // Turning (keyboard) eases in and out.
  const turnTarget = clamp(finite(input.turn), -1, 1) * WALK.turnSpeed;
  sim.turnRate += (turnTarget - sim.turnRate) * (1 - Math.exp(-step / 0.1));
  if (Math.abs(sim.turnRate) < 1e-3 && turnTarget === 0) sim.turnRate = 0;
  sim.yawDeg = wrap360(sim.yawDeg + sim.turnRate * step);

  // Desired velocity on the ground plane.
  let f = clamp(finite(input.forward), -1, 1);
  let s = clamp(finite(input.strafe), -1, 1);
  const m = Math.hypot(f, s);
  if (m > 1) {
    f /= m;
    s /= m;
  }
  const speed = input.speed !== undefined ? clamp(finite(input.speed), 0, params.runSpeed) : input.run ? params.runSpeed : params.walkSpeed;
  const yaw = (sim.yawDeg * Math.PI) / 180;
  const fx = Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = Math.sin(yaw);
  const tvx = (fx * f + rx * s) * speed;
  const tvz = (fz * f + rz * s) * speed;
  const k = 1 - Math.exp(-step / WALK.accel);
  sim.velocity[0] += (tvx - sim.velocity[0]) * k;
  sim.velocity[1] += (tvz - sim.velocity[1]) * k;
  if (tvx === 0 && tvz === 0 && Math.hypot(sim.velocity[0], sim.velocity[1]) < 1e-3) sim.velocity = [0, 0];

  // Wheel steps glide in over ~0.4 s.
  sim.glide = clamp(sim.glide + finite(input.glide), -4, 4);
  let g = sim.glide * (1 - Math.exp(-step / 0.14));
  if (Math.abs(sim.glide) < 1e-3) g = sim.glide;
  sim.glide -= g;

  const dx = sim.velocity[0] * step + fx * g;
  const dz = sim.velocity[1] * step + fz * g;
  const want = Math.hypot(dx, dz);
  if (want > 1e-7) {
    const from = sim.position;
    const to: V2 = [from[0] + dx, from[1] + dz];
    let result = tryMove(sim, to, world, params);
    if (!result && sim.area) {
      // Leaving the walkable area: slide along the edge that was crossed.
      const edge = crossedEdge(from, to, sim.area.polygon);
      if (edge) {
        const along = (dx * edge.ux + dz * edge.uz) * 0.999;
        result = tryMove(sim, [from[0] + edge.ux * along, from[1] + edge.uz * along], world, params);
      }
    }
    if (!result) {
      // Last resort: one axis at a time (corners of the area).
      const xOnly = Math.abs(dx) > 1e-7 ? tryMove(sim, [from[0] + dx, from[1]], world, params) : null;
      const zOnly = Math.abs(dz) > 1e-7 ? tryMove(sim, [from[0], from[1] + dz], world, params) : null;
      const gain = (r: MoveResult | null) => (r ? Math.hypot(r.position[0] - from[0], r.position[1] - from[1]) : -1);
      result = gain(xOnly) >= gain(zOnly) ? xOnly : zOnly;
    }
    if (result) {
      const got = Math.hypot(result.position[0] - from[0], result.position[1] - from[1]);
      blocked = got < want - 1e-6;
      levelChanged = result.hit.level !== sim.level;
      sim.position = result.position;
      sim.level = result.hit.level;
      sim.floor = result.hit.y;
      sim.area = result.hit.area;
      if (blocked) {
        // Keep only the speed that was achieved (sliding along the wall), drop the rest of a glide.
        sim.velocity = [(result.position[0] - from[0]) / step, (result.position[1] - from[1]) / step];
        sim.glide = 0;
      }
    } else {
      blocked = true;
      sim.velocity = [0, 0];
      sim.glide = 0;
    }
  }

  // Eye height follows the floor (stairs, ramps, kerbs) on a critically damped spring.
  const target = sim.floor + params.eyeHeight;
  const omega = 14;
  const e = Math.exp(-omega * step);
  const delta = sim.eye - target;
  const temp = (sim.eyeVel + omega * delta) * step;
  sim.eye = target + (delta + temp) * e;
  sim.eyeVel = (sim.eyeVel - omega * temp) * e;
  // Never sink into a floor or float far above it after a big drop.
  sim.eye = clamp(sim.eye, sim.floor + params.eyeHeight * 0.6, sim.floor + params.eyeHeight * 1.4);

  // Head bob: a small dip per step, scaled by speed; none with reduced motion.
  const ground = Math.hypot(sim.velocity[0], sim.velocity[1]);
  if (params.reducedMotion) {
    sim.bobAmp = 0;
  } else {
    const run = clamp((ground - params.walkSpeed) / Math.max(0.1, params.runSpeed - params.walkSpeed), 0, 1);
    const ampTarget = Math.min(1, ground / params.walkSpeed) * WALK.bob * (1 + 0.6 * run);
    sim.bobAmp += (ampTarget - sim.bobAmp) * (1 - Math.exp(-step / 0.25));
    if (sim.bobAmp < 1e-5 && ampTarget === 0) sim.bobAmp = 0;
    sim.bobPhase = (sim.bobPhase + ((ground * step) / (WALK.stride * (1 + 0.4 * run))) * Math.PI * 2) % (Math.PI * 2);
  }
  return { levelChanged, blocked };
}

/** Eye position including the head bob. */
export function eyePosition(sim: WalkSim): [number, number, number] {
  const bob = -sim.bobAmp * 0.5 * (1 - Math.cos(sim.bobPhase));
  return [sim.position[0], sim.eye + bob, sim.position[1]];
}

/** The connector on the walker's level within range (nearest first), or null. */
export function nearestConnector(sim: WalkSim, connectors: Connector[], range: number = WALK.connectorRange): Connector | null {
  let best: Connector | null = null;
  let bestD = range;
  for (const c of connectors) {
    if (c.from !== sim.level) continue;
    const d = Math.hypot(c.at[0] - sim.position[0], c.at[1] - sim.position[1]);
    if (d <= bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

/**
 * Every connector on the walker's level within range, nearest first — a lift lobby offers each floor
 * the lift serves, not only the nearest button. One entry per id.
 */
export function nearConnectors(sim: WalkSim, connectors: Connector[], range: number = WALK.connectorRange): Connector[] {
  const found: { c: Connector; d: number }[] = [];
  const seen = new Set<string>();
  for (const c of connectors) {
    if (c.from !== sim.level || seen.has(c.id)) continue;
    const d = Math.hypot(c.at[0] - sim.position[0], c.at[1] - sim.position[1]);
    if (d > range) continue;
    seen.add(c.id);
    found.push({ c, d });
  }
  return found.sort((a, b) => a.d - b.d).map((x) => x.c);
}

/** Arrive through a connector: on its target level at `arrive`, clear of walls, at rest. Mutates `sim`. */
export function arriveAt(sim: WalkSim, c: Connector, world: PreparedWalkWorld, params: WalkParams = DEFAULTS) {
  const p: V2 = [c.arrive[0], c.arrive[1]];
  const hit = levelAt(p, world.areasAt(p), { level: c.to, heightAt: world.world.heightAt });
  const onLevel = hit && hit.level === c.to ? hit : null;
  const floor = onLevel?.y ?? world.world.heightAt?.(p[0], p[1], c.to) ?? nearestFloor(world, c.to, p) ?? sim.floor;
  sim.position = moveCircle(p, p, params.radius, nearby(world, c.to, p, p, params.radius, floor));
  sim.level = c.to;
  sim.floor = floor;
  sim.area = onLevel?.area ?? null;
  sim.eye = floor + params.eyeHeight;
  sim.eyeVel = 0;
  sim.velocity = [0, 0];
  sim.turnRate = 0;
  sim.glide = 0;
}

/**
 * Run the walker headlessly through a script of inputs (each held for some
 * seconds at a fixed dt). For tests and tooling; same code path as the live
 * controller.
 */
export function simulateWalk(
  start: WalkState,
  world: WalkWorld,
  script: { input: Partial<WalkInput>; seconds: number; dt?: number }[],
  opts: Partial<WalkParams> & { onStep?(sim: WalkSim): void } = {},
): WalkSim & { levels: LevelId[] } {
  const params: WalkParams = { ...DEFAULTS, ...opts };
  const prepared = prepareWalkWorld(world);
  const sim = startSim(start, prepared, params);
  const levels: LevelId[] = [sim.level];
  for (const part of script) {
    const dt = part.dt ?? 1 / 60;
    const frames = Math.round(part.seconds / dt);
    for (let i = 0; i < frames; i++) {
      const input: WalkInput = {
        forward: 0,
        strafe: 0,
        turn: 0,
        run: false,
        ...part.input,
        glide: i === 0 ? part.input.glide ?? 0 : 0,
      };
      if (stepWalk(sim, input, prepared, dt, params).levelChanged) levels.push(sim.level);
      opts.onStep?.(sim);
    }
  }
  return { ...sim, position: [sim.position[0], sim.position[1]], velocity: [sim.velocity[0], sim.velocity[1]], levels };
}

// ── Structures on the outdoor level ──────────────────────────────────────────

export interface StructureOptions {
  /** Bridge decks: walking level y over the polygon (the terrain under them is the cutting below). */
  decks: { polygon: V2[]; y: number }[];
  /** Outdoor route polylines with their walking heights ([x, y, z], y = floor). */
  routes: V3[][];
  /** The ground's walking surface (terrain) at (x, z). */
  surface(x: number, z: number): number;
  /** Corridor width (m), default 2.4. */
  width?: number;
  /** A route more than this off the surface (m) is on a structure, default 0.35. */
  tolerance?: number;
}

/**
 * Outdoor walk areas with a floor of their own, where the walking surface is not the terrain: bridge
 * decks (flat, at deck level) and the stairs and ramps the routes take up to them — every stretch of a
 * route that runs more than `tolerance` off the surface, or over a step of the surface a walker may not
 * climb. Each such stretch (plus one segment either side, to meet the ground) becomes a corridor
 * `width` wide at the route's own heights: one sloped quad per segment, mitred at the bends so
 * neighbours share their edges — no gaps on the outside of a turn, no overlaps on the inside. Pure;
 * the engine adds these to the walk world and keeps the terrain everywhere else.
 */
export function structureWalkAreas(opts: StructureOptions): WalkArea[] {
  const width = opts.width ?? 2.4;
  const tolerance = opts.tolerance ?? 0.35;
  const half = width / 2;
  const out: WalkArea[] = [];
  for (const d of opts.decks) if (d.polygon.length >= 3 && Number.isFinite(d.y)) out.push({ level: "outdoor", y: d.y, polygon: d.polygon });
  for (const raw of opts.routes) {
    // Drop repeated points (zero-length segments have no direction).
    const route: V3[] = [];
    for (const p of raw) {
      const last = route[route.length - 1];
      if (!last || Math.hypot(p[0] - last[0], p[2] - last[2]) > 1e-3) route.push(p);
    }
    const n = route.length;
    if (n < 2) continue;
    // Segments on a structure (or across a step of the surface the walker would refuse).
    const off = new Uint8Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      const [ax, ay, az] = route[i];
      const [bx, by, bz] = route[i + 1];
      const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.35));
      let last = NaN;
      for (let j = 0; j <= k; j++) {
        const t = j / k;
        const g = opts.surface(ax + (bx - ax) * t, az + (bz - az) * t);
        if (Math.abs(ay + (by - ay) * t - g) > tolerance || Math.abs(g - last) > WALK.maxStep) {
          off[i] = 1;
          break;
        }
        last = g;
      }
    }
    const used = (i: number) => i >= 0 && i < n - 1 && (off[i] === 1 || off[i - 1] === 1 || off[i + 1] === 1);
    // Unit direction and left normal of each segment.
    const dir = (i: number): V2 => {
      const dx = route[i + 1][0] - route[i][0];
      const dz = route[i + 1][2] - route[i][2];
      const l = Math.hypot(dx, dz);
      return [dx / l, dz / l];
    };
    for (let i = 0; i < n - 1; ) {
      if (!used(i)) {
        i++;
        continue;
      }
      let j = i;
      while (used(j + 1)) j++;
      // Corridor over segments i…j: left/right edge points at every vertex (mitred inside the run).
      const left: V2[] = [];
      const right: V2[] = [];
      for (let k = i; k <= j + 1; k++) {
        const [px, , pz] = route[k];
        const dPrev = k > i ? dir(k - 1) : null;
        const dNext = k <= j ? dir(k) : null;
        let mx: number;
        let mz: number;
        let scale = 1;
        let shift = 0;
        if (dPrev && dNext) {
          mx = -dPrev[1] - dNext[1];
          mz = dPrev[0] + dNext[0];
          const l = Math.hypot(mx, mz);
          if (l < 0.2) {
            // A U-turn: square across the way on.
            mx = -dNext[1];
            mz = dNext[0];
          } else {
            mx /= l;
            mz /= l;
            scale = Math.min(2, 1 / Math.max(0.5, mx * -dNext[1] + mz * dNext[0]));
          }
        } else {
          const d = (dNext ?? dPrev) as V2;
          mx = -d[1];
          mz = d[0];
          // A little past the run's ends, into the ground it meets.
          shift = dNext ? -0.3 : 0.3;
          const sx = d[0] * shift;
          const sz = d[1] * shift;
          left.push([px + sx + mx * half, pz + sz + mz * half]);
          right.push([px + sx - mx * half, pz + sz - mz * half]);
          continue;
        }
        left.push([px + mx * half * scale, pz + mz * half * scale]);
        right.push([px - mx * half * scale, pz - mz * half * scale]);
      }
      for (let k = i; k <= j; k++) {
        const a = route[k];
        const b = route[k + 1];
        const q = k - i;
        out.push({
          level: "outdoor",
          y: Math.min(a[1], b[1]),
          polygon: [left[q], left[q + 1], right[q + 1], right[q]],
          slope: { from: [a[0], a[2]], to: [b[0], b[2]], y0: a[1], y1: b[1] },
        });
      }
      i = j + 1;
    }
  }
  return out;
}

// ── DOM controller ──────────────────────────────────────────────────────────

/** Movement keys by KeyboardEvent.code: [forward, strafe, turn]. Physical keys, so ZQSD layouts work too. */
const KEYS: Record<string, [number, number, number]> = {
  KeyW: [1, 0, 0],
  ArrowUp: [1, 0, 0],
  KeyS: [-1, 0, 0],
  ArrowDown: [-1, 0, 0],
  KeyA: [0, -1, 0],
  KeyD: [0, 1, 0],
  ArrowLeft: [0, 0, -1],
  ArrowRight: [0, 0, 1],
};

const KEY_FALLBACK: Record<string, string> = { w: "KeyW", a: "KeyA", s: "KeyS", d: "KeyD" };

/** Elements whose own keys win over walking (form controls, menus, sliders…). */
const INTERACTIVE =
  "input, textarea, select, button, a[href], [contenteditable]:not([contenteditable='false']), " +
  "[role='slider'], [role='textbox'], [role='combobox'], [role='listbox'], [role='menu'], [role='menuitem'], " +
  "[role='tab'], [role='tablist'], [role='radio'], [role='radiogroup'], [role='spinbutton'], [role='option']";

const FADE_OUT = 0.16;
const FADE_IN = 0.28;

export function createWalkController(
  camera: THREE.PerspectiveCamera,
  dom: HTMLElement,
  opts: WalkOptions,
): WalkController {
  const params: WalkParams = { ...DEFAULTS, eyeHeight: opts.eyeHeight ?? WALK.eyeHeight, reducedMotion: opts.reducedMotion };
  let world = prepareWalkWorld({ colliders: [], walkAreas: [], connectors: [] });
  let sim: WalkSim | null = null;
  let enabled = false;
  const keys = new Set<string>();
  let shift = false;
  let lookYaw = 0;
  let lookPitch = 0;
  let glide = 0;
  let lookPointer: number | null = null;
  const drag = { x: 0, y: 0, moved: 0, captured: false };
  let joystick: Joystick | null = null;
  let near: Connector | null = null;
  /** Every connector within reach (ids joined: what the UI last heard). */
  let nearAll: Connector[] = [];
  let nearKey = "";
  let fade: { connector: Connector; phase: "out" | "in"; t: number } | null = null;
  let fadeEl: HTMLDivElement | null = null;
  const last = [NaN, NaN, NaN, NaN, NaN, NaN, NaN];

  const codeOf = (e: KeyboardEvent) => e.code || KEY_FALLBACK[e.key?.toLowerCase()] || e.key;

  /** Keys count on the host itself or a plain (non-interactive) element inside it. */
  function acceptsKeys(target: EventTarget | null): boolean {
    if (target === dom) return true;
    if (!(target instanceof Element) || !dom.contains(target)) return false;
    for (let el: Element | null = target; el && el !== dom; el = el.parentElement) {
      if (el.matches(INTERACTIVE)) return false;
    }
    return true;
  }

  function releaseKeys() {
    keys.clear();
    shift = false;
  }

  const isMeta = (code: string) => code === "MetaLeft" || code === "MetaRight" || code === "OSLeft" || code === "OSRight" || code === "Meta";
  const onKeyDown = (e: KeyboardEvent) => {
    // macOS sends no keyup for keys released while ⌘ is down (⌘ + scroll steps, ⌘-shortcuts): let go
    // of everything when ⌘ goes down, so no key stays held after it.
    if (e.metaKey || isMeta(codeOf(e))) releaseKeys();
    if (!enabled || e.ctrlKey || e.metaKey || e.altKey || !acceptsKeys(e.target)) return;
    const code = codeOf(e);
    shift = e.shiftKey || code === "ShiftLeft" || code === "ShiftRight";
    if (!(code in KEYS)) return;
    keys.add(code);
    e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const code = codeOf(e);
    if (isMeta(code)) {
      releaseKeys();
      return;
    }
    keys.delete(code);
    shift = e.shiftKey && code !== "ShiftLeft" && code !== "ShiftRight";
  };
  const onFocusOut = (e: FocusEvent) => {
    const next = e.relatedTarget;
    if (!(next instanceof Node) || !dom.contains(next)) releaseKeys();
  };
  const onBlur = () => releaseKeys();
  const onHidden = () => {
    if (document.hidden) releaseKeys();
  };

  /** Degrees of view per CSS pixel, so the scene stays under a dragging finger. */
  const degPerPixel = () => (camera.fov || 60) / Math.max(1, dom.clientHeight || 600);

  const onPointerDown = (e: PointerEvent) => {
    if (!enabled || joystick?.owns(e.pointerId) || lookPointer !== null) return;
    if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2) return;
    // Clicking the scene gives it the keyboard — without the keyboard focus ring (a pointer did it).
    // Touch needs no keyboard focus, and a programmatic focus there would draw the ring.
    if (e.pointerType !== "touch" && !dom.contains(document.activeElement)) {
      dom.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    }
    lookPointer = e.pointerId;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved = 0;
    drag.captured = false;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== lookPointer) return;
    // The button came up outside the scene before the drag was captured: the drag is over.
    if ((e.pointerType === "mouse" || e.pointerType === "pen") && e.buttons === 0) {
      endLook(e.pointerId);
      return;
    }
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    // Capture only once it is a drag, so a click still reaches the canvas (picking).
    if (!drag.captured && drag.moved > 4 && e.pointerType === "mouse") {
      drag.captured = true;
      try {
        dom.setPointerCapture?.(e.pointerId);
      } catch {
        // The pointer is already gone.
      }
    }
    const k = degPerPixel();
    lookYaw -= dx * k;
    lookPitch += dy * k;
  };
  function endLook(pointerId: number) {
    lookPointer = null;
    if (drag.captured) {
      drag.captured = false;
      try {
        dom.releasePointerCapture?.(pointerId);
      } catch {
        // Already released.
      }
    }
  }
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== lookPointer) return;
    endLook(e.pointerId);
  };
  /** Capture taken away (the element left the DOM, another capture): stop dragging. */
  const onLostCapture = (e: PointerEvent) => {
    if (e.pointerId === lookPointer && drag.captured) {
      drag.captured = false;
      lookPointer = null;
    }
  };
  const onWheel = (e: WheelEvent) => {
    if (!enabled) return;
    e.preventDefault();
    const notches = clamp(e.deltaY * (e.deltaMode === 1 ? 1 / 3 : e.deltaMode === 2 ? 1 : 1 / 100), -3, 3);
    glide = clamp(glide - notches * WALK.wheelStep, -4, 4);
  };
  const onContextMenu = (e: Event) => {
    if (enabled) e.preventDefault();
  };

  function attach() {
    dom.addEventListener("keydown", onKeyDown);
    dom.addEventListener("keyup", onKeyUp);
    dom.addEventListener("focusout", onFocusOut);
    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("pointermove", onPointerMove);
    dom.addEventListener("pointerup", onPointerUp);
    dom.addEventListener("pointercancel", onPointerUp);
    dom.addEventListener("lostpointercapture", onLostCapture);
    dom.addEventListener("wheel", onWheel, { passive: false });
    dom.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onHidden);
  }

  function detach() {
    dom.removeEventListener("keydown", onKeyDown);
    dom.removeEventListener("keyup", onKeyUp);
    dom.removeEventListener("focusout", onFocusOut);
    dom.removeEventListener("pointerdown", onPointerDown);
    dom.removeEventListener("pointermove", onPointerMove);
    dom.removeEventListener("pointerup", onPointerUp);
    dom.removeEventListener("pointercancel", onPointerUp);
    dom.removeEventListener("lostpointercapture", onLostCapture);
    dom.removeEventListener("wheel", onWheel);
    dom.removeEventListener("contextmenu", onContextMenu);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onHidden);
  }

  /** Write the camera; true when it moved. */
  function writeCamera(): boolean {
    if (!sim) return false;
    const [x, y, z] = eyePosition(sim);
    // Euler (pitch, −yaw, 0) in YXZ order as a quaternion: yaw about +y, then pitch about the camera's x.
    const halfYaw = (-sim.yawDeg * Math.PI) / 360;
    const halfPitch = (sim.pitchDeg * Math.PI) / 360;
    const cy = Math.cos(halfYaw);
    const sy = Math.sin(halfYaw);
    const cx = Math.cos(halfPitch);
    const sx = Math.sin(halfPitch);
    const pose = [x, y, z, cy * sx, sy * cx, -sy * sx, cy * cx];
    camera.position.set(x, y, z);
    camera.quaternion.set(pose[3], pose[4], pose[5], pose[6]);
    camera.updateMatrixWorld();
    let moved = false;
    for (let i = 0; i < 7; i++) {
      if (!(Math.abs(pose[i] - last[i]) < 1e-6)) moved = true;
      last[i] = pose[i];
    }
    return moved;
  }

  /** Tell the UI every connector in reach when the set changes (and the nearest, for older UIs). */
  function reportAll(list: Connector[]) {
    const key = list.map((c) => c.id).join("|");
    nearAll = list;
    if (key === nearKey) return;
    nearKey = key;
    opts.onConnectors?.(list);
  }

  function updateNear() {
    reportAll(sim && enabled ? nearConnectors(sim, world.world.connectors) : []);
    const next = sim && enabled ? nearestConnector(sim, world.world.connectors) : null;
    if (next?.id === near?.id) return;
    near = next;
    opts.onConnector?.(near);
  }

  function setFade(opacity: number) {
    if (!fadeEl) {
      fadeEl = document.createElement("div");
      fadeEl.setAttribute("aria-hidden", "true");
      Object.assign(fadeEl.style, {
        position: "absolute",
        inset: "0",
        background: "var(--color-bg, #000)",
        pointerEvents: "none",
        opacity: "0",
        zIndex: "3",
      });
      dom.appendChild(fadeEl);
    }
    fadeEl.style.opacity = String(opacity);
    fadeEl.style.display = opacity > 0 ? "block" : "none";
  }

  function arrive(c: Connector) {
    if (!sim) return;
    const before = sim.level;
    arriveAt(sim, c, world, params);
    if (sim.level !== before) opts.onLevel?.(sim.level);
    updateNear();
  }

  function input(): WalkInput {
    let forward = 0;
    let strafe = 0;
    let turn = 0;
    for (const code of keys) {
      const k = KEYS[code];
      forward += k[0];
      strafe += k[1];
      turn += k[2];
    }
    const result: WalkInput = { forward, strafe, turn, run: shift };
    const stick = joystick?.vector();
    if (stick && (stick.x !== 0 || stick.y !== 0)) {
      const mag = Math.min(1, Math.hypot(stick.x, stick.y));
      result.forward = forward + stick.y / mag;
      result.strafe = strafe + stick.x / mag;
      // Analog pace: up to a walk across most of the travel, a run at the rim.
      result.speed =
        mag <= 0.85
          ? (params.walkSpeed * mag) / 0.85
          : params.walkSpeed + ((params.runSpeed - params.walkSpeed) * (mag - 0.85)) / 0.15;
      if (shift) result.speed = params.runSpeed;
    }
    return result;
  }

  const controller: WalkController = {
    enable(start) {
      sim = startSim(start, world, params);
      releaseKeys();
      lookYaw = 0;
      lookPitch = 0;
      glide = 0;
      lookPointer = null;
      fade = null;
      if (fadeEl) setFade(0);
      if (!enabled) {
        enabled = true;
        attach();
      }
      joystick ??= createJoystick(dom);
      joystick.setEnabled(true);
      // The resting hint only where touch is the main input (as the UI decides); the stick answers any touch.
      const coarse =
        typeof window.matchMedia === "function"
          ? window.matchMedia("(pointer: coarse)").matches
          : (navigator.maxTouchPoints ?? 0) > 0;
      joystick.setVisible(coarse);
      writeCamera();
      // The first update reports a move, so the new pose gets rendered.
      last.fill(NaN);
      opts.onLevel?.(sim.level);
      // A fresh start, maybe somewhere else entirely (walk me there, a new target): the UI hears the
      // connector here — or that there is none — at once, not when the walker first moves.
      near = nearestConnector(sim, world.world.connectors);
      opts.onConnector?.(near);
      nearKey = "\u0000";
      reportAll(nearConnectors(sim, world.world.connectors));
    },
    disable() {
      if (!enabled) return;
      if (fade?.phase === "out") arrive(fade.connector);
      fade = null;
      if (fadeEl) setFade(0);
      enabled = false;
      detach();
      releaseKeys();
      lookPointer = null;
      // Orbit and tours own the touches now: the stick stops answering until walking starts again.
      joystick?.setEnabled(false);
      joystick?.setVisible(false);
      if (near) {
        near = null;
        opts.onConnector?.(null);
      }
      reportAll([]);
    },
    setWorld(next) {
      world = prepareWalkWorld(next);
      if (!sim) return;
      // Re-seat the walker in the new world (same place, same level when it still exists here).
      const p = sim.position;
      const hit =
        levelAt(p, world.areasAt(p), { level: sim.level, y: sim.floor, tolerance: WALK.levelTolerance, heightAt: next.heightAt }) ??
        levelAt(p, world.areasAt(p), { level: sim.level, heightAt: next.heightAt });
      const before = sim.level;
      if (hit) {
        sim.level = hit.level;
        sim.floor = hit.y;
        sim.area = hit.area;
      } else sim.area = null;
      sim.position = moveCircle(p, p, params.radius, nearby(world, sim.level, p, p, params.radius, sim.floor));
      if (enabled && sim.level !== before) opts.onLevel?.(sim.level);
      updateNear();
    },
    update(dt) {
      if (!enabled || !sim) return false;
      const step = Number.isFinite(dt) ? clamp(dt, 0, 0.1) : 0;
      let fading = false;
      if (fade) {
        fading = true;
        fade.t += step;
        if (fade.phase === "out") {
          const k = Math.min(1, fade.t / FADE_OUT);
          setFade(k * k * (3 - 2 * k));
          if (k >= 1) {
            arrive(fade.connector);
            fade = { connector: fade.connector, phase: "in", t: 0 };
          }
        } else {
          const k = Math.min(1, fade.t / FADE_IN);
          setFade(1 - k * k * (3 - 2 * k));
          if (k >= 1) {
            fade = null;
            setFade(0);
          }
        }
      }
      sim.yawDeg = wrap360(sim.yawDeg + lookYaw);
      sim.pitchDeg = clamp(sim.pitchDeg + lookPitch, -WALK.pitchLimit, WALK.pitchLimit);
      lookYaw = 0;
      lookPitch = 0;
      const move = fade ? { forward: 0, strafe: 0, turn: 0, run: false } : { ...input(), glide };
      glide = 0;
      const { levelChanged } = stepWalk(sim, move, world, step, params);
      if (levelChanged) opts.onLevel?.(sim.level);
      updateNear();
      return writeCamera() || fading;
    },
    state() {
      if (!sim) return { position: [0, 0], level: "outdoor", yawDeg: 0, pitchDeg: 0 };
      return { position: [sim.position[0], sim.position[1]], level: sim.level, yawDeg: sim.yawDeg, pitchDeg: sim.pitchDeg };
    },
    nearConnector: () => near,
    nearConnectors: () => nearAll.slice(),
    useConnector(id) {
      const c = world.world.connectors.find((x) => x.id === id);
      if (!c || !sim || fade) return;
      if (params.reducedMotion || !enabled) {
        arrive(c);
        writeCamera();
        last.fill(NaN);
        return;
      }
      fade = { connector: c, phase: "out", t: 0 };
    },
    setReducedMotion(on) {
      params.reducedMotion = on;
      if (on && sim) {
        sim.bobAmp = 0;
        // A fade in progress lands at once.
        if (fade) {
          if (fade.phase === "out") arrive(fade.connector);
          fade = null;
          setFade(0);
          last.fill(NaN);
        }
      }
    },
    dispose() {
      controller.disable();
      joystick?.dispose();
      joystick = null;
      fadeEl?.remove();
      fadeEl = null;
      sim = null;
    },
  };
  return controller;
}
