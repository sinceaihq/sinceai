import { ORG } from "@/lib/org";
import { GUIDE_BASE_PATH } from "./route";

/**
 * Canonical operational facts for Since AI Hackathon 2026.
 *
 * Source precedence (newest wins): the official food schedule of 18 Oct 2026 (main meals at Restaurant Mauno,
 * Fri dinner 18:30–21:30, Sun lunch 10:00–13:00, breakfasts around 07:00 with menus to be announced — see food.ts) →
 * the organiser's production update of 14 Oct 2026 ("Since AI 2026 tuotannon
 * päivitykset": challenge preview 15:00, challenge selection 17:00–17:30 by the team owner, Jason Mayes 17:30–18:30,
 * staggered move from 18:30, briefings 18:50–19:30, build from 19:30, company arrival Sun 08:45, each challenge's top
 * three, closing ceremony 13:15, finals 14:00–15:10, end around 15:30) →
 * the organiser's run of show, "Since AI 2026 tapahtuman kulku" (11 Oct 2026: team formation closes 16:45, team
 * count locked 16:50, company evaluation briefing Sun 09:00) →
 * organiser final-release brief of 13 Oct 2026 (13 challenge partners + 2 TBA places, six BioCity partner stands,
 * five finalist teams presenting live) →
 * organiser decisions of 4 Oct 2026 (Sunday programme, Joki stand setup) →
 * organiser decisions of 3 Oct 2026 →
 * 3 Oct info compilation → 2–3 Oct venue maps → role schedules → older
 * production files. Public marketing copy elsewhere on sinceai.ai is NOT the
 * operational authority — see docs/hackathon-2026-field-guide-report.md for known mismatches.
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
  /** Challenge preview opens in sinceai.app. */
  challengePreview: "2026-11-06T15:00:00+02:00",
  /** Team formation closes: no new teams, joining or member changes after this. */
  teamFormationCloses: "2026-11-06T16:45:00+02:00",
  /** Final team count locked; places per challenge set. */
  teamCountLocked: "2026-11-06T16:50:00+02:00",
  /** Official opening ceremony; challenge selection opens in sinceai.app at the same time. */
  officialOpening: "2026-11-06T17:00:00+02:00",
  /** Challenge selection closes; every team's route to its briefing room is published in sinceai.app. */
  challengeSelectionCloses: "2026-11-06T17:30:00+02:00",
  /** Jason Mayes: 30-minute keynote and 30-minute tech talk, 17:30–18:30. */
  keynote: "2026-11-06T17:30:00+02:00",
  /** Staggered move to the company briefing rooms, after the keynote programme. */
  moveToBriefings: "2026-11-06T18:30:00+02:00",
  /** Company challenge briefings 18:50–19:30; 19:30 is a hard end for every briefing. */
  briefingsStart: "2026-11-06T18:50:00+02:00",
  briefingsLatestEnd: "2026-11-06T19:30:00+02:00",
  /** Build phase starts in BioCity + Joki after the briefings. */
  buildStart: "2026-11-06T19:30:00+02:00",
  submissionDeadline: "2026-11-08T10:00:00+02:00",
  /** Company evaluators review their challenge 10:00–13:00 and confirm its top three teams by 13:00. */
  evaluationEnd: "2026-11-08T13:00:00+02:00",
  /** The closing ceremony at EduCity starts: the hosts' thanks and a short motivational talk. */
  closingCeremony: "2026-11-08T13:15:00+02:00",
  /** Each company challenge's top three teams are announced, 13:30–14:00. */
  challengeResults: "2026-11-08T13:30:00+02:00",
  /** Finals 14:00–15:10: the five finalist teams (most-voted solutions) present live on stage; the jury selects the overall winner. */
  finals: "2026-11-08T14:00:00+02:00",
  /** The event ends around 15:30, after the jury's decision and the overall winner's award. */
  eventEnd: "2026-11-08T15:30:00+02:00",
  /** First and last instants used for "now / next" calculations. */
  window: {
    start: "2026-11-06T15:00:00+02:00",
    end: "2026-11-08T15:30:00+02:00",
  },
  /** Bump when operational content changes. */
  lastUpdated: "2026-10-14",
  lastUpdatedLabel: "14 Oct 2026",
} as const;

/** Verified public links. App paths were checked against sinceai.app on 3 Oct 2026. */
export const GUIDE_LINKS = {
  website: ORG.baseUrl,
  hackathon: `${ORG.baseUrl}/hackathon`,
  codeOfConduct: `${ORG.baseUrl}/code-of-conduct`,
  privacy: `${ORG.baseUrl}/privacy`,
  app: "https://sinceai.app/",
  appTeams: "https://sinceai.app/teams",
  /** Builders' dashboard, incl. the Meal RSVP (checked 18 Oct 2026). */
  appDashboard: "https://sinceai.app/dashboard",
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
