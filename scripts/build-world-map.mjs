#!/usr/bin/env node
/**
 * The dot-matrix ecosystem map in the homepage hero.
 *
 * Land is sampled on a regular grid in Natural Earth projection space and every
 * dot is assigned to the country that contains it. Each city of the community
 * lights the land around it (a soft glow that grows with the city's size), and
 * every layer is written as ONE <path> of zero-length segments — round caps
 * draw the dots — so the whole map is a dozen DOM nodes and a few KB of HTML.
 *
 *   node scripts/build-world-map.mjs
 *     → lib/world-map.generated.ts      (the SVG paths, server only)
 *     → lib/ecosystem-cities.generated.ts (city positions for the hover labels)
 *
 * Inputs: lib/ecosystem-cities.json (aggregated, no personal data) and the
 * Natural Earth 1:50m countries from world-atlas (public domain).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { geoNaturalEarth1, geoContains, geoBounds } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const topology = require("world-atlas/countries-50m.json");
const { cities } = JSON.parse(fs.readFileSync(path.resolve("lib/ecosystem-cities.json"), "utf8"));
const OUT = path.resolve("lib/world-map.generated.ts");
const OUT_CITIES = path.resolve("lib/ecosystem-cities.generated.ts");

/**
 * Countries that are counted in the totals but not drawn on the map — the
 * brand does not put a light on them. Natural Earth names.
 */
const HIDDEN = new Set(["Russia", "Belarus", "Iran", "North Korea"]);

/** Grid size in dots. 150 columns reads as a texture on a phone and stays light. */
const COLS = 150;
/** Cut off Antarctica and the empty far south. */
const MIN_LAT = -56;
const MAX_LAT = 84;

const countries = feature(topology, topology.objects.countries).features.filter((f) => f.properties.name !== "Antarctica");
const boxes = countries.map((f) => ({ f, b: geoBounds(f) }));

// Fit the projection so that one grid step is exactly one unit.
const projection = geoNaturalEarth1();
const [[x0], [x1]] = [projection([-180, 0]), projection([180, 0])];
const scale = COLS / (x1 - x0);
projection.scale(projection.scale() * scale).translate([COLS / 2, 0]);
const top = Math.floor(projection([0, MAX_LAT])[1]);
const bottom = Math.ceil(projection([0, MIN_LAT])[1]);
projection.translate([COLS / 2, -top + 0.5]);
const ROWS = bottom - top;

function countryAt(lon, lat) {
  for (const { f, b } of boxes) {
    const [[w, s], [e, n]] = b;
    const inLon = w <= e ? lon >= w && lon <= e : lon >= w || lon <= e;
    if (lat < s || lat > n || !inLon) continue;
    if (geoContains(f, [lon, lat])) return f.properties.name;
  }
  return null;
}

/** Every land dot, keyed "x,y" → country name. */
const dots = new Map();
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    const ll = projection.invert([x + 0.5, y + 0.5]);
    if (!ll || Math.abs(ll[0]) > 180) continue;
    const name = countryAt(ll[0], ll[1]);
    if (name) dots.set(`${x},${y}`, name);
  }
}

/** One path for a set of dots: absolute first move, then relative moves, row by row. */
function toPath(keys) {
  const pts = keys.map((k) => k.split(",").map(Number)).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  let d = "";
  let cx = 0;
  let cy = 0;
  pts.forEach(([x, y], i) => {
    d += i === 0 ? `M${x + 0.5} ${y + 0.5}h0` : `m${x - cx} ${y - cy}h0`;
    cx = x;
    cy = y;
  });
  return d;
}

/** Size tier 1–4 → how far a city's glow reaches, in dots. */
const REACH = [0, 1.7, 2.5, 3.4, 4.4];

/** Well-known cities that give their name to a dot they share with a smaller neighbour. */
const LANDMARK = new Set(["Helsinki", "London", "Paris", "Berlin", "Munich", "Amsterdam", "Stockholm", "Copenhagen", "Zurich", "Vienna", "Prague", "Warsaw", "Madrid", "Barcelona", "Milan", "Rome", "Istanbul", "New York", "San Francisco", "Toronto", "Bengaluru", "Mumbai", "New Delhi", "Delhi", "Lagos", "Nairobi", "Cairo", "Cape Town", "Johannesburg", "Dubai", "Riyadh", "Singapore", "Tokyo", "Seoul", "Shanghai", "Beijing", "Taipei", "Sydney", "São Paulo", "Mexico City"]);

/** Every city on its nearest land dot; cities that share a dot merge into the larger one. */
const nodes = new Map();
for (const [city, country, lat, lon, tier] of cities) {
  const [px, py] = projection([lon, lat]);
  let key = `${Math.floor(px)},${Math.floor(py)}`;
  if (!dots.has(key)) {
    // A coastal or island city (Singapore, Port Louis) — the nearest land dot, else its own.
    let best = null;
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const k = `${Math.floor(px) + dx},${Math.floor(py) + dy}`;
        const d = dx * dx + dy * dy;
        if (dots.has(k) && !nodes.has(k) && (!best || d < best.d)) best = { k, d };
      }
    if (best) key = best.k;
    else dots.set(key, null);
  }
  if (HIDDEN.has(country) || HIDDEN.has(dots.get(key))) continue;
  const prev = nodes.get(key);
  if (prev) {
    prev.tier = Math.max(prev.tier, tier);
    if (LANDMARK.has(city) && !LANDMARK.has(prev.city) && prev.city !== "Turku") Object.assign(prev, { city, country });
  }
  else nodes.set(key, { city, country, tier, x: Number(key.split(",")[0]), y: Number(key.split(",")[1]) });
}

/** Glow: each land dot takes the strongest light of the cities around it, in three steps. */
const glow = [[], [], []];
for (const [key, owner] of dots) {
  if (HIDDEN.has(owner) || nodes.has(key)) continue;
  const [x, y] = key.split(",").map(Number);
  let light = 0;
  for (const n of nodes.values()) {
    const r = REACH[n.tier];
    const d = Math.hypot(n.x - x, n.y - y);
    if (d < r) light = Math.max(light, (1 - d / r) ** 1.2);
  }
  if (light > 0.62) glow[2].push(key);
  else if (light > 0.34) glow[1].push(key);
  else if (light > 0.06) glow[0].push(key);
}

const [tx, ty] = projection([22.27, 60.45]); // Turku
const hq = `${Math.floor(tx)},${Math.floor(ty)}`;
const byTier = [1, 2, 3, 4].map((t) => [...nodes].filter(([k, n]) => n.tier === t && k !== hq).map(([k]) => k));

const src = `// Generated by scripts/build-world-map.mjs — do not edit by hand.
// Natural Earth 1:50m (public domain) sampled on a ${COLS} × ${ROWS} grid.

export const WORLD_MAP = {
  cols: ${COLS},
  rows: ${ROWS},
  /** Every land dot. */
  land: ${JSON.stringify(toPath([...dots.keys()]))} as string,
  /** Land lit by the cities around it, faint to bright. */
  glow: ${JSON.stringify(glow.map(toPath))} as readonly string[],
  /** The cities themselves, by size tier 1–4. */
  cities: ${JSON.stringify(byTier.map(toPath))} as readonly string[],
} as const;
`;
fs.writeFileSync(OUT, src);

// Largest first, so the idle tour and the hover pick favour the main hubs.
const list = [...nodes.values()].sort((a, b) => b.tier - a.tier || a.city.localeCompare(b.city));
const citySrc = `// Generated by scripts/build-world-map.mjs — do not edit by hand.
// [city, country, x, y, tier] on the ${COLS} × ${ROWS} map grid (dot centres at +0.5).

export const MAP_GRID = { cols: ${COLS}, rows: ${ROWS} } as const;

/** Headquarters — Turku, Finland. */
export const HQ = [${Math.floor(tx)}, ${Math.floor(ty)}] as const;

export const CITIES: readonly (readonly [string, string, number, number, number])[] = ${JSON.stringify(list.map((n) => [n.city, n.country, n.x, n.y, n.tier]))};
`;
fs.writeFileSync(OUT_CITIES, citySrc);
console.log(`${COLS}×${ROWS}, ${dots.size} land dots, ${nodes.size} city dots, glow ${glow.map((g) => g.length).join("/")}, ${(src.length / 1024).toFixed(1)} KB + ${(citySrc.length / 1024).toFixed(1)} KB`);
