import { Metadata } from "next";
import { OG_IMAGE } from "@/lib/og";

export const metadata: Metadata = {
  title: "Code of Conduct - Since AI Community Standards",
  description:
    "The Since AI Code of Conduct: our commitment to a safe, inclusive and welcoming community at hackathons, on Discord and in every Since AI space.",
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
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary",
    title: "Code of Conduct — Since AI Community Standards",
    description: "Our commitment to a safe, inclusive, and welcoming environment for all Since AI community members.",
    images: [OG_IMAGE.url],
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
