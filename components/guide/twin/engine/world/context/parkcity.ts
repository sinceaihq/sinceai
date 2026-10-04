import * as THREE from "three";
import type { V2 } from "../../types";
import { mulberry32, pointInRing } from "../../util";
import { LUMINANCE } from "../../sky/sky";
import { box, column, lin, type MeshBuilder } from "./kit";
import type { DetailKit } from "./details";

/**
 * ParkCity (Joukahaisenkatu 8, Aimo / YIT 2023; SPEC §3.4, §4.5; YLE photos):
 * ten parking levels behind a "barcode" of vertical tubes — white, light grey,
 * sky blue, royal blue and orange — 0.45 m in front of the slab edges, a
 * two-storey colonnade (5.5 m deep, soffit 7.2 m) along Joukahaisenkatu with
 * the two street doors, vehicle portals on the north-west and south-east
 * faces, the Kalevansilta footbridge door at the east corner, and an open
 * top deck with lamp posts.
 *
 * The decks themselves are the "park" facade family (render/facade.ts
 * parking interior, lit around the clock); this file adds the tubes
 * (one InstancedMesh), columns, portals, signs and the top deck.
 */

export const PARKCITY_OSM = 1212603914;

/** Street doors (OSM entrances) on the recessed colonnade wall, and the vehicle portals. */
const STREET_DOORS: V2[] = [
  [198.5, -7.4],
  [215.5, 6.2],
];
const PORTALS: { at: V2; width: number; height: number }[] = [
  { at: [201, -32], width: 7.5, height: 4.2 },
  { at: [245.2, 5.6], width: 7.0, height: 4.2 },
];
/** Kalevansilta (deck y ≈ 4.3) meets the building at the east corner. */
const BRIDGE_DOOR: V2 = [256.3, -15.7];

/** Tube palette (SPEC §3.4) with weights. */
const TUBES: [string, number][] = [
  ["#f4f4f0", 0.3],
  ["#cfcfce", 0.22],
  ["#5ea0d4", 0.16],
  ["#1e306f", 0.16],
  ["#d58e1e", 0.16],
];

export interface ParkCityParts {
  objects: THREE.Object3D[];
  pickables: THREE.Object3D[];
  /** Colonnade columns (walk mode). */
  columns: { c: V2; r: number }[];
  /** Swap tubes / shell by camera distance; true when something changed. */
  tick(camera: THREE.Camera): boolean;
  dispose(): void;
}

/**
 * Tubes, colonnade columns, portals, signs and the top deck of ParkCity.
 * `ring` = footprint (CCW), `roofY` = top deck, `colonnade` = the overhang ring (OSM part, min 7.2 m).
 */
export function buildParkCity(kit: DetailKit, ring: V2[], roofY: number, colonnade: V2[] | null, soffit: number): ParkCityParts {
  const rnd = mulberry32(1212603914);
  const low = kit.tier === "low";
  const pitch = low ? 0.34 : 0.2;
  const radius = 0.055;
  const top = roofY + 1.25;
  const out = 0.45;
  const n = ring.length;
  // Outward-offset polyline (mitred) along which the tubes stand.
  const offset: V2[] = [];
  for (let i = 0; i < n; i++) {
    const p = ring[(i + n - 1) % n];
    const c = ring[i];
    const q = ring[(i + 1) % n];
    const n0 = edgeN(p, c);
    const n1 = edgeN(c, q);
    let mx = n0[0] + n1[0];
    let mz = n0[1] + n1[1];
    const ml = Math.hypot(mx, mz) || 1;
    mx /= ml;
    mz /= ml;
    const cos = Math.max(0.35, mx * n1[0] + mz * n1[1]);
    offset.push([c[0] + (mx * out) / cos, c[1] + (mz * out) / cos]);
  }
  // Tube positions, colours and bottoms.
  const mats: THREE.Matrix4[] = [];
  const cols: THREE.Color[] = [];
  const palette = TUBES.map(([hex, w]) => ({ c: new THREE.Color(hex), w }));
  const pickColour = () => {
    let r = rnd();
    for (const p of palette) {
      if (r < p.w) return p.c;
      r -= p.w;
    }
    return palette[0].c;
  };
  let colour = pickColour();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sc = new THREE.Vector3();
  const pos = new THREE.Vector3();
  let carry = 0;
  let arc = 0;
  /** Tube centres along the offset polyline (m) and their colours, for the far-distance shell. */
  const shellTubes: { s: number; c: THREE.Color }[] = [];
  const segStart: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = offset[i];
    const b = offset[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segStart.push(arc);
    let s = carry;
    while (s < len) {
      const t = s / len;
      const x = a[0] + (b[0] - a[0]) * t;
      const z = a[1] + (b[1] - a[1]) * t;
      s += pitch;
      // Runs of one colour, a few tubes long (the "barcode").
      if (rnd() < 0.34) colour = pickColour();
      const g = kit.heightAt(x, z);
      let bottom = g - 0.1;
      // Over the colonnade the tubes hang from the soffit; over portals and the bridge door they stop above them.
      if (colonnade && pointInRing([x - edgeN(ring[i], ring[(i + 1) % n])[0] * 1.2, z - edgeN(ring[i], ring[(i + 1) % n])[1] * 1.2], colonnade)) {
        bottom = soffit;
      }
      for (const p of PORTALS) {
        if (Math.hypot(x - p.at[0], z - p.at[1]) < p.width / 2 + 0.6) bottom = Math.max(bottom, g + p.height + 0.9);
      }
      if (Math.hypot(x - BRIDGE_DOOR[0], z - BRIDGE_DOOR[1]) < 3.2) bottom = Math.max(bottom, 8.2);
      const h = top - bottom;
      if (h < 0.5) continue;
      pos.set(x, bottom + h / 2, z);
      sc.set(radius, h, radius);
      m.compose(pos, q, sc);
      mats.push(m.clone());
      // Slight per-tube tone variation (paint, weathering).
      const c = colour.clone().multiplyScalar(0.92 + rnd() * 0.12);
      cols.push(c);
      shellTubes.push({ s: arc + s - pitch, c });
    }
    carry = s - len;
    arc += len;
  }
  const geo = new THREE.CylinderGeometry(1, 1, 1, low ? 5 : 7, 1, true);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.25, name: "parkcity-tubes" });
  const tubes = new THREE.InstancedMesh(geo, mat, mats.length);
  tubes.name = "parkcity-tubes";
  mats.forEach((mm, i) => tubes.setMatrixAt(i, mm));
  cols.forEach((c, i) => tubes.setColorAt(i, c));
  tubes.instanceMatrix.needsUpdate = true;
  if (tubes.instanceColor) tubes.instanceColor.needsUpdate = true;
  tubes.castShadow = true;
  tubes.receiveShadow = true;
  tubes.computeBoundingSphere();
  tubes.userData.pickId = "parkcity";

  // Far away the 0.11 m tubes alias; a mip-mapped "barcode" shell on the tube line takes over (swap by distance).
  const shell = makeShell(kit, offset, segStart, arc, shellTubes, radius, top, colonnade, soffit, ring);

  // Horizontal support rails behind the tubes at every second deck.
  const rail: [number, number, number] = lin("#8b8e90");
  for (let y = 7.2; y < top - 1; y += 6.6) {
    for (let i = 0; i < n; i++) {
      const a = offset[i];
      const b = offset[(i + 1) % n];
      const yy = kit.heightAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) + y;
      beamAt(kit.metal, a, b, -0.12, 0.06, yy, yy + 0.08, rail);
    }
  }

  // Colonnade: big round concrete columns on the facade line, a lit soffit. The facade line is made of
  // several nearly collinear ring edges: columns are spaced evenly along each straight run, not per edge
  // (per edge would double them up at every joint).
  const columns: { c: V2; r: number }[] = [];
  if (colonnade) {
    const inCol = (i: number) => {
      const a = ring[i];
      const b = ring[(i + 1) % n];
      const nn = edgeN(a, b);
      return pointInRing([(a[0] + b[0]) / 2 - nn[0] * 1.5, (a[1] + b[1]) / 2 - nn[1] * 1.5], colonnade);
    };
    const straight = (i: number, j: number) => {
      const p = edgeN(ring[i], ring[(i + 1) % n]);
      const q = edgeN(ring[j], ring[(j + 1) % n]);
      return p[0] * q[0] + p[1] * q[1] > Math.cos((8 * Math.PI) / 180);
    };
    // Runs of consecutive colonnade edges (starting after an edge that does not continue the run).
    const runs: number[][] = [];
    const start = [...Array(n).keys()].find((i) => inCol(i) && !(inCol((i + n - 1) % n) && straight((i + n - 1) % n, i)));
    if (start !== undefined) {
      for (let s = 0; s < n; s++) {
        const i = (start + s) % n;
        if (!inCol(i)) continue;
        const last = runs[runs.length - 1];
        const prev = (i + n - 1) % n;
        if (last && last[last.length - 1] === prev && straight(prev, i)) last.push(i);
        else runs.push([i]);
      }
    }
    const lamp = lin("#e8f0ff").map((c) => c * LUMINANCE.bollard * 0.6) as [number, number, number];
    for (const run of runs) {
      // Arc-length parametrisation of the run along the facade line.
      const pts: V2[] = [ring[run[0]], ...run.map((i) => ring[(i + 1) % n])];
      const lens = run.map((_, k) => Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]));
      const total = lens.reduce((x, y) => x + y, 0);
      // The returns at the colonnade's ends (its 5.5 m depth) stay open: the corner columns of the main run carry them.
      if (total < 8) continue;
      const at = (s: number, inset: number): { p: V2; yaw: number } => {
        let k = 0;
        while (k < lens.length - 1 && s > lens[k]) s -= lens[k++];
        const a = pts[k];
        const b = pts[k + 1];
        const t = Math.min(1, Math.max(0, s / Math.max(lens[k], 1e-6)));
        const nn = edgeN(a, b);
        return { p: [a[0] + (b[0] - a[0]) * t - nn[0] * inset, a[1] + (b[1] - a[1]) * t - nn[1] * inset], yaw: -Math.atan2(b[1] - a[1], b[0] - a[0]) };
      };
      const count = Math.max(1, Math.round((total - 1.2) / 8.2));
      for (let k = 0; k <= count; k++) {
        const { p } = at(0.6 + ((total - 1.2) * k) / count, 0.75);
        const g = kit.heightAt(p[0], p[1]);
        column(kit.concrete, p[0], p[1], 0.5, g - 0.2, soffit, kit.calibrate("#a3a19b"), 16);
        columns.push({ c: p, r: 0.5 });
      }
      // Soffit downlights (night), between the columns.
      for (let k = 1; k < count * 2; k++) {
        const { p, yaw } = at((total * k) / (count * 2), 2.8);
        box(kit.emissive, p[0], soffit - 0.02, p[1], 1.2, 0.02, 0.16, yaw, lamp);
      }
    }
  }

  // Street doors in the colonnade: glazed lift/stair lobbies with a lit "P" above.
  const sw = facingFrame(219);
  for (const d of STREET_DOORS) {
    const g = kit.heightAt(d[0] + sw.n[0], d[1] + sw.n[1]);
    box(kit.glazing, d[0] + sw.n[0] * 0.15, g + 1.55, d[1] + sw.n[1] * 0.15, 3.4, 3.1, 0.06, sw.yaw, [1, 1, 1]);
    signP(kit, d[0] + sw.n[0] * 0.25, g + 4.0, d[1] + sw.n[1] * 0.25, sw.yaw, 0.9);
  }

  // Vehicle portals: dark opening, sign band, barrier posts.
  for (const p of PORTALS) {
    const w = nearestEdge(p.at, ring);
    const g = kit.heightAt(p.at[0] + w.n[0], p.at[1] + w.n[1]);
    const yaw = -Math.atan2(w.t[1], w.t[0]);
    const cx = p.at[0] + w.n[0] * 0.08;
    const cz = p.at[1] + w.n[1] * 0.08;
    box(kit.paint, cx, g + p.height / 2, cz, p.width, p.height, 0.05, yaw, lin("#16181a"));
    // Sign band over the portal: dark grey with a light edge.
    box(kit.paint, p.at[0] + w.n[0] * 0.5, g + p.height + 0.55, p.at[1] + w.n[1] * 0.5, p.width + 1.2, 1.0, 0.18, yaw, lin("#3b3f43"));
    box(kit.emissive, p.at[0] + w.n[0] * 0.6, g + p.height + 0.55, p.at[1] + w.n[1] * 0.6, p.width * 0.5, 0.42, 0.02, yaw, lin("#f2f4f6").map((c) => c * LUMINANCE.signLit * 0.5) as [number, number, number]);
    for (const s of [-0.28, 0.28]) {
      const bx = p.at[0] + w.n[0] * 1.6 + w.t[0] * s * p.width;
      const bz = p.at[1] + w.n[1] * 1.6 + w.t[1] * s * p.width;
      box(kit.paint, bx, g + 0.6, bz, 0.35, 1.2, 0.35, yaw, lin("#8d9195"));
    }
  }

  // Top deck: lamp posts on a grid and painted bay lines.
  const deck = kit.paint;
  const bb = bounds(ring);
  const lamp = lin("#f4f6ff").map((c) => c * LUMINANCE.lampHead * 0.5) as [number, number, number];
  // Grid aligned with the long south-west face (bearing 128.8°).
  const ux = Math.sin((128.8 * Math.PI) / 180);
  const uz = -Math.cos((128.8 * Math.PI) / 180);
  const vx = -uz;
  const vz = ux;
  const [cx0, cz0] = [(bb.minX + bb.maxX) / 2, (bb.minZ + bb.maxZ) / 2];
  const yawDeck = -Math.atan2(uz, ux);
  for (let i = -5; i <= 5; i++) {
    for (let j = -5; j <= 5; j++) {
      const x = cx0 + ux * i * 14 + vx * j * 15;
      const z = cz0 + uz * i * 14 + vz * j * 15;
      if (!insetInside([x, z], ring, 3)) continue;
      column(kit.metal, x, z, 0.07, roofY, roofY + 6, lin("#9b9fa2"), 6);
      box(kit.paint, x, roofY + 6.05, z, 0.9, 0.12, 0.35, yawDeck, lin("#2d3033"));
      if (!low) box(kit.emissive, x, roofY + 5.98, z, 0.7, 0.01, 0.25, yawDeck, lamp);
    }
  }
  // Bay lines: rows across the deck every 2.5 m, in two double-row bands.
  if (!low) {
    const white = lin("#d6d6d2");
    for (let row = -2; row <= 2; row++) {
      for (let k = -14; k <= 14; k++) {
        const x = cx0 + ux * k * 2.5 + vx * row * 15;
        const z = cz0 + uz * k * 2.5 + vz * row * 15;
        if (!insetInside([x, z], ring, 2.5)) continue;
        box(deck, x, roofY + 0.012, z, 0.1, 0.02, 5.0, yawDeck, white);
      }
    }
  }

  // The big "P" near the top of the south-west face, by the west corner (YLE photo), in front of the tubes.
  signP(kit, 192.2 + sw.n[0] * 0.75, roofY - 2.4, -6.4 + sw.n[1] * 0.75, sw.yaw, 2.6);

  const centre = new THREE.Vector3((bb.minX + bb.maxX) / 2, roofY / 2, (bb.minZ + bb.maxZ) / 2);
  // Near: real tubes; far: the shell. Phones keep the shell until close (aliasing at low resolution).
  // The 0.11 m tubes alias beyond a few dozen metres; the mip-mapped shell is cleaner there.
  const nearIn = low ? 30 : 48;
  const nearOut = low ? 40 : 62;
  let near = true;
  const setNear = (on: boolean) => {
    near = on;
    tubes.visible = on;
    if (shell) shell.mesh.visible = !on;
  };
  setNear(false);
  return {
    objects: shell ? [tubes, shell.mesh] : [tubes],
    pickables: shell ? [tubes, shell.mesh] : [tubes],
    columns,
    tick(camera) {
      const d = camera.position.distanceTo(centre);
      const want = near ? d < nearOut : d < nearIn;
      if (want === near) return false;
      setNear(want);
      return true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      tubes.dispose();
      shell?.dispose();
    },
  };
}

/** Shell along the tube line with a 1-D barcode texture (colour per tube, alpha = coverage), mip-mapped. */
function makeShell(
  kit: DetailKit,
  offset: V2[],
  segStart: number[],
  total: number,
  tubes: { s: number; c: THREE.Color }[],
  radius: number,
  top: number,
  colonnade: V2[] | null,
  soffit: number,
  ring: V2[],
): { mesh: THREE.Mesh; dispose(): void } | null {
  if (!tubes.length || total <= 0) return null;
  const W = 4096;
  const data = new Uint8Array(W * 4);
  let k = 0;
  for (let x = 0; x < W; x++) {
    const s0 = (x / W) * total;
    const s1 = ((x + 1) / W) * total;
    const sm = (s0 + s1) / 2;
    while (k + 1 < tubes.length && tubes[k + 1].s < sm) k++;
    // Nearest tube and its coverage of this texel (box filter).
    let best = tubes[k];
    if (k + 1 < tubes.length && Math.abs(tubes[k + 1].s - sm) < Math.abs(best.s - sm)) best = tubes[k + 1];
    const cover = Math.max(0, Math.min(s1, best.s + radius) - Math.max(s0, best.s - radius)) / (s1 - s0);
    const c = best.c.clone().convertLinearToSRGB();
    data[x * 4] = Math.round(Math.min(1, c.r) * 255);
    data[x * 4 + 1] = Math.round(Math.min(1, c.g) * 255);
    data[x * 4 + 2] = Math.round(Math.min(1, c.b) * 255);
    data[x * 4 + 3] = Math.round(Math.min(1, cover * 1.1) * 255);
  }
  const tex = new THREE.DataTexture(data, W, 1, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const n = offset.length;
  for (let i = 0; i < n; i++) {
    const a = offset[i];
    const b = offset[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.05) continue;
    const nn = edgeN(ring[i], ring[(i + 1) % n]);
    const mid: V2 = [(a[0] + b[0]) / 2 - nn[0] * 1.2, (a[1] + b[1]) / 2 - nn[1] * 1.2];
    const overColonnade = !!colonnade && pointInRing(mid, colonnade);
    const ya = overColonnade ? soffit : kit.heightAt(a[0], a[1]) - 0.1;
    const yb = overColonnade ? soffit : kit.heightAt(b[0], b[1]) - 0.1;
    const u0 = segStart[i] / total;
    const u1 = (segStart[i] + len) / total;
    const base = positions.length / 3;
    positions.push(a[0], ya, a[1], b[0], yb, b[1], b[0], top, b[1], a[0], top, a[1]);
    for (let j = 0; j < 4; j++) normals.push(nn[0], 0, nn[1]);
    uvs.push(u0, 0, u1, 0, u1, 1, u0, 1);
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  g.computeBoundingSphere();
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    roughness: 0.4,
    metalness: 0.2,
    name: "parkcity-shell",
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.name = "parkcity-shell";
  mesh.userData.pickId = "parkcity";
  mesh.renderOrder = 1;
  return {
    mesh,
    dispose() {
      g.dispose();
      mat.dispose();
      tex.dispose();
    },
  };
}

/** A lit blue square with a white "P" (parking sign) as two emissive boxes on a dark backing. */
function signP(kit: DetailKit, x: number, y: number, z: number, yaw: number, size: number) {
  const blue = lin("#1d58a8").map((c) => c * LUMINANCE.signLit * 0.35) as [number, number, number];
  const white = lin("#ffffff").map((c) => c * LUMINANCE.signLit * 0.6) as [number, number, number];
  box(kit.paint, x, y, z, size + 0.08, size + 0.08, 0.06, yaw, lin("#1d58a8"));
  box(kit.emissive, x, y, z, size, size, 0.07, yaw, blue);
  // The letter: stem and bowl as three bars (reads as "P" at a distance).
  const s = size;
  const off = (dx: number, dy: number): [number, number, number] => {
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    return [x + dx * c, y + dy, z - dx * sn];
  };
  const stem = off(-s * 0.18, 0);
  box(kit.emissive, stem[0], stem[1], stem[2], s * 0.13, s * 0.7, 0.08, yaw, white);
  const top = off(0, s * 0.27);
  box(kit.emissive, top[0], top[1], top[2], s * 0.36, s * 0.12, 0.08, yaw, white);
  const mid = off(0, s * 0.02);
  box(kit.emissive, mid[0], mid[1], mid[2], s * 0.36, s * 0.12, 0.08, yaw, white);
  const side = off(s * 0.16, s * 0.145);
  box(kit.emissive, side[0], side[1], side[2], s * 0.12, s * 0.3, 0.08, yaw, white);
}

/** Outward normal and box() yaw of a wall facing a compass bearing. */
function facingFrame(bearing: number): { n: V2; yaw: number } {
  const b = (bearing * Math.PI) / 180;
  const n: V2 = [Math.sin(b), -Math.cos(b)];
  const t: V2 = [n[1], -n[0]];
  return { n, yaw: -Math.atan2(t[1], t[0]) };
}

function edgeN(a: V2, b: V2): V2 {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l = Math.hypot(dx, dz) || 1;
  return [-dz / l, dx / l];
}

function nearestEdge(p: V2, ring: readonly V2[]): { n: V2; t: V2 } {
  let best = Infinity;
  let n: V2 = [0, -1];
  let t: V2 = [1, 0];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l2 = dx * dx + dz * dz;
    if (l2 < 1e-6) continue;
    const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
    const d = Math.hypot(a[0] + dx * u - p[0], a[1] + dz * u - p[1]);
    if (d < best) {
      best = d;
      const l = Math.sqrt(l2);
      t = [dx / l, dz / l];
      n = [-dz / l, dx / l];
    }
  }
  return { n, t };
}

function bounds(ring: readonly V2[]) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of ring) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  return { minX, maxX, minZ, maxZ };
}

/** Inside the ring and at least `margin` m from its edges. */
function insetInside(p: V2, ring: readonly V2[], margin: number): boolean {
  if (!pointInRing(p, ring)) return false;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l2 = dx * dx + dz * dz || 1;
    const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
    if (Math.hypot(a[0] + dx * u - p[0], a[1] + dz * u - p[1]) < margin) return false;
  }
  return true;
}

/** A rail between a and b, pushed `off` m along the outward normal, `w` thick, from y0 to y1. */
function beamAt(mb: MeshBuilder, a: V2, b: V2, off: number, w: number, y0: number, y1: number, color: [number, number, number]) {
  const nn = edgeN(a, b);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 0.2) return;
  const yaw = -Math.atan2(b[1] - a[1], b[0] - a[0]);
  box(mb, (a[0] + b[0]) / 2 + nn[0] * off, (y0 + y1) / 2, (a[1] + b[1]) / 2 + nn[1] * off, len, y1 - y0, w, yaw, color);
}
