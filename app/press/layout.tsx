import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press & Media - Since AI | Finland's Largest AI Community",
  description:
    "Press kit and media information for Since AI. 1000+ members, 260 hackathon participants, 15+ partner companies. Contact: info@sinceai.fi. Based in Turku, Finland. Founded 2025.",
  keywords: [
    "Since AI press",
    "AI community media",
    "Finland AI news",
    "Turku tech press",
    "hackathon press release",
    "AI community Finland",
  ],
  alternates: {
    canonical: "https://sinceai.fi/press",
  },
  openGraph: {
    title: "Press & Media — Since AI",
    description:
      "Press kit and media information for Since AI. 10,000+ AI builders in network, 30+ strategic partners. A global execution-focused AI innovation ecosystem. Based in Turku, Finland.",
    type: "website",
    locale: "en_US",
    siteName: "Since AI",
    url: "https://sinceai.fi/press",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
