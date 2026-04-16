import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Hackathon Guides & Community Resources | Since AI Blog",
  description:
    "Comprehensive guides from Europe's leading AI builders community. Learn hackathon strategies, tech stack choices, project ideas, and discover the best AI developer events across Europe.",
  keywords: [
    "AI hackathon guide",
    "hackathon team building",
    "AI hackathon tips",
    "win hackathon",
    "hackathon tech stack",
    "AI project ideas",
    "hackathon demo",
    "AI hackathons Europe",
    "best hackathons",
    "AI community blog",
    "hackathon strategies",
    "AI development tools",
    "European developer events",
    "Since AI blog",
  ],
  alternates: {
    canonical: "https://sinceai.fi/blog",
  },
  openGraph: {
    title: "AI Hackathon Guides & Community Resources | Since AI Blog",
    description:
      "Comprehensive guides from Europe's leading AI builders community. Hackathon strategies, tech stacks, project ideas, and developer events.",
    url: "https://sinceai.fi/blog",
    siteName: "Since AI",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/assets/logo/SINCE AI full black.png",
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
      "Comprehensive guides from Europe's leading AI builders community. Hackathon strategies, tech stacks, project ideas, and developer events.",
    images: ["/assets/logo/SINCE AI full black.png"],
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
