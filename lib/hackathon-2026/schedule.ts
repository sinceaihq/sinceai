import { ALL_AUDIENCES, type Audience, type ScheduleItem } from "./types";

const FRI = "2026-11-06";
const SAT = "2026-11-07";
const SUN = "2026-11-08";
const at = (date: string, time: string) => `${date}T${time}:00+02:00`;

const COMPANIES: readonly Audience[] = ["challenge-partners", "partners"];
const MEAL_OPTIONAL = "Optional for company representatives — food is reserved for you at the scheduled meal times.";
/** Breakfast time is approximate and the menu is not confirmed yet (update both in one place). */
const BREAKFAST_TBA = "Menu coming soon — the breakfast menu will be announced closer to the event.";

/**
 * One schedule for everyone. Pages filter by audience and pick the
 * audience-specific wording. Times are local Turku time (EET, UTC+2).
 *
 * Source: the organiser's production update of 14 Oct 2026 ("Since AI 2026
 * tuotannon päivitykset", from the updated schedule sheet), on top of the run
 * of show "Since AI 2026 tapahtuman kulku" (11 Oct 2026).
 *
 * Meals — the official food schedule of 18 Oct 2026: main meals at Restaurant
 * Mauno, BioCity — Fri dinner 18:30–21:30, Sat lunch 10:30–13:30 and dinner
 * 17:00–20:00, Sun lunch 10:00–13:00; breakfast around 07:00 on Sat and Sun,
 * menus to be announced. Menus, dietary labels and special diets live in
 * food.ts. Builders eat at their own pace within the windows.
 *
 * Friday: registration, team formation and the challenge preview in
 * sinceai.app from 15:00; team formation closes at 16:45 (staff resolve
 * exceptions until 16:50, when the final team count is locked and the places
 * per challenge are set as evenly as possible across the 15 challenges).
 * Challenge selection is open in sinceai.app 17:00–17:30, during the opening
 * ceremony; the team owner selects. At 17:30 every team gets its own route in
 * the app, Jason Mayes' keynote and tech talk run 17:30–18:30, the teams move
 * in turn from 18:30, the briefings run 18:50–19:30 (a hard end) and the build
 * starts at 19:30. In-app challenge selection is tracked in sinceai-platform#371.
 *
 * Sunday: the closing ceremony starts at 13:15, each challenge's top three are
 * announced 13:30–14:00, the five finalists present 14:00–15:10 and the event
 * ends around 15:30.
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
    start: at(FRI, "15:00"),
    title: "Challenge preview opens in sinceai.app",
    detail:
      "From 15:00, while the teams form, every challenge and its template is open for preview in sinceai.app. Read through the options with your team before challenge selection opens at 17:00.",
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
    start: at(FRI, "15:45"),
    title: "Weekend briefing for challenge partners",
    detail:
      "The weekend at a glance and Friday's practicalities: the opening, how the teams move, the challenge briefings in your own room and the rest of the day. Coffee and buns.",
    place: "educity",
    placeDetail: "Event staff guide you to the room",
    audiences: ["challenge-partners"],
    kind: "session",
    status: "working",
  },
  {
    id: "fri-partner-arrival",
    start: at(FRI, "16:20"),
    end: at(FRI, "17:00"),
    title: "Arrive — Since AI welcomes you",
    detail:
      "Since AI receives the partner representatives and walks you to the opening ceremony at EduCity. Your exact arrival point, and where to leave your stand materials, are confirmed with you directly.",
    place: "educity",
    placeDetail: "Arrival point confirmed with you",
    audiences: ["partners"],
    kind: "milestone",
    status: "working",
  },
  {
    id: "fri-challenge-selection",
    start: at(FRI, "17:00"),
    end: at(FRI, "17:30"),
    title: "Challenge selection open",
    titleFor: { builders: "Select your team's challenge" },
    detail:
      "Challenge selection opens in sinceai.app at 17:00, as the opening ceremony starts, and closes at 17:30, when Jason Mayes' programme begins. The team's owner selects one challenge for the whole team. Places per challenge are limited.",
    place: "app",
    audiences: ["builders"],
    kind: "session",
    status: "confirmed",
  },
  {
    id: "fri-opening",
    start: at(FRI, "17:00"),
    end: at(FRI, "17:30"),
    title: "Opening ceremony",
    detail:
      "The official start of Since AI Hackathon 2026. The hosts welcome everyone and read out the introductions of the company challenges — at most a minute each.",
    detailFor: {
      builders:
        "The official start. The hosts welcome everyone and read out the introductions of the company challenges — at most a minute each. Challenge selection is open in sinceai.app until 17:30; your team's owner selects.",
      "challenge-partners":
        "The hosts read out your challenge introduction — at most a minute per company — from the short introduction you send in advance; if we do not receive one, Since AI writes it. Company representatives do not present on stage. Jason Mayes' keynote and tech talk follow.",
      speakers: "The hosts open the event and introduce the company challenges; Jason Mayes' keynote and tech talk follow — your run sheet has your exact cue.",
    },
    place: "educity",
    placeDetail: "Lobby · Taidon portaat",
    audiences: ALL_AUDIENCES,
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "fri-keynote",
    start: at(FRI, "17:30"),
    end: at(FRI, "18:30"),
    title: "Keynote and tech talk: Jason Mayes",
    detail:
      "Jason Mayes, Google's Web AI Lead, gives a 30-minute keynote followed by a 30-minute tech talk. The teams move to their briefing rooms only after the programme ends.",
    detailFor: {
      builders:
        "Jason Mayes, Google's Web AI Lead: a 30-minute keynote, then a 30-minute tech talk. Stay for both — your team moves to its briefing room after the programme, at the departure time in your route.",
    },
    place: "educity",
    placeDetail: "Lobby · Taidon portaat",
    audiences: ALL_AUDIENCES,
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "fri-routes",
    start: at(FRI, "17:30"),
    title: "Challenge selection closes — your route is in the app",
    detail:
      "At 17:30 sinceai.app shows your team's route: the selected challenge, your departure time, the room, floor, route and floor plan. If your team has no challenge when selection closes, go straight to event staff — never guess a room.",
    place: "app",
    audiences: ["builders"],
    kind: "deadline",
    status: "confirmed",
  },
  {
    id: "fri-move-to-briefings",
    start: at(FRI, "18:30"),
    end: at(FRI, "18:50"),
    title: "Move to your briefing room",
    titleFor: { "challenge-partners": "Teams arrive at your room" },
    detail:
      "From 18:30, after Jason Mayes' programme, the teams move in turn to their challenge company's room at EduCity. Leave at the departure time in your team's route in sinceai.app and follow the volunteers.",
    detailFor: {
      "challenge-partners":
        "From 18:30 the teams are sent to the rooms in turn, guided by volunteers. Stay in your room — they come to you.",
    },
    place: "educity",
    placeDetail: "Floors 1–2",
    audiences: ["builders", "challenge-partners"],
    kind: "move",
    status: "confirmed",
  },
  {
    id: "fri-briefings",
    start: at(FRI, "18:50"),
    end: at(FRI, "19:30"),
    title: "Company challenge briefings",
    titleFor: {
      builders: "Your challenge briefing",
      "challenge-partners": "Your challenge briefing",
    },
    detail: "Each company presents its challenge to its teams in its own EduCity room, 18:50–19:30.",
    detailFor: {
      builders:
        "Your challenge company explains the task, expected result, boundaries, resources, evaluation and how to reach them during the event. Afterwards a volunteer walks you to BioCity.",
      "challenge-partners":
        "Your briefing runs 18:50–19:30: problem, expected result, boundaries, resources, evaluation and your live support route. 19:30 is a hard end for every briefing — the volunteer in your room then walks the teams to BioCity.",
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
    note: "Every briefing ends at 19:30 at the latest.",
  },
  {
    id: "fri-partner-setup",
    start: at(FRI, "18:30"),
    title: "Stands set up at BioCity",
    detail:
      "The stands at BioCity are set up from 18:30 on Friday — your position is in the BioCity stand plan at the top of this guide. Since AI confirms with you directly whether our team builds your stand and where your materials go.",
    place: "biocity",
    audiences: ["partners"],
    kind: "milestone",
    status: "working",
  },
  {
    id: "fri-build-start",
    start: at(FRI, "19:30"),
    title: "Move to BioCity, dinner and start building",
    detail:
      "At 19:30, after your briefing, a volunteer walks your team to BioCity. Eat when it suits you — dinner runs until 21:30 — find a workspace in BioCity or Joki and start building as soon as you arrive. Build spaces stay open around the clock.",
    place: "biocity-joki",
    audiences: ["builders"],
    kind: "move",
    status: "working",
  },
  {
    id: "fri-cp-saturday-briefing",
    start: at(FRI, "19:45"),
    title: "Briefing for Saturday",
    detail:
      "In the same room as the 15:45 weekend briefing: Saturday's arrival, the Q&A stands and practicalities.",
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
      "Buffet at Restaurant Mauno, BioCity, open the whole window — builders come over after their briefings; eat whenever suits you.",
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
    start: at(FRI, "21:30"),
    title: "Building continues through the night",
    detail: "Build spaces stay open. Short rest is fine in suitable event areas; there are no sleeping facilities.",
    place: "biocity-joki",
    audiences: ["builders"],
    kind: "note",
    status: "confirmed",
  },

  // ── Saturday 7 November ────────────────────────────────────────────────────
  {
    id: "sat-breakfast",
    start: at(SAT, "07:00"),
    approx: true,
    title: "Breakfast",
    detail: BREAKFAST_TBA,
    place: "biocity",
    audiences: ["builders"],
    kind: "meal",
    status: "working",
  },
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
    detail:
      "Sunday's arrival at EduCity at 08:45, the evaluation, choosing your challenge's top three teams by 13:00, using sinceai.app and the awards.",
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
    id: "sun-breakfast",
    start: at(SUN, "07:00"),
    approx: true,
    title: "Breakfast",
    detail: BREAKFAST_TBA,
    place: "biocity",
    audiences: ["builders"],
    kind: "meal",
    status: "working",
  },
  {
    id: "sun-cp-arrival",
    start: at(SUN, "08:45"),
    title: "Arrive at EduCity",
    titleFor: { judges: "Company evaluators: arrive at EduCity" },
    detail: "Come straight to EduCity — the evaluation briefing starts at 09:00.",
    place: "educity",
    audiences: ["challenge-partners", "judges"],
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "sun-evaluator-arrival",
    start: at(SUN, "09:00"),
    title: "Evaluation briefing",
    titleFor: { judges: "Company evaluators: evaluation briefing" },
    detail:
      "How the challenge evaluation works and how to use sinceai.app for it — the tech team is there to help.",
    place: "educity",
    placeDetail: "Room confirmed before Sunday",
    audiences: ["challenge-partners", "judges"],
    kind: "session",
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
    detail: "Company evaluators review the submissions to their own challenge and confirm its top three teams by 13:00.",
    detailFor: {
      "challenge-partners":
        "Review the submissions to your challenge and confirm your top three teams to Since AI by 13:00 at the latest — they are announced from 13:30.",
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
    id: "sun-move-to-educity",
    start: at(SUN, "12:30"),
    title: "Move to EduCity for the closing ceremony",
    detail:
      "From 12:30 volunteers guide everyone from BioCity and Joki to Taidon portaat at EduCity — be there before the closing ceremony starts at 13:15.",
    place: "educity",
    placeDetail: "Lobby · Taidon portaat",
    audiences: ["builders"],
    kind: "move",
    status: "confirmed",
  },
  {
    id: "sun-finalists-stage",
    start: at(SUN, "13:00"),
    title: "Finalists: come to the side of the stage",
    detail:
      "The five finalist teams come to the side of the stage at 13:00 to hear how the 14:00 presentations and the jury's questions work. Front-row seats are reserved for the finalists.",
    place: "educity",
    placeDetail: "Lobby · Taidon portaat",
    audiences: ["builders"],
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "sun-closing-ceremony",
    start: at(SUN, "13:15"),
    title: "Closing ceremony begins",
    detail: "The hosts thank everyone, followed by a short motivational talk of at most ten minutes.",
    place: "educity",
    placeDetail: "Lobby · Taidon portaat",
    audiences: ALL_AUDIENCES,
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "sun-closing",
    start: at(SUN, "13:30"),
    end: at(SUN, "14:00"),
    title: "Company challenges: top three announced",
    detail:
      "Each company's top three teams are announced and awarded on one slide — at most two minutes per company, all 15 challenges within 30 minutes.",
    detailFor: {
      builders:
        "Each company's top three teams are announced and awarded on one slide, at most two minutes per company. If your team is among them, stay after the ceremony on EduCity floor 1 under Taidon portaat — the photographer and photo wall are ready there for your team photo.",
    },
    place: "educity",
    audiences: ALL_AUDIENCES,
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "sun-finals",
    start: at(SUN, "14:00"),
    end: at(SUN, "15:10"),
    title: "Finals: five finalist teams present live",
    detail:
      "The five finalist teams chosen in the participant vote present live on stage to the jury: ten minutes each — at most four minutes to present and up to six for the jury's questions, one question from each judge — with a five-minute break between presentations. The jury then selects the overall winner of Since AI Hackathon 2026.",
    detailFor: {
      builders:
        "If your team is a finalist, you present live on stage at EduCity — not a recorded video: at most four minutes, then up to six minutes for the jury's questions, one from each judge. The jury then selects the overall winner.",
      judges:
        "Overall jury: the five finalists present live on stage, ten minutes each — at most four minutes of presentation, then up to six of questions, one question from each judge — with five-minute breaks. The jury's area is marked off on Taidon portaat. Be ready before 14:00 — your personal call time comes from Since AI.",
    },
    place: "educity",
    audiences: ALL_AUDIENCES,
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "sun-end",
    start: at(SUN, "15:30"),
    approx: true,
    title: "Since AI Hackathon 2026 ends",
    detail:
      "After the finals: the jury's decision, the overall winner's award and the closing words — the last thing on screen is the QR code to next year's hackathon. The event ends around 15:30.",
    place: "educity",
    audiences: ALL_AUDIENCES,
    kind: "milestone",
    status: "confirmed",
  },
  {
    id: "sun-partner-teardown",
    start: at(SUN, "15:30"),
    approx: true,
    title: "Stand teardown",
    detail: "Your stand stays in use until the event ends. Teardown starts after that, around 15:30, in the window agreed with you.",
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
  "fri-keynote",
  "fri-briefings",
  "fri-build-start",
  "sat-qa-morning",
  "sun-submission-deadline",
  "sun-closing-ceremony",
  "sun-closing",
  "sun-finals",
  "sun-end",
] as const;
