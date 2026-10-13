import type { EventPartner, PartnerStand } from "./types";

/**
 * Visibility / technology partners with a planned BioCity stand.
 *
 * Organiser decisions: every visibility / tech partner stand is in one partner
 * corner — the south-east corner of BioCity's main lobby, where Solita's stand
 * already was (6 Oct 2026) — and the corner now plans six stands (13 Oct 2026):
 * Red Hat, Solita, Pruna AI, BearingPoint, CSC / LUMI AI Factory and Major
 * League Hacking. None of them is a challenge partner. Solita and BearingPoint
 * also mentor builders.
 *
 * MLH's stand is an organiser-planned requirement; MLH has not separately
 * confirmed who staffs it on site, so it stays `working` with a note.
 *
 * Logos: official artwork only, white / reverse variants for the dark site —
 * Red Hat from the Red Hat Design System's reverse logo (colour on black),
 * BearingPoint from its press brand assets, MLH from mlh.com/brand-guidelines,
 * LUMI AI Factory from its media kit (the CSC logo has no usable reverse file).
 */
export const STAND_PARTNERS: readonly EventPartner[] = [
  {
    id: "red-hat",
    name: "Red Hat",
    logo: { src: "/assets/sponsors/red-hat.svg", width: 613, height: 145 },
    url: "https://www.redhat.com/en/products/ai",
    category: "visibility-tech",
    role: "Red Hat AI",
    status: "confirmed",
  },
  {
    id: "solita",
    name: "Solita",
    logo: { src: "/assets/sponsors/solita.png", width: 1216, height: 285 },
    url: "https://www.solita.fi/",
    category: "visibility-tech",
    role: "Visibility partner · mentoring",
    status: "confirmed",
  },
  {
    id: "pruna-ai",
    name: "Pruna AI",
    logo: { src: "/assets/sponsors/Pruna.svg", width: 608, height: 181 },
    url: "https://www.pruna.ai/",
    category: "visibility-tech",
    role: "Technology partner",
    status: "confirmed",
  },
  {
    id: "bearingpoint",
    name: "BearingPoint",
    logo: { src: "/assets/sponsors/bearingpoint.png", width: 1800, height: 300 },
    url: "https://www.bearingpoint.com/",
    category: "visibility-tech",
    role: "Visibility partner · mentoring",
    status: "confirmed",
  },
  {
    id: "csc-lumi",
    name: "CSC / LUMI AI Factory",
    logo: { src: "/assets/sponsors/Lumi.svg", width: 1815, height: 337 },
    url: "https://lumi-ai-factory.eu/",
    category: "visibility-tech",
    role: "Compute partner",
    status: "confirmed",
  },
  {
    id: "mlh",
    name: "Major League Hacking",
    logo: { src: "/assets/sponsors/mlh.svg", width: 343, height: 145 },
    url: "https://www.mlh.com/",
    category: "visibility-tech",
    role: "Official hackathon league",
    status: "working",
    note: "Stand planned by Since AI; MLH's on-site staffing is confirmed separately.",
  },
] as const;

/** Label used for any stand position that has no partner yet. */
export const OPEN_STAND_LABEL = "Visibility / Tech Partner stand";

/** The partner corner: where every visibility / tech partner stand is. */
export const PARTNER_CORNER = "Main lobby · partner corner";

/**
 * The partner corner's six stand positions, ranked by visibility: a row of
 * five along the corner's north-east side facing the build hall's walkway, and
 * Solita's position facing the hall by the passage to Joki. The corridor to the
 * meals and the Aulagalleria, the walkway to Joki and the corner's side door
 * stay clear.
 *
 * Six positions fit where five did by planning each stand at about 1.6 × 1.0 m
 * (a standard table and a roll-up) instead of the earlier assumed 2.0 m — the
 * row keeps the same 8.6 m between the meal corridor and the east wall. All six
 * positions are provisional (`working`) until the venue approves the layout and
 * the footprints at setup.
 */
export const BIOCITY_STANDS: readonly PartnerStand[] = [
  {
    id: "bc-1",
    rank: 1,
    venue: "biocity",
    area: PARTNER_CORNER,
    location: "First in the partner row, by the corridor to the meals",
    visibility: "Everyone walking between the build hall, the meals and the Aulagalleria passes it.",
    partnerId: "red-hat",
    hotspotId: "stand-bc-1",
    status: "working",
  },
  {
    id: "bc-2",
    rank: 2,
    venue: "biocity",
    area: PARTNER_CORNER,
    location: "Facing the build hall, by the passage to Joki",
    visibility: "On the main walkway between the build tables and Joki.",
    partnerId: "solita",
    hotspotId: "stand-bc-2",
    status: "working",
  },
  {
    id: "bc-3",
    rank: 3,
    venue: "biocity",
    area: PARTNER_CORNER,
    location: "Second in the partner row",
    visibility: "In the partner row, facing the build hall's walkway.",
    partnerId: "pruna-ai",
    hotspotId: "stand-bc-3",
    status: "working",
  },
  {
    id: "bc-4",
    rank: 4,
    venue: "biocity",
    area: PARTNER_CORNER,
    location: "Third in the partner row, in the middle",
    visibility: "In the partner row, facing the build hall's walkway.",
    partnerId: "bearingpoint",
    hotspotId: "stand-bc-4",
    status: "working",
  },
  {
    id: "bc-5",
    rank: 5,
    venue: "biocity",
    area: PARTNER_CORNER,
    location: "Fourth in the partner row",
    visibility: "In the partner row, facing the build hall's walkway.",
    partnerId: "csc-lumi",
    hotspotId: "stand-bc-5",
    status: "working",
  },
  {
    id: "bc-6",
    rank: 6,
    venue: "biocity",
    area: PARTNER_CORNER,
    location: "Fifth in the partner row, at the corner's east wall",
    visibility: "In the partner row, facing the build hall's walkway.",
    partnerId: "mlh",
    hotspotId: "stand-bc-6",
    status: "working",
  },
] as const;

export function getStandPartner(stand: PartnerStand): EventPartner | undefined {
  return stand.partnerId ? STAND_PARTNERS.find((p) => p.id === stand.partnerId) : undefined;
}

export function standDisplayName(stand: PartnerStand): string {
  return getStandPartner(stand)?.name ?? OPEN_STAND_LABEL;
}
