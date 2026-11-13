import Link from "next/link";
import type { ReactNode } from "react";
import { EVENT_2026, isEventOver } from "@/lib/hackathon-2026";
import { ConsentDefaults } from "./ConsentDefaults";
import { GuideHeader } from "./GuideHeader";
import { GuideFooter } from "./GuideFooter";

/**
 * Shown on every guide page once the event is over. The guide stays online as
 * the record of the weekend, unchanged — so it has to say that its times,
 * rooms and instructions are history, not something to act on today.
 */
function ArchiveNotice() {
  return (
    <aside
      aria-label="Archive notice"
      data-guide-archive
      className="relative border-b border-white/10 bg-(--color-surface-raised) px-6 py-3"
    >
      <p className="mx-auto max-w-5xl text-sm leading-relaxed text-neutral-300">
        <strong className="font-semibold text-white">Archive.</strong> {EVENT_2026.name} took place on{" "}
        {EVENT_2026.dateLabel} and has ended. This guide is kept as it was published for the weekend: its times,
        rooms and instructions are no longer current.{" "}
        <Link
          href="/hackathon"
          prefetch={false}
          className="inline-block py-1 text-white underline underline-offset-4 decoration-white/40 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          About the event and what is next
        </Link>
      </p>
    </aside>
  );
}

/** Chrome for every Field Guide page: event-layer atmosphere, header, footer. */
export function GuideShell({ children }: { children: ReactNode }) {
  return (
    <div className="guide-root relative min-h-screen bg-black text-white">
      <ConsentDefaults />
      <div aria-hidden="true" className="guide-ambient pointer-events-none absolute inset-x-0 top-0 h-[44rem]" />
      <div aria-hidden="true" className="guide-grid pointer-events-none absolute inset-x-0 top-0 h-[44rem]" />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-black"
      >
        Skip to content
      </a>
      <GuideHeader />
      {isEventOver() && <ArchiveNotice />}
      <main id="main" className="relative">
        {children}
      </main>
      <GuideFooter />
    </div>
  );
}
