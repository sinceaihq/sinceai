// Time-dependent states (?now=), first-visit cookie banner, landscape phone.
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:3100";
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const G = "/hackathon-2026/guide";
let fails = 0;
const ok = (name, cond, extra = "") => {
  if (!cond) fails++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
};
const browser = await chromium.launch();

// ── ?now= states ────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem("cookie_consent", "denied"));
  const page = await ctx.newPage();
  const card = () => page.locator('section[aria-labelledby="now-next-title"]');
  const cases = [
    ["/builders", "2026-10-04T12:00", /Starts in 33 days/, /Registration opens/],
    ["/builders", "2026-11-05T14:30", /Starts in 1 day 0 h/, /Registration opens/],
    ["/builders", "2026-11-06T14:20", /Starts in 40 min/, /Registration opens/],
    ["/builders", "2026-11-06T17:10", /Live now/, /Opening ceremony/],
    ["/builders", "2026-11-07T03:00", /Live now/, /Next/],
    ["/builders", "2026-11-08T09:55", /Live now/, /Hard submission deadline/],
    ["/builders", "2026-11-08T15:30", /That's a wrap/, /has ended/],
    ["/challenge-partners/elisa", "2026-11-06T18:40", /Live now/, /Room 1001 Dromberg|Your challenge briefing/],
    ["/challenge-partners/elisa", "2026-11-07T08:35", /Live now/, /Q&A/],
    ["/judges", "2026-11-08T13:10", /Live now/, /Closing ceremony/],
    ["/partners", "2026-11-07T10:00", /Live now/, /Your stand is open at BioCity[\s\S]*All day/],
    ["/partners", "2026-11-08T08:00", /Live now/, /^(?![\s\S]*Your stand is open)/],
    ["/judges", "2026-11-07T10:00", /Live now/, /Nothing scheduled for you right now/],
  ];
  for (const [route, now, head, body] of cases) {
    await page.goto(`${BASE}${G}${route}?now=${now}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(150);
    const text = (await card().innerText()).replace(/\u00a0/g, " ");
    const h = new RegExp(head.source, "i"), b = new RegExp(body.source, "i");
    ok(`now=${now} ${route}: ${head}`, h.test(text) && b.test(text), text.replace(/\s+/g, " ").slice(0, 160));
  }
  await page.goto(`${BASE}${G}/builders?now=2026-11-07T03:00`, { waitUntil: "networkidle" });
  await card().screenshot({ path: `${OUT}/nownext-during.png` });
  // Live region only wraps the rows, never the clock.
  const live = await page.evaluate(() => [...document.querySelectorAll("[aria-live]")].map((e) => e.textContent.slice(0, 60)));
  ok("clock is outside the live region", !live.some((t) => /Turku \d\d:\d\d/.test(t)), JSON.stringify(live));
  await ctx.close();
}

// ── First visit: cookie banner ──────────────────────────────────────────────
for (const [name, opts] of [
  ["phone", devices["Pixel 7"]],
  ["desktop", { viewport: { width: 1440, height: 900 } }],
]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}${G}/challenge-partners/elisa`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const banner = page.getByRole("button", { name: "Decline" });
  ok(`${name}: cookie banner shows on first visit`, await banner.isVisible());
  await page.screenshot({ path: `${OUT}/cookie-${name}.png` });
  // The banner must not cover the H1 or the first fact.
  const overlap = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Decline");
    let el = btn;
    while (el && getComputedStyle(el).position !== "fixed") el = el.parentElement;
    const b = el?.getBoundingClientRect();
    const h1 = document.querySelector("h1").getBoundingClientRect();
    return b ? { bannerTop: Math.round(b.top), h1Bottom: Math.round(h1.bottom), covers: b.top < h1.bottom } : null;
  });
  ok(`${name}: banner does not cover the page title`, overlap && !overlap.covers, JSON.stringify(overlap));
  await banner.click();
  await page.waitForTimeout(300);
  ok(`${name}: banner closes`, !(await banner.isVisible()));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  ok(`${name}: banner stays closed after reload`, !(await page.getByRole("button", { name: "Decline" }).isVisible()));
  await ctx.close();
}

// ── Landscape phone ─────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ ...devices["iPhone 14 landscape"], browserName: undefined });
  await ctx.addInitScript(() => localStorage.setItem("cookie_consent", "denied"));
  const page = await ctx.newPage();
  for (const route of ["", "/builders", "/venue", "/challenge-partners/dna"]) {
    await page.goto(`${BASE}${G}${route}`, { waitUntil: "networkidle" });
    const r = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      header: Math.round(document.querySelector("header").getBoundingClientRect().height),
      h1Visible: document.querySelector("h1").getBoundingClientRect().top < window.innerHeight,
    }));
    ok(`landscape ${route || "/"}: no overflow, header compact, title on first screen`, r.overflow <= 0 && r.header <= 80 && r.h1Visible, JSON.stringify(r));
    await page.screenshot({ path: `${OUT}/landscape${route.replace(/\//g, "_") || "_hub"}.png` });
  }
  await ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} FAILED` : "\nALL PASS");
