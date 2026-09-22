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
    name: "LUMI AI Factory",
    logo: "/assets/sponsors/Lumi.svg",
    url: "https://lumi-ai-factory.eu/",
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
    name: "Featherless.ai",
    logo: "/assets/sponsors/featherless.svg",
    url: "https://featherless.ai/",
    tier: 1,
  },
  {
    name: "JetBrains",
    logo: "/assets/sponsors/jetbrains.svg",
    url: "https://www.jetbrains.com/",
    tier: 1,
  },
  {
    name: "Atlassian",
    logo: "/assets/sponsors/atlassian.svg",
    url: "https://www.atlassian.com/",
    tier: 1,
  },
  {
    name: "Pruna AI",
    logo: "/assets/sponsors/Pruna.svg",
    url: "https://www.pruna.ai/",
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
  {
    name: "AI Finland",
    logo: "/assets/supports/AI_Finland.png",
    url: "https://aifinland.fi/",
    tier: 1,
  },
  {
    name: "Shift",
    logo: "/assets/sponsors/shift.png",
    url: "https://theshift.fi/",
    tier: 1,
  },
  {
    name: "Turun Teknologiakiinteistöt",
    logo: "/assets/sponsors/TurkuTechnologyProperties.png",
    url: "https://www.teknologiakiinteistot.fi/",
    tier: 1,
  },
  {
    name: "Revvity",
    logo: "/assets/sponsors/revvity.png",
    url: "https://www.revvity.com/",
    tier: 1,
  },
  {
    name: "Traficom",
    logo: "/assets/sponsors/traficom.png",
    url: "https://www.traficom.fi/",
    tier: 1,
  },
  {
    name: "Meyer Turku",
    logo: "/assets/sponsors/meyer-turku.png",
    url: "https://www.meyerturku.fi/en/",
    tier: 1,
  },
  {
    name: "Elisa",
    logo: "/assets/sponsors/elisa.png",
    url: "https://www.elisa.com/",
    tier: 1,
  },
  {
    name: "Solita",
    logo: "/assets/sponsors/solita.png",
    url: "https://www.solita.fi/",
    tier: 1,
  },
  {
    name: "Takomo Golf",
    logo: "/assets/sponsors/takomo-golf.png",
    url: "https://takomogolf.com/",
    tier: 1,
  },
  {
    name: "Turku Energia",
    logo: "/assets/sponsors/turku-energia.png",
    url: "https://www.turkuenergia.fi/en",
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
    name: "Tesi",
    logo: "/assets/sponsors/Tesi.png",
    url: "https://tesi.fi/",
    tier: 2,
  },
  {
    name: "Icebreaker VC",
    logo: "/assets/supports/Icebreaker.png",
    url: "https://www.icebreaker.vc/",
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
    name: "Redstone VC",
    logo: "/assets/sponsors/Redstone.png",
    url: "https://redstone.vc/",
    tier: 2,
  },
  {
    name: "MAKI VC",
    logo: "/assets/sponsors/maki.png",
    url: "https://maki.vc/",
    tier: 2,
  },
  {
    name: "Inovexus",
    logo: "/assets/sponsors/Inovexus.svg",
    url: "https://inovexus.com/",
    tier: 2,
  },
  {
    name: "FiBAN",
    logo: "/assets/sponsors/FiBAN.svg",
    url: "https://fiban.org/",
    tier: 2,
  },
  {
    name: "FOV Ventures",
    logo: "/assets/supports/FOVV.png",
    url: "https://www.fov.ventures/",
    tier: 2,
  },
  {
    name: "Monttu Ventures",
    logo: "/assets/sponsors/monttuventureslogo.png",
    url: "https://monttuventures.fi/",
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
  {
    name: "TurkuNLP",
    logo: "/assets/sponsors/turkunlp_logo.png",
    url: "https://turkunlp.org",
    tier: 2,
  },
  {
    name: "GPT Lab",
    logo: "/assets/sponsors/GPT-Lab.svg",
    url: "https://gpt-lab.eu/",
    tier: 2,
  },
  {
    name: "Turku AMK",
    logo: "/assets/supports/turkuamk.png",
    url: "https://www.turkuamk.fi/",
    tier: 2,
  },
  {
    name: "Founders House",
    logo: "/assets/sponsors/founders_house.svg",
    url: "https://founders-house.fi/",
    tier: 2,
  },

  // ─── Tier 3: Community Supporters ───────────────────────────────────────────
  // Ordered by global reference value (strongest first).
  {
    name: "OxAI",
    logo: "/assets/sponsors/OxAI.png",
    url: "https://www.oxai.org/",
    tier: 3,
  },
  {
    name: "ACM BPDC Chapter",
    logo: "/assets/sponsors/ACM-BPDC-Chapter.png",
    url: "https://dubai.acm.org/",
    tier: 3,
  },
  {
    name: "DVC",
    logo: "/assets/sponsors/DVC.svg",
    url: "https://dvc.org/",
    tier: 3,
  },
  {
    name: "Åbo Akademi",
    logo: "/assets/supports/AboAkademi.png",
    url: "https://www.abo.fi/",
    tier: 3,
  },
  {
    name: "Hive Helsinki",
    logo: "/assets/sponsors/Hive.png",
    url: "https://www.hive.fi/",
    tier: 3,
  },
  {
    name: "Startup Sauna",
    logo: "/assets/sponsors/Startup-Sauna.svg",
    url: "https://startupsauna.com/",
    tier: 3,
  },
  {
    name: "City of Turku",
    logo: "/assets/supports/cityofturku.png",
    url: "https://www.turku.fi",
    tier: 3,
  },
  {
    name: "Stockholm AI",
    logo: "/assets/sponsors/Stockholm-AI.png",
    url: "https://www.stockholm.ai/",
    tier: 3,
  },
  {
    name: "Warsaw.AI",
    logo: "/assets/sponsors/Warsaw-AI.png",
    url: "https://warsaw.ai/",
    tier: 3,
  },
  {
    name: "Ignite",
    logo: "/assets/sponsors/Ignite.png",
    url: "https://ignite.aaltoes.com/",
    tier: 3,
  },
  {
    name: "FISC",
    logo: "/assets/sponsors/FISC_RGB_White.png",
    url: "https://teknologiateollisuus.fi/fisc/",
    tier: 3,
  },
  {
    name: "Helsinki XR Center",
    logo: "/assets/sponsors/Helsinki-XR-Center.png",
    url: "https://helsinkixrcenter.com/",
    tier: 3,
  },
  {
    name: "KIRAHub",
    logo: "/assets/sponsors/KIRAHub.png",
    url: "https://kirahub.org/",
    tier: 3,
  },
  {
    name: "COSS",
    logo: "/assets/sponsors/COSS.png",
    url: "https://coss.fi/",
    tier: 3,
  },
  {
    name: "SW4E / DIMECC",
    logo: "/assets/supports/sw4e-dimecc.png",
    url: "https://sw4e.fi/",
    tier: 3,
  },
  {
    name: "Business Turku",
    logo: "/assets/sponsors/businessturku.png",
    url: "https://businessturku.fi/",
    tier: 3,
  },
  {
    name: "Turun Kauppakamari",
    logo: "/assets/supports/turunkauppakamari.png",
    url: "https://turunkauppakamari.fi/",
    tier: 3,
  },
  {
    name: "Study in Turku",
    logo: "/assets/sponsors/Study-in-Turku.png",
    url: "https://www.turku.fi/en/study-turku",
    tier: 3,
  },
  {
    name: "Lagos AI Summit",
    logo: "/assets/sponsors/Lagos-AI-Summit.png",
    url: "https://lagosaisummit.com/",
    tier: 3,
  },
  {
    name: "GOLEM",
    logo: "/assets/sponsors/GOLEM.png",
    url: "https://golem.ii.pw.edu.pl/",
    tier: 3,
  },
  {
    name: "BDSS",
    logo: "/assets/sponsors/BDSS.png",
    url: "https://www.bristolsu.org.uk/groups/bristol-data-science-and-artificial-intelligence-society-bdss",
    tier: 3,
  },
  {
    name: "MAIA",
    logo: "/assets/sponsors/MAIA.png",
    url: "https://www.maiafuture.com/en",
    tier: 3,
  },
  {
    name: "GalsenAI",
    logo: "/assets/sponsors/GalsenAI.png",
    url: "https://galsen.ai/",
    tier: 3,
  },
  {
    name: "Gauteng AI Community",
    logo: "/assets/sponsors/Gauteng-AI-Community.jpeg",
    url: "https://www.gaic.co.za/",
    tier: 3,
  },
  {
    name: "BANFES",
    logo: "/assets/sponsors/BANFES.png",
    url: "https://banfes.ai/en/",
    tier: 3,
  },
  {
    name: "Tech Emerging Africa",
    logo: "/assets/sponsors/TEA.png",
    url: "https://techemergingafrica.com/",
    tier: 3,
  },
  {
    name: "HelsinkiJS",
    logo: "/assets/sponsors/HelsinkiJS.jpg",
    url: "https://helsinkijs.org/",
    tier: 3,
  },
  {
    name: "IDBM Klubi",
    logo: "/assets/sponsors/IDBM-Klubi.svg",
    url: "https://www.idbm.aalto.fi/idbm-klubi",
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
    name: "HankenES",
    logo: "/assets/sponsors/HankenEs.png",
    url: "https://hankenes.org",
    tier: 3,
  },
  {
    name: "ÅAES",
    logo: "/assets/sponsors/AAES.png",
    url: "https://www.aaes.fi/",
    tier: 3,
  },
  {
    name: "AI Eesti",
    logo: "/assets/sponsors/AIEesti.svg",
    url: "https://aieesti.ee/en",
    tier: 3,
  },
  {
    name: "EESTEC LC Zagreb",
    logo: "/assets/sponsors/EESTEC-LC-Zagreb.svg",
    url: "https://eestec.hr/home",
    tier: 3,
  },
  {
    name: "AINOW",
    logo: "/assets/sponsors/AINOW.svg",
    url: "https://www.ainow.mk/",
    tier: 3,
  },
  {
    name: "FusionX Hub",
    logo: "/assets/sponsors/FusionX.png",
    url: "https://fusionxhub.com/",
    tier: 3,
  },
  {
    name: "Tamperees",
    logo: "/assets/sponsors/tamperees.png",
    url: "https://tamperees.com/",
    tier: 3,
  },
  {
    name: "VES",
    logo: "/assets/sponsors/ves.png",
    url: "https://www.ves.fi",
    tier: 3,
  },
  {
    name: "JES",
    logo: "/assets/supports/JESprimarylogoWhiteStickerSVG.svg",
    url: "https://www.jkles.fi/en/",
    tier: 3,
  },
  {
    name: "Lutes",
    logo: "/assets/supports/LUTES.svg",
    url: "https://lutes.fi/",
    tier: 3,
  },
  {
    name: "Pories",
    logo: "/assets/sponsors/PoriES.png",
    url: "https://www.pories.fi",
    tier: 3,
  },
  {
    name: "Lahti es",
    logo: "/assets/sponsors/lahties.png",
    url: "https://lahties.com/",
    tier: 3,
  },
  {
    name: "Arcada ES",
    logo: "/assets/sponsors/Arcada-ES.png",
    url: "https://www.aesarcada.com/",
    tier: 3,
  },
  {
    name: "Root Expo",
    logo: "/assets/supports/rootlogo.png",
    url: "https://rootexpo.fi",
    tier: 3,
  },
  {
    name: "AI Mad Lab",
    logo: "/assets/supports/aimadlab.svg",
    url: "https://www.aimadlab.com/",
    tier: 3,
  },
  {
    name: "Attractor",
    logo: "/assets/supports/attractor.png",
    url: "https://www.attractor.fi/",
    tier: 3,
  },
  {
    name: "Skillio",
    logo: "/assets/sponsors/Skillio.png",
    url: "https://skillio.ai/",
    tier: 3,
  },
  {
    name: "Eisko",
    logo: "/assets/sponsors/eisko.svg",
    url: "https://www.eisko.fi/",
    tier: 3,
  },
  {
    name: "A'Pelago",
    logo: "/assets/sponsors/apelago.png",
    url: "https://www.apelago.fi/",
    tier: 3,
  },
  {
    name: "EBooster Nova",
    logo: "/assets/sponsors/EBooster-Nova.png",
    url: "https://eboosternova.com/",
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
