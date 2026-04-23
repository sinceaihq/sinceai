import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = {
  title:
    "Since AI Hackathon 2026 — Europe's Execution-Focused AI Hackathon | November 6–8, Turku",
  description:
    "72-hour AI hackathon in Turku, Finland. Official MLH partner event. 1,000+ builders targeted. Partner challenges from Google for Developers, Bayer, Sandvik, Kongsberg, Valmet. Open to builders worldwide.",
  keywords: [
    "Since AI Hackathon 2026",
    "AI hackathon Finland",
    "AI hackathon Europe",
    "hackathon Turku 2026",
    "MLH hackathon Europe 2026",
    "Major League Hacking Finland",
    "Since AI event",
    "AI builders hackathon",
    "hackathon Turku AMK EduCity",
    "72 hour hackathon",
  ],
  alternates: {
    canonical: "https://sinceai.fi/hackathon",
  },
  openGraph: {
    title:
      "Since AI Hackathon 2026 — Europe's Execution-Focused AI Hackathon | November 6–8, Turku",
    description:
      "72-hour AI hackathon in Turku, Finland. 1,000+ builders targeted. Partner challenges from Google for Developers, Bayer, Sandvik, Kongsberg, Valmet. Open to builders worldwide.",
    url: "https://sinceai.fi/hackathon",
    siteName: "Since AI",
    type: "website",
    images: [{ url: "/assets/og/hero.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Since AI Hackathon 2026 — November 6–8, Turku",
    description:
      "72-hour AI hackathon. 1,000+ builders targeted. Partner challenges from Google, Bayer, Sandvik, Kongsberg, Valmet.",
    images: ["/assets/og/hero.png"],
  },
};

const eventSchema = {
  "@context": "https://schema.org",
  "@type": "Event",
  "@id": "https://sinceai.fi/hackathon#event",
  name: "Since AI Hackathon 2026",
  description:
    "Europe's execution-focused AI hackathon. 1,000+ builders targeted. 72 hours. Partner challenges from Google for Developers, Bayer, Sandvik, Kongsberg, Valmet.",
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
  organizer: { "@id": "https://sinceai.fi/#organization" },
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
  image: "https://sinceai.fi/assets/og/hero.png",
  url: "https://sinceai.fi/hackathon",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    validFrom: "2025-01-01T00:00:00+02:00",
    url: "https://sinceai.fi/hackathon",
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
