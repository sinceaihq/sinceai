import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import StructuredData from "@/components/StructuredData";
import { CookieConsent } from "@/components/CookieConsent";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sinceai.fi"),
  title:
    "Since AI — Europe's Execution-Focused AI Innovation Ecosystem | Hackathons, Applied AI, Research",
  description:
    "Where frontier AI becomes shipped products. Since AI connects 10,000+ AI builders across Europe with leading AI companies, research groups, and investors through hackathons, open-source collaboration, and applied AI projects. Based in Finland. Open globally.",
  keywords: [
    "AI community Europe",
    "AI hackathon Europe",
    "European AI ecosystem",
    "applied AI",
    "AI builders",
    "Finland AI",
    "AI hackathon 2026",
    "Since AI",
  ],
  authors: [{ name: "Since AI" }],
  creator: "Since AI",
  publisher: "Since AI",
  alternates: {
    canonical: "https://sinceai.fi",
  },
  openGraph: {
    title: "Since AI — Europe's Execution-Focused AI Innovation Ecosystem",
    description:
      "Where frontier AI becomes shipped products. 10,000+ AI builders across Europe. Backed by Google for Developers, Bayer, Sandvik, Antler, and more.",
    url: "https://sinceai.fi",
    siteName: "Since AI",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://sinceai.fi/assets/og/hero.png",
        width: 1200,
        height: 630,
        alt: "Since AI — Europe's execution-focused AI innovation ecosystem",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@sinceaihq",
    creator: "@sinceaihq",
    title: "Since AI — Europe's Execution-Focused AI Innovation Ecosystem",
    description:
      "Where frontier AI becomes shipped products. 10,000+ AI builders across Europe.",
    images: ["https://sinceai.fi/assets/og/hero.png"],
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

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://sinceai.fi/#organization",
  name: "Since AI",
  alternateName: "Since AI ry",
  url: "https://sinceai.fi",
  logo: "https://sinceai.fi/assets/logo/SINCE AI white.png",
  description:
    "Europe's execution-focused AI innovation ecosystem. Where frontier AI becomes shipped products. Since AI connects 10,000+ AI builders across Europe with leading AI companies, research groups, and investors through hackathons, open-source collaboration, and applied AI projects.",
  foundingDate: "2025",
  taxID: "3593920-2",
  email: "info@sinceai.fi",
  nonprofitStatus: "NonprofitType",
  location: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Turku",
      addressCountry: "FI",
    },
  },
  areaServed: [
    { "@type": "Place", name: "Europe" },
    { "@type": "Country", name: "Finland" },
    { "@type": "Country", name: "Estonia" },
    { "@type": "Country", name: "Sweden" },
    { "@type": "Country", name: "Germany" },
    { "@type": "Country", name: "United Kingdom" },
  ],
  sameAs: [
    "https://discord.com/invite/YkqJswRGSW",
    "https://www.linkedin.com/company/sinceai",
    "https://x.com/sinceaihq",
    "https://github.com/sinceaihq",
    "https://www.instagram.com/sinceaihq",
    "https://medium.com/@sinceai",
    "https://t.me/sinceaihq",
    "https://www.facebook.com/sinceai",
    "https://www.youtube.com/@sinceaihq",
    "https://sinceai.substack.com",
  ],
  knowsAbout: [
    "Artificial Intelligence",
    "Machine Learning",
    "Applied AI",
    "Generative AI",
    "AI Hackathons",
    "European AI ecosystem",
    "AI startup creation",
    "Open-source AI",
    "Frontier AI",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://sinceai.fi/#website",
  url: "https://sinceai.fi",
  name: "Since AI",
  publisher: { "@id": "https://sinceai.fi/#organization" },
  inLanguage: "en",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${inter.variable}`}>
      <head>
        <StructuredData data={organizationSchema} />
        <StructuredData data={websiteSchema} />
      </head>
      <body className="antialiased bg-black">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
