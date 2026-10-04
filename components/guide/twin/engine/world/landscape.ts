import * as THREE from "three";
import type { Collider2D, LightingState, TwinContext, V2, V3, WorldModule } from "../types";
import { loadCampus, loadStreets, loadTerrain, type StreetsData, type StreetSign } from "../data/campus";
import { clamp, hashString, mulberry32, pointInRing, smoothstep } from "../util";
import { LUMINANCE, kelvinToLinear } from "../sky/sky";
import { boxUV } from "../render/uv";
import { canvasTexture, makeCanvas } from "../render/canvas";
import { MeshBuf, appendTinted, lampSpecs, linesOutside, prepareGround, type GroundPlan, type HeightModel, type LampSpec, HERO_PLANTERS } from "./ground";
import { createTreeSystem, speciesFor, treeSize, type TreePlacement, type TreeSystem } from "../props/trees";

/**
 * Street furniture and planting of the whole campus (DESIGN §2, SPEC §4):
 * the register's trees as procedural November trees, every street and path
 * light (galvanised masts with LED heads, lanterns on Jussin aukio, twin
 * globes at EduCity) glowing after sunset, traffic signals at the signalised
 * crossings, the register's traffic signs drawn as Finnish sign faces,
 * benches, bins, bike racks with bikes, bollard lights, bus shelters, fences
 * and hedges, tree grates. Colliders for walk mode (poles, trunks, benches,
 * bins, shelters, fences); kerbs stay walkable.
 *
 * Static furniture is merged per material (a handful of draw calls); trees
 * are BatchedMeshes with LOD (props/trees.ts).
 */

// ── Merged primitive kit ─────────────────────────────────────────────────────

type KitMat =
  | "galv"
  /** Small galvanised parts (sign posts, rack loops, railing posts): no shadows (DESIGN §3). */
  | "galvSmall"
  /** Small dark parts (bins, tyres, frames): no shadows. */
  | "darkSmall"
  /** Small or flat black parts (tree grates, bollard lights): no shadows. */
  | "blackSmall"
  | "dark"
  | "black"
  | "lens"
  | "diffuser"
  | "wood"
  | "green"
  | "bin"
  | "concrete"
  | "signFace"
  | "glass"
  | "red"
  | "amber"
  | "greenLight"
  | "bike"
  | "hedge"
  | "fenceWood"
  | "railFace"
  | "meshFace"
  | "stone";

/**
 * Accumulates geometry per material; every primitive gets metre UVs and outward normals. `detail` < 1
 * (low tier) thins out the round primitives.
 */
export class Kit {
  readonly bufs = new Map<KitMat, MeshBuf>();
  constructor(readonly detail = 1) {}
  private sides(n: number, min: number): number {
    return this.detail >= 1 ? n : Math.max(min, Math.round(n * this.detail));
  }
  buf(m: KitMat): MeshBuf {
    let b = this.bufs.get(m);
    if (!b) {
      b = new MeshBuf();
      this.bufs.set(m, b);
    }
    return b;
  }
  /** Box centred at c (x, z) with its bottom at c[1], size [w (along yaw), h, d], yaw (radians, about +y). */
  box(m: KitMat, c: V3, size: V3, yaw = 0) {
    const g = new THREE.BoxGeometry(size[0], size[1], size[2]);
    g.translate(0, size[1] / 2, 0);
    g.rotateY(yaw);
    g.translate(c[0], c[1], c[2]);
    boxUV(g);
    this.addGeometry(m, g);
  }
  /**
   * Vertical cylinder (or cone) from base point up h. `buried`: the base is in the ground (or in another
   * part), so the bottom cap is left out.
   */
  cyl(m: KitMat, base: V3, h: number, r: number, sides = 10, rTop = r, buried = false) {
    const g = new THREE.CylinderGeometry(rTop, r, h, this.sides(sides, 6), 1, false);
    // Groups: side, top cap, bottom cap (in index order).
    const bottom = g.groups[2];
    if (buried && bottom && g.index) g.setIndex(Array.from(g.index.array.subarray(0, bottom.start)));
    g.translate(base[0], base[1] + h / 2, base[2]);
    boxUV(g);
    this.addGeometry(m, g);
  }
  /** Sphere. */
  sphere(m: KitMat, c: V3, r: number, w = 12, h = 8) {
    const g = new THREE.SphereGeometry(r, this.sides(w, 8), this.sides(h, 6));
    g.translate(c[0], c[1], c[2]);
    boxUV(g);
    this.addGeometry(m, g);
  }
  /** Round tube between two points. */
  tube(m: KitMat, a: V3, b: V3, r: number, sides = 8) {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    if (len < 1e-4) return;
    const g = new THREE.CylinderGeometry(r, r, len, this.sides(sides, 4), 1, true);
    g.translate(0, len / 2, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    g.applyQuaternion(q);
    g.translate(a[0], a[1], a[2]);
    boxUV(g);
    this.addGeometry(m, g);
  }
  /** A flat quad (two-sided via two faces), corners in order, UV rect in the atlas. */
  quad(m: KitMat, corners: [V3, V3, V3, V3], uv: [number, number, number, number] = [0, 0, 1, 1], doubleSided = false) {
    const b = this.buf(m);
    const e1 = new THREE.Vector3(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1], corners[1][2] - corners[0][2]);
    const e2 = new THREE.Vector3(corners[3][0] - corners[0][0], corners[3][1] - corners[0][1], corners[3][2] - corners[0][2]);
    const n = e1.clone().cross(e2).normalize();
    const [u0, v0, u1, v1] = uv;
    const uvs: [number, number][] = [
      [u0, v0],
      [u1, v0],
      [u1, v1],
      [u0, v1],
    ];
    const base = b.vertexCount;
    corners.forEach((c, i) => b.vertex(c[0], c[1], c[2], [n.x, n.y, n.z], uvs[i][0], uvs[i][1]));
    b.tri(base, base + 1, base + 2);
    b.tri(base, base + 2, base + 3);
    if (doubleSided) {
      const base2 = b.vertexCount;
      corners.forEach((c, i) => b.vertex(c[0], c[1], c[2], [-n.x, -n.y, -n.z], uvs[i][0], uvs[i][1]));
      b.tri(base2, base2 + 2, base2 + 1);
      b.tri(base2, base2 + 3, base2 + 2);
    }
  }
  addGeometry(m: KitMat, g: THREE.BufferGeometry) {
    const b = this.buf(m);
    const ng = g.index ? g.toNonIndexed() : g;
    const pos = ng.getAttribute("position");
    const nor = ng.getAttribute("normal");
    const uv = ng.getAttribute("uv");
    const base = b.vertexCount;
    for (let i = 0; i < pos.count; i++) {
      b.vertex(pos.getX(i), pos.getY(i), pos.getZ(i), [nor.getX(i), nor.getY(i), nor.getZ(i)], uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    for (let i = 0; i < pos.count; i++) b.idx.push(base + i);
    if (ng !== g) ng.dispose();
    g.dispose();
  }
}

// ── Finnish traffic sign faces (canvas atlas) ────────────────────────────────

/** Sign atlas cells (8 × 4, 128 px each). */
const SIGN_CELLS: Record<string, number> = {
  E1: 0,
  C38: 1,
  "D3.1": 2,
  "H23.2": 3,
  "H23.1": 4,
  C34: 5,
  E2: 6,
  H20: 7,
  "D7.1": 8,
  "D7.2": 9,
  D6: 10,
  E6: 11,
  B6: 12,
  C37: 13,
  C39: 14,
  C40: 15,
  C32: 16,
  F47: 17,
  T1: 18,
  "E14.1": 19,
  "H12.7": 20,
  E4: 21,
  "F46.1": 22,
  C35: 23,
  TEXT: 24,
  STATION: 25,
  BLANK: 26,
};
const SIGN_COLS = 8;
const SIGN_ROWS = 4;

/** Plate shape and size (m) for a code: [width, height]. Main signs 0.64, additional panels 0.6 × 0.3. */
function plateSize(code: string): [number, number] {
  if (code.startsWith("H") || code === "991") return [0.6, 0.3];
  if (code === "STATION") return [2.4, 0.42];
  return [0.64, 0.64];
}

function signCell(code: string): number {
  if (SIGN_CELLS[code] !== undefined) return SIGN_CELLS[code];
  if (code.startsWith("E4")) return SIGN_CELLS.E4;
  if (code.startsWith("H23")) return SIGN_CELLS["H23.2"];
  if (code.startsWith("H")) return SIGN_CELLS.TEXT;
  if (code.startsWith("C34")) return SIGN_CELLS.C34;
  return SIGN_CELLS.BLANK;
}

/** Draws the sign faces used on campus (simplified Finnish designs; no text beyond numerals/letters on the plates). */
export function makeSignAtlas(cell = 128): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(cell * SIGN_COLS, cell * SIGN_ROWS);
  const BLUE = "#1f5aa8";
  const RED = "#c8202a";
  const s = cell;
  const at = (i: number) => [(i % SIGN_COLS) * s, Math.floor(i / SIGN_COLS) * s] as const;
  const circle = (x: number, y: number, r: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const square = (i: number, fill: string, border = "#ffffff") => {
    const [x, y] = at(i);
    ctx.fillStyle = border;
    ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
    ctx.fillStyle = fill;
    ctx.fillRect(x + 7, y + 7, s - 14, s - 14);
    return [x, y] as const;
  };
  const roundSign = (i: number, fill: string, ring?: string) => {
    const [x, y] = at(i);
    const c = s / 2;
    circle(x + c, y + c, c - 2, ring ?? "#ffffff");
    circle(x + c, y + c, c - (ring ? 13 : 7), fill);
    return [x + c, y + c] as const;
  };
  const text = (str: string, x: number, y: number, size: number, color: string, weight = 700) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(str, x, y);
  };
  const person = (x: number, y: number, k: number, color: string) => {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x, y - 22 * k, 6 * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 7 * k;
    ctx.beginPath();
    ctx.moveTo(x, y - 14 * k);
    ctx.lineTo(x - 2 * k, y + 6 * k);
    ctx.lineTo(x - 12 * k, y + 24 * k);
    ctx.moveTo(x - 2 * k, y + 6 * k);
    ctx.lineTo(x + 10 * k, y + 22 * k);
    ctx.moveTo(x - 12 * k, y - 4 * k);
    ctx.lineTo(x + 2 * k, y - 10 * k);
    ctx.lineTo(x + 12 * k, y);
    ctx.stroke();
  };
  const bike = (x: number, y: number, k: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 * k;
    ctx.beginPath();
    ctx.arc(x - 14 * k, y + 8 * k, 10 * k, 0, Math.PI * 2);
    ctx.arc(x + 14 * k, y + 8 * k, 10 * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 14 * k, y + 8 * k);
    ctx.lineTo(x - 2 * k, y - 8 * k);
    ctx.lineTo(x + 14 * k, y + 8 * k);
    ctx.moveTo(x - 2 * k, y - 8 * k);
    ctx.lineTo(x + 8 * k, y - 8 * k);
    ctx.stroke();
  };
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // E1 pedestrian crossing: blue square, white triangle, walking figure.
  {
    const [x, y] = square(SIGN_CELLS.E1, BLUE);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y + 16);
    ctx.lineTo(x + s - 14, y + s - 18);
    ctx.lineTo(x + 14, y + s - 18);
    ctx.closePath();
    ctx.fill();
    person(x + s / 2, y + s * 0.62, 1.05, "#111111");
    ctx.fillStyle = "#111111";
    for (let k = 0; k < 4; k++) ctx.fillRect(x + 32 + k * 18, y + s - 30, 10, 6);
  }
  // C38 no parking / C37 no stopping.
  {
    const [cx, cy] = roundSign(SIGN_CELLS.C38, BLUE, RED);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(cx - 34, cy - 34);
    ctx.lineTo(cx + 34, cy + 34);
    ctx.stroke();
  }
  {
    const [cx, cy] = roundSign(SIGN_CELLS.C37, BLUE, RED);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(cx - 34, cy - 34);
    ctx.lineTo(cx + 34, cy + 34);
    ctx.moveTo(cx + 34, cy - 34);
    ctx.lineTo(cx - 34, cy + 34);
    ctx.stroke();
  }
  // D3.1 keep right: blue disc, white arrow down-right.
  {
    const [cx, cy] = roundSign(SIGN_CELLS["D3.1"], BLUE);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-7, -36, 14, 52);
    ctx.beginPath();
    ctx.moveTo(-22, 14);
    ctx.lineTo(22, 14);
    ctx.lineTo(0, 40);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // H23.x two-way cycle path panels: white with two opposite arrows and a bike.
  for (const code of ["H23.2", "H23.1"]) {
    const [x, y] = at(SIGN_CELLS[code]);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 2, y + 32, s - 4, s / 2 - 4);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, y + 34, s - 8, s / 2 - 8);
    ctx.fillStyle = "#111111";
    ctx.fillRect(x + 14, y + 50, 40, 5);
    ctx.fillRect(x + 74, y + 72, 40, 5);
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 44);
    ctx.lineTo(x + 6, y + 52);
    ctx.lineTo(x + 14, y + 60);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 114, y + 66);
    ctx.lineTo(x + 122, y + 74);
    ctx.lineTo(x + 114, y + 82);
    ctx.fill();
    bike(x + s / 2, y + 62, 0.45, "#111111");
  }
  // C34 speed-limit zone: white square, red ring "40", ZON/ALUE.
  {
    const [x, y] = at(SIGN_CELLS.C34);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 5, y + 5, s - 10, s - 10);
    circle(x + s / 2, y + 52, 34, RED);
    circle(x + s / 2, y + 52, 26, "#ffffff");
    text("40", x + s / 2, y + 54, 30, "#111111");
    text("ALUE ZON", x + s / 2, y + 104, 15, "#111111");
  }
  // C35 end of zone (greyed, struck through).
  {
    const [x, y] = at(SIGN_CELLS.C35);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
    circle(x + s / 2, y + 52, 34, "#888888");
    circle(x + s / 2, y + 52, 26, "#ffffff");
    text("30", x + s / 2, y + 54, 30, "#888888");
    ctx.strokeStyle = "#666666";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x + 14, y + s - 14);
    ctx.lineTo(x + s - 14, y + 14);
    ctx.stroke();
  }
  // C32 speed limit (round, red ring).
  {
    const [cx, cy] = roundSign(SIGN_CELLS.C32, "#ffffff", RED);
    text("60", cx, cy + 2, 46, "#111111");
  }
  // C39 / C40 no-parking zone / end.
  for (const code of ["C39", "C40"]) {
    const [x, y] = at(SIGN_CELLS[code]);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
    circle(x + s / 2, y + 52, 34, RED);
    circle(x + s / 2, y + 52, 26, BLUE);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x + s / 2 - 22, y + 30);
    ctx.lineTo(x + s / 2 + 22, y + 74);
    ctx.stroke();
    text("ALUE ZON", x + s / 2, y + 104, 15, "#111111");
    if (code === "C40") {
      ctx.strokeStyle = "#555555";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x + 12, y + s - 12);
      ctx.lineTo(x + s - 12, y + 12);
      ctx.stroke();
    }
  }
  // E2 parking, F46.1 parking direction, E4 parking position.
  for (const code of ["E2", "F46.1", "E4"]) {
    const [x, y] = square(SIGN_CELLS[code], BLUE);
    text("P", x + s / 2, y + s / 2 + 4, 84, "#ffffff");
    if (code === "E4") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 22, y + s - 30, 84, 8);
    }
  }
  // H20 / generic text panels.
  for (const code of ["H20", "TEXT"]) {
    const [x, y] = at(SIGN_CELLS[code]);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 2, y + 32, s - 4, s / 2 - 4);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, y + 34, s - 8, s / 2 - 8);
    ctx.fillStyle = "#222222";
    if (code === "H20") text("€", x + 30, y + 62, 34, "#111111");
    for (let k = 0; k < 2; k++) ctx.fillRect(x + (code === "H20" ? 52 : 18), y + 48 + k * 18, code === "H20" ? 58 : 92, 7);
  }
  // D7.x cycle and foot paths side by side, D6 shared path.
  for (const code of ["D7.1", "D7.2", "D6"]) {
    const [x, y] = code === "D6" ? roundSign(SIGN_CELLS[code], BLUE).map((v, i) => v - (i === 0 ? s / 2 : s / 2)) : square(SIGN_CELLS[code], BLUE);
    if (code === "D6") {
      bike(x + s / 2, y + 38, 0.7, "#ffffff");
      person(x + s / 2, y + 92, 0.75, "#ffffff");
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + s / 2 - 2, y + 12, 4, s - 24);
      bike(x + (code === "D7.1" ? 34 : 94), y + s / 2, 0.55, "#ffffff");
      person(x + (code === "D7.1" ? 94 : 34), y + s / 2 + 6, 0.8, "#ffffff");
    }
  }
  // E6 bus stop: blue square, bus pictogram.
  {
    const [x, y] = square(SIGN_CELLS.E6, BLUE);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 26, y + 30, 76, 56);
    ctx.fillStyle = BLUE;
    ctx.fillRect(x + 32, y + 36, 64, 22);
    circle(x + 42, y + 90, 9, "#ffffff");
    circle(x + 86, y + 90, 9, "#ffffff");
  }
  // B6 stop: red octagon.
  {
    const [x, y] = at(SIGN_CELLS.B6);
    const c = s / 2;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k * Math.PI) / 4;
      ctx.lineTo(x + c + Math.cos(a) * (c - 2), y + c + Math.sin(a) * (c - 2));
    }
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + (k * Math.PI) / 4;
      ctx.lineTo(x + c + Math.cos(a) * (c - 8), y + c + Math.sin(a) * (c - 8));
    }
    ctx.fill();
    text("STOP", x + c, y + c + 2, 32, "#ffffff");
  }
  // F47 railway station, T1 ticket machine, E14.1 one-way, H12.7 disabled.
  {
    const [x, y] = square(SIGN_CELLS.F47, BLUE);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 24, y + 40, 80, 42);
    ctx.fillStyle = BLUE;
    ctx.fillRect(x + 32, y + 48, 26, 16);
    ctx.fillRect(x + 66, y + 48, 26, 16);
    circle(x + 40, y + 90, 7, "#ffffff");
    circle(x + 88, y + 90, 7, "#ffffff");
  }
  {
    const [x, y] = square(SIGN_CELLS.T1, BLUE);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 40, y + 26, 48, 76);
    ctx.fillStyle = BLUE;
    ctx.fillRect(x + 50, y + 38, 28, 14);
  }
  {
    const [x, y] = square(SIGN_CELLS["E14.1"], BLUE);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 56, y + 46, 16, 64);
    ctx.beginPath();
    ctx.moveTo(x + 36, y + 50);
    ctx.lineTo(x + 92, y + 50);
    ctx.lineTo(x + 64, y + 18);
    ctx.closePath();
    ctx.fill();
  }
  {
    const [x, y] = at(SIGN_CELLS["H12.7"]);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 2, y + 32, s - 4, s / 2 - 4);
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, y + 34, s - 8, s / 2 - 8);
    circle(x + s / 2, y + 68, 14, "#111111");
    circle(x + s / 2, y + 68, 9, "#ffffff");
  }
  // Station name sign (navy, white text) for the platform.
  {
    const [x, y] = at(SIGN_CELLS.STATION);
    ctx.fillStyle = "#1c2a5c";
    ctx.fillRect(x, y + 44, s, 40);
    text("Kupittaa  Kuppis", x + s / 2, y + 64, 13, "#ffffff", 600);
  }
  {
    const [x, y] = at(SIGN_CELLS.BLANK);
    ctx.fillStyle = "#e8e8e8";
    ctx.fillRect(x + 4, y + 4, s - 8, s - 8);
  }
  const tex = canvasTexture(canvas, { anisotropy: 8 });
  return tex;
}

/** UV rect of an atlas cell, inset half a texel. */
function cellUV(cell: number, square = true): [number, number, number, number] {
  const c = cell % SIGN_COLS;
  const r = Math.floor(cell / SIGN_COLS);
  const u0 = c / SIGN_COLS + 0.002;
  const u1 = (c + 1) / SIGN_COLS - 0.002;
  // Canvas row 0 is the top of the texture (flipY = true on CanvasTexture).
  const v1 = 1 - r / SIGN_ROWS - 0.002;
  const v0 = 1 - (r + 1) / SIGN_ROWS + 0.002;
  if (square) return [u0, v0, u1, v1];
  // Panels use the middle half of the cell.
  const mid = (v0 + v1) / 2;
  const half = (v1 - v0) / 4;
  return [u0, mid - half, u1, mid + half];
}

// ── Placement helpers ────────────────────────────────────────────────────────

/** Unit vector for a compass bearing. */
const bearingVec = (b: number): V2 => [Math.sin((b * Math.PI) / 180), -Math.cos((b * Math.PI) / 180)];

/** Yaw (about +y) that turns a model's +x axis to point along (dx, dz). */
const yawOf = (dx: number, dz: number) => -Math.atan2(dz, dx);

/**
 * Plate normal facing oncoming traffic for a sign whose nearest kerb lies at
 * `kerbBearing` (right-hand traffic: the sign stands on the right of the
 * near-side lane, whose vehicles travel v = (−k.z, k.x); the plate faces −v).
 */
export function signFacing(kerbBearing: number): V2 {
  const k = bearingVec(kerbBearing);
  return [k[1], -k[0]];
}

/** Bike racks, bins and benches: orientation from the nearest kerb or wall, else seeded. */
function orientFor(plan: GroundPlan, at: V2, seed: number): number {
  const hit = plan.kerbField.nearest(at[0], at[1], 8);
  if (hit) return Math.atan2(hit.seg.bz - hit.seg.az, hit.seg.bx - hit.seg.ax);
  return mulberry32(seed)() * Math.PI;
}

// ── Lamps ────────────────────────────────────────────────────────────────────

function buildLamp(kit: Kit, l: LampSpec, colliders: Collider2D[]) {
  const [x, z] = l.at;
  const y = l.y;
  if (l.style !== "canopy") colliders.push({ level: "outdoor", kind: "circle", c: l.at, r: 0.15 });
  switch (l.style) {
    case "canopy": {
      // Linear LED luminaire on the canopy soffit: dark housing, opal diffuser facing down.
      const [ux, uz] = [Math.cos((l.bearing * Math.PI) / 180), Math.sin((l.bearing * Math.PI) / 180)];
      const yaw = yawOf(ux, uz);
      kit.box("darkSmall", [l.head[0], l.head[1] + 0.02, l.head[2]], [1.5, 0.1, 0.16], yaw);
      kit.box("diffuser", [l.head[0], l.head[1], l.head[2]], [1.42, 0.025, 0.12], yaw);
      break;
    }
    case "street": {
      // Galvanised tapered mast, base flange, an arm that rises and turns out over the road, flat LED head.
      kit.cyl("galv", [x, y - 0.3, z], 0.32, 0.16, 10, 0.16, true);
      kit.cyl("galv", [x, y, z], 9.15, 0.095, 10, 0.06, true);
      const [dx, dz] = [l.head[0] - x, l.head[2] - z];
      const len = Math.hypot(dx, dz) || 1;
      const ux = dx / len;
      const uz = dz / len;
      const top = y + 9.15;
      kit.tube("galv", [x, top - 0.05, z], [x + ux * len * 0.35, top + 0.35, z + uz * len * 0.35], 0.045, 8);
      kit.tube("galv", [x + ux * len * 0.35, top + 0.35, z + uz * len * 0.35], [l.head[0], l.head[1] + 0.06, l.head[2]], 0.04, 8);
      const yaw = yawOf(ux, uz);
      kit.box("dark", [l.head[0] + ux * 0.18, l.head[1] - 0.02, l.head[2] + uz * 0.18], [0.66, 0.1, 0.3], yaw);
      // Lens under the head (faces down).
      const cx = l.head[0] + ux * 0.2;
      const cz = l.head[2] + uz * 0.2;
      const ly = l.head[1] - 0.026;
      const px = -uz;
      const pz = ux;
      const a = 0.27;
      const b = 0.12;
      // Corner order makes the lens face down (towards the street).
      kit.quad("lens", [
        [cx + ux * a - px * b, ly, cz + uz * a - pz * b],
        [cx + ux * a + px * b, ly, cz + uz * a + pz * b],
        [cx - ux * a + px * b, ly, cz - uz * a + pz * b],
        [cx - ux * a - px * b, ly, cz - uz * a - pz * b],
      ]);
      break;
    }
    case "globe": {
      // Twin globes on a crossbar (EduCity, Joukahaisenkatu).
      kit.cyl("dark", [x, y - 0.2, z], 4.35, 0.07, 10, 0.05, true);
      const [ux, uz] = bearingVec(l.bearing + 90);
      kit.tube("dark", [x - ux * 0.45, y + 4.15, z - uz * 0.45], [x + ux * 0.45, y + 4.15, z + uz * 0.45], 0.03, 6);
      for (const s of [-0.45, 0.45]) {
        kit.cyl("dark", [x + ux * s, y + 4.15, z + uz * s], 0.12, 0.05, 8);
        kit.sphere("diffuser", [x + ux * s, y + 4.5, z + uz * s], 0.22, 14, 10);
      }
      break;
    }
    case "lantern": {
      // Warm pole-top lantern (Jussin aukio, the deck): dark slim pole, cylindrical diffuser, flat cap.
      kit.cyl("black", [x, y - 0.2, z], 3.75, 0.055, 10, 0.045, true);
      kit.cyl("diffuser", [x, y + 3.55, z], 0.42, 0.13, 14);
      kit.cyl("black", [x, y + 3.97, z], 0.06, 0.2, 14);
      break;
    }
    case "deck":
    case "path":
    default: {
      // Path light: galvanised 4.5 m pole, downlight head with a lens ring.
      kit.cyl("galv", [x, y - 0.2, z], 4.25, 0.06, 10, 0.045, true);
      kit.cyl("dark", [x, y + 4.2, z], 0.18, 0.22, 14, 0.12);
      kit.cyl("lens", [x, y + 4.12, z], 0.08, 0.2, 14);
      break;
    }
  }
}

// ── Traffic signals ──────────────────────────────────────────────────────────

/** Signal poles at both kerb ends of each signalised crossing (and its island), heads facing the traffic. */
function buildSignals(kit: Kit, streets: StreetsData, heights: HeightModel, colliders: Collider2D[], blocked: (p: V2) => boolean) {
  for (const c of streets.crossings) {
    if (c.kind !== "signals") continue;
    const a = c.line[0];
    const b = c.line[c.line.length - 1];
    const t: V2 = [(b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]), (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1])];
    const ends: { p: V2; out: V2 }[] = [
      { p: a, out: [-t[0], -t[1]] },
      { p: b, out: t },
    ];
    if (c.island && c.line.length >= 3) ends.push({ p: c.line[Math.floor(c.line.length / 2)], out: [0, 0] });
    for (const e of ends) {
      // Stand 0.9 m back from the kerb, beside the crossing.
      const side: V2 = [-t[1], t[0]];
      const p: V2 = [e.p[0] + e.out[0] * 0.9 + side[0] * 2.1, e.p[1] + e.out[1] * 0.9 + side[1] * 2.1];
      if (blocked(p)) continue;
      const y = heights.y(p[0], p[1]);
      kit.cyl("galv", [p[0], y - 0.2, p[1]], 3.6, 0.065, 10, 0.065, true);
      colliders.push({ level: "outdoor", kind: "circle", c: p, r: 0.15 });
      // Vehicle heads: traffic near this kerb travels v = (−c.z, c.x) with c the crossing direction from this kerb inwards.
      const cdir: V2 = e.out[0] || e.out[1] ? [-e.out[0], -e.out[1]] : t;
      const v: V2 = [-cdir[1], cdir[0]];
      const faces: V2[] = e.out[0] || e.out[1] ? [[-v[0], -v[1]]] : [
        [-v[0], -v[1]],
        [v[0], v[1]],
      ];
      for (const f of faces) {
        const yaw = yawOf(-f[1], f[0]);
        const hx = p[0] + f[0] * 0.18;
        const hz = p[1] + f[1] * 0.18;
        kit.box("black", [hx, y + 2.35, hz], [0.3, 0.95, 0.22], yaw);
        // Lenses: red (top), amber, green — green lit on the main road, red on the others (static).
        const lit = mulberry32(hashString(`${p[0].toFixed(1)},${p[1].toFixed(1)}`))() < 0.5;
        const lens = (dy: number, m: "red" | "amber" | "greenLight" | "black") => {
          const ly = y + 2.35 + dy;
          const cx = hx + f[0] * 0.115;
          const cz = hz + f[1] * 0.115;
          // Viewer's right when facing the lens: the quad's normal then points along f.
          const px = f[1];
          const pz = -f[0];
          const r = 0.095;
          kit.quad(m, [
            [cx - px * r, ly - r, cz - pz * r],
            [cx + px * r, ly - r, cz + pz * r],
            [cx + px * r, ly + r, cz + pz * r],
            [cx - px * r, ly + r, cz - pz * r],
          ]);
        };
        lens(0.75, lit ? "black" : "red");
        lens(0.47, "black");
        lens(0.19, lit ? "greenLight" : "black");
        // Pedestrian head lower down: red man (lit), green dark.
        kit.box("black", [hx, y + 1.95 - 0.7, hz], [0.24, 0.52, 0.18], yaw);
      }
      // Push-button box.
      kit.box("amber", [p[0] + t[0] * 0.08, y + 1.0, p[1] + t[1] * 0.08], [0.1, 0.16, 0.08]);
    }
  }
}

// ── Signs ────────────────────────────────────────────────────────────────────

function buildSigns(kit: Kit, signs: StreetSign[], heights: HeightModel, colliders: Collider2D[], blocked: (p: V2) => boolean) {
  for (const s of signs) {
    if (!s.plates.length || blocked(s.at)) continue;
    const y = heights.y(s.at[0], s.at[1]);
    const f = s.road ? signFacing(s.road.bearing) : bearingVec(hashString(s.plates[0].code) % 360);
    // Stack plates from 2.1 m up (main signs on top, panels below).
    const sizes = s.plates.map((p) => plateSize(p.code));
    const total = sizes.reduce((acc, [, h]) => acc + h + 0.04, 0);
    const top = y + 2.1 + total;
    kit.cyl("galvSmall", [s.at[0], y - 0.2, s.at[1]], top - y + 0.25, 0.03, 8, 0.03, true);
    colliders.push({ level: "outdoor", kind: "circle", c: s.at, r: 0.1 });
    let cur = top;
    s.plates.forEach((p, i) => {
      const [w, h] = sizes[i];
      const cy = cur - h / 2;
      cur -= h + 0.04;
      const cx = s.at[0] + f[0] * 0.05;
      const cz = s.at[1] + f[1] * 0.05;
      // Viewer's right when facing the plate: the face's normal is f, the atlas reads left to right.
      const px = f[1];
      const pz = -f[0];
      const panel = p.code.startsWith("H") || p.code === "991";
      kit.quad("signFace", [
        [cx - px * (w / 2), cy - h / 2, cz - pz * (w / 2)],
        [cx + px * (w / 2), cy - h / 2, cz + pz * (w / 2)],
        [cx + px * (w / 2), cy + h / 2, cz + pz * (w / 2)],
        [cx - px * (w / 2), cy + h / 2, cz - pz * (w / 2)],
      ], cellUV(signCell(p.code), !panel));
      // Galvanised back.
      kit.quad("galvSmall", [
        [cx - px * (w / 2) - f[0] * 0.01, cy - h / 2, cz - pz * (w / 2) - f[1] * 0.01],
        [cx - px * (w / 2) - f[0] * 0.01, cy + h / 2, cz - pz * (w / 2) - f[1] * 0.01],
        [cx + px * (w / 2) - f[0] * 0.01, cy + h / 2, cz + pz * (w / 2) - f[1] * 0.01],
        [cx + px * (w / 2) - f[0] * 0.01, cy - h / 2, cz + pz * (w / 2) - f[1] * 0.01],
      ]);
    });
  }
}

// ── Furniture ────────────────────────────────────────────────────────────────

function bench(kit: Kit, at: V2, y: number, yaw: number) {
  const ux = Math.cos(yaw);
  const uz = -Math.sin(yaw);
  for (const s of [-0.75, 0.75]) kit.box("darkSmall", [at[0] + ux * s, y - 0.05, at[1] + uz * s], [0.06, 0.47, 0.5], yaw);
  // Seat slats and backrest.
  for (let k = 0; k < 4; k++) {
    const off = -0.2 + k * 0.13;
    kit.box("wood", [at[0] - uz * off, y + 0.42, at[1] + ux * off], [1.8, 0.035, 0.1], yaw);
  }
  for (let k = 0; k < 2; k++) {
    const off = -0.26;
    kit.box("wood", [at[0] - uz * (off - 0.02), y + 0.6 + k * 0.14, at[1] + ux * (off - 0.02)], [1.8, 0.1, 0.035], yaw);
  }
}

function bin(kit: Kit, at: V2, y: number) {
  kit.cyl("bin", [at[0], y - 0.05, at[1]], 0.95, 0.24, 14, 0.24, true);
  kit.cyl("darkSmall", [at[0], y + 0.9, at[1]], 0.08, 0.25, 14);
}

/** A bicycle (1.75 m), wheels as tori, frame as tubes; colour family by seed. */
function bicycle(kit: Kit, at: V2, y: number, yaw: number) {
  const ux = Math.cos(yaw);
  const uz = -Math.sin(yaw);
  const P = (a: number, h: number): V3 => [at[0] + ux * a, y + h, at[1] + uz * a];
  for (const a of [-0.55, 0.55]) {
    const g = new THREE.TorusGeometry(0.33, 0.022, 3, 14);
    g.rotateY(yaw);
    const c = P(a, 0.35);
    g.translate(c[0], c[1], c[2]);
    boxUV(g);
    kit.addGeometry("darkSmall", g);
  }
  kit.tube("bike", P(-0.55, 0.35), P(-0.1, 0.62), 0.018, 5);
  kit.tube("bike", P(-0.1, 0.62), P(0.45, 0.62), 0.02, 5);
  kit.tube("bike", P(-0.1, 0.62), P(0.05, 0.36), 0.02, 5);
  kit.tube("bike", P(0.05, 0.36), P(0.45, 0.62), 0.02, 5);
  kit.tube("bike", P(0.45, 0.62), P(0.55, 0.35), 0.018, 5);
  kit.tube("bike", P(-0.55, 0.35), P(0.05, 0.36), 0.015, 5);
  kit.tube("darkSmall", P(0.45, 0.62), P(0.4, 0.95), 0.016, 5);
  kit.tube("darkSmall", P(0.4, 0.95), P(0.4, 0.95), 0.016, 5);
  kit.box("darkSmall", P(-0.12, 0.84), [0.24, 0.05, 0.1], yaw);
  kit.tube("darkSmall", P(-0.1, 0.62), P(-0.12, 0.84), 0.015, 5);
  const hb: V2 = [-uz, ux];
  const hcx = at[0] + ux * 0.4;
  const hcz = at[1] + uz * 0.4;
  kit.tube("darkSmall", [hcx - hb[0] * 0.28, y + 0.97, hcz - hb[1] * 0.28], [hcx + hb[0] * 0.28, y + 0.97, hcz + hb[1] * 0.28], 0.014, 5);
}

/** Bike rack loops along a line, some bikes parked. */
function bikeRack(kit: Kit, at: V2, y: number, yaw: number, capacity: number, color: KitMat, seed: number) {
  const loops = clamp(Math.round((capacity || 8) / 2), 2, 10);
  const ux = Math.cos(yaw);
  const uz = -Math.sin(yaw);
  const rnd = mulberry32(seed);
  for (let k = 0; k < loops; k++) {
    const s = (k - (loops - 1) / 2) * 0.85;
    const cx = at[0] + ux * s;
    const cz = at[1] + uz * s;
    // Inverted-U loop perpendicular to the rack line.
    const px = -uz;
    const pz = ux;
    kit.tube(color, [cx - px * 0.35, y - 0.1, cz - pz * 0.35], [cx - px * 0.35, y + 0.75, cz - pz * 0.35], 0.025, 6);
    kit.tube(color, [cx + px * 0.35, y - 0.1, cz + pz * 0.35], [cx + px * 0.35, y + 0.75, cz + pz * 0.35], 0.025, 6);
    kit.tube(color, [cx - px * 0.35, y + 0.75, cz - pz * 0.35], [cx + px * 0.35, y + 0.75, cz + pz * 0.35], 0.025, 6);
    // A bike in about a third of the places (November, weekday).
    if (rnd() < 0.36) {
      const turn = (rnd() - 0.5) * 0.1;
      // Phones skip the parked bikes (≈300 triangles each).
      if (kit.detail >= 1) bicycle(kit, [cx + ux * 0.22, cz + uz * 0.22], y, yaw + Math.PI / 2 + turn);
    }
  }
}

/** Black bollard light (0.8 m), lens ring near the top. */
function bollardLight(kit: Kit, at: V2, y: number) {
  kit.cyl("blackSmall", [at[0], y - 0.05, at[1]], 0.62, 0.08, 12, 0.08, true);
  kit.cyl("diffuser", [at[0], y + 0.57, at[1]], 0.12, 0.075, 12);
  kit.cyl("blackSmall", [at[0], y + 0.69, at[1]], 0.1, 0.085, 12);
}

/** Glass bus shelter, 4.4 × 1.5 m, open towards the road (yaw: +x along the kerb, +z… back to the road). */
function busShelter(kit: Kit, at: V2, y: number, yaw: number, backDir: V2) {
  const ux = Math.cos(yaw);
  const uz = -Math.sin(yaw);
  const w = 4.4;
  const d = 1.5;
  const P = (a: number, b: number, h: number): V3 => [at[0] + ux * a + backDir[0] * b, y + h, at[1] + uz * a + backDir[1] * b];
  // Posts.
  for (const a of [-w / 2, w / 2]) for (const b of [0, d]) kit.cyl("dark", P(a, b, -0.05), 2.45, 0.04, 8, 0.04, true);
  // Roof.
  const rc = P(0, d / 2, 2.4);
  kit.box("dark", rc, [w + 0.3, 0.08, d + 0.4], yaw);
  // Back and side glass.
  kit.quad("glass", [P(-w / 2, d, 0.1), P(w / 2, d, 0.1), P(w / 2, d, 2.3), P(-w / 2, d, 2.3)], [0, 0, 1, 1], true);
  kit.quad("glass", [P(-w / 2, 0.15, 0.1), P(-w / 2, d, 0.1), P(-w / 2, d, 2.3), P(-w / 2, 0.15, 2.3)], [0, 0, 1, 1], true);
  kit.quad("glass", [P(w / 2, d, 0.1), P(w / 2, 0.15, 0.1), P(w / 2, 0.15, 2.3), P(w / 2, d, 2.3)], [0, 0, 1, 1], true);
  // Bench inside.
  const bc = P(0, d - 0.35, 0);
  kit.box("wood", [bc[0], y + 0.42, bc[2]], [2.2, 0.06, 0.38], yaw);
  kit.box("dark", [bc[0], y - 0.02, bc[2]], [0.06, 0.44, 0.3], yaw);
}

// ── Fences and hedges ────────────────────────────────────────────────────────

/** Railing (bars) or mesh-fence (chain link) face, 1 m wide per repeat: canvas, alpha-tested. */
export function makeFenceTexture(kind: "rail" | "mesh", px = 256): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(px, px);
  ctx.clearRect(0, 0, px, px);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  if (kind === "rail") {
    // 1 m × 1.1 m: top rail, bottom rail, vertical bars every 0.125 m.
    const rail = Math.max(2, px * 0.045);
    ctx.fillRect(0, 0, px, rail);
    ctx.fillRect(0, px * 0.88, px, rail * 0.8);
    for (let i = 0; i < 8; i++) ctx.fillRect(((i + 0.5) / 8) * px - px * 0.008, 0, Math.max(1.5, px * 0.016), px * 0.92);
  } else {
    // Chain-link diamonds (≈6 cm), a top wire.
    ctx.lineWidth = Math.max(1, px / 220);
    const n = 16;
    for (let i = -n; i <= 2 * n; i++) {
      ctx.beginPath();
      ctx.moveTo((i / n) * px, 0);
      ctx.lineTo(((i + n) / n) * px, px);
      ctx.moveTo((i / n) * px, px);
      ctx.lineTo(((i + n) / n) * px, 0);
      ctx.stroke();
    }
    ctx.fillRect(0, 0, px, Math.max(2, px * 0.02));
  }
  const tex = canvasTexture(canvas, { anisotropy: 8, repeat: true });
  return tex;
}

/** Inside the hero or arrival zone (SPEC §2.1): the City's "fence" lines there are railings on decks, walls and edges. */
const inDetailZone = ([x, z]: V2) => x > -70 && x < 345 && z > -260 && z < 160;

function fence(kit: Kit, line: V2[], kind: string, material: string | undefined, heights: HeightModel, colliders: Collider2D[]) {
  const detail = line.some(inDetailZone);
  const length = line.reduce((acc, p, i) => (i ? acc + Math.hypot(p[0] - line[i - 1][0], p[1] - line[i - 1][1]) : 0), 0);
  // Long OSM walls follow the railway cutting (the DTM has its slope): skip.
  if (kind === "wall" && length > 100) return;
  const railing = (kind === "fence" || kind === "railing" || kind === "guard_rail") && detail && material !== "stone";
  const mesh = kind === "fence" && !material && length > 60;
  if (railing || mesh) {
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.05) continue;
      colliders.push({ level: "outdoor", kind: "segment", a, b });
      const n = Math.max(1, Math.ceil(len / 4));
      const h = mesh ? 1.8 : 1.1;
      for (let k = 0; k < n; k++) {
        const p0: V2 = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n];
        const p1: V2 = [a[0] + ((b[0] - a[0]) * (k + 1)) / n, a[1] + ((b[1] - a[1]) * (k + 1)) / n];
        const y0 = heights.y(p0[0], p0[1], "high");
        const y1 = heights.y(p1[0], p1[1], "high");
        const seg = len / n;
        // u in metres along (one texture repeat per metre), v bottom → top.
        kit.quad(
          mesh ? "meshFace" : "railFace",
          [
            [p0[0], y0, p0[1]],
            [p1[0], y1, p1[1]],
            [p1[0], y1 + h, p1[1]],
            [p0[0], y0 + h, p0[1]],
          ],
          [0, 0, seg, 1],
          true,
        );
        // (Phones: posts only at the corners; the texture carries the bars.)
        if (kit.detail >= 1 || k === 0) kit.cyl("galvSmall", [p0[0], y0 - 0.1, p0[1]], h + 0.12, mesh ? 0.03 : 0.025, 6, mesh ? 0.03 : 0.025, true);
      }
      kit.cyl("galvSmall", [b[0], heights.y(b[0], b[1], "high") - 0.1, b[1]], (mesh ? 1.8 : 1.1) + 0.12, 0.03, 6, 0.03, true);
    }
    return;
  }
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.05) continue;
    colliders.push({ level: "outdoor", kind: "segment", a, b });
    // Pieces follow the ground every 6 m (posts every 2.4 m only near the event).
    const n = Math.max(1, Math.ceil(len / (detail ? 2.4 : 6)));
    for (let k = 0; k < n; k++) {
      const p: V2 = [a[0] + ((b[0] - a[0]) * (k + 0.5)) / n, a[1] + ((b[1] - a[1]) * (k + 0.5)) / n];
      const seg = len / n;
      const y = heights.y(p[0], p[1], "high");
      const yaw = yawOf(b[0] - a[0], b[1] - a[1]);
      if (kind === "hedge") kit.box("hedge", [p[0], y - 0.05, p[1]], [seg + 0.1, 1.0, 0.7], yaw);
      else if (kind === "wall" || material === "stone") kit.box(material === "stone" ? "stone" : "concrete", [p[0], y - 0.1, p[1]], [seg + 0.02, kind === "wall" ? 1.0 : 0.6, 0.3], yaw);
      else if (material === "metal" || kind === "railing" || kind === "guard_rail") {
        kit.box("galvSmall", [p[0], y + 0.95, p[1]], [seg, 0.05, 0.05], yaw);
        kit.box("galvSmall", [p[0], y + 0.45, p[1]], [seg, 0.04, 0.04], yaw);
        kit.cyl("galvSmall", [a[0] + ((b[0] - a[0]) * k) / n, y - 0.1, a[1] + ((b[1] - a[1]) * k) / n], 1.1, 0.03, 6, 0.03, true);
      } else {
        // Wooden board fence 1.2 m with posts.
        kit.box("fenceWood", [p[0], y - 0.05, p[1]], [seg, 1.25, 0.04], yaw);
        if (detail) kit.box("fenceWood", [a[0] + ((b[0] - a[0]) * k) / n, y - 0.1, a[1] + ((b[1] - a[1]) * k) / n], [0.1, 1.4, 0.1], yaw);
      }
    }
  }
}

// ── Module ───────────────────────────────────────────────────────────────────

/** Bollard lights on the Joki NE deck and along the deck walk to the tower (SPEC §4.3, photos). */
const DECK_BOLLARDS: V2[] = [
  [66.7, 6.4],
  [73.0, -3.1],
  [78.2, 22.2],
  [77.1, 27.9],
  [82.6, 16.6],
  [70.8, 2.0],
  [69.0, 9.6],
];

export interface LandscapeModule extends WorldModule {
  trees: TreeSystem;
}

export async function buildLandscape(ctx: TwinContext): Promise<LandscapeModule> {
  const [campus, streets, terrain] = await Promise.all([loadCampus(), loadStreets(), loadTerrain()]);
  const plan = prepareGround(campus, streets, terrain);
  const heights = plan.heights;
  const root = new THREE.Group();
  root.name = "landscape";
  const tier = ctx.tier;
  const owned: { dispose(): void }[] = [];
  const colliders: Collider2D[] = [];
  const kit = new Kit(ctx.tier === "low" ? 0.6 : 1);

  // ── Trees (register + base map + OSM, merged in campus data) and shrubs in the planters.
  const placements: TreePlacement[] = [];
  const ext = terrain.extent;
  // Nothing of the landscape stands inside a hero building (their modules model the interiors): items
  // more than 0.3 m inside an enclosed footprint are dropped, lines are cut at the walls.
  const blocked = (p: V2) => plan.hero.inside(p[0], p[1], 0.3);
  for (const t of streets.trees) {
    if (t.at[0] < ext.minX + 1 || t.at[0] > ext.maxX - 1 || t.at[1] < ext.minZ + 1 || t.at[1] > ext.maxZ - 1) continue;
    if (blocked(t.at)) continue;
    const seed = hashString(`${t.at[0]},${t.at[1]}`);
    const species = speciesFor(t.genus, t.kind === "conifer", t.size, seed);
    const size = treeSize(species, t.size, t.crownR, seed);
    const paved = plan.paved(t.at[0], t.at[1]);
    // A tree in the street register's carriageway is a data error (or a median island): keep it but small.
    placements.push({ at: t.at, y: heights.y(t.at[0], t.at[1], "high") - 0.05, species, height: size.height, crown: size.crown, seed, paved });
    colliders.push({ level: "outdoor", kind: "circle", c: t.at, r: Math.max(0.2, size.height * 0.018) });
    if (paved) {
      // Cast-iron tree grate.
      const y = heights.y(t.at[0], t.at[1], "high") + 0.025;
      kit.cyl("blackSmall", [t.at[0], y - 0.02, t.at[1]], 0.022, 0.75, 20, 0.75, true);
    }
  }
  for (const p of HERO_PLANTERS) {
    const rnd = mulberry32(hashString(p.note));
    const ring = p.ring;
    const xs = ring.map((q) => q[0]);
    const zs = ring.map((q) => q[1]);
    const ground = Math.max(...ring.map(([x, z]) => heights.y(x, z, "high")));
    for (let k = 0; k < 60 && placements.length < 2000; k++) {
      const q: V2 = [Math.min(...xs) + rnd() * (Math.max(...xs) - Math.min(...xs)), Math.min(...zs) + rnd() * (Math.max(...zs) - Math.min(...zs))];
      if (!pointInRing(q, ring)) continue;
      const seed = hashString(`shrub${q[0].toFixed(2)},${q[1].toFixed(2)}`);
      placements.push({ at: q, y: ground + p.height - 0.08, species: "shrub", height: 0.7 + rnd() * 0.6, crown: 0.45 + rnd() * 0.35, seed });
      k += 3;
    }
  }
  const trees = createTreeSystem(ctx, placements);
  root.add(trees.root);
  owned.push(trees);

  // ── Street lights.
  const lamps = lampSpecs(streets, terrain, campus).filter((l) => !blocked(l.at));
  for (const l of lamps) buildLamp(kit, l, colliders);
  // Bollard lights on the Joki deck.
  for (const b of DECK_BOLLARDS) {
    if (blocked(b)) continue;
    bollardLight(kit, b, heights.y(b[0], b[1], "high"));
    colliders.push({ level: "outdoor", kind: "circle", c: b, r: 0.12 });
  }

  // ── Signals and signs.
  buildSignals(kit, streets, heights, colliders, blocked);
  buildSigns(kit, streets.signs, heights, colliders, blocked);

  // ── Furniture from the register and OSM.
  for (const f of streets.furniture) {
    if (f.covered || blocked(f.at)) continue;
    const y = heights.y(f.at[0], f.at[1], "high");
    const seed = hashString(`${f.kind}${f.at[0]},${f.at[1]}`);
    const yaw = orientFor(plan, f.at, seed);
    switch (f.kind) {
      case "bench":
        bench(kit, f.at, y, yaw);
        colliders.push({ level: "outdoor", kind: "circle", c: f.at, r: 0.55 });
        break;
      case "bin":
      case "ashtray":
        bin(kit, f.at, y);
        colliders.push({ level: "outdoor", kind: "circle", c: f.at, r: 0.28 });
        break;
      case "bike_rack":
      case "bike_share":
        bikeRack(kit, f.at, y, yaw, f.capacity ?? 8, f.kind === "bike_share" ? "darkSmall" : f.at[0] > 20 && f.at[0] < 60 && f.at[1] < 0 ? "green" : "galvSmall", seed);
        colliders.push({ level: "outdoor", kind: "circle", c: f.at, r: 0.8 });
        break;
      case "bollard":
        kit.cyl("concrete", [f.at[0], y - 0.05, f.at[1]], 0.85, 0.11, 12, 0.11, true);
        colliders.push({ level: "outdoor", kind: "circle", c: f.at, r: 0.14 });
        break;
      case "info_pylon":
        kit.box("dark", [f.at[0], y - 0.05, f.at[1]], [0.45, 2.2, 0.16], yaw);
        colliders.push({ level: "outdoor", kind: "circle", c: f.at, r: 0.3 });
        break;
      case "info_board":
      case "signpost":
        // Map board: dark frame on two posts, light map face.
        for (const s of [-0.55, 0.55]) kit.cyl("dark", [f.at[0] + Math.cos(yaw) * s, y - 0.1, f.at[1] - Math.sin(yaw) * s], 1.95, 0.035, 8, 0.035, true);
        kit.box("dark", [f.at[0], y + 0.85, f.at[1]], [1.2, 0.95, 0.06], yaw);
        kit.box("concrete", [f.at[0], y + 0.9, f.at[1]], [1.1, 0.85, 0.07], yaw);
        colliders.push({ level: "outdoor", kind: "circle", c: f.at, r: 0.6 });
        break;
      case "parking_machine":
      case "vending_machine":
      case "bike_repair":
        kit.box("dark", [f.at[0], y - 0.05, f.at[1]], f.kind === "vending_machine" ? [0.9, 1.85, 0.75] : [0.32, 1.55, 0.26], yaw);
        colliders.push({ level: "outdoor", kind: "circle", c: f.at, r: 0.4 });
        break;
      case "flagpole":
        kit.cyl("concrete", [f.at[0], y - 0.1, f.at[1]], 10, 0.055, 10, 0.035, true);
        colliders.push({ level: "outdoor", kind: "circle", c: f.at, r: 0.1 });
        break;
      case "artwork":
        if (/meanderi/i.test(f.name ?? "")) {
          // Galvanised meandering tube that doubles as a bike rack (Pulkkinen & Rautiainen 2020).
          const pts: V3[] = [];
          for (let k = 0; k <= 40; k++) {
            const s = (k / 40) * 7 - 3.5;
            pts.push([f.at[0] + s * Math.cos(yaw), y + 0.45 + 0.35 * Math.sin(k * 0.95), f.at[1] - s * Math.sin(yaw) + 0.5 * Math.sin(k * 0.48)]);
          }
          for (let k = 1; k < pts.length; k++) kit.tube("galv", pts[k - 1], pts[k], 0.04, 8);
        } else kit.box("stone", [f.at[0], y - 0.1, f.at[1]], [1.2, 1.1, 0.9], yaw);
        colliders.push({ level: "outdoor", kind: "circle", c: f.at, r: 1 });
        break;
      default:
        break;
    }
  }

  // ── Bus shelters (stops with shelters) and stop poles.
  for (const s of streets.busStops) {
    if (blocked(s.at)) continue;
    const y = heights.y(s.at[0], s.at[1], "high");
    const hit = plan.kerbField.nearest(s.at[0], s.at[1], 12);
    const yaw = hit ? yawOf(hit.seg.bx - hit.seg.ax, hit.seg.bz - hit.seg.az) : 0;
    // Back of the shelter away from the road (the high side's normal points away from the carriageway).
    const back: V2 = hit ? [hit.seg.nx, hit.seg.nz] : [0, 1];
    if (s.shelter) {
      busShelter(kit, [s.at[0] + back[0] * 0.6, s.at[1] + back[1] * 0.6], y, yaw, back);
      colliders.push({ level: "outdoor", kind: "circle", c: [s.at[0] + back[0] * 1.3, s.at[1] + back[1] * 1.3], r: 1.2 });
    }
  }

  // ── Fences, walls and hedges.
  for (const f of streets.fences) {
    // The City's fence lines inside Joki are its roof-walkway railings (the Joki module models them).
    for (const run of linesOutside(f.line, (x, z) => plan.hero.inside(x, z))) fence(kit, run, f.kind, f.material, heights, colliders);
  }

  // ── Materials and meshes.
  const lib = ctx.materials;
  const signTex = makeSignAtlas(tier === "low" ? 64 : 128);
  owned.push(signTex);
  const railTex = makeFenceTexture("rail", tier === "low" ? 128 : 256);
  const meshTex = makeFenceTexture("mesh", tier === "low" ? 128 : 256);
  owned.push(railTex, meshTex);
  const fenceMat = (map: THREE.Texture, color: string) => {
    const m = new THREE.MeshStandardMaterial({ color, map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.5 });
    m.alphaToCoverage = tier !== "low";
    return m;
  };
  const lampColor = kelvinToLinear(3000);
  const lens = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.3, emissive: lampColor, emissiveIntensity: 0 });
  const diffuser = new THREE.MeshStandardMaterial({ color: "#d8d4cc", roughness: 0.5, emissive: kelvinToLinear(2900), emissiveIntensity: 0 });
  // Signal lenses: one material, the colour (red / amber / green) per vertex drives the emission.
  const signal = new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.35, emissive: "#ffffff", emissiveIntensity: LUMINANCE.bollard * 0.6, vertexColors: true });
  signal.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>
	#ifdef USE_COLOR
		totalEmissiveRadiance *= vColor.rgb;
	#endif`,
    );
  };
  signal.customProgramCacheKey = () => "landscape-signal";
  // Kit parts merged per library material (vertex colours tint the parts).
  const groups: { name: string; mat: THREE.Material; parts: [KitMat, string | null][]; base: string | null; cast: boolean; depth?: THREE.Texture }[] = [
    {
      name: "galv",
      mat: lib.variant("steel", { color: "#a3a7aa", roughness: 0.58 }),
      base: null,
      parts: [["galv", null]],
      cast: true,
    },
    {
      name: "galvSmall",
      mat: lib.variant("steel", { color: "#a3a7aa", roughness: 0.58 }),
      base: null,
      parts: [["galvSmall", null]],
      cast: false,
    },
    {
      name: "metal",
      mat: lib.variant("metalDark", { color: "#2b2d30", roughness: 0.55 }),
      base: "#2b2d30",
      parts: [
        ["dark", "#2b2d30"],
        ["black", "#151618"],
      ],
      cast: true,
    },
    {
      name: "metalSmall",
      mat: lib.variant("metalDark", { color: "#2b2d30", roughness: 0.55 }),
      base: "#2b2d30",
      parts: [
        ["darkSmall", "#2b2d30"],
        ["blackSmall", "#151618"],
        ["green", "#2f5b3a"],
        ["bin", "#38403c"],
        ["bike", "#3b4652"],
      ],
      cast: false,
    },
    {
      name: "wood",
      mat: lib.variant("oak", { color: "#7a5f45", roughness: 0.88 }),
      base: "#7a5f45",
      parts: [
        ["wood", "#7a5f45"],
        ["fenceWood", "#6b5a48"],
      ],
      cast: true,
    },
    {
      name: "concrete",
      mat: lib.variant("concreteFacade", { color: "#a09d97", roughness: 0.9 }),
      base: "#a09d97",
      parts: [
        ["concrete", "#a09d97"],
        ["stone", "#8d8780"],
      ],
      cast: true,
    },
    { name: "lens", mat: lens, base: null, parts: [["lens", null]], cast: false },
    { name: "diffuser", mat: diffuser, base: null, parts: [["diffuser", null]], cast: false },
    {
      name: "signal",
      mat: signal,
      base: "#ffffff",
      parts: [
        ["red", "#ff2a1a"],
        ["amber", "#ffaa22"],
        ["greenLight", "#22ff88"],
      ],
      cast: false,
    },
    {
      name: "signFace",
      mat: new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.45, metalness: 0, transparent: false, alphaTest: 0.5 }),
      base: null,
      parts: [["signFace", null]],
      cast: false,
    },
    { name: "glass", mat: lib.get("glassInterior"), base: null, parts: [["glass", null]], cast: false },
    { name: "hedge", mat: lib.variant("grass", { color: "#3b4128" }), base: null, parts: [["hedge", null]], cast: true },
    { name: "railFace", mat: fenceMat(railTex, "#2a2d30"), base: null, parts: [["railFace", null]], cast: true, depth: railTex },
    { name: "meshFace", mat: fenceMat(meshTex, "#8a8f93"), base: null, parts: [["meshFace", null]], cast: false },
  ];
  for (const g of groups) {
    if (g.name !== "glass") owned.push(g.mat);
    const merged = new MeshBuf();
    for (const [part, hex] of g.parts) {
      const buf = kit.bufs.get(part);
      if (!buf) continue;
      if (!g.base || !hex) {
        appendTinted(merged, buf, [1, 1, 1]);
        continue;
      }
      const c = new THREE.Color(hex);
      const b = new THREE.Color(g.base);
      appendTinted(merged, buf, [c.r / Math.max(b.r, 1e-4), c.g / Math.max(b.g, 1e-4), c.b / Math.max(b.b, 1e-4)]);
    }
    const geo = merged.geometry(g.base !== null);
    if (!geo) continue;
    if (g.base !== null && g.mat instanceof THREE.MeshStandardMaterial) {
      g.mat.vertexColors = true;
      g.mat.needsUpdate = true;
    }
    const mesh = new THREE.Mesh(geo, g.mat);
    mesh.name = `landscape-${g.name}`;
    // Phones: only the poles cast (their long low-sun shadows read; the rest is below a 1024² texel).
    mesh.castShadow = g.cast && (tier !== "low" || g.name === "galv");
    mesh.receiveShadow = g.name !== "lens" && g.name !== "diffuser" && g.name !== "signal";
    if (g.depth) {
      // Bars cast bar shadows, not a solid panel.
      const depth = new THREE.MeshDepthMaterial({ map: g.depth, alphaTest: 0.5, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
      mesh.customDepthMaterial = depth;
      owned.push(depth);
    }
    root.add(mesh);
  }

  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("groundDebug")) {
    const rows: string[] = [];
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || (o as THREE.BatchedMesh).isBatchedMesh) return;
      const idx = m.geometry.getIndex();
      rows.push(`${m.name}: ${Math.round((idx ? idx.count : m.geometry.getAttribute("position").count) / 3)}`);
    });
    const st = trees.stats();
    console.warn(`[landscape] trees ${st.trees} variants ${st.variants} vertices ${st.vertices} | ${rows.join(" | ")}`);
    (window as unknown as { __landscape?: THREE.Object3D }).__landscape = root;
  }
  const setLighting = (state: LightingState) => {
    // Lamps switch on at sunset, full by civil dusk; signals always on, faint in daylight.
    const on = smoothstep(1.0, -4.0, state.sunElevationDeg);
    lens.emissiveIntensity = on * LUMINANCE.lampHead;
    diffuser.emissiveIntensity = on * LUMINANCE.lampHead * 0.12;
  };

  const landscape: LandscapeModule = {
    id: "landscape",
    root,
    labels: [],
    pickables: [],
    targets: [],
    colliders,
    trees,
    ready: lib.ready(),
    setLighting,
    tick(dt, _elapsed, camera) {
      // Wind and LOD only; never keeps the renderer awake on its own.
      trees.tick(dt, camera);
      return false;
    },
    dispose() {
      for (const o of owned) o.dispose();
    },
  };
  setLighting(ctx.lighting());
  return landscape;
}
