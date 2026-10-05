import * as THREE from "three";
import type { TwinContext, V2 } from "../types";
import { clamp, mulberry32 } from "../util";
import { canvasTexture, makeCanvas } from "../render/canvas";
import { sanitizeMesh } from "../world/ground";

/**
 * Procedural trees for the campus twin (SPEC §4.6): species-shaped branch
 * skeletons as bark tubes, the fine twig mass as soft alpha cards from a
 * canvas-drawn atlas, a few late leaves — early November in Turku, so the
 * deciduous trees are bare or nearly bare (limes and birches keep a few
 * yellow leaves, oaks their brown ones), spruces, pines and thujas green.
 *
 * Everything is deterministic (mulberry32 seeds). Variants are generated
 * once per species at three levels of detail and drawn with BatchedMesh
 * (one draw call per material for every tree on the campus); each tree
 * switches LOD with the camera distance. A gentle wind sway runs in the
 * vertex shader on ultra/high (never with reduced motion) and only advances
 * while frames are rendered — it never keeps the renderer awake by itself.
 */

export type TreeSpecies =
  | "tilia"
  | "acer"
  | "ulmus"
  | "sorbus"
  | "betula"
  | "quercus"
  | "fraxinus"
  | "malus"
  | "populus"
  | "prunus"
  | "aesculus"
  | "picea"
  | "pinus"
  | "thuja"
  | "shrub";

type Shape = "ovoid" | "round" | "vase" | "conical" | "columnar" | "spreading" | "umbrella";

interface LevelParams {
  /** Children per parent (scaled by the parent's length). */
  count: number;
  /** Branching angle from the parent (degrees, random range). */
  angle: [number, number];
  /** Length relative to the parent. */
  ratio: number;
  /** Tropism per metre: + bends up, − droops. */
  up: number;
  /** Random curvature per segment. */
  curve: number;
  /** Children start this far along the parent (0–1). */
  start: number;
}

interface SpeciesParams {
  conifer: boolean;
  /** Nominal height (m) and crown radius (m) the variants are generated at. */
  height: number;
  crown: number;
  shape: Shape;
  /** Fraction of the height with no branches. */
  clear: number;
  /** Trunk splits into this many leaders at `split` (0 = one trunk to the top). */
  leaders: number;
  split: number;
  /** Trunk radius at the base (m). */
  trunkR: number;
  lean: number;
  levels: [LevelParams, LevelParams, LevelParams];
  /** Twig atlas cell and card size (m) at LOD0. */
  twigCell: number;
  twigSize: number;
  /** Twig cards per metre of finest branch. */
  twigDensity: number;
  /** Birch bark or the generic bark; base tint. */
  barkBirch: boolean;
  barkTint: string;
  /** Late leaves (count at LOD0), their colours and half-size (m; one leaf per quad). */
  leaves: number;
  leafColors: string[];
  leafSize: number;
  /** Weeping twigs (birch). */
  weep: number;
}

const L = (count: number, angle: [number, number], ratio: number, up: number, curve: number, start: number): LevelParams => ({
  count,
  angle,
  ratio,
  up,
  curve,
  start,
});

/** Species shapes, tuned against photos of the campus streets in late autumn. */
export const SPECIES: Record<TreeSpecies, SpeciesParams> = {
  tilia: {
    conifer: false,
    height: 13,
    crown: 4.6,
    shape: "ovoid",
    clear: 0.22,
    leaders: 0,
    split: 0,
    trunkR: 0.2,
    lean: 0.04,
    levels: [L(22, [42, 64], 0.5, 0.18, 0.1, 0.18), L(6, [30, 55], 0.48, 0.12, 0.14, 0.12), L(5, [28, 50], 0.45, 0.04, 0.22, 0.1)],
    twigCell: 1,
    twigSize: 0.95,
    twigDensity: 1.6,
    barkBirch: false,
    barkTint: "#6f6a64",
    leaves: 70,
    leafColors: ["#c9a43c", "#b98f2e", "#d6b74e"],
    leafSize: 0.055,
    weep: 0,
  },
  acer: {
    conifer: false,
    height: 11,
    crown: 5,
    shape: "round",
    clear: 0.22,
    leaders: 4,
    split: 0.4,
    trunkR: 0.2,
    lean: 0.05,
    levels: [L(9, [30, 55], 0.62, 0.12, 0.12, 0.25), L(6, [30, 58], 0.5, 0.06, 0.16, 0.15), L(4, [30, 55], 0.45, 0.02, 0.22, 0.1)],
    twigCell: 0,
    twigSize: 0.9,
    twigDensity: 1.3,
    barkBirch: false,
    barkTint: "#5d5852",
    leaves: 20,
    leafColors: ["#c98a2c", "#b5652a", "#d4a23c"],
    leafSize: 0.075,
    weep: 0,
  },
  ulmus: {
    conifer: false,
    height: 15,
    crown: 6.8,
    shape: "vase",
    clear: 0.18,
    leaders: 3,
    split: 0.33,
    trunkR: 0.28,
    lean: 0.05,
    levels: [L(10, [22, 42], 0.64, 0.05, 0.12, 0.3), L(5, [35, 60], 0.48, -0.02, 0.18, 0.12), L(5, [30, 55], 0.42, -0.04, 0.24, 0.1)],
    twigCell: 1,
    twigSize: 1.05,
    twigDensity: 1.05,
    barkBirch: false,
    barkTint: "#625b53",
    leaves: 0,
    leafColors: ["#a88a3a", "#9c7a30"],
    leafSize: 0.05,
    weep: 0,
  },
  sorbus: {
    conifer: false,
    height: 7,
    crown: 2.6,
    shape: "ovoid",
    clear: 0.25,
    leaders: 0,
    split: 0,
    trunkR: 0.11,
    lean: 0.05,
    levels: [L(12, [28, 46], 0.56, 0.22, 0.12, 0.18), L(5, [25, 45], 0.5, 0.15, 0.15, 0.12), L(3, [25, 45], 0.45, 0.05, 0.2, 0.15)],
    twigCell: 3,
    twigSize: 0.7,
    twigDensity: 1.3,
    barkBirch: false,
    barkTint: "#6a645d",
    leaves: 40,
    leafColors: ["#b58a3c", "#a8742e", "#c49a48"],
    leafSize: 0.05,
    weep: 0,
  },
  betula: {
    conifer: false,
    height: 14,
    crown: 3.8,
    shape: "ovoid",
    clear: 0.2,
    leaders: 0,
    split: 0,
    trunkR: 0.17,
    lean: 0.07,
    levels: [L(18, [40, 62], 0.48, 0.1, 0.12, 0.2), L(6, [35, 60], 0.5, -0.12, 0.16, 0.15), L(5, [25, 45], 0.55, -0.35, 0.18, 0.1)],
    twigCell: 2,
    twigSize: 1.1,
    twigDensity: 1.7,
    barkBirch: true,
    barkTint: "#e4e2dc",
    leaves: 60,
    leafColors: ["#d8b84a", "#e0c35a", "#c9a23a"],
    leafSize: 0.035,
    weep: 0.6,
  },
  quercus: {
    conifer: false,
    height: 12,
    crown: 5.5,
    shape: "spreading",
    clear: 0.22,
    leaders: 3,
    split: 0.38,
    trunkR: 0.26,
    lean: 0.06,
    levels: [L(9, [35, 70], 0.6, 0.0, 0.26, 0.2), L(6, [40, 70], 0.5, 0.0, 0.3, 0.12), L(4, [35, 65], 0.42, 0.0, 0.32, 0.1)],
    twigCell: 3,
    twigSize: 0.85,
    twigDensity: 1.2,
    barkBirch: false,
    barkTint: "#58514a",
    leaves: 450,
    leafColors: ["#7a5130", "#8a5e36", "#6a4428", "#9a6a3c"],
    leafSize: 0.065,
    weep: 0,
  },
  fraxinus: {
    conifer: false,
    height: 15,
    crown: 5.2,
    shape: "ovoid",
    clear: 0.28,
    leaders: 3,
    split: 0.42,
    trunkR: 0.24,
    lean: 0.04,
    levels: [L(8, [25, 45], 0.6, 0.15, 0.12, 0.25), L(5, [25, 50], 0.5, 0.1, 0.15, 0.15), L(3, [25, 45], 0.42, 0.06, 0.18, 0.15)],
    twigCell: 3,
    twigSize: 0.9,
    twigDensity: 1.0,
    barkBirch: false,
    barkTint: "#7a756e",
    leaves: 0,
    leafColors: ["#a8a050"],
    leafSize: 0.05,
    weep: 0,
  },
  malus: {
    conifer: false,
    height: 6,
    crown: 3.2,
    shape: "spreading",
    clear: 0.2,
    leaders: 4,
    split: 0.3,
    trunkR: 0.13,
    lean: 0.1,
    levels: [L(7, [35, 65], 0.58, 0.06, 0.28, 0.2), L(5, [35, 65], 0.5, 0.06, 0.3, 0.12), L(3, [30, 60], 0.42, 0.08, 0.3, 0.12)],
    twigCell: 3,
    twigSize: 0.65,
    twigDensity: 1.4,
    barkBirch: false,
    barkTint: "#5e564e",
    leaves: 25,
    leafColors: ["#a07a34", "#8c6a2c"],
    leafSize: 0.04,
    weep: 0,
  },
  populus: {
    conifer: false,
    height: 19,
    crown: 4.2,
    shape: "columnar",
    clear: 0.15,
    leaders: 0,
    split: 0,
    trunkR: 0.3,
    lean: 0.03,
    levels: [L(24, [18, 34], 0.42, 0.35, 0.08, 0.15), L(5, [20, 40], 0.45, 0.25, 0.12, 0.12), L(3, [20, 40], 0.45, 0.15, 0.18, 0.12)],
    twigCell: 0,
    twigSize: 1.0,
    twigDensity: 1.2,
    barkBirch: false,
    barkTint: "#7c7a72",
    leaves: 0,
    leafColors: ["#b8a040"],
    leafSize: 0.05,
    weep: 0,
  },
  prunus: {
    conifer: false,
    height: 7,
    crown: 3,
    shape: "round",
    clear: 0.28,
    leaders: 3,
    split: 0.35,
    trunkR: 0.12,
    lean: 0.06,
    levels: [L(7, [30, 55], 0.6, 0.12, 0.16, 0.2), L(5, [30, 55], 0.5, 0.08, 0.18, 0.12), L(3, [30, 50], 0.45, 0.04, 0.2, 0.12)],
    twigCell: 0,
    twigSize: 0.7,
    twigDensity: 1.4,
    barkBirch: false,
    barkTint: "#4f3f38",
    leaves: 0,
    leafColors: ["#b0503a", "#c46a3a"],
    leafSize: 0.04,
    weep: 0,
  },
  aesculus: {
    conifer: false,
    height: 14,
    crown: 6,
    shape: "round",
    clear: 0.2,
    leaders: 4,
    split: 0.36,
    trunkR: 0.3,
    lean: 0.03,
    levels: [L(9, [32, 58], 0.6, 0.06, 0.12, 0.22), L(6, [30, 55], 0.48, 0.02, 0.16, 0.12), L(4, [30, 55], 0.42, 0.04, 0.2, 0.1)],
    twigCell: 3,
    twigSize: 0.95,
    twigDensity: 1.2,
    barkBirch: false,
    barkTint: "#5e5751",
    leaves: 0,
    leafColors: ["#9a6a30"],
    leafSize: 0.08,
    weep: 0,
  },
  picea: {
    conifer: true,
    height: 16,
    crown: 3.4,
    shape: "conical",
    clear: 0.04,
    leaders: 0,
    split: 0,
    trunkR: 0.24,
    lean: 0.01,
    levels: [L(34, [70, 95], 0.5, -0.08, 0.06, 0.04), L(5, [40, 60], 0.45, 0.0, 0.1, 0.2), L(0, [0, 0], 0, 0, 0, 0)],
    twigCell: 4,
    twigSize: 1.0,
    twigDensity: 2.6,
    barkBirch: false,
    barkTint: "#4e443c",
    leaves: 0,
    leafColors: [],
    leafSize: 0.05,
    weep: 0,
  },
  pinus: {
    conifer: true,
    height: 17,
    crown: 3.6,
    shape: "umbrella",
    clear: 0.55,
    leaders: 0,
    split: 0,
    trunkR: 0.24,
    lean: 0.06,
    levels: [L(12, [45, 75], 0.38, 0.12, 0.16, 0.5), L(5, [35, 55], 0.5, 0.15, 0.2, 0.25), L(0, [0, 0], 0, 0, 0, 0)],
    twigCell: 5,
    twigSize: 1.1,
    twigDensity: 1.8,
    barkBirch: false,
    barkTint: "#8a5a3a",
    leaves: 0,
    leafColors: [],
    leafSize: 0.05,
    weep: 0,
  },
  shrub: {
    conifer: false,
    height: 1.2,
    crown: 0.8,
    shape: "round",
    clear: 0.0,
    leaders: 6,
    split: 0.02,
    trunkR: 0.025,
    lean: 0.15,
    levels: [L(4, [25, 50], 0.6, 0.3, 0.25, 0.3), L(0, [0, 0], 0, 0, 0, 0), L(0, [0, 0], 0, 0, 0, 0)],
    twigCell: 3,
    twigSize: 0.42,
    twigDensity: 3.2,
    barkBirch: false,
    barkTint: "#4a3e33",
    leaves: 25,
    leafColors: ["#7a5a30", "#8a6a34", "#6a4e2a"],
    leafSize: 0.03,
    weep: 0,
  },
  thuja: {
    conifer: true,
    height: 7,
    crown: 1.3,
    shape: "columnar",
    clear: 0.03,
    leaders: 0,
    split: 0,
    trunkR: 0.1,
    lean: 0.01,
    levels: [L(30, [25, 45], 0.32, 0.4, 0.08, 0.03), L(3, [25, 40], 0.4, 0.3, 0.1, 0.2), L(0, [0, 0], 0, 0, 0, 0)],
    twigCell: 6,
    twigSize: 0.9,
    twigDensity: 3.0,
    barkBirch: false,
    barkTint: "#5a4a3c",
    leaves: 0,
    leafColors: [],
    leafSize: 0.05,
    weep: 0,
  },
};

/** Register genus (and size) → the species model; unknown deciduous trees get a plausible street-tree mix. */
export function speciesFor(genus: string | undefined, conifer: boolean, size: string | undefined, seed: number): TreeSpecies {
  const g = (genus ?? "").toLowerCase();
  const known: Record<string, TreeSpecies> = {
    tilia: "tilia",
    acer: "acer",
    ulmus: "ulmus",
    sorbus: "sorbus",
    betula: "betula",
    quercus: "quercus",
    fraxinus: "fraxinus",
    malus: "malus",
    populus: "populus",
    prunus: "prunus",
    aesculus: "aesculus",
    picea: "picea",
    pinus: "pinus",
    thuja: "thuja",
  };
  if (known[g]) return known[g];
  const r = mulberry32(seed)();
  if (conifer) return r < 0.6 ? "picea" : r < 0.85 ? "pinus" : "thuja";
  if (size === "large") return r < 0.4 ? "tilia" : r < 0.65 ? "ulmus" : r < 0.85 ? "acer" : "betula";
  if (size === "small") return r < 0.45 ? "sorbus" : r < 0.7 ? "malus" : r < 0.85 ? "prunus" : "betula";
  return r < 0.35 ? "tilia" : r < 0.6 ? "acer" : r < 0.8 ? "betula" : "sorbus";
}

/** Height and crown radius (m) of a tree from the register's size class and measured crown. */
export function treeSize(species: TreeSpecies, size: string | undefined, crownR: number | undefined, seed: number): { height: number; crown: number } {
  const sp = SPECIES[species];
  const rnd = mulberry32(seed ^ 0x51ed);
  const k = size === "small" ? 0.62 : size === "large" ? 1.25 : 0.95;
  let height = sp.height * k * (0.88 + rnd() * 0.24);
  // Register crowns (orthophoto, rough): trust them in the plausible range.
  let crown = crownR !== undefined && crownR >= 1.2 ? crownR : sp.crown * k * (0.85 + rnd() * 0.3);
  crown = clamp(crown, sp.crown * 0.45, sp.crown * 1.7);
  // A wide measured crown on a small-class tree: let it grow a little taller too.
  height = Math.max(height, crown * (sp.conifer ? 2.6 : 1.5));
  return { height: clamp(height, 3, 26), crown };
}

// ── Geometry ─────────────────────────────────────────────────────────────────

/** Growing buffers of one tree part. */
export class PartBuf {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  /** Per-vertex sway weight (0 at the trunk base … 1 at the tips). */
  sway: number[] = [];
  /** Vertex colour (leaves). */
  col: number[] = [];
  idx: number[] = [];
  get count() {
    return this.pos.length / 3;
  }
  geometry(withColor = false): THREE.BufferGeometry {
    sanitizeMesh(this.pos, this.nor, this.idx);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute("sway", new THREE.Float32BufferAttribute(this.sway, 1));
    if (withColor) g.setAttribute("color", new THREE.Float32BufferAttribute(this.col.length ? this.col : new Array(this.count * 3).fill(1), 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export interface TreeMeshData {
  wood: PartBuf;
  twigs: PartBuf;
  leaves: PartBuf;
  /** Nominal size the variant was grown at. */
  height: number;
  crown: number;
}

const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** Atlas: 4 × 2 cells (u0, v0 of each cell; each 0.25 × 0.5). */
const ATLAS_COLS = 4;
const ATLAS_ROWS = 2;

interface Grow {
  sp: SpeciesParams;
  rnd: () => number;
  lod: 0 | 1 | 2;
  out: TreeMeshData;
  H: number;
  R: number;
  /** Deepest level drawn as bark tubes. */
  tubeLevel: number;
  /** Level whose branches carry the twig cards (deeper levels are represented by the cards). */
  cardLevel: number;
  /** Card size (m) and cards per metre of carrying branch. */
  cardSize: number;
  cardDensity: number;
  sides: number[];
  segs: number[];
  crownCenter: THREE.Vector3;
  /** Rough metres of card-carrying branch per tree (spreads the leaves). */
  twigBudget: number;
}

/** Relative branch length by height in the crown (0 = crown base, 1 = top). */
function envelope(shape: Shape, h: number): number {
  const t = clamp(h, 0, 1);
  switch (shape) {
    case "conical":
      return Math.max(0.05, 1 - t) * (0.85 + 0.15 * Math.sin(t * 9));
    case "columnar":
      return 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.05));
    case "round":
      return Math.sqrt(Math.max(0.04, 1 - (2 * t - 0.9) ** 2));
    case "vase":
      return 0.45 + 0.55 * Math.sin(Math.PI * (0.25 + t * 0.6));
    case "spreading":
      return 0.65 + 0.35 * Math.sin(Math.PI * (0.15 + t * 0.7));
    case "umbrella":
      return 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1));
    case "ovoid":
    default:
      return 0.25 + 0.75 * Math.sin(Math.PI * Math.pow(t, 0.75));
  }
}

/** Any unit vector perpendicular to d. */
function perpendicular(d: THREE.Vector3): THREE.Vector3 {
  const a = Math.abs(d.y) < 0.9 ? v3(0, 1, 0) : v3(1, 0, 0);
  return a.cross(d).normalize();
}

/** A tapered tube along points (parallel-transport frames), u around in metres, v along in metres. */
function emitTube(buf: PartBuf, pts: THREE.Vector3[], radii: number[], sides: number, H: number) {
  if (pts.length < 2) return;
  const base = buf.count;
  let normal = perpendicular(pts[1].clone().sub(pts[0]).normalize());
  let along = 0;
  for (let i = 0; i < pts.length; i++) {
    const t = (i + 1 < pts.length ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
    if (i > 0) {
      along += pts[i].distanceTo(pts[i - 1]);
      // Parallel transport: remove the tangent component.
      normal = normal.sub(t.clone().multiplyScalar(normal.dot(t))).normalize();
    }
    const binormal = t.clone().cross(normal).normalize();
    const r = radii[i];
    const circ = Math.max(0.05, 2 * Math.PI * r);
    for (let k = 0; k <= sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      const nx = normal.x * Math.cos(a) + binormal.x * Math.sin(a);
      const ny = normal.y * Math.cos(a) + binormal.y * Math.sin(a);
      const nz = normal.z * Math.cos(a) + binormal.z * Math.sin(a);
      buf.pos.push(pts[i].x + nx * r, pts[i].y + ny * r, pts[i].z + nz * r);
      buf.nor.push(nx, ny, nz);
      buf.uv.push((k / sides) * circ, along);
      buf.sway.push(clamp(pts[i].y / H, 0, 1) ** 2);
    }
  }
  const ring = sides + 1;
  for (let i = 1; i < pts.length; i++) {
    for (let k = 0; k < sides; k++) {
      const a = base + (i - 1) * ring + k;
      const b = base + i * ring + k;
      buf.idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
}

/** Two crossed alpha cards (an X) centred on c, `along` direction up the card, from the atlas cell. */
function emitCard(g: Grow, buf: PartBuf, c: THREE.Vector3, along: THREE.Vector3, w: number, h: number, cell: number, spin: number) {
  const up = along.clone().normalize();
  let side = perpendicular(up);
  side.applyAxisAngle(up, spin);
  const col = cell % ATLAS_COLS;
  const row = Math.floor(cell / ATLAS_COLS);
  const u0 = col / ATLAS_COLS;
  const u1 = (col + 1) / ATLAS_COLS;
  const v0 = 1 - (row + 1) / ATLAS_ROWS;
  const v1 = 1 - row / ATLAS_ROWS;
  // Normals point out of the crown (soft, volumetric lighting) rather than along the card plane.
  const n = c.clone().sub(g.crownCenter).add(v3(0, 0.6 * g.R, 0)).normalize();
  for (let q = 0; q < 2; q++) {
    if (q) side = side.clone().applyAxisAngle(up, Math.PI / 2);
    const base = buf.count;
    const corners: [number, number, number, number][] = [
      [-0.5, 0, u0, v0],
      [0.5, 0, u1, v0],
      [0.5, 1, u1, v1],
      [-0.5, 1, u0, v1],
    ];
    for (const [sx, sy, u, v] of corners) {
      const p = c
        .clone()
        .addScaledVector(side, sx * w)
        .addScaledVector(up, (sy - 0.15) * h);
      buf.pos.push(p.x, p.y, p.z);
      buf.nor.push(n.x, n.y, n.z);
      buf.uv.push(u, v);
      buf.sway.push(clamp(p.y / g.H, 0, 1) ** 2 + 0.25);
    }
    buf.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}

/** A single leaf quad (atlas of 6 leaves in the library texture: 2 columns × 3 rows). */
function emitLeaf(g: Grow, c: THREE.Vector3, color: THREE.Color) {
  const buf = g.out.leaves;
  const s = g.sp.leafSize * (0.8 + g.rnd() * 0.45);
  const n = v3(g.rnd() - 0.5, g.rnd() * 0.8 + 0.2, g.rnd() - 0.5).normalize();
  const a = perpendicular(n);
  const b = n.clone().cross(a);
  const cell = Math.floor(g.rnd() * 6);
  const cu = (cell % 2) / 2;
  const cv = Math.floor(cell / 2) / 3;
  const base = buf.count;
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  for (const [x, y] of corners) {
    const p = c
      .clone()
      .addScaledVector(a, x * s)
      .addScaledVector(b, y * s);
    buf.pos.push(p.x, p.y, p.z);
    buf.nor.push(n.x, n.y, n.z);
    buf.uv.push(cu + ((x + 1) / 2) * 0.5, 1 - (cv + ((1 - y) / 2) / 3));
    buf.sway.push(clamp(p.y / g.H, 0, 1) ** 2 + 0.4);
    buf.col.push(color.r, color.g, color.b);
  }
  buf.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

interface BranchSpec {
  start: THREE.Vector3;
  dir: THREE.Vector3;
  length: number;
  radius: number;
  level: number;
}

/** Grow a branch, emit its tube, recurse into children; card-level branches carry twig cards and leaves. */
function grow(g: Grow, b: BranchSpec) {
  const { sp, rnd } = g;
  const lvl = sp.levels[Math.min(2, Math.max(0, b.level - 1))];
  const nSeg = g.segs[Math.min(b.level, g.segs.length - 1)];
  const pts: THREE.Vector3[] = [b.start.clone()];
  const radii: number[] = [b.radius];
  const d = b.dir.clone().normalize();
  const stepLen = b.length / nSeg;
  const up = v3(0, 1, 0);
  for (let i = 1; i <= nSeg; i++) {
    const t = i / nSeg;
    if (b.level === 0) {
      // Trunk: a slow wander, staying upright.
      d.add(v3((rnd() - 0.5) * 0.08, 0, (rnd() - 0.5) * 0.08)).add(up.clone().multiplyScalar(0.06)).normalize();
    } else {
      d.add(up.clone().multiplyScalar(lvl.up * stepLen));
      // Weeping twigs droop more towards their tips.
      if (sp.weep && b.level >= 2) d.add(v3(0, -sp.weep * stepLen * t, 0));
      d.add(v3((rnd() - 0.5) * lvl.curve, (rnd() - 0.5) * lvl.curve * 0.6, (rnd() - 0.5) * lvl.curve)).normalize();
    }
    pts.push(pts[i - 1].clone().addScaledVector(d, stepLen));
    // Taper: thick trunk flare, then towards a fine tip.
    const taper = b.level === 0 ? 1 - 0.72 * Math.pow(t, 0.9) : 1 - 0.85 * t;
    radii.push(Math.max(0.006, b.radius * taper));
  }
  if (b.level === 0 && g.lod < 2) radii[0] *= 1.35; // root flare
  if (b.level <= g.tubeLevel) emitTube(g.out.wood, pts, radii, g.sides[Math.min(b.level, g.sides.length - 1)], g.H);

  const next = b.level < 2 ? sp.levels[b.level] : null;
  if (b.level >= g.cardLevel || !next || !next.count) {
    // Twig cards along the branch: they stand in for every finer level.
    const n = Math.max(1, Math.round(b.length * g.cardDensity));
    for (let k = 0; k < n; k++) {
      const f = 0.2 + (0.8 * (k + rnd() * 0.8)) / n;
      const idx = Math.min(pts.length - 2, Math.floor(f * (pts.length - 1)));
      const c = pts[idx].clone().lerp(pts[idx + 1], f * (pts.length - 1) - idx);
      const dirAlong = pts[idx + 1].clone().sub(pts[idx]).normalize();
      // Conifer fronds lie flatter; deciduous sprays fan out from the branch.
      const tilt = sp.conifer ? 0.2 : 0.55;
      const along = dirAlong.clone().add(v3(rnd() - 0.5, rnd() - 0.4, rnd() - 0.5).multiplyScalar(tilt));
      if (sp.weep) along.add(v3(0, -sp.weep * 0.9, 0));
      along.normalize();
      const h = g.cardSize * (0.85 + rnd() * 0.3);
      emitCard(g, g.out.twigs, c, along, h * (sp.conifer ? 0.95 : 0.85), h, sp.twigCell, rnd() * Math.PI);
    }
    if (sp.leaves && g.lod < 2) {
      const count = Math.floor((sp.leaves / g.twigBudget) * b.length * (g.lod === 0 ? 1 : 0.22) + rnd());
      for (let k = 0; k < count; k++) {
        const f = 0.35 + rnd() * 0.65;
        const idx = Math.min(pts.length - 2, Math.floor(f * (pts.length - 1)));
        const c = pts[idx].clone().lerp(pts[idx + 1], f * (pts.length - 1) - idx);
        const spread = g.cardSize * 0.6;
        c.add(v3((rnd() - 0.5) * spread, (rnd() - 0.5) * spread * 0.7, (rnd() - 0.5) * spread));
        emitLeaf(g, c, new THREE.Color(sp.leafColors[Math.floor(rnd() * sp.leafColors.length)]));
      }
    }
    return;
  }
  // Children.
  const count = Math.max(1, Math.round(next.count * (b.level === 0 ? 1 : clamp(b.length / (g.H * 0.35), 0.5, 1.15))));
  let az = rnd() * Math.PI * 2;
  for (let k = 0; k < count; k++) {
    const f = next.start + (1 - next.start) * ((k + 0.3 + rnd() * 0.5) / count);
    const idx = Math.min(pts.length - 2, Math.floor(f * (pts.length - 1)));
    const pos = pts[idx].clone().lerp(pts[idx + 1], f * (pts.length - 1) - idx);
    const pdir = pts[idx + 1].clone().sub(pts[idx]).normalize();
    az += (137.5 * Math.PI) / 180 + (rnd() - 0.5) * 0.6;
    const ang = THREE.MathUtils.degToRad(next.angle[0] + rnd() * (next.angle[1] - next.angle[0]));
    const axis = perpendicular(pdir).applyAxisAngle(pdir, az);
    const dir = pdir.clone().applyAxisAngle(axis, ang);
    let length: number;
    if (b.level === 0) {
      // Trunk children: length from the crown envelope at their height, keeping the crown inside its radius.
      const crownBase = g.H * sp.clear;
      const h = (pos.y - crownBase) / Math.max(1, g.H - crownBase);
      if (h < -0.02) continue;
      const horiz = Math.max(0.25, Math.hypot(dir.x, dir.z));
      length = sp.conifer
        ? Math.max(0.3, g.R * envelope(sp.shape, h) * (0.85 + rnd() * 0.3))
        : Math.min(g.R / horiz, g.R * 1.5) * envelope(sp.shape, h) * (0.75 + rnd() * 0.35);
      // Never past the crown top.
      if (dir.y > 0.05) length = Math.min(length, ((g.H * 1.04 - pos.y) / dir.y) * 0.9);
    } else length = b.length * next.ratio * (0.7 + rnd() * 0.55) * (1 - f * 0.35);
    if (length < 0.12) continue;
    const r = Math.max(0.008, radii[idx] * (b.level === 0 ? 0.42 : 0.55) * Math.min(1, length / (b.length * 0.8)));
    grow(g, { start: pos, dir, length, radius: r, level: b.level + 1 });
  }
}

/**
 * One tree variant at a level of detail. LOD0: trunk, limbs and branches as
 * bark tubes, twig cards on the branches; LOD1: trunk and limbs, larger
 * cards on the limbs; LOD2 (far): the trunk only and big haze cards along
 * the (undrawn) limbs. Deciduous ≈7k / 1.5k / 0.5k triangles.
 */
export function generateTree(species: TreeSpecies, seed: number, lod: 0 | 1 | 2): TreeMeshData {
  const sp = SPECIES[species];
  const rnd = mulberry32(seed);
  const out: TreeMeshData = { wood: new PartBuf(), twigs: new PartBuf(), leaves: new PartBuf(), height: sp.height, crown: sp.crown };
  const H = sp.height;
  const R = sp.crown;
  const con = sp.conifer;
  const tubeLevel = con ? (lod < 2 ? 1 : 0) : 2 - lod;
  const cardLevel = con ? 1 : lod === 0 ? 2 : 1;
  const cardSize = sp.twigSize * (con ? [1, 1.35, 1.9][lod] : [1, 2.2, 3.1][lod]);
  const cardDensity = sp.twigDensity * (con ? [1, 0.62, 0.36][lod] : [1, 0.62, 0.3][lod]);
  const g: Grow = {
    sp,
    rnd,
    lod,
    out,
    H,
    R,
    tubeLevel,
    cardLevel,
    cardSize,
    cardDensity,
    sides: lod === 0 ? [7, 4, 3] : lod === 1 ? [5, 3, 3] : [4, 3, 3],
    segs: lod === 0 ? [8, 4, 3] : lod === 1 ? [6, 3, 2] : [5, 2, 2],
    crownCenter: v3(0, H * (sp.clear + (1 - sp.clear) * 0.45), 0),
    twigBudget: Math.max(20, sp.levels[0].count * (cardLevel === 2 ? sp.levels[1].count : 1) * R * (cardLevel === 2 ? 0.45 : 1.1)),
  };
  // Trunk (or leaders).
  const lean = v3((rnd() - 0.5) * sp.lean * 2, 1, (rnd() - 0.5) * sp.lean * 2).normalize();
  if (!sp.leaders) {
    grow(g, { start: v3(0, -0.15, 0), dir: lean, length: H * (con ? 1.0 : 0.92), radius: sp.trunkR, level: 0 });
  } else {
    // Short trunk to the split, then leaders that carry the crown.
    const splitH = H * sp.split;
    const trunkTop = lean.clone().multiplyScalar(splitH).add(v3(0, -0.15, 0));
    emitTube(out.wood, [v3(0, -0.15, 0), lean.clone().multiplyScalar(splitH * 0.5), trunkTop], [sp.trunkR * 1.3, sp.trunkR * 1.02, sp.trunkR * 0.86], g.sides[0], H);
    let az = rnd() * Math.PI * 2;
    for (let k = 0; k < sp.leaders; k++) {
      az += (Math.PI * 2) / sp.leaders + (rnd() - 0.5) * 0.5;
      const spread = THREE.MathUtils.degToRad(18 + rnd() * 16);
      const dir = v3(Math.sin(spread) * Math.cos(az), Math.cos(spread), Math.sin(spread) * Math.sin(az)).normalize();
      grow(g, { start: trunkTop.clone(), dir, length: (H - splitH) * (0.9 + rnd() * 0.15), radius: sp.trunkR * 0.62, level: 0 });
    }
  }
  return out;
}

// ── Textures ─────────────────────────────────────────────────────────────────

/**
 * Twig/needle atlas, 4 × 2 cells: 0 fine twigs, 1 dense fine twigs (lime,
 * elm), 2 birch (pendulous, reddish), 3 sparse stout twigs (whitebeam, ash,
 * oak, apple), 4 spruce frond, 5 pine tufts, 6 thuja sprays, 7 spare. Drawn
 * once, deterministic; transparent background, premultiplied-safe colours.
 */
export function makeTwigAtlas(cellSize = 256): THREE.CanvasTexture {
  const W = cellSize * ATLAS_COLS;
  const H = cellSize * ATLAS_ROWS;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.clearRect(0, 0, W, H);
  const s = cellSize;
  const drawTwigs = (cx: number, cy: number, opts: { color: string; width: number; depth: number; spread: number; droop: number; density: number; seed: number; buds?: string }) => {
    const rnd = mulberry32(opts.seed);
    ctx.save();
    ctx.lineCap = "round";
    const stroke = (x: number, y: number, ang: number, len: number, w: number, depth: number) => {
      const segs = 4;
      let px = x;
      let py = y;
      let a = ang;
      ctx.lineWidth = w;
      ctx.strokeStyle = opts.color;
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let i = 0; i < segs; i++) {
        a += (rnd() - 0.5) * 0.45 + opts.droop * 0.12;
        px += Math.sin(a) * (len / segs);
        py -= Math.cos(a) * (len / segs);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      if (opts.buds && depth === 0) {
        ctx.fillStyle = opts.buds;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.8, w * 1.2), 0, Math.PI * 2);
        ctx.fill();
      }
      if (depth <= 0) return;
      const kids = Math.round(opts.density * (1 + rnd()));
      for (let k = 0; k < kids; k++) {
        const f = 0.25 + rnd() * 0.7;
        const bx = x + (px - x) * f;
        const by = y + (py - y) * f;
        const side = rnd() < 0.5 ? -1 : 1;
        stroke(bx, by, ang + side * opts.spread * (0.6 + rnd() * 0.6), len * (0.45 + rnd() * 0.3), Math.max(0.55, w * 0.62), depth - 1);
      }
    };
    stroke(cx, cy, (rnd() - 0.5) * 0.2, s * 0.86, opts.width, opts.depth);
    ctx.restore();
  };
  // Cell origins: (col, row) → top-left.
  const cell = (i: number): [number, number] => [(i % ATLAS_COLS) * s, Math.floor(i / ATLAS_COLS) * s];
  const sprays = (i: number, opts: Omit<Parameters<typeof drawTwigs>[2], "seed">, n: number, seed: number) => {
    const [x0, y0] = cell(i);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, s, s);
    ctx.clip();
    for (let k = 0; k < n; k++) drawTwigs(x0 + s * (0.3 + 0.4 * (k / Math.max(1, n - 1))), y0 + s * 0.98, { ...opts, seed: seed + k * 17 });
    ctx.restore();
  };
  sprays(0, { color: "#3b342e", width: 2.2, depth: 3, spread: 0.55, droop: 0, density: 2.2, buds: "#4a3a2e" }, 2, 11);
  sprays(1, { color: "#3a322c", width: 2.0, depth: 4, spread: 0.5, droop: 0.05, density: 2.4, buds: "#5a3428" }, 3, 23);
  // Birch: thin reddish twigs hanging in curtains.
  {
    const [x0, y0] = cell(2);
    const rnd = mulberry32(37);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, s, s);
    ctx.clip();
    ctx.lineCap = "round";
    for (let k = 0; k < 26; k++) {
      const sx = x0 + s * (0.1 + rnd() * 0.8);
      let px = sx;
      let py = y0 + s * (0.04 + rnd() * 0.2);
      ctx.strokeStyle = rnd() < 0.5 ? "#4a3226" : "#5a3a2c";
      ctx.lineWidth = 0.8 + rnd() * 0.8;
      ctx.beginPath();
      ctx.moveTo(px, py);
      for (let i = 0; i < 8; i++) {
        px += (rnd() - 0.5) * s * 0.03;
        py += s * (0.08 + rnd() * 0.04);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // A few stiffer twigs at the top.
    ctx.restore();
    sprays(2, { color: "#4a3428", width: 1.6, depth: 2, spread: 0.7, droop: 0.4, density: 1.6 }, 1, 41);
  }
  sprays(3, { color: "#40372f", width: 3.0, depth: 2, spread: 0.6, droop: 0, density: 1.8, buds: "#3a2e26" }, 2, 53);
  // Spruce frond: a central rachis with dense dark needles, slightly drooping.
  {
    const [x0, y0] = cell(4);
    const rnd = mulberry32(61);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, s, s);
    ctx.clip();
    ctx.lineCap = "round";
    for (let f = 0; f < 3; f++) {
      const cx = x0 + s * (0.3 + 0.2 * f);
      for (let i = 0; i < 70; i++) {
        const t = i / 70;
        const y = y0 + s * (0.96 - t * 0.9);
        const len = s * 0.09 * (1 - t * 0.5);
        for (const side of [-1, 1]) {
          ctx.strokeStyle = rnd() < 0.5 ? "#1f2e22" : "#273a2a";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(cx + (rnd() - 0.5) * 2, y);
          ctx.lineTo(cx + side * len * (0.7 + rnd() * 0.5), y + len * (0.3 + rnd() * 0.3));
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }
  // Pine tufts: long needles in brushes at the twig tips.
  {
    const [x0, y0] = cell(5);
    const rnd = mulberry32(67);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, s, s);
    ctx.clip();
    ctx.lineCap = "round";
    for (let k = 0; k < 7; k++) {
      const cx = x0 + s * (0.15 + rnd() * 0.7);
      const cy = y0 + s * (0.15 + rnd() * 0.7);
      for (let i = 0; i < 60; i++) {
        const a = rnd() * Math.PI * 2;
        const len = s * (0.06 + rnd() * 0.08);
        ctx.strokeStyle = rnd() < 0.5 ? "#3d5a32" : "#4a6a3a";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  // Thuja: flat fan-shaped scale sprays.
  {
    const [x0, y0] = cell(6);
    const rnd = mulberry32(71);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, s, s);
    ctx.clip();
    for (let k = 0; k < 40; k++) {
      const cx = x0 + s * (0.1 + rnd() * 0.8);
      const cy = y0 + s * (0.1 + rnd() * 0.85);
      ctx.fillStyle = rnd() < 0.5 ? "#2f4a2a" : "#3a5631";
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * (0.05 + rnd() * 0.06), s * (0.02 + rnd() * 0.03), rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  const tex = canvasTexture(canvas, { anisotropy: 4 });
  tex.premultiplyAlpha = false;
  return tex;
}

// ── The tree system ──────────────────────────────────────────────────────────

export interface TreePlacement {
  at: V2;
  /** Ground level (m). */
  y: number;
  species: TreeSpecies;
  height: number;
  crown: number;
  seed: number;
  /** Planted in a hard surface (tree grate) — no effect on the model. */
  paved?: boolean;
}

export interface TreeSystem {
  root: THREE.Group;
  /** Per frame: wind time and LOD; never asks for frames by itself. */
  tick(dt: number, camera: THREE.PerspectiveCamera): boolean;
  setReducedMotion(on: boolean): void;
  stats(): { trees: number; variants: number; vertices: number };
  dispose(): void;
}

const VARIANTS: Partial<Record<TreeSpecies, number>> = { tilia: 3, acer: 3, ulmus: 3, sorbus: 3, betula: 2, malus: 2 };

/** Wind sway in the vertex shader (bark, twigs, leaves): sway weight × gentle gusts, per-tree phase. */
function addWind(m: THREE.Material, wind: { uTrTime: THREE.IUniform<number>; uTrWind: THREE.IUniform<number> }, flutter: number, key: string) {
  const prev = m.onBeforeCompile;
  const prevKey = m.customProgramCacheKey();
  m.customProgramCacheKey = () => `${prevKey}|tr-wind-${key}`;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.uniforms.uTrTime = wind.uTrTime;
    shader.uniforms.uTrWind = wind.uTrWind;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float sway;\nuniform float uTrTime;\nuniform float uTrWind;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
	{
		vec3 trO = vec3( 0.0 );
		#ifdef USE_BATCHING
			trO = batchingMatrix[ 3 ].xyz;
		#endif
		float trPh = dot( trO.xz, vec2( 0.071, 0.113 ) );
		float trT = uTrTime;
		float gust = 0.6 + 0.4 * sin( trT * 0.31 + trPh * 0.5 );
		float w = sway * uTrWind * gust;
		transformed.x += ( sin( trT * 1.05 + trPh ) * 0.16 + sin( trT * 2.3 + trPh * 1.7 + position.y ) * 0.04 ) * w;
		transformed.z += ( sin( trT * 0.83 + trPh + 1.3 ) * 0.1 ) * w;
		${flutter ? `transformed += normal * sin( trT * 6.1 + dot( position, vec3( 3.1, 1.7, 2.3 ) ) ) * ${flutter.toFixed(3)} * uTrWind * sway;` : ""}
	}`,
      );
  };
  m.needsUpdate = true;
}

/**
 * Every tree of the campus: BatchedMeshes for bark, birch bark, twig cards,
 * conifer foliage and late leaves; per-tree LOD by camera distance.
 */
export function createTreeSystem(ctx: TwinContext, placements: TreePlacement[]): TreeSystem {
  const root = new THREE.Group();
  root.name = "trees";
  const tier = ctx.tier;
  const lods: (0 | 1 | 2)[] = tier === "low" ? [1, 2] : [0, 1, 2];
  const lodDist = tier === "ultra" ? [38, 110] : tier === "high" ? [30, 90] : [0, 45];
  const lib = ctx.materials;
  const wind = { uTrTime: { value: 0 }, uTrWind: { value: tier === "low" || ctx.reducedMotion ? 0 : 1 } };
  const owned: { dispose(): void }[] = [];

  // Materials: bark (variant per family via instance colour), birch bark, twig cards (soft), foliage (cut-out), leaves.
  const bark = lib.variant("bark", { color: "#ffffff" });
  const birch = lib.variant("barkBirch", { color: "#ffffff" });
  const atlas = makeTwigAtlas(tier === "low" ? 128 : 256);
  owned.push(atlas);
  const twigs = new THREE.MeshStandardMaterial({
    map: atlas,
    transparent: true,
    alphaTest: 0.04,
    depthWrite: false,
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0,
    color: "#d6d2cc",
  });
  twigs.name = "tree-twigs";
  const needles = new THREE.MeshStandardMaterial({
    map: atlas,
    alphaTest: 0.42,
    side: THREE.DoubleSide,
    roughness: 0.92,
    metalness: 0,
    color: "#ffffff",
  });
  needles.name = "tree-needles";
  // The leaf atlas once per quad (tile 1 × 1): the library's foliage tiles every 0.2 m, which on these
  // cell UVs drew a lattice of small leaves on every quad — the "polka-dot" crowns.
  const leafLib = lib.variant("foliage", { tile: [1, 1] });
  const leaves = new THREE.MeshStandardMaterial({
    map: leafLib.map,
    normalMap: leafLib.normalMap,
    alphaTest: 0.45,
    side: THREE.DoubleSide,
    roughness: 0.85,
    vertexColors: true,
    color: "#ffffff",
  });
  leaves.name = "tree-leaves";
  for (const m of [bark, birch]) addWind(m, wind, 0, "bark");
  // (GTAO reads the main pass's depth: cut-out cards occlude exactly as drawn, the soft twig cards —
  // no depth write — not at all.)
  addWind(twigs, wind, 0.012, "twigs");
  addWind(needles, wind, 0.008, "needles");
  addWind(leaves, wind, 0.03, "leaves");
  owned.push(bark, birch, twigs, needles, leaves, leafLib);

  // Variants needed.
  interface Variant {
    species: TreeSpecies;
    seed: number;
    lod: Record<number, TreeMeshData>;
  }
  const variants = new Map<string, Variant>();
  const variantOf = (p: TreePlacement) => {
    const n = VARIANTS[p.species] ?? 1;
    const k = `${p.species}#${p.seed % n}`;
    let v = variants.get(k);
    if (!v) {
      v = { species: p.species, seed: 1000 + (p.seed % n) * 7919 + p.species.length * 31, lod: {} };
      for (const l of lods) v.lod[l] = generateTree(p.species, v.seed, l);
      variants.set(k, v);
    }
    return v;
  };
  const treeVariant = placements.map(variantOf);

  // Size the batches.
  type Part = "wood" | "twigs" | "leaves";
  const sum = (part: Part, pred: (v: Variant) => boolean) => {
    let verts = 0;
    let idx = 0;
    for (const v of variants.values()) {
      if (!pred(v)) continue;
      for (const l of lods) {
        verts += v.lod[l][part].count;
        idx += v.lod[l][part].idx.length;
      }
    }
    return { verts: Math.max(4, verts), idx: Math.max(6, idx) };
  };
  const isBirch = (v: Variant) => SPECIES[v.species].barkBirch;
  const isConifer = (v: Variant) => SPECIES[v.species].conifer;
  const n = placements.length;
  const make = (part: Part, pred: (v: Variant) => boolean, mat: THREE.Material, color: boolean) => {
    const size = sum(part, pred);
    const count = placements.filter((_, i) => pred(treeVariant[i])).length;
    const mesh = new THREE.BatchedMesh(Math.max(1, count), size.verts, size.idx, mat);
    const geoIds = new Map<string, number>();
    for (const [k, v] of variants) {
      if (!pred(v)) continue;
      for (const l of lods) {
        const buf = v.lod[l][part];
        if (!buf.count) continue;
        const g = buf.geometry(color);
        geoIds.set(`${k}|${l}`, mesh.addGeometry(g));
        g.dispose();
      }
    }
    return { mesh, geoIds };
  };
  const batches = {
    wood: make("wood", (v) => !isBirch(v), bark, false),
    birch: make("wood", isBirch, birch, false),
    twigs: make("twigs", (v) => !isConifer(v), twigs, false),
    needles: make("twigs", isConifer, needles, false),
    leaves: make("leaves", (v) => SPECIES[v.species].leaves > 0, leaves, true),
  };
  const partOf: Record<keyof typeof batches, Part> = { wood: "wood", birch: "wood", twigs: "twigs", needles: "twigs", leaves: "leaves" };
  // Instances.
  interface Inst {
    batch: keyof typeof batches;
    id: number;
    key: string;
  }
  const insts: Inst[][] = placements.map(() => []);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const keyOf = (v: Variant) => [...variants.entries()].find(([, x]) => x === v)?.[0] ?? "";
  const variantKeys = treeVariant.map(keyOf);
  placements.forEach((p, i) => {
    const v = treeVariant[i];
    const data = v.lod[lods[0]];
    const s = p.height / data.height;
    const c = clamp(p.crown / (data.crown * s), 0.75, 1.3);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), mulberry32(p.seed)() * Math.PI * 2);
    m.compose(new THREE.Vector3(p.at[0], p.y, p.at[1]), q, new THREE.Vector3(s * c, s, s * c));
    const tint = new THREE.Color(SPECIES[p.species].barkTint);
    for (const name of Object.keys(batches) as (keyof typeof batches)[]) {
      const b = batches[name];
      const gid = b.geoIds.get(`${variantKeys[i]}|${lods[0]}`);
      if (gid === undefined) continue;
      const id = b.mesh.addInstance(gid);
      b.mesh.setMatrixAt(id, m);
      if (name === "wood" || name === "birch") b.mesh.setColorAt(id, tint);
      insts[i].push({ batch: name, id, key: variantKeys[i] });
    }
  });
  void n;
  for (const [name, b] of Object.entries(batches) as [keyof typeof batches, (typeof batches)[keyof typeof batches]][]) {
    b.mesh.name = `trees-${name}`;
    b.mesh.receiveShadow = true;
    b.mesh.castShadow = name === "wood" || name === "birch" || name === "needles" || (name === "twigs" && tier !== "low");
    b.mesh.frustumCulled = true;
    b.mesh.perObjectFrustumCulled = true;
    b.mesh.sortObjects = name === "twigs";
    if (name === "twigs") {
      // Twig cards cast dappled shadows through a cut-out depth material.
      b.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ map: atlas, alphaTest: 0.3, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
      owned.push(b.mesh.customDepthMaterial);
      b.mesh.renderOrder = 2;
    }
    if (name === "needles") {
      b.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ map: atlas, alphaTest: 0.42, depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
      owned.push(b.mesh.customDepthMaterial);
    }
    root.add(b.mesh);
    owned.push({ dispose: () => b.mesh.dispose() });
  }

  // LOD by distance, re-evaluated when the camera has moved a few metres.
  const current = new Int8Array(placements.length).fill(lods[0]);
  const distance = new Float32Array(placements.length);
  const lastCam = new THREE.Vector3(Infinity, 0, 0);
  const lodFor = (d: number): 0 | 1 | 2 => {
    if (lods[0] === 1) return d < lodDist[1] ? 1 : 2;
    return d < lodDist[0] ? 0 : d < lodDist[1] ? 1 : 2;
  };
  const updateLod = (cam: THREE.Vector3) => {
    let changed = false;
    placements.forEach((p, i) => {
      const d = Math.hypot(p.at[0] - cam.x, p.y + p.height * 0.5 - cam.y, p.at[1] - cam.z);
      distance[i] = d;
      const l = lodFor(d);
      if (l === current[i]) return;
      current[i] = l;
      changed = true;
      for (const inst of insts[i]) {
        const b = batches[inst.batch];
        const gid = b.geoIds.get(`${inst.key}|${l}`);
        if (gid === undefined) b.mesh.setVisibleAt(inst.id, false);
        else {
          b.mesh.setVisibleAt(inst.id, true);
          b.mesh.setGeometryIdAt(inst.id, gid);
        }
      }
    });
    return changed;
  };
  void partOf;

  // Shadow LOD. Twig cards cast only from close trees (LOD 0): further out their dappling is finer than a
  // shadow-map texel, and every caster is drawn again into each cascade it touches. Phones (1024² cascades)
  // also drop the shadows of trees beyond 90 m. The shadow pass hides the other instances just while
  // BatchedMesh builds its draw list for that pass.
  const shadowFilter = (name: keyof typeof batches, keep: (tree: number) => boolean) => {
    const mesh = batches[name].mesh;
    const ids: number[][] = insts.map((list) => list.filter((x) => x.batch === name).map((x) => x.id));
    const hidden: number[] = [];
    mesh.onBeforeShadow = function (...args: Parameters<THREE.BatchedMesh["onBeforeShadow"]>) {
      hidden.length = 0;
      for (let i = 0; i < ids.length; i++) {
        if (keep(i)) continue;
        for (const id of ids[i]) {
          if (!mesh.getVisibleAt(id)) continue;
          mesh.setVisibleAt(id, false);
          hidden.push(id);
        }
      }
      THREE.BatchedMesh.prototype.onBeforeShadow.apply(this, args);
      for (const id of hidden) mesh.setVisibleAt(id, true);
    };
  };
  shadowFilter("twigs", (i) => current[i] === 0);
  if (tier === "low") for (const name of ["wood", "birch", "needles"] as const) shadowFilter(name, (i) => distance[i] < 90);

  let elapsed = 0;
  return {
    root,
    tick(dt, camera) {
      elapsed += dt;
      wind.uTrTime.value = elapsed;
      if (camera.position.distanceToSquared(lastCam) > 9) {
        lastCam.copy(camera.position);
        return updateLod(camera.position);
      }
      return false;
    },
    setReducedMotion(on) {
      wind.uTrWind.value = on || tier === "low" ? 0 : 1;
    },
    stats() {
      let vertices = 0;
      for (const v of variants.values()) for (const l of lods) vertices += v.lod[l].wood.count + v.lod[l].twigs.count + v.lod[l].leaves.count;
      return { trees: placements.length, variants: variants.size, vertices };
    },
    dispose() {
      for (const o of owned) o.dispose();
    },
  };
}
