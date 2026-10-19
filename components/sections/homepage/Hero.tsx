import Link from "next/link";
import { FaDiscord, FaTelegramPlane } from "react-icons/fa";
import { PartnerMarquee } from "@/components/PartnerMarquee";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { ORG } from "@/lib/org";
import { ANALYTICS_EVENTS } from "@/lib/gtag";
import { EcosystemMap } from "./EcosystemMap";

const FACTS = [
  { value: ORG.stats.network, label: "AI builders" },
  { value: ORG.stats.countries, label: "Countries" },
  { value: ORG.stats.partners, label: "Partners" },
] as const;

const COMMUNITY = [
  { name: "Discord", href: ORG.social.discord, Icon: FaDiscord, event: ANALYTICS_EVENTS.DISCORD_JOIN_CLICK },
  { name: "Telegram", href: ORG.social.telegram, Icon: FaTelegramPlane, event: ANALYTICS_EVENTS.TELEGRAM_JOIN_CLICK },
] as const;

/**
 * Homepage hero — the promise, two calls to action and the ecosystem map,
 * all in the first screen. Server-rendered, so the headline and the map paint
 * with the HTML; only the map's hover labels hydrate.
 */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="hero-backdrop relative flex min-h-[min(100svh,1080px)] flex-col overflow-hidden bg-black">
      <div className="relative flex flex-1 flex-col px-6 pt-28 md:pt-36">
        <div className="mx-auto w-full max-w-6xl">
          <h1
            id="hero-title"
            className="font-bold tracking-tight text-white leading-[0.98] text-balance"
            style={{ fontSize: "clamp(2.4rem, 4.6vw, 4.25rem)" }}
          >
            Where frontier AI becomes shipped products.
          </h1>

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <p className="max-w-xl text-base md:text-lg text-neutral-300 leading-relaxed text-pretty">
              Since AI is a global AI ecosystem: {ORG.stats.network} builders in {ORG.stats.countries} countries, shipping
              with leading companies, investors and researchers.
            </p>

            <div className="grid shrink-0 grid-cols-2 gap-3 sm:flex sm:items-center">
              <TrackedLink
                href="https://sinceai.app/sign-up"
                analyticsEvent={ANALYTICS_EVENTS.REGISTER_CLICK}
                className="inline-flex min-h-12 items-center justify-center bg-white text-black rounded-none px-4 py-3 text-sm font-semibold sm:px-7 hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Join Since AI <span aria-hidden="true" className="ml-2">→</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </TrackedLink>
              <Link
                href="/partners"
                className="inline-flex min-h-12 items-center justify-center border border-white/20 text-white rounded-none px-4 py-3 sm:px-7 text-sm font-semibold hover:border-white transition-colors cursor-pointer"
              >
                Partner with us
              </Link>
              {COMMUNITY.map(({ name, href, Icon, event }) => (
                <TrackedLink
                  key={name}
                  href={href}
                  analyticsEvent={event}
                  ariaLabel={`Join Since AI on ${name} (opens in a new tab)`}
                  className="hidden min-h-12 w-12 items-center justify-center border border-white/20 text-white transition-colors hover:border-white cursor-pointer lg:inline-flex"
                >
                  <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
                </TrackedLink>
              ))}
            </div>
          </div>
        </div>

        <div className="relative -mx-6 mt-10 w-[calc(100%+3rem)] md:mx-auto md:mt-8 md:w-full md:max-w-7xl">
          <EcosystemMap />
        </div>

        <div className="mx-auto w-full max-w-6xl pb-10">
          <div className="flex flex-col gap-6 border-t border-white/10 pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <dl className="flex gap-8 sm:gap-12">
              {FACTS.map((f) => (
                <div key={f.label} className="flex flex-col-reverse">
                  <dt className="mt-1.5 text-sm text-neutral-400">{f.label}</dt>
                  <dd className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-none tabular-nums">{f.value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center gap-3 lg:hidden">
              <span className="w-full text-sm text-neutral-400 sm:w-auto">Join the community</span>
              {COMMUNITY.map(({ name, href, Icon, event }) => (
                <TrackedLink
                  key={name}
                  href={href}
                  analyticsEvent={event}
                  className="inline-flex min-h-11 items-center gap-2 border border-white/15 px-3.5 text-sm text-white transition-colors hover:border-white cursor-pointer"
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {name}
                  <span className="sr-only"> (opens in a new tab)</span>
                </TrackedLink>
              ))}
            </div>
            <p className="max-w-xs text-sm leading-snug text-neutral-400 sm:text-right">
              Every light is a city where Since AI builders study or work.
              <span className="hidden md:inline"> Hover to explore.</span>
              <span className="md:hidden"> Tap to explore.</span>
            </p>
          </div>
        </div>
      </div>

      <PartnerMarquee />
    </section>
  );
}
