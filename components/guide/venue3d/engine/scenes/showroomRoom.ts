import * as THREE from "three";
import { getCompany, SHOWROOM_ORDER, LOGOS_3D } from "@/lib/hackathon-2026";
import { counterGeometry, stoolGeometry, type Materials } from "../furniture";
import { makeLabel } from "../labels";
import { makeCarpetTexture, makeFadeTexture, makeLedWallTexture, makeRadialTexture } from "../textures";
import type { Quality } from "../types";
import { facingOutward, polar } from "../util";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

/**
 * Joki floor 1 — the round Showroom with the Company Lounge behind the stairs.
 * Geometry follows the 2 Oct 2026 Since AI Showroom map and the official plan
 * (tower radius ≈ 9 m, 22.5 × 3 m LED wall). Illustrative, not to scale.
 */
export const SHOWROOM = {
  R: 9,
  H: 4.6,
  X_DIV: 1.35,
  LED_FROM: 202,
  LED_TO: 346,
  LED_Y0: 0.15,
  LED_Y1: 3.15,
  COUNTER_R: 7.25,
  STOOL_R: 6.5,
  ENTRANCE: { west: -1.25, east: 1.35 },
  LOUNGE_CENTER: [5.33, -2.17] as [number, number],
} as const;

export const COUNTER_BEARINGS: Record<string, number> = Object.fromEntries(
  SHOWROOM_ORDER.map((id, i) => [id, 212 + i * 25.2]),
);

/** Curved strip on a circle, facing the centre. Bearings increase left → right from inside. */
export function arcStrip(r: number, fromDeg: number, toDeg: number, y0: number, y1: number, segments = 96) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const b = fromDeg + ((toDeg - fromDeg) * i) / segments;
    const [x, z] = polar(b, r);
    positions.push(x, y0, z, x, y1, z);
    const u = i / segments;
    uvs.push(u, 0, u, 1);
    if (i < segments) {
      const a = i * 2;
      // Winding so the front face looks inward (towards the centre).
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Flat ring segment on the floor (for the LED glow spill). */
function arcFloorBand(rOuter: number, rInner: number, fromDeg: number, toDeg: number, y: number, segments = 96) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const b = fromDeg + ((toDeg - fromDeg) * i) / segments;
    const [xo, zo] = polar(b, rOuter);
    const [xi, zi] = polar(b, rInner);
    positions.push(xo, y, zo, xi, y, zi);
    uvs.push(i / segments, 0, i / segments, 1);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Half-annulus seating tier for the amphitheatre (opens to the south). */
function tierGeometry(rInner: number, rOuter: number, height: number) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, rOuter, 0, Math.PI, false);
  shape.lineTo(-rInner, 0);
  shape.absarc(0, 0, rInner, Math.PI, 0, true);
  shape.lineTo(rOuter, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 32 });
  // Shape is in XY; extrude along +Z → rotate so it lies on the floor and rises along +Y,
  // with the arc on the north (−z) side.
  g.rotateX(-Math.PI / 2);
  return g;
}

export interface ShowroomRoom {
  group: THREE.Group;
  ceiling: THREE.Group;
  pickables: THREE.Object3D[];
  labels: CSS2DObject[];
  ready: Promise<unknown>;
}

export function buildShowroomRoom(
  mats: Materials,
  quality: Quality,
  opts: { wallHeight?: number; ceiling?: boolean; lights?: boolean; labelsY?: number } = {},
): ShowroomRoom {
  const { R, H, X_DIV, LED_FROM, LED_TO, LED_Y0, LED_Y1, COUNTER_R, STOOL_R, ENTRANCE } = SHOWROOM;
  const wallH = opts.wallHeight ?? H;
  const group = new THREE.Group();
  const ceiling = new THREE.Group();
  const pickables: THREE.Object3D[] = [];
  const labels: CSS2DObject[] = [];

  // ── Floor ────────────────────────────────────────────────────────────────
  const carpet = makeCarpetTexture("#6b6b76", 5);
  carpet.repeat.set(5, 5);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(R, 96),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: carpet, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // Lounge floor (east of the dividing wall) in a warmer tone.
  const loungeShape = new THREE.Shape();
  const arcFrom = Math.asin(X_DIV / R);
  loungeShape.moveTo(X_DIV, Math.sqrt(R * R - X_DIV * X_DIV));
  for (let i = 0; i <= 48; i++) {
    const t = Math.PI / 2 - arcFrom - (i / 48) * (Math.PI / 2 - arcFrom - Math.asin(1.33 / R));
    loungeShape.lineTo(R * Math.cos(t), R * Math.sin(t));
  }
  loungeShape.lineTo(8.75, -1.75);
  loungeShape.lineTo(6.08, -1.75);
  loungeShape.lineTo(6.08, -3.67);
  loungeShape.lineTo(X_DIV, -3.67);
  loungeShape.closePath();
  const loungeFloor = new THREE.Mesh(
    new THREE.ShapeGeometry(loungeShape, 32),
    new THREE.MeshStandardMaterial({ color: 0x2c2420, roughness: 0.7 }),
  );
  // Shape Y → world −Z (north up in the shape).
  loungeFloor.rotation.x = -Math.PI / 2;
  loungeFloor.position.y = 0.004;
  group.add(loungeFloor);

  // Entrance ramp floor.
  const ramp = new THREE.Mesh(
    new THREE.PlaneGeometry(ENTRANCE.east - ENTRANCE.west, 4),
    new THREE.MeshStandardMaterial({ color: 0x2a2a2f, roughness: 0.85 }),
  );
  ramp.rotation.x = -Math.PI / 2;
  ramp.position.set((ENTRANCE.east + ENTRANCE.west) / 2, 0.001, R + 1.6);
  group.add(ramp);

  // ── Walls ────────────────────────────────────────────────────────────────
  const zEdgeSouth = () => Math.sqrt(R * R - X_DIV * X_DIV);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x17171c, roughness: 0.92 });
  // Outer wall: from just west of the entrance, through west and north, to the lounge's east edge.
  const outer = new THREE.Mesh(arcStrip(R + 0.02, 188, 441.4, 0, wallH, 160), wallMat);
  group.add(outer);
  // Wall cap so the room outline reads in top views (single-sided walls vanish from outside).
  const cap = new THREE.Mesh(
    arcFloorBand(R + 0.32, R, 188, 441.4, wallH, 160),
    new THREE.MeshStandardMaterial({ color: 0x34343c, roughness: 0.9, side: THREE.DoubleSide }),
  );
  group.add(cap);

  const concrete = new THREE.MeshStandardMaterial({ color: 0x55555b, roughness: 0.95 });
  // Dividing wall with two doors.
  const zEdge = Math.sqrt(R * R - X_DIV * X_DIV);
  const divider: [number, number][] = [
    [-zEdge, -7.3],
    [-6.2, 1.8],
    [2.9, zEdge],
  ];
  for (const [z0, z1] of divider) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.22, wallH, z1 - z0), wallMat);
    seg.position.set(X_DIV + 0.11, wallH / 2, (z0 + z1) / 2);
    group.add(seg);
  }
  // Lounge east + south boundary (world coordinates, from the Showroom map).
  const loungeWalls: [number, number, number, number][] = [
    [8.75, -1.33, 8.75, 1.75],
    [8.75, 1.75, 6.08, 1.75],
    [6.08, 1.75, 6.08, 3.67],
  ];
  for (const [x0, z0, x1, z1] of loungeWalls) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.2, wallH, len), wallMat);
    seg.position.set((x0 + x1) / 2, wallH / 2, (z0 + z1) / 2);
    seg.rotation.y = Math.atan2(x1 - x0, z1 - z0);
    group.add(seg);
  }
  // Back-of-house block (south-east quarter of the tower) — not an event space.
  const boh = new THREE.Shape();
  boh.moveTo(X_DIV, -zEdgeSouth());
  boh.lineTo(X_DIV, -3.67);
  boh.lineTo(6.08, -3.67);
  boh.lineTo(6.08, -1.75);
  boh.lineTo(8.75, -1.75);
  for (let i = 0; i <= 32; i++) {
    const b = 101.3 + ((171.4 - 101.3) * i) / 32;
    const rad = THREE.MathUtils.degToRad(b);
    boh.lineTo(R * Math.sin(rad), R * Math.cos(rad));
  }
  boh.closePath();
  const bohGeo = new THREE.ExtrudeGeometry(boh, {
    depth: Math.min(wallH, 1.2),
    bevelEnabled: false,
    curveSegments: 24,
  });
  bohGeo.rotateX(-Math.PI / 2);
  group.add(new THREE.Mesh(bohGeo, new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 1 })));
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(6.08 - X_DIV, wallH, 0.2), wallMat);
  southWall.position.set((6.08 + X_DIV) / 2, wallH / 2, 3.67);
  group.add(southWall);
  const lift = new THREE.Mesh(new THREE.BoxGeometry(2.0, wallH, 1.9), concrete);
  lift.position.set(2.45, wallH / 2, 4.7);
  group.add(lift);

  // Entrance corridor walls; the west one ends in the concrete column seen in the render.
  const corridor = [
    { x: ENTRANCE.west - 0.25, mat: concrete, w: 0.5 },
    { x: ENTRANCE.east + 0.11, mat: wallMat, w: 0.22 },
  ];
  for (const c of corridor) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(c.w, wallH, 3.8), c.mat);
    seg.position.set(c.x, wallH / 2, R + 1.75);
    group.add(seg);
  }

  // ── Stairs to floor 2 (rising north, along the dividing wall) ───────────
  const stairs = new THREE.Group();
  const steps = 26;
  const run = 7.6 / steps;
  const rise = H / steps;
  const stepMat = new THREE.MeshStandardMaterial({ color: 0x55555c, roughness: 0.85 });
  for (let i = 0; i < steps; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.7, rise * (i + 1), run), stepMat);
    step.position.set(0.43, (rise * (i + 1)) / 2, 1.58 - run * (i + 0.5));
    stairs.add(step);
  }
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, 1, Math.hypot(H, 7.6)),
    new THREE.MeshStandardMaterial({ color: 0x9aa0ff, transparent: true, opacity: 0.12, roughness: 0.1 }),
  );
  glass.position.set(-0.43, H / 2 + 0.5, 1.58 - 3.8);
  glass.rotation.x = Math.atan2(H, 7.6);
  stairs.add(glass);
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, Math.hypot(H, 7.6), 8), mats.metal);
  rail.position.set(-0.43, H / 2 + 1.0, 1.58 - 3.8);
  rail.rotation.x = Math.atan2(H, 7.6) - Math.PI / 2;
  stairs.add(rail);
  if (wallH >= H - 0.01) group.add(stairs);
  else {
    // Cutaway: only the first flight, so the stair reads without blocking the view.
    stairs.scale.y = wallH / H;
    group.add(stairs);
  }

  // ── LED wall ─────────────────────────────────────────────────────────────
  const span = LED_TO - LED_FROM;
  const led = makeLedWallTexture({
    logos: SHOWROOM_ORDER.map((id) => ({
      u: (COUNTER_BEARINGS[id] - LED_FROM) / span,
      src: LOGOS_3D[id],
      text: getCompany(id)?.name,
    })),
    marks: [224.6, 275, 325.4].map((b) => (b - LED_FROM) / span),
    markSrc: "/assets/guide/3d/logos/since-ai.png",
    logoCenterV: 1 - (1.95 - LED_Y0) / (LED_Y1 - LED_Y0),
    logoMaxW: 2.3 / 22.5,
    logoMaxH: 0.95 / 3,
    markV: 1 - (2.88 - LED_Y0) / (LED_Y1 - LED_Y0),
  });
  const ledWall = new THREE.Mesh(
    arcStrip(R - 0.05, LED_FROM, LED_TO, LED_Y0, LED_Y1, 128),
    new THREE.MeshBasicMaterial({ map: led.texture, color: new THREE.Color(1.0, 1.0, 1.08) }),
  );
  group.add(ledWall);
  // Frame lines along the top and bottom of the screen.
  for (const y of [LED_Y0 - 0.015, LED_Y1 + 0.015]) {
    group.add(new THREE.Mesh(arcStrip(R - 0.06, LED_FROM, LED_TO, y - 0.012, y + 0.012, 96), mats.black));
  }

  // Violet light line at the base of the wall + glow spilling onto the carpet.
  group.add(new THREE.Mesh(arcStrip(R - 0.1, 190, 440, 0.01, 0.05, 160), mats.violet));
  const spill = new THREE.Mesh(
    arcFloorBand(R - 0.1, R - 1.6, 190, 360, 0.006, 128),
    new THREE.MeshBasicMaterial({
      map: makeFadeTexture("rgba(130,96,255,0.9)"),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
    }),
  );
  group.add(spill);

  // ── Counters + stools ────────────────────────────────────────────────────
  const { body, top } = counterGeometry();
  const stool = stoolGeometry();
  const pool = makeRadialTexture("rgba(255,214,170,0.55)", "rgba(255,214,170,0)");
  const shadow = makeRadialTexture("rgba(0,0,0,0.75)", "rgba(0,0,0,0)");
  const poolMat = new THREE.MeshBasicMaterial({
    map: pool,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: quality === "high" ? 0.35 : 0.6,
  });
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadow, transparent: true, depthWrite: false });

  for (const id of SHOWROOM_ORDER) {
    const b = COUNTER_BEARINGS[id];
    const station = new THREE.Group();
    station.userData.pickId = id;

    const [cx, cz] = polar(b, COUNTER_R);
    const counter = new THREE.Mesh(body, mats.black);
    const counterTop = new THREE.Mesh(top, mats.blackTop);
    for (const m of [counter, counterTop]) {
      m.position.set(cx, 0, cz);
      m.rotation.y = facingOutward(b);
      station.add(m);
    }
    const cShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), shadowMat);
    cShadow.rotation.x = -Math.PI / 2;
    cShadow.rotation.z = facingOutward(b);
    cShadow.position.set(cx, 0.008, cz);
    station.add(cShadow);

    for (const offset of [-0.4, 0.4]) {
      const [sx, sz] = polar(b + (offset / STOOL_R) * (180 / Math.PI), STOOL_R);
      const st = new THREE.Mesh(stool, mats.metal);
      st.position.set(sx, 0, sz);
      st.rotation.y = facingOutward(b);
      station.add(st);
    }

    const [px, pz] = polar(b, COUNTER_R - 0.6);
    const lightPool = new THREE.Mesh(new THREE.CircleGeometry(1.5, 32), poolMat);
    lightPool.rotation.x = -Math.PI / 2;
    lightPool.position.set(px, 0.01, pz);
    station.add(lightPool);

    group.add(station);
    pickables.push(station);

    labels.push(makeLabel(getCompany(id)?.name ?? id, "company", cx, opts.labelsY ?? 1.42, cz));

    if (opts.lights !== false && quality === "high") {
      const [lx, lz] = polar(b, COUNTER_R - 0.9);
      const spot = new THREE.SpotLight(0xffd6ae, 80, 10, 0.42, 0.7, 2);
      spot.position.set(lx, H - 0.25, lz);
      spot.target.position.set(cx, 1.05, cz);
      group.add(spot, spot.target);
    }

    // Ceiling fixture above each counter.
    const [fx, fz] = polar(b, COUNTER_R - 0.9);
    const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 12), mats.metal);
    fixture.position.set(fx, H - 0.35, fz);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.055, 16), mats.warmLamp);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(fx, H - 0.451, fz);
    ceiling.add(fixture, lens);
  }

  // ── Company Lounge (amphitheatre) ───────────────────────────────────────
  const lounge = new THREE.Group();
  lounge.userData.pickId = "lounge";
  const [lcx, lcz] = SHOWROOM.LOUNGE_CENTER;
  const tierMat = new THREE.MeshStandardMaterial({ color: 0x3a3036, roughness: 0.8 });
  const cushionMat = new THREE.MeshStandardMaterial({ color: 0x4a2f5e, roughness: 0.9 });
  [
    [1.15, 1.7, 0.22],
    [1.7, 2.25, 0.44],
    [2.25, 2.8, 0.66],
  ].forEach(([ri, ro, h], i) => {
    const tier = new THREE.Mesh(tierGeometry(ri, ro, h), i % 2 ? cushionMat : tierMat);
    tier.position.set(lcx, 0, lcz);
    lounge.add(tier);
  });
  group.add(lounge);
  pickables.push(lounge);
  labels.push(makeLabel("Company Lounge", "area", lcx, 1.3, lcz - 1.6));

  // ── Ceiling + structure (hidden when looking from above) ────────────────
  if (opts.ceiling !== false) {
    const ceil = new THREE.Mesh(
      new THREE.CircleGeometry(R + 0.2, 96),
      new THREE.MeshStandardMaterial({ color: 0x08080b, roughness: 1 }),
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = H;
    ceiling.add(ceil);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x101014, roughness: 0.7, metalness: 0.3 });
    for (let v = -8; v <= 8; v += 2) {
      const len = 2 * Math.sqrt(R * R - v * v);
      const bx = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.08), beamMat);
      bx.position.set(0, H - 0.3, v);
      const bz = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, len), beamMat);
      bz.position.set(v, H - 0.3, 0);
      ceiling.add(bx, bz);
    }
    for (const z of [-4.5, 0.5, 4.5]) {
      const duct = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 2 * Math.sqrt(R * R - z * z) - 0.6, 16),
        beamMat,
      );
      duct.rotation.z = Math.PI / 2;
      duct.position.set(0, H - 0.65, z);
      ceiling.add(duct);
    }
  }
  group.add(ceiling);

  // ── Lighting (physical units: candela) ─────────────────────────────────
  if (opts.lights !== false) {
    for (const b of [212, 246, 276, 306, 336]) {
      const [x, z] = polar(b, R - 0.55);
      const p = new THREE.PointLight(0x7a5cff, quality === "high" ? 8 : 11, 5, 2);
      p.position.set(x, 0.45, z);
      group.add(p);
    }
    // Soft overhead wash so the carpet reads; aimed down so the ceiling stays dark.
    for (const [x, z] of [
      [-3.5, 0],
      [-1, -4.5],
      [-1, 4.5],
    ]) {
      if (quality === "high") {
        const wash = new THREE.SpotLight(0xffe7cf, 60, 12, 1.05, 1, 2);
        wash.position.set(x, H - 0.4, z);
        wash.target.position.set(x, 0, z);
        group.add(wash, wash.target);
      } else {
        const wash = new THREE.PointLight(0xffe7cf, 20, 9, 2);
        wash.position.set(x, 2.4, z);
        group.add(wash);
      }
    }
    const stairLight = new THREE.PointLight(0xd8d4ff, 18, 7, 2);
    stairLight.position.set(-0.8, 3.4, -2.5);
    group.add(stairLight);
    const loungeLight = new THREE.PointLight(0xffc89a, 45, 10, 2);
    loungeLight.position.set(lcx, 3.4, lcz);
    group.add(loungeLight);
  }

  return { group, ceiling, pickables, labels, ready: led.ready };
}
