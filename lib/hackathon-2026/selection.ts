import { EVENT_2026, GUIDE_LINKS } from "./facts";
import { formatTime } from "./time";

/**
 * The Friday rules every builder must know — one source for the Field Guide's
 * pages, checklists and FAQ (Tech Team Implementation Guide v1.2, 25 Oct 2026,
 * §§13–14, 16, 18, 24–26; final EduCity maps of 26 Oct 2026).
 *
 * Public on purpose: the rules, the times and the three content stages. Not
 * here on purpose: the slot formula, host scripts, internal responsibilities,
 * any euro amount for the company prizes (none has been confirmed for
 * publication), and anything from a company's private brief or data.
 */

/** The one statement used everywhere the company challenges or prizes come up. */
export const EQUAL_PRIZE = "All 15 company challenges offer the same cash prize.";

/** Small label shown beside a company that runs its own NDA process (Forcit Group). */
export const NDA_LABEL = "NDA required";
export const NDA_NOTE =
  "This company runs its own NDA process at its briefing. Its Thursday summary is public-safe; choosing the challenge is not signing an NDA.";

const t = formatTime;

/** Friday's moments, in order (all EduCity / sinceai.app, local Turku time). */
export const SELECTION_TIMELINE = [
  {
    time: "Thu 5 Nov · 15:00",
    title: "Challenge summaries",
    text: "Public-safe summaries of all 15 company challenges open in sinceai.app for registered participants — with or without a team. You choose from these summaries only.",
  },
  {
    time: `Fri · ${t(EVENT_2026.challengeSelectionOpens)}`,
    title: "Ready, then select",
    text: "Registration and team formation open at EduCity. Once your team lead has marked the team as ready, the lead can select its company challenge right away.",
  },
  {
    time: `Fri · ${t(EVENT_2026.teamFormationCloses)}`,
    title: "Team formation closes",
    text: "No new teams, no joining and no roster changes. A complete team can still be marked as ready and select until 17:30.",
  },
  {
    time: `Fri · ${t(EVENT_2026.challengeSelectionCloses)}`,
    title: "Selection closes",
    text: "No new selections. Your team's route — challenge, departure time, room and floor — is in the app. No challenge yet? Go straight to event staff.",
  },
  {
    time: `Fri · ${t(EVENT_2026.fullChallengeMaterials)}`,
    title: "Full challenge in the app",
    text: "After your company's briefing (18:50–19:30), the full challenge view and its materials open in sinceai.app — only for the teams that chose that company.",
  },
] as const;

/**
 * Pre-approved Saturday arrivals (organiser decision, 26 Oct 2026): Friday check-in stays the default; a person
 * whose Saturday arrival was approved in advance keeps their team membership, must already be in the right team
 * before 16:45 on Friday and checks in with staff personally on arrival. No team or person is ever named here.
 */
export const LATE_ARRIVAL_RULE =
  "If the organisers approved your Saturday arrival in advance, you keep your team membership: you must already be in the right team in sinceai.app before team formation closes at 16:45 on Friday, and you check in with event staff personally when you arrive on Saturday.";

/** The prominent rules block (builders), in the order the PDF gives them. */
export const SELECTION_RULES = [
  {
    title: "Build your team before the event",
    text: "Get your team together in sinceai.app in advance — up to five members, fewer is fine. Every member needs their own account and must be in the same team.",
  },
  {
    title: "Your team lead marks the team as ready",
    text: "On site, the team lead checks the member list and confirms Mark team as ready in sinceai.app. After that the roster is fixed: nobody can be added, removed or swapped, and nobody can leave.",
  },
  {
    title: "Choose one company challenge — it is final",
    text: "Every team must choose exactly one of the 15 company challenges. Only the team lead of a ready team can select, Friday 15:00–17:30. The choice cannot be changed or cancelled.",
  },
  {
    title: "Places are limited — agree on three",
    text: "Each company challenge has a limited number of places, first come, first served. Agree on at least three challenges you would be happy with before Friday.",
  },
  {
    title: "Friday check-in is required",
    text: "Every team member checks in in person at EduCity on Friday to take part and to share in any prize. A Saturday arrival counts only if the organisers approved it in advance for that person. Members without a check-in or such an approval may be removed from teams overnight by the organisers.",
  },
  {
    title: "Optional open challenges are extra",
    text: "Optional open challenges, when announced, never replace your company challenge and do not use its places. Your company challenge entry is the one that goes through evaluation.",
  },
] as const;

/** Three content stages: what is shared, when, and with whom. */
export const CONTENT_STAGES = [
  {
    when: "Thu 5 Nov · 15:00",
    title: "Summary",
    audience: "Registered participants",
    text: "Topic, problem, intended result and relevant skills — public-safe, written so it could be printed in a newspaper. No templates, datasets or private links.",
  },
  {
    when: "Fri · 18:50–19:30",
    title: "Briefing",
    audience: "The company's own teams",
    text: "The company presents the full task in its briefing room and shares its own materials, in its own way, only with the teams that chose it.",
  },
  {
    when: "Fri · 19:30",
    title: "Full challenge in sinceai.app",
    audience: "The company's own teams",
    text: "The full challenge view and its files open in the app for the teams that chose that company — never for other teams or the public, and not before 19:30.",
  },
] as const;

/** Route A / B on the team formation map (EduCity floor 1, final map of 26 Oct 2026). */
export const TEAM_FORMATION_ROUTES = [
  {
    id: "a",
    letter: "A",
    title: "I already have a team",
    steps: [
      "After registration, turn left along the foot of Taidon portaat.",
      "Go directly to Team Check on the left.",
      "Show on your phone that you are in your team in sinceai.app.",
    ],
  },
  {
    id: "b",
    letter: "B",
    title: "I don't have a team yet",
    steps: [
      "After registration, continue beside the skill-card table and pick the card for what you bring.",
      "Meet people in the Aula and room 1091 — the company posters there are meeting points, not briefing rooms.",
      "Build your team: every member joins the same team in sinceai.app (up to five).",
      "Leave only via Team Check on the left: show every member in the app and return your skill card.",
    ],
  },
] as const;

/** Skill cards — the colours printed on the final team formation map (not the earlier draft colours). */
export const SKILL_CARDS = [
  { colour: "Red", label: "AI & Data", swatch: "#e5322d" },
  { colour: "Yellow", label: "Software & Development", swatch: "#ffd400" },
  { colour: "Green", label: "Business & Design", swatch: "#15a34a" },
] as const;

/** What the app shows after a successful selection links here (sinceai.app → Builder Guide). */
export const BRIEFING_ROOMS_ANCHOR = "briefing-rooms";

/** The Discord and team links from the participant text (§14). */
export const SELECTION_LINKS = {
  teams: GUIDE_LINKS.appTeams,
  discord: GUIDE_LINKS.discord,
} as const;
