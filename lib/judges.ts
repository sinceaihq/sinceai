/**
 * The judging panel of Since AI Hackathon 2026: four judges who select the
 * overall winner at the Sunday finals. This is separate from the company
 * challenge evaluation, which each challenge company does for its own challenge.
 *
 * Only confirmed judges are listed (organiser, Oct 2026); the remaining places
 * show "to be announced". Titles match the judges' own organisations' pages,
 * and their organisations are judges' employers, not event sponsors.
 */

export interface JudgePortrait {
  src: string;
  alt: string;
  /** Photographer or source credit, shown on the photo when the source asks for one. */
  credit?: string;
}

export interface Judge {
  name: string;
  title: string;
  organization: string;
  organizationUrl: string;
  /** Verified professional profile. */
  profileUrl: string;
  /** One sentence, no credentials beyond what the judge's organisation states. */
  bio: string;
  /**
   * Only an image the person or their organisation provides for reuse.
   * Without one, the card shows the judge's initials.
   */
  portrait?: JudgePortrait;
}

/** Planned size of the panel; open places render as "to be announced". */
export const JUDGE_PANEL_SIZE = 4;

export const judges: Judge[] = [
  {
    name: "Sarita Runeberg",
    title: "Chief Executive Officer",
    organization: "Maria 01",
    organizationUrl: "https://maria.io/",
    profileUrl: "https://www.linkedin.com/in/saritaruneberg/",
    bio: "CEO of Maria 01, one of the Nordics' leading startup campuses, bringing expertise in entrepreneurship, startup ecosystems and scaling innovation.",
    // Portrait chosen by the organiser for the event (PR #83, 18 Oct 2026).
    portrait: {
      src: "/assets/judges/sarita-runeberg.webp",
      alt: "Portrait of Sarita Runeberg, CEO of Maria 01",
    },
  },
  {
    name: "Niko Elers",
    title: "Investment Director",
    organization: "Voima Ventures",
    organizationUrl: "https://voimaventures.com/",
    profileUrl: "https://www.linkedin.com/in/niko-elers-7a87a941/",
    bio: "Investment Director at Voima Ventures, focused on early-stage deep tech, science-driven innovation and venture investing.",
    // Voima Ventures' official team photo (voimaventures.com/get-in-touch), chosen by the organiser (PR #83).
    portrait: {
      src: "/assets/judges/niko-elers.webp",
      alt: "Portrait of Niko Elers, Investment Director at Voima Ventures",
      credit: "Photo: Voima Ventures",
    },
  },
];

/** "Sarita Runeberg" → "SR" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}
