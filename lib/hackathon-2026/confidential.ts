/**
 * Confidential company challenges — what builders must know. FORCIT Group's
 * Drill and Blast Cycle Intelligence requires a confidentiality agreement (NDA)
 * before its detailed industrial dataset is shared (organiser, 27 Oct 2026).
 *
 * The NDA is FORCIT's own paper agreement, signed on site; sinceai.app never
 * collects signatures or NDA documents — event staff only record that a
 * participant is covered, by whom and when.
 */

export const CONFIDENTIAL_CHALLENGE = {
  company: "FORCIT Group",
  challenge: "Drill and Blast Cycle Intelligence",
} as const;

export const CONFIDENTIAL_RULES = [
  {
    title: "Paper NDA, signed on site",
    text: "FORCIT supplies and handles the paper NDA forms at the event. Choosing the challenge is not signing an NDA, and nothing is signed online.",
  },
  {
    title: "Every member who receives the data is covered",
    text: "Each team member who receives FORCIT's restricted data must sign. Access is given only after event staff have verified your NDA.",
  },
  {
    title: "Data stays in FORCIT's system",
    text: "The detailed dataset is provided through FORCIT's approved, controlled system — never by email, chat or a public link.",
  },
  {
    title: "Nothing confidential goes public",
    text: "No restricted data in public GitHub repositories, demo videos, screenshots or the evidence for MLH, Red Hat or FIWARE awards — unless FORCIT has given explicit permission.",
  },
  {
    title: "A public-safe summary for everyone else",
    text: "Add a public-safe summary to your submission in sinceai.app. Voters and the public see only that summary, your project name and team. Optional-award reviewers see only public-safe material — that summary and award evidence that contains nothing restricted — unless the organisers clear more with FORCIT. FORCIT's evaluators and the organisers see the full submission.",
  },
] as const;

export const CONFIDENTIAL_NOTE =
  "Company-specific NDA rules always override the sharing an optional award asks for. Unsure? Ask FORCIT's representatives or event staff before you share anything.";
