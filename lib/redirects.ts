/**
 * Pages merged into a canonical page in the content audit of Oct 2026 (#28).
 * Each old URL answers with a permanent (308) redirect, so links and search
 * rankings carry over. Keep old paths here — never reuse them for new pages.
 */
export const CONSOLIDATED_ROUTES: readonly { source: string; destination: string }[] = [
  // /stats and /impact published the same metrics with conflicting numbers; /impact keeps the current set.
  { source: "/stats", destination: "/impact" },
  // /european-ai was a thin page beside /europe-ai; its open-source section now lives there.
  { source: "/european-ai", destination: "/europe-ai#open-source" },
];

/**
 * The final challenge place was shared as tba-2 until TrustED took it (1 Nov
 * 2026). Permanent, so old links keep working; the routes themselves are
 * generated from CHALLENGE_COMPANIES, which has no tba-2.
 */
export const GUIDE_ALIASES: readonly { source: string; destination: string }[] = [
  {
    source: "/hackathon-2026/guide/challenge-partners/tba-2",
    destination: "/hackathon-2026/guide/challenge-partners/trusted",
  },
  {
    source: "/hackathon-2026/guide/calendar/challenge-partners/tba-2",
    destination: "/hackathon-2026/guide/calendar/challenge-partners/trusted",
  },
];
