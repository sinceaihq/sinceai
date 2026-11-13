import React from "react";
import Link from "next/link";
import Image from "next/image";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Calendar, MapPin, ExternalLink, ArrowRight } from "lucide-react";
import {
  FIRST_EVENT,
  HACKATHON_2026_PARTNERS,
  LINKS,
  getCurrentEvents,
  getEventPhase,
  getPastEvents,
  type SinceAiEvent,
} from "@/lib/sinceai";
import { GUIDE_BASE_PATH } from "@/lib/hackathon-2026/route";
import { ORG } from "@/lib/org";
import { REACH, fmt } from "@/lib/reach";
import { ButtonPair } from "@/components/ui/ButtonPair";

const sectionLabel = "text-xs font-mono uppercase tracking-widest text-white/55 mb-3";
const card = "border border-white/10 p-8 md:p-12 bg-white/[0.02]";
const cardLink =
  "inline-flex min-h-11 items-center gap-2 text-white underline decoration-white/25 underline-offset-4 hover:decoration-white transition-colors group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

function EventMeta({ date, place }: { date: string; place: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6 text-neutral-400">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm font-medium">{date}</span>
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm font-medium">{place}</span>
      </div>
    </div>
  );
}

function Figures({ items }: { items: readonly { value: string; label: string }[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col-reverse">
          <dt className="text-sm text-white/55">{item.label}</dt>
          <dd className="text-3xl font-bold text-white mb-1">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** An event that has not ended: what it is, when, and one link to its page. */
function CurrentEventCard({ event }: { event: SinceAiEvent }) {
  const live = getEventPhase(event) === "live";
  return (
    <article className={`${card} hover:border-white/20 transition-colors duration-300`}>
      <p className="text-sm font-semibold text-white mb-4">{live ? "Happening now" : "Upcoming"}</p>
      <h3 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">{event.name}</h3>
      <EventMeta date={event.dateLabel} place={event.place} />
      <Link
        href={event.href}
        className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-black bg-white rounded-none hover:bg-neutral-100 transition-colors cursor-pointer group"
      >
        {event.name}
        <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
      </Link>
    </article>
  );
}

function Hackathon2026Card({ event }: { event: SinceAiEvent }) {
  return (
    <article className={card}>
      <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">{event.name}</h3>
      <EventMeta date={event.dateLabel} place={event.place} />
      <p className="text-lg text-neutral-300 mb-2 max-w-2xl">
        {HACKATHON_2026_PARTNERS.challengeTarget} company challenges from{" "}
        {HACKATHON_2026_PARTNERS.challengePartnersShort}. A Major League Hacking 2027 Season Member Event.
      </p>
      <Figures
        items={[
          { value: String(HACKATHON_2026_PARTNERS.challengeTarget), label: "Company challenges" },
          { value: "€50,000+", label: "Cash prize pool" },
          { value: fmt(REACH.applicants.total), label: `Applications, as of ${REACH.asOfLabel}` },
        ]}
      />
      <p className="text-sm text-white/55 mt-6 max-w-2xl">
        Winners and final figures are added here once the organisers have confirmed them.
      </p>
      <div className="pt-6 mt-6 border-t border-white/5 flex flex-wrap gap-x-8 gap-y-2">
        <Link href={event.href} className={cardLink}>
          <span className="text-base font-medium">About Hackathon 2026</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
        <Link href={GUIDE_BASE_PATH} className={cardLink}>
          <span className="text-base font-medium">Field Guide: schedule, venues and maps</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function Hackathon2025Card({ event }: { event: SinceAiEvent }) {
  return (
    <article className={card}>
      <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">{event.name}</h3>
      <EventMeta date={event.dateLabel} place={event.place} />

      <div className="relative w-full h-64 md:h-80 overflow-hidden bg-neutral-900/50">
        <Image
          src="/assets/images/educity-card.webp"
          alt="The EduCity campus in Turku, Finland — venue of Since AI Hackathon 2025"
          fill
          sizes="(max-width: 768px) 100vw, 80vw"
          className="object-cover"
        />
      </div>

      <Figures
        items={[
          { value: String(FIRST_EVENT.attendance), label: "Builders" },
          { value: "30+", label: "Projects shipped" },
          { value: "€10K+", label: "In awards" },
        ]}
      />

      <div className="pt-6 mt-6 border-t border-white/5">
        <p className="text-sm text-white/55 mb-3">Partner companies</p>
        <ul className="flex flex-wrap gap-3">
          {["Valmet", "Sandvik", "Kongsberg", "ElevenLabs", "Featherless.ai", "Antler"].map((partner) => (
            <li key={partner} className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-white/5 border border-white/10">
              {partner}
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-6 flex flex-wrap gap-x-8 gap-y-2">
        <Link href="/projects" className={cardLink}>
          <span className="text-base font-medium">View projects</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
        <a href={LINKS.lumaHackathon2025} target="_blank" rel="noopener noreferrer" className={cardLink}>
          <span className="text-base font-medium">View on Luma</span>
          <ExternalLink className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </article>
  );
}

const PAST_CARDS: Record<SinceAiEvent["id"], (props: { event: SinceAiEvent }) => React.ReactElement> = {
  "hackathon-2026": Hackathon2026Card,
  "hackathon-2025": Hackathon2025Card,
};

export default function EventsPage() {
  // Which list an event is in follows from its dates (lib/sinceai.ts) — never from a label typed here.
  const current = getCurrentEvents();
  const past = getPastEvents();

  return (
    <SmoothScroll>
      <Navbar />

      <main className="flex flex-col w-full bg-black min-h-screen">
        <section className="relative w-full px-6 py-24 md:py-32">
          <div className="max-w-5xl mx-auto">
            <div className="fade-in text-center">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
                Events
              </h1>
              <p className="text-xl md:text-2xl text-neutral-400 max-w-2xl mx-auto">
                High-signal hackathons and meetups for builders who ship.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="upcoming-title" className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <p className={sectionLabel}>{"// what's next"}</p>
            <h2 id="upcoming-title" className="text-3xl font-bold tracking-tight text-white mb-8">
              Upcoming events
            </h2>

            {current.length > 0 ? (
              <div className="space-y-6">
                {current.map((event) => (
                  <CurrentEventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className={card} data-empty-upcoming>
                <p className="text-2xl font-bold tracking-tight text-white mb-4">
                  No upcoming events are scheduled right now.
                </p>
                <p className="text-neutral-400 leading-relaxed mb-8 max-w-2xl">
                  The dates of the next Since AI Hackathon have not been announced. New events are
                  announced in the community first — join Discord or Telegram to hear when they are.
                </p>
                <ButtonPair
                  primaryLabel="Join Discord"
                  primaryHref={ORG.social.discord}
                  primaryAnalyticsEvent="discord_join_click"
                  secondaryLabel="Join Telegram"
                  secondaryHref={ORG.social.telegram}
                  secondaryAnalyticsEvent="telegram_join_click"
                />
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="past-title" className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <p className={sectionLabel}>{"// the record"}</p>
            <h2 id="past-title" className="text-3xl font-bold tracking-tight text-white mb-8">
              Past events
            </h2>
            <div className="space-y-6">
              {past.map((event) => {
                const Card = PAST_CARDS[event.id];
                return <Card key={event.id} event={event} />;
              })}
            </div>

            <p className="text-sm text-white/55 mt-10 max-w-xl">
              New to hackathons? Read our{" "}
              <Link href="/blog" className="text-neutral-300 hover:text-white underline">
                AI hackathon guides
              </Link>{" "}
              or explore{" "}
              <Link href="/projects" className="text-neutral-300 hover:text-white underline">
                past projects
              </Link>{" "}
              for inspiration.
            </p>
          </div>
        </section>
      </main>

      <Footer discordUrl={ORG.social.discord} />
    </SmoothScroll>
  );
}
