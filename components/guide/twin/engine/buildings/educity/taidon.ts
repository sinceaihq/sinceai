import * as THREE from "three";
import type { TwinContext } from "../../types";
import { mulberry32 } from "../../util";
import { LUMINANCE } from "../../sky/sky";
import { TAIDON } from "./frame";
import type { Kit } from "./kit";
import { Bucket, box, quadN, type Vec3 } from "./geom";
import { boxTable, cushion, type Furnisher } from "./furniture";
import { emission } from "./materials";
import { EVENT_VIOLET } from "../../render/canvas";

/**
 * Taidon portaat (SPEC §7.4; photos repo_educity-taidon-portaat, ss_2400px):
 * the floor-1 → floor-2 seating stair, 16.2 m wide, rising north from z 44
 * (y 0) to z 35.3 (y 5.0). Ten seating tiers 0.5 × 0.87 m in the middle,
 * a 30-riser flight (0.167 × 0.29) on each side — three steps per tier, so
 * the profiles meet at every tier front. Smooth light-grey cast concrete
 * (risers darker), black steel handrails, black square step lights, the blue
 * tactile band at the foot, loose cushions in the photo's colours and birch
 * box tables. The faceted birch storage front under the upper half faces the
 * north aula.
 */

export const TIERS = 10;
export const TIER_H = 0.5;
export const TIER_D = (TAIDON.zFoot - TAIDON.zTop) / TIERS;
export const FLIGHT_W = 1.6;
export const RISERS = 30;

/** Cushion colours (SPEC §7.4). */
export const CUSHIONS = ["#13494f", "#078898", "#c8808c", "#e7a8b0", "#c0a4a4", "#a6706b", "#583736"];

/** Height of the stair surface at plan z (y_E), seating part (tier tops). */
export function tierTopAt(z: number): number {
  const i = Math.floor((TAIDON.zFoot - z) / TIER_D);
  if (i < 0) return 0;
  return Math.min(TIERS, i + 1) * TIER_H;
}

export function buildTaidon(kit: Kit, ctx: TwinContext, opts: { uber: THREE.Material; fur: Furnisher; led: Bucket; low: boolean }): void {
  const uberX = { color: 3, aEdRM: 2 } as const;
  const c = kit.bucket("taidon-concrete", opts.uber, { group: "f1", extra: uberX, receiveShadow: true });
  // Step lights go into the level's shared emissive (warm white).
  const lb = opts.led;
  const x0 = TAIDON.x0;
  const x1 = TAIDON.x1;
  const fx0 = x0 + FLIGHT_W;
  const fx1 = x1 - FLIGHT_W;
  const tread = "#cacec8";
  const riser = "#a3a59b";

  // Seating tiers.
  for (let i = 0; i < TIERS; i++) {
    const zf = TAIDON.zFoot - TIER_D * i;
    const zb = zf - TIER_D;
    const y0 = TIER_H * i;
    const y1 = TIER_H * (i + 1);
    c.paint(riser, 0.75);
    quadN(c, [[fx0, y0, zf], [fx1, y0, zf], [fx1, y1, zf], [fx0, y1, zf]], [0, 0, 1], [
      [fx0, y0],
      [fx1, y0],
      [fx1, y1],
      [fx0, y1],
    ]);
    c.paint(tread, 0.62);
    quadN(c, [[fx0, y1, zf], [fx1, y1, zf], [fx1, y1, zb], [fx0, y1, zb]], [0, 1, 0], [
      [fx0, zf],
      [fx1, zf],
      [fx1, zb],
      [fx0, zb],
    ]);
  }
  // Side flights (three steps per tier) and the stepped faces between flights and tiers.
  const g = TIER_D / 3;
  const h = TIER_H / 3;
  for (const [a, e, inner, innerN] of [
    [x0, fx0, fx0, -1],
    [fx1, x1, fx1, 1],
  ] as const) {
    for (let j = 0; j < RISERS; j++) {
      const zf = TAIDON.zFoot - g * j;
      const zb = zf - g;
      const y0 = h * j;
      const y1 = h * (j + 1);
      c.paint(riser, 0.75);
      quadN(c, [[a, y0, zf], [e, y0, zf], [e, y1, zf], [a, y1, zf]], [0, 0, 1], [
        [a, y0],
        [e, y0],
        [e, y1],
        [a, y1],
      ]);
      c.paint(tread, 0.62);
      quadN(c, [[a, y1, zf], [e, y1, zf], [e, y1, zb], [a, y1, zb]], [0, 1, 0], [
        [a, zf],
        [e, zf],
        [e, zb],
        [a, zb],
      ]);
      // Side face of the tier above this flight step (the tier top is higher for 2 of every 3 steps).
      const tierTop = TIER_H * (Math.floor(j / 3) + 1);
      if (tierTop > y1 + 1e-6) {
        c.paint("#bfc2bb", 0.8);
        quadN(c, [[inner, y1, zf], [inner, y1, zb], [inner, tierTop, zb], [inner, tierTop, zf]], [innerN, 0, 0], [
          [zf, y1],
          [zb, y1],
          [zb, tierTop],
          [zf, tierTop],
        ]);
      }
      // Step light in every third riser, near the outer edge.
      if (j % 3 === 1) {
        const lx = innerN < 0 ? a + 0.25 : e - 0.25;
        lb.set("aEdEm", emission("#fff1dc", LUMINANCE.bollard * 0.35));
        box(lb, lx - 0.06, y0 + 0.04, zf, lx + 0.06, y0 + 0.13, zf + 0.004);
        lb.set("aEdEm", emission(EVENT_VIOLET, LUMINANCE.eventLight * 0.25));
      }
    }
  }
  // Outer side faces (sawtooth down to the floor) — light cast concrete.
  c.paint("#c8cbc4", 0.8);
  for (const [x, n] of [
    [x0, -1],
    [x1, 1],
  ] as const) {
    for (let j = 0; j < RISERS; j++) {
      const zf = TAIDON.zFoot - g * j;
      const zb = zf - g;
      const y1 = h * (j + 1);
      quadN(c, [[x, 0, zf], [x, 0, zb], [x, y1, zb], [x, y1, zf]], [n, 0, 0], [
        [zf, 0],
        [zb, 0],
        [zb, y1],
        [zf, y1],
      ]);
    }
  }
  void ctx;
  // Slab edge over it (the floor-2 slab, 0.4 m), and the blue tactile band at the foot of the flights.
  c.paint("#cfd1cc", 0.85);
  box(c, x0, TIERS * TIER_H - 0.42, TAIDON.zTop - 0.06, x1, TIERS * TIER_H, TAIDON.zTop, { nz: true, ny: true });
  c.paint("#367790", 0.7);
  box(c, x0, 0, TAIDON.zFoot, fx0, 0.006, TAIDON.zFoot + 0.4, { py: true });
  box(c, fx1, 0, TAIDON.zFoot, x1, 0.006, TAIDON.zFoot + 0.4, { py: true });
  // Handrails: black steel, both sides of each flight, on posts.
  c.paint("#16171a", 0.4, 0.5);
  for (const x of [x0 + 0.12, fx0 - 0.04, fx1 + 0.04, x1 - 0.12]) handrail(c, x);

  // Cushions and box tables on the tiers (baked with the rest of the furniture).
  const fur = opts.fur;
  const rnd = mulberry32(441);
  const cu = cushion();
  const bt = boxTable();
  for (let i = 0; i < TIERS - 1; i++) {
    const zf = TAIDON.zFoot - TIER_D * i;
    const y = TIER_H * (i + 1);
    let x = fx0 + 0.15 + rnd() * 0.6;
    while (x < fx1 - 1.2) {
      const len = 1.0 + Math.floor(rnd() * 3) * 0.5;
      if (x + len > fx1 - 0.15) break;
      if (rnd() < (opts.low ? 0.45 : 0.82)) {
        fur.add("f1", cu, {
          x: x + len / 2,
          y,
          z: zf - TIER_D + 0.36,
          s: [len, 1, 1],
          color: CUSHIONS[Math.floor(rnd() * CUSHIONS.length)],
        });
      } else if (rnd() < 0.5) {
        fur.add("f1", bt, { x: x + 0.4, y, z: zf - TIER_D + 0.4 });
      }
      x += len + 0.25 + rnd() * 0.9;
    }
  }
}

/** A handrail along a flight at x: 0.9 m over the nosings, posts every ≈1.4 m. */
function handrail(b: Bucket, x: number): void {
  const zA = TAIDON.zFoot + 0.25;
  const zB = TAIDON.zTop + 0.1;
  const yAt = (z: number) => Math.min(TIERS * TIER_H, Math.max(0, ((TAIDON.zFoot - z) / (TAIDON.zFoot - TAIDON.zTop)) * TIERS * TIER_H));
  const ya = yAt(zA) + 0.9;
  const yb = yAt(zB) + 0.9;
  const len = Math.hypot(zA - zB, yb - ya);
  const ny = (zA - zB) / len;
  const nz = (yb - ya) / len;
  const w = 0.025;
  quadN(b, [[x - w, ya, zA], [x + w, ya, zA], [x + w, yb, zB], [x - w, yb, zB]], [0, ny, nz], [
    [0, 0],
    [2 * w, 0],
    [2 * w, len],
    [0, len],
  ]);
  for (const sx of [-1, 1]) {
    quadN(b, [[x + sx * w, ya - 0.05, zA], [x + sx * w, ya, zA], [x + sx * w, yb, zB], [x + sx * w, yb - 0.05, zB]], [sx, 0, 0], [
      [zA, ya],
      [zA, ya + 0.05],
      [zB, yb],
      [zB, yb - 0.05],
    ]);
  }
  const n = Math.round((zA - zB) / 1.4);
  for (let k = 0; k <= n; k++) {
    const z = zA + ((zB - zA) * k) / n;
    const y = yAt(z);
    box(b, x - 0.02, y, z - 0.02, x + 0.02, y + 0.9, z + 0.02);
  }
}

/** Plan points of the storage front zigzag (E), from the event map. */
export const STORAGE_ZIGZAG: [number, number][] = [
  [17.76, 35.36],
  [18.83, 36.05],
  [21.24, 35.6],
  [22.71, 36.05],
  [23.76, 35.6],
  [24.63, 36.05],
  [25.62, 35.8],
  [27.37, 36.1],
  [29.46, 35.45],
  [31.76, 36.0],
  [34.0, 35.45],
];

/** The storage front as slatted faces (called by the interior with the slat bucket). */
export function emitStorageFront(slats: Bucket, top: number): void {
  const z = STORAGE_ZIGZAG;
  for (let i = 0; i + 1 < z.length; i++) {
    const [ax, az] = z[i];
    const [bx, bz] = z[i + 1];
    const len = Math.hypot(bx - ax, bz - az);
    // Facing north (towards −z) and a little sideways.
    const nx = (bz - az) / len;
    const nz = -(bx - ax) / len;
    const n: Vec3 = nz < 0 ? [nx, 0, nz] : [-nx, 0, -nz];
    quadN(slats, [[ax, 0, az], [bx, 0, bz], [bx, top, bz], [ax, top, az]], n, [
      [0, 0],
      [len, 0],
      [len, top],
      [0, top],
    ]);
  }
}
