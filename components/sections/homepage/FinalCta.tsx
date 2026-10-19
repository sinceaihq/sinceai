import Link from "next/link";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { ANALYTICS_EVENTS } from "@/lib/gtag";
import { ORG } from "@/lib/org";

/** The closing call to action: apply, partner or join the community. */
export function FinalCta() {
  return (
    <section aria-labelledby="home-cta-title" className="hero-backdrop relative overflow-hidden py-32 md:py-40 px-6 border-t border-white/10">
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-white/55 mb-4">{"// join since ai"}</p>
        <h2 id="home-cta-title" className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white text-balance">
          Build what comes next.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-neutral-300 leading-relaxed text-pretty">
          Apply for Since AI Hackathon 2026, bring a real challenge as a partner, or join {ORG.stats.network} builders in
          the community.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
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
            Become a partner
          </Link>
          <TrackedLink
            href={ORG.social.discord}
            analyticsEvent={ANALYTICS_EVENTS.DISCORD_JOIN_CLICK}
            className="inline-flex min-h-12 items-center justify-center border border-white/20 text-white rounded-none px-7 py-3 text-sm font-semibold hover:border-white transition-colors cursor-pointer"
          >
            Join Discord
            <span className="sr-only"> (opens in a new tab)</span>
          </TrackedLink>
        </div>
      </div>
    </section>
  );
}
