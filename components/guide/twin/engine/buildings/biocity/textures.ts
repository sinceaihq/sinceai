import * as THREE from "three";
import { EVENT_VIOLET, canvasTexture, drawContained, makeCanvas } from "../../render/canvas";
import { loadImage, monoFont, mulberry32, sansFont } from "../../util";

/**
 * Canvas textures of BioCity: the partner stand graphics (one atlas), the
 * Since AI wayfinding totems (one atlas) and the building's own lettering —
 * the vertical BIOCITY sign, the rooftop SCIENCE PARK letters (TTK campus
 * brand, allowed per SPEC §3.1.6), the small BIOCITY lettering and the
 * "Turun Tiedepuisto – BioCity A" board by the Tykistökatu door. No tenant
 * or third-party logos; partner logos only from the repo.
 */

export interface AtlasTexture {
  texture: THREE.CanvasTexture;
  ready: Promise<void>;
  /** UV rectangle [u0, v0, u1, v1] of a tile (flipY: v from the bottom). */
  tile(i: number): [number, number, number, number];
}

function atlasTile(cols: number, rows: number) {
  return (i: number): [number, number, number, number] => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    return [c / cols, 1 - (r + 1) / rows, (c + 1) / cols, 1 - r / rows];
  };
}

/** Fit text into a width (px) at up to `size`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, size: number, maxW: number): number {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (s > 10 && ctx.measureText(text).width > maxW) {
    s *= 0.94;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

function violetLines(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const c = ["#7a5cff", "#9a6bff", "#6b4dff", "#b08cff"][Math.floor(rnd() * 4)];
    ctx.strokeStyle = c;
    ctx.shadowColor = c;
    ctx.shadowBlur = 14;
    ctx.globalAlpha = 0.35 + rnd() * 0.35;
    ctx.lineWidth = 2 + rnd() * 2;
    let px = x + rnd() * w;
    let py = rnd() < 0.5 ? y + h * (0.86 + rnd() * 0.12) : y + h * rnd() * 0.12;
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let s = 0; s < 2; s++) {
      px += (rnd() - 0.5) * w * 0.8;
      py += (rnd() - 0.5) * h * 0.1;
      ctx.lineTo(Math.min(x + w, Math.max(x, px)), Math.min(y + h, Math.max(y, py)));
    }
    ctx.stroke();
  }
  ctx.restore();
}

export interface StandGraphic {
  /** Partner logo path (repo), or null for a name in lettering / an open stand. */
  logo: string | null;
  /** Big line (partner name or "Visibility / Tech Partner stand"). */
  title: string;
  /** Small line ("Stand 1 · Visibility / Tech partner"). */
  subtitle: string;
  open: boolean;
}

/** One 2048² atlas with four 1024² stand graphics (back walls and counter fronts share it). */
export function standAtlas(stands: StandGraphic[]): AtlasTexture {
  const size = 2048;
  const tileSize = 1024;
  const { canvas, ctx } = makeCanvas(size, size);
  const tile = atlasTile(2, 2);
  const mono = monoFont();
  const sans = sansFont();
  stands.slice(0, 4).forEach((s, i) => {
    const x = (i % 2) * tileSize;
    const y = Math.floor(i / 2) * tileSize;
    const g = ctx.createLinearGradient(x, y, x, y + tileSize);
    g.addColorStop(0, s.open ? "#121216" : "#100e1f");
    g.addColorStop(1, s.open ? "#0b0b0e" : "#08070f");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, tileSize, tileSize);
    if (!s.open) violetLines(ctx, x, y, tileSize, tileSize, 31 + i * 7);
    ctx.strokeStyle = s.open ? "rgba(255,255,255,0.18)" : "rgba(139,123,255,0.7)";
    ctx.lineWidth = 6;
    ctx.strokeRect(x + 10, y + 10, tileSize - 20, tileSize - 20);
    // Event strip at the bottom.
    ctx.fillStyle = s.open ? "rgba(139,123,255,0.35)" : EVENT_VIOLET;
    ctx.fillRect(x + 10, y + tileSize - 70, tileSize - 20, 8);
    ctx.fillStyle = s.open ? "rgba(255,255,255,0.55)" : "rgba(220,214,255,0.9)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `600 ${40}px ${mono}`;
    ctx.fillText(s.subtitle.toUpperCase(), x + tileSize / 2, y + tileSize - 120);
    ctx.font = `500 ${30}px ${mono}`;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("SINCE AI HACKATHON 2026", x + tileSize / 2, y + 80);
    if (!s.logo) {
      ctx.fillStyle = s.open ? "rgba(255,255,255,0.78)" : "#ffffff";
      const words = s.title.split(" / ");
      if (words.length > 1) {
        const fs = fitFont(ctx, s.title, sans, 700, 76, tileSize * 0.8);
        ctx.font = `700 ${fs}px ${sans}`;
        ctx.fillText(`${words[0]} /`, x + tileSize / 2, y + tileSize * 0.42);
        ctx.fillText(words.slice(1).join(" / "), x + tileSize / 2, y + tileSize * 0.42 + fs * 1.25);
      } else {
        const fs = fitFont(ctx, s.title, sans, 800, 190, tileSize * 0.8);
        ctx.font = `800 ${fs}px ${sans}`;
        ctx.fillText(s.title, x + tileSize / 2, y + tileSize * 0.46);
      }
    }
  });
  const texture = canvasTexture(canvas, { anisotropy: 8 });
  const ready = (async () => {
    await Promise.all(
      stands.slice(0, 4).map(async (s, i) => {
        if (!s.logo) return;
        const img = await loadImage(s.logo);
        const x = (i % 2) * tileSize;
        const y = Math.floor(i / 2) * tileSize;
        if (img) drawContained(ctx, img, x + tileSize / 2, y + tileSize * 0.46, tileSize * 0.74, tileSize * 0.3);
        else {
          ctx.fillStyle = "#ffffff";
          ctx.font = `800 140px ${sans}`;
          ctx.textAlign = "center";
          ctx.fillText(s.title, x + tileSize / 2, y + tileSize * 0.46);
        }
      }),
    );
    texture.needsUpdate = true;
  })();
  return { texture, ready, tile };
}

export interface TotemFace {
  /** Lines with an optional arrow: "→", "←", "↑", "↓". */
  lines: { text: string; arrow?: "left" | "right" | "up" | "down" }[];
}

function arrowPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, dir: "left" | "right" | "up" | "down") {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate({ right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[dir]);
  ctx.beginPath();
  ctx.moveTo(-s, -s * 0.22);
  ctx.lineTo(s * 0.15, -s * 0.22);
  ctx.lineTo(s * 0.15, -s * 0.62);
  ctx.lineTo(s, 0);
  ctx.lineTo(s * 0.15, s * 0.62);
  ctx.lineTo(s * 0.15, s * 0.22);
  ctx.lineTo(-s, s * 0.22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Since AI wayfinding totems: up to four 512 × 1536 faces in one 2048 × 1536 atlas. */
export function totemAtlas(faces: TotemFace[], logoSrc = "/assets/logo/sinceai-white.png"): AtlasTexture {
  const w = 512;
  const h = 1536;
  const { canvas, ctx } = makeCanvas(w * 4, h);
  const tile = atlasTile(4, 1);
  const mono = monoFont();
  faces.slice(0, 4).forEach((f, i) => {
    const x = i * w;
    const g = ctx.createLinearGradient(x, 0, x, h);
    g.addColorStop(0, "#15112e");
    g.addColorStop(0.5, "#0c0b17");
    g.addColorStop(1, "#120d2a");
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, w, h);
    ctx.fillStyle = EVENT_VIOLET;
    ctx.fillRect(x, 0, w, 18);
    ctx.fillRect(x, h - 40, w, 40);
    let y = 470;
    for (const line of f.lines) {
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      const words = line.text.toUpperCase().split("\n");
      const fs = Math.min(...words.map((t) => fitFont(ctx, t, mono, 700, 58, w * 0.64)));
      ctx.font = `700 ${fs}px ${mono}`;
      words.forEach((t, k) => ctx.fillText(t, x + 40, y + k * fs * 1.15));
      if (line.arrow) arrowPath(ctx, x + w - 70, y + ((words.length - 1) * fs * 1.15) / 2, 36, line.arrow);
      y += words.length * fs * 1.15 + 70;
      ctx.fillStyle = "rgba(139,123,255,0.45)";
      ctx.fillRect(x + 40, y - 40, w - 80, 3);
    }
  });
  const texture = canvasTexture(canvas, { anisotropy: 8 });
  const ready = (async () => {
    const logo = await loadImage(logoSrc);
    if (logo) for (let i = 0; i < Math.min(4, faces.length); i++) drawContained(ctx, logo, i * w + w / 2, 230, w * 0.72, 150);
    texture.needsUpdate = true;
  })();
  return { texture, ready, tile };
}

/** White lettering on transparent (letters stacked vertically when `vertical`). */
export function lettering(
  text: string,
  opts: { color?: string; vertical?: boolean; px?: number; weight?: number; family?: "sans" | "mono"; spacing?: number } = {},
): { texture: THREE.CanvasTexture; aspect: number } {
  const px = opts.px ?? 200;
  const family = opts.family === "mono" ? monoFont() : sansFont();
  const weight = opts.weight ?? 600;
  const probe = makeCanvas(8, 8).ctx;
  probe.font = `${weight} ${px}px ${family}`;
  const chars = [...text];
  const spacing = (opts.spacing ?? 0.08) * px;
  const widths = chars.map((c) => probe.measureText(c).width);
  const pad = px * 0.15;
  const W = opts.vertical ? Math.ceil(Math.max(...widths) + pad * 2) : Math.ceil(widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1) + pad * 2);
  const H = opts.vertical ? Math.ceil(chars.length * px * 1.12 + pad * 2) : Math.ceil(px * 1.25 + pad * 2);
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.font = `${weight} ${px}px ${family}`;
  ctx.fillStyle = opts.color ?? "#ffffff";
  ctx.textBaseline = "middle";
  if (opts.vertical) {
    ctx.textAlign = "center";
    chars.forEach((c, i) => ctx.fillText(c, W / 2, pad + px * 0.56 + i * px * 1.12));
  } else {
    ctx.textAlign = "left";
    let x = pad;
    chars.forEach((c, i) => {
      ctx.fillText(c, x, H / 2);
      x += widths[i] + spacing;
    });
  }
  return { texture: canvasTexture(canvas, { anisotropy: 8 }), aspect: W / H };
}

/**
 * The rooftop "SCIENCE PARK" letters with a slim vertical "TURKU" standing in
 * for the I (TTK campus brand, SPEC §3.1.6) — green by day, lit at night.
 */
export function sciencePark(): { texture: THREE.CanvasTexture; aspect: number } {
  const px = 220;
  const family = sansFont();
  const W = 2600;
  const H = 340;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${px}px ${family}`;
  const base = H - 70;
  let x = 30;
  const draw = (t: string) => {
    ctx.fillText(t, x, base);
    x += ctx.measureText(t).width + 18;
  };
  draw("SC");
  // The slim vertical TURKU in place of the I.
  ctx.save();
  ctx.translate(x + 22, base);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `800 ${46}px ${family}`;
  ctx.fillText("TURKU", 0, 0);
  ctx.restore();
  x += 62;
  ctx.font = `800 ${px}px ${family}`;
  draw("ENCE");
  x += 70;
  draw("PARK");
  return { texture: canvasTexture(canvas, { anisotropy: 8 }), aspect: W / H };
}

/** "Turun Tiedepuisto – BioCity A" board: a small green campus map with the A marked. */
export function mapBoard(): THREE.CanvasTexture {
  const W = 512;
  const H = 384;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#1b1d1f";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#e9ecee";
  ctx.font = `500 26px ${sansFont()}`;
  ctx.fillText("Turun Tiedepuisto", 24, 44);
  ctx.font = `700 32px ${sansFont()}`;
  ctx.fillText("BioCity  A", 24, 84);
  // Map: grey blocks, green park, the building in white with the A.
  ctx.fillStyle = "#5d6266";
  ctx.fillRect(24, 110, W - 48, H - 134);
  const rnd = mulberry32(5);
  ctx.fillStyle = "#7a8085";
  for (let i = 0; i < 16; i++) ctx.fillRect(30 + rnd() * (W - 120), 116 + rnd() * (H - 190), 30 + rnd() * 60, 18 + rnd() * 40);
  ctx.fillStyle = "#3e9b4a";
  ctx.beginPath();
  ctx.moveTo(W - 160, 110);
  ctx.lineTo(W - 24, 110);
  ctx.lineTo(W - 24, H - 24);
  ctx.lineTo(W - 220, H - 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f2f2f2";
  ctx.fillRect(150, 190, 120, 70);
  ctx.fillStyle = "#2fa84f";
  ctx.beginPath();
  ctx.arc(160, 200, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 22px ${sansFont()}`;
  ctx.fillText("A", 153, 208);
  return canvasTexture(canvas, { anisotropy: 4 });
}

/** Green square "A" door sign. */
export function doorASign(): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = "#2b2d2f";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#3fae4f";
  ctx.font = `800 96px ${sansFont()}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A", 64, 70);
  return canvasTexture(canvas, { anisotropy: 4 });
}
