/**
 * Since AI - Single Source of Truth
 * Core constants for consistent messaging across the site
 */

import { EVENT_2026 } from "./hackathon-2026/facts";
import { CHALLENGE_PRIZES_STATEMENT } from "./hackathon-2026/prizes";

export const FOUNDING_YEAR = 2025;

// Official Links
export const LINKS = {
  // Luma (event platform)
  lumaOrg: "https://luma.com/sinceai", // Main Since AI calendar/events page
  lumaHackathon2025: "https://luma.com/2vs4wsjr", // Specific Hackathon 2025 event page
} as const;

// Past Event (2025)
export const FIRST_EVENT = {
  name: "Since AI Hackathon",
  startDate: "2025-11-21",
  endDate: "2025-11-23",
  locationName: "EduCity",
  addressLocality: "Turku",
  addressCountry: "FI",
  attendance: 260,
  type: "Hackathon",
} as const;

/**
 * Since AI Hackathon 2026. The dates come from the operational source
 * (lib/hackathon-2026/facts.ts) — never repeat them here. Whether the event is
 * upcoming, live or completed is derived from them with getEventPhase(); it is
 * not a stored flag and not part of the name of this constant.
 */
export const HACKATHON_2026 = {
  name: EVENT_2026.name,
  // Check-in opened Fri 15:00; the event ended around Sun 15:30.
  startDate: EVENT_2026.window.start,
  endDate: EVENT_2026.window.end,
  month: "November",
  year: 2026,
  /** "6–8 November 2026" */
  dateLabel: EVENT_2026.dateLabel,
  dateNote: "November 6 15:00 – November 8 15:30, 2026",
  city: "Turku",
  country: "FI",
  href: "/hackathon",
} as const;

/**
 * Since AI Hackathon 2026 partners for marketing copy (organiser roster, 13 Oct 2026, plus
 * Europress Group, 23 Oct 2026, and TrustED, 1 Nov 2026).
 * The operational source is lib/hackathon-2026 (companies.ts, partners.ts); a test keeps
 * these lists equal to it. Former or unconfirmed 2026 names (Revvity, Bo LKV, Saarioinen,
 * Sandvik, Kongsberg) must not appear as 2026 challenge partners.
 */
export const HACKATHON_2026_PARTNERS = {
  /** The company challenges of the event, all named. */
  challengeTarget: 15,
  challengePartners: [
    "Valmet",
    "Bayer",
    "Turku Energia",
    "Apetit",
    "Takomo Golf",
    "FORCIT Group",
    "Elisa",
    "Meyer Turku",
    "Traficom",
    "Lindström",
    "Business Turku",
    "DNA",
    "Fonecta",
    "Europress",
    "TrustED",
  ],
  /** Short form for metadata and one-liners. */
  challengePartnersShort: "Valmet, Bayer, Elisa, Meyer Turku, DNA, Traficom and more",
  /** Visibility / technology partners (not challenge partners). */
  visibilityPartners: ["Solita", "Red Hat", "BearingPoint", "Pruna AI", "CSC / LUMI AI Factory", "Major League Hacking", "FIWARE"],
  /** The one statement on company challenge prizes — built from lib/hackathon-2026/prizes. */
  prizes: CHALLENGE_PRIZES_STATEMENT,
  /** Keynote speaker. */
  keynote: "Jason Mayes, Web AI Lead at Google",
} as const;

/** "Valmet, Bayer, … and Europress" */
export const HACKATHON_2026_CHALLENGE_LIST = `${HACKATHON_2026_PARTNERS.challengePartners.slice(0, -1).join(", ")} and ${HACKATHON_2026_PARTNERS.challengePartners.at(-1)}`;

/** MLH: the 2027 Season Member Event Agreement was signed on 13 Oct 2026. */
export const MLH_2027 = {
  label: "MLH 2027 Season Member Event",
  codeOfConduct: "https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md",
  /** Official 2027-season Trust Badge (mlh.com/brand-guidelines), hosted by MLH. */
  trustBadgeSrc: "https://logged-assets.s3.amazonaws.com/trust-badge/2027/mlh-trust-badge-2027-white.svg",
  trustBadgeHref:
    "https://mlh.io/eu?utm_source=eu-hackathon&utm_medium=TrustBadge&utm_campaign=2027-season&utm_content=white",
  trustBadgeAlt: "Major League Hacking 2027 Hackathon Season",
} as const;

// UI helper strings - premium & minimal
export const COPY = {
  // Short versions for UI elements
  foundingLineShort: "Founded in 2025.",
  firstEventLineShort: "First hackathon: 260 builders • Nov 21–23, 2025 • EduCity, Turku",
  
  // Medium version for proof strips
  firstEventLineMedium: "Since AI Hackathon — 260 builders on Nov 21–23, 2025 (EduCity, Turku)",
  
  // Long version for detailed pages
  firstEventLineLong: "Since AI launched in 2025 and hosted its first flagship event: Since AI Hackathon — 260 builders on Nov 21–23, 2025 at EduCity in Turku, Finland.",
  
  // Formatted for display
  eventDateRange: "November 21–23, 2025",
  eventDateShort: "Nov 21–23, 2025",
} as const;

// ── Event lifecycle ────────────────────────────────────────────────────────

/** Where an event is in its life. Always derived from its dates. */
export type EventPhase = "upcoming" | "live" | "completed";

/** A date without a time ("2025-11-23") is a whole day in Turku (EET in November). */
function instant(date: string, edge: "start" | "end"): number {
  if (date.length > 10) return Date.parse(date);
  return Date.parse(`${date}T${edge === "start" ? "00:00:00" : "23:59:59"}+02:00`);
}

export function getEventPhase(
  event: { startDate: string; endDate: string },
  now: number | Date = Date.now(),
): EventPhase {
  const t = typeof now === "number" ? now : now.getTime();
  if (t > instant(event.endDate, "end")) return "completed";
  return t >= instant(event.startDate, "start") ? "live" : "upcoming";
}

/** "21–23 November 2025" — the days of an event in Turku, for one that stays within a month. */
export function dateRangeLabel(startDate: string, endDate: string): string {
  const part = (date: string, edge: "start" | "end", options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Helsinki", ...options }).format(instant(date, edge));
  const end = part(endDate, "end", { day: "numeric", month: "long", year: "numeric" });
  return `${part(startDate, "start", { day: "numeric" })}–${end}`;
}

/**
 * Every Since AI event, newest first. Pages list events from here and place
 * them under "upcoming" or "past" by getEventPhase() — so an event that has
 * ended can never stay advertised as upcoming. Announce a new event by adding
 * it here (and only once its dates are confirmed).
 */
export const SINCE_AI_EVENTS = [
  {
    id: "hackathon-2026",
    name: HACKATHON_2026.name,
    startDate: HACKATHON_2026.startDate,
    endDate: HACKATHON_2026.endDate,
    dateLabel: HACKATHON_2026.dateLabel,
    place: "EduCity, BioCity and Joki — Turku, Finland",
    href: HACKATHON_2026.href,
  },
  {
    id: "hackathon-2025",
    name: "Since AI Hackathon 2025",
    startDate: FIRST_EVENT.startDate,
    endDate: FIRST_EVENT.endDate,
    dateLabel: dateRangeLabel(FIRST_EVENT.startDate, FIRST_EVENT.endDate),
    place: `${FIRST_EVENT.locationName}, ${FIRST_EVENT.addressLocality}, Finland`,
    href: "/projects",
  },
] as const;

export type SinceAiEvent = (typeof SINCE_AI_EVENTS)[number];

/** Events that have not ended yet (upcoming or live), soonest first. */
export function getCurrentEvents(now: number | Date = Date.now()): SinceAiEvent[] {
  return SINCE_AI_EVENTS.filter((e) => getEventPhase(e, now) !== "completed").sort(
    (a, b) => instant(a.startDate, "start") - instant(b.startDate, "start"),
  );
}

/** Events that have ended, newest first. */
export function getPastEvents(now: number | Date = Date.now()): SinceAiEvent[] {
  return SINCE_AI_EVENTS.filter((e) => getEventPhase(e, now) === "completed");
}
