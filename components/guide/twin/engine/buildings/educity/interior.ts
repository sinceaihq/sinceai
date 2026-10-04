import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { LightingState, TwinContext, V2 } from "../../types";
import { CHALLENGE_COMPANIES, briefingRoomLabel } from "@/lib/hackathon-2026/companies";
import { LOGOS_3D } from "@/lib/hackathon-2026/venue3d";
import { makeLabel } from "../../labels";
import { LUMINANCE } from "../../sky/sky";
import { EVENT_VIOLET, makeBannerTexture } from "../../render/canvas";
import { mulberry32 } from "../../util";
import { ATRIUM_ROOF, BLOCK, PAVILION, TAIDON, eToLocal3, inRect, rect, type Rect } from "./frame";
import type { Kit } from "./kit";
import { Bucket, box, cylinder, orientedBox, quadN, rectSlab, ring, slab, type Vec3 } from "./geom";
import { BRIEFING_ROOMS, POINTS, type BriefingRoom } from "./rooms";
import { F1, F2, IN, VOID_F2, type FloorPlan, type WallSpec } from "./plan";
import type { DoorSignSpec, SignAtlas, AtlasRect } from "./signs";
import { makeStageScreen } from "./signs";
import {
  Furnisher,
  barStool,
  cafeChair,
  classroomChair,
  darkTable,
  donutSofa,
  highTable,
  pouf,
  roundTable,
  rollupStand,
  whiteboard,
  type PartKey,
} from "./furniture";
import {
  emission,
  interior,
  interiorLight,
  interiorVariant,
  makeCarpetMaterial,
  makeClearGlass,
  makeEmissiveVC,
  type InteriorLightUniforms,
} from "./materials";
import { buildAtrium } from "./atrium";
import { buildTaidon } from "./taidon";
import { edInteriorLevel } from "./lighting";

/**
 * EduCity floors 1–2 (SPEC §7.4): walls, glass boxes, cores, floors and
 * ceilings from the event maps (plan.ts), the 15 briefing rooms furnished as
 * classrooms with the company's logo on the door sign, the front screen and a
 * roll-up; the lobby (team formation area, registration), Taidon portaat with
 * the opening-ceremony stage, Ravintola Kisälli, the entrance pavilion with
 * its slatted skylight funnels, floor 2's open work café with the Kaivo drum,
 * and the multi-storey atrium above.
 */

export interface InteriorResult {
  /** Emissive interior materials and their designed intensities (rescaled while open). */
  emissives: { material: THREE.MeshStandardMaterial; base: number }[];
  labels: CSS2DObject[];
  pickables: THREE.Object3D[];
  ready: Promise<unknown>;
  setLighting(s: LightingState): void;
  /** Show the pick boxes of a level (only while it is open). */
  setPickLevel(level: "f1" | "f2" | null): void;
  dispose(): void;
}

/** Door-sign specs for the 15 briefing rooms (atlas keys = room target ids). */
export function doorSigns(): DoorSignSpec[] {
  return CHALLENGE_COMPANIES.map((c) => ({
    key: `room-${c.id}`,
    logo: LOGOS_3D[c.id],
    name: c.name,
    room: c.briefing.room,
    roomName: c.briefing.roomName,
  }));
}

/** Briefing room of a company (by room number, "2006 / 2007" included). */
export function roomOf(roomNumber: string): BriefingRoom | undefined {
  return BRIEFING_ROOMS.find((r) => r.number === roomNumber);
}

const WALL_T = { plaster: 0.12, movable: 0.1, glass: 0.06, core: 0.22 } as const;

interface Buckets {
  wall: Bucket;
  frame: Bucket;
  glass: Bucket;
  concrete: Bucket;
  floor: Bucket;
  carpet: Bucket;
  roomCarpet: Bucket;
  ceil: Bucket;
  slats: Bucket;
  signs: Bucket;
  screens: Bucket;
  fabric: Bucket;
  led: Bucket;
}

export function buildInterior(
  kit: Kit,
  ctx: TwinContext,
  opts: {
    atlas: SignAtlas;
    doors: DoorSignSpec[];
    uberInt: THREE.Material;
    ceiling: THREE.Material;
    slats: THREE.Material;
    winGlass: THREE.Material;
    /** Shared interior light uniforms (sun scale, environment tint × intensity). */
    light: InteriorLightUniforms;
  },
): InteriorResult {
  const lib = ctx.materials;
  const low = ctx.tier === "low";
  const rnd = mulberry32(2026_11_06);

  // ── Materials (owned; the shared ones come from the module) ──
  const uber = opts.uberInt;
  const floorMat = interiorVariant(ctx, "concreteFloor", { color: "#b9b9bb", roughness: 0.55 });
  const carpetMat = makeCarpetMaterial(ctx);
  const roomCarpetMat = interiorVariant(ctx, "carpetGrey", { color: "#6c7076" });
  const ceilMat = opts.ceiling;
  const slatMat = opts.slats;
  const glassMat = interior(makeClearGlass(lib, 0.1, "#10161a"), ctx, 1);
  // Upholstery: the vertex colour is the fabric colour (poufs, cushions, sofas, niches).
  const fabricVc = interiorVariant(ctx, "fabricDark", { color: "#ffffff" });
  fabricVc.vertexColors = true;
  const signMat = new THREE.MeshStandardMaterial({ map: opts.atlas.texture, roughness: 0.4, emissive: "#ffffff", emissiveMap: opts.atlas.texture, emissiveIntensity: 0.0 });
  signMat.name = "educity:door-signs";
  interior(signMat, ctx, 0.6);
  const screenMat = new THREE.MeshStandardMaterial({ color: "#000000", map: null, roughness: 0.25, emissive: "#ffffff", emissiveMap: opts.atlas.texture, emissiveIntensity: LUMINANCE.ledWall * 0.22 });
  screenMat.name = "educity:screens";
  // Every small light of the floors (violet event LEDs, step lights, coves) in one emissive (aEdEm).
  const ledMat = makeEmissiveVC();
  const stage = makeStageScreen(low ? 0.5 : 1);
  // Registration roll-up print (event dressing: Since AI violet, the white mark, mono lettering).
  const rollPrint = makeBannerTexture({ title: "Registration", caption: "Since AI Hackathon 2026", width: low ? 256 : 512, height: low ? 602 : 1204, seed: 47 });
  const rollMat = interior(new THREE.MeshStandardMaterial({ map: rollPrint.texture, roughness: 0.75 }), ctx, 1);
  rollMat.name = "educity:rollup-print";
  const stageScreenMat = new THREE.MeshStandardMaterial({ color: "#000000", roughness: 0.3, emissive: "#ffffff", emissiveMap: stage.texture, emissiveIntensity: LUMINANCE.ledWall * 0.6 });
  stageScreenMat.name = "educity:stage-screen";
  const birchMat = interiorVariant(ctx, "birch", { color: "#d9c7a5", roughness: 0.6 });
  const furn: Partial<Record<PartKey, THREE.Material>> = { birch: birchMat, fabric: fabricVc };
  for (const m of [floorMat, carpetMat, roomCarpetMat, glassMat, fabricVc, signMat, screenMat, ledMat, stageScreenMat, rollMat, birchMat]) {
    kit.materials.add(m);
  }
  for (const m of new Set<THREE.Material>([floorMat, carpetMat, roomCarpetMat, glassMat, fabricVc, signMat, rollMat, birchMat])) {
    interiorLight(m, opts.light);
  }

  const uberX = { color: 3, aEdRM: 2 } as const;
  const bucketsFor = (group: string, ceilGroup: string): Buckets => ({
    // Partitions and columns cast: the sun that comes in through a window stops at the next wall.
    wall: kit.bucket("walls", uber, { group, extra: uberX, castShadow: true }).paint("#e9e8e4", 0.85),
    frame: kit.bucket("frames", uber, { group, extra: uberX }).paint("#18191b", 0.45, 0.3),
    concrete: kit.bucket("concrete", uber, { group, extra: uberX, castShadow: true }).paint("#c3c5c0", 0.88),
    glass: kit.bucket("glass", glassMat, { group, renderOrder: 1, receiveShadow: false }),
    floor: kit.bucket("floor", floorMat, { group }),
    carpet: kit.bucket("triangle-floor", carpetMat, { group }),
    roomCarpet: kit.bucket("room-carpet", roomCarpetMat, { group }),
    ceil: kit.bucket("ceiling", ceilMat, { group: ceilGroup }),
    slats: kit.bucket("slats", slatMat, { group }),
    signs: kit.bucket("signs", signMat, { group }),
    screens: kit.bucket("screens", screenMat, { group }),
    fabric: kit.bucket("fabric-vc", fabricVc, { group, extra: { color: 3 } }).color("#3f464e"),
    led: kit.bucket("led", ledMat, { group, extra: { aEdEm: 3 } }).set("aEdEm", emission(EVENT_VIOLET, LUMINANCE.eventLight * 0.25)),
  });
  const b1 = bucketsFor("f1", "f1.ceil");
  const b2 = bucketsFor("f2", "f2.ceil");
  const fur = new Furnisher();

  // ── Floors and ceilings ──
  floors(b1, b2);
  ceilings(b1, b2);

  // ── Walls, blocks, columns ──
  for (const [plan, b] of [
    [F1, b1],
    [F2, b2],
  ] as const) {
    for (const w of plan.walls) buildWall(b, plan, w);
    for (const blk of plan.blocks) buildBlock(b, plan, blk);
    for (const [x, z] of plan.columns) {
      b.concrete.paint("#bfc1bc", 0.9);
      box(b.concrete, x - 0.225, plan.y, z - 0.225, x + 0.225, plan.y + plan.ceiling, z + 0.225);
    }
  }
  // Slab edge round the floor-2 void (seen from floor 1 and from the atrium).
  slabEdges(b2);

  // ── Briefing rooms: furniture, screens, roll-ups, door signs ──
  const pickables: THREE.Object3D[] = [];
  const pickBoxes: { level: "f1" | "f2"; mesh: THREE.Mesh }[] = [];
  const pickMat = new THREE.MeshBasicMaterial({ visible: false });
  kit.materials.add(pickMat);
  const labels: CSS2DObject[] = [];
  for (const c of CHALLENGE_COMPANIES) {
    const room = roomOf(c.briefing.room);
    if (!room) continue;
    const b = room.level === "f1" ? b1 : b2;
    const plan = room.level === "f1" ? F1 : F2;
    const sign = opts.atlas.rect(`room-${c.id}`);
    if (!room.open) furnishRoom(fur, b, room, plan, sign, rnd, low);
    doorSign(b, room, plan, sign);
    // Pick box over the room's floor (visible only while its level is open).
    const bb = bounds(room.polygon);
    const geo = new THREE.BoxGeometry(bb.x1 - bb.x0, 0.2, bb.z1 - bb.z0);
    geo.translate((bb.x0 + bb.x1) / 2, plan.y + 0.1, (bb.z0 + bb.z1) / 2);
    const mesh = new THREE.Mesh(geo, pickMat);
    mesh.name = `educity:pick:room-${c.id}`;
    mesh.userData.pickId = `room-${c.id}`;
    kit.add("picks", mesh);
    pickables.push(mesh);
    pickBoxes.push({ level: room.level, mesh });
    // Label (campus frame).
    const [cx, cz] = centroidOf(room);
    const p = eToLocal3(cx, plan.y + 2.9, cz);
    const label = makeLabel(c.name, "company", p[0], p[1], p[2], room.level === "f1" ? "edu-rooms1" : "edu-rooms2", `Room ${briefingRoomLabel(c)}`);
    label.userData.level = room.level === "f1" ? "educity-1" : "educity-2";
    label.userData.interior = true;
    labels.push(label);
  }

  // ── Floor 1: lobby, registration, team formation, stage, Kisälli, pavilion ──
  teamFormation(fur, b1, rnd);
  registration(fur, b1, kit.bucket("rollup-print", rollMat, { group: "f1" }));
  kisalli(fur, b1, rnd, low);
  pavilionHall(fur, b1, rnd);
  stageArea(b1, stageScreenMat, kit);
  buildTaidon(kit, ctx, { uber, fur, led: b1.led, low });
  // ── Floor 2: open work café with the Kaivo drum, niches ──
  workCafe(fur, b2, rnd, low);
  // ── Atrium above floor 2 ──
  const atrium = buildAtrium(kit, ctx, { uber, glassMat, slatMat, winGlass: opts.winGlass, led: ledMat, low });

  // Area labels (shown in the open dollhouse).
  const area = (text: string, x: number, y: number, z: number, group: string, level: string, detail?: string) => {
    const p = eToLocal3(x, y, z);
    const l = makeLabel(text, "area", p[0], p[1], p[2], group, detail);
    l.userData.level = level;
    l.userData.interior = true;
    labels.push(l);
  };
  area("Registration", POINTS.registration[0], 2.6, POINTS.registration[1], "edu-lobby", "educity-1", "east entrance");
  area("Team formation", POINTS.teamFormation[0] - 4, 2.6, POINTS.teamFormation[1] - 1.5, "edu-lobby", "educity-1");
  area("Taidon portaat", (TAIDON.x0 + TAIDON.x1) / 2, 4.2, 40.0, "edu-lobby", "educity-1", "opening ceremony");
  area("Ravintola Kisälli", 26.0, 2.4, 58.0, "edu-lobby", "educity-1", "snacks");
  area("Company arrival", 44.7, 2.4, 19.0, "edu-rooms1", "educity-1", "door B → room 1002");
  area("Työkahvila · aula", 22.0, 7.4, 21.0, "edu-rooms2", "educity-2");

  // ── Instanced furniture ──
  // Furniture bakes into the level's meshes: plain parts into the interior's vertex-coloured material
  // (one draw call with the walls), birch into a textured one, upholstery into the fabric mesh with
  // each piece's own colour.
  const plain: Partial<Record<PartKey, [string, number, number]>> = {
    frame: ["#17181a", 0.45, 0.5],
    top: ["#2c2b2a", 0.42, 0],
    seat: ["#2f3236", 0.95, 0],
    white: ["#f2f2f0", 0.25, 0],
    metal: ["#9ea3a7", 0.4, 0.8],
  };
  const furnTris = fur.bake((key, group) => {
    if (key === "fabric") return kit.bucket("fabric-vc", fabricVc, { group, extra: { color: 3 } });
    const p = plain[key];
    if (p) return kit.bucket("walls", uber, { group, extra: uberX, castShadow: true }).paint(p[0], p[1], p[2]);
    return kit.bucket(`furn-${key}`, furn[key] ?? birchMat, { group });
  });

  const setPickLevel = (level: "f1" | "f2" | null) => {
    for (const p of pickBoxes) p.mesh.visible = level === p.level;
  };
  setPickLevel(null);

  return {
    emissives: [
      { material: screenMat, base: screenMat.emissiveIntensity },
      { material: ledMat, base: 1 },
      { material: stageScreenMat, base: stageScreenMat.emissiveIntensity },
    ],
    labels,
    pickables,
    ready: Promise.all([stage.ready, rollPrint.ready]).then(() => furnTris + atrium.triangles),
    setLighting(s) {
      const k = edInteriorLevel(s.iso);
      signMat.emissiveIntensity = 0.06 * k;
      atrium.setLighting(s);
    },
    setPickLevel,
    dispose() {
      stage.texture.dispose();
      rollPrint.texture.dispose();
      atrium.dispose();
    },
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function bounds(poly: readonly V2[]): Rect {
  const xs = poly.map((p) => p[0]);
  const zs = poly.map((p) => p[1]);
  return rect(Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs));
}

/** A representative inside point of a room (largest rectangle's centre for L-shapes). */
export function centroidOf(room: BriefingRoom): V2 {
  const r = mainRect(room);
  return [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
}

/** The largest axis-aligned rectangle of a room polygon (rooms are rectangles or Ls). */
export function mainRect(room: BriefingRoom): Rect {
  const bb = bounds(room.polygon);
  if (room.polygon.length === 4) return bb;
  // L-shape: try the candidate rectangles from the polygon's coordinates.
  const xs = [...new Set(room.polygon.map((p) => p[0]))].sort((a, b) => a - b);
  const zs = [...new Set(room.polygon.map((p) => p[1]))].sort((a, b) => a - b);
  let best = bb;
  let bestArea = 0;
  for (let i = 0; i < xs.length; i++)
    for (let j = i + 1; j < xs.length; j++)
      for (let k = 0; k < zs.length; k++)
        for (let l = k + 1; l < zs.length; l++) {
          const r = rect(xs[i], xs[j], zs[k], zs[l]);
          const corners: V2[] = [
            [r.x0 + 0.01, r.z0 + 0.01],
            [r.x1 - 0.01, r.z0 + 0.01],
            [r.x1 - 0.01, r.z1 - 0.01],
            [r.x0 + 0.01, r.z1 - 0.01],
            [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2],
          ];
          if (!corners.every((c) => inPoly(c, room.polygon))) continue;
          const a = (r.x1 - r.x0) * (r.z1 - r.z0);
          if (a > bestArea) {
            bestArea = a;
            best = r;
          }
        }
  return best;
}

function inPoly(p: V2, ring2: readonly V2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring2.length - 1; i < ring2.length; j = i++) {
    const [xi, zi] = ring2[i];
    const [xj, zj] = ring2[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

// ── Floors ──────────────────────────────────────────────────────────────────

/** Rectangles helper: rect → ring (E plan, any orientation; slab() fixes the winding). */
const rr = (r: Rect): V2[] => [
  [r.x0, r.z0],
  [r.x1, r.z0],
  [r.x1, r.z1],
  [r.x0, r.z1],
];

/** A rectangle shrunk by d on every side (keeps slab holes apart; the gaps hide under walls). */
const inset = (r: Rect, d = 0.04): Rect => rect(r.x0 + d, r.x1 - d, r.z0 + d, r.z1 - d);

function floors(b1: Buckets, b2: Buckets): void {
  // Floor 1: polished concrete everywhere, the Bolon triangle floor in the north aula / team
  // formation area, grey carpet in the briefing rooms (the north-east band and the glass box).
  // The concrete slab runs under the walls (outline 0.2 m into the brick) and has holes where the
  // carpets go; holes never touch each other or the outline (earcut needs that).
  const aula = inset(rect(13.2, 39.2, 24.95, 35.2));
  const rooms1 = [inset(rect(IN.x0, 39.4, IN.z0, 8.5)), inset(rect(17.5, 34.1, 10.2, 24.8))];
  const main: V2[] = rr(rect(0.2, BLOCK.w - 0.2, 0.2, BLOCK.d - 0.2));
  slab(b1.floor, main, F1.y, true, [...rooms1.map(rr), rr(aula), rr(inset(rect(TAIDON.x0, TAIDON.x1, 35.2, 44.0)))]);
  for (const r of rooms1) rectSlab(b1.roomCarpet, r.x0, r.x1, r.z0, r.z1, F1.y, true);
  rectSlab(b1.carpet, aula.x0, aula.x1, aula.z0, aula.z1, F1.y, true);
  // Pavilion floor (deck level).
  rectSlab(b1.floor, PAVILION.glassNW, PAVILION.glassSE, BLOCK.d - 0.2, PAVILION.wallSW, F1.y, true);

  // Floor 2: concrete corridors, the triangle floor in the open work café (2072), carpet in the rooms.
  const cafe = inset(rect(14.15, 37.2, 16.8, 35.3));
  const roomRects2 = [
    rect(IN.x0, 42.5, IN.z0, 8.58),
    rect(IN.x0, 7.4, 8.58, 20.7),
    rect(44.2, IN.x1, 8.9, 20.7),
    rect(46.0, IN.x1, 5.4, 8.9),
    rect(34.21, IN.x1, 41.2, 48.7),
    rect(42.6, 46.0, 35.53, 41.2),
    rect(46.0, IN.x1, 36.6, 41.2),
    rect(17.6, 34.93, 48.9, 55.21),
    rect(14.23, 17.6, 45.42, 55.21),
    rect(9.16, 20.74, 56.84, IN.z1),
    rect(24.5, 34.78, 56.84, IN.z1),
  ].map((r) => inset(r));
  // The terrace is outside; the void is open.
  const f2Outline: V2[] = [
    [0.2, 0.2],
    [BLOCK.w - 0.2, 0.2],
    [BLOCK.w - 0.2, 48.7],
    [34.93, 48.7],
    [34.93, BLOCK.d - 0.2],
    [0.2, BLOCK.d - 0.2],
  ];
  const holes = [VOID_F2, rr(cafe), ...roomRects2.map(rr)];
  slab(b2.floor, f2Outline, F2.y, true, holes);
  rectSlab(b2.carpet, cafe.x0, cafe.x1, cafe.z0, cafe.z1, F2.y, true);
  for (const r of roomRects2) rectSlab(b2.roomCarpet, r.x0, r.x1, r.z0, r.z1, F2.y, true);
}

function ceilings(b1: Buckets, b2: Buckets): void {
  // Floor 1 ceiling (3.9): main block + pavilion, open over the stage / Taidon portaat void and
  // round the three skylight funnels of the pavilion.
  const y1 = F1.y + F1.ceiling;
  const voidHole: V2[] = rr(rect(17.75, 34.06, 35.3, 48.87));
  slab(b1.ceil, rr(rect(IN.x0, IN.x1, IN.z0, IN.z1)), y1, false, [voidHole]);
  const funnels = PAVILION_FUNNELS.map(([cx, cz, half]) => rr(rect(cx - half, cx + half, cz - half * FUNNEL_ASPECT, cz + half * FUNNEL_ASPECT)));
  slab(b1.ceil, rr(rect(PAVILION.glassNW, PAVILION.glassSE, BLOCK.d, PAVILION.wallSW)), y1, false, funnels);
  funnelWalls(b1);
  // Floor 2 ceiling (8.2), open over the atrium (split in rects: holes must not touch the outline).
  const y2 = F2.y + F2.ceiling;
  const A = ATRIUM_ROOF;
  slab(b2.ceil, rr(rect(IN.x0, IN.x1, IN.z0, 48.7)), y2, false, [rr(rect(A.x0, A.x1, A.z0, 48.6))]);
  for (const r of [rect(IN.x0, A.x0, 48.7, IN.z1), rect(A.x1, 34.93, 48.7, IN.z1), rect(A.x0, A.x1, A.z1, IN.z1)]) {
    rectSlab(b2.ceil, r.x0, r.x1, r.z0, r.z1, y2, false);
  }
}

/** Plan aspect of the funnel openings (z half-size = x half-size × this). */
const FUNNEL_ASPECT = 0.85;

/** Slatted birch funnels from the pavilion ceiling up to the three skylights (photo 1920x1561). */
function funnelWalls(b1: Buckets): void {
  const yb = F1.y + F1.ceiling;
  const yt = PAVILION.roof;
  const tops: Record<number, number> = { 0: 1.6, 1: 2.2, 2: 1.6 };
  PAVILION_FUNNELS.forEach(([cx, cz, half], i) => {
    const bx = half;
    const bz = half * FUNNEL_ASPECT;
    const t = tops[i];
    const corners = (hx: number, hz: number, y: number): Vec3[] => [
      [cx - hx, y, cz - hz],
      [cx + hx, y, cz - hz],
      [cx + hx, y, cz + hz],
      [cx - hx, y, cz + hz],
    ];
    const lo = corners(bx, bz, yb);
    const hi = corners(t, t, yt);
    for (let k = 0; k < 4; k++) {
      const a = lo[k];
      const c = lo[(k + 1) % 4];
      const d = hi[(k + 1) % 4];
      const e = hi[k];
      // Faces point into the funnel (towards its axis, downwards).
      const mid: Vec3 = [(a[0] + c[0] + d[0] + e[0]) / 4, (a[1] + c[1] + d[1] + e[1]) / 4, (a[2] + c[2] + d[2] + e[2]) / 4];
      const inward: Vec3 = [cx - mid[0], -0.6, cz - mid[2]];
      const l = Math.hypot(inward[0], inward[1], inward[2]) || 1;
      const n: Vec3 = [inward[0] / l, inward[1] / l, inward[2] / l];
      const w = Math.hypot(c[0] - a[0], c[2] - a[2]);
      const slope = Math.hypot(yt - yb, Math.hypot(mid[0] - cx, mid[2] - cz));
      quadN(b1.slats, [a, c, d, e], n, [
        [0, 0],
        [w, 0],
        [w * 0.6, slope],
        [w * 0.4, slope],
      ]);
    }
  });
}

/** Pavilion skylight funnels: centre (x, z) and half the ceiling opening (m). */
export const PAVILION_FUNNELS: [number, number, number][] = [
  [15.0, 74.4, 2.6],
  [25.3, 72.0, 3.3],
  [36.6, 74.4, 2.6],
];

function slabEdges(b2: Buckets): void {
  // The floor-2 slab edge round the void (0.4 m deep) — exposed concrete.
  const y0 = F2.y - 0.42;
  const y1 = F2.y;
  b2.concrete.paint("#cfd1cc", 0.85);
  const v = VOID_F2;
  for (let i = 0; i < v.length; i++) {
    const a = v[i];
    const c = v[(i + 1) % v.length];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (len < 0.05) continue;
    // Faces point into the void (left of a→c for this ring order, checked by quadN with the explicit normal).
    const dx = (c[0] - a[0]) / len;
    const dz = (c[1] - a[1]) / len;
    const n: Vec3 = [dz, 0, -dx];
    const mid: V2 = [(a[0] + c[0]) / 2 + n[0] * 0.5, (a[1] + c[1]) / 2 + n[2] * 0.5];
    const nn: Vec3 = inPoly(mid, VOID_F2) ? n : [-n[0], 0, -n[2]];
    quadN(b2.concrete, [[a[0], y0, a[1]], [c[0], y0, c[1]], [c[0], y1, c[1]], [a[0], y1, a[1]]], nn, [
      [0, y0],
      [len, y0],
      [len, y1],
      [0, y1],
    ]);
  }
  // Underside of the floor-2 slab around the void (visible from Taidon portaat).
  b2.concrete.paint("#d6d6d2", 0.9);
}

// ── Walls ───────────────────────────────────────────────────────────────────

function buildWall(b: Buckets, plan: FloorPlan, w: WallSpec): void {
  const t = w.t ?? WALL_T[w.style];
  const y0 = plan.y;
  const y1 = plan.y + plan.ceiling;
  const alongX = Math.abs(w.b[1] - w.a[1]) < 1e-6;
  const s0 = alongX ? Math.min(w.a[0], w.b[0]) : Math.min(w.a[1], w.b[1]);
  const s1 = alongX ? Math.max(w.a[0], w.b[0]) : Math.max(w.a[1], w.b[1]);
  const c = alongX ? w.a[1] : w.a[0];
  const startS = alongX ? w.a[0] : w.a[1];
  const dir = (alongX ? w.b[0] - w.a[0] : w.b[1] - w.a[1]) >= 0 ? 1 : -1;
  const doors = (w.doors ?? [])
    .map((d) => {
      const mid = startS + dir * d.at;
      return { s0: mid - d.w / 2, s1: mid + d.w / 2, h: d.h };
    })
    .sort((a, b2) => a.s0 - b2.s0);
  const seg = (bk: Bucket, a: number, e: number, ya: number, yb: number, thick = t) => {
    if (e - a < 1e-3 || yb - ya < 1e-3) return;
    if (alongX) box(bk, a, ya, c - thick / 2, e, yb, c + thick / 2);
    else box(bk, c - thick / 2, ya, a, c + thick / 2, yb, e);
  };
  if (w.style === "glass") {
    // Frameless-looking glass with black frames: base rail, head rail, mullions every ~1.35 m.
    let cur = s0;
    for (const d of [...doors, { s0: s1, s1: s1, h: 0 }]) {
      if (d.s0 > cur + 1e-3) {
        glassPane(b, alongX, c, cur, d.s0, y0, y1);
        const n = Math.max(1, Math.round((d.s0 - cur) / 1.35));
        for (let k = 0; k <= n; k++) {
          const s = cur + ((d.s0 - cur) * k) / n;
          seg(b.frame, s - 0.025, s + 0.025, y0, y1, 0.08);
        }
      }
      if (d.s1 > d.s0) {
        // Door: glass leaf ajar is omitted (open door), black frame round the opening; glass above.
        glassPane(b, alongX, c, d.s0, d.s1, y0 + d.h, y1);
        seg(b.frame, d.s0 - 0.04, d.s0, y0, y1, 0.09);
        seg(b.frame, d.s1, d.s1 + 0.04, y0, y1, 0.09);
        seg(b.frame, d.s0, d.s1, y0 + d.h, y0 + d.h + 0.06, 0.09);
      }
      cur = Math.max(cur, d.s1);
    }
    seg(b.frame, s0, s1, y0, y0 + 0.06, 0.08);
    seg(b.frame, s0, s1, y1 - 0.06, y1, 0.08);
    return;
  }
  const bk = w.style === "core" ? b.wall.paint("#dcdcd8", 0.85) : w.style === "movable" ? b.wall.paint("#d3cfc8", 0.8) : b.wall.paint("#e9e8e4", 0.85);
  let cur = s0;
  for (const d of doors) {
    seg(bk, cur, d.s0, y0, y1);
    seg(bk, d.s0, d.s1, y0 + d.h, y1);
    // Door frame (dark grey) and the leaf swung open against the wall.
    b.frame.paint("#3a3b3d", 0.5, 0.2);
    seg(b.frame, d.s0 - 0.05, d.s0, y0, y0 + d.h + 0.05, t + 0.03);
    seg(b.frame, d.s1, d.s1 + 0.05, y0, y0 + d.h + 0.05, t + 0.03);
    seg(b.frame, d.s0, d.s1, y0 + d.h, y0 + d.h + 0.05, t + 0.03);
    cur = d.s1;
  }
  seg(bk, cur, s1, y0, y1);
  if (w.style === "movable") {
    // Operable wall: vertical panel joints every 1.2 m.
    b.frame.paint("#9c978f", 0.7);
    for (let s = s0 + 1.2; s < s1 - 0.3; s += 1.2) seg(b.frame, s - 0.006, s + 0.006, y0, y1, t + 0.01);
  }
  b.wall.paint("#e9e8e4", 0.85);
  b.frame.paint("#18191b", 0.45, 0.3);
}

function glassPane(b: Buckets, alongX: boolean, c: number, s0: number, s1: number, y0: number, y1: number): void {
  if (s1 - s0 < 0.02 || y1 - y0 < 0.02) return;
  for (const side of [1, -1]) {
    const n: Vec3 = alongX ? [0, 0, side] : [side, 0, 0];
    const p: [Vec3, Vec3, Vec3, Vec3] = alongX
      ? [
          [s0, y0, c + side * 0.006],
          [s1, y0, c + side * 0.006],
          [s1, y1, c + side * 0.006],
          [s0, y1, c + side * 0.006],
        ]
      : [
          [c + side * 0.006, y0, s0],
          [c + side * 0.006, y0, s1],
          [c + side * 0.006, y1, s1],
          [c + side * 0.006, y1, s0],
        ];
    quadN(b.glass, p, n, [
      [s0, y0],
      [s1, y0],
      [s1, y1],
      [s0, y1],
    ]);
  }
}

function buildBlock(b: Buckets, plan: FloorPlan, blk: { x0: number; x1: number; z0: number; z1: number; color?: string; doors?: { side: "x0" | "x1" | "z0" | "z1"; at: number }[] }): void {
  const y0 = plan.y;
  const y1 = plan.y + plan.ceiling;
  b.wall.paint(blk.color ?? "#e4e3df", 0.85);
  box(b.wall, blk.x0, y0, blk.z0, blk.x1, y1, blk.z1, { px: true, nx: true, pz: true, nz: true });
  // Flat grey top (visible in the open dollhouse).
  b.wall.paint("#8e8f8c", 0.9);
  rectSlab(b.wall, blk.x0, blk.x1, blk.z0, blk.z1, y1, true);
  // Closed doors on the block faces (light grey leaves with a dark frame).
  for (const d of blk.doors ?? []) {
    const w = 0.95;
    const h = 2.15;
    b.frame.paint("#3a3b3d", 0.5, 0.2);
    if (d.side === "x0" || d.side === "x1") {
      const x = d.side === "x0" ? blk.x0 - 0.02 : blk.x1;
      box(b.frame, x, y0, d.at - w / 2 - 0.05, x + 0.02, y0 + h + 0.05, d.at + w / 2 + 0.05);
      b.wall.paint("#b9b6b0", 0.6);
      box(b.wall, d.side === "x0" ? x - 0.01 : x + 0.02, y0, d.at - w / 2, d.side === "x0" ? x : x + 0.03, y0 + h, d.at + w / 2);
    } else {
      const z = d.side === "z0" ? blk.z0 - 0.02 : blk.z1;
      box(b.frame, d.at - w / 2 - 0.05, y0, z, d.at + w / 2 + 0.05, y0 + h + 0.05, z + 0.02);
      b.wall.paint("#b9b6b0", 0.6);
      box(b.wall, d.at - w / 2, y0, d.side === "z0" ? z - 0.01 : z + 0.02, d.at + w / 2, y0 + h, d.side === "z0" ? z : z + 0.03);
    }
  }
  b.wall.paint("#e9e8e4", 0.85);
}

// ── Briefing rooms ──────────────────────────────────────────────────────────

/** Classroom set-up facing the end of the room away from its door: rows of tables and chairs, screen, roll-up. */
function furnishRoom(fur: Furnisher, b: Buckets, room: BriefingRoom, plan: FloorPlan, sign: AtlasRect, rnd: () => number, low: boolean): void {
  const r = mainRect(room);
  const group = room.level;
  const y = plan.y;
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  const alongX = w >= d;
  // Front = the end of the long axis farther from the door.
  const doorS = alongX ? room.door[0] : room.door[1];
  const lo = alongX ? r.x0 : r.z0;
  const hi = alongX ? r.x1 : r.z1;
  const frontAtHi = Math.abs(doorS - hi) > Math.abs(doorS - lo);
  const frontS = frontAtHi ? hi - 0.15 : lo + 0.15;
  const across0 = alongX ? r.z0 : r.x0;
  const across1 = alongX ? r.z1 : r.x1;
  const span = across1 - across0;
  // Point helper: (s along the long axis, t across) → plan (x, z).
  const P = (s: number, t: number): V2 => (alongX ? [s, t] : [t, s]);
  // Facing: sitters look towards the front.
  const faceSign = frontAtHi ? 1 : -1;
  // rotation.y so that local −z points along +s·faceSign.
  const ryFace = alongX ? (faceSign > 0 ? -Math.PI / 2 : Math.PI / 2) : faceSign > 0 ? Math.PI : 0;
  const ryTable = alongX ? Math.PI / 2 : 0;
  // Rows: first row 2.2 m from the front, every 1.55 m, back row 1.0 m clear of the back wall.
  const tableL = 1.4;
  const tableW = 0.6;
  const usable = span - 1.6;
  const perSide = Math.max(1, Math.floor((usable / 2 - 0.6) / tableL));
  const table = darkTable(tableL, tableW);
  const chair = classroomChair();
  let rowS = frontS - faceSign * 2.4;
  const backLimit = frontAtHi ? lo + 1.0 : hi - 1.0;
  let rows = 0;
  while ((frontAtHi ? rowS > backLimit : rowS < backLimit) && rows < 9) {
    for (const side of [-1, 1]) {
      for (let k = 0; k < perSide; k++) {
        const t = (across0 + across1) / 2 + side * (0.6 + tableL / 2 + k * tableL);
        const [x, z] = P(rowS, t);
        fur.add(group, table, { x, y, z, ry: ryTable });
        for (const off of [-0.35, 0.35]) {
          if (low && off > 0) continue;
          const [cx, cz] = P(rowS - faceSign * 0.55, t + off);
          fur.add(group, chair, { x: cx, y, z: cz, ry: ryFace + (rnd() - 0.5) * 0.12 });
        }
      }
    }
    rowS -= faceSign * 1.55;
    rows++;
  }
  // Front: screen with the company logo on the end wall, a lectern, the roll-up beside it.
  const sw = Math.min(2.2, span * 0.4);
  const sh = sw / sign.aspect;
  const screenS = frontAtHi ? hi - 0.07 : lo + 0.07;
  const [scx, scz] = P(screenS, (across0 + across1) / 2);
  const nScreen: Vec3 = alongX ? [-faceSign, 0, 0] : [0, 0, -faceSign];
  signQuadE(b.screens, [scx, y + 1.55, scz], nScreen, sw, sh, sign);
  b.frame.paint("#111214", 0.3, 0.2);
  const frame = (alongX ? [0.06, sh + 0.08, sw + 0.08] : [sw + 0.08, sh + 0.08, 0.06]) as [number, number, number];
  const [fx, fz] = P(screenS - faceSign * 0.025, (across0 + across1) / 2);
  box(b.frame, fx - frame[0] / 2, y + 1.55 - frame[1] / 2, fz - frame[2] / 2, fx + frame[0] / 2, y + 1.55 + frame[1] / 2, fz + frame[2] / 2);
  // Roll-up with the logo near the front corner.
  const [rx, rz] = P(frontS - faceSign * 0.9, across1 - 0.9);
  rollup(fur, b, group, rx, y, rz, ryFace + Math.PI + 0.35 * faceSign, sign);
  // Lectern.
  const [lx, lz] = P(frontS - faceSign * 1.2, across0 + 1.4);
  b.frame.paint("#1d1e20", 0.5, 0.1);
  box(b.frame, lx - 0.3, y, lz - 0.25, lx + 0.3, y + 1.1, lz + 0.25);
  b.frame.paint("#18191b", 0.45, 0.3);
}

/** A sign quad in the E frame: centre c, facing n (horizontal), width w, height h, atlas rect. */
export function signQuadE(b: Bucket, c: Vec3, n: Vec3, w: number, h: number, r: AtlasRect): void {
  // The viewer looks along −n; their right hand is up × n = (n.z, 0, −n.x).
  const right: Vec3 = [n[2], 0, -n[0]];
  const P = (sx: number, sy: number): Vec3 => [c[0] + right[0] * sx * (w / 2), c[1] + sy * (h / 2), c[2] + right[2] * sx * (w / 2)];
  quadN(b, [P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)], n, [
    [r.u0, r.v0],
    [r.u1, r.v0],
    [r.u1, r.v1],
    [r.u0, r.v1],
  ]);
}

function rollup(fur: Furnisher, b: Buckets, group: string, x: number, y: number, z: number, ry: number, sign: AtlasRect): void {
  fur.add(group, rollupStand(), { x, y, z, ry });
  // Printed panel (front faces −z of the stand → world direction (−sin ry, 0, −cos ry)).
  const n: Vec3 = [-Math.sin(ry), 0, -Math.cos(ry)];
  const c: Vec3 = [x + n[0] * 0.01, y + 1.09, z + n[2] * 0.01];
  // The atlas sign is landscape: show it as the top part of a white panel.
  b.wall.paint("#f0f0ee", 0.6);
  const right: Vec3 = [n[2], 0, -n[0]];
  const P = (sx: number, yy: number): Vec3 => [c[0] + right[0] * sx * 0.42, yy, c[2] + right[2] * sx * 0.42];
  quadN(b.wall, [P(-1, y + 0.09), P(1, y + 0.09), P(1, y + 2.08), P(-1, y + 2.08)], n, [
    [0, 0],
    [1, 0],
    [1, 2],
    [0, 2],
  ]);
  b.wall.paint("#e9e8e4", 0.85);
  signQuadE(b.signs, [c[0] + n[0] * 0.004, y + 1.62, c[2] + n[2] * 0.004], n, 0.8, 0.8 / sign.aspect, sign);
}

/** Door sign beside the room door (corridor side), and on glass rooms a sign on the glass. */
function doorSign(b: Buckets, room: BriefingRoom, plan: FloorPlan, sign: AtlasRect): void {
  const y = plan.y;
  const [dx, dz] = room.door;
  const n: Vec3 = [room.out[0], 0, room.out[1]];
  const t = room.glass ? 0.04 : 0.075;
  // Beside the door: 0.85 m from its centre, along the wall.
  const along: V2 = [Math.abs(n[2]), Math.abs(n[0])];
  const sx = dx + along[0] * 0.95;
  const sz = dz + along[1] * 0.95;
  const w = 0.42;
  const h = w / sign.aspect;
  if (room.open) {
    // Totem sign at the top of Taidon portaat for the open work café (2072).
    b.frame.paint("#141416", 0.45, 0.2);
    box(b.frame, dx - 0.35, y, dz - 0.08, dx + 0.35, y + 1.9, dz + 0.08);
    signQuadE(b.signs, [dx, y + 1.45, dz + 0.085], [0, 0, 1], 0.62, 0.62 / sign.aspect, sign);
    signQuadE(b.signs, [dx, y + 1.45, dz - 0.085], [0, 0, -1], 0.62, 0.62 / sign.aspect, sign);
    b.frame.paint("#18191b", 0.45, 0.3);
    return;
  }
  signQuadE(b.signs, [sx + n[0] * t, y + 1.55, sz + n[2] * t], n, w, h, sign);
  // Also on the door's head: a narrow band with the logo (as the event maps' logo boxes).
  signQuadE(b.signs, [dx + n[0] * (t + 0.005), y + 2.48, dz + n[2] * (t + 0.005)], n, 0.62, 0.62 / sign.aspect, sign);
}

// ── Floor 1 areas ───────────────────────────────────────────────────────────

function teamFormation(fur: Furnisher, b: Buckets, rnd: () => number): void {
  const y = F1.y;
  const z0 = POINTS.teamZone;
  // Six team tables (high tables with stools), mobile whiteboards between them, two donut sofas with poufs.
  const ht = highTable();
  const stool = barStool();
  const wb = whiteboard();
  const tables: V2[] = [
    [20.6, 27.6],
    [26.0, 27.6],
    [31.4, 27.6],
    [20.6, 33.0],
    [31.4, 33.0],
  ];
  for (const [x, z] of tables) {
    fur.add("f1", ht, { x, y, z, ry: 0 });
    for (const [ox, oz] of [
      [-0.55, -0.62],
      [0.55, -0.62],
      [-0.55, 0.62],
      [0.55, 0.62],
    ]) {
      fur.add("f1", stool, { x: x + ox + (rnd() - 0.5) * 0.1, y, z: z + oz + (rnd() - 0.5) * 0.08, ry: rnd() * 6.28 });
    }
  }
  for (const [x, z, ry] of [
    [23.3, 26.2, 0],
    [28.7, 26.2, 0],
    [23.3, 34.2, Math.PI],
    [14.6, 29.0, Math.PI / 2],
    [37.8, 29.0, -Math.PI / 2],
  ] as const) {
    fur.add("f1", wb, { x, y, z, ry });
  }
  const donut = donutSofa(1.45);
  fur.add("f1", donut, { x: 26.0, y, z: 33.0, color: "#3f464e" });
  const pf = pouf();
  const pc = ["#d5b1b2", "#312636", "#2f5a6c", "#d5b1b2", "#2f5a6c"];
  for (let i = 0; i < 5; i++) {
    const a = 0.6 + i * 0.95;
    fur.add("f1", pf, { x: 26.0 + Math.cos(a) * 2.4, y, z: 33.0 + Math.sin(a) * 1.7, color: pc[i] });
  }
  // Event sign: "Team formation" floor totem (violet LED edge).
  b.frame.paint("#141416", 0.45, 0.2);
  box(b.frame, 33.0, y, 25.6, 33.7, y + 2.0, 25.75);
  box(b.led, 33.0, y + 2.0, 25.6, 33.7, y + 2.03, 25.75);
  void z0;
}

function registration(fur: Furnisher, b: Buckets, print: Bucket): void {
  const y = F1.y;
  const [rx, rz] = POINTS.registration;
  // Two 1.8 m desks with black skirts along the walking line (long axis along z), staff behind (west).
  // The event module hangs its printed REGISTRATION sign above them (E 37.4, 55.2, 2.7–3.4 m): keep clear.
  b.frame.paint("#151517", 0.6, 0);
  for (const zc of [rz - 0.95, rz + 0.95]) {
    box(b.frame, rx - 0.4, y, zc - 0.9, rx + 0.4, y + 0.74, zc + 0.9);
  }
  // Violet LED line on the visitors' (east) side of the desks — event dressing.
  box(b.led, rx + 0.4, y + 0.7, rz - 1.85, rx + 0.42, y + 0.74, rz + 1.85);
  const chair = classroomChair();
  for (const zc of [rz - 1.4, rz - 0.45, rz + 0.45, rz + 1.4]) fur.add("f1", chair, { x: rx - 0.85, y, z: zc, ry: -Math.PI / 2 });
  // Two printed roll-ups (REGISTRATION + the Since AI mark, canvas print) flanking the desks.
  const stand = rollupStand();
  for (const [zc, rot] of [
    [rz - 2.6, -Math.PI / 2 - 0.4],
    [rz + 2.6, -Math.PI / 2 + 0.4],
  ] as const) {
    fur.add("f1", stand, { x: rx + 0.2, y, z: zc, ry: rot });
    const n: Vec3 = [-Math.sin(rot), 0, -Math.cos(rot)];
    const right: Vec3 = [n[2], 0, -n[0]];
    const c: Vec3 = [rx + 0.2 + n[0] * 0.012, 0, zc + n[2] * 0.012];
    const P = (sx: number, yy: number): Vec3 => [c[0] + right[0] * sx * 0.42, yy, c[2] + right[2] * sx * 0.42];
    quadN(print, [P(-1, y + 0.09), P(1, y + 0.09), P(1, y + 2.08), P(-1, y + 2.08)], n, [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
    // Plain grey back of the print.
    b.wall.paint("#8d9095", 0.8);
    const back: Vec3 = [-n[0], 0, -n[2]];
    quadN(b.wall, [P(-1, y + 0.09), P(1, y + 0.09), P(1, y + 2.08), P(-1, y + 2.08)], back, [
      [0, 0],
      [0.84, 0],
      [0.84, 2],
      [0, 2],
    ]);
  }
  b.wall.paint("#e9e8e4", 0.85);
  b.frame.paint("#18191b", 0.45, 0.3);
}

function kisalli(fur: Furnisher, b: Buckets, rnd: () => number, low: boolean): void {
  const y = F1.y;
  const K = POINTS.kisalli;
  // Serving counter along the kitchen wall (snacks on Friday).
  b.frame.paint("#2a2b2d", 0.4, 0.1);
  box(b.frame, 11.4, y, 47.8, 12.2, y + 0.92, 58.6);
  b.wall.paint("#c9c8c4", 0.3, 0.6);
  box(b.wall, 11.35, y + 0.92, 47.75, 12.3, y + 0.96, 58.65);
  box(b.wall, 11.2, y + 1.25, 48.2, 11.25, y + 1.6, 58.2);
  b.wall.paint("#e9e8e4", 0.85);
  // Dining tables (1.6 × 0.8, dark tops) with café chairs, in rows across the hall.
  const t = darkTable(1.6, 0.8);
  const ch = cafeChair();
  const cols = [17.6, 21.4, 25.2, 29.0, 32.8];
  const rowsZ = [50.6, 53.0, 56.2, 58.6, 61.6, 63.6];
  for (const z of rowsZ) {
    for (const x of cols) {
      if (low && (Math.round(x) + Math.round(z)) % 2 === 0) continue;
      fur.add("f1", t, { x, y, z, ry: 0 });
      for (const sx of [-0.45, 0.45]) {
        fur.add("f1", ch, { x: x + sx, y, z: z - 0.62, ry: Math.PI + (rnd() - 0.5) * 0.2 });
        fur.add("f1", ch, { x: x + sx, y, z: z + 0.62, ry: (rnd() - 0.5) * 0.2 });
      }
    }
  }
  void K;
}

function pavilionHall(fur: Furnisher, b: Buckets, rnd: () => number): void {
  const y = F1.y;
  // Café tables round the hall, the "Krooppi" café counter, two phone booths, lockers.
  const rt = roundTable(0.4, 0.74, "top");
  const ch = cafeChair();
  for (const [x, z] of [
    [20.0, 69.2],
    [23.0, 68.4],
    [27.6, 68.8],
    [30.6, 69.6],
    [41.4, 69.0],
    [17.6, 75.0],
    [32.4, 75.2],
  ] as const) {
    fur.add("f1", rt, { x, y, z });
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + rnd();
      fur.add("f1", ch, { x: x + Math.cos(a) * 0.62, y, z: z + Math.sin(a) * 0.62, ry: -a - Math.PI / 2 });
    }
  }
  // Café counter (birch front, dark top) by the slide.
  b.wall.paint("#cdb894", 0.6);
  box(b.wall, 18.2, y, 77.3, 22.4, y + 1.05, 78.2);
  b.frame.paint("#1d1e20", 0.35, 0.1);
  box(b.frame, 18.15, y + 1.05, 77.25, 22.45, y + 1.09, 78.25);
  // Phone booths (dark felt cabinets with glass doors).
  b.frame.paint("#2e2a33", 0.9);
  for (const x of [39.2, 40.6]) box(b.frame, x - 0.6, y, 64.0 - 1.2, x + 0.6, y + 2.25, 64.0);
  // Stair down to the lower lobby: opening with a glass balustrade.
  b.frame.paint("#18191b", 0.45, 0.3);
  const op = rect(31.0, 38.8, 76.8, 79.6);
  for (const [a, c] of [
    [
      [op.x0, op.z0],
      [op.x1, op.z0],
    ],
    [
      [op.x0, op.z0],
      [op.x0, op.z1],
    ],
  ] as [V2, V2][]) {
    const alongX = Math.abs(c[1] - a[1]) < 1e-6;
    glassPane(b, alongX, alongX ? a[1] : a[0], alongX ? a[0] : a[1], alongX ? c[0] : c[1], y, y + 1.1);
    if (alongX) box(b.frame, a[0], y + 1.07, a[1] - 0.03, c[0], y + 1.12, a[1] + 0.03);
    else box(b.frame, a[0] - 0.03, y + 1.07, a[1], a[0] + 0.03, y + 1.12, c[1]);
  }
  void inRect;
}

function stageArea(b: Buckets, screenMat: THREE.Material, kit: Kit): void {
  const y = F1.y;
  const S = POINTS.stage;
  // Stage riser: black, 0.4 m, with a violet LED line along its front edge.
  b.frame.paint("#121214", 0.7, 0);
  box(b.frame, S.x0, y, S.z0, S.x1, y + 0.4, S.z1);
  box(b.led, S.x0, y + 0.37, S.z0 - 0.015, S.x1, y + 0.4, S.z0);
  // Two steps up at the west end.
  b.frame.paint("#1a1a1c", 0.7, 0);
  box(b.frame, S.x0 - 0.6, y, S.z0 + 0.6, S.x0, y + 0.2, S.z0 + 1.8);
  // Projection screen on a black frame at the back of the stage, facing the audience (north).
  b.frame.paint("#101012", 0.5, 0.2);
  const cx = (S.x0 + S.x1) / 2;
  const zs = S.z1 - 0.35;
  box(b.frame, cx - 2.95, y + 0.4, zs, cx + 2.95, y + 3.75, zs + 0.12);
  const geo = new THREE.PlaneGeometry(5.6, 3.15);
  geo.rotateY(Math.PI);
  geo.translate(cx, y + 2.12, zs - 0.006);
  const screen = new THREE.Mesh(geo, screenMat);
  screen.name = "educity:stage-screen";
  kit.add("f1", screen);
  // Lectern.
  b.frame.paint("#18181a", 0.5, 0.1);
  box(b.frame, S.x1 - 1.6, y + 0.4, S.z0 + 0.6, S.x1 - 1.0, y + 1.5, S.z0 + 1.1);
  // "Sermi": black fabric dividers behind the stage, separating Kisälli.
  const [a, c] = [POINTS.screen.a, POINTS.screen.b];
  const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const n = Math.round(len / 1.2);
  b.frame.paint("#1c1c1f", 0.95, 0);
  for (let k = 0; k < n; k++) {
    const t0 = k / n;
    const t1 = (k + 1) / n;
    const zig = (k % 2) * 0.12;
    const p0: V2 = [a[0] + (c[0] - a[0]) * t0, a[1] + (c[1] - a[1]) * t0 + zig];
    const p1: V2 = [a[0] + (c[0] - a[0]) * t1, a[1] + (c[1] - a[1]) * t1 + 0.12 - zig];
    const mid: V2 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    orientedBox(b.frame, mid[0], y, mid[1], Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), 2.1, 0.04, -ang);
  }
  b.frame.paint("#18191b", 0.45, 0.3);
}

// ── Floor 2: open work café (2072) with the Kaivo drum ─────────────────────

function workCafe(fur: Furnisher, b: Buckets, rnd: () => number, low: boolean): void {
  const y = F2.y;
  const { c, r } = POINTS.kaivo;
  // Kaivo: round drum of vertical birch slats, open top, door facing south-west (towards the stair top).
  const h = 3.1;
  const door0 = Math.PI * 0.42;
  const door1 = Math.PI * 0.62;
  cylinder(b.slats, c[0], c[1], r, y, y + h, 40, { a0: door1, a1: door0 + Math.PI * 2 });
  cylinder(b.slats, c[0], c[1], r - 0.06, y, y + h, 40, { a0: door1, a1: door0 + Math.PI * 2, inward: true });
  ring(b.slats, c[0], c[1], r - 0.06, r, y + h, 40, true, door1, door0 + Math.PI * 2);
  // Pink stepped seating spiralling round the inside.
  const steps = 9;
  for (let k = 0; k < steps; k++) {
    const a0 = door1 + 0.15 + (k / steps) * (Math.PI * 2 - (door1 - door0) - 0.3);
    const a1 = door1 + 0.15 + ((k + 1) / steps) * (Math.PI * 2 - (door1 - door0) - 0.3);
    const top = y + 0.42 + k * 0.26;
    b.fabric.color(k % 2 ? "#d9968d" : "#c97f83");
    cylinder(b.fabric, c[0], c[1], r - 0.07, top - 0.42, top, 4, { a0, a1, inward: true });
    cylinder(b.fabric, c[0], c[1], r - 0.75, y, top, 4, { a0, a1 });
    ring(b.fabric, c[0], c[1], r - 0.75, r - 0.07, top, 4, true, a0, a1);
  }
  b.fabric.color("#3f464e");
  // Café furniture: round tables with café chairs, high tables with stools, a donut sofa with poufs.
  const rt = roundTable(0.55, 0.74, "birch");
  const ch = cafeChair();
  const tables: V2[] = [
    [19.0, 19.5],
    [22.6, 19.5],
    [26.2, 19.8],
    [33.8, 20.2],
    [19.4, 23.4],
    [34.4, 24.4],
    [20.6, 31.8],
    [34.2, 30.4],
  ];
  for (const [x, z] of tables) {
    fur.add("f2", rt, { x, y, z });
    for (let k = 0; k < (low ? 2 : 4); k++) {
      const a = (k / 4) * Math.PI * 2 + rnd() * 0.4;
      fur.add("f2", ch, { x: x + Math.cos(a) * 0.82, y, z: z + Math.sin(a) * 0.82, ry: -a - Math.PI / 2 });
    }
  }
  const ht = highTable();
  const stool = barStool();
  for (const [x, z] of [
    [24.0, 27.5],
    [24.0, 23.2],
  ] as const) {
    fur.add("f2", ht, { x, y, z, ry: Math.PI / 2 });
    for (const oz of [-0.6, 0.0, 0.6]) {
      fur.add("f2", stool, { x: x - 0.62, y, z: z + oz, ry: rnd() * 6 });
      fur.add("f2", stool, { x: x + 0.62, y, z: z + oz, ry: rnd() * 6 });
    }
  }
  fur.add("f2", donutSofa(1.5), { x: 30.6, y, z: 32.0, color: "#3f464e" });
  const pf = pouf();
  const pcol = ["#d5b1b2", "#312636", "#2f5a6c"];
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    fur.add("f2", pf, { x: 30.6 + Math.cos(a) * 2.5, y, z: 32.0 + Math.sin(a) * 2.1, color: pcol[i % 3] });
  }
  // Faceted upholstered niches along the west corridor wall (blue / teal / plum).
  niches(b, y);
  // Pale green lockers in the north corridor.
  b.wall.paint("#bcd7c0", 0.55);
  for (let x = 2.0; x < 6.8; x += 0.6) box(b.wall, x, y, 9.0, x + 0.58, y + 1.9, 9.5);
  b.wall.paint("#e9e8e4", 0.85);
}

/** Faceted niches: little upholstered alcoves with triangular facets (photos 05 / ss_011). */
function niches(b: Buckets, y: number): void {
  const sets: [number, string[]][] = [
    [37.0, ["#1e2f65", "#687eb9", "#2b3f78"]],
    [40.6, ["#15292d", "#3c6168", "#629ead"]],
    [44.2, ["#3f2128", "#70374a", "#d9968d"]],
  ];
  const z0 = 9.1;
  for (const [x, cols] of sets) {
    const w = 3.2;
    const d = 1.2;
    const h = 2.6;
    const pts = (fx: number, fy: number): Vec3 => [x + fx * w, y + fy * h, z0];
    // Back wall in facets (triangles alternating colours), floor seat bench.
    const rows = 3;
    const colsN = 4;
    for (let i = 0; i < colsN; i++) {
      for (let j = 0; j < rows; j++) {
        const a = pts(i / colsN, j / rows);
        const c = pts((i + 1) / colsN, j / rows);
        const e = pts((i + 1) / colsN, (j + 1) / rows);
        const f = pts(i / colsN, (j + 1) / rows);
        const bulge = ((i + j) % 2) * 0.12;
        const mid: Vec3 = [(a[0] + e[0]) / 2, (a[1] + e[1]) / 2, z0 + 0.1 + bulge];
        const tris: [Vec3, Vec3][] = [
          [a, c],
          [c, e],
          [e, f],
          [f, a],
        ];
        tris.forEach(([p, q], k) => {
          b.fabric.color(cols[(i + j + k) % cols.length]);
          const n: Vec3 = [0, 0, 1];
          b.fabric.tri(p, q, mid, n, [p[0], p[1]], [q[0], q[1]], [mid[0], mid[1]]);
          b.fabric.tri(p, mid, q, [0, 0, -1], [p[0], p[1]], [mid[0], mid[1]], [q[0], q[1]]);
        });
      }
    }
    b.fabric.color(cols[0]);
    box(b.fabric, x, y, z0, x + w, y + 0.44, z0 + d * 0.5);
    // Warm LED cove under the bench.
    box(b.led, x + 0.05, y + 0.02, z0 + d * 0.5, x + w - 0.05, y + 0.04, z0 + d * 0.5 + 0.01);
  }
  b.fabric.color("#3f464e");
}

/** Map a part key name to the right side of the union (tests). */
export const INTERIOR_PARTS: PartKey[] = ["frame", "top", "seat", "birch", "white", "fabric", "metal"];
