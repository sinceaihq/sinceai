import { Laptop, Users } from "lucide-react";
import Link from "next/link";
import {
  formatTime,
  WORKSHOP_BRING,
  WORKSHOP_CANT_ATTEND,
  WORKSHOP_MAP_LINK,
  WORKSHOP_PLACE,
  WORKSHOP_SEATING,
  WORKSHOP_SEATS_NOTE,
  WORKSHOPS,
  WORKSHOPS_VS_INTRO,
} from "@/lib/hackathon-2026";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

/**
 * MLH's two Friday workshops: when and where, the one-person-per-team
 * recommendation, the setup links — and the way in without attending.
 * Everything comes from lib/hackathon-2026/workshops.ts.
 */
export function Workshops() {
  return (
    <div data-workshops className="space-y-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <p className="flex items-start gap-3 border border-(--color-event)/40 bg-(--color-event)/[0.07] p-4 text-sm text-white leading-relaxed">
          <Users aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-(--color-event)" />
          <span data-workshop-seating>{WORKSHOP_SEATING}</span>
        </p>
        <p className="flex items-start gap-3 border border-white/10 p-4 text-sm text-neutral-300 leading-relaxed">
          <Laptop aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-white/70" />
          <span>{WORKSHOP_BRING}</span>
        </p>
      </div>

      <ul className="grid grid-cols-1 border-l border-t border-white/10 md:grid-cols-2">
        {WORKSHOPS.map((w) => (
          <li key={w.id} data-workshop={w.id} className="guide-avoid-break flex flex-col border-b border-r border-white/10 p-5 md:p-6">
            <p className="font-mono text-sm font-bold tabular-nums text-(--color-event)">
              <span className="sr-only">Friday </span>
              <span aria-hidden="true">Fri </span>
              {formatTime(w.start)}–{formatTime(w.end)}
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-white">{w.title}</h3>
            <p className="mt-1 text-xs font-mono uppercase tracking-widest text-white/55">{w.host}</p>
            <p className="mt-3 text-sm text-neutral-300 leading-relaxed">{w.text}</p>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="text-white">
                BioCity · <span data-workshop-room>{WORKSHOP_PLACE}</span>
              </span>
              <Link
                href={WORKSHOP_MAP_LINK.href}
                className="inline-flex min-h-11 items-center text-neutral-300 underline underline-offset-4 decoration-white/40 hover:text-white hover:decoration-white"
              >
                {WORKSHOP_MAP_LINK.label}
                <span className="sr-only"> for the {w.title}</span>
              </Link>
            </p>
            <p className="mt-2 text-xs text-neutral-400 leading-relaxed">{w.access}</p>
            <div className="mt-auto pt-4">
              <a
                href={w.link.href}
                {...external}
                className="inline-flex min-h-11 items-center border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {w.link.label}
                <span aria-hidden="true" className="ml-2">
                  ↗
                </span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          </li>
        ))}
      </ul>

      <div data-workshops-cant-attend className="max-w-3xl">
        <h3 className="text-lg font-bold tracking-tight text-white">{WORKSHOP_CANT_ATTEND.title}</h3>
        <p className="mt-1 text-sm text-neutral-300">{WORKSHOP_CANT_ATTEND.text}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {WORKSHOP_CANT_ATTEND.help.map((h) => (
            <li key={h.label} className="flex gap-2 text-neutral-400 leading-relaxed">
              <span aria-hidden="true" className="text-(--color-event)">
                →
              </span>
              <span>
                {"href" in h ? (
                  <a
                    href={h.href}
                    {...("external" in h && h.external ? external : {})}
                    className="font-semibold text-white underline underline-offset-4 decoration-white/40 hover:decoration-white"
                  >
                    {h.label}
                    {"external" in h && h.external && <span className="sr-only"> (opens in a new tab)</span>}
                  </a>
                ) : (
                  <span className="font-semibold text-white">{h.label}</span>
                )}
                {" — "}
                {h.text}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-white/55 leading-relaxed">
          {WORKSHOP_SEATS_NOTE} {WORKSHOPS_VS_INTRO}
        </p>
      </div>
    </div>
  );
}
