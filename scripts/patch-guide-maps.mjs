#!/usr/bin/env node
/**
 * Rewrites a company logo box on the Joki floors 2–3 stand map
 * (public/assets/guide/maps/joki-2-3-*.webp) when the challenge roster changes
 * (lib/hackathon-2026/companies.ts).
 *
 * History, already baked into the committed image: 13 Oct 2026 — Bo LKV's box
 * (floor 3) became Fonecta's and Saarioinen's became "TBA". The EduCity images
 * are no longer patched: they are the organiser's final maps of 26 Oct 2026,
 * rebuilt as supplied by scripts/build-guide-maps.mjs.
 *
 * 26 Oct 2026: Europress Group fills the challenge place held as "To be
 * announced (1)" (EduCity 1090 Ringsberg on the organiser's final map), so the
 * same place's Joki floor-2 stand box — "TBA" on the 2 Oct map — gets the
 * official Europress logo (blue on the white box, like every logo on this map).
 * The stand stays provisional in companies.ts until production confirms it.
 *
 * The map is supplied raster artwork, so the script edits pixels: it whitens
 * the inside of the box (keeping its border) and centres the logo in it. The
 * large image is edited and the preview is its half-size resample. Running it
 * twice gives the same image.
 *
 *   node scripts/patch-guide-maps.mjs
 */
import path from "node:path";
import sharp from "sharp";

const DIR = path.resolve("public/assets/guide/maps");
const EUROPRESS = path.resolve("public/assets/sponsors/europress-color.svg");

/** Box border in joki-2-3-large.webp: [left, top, right, bottom] (border pixels). */
const EUROPRESS_BOX = [780, 648, 1019, 791];
/** Pixels inside the border that are repainted (anti-aliased border stays). */
const INSET = 5;

function whiteRect(w, h) {
  return sharp({ create: { width: w, height: h, channels: 3, background: "#ffffff" } }).png().toBuffer();
}

/** Composite layers that blank a box and centre `content` (PNG buffer) inside it. */
async function fill([l, t, r, b], content) {
  const left = l + INSET;
  const top = t + INSET;
  const w = r - l - 2 * INSET;
  const h = b - t - 2 * INSET;
  const meta = await sharp(content).metadata();
  return [
    { input: await whiteRect(w, h), left, top },
    { input: content, left: Math.round(left + (w - meta.width) / 2), top: Math.round(top + (h - meta.height) / 2) },
  ];
}

async function logoFor(file, [l, , r], share) {
  const width = Math.round((r - l - 2 * INSET) * share);
  return sharp(file, { density: 600 }).resize({ width }).png().toBuffer();
}

async function patch(base, layers) {
  const large = path.join(DIR, `${base}-large.webp`);
  const input = await sharp(large).toBuffer();
  const out = await sharp(input).composite(layers).webp({ quality: 90 }).toBuffer();
  const meta = await sharp(out).metadata();
  await sharp(out).toFile(large);
  await sharp(out)
    .resize({ width: Math.round(meta.width / 2), kernel: "lanczos3" })
    .webp({ quality: 90 })
    .toFile(path.join(DIR, `${base}-preview.webp`));
  console.log(`patched ${base} (${meta.width}×${meta.height})`);
}

await patch("joki-2-3", await fill(EUROPRESS_BOX, await logoFor(EUROPRESS, EUROPRESS_BOX, 0.8)));
