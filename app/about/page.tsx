import type { ReactNode } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FinalCta } from "@/components/sections/homepage/FinalCta";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import StructuredData from "@/components/StructuredData";
import { ORG } from "@/lib/org";
import { REACH, fmt, pct } from "@/lib/reach";
import { FIRST_EVENT, HACKATHON_2026_PARTNERS } from "@/lib/sinceai";
import { ANALYTICS_EVENTS } from "@/lib/gtag";
import { OG_IMAGE } from "@/lib/og";

const title = "About Since AI — The Global AI Ecosystem from Finland";
const description =
  "Since AI ry is the Finnish nonprofit behind a global AI ecosystem, advancing AI education, practical skills and open collaboration for builders worldwide.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://sinceai.ai/about" },
  openGraph: { title, description, url: "https://sinceai.ai/about", siteName: "Since AI", type: "website", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://sinceai.ai/" },
    { "@type": "ListItem", position: 2, name: "About", item: "https://sinceai.ai/about" },
  ],
};

const rikuSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Riku Lauttia",
  jobTitle: "Founder",
  worksFor: { "@id": "https://sinceai.ai/#organization" },
  url: "https://lauttia.ai",
  sameAs: ["https://lauttia.ai", "https://www.linkedin.com/in/rikulauttia/", "https://github.com/rikulauttia"],
  alumniOf: [
    { "@type": "CollegeOrUniversity", name: "Aalto University" },
    { "@type": "CollegeOrUniversity", name: "University of Turku" },
  ],
  knowsAbout: ["Artificial Intelligence", "Machine Learning", "Applied AI", "Strategic Partnerships", "Software Engineering"],
};

const inline = "text-white underline decoration-white/30 underline-offset-4 transition-colors hover:decoration-white";
const link = "text-neutral-300 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white";

/**
 * The story so far, in the order it happened. Every figure comes from the
 * site's own sources (lib/sinceai.ts, lib/reach.ts, the /impact case studies).
 */
const CHAPTERS: { when: string; where: string; title: string; body: ReactNode; now?: boolean }[] = [
  {
    when: "2025",
    where: "Finland",
    title: "A nonprofit for learning AI by building it.",
    body: (
      <>
        {ORG.legalName} is founded as a nonprofit association on a simple idea: people learn artificial intelligence
        fastest by building real projects, with the companies and researchers who need them.
      </>
    ),
  },
  {
    when: "21–23 Nov 2025",
    where: `${FIRST_EVENT.locationName}, ${FIRST_EVENT.addressLocality}`,
    title: `${FIRST_EVENT.attendance} builders. 72 hours. 30+ AI solutions.`,
    body: (
      <>
        The first Since AI Hackathon. Teams take on challenges from partner companies — real problems with real data,
        not invented briefs — and present working software, not slides.
      </>
    ),
  },
  {
    when: "After the weekend",
    where: "In production",
    title: "The demos kept going.",
    body: (
      <>
        A maritime sound-signal detector built for Kongsberg gets eight weeks of production support and is deployed to
        vessel systems. A spare-part search built for Sandvik goes into production use, saving more than eight hours per
        search. That became the model: the strongest teams don&apos;t stop at the demo.{" "}
        <Link href="/impact" className={inline}>
          Read the case studies
        </Link>
      </>
    ),
  },
  {
    when: "2026",
    where: `${REACH.members.countries} countries`,
    title: "The community goes global.",
    body: (
      <>
        {fmt(REACH.members.total)} builders join the Since AI platform from {REACH.members.countries} countries —{" "}
        {pct(REACH.members.outsideFinland)} of them outside Finland. By {REACH.asOfLabel},{" "}
        {fmt(REACH.applicants.total)} people from {REACH.applicants.countries} countries have applied for the next
        hackathon.
      </>
    ),
  },
  {
    when: "6–8 Nov 2026",
    where: "Turku, Finland",
    title: "Since AI Hackathon 2026.",
    now: true,
    body: (
      <>
        48 hours, 1,000+ builders and {HACKATHON_2026_PARTNERS.challengeTarget} company challenges from{" "}
        {HACKATHON_2026_PARTNERS.challengePartnersShort}, with a €50,000 prize pool, as an MLH 2027 Season Member Event.
        The best teams get eight weeks of production support.{" "}
        <Link href="/hackathon" className={inline}>
          About the hackathon
        </Link>
      </>
    ),
  },
  {
    when: "Next",
    where: "Everywhere",
    title: "You.",
    body: (
      <>
        Since AI grows the way it started: with builders who want to ship. Join {ORG.stats.network} of them on Discord
        and Telegram, and on the platform where teams, challenges and events come together.
      </>
    ),
  },
];

const PRINCIPLES = [
  {
    title: "Learning by building.",
    body: "Not content, networking or presentations alone. Students, researchers and developers learn AI by collaborating on real-world technology projects.",
  },
  {
    title: "Open collaboration.",
    body: "Programs run with universities, research groups, public institutions and technology partners, so people learn in contact with current practice and real problems.",
  },
  {
    title: "Programs, not one-off events.",
    body: "Hackathons, workshops and community initiatives connect. Builders keep developing through production support, community projects and research-to-practice work.",
  },
];

const FACTS: [string, string][] = [
  ["Legal entity", ORG.legalName],
  ["Form", "Nonprofit association (aatteellinen yhdistys)"],
  ["Business ID", "3593920-2"],
  ["Founded", "2025, Finland"],
  ["Headquarters", "Turku, Finland"],
  ["Registered address", "Haukilahdenkatu 1 A 89, 02200 Espoo, Finland"],
];

const CONTACTS = [
  { label: "General", email: "info@sinceai.fi" },
  { label: "Partnerships", email: "partners@sinceai.fi" },
  { label: "Builders", email: "builders@sinceai.fi" },
  { label: "Press", email: "press@sinceai.fi" },
];

/** A section with its heading in a left column on wide screens — the rhythm of the rest of the page. */
function Split({ id, title, children, sectionId }: { id: string; title: string; children: ReactNode; sectionId?: string }) {
  return (
    <section id={sectionId} aria-labelledby={id} className="border-t border-white/10 px-6 py-24 md:py-32">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
        <h2 id={id} className="text-3xl font-bold tracking-tight text-white text-balance md:text-4xl">
          {title}
        </h2>
        <div>{children}</div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <StructuredData data={breadcrumbSchema} />
      <StructuredData data={rikuSchema} />

      <main className="flex w-full flex-col overflow-x-clip bg-black">
        <section aria-labelledby="about-title" className="hero-backdrop relative px-6 pt-36 pb-20 md:pt-44 md:pb-28">
          <div className="relative mx-auto max-w-6xl">
            <h1
              id="about-title"
              className="max-w-5xl font-bold tracking-tight text-white leading-[1.02] text-balance"
              style={{ fontSize: "clamp(2.25rem, 4.6vw, 4.25rem)" }}
            >
              Most hackathons end with a pitch. Since AI was built for what happens next.
            </h1>
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-neutral-300 text-pretty md:text-lg">
              Since AI is a global AI ecosystem run by {ORG.legalName}, a Finnish nonprofit. We bring {ORG.stats.network}{" "}
              builders in {ORG.stats.countries} countries together with leading companies, investors and researchers — and
              stay with the strongest teams until what they build runs for real users.
            </p>
            <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-3 border-t border-white/10 pt-6 text-sm">
              {[
                ["Headquarters", "Turku, Finland"],
                ["Founded", "2025"],
                ["Organisation", "Nonprofit association"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="text-neutral-400">{k}</dt>
                  <dd className="text-white">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* The story so far — the page's one moving part: the line fills as you read (globals.css, .story). */}
        <section aria-labelledby="story-title" className="border-t border-white/10 px-6 py-24 md:py-32">
          <div className="mx-auto max-w-6xl">
            <h2 id="story-title" className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              The story so far
            </h2>

            <ol className="story relative mt-14 md:mt-20">
              {CHAPTERS.map((c) => (
                <li key={c.title} className="relative grid gap-x-16 pb-16 pl-10 last:pb-0 md:grid-cols-[13rem_1fr] md:pb-20 md:pl-0">
                  <span aria-hidden="true" className={c.now ? "story-mark story-mark-now" : "story-mark"} />
                  <p className="font-mono text-sm leading-6 md:text-right">
                    <span className={c.now ? "text-(--color-brand)" : "text-white"}>{c.when}</span>
                    <span className="block text-neutral-400">{c.where}</span>
                  </p>
                  <div className="mt-3 max-w-2xl md:mt-0">
                    <h3 className="text-2xl font-bold tracking-tight text-white text-balance md:text-3xl">{c.title}</h3>
                    <p className="mt-4 text-base leading-relaxed text-neutral-300 text-pretty">{c.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-14 grid grid-cols-2 gap-3 pl-10 sm:flex sm:flex-wrap md:ml-[17rem] md:pl-0">
              <TrackedLink
                href={ORG.social.discord}
                analyticsEvent={ANALYTICS_EVENTS.DISCORD_JOIN_CLICK}
                className="inline-flex min-h-12 items-center justify-center bg-white px-4 py-3 sm:px-7 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
              >
                Join on Discord <span aria-hidden="true" className="ml-2">→</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </TrackedLink>
              <TrackedLink
                href={ORG.social.telegram}
                analyticsEvent={ANALYTICS_EVENTS.TELEGRAM_JOIN_CLICK}
                className="inline-flex min-h-12 items-center justify-center border border-white/20 px-4 py-3 sm:px-7 text-sm font-semibold text-white transition-colors hover:border-white"
              >
                Telegram
                <span className="sr-only"> (opens in a new tab)</span>
              </TrackedLink>
            </div>
          </div>
        </section>

        <Split id="beliefs-title" title="How we carry out the mission">
          <div className="divide-y divide-white/10 border-y border-white/10">
            {PRINCIPLES.map((p) => (
              <div key={p.title} className="grid gap-3 py-8 sm:grid-cols-[14rem_1fr] sm:gap-10">
                <h3 className="text-lg font-semibold text-white">{p.title}</h3>
                <p className="leading-relaxed text-neutral-300 text-pretty">{p.body}</p>
              </div>
            ))}
          </div>
        </Split>

        <Split id="people-title" title="People">
          <div className="max-w-2xl space-y-6 leading-relaxed text-neutral-300 text-pretty">
            <p>
              Since AI was founded by <strong className="font-semibold text-white">Riku Lauttia</strong>, an AI engineer and
              entrepreneur, and is run by a team across partnerships, community, technology, production and finance.{" "}
              <Link href="/contact" className={link}>
                Meet the team
              </Link>
            </p>
            <p>
              It works with ecosystem partners worldwide, including Google for Developers, Antler, the University of Turku,
              Aalto AI, Boost Turku and HankenAI — {ORG.stats.partners} partners and supporters in all. A formal advisory
              board will be announced as Since AI expands.{" "}
              <Link href="/partners" className={link}>
                All partners
              </Link>
            </p>
          </div>
        </Split>

        {/* The registered mission, quoted as is for program reviewers (#nonprofit-mission is linked to). */}
        <Split id="nonprofit-mission-heading" sectionId="nonprofit-mission" title={ORG.mission.heading}>
          <div className="max-w-2xl space-y-6 leading-relaxed text-neutral-300 text-pretty">
            <p className="text-lg text-neutral-100">{ORG.mission.purpose}</p>
            <p>{ORG.mission.programs}</p>
            <p>{ORG.mission.notForProfit}</p>
          </div>
          <dl className="mt-12 grid gap-x-10 border-t border-white/10 sm:grid-cols-2">
            {FACTS.map(([k, v]) => (
              <div key={k} className="border-b border-white/10 py-4">
                <dt className="text-sm text-neutral-400">{k}</dt>
                <dd className="mt-1 text-white">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <Link href="/impact" className={link}>
              Our numbers, with methodology
            </Link>
            <Link href="/code-of-conduct" className={link}>
              Code of Conduct
            </Link>
            <Link href="/privacy" className={link}>
              Privacy Policy
            </Link>
            <Link href="/terms" className={link}>
              Terms of Service
            </Link>
          </p>
        </Split>

        <Split id="contact-title" title="Contact">
          <ul className="grid gap-x-10 border-t border-white/10 sm:grid-cols-2">
            {CONTACTS.map((c) => (
              <li key={c.email} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-white/10 py-4">
                <span className="text-sm text-neutral-400">{c.label}</span>
                <a href={`mailto:${c.email}`} className={link}>
                  {c.email}
                </a>
              </li>
            ))}
          </ul>
        </Split>

        <FinalCta />
        <Footer discordUrl={ORG.social.discord} />
      </main>
    </SmoothScroll>
  );
}
