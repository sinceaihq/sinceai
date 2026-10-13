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
 * Source: the organiser's final run of show, "Since AI 2026 tapahtuman kulku"
 * (production working document of 11 Oct 2026, confirmed final 13 Oct 2026).
 *
 * Meals by Mauno at BioCity: Fri 18:30–21:00, Sat 10:30–13:30 and
 * 17:00–20:00, Sun 10:00–12:30 — no separate breakfasts. Builders eat at their
 * own pace within the windows; the app shows the meals and sends reminders.
 *
 * Friday: registration and team formation from 15:00, challenge preview in
 * sinceai.app from 15:15, team formation closes at 16:45 (staff resolve
 * exceptions until 16:50, when the final team count is locked and the places
 * per challenge are set as evenly as possible across the 15 challenges).
 * Challenge selection is open in sinceai.app 17:00–17:50, during the opening
 * ceremony; at 17:50 every team gets its own route to its briefing room in the
 * app. In-app challenge selection is tracked in sinceai-platform#371.
 *
 * Items in the run of show that are internal to the companies' own programme
 * and not confirmed for publication are left out of this public schedule.
 */
export const SCHEDULE: readonly ScheduleItem[] = [
  // ── Friday 6 November ──────────────────────────────────────────────────────
  {
    id: "fri-registration",
    start: at(FRI, "15:00"),
    title: "Builder registration opens",
    titleFor: { builders: "Registration opens" },
    detail:
      "Check in at EduCity — both main entrances lead to registration. From registration, walk on to the team formation area beside Taidon portaat. Teams that arrive complete go through Team check too.",
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
      "Teams of up to five are formed in sinceai.app — every member must join the same team in the app. Need teammates? Stand in the zone for the number of open places in your team. Then leave via the exit side and show your full team member list in the app at Team check.",
    place: "educity",
    placeDetail: "Floor 1 · lobby and room 1091 beside Taidon portaat",
    audiences: ["builders"],
    kind: "session",
    status: "working",
    note: "Team formation closes at 16:45.",
  },
  {
    id: "fri-challenge-preview",
    start: at(FRI, "15:15"),
    title: "Challenge preview opens in sinceai.app",
    detail:
      "Every challenge and its template opens for preview in sinceai.app. Read through the options with your team before challenge selection opens at 17:00.",
    place: "app",
    audiences: ["builders"],
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "fri-team-lock",
    start: at(FRI, "16:45"),
    title: "Team formation closes",
    detail:
      "After 16:45 no new teams can be created, nobody can join a team and members cannot be changed. The tech team resolves exceptions until 16:50, when the final number of teams is locked and the places per challenge are set — shared as evenly as possible across all 15 challenges, so capacities differ by at most one team.",
    place: "app",
    audiences: ["builders"],
    kind: "deadline",
    status: "confirmed",
  },
  {
    id: "fri-cp-arrival",
    start: at(FRI, "15:30"),
    title: "Arrive at EduCity",
    detail:
      "Company hosts welcome you at the Info desk and a volunteer walks you to your area. Bring a laptop suitable for presenting your challenge — and your Saturday Q&A stand materials, which you leave at the agreed drop-off point at EduCity; the Since AI team takes them to Joki and sets up your stand.",
    place: "educity",
    audiences: ["challenge-partners"],
    kind: "milestone",
    status: "working",
  },
  {
    id: "fri-cp-weekend-briefing",
    start: at(FRI, "15:40"),
    title: "Weekend briefing for challenge partners",
    detail:
      "The weekend at a glance and Friday's practicalities: the opening, how the teams move, the challenge briefings in your own room and the rest of the day. Coffee and a light snack.",
    place: "educity",
    placeDetail: "Event staff guide you to the room",
    audiences: ["challenge-partners"],
    kind: "session",
    status: "working",
  },
  {
    id: "fri-challenge-selection",
    start: at(FRI, "17:00"),
    end: at(FRI, "17:50"),
    title: "Challenge selection open",
    titleFor: { builders: "Select your team's challenge" },
    detail:
      "Challenge selection opens in sinceai.app at 17:00, as the opening ceremony starts, and closes at 17:50. Your team selects one challenge for the whole team. Places per challenge are limited.",
    place: "app",
    audiences: ["builders"],
    kind: "session",
    status: "confirmed",
  },
  {
    id: "fri-opening",
    start: at(FRI, "17:00"),
    end: at(FRI, "17:50"),
    title: "Opening ceremony + keynote",
    detail:
      "The official start of Since AI Hackathon 2026. The hosts welcome everyone and introduce the company challenges, and Jason Mayes, Google's Web AI Lead, gives the keynote.",
    detailFor: {
      builders:
        "The official start. The hosts welcome everyone and introduce the company challenges — at most a minute each — and Jason Mayes, Google's Web AI Lead, gives the keynote. Challenge selection is open in sinceai.app until 17:50.",
      "challenge-partners":
        "The hosts introduce your challenge — at most a minute per company — from the short introduction you send in advance; if we do not receive one, Since AI writes it. Company representatives do not present on stage. Jason Mayes' keynote follows.",
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
    title: "Challenge selection closes — move to your briefing room",
    titleFor: { "challenge-partners": "Teams arrive at your room" },
    detail:
      "Challenge selection closes at 17:50 and your team gets its own route in sinceai.app: floor, room, floor plan and when to move. The teams move in turn to their challenge company's room at EduCity — follow your route and the volunteers.",
    detailFor: {
      "challenge-partners":
        "From 17:50 teams are sent to the rooms in turn, guided by volunteers. Stay in your room — they come to you.",
    },
    place: "educity",
    placeDetail: "Floors 1–2",
    audiences: ["builders", "challenge-partners"],
    kind: "move",
    status: "confirmed",
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
    detail:
      "Each company presents its challenge to its teams in its own EduCity room — starting at 18:15 at the latest, or as soon as all of its teams are there.",
    detailFor: {
      builders:
        "Your challenge company explains the task, expected result, boundaries, resources, evaluation and how to reach them during the event. Afterwards a volunteer walks you to BioCity.",
      "challenge-partners":
        "Start as soon as all your teams are in the room, at 18:15 at the latest: problem, expected result, boundaries, resources, evaluation and your live support route. The briefing ends at 18:45 unless the volunteer in your room grants extra time — 19:00 at the very latest. The volunteer then walks the teams to BioCity.",
    },
    place: "educity",
    placeDetail: "Company briefing rooms",
    placeDetailFor: {
      builders: "Your company's room",
      "challenge-partners": "Your assigned room",
    },
    audiences: ["builders", "challenge-partners"],
    kind: "session",
    status: "confirmed",
    note: "An extended briefing ends by 19:00 at the latest.",
  },
  {
    id: "fri-partner-setup",
    start: at(FRI, "18:00"),
    title: "Move to BioCity and set up your stand",
    detail:
      "From 18:00 you set up your own stand at BioCity, on Friday — your position is in the BioCity stand plan at the top of this guide.",
    place: "biocity",
    audiences: ["partners"],
    kind: "move",
    status: "confirmed",
  },
  {
    id: "fri-build-start",
    start: at(FRI, "18:45"),
    title: "Dinner, move to your workspace and start building",
    detail:
      "Right after the briefing, a volunteer walks your team to BioCity. Eat when it suits you — dinner runs until 21:00 — find a workspace in BioCity or Joki and start building as soon as you arrive. Build spaces stay open around the clock.",
    place: "biocity-joki",
    audiences: ["builders"],
    kind: "move",
    status: "working",
  },
  {
    id: "fri-cp-saturday-briefing",
    start: at(FRI, "19:15"),
    title: "Briefing for Saturday",
    detail:
      "In the same room as the 15:40 weekend briefing: Saturday's arrival, the Q&A stands and practicalities.",
    place: "educity",
    audiences: ["challenge-partners"],
    kind: "session",
    status: "working",
  },
  {
    id: "fri-dinner",
    start: at(FRI, "18:30"),
    end: at(FRI, "21:00"),
    title: "Dinner",
    detail:
      "Buffet by Mauno at Maunon sali, BioCity, open the whole window — builders come over after their briefings; eat whenever suits you.",
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
    id: "fri-night",
    start: at(FRI, "21:00"),
    title: "Building continues through the night",
    detail: "Build spaces stay open. Short rest is fine in suitable event areas; there are no sleeping facilities.",
    place: "biocity-joki",
    audiences: ["builders"],
    kind: "note",
    status: "confirmed",
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
      "challenge-partners":
        "The Q&A pauses for lunch and a break — lunch is reserved for you at BioCity, and Since AI shares the companies' programme for the break with you directly. Be back at your stand for 14:30.",
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
    detail: "Sunday's arrival at EduCity, the evaluation, using sinceai.app, the deadlines and the awards.",
    place: "joki",
    placeDetail: "Floor 3 · the round room",
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
    start: at(SUN, "09:00"),
    title: "Arrive at EduCity — evaluation briefing",
    titleFor: { judges: "Company evaluators: arrive at EduCity — evaluation briefing" },
    detail:
      "Come straight to EduCity. The briefing covers how the challenge evaluation works and how to use sinceai.app for it — the tech team is there to help.",
    place: "educity",
    placeDetail: "Room confirmed before Sunday",
    audiences: ["challenge-partners", "judges"],
    kind: "milestone",
    status: "working",
  },
  {
    id: "sun-evaluation-ready",
    start: at(SUN, "09:45"),
    title: "Ready to evaluate",
    detail: "We check that every company has its instructions, access to sinceai.app and everything it needs to evaluate.",
    place: "educity",
    audiences: ["challenge-partners"],
    kind: "milestone",
    status: "confirmed",
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
    title: "Vote for the best solutions",
    detail:
      "sinceai.app gives every builder ten solutions to review and vote on. The five teams with the most votes go through to the finals at 14:00 and compete for the overall win.",
    place: "app",
    audiences: ["builders", "judges"],
    titleFor: { judges: "Participant voting window" },
    detailFor: {
      judges:
        "Every builder is given ten solutions to review and vote on in sinceai.app; the five teams with the most votes become the finalists.",
    },
    kind: "session",
    status: "working",
    note: "Voting rules are shown in the app.",
  },
  {
    id: "sun-finalists",
    start: at(SUN, "12:00"),
    title: "Voting closes — five finalists confirmed",
    detail:
      "The votes are checked and the five finalists confirmed. The finalist teams are told they are through and get their presentation instructions.",
    place: "app",
    audiences: ["builders", "judges"],
    kind: "milestone",
    status: "confirmed",
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
        "Review the submissions to your challenge and confirm your winning team and solution to Since AI by 13:00 at the latest — the winners are announced from 13:30.",
    },
    place: "educity",
    audiences: ["challenge-partners", "judges"],
    kind: "session",
    status: "confirmed",
  },
  {
    id: "sun-lunch",
    start: at(SUN, "10:00"),
    end: at(SUN, "12:30"),
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
    id: "sun-move-to-educity",
    start: at(SUN, "12:30"),
    approx: true,
    title: "After lunch: move to EduCity for the closing ceremony",
    detail: "Volunteers guide everyone from BioCity to Taidon portaat at EduCity — be there before the programme starts at 13:30.",
    place: "educity",
    placeDetail: "Lobby · Taidon portaat",
    audiences: ["builders"],
    kind: "move",
    status: "confirmed",
  },
  {
    id: "sun-closing",
    start: at(SUN, "13:30"),
    title: "Company challenge winners announced",
    detail:
      "The first part of the closing ceremony: the winners of all 15 company challenges are announced and awarded at EduCity, about two minutes per challenge.",
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
      "The five finalist teams chosen in the participant vote present their solutions live on stage to the jury on site. The jury selects the overall winner of Since AI Hackathon 2026, and the best solution is awarded.",
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
    title: "Since AI Hackathon 2026 ends",
    detail: "The competition and the closing ceremony are over by 15:00.",
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
