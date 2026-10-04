import type { V2 } from "../../types";
import { pointInRing, polygonCentroid, ringArea } from "../../util";
import { LUMINANCE } from "../../sky/sky";
import type { Solid } from "./envelope";
import { box, column, lin, pipe } from "./kit";
import type { DetailKit } from "./details";
import { bearingDiff } from "./recipes";
import type { SignAtlas, SignBuilder } from "./signs";

/**
 * Hand-placed details of the buildings that frame the event venues (SPEC
 * §3.4, §4.4–§4.5, research photos and the 2022 true orthophoto):
 *
 * - Electrocity: the bundle of four big silver ducts along its roof, the
 *   vertical ELECTROCITY letters on the Tykistökatu end, entrance B's steps
 *   and canopy in the BioCity–Electrocity yard.
 * - Eurocity: the glazed level-1 skybridge over Joukahaisenkatu.
 * - ICT-City: the solar-panel field on the spine roof.
 * - DataCity: the DATACITY letters on the roof frame towards Lemminkäisenkatu,
 *   the row of steel ducts in front of the black plant volume (towards Joki).
 * - Kupittaa station: piers under the hall on its bridge, the glazed escalator
 *   tube down to the platform, the station name boards.
 */

type Rgb = [number, number, number];
const RAD = Math.PI / 180;

/** Ground unit vector of a compass bearing. */
const dirOf = (bearing: number): V2 => [Math.sin(bearing * RAD), -Math.cos(bearing * RAD)];
/** box() yaw for something whose local +x runs along ground direction t. */
const yawAlong = (t: V2) => -Math.atan2(t[1], t[0]);

export interface BespokeBuilding {
  role?: string;
  osmId: number;
  solids: Solid[];
  polygon: V2[];
}

export interface BespokeOut {
  /** Extra walk colliders. */
  colliders: { a: V2; b: V2 }[];
}

// ── Electrocity ──────────────────────────────────────────────────────────────

export function electrocity(kit: DetailKit, bt: BespokeBuilding, signs: SignBuilder | null, atlas: SignAtlas | null, out: BespokeOut) {
  const main = bt.solids.find((s) => s.flatY !== null && Math.abs(s.flatY - 28.95) < 0.2);
  const yDuct = 30.7;
  // Four parallel ducts along the long axis (2022 true ortho), on stands.
  const a: V2 = [27.2, -61.5];
  const b: V2 = [49.6, -21.5];
  const t: V2 = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(t[0], t[1]);
  const u: V2 = [t[0] / len, t[1] / len];
  const p: V2 = [-u[1], u[0]];
  const steel = lin("#b8bcbf");
  const stand = lin("#6f7478");
  const low = kit.tier === "low";
  for (let k = 0; k < 4; k++) {
    const off = (k - 1.5) * 1.45;
    const r = k === 1 || k === 2 ? 0.55 : 0.45;
    const a3: [number, number, number] = [a[0] + p[0] * off, yDuct, a[1] + p[1] * off];
    const b3: [number, number, number] = [b[0] + p[0] * off, yDuct, b[1] + p[1] * off];
    pipe(kit.metal, a3, b3, r, steel, low ? 8 : 16);
    // Elbows down into the roof at the south-east end, and into the plant room at the north-west end.
    const roofHere = main ? main.flatY ?? 28.95 : 28.95;
    pipe(kit.metal, b3, [b3[0], roofHere, b3[2]], r * 0.95, steel, low ? 8 : 14);
    if (!low) {
      for (let s = 0; s <= len; s += 4.2) {
        const x = a[0] + u[0] * s + p[0] * off;
        const z = a[1] + u[1] * s + p[1] * off;
        const yr = roofTop(bt.solids, x, z) ?? roofHere;
        box(kit.paint, x, (yr + yDuct - r) / 2, z, 0.16, Math.max(0.1, yDuct - r - yr), r * 1.6, yawAlong(u), stand);
      }
    }
  }
  // Vertical ELECTROCITY letters on the Tykistökatu end (the north-north-west face of the end block).
  if (signs && atlas) {
    const fa: V2 = [14.8, -88.4];
    const fb: V2 = [7.5, -83.5];
    const facing = 326;
    const n = dirOf(facing);
    const cx = (fa[0] + fb[0]) / 2 + n[0] * 0.12;
    const cz = (fa[1] + fb[1]) / 2 + n[1] * 0.12;
    signs.word(atlas, "electrocity", cx, kit.heightAt(cx, cz) + 13.6, cz, facing, 15.2);
  }
  // Entrance B in the yard: landing, a short flight and a canopy (SPEC §4.4: steps/ramp 13–21, −46…−35).
  const door: V2 = [17.4, -45.6];
  const nb = dirOf(236);
  const tb: V2 = [nb[1], -nb[0]];
  const g = kit.heightAt(door[0] + nb[0] * 6, door[1] + nb[1] * 6);
  const landing = g + 0.95;
  const grey = kit.calibrate("#a9a8a3");
  box(kit.concrete, door[0] + nb[0] * 1.5, (g - 0.3 + landing) / 2, door[1] + nb[1] * 1.5, 4.2, landing - g + 0.3, 3.0, yawAlong(tb), grey);
  for (let i = 0; i < 6; i++) {
    const d = 3.0 + i * 0.32;
    const h = landing - (i + 1) * ((landing - g) / 6);
    box(kit.concrete, door[0] + nb[0] * (d + 0.16), (g - 0.3 + h) / 2, door[1] + nb[1] * (d + 0.16), 3.0, h - g + 0.3, 0.32, yawAlong(tb), grey);
  }
  box(kit.paint, door[0] + nb[0] * 1.6, landing + 3.0, door[1] + nb[1] * 1.6, 4.6, 0.2, 3.2, yawAlong(tb), lin("#d8dad9"));
  const lamp = lin("#ffe2c0").map((c) => c * LUMINANCE.bollard) as Rgb;
  box(kit.emissive, door[0] + nb[0] * 1.6, landing + 2.89, door[1] + nb[1] * 1.6, 0.25, 0.01, 0.25, yawAlong(tb), lamp);
  out.colliders.push({ a: [door[0] + tb[0] * 2.1, door[1] + tb[1] * 2.1], b: [door[0] + tb[0] * 2.1 + nb[0] * 4.8, door[1] + tb[1] * 2.1 + nb[1] * 4.8] });
}

// ── Eurocity ─────────────────────────────────────────────────────────────────

/** The enclosed skybridge over Joukahaisenkatu (OSM area w782074004, level 1). */
export function eurocitySkybridge(kit: DetailKit, ring: V2[]) {
  if (ring.length < 3) return;
  const [cx, cz] = polygonCentroid(ring);
  const g = kit.heightAt(cx, cz);
  const y0 = g + 4.4;
  const y1 = y0 + 3.3;
  // Glass walls with mullions (the glazing material), a white soffit and roof.
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    kit.glazing.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], [1, 1, 1]);
    // Edge beams (white) top and bottom.
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.3) continue;
    const t: V2 = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    box(kit.paint, (a[0] + b[0]) / 2, y0 - 0.25, (a[1] + b[1]) / 2, len, 0.5, 0.25, yawAlong(t), lin("#dcdfe0"));
    box(kit.paint, (a[0] + b[0]) / 2, y1 + 0.2, (a[1] + b[1]) / 2, len, 0.4, 0.25, yawAlong(t), lin("#dcdfe0"));
    for (let s = 1.6; s < len - 0.4; s += 1.6) {
      const x = a[0] + t[0] * s;
      const z = a[1] + t[1] * s;
      box(kit.paint, x, (y0 + y1) / 2, z, 0.07, y1 - y0, 0.07, yawAlong(t), lin("#9aa3a8"));
    }
  }
  capFlat(kit, ring, y1 + 0.4, lin("#c9cccd"), false);
  capFlat(kit, ring, y0 - 0.5, lin("#c4c7c8"), true);
  // Lit inside at night (corridor lights).
  const lamp = lin("#fff1dd").map((c) => c * LUMINANCE.ceilingPanel * 0.12) as Rgb;
  capFlatEm(kit, ring, y1 - 0.05, lamp);
}

function capFlat(kit: DetailKit, ring: V2[], y: number, color: Rgb, down: boolean) {
  kit.paintCap(ring, y, color, down);
}
function capFlatEm(kit: DetailKit, ring: V2[], y: number, color: Rgb) {
  kit.emissiveCap(ring, y, color, true);
}

// ── ICT-City ─────────────────────────────────────────────────────────────────

/** Rows of tilted PV panels on the spine roof (2022/2025 orthophotos). */
export function ictSolar(kit: DetailKit, bt: BespokeBuilding) {
  const spine = bt.solids
    .filter((s) => s.flatY !== null && s.flatY > 28)
    .sort((x, y) => Math.abs(ringArea(y.ring)) - Math.abs(ringArea(x.ring)))[0];
  if (!spine) return;
  const y = spine.flatY as number;
  const along = dirOf(128.8); // long axis
  const across = dirOf(218.8); // panels face south-west
  const [cx, cz] = polygonCentroid(spine.ring);
  const step = kit.tier === "low" ? 4.2 : 2.1;
  const depth = 1.05;
  const tilt = 12 * RAD;
  const frame = lin("#9ea3a7");
  for (let r = -40; r <= 40; r++) {
    // Leave a maintenance aisle along the middle.
    if (r === 0) continue;
    const off = r * step;
    let run: number | null = null;
    for (let s = -90; s <= 90; s += 0.5) {
      const x = cx + along[0] * s + across[0] * off;
      const z = cz + along[1] * s + across[1] * off;
      const ok = insetInside([x, z], spine.ring, 2.2) && !blockedAbove(bt.solids, spine, x, z, y);
      if (ok && run === null) run = s;
      if ((!ok || s >= 90) && run !== null) {
        const len = s - run - 0.5;
        if (len > 2) {
          const mid = run + len / 2;
          const x0 = cx + along[0] * mid + across[0] * off;
          const z0 = cz + along[1] * mid + across[1] * off;
          kit.solar(x0, y + 0.45, z0, len, depth, along, tilt);
          box(kit.paint, x0 - across[0] * 0.3, y + 0.2, z0 - across[1] * 0.3, len, 0.1, 0.12, yawAlong(along), frame);
        }
        run = null;
      }
    }
  }
}

/**
 * Where EduCity's glazed link bridges (built by buildings/educity) meet ICT-City's south-east end
 * (SPEC §3.3.2): a dark portal frame round each bridge mouth with glazed doors, lit from the
 * corridor at night — so the bridges read as connected, not pasted against windows.
 */
export function ictBridgePortals(kit: DetailKit) {
  // E frame (SPEC §1.3): θ 38.983°, origin (217.472, 51.22); bridge mouths at E x −12.2, z 30.87…34.45.
  const th = 38.983 * RAD;
  const c = Math.cos(th);
  const s = Math.sin(th);
  const E = (x: number, z: number): V2 => [x * c - z * s + 217.472, x * s + z * c + 51.22];
  const a = E(-12.2, 30.87);
  const b = E(-12.2, 34.45);
  const n: V2 = [c, s]; // outward from ICT-City, towards EduCity
  const t: V2 = [(b[0] - a[0]) / 3.58, (b[1] - a[1]) / 3.58];
  const yaw = yawAlong(t);
  const mid: V2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const frame = lin("#2a2c30");
  const lamp = lin("#fff0dc").map((v) => v * LUMINANCE.shopfront * 0.5) as Rgb;
  for (const [floor, roof] of [
    [3.4, 7.4],
    [16.4, 20.4],
  ]) {
    const h = roof - floor;
    const cx = mid[0] + n[0] * 0.08;
    const cz = mid[1] + n[1] * 0.08;
    // Frame: jambs, head and threshold slightly proud of the wall.
    box(kit.paint, cx + t[0] * 2.0, floor + h / 2 - 0.2, cz + t[1] * 2.0, 0.3, h + 0.4, 0.2, yaw, frame);
    box(kit.paint, cx - t[0] * 2.0, floor + h / 2 - 0.2, cz - t[1] * 2.0, 0.3, h + 0.4, 0.2, yaw, frame);
    box(kit.paint, cx, roof - 0.25, cz, 4.3, 0.5, 0.2, yaw, frame);
    box(kit.paint, cx, floor - 0.6, cz, 4.3, 0.8, 0.2, yaw, frame);
    // Glazed doors with the lit corridor behind.
    box(kit.glazing, mid[0] + n[0] * 0.02, floor + 1.3, mid[1] + n[1] * 0.02, 3.6, 2.6, 0.04, yaw, [1, 1, 1]);
    box(kit.emissive, mid[0] - n[0] * 0.05, floor + 1.6, mid[1] - n[1] * 0.05, 3.4, 3.0, 0.02, yaw, lamp);
  }
}

// ── DataCity ─────────────────────────────────────────────────────────────────

export function datacity(kit: DetailKit, bt: BespokeBuilding, signs: SignBuilder | null, atlas: SignAtlas | null) {
  // DATACITY on a frame along the main roof's south-west edge (Lemminkäisenkatu).
  const main = bt.solids
    .filter((s) => s.flatY !== null && s.flatY > 20 && s.flatY < 23)
    .sort((x, y) => Math.abs(ringArea(y.ring)) - Math.abs(ringArea(x.ring)))[0];
  if (main && signs && atlas) {
    let best: { a: V2; b: V2; len: number } | null = null;
    for (let i = 0; i < main.ring.length; i++) {
      const a = main.ring[i];
      const b = main.ring[(i + 1) % main.ring.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n: V2 = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
      const f = (Math.atan2(n[0], -n[1]) / RAD + 360) % 360;
      if (bearingDiff(f, 218.8) < 25 && (!best || len > best.len)) best = { a, b, len };
    }
    if (best) {
      const t: V2 = [(best.b[0] - best.a[0]) / best.len, (best.b[1] - best.a[1]) / best.len];
      const n: V2 = [-t[1], t[0]];
      const x = (best.a[0] + best.b[0]) / 2 - n[0] * 1.2;
      const z = (best.a[1] + best.b[1]) / 2 - n[1] * 1.2;
      const y0 = main.flatY as number;
      signs.word(atlas, "datacity", x, y0 + 2.2, z, 218.8, 1.9);
      // Frame posts behind the letters.
      for (const s of [-5, -1.7, 1.7, 5]) {
        box(kit.paint, x + t[0] * s - n[0] * 0.25, y0 + 1.5, z + t[1] * s - n[1] * 0.25, 0.1, 3.0, 0.1, yawAlong(t), lin("#5b5f62"));
      }
    }
  }
  // The steel ducts in front of the black plant volume, facing Joki.
  const plant = bt.solids.find((s) => s.tag === "dataPlant");
  if (plant) {
    let best: { a: V2; b: V2; len: number; n: V2 } | null = null;
    for (let i = 0; i < plant.ring.length; i++) {
      const a = plant.ring[i];
      const b = plant.ring[(i + 1) % plant.ring.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n: V2 = [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
      const f = (Math.atan2(n[0], -n[1]) / RAD + 360) % 360;
      if (bearingDiff(f, 38.8) < 40 && (!best || len > best.len)) best = { a, b, len, n };
    }
    if (best) {
      const t: V2 = [(best.b[0] - best.a[0]) / best.len, (best.b[1] - best.a[1]) / best.len];
      const count = 6;
      for (let i = 0; i < count; i++) {
        const s = best.len * (0.2 + (0.6 * i) / (count - 1));
        const x = best.a[0] + t[0] * s + best.n[0] * 1.1;
        const z = best.a[1] + t[1] * s + best.n[1] * 1.1;
        const base = roofTop(bt.solids, x, z) ?? (plant.flatY as number) - 3;
        pipe(kit.metal, [x, base, z], [x, (plant.flatY as number) - 0.6, z], 0.36, lin("#c5c9cc"), 14, false);
        column(kit.metal, x, z, 0.42, (plant.flatY as number) - 0.6, (plant.flatY as number) - 0.3, lin("#d0d3d5"), 14, false);
      }
    }
  }
}

// ── Kupittaa station ─────────────────────────────────────────────────────────

const PLATFORM_Y = -4.84;

/** Stair/escalator tubes between the hall and the island platform (OSM ways 81894010, 81894011). */
export const STATION_STAIRS: { top: V2; bottom: V2 }[] = [
  { top: [202.6, -136.2], bottom: [190.4, -153.4] },
  { top: [211.4, -124.2], bottom: [218.9, -111.5] },
];

export function station(kit: DetailKit, bt: BespokeBuilding, signs: SignBuilder | null, atlas: SignAtlas | null) {
  const hall = bt.solids.slice().sort((x, y) => Math.abs(ringArea(y.ring)) - Math.abs(ringArea(x.ring)))[0];
  if (!hall) return;
  const base = hall.base;
  // Piers under the hall on its bridge over the tracks.
  const ring = hall.ring;
  const [cx, cz] = polygonCentroid(ring);
  const pier = kit.calibrate("#9a9a96");
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const x = cx + (p[0] - cx) * 0.82;
    const z = cz + (p[1] - cz) * 0.82;
    const g = Math.min(kit.heightAt(x, z), PLATFORM_Y + 0.1);
    if (base - g < 1) continue;
    column(kit.concrete, x, z, 0.38, g - 0.2, base, pier, 12);
  }
  // White underside of the bridge deck.
  kit.paintCap(ring, base + 0.02, lin("#d3d6d6"), true);
  // Glazed escalator/stair tubes from the hall down to the platform at both ends (SPEC §4.5; OSM steps).
  for (const t of STATION_STAIRS) escalatorTube(kit, t.top, t.bottom, base + 1.0, PLATFORM_Y);
  // Station name boards along the platform under the canopy (navy, white letters).
  if (signs && atlas) {
    const along = dirOf(145);
    for (const s of [-30, 0, 30, 60]) {
      const x = 196 + along[0] * s;
      const z = -152 + along[1] * s;
      for (const facing of [55, 235]) {
        signs.word(atlas, "kupittaa", x + dirOf(facing)[0] * 0.04, PLATFORM_Y + 2.75, z + dirOf(facing)[1] * 0.04, facing, 0.55);
      }
      box(kit.paint, x, PLATFORM_Y + 3.4, z, 0.06, 1.1, 0.06, yawAlong(along), lin("#2b2f33"));
    }
  }
}

/** A sloped glazed tube (escalator / stair enclosure) from `top` (y0) down to `bottom` (y1). */
function escalatorTube(kit: DetailKit, top: V2, bottom: V2, y0: number, y1: number) {
  const dx = bottom[0] - top[0];
  const dz = bottom[1] - top[1];
  const len = Math.hypot(dx, dz);
  const t: V2 = [dx / len, dz / len];
  const n: V2 = [-t[1], t[0]];
  const w = 3.0;
  const h = 3.1;
  const at = (s: number, side: number, up: number): [number, number, number] => {
    const k = s / len;
    return [top[0] + t[0] * s + n[0] * side, y0 + (y1 - y0) * k + up, top[1] + t[1] * s + n[1] * side];
  };
  // Glass sides.
  for (const side of [-w / 2, w / 2]) {
    const a = at(0, side, 0);
    const b = at(len, side, 0);
    const c = at(len, side, h);
    const d = at(0, side, h);
    if (side < 0) kit.glazing.quad(a, b, c, d, [1, 1, 1]);
    else kit.glazing.quad(b, a, d, c, [1, 1, 1]);
  }
  // Metal roof and floor slab.
  const roofC = lin("#b9bdbf");
  kit.paint.quad(at(0, -w / 2 - 0.2, h), at(len, -w / 2 - 0.2, h), at(len, w / 2 + 0.2, h), at(0, w / 2 + 0.2, h), roofC);
  kit.paint.quad(at(0, w / 2, -0.4), at(len, w / 2, -0.4), at(len, -w / 2, -0.4), at(0, -w / 2, -0.4), lin("#8f9396"));
  // Yellow diagonal struts along both sides (photos).
  const yellow = lin("#d6b23c");
  for (const side of [-w / 2 - 0.05, w / 2 + 0.05]) {
    for (let s = 0; s + 2.6 <= len; s += 2.6) {
      const a = at(s, side, 0.1);
      const b = at(s + 2.6, side, h - 0.1);
      pipe(kit.paint, a, b, 0.06, yellow, 6);
    }
  }
  // Legs down to the platform under the upper half.
  for (let s = len * 0.35; s < len - 1; s += 6) {
    const p = at(s, 0, -0.4);
    const g = PLATFORM_Y;
    if (p[1] - g > 0.6) column(kit.paint, p[0], p[2], 0.16, g, p[1], lin("#8e3b2a"), 8);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Highest flat roof of a building's solids at a point (null outside them). */
export function roofTop(solids: readonly Solid[], x: number, z: number): number | null {
  let y: number | null = null;
  for (const s of solids) {
    if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
    if (!pointInRing([x, z], s.ring)) continue;
    const t = s.top(x, z);
    if (y === null || t > y) y = t;
  }
  return y;
}

/** Another solid of the building rises above `y` at the point. */
function blockedAbove(solids: readonly Solid[], self: Solid, x: number, z: number, y: number): boolean {
  for (const s of solids) {
    if (s === self) continue;
    if (x < s.minX - 1 || x > s.maxX + 1 || z < s.minZ - 1 || z > s.maxZ + 1) continue;
    if (s.top(x, z) <= y + 0.3) continue;
    if (pointInRing([x, z], s.ring)) return true;
  }
  return false;
}

/** Inside the ring and at least `margin` m from its edges. */
export function insetInside(p: V2, ring: readonly V2[], margin: number): boolean {
  if (!pointInRing(p, ring)) return false;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l2 = dx * dx + dz * dz || 1;
    const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
    if (Math.hypot(a[0] + dx * u - p[0], a[1] + dz * u - p[1]) < margin) return false;
  }
  return true;
}
