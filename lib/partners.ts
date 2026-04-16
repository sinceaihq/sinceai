export interface Partner {
  name: string;
  logo: string;
  url: string;
  /**
   * Display tier used for homepage 3-tier partner section.
   * 1 = Strategic Partners
   * 2 = Capital & Research Partners
   * 3 = Community Supporters
   */
  tier: 1 | 2 | 3;
}

export const PARTNERS: Partner[] = [
  // ─── Tier 1: Strategic Partners ────────────────────────────────────────────
  {
    name: "Google For Developers",
    logo: "/assets/sponsors/GoogleForDevelopers.png",
    url: "https://developers.google.com/",
    tier: 1,
  },
  {
    name: "ElevenLabs",
    logo: "/assets/sponsors/elevenlabs.png",
    url: "https://elevenlabs.io/",
    tier: 1,
  },
  {
    name: "Aiven",
    logo: "/assets/sponsors/aiven.png",
    url: "https://aiven.io/",
    tier: 1,
  },
  {
    name: "Lovable",
    logo: "/assets/sponsors/lovable.png",
    url: "https://lovable.dev/",
    tier: 1,
  },
  {
    name: "n8n",
    logo: "/assets/sponsors/n8n.svg",
    url: "https://n8n.io/",
    tier: 1,
  },
  {
    name: "Bayer",
    logo: "/assets/sponsors/Bayer.svg",
    url: "https://www.bayer.com/",
    tier: 1,
  },
  {
    name: "Sandvik",
    logo: "/assets/sponsors/sandvik.png",
    url: "https://www.sandvik.com/",
    tier: 1,
  },
  {
    name: "Kongsberg",
    logo: "/assets/sponsors/kongsberg.png",
    url: "https://www.kongsberg.com/",
    tier: 1,
  },
  {
    name: "Valmet",
    logo: "/assets/sponsors/valmet.png",
    url: "https://www.valmet.com/",
    tier: 1,
  },

  // ─── Tier 2: Capital & Research Partners ────────────────────────────────────
  {
    name: "Antler",
    logo: "/assets/sponsors/antler.png",
    url: "https://www.antler.co/",
    tier: 2,
  },
  {
    name: "Inventure",
    logo: "/assets/sponsors/Inventure.png",
    url: "https://www.inventure.vc/",
    tier: 2,
  },
  {
    name: "Wave Ventures",
    logo: "/assets/sponsors/WaveVentures.png",
    url: "https://www.wave.ventures/",
    tier: 2,
  },
  {
    name: "Aalto AI",
    logo: "/assets/supports/aaltoai.png",
    url: "https://www.aaltoai.com/",
    tier: 2,
  },
  {
    name: "University of Turku",
    logo: "/assets/supports/universityofturku.png",
    url: "https://www.utu.fi",
    tier: 2,
  },
  {
    name: "HankenAI",
    logo: "/assets/sponsors/HankAI.png",
    url: "https://hankai.info/",
    tier: 2,
  },
  {
    name: "Maria 01",
    logo: "/assets/sponsors/maria01.png",
    url: "https://maria.io/",
    tier: 2,
  },

  // ─── Tier 3: Community Supporters ───────────────────────────────────────────
  {
    name: "Featherless.ai",
    logo: "/assets/sponsors/featherless.svg",
    url: "https://featherless.ai/",
    tier: 3,
  },
  {
    name: "Eisko",
    logo: "/assets/sponsors/eisko.svg",
    url: "https://www.eisko.fi/",
    tier: 3,
  },
  {
    name: "Skillio",
    logo: "/assets/sponsors/Skillio.png",
    url: "https://skillio.ai/",
    tier: 3,
  },
  {
    name: "A'Pelago",
    logo: "/assets/sponsors/apelago.png",
    url: "https://www.apelago.fi/",
    tier: 3,
  },
  {
    name: "Business Turku",
    logo: "/assets/sponsors/businessturku.png",
    url: "https://businessturku.fi/",
    tier: 3,
  },
  {
    name: "AI Eesti",
    logo: "/assets/sponsors/AIEesti.svg",
    url: "https://aieesti.ee/en",
    tier: 3,
  },
  {
    name: "AI Mad Lab",
    logo: "/assets/supports/aimadlab.svg",
    url: "https://www.aimadlab.com/",
    tier: 3,
  },
  {
    name: "Founders House",
    logo: "/assets/sponsors/founders_house.svg",
    url: "https://founders-house.fi/",
    tier: 3,
  },
  {
    name: "Helsinki Think Company",
    logo: "/assets/sponsors/Helsinki_Think_Company.png",
    url: "https://www.thinkcompany.fi",
    tier: 3,
  },
  {
    name: "Boost Turku",
    logo: "/assets/supports/boost.svg",
    url: "https://www.boostturku.com/",
    tier: 3,
  },
  {
    name: "Turku AMK",
    logo: "/assets/supports/turkuamk.png",
    url: "https://www.turkuamk.fi/",
    tier: 3,
  },
  {
    name: "Tamperees",
    logo: "/assets/sponsors/tamperees.png",
    url: "https://tamperees.com/",
    tier: 3,
  },
  {
    name: "ÅAES",
    logo: "/assets/sponsors/AAES.png",
    url: "https://www.aaes.fi/",
    tier: 3,
  },
  {
    name: "HankenES",
    logo: "/assets/sponsors/HankenEs.png",
    url: "https://hankenes.org",
    tier: 3,
  },
  {
    name: "VES",
    logo: "/assets/sponsors/ves.png",
    url: "https://www.ves.fi",
    tier: 3,
  },
  {
    name: "Pories",
    logo: "/assets/sponsors/PoriES.png",
    url: "https://www.pories.fi",
    tier: 3,
  },
  {
    name: "City of Turku",
    logo: "/assets/supports/cityofturku.png",
    url: "https://www.turku.fi",
    tier: 3,
  },
];

// ─── Tier-based exports (primary) ─────────────────────────────────────────────
export const tier1Partners = PARTNERS.filter((p) => p.tier === 1);
export const tier2Partners = PARTNERS.filter((p) => p.tier === 2);
export const tier3Partners = PARTNERS.filter((p) => p.tier === 3);

// ─── Backward-compatible exports ──────────────────────────────────────────────
// partnerCompanies = tier 1 (strategic partners)
export const partnerCompanies = tier1Partners;
// supportingPartners = tier 2 + tier 3
export const supportingPartners = PARTNERS.filter(
  (p) => p.tier === 2 || p.tier === 3
);
// Simple logo + name only (for TrustBar on /hackathon)
export const partnerLogos = PARTNERS.map(({ name, logo }) => ({
  name,
  logo,
}));
