import { Clapperboard, MessagesSquare } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { WINNING } from "@/lib/hackathon-2026";

function More({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="guide-details group mt-4 border-t border-white/10 pt-1">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-white">
        {label}
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" className="guide-chevron transition-transform">
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </summary>
      <div className="pb-2 pt-2">{children}</div>
    </details>
  );
}

/**
 * "Build a project that wins": two principles, details on demand, and a
 * three-stage checklist. Copy: lib/hackathon-2026/winning.ts (advice, not rules).
 */
export function WinningProject() {
  const { company, demo } = WINNING;
  return (
    <div data-winning>
      <div className="grid grid-cols-1 border-l border-t border-white/10 md:grid-cols-2">
        <article data-winning-card="company" className="border-b border-r border-white/10 p-5 md:p-7">
          <MessagesSquare aria-hidden="true" className="h-6 w-6 text-(--color-event)" />
          <h3 className="mt-4 text-xl font-bold tracking-tight text-white md:text-2xl">{company.title}</h3>
          <p className="mt-3 text-sm text-neutral-300 leading-relaxed md:text-base">{company.text}</p>
          <p className="mt-3 text-xs text-neutral-400 leading-relaxed">{company.where}</p>
          <More label={company.questionsLabel}>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-neutral-300 marker:text-(--color-event)">
              {company.questions.map((q) => (
                <li key={q}>“{q}”</li>
              ))}
            </ol>
          </More>
        </article>
        <article data-winning-card="demo" className="border-b border-r border-white/10 p-5 md:p-7">
          <Clapperboard aria-hidden="true" className="h-6 w-6 text-(--color-event)" />
          <h3 className="mt-4 text-xl font-bold tracking-tight text-white md:text-2xl">{demo.title}</h3>
          <p className="mt-3 text-sm text-neutral-300 leading-relaxed md:text-base">{demo.text}</p>
          <More label={demo.howLabel}>
            <ol className="space-y-3">
              {demo.steps.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[1.5rem_1fr] gap-x-2 text-sm">
                  <span aria-hidden="true" className="font-mono font-bold text-(--color-event)">
                    {i + 1}
                  </span>
                  <span>
                    <span className="font-semibold text-white">{s.title}.</span>{" "}
                    <span className="text-neutral-300">{s.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-neutral-400 leading-relaxed">{demo.tools}</p>
            <p className="mt-2 text-xs text-neutral-400 leading-relaxed">{demo.honesty}</p>
            <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
              {demo.confidential}{" "}
              <Link href={demo.confidentialLink.href} className="text-white underline underline-offset-4">
                {demo.confidentialLink.label}
              </Link>
            </p>
          </More>
        </article>
      </div>

      <ol aria-label="When to do what" className="mt-6 grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-3">
        {WINNING.stages.map((s) => (
          <li key={s.when} className="bg-black p-4">
            <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-event)">{s.when}</p>
            <p className="mt-1.5 text-sm text-neutral-300 leading-relaxed">{s.text}</p>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-lg font-bold tracking-tight text-white">{WINNING.closing}</p>
    </div>
  );
}
