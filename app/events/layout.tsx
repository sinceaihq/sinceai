import { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import { getFirstEventSchema, getUpcoming2026EventSchema, getBreadcrumbSchema } from "@/lib/schema";
import { FIRST_EVENT, COPY } from "@/lib/sinceai";
import { ORG } from "@/lib/org";

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
    canonical: "https://sinceai.ai/events",
  },
  openGraph: {
    title: "Events — Since AI Hackathons & AI Builder Meetups",
    description:
      `Global execution-focused AI hackathons. ${FIRST_EVENT.attendance} builders at the inaugural event, 30+ projects shipped. Since AI Hackathon 2026: November 6–8, Turku.`,
    type: "website",
    locale: "en_US",
    siteName: "Since AI",
    url: "https://sinceai.ai/events",
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
  const firstEventSchema = getFirstEventSchema();
  const upcoming2026Schema = getUpcoming2026EventSchema();
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "Events", url: `${ORG.baseUrl}/events` },
  ]);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Since AI Hackathons",
    description: "Past and upcoming AI hackathons organized by Since AI in Turku, Finland",
    numberOfItems: 2,
    itemListElement: [
      { "@type": "ListItem", position: 1, item: upcoming2026Schema },
      { "@type": "ListItem", position: 2, item: firstEventSchema },
    ],
  };

  return (
    <>
      <StructuredData data={firstEventSchema} />
      <StructuredData data={upcoming2026Schema} />
      <StructuredData data={itemListSchema} />
      <StructuredData data={breadcrumbSchema} />
      {children}
    </>
  );
}
