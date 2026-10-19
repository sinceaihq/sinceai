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
            lede={`Three days, 1,000+ builders and ${HACKATHON_2026_PARTNERS.challengeTarget} real challenges from ${HACKATHON_2026_PARTNERS.challengePartnersShort}. The best solutions don't end as demos — they get eight weeks of production support.`}
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

// ── How it works ───────────────────────────────────────────────────────────

const STEPS = [
  {
    n: "01",
    title: "Build",
    body: "High-intensity hackathons and applied AI projects built around real problems from industry partners — with mentors, tools and data from day one.",
  },
  {
    n: "02",
    title: "Ship",
    body: "The strongest teams get eight weeks of production support: architecture review, production preparation and deployment, working with the challenge company.",
    highlight: true,
  },
  {
    n: "03",
    title: "Scale",
    body: "Founders meet capital and commercialisation partners such as Antler, Inventure, Wave Ventures and Redstone VC — and the research-to-market programme.",
  },
] as const;

function HowItWorks() {
  return (
    <section aria-labelledby="home-how-title" className="py-24 md:py-32 px-6 border-t border-white/10">
      <div className="mx-auto max-w-6xl">
        <SectionIntro
          id="home-how-title"
          eyebrow="// how since ai works"
          title="From idea to production — not just a demo."
          lede="Most hackathons end with a pitch. Since AI stays with the teams that matter until their solution runs for real users."
        />
        <ol className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className={
                "flex flex-col border p-7 transition-colors " +
                ("highlight" in s ? "border-(--color-brand)/50 bg-(--color-brand)/[0.04]" : "border-white/10 hover:border-white/20")
              }
            >
              <span aria-hidden="true" className="font-mono text-sm text-white/55">
                {s.n}
              </span>
              <h3 className="mt-6 text-2xl font-bold tracking-tight text-white">{s.title}</h3>
              <p className="mt-3 text-sm text-neutral-300 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8">
          <Link
            href="/production-support"
            className="inline-flex min-h-11 items-center text-sm text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white transition-colors"
          >
            How production support works <span aria-hidden="true" className="ml-1">→</span>
          </Link>
        </p>
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
    names: ["Valmet", "Bayer", "Elisa", "Meyer Turku", "DNA", "Traficom", "Lindström", "Forcit Group", "Sandvik", "Kongsberg"],
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
        <HackathonFeature />
      </FadeInView>
      <FadeInView>
        <HowItWorks />
      </FadeInView>
      <FadeInView>
        <Ecosystem />
      </FadeInView>
      <FeaturedSpeakers />
      <Judges />
    </div>
  );
}
