import React from "react";
import { REACH, fmt } from "@/lib/reach";
import { HACKATHON_2026_PARTNERS } from "@/lib/sinceai";

/**
 * Stat band directly under the hackathon hero: the event in four figures.
 *
 * Every figure here was published by the organisers before the event. The
 * application count carries its date; attendance, projects and winners are not
 * shown until the organisers confirm them. The prize numeral is the single
 * brand-pink moment on the page.
 */

const stats = [
  { value: "€50,000+", label: "// prize pool", desc: "In cash, across the company challenges and the overall win", brand: true },
  { value: String(HACKATHON_2026_PARTNERS.challengeTarget), label: "// company challenges", desc: "Each set by a company with a real problem" },
  { value: fmt(REACH.applicants.total), label: "// applications", desc: `From ${REACH.applicants.countries} countries, as of ${REACH.asOfLabel}` },
  { value: "6–8 Nov", label: "// 2026", desc: "Friday to Sunday in Turku, Finland" },
];

export function StatBand() {
  return (
    <section aria-label="Since AI Hackathon 2026 in figures" className="py-16 px-6 border-t border-white/10">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {stats.map((stat) => (
            <div key={stat.label} className="border-l border-white/10 pl-6">
              <p className="text-xs font-mono uppercase tracking-widest text-white/55 mb-2">
                {stat.label}
              </p>
              <p
                className="text-4xl md:text-5xl font-bold tracking-tight leading-none"
                style={stat.brand ? { color: "var(--color-brand)" } : undefined}
              >
                <span className={stat.brand ? "" : "text-white"}>{stat.value}</span>
              </p>
              <p className="text-sm text-neutral-400 leading-relaxed mt-2 max-w-[200px]">
                {stat.desc}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs font-mono uppercase tracking-widest text-white/55 mt-12 pt-6 border-t border-white/10">
          MLH 2027 Season Member Event &nbsp;·&nbsp; EduCity · BioCity · Joki, Turku, Finland
          &nbsp;·&nbsp; Free for builders worldwide
        </p>
      </div>
    </section>
  );
}
