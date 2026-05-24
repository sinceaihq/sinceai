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
  startDate: "2026-11-06",
  endDate: "2026-11-08",
  month: "November",
  year: 2026,
  dateNote: "November 6–8, 2026.",
  city: "Turku",
  country: "FI",
  statusLabelShort: "November 6–8, 2026 • Turku",
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
  upcomingEventLineLong: "Since AI Hackathon 2026 will be held November 6–8, 2026 at EduCity in Turku, Finland.",
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
