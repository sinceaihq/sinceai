import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { LightingState, Tier, TwinContext, V2, V3, WorldModule } from "../types";
import { loadCampus, loadRoutes, loadTerrain, type CampusData, type RoutesData, type Terrain } from "../data/campus";
import { TIER_SETTINGS } from "../render/quality";
import { EVENT_VIOLET, EVENT_VIOLET_STRONG } from "../render/canvas";
import { clamp, hashString, mulberry32, pointInRing, polygonBounds } from "../util";

/**
 * People on the campus (DESIGN §2 props/people.ts):
 *
 * - Pedestrians: one InstancedMesh for everyone (one draw call + shadows).
 *   A procedural, realistically proportioned figure (≈600 triangles) in
 *   November clothing; per instance: height and build, coat / trousers /
 *   hair / skin colours and accessories (beanie, hood, long coat, scarf,
 *   backpack, shoulder bag, event lanyard). Accessories are switched per
 *   instance by collapsing their vertices, so variety costs no draw calls.
 * - The walk cycle (hips, knees, ankles, arm swing, pelvis bob and twist)
 *   is skinned in the vertex shader from a phase that advances with the
 *   distance walked, so feet do not skate. The same rig sits (build halls),
 *   stands and talks (groups at the entrances).
 * - Walkers follow the outdoor arrival legs (routes.json) and the campus
 *   sidewalks; how many and which way depends on the time of the event
 *   (crowdPlan). Small groups stand at the event entrances and bus stops.
 * - Exports for other modules: placeSeatedPeople() for the build halls and
 *   makeWalkerAvatar() for the tour (a person in the Since AI violet jacket).
 *
 * Deterministic (mulberry32 seeds); ambient motion stops with reduced
 * motion (people then stand where they are, mid-stride poses frozen).
 */

// ── Rig and appearance constants ────────────────────────────────────────────

/** Bones of the procedural figure (front = −z, feet at y = 0, left = −x). */
const BONE = {
  torso: 0,
  thighL: 1,
  shinL: 2,
  footL: 3,
  thighR: 4,
  shinR: 5,
  footR: 6,
  armL: 7,
  foreL: 8,
  armR: 9,
  foreR: 10,
  head: 11,
} as const;

/** Colour slots (per vertex); the colours come per instance. */
const SLOT = {
  skin: 0,
  hair: 1,
  coat: 2,
  trousers: 3,
  shoes: 4,
  hat: 5,
  scarf: 6,
  bag: 7,
  lanyard: 8,
  badge: 9,
} as const;

/** Optional parts, one bit each in the instance's feature mask (0 = always present). */
export const FEATURE = {
  hairShort: 1,
  hairLong: 2,
  beanie: 3,
  hood: 4,
  longCoat: 5,
  scarf: 6,
  backpack: 7,
  shoulderBag: 8,
  lanyard: 9,
} as const;
const bit = (f: number) => 1 << (f - 1);

/** Joint pivots of the rest pose (metres, figure 1.75 m tall). */
const HIP_Y = 0.9;
const HIP_X = 0.095;
const KNEE_Y = 0.5;
const ANKLE_Y = 0.095;
const SHOULDER_Y = 1.41;
const SHOULDER_X = 0.195;
const ELBOW_Y = 1.13;
const ELBOW_X = 0.212;
const NECK_Y = 1.5;

/** Walking: a stride (two steps) is ≈ 1.42 m at 1.35 m/s (cadence ≈ 1.9 steps/s). */
export const STRIDE_M = 1.42;

/** Poses (instance attribute). */
export const POSE = { walk: 0, stand: 1, sit: 2, talk: 3 } as const;

// Palettes (sRGB): Finnish November street — dark coats dominate, a few colours.
const COATS = [
  "#1d1f22", "#24272b", "#2b2d31", "#1a1c20", "#323538", "#3b3e42", "#20242c", "#1f2a3a", "#26303f", "#2f3a48",
  "#3a3f35", "#3f4433", "#4a4536", "#5b5345", "#6f6455", "#8a7b66", "#a39279", "#4b2c2c", "#5d2f2b", "#7a2f2a",
  "#1e3a4c", "#264b5e", "#4a5560", "#6b7178", "#9aa1a8", "#c9c3b6", "#2d4a3e", "#55402f", "#8c5a3c", "#b06a3a",
];
const TROUSERS = ["#1b1c1f", "#202226", "#26292e", "#2b3036", "#1f2633", "#2a3446", "#34405a", "#3c3a36", "#4a463f", "#5a5650"];
const HAIR = ["#14110f", "#1f1813", "#2b2018", "#3a2a1e", "#4a3624", "#5c4630", "#6b5640", "#8a7355", "#a88f6c", "#b9a58a", "#6e6a66", "#9b9894"];
const ACCENTS = ["#7a2430", "#2b4a6f", "#c9b24b", "#3f6b4a", "#d6d2c8", "#3a3a3a", "#8c3f5a", "#5b6e8c"];
/** Skin tones from light to dark (sRGB), sampled by the instance's tone 0…1. */
const SKIN = ["#f1d3bf", "#e7bfa3", "#d8a685", "#c08a68", "#9a6a4c", "#6e4a35", "#4a3125"];

const linear = (hex: string) => new THREE.Color(hex);

// ── Pure helpers (unit-tested) ──────────────────────────────────────────────

/** Wrap an angle to [−π, π). */
export function wrapAngle(a: number): number {
  const t = (a + Math.PI) % (2 * Math.PI);
  return (t < 0 ? t + 2 * Math.PI : t) - Math.PI;
}

/**
 * Joint angles of the walk cycle at phase u (radians, 0…2π = one stride);
 * mirrors the vertex shader. Left hip flexes forward at u = π/2.
 */
export function gaitAngles(u: number): { hipL: number; hipR: number; kneeL: number; kneeR: number; armL: number; armR: number; bob: number } {
  const knee = (v: number) => {
    const swing = Math.exp(-Math.pow(wrapAngle(v + 0.75) / 0.72, 2));
    const load = Math.exp(-Math.pow(wrapAngle(v - 2.05) / 0.5, 2));
    return 0.06 + 1.02 * swing + 0.22 * load;
  };
  return {
    hipL: 0.36 * Math.sin(u) + 0.05,
    hipR: 0.36 * Math.sin(u + Math.PI) + 0.05,
    kneeL: knee(u),
    kneeR: knee(u + Math.PI),
    armL: -0.3 * Math.sin(u) + 0.03,
    armR: 0.3 * Math.sin(u) + 0.03,
    bob: 0.018 * Math.cos(2 * u),
  };
}

/** Day of week (0 = Sunday) and hour for a Turku wall-clock ISO time ("2026-11-06T15:30"). */
export function clockOf(iso: string): { dow: number; hour: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return { dow: 5, hour: 15.5 };
  const dow = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
  return { dow, hour: Number(m[4]) + Number(m[5]) / 60 };
}

export interface CrowdPlan {
  /** Share of the walker pool that is out (0…1). */
  walkers: number;
  /** Share of the standing groups that are out (0…1). */
  groups: number;
  /** Relative weight of each kind of path. */
  weights: { arrivalEdu: number; companies: number; transfer: number; sidewalk: number };
  /** Share of walkers on an arrival leg that walk it towards the venue (else away from it). */
  inbound: number;
}

/**
 * Who is out walking at a given time of the event weekend (Fri 6 – Sun 8 Nov 2026):
 * builders arriving at EduCity on Friday afternoon, companies heading to BioCity,
 * the evening transfer EduCity → BioCity, quiet nights, a steady Saturday.
 */
export function crowdPlan(iso: string): CrowdPlan {
  const { dow, hour } = clockOf(iso);
  const ramp = (h: number, a: number, b: number) => clamp((h - a) / (b - a), 0, 1);
  const bump = (h: number, a: number, b: number, c: number, d: number) => ramp(h, a, b) * (1 - ramp(h, c, d));
  if (dow === 5) {
    // Friday: registration 15:00, opening 17:00, briefings 18:30, transfer ≈ 19:30.
    const arrival = bump(hour, 13.5, 14.8, 17.0, 17.6);
    const companies = bump(hour, 14.5, 15.3, 19.5, 20.5);
    const transfer = bump(hour, 19.0, 19.4, 20.4, 21.0);
    const base = hour < 7 ? 0.08 : hour < 9 ? 0.35 : hour < 13 ? 0.45 : hour < 22 ? 0.4 : 0.22;
    return {
      walkers: clamp(base + 0.6 * arrival + 0.25 * companies + 0.6 * transfer, 0, 1),
      groups: clamp(0.2 + 0.8 * arrival + 0.4 * companies + 0.6 * transfer + (hour > 21 ? 0.25 : 0), 0, 1),
      weights: { arrivalEdu: 0.3 + 3 * arrival, companies: 0.3 + 2 * companies, transfer: 0.15 + 4 * transfer, sidewalk: 1 },
      inbound: 0.65 + 0.3 * arrival,
    };
  }
  if (dow === 6) {
    // Saturday: hacking all day, Q&A 9–18; small hours quiet.
    const day = bump(hour, 7.5, 9.5, 18.5, 22);
    const night = hour < 6 ? 0.1 : 0.2;
    return {
      walkers: clamp(night + 0.5 * day, 0, 1),
      groups: clamp(0.25 + 0.5 * day, 0, 1),
      weights: { arrivalEdu: 0.3, companies: 0.6 + day, transfer: 0.5, sidewalk: 1 },
      inbound: 0.55,
    };
  }
  if (dow === 0) {
    // Sunday: closing at 13:00, then everyone walks back to EduCity and home.
    const closing = bump(hour, 12.5, 13.3, 14.5, 15.5);
    return {
      walkers: clamp((hour < 7 ? 0.08 : 0.3) + 0.6 * closing, 0, 1),
      groups: clamp(0.2 + 0.6 * closing, 0, 1),
      weights: { arrivalEdu: 0.4, companies: 0.4, transfer: 0.3 + 3 * closing, sidewalk: 1 },
      inbound: 0.35,
    };
  }
  return {
    walkers: hour < 7 || hour > 22 ? 0.1 : 0.4,
    groups: 0.15,
    weights: { arrivalEdu: 0.5, companies: 0.5, transfer: 0.3, sidewalk: 1 },
    inbound: 0.5,
  };
}

/** A walkable polyline with its cumulative lengths. */
export interface WalkPath {
  id: string;
  kind: keyof CrowdPlan["weights"];
  points: V3[];
  cum: number[];
  length: number;
}

export function makePath(id: string, kind: WalkPath["kind"], points: V3[]): WalkPath {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[2] - a[2]));
  }
  return { id, kind, points, cum, length: cum[cum.length - 1] };
}

/** Point and unit direction (x, z) at distance s along a path (clamped). */
export function pathAt(path: WalkPath, s: number, out: { p: V3; d: V2 } = { p: [0, 0, 0], d: [0, -1] }) {
  const { points, cum, length } = path;
  const t = clamp(s, 0, length);
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= t) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[Math.min(lo + 1, points.length - 1)];
  const seg = cum[Math.min(lo + 1, cum.length - 1)] - cum[lo];
  const k = seg > 1e-9 ? (t - cum[lo]) / seg : 0;
  out.p[0] = a[0] + (b[0] - a[0]) * k;
  out.p[1] = a[1] + (b[1] - a[1]) * k;
  out.p[2] = a[2] + (b[2] - a[2]) * k;
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const l = Math.hypot(dx, dz) || 1;
  out.d[0] = dx / l;
  out.d[1] = dz / l;
  return out;
}

/**
 * Where a walker is at time t: it walks the path (forward or back) at its
 * speed, then spends `pause` metres' worth of time out of sight (inside a
 * building, on a train) before it starts over. Returns the distance along the
 * path in walking direction, or null while it is out of sight.
 */
export function walkerDistance(length: number, speed: number, offset: number, t: number, pause: number): number | null {
  const cycle = length + pause;
  if (cycle <= 0) return null;
  const s = (((offset + speed * t) % cycle) + cycle) % cycle;
  return s <= length ? s : null;
}

/** Positions of a standing group: `n` people on a small circle facing its centre (deterministic). */
export function groupLayout(n: number, seed: number): { x: number; z: number; ry: number }[] {
  const rnd = mulberry32(seed);
  const radius = 0.48 + 0.12 * n + rnd() * 0.15;
  const start = rnd() * Math.PI * 2;
  const out: { x: number; z: number; ry: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * Math.PI * 2 + (rnd() - 0.5) * 0.5;
    const r = radius * (0.85 + rnd() * 0.3);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // Face the centre: forward (−z) rotated by ry points at (−x, −z).
    const ry = Math.atan2(x, z) + (rnd() - 0.5) * 0.4;
    out.push({ x, z, ry });
  }
  return out;
}

// ── Geometry ────────────────────────────────────────────────────────────────

interface Ring {
  y: number;
  /** Centre offset (x, z) and radii (x, z). */
  cx?: number;
  cz?: number;
  rx: number;
  rz: number;
}

type Rig = (p: THREE.Vector3) => [number, number, number];

interface PartOpts {
  slot: number;
  feature?: number;
  rig: Rig;
}

const fixed = (bone: number): Rig => () => [bone, bone, 0];

/** Vertical tube through elliptical rings (bottom → top); ends converge when `close`. */
function tube(rings: Ring[], segs: number, close: { bottom?: boolean; top?: boolean } = {}): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  for (const r of rings) {
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      pos.push((r.cx ?? 0) + Math.sin(a) * r.rx, r.y, (r.cz ?? 0) - Math.cos(a) * r.rz);
    }
  }
  const n = rings.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * segs + j;
      const b = i * segs + ((j + 1) % segs);
      const c = (i + 1) * segs + j;
      const d = (i + 1) * segs + ((j + 1) % segs);
      // Counter-clockwise seen from outside: normals face out.
      idx.push(a, d, b, a, c, d);
    }
  }
  if (close.bottom) {
    const r = rings[0];
    const ci = pos.length / 3;
    pos.push(r.cx ?? 0, r.y - Math.min(r.rx, r.rz) * 0.35, r.cz ?? 0);
    for (let j = 0; j < segs; j++) idx.push(ci, j, (j + 1) % segs);
  }
  if (close.top) {
    const r = rings[n - 1];
    const ci = pos.length / 3;
    pos.push(r.cx ?? 0, r.y + Math.min(r.rx, r.rz) * 0.35, r.cz ?? 0);
    const base = (n - 1) * segs;
    for (let j = 0; j < segs; j++) idx.push(ci, base + ((j + 1) % segs), base + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Scaled sphere (optionally a cap from the top), indexed. */
function blob(c: V3, r: V3, w: number, h: number, thetaLength = Math.PI): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, w, h, 0, Math.PI * 2, 0, thetaLength);
  g.deleteAttribute("uv");
  g.scale(r[0], r[1], r[2]);
  g.translate(c[0], c[1], c[2]);
  return g;
}

function box(c: V3, s: V3): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(s[0], s[1], s[2]);
  g.deleteAttribute("uv");
  g.translate(c[0], c[1], c[2]);
  return g;
}

/** Attach rig attributes and strip everything but position/normal. */
function rigged(g: THREE.BufferGeometry, o: PartOpts): THREE.BufferGeometry {
  const geo = g;
  for (const name of Object.keys(geo.attributes)) if (name !== "position" && name !== "normal") geo.deleteAttribute(name);
  if (!geo.getAttribute("normal")) geo.computeVertexNormals();
  const pos = geo.getAttribute("position");
  const rig = new Float32Array(pos.count * 4);
  const feat = new Float32Array(pos.count);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const [b1, b2, w] = o.rig(v);
    rig[i * 4] = b1;
    rig[i * 4 + 1] = b2;
    rig[i * 4 + 2] = w;
    rig[i * 4 + 3] = o.slot;
    feat[i] = o.feature ?? 0;
  }
  geo.setAttribute("aTwRig", new THREE.BufferAttribute(rig, 4));
  geo.setAttribute("aTwFeat", new THREE.BufferAttribute(feat, 1));
  if (!geo.index) {
    const index: number[] = [];
    for (let i = 0; i < pos.count; i++) index.push(i);
    geo.setIndex(index);
  }
  return geo;
}

/**
 * Baked ambient occlusion per vertex (aTwAO): inner legs and the crotch, the
 * inside of the arms and the flanks they shade, under the chin and jaw. Cheap
 * contact shading that keeps the figures from looking like flat mannequins.
 */
function bakeOcclusion(g: THREE.BufferGeometry): void {
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const rig = g.getAttribute("aTwRig");
  const ao = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = nor.getX(i);
    const ny = nor.getY(i);
    const bone = Math.round(rig.getX(i));
    const slot = Math.round(rig.getW(i));
    const inward = nx * Math.sign(x || 1) < -0.3;
    let k = 1;
    if (bone >= 1 && bone <= 6 && inward) k = Math.min(k, 0.62 + 0.38 * clamp((0.98 - y) / 0.75, 0, 1));
    if (y > 0.74 && y < 0.88 && Math.abs(x) < 0.16) k = Math.min(k, 0.72);
    if (bone >= 7 && bone <= 10 && inward && y > 0.95) k = Math.min(k, 0.6);
    if (bone === 0 && slot === SLOT.coat && Math.abs(x) > 0.14 && nx * Math.sign(x) > 0.45 && y > 1.0 && y < 1.39) k = Math.min(k, 0.7);
    if (slot === SLOT.skin && y > 1.44 && y < 1.56) k = Math.min(k, 0.62);
    if (slot === SLOT.skin && ny < -0.45 && y > 1.5) k = Math.min(k, 0.7);
    if (bone === 0 && y > 1.42 && y < 1.5 && slot === SLOT.coat) k = Math.min(k, 0.82);
    ao[i] = k;
  }
  g.setAttribute("aTwAO", new THREE.BufferAttribute(ao, 1));
}

const sstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Leg: thigh ↔ shin blend at the knee, thigh ↔ pelvis blend at the hip. */
function legRig(side: -1 | 1): Rig {
  const thigh = side < 0 ? BONE.thighL : BONE.thighR;
  const shin = side < 0 ? BONE.shinL : BONE.shinR;
  return (p) => {
    if (p.y > 0.86) return [thigh, BONE.torso, sstep(0.86, 0.97, p.y) * 0.65];
    if (p.y > 0.57) return [thigh, thigh, 0];
    return [thigh, shin, sstep(0.57, 0.44, p.y)];
  };
}

function armRig(side: -1 | 1): Rig {
  const upper = side < 0 ? BONE.armL : BONE.armR;
  const fore = side < 0 ? BONE.foreL : BONE.foreR;
  return (p) => {
    if (p.y > 1.36) return [upper, BONE.torso, sstep(1.36, 1.47, p.y) * 0.6];
    if (p.y > 1.18) return [upper, upper, 0];
    return [upper, fore, sstep(1.18, 1.08, p.y)];
  };
}

/**
 * Head: an ellipsoid shaped into a skull and face — narrower jaw and chin,
 * fuller back of the head, flatter face — centred at y 1.618.
 */
function sculptedHead(w: number, h: number): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, w, h);
  g.deleteAttribute("uv");
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    const y = p.getY(i);
    let z = p.getZ(i);
    // Jaw: the lower third narrows towards the chin, which comes forward a little.
    const jaw = clamp((-y - 0.2) / 0.8, 0, 1);
    x *= 1 - 0.3 * jaw;
    if (z < 0) z -= 0.08 * jaw * jaw;
    // Back of the head fuller above the nape, the face flatter.
    if (z > 0 && y > -0.35) z *= 1.07;
    if (z < -0.55) z = -0.55 + (z + 0.55) * 0.75;
    p.setXYZ(i, x * 0.077, y * 0.107 + 1.618, z * 0.094 - 0.004);
  }
  g.computeVertexNormals();
  return g;
}

/** Figure detail: "high" near the camera, "seated" for crowds at tables, "low" on phones. */
export type PersonDetail = "high" | "seated" | "low";

/** Segment counts per detail level (rings round the torso and limbs, head, shoes, hands). */
const DETAIL: Record<PersonDetail, { ring: number; limb: number; headW: number; headH: number; cap: [number, number]; ear: [number, number]; shoe: number; hand: [number, number]; thumb: boolean }> = {
  high: { ring: 11, limb: 8, headW: 12, headH: 9, cap: [12, 4], ear: [5, 3], shoe: 8, hand: [6, 4], thumb: true },
  seated: { ring: 8, limb: 5, headW: 9, headH: 7, cap: [9, 3], ear: [4, 2], shoe: 4, hand: [5, 3], thumb: false },
  low: { ring: 7, limb: 5, headW: 8, headH: 6, cap: [8, 2], ear: [0, 0], shoe: 5, hand: [4, 2], thumb: false },
};

/**
 * The procedural figure (rest pose, front −z, 1.75 m) with rig attributes:
 * aTwRig = (bone, bone2, weight2, slot), aTwFeat = feature id.
 */
export function buildPersonGeometry(detail: PersonDetail = "high", only?: readonly number[]): THREE.BufferGeometry {
  const D = DETAIL[detail];
  const { limb, ring } = D;
  const parts: THREE.BufferGeometry[] = [];
  // Optional parts not in `only` are left out (seated builders need no beanies or backpacks).
  const add = (g: THREE.BufferGeometry, o: PartOpts) => {
    if (only && o.feature && !only.includes(o.feature)) {
      g.dispose();
      return;
    }
    parts.push(rigged(g, o));
  };

  // Torso in a hip-length winter jacket: crotch → hem → chest → shoulders → collar.
  add(
    tube(
      [
        { y: 0.79, rx: 0.12, rz: 0.09 },
        { y: 0.84, rx: 0.175, rz: 0.125, cz: 0.005 },
        { y: 0.95, rx: 0.172, rz: 0.122 },
        { y: 1.06, rx: 0.163, rz: 0.115, cz: -0.004 },
        { y: 1.2, rx: 0.182, rz: 0.125, cz: -0.008 },
        { y: 1.33, rx: 0.2, rz: 0.122, cz: -0.004 },
        { y: 1.41, rx: 0.2, rz: 0.112 },
        { y: 1.465, rx: 0.15, rz: 0.088, cz: 0.005 },
        { y: 1.5, rx: 0.075, rz: 0.07, cz: 0.008 },
      ],
      ring,
      { bottom: true },
    ),
    { slot: SLOT.coat, rig: fixed(BONE.torso) },
  );
  // Trousers seat below the hem (visible under short jackets).
  add(
    tube(
      [
        { y: 0.76, rx: 0.15, rz: 0.1 },
        { y: 0.86, rx: 0.165, rz: 0.115 },
      ],
      ring,
      { bottom: true },
    ),
    { slot: SLOT.trousers, rig: fixed(BONE.torso) },
  );
  // Neck and head (head turns/nods on its own bone).
  const headRig: Rig = (p) => (p.y < 1.53 ? [BONE.head, BONE.torso, 0.5] : [BONE.head, BONE.head, 0]);
  add(
    tube(
      [
        { y: 1.47, rx: 0.052, rz: 0.055, cz: 0.012 },
        { y: 1.57, rx: 0.05, rz: 0.052, cz: 0.012 },
      ],
      limb,
    ),
    { slot: SLOT.skin, rig: headRig },
  );
  add(sculptedHead(D.headW, D.headH), { slot: SLOT.skin, rig: headRig });
  // Ears.
  if (D.ear[0] > 0) for (const side of [-1, 1]) add(blob([side * 0.076, 1.612, 0.008], [0.011, 0.027, 0.019], D.ear[0], D.ear[1]), { slot: SLOT.skin, rig: headRig });
  // Nose: a small wedge so the facing reads from afar.
  {
    const g = new THREE.ConeGeometry(0.016, 0.045, 4, 1);
    g.deleteAttribute("uv");
    g.rotateX(-Math.PI / 2 - 0.5);
    g.translate(0, 1.6, -0.098);
    add(g, { slot: SLOT.skin, rig: headRig });
  }
  // Hair: short cap (hairline higher at the front) and long hair down the back.
  {
    const g = blob([0, 0, 0], [0.084, 0.114, 0.101], D.cap[0], D.cap[1], Math.PI * 0.56);
    g.rotateX(0.32);
    g.translate(0, 1.628, 0.006);
    add(g, { slot: SLOT.hair, feature: FEATURE.hairShort, rig: headRig });
  }
  {
    const g = blob([0, 0, 0], [0.087, 0.117, 0.104], D.cap[0], D.cap[1], Math.PI * 0.62);
    g.rotateX(0.4);
    g.translate(0, 1.628, 0.008);
    add(g, { slot: SLOT.hair, feature: FEATURE.hairLong, rig: headRig });
    // Hair falling behind the neck onto the shoulders: wide and soft, thinning towards the ends.
    add(
      tube(
        [
          { y: 1.385, rx: 0.058, rz: 0.024, cz: 0.1 },
          { y: 1.43, rx: 0.078, rz: 0.034, cz: 0.09 },
          { y: 1.5, rx: 0.09, rz: 0.046, cz: 0.07 },
          { y: 1.57, rx: 0.092, rz: 0.058, cz: 0.045 },
          { y: 1.63, rx: 0.08, rz: 0.06, cz: 0.03 },
        ],
        limb,
        { bottom: true, top: true },
      ),
      { slot: SLOT.hair, feature: FEATURE.hairLong, rig: (p) => (p.y < 1.5 ? [BONE.torso, BONE.head, 0.45] : [BONE.head, BONE.head, 0]) },
    );
  }
  // Beanie with a turned-up brim.
  {
    const g = blob([0, 0, 0], [0.087, 0.118, 0.104], D.cap[0], D.cap[1], Math.PI * 0.5);
    g.rotateX(0.18);
    g.translate(0, 1.645, 0.004);
    add(g, { slot: SLOT.hat, feature: FEATURE.beanie, rig: headRig });
    add(
      tube(
        [
          { y: 1.63, rx: 0.088, rz: 0.104, cz: 0.012 },
          { y: 1.675, rx: 0.09, rz: 0.106, cz: 0.004 },
        ],
        ring,
      ),
      { slot: SLOT.hat, feature: FEATURE.beanie, rig: headRig },
    );
  }
  // Hood lying down behind the neck.
  add(blob([0, 1.475, 0.075], [0.13, 0.07, 0.075], 6, 4), { slot: SLOT.coat, feature: FEATURE.hood, rig: fixed(BONE.torso) });
  // Long coat: skirt to the knees, swinging partly with the thighs.
  add(
    tube(
      [
        { y: 0.56, rx: 0.205, rz: 0.15, cz: 0.012 },
        { y: 0.72, rx: 0.192, rz: 0.138, cz: 0.008 },
        { y: 0.88, rx: 0.177, rz: 0.127, cz: 0.005 },
      ],
      ring,
    ),
    {
      slot: SLOT.coat,
      feature: FEATURE.longCoat,
      rig: (p) => {
        const w = clamp((0.88 - p.y) / 0.32, 0, 1) * 0.55 * clamp(Math.abs(p.x) / 0.12, 0, 1);
        return [BONE.torso, p.x < 0 ? BONE.thighL : BONE.thighR, w];
      },
    },
  );
  // Scarf round the collar with a hanging end.
  add(
    tube(
      [
        { y: 1.44, rx: 0.1, rz: 0.085, cz: -0.004 },
        { y: 1.5, rx: 0.088, rz: 0.08, cz: 0.002 },
      ],
      ring,
    ),
    { slot: SLOT.scarf, feature: FEATURE.scarf, rig: fixed(BONE.torso) },
  );
  add(box([0.045, 1.33, -0.118], [0.075, 0.22, 0.025]), { slot: SLOT.scarf, feature: FEATURE.scarf, rig: fixed(BONE.torso) });
  // Backpack and shoulder bag (with its strap across the chest).
  add(box([0, 1.2, 0.19], [0.3, 0.4, 0.14]), { slot: SLOT.bag, feature: FEATURE.backpack, rig: fixed(BONE.torso) });
  add(box([0.255, 0.95, 0.01], [0.07, 0.24, 0.28]), { slot: SLOT.bag, feature: FEATURE.shoulderBag, rig: fixed(BONE.torso) });
  {
    const g = box([0, 0, 0], [0.04, 0.62, 0.012]);
    g.rotateZ(-0.62);
    g.translate(0.03, 1.2, -0.128);
    add(g, { slot: SLOT.bag, feature: FEATURE.shoulderBag, rig: fixed(BONE.torso) });
  }
  // Event lanyard and badge.
  {
    const g = box([0, 0, 0], [0.022, 0.24, 0.006]);
    g.rotateZ(0.32);
    g.translate(-0.035, 1.37, -0.122);
    add(g, { slot: SLOT.lanyard, feature: FEATURE.lanyard, rig: fixed(BONE.torso) });
    const h = box([0, 0, 0], [0.022, 0.24, 0.006]);
    h.rotateZ(-0.32);
    h.translate(0.035, 1.37, -0.122);
    add(h, { slot: SLOT.lanyard, feature: FEATURE.lanyard, rig: fixed(BONE.torso) });
    add(box([0, 1.215, -0.13], [0.075, 0.1, 0.006]), { slot: SLOT.badge, feature: FEATURE.lanyard, rig: fixed(BONE.torso) });
  }

  for (const side of [-1, 1] as const) {
    const x = side * HIP_X;
    // Leg in trousers: hip → knee → calf → ankle.
    add(
      tube(
        [
          { y: 0.07, cx: x, cz: 0.005, rx: 0.042, rz: 0.044 },
          { y: 0.2, cx: x, cz: 0.006, rx: 0.048, rz: 0.05 },
          { y: 0.36, cx: x, cz: 0.012, rx: 0.058, rz: 0.062 },
          { y: KNEE_Y, cx: x, cz: 0.0, rx: 0.06, rz: 0.062 },
          { y: 0.68, cx: x, cz: -0.004, rx: 0.074, rz: 0.08 },
          { y: 0.84, cx: x * 1.02, cz: 0.0, rx: 0.086, rz: 0.09 },
          { y: 0.96, cx: x * 0.9, cz: 0.004, rx: 0.088, rz: 0.088 },
        ],
        limb,
      ),
      { slot: SLOT.trousers, rig: legRig(side) },
    );
    // Shoe: lofted from the heel to a rounded, lower toe (sole at y = 0).
    {
      const g = tube(
        [
          { y: 0.0, rx: 0.034, rz: 0.034, cz: 0.044 },
          { y: 0.03, rx: 0.045, rz: 0.045, cz: 0.047 },
          { y: 0.12, rx: 0.049, rz: 0.044, cz: 0.044 },
          { y: 0.2, rx: 0.047, rz: 0.035, cz: 0.035 },
          { y: 0.25, rx: 0.039, rz: 0.027, cz: 0.028 },
          { y: 0.272, rx: 0.022, rz: 0.017, cz: 0.022 },
        ],
        D.shoe,
        { bottom: true, top: true },
      );
      // Length along −z (toe forward), height = the rings' z.
      g.rotateX(-Math.PI / 2);
      g.translate(x, 0, 0.075);
      add(g, { slot: SLOT.shoes, rig: fixed(side < 0 ? BONE.footL : BONE.footR) });
    }
    // Arm in a padded sleeve: shoulder → elbow → wrist; hand below.
    const sx = side * SHOULDER_X;
    const ex = side * ELBOW_X;
    const wx = side * 0.228;
    add(
      tube(
        [
          { y: 0.875, cx: wx, cz: -0.012, rx: 0.039, rz: 0.044 },
          { y: 1.0, cx: (wx + ex) / 2, cz: -0.004, rx: 0.046, rz: 0.05 },
          { y: ELBOW_Y, cx: ex, cz: 0.005, rx: 0.052, rz: 0.055 },
          { y: 1.28, cx: (ex + sx) / 2 + side * 0.006, cz: 0.004, rx: 0.06, rz: 0.062 },
          { y: 1.42, cx: sx, cz: 0.0, rx: 0.062, rz: 0.07 },
          { y: 1.47, cx: sx * 0.85, cz: 0.0, rx: 0.05, rz: 0.06 },
        ],
        limb,
      ),
      { slot: SLOT.coat, rig: armRig(side) },
    );
    // Hand (relaxed, fingers together) and thumb.
    const hand = fixed(side < 0 ? BONE.foreL : BONE.foreR);
    add(blob([side * 0.232, 0.81, -0.014], [0.024, 0.07, 0.042], D.hand[0], D.hand[1]), { slot: SLOT.skin, rig: hand });
    if (D.thumb) add(blob([side * 0.222, 0.832, -0.05], [0.013, 0.032, 0.014], 5, 3), { slot: SLOT.skin, rig: hand });
  }

  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("people: could not merge the figure");
  bakeOcclusion(merged);
  merged.computeBoundingSphere();
  merged.computeBoundingBox();
  return merged;
}

/**
 * Far figure (≈ 170 triangles) for people more than ~55 m away: same rig and
 * colour slots, simple tubes; head with a hair/hat cap (hair colour).
 */
export function buildPersonFarGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, o: PartOpts) => parts.push(rigged(g, o));
  add(
    tube(
      [
        { y: 0.78, rx: 0.13, rz: 0.09 },
        { y: 0.86, rx: 0.18, rz: 0.125 },
        { y: 1.2, rx: 0.185, rz: 0.125 },
        { y: 1.41, rx: 0.205, rz: 0.112 },
        { y: 1.5, rx: 0.07, rz: 0.066 },
      ],
      6,
      { bottom: true },
    ),
    { slot: SLOT.coat, rig: fixed(BONE.torso) },
  );
  add(blob([0, 1.6, -0.004], [0.08, 0.115, 0.095], 6, 4), { slot: SLOT.skin, rig: fixed(BONE.head) });
  {
    const g = blob([0, 0, 0], [0.087, 0.118, 0.103], 6, 2, Math.PI * 0.5);
    g.rotateX(0.25);
    g.translate(0, 1.632, 0.004);
    add(g, { slot: SLOT.hair, rig: fixed(BONE.head) });
  }
  for (const side of [-1, 1] as const) {
    const x = side * HIP_X;
    add(
      tube(
        [
          { y: 0.04, cx: x, cz: -0.03, rx: 0.05, rz: 0.08 },
          { y: KNEE_Y, cx: x, rx: 0.062, rz: 0.064 },
          { y: 0.95, cx: x * 0.9, rx: 0.088, rz: 0.088 },
        ],
        4,
      ),
      { slot: SLOT.trousers, rig: legRig(side) },
    );
    add(
      tube(
        [
          { y: 0.8, cx: side * 0.232, cz: -0.01, rx: 0.035, rz: 0.04 },
          { y: ELBOW_Y, cx: side * ELBOW_X, rx: 0.052, rz: 0.055 },
          { y: 1.46, cx: side * SHOULDER_X * 0.9, rx: 0.058, rz: 0.066 },
        ],
        4,
      ),
      { slot: SLOT.coat, rig: armRig(side) },
    );
  }
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("people: could not merge the far figure");
  bakeOcclusion(merged);
  merged.computeBoundingSphere();
  return merged;
}

// ── Shader (skinning + per-instance looks) ──────────────────────────────────

const VERTEX_PARS = /* glsl */ `
uniform float uTwTime;
attribute vec4 aTwRig;
attribute float aTwFeat;
attribute float aTwAO;
varying vec3 vTwLocal;
flat varying float vTwSlot;
flat varying vec4 vTwDetail;
#ifdef USE_INSTANCING
	attribute vec4 aTwAnim;
	attribute vec4 aTwLook0;
	attribute vec4 aTwLook1;
	attribute vec4 aTwLook2;
	#define TW_ANIM aTwAnim
	#define TW_LOOK0 aTwLook0
	#define TW_LOOK1 aTwLook1
	#define TW_LOOK2 aTwLook2
#else
	uniform vec4 uTwAnim;
	uniform vec4 uTwLook0;
	uniform vec4 uTwLook1;
	uniform vec4 uTwLook2;
	#define TW_ANIM uTwAnim
	#define TW_LOOK0 uTwLook0
	#define TW_LOOK1 uTwLook1
	#define TW_LOOK2 uTwLook2
#endif
uniform float uTwFreeze;
varying vec3 vTwCol;
varying float vTwRough;
varying float vTwSheen;

mat3 twRx( float a ) { float c = cos( a ), s = sin( a ); return mat3( 1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c ); }
mat3 twRy( float a ) { float c = cos( a ), s = sin( a ); return mat3( c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c ); }
mat3 twRz( float a ) { float c = cos( a ), s = sin( a ); return mat3( c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0 ); }
float twWrap( float a ) { return mod( a + 3.14159265, 6.28318531 ) - 3.14159265; }
float twKnee( float u ) {
	float swing = exp( -pow( twWrap( u + 0.75 ) / 0.72, 2.0 ) );
	float load = exp( -pow( twWrap( u - 2.05 ) / 0.5, 2.0 ) );
	return 0.06 + 1.02 * swing + 0.22 * load;
}
float twFoot( float u, float hip, float knee ) {
	// Flat on the ground through stance, toe up at heel strike, heel up at push-off.
	float stance = smoothstep( 1.75, 2.25, mod( u, 6.28318531 ) ) * ( 1.0 - smoothstep( 4.2, 4.75, mod( u, 6.28318531 ) ) );
	float push = exp( -pow( twWrap( u - 4.35 ) / 0.42, 2.0 ) );
	return mix( 0.16, knee - hip, stance ) - 0.55 * push;
}

struct TwPose {
	float hipL; float hipR; float kneeL; float kneeR; float footL; float footR;
	float armL; float armR; float elL; float elR; float armAbL; float armAbR;
	vec3 pelvis; float lean; float yaw; float roll; float nod; float turn;
};

TwPose twPose() {
	TwPose P;
	float pose = TW_ANIM.z;
	float seed = fract( TW_ANIM.x * 7.31 + TW_ANIM.w * 3.17 );
	float t = uTwTime * ( 1.0 - uTwFreeze );
	P.armAbL = 0.0; P.armAbR = 0.0; P.nod = 0.0; P.turn = 0.0; P.roll = 0.0;
	if ( pose < 0.5 ) {
		// Walk: phase from walked distance (rate = speed / stride).
		float u = 6.28318531 * ( TW_ANIM.x + t * TW_ANIM.y );
		float moving = step( 0.001, TW_ANIM.y );
		P.hipL = 0.36 * sin( u ) + 0.05;
		P.hipR = 0.36 * sin( u + 3.14159265 ) + 0.05;
		P.kneeL = twKnee( u );
		P.kneeR = twKnee( u + 3.14159265 );
		P.footL = twFoot( u, P.hipL, P.kneeL );
		P.footR = twFoot( u + 3.14159265, P.hipR, P.kneeR );
		P.armL = -0.3 * sin( u ) + 0.04;
		P.armR = 0.3 * sin( u ) + 0.04;
		P.elL = 0.22 + 0.22 * max( 0.0, -sin( u ) );
		P.elR = 0.22 + 0.22 * max( 0.0, sin( u ) );
		P.armAbL = 0.05; P.armAbR = 0.05;
		P.pelvis = vec3( 0.011 * sin( u ), 0.018 * cos( 2.0 * u ) - 0.008, 0.0 ) * moving;
		P.lean = 0.045 * moving;
		P.yaw = 0.06 * sin( u ) * moving;
		P.nod = 0.04;
		if ( moving < 0.5 ) {
			P.hipL = 0.0; P.hipR = 0.0; P.kneeL = 0.03; P.kneeR = 0.03; P.footL = -0.03; P.footR = -0.03;
			P.armL = 0.03; P.armR = 0.03; P.elL = 0.18; P.elR = 0.18;
		}
	} else if ( pose < 1.5 || pose > 2.5 ) {
		// Stand (and talk): weight on one leg, slow sway; talkers gesture with the right hand.
		float sway = sin( t * 0.45 + seed * 6.28 );
		float shift = step( 0.5, seed ) * 2.0 - 1.0;
		P.hipL = 0.02 + 0.05 * step( 0.0, shift ); P.hipR = 0.02 + 0.05 * step( shift, 0.0 );
		P.kneeL = 0.03 + 0.12 * step( 0.0, shift ); P.kneeR = 0.03 + 0.12 * step( shift, 0.0 );
		P.footL = P.kneeL - P.hipL; P.footR = P.kneeR - P.hipR;
		P.armL = 0.06; P.armR = 0.06; P.elL = 0.3 + 0.1 * seed; P.elR = 0.25 + 0.15 * seed;
		P.pelvis = vec3( 0.012 * shift + 0.006 * sway, -0.01, 0.0 );
		P.lean = 0.01; P.yaw = 0.05 * sway; P.roll = 0.012 * shift;
		P.nod = 0.05 + 0.04 * sin( t * 0.7 + seed * 9.0 ); P.turn = 0.12 * sin( t * 0.31 + seed * 4.0 );
		if ( pose > 2.5 ) {
			float g = sin( t * 1.7 + seed * 11.0 );
			P.armR = 0.42 + 0.12 * g; P.elR = 1.25 + 0.25 * sin( t * 2.3 + seed * 5.0 ); P.armAbR = 0.12;
			P.turn = 0.18 * sin( t * 0.5 + seed * 3.0 );
		}
	} else {
		// Sit (TW_ANIM.w = seat height above the floor): hands on the laptop, head down a little.
		float seat = TW_ANIM.w;
		float typing = sin( t * 9.0 + seed * 40.0 ) * 0.025;
		P.hipL = 1.46; P.hipR = 1.46; P.kneeL = 1.38 + 0.08 * seed; P.kneeR = 1.42 - 0.06 * seed;
		P.footL = P.kneeL - P.hipL; P.footR = P.kneeR - P.hipR;
		P.armL = 0.62 + 0.05 * seed; P.armR = 0.6; P.elL = 1.2 + typing; P.elR = 1.22 - typing;
		P.armAbL = 0.12; P.armAbR = 0.12;
		P.pelvis = vec3( 0.0, seat + 0.085 - 0.9, 0.04 );
		P.lean = 0.13 + 0.03 * sin( t * 0.35 + seed * 6.0 ); P.yaw = 0.06 * ( seed - 0.5 ); P.roll = 0.0;
		P.nod = 0.28 + 0.04 * sin( t * 0.5 + seed * 3.0 ); P.turn = 0.15 * ( seed - 0.5 );
	}
	return P;
}

// Rotate p about pivot c by m.
vec3 twRot( mat3 m, vec3 p, vec3 c ) { return m * ( p - c ) + c; }

void twBone( float bone, TwPose P, inout vec3 p, inout vec3 n ) {
	const vec3 hipC = vec3( 0.0, ${HIP_Y.toFixed(3)}, 0.0 );
	float side = 1.0;
	int b = int( bone + 0.5 );
	if ( b >= 1 && b <= 6 ) {
		// Legs hang from the pelvis (which bobs and sways, but does not lean with the torso).
		side = b <= 3 ? -1.0 : 1.0;
		vec3 hip = vec3( side * ${HIP_X.toFixed(3)}, ${HIP_Y.toFixed(3)}, 0.0 );
		vec3 knee = vec3( side * ${HIP_X.toFixed(3)}, ${KNEE_Y.toFixed(3)}, 0.0 );
		vec3 ankle = vec3( side * ${HIP_X.toFixed(3)}, ${ANKLE_Y.toFixed(3)}, 0.0 );
		float hipA = side < 0.0 ? P.hipL : P.hipR;
		float kneeA = side < 0.0 ? P.kneeL : P.kneeR;
		float footA = side < 0.0 ? P.footL : P.footR;
		int seg = b <= 3 ? b : b - 3;
		mat3 mh = twRx( hipA );
		if ( seg >= 3 ) { mat3 mf = twRx( footA ); p = twRot( mf, p, ankle ); n = mf * n; }
		if ( seg >= 2 ) { mat3 mk = twRx( -kneeA ); p = twRot( mk, p, knee ); n = mk * n; }
		p = twRot( mh, p, hip ); n = mh * n;
		mat3 my = twRy( P.yaw * 0.6 );
		p = twRot( my, p, hipC ) + P.pelvis; n = my * n;
		return;
	}
	if ( b >= 7 && b <= 10 ) {
		side = b <= 8 ? -1.0 : 1.0;
		vec3 sh = vec3( side * ${SHOULDER_X.toFixed(3)}, ${SHOULDER_Y.toFixed(3)}, 0.0 );
		vec3 el = vec3( side * ${ELBOW_X.toFixed(3)}, ${ELBOW_Y.toFixed(3)}, 0.0 );
		float armA = side < 0.0 ? P.armL : P.armR;
		float elA = side < 0.0 ? P.elL : P.elR;
		float abA = side < 0.0 ? P.armAbL : P.armAbR;
		if ( b == 8 || b == 10 ) { mat3 me = twRx( elA ); p = twRot( me, p, el ); n = me * n; }
		mat3 ms = twRz( side * abA ) * twRx( armA );
		p = twRot( ms, p, sh ); n = ms * n;
	}
	if ( b == 11 ) {
		vec3 neck = vec3( 0.0, ${NECK_Y.toFixed(3)}, 0.01 );
		mat3 mh = twRy( P.turn ) * twRx( -P.nod );
		p = twRot( mh, p, neck ); n = mh * n;
	}
	// Torso (and what hangs from it): lean, twist and roll about the hips, then the pelvis offset.
	mat3 mt = twRy( P.yaw ) * twRz( P.roll ) * twRx( -P.lean );
	p = twRot( mt, p, hipC ) + P.pelvis; n = mt * n;
}

bool twHidden() {
	if ( aTwFeat < 0.5 ) return false;
	int mask = int( TW_LOOK0.w + 0.5 );
	int f = int( aTwFeat + 0.5 ) - 1;
	return ( ( mask >> f ) & 1 ) == 0;
}

void twSkin( inout vec3 p, inout vec3 n ) {
	if ( twHidden() ) { p = vec3( 0.0 ); n = vec3( 0.0, 1.0, 0.0 ); return; }
	TwPose P = twPose();
	vec3 p1 = p; vec3 n1 = n;
	twBone( aTwRig.x, P, p1, n1 );
	if ( aTwRig.z > 0.001 ) {
		vec3 p2 = p; vec3 n2 = n;
		twBone( aTwRig.y, P, p2, n2 );
		p1 = mix( p1, p2, aTwRig.z );
		n1 = mix( n1, n2, aTwRig.z );
	}
	p = p1;
	n = normalize( n1 );
}
`;

/** Skin tones and accents as GLSL palettes (linear colours). */
function skinGlsl(): string {
  const cs = SKIN.map((h) => linear(h));
  const lines = cs.map((c, i) => `\tif ( k < ${i + 1}.0 ) return mix( vec3( ${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)} ), vec3( ${(cs[i + 1] ?? c).r.toFixed(4)}, ${(cs[i + 1] ?? c).g.toFixed(4)}, ${(cs[i + 1] ?? c).b.toFixed(4)} ), k - ${i}.0 );`);
  const acc = ACCENTS.map((h) => linear(h)).map((c, i) => `\tif ( i == ${i} ) return vec3( ${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)} );`);
  return /* glsl */ `
vec3 twSkinTone( float t ) {
	float k = clamp( t, 0.0, 0.999 ) * ${(cs.length - 1).toFixed(1)};
${lines.join("\n")}
	return vec3( 0.5 );
}
vec3 twAccent( float a ) {
	int i = int( mod( a, ${ACCENTS.length}.0 ) );
${acc.join("\n")}
	return vec3( 0.3 );
}
`;
}

const PERSON_DETAILS = /* glsl */ `
		{
			// Rest-pose details (move with the bones like a texture would).
			vec3 lp = vTwLocal;
			int slot = int( vTwSlot + 0.5 );
			if ( slot == 2 ) {
				if ( vTwDetail.x > 0.5 ) {
					float q = abs( fract( lp.y / 0.085 ) * 2.0 - 1.0 );
					diffuseColor.rgb *= 0.74 + 0.26 * smoothstep( 0.0, 0.4, q );
				}
				if ( lp.z < -0.05 && abs( lp.x ) < 0.0065 && lp.y > 0.82 && lp.y < 1.47 ) diffuseColor.rgb *= 0.5;
			} else if ( slot == 4 && lp.y < 0.024 ) {
				diffuseColor.rgb = mix( diffuseColor.rgb * 0.6, vec3( 0.72, 0.71, 0.68 ), vTwDetail.y );
			} else if ( slot == 0 && lp.y > 1.52 ) {
				// Subtle eye sockets, brows and lips: enough to read a face, never a mask.
				float front = 1.0 - smoothstep( -0.088, -0.06, lp.z );
				vec2 e = vec2( abs( lp.x ) - 0.03, ( lp.y - 1.626 ) * 1.8 );
				float eye = 1.0 - smoothstep( 0.004, 0.009, length( e ) );
				float brow = ( 1.0 - smoothstep( 0.002, 0.005, abs( lp.y - 1.646 + 0.12 * ( abs( lp.x ) - 0.03 ) * ( abs( lp.x ) - 0.03 ) * 40.0 ) ) ) * step( abs( lp.x ), 0.046 ) * step( 0.014, abs( lp.x ) );
				float mouth = ( 1.0 - smoothstep( 0.0015, 0.0035, abs( lp.y - 1.571 ) ) ) * step( abs( lp.x ), 0.019 );
				diffuseColor.rgb *= 1.0 - front * ( 0.38 * eye + 0.22 * brow + 0.18 * mouth );
			}
		}
`;

const VERTEX_COLOR = /* glsl */ `
	{
		int slot = int( aTwRig.w + 0.5 );
		float seed = fract( TW_ANIM.x * 3.7 + TW_ANIM.w * 1.3 );
		vec3 col = TW_LOOK0.rgb;
		float rough = 0.82;
		float sheen = 0.0;
		if ( slot == 0 ) { col = twSkinTone( TW_LOOK1.w ); rough = 0.62; }
		else if ( slot == 1 ) { col = TW_LOOK2.rgb; rough = 0.68; sheen = 0.3; }
		else if ( slot == 2 ) { col = TW_LOOK0.rgb; rough = fract( TW_LOOK2.w * 0.37 ) > 0.55 ? 0.48 : 0.86; }
		else if ( slot == 3 ) { col = TW_LOOK1.rgb; rough = 0.9; }
		else if ( slot == 4 ) { float s = fract( seed * 5.3 ); col = s < 0.55 ? vec3( 0.018 ) : s < 0.75 ? vec3( 0.06, 0.04, 0.03 ) : s < 0.9 ? vec3( 0.12 ) : vec3( 0.62, 0.62, 0.6 ); rough = 0.55; }
		else if ( slot == 5 ) { col = twAccent( TW_LOOK2.w + 2.0 ); rough = 0.95; }
		else if ( slot == 6 ) { col = twAccent( TW_LOOK2.w ); rough = 0.95; }
		else if ( slot == 7 ) { col = vec3( 0.025, 0.026, 0.03 ) + 0.05 * fract( seed * 13.0 ); rough = 0.7; }
		else if ( slot == 8 ) { col = uTwLanyard; rough = 0.6; }
		else { col = vec3( 0.85 ); rough = 0.4; }
		vTwCol = col * aTwAO;
		vTwRough = rough;
		vTwSheen = sheen;
		vTwLocal = position;
		vTwSlot = aTwRig.w;
		// Fragment details: puffer quilting, sneaker soles, hair colour (brows).
		bool puffer = slot == 2 && fract( TW_LOOK2.w * 0.37 ) > 0.55;
		float sole = fract( seed * 5.3 ) > 0.6 ? 1.0 : 0.0;
		vTwDetail = vec4( puffer ? 1.0 : 0.0, sole, dot( TW_LOOK2.rgb, vec3( 0.3, 0.59, 0.11 ) ), 0.0 );
	}
`;

/** Per-object look and animation of a single (non-instanced) figure. */
export interface SingleUniforms {
  uTwAnim: THREE.IUniform<THREE.Vector4>;
  uTwLook0: THREE.IUniform<THREE.Vector4>;
  uTwLook1: THREE.IUniform<THREE.Vector4>;
  uTwLook2: THREE.IUniform<THREE.Vector4>;
}

export interface PersonMaterials {
  material: THREE.MeshStandardMaterial;
  depth: THREE.MeshDepthMaterial;
  uniforms: { uTwTime: THREE.IUniform<number>; uTwFreeze: THREE.IUniform<number> };
  /** Only for `instanced: false`. */
  single?: SingleUniforms;
}

/**
 * Material pair (colour + shadow depth) that skins the figure. `instanced`
 * reads the per-person attributes; otherwise the uniforms uTwAnim/uTwLook*
 * (the tour avatar).
 */
export function makePersonMaterials(opts: { instanced: boolean; lanyard?: THREE.ColorRepresentation } = { instanced: true }): PersonMaterials {
  const uniforms = { uTwTime: { value: 0 }, uTwFreeze: { value: 0 } };
  const single: SingleUniforms | undefined = opts.instanced
    ? undefined
    : {
        uTwAnim: { value: new THREE.Vector4(0, 0, POSE.stand, 0) },
        uTwLook0: { value: new THREE.Vector4(0.2, 0.2, 0.2, 0) },
        uTwLook1: { value: new THREE.Vector4(0.1, 0.1, 0.1, 0.3) },
        uTwLook2: { value: new THREE.Vector4(0.1, 0.08, 0.06, 0) },
      };
  const lanyard = { value: new THREE.Color(opts.lanyard ?? EVENT_VIOLET) };
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 });
  material.name = "people";
  const skin = skinGlsl();
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, single ?? {}, { uTwLanyard: lanyard });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\nuniform vec3 uTwLanyard;\n${VERTEX_PARS}\n${skin}`)
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>\n\t{ vec3 twP = position; twSkin( twP, objectNormal ); }`,
      )
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n\t{ vec3 twN = vec3( 0.0, 1.0, 0.0 ); twSkin( transformed, twN ); }\n${VERTEX_COLOR}`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying vec3 vTwCol;\nvarying float vTwRough;\nvarying float vTwSheen;\nvarying vec3 vTwLocal;\nflat varying float vTwSlot;\nflat varying vec4 vTwDetail;",
      )
      .replace("#include <color_fragment>", `#include <color_fragment>\n\tdiffuseColor.rgb = vTwCol;\n${PERSON_DETAILS}`)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n\troughnessFactor = vTwRough;");
  };
  material.customProgramCacheKey = () => `tw-person-${opts.instanced ? "i" : "s"}`;

  const depth = new THREE.MeshDepthMaterial();
  depth.name = "people-depth";
  depth.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, single ?? {}, { uTwLanyard: lanyard });
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\nuniform vec3 uTwLanyard;\n${VERTEX_PARS}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n\t{ vec3 twN = vec3( 0.0, 1.0, 0.0 ); twSkin( transformed, twN ); }`);
  };
  depth.customProgramCacheKey = () => `tw-person-depth-${opts.instanced ? "i" : "s"}`;
  return { material, depth, uniforms, single };
}

// ── Looks ────────────────────────────────────────────────────────────────────

export interface Look {
  coat: THREE.Color;
  trousers: THREE.Color;
  hair: THREE.Color;
  /** 0 (light) … 1 (dark). */
  skin: number;
  /** Accent palette index (scarf, beanie) — also picks a glossy (puffer) coat. */
  accent: number;
  features: number;
  /** Uniform scale (height) and girth. */
  height: number;
  girth: number;
}

/** A deterministic winter look. `lanyard` = share of people wearing the event lanyard. */
export function randomLook(rnd: () => number, opts: { lanyard?: number; backpack?: number } = {}): Look {
  const female = rnd() < 0.42;
  let features = 0;
  const hat = rnd();
  if (hat < 0.3) features |= bit(FEATURE.beanie);
  else features |= bit(female && rnd() < 0.6 ? FEATURE.hairLong : FEATURE.hairShort);
  if (rnd() < (female ? 0.4 : 0.22)) features |= bit(FEATURE.longCoat);
  else if (rnd() < 0.35) features |= bit(FEATURE.hood);
  if (rnd() < 0.28) features |= bit(FEATURE.scarf);
  const carry = rnd();
  if (carry < (opts.backpack ?? 0.32)) features |= bit(FEATURE.backpack);
  else if (carry < (opts.backpack ?? 0.32) + 0.15) features |= bit(FEATURE.shoulderBag);
  if (rnd() < (opts.lanyard ?? 0)) features |= bit(FEATURE.lanyard);
  const skinR = rnd();
  const skin = skinR < 0.78 ? rnd() * 0.32 : skinR < 0.92 ? 0.3 + rnd() * 0.3 : 0.6 + rnd() * 0.4;
  const hairPick = skin > 0.45 ? Math.floor(rnd() * 3) : Math.floor(rnd() * HAIR.length);
  const height = female ? 0.93 + rnd() * 0.07 : 0.97 + rnd() * 0.08;
  return {
    coat: linear(COATS[Math.floor(rnd() * COATS.length)]),
    trousers: linear(TROUSERS[Math.floor(rnd() * TROUSERS.length)]),
    hair: linear(HAIR[hairPick]),
    skin,
    accent: Math.floor(rnd() * ACCENTS.length),
    features,
    height,
    girth: female ? 0.92 + rnd() * 0.08 : 0.97 + rnd() * 0.1,
  };
}

// ── Instanced crowds ─────────────────────────────────────────────────────────

interface InstanceAttrs {
  anim: THREE.InstancedBufferAttribute;
  look0: THREE.InstancedBufferAttribute;
  look1: THREE.InstancedBufferAttribute;
  look2: THREE.InstancedBufferAttribute;
}

function instanceAttrs(geometry: THREE.BufferGeometry, count: number): InstanceAttrs {
  const make = (name: string) => {
    const a = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4);
    a.setUsage(THREE.StaticDrawUsage);
    geometry.setAttribute(name, a);
    return a;
  };
  return { anim: make("aTwAnim"), look0: make("aTwLook0"), look1: make("aTwLook1"), look2: make("aTwLook2") };
}

function writeLook(a: InstanceAttrs, i: number, look: Look) {
  a.look0.setXYZW(i, look.coat.r, look.coat.g, look.coat.b, look.features);
  a.look1.setXYZW(i, look.trousers.r, look.trousers.g, look.trousers.b, look.skin);
  a.look2.setXYZW(i, look.hair.r, look.hair.g, look.hair.b, look.accent);
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);

function composeAt(out: THREE.Matrix4, x: number, y: number, z: number, ry: number, look: Pick<Look, "height" | "girth">) {
  _q.setFromAxisAngle(_yAxis, ry);
  _s.set(look.height * look.girth, look.height, look.height * look.girth);
  _p.set(x, y, z);
  return out.compose(_p, _q, _s);
}

/** A seat for placeSeatedPeople: (x, y, z) = floor under the seat centre; ry = facing (0 = −z). */
export interface Seat {
  x: number;
  y: number;
  z: number;
  ry: number;
  /** Seat height above y (default 0.46; bar stools ≈ 0.7). */
  h?: number;
}

/**
 * Builders sitting at the build tables (for the building modules). Adds one
 * InstancedMesh to `group` (seats in the group's frame) and returns it; the
 * caller's dispose (disposeDeep) frees it. Occupancy (share of seats taken,
 * default 0.7) scales with the tier. Typing motion only while frames render
 * anyway (no continuous rendering is requested) and never with reduced motion.
 */
export function placeSeatedPeople(
  group: THREE.Group,
  seats: readonly Seat[],
  ctx: TwinContext,
  opts: { occupancy?: number; seed?: number; lanyard?: number } = {},
): THREE.InstancedMesh | null {
  const occupancy = clamp((opts.occupancy ?? 0.7) * (ctx.tier === "low" ? 0.6 : ctx.tier === "high" ? 0.85 : 1), 0, 1);
  const rnd = mulberry32(opts.seed ?? 4711);
  const taken = seats.filter(() => rnd() < occupancy);
  if (!taken.length) return null;
  // Indoors and seated: no beanies, hoods, long coats, backpacks or bags (lighter figure).
  const geometry = buildPersonGeometry(ctx.tier === "low" ? "low" : "seated", [FEATURE.hairShort, FEATURE.hairLong, FEATURE.lanyard, FEATURE.scarf]);
  const attrs = instanceAttrs(geometry, taken.length);
  const mats = makePersonMaterials({ instanced: true });
  const mesh = new THREE.InstancedMesh(geometry, mats.material, taken.length);
  mesh.name = "seated-people";
  // Posed in the vertex shader: override passes (GTAO normals) would draw them standing in bind pose.
  mesh.userData.noAO = true;
  mesh.customDepthMaterial = mats.depth;
  mesh.castShadow = ctx.tier !== "low";
  mesh.receiveShadow = true;
  taken.forEach((seat, i) => {
    const look = randomLook(rnd, { lanyard: opts.lanyard ?? 0.55, backpack: 0 });
    // Seated: no long coats (jackets come off indoors), lanyards on.
    look.features &= bit(FEATURE.hairShort) | bit(FEATURE.hairLong) | bit(FEATURE.lanyard) | bit(FEATURE.scarf);
    if (!(look.features & (bit(FEATURE.hairShort) | bit(FEATURE.hairLong)))) look.features |= bit(FEATURE.hairShort);
    // Indoors: lighter tops (sweaters, hoodies, shirts).
    look.coat = linear(["#2b2d31", "#3a3f46", "#5b6470", "#7b8794", "#a7adb3", "#d8d6d0", "#1f2a3a", "#4a3f35", "#6e2f2f", "#2f4a3a"][Math.floor(rnd() * 10)]);
    look.height *= 1;
    writeLook(attrs, i, look);
    attrs.anim.setXYZW(i, rnd(), 0, POSE.sit, seat.h ?? 0.46);
    composeAt(_m, seat.x, seat.y, seat.z, seat.ry, look);
    mesh.setMatrixAt(i, _m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mats.uniforms.uTwFreeze.value = ctx.reducedMotion ? 1 : 0;
  const t0 = performance.now();
  mesh.onBeforeRender = () => {
    mats.uniforms.uTwTime.value = (performance.now() - t0) / 1000;
  };
  group.add(mesh);
  return mesh;
}

/**
 * The tour walker: a person in the Since AI violet jacket with an event
 * lanyard, a soft violet ring on the ground so it reads from afar. Front = −z,
 * feet at y = 0 (the engine sets position and rotation every frame). The walk
 * cycle advances with the distance it is moved, so it stops when it stops.
 */
export function makeWalkerAvatar(ctx: TwinContext): THREE.Object3D {
  const group = new THREE.Group();
  group.name = "tour-walker";
  const geometry = buildPersonGeometry("high");
  const mats = makePersonMaterials({ instanced: false, lanyard: "#ffffff" });
  const single = mats.single;
  if (single) {
    const violet = new THREE.Color(EVENT_VIOLET_STRONG);
    const features = bit(FEATURE.hairShort) | bit(FEATURE.lanyard) | bit(FEATURE.backpack);
    single.uTwLook0.value.set(violet.r, violet.g, violet.b, features);
    const jeans = linear("#2a3446");
    single.uTwLook1.value.set(jeans.r, jeans.g, jeans.b, 0.18);
    const hair = linear("#3a2a1e");
    single.uTwLook2.value.set(hair.r, hair.g, hair.b, 5);
    single.uTwAnim.value.set(0, 0, POSE.walk, 0);
  }
  const body = new THREE.Mesh(geometry, mats.material);
  body.name = "tour-walker-body";
  // Animated in the vertex shader: keep it out of override passes (GTAO normals).
  body.userData.noAO = true;
  body.customDepthMaterial = mats.depth;
  body.castShadow = true;
  body.receiveShadow = true;
  // Stride-locked walk: phase from the distance moved since the last frame.
  const last = new THREE.Vector3(NaN, 0, 0);
  const now = new THREE.Vector3();
  let phase = 0;
  let speed = 0;
  let lastT = performance.now();
  body.onBeforeRender = () => {
    if (!single) return;
    group.getWorldPosition(now);
    const t = performance.now();
    const dt = Math.min(0.1, (t - lastT) / 1000);
    lastT = t;
    if (Number.isFinite(last.x)) {
      const d = Math.hypot(now.x - last.x, now.z - last.z);
      if (d < 3) {
        phase = (phase + d / STRIDE_M) % 1;
        const v = dt > 0 ? d / dt : 0;
        speed += (v - speed) * Math.min(1, dt * 6);
      }
    }
    last.copy(now);
    const moving = !ctx.reducedMotion && speed > 0.15;
    // uTwTime stays 0 for the avatar: the phase alone sets the pose; rate > 0 only marks "walking".
    single.uTwAnim.value.set(phase, moving ? 1 : 0, POSE.walk, 0);
  };
  group.add(body);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.42, 0.55, 48),
    new THREE.MeshBasicMaterial({ color: EVENT_VIOLET, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.renderOrder = 2;
  ring.name = "tour-walker-ring";
  group.add(ring);
  return group;
}

// ── The pedestrians module ──────────────────────────────────────────────────

interface Walker {
  path: number;
  forward: boolean;
  speed: number;
  offset: number;
  lateral: number;
  pause: number;
  look: Look;
}

interface StandingGroup {
  at: V3;
  members: { x: number; z: number; ry: number; look: Look; pose: number }[];
  /** Earliest share of crowdPlan().groups at which this group is out. */
  rank: number;
}

/** Event hot spots for standing groups (y from the route data / terrain). */
const GROUP_SPOTS: { at: V2; n: number; id: string }[] = [
  { id: "edu-east", at: [207.5, 139.2], n: 5 },
  { id: "edu-east-2", at: [200.2, 141.0], n: 3 },
  { id: "edu-west", at: [172.8, 112.6], n: 4 },
  { id: "edu-west-2", at: [169.5, 116.8], n: 3 },
  { id: "edu-deck", at: [160.0, 99.0], n: 3 },
  { id: "edu-b", at: [241.0, 112.5], n: 3 },
  { id: "bio-event", at: [26.6, -9.6], n: 4 },
  { id: "bio-event-2", at: [30.4, -5.2], n: 3 },
  { id: "jussin-aukio", at: [48.5, 6.5], n: 4 },
  { id: "jussin-aukio-2", at: [56.0, 13.0], n: 2 },
  { id: "bio-tyk-door", at: [-27.6, -13.4], n: 2 },
  { id: "bus-870", at: [103.2, -158.9], n: 3 },
  { id: "station-platform", at: [214.5, -105.0], n: 4 },
  { id: "parkcity-door", at: [212.5, 9.5], n: 2 },
];

/** Pedestrian paths: outdoor route legs (with their own heights) and the campus sidewalks. */
function collectPaths(routes: RoutesData | null, campus: CampusData | null, terrain: Terrain | null): WalkPath[] {
  const out: WalkPath[] = [];
  const kindOf = (id: string): WalkPath["kind"] =>
    id.startsWith("out-xfer") || id === "out-c-deck"
      ? "transfer"
      : id.startsWith("out-co-") || id === "out-e-sw1" || id === "out-x-st-bio" || id === "out-d" || id === "out-f-yard-tower"
        ? "companies"
        : id.startsWith("out-arr-") || id === "out-a2-gw" || id === "out-b-sw2-gw" || id === "out-parkcity-gw-zebra"
          ? "arrivalEdu"
          : "sidewalk";
  if (routes) {
    for (const [id, leg] of Object.entries(routes.legs)) {
      if (leg.mode !== "outdoor" || leg.reverseOf || leg.points.length < 2 || leg.lengthM < 12) continue;
      out.push(makePath(id, kindOf(id), leg.points.map((p) => [p[0], p[1], p[2]] as V3)));
    }
  }
  if (campus) {
    const h = (x: number, z: number) => (terrain ? terrain.heightAt(x, z) : 0);
    for (const r of campus.roads) {
      if (r.kind !== "footway" && r.kind !== "pedestrian" && r.kind !== "path") continue;
      if (r.footway === "crossing" || r.bridge || r.tunnel || (r.layer ?? 0) !== 0 || r.covered) continue;
      const pts = r.centerline.filter(([x, z]) => x > -150 && x < 330 && z > -200 && z < 260);
      if (pts.length < 2) continue;
      // Densify to ≤ 2 m so heights follow the terrain.
      const dense: V3[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x, z] = pts[i];
        if (i > 0) {
          const [px, pz] = pts[i - 1];
          const d = Math.hypot(x - px, z - pz);
          const n = Math.floor(d / 2);
          for (let k = 1; k <= n; k++) {
            const t = k / (n + 1);
            const qx = px + (x - px) * t;
            const qz = pz + (z - pz) * t;
            dense.push([qx, h(qx, qz), qz]);
          }
        }
        dense.push([x, h(x, z), z]);
      }
      const p = makePath(r.id, "sidewalk", dense);
      if (p.length >= 15) out.push(p);
    }
  }
  return out;
}

/** Pool sizes per tier (walkers on paths, people in standing groups). */
export function crowdBudget(tier: Tier): { walkers: number; standing: number } {
  const s = TIER_SETTINGS[tier].instanceScale;
  return { walkers: Math.round(170 * s), standing: Math.round(52 * Math.max(s, 0.5)) };
}

/** Near and far instanced figures, refilled every update with the people in view (no hidden slots). */
class CrowdMeshes {
  readonly near: THREE.InstancedMesh;
  readonly far: THREE.InstancedMesh;
  /** Everyone again as the simple figure, drawn only into shadow maps (cheap walking shadows). */
  readonly shadow: THREE.InstancedMesh;
  private nearAttrs: InstanceAttrs;
  private farAttrs: InstanceAttrs;
  private shadowAttrs: InstanceAttrs;
  private nNear = 0;
  private nFar = 0;
  private nShadow = 0;
  private readonly sphere = new THREE.Sphere();

  constructor(
    nearGeometry: THREE.BufferGeometry,
    farGeometry: THREE.BufferGeometry,
    readonly mats: PersonMaterials,
    private capacity: number,
    shadows: boolean,
  ) {
    this.nearAttrs = instanceAttrs(nearGeometry, capacity);
    this.farAttrs = instanceAttrs(farGeometry, capacity);
    const shadowGeometry = farGeometry.clone();
    this.shadowAttrs = instanceAttrs(shadowGeometry, capacity);
    for (const a of [...Object.values(this.nearAttrs), ...Object.values(this.farAttrs), ...Object.values(this.shadowAttrs)]) a.setUsage(THREE.DynamicDrawUsage);
    this.near = new THREE.InstancedMesh(nearGeometry, mats.material, capacity);
    this.far = new THREE.InstancedMesh(farGeometry, mats.material, capacity);
    const shadowMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    shadowMat.name = "pedestrian-shadows";
    this.shadow = new THREE.InstancedMesh(shadowGeometry, shadowMat, capacity);
    this.near.name = "pedestrians-near";
    this.far.name = "pedestrians-far";
    this.shadow.name = "pedestrian-shadows";
    for (const m of [this.near, this.far, this.shadow]) {
      // Skinned in the vertex shader: override passes (GTAO normals) would draw them in bind pose.
      m.userData.noAO = true;
      m.customDepthMaterial = mats.depth;
      m.receiveShadow = true;
      // Instances move every frame across the whole campus: skip the (stale) bounding sphere test.
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.count = 0;
    }
    // Shadows from the simple figure only (the detailed one would be drawn again per cascade).
    this.near.castShadow = false;
    this.far.castShadow = false;
    this.shadow.castShadow = shadows;
    this.shadow.receiveShadow = false;
    this.shadow.visible = shadows;
  }

  begin() {
    this.nNear = 0;
    this.nFar = 0;
    this.nShadow = 0;
  }

  push(matrix: THREE.Matrix4, looks: Float32Array, anims: Float32Array, person: number, distance: number) {
    const nearSlot = distance < NEAR_M;
    if (nearSlot ? this.nNear >= this.capacity : this.nFar >= this.capacity) return;
    const write = (mesh: THREE.InstancedMesh, a: InstanceAttrs, i: number) => {
      mesh.setMatrixAt(i, matrix);
      const l = person * 12;
      a.look0.setXYZW(i, looks[l], looks[l + 1], looks[l + 2], looks[l + 3]);
      a.look1.setXYZW(i, looks[l + 4], looks[l + 5], looks[l + 6], looks[l + 7]);
      a.look2.setXYZW(i, looks[l + 8], looks[l + 9], looks[l + 10], looks[l + 11]);
      const k = person * 4;
      a.anim.setXYZW(i, anims[k], anims[k + 1], anims[k + 2], anims[k + 3]);
    };
    if (nearSlot) write(this.near, this.nearAttrs, this.nNear++);
    else write(this.far, this.farAttrs, this.nFar++);
    // Shadows only near the camera (a figure's shadow beyond ≈ 90 m is a few pixels).
    if (distance < 90 && this.nShadow < this.capacity) write(this.shadow, this.shadowAttrs, this.nShadow++);
  }

  end() {
    this.near.count = this.nNear;
    this.far.count = this.nFar;
    this.shadow.count = this.nShadow;
    for (const [mesh, a, n] of [
      [this.near, this.nearAttrs, this.nNear],
      [this.far, this.farAttrs, this.nFar],
      [this.shadow, this.shadowAttrs, this.nShadow],
    ] as const) {
      mesh.instanceMatrix.clearUpdateRanges();
      mesh.instanceMatrix.addUpdateRange(0, Math.max(n, 1) * 16);
      mesh.instanceMatrix.needsUpdate = true;
      for (const attr of Object.values(a)) {
        attr.clearUpdateRanges();
        attr.addUpdateRange(0, Math.max(n, 1) * 4);
        attr.needsUpdate = true;
      }
    }
  }

  /** Distance to the nearest person on screen (Infinity when none). */
  nearestVisible(frustum: THREE.Frustum, cam: THREE.Vector3): number {
    let best = Infinity;
    for (const [mesh, n] of [
      [this.near, this.nNear],
      [this.far, this.nFar],
    ] as const) {
      for (let i = 0; i < n; i += mesh === this.far ? 3 : 1) {
        mesh.getMatrixAt(i, _m);
        this.sphere.center.setFromMatrixPosition(_m);
        this.sphere.radius = 1.2;
        if (!frustum.intersectsSphere(this.sphere)) continue;
        best = Math.min(best, this.sphere.center.distanceTo(cam));
      }
    }
    return best;
  }
}

/** People nearer than this get the detailed figure (beyond, a person is < 50 px tall on a laptop). */
const NEAR_M = 38;

export async function buildPeople(ctx: TwinContext): Promise<WorldModule> {
  const [campus, routes, terrain] = await Promise.all([
    loadCampus().catch(() => null),
    loadRoutes().catch(() => null),
    loadTerrain().catch(() => null),
  ]);
  const root = new THREE.Group();
  root.name = "people";
  const heightAt = (x: number, z: number) => (terrain ? terrain.heightAt(x, z) : 0);
  const paths = collectPaths(routes, campus, terrain);
  const budget = crowdBudget(ctx.tier);
  const rnd = mulberry32(hashString("people-2026"));

  // Walkers: a fixed pool; crowdPlan() decides how many are out and on which paths.
  const walkers: Walker[] = [];
  for (let i = 0; i < budget.walkers; i++) {
    walkers.push({
      path: 0,
      forward: true,
      speed: 1.12 + rnd() * 0.42,
      offset: rnd() * 1000,
      lateral: 0.35 + rnd() * 0.75,
      pause: 40 + rnd() * 160,
      look: randomLook(rnd, { lanyard: 0.35, backpack: 0.4 }),
    });
  }
  // Standing groups at the event spots (y from the nearest route point within 4 m, else the terrain).
  const routePts: V3[] = paths.filter((p) => p.kind !== "sidewalk").flatMap((p) => p.points);
  const yAt = (x: number, z: number) => {
    let best = Infinity;
    let y = heightAt(x, z);
    for (const p of routePts) {
      const d = Math.hypot(p[0] - x, p[2] - z);
      if (d < best) {
        best = d;
        if (d < 4) y = p[1];
      }
    }
    return y;
  };
  const buildingRings = (campus?.buildings ?? []).filter((b) => !(b.minHeight && b.minHeight > 2)).map((b) => ({ ring: b.polygon, box: polygonBounds(b.polygon) }));
  const insideBuilding = (x: number, z: number) =>
    buildingRings.some((b) => x >= b.box.minX && x <= b.box.maxX && z >= b.box.minZ && z <= b.box.maxZ && pointInRing([x, z], b.ring));
  const groups: StandingGroup[] = [];
  let standingCount = 0;
  for (const spot of GROUP_SPOTS) {
    if (standingCount >= budget.standing) break;
    const n = Math.min(spot.n, budget.standing - standingCount);
    const layout = groupLayout(n, hashString(spot.id));
    const grnd = mulberry32(hashString(spot.id) ^ 0x9e3779b9);
    const members = layout
      .filter((m) => !insideBuilding(spot.at[0] + m.x, spot.at[1] + m.z))
      .map((m, k) => ({ ...m, look: randomLook(grnd, { lanyard: 0.6, backpack: 0.35 }), pose: k === 0 || grnd() < 0.3 ? POSE.talk : POSE.stand }));
    standingCount += members.length;
    groups.push({ at: [spot.at[0], yAt(spot.at[0], spot.at[1]), spot.at[1]], members, rank: grnd() });
  }

  // Everyone's look and animation, packed as the instance attributes expect (persons = walkers, then groups).
  const persons = walkers.length + standingCount;
  const lookData = new Float32Array(Math.max(persons, 1) * 12);
  const animData = new Float32Array(Math.max(persons, 1) * 4);
  const setPerson = (i: number, look: Look, anim: [number, number, number, number]) => {
    lookData.set([look.coat.r, look.coat.g, look.coat.b, look.features, look.trousers.r, look.trousers.g, look.trousers.b, look.skin, look.hair.r, look.hair.g, look.hair.b, look.accent], i * 12);
    animData.set(anim, i * 4);
  };
  walkers.forEach((w, i) => setPerson(i, w.look, [rnd(), w.speed / STRIDE_M, POSE.walk, rnd()]));
  {
    let k = walkers.length;
    for (const g of groups) for (const m of g.members) setPerson(k++, m.look, [rnd(), 0, m.pose, rnd()]);
  }

  // Two instanced figures share one material: detailed near the camera, simple beyond NEAR_M.
  const crowd = new CrowdMeshes(
    buildPersonGeometry(ctx.tier === "low" ? "low" : "high"),
    buildPersonFarGeometry(),
    makePersonMaterials({ instanced: true }),
    Math.max(persons, 1),
    // Phones: no walking shadows (one more shadow pass per cascade).
    ctx.tier !== "low",
  );
  const mats = crowd.mats;
  root.add(crowd.near, crowd.far, crowd.shadow);
  mats.uniforms.uTwFreeze.value = ctx.reducedMotion ? 1 : 0;

  // Assign walkers to paths for a time of day (deterministic per time).
  let plan = crowdPlan(ctx.lighting().iso);
  let activeWalkers = 0;
  const assign = () => {
    const weights = paths.map((p) => plan.weights[p.kind] * Math.sqrt(Math.max(p.length, 1)));
    const sum = weights.reduce((acc, w) => acc + w, 0);
    const prnd = mulberry32(hashString(`assign-${plan.walkers.toFixed(2)}-${plan.inbound.toFixed(2)}`));
    activeWalkers = Math.round(walkers.length * plan.walkers);
    for (const w of walkers) {
      let r = prnd() * sum;
      let pick = 0;
      for (let j = 0; j < weights.length; j++) {
        r -= weights[j];
        if (r <= 0) {
          pick = j;
          break;
        }
      }
      w.path = pick;
      const pth = paths[pick];
      w.forward = pth.kind === "sidewalk" ? prnd() < 0.5 : prnd() < plan.inbound;
    }
  };
  if (paths.length) assign();

  const at = { p: [0, 0, 0] as V3, d: [0, -1] as V2 };
  const ahead = { p: [0, 0, 0] as V3, d: [0, -1] as V2 };
  const camPos = new THREE.Vector3(60, 300, 200);
  let time = 0;
  /** Where everyone is at time t, written into the near/far meshes by distance from the camera. */
  const place = (t: number) => {
    crowd.begin();
    for (let i = 0; i < walkers.length; i++) {
      const w = walkers[i];
      const path = paths[w.path];
      if (!path || i >= activeWalkers) continue;
      const s = walkerDistance(path.length, w.speed, w.offset, t, w.pause);
      if (s === null) continue;
      const along = w.forward ? s : path.length - s;
      pathAt(path, along, at);
      // Heading from a point 1.6 m ahead: rounds the corners of the polyline.
      pathAt(path, w.forward ? along + 1.6 : along - 1.6, ahead);
      let dx = ahead.p[0] - at.p[0];
      let dz = ahead.p[2] - at.p[2];
      const l = Math.hypot(dx, dz);
      if (l < 1e-4) {
        dx = w.forward ? at.d[0] : -at.d[0];
        dz = w.forward ? at.d[1] : -at.d[1];
      } else {
        dx /= l;
        dz /= l;
      }
      // Keep right (Finland): offset to the right of the walking direction.
      const x = at.p[0] - dz * w.lateral;
      const z = at.p[2] + dx * w.lateral;
      composeAt(_m, x, at.p[1], z, Math.atan2(-dx, -dz), w.look);
      crowd.push(_m, lookData, animData, i, Math.hypot(x - camPos.x, at.p[1] - camPos.y, z - camPos.z));
    }
    let j = walkers.length;
    for (const g of groups) {
      const out = g.rank < plan.groups;
      for (const m of g.members) {
        if (out) {
          const x = g.at[0] + m.x;
          const z = g.at[2] + m.z;
          const y = yAt(x, z);
          composeAt(_m, x, y, z, m.ry, m.look);
          crowd.push(_m, lookData, animData, j, Math.hypot(x - camPos.x, y - camPos.y, z - camPos.z));
        }
        j++;
      }
    }
    crowd.end();
  };
  place(0);

  const frustum = new THREE.Frustum();
  const projScreen = new THREE.Matrix4();
  const lastCam = new THREE.Vector3(1e9, 0, 0);
  let frameCount = 0;

  const people: WorldModule = {
    id: "people",
    root,
    labels: [],
    pickables: [],
    targets: [],
    ready: Promise.resolve(),
    setLighting(state: LightingState) {
      const next = crowdPlan(state.iso);
      if (Math.abs(next.walkers - plan.walkers) > 1e-3 || Math.abs(next.inbound - plan.inbound) > 1e-3 || next.groups !== plan.groups) {
        plan = next;
        if (paths.length) assign();
        place(time);
        ctx.invalidate();
      }
    },
    tick(dt: number, _elapsed: number, camera: THREE.PerspectiveCamera) {
      frameCount++;
      camera.getWorldPosition(camPos);
      const moved = camPos.distanceToSquared(lastCam) > 16;
      if (ctx.reducedMotion || !paths.length) {
        // Still people: only re-sort near/far when the camera has moved.
        if (!moved) return false;
        lastCam.copy(camPos);
        place(time);
        return true;
      }
      time += dt;
      projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreen);
      const nearest = crowd.nearestVisible(frustum, camPos);
      // Motion further than ~600 m is sub-pixel; between 150 and 600 m update at a lower rate.
      if (!Number.isFinite(nearest) || nearest > 600) {
        if (moved) {
          lastCam.copy(camPos);
          place(time);
        }
        return false;
      }
      const every = nearest < 150 ? 1 : nearest < 320 ? 2 : 4;
      if (frameCount % every !== 0) return false;
      lastCam.copy(camPos);
      mats.uniforms.uTwTime.value = time;
      place(time);
      return true;
    },
    dispose() {
      mats.depth.dispose();
    },
  };
  return people;
}
