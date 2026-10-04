import * as THREE from "three";
import { canvasTexture, EVENT_VIOLET, makeCanvas, drawContained } from "../../render/canvas";
import { loadImage, monoFont, sansFont } from "../../util";

/**
 * One canvas atlas for every EduCity sign: the building's "EduCity" letters,
 * the "B" door letters and the 15 briefing-room door signs (company logo,
 * room number and name — as on the Since AI event maps). Logos come from the
 * repo (white PNGs, LOGOS_3D); a company without an approved logo shows its
 * name. Deterministic, drawn once.
 */

export interface AtlasRect {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** Width / height of the region. */
  aspect: number;
}

export interface DoorSignSpec {
  key: string;
  logo?: string;
  name: string;
  room: string;
  roomName?: string;
}

export interface SignAtlas {
  texture: THREE.CanvasTexture;
  rect(key: string): AtlasRect;
  ready: Promise<void>;
}

const W = 2048;
const H = 1024;

export function makeSignAtlas(doors: DoorSignSpec[], scale = 1): SignAtlas {
  const w = Math.round(W * scale);
  const h = Math.round(H * scale);
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.clearRect(0, 0, w, h);
  const rects = new Map<string, AtlasRect>();
  const reg = (key: string, x: number, y: number, rw: number, rh: number) => {
    // flipY = true on the canvas texture: v runs bottom → top.
    rects.set(key, { u0: x / w, u1: (x + rw) / w, v0: 1 - (y + rh) / h, v1: 1 - y / h, aspect: rw / rh });
  };
  const s = scale;

  // ── Building lettering ──
  const letter = (key: string, text: string, x: number, y: number, rw: number, rh: number, weight: number) => {
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = `${weight} ${Math.round(rh * 0.78)}px ${sansFont()}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const m = ctx.measureText(text);
    const k = Math.min(1, (rw * 0.94) / Math.max(1, m.width));
    ctx.translate(x + rw / 2, y + rh / 2);
    ctx.scale(k, k);
    ctx.fillText(text, 0, rh * 0.03);
    ctx.restore();
    reg(key, x, y, rw, rh);
  };
  letter("educity", "EduCity", 0, 0, 768 * s, 192 * s, 500);
  letter("B", "B", 800 * s, 0, 192 * s, 192 * s, 400);

  // ── Door signs: 5 × 3 grid of 400 × 256 below the lettering ──
  const sw = 400 * s;
  const sh = 256 * s;
  const top = 256 * s;
  const panels = doors.map((d, i) => {
    const x = (i % 5) * (sw + 8 * s);
    const y = top + Math.floor(i / 5) * (sh + 8 * s);
    return { d, x, y };
  });
  for (const { d, x, y } of panels) {
    const g = ctx.createLinearGradient(0, y, 0, y + sh);
    g.addColorStop(0, "#17171b");
    g.addColorStop(1, "#0e0e11");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, sw, sh);
    // Event accent line (Since AI violet, event dressing).
    ctx.fillStyle = EVENT_VIOLET;
    ctx.fillRect(x, y, sw, Math.max(2, 7 * s));
    // Room number · name (mono, as on the event maps).
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `600 ${Math.round(26 * s)}px ${monoFont()}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = d.roomName ? `${d.room} · ${d.roomName}` : d.room;
    const fit = Math.min(1, (sw * 0.9) / Math.max(1, ctx.measureText(label.toUpperCase()).width));
    ctx.save();
    ctx.translate(x + sw / 2, y + sh * 0.84);
    ctx.scale(fit, fit);
    ctx.fillText(label.toUpperCase(), 0, 0);
    ctx.restore();
    if (!d.logo) {
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${Math.round(46 * s)}px ${sansFont()}`;
      const k = Math.min(1, (sw * 0.84) / Math.max(1, ctx.measureText(d.name).width));
      ctx.save();
      ctx.translate(x + sw / 2, y + sh * 0.43);
      ctx.scale(k, k);
      ctx.fillText(d.name, 0, 0);
      ctx.restore();
    }
    reg(d.key, x, y, sw, sh);
  }

  const texture = canvasTexture(canvas, { anisotropy: 8 });
  texture.name = "educity:signs";
  const ready = (async () => {
    const images = await Promise.all(panels.map((p) => (p.d.logo ? loadImage(p.d.logo) : Promise.resolve(null))));
    panels.forEach((p, i) => {
      const img = images[i];
      if (img) drawContained(ctx, img, p.x + sw / 2, p.y + sh * 0.42, sw * 0.74, sh * 0.5);
      else if (p.d.logo) {
        // The file failed to load: fall back to the name.
        ctx.fillStyle = "#ffffff";
        ctx.font = `700 ${Math.round(44 * s)}px ${sansFont()}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.d.name, p.x + sw / 2, p.y + sh * 0.43);
      }
    });
    texture.needsUpdate = true;
  })();
  return {
    texture,
    rect(key: string) {
      const r = rects.get(key);
      if (!r) throw new Error(`educity: no sign "${key}" in the atlas`);
      return r;
    },
    ready,
  };
}

/**
 * The opening-ceremony screen behind the stage (event dressing): Since AI
 * mark, the event title and a violet line.
 */
export function makeStageScreen(scale = 1): { texture: THREE.CanvasTexture; ready: Promise<void> } {
  const w = Math.round(1024 * scale);
  const h = Math.round(384 * scale);
  const { canvas, ctx } = makeCanvas(w, h);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#0d0b1f");
  g.addColorStop(0.6, "#090913");
  g.addColorStop(1, "#171034");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = EVENT_VIOLET;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = Math.max(2, 4 * scale);
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.78);
  ctx.lineTo(w * 0.92, h * 0.78);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(220,214,255,0.92)";
  ctx.font = `600 ${Math.round(34 * scale)}px ${monoFont()}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HACKATHON 2026 · TURKU", w / 2, h * 0.64);
  const texture = canvasTexture(canvas, { anisotropy: 8 });
  texture.name = "educity:stage-screen";
  const ready = (async () => {
    const img = await loadImage("/assets/guide/3d/logos/since-ai.png");
    if (img) drawContained(ctx, img, w / 2, h * 0.36, w * 0.56, h * 0.3);
    else {
      ctx.fillStyle = "#ffffff";
      ctx.font = `700 ${Math.round(70 * scale)}px ${sansFont()}`;
      ctx.fillText("SINCE AI", w / 2, h * 0.36);
    }
    texture.needsUpdate = true;
  })();
  return { texture, ready };
}
