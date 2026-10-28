import { ORG } from "@/lib/org";
import { GUIDE_BASE_PATH } from "./route";

/**
 * Canonical operational facts for Since AI Hackathon 2026.
 *
 * Source precedence (newest wins): organiser decisions of 27 Oct 2026 (MLH introduction Fri 16:50–17:00; 20 vote
 * comparisons; five finalists from five different company challenges; FORCIT's prize pot and NDA; optional MLH, Red Hat
 * and FIWARE awards — see prizes.ts, voting.ts, awards.ts, confidential.ts) → the organiser's final EduCity maps of 26 Oct 2026 (team formation, briefing rooms
 * on floors 1–3; they supersede the 2 Oct zone plan) → the Tech Team Implementation Guide v1.2 of 25 Oct 2026
 * (challenge summaries Thu 5 Nov 15:00; Fri 15:00 registration, team formation and challenge selection for teams their
 * lead has marked ready; formation closes 16:45; selection closes 17:30 and is final; full challenge materials in the
 * app at 19:30 for each company's own teams only; Friday check-in
 * required; Fri dinner 18:30–22:00) → the official food schedule of 18 Oct 2026 (main meals at Restaurant Mauno,
 * Sun lunch 10:00–13:00, breakfasts around 07:00 with menus to be announced — see food.ts) →
 * the organiser's production update of 14 Oct 2026 ("Since AI 2026 tuotannon
 * päivitykset": Jason Mayes 17:30–18:30,
 * staggered move from 18:30, briefings 18:50–19:30, build from 19:30, company arrival Sun 08:45, each challenge's top
 * three, closing ceremony 13:15, finals 14:00–15:10, end around 15:30) →
 * the organiser's run of show, "Since AI 2026 tapahtuman kulku" (11 Oct 2026: company evaluation briefing Sun 09:00) →
 * organiser final-release brief of 13 Oct 2026 (13 challenge partners + 2 TBA places — Europress fills one since
 * 23 Oct, five finalist teams presenting live) →
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
  /** Public-safe challenge summaries open to registered participants in sinceai.app (choose from these only). */
  challengePreview: "2026-11-05T15:00:00+02:00",
  /** Challenge selection opens in sinceai.app for teams their lead has marked ready (same moment as registration). */
  challengeSelectionOpens: "2026-11-06T15:00:00+02:00",
  /** Team formation closes: no new teams, joining or member changes after this. */
  teamFormationCloses: "2026-11-06T16:45:00+02:00",
  /** Major League Hacking: Introduction & Hacker Resources, 16:50–17:00 at Taidon portaat — a hard stop at 17:00. */
  mlhIntroduction: "2026-11-06T16:50:00+02:00",
  /** Official opening ceremony at Taidon portaat. */
  officialOpening: "2026-11-06T17:00:00+02:00",
  /** Challenge selection closes; every team's route to its briefing room is in sinceai.app. */
  challengeSelectionCloses: "2026-11-06T17:30:00+02:00",
  /** Jason Mayes: 30-minute keynote and 30-minute tech talk, 17:30–18:30. */
  keynote: "2026-11-06T17:30:00+02:00",
  /** Staggered move to the company briefing rooms, after the keynote programme. */
  moveToBriefings: "2026-11-06T18:30:00+02:00",
  /** Company challenge briefings 18:50–19:30; 19:30 is a hard end for every briefing. */
  briefingsStart: "2026-11-06T18:50:00+02:00",
  briefingsLatestEnd: "2026-11-06T19:30:00+02:00",
  /** The full challenge view and materials open in sinceai.app — only for the teams that chose that company. */
  fullChallengeMaterials: "2026-11-06T19:30:00+02:00",
  /** Build phase starts in BioCity + Joki after the briefings. */
  buildStart: "2026-11-06T19:30:00+02:00",
  submissionDeadline: "2026-11-08T10:00:00+02:00",
  /** Company evaluators review their challenge 10:00–13:00 and confirm its top three teams by 13:00. */
  evaluationEnd: "2026-11-08T13:00:00+02:00",
  /** The closing ceremony at EduCity starts: the hosts' thanks and a short motivational talk. */
  closingCeremony: "2026-11-08T13:15:00+02:00",
  /** Each company challenge's top three teams are announced, 13:30–14:00. */
  challengeResults: "2026-11-08T13:30:00+02:00",
  /** Finals 14:00–15:10: the five finalist teams (the highest-ranked from five different company challenges) present live on stage; the jury selects the overall winner. */
  finals: "2026-11-08T14:00:00+02:00",
  /** The event ends around 15:30, after the jury's decision and the overall winner's award. */
  eventEnd: "2026-11-08T15:30:00+02:00",
  /** First and last instants used for "now / next" calculations. */
  window: {
    start: "2026-11-06T15:00:00+02:00",
    end: "2026-11-08T15:30:00+02:00",
  },
  /** Bump when operational content changes. */
  lastUpdated: "2026-10-27",
  lastUpdatedLabel: "27 Oct 2026",
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
