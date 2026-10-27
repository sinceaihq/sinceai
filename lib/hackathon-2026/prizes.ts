/**
 * Company challenge prizes — Since AI Hackathon 2026. The one place to change
 * a prize amount; every sentence about the company prizes is built from it.
 *
 * Organiser, 26–27 Oct 2026:
 * - Every other company challenge awards its top three teams €2,000, €750 and €250.
 * - FORCIT Group's Drill and Blast Cycle Intelligence is the one exception: a
 *   €5,000 prize pot split €3,000 / €1,500 / €500. Its written confirmation is
 *   still pending, so it is published as "to be confirmed in writing", never as
 *   an executed contractual term.
 *
 * The advertised prize pool (app/hackathon) is not derived from here; any
 * change to it is the organiser's decision.
 */

export interface PrizeSplit {
  first: number;
  second: number;
  third: number;
}

export const STANDARD_CHALLENGE_PRIZES: PrizeSplit = { first: 2_000, second: 750, third: 250 };

export interface PrizeException {
  /** CHALLENGE_COMPANIES id. */
  companyId: string;
  company: string;
  challenge: string;
  prizes: PrizeSplit;
  /** "pending" = organiser-approved, written confirmation still to come. */
  confirmation: "confirmed" | "pending";
}

export const CHALLENGE_PRIZE_EXCEPTIONS: readonly PrizeException[] = [
  {
    companyId: "forcit-group",
    company: "FORCIT Group",
    challenge: "Drill and Blast Cycle Intelligence",
    prizes: { first: 3_000, second: 1_500, third: 500 },
    confirmation: "pending",
  },
];

export const prizeTotal = (p: PrizeSplit) => p.first + p.second + p.third;

/** "€2,000" */
export const formatEur = (amount: number) => `€${amount.toLocaleString("en-GB")}`;

/** "€2,000, €750 and €250" */
export const formatSplit = (p: PrizeSplit) => `${formatEur(p.first)}, ${formatEur(p.second)} and ${formatEur(p.third)}`;

export function prizesFor(companyId: string): { prizes: PrizeSplit; exception?: PrizeException } {
  const exception = CHALLENGE_PRIZE_EXCEPTIONS.find((e) => e.companyId === companyId);
  return exception ? { prizes: exception.prizes, exception } : { prizes: STANDARD_CHALLENGE_PRIZES };
}

const exceptionText = (e: PrizeException) =>
  `${e.company}'s ${e.challenge}: ${formatSplit(e.prizes)}, a ${formatEur(prizeTotal(e.prizes))} prize pot${
    e.confirmation === "pending" ? " to be confirmed in writing" : ""
  }`;

/**
 * The one statement on the company challenge prizes, used everywhere the
 * challenges or prizes come up. Replaces the earlier "all 15 offer the same
 * cash prize", which stopped being true with FORCIT's prize pot.
 */
export const CHALLENGE_PRIZES_STATEMENT = `Each company challenge awards its top three teams ${formatSplit(
  STANDARD_CHALLENGE_PRIZES,
)} in cash — except ${CHALLENGE_PRIZE_EXCEPTIONS.map(exceptionText).join("; ")}.`;

/** One line for a company card or logo grid. */
export function prizeLine(companyId: string): string {
  const { prizes, exception } = prizesFor(companyId);
  const split = `${formatEur(prizes.first)} / ${formatEur(prizes.second)} / ${formatEur(prizes.third)}`;
  return exception?.confirmation === "pending" ? `${split} (to be confirmed in writing)` : split;
}
