import {
  AWARDS_AT_A_GLANCE,
  AWARDS_HREF,
  awardHref,
  CHALLENGE_PRIZE_EXCEPTIONS,
  CHALLENGE_PRIZES_STATEMENT,
  CHALLENGE_COMPANIES,
  CONFIDENTIAL_RULES,
  DETAILS,
  FIWARE_AWARD,
  FIWARE_QUICK_START,
  FIWARE_RESOURCE_GROUPS,
  HOW_TO_ENTER,
  MLH_AWARDS,
  MLH_AWARDS_ANCHOR,
  MLH_AWARDS_NOTE,
  MLH_PRIZE_PAGE,
  MLH_QUESTIONS,
  PARTNER_RESOURCES,
  prizeLine,
  prizesFor,
  prizeTotal,
  RED_HAT_AWARD,
  STANDARD_CHALLENGE_PRIZES,
  SUBMISSION,
  technologyAwardByTitle,
  VOTE_COMPARISONS,
  VOTING,
} from "@/lib/hackathon-2026";

const text = (x: unknown) => JSON.stringify(x);

describe("company challenge prizes", () => {
  it("awards every challenge's top three €2,000 / €750 / €250", () => {
    expect(STANDARD_CHALLENGE_PRIZES).toEqual({ first: 2_000, second: 750, third: 250 });
    expect(prizesFor("valmet")).toEqual({ prizes: STANDARD_CHALLENGE_PRIZES });
  });

  it("gives FORCIT Group a €5,000 pot split €3,000 / €1,500 / €500 — not added on top of the standard prizes", () => {
    const forcit = prizesFor("forcit-group");
    expect(forcit.prizes).toEqual({ first: 3_000, second: 1_500, third: 500 });
    expect(prizeTotal(forcit.prizes)).toBe(5_000);
    expect(forcit.exception?.challenge).toBe("Drill and Blast Cycle Intelligence");
    expect(CHALLENGE_COMPANIES.some((c) => c.id === "forcit-group" && c.name === "FORCIT Group")).toBe(true);
  });

  it("publishes FORCIT's confirmed €5,000 split without a pending note", () => {
    expect(CHALLENGE_PRIZE_EXCEPTIONS.map((e) => e.confirmation)).toEqual(["confirmed"]);
    expect(prizeLine("forcit-group")).toBe("€3,000 / €1,500 / €500");
    expect(prizeLine("valmet")).toBe("€2,000 / €750 / €250");
    expect(CHALLENGE_PRIZES_STATEMENT).toMatch(/€5,000 prize pot\./);
    expect(CHALLENGE_PRIZES_STATEMENT).not.toMatch(/to be confirmed/i);
    expect(CHALLENGE_PRIZES_STATEMENT).not.toMatch(/same|contract|guarantee/i);
  });
});

describe("MLH prize categories", () => {
  it("lists exactly MLH's seven categories for Since AI Hackathon, with MLH's prizes", () => {
    expect(MLH_AWARDS.map((a) => [a.title, a.prize])).toEqual([
      ["Best Use of ElevenLabs", "Wireless Earbuds"],
      ["Best Use of Gemini API", "MLH Swag Kits"],
      ["Best Use of Solana", "Unruggable Hardware Wallets"],
      ["Best Use of Tiger Data", "Stream Deck Mini"],
      ["Best Use of Vultr", "M5Stack Official Tab5"],
      ["Best Use of Snowflake API", "Arduino Student Kit"],
      ["Best Use of MongoDB Atlas", "M5Stack IoT Kit"],
    ]);
    expect(new Set(MLH_AWARDS.map((a) => a.id)).size).toBe(7);
    for (const a of MLH_AWARDS) {
      expect(a.id).toMatch(/^mlh-[a-z-]+$/);
      expect(new URL(a.href).hostname).toBe("mlh.link");
    }
  });

  it("labels them as prizes through MLH, non-exclusive with the company challenge", () => {
    expect(MLH_AWARDS_NOTE).toMatch(/provided through Major League Hacking/);
    expect(MLH_AWARDS_NOTE).toMatch(/MLH runs these categories and their judging/);
    expect(MLH_AWARDS_NOTE).toMatch(/zero, one or several, with the same project/);
    expect(text(HOW_TO_ENTER)).toMatch(/Gemini project number — never an API key/);
  });
});

describe("Red Hat OpenShift AI Technology Award", () => {
  it("states the amount, eligibility, evidence and the 35/30/25/10 rubric", () => {
    expect(RED_HAT_AWARD.title).toBe("Red Hat OpenShift AI Technology Award");
    expect(RED_HAT_AWARD.prize).toBe("€1,000, subject to the partnership terms.");
    expect(RED_HAT_AWARD.criteria.map((c) => [c.name, c.weight])).toEqual([
      ["OpenShift AI use", 35],
      ["Practical business value", 30],
      ["Technical reliability", 25],
      ["Documentation and clarity", 10],
    ]);
    expect(text(RED_HAT_AWARD.eligibility)).toMatch(/official company challenge/);
    expect(text(RED_HAT_AWARD.eligibility)).toMatch(/standalone app built for this award alone is not eligible/);
    expect(RED_HAT_AWARD.evidence.join(" ")).toMatch(/Technical evidence of real use/);
  });

  it("does not name the reviewer or publish agreement details", () => {
    expect(text(RED_HAT_AWARD)).not.toMatch(/contract|countersign|fee|reviewer is|reviewed by/i);
  });
});

describe("FIWARE Open Innovation Award", () => {
  it("uses the Builder Pack's rubric, routes A and B, and Jason Fox as the sole evaluator", () => {
    expect(FIWARE_AWARD.criteria.map((c) => [c.name, c.weight])).toEqual([
      ["FIWARE integration", 35],
      ["Technical quality", 30],
      ["Innovation", 20],
      ["Practical value", 15],
    ]);
    expect(FIWARE_AWARD.routes.map((r) => r.letter)).toEqual(["A", "B"]);
    expect(FIWARE_AWARD.routes[1]!.text).toMatch(/never enters the company challenge rankings or the selection of the five finalists/);
    expect(FIWARE_AWARD.evaluation).toMatch(/Jason Fox.*sole evaluator/);
    expect(FIWARE_AWARD.mentor).toMatch(/all three days/);
    expect(FIWARE_AWARD.eligibility.join(" ")).toMatch(/Merely mentioning FIWARE is not enough/);
    expect(FIWARE_AWARD.eligibility.join(" ")).toMatch(/working demo, not slides/);
  });

  it("states the non-cash package with the Builder Pack's exact conditions and no funding promise", () => {
    expect(FIWARE_AWARD.benefits).toHaveLength(5);
    const conditions = FIWARE_AWARD.conditions.join(" ");
    expect(conditions).toMatch(/team lead or their organisation/);
    expect(conditions).toMatch(/travel and accommodation are not included/);
    expect(conditions).toMatch(/within 30 days/);
    expect(conditions).toMatch(/only with the team's approval/);
    expect(conditions).toMatch(/12 months from the award date/);
    expect(FIWARE_AWARD.conditions).toHaveLength(6);
    expect(`${conditions} ${FIWARE_AWARD.benefits.map((b) => `${b.title} ${b.text}`).join(" ")}`).not.toMatch(
      /funding is|investment is|guaranteed|financ(e|ing) (is|will)/i,
    );
    expect(text(FIWARE_AWARD)).not.toMatch(/€|EUR|\$\d/);
  });

  it("publishes the technical resources without any personal contact detail", () => {
    expect(FIWARE_QUICK_START.map((s) => s.step)[0]).toMatch(/Orion-LD with its MongoDB/);
    const all = text([FIWARE_AWARD, FIWARE_RESOURCE_GROUPS]);
    for (const broker of ["Orion-LD", "Scorpio", "Stellio", "Antares", "coraine"]) expect(all).toContain(broker);
    expect(all).not.toMatch(/@[a-z-]+\.(org|com|fi|nl|fr|jp)|\+358|mailto:/i);
    for (const g of FIWARE_RESOURCE_GROUPS) for (const i of g.items) if (i.href) expect(new URL(i.href).protocol).toBe("https:");
  });
});

describe("voting, finalists and confidential challenges", () => {
  it("asks every eligible builder for 20 comparisons and picks finalists from five different challenges", () => {
    expect(VOTE_COMPARISONS).toBe(20);
    expect(VOTING.how).toMatch(/complete 20 comparisons/);
    expect(VOTING.finalists).toMatch(/five highest-ranked eligible projects from five different official company challenges/);
    expect(VOTING.finalists).toMatch(/not simply the overall top five/);
    expect(text(VOTING)).not.toMatch(/disqualif|penalt|banned/i);
  });

  it("explains FORCIT's paper NDA, verification and public-safe summary", () => {
    const rules = text(CONFIDENTIAL_RULES);
    expect(rules).toMatch(/paper NDA forms/);
    expect(rules).toMatch(/only after event staff have verified/);
    expect(rules).toMatch(/controlled system/);
    expect(rules).toMatch(/No restricted data in public GitHub repositories, demo videos/);
    expect(rules).toMatch(/public-safe summary/);
    expect(rules).toMatch(/nothing is signed online/i);
  });

  it("links builders from their FAQ to the awards and the confidential rules", () => {
    const faq = DETAILS.builders.map((d) => d.links?.map((l) => l.href) ?? []).flat();
    expect(faq).toContain(AWARDS_HREF);
    expect(faq).toContain("/hackathon-2026/guide/resources#confidential");
  });
});

describe("FIWARE ten-minute start", () => {
  it("starts Orion-LD next to a MongoDB on one Docker network — Orion-LD alone does not start", () => {
    expect(FIWARE_QUICK_START[0].code.split("\n")).toEqual([
      "docker network create fiware",
      "docker run -d --name mongo-db --network fiware mongo:4.4",
      "docker run -d --name orion-ld --network fiware -p 1026:1026 fiware/orion-ld -dbhost mongo-db",
    ]);
  });

  it("creates an entity with a copy-pasteable JSON-LD request and reads it back", () => {
    const create = FIWARE_QUICK_START[1].code;
    expect(create).toMatch(/^curl -i -X POST http:\/\/localhost:1026\/ngsi-ld\/v1\/entities \\\n/);
    expect(create).toContain("-H 'Content-Type: application/ld+json'");
    const body = create.slice(create.indexOf("-d '") + 4, create.lastIndexOf("'"));
    const entity = JSON.parse(body);
    expect(entity).toMatchObject({ id: "urn:ngsi-ld:Building:001", type: "Building" });
    expect(entity["@context"]).toMatch(/^https:\/\/uri\.etsi\.org\/ngsi-ld\//);
    // Every continued line ends in a backslash, so the command pastes as one.
    const lines = create.split("\n");
    for (const line of lines.slice(0, 2)) expect(line.endsWith(" \\")).toBe(true);
    expect(FIWARE_QUICK_START[2].code).toContain("/ngsi-ld/v1/entities/urn:ngsi-ld:Building:001");
  });
});

describe("award links", () => {
  const allHrefs = () => [
    ...FIWARE_RESOURCE_GROUPS.flatMap((g) => g.items.map((i) => i.href).filter(Boolean)),
    ...[RED_HAT_AWARD, FIWARE_AWARD].flatMap((a) => [...a.docs.map((d) => d.href), a.questions.link.href]),
    ...MLH_AWARDS.map((a) => a.href),
    MLH_PRIZE_PAGE,
  ];

  it("never points to the three dead FIWARE links found on 27 Oct 2026", () => {
    const hrefs = allHrefs();
    for (const dead of [
      "https://fiware-tutorials.readthedocs.io/en/latest/linked-data/",
      "https://github.com/FIWARE/tutorials.NGSI-LD/tree/master/postman",
      "https://smartdatamodels.org/index.php/validate-your-entity/",
    ])
      expect(hrefs).not.toContain(dead);
    expect(hrefs).toContain("https://fiware-tutorials.readthedocs.io/en/latest/linked-data.html");
    expect(hrefs).toContain("https://smartdatamodels.org/index.php/check-a-schema-validates-a-payload/");
  });

  it("deep-links each partner resource to its own award card, with a short prize", () => {
    const withAward = PARTNER_RESOURCES.filter((r) => r.award);
    expect(withAward.map((r) => r.id).sort()).toEqual(["fiware", "red-hat"]);
    for (const r of withAward) expect(technologyAwardByTitle(r.award!)).toBeDefined();
    expect(awardHref(RED_HAT_AWARD.id)).toBe("/hackathon-2026/guide/resources#award-red-hat-openshift-ai");
    expect(awardHref(FIWARE_AWARD.id)).toBe("/hackathon-2026/guide/resources#award-fiware-open-innovation");
    expect(RED_HAT_AWARD.prizeShort).toBe("€1,000");
    expect(FIWARE_AWARD.prizeShort).toBe("non-cash package");
  });

  it("answers questions only with support already published — Red Hat's resource card, FIWARE's mentor and Discord, MLH's introduction", () => {
    const redHat = PARTNER_RESOURCES.find((r) => r.id === "red-hat")!;
    expect(RED_HAT_AWARD.questions.text).toBe(redHat.help);
    expect(RED_HAT_AWARD.questions.link.href).toBe("/hackathon-2026/guide/resources#resource-red-hat");
    expect(FIWARE_AWARD.questions.text).toMatch(/Jason Fox.*on site at EduCity.*Discord/);
    expect(FIWARE_AWARD.questions.link.href).toMatch(/^https:\/\/discord\./);
    expect(MLH_QUESTIONS).toMatch(/16:50 on Friday, at Taidon portaat/);
    expect(text([RED_HAT_AWARD.questions, FIWARE_AWARD.questions, MLH_QUESTIONS])).not.toMatch(/@[a-z-]+\.[a-z]|\+\d{3}|mailto:/i);
  });
});

describe("optional awards at a glance", () => {
  it("compares MLH, Red Hat and FIWARE, each linking to its own card", () => {
    expect(AWARDS_AT_A_GLANCE.map((r) => [r.id, r.href])).toEqual([
      ["mlh", `#${MLH_AWARDS_ANCHOR}`],
      ["red-hat-openshift-ai", "#award-red-hat-openshift-ai"],
      ["fiware-open-innovation", "#award-fiware-open-innovation"],
    ]);
    expect(AWARDS_AT_A_GLANCE[0]!.name).toBe("MLH prize categories (7)");
    for (const r of AWARDS_AT_A_GLANCE) for (const k of ["win", "enter", "decided", "ask"] as const) expect(r[k].length).toBeGreaterThan(10);
  });

  it("states only confirmed prizes and timing", () => {
    const [mlh, redHat, fiware] = AWARDS_AT_A_GLANCE;
    expect(mlh!.win).toMatch(/provided through MLH/);
    expect(redHat!.win).toBe("€1,000, subject to the partnership terms.");
    expect(fiware!.win).toMatch(/non-cash/);
    expect(text([mlh, fiware])).not.toMatch(/€|EUR|\$\d/);
    expect(fiware!.decided).toMatch(/Sunday 8 November.*closing ceremony/);
    expect(mlh!.decided).toMatch(/announced in the event channels/);
    expect(redHat!.decided).toMatch(/announced in the event channels/i);
    expect(mlh!.ask).toMatch(/Fri 16:50/);
    // The reviewer stays unnamed; no dates or times beyond the ones in the guide data.
    expect(text(AWARDS_AT_A_GLANCE)).not.toMatch(/reviewed by|contract|fee|coupon/i);
    expect(text(AWARDS_AT_A_GLANCE).match(/\d{1,2}:\d{2}/g)).toEqual(["16:50"]);
  });
});

describe("submission form pointers", () => {
  it("says where MLH categories are ticked and lists the public-safe summary for confidential challenges", () => {
    const optIn = SUBMISSION.optional.find((f) => /MLH prize categories/.test(f.name))!;
    expect(optIn.note).toMatch(/tick the MLH categories/i);
    expect(optIn.link?.href).toBe(AWARDS_HREF);
    const summary = SUBMISSION.optional.find((f) => f.name === "Public summary")!;
    expect(summary.note).toMatch(/^For confidential challenges/);
    expect(summary.link?.href).toBe("/hackathon-2026/guide/resources#confidential");
  });
});
