/**
 * The judging panel of Since AI Hackathon 2026: five judges who select the
 * overall winner at the Sunday finals. This is separate from the company
 * challenge evaluation, which each challenge company does for its own challenge.
 *
 * All five places are confirmed (organiser, 26 Oct 2026); a place still open
 * would show "to be announced". Titles match the judges' own organisations'
 * descriptions, and their organisations are judges' employers, not event sponsors.
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

/** Size of the panel; any open place renders as "to be announced". */
export const JUDGE_PANEL_SIZE = 5;

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
  {
    name: "Rasmus Harmaala",
    // Inovexus' own description of him (organiser handoff, 26 Oct 2026). Judge place accepted 23 Jun,
    // in-person attendance on Sunday 8 Nov confirmed 26 Oct. A judge, not a sponsor.
    title: "Deep Tech Investor & Founder",
    organization: "Inovexus",
    organizationUrl: "https://inovexus.com/",
    profiles: [{ kind: "linkedin", url: "https://www.linkedin.com/in/rasmus-harmaala/" }],
    bio: "Deep tech investor and founder at Inovexus, bringing early-stage investing, founder potential and commercial viability expertise to the final jury.",
    // Portrait supplied by the organiser for the website (26 Oct 2026).
    portrait: {
      src: "/assets/judges/rasmus-harmaala.webp",
      alt: "Portrait of Rasmus Harmaala, deep tech investor at Inovexus",
    },
  },
  {
    name: "Chandra Challagonda",
    // CEO of FIWARE Foundation (organiser, 26 Oct 2026; fiware.org/governance/team). A judge only:
    // FIWARE's open-track terms are separate and stay unpublished until confirmed.
    title: "Chief Executive Officer",
    organization: "FIWARE Foundation",
    organizationUrl: "https://fiware.org/",
    profiles: [{ kind: "linkedin", url: "https://www.linkedin.com/in/challagonda/" }],
    bio: "CEO of FIWARE Foundation, advancing open, sovereign data ecosystems for trustworthy AI and bringing real-world innovation expertise across cities, industry, energy and agriculture.",
    // Portrait supplied by the organiser (26 Oct 2026), converted to WebP without other changes.
    portrait: {
      src: "/assets/judges/chandra-challagonda.webp",
      alt: "Portrait of Chandra Challagonda, CEO of FIWARE Foundation",
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
