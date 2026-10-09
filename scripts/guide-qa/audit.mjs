// Full static audit of every Field Guide page at several viewports.
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:3100";
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

const G = "/hackathon-2026/guide";
const COMPANIES = ["elisa","bayer","tba","traficom","business-turku","bo-lkv","takomo-golf","forcit-group","lindstrom","saarioinen","valmet","dna","turku-energia","meyer-turku","apetit"];
const NOT_FOUND = `${G}/no-such-page`;
const ROUTES = [G, `${G}/builders`, `${G}/challenge-partners`, `${G}/partners`, `${G}/judges`, `${G}/speakers`, `${G}/venue`, ...COMPANIES.map((c) => `${G}/challenge-partners/${c}`), NOT_FOUND];
const VIEWPORTS = (process.env.VP || "320x568,390x844,768x1024,1280x800,1920x1080").split(",").map((v) => v.split("x").map(Number));
const ONLY = process.env.ONLY ? ROUTES.filter((r) => r.includes(process.env.ONLY)) : ROUTES;

const browser = await chromium.launch();
const findings = [];
const add = (route, vp, kind, detail) => findings.push({ route, vp, kind, detail });

for (const [w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    try { localStorage.setItem("cookie_consent", "denied"); } catch {}
    window.__cls = 0;
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
  });
  for (const route of ONLY) {
    const page = await ctx.newPage();
    const vp = `${w}x${h}`;
    page.on("console", (m) => {
      if (["error", "warning"].includes(m.type()) && !/GPU stall|GL Driver/.test(m.text()) && !(route === NOT_FOUND && /status of 404/.test(m.text()))) add(route, vp, `console-${m.type()}`, m.text().slice(0, 200));
    });
    page.on("pageerror", (e) => add(route, vp, "pageerror", e.message));
    page.on("response", (r) => { if (r.status() >= 400 && !(route === NOT_FOUND && r.url() === BASE + NOT_FOUND)) add(route, vp, "http", `${r.status()} ${r.url()}`); });
    page.on("requestfailed", (r) => { if (!/google|gtag|doubleclick/.test(r.url())) add(route, vp, "requestfailed", `${r.failure()?.errorText} ${r.url()}`); });
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    // Scroll through to load lazy images.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * 0.7) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(400);

    const r = await page.evaluate(() => {
      const out = {};
      out.overflow = document.documentElement.scrollWidth - window.innerWidth;
      // Elements wider than the viewport (visible ones only)
      out.wide = [...document.querySelectorAll("body *")]
        .filter((el) => {
          const b = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return b.width > 0 && b.right > window.innerWidth + 1 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[style*='overflow'], .overflow-x-auto, .overflow-hidden, [class*='overflow-x-auto']");
        })
        .slice(0, 5)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(el.getBoundingClientRect().right)}`);
      out.h1 = document.querySelectorAll("h1").length;
      const hs = [...document.querySelectorAll("main h1, main h2, main h3, main h4, main h5, main h6")].map((h) => +h.tagName[1]);
      out.headingSkips = [];
      for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) out.headingSkips.push(`h${hs[i - 1]}→h${hs[i]}`);
      const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
      out.dupIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
      out.brokenImgs = [...document.images].filter((img) => img.complete && img.naturalWidth === 0 && img.getAttribute("src")).map((img) => img.getAttribute("src"));
      out.imgsNoAlt = [...document.images].filter((img) => !img.hasAttribute("alt")).map((i) => i.src);
      const interactive = [...document.querySelectorAll("a[href], button, select, input, summary, [role=tab]")].filter((el) => {
        const b = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return b.width > 0 && b.height > 0 && cs.visibility !== "hidden" && !el.closest(".sr-only") && !el.classList.contains("sr-only");
      });
      const named = (el) => el.getAttribute("aria-label") || el.textContent?.trim() || el.getAttribute("title") || el.getAttribute("aria-labelledby") || (el.labels && el.labels.length && el.labels[0].textContent.trim());
      out.unnamed = interactive.filter((el) => !named(el)).map((el) => el.outerHTML.slice(0, 120));
      // Small tap targets: not inline text links inside paragraphs.
      out.smallTargets = interactive
        .filter((el) => {
          const b = el.getBoundingClientRect();
          const inline = el.tagName === "A" && el.closest("p, li, dd, figcaption, address") && getComputedStyle(el).display === "inline";
          // Inputs wrapped in a label: the whole label is the target.
          const label = el.labels && el.labels[0];
          const lb = label ? label.getBoundingClientRect() : null;
          if (lb && lb.height >= 44) return false;
          // Breadcrumb links extend their hit area with padding (-my-3 py-3).
          const pad = parseFloat(getComputedStyle(el).paddingTop) + parseFloat(getComputedStyle(el).paddingBottom);
          return !inline && (b.height < 44 || b.width < 24) && window.innerWidth < 800 && !(pad >= 20 && b.height >= 40);
        })
        .slice(0, 12)
        .map((el) => `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
      out.blankTargets = [...document.querySelectorAll("a[target=_blank]")].filter((a) => !/noopener/.test(a.rel)).map((a) => a.href);
      out.cls = window.__cls;
      out.title = document.title;
      out.metaRobots = document.querySelector('meta[name="robots"]')?.content;
      out.textLen = document.body.innerText.length;
      return out;
    });
    if (r.overflow > 0) add(route, vp, "overflow", `${r.overflow}px ${r.wide.join(" | ")}`);
    if (r.h1 !== 1) add(route, vp, "h1-count", r.h1);
    if (r.headingSkips.length) add(route, vp, "heading-skip", r.headingSkips.join(","));
    if (r.dupIds.length) add(route, vp, "dup-ids", r.dupIds.join(","));
    if (r.brokenImgs.length) add(route, vp, "broken-img", r.brokenImgs.join(","));
    if (r.imgsNoAlt.length) add(route, vp, "img-no-alt", r.imgsNoAlt.join(","));
    if (r.unnamed.length) add(route, vp, "unnamed-control", r.unnamed.join(" || "));
    if (r.smallTargets.length) add(route, vp, "small-target", r.smallTargets.join(" | "));
    if (r.blankTargets.length) add(route, vp, "blank-no-noopener", r.blankTargets.join(","));
    if (r.cls > 0.05) add(route, vp, "cls", r.cls.toFixed(3));
    if (!/noindex/.test(r.metaRobots || "")) add(route, vp, "robots", r.metaRobots);

    if (w === 390 || w === 1280) {
      const axe = await new AxeBuilder({ page }).analyze();
      for (const v of axe.violations) {
        add(route, vp, `axe-${v.impact}`, `${v.id}: ${v.help} :: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      }
    }
    const name = route.replace(/\//g, "_") + `-${w}.png`;
    if (process.env.SHOTS !== "0") await page.screenshot({ path: `${OUT}/${name}`, fullPage: true });
    await page.close();
  }
  await ctx.close();
}
await browser.close();

// Summarise: group identical findings across viewports.
const groups = new Map();
for (const f of findings) {
  const key = `${f.kind} :: ${f.detail}`;
  if (!groups.has(key)) groups.set(key, { ...f, where: new Set() });
  groups.get(key).where.add(`${f.route.replace("/hackathon-2026/guide", "") || "/"}@${f.vp}`);
}
const list = [...groups.values()].sort((a, b) => a.kind.localeCompare(b.kind));
for (const g of list) console.log(`[${g.kind}] ${g.detail}\n    at ${[...g.where].slice(0, 8).join(", ")}${g.where.size > 8 ? ` (+${g.where.size - 8})` : ""}`);
console.log(`\nTOTAL distinct findings: ${list.length} (raw ${findings.length}) across ${ONLY.length} routes x ${VIEWPORTS.length} viewports`);
fs.writeFileSync(`${OUT}/findings.json`, JSON.stringify(list.map((g) => ({ ...g, where: [...g.where] })), null, 1));
