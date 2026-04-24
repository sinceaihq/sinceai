import React from "react";
import Link from "next/link";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { FadeIn } from "@/components/motion-primitives/fade-in";
import { getBreadcrumbSchema } from "@/lib/schema";
import { ORG } from "@/lib/org";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Statistics & Impact — Since AI Community Metrics | Since AI",
  description:
    "Since AI impact data: 1000+ members, 260+ hackathon participants, 30+ AI projects shipped, 15+ partner companies. Updated February 2026. A global AI innovation ecosystem.",
  keywords: [
    "Since AI statistics",
    "AI community impact",
    "hackathon metrics",
    "AI projects shipped",
    "Since AI numbers",
    "AI community growth",
  ],
  openGraph: {
    title: "Statistics & Impact | Since AI",
    description:
      "1000+ members, 260+ hackathon builders, 30+ projects shipped, 15+ partners. Real metrics from a global AI innovation ecosystem.",
    url: "https://sinceai.fi/stats",
    type: "website",
  },
};

export default function StatsPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "Statistics", url: `${ORG.baseUrl}/stats` },
  ]);

  return (
    <SmoothScroll>
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="flex flex-col w-full bg-black min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-32 md:py-40">
          <FadeIn>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
              Statistics & Impact
            </h1>

            <div className="prose prose-invert prose-neutral max-w-none">
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-4">
                Real metrics from a global AI innovation ecosystem.
                Updated February 2026.
              </p>
              <p className="text-lg text-neutral-400 leading-relaxed mb-12">
                Every number below reflects real builder activity, real company partnerships,
                and real production deployments — not vanity metrics.
              </p>

              {/* Hero Stats Grid */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Community Overview
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">1000+</div>
                    <div className="text-sm text-neutral-500">Active Members</div>
                  </div>
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">260+</div>
                    <div className="text-sm text-neutral-500">Hackathon Participants</div>
                  </div>
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">30+</div>
                    <div className="text-sm text-neutral-500">AI Projects Shipped</div>
                  </div>
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">15+</div>
                    <div className="text-sm text-neutral-500">Partner Companies</div>
                  </div>
                </div>
              </section>

              {/* Community Composition */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Community Composition
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-base">
                  <div>
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-1">Developers & Engineers</dt>
                    <dd className="text-neutral-300">350+</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-1">Students</dt>
                    <dd className="text-neutral-300">75+</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-1">Researchers</dt>
                    <dd className="text-neutral-300">50+</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-1">Industry Professionals</dt>
                    <dd className="text-neutral-300">25+</dd>
                  </div>
                </dl>
              </section>

              {/* Geographic Reach */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Geographic Reach
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-base">
                  <div>
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-1">Countries Represented</dt>
                    <dd className="text-neutral-300">10+</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-1">Headquarters</dt>
                    <dd className="text-neutral-300">Turku, Finland</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-1">Primary Region</dt>
                    <dd className="text-neutral-300">Finland (60%)</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-1">Global (outside Finland)</dt>
                    <dd className="text-neutral-300">40%</dd>
                  </div>
                </dl>
              </section>

              {/* Event Participation */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Event Participation
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-3 pr-4 text-neutral-500 font-semibold">Event</th>
                        <th className="py-3 pr-4 text-neutral-500 font-semibold">Date</th>
                        <th className="py-3 pr-4 text-neutral-500 font-semibold">Participants</th>
                        <th className="py-3 text-neutral-500 font-semibold">Projects</th>
                      </tr>
                    </thead>
                    <tbody className="text-neutral-400">
                      <tr className="border-b border-white/5">
                        <td className="py-3 pr-4 text-neutral-200">Since AI Hackathon 2025</td>
                        <td className="py-3 pr-4">Nov 21-23, 2025</td>
                        <td className="py-3 pr-4">260+</td>
                        <td className="py-3">30+</td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-4 text-neutral-200">Since AI Hackathon 2026</td>
                        <td className="py-3 pr-4">November 2026</td>
                        <td className="py-3 pr-4" colSpan={2}>Upcoming — dates TBA</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Production Outcomes */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Production Outcomes
                </h2>
                <p className="text-neutral-400 leading-relaxed mb-6">
                  Since AI is unique in providing post-hackathon production support, resulting in
                  industry-leading deployment rates for hackathon projects.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.03] text-center">
                    <div className="text-3xl font-bold text-white mb-2">30+</div>
                    <div className="text-sm text-neutral-400">Projects receiving production support</div>
                  </div>
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.03] text-center">
                    <div className="text-3xl font-bold text-white mb-2">8 weeks</div>
                    <div className="text-sm text-neutral-400">Average support duration</div>
                  </div>
                </div>
                <p className="text-neutral-500 text-sm">
                  <Link href="/production-support" className="text-neutral-400 hover:text-white underline">
                    Learn more about our production support program
                  </Link>
                </p>
              </section>

              {/* Partner Network */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Partner Network
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-base mb-6">
                  <div>
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-1">Industry Partners</dt>
                    <dd className="text-neutral-300">15+ (Valmet, Sandvik, Kongsberg, ElevenLabs, Antler, etc.)</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-1">University Partners</dt>
                    <dd className="text-neutral-300">2 (University of Turku, Turku AMK)</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-1">Supporting Organizations</dt>
                    <dd className="text-neutral-300">City of Turku, Business Turku, Aalto AI, AI Mad Lab</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-1">Investor Network</dt>
                    <dd className="text-neutral-300">Antler partnership for startup support</dd>
                  </div>
                </dl>
              </section>

              {/* Production Case Studies */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Production Deployment Case Studies
                </h2>
                <div className="space-y-6">
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">Maritime Sound Signal Detection (Kongsberg)</h3>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <dt className="text-neutral-500">Built</dt>
                        <dd className="text-neutral-300">72 hours</dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500">Support</dt>
                        <dd className="text-neutral-300">8 weeks</dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500">Status</dt>
                        <dd className="text-neutral-300">Production deployment</dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500">Impact</dt>
                        <dd className="text-neutral-300">Real-time maritime safety monitoring</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">Intelligent Spare Part Discovery (Sandvik)</h3>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <dt className="text-neutral-500">Built</dt>
                        <dd className="text-neutral-300">72 hours (RAG-based system)</dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500">Support</dt>
                        <dd className="text-neutral-300">6 weeks</dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500">Status</dt>
                        <dd className="text-neutral-300">Production use</dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500">Impact</dt>
                        <dd className="text-neutral-300">8+ hours saved per search</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section className="p-8 rounded-2xl border border-white/10 bg-white/[0.02]">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  Data Inquiries
                </h2>
                <p className="text-neutral-300 mb-4">
                  For media, research, or partnership inquiries about these statistics:
                </p>
                <p className="text-neutral-400">
                  <strong className="text-white">Email:</strong>{" "}
                  <a href={`mailto:${ORG.contact.infoEmail}`} className="text-white hover:text-neutral-300 underline">
                    {ORG.contact.infoEmail}
                  </a>
                </p>
                <p className="text-sm text-neutral-500 mt-4">
                  Also see:{" "}
                  <Link href="/press" className="text-neutral-400 hover:text-white underline">Press & Media</Link>
                  {" "}|{" "}
                  <Link href="/about" className="text-neutral-400 hover:text-white underline">About Since AI</Link>
                  {" "}|{" "}
                  <Link href="/production-support" className="text-neutral-400 hover:text-white underline">Production Support</Link>
                </p>
              </section>

              <p className="text-xs text-neutral-600 mt-16 pt-6 border-t border-white/5">
                Last updated: February 2026. Next update: May 2026.
              </p>
            </div>
          </FadeIn>
        </div>

        <Footer discordUrl={ORG.social.discord} />
      </main>
    </SmoothScroll>
  );
}
