import { companySchedule } from "./companies";
import { EVENT_2026, GUIDE_BASE_URL } from "./facts";
import { getGuide } from "./guides";
import { detailFor, noteFor, placeDetailFor, scheduleFor, titleFor } from "./schedule";
import type { Audience, ChallengeCompany, Place, ScheduleItem } from "./types";
import { getVenue, venueAddressLine } from "./venues";

/**
 * iCalendar (RFC 5545) export of one audience's schedule, so people can put
 * the weekend in their own calendar. Times are written in UTC; calendar apps
 * show them in local time. Items without a confirmed end time have no DTEND
 * (they show as a point in time) and say so in the description.
 */

const CRLF = "\r\n";

/** Escape a TEXT value (RFC 5545 §3.3.11). */
function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** UTF-8 byte length of one code point. */
function utf8Length(char: string): number {
  const cp = char.codePointAt(0) ?? 0;
  return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
}

/** Fold a content line at 75 octets (UTF-8), continuation lines start with a space. */
export function foldLine(line: string): string {
  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const bytes = utf8Length(char);
    const limit = out.length === 0 ? 75 : 74; // continuation lines carry a leading space
    if (currentBytes + bytes > limit) {
      out.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  out.push(current);
  return out.map((part, i) => (i === 0 ? part : ` ${part}`)).join(CRLF);
}

/** 2026-11-06T17:00:00+02:00 → 20261106T150000Z */
function utcStamp(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

/** Local calendar date of an ISO time in Helsinki → 20261107 */
function localDateStamp(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: EVENT_2026.timezone, dateStyle: "short" })
    .format(new Date(iso))
    .replace(/-/g, "");
}

function nextDateStamp(stamp: string): string {
  const d = new Date(Date.UTC(+stamp.slice(0, 4), +stamp.slice(4, 6) - 1, +stamp.slice(6, 8) + 1));
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function locationFor(place: Place): string {
  if (place === "app") return "sinceai.app (online)";
  if (place === "biocity-joki") {
    return `BioCity (${venueAddressLine(getVenue("biocity"))}) / Joki (${venueAddressLine(getVenue("joki"))})`;
  }
  const venue = getVenue(place);
  return `${venue.name}, ${venueAddressLine(venue)}`;
}

function eventLines(item: ScheduleItem, audience: Audience, url: string, uidScope: string): string[] {
  const summary = `${titleFor(item, audience)}${item.approx ? " (approx.)" : ""}`;
  const description = [
    detailFor(item, audience),
    placeDetailFor(item, audience),
    noteFor(item, audience),
    item.endPending ? "End time to be confirmed." : undefined,
    item.approx ? "Time is approximate." : undefined,
    `Field Guide: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");

  const lines = [
    "BEGIN:VEVENT",
    `UID:${item.id}.${uidScope}@sinceai.ai`,
    `DTSTAMP:${utcStamp(`${EVENT_2026.lastUpdated}T00:00:00Z`)}`,
  ];
  if (item.allDay) {
    const day = localDateStamp(item.start);
    lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${nextDateStamp(day)}`);
  } else {
    lines.push(`DTSTART:${utcStamp(item.start)}`);
    if (item.end) lines.push(`DTEND:${utcStamp(item.end)}`);
  }
  lines.push(
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(locationFor(item.place))}`,
    `URL:${url}`,
    `STATUS:${item.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
  );
  return lines;
}

function calendarDocument(
  name: string,
  audience: Audience,
  items: readonly ScheduleItem[],
  url: string,
  uidScope: string,
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Since AI//Hackathon 2026 Field Guide//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    `X-WR-TIMEZONE:${EVENT_2026.timezone}`,
    ...items.flatMap((item) => eventLines(item, audience, url, uidScope)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** Full .ics document for one audience. */
export function buildCalendar(audience: Audience): string {
  const guide = getGuide(audience);
  return calendarDocument(
    `${EVENT_2026.name} · ${guide.name}`,
    audience,
    scheduleFor(audience),
    `${GUIDE_BASE_URL}/${guide.slug}`,
    audience,
  );
}

/** One challenge company's .ics — the partner schedule with its own room and stand. */
export function buildCompanyCalendar(company: ChallengeCompany): string {
  const guide = getGuide("challenge-partners");
  return calendarDocument(
    `${EVENT_2026.name} · ${company.name}`,
    "challenge-partners",
    companySchedule(company),
    `${GUIDE_BASE_URL}/${guide.slug}/${company.id}`,
    `challenge-partners.${company.id}`,
  );
}

export const calendarFileName = (audience: Audience) => `since-ai-hackathon-2026-${getGuide(audience).slug}.ics`;

export const calendarPath = (audience: Audience) => `/hackathon-2026/guide/calendar/${getGuide(audience).slug}`;

export const companyCalendarFileName = (company: ChallengeCompany) => `since-ai-hackathon-2026-${company.id}.ics`;

export const companyCalendarPath = (company: ChallengeCompany) =>
  `${calendarPath("challenge-partners")}/${company.id}`;
