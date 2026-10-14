import React from "react";
import Link from "next/link";
import Image from "next/image";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import StructuredData from "@/components/StructuredData";
import { HackathonCountdown } from "@/components/HackathonCountdown";
import { PartnerMarquee } from "@/components/PartnerMarquee";
import { FadeIn, FadeInView } from "@/components/motion-primitives/fade-in";
import {
  Judges,
  FeaturedSpeakers,
  StatBand,
  PartnerLogoGrid,
  FaqAccordion,
  StickyApplyBar,
} from "@/components/sections/hackathon";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import ORG from "@/lib/org";
import { HACKATHON_2026_CHALLENGE_LIST, HACKATHON_2026_PARTNERS, MLH_2027, UPCOMING_EVENT_2026 } from "@/lib/sinceai";

const APPLY_URL = "https://sinceai.app/sign-up";

// ── Schemas ────────────────────────────────────────────────────────────────

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home",              item: "https://sinceai.ai" },
    { "@type": "ListItem", position: 2, name: "Since AI Hackathon 2026", item: "https://sinceai.ai/hackathon" },
  ],
};

const hackathonFaqs = [
  {
    q: "What is Since AI Hackathon?",
    a: "Since AI Hackathon is the flagship annual event of Since AI — a global execution-focused AI innovation ecosystem based in Turku, Finland. The 2026 edition is a Major League Hacking (MLH) 2027 Season Member Event. Builders from across the world gather for a 72-hour AI hackathon format to solve real company challenges and ship working AI products.",
  },
  {
    q: "When is Since AI Hackathon 2026?",
    a: `Since AI Hackathon 2026 runs November 6–8, 2026 in Turku, Finland. Check-in and team formation open Friday 6 November at 15:00 at EduCity; the opening ceremony starts at 17:00, and teams select their challenge in sinceai.app until 17:30. Submissions close Sunday 8 November at 10:00, the closing ceremony starts at 13:15, each company challenge's top three teams are announced from 13:30, the finals start at 14:00 and the event ends around 15:30. Registration is open — apply at sinceai.app/sign-up.`,
  },
  {
    q: "Is Since AI Hackathon an official MLH event?",
    a: "Yes. Since AI Hackathon 2026 is a Major League Hacking (MLH) Member Event of the 2027 MLH season, which covers the 2026–27 hackathon year. MLH is the world's largest hackathon league. The MLH Code of Conduct applies at the event alongside Since AI's own Code of Conduct.",
  },
  {
    q: "Who can participate?",
    a: "Since AI Hackathon is open to builders worldwide — developers, researchers, designers, and entrepreneurs. Students and professionals both welcome. The event is held in English.",
  },
  {
    q: "Where is the event held?",
    a: "On the Turku science park campus in Turku, Finland. The opening on Friday and the closing on Sunday are at EduCity (Joukahaisenkatu 7), the campus of Turku University of Applied Sciences; teams build around the clock next door at BioCity (Tykistökatu 6) and Joki (Lemminkäisenkatu 12b).",
  },
  {
    q: "Is registration free?",
    a: "Yes. Since AI Hackathon is free to attend for builders. Sponsorship and challenge partner opportunities are available for companies — see sinceai.ai/partners.",
  },
  {
    q: "How do I register?",
    a: `Registration for Since AI Hackathon 2026 is now open. Apply at sinceai.app/sign-up — free for all builders worldwide. Join our Discord (${ORG.social.discord.replace("https://", "")}) or Telegram (${ORG.social.telegram.replace("https://", "")}) to connect with other participants.`,
  },
  {
    q: "What companies set challenges?",
    a: `Since AI Hackathon 2026 is built for 15 company challenges. The challenge partners are ${HACKATHON_2026_CHALLENGE_LIST}; two more challenge partners are still to be announced.`,
  },
  {
    q: "What happens over the weekend?",
    a: "On Friday, teams of up to five form in sinceai.app at EduCity by 16:45, and each team's owner selects one company challenge in the app during the 17:00 opening ceremony. After the opening and Jason Mayes' keynote and tech talk, each company briefs its teams. Teams then build at BioCity and Joki, which stay open around the clock, with company Q&A on Saturday. Submissions close Sunday at 10:00. Each company picks the top three teams of its challenge, and in the 14:00 finals five finalist teams present live on stage to the jury, which selects the overall winner.",
  },
  {
    q: "Which code of conduct applies?",
    a: `Since AI's Code of Conduct (sinceai.ai/code-of-conduct) and the MLH Code of Conduct (${MLH_2027.codeOfConduct}) both apply to everyone at the event.`,
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
  { label: "Date",           value: UPCOMING_EVENT_2026.dateNote },
  { label: "Venues",         value: "EduCity (opening and closing), BioCity and Joki (building) — Turku, Finland" },
  { label: "Prize pool",     value: "€50,000 cash" },
  { label: "Format",         value: "72-hour AI hackathon" },
  { label: "Schedule",       value: "Fri 15:00 check-in · Fri 17:00 opening · Sun 10:00 submissions close · Sun 13:15 closing ceremony · Sun 14:00 finals · ends around 15:30" },
  { label: "Challenges",     value: `15 company challenges — ${HACKATHON_2026_PARTNERS.challengePartners.length} partners confirmed, 2 to be announced` },
  { label: "Keynote",        value: HACKATHON_2026_PARTNERS.keynote },
  { label: "Expected",       value: "1,000+ builders" },
  { label: "Participation",  value: "Free" },
  { label: "Open to",        value: "Builders worldwide — students and professionals" },
  { label: "MLH",            value: MLH_2027.label },
  { label: "Organised by",   value: "Since AI (sinceai.ai)" },
];

const whyItems = [
  {
    num: "01",
    title: "Real industry challenges",
    body: `Solve actual problems set by ${HACKATHON_2026_PARTNERS.challengePartnersShort} — 15 company challenges. The best solutions get noticed — and hired.`,
  },
  {
    num: "02",
    title: "MLH Member Event",
    body: "Since AI Hackathon 2026 is a Major League Hacking (MLH) 2027 Season Member Event — part of the world's largest hackathon league and its global builder community.",
  },
  {
    num: "03",
    title: "Global builder network",
    body: "Join 10,000+ Since AI community members globally. Past participants have been hired, founded startups, and built lasting professional connections.",
  },
  {
    num: "04",
    title: "Working demos only",
    body: "No mockups. Since AI Hackathon rewards teams that build and demo working AI products — and the five finalist teams present theirs live on stage.",
  },
];

const headlinePartners = [
  {
    name: "Google",
    label: "Compute partner",
    logo: "/assets/sponsors/GoogleForDevelopers.png",
    href: "https://developers.google.com/",
  },
  {
    name: "LUMI",
    label: "Supercomputer access",
    logo: "/assets/sponsors/Lumi.svg",
    href: "https://lumi-ai-factory.eu/",
  },
];

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
          <Image
            src="/assets/images/educity-hero.webp"
            alt="EduCity, Turku — venue for Since AI Hackathon 2026"
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.72)" }} />
          <div
            className="absolute inset-x-0 bottom-0 h-3/5"
            style={{ background: "linear-gradient(to top, #000 0%, transparent 100%)" }}
          />

          {/* Official MLH 2027-season Trust Badge (mlh.com/brand-guidelines): in the page header, top
              right, below the fixed navbar. MLH's own embed pins it to the viewport; here it scrolls
              with the hero so it never covers the navbar or the sticky Apply bar. */}
          <a
            id="mlh-trust-badge"
            href={MLH_2027.trustBadgeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute z-20 block right-4 sm:right-[50px] top-[84px]"
            style={{ width: "clamp(60px, 10vw, 100px)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- MLH serves the official badge; not optimised by us */}
            <img src={MLH_2027.trustBadgeSrc} alt={MLH_2027.trustBadgeAlt} width={100} height={175} className="w-full h-auto" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>

          <FadeIn className="relative z-10 mx-auto w-full max-w-6xl pb-12"
            style={{ paddingTop: "clamp(100px, 13vh, 140px)" }}
          >
            <p className="text-xs font-mono uppercase tracking-widest text-white/60 mb-5 pr-[84px] lg:pr-0">
              {"// mlh 2027 season member event"}
            </p>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 max-w-[820px] leading-none pr-[84px] lg:pr-0">
              Since AI Hackathon 2026.
            </h1>

            <p className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-6 leading-snug max-w-[720px]">
              72 hours. 1,000+ builders.{" "}
              <span style={{ color: "var(--color-brand)" }}>€50,000 in cash prizes.</span>
            </p>

            <p className="text-sm text-white/75 mb-8 tracking-wide">
              November 6–8, 2026 &nbsp;/&nbsp; Turku, Finland &nbsp;/&nbsp; 15 company challenges &nbsp;/&nbsp; Free to enter &nbsp;/&nbsp; Open to builders worldwide
            </p>

            <div className="w-full sm:w-fit mb-8">
              <HackathonCountdown
                startDate={UPCOMING_EVENT_2026.startDate}
                endDate={UPCOMING_EVENT_2026.endDate}
              />
            </div>

            <p className="text-sm text-white mb-8">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-2 align-middle"
                aria-hidden="true"
              />
              Registration is open — apply now
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
              <TrackedLink
                href={APPLY_URL}
                analyticsEvent="register_click"
                className="inline-block bg-white text-black rounded-none px-6 py-3 font-semibold hover:bg-neutral-100 transition-colors cursor-pointer text-sm"
              >
                Apply now — free →
              </TrackedLink>
              <Link
                href="/hackathon-2026/guide"
                className="inline-block border border-white/20 text-white rounded-none px-6 py-3 font-semibold hover:border-white transition-colors cursor-pointer text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Hackathon 2026 guide <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/partners"
                className="inline-block border border-white/20 text-white rounded-none px-6 py-3 font-semibold hover:border-white transition-colors cursor-pointer text-sm"
              >
                Partner with us →
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

        {/* ── SECTION 3: Headline partners ─────────────────────── */}
        <FadeInView>
          <section className="py-24 px-6 border-t border-white/10">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-12">
                Powered by world-class infrastructure.
              </h2>

              <div className="flex flex-col md:flex-row md:-ml-6">
                {headlinePartners.map((partner, i) => (
                  <div
                    key={partner.name}
                    className={`py-6 md:px-6 md:flex-1 ${i > 0 ? "border-t md:border-t-0 md:border-l border-white/10" : ""}`}
                  >
                    <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
                      {partner.label}
                    </p>
                    <a
                      href={partner.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-5 group"
                      aria-label={`${partner.name} — Since AI Hackathon 2026 infrastructure partner`}
                    >
                      <h3 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-none">
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
                Google and LUMI provide hackathon participants with compute access and GPU usage throughout the event — so you can focus on building, not on infrastructure.
              </p>
            </div>
          </section>
        </FadeInView>

        {/* ── SECTION 4: Speakers & judges ─────────────────────── */}
        <FadeInView>
          <FeaturedSpeakers />
        </FadeInView>
        <FadeInView>
          <Judges />
        </FadeInView>

        {/* ── SECTION 5: Challenge partners (logo grid) ────────── */}
        <FadeInView>
          <PartnerLogoGrid />
        </FadeInView>

        {/* ── SECTION 6: Mid-page CTA ─────────────────────────── */}
        <section className="py-16 px-6 border-t border-white/10">
          <div className="mx-auto max-w-6xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <p className="text-xl md:text-2xl font-bold tracking-tight text-white">
              Free to enter. €50,000 on the table.
            </p>
            <TrackedLink
              href={APPLY_URL}
              analyticsEvent="register_click"
              className="shrink-0 inline-block bg-white text-black rounded-none px-6 py-3 font-semibold hover:bg-neutral-100 transition-colors cursor-pointer text-sm"
            >
              Apply now →
            </TrackedLink>
          </div>
        </section>

        {/* ── SECTION 7: What is it ────────────────────────────── */}
        <FadeInView>
          <section className="py-24 px-6 border-t border-white/10">
            <div className="mx-auto max-w-6xl">
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
                {"// what is it"}
              </p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-8">
                72 hours. Real challenges. Shipped products.
              </h2>

              <div className="text-sm text-neutral-400 leading-relaxed max-w-[720px] space-y-4">
                <p>
                  Since AI Hackathon is the flagship annual event of Since AI — a global
                  execution-focused AI innovation ecosystem based in Turku, Finland, backed
                  by 100+ strategic, capital, and research partners.
                </p>
                <p>
                  Teams form on Friday afternoon, select one of 15 company challenges before the
                  17:00 opening, and ship by Sunday&apos;s 10:00 deadline. 1,000+ builders are
                  expected in 2026, with challenges set by {HACKATHON_2026_CHALLENGE_LIST} — and
                  two more partners still to be announced. Open to developers, researchers, and
                  entrepreneurs worldwide.
                </p>
                <p className="text-white font-semibold">
                  No slide decks. No mockups. Only working demos.
                </p>
              </div>
            </div>
          </section>
        </FadeInView>

        {/* ── SECTION 8: Why participate ──────────────────────── */}
        <FadeInView>
          <section className="py-24 px-6 border-t border-white/10">
            <div className="mx-auto max-w-6xl">
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
                {"// why participate"}
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
                    <p className="text-xs font-mono text-neutral-500 mb-4" aria-hidden="true">
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

        {/* ── SECTION 9: Venue ────────────────────────────────── */}
        <FadeInView>
          <section className="py-24 px-6 border-t border-white/10">
            <div className="mx-auto max-w-6xl">
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
                {"// venue"}
              </p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-8">
                EduCity, BioCity and Joki, Turku.
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
                <div>
                  <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                    Since AI Hackathon 2026 takes place on the Turku science park campus. Friday&apos;s
                    opening and Sunday&apos;s closing are at EduCity — the campus of Turku University of
                    Applied Sciences (Turku AMK), Joukahaisenkatu 7, 20520 Turku. Teams build around the
                    clock next door at BioCity and Joki. The Hackathon 2026 guide has every room, map and
                    walking route.
                  </p>
                  <div className="flex flex-wrap gap-x-8 gap-y-2">
                    <Link
                      href="/hackathon-2026/guide/venue"
                      className="text-sm text-neutral-400 hover:text-white transition-colors"
                    >
                      Venue maps & 3D campus →
                    </Link>
                    <a
                      href="https://maps.google.com/?q=EduCity+Joukahaisenkatu+7+Turku"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-neutral-400 hover:text-white transition-colors"
                    >
                      EduCity on Google Maps ↗
                    </a>
                  </div>
                </div>

                <div className="relative w-full h-[280px] overflow-hidden">
                  <Image
                    src="/assets/images/educity-card.webp"
                    alt="EduCity building — venue for Since AI Hackathon 2026, Turku, Finland"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </section>
        </FadeInView>

        {/* ── SECTION 10: Past edition ─────────────────────────── */}
        <FadeInView>
          <section className="py-24 px-6 border-t border-white/10">
            <div className="mx-auto max-w-6xl">
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
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
                  <Link
                    href="/projects"
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    View shipped projects →
                  </Link>
                  <Link
                    href="/events"
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    All events →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </FadeInView>

        {/* ── SECTION 11: Key facts ────────────────────────────── */}
        <section className="py-24 px-6 border-t border-white/10">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
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
                  <dt className="text-xs font-mono uppercase tracking-widest text-neutral-500 shrink-0 w-40">
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

        {/* ── SECTION 12: Registration ─────────────────────────── */}
        <section
          id="registration"
          className="py-40 px-6 border-t border-white/10 border-b border-white/10"
          style={{ scrollMarginTop: "80px" }}
        >
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
              {"// registrations"}
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-6">
              Registration is open.
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-[560px] mb-8">
              Registration for Since AI Hackathon 2026 (November 6–8, Turku) is now open.
              €50,000 cash prize pool. Free to enter for all builders worldwide. Apply at
              sinceai.app/sign-up and join our community channels to connect with other
              participants before the event.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <TrackedLink
                href={APPLY_URL}
                analyticsEvent="register_click"
                className="inline-block bg-white text-black rounded-none px-6 py-3 font-semibold hover:bg-neutral-100 transition-colors cursor-pointer text-sm"
              >
                Apply now — free →
              </TrackedLink>
              <a
                href={ORG.social.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border border-white/20 text-white rounded-none px-6 py-3 font-semibold hover:border-white transition-colors cursor-pointer text-sm"
              >
                Join Telegram →
              </a>
            </div>

            <div className="border-t border-white/10 pt-6">
              <p className="text-sm text-neutral-400">
                Setting a challenge or sponsoring?{" "}
                <Link
                  href="/partners"
                  className="text-neutral-400 hover:text-white transition-colors underline"
                >
                  Partner with Since AI →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTION 13: FAQ ───────────────────────────────────── */}
        <section className="py-24 px-6 border-t border-white/10">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
              {"// faq"}
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-10">
              Frequently asked questions.
            </h2>

            <FaqAccordion faqs={hackathonFaqs} />

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              <Link
                href="/faq"
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                More questions? See our full FAQ →
              </Link>
              <Link
                href="/code-of-conduct"
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                Since AI Code of Conduct →
              </Link>
              <a
                href={MLH_2027.codeOfConduct}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-neutral-400 hover:text-white transition-colors"
              >
                MLH Code of Conduct ↗
              </a>
            </div>
          </div>
        </section>

        {/* Spacer so the sticky Apply bar never covers the footer's last row */}
        <Footer discordUrl={ORG.social.discord} />
        <div aria-hidden="true" className="h-16" />
      </main>

      <StickyApplyBar />
    </SmoothScroll>
  );
}
