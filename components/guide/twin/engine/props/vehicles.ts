import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { CameraView, LightingState, TwinContext, TwinTarget, V2, V3, WorldModule } from "../types";
import { loadCampus, loadStreets, loadTerrain, type CampusData, type StreetsData, type Terrain } from "../data/campus";
import { LUMINANCE, kelvinToLinear, preethamRadiance } from "../sky/sky";
import { EVENT_VIOLET, canvasTexture, makeCanvas } from "../render/canvas";
import { makeLabel } from "../labels";
import { PLAN_FRAMES } from "../frame";
import { clamp, monoFont, mulberry32, pointInRing, polygonBounds } from "../util";

/**
 * Vehicles (DESIGN §2 props/vehicles.ts, SPEC §5):
 *
 * - The supercar display in BioCity's Tykistökatu entrance recess (the
 *   "syvänne"): procedural G-Class-style off-roaders — slab sides, upright
 *   screen, round lamps with LED rings, flared arches, side steps, exposed
 *   hinges, spare wheel on the side-hinged tailgate, 22" twin-spoke wheels —
 *   in obsidian black metallic, matte magno grey and white, clear-coated
 *   paint with environment reflections, real glass, a visible interior, DRLs
 *   and contact shadows. No maker badges or emblems anywhere. Event dressing:
 *   stanchions with violet ropes, a "Supercar display" sign and two 4000 K
 *   spots from the bridge soffit after dark.
 * - Parked cars and light traffic: see the second half of this file.
 *
 * Frame: each car is built front = −z, right = +x, ground y = 0, origin
 * between the axles; placed with rotation.y = −heading (SPEC §1.1).
 */

// ── Geometry helpers ─────────────────────────────────────────────────────────

/** Material slots of the hero cars (one merged mesh per slot and car paint). */
type Slot = "paint" | "trim" | "rubber" | "chrome" | "alloy" | "glass" | "tint" | "emit" | "interior" | "lens";

/** Geometry buckets per slot with vertex colours (white when not given). */
class Bag {
  readonly parts = new Map<Slot, THREE.BufferGeometry[]>();

  add(slot: Slot, geometry: THREE.BufferGeometry, color?: THREE.ColorRepresentation): void {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    const keep = color === undefined && g.getAttribute("color") !== undefined;
    for (const name of Object.keys(g.attributes)) {
      if (name !== "position" && name !== "normal" && !(keep && name === "color")) g.deleteAttribute(name);
    }
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    if (!keep) {
      const n = g.getAttribute("position").count;
      const c = new THREE.Color(color ?? 0xffffff);
      const col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    }
    let list = this.parts.get(slot);
    if (!list) this.parts.set(slot, (list = []));
    list.push(g);
  }

  /** Apply a matrix to everything (car → world). */
  transform(m: THREE.Matrix4): void {
    for (const list of this.parts.values()) for (const g of list) g.applyMatrix4(m);
  }

  /** Merge every slot into one geometry (consumes the parts). */
  merged(slot: Slot): THREE.BufferGeometry | null {
    const list = this.parts.get(slot);
    if (!list || !list.length) return null;
    const g = mergeGeometries(list, false);
    for (const p of list) p.dispose();
    this.parts.delete(slot);
    return g;
  }
}

/** Turn a surface inside out (winding and normals), e.g. a liner seen from its concave side. */
function flipFaces(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const index = g.getIndex();
  if (index) {
    const a = index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = t;
    }
    index.needsUpdate = true;
  }
  const n = g.getAttribute("normal");
  if (n) for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}

/** Rounded box (seg rounding steps); `plain` = an ordinary box (far / phone detail). */
function rbox(cx: number, cy: number, cz: number, w: number, h: number, d: number, r: number, seg = 2, plain = false): THREE.BufferGeometry {
  if (plain) return boxg(cx, cy, cz, w, h, d);
  const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
  g.translate(cx, cy, cz);
  return g;
}

function boxg(cx: number, cy: number, cz: number, w: number, h: number, d: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(cx, cy, cz);
  return g;
}

/** Cylinder along an axis, centred at (cx, cy, cz). */
function cyl(axis: "x" | "y" | "z", cx: number, cy: number, cz: number, r0: number, r1: number, len: number, seg: number, open = false): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, open);
  if (axis === "x") g.rotateZ(-Math.PI / 2);
  else if (axis === "z") g.rotateX(Math.PI / 2);
  g.translate(cx, cy, cz);
  return g;
}

/** Lathe around the x axis: profile points [radius, x]. */
function latheX(profile: [number, number][], seg: number): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(
    profile.map(([r, a]) => new THREE.Vector2(r, a)),
    seg,
  );
  // Lathe axis is +y: turn it onto +x.
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Shape in the (z, y) side plane from points with fillet radii (left open when `close` is false). */
function filletShape(pts: [number, number, number][], close = true): THREE.Shape {
  const s = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x, y, r] = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    if (r <= 0) {
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
      continue;
    }
    const d0 = Math.hypot(prev[0] - x, prev[1] - y) || 1;
    const d1 = Math.hypot(next[0] - x, next[1] - y) || 1;
    const k0 = Math.min(r, d0 / 2) / d0;
    const k1 = Math.min(r, d1 / 2) / d1;
    const ax = x + (prev[0] - x) * k0;
    const ay = y + (prev[1] - y) * k0;
    const bx = x + (next[0] - x) * k1;
    const by = y + (next[1] - y) * k1;
    if (i === 0) s.moveTo(ax, ay);
    else s.lineTo(ax, ay);
    s.quadraticCurveTo(x, y, bx, by);
  }
  if (close) s.closePath();
  return s;
}

/**
 * Extrude a side-plane shape (shape x = car z, shape y = car y) across the
 * car from x0 to x1, with rounded edges of radius `bevel`.
 */
function extrudeAcross(shape: THREE.Shape, x0: number, x1: number, bevel: number, curveSegments: number, bevelSegments = 3): THREE.BufferGeometry {
  const depth = Math.max(0.001, x1 - x0 - 2 * bevel);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments,
    curveSegments,
  });
  // Shape (u, v) extruded along w → car (x, y, z) = (w, v, u): rotate −90° about y.
  g.rotateY(-Math.PI / 2);
  // After the rotation the extrusion runs along −x from 0; shift it to [x0, x1].
  g.translate(x1 - bevel, 0, 0);
  return g;
}

/** Lean the greenhouse inwards (tumblehome) above the belt line. */
function tumblehome(g: THREE.BufferGeometry, belt: number, top: number, inset: number): THREE.BufferGeometry {
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y <= belt) continue;
    const k = 1 - (inset * clamp((y - belt) / (top - belt), 0, 1.2)) / 0.9;
    p.setX(i, p.getX(i) * k);
  }
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Shear in z by y (for raked pillars and screens): z += (y − y0) · k. */
function shearZ(g: THREE.BufferGeometry, y0: number, k: number): THREE.BufferGeometry {
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + (p.getY(i) - y0) * k);
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

// ── The G-Class-style off-roader ─────────────────────────────────────────────

/** Dimensions (m) of the hero off-roader (SPEC §5.4; W463A-like proportions). */
export const GCLASS = {
  /** Bumper to bumper (without the spare wheel) and with it. */
  length: 4.61,
  lengthWithSpare: 4.82,
  width: 1.931,
  widthMirrors: 2.187,
  height: 1.969,
  wheelbase: 2.89,
  track: 1.637,
  tyreRadius: 0.3975,
  rimRadius: 0.279,
  tyreWidth: 0.285,
} as const;

const AXLE_F = -GCLASS.wheelbase / 2;
const AXLE_R = GCLASS.wheelbase / 2;
const BELT = 1.22;
const ROOF = 1.845;
const BODY_X = 0.93;
const FRONT_Z = -2.2;
const REAR_Z = 2.2;
const ARCH_R = 0.5;
const WHEEL_Y = GCLASS.tyreRadius;

export interface GClassOptions {
  /** 1 = full detail (ultra/high), 0.5 = phones. */
  detail: number;
  /** Colour of the flares and bumpers: body colour (true) or black plastic. */
  bodyColouredTrim: boolean;
  /** Spare wheel cover centre: body colour or black. */
  spareCentre: "paint" | "black";
  /** Brake caliper colour. */
  caliper: string;
}

/** Wheel at the origin, axle along x, outer face towards +x (mirror for the left side). */
function addWheel(bag: Bag, m: THREE.Matrix4, opts: GClassOptions) {
  const seg = Math.max(16, Math.round(32 * opts.detail));
  const R = GCLASS.tyreRadius;
  const rr = GCLASS.rimRadius;
  const hw = GCLASS.tyreWidth / 2;
  const add = (slot: Slot, g: THREE.BufferGeometry, color?: THREE.ColorRepresentation) => {
    g.applyMatrix4(m);
    bag.add(slot, g, color);
  };
  // Tyre: bead → bulging sidewall → rounded shoulder → tread, both sides.
  const tyre: [number, number][] = [
    [rr + 0.004, -hw + 0.012],
    [R - 0.07, -hw - 0.012],
    [R - 0.02, -hw - 0.002],
    [R, -hw + 0.035],
    [R, hw - 0.035],
    [R - 0.02, hw + 0.002],
    [R - 0.07, hw + 0.012],
    [rr + 0.004, hw - 0.012],
  ];
  add("rubber", latheX(tyre, seg), 0x1b1b1c);
  // Rim barrel (seen between the spokes) and the polished outer lip.
  add(
    "alloy",
    latheX(
      [
        [rr - 0.012, hw - 0.01],
        [rr - 0.03, hw - 0.04],
        [rr - 0.035, -hw + 0.03],
        [rr - 0.012, -hw + 0.01],
      ],
      seg,
    ),
    0x3a3c40,
  );
  add(
    "alloy",
    latheX(
      [
        [rr + 0.006, hw - 0.004],
        [rr + 0.006, hw + 0.006],
        [rr - 0.012, hw + 0.012],
        [rr - 0.022, hw + 0.004],
      ],
      seg,
    ),
    0xd6d9dc,
  );
  // Five twin spokes, concave towards the hub; machined faces lighter than the sides.
  const spokes = opts.detail >= 0.75 ? 10 : 5;
  for (let i = 0; i < spokes; i++) {
    const pair = Math.floor(i / 2);
    const a = (pair / 5) * Math.PI * 2 + (spokes === 10 ? (i % 2 === 0 ? -0.075 : 0.075) : 0);
    const len = rr - 0.07;
    const g = new THREE.BoxGeometry(0.03, len, spokes === 10 ? 0.034 : 0.05, 1, 2, 1);
    const p = g.getAttribute("position");
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      const t = (y + len / 2) / len;
      // Taper towards the lip and dish the hub inwards.
      p.setZ(k, p.getZ(k) * (1.25 - 0.45 * t));
      p.setX(k, p.getX(k) + hw - 0.004 - 0.05 * (1 - t) * (1 - t));
    }
    g.translate(0, 0.07 + len / 2, 0);
    g.rotateX(a);
    g.computeVertexNormals();
    add("alloy", g, 0xc9ccd0);
  }
  // Hub, centre cap (plain, no emblem) and wheel bolts.
  add("alloy", cyl("x", hw - 0.05, 0, 0, 0.085, 0.085, 0.05, 12), 0x8d9095);
  add("alloy", cyl("x", hw - 0.022, 0, 0, 0.034, 0.036, 0.012, 12), 0x16171a);
  if (opts.detail >= 0.75) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3;
      add("chrome", cyl("x", hw - 0.022, Math.sin(a) * 0.058, Math.cos(a) * 0.058, 0.009, 0.009, 0.016, 5));
    }
  }
  // Brake disc (vented, dark) and the caliper at the top rear of the disc.
  add("alloy", cyl("x", -0.02, 0, 0, 0.19, 0.19, 0.032, 20), 0x55575a);
  {
    const g = boxg(0, 0, 0, 0.07, 0.1, 0.2);
    g.translate(0.01, 0.13, 0.06);
    add("alloy", g, opts.caliper);
  }
}

/**
 * The hero off-roader in its own frame (front −z, ground y = 0). Returns the
 * filled bag; `paint` holds every body-coloured panel.
 */
export function buildGClass(opts: GClassOptions): Bag {
  const bag = new Bag();
  const d = opts.detail;
  const cs = d >= 0.75 ? 6 : 3;
  const seg2 = d >= 0.75 ? 2 : 1;
  // Phones: every rounded part becomes a plain box.
  const rb = (cx: number, cy: number, cz: number, w: number, h: number, dd: number, r: number, seg = 1, plain = false) =>
    rbox(cx, cy, cz, w, h, dd, r, seg, plain || d < 0.75);
  const trimSlot: Slot = opts.bodyColouredTrim ? "paint" : "trim";
  const BLACK = 0x0b0b0c;
  const GAP = 0x020202;

  // Lower body: side profile with the wheel arches, extruded across with rounded edges.
  {
    const a = Math.asin(0.1 / ARCH_R);
    const shape = filletShape([
      [FRONT_Z + 0.02, 0.56, 0],
      [FRONT_Z, 0.66, 0.03],
      [FRONT_Z, 1.12, 0.05],
      [FRONT_Z + 0.03, 1.198, 0.05],
      [-1.0, 1.205, 0.02],
      [-0.985, BELT, 0.01],
      [REAR_Z - 0.03, BELT, 0.05],
      [REAR_Z, BELT - 0.04, 0.05],
      [REAR_Z, 0.62, 0.03],
      [REAR_Z - 0.02, 0.52, 0],
    ], false);
    // The bottom: rocker and both arches (rear → front) with the rocker and both arches (rear → front).
    shape.lineTo(AXLE_R + ARCH_R * Math.cos(a), 0.5);
    shape.absarc(AXLE_R, WHEEL_Y, ARCH_R, a, Math.PI - a, false);
    shape.lineTo(AXLE_F + ARCH_R * Math.cos(a), 0.5);
    shape.absarc(AXLE_F, WHEEL_Y, ARCH_R, a, Math.PI - a, false);
    shape.lineTo(FRONT_Z + 0.02, 0.52);
    shape.closePath();
    bag.add("paint", extrudeAcross(shape, -BODY_X, BODY_X, 0.04, cs, d >= 0.75 ? 2 : 1));
  }
  // Raised bonnet between the fender tops, its shut lines and the cowl.
  bag.add("paint", rb(0, 1.214, -1.6, 1.5, 0.05, 1.18, 0.022, seg2));
  for (const s of [-1, 1]) bag.add("trim", boxg(s * 0.756, 1.212, -1.6, 0.006, 0.05, 1.17), GAP);
  bag.add("trim", boxg(0, 1.236, -1.0, 1.52, 0.012, 0.03), BLACK);

  // Flares: an arched band round each wheel opening, standing proud of the side.
  for (const z of [AXLE_F, AXLE_R]) {
    const a = Math.asin(0.06 / ARCH_R);
    const outer = ARCH_R + 0.085;
    const ring = new THREE.Shape();
    ring.absarc(z, WHEEL_Y, outer, a * 0.6, Math.PI - a * 0.6, false);
    ring.absarc(z, WHEEL_Y, ARCH_R - 0.005, Math.PI - a, a, true);
    ring.closePath();
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -BODY_X - 0.055 : BODY_X - 0.012;
      const x1 = s < 0 ? -BODY_X + 0.012 : BODY_X + 0.055;
      bag.add(trimSlot, extrudeAcross(ring, x0, x1, 0.016, d >= 0.75 ? 8 : 5, 1), BLACK);
    }
    // Wheel-well liners (black half tubes) so the arches are not see-through.
    for (const s of [-1, 1]) {
      // Upper half of a tube along x (θ 0.22…2.92 → y > 0 after the turn).
      const g = flipFaces(new THREE.CylinderGeometry(ARCH_R - 0.01, ARCH_R - 0.01, 0.3, 10, 1, true, Math.PI / 2 - 1.35, 2.7));
      g.rotateZ(Math.PI / 2);
      g.translate(s * (BODY_X - 0.16), WHEEL_Y, z);
      bag.add("trim", g, 0x050505);
      bag.add("trim", boxg(s * (BODY_X - 0.31), WHEEL_Y + 0.15, z, 0.012, 0.7, 1.0), 0x050505);
    }
  }

  // Panel gaps on both sides: door fronts, door split, rear door end, fuel flap.
  for (const s of [-1, 1]) {
    const x = s * (BODY_X + 0.0015);
    for (const z of [-0.94, 0.07, 1.03]) bag.add("trim", boxg(x, (0.52 + BELT) / 2, z, 0.004, BELT - 0.52, 0.006), GAP);
    bag.add("trim", boxg(x, 0.515, 0.04, 0.004, 0.006, 1.95), GAP);
    // Protective strips: black with a bright top line (upper) and the lower door strip.
    bag.add("trim", rb(s * (BODY_X + 0.012), 0.985, 0.03, 0.026, 0.05, 4.08, 0.01, 1), BLACK);
    bag.add("chrome", boxg(s * (BODY_X + 0.025), 1.011, 0.03, 0.006, 0.006, 4.06));
    bag.add("trim", rb(s * (BODY_X + 0.01), 0.63, 0.04, 0.022, 0.06, 1.86, 0.01, 1), BLACK);
    // Exposed door hinges (front edge of each door) and push-button handles.
    for (const z of [-0.94, 0.07]) {
      for (const y of [0.78, 1.08]) {
        bag.add("paint", boxg(s * (BODY_X + 0.012), y, z + 0.035, 0.028, 0.075, 0.07));
        bag.add("chrome", cyl("y", s * (BODY_X + 0.026), y, z + 0.012, 0.009, 0.009, 0.09, 6));
      }
    }
    for (const z of [-0.06, 0.93]) {
      bag.add("chrome", rb(s * (BODY_X + 0.018), 1.105, z, 0.03, 0.032, 0.15, 0.012, 1, d < 0.75));
      bag.add("trim", boxg(s * (BODY_X + 0.034), 1.105, z - 0.045, 0.006, 0.018, 0.026), BLACK);
    }
    // Fuel flap (right rear quarter only).
    if (s > 0) bag.add("trim", boxg(x, 1.06, 1.5, 0.004, 0.17, 0.17), GAP);
  }

  // Side steps between the arches: alloy board with three rubber strips, black brackets.
  for (const s of [-1, 1]) {
    const x = s * (BODY_X - 0.005);
    bag.add("alloy", rb(x, 0.4, 0, 0.17, 0.05, 1.86, 0.018, 1), 0xb7babd);
    for (const k of [-1, 0, 1]) bag.add("trim", boxg(x + k * 0.042, 0.428, 0, 0.022, 0.008, 1.8), BLACK);
    for (const z of [-0.7, 0, 0.7]) bag.add("trim", boxg(s * (BODY_X - 0.12), 0.45, z, 0.16, 0.06, 0.08), BLACK);
    // Side-exit exhaust tips ahead of the rear wheel.
    for (const z of [0.83, 0.95]) {
      bag.add("chrome", cyl("x", s * (BODY_X - 0.02), 0.33, z, 0.042, 0.042, 0.1, 12, true));
      bag.add("trim", cyl("x", s * (BODY_X - 0.035), 0.33, z, 0.036, 0.036, 0.04, 10), 0x020202);
    }
  }

  // Underbody, axles and differentials (seen under the sills).
  bag.add("trim", boxg(0, 0.4, 0, 1.6, 0.18, 3.9), 0x111214);
  for (const z of [AXLE_F, AXLE_R]) {
    bag.add("trim", cyl("x", 0, WHEEL_Y, z, 0.05, 0.05, GCLASS.track - 0.2, 10), 0x1a1b1d);
    bag.add("trim", new THREE.SphereGeometry(0.13, 8, 5).translate(0.08, WHEEL_Y - 0.02, z), 0x1a1b1d);
  }

  // ── Front: bumper, grille, round lamps with LED rings, indicator pods ──
  bag.add(trimSlot, rb(0, 0.54, FRONT_Z - 0.04, 1.86, 0.3, 0.22, 0.085, seg2), BLACK);
  bag.add("trim", rb(0, 0.4, FRONT_Z - 0.12, 1.62, 0.09, 0.07, 0.03, 1), BLACK);
  // Air intakes (mesh) and a bright skid strip.
  for (const [x, w] of [
    [0, 0.62],
    [-0.62, 0.36],
    [0.62, 0.36],
  ] as [number, number][]) {
    bag.add("trim", boxg(x, 0.53, FRONT_Z - 0.145, w, 0.15, 0.04), 0x030303);
    if (d >= 0.75) for (let k = 0; k < 5; k++) bag.add("trim", boxg(x, 0.475 + k * 0.028, FRONT_Z - 0.162, w - 0.02, 0.006, 0.01), 0x16171a);
  }
  bag.add("chrome", boxg(0, 0.395, FRONT_Z - 0.16, 0.5, 0.04, 0.03));
  for (const s of [-1, 1]) bag.add("chrome", boxg(s * 0.33, 0.53, FRONT_Z - 0.155, 0.04, 0.2, 0.03));
  // Number plate holder (plain).
  bag.add("trim", boxg(0, 0.615, FRONT_Z - 0.158, 0.54, 0.13, 0.015), 0x0e0e10);
  // Grille: bright frame, black mesh, three horizontal louvres (no emblem).
  bag.add("chrome", rb(0, 0.965, FRONT_Z - 0.035, 0.84, 0.34, 0.05, 0.03, 1));
  bag.add("trim", boxg(0, 0.965, FRONT_Z - 0.05, 0.78, 0.28, 0.02), 0x050506);
  for (const y of [0.88, 0.965, 1.05]) {
    bag.add(trimSlot, boxg(0, y, FRONT_Z - 0.065, 0.76, 0.034, 0.03), BLACK);
    bag.add("chrome", boxg(0, y + 0.017, FRONT_Z - 0.081, 0.74, 0.006, 0.004));
  }
  for (const s of [-1, 1]) {
    const x = s * 0.62;
    // Square bezel stepping out of the front face, black ring, lens, LED ring and projectors.
    bag.add("paint", rb(x, 0.985, FRONT_Z - 0.025, 0.31, 0.29, 0.06, 0.05, 1));
    bag.add("trim", cyl("z", x, 0.985, FRONT_Z - 0.05, 0.128, 0.128, 0.03, 24), BLACK);
    bag.add("chrome", cyl("z", x, 0.985, FRONT_Z - 0.045, 0.11, 0.1, 0.04, 24));
    bag.add("emit", new THREE.TorusGeometry(0.108, 0.0065, 4, d >= 0.75 ? 40 : 24).translate(x, 0.985, FRONT_Z - 0.066), 0xffffff);
    for (const [px, py, pr] of [
      [-0.035, 0.012, 0.035],
      [0.04, 0.0, 0.03],
      [0.0, -0.05, 0.022],
    ] as [number, number, number][]) {
      bag.add("trim", cyl("z", x + s * px, 0.985 + py, FRONT_Z - 0.06, pr, pr, 0.02, 10), 0x0c0d10);
      bag.add("lens", cyl("z", x + s * px, 0.985 + py, FRONT_Z - 0.068, pr * 0.7, pr * 0.7, 0.004, 10), 0xd8e4ff);
    }
    bag.add("lens", cyl("z", x, 0.985, FRONT_Z - 0.07, 0.122, 0.122, 0.006, 24));
    // Indicator pod on the fender top: black base, clear lens with an amber lamp inside.
    bag.add("trim", boxg(s * 0.84, 1.225, -2.02, 0.12, 0.03, 0.16), BLACK);
    bag.add("lens", rb(s * 0.84, 1.252, -2.025, 0.1, 0.03, 0.13, 0.012, 1, d < 0.75), 0xf4f1e8);
    bag.add("emit", boxg(s * 0.84, 1.245, -2.03, 0.05, 0.012, 0.07), 0x2a1400);
    // Fog lamp in the outer intake.
    bag.add("lens", cyl("z", s * 0.66, 0.53, FRONT_Z - 0.17, 0.028, 0.028, 0.01, 10), 0xe8eef8);
  }

  // ── Greenhouse: pillars, screens, frames, roof (leaning in above the belt) ──
  const house = new Bag();
  // Windscreen (raked ≈ 10°): glass, black frame, body-coloured A-pillars.
  const RAKE = 0.18;
  {
    const g = boxg(0, (BELT + ROOF) / 2 + 0.01, -0.945, 1.56, ROOF - BELT - 0.03, 0.008);
    shearZ(g, BELT, RAKE);
    house.add("glass", g);
    for (const [y, h] of [
      [BELT + 0.03, 0.05],
      [ROOF - 0.02, 0.05],
    ] as [number, number][]) {
      const f = boxg(0, y, -0.945, 1.6, h, 0.02);
      shearZ(f, BELT, RAKE);
      house.add("trim", f, BLACK);
    }
    for (const s of [-1, 1]) {
      const f = boxg(s * 0.795, (BELT + ROOF) / 2, -0.945, 0.03, ROOF - BELT, 0.02);
      shearZ(f, BELT, RAKE);
      house.add("trim", f, BLACK);
      const a = rb(s * 0.85, (BELT + ROOF) / 2, -0.94, 0.09, ROOF - BELT + 0.01, 0.1, 0.02, 1, d < 0.75);
      shearZ(a, BELT, RAKE);
      house.add("paint", a);
    }
    // Wipers parked at the bottom of the screen.
    for (const x of [-0.42, 0.24]) {
      const w = boxg(x, BELT + 0.045, -0.97, 0.62, 0.014, 0.018);
      w.rotateZ(0.04);
      house.add("trim", w, BLACK);
    }
  }
  // Side windows between B/C/D pillars; glass slightly recessed behind the frames.
  const windows: [number, number][] = [
    [-0.865, 0.015],
    [0.125, 0.925],
    [1.055, 2.02],
  ];
  const WIN_Y0 = 1.262;
  const WIN_Y1 = 1.8;
  for (const s of [-1, 1]) {
    const xo = s * 0.882;
    for (const [z0, z1] of windows) {
      const rear = z0 > 1;
      house.add(rear ? "tint" : "glass", boxg(s * 0.872, (WIN_Y0 + WIN_Y1) / 2, (z0 + z1) / 2, 0.006, WIN_Y1 - WIN_Y0, z1 - z0));
      // Rubber frame round the opening.
      house.add("trim", boxg(xo, WIN_Y0 - 0.008, (z0 + z1) / 2, 0.016, 0.018, z1 - z0 + 0.03), BLACK);
      house.add("trim", boxg(xo, WIN_Y1 + 0.01, (z0 + z1) / 2, 0.016, 0.022, z1 - z0 + 0.03), BLACK);
      house.add("trim", boxg(xo, (WIN_Y0 + WIN_Y1) / 2, z0 - 0.008, 0.016, WIN_Y1 - WIN_Y0, 0.018), BLACK);
      house.add("trim", boxg(xo, (WIN_Y0 + WIN_Y1) / 2, z1 + 0.008, 0.016, WIN_Y1 - WIN_Y0, 0.018), BLACK);
    }
    // B and C pillars (gloss black covers), D pillar body colour, belt ledge and header.
    house.add("trim", boxg(s * 0.877, (BELT + ROOF) / 2, 0.07, 0.03, ROOF - BELT, 0.11), 0x070708);
    house.add("trim", boxg(s * 0.877, (BELT + ROOF) / 2, 0.99, 0.03, ROOF - BELT, 0.13), 0x070708);
    house.add("paint", rb(s * 0.86, (BELT + ROOF) / 2, 2.11, 0.07, ROOF - BELT + 0.01, 0.18, 0.025, 1));
    house.add("paint", rb(s * 0.875, BELT + 0.02, 0.6, 0.05, 0.045, 3.15, 0.012, 1, d < 0.75));
    house.add("chrome", boxg(s * 0.888, BELT + 0.04, 0.55, 0.006, 0.008, 2.9));
    house.add("trim", boxg(s * 0.876, ROOF - 0.025, 0.58, 0.03, 0.05, 2.98), BLACK);
  }
  // Rear upper face of the tailgate round the rear window, the window and a high brake light.
  {
    const z = REAR_Z - 0.012;
    house.add("paint", boxg(0, BELT + 0.045, z, 1.74, 0.09, 0.03));
    house.add("paint", boxg(0, ROOF - 0.02, z, 1.74, 0.05, 0.03));
    for (const s of [-1, 1]) house.add("paint", boxg(s * 0.715, (BELT + ROOF) / 2, z, 0.3, ROOF - BELT, 0.03));
    house.add("tint", boxg(0, (1.31 + 1.8) / 2, z + 0.006, 1.14, 0.49, 0.008));
    house.add("trim", boxg(0, 1.305, z + 0.012, 1.17, 0.02, 0.01), BLACK);
    house.add("trim", boxg(0, 1.805, z + 0.012, 1.17, 0.02, 0.01), BLACK);
    house.add("emit", boxg(0, ROOF - 0.03, z + 0.02, 0.34, 0.02, 0.01), 0xff1a10);
  }
  // Roof: flat panel with black rain gutters and a small spoiler lip at the back.
  house.add("paint", rb(0, ROOF + 0.05, 0.64, 1.78, 0.1, 3.11, 0.035, seg2));
  for (const s of [-1, 1]) house.add("trim", rb(s * 0.88, ROOF + 0.02, 0.64, 0.035, 0.04, 3.12, 0.012, 1, d < 0.75), BLACK);
  house.add("trim", boxg(0, ROOF + 0.085, 2.17, 1.7, 0.035, 0.1), BLACK);

  // Interior (seen through the glass): dash, wheel, seats, headliner.
  const LEATHER = 0x1c1715;
  house.add("interior", rb(0, 1.27, -0.82, 1.62, 0.16, 0.34, 0.05, 1), 0x161616);
  house.add("interior", boxg(0, 1.335, -0.74, 1.5, 0.05, 0.2), 0x0f0f10);
  // Wide screen panel on the dash top, unlit.
  house.add("interior", boxg(-0.2, 1.39, -0.73, 0.9, 0.12, 0.02), 0x050608);
  {
    const ring = new THREE.TorusGeometry(0.19, 0.022, 6, 20);
    ring.rotateX(-1.1);
    ring.translate(-0.4, 1.3, -0.6);
    house.add("interior", ring, 0x101010);
    const hub = cyl("y", 0, 0, 0, 0.06, 0.07, 0.05, 10);
    hub.rotateX(-1.1 + Math.PI / 2);
    hub.translate(-0.4, 1.3, -0.6);
    house.add("interior", hub, 0x121212);
  }
  for (const x of [-0.4, 0.4]) {
    house.add("interior", boxg(x, 1.02, -0.1, 0.52, 0.14, 0.52), LEATHER);
    // Backrest reclined ≈ 11°, built at the hinge and turned there.
    const back = rb(0, 0.31, 0, 0.5, 0.62, 0.14, 0.06, 1);
    back.rotateX(-0.2);
    back.translate(x, 1.07, 0.17);
    house.add("interior", back, LEATHER);
    house.add("interior", boxg(x, 1.73, 0.29, 0.26, 0.17, 0.12), LEATHER);
  }
  house.add("interior", boxg(0, 1.06, 1.08, 1.5, 0.14, 0.5), LEATHER);
  house.add("interior", rb(0, 1.37, 1.33, 1.5, 0.6, 0.14, 0.06, 1), LEATHER);
  for (const x of [-0.48, 0, 0.48]) house.add("interior", boxg(x, 1.69, 1.36, 0.25, 0.15, 0.11), LEATHER);
  house.add("interior", boxg(0, 1.12, 0.2, 0.26, 0.18, 1.0), 0x141414);
  house.add("interior", boxg(0, ROOF - 0.01, 0.6, 1.66, 0.02, 2.98), 0x2a2a2c);
  house.add("interior", boxg(0, 1.3, 1.85, 1.62, 0.02, 0.6), 0x111111);
  for (const s of [-1, 1]) house.add("interior", boxg(s * 0.83, 1.24, 0.55, 0.05, 0.12, 2.9), 0x121212);
  // Mirrors (on the doors): body-coloured housing, black arm, mirror glass, indicator strip.
  for (const s of [-1, 1]) {
    house.add("paint", rb(s * 1.0, 1.37, -0.72, 0.24, 0.15, 0.11, 0.04, 1));
    house.add("trim", boxg(s * 0.93, 1.33, -0.74, 0.12, 0.05, 0.06), BLACK);
    house.add("chrome", boxg(s * 1.0, 1.37, -0.66, 0.2, 0.11, 0.004));
    house.add("emit", boxg(s * 1.0, 1.31, -0.77, 0.16, 0.012, 0.02), 0x2a1400);
  }
  for (const [slot, list] of house.parts) {
    for (const g of list) {
      // Mirrors and interior keep their shape; the glasshouse leans in.
      if (slot !== "interior") tumblehome(g, BELT, ROOF + 0.12, 0.04);
      bag.add(slot, g);
    }
  }

  // ── Rear: lamps, bumper, spare wheel on the tailgate, handle, hinges ──
  for (const s of [-1, 1]) {
    bag.add("trim", boxg(s * 0.79, 0.79, REAR_Z + 0.008, 0.25, 0.13, 0.03), BLACK);
    bag.add("lens", rb(s * 0.79, 0.79, REAR_Z + 0.02, 0.23, 0.11, 0.02, 0.02, 1, d < 0.75), 0xb01212);
    // LED signature: a "C" of light strips inside the lens.
    bag.add("emit", boxg(s * 0.79, 0.825, REAR_Z + 0.026, 0.2, 0.014, 0.006), 0xff1a10);
    bag.add("emit", boxg(s * 0.79, 0.755, REAR_Z + 0.026, 0.2, 0.014, 0.006), 0xff1a10);
    bag.add("emit", boxg(s * 0.695, 0.79, REAR_Z + 0.026, 0.014, 0.084, 0.006), 0xff1a10);
  }
  bag.add(trimSlot, rb(0, 0.5, REAR_Z + 0.04, 1.84, 0.3, 0.2, 0.06, seg2), BLACK);
  bag.add("trim", boxg(0, 0.38, REAR_Z + 0.08, 1.4, 0.08, 0.06), BLACK);
  for (const s of [-1, 1]) {
    bag.add("chrome", boxg(s * 0.55, 0.62, REAR_Z + 0.12, 0.16, 0.04, 0.08));
    bag.add("emit", boxg(s * 0.78, 0.47, REAR_Z + 0.142, 0.22, 0.03, 0.004), 0x400404);
  }
  bag.add("trim", boxg(0, 0.56, REAR_Z + 0.142, 0.54, 0.13, 0.012), 0x0e0e10);
  // Tailgate shut lines, handle and the side-hinge blocks.
  for (const s of [-1, 1]) bag.add("trim", boxg(s * 0.905, 0.94, REAR_Z + 0.001, 0.006, 0.64, 0.004), GAP);
  bag.add("trim", boxg(0, 0.63, REAR_Z + 0.001, 1.8, 0.006, 0.004), GAP);
  bag.add("trim", boxg(0.5, 1.03, REAR_Z + 0.012, 0.16, 0.03, 0.02), BLACK);
  for (const y of [0.74, 1.12]) bag.add("trim", boxg(-0.86, y, REAR_Z + 0.02, 0.06, 0.09, 0.04), BLACK);
  {
    // Spare wheel: tyre hidden under a hard cover with a bright ring and a black centre band.
    const zc = REAR_Z + 0.03 + 0.11;
    const R = 0.4;
    const seg = Math.max(16, Math.round(32 * d));
    const cover = latheX(
      [
        [0.0, 0.12],
        [R - 0.06, 0.115],
        [R - 0.015, 0.1],
        [R, 0.07],
        [R, -0.1],
        [R - 0.02, -0.11],
      ],
      seg,
    );
    cover.rotateY(-Math.PI / 2);
    cover.translate(0, 1.02, zc);
    bag.add(opts.spareCentre === "paint" ? "paint" : "trim", cover, BLACK);
    const ring = new THREE.TorusGeometry(R - 0.018, 0.017, 8, seg);
    ring.translate(0, 1.02, zc + 0.104);
    bag.add("chrome", ring);
    bag.add("trim", rb(0, 1.02, zc + 0.122, 0.42, 0.1, 0.012, 0.02, 1), 0x070708);
    bag.add("trim", cyl("z", 0, 1.02, REAR_Z + 0.06, 0.08, 0.08, 0.06, 12), BLACK);
  }

  // Wheels: tyres, twin-spoke rims, brakes.
  const m = new THREE.Matrix4();
  for (const z of [AXLE_F, AXLE_R]) {
    for (const s of [-1, 1]) {
      m.makeTranslation(s * (GCLASS.track / 2), WHEEL_Y, z);
      if (s < 0) m.multiply(new THREE.Matrix4().makeRotationY(Math.PI));
      addWheel(bag, m, opts);
    }
  }
  return bag;
}

/**
 * Soft contact shadow under a car (canvas, used as alphaMap: white = dark):
 * the body footprint fading out, darker under the tyres. Soft edges come from
 * stacked translucent layers (no canvas filters — Safari < 18 ignores them).
 */
export function contactShadowTexture(length: number, width: number, wheelbase: number, track: number): THREE.CanvasTexture {
  const W = 256;
  const H = 128;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  const sx = W / (length + 1.2);
  const sz = H / (width + 1.0);
  const bw = length * sx;
  const bh = width * sz;
  const layers = 14;
  for (let i = 0; i < layers; i++) {
    const grow = (layers - i) * 2.2;
    ctx.fillStyle = `rgba(255,255,255,${(0.62 / layers).toFixed(4)})`;
    const x = (W - bw) / 2 - grow + 6;
    const y = (H - bh) / 2 - grow + 4;
    const w = bw + grow * 2 - 12;
    const h = bh + grow * 2 - 8;
    const r = Math.min(h / 2, 16 + grow);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    ctx.fill();
  }
  for (const u of [-wheelbase / 2, wheelbase / 2]) {
    for (const v of [-track / 2, track / 2]) {
      const cx = W / 2 + u * sx;
      const cy = H / 2 + v * sz;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 0.42 * sx);
      g.addColorStop(0, "rgba(255,255,255,0.55)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, (0.2 * sz) / (0.42 * sx));
      ctx.translate(-cx, -cy);
      ctx.fillRect(cx - 0.42 * sx, cy - 0.42 * sx, 0.84 * sx, 0.84 * sx);
      ctx.restore();
    }
  }
  return canvasTexture(canvas, { srgb: false });
}

// ── Supercar display (SPEC §5.3–5.5) ─────────────────────────────────────────

/** Paint finishes of the display cars. */
type PaintName = "obsidian" | "magno" | "white";

export interface DisplayCar {
  id: "A" | "B" | "C";
  /** Centre (campus frame) and compass heading of the nose. */
  at: V2;
  heading: number;
  paint: PaintName;
}

/** Car placements from the organiser's "Auto" labels (SPEC §5.3); C = optional third car under the pilotis. */
export const DISPLAY_CARS: readonly DisplayCar[] = [
  { id: "A", at: [-25.67, -19.54], heading: 325.1, paint: "obsidian" },
  { id: "B", at: [-31.19, -12.52], heading: 303.7, paint: "magno" },
  { id: "C", at: [-35.0, -7.56], heading: 235.1, paint: "white" },
];

/** Recess paving level (BioCity module, plan frame B: paving at +0.015). */
const RECESS_FLOOR_Y = 0.015;

/**
 * Per-vertex material parameters of the display (attribute aCar): roughness,
 * metalness, clearcoat (its roughness follows: glossy above 0.9, satin below)
 * and emission. One physical material then renders every opaque part of all
 * three cars and the stanchions in a single draw call.
 */
type Params = [number, number, number, number];
const SLOT_PARAMS: Record<Exclude<Slot, "paint" | "glass" | "tint" | "lens">, Params> = {
  trim: [0.42, 0, 0.3, 0],
  rubber: [0.88, 0, 0, 0],
  chrome: [0.07, 1, 0, 0],
  alloy: [0.3, 1, 0, 0],
  interior: [0.7, 0, 0, 0],
  emit: [0.35, 0, 0, 1],
};
const CHROME = new THREE.Color("#d6d8da");
/** Glass coverage (how much of the background a pane hides): clear side glass, privacy glass, lamp lenses. */
const GLASS_ALPHA: Record<"glass" | "tint" | "lens", number> = { glass: 0.42, tint: 0.86, lens: 0.22 };

/** Paint finishes: obsidian black metallic (clear coat), matte magno grey (satin), white (clear coat). */
const PAINTS: Record<PaintName, { color: string; params: Params }> = {
  obsidian: { color: "#0b0c0e", params: [0.17, 0.4, 1, 0] },
  magno: { color: "#5b5f62", params: [0.5, 0.5, 0.35, 0] },
  white: { color: "#e9e9e6", params: [0.28, 0.05, 1, 0] },
};

/** Give a geometry its material parameters (and optionally one colour for every vertex). */
function withParams(g: THREE.BufferGeometry, params: Params, color?: THREE.Color): THREE.BufferGeometry {
  const n = g.getAttribute("position").count;
  const p = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) p.set(params, i * 4);
  g.setAttribute("aCar", new THREE.BufferAttribute(p, 4));
  if (color) {
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set([color.r, color.g, color.b], i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  }
  return g;
}

/** RGBA vertex colours for glass: the pane's tint and its coverage. */
function withAlpha(g: THREE.BufferGeometry, alpha: number): THREE.BufferGeometry {
  const rgb = g.getAttribute("color");
  const n = g.getAttribute("position").count;
  const c = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) c.set([rgb ? rgb.getX(i) : 1, rgb ? rgb.getY(i) : 1, rgb ? rgb.getZ(i) : 1, alpha], i * 4);
  g.setAttribute("color", new THREE.BufferAttribute(c, 4));
  return g;
}

/** Where the display's reflection probe looks from (campus frame): between cars A and B, at door height. */
export const PROBE_AT: V3 = [-28.6, 1.35, -17.4];

/**
 * The box the probe's reflections are projected onto (plan frame B, SPEC §1.3): the glass gable
 * (x −30.05), the white N-block wall (z −4.62), the paving and the crown bridge; the open street
 * side stands at the buildings across Tykistökatu, the south side at the end of the pilotis (z ≈ 15).
 */
export const PROBE_BOX = { min: [-75, RECESS_FLOOR_Y, -4.62] as V3, max: [-30.05, 22.4, 15.0] as V3 };

/**
 * Box-projected (parallax-corrected) reflections. The probe sees the recess from one point; read as
 * an infinitely distant environment, a flat door panel would reflect one colour all over (the lit
 * atrium as a pale wash at night). Each fragment instead looks up the point where its reflected ray
 * meets PROBE_BOX, as the probe saw it, so the gable's mullions and the paving land where they belong.
 */
const PARALLAX_GLSL = /* glsl */ `
uniform vec3 uTwProbe;
uniform mat3 uTwBoxRot;
uniform vec3 uTwBoxOrigin;
uniform vec3 uTwBoxMin;
uniform vec3 uTwBoxMax;
uniform float uTwParallax;
varying vec3 vTwWorld;
vec3 twParallax( vec3 dir ) {
	if ( uTwParallax < 0.5 ) return dir;
	vec3 p = clamp( uTwBoxRot * ( vTwWorld - uTwBoxOrigin ), uTwBoxMin + 0.01, uTwBoxMax - 0.01 );
	vec3 d = uTwBoxRot * dir;
	d += vec3( equal( d, vec3( 0.0 ) ) ) * 1e-6;
	vec3 far = max( ( uTwBoxMax - p ) / d, ( uTwBoxMin - p ) / d );
	float t = min( min( far.x, far.y ), far.z );
	// Back to the campus frame (the rotation is orthonormal: v * M = transpose( M ) * v).
	vec3 hit = ( p + d * t ) * uTwBoxRot + uTwBoxOrigin;
	return normalize( hit - uTwProbe );
}
`;

/** Uniforms for PARALLAX_GLSL (shared by the paint and the glass); uTwParallax is 1 while the probe map is bound. */
function probeParallaxUniforms(): Record<string, THREE.IUniform> {
  const f = PLAN_FRAMES.B;
  const t = (f.theta * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return {
    uTwProbe: { value: new THREE.Vector3(...PROBE_AT) },
    // Campus → plan B (frame.ts localToPlan): x' = dx·c + dz·s, z' = −dx·s + dz·c.
    uTwBoxRot: { value: new THREE.Matrix3().set(c, 0, s, 0, 1, 0, -s, 0, c) },
    uTwBoxOrigin: { value: new THREE.Vector3(f.tx, f.y0, f.tz) },
    uTwBoxMin: { value: new THREE.Vector3(...PROBE_BOX.min) },
    uTwBoxMax: { value: new THREE.Vector3(...PROBE_BOX.max) },
    uTwParallax: { value: 0 },
  };
}

/** Patch a standard/physical shader for PARALLAX_GLSL (both the paint and the clear coat use getIBLRadiance). */
function installParallax(shader: { uniforms: Record<string, THREE.IUniform>; vertexShader: string; fragmentShader: string }, uniforms: Record<string, THREE.IUniform>): void {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vTwWorld;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\n\tvTwWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <envmap_physical_pars_fragment>",
    PARALLAX_GLSL +
      THREE.ShaderChunk.envmap_physical_pars_fragment.replace(
        "reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );",
        "reflectVec = twParallax( transformDirectionByInverseViewMatrix( reflectVec, viewMatrix ) );",
      ),
  );
}

/** The display's opaque material (see SLOT_PARAMS); `emit` scales the lamps, `parallax` from probeParallaxUniforms. */
export function makeSupercarMaterial(parallax?: Record<string, THREE.IUniform>): { material: THREE.MeshPhysicalMaterial; emit: THREE.IUniform<number> } {
  const emit = { value: 0 };
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });
  m.name = "supercars";
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTwEmit = emit;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec4 aCar;\nvarying vec4 vTwCar;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n\tvTwCar = aCar;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTwEmit;\nvarying vec4 vTwCar;")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n\troughnessFactor = vTwCar.x;")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\n\tmetalnessFactor = vTwCar.y;")
      .replace(
        "#include <lights_physical_fragment>",
        `#include <lights_physical_fragment>
	#ifdef USE_CLEARCOAT
		material.clearcoat = saturate( vTwCar.z );
		material.clearcoatRoughness = min( mix( 0.45, 0.03, smoothstep( 0.5, 0.95, vTwCar.z ) ) + geometryRoughness, 1.0 );
		// Under a clear coat the base sees the light refracted (≈ 40° inside at 75° outside), so it
		// does not brighten towards grazing as a bare surface would: the coat carries the grazing
		// reflection. Without this, black paint turns pale satin wherever it faces a bright scene.
		material.specularF90 = mix( 1.0, 0.25, material.clearcoat );
	#endif`,
      )
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += vColor.rgb * vTwCar.w * uTwEmit;");
    if (parallax) installParallax(shader, parallax);
  };
  m.customProgramCacheKey = () => (parallax ? "tw-supercars-px" : "tw-supercars");
  return { material: m, emit };
}

interface DisplayBuild {
  group: THREE.Group;
  /** Lamp brightness (time of day). */
  emit: THREE.IUniform<number>;
  /** Materials that reflect the local probe. */
  reflective: THREE.MeshStandardMaterial[];
  /** A mesh rendered every frame near the display (grabs the renderer for the probe). */
  hook: THREE.Mesh | null;
  /** Invisible boxes round the cars for picking (raycasting the detailed mesh would be slow). */
  pick: THREE.Group;
  spots: THREE.SpotLight[];
  /** 1 while the local probe's map is bound (box-projected reflections); null without a probe (low tier). */
  parallax: THREE.IUniform<number> | null;
  ready: Promise<void>;
}

/** Stanchion rope sagging between two posts. */
function ropeBetween(a: THREE.Vector3, b: THREE.Vector3, sag: number, seg: number): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const p = a.clone().lerp(b, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, 0.016, 6, false);
}

/** "Supercar display" sign face (event dressing). */
function signTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 540;
  const { canvas, ctx } = makeCanvas(W, H);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#121019");
  bg.addColorStop(1, "#08070d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = EVENT_VIOLET;
  ctx.fillRect(0, H - 26, W, 26);
  ctx.fillRect(64, 138, 64, 8);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `500 30px ${monoFont()}`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText("BIOCITY · TYKISTÖKATU 6", 64, 110);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 96px ${monoFont()}`;
  ctx.fillText("SUPERCAR", 64, 262);
  ctx.fillText("DISPLAY", 64, 366);
  ctx.fillStyle = "rgba(207,199,255,0.9)";
  ctx.font = `500 32px ${monoFont()}`;
  ctx.fillText("SINCE AI HACKATHON 2026 · PLEASE DO NOT TOUCH", 64, 452);
  return canvasTexture(canvas, { anisotropy: 8 });
}

/** Stanchion lines (posts in the campus frame): along car A's walkway side, round car B's open corner. */
export const STANCHION_LINES: readonly (readonly V2[])[] = [
  [
    [-28.95, -22.88],
    [-27.35, -20.6],
    [-25.75, -18.32],
    [-24.15, -16.04],
  ],
  [
    [-33.95, -15.18],
    [-32.0, -13.88],
    [-30.05, -12.58],
    [-28.1, -11.28],
  ],
];

/** The sign stand at the recess mouth, facing the street (north-west). */
const SIGN = { at: [-30.5, -24.0] as V2, heading: 325.1, tilt: 0.44 } as const;

function buildDisplay(ctx: TwinContext, terrain: Terrain | null): DisplayBuild {
  const group = new THREE.Group();
  group.name = "supercar-display";
  const detail = ctx.tier === "low" ? 0.5 : 1;
  const floorAt = (x: number, z: number) => Math.max(RECESS_FLOOR_Y, terrain ? terrain.heightAt(x, z) : RECESS_FLOOR_Y);
  const solidParts: THREE.BufferGeometry[] = [];
  const glassParts: THREE.BufferGeometry[] = [];
  const shadowGeos: THREE.BufferGeometry[] = [];
  const pick = new THREE.Group();
  pick.name = "supercars-pick";
  pick.userData.pickId = "supercars";
  const m = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  for (const car of DISPLAY_CARS) {
    const bag = buildGClass({
      detail,
      bodyColouredTrim: car.paint !== "white",
      spareCentre: car.paint === "obsidian" ? "black" : "paint",
      caliper: car.paint === "obsidian" ? "#b1201c" : "#5a5d61",
    });
    const [x, z] = car.at;
    const y = floorAt(x, z);
    m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(up, (-car.heading * Math.PI) / 180), new THREE.Vector3(1, 1, 1));
    bag.transform(m);
    const paint = PAINTS[car.paint];
    for (const slot of [...bag.parts.keys()]) {
      const g = bag.merged(slot);
      if (!g) continue;
      if (slot === "glass" || slot === "tint" || slot === "lens") glassParts.push(withAlpha(g, GLASS_ALPHA[slot]));
      else if (slot === "paint") solidParts.push(withParams(g, paint.params, new THREE.Color(paint.color)));
      else solidParts.push(withParams(g, SLOT_PARAMS[slot], slot === "chrome" ? CHROME : undefined));
    }
    // Contact shadow plane under the car.
    const plane = new THREE.PlaneGeometry(GCLASS.length + 1.2, GCLASS.width + 1.0);
    plane.rotateX(-Math.PI / 2);
    plane.rotateY(Math.PI / 2);
    plane.applyMatrix4(m);
    plane.translate(0, 0.008, 0);
    shadowGeos.push(plane);
    // Pick box (invisible; picking walks up to the group's pickId).
    const box = new THREE.Mesh(new THREE.BoxGeometry(GCLASS.width + 0.2, GCLASS.height, GCLASS.lengthWithSpare));
    box.applyMatrix4(m);
    box.position.y += GCLASS.height / 2;
    box.visible = false;
    pick.add(box);
  }

  // Event dressing: stanchions with violet ropes along the walkway.
  const post: Params = SLOT_PARAMS.chrome;
  const rope: Params = [0.85, 0, 0, 0];
  const ropeColour = new THREE.Color("#3a2b8f");
  for (const line of STANCHION_LINES) {
    const tops = line.map(([x, z]) => {
      const y = floorAt(x, z);
      solidParts.push(withParams(cyl("y", x, y + 0.012, z, 0.17, 0.17, 0.024, 20), post, CHROME));
      solidParts.push(withParams(cyl("y", x, y + 0.5, z, 0.026, 0.026, 0.96, 12), post, CHROME));
      solidParts.push(withParams(new THREE.SphereGeometry(0.04, 12, 8).translate(x, y + 0.99, z), post, CHROME));
      return new THREE.Vector3(x, y + 0.93, z);
    });
    for (let i = 0; i + 1 < tops.length; i++) solidParts.push(withParams(ropeBetween(tops[i], tops[i + 1], 0.14, 10), rope, ropeColour));
  }
  // Sign stand: post, base and a lectern panel tilted back; the printed face is its own mesh.
  const signM = new THREE.Matrix4().compose(
    new THREE.Vector3(SIGN.at[0], floorAt(SIGN.at[0], SIGN.at[1]), SIGN.at[1]),
    new THREE.Quaternion().setFromAxisAngle(up, (-SIGN.heading * Math.PI) / 180),
    new THREE.Vector3(1, 1, 1),
  );
  const dark = new THREE.Color("#141416");
  {
    const panel = rbox(0, 0, 0, 0.82, 0.44, 0.025, 0.008, 1);
    panel.rotateX(SIGN.tilt);
    panel.translate(0, 1.08, 0);
    const stand = [
      withParams(cyl("y", 0, 0.5, 0.05, 0.022, 0.022, 1.0, 10), post, CHROME),
      withParams(cyl("y", 0, 0.01, 0.05, 0.2, 0.2, 0.02, 20), post, CHROME),
      withParams(panel, SLOT_PARAMS.trim, dark),
    ];
    for (const g of stand) solidParts.push(g.applyMatrix4(signM));
  }

  // One opaque mesh for everything (cars, stanchions, ropes, sign stand).
  // Box-projected probe reflections where there is a probe (ultra/high).
  const parallax = ctx.tier !== "low" ? probeParallaxUniforms() : undefined;
  const { material: solidMat, emit } = makeSupercarMaterial(parallax);
  const solidGeo = mergeAll(solidParts.map((g) => stripTo(g, ["position", "normal", "color", "aCar"])));
  const solid = new THREE.Mesh(solidGeo, solidMat);
  solid.name = "supercars";
  // Shadows come from a light stand-in (below): the detailed mesh would be drawn again per cascade.
  solid.castShadow = false;
  solid.receiveShadow = true;
  group.add(solid);
  // Shadow stand-in: the simple display car per bay, drawn only into shadow maps (writes no colour or depth).
  {
    const parts: THREE.BufferGeometry[] = [];
    for (const car of DISPLAY_CARS) {
      const g = buildGClassFar();
      g.deleteAttribute("aPart");
      g.applyMatrix4(
        new THREE.Matrix4().compose(
          new THREE.Vector3(car.at[0], floorAt(car.at[0], car.at[1]), car.at[1]),
          new THREE.Quaternion().setFromAxisAngle(up, (-car.heading * Math.PI) / 180),
          new THREE.Vector3(0.985, 0.99, 0.985),
        ),
      );
      parts.push(g);
    }
    const proxyMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
    proxyMat.name = "supercars-shadow-proxy";
    const proxy = new THREE.Mesh(mergeAll(parts), proxyMat);
    proxy.name = "supercars-shadow-proxy";
    proxy.castShadow = true;
    proxy.receiveShadow = false;
    // Not a visible surface: keep it out of the AO normal pass too.
    proxy.userData.noAO = true;
    group.add(proxy);
  }
  // Glass (side windows, screens, lamp lenses): one transparent pass, reflections at full strength.
  const glassMat = ctx.materials.variant("carGlass", { opacity: 1 });
  glassMat.vertexColors = true;
  glassMat.forceSinglePass = true;
  glassMat.name = "supercars-glass";
  if (parallax) {
    glassMat.onBeforeCompile = (shader) => installParallax(shader, parallax);
    glassMat.customProgramCacheKey = () => "tw-supercars-glass-px";
  }
  const glass = new THREE.Mesh(mergeAll(glassParts.map((g) => stripTo(g, ["position", "normal", "color"]))), glassMat);
  glass.name = "supercars-glass";
  glass.renderOrder = 3;
  group.add(glass);
  // Contact shadows.
  {
    const tex = contactShadowTexture(GCLASS.length, GCLASS.width, GCLASS.wheelbase, GCLASS.track);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    mat.name = "car-contact-shadow";
    const mesh = new THREE.Mesh(mergeAll(shadowGeos), mat);
    mesh.name = "supercars-contact-shadows";
    mesh.renderOrder = 1;
    group.add(mesh);
  }
  // Printed sign face, just in front of the panel.
  {
    const face = new THREE.PlaneGeometry(0.78, 0.41);
    face.rotateY(Math.PI);
    face.rotateX(SIGN.tilt);
    face.translate(0, 1.08 + Math.sin(SIGN.tilt) * 0.0135, -Math.cos(SIGN.tilt) * 0.0135);
    face.applyMatrix4(signM);
    const mesh = new THREE.Mesh(face, new THREE.MeshStandardMaterial({ map: signTexture(), roughness: 0.5 }));
    mesh.name = "supercar-sign";
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // Two 4000 K spots from the bridge soffit (after dark only; intensity 0 by day keeps the shader stable).
  const spots: THREE.SpotLight[] = [];
  const spotColor = kelvinToLinear(4000);
  for (const car of DISPLAY_CARS.slice(0, 2)) {
    const [x, z] = car.at;
    const spot = new THREE.SpotLight(spotColor, 0, 40, 0.2, 0.7, 2);
    spot.name = `supercar-spot-${car.id}`;
    // Under the crown bridge (y ≈ 22.4), towards the street side of the car.
    const dx = -0.57;
    const dz = -0.82;
    spot.position.set(x + dx * 6, 21.8, z + dz * 6);
    spot.target.position.set(x, floorAt(x, z) + 0.8, z);
    spot.castShadow = ctx.tier === "ultra";
    // Rendered once (so the map exists), then only while the spots are on (see setLighting).
    spot.shadow.autoUpdate = false;
    spot.shadow.needsUpdate = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.camera.near = 12;
    spot.shadow.camera.far = 34;
    spot.shadow.bias = -0.0003;
    spot.shadow.normalBias = 0.02;
    spot.shadow.radius = 3;
    group.add(spot, spot.target);
    spots.push(spot);
  }
  return {
    group,
    emit,
    reflective: [solidMat, glassMat],
    hook: solid,
    pick,
    spots,
    parallax: (parallax?.uTwParallax as THREE.IUniform<number> | undefined) ?? null,
    ready: Promise.resolve(),
  };
}

/** Keep only the named attributes (mergeGeometries needs identical sets). */
function stripTo(g: THREE.BufferGeometry, keep: readonly string[]): THREE.BufferGeometry {
  for (const name of Object.keys(g.attributes)) if (!keep.includes(name)) g.deleteAttribute(name);
  if (!g.getAttribute("normal")) g.computeVertexNormals();
  return g.index ? g.toNonIndexed() : g;
}

/** Merge and dispose the parts. */
function mergeAll(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!g) throw new Error("vehicles: could not merge the display");
  return g;
}

/**
 * Put the sky dome into "environment" mode (as sky/sky.ts does for scene.environment) and return
 * a function that restores it. A no-op when the sky is missing or its shader has changed.
 */
function envSkySettings(scene: THREE.Scene): () => void {
  const sky = scene.getObjectByName("sky") as THREE.Mesh | undefined;
  const u = (sky?.material as THREE.ShaderMaterial | undefined)?.uniforms;
  if (!u || !u.uEnvCap || !u.uHazeBlend || !u.uVisCap || !u.sunPosition || !u.uSkyScale) return () => undefined;
  const saved = { cap: u.uEnvCap.value as number, haze: u.uHazeBlend.value as number, vis: u.uVisCap.value as number };
  const zen = preethamRadiance(
    new THREE.Vector3(0, 1, 0),
    u.sunPosition.value as THREE.Vector3,
    {
      turbidity: u.turbidity.value as number,
      rayleigh: u.rayleigh.value as number,
      mieCoefficient: u.mieCoefficient.value as number,
      mieDirectionalG: u.mieDirectionalG.value as number,
    },
    new THREE.Vector3(),
  );
  const zenLum = (0.2126 * zen.x + 0.7152 * zen.y + 0.0722 * zen.z) * (u.uSkyScale.value as number);
  u.uEnvCap.value = Math.max(zenLum * 3, 0.002);
  u.uHazeBlend.value = 0;
  u.uVisCap.value = 1e9;
  return () => {
    u.uEnvCap.value = saved.cap;
    u.uHazeBlend.value = saved.haze;
    u.uVisCap.value = saved.vis;
  };
}

/**
 * A local reflection probe for the display: the recess (white wall, glass
 * gable, pilotis, street, sky) captured into a cube map and prefiltered
 * (PMREM), so the paint and glass reflect their real surroundings instead of a
 * featureless sky. Captured on the first frame near the display and again
 * when the time of day changes or new modules appear; never every frame.
 */
class ReflectionProbe {
  private rt: THREE.WebGLCubeRenderTarget;
  private cube: THREE.CubeCamera;
  private env: THREE.WebGLRenderTarget | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private dirty = false;
  /** Frames to wait before a requested capture (see invalidate). */
  private wait = 0;
  /** No capture before this time (ms): the time slider changes the environment up to ~8× a second. */
  private settleUntil = 0;
  private sceneEnv: THREE.Texture | null = null;
  private moduleCount = -1;
  private captures = 0;
  private lastCapture = 0;

  constructor(
    readonly position: THREE.Vector3,
    size: number,
    private readonly materials: THREE.MeshStandardMaterial[],
    /** Kept out of the capture: the display itself and the traffic (frozen cars would linger in the paint). */
    private readonly hide: readonly THREE.Object3D[],
    /** Box projection switch of the materials (on once the probe's map is bound). */
    private readonly parallax: THREE.IUniform<number> | null = null,
  ) {
    this.rt = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: false });
    this.cube = new THREE.CubeCamera(0.3, 6000, this.rt);
    this.cube.position.copy(position);
  }

  /** Grab the renderer and scene from a render callback. */
  attach(mesh: THREE.Mesh): void {
    const prev = mesh.onBeforeRender;
    mesh.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
      this.renderer = renderer;
      this.scene = scene as THREE.Scene;
      prev.call(mesh, renderer, scene, camera, geometry, material, group);
    };
  }

  /**
   * Capture again soon. Not in this frame: modules tick before the engine rebuilds
   * scene.environment for a new time of day, and a capture lit by the previous
   * (daylight) environment would bleach the paint at night.
   */
  invalidate(): void {
    this.dirty = true;
    this.wait = Math.max(this.wait, 2);
  }

  /** Capture when needed and the camera is close; true when it captured (request a frame). */
  update(camera: THREE.Camera, now: number): boolean {
    const renderer = this.renderer;
    const scene = this.scene;
    if (!renderer || !scene) return false;
    // A new environment (time of day, sky look) or a module arriving or leaving: capture again once
    // things settle (one capture after a slider drag or a burst of modules, not one per change).
    if (scene.environment !== this.sceneEnv || scene.children.length !== this.moduleCount) {
      this.sceneEnv = scene.environment;
      this.moduleCount = scene.children.length;
      this.dirty = true;
      this.settleUntil = now + 250;
    }
    if (this.wait > 0) {
      this.wait--;
      return false;
    }
    if (camera.position.distanceTo(this.position) > 260) return false;
    // Textures and buildings that stream in after the first capture: refresh twice more early on.
    if (!this.dirty && this.captures > 0 && this.captures < 3 && now - this.lastCapture > 4000) this.dirty = true;
    if (!this.dirty || now < this.settleUntil) return false;
    this.dirty = false;
    this.captures++;
    this.lastCapture = now;
    const wasVisible = this.hide.map((o) => o.visible);
    const autoUpdate = renderer.shadowMap.autoUpdate;
    const autoClear = renderer.autoClear;
    const clearColor = renderer.getClearColor(new THREE.Color());
    const clearAlpha = renderer.getClearAlpha();
    // The visible sky dome is tuned for direct viewing (after sunset its glow is left uncapped for
    // bloom); reflected in paint it would bleach the cars. Capture it with the settings the engine
    // uses for its own environment (sky/sky.ts rebuildEnvironment): aureole capped at 3× the
    // zenith, no horizon haze, no visible-dome limiter. Lens flare sprites stay out.
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (o.visible && (o as THREE.Object3D & { isLensflare?: boolean }).isLensflare === true) hidden.push(o);
    });
    for (const o of hidden) o.visible = false;
    const restoreSky = envSkySettings(scene);
    // Meshes only: the display spots stay in (the lit floor shows in the paint, and hiding lights
    // would change the light count and recompile every material in the scene for this pass).
    for (const o of this.hide) o.visible = false;
    renderer.shadowMap.autoUpdate = false;
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 1);
    try {
      this.cube.update(renderer, scene);
      // Captures are rare: free the generator's blur buffers (≈ 6 MB at 256) in between.
      const pmrem = new THREE.PMREMGenerator(renderer);
      const next = pmrem.fromCubemap(this.rt.texture);
      pmrem.dispose();
      const prev = this.env;
      this.env = next;
      for (const m of this.materials) {
        m.envMap = next.texture;
        m.needsUpdate = true;
      }
      if (this.parallax) this.parallax.value = 1;
      prev?.dispose();
    } finally {
      restoreSky();
      this.hide.forEach((o, i) => (o.visible = wasVisible[i]));
      for (const o of hidden) o.visible = true;
      renderer.shadowMap.autoUpdate = autoUpdate;
      renderer.autoClear = autoClear;
      renderer.setClearColor(clearColor, clearAlpha);
    }
    return true;
  }

  dispose(): void {
    if (this.parallax) this.parallax.value = 0;
    for (const m of this.materials) if (m.envMap === this.env?.texture) m.envMap = null;
    this.env?.dispose();
    this.rt.dispose();
  }
}

// ── Street data (derived offline, see the comment on LANES) ──────────────────

/** Lane centre lines [x0, z0, x1, z1, …] (campus frame), derived offline from the City kerb lines (streets.json) along the OSM ways. */
export const LANES: Record<string, readonly number[]> = {
  "tyk-ne-1": [
    -171.68, 78.87, -165.27, 73.99, -156.62, 67.02, -152.69, 64.13, -120.52, 42.86, -116.26, 40.25, -112.72,
    38.36, -109.03, 36.67, -99.61, 32.75, -96.87, 31.42, -93.35, 29.45, -87.44, 25.67, -65.88, 11.18, -57.29,
    5.74, -54.61, 3.83, -52.86, 2.39, -51.19, 0.8, -49.64, -0.93, -48.22, -2.77, -46.93, -4.69, -45.24, -7.62,
    -41.46, -15.2, -39.51, -18.73, -37.37, -22.14, -30.13, -33, -24.79, -41.61, -22.28, -46, -19.89, -50.42,
    -9.93, -70.12, -7.52, -74.5, -4.98, -78.81, -2.83, -82.17, -0.49, -85.41, 1.44, -87.73, 3.54, -89.94, 6.56,
    -92.71, 14.51, -99.21, 17.56, -101.89, 21.08, -105.28, 26.55, -110.92, 28.1, -112.01, 33.7, -115.54, 40.33,
    -120.17, 47.85, -125.11, 54.16, -129.69, 58.09, -132.75, 60.36, -134.74, 61.82, -136.17, 67.36, -142.26,
    69.51, -144.44, 72.53, -147.11, 75.68, -149.59, 83.82, -155.39, 105.25, -170.11, 138.9, -193.39, 157.93,
    -206.27
  ],
  "tyk-ne-2": [
    -173.62, 76.26, -167.35, 71.49, -158.9, 64.71, -154.84, 61.7, -122.34, 40.17, -118.07, 37.56, -114.53,
    35.66, -110.85, 33.98, -101.43, 30.06, -98.7, 28.73, -95.19, 26.77, -89.28, 22.99, -67.72, 8.5, -59.18,
    3.1, -56.59, 1.26, -54.93, -0.11, -53.35, -1.62, -51.9, -3.26, -50.57, -5.01, -49.36, -6.84, -47.77, -9.66,
    -44.1, -17.11, -42.15, -20.64, -40.01, -24.03, -32.8, -34.86, -27.01, -44.25, -22.65, -52.14, -12.7,
    -71.82, -10.29, -76.21, -7.75, -80.51, -5.59, -83.88, -3.24, -87.13, -1.31, -89.46, 0.8, -91.68, 4.62,
    -95.16, 11.05, -100.4, 14.15, -103.08, 17.78, -106.52, 23.52, -112.36, 24.81, -113.5, 26.47, -114.67,
    31.43, -117.83, 38.43, -122.8, 45.94, -127.74, 52.34, -132.38, 56.27, -135.44, 58.55, -137.44, 60, -138.86,
    65.53, -144.95, 67.68, -147.12, 70.69, -149.79, 73.84, -152.26, 81.97, -158.07, 103.38, -172.76, 137.08,
    -196.09, 156.12, -208.97
  ],
  "tyk-sw-1": [
    127.92, -209.51, 122.92, -206.19, 118.67, -203.55, 114.32, -201.04, 99.31, -192.82, 95.02, -190.23, 90.83,
    -187.49, 82.6, -181.8, 77.77, -178.22, 73.88, -175.04, 65.58, -167.68, 62.42, -165.2, 60.76, -164.06,
    58.18, -162.52, 50.93, -158.86, 48.27, -157.32, 46.56, -156.15, 44.91, -154.85, 43.34, -153.43, 41.86,
    -151.91, 39.12, -148.74, 34.72, -143.15, 32.17, -140.06, 29.45, -137.09, 24.22, -131.91, 21.93, -129.5,
    17.32, -124.1, 13.33, -119.62, 11.54, -117.4, 9.74, -114.94, 6.9, -110.66, 1.49, -102.05, -33.37, -45.86,
    -38.11, -38.37, -40.33, -35.06, -42.72, -31.86, -44.66, -29.59, -49.42, -24.43, -51.27, -22.07, -53.35,
    -18.73, -56.38, -12.78, -58.26, -9.54, -59.34, -7.99, -60.52, -6.51, -62.51, -4.43, -64.75, -2.56, -67.21,
    -0.9, -69.83, 0.58, -76.97, 4.34, -82.93, 8.04, -140.39, 46.29, -156.47, 57.2, -159.71, 59.18, -162.29,
    60.62, -177.65, 68.6
  ],
  "lem-se": [
    -180.24, -190.29, -170.91, -177.34, -159.59, -160.88, -135.66, -126.34, -133.31, -123.08, -130.18, -119.17,
    -122.01, -110.31, -116.16, -103.43, -110.19, -96.63, -107.06, -92.72, -102.95, -87.06, -100.7, -83.75,
    -98.55, -80.37, -93.09, -70.76, -89.86, -65.7, -87.54, -62.45, -85.71, -60.08, -79.88, -53.17, -77.4,
    -50.02, -74.49, -45.96, -72.31, -42.6, -70.31, -39.12, -67.08, -32.84, -65.62, -30.2, -63.48, -26.82,
    -59.51, -21.06, -57.46, -17.62, -55.68, -14.02, -51.29, -3.79, -49.89, -1.12, -48.84, 0.59, -46.48, 3.84,
    -41.33, 10.08, -37.68, 14.87, -32.51, 22.23, -9.27, 56.06, -5.62, 60.94, -2.25, 64.8, -0.07, 66.97, 2.19,
    69.02, 8.36, 74.18, 99.43, 147.6, 103.91, 151.61, 110.12, 158.24, 112.32, 160.29, 113.9, 161.51, 115.57,
    162.63, 121.71, 166.19, 124.25, 167.8, 126.7, 169.54, 130.65, 172.6, 180.44, 212.76, 235.16, 257.96,
    262.36, 279.99
  ],
  "lem-nw": [
    264.62, 277.19, 237.44, 255.17, 182.71, 209.97, 132.9, 169.79, 128.94, 166.72, 126.49, 164.98, 123.95,
    163.36, 117.83, 159.82, 116.16, 158.71, 114.58, 157.48, 112.37, 155.44, 106.16, 148.81, 101.69, 144.8,
    10.64, 71.39, 4.54, 66.29, 2.36, 64.31, 0.3, 62.26, -2.88, 58.61, -6.39, 53.9, -29.56, 20.16, -34.73, 12.8,
    -38.36, 8.05, -43.46, 1.89, -45.8, -1.34, -46.84, -3.05, -48.24, -5.71, -52.64, -15.94, -54.42, -19.55,
    -56.48, -23, -60.49, -28.83, -62.65, -32.24, -64.12, -34.89, -67.36, -41.19, -69.36, -44.66, -71.54,
    -48.02, -74.45, -52.09, -76.94, -55.24, -82.77, -62.16, -84.61, -64.53, -86.92, -67.78, -90.13, -72.82,
    -95.6, -82.44, -97.75, -85.82, -100.01, -89.13, -104.11, -94.8, -107.25, -98.7, -113.22, -105.51, -119.11,
    -112.45, -127.32, -121.35, -130.43, -125.23, -132.74, -128.45, -156.62, -162.91, -167.96, -179.4, -177.34,
    -192.42
  ],
  "jouk-se": [
    -4.85, -199.66, -4.13, -197.78, -2.78, -194.94, -1.23, -192.15, -0.03, -190.35, 1.94, -187.8, 8.58,
    -179.97, 21.38, -163.34, 28.92, -153.99, 31.19, -150.68, 38.05, -139.6, 45.72, -127.96, 48.69, -123.96,
    55.67, -115.45, 58.65, -111.44, 77.13, -84.13, 81.16, -78.42, 86.06, -72.06, 88.06, -69.73, 89.5, -68.27,
    91.06, -66.92, 92.74, -65.73, 98.89, -62.22, 101.28, -60.49, 102.75, -59.17, 104.15, -57.76, 109.59,
    -51.83, 112.39, -48.93, 114.59, -46.87, 116.13, -45.58, 118.55, -43.8, 124.37, -39.87, 128.38, -36.89,
    165.07, -7.59, 169.13, -4.66, 177.47, 0.9, 182.24, 4.52, 186.78, 8.44, 193.98, 15.44, 198.47, 19.43,
    230.23, 45.01, 234.74, 48.85, 244.39, 57.63, 251.99, 64.21, 262.88, 72.99, 278.24, 85.73, 308.5, 110.37,
    312.22, 113.72, 318.49, 120.3, 321.44, 123.01, 323.85, 124.79, 329.79, 128.55, 332.28, 130.23, 335.49,
    132.61, 340.99, 136.93
  ],
  "jouk-nw": [
    343.21, 134.1, 337.7, 129.77, 334.48, 127.39, 331.98, 125.71, 326.02, 121.96, 323.6, 120.18, 320.65,
    117.45, 316.51, 113, 314.38, 110.85, 310.66, 107.49, 279.71, 82.28, 265.06, 70.1, 254.15, 61.32, 242.85,
    51.68, 233.94, 43.6, 229.34, 39.68, 200.49, 16.42, 196, 12.42, 188.79, 5.41, 184.23, 1.5, 179.43, -2.12,
    171.07, -7.68, 167.02, -10.62, 134.98, -36.25, 130.24, -39.94, 126.08, -42.75, 119.88, -46.21, 118.17,
    -47.28, 116.56, -48.47, 115.07, -49.8, 113.67, -51.25, 109.69, -55.83, 106.48, -59.36, 104.88, -61.44,
    104.08, -62.93, 103.48, -64.54, 102.22, -70.1, 101.29, -73.01, 100, -75.82, 97.95, -79.35, 93.02, -86.91,
    84.24, -99.09, 73, -115.64, 70.59, -118.84, 66.73, -123.48, 64.9, -125.86, 63.24, -128.37, 60.17, -133.56,
    57.88, -136.86, 54.65, -140.72, 47.15, -148.88, 43.95, -152.74, 41.61, -155.99, 37.25, -162.71, 34.96,
    -165.99, 21.69, -183.55, 15.74, -191.67, 13.83, -194.1, 12.42, -195.64, 10.89, -197.07, 8.37, -198.94,
    6.58, -200, 4.76, -200.95, 0.15, -203.06
  ],
  "sirk-e": [
    -125.09, -114.03, -118.55, -118.64, -108.25, -126.67, -101.7, -131.24, -57.67, -160.53, -52.61, -163.74,
    -44.89, -168.37, -40.72, -171.11, -30.22, -178.77, -15.42, -188.97, -12.21, -191.35, -5.1, -196.89, -0.25,
    -200.41
  ],
  "sirk-w": [
    -2.22, -203.42, -7.08, -199.9, -14.19, -194.36, -17.41, -191.97, -32.21, -181.77, -42.71, -174.11, -46.88,
    -171.37, -54.59, -166.74, -59.65, -163.54, -103.73, -134.22, -110.28, -129.64, -120.53, -121.64, -127.06,
    -117.04
  ],
};

/** On-street parking (parallel): centre lines of the parked rows, keyed by the lane whose right side they line. */
export const PARKING_STRIPS: Record<string, readonly (readonly number[])[]> = {
  "lem-se": [
    [-44.04, 10.33, -43.38, 11.05, -39.89, 15.83, -13.61, 54.71],
    [2.86, 73.04, 22.35, 88.78],
    [64.46, 122.61, 99.46, 150.72],
    [122.15, 169.01, 161.69, 200.87],
  ],
  "lem-nw": [
    [181.16, 205.39, 123.87, 159.33],
    [104.17, 143.61, 65.99, 112.7],
    [24.74, 79.39, 9.16, 66.92],
    [-1.51, 55.84, -38.85, 2.45],
  ],
  "sirk-e": [
    [-106.6, -124.54, -80.85, -141.89, -49.97, -162.45, -49.12, -163, -48.17, -163.35, -47.08, -163.49],
    [-35, -171.26, -34.47, -172.24, -33.76, -172.97, -17.15, -184.19],
  ],
  "sirk-w": [
    [-22.39, -191.95, -69.04, -160.5, -95.94, -142.82, -111.95, -132.14],
  ],
  "jouk-se": [
    [121.5, -37.4, 144.3, -19.3, 167.2, -1.2],
  ],
  "jouk-nw": [
  ],
};

// ── Polylines (pure, unit-tested) ────────────────────────────────────────────

/** A polyline on the ground plane with arc-length lookups. */
export class Polyline {
  readonly pts: V2[];
  readonly cum: number[];
  readonly length: number;

  constructor(flatOrPts: readonly number[] | readonly V2[]) {
    const pts: V2[] = [];
    if (flatOrPts.length && typeof flatOrPts[0] === "number") {
      const f = flatOrPts as readonly number[];
      for (let i = 0; i + 1 < f.length; i += 2) pts.push([f[i], f[i + 1]]);
    } else for (const p of flatOrPts as readonly V2[]) pts.push([p[0], p[1]]);
    this.pts = pts;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.length = this.cum[this.cum.length - 1] ?? 0;
  }

  private seg(s: number): number {
    const c = this.cum;
    let lo = 0;
    let hi = c.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (c[mid] <= s) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  /** Point at distance s (clamped to the ends). */
  at(s: number, out: V2 = [0, 0]): V2 {
    const t = clamp(s, 0, this.length);
    const i = this.seg(t);
    const a = this.pts[i];
    const b = this.pts[Math.min(i + 1, this.pts.length - 1)];
    const l = this.cum[Math.min(i + 1, this.cum.length - 1)] - this.cum[i];
    const k = l > 1e-9 ? (t - this.cum[i]) / l : 0;
    out[0] = a[0] + (b[0] - a[0]) * k;
    out[1] = a[1] + (b[1] - a[1]) * k;
    return out;
  }

  /** Smoothed unit direction at s (chord over ±h metres; the chord slides inside the line at its ends). */
  dir(s: number, h = 2, out: V2 = [0, 0]): V2 {
    const s0 = Math.max(0, Math.min(s - h, this.length - 2 * h));
    const a = this.at(s0, [0, 0]);
    const b = this.at(s0 + 2 * h, [0, 0]);
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l = Math.hypot(dx, dz) || 1;
    out[0] = dx / l;
    out[1] = dz / l;
    return out;
  }

  /** Distance along the line of the closest point to p, and the distance to it. */
  project(p: V2): { s: number; d: number } {
    let best = Infinity;
    let bestS = 0;
    for (let i = 0; i + 1 < this.pts.length; i++) {
      const a = this.pts[i];
      const b = this.pts[i + 1];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const l2 = dx * dx + dz * dz;
      const t = l2 > 0 ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2, 0, 1) : 0;
      const d = Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dz * t));
      if (d < best) {
        best = d;
        bestS = this.cum[i] + t * Math.sqrt(l2);
      }
    }
    return { s: bestS, d: best };
  }

  /** Every s where the line crosses the segment a–b. */
  crossings(a: V2, b: V2): number[] {
    const out: number[] = [];
    for (let i = 0; i + 1 < this.pts.length; i++) {
      const p = this.pts[i];
      const q = this.pts[i + 1];
      const rx = q[0] - p[0];
      const rz = q[1] - p[1];
      const sx = b[0] - a[0];
      const sz = b[1] - a[1];
      const den = rx * sz - rz * sx;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((a[0] - p[0]) * sz - (a[1] - p[1]) * sx) / den;
      const u = ((a[0] - p[0]) * rz - (a[1] - p[1]) * rx) / den;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) out.push(this.cum[i] + t * Math.hypot(rx, rz));
    }
    return out;
  }
}

// ── Traffic signals and car following (pure, unit-tested) ────────────────────

/** Signal plan: phase A (main road) green, amber, all-red, phase B green, amber, all-red (seconds). */
export const SIGNAL_PLAN = { greenA: 30, greenB: 22, amber: 3, allRed: 2 } as const;

export type SignalColour = "green" | "amber" | "red";

/** Colour shown to a phase at time t (s) for a junction offset (s). */
export function signalColour(phase: "A" | "B", t: number, offset = 0): SignalColour {
  const { greenA, greenB, amber, allRed } = SIGNAL_PLAN;
  const cycle = greenA + amber + allRed + greenB + amber + allRed;
  const u = (((t + offset) % cycle) + cycle) % cycle;
  const aEnd = greenA;
  const aAmber = aEnd + amber;
  const bStart = aAmber + allRed;
  const bEnd = bStart + greenB;
  const bAmber = bEnd + amber;
  if (phase === "A") return u < aEnd ? "green" : u < aAmber ? "amber" : "red";
  return u >= bStart && u < bEnd ? "green" : u >= bEnd && u < bAmber ? "amber" : "red";
}

/** Intelligent Driver Model acceleration (m/s²) towards v0 behind a leader `gap` m ahead closing at dv. */
export function idmAccel(v: number, v0: number, gap: number, dv: number, p: { a: number; b: number; T: number; s0: number } = { a: 1.4, b: 2.4, T: 1.3, s0: 2.2 }): number {
  const free = 1 - Math.pow(Math.max(v, 0) / Math.max(v0, 0.1), 4);
  if (!Number.isFinite(gap)) return p.a * free;
  const sStar = p.s0 + Math.max(0, v * p.T + (v * dv) / (2 * Math.sqrt(p.a * p.b)));
  const g = Math.max(gap, 0.1);
  return p.a * (free - (sStar / g) * (sStar / g));
}

// ── Parking (pure, unit-tested) ──────────────────────────────────────────────

export interface Stall {
  x: number;
  z: number;
  /** Compass heading of the parked car's nose. */
  heading: number;
  kind: "lot" | "street";
  /** Deterministic 0…1: the stall is taken while rank < occupancy. */
  rank: number;
}

const DEG = 180 / Math.PI;
const headingOf = (dx: number, dz: number) => ((Math.atan2(dx, -dz) * DEG) % 360 + 360) % 360;

/** Long axis (unit) and size of a convex-ish 4-corner space. */
function spaceAxis(poly: readonly V2[]): { c: V2; u: V2; len: number; wid: number } | null {
  if (poly.length < 4) return null;
  const c: V2 = [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
  let best = 0;
  let u: V2 = [1, 0];
  let other = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l > best) {
      other = best;
      best = l;
      u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    } else if (l > other) other = l;
  }
  return { c, u, len: best, wid: other };
}

/** Stalls from mapped parking spaces (OSM amenity=parking_space). */
export function stallsFromSpaces(spaces: readonly (readonly V2[])[], seed: number): Stall[] {
  const rnd = mulberry32(seed);
  const out: Stall[] = [];
  for (const poly of spaces) {
    const a = spaceAxis(poly);
    if (!a || a.len < 3.8 || a.len > 7.5 || a.wid < 1.9) continue;
    const flip = rnd() < 0.5 ? 1 : -1;
    out.push({ x: a.c[0], z: a.c[1], heading: headingOf(a.u[0] * flip, a.u[1] * flip) + (rnd() - 0.5) * 4, kind: "lot", rank: rnd() });
  }
  return out;
}

/**
 * Stalls laid out in a parking area with no mapped spaces: rows of 2.5 × 5.0 m
 * bays perpendicular to the area's longest edge, double rows back to back with
 * 6 m aisles; a bay is kept when it lies fully inside the area and outside
 * every `blocked` ring. Narrow strips (≤ 4 m) get parallel bays (6 m).
 */
export function layoutStalls(poly: readonly V2[], blocked: readonly (readonly V2[])[], seed: number): Stall[] {
  if (poly.length < 3) return [];
  const rnd = mulberry32(seed);
  // Dominant direction: the longest edge.
  let best = 0;
  let u: V2 = [1, 0];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l > best) {
      best = l;
      u = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    }
  }
  const v: V2 = [-u[1], u[0]];
  const toUV = (p: readonly number[]): V2 => [p[0] * u[0] + p[1] * u[1], p[0] * v[0] + p[1] * v[1]];
  const fromUV = (a: number, b: number): V2 => [a * u[0] + b * v[0], a * u[1] + b * v[1]];
  const uv = poly.map((p) => toUV(p));
  const minU = Math.min(...uv.map((p) => p[0]));
  const maxU = Math.max(...uv.map((p) => p[0]));
  const minV = Math.min(...uv.map((p) => p[1]));
  const maxV = Math.max(...uv.map((p) => p[1]));
  const inside = (p: V2) => pointInRing(p, poly) && !blocked.some((r) => pointInRing(p, r));
  const fits = (cu: number, cv: number, hu: number, hv: number) =>
    [
      [cu - hu, cv - hv],
      [cu + hu, cv - hv],
      [cu + hu, cv + hv],
      [cu - hu, cv + hv],
      [cu, cv],
    ].every(([a, b]) => inside(fromUV(a, b)));
  const out: Stall[] = [];
  const depth = maxV - minV;
  if (depth <= 4.2) {
    // Parallel bays along the strip.
    const cv = (minV + maxV) / 2;
    for (let cu = minU + 3.1; cu <= maxU - 3.0; cu += 6.0) {
      if (!fits(cu, cv, 2.45, 0.85)) continue;
      const p = fromUV(cu, cv);
      out.push({ x: p[0], z: p[1], heading: headingOf(u[0], u[1]) + (rnd() - 0.5) * 3, kind: "lot", rank: rnd() });
    }
    return out;
  }
  // Rows: [bays 5.0][bays 5.0][aisle 6.0] repeating, starting from the edge.
  const pattern = [5.0, 5.0, 6.0];
  let cv = minV + 0.3;
  let k = 0;
  while (cv + 5.0 <= maxV + 0.01) {
    const w = pattern[k % 3];
    if (k % 3 !== 2) {
      const rowV = cv + w / 2;
      // Back-to-back rows face opposite aisles.
      const facing = k % 3 === 0 ? -1 : 1;
      for (let cu = minU + 1.4; cu <= maxU - 1.25; cu += 2.5) {
        if (!fits(cu, rowV, 1.1, 2.25)) continue;
        const p = fromUV(cu, rowV);
        const nose = rnd() < 0.7 ? facing : -facing;
        out.push({ x: p[0], z: p[1], heading: headingOf(v[0] * nose, v[1] * nose) + (rnd() - 0.5) * 5, kind: "lot", rank: rnd() });
      }
    }
    cv += w;
    k++;
  }
  return out;
}

/** Parallel-parked cars along a strip centre line (gaps vary; one bay ≈ 5.8–6.6 m). */
export function stripStalls(line: Polyline, heading: (dx: number, dz: number) => number, seed: number): Stall[] {
  const rnd = mulberry32(seed);
  const out: Stall[] = [];
  const p: V2 = [0, 0];
  const d: V2 = [0, 0];
  for (let s = 3.2; s <= line.length - 3.0; s += 5.9 + rnd() * 0.8) {
    line.at(s, p);
    line.dir(s, 2, d);
    out.push({ x: p[0] + (rnd() - 0.5) * 0.15, z: p[1] + (rnd() - 0.5) * 0.15, heading: heading(d[0], d[1]) + (rnd() - 0.5) * 2.5, kind: "street", rank: rnd() });
  }
  return out;
}

/**
 * Share of parking taken at a Turku wall-clock time: offices full on Friday,
 * thinning in the evening; residents' street parking stays; the weekend is
 * quiet (event guests excepted).
 */
export function parkingOccupancy(iso: string, kind: Stall["kind"]): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  const dow = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay() : 5;
  const hour = m ? Number(m[4]) + Number(m[5]) / 60 : 15.5;
  const lerp3 = (h: number, pts: [number, number][]) => {
    if (h <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (h <= pts[i][0]) {
        const [h0, a] = pts[i - 1];
        const [h1, b] = pts[i];
        return a + ((b - a) * (h - h0)) / (h1 - h0);
      }
    }
    return pts[pts.length - 1][1];
  };
  const weekday = dow >= 1 && dow <= 5;
  if (kind === "street") {
    return weekday
      ? lerp3(hour, [[0, 0.42], [6, 0.42], [8, 0.75], [16, 0.82], [18, 0.62], [22, 0.48], [24, 0.42]])
      : lerp3(hour, [[0, 0.4], [9, 0.38], [13, 0.5], [18, 0.45], [24, 0.4]]);
  }
  return weekday
    ? lerp3(hour, [[0, 0.12], [6, 0.12], [8, 0.6], [9, 0.86], [15.5, 0.84], [17, 0.62], [19, 0.4], [22, 0.22], [24, 0.14]])
    : lerp3(hour, [[0, 0.1], [8, 0.12], [10, 0.32], [15, 0.36], [19, 0.2], [24, 0.12]]);
}

// ── Everyday cars and the Föli bus (batched: one draw call for all) ──────────

/** Part ids (vertex attribute aPart) read by the batched shader. */
const PART = { paint: 0, glass: 1, trim: 2, tyre: 3, rim: 4, head: 5, tail: 6, plate: 7, indicator: 8, sign: 9, grey: 10 } as const;

export type CarType = "hatch" | "estate" | "sedan" | "suv" | "van" | "bus" | "taxi";

interface CarSpec {
  L: number;
  W: number;
  wb: number;
  /** Front overhang (bumper to front axle). */
  fo: number;
  r: number;
  hood: number;
  belt: number;
  roof: number;
  /** Stations from the front bumper: windscreen base, roof front, roof rear, rear window base. */
  zWs: number;
  zRf: number;
  zRr: number;
  zRw: number;
  /** Boot lid height (sedans) or the tailgate top (others = belt). */
  deck: number;
  sill: number;
}

/** Everyday Finnish cars: a Golf-size hatch, an Octavia-size estate, a saloon, a RAV4-size SUV, a Transporter-size van. */
export const CAR_SPECS: Record<Exclude<CarType, "bus" | "taxi">, CarSpec> = {
  hatch: { L: 4.28, W: 1.79, wb: 2.62, fo: 0.86, r: 0.315, hood: 0.8, belt: 0.99, roof: 1.46, zWs: 1.02, zRf: 1.82, zRr: 3.55, zRw: 4.1, deck: 0.99, sill: 0.3 },
  estate: { L: 4.69, W: 1.83, wb: 2.69, fo: 0.92, r: 0.32, hood: 0.8, belt: 0.98, roof: 1.47, zWs: 1.06, zRf: 1.86, zRr: 4.32, zRw: 4.6, deck: 0.98, sill: 0.3 },
  sedan: { L: 4.68, W: 1.81, wb: 2.71, fo: 0.92, r: 0.315, hood: 0.78, belt: 0.97, roof: 1.44, zWs: 1.07, zRf: 1.92, zRr: 3.22, zRw: 3.92, deck: 1.03, sill: 0.3 },
  suv: { L: 4.6, W: 1.86, wb: 2.69, fo: 0.93, r: 0.36, hood: 0.98, belt: 1.13, roof: 1.69, zWs: 1.12, zRf: 1.86, zRr: 4.22, zRw: 4.5, deck: 1.13, sill: 0.4 },
  van: { L: 4.9, W: 1.9, wb: 3.0, fo: 0.88, r: 0.335, hood: 1.06, belt: 1.16, roof: 1.97, zWs: 0.78, zRf: 1.24, zRr: 4.84, zRw: 4.87, deck: 1.16, sill: 0.38 },
};

/** Set the part id of every vertex (non-indexed, position/normal/aPart only). */
function tagged(g: THREE.BufferGeometry, part: number): THREE.BufferGeometry {
  const geo = g.index ? g.toNonIndexed() : g;
  if (geo !== g) g.dispose();
  for (const name of Object.keys(geo.attributes)) if (name !== "position" && name !== "normal") geo.deleteAttribute(name);
  if (!geo.getAttribute("normal")) geo.computeVertexNormals();
  const n = geo.getAttribute("position").count;
  // Created by three itself, like the generated geometries' attributes (merging needs one array type).
  const attr = new THREE.Float32BufferAttribute(n, 1);
  (attr.array as Float32Array).fill(part);
  geo.setAttribute("aPart", attr);
  return geo;
}

/** Wheel: tyre and rim disc at (x, y, z), axle along x; the rim faces outwards (side ±1). */
function simpleWheel(parts: THREE.BufferGeometry[], x: number, y: number, z: number, r: number, width: number, side: number, seg: number) {
  parts.push(tagged(cyl("x", x, y, z, r, r, width, seg), PART.tyre));
  parts.push(tagged(cyl("x", x + side * (width / 2 + 0.004), y, z, r * 0.64, r * 0.64, 0.012, seg), PART.rim));
}

/**
 * A car body lofted through cross-sections along its length (front −z): a
 * tucked-in sill, the side bulging to the shoulder, the belt crease, the
 * glasshouse leaning in to a rounded roof, a sloping bonnet and screens, the
 * plan rounding off at both ends and arch-shaped wheel openings. Faces get
 * their part (paint, glazing with pillars, black sills) by where they lie.
 */
function loftCarBody(c: CarSpec, type: Exclude<CarType, "bus" | "taxi">, near: boolean): THREE.BufferGeometry {
  const L = c.L;
  const f = -c.fo - c.wb / 2;
  const axles = [c.fo, c.fo + c.wb];
  const ar = c.r + 0.055;
  const deckRear = c.deck > c.belt + 0.01;
  const van = type === "van";
  const tailTop = deckRear ? c.deck : c.belt + 0.03;
  const zB = (c.zRf + c.zRr) / 2 - (van ? 0.95 : 0.12);
  const winStart = c.zWs + (van ? 0.12 : 0.2);
  const winEnd = van ? zB + 0.05 : deckRear ? c.zRr - 0.04 : c.zRw - 0.2;
  const ss = (a: number, b: number, x: number) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
  const topY = (z: number) => {
    if (z < 0.3) return lerpN(c.hood - 0.11, c.hood, ss(0, 0.3, z));
    if (z < c.zWs) return lerpN(c.hood, c.belt + 0.035, ss(0.3, c.zWs, z) * 0.85 + ((z - 0.3) / (c.zWs - 0.3)) * 0.15);
    if (z < c.zRf) {
      const t = (z - c.zWs) / (c.zRf - c.zWs);
      // Screens bow outwards: a bit higher than the straight line between base and roof.
      return lerpN(c.belt + 0.035, c.roof, t + 0.12 * Math.sin(Math.PI * t));
    }
    if (z < c.zRr) return c.roof - 0.012 * Math.pow((z - (c.zRf + c.zRr) / 2) / ((c.zRr - c.zRf) / 2), 2);
    if (z < c.zRw) {
      const t = (z - c.zRr) / Math.max(c.zRw - c.zRr, 0.01);
      return lerpN(c.roof - 0.012, tailTop, t * t * 0.35 + t * 0.65);
    }
    return lerpN(tailTop, tailTop - 0.13, ss(L - 0.14, L, z));
  };
  const waistY = (z: number) => {
    if (z < c.zWs) return lerpN(c.hood - 0.07, c.belt, ss(0.1, c.zWs, z));
    const w = c.belt + 0.03 * ((z - c.zWs) / (L - c.zWs));
    return z > L - 0.2 ? lerpN(w, tailTop - 0.09, ss(L - 0.2, L, z)) : w;
  };
  const bottomY = (z: number) => {
    let y = c.sill + 0.07 * (1 - ss(0, 0.35, z)) + 0.06 * (1 - ss(0, 0.3, L - z));
    for (const a of axles) {
      const dz = z - a;
      if (Math.abs(dz) < ar) y = Math.max(y, c.r + Math.sqrt(ar * ar - dz * dz));
    }
    return y;
  };
  const halfW = (z: number) => (c.W / 2) * (1 - 0.1 * (1 - ss(0, 0.6, z)) - 0.075 * (1 - ss(0, 0.45, L - z)));
  const inHouse = (z: number) => z > c.zWs - 0.02 && z < c.zRw + 0.02;
  // Stations: the key lines of the body plus the wheel openings.
  const keys = near
    ? [0, 0.1, 0.3, 0.6, c.zWs - 0.3, c.zWs, winStart, (c.zWs + c.zRf) / 2, c.zRf, zB - 0.05, zB + 0.05, c.zRr, winEnd, (c.zRr + c.zRw) / 2, c.zRw, L - 0.14, L]
    : [0, 0.25, c.zWs, winStart, c.zRf, zB - 0.05, zB + 0.05, c.zRr, winEnd, c.zRw, L];
  const archSteps = near ? [-1, -0.86, -0.5, 0, 0.5, 0.86, 1] : [-1, 0, 1];
  for (const a of axles) for (const k of archSteps) keys.push(a + k * ar * 0.999);
  const zs = [...new Set(keys.map((z) => Math.round(clamp(z, 0, L) * 1000) / 1000))].sort((a, b) => a - b).filter((z, i, arr) => i === 0 || z - arr[i - 1] > 0.02);
  // Half section (x ≥ 0, bottom → top), mirrored into a closed ring.
  const half = (z: number): V2[] => {
    const yb = bottomY(z);
    const yw = Math.max(waistY(z), yb + 0.12);
    const yt = Math.max(topY(z), yw + 0.03);
    const hw = halfW(z);
    const hb = hw - 0.055;
    const house = inHouse(z);
    const rt = house ? Math.min(0.08, (yt - yw) * 0.4) : 0.05;
    const ht = house ? hw - 0.075 - 0.07 * clamp((yt - yw) / 0.5, 0, 1) : hw - 0.09;
    return [
      [0, yb],
      [hb - 0.05, yb],
      [hb, yb + 0.05],
      [hw, yb + (yw - yb) * 0.5],
      [hw - 0.012, yw - 0.025],
      [hw - 0.035, yw],
      [(hw - 0.05 + ht) / 2, (yw + Math.max(yt - rt, yw + 0.01)) / 2],
      [ht, Math.max(yt - rt, yw + 0.01)],
      [ht - rt * 0.29, Math.max(yt - rt * 0.29, yw + 0.015)],
      [ht - rt, yt],
      [0, yt + (house ? 0.006 : 0.004)],
    ];
  };
  // Far: every other point of the half section (same parts, coarser shape).
  const SEL = near ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [0, 2, 3, 5, 7, 9, 10];
  const H = SEL.length;
  const ringN = 2 * (H - 1);
  const ring = (z: number): V3[] => {
    const full = half(z);
    const h = SEL.map((k) => full[k]);
    const out: V3[] = h.map(([x, y]) => [x, y, f + z]);
    for (let j = H - 2; j >= 1; j--) out.push([-h[j][0], h[j][1], f + z]);
    return out;
  };
  const rings = zs.map(ring);
  // Smooth normals over the grid first (indexed), then faces per part.
  const pos: number[] = [];
  for (const r of rings) for (const p of r) pos.push(p[0], p[1], p[2]);
  const quadIdx: number[] = [];
  for (let i = 0; i + 1 < rings.length; i++) {
    for (let j = 0; j < ringN; j++) {
      const a = i * ringN + j;
      const b = i * ringN + ((j + 1) % ringN);
      const cc = (i + 1) * ringN + j;
      const d = (i + 1) * ringN + ((j + 1) % ringN);
      quadIdx.push(a, cc, b, b, cc, d);
    }
  }
  const grid = new THREE.BufferGeometry();
  grid.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  grid.setIndex(quadIdx);
  grid.computeVertexNormals();
  let nrm = grid.getAttribute("normal");
  // Make sure the faces point outwards (the right side's bulge must face +x).
  const probe = Math.floor(rings.length / 2) * ringN + SEL.indexOf(3);
  const flip = nrm.getX(probe) < 0;
  if (flip) {
    for (let k = 0; k < quadIdx.length; k += 3) {
      const t = quadIdx[k + 1];
      quadIdx[k + 1] = quadIdx[k + 2];
      quadIdx[k + 2] = t;
    }
    grid.setIndex(quadIdx);
    grid.computeVertexNormals();
    nrm = grid.getAttribute("normal");
  }
  const partOf = (j: number, zMid: number): number => {
    // Ring segment j (0…ringN−1) → its start point on the right half (mirror), as an index of the full section.
    const k = SEL[j < H - 1 ? j : ringN - 1 - j];
    if (k <= 1) return PART.trim;
    if (k <= 4) return PART.paint;
    const house = inHouse(zMid);
    if (k <= 6) {
      if (!house) return PART.paint;
      if (zMid > zB - 0.05 && zMid < zB + 0.05 && !van) return PART.trim;
      return zMid > winStart && zMid < winEnd ? PART.glass : PART.paint;
    }
    const screen = (zMid > c.zWs && zMid < c.zRf) || (zMid > c.zRr && zMid < c.zRw);
    return screen ? PART.glass : PART.paint;
  };
  const outPos: number[] = [];
  const outNor: number[] = [];
  const outPart: number[] = [];
  const P = grid.getAttribute("position");
  const pushV = (idx: number, part: number) => {
    outPos.push(P.getX(idx), P.getY(idx), P.getZ(idx));
    outNor.push(nrm.getX(idx), nrm.getY(idx), nrm.getZ(idx));
    outPart.push(part);
  };
  for (let i = 0; i + 1 < rings.length; i++) {
    const zMid = (zs[i] + zs[i + 1]) / 2;
    for (let j = 0; j < ringN; j++) {
      const part = partOf(j, zMid);
      const base = (i * ringN + j) * 6;
      for (let k = 0; k < 6; k++) pushV(quadIdx[base + k], part);
    }
  }
  // End caps (nose and tail faces) as fans, facing out.
  for (const [ri, dir] of [
    [0, -1],
    [rings.length - 1, 1],
  ] as const) {
    const r = rings[ri];
    let cy = 0;
    for (const p of r) cy += p[1];
    cy /= r.length;
    const cz = r[0][2];
    for (let j = 0; j < ringN; j++) {
      const a = r[j];
      const b = r[(j + 1) % ringN];
      const tri: V3[] = dir < 0 ? [[0, cy, cz], b, a] : [[0, cy, cz], a, b];
      // Orient by the geometric normal (the ring's winding was decided above).
      const e1 = new THREE.Vector3(tri[1][0] - tri[0][0], tri[1][1] - tri[0][1], tri[1][2] - tri[0][2]);
      const e2 = new THREE.Vector3(tri[2][0] - tri[0][0], tri[2][1] - tri[0][1], tri[2][2] - tri[0][2]);
      const nz = e1.cross(e2).z;
      const ordered = Math.sign(nz) === dir || nz === 0 ? tri : [tri[0], tri[2], tri[1]];
      for (const p of ordered) {
        outPos.push(p[0], p[1], p[2]);
        outNor.push(0, 0, dir);
        outPart.push(PART.paint);
      }
    }
  }
  grid.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(outPos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(outNor, 3));
  g.setAttribute("aPart", new THREE.Float32BufferAttribute(outPart, 1));
  return g;
}

/** An everyday car (front −z, ground y = 0, origin between the axles). lod 0 = near, 1 = far. */
export function buildCarGeometry(type: Exclude<CarType, "bus">, lod: 0 | 1): THREE.BufferGeometry {
  if (type === "taxi") return withTaxiSign(buildCarGeometry("estate", lod), CAR_SPECS.estate);
  const c = CAR_SPECS[type];
  const near = lod === 0;
  const f = -c.fo - c.wb / 2;
  const back = f + c.L;
  const axF = -c.wb / 2;
  const axR = c.wb / 2;
  const ar = c.r + 0.055;
  const parts: THREE.BufferGeometry[] = [];
  parts.push(loftCarBody(c, type, near));
  // Lamps, grille, bumpers, plates, mirrors.
  const hw = c.W / 2;
  for (const s of [-1, 1]) {
    parts.push(tagged(boxg(s * (hw - 0.26), c.hood - 0.09, f + 0.045, 0.34, 0.1, 0.06), PART.head));
    parts.push(tagged(boxg(s * (hw - 0.17), c.belt - 0.11, back - 0.03, 0.26, 0.11, 0.05), PART.tail));
    if (near) parts.push(tagged(boxg(s * (hw - 0.1), c.hood - 0.05, f + 0.12, 0.08, 0.03, 0.06), PART.indicator));
    if (near) parts.push(tagged(boxg(s * (hw + 0.07), c.belt + 0.08, f + c.zWs + 0.16, 0.16, 0.1, 0.08), PART.paint));
  }
  parts.push(tagged(boxg(0, (c.sill + c.hood) / 2 - 0.02, f + 0.02, c.W * 0.42, (c.hood - c.sill) * 0.45, 0.04), PART.trim));
  parts.push(tagged(boxg(0, c.sill + 0.04, f + 0.05, c.W - 0.12, 0.08, 0.1), PART.trim));
  parts.push(tagged(boxg(0, c.sill + 0.04, back - 0.05, c.W - 0.12, 0.08, 0.1), PART.trim));
  if (near) {
    parts.push(tagged(boxg(0, c.sill + 0.13, f - 0.004, 0.5, 0.11, 0.01), PART.plate));
    parts.push(tagged(boxg(0, c.belt - 0.28, back + 0.004, 0.5, 0.11, 0.01), PART.plate));
  }
  // Underbody and wheel wells (no see-through under the arches).
  parts.push(tagged(boxg(0, (0.16 + c.sill) / 2 + 0.02, (f + back) / 2, c.W - 0.3, c.sill - 0.12, c.L - 1.0), PART.trim));
  if (near) for (const z of [axF, axR]) parts.push(tagged(boxg(0, c.r + 0.06, z, c.W - 0.5, c.r * 2, ar * 2 - 0.04), PART.trim));
  // Wheels.
  const seg = near ? 12 : 6;
  for (const z of [axF, axR]) {
    for (const s of [-1, 1]) {
      if (near) simpleWheel(parts, s * (hw - 0.13), c.r, z, c.r, 0.22, s, seg);
      else parts.push(tagged(cyl("x", s * (hw - 0.13), c.r, z, c.r, c.r, 0.22, seg), PART.tyre));
    }
  }
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error(`vehicles: could not merge ${type}`);
  return merged;
}

/** Föli city bus (12 m, electric): yellow body, black window band, three doors on the right. */
export function buildBusGeometry(lod: 0 | 1): THREE.BufferGeometry {
  const near = lod === 0;
  const L = 12.0;
  const W = 2.55;
  const parts: THREE.BufferGeometry[] = [];
  const f = -6.0;
  const axF = -3.3;
  const axR = 2.6;
  const r = 0.5;
  // Body: a rounded box from the skirt to the roof, wheel openings covered by dark wells.
  parts.push(tagged(near ? rbox(0, 1.72, 0, W, 2.7, L, 0.12, 2) : boxg(0, 1.72, 0, W, 2.7, L), PART.paint));
  // Window band on both sides, the windscreen, the rear window and the destination display.
  for (const s of [-1, 1]) {
    parts.push(tagged(boxg(s * (W / 2 + 0.006), 1.95, -0.4, 0.012, 1.25, L - 1.6), PART.glass));
    if (near) for (let z = -5.0; z < 5.4; z += 1.45) parts.push(tagged(boxg(s * (W / 2 + 0.012), 1.95, z, 0.014, 1.26, 0.09), PART.trim));
  }
  parts.push(tagged(boxg(0, 1.85, f - 0.006, W - 0.26, 1.7, 0.012), PART.glass));
  parts.push(tagged(boxg(0, 2.86, f - 0.008, W - 0.5, 0.2, 0.014), PART.sign));
  parts.push(tagged(boxg(0, 2.25, -f + 0.006, W - 0.6, 0.6, 0.012), PART.glass));
  // Doors (right side = +x): glazed leaves to the floor.
  for (const z of [-5.0, -0.6, 3.9]) parts.push(tagged(boxg(W / 2 + 0.01, 1.42, z, 0.014, 2.25, 1.2), PART.glass));
  // Bumpers, lamps, roof battery packs, mirrors.
  parts.push(tagged(boxg(0, 0.48, f - 0.04, W, 0.26, 0.1), PART.trim));
  parts.push(tagged(boxg(0, 0.48, -f + 0.04, W, 0.26, 0.1), PART.trim));
  for (const s of [-1, 1]) {
    parts.push(tagged(boxg(s * 1.0, 0.72, f - 0.012, 0.36, 0.14, 0.03), PART.head));
    parts.push(tagged(boxg(s * 1.12, 1.0, -f + 0.012, 0.16, 0.5, 0.03), PART.tail));
    if (near) parts.push(tagged(boxg(s * 1.45, 2.3, f + 0.25, 0.08, 0.32, 0.12), PART.trim));
  }
  parts.push(tagged(boxg(0, 3.17, 0.8, 1.9, 0.28, 3.6), PART.grey));
  parts.push(tagged(boxg(0, 3.13, -3.4, 1.7, 0.2, 1.6), PART.grey));
  for (const z of [axF, axR]) parts.push(tagged(boxg(0, r + 0.1, z, W - 0.3, 2 * r + 0.1, 2 * r + 0.25), PART.trim));
  const seg = near ? 16 : 8;
  for (const s of [-1, 1]) {
    simpleWheel(parts, s * (W / 2 - 0.2), r, axF, r, 0.3, s, seg);
    simpleWheel(parts, s * (W / 2 - 0.25), r, axR, r, 0.48, s, seg);
  }
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("vehicles: could not merge the bus");
  return merged;
}

/** A taxi: an estate with the roof sign (lit amber-white, part "sign"). */
function withTaxiSign(body: THREE.BufferGeometry, c: CarSpec): THREE.BufferGeometry {
  const f = -c.fo - c.wb / 2;
  const sign = tagged(boxg(0, c.roof + 0.07, f + (c.zRf + c.zRr) / 2 - 0.2, 0.5, 0.13, 0.18), PART.sign);
  const base = tagged(boxg(0, c.roof + 0.005, f + (c.zRf + c.zRr) / 2 - 0.2, 0.56, 0.02, 0.24), PART.trim);
  const merged = mergeGeometries([body, sign, base], false);
  body.dispose();
  sign.dispose();
  base.dispose();
  if (!merged) throw new Error("vehicles: could not merge the taxi");
  return merged;
}

/** Instance flag bits stored in the batching colour's alpha (alpha = 1 + flags). */
const FLAG = { lights: 1, brake: 2, metallic: 4, darkRims: 8, hazard: 16, bus: 32 } as const;

const TRAFFIC_FRAGMENT_PARS = /* glsl */ `
flat varying float vTwPart;
uniform float uTwNight;
uniform float uTwTime;
uniform vec3 uTwHead;
uniform vec3 uTwTail;
`;

const TRAFFIC_COLOR = /* glsl */ `
	float twPart = vTwPart;
	int twFlags = int( vColor.a - 1.0 + 0.5 );
	bool twLights = ( twFlags & 1 ) != 0;
	bool twBrake = ( twFlags & 2 ) != 0;
	bool twMetallic = ( twFlags & 4 ) != 0;
	bool twDarkRims = ( twFlags & 8 ) != 0;
	bool twHazard = ( twFlags & 16 ) != 0;
	bool twBus = ( twFlags & 32 ) != 0;
	vec3 twAlbedo = vColor.rgb;
	float twRough = twMetallic ? 0.3 : 0.24;
	float twMetal = twMetallic ? 0.55 : 0.0;
	float twCoat = 1.0;
	vec3 twEmis = vec3( 0.0 );
	float twBlink = step( 0.5, fract( uTwTime * 1.4 ) );
	if ( twPart < 0.5 ) {
	} else if ( twPart < 1.5 ) {
		twAlbedo = vec3( 0.012, 0.014, 0.017 ); twRough = 0.05; twMetal = 0.0; twCoat = 0.0;
		// Bus interiors lit after dark: a soft glow behind tinted glass (≈ 6 cd/m²), not a light box.
		if ( twBus ) twEmis = vec3( 1.0, 0.9, 0.78 ) * 0.006 * uTwNight;
	} else if ( twPart < 2.5 ) {
		twAlbedo = vec3( 0.018 ); twRough = 0.62; twMetal = 0.0; twCoat = 0.0;
	} else if ( twPart < 3.5 ) {
		twAlbedo = vec3( 0.022 ); twRough = 0.9; twMetal = 0.0; twCoat = 0.0;
	} else if ( twPart < 4.5 ) {
		twAlbedo = twDarkRims ? vec3( 0.045 ) : vec3( 0.56, 0.57, 0.58 ); twRough = 0.35; twMetal = 1.0; twCoat = 0.0;
	} else if ( twPart < 5.5 ) {
		twAlbedo = vec3( 0.55 ); twRough = 0.12; twMetal = 0.7; twCoat = 0.0;
		if ( twLights ) twEmis = uTwHead;
	} else if ( twPart < 6.5 ) {
		twAlbedo = vec3( 0.22, 0.012, 0.01 ); twRough = 0.18; twMetal = 0.0; twCoat = 0.0;
		float tail = twLights ? mix( 0.15, 1.0, uTwNight ) : 0.0;
		tail += twBrake ? 3.0 : 0.0;
		twEmis = uTwTail * tail;
	} else if ( twPart < 7.5 ) {
		twAlbedo = vec3( 0.8 ); twRough = 0.45; twMetal = 0.0; twCoat = 0.0;
	} else if ( twPart < 8.5 ) {
		twAlbedo = vec3( 0.4, 0.2, 0.02 ); twRough = 0.2; twMetal = 0.0; twCoat = 0.0;
		if ( twHazard ) twEmis = vec3( 1.0, 0.45, 0.02 ) * 6.0 * twBlink;
	} else if ( twPart < 9.5 ) {
		// Destination display / taxi sign: amber LED text on black (≈ 120 cd/m² average).
		twAlbedo = vec3( 0.01 ); twRough = 0.3; twMetal = 0.0; twCoat = 0.0;
		twEmis = vec3( 1.0, 0.55, 0.08 ) * 0.12;
	} else {
		twAlbedo = vec3( 0.42, 0.43, 0.44 ); twRough = 0.55; twMetal = 0.0; twCoat = 0.0;
	}
	diffuseColor.rgb = twAlbedo;
`;

export interface TrafficMaterial {
  material: THREE.MeshStandardMaterial;
  uniforms: { uTwNight: THREE.IUniform<number>; uTwTime: THREE.IUniform<number>; uTwHead: THREE.IUniform<THREE.Color>; uTwTail: THREE.IUniform<THREE.Color> };
}

/** One material for every everyday vehicle: parts and per-instance paint/flags decoded in the shader. */
export function makeTrafficMaterial(physical: boolean): TrafficMaterial {
  const uniforms = {
    uTwNight: { value: 0 },
    uTwTime: { value: 0 },
    // Low-beam lens ≈ 25 kcd/m² (DRL by day); tail lamps ≈ 1.5 kcd/m² at night, brake ×4.
    uTwHead: { value: new THREE.Color(1, 0.96, 0.9).multiplyScalar(22) },
    uTwTail: { value: new THREE.Color(1, 0.04, 0.02).multiplyScalar(1.6) },
  };
  const material = physical ? new THREE.MeshPhysicalMaterial({ clearcoat: 1, clearcoatRoughness: 0.12 }) : new THREE.MeshStandardMaterial();
  material.name = "traffic";
  material.roughness = 0.4;
  material.metalness = 0;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aPart;\nflat varying float vTwPart;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\n\tvTwPart = aPart;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${TRAFFIC_FRAGMENT_PARS}`)
      .replace("#include <color_fragment>", TRAFFIC_COLOR)
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n\troughnessFactor = twRough;")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\n\tmetalnessFactor = twMetal;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += twEmis;")
      .replace("#include <lights_physical_fragment>", "#include <lights_physical_fragment>\n\t#ifdef USE_CLEARCOAT\n\t\tmaterial.clearcoat *= twCoat;\n\t#endif");
  };
  material.customProgramCacheKey = () => `tw-traffic-${physical ? "p" : "s"}`;
  return { material, uniforms };
}

/** Finnish car colours (share, sRGB, metallic): white, greys, black, silver, dark blue, a few others. */
const CAR_COLOURS: [number, string, boolean][] = [
  [0.21, "#e9eaeb", false],
  [0.05, "#d9dadb", true],
  [0.12, "#7b7f84", true],
  [0.07, "#4d5157", true],
  [0.16, "#0e0f11", true],
  [0.04, "#141414", false],
  [0.13, "#a9adb1", true],
  [0.08, "#1b2a44", true],
  [0.03, "#2f4f6f", true],
  [0.04, "#7a1414", true],
  [0.02, "#2c3a2e", true],
  [0.02, "#5a4632", true],
  [0.015, "#c9b89a", false],
  [0.015, "#3b5d7a", false],
];

export function pickCarColour(r: number): { color: string; metallic: boolean } {
  let acc = 0;
  for (const [share, color, metallic] of CAR_COLOURS) {
    acc += share;
    if (r < acc) return { color, metallic };
  }
  return { color: CAR_COLOURS[0][1], metallic: false };
}

/** Body type mix on the road and in car parks. */
export function pickCarType(r: number): Exclude<CarType, "bus" | "taxi"> {
  return r < 0.27 ? "hatch" : r < 0.55 ? "estate" : r < 0.66 ? "sedan" : r < 0.92 ? "suv" : "van";
}

// ── Traffic simulation ───────────────────────────────────────────────────────

interface Route {
  id: string;
  line: Polyline;
  /** Desired speed (m/s). */
  speed: number;
  /** Cars per hour (Poisson arrivals, deterministic). */
  rate: number;
  /** Seconds between buses (0 = none). */
  busEvery: number;
  stops: { s: number; junction: number; phase: "A" | "B" }[];
  busStops: number[];
  next: number;
  nextBus: number;
  /** Kerbside drop-off point (taxis stop here with hazards), and the next taxi time. */
  dropoff?: number;
  nextTaxi: number;
  /** Peak-hour car rate and bus interval (trafficLevel scales them). */
  rateBase: number;
  busBase: number;
}

interface Mover {
  id: number;
  route: number;
  type: CarType;
  s: number;
  v: number;
  a: number;
  len: number;
  /** Lateral offset to the right (bus pulling into a stop). */
  lateral: number;
  dwell: number;
  servedStop: number;
  /** Kerbside drop-off: s where it stops with hazard lights (−1 = none / done, −2 = standing there). */
  dropoff: number;
  /** Seconds since it entered the street. */
  age: number;
  color: THREE.Vector4;
  flags: number;
  rnd: () => number;
}

/** Junction signal offsets (s): a green wave from BioCity towards the station. */
export const JUNCTIONS: readonly { at: V2; offset: number }[] = [
  { at: [-50, -12], offset: 0 },
  { at: [48, -140], offset: 14 },
];

/** Kerb at BioCity's partner entrance where cars drop people off (SPEC §6.3). */
const DROPOFF_KERB: V2 = [-36.2, -23.0];

const ROUTE_SETUP: { id: string; speed: number; rate: number; busEvery: number; phase: "A" | "B" }[] = [
  { id: "tyk-ne-1", speed: 11.1, rate: 300, busEvery: 150, phase: "A" },
  { id: "tyk-ne-2", speed: 11.6, rate: 240, busEvery: 0, phase: "A" },
  { id: "tyk-sw-1", speed: 11.1, rate: 420, busEvery: 150, phase: "A" },
  { id: "lem-se", speed: 10.5, rate: 150, busEvery: 300, phase: "B" },
  { id: "lem-nw", speed: 10.5, rate: 150, busEvery: 300, phase: "B" },
  { id: "jouk-se", speed: 8.3, rate: 170, busEvery: 0, phase: "B" },
  { id: "jouk-nw", speed: 8.3, rate: 170, busEvery: 0, phase: "B" },
];

export interface TrafficSnapshot {
  movers: { route: string; s: number; v: number; type: CarType; age: number; dropoff: number; dwell: number }[];
}

/** Far LOD: body, glasshouse and wheels as boxes (≈ 70 triangles). */
export function buildCarBoxGeometry(type: CarType): THREE.BufferGeometry {
  if (type === "taxi") return withTaxiSign(buildCarBoxGeometry("estate"), CAR_SPECS.estate);
  const parts: THREE.BufferGeometry[] = [];
  if (type === "bus") {
    parts.push(tagged(boxg(0, 1.72, 0, 2.55, 2.7, 12), PART.paint));
    for (const s of [-1, 1]) parts.push(tagged(boxg(s * 1.282, 1.95, -0.4, 0.01, 1.25, 10.4), PART.glass));
    parts.push(tagged(boxg(0, 1.85, -6.006, 2.3, 1.7, 0.01), PART.glass));
  } else {
    const c = CAR_SPECS[type];
    const f = -c.fo - c.wb / 2;
    parts.push(tagged(boxg(0, (c.sill + c.belt) / 2, f + c.L / 2, c.W, c.belt - c.sill, c.L - 0.08), PART.paint));
    parts.push(tagged(boxg(0, (c.belt + c.roof) / 2, f + (c.zWs + c.zRw) / 2, c.W - 0.22, c.roof - c.belt, c.zRw - c.zWs - 0.15), PART.glass));
    parts.push(tagged(boxg(0, c.roof - 0.012, f + (c.zRf + c.zRr) / 2, c.W - 0.3, 0.03, c.zRr - c.zRf), PART.paint));
    for (const z of [-c.wb / 2, c.wb / 2]) parts.push(tagged(boxg(0, c.r, z, c.W - 0.06, c.r * 1.9, c.r * 1.9), PART.tyre));
    for (const s of [-1, 1]) {
      parts.push(tagged(boxg(s * (c.W / 2 - 0.26), c.hood - 0.09, f + 0.01, 0.34, 0.1, 0.02), PART.head));
      parts.push(tagged(boxg(s * (c.W / 2 - 0.17), c.belt - 0.11, f + c.L - 0.03, 0.26, 0.11, 0.02), PART.tail));
    }
  }
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error(`vehicles: could not merge the far ${type}`);
  return merged;
}

/** The display off-roader for distant views (≈ 450 triangles, batched parts; front −z). */
export function buildGClassFar(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const P = (g: THREE.BufferGeometry, part: number) => parts.push(tagged(g, part));
  P(boxg(0, 0.86, 0, 1.86, 0.72, 4.4), PART.paint);
  P(boxg(0, 1.535, 0.6, 1.72, 0.62, 3.1), PART.glass);
  P(boxg(0, 1.895, 0.64, 1.74, 0.1, 3.12), PART.paint);
  for (const s of [-1, 1]) {
    P(boxg(s * 0.85, 1.53, -0.9, 0.08, 0.62, 0.1), PART.paint);
    P(boxg(s * 0.855, 1.53, 2.11, 0.07, 0.62, 0.18), PART.paint);
    for (const z of [AXLE_F, AXLE_R]) P(boxg(s * 0.95, 0.88, z, 0.07, 0.12, 1.2), PART.paint);
    P(boxg(s * 0.62, 0.985, FRONT_Z - 0.03, 0.26, 0.24, 0.03), PART.head);
    P(boxg(s * 0.79, 0.79, REAR_Z + 0.02, 0.23, 0.11, 0.02), PART.tail);
    P(boxg(s * 0.93, 0.42, 0, 0.16, 0.05, 1.86), PART.rim);
  }
  P(boxg(0, 0.53, FRONT_Z - 0.04, 1.86, 0.3, 0.22), PART.paint);
  P(boxg(0, 0.5, REAR_Z + 0.04, 1.84, 0.3, 0.2), PART.paint);
  P(boxg(0, 0.965, FRONT_Z - 0.035, 0.8, 0.32, 0.03), PART.trim);
  P(cyl("z", 0, 1.02, REAR_Z + 0.14, 0.4, 0.4, 0.22, 12), PART.paint);
  P(boxg(0, 0.4, 0, 1.6, 0.18, 3.9), PART.trim);
  for (const z of [AXLE_F, AXLE_R]) {
    for (const s of [-1, 1]) {
      P(cyl("x", s * (GCLASS.track / 2), WHEEL_Y, z, GCLASS.tyreRadius, GCLASS.tyreRadius, GCLASS.tyreWidth, 12), PART.tyre);
      P(cyl("x", s * (GCLASS.track / 2 + GCLASS.tyreWidth / 2 + 0.004), WHEEL_Y, z, 0.26, 0.26, 0.012, 10), PART.rim);
    }
  }
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("vehicles: could not merge the far display car");
  return merged;
}

/** Distance from a vehicle's origin (between the axles) to its front bumper. */
/** Body dimensions of a vehicle type (taxis are estates). */
function specOf(type: Exclude<CarType, "bus">): CarSpec {
  return CAR_SPECS[type === "taxi" ? "estate" : type];
}

function frontOffset(type: CarType): number {
  if (type === "bus") return 6.0;
  const c = specOf(type);
  return c.fo + c.wb / 2;
}

function lengthOf(type: CarType): number {
  return type === "bus" ? 12 : specOf(type).L;
}

/** Detailed / mid / box geometry by distance (m): a parked car beyond ≈ 90 m is a few dozen pixels long. */
const LOD_NEAR = 35;
const LOD_MID = 90;

/** Ground under the roads: terrain, bridge decks over the railway. */
interface Ground {
  heightAt(x: number, z: number): number;
}

const HIDDEN_M = new THREE.Matrix4().makeScale(0, 0, 0);
const QUARTER_TURN = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
const scratchScale = new THREE.Vector3();
const scratchSphere = new THREE.Sphere();

/**
 * The traffic itself — arrivals per route (Poisson, by the clock), car
 * following (IDM), traffic signals, Föli stops and the partners' drop-off at
 * BioCity — kept apart from the rendering so it can be tested headless. The
 * renderer gives each new vehicle an instance (onSpawn → false = no room) and
 * takes it back when the vehicle leaves (onRelease).
 */
export class TrafficSim {
  readonly movers: Mover[] = [];
  routes: Route[];
  time = 0;
  /** Seconds between drop-off taxis (0 = none at this time of day). */
  taxiEvery = 0;
  onSpawn: ((m: Mover) => boolean) | null = null;
  onRelease: ((m: Mover) => void) | null = null;
  private acc = 0;
  private readonly rnd: () => number;

  constructor(
    routes: Route[],
    private readonly capacity: number,
    seed: number,
  ) {
    this.routes = routes;
    this.rnd = mulberry32(seed);
  }

  /** Scale arrivals for the time of day (trafficLevel). */
  setLevel(level: { cars: number; buses: number }) {
    for (const r of this.routes) {
      r.rate = r.rateBase * level.cars;
      r.busEvery = level.buses > 0 && r.busBase > 0 ? r.busBase / level.buses : 0;
      // Do not wait out a long gap scheduled under the old level.
      r.next = Math.min(r.next, this.time + 3);
      if (r.busEvery > 0) r.nextBus = Math.min(r.nextBus, this.time + r.busEvery);
    }
  }

  /** Run for a while before anyone looks (fills the streets before the first frame). */
  prewarm(seconds: number) {
    for (let t = 0; t < seconds; t += 0.2) this.step(0.2);
  }

  /** Advance by dt seconds (fixed internal steps; long gaps are not caught up). */
  step(dt: number) {
    const h = 1 / 30;
    this.acc += Math.min(dt, 0.25);
    while (this.acc >= h) {
      this.acc -= h;
      this.substep(h);
    }
  }

  private spawn(route: number, type: CarType): boolean {
    const r = this.routes[route];
    if (!r || this.movers.length >= this.capacity) return false;
    for (const m of this.movers) if (m.route === route && m.s - m.len < 8) return false;
    const rnd = mulberry32(Math.floor(this.rnd() * 1e9));
    const dropoff = type === "taxi" && r.dropoff !== undefined ? r.dropoff : -1;
    const m: Mover = {
      id: -1,
      route,
      type,
      s: 0,
      v: r.speed * 0.85,
      a: 0,
      len: lengthOf(type),
      lateral: 0,
      dwell: 0,
      servedStop: 0,
      dropoff,
      age: 0,
      color: new THREE.Vector4(1, 1, 1, 1),
      flags: FLAG.lights,
      rnd,
    };
    if (this.onSpawn && !this.onSpawn(m)) return false;
    this.movers.push(m);
    return true;
  }

  private substep(h: number) {
    this.time += h;
    const t = this.time;
    // Arrivals.
    this.routes.forEach((r, i) => {
      if (r.rate > 0 && t >= r.next) {
        const type = pickCarType(this.rnd());
        if (this.spawn(i, type)) r.next = t + (-Math.log(1 - this.rnd() * 0.999) * 3600) / r.rate;
        else r.next = t + 1;
      }
      if (r.busEvery > 0 && t >= r.nextBus) {
        if (this.spawn(i, "bus")) r.nextBus = t + r.busEvery * (0.8 + this.rnd() * 0.4);
        else r.nextBus = t + 2;
      }
      if (r.dropoff !== undefined && this.taxiEvery > 0 && t >= r.nextTaxi) {
        if (this.spawn(i, "taxi")) r.nextTaxi = t + this.taxiEvery * (0.7 + this.rnd() * 0.6);
        else r.nextTaxi = t + 2;
      }
    });
    // Car following, signals, bus stops.
    const byRoute = new Map<number, Mover[]>();
    for (const m of this.movers) {
      let list = byRoute.get(m.route);
      if (!list) byRoute.set(m.route, (list = []));
      list.push(m);
    }
    for (const [ri, list] of byRoute) {
      const r = this.routes[ri];
      list.sort((a, b) => b.s - a.s);
      for (let k = 0; k < list.length; k++) {
        const m = list[k];
        m.age += h;
        if (m.dwell > 0) {
          m.dwell -= h;
          m.v = 0;
          m.a = 0;
          continue;
        }
        let gap = Infinity;
        let dv = 0;
        // Leader on the same lane (a bus pulled into its stop does not block).
        for (let j = k - 1; j >= 0; j--) {
          const lead = list[j];
          if (lead.lateral > 1.0) continue;
          gap = lead.s - lead.len - m.s;
          dv = m.v - lead.v;
          break;
        }
        // Signals: a red (or an amber we can still stop for) is a wall at the stop line.
        for (const st of r.stops) {
          const dist = st.s - m.s;
          if (dist < -0.5 || dist > 80) continue;
          const j = JUNCTIONS[st.junction];
          const colour = signalColour(st.phase, t, j?.offset ?? 0);
          const canStop = dist > (m.v * m.v) / (2 * 3.0) + 1.0;
          if (colour === "red" || (colour === "amber" && canStop)) {
            if (dist < gap) {
              gap = Math.max(dist, 0.05);
              dv = m.v;
            }
          }
        }
        // Buses stop at their stops.
        if (m.type === "bus" && m.servedStop < r.busStops.length) {
          const sStop = r.busStops[m.servedStop];
          const dist = sStop - m.s;
          if (dist < 0.6 && m.v < 0.4) {
            m.dwell = 14;
            m.servedStop++;
          } else if (dist >= 0 && dist + 2.2 < gap) {
            // IDM keeps s0 ≈ 2.2 m to a "leader": put that leader 2.2 m past the stop.
            gap = dist + 2.2;
            dv = m.v;
          }
          if (dist < -2) m.servedStop++;
        }
        // A drop-off: stop at the kerb by the recess, hazards on, then drive on.
        if (m.dropoff >= 0) {
          const dist = m.dropoff - m.s;
          if (dist < 0.6 && m.v < 0.4) {
            m.dwell = 22;
            m.dropoff = -2;
          } else if (dist >= 0 && dist + 2.2 < gap) {
            gap = dist + 2.2;
            dv = m.v;
          }
          if (dist < -3) m.dropoff = -1;
        } else if (m.dropoff === -2 && m.dwell <= 0) m.dropoff = -1;
        m.a = idmAccel(m.v, r.speed, gap, dv);
        m.v = Math.max(0, m.v + m.a * h);
        m.s += m.v * h;
        // Pull into / out of a bus stop.
        if (m.type === "bus") {
          let near = Infinity;
          for (const bs of r.busStops) near = Math.min(near, Math.abs(bs - m.s));
          const want = near < 22 ? 1.3 * clamp((22 - near) / 14, 0, 1) : 0;
          m.lateral += (want - m.lateral) * Math.min(1, h * 1.5);
        }
      }
    }
    // Leave at the end of the line.
    for (let i = this.movers.length - 1; i >= 0; i--) {
      const m = this.movers[i];
      const r = this.routes[m.route];
      if (!r || m.s > r.line.length + 2) {
        this.onRelease?.(m);
        this.movers.splice(i, 1);
      }
    }
  }

  snapshot(): TrafficSnapshot {
    return { movers: this.movers.map((m) => ({ route: this.routes[m.route]?.id ?? "", s: m.s, v: m.v, type: m.type, age: m.age, dropoff: m.dropoff, dwell: m.dwell })) };
  }
}

/**
 * Everyday vehicles: one BatchedMesh holding the parked cars and the moving
 * traffic (three LODs per body type), contact shadows and headlight pools.
 */
class Vehicles {
  readonly batch: THREE.BatchedMesh;
  readonly shadows: THREE.InstancedMesh;
  readonly pools: THREE.InstancedMesh | null;
  readonly mat: TrafficMaterial;
  private lods = new Map<CarType, [number, number, number]>();
  private instType: CarType[] = [];
  private instLod: number[] = [];
  private shadowOf: number[] = [];
  private parked: { id: number; stall: Stall }[] = [];
  private freeIds: number[] = [];
  readonly sim: TrafficSim;
  private camAt = new THREE.Vector3(1e9, 0, 0);
  private occupancy = { lot: -1, street: -1 };
  private readonly m = new THREE.Matrix4();
  private readonly e = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly q = new THREE.Quaternion();
  private readonly v = new THREE.Vector3();
  private readonly one = new THREE.Vector3(1, 1, 1);
  private readonly p2: V2 = [0, 0];
  private readonly d2: V2 = [0, 0];

  constructor(
    private ctx: TwinContext,
    private ground: Ground,
    stalls: Stall[],
    maxMovers: number,
    seed: number,
  ) {
    this.sim = new TrafficSim([], maxMovers, seed);
    this.sim.onSpawn = (m) => this.attach(m);
    this.sim.onRelease = (m) => this.detach(m);
    const types: CarType[] = ["hatch", "estate", "sedan", "suv", "van", "bus", "taxi"];
    const geos: { type: CarType; lod: number; g: THREE.BufferGeometry }[] = [];
    for (const t of types) {
      geos.push({ type: t, lod: 0, g: t === "bus" ? buildBusGeometry(0) : buildCarGeometry(t, 0) });
      geos.push({ type: t, lod: 1, g: t === "bus" ? buildBusGeometry(1) : buildCarGeometry(t, 1) });
      geos.push({ type: t, lod: 2, g: buildCarBoxGeometry(t) });
    }
    const farG = buildGClassFar();
    const vertices = geos.reduce((n, x) => n + x.g.getAttribute("position").count, 0) + farG.getAttribute("position").count;
    farG.dispose();
    // Parked cars, the moving pool and three distant display cars.
    const maxInstances = stalls.length + maxMovers + 3;
    this.mat = makeTrafficMaterial(ctx.tier !== "low");
    this.batch = new THREE.BatchedMesh(Math.max(maxInstances, 1), vertices, 0, this.mat.material);
    this.batch.name = "traffic-and-parked-cars";
    // Phones: no sun shadows from everyday cars (each would be drawn again per cascade); the contact
    // shadows ground them.
    this.batch.castShadow = ctx.tier !== "low";
    this.batch.receiveShadow = true;
    const ids = new Map<string, number>();
    for (const x of geos) {
      ids.set(`${x.type}-${x.lod}`, this.batch.addGeometry(x.g));
      x.g.dispose();
    }
    for (const t of types) this.lods.set(t, [ids.get(`${t}-0`) ?? 0, ids.get(`${t}-1`) ?? 0, ids.get(`${t}-2`) ?? 0]);

    // Contact shadows (one quad per vehicle) and headlight pools (moving cars, after dark).
    const shadowTex = contactShadowTexture(4.5, 1.85, 2.7, 1.55);
    const plane = new THREE.PlaneGeometry(1, 1);
    plane.rotateX(-Math.PI / 2);
    const smat = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: shadowTex, transparent: true, depthWrite: false, opacity: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    smat.name = "traffic-contact-shadows";
    this.shadows = new THREE.InstancedMesh(plane, smat, Math.max(maxInstances, 1));
    this.shadows.name = "traffic-contact-shadows";
    this.shadows.renderOrder = 1;
    this.shadows.frustumCulled = false;
    if (ctx.tier !== "low") {
      const poolTex = poolTexture();
      const pg = new THREE.PlaneGeometry(1, 1);
      pg.rotateX(-Math.PI / 2);
      const pmat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.93, 0.82).multiplyScalar(POOL_LUMINANCE), map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      pmat.name = "headlight-pools";
      this.pools = new THREE.InstancedMesh(pg, pmat, Math.max(maxMovers, 1));
      this.pools.name = "headlight-pools";
      this.pools.frustumCulled = false;
      this.pools.count = 0;
    } else this.pools = null;

    // Parked cars.
    for (const stall of stalls) {
      const r = mulberry32(Math.floor(stall.rank * 1e9) ^ 0x5bd1e995);
      const type = pickCarType(r());
      const id = this.batch.addInstance(this.lods.get(type)?.[1] ?? 0);
      const paint = pickCarColour(r());
      const flags = (paint.metallic ? FLAG.metallic : 0) | (r() < 0.3 ? FLAG.darkRims : 0);
      const col = new THREE.Color(paint.color);
      this.batch.setColorAt(id, new THREE.Vector4(col.r, col.g, col.b, 1 + flags));
      this.instType[id] = type;
      this.instLod[id] = 1;
      this.placeParked(id, stall, type);
      this.parked.push({ id, stall });
    }
    // Pool of instances for the moving vehicles (hidden until used).
    for (let i = 0; i < maxMovers; i++) {
      const id = this.batch.addInstance(this.lods.get("hatch")?.[1] ?? 0);
      this.batch.setColorAt(id, new THREE.Vector4(1, 1, 1, 1));
      this.batch.setVisibleAt(id, false);
      this.instType[id] = "hatch";
      this.instLod[id] = 1;
      this.freeIds.push(id);
    }
    this.shadows.count = maxInstances;
    for (let i = 0; i < maxInstances; i++) this.shadows.setMatrixAt(i, HIDDEN_M);
    for (const { id } of this.parked) this.writeShadow(id);
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  private displayIds: number[] = [];
  private displayShown = false;

  /** Distant stand-ins for the display cars (one batched instance each), hidden while the camera is close. */
  addDisplayFar(cars: readonly { at: V2; heading: number; y: number; paint: THREE.Color; metallic: boolean }[]) {
    const geo = buildGClassFar();
    const gid = this.batch.addGeometry(geo);
    geo.dispose();
    for (const car of cars) {
      const id = this.batch.addInstance(gid);
      this.batch.setColorAt(id, new THREE.Vector4(car.paint.r, car.paint.g, car.paint.b, 1 + (FLAG.lights | (car.metallic ? FLAG.metallic : 0))));
      this.e.set(0, (-car.heading * Math.PI) / 180, 0, "YXZ");
      this.q.setFromEuler(this.e);
      this.v.set(car.at[0], car.y, car.at[1]);
      this.m.compose(this.v, this.q, this.one);
      this.batch.setMatrixAt(id, this.m);
      this.batch.setVisibleAt(id, false);
      // Footprint for its contact shadow (≈ G-Class size).
      this.instType[id] = "suv";
      this.instLod[id] = -1;
      this.displayIds.push(id);
    }
  }

  setDisplayFar(on: boolean) {
    if (on === this.displayShown) return;
    this.displayShown = on;
    for (const id of this.displayIds) {
      this.batch.setVisibleAt(id, on);
      this.writeShadow(id);
    }
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  /** Parked car on its stall: on the ground, pitched and rolled with the slope. */
  private placeParked(id: number, stall: Stall, type: CarType) {
    const h = (stall.heading * Math.PI) / 180;
    const fx = Math.sin(h);
    const fz = -Math.cos(h);
    const c = type === "bus" ? null : specOf(type);
    const half = c ? c.wb / 2 : 3;
    const tw = c ? c.W / 2 - 0.2 : 1;
    const g = this.ground;
    const yF = g.heightAt(stall.x + fx * half, stall.z + fz * half);
    const yR = g.heightAt(stall.x - fx * half, stall.z - fz * half);
    const yL = g.heightAt(stall.x + fz * tw, stall.z - fx * tw);
    const yRt = g.heightAt(stall.x - fz * tw, stall.z + fx * tw);
    const y = (yF + yR + yL + yRt) / 4;
    const pitch = Math.atan2(yF - yR, 2 * half);
    // Positive roll lifts the right side (+x).
    const roll = Math.atan2(yRt - yL, 2 * tw) * 0.8;
    this.e.set(pitch, -h, roll, "YXZ");
    this.q.setFromEuler(this.e);
    this.v.set(stall.x, y, stall.z);
    this.m.compose(this.v, this.q, this.one);
    this.batch.setMatrixAt(id, this.m);
  }

  private writeShadow(id: number) {
    if (!this.batch.getVisibleAt(id)) {
      this.shadows.setMatrixAt(id, HIDDEN_M);
      return;
    }
    this.batch.getMatrixAt(id, this.m);
    const type = this.instType[id] ?? "hatch";
    const len = lengthOf(type) + 0.9;
    const wid = (type === "bus" ? 2.55 : specOf(type).W) + 0.7;
    // Lay the quad flat under the car: keep yaw and position, scale to the footprint.
    this.m.decompose(this.v, this.q, scratchScale);
    this.e.setFromQuaternion(this.q, "YXZ");
    this.q.setFromEuler(new THREE.Euler(0, this.e.y, 0, "YXZ"));
    // The plane's U runs along x: turn it so the long side is along the car (z).
    this.q.multiply(QUARTER_TURN);
    this.v.y += 0.03;
    scratchScale.set(len, 1, wid);
    this.m.compose(this.v, this.q, scratchScale);
    this.shadows.setMatrixAt(id, this.m);
  }

  /** Show the share of parked cars right for the time of day. */
  setOccupancy(iso: string) {
    const lot = parkingOccupancy(iso, "lot");
    const street = parkingOccupancy(iso, "street");
    if (Math.abs(lot - this.occupancy.lot) < 1e-3 && Math.abs(street - this.occupancy.street) < 1e-3) return;
    this.occupancy = { lot, street };
    for (const { id, stall } of this.parked) {
      const share = stall.kind === "lot" ? lot : street;
      this.batch.setVisibleAt(id, stall.rank < share);
      this.writeShadow(id);
    }
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  setNight(night: number, time: number) {
    this.mat.uniforms.uTwNight.value = night;
    this.mat.uniforms.uTwTime.value = time;
    if (this.pools) (this.pools.material as THREE.MeshBasicMaterial).opacity = clamp((night - 0.25) / 0.5, 0, 1);
  }

  // ── Routes and movers ──

  // Renderer side of the traffic: an instance per vehicle, its paint and flags.
  private attach(m: Mover): boolean {
    const id = this.freeIds.pop();
    if (id === undefined) return false;
    const type = m.type;
    let flags = FLAG.lights;
    const color = m.color;
    if (type === "bus") {
      const y = new THREE.Color("#f2c200");
      color.set(y.r, y.g, y.b, 1);
      flags |= FLAG.bus;
    } else {
      // Taxis: black, dark grey or silver estates.
      const paint = type === "taxi" ? { color: ["#0e0f11", "#3d4146", "#a9adb1"][Math.floor(m.rnd() * 3)], metallic: true } : pickCarColour(m.rnd());
      const c = new THREE.Color(paint.color);
      color.set(c.r, c.g, c.b, 1);
      if (paint.metallic) flags |= FLAG.metallic;
      if (m.rnd() < 0.3) flags |= FLAG.darkRims;
    }
    m.flags = flags;
    color.w = 1 + flags;
    m.id = id;
    this.batch.setColorAt(id, color);
    this.batch.setGeometryIdAt(id, this.lods.get(type)?.[1] ?? 0);
    this.batch.setVisibleAt(id, true);
    this.instType[id] = type;
    this.instLod[id] = 1;
    return true;
  }

  private detach(m: Mover) {
    if (m.id < 0) return;
    this.batch.setVisibleAt(m.id, false);
    this.shadows.setMatrixAt(m.id, HIDDEN_M);
    this.freeIds.push(m.id);
  }

  /** Write the movers' matrices, brake lights and headlight pools. */
  sync() {
    let pool = 0;
    for (const m of this.sim.movers) {
      const r = this.sim.routes[m.route];
      const off = frontOffset(m.type);
      const sc = m.s - off;
      const line = r.line;
      line.at(sc, this.p2);
      line.dir(sc, 2.4, this.d2);
      const dx = this.d2[0];
      const dz = this.d2[1];
      const x = this.p2[0] - dz * m.lateral;
      const z = this.p2[1] + dx * m.lateral;
      const half = m.type === "bus" ? 2.95 : specOf(m.type).wb / 2;
      const yF = this.ground.heightAt(x + dx * half, z + dz * half);
      const yR = this.ground.heightAt(x - dx * half, z - dz * half);
      const yaw = Math.atan2(-dx, -dz);
      this.e.set(Math.atan2(yF - yR, 2 * half), yaw, 0, "YXZ");
      this.q.setFromEuler(this.e);
      this.v.set(x, (yF + yR) / 2, z);
      this.m.compose(this.v, this.q, this.one);
      this.batch.setMatrixAt(m.id, this.m);
      // Hazards while pulling in to the drop-off and standing there.
      const dropping = m.dropoff === -2 || (m.dropoff >= 0 && m.dropoff - m.s < 25);
      const flags = (m.flags & ~(FLAG.brake | FLAG.hazard)) | (m.a < -0.6 || m.v < 0.3 ? FLAG.brake : 0) | (dropping ? FLAG.hazard : 0);
      if (flags !== m.flags) {
        m.flags = flags;
        m.color.w = 1 + flags;
        this.batch.setColorAt(m.id, m.color);
      }
      this.writeShadow(m.id);
      if (this.pools && pool < this.pools.instanceMatrix.count) {
        // A soft pool of light on the road ahead of the car.
        this.v.set(x + dx * (off + 5.5), (yF + yR) / 2 + 0.04, z + dz * (off + 5.5));
        this.q.setFromEuler(new THREE.Euler(0, yaw, 0, "YXZ"));
        scratchScale.set(3.4, 1, 9.5);
        this.m.compose(this.v, this.q, scratchScale);
        this.pools.setMatrixAt(pool++, this.m);
      }
    }
    if (this.pools) {
      this.pools.count = pool;
      this.pools.instanceMatrix.needsUpdate = true;
    }
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  /** Near / mid / far geometry by distance from the camera (only when the camera has moved). */
  updateLod(camera: THREE.Camera, force = false) {
    if (!force && camera.position.distanceToSquared(this.camAt) < 64) return;
    this.camAt.copy(camera.position);
    const n = this.instType.length;
    const c = camera.position;
    for (let id = 0; id < n; id++) {
      if (this.instLod[id] < 0 || !this.batch.getVisibleAt(id)) continue;
      this.batch.getMatrixAt(id, this.m);
      const e = this.m.elements;
      const d = Math.hypot(e[12] - c.x, e[13] - c.y, e[14] - c.z);
      const lod = d < LOD_NEAR ? 0 : d < LOD_MID ? 1 : 2;
      if (lod !== this.instLod[id]) {
        this.instLod[id] = lod;
        const type = this.instType[id] ?? "hatch";
        this.batch.setGeometryIdAt(id, this.lods.get(type)?.[lod] ?? 0);
      }
    }
  }

  /** Is any moving vehicle on screen and close enough for its motion to show? */
  nearestMover(frustum: THREE.Frustum, camera: THREE.Camera): number {
    let best = Infinity;
    const sphere = scratchSphere;
    for (const m of this.sim.movers) {
      this.batch.getMatrixAt(m.id, this.m);
      sphere.center.setFromMatrixPosition(this.m);
      sphere.radius = m.len / 2 + 0.5;
      if (!frustum.intersectsSphere(sphere)) continue;
      best = Math.min(best, sphere.center.distanceTo(camera.position));
    }
    return best;
  }

  dispose() {
    this.batch.dispose();
    this.shadows.dispose();
    this.pools?.dispose();
  }
}


/** Soft elongated light pool for headlights (additive). */
function poolTexture(): THREE.CanvasTexture {
  // Low-beam pattern on the road (canvas top = far ahead, bottom = the bumper): an ellipse fading to
  // nothing well inside the quad, so no edge of the quad ever shows.
  const W = 128;
  const H = 256;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H * 0.62);
  ctx.scale(W * 0.46, H * 0.36);
  const g = ctx.createRadialGradient(0, 0.3, 0, 0, 0, 1);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return canvasTexture(canvas, { srgb: true });
}

/** Peak luminance a pair of low beams adds to dry asphalt ≈ 6 m ahead (≈ 80 lux → ≈ 3 cd/m², scene units). */
const POOL_LUMINANCE = 0.0032;

// ── Routes and parking from the campus data ─────────────────────────────────

/** Traffic routes with their signal stop lines (from the City's signalised crossings) and bus stops. */
export function buildRoutes(streets: StreetsData | null, scale: number): Route[] {
  const crossings = (streets?.crossings ?? []).filter((c) => c.kind === "signals");
  const stops = streets?.busStops ?? [];
  const routes: Route[] = [];
  const rnd = mulberry32(90210);
  for (const setup of ROUTE_SETUP) {
    const flat = LANES[setup.id];
    if (!flat) continue;
    const line = new Polyline(flat);
    // First signalised crossing met per junction = the stop line (1.2 m before the crosswalk).
    const entry = new Map<number, number>();
    for (const c of crossings) {
      for (let i = 0; i + 1 < c.line.length; i++) {
        for (const s of line.crossings(c.line[i], c.line[i + 1])) {
          const p = line.at(s);
          let jBest = -1;
          let dBest = 60;
          JUNCTIONS.forEach((j, k) => {
            const d = Math.hypot(p[0] - j.at[0], p[1] - j.at[1]);
            if (d < dBest) {
              dBest = d;
              jBest = k;
            }
          });
          if (jBest < 0) continue;
          const prev = entry.get(jBest);
          if (prev === undefined || s < prev) entry.set(jBest, s);
        }
      }
    }
    const stopLines = [...entry.entries()].map(([junction, s]) => ({ s: Math.max(0, s - 1.2), junction, phase: setup.phase })).sort((a, b) => a.s - b.s);
    // Bus stops on the right-hand side, 2–8 m off the lane.
    const busStops: number[] = [];
    if (setup.busEvery > 0) {
      for (const b of stops) {
        const pr = line.project(b.at);
        if (pr.d < 1.5 || pr.d > 8 || pr.s < 30 || pr.s > line.length - 30) continue;
        const p = line.at(pr.s);
        const d = line.dir(pr.s);
        const right = (b.at[0] - p[0]) * -d[1] + (b.at[1] - p[1]) * d[0];
        if (right > 0) busStops.push(pr.s);
      }
      busStops.sort((a, b) => a - b);
    }
    routes.push({
      id: setup.id,
      line,
      speed: setup.speed,
      rate: setup.rate * scale,
      busEvery: setup.busEvery,
      rateBase: setup.rate * scale,
      busBase: setup.busEvery,
      stops: stopLines,
      busStops,
      next: rnd() * 6,
      nextBus: 5 + rnd() * setup.busEvery,
      // Partners' drop-off at BioCity's recess (SPEC §6.3: kerb (−35.6, −22.0), NE-bound kerb lane).
      dropoff: setup.id === "tyk-ne-1" ? line.project(DROPOFF_KERB).s + 2.6 : undefined,
      nextTaxi: 20 + rnd() * 30,
    });
  }
  return routes;
}

/** Every parking stall on the campus: mapped spaces, laid-out car parks, kerbside rows. */
export function collectStalls(campus: CampusData | null, limit: number, focus: V2): Stall[] {
  if (!campus) return [];
  const spaces = campus.areas.filter((a) => a.kind === "parking_space").map((a) => a.polygon);
  const lots = campus.areas.filter((a) => a.kind === "parking" && !a.covered && (a.layer ?? 0) === 0);
  const buildings = campus.buildings.filter((b) => !(b.minHeight && b.minHeight > 2)).map((b) => b.polygon);
  const stalls: Stall[] = stallsFromSpaces(spaces, 1234);
  const spaceCentres = spaces.map((p): V2 => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length]);
  lots.forEach((lot, i) => {
    // Car parks with mapped spaces are already covered.
    if (spaceCentres.some((c) => pointInRing(c, lot.polygon))) return;
    const near = buildings.filter((b) => {
      const bb = polygonBounds(b);
      const lb = polygonBounds(lot.polygon);
      return bb.maxX > lb.minX && bb.minX < lb.maxX && bb.maxZ > lb.minZ && bb.minZ < lb.maxZ;
    });
    stalls.push(...layoutStalls(lot.polygon, near, 5000 + i));
  });
  const lotRings = lots.map((l) => l.polygon);
  let k = 0;
  for (const [route, runs] of Object.entries(PARKING_STRIPS)) {
    for (const run of runs) {
      const line = new Polyline(run);
      for (const st of stripStalls(line, headingOf, 7000 + k++)) {
        // Kerbside bays that OSM maps as small car parks are filled by the car-park layout.
        if (lotRings.some((r) => pointInRing([st.x, st.z], r))) continue;
        stalls.push(st);
      }
    }
    void route;
  }
  // Keep the closest ones to the event when the tier allows fewer cars.
  if (stalls.length > limit) {
    stalls.sort((a, b) => Math.hypot(a.x - focus[0], a.z - focus[1]) - Math.hypot(b.x - focus[0], b.z - focus[1]));
    stalls.length = limit;
  }
  return stalls;
}

/** Terrain, with bridge decks over the railway where the roads cross it. */
function vehicleGround(terrain: Terrain | null, streets: StreetsData | null): Ground {
  const decks = (streets?.areas ?? []).filter((a) => a.deckY !== undefined && a.street !== "Kalevansilta").map((a) => ({ ring: a.poly, box: polygonBounds(a.poly), y: a.deckY ?? 0 }));
  return {
    heightAt(x: number, z: number) {
      for (const d of decks) {
        if (x < d.box.minX || x > d.box.maxX || z < d.box.minZ || z > d.box.maxZ) continue;
        if (pointInRing([x, z], d.ring)) return d.y;
      }
      return terrain ? terrain.heightAt(x, z) : 0;
    },
  };
}

/**
 * How busy the streets are at a Turku wall-clock time (multiplier of the
 * afternoon peak): weekday rush hours, quiet evenings, almost empty small
 * hours; buses run ≈ 05:30–23:30 (none at night), less often in the evening.
 */
export function trafficLevel(iso: string): { cars: number; buses: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return { cars: 1, buses: 1 };
  const dow = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
  const hour = Number(m[4]) + Number(m[5]) / 60;
  const curve = (pts: [number, number][]) => {
    if (hour <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      if (hour <= pts[i][0]) {
        const [h0, a] = pts[i - 1];
        const [h1, b] = pts[i];
        return a + ((b - a) * (hour - h0)) / (h1 - h0);
      }
    }
    return pts[pts.length - 1][1];
  };
  const weekday = dow >= 1 && dow <= 5;
  const cars = weekday
    ? curve([[0, 0.07], [5, 0.07], [6.5, 0.45], [7.5, 1], [9, 0.8], [11, 0.7], [15, 0.85], [16, 1], [17.5, 0.85], [19, 0.55], [21, 0.35], [23, 0.18], [24, 0.09]])
    : curve([[0, 0.12], [3, 0.06], [6, 0.06], [9, 0.3], [11, 0.55], [16, 0.6], [19, 0.4], [22, 0.25], [24, 0.14]]);
  const buses = hour < 5.5 || hour > 23.5 ? 0 : hour > 19.5 || hour < 6.5 || !weekday ? 0.5 : 1;
  return { cars, buses };
}

/**
 * Seconds between taxis dropping people off at BioCity's partner entrance:
 * companies arriving Friday afternoon and Saturday morning, the odd late
 * builder at night, nobody in the early hours.
 */
export function dropoffInterval(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return 0;
  const dow = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay();
  const hour = Number(m[4]) + Number(m[5]) / 60;
  if (dow === 5) return hour >= 14.5 && hour < 19.5 ? 70 : hour >= 19.5 && hour < 23 ? 240 : 0;
  if (dow === 6) return hour >= 8 && hour < 11 ? 90 : hour >= 11 && hour < 18.5 ? 200 : hour < 2 ? 420 : 0;
  if (dow === 0) return hour >= 12 && hour < 15.5 ? 120 : 0;
  return 0;
}

// ── Module ───────────────────────────────────────────────────────────────────

/**
 * Camera for the "supercars" target (SPEC §5.5): from across Tykistökatu, as
 * if from a second-floor window on the north-west side — the three cars either
 * side of the walkway to the revolving door, the sign, the flagpoles. High
 * enough (9.5 m; 11 m on portrait screens, which stand further back) that a bus
 * passing in front of the display never hides a car: in a headless 15-minute
 * run of the traffic (TrafficSim) no sight line to the cars is ever cut, against
 * ≈ 2.4 % of the time from 6 m.
 */
export const SUPERCARS_VIEW: CameraView = {
  position: [-55.0, 9.5, -33.0],
  target: [-28.6, 1.5, -16.2],
  hfov: 44,
  fit: 8,
  portrait: { position: [-57.0, 11.0, -34.2], target: [-28.8, 2.0, -16.2] },
  open: null,
};

/** Parked-car budget per tier (closest to the event first). */
const PARKED_LIMIT: Record<TwinContext["tier"], number> = { ultra: 640, high: 440, low: 170 };
const MOVER_LIMIT: Record<TwinContext["tier"], number> = { ultra: 44, high: 30, low: 14 };

export async function buildVehicles(ctx: TwinContext): Promise<WorldModule> {
  const [terrain, campus, streets] = await Promise.all([
    loadTerrain().catch(() => null),
    loadCampus().catch(() => null),
    loadStreets().catch(() => null),
  ]);
  const root = new THREE.Group();
  root.name = "vehicles";
  const display = buildDisplay(ctx, terrain);
  root.add(display.group);

  // Everyday cars: parked (time-of-day occupancy) and moving (ultra/high, no reduced motion).
  const animate = !ctx.reducedMotion && ctx.tier !== "low";
  const ground = vehicleGround(terrain, streets);
  const stalls = collectStalls(campus, PARKED_LIMIT[ctx.tier], [60, 0]);
  const fleet = new Vehicles(ctx, ground, stalls, MOVER_LIMIT[ctx.tier], 20261106);
  fleet.sim.routes = buildRoutes(streets, ctx.tier === "high" ? 0.8 : ctx.tier === "low" ? 0.6 : 1);
  fleet.sim.setLevel(trafficLevel(ctx.lighting().iso));
  fleet.sim.taxiEvery = dropoffInterval(ctx.lighting().iso);
  // Start from a lived-in street: two minutes of traffic, simulated before the first frame
  // (the still that low tier and reduced motion keep: queues at the lights, cars in between).
  fleet.sim.prewarm(120);
  fleet.sync();
  fleet.setOccupancy(ctx.lighting().iso);
  root.add(fleet.batch, fleet.shadows);
  if (fleet.pools) root.add(fleet.pools);
  // Beyond ~150 m the display cars swap to one batched stand-in each (saves ~12 draw calls and ~50k triangles).
  const PAINT_RGB: Record<PaintName, [string, boolean]> = { obsidian: ["#0b0c0e", true], magno: ["#5b5f62", true], white: ["#e9e9e6", false] };
  fleet.addDisplayFar(
    DISPLAY_CARS.map((c) => ({
      at: c.at,
      heading: c.heading,
      y: Math.max(RECESS_FLOOR_Y, terrain ? terrain.heightAt(c.at[0], c.at[1]) : RECESS_FLOOR_Y),
      paint: new THREE.Color(PAINT_RGB[c.paint][0]),
      metallic: PAINT_RGB[c.paint][1],
    })),
  );
  const DISPLAY_CENTRE = new THREE.Vector3(-29.5, 1, -16.5);
  let displayNear = true;
  const updateDisplayLod = (camera: THREE.Camera) => {
    const d = camera.position.distanceTo(DISPLAY_CENTRE);
    const near = displayNear ? d < 165 : d < 140;
    if (near === displayNear) return false;
    displayNear = near;
    display.group.visible = near;
    fleet.setDisplayFar(!near);
    return true;
  };

  const labels: CSS2DObject[] = [makeLabel("Supercar display", "landmark", -28.4, 3.1, -16.4, "biocity")];
  const targets: TwinTarget[] = [{ id: "supercars", view: SUPERCARS_VIEW, walkTo: [-33.2, -21.2] }];
  // Picking: invisible boxes round the cars (always present, also when the far stand-ins show).
  root.add(display.pick);
  const pickables: THREE.Object3D[] = [display.pick];

  // Local reflections for the display cars (ultra/high; phones keep the sky environment).
  const probe =
    ctx.tier !== "low" && display.hook
      ? new ReflectionProbe(new THREE.Vector3(...PROBE_AT), ctx.tier === "ultra" ? 256 : 128, display.reflective, [
          ...display.group.children.filter((o) => (o as THREE.Mesh).isMesh),
          fleet.batch,
          fleet.shadows,
          ...(fleet.pools ? [fleet.pools] : []),
        ], display.parallax)
      : null;
  if (probe && display.hook) probe.attach(display.hook);

  let simTime = 0;
  const applyLighting = (state: LightingState) => {
    const night = state.night;
    // DRLs and tail LEDs on (display mode): DRL brightness by day, dimmed to position-light level after dark.
    display.emit.value = LUMINANCE.signLit * (2.5 + 9.5 * (1 - night));
    // 4000 K display spots fade in from sunset (≈ 300 lux on the cars at full night: they stand out
    // from the ≈ 20 lux street without bleaching under the night exposure).
    const k = clamp((night - 0.05) / 0.6, 0, 1);
    for (const s of display.spots) s.intensity = 135 * k;
    fleet.setOccupancy(state.iso);
    fleet.setNight(night, simTime);
    fleet.sim.taxiEvery = dropoffInterval(state.iso);
    fleet.sim.setLevel(trafficLevel(state.iso));
    // Crisp shadows under the cars from the display spots (ultra, after dark only). castShadow stays
    // constant (toggling it would recompile every material in the scene at dusk); the maps only
    // re-render while the spots are on.
    for (const s of display.spots) {
      const on = k > 0.01;
      if (on && !s.shadow.autoUpdate) s.shadow.needsUpdate = true;
      s.shadow.autoUpdate = on;
    }
    probe?.invalidate();
  };
  applyLighting(ctx.lighting());

  const frustum = new THREE.Frustum();
  const projScreen = new THREE.Matrix4();
  let frame = 0;
  let lodPrimed = false;

  const vehicles: WorldModule = {
    id: "vehicles",
    root,
    labels,
    pickables,
    targets,
    views: { "biocity:supercars": SUPERCARS_VIEW },
    ready: display.ready,
    setLighting(state) {
      applyLighting(state);
    },
    tick(dt, _elapsed, camera) {
      frame++;
      let active = updateDisplayLod(camera);
      if (display.group.visible && probe && probe.update(camera, performance.now())) active = true;
      if (!lodPrimed) {
        fleet.updateLod(camera, true);
        lodPrimed = true;
      }
      if (!animate) {
        fleet.updateLod(camera);
        return active;
      }
      // Simulate always (cheap); render only while moving traffic is on screen and close enough to see it move.
      fleet.sim.step(dt);
      simTime += dt;
      projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreen);
      const nearest = fleet.nearestMover(frustum, camera);
      const every = nearest < 160 ? 1 : nearest < 450 ? 2 : nearest < 900 ? 4 : 0;
      if (every > 0 && frame % every === 0) {
        fleet.sync();
        fleet.mat.uniforms.uTwTime.value = simTime;
        fleet.updateLod(camera);
        active = true;
      } else fleet.updateLod(camera);
      return active;
    },
    dispose() {
      probe?.dispose();
      fleet.dispose();
    },
  };
  return vehicles;
}
