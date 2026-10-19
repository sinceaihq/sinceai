#!/usr/bin/env node
/**
 * The share images (Open Graph / X cards), 1200 × 630 PNG: a headline over the
 * same dot-matrix ecosystem map as the homepage hero, in the site's own font
 * and logo. Rebuild them when a headline, the figures or the map change.
 *
 *   node scripts/render-og-image.mjs   → public/assets/og/sinceai.png (site)
 *                                         public/assets/og/hackathon-2026.png (/hackathon)
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const OUT = path.resolve("public/assets/og");
const font = (file) => fs.readFileSync(path.resolve("app/fonts", file)).toString("base64");

// The generated map is a TS module of plain string literals; read the values straight out of it.
const src = fs.readFileSync(path.resolve("lib/world-map.generated.ts"), "utf8");
const grab = (key) => {
  const m = src.match(new RegExp(`${key}: (\\[[^\\]]*\\]|"[^"]*")`));
  if (!m) throw new Error(`world-map.generated.ts: no ${key}`);
  return JSON.parse(m[1]);
};
const [cols, rows] = [150, 65];
const land = grab("land");
const glow = grab("glow");
const cities = grab("cities");
const hqSrc = fs.readFileSync(path.resolve("lib/ecosystem-cities.generated.ts"), "utf8");
const [hqX, hqY] = JSON.parse(hqSrc.match(/HQ[^=]*= (\[[^\]]+\])/)[1]);

const logo = fs.readFileSync(path.resolve("public/assets/logo/SINCE AI full white.png")).toString("base64");

// Figures as published in lib/org.ts (ORG.stats), lib/sinceai.ts and on the pages these cards stand for.
const CARDS = [
  {
    file: "sinceai.png",
    kicker: "",
    title: "Where frontier AI becomes shipped products.",
    facts: [["10,000+", "AI builders"], ["120+", "countries"], ["100+", "partners"]],
    url: "sinceai.ai",
  },
  {
    file: "hackathon-2026.png",
    kicker: "Since AI Hackathon 2026",
    title: "6–8 November 2026<br>Turku, Finland",
    facts: [["48", "hours"], ["15", "company challenges"], ["Open", "worldwide"]],
    url: "sinceai.ai/hackathon",
  },
];

const html = (card) => `<!doctype html><html><head><style>
@font-face { font-family: Mono; src: url(data:font/woff2;base64,${font("JetBrainsMono-latin-variable.woff2")}) format("woff2"); font-weight: 100 800; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #000; color: #fff; font-family: Mono, monospace; overflow: hidden; position: relative; }
.map { position: absolute; left: -24px; right: -24px; top: 214px; }
.map svg { display: block; width: 100%; height: auto; }
.map path { fill: none; stroke-linecap: round; }
.land { stroke: rgba(255,255,255,0.2); stroke-width: 0.5; }
.g { stroke: #FF2D78; stroke-width: 0.56; }
.c { stroke: #fff; }
.h { stroke: #FF2D78; stroke-opacity: 0.16; }
/* The headline sits on a soft black fade so the northern dots never cross it. */
.fade { position: absolute; inset: 0 0 auto 0; height: 270px; background: linear-gradient(#000 0 82%, rgba(0,0,0,0)); }
.fade-b { position: absolute; inset: auto 0 0 0; height: 150px; background: linear-gradient(rgba(0,0,0,0), #000 78%); }
.top { position: absolute; left: 72px; right: 72px; top: 58px; }
.brand { display: flex; align-items: center; gap: 22px; height: 30px; }
.brand img { height: 26px; display: block; }
.brand span { font-size: 20px; letter-spacing: 0.16em; text-transform: uppercase; color: #FF2D78; padding-left: 22px; border-left: 1px solid rgba(255,255,255,0.25); line-height: 30px; }
h1 { margin-top: 30px; font-size: 60px; line-height: 1.02; letter-spacing: -0.035em; font-weight: 700; max-width: 1050px; }
.foot { position: absolute; left: 72px; right: 72px; bottom: 48px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 22px; color: rgba(255,255,255,0.72); }
.foot b { color: #fff; font-weight: 700; }
.foot .facts { display: flex; gap: 34px; }
.pill { position: absolute; display: inline-flex; gap: 8px; align-items: center; transform: translate(26px, -50%); background: rgba(0,0,0,0.8); padding: 5px 6px 5px 10px; font-size: 15px; }
.pill span:last-child { background: #FF2D78; color: #000; font-weight: 700; padding: 2px 6px; font-size: 13px; letter-spacing: 0.06em; }
</style></head><body>
<div class="map"><svg viewBox="0 0 ${cols} ${rows}">
  <path class="land" d="${land}"/>
  ${glow.map((d, i) => `<path class="g" stroke-opacity="${[0.32, 0.6, 0.92][i]}" d="${d}"/>`).join("")}
  ${cities.map((d, i) => `<path class="h" stroke-width="${[1.2, 1.7, 2.4, 3.2][i]}" d="${d}"/><path class="c" stroke-width="${[0.6, 0.72, 0.86, 1][i]}" d="${d}"/>`).join("")}
  <rect x="${hqX + 0.5 - 0.6}" y="${hqY + 0.5 - 0.6}" width="1.2" height="1.2" fill="#fff"/>
</svg>
<div class="pill" style="left:${((hqX + 0.5) / cols) * 100}%; top:${((hqY + 0.5) / rows) * 100}%"><span>Turku, Finland</span><span>HQ</span></div>
</div>
<div class="fade"></div>
<div class="fade-b"></div>
<div class="top">
  <div class="brand"><img src="data:image/png;base64,${logo}" alt="">${card.kicker ? `<span>${card.kicker}</span>` : ""}</div>
  <h1>${card.title}</h1>
</div>
<div class="foot">
  <div class="facts">${card.facts.map(([n, label]) => `<span><b>${n}</b> ${label}</span>`).join("")}</div>
  <b>${card.url}</b>
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const card of CARDS) {
  await page.setContent(html(card), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(OUT, card.file);
  // A 256-colour palette keeps each card around 40 KB with no visible loss on this artwork.
  const shot = await page.screenshot({ type: "png" });
  await sharp(shot).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(out);
  console.log("wrote", path.relative(process.cwd(), out));
}
await browser.close();
