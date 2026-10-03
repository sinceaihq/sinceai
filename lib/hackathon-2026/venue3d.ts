import { CHALLENGE_COMPANIES, SHOWROOM_ORDER, getCompany } from "./companies";
import { BIOCITY_STANDS, getStandPartner, OPEN_STAND_LABEL } from "./partners";

/**
 * 3D preview metadata (UI side). Geometry lives in the engine; everything a
 * person reads — titles, view names, focus targets and the text alternative —
 * is derived from the same data as the rest of the guide.
 */
export type Scene3DId = "showroom" | "joki-tower" | "biocity";

export interface Scene3DMeta {
  id: Scene3DId;
  tab: string;
  title: string;
  caption: string;
  /** Accessible description of the canvas. */
  alt: string;
  poster: string;
  views: readonly { id: string; label: string }[];
  /** Things you can fly to — companies, stands, areas. */
  targets: readonly { id: string; label: string; detail: string; href?: string }[];
}

const companyHref = (id: string) => `/hackathon-2026/guide/challenge-partners/${id}`;

function companyTargets(floor: 1 | 2 | 3) {
  const list =
    floor === 1
      ? SHOWROOM_ORDER.map((id) => getCompany(id)!)
      : CHALLENGE_COMPANIES.filter((c) => c.qa.floor === floor);
  return list.map((c) => ({
    id: c.id,
    label: c.name,
    detail: floor === 1 ? "Joki floor 1 · Showroom" : `Joki floor ${floor}`,
    href: companyHref(c.id),
  }));
}

export const SCENES_3D: readonly Scene3DMeta[] = [
  {
    id: "showroom",
    tab: "Showroom",
    title: "Joki Showroom · challenge partner Q&A",
    caption:
      "Six partner counters with bar stools along the curved 22.5-metre LED wall, lit low with violet light. The Company Lounge is behind the stairs.",
    alt: "Illustrative 3D view of the Joki Showroom: a round, dark room with a curved LED wall showing six partner logos — Meyer Turku, DNA, Apetit, Elisa, Turku Energia and Bayer — each above a black counter with two bar stools, violet light along the base of the wall and stairs on the right.",
    poster: "/assets/guide/3d/showroom-poster.webp",
    views: [
      { id: "entrance", label: "From the entrance" },
      { id: "overview", label: "Top view" },
      { id: "lounge", label: "Company Lounge" },
    ],
    targets: [
      ...companyTargets(1),
      { id: "lounge", label: "Company Lounge", detail: "Amphitheatre next to the Showroom" },
    ],
  },
  {
    id: "joki-tower",
    tab: "Joki Q&A floors",
    title: "Joki tower · floors 1–3",
    caption:
      "The three Q&A floors pulled apart: Showroom and Company Lounge on floor 1, three partners and a Chill Zone on floor 2, six partners on floor 3.",
    alt: "Illustrative exploded 3D view of the round Joki tower: floor 1 with the Showroom LED wall and six counters, floor 2 with Revvity, Valmet and Traficom and a Chill Zone, floor 3 with Lindström, Bo LKV, Takomo, Forcit Group, Saarioinen and Business Turku.",
    poster: "/assets/guide/3d/joki-tower-poster.webp",
    views: [
      { id: "exploded", label: "All floors" },
      { id: "floor-1", label: "Floor 1" },
      { id: "floor-2", label: "Floor 2" },
      { id: "floor-3", label: "Floor 3" },
    ],
    targets: [...companyTargets(1), ...companyTargets(2), ...companyTargets(3)],
  },
  {
    id: "biocity",
    tab: "BioCity build hall",
    title: "BioCity · build hall and partner stands",
    caption:
      "The main lobby set for building — 56 tables and 280 seats in the current furniture plan — with the visibility and tech partner stands by the event entrance and at the Joki connection.",
    alt: "Illustrative 3D view of BioCity's ground floor: the long main lobby filled with four rows of work tables, the curved Aulagalleria with the event entrance, Red Hat's stand facing the entrance, Solita's stand at the east end of the lobby by the passage to Joki, and two open visibility and tech partner stands.",
    poster: "/assets/guide/3d/biocity-poster.webp",
    views: [
      { id: "overview", label: "Overview" },
      { id: "entrance", label: "Event entrance" },
      { id: "hall", label: "Build hall" },
    ],
    targets: BIOCITY_STANDS.map((stand) => {
      const partner = getStandPartner(stand);
      return {
        id: stand.id,
        label: `Stand ${stand.rank} · ${partner?.name ?? OPEN_STAND_LABEL}`,
        detail: `${stand.area} — ${stand.location}`,
        href: "/hackathon-2026/guide/partners#stands",
      };
    }),
  },
] as const;

export function getScene3D(id: Scene3DId): Scene3DMeta {
  const scene = SCENES_3D.find((s) => s.id === id);
  if (!scene) throw new Error(`Unknown 3D scene: ${id}`);
  return scene;
}

/** Which scene shows a given focus target first (deep links from other pages). */
export function sceneForTarget(target: string | null | undefined): Scene3DId {
  if (!target) return "showroom";
  if (target === "biocity" || BIOCITY_STANDS.some((s) => s.id === target || s.partnerId === target)) {
    return "biocity";
  }
  const company = getCompany(target);
  if (company && company.qa.floor !== 1) return "joki-tower";
  return "showroom";
}

/** Normalise a deep-link target: partner ids map to their stand. */
export function normaliseTarget(target: string | null | undefined): string | null {
  if (!target || target === "biocity") return null;
  const stand = BIOCITY_STANDS.find((s) => s.partnerId === target);
  return stand ? stand.id : target;
}

/** Logos for the 3D textures (trimmed white PNGs; companies without an approved logo render as text). */
export const LOGOS_3D: Readonly<Record<string, string>> = Object.fromEntries(
  [...CHALLENGE_COMPANIES.filter((c) => c.logo).map((c) => c.id), "solita"].map((id) => [
    id,
    `/assets/guide/3d/logos/${id}.png`,
  ]),
);
