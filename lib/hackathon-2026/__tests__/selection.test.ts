import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  BRIEFING_ROOMS_ANCHOR,
  CHALLENGE_COMPANIES,
  CHECKLISTS,
  CONTENT_STAGES,
  CRITICAL_PATH,
  DETAILS,
  EQUAL_PRIZE,
  EVENT_2026,
  formatTime,
  getMap,
  isTbaPlace,
  LATE_ARRIVAL_RULE,
  SCHEDULE,
  SELECTION_RULES,
  SELECTION_TIMELINE,
  SKILL_CARDS,
  TEAM_FORMATION_ROUTES,
  VENUE_MAPS,
} from "@/lib/hackathon-2026";

/**
 * Tech Team Implementation Guide v1.2 (25 Oct 2026), the final EduCity maps
 * (26 Oct 2026) and the organiser's decisions of 26 Oct 2026, as the public
 * Field Guide states them.
 */
describe("Friday rules (v1.2)", () => {
  it("uses one equal-prize statement, with no euro amount", () => {
    expect(EQUAL_PRIZE).toBe("All 15 company challenges offer the same cash prize.");
    const text = JSON.stringify({ SELECTION_RULES, SELECTION_TIMELINE, CONTENT_STAGES, SCHEDULE, DETAILS, CHECKLISTS });
    expect(text).toContain(EQUAL_PRIZE);
    expect(text).not.toMatch(/(€|EUR)\s?\d|\d\s?(€|EUR)\b/);
  });

  it("states readiness, the team lead's final choice, three preferences and one required company challenge", () => {
    const rules = SELECTION_RULES.map((r) => `${r.title} ${r.text}`).join(" ");
    expect(rules).toMatch(/Mark team as ready/);
    expect(rules).toMatch(/nobody can be added, removed or swapped, and nobody can leave/);
    expect(rules).toMatch(/exactly one of the 15 company challenges/);
    expect(rules).toMatch(/cannot be changed or cancelled/);
    expect(rules).toMatch(/at least three challenges/);
    expect(rules).toMatch(/Friday 15:00–17:30/);
    expect(rules).toMatch(/never replace your company challenge/);
  });

  it("times Thursday's summaries, 15:00, 16:45, 17:30 and 19:30 from the canonical facts", () => {
    expect(SELECTION_TIMELINE.map((m) => m.time)).toEqual([
      "Thu 5 Nov · 15:00",
      "Fri · 15:00",
      "Fri · 16:45",
      "Fri · 17:30",
      "Fri · 19:30",
    ]);
    expect(formatTime(EVENT_2026.challengePreview)).toBe("15:00");
    expect(EVENT_2026.challengePreview.startsWith("2026-11-05")).toBe(true);
  });

  it("keeps full materials to the chosen company's teams, from 19:30", () => {
    const [summary, briefing, full] = CONTENT_STAGES;
    expect(summary.text).toMatch(/public-safe/);
    expect(summary.text).toMatch(/No templates, datasets or private links/);
    expect(briefing.audience).toBe("The company's own teams");
    expect(full.when).toBe("Fri · 19:30");
    expect(full.text).toMatch(/never for other teams or the public, and not before 19:30/);
  });

  it("keeps Friday check-in as the rule and pre-approved Saturday arrivals in their team, naming nobody", () => {
    const checkIn = SELECTION_RULES.find((r) => /check-in/i.test(r.title))!;
    expect(checkIn.text).toMatch(/checks in in person at EduCity on Friday/);
    expect(checkIn.text).toMatch(/approved it in advance/);
    expect(checkIn.text).toMatch(/may be removed from teams overnight by the organisers/);
    expect(LATE_ARRIVAL_RULE).toMatch(/before team formation closes at 16:45 on Friday/);
    expect(LATE_ARRIVAL_RULE).toMatch(/check in with event staff personally when you arrive on Saturday/);
    expect(JSON.stringify({ SELECTION_RULES, DETAILS, CHECKLISTS, SCHEDULE })).not.toMatch(/Team check status/i);
  });

  it("follows the final team formation map: routes A and B, Team Check, the printed skill-card colours", () => {
    expect(TEAM_FORMATION_ROUTES.map((r) => r.title)).toEqual(["I already have a team", "I don't have a team yet"]);
    expect(TEAM_FORMATION_ROUTES[0].steps.join(" ")).toMatch(/directly to Team Check on the left/);
    expect(TEAM_FORMATION_ROUTES[1].steps.join(" ")).toMatch(/return your skill card/);
    expect(TEAM_FORMATION_ROUTES[1].steps.join(" ")).toMatch(/not briefing rooms/);
    expect(SKILL_CARDS.map((c) => `${c.colour}: ${c.label}`)).toEqual([
      "Red: AI & Data",
      "Yellow: Software & Development",
      "Green: Business & Design",
    ]);
    const hotspots = getMap("educity-team-formation").hotspots.map((h) => h.label);
    expect(hotspots).toEqual(expect.arrayContaining(["A · I already have a team", "B · I don't have a team yet", "Team Check + card return"]));
  });

  it("keeps company records to identity, room and stand — no challenge brief or data fields", () => {
    const allowed = ["id", "name", "logo", "url", "ndaRequired", "briefing", "qa", "placementStatus"];
    for (const c of CHALLENGE_COMPANIES) for (const key of Object.keys(c)) expect(allowed).toContain(key);
  });

  it("lists every briefing room on floors 1–3 for the app's success pop-up target", () => {
    expect(BRIEFING_ROOMS_ANCHOR).toBe("briefing-rooms");
    expect(new Set(CHALLENGE_COMPANIES.map((c) => c.briefing.floor))).toEqual(new Set([1, 2, 3]));
    expect(VENUE_MAPS.map((m) => m.id)).toEqual(expect.arrayContaining(["educity-1", "educity-2", "educity-3"]));
    expect(CHALLENGE_COMPANIES.filter(isTbaPlace).map((c) => c.briefing.room)).toEqual(["2067"]);
  });

  it("tells builders to read on Thursday, mark ready and select first in their critical path", () => {
    expect(CRITICAL_PATH.builders!.map((s) => s.time).slice(0, 3)).toEqual(["Thu 15:00", "Fri 15:00", "15:00–17:30"]);
  });
});

// ── Published content must not carry unapproved or retired material ─────────

const PUBLISHED_DIRS = ["app", "components", "lib", "public", "content"];
const TEXT_FILE = /\.(tsx?|mjs|js|json|mdx?|txt|xml|html|svg)$/i;

function files(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "node_modules" || name === "__tests__" ? [] : files(full);
    return [full];
  });
}

/** Shapes only. Each is something the organiser has not approved for publication (26 Oct 2026). */
const UNPUBLISHED: readonly [string, RegExp][] = [
  ["a Red Hat / OpenShift award, prize or amount", /(Red Hat|OpenShift)[^.\n]{0,80}(award|prize|€|EUR\b)/i],
  ["a FIWARE award or prize", /FIWARE[^.\n]{0,60}(award|prize)/i],
  ["the misspelt company name", /Neuropress/i],
  ["the retired 1–4 open-slot zones and their signs", /\b[1-4] SLOTS? OPEN\b|TEAM READY\? EXIT|zone for the number of open places/i],
  ["the draft skill-card colours", /TECH \(red\)|AI \(blue\)/],
  ["the superseded 17:00–17:30 selection window", /select(s|ion)?[^.\n]{0,60}17:00–17:30|17:00–17:30[^.\n]{0,40}select/i],
  ["the superseded 16:50 capacity split", /16:50/],
];

describe("published content has no unapproved or retired material", () => {
  const published = PUBLISHED_DIRS.flatMap((d) => files(path.join(process.cwd(), d))).filter((f) => TEXT_FILE.test(f));

  it("scans the site", () => {
    expect(published.length).toBeGreaterThan(200);
  });

  it.each(UNPUBLISHED)("has no %s", (_label, re) => {
    const hits = published.filter((f) => re.test(readFileSync(f, "utf8"))).map((f) => path.relative(process.cwd(), f));
    expect(hits).toEqual([]);
  });

  it("would catch each shape (synthetic examples)", () => {
    const examples = [
      "Red Hat prize of EUR 500",
      "FIWARE award",
      "Neuropress",
      "3 SLOTS OPEN",
      "TECH (red)",
      "selects the challenge 17:00–17:30",
      "16:50",
    ];
    for (const [i, [, re]] of UNPUBLISHED.entries()) expect(re.test(examples[i])).toBe(true);
  });
});
