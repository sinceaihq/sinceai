import { GUIDE_BASE_PATH, GUIDE_LINKS } from "./facts";
import type { Audience, ChecklistGroup, GuideDefinition, GuideDetail } from "./types";

/**
 * Audience guides. Copy lives here (not in components) so pages stay thin and
 * a future translation only touches data.
 */
export const GUIDES: readonly GuideDefinition[] = [
  {
    audience: "builders",
    slug: "builders",
    name: "Builder Guide",
    navLabel: "Builders",
    lede: "Arrival, team, challenge, venue moves, the build weekend and submission — in one place.",
    forWho: "Accepted participants and their teams",
    firstMomentId: "fri-registration",
    metaDescription:
      "Since AI Hackathon 2026 Builder Guide: registration, team formation, challenge selection, briefings, build spaces, submission and closing — 6–8 November 2026, Turku.",
  },
  {
    audience: "challenge-partners",
    slug: "challenge-partners",
    name: "Challenge Partner Guide",
    navLabel: "Challenge partners",
    lede: "Where to arrive, where your teams meet you, when to be available and how Sunday evaluation works.",
    forWho: "Representatives of the challenge companies",
    firstMomentId: "fri-cp-arrival",
    metaDescription:
      "Since AI Hackathon 2026 Challenge Partner Guide: arrival, your EduCity briefing room, Saturday Q&A at Joki, Sunday evaluation and what to send Since AI.",
  },
  {
    audience: "partners",
    slug: "partners",
    name: "Partner & Tech Guide",
    navLabel: "Partners & tech",
    lede: "The six-stand BioCity plan, setup and teardown, presence hours and practicalities for visibility and tech partners.",
    forWho: "Visibility, tech and ecosystem partners",
    firstMomentId: "fri-opening",
    metaDescription:
      "Since AI Hackathon 2026 Partner & Tech Guide: BioCity stand plan, setup, opening hours, meals and teardown for visibility and tech partners.",
  },
  {
    audience: "judges",
    slug: "judges",
    name: "Judge Guide",
    navLabel: "Judges",
    lede: "Two roles, one Sunday: company challenge evaluation in the morning and the overall jury at the 14:00 finals.",
    forWho: "The overall jury and company challenge evaluators",
    firstMomentId: "sun-evaluator-arrival",
    metaDescription:
      "Since AI Hackathon 2026 Judge Guide: company challenge evaluation, participant voting, five live finalist presentations and the overall winner — Sunday 8 November.",
  },
  {
    audience: "speakers",
    slug: "speakers",
    name: "Speaker & Guest Guide",
    navLabel: "Speakers & guests",
    lede: "Arrival, venue, stage and AV principles — your personal run sheet covers the exact times.",
    forWho: "Speakers, special guests and hosts",
    firstMomentId: "fri-opening",
    metaDescription:
      "Since AI Hackathon 2026 Speaker & Guest Guide: arrival at EduCity, opening and closing programme, AV and travel principles.",
  },
] as const;

export function getGuide(audience: Audience): GuideDefinition {
  const guide = GUIDES.find((g) => g.audience === audience);
  if (!guide) throw new Error(`Unknown guide: ${audience}`);
  return guide;
}

export const guidePath = (audience: Audience) => `${GUIDE_BASE_PATH}/${getGuide(audience).slug}`;

export const HUB = {
  name: "Hackathon 2026 / Field Guide",
  shortName: "Field Guide",
  lede: "Three venues, one event flow. Friday starts at EduCity with arrival, the opening and the challenge briefings. The build continues across BioCity and Joki. On Sunday, everyone returns to EduCity: the company challenge winners at 13:30, then the finals at 14:00.",
  openingNote:
    "The official opening is Friday 6 November at 17:00. Arrival times differ by role — your guide has yours.",
  metaDescription:
    "The Since AI Hackathon 2026 Field Guide: schedules, venues, maps and checklists for builders, challenge partners, partners, judges and speakers — 6–8 November 2026, Turku.",
} as const;

export const VENUE_GUIDE = {
  name: "Venue Explorer",
  lede: "Floor plans for EduCity, BioCity and Joki, the walk between them — and a 3D preview of the spaces.",
  metaDescription:
    "Since AI Hackathon 2026 Venue Explorer: zoomable floor plans for EduCity, BioCity and Joki, company rooms and stands, venue photos and a 3D preview of the event spaces.",
} as const;

/** The first-view critical path per audience: short, action-first. */
export const CRITICAL_PATH: Partial<Record<Audience, readonly { label: string; time: string; text: string }[]>> = {
  builders: [
    { label: "Check in", time: "Fri 15:00", text: "EduCity — either main entrance." },
    { label: "Team", time: "by 16:45", text: "Everyone in the same team in sinceai.app — then Team check." },
    { label: "Opening · select", time: "17:00–17:50", text: "Taidon portaat — select your team's challenge in the app." },
    { label: "Move", time: "from 17:50", text: "Follow your team's route in the app to your briefing room." },
    { label: "Briefing", time: "18:15–18:45", text: "Your company's room at EduCity." },
    { label: "Build", time: "from 18:45", text: "Dinner and building in BioCity or Joki, around the clock." },
    { label: "Submit", time: "Sun 10:00", text: "Your team submits in the app — the deadline is fixed." },
  ],
  "challenge-partners": [
    { label: "Arrive", time: "Fri 15:30", text: "EduCity — weekend briefing at 15:40." },
    { label: "Brief", time: "18:15–18:45", text: "Your teams come to your EduCity room." },
    { label: "Q&A", time: "Sat 09–18", text: "At your Joki stand (pause 12:00–14:30)." },
    { label: "Evaluate", time: "Sun 10–13", text: "Briefing at 09:00, then confirm your winner by 13:00." },
    { label: "Winners · finals", time: "Sun 13:30", text: "Company challenge winners announced at EduCity, then the 14:00 finals." },
  ],
  partners: [
    { label: "Opening", time: "Fri 17:00", text: "EduCity, Taidon portaat." },
    { label: "Set up", time: "Fri 18:00", text: "Your stand at BioCity." },
    { label: "Be seen", time: "All weekend", text: "Stands stay open for the whole event." },
    { label: "Winners · finals", time: "Sun 13:30", text: "EduCity — company winners, then the finals at 14:00." },
    { label: "Teardown", time: "after 15:00", text: "In the agreed post-event window." },
  ],
  judges: [
    { label: "Deadline", time: "Sun 10:00", text: "Submissions close." },
    { label: "Evaluate", time: "10:00–13:00", text: "Company evaluators pick their challenge's winner." },
    { label: "Finalists", time: "by 12:00", text: "Five most-voted solutions." },
    { label: "Final", time: "14:00", text: "Five finalist teams present live; the jury picks the overall winner." },
  ],
  speakers: [
    { label: "Run sheet", time: "Before travel", text: "Your host confirms every personal time." },
    { label: "Arrive", time: "Fri", text: "EduCity, Joukahaisenkatu 7." },
    { label: "Opening", time: "Fri 17:00", text: "Opening programme and keynote." },
    { label: "Winners · finals", time: "Sun 13:30", text: "Company winners, finals 14:00, over by 15:00." },
  ],
};

export const CHECKLISTS: Record<Audience, readonly ChecklistGroup[]> = {
  builders: [
    {
      title: "Before you arrive",
      items: [
        "Everyone in your team has joined the same team in sinceai.app.",
        "Your team has agreed who selects the challenge in sinceai.app on Friday, 17:00–17:50.",
        "You have joined the Since AI Discord for updates and teammates.",
        "If you plan to sleep, you have your own accommodation booked.",
      ],
    },
    {
      title: "Bring",
      items: [
        "Laptop and charger",
        "Adapters you need (Finland: EU plug, type C/F, 230 V)",
        "Reusable water bottle",
        "A pen",
      ],
    },
    {
      title: "On the day",
      items: [
        "Fri 15:00 — check in at EduCity, then team formation beside Taidon portaat.",
        "Fri 15:15 — the challenges open for preview in sinceai.app.",
        "By 16:45 — every member in the team in the app and Team check passed; teams lock at 16:45.",
        "Fri 17:00–17:50 — opening ceremony; select your team's challenge in sinceai.app before 17:50.",
        "From 17:50 — follow your team's route in the app to your briefing room.",
        "Sun 10:00 — your team's submission is in. Then vote until 12:00 on the ten solutions the app gives you.",
      ],
    },
  ],
  "challenge-partners": [
    {
      title: "Send Since AI before the event",
      items: [
        "Primary contact and a backup with decision authority",
        "Friday onsite representatives",
        "Saturday Q&A presence hours and support owner",
        "Sunday evaluator and backup",
        "Final approved challenge brief: task, expected deliverable, data, tools and resources",
        "Your evaluation criteria",
        "Data, IP and NDA boundaries — and the signing process if an NDA is needed",
        "Live support channel and the hours it is monitored",
        "AV and technical needs",
        "Approved logo and a short company introduction — the hosts read it when they introduce your challenge at the opening",
        "Meal headcount and dietary needs",
      ],
    },
    {
      title: "Bring on Friday",
      items: [
        "A laptop suitable for presenting, charger and adapters",
        "An offline (PDF) copy of your briefing",
        "Anything teams need to start: access instructions, datasets, examples",
        "Your Q&A stand materials (roll-up, table items) — leave them at the agreed drop-off point at EduCity; Since AI sets your stand up at Joki for Saturday",
      ],
    },
    {
      title: "Your briefing leaves teams knowing",
      items: [
        "The problem: who it is for and why it matters",
        "The expected deliverable — and what a strong result looks like",
        "What is required, prohibited, confidential or out of scope",
        "Data, tools, credentials, examples and resources",
        "How you will evaluate submissions",
        "Your live support channel and monitored hours",
        "Any NDA, data, IP or recording restrictions",
      ],
    },
  ],
  partners: [
    {
      title: "Confirm with Since AI",
      items: [
        "Representatives and the hours they are at the stand",
        "Stand needs: table and chairs, power, network, screens",
        "Materials you bring, storage and loading",
        "Setup time on Friday and the teardown window on Sunday",
        "Meal headcount and dietary needs",
        "Any agreed workshop, demo, recruiting or visibility slot",
        "Every onsite representative joined the Since AI Discord — see Discord below",
      ],
    },
    {
      title: "If you provide tech for builders",
      items: [
        "How participants get access (and when it starts and ends)",
        "How credits or credentials are distributed",
        "Quota or rate-limit notes that are safe to share",
        "Docs link and onsite / remote support hours (also pinned in your Discord partner channel)",
        "Who builders contact when something breaks",
      ],
    },
  ],
  judges: [
    {
      title: "Before Sunday",
      items: [
        "Confirm your onsite attendance and arrival time with Since AI.",
        "Know your role: overall jury, company evaluator — or both.",
        "Get your project access or login working before the deadline.",
        "Read the approved criteria and weighting shared in your briefing.",
        "Tell Since AI about any possible conflict of interest.",
        "Share food and accessibility needs.",
      ],
    },
    {
      title: "On Sunday",
      items: [
        "Company evaluators: evaluation briefing at EduCity at 09:00.",
        "Submissions close at 10:00 — review only what was submitted on time.",
        "Company evaluators: confirm your winner by 13:00 — winners are announced from 13:30.",
        "Overall jury: be ready before the 14:00 finals.",
      ],
    },
  ],
  speakers: [
    {
      title: "Before you travel",
      items: [
        "Talk title, duration and language confirmed",
        "Slides sent by the agreed deadline, in the agreed format",
        "Your personal run sheet: arrival, AV check, backstage call and stage slot",
        "Travel and hotel details confirmed in your personal itinerary",
        "Dietary and accessibility needs shared",
      ],
    },
    {
      title: "Bring",
      items: [
        "Laptop, charger and adapters (HDMI / USB-C)",
        "An offline copy of your slides",
        "Clicker, if you prefer your own",
        "Warm, weatherproof layers — Turku in November",
      ],
    },
  ],
};

export const DETAILS: Record<Audience, readonly GuideDetail[]> = {
  builders: [
    {
      q: "Can I take part alone?",
      a: "Yes — solo participation is allowed. You can still look for teammates on Discord and at Friday's team formation area. A one-person team needs a quick check by the tech team at registration.",
    },
    {
      q: "A teammate arrives late",
      a: "Tell the registration desk on Friday. The teammate must already be in your team in sinceai.app before team formation closes at 16:45 — after that nobody can join a team and members cannot be changed.",
    },
    {
      q: "How does team formation work?",
      a: "From registration, walk to the team formation area beside Taidon portaat on EduCity's first floor (the lobby and room 1091). Teams have up to five members. Looking for people? Stand in the zone for the number of open places in your team — 1, 2, 3 or 4. Every member must join the same team in sinceai.app. Then leave via the exit side: at Team check a volunteer looks at your full team member list in the app before you go on to the opening. Already have a team? You pass Team check too. Team formation closes at 16:45.",
    },
    {
      q: "How does challenge selection work?",
      a: "Every challenge and its template opens for preview in sinceai.app at 15:15 on Friday. Teams lock at 16:45, and at 16:50 the places per challenge are set — shared as evenly as possible across the 15 challenges. Challenge selection then opens in sinceai.app at 17:00, as the opening ceremony starts, and closes at 17:50: your team selects one challenge for the whole team. Places per challenge are limited. At 17:50 the app shows your team's route to its briefing room. If your team has no challenge when selection closes, go straight to event staff — never guess a room.",
    },
    {
      q: "Who submits for the team?",
      a: "Any member of the team can submit the team's solution in sinceai.app — agree who does it. The deadline, Sunday 10:00, is fixed.",
    },
    {
      q: "Meals and dietary needs",
      a: "Mauno serves four meals at BioCity: Fri 18:30–21:00, Sat 10:30–13:30 and 17:00–20:00, Sun 10:00–12:30. Eat at your own pace within each window — the meals are in sinceai.app, with reminders. Dietary requirements are collected in advance. Dishes are disposable and takeaway containers are available.",
    },
    {
      q: "What happens at the finals?",
      a: "At 14:00 on Sunday, the five finalist teams — the five most-voted solutions — present their projects live on stage at EduCity, not as recorded videos. The jury evaluates the presentations and selects the overall winner.",
    },
    {
      q: "Can we sleep at the venue?",
      a: "The build spaces stay open around the clock and you can leave and come back. There are no beds, sleeping rooms or lodging; a short rest is fine in suitable event areas. Accommodation is your own choice and cost.",
    },
    {
      q: "Can we use AI tools?",
      a: "Yes. AI-assisted development is allowed. Disclose the main AI tools you used and separate earlier work from what you built at the event. Your team is responsible for the solution working.",
    },
    {
      q: "What does it cost?",
      a: "Participation and the event meals are free.",
    },
    {
      q: "Under 18?",
      a: `Contact ${GUIDE_LINKS.contactEmail} before the event.`,
    },
  ],
  "challenge-partners": [
    {
      q: "Arriving by car",
      a: "Friday: park in ParkCity (Joukahaisenkatu 8, paid guest parking on floors 1–3) — EduCity is across the street, about 190 m to door B. Saturday: get dropped off on Tykistökatu at BioCity's entrance recess, where the supercars are on display, or walk about 360 m from ParkCity to BioCity's main entrance. Every route is in the 3D campus, step by step.",
    },
    {
      q: "Q&A hours vs. your presence",
      a: "The Q&A area at Joki is open Sat 09:00–12:00 and 14:30–18:00, with a break 12:00–14:30. Please be available for at least two hours across those windows and post your exact hours at your stand. You are welcome on site all weekend — even around the clock.",
    },
    {
      q: "The opening ceremony",
      a: "At 17:00 the hosts introduce every challenge — at most a minute per company — from the short introduction you send in advance; if we do not receive one, Since AI writes it. Company representatives do not present on stage. Jason Mayes' keynote follows. Teams select their challenge in sinceai.app until 17:50 and then come to your room for your briefing: start as soon as all your teams are there, 18:15 at the latest, and finish at 18:45 — 19:00 at the latest if the volunteer in your room grants extra time.",
    },
    {
      q: "Stand setup at Joki",
      a: "Since AI sets it up for you. Bring your stand materials (a roll-up, for example) to EduCity on Friday and leave them at the agreed drop-off point — we confirm the exact point before the event. The Since AI team takes them to Joki, and when you arrive at 08:30 on Saturday your stand is ready.",
    },
    {
      q: "NDA and confidential data",
      a: "Your company owns any NDA process, signatures and records. Do not reveal confidential content before signatures are complete, and plan a signing method that works for a full room of teams — with a paper backup.",
    },
    {
      q: "Meals",
      a: "Food will be reserved for company representatives at the scheduled meal times. Joining the meals is entirely optional.",
    },
    {
      q: "Sunday results",
      a: "Come straight to EduCity for the evaluation briefing at 09:00. Evaluate the submissions to your challenge from 10:00, when submissions close, until 13:00 — confirm your winning team and solution to Since AI by 13:00 at the latest. The 15 company challenge winners are announced from 13:30 at EduCity; at the 14:00 finals the five finalist teams (the five most-voted solutions) present live on stage.",
    },
  ],
  partners: [
    {
      q: "Arriving by car",
      a: "Get dropped off on Tykistökatu at BioCity's entrance recess, where the supercars are on display — the stands are a 1–2 minute walk inside. To park, use ParkCity (Joukahaisenkatu 8, paid guest parking on floors 1–3), about 360 m from BioCity's main entrance.",
    },
    {
      q: "Is my stand staffed around the clock?",
      a: "No requirement. Stands stay open for the whole event, but the stand being open does not mean it is staffed — tell us your presence hours and we share them with builders.",
    },
    {
      q: "What about equipment left overnight?",
      a: "Agree storage for valuables with Since AI before the event.",
    },
    {
      q: "Meals",
      a: "Food will be reserved for company representatives at the scheduled meal times. Joining the meals is entirely optional.",
    },
    {
      q: "Benefits differ by partner",
      a: "This guide covers shared logistics. Your agreement defines your specific benefits, slots and deliverables.",
    },
  ],
  judges: [
    {
      q: "Overall jury vs. company evaluator",
      a: "The overall jury evaluates the five finalist teams' live presentations on stage at the 14:00 finals and selects the overall winner. A company evaluator reviews the submissions to one company's challenge between 10:00 and 13:00 and decides that company's winner, announced from 13:30. One person can hold both roles — the responsibilities stay separate.",
    },
    {
      q: "How are the five finalists chosen?",
      a: "Between 10:00 and 12:00 sinceai.app gives every builder ten solutions to review and vote on. Voting closes at 12:00, the five teams with the most votes are confirmed as finalists, and they present live on stage in the finals at 14:00.",
    },
    {
      q: "Scoring criteria",
      a: "The approved 2026 criteria, weighting and scoring method are shared in your personal briefing.",
      status: "pending",
    },
  ],
  speakers: [
    {
      q: "Getting to Turku",
      a: "Kupittaa railway station is next to the campus: about 350 m (5 min) on foot to EduCity, over the covered Kalevansilta footbridge and up the wide outdoor stairs at EduCity's east corner — check VR for the current route and stops of your train. From Turku Airport, Föli bus 1 runs to the city centre, or take a taxi straight to EduCity. Always follow your personal itinerary.",
    },
    {
      q: "Where do I meet my host?",
      a: "At EduCity, Joukahaisenkatu 7. Your host confirms the exact meeting point and time in your run sheet.",
    },
    {
      q: "Hotel",
      a: "Event spaces are not accommodation. Any hotel arranged for you is confirmed in your personal itinerary.",
    },
    {
      q: "Emergencies",
      a: "The emergency number in Finland is 112.",
    },
  ],
};

/** Public, verified help routes. No personal numbers. */
export const HELP = {
  email: GUIDE_LINKS.contactEmail,
  discord: GUIDE_LINKS.discord,
  reportIncident: GUIDE_LINKS.appReportIncident,
  codeOfConduct: GUIDE_LINKS.codeOfConduct,
  mlhCodeOfConduct: GUIDE_LINKS.mlhCodeOfConduct,
} as const;
