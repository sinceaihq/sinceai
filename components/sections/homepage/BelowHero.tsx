import Image from "next/image";
import Link from "next/link";
import { FeaturedSpeakers, Judges } from "@/components/sections/hackathon";
import { FadeInView } from "@/components/motion-primitives/fade-in";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { ANALYTICS_EVENTS } from "@/lib/gtag";
import { ORG } from "@/lib/org";
import { PARTNERS, type Partner } from "@/lib/partners";
import { HACKATHON_2026_PARTNERS, MLH_2027 } from "@/lib/sinceai";
import { SectionIntro } from "./SectionIntro";
import { REACH, fmt } from "@/lib/reach";

const primaryButton =
  "inline-flex min-h-12 items-center justify-center bg-white text-black rounded-none px-7 py-3 text-sm font-semibold hover:bg-neutral-100 transition-colors cursor-pointer";
const ghostButton =
  "inline-flex min-h-12 items-center justify-center border border-white/20 text-white rounded-none px-7 py-3 text-sm font-semibold hover:border-white transition-colors cursor-pointer";

// ── Hackathon 2026 ─────────────────────────────────────────────────────────

const HACKATHON_FACTS = [
  { value: "€50,000", label: "Prize pool", brand: true },
  { value: "1,000+", label: "Builders from around the world" },
  { value: String(HACKATHON_2026_PARTNERS.challengeTarget), label: "Real company challenges" },
  { value: "Free", label: "To take part" },
] as const;

function HackathonFeature() {
  return (
    <section aria-labelledby="home-hackathon-title" className="py-24 md:py-32 px-6 border-t border-white/10">
      <div className="mx-auto max-w-6xl grid grid-cols-1 gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
        <div>
          <SectionIntro
            id="home-hackathon-title"
            eyebrow="// flagship event · 6–8 November 2026"
            title="Since AI Hackathon 2026."
            lede={`48 hours, 1,000+ builders and ${HACKATHON_2026_PARTNERS.challengeTarget} real challenges from ${HACKATHON_2026_PARTNERS.challengePartnersShort} — ${fmt(REACH.applicants.total)} applications from ${REACH.applicants.countries} countries so far. The best solutions don't end as demos: they get eight weeks of production support.`}
          />
          <dl className="mt-10 grid grid-cols-2 gap-px bg-white/10 border border-white/10">
            {HACKATHON_FACTS.map((f) => (
              <div key={f.label} className="bg-black p-5">
                <dt className="sr-only">{f.label}</dt>
                <dd>
                  <span
                    className="block text-3xl font-bold tracking-tight leading-none"
                    style={"brand" in f ? { color: "var(--color-brand)" } : undefined}
                  >
                    <span className={"brand" in f ? "" : "text-white"}>{f.value}</span>
                  </span>
                  <span aria-hidden="true" className="mt-2 block text-sm text-neutral-400">
                    {f.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-neutral-400 leading-relaxed">
            Keynote by {HACKATHON_2026_PARTNERS.keynote} · {MLH_2027.label}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <TrackedLink href="https://sinceai.app/sign-up" analyticsEvent={ANALYTICS_EVENTS.REGISTER_CLICK} className={primaryButton}>
              Apply now <span aria-hidden="true" className="ml-2">→</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </TrackedLink>
            <Link href="/hackathon" className={ghostButton}>
              Explore the hackathon
            </Link>
          </div>
        </div>
        <figure className="relative m-0 aspect-[4/3] overflow-hidden border border-white/10">
          <Image
            src="/assets/images/educity-card.webp"
            alt="EduCity in Turku at night — home of the opening and the finals of Since AI Hackathon 2026"
            fill
            sizes="(max-width: 1024px) 100vw, 560px"
            className="object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <figcaption className="absolute inset-x-0 bottom-0 p-6">
            <span className="block text-xs font-mono uppercase tracking-widest text-white/70">Turku, Finland</span>
            <span className="mt-1 block text-xl font-bold tracking-tight text-white">EduCity · BioCity · Joki</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// ── The ecosystem: what Since AI does ─────────────────────────────────────

const STAGES: {
  stage: string;
  summary: string;
  programs: { title: string; body: string; href: string; cta: string; highlight?: true }[];
}[] = [
  {
    stage: "Build",
    summary: "Real problems, real teams",
    programs: [
      {
        title: "Hackathons",
        body: "48-hour hackathons on real challenges from leading companies, with mentors, tools and data from day one. The flagship brings 1,000+ builders to Finland every November.",
        href: "/hackathon",
        cta: "Since AI Hackathon 2026",
      },
      {
        title: "Global builder community",
        body: `${ORG.stats.network} builders in ${ORG.stats.countries} countries — on Discord, at events and on the Since AI platform, where builders find teams, challenges and each other.`,
        href: "/for-builders",
        cta: "For builders",
      },
    ],
  },
  {
    stage: "Ship",
    summary: "From demo to production",
    programs: [
      {
        title: "Production support",
        body: "The strongest teams get eight weeks with the challenge company: architecture review, production preparation and deployment to real users.",
        href: "/production-support",
        cta: "How production support works",
        highlight: true,
      },
      {
        title: "Playbooks and guides",
        body: "Open, practical material on shipping AI — challenge design, evaluation, deployment and what we learn from every event.",
        href: "/resources",
        cta: "Resources",
      },
    ],
  },
  {
    stage: "Scale",
    summary: "Companies and capital",
    programs: [
      {
        title: "Capital",
        body: "Teams ready to build a company meet investors such as Antler, Inventure, Wave Ventures and Redstone VC.",
        href: "/partners",
        cta: "Capital partners",
      },
      {
        title: "Research to market",
        body: "A route for university research to reach the market: industry validation, builders and founders around each idea.",
        href: "/research-to-market",
        cta: "Research to market",
      },
    ],
  },
];

function Programs() {
  return (
    <section aria-labelledby="home-programs-title" className="py-24 md:py-32 px-6 border-t border-white/10">
      <div className="mx-auto max-w-6xl">
        <SectionIntro
          id="home-programs-title"
          eyebrow="// the ecosystem"
          title="From first prototype to production — and on to a company."
          lede="Most hackathons end with a pitch. Since AI is built around what happens next: one ecosystem that takes builders from a real problem to a product in use, and the best teams on to capital."
        />
        <ol className="mt-14 grid grid-cols-1 gap-px border border-white/10 bg-white/10 md:grid-cols-3">
          {STAGES.map((s, i) => (
            <li key={s.stage} className="flex flex-col bg-black">
              <div className="flex items-baseline justify-between gap-4 border-b border-white/10 px-7 py-6">
                <h3 className="text-2xl font-bold tracking-tight text-white">
                  <span aria-hidden="true" className="mr-3 font-mono text-sm font-normal text-white/55">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.stage}
                </h3>
                <span className="text-right text-xs font-mono uppercase tracking-widest text-white/55">{s.summary}</span>
              </div>
              <ul className="flex flex-1 flex-col divide-y divide-white/10">
                {s.programs.map((p) => (
                  <li
                    key={p.title}
                    className={
                      "flex flex-1 flex-col px-7 py-7 " +
                      (p.highlight ? "bg-(--color-brand)/[0.06] shadow-[inset_2px_0_0_var(--color-brand)]" : "")
                    }
                  >
                    <h4 className="text-lg font-semibold text-white">
                      {p.title}
                      {p.highlight && (
                        <span className="ml-3 inline-block translate-y-[-2px] border border-(--color-brand)/60 px-1.5 py-0.5 align-middle font-mono text-[10px] uppercase tracking-widest text-(--color-brand)">
                          8 weeks
                        </span>
                      )}
                    </h4>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-neutral-300">{p.body}</p>
                    <Link
                      href={p.href}
                      className="mt-5 inline-flex min-h-11 items-center self-start text-sm text-neutral-300 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
                    >
                      {p.cta} <span aria-hidden="true" className="ml-1">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ── Ecosystem ──────────────────────────────────────────────────────────────

const byName = (name: string): Partner => {
  const p = PARTNERS.find((x) => x.name === name);
  if (!p) throw new Error(`Ecosystem: unknown partner "${name}"`);
  return p;
};

const ECOSYSTEM: { label: string; names: readonly string[] }[] = [
  {
    label: "Technology & AI",
    names: ["Google For Developers", "ElevenLabs", "LUMI AI Factory", "Aiven", "Lovable", "n8n", "JetBrains", "Atlassian", "Red Hat", "Pruna AI"],
  },
  {
    label: "Industry challenges",
    names: ["Valmet", "Bayer", "Elisa", "Meyer Turku", "DNA", "Traficom", "Lindström", "FORCIT Group", "Sandvik", "Kongsberg"],
  },
  {
    label: "Capital",
    names: ["Antler", "Inventure", "Wave Ventures", "Redstone VC", "Tesi", "Icebreaker VC", "MAKI VC"],
  },
];

function Ecosystem() {
  return (
    <section aria-labelledby="home-ecosystem-title" className="py-24 md:py-32 px-6 border-t border-white/10">
      <div className="mx-auto max-w-6xl">
        <SectionIntro
          id="home-ecosystem-title"
          eyebrow="// ecosystem"
          title="Built with leading companies, investors and communities."
          lede={`${ORG.stats.partners} partners and supporters across technology, industry, capital, research and the global builder community.`}
        />
        <div className="mt-14 space-y-12">
          {ECOSYSTEM.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-mono uppercase tracking-widest text-white/55">{group.label}</h3>
              <ul className="mt-5 grid grid-cols-2 pl-px pt-px sm:grid-cols-3 lg:grid-cols-5">
                {group.names.map(byName).map((p) => (
                  <li key={p.name} className="-ml-px -mt-px border border-white/10">
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex h-24 items-center justify-center px-6 transition-colors hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.logo}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        width={140}
                        height={44}
                        className="max-h-10 w-auto max-w-[140px] object-contain opacity-80 transition-opacity group-hover:opacity-100"
                      />
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-10">
          <Link
            href="/partners"
            className="inline-flex min-h-11 items-center text-sm text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white transition-colors"
          >
            All partners and how to partner with us <span aria-hidden="true" className="ml-1">→</span>
          </Link>
        </p>
      </div>
    </section>
  );
}

// ── Composition ────────────────────────────────────────────────────────────

export function BelowHero() {
  return (
    <div className="w-full bg-black">
      <FadeInView>
        <Programs />
      </FadeInView>
      <FadeInView>
        <HackathonFeature />
      </FadeInView>
      <FadeInView>
        <Ecosystem />
      </FadeInView>
      <FeaturedSpeakers />
      <Judges />
    </div>
  );
}
