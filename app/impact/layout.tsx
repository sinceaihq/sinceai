import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";

const title = "Impact & Numbers — Since AI";
const description =
  "Since AI's published metrics with a methodology note for each: network reach, community, hackathon builders, partners, projects shipped and production case studies.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://sinceai.ai/impact" },
  openGraph: { title, description, url: "https://sinceai.ai/impact", siteName: "Since AI", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://sinceai.ai/" },
    { "@type": "ListItem", position: 2, name: "Impact & Numbers", item: "https://sinceai.ai/impact" },
  ],
};

export default function ImpactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StructuredData data={breadcrumbSchema} />
      {children}
    </>
  );
}
