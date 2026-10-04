import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { TwinContext, V2 } from "../types";
import { getCompany, SHOWROOM_ORDER } from "@/lib/hackathon-2026/companies";
import { LOGOS_3D } from "@/lib/hackathon-2026/logos3d";
import { makeLedWallTexture, makeCanvas, canvasTexture, drawContained, fontReady, wordmark, EVENT_VIOLET } from "../render/canvas";
import { LUMINANCE, kelvinToLinear } from "../sky/sky";
import { loadImage } from "../util";
import { makeLabel } from "../labels";
import { Batcher, R, Y, annulus, arcStrip, box, chainPatch, glow, instanceMatrix, merge, pbr, polar, prism, rod, wallSeg } from "./joki/kit";
import type { JokiMaterials } from "./joki/mats";
import { JOKI_LUMINANCE } from "./joki/mats";
import { COUNTER_BEARINGS, counterPose } from "./joki/layout";
import { barStoolPbr, counter, softBox, trackSpot, wallScreen } from "./joki/furniture";
import { interiorWB } from "./joki/probes";
import { bakeLightmap, patchworkCarpet, planUV1, type Pool } from "./joki/textures";

/**
 * The Showroom (Joki floor 1, SPEC §7.2) — upgraded from the first 3D preview:
 * the drum's west half with the real 22.5 × 3 m curved LED wall (r 8.45,
 * J-bearings 194.2° → 346.8°, P2.5) showing the six partners' logos above
 * their counters, six black counters with violet kick lights and two bar
 * stools each (J 186.7°, 218°, 250°, 281°, 312°, 341°), charcoal patchwork
 * carpet, the black open ceiling with white zig-zag LED lines, 3000 K track
 * spots and projectors, and the curved black bulkhead over the wall.
 *
 * Light: no runtime lights. The room's own reflection/irradiance probe is
 * rendered on the CPU from the LED wall and the fixtures (so the glossy
 * counter tops and chrome reflect the wall), spot pools and the wall's
 * violet spill are baked into the carpet, the wall and the lenses glow
 * (bloom). Built in the J frame (tower centre origin), floor y −1.10.
 */

export const LED = { r: R.led, b0: 194.2, b1: 346.8, y0: Y.f1 + 0.05, y1: Y.f1 + 3.05 } as const;

/** Showroom floor: the drum's west half west of the divider, minus the stair (CAD room polygon). */
export const SHOWROOM_POLY: V2[] = [
  [1.3, -8.53],
  [1.3, -6.01],
  [-0.4, -6.01],
  [-0.4, 1.59],
  [1.35, 1.59],
  [1.35, 3.59],
  [1.3, 3.59],
  [1.3, 8.57],
  [-1.0, 8.57],
  ...Array.from({ length: 41 }, (_, i) => polar(8.62, 186.7 + ((368.7 - 186.7) * i) / 40)),
];

export interface Showroom {
  group: THREE.Group;
  ceil: THREE.Group;
  pickables: THREE.Object3D[];
  labels: CSS2DObject[];
  ready: Promise<unknown>;
  dispose(): void;
}

export async function buildShowroom(ctx: TwinContext, mats: JokiMaterials, opts: { labelParent: THREE.Object3D; toWorld(x: number, y: number, z: number): THREE.Vector3 }): Promise<Showroom> {
  const low = ctx.tier === "low";
  // Canvas lettering waits for the web font (text keeps the face it was drawn in); it loads meanwhile.
  const monoReady = fontReady("mono");
  const group = new THREE.Group();
  group.name = "joki-showroom";
  const ceil = new THREE.Group();
  ceil.name = "joki-showroom-ceiling";
  group.add(ceil);
  const batch = new Batcher();
  const owned: { dispose(): void }[] = [];
  const pickables: THREE.Object3D[] = [];
  const labels: CSS2DObject[] = [];

  // ── LED wall content ──
  const span = LED.b1 - LED.b0;
  const logoU = COUNTER_BEARINGS.map((b) => THREE.MathUtils.clamp((b - LED.b0) / span, 0.058, 0.942));
  const led = makeLedWallTexture({
    logos: SHOWROOM_ORDER.map((id, i) => ({ u: logoU[i], src: LOGOS_3D[id], text: getCompany(id)?.name })),
    marks: logoU.slice(0, -1).map((u, i) => (u + logoU[i + 1]) / 2),
    markSrc: "/assets/guide/3d/logos/since-ai.png",
    width: low ? 2048 : 4096,
    aspect: 22.5 / 3.0,
    logoCenterV: 1 - (1.95 - 0.05) / 3.0,
    logoMaxW: 2.2 / 22.5,
    logoMaxH: 0.9 / 3.0,
    markV: 1 - (2.78 - 0.05) / 3.0,
    seed: 7,
  });
  owned.push(led.texture);
  led.texture.anisotropy = 16;
  const ledMat = new THREE.MeshBasicMaterial({ map: led.texture, color: new THREE.Color(1, 1, 1.05).multiplyScalar(JOKI_LUMINANCE.ledWall) });
  ledMat.name = "joki-led-wall";
  owned.push(ledMat);
  // P2.5 pixel structure, visible only up close (box-filtered: no moiré).
  chainPatch(ledMat, "jk-ledpix", (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
	{
		// 22.5 m × 3 m at 2.5 mm pitch: 9000 × 1200 LEDs over the uv square.
		vec2 g = vMapUv * vec2( 9000.0, 1200.0 );
		vec2 fw = fwidth( g );
		float near = 1.0 - smoothstep( 0.18, 0.45, max( fw.x, fw.y ) );
		vec2 f = abs( fract( g ) - 0.5 );
		float dotMask = smoothstep( 0.42, 0.28, max( f.x, f.y ) );
		diffuseColor.rgb *= mix( 1.0, 0.25 + 1.35 * dotMask, near );
	}`,
    );
  });

  // ── Materials ──
  const carpetTex = patchworkCarpet(["#3e4146", "#2f3236", "#5b5e63", "#36393d"], { px: low ? 512 : 1024, seed: 13 });
  owned.push(carpetTex.texture);
  const carpet = mats.get("carpetDark", "showroom", { roughness: 1.0 }, "jk-sr-carpet");
  carpet.map = carpetTex.texture;
  carpet.color.set("#ffffff");
  // Everything flat-painted in the room (counters, stools, bulkhead, ceiling, ducts): one uber material.
  const uber = mats.uber("showroom");
  const BLACK = (g: THREE.BufferGeometry) => pbr(g, "#0b0b0d", 0.55, 0);
  const GLOSS = (g: THREE.BufferGeometry) => pbr(g, "#09090b", 0.12, 0);
  const CEILING = (g: THREE.BufferGeometry) => pbr(g, "#0d0d10", 0.9, 0);
  const DUCT = (g: THREE.BufferGeometry) => pbr(g, "#121214", 0.38, 0.8);
  const WALL = (g: THREE.BufferGeometry) => pbr(g, "#2a2b2e", 0.85, 0);
  // Every light fitting in the room shares one glow material (HDR colour in the vertices).
  const glowMat = mats.glow("showroom");
  const VIOLET = mats.lampColor(JOKI_LUMINANCE.violetLine, undefined, EVENT_VIOLET);
  const LEDW = mats.lampColor(JOKI_LUMINANCE.linearLed * 1.2, 5000);
  const SPOT = mats.lampColor(JOKI_LUMINANCE.trackSpot, 3000);

  // ── Floor with baked pools ──
  const rect = { minX: -8.8, maxX: 1.6, minZ: -8.8, maxZ: 8.9 };
  const pools: Pool[] = [];
  const counterPoses = COUNTER_BEARINGS.map((_, i) => counterPose(i));
  for (const c of counterPoses) {
    // Track spot on each counter + the stool zone in front of it.
    const [fx, fz] = polar(6.2, c.bearing);
    pools.push({ x: c.x, z: c.z, r: 1.3, e: 0.35, color: "#ffd9b0" });
    pools.push({ x: fx, z: fz, r: 1.6, e: 0.18, color: "#ffe2c4" });
    // Violet kick light pooling on the floor at the counter base.
    const [kx, kz] = polar(7.15, c.bearing);
    pools.push({ x: kx, z: kz, r: 0.75, e: 0.22, color: "#8b7bff", sx: 1.4 });
  }
  // LED wall spill: a band of light along the wall foot.
  for (let b = LED.b0 + 2; b <= LED.b1 - 2; b += 4) {
    const [x, z] = polar(7.9, b);
    pools.push({ x, z, r: 1.15, e: 0.16, color: "#9a8cff" });
  }
  // General wash in the middle of the room.
  pools.push({ x: -3.6, z: 0.4, r: 3.2, e: 0.12, color: "#fff0e0" });
  const lightmap = bakeLightmap({ ...rect, base: 0.02, scale: 1.0, pools, shadows: counterPoses.map((c) => ({ x: c.x, z: c.z, r: 0.55, k: 0.6, sx: 3, angle: Math.atan2(c.x, -c.z) })), px: low ? 256 : 512 });
  owned.push(lightmap);
  carpet.lightMap = lightmap;
  carpet.lightMapIntensity = 1.0;
  const floor = prism(SHOWROOM_POLY, Y.f1 - 0.2, Y.f1, { sides: false });
  batch.add(group, carpet, planUV1(floor, rect), { keep: ["uv1"] });
  // The entrance corridor from the ramp top past the lift (west of the divider): same carpet and ceiling.
  const corridor: V2[] = [
    [-1.0, 8.57],
    [1.3, 8.57],
    [1.3, 3.59],
    [-1.0, 3.59],
  ];
  batch.add(group, carpet, planUV1(prism(corridor, Y.f1 - 0.2, Y.f1, { sides: false }), rect), { keep: ["uv1"] });
  batch.add(ceil, uber, CEILING(prism(corridor, Y.showroomCeil, Y.showroomCeil + 0.02, { top: false, bottom: true, sides: false })));

  // ── LED wall, frame and bulkhead ──
  const wall = new THREE.Mesh(arcStrip(LED.r, LED.b0, LED.b1, LED.y0, LED.y1, { inward: true, unitU: true, unitV: true, seg: low ? 96 : 192 }), ledMat);
  wall.name = "joki:led-wall";
  group.add(wall);
  // Black plinth line and the curved bulkhead meeting the ceiling.
  batch.add(group, uber, BLACK(arcStrip(LED.r - 0.01, LED.b0 - 0.4, LED.b1 + 0.4, Y.f1, LED.y0, { inward: true, seg: 96 })));
  batch.add(group, uber, BLACK(arcStrip(LED.r - 0.06, LED.b0 - 3, LED.b1 + 3, LED.y1, Y.showroomCeil + 0.02, { inward: true, seg: 96 })));
  batch.add(group, uber, BLACK(annulus(LED.r - 0.06, R.drumIn, LED.b0 - 3, LED.b1 + 3, LED.y1, { down: true, seg: 96 })));
  // Side cabinets' edges (thin black frames at both ends).
  for (const b of [LED.b0, LED.b1]) {
    const [x, z] = polar(LED.r - 0.02, b);
    batch.add(group, uber, BLACK(box(0.08, LED.y1 - Y.f1, 0.25, x, Y.f1, z, Math.atan2(x, z))));
  }
  // Violet line at the base of the wall (event dressing) + its glow on the floor (baked).
  batch.add(group, glowMat, glow(arcStrip(LED.r - 0.07, LED.b0 - 1, LED.b1 + 1, Y.f1 + 0.01, Y.f1 + 0.035, { inward: true, seg: 96 }), VIOLET));

  // ── Counters, stools and logo fronts ──
  const atlas = await logoAtlas(SHOWROOM_ORDER.map((id) => ({ src: LOGOS_3D[id], name: getCompany(id)?.name ?? id })));
  owned.push(atlas);
  const frontMat = new THREE.MeshBasicMaterial({ map: atlas, color: new THREE.Color(1, 1, 1).multiplyScalar(0.11) });
  frontMat.name = "joki-counter-fronts";
  owned.push(frontMat);
  const parts = counter(1.8, 1.05, 0.6);
  const stool = barStoolPbr();
  owned.push(stool);
  const stools: { x: number; z: number; yaw: number }[] = [];
  const fronts: THREE.BufferGeometry[] = [];
  counterPoses.forEach((c, i) => {
    const id = SHOWROOM_ORDER[i];
    // Counter parts merge into the room's meshes; an invisible box carries the pick id.
    const at = new THREE.Matrix4().compose(new THREE.Vector3(c.x, Y.f1, c.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, c.yaw, 0)), new THREE.Vector3(1, 1, 1));
    batch.add(group, uber, BLACK(parts.body.clone().applyMatrix4(at)));
    batch.add(group, uber, GLOSS(parts.top.clone().applyMatrix4(at)));
    batch.add(group, glowMat, glow(parts.glow.clone().applyMatrix4(at), VIOLET));
    const station = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
    station.name = `joki-counter-${id}`;
    station.position.set(c.x, Y.f1 + 0.55, c.z);
    station.rotation.y = c.yaw;
    station.userData.pickId = id;
    group.add(station);
    pickables.push(station);
    // Logo front: one atlas slot per company.
    const f = parts.front.clone();
    const uv = f.getAttribute("uv");
    for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / SHOWROOM_ORDER.length);
    f.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(c.x, Y.f1, c.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, c.yaw, 0)), new THREE.Vector3(1, 1, 1)));
    fronts.push(f);
    // Two bar stools in front of the counter.
    for (const s of [-0.45, 0.45]) {
      const [fx, fz] = polar(6.75, c.bearing + (s / 6.75) * (180 / Math.PI));
      stools.push({ x: fx, z: fz, yaw: c.yaw + Math.PI + (i % 2 ? 0.12 : -0.1) * Math.sign(s) });
    }
    // Name only: along the curved wall the counters line up in perspective, and longer labels
    // ran into each other (the counter number is in the target's detail).
    const world = opts.toWorld(c.x, Y.f1 + 1.2, c.z);
    const label = makeLabel(getCompany(id)?.name ?? id, "company", world.x, world.y, world.z, "joki-showroom");
    opts.labelParent.add(label);
    labels.push(label);
  });
  const frontMesh = new THREE.Mesh(merge(fronts), frontMat);
  frontMesh.name = "joki:counter-fronts";
  group.add(frontMesh);
  const m = new THREE.Matrix4();
  const stoolMesh = new THREE.InstancedMesh(stool, uber, stools.length);
  stools.forEach((s, i) => stoolMesh.setMatrixAt(i, instanceMatrix(s.x, Y.f1, s.z, s.yaw, 1, 1, 1, m)));
  stoolMesh.name = "joki:stools";
  stoolMesh.computeBoundingSphere();
  group.add(stoolMesh);

  // ── Stair west wall with two displays (J x −0.4, facing the room) ──
  batch.add(group, uber, WALL(wallSeg([-0.42, -6.0], [-0.42, 1.59], 0.02, Y.f1, Y.showroomCeil)));
  {
    const ws = wallScreen(1.75, 1.0);
    await monoReady;
    const sc = showroomScreen();
    owned.push(sc);
    const scMat = new THREE.MeshBasicMaterial({ map: sc, color: new THREE.Color(1, 1, 1).multiplyScalar(0.14) });
    owned.push(scMat);
    const scr: THREE.BufferGeometry[] = [];
    for (const z of [-2.1, 0.15]) {
      batch.add(group, uber, BLACK(ws.bezel.clone().rotateY(-Math.PI / 2).translate(-0.47, Y.f1 + 2.05, z)));
      scr.push(ws.screen.clone().rotateY(-Math.PI / 2).translate(-0.47, Y.f1 + 2.05, z));
    }
    const screens = new THREE.Mesh(merge(scr), scMat);
    screens.name = "joki:showroom-screens";
    group.add(screens);
    ws.bezel.dispose();
    ws.screen.dispose();
  }

  // ── Black open ceiling: panels, ducts, trays, zig-zag LED lines, track spots, projectors ──
  {
    const ceilPoly = SHOWROOM_POLY;
    batch.add(ceil, uber, CEILING(prism(ceilPoly, Y.showroomCeil, Y.showroomCeil + 0.03, { top: false, bottom: true, sides: false })));
    // Spiral ducts across the room (photo: Rajulive) and a cable tray grid.
    const ducts: THREE.BufferGeometry[] = [];
    ducts.push(rod([-7.6, Y.showroomCeil - 0.35, -2.6], [-0.6, Y.showroomCeil - 0.35, -2.6], 0.28, low ? 12 : 20));
    ducts.push(rod([-7.0, Y.showroomCeil - 0.3, 3.4], [-0.6, Y.showroomCeil - 0.3, 3.4], 0.22, low ? 12 : 20));
    for (const x of [-6.4, -4.2, -2.0]) ducts.push(box(0.06, 0.04, 14.5, x, Y.showroomCeil - 0.12, 0));
    for (const z of [-5.2, -0.6, 4.6]) ducts.push(box(14, 0.04, 0.06, -3.6, Y.showroomCeil - 0.14, z));
    batch.add(ceil, uber, ducts.map(DUCT));
    // White linear LEDs in zig-zag/triangle patterns.
    const zig: THREE.BufferGeometry[] = [];
    const zigzag = (pts: V2[]) => {
      for (let i = 1; i < pts.length; i++) zig.push(wallSeg(pts[i - 1], pts[i], 0.035, Y.showroomCeil - 0.03, Y.showroomCeil - 0.01));
    };
    zigzag([
      [-7.2, -1.2],
      [-5.9, 1.4],
      [-4.6, -1.2],
      [-3.3, 1.4],
      [-2.0, -1.2],
      [-0.8, 1.4],
    ]);
    zigzag([
      [-6.6, -4.4],
      [-5.2, -6.2],
      [-3.8, -4.4],
      [-2.4, -6.2],
      [-1.0, -4.4],
    ]);
    zigzag([
      [-6.6, 4.6],
      [-5.2, 6.4],
      [-3.8, 4.6],
      [-2.4, 6.4],
      [-1.0, 4.6],
    ]);
    batch.add(ceil, glowMat, zig.map((g) => glow(g, LEDW)));
    // Track spots aimed at the counters, on two curved tracks.
    const sp = trackSpot();
    const bodies: THREE.BufferGeometry[] = [];
    const lenses: THREE.BufferGeometry[] = [];
    for (const c of counterPoses) {
      for (const db of [-4, 4]) {
        const [x, z] = polar(5.9, c.bearing + db);
        const yaw = Math.atan2(c.x - x, c.z - z);
        bodies.push(sp.body.clone().rotateY(yaw).translate(x, Y.showroomCeil - 0.02, z));
        lenses.push(sp.lens.clone().rotateY(yaw).translate(x, Y.showroomCeil - 0.02, z));
      }
    }
    batch.add(ceil, uber, DUCT(arcStrip(5.9, LED.b0 - 6, LED.b1 + 6, Y.showroomCeil - 0.06, Y.showroomCeil - 0.01, { seg: 48 })));
    batch.add(ceil, uber, bodies.map(BLACK));
    batch.add(ceil, glowMat, lenses.map((g) => glow(g, SPOT)));
    sp.body.dispose();
    sp.lens.dispose();
    // Projectors and speakers.
    batch.add(
      ceil,
      uber,
      [softBox(0.5, 0.18, 0.55, 0.02, -3.0, Y.showroomCeil - 0.45, -6.4), softBox(0.5, 0.18, 0.55, 0.02, -6.5, Y.showroomCeil - 0.45, 1.0), softBox(0.5, 0.18, 0.55, 0.02, -3.0, Y.showroomCeil - 0.45, 6.8)].map(BLACK),
    );
  }

  batch.flush();

  // ── The room's own reflection probe (LED wall + fixtures), once the logos are drawn ──
  await led.ready;
  const env = await showroomProbe(led.texture.image as HTMLCanvasElement, opts.toWorld);
  mats.setZoneEnv("showroom", env);

  return {
    group,
    ceil,
    pickables,
    labels,
    ready: Promise.resolve(),
    dispose() {
      for (const o of owned) o.dispose();
    },
  };
}

/** One texture with the six counter-front logos side by side (white logos on black). */
async function logoAtlas(items: { src?: string; name: string }[]): Promise<THREE.CanvasTexture> {
  const slotW = 512;
  const slotH = 170;
  const { canvas, ctx } = makeCanvas(slotW * items.length, slotH);
  ctx.fillStyle = "#0b0b0e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const [imgs] = await Promise.all([Promise.all(items.map((it) => (it.src ? loadImage(it.src) : Promise.resolve(null)))), fontReady("sans")]);
  items.forEach((it, i) => {
    const cx = slotW * i + slotW / 2;
    const img = imgs[i];
    if (img) drawContained(ctx, img, cx, slotH / 2, slotW * 0.7, slotH * 0.62);
    else wordmark(ctx, it.name, cx, slotH / 2, slotH * 0.22, "#ffffff", "sans");
  });
  return canvasTexture(canvas, { anisotropy: 8 });
}

/** Content on the stair-wall displays: Q&A schedule card in the event style (await fontReady("mono") first). */
function showroomScreen(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(512, 292);
  const g = ctx.createLinearGradient(0, 0, 512, 292);
  g.addColorStop(0, "#15103a");
  g.addColorStop(1, "#2d1f78");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 292);
  ctx.fillStyle = EVENT_VIOLET;
  ctx.fillRect(0, 280, 512, 12);
  wordmark(ctx, "CHALLENGE Q&A", 256, 110, 40, "#ffffff");
  wordmark(ctx, "SATURDAY 09–18 · SHOWROOM", 256, 170, 20, "rgba(207,199,255,0.9)");
  wordmark(ctx, "FLOORS 2–3: TOWER STAIRS · LIFT", 256, 215, 16, "rgba(207,199,255,0.75)");
  return canvasTexture(canvas, { anisotropy: 4 });
}

/**
 * Equirectangular HDR probe of the Showroom seen from its middle (eye
 * height), in world directions: the LED wall (sampled from its canvas at
 * LED luminance), the dark walls, floor pools, the white LED lines and the
 * track spots. three.js turns it into a PMREM when a material uses it.
 */
async function showroomProbe(ledCanvas: HTMLCanvasElement, toWorld: (x: number, y: number, z: number) => THREE.Vector3): Promise<THREE.DataTexture> {
  const W = 256;
  const H = 128;
  // Small copy of the LED content for sampling.
  const sw = 512;
  const sh = 68;
  const { canvas, ctx } = makeCanvas(sw, sh);
  ctx.drawImage(ledCanvas, 0, 0, sw, sh);
  const px = ctx.getImageData(0, 0, sw, sh).data;
  const srgb = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  // World → J: the J group is rotated by −θ; directions rotate by +θ back.
  const o = toWorld(0, 0, 0);
  const ax = toWorld(1, 0, 0).sub(o);
  const theta = Math.atan2(-ax.z, ax.x);
  const cosT = Math.cos(-theta);
  const sinT = Math.sin(-theta);
  const eye = new THREE.Vector3(-3.2, Y.f1 + 1.25, 0.3);
  // Lamp colours as the white-balanced camera sees them (probes.ts interiorWB).
  const warm = kelvinToLinear(interiorWB(3000));
  const white = kelvinToLinear(interiorWB(5000));
  const data = new Uint16Array(W * H * 4);
  const d = new THREE.Vector3();
  for (let j = 0; j < H; j++) {
    const lat = ((j + 0.5) / H - 0.5) * Math.PI;
    for (let i = 0; i < W; i++) {
      const lon = ((i + 0.5) / W - 0.5) * 2 * Math.PI;
      // three.js equirect: u = atan(z, x)/2π + 0.5, v = asin(y)/π + 0.5.
      const wx = Math.cos(lon) * Math.cos(lat);
      const wz = Math.sin(lon) * Math.cos(lat);
      const wy = Math.sin(lat);
      // Rotate the world direction into the J frame (inverse of rotation.y = −θ).
      d.set(wx * cosT - wz * sinT, wy, wx * sinT + wz * cosT);
      let r = 0;
      let g = 0;
      let b = 0;
      // Hit the drum cylinder (r 8.45), the floor or the ceiling.
      const a = d.x * d.x + d.z * d.z;
      const bq = 2 * (eye.x * d.x + eye.z * d.z);
      const cq = eye.x * eye.x + eye.z * eye.z - LED.r * LED.r;
      const tWall = a > 1e-6 ? (-bq + Math.sqrt(Math.max(0, bq * bq - 4 * a * cq))) / (2 * a) : Infinity;
      const tFloor = d.y < -1e-4 ? (Y.f1 - eye.y) / d.y : Infinity;
      const tCeil = d.y > 1e-4 ? (Y.showroomCeil - eye.y) / d.y : Infinity;
      const t = Math.min(tWall, tFloor, tCeil);
      const hx = eye.x + d.x * t;
      const hy = eye.y + d.y * t;
      const hz = eye.z + d.z * t;
      if (t === tWall) {
        const bearing = ((Math.atan2(hx, -hz) * 180) / Math.PI + 360) % 360;
        const inLed = bearing >= LED.b0 && bearing <= LED.b1 && hy >= LED.y0 && hy <= LED.y1 && hx < 1.3;
        if (inLed) {
          const u = (bearing - LED.b0) / (LED.b1 - LED.b0);
          const v = 1 - (hy - LED.y0) / (LED.y1 - LED.y0);
          const k = (Math.min(sh - 1, Math.floor(v * sh)) * sw + Math.min(sw - 1, Math.floor(u * sw))) * 4;
          const L = JOKI_LUMINANCE.ledWall;
          r = srgb(px[k]) * L;
          g = srgb(px[k + 1]) * L;
          b = srgb(px[k + 2]) * L * 1.05;
        } else if (hx >= 1.3) {
          // Divider / stair wall (light grey, lit by the room): dim neutral.
          r = g = b = 0.012;
        } else {
          // Concrete and black bulkhead.
          r = 0.004;
          g = 0.0038;
          b = 0.0036;
        }
      } else if (t === tFloor) {
        // Carpet: violet spill near the wall, warm pools at the counters.
        const rr = Math.hypot(hx, hz);
        const spill = Math.max(0, 1 - (LED.r - rr) / 1.6);
        r = 0.0025 + spill * 0.006 * 0.55;
        g = 0.0025 + spill * 0.006 * 0.48;
        b = 0.003 + spill * 0.006;
        for (const bc of COUNTER_BEARINGS) {
          const [cx, cz] = polar(7.0, bc);
          const dd = Math.hypot(hx - cx, hz - cz);
          const f = Math.exp(-dd * dd * 1.4) * 0.012;
          r += f * warm.r;
          g += f * warm.g;
          b += f * warm.b;
        }
      } else {
        // Black ceiling with white zig-zag LED lines and warm spot lenses.
        r = g = b = 0.0012;
        const line = Math.abs(((hx * 0.77 + hz * 0.4) % 2.6) + 2.6) % 2.6;
        if (hx < 0 && line < 0.04) {
          r = white.r * JOKI_LUMINANCE.linearLed * 0.6;
          g = white.g * JOKI_LUMINANCE.linearLed * 0.6;
          b = white.b * JOKI_LUMINANCE.linearLed * 0.6;
        }
        for (const bc of COUNTER_BEARINGS) {
          const [sx, sz] = polar(5.9, bc);
          if (Math.hypot(hx - sx, hz - sz) < 0.12) {
            r = warm.r * LUMINANCE.ceilingPanel * 4;
            g = warm.g * LUMINANCE.ceilingPanel * 4;
            b = warm.b * LUMINANCE.ceilingPanel * 4;
          }
        }
      }
      const k = (j * W + i) * 4;
      data[k] = THREE.DataUtils.toHalfFloat(r);
      data[k + 1] = THREE.DataUtils.toHalfFloat(g);
      data[k + 2] = THREE.DataUtils.toHalfFloat(b);
      data[k + 3] = THREE.DataUtils.toHalfFloat(1);
    }
  }
  canvas.width = canvas.height = 0;
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  tex.name = "joki-showroom-probe";
  return tex;
}
