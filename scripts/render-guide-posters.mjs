#!/usr/bin/env node
/**
 * Renders the posters of the Field Guide's 3D campus (shown before the WebGL
 * scene loads, and in the teasers) — a landscape poster per place for wide
 * screens and a portrait one for phones, each the view the 3D opens on — plus
 * the guide's Open Graph image.
 *
 * Re-run after changing anything visible in the 3D — a building, the event
 * dressing, a partner logo, an opening view, the default time of day.
 *
 *   npm run build && npx next start -p 3100 &
 *   node scripts/render-guide-posters.mjs http://localhost:3100 [--quality=ultra] [--places=campus,joki]
 *
 * Browsers come from scripts/twin/qa/gpu.mjs: the real GPU on macOS, Mesa
 * lavapipe on a GPU-less Linux server (scripts/twin/qa/setup-mesa.sh), else
 * SwiftShader. WebP encoding uses sharp (installed with Next.js).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { launchGpu } from "./twin/qa/gpu.mjs";

const args = Object.fromEntries(
  process.argv.slice(3).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : "1"];
  }),
);
const base = process.argv[2] ?? "http://localhost:3100";
const outDir = path.resolve("public/assets/guide/3d/posters");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "guide-posters-"));
const quality = args.quality ?? "ultra";
const places = (args.places ?? "campus,educity,biocity,joki").split(",");
/** The Open Graph image uses this place's landscape render. */
const OG_PLACE = "campus";
const FORMATS = [
  { suffix: "", width: 1600, context: { viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 } },
  {
    suffix: "-portrait",
    width: 824,
    context: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  },
];
// Modules that always draw (people, traffic, route pulses): the view is settled when nothing else does.
const ANIMATED = ["people", "vehicles", "routes", "event", "traffic"];

const browser = await launchGpu();
try {
  for (const format of FORMATS) {
    const context = await browser.newContext({ ...format.context, reducedMotion: "reduce" });
    await context.addInitScript(() => {
      try {
        localStorage.setItem("cookie_consent", "denied");
      } catch {}
    });
    for (const place of places) {
      const page = await context.newPage();
      const problems = [];
      page.on("pageerror", (e) => problems.push(e.message));
      // ?twin=debug starts the engine right away and exposes window.__twin.
      await page.goto(`${base}/hackathon-2026/guide/venue?place=${place}&quality=${quality}&twin=debug#preview-3d`, {
        waitUntil: "domcontentloaded",
        timeout: 180_000,
      });
      await page.waitForFunction(() => typeof window.__twin?.ready === "function", null, { timeout: 300_000 });
      await page.evaluate(() => window.__twin.ready());
      const view = await page.evaluate(
        (place) => window.__twin.views().find((v) => v === `${place}:default`) ?? `${place}:default`,
        place,
      );
      await page.evaluate((v) => {
        window.__twin.goto(v);
        // After goto: a view can switch labels on by itself.
        window.__twin.setLabels(false);
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      }, view);
      await page.evaluate(() => window.__twin.ready());
      await page.evaluate(() => window.__twin.setLabels(false));
      await page.evaluate(async (animated) => {
        const quiet = () => (window.__twin.stats().busy ?? []).every((b) => animated.includes(b));
        for (let ok = 0, t = 0; ok < 3 && t < 240; t++) {
          await new Promise((r) => setTimeout(r, 500));
          ok = quiet() ? ok + 1 : 0;
        }
      }, ANIMATED);
      // Only the rendered scene: hide the controls and cards laid over it.
      await page.addStyleTag({
        content: `[aria-roledescription="3D scene"] ~ * { visibility: hidden !important; } nextjs-portal { display: none !important; }`,
      });
      await page.waitForTimeout(800);
      const errors = await page.evaluate(() => window.__twin.errors().filter((e) => !/assets timed out/.test(e.message)));
      if (problems.length || errors.length)
        console.warn(place + format.suffix, "reported:", [...problems, ...errors.map((e) => JSON.stringify(e))]);
      const stage = page.locator('[aria-roledescription="3D scene"]').first();
      await stage.evaluate((el) => el.scrollIntoView({ block: "center" }));
      const box = await stage.boundingBox();
      const png = path.join(tmpDir, `${place}${format.suffix}.png`);
      await page.screenshot({ path: png, clip: box ?? undefined, timeout: 120_000 });
      console.log("rendered", place + format.suffix);
      await page.close();
    }
    await context.close();
  }

  if (places.includes(OG_PLACE)) {
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
  }
} finally {
  await browser.close();
}

fs.mkdirSync(outDir, { recursive: true });
for (const format of FORMATS) {
  for (const place of places) {
    const src = path.join(tmpDir, `${place}${format.suffix}.png`);
    const dst = path.join(outDir, `${place}${format.suffix}.webp`);
    await sharp(src).resize({ width: format.width }).webp({ quality: 82, effort: 6 }).toFile(dst);
    console.log("wrote", path.relative(process.cwd(), dst));
  }
}
