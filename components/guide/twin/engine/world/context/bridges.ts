import type { V2, V3 } from "../../types";
import { LUMINANCE } from "../../sky/sky";
import { box, column, lin, pipe } from "./kit";
import type { DetailKit } from "./details";

/**
 * Kalevansilta (SPEC §4.5; YLE and Commons photos): the covered footbridge
 * from the station platform over the tracks and Kalevantie, with its branch to
 * ParkCity's bridge door and the stairs down to the platform and to
 * Joukahaisenkatu — white steel portal frames and side trusses, a light metal
 * roof, glass balustrades, a box girder and piers. The walking surface of the
 * deck is world/ground.ts's (deck y 4.3); the stair flights are drawn here
 * (routes.json legs out-arr-train-* climb them).
 */

type Rgb = [number, number, number];

const WHITE: Rgb = lin("#e9ecec");
const ROOF: Rgb = lin("#b8bcbe");
const GIRDER: Rgb = lin("#d9dcdc");

/** Bridge deck walkways (y = walking surface). */
const SPANS: { path: V3[]; width: number; truss: boolean; girder: boolean }[] = [
  {
    path: [
      [333.8, 4.3, -64.6],
      [278.5, 4.3, -25.2],
      [264.3, 4.3, -15.1],
    ],
    width: 4.4,
    truss: true,
    girder: true,
  },
  {
    path: [
      [264.3, 4.3, -15.1],
      [256.6, 4.3, -15.7],
    ],
    width: 3.0,
    truss: false,
    girder: true,
  },
  {
    path: [
      [264.3, 4.3, -15.1],
      [267.4, 4.3, -10.4],
    ],
    width: 2.8,
    truss: false,
    girder: true,
  },
];

/** Stair flights (bottom → top) with their covered roofs. */
const STAIRS: { bottom: V3; top: V3; width: number }[] = [
  { bottom: [265.5, -4.72, -43.9], top: [278.5, 4.26, -25.2], width: 2.8 },
  { bottom: [274.9, -0.68, 1.1], top: [267.4, 4.3, -10.4], width: 2.4 },
];

export function kalevansilta(kit: DetailKit) {
  const low = kit.tier === "low";
  for (const s of SPANS) {
    for (let i = 0; i + 1 < s.path.length; i++) walkway(kit, s.path[i], s.path[i + 1], s.width, s.truss, s.girder, low);
  }
  for (const st of STAIRS) stair(kit, st.bottom, st.top, st.width, low);
}

/** Frame of a segment: unit direction, horizontal normal and length. */
function frame(a: V3, b: V3) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz);
  const t: V2 = [dx / len, dz / len];
  const n: V2 = [-t[1], t[0]];
  return { t, n, len, yaw: -Math.atan2(t[1], t[0]) };
}

function walkway(kit: DetailKit, a: V3, b: V3, width: number, truss: boolean, girder: boolean, low: boolean) {
  const { t, n, len, yaw } = frame(a, b);
  const y = a[1];
  const h = 3.3;
  const w2 = width / 2;
  const at = (s: number, side: number): V2 => [a[0] + t[0] * s + n[0] * side, a[2] + t[1] * s + n[1] * side];
  // Roof: thin slab with an overhang, light grey metal.
  const mid = at(len / 2, 0);
  box(kit.paint, mid[0], y + h + 0.12, mid[1], len + 0.4, 0.22, width + 0.7, yaw, ROOF);
  // Box girder under the deck (white) and the deck edge.
  if (girder) box(kit.paint, mid[0], y - 0.55, mid[1], len, 0.9, width * 0.7, yaw, GIRDER);
  for (const side of [-w2, w2]) {
    const e = at(len / 2, side);
    box(kit.paint, e[0], y - 0.12, e[1], len, 0.28, 0.18, yaw, WHITE);
  }
  // Portal frames every 3 m, side trusses (diagonals) on the main span, glass balustrades.
  const step = 3.0;
  const count = Math.max(1, Math.round(len / step));
  for (let k = 0; k <= count; k++) {
    const s = (len * k) / count;
    for (const side of [-w2, w2]) {
      const p = at(s, side);
      box(kit.paint, p[0], y + h / 2, p[1], 0.14, h, 0.14, yaw, WHITE);
    }
    const c = at(s, 0);
    box(kit.paint, c[0], y + h - 0.1, c[1], 0.14, 0.2, width, yaw, WHITE);
    if (truss && k < count && !low) {
      const s2 = (len * (k + 1)) / count;
      for (const side of [-w2, w2]) {
        const p0 = at(s, side);
        const p1 = at(s2, side);
        const up = k % 2 === 0;
        pipe(kit.paint, [p0[0], y + (up ? 0.2 : h - 0.25), p0[1]], [p1[0], y + (up ? h - 0.25 : 0.2), p1[1]], 0.06, WHITE, 6);
      }
    }
  }
  // Top and bottom chords / handrails along both sides.
  for (const side of [-w2, w2]) {
    const p0 = at(0, side);
    const p1 = at(len, side);
    pipe(kit.paint, [p0[0], y + h - 0.2, p0[1]], [p1[0], y + h - 0.2, p1[1]], 0.08, WHITE, 6);
    pipe(kit.metal, [p0[0] - n[0] * Math.sign(side) * 0.08, y + 1.05, p0[1] - n[1] * Math.sign(side) * 0.08], [p1[0] - n[0] * Math.sign(side) * 0.08, y + 1.05, p1[1] - n[1] * Math.sign(side) * 0.08], 0.025, lin("#c9cccd"), 6);
    // Glass balustrade (glows faintly from the walkway lights at night).
    const g = at(len / 2, side);
    box(kit.glazing, g[0], y + 0.55, g[1], len, 1.0, 0.02, yaw, [1, 1, 1]);
  }
  // Night: linear lights under the roof.
  const lamp = lin("#f2f4ff").map((c) => c * LUMINANCE.ceilingPanel * 0.4) as Rgb;
  box(kit.emissive, mid[0], y + h - 0.02, mid[1], len * 0.92, 0.02, 0.12, yaw, lamp);
  // Piers to the ground every ~24 m under long spans.
  if (girder && len > 10) {
    const piers = Math.max(1, Math.floor(len / 24));
    for (let k = 1; k <= piers; k++) {
      const s = (len * k) / (piers + 1);
      const p = at(s, 0);
      const g = kit.heightAt(p[0], p[1]);
      if (y - 1.0 - g > 1.5) column(kit.concrete, p[0], p[1], 0.35, g - 0.3, y - 1.0, kit.calibrate("#a7a6a2"), 12);
    }
  }
}

function stair(kit: DetailKit, bottom: V3, top: V3, width: number, low: boolean) {
  const { t, n, len, yaw } = frame(bottom, top);
  const rise = top[1] - bottom[1];
  const steps = Math.max(2, Math.round(rise / 0.17));
  const going = len / steps;
  const w2 = width / 2;
  const at = (s: number, side: number): V2 => [bottom[0] + t[0] * s + n[0] * side, bottom[2] + t[1] * s + n[1] * side];
  const yAt = (s: number) => bottom[1] + (rise * s) / len;
  const tread = kit.calibrate("#9c9b97");
  // Treads (each a block from the stringer line up to its riser height).
  for (let i = 0; i < steps; i++) {
    const s = (i + 0.5) * going;
    const p = at(s, 0);
    const yTop = bottom[1] + (rise * (i + 1)) / steps;
    box(kit.concrete, p[0], yTop - 0.15, p[1], going + 0.01, 0.3, width, yaw, tread);
  }
  // Stringers (white steel) and the soffit slab.
  for (const side of [-w2 - 0.05, w2 + 0.05]) {
    const p0 = at(0, side);
    const p1 = at(len, side);
    pipe(kit.paint, [p0[0], bottom[1] - 0.15, p0[1]], [p1[0], top[1] - 0.15, p1[1]], 0.14, WHITE, 6);
    // Handrail.
    pipe(kit.metal, [p0[0], bottom[1] + 0.95, p0[1]], [p1[0], top[1] + 0.95, p1[1]], 0.025, lin("#c9cccd"), 6);
    // Balustrade panel along the flight.
    const m = at(len / 2, side);
    box(kit.glazing, m[0], (bottom[1] + top[1]) / 2 + 0.5, m[1], Math.hypot(len, rise), 0.9, 0.02, yaw, [1, 1, 1]);
  }
  // Covered: a sloped roof on posts (white frames every ~3 m).
  const h = 2.9;
  const frames = Math.max(2, Math.round(len / 3));
  for (let k = 0; k <= frames; k++) {
    const s = (len * k) / frames;
    const ys = yAt(s);
    for (const side of [-w2 - 0.1, w2 + 0.1]) {
      const p = at(s, side);
      box(kit.paint, p[0], ys + h / 2, p[1], 0.12, h, 0.12, yaw, WHITE);
    }
    if (!low) {
      const c = at(s, 0);
      box(kit.paint, c[0], ys + h, c[1], 0.12, 0.16, width + 0.4, yaw, WHITE);
    }
  }
  // Roof as a sloped quad (both faces) slightly overhanging.
  const r0 = at(-0.3, -w2 - 0.45);
  const r1 = at(len + 0.3, -w2 - 0.45);
  const r2 = at(len + 0.3, w2 + 0.45);
  const r3 = at(-0.3, w2 + 0.45);
  const y0 = yAt(-0.3) + h + 0.1;
  const y1 = yAt(len + 0.3) + h + 0.1;
  kit.paint.quad([r0[0], y0, r0[1]], [r3[0], y0, r3[1]], [r2[0], y1, r2[1]], [r1[0], y1, r1[1]], ROOF);
  kit.paint.quad([r0[0], y0 - 0.06, r0[1]], [r1[0], y1 - 0.06, r1[1]], [r2[0], y1 - 0.06, r2[1]], [r3[0], y0 - 0.06, r3[1]], ROOF);
  // Light under the roof.
  const lamp = lin("#f2f4ff").map((c) => c * LUMINANCE.ceilingPanel * 0.35) as Rgb;
  const m0 = at(len * 0.25, 0);
  const m1 = at(len * 0.75, 0);
  box(kit.emissive, m0[0], yAt(len * 0.25) + h - 0.05, m0[1], 1.2, 0.02, 0.1, yaw, lamp);
  box(kit.emissive, m1[0], yAt(len * 0.75) + h - 0.05, m1[1], 1.2, 0.02, 0.1, yaw, lamp);
}
