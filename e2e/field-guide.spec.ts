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
      ["tba", "1090 Ringsberg", "Joki · Floor 2"],
      ["fonecta", "2001 Elias", "Joki · Floor 3"],
      ["tba-2", "2067", "Joki · Floor 3"],
    ]) {
      const row = page.locator(`#company-${id}`);
      await expect(row).toContainText(room);
      await expect(row).toContainText(qa);
    }
    await expect(page.locator('[id^="company-"]')).toHaveCount(15);
    const text = await page.locator("main").innerText();
    for (const name of ["Revvity", "Bo LKV", "Saarioinen", "Sandvik", "Kongsberg"]) expect(text).not.toContain(name);
  });

  test("company search narrows the list", async ({ page }) => {
    await page.goto(`${GUIDE}/challenge-partners`);
    await page.getByRole("searchbox", { name: "Find your company" }).fill("traficom");
    await expect(page.locator('[id^="company-"]')).toHaveCount(1);
    await expect(page.locator("#company-traficom")).toContainText("1091 Hammarbacka");
  });

  test("partner guide groups the six stands in the partner corner", async ({ page }) => {
    await page.goto(`${GUIDE}/partners#stands`);
    const stands = page.locator('[id^="stand-bc-"]');
    await expect(stands).toHaveCount(6);
    await expect(page.locator("#stand-bc-1")).toContainText("Stand 1 · most visible");
    const names = ["Red Hat", "Solita", "Pruna AI", "BearingPoint", "CSC / LUMI AI Factory", "Major League Hacking"];
    for (const [i, name] of names.entries()) await expect(page.locator(`#stand-bc-${i + 1}`)).toContainText(name);
    await expect(page.locator("#stand-bc-6")).toContainText("confirmed separately");
    for (let i = 1; i <= 6; i++) await expect(page.locator(`#stand-bc-${i}`)).toContainText("partner corner");
  });

  test("builder guide shows the team formation plan with a text version", async ({ page }) => {
    await page.goto(`${GUIDE}/builders#team-formation`);
    const section = page.locator("#team-formation");
    for (const step of ["Choose your zone", "Build your team", "Join in the app", "Leave via the other side"])
      await expect(section.getByRole("heading", { name: step, exact: true })).toBeVisible();
    await expect(section).toContainText("Already have a team?");
    await expect(section).toContainText("not the building’s emergency exit plan");
    await expect(section.locator('img[src*="educity-team-formation"]').first()).toHaveAttribute("alt", /zones 1, 2, 3 and 4/);
    // The Now / Next card shows the current Turku time, which can be any of these.
    const body = (await page.locator("main").innerText()).replace(/Turku \d{2}:\d{2}/gi, "");
    expect(body).not.toMatch(/17:45|17:50|18:05|before 17:00|18:15–18:45/);
    expect(body).toContain("Team formation closes at 16:45");
    expect(body).toContain("17:00–17:30");
    expect(body).toContain("18:50–19:30");
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
    await expect(card("fri-dinner")).toContainText("18:30–21:30");
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
    await expect(locations).toContainText("Stand 1 · Red Hat");
    await expect(locations).toContainText("Stand 2 · Solita");
    await expect(locations).toContainText("Stand 6 · Major League Hacking");
    await expect(locations).toContainText("Team check");
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
    await page.goto(`${GUIDE}/venue?focus=red-hat#preview-3d`);
    // The poster names the target before anything heavy loads.
    await expect(page.locator("#preview-3d")).toContainText("Red Hat");
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
