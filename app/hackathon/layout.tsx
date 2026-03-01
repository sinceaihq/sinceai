import type { Metadata } from "next";

export const metadata: Metadata = {
  title:
    "Since AI Hackathon 2026 | Europe's Most Ambitious AI Hackathon | Official MLH Partner",
  description:
    "Since AI Hackathon is Europe's premier annual AI hackathon in Turku, Finland. 1000+ participants, Official MLH partner event 2026, with industry challenges from Valmet, Sandvik & Kongsberg. Open to builders worldwide.",
  keywords:
    "Since AI Hackathon, AI hackathon Finland, AI hackathon Europe, hackathon Turku 2026, MLH hackathon Finland, Major League Hacking Finland, Since AI event, AI builders hackathon, hackathon Turku AMK EduCity",
  alternates: {
    canonical: "https://sinceai.fi/hackathon",
  },
  openGraph: {
    title: "Since AI Hackathon 2026 — Europe's Most Ambitious AI Hackathon",
    description:
      "Annual AI hackathon by Since AI. Official MLH partner. 1000+ participants. Turku, Finland. November 2026.",
    url: "https://sinceai.fi/hackathon",
    type: "website",
    images: [{ url: "/api/og/hackathon", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Since AI Hackathon 2026 | MLH Official Partner",
    description:
      "Europe's premier AI hackathon. Turku, Finland. 1000+ builders.",
    images: ["/api/og/hackathon"],
  },
};

export default function HackathonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
