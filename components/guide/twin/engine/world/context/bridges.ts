import type { Collider2D, V2, V3 } from "../../types";
import { LUMINANCE } from "../../sky/sky";
import { box, capRing, column, lin, pipe } from "./kit";
import type { DetailKit } from "./details";

/**
 * Kalevansilta, the covered footbridge from Kupittaa station's platform over the railway and Helsinginkatu,
 * with its landing at ParkCity's bridge door and the open stair down to Joukahaisenkatu. The one model of
 * it in the twin (world/ground.ts draws only the walking deck, the street register's bridge area at y 4.3).
 *
 * Checked against KartaView street photos (2020–21, Helsinginkatu looking south-east: a white steel Warren
 * truss with glazed sides and a thin light roof, the covered stair down to the platform at its south-west
 * end) and the City of Turku orthophotos 2022/2025 (light ribbed metal roof over the span and the landing;
 * the street stair is an open, dark steel flight with two pram channels, landing on the paved walk along
 * ParkCity) and the 2021 laser surface (roof at y 7.5–8.9, ≈ 3.5 m over the deck). OSM: the platform stair
 * (w28190186) is covered, the street stair (w530667440) is not.
 *
 * Levels follow the route data (routes.json legs out-arr-train-*): deck 4.30; platform stair from the
 * platform (−4.72) to the deck's south-west edge; street stair from the deck (4.30) to the walk (−0.68).
 */

type Rgb = [number, number, number];

const WHITE: Rgb = lin("#e7eaea");
const ROOF: Rgb = lin("#b4b8ba");
const SOFFIT: Rgb = lin("#d6d8d6");
const STEEL_DARK: Rgb = lin("#4a4e52");
const GRATING: Rgb = lin("#5d6164");
const GALV: Rgb = lin("#a9adb0");

/** Walking surface of the deck (street register estimate, SPEC §4.5). */
const DECK = 4.3;
/** Deck → underside of the roof (laser roof ≈ 3.5 m over the deck). */
const CLEAR = 3.05;

/**
 * Main span centre line (Itäharju end → the landing at ParkCity), centred on the street register's 5.5 m
 * deck; side trusses 5.2 m apart.
 */
const SPAN: [V2, V2] = [
  [333.58, -64.91],
  [272.38, -21.31],
];
const SPAN_W = 5.2;

/**
 * The landing at the ParkCity end (street register bridge polygon, west part): the span, the glazed link to
 * ParkCity's bridge door and the head of the street stair meet here under one roof.
 */
const LANDING: V2[] = [
  [271.93, -24.5],
  [270.46, -23.48],
  [260.76, -16.76],
  [265.92, -9.37],
  [266.16, -9.54],
  [268.05, -10.84],
  [269.32, -11.73],
  [269.97, -16.25],
  [273.67, -18.84],
];
/** Openings in the landing's walls (edge index → [from, to] metres along that edge). */
const LANDING_OPEN: Record<number, [number, number][]> = {
  // East edge: the span joins here (open full width).
  8: [[-1, 99]],
  // West edge (towards ParkCity): the glazed link to the bridge door.
  2: [[0.4, 3.6]],
  // North edges: the head of the street stair (2.6 m wide over three short edges).
  3: [[-1, 99]],
  4: [[-1, 99]],
  5: [[-1, 99]],
};

/** Glazed link from the landing to ParkCity's bridge door (OSM w1237590619). */
const PARK_LINK: { a: V2; b: V2; width: number } = { a: [261.9, -15.1], b: [256.6, -15.7], width: 3.0 };

/** Covered stair from the platform's south-east end up to the span's south-west edge (three flights). */
const PLATFORM_STAIR = { bottom: [265.5, -4.72, -43.9] as V3, top: [276.7, DECK, -27.8] as V3, width: 2.8, flights: 3, landing: 1.5 };

/**
 * Open steel stair from the landing down to the walk along ParkCity: one straight flight on the route
 * line (routes.json climbs it linearly; with a landing the walker and the ribbon would sink 0.5 m into it).
 */
const STREET_STAIR = { top: [267.4, DECK, -10.4] as V3, bottom: [274.9, -0.68, 1.1] as V3, width: 2.6, flights: 1, landing: 0, head: 0 };

/** Piers of the span: in Helsinginkatu's median and between the street and the railway cutting. */
const PIERS: V2[] = [
  [306.1, -44.9],
  [290.2, -33.6],
];

/** Kalevansilta and its stairs; returns walk colliders for what stands on the ground (piers, posts). */
export function kalevansilta(kit: DetailKit): Collider2D[] {
  const colliders: Collider2D[] = [];
  const low = kit.tier === "low";
  // The platform stair arrives through an opening in the span's south-west side.
  const t = dir(SPAN[0], SPAN[1]);
  const top: V2 = [PLATFORM_STAIR.top[0], PLATFORM_STAIR.top[2]];
  const sTop = (top[0] - SPAN[0][0]) * t[0] + (top[1] - SPAN[0][1]) * t[1];
  span(kit, SPAN[0], SPAN[1], low, [{ side: -1, s0: sTop - PLATFORM_STAIR.width / 2 - 0.2, s1: sTop + PLATFORM_STAIR.width / 2 + 0.2 }]);
  landing(kit, low);
  link(kit);
  for (const p of PIERS) {
    const g = kit.heightAt(p[0], p[1]);
    column(kit.concrete, p[0], p[1], 0.38, g - 0.3, DECK - 0.55, kit.calibrate("#a9a8a3"), 16, false);
    // Cross-head under the deck.
    box(kit.concrete, p[0], DECK - 0.7, p[1], 0.9, 0.3, SPAN_W - 0.4, yawOf(t), kit.calibrate("#a9a8a3"));
    colliders.push({ level: "outdoor", kind: "circle", c: p, r: 0.5 });
  }
  colliders.push(...platformStair(kit, low));
  colliders.push(...streetStair(kit, low));
  return colliders;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function dir(a: V2, b: V2): V2 {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
}
const yawOf = (t: V2) => -Math.atan2(t[1], t[0]);
/** Left of travel seen from above (+z south): rotate the direction by −90°. */
const leftOf = (t: V2): V2 => [t[1], -t[0]];

/** A white frame member between two 3D points (square-ish tube). */
function member(kit: DetailKit, a: V3, b: V3, r: number, color: Rgb = WHITE) {
  pipe(kit.paint, a, b, r, color, 4, false);
}

/** Clear glass pane between plan points a→b, from y0 to y1 (both faces). */
function pane(kit: DetailKit, a: V2, b: V2, y0a: number, y1a: number, y0b = y0a, y1b = y1a) {
  kit.clearGlass.quad([a[0], y0a, a[1]], [b[0], y0b, b[1]], [b[0], y1b, b[1]], [a[0], y1a, a[1]], [1, 1, 1]);
  kit.clearGlass.quad([b[0], y0b, b[1]], [a[0], y0a, a[1]], [a[0], y1a, a[1]], [b[0], y1b, b[1]], [1, 1, 1]);
}

/** A flat roof slab over a ring (top, soffit, fascia), `t` thick. */
function roofSlab(kit: DetailKit, ring: V2[], y: number, t: number) {
  capRing(kit.paint, ring, y + t, ROOF, false);
  capRing(kit.paint, ring, y, SOFFIT, true);
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    kit.paint.quad([a[0], y, a[1]], [b[0], y, b[1]], [b[0], y + t, b[1]], [a[0], y + t, a[1]], WHITE);
    kit.paint.quad([b[0], y, b[1]], [a[0], y, a[1]], [a[0], y + t, a[1]], [b[0], y + t, b[1]], WHITE);
  }
}

/** Ring outset by d (convex-ish rings; mitred corners, capped). */
function outset(ring: V2[], d: number): V2[] {
  const n = ring.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    area += a[0] * b[1] - b[0] * a[1];
  }
  const s = area > 0 ? -1 : 1;
  return ring.map((p, i) => {
    const a = ring[(i + n - 1) % n];
    const b = ring[(i + 1) % n];
    const t0 = dir(a, p);
    const t1 = dir(p, b);
    const n0: V2 = [t0[1] * s, -t0[0] * s];
    const n1: V2 = [t1[1] * s, -t1[0] * s];
    const m: V2 = [n0[0] + n1[0], n0[1] + n1[1]];
    const ml = Math.hypot(m[0], m[1]) || 1;
    const cos = (m[0] / ml) * n1[0] + (m[1] / ml) * n1[1];
    const k = Math.min(2.5, d / Math.max(0.4, cos));
    return [p[0] + (m[0] / ml) * k, p[1] + (m[1] / ml) * k];
  });
}

// ── Span: Warren side trusses, glazing, roof, deck edge and soffit ───────────

/** An opening in one side of the span (side −1 = right of a→b, +1 = left), s0…s1 metres from a. */
interface Opening {
  side: number;
  s0: number;
  s1: number;
}

function span(kit: DetailKit, a: V2, b: V2, low: boolean, openings: Opening[]) {
  const t = dir(a, b);
  const n = leftOf(t);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const w2 = SPAN_W / 2;
  const at = (s: number, side: number): V2 => [a[0] + t[0] * s + n[0] * side, a[1] + t[1] * s + n[1] * side];
  const yaw = yawOf(t);
  const y = DECK;
  const top = y + CLEAR;
  // Roof: 0.22 m slab with a 0.45 m overhang (light ribbed metal; white fascia).
  const r0 = at(-0.3, -w2 - 0.45);
  const r1 = at(len + 0.6, -w2 - 0.45);
  const r2 = at(len + 0.6, w2 + 0.45);
  const r3 = at(-0.3, w2 + 0.45);
  roofSlab(kit, [r0, r1, r2, r3], top + 0.12, 0.22);
  // Ribs along the roof (standing seams every 0.6 m, visible from the street and the deck of ParkCity).
  if (!low) {
    for (let side = -w2 - 0.3; side <= w2 + 0.31; side += 0.6) {
      const p0 = at(-0.25, side);
      const p1 = at(len + 0.25, side);
      box(kit.paint, (p0[0] + p1[0]) / 2, top + 0.36, (p0[1] + p1[1]) / 2, len + 0.5, 0.03, 0.04, yaw, ROOF);
    }
  }
  // Deck: edge beams (bottom chords, white) and the soffit between them.
  const mid = at(len / 2, 0);
  for (const side of [-w2, w2]) {
    const e = at(len / 2, side);
    box(kit.paint, e[0], y - 0.22, e[1], len, 0.56, 0.26, yaw, WHITE);
  }
  box(kit.paint, mid[0], y - 0.47, mid[1], len, 0.06, SPAN_W, yaw, SOFFIT);
  // Side trusses: top chords, panel posts and Warren diagonals; glass panes inside the truss line.
  const panels = Math.max(1, Math.round(len / 4.2));
  for (const side of [-w2, w2]) {
    const holes = openings.filter((o) => Math.sign(o.side) === Math.sign(side));
    const inHole = (s: number) => holes.some((o) => s > o.s0 && s < o.s1);
    const p0 = at(0, side);
    const p1 = at(len, side);
    member(kit, [p0[0], top - 0.1, p0[1]], [p1[0], top - 0.1, p1[1]], 0.13);
    for (let k = 0; k <= panels; k++) {
      const s = (len * k) / panels;
      const p = at(s, side);
      if (!inHole(s)) member(kit, [p[0], y + 0.05, p[1]], [p[0], top - 0.1, p[1]], 0.08);
      if (k < panels) {
        const s1 = (len * (k + 1)) / panels;
        if (holes.some((o) => s1 > o.s0 && s < o.s1)) continue;
        const q = at(s1, side);
        const up = k % 2 === 0;
        member(kit, [p[0], up ? y + 0.06 : top - 0.12, p[1]], [q[0], up ? top - 0.12 : y + 0.06, q[1]], 0.075);
      }
    }
    // Portal posts at the openings.
    for (const o of holes) {
      for (const s of [o.s0, o.s1]) {
        const p = at(s, side);
        member(kit, [p[0], y + 0.05, p[1]], [p[0], top - 0.1, p[1]], 0.1);
      }
    }
    // Glass just inside the truss (one pane per panel, cut at the openings), with a handrail behind it.
    const inner = side - Math.sign(side) * 0.12;
    for (let k = 0; k < panels; k++) {
      let pieces: [number, number][] = [[(len * k) / panels, (len * (k + 1)) / panels]];
      for (const o of holes) pieces = pieces.flatMap(([u, v]): [number, number][] => (v <= o.s0 || u >= o.s1 ? [[u, v]] : [[u, Math.max(u, o.s0)], [Math.min(v, o.s1), v]].filter(([x0, x1]) => x1 - x0 > 0.05) as [number, number][]));
      for (const [u, v] of pieces) pane(kit, at(u, inner), at(v, inner), y + 0.02, top - 0.2);
    }
    let rails: [number, number][] = [[0, len]];
    for (const o of holes) rails = rails.flatMap(([u, v]): [number, number][] => (v <= o.s0 || u >= o.s1 ? [[u, v]] : [[u, o.s0], [o.s1, v]].filter(([x0, x1]) => x1 - x0 > 0.05) as [number, number][]));
    for (const [u, v] of rails) {
      const h0 = at(u, side - Math.sign(side) * 0.22);
      const h1 = at(v, side - Math.sign(side) * 0.22);
      pipe(kit.metal, [h0[0], y + 0.95, h0[1]], [h1[0], y + 0.95, h1[1]], 0.022, GALV, 6, false);
    }
  }
  // Cross beams under the roof at the panel points.
  for (let k = 0; k <= panels; k++) {
    const c = at((len * k) / panels, 0);
    box(kit.paint, c[0], top - 0.05, c[1], 0.12, 0.16, SPAN_W, yaw, WHITE);
  }
  // Night: a linear light along the soffit.
  const lamp = lin("#f2f4ff").map((v) => v * LUMINANCE.ceilingPanel * 0.4) as Rgb;
  box(kit.emissive, mid[0], top - 0.14, mid[1], len * 0.94, 0.02, 0.14, yaw, lamp);
}

// ── Landing at the ParkCity end ──────────────────────────────────────────────

function landing(kit: DetailKit, low: boolean) {
  const y = DECK;
  const top = y + CLEAR;
  roofSlab(kit, outset(LANDING, 0.45), top + 0.12, 0.22);
  // Soffit structure under the landing deck and posts down to the ground at the corners off the cutting.
  for (const p of [LANDING[2], LANDING[3], LANDING[7]]) {
    const g = kit.heightAt(p[0], p[1]);
    if (y - 0.6 - g > 1.2) column(kit.paint, p[0] + 0.0, p[1], 0.16, g - 0.2, y - 0.5, STEEL_DARK, 10);
  }
  // Glass walls with white posts on the closed edges.
  for (let i = 0; i < LANDING.length; i++) {
    const a = LANDING[i];
    const b = LANDING[(i + 1) % LANDING.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.3) continue;
    const t = dir(a, b);
    const open = LANDING_OPEN[i] ?? [];
    const posts = Math.max(1, Math.round(len / 1.8));
    for (let k = 0; k <= posts; k++) {
      const s = (len * k) / posts;
      const p: V2 = [a[0] + t[0] * s, a[1] + t[1] * s];
      member(kit, [p[0], y, p[1]], [p[0], top, p[1]], 0.07);
    }
    for (let k = 0; k < posts; k++) {
      const s0 = (len * k) / posts;
      const s1 = (len * (k + 1)) / posts;
      if (open.some(([o0, o1]) => s1 > o0 && s0 < o1)) continue;
      pane(kit, [a[0] + t[0] * s0, a[1] + t[1] * s0], [a[0] + t[0] * s1, a[1] + t[1] * s1], y + 0.02, top - 0.05);
    }
    if (!open.length || !low) member(kit, [a[0], top - 0.08, a[1]], [b[0], top - 0.08, b[1]], 0.1);
  }
  // Deck edge (white) all round.
  for (let i = 0; i < LANDING.length; i++) {
    const a = LANDING[i];
    const b = LANDING[(i + 1) % LANDING.length];
    member(kit, [a[0], y - 0.25, a[1]], [b[0], y - 0.25, b[1]], 0.2);
  }
  const lamp = lin("#f2f4ff").map((v) => v * LUMINANCE.ceilingPanel * 0.4) as Rgb;
  for (const c of [
    [266.6, -15.4],
    [269.4, -18.2],
  ] as V2[])
    box(kit.emissive, c[0], top - 0.03, c[1], 1.4, 0.02, 0.14, yawOf(dir(SPAN[0], SPAN[1])), lamp);
}

/** The glazed link into ParkCity's bridge door. */
function link(kit: DetailKit) {
  const { a, b, width } = PARK_LINK;
  const t = dir(a, b);
  const n = leftOf(t);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const w2 = width / 2;
  const y = DECK;
  const top = y + CLEAR - 0.2;
  const at = (s: number, side: number): V2 => [a[0] + t[0] * s + n[0] * side, a[1] + t[1] * s + n[1] * side];
  roofSlab(kit, [at(0, -w2 - 0.25), at(len, -w2 - 0.25), at(len, w2 + 0.25), at(0, w2 + 0.25)], top, 0.2);
  for (const side of [-w2, w2]) {
    for (let k = 0; k <= 3; k++) {
      const p = at((len * k) / 3, side);
      member(kit, [p[0], y, p[1]], [p[0], top, p[1]], 0.06);
    }
    pane(kit, at(0, side), at(len, side), y + 0.02, top - 0.02);
    const e = at(len / 2, side);
    box(kit.paint, e[0], y - 0.22, e[1], len, 0.5, 0.2, yawOf(t), WHITE);
  }
}

// ── Stairs ───────────────────────────────────────────────────────────────────

interface Flight {
  /** Plan start/end of the flight (along the stair axis, metres from the bottom). */
  s0: number;
  s1: number;
  y0: number;
  y1: number;
  risers: number;
}

/** Flights and landings between bottom and top: equal flights, `landing` m landings, an optional head landing at the top. */
export function stairFlights(len: number, rise: number, flights: number, landing: number, head = 0, riser = 0.172): Flight[] {
  const risers = Math.max(flights, Math.round(rise / riser));
  const per = Math.floor(risers / flights);
  const extra = risers - per * flights;
  const goingLen = len - head - landing * (flights - 1);
  const going = goingLen / risers;
  const out: Flight[] = [];
  let s = 0;
  let r = 0;
  for (let f = 0; f < flights; f++) {
    const n = per + (f < extra ? 1 : 0);
    const s1 = s + n * going;
    out.push({ s0: s, s1, y0: (rise * r) / risers, y1: (rise * (r + n)) / risers, risers: n });
    r += n;
    s = s1 + landing;
  }
  return out;
}

/** Treads, landings and stringers of a straight stair from bottom to top; returns the axis frame. */
function treads(
  kit: DetailKit,
  bottom: V3,
  top: V3,
  width: number,
  flights: Flight[],
  tread: { mb: "concrete" | "paint"; color: Rgb; thick: number },
) {
  const plan = dir([bottom[0], bottom[2]], [top[0], top[2]]);
  const n = leftOf(plan);
  const yaw = yawOf(plan);
  const at = (s: number, side = 0): V2 => [bottom[0] + plan[0] * s + n[0] * side, bottom[2] + plan[1] * s + n[1] * side];
  const mb = tread.mb === "concrete" ? kit.concrete : kit.paint;
  const len = Math.hypot(top[0] - bottom[0], top[2] - bottom[2]);
  let prevEnd = 0;
  let prevY = 0;
  for (const f of flights) {
    // Landing (or the foot pad) between the previous flight and this one.
    if (f.s0 - prevEnd > 0.05) {
      const c = at((prevEnd + f.s0) / 2);
      box(mb, c[0], bottom[1] + prevY - tread.thick / 2, c[1], f.s0 - prevEnd, tread.thick, width, yaw, tread.color);
    }
    const going = (f.s1 - f.s0) / f.risers;
    for (let i = 0; i < f.risers; i++) {
      const s = f.s0 + (i + 0.5) * going;
      const c = at(s);
      const yTop = bottom[1] + f.y0 + ((f.y1 - f.y0) * (i + 1)) / f.risers;
      box(mb, c[0], yTop - tread.thick / 2, c[1], going + 0.02, tread.thick, width, yaw, tread.color);
    }
    prevEnd = f.s1;
    prevY = f.y1;
  }
  // Head landing up to the top point.
  if (len - prevEnd > 0.05) {
    const c = at((prevEnd + len) / 2);
    box(mb, c[0], top[1] - tread.thick / 2, c[1], len - prevEnd, tread.thick, width, yaw, tread.color);
  }
  return { plan, n, yaw, at, len };
}

/** Walking height along the stair axis (s from the bottom). */
function stairY(bottom: V3, flights: Flight[], s: number, topY: number): number {
  let y = bottom[1];
  for (const f of flights) {
    if (s < f.s0) return y;
    if (s <= f.s1) return bottom[1] + f.y0 + ((f.y1 - f.y0) * (s - f.s0)) / (f.s1 - f.s0);
    y = bottom[1] + f.y1;
  }
  return Math.min(topY, y);
}

/** The covered stair from the platform: concrete flights, white frames, clear glass sides, a sloped light roof. */
function platformStair(kit: DetailKit, low: boolean): Collider2D[] {
  const { bottom, top, width, flights: count, landing } = PLATFORM_STAIR;
  const len = Math.hypot(top[0] - bottom[0], top[2] - bottom[2]);
  const flights = stairFlights(len, top[1] - bottom[1], count, landing);
  const f = treads(kit, bottom, top, width, flights, { mb: "concrete", color: kit.calibrate("#9c9b97"), thick: 0.28 });
  const w2 = width / 2;
  const h = 2.75;
  const yAt = (s: number) => stairY(bottom, flights, s, top[1]);
  // Frames every ≈ 2.4 m, glass between, handrails; the roof follows the flights in straight pieces.
  const frames = Math.max(2, Math.round(len / 2.4));
  for (let k = 0; k <= frames; k++) {
    const s = (len * k) / frames;
    const ys = yAt(s);
    for (const side of [-w2 - 0.08, w2 + 0.08]) {
      const p = f.at(s, side);
      member(kit, [p[0], ys - 0.3, p[1]], [p[0], ys + h, p[1]], 0.07);
    }
    if (!low) {
      const l = f.at(s, -w2 - 0.08);
      const r = f.at(s, w2 + 0.08);
      member(kit, [l[0], ys + h, l[1]], [r[0], ys + h, r[1]], 0.07);
    }
  }
  for (let k = 0; k < frames; k++) {
    const s0 = (len * k) / frames;
    const s1 = (len * (k + 1)) / frames;
    const y0 = yAt(s0);
    const y1 = yAt(s1);
    for (const side of [-w2 - 0.06, w2 + 0.06]) {
      pane(kit, f.at(s0, side), f.at(s1, side), y0 - 0.25, y0 + h - 0.05, y1 - 0.25, y1 + h - 0.05);
      const r0 = f.at(s0, side - Math.sign(side) * 0.12);
      const r1 = f.at(s1, side - Math.sign(side) * 0.12);
      pipe(kit.metal, [r0[0], y0 + 0.9, r0[1]], [r1[0], y1 + 0.9, r1[1]], 0.022, GALV, 6, false);
    }
    // Roof piece (top and soffit), 0.3 m overhang each side.
    const a0 = f.at(s0, -w2 - 0.38);
    const a1 = f.at(s1, -w2 - 0.38);
    const b1 = f.at(s1, w2 + 0.38);
    const b0 = f.at(s0, w2 + 0.38);
    const ya = y0 + h + 0.12;
    const yb = y1 + h + 0.12;
    kit.paint.quad([a0[0], ya + 0.14, a0[1]], [b0[0], ya + 0.14, b0[1]], [b1[0], yb + 0.14, b1[1]], [a1[0], yb + 0.14, a1[1]], ROOF);
    kit.paint.quad([a0[0], ya, a0[1]], [a1[0], yb, a1[1]], [b1[0], yb, b1[1]], [b0[0], ya, b0[1]], SOFFIT);
    for (const [p, q] of [
      [a0, a1],
      [b1, b0],
    ] as [V2, V2][]) {
      const yp = p === a0 || p === b0 ? ya : yb;
      const yq = q === a0 || q === b0 ? ya : yb;
      kit.paint.quad([p[0], yp, p[1]], [q[0], yq, q[1]], [q[0], yq + 0.14, q[1]], [p[0], yp + 0.14, p[1]], WHITE);
    }
  }
  // Stringers (white steel) under the flights.
  for (const side of [-w2, w2]) {
    for (const fl of flights) {
      const p0 = f.at(fl.s0, side);
      const p1 = f.at(fl.s1, side);
      member(kit, [p0[0], bottom[1] + fl.y0 - 0.35, p0[1]], [p1[0], bottom[1] + fl.y1 - 0.35, p1[1]], 0.12);
    }
  }
  // Landing posts down to the track bed / platform.
  const colliders: Collider2D[] = [];
  for (let i = 0; i + 1 < flights.length; i++) {
    const s = (flights[i].s1 + flights[i + 1].s0) / 2;
    const ys = bottom[1] + flights[i].y1;
    for (const side of [-w2 + 0.2, w2 - 0.2]) {
      const p = f.at(s, side);
      const g = kit.heightAt(p[0], p[1]);
      if (ys - g > 0.8) column(kit.paint, p[0], p[1], 0.11, g - 0.2, ys - 0.28, WHITE, 8);
    }
  }
  // Night: lights under the roof.
  const lamp = lin("#f2f4ff").map((v) => v * LUMINANCE.ceilingPanel * 0.35) as Rgb;
  for (const q of [0.2, 0.5, 0.8]) {
    const c = f.at(len * q);
    box(kit.emissive, c[0], yAt(len * q) + h - 0.02, c[1], 1.2, 0.02, 0.12, f.yaw, lamp);
  }
  // Glass sides are the walk area's edges (nav/walk structure areas); the foot stands on the platform.
  colliders.push({ level: "outdoor", kind: "segment", a: f.at(0.2, -w2 - 0.1), b: f.at(Math.min(len, 3.0), -w2 - 0.1) });
  colliders.push({ level: "outdoor", kind: "segment", a: f.at(0.2, w2 + 0.1), b: f.at(Math.min(len, 3.0), w2 + 0.1) });
  return colliders;
}

/** The open steel stair down to the street: grating treads, dark stringers, two pram channels, handrails, posts. */
function streetStair(kit: DetailKit, low: boolean): Collider2D[] {
  const { top, bottom, width, flights: count, landing, head } = STREET_STAIR;
  const len = Math.hypot(top[0] - bottom[0], top[2] - bottom[2]);
  // Built from the bottom up: the head landing is at the top end.
  const flights = stairFlights(len, top[1] - bottom[1], count, landing, head);
  const f = treads(kit, bottom, top, width, flights, { mb: "paint", color: GRATING, thick: 0.08 });
  const w2 = width / 2;
  const yAt = (s: number) => stairY(bottom, flights, s, top[1]);
  // Pram channels (galvanised) over the treads, a little in from each side.
  for (const side of [-0.62, 0.62]) {
    for (const fl of flights) {
      const p0 = f.at(fl.s0, side);
      const p1 = f.at(fl.s1, side);
      pipe(kit.metal, [p0[0], bottom[1] + fl.y0 + 0.04, p0[1]], [p1[0], bottom[1] + fl.y1 + 0.04, p1[1]], 0.09, GALV, 4, false);
    }
  }
  // Stringers, handrails with balusters, and posts to the ground.
  const colliders: Collider2D[] = [];
  for (const side of [-w2 - 0.06, w2 + 0.06]) {
    const pts: V3[] = [];
    for (let k = 0; k <= 24; k++) {
      const s = (len * k) / 24;
      const p = f.at(s, side);
      pts.push([p[0], yAt(s), p[1]]);
    }
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1];
      const b = pts[k];
      member(kit, [a[0], a[1] - 0.18, a[2]], [b[0], b[1] - 0.18, b[2]], 0.13, STEEL_DARK);
      pipe(kit.metal, [a[0], a[1] + 1.0, a[2]], [b[0], b[1] + 1.0, b[2]], 0.025, GALV, 6, false);
      if (!low) pipe(kit.metal, [a[0], a[1] + 0.5, a[2]], [b[0], b[1] + 0.5, b[2]], 0.012, GALV, 4, false);
    }
    const balusters = Math.round(len / (low ? 1.6 : 0.8));
    for (let k = 0; k <= balusters; k++) {
      const s = (len * k) / balusters;
      const p = f.at(s, side);
      const ys = yAt(s);
      pipe(kit.metal, [p[0], ys - 0.1, p[1]], [p[0], ys + 1.0, p[1]], 0.018, GALV, 4, false);
    }
    // Posts at a third and two thirds of the flight, and under the head.
    for (const s of [len / 3, (2 * len) / 3, len - 0.3]) {
      const p = f.at(s, side * 0.8);
      const g = kit.heightAt(p[0], p[1]);
      const ys = yAt(s);
      if (ys - g > 0.6) {
        column(kit.paint, p[0], p[1], 0.09, g - 0.2, ys - 0.1, STEEL_DARK, 8);
        colliders.push({ level: "outdoor", kind: "circle", c: p, r: 0.15 });
      }
    }
  }
  // The foot: a concrete pad from the bottom tread down into the ground (the walk along ParkCity).
  const pad = f.at(-0.25);
  box(kit.concrete, pad[0], bottom[1] - 0.6, pad[1], 0.9, 1.2, width + 0.3, f.yaw, kit.calibrate("#9c9b97"));
  return colliders;
}
