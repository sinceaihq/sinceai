import { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import { getFirstEventSchema, getHackathon2026EventSchema, getBreadcrumbSchema } from "@/lib/schema";
import { FIRST_EVENT } from "@/lib/sinceai";
import { ORG } from "@/lib/org";
import { OG_IMAGE } from "@/lib/og";

// Evergreen on purpose: no "next:" or "upcoming" promise that goes stale when an event ends.
const DESCRIPTION = `Hackathons and meetups for builders who ship: Since AI Hackathon 2026 (6–8 November 2026) and 2025 (${FIRST_EVENT.attendance} builders), both in Turku, Finland.`;

export const metadata: Metadata = {
  title:
    "Events — Since AI Hackathons & AI Builder Meetups",
  description: DESCRIPTION,
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
    description: DESCRIPTION,
    type: "website",
    locale: "en_US",
    siteName: "Since AI",
    url: "https://sinceai.ai/events",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Events — Since AI Hackathons & AI Builder Meetups",
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
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
  const events = [getHackathon2026EventSchema(), getFirstEventSchema()];
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "Events", url: `${ORG.baseUrl}/events` },
  ]);

  // Each event is described once; the list points to it by @id.
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Since AI Hackathons",
    description: "AI hackathons organised by Since AI in Turku, Finland, newest first",
    numberOfItems: events.length,
    itemListElement: events.map((event, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: { "@id": event["@id"] },
    })),
  };

  return (
    <>
      {events.map((event) => (
        <StructuredData key={event["@id"]} data={event} />
      ))}
      <StructuredData data={itemListSchema} />
      <StructuredData data={breadcrumbSchema} />
      {children}
    </>
  );
}
