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
 * for the I (TTK campus brand, SPEC §3.1.6) — green by day, lit at night. The
 * canvas is cropped to the capitals (`cap` = cap height / canvas height), so the
 * mesh can be sized by the real letter height. The I is a full-height bar with
 * TURKU running up it in a darker green: an I from the street, TURKU up close.
 */
export function sciencePark(): { texture: THREE.CanvasTexture; aspect: number; cap: number } {
  const family = sansFont();
  const capPx = 240;
  // Cap height of a heavy grotesque ≈ 0.72 em.
  const px = Math.round(capPx / 0.72);
  const padY = 34;
  const H = capPx + padY * 2;
  const probe = makeCanvas(8, 8).ctx;
  probe.font = `800 ${px}px ${family}`;
  const gap = px * 0.06;
  const space = px * 0.32;
  const stem = px * 0.2;
  const parts: ({ t: string } | { bar: true } | { space: true })[] = [
    { t: "S" },
    { t: "C" },
    { bar: true },
    { t: "E" },
    { t: "N" },
    { t: "C" },
    { t: "E" },
    { space: true },
    { t: "P" },
    { t: "A" },
    { t: "R" },
    { t: "K" },
  ];
  const widthOf = (q: (typeof parts)[number]) => ("t" in q ? probe.measureText(q.t).width : "bar" in q ? stem : space);
  const pad = 24;
  const W = Math.ceil(parts.reduce((a, q) => a + widthOf(q) + gap, 0) - gap + pad * 2);
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${px}px ${family}`;
  const base = padY + capPx;
  let x = pad;
  for (const q of parts) {
    if ("t" in q) ctx.fillText(q.t, x, base);
    else if ("bar" in q) {
      ctx.fillRect(x, padY, stem, capPx);
      // TURKU up the bar (reads bottom to top), a darker tone of the same paint.
      ctx.save();
      ctx.translate(x + stem * 0.5, base - capPx * 0.06);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#9a9a9a";
      ctx.font = `700 ${Math.round(stem * 0.72)}px ${family}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("TURKU", 0, 0, capPx * 0.88);
      ctx.restore();
    }
    x += widthOf(q) + gap;
  }
  return { texture: canvasTexture(canvas, { anisotropy: 8 }), aspect: W / H, cap: capPx / H };
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

/**
 * The curved auditorium wall facing the BioCity–Electrocity yard carries a large colourful mural on
 * white render (SPEC §3.1.1: 5 × 25 m). This is our own abstract drawing in that spirit — leaves,
 * cells, helices, plankton-like branches — not a copy of the artwork. `height` metres of wall map
 * onto the canvas; the painting fills `y0…y1` of it, white render above and below.
 */
export function muralTexture(height: number, y0: number, y1: number, W = 2048, H = 448): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(W, H);
  const rnd = mulberry32(2014);
  ctx.fillStyle = "#eeece6";
  ctx.fillRect(0, 0, W, H);
  const top = H * (1 - y1 / height);
  const bottom = H * (1 - y0 / height);
  const mh = bottom - top;
  const palette = ["#2e9e5b", "#1f7a8c", "#f2c14e", "#f78154", "#e5446d", "#6a3d9a", "#3a86ff", "#8ac926", "#ff9f1c", "#0b6e4f"];
  const pick = () => palette[Math.floor(rnd() * palette.length)];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, W, mh);
  ctx.clip();
  // Soft colour fields.
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W;
    const y = top + rnd() * mh;
    const r = mh * (0.25 + rnd() * 0.5);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const c = pick();
    g.addColorStop(0, `${c}cc`);
    g.addColorStop(1, `${c}00`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Leaves.
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W;
    const y = top + rnd() * mh;
    const l = mh * (0.12 + rnd() * 0.22);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rnd() * Math.PI * 2);
    ctx.fillStyle = pick();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(l * 0.5, -l * 0.32, l, 0);
    ctx.quadraticCurveTo(l * 0.5, l * 0.32, 0, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(l * 0.05, 0);
    ctx.lineTo(l * 0.92, 0);
    ctx.stroke();
    ctx.restore();
  }
  // Cells: rings with nuclei.
  for (let i = 0; i < 46; i++) {
    const x = rnd() * W;
    const y = top + rnd() * mh;
    const r = mh * (0.03 + rnd() * 0.09);
    ctx.fillStyle = `${pick()}d0`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(2, r * 0.18);
    ctx.strokeStyle = pick();
    ctx.stroke();
    ctx.fillStyle = "#1d1d2b";
    ctx.beginPath();
    ctx.arc(x + r * 0.2, y - r * 0.15, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  // Helices.
  for (let i = 0; i < 6; i++) {
    const x0 = rnd() * W;
    const yc = top + mh * (0.25 + rnd() * 0.5);
    const len = W * (0.06 + rnd() * 0.08);
    const amp = mh * 0.1;
    const c1 = pick();
    const c2 = pick();
    for (let s = 0; s < len; s += 6) {
      const ph = (s / len) * Math.PI * 6;
      const ya = yc + Math.sin(ph) * amp;
      const yb = yc - Math.sin(ph) * amp;
      if (s % 24 === 0) {
        ctx.strokeStyle = "rgba(30,30,40,0.5)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0 + s, ya);
        ctx.lineTo(x0 + s, yb);
        ctx.stroke();
      }
      ctx.fillStyle = c1;
      ctx.fillRect(x0 + s, ya - 3, 6, 6);
      ctx.fillStyle = c2;
      ctx.fillRect(x0 + s, yb - 3, 6, 6);
    }
  }
  // Branching plankton / roots in dark ink.
  ctx.strokeStyle = "rgba(25,30,40,0.75)";
  ctx.lineCap = "round";
  const branch = (x: number, y: number, a: number, l: number, d: number) => {
    if (d > 4 || l < 6) return;
    const x2 = x + Math.cos(a) * l;
    const y2 = y + Math.sin(a) * l;
    ctx.lineWidth = Math.max(1.2, 5 - d);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    branch(x2, y2, a - 0.5 + rnd() * 0.2, l * 0.7, d + 1);
    branch(x2, y2, a + 0.5 - rnd() * 0.2, l * 0.7, d + 1);
  };
  for (let i = 0; i < 14; i++) branch(rnd() * W, top + mh * (0.6 + rnd() * 0.4), -Math.PI / 2 + (rnd() - 0.5) * 0.6, mh * 0.18, 0);
  ctx.restore();
  // A thin painted border line top and bottom.
  ctx.fillStyle = "#2b2b33";
  ctx.fillRect(0, top - 2, W, 2);
  ctx.fillRect(0, bottom, W, 2);
  const t = canvasTexture(canvas, { anisotropy: 8 });
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Since AI wayfinding sign over the passage to Joki (event dressing): "JOKI ↓ · Showroom · Q&A". */
export function passageSign(): THREE.CanvasTexture {
  const W = 1024;
  const H = 256;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#0d0c16";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = EVENT_VIOLET;
  ctx.fillRect(0, H - 14, W, 14);
  const mono = monoFont();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = `800 128px ${mono}`;
  ctx.fillText("JOKI", 56, H / 2 - 6);
  const jw = ctx.measureText("JOKI").width;
  // Down arrow (10 steps down) in the event violet.
  ctx.fillStyle = "#a99cff";
  const ax = 56 + jw + 70;
  const ay = H / 2 - 6;
  ctx.beginPath();
  ctx.moveTo(ax - 16, ay - 52);
  ctx.lineTo(ax + 16, ay - 52);
  ctx.lineTo(ax + 16, ay + 6);
  ctx.lineTo(ax + 42, ay + 6);
  ctx.lineTo(ax, ay + 54);
  ctx.lineTo(ax - 42, ay + 6);
  ctx.lineTo(ax - 16, ay + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = `600 40px ${mono}`;
  ctx.fillText("SHOWROOM · Q&A", ax + 86, H / 2 - 30);
  ctx.fillStyle = "rgba(220,214,255,0.75)";
  ctx.font = `500 32px ${mono}`;
  ctx.fillText("10 STEPS DOWN", ax + 86, H / 2 + 26);
  return canvasTexture(canvas, { anisotropy: 8 });
}
