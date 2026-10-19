import Link from "next/link";
import { PartnerMarquee } from "@/components/PartnerMarquee";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { ORG } from "@/lib/org";
import { ANALYTICS_EVENTS } from "@/lib/gtag";

const FACTS = [
  { value: ORG.stats.network, label: "AI builders in our network" },
  { value: ORG.stats.countries, label: "Countries represented" },
  { value: ORG.stats.partners, label: "Partners and supporters" },
  { value: "8 weeks", label: "Production support for the strongest teams" },
] as const;

/**
 * Homepage hero — server-rendered, so the headline is the first thing painted.
 * The backdrop is CSS (two soft light sources and a fine grid), no image.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="hero-backdrop relative flex min-h-[min(100svh,1040px)] flex-col overflow-hidden bg-black">
      <div className="relative flex flex-1 flex-col justify-center px-6 pt-32 pb-12 md:pt-36">
        <div className="mx-auto w-full max-w-6xl">
          <Link
            href="/hackathon"
            className="group inline-flex max-w-full items-center gap-2.5 border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <span aria-hidden="true" className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-(--color-brand) opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-(--color-brand)" />
            </span>
            <span className="truncate">
              <span className="font-semibold text-white">Since AI Hackathon 2026</span>
              <span className="text-white/55 sm:hidden"> · 6–8 Nov · €50k</span>
              <span className="hidden text-white/55 sm:inline"> · 6–8 November · €50,000 prize pool</span>
            </span>
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>

          <h1
            id="hero-title"
            className="mt-8 max-w-5xl font-bold tracking-tight text-white leading-[0.95] text-balance"
            style={{ fontSize: "clamp(2.6rem, 7.4vw, 6.25rem)" }}
          >
            Where frontier AI becomes <span className="hero-accent">shipped products.</span>
          </h1>

          <p className="mt-8 max-w-2xl text-base md:text-lg text-neutral-300 leading-relaxed text-pretty">
            Since AI is a global ecosystem of AI builders. We run high-intensity hackathons with leading companies —
            and give the strongest teams eight weeks of production support to take what they build to real users.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <TrackedLink
              href="https://sinceai.app/sign-up"
              analyticsEvent={ANALYTICS_EVENTS.REGISTER_CLICK}
              className="inline-flex min-h-12 items-center justify-center bg-white text-black rounded-none px-7 py-3 text-sm font-semibold hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              Apply for Hackathon 2026 <span aria-hidden="true" className="ml-2">→</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </TrackedLink>
            <Link
              href="/partners"
              className="inline-flex min-h-12 items-center justify-center border border-white/20 text-white rounded-none px-7 py-3 text-sm font-semibold hover:border-white transition-colors cursor-pointer"
            >
              Partner with Since AI
            </Link>
            <TrackedLink
              href={ORG.social.discord}
              analyticsEvent={ANALYTICS_EVENTS.DISCORD_JOIN_CLICK}
              className="inline-flex min-h-12 items-center justify-center px-2 text-sm text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white transition-colors cursor-pointer sm:ml-2"
            >
              Join the community on Discord
              <span className="sr-only"> (opens in a new tab)</span>
            </TrackedLink>
          </div>

          <dl className="mt-16 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-white/10 pt-8 lg:grid-cols-4">
            {FACTS.map((fact) => (
              <div key={fact.label}>
                <dt className="sr-only">{fact.label}</dt>
                <dd>
                  <span className="block text-3xl md:text-4xl font-bold tracking-tight text-white leading-none">{fact.value}</span>
                  <span aria-hidden="true" className="mt-2 block max-w-[14rem] text-sm text-neutral-400 leading-snug">
                    {fact.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <PartnerMarquee />
    </section>
  );
}
