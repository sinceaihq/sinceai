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

export const judges: Judge[] = [
  {
    name: "Eshaan Jain",
    title: "Senior Product Manager",
    organization: "Mphasis (client: T-Mobile)",
    bio: [
      "Eshaan Jain has over 13 years of experience across AI/ML, Quote-to-Cash (CPQ), and Contract Lifecycle Management (CLM). As Salesforce Product Owner at T-Mobile via Mphasis, he leads product strategy for the company's national B2B, Government, and Education platforms. He previously spent five years at Amazon as a Salesforce Technical Product Manager, responsible for the Global Supply Chain Transportation Procurement platform and the digital transformation of Amazon's last-mile transportation contract lifecycle, following earlier roles at PwC and Accenture.",
      "He is a 5x Salesforce Certified professional, a two-time nominated Dreamforce speaker, and has published three peer-reviewed papers with IEEE and Elsevier. He holds an MS in Computer Science from the University of Southern California and a B.Tech in Computer Science from GGSIPU, Delhi.",
    ],
    highlights: [
      "13 years",
      "Amazon",
      "T-Mobile",
      "Mphasis",
      "PwC",
      "Accenture",
      "Dreamforce",
      "IEEE",
      "Elsevier",
      "University of Southern California",
    ],
    image: "/assets/judges/eshaan-jain.webp",
    links: [
      { label: "LinkedIn", url: "https://www.linkedin.com/in/eshaanjain26/" },
      { label: "Google Scholar", url: "https://scholar.google.com/citations?user=XA_-VzAAAAAJ&hl=en" },
      { label: "Medium", url: "https://medium.com/@eshaanjain26" },
    ],
  },
];
