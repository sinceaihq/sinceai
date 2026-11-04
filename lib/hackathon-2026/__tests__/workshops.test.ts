/**
 * @jest-environment node
 */
import {
  buildCalendar,
  formatTimeRange,
  getMap,
  getNowNext,
  getScheduleItem,
  getVenue,
  HUB_MILESTONE_IDS,
  MLH_HARDWARE_LINK,
  MLH_MAP_LINK,
  MLH_ON_SITE,
  STAND_PARTNERS,
  scheduleFor,
  WORKSHOP_BRING,
  WORKSHOP_CANT_ATTEND,
  WORKSHOP_MAP_LINK,
  WORKSHOP_PLACE,
  WORKSHOP_ROOM,
  WORKSHOP_ROOM_CONFIRMED,
  WORKSHOP_SEATING,
  WORKSHOP_SEATS_NOTE,
  WORKSHOPS,
  WORKSHOPS_VS_INTRO,
} from "@/lib/hackathon-2026";

const unfold = (ics: string) => ics.replace(/\r\n /g, "");
const all = JSON.stringify({ WORKSHOPS, WORKSHOP_SEATING, WORKSHOP_SEATS_NOTE, WORKSHOP_CANT_ATTEND, WORKSHOP_BRING });

describe("MLH workshops (Quinn Dines, 3 Nov 2026)", () => {
  it("runs GitHub Copilot Fri 20:30–21:00 and Google AI Studio Fri 21:00–21:30, Helsinki time", () => {
    const copilot = getScheduleItem("fri-mlh-copilot");
    const studio = getScheduleItem("fri-mlh-ai-studio");
    expect(copilot.title).toBe("GitHub Copilot Workshop");
    expect([copilot.start, copilot.end]).toEqual(["2026-11-06T20:30:00+02:00", "2026-11-06T21:00:00+02:00"]);
    expect(formatTimeRange(copilot)).toBe("20:30–21:00");
    expect(studio.title).toBe("Google AI Studio Workshop");
    expect([studio.start, studio.end]).toEqual(["2026-11-06T21:00:00+02:00", "2026-11-06T21:30:00+02:00"]);
    expect(formatTimeRange(studio)).toBe("21:00–21:30");
  });

  it("leaves MLH's introduction at 16:45–16:55 and the opening ceremony at 17:00–17:30", () => {
    const intro = getScheduleItem("fri-mlh-intro");
    expect(formatTimeRange(intro)).toBe("16:45–16:55");
    expect(intro.placeDetail).toBe("Lobby · Taidon portaat");
    const opening = getScheduleItem("fri-opening");
    expect(formatTimeRange(opening)).toBe("17:00–17:30");
    expect(opening.title).toBe("Opening ceremony");
    expect(WORKSHOPS_VS_INTRO).toMatch(/Separate from MLH's ten-minute introduction at 16:45/);
  });

  it("says what MLH's email says, hosted by MLH", () => {
    const [copilot, studio] = WORKSHOPS;
    expect(copilot.host).toBe("Major League Hacking (MLH)");
    expect(copilot.text).toBe(
      "Learn how to activate and use GitHub Copilot in your hackathon project, including an introduction to MCPs.",
    );
    expect(studio.text).toMatch(/Google AI Studio and Gemini.*create an API key, explore models and build AI features/);
    expect(WORKSHOP_BRING).toBe("Bring your laptop. Beginners are welcome.");
  });

  it("recommends one person per team — never a requirement, a booking or a guaranteed seat", () => {
    expect(WORKSHOP_SEATING).toBe(
      "Seats are limited. We recommend one person per team — share what you learn with your teammates. You don't need to attend to access the tools and setup guides.",
    );
    expect(WORKSHOP_SEATS_NOTE).toMatch(/Seats are not reserved/);
    expect(all).not.toMatch(/must attend|required to attend|attendance is required|ticket|register for the workshop|reserve (a|your) seat|guaranteed seat/i);
    expect(all).not.toMatch(/\b(300|400)\b/);
  });

  it("gives the tools without attending, with the providers' own eligibility", () => {
    const [copilot, studio] = WORKSHOPS;
    expect(copilot.link.href).toBe("https://mlh.link/github");
    expect(copilot.access).toMatch(/GitHub Student Developer Pack/);
    expect(copilot.access).toMatch(/approves|eligible/);
    expect(studio.link.href).toBe("https://mlh.link/gemini-aistudio");
    expect(studio.access).toMatch(/usage limits/);
    expect(studio.access).toMatch(/no special credits/);
    expect(all).not.toMatch(/unlimited|free credits for everyone|free for everyone/i);
    expect(WORKSHOP_CANT_ATTEND.title).toBe("Can't attend?");
    expect(WORKSHOP_CANT_ATTEND.text).toBe("Follow the setup guides or ask the MLH team for help.");
    const discord = WORKSHOP_CANT_ATTEND.help.find((h) => h.label === "Since AI Discord");
    expect(discord && "href" in discord && discord.href).toBe("https://discord.gg/vMWdrVUPws");
    // No promised stand hours or Discord posts.
    expect(JSON.stringify(WORKSHOP_CANT_ATTEND)).not.toMatch(/\d{1,2}:\d{2}/);
    expect(JSON.stringify(WORKSHOP_CANT_ATTEND)).toMatch(/once it opens/);
  });

  it("holds both in Presidenttiauditorio, BioCity (organiser, 4 Nov 2026), linked to the room on the map", () => {
    expect(WORKSHOP_ROOM).toEqual({ status: "confirmed", name: "Presidenttiauditorio", seats: 258, hotspotId: "bio-presidenttiauditorio" });
    expect(WORKSHOP_ROOM_CONFIRMED).toBe(true);
    expect(WORKSHOP_PLACE).toBe("Presidenttiauditorio");
    expect(WORKSHOP_MAP_LINK).toEqual({
      label: "View room on map",
      href: "/hackathon-2026/guide/venue#place-bio-presidenttiauditorio",
    });
    expect(getVenue("biocity").address).toBe("Tykistökatu 6");
    for (const w of WORKSHOPS) {
      const item = getScheduleItem(w.scheduleId);
      expect(item.place).toBe("biocity");
      expect(item.placeDetail).toBe("Presidenttiauditorio");
      expect(item.link).toEqual(WORKSHOP_MAP_LINK);
      expect(JSON.stringify(item)).not.toMatch(/to be confirmed|proposed|TBC/i);
    }
    expect(WORKSHOP_SEATS_NOTE).toBe(
      "Presidenttiauditorio has 258 seats — fewer than there are builders. Seats are not reserved, and the room's safe capacity applies.",
    );
  });

  it("puts exactly two MLH workshops in the schedule, both on Friday 6 November", () => {
    const workshops = scheduleFor().filter((i) => /Workshop$/.test(i.title));
    expect(workshops.map((i) => i.id)).toEqual(["fri-mlh-copilot", "fri-mlh-ai-studio"]);
    for (const i of workshops) expect(i.start.slice(0, 10)).toBe("2026-11-06");
  });

  it("is in the builders' schedule, the hub's milestones and the builders' calendar file", () => {
    const builders = scheduleFor("builders").map((i) => i.id);
    expect(builders).toEqual(expect.arrayContaining(["fri-mlh-copilot", "fri-mlh-ai-studio"]));
    expect(builders.indexOf("fri-mlh-copilot")).toBeLessThan(builders.indexOf("fri-mlh-ai-studio"));
    expect(HUB_MILESTONE_IDS).toEqual(expect.arrayContaining(["fri-mlh-copilot", "fri-mlh-ai-studio"]));
    const ics = unfold(buildCalendar("builders"));
    expect(ics).toContain("SUMMARY:Since AI · GitHub Copilot Workshop");
    expect(ics).toContain("SUMMARY:Since AI · Google AI Studio Workshop");
    expect(ics).toContain("UID:fri-mlh-copilot.builders@sinceai.ai\r\nDTSTAMP:20261104T000000Z\r\nDTSTART:20261106T183000Z\r\nDTEND:20261106T190000Z");
    expect(ics).toContain("DTSTART:20261106T190000Z\r\nDTEND:20261106T193000Z");
    expect(ics).toMatch(/Presidenttiauditorio/);
    expect(ics).toContain("LOCATION:BioCity · Presidenttiauditorio\\, Tykistökatu 6\\, 20520 Turku");
  });

  it("shows in now / next before, during and after the workshops", () => {
    const items = scheduleFor("builders");
    const at = (iso: string) => getNowNext(items, Date.parse(iso));
    const before = at("2026-11-06T20:20:00+02:00");
    expect(before.phase === "during" && before.next?.id).toBe("fri-mlh-copilot");
    const during = at("2026-11-06T20:45:00+02:00");
    expect(during.phase === "during" && during.now.map((i) => i.id)).toContain("fri-mlh-copilot");
    expect(during.phase === "during" && during.next?.id).toBe("fri-mlh-ai-studio");
    const second = at("2026-11-06T21:10:00+02:00");
    expect(second.phase === "during" && second.now.map((i) => i.id)).toContain("fri-mlh-ai-studio");
    expect(second.phase === "during" && second.now.map((i) => i.id)).not.toContain("fri-mlh-copilot");
    const after = at("2026-11-06T21:31:00+02:00");
    expect(after.phase === "during" && after.now.map((i) => i.id)).not.toContain("fri-mlh-ai-studio");
  });
});

describe("Presidenttiauditorio on the BioCity plan", () => {
  const map = getMap("biocity-lobby");
  const room = map.hotspots.find((h) => h.id === "bio-presidenttiauditorio")!;

  it("is a location with its Finnish name, 258 seats and the workshops it hosts", () => {
    expect(room.label).toBe("Presidenttiauditorio");
    expect(room.description).toBe(
      "BioCity · Auditorium · 258 seats · Workshops: MLH Fri 20:30–21:30, BearingPoint Sat 12:00–12:30",
    );
    expect(map.alt).toMatch(/Presidenttiauditorio \(258 seats\)/);
    expect(map.source).toBe("Turun Teknologiakiinteistöt floor plan");
  });

  it("sits in the seating fan in the plan's upper-left, clear of every other marker", () => {
    // The fan spans roughly x 0.28–0.47, y 0.04–0.30 of the plan (Turun Teknologiakiinteistöt, 4 Jun 2026).
    expect(room.x).toBeGreaterThan(0.3);
    expect(room.x).toBeLessThan(0.42);
    expect(room.y).toBeGreaterThan(0.06);
    expect(room.y).toBeLessThan(0.24);
    for (const other of map.hotspots.filter((h) => h !== room)) {
      expect(Math.hypot(other.x - room.x, other.y - room.y)).toBeGreaterThan(0.1);
    }
  });

  it("keeps every existing BioCity marker: entrance, seven stands, build area, food and the way to Joki", () => {
    const ids = map.hotspots.map((h) => h.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "bio-event-entrance",
        "bio-main-entrance",
        "bio-partner-corner",
        ...["1", "2", "3", "4", "5", "6", "7"].map((n) => `stand-bc-${n}`),
        "bio-build-hall",
        "bio-food-line",
        "bio-joki-passage",
      ]),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("MLH at Since AI (organiser, 4 Nov 2026)", () => {
  const text = JSON.stringify(MLH_ON_SITE);

  it("has hardware, giveaways, workshops and help — in BioCity's MLH area", () => {
    expect(MLH_ON_SITE.items.map((i) => i.id)).toEqual(["hardware", "giveaways", "workshops", "help"]);
    expect(MLH_ON_SITE.location).toBe("BioCity · MLH area");
    expect(MLH_ON_SITE.representatives).toBe(2);
    expect(text).toMatch(/Two MLH team members are on site in BioCity/);
    expect(STAND_PARTNERS.find((p) => p.id === "mlh")!.note).toMatch(/^Two MLH team members on site/);
  });

  it("gives away at least 50 Arduino UNO Q boards — with no invented mechanics", () => {
    expect(MLH_ON_SITE.giveawayMinimum).toBe(50);
    const giveaway = MLH_ON_SITE.items.find((i) => i.id === "giveaways")!.text;
    expect(giveaway).toMatch(/^At least 50 Arduino UNO Q boards to give away during the event/);
    expect(text).not.toMatch(/\b10\b|ten Arduino|4GB|exactly/i);
    expect(text).not.toMatch(/first come|first-come|raffle|draw|winner|register|sign up|eligib|one per|every participant|hurry|only \d+ left/i);
  });

  it("keeps borrowed lab hardware apart from the giveaways", () => {
    expect(MLH_ON_SITE.items.find((i) => i.id === "hardware")!.text).toMatch(/on loan/);
    expect(MLH_ON_SITE.items.find((i) => i.id === "giveaways")!.text).toMatch(/separate from the lab's loan hardware/);
    expect(MLH_ON_SITE.items.find((i) => i.id === "hardware")!.text).not.toMatch(/free|keep|giveaway/i);
  });

  it("links to MLH's own hardware page and to MLH's stand on the BioCity plan", () => {
    expect(MLH_HARDWARE_LINK).toEqual({ label: "Explore hardware resources", href: "https://www.mlh.com/resources/hardware" });
    expect(MLH_MAP_LINK).toEqual({ label: "Find MLH on the map", href: "/hackathon-2026/guide/venue#place-stand-bc-6" });
    expect(getMap("biocity-lobby").hotspots.some((h) => h.id === "stand-bc-6")).toBe(true);
  });

  it("names the workshops' room and times without repeating their descriptions", () => {
    expect(MLH_ON_SITE.items.find((i) => i.id === "workshops")!.text).toBe(
      "Friday 20:30 — GitHub Copilot · 21:00 — Google AI Studio, in Presidenttiauditorio.",
    );
    for (const w of WORKSHOPS) expect(text).not.toContain(w.text);
  });
});

describe("BearingPoint workshop (organiser, 4 Nov 2026)", () => {
  it("is Saturday 12:00–12:30 in Presidenttiauditorio, confirmed, with BearingPoint's description", () => {
    const item = getScheduleItem("sat-bearingpoint-workshop");
    expect(item.title).toBe("BearingPoint Workshop – From AI Prototype to Business Impact");
    expect([item.start, item.end]).toEqual(["2026-11-07T12:00:00+02:00", "2026-11-07T12:30:00+02:00"]);
    expect(formatTimeRange(item)).toBe("12:00–12:30");
    expect(item.place).toBe("biocity");
    expect(item.placeDetail).toBe("Presidenttiauditorio");
    expect(item.status).toBe("confirmed");
    expect(item.tag).toBe("Workshop");
    expect(item.detail).toBe(
      "Hosted by BearingPoint. Learn how to turn an AI prototype into real business impact with BearingPoint. Discover practical ways to transform innovative ideas into valuable real-world solutions.",
    );
    expect(JSON.stringify(item)).not.toMatch(/planned|to be confirmed|tentative/i);
    expect(item.link).toEqual({ label: "View room on map", href: "/hackathon-2026/guide/venue#place-bio-presidenttiauditorio" });
  });

  it("is in the builders' and partners' schedules once, never at the superseded 15:00 stand slot", () => {
    for (const audience of ["builders", "partners"] as const) {
      const bp = scheduleFor(audience).filter((i) => /BearingPoint/i.test(i.title));
      expect(bp.map((i) => i.id)).toEqual(["sat-bearingpoint-workshop"]);
    }
    expect(JSON.stringify(scheduleFor())).not.toMatch(/T15:00:00\+02:00","end":"2026-11-07T15:30/);
    expect(HUB_MILESTONE_IDS).toContain("sat-bearingpoint-workshop");
  });

  it("is in the calendar files at 10:00–10:30 UTC, confirmed, in the room", () => {
    for (const audience of ["builders", "partners"] as const) {
      const ics = unfold(buildCalendar(audience));
      expect(ics).toContain(
        `UID:sat-bearingpoint-workshop.${audience}@sinceai.ai\r\nDTSTAMP:20261104T000000Z\r\nDTSTART:20261107T100000Z\r\nDTEND:20261107T103000Z\r\nSUMMARY:Since AI · BearingPoint Workshop – From AI Prototype to Business Impact`,
      );
      const event = ics.split("BEGIN:VEVENT").find((e) => e.includes("UID:sat-bearingpoint-workshop"))!;
      expect(event).toContain("STATUS:CONFIRMED");
      expect(event).toContain("LOCATION:BioCity · Presidenttiauditorio\\, Tykistökatu 6\\, 20520 Turku");
    }
  });

  it("never overlaps another session in Presidenttiauditorio", () => {
    const inRoom = scheduleFor().filter((i) => i.placeDetail === "Presidenttiauditorio");
    expect(inRoom.map((i) => i.id)).toEqual(["fri-mlh-copilot", "fri-mlh-ai-studio", "sat-bearingpoint-workshop"]);
    for (let i = 1; i < inRoom.length; i++) {
      expect(Date.parse(inRoom[i].start)).toBeGreaterThanOrEqual(Date.parse(inRoom[i - 1].end!));
    }
  });
});
