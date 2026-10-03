import { ORG } from "@/lib/org";
import { GUIDE_BASE_PATH } from "./route";

/**
 * Canonical operational facts for Since AI Hackathon 2026.
 *
 * Source precedence (newest wins): organiser decisions of 3 Oct 2026 →
 * 3 Oct info compilation → 2–3 Oct venue maps → role schedules → older
 * production files. Public marketing copy elsewhere on sinceai.ai is NOT the
 * operational authority — see IMPLEMENTATION_REPORT.md for known mismatches.
 */
export const EVENT_2026 = {
  name: "Since AI Hackathon 2026",
  city: "Turku, Finland",
  dateLabel: "6–8 November 2026",
  timezone: "Europe/Helsinki",
  timezoneLabel: "local Turku time (EET, UTC+2)",
  /** Builder registration and team formation open. */
  builderRegistration: "2026-11-06T15:00:00+02:00",
  /** Challenge partner arrival at EduCity. */
  challengePartnerArrival: "2026-11-06T15:30:00+02:00",
  /** Official opening ceremony. */
  officialOpening: "2026-11-06T17:00:00+02:00",
  /** Build phase starts in BioCity + Joki after the briefings. */
  buildStart: "2026-11-06T19:30:00+02:00",
  submissionDeadline: "2026-11-08T10:00:00+02:00",
  closingCeremony: "2026-11-08T13:00:00+02:00",
  /** Company challenge awards — "around 14:00". */
  challengeAwardsApprox: "2026-11-08T14:00:00+02:00",
  eventEnd: "2026-11-08T15:00:00+02:00",
  /** First and last instants used for "now / next" calculations. */
  window: {
    start: "2026-11-06T15:00:00+02:00",
    end: "2026-11-08T15:00:00+02:00",
  },
  /** Bump when operational content changes. */
  lastUpdated: "2026-10-03",
  lastUpdatedLabel: "3 Oct 2026",
} as const;

/** Verified public links. App paths were checked against sinceai.app on 3 Oct 2026. */
export const GUIDE_LINKS = {
  website: ORG.baseUrl,
  hackathon: `${ORG.baseUrl}/hackathon`,
  codeOfConduct: `${ORG.baseUrl}/code-of-conduct`,
  privacy: `${ORG.baseUrl}/privacy`,
  app: "https://sinceai.app/",
  appTeams: "https://sinceai.app/teams",
  appSignIn: "https://sinceai.app/sign-in",
  appReportIncident: "https://sinceai.app/report",
  discord: ORG.social.discord,
  /** Public organisational contact — the default until named role owners are approved. */
  contactEmail: ORG.contact.infoEmail,
} as const;

export { GUIDE_BASE_PATH };
export const GUIDE_BASE_URL = `${ORG.baseUrl}${GUIDE_BASE_PATH}`;
