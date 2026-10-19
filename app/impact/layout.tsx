import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import { OG_IMAGE } from "@/lib/og";

const title = "Impact & Numbers — Since AI";
const description =
  "Since AI's published metrics, each with a methodology note: network reach, community, hackathon builders, partners, projects and production case studies.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://sinceai.ai/impact" },
  openGraph: { title, description, url: "https://sinceai.ai/impact", siteName: "Since AI", type: "website", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
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
