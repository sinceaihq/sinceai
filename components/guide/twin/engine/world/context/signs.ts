import * as THREE from "three";
import type { V2 } from "../../types";
import { sansFont } from "../../util";

/**
 * Building-name lettering of the context ring, drawn into one canvas atlas
 * (one draw call): the vertical ELECTROCITY letters at the Tykistökatu end,
 * DATACITY on its roof frame, the station name boards. Turku Science Park
 * building names and the station name only — no tenant logos or trademarks
 * (SPEC §1.5, §3.1.6). Lit after dusk.
 */

export interface SignWord {
  key: string;
  text: string;
  /** Glyph colour (sRGB) and optional board colour behind it. */
  color: string;
  board?: string;
  /** Glyph and board colours when lit (emissive map; default = color, board unlit). */
  lit?: string;
  litBoard?: string;
  vertical?: boolean;
  weight?: number;
}

export interface SignAtlas {
  texture: THREE.CanvasTexture;
  /** Lit colours (quarter resolution: the letter shapes come from `texture`'s alpha). */
  emissive: THREE.CanvasTexture;
  /** UV rect [u0, v0, u1, v1] and aspect (width / height in world units) per word. */
  rects: Map<string, { uv: [number, number, number, number]; aspect: number }>;
}

/** Emissive atlas scale relative to the colour atlas. */
const EMISSIVE_SCALE = 0.25;

/** Draw every word into one atlas (rows; vertical words in a column on the right). */
export function makeSignAtlas(words: readonly SignWord[]): SignAtlas | null {
  if (typeof document === "undefined") return null;
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, W, H);
  // Lit colours: the same layout at a quarter of the resolution (black = unlit).
  const glow = document.createElement("canvas");
  glow.width = Math.round(W * EMISSIVE_SCALE);
  glow.height = Math.round(H * EMISSIVE_SCALE);
  const gctx = glow.getContext("2d");
  if (!gctx) return null;
  gctx.fillStyle = "#000";
  gctx.fillRect(0, 0, glow.width, glow.height);
  gctx.scale(EMISSIVE_SCALE, EMISSIVE_SCALE);
  const font = sansFont();
  const rects = new Map<string, { uv: [number, number, number, number]; aspect: number }>();
  const rowH = 150;
  let y = 8;
  let colX = W - 8;
  for (const w of words) {
    const px = w.vertical ? 76 : 110;
    for (const c of [ctx, gctx]) c.font = `${w.weight ?? 700} ${px}px ${font}`;
    // Both canvases get the same drawing: the colour atlas in the sign colours, the glow atlas lit.
    const passes: [CanvasRenderingContext2D, string, string | undefined][] = [
      [ctx, w.color, w.board],
      [gctx, w.lit ?? w.color, w.litBoard],
    ];
    if (w.vertical) {
      // A column of letters, top to bottom.
      const chars = [...w.text];
      const cw = Math.ceil(Math.max(...chars.map((c) => ctx.measureText(c).width)) + 24);
      const ch = Math.ceil(chars.length * px * 1.02 + 24);
      const x0 = colX - cw;
      for (const [c, glyph, board] of passes) {
        if (board) {
          c.fillStyle = board;
          c.fillRect(x0, 8, cw, ch);
        }
        c.fillStyle = glyph;
        c.textAlign = "center";
        c.textBaseline = "middle";
        chars.forEach((l, i) => c.fillText(l, x0 + cw / 2, 8 + 12 + px * 0.55 + i * px * 1.02));
      }
      rects.set(w.key, { uv: [x0 / W, 1 - (8 + ch) / H, (x0 + cw) / W, 1 - 8 / H], aspect: cw / ch });
      colX = x0 - 16;
      continue;
    }
    const tw = Math.ceil(ctx.measureText(w.text).width + 40);
    const x0 = 8;
    for (const [c, glyph, board] of passes) {
      if (board) {
        c.fillStyle = board;
        c.fillRect(x0, y, tw, rowH - 10);
      }
      c.fillStyle = glyph;
      c.textAlign = "left";
      c.textBaseline = "middle";
      c.fillText(w.text, x0 + 20, y + (rowH - 10) / 2 + 4);
    }
    rects.set(w.key, { uv: [x0 / W, 1 - (y + rowH - 10) / H, (x0 + tw) / W, 1 - y / H], aspect: tw / (rowH - 10) });
    y += rowH;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  const emissive = new THREE.CanvasTexture(glow);
  emissive.colorSpace = THREE.SRGBColorSpace;
  emissive.needsUpdate = true;
  return { texture, emissive, rects };
}

/** Geometry accumulator for sign quads (position, normal, uv). */
export class SignBuilder {
  positions: number[] = [];
  normals: number[] = [];
  uvs: number[] = [];
  indices: number[] = [];

  /**
   * A word as a vertical quad centred at (x, y, z), facing compass bearing `facing`,
   * `height` m tall (width from the word's aspect).
   */
  word(atlas: SignAtlas, key: string, x: number, y: number, z: number, facing: number, height: number) {
    const r = atlas.rects.get(key);
    if (!r) return;
    const b = (facing * Math.PI) / 180;
    const n: V2 = [Math.sin(b), -Math.cos(b)];
    // Left → right seen from the front: t = (n.z, −n.x) … i.e. (−cos b, −sin b).
    const t: V2 = [n[1], -n[0]];
    const w = height * r.aspect;
    const base = this.positions.length / 3;
    const corners: [number, number, number, number][] = [
      [-w / 2, -height / 2, r.uv[0], r.uv[1]],
      [w / 2, -height / 2, r.uv[2], r.uv[1]],
      [w / 2, height / 2, r.uv[2], r.uv[3]],
      [-w / 2, height / 2, r.uv[0], r.uv[3]],
    ];
    for (const [u, v, s, tt] of corners) {
      this.positions.push(x + t[0] * u, y + v, z + t[1] * u);
      this.normals.push(n[0], 0, n[1]);
      this.uvs.push(s, tt);
    }
    this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  build(): THREE.BufferGeometry | null {
    if (!this.indices.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setIndex(this.indices);
    g.computeBoundingSphere();
    return g;
  }
}
