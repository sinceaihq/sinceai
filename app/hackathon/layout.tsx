import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import { getHackathon2026EventSchema } from "@/lib/schema";
import { HACKATHON_2026_PARTNERS } from "@/lib/sinceai";

const SHORT = HACKATHON_2026_PARTNERS.challengePartnersShort;

const DESCRIPTION = `Since AI Hackathon 2026 took place on 6–8 November 2026 in Turku, Finland: ${HACKATHON_2026_PARTNERS.challengeTarget} company challenges and a €50,000+ cash prize pool. An MLH Member Event.`;

export const metadata: Metadata = {
  title:
    "Since AI Hackathon 2026 — 6–8 November, Turku, Finland",
  description: DESCRIPTION,
  keywords: [
    "Since AI Hackathon 2026",
    "AI hackathon Finland",
    "AI hackathon global",
    "hackathon Turku 2026",
    "MLH 2027 season hackathon",
    "Major League Hacking Finland",
    "Since AI event",
    "AI builders hackathon",
    "hackathon Turku AMK EduCity",
    "weekend AI hackathon",
  ],
  alternates: {
    canonical: "https://sinceai.ai/hackathon",
  },
  openGraph: {
    title:
      "Since AI Hackathon 2026 — 6–8 November, Turku, Finland",
    description:
      `Since AI Hackathon 2026 took place on 6–8 November 2026 in Turku, Finland, with 15 company challenges from ${SHORT}.`,
    url: "https://sinceai.ai/hackathon",
    siteName: "Since AI",
    type: "website",
    images: [{ url: "/assets/og/hackathon-2026.png", width: 1200, height: 630, alt: "Since AI Hackathon 2026, 6–8 November 2026 in Turku, Finland" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Since AI Hackathon 2026 — November 6–8, Turku",
    description:
      `Since AI Hackathon 2026 took place on 6–8 November 2026 in Turku, with 15 company challenges from ${SHORT}.`,
    images: ["/assets/og/hackathon-2026.png"],
  },
};

export default function HackathonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StructuredData data={getHackathon2026EventSchema()} />
      {children}
    </>
  );
}
