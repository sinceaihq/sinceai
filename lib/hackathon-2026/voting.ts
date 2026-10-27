/**
 * Participant voting and the five finalists — Since AI Hackathon 2026.
 * The one place for how voting works and how the finalists are chosen.
 *
 * Organiser decisions, 27 Oct 2026:
 * - 20 required pairwise comparisons per eligible participant (was ten), in
 *   sinceai.app, Sunday 10:00–12:00. Every eligible builder is asked to
 *   complete them; no penalty is published.
 * - The five finalists are the five highest-ranked eligible projects from five
 *   DIFFERENT official company challenges: down the ranking, a project whose
 *   challenge is already represented is skipped. Not simply the top five.
 * - Optional award-only entries (a separate FIWARE prototype) never enter the
 *   ranking or the finalists.
 */

export const VOTE_COMPARISONS = 20;
export const FINALIST_COUNT = 5;

export const VOTING = {
  window: "Sunday 10:00–12:00",
  /** Short form for timelines. */
  short: `${VOTE_COMPARISONS} comparisons in sinceai.app`,
  how: `Between 10:00 and 12:00 on Sunday, sinceai.app shows every eligible builder — an accepted participant of the event — two solutions at a time — pick the stronger one. Every eligible builder is asked to complete ${VOTE_COMPARISONS} comparisons; you never see your own team's project.`,
  finalists:
    "Voting closes at 12:00. The five finalists are the five highest-ranked eligible projects from five different official company challenges — one per challenge, so it is not simply the overall top five.",
  /** One line for a schedule row or fact strip. */
  finalistsShort: "The five highest-ranked projects from five different company challenges.",
} as const;
