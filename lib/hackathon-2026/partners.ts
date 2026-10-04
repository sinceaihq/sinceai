import type { EventPartner, PartnerStand } from "./types";

/**
 * Visibility / tech partners with a BioCity stand.
 *
 * Organiser decision (3 Oct 2026): Red Hat takes the most visible stand,
 * Solita the second. No other stand partners for now — the remaining stands
 * stay in the plan as open "Visibility / Tech Partner stand" positions.
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
] as const;

/** Label used for every stand position that has no partner yet. */
export const OPEN_STAND_LABEL = "Visibility / Tech Partner stand";

/**
 * BioCity stand positions, ranked by visibility. Positions follow the main
 * pedestrian flows: the event entrance + route to meals (Aulagalleria) and the
 * build hall's connection to Joki. Footprints are confirmed with the venue at
 * setup so that exit routes stay clear.
 */
export const BIOCITY_STANDS: readonly PartnerStand[] = [
  {
    id: "bc-1",
    rank: 1,
    venue: "biocity",
    area: "Aulagalleria",
    location: "Facing the event entrance",
    visibility: "The first stand everyone sees when entering BioCity, on the route to every meal.",
    partnerId: "red-hat",
    hotspotId: "stand-bc-1",
    status: "confirmed",
  },
  {
    id: "bc-2",
    rank: 2,
    venue: "biocity",
    area: "Main lobby · south-east end",
    location: "Where the build hall meets the passage to Joki",
    visibility: "Next to the main build tables and on the walking route between BioCity and Joki.",
    partnerId: "solita",
    hotspotId: "stand-bc-2",
    status: "confirmed",
  },
  {
    id: "bc-3",
    rank: 3,
    venue: "biocity",
    area: "Aulagalleria",
    location: "West side of the event entrance",
    visibility: "At the event entrance, opposite Stand 1.",
    partnerId: null,
    hotspotId: "stand-bc-3",
    status: "working",
  },
  {
    id: "bc-4",
    rank: 4,
    venue: "biocity",
    area: "Main lobby · west end",
    location: "Opposite end of the build hall",
    visibility: "Faces the build tables from the west end of the main lobby.",
    partnerId: null,
    hotspotId: "stand-bc-4",
    status: "working",
  },
] as const;

export function getStandPartner(stand: PartnerStand): EventPartner | undefined {
  return stand.partnerId ? STAND_PARTNERS.find((p) => p.id === stand.partnerId) : undefined;
}

export function standDisplayName(stand: PartnerStand): string {
  return getStandPartner(stand)?.name ?? OPEN_STAND_LABEL;
}
