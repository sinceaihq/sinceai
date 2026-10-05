import type { EventPartner, PartnerStand } from "./types";

/**
 * Visibility / tech partners with a physical BioCity stand.
 *
 * Organiser decision (6 Oct 2026): every visibility / tech partner stand is in
 * one partner corner — the south-east corner of BioCity's main lobby, where
 * Solita's stand already was. The corner has room for about five stands;
 * Red Hat, Solita and Pruna AI are confirmed. A technology partnership or an
 * onsite speaker does not mean a stand: add a partner here only when its
 * physical stand is confirmed.
 *
 * Red Hat has no approved logo file in the repository yet; drop the approved
 * file into /public/assets/sponsors and set `logo` here to show it everywhere
 * (cards, map, 3D).
 */
export const STAND_PARTNERS: readonly EventPartner[] = [
  {
    id: "red-hat",
    name: "Red Hat",
    url: "https://www.redhat.com/",
    category: "visibility-tech",
    status: "confirmed",
  },
  {
    id: "solita",
    name: "Solita",
    logo: { src: "/assets/sponsors/solita.png", width: 1216, height: 285 },
    url: "https://www.solita.fi/",
    category: "visibility-tech",
    status: "confirmed",
  },
  {
    id: "pruna-ai",
    name: "Pruna AI",
    logo: { src: "/assets/sponsors/Pruna.svg", width: 608, height: 181 },
    url: "https://www.pruna.ai/",
    category: "visibility-tech",
    status: "confirmed",
  },
] as const;

/** Label used for every stand position that has no partner yet. */
export const OPEN_STAND_LABEL = "Visibility / Tech Partner stand";

/** The partner corner: where every visibility / tech partner stand is. */
export const PARTNER_CORNER = "Main lobby · partner corner";

/**
 * The partner corner's stand positions, ranked by visibility: a row of four
 * along the corner's north-east side facing the build hall's walkway, and
 * Solita's position facing the hall by the passage to Joki. The corridor to
 * the meals and the Aulagalleria, the walkway to Joki and the corner's side
 * door stay clear. Footprints are confirmed with the venue at setup.
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
    status: "confirmed",
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
    status: "confirmed",
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
    status: "confirmed",
  },
  {
    id: "bc-4",
    rank: 4,
    venue: "biocity",
    area: PARTNER_CORNER,
    location: "Third in the partner row",
    visibility: "In the partner row, facing the build hall's walkway.",
    partnerId: null,
    hotspotId: "stand-bc-4",
    status: "working",
  },
  {
    id: "bc-5",
    rank: 5,
    venue: "biocity",
    area: PARTNER_CORNER,
    location: "Fourth in the partner row, at the corner's east wall",
    visibility: "In the partner row, facing the build hall's walkway.",
    partnerId: null,
    hotspotId: "stand-bc-5",
    status: "working",
  },
] as const;

export function getStandPartner(stand: PartnerStand): EventPartner | undefined {
  return stand.partnerId ? STAND_PARTNERS.find((p) => p.id === stand.partnerId) : undefined;
}

export function standDisplayName(stand: PartnerStand): string {
  return getStandPartner(stand)?.name ?? OPEN_STAND_LABEL;
}
