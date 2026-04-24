import { Metadata } from "next";
import { getFAQSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Contact Since AI - Partnerships, Sponsorships, Community",
  description:
    "Get in touch with Since AI. Partner with us, sponsor the next hackathon, or join our community of 1000+ AI developers.",
  keywords: [
    "Since AI",
    "contact",
    "partnership",
    "sponsorship",
    "hackathon",
    "AI community",
    "Turku Finland", 
  ],
  alternates: {
    canonical: "https://sinceai.fi/contact",
  },
  openGraph: {
    title: "Contact Since AI — Partnerships, Sponsorships, Community",
    description:
      "Get in touch with Since AI. Partner with us, sponsor Since AI Hackathon 2026, or join 10,000+ AI builders globally.",
    type: "website",
    locale: "en_US",
    siteName: "Since AI",
    url: "https://sinceai.fi/contact",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Since AI",
    description:
      "Get in touch with Since AI. Partner with us, sponsor the next hackathon, or join our community.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// FAQ data matching ContactFAQ component
const faqData = [
  {
    question: "What sponsorship options are available?",
    answer: "Every partnership is custom-tailored to your goals. Whether you're looking to recruit talent, build brand awareness, or support the AI community, we'll create a solution that works. Email us or fill out the contact form with your objectives, and we'll get back to you with options.",
  },
  {
    question: "How do I join the community?",
    answer: "Join our Discord server for free! You'll get access to member-only channels, our job board, networking events, and updates about upcoming hackathons. It's the best way to connect with 1000+ AI developers, founders, and enthusiasts.",
  },
  {
    question: "What's the best way to reach you?",
    answer: "For general inquiries, fill out the contact form above. For urgent matters, email us directly at info@sinceai.fi. We typically respond within 24 hours. For partnership discussions, you can also reach out to individual team members listed on this page.",
  },
  {
    question: "Where are you based?",
    answer: "Since AI is based in Turku, Finland. We're a registered non-profit organization (Since AI ry, Business ID: 3593920-2) focused on fostering innovation and AI development in the region and beyond. Our hackathons and events are typically held in Turku, but our community is global.",
  },
  {
    question: "How can I volunteer or contribute?",
    answer: "We're always looking for passionate individuals to help with events, content creation, community management, and more. Join our Discord and let us know you're interested in contributing. We'll find a way to get you involved!",
  },
];

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const faqSchema = getFAQSchema(faqData);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema),
        }}
      />
      {children}
    </>
  );
}
