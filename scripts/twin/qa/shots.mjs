#!/usr/bin/env node
// Many campus-twin screenshots from ONE loaded page — the fast way to look at the 3D on a GPU-less server.
//
//   node shots.mjs --spec=shots.json --outdir=/tmp/shots [--base=…] [--size=1280x800] [--mobile] [--quality=high]
//
// shots.json is an array of shots; each one sets any of:
//   { "name": "bio-entrance", "view": "biocity:entrance" | "focus": "elisa" | "camera": [[x,y,z],[tx,ty,tz]],
//     "time": "15:30", "labels": true, "tour": "partners-fri-train-edu", "tourAt": 0.4, "walk": "red-hat",
//     "look": "clear", "full": false, "wait": 800 }
// The page loads once (≈1 min with Mesa lavapipe, see gpu.mjs); each shot then jumps instantly (debug API),
// waits until only the always-animated modules (people, traffic, route pulses) are still drawing, and
// saves <outdir>/<name>.png. Prints one JSON line per shot with stats, module errors and console problems.
import fs from "node:fs";
import path from "node:path";
import { launchGpu } from "./gpu.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, "").split("=");
    return [k, v.length ? v.join("=") : "1"];
  }),
);
const base = args.base ?? process.env.TWIN_BASE ?? "http://localhost:3000";
const [w, h] = (args.size ?? "1280x800").split("x").map(Number);
const mobile = args.mobile === "1";
const outdir = args.outdir ?? "/tmp/twin-shots";
const shots = JSON.parse(fs.readFileSync(args.spec, "utf8"));
fs.mkdirSync(outdir, { recursive: true });

// Modules that draw every frame by design; the view is settled when nothing else asks for frames.
const ANIMATED = new Set((args.animated ?? "people,vehicles,routes,event,traffic").split(","));

const params = new URLSearchParams({ twin: "debug" });
if (args.quality) params.set("quality", args.quality);
if (args.place) params.set("place", args.place);
const url = `${base}/hackathon-2026/guide/venue?${params}#preview-3d`;

const browser = await launchGpu();
try {
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
  let problems = [];
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type()) && !/GPU stall due to ReadPixels/.test(m.text()))
      problems.push(`${m.type()}: ${m.text().slice(0, 300)}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForFunction(() => typeof window.__twin?.ready === "function", null, { timeout: 240_000 });
  await page.evaluate(() => window.__twin.ready());
  console.log(JSON.stringify({ loaded: url, loadMs: Date.now() - t0, problems }));
  problems = [];

  const settle = (maxMs) =>
    page.evaluate(
      async ([maxMs, animated]) => {
        const quiet = () => (window.__twin.stats?.().busy ?? []).every((b) => animated.includes(b));
        const t0 = performance.now();
        let ok = 0;
        while (performance.now() - t0 < maxMs && ok < 3) {
          await new Promise((r) => setTimeout(r, 400));
          ok = quiet() ? ok + 1 : 0;
        }
        return Math.round(performance.now() - t0);
      },
      [maxMs, [...ANIMATED]],
    );

  for (const s of shots) {
    const name = s.name ?? `shot-${shots.indexOf(s)}`;
    await page.evaluate(async (s) => {
      const t = window.__twin;
      if (s.tour === null || (!s.tour && t.stats().mode === "tour")) t.tour?.(null);
      if (s.walk === false || (!s.walk && t.stats().mode === "walk")) t.walk?.(false);
      if (s.look) t.setLook?.(s.look);
      if (s.time) t.setTime(s.time);
      if (s.labels !== undefined) t.setLabels(!!s.labels);
      if (s.view) t.goto(s.view);
      if (s.focus) t.focus(s.focus);
      if (s.walk) t.walk(true, s.walk === true ? undefined : s.walk);
      if (s.tour) {
        t.tour(s.tour, s.tourMode ?? "chase");
        if (s.tourAt !== undefined) t.seekTour(s.tourAt);
      }
      if (s.camera) t.setCamera(s.camera[0], s.camera[1], s.camera[2]);
    }, s);
    await page.waitForTimeout(s.wait ?? 600);
    const settledMs = await settle(Number(args.settle ?? 60_000));
    const stage = page.locator('[aria-roledescription="3D scene"]').first();
    await stage.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const out = path.join(outdir, `${name}.png`);
    if (s.full) await page.screenshot({ path: out, timeout: 120_000 });
    else {
      const box = await stage.boundingBox();
      await page.screenshot({ path: out, clip: box ?? undefined, timeout: 120_000 });
    }
    const stats = await page.evaluate(() => {
      const st = window.__twin.stats();
      return { fps: st.fps, drawCalls: st.drawCalls, triangles: st.triangles, tier: st.tier, mode: st.mode, busy: st.busy, exposure: st.exposure };
    });
    const errors = await page.evaluate(() => window.__twin.errors?.() ?? []);
    console.log(JSON.stringify({ name, out, settledMs, stats, errors, console: problems.slice(0, 10) }));
    problems = [];
  }
} finally {
  await browser.close();
}
