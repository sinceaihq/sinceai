/**
 * Discounted accommodation in Turku for Since AI participants — exactly the five
 * offers the hotels confirmed to Since AI (6 Oct 2026; Bob W 7 Oct 2026). Do not add offers that
 * are not confirmed, and never show a discount a hotel did not state (Scandic
 * confirmed discounted rates through a booking link, no percentage).
 */

export interface AccommodationLink {
  label: string;
  href: string;
  primary?: boolean;
}

export interface AccommodationOffer {
  id: string;
  name: string;
  /** The confirmed price or discount, as the hotel stated it. */
  benefit: string;
  code?: string;
  /** Something easy to get wrong about the code. */
  codeNote?: string;
  /** Last moment the offer can be booked (ISO, Turku time); the UI marks it expired after this. */
  bookBy?: string;
  availability?: string;
  /** One line: how to book. */
  howTo: string;
  links: readonly AccommodationLink[];
}

export const ACCOMMODATION_INTRO =
  "Accommodation is not included in hackathon participation unless Since AI has confirmed it to you personally. We have arranged discounted rates in Turku for Since AI participants — availability is limited, so book early.";

export const ACCOMMODATION_OFFERS: readonly AccommodationOffer[] = [
  {
    id: "sokos-kupittaa",
    name: "Original Sokos Hotel Kupittaa",
    benefit: "€112 / night single room · €132 / night double room",
    code: "BSINCEAI",
    codeNote: "The leading “B” is part of the code.",
    bookBy: "2026-10-06T16:30:00+03:00",
    availability: "Limited availability",
    howTo: "Book with the booking code before the deadline.",
    links: [
      {
        label: "Book Original Sokos Hotel Kupittaa",
        href: "https://www.sokoshotels.fi/en/hotels/turku/original-sokos-hotel-kupittaa",
        primary: true,
      },
    ],
  },
  {
    id: "holiday-club-caribia",
    name: "Holiday Club Turun Caribia",
    benefit: "20% off accommodation",
    code: "SINCEAI2026",
    howTo: "Enter the code when you book.",
    links: [
      {
        label: "Book Holiday Club Caribia",
        href: "https://www.holidayclubresorts.com/en/hotels-resorts/turun-caribia/",
        primary: true,
      },
    ],
  },
  {
    id: "omena-turku",
    name: "Omena Hotels Turku",
    benefit: "15% off at both Turku hotels",
    code: "SINCEAI2026",
    howTo: "Book at omenahotels.com and enter the code under “I have a discount code”.",
    links: [
      { label: "Turku Humalistonkatu", href: "https://www.omenahotels.com/fi/hotellit/turku-humalistonkatu/" },
      { label: "Turku Kauppiaskatu", href: "https://www.omenahotels.com/fi/hotellit/turku-kauppiaskatu/" },
    ],
  },
  {
    id: "scandic-turku",
    name: "Scandic Turku",
    benefit: "Discounted rates through the Since AI booking link",
    howTo: "Book through the Since AI link — the discounted rates are applied there.",
    links: [
      { label: "View discounted Scandic rates", href: "https://www.scandichotels.com/fi?bookingCode=CGRO", primary: true },
      { label: "See Scandic hotels in Turku", href: "https://www.scandichotels.com/en/destinations/finland/turku" },
    ],
  },
  {
    id: "bob-w",
    name: "Bob W",
    benefit: "10% off apartments",
    code: "BOBWSINCEAI26",
    codeNote: "Rates are dynamic and vary with demand and availability.",
    howTo:
      "At bobw.co, choose your city, dates and guests and click Search. Click “Apply voucher”, enter the code, pick an apartment to see the discounted rate, then book and pay by credit card.",
    links: [{ label: "Book Bob W", href: "https://bobw.co/", primary: true }],
  },
] as const;

/** Whether an offer can still be booked at `nowMs` (offers without a deadline always can). */
export function offerOpen(offer: AccommodationOffer, nowMs: number): boolean {
  return !offer.bookBy || nowMs < Date.parse(offer.bookBy);
}
