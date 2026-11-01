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
  "FORCIT Group": "https://forcitgroup.com/",
  Elisa: "https://www.elisa.com/",
  "Meyer Turku": "https://www.meyerturku.fi/en/",
  Traficom: "https://www.traficom.fi/",
  "Lindström": "https://lindstromgroup.com/",
  "Business Turku": "https://businessturku.fi/",
  DNA: "https://www.dna.fi/",
  Fonecta: "https://www.fonecta.fi/",
  Europress: "https://europressgroup.com/",
  TrustED: "https://trustedproject.eu/",
};
const SPONSORS = HACKATHON_2026_PARTNERS.challengePartners.map((name) => ({ name, url: SPONSOR_URLS[name] }));

export const metadata: Metadata = {
  title:
    "Since AI Hackathon 2026 — 6–8 November, Turku, Finland",
  description:
    `AI hackathon in Turku, Finland, 6–8 November 2026: 1,000+ builders, €50,000+ in cash prizes and ${HACKATHON_2026_PARTNERS.challengeTarget} company challenges. MLH Member Event, open worldwide.`,
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
    "weekend AI hackathon",
  ],
  alternates: {
    canonical: "https://sinceai.ai/hackathon",
  },
  openGraph: {
    title:
      "Since AI Hackathon 2026 — 6–8 November, Turku, Finland",
    description:
      `AI hackathon in Turku, Finland, 6–8 November 2026. 1,000+ builders targeted. 15 company challenges from ${SHORT}. Open to builders worldwide.`,
    url: "https://sinceai.ai/hackathon",
    siteName: "Since AI",
    type: "website",
    images: [{ url: "/assets/og/hackathon-2026.png", width: 1200, height: 630, alt: "Since AI Hackathon 2026, 6–8 November 2026 in Turku, Finland" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Since AI Hackathon 2026 — November 6–8, Turku",
    description:
      `AI hackathon, 6–8 November 2026. 1,000+ builders targeted. 15 company challenges from ${SHORT}.`,
    images: ["/assets/og/hackathon-2026.png"],
  },
};

const eventSchema = {
  "@context": "https://schema.org",
  "@type": "Event",
  "@id": "https://sinceai.ai/hackathon#event",
  name: "Since AI Hackathon 2026",
  description:
    `A global execution-focused AI hackathon, 6–8 November 2026. 1,000+ builders targeted. €50,000+ in cash prizes. 15 company challenges from ${SHORT}. Opening Friday 17:00 at EduCity; building at BioCity and Joki; finals Sunday 14:00.`,
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
  // The 15 challenge partners (organiser roster, 1 Nov 2026).
  sponsor: SPONSORS.map(({ name, url }) => ({ "@type": "Organization", name, url })),
  performer: { "@type": "Person", name: "Jason Mayes", jobTitle: "Web AI Lead, Google" },
  image: "https://sinceai.ai/assets/og/hackathon-2026.png",
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
