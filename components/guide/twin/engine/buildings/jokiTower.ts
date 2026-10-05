import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { TwinContext, V2 } from "../types";
import { CHALLENGE_COMPANIES } from "@/lib/hackathon-2026/companies";
import { LOGOS_3D } from "@/lib/hackathon-2026/logos3d";
import { EVENT_VIOLET } from "../render/canvas";
import { makeLabel } from "../labels";
import { Batcher, R, Y, box, cylinder, glow, instanceMatrix, merge, metreUV, pbr, place, polar, prism, ringPrism, rod, wallSeg, yawToBearing } from "./joki/kit";
import type { JokiMaterials } from "./joki/mats";
import { JOKI_LUMINANCE } from "./joki/mats";
import { barStoolPbr, bleacher, counter, downlightDisc, eggChair, pouf, softBox, trackSpot, wallScreen } from "./joki/furniture";
import { exitSign, floorScreen, mapWall, patchworkCarpet, rollupAtlas, screenContent, spiralSeamNormal, woodWool } from "./joki/textures";

/**
 * Joki tower floors 2 and 3 (SPEC §7.3) — round plates inside the glass
 * (r 9.15) with the 16 black columns, the core (stair, shaft, lift + WC) on
 * the J north–south axis, light wood-wool ceilings with galvanised spiral
 * ducts and black track spots, grey patchwork carpet, convector benches
 * along the glass. Floor 2: Revvity, Valmet, Traficom (east) and the Chill
 * Zone in the Turku Futurescapes exhibition (west). Floor 3: Takomo Golf,
 * Forcit Group, Saarioinen (east), Lindström, Bo LKV, Business Turku
 * (west) in front of the dark timber bleachers. Stand = black counter
 * 1.8 × 0.6 × 1.05 m with a violet kick light, two bar stools and a
 * 0.85 × 2.0 m roll-up with the company's logo (repo logos only).
 * Positions: the Since AI event map (interiors.json), in the J frame.
 */

/** Stand positions (J, logo-box centres of the event map). */
export const TOWER_STANDS: Record<string, { floor: 2 | 3; x: number; z: number }> = {
  revvity: { floor: 2, x: 5.29, z: -4.43 },
  valmet: { floor: 2, x: 6.27, z: -1.01 },
  traficom: { floor: 2, x: 6.08, z: 2.07 },
  "takomo-golf": { floor: 3, x: 5.29, z: -4.43 },
  "forcit-group": { floor: 3, x: 6.27, z: -1.01 },
  saarioinen: { floor: 3, x: 6.08, z: 2.07 },
  lindstrom: { floor: 3, x: -3.45, z: -5.71 },
  "bo-lkv": { floor: 3, x: -5.45, z: -1.32 },
  "business-turku": { floor: 3, x: -3.39, z: 4.27 },
};

/** The Chill Zone's poufs (J x, z, radius, colour). */
export const CHILL_POUFS: readonly [number, number, number, string][] = [
  [-4.6, -1.5, 0.55, "#b1b13b"],
  [-3.3, 0.2, 0.62, "#5a5ccc"],
  [-5.6, -0.1, 0.5, "#255d69"],
  [-2.5, -1.9, 0.45, "#8a8f94"],
  [-4.3, 1.0, 0.45, "#b1b13b"],
];

/** Stand furniture pose: the counter faces the tower centre, the roll-up stands behind it. */
export function standPose(id: string): { x: number; z: number; yaw: number; floor: 2 | 3 } {
  const s = TOWER_STANDS[id];
  return { x: s.x, z: s.z, yaw: Math.atan2(-s.x, -s.z), floor: s.floor };
}

/** Core footprints shared by floors 2 and 3 (J): stair walls, shaft, lift + WC block. */
export const CORE: V2[][] = [
  [
    [-0.4, -6.0],
    [-0.2, -6.0],
    [-0.2, 1.6],
    [-0.4, 1.6],
  ],
  [
    [1.3, -6.0],
    [2.38, -6.0],
    [2.38, 1.6],
    [1.3, 1.6],
  ],
  [
    [1.3, 3.6],
    [6.5, 3.6],
    [6.5, 5.97],
    [1.3, 5.97],
  ],
];
/** Stairwell opening in each plate (the flight from the floor below arrives through it). */
export const STAIRWELL: V2[] = [
  [-0.2, -6.1],
  [1.3, -6.1],
  [1.3, 1.6],
  [-0.2, 1.6],
];

export interface Tower {
  /** Cut the core walls of a floor down to 1.3 m (dollhouse seen from above) or restore them. */
  cutCore(floor: 2 | 3, on: boolean): void;
  f2: THREE.Group;
  f2Ceil: THREE.Group;
  f3: THREE.Group;
  f3Ceil: THREE.Group;
  /** Floor-2 and floor-3 labels (world frame), toggled with the floors. */
  labels2: THREE.Group;
  labels3: THREE.Group;
  /**
   * Re-place the floor labels for a camera (J frame): the floor tags sit beside the drum on the
   * camera's left (`left`, a J-frame direction); a label a floor slab hides from the camera slides
   * down its stand to stay in sight, or hides. True when anything changed.
   */
  updateLabels(cam: THREE.Vector3, left: THREE.Vector3, state: { f3: boolean; inside: boolean }): boolean;
  pickables: THREE.Object3D[];
  labels: CSS2DObject[];
  ready: Promise<unknown>;
  dispose(): void;
}

/** Radius of the floor tags: just outside the fins. */
const FLOOR_TAG_R = R.finOut + 0.5;
/** Anchor heights above the floor for stand labels, preferred first (roll-up top, then lower). */
const STAND_LABEL_HEIGHTS = [2.45, 2.0, 1.6, 1.2];

/**
 * True when a floor slab hides the J point (x, y, z) from the camera: floor 2's slab, and floor 3's
 * while it is drawn (each a disc inside the glass between its underside and top).
 */
export function slabHides(cam: { x: number; y: number; z: number }, x: number, y: number, z: number, f3Drawn: boolean): boolean {
  const slabs: [number, number][] = f3Drawn
    ? [
        [Y.f2, Y.f1Soffit],
        [Y.f3, Y.f3Soffit],
      ]
    : [[Y.f2, Y.f1Soffit]];
  for (const [top, under] of slabs) {
    let plane: number;
    if (cam.y > top && y < top) plane = top;
    else if (cam.y < under && y > under) plane = under;
    else continue;
    const t = (cam.y - plane) / (cam.y - y);
    if (Math.hypot(cam.x + (x - cam.x) * t, cam.z + (z - cam.z) * t) < R.glassIn) return true;
  }
  return false;
}

/** Does the core (stair walls, shaft, lift + WC) stand between a camera on the floor and a point (J plan)? */
export function coreHides(cam: { x: number; z: number }, x: number, z: number): boolean {
  for (const poly of CORE) {
    const xs = poly.map((p) => p[0]);
    const zs = poly.map((p) => p[1]);
    if (segmentHitsRect(cam.x, cam.z, x, z, Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs))) return true;
  }
  // The stairwell between the two core walls is open above the treads but its glass and the stair
  // itself hide little: not counted.
  return false;
}

/** 2D segment (a → b) against an axis-aligned rectangle (slab test). */
function segmentHitsRect(ax: number, az: number, bx: number, bz: number, x0: number, x1: number, z0: number, z1: number): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dz = bz - az;
  for (const [p, q] of [
    [-dx, ax - x0],
    [dx, x1 - ax],
    [-dz, az - z0],
    [dz, z1 - az],
  ] as [number, number][]) {
    if (Math.abs(p) < 1e-12) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

/** Where a stand label goes for a camera: the highest anchor no slab hides, or null (hidden). */
export function standLabelHeight(cam: { x: number; y: number; z: number }, floor: 2 | 3, x: number, z: number, f3Drawn: boolean, heights = STAND_LABEL_HEIGHTS): number | null {
  const fy = floor === 2 ? Y.f2 : Y.f3;
  for (const h of heights) if (!slabHides(cam, x, fy + h, z, f3Drawn)) return h;
  return null;
}

export function buildJokiTower(
  ctx: TwinContext,
  mats: JokiMaterials,
  opts: { toWorld(x: number, y: number, z: number): THREE.Vector3; labelRoot: THREE.Object3D },
): Tower {
  const low = ctx.tier === "low";
  const f2 = new THREE.Group();
  f2.name = "joki-f2";
  const f3 = new THREE.Group();
  f3.name = "joki-f3";
  const f2Ceil = new THREE.Group();
  f2Ceil.name = "joki-f2-ceiling";
  const f3Ceil = new THREE.Group();
  f3Ceil.name = "joki-f3-ceiling";
  f2.add(f2Ceil);
  f3.add(f3Ceil);
  const labels2 = new THREE.Group();
  labels2.name = "joki-labels-f2";
  const labels3 = new THREE.Group();
  labels3.name = "joki-labels-f3";
  opts.labelRoot.add(labels2, labels3);
  const batch = new Batcher();
  const owned: { dispose(): void }[] = [];
  const readies: Promise<unknown>[] = [];
  const pickables: THREE.Object3D[] = [];
  const labels: CSS2DObject[] = [];
  /** Labels re-placed per camera (updateLabels); `at` null = the floor tag. */
  const placed: { wrap: THREE.Group; label: CSS2DObject; floor: 2 | 3; at: V2 | null; heights: number[]; key: string }[] = [];
  const addPlaced = (label: CSS2DObject, floor: 2 | 3, at: V2 | null, heights: number[]) => {
    // One wrapper per label: the engine owns label.visible (the views' label groups), the wrapper
    // hides what a slab covers.
    const wrap = new THREE.Group();
    wrap.add(label);
    (floor === 2 ? labels2 : labels3).add(wrap);
    labels.push(label);
    placed.push({ wrap, label, floor, at, heights, key: "" });
  };
  const coreCut: Record<2 | 3, { group: THREE.Group; height: number }> = {
    2: { group: new THREE.Group(), height: 1 },
    3: { group: new THREE.Group(), height: 1 },
  };

  // ── Materials (zone "tower": daylight through the glass + the sun) ──
  // Grey carpet tiles with subtle tone changes (photos: Workshop, Partner Expo).
  const carpetTex = patchworkCarpet(["#8c8d91", "#87888c", "#919296", "#84858a"], { px: low ? 512 : 1024, seed: 29 });
  owned.push(carpetTex.texture);
  const carpet = mats.get("carpetGrey", "tower", {}, "jk-tower-carpet");
  carpet.map = carpetTex.texture;
  carpet.color.set("#ffffff");
  const ww = woodWool({ px: low ? 512 : 1024 });
  owned.push(ww.texture);
  const ceilingMat = mats.plain("tower-ceiling", "tower", { map: ww.texture, roughness: 0.95 });
  // Flat-painted parts of both floors (slab edges, core, counters, ducts, furniture): one uber material.
  const uber = mats.uber("tower");
  const SLAB = (g: THREE.BufferGeometry) => pbr(g, "#a8a7a3", 0.9, 0);
  // The core is painted a dark charcoal grey (photos: Workshop / Partner Expo, ≈ #504a4b under the room
  // light; SPEC mid-grey #787c82), matte.
  const CORE_PAINT = (g: THREE.BufferGeometry) => pbr(g, "#3f3d3e", 0.9, 0);
  const DUCT = (g: THREE.BufferGeometry) => pbr(g, "#c5c8ca", 0.45, 1);
  const DOOR_LEAF = (g: THREE.BufferGeometry) => pbr(g, "#d4d4d0", 0.55, 0);
  const BRUSHED = (g: THREE.BufferGeometry) => pbr(g, "#b9bcbe", 0.38, 1);
  const FRAME = (g: THREE.BufferGeometry) => pbr(g, "#2b2d30", 0.5, 0.6);
  const BLACK = (g: THREE.BufferGeometry) => pbr(g, "#0b0b0d", 0.5, 0);
  const GLOSS = (g: THREE.BufferGeometry) => pbr(g, "#09090b", 0.14, 0);
  const WHITE = (g: THREE.BufferGeometry) => pbr(g, "#eeeeec", 0.5, 0);
  const CHARCOAL = (g: THREE.BufferGeometry) => pbr(g, "#2b2c30", 0.85, 0);
  const STEEL = (g: THREE.BufferGeometry) => pbr(g, "#c9cbcc", 0.32, 1);
  const FABRIC = (g: THREE.BufferGeometry, hex: string) => pbr(g, hex, 0.95, 0);
  const balustrade = mats.glass("tower", { opacity: 0.09 }, "jk-tower-balustrade");
  // Light fittings share one glow material per floor group (HDR colours in the vertices).
  const glowMat = mats.glow("tower");
  const VIOLET = mats.lampColor(JOKI_LUMINANCE.violetLine, undefined, EVENT_VIOLET);
  const SPOT = mats.lampColor(JOKI_LUMINANCE.trackSpot, 3000);
  const DOWN = mats.lampColor(JOKI_LUMINANCE.downlight, 3500);
  const screenTex = screenContent({ seed: 21 });
  owned.push(screenTex);
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, color: new THREE.Color(1, 1, 1).multiplyScalar(JOKI_LUMINANCE.screen) });
  owned.push(screenMat);
  // Galvanised spiral-seam ducts (SPEC #c5c8ca): a seam normal map on duct UVs (u round, v along, in tiles).
  const seam = spiralSeamNormal({ px: low ? 128 : 256 });
  owned.push(seam);
  const ductMat = mats.plain("tower-duct", "tower", { color: "#c5c8ca", metalness: 1, roughness: 0.36, normalMap: seam });
  ductMat.normalScale.set(0.8, 0.8);
  // Emergency-exit signs (lit pictogram).
  const exitTex = exitSign();
  owned.push(exitTex);
  const exitMat = new THREE.MeshBasicMaterial({ map: exitTex, color: new THREE.Color(1, 1, 1).multiplyScalar(JOKI_LUMINANCE.exitSign) });
  exitMat.name = "joki-exit-signs";
  owned.push(exitMat);
  /** Upper part of the floor 2 → 3 flight: hidden with the floor-2 core cut (it would end in mid-air). */
  const stairHigh = new THREE.Group();
  stairHigh.name = "joki-stair-2-3-upper";
  f2.add(stairHigh);

  for (const [floor, group, ceilGroup] of [
    [2, f2, f2Ceil],
    [3, f3, f3Ceil],
  ] as const) {
    const y = floor === 2 ? Y.f2 : Y.f3;
    const ceilY = floor === 2 ? Y.f2Ceil : Y.f3Ceil;
    const soffit = floor === 2 ? Y.f1Soffit : Y.f3Soffit;
    // Slab (structure) and the carpet, both with the stairwell opening.
    batch.add(group, uber, SLAB(plateWithHole(9.12, STAIRWELL, soffit, y - 0.02, true)), { cast: true, receive: true, name: "slab" });
    batch.add(group, carpet, plateWithHole(9.12, STAIRWELL, y - 0.02, y, false), { receive: true });
    // Ceiling: wood-wool panels; the floor-3 ceiling sits under the roof slab.
    const ceilGeo = plateWithHole(9.1, floor === 2 ? STAIRWELL : [], ceilY, ceilY + 0.02, false);
    ceilGeo.scale(1, 1, 1);
    batch.add(ceilGroup, ceilingMat, flipCap(ceilGeo));
    // Core walls (in their own group so a dollhouse view can cut them down to 1.3 m).
    const cut = new THREE.Group();
    cut.name = `joki-core-f${floor}`;
    cut.position.y = y;
    group.add(cut);
    coreCut[floor] = { group: cut, height: ceilY - y };
    for (const poly of CORE) batch.add(cut, uber, CORE_PAINT(prism(poly, 0, ceilY - y)), { receive: true });
    // Glass balustrade along the stairwell (west edge) and its handrail.
    batch.add(group, balustrade, wallSeg([-0.15, -6.0], [-0.15, 1.5], 0.012, y, y + 1.05));
    batch.add(group, uber, STEEL(rod([-0.15, y + 1.05, -6.0], [-0.15, y + 1.05, 1.5], 0.02, 8)), { receive: true });
    // Stair flight up to the next floor (floor 2 → 3): black steel treads on sloped stringer plates,
    // a landing half way; the treads above 1.3 m sit in their own group (dollhouse cut).
    if (floor === 2) {
      const risers = 24;
      const rise = (Y.f3 - Y.f2) / risers;
      const lowParts: THREE.BufferGeometry[] = [];
      const highParts: THREE.BufferGeometry[] = [];
      const put = (top: number, g: THREE.BufferGeometry) => (top - y <= 1.3 ? lowParts : highParts).push(g);
      const n1 = 11;
      const g1 = 3.2 / n1;
      // Each step a closed steel tread-and-riser (no see-through slats).
      for (let i = 0; i < n1; i++) put(rise * (i + 1) + y, box(1.42, rise + 0.02, g1 + 0.02, 0.55, y + rise * i - 0.02, 1.6 - g1 * (i + 0.5)));
      put(y + rise * (n1 + 1), box(1.42, 0.2, 0.62, 0.55, y + rise * (n1 + 1) - 0.2, -1.9));
      const n2 = risers - n1 - 1;
      const g2 = 3.9 / n2;
      for (let i = 0; i < n2; i++) put(y + rise * (n1 + 2 + i), box(1.42, rise + 0.02, g2 + 0.02, 0.55, y + rise * (n1 + 1 + i) - 0.02, -2.2 - g2 * (i + 0.5)));
      // Stringers along both sides of each flight (the lower flight split where the cut falls).
      const cutZ = 1.6 - g1 * 7;
      for (const x of [-0.18, 1.28]) {
        lowParts.push(slopedPlate(x, 1.6, y, cutZ, y + rise * 7, 0.3, 0.035));
        highParts.push(slopedPlate(x, cutZ, y + rise * 7, -1.6, y + rise * (n1 + 1), 0.3, 0.035));
        highParts.push(slopedPlate(x, -1.6, y + rise * (n1 + 1), -2.2, y + rise * (n1 + 1), 0.3, 0.035));
        highParts.push(slopedPlate(x, -2.2, y + rise * (n1 + 1), -6.1, Y.f3, 0.3, 0.035));
      }
      batch.add(group, uber, lowParts.map(BLACK), { receive: true });
      batch.add(stairHigh, uber, highParts.map(BLACK), { receive: true });
    }
    // Doors on the core's south face (z 5.97): the lift (brushed steel, two leaves, call panel) and the
    // WC (light laminate leaf with a lever), each inset in a 50 mm dark steel frame — cut with the core.
    {
      const fz = 5.97;
      const doorParts: { g: THREE.BufferGeometry; paint: (g: THREE.BufferGeometry) => THREE.BufferGeometry }[] = [];
      const framed = (cx: number, w: number, h: number) => {
        for (const s2 of [-1, 1]) doorParts.push({ g: box(0.05, h + 0.05, 0.07, cx + s2 * (w / 2 + 0.025), 0, fz + 0.015), paint: FRAME });
        doorParts.push({ g: box(w + 0.1, 0.05, 0.07, cx, h, fz + 0.015), paint: FRAME });
      };
      framed(2.5, 1.0, 2.1);
      for (const s2 of [-1, 1]) doorParts.push({ g: box(0.495, 2.1, 0.03, 2.5 + s2 * 0.2525, 0, fz - 0.005), paint: BRUSHED });
      doorParts.push({ g: box(0.12, 0.3, 0.02, 3.22, 1.0, fz + 0.01), paint: BRUSHED });
      framed(5.0, 0.85, 2.05);
      doorParts.push({ g: box(0.85, 2.05, 0.035, 5.0, 0, fz - 0.008), paint: DOOR_LEAF });
      doorParts.push({ g: box(0.13, 0.02, 0.02, 5.32, 1.02, fz + 0.04), paint: BRUSHED });
      doorParts.push({ g: box(0.02, 0.02, 0.05, 5.37, 1.02, fz + 0.02), paint: BRUSHED });
      batch.add(coreCut[floor].group, uber, doorParts.map((d) => d.paint(d.g)), { receive: true });
      // Lift call buttons.
      batch.add(coreCut[floor].group, glowMat, [glow(box(0.03, 0.03, 0.01, 3.22, 1.1, fz + 0.022), DOWN), glow(box(0.03, 0.03, 0.01, 3.22, 1.2, fz + 0.022), DOWN)]);
    }
    // Exit signs hung under the ceiling by this floor's outside doors, facing the room.
    {
      const signs: THREE.BufferGeometry[] = [];
      for (const b of floor === 2 ? [0.5, 158] : [90.5]) {
        const [x, z] = polar(8.1, b);
        const g = new THREE.PlaneGeometry(0.4, 0.16);
        g.rotateY(Math.atan2(-x, -z));
        g.translate(x, ceilY - 0.32, z);
        signs.push(g);
        const back = g.clone();
        signs.push(back.applyMatrix4(new THREE.Matrix4().makeTranslation(-x, 0, -z).premultiply(new THREE.Matrix4().makeRotationY(Math.PI)).premultiply(new THREE.Matrix4().makeTranslation(x, 0, z))));
        batch.add(group, uber, BLACK(box(0.42, 0.18, 0.03, x, ceilY - 0.41, z, Math.atan2(-x, -z))));
        batch.add(group, uber, BLACK(rod([x, ceilY - 0.23, z], [x, ceilY, z], 0.006, 4)));
      }
      const mesh = new THREE.Mesh(merge(signs), exitMat);
      mesh.name = `joki:exit-signs-f${floor}`;
      group.add(mesh);
    }
    // The Q&A screens on the core (east face of the shaft, west face of the stair wall).
    {
      const names = CHALLENGE_COMPANIES.filter((c) => c.qa.floor === floor).map((c) => c.name);
      const fs = floorScreen(floor, names);
      owned.push(fs.texture);
      readies.push(fs.ready);
      const mat = new THREE.MeshBasicMaterial({ map: fs.texture, color: new THREE.Color(1, 1, 1).multiplyScalar(JOKI_LUMINANCE.screen * 1.2) });
      mat.name = `joki-floor-screen-${floor}`;
      owned.push(mat);
      const ws = wallScreen(1.6, 0.9);
      const scr: THREE.BufferGeometry[] = [];
      for (const [x, yaw] of [
        [2.4, Math.PI / 2],
        [-0.42, -Math.PI / 2],
      ] as [number, number][]) {
        batch.add(coreCut[floor].group, uber, BLACK(place(ws.bezel.clone(), x, 2.15, -2.3, yaw)), { receive: true });
        scr.push(place(ws.screen.clone(), x, 2.15, -2.3, yaw));
      }
      ws.bezel.dispose();
      ws.screen.dispose();
      const mesh = new THREE.Mesh(merge(scr), mat);
      mesh.name = `joki:floor-screens-f${floor}`;
      coreCut[floor].group.add(mesh);
    }
    // Low dark sill along the foot of the glazing (convector channel; photos: Workshop,
    // Futurescapes), broken at this floor's doors.
    const doors = floor === 2 ? [0.5, 158] : [90.5];
    const sills: THREE.BufferGeometry[] = [];
    for (let i = 0; i < doors.length; i++) {
      const a = doors[i] + 6;
      let b = doors[(i + 1) % doors.length] - 6;
      if (b <= a) b += 360;
      sills.push(ringPrism(8.97, R.glassIn - 0.01, a, b, y, y + 0.11, { seg: Math.ceil((b - a) / 3), ends: true }));
    }
    batch.add(group, uber, sills.map(CHARCOAL), { receive: true });
    // Exposed galvanised spiral ducts (photos: Workshop — parallel runs under the wood-wool ceiling)
    // on hangers, with round diffusers; track spots on tracks.
    const ducts: THREE.BufferGeometry[] = [];
    const hangers: THREE.BufferGeometry[] = [];
    const runs: [number, number, number, number][] = [
      // x0, x1, z, radius — west and east halves (the core stands in between), two parallel runs each.
      [-8.3, -0.75, -2.9, 0.25],
      [-8.6, -0.75, -1.9, 0.2],
      [2.75, 8.3, -2.9, 0.25],
      [2.75, 8.6, -1.9, 0.2],
    ];
    for (const [x0, x1, z, r] of runs) {
      const half = Math.sqrt(Math.max(0, 8.95 * 8.95 - z * z));
      const a = Math.max(x0, -half + 0.4);
      const b = Math.min(x1, half - 0.4);
      ducts.push(spiralDuct([a, ceilY - 0.42, z], [b, ceilY - 0.42, z], r, low ? 12 : 20));
      for (let x = a + 0.6; x < b; x += 1.8) hangers.push(rod([x, ceilY - 0.42 + r, z], [x, ceilY, z], 0.008, 4));
    }
    batch.add(ceilGroup, ductMat, ducts);
    const diffusers: THREE.BufferGeometry[] = [];
    for (const [x, z] of [
      [-5.0, -2.9],
      [-2.4, -2.9],
      [4.0, -2.9],
      [6.6, -2.9],
    ] as V2[])
      diffusers.push(cylinder(0.17, ceilY - 0.74, ceilY - 0.67, x, z, 16));
    batch.add(ceilGroup, uber, [...diffusers.map(DUCT), ...hangers.map(DUCT)]);
    const sp = trackSpot();
    const bodies: THREE.BufferGeometry[] = [];
    const lenses: THREE.BufferGeometry[] = [];
    const tracks: THREE.BufferGeometry[] = [];
    for (const r of [4.2, 7.0]) {
      const n = r < 5 ? 10 : 16;
      for (let k = 0; k < n; k++) {
        const b = (360 * k) / n + 9;
        const [x, z] = polar(r, b);
        if (x > -0.6 && x < 3.6 && z > -6.4 && z < 6.2) continue;
        const yaw = yawToBearing(b) + Math.PI;
        bodies.push(sp.body.clone().rotateY(yaw).translate(x, ceilY - 0.02, z));
        lenses.push(sp.lens.clone().rotateY(yaw).translate(x, ceilY - 0.02, z));
      }
      for (let k = 0; k < 24; k++) {
        const a0 = (360 * k) / 24;
        const a1 = (360 * (k + 1)) / 24;
        const [x0, z0] = polar(r, a0);
        const [x1, z1] = polar(r, a1);
        if ((x0 > -0.6 && x0 < 3.6 && Math.abs(z0) < 6.3) || (x1 > -0.6 && x1 < 3.6 && Math.abs(z1) < 6.3)) continue;
        tracks.push(wallSeg([x0, z0], [x1, z1], 0.035, ceilY - 0.035, ceilY));
      }
    }
    sp.body.dispose();
    sp.lens.dispose();
    batch.add(ceilGroup, uber, [...bodies, ...tracks].map(BLACK));
    batch.add(ceilGroup, glowMat, lenses.map((g) => glow(g, SPOT)));
    // Ceiling LED panels between the duct runs (soft fill).
    const disc = downlightDisc(0.07);
    const dl: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 12; k++) {
      const [x, z] = polar(5.6, k * 30 + 15);
      if (x > -0.6 && x < 3.6 && Math.abs(z) < 6.3) continue;
      dl.push(disc.clone().translate(x, ceilY - 0.004, z));
    }
    disc.dispose();
    batch.add(ceilGroup, glowMat, dl.map((g) => glow(g, DOWN)));
    // Floor tag outside the fins, mid-height of the floor; updateLabels keeps it on the drum's left edge.
    const lw = opts.toWorld(...polarXZ(FLOOR_TAG_R, 250, y + 1.5));
    addPlaced(makeLabel(`Floor ${floor}`, "landmark", lw.x, lw.y, lw.z, "joki-floors", "Q&A"), floor, null, [1.5]);
  }

  // ── Stands: counters, stools and roll-ups merged per floor; invisible boxes carry the pick ids ──
  {
    const parts = counter(1.8, 1.05, 0.6);
    const stool = barStoolPbr();
    owned.push(stool);
    const stools: { x: number; y: number; z: number; yaw: number }[] = [];
    const standCos = CHALLENGE_COMPANIES.filter((x) => x.qa.floor === 2 || x.qa.floor === 3);
    const atlas = rollupAtlas(
      standCos.map((c) => ({ src: LOGOS_3D[c.id], name: c.name })),
      { px: low ? 256 : 384 },
    );
    owned.push(atlas.texture);
    readies.push(atlas.ready);
    // Printed fabric under ≈ 0.5 klux of spots: ≈ 0.15 kcd/m².
    const rollMat = new THREE.MeshBasicMaterial({ map: atlas.texture, color: new THREE.Color(1, 1, 1).multiplyScalar(0.15) });
    rollMat.name = "joki-rollups";
    owned.push(rollMat);
    const rollBack = merge([softBox(0.9, 0.08, 0.28, 0.02, 0, 0, 0), softBox(0.86, 2.06, 0.03, 0.005, 0, 0.06, -0.025)]);
    const banners: Record<2 | 3, THREE.BufferGeometry[]> = { 2: [], 3: [] };
    standCos.forEach((c, i) => {
      const pose = standPose(c.id);
      const y = pose.floor === 2 ? Y.f2 : Y.f3;
      const group = pose.floor === 2 ? f2 : f3;
      const at = new THREE.Matrix4().compose(new THREE.Vector3(pose.x, y, pose.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, pose.yaw, 0)), new THREE.Vector3(1, 1, 1));
      batch.add(group, uber, [BLACK(parts.body.clone().applyMatrix4(at)), BLACK(rollBack.clone().translate(0, 0, -0.77).applyMatrix4(at)), GLOSS(parts.top.clone().applyMatrix4(at))], {
        receive: true,
      });
      batch.add(group, glowMat, glow(parts.glow.clone().applyMatrix4(at), VIOLET));
      // Roll-up printed both sides (the logo also reads from the glass side).
      const r = atlas.rect(i);
      for (const [z, flip] of [
        [-0.75, false],
        [-0.815, true],
      ] as [number, boolean][]) {
        const g = new THREE.PlaneGeometry(0.85, 2.0);
        const uv = g.getAttribute("uv");
        for (let k = 0; k < uv.count; k++) uv.setXY(k, r.u0 + (r.u1 - r.u0) * uv.getX(k), r.v0 + (r.v1 - r.v0) * uv.getY(k));
        g.translate(0, 1.08, 0);
        if (flip) g.rotateY(Math.PI);
        g.translate(0, 0, z);
        banners[pose.floor].push(g.applyMatrix4(at));
      }
      const pick = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.2, 1.6), new THREE.MeshBasicMaterial({ visible: false }));
      pick.name = `joki-stand-${c.id}`;
      pick.position.set(pose.x, y + 1.1, pose.z);
      pick.rotation.y = pose.yaw;
      pick.userData.pickId = c.id;
      group.add(pick);
      pickables.push(pick);
      for (const s2 of [-0.45, 0.45]) {
        const sx = pose.x + Math.cos(pose.yaw) * s2 + Math.sin(pose.yaw) * 0.85;
        const sz = pose.z - Math.sin(pose.yaw) * s2 + Math.cos(pose.yaw) * 0.85;
        stools.push({ x: sx, y, z: sz, yaw: pose.yaw + Math.PI });
      }
      // Name only: the floor tags carry the floor, and both floors' stands are in sight at once
      // in the Floors view, where longer labels ran into each other.
      const lw = opts.toWorld(pose.x, y + STAND_LABEL_HEIGHTS[0], pose.z);
      addPlaced(makeLabel(c.name, "company", lw.x, lw.y, lw.z, "joki-floors"), pose.floor, [pose.x, pose.z], STAND_LABEL_HEIGHTS);
    });
    rollBack.dispose();
    for (const floor of [2, 3] as const) {
      const mesh = new THREE.Mesh(merge(banners[floor]), rollMat);
      mesh.name = `joki:rollups-f${floor}`;
      (floor === 2 ? f2 : f3).add(mesh);
    }
    const m = new THREE.Matrix4();
    for (const floor of [2, 3] as const) {
      const list = stools.filter((s2) => (floor === 2 ? s2.y < 4 : s2.y > 4));
      const im = new THREE.InstancedMesh(stool, uber, list.length);
      list.forEach((s2, i) => im.setMatrixAt(i, instanceMatrix(s2.x, s2.y, s2.z, s2.yaw, 1, 1, 1, m)));
      im.name = `joki:stools-f${floor}`;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      (floor === 2 ? f2 : f3).add(im);
    }
  }

  // ── Floor 2 west: Turku Futurescapes exhibition = the event's Chill Zone ──
  {
    const y = Y.f2;
    const { texture: map, ready: mapReady } = mapWall({ px: low ? 512 : 1024 });
    owned.push(map);
    readies.push(mapReady);
    // The aerial-map print is backlit a little (exhibition lighting): it reads from across the floor.
    const mapMat = mats.plain("tower-map", "tower", { map, roughness: 0.6, emissiveMap: map, emissive: new THREE.Color(0.14, 0.14, 0.14) });
    // Charcoal partition with the Futurescapes aerial-map graphic on both faces, a screen on the south
    // face, and a screen on the kiosk.
    batch.add(f2, uber, CHARCOAL(wallSeg([-6.5, 2.62], [-1.95, 2.62], 0.14, y, y + 2.7)), { receive: true });
    for (const [z, yaw] of [
      [2.545, Math.PI],
      [2.695, 0],
    ] as [number, number][]) {
      const face = new THREE.PlaneGeometry(4.2, 2.2);
      face.rotateY(yaw);
      face.translate(-4.22, y + 1.35, z);
      batch.add(f2, mapMat, face);
    }
    {
      const pws = wallScreen(1.1, 0.62);
      batch.add(f2, uber, BLACK(place(pws.bezel.clone(), -3.0, y + 1.75, 2.72, 0)), { receive: true });
      batch.add(f2, screenMat, place(pws.screen.clone(), -3.0, y + 1.75, 2.72, 0));
      pws.bezel.dispose();
      pws.screen.dispose();
    }
    // White kiosk with a display, two digital tables by the glass.
    batch.add(f2, uber, WHITE(box(1.2, 0.95, 0.7, -5.58, y, 1.86)), { receive: true });
    const ws = wallScreen(1.2, 0.68);
    batch.add(f2, uber, BLACK(place(ws.bezel.clone(), -5.58, y + 1.9, 2.25, Math.PI)), { receive: true });
    batch.add(f2, screenMat, place(ws.screen.clone(), -5.58, y + 1.9, 2.25, Math.PI));
    ws.bezel.dispose();
    ws.screen.dispose();
    for (const [x, z, yaw] of [
      [-5.75, -6.27, 0.6],
      [-7.63, -3.41, 1.2],
    ] as [number, number, number][]) {
      batch.add(f2, uber, BLACK(box(1.3, 0.8, 0.85, x, y, z, yaw)), { receive: true });
      const top = new THREE.PlaneGeometry(1.15, 0.72);
      top.rotateX(-Math.PI / 2);
      top.rotateY(yaw);
      top.translate(x, y + 0.805, z);
      batch.add(f2, screenMat, metreUV(top));
    }
    // VR chairs (white shell, blue inside) and soft seats for the Chill Zone.
    const egg = eggChair();
    for (const [x, z, yaw] of [
      [-3.2, -5.6, 2.6],
      [-6.9, 0.1, 1.9],
    ] as [number, number, number][]) {
      batch.add(f2, uber, [WHITE(place(egg.shell.clone(), x, y, z, yaw)), FABRIC(place(egg.inner.clone(), x, y, z, yaw), "#2f63b8")], { receive: true });
    }
    egg.shell.dispose();
    egg.inner.dispose();
    // Big round poufs, 0.9–1.3 m across (photos: lime, violet-blue, teal).
    for (const [x, z, r, col] of CHILL_POUFS) {
      const pf = pouf(r, 0.42);
      batch.add(f2, uber, FABRIC(place(pf, x, y, z), col), { receive: true });
    }
    const lw = opts.toWorld(-4.65, y + 1.6, -0.17);
    addPlaced(makeLabel("Chill Zone", "area", lw.x, lw.y, lw.z, "joki-floors"), 2, [-4.65, -0.17], [1.6, 1.2, 0.9]);
    // Invisible pick proxy for the Chill Zone.
    const proxy = new THREE.Mesh(
      prism(
        [
          [-0.3, -8.9],
          [-0.6, 9.1],
          [-6.0, 7.0],
          [-9.0, 0],
          [-6.0, -7.0],
        ],
        y,
        y + 1.0,
      ),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    proxy.userData.pickId = "chill-zone";
    f2.add(proxy);
    pickables.push(proxy);
  }

  // ── Floor 3 west: four dark timber bleachers, ottomans, coat racks ──
  {
    const y = Y.f3;
    // Dark oak (SPEC #4a3a30) with a black nosing on every tread.
    const oak = mats.get("oak", "tower", { color: "#4a3a30", roughness: 0.55 }, "jk-bleacher-oak");
    const bl = bleacher(1.6, 0.45, 0.42);
    for (const b of [315, 293, 270, 247]) {
      const [x, z] = polar(7.75, b);
      const yaw = yawToBearing(b) + Math.PI;
      // Steps rise towards the glass (the back); people face the middle.
      batch.add(f3, oak, place(bl.clone(), x, y, z, yaw), { receive: true });
      const nosings: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 3; i++) nosings.push(box(1.6, 0.02, 0.025, 0, 0.42 * (i + 1) - 0.012, 0.45 * (1 - i) + 0.2125));
      batch.add(f3, uber, BLACK(place(merge(nosings), x, y, z, yaw)), { receive: true });
    }
    bl.dispose();
    const ott = pouf(0.45, 0.42);
    const colours = ["#b1b13b", "#5a5ccc", "#255d69", "#8a8f94"];
    let k = 0;
    for (const b of [336, 342, 222, 228]) {
      const [x, z] = polar(7.7, b);
      batch.add(f3, uber, FABRIC(place(ott.clone(), x, y, z), colours[k++ % colours.length]), { receive: true });
    }
    ott.dispose();
    for (const b of [348, 356]) {
      const [x, z] = polar(8.4, b);
      batch.add(f3, uber, [STEEL(rod([x, y, z], [x, y + 1.75, z], 0.02)), STEEL(rod([x - 0.6, y + 1.7, z], [x + 0.6, y + 1.7, z], 0.015))], { receive: true });
    }
  }

  batch.flush();
  return {
    cutCore(floor, on) {
      const c = coreCut[floor];
      c.group.scale.y = on ? Math.min(1, 1.3 / c.height) : 1;
      if (floor === 2) stairHigh.visible = !on;
    },
    f2,
    f2Ceil,
    f3,
    f3Ceil,
    labels2,
    labels3,
    updateLabels(cam, left, state) {
      let changed = false;
      const ll = Math.hypot(left.x, left.z);
      for (const p of placed) {
        const fy = p.floor === 2 ? Y.f2 : Y.f3;
        let spot: [number, number, number] | null = null;
        if (!p.at) {
          // Standing inside, the floor is known; outside, the tag rides the drum's left edge.
          if (!state.inside && ll > 1e-3) spot = [(left.x / ll) * FLOOR_TAG_R, fy + p.heights[0], (left.z / ll) * FLOOR_TAG_R];
        } else {
          const h = standLabelHeight(cam, p.floor, p.at[0], p.at[1], state.f3, p.heights);
          // Standing on the floor, a stand round the other side of the core is out of sight.
          const onFloor = state.inside && cam.y > fy && cam.y < fy + 3.5;
          if (h !== null && !(onFloor && coreHides(cam, p.at[0], p.at[1]))) spot = [p.at[0], fy + h, p.at[1]];
        }
        const key = spot ? `${spot[0].toFixed(2)},${spot[1].toFixed(2)},${spot[2].toFixed(2)}` : "-";
        if (key === p.key) continue;
        p.key = key;
        changed = true;
        p.wrap.visible = spot !== null;
        if (spot) p.label.position.copy(opts.toWorld(...spot));
      }
      return changed;
    },
    pickables,
    labels,
    ready: Promise.all(readies),
    dispose() {
      for (const o of owned) o.dispose();
    },
  };
}

function polarXZ(r: number, b: number, y: number): [number, number, number] {
  const [x, z] = polar(r, b);
  return [x, y, z];
}

/** Round plate (radius r) from y0 to y1 with a rectangular hole; sides only on the outside (when `edge`). */
function plateWithHole(r: number, hole: V2[], y0: number, y1: number, edge: boolean): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r, 0, Math.PI * 2, false);
  if (hole.length) {
    const path = new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z)).reverse());
    shape.holes.push(path);
  }
  const top = new THREE.ShapeGeometry(shape, 48);
  top.rotateX(-Math.PI / 2);
  top.translate(0, y1, 0);
  const parts = [metreUV(top)];
  if (edge) {
    const bottom = new THREE.ShapeGeometry(shape, 48);
    bottom.rotateX(Math.PI / 2);
    bottom.translate(0, y0, 0);
    parts.push(metreUV(bottom));
    const side = new THREE.CylinderGeometry(r, r, y1 - y0, 96, 1, true);
    side.translate(0, (y0 + y1) / 2, 0);
    parts.push(metreUV(side));
  }
  return merge(parts);
}

/**
 * A stair stringer: a steel plate (thickness `t`, at plan x) whose top edge runs from (zA, yA) to
 * (zB, yB), `depth` deep below it.
 */
function slopedPlate(x: number, zA: number, yA: number, zB: number, yB: number, depth: number, t: number): THREE.BufferGeometry {
  const shape = new THREE.Shape([new THREE.Vector2(zA, yA), new THREE.Vector2(zB, yB), new THREE.Vector2(zB, yB - depth), new THREE.Vector2(zA, yA - depth)]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
  // Shape x = plan z, shape y = height, extruded along +z → turn the extrusion onto plan x.
  g.rotateY(-Math.PI / 2);
  g.translate(x + t / 2, 0, 0);
  return metreUV(g);
}

/** Spiral-seam duct between two points (radius r): UVs in seam tiles — u once round, v every 0.15 m along. */
function spiralDuct(a: [number, number, number], b: [number, number, number], r: number, radial: number): THREE.BufferGeometry {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const len = va.distanceTo(vb);
  const g = new THREE.CylinderGeometry(r, r, len, radial, 1, true);
  const uv = g.getAttribute("uv");
  const pos = g.getAttribute("position");
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), (pos.getY(i) + len / 2) / 0.15);
  // End caps (closed duct ends at the glass).
  const caps = [new THREE.CircleGeometry(r, radial), new THREE.CircleGeometry(r, radial)];
  caps[0].rotateX(-Math.PI / 2).translate(0, len / 2, 0);
  caps[1].rotateX(Math.PI / 2).translate(0, -len / 2, 0);
  const merged = merge([g, ...caps]);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
  merged.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return merged;
}

/** Turn an up-facing cap into a down-facing one (ceilings). */
function flipCap(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const idx = g.getIndex();
  if (idx) {
    const a = idx.array as Uint16Array | Uint32Array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = t;
    }
    idx.needsUpdate = true;
  }
  const n = g.getAttribute("normal");
  for (let i = 0; i < n.count; i++) n.setY(i, -n.getY(i));
  return g;
}
