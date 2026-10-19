/**
 * The default social card. A page that sets its own `openGraph` or `twitter`
 * object replaces the root one entirely (Next.js does not merge them), so
 * every such page passes this explicitly — otherwise its links share without
 * an image.
 */
export const OG_IMAGE = {
  url: "https://sinceai.ai/assets/og/sinceai.png",
  width: 1200,
  height: 630,
  alt: "Since AI — where frontier AI becomes shipped products: 10,000+ AI builders in 120+ countries",
} as const;
