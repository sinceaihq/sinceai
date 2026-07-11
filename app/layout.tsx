import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import StructuredData from "@/components/StructuredData";
import { CookieConsent } from "@/components/CookieConsent";
import { HackathonPopup } from "@/components/HackathonPopup";
import { ORG } from "@/lib/org";
import { GA_ID } from "@/lib/gtag";

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
  metadataBase: new URL("https://sinceai.ai"),
  title:
    "Since AI — Global Execution-Focused AI Innovation Ecosystem | Hackathons, Applied AI, Research",
  description:
    "Where frontier AI becomes shipped products. Since AI connects 10,000+ AI builders globally with leading AI companies, research groups, and investors through hackathons, open-source collaboration, and applied AI projects. Based in Finland. Open globally.",
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
    title: "Since AI — Global Execution-Focused AI Innovation Ecosystem",
    description:
      "Where frontier AI becomes shipped products. 10,000+ AI builders globally. Backed by Google for Developers, Bayer, Sandvik, Antler, and more.",
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
    title: "Since AI — Global Execution-Focused AI Innovation Ecosystem",
    description:
      "Where frontier AI becomes shipped products. 10,000+ AI builders globally.",
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
  "@type": "Organization",
  "@id": `${ORG.baseUrl}/#organization`,
  name: ORG.name,
  alternateName: ORG.legalName,
  url: ORG.baseUrl,
  logo: `${ORG.baseUrl}/assets/logo/SINCE AI white.png`,
  description:
    "Global execution-focused AI innovation ecosystem. Where frontier AI becomes shipped products. Since AI connects 10,000+ AI builders globally with leading AI companies, research groups, and investors through hackathons, open-source collaboration, and applied AI projects.",
  foundingDate: "2025",
  taxID: ORG.businessId,
  email: ORG.contact.infoEmail,
  nonprofitStatus: "NonprofitType",
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
  ],
  knowsAbout: [
    "Artificial Intelligence",
    "Machine Learning",
    "Applied AI",
    "Generative AI",
    "AI Hackathons",
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
