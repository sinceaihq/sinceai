import Link from "next/link";
import type { ReactNode } from "react";
import { EVENT_2026 } from "@/lib/hackathon-2026";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Compact role hero: breadcrumb, H1, one-line purpose, then whatever the page
 * needs first (facts, live card). Critical information sits above decoration.
 */
export function GuideHero({
  crumbs,
  title,
  titleAddon,
  lede,
  children,
}: {
  crumbs: Crumb[];
  title: string;
  titleAddon?: ReactNode;
  lede: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby="page-title" className="relative px-6 pt-12 pb-12 md:pt-20 md:pb-16">
      <div className="mx-auto max-w-5xl">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-mono uppercase tracking-widest text-white/55">
            {crumbs.map((crumb, i) => (
              <li key={crumb.label} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true">/</span>}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    // Pages outside the guide are not prefetched (saves mobile data on site).
                    prefetch={crumb.href.startsWith("/hackathon-2026/") ? undefined : false}
                    className="-my-4 py-4 transition-colors hover:text-white"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-neutral-300">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <h1
            id="page-title"
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[0.95]"
          >
            {title}
          </h1>
          {titleAddon}
        </div>
        <p className="mt-6 max-w-2xl text-base md:text-lg text-neutral-300 leading-relaxed">{lede}</p>
        <p className="mt-4 text-xs font-mono uppercase tracking-widest text-white/55">
          {EVENT_2026.dateLabel}&nbsp;· {EVENT_2026.city}&nbsp;· Updated {EVENT_2026.lastUpdatedLabel}
        </p>
        {children && <div className="mt-10 space-y-6">{children}</div>}
      </div>
    </section>
  );
}
