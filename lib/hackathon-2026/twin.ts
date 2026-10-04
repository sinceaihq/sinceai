import { briefingRoomLabel, CHALLENGE_COMPANIES, getCompany, SHOWROOM_ORDER, showroomCounter } from "./companies";
import { EVENT_2026 } from "./facts";
import { BIOCITY_STANDS, getStandPartner, OPEN_STAND_LABEL } from "./partners";
import { GUIDE_BASE_PATH } from "./route";
import { getScheduleItem } from "./schedule";
import { formatTime, formatTimeRange } from "./time";
import type { ChallengeCompany, PartnerStand } from "./types";

/**
 * Campus twin (the 3D model of EduCity, BioCity, Joki and the streets around
 * them): everything a person reads — places, views, "Go to" targets, walking
 * routes and time presets. No three.js here; geometry lives in
 * components/guide/twin/engine and the route geometry in
 * public/assets/guide/3d/data/routes.json (generated, see
 * scripts/twin/build-campus-data.mjs).
 *
 * Facts come from the rest of lib/hackathon-2026 (companies, rooms, stands,
 * times) — never repeat them here. Route lengths and times are measured on the
 * City of Turku base map and OpenStreetMap at 1.3 m/s, with no allowance for
 * stairs or traffic lights; a unit test checks them against routes.json.
 */

export type PlaceId = "campus" | "educity" | "biocity" | "joki";

export interface Place3D {
  id: PlaceId;
  tab: string;
  title: string;
  caption: string;
  /** Accessible description of the canvas for this place. */
  alt: string;
  poster: string;
  /** View ids without the place prefix; the first is "default". */
  views: { id: string; label: string }[];
}

export interface Target3D {
  id: string;
  label: string;
  detail: string;
  place: PlaceId;
  kind: "company" | "room" | "stand" | "entrance" | "area" | "landmark";
  href?: string;
}

export interface TourStep {
  text: string;
  /** Where the step begins on the route, [x, z] in the campus frame — show the caption from there. */
  at?: [number, number];
}

export interface Tour3D {
  id: string;
  label: string;
  audience: string;
  summary: string;
  place: PlaceId;
  /** Ids of route legs in routes.json (CAMPUS.routes for the outdoor ones) and/or interior legs from building modules, in order. */
  legs: string[];
  /** Target id where the tour ends (camera settles there). */
  to: string;
  distanceM: number;
  minutes: number;
  steps: TourStep[];
}

export interface TimePreset {
  id: string;
  label: string;
  /** Turku wall-clock time, "2026-11-06T15:30". */
  iso: string;
}

// ── Helpers over the shared event data ───────────────────────────────────────

const companyHref = (id: string) => `${GUIDE_BASE_PATH}/challenge-partners/${id}`;
const STANDS_HREF = `${GUIDE_BASE_PATH}/partners#stands`;
const MAPS_HREF = `${GUIDE_BASE_PATH}/venue#maps`;
const VENUES_HREF = `${GUIDE_BASE_PATH}/venue#venues`;
const ROUTE_HREF = `${GUIDE_BASE_PATH}/venue#route`;

/** "2026-11-06T17:00:00+02:00" → "2026-11-06T17:00" (Turku wall clock). */
const wallClock = (iso: string) => iso.slice(0, 16);

const byName = (a: ChallengeCompany, b: ChallengeCompany) => a.name.localeCompare(b.name, "en");
const companiesOnFloor = (floor: 1 | 2 | 3) => CHALLENGE_COMPANIES.filter((c) => c.qa.floor === floor);
const listNames = (names: readonly string[]) =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** Small numbers in prose are words ("six counters"); details and labels keep digits. */
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const inWords = (n: number) => WORDS[n] ?? String(n);

const showroomNames = SHOWROOM_ORDER.map((id) => getCompany(id)!.name);
const towerStandCount = CHALLENGE_COMPANIES.length - SHOWROOM_ORDER.length;
const openStandCount = BIOCITY_STANDS.filter((s) => !s.partnerId).length;

const standById = (id: string): PartnerStand => {
  const stand = BIOCITY_STANDS.find((s) => s.id === id);
  if (!stand) throw new Error(`Unknown BioCity stand: ${id}`);
  return stand;
};
/** "Stand 1 · Red Hat", or "Stand 3" for an open stand. */
const standLabel = (stand: PartnerStand) => {
  const partner = getStandPartner(stand);
  return partner ? `Stand ${stand.rank} · ${partner.name}` : `Stand ${stand.rank}`;
};
/** "Aulagalleria, facing the event entrance" */
const standWhere = (stand: PartnerStand) =>
  `${stand.area}, ${stand.location.charAt(0).toLowerCase()}${stand.location.slice(1)}`;
/** "Red Hat's stand (Stand 1)" / "Stand 3 (open)" */
const standMention = (stand: PartnerStand) => {
  const partner = getStandPartner(stand);
  return partner ? `${partner.name}'s stand (Stand ${stand.rank})` : `Stand ${stand.rank}`;
};

const briefings = getScheduleItem("fri-briefings");
const opening = getScheduleItem("fri-opening");
const registration = getScheduleItem("fri-registration");
const teamFormation = getScheduleItem("fri-team-formation");
const BRIEFING_TIME = `Fri ${formatTimeRange(briefings)}`;

// ── Places ───────────────────────────────────────────────────────────────────

export const PLACES_3D: readonly Place3D[] = [
  {
    id: "campus",
    tab: "Campus",
    title: "Kupittaa campus · arrivals and the walk between venues",
    caption:
      "EduCity, BioCity and Joki with the streets around them, built to scale from City of Turku open data. Companies arrive at BioCity's entrance on Tykistökatu; builders walk about 200 m along the raised campus deck from EduCity to BioCity.",
    alt: "3D model of the Kupittaa campus in Turku: BioCity's dark seven-storey block on Tykistökatu, the round glass Joki tower behind it on Jussin aukio, the raised deck running past ICT-City to EduCity's brick building, and ParkCity and Kupittaa station to the north-east, with the walking routes drawn as violet lines on the ground.",
    poster: "/assets/guide/3d/posters/campus.webp",
    views: [
      { id: "default", label: "Overview" },
      { id: "arrival", label: "Arrival · Tykistökatu" },
      { id: "courtyard", label: "Jussin aukio" },
      { id: "top", label: "Plan view" },
    ],
  },
  {
    id: "educity",
    tab: "EduCity",
    title: "EduCity · arrival, opening and briefings",
    caption:
      "Both main entrances are in the glass pavilion at deck level. Registration and the team formation area are on floor 1, the opening ceremony is on Taidon portaat, and the company briefing rooms are on floors 1 and 2.",
    alt: "3D model of EduCity with its roof lifted off: the lobby with registration by the east entrance, the team formation area and the Taidon portaat stair seating, and the company briefing rooms on floors 1 and 2, each marked with the company's name.",
    poster: "/assets/guide/3d/posters/educity.webp",
    views: [
      { id: "default", label: "Lobby & Taidon portaat" },
      { id: "rooms1", label: "Floor 1 rooms" },
      { id: "rooms2", label: "Floor 2 rooms" },
      { id: "entrance", label: "Main entrances" },
    ],
  },
  {
    id: "biocity",
    tab: "BioCity",
    title: "BioCity · build hall and partner stands",
    caption:
      "Companies and partners come in from Tykistökatu through the open entrance recess, past the supercar display; builders enter from Jussin aukio into the Aulagalleria. The main lobby is the build hall, open around the clock, and Joki is down a short stair at its far (south-east) end.",
    alt: `3D model of BioCity's ground floor: the long main lobby filled with rows of build tables, the curved Aulagalleria with the courtyard entrance and ${standMention(
      standById("bc-1"),
    )} facing it, ${standMention(standById("bc-2"))} at the far end of the lobby by the stair down to Joki, ${inWords(
      openStandCount,
    )} open partner stands, and the Tykistökatu entrance recess with the supercar display.`,
    poster: "/assets/guide/3d/posters/biocity.webp",
    views: [
      { id: "default", label: "Build hall" },
      { id: "entrance", label: "Partner entrance · Tykistökatu" },
      { id: "gallery", label: "Aulagalleria" },
      { id: "stands", label: "Partner stands" },
    ],
  },
  {
    id: "joki",
    tab: "Joki",
    title: "Joki · build areas and challenge partner Q&A",
    caption: `The Aula and the Cave hall are build areas, open around the clock. Up the ramp, the round Showroom has ${inWords(
      SHOWROOM_ORDER.length,
    )} partner counters along its curved LED wall, with the Company Lounge beside it; floors 2 and 3 of the tower hold the other ${inWords(
      towerStandCount,
    )} stands and a Chill Zone.`,
    alt: `3D model of Joki: the wedge-shaped Aula and the black Cave hall set with build tables, the ramp up into the round Showroom with ${inWords(
      SHOWROOM_ORDER.length,
    )} counters along the LED wall — ${listNames(showroomNames)} — the sunken Company Lounge next to it, and the glass tower above: ${companiesOnFloor(
      2,
    )
      .map((c) => c.name)
      .join(", ")} and a Chill Zone on floor 2; ${listNames(companiesOnFloor(3).map((c) => c.name))} on floor 3.`,
    poster: "/assets/guide/3d/posters/joki.webp",
    views: [
      { id: "default", label: "Aula & Cave" },
      { id: "showroom", label: "Showroom" },
      { id: "lounge", label: "Company Lounge" },
      { id: "floors", label: "Floors 2–3" },
    ],
  },
] as const;

// ── Targets ──────────────────────────────────────────────────────────────────

/** "Joki floor 1 · Showroom · counter 4 of 6", "Joki floor 3 · glass tower" */
function standDetail(company: ChallengeCompany): string {
  const counter = showroomCounter(company);
  if (company.qa.floor === 1) {
    const where = `Joki floor 1 · ${company.qa.zone}`;
    return counter ? `${where} · counter ${counter} of ${SHOWROOM_ORDER.length}` : where;
  }
  return `Joki floor ${company.qa.floor} · glass tower`;
}

const companyTargets: Target3D[] = [...CHALLENGE_COMPANIES].sort(byName).map((c) => ({
  id: c.id,
  label: c.name,
  detail: standDetail(c),
  place: "joki",
  kind: "company",
  href: companyHref(c.id),
}));

const roomTargets: Target3D[] = [...CHALLENGE_COMPANIES].sort(byName).map((c) => ({
  id: `room-${c.id}`,
  label: `${c.name} briefing room`,
  detail: `EduCity floor ${c.briefing.floor} · Room ${briefingRoomLabel(c)} · ${BRIEFING_TIME}`,
  place: "educity",
  kind: "room",
  href: companyHref(c.id),
}));

const standTargets: Target3D[] = BIOCITY_STANDS.map((stand) => ({
  id: stand.id,
  label: standLabel(stand),
  detail: getStandPartner(stand)
    ? `BioCity · ${standWhere(stand)}`
    : `${OPEN_STAND_LABEL} · BioCity · ${standWhere(stand)}`,
  place: "biocity",
  kind: "stand",
  href: STANDS_HREF,
}));

const entranceTargets: Target3D[] = [
  {
    id: "entrance-biocity-tykistokatu",
    label: "BioCity main entrance",
    detail: "Tykistökatu 6 · companies and partners · level access, in the recess beside the glass corner tower",
    place: "biocity",
    kind: "entrance",
    href: VENUES_HREF,
  },
  {
    id: "entrance-biocity-courtyard",
    label: "BioCity event entrance",
    detail: "Courtyard side, from Jussin aukio · builders, from EduCity",
    place: "biocity",
    kind: "entrance",
    href: ROUTE_HREF,
  },
  {
    id: "entrance-educity-west",
    label: "EduCity west main entrance",
    detail: "Glass pavilion at deck level · towards BioCity along the campus deck",
    place: "educity",
    kind: "entrance",
    href: VENUES_HREF,
  },
  {
    id: "entrance-educity-east",
    label: "EduCity east main entrance",
    detail: "Glass pavilion at deck level · registration just inside",
    place: "educity",
    kind: "entrance",
    href: VENUES_HREF,
  },
  {
    id: "entrance-educity-b",
    label: "EduCity door B",
    detail: "South-east walkway, in a brick portal · company arrivals to room 1002",
    place: "educity",
    kind: "entrance",
    href: VENUES_HREF,
  },
  {
    id: "entrance-educity-gateway",
    label: "EduCity step-free entrance",
    detail: "Street-level lifts in the passage between ICT-City and EduCity",
    place: "educity",
    kind: "entrance",
    href: VENUES_HREF,
  },
  {
    id: "entrance-joki-street",
    label: "Joki street door",
    detail: "Lemminkäisenkatu 12b · closed during the event — enter Joki through BioCity",
    place: "joki",
    kind: "entrance",
    href: VENUES_HREF,
  },
];

const areaTargets: Target3D[] = [
  {
    id: "build-hall",
    label: "Build hall",
    detail: "BioCity main lobby · about 52–56 build tables · open around the clock",
    place: "biocity",
    kind: "area",
    href: MAPS_HREF,
  },
  {
    id: "serving-lines",
    label: "Restaurant serving lines",
    detail: "BioCity · Maunon sali restaurant, off the Aulagalleria · event meals",
    place: "biocity",
    kind: "area",
    href: MAPS_HREF,
  },
  {
    id: "supercars",
    label: "Supercar display by Tykistökatu",
    detail: "BioCity entrance recess · beside the company entrance",
    place: "biocity",
    kind: "landmark",
  },
  {
    id: "aula",
    label: "Joki Aula",
    detail: "Joki floor 1 · build area, open around the clock",
    place: "joki",
    kind: "area",
    href: MAPS_HREF,
  },
  {
    id: "cave",
    label: "Cave hall",
    detail: "Joki floor 1 · black-box hall · build area, open around the clock",
    place: "joki",
    kind: "area",
    href: MAPS_HREF,
  },
  {
    id: "showroom",
    label: "Showroom",
    detail: `Joki floor 1 · up the ramp from the Aula · ${SHOWROOM_ORDER.length} challenge partner counters`,
    place: "joki",
    kind: "area",
    href: MAPS_HREF,
  },
  {
    id: "lounge",
    label: "Company Lounge",
    detail: "Joki floor 1 · amphitheatre beside the Showroom · for company representatives",
    place: "joki",
    kind: "area",
    href: MAPS_HREF,
  },
  {
    id: "chill-zone",
    label: "Chill Zone",
    detail: "Joki floor 2 · west half of the glass tower",
    place: "joki",
    kind: "area",
    href: MAPS_HREF,
  },
  {
    id: "registration",
    label: "Registration",
    detail: `EduCity floor 1 · just inside the east main entrance · from Fri ${formatTime(registration.start)}`,
    place: "educity",
    kind: "area",
    href: MAPS_HREF,
  },
  {
    id: "team-formation",
    label: "Team formation area",
    detail: `EduCity floor 1 · north lobby, beside Taidon portaat · Fri ${formatTimeRange(teamFormation)}`,
    place: "educity",
    kind: "area",
    href: MAPS_HREF,
  },
  {
    id: "taidon-portaat",
    label: "Taidon portaat",
    detail: `EduCity floor 1 · stair seating · opening ceremony Fri ${formatTime(opening.start)}`,
    place: "educity",
    kind: "area",
    href: MAPS_HREF,
  },
  {
    id: "restaurant-kisalli",
    label: "Ravintola Kisälli",
    detail: "EduCity floor 1 · Friday snacks",
    place: "educity",
    kind: "area",
    href: MAPS_HREF,
  },
  {
    id: "company-arrival",
    label: "Company arrival · room 1002",
    detail: `EduCity floor 1 · in through door B · Fri from ${formatTime(EVENT_2026.challengePartnerArrival)}`,
    place: "educity",
    kind: "area",
    href: MAPS_HREF,
  },
  {
    id: "jussin-aukio",
    label: "Jussin aukio",
    detail: "Courtyard between BioCity, Joki and ICT-City · wide stair up to the campus deck",
    place: "campus",
    kind: "landmark",
    href: ROUTE_HREF,
  },
  {
    id: "kupittaa-station",
    label: "Kupittaa station",
    detail: "Trains and Föli buses 3 and 3A · about 5 min on foot to EduCity",
    place: "campus",
    kind: "landmark",
  },
  {
    id: "parkcity",
    label: "ParkCity car park",
    detail: "Joukahaisenkatu 8 · guest parking on floors 1–3 · 2 min on foot to EduCity",
    place: "campus",
    kind: "landmark",
  },
];

export const TARGETS_3D: readonly Target3D[] = [
  ...companyTargets,
  ...roomTargets,
  ...standTargets,
  ...entranceTargets,
  ...areaTargets,
];

const TARGET_BY_ID = new Map(TARGETS_3D.map((t) => [t.id, t]));

export function getTarget3D(id: string): Target3D | undefined {
  return TARGET_BY_ID.get(id);
}

export function targetsForPlace(place: PlaceId): Target3D[] {
  return TARGETS_3D.filter((t) => t.place === place);
}

// ── Walking routes ───────────────────────────────────────────────────────────

const stand1 = standById("bc-1");
const stand2 = standById("bc-2");
const stand3 = standById("bc-3");
const stand4 = standById("bc-4");
const MAIN_STAIRS = "climb the wide outdoor stairs at its east corner (about 30 steps)";

/** A tour step that begins at a point on the route ([x, z] in the campus frame, see routes.json). */
const step = (text: string, at: [number, number]): TourStep => ({ text, at });

/**
 * Lengths and times are the sums of the legs in routes.json (1.3 m/s, no
 * stair or traffic-light allowance). Tours run in event order; each step is
 * anchored where it begins on the route, so captions appear on the spot.
 */
export const TOURS_3D: readonly Tour3D[] = [
  {
    id: "builders-train-checkin",
    label: "Kupittaa station → EduCity registration",
    audience: "Builders arriving by train",
    summary:
      "From the platform over the covered Kalevansilta footbridge, across Joukahaisenkatu and up EduCity's outdoor stairs to the east main entrance.",
    place: "educity",
    legs: ["out-arr-train-edu-east", "int-edu-east-to-registration"],
    to: "registration",
    distanceM: 391,
    minutes: 5,
    steps: [
      step(
        "On the platform, walk away from the station building to the stairs up to Kalevansilta, the covered wooden footbridge.",
        [218.9, -111.5],
      ),
      step("Cross the footbridge towards ParkCity and take the stairs down at its end.", [278.5, -25.2]),
      step("Cross Joukahaisenkatu at the zebra crossing to EduCity's brick building.", [241.4, 37.7]),
      step(`Turn left along the building and ${MAIN_STAIRS}.`, [227.2, 57.2]),
      step("Follow the walkway along the building to the glass pavilion — the east main entrance.", [251.2, 97.0]),
      step(
        "Registration is just inside; the team formation area and Taidon portaat are further into the lobby.",
        [204.0, 136.5],
      ),
    ],
  },
  {
    id: "builders-station-hall-checkin",
    label: "Station hall or bus 3 → EduCity registration",
    audience: "Builders via the station hall or bus 3/3A",
    summary:
      "From the station hall street door (bus stop Kupittaan asema) along Joukahaisenkatu past ICT-City, then up EduCity's outdoor stairs.",
    place: "educity",
    legs: ["out-arr-stdoor-edu-east", "int-edu-east-to-registration"],
    to: "registration",
    distanceM: 565,
    minutes: 7.2,
    steps: [
      step(
        "From the station hall's street door or bus stop Kupittaan asema, walk to the Tykistökatu–Joukahaisenkatu junction.",
        [155.4, -153.5],
      ),
      step("Turn left onto Joukahaisenkatu and cross to the ICT-City side at the first crossing.", [71.8, -130.2]),
      step(
        "Keep going past ICT-City; EduCity is the brick building after the passage with the glass bridges.",
        [113.3, -40.8],
      ),
      step(
        "Step-free? Take the street-level lifts in that passage, between ICT-City and EduCity, instead of the stairs ahead.",
        [213.0, 45.8],
      ),
      step(`Walk along EduCity's street side and ${MAIN_STAIRS}.`, [227.2, 57.2]),
      step(
        "Follow the walkway to the glass pavilion — registration is just inside the east main entrance.",
        [251.2, 97.0],
      ),
    ],
  },
  {
    id: "partners-fri-parkcity-edu",
    label: "ParkCity → EduCity company arrival",
    audience: "Challenge partners arriving by car on Friday",
    summary:
      "From the ParkCity car park across Joukahaisenkatu, up EduCity's outdoor stairs and in through door B to room 1002.",
    place: "educity",
    legs: ["out-arr-parkcity-edu-b", "int-edu-doorB-to-1002"],
    to: "company-arrival",
    distanceM: 192,
    minutes: 2.5,
    steps: [
      step(
        "Park in ParkCity (Joukahaisenkatu 8) — guest parking is on floors 1–3 — and leave by the street door.",
        [215.5, 6.2],
      ),
      step("Cross Joukahaisenkatu at the zebra crossing to EduCity's brick building.", [241.4, 37.7]),
      step(`Turn left along the building and ${MAIN_STAIRS}.`, [227.2, 57.2]),
      step("Door B is a few metres along the walkway on your right, in a recessed brick portal.", [251.2, 97.0]),
      step(
        "Inside, follow the corridor to room 1002 (Moriaberg), where company arrivals are received.",
        [237.3, 109.0],
      ),
    ],
  },
  {
    id: "partners-fri-train-edu",
    label: "Kupittaa station → EduCity company arrival",
    audience: "Challenge partners arriving by train on Friday",
    summary:
      "From the platform over the covered Kalevansilta footbridge, across Joukahaisenkatu, up EduCity's outdoor stairs and in through door B to room 1002.",
    place: "educity",
    legs: ["out-arr-train-edu-b", "int-edu-doorB-to-1002"],
    to: "company-arrival",
    distanceM: 336,
    minutes: 4.3,
    steps: [
      step(
        "On the platform, walk away from the station building to the stairs up to Kalevansilta, the covered wooden footbridge.",
        [218.9, -111.5],
      ),
      step("Cross the footbridge towards ParkCity and take the stairs down at its end.", [278.5, -25.2]),
      step("Cross Joukahaisenkatu at the zebra crossing to EduCity's brick building.", [241.4, 37.7]),
      step(`Turn left along the building and ${MAIN_STAIRS}.`, [227.2, 57.2]),
      step("Door B is a few metres along the walkway on your right, in a recessed brick portal.", [251.2, 97.0]),
      step(
        "Inside, follow the corridor to room 1002 (Moriaberg), where company arrivals are received.",
        [237.3, 109.0],
      ),
    ],
  },
  {
    id: "partners-fri-stepfree-edu",
    label: "ParkCity → EduCity step-free",
    audience: "Anyone who needs step-free access to EduCity",
    summary:
      "From ParkCity over the zebra crossing on Joukahaisenkatu into the passage between ICT-City and EduCity, to the street-level lifts.",
    place: "educity",
    legs: ["out-parkcity-gw-zebra"],
    to: "entrance-educity-gateway",
    distanceM: 133,
    minutes: 1.7,
    steps: [
      step("Leave ParkCity by the street door on Joukahaisenkatu.", [215.5, 6.2]),
      step("Cross Joukahaisenkatu at the zebra crossing to EduCity's brick building (dropped kerbs).", [241.4, 37.7]),
      step(
        "Turn right along the building into the passage between ICT-City and EduCity, under the glass bridges.",
        [227.2, 57.2],
      ),
      step(
        "EduCity's street-level door is in the passage: take the lift up to floor 1 — the lobby, registration and the briefing rooms.",
        [192.4, 70.5],
      ),
    ],
  },
  {
    id: "partners-tykistokatu-to-stands",
    label: "Drop-off → BioCity partner stands",
    audience: "Visibility and tech partners",
    summary:
      "From a drop-off on Tykistökatu into BioCity's entrance recess, through the build hall and round to the stands in the Aulagalleria.",
    place: "biocity",
    legs: ["out-co-kerb-bio-main", "int-bio-tyk-to-gallery"],
    to: "bc-1",
    distanceM: 106,
    minutes: 1.4,
    steps: [
      step(
        "Get dropped off on Tykistökatu just after the traffic lights at Lemminkäisenkatu, on BioCity's side.",
        [-35.6, -22.0],
      ),
      step(
        "Cross the two-way cycle path into the open entrance recess beside the glass corner tower — the supercars are on display here.",
        [-33.6, -21.0],
      ),
      step(
        "Go in through the revolving door (level access) and walk down the main lobby, the build hall.",
        [-24.51, -11.75],
      ),
      step(
        "Near the far end, turn left into the corridor beside the meeting rooms, then left again into the curved Aulagalleria.",
        [4.82, 28.69],
      ),
      step(
        `${standMention(stand1)} faces the event entrance, with ${standMention(stand3)} beside the entrance. ${standMention(stand2)} is at the far end of the build hall by the stair to Joki, and ${standMention(stand4)} at the hall's Tykistökatu end.`,
        [23.08, 3.91],
      ),
    ],
  },
  {
    id: "builders-transfer-to-build",
    label: "EduCity → BioCity build hall",
    audience: "Builders, after the Friday briefings",
    summary:
      "About 200 m outdoors: along the raised campus deck past ICT-City, down the wide stair at Jussin aukio and in through BioCity's courtyard entrance.",
    place: "biocity",
    legs: ["out-xfer-edu-west-bio-event", "int-bio-event-to-lobby"],
    to: "build-hall",
    distanceM: 265,
    minutes: 3.4,
    steps: [
      step("Leave EduCity by the west main entrance, onto the raised campus deck.", [177.8, 115.1]),
      step("Follow the deck past ICT-City for about 150 m to Jussin aukio.", [176.1, 108.8]),
      step("Take the wide outdoor stairs down (about 10 steps).", [62.9, 3.9]),
      step("Cross the courtyard, with the round Joki tower on your left, to BioCity's event entrance.", [59.5, 3.0]),
      step("Inside, the Aulagalleria leads round to the build hall in the main lobby.", [22.05, -7.54]),
    ],
  },
  {
    id: "companies-tykistokatu-to-showroom",
    label: "Drop-off → Joki Showroom",
    audience: "Challenge partners on Saturday",
    summary:
      "From a drop-off on Tykistökatu into BioCity, through the build hall and down the short stair into Joki, then up the ramp to the Showroom.",
    place: "joki",
    legs: ["out-co-kerb-bio-main", "int-bio-tyk-to-joki", "int-joki-aula-to-showroom"],
    to: "showroom",
    distanceM: 139,
    minutes: 1.8,
    steps: [
      step(
        "Get dropped off on Tykistökatu just after the traffic lights at Lemminkäisenkatu, on BioCity's side.",
        [-35.6, -22.0],
      ),
      step(
        "Cross the two-way cycle path into the entrance recess beside the glass corner tower, past the supercar display.",
        [-33.6, -21.0],
      ),
      step(
        "Go in through the revolving door (level access) and walk the length of the main lobby, the build hall.",
        [-24.51, -11.75],
      ),
      step("At the far (south-east) end, take the short stair down (10 steps) into Joki.", [9.69, 37.36]),
      step(
        `Cross the Aula and go up the ramp into the round Showroom: ${listNames(showroomNames)} along the LED wall, counted from the entrance. The tower stairs and lift go up to floors 2 and 3.`,
        [14.04, 43.59],
      ),
    ],
  },
  {
    id: "companies-parkcity-to-biocity",
    label: "ParkCity → BioCity main entrance",
    audience: "Companies and partners arriving by car",
    summary:
      "From ParkCity along Joukahaisenkatu to Tykistökatu, then on BioCity's side of the street to the entrance recess.",
    place: "biocity",
    legs: ["out-co-parkcity-bio-main"],
    to: "entrance-biocity-tykistokatu",
    distanceM: 358,
    minutes: 4.6,
    steps: [
      step(
        "Leave ParkCity by the street door and follow Joukahaisenkatu to the right (north-west, away from EduCity), all the way to Tykistökatu.",
        [198.5, -7.4],
      ),
      step(
        "Cross the end of Joukahaisenkatu and turn left along Tykistökatu, past Eurocity and Electrocity.",
        [71.8, -130.2],
      ),
      step(
        "BioCity's main entrance is in the open recess beside the glass corner tower, where the supercars are on display.",
        [-14.1, -51.7],
      ),
      step(
        "Inside, the build hall is straight ahead; Joki and the Q&A Showroom are down the short stair at its far end, about 70 m on.",
        [-24.6, -11.3],
      ),
    ],
  },
  {
    id: "companies-train-to-biocity",
    label: "Kupittaa station → BioCity main entrance",
    audience: "Companies and partners arriving by train or bus",
    summary:
      "From the station hall street door along Tykistökatu — on BioCity's side of the street all the way — to the entrance recess.",
    place: "biocity",
    legs: ["out-co-stdoor-bio-main"],
    to: "entrance-biocity-tykistokatu",
    distanceM: 294,
    minutes: 3.8,
    steps: [
      step(
        "From the station hall's street door, walk out to Tykistökatu and turn left, past bus stop Kupittaan asema.",
        [155.4, -153.5],
      ),
      step(
        "Cross the end of Joukahaisenkatu and keep following Tykistökatu, past Eurocity and Electrocity.",
        [71.8, -130.2],
      ),
      step(
        "BioCity's main entrance is in the open recess beside the glass corner tower, where the supercars are on display.",
        [-14.1, -51.7],
      ),
      step(
        "Inside, the build hall is straight ahead; Joki and the Q&A Showroom are down the short stair at its far end, about 70 m on.",
        [-24.6, -11.3],
      ),
    ],
  },
  {
    id: "builders-build-to-joki",
    label: "BioCity → Joki Showroom",
    audience: "Builders · Saturday Q&A",
    summary:
      "Indoors all the way: through the build hall, down the short stair into Joki and up the ramp to the Showroom.",
    place: "joki",
    legs: ["int-bio-tyk-to-joki", "int-joki-aula-to-showroom"],
    to: "showroom",
    distanceM: 123,
    minutes: 1.6,
    steps: [
      step("Walk through the build hall to its far (south-east) end.", [-21.13, -8.56]),
      step(
        "Take the short stair down (10 steps) into Joki — the Aula and the Cave hall are build areas too.",
        [9.69, 37.36],
      ),
      step(
        `Go up the ramp into the round Showroom, where ${inWords(SHOWROOM_ORDER.length)} challenge partners have their counters.`,
        [46.84, 29.34],
      ),
      step("The tower stairs and lift beside the Showroom go up to the other stands on floors 2 and 3.", [54.75, 20.3]),
    ],
  },
  {
    id: "builders-back-to-educity",
    label: "BioCity → EduCity closing",
    audience: "Everyone, before the Sunday closing",
    summary:
      "The Friday transfer in reverse: out through the Aulagalleria, up the stair at Jussin aukio and along the campus deck to EduCity.",
    place: "educity",
    legs: ["int-bio-lobby-to-event", "out-xfer-bio-event-edu-west", "int-edu-west-to-taidon"],
    to: "taidon-portaat",
    distanceM: 302,
    minutes: 3.9,
    steps: [
      step("Leave the build hall through the Aulagalleria and the courtyard-side event entrance.", [1.44, 23.85]),
      step("Cross Jussin aukio and climb the wide outdoor stairs (about 10 steps) to the campus deck.", [22.1, -7.5]),
      step("Follow the deck past ICT-City for about 150 m to EduCity's west main entrance.", [62.9, 3.9]),
      step("Inside, walk through the lobby to Taidon portaat.", [177.8, 115.1]),
    ],
  },
];

const TOUR_BY_ID = new Map(TOURS_3D.map((t) => [t.id, t]));

// Non-breaking spaces keep "190 m" together when a card wraps.
const formatMinutes = (minutes: number) => `${Math.max(1, Math.round(minutes))}\u00a0min`;
const formatDistance = (m: number) =>
  m >= 1000 ? `${(m / 1000).toFixed(1)}\u00a0km` : `${Math.round(m / 10) * 10}\u00a0m`;

/** "5 min · 390 m" */
export const tourFacts = (tour: Tour3D) => `${formatMinutes(tour.minutes)} · ${formatDistance(tour.distanceM)}`;

export function getTour3D(id: string): Tour3D | undefined {
  return TOUR_BY_ID.get(id);
}

// ── Time of day ──────────────────────────────────────────────────────────────

/** Lighting moments of the weekend (Turku local time). */
export const TIME_PRESETS: readonly TimePreset[] = [
  { id: "arrival", label: "Arrival · Fri 15:30", iso: wallClock(EVENT_2026.challengePartnerArrival) },
  { id: "sunset", label: "Sunset · Fri 16:20", iso: "2026-11-06T16:20" },
  { id: "opening", label: "Opening · Fri 17:00", iso: wallClock(EVENT_2026.officialOpening) },
  { id: "night", label: "Night build · Sat 01:00", iso: "2026-11-07T01:00" },
  { id: "qa", label: "Q&A · Sat 11:00", iso: "2026-11-07T11:00" },
  { id: "closing", label: "Closing · Sun 13:00", iso: wallClock(EVENT_2026.closingCeremony) },
] as const;

/** Friday 15:30 — challenge partners arrive, the sun is low in the south-west. */
export const DEFAULT_TIME: string = TIME_PRESETS[0].iso;

// ── Lookups for the UI and deep links ────────────────────────────────────────

const PLACE_BY_ID = new Map(PLACES_3D.map((p) => [p.id, p]));

export function getPlace3D(id: PlaceId): Place3D {
  const place = PLACE_BY_ID.get(id);
  if (!place) throw new Error(`Unknown 3D place: ${id}`);
  return place;
}

export function isPlaceId(id: string | null | undefined): id is PlaceId {
  return !!id && PLACE_BY_ID.has(id as PlaceId);
}

/**
 * Which place shows a target: companies' Q&A stands are in Joki, Friday
 * rooms in EduCity, partner stands in BioCity, entrances by building.
 * Unknown ids → the campus overview.
 */
export function placeForTarget(id: string | null | undefined): PlaceId {
  const key = normaliseTarget(id);
  if (key) return TARGET_BY_ID.get(key)!.place;
  const raw = id?.trim().toLowerCase() ?? "";
  if (isPlaceId(raw)) return raw;
  if (raw.startsWith("room-")) return "educity";
  if (raw.startsWith("bc-")) return "biocity";
  const entrance = /^entrance-(educity|biocity|joki)\b/.exec(raw);
  if (entrance) return entrance[1] as PlaceId;
  return "campus";
}

/**
 * Normalise a deep-link target to a known target id: case-insensitive;
 * partner ids map to their stand (red-hat → bc-1, solita → bc-2) and room
 * numbers to the company's room (room-1002 → room-bayer). Unknown → null.
 */
export function normaliseTarget(id: string | null | undefined): string | null {
  const key = id?.trim().toLowerCase();
  if (!key) return null;
  if (TARGET_BY_ID.has(key)) return key;
  const stand = BIOCITY_STANDS.find((s) => s.partnerId === key);
  if (stand) return stand.id;
  const room = /^room-(\d{4})$/.exec(key);
  if (room) {
    const company = CHALLENGE_COMPANIES.find((c) => c.briefing.room.split(/\s*\/\s*/).includes(room[1]));
    if (company) return `room-${company.id}`;
  }
  return null;
}

const LEGACY_SCENES: Readonly<Record<string, { place: PlaceId; view: string }>> = {
  showroom: { place: "joki", view: "showroom" },
  "joki-tower": { place: "joki", view: "floors" },
  biocity: { place: "biocity", view: "default" },
};

/** `?scene=` links from the previous 3D preview (showroom, joki-tower, biocity). */
export function legacyScene(scene: string | null): { place: PlaceId; view?: string } | null {
  const key = scene?.trim().toLowerCase();
  return (key && LEGACY_SCENES[key]) || null;
}

/** Credit line for the twin (SPEC §1.5 / §10). */
export const TWIN_CREDITS =
  "3D model: Since AI, built from City of Turku open data (© Turun kaupunki, CC BY 4.0), © OpenStreetMap contributors (ODbL) and TTK floor plans · Textures: ambientCG, Poly Haven (CC0)";
