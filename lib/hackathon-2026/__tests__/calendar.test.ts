/**
 * @jest-environment node
 */
import {
  buildCalendar,
  buildCompanyCalendar,
  calendarFileName,
  CHALLENGE_COMPANIES,
  companyCalendarFileName,
  companyCalendarPath,
  foldLine,
  getCompany,
  scheduleFor,
} from "@/lib/hackathon-2026";

const unfold = (ics: string) => ics.replace(/\r\n /g, "");

describe("calendar export", () => {
  const ics = buildCalendar("builders");

  it("is a valid VCALENDAR with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/\n/);
  });

  it("folds every line at 75 octets", () => {
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("has one event per schedule item", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(scheduleFor("builders").length);
  });

  it("writes Turku times in UTC", () => {
    const text = unfold(ics);
    // Opening 17:00 Helsinki (UTC+2) = 15:00Z; submission 10:00 = 08:00Z.
    expect(text).toMatch(/UID:fri-opening\.builders@sinceai\.ai[\s\S]*?DTSTART:20261106T150000Z/);
    expect(text).toMatch(/UID:sun-submission-deadline\.builders@sinceai\.ai[\s\S]*?DTSTART:20261108T080000Z/);
  });

  it("leaves open end times out and says so", () => {
    const dinner = unfold(ics)
      .split("BEGIN:VEVENT")
      .find((e) => e.includes("UID:fri-dinner."))!;
    expect(dinner).toContain("DTSTART:20261106T190000Z");
    expect(dinner).not.toContain("DTEND");
    expect(dinner).toContain("Starts at this time — no fixed end.");
  });

  it("escapes text and includes the venue address", () => {
    const text = unfold(ics);
    expect(text).toContain("LOCATION:EduCity\\, Joukahaisenkatu 7\\, 20520 Turku");
  });

  it("writes all-day items as dates", () => {
    const partners = unfold(buildCalendar("partners"));
    expect(partners).toContain("DTSTART;VALUE=DATE:20261107");
    expect(partners).toContain("DTEND;VALUE=DATE:20261108");
  });

  it("names files per guide", () => {
    expect(calendarFileName("challenge-partners")).toBe("since-ai-hackathon-2026-challenge-partners.ics");
  });

  it("folds multi-byte characters safely", () => {
    const folded = foldLine(`DESCRIPTION:${"ä".repeat(120)}`);
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(folded.replace(/\r\n /g, "")).toBe(`DESCRIPTION:${"ä".repeat(120)}`);
  });
});

describe("company calendar", () => {
  const elisa = getCompany("elisa")!;
  const saarioinen = getCompany("saarioinen")!;

  it("puts the company's own room and stand in the events", () => {
    const text = unfold(buildCompanyCalendar(elisa));
    expect(text).toContain("X-WR-CALNAME:Since AI Hackathon 2026 · Elisa");
    const briefing = text.split("BEGIN:VEVENT").find((e) => e.includes("UID:fri-briefings."))!;
    expect(briefing).toContain("Room 1001 Dromberg · floor 1");
    const arrival = text.split("BEGIN:VEVENT").find((e) => e.includes("UID:sat-cp-arrival."))!;
    expect(arrival).toContain("Showroom");
    expect(unfold(buildCompanyCalendar(saarioinen))).toContain("floor 3 of the Joki tower");
  });

  it("uses UIDs that do not collide with the shared partner calendar", () => {
    const shared = new Set(unfold(buildCalendar("challenge-partners")).match(/UID:[^\r\n]+/g));
    const own = unfold(buildCompanyCalendar(elisa)).match(/UID:[^\r\n]+/g)!;
    expect(own).toHaveLength(scheduleFor("challenge-partners").length);
    for (const uid of own) expect(shared.has(uid)).toBe(false);
  });

  it("has a file and a path for every company", () => {
    for (const company of CHALLENGE_COMPANIES) {
      expect(companyCalendarFileName(company)).toBe(`since-ai-hackathon-2026-${company.id}.ics`);
      expect(companyCalendarPath(company)).toBe(`/hackathon-2026/guide/calendar/challenge-partners/${company.id}`);
      for (const line of buildCompanyCalendar(company).split("\r\n")) {
        expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
      }
    }
  });
});
