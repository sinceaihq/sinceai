import {
  BIOCITY_STANDS,
  briefingRoomLabel,
  CHALLENGE_COMPANIES,
  CHECKLISTS,
  companyMapIds,
  DETAILS,
  EVENT_2026,
  findHotspot,
  formatTime,
  getScheduleItem,
  getStandPartner,
  GUIDES,
  OPEN_STAND_LABEL,
  qaLocationLabel,
  SCENES_3D,
  SCHEDULE,
  scheduleFor,
  SHOWROOM_ORDER,
  standDisplayName,
  STAND_PARTNERS,
  VENUE_MAPS,
  VENUES,
} from "@/lib/hackathon-2026";

const byQaFloor = (floor: 1 | 2 | 3) =>
  CHALLENGE_COMPANIES.filter((c) => c.qa.floor === floor)
    .map((c) => c.name)
    .sort();

describe("canonical event facts", () => {
  it("uses the 3 Oct 2026 operational times (Turku time)", () => {
    expect(formatTime(EVENT_2026.builderRegistration)).toBe("15:00");
    expect(formatTime(EVENT_2026.officialOpening)).toBe("17:00");
    expect(formatTime(EVENT_2026.submissionDeadline)).toBe("10:00");
    expect(formatTime(EVENT_2026.closingCeremony)).toBe("13:00");
    expect(formatTime(EVENT_2026.challengeAwardsApprox)).toBe("14:00");
    expect(formatTime(EVENT_2026.eventEnd)).toBe("15:00");
  });

  it("keeps builder registration separate from the official opening", () => {
    const registration = getScheduleItem("fri-registration");
    const opening = getScheduleItem("fri-opening");
    expect(formatTime(registration.start)).toBe("15:00");
    expect(formatTime(opening.start)).toBe("17:00");
    expect(opening.audiences).toEqual(
      expect.arrayContaining(["builders", "challenge-partners", "partners", "judges", "speakers"]),
    );
  });

  it("marks the company challenge awards as approximate", () => {
    const awards = getScheduleItem("sun-challenge-awards");
    expect(awards.approx).toBe(true);
    expect(awards.place).toBe("educity");
  });

  it("puts the challenge partner Q&A at Joki, Sat 09–12 and 14–18", () => {
    const am = getScheduleItem("sat-qa-morning");
    const pm = getScheduleItem("sat-qa-afternoon");
    for (const item of [am, pm]) expect(item.place).toBe("joki");
    expect([formatTime(am.start), formatTime(am.end!)]).toEqual(["09:00", "12:00"]);
    expect([formatTime(pm.start), formatTime(pm.end!)]).toEqual(["14:00", "18:00"]);
  });

  it("leaves unresolved meal end times unpublished", () => {
    expect(getScheduleItem("fri-dinner").end).toBeUndefined();
    expect(getScheduleItem("fri-dinner").endPending).toBe(true);
    expect(getScheduleItem("sun-breakfast").end).toBeUndefined();
    expect(getScheduleItem("sun-breakfast").endPending).toBe(true);
  });

  it("tears visibility stands down after the event, not at the 10:00 deadline", () => {
    const teardown = getScheduleItem("sun-partner-teardown");
    expect(formatTime(teardown.start)).toBe("15:00");
    expect(teardown.place).toBe("biocity");
  });

  it("assigns venue roles correctly", () => {
    const roles = Object.fromEntries(VENUES.map((v) => [v.id, v.roles.join(" ")]));
    expect(roles.educity).toMatch(/Opening ceremony/);
    expect(roles.educity).toMatch(/Closing ceremony/);
    expect(roles.educity).toMatch(/briefings/);
    expect(roles.biocity).toMatch(/Build/);
    expect(roles.biocity).toMatch(/partner stands/);
    expect(roles.joki).toMatch(/Q&A/);
    expect(VENUES.find((v) => v.id === "educity")!.openAroundTheClock).toBe(false);
    expect(VENUES.find((v) => v.id === "biocity")!.openAroundTheClock).toBe(true);
    expect(VENUES.find((v) => v.id === "joki")!.openAroundTheClock).toBe(true);
  });

  it("uses the verified public addresses", () => {
    const address = Object.fromEntries(VENUES.map((v) => [v.id, `${v.address}, ${v.postalCode} ${v.city}`]));
    expect(address.educity).toBe("Joukahaisenkatu 7, 20520 Turku");
    expect(address.biocity).toBe("Tykistökatu 6, 20520 Turku");
    expect(address.joki).toBe("Lemminkäisenkatu 12b, 20520 Turku");
  });
});

describe("guide copy never repeats retired or private information", () => {
  const corpus = JSON.stringify({ SCHEDULE, CHECKLISTS, DETAILS, GUIDES, VENUES, SCENES_3D });

  it("does not claim a 72-hour operational duration", () => {
    expect(corpus).not.toMatch(/72[\s-]*(h\b|hours?)/i);
  });

  it("does not carry old schedule times", () => {
    expect(corpus).not.toMatch(/14:10/);
    expect(corpus).not.toMatch(/17:20/);
    expect(corpus).not.toMatch(/09:45/);
    for (const item of SCHEDULE) {
      expect(formatTime(item.start)).not.toBe("16:00");
    }
  });

  it("contains no phone numbers or personal e-mail addresses", () => {
    expect(corpus).not.toMatch(/\+358/);
    // Only the public organisational address may appear.
    const emails = corpus.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [];
    expect(emails.every((e) => e === "info@sinceai.fi")).toBe(true);
  });
});

describe("challenge companies", () => {
  it("has the 15 companies exactly once", () => {
    expect(CHALLENGE_COMPANIES).toHaveLength(15);
    expect(new Set(CHALLENGE_COMPANIES.map((c) => c.id)).size).toBe(15);
    expect(new Set(CHALLENGE_COMPANIES.map((c) => c.name)).size).toBe(15);
  });

  it("places the six Showroom companies on Joki floor 1", () => {
    expect(byQaFloor(1)).toEqual(["Apetit", "Bayer", "DNA", "Elisa", "Meyer Turku", "Turku Energia"]);
    expect([...SHOWROOM_ORDER].sort()).toEqual(
      CHALLENGE_COMPANIES.filter((c) => c.qa.floor === 1)
        .map((c) => c.id)
        .sort(),
    );
  });

  it("places Revvity, Valmet and Traficom on Joki floor 2", () => {
    expect(byQaFloor(2)).toEqual(["Revvity", "Traficom", "Valmet"]);
  });

  it("places six companies on Joki floor 3", () => {
    expect(byQaFloor(3)).toEqual([
      "Bo LKV",
      "Business Turku",
      "Forcit Group",
      "Lindström",
      "Saarioinen",
      "Takomo Golf",
    ]);
  });

  it("matches the canonical Friday briefing rooms", () => {
    const rooms = Object.fromEntries(
      CHALLENGE_COMPANIES.map((c) => [c.name, `${c.briefing.floor}:${briefingRoomLabel(c)}`]),
    );
    expect(rooms).toEqual({
      Elisa: "1:1001 Dromberg",
      Bayer: "1:1002 Moriaberg",
      Revvity: "1:1090 Ringsberg",
      Traficom: "1:1091 Hammarbacka",
      "Business Turku": "2:2072 Työkahvila / Aurinkokylpy",
      "Bo LKV": "2:2001 Elias",
      "Takomo Golf": "2:2002 Ivar",
      "Forcit Group": "2:2003 Erik",
      Lindström: "2:2004 Johannes",
      Saarioinen: "2:2067",
      Valmet: "2:2006 / 2007",
      DNA: "2:2026 Orvokki",
      "Turku Energia": "2:2029 / 2031",
      "Meyer Turku": "2:2030 Evert",
      Apetit: "2:2027 Frans",
    });
  });

  it("has a map hotspot for every briefing room and Q&A stand", () => {
    for (const company of CHALLENGE_COMPANIES) {
      const maps = companyMapIds(company);
      expect(findHotspot(maps.briefing, company.id)).toBeDefined();
      expect(findHotspot(maps.qa, company.id)).toBeDefined();
    }
  });

  it("labels Q&A locations readably", () => {
    const elisa = CHALLENGE_COMPANIES.find((c) => c.id === "elisa")!;
    const valmet = CHALLENGE_COMPANIES.find((c) => c.id === "valmet")!;
    expect(qaLocationLabel(elisa)).toBe("Joki · Floor 1 · Showroom");
    expect(qaLocationLabel(valmet)).toBe("Joki · Floor 2");
  });
});

describe("BioCity visibility & tech partner stands", () => {
  const ranked = [...BIOCITY_STANDS].sort((a, b) => a.rank - b.rank);

  it("gives Red Hat the most visible stand and Solita the second", () => {
    expect(ranked[0].rank).toBe(1);
    expect(getStandPartner(ranked[0])?.name).toBe("Red Hat");
    expect(ranked[1].rank).toBe(2);
    expect(getStandPartner(ranked[1])?.name).toBe("Solita");
  });

  it("keeps every other stand open and labelled generically", () => {
    for (const stand of ranked.slice(2)) {
      expect(stand.partnerId).toBeNull();
      expect(standDisplayName(stand)).toBe(OPEN_STAND_LABEL);
    }
    expect(OPEN_STAND_LABEL).toBe("Visibility / Tech Partner stand");
  });

  it("has only Red Hat and Solita as stand partners for now", () => {
    expect(STAND_PARTNERS.map((p) => p.name)).toEqual(["Red Hat", "Solita"]);
  });

  it("puts every stand in BioCity with a map position", () => {
    for (const stand of BIOCITY_STANDS) {
      expect(stand.venue).toBe("biocity");
      expect(findHotspot("biocity-lobby", stand.id)).toBeDefined();
    }
  });
});

describe("maps", () => {
  it("keeps hotspots inside the image", () => {
    for (const map of VENUE_MAPS) {
      for (const h of map.hotspots) {
        expect(h.x).toBeGreaterThanOrEqual(0);
        expect(h.x).toBeLessThanOrEqual(1);
        expect(h.y).toBeGreaterThanOrEqual(0);
        expect(h.y).toBeLessThanOrEqual(1);
      }
      expect(new Set(map.hotspots.map((h) => h.id)).size).toBe(map.hotspots.length);
      expect(map.alt.length).toBeGreaterThan(40);
    }
  });
});

describe("publishability", () => {
  it("never renders do_not_publish schedule items", () => {
    for (const audience of ["builders", "challenge-partners", "partners", "judges", "speakers"] as const) {
      expect(scheduleFor(audience).every((i) => i.status !== "do_not_publish")).toBe(true);
    }
  });

  it("returns each audience's schedule in chronological order", () => {
    for (const audience of ["builders", "challenge-partners", "partners", "judges", "speakers"] as const) {
      const timed = scheduleFor(audience).filter((i) => !i.allDay);
      const starts = timed.map((i) => Date.parse(i.start));
      expect(starts).toEqual([...starts].sort((a, b) => a - b));
    }
  });
});
