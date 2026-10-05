#!/usr/bin/env node
// Screenshot the campus twin on the real GPU (Apple Metal via ANGLE).
//
//   node shot.mjs --place=biocity --view=default --time=15:30 --size=1600x1000 --out=/tmp/x.png
//   node shot.mjs --focus=elisa --out=/tmp/elisa.png
//   node shot.mjs --camera=10,30,40:0,0,0 --only=campus,biocity --out=/tmp/c.png
//   node shot.mjs --tour=car-to-biocity --tourAt=0.4 --out=/tmp/t.png
//
// Options: --base (default $TWIN_BASE or http://localhost:3000), --mobile (Pixel-like 412x915 @2x touch),
// --quality=ultra|high|low, --labels=0|1, --wait=ms (extra settle time), --stats (print stats JSON),
// --full (screenshot the whole stage incl. UI overlays instead of the canvas only), --settle=ms (max wait for the
// engine to settle; default 60 s). Many shots: shots.mjs loads the page once.
import { launchGpu } from "./gpu.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : "1"];
  }),
);
const base = args.base ?? process.env.TWIN_BASE ?? "http://localhost:3000";
const [w, h] = (args.size ?? "1600x1000").split("x").map(Number);
const mobile = args.mobile === "1";

const params = new URLSearchParams({ twin: "debug" });
for (const k of ["place", "view", "time", "focus", "quality", "tour", "walk", "only"]) if (args[k]) params.set(k, args[k]);
const url = `${base}/hackathon-2026/guide/venue?${params}#preview-3d`;

// Memory-safe: waits for one of the machine-wide GPU slots (see gpu.mjs).
const browser = await launchGpu();
const context = await browser.newContext(
  mobile
    ? { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
    : { viewport: { width: w, height: h }, deviceScaleFactor: 1 },
);
await context.addInitScript(() => {
  try {
    localStorage.setItem("cookie_consent", "denied");
  } catch {}
});
const page = await context.newPage();
process.on("unhandledRejection", async (e) => {
  console.error(e);
  await browser.close().catch(() => {});
  process.exit(1);
});
const problems = [];
page.on("console", (m) => {
  if (["error", "warning"].includes(m.type())) problems.push(`${m.type()}: ${m.text().slice(0, 300)}`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

const t0 = Date.now();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
await page.waitForFunction(() => typeof window.__twin?.ready === "function", null, { timeout: 180_000 });
await page.evaluate(() => window.__twin.ready());
const loadMs = Date.now() - t0;

if (args.camera) {
  const [p, t] = args.camera.split(":").map((s) => s.split(",").map(Number));
  await page.evaluate(([p, t]) => window.__twin.setCamera(p, t), [p, t]);
}
if (args.labels !== undefined) await page.evaluate((on) => window.__twin.setLabels?.(on === "1"), args.labels);
if (args.tourAt) await page.evaluate((t) => window.__twin.seekTour?.(Number(t)), args.tourAt);
await page.waitForTimeout(Number(args.wait ?? 1200));
// Software GL renders a frame in a fraction of a second to seconds: wait until only the always-animated modules
// (people, traffic, route pulses) still ask for frames, so the shot shows the settled view rather than the middle
// of a flight or texture swap.
await page.evaluate(async (maxMs) => {
  const animated = ["people", "vehicles", "routes", "event", "traffic"];
  const quiet = () => (window.__twin.stats?.().busy ?? []).every((b) => animated.includes(b));
  const t0 = performance.now();
  let ok = 0;
  while (performance.now() - t0 < maxMs && ok < 3) {
    await new Promise((r) => setTimeout(r, 400));
    ok = quiet() ? ok + 1 : 0;
  }
}, Number(args.settle ?? 60_000));

const out = args.out ?? "/tmp/twin.png";
// page.screenshot with a clip: an element screenshot waits for two equal animation frames, which never comes in
// time on a software-GL server while the engine is still drawing.
if (args.full === "1") await page.screenshot({ path: out, timeout: 120_000 });
else {
  const stage = page.locator('[aria-roledescription="3D scene"]').first();
  await stage.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const box = await stage.boundingBox();
  await page.screenshot({ path: out, clip: box ?? undefined, timeout: 120_000 });
}
const stats = await page.evaluate(() => window.__twin.stats?.());
const errors = await page.evaluate(() => window.__twin.errors?.() ?? []);
console.log(JSON.stringify({ out, url, loadMs, stats, errors, console: problems.slice(0, 20) }, null, 1));
await browser.close();
