import { ALL_AUDIENCES, type Audience, type ScheduleItem } from "./types";

const FRI = "2026-11-06";
const SAT = "2026-11-07";
const SUN = "2026-11-08";
const at = (date: string, time: string) => `${date}T${time}:00+02:00`;

const COMPANIES: readonly Audience[] = ["challenge-partners", "partners"];
const MEAL_OPTIONAL = "Optional for company representatives — food is reserved for you at the scheduled meal times.";

/**
 * One schedule for everyone. Pages filter by audience and pick the
 * audience-specific wording. Times are local Turku time (EET, UTC+2).
 *
 * Unresolved details are modelled, not guessed: Friday dinner and Sunday
 * breakfast have no confirmed end time (`endPending`), so the UI shows the
 * start time only.
 */
export const SCHEDULE: readonly ScheduleItem[] = [
  // ── Friday 6 November ──────────────────────────────────────────────────────
  {
    id: "fri-registration",
    start: at(FRI, "15:00"),
    title: "Builder registration opens",
    titleFor: { builders: "Registration opens" },
    detail:
      "Check in at EduCity — both main entrances lead to registration. Public challenge previews open in sinceai.app.",
    place: "educity",
    placeDetail: "Main entrances → registration",
    audiences: ["builders"],
    kind: "milestone",
    status: "working",
  },
  {
    id: "fri-team-formation",
    start: at(FRI, "15:00"),
    end: at(FRI, "16:45"),
    title: "Team formation",
    detail:
      "Create or join your team in sinceai.app — every member must appear in the same team. Still looking for teammates? Use the team formation area next to Taidon portaat.",
    place: "educity",
    placeDetail: "Lobby · team formation area",
    audiences: ["builders"],
    kind: "session",
    status: "working",
  },
  {
    id: "fri-cp-arrival",
    start: at(FRI, "15:30"),
    title: "Arrive at EduCity",
    detail:
      "Bring a laptop suitable for presenting your challenge materials — and your Q&A stand materials: hand them to the Since AI team, who set your stand up at Joki for Saturday.",
    place: "educity",
    audiences: ["challenge-partners"],
    kind: "milestone",
    status: "working",
  },
  {
    id: "fri-cp-weekend-briefing",
    start: at(FRI, "15:40"),
    title: "Weekend briefing for challenge partners",
    detail: "Overview of the full weekend, Friday's schedule and practical arrangements. Coffee and a light snack.",
    place: "educity",
    placeDetail: "Event staff guide you to the room",
    audiences: ["challenge-partners"],
    kind: "session",
    status: "working",
  },
  {
    id: "fri-team-changes-close",
    start: at(FRI, "16:45"),
    title: "Team changes close",
    detail: "No new teams, joins or member changes after this. Move to Taidon portaat for the opening.",
    place: "educity",
    audiences: ["builders"],
    kind: "deadline",
    status: "working",
  },
  {
    id: "fri-team-lock",
    start: at(FRI, "16:50"),
    title: "Teams lock",
    detail:
      "Event staff resolve exceptional cases 16:45–16:50. The app then counts confirmed teams to set challenge capacity.",
    place: "app",
    audiences: ["builders"],
    kind: "milestone",
    status: "working",
  },
  {
    id: "fri-opening",
    start: at(FRI, "17:00"),
    title: "Opening ceremony + keynote",
    titleFor: { builders: "Opening ceremony — challenge selection opens" },
    detail: "The official start of Since AI Hackathon 2026.",
    detailFor: {
      builders: "The official start. Team owners select the team's challenge in sinceai.app from 17:00.",
      speakers: "The keynote is part of the opening programme — your run sheet has your exact cue.",
    },
    place: "educity",
    placeDetail: "Lobby · Taidon portaat",
    audiences: ALL_AUDIENCES,
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "fri-challenge-selection",
    start: at(FRI, "17:00"),
    end: at(FRI, "17:30"),
    title: "Challenge selection",
    detail:
      "Only the team owner selects, in sinceai.app — first come, first served, with limited places per challenge. At 17:30 your team view shows your challenge, departure time, room, floor and map.",
    place: "app",
    audiences: ["builders"],
    kind: "deadline",
    status: "working",
  },
  {
    id: "fri-move-to-briefings",
    start: at(FRI, "18:00"),
    end: at(FRI, "18:25"),
    title: "Move to company briefing rooms",
    titleFor: { "challenge-partners": "Teams arrive at your room" },
    detail:
      "Staggered departures: leave at your team's time shown in the app, then follow the announcements and volunteer signs.",
    detailFor: {
      "challenge-partners":
        "Teams are released in groups and guided to your room. Stay in your room — they come to you.",
    },
    place: "educity",
    placeDetail: "Floors 1–2",
    audiences: ["builders", "challenge-partners"],
    kind: "move",
    status: "working",
  },
  {
    id: "fri-briefings",
    start: at(FRI, "18:30"),
    end: at(FRI, "19:30"),
    title: "Company challenge briefings",
    titleFor: {
      builders: "Your challenge briefing",
      "challenge-partners": "Your challenge briefing",
    },
    detail: "Each company presents its challenge to its teams in its own EduCity room.",
    detailFor: {
      builders:
        "Your challenge company explains the task, expected result, boundaries, resources, evaluation and how to reach them during the event.",
      "challenge-partners":
        "Use the full hour: problem, expected result, boundaries, resources, evaluation and your live support route. Finish at 19:30.",
    },
    place: "educity",
    placeDetail: "Company briefing rooms",
    placeDetailFor: {
      builders: "Your company's room",
      "challenge-partners": "Your assigned room",
    },
    audiences: ["builders", "challenge-partners"],
    kind: "session",
    status: "working",
  },
  {
    id: "fri-partner-setup",
    start: at(FRI, "18:00"),
    title: "Move to BioCity and set up your stand",
    detail: "Set up at your stand position — the BioCity stand plan is at the top of this guide.",
    place: "biocity",
    audiences: ["partners"],
    kind: "move",
    status: "working",
    note: "Setup window is being aligned with the all-weekend opening — we confirm it with you.",
  },
  {
    id: "fri-build-start",
    start: at(FRI, "19:30"),
    title: "Move to BioCity or Joki — start building",
    detail:
      "Follow the guided route, find a workspace for your team and start building. Build spaces stay open around the clock.",
    place: "biocity-joki",
    audiences: ["builders"],
    kind: "move",
    status: "working",
  },
  {
    id: "fri-cp-saturday-briefing",
    start: at(FRI, "19:45"),
    end: at(FRI, "20:15"),
    title: "Briefing for Saturday",
    detail: "Same room as the 15:40 weekend briefing.",
    place: "educity",
    audiences: ["challenge-partners"],
    kind: "session",
    status: "working",
  },
  {
    id: "fri-dinner",
    start: at(FRI, "21:00"),
    endPending: true,
    title: "Dinner",
    detailFor: {
      "challenge-partners": MEAL_OPTIONAL,
      partners: MEAL_OPTIONAL,
    },
    place: "biocity",
    audiences: ["builders", ...COMPANIES],
    kind: "meal",
    status: "working",
  },

  // ── Saturday 7 November ────────────────────────────────────────────────────
  {
    id: "sat-partner-stand",
    start: at(SAT, "07:30"),
    allDay: true,
    title: "Your stand is open at BioCity",
    detail: "Tell us when your representatives are at the stand — we share the times with builders.",
    place: "biocity",
    audiences: ["partners"],
    kind: "note",
    status: "confirmed",
  },
  {
    id: "sat-breakfast",
    start: at(SAT, "07:30"),
    end: at(SAT, "09:30"),
    title: "Breakfast",
    detailFor: {
      "challenge-partners": MEAL_OPTIONAL,
      partners: MEAL_OPTIONAL,
    },
    place: "biocity",
    audiences: ["builders", ...COMPANIES],
    kind: "meal",
    status: "working",
  },
  {
    id: "sat-cp-arrival",
    start: at(SAT, "08:30"),
    title: "Arrive at Joki — your stand is ready",
    detail:
      "Since AI has set up your Q&A stand from the materials you brought on Friday. Come over after breakfast, before the Q&A opens at 09:00 — your company's page shows its exact floor and stand.",
    place: "joki",
    audiences: ["challenge-partners"],
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "sat-qa-morning",
    start: at(SAT, "09:00"),
    end: at(SAT, "12:00"),
    title: "Challenge partner Q&A open",
    detail: "Meet the challenge companies at Joki — Showroom (floor 1) and floors 2–3.",
    detailFor: {
      builders:
        "Find your company at Joki — Showroom (floor 1) or floors 2–3. Each company posts its representative hours at its stand.",
      "challenge-partners":
        "Be available for at least two hours across the published Q&A windows, and post your exact hours at your stand.",
    },
    place: "joki",
    audiences: ["builders", "challenge-partners"],
    kind: "session",
    status: "confirmed",
  },
  {
    id: "sat-lunch",
    start: at(SAT, "12:00"),
    end: at(SAT, "14:00"),
    title: "Lunch",
    titleFor: {
      builders: "Lunch (Q&A pause)",
      "challenge-partners": "Lunch + Q&A pause",
    },
    detailFor: {
      "challenge-partners": MEAL_OPTIONAL,
      partners: MEAL_OPTIONAL,
    },
    place: "biocity",
    audiences: ["builders", ...COMPANIES],
    kind: "meal",
    status: "working",
  },
  {
    id: "sat-qa-afternoon",
    start: at(SAT, "14:00"),
    end: at(SAT, "18:00"),
    title: "Challenge partner Q&A open",
    detail: "Second Q&A window at Joki.",
    place: "joki",
    audiences: ["builders", "challenge-partners"],
    kind: "session",
    status: "confirmed",
  },
  {
    id: "sat-cp-sunday-briefing",
    start: at(SAT, "18:15"),
    title: "Briefing for Sunday",
    place: "joki",
    placeDetail: "Company Q&A area",
    audiences: ["challenge-partners"],
    kind: "session",
    status: "working",
  },
  {
    id: "sat-dinner",
    start: at(SAT, "20:00"),
    end: at(SAT, "21:30"),
    title: "Dinner",
    detailFor: {
      "challenge-partners": MEAL_OPTIONAL,
      partners: MEAL_OPTIONAL,
    },
    place: "biocity",
    audiences: ["builders", ...COMPANIES],
    kind: "meal",
    status: "working",
  },
  {
    id: "sat-night",
    start: at(SAT, "21:30"),
    title: "Final push — building continues through the night",
    detail: "Build spaces stay open. Short rest is fine in suitable event areas; there are no sleeping facilities.",
    place: "biocity-joki",
    audiences: ["builders"],
    kind: "note",
    status: "confirmed",
  },

  // ── Sunday 8 November ──────────────────────────────────────────────────────
  {
    id: "sun-breakfast",
    start: at(SUN, "07:00"),
    endPending: true,
    title: "Breakfast",
    detailFor: {
      "challenge-partners": MEAL_OPTIONAL,
      partners: MEAL_OPTIONAL,
    },
    place: "biocity",
    audiences: ["builders", ...COMPANIES],
    kind: "meal",
    status: "working",
  },
  {
    id: "sun-evaluator-arrival",
    start: at(SUN, "08:15"),
    title: "Arrive at EduCity — evaluation briefing",
    titleFor: { judges: "Company evaluators: arrive at EduCity — evaluation briefing" },
    detail: "Briefing on the challenge evaluation process.",
    place: "educity",
    placeDetail: "Room confirmed before Sunday",
    audiences: ["challenge-partners", "judges"],
    kind: "milestone",
    status: "working",
  },
  {
    id: "sun-submission-deadline",
    start: at(SUN, "10:00"),
    title: "Hard submission deadline",
    titleFor: { partners: "Submission deadline — stands stay open" },
    detail: "Submissions close. The deadline is fixed.",
    detailFor: {
      builders: "The team owner submits the final solution in sinceai.app. The deadline is fixed — submit early.",
    },
    place: "app",
    audiences: ["builders", "challenge-partners", "partners", "judges"],
    kind: "deadline",
    status: "confirmed",
  },
  {
    id: "sun-voting",
    start: at(SUN, "10:00"),
    end: at(SUN, "12:00"),
    title: "Vote for your favourite solutions",
    detail:
      "You have 10 votes in sinceai.app — give them to 10 different solutions. The five most-voted solutions present in the finals at 14:00.",
    place: "app",
    audiences: ["builders", "judges"],
    titleFor: { judges: "Participant voting window" },
    detailFor: {
      judges:
        "Every builder gives 10 votes to 10 different solutions in sinceai.app; the five most-voted solutions become the finalists.",
    },
    kind: "session",
    status: "working",
    note: "Voting rules are shown in the app.",
  },
  {
    id: "sun-evaluation",
    start: at(SUN, "10:00"),
    end: at(SUN, "13:00"),
    title: "Challenge evaluation",
    titleFor: { judges: "Company challenge evaluation" },
    detail: "Company evaluators review the submissions to their own challenge and choose its winner by 13:00.",
    detailFor: {
      "challenge-partners":
        "Review the submissions to your challenge and hand over your winner by 13:00 — the winners are published at 13:30.",
    },
    place: "educity",
    audiences: ["challenge-partners", "judges"],
    kind: "session",
    status: "confirmed",
  },
  {
    id: "sun-lunch",
    start: at(SUN, "10:00"),
    end: at(SUN, "12:00"),
    title: "Lunch",
    detailFor: {
      "challenge-partners": MEAL_OPTIONAL,
      partners: MEAL_OPTIONAL,
    },
    place: "biocity",
    audiences: ["builders", ...COMPANIES],
    kind: "meal",
    status: "working",
  },
  {
    id: "sun-closing",
    start: at(SUN, "13:30"),
    title: "Closing: company challenge winners announced",
    detail: "The closing programme opens at EduCity with the winners of all 15 company challenges.",
    place: "educity",
    audiences: ALL_AUDIENCES,
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "sun-finals",
    start: at(SUN, "14:00"),
    title: "Finals: five finalist presentations",
    detail:
      "The five most-voted solutions present and the jury selects the overall winner of Since AI Hackathon 2026 — about an hour.",
    detailFor: {
      judges: "Overall jury: be ready before 14:00 — your personal call time comes from Since AI.",
    },
    place: "educity",
    audiences: ALL_AUDIENCES,
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "sun-end",
    start: at(SUN, "15:00"),
    approx: true,
    title: "Since AI Hackathon 2026 ends",
    place: "educity",
    audiences: ALL_AUDIENCES,
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "sun-partner-teardown",
    start: at(SUN, "15:00"),
    title: "Stand teardown",
    detail: "After the event ends, in the post-event window agreed with you.",
    place: "biocity",
    audiences: ["partners"],
    kind: "note",
    status: "working",
  },
] as const;

/** Items visible to an audience, publishable only, in chronological order. */
export function scheduleFor(audience?: Audience): ScheduleItem[] {
  return SCHEDULE.filter(
    (item) => item.status !== "do_not_publish" && (audience === undefined || item.audiences.includes(audience)),
  ).sort(compareItems);
}

export function compareItems(a: ScheduleItem, b: ScheduleItem): number {
  if (a.allDay !== b.allDay && a.start.slice(0, 10) === b.start.slice(0, 10)) {
    return a.allDay ? -1 : 1;
  }
  return Date.parse(a.start) - Date.parse(b.start);
}

export function getScheduleItem(id: string): ScheduleItem {
  const item = SCHEDULE.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown schedule item: ${id}`);
  return item;
}

export const titleFor = (item: ScheduleItem, audience?: Audience) =>
  (audience && item.titleFor?.[audience]) || item.title;

export const detailFor = (item: ScheduleItem, audience?: Audience) =>
  (audience && item.detailFor?.[audience]) || item.detail;

export const placeDetailFor = (item: ScheduleItem, audience?: Audience) =>
  (audience && item.placeDetailFor?.[audience]) || item.placeDetail;

export const noteFor = (item: ScheduleItem, audience?: Audience) => (audience && item.noteFor?.[audience]) || item.note;

/**
 * The weekend's shared milestones shown on the hub — the moments every
 * audience should know about.
 */
export const HUB_MILESTONE_IDS = [
  "fri-registration",
  "fri-opening",
  "fri-briefings",
  "fri-build-start",
  "sat-qa-morning",
  "sun-submission-deadline",
  "sun-closing",
  "sun-finals",
  "sun-end",
] as const;
