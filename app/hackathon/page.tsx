import React from "react";
import Link from "next/link";
import Image from "next/image";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import StructuredData from "@/components/StructuredData";
import { PartnerMarquee } from "@/components/PartnerMarquee";
import { FadeIn, FadeInView } from "@/components/motion-primitives/fade-in";
import {
  Judges,
  FeaturedSpeakers,
  StatBand,
  PartnerLogoGrid,
  FaqAccordion,
} from "@/components/sections/hackathon";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import ORG from "@/lib/org";
import { AWARDS_HREF, COMPUTING_HREF, GUIDE_BASE_PATH, OVERALL_WINNER_STATEMENT } from "@/lib/hackathon-2026";
import { REACH, fmt } from "@/lib/reach";
import {
  HACKATHON_2026,
  HACKATHON_2026_CHALLENGE_LIST,
  HACKATHON_2026_PARTNERS,
  MLH_2027,
} from "@/lib/sinceai";

/**
 * Since AI Hackathon 2026 ended on 8 November 2026, and this page is its record:
 * what the event was, where its guide is and what to do next. It never invites
 * anyone to apply. Winners, attendance and project counts are added only once
 * the organisers have confirmed them; until then the page gives the figures
 * published before the event, with their date.
 */
const APPLICATIONS = `${fmt(REACH.applicants.total)} from ${REACH.applicants.countries} countries (as of ${REACH.asOfLabel})`;
const DISCORD = ORG.social.discord.replace("https://", "");
const TELEGRAM = ORG.social.telegram.replace("https://", "");

// ── Schemas ────────────────────────────────────────────────────────────────

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home",              item: "https://sinceai.ai" },
    { "@type": "ListItem", position: 2, name: "Events",            item: "https://sinceai.ai/events" },
    { "@type": "ListItem", position: 3, name: "Since AI Hackathon 2026", item: "https://sinceai.ai/hackathon" },
  ],
};

const hackathonFaqs = [
  {
    q: "What is Since AI Hackathon?",
    a: "Since AI Hackathon is the flagship annual event of Since AI — a global execution-focused AI innovation ecosystem based in Turku, Finland. The 2026 edition, a Major League Hacking (MLH) 2027 Season Member Event, took place in Turku on 6–8 November 2026: builders from across the world gathered for a weekend to solve real company challenges and ship working AI products.",
  },
  {
    q: "When was Since AI Hackathon 2026?",
    a: "Since AI Hackathon 2026 took place on November 6–8, 2026 in Turku, Finland, and has ended. The published programme ran from check-in, team formation and challenge selection on Friday 6 November at 15:00 at EduCity, through the opening ceremony at 17:00, to the submission deadline on Sunday 8 November at 10:00, the closing ceremony at 13:15 and the finals at 14:00, ending around 15:30.",
  },
  {
    q: "Can I still register for Since AI Hackathon 2026?",
    a: `No. Since AI Hackathon 2026 has ended and registration is closed. The dates of the next edition have not been announced. To hear first, join the Since AI community on Discord (${DISCORD}) or Telegram (${TELEGRAM}).`,
  },
  {
    q: "Where are the results and the projects?",
    a: "Winners and final figures are published on sinceai.ai only once the organisers have confirmed them; none are published on this page yet. Projects from Since AI Hackathon 2025 are at sinceai.ai/projects.",
  },
  {
    q: "Was Since AI Hackathon 2026 an official MLH event?",
    a: "Yes. Since AI Hackathon 2026 was a Major League Hacking (MLH) Member Event of the 2027 MLH season, which covers the 2026–27 hackathon year. MLH is the world's largest hackathon league. The MLH Code of Conduct applied at the event alongside Since AI's own Code of Conduct.",
  },
  {
    q: "Who could participate?",
    a: "Since AI Hackathon 2026 was open to builders worldwide — developers, researchers, designers, and entrepreneurs. Students and professionals were both welcome. The event was held in English.",
  },
  {
    q: "Where was the event held?",
    a: "On the Turku science park campus in Turku, Finland. The opening on Friday and the closing on Sunday were at EduCity (Joukahaisenkatu 7), the campus of Turku University of Applied Sciences; teams built around the clock next door at BioCity (Tykistökatu 6) and Joki (Lemminkäisenkatu 12b).",
  },
  {
    q: "Was participation free?",
    a: "Yes. Since AI Hackathon 2026 was free to attend for builders. Companies take part as sponsors and challenge partners — see sinceai.ai/partners.",
  },
  {
    q: "What companies set challenges?",
    a: `Since AI Hackathon 2026 had 15 company challenges, and every team chose one. The challenge partners were ${HACKATHON_2026_CHALLENGE_LIST}. The prize terms published for the event: ${HACKATHON_2026_PARTNERS.prizes} ${OVERALL_WINNER_STATEMENT}`,
  },
  {
    q: "How did the weekend work?",
    a: "Teams of up to five formed in sinceai.app. On Friday at EduCity every member checked in, the team lead marked the team as ready and selected one of the 15 company challenges in the app between 15:00 and 17:30; the choice was final. The programme then had Major League Hacking's introduction at 16:45, the opening at 17:00, Jason Mayes' keynote and tech talk, and each company's briefing for its teams. Teams built at BioCity and Joki, which stayed open around the clock, with company Q&A on Saturday. Submissions closed on Sunday at 10:00, followed by a participant vote of 20 comparisons per eligible builder. Each company picked the top three teams of its challenge, and the finals were for five finalist teams — the highest-ranked projects from five different company challenges — presenting live on stage to the jury that selects the overall winner.",
  },
  {
    q: "Were there prizes besides the company challenges?",
    a: "Yes — optional awards a team could enter with the same project in sinceai.app: eight Major League Hacking prize categories, the Red Hat OpenShift AI Technology Award and the non-cash FIWARE Open Innovation Award. They never replaced the company challenge. The details are in the Field Guide's AI Tools & Resources, under Optional awards.",
    href: AWARDS_HREF,
    linkLabel: "Optional awards in the Field Guide",
  },
  {
    q: "Could teams use AI tools like ChatGPT, Claude, Cursor or GitHub Copilot?",
    a: "Yes — AI-assisted development was permitted and encouraged, with any AI assistant, coding agent, model or platform. Teams stayed responsible for their solution: understanding and verifying what they shipped, being ready to explain it, disclosing the main AI tools they used, and keeping pre-existing work apart from what they built at the event. Licences and each challenge's rules and data restrictions still applied.",
  },
  {
    q: "How did teams submit their projects?",
    a: "In sinceai.app — the official submission platform, not Devpost — by Sunday 8 November 2026 at 10:00 (EET). Each team submitted one entry with its project name, a one-sentence tagline, a description, the technologies it built with, a repository link, a YouTube demo video and its source code as a .zip, and accepted the challenge's IP terms in the app. A demo URL, a pitch deck and supporting documents were optional.",
  },
  {
    q: "Which code of conduct applied?",
    a: `Since AI's Code of Conduct (sinceai.ai/code-of-conduct) and the MLH Code of Conduct (${MLH_2027.codeOfConduct}) both applied to everyone at the event.`,
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: hackathonFaqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

// ── Content data ──────────────────────────────────────────────────────────

const keyFacts = [
  { label: "Status",         value: "Completed — the event has ended and registration is closed" },
  { label: "Date",           value: HACKATHON_2026.dateNote },
  { label: "Venues",         value: "EduCity (opening and closing), BioCity and Joki (building) — Turku, Finland" },
  { label: "Prize pool",     value: "€50,000+ in cash" },
  { label: "Format",         value: "AI hackathon, Friday 6 to Sunday 8 November 2026" },
  { label: "Programme",      value: "Fri 15:00 check-in · Fri 17:00 opening · Sun 10:00 submission deadline · Sun 13:15 closing ceremony · Sun 14:00 finals · end around 15:30" },
  { label: "Challenges",     value: `${HACKATHON_2026_PARTNERS.challengeTarget} company challenges` },
  { label: "Keynote",        value: HACKATHON_2026_PARTNERS.keynote },
  { label: "Applications",   value: APPLICATIONS },
  { label: "Participation",  value: "Free for builders" },
  { label: "Open to",        value: "Builders worldwide — students and professionals" },
  { label: "MLH",            value: MLH_2027.label },
  { label: "Organised by",   value: "Since AI (sinceai.ai)" },
];

const whyItems = [
  {
    num: "01",
    title: "Real industry challenges",
    body: `${HACKATHON_2026_PARTNERS.challengeTarget} company challenges in 2026, set by ${HACKATHON_2026_PARTNERS.challengePartnersShort} — real problems from companies that need them solved.`,
  },
  {
    num: "02",
    title: "MLH Member Event",
    body: "Since AI Hackathon 2026 was a Major League Hacking (MLH) 2027 Season Member Event — part of the world's largest hackathon league and its global builder community.",
  },
  {
    num: "03",
    title: "Global builder network",
    body: `Join ${ORG.stats.network} Since AI community members globally. Past participants have been hired, founded startups, and built lasting professional connections.`,
  },
  {
    num: "04",
    title: "Working demos only",
    body: "No mockups. Since AI Hackathon rewards teams that build and demo working AI products — the finals are five finalist teams presenting theirs live on stage.",
  },
];

/** Where a visitor goes from a finished event. */
const nextLinks = [
  { href: GUIDE_BASE_PATH, label: "How the weekend ran: the Hackathon 2026 Field Guide" },
  { href: "/projects", label: "Projects from Since AI Hackathon 2025" },
  { href: "/production-support", label: "After a hackathon: eight weeks of production support" },
  { href: "/events", label: "All Since AI events" },
];

// Google is not a 2026 compute partner: its event credits were revoked (lib/hackathon-2026/resources.ts).
const headlinePartners = [
  {
    name: "LUMI",
    label: "Compute partner · CSC / LUMI AI Factory",
    logo: "/assets/sponsors/Lumi.svg",
    href: "https://lumi-ai-factory.eu/",
  },
];

const primaryButton =
  "inline-block bg-white text-black rounded-none px-6 py-3 font-semibold hover:bg-neutral-100 transition-colors cursor-pointer text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const ghostButton =
  "inline-block border border-white/20 text-white rounded-none px-6 py-3 font-semibold hover:border-white transition-colors cursor-pointer text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const textLink =
  "text-sm text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

// ── Page ──────────────────────────────────────────────────────────────────

export default function HackathonPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <StructuredData data={breadcrumbSchema} />
      <StructuredData data={faqSchema} />

      <main className="flex flex-col w-full bg-black min-h-screen">

        {/* ── SECTION 1: Hero ─────────────────────────────────── */}
        <section id="hackathon-hero" className="relative w-full flex flex-col px-6">
          {/* Plain responsive image: images are served unoptimised, so the phone size is a file of its own.
              <picture> keeps React from turning it into a preload hint in this route's RSC payload, which
              would make every page that prefetches /hackathon download the hero too. */}
          <picture>
            <img
              src="/assets/images/educity-hero.webp"
              srcSet="/assets/images/educity-hero-828.webp 828w, /assets/images/educity-hero.webp 1920w"
              sizes="100vw"
              alt="EduCity, Turku — venue of Since AI Hackathon 2026"
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.72)" }} />
          <div
            className="absolute inset-x-0 bottom-0 h-3/5"
            style={{ background: "linear-gradient(to top, #000 0%, transparent 100%)" }}
          />

          {/* Official MLH 2027-season Trust Badge (mlh.com/brand-guidelines): in the page header, top
              right, below the fixed navbar. MLH's own embed pins it to the viewport; here it scrolls
              with the hero so it never covers the navbar. */}
          <a
            id="mlh-trust-badge"
            href={MLH_2027.trustBadgeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute z-20 block right-4 sm:right-[50px] top-[84px]"
            style={{ width: "clamp(60px, 10vw, 100px)" }}
          >
            <picture className="block">
              {/* MLH serves the official badge; it is not optimised by us. */}
              <img src={MLH_2027.trustBadgeSrc} alt={MLH_2027.trustBadgeAlt} width={100} height={175} className="w-full h-auto" />
            </picture>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>

          <FadeIn className="relative z-10 mx-auto w-full max-w-6xl pb-12"
            style={{ paddingTop: "clamp(100px, 13vh, 140px)" }}
          >
            <nav aria-label="Breadcrumb" className="mb-4 pr-[84px] lg:pr-0">
              <ol className="flex flex-wrap items-center gap-x-2 text-xs font-mono uppercase tracking-widest text-white/60">
                <li>
                  <Link
                    href="/events"
                    className="inline-block py-2 underline underline-offset-4 decoration-white/30 hover:text-white hover:decoration-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    Events
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-white/80">Hackathon 2026</li>
              </ol>
            </nav>

            <p className="text-xs font-mono uppercase tracking-widest text-white/60 mb-5 pr-[84px] lg:pr-0">
              {"// mlh 2027 season member event"}
            </p>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 max-w-[820px] leading-none pr-[84px] lg:pr-0">
              Since AI Hackathon 2026.
            </h1>

            <p className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-6 leading-snug max-w-[720px]">
              6–8 November 2026, Turku. 15 company challenges.{" "}
              <span style={{ color: "var(--color-brand)" }}>€50,000+ cash prize pool.</span>
            </p>

            {/* The state of the event, in words — never only a coloured dot. */}
            <p className="text-sm text-white mb-3" data-event-status="completed">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-neutral-400 mr-2 align-middle"
                aria-hidden="true"
              />
              This event has ended. Registration is closed.
            </p>
            <p className="text-sm text-white/75 mb-8 max-w-[640px] leading-relaxed">
              Thank you to every builder, partner, mentor, judge and volunteer. This page is the record of
              the event; winners and final figures are added once the organisers have confirmed them.
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
              <TrackedLink href={ORG.social.discord} analyticsEvent="discord_join_click" className={primaryButton}>
                Join the community <span aria-hidden="true">→</span>
                <span className="sr-only"> on Discord (opens in a new tab)</span>
              </TrackedLink>
              <Link href={GUIDE_BASE_PATH} className={ghostButton}>
                Hackathon 2026 guide <span aria-hidden="true">→</span>
              </Link>
              <Link href="/partners" className={ghostButton}>
                Partner with us <span aria-hidden="true">→</span>
              </Link>
            </div>
          </FadeIn>

          {/* Partner marquee sits inside the hero so the logos are part of the
              first impression, above the fold, before any scrolling.
              -mx-6 cancels the section's px-6 so the track runs full-bleed to
              both screen edges — the mask gradient does the fading. */}
          <div className="relative z-10 -mx-6">
            <PartnerMarquee colorful label="// partners & sponsors" />
          </div>
        </section>

        {/* ── SECTION 2: Stat band ─────────────────────────────── */}
        <FadeInView>
          <StatBand />
        </FadeInView>

        {/* ── SECTION 3: What it was ───────────────────────────── */}
        <FadeInView>
          <section className="py-24 px-6 border-t border-white/10">
            <div className="mx-auto max-w-6xl">
              <p className="text-xs font-mono uppercase tracking-widest text-white/55 mb-3">
                {"// what it was"}
              </p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-8">
                A weekend. Real challenges. Shipped products.
              </h2>

              <div className="text-sm text-neutral-400 leading-relaxed max-w-[720px] space-y-4">
                <p>
                  Since AI Hackathon is the flagship annual event of Since AI — a global
                  execution-focused AI innovation ecosystem based in Turku, Finland, backed
                  by 100+ strategic, capital, and research partners.
                </p>
                <p>
                  In 2026, teams formed on Friday afternoon, selected one of 15 company challenges in
                  sinceai.app between 15:00 and 17:30, and worked to Sunday&apos;s 10:00 submission
                  deadline. The challenges were set by {HACKATHON_2026_CHALLENGE_LIST}. The event was
                  open to developers, researchers, and entrepreneurs worldwide.
                </p>
                <p className="text-white font-semibold">
                  No mockups. Working demos first — a slide deck is optional, never a substitute.
                </p>
              </div>
            </div>
          </section>
        </FadeInView>

        {/* ── SECTION 4: Challenge partners (logo grid) ────────── */}
        <FadeInView>
          <PartnerLogoGrid />
        </FadeInView>

        {/* ── SECTION 5: Speakers & judges ─────────────────────── */}
        <FadeInView>
          <FeaturedSpeakers />
        </FadeInView>
        <FadeInView>
          <Judges />
        </FadeInView>

        {/* ── SECTION 6: Headline partners ─────────────────────── */}
        <FadeInView>
          <section className="py-24 px-6 border-t border-white/10">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-12">
                Powered by world-class infrastructure.
              </h2>

              <div className="flex flex-col md:flex-row md:-ml-6">
                {headlinePartners.map((partner, i) => (
                  <div
                    key={partner.name}
                    className={`py-6 md:px-6 md:flex-1 ${i > 0 ? "border-t md:border-t-0 md:border-l border-white/10" : ""}`}
                  >
                    <p className="text-xs font-mono uppercase tracking-widest text-white/55 mb-3">
                      {partner.label}
                    </p>
                    <a
                      href={partner.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-4 sm:gap-5 group"
                      aria-label={`${partner.name} — Since AI Hackathon 2026 infrastructure partner`}
                    >
                      <h3 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-none">
                        {partner.name}
                      </h3>
                      <span className="relative w-20 h-10 md:w-24 md:h-12 shrink-0">
                        <Image
                          src={partner.logo}
                          alt={`${partner.name} logo`}
                          fill
                          className="object-contain object-center"
                          sizes="96px"
                        />
                      </span>
                    </a>
                  </div>
                ))}
              </div>

              <p className="text-sm text-neutral-400 leading-relaxed mt-8 max-w-2xl">
                CSC / LUMI AI Factory gave eligible, pre-registered participants access to the LUMI
                supercomputer and the Aitta inference service. Using it was optional; eligibility and
                the other tools are described in the{" "}
                <Link href={COMPUTING_HREF} className="text-white underline underline-offset-4 hover:text-neutral-300">
                  Field Guide
                </Link>
                .
              </p>
            </div>
          </section>
        </FadeInView>

        {/* ── SECTION 7: The format ───────────────────────────── */}
        <FadeInView>
          <section className="py-24 px-6 border-t border-white/10">
            <div className="mx-auto max-w-6xl">
              <p className="text-xs font-mono uppercase tracking-widest text-white/55 mb-3">
                {"// the format"}
              </p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-10">
                Built for builders who ship.
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {whyItems.map((item) => (
                  <div
                    key={item.num}
                    className="border border-white/5 p-8 hover:border-white/20 hover:bg-white/[0.02] transition-all duration-300"
                  >
                    <p className="text-xs font-mono text-white/55 mb-4" aria-hidden="true">
                      {item.num}
                    </p>
                    <h3 className="text-2xl font-bold tracking-tight text-white mb-3">
                      {item.title}
                    </h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeInView>

        {/* ── SECTION 8: Venue ────────────────────────────────── */}
        <FadeInView>
          <section className="py-24 px-6 border-t border-white/10">
            <div className="mx-auto max-w-6xl">
              <p className="text-xs font-mono uppercase tracking-widest text-white/55 mb-3">
                {"// venue"}
              </p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-8">
                EduCity, BioCity and Joki, Turku.
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                <div>
                  <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                    Since AI Hackathon 2026 took place on the Turku science park campus. Friday&apos;s
                    opening and Sunday&apos;s closing were at EduCity — the campus of Turku University of
                    Applied Sciences (Turku AMK), Joukahaisenkatu 7, 20520 Turku. Teams built around the
                    clock next door at BioCity and Joki. The Hackathon 2026 guide keeps every room, map
                    and walking route.
                  </p>
                  <div className="flex flex-wrap gap-x-8 gap-y-2">
                    <Link href={`${GUIDE_BASE_PATH}/venue`} className={textLink}>
                      Venue maps & directions <span aria-hidden="true">→</span>
                    </Link>
                    <a
                      href="https://maps.google.com/?q=EduCity+Joukahaisenkatu+7+Turku"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={textLink}
                    >
                      EduCity on Google Maps <span aria-hidden="true">↗</span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </div>
                </div>

                <div className="relative w-full h-[280px] overflow-hidden">
                  <Image
                    src="/assets/images/educity-card.webp"
                    alt="EduCity building — venue of Since AI Hackathon 2026, Turku, Finland"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </section>
        </FadeInView>

        {/* ── SECTION 9: Key facts ─────────────────────────────── */}
        <section className="py-24 px-6 border-t border-white/10">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-mono uppercase tracking-widest text-white/55 mb-3">
              {"// key facts"}
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-8">
              At a glance.
            </h2>

            <dl className="border-t border-white/10">
              {keyFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex flex-col sm:flex-row sm:items-baseline gap-3 py-4 border-b border-white/10"
                >
                  <dt className="text-xs font-mono uppercase tracking-widest text-white/55 shrink-0 w-40">
                    {fact.label}
                  </dt>
                  <dd className="text-sm text-white">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── SECTION 10: What's next ──────────────────────────── */}
        <section
          id="next"
          aria-labelledby="next-title"
          className="py-24 px-6 border-t border-white/10"
          style={{ scrollMarginTop: "80px" }}
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-mono uppercase tracking-widest text-white/55 mb-3">
              {"// what's next"}
            </p>
            <h2 id="next-title" className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
              The next edition is not announced yet.
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-[560px] mb-8">
              Since AI Hackathon 2026 has ended, and there is nothing to apply for right now. Dates and
              registration for the next Since AI Hackathon are announced in the community first.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <TrackedLink href={ORG.social.discord} analyticsEvent="discord_join_click" className={primaryButton}>
                Join Discord <span aria-hidden="true">→</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </TrackedLink>
              <TrackedLink href={ORG.social.telegram} analyticsEvent="telegram_join_click" className={ghostButton}>
                Join Telegram <span aria-hidden="true">→</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </TrackedLink>
            </div>

            <ul className="border-t border-white/10">
              {nextLinks.map((link) => (
                <li key={link.href} className="border-b border-white/10">
                  <Link
                    href={link.href}
                    className="flex min-h-14 items-center justify-between gap-6 py-3 text-sm text-neutral-300 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {link.label}
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>

            <p className="text-sm text-neutral-400 mt-6">
              Setting a challenge or sponsoring a future event?{" "}
              <Link href="/partners" className={textLink}>
                Partner with Since AI
              </Link>
            </p>
          </div>
        </section>

        {/* ── SECTION 11: Past edition ─────────────────────────── */}
        <FadeInView>
          <section className="py-24 px-6 border-t border-white/10">
            <div className="mx-auto max-w-6xl">
              <p className="text-xs font-mono uppercase tracking-widest text-white/55 mb-3">
                {"// previous editions"}
              </p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-8">
                Since AI Hackathon 2025.
              </h2>

              <div className="border-l border-white/10 pl-6">
                <p className="text-sm text-neutral-400 leading-relaxed mb-8 max-w-[640px]">
                  The inaugural Since AI Hackathon brought together 260 builders from across
                  Finland and Europe. Teams tackled real industry challenges from Kongsberg,
                  Sandvik, Valmet, and other partner companies, shipping 30+ AI prototypes
                  in 72 hours.
                </p>

                <div className="flex flex-wrap gap-8">
                  <Link href="/projects" className={textLink}>
                    View shipped projects <span aria-hidden="true">→</span>
                  </Link>
                  <Link href="/events" className={textLink}>
                    All events <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </FadeInView>

        {/* ── SECTION 12: FAQ ───────────────────────────────────── */}
        <section className="py-24 px-6 border-t border-white/10">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-mono uppercase tracking-widest text-white/55 mb-3">
              {"// faq"}
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-10">
              Frequently asked questions.
            </h2>

            <FaqAccordion faqs={hackathonFaqs} />

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              <Link href="/faq" className={textLink}>
                More questions? See our full FAQ <span aria-hidden="true">→</span>
              </Link>
              <Link href="/code-of-conduct" className={textLink}>
                Since AI Code of Conduct <span aria-hidden="true">→</span>
              </Link>
              <a
                href={MLH_2027.codeOfConduct}
                target="_blank"
                rel="noopener noreferrer"
                className={textLink}
              >
                MLH Code of Conduct <span aria-hidden="true">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </div>
        </section>

        <Footer discordUrl={ORG.social.discord} />
      </main>
    </SmoothScroll>
  );
}
