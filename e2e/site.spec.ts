import { expect, test } from "@playwright/test";
import { acceptNoCookies, horizontalOverflow, watchConsole } from "./helpers";

/**
 * Regression guard for the public SinceAI.ai pages: the Field Guide and its 3D
 * campus must never break or slow down the normal site.
 */
const SITE_ROUTES = [
  "/",
  "/about",
  "/ai-hackathons",
  "/blog",
  "/blog/ai-hackathon-project-ideas",
  "/code-of-conduct",
  "/contact",
  "/europe-ai",
  "/events",
  "/faq",
  "/finland-ai",
  "/for-builders",
  "/hackathon",
  "/impact",
  "/partners",
  "/press",
  "/privacy",
  "/production-support",
  "/projects",
  "/research-to-market",
  "/resources",
  "/stats",
  "/terms",
  "/turku",
] as const;

test.describe("public site", () => {
  for (const route of SITE_ROUTES) {
    test(`${route} — 200, indexable, no console errors, no overflow, no 3D`, async ({ page }) => {
      await acceptNoCookies(page);
      // The "Apply" popup opens after 2 s once a day; it is covered by its own test below.
      await page.addInitScript(() => {
        try {
          localStorage.setItem("hackathon2026_popup_v1", String(Date.now()));
        } catch {}
      });
      const problems = watchConsole(page);
      const origin = new URL(test.info().project.use.baseURL ?? "http://localhost").origin;
      page.on("response", (r) => {
        if (r.status() >= 400 && new URL(r.url()).origin === origin) problems.push(`http ${r.status()} ${r.url()}`);
      });
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      expect(response?.headers()["x-robots-tag"] ?? "").not.toContain("noindex");
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      // three.js and the campus twin load only on the guide, on demand.
      const heavy = await page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .map((e) => e.name)
          .filter((n) => /assets\/guide\/3d|three\.module|\/twin/i.test(n)),
      );
      expect(heavy).toEqual([]);
      expect(problems).toEqual([]);
    });
  }

  test("the Apply popup opens once and closes", async ({ page }) => {
    await acceptNoCookies(page);
    await page.goto("/");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.getByRole("button").last().click();
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await page.waitForTimeout(3000);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("blog Open Graph images render", async ({ request }) => {
    for (const q of ["", "?slug=ai-hackathon-project-ideas"]) {
      const res = await request.get(`/api/og/blog${q}`);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/png");
      expect((await res.body()).byteLength).toBeGreaterThan(5000);
    }
  });

  test("sitemap and robots are served", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("<urlset");
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
  });
});
