import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Projects - Since AI | Challenge Themes from Hackathon 2025",
  description:
    "High-signal prototypes built around real partner challenge themes. Explore AI projects from Since AI Hackathon 2025: maritime safety, industrial automation, B2B sales, environmental data, and more. 260+ builders in Turku.",
  keywords: [
    "AI hackathon projects",
    "AI prototypes",
    "hackathon challenge themes",
    "machine learning projects",
    "Turku AI projects",
    "Since AI projects",
  ],
  alternates: {
    canonical: "https://sinceai.ai/projects",
  },
  openGraph: {
    title: "Projects — Since AI | Challenge Themes from Hackathon 2025",
    description:
      "High-signal prototypes from partner challenge themes. Maritime safety, industrial automation, B2B sales, and more. Built by 260+ AI builders in Turku.",
    type: "website",
    locale: "en_US",
    siteName: "Since AI",
    url: "https://sinceai.ai/projects",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Add ItemList schema for challenge themes
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Since AI Hackathon Challenge Themes",
    description: "Public summaries of challenge themes from Since AI Hackathon 2025",
    numberOfItems: 10,
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
