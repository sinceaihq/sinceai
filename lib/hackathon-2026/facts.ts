import { ORG } from "@/lib/org";
import { GUIDE_BASE_PATH } from "./route";

/**
 * Canonical operational facts for Since AI Hackathon 2026.
 *
 * Source precedence (newest wins): organiser final-release brief of 13 Oct 2026 (13 challenge partners + 2 TBA
 * places, six BioCity partner stands, team formation and challenge selection before the 17:00 opening, staggered
 * move to briefings from 17:50, Saturday Q&A 09:00–12:00 and 14:30–18:00, Mauno meals with Sunday lunch to 13:00,
 * five finalist teams presenting live) →
 * organiser decisions of 4 Oct 2026 (Sunday programme, Joki stand setup) →
 * organiser decisions of 3 Oct 2026 →
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
  /** Official opening ceremony. Team formation and challenge selection are complete before it. */
  officialOpening: "2026-11-06T17:00:00+02:00",
  /** Staggered move to the company briefing rooms (current target). */
  moveToBriefings: "2026-11-06T17:50:00+02:00",
  /** Company challenge briefings 18:15–18:45; an extended briefing ends by 19:00 at the latest. */
  briefingsStart: "2026-11-06T18:15:00+02:00",
  briefingsLatestEnd: "2026-11-06T19:00:00+02:00",
  /** Build phase starts in BioCity + Joki after the briefings. */
  buildStart: "2026-11-06T18:45:00+02:00",
  submissionDeadline: "2026-11-08T10:00:00+02:00",
  /** Company evaluators review their challenge 10:00–13:00 and hand over their winner by 13:00. */
  evaluationEnd: "2026-11-08T13:00:00+02:00",
  /** The closing programme at EduCity opens: the company challenge winners are announced. */
  closingCeremony: "2026-11-08T13:30:00+02:00",
  /** Finals: the five finalist teams (most-voted solutions) present live on stage; the jury selects the overall winner (about an hour). */
  finals: "2026-11-08T14:00:00+02:00",
  /** Planned end, after the finals — "around 15:00". */
  eventEnd: "2026-11-08T15:00:00+02:00",
  /** First and last instants used for "now / next" calculations. */
  window: {
    start: "2026-11-06T15:00:00+02:00",
    end: "2026-11-08T15:00:00+02:00",
  },
  /** Bump when operational content changes. */
  lastUpdated: "2026-10-13",
  lastUpdatedLabel: "13 Oct 2026",
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
  /** MLH Code of Conduct — applies alongside our own (MLH 2027 Season Member Event). */
  mlhCodeOfConduct: "https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md",
  discord: ORG.social.discord,
  /** Public organisational contact — the default until named role owners are approved. */
  contactEmail: ORG.contact.infoEmail,
} as const;

export { GUIDE_BASE_PATH };
export const GUIDE_BASE_URL = `${ORG.baseUrl}${GUIDE_BASE_PATH}`;
