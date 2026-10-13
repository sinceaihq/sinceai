import {
  formatTimeRange,
  BIOCITY_STANDS,
  briefingRoomLabel,
  CHALLENGE_COMPANIES,
  CHECKLISTS,
  companyMapIds,
  companySchedule,
  detailFor,
  DETAILS,
  EVENT_2026,
  findHotspot,
  getMap,
  formatTime,
  getCompany,
  getScheduleItem,
  GUIDES,
  NAMED_CHALLENGE_PARTNERS,
  OPEN_STAND_LABEL,
  PARTNER_CORNER,
  placeDetailFor,
  qaStandSentence,
  showroomCounter,
  qaLocationLabel,
  PLACES_3D,
  TARGETS_3D,
  TOURS_3D,
  SCHEDULE,
  scheduleFor,
  SHOWROOM_ORDER,
  standDisplayName,
  STAND_PARTNERS,
  TBA_CHALLENGE_PLACES,
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
    expect(formatTime(EVENT_2026.evaluationEnd)).toBe("13:00");
    expect(formatTime(EVENT_2026.closingCeremony)).toBe("13:30");
    expect(formatTime(EVENT_2026.finals)).toBe("14:00");
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

  it("runs Sunday as evaluation 10–13, company winners 13:30, finals 14:00 and an approximate end", () => {
    const evaluation = getScheduleItem("sun-evaluation");
    expect([formatTime(evaluation.start), formatTime(evaluation.end!)]).toEqual(["10:00", "13:00"]);
    expect(evaluation.status).toBe("confirmed");
    const closing = getScheduleItem("sun-closing");
    const finals = getScheduleItem("sun-finals");
    const end = getScheduleItem("sun-end");
    expect(formatTime(closing.start)).toBe("13:30");
    expect(formatTime(finals.start)).toBe("14:00");
    for (const item of [closing, finals, end]) expect(item.place).toBe("educity");
    expect(end.approx).toBe(true);
    expect(getScheduleItem("sun-voting").detail).toMatch(/10 votes.*10 different solutions/);
  });

  it("has Since AI set up the challenge partners' Joki stands", () => {
    const saturday = getScheduleItem("sat-cp-arrival");
    expect(saturday.status).toBe("confirmed");
    expect(saturday.note).toBeUndefined();
    expect(saturday.detail).toMatch(/Since AI has set up your Q&A stand/);
    expect(getScheduleItem("fri-cp-arrival").detail).toMatch(/stand materials/);
  });

  it("puts the challenge partner Q&A at Joki, Sat 09–12 and 14:30–18, with a break in between", () => {
    const am = getScheduleItem("sat-qa-morning");
    const pause = getScheduleItem("sat-qa-break");
    const pm = getScheduleItem("sat-qa-afternoon");
    for (const item of [am, pause, pm]) expect(item.place).toBe("joki");
    expect([formatTime(am.start), formatTime(am.end!)]).toEqual(["09:00", "12:00"]);
    expect([formatTime(pause.start), formatTime(pause.end!)]).toEqual(["12:00", "14:30"]);
    expect([formatTime(pm.start), formatTime(pm.end!)]).toEqual(["14:30", "18:00"]);
  });

  it("does not publish the unconfirmed Saturday enterprise presentation", () => {
    const text = JSON.stringify(SCHEDULE);
    expect(text).not.toMatch(/Equinix|Spinverse|enterprise/i);
    expect(SCHEDULE.some((i) => i.start.startsWith("2026-11-07T13:30"))).toBe(false);
  });

  it("completes team formation and challenge selection before the 17:00 opening (organiser, 13 Oct 2026)", () => {
    const formation = getScheduleItem("fri-team-formation");
    const selection = getScheduleItem("fri-challenge-selection");
    const opening = getScheduleItem("fri-opening");
    expect(formatTime(formation.start)).toBe("15:00");
    expect(Date.parse(formation.end!)).toBeLessThanOrEqual(Date.parse(opening.start));
    expect(Date.parse(selection.start)).toBeLessThanOrEqual(Date.parse(opening.start));
    // Listed before the opening, and no selection window after it (the old 17:45–18:05 one is obsolete).
    const fri = scheduleFor("builders").filter((i) => i.start.startsWith("2026-11-06"));
    expect(fri.findIndex((i) => i.id === "fri-challenge-selection")).toBeLessThan(fri.findIndex((i) => i.id === "fri-opening"));
    expect(JSON.stringify(SCHEDULE)).not.toMatch(/17:45|18:05|16:45|16:50|first come/);
    for (const id of ["fri-team-changes-close", "fri-team-lock"]) expect(() => getScheduleItem(id)).toThrow();
    // The window's opening time is not decided: say so rather than invent one.
    expect(selection.note).toMatch(/to be confirmed/);
  });

  it("introduces the companies from the stage, then the keynote; briefings 18:15–18:45, 19:00 at the latest", () => {
    const opening = getScheduleItem("fri-opening");
    expect(opening.detail).toMatch(/hosts introduce the challenge companies, then Jason Mayes/);
    expect(detailFor(opening, "challenge-partners")).toMatch(/do not present their challenges on stage/);
    const move = getScheduleItem("fri-move-to-briefings");
    expect([formatTime(move.start), formatTime(move.end!)]).toEqual(["17:50", "18:15"]);
    const briefings = getScheduleItem("fri-briefings");
    expect([formatTime(briefings.start), formatTime(briefings.end!)]).toEqual(["18:15", "18:45"]);
    expect(briefings.note).toMatch(/19:00/);
    expect(formatTime(EVENT_2026.briefingsLatestEnd)).toBe("19:00");
  });

  it("has the five finalist teams present live, never as recorded videos", () => {
    const finals = getScheduleItem("sun-finals");
    expect(finals.detail).toMatch(/five finalist teams.*live on stage/);
    expect(JSON.stringify(SCHEDULE)).not.toMatch(/pre-?recorded/i);
  });

  it("publishes the Mauno meal times (organiser, 13 Oct 2026) and no separate breakfasts", () => {
    const meals = SCHEDULE.filter((i) => i.kind === "meal").map((i) => [i.id, formatTimeRange(i)]);
    expect(meals).toEqual([
      ["fri-dinner", "18:30–21:30"],
      ["sat-lunch", "10:30–13:30"],
      ["sat-dinner", "17:00–20:00"],
      ["sun-lunch", "10:00–13:00"],
    ]);
  });

  it("tears visibility stands down after the event, not at the 10:00 deadline", () => {
    const teardown = getScheduleItem("sun-partner-teardown");
    expect(formatTime(teardown.start)).toBe("15:00");
    expect(teardown.place).toBe("biocity");
  });

  it("assigns venue roles correctly", () => {
    const roles = Object.fromEntries(VENUES.map((v) => [v.id, v.roles.join(" ")]));
    expect(roles.educity).toMatch(/Opening ceremony/);
    expect(roles.educity).toMatch(/Company challenge winners \(Sun 13:30\) and the finals \(Sun 14:00\)/);
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
  const corpus = JSON.stringify({ SCHEDULE, CHECKLISTS, DETAILS, GUIDES, VENUES, PLACES_3D, TARGETS_3D, TOURS_3D });

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

  it("has 13 named challenge partners and two places to be announced — 15 in all (organiser, 13 Oct 2026)", () => {
    expect(CHALLENGE_COMPANIES).toHaveLength(15);
    expect(NAMED_CHALLENGE_PARTNERS.map((c) => c.name).sort()).toEqual(
      [
        "Apetit",
        "Bayer",
        "Business Turku",
        "DNA",
        "Elisa",
        "Fonecta",
        "Forcit Group",
        "Lindström",
        "Meyer Turku",
        "Takomo Golf",
        "Traficom",
        "Turku Energia",
        "Valmet",
      ].sort(),
    );
    expect(TBA_CHALLENGE_PLACES.map((c) => c.id)).toEqual(["tba", "tba-2"]);
    for (const c of TBA_CHALLENGE_PLACES) expect(c.logo).toBeUndefined();
  });

  it("lists none of the former or unconfirmed 2026 challenge companies", () => {
    const text = JSON.stringify([CHALLENGE_COMPANIES, VENUE_MAPS, PLACES_3D, TARGETS_3D, TOURS_3D, GUIDES, DETAILS]);
    for (const name of ["Revvity", "Bo LKV", "Saarioinen", "Sandvik", "Kongsberg"]) expect(text).not.toContain(name);
  });

  it("keeps 15 distinct briefing rooms and 15 Q&A stands", () => {
    expect(new Set(CHALLENGE_COMPANIES.map((c) => briefingRoomLabel(c))).size).toBe(15);
    expect(CHALLENGE_COMPANIES.every((c) => c.qa.venue === "joki")).toBe(true);
  });

  it("marks the three reconciled positions provisional", () => {
    for (const id of ["fonecta", "tba", "tba-2"]) expect(getCompany(id)!.placementStatus).toBe("pending");
  });

  it("places the first to-be-announced place, Valmet and Traficom on Joki floor 2", () => {
    expect(byQaFloor(2)).toEqual(["To be announced (1)", "Traficom", "Valmet"]);
  });

  it("places six companies on Joki floor 3", () => {
    expect(byQaFloor(3)).toEqual([
      "Business Turku",
      "Fonecta",
      "Forcit Group",
      "Lindström",
      "Takomo Golf",
      "To be announced (2)",
    ]);
  });

  it("matches the canonical Friday briefing rooms", () => {
    const rooms = Object.fromEntries(
      CHALLENGE_COMPANIES.map((c) => [c.name, `${c.briefing.floor}:${briefingRoomLabel(c)}`]),
    );
    expect(rooms).toEqual({
      Elisa: "1:1001 Dromberg",
      Bayer: "1:1002 Moriaberg",
      "To be announced (1)": "1:1090 Ringsberg",
      Traficom: "1:1091 Hammarbacka",
      "Business Turku": "2:2072 Työkahvila / Aurinkokylpy",
      Fonecta: "2:2001 Elias",
      "Takomo Golf": "2:2002 Ivar",
      "Forcit Group": "2:2003 Erik",
      Lindström: "2:2004 Johannes",
      "To be announced (2)": "2:2067",
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

  it("ranks six stands: Red Hat, Solita, Pruna AI, BearingPoint, CSC / LUMI AI Factory, MLH", () => {
    expect(ranked.map((s) => s.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ranked.map((s) => standDisplayName(s))).toEqual([
      "Red Hat",
      "Solita",
      "Pruna AI",
      "BearingPoint",
      "CSC / LUMI AI Factory",
      "Major League Hacking",
    ]);
    expect(OPEN_STAND_LABEL).toBe("Visibility / Tech Partner stand");
  });

  it("gives each of the six visibility / tech partners exactly one stand, none a challenge partner", () => {
    expect(STAND_PARTNERS).toHaveLength(6);
    for (const p of STAND_PARTNERS) {
      expect(BIOCITY_STANDS.filter((s) => s.partnerId === p.id)).toHaveLength(1);
      expect(CHALLENGE_COMPANIES.some((c) => c.name === p.name)).toBe(false);
    }
  });

  it("does not claim MLH's on-site staffing, and keeps the layout provisional", () => {
    const mlh = STAND_PARTNERS.find((p) => p.id === "mlh")!;
    expect(mlh.status).toBe("working");
    expect(mlh.note).toMatch(/confirmed separately/);
    for (const stand of BIOCITY_STANDS) expect(stand.status).toBe("working");
  });

  it("groups every stand in the partner corner of the main lobby", () => {
    for (const stand of BIOCITY_STANDS) expect(stand.area).toBe(PARTNER_CORNER);
    expect(BIOCITY_STANDS).toHaveLength(6);
  });

  it("puts every stand in BioCity with a map position", () => {
    for (const stand of BIOCITY_STANDS) {
      expect(stand.venue).toBe("biocity");
      expect(findHotspot("biocity-lobby", stand.id)).toBeDefined();
    }
    expect(getMap("biocity-lobby").hotspots.some((h) => h.id === "bio-partner-corner")).toBe(true);
  });

  it("names the stand partner on the map", () => {
    const label = (id: string) => {
      const h = findHotspot("biocity-lobby", id)!;
      return `${h.label} — ${h.description}`;
    };
    expect(label("bc-1")).toMatch(/^Stand 1 · Red Hat — Main lobby · partner corner/);
    expect(label("bc-2")).toMatch(/^Stand 2 · Solita — Main lobby · partner corner/);
    expect(label("bc-3")).toMatch(/^Stand 3 · Pruna AI — Main lobby · partner corner/);
    expect(label("bc-4")).toMatch(/^Stand 4 · BearingPoint — Main lobby · partner corner/);
    expect(label("bc-5")).toMatch(/^Stand 5 · CSC \/ LUMI AI Factory — Main lobby · partner corner/);
    expect(label("bc-6")).toMatch(/^Stand 6 · Major League Hacking — Main lobby · partner corner/);
  });
});

describe("company schedule", () => {
  it("fills in the company's own room and stand", () => {
    const elisa = getCompany("elisa")!;
    const items = companySchedule(elisa);
    expect(items.map((i) => i.id)).toEqual(scheduleFor("challenge-partners").map((i) => i.id));
    const briefing = items.find((i) => i.id === "fri-briefings")!;
    expect(placeDetailFor(briefing, "challenge-partners")).toBe("Room 1001 Dromberg · floor 1");
    const arrival = items.find((i) => i.id === "sat-cp-arrival")!;
    expect(detailFor(arrival, "challenge-partners")).toContain("Showroom");
    expect(placeDetailFor(arrival, "challenge-partners")).toBe("Your stand · Floor 1 · Showroom");
  });

  it("numbers Showroom counters from the entrance", () => {
    expect(showroomCounter(getCompany("meyer-turku")!)).toBe(1);
    expect(showroomCounter(getCompany("bayer")!)).toBe(6);
    expect(showroomCounter(getCompany("valmet")!)).toBeUndefined();
    expect(qaStandSentence(getCompany("elisa")!)).toContain("counter 4 of 6");
    expect(findHotspot("joki-showroom", "elisa")?.description).toBe("Counter 4 of 6 from the entrance");
  });

  it("leaves the shared schedule untouched", () => {
    companySchedule(getCompany("valmet")!);
    expect(placeDetailFor(getScheduleItem("fri-briefings"), "challenge-partners")).toBe("Your assigned room");
    expect(detailFor(getScheduleItem("sat-cp-arrival"), "challenge-partners")).not.toMatch(/Your stand is/);
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
