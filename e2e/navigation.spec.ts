import { expect, test } from "@playwright/test";
import { acceptNoCookies, GUIDE } from "./helpers";

/**
 * Finding things: Events is in the main navigation, the two sites are told
 * apart, and the Field Guide says it is an archive — with venue directions
 * that never need the 3D campus.
 */
test.describe("navigation and wayfinding", () => {
  test.beforeEach(async ({ page }) => {
    await acceptNoCookies(page);
  });

  test("Events is in the main navigation and marks the Hackathon 2026 page as its child", async ({ page }) => {
    const mobile = test.info().project.name.includes("mobile");
    await page.goto("/hackathon");

    if (mobile) await page.getByRole("button", { name: "Open menu" }).click();
    const nav = mobile
      ? page.getByRole("navigation", { name: "Mobile navigation" })
      : page.getByRole("navigation", { name: "Main navigation" });
    const events = nav.getByRole("link", { name: "Events", exact: true });
    await expect(events).toHaveAttribute("href", "/events");
    await expect(events).toHaveAttribute("aria-current", "page");
    if (mobile) await expect(nav.getByRole("link", { name: "Hackathon 2026" })).toHaveAttribute("href", "/hackathon");

    await events.click();
    await expect(page).toHaveURL(/\/events$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Events");
  });

  test("the Hackathon 2026 page has a breadcrumb back to Events", async ({ page }) => {
    await page.goto("/hackathon");
    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumbs.getByRole("link", { name: "Events" })).toHaveAttribute("href", "/events");
    await expect(crumbs.locator("[aria-current=page]")).toHaveText("Hackathon 2026");
    const jsonLd = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t));
    const list = jsonLd.find((d) => d["@type"] === "BreadcrumbList");
    expect(list.itemListElement.map((i: { name: string }) => i.name)).toEqual(["Home", "Events", "Since AI Hackathon 2026"]);
  });

  test("the mobile menu opens, traps nothing behind it and closes with Escape", async ({ page }) => {
    test.skip(!test.info().project.name.includes("mobile"), "mobile menu");
    await page.goto("/");
    const opener = page.getByRole("button", { name: "Open menu" });
    await opener.click();
    const menu = page.getByRole("dialog", { name: "Navigation menu" });
    await expect(menu).toBeVisible();
    await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused();
    await expect(menu.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link")).toHaveText([
      "Events",
      "Builders",
      "Partners",
      "About",
      "Contact",
      "Hackathon 2026",
      "Projects",
      "Blog",
      "Impact",
      "FAQ",
    ]);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(opener).toBeFocused();
  });

  test("the site says when to use sinceai.app instead of sinceai.ai", async ({ page }) => {
    await page.goto("/for-builders");
    const sites = page.getByRole("region", { name: "sinceai.ai and sinceai.app" });
    await expect(sites).toContainText("Nothing here needs an account.");
    await expect(sites).toContainText("apply, form a team and submit your project");
    await expect(sites.getByRole("link", { name: /Open sinceai\.app/ })).toHaveAttribute("href", "https://sinceai.app/");

    await page.goto("/faq");
    await expect(page.getByRole("heading", { name: "What is the difference between sinceai.ai and sinceai.app?" })).toBeVisible();
    await expect(page.locator("footer").getByRole("link", { name: /sinceai\.app/ })).toHaveAttribute("href", "https://sinceai.app/");
  });

  test("the keyboard reaches the main navigation and the primary action with a visible focus ring", async ({ page }) => {
    test.skip(test.info().project.name.includes("mobile"), "desktop keyboard");
    await page.goto("/events");
    const seen: string[] = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const style = getComputedStyle(el);
        return { name: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim(), ring: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0 };
      });
      expect(focused.ring, `focus ring on "${focused.name}"`).toBe(true);
      seen.push(focused.name);
    }
    expect(seen[0]).toBe("Since AI — home");
    expect(seen.slice(1, 6)).toEqual(["Events", "Builders", "Partners", "About", "Contact"]);
    expect(seen[6]).toMatch(/^Join Since AI/);
  });
});

test.describe("Field Guide after the event", () => {
  for (const path of ["", "/builders", "/venue", "/challenge-partners/valmet"]) {
    test(`${GUIDE}${path} says it is an archive`, async ({ page }) => {
      await page.goto(`${GUIDE}${path}`);
      const notice = page.getByRole("complementary", { name: "Archive notice" });
      await expect(notice).toBeVisible();
      await expect(notice).toContainText("took place on 6–8 November 2026 and has ended");
      await expect(notice).toContainText("its times, rooms and instructions are no longer current");
      await expect(notice.getByRole("link", { name: "About the event and what is next" })).toHaveAttribute("href", "/hackathon");
      // The notice comes before the page content, so it is read first.
      const before = await page.evaluate(() => {
        const notice = document.querySelector("[data-guide-archive]")!;
        const h1 = document.querySelector("h1")!;
        return Boolean(notice.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING);
      });
      expect(before).toBe(true);
    });
  }

  test("without JavaScript the hub already says the event has ended", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(GUIDE);
    const card = page.locator("section[aria-labelledby='now-next-title']");
    await expect(card).toContainText("Since AI Hackathon 2026 has ended");
    await expect(card).not.toContainText("First up");
    await expect(page.getByRole("complementary", { name: "Archive notice" })).toBeVisible();
    await context.close();
  });

  test("the venue guide gives addresses, the walk and every room as text, with no 3D loaded", async ({ page }) => {
    await page.goto(`${GUIDE}/venue`, { waitUntil: "networkidle" });
    const addresses = page.locator("#venues");
    for (const line of ["Joukahaisenkatu 7", "Tykistökatu 6", "Lemminkäisenkatu 12b"]) await expect(addresses).toContainText(line);
    // Each venue has a directions link (a map search for its street address) and its floor plans.
    await expect(addresses.getByRole("link", { name: /Directions/ })).toHaveCount(3);
    await expect(addresses.getByRole("link", { name: /Floor plans/ })).toHaveCount(3);
    await expect(page.locator("#route")).toContainText(/min/);
    const locations = page.locator("#locations");
    await expect(locations.getByRole("heading", { level: 3 })).toHaveText(["EduCity", "BioCity", "Joki"]);
    expect(await locations.getByRole("listitem").count()).toBeGreaterThan(30);
    // The 3D campus is optional: nothing of it is fetched until someone asks for it.
    const heavy = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map((e) => e.name)
        .filter((n) => /three\.module|campus\.(bin|json)|\/3d\/.*\.(bin|glb|ktx2)/i.test(n)),
    );
    expect(heavy).toEqual([]);
  });
});
