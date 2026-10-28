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
  it("uses the operational times of the 14 Oct 2026 production update (Turku time)", () => {
    expect(formatTime(EVENT_2026.builderRegistration)).toBe("15:00");
    expect(formatTime(EVENT_2026.officialOpening)).toBe("17:00");
    expect(formatTime(EVENT_2026.submissionDeadline)).toBe("10:00");
    expect(formatTime(EVENT_2026.evaluationEnd)).toBe("13:00");
    expect(formatTime(EVENT_2026.closingCeremony)).toBe("13:15");
    expect(formatTime(EVENT_2026.challengeResults)).toBe("13:30");
    expect(formatTime(EVENT_2026.finals)).toBe("14:00");
    expect(formatTime(EVENT_2026.eventEnd)).toBe("15:30");
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

  it("runs Sunday: arrival 08:45, evaluation 10–13, finalists 12:00, ceremony 13:15, top three 13:30, finals 14:00–15:10, end ~15:30", () => {
    const evaluation = getScheduleItem("sun-evaluation");
    expect([formatTime(evaluation.start), formatTime(evaluation.end!)]).toEqual(["10:00", "13:00"]);
    expect(evaluation.status).toBe("confirmed");
    const closing = getScheduleItem("sun-closing");
    const finals = getScheduleItem("sun-finals");
    const end = getScheduleItem("sun-end");
    const ceremony = getScheduleItem("sun-closing-ceremony");
    expect(formatTime(ceremony.start)).toBe("13:15");
    expect(ceremony.detail).toMatch(/at most ten minutes/);
    expect(formatTimeRange(closing)).toBe("13:30–14:00");
    expect(formatTimeRange(finals)).toBe("14:00–15:10");
    for (const item of [ceremony, closing, finals, end]) expect(item.place).toBe("educity");
    expect(formatTime(end.start)).toBe("15:30");
    expect(end.approx).toBe(true);
    expect(end.detail).toMatch(/around 15:30/);
    expect(closing.detail).toMatch(/top three teams.*at most two minutes per company, all 15 challenges within 30 minutes/);
    expect(finals.detail).toMatch(/at most four minutes.*up to six minutes of questions from the jury.*five-minute break/);
    // Five judges share the Q&A: no promise of one question per judge.
    expect(JSON.stringify(finals)).not.toMatch(/from each judge/);
    expect(evaluation.detail).toMatch(/top three teams by 13:00/);
    const finalistsStage = getScheduleItem("sun-finalists-stage");
    expect(formatTime(finalistsStage.start)).toBe("13:00");
    expect(finalistsStage.detail).toMatch(/Front-row seats/);
    const arrival = getScheduleItem("sun-cp-arrival");
    expect(formatTime(arrival.start)).toBe("08:45");
    expect(arrival.audiences).toEqual(["challenge-partners", "judges"]);
    const voting = getScheduleItem("sun-voting");
    expect([formatTime(voting.start), formatTime(voting.end!)]).toEqual(["10:00", "12:00"]);
    expect(voting.detail).toMatch(/two solutions at a time.*complete 20 comparisons/);
    expect(voting.detail).toMatch(/five highest-ranked projects from five different company challenges/);
    expect(JSON.stringify(SCHEDULE)).not.toMatch(/ten solutions|most votes|most-voted/);
    expect(formatTime(getScheduleItem("sun-finalists").start)).toBe("12:00");
    expect(formatTime(getScheduleItem("sun-evaluator-arrival").start)).toBe("09:00");
    expect(formatTime(getScheduleItem("sun-evaluation-ready").start)).toBe("09:45");
    const move = getScheduleItem("sun-move-to-educity");
    expect(formatTime(move.start)).toBe("12:30");
    expect(move.approx).toBeUndefined();
    expect(move.detail).toMatch(/before the closing ceremony starts at 13:15/);
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

  it("runs Thursday and Friday by the Tech Team Implementation Guide v1.2 (25 Oct 2026)", () => {
    const summaries = getScheduleItem("thu-challenge-summaries");
    expect(summaries.start).toBe("2026-11-05T15:00:00+02:00");
    expect(summaries.detail).toMatch(/Public-safe summaries/);
    expect(summaries.detail).toMatch(/top three teams €2,000, €750 and €250.*FORCIT Group's Drill and Blast Cycle Intelligence: €3,000, €1,500 and €500/);
    const mlh = getScheduleItem("fri-mlh-intro");
    expect([formatTime(mlh.start), formatTime(mlh.end!)]).toEqual(["16:45", "16:55"]);
    expect(mlh.title).toBe("Major League Hacking: Introduction & Hacker Resources");
    expect(mlh.placeDetail).toBe("Lobby · Taidon portaat");
    expect(EVENT_2026.mlhIntroduction).toBe("2026-11-06T16:45:00+02:00");
    // The opening still starts at exactly 17:00; the stage is clear from 16:55 (organiser, 28 Oct 2026).
    expect(getScheduleItem("fri-opening").start).toBe("2026-11-06T17:00:00+02:00");
    expect(Date.parse(mlh.end!)).toBeLessThan(Date.parse(getScheduleItem("fri-opening").start));
    expect(EVENT_2026.challengePreview).toBe("2026-11-05T15:00:00+02:00");
    const formation = getScheduleItem("fri-team-formation");
    expect([formatTime(formation.start), formatTime(formation.end!)]).toEqual(["15:00", "16:45"]);
    const lock = getScheduleItem("fri-team-lock");
    expect(formatTime(lock.start)).toBe("16:45");
    expect(lock.kind).toBe("deadline");
    expect(lock.detail).toMatch(/can still be marked ready and select its challenge until 17:30/);
    const selection = getScheduleItem("fri-challenge-selection");
    expect([formatTime(selection.start), formatTime(selection.end!)]).toEqual(["15:00", "17:30"]);
    expect(selection.detail).toMatch(/marks the team as ready/);
    expect(selection.detail).toMatch(/final and cannot be changed/);
    expect(selection.place).toBe("app");
    const routes = getScheduleItem("fri-routes");
    expect(formatTime(routes.start)).toBe("17:30");
    expect(routes.detail).toMatch(/no new selections are accepted/);
    expect(formatTime(EVENT_2026.challengeSelectionOpens)).toBe("15:00");
    expect(formatTime(EVENT_2026.teamFormationCloses)).toBe("16:45");
    expect(formatTime(EVENT_2026.challengeSelectionCloses)).toBe("17:30");
    expect(formatTime(EVENT_2026.fullChallengeMaterials)).toBe("19:30");
    expect(getScheduleItem("fri-build-start").detail).toMatch(/19:30 the full challenge view.*only for the teams that chose that company/);
    // Superseded: the 17:00–17:30 window, the team owner wording, the 16:50 split and the Friday preview with templates.
    // Nothing starts at 16:50 any more: the MLH introduction moved to 16:45–16:55 (organiser, 28 Oct 2026).
    const text = JSON.stringify({ SCHEDULE, DETAILS, CHECKLISTS });
    expect(text).not.toMatch(/17:45|17:50|18:05|before 17:00|selects the challenge in sinceai.app before 17:30|team's owner|evenly as possible|its template is open/i);
    expect(SCHEDULE.filter((i) => i.start.endsWith("T16:50:00+02:00")).map((i) => i.id)).toEqual([]);
    expect(text).not.toMatch(/16:50[^"]{0,80}(capacity|split|places)/i);
    expect(SCHEDULE.some((i) => i.id === "fri-challenge-preview")).toBe(false);
  });

  it("sets the challenge partners' Friday and Saturday evening briefings", () => {
    expect(formatTime(getScheduleItem("fri-cp-weekend-briefing").start)).toBe("15:45");
    const saturday = getScheduleItem("fri-cp-saturday-briefing");
    expect(formatTime(saturday.start)).toBe("19:45");
    expect(saturday.detail).toMatch(/same room as the 15:45 weekend briefing/);
    const sunday = getScheduleItem("sat-cp-sunday-briefing");
    expect(formatTime(sunday.start)).toBe("18:15");
    expect(sunday.placeDetail).toBe("Floor 3 · the round room");
    expect(sunday.detail).toMatch(/08:45.*top three teams by 13:00/);
  });

  it("receives the partners 16:20–17:00 and sets the BioCity stands up from 18:30", () => {
    expect(formatTimeRange(getScheduleItem("fri-partner-arrival"))).toBe("16:20–17:00");
    const setup = getScheduleItem("fri-partner-setup");
    expect(formatTime(setup.start)).toBe("18:30");
    // Who builds which stand is still being confirmed with the partners.
    expect(setup.status).toBe("working");
    expect(setup.detail).toMatch(/confirms with you directly/);
  });

  it("reads the company introductions, then Jason Mayes 17:30–18:30; move 18:30, briefings 18:50–19:30 (hard end)", () => {
    const opening = getScheduleItem("fri-opening");
    expect(formatTimeRange(opening)).toBe("17:00–17:30");
    expect(opening.detail).toMatch(/hosts welcome everyone and read out the introductions of the company challenges/);
    const keynote = getScheduleItem("fri-keynote");
    expect(formatTimeRange(keynote)).toBe("17:30–18:30");
    expect(keynote.detail).toMatch(/30-minute keynote followed by a 30-minute tech talk/);
    expect(detailFor(opening, "challenge-partners")).toMatch(/at most a minute per company/);
    expect(detailFor(opening, "challenge-partners")).toMatch(/do not present on stage/);
    const move = getScheduleItem("fri-move-to-briefings");
    expect([formatTime(move.start), formatTime(move.end!)]).toEqual(["18:30", "18:50"]);
    const briefings = getScheduleItem("fri-briefings");
    expect([formatTime(briefings.start), formatTime(briefings.end!)]).toEqual(["18:50", "19:30"]);
    expect(briefings.note).toMatch(/19:30/);
    expect(formatTime(EVENT_2026.briefingsLatestEnd)).toBe("19:30");
    expect(formatTime(getScheduleItem("fri-build-start").start)).toBe("19:30");
    // The superseded briefing times and the extra-time rule.
    expect(JSON.stringify({ SCHEDULE, DETAILS })).not.toMatch(/18:15–18:45|19:00 at the latest|extra time/);
  });

  it("has the five finalist teams present live, never as recorded videos", () => {
    const finals = getScheduleItem("sun-finals");
    expect(finals.detail).toMatch(/five finalist teams.*live on stage/);
    expect(JSON.stringify(SCHEDULE)).not.toMatch(/pre-?recorded/i);
  });

  it("publishes the meal times (18 Oct 2026; Friday dinner until 22:00 by v1.2), with approximate breakfasts", () => {
    const meals = SCHEDULE.filter((i) => i.kind === "meal").map((i) => [i.id, formatTimeRange(i)]);
    expect(meals).toEqual([
      ["fri-dinner", "18:30–22:00"],
      ["sat-breakfast", "~07:00"],
      ["sat-lunch", "10:30–13:30"],
      ["sat-dinner", "17:00–20:00"],
      ["sun-breakfast", "~07:00"],
      ["sun-lunch", "10:00–13:00"],
    ]);
    // The superseded times and breakfast menus of the 14 Oct 2026 update.
    expect(JSON.stringify({ SCHEDULE, DETAILS })).not.toMatch(/21:30|10:00–12:30|from 07:30|taskurieska|by Mauno/);
  });

  it("tears visibility stands down after the event, not at the 10:00 deadline", () => {
    const teardown = getScheduleItem("sun-partner-teardown");
    expect(formatTime(teardown.start)).toBe("15:30");
    expect(teardown.approx).toBe(true);
    expect(teardown.place).toBe("biocity");
  });

  it("assigns venue roles correctly", () => {
    const roles = Object.fromEntries(VENUES.map((v) => [v.id, v.roles.join(" ")]));
    expect(roles.educity).toMatch(/Opening ceremony/);
    expect(roles.educity).toMatch(/closing ceremony \(Sun 13:15\), each challenge's top three \(13:30\) and the finals \(Sun 14:00\)/);
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
    // 09:45 is only Sunday's evaluation readiness check (final run of show), never a builder time.
    expect(SCHEDULE.filter((i) => formatTime(i.start) === "09:45").map((i) => i.id)).toEqual(["sun-evaluation-ready"]);
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

  it("has 14 named challenge partners and one place to be announced — 15 in all (Europress since 23 Oct 2026)", () => {
    expect(CHALLENGE_COMPANIES).toHaveLength(15);
    expect(NAMED_CHALLENGE_PARTNERS.map((c) => c.name).sort()).toEqual(
      [
        "Apetit",
        "Bayer",
        "Business Turku",
        "DNA",
        "Elisa",
        "Europress",
        "Fonecta",
        "FORCIT Group",
        "Lindström",
        "Meyer Turku",
        "Takomo Golf",
        "Traficom",
        "Turku Energia",
        "Valmet",
      ].sort(),
    );
    expect(TBA_CHALLENGE_PLACES.map((c) => c.id)).toEqual(["tba-2"]);
    for (const c of TBA_CHALLENGE_PLACES) expect(c.logo).toBeUndefined();
    // Europress is one of the 15, never a sixteenth; spelled as the company does.
    const europress = getCompany("europress")!;
    expect(europress.url).toBe("https://europressgroup.com/");
    expect(europress.logo?.src).toBe("/assets/sponsors/europress.svg");
    expect(JSON.stringify([CHALLENGE_COMPANIES, VENUE_MAPS, GUIDES, DETAILS])).not.toMatch(/Neuropress/i);
  });

  it("labels only FORCIT Group as running its own NDA", () => {
    expect(CHALLENGE_COMPANIES.filter((c) => c.ndaRequired).map((c) => c.id)).toEqual(["forcit-group"]);
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
    for (const id of ["fonecta", "europress", "tba-2"]) expect(getCompany(id)!.placementStatus).toBe("pending");
  });

  it("places Europress (provisional), Valmet and Traficom on Joki floor 2", () => {
    expect(byQaFloor(2)).toEqual(["Europress", "Traficom", "Valmet"]);
  });

  it("places six companies on Joki floor 3", () => {
    expect(byQaFloor(3)).toEqual([
      "Business Turku",
      "FORCIT Group",
      "Fonecta",
      "Lindström",
      "Takomo Golf",
      "To be announced",
    ]);
  });

  it("matches the organiser's final EduCity briefing room maps (26 Oct 2026)", () => {
    const rooms = Object.fromEntries(
      CHALLENGE_COMPANIES.map((c) => [c.name, `${c.briefing.floor}:${briefingRoomLabel(c)}`]),
    );
    expect(rooms).toEqual({
      Elisa: "1:1001 Dromberg",
      Bayer: "1:1002 Moriaberg",
      Europress: "1:1090 Ringsberg",
      Traficom: "1:1091 Hammarbacka",
      "Business Turku": "3:3027",
      Fonecta: "2:2001 Elias",
      "Takomo Golf": "2:2002 Ivar",
      "FORCIT Group": "2:2003 Erik",
      Lindström: "2:2004 Johannes",
      "To be announced": "2:2067",
      Valmet: "2:2006 / 2007",
      DNA: "2:2026 Orvokki",
      "Turku Energia": "3:3006",
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

  it("ranks six positions: one open (Red Hat needs no booth), Solita, Pruna AI, BearingPoint, CSC / LUMI AI Factory, MLH", () => {
    expect(ranked.map((s) => s.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ranked.map((s) => standDisplayName(s))).toEqual([
      "Visibility / Tech Partner stand",
      "Solita",
      "Pruna AI",
      "BearingPoint",
      "CSC / LUMI AI Factory",
      "Major League Hacking",
    ]);
    expect(OPEN_STAND_LABEL).toBe("Visibility / Tech Partner stand");
  });

  it("gives each of the five stand partners exactly one stand, none a challenge partner, and no stand to Red Hat", () => {
    expect(STAND_PARTNERS).toHaveLength(5);
    expect(STAND_PARTNERS.some((p) => p.id === "red-hat")).toBe(false);
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
    expect(label("bc-1")).toMatch(/^Stand 1 — Visibility \/ Tech Partner stand · Main lobby · partner corner/);
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
