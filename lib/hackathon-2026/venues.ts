import type { Publishability, Venue, VenueId } from "./types";

const mapsSearch = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

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
      "Closing ceremony and awards (Sun from 13:00)",
    ],
    openAroundTheClock: false,
    entrances: [
      {
        label: "Main entrances",
        detail: "Both ground-floor main entrances lead to registration.",
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
    roles: [
      "Build space in the main lobby (around the clock)",
      "Meals",
      "Visibility & tech partner stands",
    ],
    openAroundTheClock: true,
    entrances: [
      {
        label: "Event entrance",
        detail: "North entrance from Jussin aukio square, into the Aulagalleria.",
        status: "working",
      },
      {
        label: "To Joki",
        detail: "Joki connects to the east end of BioCity's main lobby.",
        status: "confirmed",
      },
    ],
    mapsUrl: mapsSearch("BioCity, Tykistökatu 6, 20520 Turku"),
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
        label: "Event entry",
        detail: "Through BioCity's main lobby (east end) — follow the event signs.",
        status: "working",
      },
      {
        label: "Street door",
        detail: "The Lemminkäisenkatu 12b street door is not an event entrance.",
        status: "working",
      },
    ],
    mapsUrl: mapsSearch("Vierailu- ja innovaatiokeskus Joki, Lemminkäisenkatu 12b, 20520 Turku"),
    mapIds: ["joki-1", "joki-showroom", "joki-2-3"],
    status: "confirmed",
  },
] as const;

export function getVenue(id: VenueId): Venue {
  const venue = VENUES.find((v) => v.id === id);
  if (!venue) throw new Error(`Unknown venue: ${id}`);
  return venue;
}

export const venueAddressLine = (venue: Venue) =>
  `${venue.address}, ${venue.postalCode} ${venue.city}`;

/**
 * EduCity → BioCity/Joki transfer. Organiser description (3 Oct 2026): a short
 * outdoor walk through the campus courtyard, entering BioCity from the
 * event-designated side. Doors and the exact distance are confirmed on site,
 * so the guide shows the organiser estimate as approximate and always offers a
 * map fallback between the official addresses.
 */
export const TRANSFER_ROUTE: {
  status: Publishability;
  summary: string;
  approxOutdoorDistance: string;
  steps: readonly string[];
  fallbacks: readonly { label: string; href: string }[];
} = {
  status: "working",
  summary: "A short outdoor walk across the campus courtyard.",
  approxOutdoorDistance: "approx. 50 m outdoors (organiser estimate)",
  steps: [
    "Leave EduCity after your briefing — volunteers and event signs show the way.",
    "Walk across the campus courtyard (Jussin aukio).",
    "Enter BioCity through the event entrance on its north side.",
    "Joki is connected to the east end of BioCity's main lobby.",
  ],
  fallbacks: [
    {
      label: "Walking directions EduCity → BioCity",
      href: "https://www.google.com/maps/dir/?api=1&origin=Joukahaisenkatu+7,+Turku&destination=Tykist%C3%B6katu+6,+Turku&travelmode=walking",
    },
    {
      label: "Walking directions EduCity → Joki",
      href: "https://www.google.com/maps/dir/?api=1&origin=Joukahaisenkatu+7,+Turku&destination=Lemmink%C3%A4isenkatu+12b,+Turku&travelmode=walking",
    },
  ],
};
