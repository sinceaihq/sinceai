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
 * Meals by Mauno (organiser, 13 Oct 2026): Fri 18:30–21:30, Sat 10:30–13:30
 * and 17:00–20:00, Sun 10:00–13:00 — no separate breakfasts. Disposable dishes
 * and takeaway containers; dietary requirements are collected in advance.
 *
 * Friday (organiser, 13 Oct 2026): team formation from 15:00, and team
 * formation AND challenge selection are both complete before the 17:00
 * opening ceremony. The earlier 17:45–18:05 selection window after the opening
 * is obsolete. The exact moment team changes close and the selection window
 * opens is NOT decided — it is announced on site and in sinceai.app, so no
 * clock time is published for it here. In-app team challenge selection is
 * tracked in sinceai-platform#371.
 */
export const SCHEDULE: readonly ScheduleItem[] = [
  // ── Friday 6 November ──────────────────────────────────────────────────────
  {
    id: "fri-registration",
    start: at(FRI, "15:00"),
    title: "Builder registration opens",
    titleFor: { builders: "Registration opens" },
    detail:
      "Check in at EduCity — both main entrances lead to registration. From registration, walk on to the team formation area beside Taidon portaat.",
    place: "educity",
    placeDetail: "Main entrances → registration",
    audiences: ["builders"],
    kind: "milestone",
    status: "working",
  },
  {
    id: "fri-team-formation",
    start: at(FRI, "15:00"),
    end: at(FRI, "17:00"),
    title: "Team formation",
    detail:
      "Teams of up to five are formed in sinceai.app — every member must join the same team in the app. Need teammates? Stand in the zone for the number of open places in your team. Then leave via the exit side and show your full team member list in the app at Team check.",
    place: "educity",
    placeDetail: "Floor 1 · lobby and room 1091 beside Taidon portaat",
    audiences: ["builders"],
    kind: "session",
    status: "working",
    note: "Team changes close before 17:00 — the exact time is announced on site and in sinceai.app.",
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
    id: "fri-challenge-selection",
    start: at(FRI, "17:00"),
    title: "Teams complete and challenge selected",
    titleFor: { builders: "Before 17:00: team complete, challenge selected" },
    detail:
      "Before the opening ceremony starts, every team is complete in sinceai.app and its team owner has selected one challenge for the whole team. Places per challenge are limited. The selection window opens before 17:00 — event staff and sinceai.app announce exactly when.",
    place: "app",
    audiences: ["builders"],
    kind: "deadline",
    status: "working",
    note: "Selection window time to be confirmed.",
  },
  {
    id: "fri-opening",
    start: at(FRI, "17:00"),
    end: at(FRI, "17:50"),
    title: "Opening ceremony + keynote",
    detail:
      "The official start of Since AI Hackathon 2026. The hosts introduce the challenge companies, then Jason Mayes, Google's Web AI Lead, gives the keynote.",
    detailFor: {
      builders:
        "The official start. The hosts introduce the challenge companies, then Jason Mayes, Google's Web AI Lead, gives the keynote. Your team's challenge is already selected.",
      "challenge-partners":
        "The hosts introduce your company from the short introduction you sent in advance — company representatives do not present their challenges on stage. Jason Mayes' keynote follows.",
      speakers: "The keynote follows the hosts' company introductions — your run sheet has your exact cue.",
    },
    place: "educity",
    placeDetail: "Lobby · Taidon portaat",
    audiences: ALL_AUDIENCES,
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "fri-move-to-briefings",
    start: at(FRI, "17:50"),
    end: at(FRI, "18:15"),
    title: "Move to your challenge briefing room",
    titleFor: { "challenge-partners": "Teams arrive at your room" },
    detail:
      "Staggered from 17:50: volunteers send the rooms off in turn. Go to your challenge company's room — follow the announcements and volunteer signs.",
    detailFor: {
      "challenge-partners":
        "From 17:50 teams are sent to the rooms in turn, guided by volunteers. Stay in your room — they come to you.",
    },
    place: "educity",
    placeDetail: "Floors 1–2",
    audiences: ["builders", "challenge-partners"],
    kind: "move",
    status: "working",
    note: "17:50 is the current target.",
  },
  {
    id: "fri-briefings",
    start: at(FRI, "18:15"),
    end: at(FRI, "18:45"),
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
        "30 minutes: problem, expected result, boundaries, resources, evaluation and your live support route. Finish at 18:45 — if a briefing runs long, 19:00 is the absolute latest. Volunteers then direct the teams to BioCity.",
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
    note: "An extended briefing ends by 19:00 at the latest.",
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
    start: at(FRI, "18:45"),
    title: "Dinner, move to your workspace and start building",
    detail:
      "Right after the briefing, volunteers direct your team to BioCity. Eat when it suits you — dinner runs until 21:30 — find a workspace in BioCity or Joki and start building as soon as you arrive. Build spaces stay open around the clock.",
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
    start: at(FRI, "18:30"),
    end: at(FRI, "21:30"),
    title: "Dinner",
    detail:
      "Rolling service by Mauno at Maunon sali, BioCity — builders arrive from the briefings from about 18:45; come whenever suits you.",
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
    id: "sat-cp-arrival",
    start: at(SAT, "08:30"),
    title: "Arrive at Joki — your stand is ready",
    detail:
      "Since AI has set up your Q&A stand from the materials you brought on Friday. Come over before the Q&A opens at 09:00 — your company's page shows its exact floor and stand.",
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
    start: at(SAT, "10:30"),
    end: at(SAT, "13:30"),
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
    id: "sat-qa-break",
    start: at(SAT, "12:00"),
    end: at(SAT, "14:30"),
    title: "Q&A break",
    detail: "The company Q&A stands at Joki pause. Keep building — the Q&A reopens at 14:30.",
    detailFor: {
      "challenge-partners": "The Q&A pauses — lunch is reserved for you at BioCity. Be back at your stand for 14:30.",
    },
    place: "joki",
    audiences: ["builders", "challenge-partners"],
    kind: "note",
    status: "confirmed",
  },
  {
    id: "sat-qa-afternoon",
    start: at(SAT, "14:30"),
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
    start: at(SAT, "17:00"),
    end: at(SAT, "20:00"),
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
    start: at(SAT, "20:00"),
    title: "Final push — building continues through the night",
    detail: "Build spaces stay open. Short rest is fine in suitable event areas; there are no sleeping facilities.",
    place: "biocity-joki",
    audiences: ["builders"],
    kind: "note",
    status: "confirmed",
  },

  // ── Sunday 8 November ──────────────────────────────────────────────────────

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
      builders:
        "Your team submits its final solution in sinceai.app — any team member can submit. The deadline is fixed — submit early.",
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
        "Review the submissions to your challenge and hand over your winner by 13:00 — the winners are announced from 13:30.",
    },
    place: "educity",
    audiences: ["challenge-partners", "judges"],
    kind: "session",
    status: "confirmed",
  },
  {
    id: "sun-lunch",
    start: at(SUN, "10:00"),
    end: at(SUN, "13:00"),
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
    title: "Company challenge winners announced",
    detail: "The winners of the company challenges are announced at EduCity — every company has chosen its winner by 13:00.",
    place: "educity",
    audiences: ALL_AUDIENCES,
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "sun-finals",
    start: at(SUN, "14:00"),
    title: "Finals: five finalist teams present live",
    detail:
      "The five finalist teams — the five most-voted solutions — present their projects live on stage, and the jury evaluates the presentations and selects the overall winner of Since AI Hackathon 2026. About an hour.",
    detailFor: {
      builders:
        "If your team is a finalist, you present live on stage at EduCity — not a recorded video. The jury evaluates the presentations and selects the overall winner.",
      judges:
        "Overall jury: the five finalist teams present live on stage; you evaluate the presentations and select the overall winner. Be ready before 14:00 — your personal call time comes from Since AI.",
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
    note: "Around 15:00, subject to the final run of show.",
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
