import * as THREE from "three";
import type { V2 } from "../../types";
import {
  ATRIUM,
  ATRIUM_NE_Z,
  ATRIUM_SW_Z,
  BRIDGES,
  COLUMN_ROWS,
  COLUMN_X,
  GALLERY,
  GALLERY_COLUMNS,
  ISLANDS,
  JOKI_PASSAGE,
  LEVEL,
  LOBBY,
  LOBBY_FRONTS,
  MAUNO_FLOORS,
  OVAL_COLUMNS,
  RETAIL_FRONT,
  UPPER_FLOORS,
  ceilingRings,
  groundFloorRing,
} from "./plan";
import { GF_WALLS } from "./walls";
import { Buckets, bar, box, facadeRun, flatPolygon, mergeAll, ovalColumn, prism, rod, wallQuad, type Layer } from "./geom";

/**
 * BioCity ground floor fit-out (SPEC §7.1): floors (light-grey 600 mm tiles,
 * Mauno's dark tiles), the walls of the TTK vector plan, the column grid, the
 * glazed unit fronts round the lobby, the atrium's white inner walls with
 * their window bands, the two black lift towers with panoramic cars, the open
 * steel stairs, the bridges, the glazed lean-to, the kiosk, the ceilings with
 * downlights and the passage stair down to Joki. Plan frame B.
 */

const L = LEVEL;
const CUT = L.cut;

export interface InteriorEnv {
  tier: "ultra" | "high" | "low";
}

/** Facade run split at the cut for interior walls that also show above it. */
function addRun(b: Buckets, key: string, pts: V2[], y0: number, y1: number, vRef: number, opts: { lower?: Layer; upper?: Layer; top?: number } = {}) {
  const lo = opts.lower ?? "shell";
  const hi = opts.upper ?? "upper";
  if (y0 < CUT) b.add(lo, key, facadeRun(pts, y0, Math.min(y1, CUT), { vRef, top: opts.top ?? y1 }).geometry);
  if (y1 > CUT) b.add(hi, key, facadeRun(pts, Math.max(y0, CUT), y1, { vRef, top: opts.top ?? y1 }).geometry);
}

/** Open steel stair between two floors: two flights side by side along x, a half-round landing at one end. */
function stairStorey(
  b: Buckets,
  s: { x0: number; x1: number; z0: number; z1: number },
  landingAtLowX: boolean,
  y0: number,
  y1: number,
  layer: Layer,
) {
  const zMid = (s.z0 + s.z1) / 2;
  const r = (s.z1 - s.z0) / 2;
  // Flights run between the straight part's ends; the half-round landing is beyond `xl`.
  const xl = landingAtLowX ? s.x0 + r : s.x1 - r;
  const xe = landingAtLowX ? s.x1 : s.x0;
  const rise = y1 - y0;
  const n = Math.max(8, Math.round(rise / 2 / 0.172));
  const yMid = y0 + rise / 2;
  const treads: THREE.BufferGeometry[] = [];
  const steel: THREE.BufferGeometry[] = [];
  const glass: THREE.BufferGeometry[] = [];
  const flight = (zA: number, zB: number, fromX: number, toX: number, yA: number, yB: number) => {
    const going = (toX - fromX) / n;
    for (let i = 0; i < n; i++) {
      const xa = fromX + going * i;
      const xb = xa + going;
      const y = yA + ((yB - yA) * (i + 1)) / n;
      treads.push(box(Math.min(xa, xb), y - 0.04, zA + 0.04, Math.max(xa, xb), y, zB - 0.04));
    }
    // Stringers (sloped steel plates) on both sides.
    for (const z of [zA + 0.02, zB - 0.02]) {
      steel.push(bar({ x: fromX, y: yA - 0.12, z }, { x: toX, y: yB - 0.12, z }, 0.28, 0.03));
    }
    // Glass balustrade on the outer side, steel handrail.
    const zo = zA < zMid ? zA : zB;
    const a: V2 = [fromX, zo];
    const c: V2 = [toX, zo];
    const pa = new THREE.Vector3(fromX, yA + 1.0, zo);
    const pc = new THREE.Vector3(toX, yB + 1.0, zo);
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([a[0], yA + 0.05, a[1], c[0], yB + 0.05, c[1], c[0], yB + 0.95, c[1], a[0], yA + 0.95, a[1]], 3),
    );
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, Math.abs(toX - fromX), 0, Math.abs(toX - fromX), 0.9, 0, 0.9], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    glass.push(g);
    steel.push(rod(pa, pc, 0.025, 8));
  };
  // Flight 1 (z0 side) from the far end to the landing, flight 2 back on the z1 side.
  flight(s.z0, zMid - 0.06, xe, xl, y0, yMid);
  flight(zMid + 0.06, s.z1, xl, xe, yMid, y1);
  // Half-round landing.
  const seg = 16;
  const shape = new THREE.Shape();
  const dir = landingAtLowX ? -1 : 1;
  shape.moveTo(xl, -s.z0);
  for (let i = 0; i <= seg; i++) {
    const a = (Math.PI * i) / seg;
    shape.lineTo(xl + dir * Math.sin(a) * r, -(zMid - Math.cos(a) * r));
  }
  shape.lineTo(xl, -s.z1);
  const land = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false, curveSegments: 4 });
  land.rotateX(-Math.PI / 2);
  land.translate(0, yMid - 0.12, 0);
  const uvL = new Float32Array(land.getAttribute("position").count * 2);
  const posL = land.getAttribute("position");
  for (let i = 0; i < posL.count; i++) {
    uvL[i * 2] = posL.getX(i);
    uvL[i * 2 + 1] = -posL.getZ(i);
  }
  land.setAttribute("uv", new THREE.BufferAttribute(uvL, 2));
  treads.push(land);
  // Landing rail (curved): posts and a rail.
  for (let i = 0; i < seg; i += 2) {
    const a0 = (Math.PI * i) / seg;
    const a1 = (Math.PI * (i + 2)) / seg;
    const p0 = new THREE.Vector3(xl + dir * Math.sin(a0) * (r - 0.05), yMid + 1.0, zMid - Math.cos(a0) * (r - 0.05));
    const p1 = new THREE.Vector3(xl + dir * Math.sin(a1) * (r - 0.05), yMid + 1.0, zMid - Math.cos(a1) * (r - 0.05));
    steel.push(rod(p0, p1, 0.025, 6));
    steel.push(rod(new THREE.Vector3(p0.x, yMid, p0.z), p0, 0.015, 6));
  }
  b.add(layer, "stairTread", mergeAll(treads));
  b.add(layer, "steelIn", mergeAll(steel));
  b.add(layer, "glassIn", mergeAll(glass));
}

/** Black braced steel tower with two glazed lift shafts (cars added separately). */
function liftTower(b: Buckets, t: { x0: number; x1: number; z0: number; z1: number }, top: number) {
  const steelLo: THREE.BufferGeometry[] = [];
  const steelHi: THREE.BufferGeometry[] = [];
  const glassLo: THREE.BufferGeometry[] = [];
  const glassHi: THREE.BufferGeometry[] = [];
  const zm = (t.z0 + t.z1) / 2;
  const posts: V2[] = [
    [t.x0, t.z0],
    [t.x1, t.z0],
    [t.x0, t.z1],
    [t.x1, t.z1],
    [t.x0, zm],
    [t.x1, zm],
  ];
  const push = (y0: number, y1: number, g: (a: number, c: number) => THREE.BufferGeometry, lo: THREE.BufferGeometry[], hi: THREE.BufferGeometry[]) => {
    if (y0 < CUT) lo.push(g(y0, Math.min(y1, CUT)));
    if (y1 > CUT) hi.push(g(Math.max(y0, CUT), y1));
  };
  for (const [x, z] of posts) push(L.gf, top, (a, c) => box(x - 0.1, a, z - 0.1, x + 0.1, c, z + 0.1), steelLo, steelHi);
  const levels = [L.gf + 2.6, ...UPPER_FLOORS, top];
  for (const y of levels) {
    const target = y < CUT ? steelLo : steelHi;
    target.push(box(t.x0 - 0.1, y - 0.18, t.z0 - 0.1, t.x1 + 0.1, y, t.z0 + 0.06));
    target.push(box(t.x0 - 0.1, y - 0.18, t.z1 - 0.06, t.x1 + 0.1, y, t.z1 + 0.1));
    target.push(box(t.x0 - 0.1, y - 0.18, t.z0, t.x0 + 0.06, y, t.z1));
    target.push(box(t.x1 - 0.06, y - 0.18, t.z0, t.x1 + 0.1, y, t.z1));
  }
  // X-braces on the long (z) faces between floors.
  for (let i = 1; i + 1 < levels.length; i++) {
    const y0 = levels[i];
    const y1 = levels[i + 1];
    for (const x of [t.x0, t.x1]) {
      for (const [za, zb] of [
        [t.z0, zm],
        [zm, t.z1],
      ]) {
        const target = y0 < CUT ? steelLo : steelHi;
        target.push(bar({ x, y: y0, z: za }, { x, y: y1, z: zb }, 0.06, 0.06));
        target.push(bar({ x, y: y0, z: zb }, { x, y: y1, z: za }, 0.06, 0.06));
      }
    }
  }
  // Glass shaft walls (inside the frame).
  for (const [a, c] of [
    [[t.x0 + 0.05, t.z0 + 0.05], [t.x1 - 0.05, t.z0 + 0.05]],
    [[t.x1 - 0.05, t.z1 - 0.05], [t.x0 + 0.05, t.z1 - 0.05]],
    [[t.x0 + 0.05, t.z1 - 0.05], [t.x0 + 0.05, t.z0 + 0.05]],
    [[t.x1 - 0.05, t.z0 + 0.05], [t.x1 - 0.05, t.z1 - 0.05]],
  ] as [V2, V2][]) {
    push(L.gf + 2.6, top, (y0, y1) => wallQuad(a, c, y0, y1, { doubleSided: true }), glassLo, glassHi);
  }
  b.add("shell", "steelIn", mergeAll(steelLo));
  b.add("upper", "steelIn", mergeAll(steelHi));
  if (glassLo.length) b.add("shell", "glassIn", mergeAll(glassLo));
  b.add("upper", "glassIn", mergeAll(glassHi));
}

/** Panoramic lift car (glass box, steel frame, lit ceiling) with its floor at y. */
function liftCar(b: Buckets, x0: number, x1: number, z0: number, z1: number, y: number) {
  const layer: Layer = y < CUT - 2.4 ? "shell" : "upper";
  const frame: THREE.BufferGeometry[] = [];
  frame.push(box(x0, y - 0.12, z0, x1, y, z1));
  frame.push(box(x0, y + 2.3, z0, x1, y + 2.45, z1));
  for (const [x, z] of [
    [x0, z0],
    [x1, z0],
    [x0, z1],
    [x1, z1],
  ]) frame.push(box(x - 0.04, y, z - 0.04, x + 0.04, y + 2.3, z + 0.04));
  frame.push(box(x0, y + 0.95, z0 - 0.02, x1, y + 1.0, z0 + 0.02), box(x0, y + 0.95, z1 - 0.02, x1, y + 1.0, z1 + 0.02));
  b.add(layer, "liftCar", mergeAll(frame));
  b.add(layer, "panelLight", box(x0 + 0.2, y + 2.28, z0 + 0.2, x1 - 0.2, y + 2.3, z1 - 0.2));
}

export function buildInteriorStructure(b: Buckets, env: InteriorEnv): void {
  const low = env.tier === "low";

  // ── Floors ──
  b.add("shell", "floorLobby", flatPolygon(groundFloorRing(), L.gf));
  for (const ring of MAUNO_FLOORS) b.add("shell", "floorMauno", flatPolygon(ring, L.gf + 0.002));

  // ── Walls of the TTK plan (partitions, cores, shop walls); dark section caps on top for the dollhouse ──
  {
    const sides: THREE.BufferGeometry[] = [];
    const caps: THREE.BufferGeometry[] = [];
    for (const flat of GF_WALLS) {
      const ring: V2[] = [];
      for (let i = 0; i + 1 < flat.length; i += 2) ring.push([flat[i], flat[i + 1]]);
      if (ring.length < 3) continue;
      const wingSide = ring.some(([, z]) => z < -31.7);
      const top = wingSide ? L.wingCeiling : L.sideCeiling;
      sides.push(prism(ring, L.gf - 0.02, top, { top: false }));
      caps.push(flatPolygon(ring, top));
    }
    b.add("shell", "plaster", mergeAll(sides));
    b.add("shell", "wallCap", mergeAll(caps));
  }

  // ── Columns ──
  {
    const sq: THREE.BufferGeometry[] = [];
    for (const z of [COLUMN_ROWS.lobbyNE, COLUMN_ROWS.lobbySW]) {
      for (const x of COLUMN_X) {
        if (x > 30.5) continue;
        sq.push(box(x - 0.19, L.gf, z - 0.19, x + 0.19, L.sideCeiling + 0.02, z + 0.19));
      }
    }
    for (const [x, z] of GALLERY_COLUMNS) sq.push(box(x - 0.19, L.gf, z - 0.19, x + 0.19, z < -31.5 ? L.wingCeiling : L.sideCeiling, z + 0.19));
    const ov: THREE.BufferGeometry[] = [];
    for (const [x, z] of OVAL_COLUMNS) ov.push(ovalColumn(x, z, 0.425, 0.65, L.gf, L.sideCeiling, low ? 12 : 20));
    b.add("shell", "columnBlack", mergeAll(sq), mergeAll(ov));
  }

  // ── Unit fronts round the lobby (interior-mapped shop/office glazing) ──
  for (const f of LOBBY_FRONTS) {
    const pts: V2[] = f.side === "ne" ? [[f.x0, f.z], [f.x1, f.z]] : [[f.x1, f.z], [f.x0, f.z]];
    if (f.kind === "wall") {
      b.add("shell", "plaster", wallQuad(pts[0], pts[1], L.gf, L.sideCeiling));
      continue;
    }
    b.add("shell", f.kind === "office" ? "officeFront" : "shopfrontIn", facadeRun(pts, L.gf - 0.02, L.sideCeiling, { vRef: L.gf, seed: (f.x0 + 40) / 97 }).geometry);
  }

  // ── Atrium inner walls (white, window bands on F2–F7, plain at the technical storey) ──
  {
    const ne: V2[] = [
      [ATRIUM.x0, ATRIUM_NE_Z],
      [ATRIUM.x1, ATRIUM_NE_Z],
    ];
    const sw: V2[] = [
      [ATRIUM.x1, ATRIUM_SW_Z],
      [ATRIUM.x0, ATRIUM_SW_Z],
    ];
    for (const pts of [ne, sw]) {
      addRun(b, "atrium", pts, L.sideCeiling, L.roof, L.gf, { top: L.roof });
      addRun(b, "atriumPlain", pts, L.roof, L.vaultEaves, L.roof);
    }
  }

  // ── Lift towers (black braced steel, panoramic cars) and open stairs ──
  {
    const top = L.f7 + 3.4;
    liftTower(b, ISLANDS.liftsA, top);
    liftTower(b, ISLANDS.liftsB, top);
    const A = ISLANDS.liftsA;
    const Bt = ISLANDS.liftsB;
    const zA = (A.z0 + A.z1) / 2;
    const zB = (Bt.z0 + Bt.z1) / 2;
    liftCar(b, A.x0 + 0.25, A.x1 - 0.25, A.z0 + 0.25, zA - 0.12, L.gf);
    liftCar(b, A.x0 + 0.25, A.x1 - 0.25, zA + 0.12, A.z1 - 0.25, L.f4);
    liftCar(b, Bt.x0 + 0.25, Bt.x1 - 0.25, Bt.z0 + 0.25, zB - 0.12, L.f3);
    liftCar(b, Bt.x0 + 0.25, Bt.x1 - 0.25, zB + 0.12, Bt.z1 - 0.25, L.gf);
    const floors = [L.gf, ...UPPER_FLOORS];
    const storeys = low ? 2 : floors.length - 1;
    for (let i = 0; i < storeys; i++) {
      const layer: Layer = floors[i] < CUT - 0.5 ? "shell" : "upper";
      stairStorey(b, ISLANDS.stairA, true, floors[i], floors[i + 1], layer);
      stairStorey(b, ISLANDS.stairB, false, floors[i], floors[i + 1], layer);
    }
    // Floor landings connecting the stairs to the SW wing on every floor.
    const landings: THREE.BufferGeometry[] = [];
    for (const y of UPPER_FLOORS.slice(0, storeys)) {
      landings.push(box(ISLANDS.stairA.x1 - 0.9, y - 0.25, ISLANDS.stairA.z0 + 0.3, ISLANDS.stairA.x1 + 0.2, y, ATRIUM_SW_Z));
      landings.push(box(ISLANDS.stairB.x0 - 0.2, y - 0.25, ISLANDS.stairB.z0 + 0.3, ISLANDS.stairB.x0 + 0.9, y, ATRIUM_SW_Z));
    }
    b.add("upper", "concreteIn", mergeAll(landings));
  }

  // ── Bridges across the atrium ──
  {
    const slab: THREE.BufferGeometry[] = [];
    const glass: THREE.BufferGeometry[] = [];
    const rail: THREE.BufferGeometry[] = [];
    for (const br of BRIDGES) {
      slab.push(box(br.x0, br.y - 0.3, ATRIUM_NE_Z, br.x1, br.y, ATRIUM_SW_Z));
      for (const x of [br.x0 + 0.03, br.x1 - 0.03]) {
        glass.push(wallQuad([x, ATRIUM_NE_Z], [x, ATRIUM_SW_Z], br.y + 0.05, br.y + 1.05, { doubleSided: true }));
        rail.push(box(x - 0.03, br.y + 1.05, ATRIUM_NE_Z, x + 0.03, br.y + 1.1, ATRIUM_SW_Z));
      }
    }
    b.add("upper", "whiteIn", mergeAll(slab));
    b.add("upper", "glassIn", mergeAll(glass));
    b.add("upper", "stainless", mergeAll(rail));
  }

  // ── Glazed lean-to over the retail front (SW side) ──
  {
    const R = RETAIL_FRONT;
    const yF = 3.0;
    const yB = 4.35;
    b.add("shell", "glassIn", wallQuad([R.x1, R.z], [R.x0, R.z], L.gf, yF));
    const roof = new THREE.BufferGeometry();
    roof.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([R.x0, yF, R.z, R.x1, yF, R.z, R.x1, yB, R.back - 0.05, R.x0, yB, R.back - 0.05], 3),
    );
    roof.setAttribute("uv", new THREE.Float32BufferAttribute([R.x0, 0, R.x1, 0, R.x1, 2.4, R.x0, 2.4], 2));
    roof.setIndex([0, 2, 1, 0, 3, 2]);
    roof.computeVertexNormals();
    b.add("shell", "glassIn", roof);
    const frames: THREE.BufferGeometry[] = [];
    const n = Math.round((R.x1 - R.x0) / 1.25);
    for (let i = 0; i <= n; i++) {
      const x = R.x0 + ((R.x1 - R.x0) * i) / n;
      frames.push(box(x - 0.035, L.gf, R.z - 0.04, x + 0.035, yF, R.z + 0.04));
      frames.push(bar({ x, y: yF, z: R.z }, { x, y: yB, z: R.back - 0.05 }, 0.07, 0.12));
    }
    frames.push(box(R.x0, yF - 0.08, R.z - 0.05, R.x1, yF + 0.05, R.z + 0.05));
    frames.push(box(R.x0, 2.35, R.z - 0.03, R.x1, 2.4, R.z + 0.03));
    frames.push(box(R.x0, L.gf, R.z - 0.05, R.x1, L.gf + 0.08, R.z + 0.05));
    b.add("shell", "whiteIn", mergeAll(frames));
    // The shops behind the lean-to (interior-mapped).
    b.add("shell", "shopfrontIn", facadeRun([[R.x1, R.back], [R.x0, R.back]], L.gf - 0.02, yB, { vRef: L.gf, seed: 0.62 }).geometry);
  }

  // ── Kiosk island ──
  {
    const K = ISLANDS.kiosk;
    b.add("shell", "darkIn", box(K.x0, L.gf, K.z0 + 0.6, K.x1, 2.6, K.z1));
    b.add("shell", "whiteTop", box(K.x0 - 0.05, 1.0, K.z0, K.x1 + 0.05, 1.05, K.z0 + 0.65));
    b.add("shell", "darkIn", box(K.x0, L.gf, K.z0 + 0.05, K.x1, 1.0, K.z0 + 0.6));
    b.add("shell", "panelLight", box(K.x0 + 0.3, 1.95, K.z0 + 0.58, K.x1 - 0.3, 2.45, K.z0 + 0.6));
    b.add("shell", "steelIn", box(K.x0 - 0.05, 2.6, K.z0 - 0.05, K.x1 + 0.05, 2.75, K.z1 + 0.05));
  }

  // ── Ceilings (side bays 3.5 m, one-storey wing 3.95 m) with downlights ──
  {
    for (const c of ceilingRings()) b.add("ceiling", "ceiling", flatPolygon(c.ring, c.y, { down: true }));
    // White fascia band over the lobby's column lines (the soffit edge seen from the build hall).
    b.add("shell", "plaster", box(LOBBY.x0, L.sideCeiling - 0.35, -5.15, LOBBY.x1, L.sideCeiling, -4.95));
    b.add("shell", "plaster", box(LOBBY.x0, L.sideCeiling - 0.35, 5.97, LOBBY.x1, L.sideCeiling, 6.2));
    const discs: THREE.BufferGeometry[] = [];
    const disc = (x: number, z: number, y: number) => {
      const g = new THREE.CircleGeometry(0.1, 12);
      g.rotateX(Math.PI / 2);
      g.translate(x, y - 0.005, z);
      discs.push(g);
    };
    // Aulagalleria: rings of downlights following the curved glass.
    for (const r of [16.4, 18.4]) {
      for (let a = -70; a <= 70; a += r > 17 ? 5 : 6) {
        const p: V2 = [GALLERY.cx + r * Math.sin((a * Math.PI) / 180), GALLERY.cz - r * Math.cos((a * Math.PI) / 180)];
        disc(p[0], p[1], p[1] < -31.6 ? L.wingCeiling : L.sideCeiling);
      }
    }
    // Ring corridors.
    for (let z = -22; z <= -6; z += 2.4) {
      disc(-19.05, z, L.sideCeiling);
      disc(19.25, z, L.sideCeiling);
    }
    // Under the lobby edges (shop fronts).
    for (let x = -28; x <= 28; x += 3) {
      disc(x, -6.2, L.sideCeiling);
      disc(x, 7.2, L.sideCeiling);
    }
    if (discs.length) b.add("ceiling", "downlight", mergeAll(discs));
  }

  // ── Passage to Joki: corridor walls, ceiling, the stair down (10 treads) ──
  {
    const P = JOKI_PASSAGE;
    const walls: THREE.BufferGeometry[] = [];
    // The east wall shared with Joki, seen from BioCity's rooms (Joki models its own face).
    walls.push(wallQuad([P.wallX0, -12.75], [P.wallX0, P.z0], P.bottom, L.sideCeiling));
    walls.push(wallQuad([P.wallX0, P.z1], [P.wallX0, 14.55], P.bottom, L.sideCeiling));
    walls.push(wallQuad([P.threshold, P.z0], [P.wallX0, P.z0], P.bottom, 3.0));
    walls.push(wallQuad([P.wallX0, P.z1], [P.threshold, P.z1], P.bottom, 3.0));
    b.add("shell", "plaster", mergeAll(walls));
    b.add("ceiling", "ceiling", flatPolygon([[P.threshold, P.z0], [P.wallX1, P.z0], [P.wallX1, P.z1], [P.threshold, P.z1]], 3.0, { down: true }));
    const treads: THREE.BufferGeometry[] = [];
    const going = (36.0 - P.stairX0) / P.treads;
    const riser = (L.gf - P.bottom) / (P.treads + 1);
    for (let i = 0; i < P.treads; i++) {
      const x0 = P.stairX0 + going * i;
      const top = L.gf - riser * (i + 1);
      treads.push(box(x0, P.bottom - 0.3, P.z0, x0 + going, top, P.z1));
    }
    treads.push(box(36.0, P.bottom - 0.3, P.z0, P.wallX1 + 0.6, P.bottom, P.z1));
    b.add("shell", "concreteIn", mergeAll(treads));
    // Nosings and handrails.
    const steel: THREE.BufferGeometry[] = [];
    for (let i = 0; i < P.treads; i++) {
      const x0 = P.stairX0 + going * i;
      const top = L.gf - riser * (i + 1);
      steel.push(box(x0 - 0.01, top - 0.01, P.z0 + 0.05, x0 + 0.04, top + 0.005, P.z1 - 0.05));
    }
    for (const z of [P.z0 + 0.06, P.z1 - 0.06]) {
      steel.push(rod(new THREE.Vector3(P.stairX0 - 0.3, L.gf + 0.9, z), new THREE.Vector3(36.0, P.bottom + 0.9, z), 0.022, 8));
    }
    b.add("shell", "stainless", mergeAll(steel));
    // Joki-side jambs of the wall opening.
    b.add("shell", "concreteIn", box(P.wallX0, P.bottom, P.z0 - 0.6, P.wallX1, 3.0, P.z0), box(P.wallX0, P.bottom, P.z1, P.wallX1, 3.0, P.z1 + 0.6));
    b.add("shell", "concreteIn", box(P.wallX0, 2.6, P.z0, P.wallX1, 3.0, P.z1));
  }
}
