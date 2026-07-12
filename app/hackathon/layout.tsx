import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = {
  title:
    "Since AI Innovation Event 2026 — 72-Hour Build Phase + Deployment | November 6–8, Turku",
  description:
    "Since AI Innovation Event 2026: 72-hour build phase in Turku, Finland. Part of a larger innovation programme. Official MLH partner event. 1,000+ builders targeted. Partner challenges from Google for Developers, Bayer, Sandvik, Kongsberg, Valmet. Open to builders worldwide.",
  keywords: [
    "Since AI Innovation Event 2026",
    "AI innovation event Finland",
    "AI innovation event global",
    "innovation event Turku 2026",
    "AI build phase",
    "72 hour innovation programme",
    "MLH innovation event",
    "Major League Hacking Finland",
    "Since AI event",
    "AI builders innovation",
    "innovation event Turku AMK EduCity",
  ],
  alternates: {
    canonical: "https://sinceai.ai/hackathon",
  },
  openGraph: {
    title:
      "Since AI Innovation Event 2026 — 72-Hour Build Phase + Deployment | November 6–8, Turku",
    description:
      "72-hour build phase as part of Since AI Innovation Event 2026 in Turku, Finland. 1,000+ builders targeted. Partner challenges from Google for Developers, Bayer, Sandvik, Kongsberg, Valmet. Open to builders worldwide.",
    url: "https://sinceai.ai/hackathon",
    siteName: "Since AI",
    type: "website",
    images: [{ url: "/assets/og/hero.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Since AI Innovation Event 2026 — November 6–8, Turku",
    description:
      "72-hour build phase. 1,000+ builders targeted. Partner challenges from Google, Bayer, Sandvik, Kongsberg, Valmet.",
    images: ["/assets/og/hero.png"],
  },
};

const eventSchema = {
  "@context": "https://schema.org",
  "@type": "Event",
  "@id": "https://sinceai.ai/hackathon#event",
  name: "Since AI Innovation Event 2026",
  description:
    "Global execution-focused AI innovation event. 72-hour build phase targeting 1,000+ builders. Partner challenges from Google for Developers, Bayer, Sandvik, Kongsberg, Valmet. Selected solutions continue through validation and production support.",
  startDate: "2026-11-06T09:00:00+02:00",
  endDate: "2026-11-08T18:00:00+02:00",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  location: {
    "@type": "Place",
    name: "Educity, Joukahaisenkatu 7",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Joukahaisenkatu 7",
      addressLocality: "Turku",
      postalCode: "20520",
      addressCountry: "FI",
    },
  },
  organizer: { "@id": "https://sinceai.ai/#organization" },
  sponsor: [
    {
      "@type": "Organization",
      name: "Google for Developers",
      url: "https://developers.google.com/",
    },
    {
      "@type": "Organization",
      name: "Bayer",
      url: "https://www.bayer.com/",
    },
    {
      "@type": "Organization",
      name: "Sandvik",
      url: "https://www.sandvik.com/",
    },
    {
      "@type": "Organization",
      name: "Kongsberg",
      url: "https://www.kongsberg.com/",
    },
    {
      "@type": "Organization",
      name: "Valmet",
      url: "https://www.valmet.com/",
    },
  ],
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
