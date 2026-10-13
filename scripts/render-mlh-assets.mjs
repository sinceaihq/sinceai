#!/usr/bin/env node
/**
 * The two square images MLH asks every Member Event for (2027 season onboarding):
 * a 100 × 100 event logo and a 300 × 300 backsplash / thumbnail, PNG. Built from
 * the official Since AI marks on the site's black background — no new artwork.
 *
 *   node scripts/render-mlh-assets.mjs   → public/assets/mlh/
 */
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve("public/assets/mlh");
const MARK = path.resolve("public/assets/logo/sinceai-white.png"); // the "S" mark, white
const BG = { r: 0, g: 0, b: 0, alpha: 1 };

async function square(size, markShare, file, text) {
  const mark = await sharp(MARK).resize({ width: Math.round(size * markShare), fit: "inside" }).toBuffer();
  const m = await sharp(mark).metadata();
  const layers = [{ input: mark, left: Math.round((size - m.width) / 2), top: Math.round(text ? size * 0.16 : (size - m.height) / 2) }];
  if (text) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <style>.t{font-family:'JetBrains Mono','DejaVu Sans Mono',Menlo,monospace;fill:#fff;text-anchor:middle}</style>
      <text class="t" x="50%" y="${size * 0.74}" font-size="${size * 0.085}" font-weight="700">SINCE AI HACKATHON</text>
      <text class="t" x="50%" y="${size * 0.84}" font-size="${size * 0.06}" fill-opacity="0.7">6–8 NOV 2026 · TURKU</text>
      <rect x="${size * 0.3}" y="${size * 0.9}" width="${size * 0.4}" height="${size * 0.012}" fill="#FF2D78"/>
    </svg>`;
    layers.push({ input: Buffer.from(svg), left: 0, top: 0 });
  }
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, file));
  console.log("wrote", file);
}

await square(100, 0.62, "since-ai-hackathon-2026-logo-100.png", false);
await square(300, 0.4, "since-ai-hackathon-2026-backsplash-300.png", true);
