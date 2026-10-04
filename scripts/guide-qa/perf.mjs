// Marketing-site performance snapshot: JS/CSS bytes, requests, LCP, CLS, console errors per page.
//   node perf.mjs <base> <out.json> [runs]
import fs from "node:fs";
import { launchGpu } from "../twin/qa/gpu.mjs";
const [, , base = "https://sinceai.ai", out = "perf.json", runsArg = "3"] = process.argv;
const RUNS = Number(runsArg);
const PAGES = ["/", "/hackathon", "/about", "/partners", "/blog", "/contact", "/faq", "/for-builders", "/events", "/projects", "/hackathon-2026/guide"];
const browser = await launchGpu();
const results = {};
try {
  for (const path of PAGES) {
    const runs = [];
    for (let r = 0; r < RUNS; r++) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      await ctx.addInitScript(() => {
        try { localStorage.setItem("cookie_consent", "denied"); } catch {}
        window.__lcp = 0; window.__cls = 0;
        new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true });
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
      page.on("pageerror", (e) => errors.push("pageerror " + e.message.slice(0, 160)));
      let status = 0;
      try {
        const resp = await page.goto(base + path, { waitUntil: "networkidle", timeout: 60000 });
        status = resp?.status() ?? 0;
      } catch (e) { errors.push("goto " + e.message.slice(0, 120)); }
      await page.waitForTimeout(1500);
      const m = await page.evaluate(() => {
        const res = performance.getEntriesByType("resource");
        const sum = (f) => res.filter(f).reduce((s, e) => s + (e.decodedBodySize || 0), 0);
        const nav = performance.getEntriesByType("navigation")[0];
        return {
          js: sum((e) => e.initiatorType === "script" || /\.js(\?|$)/.test(e.name)),
          css: sum((e) => /\.css(\?|$)/.test(e.name)),
          img: sum((e) => e.initiatorType === "img" || /\.(webp|png|jpe?g|avif|svg)(\?|$)/.test(e.name)),
          requests: res.length,
          lcp: Math.round(window.__lcp),
          cls: Math.round(window.__cls * 1000) / 1000,
          domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
          load: Math.round(nav?.loadEventEnd ?? 0),
          three: res.some((e) => /three|twin/i.test(e.name)),
          scripts: res.filter((e) => /\.js(\?|$)/.test(e.name)).map((e) => e.name.replace(/^https?:\/\/[^/]+/, '') + ' ' + e.decodedBodySize).sort(),
        };
      });
      runs.push({ status, errors, ...m });
      await ctx.close();
    }
    const med = (k) => runs.map((x) => x[k]).sort((a, b) => a - b)[Math.floor(runs.length / 2)];
    results[path] = { status: runs[0].status, js: med("js"), css: med("css"), img: med("img"), requests: med("requests"), lcp: med("lcp"), cls: med("cls"), dcl: med("domContentLoaded"), three: runs.some((x) => x.three), scripts: runs[0].scripts, errors: [...new Set(runs.flatMap((x) => x.errors))] };
    console.log(path, JSON.stringify(results[path]));
  }
} finally {
  await browser.close();
}
fs.writeFileSync(out, JSON.stringify({ base, at: new Date().toISOString(), results }, null, 1));
