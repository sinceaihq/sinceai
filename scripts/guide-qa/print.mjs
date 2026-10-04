// Print a few guide pages to PDF (A4) and render the first pages to PNG for review.
import { chromium } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:3100";
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const G = "/hackathon-2026/guide";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem("cookie_consent", "denied"));
const page = await ctx.newPage();
for (const route of ["/challenge-partners/elisa", "/partners", "/venue", "/builders"]) {
  await page.goto(BASE + G + route, { waitUntil: "networkidle" });
  // Load lazy images before printing.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
  const name = route.replace(/\//g, "_");
  await page.pdf({ path: `${OUT}/${name}.pdf`, format: "A4", printBackground: true });
  console.log(name, fs.statSync(`${OUT}/${name}.pdf`).size);
}
await browser.close();
