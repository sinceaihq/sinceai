"use client";

import {
  ACCOMMODATION_OFFERS,
  formatDayLong,
  formatTime,
  offerOpen,
  type AccommodationOffer,
} from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";
import { useGuideNow } from "./clock";
import { CopyCode } from "./CopyCode";
import { Arrow, ghostButtonClass, primaryButtonClass, TextLink } from "./primitives";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

function deadline(iso: string): string {
  return `${formatDayLong(iso)}, ${formatTime(iso)}`;
}

function Offer({ offer, now }: { offer: AccommodationOffer; now: number | null }) {
  // Server and first render: the offer as published; the client then checks the deadline (`?now=` too).
  const open = now === null || offerOpen(offer, now);
  if (!open) {
    return (
      <li className="guide-avoid-break flex flex-col border border-white/10 p-5" data-offer={offer.id}>
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold tracking-tight text-white">{offer.name}</h3>
          <span className="shrink-0 border border-white/20 px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-white/55">
            Ended
          </span>
        </div>
        <p className="mt-3 text-sm text-neutral-400 leading-relaxed">
          The Since AI rate ended on {deadline(offer.bookBy!)} (Turku time). Regular rates only.
        </p>
        <TextLink href={offer.links[0].href} className="mt-auto pt-4">
          {offer.name}
        </TextLink>
      </li>
    );
  }
  return (
    <li className="guide-avoid-break flex flex-col border border-white/10 p-5" data-offer={offer.id}>
      <h3 className="text-lg font-bold tracking-tight text-white">{offer.name}</h3>
      <p className="mt-3 text-xl font-bold tracking-tight text-white leading-snug">
        {offer.benefit.split(" · ").map((part, i) => (
          <span key={part} className="block">
            {i > 0 && <span className="sr-only">, </span>}
            {part}
          </span>
        ))}
      </p>
      {offer.code && (
        <div className="mt-4">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-white/55">
            {offer.bookBy ? "Booking code" : "Discount code"}
          </p>
          <CopyCode code={offer.code} context={offer.name} />
          {offer.codeNote && <p className="mt-2 text-xs text-neutral-400">{offer.codeNote}</p>}
        </div>
      )}
      {(offer.bookBy || offer.availability) && (
        <p className="mt-4 text-sm text-white">
          {offer.bookBy && (
            <>
              Book by <strong className="font-semibold">{deadline(offer.bookBy)}</strong> (Turku time)
            </>
          )}
          {offer.bookBy && offer.availability && " · "}
          {offer.availability && <span className="text-neutral-400">{offer.availability}</span>}
        </p>
      )}
      <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{offer.howTo}</p>
      <div className="mt-auto flex flex-wrap gap-3 pt-5">
        {offer.links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            {...external}
            className={cn(link.primary ? primaryButtonClass : ghostButtonClass, "w-full sm:w-auto")}
          >
            {link.label}
            <Arrow external />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ))}
      </div>
    </li>
  );
}

/** "Accommodation & discounted rates": the five confirmed offers (lib/hackathon-2026/accommodation.ts). */
export function Accommodation() {
  const now = useGuideNow();
  return (
    <div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {ACCOMMODATION_OFFERS.map((offer) => (
          <Offer key={offer.id} offer={offer} now={now} />
        ))}
      </ul>
    </div>
  );
}

