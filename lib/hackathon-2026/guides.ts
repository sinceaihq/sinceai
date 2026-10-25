import { GUIDE_BASE_PATH, GUIDE_LINKS } from "./facts";
import { COMPUTING, COMPUTING_HREF } from "./computing";
import { CATERING, DIETARY } from "./food";
import { AI_POLICY, SUBMISSION } from "./submission";
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
  lede: "Three venues, one event flow. Friday starts at EduCity with arrival, the opening and the challenge briefings. The build continues across BioCity and Joki. On Sunday, everyone returns to EduCity: the closing ceremony at 13:15, each challenge's top three at 13:30, then the finals at 14:00.",
  openingNote:
    "The official opening is Friday 6 November at 17:00. Arrival times differ by role — your guide has yours.",
  metaDescription:
    "The Since AI Hackathon 2026 Field Guide: schedules, venues, maps and checklists for builders, challenge partners, partners, judges and speakers — 6–8 November 2026, Turku.",
} as const;

export const VENUE_GUIDE = {
  name: "Venue Explorer",
  lede: "Floor plans for EduCity, BioCity and Joki, the walk between them, the weekend menu — and a 3D preview of the spaces.",
  metaDescription:
    "Since AI Hackathon 2026 Venue Explorer: zoomable floor plans for EduCity, BioCity and Joki, company rooms and stands, the meal schedule and special diets, venue photos and a 3D preview of the event spaces.",
} as const;

/** The first-view critical path per audience: short, action-first. */
export const CRITICAL_PATH: Partial<Record<Audience, readonly { label: string; time: string; text: string }[]>> = {
  builders: [
    { label: "Check in", time: "Fri 15:00", text: "EduCity — either main entrance." },
    { label: "Team", time: "by 16:45", text: "Everyone in the same team in sinceai.app — then Team check." },
    { label: "Opening · select", time: "17:00–17:30", text: "Taidon portaat — your team's owner selects the challenge in the app." },
    { label: "Keynote · move", time: "17:30 · 18:30", text: "Jason Mayes, then follow your team's route to your briefing room." },
    { label: "Briefing", time: "18:50–19:30", text: "Your company's room at EduCity." },
    { label: "Build", time: "from 19:30", text: "Dinner and building in BioCity or Joki, around the clock." },
    { label: "Submit", time: "Sun 10:00", text: "Your team submits in sinceai.app, not Devpost — the deadline is fixed." },
  ],
  "challenge-partners": [
    { label: "Arrive", time: "Fri 15:30", text: "EduCity — weekend briefing at 15:45." },
    { label: "Brief", time: "18:50–19:30", text: "Your teams come to your EduCity room." },
    { label: "Q&A", time: "Sat 09–18", text: "At your Joki stand (pause 12:00–14:30)." },
    { label: "Evaluate", time: "Sun 10–13", text: "Arrive 08:45, briefing 09:00, then confirm your top three by 13:00." },
    { label: "Top three · finals", time: "Sun 13:30", text: "Your top three announced at EduCity, then the 14:00 finals." },
  ],
  partners: [
    { label: "Arrive", time: "Fri 16:20–17:00", text: "Since AI welcomes you and walks you to the opening." },
    { label: "Opening", time: "Fri 17:00", text: "EduCity, Taidon portaat." },
    { label: "Set up", time: "Fri 18:30", text: "Stands at BioCity — the arrangement is confirmed with you." },
    { label: "Be seen", time: "All weekend", text: "Stands stay open until the event ends." },
    { label: "Closing · finals", time: "Sun 13:15", text: "EduCity — closing ceremony, then the finals at 14:00." },
    { label: "Teardown", time: "around 15:30", text: "After the event, in the agreed window." },
  ],
  judges: [
    { label: "Deadline", time: "Sun 10:00", text: "Submissions close." },
    { label: "Evaluate", time: "10:00–13:00", text: "Company evaluators pick their challenge's top three." },
    { label: "Finalists", time: "by 12:00", text: "Five most-voted solutions." },
    { label: "Final", time: "14:00–15:10", text: "Five finalist teams present live; the jury picks the overall winner." },
  ],
  speakers: [
    { label: "Run sheet", time: "Before travel", text: "Your host confirms every personal time." },
    { label: "Arrive", time: "Fri", text: "EduCity, Joukahaisenkatu 7." },
    { label: "Opening", time: "Fri 17:00", text: "Opening programme and keynote." },
    { label: "Closing · finals", time: "Sun 13:15", text: "Closing ceremony, finals 14:00, ends around 15:30." },
  ],
};

export const CHECKLISTS: Record<Audience, readonly ChecklistGroup[]> = {
  builders: [
    {
      title: "Before you arrive",
      items: [
        "You are accepted to the hackathon and can sign in to your own sinceai.app account — every member needs their own.",
        "Everyone in your team has joined the same team in sinceai.app.",
        "Your team has agreed which challenge it wants — the team's owner selects it in sinceai.app on Friday, 17:00–17:30.",
        "You have joined the Since AI Discord for updates and teammates.",
        "Attendance confirmed on your sinceai.app dashboard, if it asks you to.",
        `Meal RSVP done on your sinceai.app dashboard by ${DIETARY.deadlineLabel}, with any dietary needs.`,
        "Your team's repository is set up and everyone can push to it.",
        "Everyone has read this Builder Guide — especially Build & submit.",
        "If you plan to sleep, you have your own accommodation booked.",
        `Optional: if you want CSC / LUMI computing, you registered by ${COMPUTING.deadlineLabel} — instructions are in your Since AI email.`,
      ],
    },
    {
      title: "Bring",
      items: [
        "Laptop and charger",
        "Adapters you need (Finland: EU plug, type C/F, 230 V)",
        "Reusable water bottle",
        "A pen",
        "Optional: a phone hotspot as a network backup",
      ],
    },
    {
      title: "On the day",
      items: [
        "Fri 15:00 — check in at EduCity, then team formation beside Taidon portaat.",
        "Fri 15:00 — the challenges open for preview in sinceai.app.",
        "By 16:45 — every member in the team in the app and Team check passed; teams lock at 16:45.",
        "Fri 17:00–17:30 — opening ceremony; your team's owner selects the challenge in sinceai.app before 17:30.",
        "17:30–18:30 — Jason Mayes' keynote and tech talk; your team's route is in the app from 17:30.",
        "From 18:30 — leave at your departure time and follow the route to your briefing room (18:50–19:30).",
        "Before Sun 10:00 — every team member has accepted the challenge IP terms in sinceai.app.",
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
        "Who builds your stand on Friday, where your materials are dropped off, and the teardown window on Sunday",
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
        "Company evaluators: arrive at EduCity at 08:45 — the evaluation briefing starts at 09:00.",
        "Submissions close at 10:00 — review only what was submitted on time.",
        "Company evaluators: confirm your challenge's top three teams by 13:00 — they are announced from 13:30.",
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
      q: "What if a team member arrives after Friday's Team check?",
      a: `Only with a late arrival the organisers have approved for that person in advance — ask at ${GUIDE_LINKS.contactEmail} before the event. Even then, the member must already be accepted to the hackathon and in your team in sinceai.app before teams lock at 16:45; after that nobody can join a team and members cannot be changed. A late arrival never reopens a locked team.`,
      points: [
        "On Friday, tell registration or the Team check volunteer about the approved late arrival.",
        "The late member checks in personally with event staff on arrival — checking in is individual, and browsing the app from elsewhere is not checking in.",
        "Challenges open for preview in sinceai.app at 15:00 on Friday: an accepted member can read them on a phone and discuss with the team, but the team's owner makes the selection at 17:00–17:30.",
        "Since AI Hackathon is an on-site event; there is no remote participation.",
      ],
    },
    {
      q: "How does team formation work?",
      a: "From registration, walk to the team formation area beside Taidon portaat on EduCity's first floor (the lobby and room 1091). Teams have up to five members. Looking for people? Stand in the zone for the number of open places in your team — 1, 2, 3 or 4. Every member must join the same team in sinceai.app. Then leave via the exit side: at Team check a volunteer looks at your full team member list in the app before you go on to the opening. Already have a team? You pass Team check too. Team formation closes at 16:45.",
    },
    {
      q: "How does challenge selection work?",
      a: "Every challenge and its template opens for preview in sinceai.app at 15:00 on Friday. Teams lock at 16:45, and at 16:50 the places per challenge are set — shared as evenly as possible across the 15 challenges. Challenge selection then opens in sinceai.app at 17:00, as the opening ceremony starts, and closes at 17:30: the team's owner selects one challenge for the whole team. Places per challenge are limited. At 17:30 the app shows your team's route: the challenge, your departure time, room, floor, route and floor plan. The teams move in turn from 18:30, after Jason Mayes' programme, and the briefings run 18:50–19:30. If your team has no challenge when selection closes, go straight to event staff — never guess a room.",
    },
    {
      q: "Can I bring my own food? Will food and drinks be provided?",
      a: `Yes, bring your own snacks and food — keep the spaces clean and handle food safely. The scheduled event meals at ${CATERING.restaurant}, BioCity, are free: confirm which ones you will join in the Meal RSVP on your sinceai.app dashboard by ${DIETARY.deadlineLabel}, with any dietary needs, so a meal is reserved for you. Each meal includes a warm main course, bread and spread, and water. The restaurant sells ${CATERING.forSale.join(", ").replace(/, ([^,]*)$/, " and $1")} separately.`,
      points: [
        "The build spaces are open around the clock; food service is not. Bring a reusable water bottle and some snacks for the night.",
        "Pre-arranged special meals are collected from Restaurant Mauno's open kitchen. With food allergies, always ask the restaurant staff before eating.",
        "Any extra snacks or drinks from partners are a bonus — don't count on them overnight.",
      ],
      links: [{ label: "Meal times and menu", href: `${GUIDE_BASE_PATH}/venue#food` }],
    },
    {
      q: "Is there Wi-Fi? Can we use Linux?",
      a: "Bring any laptop: Linux, Windows and macOS all work, and no brand or operating system is required. Event Wi-Fi is free for participants.",
      points: [
        "EduCity (Turku University of Applied Sciences): connect to TUAS Guest and register in the browser with your email address. eduroam works if your own institution takes part in it.",
        "BioCity and Joki: network access is arranged with the venue operator — follow the instructions event staff give on site.",
        "Download dependencies, models and container images before you arrive, and bring a phone hotspot as a backup if you can. No connection is guaranteed to be fast or uninterrupted.",
        "Never scan or security-test the venue networks.",
      ],
      links: [
        { label: "Turku UAS: visitor Wi-Fi", href: "https://www.turkuamk.fi/en/about-us/campuses/" },
        { label: "Turku UAS: eduroam", href: "https://www.turkuamk.fi/en/about-us/contact-us/it-services/" },
      ],
    },
    {
      q: "Can we use CSC / LUMI computing?",
      a: `Optionally, yes. Eligible participants can request access to the LUMI supercomputer and the Aitta inference service. Registration closes on ${COMPUTING.deadlineLabel} and needs approval in advance; activation can take several days. Access is limited to participants affiliated with organisations in EU Member States or Horizon Europe-associated countries, and a new CSC account needs an individual institutional email address. The registration instructions were sent to you privately by email.`,
      links: [
        { label: "AI resources in the Field Guide", href: COMPUTING_HREF },
        { label: "LUMI AI Factory onboarding guide", href: "https://lumi-ai-factory.github.io/LUMI_AIF_Onboarding/" },
      ],
    },
    {
      q: "What happens at the finals?",
      a: "The five finalist teams — the five most-voted solutions — come to the side of the stage at 13:00 on Sunday, and from 14:00 they present live on stage at EduCity, not as recorded videos: at most four minutes each, then up to six minutes for the jury's questions, one from each judge. The jury selects the overall winner, and the event ends around 15:30.",
    },
    {
      q: "Can we sleep at the venue?",
      a: "The build spaces stay open around the clock and you can leave and come back. There are no beds, sleeping rooms or lodging; a short rest is fine in suitable event areas. Accommodation is your own choice and cost.",
    },
    {
      q: "What does it cost?",
      a: "Participation is free, and so are the event meals — confirm yours in the Meal RSVP on your sinceai.app dashboard.",
    },
    {
      q: "Under 18?",
      a: `Contact ${GUIDE_LINKS.contactEmail} before the event.`,
    },
  ],
  "challenge-partners": [
    {
      q: "Arriving by car",
      a: "Friday: park in ParkCity (Joukahaisenkatu 8, Aimo Park, paid guest parking on floors 1–3; entry 06:00–00:00, exit around the clock) — EduCity is across the street, about 190 m to door B, or step-free through the lifts between ICT-City and EduCity. Saturday: walk about 360 m from ParkCity to BioCity's main entrance on Tykistökatu, the way in to Joki. If someone drops you off, they stop only where the signs allow. P-Station Kupittaa (Joukahaisenkatu 2, EuroPark) is open 24/7. Prices and all options: Venue Explorer → Parking; every route is in the 3D campus, step by step.",
    },
    {
      q: "Q&A hours vs. your presence",
      a: "The Q&A area at Joki is open Sat 09:00–12:00 and 14:30–18:00, with a break 12:00–14:30. Please be available for at least two hours across those windows and post your exact hours at your stand. You are welcome on site all weekend — even around the clock.",
    },
    {
      q: "The opening ceremony",
      a: "At 17:00 the hosts introduce every challenge — at most a minute per company — from the short introduction you send in advance; if we do not receive one, Since AI writes it. Company representatives do not present on stage. Jason Mayes' keynote and tech talk follow, 17:30–18:30. Teams select their challenge in sinceai.app until 17:30, move to the rooms in turn from 18:30 and come to your room for your briefing, 18:50–19:30 — 19:30 is a hard end.",
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
      a: "Arrive at EduCity at 08:45; the evaluation briefing starts at 09:00. Evaluate the submissions to your challenge from 10:00, when submissions close, until 13:00 — confirm your top three teams to Since AI by 13:00 at the latest. The closing ceremony starts at 13:15; each company's top three teams are announced from 13:30, at most two minutes per company; at the 14:00 finals the five finalist teams (the five most-voted solutions) present live on stage.",
    },
  ],
  partners: [
    {
      q: "Arriving by car",
      a: "Park in ParkCity (Joukahaisenkatu 8, Aimo Park, paid guest parking on floors 1–3; entry 06:00–00:00, exit around the clock), about 360 m from BioCity's main entrance on Tykistökatu — or at P-Station Kupittaa (Joukahaisenkatu 2, EuroPark), open 24/7. You can be dropped off on Tykistökatu at BioCity's entrance recess — the driver stops only where the signs allow it; the stands are a 1–2 minute walk inside. Bringing stand equipment? Agree unloading with the Since AI team in advance. Prices and all options: Venue Explorer → Parking.",
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
      a: "The overall jury evaluates the five finalist teams' live presentations on stage at the 14:00 finals and selects the overall winner. A company evaluator reviews the submissions to one company's challenge between 10:00 and 13:00 and decides its top three teams, announced from 13:30. One person can hold both roles — the responsibilities stay separate.",
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
/**
 * Builder FAQ on building with AI, open source, IP and submitting — shown in the builder guide's
 * Build & submit section. Submission facts come from ./submission (verified against sinceai.app).
 */
export const BUILDING_FAQ: readonly GuideDetail[] = [
  {
    q: "Can we use ChatGPT, Claude, Cursor, GitHub Copilot, Gemini, Lovable and other AI tools?",
    a: `Yes — absolutely. AI-assisted development is permitted and encouraged. ${AI_POLICY.message}`,
    points: [
      `For example: ${AI_POLICY.tools.join(", ")} ${AI_POLICY.toolsNote}`,
      `Use it for anything: ${AI_POLICY.uses.charAt(0).toLowerCase()}${AI_POLICY.uses.slice(1)}`,
      AI_POLICY.notRequired,
    ],
  },
  {
    q: "Will using AI-generated code hurt our judging score?",
    a: "No. Using AI — even for most of your code — does not count against you. AI is a tool, not a shortcut around responsibility: we care about the problem you solve, the value you create, the working product you demonstrate and your ability to explain the decisions behind it. AI never excuses code that doesn't work or data you weren't allowed to use.",
    points: [
      "Evaluators look at what your team built during the event, whether it works and whether it answers the challenge.",
      "They also weigh real-world relevance and business value, technical quality, feasibility, how well you understand and explain your system, and responsible handling of privacy, security and data.",
      "Each challenge company evaluates its own challenge with its own criteria and picks its top three. The five most-voted solutions present in the finals, where the jury selects the overall winner.",
    ],
  },
  {
    q: "What should we disclose about AI and third-party technology?",
    a: "The submission form asks for your main AI tools and how you used generative AI — that is the required part. We also recommend a short technology inventory in your README; a concise list is enough, not a full software bill of materials.",
    points: [
      "AI development tools, models and APIs you used",
      "Frameworks and libraries, with their licences where it matters",
      "Third-party datasets and significant external services",
      "Pre-existing code and assets — kept apart from what you built at the event",
      "Material security and privacy considerations",
    ],
  },
  {
    q: "Can we use our own GitHub repositories and let AI coding agents modify the code?",
    a: "Yes. Work in your own repositories — private ones too, where that suits you — and let AI assistants and agents read and change your project files, as long as you have the rights to do so. No VPN or virtual machine is required; if a challenge sets rules for its environment or data, follow them.",
    points: [
      "Commit often with meaningful messages; keep a README with reproducible setup steps.",
      "Keep secrets in environment variables or a secrets manager — never in a commit.",
      "Give tools and agents the least access they need, and review the changes an agent makes.",
      "Test before you deploy.",
      "Don't send personal or confidential data to an external AI provider without permission.",
      "Respect open-source licences and their attribution requirements.",
      "Don't misuse the venue networks or run unauthorised security tests.",
    ],
  },
  {
    q: "Who owns what we build? What are the challenge IP terms?",
    a: "It depends on the challenge. Some challenges transfer the new work made for them to the challenge company; others let you keep ownership and grant the company a licence. The submission page shows the terms for your challenge, and every team member must read and accept them personally before your team can submit. Your pre-existing work and general know-how are not transferred, and open-source material stays under its own licence.",
    points: [
      "Never publish confidential agreements, private datasets, partner credentials or protected challenge material.",
      "A public repository is fine only where your challenge's terms allow it.",
    ],
  },
  {
    q: "Where do we submit? Do we need Devpost?",
    a: `${SUBMISSION.notDevpost} Submit in sinceai.app by ${SUBMISSION.deadlineLabel}. ${SUBMISSION.whereToSubmit}`,
    links: [{ label: "Open your sinceai.app dashboard", href: SUBMISSION.dashboardHref }],
  },
  {
    q: "Is a demo video or a pitch deck required? Which files can we upload?",
    a: "Neither is required. A short demo video — about two minutes — is strongly recommended: add a YouTube link, or upload MP4 or WebM. A pitch deck can be PDF, PPT or PPTX; supporting documents can be PDF, PPT, PPTX, DOC, DOCX, TXT or Markdown. ZIP files are not accepted — share code through your repository link. Files can be added once the submission is saved.",
  },
  {
    q: "Who submits for the team?",
    a: `Any member of the team can submit the team's solution in sinceai.app — agree who does it. There is one entry per team, and it goes through once every member has accepted the challenge IP terms. The deadline, ${SUBMISSION.deadlineLabel}, is fixed.`,
  },
  {
    q: "What should my team complete before arriving?",
    a: "Three separate things must be true for each member: they are accepted to the hackathon, they are an accepted member of your team in sinceai.app, and they check in personally on site on Friday. Then work through the checklist under Bring and do.",
    links: [{ label: "Bring and do", href: "#bring" }],
  },
];

export const HELP = {
  email: GUIDE_LINKS.contactEmail,
  discord: GUIDE_LINKS.discord,
  reportIncident: GUIDE_LINKS.appReportIncident,
  codeOfConduct: GUIDE_LINKS.codeOfConduct,
  mlhCodeOfConduct: GUIDE_LINKS.mlhCodeOfConduct,
} as const;
