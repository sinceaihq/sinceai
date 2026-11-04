/**
 * @jest-environment node
 */
import {
  buildCalendar,
  CALENDAR_SUBSCRIBE_NOTE,
  calendarSubscribeUrl,
  calendarWebcalUrl,
  formatTimeRange,
  getScheduleItem,
  scheduleFor,
  SUBMISSION,
  WINNING,
} from "@/lib/hackathon-2026";

const unfold = (ics: string) => ics.replace(/\r\n /g, "");
const all = JSON.stringify(WINNING);

describe("Build a project that wins (advice, not rules)", () => {
  it("leads with the two principles and closes with one line", () => {
    expect(WINNING.title).toBe("Build a project that wins.");
    expect(WINNING.company.title).toBe("Talk to your challenge company.");
    expect(WINNING.demo.title).toBe("Make your demo impossible to misunderstand.");
    expect(WINNING.closing).toBe("Build what matters. Show why it matters.");
  });

  it("gives the five questions and the four demo steps", () => {
    expect(WINNING.company.questions).toHaveLength(5);
    expect(WINNING.company.questions[0]).toBe("What is the biggest problem you need solved?");
    expect(WINNING.demo.steps.map((s) => s.title)).toEqual([
      "Start with the problem",
      "Show it working",
      "Explain the value",
      "Make it easy to follow",
    ]);
  });

  it("uses the official company contact times from the schedule, and promises no constant availability", () => {
    for (const id of ["fri-briefings", "sat-qa-morning", "sat-qa-afternoon"]) {
      expect(WINNING.company.where).toContain(formatTimeRange(getScheduleItem(id)));
    }
    expect(WINNING.company.where).toMatch(/aren't available all the time/);
  });

  it("adds no rule: no requirement, length limit, language rule, criterion or guaranteed win", () => {
    expect(all).not.toMatch(/\bmust\b|required|mandatory|disqualif|minimum|maximum|criteri|guarantee|will win/i);
    // The video length is the existing recommendation (submission.ts), not a new limit.
    expect(SUBMISSION.strongEntry.join(" ")).toMatch(/under two minutes in all/);
    expect(WINNING.demo.steps[3].text).toMatch(/About two minutes is plenty/);
    expect(WINNING.demo.text).toMatch(/explain it in English and add captions if you can/);
  });

  it("keeps demos honest and confidential data out", () => {
    expect(WINNING.demo.honesty).toMatch(/what works, what is simulated and what is a future idea/);
    expect(WINNING.demo.steps[2].text).toMatch(/Never invent numbers/);
    expect(WINNING.demo.confidential).toMatch(/never restricted data, credentials or confidential screens/);
    expect(WINNING.demo.confidentialLink.href).toBe("/hackathon-2026/guide/resources#confidential");
  });

  it("puts submission last, before the real deadline", () => {
    expect(WINNING.stages.map((s) => s.when)).toEqual(["Friday", "Saturday", "Before Sun 10:00"]);
    expect(formatTimeRange(getScheduleItem("sun-submission-deadline"))).toMatch(/^10:00/);
  });
});

describe("Add weekend schedule", () => {
  const ics = unfold(buildCalendar("builders"));
  const events = ics.split("BEGIN:VEVENT").slice(1);

  it("subscribes from the public https link, or webcal:// for Apple Calendar", () => {
    expect(calendarSubscribeUrl("builders")).toBe("https://sinceai.ai/hackathon-2026/guide/calendar/builders");
    expect(calendarWebcalUrl("builders")).toBe("webcal://sinceai.ai/hackathon-2026/guide/calendar/builders");
    expect(CALENDAR_SUBSCRIBE_NOTE).toMatch(/A downloaded file is a fixed copy/);
  });

  it("has the whole participant programme once each, Friday to Sunday, with stable ids", () => {
    const uids = events.map((e) => /UID:([^\r\n]+)/.exec(e)![1]);
    expect(new Set(uids).size).toBe(uids.length);
    expect(uids).toHaveLength(scheduleFor("builders").length);
    for (const id of [
      "fri-registration",
      "fri-team-formation",
      "fri-mlh-intro",
      "fri-opening",
      "fri-keynote",
      "fri-briefings",
      "fri-build-start",
      "fri-dinner",
      "fri-mlh-copilot",
      "fri-mlh-ai-studio",
      "sun-submission-deadline",
      "sun-voting",
      "sun-closing-ceremony",
      "sun-closing",
      "sun-finals",
      "sun-end",
    ]) {
      expect(uids).toContain(`${id}.builders@sinceai.ai`);
    }
    // No partner-only or internal items.
    expect(ics).not.toMatch(/UID:fri-cp-|UID:fri-partner-|UID:sat-partner-/);
  });

  it("names every event as Since AI's, puts the room in the location and hints at refreshes", () => {
    for (const e of events) expect(e).toMatch(/SUMMARY:Since AI · /);
    expect(ics).toContain("LOCATION:EduCity · Lobby · Taidon portaat\\, Joukahaisenkatu 7\\, 20520 Turku");
    expect(ics).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT6H");
    expect(ics).toContain("X-PUBLISHED-TTL:PT6H");
  });

  it("never invents an end time", () => {
    for (const item of scheduleFor("builders")) {
      const event = events.find((e) => e.includes(`UID:${item.id}.builders@`))!;
      if (!item.end && !item.allDay) expect(event).not.toMatch(/DTEND/);
    }
  });
});
