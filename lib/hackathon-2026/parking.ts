import { GUIDE_BASE_PATH } from "./facts";
import { getTour3D } from "./twin";

/**
 * Parking and arriving by car — Since AI Hackathon 2026.
 *
 * Prices, hours and limits are the operators' own (checked on their pages,
 * 18–19 Oct 2026; linked as `officialUrl`). They are list prices, not Since AI
 * rates, and the operator's terms and the signs on site always prevail.
 *
 * Positions: a facility gets a 3D marker (`target3d`) only where its position
 * is verified and inside the campus model — ParkCity (the modelled building,
 * OpenStreetMap way 1212603914) and BioCity's car park entrance (OSM node
 * 6774131670, Aimo Park, on the driveway off Joukahaisenkatu). P-Station sits
 * just outside the model and P-Lemminkäisenkatu 24 in its low-detail outer
 * ring, so they are listed with directions only; EduCity's visitor spaces have
 * no verified position yet.
 */

export type ParkingId = "parkcity" | "p-station-kupittaa" | "biocity-guest" | "educity-guest" | "p-lemminkaisenkatu-24";

export interface ParkingFacility {
  id: ParkingId;
  name: string;
  operator: "Aimo Park" | "EuroPark";
  /** "Recommended", "24/7 alternative"… — one short tag. */
  role: string;
  kind: string;
  address: string;
  /** Where cars actually drive in, when it differs from the address. */
  vehicleEntrance?: string;
  zone?: string;
  /** Tariff lines, as the operator lists them. */
  prices: readonly string[];
  /** Aimo Park adds a service fee to every session. */
  serviceFee?: string;
  access: string;
  heightLimit?: string;
  /** Short facts worth knowing (levels, payment, EV charging…). */
  notes: readonly string[];
  /** On foot to the venues. */
  walk: readonly string[];
  /** Verified [lat, lon] of the vehicle entrance (or the facility) — the driving destination. */
  coords?: readonly [number, number];
  officialUrl: string;
  /** 3D target id, only when the position is verified inside the model. */
  target3d?: string;
}

const AIMO_FEE = "Aimo Park adds a service fee to every session: 10% of the parking fee, at least €0.49 and at most €4.";

const tourWalk = (id: string, to: string) => {
  const tour = getTour3D(id);
  if (!tour) throw new Error(`Unknown tour: ${id}`);
  return `${to}: about ${Math.round(tour.distanceM / 10) * 10} m, ${Math.max(1, Math.round(tour.minutes))} min on foot.`;
};

export const PARKING: readonly ParkingFacility[] = [
  {
    id: "parkcity",
    name: "ParkCity",
    operator: "Aimo Park",
    role: "Recommended",
    kind: "Multi-storey car park · 990 spaces",
    address: "Joukahaisenkatu 8, 20520 Turku",
    zone: "Guest parking on floors 1–3 · Aimo zone 785",
    prices: ["€1.60 per started 30 min", "Maximum €15 per 24 h"],
    serviceFee: AIMO_FEE,
    access: "Entry daily 06:00–00:00 · exit 24 h",
    heightLimit: "2.2 m",
    notes: ["EV charging available (Aimo Charge).", "No entry between midnight and 06:00 — use P-Station Kupittaa then."],
    walk: [
      tourWalk("partners-fri-parkcity-edu", "To EduCity door B (company arrival)"),
      tourWalk("partners-fri-stepfree-edu", "Step-free to EduCity's street-level lifts"),
      tourWalk("companies-parkcity-to-biocity", "To BioCity's main entrance (Tykistökatu 6)"),
    ],
    coords: [60.449441, 22.297308],
    officialUrl: "https://www.aimopark.fi/kaupungit/turku/parkcity/",
    target3d: "parkcity",
  },
  {
    id: "p-station-kupittaa",
    name: "P-Station Kupittaa",
    operator: "EuroPark",
    role: "24/7 alternative",
    kind: "Indoor, heated garage",
    address: "Joukahaisenkatu 2, 20520 Turku",
    vehicleEntrance: "Through the courtyard",
    zone: "Short-term visitors on level P1 only",
    prices: ["€2.00 per started hour", "Maximum €15 per 24 h"],
    access: "Entry and exit 24/7",
    heightLimit: "2.1 m",
    notes: [
      "No maximum parking time for visitors.",
      "Pay at the machine, with EasyPark (zone 1125), ParkMan or Autopay licence-plate recognition.",
    ],
    walk: ["By Kupittaa station: a few minutes on foot to BioCity and Joki; EduCity is on the far side of the campus."],
    coords: [60.451213, 22.293243],
    officialUrl: "https://www.europark.fi/pysakointi/p-station-kupittaa-halli/",
  },
  {
    id: "biocity-guest",
    name: "BioCity car park",
    operator: "Aimo Park",
    role: "Limited spaces",
    kind: "Underground car park",
    address: "BioCity, Tykistökatu 6, 20520 Turku",
    vehicleEntrance: "Driveway off Joukahaisenkatu — not at BioCity's pedestrian entrances",
    zone: "Guest parking · Aimo zone 703",
    prices: ["€2.10 per started 30 min", "Maximum €18 per 12 h"],
    serviceFee: AIMO_FEE,
    access: "Entry and exit 24 h",
    notes: ["Guest spaces are limited — have ParkCity as your back-up."],
    walk: ["About 110 m from BioCity's main entrance on Tykistökatu. Joki's event entrance is through BioCity."],
    coords: [60.449566, 22.294789],
    officialUrl: "https://www.aimopark.fi/kaupungit/turku/turun-teknologiakiinteistot/",
    target3d: "parking-biocity",
  },
  {
    id: "educity-guest",
    name: "EduCity visitor parking",
    operator: "Aimo Park",
    role: "Visitor spaces",
    kind: "Visitor parking",
    address: "EduCity, Joukahaisenkatu 7, 20520 Turku",
    zone: "Visitor parking · Aimo zone 729",
    prices: ["€1.10 per started 20 min", "Maximum €15 per 12 h"],
    serviceFee: AIMO_FEE,
    access: "Entry and exit 24 h",
    notes: ["Check the zone number on the parking signs before you pay."],
    walk: ["At EduCity."],
    officialUrl: "https://www.aimopark.fi/kaupungit/turku/turun-teknologiakiinteistot/",
  },
  {
    id: "p-lemminkaisenkatu-24",
    name: "P-Lemminkäisenkatu 24",
    operator: "EuroPark",
    role: "Outdoor alternative",
    kind: "Outdoor car park",
    address: "Lemminkäisenkatu 24, 20520 Turku",
    vehicleEntrance: "From Lemminkäisenkatu 24 or Untamonkatu 3",
    prices: ["€2.50 per hour", "€15 per 24 h"],
    access: "Open 24/7",
    notes: ["Pay with EasyPark (zone 978), ParkMan or Verkkoparkki."],
    walk: ["Next to EduCity's south side; a few minutes on foot to BioCity."],
    coords: [60.447712, 22.296034],
    officialUrl: "https://www.europark.fi/pysakointi/p-lemminkaisenkatu-24/",
  },
];

export function getParking(id: ParkingId): ParkingFacility {
  const p = PARKING.find((f) => f.id === id);
  if (!p) throw new Error(`Unknown parking: ${id}`);
  return p;
}

/** Google Maps driving directions to the verified entrance (never just the venue address). */
export function drivingDirections(facility: ParkingFacility): string | undefined {
  if (!facility.coords) return undefined;
  const params = new URLSearchParams({
    api: "1",
    destination: facility.coords.join(","),
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params}`;
}

/** Municipal street parking (City of Turku), for the "is it free?" question. */
export const STREET_PARKING = {
  hours: "City of Turku paid street parking: Mon–Fri 09:00–20:00 and Sat 09:00–17:00 (Zone I €3.60, Zone II €1.80, Zone III €0.60 per hour).",
  notice:
    "Free parking may be available on certain public streets outside paid hours, including Sundays. Availability, time limits and restrictions vary by location. Always check the traffic signs before leaving your vehicle. Private parking garages remain subject to their own fees.",
  officialUrl: "https://www.turku.fi/liikenne-kadut-ja-kunnossapito/pysakointialueet-ja-maksut",
} as const;

/** Places people mistake for event parking. */
export const NOT_EVENT_PARKING: readonly string[] = [
  "P-Intelligate (Joukahaisenkatu 6) is for Original Sokos Hotel Kupittaa guests and contract holders only.",
  "The courtyard at Kupittaa station is 1-hour disc parking for shoppers.",
  "Never park on the campus deck, in courtyards, on cycle paths, in fire lanes or in reserved spaces.",
];

/** Arrival details that are not about a single car park. */
export const CAR_ARRIVAL = {
  dropOff:
    "Dropping someone off is not parking: stop only where the signs allow it, let your passengers out and drive on to a car park.",
  lateArrival: "Arriving between midnight and 06:00? ParkCity's entry is closed then — P-Station Kupittaa is open 24/7.",
  accessible:
    "Accessible parking: the operator's terms apply in private car parks, including to disabled parking card holders — check them before you arrive. The step-free route from ParkCity uses the lifts between ICT-City and EduCity.",
  unloading:
    "Bringing stand equipment? Ask the Since AI team to arrange unloading with you in advance — there are no event loading permits or company parking passes.",
  disclaimer:
    "Prices and availability are set by the operators and may change; the signs on site and the operator's terms always prevail. These are regular public rates, not Since AI discounts.",
} as const;

/** The 3D view of the campus, focused on a parking target. */
export const parkingIn3D = (target: string) => `${GUIDE_BASE_PATH}/venue?focus=${target}#preview-3d`;
