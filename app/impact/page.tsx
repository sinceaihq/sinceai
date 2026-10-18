import React from "react";
import Link from "next/link";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FadeIn } from "@/components/motion-primitives/fade-in";
import { ORG } from "@/lib/org";

// TODO (Riku): verify "countries represented" before this page goes live.
// Current value uses the hero's claim of 100+ — replace with the defensible
// number from real hackathon applications + Discord analytics if lower.
const metrics: {
  metric: string;
  value: string;
  methodology: string;
  todo?: boolean;
}[] = [
  {
    metric: "AI builders in our network globally",
    value: ORG.stats.network,
    methodology:
      "Includes direct community members (Discord, newsletter, Medium), hackathon attendees (past and registered), and verified reach across partner AI communities globally. Not membership — reach.",
  },
  {
    metric: "Direct community members",
    value: ORG.stats.members,
    methodology:
      "Active members in our core Discord community. Figure from Discord server analytics.",
  },
  {
    metric: "Hackathon builders to date",
    value: ORG.stats.hackathonParticipants,
    methodology:
      "Cumulative builders across all Since AI events. Since AI Hackathon, Nov 21–23 2025, EduCity, Turku: 260 builders. Exact figure, not rounded.",
  },
  {
    metric: "Hackathon 2026 participants targeted",
    value: ORG.stats.hackathon2026Target,
    methodology:
      "Target based on venue capacity (EduCity, BioCity and Joki in Turku) and partner challenge scale. Since AI Hackathon 2026: 6–8 November 2026.",
  },
  {
    metric: "Partners & supporters",
    value: ORG.stats.partners,
    methodology:
      "Counted as organizations with a formal partnership role: event sponsorship (challenge partner), ecosystem support (MoU or named collaboration), or capital/research partner.",
  },
  {
    metric: "Projects shipped",
    value: ORG.stats.projects,
    methodology:
      "Hackathon and post-hackathon projects with public deliverables — GitHub repositories, live demos, or partner-accepted prototypes. See sinceai.ai/projects for public summaries.",
  },
  {
    metric: "Countries represented",
    value: ORG.stats.countries,
    methodology:
      "Via partner community reach, direct applications from Since AI Hackathon 2025, and Discord member analytics.",
  },
];

const EVENTS: { name: string; href?: string; dates: string; builders: string; projects: string }[] = [
  { name: "Since AI Hackathon 2025", dates: "21–23 Nov 2025", builders: "260", projects: "30+" },
  {
    name: "Since AI Hackathon 2026",
    href: "/hackathon",
    dates: "6–8 Nov 2026",
    builders: `${ORG.stats.hackathon2026Target} targeted`,
    projects: "Upcoming",
  },
];

/** Hackathon 2025 projects that went on to production support (figures as reported by the teams and partners). */
const CASE_STUDIES: { title: string; facts: [string, string][] }[] = [
  {
    title: "Maritime sound signal detection (Kongsberg)",
    facts: [
      ["Built at", "Since AI Hackathon 2025"],
      ["Support", "8 weeks"],
      ["Status", "Production deployment"],
      ["Impact", "Real-time maritime safety monitoring"],
    ],
  },
  {
    title: "Intelligent spare part discovery (Sandvik)",
    facts: [
      ["Built at", "Since AI Hackathon 2025 (RAG-based system)"],
      ["Support", "6 weeks"],
      ["Status", "Production use"],
      ["Impact", "8+ hours saved per search"],
    ],
  },
];

export default function ImpactPage() {
  return (
    <SmoothScroll>
      <Navbar />

      <main className="flex flex-col w-full bg-black min-h-screen">
        <div className="w-full max-w-4xl mx-auto px-6 py-32 md:py-40">
          <FadeIn>
            <div className="prose prose-invert prose-neutral max-w-none">

              {/* 1. H1 */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
                Impact &amp; numbers
              </h1>

              {/* 2. Intro paragraph */}
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-16">
                Since AI publishes real numbers with methodology notes. We believe
                credible ecosystems require transparent metrics. All figures below were
                last updated in {ORG.stats.lastUpdated} and are reviewed quarterly.
              </p>

              {/* 3. Metrics table */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Our numbers
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-3 pr-6 text-neutral-400 font-semibold w-2/5">
                          Metric
                        </th>
                        <th className="py-3 pr-6 text-neutral-400 font-semibold w-1/5 whitespace-nowrap">
                          Current value
                        </th>
                        <th className="py-3 text-neutral-400 font-semibold">
                          Methodology note
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.map((row) => (
                        <tr
                          key={row.metric}
                          className="border-b border-white/5 last:border-b-0 align-top"
                        >
                          <td className="py-4 pr-6 text-neutral-200 font-medium leading-snug">
                            {row.metric}
                          </td>
                          <td className="py-4 pr-6 font-bold text-white whitespace-nowrap">
                            {row.value}
                            {row.todo && (
                              <span className="ml-2 text-xs font-normal text-yellow-600">
                                ⚠ verify
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-white/55 text-xs leading-relaxed">
                            {row.methodology}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </section>

              {/* 4. Events to date */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">Events to date</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-3 pr-6 text-neutral-400 font-semibold">Event</th>
                        <th className="py-3 pr-6 text-neutral-400 font-semibold whitespace-nowrap">Dates</th>
                        <th className="py-3 pr-6 text-neutral-400 font-semibold">Builders</th>
                        <th className="py-3 text-neutral-400 font-semibold">Projects</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EVENTS.map((event) => (
                        <tr key={event.name} className="border-b border-white/5 last:border-b-0 align-top">
                          <td className="py-4 pr-6 text-neutral-200 font-medium">
                            {event.href ? (
                              <Link href={event.href} className="text-white underline hover:text-neutral-300">
                                {event.name}
                              </Link>
                            ) : (
                              event.name
                            )}
                          </td>
                          <td className="py-4 pr-6 text-neutral-300 whitespace-nowrap">{event.dates}</td>
                          <td className="py-4 pr-6 text-neutral-300">{event.builders}</td>
                          <td className="py-4 text-neutral-300">{event.projects}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* 5. From hackathon to production */}
              <section className="mb-16">
                <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">From hackathon to production</h2>
                <p className="text-neutral-300 leading-relaxed mb-8">
                  Since AI supports selected teams after the event, so that their solutions reach production
                  use with the challenge company.{" "}
                  <Link href="/production-support" className="text-white underline hover:text-neutral-300">
                    How production support works →
                  </Link>
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 not-prose">
                  {CASE_STUDIES.map((study) => (
                    <div key={study.title} className="border border-white/10 p-6">
                      <h3 className="text-lg font-bold text-white mb-4">{study.title}</h3>
                      <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
                        {study.facts.map(([label, value]) => (
                          <div key={label} className="contents">
                            <dt className="text-white/55">{label}</dt>
                            <dd className="text-neutral-300">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </section>

              {/* 6. What we don't claim */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-5 tracking-tight">
                  What we don&apos;t claim
                </h2>
                <p className="text-neutral-300 leading-relaxed">
                  We do not claim formal paid membership, venture-scale funding of Since
                  AI itself, or placement guarantees. Our value is the ecosystem —
                  partners, events, and execution pathways — not a membership database.
                </p>
              </section>

              {/* 7. Governance and funding */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-5 tracking-tight">
                  Governance and funding
                </h2>
                <p className="text-neutral-300 leading-relaxed">
                  Since AI ry is funded through partner sponsorships, public innovation
                  program support where applicable, and in-kind contributions from
                  ecosystem partners. We are a registered non-profit. Financial statements
                  are available on request to members.
                </p>
              </section>

              {/* 8. Data inquiries */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-5 tracking-tight">Data inquiries</h2>
                <p className="text-neutral-300 leading-relaxed">
                  For media, research or partnership questions about these figures, email{" "}
                  <a href={`mailto:${ORG.contact.infoEmail}`} className="text-white underline hover:text-neutral-300">
                    {ORG.contact.infoEmail}
                  </a>
                  .
                </p>
              </section>

              <p className="text-xs text-white/55 pt-6 border-t border-white/5">
                Last updated: {ORG.stats.lastUpdated}. Maintained by Since AI ry.
              </p>

              {/* Cross-links */}
              <div className="mt-10 flex flex-wrap gap-3 text-sm">
                <Link href="/about" className="text-neutral-400 hover:text-white underline">
                  About Since AI
                </Link>
                <span className="text-neutral-700" aria-hidden="true">&bull;</span>
                <Link href="/partners" className="text-neutral-400 hover:text-white underline">
                  Partners
                </Link>
                <span className="text-neutral-700" aria-hidden="true">&bull;</span>
                <Link href="/projects" className="text-neutral-400 hover:text-white underline">
                  Projects
                </Link>
                <span className="text-neutral-700" aria-hidden="true">&bull;</span>
                <Link href="/hackathon" className="text-neutral-400 hover:text-white underline">
                  Hackathon 2026
                </Link>
                <span className="text-neutral-700" aria-hidden="true">&bull;</span>
                <Link href="/press" className="text-neutral-400 hover:text-white underline">
                  Press
                </Link>
                <span className="text-neutral-700" aria-hidden="true">&bull;</span>
                <Link href="/faq" className="text-neutral-400 hover:text-white underline">
                  FAQ
                </Link>
              </div>

            </div>
          </FadeIn>
        </div>

        <Footer discordUrl={ORG.social.discord} />
      </main>
    </SmoothScroll>
  );
}
