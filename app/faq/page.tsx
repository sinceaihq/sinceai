import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { FadeIn } from "@/components/motion-primitives/fade-in";
import { ORG } from "@/lib/org";
import StructuredData from "@/components/StructuredData";
import { faqs } from "@/data/faqs";

export const metadata: Metadata = {
  title:
    "Frequently Asked Questions about Since AI | Europe's AI Builders Ecosystem",
  description:
    "Answers to common questions about Since AI — Europe's execution-focused AI innovation ecosystem. Covers partnerships, hackathons, joining, funding, and more.",
  alternates: { canonical: "https://sinceai.fi/faq" },
  openGraph: {
    title:
      "Frequently Asked Questions about Since AI | Europe's AI Builders Ecosystem",
    description:
      "Answers to common questions about Since AI — partnerships, hackathons, joining, funding, and more.",
    url: "https://sinceai.fi/faq",
    siteName: "Since AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ | Since AI",
    description:
      "Answers to common questions about Since AI — Europe's execution-focused AI innovation ecosystem.",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.answer,
    },
  })),
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://sinceai.fi/",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "FAQ",
      item: "https://sinceai.fi/faq",
    },
  ],
};

export default function FAQPage() {
  return (
    <SmoothScroll>
      <Navbar />

      <StructuredData data={faqSchema} />
      <StructuredData data={breadcrumbSchema} />

      <main className="flex flex-col w-full bg-black min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-32 md:py-40">
          <FadeIn>
            <div className="prose prose-invert prose-neutral max-w-none">
              {/* 1. H1 */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
                Frequently asked questions about Since AI
              </h1>

              {/* 2. Intro paragraph */}
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-16">
                Since AI is Europe&apos;s execution-focused AI innovation ecosystem, where
                frontier AI becomes shipped products. This page answers the most common
                questions from AI builders, partner companies, researchers, and investors
                about joining, partnering, and participating in Since AI&apos;s network.
                Last updated: April 16, 2026.
              </p>

              {/* 3. FAQ list — flat H3 + p, fully visible to crawlers */}
              <div className="space-y-10">
                {faqs.map((faq) => (
                  <div
                    key={faq.question}
                    className="pb-10 border-b border-white/5 last:border-b-0 last:pb-0"
                  >
                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                      {faq.question}
                    </h3>
                    <p className="text-neutral-400 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>

              {/* Bottom CTA */}
              <div className="mt-16 p-8 rounded-2xl border border-white/10 bg-white/[0.03]">
                <h2 className="text-xl font-bold text-white mb-4 tracking-tight">
                  Still have questions?
                </h2>
                <p className="text-neutral-300 mb-6">
                  Contact{" "}
                  <a
                    href={`mailto:${ORG.contact.infoEmail}`}
                    className="text-white underline hover:text-neutral-300"
                  >
                    {ORG.contact.infoEmail}
                  </a>{" "}
                  or join our Discord community.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href={ORG.social.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02]"
                  >
                    Join Discord →
                  </a>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-full transition-all duration-300 hover:bg-white/15 border border-white/20 hover:border-white/30 hover:scale-[1.02]"
                  >
                    Contact us
                  </Link>
                </div>
              </div>

              {/* Cross-links */}
              <div className="mt-12 pt-6 border-t border-white/5">
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link
                    href="/hackathon"
                    className="text-neutral-400 hover:text-white underline"
                  >
                    Hackathon 2026
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link
                    href="/partners"
                    className="text-neutral-400 hover:text-white underline"
                  >
                    Partner with us
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link
                    href="/for-builders"
                    className="text-neutral-400 hover:text-white underline"
                  >
                    For builders
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link
                    href="/ai-hackathons"
                    className="text-neutral-400 hover:text-white underline"
                  >
                    AI hackathons in Europe
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link
                    href="/about"
                    className="text-neutral-400 hover:text-white underline"
                  >
                    About Since AI
                  </Link>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

        <Footer discordUrl={ORG.social.discord} />
      </main>
    </SmoothScroll>
  );
}
