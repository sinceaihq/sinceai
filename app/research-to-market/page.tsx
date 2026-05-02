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
  title: "Research to Market — Commercializing AI Innovation | Since AI",
  description:
    "Since AI bridges academic AI research and commercial reality. We help researchers validate, deploy, and commercialize AI innovations through hackathons, production support, and entrepreneurship programs.",
  keywords: [
    "AI research commercialization",
    "research to market",
    "AI tech transfer",
    "academic AI to production",
    "university AI partnership",
    "AI startup support",
    "Since AI",
  ],
  openGraph: {
    title: "Research to Market — Commercializing AI Innovation | Since AI",
    description:
      "Bridging academia and industry. Since AI helps researchers commercialize AI innovations through real-world validation, production deployment, and startup support.",
    url: "https://sinceai.ai/research-to-market",
    type: "website",
  },
};

export default function ResearchToMarketPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "Research to Market", url: `${ORG.baseUrl}/research-to-market` },
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
              From Research to Market
            </h1>

            <div className="prose prose-invert prose-neutral max-w-none">
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-8">
                Universities produce cutting-edge AI research. Industry needs practical AI solutions.
                Since AI connects them — bridging the gap from academic innovation to commercial deployment.
              </p>

              <p className="text-lg text-neutral-400 leading-relaxed mb-12">
                Through partnerships with the University of Turku and Turku University of Applied Sciences,
                we help researchers validate their work with real-world applications, gain production deployment
                experience, and explore commercialization pathways.
              </p>

              {/* The Gap */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  The Gap We Bridge
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">Academic World</h3>
                    <ul className="text-neutral-400 text-sm space-y-2 leading-relaxed">
                      <li>• Cutting-edge AI research</li>
                      <li>• Novel algorithms</li>
                      <li>• Published papers</li>
                      <li>• Limited production experience</li>
                    </ul>
                  </div>
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white mb-1">Since AI</div>
                      <div className="text-sm text-neutral-400">Bridges the gap</div>
                    </div>
                  </div>
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">Commercial World</h3>
                    <ul className="text-neutral-400 text-sm space-y-2 leading-relaxed">
                      <li>• Need practical AI solutions</li>
                      <li>• Production-ready systems</li>
                      <li>• Business outcomes</li>
                      <li>• Limited access to research</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* For Researchers */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  For Researchers
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">1. Validate Research with Real Challenges</h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Apply your research to actual company problems. Test algorithms on real data.
                      Get feedback from industry practitioners. See your work deployed in production.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">2. Learn Commercialization</h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Gain production deployment experience. Develop business models.
                      Understand IP and licensing. Validate market fit.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">3. Access Entrepreneurship Support</h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Startup formation assistance. Investor connections through our Antler partnership.
                      Business mentorship. Go-to-market strategy.
                    </p>
                  </div>
                </div>
              </section>

              {/* For Students */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  For Students
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">1. Hands-On Experience</h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Work on real company challenges, not textbook problems. Build production-ready systems.
                      Learn beyond classroom theory. Build a portfolio with deployed projects.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">2. Career Acceleration</h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Direct industry connections. Hiring pipeline to partner companies.
                      Real-world problem solving experience. Production AI skills.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">3. Entrepreneurship Path</h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Turn course projects into startups. Access mentorship and funding.
                      Business skills development. Full support system for founders.
                    </p>
                  </div>
                </div>
              </section>

              {/* For Companies */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  For Companies
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Access Latest Research</h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Early access to academic innovations. Collaboration with researchers.
                      Novel approaches to your problems. Cutting-edge AI techniques
                      translated to production-ready implementations.
                    </p>
                  </div>
                </div>
              </section>

              {/* University Partnerships */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  University Partnerships
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">University of Turku</h3>
                    <ul className="text-neutral-400 text-sm space-y-2 leading-relaxed">
                      <li>• Computer Science department collaboration</li>
                      <li>• AI research group partnerships</li>
                      <li>• Student access to hackathons</li>
                      <li>• Joint research initiatives</li>
                    </ul>
                  </div>
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">Turku University of Applied Sciences</h3>
                    <ul className="text-neutral-400 text-sm space-y-2 leading-relaxed">
                      <li>• Applied AI programs</li>
                      <li>• Industry collaboration projects</li>
                      <li>• Student hackathon participation</li>
                      <li>• Practical AI education</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* The Full Pipeline */}
              <section className="mb-12 p-8 rounded-2xl border border-white/10 bg-white/[0.02]">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  The Full Pipeline
                </h2>
                <p className="text-neutral-300 text-lg mb-4">
                  Research → Hackathon → Production → Commercialization → Market
                </p>
                <p className="text-neutral-400">
                  Since AI is the only community supporting this entire pipeline. From validating an academic
                  algorithm at a hackathon, to deploying it in production at a partner company, to exploring
                  startup formation — we&apos;re with you at every step.
                </p>
              </section>

              {/* CTA */}
              <section className="p-8 rounded-2xl border border-white/10 bg-white/[0.02]">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  Get Started
                </h2>
                <div className="space-y-3 text-neutral-300">
                  <p>
                    <strong className="text-white">Researchers:</strong> Share your research in the Since AI community
                    and explore industry applications at our{" "}
                    <Link href="/events" className="text-white hover:text-neutral-300 underline">upcoming hackathons</Link>.
                  </p>
                  <p>
                    <strong className="text-white">Students:</strong>{" "}
                    <a href={ORG.social.discord} target="_blank" rel="noopener noreferrer" className="text-white hover:text-neutral-300 underline">
                      Join our Discord
                    </a> and participate in the next hackathon for hands-on experience.
                  </p>
                  <p>
                    <strong className="text-white">Companies:</strong>{" "}
                    <Link href="/partners" className="text-white hover:text-neutral-300 underline">Partner with us</Link> to
                    access academic innovations translated to production.
                  </p>
                  <p>
                    <strong className="text-white">Contact:</strong>{" "}
                    <a href={`mailto:${ORG.contact.infoEmail}`} className="text-white hover:text-neutral-300 underline">
                      {ORG.contact.infoEmail}
                    </a>
                  </p>
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
