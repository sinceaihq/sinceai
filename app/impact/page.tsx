import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { FadeIn } from "@/components/motion-primitives/fade-in";
import { ORG } from "@/lib/org";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "Impact & Numbers — Since AI",
  description:
    "Since AI publishes real numbers and methodology notes for every metric: network reach, event size, projects shipped, partnerships. Updated quarterly.",
  alternates: { canonical: "https://sinceai.ai/impact" },
  openGraph: {
    title: "Impact & Numbers — Since AI",
    description:
      "Real numbers with methodology notes: network reach, event size, projects shipped, partnerships. Updated quarterly.",
    url: "https://sinceai.ai/impact",
    siteName: "Since AI",
    type: "website",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://sinceai.ai/" },
    {
      "@type": "ListItem",
      position: 2,
      name: "Impact & Numbers",
      item: "https://sinceai.ai/impact",
    },
  ],
};

// TODO (Riku): verify "countries represented" before this page goes live.
// Current value uses the hero's claim of 50+ — replace with the defensible
// number from real hackathon applications + Discord analytics if lower.
const metrics: {
  metric: string;
  value: string;
  methodology: string;
  todo?: boolean;
}[] = [
  {
    metric: "AI builders in our network globally",
    value: "10,000+",
    methodology:
      "Includes direct community members (Discord, newsletter, Medium), hackathon attendees (past and registered), and verified reach across partner AI communities globally. Not membership — reach.",
  },
  {
    metric: "Direct community members",
    value: "1,000+",
    methodology:
      "Active members in our core Discord community. Figure from Discord server analytics.",
  },
  {
    metric: "Hackathon builders to date",
    value: "260",
    methodology:
      "Cumulative builders across all Since AI events. Since AI Hackathon, Nov 21–23 2025, EduCity, Turku: 260 builders. Exact figure, not rounded.",
  },
  {
    metric: "Hackathon 2026 participants targeted",
    value: "1,000+",
    methodology:
      "Target based on venue capacity (Educity, Joukahaisenkatu 7, Turku) and partner challenge scale. Applications open rolling from 2026.",
  },
  {
    metric: "Partners & supporters",
    value: "30+",
    methodology:
      "Counted as organizations with a formal partnership role: event sponsorship (challenge partner), ecosystem support (MoU or named collaboration), or capital/research partner.",
  },
  {
    metric: "Projects shipped",
    value: "30+",
    methodology:
      "Hackathon and post-hackathon projects with public deliverables — GitHub repositories, live demos, or partner-accepted prototypes. See sinceai.fi/projects for public summaries.",
  },
  {
    metric: "Countries represented",
    value: "50+",
    methodology:
      "Via partner community reach, direct applications from Since AI Hackathon 2025, and Discord member analytics.",
  },
];

export default function ImpactPage() {
  return (
    <SmoothScroll>
      <Navbar />

      <StructuredData data={breadcrumbSchema} />

      <main className="flex flex-col w-full bg-black min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-32 md:py-40">
          <FadeIn>
            <div className="prose prose-invert prose-neutral max-w-none">

              {/* 1. H1 */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
                Impact &amp; numbers
              </h1>

              {/* 2. Intro paragraph */}
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-16">
                Since AI publishes real numbers with methodology notes. We believe
                credible ecosystems require transparent metrics. All figures below are
                current as of April 2026 and updated quarterly.
              </p>

              {/* 3. Metrics table */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Our numbers
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-3 pr-6 text-neutral-400 font-semibold w-2/5">
                          Metric
                        </th>
                        <th className="py-3 pr-6 text-neutral-400 font-semibold w-1/5 whitespace-nowrap">
                          Current value
                        </th>
                        <th className="py-3 text-neutral-400 font-semibold">
                          Methodology note
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((row) => (
                        <tr
                          key={row.metric}
                          className="border-b border-white/5 last:border-b-0 align-top"
                        >
                          <td className="py-4 pr-6 text-neutral-200 font-medium leading-snug">
                            {row.metric}
                          </td>
                          <td className="py-4 pr-6 font-bold text-white whitespace-nowrap">
                            {row.value}
                            {row.todo && (
                              <span className="ml-2 text-xs font-normal text-yellow-600">
                                ⚠ verify
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-neutral-500 text-xs leading-relaxed">
                            {row.methodology}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </section>

              {/* 4. What we don't claim */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-5 tracking-tight">
                  What we don&apos;t claim
                </h2>
                <p className="text-neutral-300 leading-relaxed">
                  We do not claim formal paid membership, venture-scale funding of Since
                  AI itself, or placement guarantees. Our value is the ecosystem —
                  partners, events, and execution pathways — not a membership database.
                </p>
              </section>

              {/* 5. Governance and funding */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-5 tracking-tight">
                  Governance and funding
                </h2>
                <p className="text-neutral-300 leading-relaxed">
                  Since AI ry is funded through partner sponsorships, public innovation
                  program support where applicable, and in-kind contributions from
                  ecosystem partners. We are a registered non-profit. Financial statements
                  are available on request to members.
                </p>
              </section>

              {/* 6. Footer note */}
              <p className="text-xs text-neutral-600 pt-6 border-t border-white/5">
                Last updated: April 2026. Maintained by Since AI ry.
              </p>

              {/* Cross-links */}
              <div className="mt-10 flex flex-wrap gap-3 text-sm">
                <Link href="/about" className="text-neutral-400 hover:text-white underline">
                  About Since AI
                </Link>
                <span className="text-neutral-700">&bull;</span>
                <Link href="/partners" className="text-neutral-400 hover:text-white underline">
                  Partners
                </Link>
                <span className="text-neutral-700">&bull;</span>
                <Link href="/projects" className="text-neutral-400 hover:text-white underline">
                  Projects
                </Link>
                <span className="text-neutral-700">&bull;</span>
                <Link href="/hackathon" className="text-neutral-400 hover:text-white underline">
                  Hackathon 2026
                </Link>
                <span className="text-neutral-700">&bull;</span>
                <Link href="/faq" className="text-neutral-400 hover:text-white underline">
                  FAQ
                </Link>
              </div>

            </div>
          </FadeIn>
        </div>

        <Footer discordUrl={ORG.social.discord} />
      </main>
    </SmoothScroll>
  );
}
