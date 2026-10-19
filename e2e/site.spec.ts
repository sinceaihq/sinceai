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

  test("merged pages answer with permanent redirects to their canonical page", async ({ request, page }) => {
    for (const [from, to] of [
      ["/stats", "/impact"],
      ["/european-ai", "/europe-ai#open-source"],
    ]) {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status(), from).toBe(308);
      expect(new URL(res.headers()["location"], "http://x").pathname + (to.includes("#") ? "#" + to.split("#")[1] : "")).toBe(to);
    }
    await acceptNoCookies(page);
    await page.addInitScript(() => {
      try {
        localStorage.setItem("hackathon2026_popup_v1", String(Date.now()));
      } catch {}
    });
    await page.goto("/impact");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Impact & numbers");
    await expect(page.getByRole("heading", { name: "Events to date" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "From hackathon to production" })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/72 hours/);
    await page.goto("/european-ai");
    await expect(page).toHaveURL(/\/europe-ai#open-source$/);
    await expect(page.locator("#open-source")).toBeInViewport();
  });

  test("the hackathon page shows the judging panel: two judges, two places to be announced", async ({ page }) => {
    await acceptNoCookies(page);
    await page.addInitScript(() => {
      try {
        localStorage.setItem("hackathon2026_popup_v1", String(Date.now()));
      } catch {}
    });
    await page.goto("/hackathon", { waitUntil: "networkidle" });
    const panel = page.getByRole("region", { name: "Meet the judges." });
    await panel.scrollIntoViewIfNeeded();
    const cards = panel.getByRole("listitem");
    await expect(cards).toHaveCount(4);
    await expect(cards.nth(0)).toContainText("Sarita Runeberg");
    await expect(cards.nth(0)).toContainText("Chief Executive Officer");
    await expect(cards.nth(1)).toContainText("Niko Elers");
    await expect(cards.nth(1)).toContainText("Investment Director");
    await expect(cards.nth(2)).toContainText("Judge to be announced");
    await expect(cards.nth(3)).toContainText("Judge to be announced");
    for (const name of [/Sarita Runeberg/, /Niko Elers/]) {
      const portrait = panel.getByRole("img", { name });
      await expect(portrait).toBeVisible();
      expect(await portrait.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    }
    await expect(panel.getByRole("link", { name: /Voima Ventures/ })).toHaveAttribute("href", "https://voimaventures.com/");
    // On desktop the four cards share one row at the same height.
    if (!test.info().project.name.includes("mobile")) {
      const heights = await cards.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
      expect(new Set(heights).size).toBe(1);
    }
  });

  test("the Hackathon announcement waits for engagement, never blocks the page, and stays closed", async ({ page }) => {
    await acceptNoCookies(page);
    await page.goto("/");
    const card = page.getByRole("complementary", { name: "Since AI Hackathon 2026" });
    // Not on arrival: no modal, no announcement until the visitor engages.
    await page.waitForTimeout(3000);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(card).toHaveCount(0);
    // After scrolling a third of the page it appears, and the page still scrolls.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.5));
    await expect(card).toBeVisible({ timeout: 10_000 });
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
    await expect(card.getByRole("link", { name: "Apply →" })).toHaveAttribute("href", "https://sinceai.app/sign-up");
    await page.keyboard.press("Escape");
    await expect(card).toHaveCount(0);
    await page.reload();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.5));
    await page.waitForTimeout(1500);
    await expect(card).toHaveCount(0);
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

test.describe("hackathon 2026 page", () => {
  test("carries the MLH 2027 Trust Badge, both codes of conduct and the 13 Oct 2026 roster", async ({ page }) => {
    await acceptNoCookies(page);
    await page.addInitScript(() => {
      try {
        localStorage.setItem("hackathon2026_popup_v1", String(Date.now()));
      } catch {}
    });
    await page.goto("/hackathon");
    const badge = page.locator("#mlh-trust-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute("href", /^https:\/\/mlh\.io\/.*2027-season/);
    await expect(badge.locator("img")).toHaveAttribute("src", /trust-badge\/2027\/mlh-trust-badge-2027-white\.svg$/);
    await expect(badge.locator("img")).toHaveAttribute("alt", "Major League Hacking 2027 Hackathon Season");
    // The badge never covers the eyebrow or headline text (it is absolutely positioned in the hero).
    const overlaps = await page.evaluate(() => {
      const b = document.getElementById("mlh-trust-badge")!.getBoundingClientRect();
      const hero = document.getElementById("hackathon-hero")!;
      const texts = [hero.querySelector("h1")!, hero.querySelector("h1")!.previousElementSibling!];
      return texts.flatMap((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return [...range.getClientRects()].filter(
          (r) => r.width > 0 && r.left < b.right && r.right > b.left && r.top < b.bottom && r.bottom > b.top,
        ).length;
      });
    });
    expect(overlaps.reduce((a, n) => a + n, 0)).toBe(0);
    await expect(page.getByRole("link", { name: /MLH Code of Conduct/ })).toHaveAttribute(
      "href",
      "https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md",
    );
    const main = await page.locator("main").innerText();
    expect(main).not.toMatch(/MLH 2026 season|2026 Season Member Event/i);
    for (const name of ["Fonecta", "Lindström", "Business Turku", "Forcit Group"]) expect(main).toContain(name);
    // Former 2026 names appear only in the 2025 edition paragraph.
    const without2025 = main.replace(/The inaugural Since AI Hackathon[\s\S]*?72 hours\./, "");
    for (const name of ["Revvity", "Bo LKV", "Saarioinen", "Sandvik", "Kongsberg"]) expect(without2025).not.toContain(name);
    // The 2026 programme runs Friday 15:00 to Sunday 15:30 — the 72-hour format belongs to 2025 only.
    expect(without2025).not.toMatch(/72[\s-]*(h\b|hours?)/i);
    await expect(page.getByText("To be announced", { exact: true })).toHaveCount(2);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const event = ld.map((t) => JSON.parse(t)).find((d) => d["@type"] === "Event");
    expect(event.sponsor.map((s: { name: string }) => s.name)).toHaveLength(13);
    expect(event.location.map((l: { name: string }) => l.name)).toEqual(["EduCity", "BioCity", "Joki"]);
  });
});
