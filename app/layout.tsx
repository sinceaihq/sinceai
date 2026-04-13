import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getOrganizationSchema } from "@/lib/schema";
import { CookieConsent } from "@/components/CookieConsent";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sinceai.fi"),
  title: "Since AI - Europe's Leading AI Builders Community | AI Hackathons & Developer Events",
  description:
    "Join 1000+ AI developers in Europe's most active AI builders community. Hackathons, meetups, and real AI projects in Turku, Finland — globally connected. Build, learn, and ship AI products with top developers.",
  keywords: [
    "AI community",
    "AI hackathon",
    "AI builders",
    "hackathon Europe",
    "AI developers",
    "machine learning community",
    "artificial intelligence",
    "AI events Finland",
    "developer community",
    "AI projects",
    "Turku AI",
    "Nordic AI",
  ],
  authors: [{ name: "Since AI" }],
  creator: "Since AI",
  publisher: "Since AI",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Since AI - Europe's Leading AI Builders Community",
    description:
      "1000+ AI developers building real AI products. Hackathons, meetups, and community in Turku, Finland — globally connected.",
    url: "https://sinceai.fi",
    siteName: "Since AI",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/assets/logo/SINCE AI full black.png",
        width: 1200,
        height: 630,
        alt: "Since AI - Europe's Leading AI Builders Community",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@sinceaihq",
    creator: "@sinceaihq",
    title: "Since AI - Europe's Leading AI Builders Community",
    description:
      "1000+ AI developers building real AI products. Hackathons, meetups, and community in Turku, Finland.",
    images: ["/assets/logo/SINCE AI full black.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = getOrganizationSchema();

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} font-sans antialiased bg-black`}
      >
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
