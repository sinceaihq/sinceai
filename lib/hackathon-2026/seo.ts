import type { Metadata } from "next";
import { GUIDE_BASE_URL } from "./facts";
import { GUIDE_HEADER_SOURCES, GUIDE_X_ROBOTS_TAG } from "./route";

export { GUIDE_HEADER_SOURCES, GUIDE_X_ROBOTS_TAG };

/**
 * The Field Guide is public by direct link but must stay out of search.
 * Three layers, so no single one is load-bearing:
 *   1. `<meta name="robots">` + `googlebot` + `bingbot` (this file)
 *   2. `X-Robots-Tag` response header for the route family (next.config.ts)
 *   3. Exclusion from app/sitemap.ts
 * robots.txt deliberately does NOT disallow the route — crawlers must be able
 * to fetch the page to see the noindex.
 */
export const GUIDE_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
};

const OG_IMAGE = {
  url: "/assets/guide/og-field-guide.jpg",
  width: 1200,
  height: 630,
  alt: "Since AI Hackathon 2026 Field Guide — the Joki Showroom in event lighting",
};

export function guideMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  /** Path below the guide root, e.g. "/builders". Empty for the hub. */
  path: string;
}): Metadata {
  const url = `${GUIDE_BASE_URL}${path}`;
  const fullTitle = `${title} | Since AI Hackathon 2026`;
  return {
    title: fullTitle,
    description,
    robots: GUIDE_ROBOTS,
    other: { bingbot: "noindex, nofollow" },
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: "Since AI",
      locale: "en_US",
      type: "website",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
