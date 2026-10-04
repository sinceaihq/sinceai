#!/usr/bin/env node
/**
 * Renders the posters of the Field Guide's 3D campus (shown before the WebGL
 * scene loads, and in the teasers) plus the guide's Open Graph image.
 *
 * Re-run after changing anything visible in the 3D — a building, the event
 * dressing, a partner logo, the default time of day.
 *
 *   npm run build && npx next start -p 3100 &
 *   node scripts/render-guide-posters.mjs http://localhost:3100
 *
 * Renders on the real GPU where possible (Metal on macOS); elsewhere it falls
 * back to SwiftShader, which is slow and has no high tier — prefer a Mac or a
 * machine with a GPU. Requires Playwright's Chromium (`npx playwright install
 * chromium`) and Python with Pillow for the WebP encode.
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3100";
const outDir = path.resolve("public/assets/guide/3d/posters");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-posters-"));

/** Place → the view its poster shows (the view the 3D opens on). */
const POSTERS = [
  { place: "campus", view: "campus:default" },
  { place: "educity", view: "educity:default" },
  { place: "biocity", view: "biocity:default" },
  { place: "joki", view: "joki:default" },
];
/** The Open Graph image uses this place's render. */
const OG_PLACE = "campus";
const WIDTH = 1920;
const HEIGHT = 1200;

const gpu =
  process.env.POSTER_GPU ?? (process.platform === "darwin" ? "metal" : "swiftshader");
const browser = await chromium.launch({
  args:
    gpu === "metal"
      ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
      : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
await context.addInitScript(() => {
  try {
    localStorage.setItem("cookie_consent", "denied");
  } catch {}
});

const quality = gpu === "metal" ? "ultra" : "low";
for (const { place, view } of POSTERS) {
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(e.message));
  // ?twin=debug starts the engine right away (full screen) and exposes window.__twin.
  await page.goto(`${base}/hackathon-2026/guide/venue?place=${place}&quality=${quality}&twin=debug#preview-3d`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(() => typeof window.__twin?.ready === "function", null, { timeout: 240_000 });
  await page.evaluate(() => window.__twin.ready());
  await page.evaluate((v) => {
    window.__twin.setLabels(false);
    window.__twin.goto(v, false);
  }, view);
  // Every texture loaded, shadows and exposure settled.
  await page.evaluate(() => window.__twin.ready());
  await page.waitForTimeout(2500);
  // Only the rendered scene: hide the controls and cards laid over it.
  await page.addStyleTag({
    content: `[aria-roledescription="3D scene"] ~ * { visibility: hidden !important; }`,
  });
  await page.waitForTimeout(300);
  const errors = await page.evaluate(() => window.__twin.errors());
  if (problems.length || errors.length) console.warn(place, "reported:", [...problems, ...errors.map((e) => JSON.stringify(e))]);
  const png = path.join(tmpDir, `${place}.png`);
  await page.locator('[aria-roledescription="3D scene"]').first().screenshot({ path: png });
  console.log("rendered", place);
  await page.close();
}

// Open Graph image: a campus render with the guide title.
const render = fs.readFileSync(path.join(tmpDir, `${OG_PLACE}.png`)).toString("base64");
const logo = fs.readFileSync(path.resolve("public/assets/logo/SINCE AI full white.png")).toString("base64");
const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await og.setContent(`<!doctype html><html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=block');
  html,body{margin:0;width:1200px;height:630px;background:#000;overflow:hidden;font-family:'JetBrains Mono',monospace}
  .bg{position:absolute;inset:0;background:url(data:image/png;base64,${render}) 70% center/cover}
  .shade{position:absolute;inset:0;background:linear-gradient(90deg,#000 0%,rgba(0,0,0,.86) 36%,rgba(0,0,0,.12) 72%,rgba(0,0,0,.25) 100%)}
  .c{position:absolute;left:64px;top:64px;bottom:64px;display:flex;flex-direction:column;justify-content:space-between;color:#fff}
  .k{font-size:15px;letter-spacing:.18em;text-transform:uppercase;color:#8b7bff}
  h1{margin:18px 0 0;font-size:84px;line-height:.95;letter-spacing:-.03em}
  p{margin:22px 0 0;font-size:22px;color:rgba(255,255,255,.75)}
  img{height:40px}
</style></head><body><div class="bg"></div><div class="shade"></div>
<div class="c"><div><div class="k">// Hackathon 2026</div><h1>Field<br/>Guide</h1><p>6–8 November 2026 · Turku</p></div>
<img src="data:image/png;base64,${logo}"/></div></body></html>`);
await og.waitForTimeout(1200);
await og.screenshot({ path: path.resolve("public/assets/guide/og-field-guide.jpg"), type: "jpeg", quality: 86 });
console.log("rendered og image");
await browser.close();

// Posters → WebP, 1600 px wide.
fs.mkdirSync(outDir, { recursive: true });
for (const { place } of POSTERS) {
  const src = path.join(tmpDir, `${place}.png`);
  const dst = path.join(outDir, `${place}.webp`);
  try {
    execFileSync("python3", [
      "-c",
      `from PIL import Image; im=Image.open(${JSON.stringify(src)}).convert('RGB'); im=im.resize((1600, round(im.height*1600/im.width)), Image.LANCZOS); im.save(${JSON.stringify(dst)}, 'WEBP', quality=84, method=6)`,
    ]);
    console.log("wrote", path.relative(process.cwd(), dst));
  } catch {
    fs.copyFileSync(src, dst.replace(/\.webp$/, ".png"));
    console.warn("Pillow not available — wrote PNG instead; convert to WebP before committing.");
  }
}
