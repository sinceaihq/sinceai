#!/usr/bin/env node
/**
 * Renders the static posters for the Field Guide 3D preview (shown before the
 * WebGL scene loads, and in the teasers) plus the guide's Open Graph image.
 *
 * Re-run after changing anything visible in a 3D scene — for example when the
 * approved Red Hat logo is added to lib/hackathon-2026/partners.ts.
 *
 *   npm run build && npx next start -p 3100 &
 *   node scripts/render-guide-posters.mjs http://localhost:3100
 *
 * Requires Playwright's Chromium (`npx playwright install chromium`).
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3100";
const outDir = path.resolve("public/assets/guide/3d");
const tmpDir = fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "guide-posters-"));

const SCENES = ["showroom", "joki-tower", "biocity"];

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
// Canvas area = viewport − header (56 px) − bottom bar (~69 px) → 1920 × 1080.
const context = await browser.newContext({ viewport: { width: 1920, height: 1205 }, deviceScaleFactor: 1 });
await context.addInitScript(() => {
  try {
    localStorage.setItem("cookie_consent", "denied");
  } catch {}
});
const page = await context.newPage();

for (const scene of SCENES) {
  await page.goto(`${base}/hackathon-2026/guide/venue?scene=${scene}#preview-3d`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Show names", exact: true }).waitFor({ timeout: 180_000 });
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await page.waitForTimeout(2500);
  // Hide every overlay so only the rendered scene is captured.
  await page.addStyleTag({
    content: `[role=dialog] button, [role=dialog] select, [role=dialog] label { visibility: hidden !important; }
              [role=dialog] [aria-roledescription="3D scene"] > div { display: none !important; }`,
  });
  await page.waitForTimeout(400);
  const stage = page.locator('[aria-roledescription="3D scene"]');
  const png = path.join(tmpDir, `${scene}.png`);
  await stage.screenshot({ path: png });
  console.log("rendered", scene);
  await page
    .getByRole("button", { name: "Close the 3D preview", exact: true })
    .click({ force: true })
    .catch(() => {});
}

// Open Graph image: the Showroom render with the guide title.
const showroom = fs.readFileSync(path.join(tmpDir, "showroom.png")).toString("base64");
const logo = fs.readFileSync(path.resolve("public/assets/logo/SINCE AI full white.png")).toString("base64");
const og = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await og.setContent(`<!doctype html><html><head><style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=block');
  html,body{margin:0;width:1200px;height:630px;background:#000;overflow:hidden;font-family:'JetBrains Mono',monospace}
  .bg{position:absolute;inset:0;background:url(data:image/png;base64,${showroom}) center/cover}
  .shade{position:absolute;inset:0;background:linear-gradient(90deg,#000 0%,rgba(0,0,0,.86) 38%,rgba(0,0,0,.15) 75%,rgba(0,0,0,.35) 100%)}
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

// Posters → WebP (via Pillow if available, else keep PNG next to it).
for (const scene of SCENES) {
  const src = path.join(tmpDir, `${scene}.png`);
  const dst = path.join(outDir, `${scene}-poster.webp`);
  try {
    execFileSync("python3", [
      "-c",
      `from PIL import Image; im=Image.open(${JSON.stringify(src)}).convert('RGB'); im=im.resize((1600, round(im.height*1600/im.width)), Image.LANCZOS); im.save(${JSON.stringify(dst)}, 'WEBP', quality=82, method=6)`,
    ]);
    console.log("wrote", path.relative(process.cwd(), dst));
  } catch {
    fs.copyFileSync(src, dst.replace(/\.webp$/, ".png"));
    console.warn("Pillow not available — wrote PNG instead; convert to WebP before committing.");
  }
}
