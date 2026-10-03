import * as THREE from "three";
import { loadImage, monoFont, mulberry32 } from "./util";

export interface ReadyTexture {
  texture: THREE.CanvasTexture;
  /** Resolves when async content (logos) has been drawn. */
  ready: Promise<void>;
}

const NEON = ["#7a5cff", "#9a6bff", "#5f72ff", "#b08cff", "#6b4dff"];

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, ctx: c.getContext("2d")! };
}

function finish(c: HTMLCanvasElement, opts: { repeat?: boolean; srgb?: boolean; anisotropy?: number } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.anisotropy = opts.anisotropy ?? 8;
  t.needsUpdate = true;
  return t;
}

/** Draw a logo image centred in a box, preserving aspect ratio. */
function drawContained(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number,
) {
  const s = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

function wordmark(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number, color = "#ffffff") {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px ${monoFont()}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), cx, cy);
  ctx.restore();
}

/** Glowing neon polylines in the style of the event render. */
function neonLines(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  seed: number,
  count: number,
  scale = 1,
) {
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
      const angle = THREE.MathUtils.degToRad((rnd() < 0.5 ? -1 : 1) * (12 + rnd() * 26));
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
 * The Showroom LED wall: dark navy panels, violet neon line work, partner
 * logos above each counter and calm Since AI marks — after the event render.
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
  /** Logo centre, as a fraction from the top. */
  logoCenterV?: number;
  logoMaxW?: number;
  logoMaxH?: number;
  markV?: number;
  seed?: number;
}): ReadyTexture {
  const w = width;
  const h = Math.round(width / aspect);
  const { c, ctx } = canvas(w, h);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#0c0d26");
  bg.addColorStop(0.55, "#080919");
  bg.addColorStop(1, "#0d0a24");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // LED module seams.
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

  // Thin vertical dividers between partner panels.
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

  const texture = finish(c, { anisotropy: 16 });

  const ready = (async () => {
    const [mark, ...images] = await Promise.all([
      loadImage(markSrc),
      ...logos.map((l) => (l.src ? loadImage(l.src) : Promise.resolve(null))),
    ]);
    logos.forEach((logo, i) => {
      const cx = logo.u * w;
      const cy = logoCenterV * h;
      // Soft LED bloom behind each logo.
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.42);
      glow.addColorStop(0, "rgba(140,120,255,0.10)");
      glow.addColorStop(1, "rgba(140,120,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(cx - h * 0.45, cy - h * 0.45, h * 0.9, h * 0.9);
      const img = images[i];
      if (img) drawContained(ctx, img, cx, cy, logoMaxW * w, logoMaxH * h);
      else if (logo.text) wordmark(ctx, logo.text, cx, cy, h * 0.11);
    });
    if (mark) {
      for (const u of marks) drawContained(ctx, mark, u * w, markV * h, w * 0.05, h * 0.085);
    }
    texture.needsUpdate = true;
  })();

  return { texture, ready };
}

/** Grey carpet tile with fibre noise (tiles every ~2 m). */
export function makeCarpetTexture(base = "#3a3a44", seed = 3): THREE.CanvasTexture {
  const size = 512;
  const { c, ctx } = canvas(size, size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const rnd = mulberry32(seed);
  for (let i = 0; i < 9000; i++) {
    const v = rnd();
    ctx.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.06 + rnd() * 0.12})` : `rgba(255,255,255,${0.03 + rnd() * 0.06})`;
    const x = rnd() * size;
    const y = rnd() * size;
    ctx.fillRect(x, y, 1 + rnd() * 2.5, 1 + rnd() * 1.2);
  }
  return finish(c, { repeat: true });
}

/** Radial gradient for fake light pools / contact shadows (used with alpha). */
export function makeRadialTexture(inner: string, outer: string): THREE.CanvasTexture {
  const size = 256;
  const { c, ctx } = canvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return finish(c);
}

/** Vertical fade used for the violet glow spilling from the LED wall onto the floor. */
export function makeFadeTexture(color: string): THREE.CanvasTexture {
  const { c, ctx } = canvas(4, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color.replace(/[\d.]+\)$/, "0.35)"));
  g.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  return finish(c);
}

/** Stand sign / booth back wall: logo (or wordmark) on a dark panel with neon accents. */
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
  const { c, ctx } = canvas(w, h);
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

  const texture = finish(c);
  const ready = (async () => {
    const img = src ? await loadImage(src) : null;
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
