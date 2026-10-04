import * as THREE from "three";
import { loadImage, monoFont, mulberry32, sansFont } from "../util";

/**
 * Canvas-drawn textures: the Showroom LED wall, stand/partner signs, event
 * banners, lettering, light pools and the procedural gravel set. Everything
 * is deterministic (mulberry32 seeds) so posters render identically.
 */

export interface ReadyTexture {
  texture: THREE.CanvasTexture;
  /** Resolves when async content (logos) has been drawn. */
  ready: Promise<void>;
}

/** Since AI event violet (DESIGN §1) — event dressing only. */
export const EVENT_VIOLET = "#8b7bff";
export const EVENT_VIOLET_STRONG = "#6d4dff";

const NEON = ["#7a5cff", "#9a6bff", "#5f72ff", "#b08cff", "#6b4dff"];

export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { canvas, ctx };
}

export function canvasTexture(
  canvas: HTMLCanvasElement,
  opts: { repeat?: boolean; srgb?: boolean; anisotropy?: number; mipmaps?: boolean } = {},
): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = opts.anisotropy ?? 8;
  if (opts.mipmaps === false) {
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
  }
  t.needsUpdate = true;
  return t;
}

/** Draw an image centred in a box, preserving its aspect ratio. */
export function drawContained(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width: number; height: number },
  cx: number,
  cy: number,
  maxW: number,
  maxH: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = Math.min(maxW / iw, maxH / ih);
  ctx.drawImage(img, cx - (iw * s) / 2, cy - (ih * s) / 2, iw * s, ih * s);
}

/** CSS font string for canvas lettering in the site's mono (JetBrains Mono) or sans (Inter). */
export function canvasFont(size: number, family: "mono" | "sans" = "mono", weight = 700): string {
  return `${weight} ${size}px ${family === "mono" ? monoFont() : sansFont()}`;
}

const fontLoads = new Map<string, Promise<void>>();

/**
 * Resolves once the web font for `family`/`weight` is loaded — or after `timeoutMs`, or at once
 * where the Font Loading API is missing. Canvas text drawn before its face arrives keeps the
 * fallback font for good (a canvas never redraws by itself), so await this before lettering.
 */
export function fontReady(family: "mono" | "sans" = "mono", weight = 700, timeoutMs = 3000): Promise<void> {
  if (typeof document === "undefined" || !document.fonts || typeof document.fonts.load !== "function") return Promise.resolve();
  const font = canvasFont(32, family, weight);
  let promise = fontLoads.get(font);
  if (!promise) {
    promise = Promise.race([
      document.fonts.load(font).then(
        () => undefined,
        () => undefined,
      ),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
    fontLoads.set(font, promise);
  }
  return promise;
}

/** Uppercase mono wordmark (fallback when a logo file is missing). Await fontReady() first. */
export function wordmark(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  size: number,
  color = "#ffffff",
  family: "mono" | "sans" = "mono",
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = canvasFont(size, family);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(family === "mono" ? text.toUpperCase() : text, cx, cy);
  ctx.restore();
}

/** Glowing neon polylines in the style of the event render. */
function neonLines(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, count: number, scale = 1) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < count; i++) {
    const color = NEON[Math.floor(rnd() * NEON.length)];
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 * scale;
    ctx.globalAlpha = 0.45 + rnd() * 0.4;
    ctx.lineWidth = (1.6 + rnd() * 1.6) * scale;
    let x = rnd() * w;
    let y = rnd() < 0.5 ? h * (0.78 + rnd() * 0.22) : h * rnd() * 0.25;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segments = 1 + Math.floor(rnd() * 3);
    for (let s = 0; s < segments; s++) {
      const angle = ((rnd() < 0.5 ? -1 : 1) * (12 + rnd() * 26) * Math.PI) / 180;
      const len = (180 + rnd() * 620) * scale;
      x += Math.cos(angle) * len * (rnd() < 0.5 ? -1 : 1);
      y += Math.sin(angle) * len;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export interface LedLogo {
  /** 0–1 along the wall (left → right as seen from inside). */
  u: number;
  src?: string;
  text?: string;
}

/**
 * The Showroom LED wall (P2.5, ≈9000 × 1200 px real): dark navy panels,
 * violet neon line work, partner logos above each counter and calm Since AI
 * marks. Use as emissiveMap with LUMINANCE.ledWall.
 */
export function makeLedWallTexture({
  logos,
  marks,
  markSrc,
  width = 4096,
  aspect = 7.5,
  logoCenterV = 0.4,
  logoMaxW = 0.1,
  logoMaxH = 0.32,
  markV = 0.1,
  seed = 7,
}: {
  logos: LedLogo[];
  marks: number[];
  markSrc: string;
  width?: number;
  aspect?: number;
  logoCenterV?: number;
  logoMaxW?: number;
  logoMaxH?: number;
  markV?: number;
  seed?: number;
}): ReadyTexture {
  const w = width;
  const h = Math.round(width / aspect);
  const { canvas, ctx } = makeCanvas(w, h);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0c0d26");
  bg.addColorStop(0.55, "#080919");
  bg.addColorStop(1, "#0d0a24");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // LED module seams (0.5 m cabinets).
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth = 1;
  const tile = h / 6;
  for (let x = 0; x < w; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();

  neonLines(ctx, w, h, seed, Math.round(w / 240), w / 4096);

  const sorted = [...logos].sort((a, b) => a.u - b.u);
  ctx.save();
  ctx.strokeStyle = "#7a66ff";
  ctx.shadowColor = "#7a66ff";
  ctx.shadowBlur = 10;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  for (let i = 0; i < sorted.length - 1; i++) {
    const x = ((sorted[i].u + sorted[i + 1].u) / 2) * w;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.18);
    ctx.lineTo(x, h * 0.86);
    ctx.stroke();
  }
  ctx.restore();

  const texture = canvasTexture(canvas, { anisotropy: 16 });
  const ready = (async () => {
    const [mark, images] = await Promise.all([
      loadImage(markSrc),
      Promise.all(logos.map((l) => (l.src ? loadImage(l.src) : Promise.resolve(null)))),
      fontReady("mono"),
    ]);
    logos.forEach((logo, i) => {
      const cx = logo.u * w;
      const cy = logoCenterV * h;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.42);
      glow.addColorStop(0, "rgba(140,120,255,0.10)");
      glow.addColorStop(1, "rgba(140,120,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(cx - h * 0.45, cy - h * 0.45, h * 0.9, h * 0.9);
      const img = images[i];
      if (img) drawContained(ctx, img, cx, cy, logoMaxW * w, logoMaxH * h);
      else if (logo.text) wordmark(ctx, logo.text, cx, cy, h * 0.11);
    });
    if (mark) for (const u of marks) drawContained(ctx, mark, u * w, markV * h, w * 0.05, h * 0.085);
    texture.needsUpdate = true;
  })();
  return { texture, ready };
}

/** Stand sign / roll-up: logo (or wordmark) on a dark panel with neon accents. */
export function makeSignTexture({
  src,
  text,
  subtitle,
  width = 1024,
  aspect = 1.25,
  open = false,
  seed = 11,
}: {
  src?: string;
  text?: string;
  subtitle?: string;
  width?: number;
  aspect?: number;
  open?: boolean;
  seed?: number;
}): ReadyTexture {
  const w = width;
  const h = Math.round(width / aspect);
  const { canvas, ctx } = makeCanvas(w, h);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, open ? "#0b0b12" : "#0d0c22");
  bg.addColorStop(1, open ? "#08080c" : "#090816");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  if (!open) neonLines(ctx, w, h, seed, 7, w / 2400);
  ctx.save();
  ctx.strokeStyle = open ? "rgba(255,255,255,0.16)" : "rgba(139,123,255,0.65)";
  ctx.lineWidth = Math.max(2, w / 300);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);
  ctx.restore();
  const texture = canvasTexture(canvas);
  const ready = (async () => {
    const [img] = await Promise.all([src ? loadImage(src) : Promise.resolve(null), fontReady("mono")]);
    if (img) drawContained(ctx, img, w / 2, h * 0.45, w * 0.72, h * 0.42);
    else if (text) {
      const size = Math.min(h * 0.2, (w * 0.82) / Math.max(4, text.length * 0.62));
      wordmark(ctx, text, w / 2, h * 0.45, size, open ? "rgba(255,255,255,0.72)" : "#ffffff");
    }
    if (subtitle) wordmark(ctx, subtitle, w / 2, h * 0.82, h * 0.06, open ? "rgba(255,255,255,0.45)" : "rgba(200,190,255,0.85)");
    texture.needsUpdate = true;
  })();
  return { texture, ready };
}

/**
 * Event banner / feather flag / totem face: violet-to-deep gradient, white
 * logo or wordmark, optional arrow and small caption. Portrait or landscape.
 */
export function makeBannerTexture({
  title,
  caption,
  logoSrc = "/assets/logo/sinceai-white.png",
  width = 512,
  height = 1536,
  arrow,
  seed = 23,
}: {
  title?: string;
  caption?: string;
  logoSrc?: string;
  width?: number;
  height?: number;
  arrow?: "left" | "right" | "up" | "down";
  seed?: number;
}): ReadyTexture {
  const { canvas, ctx } = makeCanvas(width, height);
  const portrait = height >= width;
  const bg = ctx.createLinearGradient(0, 0, portrait ? 0 : width, portrait ? height : 0);
  bg.addColorStop(0, "#14102e");
  bg.addColorStop(0.55, "#0b0a18");
  bg.addColorStop(1, "#1a1240");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  neonLines(ctx, width, height, seed, 5, Math.max(width, height) / 3000);
  ctx.fillStyle = EVENT_VIOLET;
  if (portrait) ctx.fillRect(0, height - height * 0.035, width, height * 0.035);
  else ctx.fillRect(0, height - height * 0.06, width, height * 0.06);
  const texture = canvasTexture(canvas);
  const ready = (async () => {
    const [logo] = await Promise.all([logoSrc ? loadImage(logoSrc) : Promise.resolve(null), fontReady("mono")]);
    const unit = Math.min(width, height);
    const logoY = portrait ? height * 0.16 : height * 0.32;
    if (logo) drawContained(ctx, logo, width / 2, logoY, width * 0.72, unit * 0.28);
    if (title) {
      const size = Math.min(unit * 0.13, (width * 0.86) / Math.max(4, title.length * 0.62));
      wordmark(ctx, title, width / 2, portrait ? height * 0.42 : height * 0.62, size);
    }
    if (caption) wordmark(ctx, caption, width / 2, portrait ? height * 0.5 : height * 0.8, unit * 0.055, "rgba(207,199,255,0.9)");
    if (arrow) {
      ctx.save();
      ctx.translate(width / 2, portrait ? height * 0.72 : height * 0.5);
      const rot = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[arrow];
      ctx.rotate(rot);
      const s = unit * 0.16;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.28);
      ctx.lineTo(s * 0.2, -s * 0.28);
      ctx.lineTo(s * 0.2, -s * 0.7);
      ctx.lineTo(s, 0);
      ctx.lineTo(s * 0.2, s * 0.7);
      ctx.lineTo(s * 0.2, s * 0.28);
      ctx.lineTo(-s, s * 0.28);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    texture.needsUpdate = true;
  })();
  return { texture, ready };
}

/**
 * Plain lettering on a transparent (or coloured) background, e.g. building
 * names ("EduCity", "BIOCITY"). Returns the texture and the world aspect.
 * Drawn at once (fallback font if the web font is still loading) and redrawn —
 * same canvas, so the aspect stays — when the face arrives; `ready` resolves then.
 */
export function makeLetteringTexture(
  text: string,
  opts: {
    color?: string;
    background?: string;
    family?: "mono" | "sans";
    weight?: number;
    height?: number;
    vertical?: boolean;
    letterSpacing?: number;
  } = {},
): { texture: THREE.CanvasTexture; aspect: number; ready: Promise<void> } {
  const px = opts.height ?? 256;
  const familyKey = opts.family === "mono" ? "mono" : "sans";
  const weight = opts.weight ?? 600;
  const chars = [...text];
  const pad = px * 0.2;
  const measure = (ctx: CanvasRenderingContext2D, size: number) => {
    ctx.font = canvasFont(size, familyKey, weight);
    const widths = chars.map((c) => ctx.measureText(c).width);
    const spacing = (opts.letterSpacing ?? 0) * size;
    const total = widths.reduce((s2, x) => s2 + x, 0) + spacing * Math.max(0, chars.length - 1);
    return { widths, spacing, total };
  };
  const first = measure(makeCanvas(8, 8).ctx, px);
  const w = opts.vertical ? Math.ceil(Math.max(...first.widths) + pad * 2) : Math.ceil(first.total + pad * 2);
  const h = opts.vertical ? Math.ceil(chars.length * px * 1.05 + pad * 2) : Math.ceil(px * 1.3 + pad * 2);
  const { canvas, ctx } = makeCanvas(w, h);
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    if (opts.background) {
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, w, h);
    }
    // The loaded face may be wider than the fallback the canvas was sized for: shrink to fit.
    let m = measure(ctx, px);
    const room = w - pad * 2;
    const used = opts.vertical ? Math.max(...m.widths) : m.total;
    const size = used > room ? Math.max(1, Math.floor((px * room) / used)) : px;
    if (size !== px) m = measure(ctx, size);
    ctx.fillStyle = opts.color ?? "#ffffff";
    ctx.textBaseline = "middle";
    if (opts.vertical) {
      ctx.textAlign = "center";
      chars.forEach((c, i) => ctx.fillText(c, w / 2, pad + px * 0.55 + i * px * 1.05));
    } else {
      ctx.textAlign = "left";
      let x = pad + (room - m.total) / 2;
      chars.forEach((c, i) => {
        ctx.fillText(c, x, h / 2);
        x += m.widths[i] + m.spacing;
      });
    }
  };
  draw();
  const texture = canvasTexture(canvas, { anisotropy: 8 });
  const font = canvasFont(px, familyKey, weight);
  let loaded = true;
  try {
    loaded = typeof document === "undefined" || !document.fonts || document.fonts.check(font);
  } catch {
    // An unparsable family list: draw with whatever the canvas resolved.
  }
  const ready = loaded
    ? Promise.resolve()
    : fontReady(familyKey, weight).then(() => {
        draw();
        texture.needsUpdate = true;
      });
  return { texture, aspect: w / h, ready };
}

/** Radial gradient for fake light pools / contact shadows (used with alpha). */
export function makeRadialTexture(inner: string, outer: string, size = 256): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvasTexture(canvas);
}

/** Vertical fade (e.g. violet glow spilling from the LED wall onto the floor). */
export function makeFadeTexture(color: string): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(4, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color.replace(/[\d.]+\)$/, "0.35)"));
  g.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  return canvasTexture(canvas);
}

/**
 * Seamless gravel (crushed granite 8–25 mm) as colour, normal and roughness
 * canvases covering `metres` × `metres`, meant for textures with
 * flipY = false. Pebbles are drawn with wrap-around so the tile repeats
 * without seams; the normal map comes from the height field.
 */
export function makeGravelCanvases(size = 512, metres = 1, seed = 97) {
  const rnd = mulberry32(seed);
  const color = makeCanvas(size, size);
  const heightC = makeCanvas(size, size);
  const pxPerM = size / metres;
  color.ctx.fillStyle = "#5d5850";
  color.ctx.fillRect(0, 0, size, size);
  heightC.ctx.fillStyle = "#000";
  heightC.ctx.fillRect(0, 0, size, size);
  const tones = ["#8b867d", "#9a958c", "#7a756d", "#a7a299", "#6e6a63", "#b0aba2", "#857b70", "#92897d"];
  const count = Math.round(metres * metres * 2600);
  for (let i = 0; i < count; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = (0.004 + rnd() * rnd() * 0.009) * pxPerM;
    const rx = r * (0.75 + rnd() * 0.5);
    const ry = r * (0.6 + rnd() * 0.4);
    const rot = rnd() * Math.PI;
    const tone = tones[Math.floor(rnd() * tones.length)];
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const cx = x + ox;
        const cy = y + oy;
        if (cx < -r * 2 || cx > size + r * 2 || cy < -r * 2 || cy > size + r * 2) continue;
        // Colour: body + soft top highlight.
        color.ctx.save();
        color.ctx.translate(cx, cy);
        color.ctx.rotate(rot);
        color.ctx.fillStyle = tone;
        color.ctx.beginPath();
        color.ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        color.ctx.fill();
        color.ctx.fillStyle = "rgba(255,255,255,0.07)";
        color.ctx.beginPath();
        color.ctx.ellipse(-rx * 0.2, -ry * 0.25, rx * 0.55, ry * 0.45, 0, 0, Math.PI * 2);
        color.ctx.fill();
        color.ctx.restore();
        // Height: dome per pebble (later pebbles sit on top).
        const g = heightC.ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.7, "rgba(170,170,170,1)");
        g.addColorStop(1, "rgba(60,60,60,1)");
        heightC.ctx.save();
        heightC.ctx.translate(cx, cy);
        heightC.ctx.rotate(rot);
        heightC.ctx.translate(-cx, -cy);
        heightC.ctx.fillStyle = g;
        heightC.ctx.beginPath();
        heightC.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        heightC.ctx.fill();
        heightC.ctx.restore();
      }
    }
  }
  // Normal + roughness from the height field (wrap-around differences).
  const hData = heightC.ctx.getImageData(0, 0, size, size).data;
  const normal = makeCanvas(size, size);
  const rough = makeCanvas(size, size);
  const nImg = normal.ctx.createImageData(size, size);
  const rImg = rough.ctx.createImageData(size, size);
  const hAt = (x: number, y: number) => hData[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  const strength = 2.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (hAt(x + 1, y) - hAt(x - 1, y)) * strength;
      const dy = (hAt(x, y + 1) - hAt(x, y - 1)) * strength;
      // Uploaded with flipY = false: canvas rows run along +v, so the
      // OpenGL (+Y = +v) normal is (−∂h/∂u, −∂h/∂v, 1).
      let nx = -dx;
      let ny = -dy;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * size + x) * 4;
      nImg.data[i] = Math.round((nx * 0.5 + 0.5) * 255);
      nImg.data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      nImg.data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      nImg.data[i + 3] = 255;
      // Gaps between stones are rougher and darker (dust, moisture in crevices).
      const hv = hAt(x, y);
      const r = Math.round((0.78 + (1 - hv) * 0.2) * 255);
      rImg.data[i] = rImg.data[i + 1] = rImg.data[i + 2] = r;
      rImg.data[i + 3] = 255;
    }
  }
  normal.ctx.putImageData(nImg, 0, 0);
  rough.ctx.putImageData(rImg, 0, 0);
  // Darken crevices in the colour map.
  color.ctx.globalCompositeOperation = "multiply";
  color.ctx.globalAlpha = 0.55;
  color.ctx.drawImage(heightC.canvas, 0, 0);
  color.ctx.globalCompositeOperation = "source-over";
  color.ctx.globalAlpha = 1;
  return { color: color.canvas, normal: normal.canvas, rough: rough.canvas };
}
