import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { FadeIn } from "@/components/motion-primitives/fade-in";
import { getBreadcrumbSchema } from "@/lib/schema";
import { ORG } from "@/lib/org";

export const metadata: Metadata = {
  title: "Finland AI Community | Since AI - Nordic AI Excellence",
  description:
    "Join Finland's leading AI developer community. 1000+ members across Helsinki, Turku, Tampere, Oulu. AI hackathons, real company projects, production deployment support.",
  keywords:
    "finland ai, ai finland, finland ai community, finnish ai developers, ai hackathon finland, helsinki ai, turku ai, tampere ai",
  alternates: {
    canonical: "https://sinceai.ai/finland-ai",
  },
  openGraph: {
    title: "Finland AI Community | Since AI - Nordic AI Excellence",
    description:
      "Join Finland's leading AI developer community. 1000+ members across Helsinki, Turku, Tampere, Oulu.",
    url: "https://sinceai.ai/finland-ai",
    siteName: "Since AI",
    type: "website",
  },
};

export default function FinlandAIPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "Finland AI", url: `${ORG.baseUrl}/finland-ai` },
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
              Finland AI Community
            </h1>

            <div className="prose prose-invert prose-neutral max-w-none">
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-8">
                Finland has one of the strongest AI ecosystems globally, and Since AI
                connects the nation&apos;s top developers and builders from Helsinki to
                Oulu, Turku to Tampere.
              </p>

              {/* Finland AI Landscape */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Finland&apos;s AI Landscape
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  Finland consistently ranks among the world&apos;s top countries for AI
                  readiness, education, and innovation. With strong government support,
                  world-class universities, and a thriving startup scene, Finland is a
                  global AI powerhouse.
                </p>

                <h3 className="text-2xl font-bold text-white mb-4">Why Finland Excels at AI</h3>
                <div className="space-y-4 mb-8">
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">World-Class Education</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Universities like Aalto, Helsinki, and Turku produce skilled AI talent.
                      Finland&apos;s education system is globally recognized for excellence in STEM.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">Government Support</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      National AI strategy and funding for innovation. Finland was one of the first
                      EU countries to publish a comprehensive AI strategy.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">Privacy-First Culture</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Strong alignment with European values and GDPR. Finnish AI development
                      prioritizes data privacy and ethical AI practices.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">Startup Ecosystem</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Home to globally successful tech companies. A supportive ecosystem for
                      founding and scaling AI startups.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">English Proficiency</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Easy for international developers to integrate. The Finnish tech sector
                      operates primarily in English.
                    </p>
                  </div>
                </div>
              </section>

              {/* Since AI Across Finland */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Since AI Across Finland
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-6">
                  While headquartered in Turku, Since AI connects developers across
                  Finland&apos;s major tech hubs:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.03]">
                    <h3 className="text-xl font-bold text-white mb-3">Turku (Headquarters)</h3>
                    <ul className="text-neutral-400 text-sm space-y-2">
                      <li>&bull; 1000+ member community base</li>
                      <li>&bull; Regular in-person hackathons</li>
                      <li>&bull; University partnerships (Turku, Turku AMK)</li>
                      <li>&bull; Industrial AI focus (Valmet, Sandvik)</li>
                    </ul>
                    <Link href="/turku" className="text-white hover:text-neutral-300 underline text-sm mt-3 inline-block">
                      Learn about Turku AI &rarr;
                    </Link>
                  </div>

                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h3 className="text-xl font-bold text-white mb-3">Helsinki</h3>
                    <ul className="text-neutral-400 text-sm space-y-2">
                      <li>&bull; Active community members</li>
                      <li>&bull; Remote hackathon participation</li>
                      <li>&bull; Access to capital region opportunities</li>
                      <li>&bull; Connection to Aalto AI ecosystem</li>
                    </ul>
                  </div>

                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h3 className="text-xl font-bold text-white mb-3">Tampere</h3>
                    <ul className="text-neutral-400 text-sm space-y-2">
                      <li>&bull; Growing member base</li>
                      <li>&bull; Strong university presence (Tampere University)</li>
                      <li>&bull; Industrial automation AI</li>
                      <li>&bull; Active startup scene</li>
                    </ul>
                  </div>

                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h3 className="text-xl font-bold text-white mb-3">Oulu</h3>
                    <ul className="text-neutral-400 text-sm space-y-2">
                      <li>&bull; Community members</li>
                      <li>&bull; University of Oulu connections</li>
                      <li>&bull; Wireless and embedded AI expertise</li>
                      <li>&bull; Remote collaboration</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Stats */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Finland AI Statistics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">1000+</div>
                    <div className="text-sm text-neutral-500">Finnish AI developers</div>
                  </div>
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">10+</div>
                    <div className="text-sm text-neutral-500">Countries represented</div>
                  </div>
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">4</div>
                    <div className="text-sm text-neutral-500">Major cities</div>
                  </div>
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">30+</div>
                    <div className="text-sm text-neutral-500">AI projects built</div>
                  </div>
                </div>
              </section>

              {/* Connecting */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Connecting Finnish AI Builders
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  Since AI provides a unified platform for Finnish AI developers regardless
                  of location:
                </p>
                <ul className="space-y-3 text-neutral-300">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Nationwide Hackathons:</strong> Both in-person (Turku) and remote participation options</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Online Community:</strong> Active Discord with 1000+ members across Finland</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Knowledge Sharing:</strong> Learn from developers in different Finnish cities</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Job Network:</strong> Opportunities across all major Finnish tech hubs</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Collaborative Projects:</strong> Cross-city teams building AI solutions together</span>
                  </li>
                </ul>
              </section>

              {/* Success Stories */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Finnish AI Success Stories
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  Since AI has helped Finnish developers and teams achieve real outcomes:
                </p>
                <div className="space-y-4">
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">Maritime AI</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Finnish team built a sound signal detection system deployed to production
                      at Kongsberg&apos;s vessel systems.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">Industrial AI</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Turku-based solution for intelligent spare part discovery deployed in
                      production at Sandvik, saving 8+ hours per search.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">Research Commercialization</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      University researchers commercializing AI innovations through the Since AI
                      research-to-market pipeline.
                    </p>
                  </div>
                </div>
                <p className="text-neutral-400 mt-4">
                  <Link href="/projects" className="text-white hover:text-neutral-300 underline">
                    View all projects &rarr;
                  </Link>
                </p>
              </section>

              {/* CTA */}
              <section className="mb-12 p-8 rounded-2xl border border-white/10 bg-white/[0.03]">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  Join Finland&apos;s AI Community
                </h2>
                <p className="text-neutral-300 mb-6">
                  Whether you&apos;re in Helsinki, Turku, Tampere, Oulu, or anywhere in Finland,
                  connect with 1000+ AI developers building real production systems.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href={ORG.social.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02]"
                  >
                    Join Discord
                  </a>
                  <Link
                    href="/events"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-full transition-all duration-300 hover:bg-white/15 border border-white/20 hover:border-white/30 hover:scale-[1.02]"
                  >
                    See Events
                  </Link>
                </div>
              </section>

              {/* Cross-links */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  Explore More
                </h2>
                <div className="flex flex-wrap gap-3">
                  <Link href="/turku" className="text-neutral-400 hover:text-white underline">Turku AI</Link>
                  <span className="text-neutral-600">&bull;</span>
                  <Link href="/europe-ai" className="text-neutral-400 hover:text-white underline">Europe AI Community</Link>
                  <span className="text-neutral-600">&bull;</span>
                  <Link href="/european-ai" className="text-neutral-400 hover:text-white underline">European AI Sovereignty</Link>
                  <span className="text-neutral-600">&bull;</span>
                  <Link href="/research-to-market" className="text-neutral-400 hover:text-white underline">Research to Market</Link>
                  <span className="text-neutral-600">&bull;</span>
                  <Link href="/stats" className="text-neutral-400 hover:text-white underline">Stats &amp; Impact</Link>
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
