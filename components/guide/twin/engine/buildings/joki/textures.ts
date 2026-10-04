import * as THREE from "three";
import { canvasFont, canvasTexture, drawContained, fontReady, makeCanvas, wordmark, EVENT_VIOLET } from "../../render/canvas";
import { loadImage, mulberry32 } from "../../util";

/**
 * Canvas textures for Joki (deterministic — mulberry32 seeds): bolted
 * aluminium cladding, patchwork carpet tiles, acoustic and wood-wool
 * ceilings, board-formed concrete, black timber slats, stand roll-ups, the
 * Cave projection, the Futurescapes map wall and baked light pools.
 *
 * Tiling textures cover `metres` and are returned with repeat = 1/metres so
 * they line up with the kit's metre UVs.
 */

export interface Tiled {
  texture: THREE.CanvasTexture;
  /** Metres covered by one repeat of the texture. */
  metres: [number, number];
}

function tiled(canvas: HTMLCanvasElement, metres: [number, number], srgb = true, anisotropy = 8): Tiled {
  const texture = canvasTexture(canvas, { repeat: true, srgb, anisotropy });
  texture.repeat.set(1 / metres[0], 1 / metres[1]);
  return { texture, metres };
}

const hex = (c: THREE.Color) => `#${c.getHexString()}`;

/** Lighten/darken an sRGB hex by a factor (multiplicative in sRGB, good enough for tone jitter). */
function shade(color: string, k: number): string {
  const c = new THREE.Color(color);
  c.convertLinearToSRGB();
  c.r = Math.min(1, c.r * k);
  c.g = Math.min(1, c.g * k);
  c.b = Math.min(1, c.b * k);
  c.convertSRGBToLinear();
  return hex(c);
}

/** Fine value noise speckle over the whole canvas (fibres, aggregate). */
function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, count: number, alpha: number, size: number) {
  for (let i = 0; i < count; i++) {
    const v = rnd() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * (0.4 + rnd() * 0.6)})`;
    const s = size * (0.5 + rnd());
    ctx.fillRect(rnd() * w, rnd() * h, s, s);
  }
}

/**
 * Bolted aluminium panel cladding (canopy, stair parapets, roof fascia):
 * panels pw × ph metres with 8 mm joints and stainless bolts along the edges.
 */
export function boltedPanels(opts: { base?: string; pw?: number; ph?: number; px?: number; seed?: number } = {}): Tiled {
  const base = opts.base ?? "#c3c6c8";
  const pw = opts.pw ?? 1.25;
  const ph = opts.ph ?? 1.0;
  const cols = 2;
  const rows = 2;
  const W = cols * pw;
  const H = rows * ph;
  const ppm = opts.px ?? 200;
  const { canvas, ctx } = makeCanvas(Math.round(W * ppm), Math.round(H * ppm));
  const rnd = mulberry32(opts.seed ?? 41);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * pw * ppm;
      const y = r * ph * ppm;
      const k = 0.96 + rnd() * 0.07;
      const g = ctx.createLinearGradient(x, y, x + pw * ppm, y + ph * ppm);
      g.addColorStop(0, shade(base, k * 1.02));
      g.addColorStop(1, shade(base, k * 0.97));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, pw * ppm, ph * ppm);
      // Brushed grain.
      ctx.globalAlpha = 0.05;
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = rnd() < 0.5 ? "#ffffff" : "#000000";
        ctx.fillRect(x, y + rnd() * ph * ppm, pw * ppm, 1);
      }
      ctx.globalAlpha = 1;
      // Bolts: corners + along the long edges every ~0.4 m.
      const bolt = (bx: number, by: number) => {
        ctx.fillStyle = "rgba(60,62,64,0.85)";
        ctx.beginPath();
        ctx.arc(bx, by, ppm * 0.009, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.arc(bx - ppm * 0.003, by - ppm * 0.003, ppm * 0.004, 0, Math.PI * 2);
        ctx.fill();
      };
      const inset = ppm * 0.04;
      const nx = Math.max(2, Math.round(pw / 0.4));
      const ny = Math.max(2, Math.round(ph / 0.4));
      for (let i = 0; i <= nx; i++) {
        bolt(x + inset + ((pw * ppm - 2 * inset) * i) / nx, y + inset);
        bolt(x + inset + ((pw * ppm - 2 * inset) * i) / nx, y + ph * ppm - inset);
      }
      for (let i = 1; i < ny; i++) {
        bolt(x + inset, y + inset + ((ph * ppm - 2 * inset) * i) / ny);
        bolt(x + pw * ppm - inset, y + inset + ((ph * ppm - 2 * inset) * i) / ny);
      }
    }
  }
  // Joints.
  ctx.fillStyle = "rgba(40,42,44,0.9)";
  const jw = Math.max(1, ppm * 0.008);
  for (let c = 0; c <= cols; c++) ctx.fillRect(c * pw * ppm - jw / 2, 0, jw, canvas.height);
  for (let r = 0; r <= rows; r++) ctx.fillRect(0, r * ph * ppm - jw / 2, canvas.width, jw);
  return tiled(canvas, [W, H]);
}

/**
 * Carpet tiles (0.5 m) in a "patchwork" of tones with fibre speckle and a
 * few tiles laid quarter-turned — the Showroom (charcoal) and the tower (grey).
 */
export function patchworkCarpet(tones: string[], opts: { tile?: number; tiles?: number; px?: number; seed?: number } = {}): Tiled {
  const tile = opts.tile ?? 0.5;
  const n = opts.tiles ?? 8;
  const size = opts.px ?? 1024;
  const { canvas, ctx } = makeCanvas(size, size);
  const rnd = mulberry32(opts.seed ?? 7);
  const t = size / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const r = rnd();
      // Mostly the base tone, patches of the others.
      const tone = r < 0.55 ? tones[0] : tones[1 + Math.floor(rnd() * (tones.length - 1))];
      ctx.fillStyle = tone;
      ctx.fillRect(i * t, j * t, t, t);
      // Directional tufting (alternating quarter turns).
      ctx.save();
      ctx.globalAlpha = 0.07;
      const vertical = (i + j) % 2 === 0;
      for (let k = 0; k < 26; k++) {
        ctx.fillStyle = rnd() < 0.5 ? "#000" : "#fff";
        const o = rnd() * t;
        if (vertical) ctx.fillRect(i * t + o, j * t, Math.max(1, t / 90), t);
        else ctx.fillRect(i * t, j * t + o, t, Math.max(1, t / 90));
      }
      ctx.restore();
    }
  }
  speckle(ctx, size, size, rnd, size * size * 0.06, 0.12, size / 900);
  // Barely visible seams.
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(i * t - 0.5, 0, 1, size);
    ctx.fillRect(0, i * t - 0.5, size, 1);
  }
  return tiled(canvas, [tile * n, tile * n], true, 8);
}

/** White mineral acoustic tiles (600 mm grid) with a fine fissured speckle. */
export function acousticCeiling(opts: { base?: string; grid?: number; px?: number; seed?: number } = {}): Tiled {
  const grid = opts.grid ?? 0.6;
  const n = 4;
  const size = opts.px ?? 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const rnd = mulberry32(opts.seed ?? 3);
  ctx.fillStyle = opts.base ?? "#e6e4df";
  ctx.fillRect(0, 0, size, size);
  speckle(ctx, size, size, rnd, size * size * 0.08, 0.07, size / 400);
  const t = size / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      ctx.fillStyle = `rgba(0,0,0,${0.012 + rnd() * 0.02})`;
      ctx.fillRect(i * t, j * t, t, t);
    }
  ctx.fillStyle = "rgba(120,118,112,0.55)";
  for (let i = 0; i <= n; i++) {
    ctx.fillRect(i * t - 1, 0, 2, size);
    ctx.fillRect(0, i * t - 1, size, 2);
  }
  return tiled(canvas, [grid * n, grid * n]);
}

/** Light-grey wood-wool acoustic panels (floors 2–3): fibre texture, 1.2 × 0.6 m panels. */
export function woodWool(opts: { base?: string; px?: number; seed?: number } = {}): Tiled {
  const size = opts.px ?? 1024;
  const { canvas, ctx } = makeCanvas(size, size);
  const rnd = mulberry32(opts.seed ?? 19);
  const base = opts.base ?? "#d0d2d2";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // Fibres: short random strokes in light and dark.
  ctx.lineCap = "round";
  for (let i = 0; i < size * 7; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const a = rnd() * Math.PI;
    const l = size * (0.006 + rnd() * 0.012);
    ctx.strokeStyle = rnd() < 0.5 ? `rgba(255,255,255,${0.12 + rnd() * 0.2})` : `rgba(40,40,40,${0.06 + rnd() * 0.12})`;
    ctx.lineWidth = size / 900;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  // 2.4 × 2.4 m canvas: panels 1.2 × 0.6.
  ctx.fillStyle = "rgba(60,60,60,0.5)";
  for (let i = 0; i <= 2; i++) ctx.fillRect((i * size) / 2 - 1, 0, 2, size);
  for (let j = 0; j <= 4; j++) ctx.fillRect(0, (j * size) / 4 - 1, size, 2);
  return tiled(canvas, [2.4, 2.4]);
}

/**
 * Board-formed concrete (plywood formwork): 1.2 × 2.4 m panels with swirling
 * grain, joint lines, tie holes and mottling — the drum and the Aula piers.
 */
export function boardFormed(opts: { base?: string; px?: number; seed?: number } = {}): Tiled {
  const W = 2.4;
  const H = 2.4;
  const size = opts.px ?? 1024;
  const ppm = size / W;
  const { canvas, ctx } = makeCanvas(size, size);
  const rnd = mulberry32(opts.seed ?? 23);
  const base = opts.base ?? "#8f8a82";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  // Panel tone jitter + plywood grain swirls.
  for (let c = 0; c < 2; c++) {
    for (let r = 0; r < 1; r++) {
      const x0 = c * 1.2 * ppm;
      const y0 = r * 2.4 * ppm;
      ctx.fillStyle = `rgba(${rnd() < 0.5 ? "255,255,255" : "0,0,0"},${0.03 + rnd() * 0.05})`;
      ctx.fillRect(x0, y0, 1.2 * ppm, 2.4 * ppm);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, 1.2 * ppm, 2.4 * ppm);
      ctx.clip();
      // Plywood grain printed by the formwork: clusters of nested, elongated rings, very faint.
      for (let k = 0; k < 22; k++) {
        const cx = x0 + rnd() * 1.2 * ppm;
        const cy = y0 + rnd() * 2.4 * ppm;
        const rx0 = ppm * (0.08 + rnd() * 0.3);
        const squash = 0.18 + rnd() * 0.25;
        const rot = (rnd() - 0.5) * 0.25;
        const rings = 3 + Math.floor(rnd() * 5);
        const light = rnd() < 0.45;
        for (let r = 0; r < rings; r++) {
          const rx = rx0 * (1 - r / (rings + 1));
          ctx.strokeStyle = `rgba(${light ? "235,230,220" : "40,36,30"},${0.018 + rnd() * 0.022})`;
          ctx.lineWidth = ppm * (0.006 + rnd() * 0.01);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, rx * squash, rot, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  // Mottling / damp patches.
  for (let k = 0; k < 40; k++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = size * (0.03 + rnd() * 0.1);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() < 0.6;
    g.addColorStop(0, dark ? "rgba(40,36,30,0.10)" : "rgba(255,255,255,0.08)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  speckle(ctx, size, size, rnd, size * size * 0.03, 0.1, size / 600);
  // Formwork joints and the step lines between pours.
  ctx.fillStyle = "rgba(35,32,28,0.35)";
  ctx.fillRect(1.2 * ppm - 1, 0, 2, size);
  ctx.fillRect(0, 0, 2, size);
  ctx.fillStyle = "rgba(35,32,28,0.25)";
  ctx.fillRect(0, 1.2 * ppm, size, 1);
  // Tie holes: grid 0.6 m, light cones with a dark plug.
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      const x = (0.3 + i * 0.6) * ppm;
      const y = (0.3 + j * 0.6) * ppm;
      ctx.fillStyle = "rgba(225,220,212,0.55)";
      ctx.beginPath();
      ctx.arc(x, y, ppm * 0.022, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(70,66,60,0.6)";
      ctx.beginPath();
      ctx.arc(x, y, ppm * 0.008, 0, Math.PI * 2);
      ctx.fill();
    }
  return tiled(canvas, [W, H]);
}

/** Black stained vertical timber slats (cloakroom / locker volumes in the Aula). */
export function blackSlats(opts: { px?: number; seed?: number } = {}): Tiled {
  const size = opts.px ?? 512;
  const { canvas, ctx } = makeCanvas(size, size);
  const rnd = mulberry32(opts.seed ?? 31);
  ctx.fillStyle = "#1a1c1f";
  ctx.fillRect(0, 0, size, size);
  const slats = 16;
  const w = size / slats;
  for (let i = 0; i < slats; i++) {
    ctx.fillStyle = shade("#1d1f22", 0.9 + rnd() * 0.25);
    ctx.fillRect(i * w, 0, w * 0.82, size);
    ctx.globalAlpha = 0.06;
    for (let k = 0; k < 20; k++) {
      ctx.fillStyle = rnd() < 0.5 ? "#fff" : "#000";
      ctx.fillRect(i * w + rnd() * w * 0.8, 0, 1, size);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#08090a";
    ctx.fillRect(i * w + w * 0.82, 0, w * 0.18, size);
  }
  return tiled(canvas, [0.9, 0.9]);
}

/** Galvanised checker-plate (stair treads, landings). */
export function checkerPlate(opts: { px?: number } = {}): Tiled {
  const size = opts.px ?? 256;
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.fillStyle = "#9da1a3";
  ctx.fillRect(0, 0, size, size);
  const n = 8;
  const s = size / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const cx = i * s + s / 2;
      const cy = j * s + s / 2;
      const a = (i + j) % 2 ? Math.PI / 4 : -Math.PI / 4;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(-s * 0.32, -s * 0.07, s * 0.64, s * 0.1);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(-s * 0.32, s * 0.03, s * 0.64, s * 0.05);
      ctx.restore();
    }
  return tiled(canvas, [0.25, 0.25]);
}

/**
 * Stand roll-ups (0.85 × 2.0 m) for every tower stand in one atlas (3 columns):
 * Since AI event navy with violet line work, the company logo on a white card
 * near the top and a Q&A caption. `rect(i)` = the UV rectangle of item i.
 */
export function rollupAtlas(items: { src?: string; name: string }[], opts: { px?: number } = {}): {
  texture: THREE.CanvasTexture;
  ready: Promise<void>;
  rect(i: number): { u0: number; v0: number; u1: number; v1: number };
} {
  const cw = opts.px ?? 384;
  const ch = Math.round((cw * 2.0) / 0.85);
  const cols = 3;
  const rows = Math.ceil(items.length / cols);
  const { canvas, ctx } = makeCanvas(cw * cols, ch * rows);
  const cards: { x: number; y: number; w: number; h: number }[] = [];
  items.forEach((_, i) => {
    const x0 = (i % cols) * cw;
    const y0 = Math.floor(i / cols) * ch;
    const bg = ctx.createLinearGradient(0, y0, 0, y0 + ch);
    bg.addColorStop(0, "#14112c");
    bg.addColorStop(0.6, "#0b0a18");
    bg.addColorStop(1, "#1a1240");
    ctx.fillStyle = bg;
    ctx.fillRect(x0, y0, cw, ch);
    const rnd = mulberry32(31 + i * 17);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, cw, ch);
    ctx.clip();
    ctx.lineCap = "round";
    for (let k = 0; k < 6; k++) {
      const col = ["#7a5cff", "#9a6bff", "#5f72ff", "#b08cff"][k % 4];
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = cw / 40;
      ctx.globalAlpha = 0.35 + rnd() * 0.35;
      ctx.lineWidth = cw / 160;
      ctx.beginPath();
      let x = x0 + rnd() * cw;
      let y = y0 + ch * (0.5 + rnd() * 0.45);
      ctx.moveTo(x, y);
      for (let s2 = 0; s2 < 3; s2++) {
        x += (rnd() - 0.5) * cw * 0.9;
        y += (rnd() - 0.3) * ch * 0.12;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
    // The repo's 3D logos are white: they sit on the dark print, a violet rule under them.
    const card = { x: x0 + cw * 0.08, y: y0 + ch * 0.08, w: cw * 0.84, h: ch * 0.2 };
    cards.push(card);
    ctx.fillStyle = EVENT_VIOLET;
    ctx.fillRect(x0 + cw * 0.2, y0 + ch * 0.31, cw * 0.6, ch * 0.006);
    ctx.fillRect(x0, y0 + ch * 0.975, cw, ch * 0.025);
  });
  const texture = canvasTexture(canvas, { anisotropy: 8 });
  const ready = (async () => {
    // Lettering waits for the web fonts: canvas text keeps the face it was drawn in.
    const [imgs] = await Promise.all([Promise.all(items.map((it) => (it.src ? loadImage(it.src) : Promise.resolve(null)))), fontReady("mono"), fontReady("sans")]);
    items.forEach((it, i) => {
      const x0 = (i % cols) * cw;
      const y0 = Math.floor(i / cols) * ch;
      wordmark(ctx, "Q&A", x0 + cw / 2, y0 + ch * 0.4, cw * 0.11, "#ffffff");
      wordmark(ctx, "Since AI Hackathon 2026", x0 + cw / 2, y0 + ch * 0.45, cw * 0.04, "rgba(207,199,255,0.9)");
      const c = cards[i];
      const img = imgs[i];
      if (img) drawContained(ctx, img, c.x + c.w / 2, c.y + c.h / 2, c.w * 0.82, c.h * 0.7);
      else {
        ctx.save();
        ctx.fillStyle = "#ffffff";
        const size = Math.min(c.h * 0.34, (c.w * 0.86) / Math.max(4, it.name.length * 0.58));
        ctx.font = canvasFont(size, "sans");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(it.name, c.x + c.w / 2, c.y + c.h / 2);
        ctx.restore();
      }
    });
    texture.needsUpdate = true;
  })();
  return {
    texture,
    ready,
    // CanvasTexture uploads with flipY: canvas row 0 is v = 1.
    rect(i) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      return { u0: c / cols, u1: (c + 1) / cols, v1: 1 - r / rows, v0: 1 - (r + 1) / rows };
    },
  };
}

/** The Cave's triple projection: event title across three panels. */
export function caveProjection(opts: { px?: number } = {}): { texture: THREE.CanvasTexture; ready: Promise<void> } {
  const w = opts.px ?? 2048;
  const h = Math.round(w / 5);
  const { canvas, ctx } = makeCanvas(w, h);
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "#110e2a");
  g.addColorStop(0.5, "#1c1450");
  g.addColorStop(1, "#110e2a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rnd = mulberry32(77);
  ctx.save();
  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = ["#7a5cff", "#9a6bff", "#5f72ff", "#b08cff"][i % 4];
    ctx.globalAlpha = 0.25 + rnd() * 0.4;
    ctx.lineWidth = h / 260;
    ctx.beginPath();
    ctx.moveTo(rnd() * w, rnd() * h);
    ctx.lineTo(rnd() * w, rnd() * h);
    ctx.stroke();
  }
  ctx.restore();
  // Panel seams between the three projectors.
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(w / 3 - 1, 0, 2, h);
  ctx.fillRect((2 * w) / 3 - 1, 0, 2, h);
  const texture = canvasTexture(canvas, { anisotropy: 8 });
  const ready = (async () => {
    const [logo] = await Promise.all([loadImage("/assets/guide/3d/logos/since-ai.png"), fontReady("mono")]);
    wordmark(ctx, "SINCE AI HACKATHON 2026", w / 2, h * 0.52, h * 0.12, "#ffffff");
    wordmark(ctx, "BUILD AREA · CAVE · OPEN AROUND THE CLOCK", w / 2, h * 0.68, h * 0.045, "rgba(207,199,255,0.85)");
    if (logo) drawContained(ctx, logo, w / 2, h * 0.28, w * 0.12, h * 0.2);
    texture.needsUpdate = true;
  })();
  return { texture, ready };
}

/**
 * Futurescapes-style map wall (abstract archipelago, our own drawing): dark
 * sea, mottled land, light road lines and a few glowing points.
 */
export function mapWall(opts: { px?: number; seed?: number } = {}): { texture: THREE.CanvasTexture; ready: Promise<void> } {
  const w = opts.px ?? 1024;
  const h = Math.round(w / 1.9);
  const { canvas, ctx } = makeCanvas(w, h);
  const rnd = mulberry32(opts.seed ?? 101);
  ctx.fillStyle = "#121a22";
  ctx.fillRect(0, 0, w, h);
  // Land blobs (mainland to the upper right, islands to the lower left).
  for (let i = 0; i < 260; i++) {
    const mainland = i < 120;
    const x = mainland ? w * (0.35 + rnd() * 0.65) : rnd() * w * 0.7;
    const y = mainland ? h * (rnd() * 0.75) : h * (0.35 + rnd() * 0.65);
    const r = (mainland ? 0.05 : 0.012) * w * (0.4 + rnd());
    ctx.fillStyle = `rgba(${48 + rnd() * 30},${58 + rnd() * 30},${46 + rnd() * 20},0.85)`;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.5 + rnd() * 0.6), rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  speckle(ctx, w, h, rnd, w * h * 0.04, 0.12, w / 700);
  ctx.strokeStyle = "rgba(230,225,200,0.35)";
  ctx.lineWidth = w / 900;
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    let x = w * (0.4 + rnd() * 0.6);
    let y = rnd() * h * 0.7;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (rnd() - 0.5) * w * 0.12;
      y += (rnd() - 0.5) * h * 0.12;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const x = w * (0.4 + rnd() * 0.5);
    const y = h * (0.15 + rnd() * 0.6);
    const g = ctx.createRadialGradient(x, y, 0, x, y, w * 0.012);
    g.addColorStop(0, "rgba(255,120,150,0.95)");
    g.addColorStop(1, "rgba(255,120,150,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - w * 0.012, y - w * 0.012, w * 0.024, w * 0.024);
  }
  const texture = canvasTexture(canvas, { anisotropy: 8 });
  const ready = fontReady("mono", 600).then(() => {
    ctx.font = canvasFont(h * 0.035, "mono", 600);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("TURKU FUTURESCAPES", w * 0.04, h * 0.08);
    texture.needsUpdate = true;
  });
  return { texture, ready };
}

/** A screen showing calm UI content (digital tables, wall displays). */
export function screenContent(opts: { seed?: number; px?: number; hue?: "blue" | "violet" } = {}): THREE.CanvasTexture {
  const w = opts.px ?? 256;
  const h = Math.round(w * 0.6);
  const { canvas, ctx } = makeCanvas(w, h);
  const rnd = mulberry32(opts.seed ?? 9);
  const g = ctx.createLinearGradient(0, 0, w, h);
  if (opts.hue === "violet") {
    g.addColorStop(0, "#1b1240");
    g.addColorStop(1, "#3a2a8a");
  } else {
    g.addColorStop(0, "#0f2a4a");
    g.addColorStop(1, "#2a6aa8");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) {
    const r = h * (0.05 + rnd() * 0.12);
    ctx.fillStyle = `rgba(255,255,255,${0.12 + rnd() * 0.25})`;
    ctx.beginPath();
    ctx.arc(rnd() * w, rnd() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillRect(w * 0.06, h * 0.08, w * 0.3, h * 0.05);
  return canvasTexture(canvas, { anisotropy: 4 });
}

// ── Baked light ──────────────────────────────────────────────────────────────

export interface Pool {
  x: number;
  z: number;
  /** Radius of the pool (m). */
  r: number;
  /** Peak illuminance added (klux). */
  e: number;
  /** Colour (sRGB hex). */
  color?: string;
  /** Ellipse stretch along x (1 = round). */
  sx?: number;
}

export interface LightmapSpec {
  /** Plan rectangle covered by the map. */
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Ambient floor illuminance everywhere (klux). */
  base: number;
  /** Full-scale illuminance of a white texel (klux) — lightMapIntensity. */
  scale: number;
  pools: Pool[];
  /** Darkening blobs (furniture contact shadows): x, z, radius, strength 0…1. */
  shadows?: { x: number; z: number; r: number; k: number; sx?: number; angle?: number }[];
  px?: number;
}

/**
 * Baked floor irradiance (three.js lightMap, uv1 = plan position in the
 * rectangle): an ambient level plus soft pools from downlights and spots and
 * contact shadows under furniture. Values are linear klux / `scale`, stored
 * sRGB-encoded for precision in the darks.
 */
export function bakeLightmap(spec: LightmapSpec): THREE.CanvasTexture {
  const px = spec.px ?? 512;
  const wM = spec.maxX - spec.minX;
  const hM = spec.maxZ - spec.minZ;
  const W = Math.max(8, Math.round(px * Math.min(1, wM / hM)));
  const H = Math.max(8, Math.round(px * Math.min(1, hM / wM)));
  const { canvas, ctx } = makeCanvas(W, H);
  const img = ctx.createImageData(W, H);
  const acc = new Float32Array(W * H * 3);
  const toPx = (x: number, z: number) => [((x - spec.minX) / wM) * W, ((z - spec.minZ) / hM) * H];
  for (let i = 0; i < W * H; i++) {
    acc[i * 3] = acc[i * 3 + 1] = acc[i * 3 + 2] = spec.base;
  }
  const tmp = new THREE.Color();
  for (const p of spec.pools) {
    tmp.set(p.color ?? "#ffffff");
    const [cx, cy] = toPx(p.x, p.z);
    const rx = (p.r * (p.sx ?? 1) * W) / wM;
    const ry = (p.r * H) / hM;
    const x0 = Math.max(0, Math.floor(cx - rx * 1.6));
    const x1 = Math.min(W - 1, Math.ceil(cx + rx * 1.6));
    const y0 = Math.max(0, Math.floor(cy - ry * 1.6));
    const y1 = Math.min(H - 1, Math.ceil(cy + ry * 1.6));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const d2 = dx * dx + dy * dy;
        // Spot pool: bright core, soft cos-like falloff to the edge.
        const f = Math.exp(-d2 * 2.2);
        if (f < 0.002) continue;
        const i = (y * W + x) * 3;
        acc[i] += p.e * f * tmp.r;
        acc[i + 1] += p.e * f * tmp.g;
        acc[i + 2] += p.e * f * tmp.b;
      }
  }
  for (const s of spec.shadows ?? []) {
    const [cx, cy] = toPx(s.x, s.z);
    const rx = (s.r * (s.sx ?? 1) * W) / wM;
    const ry = (s.r * H) / hM;
    const ca = Math.cos(s.angle ?? 0);
    const sa = Math.sin(s.angle ?? 0);
    const reach = Math.max(rx, ry) * 1.6;
    for (let y = Math.max(0, Math.floor(cy - reach)); y <= Math.min(H - 1, Math.ceil(cy + reach)); y++)
      for (let x = Math.max(0, Math.floor(cx - reach)); x <= Math.min(W - 1, Math.ceil(cx + reach)); x++) {
        const ox = x + 0.5 - cx;
        const oy = y + 0.5 - cy;
        const lx = (ox * ca + oy * sa) / rx;
        const ly = (-ox * sa + oy * ca) / ry;
        const f = Math.exp(-(lx * lx + ly * ly) * 1.8) * s.k;
        if (f < 0.002) continue;
        const i = (y * W + x) * 3;
        acc[i] *= 1 - f;
        acc[i + 1] *= 1 - f;
        acc[i + 2] *= 1 - f;
      }
  }
  const enc = (v: number) => {
    const l = Math.max(0, Math.min(1, v / spec.scale));
    const s = l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
    return Math.round(s * 255);
  };
  for (let i = 0; i < W * H; i++) {
    img.data[i * 4] = enc(acc[i * 3]);
    img.data[i * 4 + 1] = enc(acc[i * 3 + 1]);
    img.data[i * 4 + 2] = enc(acc[i * 3 + 2]);
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = canvasTexture(canvas, { srgb: true, anisotropy: 4 });
  tex.channel = 1;
  // Canvas rows run along +z (south); uv1 v grows with z, so no flip.
  tex.flipY = false;
  return tex;
}

/** uv1 = position in a plan rectangle (0…1), for bakeLightmap textures. */
export function planUV1(g: THREE.BufferGeometry, spec: Pick<LightmapSpec, "minX" | "maxX" | "minZ" | "maxZ">): THREE.BufferGeometry {
  const pos = g.getAttribute("position");
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) - spec.minX) / (spec.maxX - spec.minX);
    uv[i * 2 + 1] = (pos.getZ(i) - spec.minZ) / (spec.maxZ - spec.minZ);
  }
  g.setAttribute("uv1", new THREE.BufferAttribute(uv, 2));
  return g;
}
