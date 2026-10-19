#!/usr/bin/env node
/**
 * The dot-matrix world map on the homepage ("Global reach").
 *
 * Land is sampled on a regular grid in Natural Earth projection space, every
 * dot is assigned to the country that contains it, and each layer is written
 * as ONE <path> of zero-length segments (round caps draw the dots). That keeps
 * the whole map to a few dozen DOM nodes and a few KB of gzipped HTML, with no
 * client JavaScript and no image request.
 *
 *   node scripts/build-world-map.mjs   → lib/world-map.generated.ts
 *
 * Inputs: lib/reach-counts.json (aggregated counts, no personal data) and the
 * Natural Earth 1:50m countries from world-atlas (public domain).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { geoNaturalEarth1, geoContains, geoBounds, geoCentroid, geoArea } from "d3-geo";
import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const topology = require("world-atlas/countries-50m.json");
const counts = JSON.parse(fs.readFileSync(path.resolve("lib/reach-counts.json"), "utf8"));
const OUT = path.resolve("lib/world-map.generated.ts");

/** Grid size in dots. 150 columns reads as a texture on a phone and stays light. */
const COLS = 150;
/** Cut off Antarctica and the empty far south. */
const MIN_LAT = -56;
const MAX_LAT = 84;

/** Names in our data → Natural Earth names. */
const ALIASES = {
  "United States": "United States of America",
  "Czech Republic": "Czechia",
  "Antigua and Barbuda": "Antigua and Barb.",
  Eswatini: "eSwatini",
  "Bosnia and Herzegovina": "Bosnia and Herz.",
  "North Macedonia": "Macedonia",
};

const countries = feature(topology, topology.objects.countries).features.filter((f) => f.properties.name !== "Antarctica");
const byName = new Map(countries.map((f) => [f.properties.name, f]));
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

const wanted = new Set([...Object.keys(counts.applicants), ...Object.keys(counts.members)].map((n) => ALIASES[n] ?? n));
for (const n of wanted) if (!byName.has(n)) throw new Error(`No Natural Earth country for "${n}" — add an alias.`);

// Small countries (Singapore, Mauritius, Luxembourg…) can fall between grid
// points; give each at least the dot nearest its centroid.
// The nearest cell that no other listed country already owns is used, so a
// tiny neighbour (Luxembourg) never takes the only dot of another (Belgium).
const owned = new Set(dots.values());
for (const n of [...wanted].sort()) {
  if (owned.has(n)) continue;
  const [px, py] = projection(geoCentroid(byName.get(n)));
  const cx = Math.floor(px);
  const cy = Math.floor(py);
  let cell = null;
  for (let r = 0; !cell && r < 4; r++) {
    for (let dy = -r; dy <= r && !cell; dy++) {
      for (let dx = -r; dx <= r && !cell; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const k = `${cx + dx},${cy + dy}`;
        if (!wanted.has(dots.get(k))) cell = k;
      }
    }
  }
  if (!cell) throw new Error(`No free cell near ${n}`);
  dots.set(cell, n);
  owned.add(n);
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

const groups = new Map();
for (const [k, n] of dots) {
  if (!groups.has(n)) groups.set(n, []);
  groups.get(n).push(k);
}

/** Deterministic shuffle (mulberry32 seeded by the name), so the map is stable between builds. */
function shuffled(list, seedText) {
  let seed = [...seedText].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 2166136261);
  const rand = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...list].sort();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Lit dots per country grow with the square root of the head count — one dot
 * for a single builder, a whole country for the largest communities — so the
 * map shows hotspots rather than a flat fill. The same shuffled order is used
 * for every layer, so a smaller layer lights a subset of a larger one.
 */
const litCount = (count, available) => Math.min(available, Math.max(1, Math.round(Math.sqrt(count) * 1.15)));

const land = toPath([...dots.keys()]);
const layers = {};
for (const layer of ["members", "applicants"]) {
  layers[layer] = {};
  for (const [original, count] of Object.entries(counts[layer]).sort(([a], [b]) => a.localeCompare(b))) {
    const n = ALIASES[original] ?? original;
    const own = shuffled(groups.get(n), n);
    layers[layer][original] = toPath(own.slice(0, litCount(count, own.length)));
  }
}
const countryDots = layers.members;

/** Centre of a country's largest polygon, so France is not pulled towards French Guiana. */
function mainCentroid(f) {
  if (f.geometry.type !== "MultiPolygon") return geoCentroid(f);
  const parts = f.geometry.coordinates.map((coordinates) => ({ type: "Polygon", coordinates }));
  return geoCentroid(parts.reduce((a, b) => (geoArea(b) > geoArea(a) ? b : a)));
}
const centroids = {};
for (const original of Object.keys(countryDots)) {
  const [x, y] = projection(mainCentroid(byName.get(ALIASES[original] ?? original)));
  centroids[original] = [+x.toFixed(1), +y.toFixed(1)];
}

const [tx, ty] = projection([22.27, 60.45]); // Turku

const src = `// Generated by scripts/build-world-map.mjs — do not edit by hand.
// Natural Earth 1:50m (public domain) sampled on a ${COLS} × ${ROWS} grid.

export const WORLD_MAP = {
  cols: ${COLS},
  rows: ${ROWS},
  /** Every land dot. */
  land: ${JSON.stringify(land)},
  /** Turku, the home of the flagship event, in grid units. */
  turku: [${tx.toFixed(2)}, ${ty.toFixed(2)}] as const,
  /** Lit dots per data layer and country (names as in lib/reach-counts.json). */
  layers: ${JSON.stringify(layers, null, 2)} as Record<"members" | "applicants", Record<string, string>>,
  /** Centre of each country's main landmass, in grid units. */
  centroids: ${JSON.stringify(centroids)} as Record<string, readonly [number, number]>,
} as const;
`;
fs.writeFileSync(OUT, src);
console.log(`${COLS}×${ROWS}, ${dots.size} land dots, ${Object.keys(layers.members).length} countries, ${(src.length / 1024).toFixed(1)} KB → ${path.relative(process.cwd(), OUT)}`);
