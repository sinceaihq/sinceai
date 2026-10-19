import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import { HACKATHON_2026_PARTNERS, UPCOMING_EVENT_2026 } from "@/lib/sinceai";

const SHORT = HACKATHON_2026_PARTNERS.challengePartnersShort;

/** Challenge partner websites for the Event schema, in roster order. */
const SPONSOR_URLS: Record<(typeof HACKATHON_2026_PARTNERS.challengePartners)[number], string> = {
  Valmet: "https://www.valmet.com/",
  Bayer: "https://www.bayer.com/",
  "Turku Energia": "https://www.turkuenergia.fi/en",
  Apetit: "https://apetit.fi/",
  "Takomo Golf": "https://takomogolf.com/",
  "Forcit Group": "https://forcitgroup.com/",
  Elisa: "https://www.elisa.com/",
  "Meyer Turku": "https://www.meyerturku.fi/en/",
  Traficom: "https://www.traficom.fi/",
  "Lindström": "https://lindstromgroup.com/",
  "Business Turku": "https://businessturku.fi/",
  DNA: "https://www.dna.fi/",
  Fonecta: "https://www.fonecta.fi/",
};
const SPONSORS = HACKATHON_2026_PARTNERS.challengePartners.map((name) => ({ name, url: SPONSOR_URLS[name] }));

export const metadata: Metadata = {
  title:
    "Since AI Hackathon 2026 — Global Execution-Focused AI Hackathon | November 6–8, Turku",
  description:
    `48-hour AI hackathon in Turku, Finland, November 6–8. MLH 2027 Season Member Event. 1,000+ builders targeted, €50,000 prize pool, 15 company challenges from ${SHORT}. Open to builders worldwide.`,
  keywords: [
    "Since AI Hackathon 2026",
    "AI hackathon Finland",
    "AI hackathon global",
    "hackathon Turku 2026",
    "MLH 2027 season hackathon",
    "Major League Hacking Finland",
    "Since AI event",
    "AI builders hackathon",
    "hackathon Turku AMK EduCity",
    "48 hour hackathon",
  ],
  alternates: {
    canonical: "https://sinceai.ai/hackathon",
  },
  openGraph: {
    title:
      "Since AI Hackathon 2026 — Global Execution-Focused AI Hackathon | November 6–8, Turku",
    description:
      `48-hour AI hackathon in Turku, Finland. 1,000+ builders targeted. 15 company challenges from ${SHORT}. Open to builders worldwide.`,
    url: "https://sinceai.ai/hackathon",
    siteName: "Since AI",
    type: "website",
    images: [{ url: "/assets/og/hero.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Since AI Hackathon 2026 — November 6–8, Turku",
    description:
      `48-hour AI hackathon. 1,000+ builders targeted. 15 company challenges from ${SHORT}.`,
    images: ["/assets/og/hero.png"],
  },
};

const eventSchema = {
  "@context": "https://schema.org",
  "@type": "Event",
  "@id": "https://sinceai.ai/hackathon#event",
  name: "Since AI Hackathon 2026",
  description:
    `A global execution-focused AI hackathon in a 48-hour format. 1,000+ builders targeted. €50,000 prize pool. 15 company challenges from ${SHORT}. Opening Friday 17:00 at EduCity; building at BioCity and Joki; finals Sunday 14:00.`,
  startDate: UPCOMING_EVENT_2026.startDate,
  endDate: UPCOMING_EVENT_2026.endDate,
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: [
    {
      "@type": "Place",
      name: "EduCity",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Joukahaisenkatu 7",
        addressLocality: "Turku",
        postalCode: "20520",
        addressCountry: "FI",
      },
    },
    {
      "@type": "Place",
      name: "BioCity",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Tykistökatu 6",
        addressLocality: "Turku",
        postalCode: "20520",
        addressCountry: "FI",
      },
    },
    {
      "@type": "Place",
      name: "Joki",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Lemminkäisenkatu 12b",
        addressLocality: "Turku",
        postalCode: "20520",
        addressCountry: "FI",
      },
    },
  ],
  organizer: { "@id": "https://sinceai.ai/#organization" },
  // The confirmed challenge partners (organiser roster, 13 Oct 2026). Two more challenge places are still to be announced.
  sponsor: SPONSORS.map(({ name, url }) => ({ "@type": "Organization", name, url })),
  performer: { "@type": "Person", name: "Jason Mayes", jobTitle: "Web AI Lead, Google" },
  image: "https://sinceai.ai/assets/og/hero.png",
  url: "https://sinceai.ai/hackathon",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    validFrom: "2025-01-01T00:00:00+02:00",
    url: "https://sinceai.ai/hackathon",
  },
};

export default function HackathonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StructuredData data={eventSchema} />
      {children}
    </>
  );
}
