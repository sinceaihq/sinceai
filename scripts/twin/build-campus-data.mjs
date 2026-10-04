#!/usr/bin/env node
/**
 * Builds the campus twin's runtime data from the research extracts:
 *
 *   public/assets/guide/3d/data/campus.json    OSM buildings (roles, measured heights), roads & paths,
 *                                              areas, entrances, trees, lamps, railway, outdoor route legs
 *   public/assets/guide/3d/data/lod2.json      City of Turku LOD2 massing of every building
 *   public/assets/guide/3d/data/streets.json   street areas, kerbs, lamps, trees, furniture, signs,
 *                                              stairs, walls, fences, crossings, bus stops, spot heights
 *   public/assets/guide/3d/data/routes.json    route legs with heights + the audience tours
 *   public/assets/guide/3d/terrain/dtm.png     0.5 m heightfield (16-bit grey) + dtm.json
 *
 * Usage:
 *   node scripts/twin/build-campus-data.mjs --src <research folder> [--out public/assets/guide/3d]
 *   (or set TWIN_RESEARCH_DIR)
 *
 * The research folder (from the 4 Oct 2026 site research) must contain:
 *   campus.json                                  OSM extract in the campus frame (+ turkuBaseMap)
 *   spec_routes.json                             route legs and tours (SPEC §6)
 *   turku/heights.json, turku/wfs/lod2_parsed.json   CityGML LOD2 summary + raw roof surfaces (EPSG:3877)
 *   turku/terrain_dtm2021_050m_uint16.png/.json, turku/terrain_dtm2021_050m_measuredmask.png
 *   turku/turku_dsm2021_local_025.npz             0.25 m laser surface model (roofs of buildings without LOD2)
 *   street/streetscape_geodata_local.json        City of Turku street register, base map, furniture, signs
 *   educity/educity_massing.json                 EduCity walkway and outdoor stairs
 *
 * Licences: OSM data © OpenStreetMap contributors (ODbL 1.0); City of Turku
 * data © Turun kaupunki, käyttölupa CC BY 4.0. Both credits ship with the
 * data (CampusData.attribution) and must stay visible in the UI.
 *
 * Deterministic: the same inputs give byte-identical outputs.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCampus, ROLE_BY_OSM } from "./campus.mjs";
import { buildLod2 } from "./lod2.mjs";
import { distToRingEdge, pointInRing } from "./geo.mjs";
import { readNpz } from "./npz.mjs";
import { buildRoutes } from "./routes.mjs";
import { buildStreets } from "./streets.mjs";
import { buildTerrain } from "./terrain.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const research = arg("src") ?? process.env.TWIN_RESEARCH_DIR;
if (!research || !fs.existsSync(path.join(research, "campus.json"))) {
  console.error("Usage: node scripts/twin/build-campus-data.mjs --src <research folder> (see the header)");
  process.exit(1);
}
const outBase = path.resolve(root, arg("out") ?? "public/assets/guide/3d");
const read = (p) => JSON.parse(fs.readFileSync(path.join(research, p), "utf8"));
const log = (msg) => console.log(msg);
const t0 = Date.now();

const osm = read("campus.json");
const heights = read("turku/heights.json");
const raw = read("turku/wfs/lod2_parsed.json");
const street = read("street/streetscape_geodata_local.json");
const specRoutes = read("spec_routes.json");
const educityMassing = read("educity/educity_massing.json");
const generated = osm.meta?.generated ?? "2026-10-04";

// 1. Terrain first: everything else samples it.
const terrain = buildTerrain({
  research,
  campusOsm: osm,
  heights,
  educityMassing,
  outDir: path.join(outBase, "terrain"),
  log,
});
const bounds = terrain.extent;

// 2. Street scene (trees and lamps feed campus.json too).
const streets = buildStreets({ street, osm, terrain, bounds, log });

// 3. Routes.
const { out: routes, outdoor2d } = buildRoutes({ specRoutes, osm, heights, streets, terrain, educityMassing, log });

// 4. Campus (OSM layer); the 2021 DSM measures roofs the LOD2 model lacks.
const dsmNpz = readNpz(path.join(research, "turku/turku_dsm2021_local_025.npz"));
const dsm = dsmSampler(dsmNpz);
const campus = buildCampus({
  osm,
  heights,
  outdoorLegs: outdoor2d,
  terrain,
  dsm,
  bounds,
  trees: streets.trees,
  lamps: streets.lamps,
  streetAreas: streets.areas,
  generated,
  log,
});

// 5. LOD2 massing (the station blocks' outdated LOD1 box is replaced by the OSM outline).
const lod2 = buildLod2({ heights, raw, campusOsm: osm, terrain, bounds, skipOsm: new Set(["w1228228108"]), log });

/** Percentiles of the DSM (N2000) inside a ring, `inset` metres in from its edges. */
function dsmSampler(npz) {
  const h = npz.h.data;
  const [rows, cols] = npz.h.shape;
  const xw = npz.xw.data[0];
  const zn = npz.zn.data[0];
  const res = npz.res.data[0];
  return {
    stats(ring, inset) {
      const xs = ring.map((p) => p[0]);
      const zs = ring.map((p) => p[1]);
      const i0 = Math.max(0, Math.floor((Math.min(...xs) - xw) / res));
      const i1 = Math.min(cols - 1, Math.ceil((Math.max(...xs) - xw) / res));
      const j0 = Math.max(0, Math.floor((Math.min(...zs) - zn) / res));
      const j1 = Math.min(rows - 1, Math.ceil((Math.max(...zs) - zn) / res));
      const v = [];
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const p = [xw + (i + 0.5) * res, zn + (j + 0.5) * res];
          if (!pointInRing(p, ring) || distToRingEdge(p, ring) < inset) continue;
          const val = h[j * cols + i];
          if (Number.isFinite(val)) v.push(val);
        }
      if (v.length < 4) return null;
      v.sort((a, b) => a - b);
      const q = (t) => v[Math.min(v.length - 1, Math.floor(t * v.length))];
      return { p10: q(0.1), p50: q(0.5), p90: q(0.9), n: v.length };
    },
  };
}

// Sanity checks that would break the twin.
const heroes = ["biocity", "joki", "educity"].map((r) => campus.buildings.find((b) => b.role === r));
if (heroes.some((b) => !b)) throw new Error("hero building missing");
for (const role of Object.values(ROLE_BY_OSM)) {
  if (!campus.buildings.some((b) => b.role === role)) log(`WARNING: no building with role ${role}`);
}

// Write.
const dataDir = path.join(outBase, "data");
fs.mkdirSync(dataDir, { recursive: true });
const files = { "campus.json": campus, "lod2.json": lod2, "streets.json": streets, "routes.json": routes };
let total = 0;
for (const [name, data] of Object.entries(files)) {
  const text = `${JSON.stringify(data)}\n`;
  fs.writeFileSync(path.join(dataDir, name), text);
  total += text.length;
  log(`wrote data/${name} ${(text.length / 1024).toFixed(0)} KB`);
}
log(`JSON total ${(total / 1024 / 1024).toFixed(2)} MB · done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
