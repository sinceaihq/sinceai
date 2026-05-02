/**
 * Centralized organization constants
 * Single source of truth for Since AI entity information
 */

export const ORG = {
  name: "Since AI",
  legalName: "Since AI ry",
  businessId: "3593920-2",
  baseUrl: "https://sinceai.ai",
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
    discord: "https://discord.com/invite/YkqJswRGSW",
    telegram: "https://t.me/sinceaihq",
    linkedin: "https://www.linkedin.com/company/sinceai",
    instagram: "https://www.instagram.com/sinceaihq",
    x: "https://x.com/sinceaihq",
    github: "https://github.com/sinceaihq",
    facebook: "https://www.facebook.com/sinceai",
    youtube: "https://www.youtube.com/@sinceaihq",
    tiktok: "https://www.tiktok.com/@sinceaihq",
    medium: "https://medium.com/@sinceai",
    substack: "https://sinceai.substack.com",
    reddit: "https://www.reddit.com/r/SinceAI/",
  },
  stats: {
    members: "1000+",
    hackathonParticipants: "200+",
    projects: "30+",
    partners: "15+",
  },
} as const;

export default ORG;
