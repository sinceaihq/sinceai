/**
 * Confidential company challenges — what builders must know. FORCIT Group's
 * Drill and Blast Cycle Intelligence requires a confidentiality agreement (NDA)
 * before its detailed industrial dataset is shared (organiser, 27 Oct 2026).
 *
 * Organiser, 3 Nov 2026: the NDA is signed on paper with a FORCIT representative
 * on site, during FORCIT's challenge briefing on Friday, before any access to
 * the data. Only after FORCIT has accepted the NDA does it give personal API
 * credentials (username and password) for FORCIT's own API — FORCIT's data,
 * FORCIT's access. No credential or protected data is ever published on the
 * website, in the public challenge summary, in a repository or on Discord.
 *
 * sinceai.app never collects signatures, NDA documents or FORCIT's credentials —
 * event staff only record that a participant is covered, by whom and when, and
 * that record opens FORCIT's materials in sinceai.app.
 */

export const CONFIDENTIAL_CHALLENGE = {
  company: "FORCIT Group",
  challenge: "Drill and Blast Cycle Intelligence",
} as const;

export const CONFIDENTIAL_RULES = [
  {
    title: "Paper NDA with FORCIT, on site",
    text: "You sign FORCIT's NDA on paper with a FORCIT representative during its challenge briefing on Friday, before any access to the data. Choosing the challenge is not signing an NDA, and nothing is signed online.",
  },
  {
    title: "Every member who receives the data is covered",
    text: "Each team member who receives FORCIT's restricted data must sign. FORCIT's materials in sinceai.app open for a member once event staff have recorded their signed NDA.",
  },
  {
    title: "FORCIT's own data and access",
    text: "Only after FORCIT has accepted your NDA does it give you personal credentials (username and password) for FORCIT's own API. The data stays in FORCIT's system — never sent by email, chat or a public link — and credentials and data never go into code, repositories, Discord, screenshots or videos.",
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
