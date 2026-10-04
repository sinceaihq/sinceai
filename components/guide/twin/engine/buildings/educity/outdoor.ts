import type { V2 } from "../../types";
import { BRIDGES, MAIN_STAIRS, PAVILION } from "./frame";
import { DOOR_B } from "./data";
import { Bucket, box, cylinder, quadN, rectSlab, ring, slab, type Vec3 } from "./geom";
import { railing } from "./volumes";
import type { AtlasRect } from "./signs";

/**
 * Everything around the mantle at deck and street level: the glass entrance
 * pavilion (canopy with brushed-aluminium fascia, sedum roof, skylights, the
 * revolving west door and the sliding east door), door B's brick portal, the
 * outdoor Main Stairs with their sawtooth plinth and step lights, the
 * south-east walkway and plaza, the glazed link bridges to ICT-City, the
 * street storey on Joukahaisenkatu (storefront, grey panels, the lime-green
 * room) and the step-free gateway door.
 */

export interface OutdoorBuckets {
  render: Bucket;
  metal: Bucket;
  /** Railing infill quads (alpha-textured bars). */
  rail: Bucket;
  frame: Bucket;
  sedum: Bucket;
  pavers: Bucket;
  lights: Bucket;
  signs: Bucket;
  /** Interior-mapped stand-in glass (pavilion, doors) while the interior is off. */
  glassStandIn: Bucket;
  /** Clear glass in front of the furnished pavilion and lobby (interior on). */
  glassClear: Bucket;
  /** Always-clear glass (bridges, street storey, rooflights). */
  glassAlways: Bucket;
  /** Street-storey and bridge interiors (always lit): walls, floors, ceilings. */
  streetWalls: Bucket;
  streetCeiling: Bucket;
  /** Pavilion canopy soffit and exterior downlight housings (render). */
}

export interface SignRects {
  educity: AtlasRect;
  B: AtlasRect;
}

/** Quad with atlas UVs (a sign), centre c, facing n, width w along `right`, height h. */
export function signQuad(b: Bucket, c: Vec3, right: Vec3, n: Vec3, w: number, h: number, r: AtlasRect): void {
  const P = (sx: number, sy: number): Vec3 => [c[0] + right[0] * sx * (w / 2), c[1] + sy * (h / 2), c[2] + right[2] * sx * (w / 2)];
  quadN(b, [P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)], n, [
    [r.u0, r.v0],
    [r.u1, r.v0],
    [r.u1, r.v1],
    [r.u0, r.v1],
  ]);
}

/** Glass rectangle on a plane x = const (facing ±x) with optional window data. */
function glassX(b: Bucket, x: number, z0: number, z1: number, y0: number, y1: number, nx: 1 | -1, win?: [number, number, number, number]): void {
  const n: Vec3 = [nx, 0, 0];
  const corners: [number, number][] = [
    [z0, y0],
    [z1, y0],
    [z1, y1],
    [z0, y1],
  ];
  const pts = corners.map(([z, y]): Vec3 => [x, y, z]);
  // Right seen from outside: (n.z, −n.x) = −nx along z.
  const lx = (z: number) => (nx > 0 ? z1 - z : z - z0);
  const order = nx > 0 ? [1, 0, 3, 1, 3, 2] : [0, 1, 2, 0, 2, 3];
  if (win) b.set("aWinB", win);
  for (const i of order) {
    if (win) b.set("aWinA", [lx(corners[i][0]), corners[i][1] - y0, z1 - z0, y1 - y0]);
    b.vertex(pts[i], n, [corners[i][0] * -nx, corners[i][1]]);
  }
}

/** Glass rectangle on a plane z = const (facing ±z). */
function glassZ(b: Bucket, z: number, x0: number, x1: number, y0: number, y1: number, nz: 1 | -1, win?: [number, number, number, number]): void {
  const n: Vec3 = [0, 0, nz];
  const corners: [number, number][] = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  const pts = corners.map(([x, y]): Vec3 => [x, y, z]);
  // Right seen from outside: (n.z, −n.x) = (nz, 0) → +x when nz > 0.
  const lx = (x: number) => (nz > 0 ? x - x0 : x1 - x);
  const order = nz > 0 ? [0, 1, 2, 0, 2, 3] : [1, 0, 3, 1, 3, 2];
  if (win) b.set("aWinB", win);
  for (const i of order) {
    if (win) b.set("aWinA", [lx(corners[i][0]), corners[i][1] - y0, x1 - x0, y1 - y0]);
    b.vertex(pts[i], n, [corners[i][0] * nz, corners[i][1]]);
  }
}

/** Curtain-wall run on x = const: glass (clear + stand-in), mullions and transom. */
function curtainX(b: OutdoorBuckets, x: number, z0: number, z1: number, y0: number, y1: number, nx: 1 | -1, transom = 2.55): void {
  glassX(b.glassClear, x, z0, z1, y0, y1, nx);
  glassX(b.glassStandIn, x + nx * 0.004, z0, z1, y0, y1, nx, [-0.05, 4.2, ((x * 3.1 + z0 * 7.7) % 1 + 1) % 1, 2]);
  const fx0 = nx > 0 ? x : x - 0.06;
  const fx1 = nx > 0 ? x + 0.06 : x;
  const n = Math.max(1, Math.round((z1 - z0) / 1.6));
  for (let k = 0; k <= n; k++) {
    const z = z0 + ((z1 - z0) * k) / n;
    box(b.frame, fx0, y0, z - 0.03, fx1, y1, z + 0.03);
  }
  box(b.frame, fx0, y0, z0, fx1, y0 + 0.08, z1);
  box(b.frame, fx0, transom - 0.03, z0, fx1, transom + 0.03, z1);
  box(b.frame, fx0, y1 - 0.06, z0, fx1, y1, z1);
}

export function buildOutdoor(b: OutdoorBuckets, signs: SignRects): void {
  pavilion(b, signs);
  doorB(b, signs);
  mainStairs(b);
  walkway(b);
  bridges(b);
  streetStorey(b, signs);
  gateway(b);
}

// ── Entrance pavilion ───────────────────────────────────────────────────────

const SOFFIT = PAVILION.roof - PAVILION.fascia;

function pavilion(b: OutdoorBuckets, signs: SignRects): void {
  const P = PAVILION;
  // Fascia (brushed aluminium) on the three free sides, 1.3 m deep band.
  b.metal.paint("#b2b9c0", 0.36, 0.35);
  box(b.metal, P.x0, SOFFIT, P.z0, P.x0 + 0.06, P.roof, P.z1, { nx: true, py: true });
  box(b.metal, P.x1 - 0.06, SOFFIT, P.z0, P.x1, P.roof, P.z1, { px: true, py: true });
  box(b.metal, P.x0, SOFFIT, P.z1 - 0.06, P.x1, P.roof, P.z1, { pz: true, py: true });
  // Roof: sedum, with the slab edge hidden behind the fascia.
  rectSlab(b.sedum, P.x0 + 0.06, P.x1 - 0.06, P.z0, P.z1 - 0.06, P.roof - 0.04, true);
  // Canopy soffits outside the glass (light, with downlights).
  b.render.color("#d9d9d5");
  rectSlab(b.render, P.x0, P.glassNW, P.z0, P.z1, SOFFIT, false);
  rectSlab(b.render, P.glassSE, P.x1, P.z0, P.z1, SOFFIT, false);
  rectSlab(b.render, P.glassNW, P.glassSE, P.wallSW, P.z1, SOFFIT, false);
  for (let z = P.z0 + 1.5; z < P.z1 - 0.5; z += 3.0) {
    ring(b.lights, (P.x0 + P.glassNW) / 2, z, 0, 0.09, SOFFIT - 0.01, 10, false);
    ring(b.lights, (P.glassSE + P.x1) / 2, z, 0, 0.09, SOFFIT - 0.01, 10, false);
  }
  // Skylights: white truncated pyramids with a glass top over the slatted funnels.
  for (const [cx, cz, base] of [
    [15.0, 74.4, 3.2],
    [25.3, 72.0, 4.4],
    [36.6, 74.4, 3.2],
  ] as const) {
    skylight(b, cx, cz, base, P.roof);
  }
  // Glazed walls under the canopy (y 0 → soffit).
  // North-west face: glass, the revolving door, glass, then the aluminium corner pier.
  const drumZ = 74.6;
  const drumR = 1.5;
  curtainX(b, P.glassNW, P.z0 + 0.05, drumZ - drumR, 0, SOFFIT, -1);
  curtainX(b, P.glassNW, drumZ + drumR, 77.6, 0, SOFFIT, -1);
  revolvingDoor(b, P.glassNW, drumZ, drumR);
  glassX(b.glassClear, P.glassNW, drumZ - drumR, drumZ + drumR, 2.6, SOFFIT, -1);
  glassX(b.glassStandIn, P.glassNW - 0.004, drumZ - drumR, drumZ + drumR, 2.6, SOFFIT, -1, [-2.6, 4.2, 0.37, 2]);
  b.metal.paint("#b2b9c0", 0.36, 0.35);
  box(b.metal, P.x0 + 0.06, 0, 77.6, P.glassNW, SOFFIT, P.z1);
  // South-east face: glass, the sliding door "B", glass, pier.
  const doorZ0 = 73.5;
  const doorZ1 = 75.9;
  curtainX(b, P.glassSE, P.z0 + 0.05, doorZ0, 0, SOFFIT, 1);
  curtainX(b, P.glassSE, doorZ1, 77.6, 0, SOFFIT, 1);
  slidingDoor(b, P.glassSE, doorZ0, doorZ1, signs.B);
  b.metal.paint("#b2b9c0", 0.36, 0.35);
  box(b.metal, P.glassSE, 0, 77.6, P.x1 - 0.06, SOFFIT, P.z1);
  // South-west wall over the surface lot: large grey metal panels (1.2 × 1.5 m grid) above a concrete
  // plinth, an exit door from the lower lobby with a steel stair down to the lot (thinglink "parking wall").
  swWall(b);
  // Building name on the fascia over both entrances (lit after dark).
  const lw = 3.0;
  const lh = lw / signs.educity.aspect;
  signQuad(b.signs, [P.x0 - 0.012, (SOFFIT + P.roof) / 2, drumZ], [0, 0, 1], [-1, 0, 0], lw, lh, signs.educity);
  signQuad(b.signs, [P.x1 + 0.012, (SOFFIT + P.roof) / 2, (doorZ0 + doorZ1) / 2], [0, 0, -1], [1, 0, 0], lw, lh, signs.educity);
}

/** Height of the surface lot along the pavilion's south-west face (y_E; DTM ≈ −3.4 campus). */
const LOT = -6.8;

function swWall(b: OutdoorBuckets): void {
  const P = PAVILION;
  const z = P.z1 - 0.06;
  // Panel field (deck level down to the plinth) and the plinth.
  b.render.paint("#8e959b", 0.55, 0.25);
  box(b.render, P.x0, LOT + 0.7, z - 0.1, P.x1, SOFFIT, z, { pz: true, nx: true, px: true });
  b.render.paint("#9b9892", 0.9, 0);
  box(b.render, P.x0, LOT - 0.4, z - 0.1, P.x1, LOT + 0.7, z + 0.04, { pz: true, nx: true, px: true, py: true });
  // Joints: vertical every 1.2 m, horizontal every 1.5 m (recessed dark lines).
  b.frame.paint("#5d6266", 0.6, 0.2);
  for (let x = P.x0 + 1.2; x < P.x1 - 0.2; x += 1.2) box(b.frame, x - 0.009, LOT + 0.7, z, x + 0.009, SOFFIT, z + 0.004, { pz: true });
  for (let y = LOT + 0.7 + 1.5; y < SOFFIT - 0.3; y += 1.5) box(b.frame, P.x0, y - 0.009, z, P.x1, y + 0.009, z + 0.004, { pz: true });
  // Exit door of the lower lobby (y_E −5) with a landing and a steel stair down to the lot.
  const dx0 = 33.6;
  const dx1 = 35.4;
  const yD = -5.0;
  b.frame.paint("#3d4246", 0.5, 0.3);
  box(b.frame, dx0 - 0.06, yD, z, dx1 + 0.06, yD + 2.4, z + 0.03, { pz: true });
  b.render.paint("#b9bec2", 0.4, 0.4);
  box(b.render, dx0, yD + 0.02, z + 0.03, dx1, yD + 2.3, z + 0.05, { pz: true });
  b.frame.paint("#22262a", 0.4, 0.2);
  box(b.frame, dx0 + 0.15, yD + 1.2, z + 0.05, dx0 + 0.75, yD + 2.1, z + 0.06, { pz: true });
  box(b.frame, dx1 - 0.75, yD + 1.2, z + 0.05, dx1 - 0.15, yD + 2.1, z + 0.06, { pz: true });
  // Landing (galvanised grating) on two posts, then the flight towards the north-west along the wall.
  b.metal.paint("#8f969a", 0.6, 0.6);
  const lz0 = z + 0.05;
  const lz1 = z + 1.65;
  box(b.metal, dx0 - 0.4, yD - 0.08, lz0, dx1 + 0.4, yD, lz1);
  for (const px of [dx0 - 0.35, dx1 + 0.35]) box(b.metal, px - 0.05, LOT, lz1 - 0.1, px + 0.05, yD - 0.08, lz1, { px: true, nx: true, pz: true, nz: true });
  const rise = yD - LOT;
  const steps = Math.round(rise / 0.18);
  const run = 0.27;
  for (let i = 0; i < steps; i++) {
    const x1 = dx0 - 0.4 - i * run;
    const y = yD - (i + 1) * (rise / steps);
    box(b.metal, x1 - run, y - 0.04, lz0 + 0.1, x1, y, lz1 - 0.1, { py: true, ny: true, pz: true, nz: true, nx: true });
  }
  // Stringers and handrails of the flight and the landing.
  const xEnd = dx0 - 0.4 - steps * run;
  const sl = Math.hypot(dx0 - 0.4 - xEnd, rise);
  for (const zz of [lz0 + 0.08, lz1 - 0.08]) {
    quadN(b.metal, [[xEnd, LOT, zz], [dx0 - 0.4, yD - 0.3, zz], [dx0 - 0.4, yD, zz], [xEnd, LOT + 0.3, zz]], [0, 0, 1], [
      [0, 0],
      [sl, 0],
      [sl, 0.3],
      [0, 0.3],
    ]);
    quadN(b.metal, [[xEnd, LOT + 0.95, zz], [dx0 - 0.4, yD + 0.95, zz], [dx0 - 0.4, yD + 1.0, zz], [xEnd, LOT + 1.0, zz]], [0, 0, 1], [
      [0, 0],
      [sl, 0],
      [sl, 0.05],
      [0, 0.05],
    ]);
  }
  quadN(b.rail, [[xEnd, LOT + 0.3, lz1 - 0.08], [dx0 - 0.4, yD + 0.12, lz1 - 0.08], [dx0 - 0.4, yD + 0.95, lz1 - 0.08], [xEnd, LOT + 0.95, lz1 - 0.08]], [0, 0, 1], [
    [0, LOT + 0.3],
    [dx0 - 0.4 - xEnd, yD + 0.12],
    [dx0 - 0.4 - xEnd, yD + 0.95],
    [0, LOT + 0.95],
  ]);
  railing(b.metal, b.rail, [dx0 - 0.4, lz1 - 0.05], [dx1 + 0.4, lz1 - 0.05], yD, 1.0);
  // A wall lamp over the door.
  box(b.lights, (dx0 + dx1) / 2 - 0.15, yD + 2.55, z + 0.03, (dx0 + dx1) / 2 + 0.15, yD + 2.68, z + 0.14);
  b.render.paint("#c6c9c7", 0.9);
}

function skylight(b: OutdoorBuckets, cx: number, cz: number, base: number, y: number): void {
  const h0 = base / 2;
  const h1 = h0 * 0.62;
  const yb = y + 0.45;
  const yt = y + 1.2;
  b.render.color("#e6e6e2");
  box(b.render, cx - h0, y - 0.05, cz - h0, cx + h0, yb, cz + h0, { px: true, nx: true, pz: true, nz: true });
  const corner = (sx: number, sz: number, hh: number, yy: number): Vec3 => [cx + sx * hh, yy, cz + sz * hh];
  const faces: [number, number, number, number, Vec3][] = [
    [-1, -1, 1, -1, [0, 0.5, -1]],
    [1, -1, 1, 1, [1, 0.5, 0]],
    [1, 1, -1, 1, [0, 0.5, 1]],
    [-1, 1, -1, -1, [-1, 0.5, 0]],
  ];
  for (const [ax, az, bx, bz, n] of faces) {
    const p = [corner(ax, az, h0, yb), corner(bx, bz, h0, yb), corner(bx, bz, h1, yt), corner(ax, az, h1, yt)] as [Vec3, Vec3, Vec3, Vec3];
    const l = Math.hypot(n[0], n[1], n[2]);
    quadN(b.render, p, [n[0] / l, n[1] / l, n[2] / l], [
      [0, 0],
      [base, 0],
      [base, 1],
      [0, 1],
    ]);
  }
  rectSlab(b.glassAlways, cx - h1, cx + h1, cz - h1, cz + h1, yt, true);
  box(b.frame, cx - h1, yt, cz - 0.02, cx + h1, yt + 0.04, cz + 0.02);
  box(b.frame, cx - 0.02, yt, cz - h1, cx + 0.02, yt + 0.04, cz + h1);
}

function revolvingDoor(b: OutdoorBuckets, x: number, cz: number, r: number): void {
  const h = 2.6;
  // Two curved glass walls (the drum), open towards the deck and the hall.
  for (const [a0, a1] of [
    [Math.PI * 0.25, Math.PI * 0.75],
    [Math.PI * 1.25, Math.PI * 1.75],
  ]) {
    cylinder(b.glassClear, x, cz, r, 0.02, h, 10, { a0, a1 });
    cylinder(b.glassStandIn, x, cz, r - 0.004, 0.02, h, 10, { a0, a1 });
  }
  // Brushed-aluminium canopy ring on top and the floor ring; three glass wings with dark edges.
  b.metal.color("#9da5ae");
  cylinder(b.metal, x, cz, r + 0.05, h, h + 0.25, 24);
  ring(b.metal, x, cz, 0, r + 0.05, h + 0.25, 24, true);
  ring(b.metal, x, cz, 0, r + 0.05, h, 24, false);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.4;
    const ex = x + Math.cos(a) * (r - 0.05);
    const ez = cz + Math.sin(a) * (r - 0.05);
    box(b.frame, Math.min(x, ex) - 0.02, 0.02, Math.min(cz, ez) - 0.02, Math.max(x, ex) + 0.02, 0.08, Math.max(cz, ez) + 0.02);
    box(b.frame, ex - 0.03, 0.02, ez - 0.03, ex + 0.03, h, ez + 0.03);
  }
  box(b.frame, x - 0.05, 0, cz - 0.05, x + 0.05, h, cz + 0.05);
}

function slidingDoor(b: OutdoorBuckets, x: number, z0: number, z1: number, B: AtlasRect): void {
  const h = 2.45;
  glassX(b.glassClear, x, z0, z1, 0.03, h, 1);
  glassX(b.glassStandIn, x + 0.004, z0, z1, 0.03, h, 1, [-0.03, 4.2, 0.61, 2]);
  glassX(b.glassClear, x, z0, z1, h + 0.08, SOFFIT, 1);
  glassX(b.glassStandIn, x + 0.004, z0, z1, h + 0.08, SOFFIT, 1, [-2.53, 4.2, 0.83, 2]);
  b.metal.color("#8e959c");
  const mid = (z0 + z1) / 2;
  for (const z of [z0, mid, z1]) box(b.metal, x - 0.02, 0, z - 0.04, x + 0.06, h, z + 0.04);
  box(b.metal, x - 0.02, h, z0, x + 0.08, h + 0.08, z1);
  box(b.metal, x - 0.02, 0, z0, x + 0.06, 0.06, z1);
  // Door letter on the left leaf (seen from outside: left = +z side).
  signQuad(b.signs, [x + 0.012, 1.25, (mid + z1) / 2], [0, 0, -1], [1, 0, 0], 0.42, 0.42, B);
}

// ── Door B (south-east facade, recessed brick portal) ──────────────────────

function doorB(b: OutdoorBuckets, signs: SignRects): void {
  const xFace = 51.8;
  const xDoor = xFace - DOOR_B.depth;
  const z0 = DOOR_B.z0;
  const z1 = DOOR_B.z1;
  // Dark steel lintel band at the top of the recess and a soffit.
  box(b.frame, xDoor, 2.72, z0, xFace + 0.02, DOOR_B.top, z1, { px: true, ny: true });
  // Glass doors (double, 1.6 m) with fixed side lights and a transom; champagne frames.
  const dz0 = 31.9;
  const dz1 = 33.5;
  const top = 2.72;
  for (const [a, c, y0, y1] of [
    [z0 + 0.05, dz0, 0.03, top],
    [dz0, dz1, 0.03, 2.3],
    [dz0, dz1, 2.36, top],
    [dz1, z1 - 0.05, 0.03, top],
  ] as const) {
    glassX(b.glassClear, xDoor, a, c, y0, y1, 1);
    glassX(b.glassStandIn, xDoor + 0.004, a, c, y0, y1, 1, [-y0, 4.2, 0.27 + a * 0.01, 2]);
  }
  b.metal.color("#8f8a80");
  for (const z of [z0 + 0.05, dz0, (dz0 + dz1) / 2, dz1, z1 - 0.05]) box(b.metal, xDoor - 0.03, 0, z - 0.035, xDoor + 0.05, top, z + 0.035);
  box(b.metal, xDoor - 0.03, 2.3, z0, xDoor + 0.05, 2.36, z1);
  box(b.metal, xDoor - 0.03, 0, z0, xDoor + 0.05, 0.05, z1);
  signQuad(b.signs, [xDoor + 0.06, 1.3, (dz0 + dz1) / 2 + 0.42], [0, 0, -1], [1, 0, 0], 0.5, 0.5, signs.B);
  // Side door: single glazed leaf at depth 0.3.
  const sd = DOOR_B.side;
  const xs = xFace - 0.3;
  glassX(b.glassClear, xs, sd.z0, sd.z1, 0.03, sd.top, 1);
  glassX(b.glassStandIn, xs + 0.004, sd.z0, sd.z1, 0.03, sd.top, 1, [-0.03, 4.2, 0.71, 1]);
  b.metal.color("#a5a8a6");
  box(b.metal, xs - 0.02, 0, sd.z0, xs + 0.05, sd.top, sd.z0 + 0.07);
  box(b.metal, xs - 0.02, 0, sd.z1 - 0.07, xs + 0.05, sd.top, sd.z1);
  box(b.metal, xs - 0.02, sd.top - 0.07, sd.z0, xs + 0.05, sd.top, sd.z1);
  box(b.metal, xs - 0.02, 1.9, sd.z0 + 0.07, xs + 0.05, 1.98, sd.z1 - 0.07);
  // Door handle bar and a wall lamp beside the portal.
  box(b.metal, xDoor + 0.05, 0.9, (dz0 + dz1) / 2 - 0.12, xDoor + 0.1, 1.9, (dz0 + dz1) / 2 - 0.08);
  box(b.lights, xFace + 0.01, 2.85, 34.75, xFace + 0.12, 3.0, 35.0);
}

// ── Main Stairs (Joukahaisenkatu → south-east walkway) ─────────────────────

export const STAIR_RISERS = 30;

/** Tread i (0 = bottom) of the Main Stairs: z range and tread height (y_E). */
export function stairTread(i: number): { z0: number; z1: number; y: number } {
  const S = MAIN_STAIRS;
  const g = (S.zTop - S.zFoot) / STAIR_RISERS;
  const r = (S.yTop - S.yFoot) / STAIR_RISERS;
  return { z0: S.zFoot + i * g, z1: S.zFoot + (i + 1) * g, y: S.yFoot + (i + 1) * r };
}

function mainStairs(b: OutdoorBuckets): void {
  const S = MAIN_STAIRS;
  const x0 = 51.8;
  const x1 = S.x1;
  const base = S.yFoot - 0.4;
  b.render.color("#8b847d");
  for (let i = 0; i < STAIR_RISERS; i++) {
    const t = stairTread(i);
    const yPrev = i === 0 ? S.yFoot : stairTread(i - 1).y;
    // Tread (lighter, worn) and riser.
    b.render.color(i % 2 ? "#958e87" : "#918a83");
    rectSlab(b.render, x0, x1, t.z0, t.z1, t.y, true);
    b.render.color("#7f7973");
    quadN(b.render, [[x0, yPrev, t.z0], [x1, yPrev, t.z0], [x1, t.y, t.z0], [x0, t.y, t.z0]], [0, 0, -1], [
      [-x0, yPrev],
      [-x1, yPrev],
      [-x1, t.y],
      [-x0, t.y],
    ]);
    // Outer flank (sawtooth) down to the base.
    quadN(b.render, [[x1, base, t.z0], [x1, base, t.z1], [x1, t.y, t.z1], [x1, t.y, t.z0]], [1, 0, 0], [
      [-t.z0, base],
      [-t.z1, base],
      [-t.z1, t.y],
      [-t.z0, t.y],
    ]);
    // Sawtooth concrete plinth along the brick wall, with step lights every second tread.
    b.render.color("#8f8b86");
    box(b.render, x0 - 0.05, t.y, t.z0, x0 + 0.02, t.y + 0.42, t.z1, { px: true, py: true, nz: true });
    if (i % 2 === 1) box(b.lights, x0 + 0.02, t.y + 0.16, (t.z0 + t.z1) / 2 - 0.07, x0 + 0.035, t.y + 0.3, (t.z0 + t.z1) / 2 + 0.07);
  }
  // Landing face at the top meets the walkway; front face of the lowest step to the pavement.
  // Handrail on the wall (steel bar on brackets) and the galvanised railing on the open side.
  b.metal.color("#9ea4a7");
  const first = stairTread(0);
  const last = stairTread(STAIR_RISERS - 1);
  const rail = (x: number, h: number) => {
    const ya = first.y + h;
    const yb = last.y + h;
    const z0 = first.z0 + 0.25;
    const z1 = last.z1 - 0.1;
    const len = Math.hypot(z1 - z0, yb - ya);
    const ny = (z1 - z0) / len;
    const nz = -(yb - ya) / len;
    quadN(b.metal, [[x - 0.025, ya, z0], [x + 0.025, ya, z0], [x + 0.025, yb, z1], [x - 0.025, yb, z1]], [0, ny, nz], [
      [0, 0],
      [0.05, 0],
      [0.05, len],
      [0, len],
    ]);
    quadN(b.metal, [[x - 0.025, ya - 0.05, z0], [x - 0.025, ya, z0], [x - 0.025, yb, z1], [x - 0.025, yb - 0.05, z1]], [-1, 0, 0], [
      [z0, ya],
      [z0, ya + 0.05],
      [z1, yb],
      [z1, yb - 0.05],
    ]);
    quadN(b.metal, [[x + 0.025, ya - 0.05, z0], [x + 0.025, ya, z0], [x + 0.025, yb, z1], [x + 0.025, yb - 0.05, z1]], [1, 0, 0], [
      [z0, ya],
      [z0, ya + 0.05],
      [z1, yb],
      [z1, yb - 0.05],
    ]);
  };
  rail(x0 + 0.12, 0.9);
  rail(x1 - 0.06, 1.1);
  // Posts every third tread and the flat-bar infill as one sloped textured quad.
  for (let i = 0; i < STAIR_RISERS; i += 3) {
    const t = stairTread(i);
    const zc = (t.z0 + t.z1) / 2;
    box(b.metal, x1 - 0.09, t.y, zc - 0.03, x1 - 0.03, t.y + 1.1, zc + 0.03);
  }
  const za = first.z0 + 0.15;
  const zb = last.z1 - 0.05;
  const ya = first.y;
  const yb = last.y;
  const xr = x1 - 0.06;
  quadN(b.rail, [[xr, ya + 0.12, za], [xr, yb + 0.12, zb], [xr, yb + 1.04, zb], [xr, ya + 1.04, za]], [1, 0, 0], [
    [0, ya + 0.12],
    [zb - za, yb + 0.12],
    [zb - za, yb + 1.04],
    [0, ya + 1.04],
  ]);
}

// ── South-east walkway and the plaza at the east entrance ──────────────────

function walkway(b: OutdoorBuckets): void {
  const xIn = 51.8;
  const xOut = 58.0;
  const zStart = MAIN_STAIRS.zTop;
  const zEnd = PAVILION.z1;
  const ring2: V2[] = [
    [xIn, zStart],
    [xIn, 65.2],
    [PAVILION.glassSE, 65.2],
    [PAVILION.glassSE, zEnd],
    [xOut, zEnd],
    [xOut, zStart],
  ];
  slab(b.pavers, ring2, 0.0, true);
  // Outer faces of the deck down to the yard and the surface lot.
  b.render.color("#8d8a86");
  quadN(b.render, [[xOut + 0.25, -5.0, zStart], [xOut + 0.25, -5.0, zEnd], [xOut + 0.25, 0.25, zEnd], [xOut + 0.25, 0.25, zStart]], [1, 0, 0], [
    [-zStart, -5],
    [-zEnd, -5],
    [-zEnd, 0.25],
    [-zStart, 0.25],
  ]);
  quadN(b.render, [[PAVILION.x1, -7.2, zEnd + 0.25], [xOut + 0.25, -7.2, zEnd + 0.25], [xOut + 0.25, 0.25, zEnd + 0.25], [PAVILION.x1, 0.25, zEnd + 0.25]], [0, 0, 1], [
    [PAVILION.x1, -7.2],
    [xOut, -7.2],
    [xOut, 0.25],
    [PAVILION.x1, 0.25],
  ]);
  // Concrete upstand with white coping and the galvanised flat-bar railing.
  b.render.color("#b9b7b2");
  box(b.render, xOut, 0, zStart, xOut + 0.25, 0.22, zEnd + 0.25, { py: true, nx: true, nz: true });
  box(b.render, PAVILION.x1, 0, zEnd, xOut, 0.22, zEnd + 0.25, { py: true, nz: true, nx: true });
  b.render.color("#e8e8e4");
  box(b.render, xOut - 0.02, 0.22, zStart, xOut + 0.27, 0.26, zEnd + 0.27, { py: true, nx: true, px: true, nz: true });
  railing(b.metal, b.rail, [xOut + 0.12, zStart + 0.1], [xOut + 0.12, zEnd + 0.12], 0.26, 1.05);
  railing(b.metal, b.rail, [PAVILION.x1, zEnd + 0.12], [xOut + 0.12, zEnd + 0.12], 0.26, 1.05);
  // Rooflights of the lower level along the facade (blue segmented glazing, low upstands).
  for (let z = 35.2; z < 63.4; z += 3.6) {
    const za = z;
    const zb = Math.min(z + 3.2, 63.8);
    b.render.color("#a7a9a8");
    box(b.render, 52.3, 0, za, 54.0, 0.32, zb, { px: true, nx: true, pz: true, nz: true });
    rectSlab(b.glassAlways, 52.32, 53.98, za + 0.02, zb - 0.02, 0.5, true);
    quadN(b.glassAlways, [[54.0, 0.32, za], [54.0, 0.32, zb], [52.3, 0.5, zb], [52.3, 0.5, za]], [0.1, 1, 0], [
      [za, 0],
      [zb, 0],
      [zb, 1],
      [za, 1],
    ]);
    box(b.frame, 52.28, 0.3, za - 0.02, 54.02, 0.34, zb + 0.02, { py: true, px: true });
  }
  // Wall lamps on the brick along the walkway.
  for (const z of [18.5, 26.0, 40.0, 48.0, 56.0]) box(b.lights, xIn + 0.01, 2.9, z - 0.12, xIn + 0.11, 3.05, z + 0.12);
}

// ── Link bridges to ICT-City ────────────────────────────────────────────────

function bridges(b: OutdoorBuckets): void {
  const B = BRIDGES;
  for (const level of [B.lower, B.upper]) {
    const y0 = level.floor;
    const y1 = level.roof - 0.4;
    // Floor slab and roof slab (grey), fascia bands.
    b.render.color("#8b8f92");
    box(b.render, B.x0, level.under, B.z0 - 0.05, B.x1, y0, B.z1 + 0.05, { ny: true, pz: true, nz: true });
    b.render.color("#b4b8bb");
    box(b.render, B.x0, y1, B.z0 - 0.05, B.x1, level.roof, B.z1 + 0.05, { py: true, pz: true, nz: true });
    // Glass sides with mullions every 1.5 m.
    glassZ(b.glassAlways, B.z0, B.x0, B.x1, y0, y1, -1);
    glassZ(b.glassAlways, B.z1, B.x0, B.x1, y0, y1, 1);
    for (let x = B.x0; x <= B.x1 + 1e-6; x += (B.x1 - B.x0) / 8) {
      box(b.frame, x - 0.03, y0, B.z0 - 0.04, x + 0.03, y1, B.z0 + 0.02);
      box(b.frame, x - 0.03, y0, B.z1 - 0.02, x + 0.03, y1, B.z1 + 0.04);
    }
    for (const z of [B.z0, B.z1]) {
      box(b.frame, B.x0, y0, z - 0.04, B.x1, y0 + 0.08, z + 0.04);
      box(b.frame, B.x0, y1 - 0.06, z - 0.04, B.x1, y1, z + 0.04);
    }
    // Corridor inside: light floor and a lit ceiling (always on — seen from the gateway).
    b.streetWalls.color("#b9b7b1");
    rectSlab(b.streetWalls, B.x0, B.x1, B.z0, B.z1, y0 + 0.02, true);
    rectSlab(b.streetCeiling, B.x0, B.x1, B.z0, B.z1, y1 - 0.02, false);
  }
}

// ── Street storey on Joukahaisenkatu ───────────────────────────────────────

function streetStorey(b: OutdoorBuckets, signs: SignRects): void {
  const yF = -5.0;
  const yT = -0.4;
  const zG = 0.25;
  const depth = 5.0;
  // Soffit band between the brick base and the recessed glazing, and the slab edge.
  b.render.color("#56555a");
  box(b.render, 0.7, yT, 0, 44.5, -0.35, zG, { ny: true, nz: true });
  // Storefront x 0.7 … 29.9: clear glass, mullions every 1.2 m, a door pair near the middle.
  glassZ(b.glassAlways, zG, 0.7, 29.9, yF + 0.05, yT, -1);
  for (let x = 0.7; x <= 29.9 + 1e-6; x += (29.9 - 0.7) / 24) box(b.frame, x - 0.035, yF, zG - 0.06, x + 0.035, yT, zG + 0.02);
  box(b.frame, 0.7, yF, zG - 0.06, 29.9, yF + 0.1, zG + 0.02);
  box(b.frame, 0.7, yT - 0.08, zG - 0.06, 29.9, yT, zG + 0.02);
  box(b.frame, 0.7, -2.45, zG - 0.06, 29.9, -2.38, zG + 0.02);
  // Grey metal panels with louvre grilles x 29.9 … 39.1.
  b.render.color("#b6babd");
  box(b.render, 29.9, yF - 0.3, zG - 0.1, 39.1, yT, zG, { nz: true });
  for (const x of [31.4, 35.6]) box(b.frame, x, -3.6, zG - 0.12, x + 1.4, -2.4, zG - 0.1);
  for (let x = 29.9 + 1.15; x < 39.1; x += 1.15) box(b.frame, x - 0.006, yF, zG - 0.115, x + 0.006, yT, zG - 0.1);
  // The lime-green room x 39.1 … 44.5 (glazed, lit lime walls behind).
  glassZ(b.glassAlways, zG, 39.1, 44.5, yF + 0.05, yT, -1);
  for (let x = 39.1; x <= 44.5 + 1e-6; x += 1.35) box(b.frame, x - 0.035, yF, zG - 0.06, x + 0.035, yT, zG + 0.02);
  box(b.frame, 39.1, yT - 0.08, zG - 0.06, 44.5, yT, zG + 0.02);
  // Shallow lit interiors behind the glass (floor, ceiling with panels, back and side walls).
  b.streetWalls.color("#7d7e7f");
  rectSlab(b.streetWalls, 0.7, 44.5, zG, depth, yF + 0.01, true);
  rectSlab(b.streetCeiling, 0.7, 44.5, zG, depth, -1.1, false);
  b.streetWalls.color("#d9dad8");
  quadN(b.streetWalls, [[0.7, yF, depth], [29.9, yF, depth], [29.9, -1.1, depth], [0.7, -1.1, depth]], [0, 0, -1], [
    [0, yF],
    [29.2, yF],
    [29.2, -1.1],
    [0, -1.1],
  ]);
  for (const x of [8.4, 16.9, 23.6]) box(b.streetWalls, x - 0.1, yF, zG + 1.2, x + 0.1, -1.1, depth);
  b.streetWalls.color("#a8c93a");
  quadN(b.streetWalls, [[39.1, yF, depth], [44.5, yF, depth], [44.5, -1.1, depth], [39.1, -1.1, depth]], [0, 0, -1], [
    [0, yF],
    [5.4, yF],
    [5.4, -1.1],
    [0, -1.1],
  ]);
  quadN(b.streetWalls, [[44.5, yF, zG], [44.5, yF, depth], [44.5, -1.1, depth], [44.5, -1.1, zG]], [-1, 0, 0], [
    [0, yF],
    [4.75, yF],
    [4.75, -1.1],
    [0, -1.1],
  ]);
  quadN(b.streetWalls, [[39.1, yF, depth], [39.1, yF, zG], [39.1, -1.1, zG], [39.1, -1.1, depth]], [1, 0, 0], [
    [0, yF],
    [4.75, yF],
    [4.75, -1.1],
    [0, -1.1],
  ]);
  // Wall lights over the storefront and the "EduCity" letters near the north corner.
  for (const x of [5.5, 12.5, 19.5, 26.5, 33.5, 41.5]) {
    box(b.lights, x - 0.12, -0.3, -0.12, x + 0.12, -0.2, 0.0);
  }
  signQuad(b.signs, [1.8, 0.58, -0.015], [-1, 0, 0], [0, 0, -1], 1.85, 1.85 / signs.educity.aspect, signs.educity);
}

// ── ICT-City gateway door (street level, step-free lifts) ──────────────────

function gateway(b: OutdoorBuckets): void {
  const yF = -5.0;
  const x = 0.3;
  glassX(b.glassAlways, x, 31.5, 34.0, yF + 0.03, -2.4, -1);
  b.metal.color("#8e959c");
  for (const z of [31.5, 32.75, 34.0]) box(b.metal, x - 0.05, yF, z - 0.04, x + 0.04, -2.4, z + 0.04);
  box(b.metal, x - 0.05, -2.48, 31.5, x + 0.04, -2.4, 34.0);
  // Lift lobby behind: floor, lit ceiling, two steel lift doors on the back wall.
  b.streetWalls.color("#9a9b9c");
  rectSlab(b.streetWalls, x, 3.4, 31.0, 34.5, yF + 0.01, true);
  rectSlab(b.streetCeiling, x, 3.4, 31.0, 34.5, -2.0, false);
  b.streetWalls.color("#d4d5d3");
  quadN(b.streetWalls, [[3.4, yF, 31.0], [3.4, yF, 34.5], [3.4, -2.0, 34.5], [3.4, -2.0, 31.0]], [-1, 0, 0], [
    [31, yF],
    [34.5, yF],
    [34.5, -2],
    [31, -2],
  ]);
  b.metal.color("#b9bdc0");
  box(b.metal, 3.32, yF, 31.6, 3.4, -2.9, 32.6);
  box(b.metal, 3.32, yF, 33.0, 3.4, -2.9, 34.0);
  box(b.lights, x - 0.12, -2.25, 32.55, x - 0.02, -2.1, 32.95);
}
