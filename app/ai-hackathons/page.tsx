import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { FadeIn } from "@/components/motion-primitives/fade-in";
import { getBreadcrumbSchema } from "@/lib/schema";
import { ORG } from "@/lib/org";
import StructuredData from "@/components/StructuredData";

export const metadata: Metadata = {
  title: "AI Hackathons in Europe 2026 — Best AI Hackathons & Events | Since AI",
  description:
    "The definitive guide to AI hackathons in Europe. Since AI Hackathon 2026: November 6–8, Turku, Finland — 72 hours, 1,000+ builders, partner challenges from Google, Bayer, Sandvik. Free to attend.",
  keywords: [
    "AI hackathons Europe",
    "AI hackathon 2026",
    "best AI hackathons Europe",
    "AI hackathon Finland",
    "European AI hackathon",
    "hackathon AI builders",
    "apply AI hackathon",
    "Since AI Hackathon",
  ],
  alternates: {
    canonical: "https://sinceai.fi/ai-hackathons",
  },
  openGraph: {
    title: "AI Hackathons in Europe 2026 | Since AI",
    description:
      "Since AI Hackathon 2026: November 6–8, Turku, Finland. 72 hours, 1,000+ builders, real partner challenges. Free to attend.",
    url: "https://sinceai.fi/ai-hackathons",
    siteName: "Since AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Hackathons in Europe 2026 | Since AI",
    description:
      "Since AI Hackathon 2026: Nov 6–8, Turku. 72 hours, 1,000+ builders, challenges from Google, Bayer, Sandvik, Kongsberg, Valmet.",
  },
};

const whatMakesGreat = [
  {
    title: "Real partner challenges",
    body: "The best AI hackathons give you actual engineering problems from real companies, not synthetic prompts. The Since AI model: partners co-design challenges with us before the event so every track is feasible, production-relevant, and commercially meaningful.",
  },
  {
    title: "Production-focused mentorship",
    body: "Great hackathons have mentors who push you toward deployable code, not demo polish. Look for events where mentors include domain engineers from the sponsoring companies.",
  },
  {
    title: "Post-event support",
    body: "Most hackathons end on Sunday. The best ones continue: architecture review, deployment guidance, integration support. This is the difference between a portfolio project and a production system.",
  },
  {
    title: "Serious talent density",
    body: "The quality of your team and the teams around you determines the output quality. Seek events that filter for builders who ship — not just networking events branded as hackathons.",
  },
];

const sinceAiEdge = [
  {
    label: "Duration",
    since: "72 hours (Fri–Sun)",
    typical: "24–48 hours",
  },
  {
    label: "Challenges",
    since: "Co-designed with partners",
    typical: "Submitted day-of",
  },
  {
    label: "Post-event",
    since: "Production support program",
    typical: "None",
  },
  {
    label: "Partners",
    since: "Google, Bayer, Sandvik, Kongsberg, Valmet, ElevenLabs",
    typical: "Variable",
  },
  {
    label: "Venture path",
    since: "Antler partnership",
    typical: "Rare",
  },
  {
    label: "Cost",
    since: "Free",
    typical: "Free to £100+",
  },
];

const upcomingEvents = [
  {
    name: "Since AI Hackathon 2026",
    date: "November 6–8, 2026",
    location: "Turku, Finland",
    format: "In-person, 72 hours",
    size: "1,000+ builders targeted",
    url: "/hackathon",
    highlight: true,
  },
];

const tips = [
  {
    title: "Come with a team, or form one on day one",
    body: "Most hackathons have team formation sessions at the start. Arriving solo is fine — come with skills you can articulate clearly (e.g., 'I can fine-tune and deploy LLMs' or 'I can build a production FastAPI backend in 2 hours').",
  },
  {
    title: "Scope ruthlessly",
    body: "The #1 hackathon failure mode is over-scoping. Pick the smallest version of your idea that would impress the challenge sponsor. Ship that first. Add features after.",
  },
  {
    title: "Talk to the mentors early",
    body: "Mentors from partner companies know exactly what 'good' looks like for their challenge. 10 minutes with the right mentor in hour 2 is worth more than 10 hours of guessing.",
  },
  {
    title: "Think about deployment from hour one",
    body: "If your solution can't be deployed by the demo, it's a prototype. Choose infrastructure you know, keep dependencies minimal, and have your hosting sorted before the hackathon starts.",
  },
  {
    title: "Document as you build",
    body: "Your README and architecture diagram matter. Judges and sponsors who could hire you or take the project forward need to understand what you built and why.",
  },
];

export default function AIHackathonsPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "AI Hackathons in Europe", url: `${ORG.baseUrl}/ai-hackathons` },
  ]);

  const eventListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AI Hackathons in Europe 2026",
    description: "List of major AI hackathons in Europe, including Since AI Hackathon 2026",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        item: {
          "@id": "https://sinceai.fi/hackathon#event",
          "@type": "Event",
          name: "Since AI Hackathon 2026",
          startDate: "2026-11-06",
          endDate: "2026-11-08",
          location: {
            "@type": "Place",
            name: "Educity, Turku, Finland",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Turku",
              addressCountry: "FI",
            },
          },
          url: "https://sinceai.fi/hackathon",
          organizer: { "@id": "https://sinceai.fi/#organization" },
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "EUR",
            availability: "https://schema.org/InStock",
          },
        },
      },
    ],
  };

  return (
    <SmoothScroll>
      <Navbar />

      <StructuredData data={breadcrumbSchema} />
      <StructuredData data={eventListSchema} />

      <main className="flex flex-col w-full bg-black min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-32 md:py-40">
          <FadeIn>
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-neutral-500 mb-5">
              AI Hackathons
            </p>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
              AI Hackathons in Europe
            </h1>

            <div className="prose prose-invert prose-neutral max-w-none">
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-6">
                Europe&apos;s AI hackathon ecosystem is growing fast. Since AI runs the
                continent&apos;s most execution-focused AI hackathon — 72 hours, real
                partner challenges, production mentorship, and post-event support.
              </p>
              <p className="text-lg text-neutral-400 leading-relaxed mb-12">
                This page covers what makes a great AI hackathon, the Since AI Hackathon
                2026, and how to get the most out of these events.
              </p>

              {/* Upcoming events */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  Upcoming AI hackathons
                </h2>
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <div
                      key={event.name}
                      className="p-6 rounded-xl border border-white/10 bg-white/[0.03]"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-white mb-2">{event.name}</h3>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-neutral-400 mb-3">
                            <span>{event.date}</span>
                            <span className="text-neutral-700" aria-hidden="true">·</span>
                            <span>{event.location}</span>
                            <span className="text-neutral-700" aria-hidden="true">·</span>
                            <span>{event.format}</span>
                            <span className="text-neutral-700" aria-hidden="true">·</span>
                            <span>{event.size}</span>
                          </div>
                          <p className="text-neutral-400 text-sm">
                            Partner challenges from Google for Developers, Bayer, Sandvik,
                            Kongsberg, Valmet. Free to attend. Open globally.
                          </p>
                        </div>
                        <Link
                          href={event.url}
                          className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-black bg-white rounded-full hover:bg-neutral-100 transition-all hover:scale-[1.02] whitespace-nowrap"
                        >
                          Apply now →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-neutral-500 text-sm mt-4">
                  More events announced on our{" "}
                  <Link href={ORG.social.discord} className="text-neutral-400 hover:text-white underline">
                    Discord
                  </Link>{" "}
                  and{" "}
                  <Link href={ORG.social.telegram} className="text-neutral-400 hover:text-white underline">
                    Telegram
                  </Link>
                  .
                </p>
              </section>

              {/* What makes a great AI hackathon */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  What makes a great AI hackathon
                </h2>
                <div className="space-y-5">
                  {whatMakesGreat.map((item) => (
                    <div
                      key={item.title}
                      className="p-6 rounded-xl border border-white/5 bg-white/[0.02]"
                    >
                      <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-neutral-400 text-sm leading-relaxed">{item.body}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Since AI vs typical */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Since AI Hackathon vs the typical event
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-3 pr-6 text-neutral-500 font-semibold">Feature</th>
                        <th className="py-3 pr-6 text-white font-semibold">Since AI Hackathon</th>
                        <th className="py-3 text-neutral-500 font-semibold">Typical AI hackathon</th>
                      </tr>
                    </thead>
                    <tbody className="text-neutral-400">
                      {sinceAiEdge.map((row) => (
                        <tr key={row.label} className="border-b border-white/5">
                          <td className="py-3 pr-6 text-neutral-300">{row.label}</td>
                          <td className="py-3 pr-6 text-neutral-200">{row.since}</td>
                          <td className="py-3">{row.typical}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* What is an AI hackathon */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  What is an AI hackathon?
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  An AI hackathon is a time-limited event — typically 24 to 72 hours —
                  where teams of developers, engineers, and researchers build AI-powered
                  solutions to specific challenges. At the best events, those challenges come
                  directly from industry partners with real production problems.
                </p>
                <p className="text-neutral-400 leading-relaxed mb-4">
                  Participants work in teams of 2–6, with access to APIs, compute credits,
                  datasets, and mentorship. At the end of the event, teams demo their
                  projects to a panel of judges from partner companies and the AI industry.
                </p>
                <p className="text-neutral-400 leading-relaxed">
                  The best AI hackathons differ from general hackathons in their focus on
                  frontier models, deployment challenges, and the gap between research and
                  production. At Since AI events, the focus is explicitly on building systems
                  that work in production — not just demos.
                </p>
              </section>

              {/* Tips */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  How to succeed at an AI hackathon
                </h2>
                <div className="space-y-5">
                  {tips.map((tip) => (
                    <div key={tip.title} className="flex gap-4 items-start">
                      <span className="text-white font-bold mt-1 min-w-[8px]">—</span>
                      <div>
                        <span className="text-white font-semibold">{tip.title}:</span>{" "}
                        <span className="text-neutral-400">{tip.body}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Who is Since AI */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Who organizes Since AI Hackathon?
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  Since AI is a non-profit organization based in Turku, Europe&apos;s
                  execution-focused AI innovation ecosystem — connecting 10,000+ AI builders
                  across Europe with leading AI companies, research groups, and investors.
                </p>
                <p className="text-neutral-400 leading-relaxed mb-6">
                  Since AI Hackathon 2026 is our flagship annual event. It is backed by
                  Google for Developers, Bayer, Sandvik, Kongsberg, Valmet, ElevenLabs,
                  Aiven, Lovable, Antler, Inventure, Wave Ventures, and the universities of
                  Turku and Aalto.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/hackathon"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02]"
                  >
                    Apply to Hackathon 2026 →
                  </Link>
                  <Link
                    href="/about"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-full transition-all duration-300 hover:bg-white/15 border border-white/20 hover:border-white/30 hover:scale-[1.02]"
                  >
                    About Since AI
                  </Link>
                </div>
              </section>

              {/* Find more */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  How to find AI hackathons in Europe
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  Beyond Since AI events, several resources aggregate European hackathons and
                  developer events:
                </p>
                <ul className="space-y-3 text-neutral-400">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">—</span>
                    <span>
                      <strong className="text-white">Since AI Discord & Telegram:</strong>{" "}
                      We share notable AI hackathons across Europe in our community channels.{" "}
                      <a
                        href={ORG.social.discord}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-neutral-300 hover:text-white underline"
                      >
                        Join here.
                      </a>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">—</span>
                    <span>
                      <strong className="text-white">Devpost:</strong> Largest hackathon
                      aggregator. Filter by region and prize type to find EU-based events.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">—</span>
                    <span>
                      <strong className="text-white">LinkedIn Events:</strong> Following AI
                      labs, incubators, and innovation programs in your target region surfaces
                      events early.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">—</span>
                    <span>
                      <strong className="text-white">University AI societies:</strong> Aalto
                      AI, HankenAI, and equivalent groups at top European tech universities
                      run or aggregate local hackathons.
                    </span>
                  </li>
                </ul>
              </section>

              {/* Cross-links */}
              <section className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 tracking-tight">
                  Explore more
                </h2>
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link href="/hackathon" className="text-neutral-400 hover:text-white underline">
                    Since AI Hackathon 2026
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link href="/for-builders" className="text-neutral-400 hover:text-white underline">
                    For builders
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link href="/europe-ai" className="text-neutral-400 hover:text-white underline">
                    European AI ecosystem
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link href="/partners" className="text-neutral-400 hover:text-white underline">
                    Partner with Since AI
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link href="/faq" className="text-neutral-400 hover:text-white underline">
                    FAQ
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link href="/about" className="text-neutral-400 hover:text-white underline">
                    About
                  </Link>
                </div>
              </section>

              <p className="text-xs text-neutral-600 mt-16 pt-6 border-t border-white/5">
                Last updated: April 2026
              </p>
            </div>
          </FadeIn>
        </div>

        <Footer discordUrl={ORG.social.discord} />
      </main>
    </SmoothScroll>
  );
}
