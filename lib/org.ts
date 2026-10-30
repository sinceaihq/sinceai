/**
 * Centralized organization constants
 * Single source of truth for Since AI entity information
 */

export const ORG = {
  name: "Since AI",
  legalName: "Since AI ry",
  businessId: "3593920-2",
  /**
   * Public-benefit mission shown on /about and in Organization JSON-LD.
   * Written for nonprofit program review (education, community benefit, not-for-profit).
   */
  mission: {
    heading: "Our nonprofit mission",
    purpose:
      "Since AI ry is a Finnish nonprofit association whose mission is to advance AI education, practical skills, technological literacy, and open collaboration for the broader community.",
    programs:
      "We create accessible opportunities for students, researchers, developers, and other members of the community to learn about artificial intelligence, develop practical skills, and collaborate on real-world technology projects through educational programs, hackathons, workshops, and community initiatives.",
    notForProfit:
      "Since AI ry operates on a not-for-profit basis. Its activities are carried out to advance its nonprofit mission and broader community benefit rather than to generate private financial benefit for members or leadership.",
  },
  baseUrl: "https://sinceai.ai",
  /** Square logo for structured data — dark on transparent, so it reads on white backgrounds (Google's requirement). */
  logoUrl: `https://sinceai.ai/assets/logo/${encodeURIComponent("SINCE AI black.png")}`,
  location: {
    city: "Turku",
    country: "Finland",
    countryCode: "FI",
  },
  contact: {
    infoEmail: "info@sinceai.fi",
    generalEmail: "riku.lauttia@sinceai.fi",
    partnershipEmail: "aarne.ollila@sinceai.fi",
  },
  social: {
    discord: "https://discord.gg/vMWdrVUPws",
    telegram: "https://t.me/sinceaihq",
    linkedin: "https://www.linkedin.com/company/sinceai",
    instagram: "https://www.instagram.com/sinceaihq",
    x: "https://x.com/sinceaihq",
    github: "https://github.com/sinceaihq",
    /** Open models, datasets and demo Spaces from Since AI research. */
    huggingface: "https://huggingface.co/sinceaihq",
    facebook: "https://www.facebook.com/sinceai",
    youtube: "https://www.youtube.com/@sinceaihq",
    tiktok: "https://www.tiktok.com/@sinceaihq",
    substack: "https://sinceai.substack.com",
    reddit: "https://www.reddit.com/r/SinceAI/",
  },
  /**
   * Published metrics — the /impact page explains how each is counted.
   * Last updated 18 Sep 2026 (#65), countries 19 Oct 2026; change them here and on /impact together.
   */
  stats: {
    lastUpdated: "September 2026",
    network: "10,000+",
    members: "1,000+",
    hackathonParticipants: "260",
    hackathon2026Target: "1,000+",
    /** 109 organisations in lib/partners.ts (challenge, strategic, capital, research and community partners). */
    partners: "100+",
    projects: "100+",
    /** 123 countries on sinceai.app profiles, 92 among Hackathon 2026 applicants (lib/reach.ts, 19 Oct 2026). */
    countries: "120+",
  },
} as const;

export default ORG;
