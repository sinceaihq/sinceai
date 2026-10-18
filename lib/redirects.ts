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
