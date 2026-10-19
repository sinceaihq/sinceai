import { Metadata } from "next";
import { OG_IMAGE } from "@/lib/og";

export const metadata: Metadata = {
  title: "Privacy Policy - Since AI",
  description:
    "Learn how Since AI collects, uses, and protects your personal information. GDPR-compliant privacy policy for our AI community.",
  alternates: {
    canonical: "https://sinceai.ai/privacy",
  },
  openGraph: {
    title: "Privacy Policy — Since AI",
    description:
      "Learn how Since AI collects, uses, and protects your personal information. GDPR-compliant.",
    type: "website",
    locale: "en_US",
    siteName: "Since AI",
    url: "https://sinceai.ai/privacy",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy — Since AI",
    description: "Learn how Since AI collects, uses, and protects your personal information. GDPR-compliant.",
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
