import { Metadata } from "next";
import { OG_IMAGE } from "@/lib/og";

export const metadata: Metadata = {
  title: "Press & Media — Since AI",
  description:
    "Press kit for Since AI, a global, execution-focused AI innovation ecosystem: 10,000+ AI builders, 100+ partners and supporters. Media: info@sinceai.fi.",
  keywords: [
    "Since AI press",
    "AI community media",
    "Finland AI news",
    "Turku tech press",
    "hackathon press release",
    "AI community Finland",
  ],
  alternates: {
    canonical: "https://sinceai.ai/press",
  },
  openGraph: {
    title: "Press & Media — Since AI",
    description:
      "Press kit for Since AI, a global, execution-focused AI innovation ecosystem: 10,000+ AI builders, 100+ partners and supporters. Media: info@sinceai.fi.",
    type: "website",
    locale: "en_US",
    siteName: "Since AI",
    url: "https://sinceai.ai/press",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Press & Media — Since AI",
    description: "Press kit for Since AI, a global, execution-focused AI innovation ecosystem: 10,000+ AI builders, 100+ partners and supporters. Media: info@sinceai.fi.",
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://sinceai.ai/" },
    { "@type": "ListItem", position: 2, name: "Press", item: "https://sinceai.ai/press" },
  ],
};

export default function PressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
