import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { acceptNoCookies, COMPANY_IDS, GUIDE, GUIDE_ROUTES, horizontalOverflow, watchConsole } from "./helpers";

test.beforeEach(async ({ page }) => {
  await acceptNoCookies(page);
});

test.describe("routes and indexing", () => {
  for (const route of [...GUIDE_ROUTES, ...COMPANY_IDS.map((id) => `${GUIDE}/challenge-partners/${id}`)]) {
    test(`${route} — 200, noindex, no console errors, no overflow`, async ({ page }) => {
      const problems = watchConsole(page);
      const response = await page.goto(route, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      expect(response?.headers()["x-robots-tag"]).toContain("noindex");
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /nofollow/);
      await expect(page.locator('meta[name="googlebot"]')).toHaveAttribute("content", /noindex/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      // The marketing "Apply" popup never interrupts the guide.
      await page.waitForTimeout(2500);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(problems).toEqual([]);
    });
  }

  test("unknown company pages 404", async ({ page }) => {
    const response = await page.goto(`${GUIDE}/challenge-partners/not-a-company`);
    expect(response?.status()).toBe(404);
  });

  test("sitemap excludes the guide; robots.txt does not block it", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("<urlset");
    expect(sitemap).not.toContain("/hackathon-2026");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).not.toMatch(/Disallow:\s*\/hackathon-2026/);
  });

  test("guide pages are not linked from the public navigation", async ({ page }) => {
    for (const route of ["/", "/hackathon"]) {
      await page.goto(route);
      await expect(page.locator(`header a[href^="${GUIDE}"], footer a[href^="${GUIDE}"]`)).toHaveCount(0);
    }
  });
});

test.describe("content", () => {
  test("hub shows the canonical timeline", async ({ page }) => {
    await page.goto(GUIDE);
    const facts = page.getByRole("definition");
    await expect(facts.filter({ hasText: "Fri 17:00" })).toHaveCount(1);
    await expect(facts.filter({ hasText: "Sun 10:00" })).toHaveCount(1);
    await expect(facts.filter({ hasText: "Sun 13:00" })).toHaveCount(1);
    await expect(facts.filter({ hasText: "Sun 15:00" })).toHaveCount(1);
    const body = await page.locator("main").innerText();
    expect(body).not.toMatch(/72[\s-]*(h\b|hours?)/i);
    expect(body).not.toContain("14:10");
  });

  test("challenge partner guide maps every company", async ({ page }) => {
    await page.goto(`${GUIDE}/challenge-partners`);
    for (const [id, room, qa] of [
      ["meyer-turku", "2030 Evert", "Joki · Floor 1 · Showroom"],
      ["revvity", "1090 Ringsberg", "Joki · Floor 2"],
      ["saarioinen", "2067", "Joki · Floor 3"],
    ]) {
      const row = page.locator(`#company-${id}`);
      await expect(row).toContainText(room);
      await expect(row).toContainText(qa);
    }
    await expect(page.locator('[id^="company-"]')).toHaveCount(15);
  });

  test("company search narrows the list", async ({ page }) => {
    await page.goto(`${GUIDE}/challenge-partners`);
    await page.getByRole("searchbox", { name: "Find your company" }).fill("traficom");
    await expect(page.locator('[id^="company-"]')).toHaveCount(1);
    await expect(page.locator("#company-traficom")).toContainText("1091 Hammarbacka");
  });

  test("partner guide puts Red Hat first and Solita second", async ({ page }) => {
    await page.goto(`${GUIDE}/partners#stands`);
    const stands = page.locator('[id^="stand-bc-"]');
    await expect(stands).toHaveCount(4);
    await expect(page.locator("#stand-bc-1")).toContainText("Stand 1 · most visible");
    await expect(page.locator("#stand-bc-1")).toContainText("Red Hat");
    await expect(page.locator("#stand-bc-2")).toContainText("Solita");
    await expect(page.locator("#stand-bc-3")).toContainText("Visibility / Tech Partner stand");
    await expect(page.locator("#stand-bc-4")).toContainText("Visibility / Tech Partner stand");
  });

  test("company page shows its own room and stand", async ({ page }) => {
    await page.goto(`${GUIDE}/challenge-partners/dna`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("DNA");
    const facts = page.getByRole("definition");
    await expect(facts.filter({ hasText: "2026 Orvokki" })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Briefing room 2026 Orvokki." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Q&A stand: Floor 1 · Showroom." })).toBeVisible();
  });
});

test.describe("venue explorer", () => {
  test("opens full screen, zooms with the keyboard, closes with Escape and returns focus", async ({ page }) => {
    await page.goto(`${GUIDE}/builders#maps`);
    const trigger = page.getByRole("button", { name: /full screen/ }).first();
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const viewport = dialog.getByRole("group", { name: /EduCity floor 1 arrival flow/ });
    await expect(viewport).toBeFocused();
    const stage = viewport.locator("> div").first();
    const before = await stage.evaluate((el) => getComputedStyle(el).transform);
    await page.keyboard.press("+");
    await page.keyboard.press("+");
    await expect.poll(() => stage.evaluate((el) => getComputedStyle(el).transform)).not.toBe(before);
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test("tabs switch floors with arrow keys", async ({ page }) => {
    await page.goto(`${GUIDE}/venue`);
    const tabs = page.locator("#maps").getByRole("tab");
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toBeFocused();
  });

  test("deep link selects the venue's maps", async ({ page }) => {
    await page.goto(`${GUIDE}/venue#maps-joki`);
    await expect(page.locator("#maps").getByRole("tab", { selected: true })).toContainText("Joki");
  });

  test("every map has a text list of locations", async ({ page }) => {
    await page.goto(`${GUIDE}/venue`);
    const locations = page.locator("#locations");
    await expect(locations).toContainText("1001 Dromberg");
    await expect(locations).toContainText("Company Lounge");
    await expect(locations).toContainText("Stand 1");
  });
});

test.describe("3D preview", () => {
  test("loads on demand and flies to a company", async ({ page }) => {
    test.setTimeout(150_000);
    const problems = watchConsole(page);
    await page.goto(`${GUIDE}/venue`);
    await expect(page.locator("canvas")).toHaveCount(0); // nothing loaded until asked
    await page.getByRole("button", { name: "Step inside in 3D" }).click();
    await expect(page.getByRole("button", { name: "Show names" })).toBeVisible({ timeout: 120_000 });
    await expect(page.locator("canvas")).toHaveCount(1);
    await page.getByLabel("Go to").selectOption("elisa");
    await expect(page.getByText("Joki floor 1 · Showroom", { exact: true }).first()).toBeVisible();
    await page.getByRole("tab", { name: "BioCity build hall" }).click();
    await expect(page.getByRole("button", { name: "Show names" })).toBeVisible({ timeout: 120_000 });
    expect(problems).toEqual([]);
  });
});

test.describe("accessibility", () => {
  for (const route of [
    GUIDE,
    `${GUIDE}/builders`,
    `${GUIDE}/challenge-partners`,
    `${GUIDE}/partners`,
    `${GUIDE}/venue`,
  ]) {
    test(`${route} has no serious axe violations`, async ({ page }) => {
      await page.goto(route, { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(
        serious.map(
          (v) =>
            `${v.id}: ${v.nodes
              .map((n) => n.target.join(" "))
              .slice(0, 3)
              .join(" | ")}`,
        ),
      ).toEqual([]);
    });
  }

  test("skip link moves focus to the content", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium");
    await page.goto(`${GUIDE}/judges`);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("reduced motion stops the pulsing highlights", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${GUIDE}/challenge-partners/elisa`);
    const ring = page.locator(".guide-hotspot-pulse").first();
    await expect(ring).toBeAttached();
    expect(await ring.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  });
});

test.describe("resilience", () => {
  test("print view drops the dark background and interactive chrome", async ({ page }) => {
    await page.goto(`${GUIDE}/challenge-partners/elisa`);
    await page.emulateMedia({ media: "print" });
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(255, 255, 255)");
    await expect(page.locator("header.guide-no-print")).toBeHidden();
    await expect(page.locator('nav[aria-label="On this page"]')).toBeHidden();
    await expect(page.getByText("1001 Dromberg").first()).toBeVisible();
  });

  test("critical content works without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(`${GUIDE}/builders`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Builder Guide");
    await expect(page.locator("#schedule-item-sun-submission-deadline")).toContainText("Hard submission deadline");
    await expect(page.getByText("Joukahaisenkatu 7, 20520 Turku").first()).toBeVisible();
    await page.goto(`${GUIDE}/challenge-partners`);
    await expect(page.locator('[id^="company-"]')).toHaveCount(15);
    await context.close();
  });

  test("internal links on the guide resolve", async ({ page, request }) => {
    const seen = new Set<string>();
    for (const route of GUIDE_ROUTES) {
      await page.goto(route);
      const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => (a as HTMLAnchorElement).href));
      for (const href of hrefs) {
        const url = new URL(href);
        if (url.origin !== new URL(page.url()).origin) continue;
        seen.add(url.pathname);
      }
    }
    for (const path of seen) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
    }
    expect(seen.size).toBeGreaterThan(20);
  });
});
