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
  title: "Production Support — From Hackathon to Deployment | Since AI",
  description:
    "Since AI provides 8+ weeks of post-hackathon production support. We help companies deploy winning AI projects to production with architecture review, deployment guidance, and ongoing mentorship.",
  keywords: [
    "AI production support",
    "hackathon to production",
    "AI deployment support",
    "post-hackathon support",
    "AI project deployment",
    "production-ready AI",
    "Since AI",
  ],
  openGraph: {
    title: "Production Support — From Hackathon to Deployment | Since AI",
    description:
      "Most hackathons end with a demo. Since AI projects become production systems. 8+ weeks of deployment support for winning projects.",
    url: "https://sinceai.ai/production-support",
    type: "website",
  },
};

export default function ProductionSupportPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "Production Support", url: `${ORG.baseUrl}/production-support` },
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
              Production Support
            </h1>

            <div className="prose prose-invert prose-neutral max-w-none">
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-8">
                Most hackathons end with a demo and a trophy. Since AI projects become
                production systems. We provide 8+ weeks of post-hackathon support to help
                companies deploy winning AI projects.
              </p>

              <p className="text-lg text-neutral-400 leading-relaxed mb-12">
                This is what makes Since AI fundamentally different from every other hackathon
                organizer: we don&apos;t walk away after the event. We stay with you until the
                solution is running in production.
              </p>

              {/* Post-Hackathon Timeline */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Our Post-Hackathon Production Support
                </h2>

                <div className="space-y-6">
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">Week 1-2: Architecture Review</h3>
                    <ul className="text-neutral-400 text-sm space-y-2 leading-relaxed">
                      <li>• Review code architecture for production readiness</li>
                      <li>• Identify scaling bottlenecks and optimization opportunities</li>
                      <li>• Security and compliance assessment</li>
                      <li>• Documentation requirements</li>
                      <li>• Deployment strategy planning</li>
                    </ul>
                  </div>

                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">Week 3-4: Production Preparation</h3>
                    <ul className="text-neutral-400 text-sm space-y-2 leading-relaxed">
                      <li>• Infrastructure setup guidance</li>
                      <li>• CI/CD pipeline configuration</li>
                      <li>• Testing and quality assurance</li>
                      <li>• Integration with company systems</li>
                      <li>• Performance optimization</li>
                    </ul>
                  </div>

                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">Week 5-8: Deployment Support</h3>
                    <ul className="text-neutral-400 text-sm space-y-2 leading-relaxed">
                      <li>• Staging environment deployment</li>
                      <li>• Production rollout strategy</li>
                      <li>• Monitoring and logging setup</li>
                      <li>• Incident response planning</li>
                      <li>• User training materials</li>
                    </ul>
                  </div>

                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">Month 3+: Ongoing Support</h3>
                    <ul className="text-neutral-400 text-sm space-y-2 leading-relaxed">
                      <li>• Performance monitoring</li>
                      <li>• Optimization recommendations</li>
                      <li>• Feature development guidance</li>
                      <li>• Technical mentorship</li>
                      <li>• Community collaboration</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Success Stories */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Production Deployment Examples
                </h2>

                <div className="space-y-6">
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.03]">
                    <h3 className="text-lg font-bold text-white mb-2">Maritime Sound Signal Detection (Kongsberg)</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-3">
                      Built in 72 hours during the hackathon. After 8 weeks of production support including
                      architecture review and deployment guidance, the system was deployed to actual vessel
                      systems for real-time maritime safety monitoring.
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                      <span>Built: 72 hours</span>
                      <span>Support: 8 weeks</span>
                      <span>Status: Production</span>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.03]">
                    <h3 className="text-lg font-bold text-white mb-2">Intelligent Spare Part Discovery (Sandvik)</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-3">
                      RAG-based system built at the hackathon, then optimized and integrated with internal
                      systems over 6 weeks of production support. Now in production use, saving 8+ hours
                      per spare part search.
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                      <span>Built: 72 hours</span>
                      <span>Support: 6 weeks</span>
                      <span>Impact: 8+ hours saved per search</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Comparison */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Why Companies Choose Since AI
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-3 pr-4 text-neutral-500 font-semibold">Stage</th>
                        <th className="py-3 pr-4 text-neutral-500 font-semibold">Traditional Hackathon</th>
                        <th className="py-3 text-white font-semibold">Since AI</th>
                      </tr>
                    </thead>
                    <tbody className="text-neutral-400">
                      <tr className="border-b border-white/5">
                        <td className="py-3 pr-4 text-neutral-300">Event</td>
                        <td className="py-3 pr-4">Weekend event</td>
                        <td className="py-3 text-neutral-200">Weekend intensive building</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 pr-4 text-neutral-300">Deliverable</td>
                        <td className="py-3 pr-4">Cool demo</td>
                        <td className="py-3 text-neutral-200">Production-focused demo</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 pr-4 text-neutral-300">Post-event</td>
                        <td className="py-3 pr-4">Team disbands</td>
                        <td className="py-3 text-neutral-200">8+ weeks deployment support</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-3 pr-4 text-neutral-300">Mentorship</td>
                        <td className="py-3 pr-4">Event-only</td>
                        <td className="py-3 text-neutral-200">Ongoing technical mentorship</td>
                      </tr>
                      <tr>
                        <td className="py-3 pr-4 text-neutral-300">Outcome</td>
                        <td className="py-3 pr-4">Nothing deployed</td>
                        <td className="py-3 text-neutral-200">Solution deployed to production</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* For Builders */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  For Builders: Real Portfolio
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  Build systems that companies actually use in production. When you interview,
                  you can say &quot;I built a system that&apos;s deployed at Kongsberg&quot; or
                  &quot;My project handles real queries at Sandvik&quot; — not just &quot;I built a weekend project.&quot;
                </p>
                <p className="text-neutral-400 leading-relaxed">
                  That&apos;s the difference between a hackathon project and a production deployment on your resume.
                </p>
              </section>

              {/* CTA */}
              <section className="p-8 rounded-2xl border border-white/10 bg-white/[0.02]">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  Get Production Support
                </h2>
                <p className="text-neutral-300 mb-6">
                  Participate in a Since AI hackathon, build a great solution, and receive production support.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/events"
                    className="px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-neutral-100 transition-colors"
                  >
                    View Upcoming Events
                  </Link>
                  <Link
                    href="/partners"
                    className="px-6 py-3 bg-white/10 text-white rounded-full font-semibold hover:bg-white/15 transition-colors border border-white/20"
                  >
                    Partner with Since AI
                  </Link>
                </div>
              </section>

              <p className="text-xs text-neutral-600 mt-16 pt-6 border-t border-white/5">
                Last updated: February 2026
              </p>
            </div>
          </FadeIn>
        </div>

        <Footer discordUrl={ORG.social.discord} />
      </main>
    </SmoothScroll>
  );
}
