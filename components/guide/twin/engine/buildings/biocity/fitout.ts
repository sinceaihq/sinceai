import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { TwinContext, V2 } from "../../types";
import { BIOCITY_STANDS, OPEN_STAND_LABEL, getStandPartner } from "@/lib/hackathon-2026/partners";
import { makeLabel } from "../../labels";
import { mulberry32 } from "../../util";
import { LUMINANCE } from "../../sky/sky";
import {
  barStoolGeometry,
  cafeChairGeometry,
  cafeTableGeometry,
  counterGeometry,
  furnitureMaterials,
  laptopGeometry,
  placeInstanced,
  rollupGeometry,
  stackingChairGeometry,
  workTableGeometry,
  type FurnitureMaterials,
  type Placement,
} from "../../props/furniture";
import {
  CORNER,
  ENTRANCE_TYK,
  GABLE_W_X,
  JOKI_PASSAGE,
  LEVEL,
  MAUNO,
  NBLOCK_FACE,
  PASSAGE_MOUTH,
  STANDS,
  STAND_LABEL_GROUP,
  VESTIBULE,
  along,
  buildTables,
  chairsFor,
  dist2,
  runNormal,
  type StandPose,
} from "./plan";
import { Buckets, box, mergeAll, segmentBox } from "./geom";
import { doorASign, lettering, mapBoard, passageSign, sciencePark, standAtlas, totemAtlas, type AtlasTexture } from "./textures";

/**
 * BioCity's event fit-out and signage (SPEC §7.1): the build hall's 56 tables
 * and 280 chairs with laptops and seated builders, the four visibility /
 * tech partner stands (Red Hat stand 1 facing the event entrance, Solita
 * stand 2 at the Joki end, stands 3 and 4 open), Since AI wayfinding totems,
 * the Mauno restaurant (tables, chairs, pendants, curtains) and its serving
 * lines, the bistro bar, the info desk, and the building's own lettering
 * (vertical BIOCITY, rooftop SCIENCE PARK, the Tykistökatu "A" door board).
 */

export interface FitoutResult {
  /** Objects for the interior group (furniture with their own materials, stand signs, seated people). */
  interior: THREE.Object3D[];
  /** Exterior signage (always visible). */
  exterior: { layer: "shell" | "upper"; object: THREE.Object3D }[];
  /** Pickable stand groups (userData.pickId = stand id). */
  pickables: THREE.Object3D[];
  /** Labels in plan frame B: interior ones are shown only in the dollhouse. */
  labels: { label: CSS2DObject; interior: boolean }[];
  /** Materials and textures owned by the fit-out. */
  materials: THREE.Material[];
  textures: THREE.Texture[];
  /** Emissive materials that are lit at night (signs). */
  nightSigns: { material: THREE.MeshStandardMaterial; day: number; night: number }[];
  /** Chair spots of the build hall for seated builders (plan B, floor y, facing ry). */
  seats: { x: number; y: number; z: number; ry: number }[];
  ready: Promise<unknown>;
}

/** rotation.y that turns a piece facing −z towards plan direction (fx, fz). */
export function yawToFace(fx: number, fz: number): number {
  return Math.atan2(-fx, -fz);
}

function atlasPlane(w: number, h: number, uv: [number, number, number, number], crop: [number, number, number, number] = [0, 0, 1, 1]): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  const [u0, v0, u1, v1] = uv;
  const [c0, d0, c1, d1] = crop;
  const a = g.getAttribute("uv");
  for (let i = 0; i < a.count; i++) {
    const u = a.getX(i);
    const v = a.getY(i);
    const cu = c0 + (c1 - c0) * u;
    const cv = d0 + (d1 - d0) * v;
    a.setXY(i, u0 + (u1 - u0) * cu, v0 + (v1 - v0) * cv);
  }
  a.needsUpdate = true;
  return g;
}

export function buildFitout(b: Buckets, ctx: TwinContext): FitoutResult {
  const low = ctx.tier === "low";
  const rnd = mulberry32(2026);
  const fm: FurnitureMaterials = furnitureMaterials(ctx);
  const owned: THREE.Material[] = Object.values(fm);
  const textures: THREE.Texture[] = [];
  const interior: THREE.Object3D[] = [];
  const exterior: FitoutResult["exterior"] = [];
  const pickables: THREE.Object3D[] = [];
  const labels: FitoutResult["labels"] = [];
  const nightSigns: FitoutResult["nightSigns"] = [];
  const readies: Promise<unknown>[] = [];
  const seats: FitoutResult["seats"] = [];
  const y0 = LEVEL.gf;

  // ── Build hall: 56 tables, 280 chairs, laptops, seated builders ──
  {
    const tables = buildTables();
    const table = workTableGeometry({ length: 1.8, width: 0.8 });
    const chair = stackingChairGeometry();
    const laptop = laptopGeometry();
    const tPl: Placement[] = tables.map((t) => ({ x: t.x, z: t.z, y: y0 }));
    const cPl: Placement[] = [];
    const lPl: Placement[] = [];
    for (const t of tables) {
      for (const c of chairsFor(t)) {
        // Chairs pulled out a little and turned, as people left them.
        const pull = rnd() * 0.12;
        const turn = (rnd() - 0.5) * 0.35;
        const dx = Math.sign(c.x - t.x) * pull;
        cPl.push({ x: c.x + dx, z: c.z + (rnd() - 0.5) * 0.06, y: y0, ry: c.ry + turn });
        seats.push({ x: c.x + dx, y: y0, z: c.z, ry: c.ry + turn * 0.4 });
        if (rnd() < 0.66) {
          // On the table in front of the chair, facing the sitter (same yaw).
          const fx = -Math.sin(c.ry);
          const fz = -Math.cos(c.ry);
          lPl.push({ x: c.x + fx * 0.5, z: c.z + fz * 0.5 + (rnd() - 0.5) * 0.08, y: y0 + 0.74, ry: c.ry + (rnd() - 0.5) * 0.25 });
        }
      }
    }
    // No shadow casting indoors: the November sun never reaches the hall floor through the vault.
    interior.push(placeInstanced(table.top, fm.tableTop, tPl, { name: "hall-table-tops" }));
    interior.push(placeInstanced(table.frame, fm.frame, tPl, { name: "hall-table-frames" }));
    interior.push(placeInstanced(chair.shell, fm.shell, cPl, { name: "hall-chair-shells" }));
    interior.push(placeInstanced(chair.frame, fm.frame, cPl, { name: "hall-chair-frames" }));
    interior.push(placeInstanced(laptop.body, fm.aluminium, lPl, { name: "hall-laptops" }));
    interior.push(placeInstanced(laptop.screen, fm.screen, lPl, { name: "hall-laptop-screens" }));
    // Power strips and cable trays down each table group (two per table pair).
    const strips: THREE.BufferGeometry[] = [];
    for (const t of tables) strips.push(box(t.x - 0.06, y0 + 0.74, t.z - 0.3, t.x + 0.06, y0 + 0.785, t.z + 0.3));
    b.add("interior", "darkIn", mergeAll(strips));
  }

  // ── Café tables on the reserved restaurant terrace (west end; not on phones) ──
  if (!low) {
    const ct = cafeTableGeometry({ length: 1.2, width: 0.7 });
    const cc = cafeChairGeometry();
    const tPl: Placement[] = [];
    const cPl: Placement[] = [];
    for (const [x, z] of [
      [-28.4, -3.6],
      [-28.4, -1.6],
      [-26.2, -3.6],
      [-26.2, -1.6],
      [-21.9, -1.4],
    ] as V2[]) {
      tPl.push({ x, z, y: y0 });
      for (const s of [-1, 1]) for (const dz of [-0.3, 0.3]) cPl.push({ x: x + s * 0.55, z: z + dz, y: y0, ry: s < 0 ? -Math.PI / 2 : Math.PI / 2 });
    }
    interior.push(placeInstanced(ct.top, fm.tableTop, tPl, { name: "terrace-tables" }));
    interior.push(placeInstanced(ct.base, fm.frame, tPl, { name: "terrace-table-bases" }));
    interior.push(placeInstanced(cc.shell, fm.shell, cPl, { name: "terrace-chairs" }));
    interior.push(placeInstanced(cc.frame, fm.frame, cPl, { name: "terrace-chair-legs" }));
  }

  // ── Partner stands (one sign atlas; each stand a pickable group) ──
  const atlas: AtlasTexture = standAtlas(
    STANDS.map((s) => {
      const stand = BIOCITY_STANDS.find((x) => x.id === s.id);
      const partner = stand ? getStandPartner(stand) : undefined;
      const logo = partner?.id === "solita" ? "/assets/guide/3d/logos/solita.png" : null;
      return {
        logo,
        title: partner ? partner.name : OPEN_STAND_LABEL,
        subtitle: partner ? `Stand ${stand?.rank} · Visibility / Tech partner` : `Stand ${stand?.rank} · open`,
        open: !partner,
      };
    }),
  );
  textures.push(atlas.texture);
  readies.push(atlas.ready);
  const signMat = new THREE.MeshStandardMaterial({
    map: atlas.texture,
    emissiveMap: atlas.texture,
    emissive: new THREE.Color(1, 1, 1),
    emissiveIntensity: LUMINANCE.signLit * 0.08,
    roughness: 0.6,
    metalness: 0,
  });
  if (ctx.envInterior) signMat.envMap = ctx.envInterior;
  signMat.name = "biocity-stand-signs";
  owned.push(signMat);
  {
    const counter = counterGeometry(1.5, 1.05, 0.55);
    const stool = barStoolGeometry();
    const roll = rollupGeometry(0.85, 2.0);
    // All stand graphics in one mesh; each stand gets an invisible pick proxy (no draw call).
    const signParts: THREE.BufferGeometry[] = [];
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    owned.push(proxyMat);
    STANDS.forEach((s: StandPose, i) => {
      const stand = BIOCITY_STANDS.find((x) => x.id === s.id);
      const partner = stand ? getStandPartner(stand) : undefined;
      const yaw = yawToFace(s.face[0], s.face[1]);
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(s.x, y0, s.z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
        new THREE.Vector3(1, 1, 1),
      );
      const uv = atlas.tile(i);
      const parts: THREE.BufferGeometry[] = [];
      const solid: THREE.BufferGeometry[] = [];
      const light: THREE.BufferGeometry[] = [];
      if (s.markerOnly) {
        // Open spot only: a printed floor outline and a roll-up with the open-stand graphic.
        const rp = atlasPlane(0.85, 2.0, uv, [0.08, 0.04, 0.92, 0.96]);
        rp.rotateY(Math.PI);
        rp.translate(0.45, 1.1, 0.25);
        parts.push(rp);
        const outline: [number, number, number, number][] = [
          [-s.width / 2, -s.depth / 2, s.width / 2, -s.depth / 2 + 0.05],
          [-s.width / 2, s.depth / 2 - 0.05, s.width / 2, s.depth / 2],
          [-s.width / 2, -s.depth / 2, -s.width / 2 + 0.05, s.depth / 2],
          [s.width / 2 - 0.05, -s.depth / 2, s.width / 2, s.depth / 2],
        ];
        for (const [xa, za, xb, zb] of outline) light.push(box(xa, 0.002, za, xb, 0.008, zb));
        const rs = roll.stand.clone();
        rs.translate(0.45, 0, 0.25);
        solid.push(rs);
      } else {
        // Back wall graphic (its face towards −z of the stand, at the wall's front).
        const back = atlasPlane(s.width - 0.06, 2.24, uv);
        back.rotateY(Math.PI);
        back.translate(0, 1.18, s.depth / 2 - 0.036);
        parts.push(back);
        // Counter front: the logo band of the tile.
        const front = atlasPlane(1.38, 0.7, uv, [0.08, 0.36, 0.92, 0.7]);
        front.rotateY(Math.PI);
        front.translate(0, 0.55, -0.2 - 0.276);
        parts.push(front);
        solid.push(box(-s.width / 2, 0, s.depth / 2 - 0.035, s.width / 2, 2.3, s.depth / 2 + 0.03));
        const body = counter.body.clone();
        body.translate(0, 0, -0.2);
        solid.push(body);
        const top = counter.top.clone();
        top.translate(0, 0, -0.2);
        solid.push(top);
        // A wall-mounted screen and the event light lines (top edge, floor edge, counter foot).
        solid.push(box(-0.62, 1.55, s.depth / 2 - 0.09, 0.62, 2.05, s.depth / 2 - 0.036));
        light.push(box(-s.width / 2, 2.3, s.depth / 2 - 0.05, s.width / 2, 2.34, s.depth / 2 + 0.03));
        light.push(box(-s.width / 2, 0.01, s.depth / 2 - 0.06, s.width / 2, 0.03, s.depth / 2 - 0.036));
        light.push(box(-0.76, 0.02, -0.5, 0.76, 0.04, -0.47));
        // A partner's roll-up beside the wall, on the open side (stand 3 mirrors stand 1), and a bar
        // stool behind the counter. An open stand has no roll-up (a bare cassette read as debris).
        if (partner) {
          const side = s.face[0] > 0.05 ? -1 : 1;
          const rs = roll.stand.clone();
          rs.translate(side * (s.width / 2 + 0.55), 0, 0.1);
          solid.push(rs);
          const rp = atlasPlane(0.85, 2.0, uv, [0.1, 0.06, 0.9, 0.95]);
          rp.rotateY(Math.PI);
          rp.translate(side * (s.width / 2 + 0.55), 1.09, 0.095);
          parts.push(rp);
        }
        const st = stool.frame.clone();
        st.translate(-0.45, 0, 0.18);
        solid.push(st);
        const ss = stool.seat.clone();
        ss.translate(-0.45, 0, 0.18);
        solid.push(ss);
      }
      for (const p of [...parts, ...solid, ...light]) p.applyMatrix4(m);
      signParts.push(...parts);
      b.add("interior", "standBlack", mergeAll(solid));
      if (light.length) b.add("interior", "violetLine", mergeAll(light));
      // Pick proxy: the stand's volume (2.4 m tall), invisible.
      const proxy = new THREE.Mesh(new THREE.BoxGeometry(s.width + 0.4, 2.4, s.depth + 0.8), proxyMat);
      proxy.name = `stand-${s.id}`;
      proxy.position.set(s.x, y0 + 1.2, s.z);
      proxy.rotation.y = yaw;
      proxy.userData.pickId = s.id;
      interior.push(proxy);
      pickables.push(proxy);
      // Short on the map ("Stand 3 · open"). Stands 1 and 3 flank the event entrance 13 m apart and
      // read on one line from the courtyard: their labels sit over the stands' outer halves and leave
      // the area to the Aulagalleria's own label, so neither hides the other.
      const gallery = s.id === "bc-1" || s.id === "bc-3";
      const label = makeLabel(
        partner ? `Stand ${stand?.rank} · ${partner.name}` : `Stand ${stand?.rank} · open`,
        partner ? "stand" : "open",
        s.x + (gallery ? Math.sign(s.x) * 0.6 : 0),
        s.markerOnly ? 2.6 : 3.0,
        s.z,
        // The partner-stands view shows this group in full, phones included (open stands too).
        STAND_LABEL_GROUP,
        gallery ? undefined : stand?.area,
      );
      labels.push({ label, interior: true });
    });
    const signs = new THREE.Mesh(mergeAll(signParts), signMat);
    signs.name = "biocity-stand-signs";
    signs.receiveShadow = true;
    interior.push(signs);
    // Prototypes were cloned into the merged meshes.
    for (const g of [counter.body, counter.top, counter.front, stool.frame, stool.seat, roll.stand, roll.panel]) g.dispose();
  }

  // ── Since AI wayfinding totems ──
  {
    const atlasT = totemAtlas([
      { lines: [{ text: "Build hall", arrow: "right" }, { text: "Joki\nQ&A Showroom", arrow: "right" }, { text: "Partner\nstands", arrow: "up" }] },
      { lines: [{ text: "Joki\nShowroom", arrow: "down" }, { text: "Q&A floors\n2–3", arrow: "down" }] },
      { lines: [{ text: "Build hall", arrow: "right" }, { text: "Meals", arrow: "left" }, { text: "Stand 1", arrow: "left" }] },
      { lines: [{ text: "Aulagalleria\nMeals", arrow: "up" }, { text: "Event\nentrance", arrow: "up" }] },
    ]);
    textures.push(atlasT.texture);
    readies.push(atlasT.ready);
    const totemMat = new THREE.MeshStandardMaterial({
      map: atlasT.texture,
      emissiveMap: atlasT.texture,
      emissive: new THREE.Color(1, 1, 1),
      emissiveIntensity: LUMINANCE.signLit * 0.12,
      roughness: 0.5,
    });
    if (ctx.envInterior) totemMat.envMap = ctx.envInterior;
    totemMat.name = "biocity-totems";
    owned.push(totemMat);
    // Totems: (x, z) and the plan direction the face looks to.
    const totems: { x: number; z: number; face: V2; tile: number }[] = [
      // Inside the Tykistökatu entrance, facing people coming in.
      { x: -26.3, z: 2.35, face: [-1, 0], tile: 0 },
      // By the Joki passage, facing the hall.
      { x: 29.6, z: -1.65, face: [-1, 0], tile: 1 },
      // In the Aulagalleria facing the event-entrance vestibule.
      { x: 3.2, z: -29.6, face: [-0.6, -0.8], tile: 2 },
      // At the hall end of the east ring corridor, facing the hall.
      { x: 17.2, z: -4.3, face: [0.2, 1], tile: 3 },
    ];
    const faces: THREE.BufferGeometry[] = [];
    const bodies: THREE.BufferGeometry[] = [];
    for (const t of totems) {
      const ry = yawToFace(t.face[0], t.face[1]);
      const m = new THREE.Matrix4().makeRotationY(ry).setPosition(t.x, y0, t.z);
      const f = atlasPlane(0.6, 1.8, atlasT.tile(t.tile));
      f.rotateY(Math.PI);
      f.translate(0, 1.0, -0.061);
      f.applyMatrix4(m);
      faces.push(f);
      const back = atlasPlane(0.6, 1.8, atlasT.tile(t.tile));
      back.translate(0, 1.0, 0.061);
      back.applyMatrix4(m);
      faces.push(back);
      const body = box(-0.32, 0, -0.06, 0.32, 1.92, 0.06);
      body.applyMatrix4(m);
      bodies.push(body);
      const foot = box(-0.36, 0, -0.2, 0.36, 0.05, 0.2);
      foot.applyMatrix4(m);
      bodies.push(foot);
    }
    const mesh = new THREE.Mesh(mergeAll(faces), totemMat);
    mesh.name = "biocity-totems";
    interior.push(mesh);
    b.add("interior", "standBlack", mergeAll(bodies));
  }

  // ── Mauno restaurant: tables, chairs, pendants, curtains; serving lines; bistro bar ──
  {
    const ct = cafeTableGeometry({ length: 1.6, width: 0.8 });
    const cc = cafeChairGeometry();
    const tPl: Placement[] = [];
    const green: Placement[] = [];
    const white: Placement[] = [];
    const pendants: THREE.BufferGeometry[] = [];
    let k = 0;
    for (let x = 12.6; x <= 25.2; x += 2.6) {
      for (let z = -38.6; z <= -33.6; z += 2.4) {
        if (x < 14 && z < -37) continue;
        tPl.push({ x, z, y: y0, ry: Math.PI / 2 });
        for (const s of [-1, 1]) {
          for (const dx of [-0.45, 0.45]) {
            const p: Placement = { x: x + dx, z: z + s * 0.62, y: y0, ry: s < 0 ? Math.PI : 0 };
            (!low && k++ % 3 === 0 ? white : green).push(p);
          }
        }
        if (!low) {
          const sph = new THREE.IcosahedronGeometry(0.32, 1);
          sph.translate(x, 2.85, z);
          pendants.push(sph);
        }
      }
    }
    interior.push(placeInstanced(ct.top, fm.tableTop, tPl, { name: "mauno-tables" }));
    interior.push(placeInstanced(ct.base, fm.frame, tPl, { name: "mauno-table-bases" }));
    const greenMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#8fb57d"), roughness: 0.55 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#e9e9e6"), roughness: 0.5 });
    for (const m of [greenMat, whiteMat]) if (ctx.envInterior) m.envMap = ctx.envInterior;
    owned.push(greenMat, whiteMat);
    interior.push(placeInstanced(cc.shell, greenMat, green, { name: "mauno-chairs-green" }));
    if (white.length) interior.push(placeInstanced(cc.shell, whiteMat, white, { name: "mauno-chairs-white" }));
    interior.push(placeInstanced(cc.frame, fm.frame, [...green, ...white], { name: "mauno-chair-legs" }));
    if (pendants.length) {
      const pend = mergeAll(
        pendants.map((g) => {
          const pos = g.getAttribute("position");
          g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2));
          return g;
        }),
      );
      b.add("interior", "pendant", pend);
      const cords: THREE.BufferGeometry[] = [];
      for (const p of tPl) cords.push(box(p.x - 0.005, 3.15, p.z - 0.005, p.x + 0.005, LEVEL.wingCeiling, p.z + 0.005));
      b.add("interior", "darkIn", mergeAll(cords));
    }
    // Serving line 1: counter run with a sneeze guard and food trays.
    const L1 = MAUNO.line1;
    const L2 = MAUNO.line2;
    const counters: THREE.BufferGeometry[] = [
      box(L1.x0, y0, L1.z0, L1.x1, 0.9, L1.z1),
      box(L2.x0, y0, L2.z0, L2.x1, 0.9, L2.z1),
      box(MAUNO.hood.x0, y0, MAUNO.hood.z0, MAUNO.hood.x1, 0.9, MAUNO.hood.z1),
    ];
    b.add("interior", "stainless", mergeAll(counters));
    const guards: THREE.BufferGeometry[] = [
      box(L1.x0 + 0.1, 1.25, L1.z0 + 0.15, L1.x1 - 0.1, 1.27, L1.z1 - 0.2),
      box(L2.x0 + 0.15, 1.25, L2.z0 + 0.1, L2.x1 - 0.15, 1.27, L2.z1 - 0.1),
    ];
    b.add("interior", "glassIn", mergeAll(guards));
    const posts: THREE.BufferGeometry[] = [];
    for (const x of [L1.x0 + 0.15, (L1.x0 + L1.x1) / 2, L1.x1 - 0.15]) posts.push(box(x - 0.012, 0.9, L1.z0 + 0.3, x + 0.012, 1.26, L1.z0 + 0.33));
    b.add("interior", "stainless", mergeAll(posts));
    // Gastronorm pans (stainless rims) set into the counters, the food in them in a few muted colours
    // (vertex colours, one draw call): a buffet line, not a row of orange slabs.
    const pans: THREE.BufferGeometry[] = [];
    const food: THREE.BufferGeometry[] = [];
    const foodColours = ["#7a4f2c", "#9a8a4a", "#5d7a3a", "#b07a3c", "#c9b48a", "#6b3f2a"].map((c) => new THREE.Color(c));
    let fi = 0;
    const pan = (x0: number, z0: number, x1: number, z1: number) => {
      pans.push(box(x0, 0.9, z0, x1, 0.925, z1));
      const g = box(x0 + 0.03, 0.9, z0 + 0.03, x1 - 0.03, 0.935, z1 - 0.03);
      const col = foodColours[fi++ % foodColours.length];
      const n = g.getAttribute("position").count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.toArray(arr, i * 3);
      g.setAttribute("color", new THREE.Float32BufferAttribute(arr, 3));
      food.push(g);
    };
    for (let x = L1.x0 + 0.3; x < L1.x1 - 0.3; x += 0.56) pan(x, L1.z0 + 0.35, x + 0.5, L1.z1 - 0.15);
    for (let z = L2.z0 + 0.3; z < L2.z1 - 0.3; z += 0.56) pan(L2.x0 + 0.2, z, L2.x1 - 0.2, z + 0.5);
    b.add("interior", "stainless", mergeAll(pans));
    const trayMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62 });
    if (ctx.envInterior) trayMat.envMap = ctx.envInterior;
    owned.push(trayMat);
    const trayMesh = new THREE.Mesh(mergeAll(food), trayMat);
    trayMesh.name = "serving-food";
    interior.push(trayMesh);
    b.add("interior", "steelIn", box(MAUNO.hood.x0 - 0.1, 2.1, MAUNO.hood.z0, MAUNO.hood.x1 + 0.2, 2.6, MAUNO.hood.z1));
    // Bistro U-bar.
    const B = MAUNO.bar;
    b.add("interior", "timber", box(B.x0, y0, B.z0, B.x0 + 0.7, 1.05, B.z1), box(B.x0, y0, B.z0, B.x1, 1.05, B.z0 + 0.7), box(B.x1 - 0.7, y0, B.z0, B.x1, 1.05, B.z1));
    b.add("interior", "darkIn", box(B.x0 - 0.05, 1.05, B.z0 - 0.05, B.x1 + 0.05, 1.09, B.z1 + 0.05));
    // Charcoal curtains, partly drawn, along Maunon sali's glazing.
    const cur: THREE.BufferGeometry[] = [];
    const hall = MAUNO.hall;
    for (let i = 0; i + 1 < 7; i++) {
      const a = hall[i];
      const c = hall[i + 1];
      const len = dist2(a, c);
      const n = runNormal(a, c);
      // Gathered at every other mullion pair: 0.45 m bundles, 6 m apart.
      for (let s = 0.4; s < len - 0.6; s += 6.0) {
        const p0 = along(a, c, s);
        const p1 = along(a, c, Math.min(len - 0.2, s + 0.45));
        cur.push(segmentBox([p0[0] - n[0] * 0.22, p0[1] - n[1] * 0.22], [p1[0] - n[0] * 0.22, p1[1] - n[1] * 0.22], 0.14, y0 + 0.03, 3.85));
      }
    }
    b.add("interior", "curtain", mergeAll(cur));
    labels.push({ label: makeLabel("Restaurant serving lines", "area", (L1.x0 + L1.x1) / 2, 2.6, L1.z0 - 0.6, undefined, "event meals"), interior: true });
  }

  // ── Sign over the passage to Joki (on the bulkhead over the corridor's mouth, facing the hall) ──
  {
    const tex = passageSign();
    textures.push(tex);
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new THREE.Color(1, 1, 1), emissiveIntensity: LUMINANCE.signLit * 0.12, roughness: 0.5 });
    if (ctx.envInterior) mat.envMap = ctx.envInterior;
    mat.name = "biocity-passage-sign";
    owned.push(mat);
    const g = new THREE.PlaneGeometry(2.0, 0.5);
    g.rotateY(-Math.PI / 2);
    g.translate(JOKI_PASSAGE.threshold - 0.012, 3.06, (PASSAGE_MOUTH.z0 + PASSAGE_MOUTH.z1) / 2);
    const sign = new THREE.Mesh(g, mat);
    sign.name = "biocity-joki-sign";
    interior.push(sign);
  }

  // ── Info desk (timber) and its moss wall in the cloakroom / info point ──
  {
    b.add("interior", "timber", box(-15.6, y0, -9.4, -11.9, 1.05, -8.7));
    b.add("interior", "moss", box(-17.6, 0.3, -11.2, -17.48, 3.2, -6.0));
  }

  // ── Labels (areas in the dollhouse; entrances always) ──
  labels.push({ label: makeLabel("Build hall", "area", 0, 2.4, 0.6, undefined, "56 tables · 280 seats"), interior: true });
  labels.push({ label: makeLabel("Aulagalleria", "area", -9.5, 2.4, -30.0), interior: true });
  labels.push({ label: makeLabel("To Joki · Showroom", "area", JOKI_PASSAGE.stairX0, 2.3, 0.5, undefined, "10 steps down"), interior: true });
  labels.push({
    label: makeLabel("BioCity main entrance", "entrance", ENTRANCE_TYK.threshold[0] - 1.2, 3.4, ENTRANCE_TYK.threshold[1], undefined, "companies & partners"),
    interior: false,
  });
  labels.push({
    label: makeLabel("BioCity event entrance", "entrance", (VESTIBULE.x0 + VESTIBULE.x1) / 2, 3.9, VESTIBULE.z0 - 0.6, undefined, "builders"),
    interior: false,
  });

  // ── Building lettering (exterior) ──
  {
    // Vertical BIOCITY sign on the N-block's corner band (Tykistökatu).
    const F = NBLOCK_FACE;
    const L = F.letters;
    const n = runNormal(CORNER.north, CORNER.recessN);
    const c = along(CORNER.north, CORNER.recessN, L.at);
    const t = lettering("BIOCITY", { vertical: true, px: 220, weight: 500, color: "#e9ebee" });
    textures.push(t.texture);
    const h = L.y1 - L.y0 - 0.5;
    const letterMat = new THREE.MeshStandardMaterial({ map: t.texture, transparent: true, alphaTest: 0.35, roughness: 0.35, metalness: 0.6, emissive: new THREE.Color(1, 1, 1), emissiveMap: t.texture, emissiveIntensity: 0 });
    owned.push(letterMat);
    nightSigns.push({ material: letterMat, day: 0, night: LUMINANCE.signLit * 0.08 });
    const panel = segmentBox(along(CORNER.north, CORNER.recessN, L.at - L.width / 2), along(CORNER.north, CORNER.recessN, L.at + L.width / 2), 0.18, L.y0, L.y1, { offset: 0.09 });
    b.add("upper", "signPanel", panel);
    const plane = new THREE.PlaneGeometry(h * t.aspect, h);
    const yaw = Math.atan2(n[0], n[1]);
    plane.rotateY(yaw);
    plane.translate(c[0] + n[0] * 0.19, (L.y0 + L.y1) / 2, c[1] + n[1] * 0.19);
    const pm = new THREE.Mesh(plane, letterMat);
    pm.name = "biocity-vertical-letters";
    exterior.push({ layer: "upper", object: pm });
    // Blank black mesh sign panel (tenant logos are not reproduced).
    const s0 = along(CORNER.north, CORNER.recessN, F.sign[0]);
    const s1 = along(CORNER.north, CORNER.recessN, F.sign[1]);
    b.add("upper", "signPanel", segmentBox(s0, s1, 0.14, 4.7, 21.2, { offset: 0.07 }));

    // SCIENCE PARK on the glass tower's NW roof edge (SPEC §3.1.6: green, ≈1.2 m capitals, lit at night).
    // Its foot 0.35 m over the coping, so the whole word clears the parapet seen from across
    // Tykistökatu; a darker second layer 0.12 m behind gives the letters their depth at an angle.
    const sp = sciencePark();
    textures.push(sp.texture);
    const green = new THREE.MeshStandardMaterial({
      map: sp.texture,
      transparent: true,
      alphaTest: 0.4,
      // Painted letters, saturated enough to stay green against an overcast sky.
      color: new THREE.Color("#4fae3a"),
      roughness: 0.5,
      envMapIntensity: 0.4,
      emissive: new THREE.Color("#c8ee5c"),
      emissiveMap: sp.texture,
      emissiveIntensity: LUMINANCE.signLit * 0.04,
      side: THREE.DoubleSide,
    });
    const greenBack = new THREE.MeshStandardMaterial({ map: sp.texture, transparent: true, alphaTest: 0.4, color: new THREE.Color("#1d3d17"), roughness: 0.6, side: THREE.DoubleSide });
    owned.push(green, greenBack);
    nightSigns.push({ material: green, day: LUMINANCE.signLit * 0.04, night: LUMINANCE.signLit });
    const a = CORNER.recessS;
    const w = CORNER.west;
    const len = dist2(a, w);
    // ≈1.05 m capitals: "SCIENCE PARK" fits the 9.8 m edge condensed to ≈75 % (SPEC: ≈1.2 m overall).
    const capH = 1.05;
    const plateH = capH / sp.cap;
    // As wide as the edge allows (the capitals condense slightly to fit the 9.8 m edge).
    const signLen = Math.min(len - 0.4, plateH * sp.aspect);
    const mid = along(a, w, len / 2);
    const nn = runNormal(a, w);
    const spYaw = Math.atan2(nn[0], nn[1]);
    const foot = LEVEL.parapet + 0.08 + 0.35;
    const spPlane = (inset: number) => {
      const g = new THREE.PlaneGeometry(signLen, plateH);
      g.rotateY(spYaw);
      g.translate(mid[0] - nn[0] * inset, foot - (plateH - capH) / 2 + plateH / 2, mid[1] - nn[1] * inset);
      return g;
    };
    const gm = new THREE.Mesh(spPlane(0.45), green);
    gm.name = "science-park-letters";
    exterior.push({ layer: "upper", object: gm });
    if (!low) {
      const gb = new THREE.Mesh(spPlane(0.57), greenBack);
      gb.name = "science-park-letters-back";
      exterior.push({ layer: "upper", object: gb });
    }
    // The rail the letters stand on, and two low posts down to the roof behind the parapet.
    b.add("upper", "blackSteel", segmentBox(along(a, w, 0.5), along(a, w, len - 0.5), 0.12, LEVEL.parapet, foot, { offset: -0.51 }));

    // Small BIOCITY lettering and the "BioCity A" board on the black tile wall; the green A sign.
    const small = lettering("BIOCITY", { px: 160, weight: 500, color: "#e6e8ea" });
    textures.push(small.texture);
    const smallMat = new THREE.MeshBasicMaterial({ map: small.texture, transparent: true, alphaTest: 0.3, color: new THREE.Color(0.75, 0.76, 0.78) });
    owned.push(smallMat);
    const sl = new THREE.PlaneGeometry(1.3, 1.3 / small.aspect);
    sl.rotateY(-Math.PI / 2);
    sl.translate(-30.02 - 0.012, 3.6, 6.6);
    // Small wall lettering and the map board are close-up detail: not on phones.
    if (!low) exterior.push({ layer: "shell", object: new THREE.Mesh(sl, smallMat) });
    else sl.dispose();
    const mb = mapBoard();
    textures.push(mb);
    const boardMat = new THREE.MeshStandardMaterial({ map: mb, roughness: 0.4, emissive: new THREE.Color(1, 1, 1), emissiveMap: mb, emissiveIntensity: 0 });
    owned.push(boardMat);
    nightSigns.push({ material: boardMat, day: 0, night: LUMINANCE.signLit * 0.05 });
    const bd = new THREE.PlaneGeometry(1.0, 0.75);
    bd.rotateY(-Math.PI / 2);
    bd.translate(-30.02 - 0.02, 1.55, 12.1);
    if (!low) exterior.push({ layer: "shell", object: new THREE.Mesh(bd, boardMat) });
    else bd.dispose();
    const aTex = doorASign();
    textures.push(aTex);
    const aMat = new THREE.MeshStandardMaterial({ map: aTex, roughness: 0.4, emissive: new THREE.Color(1, 1, 1), emissiveMap: aTex, emissiveIntensity: 0 });
    owned.push(aMat);
    nightSigns.push({ material: aMat, day: 0, night: LUMINANCE.signLit * 0.1 });
    const asg = new THREE.PlaneGeometry(0.32, 0.32);
    asg.rotateY(-Math.PI / 2);
    asg.translate(GABLE_W_X - 0.06, 2.0, 2.25);
    exterior.push({ layer: "shell", object: new THREE.Mesh(asg, aMat) });
  }

  return {
    interior,
    exterior,
    pickables,
    labels,
    materials: owned,
    textures,
    nightSigns,
    seats,
    ready: Promise.all(readies),
  };
}
