/**
 * Route constants for the Field Guide. Dependency-free on purpose: this file is
 * imported by next.config.ts.
 */
export const GUIDE_BASE_PATH = "/hackathon-2026/guide";

/** Response header value for the whole route family. */
export const GUIDE_X_ROBOTS_TAG = "noindex, nofollow, noimageindex";

/** Static assets that belong to the guide (maps, 3D posters) — never indexed. */
export const GUIDE_ASSET_PATH = "/assets/guide";

/**
 * `headers()` source patterns: the hub, every page below it and the guide's
 * static assets. On Cloudflare the assets bypass the worker, so
 * public/_headers repeats the asset rule.
 */
export const GUIDE_HEADER_SOURCES = [
  GUIDE_BASE_PATH,
  `${GUIDE_BASE_PATH}/:path*`,
  `${GUIDE_ASSET_PATH}/:path*`,
] as const;

/** The bare event path is a common truncation of shared links — send it to the hub. */
export const GUIDE_PARENT_PATH = "/hackathon-2026";
