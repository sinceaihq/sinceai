import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Hackathon Guides & Community Resources | Since AI Blog",
  description:
    "Guides from the global Since AI builder community: hackathon strategy, tech stack choices, project ideas and the best AI developer events worldwide.",
  keywords: [
    "AI hackathon guide",
    "hackathon team building",
    "AI hackathon tips",
    "win hackathon",
    "hackathon tech stack",
    "AI project ideas",
    "hackathon demo",
    "AI hackathons global",
    "best hackathons",
    "AI community blog",
    "hackathon strategies",
    "AI development tools",
    "global developer events",
    "Since AI blog",
  ],
  alternates: {
    canonical: "https://sinceai.ai/blog",
    types: {
      "application/rss+xml": "https://sinceai.ai/blog/feed.xml",
    },
  },
  openGraph: {
    title: "AI Hackathon Guides & Community Resources | Since AI Blog",
    description:
      "Comprehensive guides from the leading global AI builders community. Hackathon strategies, tech stacks, project ideas, and developer events.",
    url: "https://sinceai.ai/blog",
    siteName: "Since AI",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/api/og/blog",
        width: 1200,
        height: 630,
        alt: "Since AI Blog - AI Hackathon Guides & Resources",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Hackathon Guides & Community Resources | Since AI Blog",
    description:
      "Comprehensive guides from the leading global AI builders community. Hackathon strategies, tech stacks, project ideas, and developer events.",
    images: ["/api/og/blog"],
  },
  other: {
    "article:section": "AI & Technology",
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
