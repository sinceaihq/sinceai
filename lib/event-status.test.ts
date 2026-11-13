import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { EVENT_2026 } from "@/lib/hackathon-2026";
import { getFirstEventSchema, getHackathon2026EventSchema } from "@/lib/schema";
import {
  FIRST_EVENT,
  HACKATHON_2026,
  SINCE_AI_EVENTS,
  dateRangeLabel,
  getCurrentEvents,
  getEventPhase,
  getPastEvents,
} from "@/lib/sinceai";

const root = process.cwd();
const at = (iso: string) => Date.parse(iso);

describe("event lifecycle", () => {
  it("derives upcoming, live and completed from an event's dates", () => {
    expect(getEventPhase(HACKATHON_2026, at("2026-11-06T14:59:00+02:00"))).toBe("upcoming");
    expect(getEventPhase(HACKATHON_2026, at("2026-11-06T15:00:00+02:00"))).toBe("live");
    expect(getEventPhase(HACKATHON_2026, at("2026-11-08T15:30:00+02:00"))).toBe("live");
    expect(getEventPhase(HACKATHON_2026, at("2026-11-08T15:31:00+02:00"))).toBe("completed");
    expect(getEventPhase(HACKATHON_2026, new Date("2027-01-01T00:00:00Z"))).toBe("completed");
  });

  it("counts a date without a time as the whole day in Turku", () => {
    expect(getEventPhase(FIRST_EVENT, at("2025-11-20T23:59:00+02:00"))).toBe("upcoming");
    expect(getEventPhase(FIRST_EVENT, at("2025-11-21T00:00:00+02:00"))).toBe("live");
    expect(getEventPhase(FIRST_EVENT, at("2025-11-23T20:00:00+02:00"))).toBe("live");
    expect(getEventPhase(FIRST_EVENT, at("2025-11-24T00:00:00+02:00"))).toBe("completed");
  });

  it("takes the 2026 dates from the operational source, not from a copy", () => {
    expect(HACKATHON_2026.startDate).toBe(EVENT_2026.window.start);
    expect(HACKATHON_2026.endDate).toBe(EVENT_2026.window.end);
    expect(HACKATHON_2026.dateLabel).toBe(EVENT_2026.dateLabel);
    expect(dateRangeLabel(HACKATHON_2026.startDate, HACKATHON_2026.endDate)).toBe("6–8 November 2026");
    expect(dateRangeLabel(FIRST_EVENT.startDate, FIRST_EVENT.endDate)).toBe("21–23 November 2025");
  });

  it("moves an event from the upcoming list to the past list when it ends", () => {
    const during = at("2026-11-07T12:00:00+02:00");
    expect(getCurrentEvents(during).map((e) => e.id)).toEqual(["hackathon-2026"]);
    expect(getPastEvents(during).map((e) => e.id)).toEqual(["hackathon-2025"]);

    const after = at("2026-11-13T12:00:00+02:00");
    expect(getCurrentEvents(after)).toEqual([]);
    expect(getPastEvents(after).map((e) => e.id)).toEqual(["hackathon-2026", "hackathon-2025"]);
    // Every event is in exactly one of the two lists.
    expect(getCurrentEvents(after).length + getPastEvents(after).length).toBe(SINCE_AI_EVENTS.length);
  });

  it("lists events newest first", () => {
    const starts = SINCE_AI_EVENTS.map((e) => Date.parse(e.startDate));
    expect(starts).toEqual([...starts].sort((a, b) => b - a));
  });
});

describe("structured data for events that have ended", () => {
  const schemas = [getHackathon2026EventSchema(), getFirstEventSchema()] as unknown as Record<string, unknown>[];

  it("uses a real schema.org status and offers nothing to book", () => {
    for (const schema of schemas) {
      // schema.org has no "EventCompleted": an event that ran as planned stays EventScheduled.
      expect(schema.eventStatus).toBe("https://schema.org/EventScheduled");
      expect(schema).not.toHaveProperty("offers");
      expect(JSON.stringify(schema)).not.toMatch(/InStock|EventCompleted|will be held|apply/i);
    }
  });

  it("describes Hackathon 2026 in the past tense, with its dates and three venues", () => {
    const schema = schemas[0];
    expect(schema.description).toMatch(/took place on 6–8 November 2026/);
    expect(schema.startDate).toBe(EVENT_2026.window.start);
    expect(schema.endDate).toBe(EVENT_2026.window.end);
    expect((schema.location as { name: string }[]).map((l) => l.name)).toEqual(["EduCity", "BioCity", "Joki"]);
  });
});

/**
 * The regression this file exists for: on 13 Nov 2026, five days after the
 * event, the site still said "Registration is open — apply now".
 *
 * When no event is upcoming or live, nothing the public site publishes may
 * invite people to one. Announcing the next event (adding it to
 * SINCE_AI_EVENTS) switches this guard off until that event ends too.
 */
describe("public copy after the last event has ended", () => {
  const PUBLIC_DIRS = ["app", "components", "lib", "public"];
  const SKIP = [
    /[\\/]app[\\/]hackathon-2026[\\/]/, // the Field Guide: the event's own archive
    /[\\/]components[\\/]guide[\\/]/,
    /[\\/]lib[\\/]hackathon-2026[\\/]/,
    /[\\/]__tests__[\\/]/,
    /\.test\.tsx?$/,
  ];
  const files = (dir: string): string[] =>
    readdirSync(path.join(root, dir), { withFileTypes: true, recursive: true })
      .filter((e) => e.isFile() && /\.(tsx?|mdx|txt)$/.test(e.name))
      .map((e) => path.join(e.parentPath, e.name))
      .filter((file) => !SKIP.some((re) => re.test(file)));

  const STALE: [RegExp, string][] = [
    [/registration is (now )?open/i, "says registration is open"],
    [/apply now/i, "has an Apply now call to action"],
    [/apply (to|for) (since ai )?hackathon 2026/i, "invites applications to Hackathon 2026"],
    [/hackathon 2026 \(upcoming\)/i, "labels Hackathon 2026 as upcoming"],
    [/hackathon 2026[^.\n]{0,80}(will be held|takes place|is coming)/i, "describes Hackathon 2026 in the future tense"],
    [/until since ai hackathon 2026 begins/i, "counts down to Hackathon 2026"],
    [/schema\.org\/(InStock|EventCompleted)/, "publishes a bookable or invalid event status"],
    [/\bnext:\s*(since ai )?hackathon 2026/i, "calls Hackathon 2026 the next event"],
  ];

  it("has no event left to advertise", () => {
    // If this fails, an event has been announced: this whole block then stops applying (see below).
    expect(getCurrentEvents()).toEqual([]);
  });

  it("never advertises a completed event as upcoming or open for applications", () => {
    if (getCurrentEvents().length > 0) return;
    const hits: string[] = [];
    for (const file of PUBLIC_DIRS.flatMap(files)) {
      const text = readFileSync(file, "utf8");
      for (const [pattern, what] of STALE) {
        const match = text.match(pattern);
        if (match) hits.push(`${path.relative(root, file)} ${what}: "${match[0]}"`);
      }
    }
    expect(hits).toEqual([]);
  });
});
