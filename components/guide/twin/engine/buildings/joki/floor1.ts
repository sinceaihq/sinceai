import * as THREE from "three";
import type { TwinContext, V2, V3 } from "../../types";
import {
  Batcher,
  R,
  Y,
  annulus,
  arcStrip,
  box,
  glow,
  cylinder,
  hash01,
  instanceMatrix,
  merge,
  metreUV,
  pbr,
  place,
  polar,
  prism,
  rod,
  tubePath,
  wallSeg,
} from "./kit";
import type { JokiMaterials } from "./mats";
import { JOKI_LUMINANCE } from "./mats";
import { F1_AULA, F1_COLUMN, F1_TOWER } from "./walls";
import { AULA_FIXTURES, AULA_OUTLINE, type Layout, type Table } from "./layout";
import { chair, downlightDisc, laptop, pouf, projector, softBox, table, wallScreen } from "./furniture";
import { acousticCeiling, bakeLightmap, blackSlats, boardFormed, caveProjection, patchworkCarpet, planUV1, screenContent, type Pool } from "./textures";

/**
 * Joki floor 1 apart from the Showroom (SPEC §7.2): the Aula and the Cave
 * hall as event build areas (33 + 42 tables), the LUISKA ramp, the tower
 * core (stair, lift), the Company Lounge amphitheatre and the fixed Aula
 * furniture — walls extruded from the TTK CAD plan, all in the J frame.
 */

export interface Floor1 {
  group: THREE.Group;
  /** The tower stair floor 1 → 2 (seen from floor 2 down the stairwell too). */
  core: THREE.Group;
  /** Ceilings (hidden in dollhouse views seen from above). */
  ceil: THREE.Group;
  /**
   * The rooms inside the concrete drum (the lounge here, the Showroom added by the module): out of
   * sight from outside — neither the Aula glazing nor the street door looks into the drum.
   */
  drum: THREE.Group;
  /** Lounge (pickable "lounge"), Aula and Cave pick proxies. */
  pickables: THREE.Object3D[];
  ready: Promise<unknown>;
  dispose(): void;
}

/** Ramp polygon (J) and its levels: −1.70 at the foot (z 18.07), −1.10 at the drum (z 8.57). */
export const RAMP: { poly: V2[]; z0: number; z1: number } = {
  poly: [
    [-3.23, 18.07],
    [1.3, 18.07],
    [1.3, 8.57],
    [-1.0, 8.57],
    [-1.0, 10.46],
    [-2.8, 16.5],
  ],
  z0: 18.07,
  z1: 8.57,
};
export const rampY = (z: number) => Y.aula + ((RAMP.z0 - Math.min(RAMP.z0, Math.max(RAMP.z1, z))) / (RAMP.z0 - RAMP.z1)) * (Y.f1 - Y.aula);

/** Lining segments on the Aula side of the wall shared with BioCity (offset 2 cm into the Aula). */
const SHARED_LINING: [V2, V2][] = [
  [
    [-14.48, 37.27],
    [-17.64, 48.02],
  ],
  [
    [-18.54, 51.1],
    [-19.54, 54.5],
  ],
];

/** Cave hall rectangle (J) and its stage (SW end). */
export const CAVE = { x0: 1.59, x1: 14.67, z0: 8.75, z1: 27.07, stageZ: 24.2, stageY: 0.35 };
/** Company Lounge amphitheatre (SPEC §7.2): centre, radii, tier tops below the room floor. */
export const LOUNGE = {
  // CAD centre J (5.15, −2.2); 10 cm east so the rim (r 2.82) clears the shaft wall at x 2.38.
  c: [5.25, -2.2] as V2,
  pit: 1.12,
  rim: [2.62, 2.82] as [number, number],
  tiers: [
    { r0: 2.12, r1: 2.62, drop: 0.25, seat: true },
    { r0: 1.62, r1: 2.12, drop: 0.5, seat: false },
    { r0: 1.12, r1: 1.62, drop: 0.7, seat: true },
  ],
  pitDrop: 0.95,
  /** Aisles centred at J 0° and 180°, 36° wide. */
  aisleHalf: 18,
};

export function buildFloor1(ctx: TwinContext, mats: JokiMaterials, layout: Layout, drumInner: { showroom: THREE.BufferGeometry; lounge: THREE.BufferGeometry }): Floor1 {
  const low = ctx.tier === "low";
  const group = new THREE.Group();
  group.name = "joki-f1";
  const ceil = new THREE.Group();
  ceil.name = "joki-f1-ceilings";
  group.add(ceil);
  const drum = new THREE.Group();
  drum.name = "joki-drum-rooms";
  group.add(drum);
  const core = new THREE.Group();
  core.name = "joki-core-stair";
  const batch = new Batcher();
  const owned: { dispose(): void }[] = [];
  const pickables: THREE.Object3D[] = [];
  const readies: Promise<unknown>[] = [];

  // ── Materials ──
  const board = boardFormed({ px: low ? 512 : 1024, seed: 29 });
  owned.push(board.texture);
  const concrete = mats.get("concreteFacade", "aula", { roughness: 0.95 }, "jk-f1-concrete");
  concrete.map = board.texture;
  concrete.color.set("#ffffff");
  const aulaFloorMat = mats.get("concreteFloor", "aula", { color: "#d3cec6", roughness: 0.42 }, "jk-aula-floor");
  const caveFloorMat = mats.get("concreteFloor", "cave", { color: "#a4a29d", roughness: 0.5 }, "jk-cave-floor");
  // Flat-painted surfaces: one uber material per room (colour, roughness, metalness per vertex).
  const uA = mats.uber("aula");
  const uC = mats.uber("cave");
  const uL = mats.uber("lounge");
  const WHITE = (g: THREE.BufferGeometry) => pbr(g, "#e8e6e1", 0.85, 0);
  const CHARCOAL = (g: THREE.BufferGeometry) => pbr(g, "#2b2c30", 0.92, 0);
  const BLACK = (g: THREE.BufferGeometry) => pbr(g, "#141416", 0.9, 0);
  const BLACK_AULA = (g: THREE.BufferGeometry) => pbr(g, "#17181a", 0.8, 0);
  const STEEL = (g: THREE.BufferGeometry) => pbr(g, "#c9cbcc", 0.35, 1);
  const DARK_STEEL = (g: THREE.BufferGeometry) => pbr(g, "#1d1f22", 0.45, 0.6);
  const slats = blackSlats();
  owned.push(slats.texture);
  const slatMat = mats.plain("slats", "aula", { map: slats.texture, roughness: 0.75 });
  const tiles = acousticCeiling();
  owned.push(tiles.texture);
  const ceilingMat = mats.plain("ceiling", "aula", { map: tiles.texture, roughness: 0.95 });
  const glassIn = mats.glass("aula", { opacity: 0.12 }, "jk-f1-glass");
  const frosted = mats.plain("frosted", "aula", { color: "#d8dcdc", roughness: 0.35, transparent: true, opacity: 0.55, depthWrite: false });
  const screenTex = screenContent({ seed: 12 });
  owned.push(screenTex);
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, color: new THREE.Color(1, 1, 1).multiplyScalar(JOKI_LUMINANCE.screen * 1.6) });
  owned.push(screenMat);
  const birch = mats.get("birch", "lounge", { color: "#d9c9a8", roughness: 0.62 }, "jk-birch");
  // Light warm-grey carpet round the rim (photo: it reads cream under the warm spots).
  const loungeCarpet = patchworkCarpet(["#a49e95", "#9a948b", "#aca69d"], { px: low ? 512 : 1024, seed: 61 });
  owned.push(loungeCarpet.texture);
  const loungeFloorMat = mats.get("carpetGrey", "lounge", {}, "jk-lounge-carpet");
  loungeFloorMat.map = loungeCarpet.texture;
  loungeFloorMat.color.set("#ffffff");
  // Light fittings: one shared glow material, each fitting's HDR colour in its vertices.
  const glowMat = mats.glow("f1");
  const lamp = (g: THREE.BufferGeometry, lum: number, kelvin?: number, color?: string) => glow(g, mats.lampColor(lum, kelvin, color));
  const DL = (g: THREE.BufferGeometry) => lamp(g, JOKI_LUMINANCE.downlight, 3800);

  // ── Walls from the CAD plan ──
  const towerTop = Y.f1Soffit;
  const towerWall = mats.get("concreteFacade", "showroom", { roughness: 0.95 }, "jk-f1-concrete-sr");
  towerWall.map = board.texture;
  towerWall.color.set("#ffffff");
  for (const poly of F1_TOWER) batch.add(group, towerWall, prism(poly, Y.f1, towerTop));
  for (const poly of F1_AULA) {
    // The cloakroom/WC block (east of the Aula) is clad in black slats; structure elsewhere is board-formed.
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
    const cz = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const block = cx > 7.0 && cz > 27.3 && cz < 45;
    batch.add(group, block ? slatMat : concrete, prism(poly, Y.aula, Y.aulaCeil + 0.02));
  }
  // The wall shared with BioCity is BioCity's: we only line its Aula face (1 cm proud), leaving
  // the passage opening (J (−17.66, 48.01)–(−18.56, 51.10)) free.
  for (const [a, b] of SHARED_LINING) batch.add(group, concrete, wallSeg(a, b, 0.02, Y.aula, Y.aulaCeil + 0.02));
  // Columns: white round columns in the Aula (and the pair by the sofa).
  for (const poly of F1_COLUMN) {
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
    const cz = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    const r = Math.max(...poly.map((p) => Math.hypot(p[0] - cx, p[1] - cz)));
    const inTower = cz < 8.6;
    batch.add(group, uA, WHITE(cylinder(Math.max(0.12, r), inTower ? Y.f1 : Y.aula, inTower ? towerTop : Y.aulaCeil, cx, cz, 24)));
  }
  // Drum inner face: the Showroom's and the lounge's walls (each in its room's light).
  batch.add(drum, towerWall, drumInner.showroom.clone());
  const loungeWall = mats.get("concreteFacade", "lounge", { color: "#6e6a63", roughness: 0.95 }, "jk-lounge-wall");
  loungeWall.map = board.texture;
  // Darker than the Aula's piers (photo: the amphitheatre's drum wall reads dark grey under warm spots).
  loungeWall.color.set("#8f8b85");
  batch.add(drum, loungeWall, drumInner.lounge.clone());

  // ── Floors ──
  const aulaRect = { minX: -20, maxX: 7.5, minZ: 18, maxZ: 55 };
  const aulaFloor = prism(AULA_OUTLINE, Y.aula - 0.2, Y.aula, { top: true, sides: false });
  planUV1(aulaFloor, aulaRect);
  const aulaLight = bakeLightmap({
    ...aulaRect,
    base: 0.02,
    scale: 1.2,
    pools: aulaPools(),
    shadows: furnitureShadows(layout.aula),
    px: low ? 256 : 512,
  });
  owned.push(aulaLight);
  aulaFloorMat.lightMap = aulaLight;
  aulaFloorMat.lightMapIntensity = 1.2;
  batch.add(group, aulaFloorMat, aulaFloor, { keep: ["uv1"] });

  const caveRect = { minX: CAVE.x0, maxX: CAVE.x1, minZ: CAVE.z0, maxZ: CAVE.z1 };
  const caveFloor = prism(
    [
      [CAVE.x0, CAVE.z0],
      [CAVE.x1, CAVE.z0],
      [CAVE.x1, CAVE.z1],
      [CAVE.x0, CAVE.z1],
    ],
    Y.aula - 0.2,
    Y.aula,
    { sides: false },
  );
  planUV1(caveFloor, caveRect);
  const caveLight = bakeLightmap({
    ...caveRect,
    base: 0.01,
    scale: 1.0,
    pools: cavePools(layout.cave),
    shadows: furnitureShadows(layout.cave),
    px: low ? 256 : 512,
  });
  owned.push(caveLight);
  caveFloorMat.lightMap = caveLight;
  caveFloorMat.lightMapIntensity = 1.0;
  batch.add(group, caveFloorMat, caveFloor, { keep: ["uv1"] });

  // Ramp (sloped) and the entrance threshold into the drum.
  {
    const g = prism(RAMP.poly, 0, 0.01, { sides: false });
    const pos = g.getAttribute("position");
    for (let i = 0; i < pos.count; i++) pos.setY(i, rampY(pos.getZ(i)));
    g.computeVertexNormals();
    batch.add(group, aulaFloorMat, planUV1(g, aulaRect), { keep: ["uv1"] });
    // Wall-mounted handrail on the Cave side, freestanding rail on the glazing side.
    batch.add(group, uA, [
      STEEL(
        tubePath(
          [
            [1.22, rampY(18.0) + 0.9, 18.0],
            [1.22, rampY(8.7) + 0.9, 8.7],
          ],
          0.02,
        ),
      ),
      STEEL(
        tubePath(
          [
            [-2.65, rampY(16.0) + 0.9, 16.0],
            [-1.1, rampY(10.6) + 0.9, 10.6],
          ],
          0.022,
        ),
      ),
    ]);
    for (const [x, z] of [
      [-2.65, 16.0],
      [-1.9, 13.4],
      [-1.1, 10.6],
    ] as V2[])
      batch.add(group, uA, STEEL(rod([x, rampY(z), z], [x, rampY(z) + 0.9, z], 0.02, 8)));
  }

  // Tower floor 1 (lounge, core, corridors): carpet over the drum outside the Showroom.
  const loungePoly: V2[] = [
    [1.35, 1.59],
    [2.38, 1.59],
    [2.38, -6.01],
    [1.5, -6.01],
    [1.5, -8.5],
    ...arcPoints(8.62, 10, 83.5, 8),
    [8.58, -0.98],
    [8.58, 1.72],
    [6.06, 1.72],
    [6.06, 1.88],
    [8.61, 1.88],
    [8.61, 3.59],
    [1.35, 3.59],
  ];
  const loungeFloorGeo = loungeFloorWithPit(loungePoly);
  batch.add(drum, loungeFloorMat, loungeFloorGeo, { receive: false });

  // ── Ceilings ──
  const aulaCeilPoly = AULA_OUTLINE;
  batch.add(ceil, ceilingMat, prism(aulaCeilPoly, Y.aulaCeil, Y.aulaCeil + 0.02, { top: false, bottom: true, sides: false }));
  batch.add(ceil, ceilingMat, prism(RAMP.poly, Y.aulaCeil, Y.aulaCeil + 0.02, { top: false, bottom: true, sides: false }));
  batch.add(
    ceil,
    uC,
    BLACK(
      prism(
        [
          [CAVE.x0, CAVE.z0],
          [CAVE.x1, CAVE.z0],
          [CAVE.x1, CAVE.z1],
          [CAVE.x0, CAVE.z1],
        ],
        Y.aulaCeil,
        Y.aulaCeil + 0.02,
        { top: false, bottom: true, sides: false },
      ),
    ),
  );
  // Lounge: black ceiling at 3.4 m (the corridor to the Showroom has the Showroom's ceiling).
  batch.add(ceil, uL, BLACK(prism(loungePoly, Y.showroomCeil, Y.showroomCeil + 0.02, { top: false, bottom: true, sides: false })));
  // Downlights (round) on a 2.4 m grid in the Aula and the Cave, linear LED lines along the Aula.
  const disc = downlightDisc(0.08);
  const dl: THREE.BufferGeometry[] = [];
  for (const [x, z] of aulaDownlights()) dl.push(DL(disc.clone().translate(x, Y.aulaCeil - 0.003, z)));
  for (const [x, z] of caveDownlights()) dl.push(DL(disc.clone().translate(x, Y.aulaCeil - 0.003, z)));
  disc.dispose();
  batch.add(ceil, glowMat, dl);
  const lines: THREE.BufferGeometry[] = [];
  const lineAt = (a: V2, b: V2) => {
    const g = wallSeg(a, b, 0.04, Y.aulaCeil - 0.012, Y.aulaCeil - 0.004);
    lines.push(lamp(g, JOKI_LUMINANCE.linearLed, 4000));
  };
  lineAt([-12.6, 47.9], [-6.2, 26.0]);
  lineAt([-6.2, 26.0], [-2.4, 13.0]);
  lineAt([-9.0, 44.0], [6.9, 44.0]);
  lineAt([6.9, 44.0], [6.9, 31.6]);
  batch.add(ceil, glowMat, lines);

  // ── Cave: black box lining, stage, curved screen, projectors ──
  {
    const lining: THREE.BufferGeometry[] = [];
    const inset = 0.03;
    lining.push(wallSeg([CAVE.x0 + inset, 8.75], [CAVE.x0 + inset, 18.35], 0.02, Y.aula, Y.aulaCeil));
    lining.push(wallSeg([CAVE.x0 + inset, 23.63], [CAVE.x0 + inset, CAVE.z1], 0.02, Y.aula, Y.aulaCeil));
    lining.push(wallSeg([CAVE.x1 - inset, CAVE.z0], [CAVE.x1 - inset, CAVE.z1], 0.02, Y.aula, Y.aulaCeil));
    lining.push(wallSeg([CAVE.x0, CAVE.z0 + inset], [CAVE.x1, CAVE.z0 + inset], 0.02, Y.aula, Y.aulaCeil));
    lining.push(wallSeg([CAVE.x0, CAVE.z1 - inset], [CAVE.x1, CAVE.z1 - inset], 0.02, Y.aula, Y.aulaCeil));
    batch.add(group, uC, lining.map(CHARCOAL));
    // Folding partition (dark glass) on the ramp side between the wall ends.
    batch.add(group, glassIn, wallSeg([CAVE.x0 - 0.1, 18.35], [CAVE.x0 - 0.1, 23.63], 0.03, Y.aula, Y.aulaCeil));
    for (let z = 18.35; z <= 23.63; z += 1.32) batch.add(group, uA, DARK_STEEL(box(0.06, Y.aulaCeil - Y.aula, 0.06, CAVE.x0 - 0.1, Y.aula, z)));
    // Low stage with a curved front, full width at the south end.
    const stage: V2[] = [[2.0, CAVE.z1 - 0.05], [2.0, 24.6]];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      stage.push([2.0 + 10.4 * t, 24.6 - 0.4 * Math.sin(Math.PI * t)]);
    }
    stage.push([12.4, 24.6], [12.4, CAVE.z1 - 0.05]);
    batch.add(group, uC, BLACK(prism(stage, Y.aula, Y.aula + CAVE.stageY)));
    // Curved silver screen (≈11 × 2.2 m) over the stage.
    const proj = caveProjection({ px: low ? 1024 : 2048 });
    owned.push(proj.texture);
    readies.push(proj.ready);
    const screenGeo = curvedScreen(11, 2.2, 26.9, Y.aula + CAVE.stageY + 0.35, 8.0);
    const screenMatC = new THREE.MeshBasicMaterial({ map: proj.texture, color: new THREE.Color(1, 1, 1).multiplyScalar(0.22), side: THREE.DoubleSide });
    owned.push(screenMatC);
    const screen = new THREE.Mesh(screenGeo, screenMatC);
    screen.name = "joki:cave-screen";
    group.add(screen);
    const projectors: THREE.BufferGeometry[] = [];
    for (const x of [5.2, 8.15, 11.1]) projectors.push(place(projector(), x, Y.aulaCeil, 22.8, Math.PI));
    batch.add(ceil, uC, projectors.map(BLACK));
  }

  // ── Event furniture: tables, chairs, laptops (instanced) ──
  {
    // Tables and chairs per room (each lit by its room's probe), one instanced mesh each:
    // a 1 × 1 m table scaled to 180 × 80, 140 × 60 or 120 × 60.
    const m = new THREE.Matrix4();
    const all: Table[] = [...layout.aula, ...layout.cave];
    const tableGeo = table();
    const chairGeo = chair();
    owned.push(tableGeo, chairGeo);
    let seatIndex = 0;
    for (const [list, mat, name] of [
      [layout.aula, uA, "aula"],
      [layout.cave, uC, "cave"],
    ] as const) {
      const tables = new THREE.InstancedMesh(tableGeo, mat, list.length);
      list.forEach((t, i) => tables.setMatrixAt(i, instanceMatrix(t.x, Y.aula, t.z, -t.angle, t.length, 1, t.width, m)));
      tables.name = `joki:tables-${name}`;
      const seats = list.flatMap((t) => t.seats);
      const chairs = new THREE.InstancedMesh(chairGeo, mat, seats.length);
      seats.forEach((s, i) => {
        // Chairs pulled out a little at random (people working).
        const k = seatIndex + i;
        const out = 0.05 + hash01(k * 7 + 3) * 0.12;
        chairs.setMatrixAt(i, instanceMatrix(s.x - Math.sin(s.yaw) * out, Y.aula, s.z - Math.cos(s.yaw) * out, s.yaw + (hash01(k * 13) - 0.5) * 0.25, 1, 1, 1, m));
      });
      seatIndex += seats.length;
      chairs.name = `joki:chairs-${name}`;
      for (const im of [tables, chairs]) {
        im.computeBoundingSphere();
        group.add(im);
      }
    }
    // Laptops on most places (24/7 build), facing the seat.
    const laps: { x: number; z: number; yaw: number }[] = [];
    all.flatMap((t) => t.seats).forEach((s, i) => {
      if (hash01(i * 31 + 5) > (low ? 0.45 : 0.72)) return;
      laps.push({ x: s.x + Math.sin(s.yaw) * 0.52, z: s.z + Math.cos(s.yaw) * 0.52, yaw: s.yaw + Math.PI + (hash01(i * 17) - 0.5) * 0.4 });
    });
    const lap = laptop();
    const bodies = new THREE.InstancedMesh(lap.body, uA, laps.length);
    const screens = new THREE.InstancedMesh(lap.screen, screenMat, laps.length);
    laps.forEach((l, i) => {
      instanceMatrix(l.x, Y.aula + 0.742, l.z, l.yaw, 1, 1, 1, m);
      bodies.setMatrixAt(i, m);
      screens.setMatrixAt(i, m);
    });
    bodies.name = screens.name = "joki:laptops";
    group.add(bodies, screens);
  }

  // ── Aula fixtures: reception counter, round sofa, lockers, poufs, displays ──
  {
    const c = AULA_FIXTURES.counter;
    // Reception counter: beige wood / travertine look with a dark top.
    batch.add(group, uA, pbr(box(c.x1 - c.x0, 1.05, c.z1 - c.z0, (c.x0 + c.x1) / 2, Y.aula, (c.z0 + c.z1) / 2), "#c8b79c", 0.55, 0));
    batch.add(group, uA, DARK_STEEL(box(c.x1 - c.x0 + 0.1, 0.04, c.z1 - c.z0 + 0.1, (c.x0 + c.x1) / 2, Y.aula + 1.05, (c.z0 + c.z1) / 2)));
    // Round sofa (ring) round the double column pair.
    const s = AULA_FIXTURES.sofa;
    const ring = new THREE.RingGeometry(0.9, s.r, 48);
    ring.rotateX(-Math.PI / 2);
    const seat = prismFromRing(0.9, s.r, 0.42);
    batch.add(group, uA, pbr(place(seat, s.c[0], Y.aula, s.c[1]), "#3d4a52", 0.92, 0));
    batch.add(group, uA, pbr(place(prismFromRing(0.9, 1.05, 0.78), s.c[0], Y.aula, s.c[1]), "#344047", 0.92, 0));
    ring.dispose();
    // Lime poufs by the glazing (photo), lockers along the cloakroom's south side.
    const pf = pouf(0.32, 0.4);
    for (const [x, z] of [
      [-5.6, 33.6],
      [-6.3, 34.3],
    ] as V2[])
      batch.add(group, uA, pbr(place(pf.clone(), x, Y.aula, z), "#a8c43a", 0.92, 0));
    pf.dispose();
    batch.add(group, uA, BLACK_AULA(box(5.6, 1.9, 0.5, 4.3, Y.aula, 31.45)));
    // Two wall displays on the WC block's west wall, above the counter in front of it.
    const ws = wallScreen(1.1, 0.65);
    for (const z of [37.6, 41.2]) {
      batch.add(group, uA, BLACK_AULA(place(ws.bezel.clone(), 7.2, Y.aula + 2.1, z, -Math.PI / 2)));
      batch.add(group, screenMat, place(ws.screen.clone(), 7.2, Y.aula + 2.1, z, -Math.PI / 2));
    }
    ws.bezel.dispose();
    ws.screen.dispose();
  }

  // DataCity side: frosted glazed wall with two doors along J z 44.85.
  {
    const z = 44.86;
    batch.add(group, frosted, wallSeg([-8.96, z], [7.26, z], 0.02, Y.aula, Y.aulaCeil));
    const frames: THREE.BufferGeometry[] = [];
    for (let x = -8.9; x <= 7.2; x += 1.35) frames.push(box(0.05, Y.aulaCeil - Y.aula, 0.08, x, Y.aula, z));
    frames.push(wallSeg([-8.96, z], [7.26, z], 0.08, Y.aula + 2.25, Y.aula + 2.32));
    batch.add(group, uA, frames.map(DARK_STEEL));
    for (const x of [-7.3, -2.8]) batch.add(group, glowMat, lamp(box(0.36, 0.14, 0.03, x, Y.aula + 2.45, z - 0.06), JOKI_LUMINANCE.exitSign, undefined, "#21b35a"));
  }

  // ── Tower core: stair floor 1 → 2 (two flights, landing at z −2.2…−1.6), lift doors ──
  {
    const treads: THREE.BufferGeometry[] = [];
    const risers = 24;
    const rise = (Y.f2 - Y.f1) / risers;
    // Flight 1: z 1.6 → −1.6 (rising north), landing, flight 2: z −2.2 → −6.1.
    const f1n = 11;
    const g1 = (1.6 - -1.6) / f1n;
    for (let i = 0; i < f1n; i++) treads.push(box(1.7, rise * (i + 1), g1 + 0.01, 0.45, Y.f1, 1.6 - g1 * (i + 0.5)));
    treads.push(box(1.7, rise * (f1n + 1), 0.6, 0.45, Y.f1, -1.9));
    const f2n = risers - f1n - 1;
    const g2 = (6.1 - 2.2) / f2n;
    for (let i = 0; i < f2n; i++) treads.push(box(1.7, rise * (f1n + 2 + i), g2 + 0.01, 0.45, Y.f1, -2.2 - g2 * (i + 0.5)));
    batch.add(core, uA, treads.map(DARK_STEEL));
    batch.add(core, uA, [
      tubePath(
        [
          [0.82, Y.f1 + 0.9, 1.6],
          [0.82, Y.f1 + 0.9 + rise * f1n, -1.6],
        ],
        0.02,
      ),
      tubePath(
        [
          [0.82, Y.f1 + 0.9 + rise * (f1n + 1), -2.2],
          [0.82, Y.f2 + 0.9, -6.1],
        ],
        0.02,
      ),
    ].map(STEEL));
    // Lift doors (west side of the shaft, facing the corridor).
    batch.add(group, uA, STEEL(box(0.04, 2.1, 1.0, 1.28, Y.f1, 4.75)));
  }

  // ── Company Lounge amphitheatre ──
  const lounge = buildLounge(batch, drum, ceil, { birch, uber: uL, glow: glowMat, spot: mats.lampColor(JOKI_LUMINANCE.trackSpot, 3000), low });
  lounge.userData.pickId = "lounge";
  pickables.push(lounge);

  // Pick proxies for the Aula and the Cave (invisible boxes over the floor).
  const proxy = (id: string, poly: V2[]) => {
    const mesh = new THREE.Mesh(prism(poly, Y.aula, Y.aula + 0.8, { top: true }), new THREE.MeshBasicMaterial({ visible: false }));
    mesh.userData.pickId = id;
    group.add(mesh);
    pickables.push(mesh);
  };
  proxy("aula", AULA_OUTLINE);
  proxy("cave", [
    [CAVE.x0, CAVE.z0],
    [CAVE.x1, CAVE.z0],
    [CAVE.x1, CAVE.z1],
    [CAVE.x0, CAVE.z1],
  ]);

  batch.flush();
  return {
    group,
    core,
    ceil,
    drum,
    pickables,
    ready: Promise.all(readies),
    dispose() {
      for (const o of owned) o.dispose();
    },
  };

  // ── helpers (hoisted) ──

  function aulaDownlights(): V2[] {
    const out: V2[] = [];
    for (let x = -15; x <= 7; x += 2.4)
      for (let z = 19.2; z <= 54; z += 2.4) {
        if (!inside([x, z], AULA_OUTLINE)) continue;
        if (x > 1.2 && z < 31.2) continue;
        out.push([x, z]);
      }
    return out;
  }

  function caveDownlights(): V2[] {
    const out: V2[] = [];
    for (let x = 2.8; x < CAVE.x1; x += 2.4) for (let z = 10.0; z < 24; z += 2.3) out.push([x, z]);
    return out;
  }

  function aulaPools(): Pool[] {
    return aulaDownlights().map(([x, z]) => ({ x, z, r: 1.3, e: 0.16, color: "#fff4ea" }));
  }

  function cavePools(tables: Table[]): Pool[] {
    const out: Pool[] = caveDownlights().map(([x, z]) => ({ x, z, r: 1.1, e: 0.12, color: "#fff2e6" }));
    for (const t of tables) out.push({ x: t.x, z: t.z, r: 0.9, e: 0.06, color: "#d8d0ff" });
    // Stage wash and the screen's spill.
    out.push({ x: 7.2, z: 25.6, r: 4.5, e: 0.12, color: "#b9a8ff", sx: 1.6 });
    return out;
  }
}

/** Contact shadows under tables and chairs for the floor lightmaps. */
function furnitureShadows(tables: Table[]) {
  const out: { x: number; z: number; r: number; k: number; sx?: number; angle?: number }[] = [];
  for (const t of tables) {
    out.push({ x: t.x, z: t.z, r: t.width * 0.62, k: 0.45, sx: t.length / t.width, angle: t.angle });
    for (const s of t.seats) out.push({ x: s.x, z: s.z, r: 0.28, k: 0.3 });
  }
  return out;
}

function inside(p: V2, poly: V2[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

function arcPoints(r: number, b0: number, b1: number, step: number): V2[] {
  const out: V2[] = [];
  const n = Math.max(2, Math.ceil(Math.abs(b1 - b0) / step));
  for (let i = 0; i <= n; i++) out.push(polar(r, b0 + ((b1 - b0) * i) / n));
  return out;
}

/** Ring prism (sofa seat) centred at the origin, height h. */
function prismFromRing(rIn: number, rOut: number, h: number): THREE.BufferGeometry {
  return merge([arcStrip(rOut, 0, 360, 0, h, { seg: 48 }), arcStrip(rIn, 0, 360, 0, h, { seg: 48, inward: true }), annulus(rIn, rOut, 0, 360, h, { seg: 48 })]);
}

/** Curved screen (arc chord `width`, radius `radius`) centred on x = 7.2 at plan z, bottom y0. */
function curvedScreen(width: number, height: number, z: number, y0: number, radius: number): THREE.BufferGeometry {
  const half = Math.asin(width / 2 / radius);
  const seg = 24;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const cx = 7.2;
  const cz = z - radius;
  for (let i = 0; i <= seg; i++) {
    const a = -half + (2 * half * i) / seg;
    const x = cx + Math.sin(a) * radius;
    const zz = cz + Math.cos(a) * radius;
    pos.push(x, y0, zz, x, y0 + height, zz);
    // Seen from the audience (north), east is on the left: u runs west → east reversed.
    uv.push(1 - i / seg, 0, 1 - i / seg, 1);
    if (i < seg) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Lounge carpet: the room outline at F1 with the amphitheatre's round hole. */
function loungeFloorWithPit(poly: V2[]): THREE.BufferGeometry {
  const shape = new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  const hole = new THREE.Path();
  hole.absarc(LOUNGE.c[0], -LOUNGE.c[1], LOUNGE.rim[1], 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const g = new THREE.ShapeGeometry(shape, 24);
  g.rotateX(-Math.PI / 2);
  g.translate(0, Y.f1, 0);
  return metreUV(g);
}

/**
 * The amphitheatre (photos: Arosuo / Vesa Loikas, Wellu Hämäläinen): birch-ply
 * rim and tiers, upholstered pads in navy/teal/petrol/green/blue-grey, dusty
 * pink back cushions with a navy strap on curved brushed-steel rails, grey
 * carpet in the pit, warm spots and a wall TV.
 */
function buildLounge(
  batch: Batcher,
  group: THREE.Group,
  ceil: THREE.Group,
  m: {
    birch: THREE.Material;
    /** The lounge's uber material (upholstery, steel, black). */
    uber: THREE.Material;
    glow: THREE.Material;
    spot: THREE.Color;
    low: boolean;
  },
): THREE.Group {
  // Brushed stainless rails (#c0c2c3): rough enough to read satin, not mirror.
  const BRUSHED = (geo: THREE.BufferGeometry) => pbr(geo, "#c0c2c3", 0.5, 1);
  const g = new THREE.Group();
  g.name = "joki-lounge";
  g.position.set(LOUNGE.c[0], 0, LOUNGE.c[1]);
  group.add(g);
  const floor = Y.f1;
  const seatSectors: [number, number][] = [
    [LOUNGE.aisleHalf, 180 - LOUNGE.aisleHalf],
    [180 + LOUNGE.aisleHalf, 360 - LOUNGE.aisleHalf],
  ];
  const birch: THREE.BufferGeometry[] = [];
  // Rim ring (flush with the floor) and its inner face.
  birch.push(annulus(LOUNGE.rim[0], LOUNGE.rim[1], 0, 360, floor, { seg: 96 }));
  // Tiers: full rings, each a stepped prism (top + inner riser face).
  let prevDrop = 0;
  for (const t of LOUNGE.tiers) {
    birch.push(annulus(t.r0, t.r1, 0, 360, floor - t.drop, { seg: 96 }));
    birch.push(arcStrip(t.r1, 0, 360, floor - t.drop, floor - prevDrop, { seg: 96, inward: true }));
    prevDrop = t.drop;
  }
  birch.push(arcStrip(LOUNGE.pit, 0, 360, floor - LOUNGE.pitDrop, floor - prevDrop, { seg: 64, inward: true }));
  for (const geo of birch) batch.add(g, m.birch, geo);
  // Pit carpet.
  const pit = new THREE.CircleGeometry(LOUNGE.pit, 48);
  pit.rotateX(-Math.PI / 2);
  pit.translate(0, floor - LOUNGE.pitDrop + 0.005, 0);
  batch.add(g, m.uber, pbr(metreUV(pit), "#6a6b6e", 1, 0));
  // Upholstered pads on the seat tiers, in segments of five colours.
  const colours = ["#2f3d57", "#0b8794", "#1b576b", "#3d5f48", "#9db5bb", "#0b8794", "#2f3d57", "#1b576b"];
  let ci = 0;
  for (const t of LOUNGE.tiers.filter((x) => x.seat)) {
    for (const [s0, s1] of seatSectors) {
      const span = s1 - s0;
      const n = Math.max(2, Math.round((span * (Math.PI / 180) * (t.r0 + t.r1)) / 2 / 1.25));
      for (let i = 0; i < n; i++) {
        const b0 = s0 + (span * i) / n + 0.6;
        const b1 = s0 + (span * (i + 1)) / n - 0.6;
        const pad = merge([
          annulus(t.r0 + 0.02, t.r1 - 0.04, b0, b1, floor - t.drop + 0.13, { seg: 10 }),
          arcStrip(t.r0 + 0.02, b0, b1, floor - t.drop, floor - t.drop + 0.13, { seg: 10, inward: true }),
          arcStrip(t.r1 - 0.04, b0, b1, floor - t.drop, floor - t.drop + 0.13, { seg: 10 }),
        ]);
        batch.add(g, m.uber, pbr(pad, colours[ci++ % colours.length], 0.95, 0));
      }
    }
  }
  // Back cushions on the rails (r 1.72 and 2.72), tilted back.
  const cushion = softBox(0.58, 0.42, 0.11, 0.04);
  // Navy strap down the cushion's front, a third in from one side (photo).
  const piping = softBox(0.035, 0.43, 0.118, 0.004);
  piping.translate(-0.13, 0, 0);
  for (const [t, railR] of [
    [LOUNGE.tiers[0], 2.72],
    [LOUNGE.tiers[2], 1.72],
  ] as const) {
    const seatTop = floor - t.drop + 0.13;
    for (const [s0, s1] of seatSectors) {
      const n = Math.max(2, Math.round(((s1 - s0) * (Math.PI / 180) * railR) / 0.78));
      for (let i = 0; i < n; i++) {
        const b = s0 + ((s1 - s0) * (i + 0.5)) / n;
        const [x, z] = polar(railR - 0.14, b);
        const yaw = Math.atan2(-x, -z);
        const c = cushion.clone();
        c.rotateX(-0.28);
        c.rotateY(yaw);
        c.translate(x, seatTop + 0.02, z);
        batch.add(g, m.uber, pbr(c, "#c9918f", 0.95, 0));
        if (!m.low) {
          const p = piping.clone();
          p.rotateX(-0.28);
          p.rotateY(yaw);
          p.translate(x, seatTop + 0.02, z);
          batch.add(g, m.uber, pbr(p, "#26324a", 0.95, 0));
        }
      }
    }
    // The rail: a curved tube at the cushions' top, on posts, bending down at the aisles.
    for (const [s0, s1] of seatSectors) {
      const pts: V3[] = [];
      const yRail = seatTop + 0.44;
      const [ax, az] = polar(railR, s0 + 1.5);
      pts.push([ax, seatTop - 0.1, az]);
      for (let k = 0; k <= 14; k++) {
        const [x, z] = polar(railR, s0 + 1.5 + ((s1 - s0 - 3) * k) / 14);
        pts.push([x, yRail, z]);
      }
      const [bx, bz] = polar(railR, s1 - 1.5);
      pts.push([bx, seatTop - 0.1, bz]);
      batch.add(g, m.uber, BRUSHED(tubePath(pts, 0.019, 8, 0.2)));
      for (let k = 1; k < 4; k++) {
        const [x, z] = polar(railR, s0 + ((s1 - s0) * k) / 4);
        batch.add(g, m.uber, BRUSHED(rod([x, seatTop - 0.1, z], [x, yRail, z], 0.016, 8)));
      }
    }
  }
  cushion.dispose();
  piping.dispose();
  // Central handrails down the aisles.
  for (const b of [0, 180]) {
    const p0 = polar(2.85, b);
    const p1 = polar(1.0, b);
    batch.add(
      g,
      m.uber,
      BRUSHED(
        tubePath(
          [
            [p0[0], floor + 0.9, p0[1]],
            [p1[0], floor - LOUNGE.pitDrop + 0.9, p1[1]],
          ],
          0.02,
        ),
      ),
    );
    batch.add(g, m.uber, BRUSHED(rod([p0[0], floor, p0[1]], [p0[0], floor + 0.9, p0[1]], 0.02)));
    batch.add(g, m.uber, BRUSHED(rod([p1[0], floor - LOUNGE.pitDrop, p1[1]], [p1[0], floor - LOUNGE.pitDrop + 0.9, p1[1]], 0.02)));
  }
  // Warm spots in the black ceiling over the tiers.
  const lens = downlightDisc(0.05);
  for (let k = 0; k < 8; k++) {
    const [x, z] = polar(2.3, k * 45 + 22.5);
    batch.add(ceil, m.glow, glow(lens.clone().translate(LOUNGE.c[0] + x, Y.showroomCeil - 0.004, LOUNGE.c[1] + z), m.spot));
  }
  lens.dispose();
  // Wall TV on the drum wall (north-east).
  const tv = wallScreen(1.6, 0.92);
  const [tx, tz] = polar(R.drumIn - 0.04, 52);
  const yaw = Math.atan2(-tx, -tz);
  batch.add(group, m.uber, pbr(place(tv.bezel, tx, Y.f1 + 2.0, tz, yaw), "#121214", 0.5, 0));
  tv.screen.dispose();
  return g;
}
