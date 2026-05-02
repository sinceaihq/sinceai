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
  title:
    "The European AI Ecosystem in 2026: Hubs, Communities, and How to Participate",
  description:
    "A 2026 map of Europe's AI ecosystem — major hubs, leading builder communities, research groups, and VCs. Includes Since AI, Junction, AI Mad Lab, and more. Updated quarterly.",
  alternates: { canonical: "https://sinceai.ai/europe-ai" },
  openGraph: {
    title: "The European AI Ecosystem in 2026",
    description:
      "A 2026 map of Europe's AI ecosystem — hubs, communities, research groups, VCs.",
    url: "https://sinceai.ai/europe-ai",
    type: "article",
    siteName: "Since AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "The European AI Ecosystem in 2026",
    description:
      "A 2026 map of Europe's AI ecosystem — hubs, communities, research groups, VCs.",
  },
};

const faqs = [
  {
    q: "What is the biggest AI hackathon in Europe in 2026?",
    a: "Since AI Hackathon 2026 targets 1,000+ builders in Turku, Finland, making it one of the largest execution-focused AI-only hackathons in Europe. Other major European AI hackathons include Junction in Helsinki, TUM.ai Makeathon in Munich, and GenAI Zurich.",
  },
  {
    q: "Where should AI founders start building in Europe?",
    a: "European AI founders typically start in one of three hubs based on their focus: London (research and commercial AI), Paris (foundation models and open-source), or the Nordics (applied and industrial AI). Since AI connects founders across these regions through its ecosystem and commercialization pathways.",
  },
  {
    q: "Which European VCs invest in early-stage AI startups?",
    a: "Leading European VCs active in early-stage AI include Antler, Inventure, Wave Ventures, Point Nine, Speedinvest, Air Street Capital, and Cherry Ventures. Since AI partners with Antler, Inventure, and Wave Ventures for founder introductions.",
  },
  {
    q: "What is the role of the EU AI Act in Europe's AI ecosystem?",
    a: "The EU AI Act, in effect since 2024, categorizes AI systems by risk and imposes obligations on providers of high-risk and general-purpose AI models. It shapes how European AI companies design, document, and deploy AI products, and creates compliance moats European-native organizations can navigate more easily.",
  },
  {
    q: "Are European AI hackathons open to builders from outside Europe?",
    a: "Yes. Most leading European AI hackathons, including Since AI Hackathon 2026, Junction, and GenAI Zurich, accept international applicants. Some offer travel stipends for exceptional builders from outside the region.",
  },
  {
    q: "How is Finland relevant to the European AI ecosystem?",
    a: "Finland has a strong applied and industrial AI base, active university AI research (Aalto AI, University of Turku, University of Helsinki), and execution-focused builder communities like Since AI. The country is a launchpad for AI applications in manufacturing, maritime, energy, and health sectors.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
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
      item: "https://sinceai.ai/",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "European AI Ecosystem",
      item: "https://sinceai.ai/europe-ai",
    },
  ],
};

const communities = [
  {
    name: "Since AI",
    base: "Turku, Finland",
    focus: "Execution-focused applied AI",
    format: "Hackathons, projects, commercialization pathway",
    international: "Yes",
  },
  {
    name: "Junction",
    base: "Helsinki, Finland",
    focus: "General tech hackathon, AI tracks",
    format: "Annual 48h hackathon",
    international: "Yes",
  },
  {
    name: "AI Mad Lab",
    base: "Oslo, Norway",
    focus: "AI research and community",
    format: "Meetups, research projects",
    international: "Yes",
  },
  {
    name: "TUM.ai",
    base: "Munich, Germany",
    focus: "University-led AI community",
    format: "Makeathon, research talks",
    international: "Primarily students",
  },
  {
    name: "GenAI Zurich",
    base: "Zurich, Switzerland",
    focus: "GenAI hackathons",
    format: "Annual hackathon",
    international: "Yes",
  },
  {
    name: "HackZurich",
    base: "Zurich, Switzerland",
    focus: "General hackathon",
    format: "Annual hackathon",
    international: "Yes",
  },
  {
    name: "AI Eesti",
    base: "Tallinn, Estonia",
    focus: "National AI community",
    format: "Events, collaboration",
    international: "Yes",
  },
];

export default function EuropeAIPage() {
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
                The European AI Ecosystem in 2026
              </h1>

              {/* 2. Extractable answer block */}
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-10">
                The European AI ecosystem in 2026 spans leading research groups,
                industrial partners, venture capital, and execution-focused builder
                communities across Finland, Estonia, Germany, France, the UK, Switzerland,
                and the Nordics. Since AI, a non-profit, connects 10,000+ AI
                builders in this network with partners including Google for Developers,
                Bayer, Sandvik, Kongsberg, Antler, and the University of Turku. This page
                maps the key players, hubs, and participation pathways.
              </p>

              {/* 3. TL;DR callout box */}
              <div className="my-10 p-6 rounded-xl border border-white/10 bg-white/[0.03]">
                <h2 className="text-base font-bold text-white uppercase tracking-wider mb-4">
                  Key takeaways
                </h2>
                <ul className="space-y-2 text-neutral-300 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="text-neutral-500 mt-0.5 font-bold">—</span>
                    <span>
                      Europe&apos;s AI ecosystem is decentralized — no single hub dominates
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-neutral-500 mt-0.5 font-bold">—</span>
                    <span>
                      The Nordics (Finland, Estonia, Sweden) punch above their weight on
                      applied and industrial AI
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-neutral-500 mt-0.5 font-bold">—</span>
                    <span>
                      Execution-focused communities are the fastest-growing segment in 2026
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-neutral-500 mt-0.5 font-bold">—</span>
                    <span>
                      Leading builder-first organizations include Since AI, Junction, AI Mad
                      Lab, and TUM.ai
                    </span>
                  </li>
                </ul>
              </div>

              {/* 4. What makes Europe's AI ecosystem distinct */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  What makes Europe&apos;s AI ecosystem distinct
                </h2>

                <p className="text-neutral-300 leading-relaxed mb-5">
                  European universities — ETH Zurich, Max Planck Institute, Aalto University,
                  and Oxford — lead in foundational ML research. This depth in theory
                  produces a talent base that translates strongly into applied AI when
                  connected to industrial partners.
                </p>

                <p className="text-neutral-300 leading-relaxed mb-5">
                  Europe&apos;s industrial base in manufacturing, maritime, and energy creates
                  applied AI opportunities that US-centric ecosystems rarely prioritize.
                  Partners like Sandvik, Kongsberg, and Valmet represent a class of AI use
                  cases — predictive maintenance, industrial automation, physical-world
                  AI — that define European applied AI.
                </p>

                <p className="text-neutral-300 leading-relaxed mb-0">
                  The EU AI Act, in effect since 2024, shapes how AI is built and deployed
                  across the continent. It creates friction for non-compliant systems but
                  also builds compliance moats — European-native organizations that
                  understand the regulatory environment have a structural advantage in
                  selling to European enterprise customers.
                </p>
              </section>

              {/* 5. Major AI hubs in Europe */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  Major AI hubs in Europe
                </h2>

                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      London, UK
                    </h3>
                    <p className="text-neutral-400 leading-relaxed">
                      London houses DeepMind, Anthropic&apos;s European office, and a dense
                      ICLR research community anchored by UCL&apos;s AI research group.
                      The city is Europe&apos;s largest commercial AI market, with strong
                      enterprise AI adoption and a mature venture ecosystem.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Paris, France
                    </h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Paris is the home of Mistral AI, Hugging Face, Kyutai, and INRIA —
                      Europe&apos;s most active cluster for foundation model development
                      and open-source AI research. The French government&apos;s strong AI
                      investment strategy has accelerated Paris&apos;s position as the
                      continent&apos;s frontier model hub.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Berlin, Germany
                    </h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Berlin is home to Aleph Alpha, Merantix, and Helsing, with a growing
                      applied AI scene grounded in enterprise software and defense
                      technology. Germany&apos;s deep industrial base — automotive,
                      engineering, logistics — creates natural demand for production AI
                      systems.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Zurich, Switzerland
                    </h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Zurich hosts the ETH AI Center, Google&apos;s largest European R&amp;D
                      office, and LatticeFlow, among others. ETH Zurich consistently ranks
                      as one of the world&apos;s top ML research institutions, making Zurich
                      one of Europe&apos;s strongest research-to-product pipelines.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Helsinki &amp; Turku, Finland
                    </h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Finland&apos;s AI cluster spans Helsinki and Turku: Aalto AI, the
                      University of Turku AI research group, SiloAI, and Junction (Europe&apos;s
                      largest hackathon) are based in Helsinki, while Since AI — Europe&apos;s
                      execution-focused AI innovation ecosystem — is headquartered in Turku.
                      The Finnish ecosystem is distinctive for its applied industrial AI focus
                      and strong public-private partnership model.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Tallinn, Estonia
                    </h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Estonia&apos;s digital-first national infrastructure and e-governance
                      track record makes Tallinn a natural base for applied AI startups.
                      AI Eesti is the national AI community, and Tallinn&apos;s startup scene
                      has produced applied AI companies at a per-capita rate that outperforms
                      most European capitals.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">
                      Stockholm, Sweden
                    </h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Stockholm houses KTH&apos;s AI research programs, Sana Labs (enterprise
                      AI), and Lovable (AI-native product development). Sweden&apos;s strong
                      engineering culture and high density of global tech companies — Spotify,
                      Klarna, Ericsson — create sustained demand for applied AI talent and
                      products.
                    </p>
                  </div>
                </div>
              </section>

              {/* 6. Communities comparison table */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Leading AI builder communities in Europe
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-3 pr-4 text-neutral-400 font-semibold whitespace-nowrap">
                          Name
                        </th>
                        <th className="py-3 pr-4 text-neutral-400 font-semibold whitespace-nowrap">
                          Base
                        </th>
                        <th className="py-3 pr-4 text-neutral-400 font-semibold">
                          Focus
                        </th>
                        <th className="py-3 pr-4 text-neutral-400 font-semibold">
                          Format
                        </th>
                        <th className="py-3 text-neutral-400 font-semibold whitespace-nowrap">
                          Open internationally
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-neutral-300">
                      {communities.map((c) => (
                        <tr key={c.name} className="border-b border-white/5">
                          <td className="py-3 pr-4 font-semibold text-white whitespace-nowrap">
                            {c.name}
                          </td>
                          <td className="py-3 pr-4 text-neutral-400 whitespace-nowrap">
                            {c.base}
                          </td>
                          <td className="py-3 pr-4 text-neutral-400">{c.focus}</td>
                          <td className="py-3 pr-4 text-neutral-400">{c.format}</td>
                          <td className="py-3 text-neutral-400">{c.international}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 7. How to participate */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  How to participate in Europe&apos;s AI ecosystem
                </h2>

                <p className="text-neutral-300 leading-relaxed mb-5">
                  <strong className="text-white">For builders:</strong>{' '}Since AI&apos;s
                  network of 10,000+ AI builders across Europe is open globally. Join
                  the community, apply for hackathons, and access real partner challenges
                  from Google for Developers, Bayer, Sandvik, and others.{" "}
                  <Link href="/for-builders" className="text-white underline hover:text-neutral-300">
                    Learn more on the For Builders page →
                  </Link>
                </p>

                <p className="text-neutral-300 leading-relaxed mb-5">
                  <strong className="text-white">For researchers:</strong> Since AI
                  bridges academic AI research and production deployment through applied
                  projects and our research-to-market program, working with the University
                  of Turku, Aalto AI, and HankenAI.{" "}
                  <Link
                    href="/research-to-market"
                    className="text-white underline hover:text-neutral-300"
                  >
                    Explore the research-to-market program →
                  </Link>
                </p>

                <p className="text-neutral-300 leading-relaxed mb-5">
                  <strong className="text-white">For companies and industrial partners:</strong>{" "}
                  Partner with Since AI to access 10,000+ builders in our network, co-design
                  hackathon challenges, and receive production support for the solutions teams
                  build. Strategic, capital, and community partnership tiers are available.{" "}
                  <Link href="/partners" className="text-white underline hover:text-neutral-300">
                    See partnership opportunities →
                  </Link>
                </p>

                <p className="text-neutral-300 leading-relaxed mb-0">
                  <strong className="text-white">For investors:</strong> Since AI partners
                  with Antler, Inventure, and Wave Ventures for venture pathways from the
                  community. For introductions to Since AI founders or to discuss co-sponsorship
                  of hackathon tracks, contact{" "}
                  <a
                    href="mailto:info@sinceai.fi"
                    className="text-white underline hover:text-neutral-300"
                  >
                    info@sinceai.fi
                  </a>
                  .
                </p>
              </section>

              {/* 8. FAQs */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  Frequently asked questions
                </h2>

                <div className="space-y-8">
                  {faqs.map((faq) => (
                    <div key={faq.q}>
                      <h3 className="text-lg font-bold text-white mb-2">{faq.q}</h3>
                      <p className="text-neutral-400 leading-relaxed">{faq.a}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 9. Last updated */}
              <section className="mb-8">
                <h2 className="text-sm font-semibold text-neutral-600 mb-2 uppercase tracking-wider">
                  Last updated
                </h2>
                <p className="text-xs text-neutral-600">
                  This page is maintained by Since AI ry and updated quarterly. Last
                  updated: April 16, 2026.
                </p>
              </section>

              {/* Cross-links */}
              <div className="pt-6 border-t border-white/5">
                <div className="flex flex-wrap gap-3 text-sm">
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
                    href="/hackathon"
                    className="text-neutral-400 hover:text-white underline"
                  >
                    Since AI Hackathon 2026
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
                    href="/about"
                    className="text-neutral-400 hover:text-white underline"
                  >
                    About Since AI
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link
                    href="/finland-ai"
                    className="text-neutral-400 hover:text-white underline"
                  >
                    Finland AI
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
