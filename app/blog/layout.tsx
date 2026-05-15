import type { Metadata } from "next";
import StructuredData from "@/components/StructuredData";
import { getBlogSchema, getBlogItemListSchema, getBreadcrumbSchema, getBlogFAQSchema } from "@/lib/schema";
import { ORG } from "@/lib/org";

export const metadata: Metadata = {
  title: "AI Hackathon Guides & Community Resources | Since AI Blog",
  description:
    "Comprehensive guides from the leading global AI builders community. Learn hackathon strategies, tech stack choices, project ideas, and discover the best AI developer events globally.",
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
      "Comprehensive guides from the leading global AI builders community. Hackathon strategies, tech stacks, project ideas, and developer events.",
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
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "Blog", url: `${ORG.baseUrl}/blog` },
  ]);

  return (
    <>
      <StructuredData data={getBlogSchema()} />
      <StructuredData data={getBlogItemListSchema()} />
      <StructuredData data={breadcrumbSchema} />
      <StructuredData data={getBlogFAQSchema()} />
      {children}
    </>
  );
}
