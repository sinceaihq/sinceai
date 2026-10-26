#!/usr/bin/env node
/**
 * Builds the Field Guide's EduCity map images from the organiser's final 2026
 * maps (supplied 26 Oct 2026; they supersede the 2 Oct zone plan and room maps):
 *
 *   01_team_formation_floor1.jpg            → educity-team-formation
 *   03_educity_floor1_company_briefings.jpg → educity-1
 *   04_educity_floor2_company_briefings.jpg → educity-2
 *   02_educity_floor3_partner_stands.jpg    → educity-3
 *
 * The artwork is used as supplied, never redrawn. `-preview` is the source
 * size; `-large` is a 2× Lanczos resample for the full-screen zoom, so the
 * room labels stay smooth when zoomed (it adds no detail the source lacks).
 *
 *   node scripts/build-guide-maps.mjs <folder with the supplied JPGs>
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = process.argv[2];
if (!SRC || !fs.existsSync(SRC)) {
  console.error("Usage: node scripts/build-guide-maps.mjs <maps folder>");
  process.exit(1);
}
const OUT = path.resolve("public/assets/guide/maps");
const JOBS = [
  ["01_team_formation_floor1.jpg", "educity-team-formation"],
  ["03_educity_floor1_company_briefings.jpg", "educity-1"],
  ["04_educity_floor2_company_briefings.jpg", "educity-2"],
  ["02_educity_floor3_partner_stands.jpg", "educity-3"],
];

for (const [file, id] of JOBS) {
  const input = path.join(SRC, file);
  const { width, height } = await sharp(input).metadata();
  await sharp(input).webp({ quality: 82, effort: 6 }).toFile(path.join(OUT, `${id}-preview.webp`));
  await sharp(input)
    .resize(width * 2, height * 2, { kernel: "lanczos3" })
    .sharpen({ sigma: 0.6 })
    .webp({ quality: 84, effort: 6 })
    .toFile(path.join(OUT, `${id}-large.webp`));
  console.log(`${id}: ${width}×${height} (large ${width * 2}×${height * 2})`);
}
