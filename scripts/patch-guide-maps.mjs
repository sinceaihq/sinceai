#!/usr/bin/env node
/**
 * Rewrites the company logo boxes on the Field Guide's venue map images for the
 * 13 Oct 2026 challenge roster (lib/hackathon-2026/companies.ts):
 *
 *   - Bo LKV's boxes (EduCity 2001 Elias, Joki floor 3) → the Fonecta logo,
 *   - Saarioinen's boxes (EduCity 2067, Joki floor 3)   → "TBA".
 *
 * The maps are supplied raster artwork (no source files in the repo), so the
 * script edits pixels: it whitens the inside of each box (keeping its border)
 * and draws the new content centred in it. "TBA" is copied pixel for pixel from
 * the existing TBA boxes (EduCity floor 1 1090 Ringsberg and Joki floor 2), so
 * the lettering matches; Fonecta uses its official colour logo on the white
 * box, like every other company logo on these maps. The large image is edited
 * and the preview is its half-size resample, as before. Idempotent.
 *
 *   node scripts/patch-guide-maps.mjs
 *
 * Box rectangles are the first dark border pixels of each box in the large
 * image (found by walking out from a point inside the box).
 */
import path from "node:path";
import sharp from "sharp";

const DIR = path.resolve("public/assets/guide/maps");
const FONECTA = path.resolve("public/assets/sponsors/fonecta-color.svg");

/** Box borders in the large images: [left, top, right, bottom] (border pixels). */
const BOXES = {
  educity2: { fonecta: [393, 529, 669, 687], tba: [353, 859, 546, 1059] },
  joki23: { fonecta: [1732, 978, 1972, 1121], tba: [2392, 978, 2632, 1121] },
};
/** Where an untouched "TBA" box is: [image, left, top, right, bottom]. */
const TBA_SOURCE = {
  educity: ["educity-1-large.webp", 1065, 799, 1347, 894],
  joki: ["joki-2-3-large.webp", 780, 648, 1019, 791],
};
/** Pixels inside the border that are repainted (anti-aliased border stays). */
const INSET = 5;

/** The dark lettering inside a box, tightly cropped, as a PNG buffer. */
async function glyphs([file, l, t, r, b]) {
  const left = l + INSET;
  const top = t + INSET;
  const width = r - l - 2 * INSET;
  const height = b - t - 2 * INSET;
  const crop = await sharp(path.join(DIR, file)).extract({ left, top, width, height }).png().toBuffer();
  return sharp(crop).trim({ background: "#ffffff", threshold: 40 }).png().toBuffer();
}

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
    {
      input: content,
      left: Math.round(left + (w - meta.width) / 2),
      top: Math.round(top + (h - meta.height) / 2),
    },
  ];
}

/** The Fonecta logo sized to `share` of a box's inner width. */
async function fonectaFor([l, , r], share = 0.72) {
  const width = Math.round((r - l - 2 * INSET) * share);
  return sharp(FONECTA, { density: 600 }).resize({ width }).png().toBuffer();
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

const tbaEdu = await glyphs(TBA_SOURCE.educity);
const tbaJoki = await glyphs(TBA_SOURCE.joki);

for (const base of ["educity-2", "educity-flow-2"]) {
  const b = BOXES.educity2;
  await patch(base, [...(await fill(b.fonecta, await fonectaFor(b.fonecta))), ...(await fill(b.tba, tbaEdu))]);
}
{
  const b = BOXES.joki23;
  await patch("joki-2-3", [...(await fill(b.fonecta, await fonectaFor(b.fonecta, 0.78))), ...(await fill(b.tba, tbaJoki))]);
}
