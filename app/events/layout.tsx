import { Metadata } from "next";
import { getFirstEventSchema, getUpcoming2026EventSchema } from "@/lib/schema";
import { FIRST_EVENT, COPY } from "@/lib/sinceai";

export const metadata: Metadata = {
  title:
    "Events — Since AI Hackathons & AI Builder Meetups | Turku, Finland",
  description:
    `High-signal hackathons and meetups for builders who ship. ${COPY.firstEventLineShort}. Next: Since AI Hackathon 2026 — November 6–8, Turku.`,
  keywords: [
    "Since AI hackathon",
    "AI hackathon Turku",
    "AI hackathon Finland",
    "AI hackathon 2026",
    "machine learning hackathon",
    "AI events Finland",
    "Turku tech events",
    "Global AI events",
  ],
  alternates: {
    canonical: "https://sinceai.fi/events",
  },
  openGraph: {
    title: "Events — Since AI Hackathons & AI Builder Meetups",
    description:
      `Global execution-focused AI hackathons. ${FIRST_EVENT.attendance} builders at the inaugural event, 30+ projects shipped. Since AI Hackathon 2026: November 6–8, Turku.`,
    type: "website",
    locale: "en_US",
    siteName: "Since AI",
    url: "https://sinceai.fi/events",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get both event schemas (past 2025 + upcoming 2026)
  const firstEventSchema = getFirstEventSchema();
  const upcoming2026Schema = getUpcoming2026EventSchema();

  // Create ItemList schema to group both events
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Since AI Hackathons",
    description: "Past and upcoming AI hackathons organized by Since AI in Turku, Finland",
    numberOfItems: 2,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        item: upcoming2026Schema,
      },
      {
        "@type": "ListItem",
        position: 2,
        item: firstEventSchema,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListSchema),
        }}
      />
      {children}
    </>
  );
}
