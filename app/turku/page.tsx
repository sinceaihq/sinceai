import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { FadeIn } from "@/components/motion-primitives/fade-in";
import { getBreadcrumbSchema } from "@/lib/schema";
import { ORG } from "@/lib/org";
import { FIRST_EVENT, UPCOMING_EVENT_2026 } from "@/lib/sinceai";

export const metadata: Metadata = {
  title: "AI Community in Turku, Finland | Since AI",
  description:
    "Join Turku's premier AI community. 1000+ developers, AI hackathons with real company challenges, production deployment support. Turku is Finland's rising AI development hub.",
  keywords:
    "turku ai, ai turku, turku ai community, turku hackathon, ai developers turku, turku tech, turku finland ai",
  alternates: {
    canonical: "https://sinceai.ai/turku",
  },
  openGraph: {
    title: "AI Community in Turku, Finland | Since AI",
    description:
      "Join Turku's premier AI community. 1000+ developers, AI hackathons with real company challenges, production deployment support.",
    url: "https://sinceai.ai/turku",
    siteName: "Since AI",
    type: "website",
  },
};

export default function TurkuPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "Turku", url: `${ORG.baseUrl}/turku` },
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
              AI Community in Turku, Finland
            </h1>

            <div className="prose prose-invert prose-neutral max-w-none">
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-8">
                Turku is rapidly emerging as Finland&apos;s AI development powerhouse, and
                Since AI is at the forefront of this transformation. With 1000+ members,
                regular hackathons, and deep university partnerships, Turku offers unique
                advantages for AI builders.
              </p>

              {/* Turku AI Hub */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Turku: Finland&apos;s Rising AI Hub
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  While Helsinki dominates headlines, Turku has quietly built one of
                  Finland&apos;s strongest AI ecosystems. With two major universities,
                  growing industrial AI adoption, and the Since AI community connecting
                  1000+ developers, Turku offers a focused, high-signal environment for
                  AI builders.
                </p>
                <p className="text-neutral-400 leading-relaxed">
                  Finland consistently ranks among the world&apos;s top countries for AI
                  readiness, and Turku&apos;s combination of academic talent, industrial
                  demand, and an active builder community makes it a compelling choice for
                  anyone serious about AI development.
                </p>
              </section>

              {/* Stats */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Since AI&apos;s Impact in Turku
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">1000+</div>
                    <div className="text-sm text-neutral-500">Developers in network</div>
                  </div>
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">{FIRST_EVENT.attendance}+</div>
                    <div className="text-sm text-neutral-500">Hackathon participants</div>
                  </div>
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">30+</div>
                    <div className="text-sm text-neutral-500">AI projects built</div>
                  </div>
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                    <div className="text-3xl md:text-4xl font-bold text-white mb-2">15+</div>
                    <div className="text-sm text-neutral-500">Company partnerships</div>
                  </div>
                </div>
              </section>

              {/* Ecosystem */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  The Turku AI Ecosystem
                </h2>

                <h3 className="text-2xl font-bold text-white mb-4">Universities &amp; Research</h3>
                <div className="space-y-4 mb-8">
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">University of Turku</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Strong computer science and AI research programs, producing skilled AI
                      graduates annually. Active research in machine learning, NLP, and data science.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">Turku University of Applied Sciences (Turku AMK)</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Applied AI programs with direct industry partnerships. Students gain hands-on
                      experience through Since AI hackathons and company collaborations.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">&Aring;bo Akademi University</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Machine learning and data science research contributing to the broader
                      Turku academic AI ecosystem.
                    </p>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">Companies Building AI in Turku</h3>
                <ul className="space-y-3 text-neutral-300 mb-8">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Valmet:</strong> Industrial automation and process AI for global manufacturing</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Meyer Turku:</strong> Shipbuilding with AI-powered design and optimization</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Growing startup scene:</strong> New AI-first companies emerging from the Turku ecosystem</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Tech consultancies:</strong> AI implementation for enterprises across Finland</span>
                  </li>
                </ul>
              </section>

              {/* Why Turku */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Why Turku for AI Development?
                </h2>
                <div className="space-y-4">
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">1. Strong Academic Foundation</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Multiple universities producing AI talent — University of Turku, Turku AMK,
                      and &Aring;bo Akademi provide a steady pipeline of skilled developers and researchers.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">2. Lower Cost of Living</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      30-40% cheaper than Helsinki while maintaining excellent quality of life.
                      More affordable rent, good public transportation, and a walkable city center.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">3. Industrial AI Demand</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Companies like Valmet and Meyer Turku are driving real AI innovation,
                      creating demand for AI talent and practical applications.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">4. Strategic Location</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Gateway between Nordic and Baltic tech ecosystems. Under 2 hours from
                      Helsinki by train, with ferry connections to Stockholm.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h4 className="text-base font-bold text-white mb-1">5. Active Community</h4>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Since AI connects 1000+ developers through regular hackathons, meetups,
                      and an active Discord community with real company challenges.
                    </p>
                  </div>
                </div>
              </section>

              {/* Join */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Join Turku&apos;s AI Community
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  Whether you&apos;re a Turku local or considering moving to Finland&apos;s
                  AI-friendly city, Since AI offers:
                </p>
                <ul className="space-y-3 text-neutral-300 mb-8">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span>Regular AI hackathons in Turku with real company challenges</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span>Developer meetups and networking events</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span>Access to 1000+ AI developers across Europe</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span>Direct connections to hiring companies</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span>
                      <Link href="/production-support" className="text-white hover:text-neutral-300 underline">
                        Production deployment support
                      </Link>{" "}
                      for your AI projects
                    </span>
                  </li>
                </ul>
              </section>

              {/* CTA */}
              <section className="mb-12 p-8 rounded-2xl border border-white/10 bg-white/[0.03]">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  Get Started in Turku&apos;s AI Scene
                </h2>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href={ORG.social.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02]"
                  >
                    Join Discord Community
                  </a>
                  <Link
                    href="/events"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-full transition-all duration-300 hover:bg-white/15 border border-white/20 hover:border-white/30 hover:scale-[1.02]"
                  >
                    See Turku Events
                  </Link>
                </div>
              </section>

              {/* Upcoming Events */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Upcoming AI Events in Turku
                </h2>
                <ul className="space-y-3 text-neutral-300 mb-4">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Annual AI Hackathon:</strong> 72-hour intensive ({UPCOMING_EVENT_2026.month} {UPCOMING_EVENT_2026.year})</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Community Meetups:</strong> Technical talks and networking</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Workshops:</strong> Hands-on AI development sessions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Partner Events:</strong> Co-hosted with companies and universities</span>
                  </li>
                </ul>
                <p className="text-neutral-400">
                  <Link href="/events" className="text-white hover:text-neutral-300 underline">
                    View all upcoming events &rarr;
                  </Link>
                </p>
              </section>

              {/* Jobs */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  AI Jobs &amp; Opportunities in Turku
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  Turku&apos;s AI job market is growing rapidly. Since AI partner companies
                  regularly hire from the community:
                </p>
                <ul className="space-y-3 text-neutral-300 mb-4">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Valmet:</strong> Industrial AI engineers and data scientists</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Startups:</strong> Full-stack AI developers and ML engineers</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Consultancies:</strong> ML engineers and data scientists</span>
                  </li>
                </ul>
                <p className="text-neutral-400">
                  <Link href="/partners" className="text-white hover:text-neutral-300 underline">
                    Explore partner opportunities &rarr;
                  </Link>
                </p>
              </section>

              {/* Living in Turku */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Living in Turku as an AI Developer
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h3 className="text-base font-bold text-white mb-2">Quality of Life</h3>
                    <ul className="text-neutral-400 text-sm space-y-1">
                      <li>&bull; Beautiful archipelago coastline</li>
                      <li>&bull; Excellent public transportation</li>
                      <li>&bull; Strong international community</li>
                      <li>&bull; English widely spoken in tech</li>
                    </ul>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h3 className="text-base font-bold text-white mb-2">Cost of Living (vs Helsinki)</h3>
                    <ul className="text-neutral-400 text-sm space-y-1">
                      <li>&bull; Rent: 30-40% lower</li>
                      <li>&bull; Food: Similar prices</li>
                      <li>&bull; Transportation: Excellent value</li>
                      <li>&bull; Overall: More affordable</li>
                    </ul>
                  </div>
                  <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h3 className="text-base font-bold text-white mb-2">Tech Community</h3>
                    <ul className="text-neutral-400 text-sm space-y-1">
                      <li>&bull; Since AI (1000+ AI developers)</li>
                      <li>&bull; Various developer meetups</li>
                      <li>&bull; Turku Game Hub</li>
                      <li>&bull; Startup Turku ecosystem</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section className="mb-12 p-8 rounded-2xl border border-white/10 bg-white/[0.02]">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  Contact Since AI in Turku
                </h2>
                <p className="text-neutral-300">
                  <strong className="text-white">Email:</strong>{" "}
                  <a href={`mailto:${ORG.contact.infoEmail}`} className="text-white hover:text-neutral-300 underline">{ORG.contact.infoEmail}</a>
                  <br />
                  <strong className="text-white">Discord:</strong>{" "}
                  <a href={ORG.social.discord} target="_blank" rel="noopener noreferrer" className="text-white hover:text-neutral-300 underline">discord.gg/6PC74zW68v</a>
                  <br />
                  <strong className="text-white">Location:</strong> Turku, Finland
                </p>
              </section>

              {/* Cross-links */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  Explore More
                </h2>
                <div className="flex flex-wrap gap-3">
                  <Link href="/finland-ai" className="text-neutral-400 hover:text-white underline">Finland AI Community</Link>
                  <span className="text-neutral-600">&bull;</span>
                  <Link href="/europe-ai" className="text-neutral-400 hover:text-white underline">Europe AI Community</Link>
                  <span className="text-neutral-600">&bull;</span>
                  <Link href="/events" className="text-neutral-400 hover:text-white underline">Events</Link>
                  <span className="text-neutral-600">&bull;</span>
                  <Link href="/projects" className="text-neutral-400 hover:text-white underline">Projects</Link>
                  <span className="text-neutral-600">&bull;</span>
                  <Link href="/research-to-market" className="text-neutral-400 hover:text-white underline">Research to Market</Link>
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
