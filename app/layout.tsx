import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import "./globals.css";
import StructuredData from "@/components/StructuredData";
import { CookieConsent } from "@/components/CookieConsent";
import { HackathonPopup } from "@/components/HackathonPopup";
import { ORG } from "@/lib/org";
import { GA_ID } from "@/lib/gtag";

// Self-hosted variable fonts (app/fonts, SIL Open Font License): builds never depend on the
// Google Fonts network, and visitors never contact a third party for them.
// The site font's fallback is a monospace stack with nearly the same advance width (0.6 em),
// so text keeps its line breaks while JetBrains Mono loads.
const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-latin-variable.woff2",
  weight: "100 800",
  style: "normal",
  display: "swap",
  variable: "--font-mono",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", "monospace"],
});

// Used only where explicitly needed, so it is not preloaded ahead of the site font.
const inter = localFont({
  src: "./fonts/Inter-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-sans",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sinceai.ai"),
  title:
    "Since AI | Global Execution-Focused AI Innovation Ecosystem",
  description:
    "A global ecosystem of 10,000+ AI builders. Hackathons with leading companies — and eight weeks of production support to take the best solutions to real users.",
  keywords: [
    "AI community global",
    "AI hackathon global",
    "Global AI ecosystem",
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
    canonical: "https://sinceai.ai",
  },
  openGraph: {
    title: "Since AI | Global Execution-Focused AI Innovation Ecosystem",
    description:
      "A global ecosystem of 10,000+ AI builders in 100+ countries, with Google for Developers, ElevenLabs, Bayer, Valmet, Antler and 100+ partners and supporters.",
    url: "https://sinceai.ai",
    siteName: "Since AI",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://sinceai.ai/assets/og/hero.png",
        width: 1200,
        height: 630,
        alt: "Since AI — Global execution-focused AI innovation ecosystem",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@sinceaihq",
    creator: "@sinceaihq",
    title: "Since AI | Global Execution-Focused AI Innovation Ecosystem",
    description:
      "A global ecosystem of 10,000+ AI builders — hackathons with leading companies and eight weeks of production support.",
    images: ["https://sinceai.ai/assets/og/hero.png"],
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
  "@type": ["Organization", "NGO"],
  "@id": `${ORG.baseUrl}/#organization`,
  name: ORG.name,
  alternateName: ORG.legalName,
  legalName: ORG.legalName,
  url: ORG.baseUrl,
  logo: { "@type": "ImageObject", url: ORG.logoUrl, width: 4000, height: 4000 },
  description: ORG.mission.purpose,
  foundingDate: "2025",
  taxID: ORG.businessId,
  email: ORG.contact.infoEmail,
  location: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: ORG.location.city,
      addressCountry: ORG.location.countryCode,
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
    ORG.social.discord,
    ORG.social.linkedin,
    ORG.social.x,
    ORG.social.github,
    ORG.social.instagram,
    ORG.social.telegram,
    ORG.social.facebook,
    ORG.social.youtube,
    ORG.social.substack,
    ORG.social.reddit,
    ORG.social.tiktok,
  ],
  knowsAbout: [
    "Artificial Intelligence",
    "Machine Learning",
    "Applied AI",
    "Generative AI",
    "AI Hackathons",
    "AI education",
    "Technological literacy",
    "Global AI ecosystem",
    "AI startup creation",
    "Open-source AI",
    "Frontier AI",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${ORG.baseUrl}/#website`,
  url: ORG.baseUrl,
  name: ORG.name,
  publisher: { "@id": `${ORG.baseUrl}/#organization` },
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
        <Script id="consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'denied',
              wait_for_update: 500
            });
            gtag('set', 'url_passthrough', true);
            gtag('set', 'ads_data_redaction', true);
          `}
        </Script>
      </head>
      <body className="antialiased bg-black">
        {children}
        <CookieConsent />
        <HackathonPopup />
        <GoogleAnalytics gaId={GA_ID} />
      </body>
    </html>
  );
}
