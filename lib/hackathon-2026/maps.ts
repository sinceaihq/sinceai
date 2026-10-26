import { getCompany, SHOWROOM_ORDER } from "./companies";
import { BIOCITY_STANDS, getStandPartner, OPEN_STAND_LABEL } from "./partners";
import type { MapHotspot, VenueMap } from "./types";

/**
 * Venue maps for the 2D Venue Explorer.
 *
 * The images are the supplied 2026 maps (Since AI event maps: EduCity final maps
 * of 26 Oct 2026 — team formation and briefing rooms on floors 1–3 — and the
 * 2 Oct 2026 Joki maps) and
 * the venue owner's official floor plans (Turun Teknologiakiinteistöt, 4 Jun
 * 2026) — used as-is, never redrawn. Hotspots are normalised (0–1) positions
 * of labels that already exist on the image, plus the BioCity stand plan.
 *
 * Not published on purpose: annotated production plans (emergency routes,
 * volunteer spaces, power planning) and the 2025 venue maps.
 */

const G = {
  floor: { fi: "Kerros", en: "Floor" },
  entrance: { fi: "Sisäänkäynti / sisäänkäynnit", en: "Entrance / entrances" },
  stairs: { fi: "Portaat", en: "Stairs" },
  lift: { fi: "Hissi", en: "Lift" },
  lobby: { fi: "Aula", en: "Lobby" },
  taito: { fi: "Taidon portaat", en: "Large stair seating — opening ceremony" },
  restaurant: { fi: "Ravintola", en: "Restaurant" },
  briefingRooms: { fi: "Yritysten briiffaushuoneet", en: "Company briefing rooms" },
  standLocations: { fi: "Yritysten ständipaikat", en: "Company stand locations" },
  logoMarks: {
    fi: "Yrityksen logo osoittaa…",
    en: "The company logo marks its room / stand",
  },
} as const;

const hs = (h: MapHotspot) => h;

/** Showroom counters, numbered along the LED wall from the entrance. */
const counterHotspot = (companyId: (typeof SHOWROOM_ORDER)[number], x: number, y: number): MapHotspot => ({
  id: `sr-${companyId}`,
  label: getCompany(companyId)!.name,
  description: `Counter ${SHOWROOM_ORDER.indexOf(companyId) + 1} of ${SHOWROOM_ORDER.length} from the entrance`,
  x,
  y,
  kind: "company",
  refId: companyId,
});

/** BioCity stand hotspots carry the stand plan's partner names (partners.ts). */
const standHotspot = (id: string, x: number, y: number): MapHotspot => {
  const stand = BIOCITY_STANDS.find((s) => s.hotspotId === id);
  if (!stand) throw new Error(`No BioCity stand for hotspot ${id}`);
  const partner = getStandPartner(stand);
  const where = `${stand.area}, ${stand.location.charAt(0).toLowerCase()}${stand.location.slice(1)}`;
  return {
    id,
    label: partner ? `Stand ${stand.rank} · ${partner.name}` : `Stand ${stand.rank}`,
    description: partner ? where : `${OPEN_STAND_LABEL} · ${where}`,
    x,
    y,
    kind: "stand",
    refId: stand.id,
  };
};

export const VENUE_MAPS: readonly VenueMap[] = [
  {
    id: "educity-team-formation",
    venue: "educity",
    label: "Team formation",
    title: "EduCity · Floor 1 · Team formation (Friday 15:00–16:45)",
    src: "/assets/guide/maps/educity-team-formation-preview.webp",
    srcLarge: "/assets/guide/maps/educity-team-formation-large.webp",
    width: 1536,
    height: 1024,
    alt: "EduCity floor 1 team formation plan. From registration at the bottom right, route A (I already have a team) turns left along the bottom of Taidon portaat directly to Team Check and card return on the left. Route B (I don't have a team yet) continues past the skill-card table — red AI & Data, yellow Software & Development, green Business & Design — up into the Aula (1094) and room 1091 Hammarbacka, where company challenge posters mark meeting points. Build your team in sinceai.app, then leave only via Team Check on the left: show every team member in the app and return your skill card. Room 1090 Ringsberg is at the top; access barriers close the side passages.",
    caption:
      "Route A: you already have a team — straight to Team Check. Route B: no team yet — pick a skill card, meet people in the Aula, build your team in sinceai.app, then Team Check. The company logos are meeting-point posters, not briefing rooms.",
    source: "Since AI event map",
    hotspots: [
      hs({
        id: "tf-registration",
        label: "Registration",
        description: "Check in here from Fri 15:00",
        x: 0.609,
        y: 0.879,
        kind: "service",
        audiences: ["builders"],
      }),
      hs({
        id: "tf-route-a",
        label: "A · I already have a team",
        description: "Turn left and go directly to Team Check",
        x: 0.519,
        y: 0.861,
        kind: "route",
        audiences: ["builders"],
      }),
      hs({
        id: "tf-route-b",
        label: "B · I don't have a team yet",
        description: "Continue beside the skill-card table into the Aula",
        x: 0.557,
        y: 0.859,
        kind: "route",
        audiences: ["builders"],
      }),
      hs({
        id: "tf-skill-cards",
        label: "Skill-card table",
        description: "Red: AI & Data · Yellow: Software & Development · Green: Business & Design",
        x: 0.539,
        y: 0.718,
        kind: "service",
        audiences: ["builders"],
      }),
      hs({
        id: "tf-posters",
        label: "1094 Aula and 1091 Hammarbacka",
        description: "Company challenge posters — meeting points for finding teammates, not briefing rooms",
        x: 0.387,
        y: 0.42,
        kind: "area",
        audiences: ["builders"],
      }),
      hs({
        id: "tf-team-check",
        label: "Team Check + card return",
        description: "The only way out: show every team member in sinceai.app and return your skill card",
        x: 0.217,
        y: 0.732,
        kind: "service",
        audiences: ["builders"],
      }),
      hs({
        id: "tf-taito",
        label: "2057 Taidon portaat",
        description: "Opening ceremony, Fri 17:00",
        x: 0.389,
        y: 0.721,
        kind: "area",
      }),
    ],
    status: "confirmed",
  },
  {
    id: "educity-1",
    venue: "educity",
    label: "Floor 1",
    title: "EduCity · Floor 1 · Company briefing rooms",
    src: "/assets/guide/maps/educity-1-preview.webp",
    srcLarge: "/assets/guide/maps/educity-1-large.webp",
    width: 1121,
    height: 1403,
    alt: "EduCity floor 1 plan with four company briefing rooms along the north side: Elisa in 1001 Dromberg, Bayer in 1002 Moriaberg, and in the glass box beside the lobby Europress in 1090 Ringsberg and Traficom in 1091 Hammarbacka. The lobby (Aula), Taidon portaat, Ravintola Kisälli and the main entrances are below them; lifts are on both sides of the lobby and by the entrances.",
    caption: "Company logos mark the briefing rooms used on Friday 18:50–19:30. Lifts on both sides of the lobby.",
    source: "Since AI event map",
    glossary: [G.floor, G.lobby, G.taito, G.restaurant, G.entrance, G.briefingRooms, G.logoMarks, G.lift],
    hotspots: [
      hs({ id: "e1-elisa", label: "1001 Dromberg", description: "Elisa", x: 0.308, y: 0.201, kind: "company", refId: "elisa" }),
      hs({ id: "e1-bayer", label: "1002 Moriaberg", description: "Bayer", x: 0.532, y: 0.201, kind: "company", refId: "bayer" }),
      hs({
        id: "e1-europress",
        label: "1090 Ringsberg",
        description: "Europress",
        x: 0.502,
        y: 0.282,
        kind: "company",
        refId: "europress",
      }),
      hs({
        id: "e1-traficom",
        label: "1091 Hammarbacka",
        description: "Traficom",
        x: 0.502,
        y: 0.348,
        kind: "company",
        refId: "traficom",
      }),
      hs({
        id: "e1-taito",
        label: "Taidon portaat",
        description: "Opening ceremony, Fri 17:00 · stairs up to floor 2",
        x: 0.502,
        y: 0.52,
        kind: "area",
      }),
      hs({
        id: "e1-lifts",
        label: "Lifts",
        description: "West and east of the lobby — up to floors 2 and 3",
        x: 0.239,
        y: 0.487,
        kind: "route",
      }),
      hs({
        id: "e1-entrances",
        label: "Main entrances",
        description: "Both lead to registration",
        x: 0.506,
        y: 0.845,
        kind: "entrance",
      }),
    ],
    status: "confirmed",
  },
  {
    id: "educity-2",
    venue: "educity",
    label: "Floor 2",
    title: "EduCity · Floor 2 · Company briefing rooms",
    src: "/assets/guide/maps/educity-2-preview.webp",
    srcLarge: "/assets/guide/maps/educity-2-large.webp",
    width: 1121,
    height: 1403,
    alt: "EduCity floor 2 plan with nine company briefing rooms around the upper level of Taidon portaat: Fonecta 2001 Elias, Takomo Golf 2002 Ivar, Forcit Group 2003 Erik and Lindström 2004 Johannes along the north side; room 2067 (partner to be announced) on the west side; Valmet 2006 / 2007 on the east side; DNA 2026 Orvokki in the south-east; Meyer Turku 2030 Evert and Apetit 2027 Frans at the south end. Lifts are on the west and east sides.",
    caption: "Up Taidon portaat or by lift. Room 2067 is held for a partner still to be announced.",
    source: "Since AI event map",
    glossary: [G.floor, G.taito, G.briefingRooms, G.logoMarks, G.lift, { fi: "Työkahvila Aurinkokylpy", en: "Work café (not a briefing room)" }],
    hotspots: [
      hs({ id: "e2-fonecta", label: "2001 Elias", description: "Fonecta", x: 0.221, y: 0.203, kind: "company", refId: "fonecta" }),
      hs({ id: "e2-takomo-golf", label: "2002 Ivar", description: "Takomo Golf", x: 0.378, y: 0.203, kind: "company", refId: "takomo-golf" }),
      hs({ id: "e2-forcit-group", label: "2003 Erik", description: "Forcit Group", x: 0.517, y: 0.203, kind: "company", refId: "forcit-group" }),
      hs({ id: "e2-lindstrom", label: "2004 Johannes", description: "Lindström", x: 0.658, y: 0.203, kind: "company", refId: "lindstrom" }),
      hs({ id: "e2-tba-2", label: "2067", description: "To be announced", x: 0.187, y: 0.32, kind: "company", refId: "tba-2" }),
      hs({ id: "e2-valmet", label: "2006 / 2007", description: "Valmet", x: 0.807, y: 0.314, kind: "company", refId: "valmet" }),
      hs({ id: "e2-dna", label: "2026 Orvokki", description: "DNA", x: 0.737, y: 0.659, kind: "company", refId: "dna" }),
      hs({ id: "e2-meyer-turku", label: "2030 Evert", description: "Meyer Turku", x: 0.344, y: 0.839, kind: "company", refId: "meyer-turku" }),
      hs({ id: "e2-apetit", label: "2027 Frans", description: "Apetit", x: 0.55, y: 0.839, kind: "company", refId: "apetit" }),
      hs({ id: "e2-taito", label: "Taidon portaat", description: "Stairs down to floor 1", x: 0.497, y: 0.545, kind: "area" }),
      hs({ id: "e2-lifts", label: "Lifts", description: "West and east sides — floors 1–3", x: 0.174, y: 0.565, kind: "route" }),
    ],
    status: "confirmed",
  },
  {
    id: "educity-3",
    venue: "educity",
    label: "Floor 3",
    title: "EduCity · Floor 3 · Turku Energia and Business Turku",
    src: "/assets/guide/maps/educity-3-preview.webp",
    srcLarge: "/assets/guide/maps/educity-3-large.webp",
    width: 1121,
    height: 1403,
    alt: "EduCity floor 3 plan: Turku Energia's room 3006 and Business Turku's room 3027 are on the east side, north and south of the walkway bridge (Kulkusilta) across the open light wells. Lifts are on the west and east sides; stairs are in the corners.",
    caption: "Turku Energia (3006) and Business Turku (3027) brief their teams on floor 3, east side. Take the lifts or the stairs.",
    source: "Since AI event map",
    glossary: [
      G.floor,
      G.lift,
      G.stairs,
      { fi: "Kerroskartta", en: "Floor plan" },
      { fi: "Kulkusilta", en: "Walkway bridge" },
      { fi: "Valoaula · avoin alas", en: "Light well · open to the floors below" },
      { fi: "Terassi", en: "Terrace" },
    ],
    hotspots: [
      hs({
        id: "e3-turku-energia",
        label: "3006",
        description: "Turku Energia",
        x: 0.813,
        y: 0.318,
        kind: "company",
        refId: "turku-energia",
      }),
      hs({
        id: "e3-business-turku",
        label: "3027",
        description: "Business Turku",
        x: 0.813,
        y: 0.646,
        kind: "company",
        refId: "business-turku",
      }),
      hs({ id: "e3-bridge", label: "Kulkusilta", description: "Walkway bridge across the light wells", x: 0.497, y: 0.529, kind: "route" }),
      hs({ id: "e3-lifts", label: "Lifts", description: "West and east sides — floors 1–3", x: 0.825, y: 0.567, kind: "route" }),
    ],
    status: "confirmed",
  },
  {
    id: "biocity-lobby",
    venue: "biocity",
    label: "Main lobby",
    title: "BioCity · Main lobby (pääaula)",
    src: "/assets/guide/maps/biocity-lobby-preview.webp",
    srcLarge: "/assets/guide/maps/biocity-lobby-large.webp",
    width: 1600,
    height: 1131,
    alt: "BioCity ground floor plan: the long main lobby (build area) along Lemminkäisenkatu, the curved Aulagalleria with the north-east entrance from Jussin aukio, the restaurant serving lines and the passage to Joki at the south-east end.",
    caption:
      "Planned event entrance on the courtyard side (Jussin aukio). Build tables fill the main lobby; Joki connects at its south-east end.",
    source: "Turun Teknologiakiinteistöt floor plan",
    glossary: [
      { fi: "Biocityn pääaula", en: "BioCity main lobby" },
      { fi: "Aulagalleria", en: "Lobby gallery" },
      { fi: "Sisäänkäynti Jussinaukiolta", en: "Entrance from Jussin aukio (event entrance)" },
      { fi: "Sisäänkäynti vierailukeskus Joesta", en: "Passage from Joki" },
      { fi: "Ruokailulinjasto", en: "Food serving line" },
      { fi: "Liiketila", en: "Retail space (not in use)" },
    ],
    hotspots: [
      hs({
        id: "bio-event-entrance",
        label: "Event entrance",
        description: "Courtyard side, from Jussin aukio (current plan)",
        x: 0.555,
        y: 0.203,
        kind: "entrance",
      }),
      // The partner corner (organiser, 6 and 13 Oct 2026): one ring for all six visibility / tech partner
      // stands — they are 1.76 m apart, too close for a ring each on this plan. Plan-B → image: u = 0.806 +
      // 0.0095 (x − 26.35), v = 0.641 + 0.01327 (z + 2.81), fitted on the earlier stand positions; stand
      // centres from components/guide/twin/engine/buildings/biocity/plan.ts.
      hs({
        id: "bio-partner-corner",
        label: "Partner corner",
        description:
          "All six visibility & tech partner stands · south-east end of the main lobby, by the passage to Joki (provisional layout)",
        x: 0.797,
        y: 0.6,
        kind: "area",
      }),
      standHotspot("stand-bc-1", 0.764, 0.584),
      standHotspot("stand-bc-2", 0.806, 0.641),
      standHotspot("stand-bc-3", 0.781, 0.584),
      standHotspot("stand-bc-4", 0.798, 0.584),
      standHotspot("stand-bc-5", 0.814, 0.584),
      standHotspot("stand-bc-6", 0.831, 0.584),
      hs({
        id: "bio-build-hall",
        label: "Build area",
        description: "Main lobby build tables",
        x: 0.564,
        y: 0.698,
        kind: "area",
        audiences: ["builders"],
      }),
      hs({ id: "bio-food-line", label: "Restaurant serving lines", x: 0.724, y: 0.292, kind: "service" }),
      hs({
        id: "bio-joki-passage",
        label: "To Joki",
        description: "Passage to Joki at the south-east end (short stair down)",
        x: 0.844,
        y: 0.685,
        kind: "route",
      }),
    ],
    status: "working",
  },
  {
    id: "joki-1",
    venue: "joki",
    label: "Floor 1",
    title: "Joki · Floor 1 · Aula, Cave and Showroom",
    src: "/assets/guide/maps/joki-1-preview.webp",
    srcLarge: "/assets/guide/maps/joki-1-large.webp",
    width: 1200,
    height: 1697,
    alt: "Joki floor 1 plan: the round tower with the Showroom and the amphitheatre (Company Lounge) at the top, the ramp down to the large Aula and the Cave hall (build areas), and the passage to BioCity at the lower left.",
    caption: "Build areas: Aula and Cave. Q&A: the round Showroom. The Company Lounge is the amphitheatre behind it.",
    source: "Turun Teknologiakiinteistöt floor plan",
    glossary: [
      { fi: "Showroom", en: "Showroom — challenge partner Q&A" },
      { fi: "Koulutustila / amfiteatteri", en: "Amphitheatre — Company Lounge" },
      { fi: "Cave-sali", en: "Cave hall — build area" },
      { fi: "Aula", en: "Lobby — build area" },
      { fi: "Kulku BioCityyn", en: "Passage to BioCity" },
      { fi: "Luiska", en: "Ramp" },
      { fi: "Kulku 2. kerroksen kokoustiloihin", en: "To the 2nd-floor meeting rooms (DataCity)" },
    ],
    hotspots: [
      hs({
        id: "joki1-showroom",
        label: "Showroom",
        description: "Q&A: Meyer Turku, DNA, Apetit, Elisa, Turku Energia, Bayer",
        x: 0.413,
        y: 0.195,
        kind: "area",
      }),
      hs({
        id: "joki1-lounge",
        label: "Company Lounge",
        description: "Amphitheatre for company representatives",
        x: 0.578,
        y: 0.1925,
        kind: "area",
        audiences: ["challenge-partners", "partners", "judges", "speakers"],
      }),
      hs({
        id: "joki1-ramp",
        label: "Ramp",
        description: "Between the Aula and the Showroom",
        x: 0.485,
        y: 0.36,
        kind: "route",
      }),
      hs({ id: "joki1-cave", label: "Cave hall", description: "Build area", x: 0.622, y: 0.4, kind: "area" }),
      hs({ id: "joki1-aula", label: "Aula", description: "Build area", x: 0.4466, y: 0.595, kind: "area" }),
      hs({
        id: "joki1-stairs-2",
        label: "Spiral stair to meeting rooms",
        description: "DataCity floor 2 — not the Q&A floors (use the tower stairs or lift by the Showroom)",
        x: 0.357,
        y: 0.709,
        kind: "route",
      }),
      hs({
        id: "joki1-biocity",
        label: "To BioCity",
        description: "Passage between Joki and BioCity",
        x: 0.221,
        y: 0.7965,
        kind: "entrance",
      }),
      hs({
        id: "joki1-street-door",
        label: "Street door",
        description: "Lemminkäisenkatu 12b",
        x: 0.192,
        y: 0.9285,
        kind: "entrance",
      }),
    ],
    status: "working",
  },
  {
    id: "joki-showroom",
    venue: "joki",
    label: "Showroom",
    title: "Joki · Floor 1 · Showroom stands",
    src: "/assets/guide/maps/joki-showroom-preview.webp",
    srcLarge: "/assets/guide/maps/joki-showroom-large.webp",
    width: 1200,
    height: 1050,
    alt: "Joki floor 1 Showroom with six challenge partner stands along the curved wall from the entrance: Meyer Turku, DNA, Apetit, Elisa, Turku Energia and Bayer; the Company Lounge is behind the stairs.",
    caption: "Six stands along the curved LED wall. Company Lounge beside the Showroom.",
    source: "Since AI event map",
    glossary: [G.floor, G.standLocations, G.stairs, G.lift, G.entrance, G.logoMarks],
    hotspots: [
      hs({ id: "sr-entrance", label: "Entrance", description: "From the ramp", x: 0.5025, y: 0.891, kind: "entrance" }),
      counterHotspot("meyer-turku", 0.4755, 0.778),
      counterHotspot("dna", 0.369, 0.731),
      counterHotspot("apetit", 0.301, 0.626),
      counterHotspot("elisa", 0.291, 0.498),
      counterHotspot("turku-energia", 0.343, 0.382),
      counterHotspot("bayer", 0.431, 0.312),
      hs({
        id: "sr-lounge",
        label: "Company Lounge",
        description: "Amphitheatre beside the Showroom",
        x: 0.66,
        y: 0.514,
        kind: "area",
      }),
    ],
    status: "working",
  },
  {
    id: "joki-2-3",
    venue: "joki",
    label: "Floors 2–3",
    title: "Joki · Floors 2 and 3 · Company stands",
    src: "/assets/guide/maps/joki-2-3-preview.webp",
    srcLarge: "/assets/guide/maps/joki-2-3-large.webp",
    width: 1500,
    height: 900,
    alt: "Joki tower floors 2 and 3. Floor 2: Europress, Valmet and Traficom with a Chill Zone. Floor 3: Lindström, Fonecta, Takomo Golf, Forcit Group, a partner to be announced and Business Turku.",
    caption: "Floor 2 (left) has a Chill Zone. Use the tower stairs or the lift.",
    source: "Since AI event map",
    glossary: [G.floor, G.standLocations, G.stairs, G.lift, G.logoMarks],
    hotspots: [
      hs({
        id: "f2-europress",
        label: "Europress",
        description: "Floor 2 · provisional",
        x: 0.3,
        y: 0.4,
        kind: "company",
        refId: "europress",
      }),
      hs({
        id: "f2-valmet",
        label: "Valmet",
        description: "Floor 2",
        x: 0.335,
        y: 0.4917,
        kind: "company",
        refId: "valmet",
      }),
      hs({
        id: "f2-traficom",
        label: "Traficom",
        description: "Floor 2",
        x: 0.3475,
        y: 0.5833,
        kind: "company",
        refId: "traficom",
      }),
      hs({ id: "f2-chill", label: "Chill Zone", description: "Floor 2", x: 0.1475, y: 0.609, kind: "area" }),
      hs({
        id: "f3-lindstrom",
        label: "Lindström",
        description: "Floor 3",
        x: 0.63,
        y: 0.4375,
        kind: "company",
        refId: "lindstrom",
      }),
      hs({
        id: "f3-fonecta",
        label: "Fonecta",
        description: "Floor 3",
        x: 0.6175,
        y: 0.5833,
        kind: "company",
        refId: "fonecta",
      }),
      hs({
        id: "f3-takomo-golf",
        label: "Takomo Golf",
        description: "Floor 3",
        x: 0.79,
        y: 0.4,
        kind: "company",
        refId: "takomo-golf",
      }),
      hs({
        id: "f3-forcit-group",
        label: "Forcit Group",
        description: "Floor 3",
        x: 0.825,
        y: 0.4917,
        kind: "company",
        refId: "forcit-group",
      }),
      hs({
        id: "f3-tba-2",
        label: "To be announced",
        description: "Floor 3",
        x: 0.8375,
        y: 0.5833,
        kind: "company",
        refId: "tba-2",
      }),
      hs({
        id: "f3-business-turku",
        label: "Business Turku",
        description: "Floor 3",
        x: 0.6825,
        y: 0.729,
        kind: "company",
        refId: "business-turku",
      }),
    ],
    status: "working",
  },
] as const;

export function getMap(id: string): VenueMap {
  const map = VENUE_MAPS.find((m) => m.id === id);
  if (!map) throw new Error(`Unknown map: ${id}`);
  return map;
}

export function mapsForVenue(venue: VenueMap["venue"]): VenueMap[] {
  return VENUE_MAPS.filter((m) => m.venue === venue && m.status !== "do_not_publish");
}

/** Hotspot on a map that points at a company / stand. */
export function findHotspot(mapId: string, refId: string): MapHotspot | undefined {
  return getMap(mapId).hotspots.find((h) => h.refId === refId);
}
