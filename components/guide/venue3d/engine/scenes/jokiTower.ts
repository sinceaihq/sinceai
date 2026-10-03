import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { CHALLENGE_COMPANIES, LOGOS_3D, SHOWROOM_ORDER } from "@/lib/hackathon-2026";
import { counterGeometry, makeMaterials, stoolGeometry, type Materials } from "../furniture";
import { makeLabel } from "../labels";
import { makeCarpetTexture, makeSignTexture } from "../textures";
import type { BuiltScene, Quality } from "../types";
import { lookYaw, polar, type CameraView } from "../util";
import { arcStrip, buildShowroomRoom, COUNTER_BEARINGS, SHOWROOM } from "./showroomRoom";

/**
 * Joki tower, floors 1–3, pulled apart. Stand positions follow the 2 Oct 2026
 * Since AI maps (floor 2: Revvity, Valmet, Traficom + Chill Zone; floor 3:
 * Lindström, Bo LKV, Takomo, Forcit Group, Saarioinen, Business Turku).
 */
const FLOOR_Y = { 1: 0, 2: 6.4, 3: 12.8 } as const;
const R = SHOWROOM.R;

/** Stand centres on floors 2–3 (metres from the tower centre, +z = south). */
const STAND_XZ: Record<string, [number, number]> = {
  revvity: [3.6, -5.4],
  valmet: [5.4, -2.57],
  traficom: [6.04, 0.26],
  lindstrom: [-4.63, -4.24],
  "bo-lkv": [-5.27, 0.26],
  "takomo-golf": [3.6, -5.4],
  "forcit-group": [5.4, -2.57],
  saarioinen: [6.04, 0.26],
  "business-turku": [-1.93, 4.76],
};

function buildQaStand(mats: Materials, stool: THREE.BufferGeometry, id: string, name: string) {
  const g = new THREE.Group();
  g.userData.pickId = id;
  const { body, top } = counterGeometry(1.3, 1.05, 0.55);
  g.add(new THREE.Mesh(body, mats.black), new THREE.Mesh(top, mats.blackTop));
  for (const s of [-0.38, 0.38]) {
    const st = new THREE.Mesh(stool, mats.metal);
    st.position.set(s, 0, 0.75);
    st.rotation.y = Math.PI;
    g.add(st);
  }
  const sign = makeSignTexture({ src: LOGOS_3D[id], text: name, width: 768, aspect: 1.45, seed: name.length * 7 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.1, 8), mats.metal);
  pole.position.set(0, 1.05, -0.55);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.25, 0.86),
    new THREE.MeshBasicMaterial({ map: sign.texture, color: new THREE.Color(1.2, 1.2, 1.25) }),
  );
  panel.position.set(0, 1.85, -0.53);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 0.03), mats.black);
  back.position.set(0, 1.85, -0.555);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 20), mats.metal);
  base.position.set(0, 0.01, -0.55);
  g.add(pole, back, panel, base);
  return { group: g, ready: sign.ready };
}

function floorSlab(mats: Materials, y: number, carpet: THREE.Texture) {
  const g = new THREE.Group();
  const slab = new THREE.Mesh(
    new THREE.CylinderGeometry(R + 0.3, R + 0.3, 0.3, 96),
    new THREE.MeshStandardMaterial({ color: 0x0e0e12, roughness: 0.9 }),
  );
  slab.position.y = y - 0.15;
  const top = new THREE.Mesh(
    new THREE.CircleGeometry(R, 96),
    new THREE.MeshStandardMaterial({ color: 0xffffff, map: carpet, roughness: 0.95 }),
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = y + 0.002;
  // Low glass rim + glowing edge: a cutaway that still reads as a round room.
  const rim = new THREE.Mesh(
    arcStrip(R + 0.05, 0, 360, y, y + 0.9, 128),
    new THREE.MeshStandardMaterial({
      color: 0x8f86ff,
      transparent: true,
      opacity: 0.08,
      roughness: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const edge = new THREE.Mesh(arcStrip(R + 0.06, 0, 360, y + 0.88, y + 0.92, 128), mats.violetSoft);
  g.add(slab, top, rim, edge);
  return g;
}

/** Stairs block rising towards the north end of its local −z axis. */
function stairBlock(width: number, length: number, rise: number, mat: THREE.Material) {
  const g = new THREE.Group();
  const steps = 22;
  for (let i = 0; i < steps; i++) {
    const h = (rise * (i + 1)) / steps;
    const step = new THREE.Mesh(new THREE.BoxGeometry(width, h, length / steps), mat);
    step.position.set(0, h / 2, length / 2 - (length / steps) * (i + 0.5));
    g.add(step);
  }
  return g;
}

export function buildJokiTowerScene(quality: Quality): BuiltScene {
  const mats = makeMaterials();
  const root = new THREE.Group();
  const labels: CSS2DObject[] = [];
  const pickables: THREE.Object3D[] = [];
  const readies: Promise<unknown>[] = [];
  const carpet = makeCarpetTexture("#6b6b76", 9);
  carpet.repeat.set(5, 5);
  const stool = stoolGeometry();
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x2a2a31, roughness: 0.85 });

  const floorGroups: Record<1 | 2 | 3, THREE.Group> = {
    1: new THREE.Group(),
    2: new THREE.Group(),
    3: new THREE.Group(),
  };
  Object.values(floorGroups).forEach((g) => root.add(g));

  // ── Floor 1: the Showroom, cut away ─────────────────────────────────────
  const f1 = buildShowroomRoom(mats, quality, { wallHeight: 1.1, ceiling: false, lights: false, labelsY: 1.5 });
  floorGroups[1].add(f1.group);
  pickables.push(...f1.pickables);
  f1.labels.forEach((l) => (l.userData.group = "f1"));
  labels.push(...f1.labels);
  readies.push(f1.ready);

  // ── Floors 2 and 3 ───────────────────────────────────────────────────────
  for (const floor of [2, 3] as const) {
    const y = FLOOR_Y[floor];
    const g = new THREE.Group();
    g.add(floorSlab(mats, y, carpet));

    const stairs = stairBlock(1.9, 7.2, Math.min(4.2, FLOOR_Y[2] - 0.6), coreMat);
    stairs.position.set(0.32, y, -2.0);
    stairs.rotation.y = 0.309;
    g.add(stairs);

    const core = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.6, 2.4), coreMat);
    core.position.set(4.24, y + 1.3, 3.6);
    core.rotation.y = 0.258;
    g.add(core);
    labels.push(makeLabel("Lift · WC", "area", 4.24, y + 2.9, 3.6, `f${floor}`));

    if (floor === 2) {
      // Chill Zone: west of the line (−2.44, −8.87) → (1.93, 8.48).
      const rug = new THREE.Mesh(
        new THREE.CircleGeometry(3.6, 48),
        new THREE.MeshStandardMaterial({ color: 0x2b2140, roughness: 1 }),
      );
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(-5, y + 0.01, -0.5);
      g.add(rug);
      const bag = new THREE.SphereGeometry(0.5, 20, 14);
      bag.scale(1, 0.55, 1);
      const bagMats = [0x4a3a78, 0x2f2f3a, 0x5b3f8f];
      [
        [-6.2, -2.2],
        [-4.2, -3.2],
        [-6.6, 1.0],
        [-3.8, 1.6],
        [-5.2, 3.6],
        [-3.0, -5.6],
      ].forEach(([x, z], i) => {
        const m = new THREE.Mesh(bag, new THREE.MeshStandardMaterial({ color: bagMats[i % 3], roughness: 0.95 }));
        m.position.set(x, y + 0.28, z);
        g.add(m);
      });
      labels.push(makeLabel("Chill Zone", "area", -5.2, y + 1.4, -0.5, "f2"));
    }

    for (const company of CHALLENGE_COMPANIES.filter((c) => c.qa.floor === floor)) {
      const [x, z] = STAND_XZ[company.id];
      const stand = buildQaStand(mats, stool, company.id, company.name);
      stand.group.position.set(x, y, z);
      stand.group.rotation.y = lookYaw(x, z, 0, 0);
      g.add(stand.group);
      pickables.push(stand.group);
      readies.push(stand.ready);
      labels.push(makeLabel(company.name, "company", x, y + 2.75, z, `f${floor}`));
    }

    const light = new THREE.PointLight(0xb4a8ff, quality === "high" ? 70 : 95, 16, 2);
    light.position.set(0, y + 3.4, 0);
    g.add(light);
    floorGroups[floor].add(g);
  }

  // Floor labels and the tower's vertical lines.
  const floorDetail: Record<1 | 2 | 3, string> = {
    1: "Showroom + Company Lounge",
    2: "Q&A + Chill Zone",
    3: "Q&A",
  };
  for (const floor of [1, 2, 3] as const) {
    const [x, z] = polar(250, R + 1.4);
    labels.push(makeLabel(`Floor ${floor}`, "floor", x, FLOOR_Y[floor] + 0.6, z, undefined, floorDetail[floor]));
  }
  const lineMat = new THREE.LineBasicMaterial({ color: 0x8b7bff, transparent: true, opacity: 0.22 });
  for (let i = 0; i < 12; i++) {
    const [x, z] = polar(i * 30 + 15, R + 0.3);
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0, z),
      new THREE.Vector3(x, FLOOR_Y[3] + 0.9, z),
    ]);
    root.add(new THREE.Line(geo, lineMat));
  }

  root.add(new THREE.HemisphereLight(0x8a7ce0, 0x0c0c12, 1.5));
  const key = new THREE.DirectionalLight(0xdcd8ff, 1.2);
  key.position.set(14, 34, 22);
  root.add(key);
  const f1Light = new THREE.PointLight(0xb4a8ff, 60, 16, 2);
  f1Light.position.set(-3, 2.6, 0);
  root.add(f1Light);

  // ── Views ────────────────────────────────────────────────────────────────
  const floorView = (floor: 1 | 2 | 3): CameraView => ({
    position: [10.5, FLOOR_Y[floor] + 12, 13.5],
    target: [0, FLOOR_Y[floor] + 0.6, 0],
    hfov: 68,
    fit: 9.8,
    labels: true,
    labelGroup: `f${floor}`,
  });
  const views: Record<string, CameraView> = {
    exploded: { position: [24, 21, 28], target: [0, 6.6, 0], hfov: 66, fit: 12.5, labels: false },
    "floor-1": floorView(1),
    "floor-2": floorView(2),
    "floor-3": floorView(3),
  };
  views.default = views.exploded;

  const focus: Record<string, CameraView> = {};
  for (const id of SHOWROOM_ORDER) {
    const b = COUNTER_BEARINGS[id];
    const [px, pz] = polar(b, 1.2);
    const [tx, tz] = polar(b, 7.4);
    focus[id] = { position: [px, 4.6, pz], target: [tx, 1.3, tz], hfov: 72, labels: true, labelGroup: "f1" };
  }
  for (const [id, [x, z]] of Object.entries(STAND_XZ)) {
    const company = CHALLENGE_COMPANIES.find((c) => c.id === id)!;
    const y = FLOOR_Y[company.qa.floor];
    const len = Math.hypot(x, z) || 1;
    focus[id] = {
      position: [x - (x / len) * 5.5, y + 3.4, z - (z / len) * 5.5],
      target: [x, y + 1.2, z],
      hfov: 72,
      labels: true,
      labelGroup: `f${company.qa.floor}`,
    };
  }

  return {
    root,
    views,
    focus,
    pickables,
    labels,
    controls: { minDistance: 3, maxDistance: 85, maxPolarAngle: 1.48 },
    background: 0x050409,
    fogDensity: 0.008,
    exposure: 1.1,
    bloom: { strength: 0.65, radius: 0.5, threshold: 0.62 },
    ready: Promise.all(readies),
    // Floor views cut away the floors above, so nothing hides the floor you asked for.
    onView: (view) => {
      const focus = view.labelGroup ? Number(view.labelGroup.slice(1)) : 3;
      ([1, 2, 3] as const).forEach((f) => (floorGroups[f].visible = f <= focus));
    },
  };
}
