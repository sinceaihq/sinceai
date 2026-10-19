/**
 * The default social card. A page that sets its own `openGraph` or `twitter`
 * object replaces the root one entirely (Next.js does not merge them), so
 * every such page passes this explicitly — otherwise its links share without
 * an image.
 */
export const OG_IMAGE = {
  url: "https://sinceai.ai/assets/og/hero.png",
  width: 1200,
  height: 630,
  alt: "Since AI — Global execution-focused AI innovation ecosystem",
} as const;
