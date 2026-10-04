/**
 * Types for the Since AI Hackathon 2026 Field Guide.
 *
 * Everything the guide renders comes from the typed data in this folder, so a
 * room move or a new time is a one-line edit. Every operational fact carries a
 * publishability status; the UI never renders `do_not_publish` items.
 */

/** Guide audiences. Staff/admin is intentionally not a public audience. */
export type Audience = "builders" | "challenge-partners" | "partners" | "judges" | "speakers";

export const ALL_AUDIENCES: readonly Audience[] = [
  "builders",
  "challenge-partners",
  "partners",
  "judges",
  "speakers",
] as const;

/**
 * Publishability of a fact.
 * - `confirmed`      – decided and safe to show as fact
 * - `working`        – latest internal plan; shown, but may still be fine-tuned
 * - `pending`        – not decided; shown only as "to be confirmed" when useful
 * - `do_not_publish` – never rendered (kept in data only as a reminder)
 */
export type Publishability = "confirmed" | "working" | "pending" | "do_not_publish";

export type VenueId = "educity" | "biocity" | "joki";

/** Where a schedule item happens. `app` = in sinceai.app. */
export type Place = VenueId | "biocity-joki" | "app";

export type DayId = "fri" | "sat" | "sun";

export interface ScheduleItem {
  id: string;
  /** ISO 8601 with Helsinki offset, e.g. 2026-11-06T17:00:00+02:00 */
  start: string;
  end?: string;
  /** The end time exists in sources but is not decided — show "end TBC". */
  endPending?: boolean;
  /** "Around 14:00" style times. */
  approx?: boolean;
  /** Rendered as an all-day row at the top of the day. */
  allDay?: boolean;
  title: string;
  /** Audience-specific wording for the same moment. */
  titleFor?: Partial<Record<Audience, string>>;
  detail?: string;
  detailFor?: Partial<Record<Audience, string>>;
  place: Place;
  /** Sub-location, e.g. "Lobby · Taidon portaat". */
  placeDetail?: string;
  placeDetailFor?: Partial<Record<Audience, string>>;
  audiences: readonly Audience[];
  kind: "milestone" | "deadline" | "meal" | "session" | "move" | "note";
  status: Publishability;
  /** Short visible note for working/pending details. */
  note?: string;
  noteFor?: Partial<Record<Audience, string>>;
}

export interface Entrance {
  label: string;
  detail: string;
  status: Publishability;
}

export interface Venue {
  id: VenueId;
  name: string;
  fullName: string;
  address: string;
  postalCode: string;
  city: string;
  /** What happens here during the event, in order of importance. */
  roles: readonly string[];
  /** Open around the clock during the event (build spaces). */
  openAroundTheClock: boolean;
  entrances: readonly Entrance[];
  /** Google Maps search link for the official street address. */
  mapsUrl: string;
  /** Card image (exterior, so people recognise the building). */
  image?: { src: string; alt: string; width: number; height: number; credit?: string };
  /** Map ids (see maps.ts) relevant to this venue, in display order. */
  mapIds: readonly string[];
  status: Publishability;
}

export interface ChallengeCompany {
  id: string;
  name: string;
  /** Approved logo already in /public (white logo for dark backgrounds). */
  logo?: { src: string; width: number; height: number };
  briefing: {
    venue: "educity";
    floor: 1 | 2;
    /** Room number(s) as signposted, e.g. "1001" or "2006 / 2007". */
    room: string;
    /** Room name, e.g. "Dromberg". */
    roomName?: string;
  };
  qa: {
    venue: "joki";
    floor: 1 | 2 | 3;
    /** e.g. "Showroom" */
    zone: string;
  };
  /** Room/stand placement status (2 Oct maps, production lock pending). */
  placementStatus: Publishability;
}

export type StandCategory = "visibility-tech";

export interface EventPartner {
  id: string;
  name: string;
  /** Approved logo file in /public. When missing the UI shows a wordmark. */
  logo?: { src: string; width: number; height: number };
  url?: string;
  category: StandCategory;
  status: Publishability;
}

export interface PartnerStand {
  id: string;
  /** 1 = most visible position. */
  rank: number;
  venue: "biocity";
  area: string;
  location: string;
  /** Why this position matters (shown to partners). */
  visibility: string;
  /** Assigned partner id, or null for an open stand. */
  partnerId: string | null;
  /** Hotspot id on the BioCity map. */
  hotspotId: string;
  status: Publishability;
}

export type HotspotKind = "company" | "stand" | "entrance" | "area" | "route" | "service";

export interface MapHotspot {
  id: string;
  label: string;
  /** Short description for the text fallback list. */
  description?: string;
  /** Normalised position on the image (0–1). */
  x: number;
  y: number;
  kind: HotspotKind;
  /** Company / partner / stand reference. */
  refId?: string;
  audiences?: readonly Audience[];
}

export interface VenueMap {
  id: string;
  venue: VenueId;
  /** Tab label, e.g. "Floor 1". */
  label: string;
  title: string;
  /** Preview image (for inline display). */
  src: string;
  /** Larger image for the zoomable viewer. */
  srcLarge: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  /** Who drew it — shown as credit. */
  source: "Since AI event map" | "Turun Teknologiakiinteistöt floor plan";
  /** Finnish words that appear on this map, translated. */
  glossary?: readonly { fi: string; en: string }[];
  hotspots: readonly MapHotspot[];
  status: Publishability;
}

export interface ChecklistGroup {
  title: string;
  items: readonly string[];
}

export interface GuideDetail {
  q: string;
  a: string;
  status?: Publishability;
}

export interface GuideDefinition {
  audience: Audience;
  slug: string;
  /** Exact UI name, e.g. "Builder Guide". */
  name: string;
  /** Short label for navigation chips. */
  navLabel: string;
  /** One-line purpose under the H1. */
  lede: string;
  /** Who this page is for (hub card). */
  forWho: string;
  /** The first critical moment for this role (schedule item id). */
  firstMomentId: string;
  /** Metadata description. */
  metaDescription: string;
}
