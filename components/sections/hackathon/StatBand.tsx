import React from "react";

/**
 * High-contrast stat band that sits directly under the hackathon hero.
 *
 * This is the first thing paid-traffic visitors read after the headline, so it
 * answers "why should I care" in one glance: the money, the scale, the price,
 * and the format. The prize numeral is the single brand-pink moment on the page.
 */

const stats = [
  { value: "€50,000", label: "// prize pool", desc: "In cash, awarded across tracks", brand: true },
  { value: "1,000+",  label: "// builders",   desc: "Expected from across the world" },
  { value: "Free",    label: "// entry",      desc: "No fee for any participant" },
  { value: "72h",     label: "// to ship",    desc: "Working demos only — no decks" },
];

export function StatBand() {
  return (
    <section className="py-16 px-6 border-t border-white/10">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {stats.map((stat) => (
            <div key={stat.label} className="border-l border-white/10 pl-6">
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-2">
                {stat.label}
              </p>
              <p
                className="text-4xl md:text-5xl font-bold tracking-tight leading-none"
                style={stat.brand ? { color: "var(--color-brand)" } : undefined}
              >
                <span className={stat.brand ? "" : "text-white"}>{stat.value}</span>
              </p>
              <p className="text-sm text-neutral-400 leading-relaxed mt-2 max-w-[180px]">
                {stat.desc}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mt-12 pt-6 border-t border-white/10">
          Official MLH 2026 Season Member Event &nbsp;·&nbsp; EduCity, Turku, Finland
          &nbsp;·&nbsp; Open to builders worldwide
        </p>
      </div>
    </section>
  );
}
