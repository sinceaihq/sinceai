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

/** Where a profile link points; decides its icon and accessible name. */
export type JudgeProfileKind = "linkedin" | "university" | "scholar";

export interface JudgeProfile {
  kind: JudgeProfileKind;
  url: string;
}

export interface Judge {
  name: string;
  title: string;
  organization: string;
  organizationUrl: string;
  /** Verified professional profiles, shown in this order. */
  profiles: JudgeProfile[];
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
    profiles: [{ kind: "linkedin", url: "https://www.linkedin.com/in/saritaruneberg/" }],
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
    profiles: [{ kind: "linkedin", url: "https://www.linkedin.com/in/niko-elers-7a87a941/" }],
    bio: "Investment Director at Voima Ventures, focused on early-stage deep tech, science-driven innovation and venture investing.",
    // Voima Ventures' official team photo (voimaventures.com/get-in-touch), chosen by the organiser (PR #83).
    portrait: {
      src: "/assets/judges/niko-elers.webp",
      alt: "Portrait of Niko Elers, Investment Director at Voima Ventures",
      credit: "Photo: Voima Ventures",
    },
  },
  {
    name: "Tuomas Mäkilä",
    // Title and research areas as on his University of Turku profile (Oct 2026).
    title: "Associate Professor, Software Engineering",
    organization: "University of Turku",
    organizationUrl: "https://www.utu.fi/en",
    profiles: [
      { kind: "linkedin", url: "https://www.linkedin.com/in/mckila/" },
      { kind: "university", url: "https://www.utu.fi/en/people/tuomas-makila" },
      { kind: "scholar", url: "https://scholar.google.com/citations?user=fhE_eJYAAAAJ" },
    ],
    bio: "Head of the Software Engineering major at the University of Turku, researching software development processes and, most recently, AI agents and LLM-generated code.",
    // His University of Turku profile photo, chosen by the organiser (Oct 2026).
    portrait: {
      src: "/assets/judges/tuomas-makila.webp",
      alt: "Portrait of Tuomas Mäkilä, Associate Professor at the University of Turku",
      credit: "Photo: University of Turku",
    },
  },
];

const PROFILE_SITE: Record<JudgeProfileKind, (judge: Judge) => string> = {
  linkedin: () => "LinkedIn",
  scholar: () => "Google Scholar",
  university: (judge) => `the ${judge.organization} website`,
};

/** Accessible name of a profile link: "Niko Elers on LinkedIn". */
export function profileLabel(judge: Judge, profile: JudgeProfile): string {
  return `${judge.name} on ${PROFILE_SITE[profile.kind](judge)}`;
}

/** "Sarita Runeberg" → "SR" */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}
