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
  title: "About Since AI — Europe's Execution-Focused AI Innovation Ecosystem",
  description:
    "Since AI is a Finnish non-profit (Since AI ry, Business ID 3593920-2) connecting 10,000+ AI builders across Europe. Learn about our mission, founders, and legal structure.",
  alternates: { canonical: "https://sinceai.fi/about" },
  openGraph: {
    title: "About Since AI — Europe's Execution-Focused AI Innovation Ecosystem",
    description:
      "Since AI is a Finnish non-profit connecting 10,000+ AI builders across Europe with leading AI companies, research groups, and investors.",
    url: "https://sinceai.fi/about",
    siteName: "Since AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Since AI",
    description:
      "Finnish non-profit connecting 10,000+ AI builders across Europe. Mission: strengthen Europe's AI capability through execution.",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://sinceai.fi/",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "About",
      item: "https://sinceai.fi/about",
    },
  ],
};

const rikuSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Riku Lauttia",
  jobTitle: "Founder",
  worksFor: { "@id": "https://sinceai.fi/#organization" },
  url: "https://lauttia.ai",
  sameAs: [
    "https://lauttia.ai",
    "https://www.linkedin.com/in/rikulauttia/",
    "https://github.com/rikulauttia",
  ],
  alumniOf: [
    {
      "@type": "CollegeOrUniversity",
      name: "Aalto University",
    },
    {
      "@type": "CollegeOrUniversity",
      name: "University of Turku",
    },
  ],
  knowsAbout: [
    "Artificial Intelligence",
    "Machine Learning",
    "Applied AI",
    "Strategic Partnerships",
    "Software Engineering",
  ],
};

export default function AboutPage() {
  return (
    <SmoothScroll>
      <Navbar />

      <StructuredData data={breadcrumbSchema} />
      <StructuredData data={rikuSchema} />

      <main className="flex flex-col w-full bg-black min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-32 md:py-40">
          <FadeIn>
            <div className="prose prose-invert prose-neutral max-w-none">

              {/* 1. H1 */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
                About Since AI
              </h1>

              {/* 2. Extractable definition paragraph */}
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-16">
                Since AI is Europe&apos;s execution-focused AI innovation ecosystem, where
                frontier AI becomes shipped products. A Finnish non-profit connecting
                10,000+ AI builders across Europe with leading AI companies, research
                groups, and investors. Our mission: strengthen Europe&apos;s AI capability
                through execution, open collaboration, and real outcomes.
              </p>

              {/* 3. What makes us different */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-8 tracking-tight">
                  What makes us different
                </h2>
                <div className="space-y-6">
                  <p className="text-neutral-300 leading-relaxed">
                    <strong className="text-white">Execution over content.</strong>{" "}
                    We do not build another community around content, networking, or
                    presentations. We build an execution system where exceptional people
                    move from idea to prototype, prototype to production, and production
                    to startup-scale opportunity.
                  </p>
                  <p className="text-neutral-300 leading-relaxed">
                    <strong className="text-white">Ecosystem over community.</strong>{" "}
                    Since AI is not a single organization. It is an ecosystem that spans
                    leading AI companies, top research groups, world-class universities,
                    ambitious startup communities, and venture capital partners across
                    Europe.
                  </p>
                  <p className="text-neutral-300 leading-relaxed">
                    <strong className="text-white">Outcomes over events.</strong>{" "}
                    Hackathons and meetups are starting points, not endpoints. The
                    strongest teams receive continued support: deployment help, compute
                    access, capital introductions, and commercialization pathways.
                  </p>
                </div>
              </section>

              {/* 4. Founder */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-10 tracking-tight">
                  Founder
                </h2>

                <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.02]">
                  <div className="flex flex-col gap-4">
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      Riku Lauttia
                    </h3>
                    <p className="text-neutral-300 leading-relaxed">
                      AI engineer and entrepreneur building intelligent systems at the
                      intersection of technical execution and commercial strategy. Founded
                      Since AI in 2025 and led its growth to a 10,000+ builder network
                      and 30+ strategic partnerships.
                    </p>
                    <a
                      href="https://lauttia.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-white underline transition-colors text-sm"
                    >
                      lauttia.ai →
                    </a>
                  </div>
                </div>

                {/* Team pointer */}
                <p className="text-neutral-500 text-sm mt-6">
                  The full Since AI team — spanning Sales & Partnerships, Community,
                  Technology, Production, and Finance — is listed on the{" "}
                  <Link
                    href="/contact"
                    className="text-neutral-400 hover:text-white underline"
                  >
                    Contact page
                  </Link>
                  .
                </p>
              </section>

              {/* 5. Advisors and ecosystem partners */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Advisors and ecosystem partners
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  Since AI works closely with ecosystem partners across Europe, including
                  Google for Developers, Antler, the University of Turku, Aalto AI,
                  Boost Turku, and HankenAI. A formal advisory board will be announced
                  as Since AI expands in 2026.
                </p>
                <p className="text-neutral-500 text-sm">
                  <Link
                    href="/partners"
                    className="text-neutral-400 hover:text-white underline"
                  >
                    See all strategic, capital, and community partners →
                  </Link>
                </p>
              </section>

              {/* 6. Numbers */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Our numbers, transparently
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
                  {[
                    { value: "10,000+", label: "AI builders in our network" },
                    { value: "1,000+", label: "Builders targeted at Hackathon 2026" },
                    { value: "50+", label: "Countries represented" },
                    { value: "30+", label: "Partners & supporters" },
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
                <p className="text-neutral-400 text-sm">
                  We publish our real numbers, including methodology notes, at{" "}
                  <Link
                    href="/stats"
                    className="text-neutral-300 hover:text-white underline"
                  >
                    sinceai.fi/stats
                  </Link>
                  .
                </p>
              </section>

              {/* 7. Legal and governance */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Legal and governance
                </h2>

                <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 text-sm">
                    <div>
                      <dt className="text-neutral-500 font-semibold uppercase tracking-wider text-xs mb-1">
                        Legal entity
                      </dt>
                      <dd className="text-neutral-200">Since AI ry</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 font-semibold uppercase tracking-wider text-xs mb-1">
                        Organizational form
                      </dt>
                      <dd className="text-neutral-200">
                        Non-profit association (aatteellinen yhdistys)
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 font-semibold uppercase tracking-wider text-xs mb-1">
                        Business ID
                      </dt>
                      <dd className="text-neutral-200">3593920-2</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 font-semibold uppercase tracking-wider text-xs mb-1">
                        Registered in
                      </dt>
                      <dd className="text-neutral-200">Finland</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 font-semibold uppercase tracking-wider text-xs mb-1">
                        Registered address
                      </dt>
                      <dd className="text-neutral-200">
                        Vähä Hämeenkatu 1, Turku, Finland
                      </dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 font-semibold uppercase tracking-wider text-xs mb-1">
                        Founded
                      </dt>
                      <dd className="text-neutral-200">2025</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-neutral-500 font-semibold uppercase tracking-wider text-xs mb-2">
                        Governance documents
                      </dt>
                      <dd className="flex flex-wrap gap-4">
                        <Link
                          href="/code-of-conduct"
                          className="text-neutral-400 hover:text-white underline text-sm"
                        >
                          Code of Conduct
                        </Link>
                        <Link
                          href="/privacy"
                          className="text-neutral-400 hover:text-white underline text-sm"
                        >
                          Privacy Policy
                        </Link>
                        <Link
                          href="/terms"
                          className="text-neutral-400 hover:text-white underline text-sm"
                        >
                          Terms of Service
                        </Link>
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              {/* 8. Contact */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Contact
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      label: "General inquiries",
                      email: "info@sinceai.fi",
                    },
                    {
                      label: "Press",
                      email: "press@sinceai.fi",
                    },
                    {
                      label: "Partnerships",
                      email: "partners@sinceai.fi",
                    },
                    {
                      label: "Builders",
                      email: "builders@sinceai.fi",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="p-5 rounded-xl border border-white/5 bg-white/[0.02]"
                    >
                      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                        {item.label}
                      </div>
                      <a
                        href={`mailto:${item.email}`}
                        className="text-neutral-200 hover:text-white underline text-sm transition-colors"
                      >
                        {item.email}
                      </a>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <a
                    href={ORG.social.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02]"
                  >
                    Join Discord →
                  </a>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-full transition-all duration-300 hover:bg-white/15 border border-white/20 hover:border-white/30 hover:scale-[1.02]"
                  >
                    Full team directory
                  </Link>
                </div>
              </section>

              {/* Cross-links */}
              <div className="pt-6 border-t border-white/5">
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link href="/hackathon" className="text-neutral-400 hover:text-white underline">
                    Hackathon 2026
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link href="/partners" className="text-neutral-400 hover:text-white underline">
                    Partners
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
                  <Link href="/faq" className="text-neutral-400 hover:text-white underline">
                    FAQ
                  </Link>
                  <span className="text-neutral-700">&bull;</span>
                  <Link href="/press" className="text-neutral-400 hover:text-white underline">
                    Press
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
