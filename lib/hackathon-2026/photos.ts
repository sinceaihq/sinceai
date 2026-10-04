import type { VenueId } from "./types";

/**
 * Venue photos. Credits are shown under every photo, embedded in the image
 * files (EXIF + XMP) and repeated in ImageObject structured data.
 *
 * Sources: EduCity photos by Vesa Loikas (supplied to Since AI for the event);
 * BioCity and Joki photos and Joki video stills by Turun Teknologiakiinteistöt
 * Oy, the venue owner and a Since AI partner. Video stills were chosen without
 * people in them.
 */
export interface VenuePhoto {
  id: string;
  venue: VenueId;
  /** 1600 px wide (or the original size if smaller) — gallery / lightbox. */
  src: string;
  width: number;
  height: number;
  /** 800 px wide — cards and thumbnails. */
  srcCard: string;
  cardWidth: number;
  cardHeight: number;
  alt: string;
  /** What the reader needs to know about this place during the event. */
  caption: string;
  credit: string;
  creator: string;
  copyrightHolder: string;
}

const TTK = "Turun Teknologiakiinteistöt Oy";

export const VENUE_PHOTOS: readonly VenuePhoto[] = [
  {
    id: "educity-taidon-portaat",
    venue: "educity",
    src: "/assets/guide/photos/educity-taidon-portaat-large.webp",
    width: 980,
    height: 1341,
    srcCard: "/assets/guide/photos/educity-taidon-portaat-card.webp",
    cardWidth: 800,
    cardHeight: 1095,
    alt: "Wide concrete seating steps with pink and green cushions under EduCity's glass roof.",
    caption:
      "Taidon portaat — the stair seating in the EduCity lobby. The opening ceremony starts here on Friday at 17:00.",
    credit: "Photo: Vesa Loikas",
    creator: "Vesa Loikas",
    copyrightHolder: "Vesa Loikas Photography",
  },
  {
    id: "educity-atrium",
    venue: "educity",
    src: "/assets/guide/photos/educity-atrium-large.webp",
    width: 1600,
    height: 1090,
    srcCard: "/assets/guide/photos/educity-atrium-card.webp",
    cardWidth: 800,
    cardHeight: 545,
    alt: "EduCity's multi-storey atrium with timber-clad meeting boxes, glass balconies and a lounge on the ground floor.",
    caption: "The EduCity atrium. The company briefing rooms are on floors 1 and 2.",
    credit: "Photo: Vesa Loikas",
    creator: "Vesa Loikas",
    copyrightHolder: "Vesa Loikas Photography",
  },
  {
    id: "biocity-exterior",
    venue: "biocity",
    src: "/assets/guide/photos/biocity-exterior-large.webp",
    width: 1200,
    height: 759,
    srcCard: "/assets/guide/photos/biocity-exterior-card.webp",
    cardWidth: 800,
    cardHeight: 506,
    alt: "BioCity at dusk: a large glass and dark-panelled office building on a street corner, with a Science Park sign on the roof.",
    caption: "BioCity from Tykistökatu. The event entrance is on the opposite, courtyard side (Jussin aukio).",
    credit: `Photo: ${TTK}`,
    creator: TTK,
    copyrightHolder: TTK,
  },
  {
    id: "joki-tower-dusk",
    venue: "joki",
    src: "/assets/guide/photos/joki-tower-dusk-large.webp",
    width: 1600,
    height: 1067,
    srcCard: "/assets/guide/photos/joki-tower-dusk-card.webp",
    cardWidth: 800,
    cardHeight: 533,
    alt: "Joki's round glass tower lit up at dusk, between brick and glass buildings on the campus courtyard.",
    caption: "Joki's glass tower on the courtyard: the Showroom is on floor 1, the Q&A floors above it.",
    credit: `Photo: ${TTK}`,
    creator: TTK,
    copyrightHolder: TTK,
  },
  {
    id: "joki-lobby",
    venue: "joki",
    src: "/assets/guide/photos/joki-lobby-large.webp",
    width: 1600,
    height: 670,
    srcCard: "/assets/guide/photos/joki-lobby-card.webp",
    cardWidth: 800,
    cardHeight: 335,
    alt: "Joki's empty lobby: a light floor, white pillars, long black high tables and a concrete reception counter.",
    caption: "Joki's lobby (Aula) — one of the build areas, open around the clock.",
    credit: `Still from the Joki video · ${TTK}`,
    creator: "Visitor and Innovation Centre Joki",
    copyrightHolder: TTK,
  },
  {
    id: "joki-amphitheatre",
    venue: "joki",
    src: "/assets/guide/photos/joki-amphitheatre-large.webp",
    width: 1600,
    height: 670,
    srcCard: "/assets/guide/photos/joki-amphitheatre-card.webp",
    cardWidth: 800,
    cardHeight: 335,
    alt: "A small round amphitheatre with cushioned seats in rose and teal around a sunken centre.",
    caption: "The amphitheatre next to the Showroom — the Company Lounge for partner representatives.",
    credit: `Still from the Joki video · ${TTK}`,
    creator: "Visitor and Innovation Centre Joki",
    copyrightHolder: TTK,
  },
] as const;

export function photosForVenue(venue: VenueId): VenuePhoto[] {
  return VENUE_PHOTOS.filter((p) => p.venue === venue);
}

export function getPhoto(id: string): VenuePhoto {
  const photo = VENUE_PHOTOS.find((p) => p.id === id);
  if (!photo) throw new Error(`Unknown photo: ${id}`);
  return photo;
}

/** Credits for every third-party visual used in the guide. */
export const IMAGE_CREDITS: readonly { what: string; credit: string }[] = [
  { what: "EduCity interior photos", credit: "Vesa Loikas" },
  { what: "BioCity and Joki photos, Joki video stills", credit: TTK },
  { what: "BioCity and Joki floor plans", credit: `${TTK} (4 Jun 2026)` },
  { what: "EduCity and Joki event maps", credit: "Since AI (2 Oct 2026)" },
  { what: "3D preview", credit: "Since AI — illustrative render, not to scale" },
] as const;
