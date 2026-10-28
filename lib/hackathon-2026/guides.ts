import { GUIDE_BASE_PATH, GUIDE_LINKS } from "./facts";
import { COMPUTING, COMPUTING_HREF } from "./computing";
import { CATERING, DIETARY } from "./food";
import { AI_POLICY, SUBMISSION } from "./submission";
import { WIFI_ANCHOR } from "./wifi";
import { CHALLENGE_PRIZES, LATE_ARRIVAL_RULE } from "./selection";
import { AWARDS_HREF, CONFIDENTIAL_ANCHOR, MLH_PRIZE_PAGE } from "./awards";
import { RESOURCES_PATH } from "./resources";
import { VOTE_COMPARISONS, VOTING } from "./voting";
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
    lede: "Your team, your company challenge, Friday's rooms and routes, the build weekend and submission — in one place.",
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
  lede: "Three venues, one event flow. Challenge summaries open in sinceai.app on Thursday at 15:00. Friday starts at EduCity with registration, team formation, challenge selection, the opening and the challenge briefings. The build continues across BioCity and Joki. On Sunday, everyone returns to EduCity: the closing ceremony at 13:15, each challenge's top three at 13:30, then the finals at 14:00.",
  openingNote:
    "The official opening is Friday 6 November at 17:00. Arrival times differ by role — your guide has yours.",
  metaDescription:
    "The Since AI Hackathon 2026 Field Guide: schedules, venues, maps and checklists for builders, challenge partners, partners, judges and speakers — 6–8 November 2026, Turku.",
} as const;

export const VENUE_GUIDE = {
  name: "Venue Explorer",
  lede: "Floor plans for EduCity, BioCity and Joki, the walk between them, the weekend menu — and a 3D preview of the spaces. Tools, credits and optional awards are in Builder Resources.",
  metaDescription:
    "Since AI Hackathon 2026 Venue Explorer: zoomable floor plans for EduCity, BioCity and Joki, company rooms and stands, the meal schedule and special diets, venue photos and a 3D preview of the event spaces.",
} as const;

/** The first-view critical path per audience: short, action-first. */
export const CRITICAL_PATH: Partial<Record<Audience, readonly { label: string; time: string; text: string }[]>> = {
  builders: [
    { label: "Read", time: "Thu 15:00", text: "Challenge summaries in sinceai.app — agree on at least three." },
    { label: "Check in", time: "Fri 15:00", text: "EduCity — every member, in person. Then Team Check." },
    { label: "Ready · select", time: "15:00–17:30", text: "Team lead marks the team ready, then selects one company challenge — final." },
    { label: "MLH · opening", time: "16:50 · 17:00", text: "MLH intro, then the opening and Jason Mayes at Taidon portaat; from 18:30 follow your route." },
    { label: "Briefing", time: "18:50–19:30", text: "Your company's room at EduCity." },
    { label: "Build", time: "from 19:30", text: "Dinner and building in BioCity or Joki, around the clock." },
    { label: "Submit", time: "Sun 10:00", text: "Your team submits in sinceai.app, not Devpost — the deadline is fixed. Tick any MLH categories; enter Red Hat or FIWARE under optional awards." },
    { label: "Vote", time: "Sun 10:00–12:00", text: `Complete your ${VOTE_COMPARISONS} comparisons in sinceai.app.` },
  ],
  "challenge-partners": [
    { label: "Arrive", time: "Fri 15:30", text: "EduCity — weekend briefing at 15:45." },
    { label: "Brief", time: "18:50–19:30", text: "Your teams come to your EduCity room; share materials only with them." },
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
    { label: "Finalists", time: "by 12:00", text: VOTING.finalistsShort },
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
        "Everyone in your team has joined the same team in sinceai.app — build it before the event (up to five members).",
        "From Thu 5 Nov 15:00: your team has read the challenge summaries in sinceai.app and agreed on at least three challenges it would be happy with — places are limited.",
        "Your team knows who its team lead is: on Friday the lead marks the team as ready and selects the challenge (15:00–17:30). The roster and the choice are then final.",
        "You have joined the Since AI Discord for updates and teammates.",
        "Attendance confirmed on your sinceai.app dashboard, if it asks you to.",
        `Meal RSVP done on your sinceai.app dashboard by ${DIETARY.deadlineLabel}, with any dietary needs.`,
        "Your team's repository is set up and everyone can push to it.",
        "Everyone has read this Builder Guide — especially Build & submit — and Builder Resources for partner tools, credits, their dates and the optional awards.",
        "If you plan to sleep, you have your own accommodation booked.",
        `Optional: if you want CSC / LUMI computing, you registered by ${COMPUTING.deadlineLabel} — instructions are in your Since AI email.`,
        "Optional: planning to use Red Hat OpenShift? Your free 30-day Developer Sandbox is set up before the event.",
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
        "Fri 15:00 — every team member checks in in person at EduCity, then Team Check (route A) or team formation (route B).",
        "From 15:00 — your team lead marks the team as ready in sinceai.app and selects your company challenge. Final.",
        "16:45 — team formation closes: no new teams, joining or roster changes.",
        "16:50–17:00 — Major League Hacking: a 10-minute introduction to MLH's tools, sponsor technologies and awards at Taidon portaat.",
        "Fri 17:00–17:30 — opening ceremony at Taidon portaat. Selection closes at 17:30.",
        "17:30–18:30 — Jason Mayes' keynote and tech talk; your team's route is in the app from 17:30.",
        "From 18:30 — leave at your departure time and follow the route to your briefing room (18:50–19:30).",
        "19:30 — your company's full challenge opens in sinceai.app for your team.",
        "Before Sun 10:00 — every team member has accepted the challenge IP terms in sinceai.app.",
        `Sun 10:00 — your team's submission is in, with any MLH categories ticked. Then complete your ${VOTE_COMPARISONS} comparisons in sinceai.app by 12:00.`,
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
        "A public-safe challenge summary — topic, problem, intended result and relevant skills, safe to print in a newspaper. It opens to registered participants on Thu 5 Nov at 15:00, and teams choose from it alone",
        "Final approved challenge brief: task, expected deliverable, data, tools and resources — shared only with your own teams, at your briefing and in the app from Fri 19:30",
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
        "Anything teams need to start: access instructions, datasets, examples — for the teams that chose your challenge only",
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
      q: "What if a team member cannot check in on Friday?",
      a: `Friday check-in is the rule: every team member checks in in person at EduCity on Friday to take part and to share in any prize. ${LATE_ARRIVAL_RULE} Without a check-in or an approval given in advance, a member may be removed from the team overnight by the organisers. Need an exception? Ask at ${GUIDE_LINKS.contactEmail} before the event — do not assume one.`,
      points: [
        "The member must already be in your team in sinceai.app before your team lead marks it as ready, and before 16:45 on Friday — after that, nobody can be added or swapped.",
        "Checking in is individual: browsing the app from elsewhere is not checking in.",
        "Removing a member who did not check in is an organiser action. It never reopens the team or changes your challenge.",
        "Since AI Hackathon is an on-site event; there is no remote participation.",
      ],
    },
    {
      q: "How does team formation work?",
      a: "Best: build your team in sinceai.app before the event. On Friday, after registration on EduCity's first floor, there are two routes. Route A — you already have a team: turn left and go straight to Team Check, and show on your phone that you are in your team. Route B — no team yet: pick a skill card at the table beside registration (red: AI & Data, yellow: Software & Development, green: Business & Design), meet people in the Aula and room 1091 — the company posters there are meeting points, not briefing rooms — and build your team in sinceai.app, up to five members. Then leave only via Team Check on the left: show every member in the app and return your skill card. Team formation closes at 16:45.",
    },
    {
      q: "How does challenge selection work?",
      a: `${CHALLENGE_PRIZES} Every team must choose exactly one of the 15 company challenges. Public-safe summaries open in sinceai.app on Thursday 5 November at 15:00 — choose from these only, and agree on at least three you would be happy with. On Friday from 15:00, your team lead checks the member list and confirms Mark team as ready; the roster is then fixed. Straight after, the lead selects your company challenge. The choice is final — it cannot be changed or cancelled — and places are limited, first come first served. Team formation closes at 16:45 and selection at 17:30.`,
      points: [
        "Only the team lead of a ready team can select; other members see the choice in the app.",
        "At 17:30 the app shows your team's route: challenge, departure time, room and floor. The briefing rooms are also in this guide.",
        "Your company presents the full challenge in its briefing, 18:50–19:30, and the full challenge view opens in the app at 19:30 — only for the teams that chose it.",
        "No challenge when selection closes? Go straight to event staff — never guess a room.",
        "Optional awards (MLH, Red Hat and FIWARE) are extra: they never replace your company challenge or use its places.",
      ],
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
      a: "Yes — free Wi-Fi is arranged at the event venues: TUAS Guest or eduroam at EduCity, and at BioCity and Joki the network details come from event staff once they are confirmed. The steps are under Wi-Fi on this page. Bring any laptop: Linux, Windows and macOS all work, and no brand or operating system is required.",
      links: [{ label: "Wi-Fi instructions", href: `#${WIFI_ANCHOR}` }],
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
      a: "The five finalist teams — the five highest-ranked projects in the participant vote from five different company challenges — come to the side of the stage at 13:00 on Sunday, and from 14:00 they present live on stage at EduCity, not as recorded videos: at most four minutes each, then up to six minutes of questions from the jury. The jury selects the overall winner, and the event ends around 15:30.",
    },
    {
      q: "Can we win anything besides our company challenge?",
      a: "Yes — optional awards, entered in sinceai.app with the same project: seven MLH categories (tick them on your submission), the Red Hat OpenShift AI Technology Award and the FIWARE Open Innovation Award. They never replace your company challenge or use its places.",
      links: [
        { label: "Optional awards in Builder Resources", href: AWARDS_HREF },
        { label: "MLH prize page", href: MLH_PRIZE_PAGE },
      ],
    },
    {
      q: "Our challenge requires an NDA. What changes?",
      a: "FORCIT Group's challenge requires FORCIT's paper NDA, signed on site, before its detailed data is shared — every member who receives the data signs, and access opens only after event staff have verified it. Keep restricted data out of public repositories, videos and award evidence, and add a public-safe summary to your submission: that is all voters and the public see.",
      links: [{ label: "Confidential challenges", href: `${RESOURCES_PATH}#${CONFIDENTIAL_ANCHOR}` }],
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
      a: "At 17:00 the hosts introduce every challenge — at most a minute per company — from the short introduction you send in advance; if we do not receive one, Since AI writes it. Company representatives do not present on stage. Jason Mayes' keynote and tech talk follow, 17:30–18:30. Teams have chosen from your public-safe summary since Thursday 15:00; selection in sinceai.app runs Friday 15:00–17:30 and is final. The teams move to the rooms in turn from 18:30 and come to your room for your briefing, 18:50–19:30 — 19:30 is a hard end.",
    },
    {
      q: "Stand setup at Joki",
      a: "Since AI sets it up for you. Bring your stand materials (a roll-up, for example) to EduCity on Friday and leave them at the agreed drop-off point — we confirm the exact point before the event. The Since AI team takes them to Joki, and when you arrive at 08:30 on Saturday your stand is ready.",
    },
    {
      q: "NDA and confidential data",
      a: "Your company owns any NDA process, its text, signatures and records — sinceai.app never collects NDA signatures or documents, and choosing a challenge is not signing one. Do not reveal confidential content before signatures are complete, and plan a signing method that works for a full room of teams — with paper forms. Your Thursday summary must be safe to publish without an NDA. If your challenge needs an NDA, the guide shows a small \"NDA required\" label beside your company before teams choose.",
      points: [
        "Event staff record in sinceai.app which team members are covered — who verified it and when — before restricted data is shared. No scans or signatures are stored.",
        "Outside your company's evaluators and the organisers, projects made for your challenge are shown only by name, team and a public-safe summary in the participant vote and the results; optional-award reviewers see only that summary and public-safe evidence unless the organisers clear more with you.",
      ],
    },
    {
      q: "Meals",
      a: "Food will be reserved for company representatives at the scheduled meal times. Joining the meals is entirely optional.",
    },
    {
      q: "Sunday results",
      a: "Arrive at EduCity at 08:45; the evaluation briefing starts at 09:00. Evaluate the submissions to your challenge from 10:00, when submissions close, until 13:00 — confirm your top three teams to Since AI by 13:00 at the latest. The closing ceremony starts at 13:15; each company's top three teams are announced from 13:30, at most two minutes per company; at the 14:00 finals the five finalist teams — the highest-ranked projects in the participant vote from five different company challenges — present live on stage.",
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
      a: `${VOTING.how} ${VOTING.finalists} They present live on stage in the finals at 14:00.`,
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
      "Each challenge company evaluates its own challenge with its own criteria and picks its top three. The five highest-ranked projects in the participant vote from five different company challenges present in the finals, where the jury selects the overall winner.",
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
