import type { Publishability, Venue, VenueId } from "./types";
import { ORG } from "@/lib/org";

const mapsSearch = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

/**
 * Three venues, one event flow. EduCity hosts arrival, the opening, the Friday
 * challenge briefings and the Sunday closing. BioCity and Joki are the
 * continuous build spaces.
 */
export const VENUES: readonly Venue[] = [
  {
    id: "educity",
    name: "EduCity",
    fullName: "EduCity (Turku AMK Kupittaa campus)",
    address: "Joukahaisenkatu 7",
    postalCode: "20520",
    city: "Turku",
    roles: [
      "Arrival, registration and team formation (Fri from 15:00)",
      "Opening ceremony (Fri 17:00)",
      "Company challenge briefings (Fri 18:30–19:30)",
      "Closing: company challenge winners and the finals (Sun from 13:30)",
    ],
    openAroundTheClock: false,
    entrances: [
      {
        label: "Main entrances",
        detail:
          "Both main entrances (west and east) are in the glass entrance pavilion at deck level and lead to registration. From Joukahaisenkatu, take the wide outdoor stairs at the east corner — or the step-free lifts in the passage between ICT-City and EduCity.",
        status: "working",
      },
    ],
    mapsUrl: mapsSearch("EduCity, Joukahaisenkatu 7, 20520 Turku"),
    image: {
      src: "/assets/images/educity-card.webp",
      alt: "EduCity in Turku at night",
      width: 1440,
      height: 1177,
    },
    mapIds: ["educity-1", "educity-2", "educity-flow-1", "educity-flow-2"],
    status: "confirmed",
  },
  {
    id: "biocity",
    name: "BioCity",
    fullName: "BioCity",
    address: "Tykistökatu 6",
    postalCode: "20520",
    city: "Turku",
    roles: ["Build space in the main lobby (around the clock)", "Meals", "Visibility & tech partner stands"],
    openAroundTheClock: true,
    entrances: [
      {
        label: "Company entrance",
        detail:
          "Tykistökatu 6 — the main entrance in the open recess next to the glass corner tower (level access). Companies and partners come in here.",
        status: "working",
      },
      {
        label: "Event entrance",
        detail: "Builders: the courtyard-side entrance from Jussin aukio, into the Aulagalleria.",
        status: "working",
      },
      {
        label: "To Joki",
        detail: "Indoors from the far (south-east) end of the main lobby, down a short stair (10 steps).",
        status: "confirmed",
      },
    ],
    mapsUrl: mapsSearch("BioCity, Tykistökatu 6, 20520 Turku"),
    image: {
      src: "/assets/guide/photos/biocity-exterior-card.webp",
      alt: "BioCity at dusk: a large glass and dark-panelled office building on a street corner, seen from the Tykistökatu–Lemminkäisenkatu junction.",
      width: 800,
      height: 506,
      credit: "Photo: Turun Teknologiakiinteistöt Oy",
    },
    mapIds: ["biocity-lobby"],
    status: "confirmed",
  },
  {
    id: "joki",
    name: "Joki",
    fullName: "Visitor and Innovation Centre Joki",
    address: "Lemminkäisenkatu 12b",
    postalCode: "20520",
    city: "Turku",
    roles: [
      "Build space in the Aula and the Cave hall (around the clock)",
      "Challenge partner Q&A — Showroom and floors 2–3",
      "Company Lounge (floor 1)",
    ],
    openAroundTheClock: true,
    entrances: [
      {
        label: "From BioCity",
        detail:
          "The event way in: from the far (south-east) end of BioCity's main lobby, down a short stair (10 steps) — follow the event signs.",
        status: "confirmed",
      },
      {
        label: "Street door",
        detail: "Lemminkäisenkatu 12b is closed during the event — enter Joki through BioCity.",
        status: "working",
      },
      {
        label: "Step-free access",
        detail: `The way in from BioCity has 10 steps. If you need step-free access to Joki, email ${ORG.contact.infoEmail} before the event so the organisers can arrange a step-free way in.`,
        status: "working",
      },
    ],
    mapsUrl: mapsSearch("Vierailu- ja innovaatiokeskus Joki, Lemminkäisenkatu 12b, 20520 Turku"),
    image: {
      src: "/assets/guide/photos/joki-tower-dusk-card.webp",
      alt: "Joki's round glass tower lit up at dusk on the campus courtyard.",
      width: 800,
      height: 533,
      credit: "Photo: Turun Teknologiakiinteistöt Oy",
    },
    mapIds: ["joki-1", "joki-showroom", "joki-2-3"],
    status: "confirmed",
  },
] as const;

export function getVenue(id: VenueId): Venue {
  const venue = VENUES.find((v) => v.id === id);
  if (!venue) throw new Error(`Unknown venue: ${id}`);
  return venue;
}

export const venueAddressLine = (venue: Venue) => `${venue.address}, ${venue.postalCode} ${venue.city}`;

/**
 * EduCity → BioCity/Joki transfer, measured on the City of Turku base map and
 * OpenStreetMap (4 Oct 2026): EduCity's west entrance → raised deck past
 * ICT-City → Jussin aukio → BioCity's courtyard-side event entrance, about
 * 200 m. Doors are confirmed on site, so the guide keeps map fallbacks between
 * the official addresses.
 */
export const TRANSFER_ROUTE: {
  status: Publishability;
  summary: string;
  approxOutdoorDistance: string;
  steps: readonly string[];
  fallbacks: readonly { label: string; href: string }[];
} = {
  status: "working",
  summary: "A 3-minute outdoor walk along the raised campus deck to Jussin aukio.",
  approxOutdoorDistance: "about 200 m outdoors · 3 min",
  steps: [
    "Leave EduCity by the west main entrance — after Friday's briefings, volunteers and event signs show the way.",
    "Follow the raised deck past ICT-City to Jussin aukio and take the wide outdoor stairs down (about 10 steps).",
    "Enter BioCity through its courtyard-side event entrance.",
    "Joki is indoors from BioCity: at the far (south-east) end of the main lobby, down a short stair (10 steps).",
  ],
  fallbacks: [
    {
      // The courtyard-side event entrance (60.44939 N, 22.29367 E) — not the street address.
      label: "Walking directions EduCity → BioCity event entrance (Jussin aukio)",
      href: "https://www.google.com/maps/dir/?api=1&origin=Joukahaisenkatu+7,+Turku&destination=60.44939,22.29367&travelmode=walking",
    },
    {
      label: "BioCity's street address on the map (Tykistökatu 6 · front door)",
      href: "https://www.google.com/maps/search/?api=1&query=Tykist%C3%B6katu+6,+Turku",
    },
  ],
};
