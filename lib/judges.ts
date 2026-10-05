/**
 * Confirmed judges for Since AI Hackathon 2026.
 *
 * Bios and titles are used exactly as supplied by the judge — do not embellish
 * employer affiliations or add business-impact figures that were not provided.
 */

export interface JudgeLink {
  label: string;
  url: string;
}

export interface Judge {
  name: string;
  title: string;
  organization: string;
  /** Bio paragraphs, rendered in order. */
  bio: string[];
  /**
   * Substrings of `bio` to emphasise when rendered — notable employers,
   * institutions, and credentials. Matched literally, every occurrence.
   */
  highlights: string[];
  image: string;
  links: JudgeLink[];
}

export const judges: Judge[] = [];
