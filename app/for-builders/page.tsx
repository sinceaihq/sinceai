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
  title: "For Builders — Join Since AI's Global AI Ecosystem",
  description:
    "Join 10,000+ AI builders globally. Hackathons, applied AI projects, startup pathways. Since AI is open to developers, researchers, and founders globally.",
  alternates: { canonical: "https://sinceai.fi/for-builders" },
  openGraph: {
    title: "For Builders — Join Since AI's Global AI Ecosystem",
    description:
      "Join 10,000+ AI builders globally. Hackathons, applied AI projects, startup pathways. Open globally.",
    url: "https://sinceai.fi/for-builders",
    siteName: "Since AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "For Builders | Since AI",
    description:
      "Join 10,000+ AI builders. Hackathons, applied projects, startup pathways. Open globally.",
  },
};

const builderFaqs = [
  {
    question: "Do I need to be based in Europe to join Since AI?",
    answer:
      "No. Since AI is open to builders globally. Our network spans 50+ countries. Since AI Hackathon 2026 accepts international applications, and our Discord community is active worldwide.",
  },
  {
    question: "Is there a cost to join Since AI?",
    answer:
      "No. Since AI is a non-profit. Joining the community, participating in Discord, and applying to hackathons is free. Our operations are funded by partner sponsorships.",
  },
  {
    question: "What is the application process for Since AI Hackathon 2026?",
    answer:
      "Applications for Since AI Hackathon 2026 open on a rolling basis ahead of the event. Apply at sinceai.fi/hackathon. You can apply as an individual or as a pre-formed team. Team formation support is available at the event.",
  },
  {
    question: "Do I keep the IP from my work at Since AI events?",
    answer:
      "Yes. The default is builder-owned IP. Exceptions only apply by explicit written agreement with a partner organization — for example, in a post-hackathon pilot or commercial engagement where terms are negotiated directly.",
  },
  {
    question: "Can I apply to the hackathon as a team?",
    answer:
      "Yes. You can apply as an individual or bring a pre-formed team of up to 5 members. Teams that form on-site during the event are also common — we run team formation sessions at the start of the hackathon.",
  },
  {
    question: "I'm a student — can I join Since AI?",
    answer:
      "Yes. Students are welcome and make up a significant part of the Since AI community. We work with university AI societies globally including Aalto AI, HankenAI, and others. No minimum experience level required — we care about what you build, not your CV.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: builderFaqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://sinceai.fi/" },
    {
      "@type": "ListItem",
      position: 2,
      name: "For Builders",
      item: "https://sinceai.fi/for-builders",
    },
  ],
};

export default function ForBuildersPage() {
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
              <p className="text-xs uppercase tracking-[0.2em] font-semibold text-neutral-500 mb-5">
                For Builders
              </p>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
                For Builders
              </h1>

              {/* 2. Definition paragraph */}
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-16">
                Since AI is a global execution-focused AI innovation ecosystem for
                builders who ship. Join 10,000+ AI developers, researchers, and founders
                working with partners including Google for Developers, Bayer, Sandvik,
                Antler, and the University of Turku. Open to builders globally.
              </p>

              {/* 3. What you get */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  What you get
                </h2>
                <div className="space-y-5">
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-base font-bold text-white mb-2">
                      Access to real problems
                    </h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Partner-backed challenges at Since AI Hackathon 2026 and ongoing
                      applied projects from Google for Developers, Bayer, Sandvik,
                      Kongsberg, Valmet, and others. No toy datasets, no synthetic prompts —
                      production-relevant engineering problems that matter.
                    </p>
                  </div>

                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-base font-bold text-white mb-2">
                      Production support
                    </h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Deployment help, GPU credits, and infrastructure partner access for
                      teams that move from prototype to production. Since AI stays involved
                      after the hackathon — most communities don&apos;t.
                    </p>
                  </div>

                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-base font-bold text-white mb-2">
                      Capital introductions
                    </h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Top teams get introductions to Antler, Inventure, Wave Ventures, and
                      other European VCs through Since AI&apos;s capital partner network.
                      The path from hackathon to pre-seed is real.
                    </p>
                  </div>

                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-base font-bold text-white mb-2">
                      Global network
                    </h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      10,000+ AI builders, researchers, and founders across Europe and
                      beyond — across 50+ countries. Year-round channels for job postings,
                      project collaboration, and applied AI discussion.
                    </p>
                  </div>
                </div>
              </section>

              {/* 4. Three ways to participate */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  Three ways to participate
                </h2>
                <div className="space-y-5">
                  <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.03]">
                    <h3 className="text-lg font-bold text-white mb-2 tracking-tight">
                      Apply to Since AI Hackathon 2026
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-neutral-500 mb-4">
                      <span>72 hours</span>
                      <span aria-hidden="true">·</span>
                      <span>1,000+ builders targeted</span>
                      <span aria-hidden="true">·</span>
                      <span>November 6–8, 2026</span>
                      <span aria-hidden="true">·</span>
                      <span>Turku, Finland</span>
                    </div>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-5">
                      Partner challenges from Google for Developers, Bayer, Sandvik,
                      Kongsberg, Valmet, and more. Free to attend. Open globally.
                    </p>
                    <Link
                      href="/hackathon"
                      className="inline-flex items-center justify-center px-7 py-3 text-sm font-semibold text-black bg-white rounded-full hover:bg-neutral-100 transition-all hover:scale-[1.02]"
                    >
                      Apply →
                    </Link>
                  </div>

                  <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2 tracking-tight">
                      Join the Discord community
                    </h3>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-5">
                      Day-to-day conversation, project collaboration, job postings, and
                      event announcements. 10,000+ builders across 50+ countries.
                    </p>
                    <a
                      href={ORG.social.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-7 py-3 text-sm font-semibold text-black bg-white rounded-full hover:bg-neutral-100 transition-all hover:scale-[1.02]"
                    >
                      Join Discord →
                    </a>
                  </div>

                  <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2 tracking-tight">
                      Propose an applied AI project
                    </h3>
                    <p className="text-neutral-400 text-sm leading-relaxed mb-5">
                      Have a concrete AI project idea aligned with our partner domains —
                      manufacturing, maritime, energy, health, or frontier AI tooling?
                      Submit a proposal and we&apos;ll connect you with the right partners.
                    </p>
                    <a
                      href="mailto:builders@sinceai.fi"
                      className="inline-flex items-center justify-center px-7 py-3 text-sm font-semibold text-white bg-white/10 rounded-full border border-white/20 hover:bg-white/15 hover:border-white/30 transition-all hover:scale-[1.02]"
                    >
                      builders@sinceai.fi →
                    </a>
                  </div>
                </div>
              </section>

              {/* 5. Who Since AI is for */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  Who Since AI is for
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">AI developers</h3>
                    <p className="text-neutral-400 leading-relaxed">
                      If you build AI systems and want to ship them to real users, not just
                      demo them. Since AI is built for engineers who care about production:
                      inference pipelines, deployment, evaluation, and scale — not slide decks.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Researchers</h3>
                    <p className="text-neutral-400 leading-relaxed">
                      If you want to see your research applied in industry via partner
                      collaborations, or translated into a startup through the{" "}
                      <Link
                        href="/research-to-market"
                        className="text-neutral-300 hover:text-white underline"
                      >
                        Research to Market program
                      </Link>
                      . Since AI bridges academic depth and production reality.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">Founders</h3>
                    <p className="text-neutral-400 leading-relaxed">
                      If you are building or want to build an AI startup. Access capital
                      partners (Antler, Inventure, Wave Ventures), a technical peer group
                      of 10,000+ builders, and commercialization support through Since AI.
                    </p>
                  </div>
                </div>
              </section>

              {/* 6. What we expect from builders */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  What we expect from builders
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      title: "Execution mindset",
                      body: "Ship, don't just discuss. Since AI rewards people who build things over people who talk about building things.",
                    },
                    {
                      title: "Open collaboration",
                      body: "Work in public where possible. Share what you learn. The network gets stronger when builders contribute to it.",
                    },
                    {
                      title: "Respectful conduct",
                      body: (
                        <>
                          Follow the{" "}
                          <Link
                            href="/code-of-conduct"
                            className="text-neutral-300 hover:text-white underline"
                          >
                            Code of Conduct
                          </Link>
                          . Since AI is a professional environment open to builders from every
                          background and country.
                        </>
                      ),
                    },
                    {
                      title: "Real contribution",
                      body: "Code, research, design, or concrete help. Presence without contribution is not enough.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="flex gap-4 items-start p-5 rounded-xl border border-white/5 bg-white/[0.02]"
                    >
                      <span className="text-neutral-700 font-bold mt-0.5 min-w-[8px]">—</span>
                      <div>
                        <span className="text-white font-semibold">{item.title}</span>
                        <span className="text-neutral-400"> — </span>
                        <span className="text-neutral-400 text-sm leading-relaxed">
                          {item.body}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 7. FAQ for builders */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  FAQ for builders
                </h2>
                <div className="space-y-8">
                  {builderFaqs.map((faq) => (
                    <div
                      key={faq.question}
                      className="pb-8 border-b border-white/5 last:border-b-0 last:pb-0"
                    >
                      <h3 className="text-lg font-bold text-white mb-2 tracking-tight">
                        {faq.question}
                      </h3>
                      <p className="text-neutral-400 leading-relaxed">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 8. Bottom CTA */}
              <section className="mb-16 p-10 rounded-2xl border border-white/10 bg-white/[0.03] text-center">
                <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
                  Ready to build?
                </h2>
                <p className="text-neutral-400 mb-8 max-w-lg mx-auto leading-relaxed">
                  Apply to Hackathon 2026 or join the network today. No experience
                  threshold. No membership fee. Just ship.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/hackathon"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02]"
                  >
                    Apply to Hackathon 2026 →
                  </Link>
                  <a
                    href={ORG.social.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-full transition-all duration-300 hover:bg-white/15 border border-white/20 hover:border-white/30 hover:scale-[1.02]"
                  >
                    Join the Discord →
                  </a>
                </div>
              </section>

              {/* Cross-links */}
              <div className="pt-6 border-t border-white/5">
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link href="/hackathon" className="text-neutral-400 hover:text-white underline">
                    Hackathon 2026
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link href="/ai-hackathons" className="text-neutral-400 hover:text-white underline">
                    AI hackathons in Europe
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link href="/europe-ai" className="text-neutral-400 hover:text-white underline">
                    European AI ecosystem
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link href="/partners" className="text-neutral-400 hover:text-white underline">
                    For partners
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link href="/research-to-market" className="text-neutral-400 hover:text-white underline">
                    Research to Market
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link href="/faq" className="text-neutral-400 hover:text-white underline">
                    FAQ
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
