"use client";

import Link from "next/link";
import { COMPUTING, COMPUTING_ANCHOR, COMPUTING_HREF, computingRegistrationOpen } from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";
import { useGuideNow } from "./clock";
import { Arrow, Eyebrow, GuideSection, SectionHeading, TextLink } from "./primitives";

/** Server and first render: registration as published; the client then checks the deadline (`?now=` too). */
function useRegistrationOpen(): boolean {
  const now = useGuideNow();
  return now === null || computingRegistrationOpen(now);
}

const inlineLink =
  "text-white underline decoration-white/30 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest",
        accent ? "border-(--color-event)/50 text-(--color-event)" : "border-white/15 text-neutral-400",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("inline-block h-1.5 w-1.5 rounded-full", accent ? "bg-(--color-event)" : "bg-neutral-500")}
      />
      {children}
    </span>
  );
}

function Deadline() {
  const open = useRegistrationOpen();
  if (!open) {
    return (
      <div className="guide-avoid-break border border-white/15 p-5 md:p-6" data-computing-status="closed">
        <div className="flex flex-wrap gap-2">
          <Tag>Optional</Tag>
          <Tag>Registration closed</Tag>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-neutral-300 leading-relaxed">{COMPUTING.closed}</p>
      </div>
    );
  }
  return (
    <div
      className="guide-avoid-break grid grid-cols-1 gap-4 border border-(--color-event)/50 bg-(--color-event)/[0.05] p-5 md:grid-cols-[auto_1fr] md:items-end md:gap-10 md:p-6"
      data-computing-status="open"
    >
      <div>
        <div className="flex flex-wrap gap-2">
          <Tag accent>Optional</Tag>
        </div>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-white/55">Register by</p>
        <p className="mt-1 text-2xl md:text-3xl font-bold tracking-tight text-white">{COMPUTING.deadlineLabel}</p>
      </div>
      <p className="max-w-xl text-sm text-neutral-300 leading-relaxed">{COMPUTING.register}</p>
    </div>
  );
}

/** Hub section — id `ai-resources`. The one public place for the CSC / LUMI facts. */
export function ComputingSection() {
  return (
    <GuideSection id={COMPUTING_ANCHOR}>
      <SectionHeading
        id={`${COMPUTING_ANCHOR}-title`}
        eyebrow="// ai resources · optional"
        title={`${COMPUTING.title}.`}
        lede={COMPUTING.intro}
      />
      <Deadline />

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="guide-avoid-break border border-white/10 p-5">
          <h3 className="text-lg font-bold tracking-tight text-white">What you can use</h3>
          <ul className="mt-2">
            {COMPUTING.resources.map((r) => (
              <li key={r.name} className="border-t border-white/10 py-3 first:border-t-0">
                <TextLink href={r.href} className="min-h-0 font-semibold text-white">
                  {r.name}
                </TextLink>
                <p className="mt-1 text-sm text-neutral-400 leading-relaxed">{r.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="guide-avoid-break border border-white/10 p-5">
          <h3 className="text-lg font-bold tracking-tight text-white">Who can register</h3>
          <ul className="mt-3 space-y-2 text-sm text-neutral-300 leading-relaxed">
            {COMPUTING.eligibility.map((t) => (
              <li key={t} className="flex gap-2">
                <span aria-hidden="true" className="text-white/55">
                  —
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="guide-avoid-break mt-4 grid grid-cols-1 border border-white/10 md:grid-cols-2">
        <div className="p-5">
          <h3 className="text-lg font-bold tracking-tight text-white">{COMPUTING.whereTitle}</h3>
          <p className="mt-2 text-sm text-neutral-300 leading-relaxed">{COMPUTING.where}</p>
          <p className="mt-2 text-xs text-neutral-400 leading-relaxed">{COMPUTING.privateNote}</p>
        </div>
        <div className="border-t border-white/10 p-5 md:border-l md:border-t-0">
          <h3 className="text-lg font-bold tracking-tight text-white">{COMPUTING.cantFindTitle}</h3>
          <p className="mt-2 text-sm text-neutral-300 leading-relaxed">
            {COMPUTING.cantFind}{" "}
            <a href={`mailto:${COMPUTING.supportEmail}`} className={inlineLink}>
              {COMPUTING.supportEmail}
            </a>
            .
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-sm text-neutral-400 leading-relaxed">{COMPUTING.onSite}</p>
        {COMPUTING.links.map((l) => (
          <TextLink key={l.href} href={l.href} className="shrink-0 self-start sm:self-auto">
            {l.label}
          </TextLink>
        ))}
      </div>
    </GuideSection>
  );
}

/** Persistent cross-reference for the builder guide's checklist. */
export function ComputingNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-neutral-400 leading-relaxed", className)}>
      <span className="font-semibold text-white">Optional: AI computing.</span> CSC / LUMI AI Factory resources —
      who can register, the {COMPUTING.deadlineLabel} deadline and where your instructions are:{" "}
      <Link href={COMPUTING_HREF} className={inlineLink}>
        AI resources in the Field Guide
      </Link>
      .
    </p>
  );
}

/**
 * One line for the hub and builder heroes, pointing to the section until registration closes — then
 * it disappears, and the section itself says registration has closed. On the hub (`inPage`) it is a
 * plain fragment link: a client-side push to the hub's own path dropped the query (`?now=`, `utm_…`)
 * and never scrolled to the section.
 */
export function ComputingCallout({ className, inPage = false }: { className?: string; inPage?: boolean }) {
  const open = useRegistrationOpen();
  if (!open) return null;
  const Anchor = inPage ? "a" : Link;
  return (
    <Anchor
      href={inPage ? `#${COMPUTING_ANCHOR}` : COMPUTING_HREF}
      className={cn(
        "guide-no-print group flex min-h-11 flex-col gap-1 border border-(--color-event)/40 px-4 py-3 transition-colors hover:border-(--color-event) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex-row sm:items-center sm:gap-3",
        className,
      )}
    >
      <Eyebrow className="shrink-0 text-(--color-event)">Optional · AI resources</Eyebrow>
      <span className="text-sm text-neutral-200 leading-relaxed">
        Using CSC / LUMI computing? <span className="font-semibold text-white">Register by {COMPUTING.deadlineShort}</span>{" "}
        — instructions are in your Since AI email.
        <span className="text-white/55 transition-colors group-hover:text-white">
          <Arrow />
        </span>
      </span>
    </Anchor>
  );
}
