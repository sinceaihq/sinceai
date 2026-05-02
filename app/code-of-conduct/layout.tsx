import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Code of Conduct - Since AI Community Standards",
  description:
    "Since AI Code of Conduct: Our commitment to a safe, inclusive, and welcoming environment for all 1000+ community members. Standards for hackathons, Discord, and all community spaces in Turku and beyond.",
  keywords: [
    "Since AI code of conduct",
    "community guidelines",
    "AI community standards",
    "inclusive tech community",
    "harassment policy",
    "community safety",
  ],
  alternates: {
    canonical: "https://sinceai.ai/code-of-conduct",
  },
  openGraph: {
    title: "Code of Conduct — Since AI Community Standards",
    description:
      "Our commitment to a safe, inclusive, and welcoming environment for all Since AI community members.",
    type: "website",
    locale: "en_US",
    siteName: "Since AI",
    url: "https://sinceai.ai/code-of-conduct",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CodeOfConductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
