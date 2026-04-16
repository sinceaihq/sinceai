export interface Partner {
  name: string;
  logo: string;
  url: string;
  tier: "partner" | "supporter";
}

export const PARTNERS: Partner[] = [
  // Partners
  {
    name: "Google For Developers",
    logo: "/assets/sponsors/GoogleForDevelopers.png",
    url: "https://developers.google.com/",
    tier: "partner",
  },
  {
    name: "ElevenLabs",
    logo: "/assets/sponsors/elevenlabs.png",
    url: "https://elevenlabs.io/",
    tier: "partner",
  },
  {
    name: "Aiven",
    logo: "/assets/sponsors/aiven.png",
    url: "https://aiven.io/",
    tier: "partner",
  },
  {
    name: "Lovable",
    logo: "/assets/sponsors/lovable.png",
    url: "https://lovable.dev/",
    tier: "partner",
  },
  {
    name: "n8n",
    logo: "/assets/sponsors/n8n.svg",
    url: "https://n8n.io/",
    tier: "partner",
  },
  {
    name: "Bayer",
    logo: "/assets/sponsors/Bayer.svg",
    url: "https://www.bayer.com/",
    tier: "partner",
  },
  {
    name: "Sandvik",
    logo: "/assets/sponsors/sandvik.png",
    url: "https://www.sandvik.com/",
    tier: "partner",
  },
  {
    name: "Kongsberg",
    logo: "/assets/sponsors/kongsberg.png",
    url: "https://www.kongsberg.com/",
    tier: "partner",
  },
  {
    name: "Valmet",
    logo: "/assets/sponsors/valmet.png",
    url: "https://www.valmet.com/",
    tier: "partner",
  },
  {
    name: "Featherless.ai",
    logo: "/assets/sponsors/featherless.svg",
    url: "https://featherless.ai/",
    tier: "partner",
  },
  {
    name: "Eisko",
    logo: "/assets/sponsors/eisko.svg",
    url: "https://www.eisko.fi/",
    tier: "partner",
  },
  {
    name: "Skillio",
    logo: "/assets/sponsors/Skillio.png",
    url: "https://skillio.ai/",
    tier: "partner",
  },
  {
    name: "A'Pelago",
    logo: "/assets/sponsors/apelago.png",
    url: "https://www.apelago.fi/",
    tier: "partner",
  },
  {
    name: "Business Turku",
    logo: "/assets/sponsors/businessturku.png",
    url: "https://businessturku.fi/",
    tier: "partner",
  },
  // Supporters
  {
    name: "Aalto AI",
    logo: "/assets/supports/aaltoai.png",
    url: "https://www.aaltoai.com/",
    tier: "supporter",
  },
  {
    name: "Antler",
    logo: "/assets/sponsors/antler.png",
    url: "https://www.antler.co/",
    tier: "supporter",
  },
  {
    name: "Inventure",
    logo: "/assets/sponsors/Inventure.png",
    url: "https://www.inventure.vc/",
    tier: "supporter",
  },
  {
    name: "Wave Ventures",
    logo: "/assets/sponsors/WaveVentures.png",
    url: "https://www.wave.ventures/",
    tier: "supporter",
  },
  {
    name: "AI Eesti",
    logo: "/assets/sponsors/AIEesti.svg",
    url: "https://aieesti.ee/en",
    tier: "supporter",
  },
  {
    name: "AI Mad Lab",
    logo: "/assets/supports/aimadlab.svg",
    url: "https://www.aimadlab.com/",
    tier: "supporter",
  },
  {
    name: "Maria 01",
    logo: "/assets/sponsors/maria01.png",
    url: "https://maria.io/",
    tier: "supporter",
  },
  {
    name: "Founders House",
    logo: "/assets/sponsors/founders_house.svg",
    url: "https://founders-house.fi/",
    tier: "supporter",
  },
  {
    name: "University of Turku",
    logo: "/assets/supports/universityofturku.png",
    url: "https://www.utu.fi",
    tier: "supporter",
  },
  {
    name: "Helsinki Think Company",
    logo: "/assets/sponsors/Helsinki_Think_Company.png",
    url: "https://www.thinkcompany.fi",
    tier: "supporter",
  },
  {
    name: "Boost Turku",
    logo: "/assets/supports/boost.svg",
    url: "https://www.boostturku.com/",
    tier: "supporter",
  },
  {
    name: "Turku AMK",
    logo: "/assets/supports/turkuamk.png",
    url: "https://www.turkuamk.fi/",
    tier: "supporter",
  },
  {
    name: "HankenAI",
    logo: "/assets/sponsors/HankAI.png",
    url: "https://hankai.info/",
    tier: "supporter",
  },
  {
    name: "Tamperees",
    logo: "/assets/sponsors/tamperees.png",
    url: "https://tamperees.com/",
    tier: "supporter",
  },
  {
    name: "ÅAES",
    logo: "/assets/sponsors/AAES.png",
    url: "https://www.aaes.fi/",
    tier: "supporter",
  },
  {
    name: "HankenES",
    logo: "/assets/sponsors/HankenEs.png",
    url: "https://hankenes.org",
    tier: "supporter",
  },
  {
    name: "VES",
    logo: "/assets/sponsors/ves.png",
    url: "https://www.ves.fi",
    tier: "supporter",
  },
  {
    name: "Pories",
    logo: "/assets/sponsors/PoriES.png",
    url: "https://www.pories.fi",
    tier: "supporter",
  },
  {
    name: "City of Turku",
    logo: "/assets/supports/cityofturku.png",
    url: "https://www.turku.fi",
    tier: "supporter",
  }
];

// Derived exports for convenience
export const partnerCompanies = PARTNERS.filter(
  (p) => p.tier === "partner"
);
export const supportingPartners = PARTNERS.filter(
  (p) => p.tier === "supporter"
);

// Simple logo + name only (for TrustBar)
export const partnerLogos = PARTNERS.map(({ name, logo }) => ({
  name,
  logo,
}));
