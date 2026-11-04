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
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Since AI Hackathon 2026");
  });

  test("calendar files per guide and per company", async ({ request }) => {
    const builders = await request.get(`${GUIDE}/calendar/builders`);
    expect(builders.status()).toBe(200);
    expect(builders.headers()["content-type"]).toContain("text/calendar");
    expect(builders.headers()["content-disposition"]).toContain("since-ai-hackathon-2026-builders.ics");
    expect(builders.headers()["x-robots-tag"]).toContain("noindex");
    const buildersIcs = (await builders.text()).replace(/\r\n /g, "");
    expect(buildersIcs).toContain("BEGIN:VCALENDAR");
    // MLH's two workshops, Friday in Presidenttiauditorio (20:30 and 21:00 Turku time = 18:30 and 19:00 UTC).
    expect(buildersIcs).toContain("SUMMARY:Since AI · GitHub Copilot Workshop");
    expect(buildersIcs).toContain("DTSTART:20261106T183000Z\r\nDTEND:20261106T190000Z");
    expect(buildersIcs).toContain("SUMMARY:Since AI · Google AI Studio Workshop");
    expect(buildersIcs).toContain("DTSTART:20261106T190000Z\r\nDTEND:20261106T193000Z");
    expect(buildersIcs).toContain("Presidenttiauditorio");
    // BearingPoint, Saturday 12:00–12:30 Turku time = 10:00–10:30 UTC, once, confirmed.
    expect(buildersIcs).toContain("DTSTART:20261107T100000Z\r\nDTEND:20261107T103000Z\r\nSUMMARY:Since AI · BearingPoint Workshop – From AI Prototype to Business Impact");
    expect((buildersIcs.match(/BearingPoint Workshop/g) ?? []).length).toBe(1);
    const partnersIcs = (await (await request.get(`${GUIDE}/calendar/partners`)).text()).replace(/\r\n /g, "");
    expect(partnersIcs).toContain("UID:sat-bearingpoint-workshop.partners@sinceai.ai");

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
      ["trusted", "2067", "Remote · Discord"],
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

  test("TrustED company page: remote, room 2067 on floor 2, no stand and no promised hours", async ({ page }) => {
    await page.goto(`${GUIDE}/challenge-partners/trusted`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("TrustED");
    await expect(page.getByRole("link", { name: /trustedproject\.eu/ })).toHaveAttribute("href", "https://trustedproject.eu/");
    await expect(page.getByRole("link", { name: "Coordinator: Gradiant" })).toHaveAttribute("href", "https://gradiant.org/");
    const main = page.locator("main");
    await expect(main).toContainText("Fri 18:50–19:30");
    await expect(main).toContainText("EduCity · floor 2");
    await expect(main).toContainText("Remote support schedule to be confirmed");
    await expect(main).toContainText("by 13:00");
    await expect(main).not.toContainText(/Arrive at|Your Q&A stand|roll-up|Joki Floor|19:30–20:30|10:00–12:00|15:00–17:00/);
    await expect(main).not.toContainText(/meet\.google|teams\.microsoft|@gradiant/);
    const logo = page.getByRole("img", { name: /TrustED/ }).first();
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  });

  test("the old tba-2 links reach TrustED", async ({ page, request }) => {
    const direct = await request.get(`${GUIDE}/challenge-partners/tba-2`, { maxRedirects: 0 });
    expect(direct.status()).toBe(308);
    expect(direct.headers().location).toBe(`${GUIDE}/challenge-partners/trusted`);
    await page.goto(`${GUIDE}/challenge-partners/tba-2`);
    await expect(page).toHaveURL(`${GUIDE}/challenge-partners/trusted`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("TrustED");
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

  test("partner guide groups the seven stands in the partner corner, Red Hat's first, with no open position", async ({ page }) => {
    await page.goto(`${GUIDE}/partners#stands`);
    const stands = page.locator('[id^="stand-bc-"]');
    await expect(stands).toHaveCount(7);
    await expect(page.locator("#stand-bc-1")).toContainText("Stand 1 · most visible");
    await expect(page.locator("main")).not.toContainText("open position");
    await expect(page.locator("main")).not.toContainText("Visibility / Tech Partner stand");
    const names = ["Red Hat", "Solita", "Pruna AI", "BearingPoint", "CSC / LUMI AI Factory", "Major League Hacking", "FIWARE"];
    for (const [i, name] of names.entries()) await expect(page.locator(`#stand-bc-${i + 1}`)).toContainText(name);
    await expect(page.locator("#stand-bc-1")).toContainText("on-site hours are confirmed separately");
    await expect(page.locator("#stand-bc-6")).toContainText("Two MLH team members on site");
    await expect(page.locator("#stand-bc-7")).toContainText("Behind Solita's stand, facing the walkway to Joki");
    await expect(page.locator("#stand-bc-7")).toContainText("stand hours are confirmed separately");
    for (let i = 1; i <= 7; i++) await expect(page.locator(`#stand-bc-${i}`)).toContainText("partner corner");
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
    await expect(page.locator('#briefing-rooms [data-briefing-room="trusted"]')).toContainText("TrustED");
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

  test("the full section is on AI Tools & Resources; the hub keeps a short pointer and the old anchor", async ({ page }) => {
    await page.goto(`${GUIDE}/resources?${BEFORE}`);
    const section = page.locator("#ai-resources");
    await expect(section.getByRole("heading", { level: 2 })).toHaveText("CSC / LUMI AI Factory computing resources.");
    await expect(section.locator('[data-computing-status="open"]')).toContainText("Friday 30 October 2026");
    await expect(section).toContainText("Optional");
    await expect(section).toContainText("Horizon Europe-associated country");
    await expect(section).toContainText("SUPERCOMPUTER");
    await expect(section.getByRole("link", { name: "info@sinceai.fi" })).toHaveAttribute("href", "mailto:info@sinceai.fi");
    // The hub: a one-line pointer in the AI tools section, and #ai-resources still lands on it.
    await page.goto(`${GUIDE}?${BEFORE}#ai-resources`);
    await expect(page.locator("#ai-tools")).toContainText("CSC / LUMI supercomputer access was for those who registered by Fri 30 Oct");
    await expect(page.locator("#ai-tools").getByRole("link", { name: "details" })).toHaveAttribute("href", `${GUIDE}/resources#ai-resources`);
    await expect(page.locator("main #ai-resources")).toHaveCount(1);
    await page.getByRole("link", { name: /Register by Fri 30 Oct/ }).first().click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/resources#ai-resources$`));
    await expect(page.locator("#ai-resources-title")).toBeInViewport();
  });

  test("the builder guide links to the full section from its hero and its checklist", async ({ page }) => {
    await page.goto(`${GUIDE}/builders?${BEFORE}`);
    await expect(page.locator("#bring")).toContainText("CSC / LUMI computing");
    await expect(page.locator("#bring").getByRole("link", { name: "AI resources in the Field Guide" })).toHaveAttribute(
      "href",
      `${GUIDE}/resources#ai-resources`,
    );
    await page.getByRole("link", { name: /Register by Fri 30 Oct/ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/resources#ai-resources$`));
    await expect(page.locator("#ai-resources-title")).toBeInViewport();
  });

  test("after the deadline the section says registration has closed and the callout is gone", async ({ page }) => {
    await page.goto(`${GUIDE}/resources?now=2026-10-31T09:00`);
    await expect(page.locator('#ai-resources [data-computing-status="closed"]')).toContainText("Registration closed");
    await page.goto(`${GUIDE}?now=2026-10-31T09:00`);
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
    // Let the page hydrate first: on a busy machine a click before that loses its #hash to the router's initial URL.
    await page.goto(`${GUIDE}/builders`, { waitUntil: "networkidle" });
    await page.getByRole("navigation", { name: "On this page" }).getByRole("link", { name: "Build & submit" }).click();
    await expect(page).toHaveURL(/#building$/);
    await expect(page.locator("#building-title")).toBeInViewport();
    const section = page.locator("#building");
    await expect(section.getByRole("heading", { name: "Build with AI. We encourage it." })).toBeVisible();
    const submit = section.locator("#submit");
    await expect(submit.getByText("Sunday 8 November, 10:00 EET")).toBeVisible();
    await expect(submit).toContainText("not Devpost");
    // The final form (4 Nov 2026): a YouTube video and the source zip are required; no video files.
    await expect(submit.locator('[data-file-kind="Demo video"]')).toContainText("YouTube link");
    await expect(submit.locator('[data-file-kind="Demo video"]')).not.toContainText("MP4, WebM");
    await expect(submit.locator('[data-file-kind="Source code"] [data-file-required]')).toHaveText("Required");
    await expect(submit).toContainText("YouTube is the only accepted format");
    // What voters see: one card, no links.
    const card = submit.locator("[data-vote-card-guide]");
    await expect(card.locator("[data-vote-card-row]")).toHaveCount(6);
    await expect(card).toContainText("Never on the card: your repository, your demo URL or other links");
    // Under the steps: one line to the optional awards; the form's MLH prize categories and public summary say where to look.
    await expect(submit.locator("[data-submit-awards]").getByRole("link")).toHaveAttribute("href", `${GUIDE}/resources#awards`);
    await expect(submit).toContainText("Tick the MLH categories that fit");
    await expect(submit).toContainText("Ticking Red Hat OpenShift AI or FIWARE also enters that award");
    await expect(submit).toContainText("Public summary (confidential challenges only)");
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
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/resources#ai-resources$`));
    await expect(page.locator("#ai-resources-title")).toBeInViewport();
  });

  test("the hub links builders to the section", async ({ page }) => {
    await page.goto(GUIDE);
    await page.locator("#guides").getByRole("link", { name: /Build with AI\. Submit in sinceai\.app\./ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/builders#building$`));
    await expect(page.locator("#building-title")).toBeInViewport();
  });
});

test.describe("AI Tools & Resources", () => {
  test("starts with six recognisable tools, each with a logo, what you get and one button", async ({ page }) => {
    await page.goto(`${GUIDE}/resources`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("AI Tools & Resources");
    const firstSection = await page.locator("main section[id]").first().getAttribute("id");
    expect(firstSection).toBe("start");
    await expect(page.locator("#start-title")).toHaveText("Start building with AI.");
    const featured = page.locator("[data-featured-tool]");
    expect(await featured.evaluateAll((els) => els.map((e) => e.getAttribute("data-featured-tool")))).toEqual([
      "github-copilot",
      "claude",
      "cursor",
      "lovable",
      "gemini",
      "google-cloud",
    ]);
    const copilot = page.locator('[data-featured-tool="github-copilot"]');
    await expect(copilot.getByRole("heading", { level: 3 })).toHaveText("GitHub Copilot");
    await expect(copilot).toContainText("Get AI coding assistance inside your editor.");
    await expect(copilot.locator("[data-tool-access]")).toContainText("Free plan with monthly limits");
    await expect(copilot.locator("[data-tool-access]")).toContainText("Copilot Student free for verified students");
    await expect(copilot.getByRole("link", { name: /Get GitHub Copilot/ })).toHaveAttribute("href", "https://github.com/features/copilot/plans");
    await expect(copilot).toContainText("Optional workshop: Fri 20:30, BioCity.");
    const gemini = page.locator('[data-featured-tool="gemini"]');
    await expect(gemini.getByRole("link", { name: /Open Google AI Studio/ })).toHaveAttribute("href", "https://mlh.link/gemini-aistudio");
    await expect(gemini).toContainText("Since AI has no Google credits of its own");
    await expect(gemini).toContainText("Benefit provided through Major League Hacking (MLH).");
    await expect(page.locator('[data-featured-tool="claude"] [data-tool-access]')).toContainText("Claude Code needs a paid plan or API credit");
    await expect(page.locator('[data-resource="lovable"] [data-tool-access]')).toContainText("Lovable Pro free for 1 month · 100 credits");
    // The free plans and credits lead the page, each tile linking to its card.
    const perks = page.locator("#start [data-builder-perks] [data-perk]");
    await expect(perks).toHaveCount(8);
    await expect(perks.first()).toContainText("Lovable Pro");
    await expect(page.locator('#start [data-perk="n8n"]')).toContainText("One per team, so every team gets one");
    await expect(page.locator('#start [data-perk="google-cloud"]')).toContainText("$300 credit");
    await expect(page.locator('#start [data-perk="featherless"] a')).toHaveAttribute("href", "#tool-featherless");
    await expect(page.locator("[data-perks-note]")).toContainText("never on this website");
    // The first card's button is visible without scrolling far on a phone-sized screen too.
    for (const img of await page.locator("[data-featured-tool] img").all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    await expect(page.locator("main")).not.toContainText(/official Since AI sponsor|unlimited|guaranteed credits/i);
  });

  test("everything else by what you want to do, one card per provider, with benefits, access, help and awards", async ({ page }) => {
    await page.goto(`${GUIDE}/resources`);
    await expect(page.locator("[data-resources-intro]")).toContainText("official Since AI participant messages and designated event channels");
    for (const [section, ids] of [
      ["coding", ["n8n", "entire"]],
      ["models", ["openai", "elevenlabs", "featherless", "pruna-ai"]],
      ["cloud", ["red-hat", "mongodb-atlas", "snowflake", "tiger-data", "vultr"]],
      ["advanced", ["csc-lumi", "fiware", "solana"]],
    ] as const) {
      const cards = page.locator(`#${section} > div > ul > [data-tool], #${section} [data-tool]`);
      expect(await cards.evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-tool")))])).toEqual([...ids]);
    }
    // Each provider appears once.
    const all = await page.locator("[data-tool]").evaluateAll((els) => els.map((e) => e.getAttribute("data-tool")));
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(20);
    // Former anchors still land in the right place.
    for (const id of ["computing", "building", "standards", "tools", "resource-red-hat", "resource-lovable"]) {
      await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
    }
    await expect(page.locator('[data-resource="n8n"] [data-tool-access]')).toContainText("200 licences · one per team");
    await expect(page.locator('[data-resource="featherless"]')).toContainText("never on this website");
    await expect(page.locator('[data-resource="red-hat"]')).toContainText("free for 30 days");
    // The details sit behind each card's disclosure: open it as a builder would.
    for (const id of ["red-hat", "fiware"]) await page.locator(`[data-resource="${id}"] summary`).click();
    await expect(page.locator('[data-resource="red-hat"]').getByRole("link", { name: "Red Hat OpenShift AI Technology Award" })).toHaveAttribute(
      "href",
      `${GUIDE}/resources#award-red-hat-openshift-ai`,
    );
    await expect(page.locator('[data-resource="red-hat"] [data-award-short]')).toHaveText(" · €1,000");
    await expect(page.locator('[data-resource="red-hat"]')).toContainText("A Red Hat stand is planned in BioCity's partner corner");
    await expect(page.locator('[data-resource="fiware"]').getByRole("link", { name: /Start with FIWARE/ })).toHaveAttribute("href", "#fiware");
    await expect(page.locator('[data-resource="fiware"]').getByRole("link", { name: "FIWARE Open Innovation Award" })).toHaveAttribute(
      "href",
      `${GUIDE}/resources#award-fiware-open-innovation`,
    );
    await expect(page.locator('[data-resource="fiware"]')).toContainText("A FIWARE stand is planned in BioCity's partner corner");
    const lumi = page.locator('[data-resource="csc-lumi"]');
    await expect(lumi.locator("[data-tool-access]")).toContainText("Registered by Fri 30 Oct only");
    await expect(lumi).toContainText("You do not need LUMI to take part");
    await expect(lumi.getByRole("link", { name: "Eligibility and deadline" })).toHaveAttribute("href", "#ai-resources");
    for (const id of ["mongodb-atlas", "snowflake", "vultr", "tiger-data", "solana", "entire"]) {
      await expect(page.locator(`[data-tool="${id}"]`)).toContainText("Benefit provided through Major League Hacking (MLH).");
    }
    await expect(page.locator('[data-tool="mongodb-atlas"]')).toContainText("free forever tier");
    await expect(page.locator('[data-tool="snowflake"]')).toContainText("120-day");
    await expect(page.locator("main")).not.toContainText(/Google Cloud credit|Activation pending|exclusive/i);
    for (const card of await page.locator("[data-tool]").all()) {
      for (const link of await card.getByRole("link").all()) {
        const href = (await link.getAttribute("href"))!;
        if (href.startsWith("/") || href.startsWith("#")) continue;
        expect(href).toMatch(/^https:\/\//);
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", "noopener noreferrer");
      }
    }
    await expect(page.locator("[data-stand-partner]")).toHaveCount(7);
    await expect(page.locator("[data-mlh-note]")).toContainText("2027 Season Member Event");
    for (const img of await page.locator("[data-tool] img").all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test("optional awards after the tools: how to enter, the eight MLH categories, Red Hat and FIWARE", async ({ page }) => {
    await page.goto(`${GUIDE}/resources#awards`);
    await expect(page.locator("#awards-title")).toBeInViewport();
    await expect(page.locator("main")).not.toContainText(/extra prizes/i);
    const order = await page.locator("main section[id]").evaluateAll((els) => els.map((e) => e.id));
    expect(order.indexOf("awards")).toBeGreaterThan(order.indexOf("advanced"));
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
    await expect(fiware).toContainText("Chandra Challagonda, CEO of FIWARE Foundation, is the sole evaluator");
    await expect(fiware).toContainText("takes no part in evaluating this award");
    await expect(fiware.locator("[data-fiware-benefits] li")).toHaveCount(5);
    for (const sel of ["[data-fiware-benefits]", "[data-fiware-conditions]"]) await expect(fiware.locator(sel)).not.toHaveAttribute("open", "");
    await expect(fiware.getByText("One prize package per winning team")).toBeHidden();
    await fiware.locator("[data-fiware-conditions] summary").focus();
    await page.keyboard.press("Enter");
    await expect(fiware.getByText("One prize package per winning team")).toBeVisible();
    await expect(page.locator("[data-mlh-awards] [data-award-questions]")).toContainText("16:45");
    const mlh = page.locator("[data-mlh-award]");
    await expect(mlh).toHaveCount(8);
    await expect(page.locator("[data-mlh-awards]")).toContainText("Prizes provided through Major League Hacking");
    await expect(page.locator('[data-mlh-award="mlh-gemini"]')).toContainText("MLH Swag Kits");
    for (const card of await mlh.all()) await expect(card).toContainText("Prize:");
    // Each category links to the tool card with the free offers and first steps.
    await page.locator('[data-mlh-award="mlh-mongodb-atlas"]').getByRole("link", { name: /How to start with MongoDB Atlas/ }).click();
    await expect(page).toHaveURL(/#tool-mongodb-atlas$/);
    await expect(page.locator("[data-fiware-resources]")).toContainText("docker run -d --name mongo-db --network fiware mongo:4.4");
    for (const pre of await page.locator("[data-fiware-resources] pre").all()) {
      await expect(pre).toHaveCSS("white-space", "pre");
      await expect(pre).toHaveAttribute("tabindex", "0");
    }
    await expect(page.locator("[data-confidential-rules] li")).toHaveCount(5);
    await expect(page.locator("[data-confidential-rules]")).toContainText("NDA on paper with a FORCIT representative during its challenge briefing on Friday");
    await expect(page.locator("[data-confidential-rules]")).toContainText("Only after FORCIT has accepted your NDA does it give you personal credentials");
    const main = await page.locator("main").innerText();
    expect(main).not.toMatch(/@fiware\.org|@seamware|@joinedcontext|@indoorsos|\+358/);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test("is reachable from the guide header, the hub and the builder guide", async ({ page, isMobile }) => {
    await page.goto(GUIDE);
    await page.getByRole("navigation", { name: "Quick links" }).getByRole("link", { name: /AI Tools & Resources/ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/resources$`));
    await page.goto(GUIDE);
    await page.locator("#ai-tools").getByRole("link", { name: /Open AI Tools & Resources/ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/resources$`));
    await page.goto(`${GUIDE}/builders#build-with-ai`);
    await page.locator("#build-with-ai").getByRole("link", { name: /Open AI Tools & Resources/ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/resources$`));
    await page.goto(`${GUIDE}/builders#building`);
    await page.locator("#building").getByRole("link", { name: "AI Tools & Resources" }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/resources$`));
    if (!isMobile) {
      await page.goto(`${GUIDE}/venue`);
      await page.getByRole("banner").getByRole("link", { name: "AI Tools", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${GUIDE}/resources$`));
    }
    // The Venue Explorer stays about places, with prominent links to tools and awards.
    await page.goto(`${GUIDE}/venue`);
    const links = page.locator("[data-venue-resource-links]");
    await expect(links.getByRole("link", { name: /AI Tools & Resources/ })).toHaveAttribute("href", `${GUIDE}/resources`);
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
    await expect(page.locator('#wifi [data-wifi="build-spaces"]')).toContainText("Hackathon");
    await expect(page.locator('#wifi [data-wifi="build-spaces"]')).toContainText(
      "Available at check-in and in the Since AI participant app.",
    );
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
    await expect(locations).toContainText("Stand 1 · Red Hat");
    await expect(locations).toContainText("Stand 2 · Solita");
    await expect(locations).toContainText("Stand 6 · Major League Hacking");
    await expect(locations).toContainText("Stand 7 · FIWARE");
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

test.describe("first screen, MLH and workshops (4 Nov 2026)", () => {
  test("the hub's first screen says what's next and offers four ways in, before anything else", async ({ page }) => {
    await page.goto(GUIDE);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Since AI Hackathon 2026");
    const nowNext = page.locator("section[aria-labelledby='now-next-title']");
    await expect(nowNext).toBeVisible();
    await expect(nowNext).toBeInViewport();
    const quick = page.getByRole("navigation", { name: "Quick links" });
    await expect(quick.getByRole("link")).toHaveText([/AI Tools & Resources/, /Schedule/, /Your guide/, /Venue & food/, /Submission/, /Help/]);
    await expect(quick.getByRole("link", { name: /AI Tools & Resources/ })).toHaveAttribute("href", `${GUIDE}/resources`);
    await expect(quick.getByRole("link", { name: /Venue & food/ })).toHaveAttribute("href", `${GUIDE}/venue#maps`);
    await expect(quick.getByRole("link", { name: /Submission/ })).toHaveAttribute("href", `${GUIDE}/builders#building`);
    await expect(quick.getByRole("link", { name: /AI Tools & Resources/ })).toContainText("Free Pro plans & credits");
    // The free plans and credits are on the hub too, each a link to its card on the resources page.
    await expect(page.locator("#ai-tools [data-perk]")).toHaveCount(8);
    await expect(page.locator('#ai-tools [data-perk="lovable"] a')).toHaveAttribute("href", `${GUIDE}/resources#tool-lovable`);
    // GitHub Copilot and Gemini are one tap from the hub's AI tools section.
    const strip = page.locator("#ai-tools [data-featured-strip]");
    await expect(strip.getByRole("link", { name: "GitHub Copilot" })).toHaveAttribute("href", `${GUIDE}/resources#tool-github-copilot`);
    await expect(strip.getByRole("link", { name: "Google Gemini & AI Studio" })).toHaveAttribute("href", `${GUIDE}/resources#tool-gemini`);
    // The roles come straight after, one line each.
    await expect(page.locator("#guides").getByRole("link", { name: /Builder Guide/ })).toHaveAttribute("href", `${GUIDE}/builders`);
    // The hub's schedule carries both workshops, and a short MLH summary links to the details.
    const weekend = page.locator("#weekend");
    await expect(weekend).toContainText("GitHub Copilot Workshop");
    await expect(weekend).toContainText("Google AI Studio Workshop");
    await expect(weekend.locator("[data-mlh-on-site]")).toContainText("At least 50 Arduino UNO Q boards");
    await expect(weekend.getByRole("link", { name: /MLH, workshops and hardware/ })).toHaveAttribute("href", `${GUIDE}/resources#mlh`);
    await expect(weekend).toContainText("BearingPoint Workshop – From AI Prototype to Business Impact");
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test("the builder schedule has both workshops after the opening, in Presidenttiauditorio, linked to the room", async ({ page }) => {
    await page.goto(`${GUIDE}/builders#schedule`);
    const schedule = page.locator("#schedule");
    const copilot = schedule.locator("#schedule-item-fri-mlh-copilot");
    await expect(copilot).toContainText("20:30");
    await expect(copilot).toContainText("21:00");
    await expect(copilot).toContainText("GitHub Copilot Workshop");
    await expect(copilot).toContainText("Presidenttiauditorio");
    await expect(copilot).toContainText("we recommend one person per team");
    const studio = schedule.locator("#schedule-item-fri-mlh-ai-studio");
    await expect(studio).toContainText("21:30");
    await expect(studio).toContainText("Google AI Studio Workshop");
    const text = await schedule.innerText();
    expect(text.indexOf("Major League Hacking: Introduction")).toBeLessThan(text.indexOf("Opening ceremony"));
    expect(text.indexOf("Opening ceremony")).toBeLessThan(text.indexOf("GitHub Copilot Workshop"));
    expect(text.indexOf("GitHub Copilot Workshop")).toBeLessThan(text.indexOf("Google AI Studio Workshop"));
    await expect(schedule).not.toContainText(/room to be confirmed/i);
    await copilot.getByRole("link", { name: /View room on map/ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/venue#place-bio-presidenttiauditorio$`));
    await expect(page.locator('#maps [role="tab"][aria-selected="true"]')).toHaveText(/BioCity · Main lobby/i);
    await expect(page.locator("#maps li").filter({ hasText: "(highlighted)" })).toHaveText(/Presidenttiauditorio — BioCity\s·\sAuditorium\s·\s258 seats/);
  });

  test("MLH at Since AI: hardware, giveaways, workshops, help — and the way in without attending", async ({ page }) => {
    await page.goto(`${GUIDE}/resources#mlh`);
    const mlh = page.locator("#mlh");
    await expect(page.locator("#mlh-title")).toHaveText("MLH at Since AI");
    const items = mlh.locator("[data-mlh-item]");
    await expect(items).toHaveCount(4);
    await expect(mlh.locator('[data-mlh-item="hardware"]')).toContainText("MLH Hardware Lab");
    await expect(mlh.locator('[data-mlh-item="hardware"]')).toContainText("on loan");
    await expect(mlh.locator('[data-mlh-item="giveaways"]')).toContainText("At least 50 Arduino UNO Q boards");
    await expect(mlh.locator('[data-mlh-item="help"]')).toContainText("Two MLH team members are on site in BioCity");
    await expect(mlh).toContainText("BioCity · MLH area");
    await expect(mlh.getByRole("link", { name: /Explore hardware resources/ })).toHaveAttribute("href", "https://www.mlh.com/resources/hardware");
    await expect(mlh.locator("[data-mlh-on-site]")).not.toContainText(/first come|raffle|winner|sign up|register/i);

    const cards = mlh.locator("[data-workshop]");
    await expect(cards).toHaveCount(3);
    await expect(mlh.locator('[data-workshop="bearingpoint-ai-to-impact"]')).toContainText("Sat 12:00–12:30");
    await expect(mlh.locator('[data-workshop="bearingpoint-ai-to-impact"]')).toContainText("Presidenttiauditorio");
    await expect(mlh.locator('[data-workshop="bearingpoint-ai-to-impact"]')).not.toContainText(/planned|to be confirmed/i);
    await expect(cards.nth(0)).toContainText("20:30–21:00");
    await expect(cards.nth(0)).toContainText("GitHub Copilot Workshop");
    await expect(cards.nth(1)).toContainText("21:00–21:30");
    await expect(cards.nth(1)).toContainText("Google AI Studio Workshop");
    await expect(mlh.locator("[data-workshop-room]")).toHaveText(["Presidenttiauditorio", "Presidenttiauditorio", "Presidenttiauditorio"]);
    await expect(mlh.locator("[data-workshop-seating]")).toBeVisible();
    await expect(mlh.locator("[data-workshop-seating]")).toHaveText(
      "Seats are limited. We recommend one person per team — share what you learn with your teammates. You don't need to attend to access the tools and setup guides.",
    );
    await expect(cards.nth(0).getByRole("link", { name: /Get GitHub Copilot/ })).toHaveAttribute("href", "https://mlh.link/github");
    await expect(cards.nth(0)).toContainText("GitHub Student Developer Pack");
    await expect(mlh.locator("[data-workshops-cant-attend]")).toContainText("Can't attend?");
    await expect(mlh.locator("[data-workshops-cant-attend]")).toContainText("Follow the setup guides or ask the MLH team for help.");
    await expect(mlh).toContainText("Presidenttiauditorio has 258 seats");
    await expect(mlh).not.toContainText(/300 seats|400 seats|guaranteed seat|must attend/i);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

    await mlh.getByRole("link", { name: /Find MLH on the map/ }).click();
    await expect(page).toHaveURL(new RegExp(`${GUIDE}/venue#place-stand-bc-6$`));
    const ringed = page.locator("#maps li").filter({ hasText: "(highlighted)" });
    await expect(ringed).toHaveCount(1);
    await expect(ringed).toContainText("Major League Hacking");
  });

  test("the Venue Explorer leads with the floor plans; the 3D campus is optional, further down", async ({ page }) => {
    await page.goto(`${GUIDE}/venue`);
    const order = await page.locator("main section[id], main div[id]").evaluateAll((els) => els.map((e) => e.id));
    expect(order.indexOf("maps")).toBeGreaterThanOrEqual(0);
    expect(order.indexOf("maps")).toBeLessThan(order.indexOf("route"));
    expect(order.indexOf("route")).toBeLessThan(order.indexOf("preview-3d"));
    expect(order.indexOf("maps")).toBeLessThan(order.indexOf("photos"));
    await expect(page.getByRole("navigation", { name: "Floor plans by building" }).getByRole("link")).toHaveText([/EduCity/, /BioCity/, /Joki/]);
    await page.getByRole("navigation", { name: "Floor plans by building" }).getByRole("link", { name: /BioCity/ }).click();
    await expect(page.locator('#maps [role="tab"][aria-selected="true"]')).toHaveText(/BioCity/i);
    // The BioCity plan lists the places people look for.
    const list = page.locator("#maps ul").first();
    for (const place of ["Presidenttiauditorio", "Main entrance", "Event entrance", "Restaurant Mauno", "To Joki", "Stand 6 · Major League Hacking"]) {
      await expect(list).toContainText(place);
    }
  });

  test("the Builder Guide's Build with AI points to the one resources page, keeping the old MLH anchors", async ({ page }) => {
    await page.goto(`${GUIDE}/builders#mlh`);
    const section = page.locator("#build-with-ai");
    await expect(page.locator("#build-with-ai-title")).toHaveText("Build with AI.");
    await expect(section.locator("[data-perk]")).toHaveCount(8);
    await expect(section.locator("#mlh")).toHaveCount(1);
    await expect(section.locator("#workshops")).toHaveCount(1);
    await expect(section.locator("[data-featured-strip] a")).toHaveCount(6);
    await expect(section.getByRole("link", { name: "Workshop details" })).toHaveAttribute("href", `${GUIDE}/resources#workshops`);
    await expect(section.getByRole("link", { name: "MLH at Since AI" })).toHaveAttribute("href", `${GUIDE}/resources#mlh`);
    // No full workshop cards or benefit descriptions repeated here.
    await expect(page.locator("main [data-workshop]")).toHaveCount(0);
    await expect(page.locator("main [data-tool]")).toHaveCount(0);
    const order = await page.$$eval("main section[id]", (els) => els.map((e) => e.id));
    expect(order.indexOf("build-with-ai")).toBe(order.indexOf("win") + 1);
  });

  test("the builder schedule labels workshops, ceremonies, Q&A and meals, with BearingPoint on Saturday", async ({ page }) => {
    await page.goto(`${GUIDE}/builders#schedule`);
    const bp = page.locator("#schedule-item-sat-bearingpoint-workshop");
    await expect(bp).toContainText("12:00");
    await expect(bp).toContainText("12:30");
    await expect(bp).toContainText("BearingPoint Workshop – From AI Prototype to Business Impact");
    await expect(bp).toContainText("Presidenttiauditorio");
    await expect(bp.locator("[data-schedule-tag]")).toHaveText("Workshop");
    await expect(page.locator("#schedule-item-fri-opening [data-schedule-tag]")).toHaveText("Ceremony");
    await expect(page.locator("#schedule-item-fri-dinner [data-schedule-tag]")).toHaveText("Meal");
    await expect(page.locator("#schedule-item-sat-qa-morning [data-schedule-tag]")).toHaveText("Company Q&A");
    const text = await page.locator("#schedule").innerText();
    expect(text.indexOf("Challenge partner Q&A open")).toBeLessThan(text.indexOf("BearingPoint Workshop"));
    // One entry only (the superseded 15:00 stand slot is not in the programme).
    await expect(page.locator('#schedule li[id^="schedule-item-"]').filter({ hasText: "BearingPoint" })).toHaveCount(1);
  });
});

test.describe("weekend calendar and building a winning project (4 Nov 2026)", () => {
  test("one 'Add weekend schedule' action near the top, honest options for every calendar app", async ({ page }) => {
    await page.goto(GUIDE);
    const add = page.locator("[data-add-calendar]").first();
    await expect(add.locator("summary")).toContainText("Add weekend schedule");
    await expect(add.locator("summary")).toContainText("Opening, workshops, deadlines and finals");
    // After "what's next" and the quick links.
    const order = await page.evaluate(() => {
      const nn = document.querySelector("section[aria-labelledby='now-next-title']")!;
      const cal = document.querySelector("[data-add-calendar]")!;
      return nn.compareDocumentPosition(cal) & Node.DOCUMENT_POSITION_FOLLOWING;
    });
    expect(order).toBeTruthy();
    await add.locator("summary").click();
    await expect(add.locator('[data-calendar-app="apple"] a')).toHaveAttribute(
      "href",
      "webcal://sinceai.ai/hackathon-2026/guide/calendar/builders",
    );
    await expect(add.locator('[data-calendar-app="google"]')).toContainText("From URL");
    await expect(add.locator('[data-calendar-app="google"]')).toContainText("Import & export");
    await expect(add.locator('[data-calendar-app="outlook"]')).toContainText("Subscribe from web");
    const download = add.locator('[data-calendar-app="other"] a');
    await expect(download).toHaveAttribute("href", `${GUIDE}/calendar/builders`);
    await expect(download).toHaveAttribute("download", "since-ai-hackathon-2026-builders.ics");
    await expect(add).toContainText("https://sinceai.ai/hackathon-2026/guide/calendar/builders");
    await expect(add).toContainText("A downloaded file is a fixed copy");
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test("the builder guide shows how to build a winning project right after the steps", async ({ page }) => {
    await page.goto(`${GUIDE}/builders`);
    const order = await page.$$eval("main section[id]", (els) => els.map((e) => e.id));
    expect(order.indexOf("win")).toBe(order.indexOf("steps") + 1);
    const win = page.locator("#win");
    await expect(page.locator("#win-title")).toHaveText("Build a project that wins.");
    await expect(win.locator('[data-winning-card="company"] h3')).toHaveText("Talk to your challenge company.");
    await expect(win.locator('[data-winning-card="demo"] h3')).toHaveText("Make your demo impossible to misunderstand.");
    // Details on demand.
    const questions = win.getByText("5 questions to ask your company");
    await questions.click();
    await expect(win.getByText("“What would stop you from actually using it?”")).toBeVisible();
    await win.getByText("How to make a great demo").click();
    await expect(win.getByText("Show it working.")).toBeVisible();
    await expect(win).toContainText("Build what matters. Show why it matters.");
    await expect(win).not.toContainText(/mandatory|disqualif|guarantee/i);
    // The builder schedule offers the same calendar action.
    await expect(page.locator("#schedule [data-add-calendar] summary")).toContainText("Add weekend schedule");
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });

  test("the hub links builders to the advice", async ({ page }) => {
    await page.goto(GUIDE);
    await expect(page.locator("#guides").getByRole("link", { name: /how to build a project that wins/ })).toHaveAttribute(
      "href",
      `${GUIDE}/builders#win`,
    );
  });
});
