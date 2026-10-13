/**
 * Since AI - Single Source of Truth
 * Core constants for consistent messaging across the site
 */

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

// Upcoming Event (2026)
export const UPCOMING_EVENT_2026 = {
  name: "Since AI Hackathon 2026",
  // Operational schedule (Field Guide, lib/hackathon-2026/facts.ts): check-in opens Fri 15:00,
  // the finals end around Sun 15:00.
  startDate: "2026-11-06T15:00:00+02:00",
  endDate: "2026-11-08T15:00:00+02:00",
  month: "November",
  year: 2026,
  dateNote: "November 6 15:00 – November 8 15:00, 2026",
  city: "Turku",
  country: "FI",
  statusLabelShort: "November 6–8, 2026 • Turku",
} as const;

/**
 * Since AI Hackathon 2026 partners for marketing copy (organiser roster, 13 Oct 2026).
 * The operational source is lib/hackathon-2026 (companies.ts, partners.ts); a test keeps
 * these lists equal to it. Former or unconfirmed 2026 names (Revvity, Bo LKV, Saarioinen,
 * Sandvik, Kongsberg) must not appear as 2026 challenge partners.
 */
export const HACKATHON_2026_PARTNERS = {
  /** Company challenges the event is built for: 13 named + 2 to be announced. */
  challengeTarget: 15,
  challengePartners: [
    "Valmet",
    "Bayer",
    "Turku Energia",
    "Apetit",
    "Takomo Golf",
    "Forcit Group",
    "Elisa",
    "Meyer Turku",
    "Traficom",
    "Lindström",
    "Business Turku",
    "DNA",
    "Fonecta",
  ],
  /** Short form for metadata and one-liners. */
  challengePartnersShort: "Valmet, Bayer, Elisa, Meyer Turku, DNA, Traficom and more",
  /** Visibility / technology partners (not challenge partners). */
  visibilityPartners: ["Solita", "Red Hat", "BearingPoint", "Pruna AI", "CSC / LUMI AI Factory", "Major League Hacking"],
  /** Keynote speaker. */
  keynote: "Jason Mayes, Web AI Lead at Google",
} as const;

/** "Valmet, Bayer, … and Fonecta" */
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
  
  // Upcoming 2026 event
  upcomingEventLineShort: "Since AI Hackathon 2026 — November 6–8, 2026, Turku.",
  upcomingEventLineLong: "Since AI Hackathon 2026 will be held November 6 15:00 - November 8 15:00, 2026 at EduCity in Turku, Finland.",
} as const;

// Helper function to get year for copyright, etc.
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

// Helper to check if event has happened (based on end date)
export function hasEventOccurred(): boolean {
  const eventEndDate = new Date(FIRST_EVENT.endDate);
  const now = new Date();
  return now > eventEndDate;
}

// Event status for schema.org
export function getEventStatus() {
  return hasEventOccurred() 
    ? "https://schema.org/EventCompleted" as const
    : "https://schema.org/EventScheduled" as const;
}
