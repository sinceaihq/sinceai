import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Since AI",
  description:
    "Review the terms and conditions for participating in the Since AI community, events, and services.",
  alternates: {
    canonical: "https://sinceai.fi/terms",
  },
  openGraph: {
    title: "Terms of Service — Since AI",
    description:
      "Review the terms and conditions for participating in the Since AI community and services.",
    type: "website",
    locale: "en_US",
    siteName: "Since AI",
    url: "https://sinceai.fi/terms",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
