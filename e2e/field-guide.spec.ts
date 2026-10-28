import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
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

  test("unknown guide URLs show the guide's own 404", async ({ page }) => {
    for (const path of [`${GUIDE}/challenge-partners/not-a-company`, `${GUIDE}/no-such-page`, `${GUIDE}/builders/extra`]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page isn't in the guide.");
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
      await expect(page.getByRole("link", { name: /Field Guide home/ }).first()).toBeVisible();
    }
  });

  test("the bare event path leads to the hub", async ({ page }) => {
    await page.goto("/hackathon-2026");
    await expect(page).toHaveURL(new RegExp(`${GUIDE}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Field Guide");
  });

  test("calendar files per guide and per company", async ({ request }) => {
    const builders = await request.get(`${GUIDE}/calendar/builders`);
    expect(builders.status()).toBe(200);
    expect(builders.headers()["content-type"]).toContain("text/calendar");
    expect(builders.headers()["content-disposition"]).toContain("since-ai-hackathon-2026-builders.ics");
    expect(builders.headers()["x-robots-tag"]).toContain("noindex");
    expect(await builders.text()).toContain("BEGIN:VCALENDAR");

    const elisa = await request.get(`${GUIDE}/calendar/challenge-partners/elisa`);
    expect(elisa.status()).toBe(200);
    expect(elisa.headers()["content-disposition"]).toContain("since-ai-hackathon-2026-elisa.ics");
    expect((await elisa.text()).replace(/\r\n /g, "")).toContain("Room 1001 Dromberg · floor 1");

    for (const path of ["calendar/nope", "calendar/builders/elisa", "calendar/challenge-partners/nope"]) {
      expect((await request.get(`${GUIDE}/${path}`)).status(), path).toBe(404);
    }
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
    await expect(facts.filter({ hasText: "Sun 13:15" })).toHaveCount(1);
    await expect(facts.filter({ hasText: "Sun 14:00" })).toHaveCount(1);
    await expect(facts.filter({ hasText: "ends around 15:30" })).toHaveCount(1);
    const body = await page.locator("main").innerText();
    expect(body).not.toMatch(/72[\s-]*(h\b|hours?)/i);
    expect(body).not.toContain("14:10");
  });

  test("challenge partner guide maps every company", async ({ page }) => {
    await page.goto(`${GUIDE}/challenge-partners`);
    for (const [id, room, qa] of [
      ["meyer-turku", "2030 Evert", "Joki · Floor 1 · Showroom"],
      ["europress", "1090 Ringsberg", "Joki · Floor 2"],
      ["fonecta", "2001 Elias", "Joki · Floor 3"],
      ["tba-2", "2067", "Joki · Floor 3"],
      ["turku-energia", "3006", "Joki · Floor 1 · Showroom"],
      ["business-turku", "3027", "Joki · Floor 3"],
    ]) {
      const row = page.locator(`#company-${id}`);
      await expect(row).toContainText(room);
      await expect(row).toContainText(qa);
    }
    await expect(page.locator('[id^="company-"]')).toHaveCount(15);
    const text = await page.locator("main").innerText();
    for (const name of ["Revvity", "Bo LKV", "Saarioinen", "Sandvik", "Kongsberg", "Neuropress"]) expect(text).not.toContain(name);
    // FORCIT Group runs its own NDA: the label is visible before teams choose, on every viewport.
    await expect(page.locator("#company-forcit-group").getByText("NDA required")).toBeVisible();
    await expect(page.getByText("NDA required", { exact: true })).toHaveCount(1);
    // The label explains itself to touch, keyboard and screen-reader users, not only in a hover title.
    const nda = page.locator("#company-forcit-group").getByRole("link", { name: /NDA required.*paper NDA/ });
    await expect(nda).toHaveAttribute("href", `${GUIDE}/resources#confidential`);
    await expect(page.locator("#selection [data-challenge-prizes]")).toContainText("€2,000 · €750 · €250");
    await expect(page.locator("#selection [data-challenge-prizes]")).toContainText("€3,000 · €1,500 · €500");
    await expect(page.locator("main")).not.toContainText("same cash prize");
  });

  test("Europress company page: official link, room 1090 Ringsberg on floor 1", async ({ page }) => {
    await page.goto(`${GUIDE}/challenge-partners/europress`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Europress");
    await expect(page.getByRole("link", { name: /europressgroup\.com/ })).toHaveAttribute("href", "https://europressgroup.com/");
    await expect(page.locator("main")).toContainText("1090 Ringsberg");
    await expect(page.locator("main")).toContainText("EduCity · floor 1");
  });

  test("company search narrows the list", async ({ page }) => {
    await page.goto(`${GUIDE}/challenge-partners`);
    await page.getByRole("searchbox", { name: "Find your company" }).fill("traficom");
    await expect(page.locator('[id^="company-"]')).toHaveCount(1);
    await expect(page.locator("#company-traficom")).toContainText("1091 Hammarbacka");
  });

  test("partner guide groups the six stand positions in the partner corner, with no Red Hat booth", async ({ page }) => {
    await page.goto(`${GUIDE}/partners#stands`);
    const stands = page.locator('[id^="stand-bc-"]');
    await expect(stands).toHaveCount(6);
    await expect(page.locator("#stand-bc-1")).toContainText("Stand 1 · most visible");
    await expect(page.locator("#stands")).not.toContainText("Red Hat");
    const names = ["Visibility / Tech Partner stand", "Solita", "Pruna AI", "BearingPoint", "CSC / LUMI AI Factory", "Major League Hacking"];
    for (const [i, name] of names.entries()) await expect(page.locator(`#stand-bc-${i + 1}`)).toContainText(name);
    await expect(page.locator("#stand-bc-6")).toContainText("confirmed separately");
    for (let i = 1; i <= 6; i++) await expect(page.locator(`#stand-bc-${i}`)).toContainText("partner corner");
  });

  test("builder guide shows the final team formation map with routes A and B as text", async ({ page }) => {
    await page.goto(`${GUIDE}/builders#team-formation`);
    const section = page.locator("#team-formation");
    await expect(section.locator("#route-a")).toContainText("I already have a team");
    await expect(section.locator("#route-a")).toContainText("directly to Team Check on the left");
    await expect(section.locator("#route-b")).toContainText("I don't have a team yet");
    await expect(section.locator("#route-b")).toContainText("return your skill card");
    const cards = section.getByRole("list", { name: "Skill-card colours" });
    await expect(cards).toContainText("Red — AI & Data");
    await expect(cards).toContainText("Yellow — Software & Development");
    await expect(cards).toContainText("Green — Business & Design");
    await expect(section).toContainText("not the building’s emergency exit plan");
    await expect(section.locator('img[src*="educity-team-formation"]').first()).toHaveAttribute("alt", /route A .* route B/i);
    // The Now / Next card shows the current Turku time, which can be any of these.
    const body = (await page.locator("main").innerText()).replace(/Turku \d{2}:\d{2}/gi, "");
    // 16:50 is never the retired capacity split; the MLH introduction is 16:45–16:55 (28 Oct 2026).
    expect(body).not.toMatch(/17:45|17:50|18:05|16:50[^\n]{0,60}(capacity|split|places)|before 17:00|18:15–18:45|open places|zones? 1/);
    expect(body).toContain("Team formation closes at 16:45");
    expect(body).toContain("15:00–17:30");
    expect(body).toContain("18:50–19:30");
  });

  test("builder guide states the challenge rules and lists every briefing room", async ({ page }) => {
    await page.goto(`${GUIDE}/builders#rules`);
    const prizes = page.locator("#rules [data-challenge-prizes]");
    await expect(prizes).toContainText("All other company challenges");
    await expect(prizes).toContainText("€2,000 · €750 · €250");
    await expect(prizes).toContainText("FORCIT Group — Drill and Blast Cycle Intelligence (€5,000 prize pot)");
    await expect(prizes).not.toContainText("To be confirmed in writing");
    await expect(page.locator("#rules")).toContainText("Mark team as ready");
    await expect(page.locator("#rules")).toContainText("Thu 5 Nov · 15:00");
    await expect(page.locator("#rules")).toContainText("Full challenge in the app");
    const rooms = page.locator("#briefing-rooms [data-briefing-room]");
    await expect(rooms).toHaveCount(15);
    await expect(page.locator('#briefing-rooms [data-briefing-room="europress"]')).toContainText("1090 Ringsberg");
    await expect(page.locator('#briefing-rooms [data-briefing-room="turku-energia"]')).toContainText("3006");
    await expect(page.locator('#briefing-rooms [data-briefing-room="business-turku"]')).toContainText("3027");
    await expect(page.locator('#briefing-rooms [data-briefing-room="tba-2"]')).toContainText("Held for a partner to be announced");
    await expect(page.locator('#briefing-rooms [data-briefing-room="forcit-group"]')).toContainText("NDA required");
    // The floor link selects that floor's map.
    await page.locator('#briefing-rooms [data-briefing-room="business-turku"]').getByRole("link", { name: /3/ }).click();
    await expect(page.locator("#briefing-rooms").getByRole("tab", { selected: true })).toContainText("Floor 3");
  });

  test("partner Discord onboarding: challenge partners vs tech / visibility partners", async ({ page }) => {
    await page.goto(`${GUIDE}/challenge-partners#discord`);
    const cp = page.locator("#discord");
    await expect(cp.getByRole("link", { name: /Join the Since AI Discord/ })).toHaveAttribute("href", "https://discord.gg/vMWdrVUPws");
    await expect(cp).toContainText("Your challenge channel");
    await expect(cp).toContainText("Anna | Valmet");
    await page.goto(`${GUIDE}/challenge-partners/elisa#discord`);
    await expect(page.locator("#discord")).toContainText("Anna | Elisa");
    await page.goto(`${GUIDE}/partners#discord`);
    const tech = page.locator("#discord");
    await expect(tech.getByRole("link", { name: /Join the Since AI Discord/ })).toHaveAttribute("href", "https://discord.gg/vMWdrVUPws");
    await expect(tech).toContainText("Your partner channel");
    await expect(tech).not.toContainText(/challenge channel|judg/i);
    await tech.getByRole("link", { name: /step-by-step Discord Guide/ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/discord#setup$`));
    await expect(page.locator("#setup-title")).toBeInViewport();
  });

  test("Discord Guide: six illustrated steps, notifications, phone and troubleshooting", async ({ page }) => {
    await page.goto(`${GUIDE}/discord`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Discord Guide");
    const steps = page.locator("#setup ol > li");
    await expect(steps).toHaveCount(6);
    for (let i = 0; i < 6; i++) {
      await expect(steps.nth(i).getByRole("img")).toBeVisible();
      await expect(steps.nth(i)).toContainText(`Step ${i + 1} of 6`);
    }
    await expect(page.locator("#notifications")).toContainText("All Messages");
    await expect(page.locator("#phone").getByRole("img")).toBeVisible();
    await page.locator("#problems").getByText("I can't type in a channel").click();
    await expect(page.locator("#problems")).toContainText("at least five minutes old");
    // The illustrations scale with the page and never push it sideways.
    const widest = await page.locator('#setup [role="img"]').evaluateAll((els) =>
      Math.max(...els.map((e) => e.getBoundingClientRect().right)),
    );
    expect(widest).toBeLessThanOrEqual(await page.evaluate(() => document.documentElement.clientWidth));
    await page.goto(GUIDE);
    await page.getByRole("link", { name: /Discord Guide/ }).first().click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/discord$`));
  });

  test("accommodation: the five confirmed offers on every partner and builder page", async ({ page }) => {
    for (const path of [GUIDE, `${GUIDE}/builders`, `${GUIDE}/challenge-partners`, `${GUIDE}/partners`, `${GUIDE}/challenge-partners/elisa`]) {
      await page.goto(`${path}#accommodation`);
      const acc = page.locator("#accommodation");
      await expect(acc.locator("[data-offer]")).toHaveCount(5);
      await expect(acc).toContainText("SINCEAI2026");
      await expect(acc.locator('[data-offer="bob-w"]')).toContainText("BOBWSINCEAI26");
      await expect(acc).not.toContainText(/Centro/);
      await expect(acc.getByRole("link", { name: /View discounted Scandic rates/ })).toHaveAttribute(
        "href",
        "https://www.scandichotels.com/fi?bookingCode=CGRO",
      );
      await expect(acc.locator('[data-offer="scandic-turku"]')).not.toContainText("%");
    }
    // After the Sokos deadline the rate is marked ended, never offered.
    await page.goto(`${GUIDE}/partners?now=2026-10-06T17:00#accommodation`);
    const sokos = page.locator('[data-offer="sokos-kupittaa"]');
    await expect(sokos).toContainText("Ended");
    await expect(sokos).not.toContainText("BSINCEAI");
  });

  test("company page shows its own room and stand", async ({ page }) => {
    await page.goto(`${GUIDE}/challenge-partners/dna`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("DNA");
    const facts = page.getByRole("definition");
    await expect(facts.filter({ hasText: "2026 Orvokki" })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Briefing room 2026 Orvokki." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Q&A stand: Floor 1 · Showroom." })).toBeVisible();
  });

  test("company schedule and calendar are personalised", async ({ page }) => {
    await page.goto(`${GUIDE}/challenge-partners/fonecta`);
    const schedule = page.locator("#schedule");
    await expect(schedule).toContainText("Room 2001 Elias · floor 2");
    await expect(schedule).toContainText("Your stand · Floor 3");
    await expect(schedule).toContainText("floor 3 of the Joki tower");
    await expect(schedule).not.toContainText("Your place");
    const calendar = page.getByRole("link", { name: /Add to calendar/ }).first();
    await expect(calendar).toHaveAttribute("href", `${GUIDE}/calendar/challenge-partners/fonecta`);
    await expect(calendar).toHaveAttribute("download", "since-ai-hackathon-2026-fonecta.ics");
  });

  test("parking: five car parks with official terms, directions and the 3D link", async ({ page }) => {
    await page.goto(`${GUIDE}/venue#parking`);
    const parking = page.locator("#parking");
    await expect(parking.locator("[data-parking]")).toHaveCount(5);
    const pc = parking.locator("#parking-parkcity");
    await expect(pc).toContainText("Entry daily 06:00–00:00 · exit 24 h");
    await expect(pc).toContainText("€1.60 per started 30 min · Maximum €15 per 24 h");
    await expect(pc).toContainText("service fee");
    await expect(pc.getByRole("link", { name: /Driving directions to ParkCity/ })).toHaveAttribute("href", /destination=60\.449441%2C22\.297308/);
    await expect(parking.locator("#parking-p-station-kupittaa")).toContainText("Entry and exit 24/7");
    await expect(parking).toContainText("Free parking may be available on certain public streets");
    await expect(parking).toContainText("P-Intelligate (Joukahaisenkatu 6) is for Original Sokos Hotel Kupittaa guests");
    await pc.getByRole("link", { name: /Show in 3D/ }).click();
    // Consent Mode's url_passthrough may add its _gl parameter to the link; the 3D reads ?focus either way.
    await expect(page).toHaveURL(/\/venue\?focus=parkcity(&[^#]*)?#preview-3d$/);
    await page.goto(GUIDE);
    await expect(page.locator("#parking [data-parking]")).toHaveCount(2);
  });

  test("venue photos are credited", async ({ page }) => {
    await page.goto(`${GUIDE}/venue#photos`);
    const figures = page.locator("#photos figure");
    await expect(figures).toHaveCount(6);
    for (const credit of ["Vesa Loikas", "Turun Teknologiakiinteistöt Oy"]) {
      await expect(page.locator("#photos figcaption").filter({ hasText: credit }).first()).toBeVisible();
    }
    const footer = page.locator("footer");
    await expect(footer).toContainText("Vesa Loikas");
    await expect(footer).toContainText("Turun Teknologiakiinteistöt Oy");
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    const photos = jsonLd.find((t) => t.includes("ImageObject") && t.includes("contentUrl"));
    expect(photos).toBeDefined();
    expect(photos).toContain("creditText");
    expect(photos).toContain("copyrightHolder");
  });

  test("food: the official menu, both breakfasts to be announced and the special-diet notice", async ({ page }) => {
    await page.goto(`${GUIDE}/venue#food`);
    const food = page.locator("#food");
    await expect(food.getByRole("heading", { level: 2 })).toHaveText("Meals at Restaurant Mauno.");
    const notice = food.getByRole("complementary", { name: "Special diets and allergies" });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("collect it directly from Restaurant Mauno's open kitchen");
    await expect(notice).toContainText("always ask the restaurant staff before eating");
    await expect(notice).toContainText("Friday 30 October 2026");

    const card = (id: string) => food.locator(`#meal-${id}`);
    await expect(food.locator("[data-meal]")).toHaveCount(6);
    await expect(card("fri-dinner")).toContainText("18:30–22:00");
    await expect(card("fri-dinner")).toContainText("Chicken pasta bake");
    await expect(card("sat-lunch")).toContainText("10:30–13:30");
    await expect(card("sat-lunch")).toContainText("Macaroni casserole");
    await expect(card("sat-lunch")).not.toContainText(/vegetarian|vegan|gluten-free/i);
    await expect(card("sat-dinner")).toContainText("17:00–20:00");
    await expect(card("sat-dinner")).toContainText("Kebab and potato casserole");
    await expect(card("sun-lunch")).toContainText("10:00–13:00");
    await expect(card("sun-lunch")).toContainText("Chicken tikka masala with rice");
    await expect(card("sun-lunch")).toContainText("Mango quark dessert");
    for (const id of ["sat-breakfast", "sun-breakfast"]) {
      await expect(card(id)).toContainText("~07:00");
      await expect(card(id)).toContainText("Menu coming soon");
    }
    await expect(food).toContainText("Tykistökatu 6, 20520 Turku, Finland");

    await page.goto(GUIDE);
    await expect(page.locator("#food [data-meal]")).toHaveCount(6);
    await page.locator("#food").getByRole("link", { name: /Full menu/ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/venue#food$`));
    await expect(page.locator("#food-title")).toBeInViewport();
  });
});

test.describe("CSC / LUMI computing resources", () => {
  // A fixed moment before CSC's deadline (Fri 30 Oct 2026), so the test does not change with the calendar.
  const BEFORE = "now=2026-10-26T12:00";

  test("the hub shows the section, its nav chip and the hero callout", async ({ page }) => {
    await page.goto(`${GUIDE}?${BEFORE}`);
    const section = page.locator("#ai-resources");
    await expect(section.getByRole("heading", { level: 2 })).toHaveText("CSC / LUMI AI Factory computing resources.");
    await expect(section.locator('[data-computing-status="open"]')).toContainText("Friday 30 October 2026");
    await expect(section).toContainText("Optional");
    await expect(section).toContainText("Horizon Europe-associated country");
    await expect(section).toContainText("SUPERCOMPUTER");
    await expect(section.getByRole("link", { name: "info@sinceai.fi" })).toHaveAttribute("href", "mailto:info@sinceai.fi");
    // Right after the role guides.
    const order = await page.$$eval("main section[id]", (els) => els.map((e) => e.id));
    expect(order.indexOf("ai-resources")).toBe(order.indexOf("guides") + 1);

    const nav = page.getByRole("navigation", { name: "On this page" });
    await nav.getByRole("link", { name: "AI resources" }).click();
    await expect(page).toHaveURL(/#ai-resources$/);
    await expect(page.locator("#ai-resources-title")).toBeInViewport();

    await page.goto(`${GUIDE}?${BEFORE}`);
    await page.getByRole("link", { name: /Register by Fri 30 Oct/ }).click();
    await expect(page).toHaveURL(new RegExp(`\\?${BEFORE}#ai-resources$`));
    await expect(page.locator("#ai-resources-title")).toBeInViewport();
  });

  test("the builder guide links to the hub section from its hero and its checklist", async ({ page }) => {
    await page.goto(`${GUIDE}/builders?${BEFORE}`);
    await expect(page.locator("#bring")).toContainText("CSC / LUMI computing");
    await expect(page.locator("#bring").getByRole("link", { name: "AI resources in the Field Guide" })).toHaveAttribute(
      "href",
      `${GUIDE}#ai-resources`,
    );
    await page.getByRole("link", { name: /Register by Fri 30 Oct/ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}#ai-resources$`));
    await expect(page.locator("#ai-resources-title")).toBeInViewport();
  });

  test("after the deadline the section says registration has closed and the callout is gone", async ({ page }) => {
    await page.goto(`${GUIDE}?now=2026-10-31T09:00`);
    await expect(page.locator('#ai-resources [data-computing-status="closed"]')).toContainText("Registration closed");
    await expect(page.getByRole("link", { name: /Register by Fri 30 Oct/ })).toHaveCount(0);
  });

  test("every in-page nav anchor on the hub and the builder guide has its section", async ({ page }) => {
    for (const route of [GUIDE, `${GUIDE}/builders`]) {
      await page.goto(route);
      const ids = await page
        .getByRole("navigation", { name: "On this page" })
        .getByRole("link")
        .evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).hash.slice(1)));
      expect(ids.length).toBeGreaterThan(5);
      for (const id of ids) await expect(page.locator(`[id="${id}"]`), `${route}#${id}`).toHaveCount(1);
    }
  });

  test("no private joining details in the served HTML or JavaScript", async ({ page, request }) => {
    const patterns = [
      /\bmy\.csc\.fi\b/i,
      /\bproject_\d{5,}\b/i,
      /https?:\/\/[^\s"'`)<>]*(?:[?&](?:invite|invitation|invitation_?code|invite_?code|token|join)=|\/(?:invite|invitations?|join)\/[\w-]{6,})/i,
    ];
    const scripts = new Set<string>();
    for (const route of [GUIDE, `${GUIDE}/builders`]) {
      const html = await (await request.get(route)).text();
      for (const p of patterns) expect(p.test(html), `${route} ${p}`).toBe(false);
      await page.goto(route);
      for (const src of await page.$$eval("script[src]", (els) => els.map((e) => (e as HTMLScriptElement).src))) scripts.add(src);
    }
    expect(scripts.size).toBeGreaterThan(0);
    for (const src of scripts) {
      if (new URL(src).origin !== new URL(page.url()).origin) continue;
      const js = await (await request.get(src)).text();
      for (const p of patterns) expect(p.test(js), `${src} ${p}`).toBe(false);
    }
  });
});

test.describe("Build & submit (builder guide)", () => {
  test("the nav chip leads to the AI policy and the submission guide, visible without expanding anything", async ({ page }) => {
    await page.goto(`${GUIDE}/builders`);
    await page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "Build & submit" }).click();
    await expect(page).toHaveURL(/#building$/);
    await expect(page.locator("#building-title")).toBeInViewport();
    const section = page.locator("#building");
    await expect(section.getByRole("heading", { name: "Build with AI. We encourage it." })).toBeVisible();
    const submit = section.locator("#submit");
    await expect(submit.getByText("Sunday 8 November, 10:00 EET")).toBeVisible();
    await expect(submit).toContainText("not Devpost");
    await expect(submit.locator('[data-file-kind="Demo video"]')).toContainText("MP4, WebM");
    await expect(submit).toContainText("ZIP archives are not accepted");
    // Under the steps: one line to the optional awards; the form's MLH prize categories and public summary say where to look.
    await expect(submit.locator("[data-submit-awards]").getByRole("link")).toHaveAttribute("href", `${GUIDE}/resources#awards`);
    await expect(submit).toContainText("Tick the MLH categories that fit here");
    await expect(submit).toContainText("For confidential challenges");
  });

  test("FAQ answers open, and their links point to the right places", async ({ page }) => {
    await page.goto(`${GUIDE}/builders#building`);
    const q = page.getByText("Can we use ChatGPT, Claude, Cursor, GitHub Copilot, Gemini, Lovable and other AI tools?");
    await q.click();
    await expect(page.locator("#building details[open]")).toContainText("permitted and encouraged");
    await page.getByText("Is there Wi-Fi? Can we use Linux?").click();
    const wifi = page.locator("details[open]").filter({ hasText: "TUAS Guest" });
    await expect(wifi.getByRole("link", { name: "Wi-Fi instructions" })).toHaveAttribute("href", "#wifi");
    await expect(page.locator("#wifi").getByRole("link", { name: /Turku UAS visitor Wi-Fi/ })).toHaveAttribute(
      "href",
      "https://www.turkuamk.fi/en/about-us/campuses/",
    );
    await page.getByText("Can we use CSC / LUMI computing?").click();
    await page.getByRole("link", { name: "AI resources in the Field Guide" }).first().click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}#ai-resources$`));
    await expect(page.locator("#ai-resources-title")).toBeInViewport();
  });

  test("the hub links builders to the section", async ({ page }) => {
    await page.goto(GUIDE);
    await page.locator("#guides").getByRole("link", { name: /Build with AI\. Submit in sinceai\.app\./ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/builders#building$`));
    await expect(page.locator("#building-title")).toBeInViewport();
  });
});

test.describe("Builder Resources", () => {
  test("partner resources by category, with benefits, access, help and original-source links", async ({ page }) => {
    await page.goto(`${GUIDE}/resources`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Builder Resources");
    await expect(page.locator("[data-resources-intro]")).toContainText("official Since AI participant messages and designated event channels");
    for (const [section, ids] of [
      ["computing", ["csc-lumi", "red-hat", "aiven"]],
      ["models", ["pruna-ai", "featherless", "elevenlabs"]],
      ["building", ["lovable", "n8n"]],
      ["standards", ["fiware"]],
    ] as const) {
      const cards = page.locator(`#${section} [data-resource]`);
      expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-resource")))).toEqual([...ids]);
    }
    await expect(page.locator('[data-resource="lovable"]')).toContainText("100 Lovable credits per participant");
    await expect(page.locator('[data-resource="n8n"]')).toContainText("limited to 200 redemptions");
    await expect(page.locator('[data-resource="featherless"]')).toContainText("never on this website");
    await expect(page.locator('[data-resource="red-hat"]')).toContainText("free for 30 days");
    await expect(page.locator('[data-resource="fiware"]').getByRole("link", { name: "FIWARE builder resources" })).toHaveAttribute("href", "#fiware");
    // The cards name their award, link to its own card and give the prize in a few words; the terms live in the awards section.
    await expect(page.locator('[data-resource="fiware"]').getByRole("link", { name: "FIWARE Open Innovation Award" })).toHaveAttribute(
      "href",
      `${GUIDE}/resources#award-fiware-open-innovation`,
    );
    await expect(page.locator('[data-resource="fiware"] [data-award-short]')).toHaveText("· non-cash package");
    await expect(page.locator('[data-resource="red-hat"]').getByRole("link", { name: "Red Hat OpenShift AI Technology Award" })).toHaveAttribute(
      "href",
      `${GUIDE}/resources#award-red-hat-openshift-ai`,
    );
    await expect(page.locator('[data-resource="red-hat"] [data-award-short]')).toHaveText("· €1,000");
    await expect(page.locator('[data-resource="red-hat"]')).not.toContainText(/booth/i);
    await expect(page.locator("main")).not.toContainText(/Google Cloud credit|Activation pending|exclusive/i);
    const cards = page.locator("[data-resource]");
    for (const card of await cards.all()) {
      for (const link of await card.getByRole("link").all()) {
        const href = (await link.getAttribute("href"))!;
        if (href.startsWith("/") || href.startsWith("#")) continue;
        expect(href).toMatch(/^https:\/\//);
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      }
    }
    await expect(page.locator('[data-resource="csc-lumi"]').getByRole("link", { name: "Eligibility and deadline" })).toHaveAttribute(
      "href",
      `${GUIDE}#ai-resources`,
    );
    await expect(page.locator("[data-tool]")).toHaveCount(6);
    await expect(page.locator("[data-stand-partner]")).toHaveCount(5);
    await expect(page.locator('[data-stand-partner="red-hat"]')).toHaveCount(0);
    await expect(page.locator("[data-mlh-note]")).toContainText("2027 Season Member Event");
    // Logos load.
    for (const img of await page.locator("[data-resource] img").all()) {
      await img.scrollIntoViewIfNeeded();
      expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
  });

  test("optional awards: how to enter, Red Hat, FIWARE and the seven MLH categories", async ({ page }) => {
    await page.goto(`${GUIDE}/resources`);
    // At a glance: the six things a new builder looks for, each an in-page link.
    const glance = page.getByRole("navigation", { name: "This page at a glance" });
    await expect(glance.getByRole("link")).toHaveCount(6);
    await glance.getByRole("link", { name: /Optional awards/ }).click();
    await expect(page).toHaveURL(/#awards$/);
    await expect(page.locator("#awards-title")).toBeInViewport();
    await expect(page.locator("main")).not.toContainText(/extra prizes/i);
    // The heading lands below the sticky header and section nav, never under them.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const bars = [...document.querySelectorAll("header, nav")].filter((e) => getComputedStyle(e).position === "sticky");
          const bottom = Math.max(0, ...bars.map((e) => e.getBoundingClientRect().bottom));
          return document.getElementById("awards")!.getBoundingClientRect().top - bottom;
        }),
      )
      .toBeGreaterThanOrEqual(0);
    // At a glance: MLH, Red Hat and FIWARE side by side, each linking to its own card.
    const rows = page.locator("[data-awards-glance-row]");
    await expect(rows).toHaveCount(3);
    for (const [id, href] of [
      ["mlh", "#mlh-awards"],
      ["red-hat-openshift-ai", "#award-red-hat-openshift-ai"],
      ["fiware-open-innovation", "#award-fiware-open-innovation"],
    ] as const) {
      await expect(page.locator(`[data-awards-glance-row="${id}"] a`)).toHaveAttribute("href", href);
      await expect(page.locator(href)).toHaveCount(1);
    }
    await expect(page.locator('[data-awards-glance-row="fiware-open-innovation"]')).toContainText("announced at the closing ceremony");
    const glanceBox = await page.locator("[data-awards-glance]").boundingBox();
    expect(glanceBox!.x + glanceBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await expect(page.locator("[data-how-to-enter] li")).toHaveCount(3);
    await expect(page.locator("[data-how-to-enter]")).toContainText("never an API key");
    const redHat = page.locator('[data-award="red-hat-openshift-ai"]');
    await expect(redHat.getByRole("heading", { level: 4 })).toHaveText("Red Hat OpenShift AI Technology Award");
    await expect(redHat.locator("[data-award-prize]")).toHaveText("€1,000, subject to the partnership terms.");
    await expect(redHat.getByRole("table")).toContainText("OpenShift AI use");
    await expect(redHat).toContainText("35%");
    const fiware = page.locator('[data-award="fiware-open-innovation"]');
    await expect(fiware.getByRole("heading", { level: 4 })).toHaveText("FIWARE Open Innovation Award");
    await expect(fiware).toContainText("travel and accommodation are not included");
    await expect(fiware).toContainText("sole evaluator");
    await expect(fiware.locator("[data-fiware-benefits] li")).toHaveCount(5);
    // The prize package and conditions sit behind native disclosures, closed by default; prize and criteria stay visible.
    for (const sel of ["[data-fiware-benefits]", "[data-fiware-conditions]"]) await expect(fiware.locator(sel)).not.toHaveAttribute("open", "");
    await expect(fiware.locator("[data-award-prize]")).toBeVisible();
    await expect(fiware.getByRole("table")).toBeVisible();
    await expect(fiware.getByText("One prize package per winning team")).toBeHidden();
    await fiware.locator("[data-fiware-conditions] summary").focus();
    await page.keyboard.press("Enter");
    await expect(fiware.getByText("One prize package per winning team")).toBeVisible();
    for (const id of ["red-hat-openshift-ai", "fiware-open-innovation"]) await expect(page.locator(`[data-award="${id}"] [data-award-questions]`)).toContainText("Questions?");
    await expect(page.locator("[data-mlh-awards] [data-award-questions]")).toContainText("16:45");
    const mlh = page.locator("[data-mlh-award]");
    await expect(mlh).toHaveCount(7);
    await expect(page.locator("[data-mlh-awards]")).toContainText("Prizes provided through Major League Hacking");
    await expect(page.locator('[data-mlh-award="mlh-gemini"]')).toContainText("MLH Swag Kits");
    for (const link of await page.locator("[data-mlh-award] a").all()) await expect(link).toHaveAttribute("href", /^https:\/\/mlh\.link\//);
    await expect(page.locator("[data-fiware-resources]")).toContainText("docker run -d --name mongo-db --network fiware mongo:4.4");
    await expect(page.locator("[data-fiware-resources]")).toContainText("Content-Type: application/ld+json");
    // Commands keep one line each (no mid-flag wraps); a long one scrolls inside its block, never the page.
    for (const pre of await page.locator("[data-fiware-resources] pre").all()) {
      await expect(pre).toHaveCSS("white-space", "pre");
      await expect(pre).toHaveAttribute("tabindex", "0");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    await expect(page.locator("[data-confidential-rules] li")).toHaveCount(5);
    const main = await page.locator("main").innerText();
    expect(main).not.toMatch(/@fiware\.org|@seamware|@joinedcontext|@indoorsos|\+358/);
  });

  test("is reachable from the guide header, the hub and the builder guide", async ({ page, isMobile }) => {
    await page.goto(GUIDE);
    await page.locator("#guides").getByRole("link", { name: /Builder Resources/ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/resources$`));
    await page.goto(`${GUIDE}/builders#building`);
    await page.locator("#building").getByRole("link", { name: "Builder Resources" }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/resources$`));
    if (!isMobile) {
      await page.goto(`${GUIDE}/venue`);
      await page.getByRole("banner").getByRole("link", { name: "Resources", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${GUIDE}/resources$`));
    }
    // The Venue Explorer stays about places, with prominent links to tools and awards.
    await page.goto(`${GUIDE}/venue`);
    const links = page.locator("[data-venue-resource-links]");
    await expect(links.getByRole("link", { name: /Builder Resources/ })).toHaveAttribute("href", `${GUIDE}/resources`);
    await links.getByRole("link", { name: /Optional awards/ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/resources#awards$`));
    await expect(page.locator("#awards-title")).toBeInViewport();
  });

  test("the builder schedule has the MLH introduction at 16:45–16:55, before the 17:00 opening", async ({ page }) => {
    await page.goto(`${GUIDE}/builders#schedule`);
    const schedule = page.locator("#schedule");
    await expect(schedule).toContainText("Major League Hacking: Introduction & Hacker Resources");
    const text = await schedule.innerText();
    expect(text.indexOf("Major League Hacking: Introduction")).toBeLessThan(text.indexOf("Opening ceremony"));
    await expect(page.locator("#app")).toContainText("Complete all 20 comparisons");
    await expect(page.locator("main")).not.toContainText(/ten solutions|most votes/);
  });
});

test.describe("Wi-Fi", () => {
  test("the hub's Wi-Fi chip leads to the venue instructions", async ({ page }) => {
    await page.goto(GUIDE);
    await page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "Wi-Fi" }).click();
    await expect(page).toHaveURL(/#wifi$/);
    await expect(page.locator("#wifi-title")).toBeInViewport();
    await expect(page.locator('#wifi [data-wifi="educity"]')).toContainText("TUAS Guest");
    await expect(page.locator('#wifi [data-wifi="build-spaces"]')).toContainText("Instructions to be confirmed");
  });

  test("the builder FAQ answer links to the instructions on the same page", async ({ page }) => {
    await page.goto(`${GUIDE}/builders`);
    await page.getByText("Is there Wi-Fi? Can we use Linux?").click();
    await page.getByRole("link", { name: "Wi-Fi instructions" }).click();
    await expect(page).toHaveURL(/\/builders#wifi$/);
    await expect(page.locator("#wifi-title")).toBeInViewport();
  });
});

test.describe("photo lightbox", () => {
  test("opens, pages with arrow keys, closes with Escape and returns focus", async ({ page }) => {
    await page.goto(`${GUIDE}/venue#photos`);
    const opener = page.getByRole("button", { name: /^Open photo:/ }).first();
    await opener.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading")).toContainText("1 / ");
    await expect(dialog).toContainText("Photo: Vesa Loikas");
    await page.keyboard.press("ArrowRight");
    await expect(dialog.getByRole("heading")).toContainText("2 / ");
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.getByRole("heading")).toContainText("1 / ");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
});

test.describe("navigation", () => {
  test("section nav follows the section in view", async ({ page }) => {
    await page.goto(`${GUIDE}/builders`);
    const nav = page.getByRole("navigation", { name: "On this page" });
    await page.locator("#schedule").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 200));
    await expect(nav.locator('[aria-current="location"]')).toHaveText("Schedule");
  });

  test("mobile menu closes when tapping outside", async ({ page, isMobile }) => {
    test.skip(!isMobile, "The guide menu is a phone-only control");
    await page.goto(`${GUIDE}/judges`);
    const menu = page.locator("header details");
    await menu.locator("summary").click();
    await expect(menu).toHaveAttribute("open", "");
    // Tap the page margin just below the open menu panel.
    const panel = (await menu.locator("nav").boundingBox())!;
    const viewport = page.viewportSize()!;
    await page.touchscreen.tap(12, Math.min(panel.y + panel.height + 48, viewport.height - 12));
    await expect(menu).not.toHaveAttribute("open", "");
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/judges$`));
  });
});

test.describe("venue explorer", () => {
  test("opens full screen, zooms with the keyboard, closes with Escape and returns focus", async ({ page }) => {
    await page.goto(`${GUIDE}/builders#maps`);
    // Scoped to #maps: the team formation section above it has its own map viewer.
    const trigger = page.locator("#maps").getByRole("button", { name: /full screen/ }).first();
    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const viewport = dialog.getByRole("group", { name: /EduCity floor 1 team formation plan/ });
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
    await expect(locations).not.toContainText("Red Hat");
    await expect(locations).toContainText("Stand 2 · Solita");
    await expect(locations).toContainText("Stand 6 · Major League Hacking");
    await expect(locations).toContainText("Team Check + card return");
    await expect(locations).toContainText("3027");
  });
});

const hasWebGL2 = (page: Page) => page.evaluate(() => !!document.createElement("canvas").getContext("webgl2"));

test.describe("3D campus", () => {
  test("loads on demand, finds a company and switches places", async ({ page, browserName }) => {
    test.skip(
      browserName === "webkit" && !!process.env.E2E_ALL_BROWSERS,
      "Headless WebKit in Docker renders WebGL on the CPU and runs out of memory building the full campus; real iPhones and Macs use the GPU.",
    );
    // Software GL on a busy machine can take minutes to build the campus.
    test.setTimeout(480_000);
    const problems = watchConsole(page);
    await page.goto(`${GUIDE}/venue`);
    await expect(page.locator("canvas")).toHaveCount(0); // nothing loaded until asked
    if (!(await hasWebGL2(page))) {
      // No WebGL 2 (e.g. headless Firefox without a GPU): the text fallback carries every place and route.
      const explore = page.getByRole("button", { name: "Explore in 3D" });
      if (await explore.count()) await explore.click();
      await expect(page.locator("#preview-3d").getByText(/can.t show the 3D model/).first()).toBeVisible();
      await expect(page.locator("#preview-3d")).toContainText("Kupittaa station");
      await expect(page.locator("#preview-3d")).toContainText("Kupittaa station → EduCity company arrival");
      await expect(page.locator("#preview-3d")).toContainText("BioCity car park entrance");
      expect(problems).toEqual([]);
      return;
    }
    await page.getByRole("button", { name: "Explore in 3D" }).click();
    await expect(page.getByRole("button", { name: "Show names" })).toBeVisible({ timeout: 420_000 });
    await expect(page.locator("canvas").first()).toBeVisible();
    await page.getByLabel("Go to").selectOption("elisa");
    await expect(page.getByText("Joki floor 1 · Showroom · counter 4 of 6", { exact: true }).first()).toBeVisible();
    // Parking: its own group in "Go to"; the BioCity car park entrance is a verified marker.
    await expect(page.getByLabel("Go to").locator('optgroup[label="Parking"] option')).toHaveCount(2);
    await page.getByLabel("Go to").selectOption("parking-biocity");
    await expect(page.getByText("Aimo Park · guest zone 703, limited spaces · driveway off Joukahaisenkatu").first()).toBeVisible();
    await page.locator("#preview-3d").getByRole("tab", { name: "BioCity", exact: true }).click();
    await expect(page.locator("#preview-3d").getByRole("tab", { name: "BioCity", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("group", { name: "BioCity views" })).toBeVisible({ timeout: 30_000 });
    expect(problems).toEqual([]);
  });

  test("route cards open their route in the 3D", async ({ page }) => {
    await page.goto(`${GUIDE}/challenge-partners/elisa`);
    await page.getByRole("link", { name: /Kupittaa station → EduCity company arrival/ }).click();
    // On a company's page the route leads to that company's own room (focus); elsewhere to the briefing rooms.
    await expect(page).toHaveURL(/\/venue\?tour=partners-fri-train-edu(&focus=room-elisa)?#preview-3d$/);
    if (!(await hasWebGL2(page))) {
      await expect(page.locator("#preview-3d")).toContainText("Kupittaa station → EduCity company arrival");
      return;
    }
    await expect(page.locator("#preview-3d")).toContainText("Route: Kupittaa station → EduCity company arrival");
  });

  test("without WebGL 2, a route link still lands on its directions and a target link on its card", async ({ page }) => {
    // A device without WebGL 2: the bare probe and the engine both get no context.
    await page.addInitScript(() => {
      const proto = HTMLCanvasElement.prototype as unknown as { getContext: (type: string, ...rest: unknown[]) => unknown };
      const get = proto.getContext;
      proto.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        return type === "webgl2" ? null : get.call(this, type, ...rest);
      };
    });
    await page.goto(`${GUIDE}/venue?tour=partners-fri-train-edu&focus=room-elisa#preview-3d`);
    const stage = page.locator("#preview-3d");
    await expect(stage.getByText("Route: Kupittaa station → EduCity company arrival", { exact: true })).toBeVisible({ timeout: 60_000 });
    // The steps end at Elisa's own room, and the route list below marks the route.
    await expect(stage.getByText(/your briefing room for 18:50 is room 1001 Dromberg, on this floor/).first()).toBeVisible();
    await expect(stage.locator('li[aria-current="true"]').first()).toContainText("Kupittaa station → EduCity company arrival");
    await expect(page.locator("canvas")).toHaveCount(0);

    await page.goto(`${GUIDE}/venue?focus=elisa#preview-3d`);
    await expect(stage.getByText("Joki floor 1 · Showroom · counter 4 of 6", { exact: true }).first()).toBeVisible({
      timeout: 60_000,
    });
    const card = stage.getByRole("group", { name: "Elisa", exact: true });
    await expect(card.getByRole("link", { name: "Floor plan" }).first()).toHaveAttribute("href", "#map-joki-showroom");
  });

  test("deep links open the right place and target", async ({ page }) => {
    await page.goto(`${GUIDE}/venue?focus=solita#preview-3d`);
    // The poster names the target before anything heavy loads.
    await expect(page.locator("#preview-3d")).toContainText("Solita");
    await expect(page.locator("#preview-3d").getByRole("tab", { name: "BioCity", exact: true })).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("accessibility", () => {
  for (const route of [
    GUIDE,
    `${GUIDE}/builders`,
    `${GUIDE}/challenge-partners`,
    `${GUIDE}/partners`,
    `${GUIDE}/venue`,
    `${GUIDE}/resources`,
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
