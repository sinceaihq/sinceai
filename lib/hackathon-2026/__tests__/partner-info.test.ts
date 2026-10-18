import {
  ACCOMMODATION_INTRO,
  ACCOMMODATION_OFFERS,
  DISCORD_CHECKLIST,
  DISCORD_INVITE,
  DISCORD_ROLE_GUIDES,
  DISCORD_GUIDE_PATH,
  DISCORD_NOTIFICATION_STEPS,
  DISCORD_TROUBLESHOOTING,
  discordSteps,
  offerOpen,
} from "@/lib/hackathon-2026";

const textOf = (v: unknown) => JSON.stringify(v);

describe("partner Discord onboarding", () => {
  it("uses the official invite", () => {
    expect(DISCORD_INVITE).toBe("https://discord.gg/vMWdrVUPws");
  });

  it("has the pre-event checklist and an illustrated six-step setup on its own page", () => {
    expect(DISCORD_CHECKLIST).toHaveLength(6);
    expect(DISCORD_GUIDE_PATH).toBe("/hackathon-2026/guide/discord");
    const steps = discordSteps("Anna | Valmet");
    expect(steps.map((s) => s.illustration)).toEqual(["invite", "account", "email", "welcome", "nickname", "channels"]);
    expect(textOf(steps)).toContain("Anna | Valmet");
    // Discord's own labels, exactly as its screens show them.
    for (const label of ["**Accept Invite**", "**Continue**", "**Verify Email**", "**Edit Server Profile**", "**Save Changes**"]) {
      expect(textOf(steps)).toContain(label);
    }
    expect(DISCORD_NOTIFICATION_STEPS.join(" ")).toMatch(/\*\*Notification Settings\*\*.*\*\*All Messages\*\*/);
  });

  it("answers the problems first-time users hit, matching the server's settings", () => {
    const text = textOf(DISCORD_TROUBLESHOOTING);
    expect(text).toMatch(/spam/);
    expect(text).toMatch(/at least five minutes old/);
    expect(text).toMatch(/work laptop or network/);
    expect(text).toMatch(/Nitro/);
    expect(DISCORD_TROUBLESHOOTING.every((t) => !t.a.includes("**"))).toBe(true);
  });

  it("gives challenge partners their challenge channel, and tech / visibility partners no challenge duties", () => {
    const cp = textOf(DISCORD_ROLE_GUIDES["challenge-partners"]);
    expect(cp).toContain("challenge channel");
    expect(cp).toContain("All Messages");
    const tech = textOf(DISCORD_ROLE_GUIDES.partners);
    expect(tech).not.toMatch(/challenge|judg|evaluat|teams ask/i);
    expect(tech).toMatch(/stand/);
    expect(tech).toMatch(/API access/);
    expect(tech).toContain("own partner channel");
  });

  it("never encourages mass pings", () => {
    for (const g of Object.values(DISCORD_ROLE_GUIDES)) expect(textOf(g.points)).toContain("don’t use @everyone or @here");
  });
});

describe("accommodation & discounted rates", () => {
  const byId = Object.fromEntries(ACCOMMODATION_OFFERS.map((o) => [o.id, o]));

  it("publishes exactly the five confirmed offers", () => {
    expect(ACCOMMODATION_OFFERS.map((o) => o.name)).toEqual([
      "Original Sokos Hotel Kupittaa",
      "Holiday Club Turun Caribia",
      "Omena Hotels Turku",
      "Scandic Turku",
      "Bob W",
    ]);
    expect(textOf(ACCOMMODATION_OFFERS)).not.toMatch(/Centro|sponsor/i);
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

  it("has Bob W's 10% with BOBWSINCEAI26 at bobw.co", () => {
    const o = byId["bob-w"];
    expect(o).toMatchObject({ benefit: "10% off apartments", code: "BOBWSINCEAI26" });
    expect(o.howTo).toContain("Apply voucher");
    expect(o.links[0].href).toBe("https://bobw.co/");
    expect(offerOpen(o, Date.parse("2026-11-06T12:00:00+02:00"))).toBe(true);
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
