import { WORLD_MAP } from "@/lib/world-map.generated";
import { HQ } from "@/lib/ecosystem-cities.generated";
import { ORG } from "@/lib/org";
import { EcosystemMapLive } from "./EcosystemMapLive";

/**
 * The Since AI ecosystem as a dot-matrix world map — every light is a city
 * where our builders study or work, Turku is the headquarters.
 *
 * The map itself is server-rendered SVG: land, three steps of glow and the
 * city dots are one <path> each (scripts/build-world-map.mjs). The hover
 * labels and the slow tour of cities are a small client layer on top
 * (EcosystemMapLive), so the map paints with the HTML and needs no image.
 */
export function EcosystemMap() {
  const { cols, rows, land, glow, cities } = WORLD_MAP;
  const left = `${((HQ[0] + 0.5) / cols) * 100}%`;
  const top = `${((HQ[1] + 0.5) / rows) * 100}%`;

  return (
    <figure className="eco-map relative">
      {/* Wider than the screen on phones, centred on Europe, Africa and Asia. */}
      <div className="eco-map-frame">
        <div className="eco-map-canvas relative" style={{ aspectRatio: `${cols} / ${rows}` }}>
          <svg
            viewBox={`0 0 ${cols} ${rows}`}
            role="img"
            aria-label={`World map of the Since AI ecosystem: builders in ${ORG.stats.countries} countries on six continents, with the headquarters in Turku, Finland.`}
            className="absolute inset-0 block h-full w-full"
          >
            <path d={land} className="eco-land" />
            {glow.map((d, i) => (
              <path key={i} d={d} className={`eco-glow eco-glow-${i + 1}`} />
            ))}
            {cities.map((d, i) => (
              <g key={i} className={`eco-city eco-city-${i + 1}`}>
                <path d={d} className="eco-halo" />
                <path d={d} />
              </g>
            ))}
            <g transform={`translate(${HQ[0] + 0.5} ${HQ[1] + 0.5})`} aria-hidden="true">
              <circle r="1.4" className="eco-hq-pulse" />
              <rect x="-0.6" y="-0.6" width="1.2" height="1.2" className="fill-white" />
            </g>
          </svg>

          <span aria-hidden="true" className="eco-hq-label" style={{ left, top }}>
            <span className="text-white">Turku, Finland</span>
            <span className="eco-hq-badge">HQ</span>
          </span>

          <EcosystemMapLive />
        </div>
      </div>
    </figure>
  );
}
