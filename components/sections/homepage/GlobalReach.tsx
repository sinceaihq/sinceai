import type { CSSProperties } from "react";
import { WORLD_MAP } from "@/lib/world-map.generated";
import { REACH, fmt, pct, type CountryCount, type ReachLayer } from "@/lib/reach";

/**
 * "Global reach" — a dot-matrix world map of where Since AI's builders are.
 *
 * Server-rendered SVG, no client JavaScript: the two data layers (community
 * members, Hackathon 2026 applicants) are switched with a pair of radio
 * buttons and CSS :has() (globals.css, .reach). Land is one <path> of dots and
 * every country in a layer one more (scripts/build-world-map.mjs), so the map
 * is a few hundred nodes and ~5 KB gzipped.
 */

const LAYERS: {
  id: ReachLayer;
  tab: string;
  unit: [string, string];
  facts: { value: string; label: string }[];
}[] = [
  {
    id: "members",
    tab: "Community",
    unit: ["member", "members"],
    facts: [
      { value: fmt(REACH.members.total), label: "Builders on the Since AI platform" },
      { value: String(REACH.members.countries), label: "Countries" },
      { value: pct(REACH.members.outsideFinland), label: "Based outside Finland" },
    ],
  },
  {
    id: "applicants",
    tab: "Hackathon 2026",
    unit: ["applicant", "applicants"],
    facts: [
      { value: fmt(REACH.applicants.total), label: "Applications for Since AI Hackathon 2026" },
      { value: String(REACH.applicants.countries), label: "Countries" },
      { value: fmt(REACH.applicants.travelling), label: "Travelling to Turku from abroad" },
    ],
  },
];

const TOP = 10;

/** Brighter for more people, on a log scale so 1 and 1,000 both read. */
function intensity(count: number, max: number) {
  return 0.55 + 0.45 * (Math.log(count) / Math.log(max));
}

/** A gentle arc from a country to Turku, always bowed the same way round. */
function arc([x1, y1]: readonly [number, number], [x2, y2]: readonly [number, number]) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const k = 0.22;
  const cx = (x1 + x2) / 2 + dy * k;
  const cy = (y1 + y2) / 2 - dx * k;
  return `M${x1} ${y1}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}`;
}

function MapLayer({ layer, ranked, unit }: { layer: ReachLayer; ranked: readonly CountryCount[]; unit: [string, string] }) {
  const max = ranked[0].count;
  return (
    <g data-layer={layer}>
      {ranked.map((c) => (
        <path
          key={c.name}
          d={WORLD_MAP.layers[layer][c.name]}
          className="reach-country"
          style={{ strokeOpacity: intensity(c.count, max).toFixed(2) } as CSSProperties}
        >
          <title>{`${c.name} · ${fmt(c.count)} ${c.count === 1 ? unit[0] : unit[1]}`}</title>
        </path>
      ))}
    </g>
  );
}

function Ranking({ layer, ranked, unit }: { layer: ReachLayer; ranked: readonly CountryCount[]; unit: [string, string] }) {
  const max = ranked[0].count;
  return (
    <div data-layer={layer}>
      <ol className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
        {ranked.slice(0, TOP).map((c, i) => (
          <li key={c.name} className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-x-3 border-b border-white/10 py-3 text-sm">
            <span aria-hidden="true" className="font-mono text-xs text-white/55">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-white">{c.name}</span>
              <span aria-hidden="true" className="mt-1.5 block h-px bg-white/10">
                <span className="block h-px bg-(--color-brand)" style={{ width: `${Math.max(2, (c.count / max) * 100)}%` }} />
              </span>
            </span>
            <span className="font-mono text-xs tabular-nums text-neutral-300">
              {fmt(c.count)}
              <span className="sr-only"> {c.count === 1 ? unit[0] : unit[1]}</span>
            </span>
          </li>
        ))}
      </ol>
      <details className="reach-all group mt-6">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&::-webkit-details-marker]:hidden">
          All {ranked.length} countries
          <svg aria-hidden="true" width="12" height="12" viewBox="0 0 14 14" className="transition-transform group-open:rotate-180">
            <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </summary>
        {/* Styled from the list (globals.css, .reach-list), so ~120 rows add no per-row classes. */}
        <ul className="reach-list mt-6 columns-2 gap-x-8 text-sm sm:columns-3 lg:columns-4">
          {ranked.map((c) => (
            <li key={c.name}>
              {c.name} <b>{fmt(c.count)}</b>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export function GlobalReach() {
  const { cols, rows, land, centroids, turku } = WORLD_MAP;
  const travellers = REACH.applicants.ranked.filter((c) => c.name !== "Finland" && c.count >= 8);
  const label = `World map of the Since AI community: ${fmt(REACH.members.total)} builders in ${REACH.members.countries} countries, and ${fmt(REACH.applicants.total)} Hackathon 2026 applications from ${REACH.applicants.countries} countries. The figures are listed below the map.`;

  return (
    <section aria-labelledby="reach-title" className="reach relative overflow-hidden border-t border-white/10 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <header className="max-w-3xl">
            <p className="mb-4 text-xs font-mono uppercase tracking-widest text-white/55">{"// global reach"}</p>
            <h2 id="reach-title" className="text-4xl font-bold tracking-tight text-white text-balance md:text-5xl">
              Builders from {REACH.members.countries} countries. One ecosystem.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-neutral-300 text-pretty md:text-lg">
              Since AI started in Finland and grew global from day one. {pct(REACH.members.outsideFinland)} of the builders
              on our platform are based outside Finland — engineers, researchers, students and founders on six continents.
            </p>
          </header>

          <div role="radiogroup" aria-label="Show on the map" className="inline-flex shrink-0 self-start border border-white/15 lg:self-auto">
            {LAYERS.map((l, i) => (
              <label key={l.id} className="reach-tab">
                <input type="radio" name="reach-layer" value={l.id} defaultChecked={i === 0} className="sr-only" />
                {l.tab}
              </label>
            ))}
          </div>
        </div>

        <figure className="relative mt-12 md:mt-16">
          <div className="relative -mx-6 sm:mx-0">
            <svg
              viewBox={`0 0 ${cols} ${rows}`}
              role="img"
              aria-label={label}
              className="reach-map block h-auto w-full"
              style={{ aspectRatio: `${cols} / ${rows}` }}
            >
              <path d={land} className="reach-land" />
              {LAYERS.map((l) => (
                <MapLayer key={l.id} layer={l.id} ranked={REACH[l.id].ranked} unit={l.unit} />
              ))}
              <g data-layer="applicants" className="reach-arcs" aria-hidden="true">
                {travellers.map((c) => (
                  <path key={c.name} d={arc(centroids[c.name], turku)} />
                ))}
              </g>
              <g aria-hidden="true" transform={`translate(${turku[0]} ${turku[1]})`}>
                <circle r="1.6" className="reach-pulse" />
                <rect x="-0.55" y="-0.55" width="1.1" height="1.1" className="fill-white" />
              </g>
            </svg>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute hidden -translate-y-1/2 pl-3 font-mono text-[11px] uppercase tracking-widest text-white/80 md:block"
              style={{ left: `${(turku[0] / cols) * 100}%`, top: `${(turku[1] / rows) * 100}%` }}
            >
              Turku
            </span>
          </div>

          {LAYERS.map((l) => (
            <dl
              key={l.id}
              data-layer={l.id}
              className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-8 lg:absolute lg:bottom-0 lg:left-0 lg:mt-0 lg:w-56 lg:grid-cols-1 lg:gap-7 lg:border-0 lg:pt-0"
            >
              {l.facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs leading-snug text-neutral-400 lg:text-sm">{f.label}</dt>
                  <dd className="mt-2 text-2xl font-bold tracking-tight text-white tabular-nums md:text-3xl lg:text-4xl">{f.value}</dd>
                </div>
              ))}
            </dl>
          ))}

          <figcaption className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/55 lg:justify-end">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-(--color-brand)" />
              <span data-layer="members">Since AI members</span>
              <span data-layer="applicants">Hackathon 2026 applicants</span>
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-1.5 w-1.5 bg-white" />
              Turku, Finland — home of the flagship event
            </span>
          </figcaption>
        </figure>

        <div className="mt-16">
          <h3 className="mb-6 text-xs font-mono uppercase tracking-widest text-white/55">
            <span data-layer="members">Members by country</span>
            <span data-layer="applicants">Hackathon 2026 applicants by country</span>
          </h3>
          {LAYERS.map((l) => (
            <Ranking key={l.id} layer={l.id} ranked={REACH[l.id].ranked} unit={l.unit} />
          ))}
          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-white/55">
            As of {REACH.asOfLabel}. Members are sinceai.app accounts by the country on the profile; applicants are Since AI
            Hackathon 2026 registrations by country of residence. Counted per country — no personal data is published.
          </p>
        </div>
      </div>
    </section>
  );
}
