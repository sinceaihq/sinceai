import {
  ACCOMMODATION_INTRO,
  ACCOMMODATION_OFFERS,
  DISCORD_CHECKLIST,
  DISCORD_INVITE,
  DISCORD_ROLE_GUIDES,
  discordSetupSteps,
  offerOpen,
} from "@/lib/hackathon-2026";

const textOf = (v: unknown) => JSON.stringify(v);

describe("partner Discord onboarding", () => {
  it("uses the official invite", () => {
    expect(DISCORD_INVITE).toBe("https://discord.gg/vMWdrVUPws");
  });

  it("has the pre-event checklist and a full first-time setup", () => {
    expect(DISCORD_CHECKLIST).toHaveLength(6);
    const steps = discordSetupSteps("Anna | Valmet");
    expect(steps).toHaveLength(9);
    expect(textOf(steps)).toContain("Anna | Valmet");
    expect(textOf(steps)).toContain("info@sinceai.fi");
  });

  it("gives challenge partners their challenge channel, and tech / visibility partners no challenge duties", () => {
    const cp = textOf(DISCORD_ROLE_GUIDES["challenge-partners"]);
    expect(cp).toContain("challenge channel");
    expect(cp).toContain("All Messages");
    const tech = textOf(DISCORD_ROLE_GUIDES.partners);
    expect(tech).not.toMatch(/challenge|judg|evaluat|teams ask/i);
    expect(tech).toMatch(/stand/);
    expect(tech).toMatch(/API access/);
  });

  it("never encourages mass pings", () => {
    for (const g of Object.values(DISCORD_ROLE_GUIDES)) expect(textOf(g.points)).toContain("don’t use @everyone or @here");
  });
});

describe("accommodation & discounted rates", () => {
  const byId = Object.fromEntries(ACCOMMODATION_OFFERS.map((o) => [o.id, o]));

  it("publishes exactly the four confirmed offers", () => {
    expect(ACCOMMODATION_OFFERS.map((o) => o.name)).toEqual([
      "Original Sokos Hotel Kupittaa",
      "Holiday Club Turun Caribia",
      "Omena Hotels Turku",
      "Scandic Turku",
    ]);
    expect(textOf(ACCOMMODATION_OFFERS)).not.toMatch(/Bob W|Centro|sponsor/i);
    expect(ACCOMMODATION_INTRO).toMatch(/not included/);
  });

  it("has Sokos Kupittaa's rates, code and deadline", () => {
    const o = byId["sokos-kupittaa"];
    expect(o.benefit).toBe("€112 / night single room · €132 / night double room");
    expect(o.code).toBe("BSINCEAI");
    expect(o.bookBy).toBe("2026-10-06T16:30:00+03:00");
    expect(o.links[0]).toEqual({
      label: "Book Original Sokos Hotel Kupittaa",
      href: "https://www.sokoshotels.fi/en/hotels/turku/original-sokos-hotel-kupittaa",
      primary: true,
    });
  });

  it("ends the Sokos rate at its deadline — never extended", () => {
    const o = byId["sokos-kupittaa"];
    expect(offerOpen(o, Date.parse("2026-10-06T16:29:00+03:00"))).toBe(true);
    expect(offerOpen(o, Date.parse("2026-10-06T16:30:00+03:00"))).toBe(false);
    expect(offerOpen(byId["omena-turku"], Date.parse("2026-11-06T12:00:00+02:00"))).toBe(true);
  });

  it("has Caribia's 20% and Omena's 15% with SINCEAI2026, and both Omena Turku hotels", () => {
    expect(byId["holiday-club-caribia"]).toMatchObject({ benefit: "20% off accommodation", code: "SINCEAI2026" });
    expect(byId["holiday-club-caribia"].links[0].href).toBe("https://www.holidayclubresorts.com/en/hotels-resorts/turun-caribia/");
    const omena = byId["omena-turku"];
    expect(omena.code).toBe("SINCEAI2026");
    expect(omena.benefit).toMatch(/^15% off/);
    expect(omena.howTo).toContain("I have a discount code");
    expect(omena.links.map((l) => l.href)).toEqual([
      "https://www.omenahotels.com/fi/hotellit/turku-humalistonkatu/",
      "https://www.omenahotels.com/fi/hotellit/turku-kauppiaskatu/",
    ]);
  });

  it("gives Scandic its dedicated link and no invented percentage", () => {
    const o = byId["scandic-turku"];
    expect(textOf(o)).not.toMatch(/\d+\s*%/);
    expect(o.code).toBeUndefined();
    expect(o.links).toEqual([
      { label: "View discounted Scandic rates", href: "https://www.scandichotels.com/fi?bookingCode=CGRO", primary: true },
      { label: "See Scandic hotels in Turku", href: "https://www.scandichotels.com/en/destinations/finland/turku" },
    ]);
  });
});
