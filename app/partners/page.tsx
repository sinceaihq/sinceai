import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { FadeIn } from "@/components/motion-primitives/fade-in";
import { ORG } from "@/lib/org";
import StructuredData from "@/components/StructuredData";
import { PartnersSection } from "@/components/sections/homepage/PartnersSection";

export const metadata: Metadata = {
  title:
    "Partner with Since AI — Recruit AI Talent, Sponsor Hackathon Challenges, Run AI Pilots",
  description:
    "Partner with Since AI to access 10,000+ AI builders across Europe. Sponsor hackathon challenges at Since AI Hackathon 2026, recruit top AI talent, and run applied AI pilots with proven builders.",
  alternates: { canonical: "https://sinceai.fi/partners" },
  openGraph: {
    title: "Partner with Since AI — Recruit AI Talent, Sponsor Hackathon Challenges",
    description:
      "Access 10,000+ AI builders across Europe. Sponsor Since AI Hackathon 2026 challenges, recruit top AI talent, and run applied AI pilots.",
    url: "https://sinceai.fi/partners",
    siteName: "Since AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Partner with Since AI",
    description:
      "Access 10,000+ AI builders. Sponsor Hackathon 2026, recruit talent, run AI pilots.",
  },
};

const partnerFaqs = [
  {
    question: "What's the cost of sponsoring a Since AI Hackathon 2026 challenge?",
    answer:
      "Partnership packages are tiered based on scope — challenge sponsorship, recruiting access, workshop, or full strategic partnership. Contact partners@sinceai.fi for a tailored proposal.",
  },
  {
    question: "Who owns the IP from hackathon projects?",
    answer:
      "IP ownership is configured per partnership. Default: builders own their work, partners get a non-exclusive license to evaluate. Custom arrangements are possible for pilots and commercial engagements.",
  },
  {
    question: "Can we recruit specific individuals from the hackathon?",
    answer:
      "Yes. Partners get introductions to top performers during and after the event. All recruiting is direct between partner and builder — Since AI facilitates, not intermediates.",
  },
  {
    question: "Do we need to be based in Europe to partner?",
    answer:
      "No. Since AI partners include global organizations. Google for Developers, for example, operates internationally. Partners can be based anywhere.",
  },
  {
    question: "How soon can a partnership start?",
    answer:
      "Most partnerships formalize within 2–4 weeks from the first intro call, depending on scope. Hackathon sponsorships are accepted up to 6 weeks before the event.",
  },
  {
    question: "What outcomes should we expect?",
    answer:
      "Realistic outcomes from a hackathon sponsorship include 3–8 strong prototype projects on your challenge, 2–5 high-signal recruiting conversations, and 1–2 candidates for deeper pilots or collaboration.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: partnerFaqs.map((f) => ({
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
    { "@type": "ListItem", position: 2, name: "Partners", item: "https://sinceai.fi/partners" },
  ],
};

const caseStudies = [
  {
    partner: "Kongsberg",
    sector: "Maritime",
    title: "Maritime Sound Signal Detection",
    body: "Audio ML for detecting and classifying maritime sound signals in real-time for autonomous vessel safety. Teams explored CNN-based models for COLREG whistle signals in noisy environments. Top teams advanced into further collaboration.",
    tags: ["Audio", "CNN", "Real-time ML", "Safety"],
  },
  {
    partner: "Sandvik",
    sector: "Manufacturing",
    title: "Intelligent Spare Part Discovery",
    body: "Agent-based system for detecting and resolving spare-part inquiries with SKU search and product matching. Teams built RAG pipelines over product catalogs to cut support response time. Outputs progressed toward production evaluation.",
    tags: ["Agents", "RAG", "NLP", "Search"],
  },
  {
    partner: "Valmet",
    sector: "Manufacturing",
    title: "Visual Object Detection for Industrial Field Devices",
    body: "3D and vision-based detection of industrial equipment in challenging field conditions. Teams explored CV models robust to lighting variation, occlusion, and complex angles for integration with maintenance workflows.",
    tags: ["Vision", "Object Detection", "3D", "CV"],
  },
  {
    partner: "ElevenLabs",
    sector: "Dev Tools",
    title: "Open Build Track: Voice AI Applications",
    body: "Open-ended exploration of voice AI using the ElevenLabs API. Teams shipped creative voice applications spanning text-to-speech, voice cloning, and conversational agents, demonstrating novel commercial use cases.",
    tags: ["Voice", "Audio", "Agents", "TTS"],
  },
];

const steps = [
  {
    n: "01",
    title: "Intro call",
    body: "Understand your goals — recruiting, hackathon challenge, pilot project, or strategic partnership. 30 minutes.",
  },
  {
    n: "02",
    title: "Scope definition",
    body: "Define the challenge, timeline, deliverables, and IP terms. We co-design challenges so they're technically feasible and commercially meaningful.",
  },
  {
    n: "03",
    title: "Execution",
    body: "Hackathon, standalone project, or ongoing engagement. 1,000+ builders on your challenge in 72 hours, or a matched team on a defined problem.",
  },
  {
    n: "04",
    title: "Continued collaboration",
    body: "Top teams continue into pilots, hires, or investments. Since AI stays involved through production support and VC introductions where relevant.",
  },
];

export default function PartnersPage() {
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
                For Organizations
              </p>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
                Partner with Since AI
              </h1>

              {/* 2. Definition paragraph */}
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-6">
                Since AI partners with leading AI companies, industrial organizations,
                research groups, and investors across Europe to turn frontier AI into
                shipped products. Strategic partners include Google for Developers, Bayer,
                Sandvik, Kongsberg, Valmet, Antler, Inventure, and Wave Ventures. Partner
                with Since AI to access 10,000+ AI builders, sponsor hackathon challenges,
                and run applied AI pilots.
              </p>

              {/* Primary CTA */}
              <div className="flex flex-col sm:flex-row gap-3 mb-20">
                <a
                  href="mailto:partners@sinceai.fi"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02]"
                >
                  Start a partnership conversation →
                </a>
                <Link
                  href="/hackathon"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-full transition-all duration-300 hover:bg-white/15 border border-white/20 hover:border-white/30 hover:scale-[1.02]"
                >
                  Hackathon 2026
                </Link>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-20">
                {[
                  { value: "10,000+", label: "AI builders in our network" },
                  { value: "1,000+", label: "Builders targeted at Hackathon 2026" },
                  { value: "30+", label: "Partners & supporters" },
                  { value: "50+", label: "Countries represented" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="p-5 rounded-xl border border-white/5 bg-white/[0.02] text-center"
                  >
                    <div className="text-2xl font-bold text-white mb-1">{s.value}</div>
                    <div className="text-xs text-neutral-500 leading-snug">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* 3. Three ways to partner */}
              <section className="mb-20">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  Three ways to partner
                </h2>

                <div className="space-y-5">
                  {/* Card 1 */}
                  <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                      Sponsor a hackathon challenge
                    </h3>
                    <p className="text-neutral-300 leading-relaxed mb-5">
                      Bring a real AI problem to Since AI Hackathon 2026. Get 1,000+
                      builders working on it over 72 hours. Best teams continue into
                      your pilot.
                    </p>
                    <ul className="space-y-2 text-neutral-400 text-sm mb-6">
                      <li className="flex items-start gap-3">
                        <span className="text-white mt-0.5">—</span>
                        Dedicated challenge track at the hackathon
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-white mt-0.5">—</span>
                        Access to top performers for recruiting and pilots
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-white mt-0.5">—</span>
                        Co-branded post-event report
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-white mt-0.5">—</span>
                        Builder IP pathways configurable by partner
                      </li>
                    </ul>
                    <a
                      href="mailto:partners@sinceai.fi"
                      className="inline-flex items-center text-sm font-semibold text-white hover:text-neutral-300 transition-colors underline"
                    >
                      Sponsor a challenge → partners@sinceai.fi
                    </a>
                  </div>

                  {/* Card 2 */}
                  <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                      Recruit AI talent
                    </h3>
                    <p className="text-neutral-300 leading-relaxed mb-5">
                      Since AI&apos;s network includes 10,000+ AI builders across Europe.
                      Access top performers through hackathons, applied projects, and
                      direct introductions.
                    </p>
                    <ul className="space-y-2 text-neutral-400 text-sm mb-6">
                      <li className="flex items-start gap-3">
                        <span className="text-white mt-0.5">—</span>
                        Targeted candidate introductions
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-white mt-0.5">—</span>
                        Pre-vetted by hackathon performance
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-white mt-0.5">—</span>
                        Global reach, European base
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-white mt-0.5">—</span>
                        Non-profit — no recruiter fees
                      </li>
                    </ul>
                    <a
                      href="mailto:partners@sinceai.fi"
                      className="inline-flex items-center text-sm font-semibold text-white hover:text-neutral-300 transition-colors underline"
                    >
                      Recruit from our network → partners@sinceai.fi
                    </a>
                  </div>

                  {/* Card 3 */}
                  <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                      Run an applied AI pilot
                    </h3>
                    <p className="text-neutral-300 leading-relaxed mb-5">
                      Turn a research problem into a working prototype with a top team
                      from the Since AI network. Pilots run post-hackathon or on
                      standalone timelines.
                    </p>
                    <ul className="space-y-2 text-neutral-400 text-sm mb-6">
                      <li className="flex items-start gap-3">
                        <span className="text-white mt-0.5">—</span>
                        Matched team based on problem domain
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-white mt-0.5">—</span>
                        Production-grade outputs
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-white mt-0.5">—</span>
                        Commercialization pathway via the{" "}
                        <Link
                          href="/research-to-market"
                          className="text-neutral-300 hover:text-white underline"
                        >
                          Research to Market program
                        </Link>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="text-white mt-0.5">—</span>
                        Connection to VCs if outcomes warrant
                      </li>
                    </ul>
                    <a
                      href="mailto:partners@sinceai.fi"
                      className="inline-flex items-center text-sm font-semibold text-white hover:text-neutral-300 transition-colors underline"
                    >
                      Start a pilot conversation → partners@sinceai.fi
                    </a>
                  </div>
                </div>
              </section>

              {/* 4. Challenge themes from past partners */}
              <section className="mb-20">
                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
                  Challenge themes from past partners
                </h2>
                <p className="text-neutral-500 text-sm mb-8">
                  Public summaries only. Full challenge materials and solutions are not
                  published.{" "}
                  <Link
                    href="/projects"
                    className="text-neutral-400 hover:text-white underline"
                  >
                    See all projects →
                  </Link>
                </p>

                <div className="space-y-5">
                  {caseStudies.map((cs) => (
                    <div
                      key={cs.title}
                      className="p-6 rounded-xl border border-white/5 bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-semibold text-white uppercase tracking-wider">
                          {cs.partner}
                        </span>
                        <span className="text-neutral-700 text-xs">·</span>
                        <span className="text-xs text-neutral-500">{cs.sector}</span>
                      </div>
                      <h3 className="text-base font-bold text-white mb-2">{cs.title}</h3>
                      <p className="text-neutral-400 text-sm leading-relaxed mb-4">
                        {cs.body}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {cs.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-neutral-500 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 6. How partnerships work */}
              <section className="mb-20">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  How partnerships work
                </h2>
                <div className="space-y-4">
                  {steps.map((s) => (
                    <div
                      key={s.n}
                      className="flex gap-6 p-6 rounded-xl border border-white/5 bg-white/[0.02]"
                    >
                      <span className="text-2xl font-bold text-neutral-700 leading-none pt-0.5 min-w-[2.5rem]">
                        {s.n}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-white mb-1">{s.title}</h3>
                        <p className="text-neutral-400 text-sm leading-relaxed">{s.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 7. Partner FAQs */}
              <section className="mb-20">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  Frequently asked questions about partnering
                </h2>
                <div className="space-y-8">
                  {partnerFaqs.map((faq) => (
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
              <section className="mb-20 p-10 rounded-2xl border border-white/10 bg-white/[0.03] text-center">
                <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
                  Ready to partner?
                </h2>
                <p className="text-neutral-400 mb-8 max-w-lg mx-auto leading-relaxed">
                  Join Google for Developers, Bayer, Sandvik, Kongsberg, Valmet, and 25+
                  other organizations building at the frontier of applied AI.
                </p>
                <a
                  href="mailto:partners@sinceai.fi"
                  className="inline-flex items-center justify-center px-10 py-4 text-base font-semibold text-black bg-white rounded-full transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02]"
                >
                  Start a partnership conversation → partners@sinceai.fi
                </a>
              </section>

            </div>
          </FadeIn>
        </div>

        {/* 5. Partner network — full tier layout reused from homepage */}
        <PartnersSection />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 w-full">
          <nav className="pt-6 border-t border-white/5" aria-label="Related pages">
            <div className="flex flex-wrap gap-y-3 text-sm">
              {[
                { href: "/hackathon",          label: "Hackathon 2026" },
                { href: "/projects",           label: "Past projects" },
                { href: "/for-builders",       label: "For builders" },
                { href: "/research-to-market", label: "Research to Market" },
                { href: "/faq",                label: "FAQ" },
                { href: "/about",              label: "About Since AI" },
              ].map(({ href, label }, i, arr) => (
                <span key={href} className="whitespace-nowrap">
                  <Link
                    href={href}
                    className="text-neutral-500 hover:text-white transition-colors duration-150"
                  >
                    {label}
                  </Link>
                  {i < arr.length - 1 && (
                    <span className="text-neutral-700 mx-3 select-none" aria-hidden="true">·</span>
                  )}
                </span>
              ))}
            </div>
          </nav>
        </div>

        <Footer discordUrl={ORG.social.discord} />
      </main>
    </SmoothScroll>
  );
}
