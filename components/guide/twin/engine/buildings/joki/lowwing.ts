import * as THREE from "three";
import type { TwinContext, V2, V3 } from "../../types";
import { EVENT_VIOLET } from "../../render/canvas";
import { Batcher, Y, box, cylinder, glow, instanceMatrix, metreUV, pbr, polar, prism, rod, wallSeg } from "./kit";
import type { JokiMaterials } from "./mats";
import { JOKI_LUMINANCE } from "./mats";
import { F1_EXIT, F1_YARD } from "./walls";
import { boardFormed, boltedPanels } from "./textures";
import { makeCanvas, canvasTexture, fontReady, wordmark } from "../../render/canvas";

/**
 * Joki's one-storey low part (SPEC §3.2.3): the hall roof (LOD2 outline,
 * membrane +2.87, edge +3.22) with the public walkway from the rainbow
 * stair to the tower, the Aula's glazed north-west facade, the stepped ramp
 * to Pihakansi, the Lemminkäisenkatu 12b portal (aluminium canopy, three-bay
 * glazing, sliding doors) with the rainbow stair, and the loading-dock face.
 * The street door is cordoned off during the event.
 */

export interface LowWing {
  /** Facades, canopy, stairs (always visible). */
  ext: THREE.Group;
  /** Hall roof with the walkway (hidden in the floor-1 dollhouse). */
  roof: THREE.Group;
  setNight(night: number): void;
  ready: Promise<unknown>;
  dispose(): void;
}

/** Hall roof outline (LOD2, J frame), following the tower at r 9.35 on its south side. */
export function hallRoofOutline(): V2[] {
  const arc: V2[] = [];
  for (let b = 99.7; b <= 188.5; b += 4) arc.push(polar(9.36, b));
  return [
    [14.5, -1.3],
    [9.4, -1.3],
    [9.4, 1.6],
    ...arc,
    [-2.2, 10.2],
    [-7.6, 28.9],
    [-12.5, 27.3],
    [-15.9, 38.7],
    [-23.1, 62.7],
    [-14.7, 62.7],
    [-14.5, 52.5],
    [-13.0, 49.0],
    [-11.1, 48.9],
    [-11.1, 44.0],
    [13.9, 44.0],
    [14.2, 8.3],
  ];
}

/** Free (exterior) edges of the hall roof that get a parapet: NW edge and the loading-dock face. */
const FREE_EDGES: [V2, V2][] = [
  [
    [-2.2, 10.2],
    [-7.6, 28.9],
  ],
  [
    [-7.6, 28.9],
    [-12.5, 27.3],
  ],
  [
    [14.5, -1.3],
    [9.4, -1.3],
  ],
];

/** The public walkway on the roof (OSM w625297905), J frame. */
export const WALKWAY: V2[] = [
  [-12.6, 52.3],
  [-12.4, 48.4],
  [-11.6, 44.5],
  [-4.9, 25.4],
  [-1.6, 15.4],
  [2.2, 11.9],
  [8.2, 7.0],
  [10.4, 3.4],
  [11.05, -0.9],
];

/** Lemminkäisenkatu 12b portal (J): glass line z 58.8, canopy front z 62.9. */
export const PORTAL = { glassZ: 58.8, frontZ: 62.9, x0: -21.82, x1: -12.41, frontX0: -23.13, frontX1: -12.42, innerZ: 54.5 };
/** Rainbow stair (J): east of the canopy cheek, from the street (z 63.0) up to the roof walkway (z 52.4). */
export const RAINBOW = { x0: -13.53, x1: -11.68, zBottom: 63.0, zTop: 52.4, risers: 26 };

export function buildLowWing(ctx: TwinContext, mats: JokiMaterials): LowWing {
  const low = ctx.tier === "low";
  const ext = new THREE.Group();
  ext.name = "joki-lowwing";
  const roof = new THREE.Group();
  roof.name = "joki-hallroof";
  const batch = new Batcher();
  const owned: { dispose(): void }[] = [];
  const readies: Promise<unknown>[] = [];

  // ── Materials ──
  const membrane = mats.get("asphaltFootway", "ext", { color: "#8a8d8f" }, "jk-membrane");
  const pavers = mats.get("pavers", "ext", { color: "#d2c7bd", tile: [1.2, 1.2] }, "jk-walkway");
  const panels = boltedPanels({ base: "#c3c6c8", seed: 43 });
  owned.push(panels.texture);
  const alu = mats.get("panelGrey", "ext", { roughness: 0.55, metalness: 0.35 }, "jk-alu");
  alu.map = panels.texture;
  alu.color.set("#ffffff");
  const soffitPanels = boltedPanels({ base: "#8c8c8e", pw: 1.2, ph: 1.2, seed: 47 });
  owned.push(soffitPanels.texture);
  const soffit = mats.get("panelGrey", "ext", { roughness: 0.6 }, "jk-soffit");
  soffit.map = soffitPanels.texture;
  soffit.color.set("#ffffff");
  const board = boardFormed({ px: low ? 512 : 1024, seed: 37 });
  owned.push(board.texture);
  const concrete = mats.get("concreteFacade", "ext", { roughness: 1.0 }, "jk-ext-concrete");
  concrete.map = board.texture;
  concrete.color.set("#ffffff");
  // Street-level glazing mirrors the buildings across the street more than open sky: weaker reflections.
  const glass = mats.glass("ext", { opacity: 0.12, roughness: 0.03, envMapIntensity: 0.32 }, "jk-glass-low");
  glass.normalScale.set(0.008, 0.008);
  const treadMat = mats.get("concreteFloor", "ext", { color: "#bdbab4", roughness: 0.72 }, "jk-tread-grey");
  // Flat-painted parts (frames, rails, coping, tiles, roof lights): the exterior uber material.
  const uber = mats.uber("ext");
  const COPING = (g: THREE.BufferGeometry) => pbr(g, "#dadde0", 0.5, 0);
  const FRAME = (g: THREE.BufferGeometry) => pbr(g, "#c8cbcd", 0.4, 1);
  const DARK = (g: THREE.BufferGeometry) => pbr(g, "#26292c", 0.5, 0.5);
  const RAIL_DARK = (g: THREE.BufferGeometry) => pbr(g, "#1d2023", 0.55, 0.6);
  const STAINLESS = (g: THREE.BufferGeometry) => pbr(g, "#c9cbcc", 0.32, 1);
  const ROOF_LIGHT = (g: THREE.BufferGeometry) => pbr(g, "#20262c", 0.08, 0);
  // Exterior fittings that switch on at dusk: one glow material, dimmed as a whole (material colour).
  const nightGlow = mats.glow("ext-night");
  const DOWNLIGHT = mats.lampColor(JOKI_LUMINANCE.downlight, 3000, undefined, true);
  const WALLLIGHT = mats.lampColor(1.5, 3000, undefined, true);

  // ── Hall roof: slab from the ceiling to the membrane, parapets on the free edges ──
  const outline = hallRoofOutline();
  batch.add(roof, membrane, prism(outline, Y.aulaCeil + 0.02, Y.hallRoof, { top: true, sides: true }), { cast: true, receive: true });
  // The roof void's underside, a metre over the ceilings: wherever a gap shows past a ceiling's edge, it
  // closes on dark structure instead of the sky through the membrane's back face.
  batch.add(roof, membrane, prism(outline, Y.hallRoof - 0.45, Y.hallRoof - 0.44, { top: false, bottom: true, sides: false }));
  // Parapets on the free edges stay with the walls when the roof is lifted off (dollhouse).
  for (const [a, b] of FREE_EDGES) {
    batch.add(ext, alu, wallSeg(a, b, 0.25, Y.aulaCeil - 0.05, Y.hallEdge), { cast: true, receive: true });
    batch.add(ext, uber, COPING(wallSeg(a, b, 0.32, Y.hallEdge, Y.hallEdge + 0.05)), { receive: true });
  }
  // Roof lights (≈1 m, dark glass) over the Aula and the Cave.
  const rl: THREE.BufferGeometry[] = [];
  const rlGlass: THREE.BufferGeometry[] = [];
  for (const [x, z] of [
    [-6.0, 33.0],
    [-3.0, 38.0],
    [-9.0, 40.5],
    [0.5, 41.0],
    [-11.0, 47.0],
    [3.5, 12.0],
    [8.0, 12.5],
    [12.0, 15.0],
    [4.5, 19.5],
    [9.5, 22.5],
  ] as V2[]) {
    rl.push(box(1.1, 0.18, 1.1, x, Y.hallRoof, z));
    rlGlass.push(box(0.95, 0.02, 0.95, x, Y.hallRoof + 0.18, z));
  }
  batch.add(roof, uber, [...rl.map(COPING), ...rlGlass.map(ROOF_LIGHT)], { receive: true });

  // Walkway: pale pavers 2.4 m wide, a step up from the membrane.
  {
    const path = WALKWAY;
    for (let i = 1; i < path.length; i++) {
      batch.add(roof, pavers, wallSeg(path[i - 1], path[i], 2.4, Y.hallRoof, Y.hallRoof + 0.04), { receive: true });
    }
    // The landing at the top of the rainbow stair reaches past the hall roof's edge: a slab under it.
    batch.add(roof, membrane, wallSeg(path[0], path[1], 2.4, Y.hallRoof - 0.45, Y.hallRoof), { cast: true, receive: true });
    // Joints at the bends (round pads hide the mitres).
    for (const p of path.slice(1, -1)) batch.add(roof, pavers, cylinder(1.2, Y.hallRoof, Y.hallRoof + 0.04, p[0], p[1], 20));
    // Paving up to the tower's south-south-west door (J 158°).
    batch.add(roof, pavers, wallSeg(polar(9.4, 158), polar(11.4, 160), 1.9, Y.hallRoof, Y.hallRoof + 0.04), { receive: true });
    // Five steps down from the walkway to the deck north of the lounge exit (OSM 625297909).
    for (let i = 0; i < 5; i++) {
      const z = -1.3 - 0.3 * i;
      batch.add(ext, treadMat, box(2.2, Y.hallRoof - 0.13 * (i + 1) - (Y.deck - 0.4), 0.3, 11.05, Y.deck - 0.4, z - 0.15), { cast: !low, receive: true });
    }
  }
  // Dark vertical-bar railing along the NW roof edge (photo: Joki façade, Arosuo).
  {
    const bars: { x: number; z: number; yaw: number }[] = [];
    const tops: THREE.BufferGeometry[] = [];
    for (const [a, b] of FREE_EDGES.slice(0, 2)) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.floor(len / (low ? 0.24 : 0.12));
      const yaw = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        bars.push({ x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, yaw });
      }
      tops.push(wallSeg(a, b, 0.05, Y.hallEdge + 1.05, Y.hallEdge + 1.1));
    }
    const bar = RAIL_DARK(box(0.02, 1.05, 0.02, 0, 0, 0));
    const im = new THREE.InstancedMesh(bar, uber, bars.length);
    const m = new THREE.Matrix4();
    bars.forEach((p, i) => im.setMatrixAt(i, instanceMatrix(p.x, Y.hallEdge + 0.05, p.z, p.yaw, 1, 1, 1, m)));
    im.name = "joki:roof-railing";
    im.receiveShadow = true;
    ext.add(im);
    batch.add(ext, uber, tops.map(RAIL_DARK), { receive: true });
  }

  // ── NW facade: Aula/ramp glazing under the roof overhang ──
  {
    const line: V2[] = [
      [-1.0, 8.75],
      [-1.0, 10.46],
      [-2.8, 16.5],
      [-3.23, 18.07],
      [-4.85, 23.59],
      [-4.94, 23.89],
      [-6.46, 29.07],
    ];
    const panes: THREE.BufferGeometry[] = [];
    const mullions: THREE.BufferGeometry[] = [];
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.4) continue;
      const y0 = Math.min(rampAt(a[1]), rampAt(b[1])) - 0.05;
      panes.push(wallSeg(a, b, 0.02, y0, Y.aulaCeil));
      const n = Math.max(1, Math.round(len / 1.2));
      for (let k = 0; k <= n; k++) {
        const t = k / n;
        const p: V2 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        mullions.push(box(0.06, Y.aulaCeil - y0, 0.14, p[0], y0, p[1], -Math.atan2(b[1] - a[1], b[0] - a[0])));
      }
      // Head and sill profiles.
      mullions.push(wallSeg(a, b, 0.16, Y.aulaCeil - 0.08, Y.aulaCeil));
      mullions.push(wallSeg(a, b, 0.16, y0, y0 + 0.08));
    }
    batch.add(ext, glass, panes);
    batch.add(ext, uber, mullions.map(DARK), { receive: true });
    // Soffit of the roof overhang above the glazing.
    batch.add(
      ext,
      soffit,
      prism(
        [
          [-1.0, 8.75],
          [-2.2, 10.2],
          [-7.6, 28.9],
          [-6.46, 29.07],
          [-4.94, 23.89],
          [-3.23, 18.07],
          [-1.0, 10.46],
        ],
        Y.aulaCeil - 0.02,
        Y.aulaCeil,
        { top: false, bottom: true, sides: false },
      ),
    );
  }

  // ── Stepped ramp from the NW doors up to Pihakansi, between the glazing and the retaining wall ──
  {
    const foot: V2 = [-9.77, 27.66];
    const head: V2 = [-5.11, 15.7];
    const n = 15;
    const dir: V2 = [(head[0] - foot[0]) / n, (head[1] - foot[1]) / n];
    const len = Math.hypot(dir[0], dir[1]);
    const yaw = -Math.atan2(dir[1], dir[0]);
    const treads: THREE.BufferGeometry[] = [];
    for (let i = 0; i < n; i++) {
      const x = foot[0] + dir[0] * (i + 0.5);
      const z = foot[1] + dir[1] * (i + 0.5);
      const top = Y.aula + ((Y.pihakansi - Y.aula) * (i + 1)) / n;
      const g = new THREE.BoxGeometry(len + 0.02, top - (Y.aula - 0.3), 3.2);
      g.translate(0, (top + (Y.aula - 0.3)) / 2, 0);
      g.rotateY(yaw);
      g.translate(x, 0, z);
      treads.push(metreUV(g));
    }
    batch.add(ext, treadMat, treads, { cast: !low, receive: true });
    for (const poly of F1_YARD) batch.add(ext, concrete, prism(poly, Y.aula - 0.3, Y.pihakansi + 0.15), { cast: true, receive: true });
    // Walls of the Company Lounge's exit stair down to the service yard (CAD), seen from the yard.
    for (const poly of F1_EXIT) batch.add(ext, concrete, prism(poly, Y.serviceYard, Y.hallRoof), { cast: true, receive: true });
    // Handrail along the ramp.
    const off: V2 = [Math.sin(yaw) * 1.5, Math.cos(yaw) * 1.5];
    batch.add(ext, uber, STAINLESS(rod([foot[0] + off[0], Y.aula + 0.9, foot[1] + off[1]], [head[0] + off[0], Y.pihakansi + 0.9, head[1] + off[1]], 0.022, 8)), { receive: true });
  }

  // ── Lemminkäisenkatu 12b portal ──
  {
    const P = PORTAL;
    const street = Y.street;
    // Canopy box: roof slab + front fascia (4.6 m high at the street, soffit sloping to 3.0 m at the glass).
    const front = street + 4.6;
    const back = street + 3.0;
    const top = Y.hallEdge;
    const outline: V2[] = [
      [P.x0, P.glassZ],
      [P.x1, P.glassZ],
      [P.frontX1, P.frontZ],
      [P.frontX0, P.frontZ],
    ];
    batch.add(ext, alu, prism(outline, front, top), { cast: true, receive: true });
    // Fascia band (deep frame) at the front.
    batch.add(ext, alu, wallSeg([P.frontX0 - 0.15, P.frontZ + 0.15], [P.frontX1 + 0.15, P.frontZ + 0.15], 0.3, front - 0.55, top + 0.05), { cast: true, receive: true });
    // Sloping soffit with recessed downlights.
    {
      const g = new THREE.BufferGeometry();
      const v: V3[] = [
        [P.frontX0, front, P.frontZ],
        [P.frontX1, front, P.frontZ],
        [P.x1, back, P.glassZ],
        [P.x0, back, P.glassZ],
      ];
      g.setAttribute("position", new THREE.Float32BufferAttribute(v.flat(), 3));
      g.setIndex([0, 1, 2, 0, 2, 3]);
      g.computeVertexNormals();
      if (g.getAttribute("normal").getY(0) > 0) g.setIndex([0, 2, 1, 0, 3, 2]);
      g.computeVertexNormals();
      batch.add(ext, soffit, metreUV(g));
      // Fill between the sloping soffit and the canopy slab (side faces under the slab).
      for (const [a, b, c] of [
        [v[0], v[3], [P.x0, front, P.glassZ] as V3],
        [v[1], v[2], [P.x1, front, P.glassZ] as V3],
      ] as [V3, V3, V3][]) {
        const t = new THREE.BufferGeometry();
        t.setAttribute("position", new THREE.Float32BufferAttribute([...a, ...b, ...c], 3));
        t.setIndex([0, 1, 2, 0, 2, 1]);
        t.computeVertexNormals();
        batch.add(ext, alu, metreUV(t));
      }
      const disc = new THREE.CircleGeometry(0.06, 14);
      disc.rotateX(Math.PI / 2);
      const lights: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 3; i++)
        for (let k = 0; k < 4; k++) {
          const u = (k + 0.5) / 4;
          const w = 0.25 + i * 0.25;
          const z = P.frontZ + (P.glassZ - P.frontZ) * w;
          const x = P.frontX0 + (P.frontX1 - P.frontX0) * u + (P.x0 - P.frontX0) * w * (1 - u);
          const y = front + (back - front) * w - 0.01;
          lights.push(disc.clone().translate(x, y, z));
        }
      disc.dispose();
      batch.add(ext, nightGlow, lights.map((g) => glow(g, DOWNLIGHT)));
    }
    // Cheek walls (CAD 38 / 39) from the street to the canopy.
    batch.add(ext, alu, wallSeg([-21.6, 58.9], [-22.75, 62.95], 0.42, street - 0.3, top), { cast: true, receive: true });
    batch.add(ext, alu, wallSeg([-13.71, 58.9], [-13.71, 62.95], 0.36, street - 0.3, top), { cast: true, receive: true });
    // Three-bay glazing with a transom, central sliding double door.
    const gl: THREE.BufferGeometry[] = [];
    const fr: THREE.BufferGeometry[] = [];
    const glassTop = back - 0.05;
    gl.push(wallSeg([P.x0 + 0.1, P.glassZ], [P.x1 - 0.1, P.glassZ], 0.02, street, glassTop));
    const bays = 3;
    for (let i = 0; i <= bays; i++) {
      const x = P.x0 + 0.1 + ((P.x1 - P.x0 - 0.2) * i) / bays;
      fr.push(box(0.09, glassTop - street, 0.14, x, street, P.glassZ));
    }
    fr.push(wallSeg([P.x0 + 0.1, P.glassZ], [P.x1 - 0.1, P.glassZ], 0.14, street + 2.35, street + 2.45));
    fr.push(wallSeg([P.x0 + 0.1, P.glassZ], [P.x1 - 0.1, P.glassZ], 0.14, glassTop - 0.08, glassTop));
    const mid = (P.x0 + P.x1) / 2;
    for (const dx of [-0.75, 0, 0.75]) fr.push(box(dx === 0 ? 0.05 : 0.07, 2.35, 0.08, mid + dx, street, P.glassZ - 0.05));
    fr.push(box(1.8, 0.14, 0.2, mid, street + 2.32, P.glassZ - 0.1));
    batch.add(ext, glass, gl);
    batch.add(ext, uber, fr.map(FRAME), { receive: true });
    // Inner lobby glass line (wind lobby) and the vestibule floor.
    batch.add(ext, glass, wallSeg([-20.25, P.innerZ], [-14.83, P.innerZ], 0.02, Y.aula, Y.aulaCeil));
    batch.add(ext, uber, FRAME(wallSeg([-20.25, P.innerZ], [-14.83, P.innerZ], 0.1, Y.aula + 2.35, Y.aula + 2.45)), { receive: true });
    batch.add(ext, treadMat, prism(
      [
        [-20.82, 58.8],
        [-19.59, 54.59],
        [-13.89, 54.59],
        [-13.89, 58.8],
      ],
      street - 0.2,
      (street + Y.aula) / 2,
      { sides: false },
    ));
    // Paving under the canopy.
    batch.add(ext, pavers, prism(outline, street - 0.2, street + 0.02, { sides: false }), { receive: true });
    // House-number plate and the event notice share one texture (signAtlas); a slim dark totem by the door.
    const signs = signAtlas();
    owned.push(signs.texture);
    readies.push(signs.ready);
    // Matte prints under the canopy: little open sky to mirror (a glossy navy board read grey in daylight).
    const signMat = mats.plain("signs", "ext", {
      map: signs.texture,
      roughness: 0.85,
      envMapIntensity: 0.3,
      emissiveMap: signs.texture,
      emissive: new THREE.Color(0.1, 0.1, 0.1),
    });
    // House number on the outside of the left bay's glass.
    batch.add(ext, signMat, signs.uv(box(0.9, 0.45, 0.02, -20.6, street + 2.05, 58.84), "plate"));
    batch.add(ext, uber, DARK(box(0.35, 2.2, 0.35, -15.2, street, 62.2)), { receive: true });

    // Event: the door is cordoned off (organiser's Joki map: "Alue rajataan / Ei ulos-/sisäänkäyntiä").
    const posts: THREE.BufferGeometry[] = [];
    const xs = [-21.4, -19.2, -17.0, -14.8];
    for (const x of xs) {
      posts.push(cylinder(0.03, street, street + 0.98, x, 61.6, 10));
      posts.push(cylinder(0.17, street, street + 0.03, x, 61.6, 16));
    }
    batch.add(
      ext,
      uber,
      [
        ...posts.map(STAINLESS),
        pbr(wallSeg([xs[0], 61.6], [xs[xs.length - 1], 61.6], 0.01, street + 0.86, street + 0.92), EVENT_VIOLET, 0.5, 0),
        DARK(box(0.05, 1.0, 0.05, -18.1, street, 61.4)),
      ],
      { receive: true },
    );
    batch.add(ext, signMat, signs.uv(box(0.62, 0.86, 0.03, -18.1, street + 0.98, 61.42), "notice"));
  }

  // ── Rainbow stair (sateenkaariportaat Jussinaukiolle) ──
  {
    const R = RAINBOW;
    const colours = ["#d8763a", "#c0353a", "#6b4a8a", "#2f5db0", "#8f9f4a", "#e0c83c"];
    const n = R.risers;
    const rise = (Y.hallRoof - Y.street) / n;
    const landingAfter = 13;
    const landing = 1.4;
    const run = R.zBottom - R.zTop - landing;
    const going = run / (n - 2);
    const risersG: THREE.BufferGeometry[] = [];
    const treads: THREE.BufferGeometry[] = [];
    let z = R.zBottom;
    const width = R.x1 - R.x0;
    const cx = (R.x0 + R.x1) / 2;
    for (let i = 0; i < n; i++) {
      const y0 = Y.street + rise * i;
      const y1 = y0 + rise;
      // Riser (coloured tile face, facing the street = +z).
      const g = new THREE.PlaneGeometry(width - 0.02, rise);
      // Just proud of the tread block's front face.
      g.translate(cx, (y0 + y1) / 2, z + 0.004);
      // Glazed ceramic tiles: glossy but not mirror-like.
      risersG.push(pbr(metreUV(g), colours[i % colours.length], 0.42, 0));
      const depth = i === landingAfter - 1 ? landing : i === n - 1 ? 0.5 : going;
      treads.push(box(width - 0.02, y1 - (Y.street - 0.3), depth, cx, Y.street - 0.3, z - depth / 2));
      z -= depth;
    }
    batch.add(ext, uber, risersG, { receive: true });
    batch.add(ext, treadMat, treads, { cast: !low, receive: true });
    // Aluminium parapet wall on the east side (1.1 m over the pitch line), the vestibule wall on the west.
    const pts: [number, number][] = [];
    let zz = R.zBottom;
    const prof: [number, number][] = [[zz, Y.street]];
    for (let i = 0; i < n; i++) {
      const depth = i === landingAfter - 1 ? landing : i === n - 1 ? 0.5 : going;
      zz -= depth;
      prof.push([zz, Y.street + rise * (i + 1)]);
    }
    for (const [zp, yp] of prof) pts.push([zp, yp + 1.1]);
    for (const [zp] of prof.slice().reverse()) pts.push([zp, Y.street - 0.3]);
    const shape = new THREE.Shape(pts.map(([zp, yp]) => new THREE.Vector2(zp, yp)));
    const wall = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: false, curveSegments: 1 });
    // Shape x = plan z, shape y = height; extrude along x.
    wall.rotateY(-Math.PI / 2);
    wall.translate(R.x1 + 0.16, 0, 0);
    batch.add(ext, alu, metreUV(wall), { cast: true, receive: true });
    batch.add(ext, alu, wallSeg([R.x0 - 0.18, R.zBottom], [R.x0 - 0.18, R.zTop], 0.36, Y.street - 0.3, Y.hallEdge), { cast: true, receive: true });
    // Stainless handrails both sides, small wall lights in the parapet.
    const rails: THREE.BufferGeometry[] = [];
    const lights: THREE.BufferGeometry[] = [];
    for (const x of [R.x0 + 0.06, R.x1 - 0.06]) {
      const path: V3[] = prof.map(([zp, yp]) => [x, yp + 0.9, zp] as V3);
      for (let i = 1; i < path.length; i++) rails.push(rod(path[i - 1], path[i], 0.02, 8));
    }
    for (let i = 2; i < prof.length; i += 4) {
      const [zp, yp] = prof[i];
      lights.push(box(0.02, 0.06, 0.18, R.x1 - 0.005, yp + 0.25, zp));
    }
    batch.add(ext, uber, rails.map(STAINLESS), { receive: true });
    batch.add(ext, nightGlow, lights.map((g) => glow(g, WALLLIGHT)));
  }

  // ── Loading-dock face of the storage block (J x ≈ 15.4, z −1.6 … 8.5) ──
  {
    const x = 15.42;
    const facade: THREE.BufferGeometry[] = [];
    facade.push(wallSeg([x, -1.62], [x, 8.5], 0.1, Y.serviceYard, Y.hallEdge));
    batch.add(ext, concrete, facade, { cast: true, receive: true });
    const doors: THREE.BufferGeometry[] = [];
    for (const [z0, z1] of [
      [1.95, 4.6],
      [6.0, 7.7],
    ]) {
      doors.push(box(0.06, 3.0, z1 - z0, x + 0.06, Y.serviceYard, (z0 + z1) / 2));
    }
    batch.add(ext, uber, doors.map(DARK), { receive: true });
  }

  batch.flush();

  return {
    ext,
    roof,
    setNight(night) {
      nightGlow.color.setScalar(THREE.MathUtils.smoothstep(night, 0.05, 0.6));
    },
    ready: Promise.all(readies),
    dispose() {
      for (const o of owned) o.dispose();
    },
  };

  function rampAt(z: number): number {
    // Glazing bottoms follow the ramp floor next to it (−1.70 at the Aula, −1.10 at the drum).
    if (z >= 18.07) return Y.aula;
    if (z <= 8.57) return Y.f1;
    return Y.aula + ((18.07 - z) / (18.07 - 8.57)) * (Y.f1 - Y.aula);
  }
}

/**
 * One texture for the street door's signs: the house-number plate
 * ("12 b · Lemminkäisenkatu", left 512 px) and the event notice on the cordon
 * (door closed, enter Joki through BioCity; right 512 px). `uv()` maps a
 * sign's box geometry onto its half.
 */
function signAtlas(): { texture: THREE.CanvasTexture; ready: Promise<void>; uv(g: THREE.BufferGeometry, which: "plate" | "notice"): THREE.BufferGeometry } {
  const W = 1024;
  const H = 710;
  const { canvas, ctx } = makeCanvas(W, H);
  // Plate (left half, 512 × 256 in the middle).
  ctx.fillStyle = "#2a2c2f";
  ctx.fillRect(0, 0, 512, H);
  ctx.fillStyle = "#e9eaeb";
  ctx.fillRect(0, 227, 512, 256);
  // Notice (right half).
  const x0 = 512;
  ctx.fillStyle = "#0e0c1e";
  ctx.fillRect(x0, 0, 512, H);
  ctx.fillStyle = EVENT_VIOLET;
  ctx.fillRect(x0, 0, 512, 16);
  ctx.fillRect(x0, H - 16, 512, 16);
  const cx = x0 + 256;
  // Arrow: up the street to Tykistökatu — BioCity's entrance is round the corner.
  ctx.save();
  ctx.translate(cx, 590);
  ctx.fillStyle = EVENT_VIOLET;
  ctx.beginPath();
  ctx.moveTo(-70, -22);
  ctx.lineTo(20, -22);
  ctx.lineTo(20, -50);
  ctx.lineTo(80, 0);
  ctx.lineTo(20, 50);
  ctx.lineTo(20, 22);
  ctx.lineTo(-70, 22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const texture = canvasTexture(canvas, { anisotropy: 4 });
  // Lettering once the web fonts are in: canvas text keeps the face it was drawn in.
  const ready = Promise.all([fontReady("sans"), fontReady("mono")]).then(() => {
    wordmark(ctx, "12 b", 256, 227 + 110, 120, "#1d1f22", "sans");
    wordmark(ctx, "Lemminkäisenkatu", 256, 227 + 205, 36, "#3a3d40", "sans");
    wordmark(ctx, "SINCE AI · 6–8 NOV", cx, 70, 30, "rgba(207,199,255,0.9)");
    wordmark(ctx, "DOOR CLOSED", cx, 210, 52, "#ffffff");
    wordmark(ctx, "DURING THE EVENT", cx, 270, 34, "#ffffff");
    wordmark(ctx, "ENTER JOKI", cx, 420, 46, "#ffffff");
    wordmark(ctx, "THROUGH BIOCITY", cx, 475, 40, "#ffffff");
    texture.needsUpdate = true;
  });
  return {
    texture,
    ready,
    uv(g, which) {
      // Box faces: the large ±z faces carry the sign, the thin edges sample the dark border.
      const uv = g.getAttribute("uv");
      const nor = g.getAttribute("normal");
      const [u0, u1, v0, v1] = which === "plate" ? [0, 0.5, 227 / H, (227 + 256) / H] : [0.5, 1, 0, 1];
      // Rebuild per face from the box's own 0…1 UVs (BoxGeometry order): the geometry was
      // created by kit box() with metre UVs, so map by the face's extent instead.
      const pos = g.getAttribute("position");
      g.computeBoundingBox();
      const bb = g.boundingBox as THREE.Box3;
      const size = new THREE.Vector3();
      bb.getSize(size);
      for (let i = 0; i < uv.count; i++) {
        const nz = nor.getZ(i);
        const nx = nor.getX(i);
        const big = Math.abs(nz) > 0.7 || Math.abs(nx) > 0.7 ? Math.abs(nz) >= Math.abs(nx) : false;
        // Horizontal coordinate along the sign's width (x or z, whichever is longer), vertical = y.
        const alongX = size.x >= size.z;
        const t = alongX ? (pos.getX(i) - bb.min.x) / Math.max(size.x, 1e-6) : (pos.getZ(i) - bb.min.z) / Math.max(size.z, 1e-6);
        const s2 = (pos.getY(i) - bb.min.y) / Math.max(size.y, 1e-6);
        const facing = alongX ? nz : nx;
        const tt = facing >= 0 ? t : 1 - t;
        if (big || Math.abs(facing) > 0.7) uv.setXY(i, u0 + (u1 - u0) * tt, v1 - (v1 - v0) * (1 - s2));
        else uv.setXY(i, u0 + 0.002, v0 + 0.002);
      }
      uv.needsUpdate = true;
      return g;
    },
  };
}
