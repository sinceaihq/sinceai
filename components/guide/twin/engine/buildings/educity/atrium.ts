import * as THREE from "three";
import type { LightingState, TwinContext } from "../../types";
import { LUMINANCE } from "../../sky/sky";
import { ATRIUM_ROOF, atriumRoofY } from "./frame";
import type { Kit } from "./kit";
import { Bucket, box, quadN, type Vec3 } from "./geom";
import { emission } from "./materials";

/**
 * The multi-storey atrium above floor 2 (SPEC §7.4; photos ss_001, ss_007,
 * ss_0160): an exposed light-grey concrete frame, galleries with frameless
 * glass balustrades on floors 3–6 along the west, east and north sides —
 * stepping back under the sloping glass roof — black-framed glass walls of
 * the rooms behind (interior-mapped glass), two matte charcoal bridges at
 * floors 3 and 4 with white/lilac LED lines, and timber "dice" boxes clad in
 * vertical birch slats cantilevering into the void.
 *
 * Built only for the "upper" group, which shows while the building is
 * closed and its interior is on (the dollhouse cuts it away).
 */

export const GALLERY_FLOORS = [9.0, 13.0, 17.0, 21.0];
const GALLERY_W = 2.4;
const STOREY_H = 4.0;

/** Southern limit of a gallery floor under the sloping roof (clear height ≥ 3.0 m). */
export function galleryZMax(floorY: number): number {
  const need = floorY + 3.0;
  const r = ATRIUM_ROOF;
  if (need <= r.y1) return r.z1;
  const t = (r.y0 - need) / (r.y0 - r.y1);
  return r.z0 + (r.z1 - r.z0) * Math.max(0, Math.min(1, t));
}

/** Dice boxes: [x0, x1, z0, z1, floor] (E). */
export const DICE: [number, number, number, number, number][] = [
  [18.4, 21.4, 20.0, 25.0, 9.0],
  [30.4, 33.7, 22.0, 27.5, 13.0],
  [18.4, 21.0, 28.5, 33.0, 17.0],
  [24.0, 29.5, 17.2, 20.2, 13.0],
  [30.7, 33.7, 38.0, 43.0, 9.0],
  [18.4, 21.4, 36.6, 41.0, 13.0],
];

export const BRIDGES_ATRIUM: { y: number; z0: number; z1: number }[] = [
  { y: 9.0, z0: 31.0, z1: 34.5 },
  { y: 13.0, z0: 31.0, z1: 34.5 },
];

export function buildAtrium(
  kit: Kit,
  ctx: TwinContext,
  opts: { uber: THREE.Material; glassMat: THREE.Material; slatMat: THREE.Material; winGlass?: THREE.Material; led: THREE.Material; low: boolean },
): { triangles: number; setLighting(s: LightingState): void; dispose(): void } {
  void ctx;
  const uberX = { color: 3, aEdRM: 2 } as const;
  const conc = kit.bucket("atrium-concrete", opts.uber, { group: "upper", extra: uberX }).paint("#d0d2ce", 0.85);
  const frame = kit.bucket("atrium-frames", opts.uber, { group: "upper", extra: uberX }).paint("#1a1b1d", 0.45, 0.3);
  const glass = kit.bucket("atrium-glass", opts.glassMat, { group: "upper", renderOrder: 1, receiveShadow: false });
  const slats = kit.bucket("atrium-slats", opts.slatMat, { group: "upper" });
  const rooms = opts.winGlass
    ? kit.bucket("atrium-rooms", opts.winGlass, { group: "upper", extra: { aWinA: 4, aWinB: 4 } })
    : null;
  // White LED lines and their lilac halo in one vertex-coloured emissive (aEdEm).
  const led = kit.bucket("atrium-led", opts.led, { group: "upper", extra: { aEdEm: 3 } });
  const haloB = led;

  const r = ATRIUM_ROOF;
  for (const y of GALLERY_FLOORS) {
    const zMax = galleryZMax(y);
    if (zMax <= r.z0 + 1) continue;
    const top = y + STOREY_H - 0.45;
    // Slab edges (0.45 m) along the west, east and north sides of the void.
    conc.paint("#d0d2ce", 0.85);
    box(conc, r.x0 - 0.25, y - 0.45, r.z0 - 0.25, r.x0, y, zMax, { px: true, ny: true });
    box(conc, r.x1, y - 0.45, r.z0 - 0.25, r.x1 + 0.25, y, zMax, { nx: true, ny: true });
    box(conc, r.x0, y - 0.45, r.z0 - 0.25, r.x1, y, r.z0, { pz: true, ny: true });
    // Gallery floor strips and ceilings.
    conc.paint("#a9aab0", 0.6);
    box(conc, r.x0 - GALLERY_W, y - 0.02, r.z0 - GALLERY_W, r.x0, y, zMax, { py: true });
    box(conc, r.x1, y - 0.02, r.z0 - GALLERY_W, r.x1 + GALLERY_W, y, zMax, { py: true });
    box(conc, r.x0, y - 0.02, r.z0 - GALLERY_W, r.x1, y, r.z0, { py: true });
    conc.paint("#e2e2df", 0.9);
    box(conc, r.x0 - GALLERY_W, top - 0.02, r.z0 - GALLERY_W, r.x0, top, zMax, { ny: true });
    box(conc, r.x1, top - 0.02, r.z0 - GALLERY_W, r.x1 + GALLERY_W, top, zMax, { ny: true });
    box(conc, r.x0, top - 0.02, r.z0 - GALLERY_W, r.x1, top, r.z0, { ny: true });
    // Frameless glass balustrades with a slim top rail.
    balustrade(glass, frame, [r.x0, r.z0], [r.x0, zMax], y);
    balustrade(glass, frame, [r.x1, r.z0], [r.x1, zMax], y);
    balustrade(glass, frame, [r.x0, r.z0], [r.x1, r.z0], y);
    // Rooms behind the galleries: black-framed glass walls (rooms seen through them).
    const seed = y * 0.137;
    roomWall(rooms ?? glass, frame, [r.x0 - GALLERY_W, r.z0 - GALLERY_W], [r.x0 - GALLERY_W, zMax], y, top, [1, 0, 0], seed);
    roomWall(rooms ?? glass, frame, [r.x1 + GALLERY_W, r.z0 - GALLERY_W], [r.x1 + GALLERY_W, zMax], y, top, [-1, 0, 0], seed + 0.3);
    roomWall(rooms ?? glass, frame, [r.x0 - GALLERY_W, r.z0 - GALLERY_W], [r.x1 + GALLERY_W, r.z0 - GALLERY_W], y, top, [0, 0, 1], seed + 0.6);
    // End wall of the gallery level under the slope (the floor above stops here).
    if (zMax < r.z1 - 0.5) {
      conc.paint("#d8d9d5", 0.88);
      box(conc, r.x0 - GALLERY_W, y, zMax, r.x0, top, zMax + 0.2, { pz: true });
      box(conc, r.x1, y, zMax, r.x1 + GALLERY_W, top, zMax + 0.2, { pz: true });
    }
  }
  // South wall of the atrium on floor 3 (rooms of 2029/2031's floor above, under the roof).
  conc.paint("#d8d9d5", 0.88);
  box(conc, r.x0, 8.6, r.z1, r.x1, atriumRoofY(r.z1), r.z1 + 0.25, { nz: true });
  // Concrete frame columns at the void corners and along the sides, up to the roof.
  conc.paint("#cfd1cc", 0.86);
  const colZ = [r.z0, 24.5, 31.0, 37.5, 43.5, r.z1];
  for (const z of colZ) {
    const yTop = atriumRoofY(z) - 0.3;
    for (const x of [r.x0, r.x1]) box(conc, x - 0.22, 5.0, z - 0.22, x + 0.22, yTop, z + 0.22, { px: true, nx: true, pz: true, nz: true });
  }
  // Bridges at floors 3 and 4: matte charcoal, LED lines with a lilac halo underneath.
  for (const bdg of BRIDGES_ATRIUM) {
    const y = bdg.y;
    frame.paint("#2f3438", 0.75, 0.1);
    box(frame, r.x0, y - 0.55, bdg.z0, r.x1, y, bdg.z1);
    box(frame, r.x0, y, bdg.z0, r.x1, y + 1.1, bdg.z0 + 0.06, { nz: true, pz: true, py: true });
    box(frame, r.x0, y, bdg.z1 - 0.06, r.x1, y + 1.1, bdg.z1, { nz: true, pz: true, py: true });
    for (const z of [bdg.z0 - 0.005, bdg.z1 + 0.005]) {
      led.set("aEdEm", emission("#f4ecff", LUMINANCE.eventLight * 0.18));
      box(led, r.x0, y - 0.56, z - 0.01, r.x1, y - 0.52, z + 0.01);
      haloB.set("aEdEm", emission("#d0a8db", LUMINANCE.eventLight * 0.08));
      box(haloB, r.x0, y - 0.62, z - 0.03, r.x1, y - 0.56, z + 0.03);
    }
  }
  // Timber dice boxes: slatted outer faces, a glazed face towards the void.
  for (const [x0, x1, z0, z1, y] of DICE) {
    const h = 3.3;
    const y0 = y + 0.05;
    const y1 = y0 + h;
    const faces: [Vec3, [number, number, number, number]][] = [];
    void faces;
    // Slats on the sides and the underside's edge band; glass on the face that points into the void.
    const intoVoidX = x0 <= r.x0 + 0.01 ? 1 : x1 >= r.x1 - 0.01 ? -1 : 0;
    const sides: { n: Vec3; p: [Vec3, Vec3, Vec3, Vec3]; glass: boolean }[] = [
      { n: [1, 0, 0], p: [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], glass: intoVoidX === 1 },
      { n: [-1, 0, 0], p: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], glass: intoVoidX === -1 },
      { n: [0, 0, 1], p: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], glass: intoVoidX === 0 },
      { n: [0, 0, -1], p: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], glass: false },
    ];
    for (const s of sides) {
      const len = Math.hypot(s.p[1][0] - s.p[0][0], s.p[1][2] - s.p[0][2]);
      if (s.glass) {
        quadN(glass, s.p, s.n, [
          [0, y0],
          [len, y0],
          [len, y1],
          [0, y1],
        ]);
        // Frame round the glazing.
        frame.paint("#1a1b1d", 0.45, 0.3);
        const [a, c] = [s.p[0], s.p[1]];
        box(frame, Math.min(a[0], c[0]) - 0.03, y0, Math.min(a[2], c[2]) - 0.03, Math.max(a[0], c[0]) + 0.03, y0 + 0.08, Math.max(a[2], c[2]) + 0.03);
        box(frame, Math.min(a[0], c[0]) - 0.03, y1 - 0.08, Math.min(a[2], c[2]) - 0.03, Math.max(a[0], c[0]) + 0.03, y1, Math.max(a[2], c[2]) + 0.03);
      } else {
        quadN(slats, s.p, s.n, [
          [0, y0],
          [len, y0],
          [len, y1],
          [0, y1],
        ]);
      }
    }
    // Top and underside (slatted soffit).
    quadN(slats, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0], [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ]);
    quadN(slats, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ]);
  }
  return {
    triangles: 0,
    setLighting() {
      /* LED lines stay on during the event */
    },
    dispose() {
      /* owned materials are disposed with the kit */
    },
  };
}

/** Frameless glass balustrade (1.1 m) along a plan segment at floor height y. */
function balustrade(glass: Bucket, frame: Bucket, a: [number, number], c: [number, number], y: number): void {
  const alongX = Math.abs(c[1] - a[1]) < 1e-6;
  const y1 = y + 1.1;
  for (const side of [1, -1]) {
    const n: Vec3 = alongX ? [0, 0, side] : [side, 0, 0];
    const p: [Vec3, Vec3, Vec3, Vec3] = alongX
      ? [
          [a[0], y, a[1] + side * 0.01],
          [c[0], y, a[1] + side * 0.01],
          [c[0], y1, a[1] + side * 0.01],
          [a[0], y1, a[1] + side * 0.01],
        ]
      : [
          [a[0] + side * 0.01, y, a[1]],
          [a[0] + side * 0.01, y, c[1]],
          [a[0] + side * 0.01, y1, c[1]],
          [a[0] + side * 0.01, y1, a[1]],
        ];
    quadN(glass, p, n, [
      [0, y],
      [1, y],
      [1, y1],
      [0, y1],
    ]);
  }
  frame.paint("#c4c7c9", 0.35, 0.7);
  if (alongX) box(frame, a[0], y1, a[1] - 0.025, c[0], y1 + 0.04, a[1] + 0.025);
  else box(frame, a[0] - 0.025, y1, a[1], a[0] + 0.025, y1 + 0.04, c[1]);
  frame.paint("#1a1b1d", 0.45, 0.3);
}

/** Black-framed glass wall of the rooms behind a gallery; interior-mapped when the material supports it. */
function roomWall(b: Bucket, frame: Bucket, a: [number, number], c: [number, number], y0: number, y1: number, n: Vec3, seed: number): void {
  const alongX = Math.abs(c[1] - a[1]) < 1e-6;
  const s0 = alongX ? Math.min(a[0], c[0]) : Math.min(a[1], c[1]);
  const s1 = alongX ? Math.max(a[0], c[0]) : Math.max(a[1], c[1]);
  const k = alongX ? a[1] : a[0];
  const w = s1 - s0;
  const h = y1 - y0;
  // Right seen from the gallery side (the normal side): (−n.z, n.x).
  const rightAlong = alongX ? -n[2] : n[0];
  const lx = (s: number) => (rightAlong > 0 ? s - s0 : s1 - s);
  const P = (s: number, y: number): Vec3 => (alongX ? [s, y, k] : [k, y, s]);
  const corners: [number, number][] = [
    [s0, y0],
    [s1, y0],
    [s1, y1],
    [s0, y1],
  ];
  const pts = corners.map(([s, y]) => P(s, y));
  const ab = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1], pts[1][2] - pts[0][2]];
  const ac = [pts[2][0] - pts[0][0], pts[2][1] - pts[0][1], pts[2][2] - pts[0][2]];
  const cr = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
  const order = cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
  b.set("aWinB", [0, h + 0.45, (seed % 1 + 1) % 1, 0]);
  for (const i of order) {
    b.set("aWinA", [lx(corners[i][0]), corners[i][1] - y0, w, h]);
    b.vertex(pts[i], n, [corners[i][0], corners[i][1]]);
  }
  // Mullions every 1.35 m, head and sill.
  frame.paint("#1a1b1d", 0.45, 0.3);
  const m = Math.max(1, Math.round(w / 1.35));
  for (let i = 0; i <= m; i++) {
    const s = s0 + (w * i) / m;
    const q = P(s, y0);
    box(frame, q[0] - 0.03 + (alongX ? 0 : n[0] * 0.03), y0, q[2] - 0.03 + (alongX ? n[2] * 0.03 : 0), q[0] + 0.03 + (alongX ? 0 : n[0] * 0.03), y1, q[2] + 0.03 + (alongX ? n[2] * 0.03 : 0));
  }
}
