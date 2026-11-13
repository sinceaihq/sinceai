import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { acceptNoCookies } from "./helpers";

/**
 * Since AI Hackathon 2026 ended on 8 November 2026. These tests keep the public
 * site in its post-event state: the event is in the past-events list, nothing
 * invites anyone to apply, and the structured data offers nothing to book.
 *
 * When the next event is announced (lib/sinceai.ts → SINCE_AI_EVENTS), the
 * "no upcoming events" expectations here are the ones to revisit.
 */

/** Wording that only makes sense before or during an event. */
const STALE =
  /registration is (now )?open|apply now|apply (to|for) (since ai )?hackathon 2026|become a volunteer|until since ai hackathon 2026 begins|event is live/i;

const PAGES = [
  "/",
  "/hackathon",
  "/events",
  "/faq",
  "/about",
  "/partners",
  "/for-builders",
  "/projects",
  "/ai-hackathons",
  "/impact",
  "/press",
  "/turku",
  "/europe-ai",
] as const;

type Json = Record<string, unknown>;

/** Every schema.org Event on the page, wherever it is nested. */
async function eventsInJsonLd(page: Page): Promise<Json[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const events: Json[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    const record = node as Json;
    if (record["@type"] === "Event") events.push(record);
    Object.values(record).forEach(walk);
  };
  blocks.forEach((text) => walk(JSON.parse(text)));
  return events;
}

test.describe("after Since AI Hackathon 2026", () => {
  test.beforeEach(async ({ page }) => {
    await acceptNoCookies(page);
  });

  for (const route of PAGES) {
    test(`${route} does not advertise the finished event`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

      // Visible copy, including the navbar and the footer.
      expect(await page.locator("body").innerText()).not.toMatch(STALE);

      // Search and social snippets.
      const meta = await page.evaluate(() =>
        ["description", "twitter:description"]
          .map((name) => document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ?? "")
          .concat(document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content ?? "", document.title)
          .join(" | "),
      );
      expect(meta).not.toMatch(STALE);
      expect(meta).not.toMatch(/1,000\+ builders|\bnext: since ai hackathon/i);

      // No link asks anyone to apply or register.
      const links = await page.getByRole("link").evaluateAll((els) =>
        els.map((a) => `${(a.textContent ?? "").trim()} ${a.getAttribute("aria-label") ?? ""}`),
      );
      expect(links.filter((name) => /\bapply\b|\bregister\b|volunteer/i.test(name))).toEqual([]);

      // An event that has ended offers nothing to book, and its status is a real schema.org value.
      for (const event of await eventsInJsonLd(page)) {
        if (typeof event.endDate === "string") expect(Date.parse(event.endDate)).toBeLessThan(Date.now());
        expect(event).not.toHaveProperty("offers");
        if (event.eventStatus) expect(event.eventStatus).toBe("https://schema.org/EventScheduled");
        expect(JSON.stringify(event)).not.toMatch(/will be held|InStock|EventCompleted/);
      }
    });
  }

  test("home → events → Hackathon 2026: the event is a past event that says it has ended", async ({ page }) => {
    await page.goto("/");
    const feature = page.locator("section[aria-labelledby=home-hackathon-title]");
    await expect(feature).toContainText("held 6–8 November 2026", { ignoreCase: true });
    await expect(feature.getByRole("link", { name: /About Hackathon 2026/ })).toHaveAttribute("href", "/hackathon");
    await feature.getByRole("link", { name: "All events" }).click();
    await expect(page).toHaveURL(/\/events$/);

    // Nothing is upcoming: an honest empty state with a way to hear about the next event.
    const upcoming = page.getByRole("region", { name: "Upcoming events" });
    await expect(upcoming).toContainText("No upcoming events are scheduled right now.");
    await expect(upcoming).not.toContainText("Since AI Hackathon 2026");
    await expect(upcoming.getByRole("link", { name: /Join Discord/ })).toHaveAttribute("href", /discord\.gg/);
    await expect(upcoming.getByRole("link", { name: /Join Telegram/ })).toHaveAttribute("href", /t\.me/);

    // Both hackathons are past events, newest first.
    const past = page.getByRole("region", { name: "Past events" });
    await expect(past.getByRole("heading", { level: 3 })).toHaveText(["Since AI Hackathon 2026", "Since AI Hackathon 2025"]);
    await expect(past).toContainText("6–8 November 2026");
    await expect(past).toContainText("21–23 November 2025");
    await expect(past.getByRole("link", { name: /Field Guide: schedule, venues and maps/ })).toHaveAttribute(
      "href",
      "/hackathon-2026/guide",
    );

    await past.getByRole("link", { name: /About Hackathon 2026/ }).click();
    await expect(page).toHaveURL(/\/hackathon$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Since AI Hackathon 2026.");
    await expect(page.locator("[data-event-status=completed]")).toHaveText("This event has ended. Registration is closed.");
  });

  test("the Hackathon 2026 page keeps the record and offers next steps instead of an application", async ({ page }) => {
    await page.goto("/hackathon");
    const main = page.locator("main");

    // The record: what the event was, in the past tense, with only confirmed figures.
    await expect(main).toContainText("Since AI Hackathon 2026 took place on the Turku science park campus");
    await expect(main).toContainText("Completed — the event has ended and registration is closed");
    await expect(main).not.toContainText(/builders are expected|1,000\+ builders/i);
    const figures = page.getByRole("region", { name: "Since AI Hackathon 2026 in figures" });
    await expect(figures).toContainText("15");
    await expect(figures).toContainText(/applications/i);
    await expect(figures).toContainText(/as of \d+ \w+ 2026/);

    // No countdown, no sticky Apply bar, no link to the sign-up form.
    await expect(main).not.toContainText(/until Since AI Hackathon 2026 begins|event is live/i);
    await expect(page.locator('a[href*="sinceai.app/sign-up"]').filter({ hasText: /apply/i })).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight * 0.4));
    await expect(page.getByRole("link", { name: /apply/i })).toHaveCount(0);

    // Next steps: community first, then the guide, the projects and partnering.
    const hero = page.locator("#hackathon-hero");
    await expect(hero.getByRole("link", { name: /Join the community/ })).toHaveAttribute("href", /discord\.gg/);
    await expect(hero.getByRole("link", { name: /Hackathon 2026 guide/ })).toHaveAttribute("href", "/hackathon-2026/guide");
    const next = page.getByRole("region", { name: "The next edition is not announced yet." });
    for (const [name, href] of [
      [/Field Guide/, "/hackathon-2026/guide"],
      [/Projects from Since AI Hackathon 2025/, "/projects"],
      [/production support/, "/production-support"],
      [/All Since AI events/, "/events"],
    ] as const) {
      await expect(next.getByRole("link", { name })).toHaveAttribute("href", href);
    }

    // The FAQ answers the two questions a visitor has after the event.
    for (const question of ["Can I still register for Since AI Hackathon 2026?", "Where are the results and the projects?"]) {
      const item = page.locator("details.faq-item").filter({ hasText: question });
      await item.locator("summary").click();
      await expect(item.locator("p")).toBeVisible();
    }
    await expect(page.locator("details.faq-item").filter({ hasText: "Can I still register" })).toContainText(
      "has ended and registration is closed",
    );
  });

  test("the site-wide call to action is to join Since AI, not to apply", async ({ page }) => {
    await page.goto("/about");
    const mobile = test.info().project.name.includes("mobile");
    if (mobile) await page.getByRole("button", { name: "Open menu" }).click();
    const scope = mobile ? page.getByRole("dialog", { name: "Navigation menu" }) : page.locator("header");
    await expect(scope.getByRole("link", { name: /Join Since AI/ })).toHaveAttribute("href", "https://sinceai.app/sign-up");
    await expect(scope.getByRole("link", { name: /apply/i })).toHaveCount(0);
  });

  test("the Events and FAQ pages describe Hackathon 2026 as finished in their structured data", async ({ page }) => {
    await page.goto("/events");
    const events = await eventsInJsonLd(page);
    expect(events.map((e) => e.name)).toEqual(["Since AI Hackathon 2026", "Since AI Hackathon"]);
    expect(events[0]?.description).toMatch(/took place on 6–8 November 2026/);

    await page.goto("/faq");
    await expect(page.getByRole("heading", { name: "When and where was Since AI Hackathon 2026?" })).toBeVisible();
    const jsonLd = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
    expect(jsonLd).toContain("The event has ended, and the dates of the next edition have not been announced.");
    expect(jsonLd).not.toMatch(/takes place November 6 to 8|targets 1,000\+/);
  });

  for (const route of ["/", "/hackathon", "/events"] as const) {
    test(`${route} has no WCAG 2.1 A/AA violations that axe can detect`, async ({ page }) => {
      await page.goto(route, { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});
