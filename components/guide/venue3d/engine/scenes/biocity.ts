import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { BIOCITY_STANDS, getStandPartner, LOGOS_3D, OPEN_STAND_LABEL } from "@/lib/hackathon-2026";
import {
  buildBooth,
  chairGeometry,
  instanced,
  laptopGeometry,
  makeMaterials,
  stoolGeometry,
  tableGeometry,
} from "../furniture";
import { makeLabel } from "../labels";
import { makeSignTexture } from "../textures";
import type { BuiltScene, Quality } from "../types";
import { lookYaw, mulberry32, type CameraView } from "../util";
import { arcStrip } from "./showroomRoom";

/**
 * BioCity ground floor (schematic). Coordinates in metres from the official
 * plan (1:250, A3): x = (px − 1110) / 19, z = (py − 960) / 19 on the 2000-px
 * rendering. The build hall uses the 3 Oct 2026 furniture plan: 4 rows × 14
 * tables (180 × 80 cm), 5 chairs per table, 1.4 m between tables, 1.8 m
 * central walkway. Stand positions are the stand plan in lib/hackathon-2026.
 */
const H = 4.2;
const GALLERY = { cx: 0, cz: -14.4, r: 20.2 };

/** Which label group (camera view) each stand belongs to. */
const STAND_GROUP: Record<string, string> = { "bc-1": "entrance", "bc-3": "entrance", "bc-2": "hall", "bc-4": "hall" };

/** World position + the point each stand faces, per stand position. */
const STAND_POSE: Record<string, { x: number; z: number; faceX: number; faceZ: number }> = {
  "bc-1": { x: 6.4, z: -31.4, faceX: 0.5, faceZ: -27.5 },
  "bc-2": { x: 26.6, z: -2.9, faceX: 14, faceZ: -0.8 },
  "bc-3": { x: -6.4, z: -31.4, faceX: -0.5, faceZ: -27.5 },
  "bc-4": { x: -25, z: -3.2, faceX: -12, faceZ: -0.8 },
};

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, z: number, y = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  return m;
}

/** Extruded footprint (points in world x/z), height h. */
function prism(points: [number, number][], h: number, mat: THREE.Material) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 24 });
  geo.rotateX(-Math.PI / 2);
  return new THREE.Mesh(geo, mat);
}

/** Dashed walking route on the floor, as flat glowing dashes. */
function routeRibbon(points: [number, number][], mat: THREE.Material) {
  const g = new THREE.Group();
  const dash = new THREE.PlaneGeometry(0.22, 0.75);
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, z0] = points[i];
    const [x1, z1] = points[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const yaw = Math.atan2(x1 - x0, z1 - z0);
    for (let d = 0.6; d < len; d += 1.4) {
      const m = new THREE.Mesh(dash, mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = yaw;
      m.position.set(x0 + ((x1 - x0) * d) / len, 0.02, z0 + ((z1 - z0) * d) / len);
      g.add(m);
    }
  }
  return g;
}

export function buildBioCityScene(quality: Quality): BuiltScene {
  const mats = makeMaterials();
  const root = new THREE.Group();
  const labels: CSS2DObject[] = [];
  const pickables: THREE.Object3D[] = [];
  const readies: Promise<unknown>[] = [];

  const mass = new THREE.MeshStandardMaterial({ color: 0x1d1c2a, roughness: 0.85 });
  const ghost = new THREE.MeshStandardMaterial({
    color: 0x2a2640,
    roughness: 0.9,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const massLight = new THREE.MeshStandardMaterial({ color: 0x2a2a34, roughness: 0.85 });

  // ── Ground: the venue's official floor plan as a dark blueprint ─────────
  // The plan page spans x −58.42 … 46.84 m and z −50.53 … 23.95 m in this
  // scene's coordinates, so every wall line sits where the plan draws it.
  const blueprint = new THREE.TextureLoader().load("/assets/guide/3d/biocity-blueprint.webp", () => {
    readyBlueprint?.();
  });
  let readyBlueprint: (() => void) | null = null;
  readies.push(new Promise<void>((r) => (readyBlueprint = r)));
  blueprint.colorSpace = THREE.SRGBColorSpace;
  blueprint.anisotropy = 8;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(105.26, 74.47),
    new THREE.MeshBasicMaterial({ map: blueprint, color: new THREE.Color(0.95, 0.95, 1.0) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-5.79, -0.01, -13.29);
  root.add(ground);

  // Event areas glow faintly: the build hall and the Aulagalleria.
  const eventTint = new THREE.MeshBasicMaterial({
    color: 0x7c5cff,
    transparent: true,
    opacity: 0.07,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const hall = new THREE.Mesh(new THREE.PlaneGeometry(61, 9.6), eventTint);
  hall.rotation.x = -Math.PI / 2;
  hall.position.set(0.25, 0.005, -0.2);
  root.add(hall);

  // ── Building masses (not in event use) ───────────────────────────────────
  root.add(box(36.1, 2.6, 18.9, ghost, 0.15, -14.45)); // meeting rooms block
  root.add(box(11.3, 2.6, 4.5, massLight, 0.15, -26.15)); // WC block
  root.add(box(51.3, 1.2, 10.9, ghost, -4.35, 10.05)); // retail along Lemminkäisenkatu
  root.add(
    prism(
      [
        [-53, -31.6],
        [-20.8, -31.3],
        [-19, -21],
        [-20.8, -5.3],
        [-41, -5.3],
      ],
      1.2,
      ghost,
    ),
  );
  root.add(
    prism(
      [
        [6.6, -40.3],
        [26.3, -40.3],
        [28.4, -31.8],
        [21.3, -24.4],
        [12.5, -33.6],
      ],
      1.2,
      ghost,
    ),
  );
  // Presidenttiauditorio — fan-shaped hall to the north-west.
  const fan = new THREE.Shape();
  fan.absarc(0, 0, 14, Math.PI * 0.5, Math.PI, false);
  fan.lineTo(-3, 0);
  fan.absarc(0, 0, 3, Math.PI, Math.PI * 0.5, true);
  const fanGeo = new THREE.ExtrudeGeometry(fan, { depth: 1.2, bevelEnabled: false, curveSegments: 32 });
  fanGeo.rotateX(-Math.PI / 2);
  const auditorium = new THREE.Mesh(fanGeo, ghost);
  auditorium.position.set(-8.2, 0, -27.2);
  root.add(auditorium);

  // Hall islands: stairs and lifts on the south side.
  for (const [x0, x1] of [
    [-25.8, -20.8],
    [24, 28.7],
  ]) {
    root.add(box(x1 - x0, 2.2, 3.0, massLight, (x0 + x1) / 2, 3.1));
  }
  for (const [x0, x1] of [
    [-18.2, -15.3],
    [18.4, 21.3],
  ]) {
    root.add(box(x1 - x0, H, 3.3, mass, (x0 + x1) / 2, 2.95));
  }

  // Walls: hall ends, curved gallery facade (inward-facing so cutaway views stay open).
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1a1a20, roughness: 0.9 });
  root.add(box(0.3, H, 4.0, wallMat, -30.4, -3.0));
  root.add(box(0.3, H, 3.0, wallMat, -30.4, 3.3));
  root.add(box(0.3, H, 3.2, wallMat, 30.8, -3.4));
  root.add(box(0.3, H, 2.6, wallMat, 30.8, 3.5));
  const facade = new THREE.Mesh(
    arcStrip(GALLERY.r, -62, 62, 0, H, 96),
    new THREE.MeshStandardMaterial({
      color: 0x1b1a2a,
      roughness: 0.15,
      metalness: 0.4,
      transparent: true,
      opacity: 0.55,
    }),
  );
  facade.position.set(GALLERY.cx, 0, GALLERY.cz);
  root.add(facade);
  for (let b = -60; b <= 60; b += 7.5) {
    const rad = THREE.MathUtils.degToRad(b);
    const mullion = box(
      0.12,
      H,
      0.12,
      mats.black,
      GALLERY.cx + GALLERY.r * Math.sin(rad),
      GALLERY.cz - GALLERY.r * Math.cos(rad),
    );
    root.add(mullion);
  }

  // ── Event entrance (Jussin aukio) ────────────────────────────────────────
  const portal = new THREE.Group();
  const frameMat = mats.violet;
  portal.add(box(3.4, 0.08, 0.12, frameMat, 0, -35.2, 3.0));
  portal.add(box(0.08, 3.0, 0.12, frameMat, -1.7, -35.2));
  portal.add(box(0.08, 3.0, 0.12, frameMat, 1.7, -35.2));
  root.add(portal);
  labels.push(makeLabel("Event entrance · Jussin aukio", "stand", 0, 5.4, -36.6, "entrance"));

  // ── Build hall: 4 rows × 14 tables, 280 seats ───────────────────────────
  const table = tableGeometry();
  const chair = chairGeometry();
  const laptop = laptopGeometry();
  const tables: { x: number; z: number }[] = [];
  const chairs: { x: number; z: number; ry: number }[] = [];
  const laptops: { x: number; y: number; z: number; ry: number }[] = [];
  const rnd = mulberry32(42);
  for (let i = 0; i < 14; i++) {
    const x = -12.8 + i * 2.2;
    for (const z of [-3.65, -1.8, 1.8, 3.65]) {
      tables.push({ x, z });
      for (const dz of [-0.6, 0, 0.6]) {
        chairs.push({ x: x - 0.66, z: z + dz, ry: Math.PI / 2 });
        if (rnd() < 0.62) laptops.push({ x: x - 0.2, y: 0.74, z: z + dz, ry: -Math.PI / 2 });
      }
      for (const dz of [-0.45, 0.45]) {
        chairs.push({ x: x + 0.66, z: z + dz, ry: -Math.PI / 2 });
        if (rnd() < 0.62) laptops.push({ x: x + 0.2, y: 0.74, z: z + dz, ry: Math.PI / 2 });
      }
    }
  }
  root.add(instanced(table.top, mats.tableTop, tables));
  root.add(instanced(table.legs, mats.tableLeg, tables));
  root.add(instanced(chair, mats.chair, chairs));
  root.add(instanced(laptop.base, mats.laptop, laptops));
  root.add(instanced(laptop.screen, mats.screen, laptops));
  labels.push(makeLabel("Build hall · 56 tables · 280 seats", "area", 1.5, 2.4, 0, "hall"));

  // ── Partner stands ───────────────────────────────────────────────────────
  const stool = stoolGeometry();
  for (const stand of BIOCITY_STANDS) {
    const partner = getStandPartner(stand);
    const pose = STAND_POSE[stand.id];
    const sign = makeSignTexture({
      src: partner ? LOGOS_3D[partner.id] : undefined,
      text: partner?.name ?? "Visibility / Tech Partner stand",
      subtitle: partner ? `Stand ${stand.rank}` : `Stand ${stand.rank} · open`,
      open: !partner,
      seed: stand.rank * 13,
    });
    readies.push(sign.ready);
    const booth = buildBooth(mats, sign, stool, { open: !partner });
    booth.position.set(pose.x, 0, pose.z);
    booth.rotation.y = lookYaw(pose.x, pose.z, pose.faceX, pose.faceZ);
    booth.userData.pickId = stand.id;
    root.add(booth);
    pickables.push(booth);
    labels.push(
      makeLabel(
        partner ? `Stand ${stand.rank} · ${partner.name}` : `Stand ${stand.rank} · ${OPEN_STAND_LABEL}`,
        partner ? "stand" : "open",
        pose.x,
        partner ? 3.4 : 2.7,
        pose.z,
        STAND_GROUP[stand.id],
      ),
    );
    if (partner) {
      const glow = new THREE.PointLight(0x8a72ff, quality === "high" ? 14 : 18, 7, 2);
      glow.position.set(pose.x, 2.6, pose.z);
      root.add(glow);
    }
  }

  // Food serving lines (landmarks).
  root.add(box(1.2, 1.0, 4.0, massLight, 17.6, -29.2));
  root.add(box(1.2, 1.0, 4.0, massLight, 23.6, -19.4));
  labels.push(makeLabel("Restaurant serving lines", "area", 20.6, 1.9, -24.5, "entrance"));

  // ── Route: event entrance → gallery → east corridor → hall → Joki ───────
  root.add(
    routeRibbon(
      [
        [0, -34.4],
        [0, -30.4],
        [9.5, -29.6],
        [16.8, -26.6],
        [19.7, -22.4],
        [19.7, -6.6],
        [24.6, -1.0],
        [30.6, 0.2],
      ],
      mats.violetSoft,
    ),
  );
  labels.push(makeLabel("To Joki →", "area", 30.2, 2.4, 0.2, "hall"));
  labels.push(makeLabel("Aulagalleria", "area", -12.5, 1.2, -26.5, "entrance"));
  labels.push(makeLabel("Meeting rooms", "area", 0, 3.4, -14.5, "context"));
  labels.push(makeLabel("Presidenttiauditorio", "area", -16, 2.6, -37, "context"));
  labels.push(makeLabel("Mauno restaurant", "area", 17.5, 2.4, -35.5, "context"));

  // ── Lighting ─────────────────────────────────────────────────────────────
  root.add(new THREE.HemisphereLight(0x8a86d8, 0x101018, 1.6));
  const key = new THREE.DirectionalLight(0xf0ecff, 1.3);
  key.position.set(22, 42, 26);
  root.add(key);
  const hallLights = quality === "high" ? [-22, -12, -2, 8, 18, 27] : [-15, 3, 21];
  for (const x of hallLights) {
    const p = new THREE.PointLight(0xffd3a3, quality === "high" ? 40 : 60, 16, 2);
    p.position.set(x, 4.2, 0);
    root.add(p);
  }
  const entranceGlow = new THREE.PointLight(0x7a5cff, 40, 12, 2);
  entranceGlow.position.set(0, 2.8, -33.5);
  root.add(entranceGlow);

  // ── Views ────────────────────────────────────────────────────────────────
  const views: Record<string, CameraView> = {
    overview: { position: [30, 36, 30], target: [1, 0, -13], hfov: 70, labels: true },
    entrance: { position: [-4, 16, -18], target: [1, 0, -31], hfov: 72, labels: true, labelGroup: "entrance" },
    hall: { position: [-26, 13, -14], target: [3, 0, 1], hfov: 78, labels: true, labelGroup: "hall" },
  };
  views.default = views.overview;

  const focus: Record<string, CameraView> = {};
  for (const stand of BIOCITY_STANDS) {
    const p = STAND_POSE[stand.id];
    const dx = p.faceX - p.x;
    const dz = p.faceZ - p.z;
    const len = Math.hypot(dx, dz) || 1;
    focus[stand.id] = {
      position: [p.x + (dx / len) * 6, 2.2, p.z + (dz / len) * 6],
      target: [p.x, 1.3, p.z],
      hfov: 76,
      labels: true,
      labelGroup: STAND_GROUP[stand.id],
    };
  }

  return {
    root,
    views,
    focus,
    pickables,
    labels,
    controls: { minDistance: 2, maxDistance: 140, maxPolarAngle: 1.47 },
    background: 0x050508,
    fogDensity: 0.006,
    exposure: 1.0,
    bloom: { strength: 0.55, radius: 0.45, threshold: 0.68 },
    ready: Promise.all(readies),
  };
}
