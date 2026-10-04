import { CHALLENGE_COMPANIES } from "./companies";

/**
 * Logos for the 3D campus's textures (trimmed white PNGs in
 * public/assets/guide/3d/logos/). Companies without an approved logo render
 * as name lettering.
 */
export const LOGOS_3D: Readonly<Record<string, string>> = Object.fromEntries(
  [...CHALLENGE_COMPANIES.filter((c) => c.logo).map((c) => c.id), "solita"].map((id) => [
    id,
    `/assets/guide/3d/logos/${id}.png`,
  ]),
);
