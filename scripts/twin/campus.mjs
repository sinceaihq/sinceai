/**
 * campus.json — the OSM layer of the twin (DESIGN §10 CampusData): buildings
 * with roles and measured heights, roads and paths, surface areas,
 * entrances (the event entrances placed per SPEC §3), merged tree and lamp
 * positions, railway and the outdoor route legs.
 */
import {
  ccw,
  centroid,
  cleanRing,
  clipLineToRect,
  clipRingToRect,
  DATUM,
  lineLength,
  nearestOnLine,
  r1,
  r2,
  ringArea,
} from "./geo.mjs";

/** OSM way → role (DESIGN §10). */
export const ROLE_BY_OSM = {
  w48381050: "biocity",
  w625297895: "joki",
  w731925812: "educity",
  w48381049: "electrocity",
  w9166259: "eurocity",
  w9166257: "pharmacity",
  w9033960: "datacity",
  w9166256: "ict-city",
  w1212603914: "parkcity",
  w1091291379: "civilcity",
  w81894007: "station",
};

/** Hero buildings whose LOD2 records the hero modules model. */
export const HERO_BY_OSM = { w48381050: "biocity", w625297895: "joki", w731925812: "educity" };

/** SPEC §3.4: buildings the LOD2 model misses or shows in an outdated state. */
const HEIGHT_OVERRIDES = {
  // Station North/East (2023): the LOD1 box predates completion → 12 storeys × 3.3 m.
  w1228228108: { levels: 12, height: 39.6, source: "estimate" },
};
/** Canopies (building=roof) are roofs on posts: a slab this thick, at least this far above the ground. */
const CANOPY_SLAB = 0.4;
const CANOPY_MIN_CLEARANCE = 2.2;

/** Normalised area kinds; null = administrative, not a surface (dropped). */
const AREA_KIND = {
  parking: "parking",
  parking_space: "parking_space",
  "landuse:grass": "grass",
  "natural:scrub": "scrub",
  bicycle_parking: "bicycle_parking",
  "leisure:playground": "playground",
  "area_highway:traffic_island": "traffic_island",
  "landuse:construction": "construction",
  pedestrian_area: "pedestrian",
  "natural:water": "water",
  platform: "platform",
  bridge: "bridge",
  "leisure:pitch": "pitch",
  "amenity:shelter": "shelter",
  "leisure:bleachers": "bleachers",
  "landuse:brownfield": "brownfield",
  "landuse:meadow": "meadow",
  "natural:wood": "wood",
  "natural:grassland": "grassland",
  "leisure:fitness_station": "fitness",
  "landuse:railway": "railway",
  "amenity:recycling": "recycling",
  "natural:shingle": "shingle",
  "landuse:flowerbed": "flowerbed",
  square_estimate: "square",
};

const ROAD_KINDS = new Set([
  "trunk",
  "secondary",
  "tertiary",
  "unclassified",
  "residential",
  "service",
  "living_street",
  "pedestrian",
  "footway",
  "cycleway",
  "path",
  "steps",
  "track",
]);

/** Default widths (m) for paths without a width tag. */
const PATH_WIDTH = { footway: 2.0, cycleway: 2.5, path: 1.5, steps: 2.0, pedestrian: 4.0, track: 3.0 };

/**
 * The event entrances, placed per SPEC §3.1.4, §3.2.3, §3.3.4 (CAD plans win
 * over OSM). `replaces` = OSM entrance nodes describing the same door.
 */
export const EVENT_ENTRANCES = [
  {
    id: "entrance-biocity-tykistokatu",
    kind: "main",
    name: "BioCity A · Tykistökatu 6",
    building: "w48381050",
    at: [-24.51, -11.75],
    y: 0.06,
    facing: 325,
    replaces: ["n11432405620"],
  },
  {
    id: "entrance-biocity-courtyard",
    kind: "event",
    name: "Sisäänkäynti Jussinaukiolta",
    building: "w48381050",
    at: [22.69, -8.01],
    y: 0.06,
    facing: 55,
    replaces: ["est-biocity-courtyard"],
  },
  {
    id: "entrance-educity-west",
    kind: "main",
    name: "EduCity west main entrance",
    building: "w731925812",
    at: [177.8, 115.1],
    y: 3.4,
    facing: 309,
    replaces: [],
  },
  {
    id: "entrance-educity-east",
    kind: "main",
    name: "EduCity east main entrance",
    building: "w731925812",
    at: [204.0, 136.5],
    y: 3.4,
    facing: 129,
    replaces: [],
  },
  {
    id: "entrance-educity-b",
    kind: "yes",
    name: "B",
    building: "w731925812",
    at: [237.3, 109.0],
    y: 3.4,
    facing: 129,
    replaces: ["n7884070178"],
  },
  {
    id: "entrance-educity-gateway",
    kind: "yes",
    name: "ICT-City gateway · step-free lifts",
    building: "w731925812",
    at: [196.9, 76.8],
    y: -1.55,
    facing: 309,
    replaces: ["n11167040749"],
  },
  {
    id: "entrance-joki-street",
    kind: "main",
    name: "Joki · Lemminkäisenkatu 12b",
    building: "w625297895",
    at: [8.58, 50.94],
    y: -1.7,
    facing: 219.5,
    replaces: ["n5904154030"],
  },
];

const num = (id) =>
  Number(
    String(id)
      .replace(/^[a-z]+/, "")
      .split("/")
      .pop()
      .replace(/^[a-z]+/, ""),
  );
const osmKey = (id) => `osm-${num(id)}`;
const tagNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
};
const yes = (v) => v === "yes" || v === true || v === "1";

/** Clean an outer ring: rounded, CCW from above, ≥ 3 points. */
const outer = (ring) => {
  const r = ccw(cleanRing(ring));
  return r.length >= 3 && ringArea(r) > 0.5 ? r : null;
};

export function buildCampus({
  osm,
  heights,
  outdoorLegs,
  terrain,
  dsm,
  bounds,
  trees,
  lamps,
  streetAreas,
  generated,
  log,
}) {
  const inBounds = ([x, z]) => x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;

  // ── LOD2 lookup per OSM way (for heights and the lod2 links).
  const lod2ByOsm = new Map();
  for (const rec of heights.buildings_all) {
    const m = rec.osm_match?.id?.match(/^way\/(\d+)$/);
    if (!m) continue;
    const key = `w${m[1]}`;
    if (!lod2ByOsm.has(key)) lod2ByOsm.set(key, []);
    lod2ByOsm.get(key).push(rec);
  }

  // ── Buildings.
  const buildings = [];
  for (const b of osm.buildings) {
    const polygon = outer(b.polygon);
    if (!polygon) continue;
    const c = centroid(polygon);
    if (!inBounds(c)) continue;
    const role = ROLE_BY_OSM[b.id] ?? "other";
    const override = HEIGHT_OVERRIDES[b.id];
    const recs = override
      ? []
      : (lod2ByOsm.get(b.id) ?? []).filter((r) => r.lod === "LOD2" || r.lod.startsWith("LOD1"));

    let groundY;
    let roofY;
    let topY;
    let heightSource;
    if (recs.length) {
      groundY = Math.min(...recs.map((r) => (r.ground_n2000?.min ?? NaN) - DATUM).filter(Number.isFinite));
      // Main roof: area-weighted median of the exposed flat roof levels of all records.
      const flat = recs
        .flatMap((r) => r.roof_levels.filter((l) => l.slope_deg < 3).map((l) => [l.zmax_n2000, l.area_m2]))
        .sort((a, b2) => a[0] - b2[0]);
      const total = flat.reduce((s, [, a]) => s + a, 0);
      let acc = 0;
      roofY = flat.length ? flat[flat.length - 1][0] : Math.max(...recs.map((r) => r.main_roof_n2000));
      for (const [zz, a] of flat) {
        acc += a;
        if (acc >= total / 2) {
          roofY = zz;
          break;
        }
      }
      roofY -= DATUM;
      topY = Math.max(...recs.map((r) => r.roof_max_n2000)) - DATUM;
      heightSource = recs.every((r) => r.lod.startsWith("LOD1")) ? "lod1" : "lod2";
    }
    if (!Number.isFinite(groundY)) {
      groundY = Math.min(...polygon.map(([x, z]) => terrain.heightAt(x, z)));
    }
    if (!recs.length && !override && b.id !== "w625297895" && dsm) {
      // No LOD2 record: measure the roof on the 2021 laser DSM (median inside the outline, 0.4 m in).
      const st = dsm.stats(polygon, 0.4);
      if (st) {
        if (b.building === "roof") {
          // A canopy, or a roof the DSM only sees past an overhang (then the lower decile is the canopy).
          const top = st.p50 - st.p10 > 5 ? st.p10 : st.p50;
          roofY = top - DATUM;
          topY = roofY;
          heightSource = "dsm";
        } else if (st.p50 - DATUM - groundY >= 2) {
          roofY = st.p50 - DATUM;
          topY = (st.p90 - st.p50 < 4 ? st.p90 : st.p50) - DATUM;
          heightSource = "dsm";
        }
        // Otherwise the DSM shows open ground: the building is newer than the April 2021 scan.
      }
    }
    if (b.id === "w625297895") {
      // Joki has no LOD2 record of its own: its hall (26.42) and tower (35.31) roofs sit in DataCity's (SPEC §3.4).
      roofY = 26.42 - DATUM;
      topY = 35.31 - DATUM;
      heightSource = "lod2";
    }
    const levels = override?.levels ?? b.levels ?? tagNum(recs[0]?.storeysAboveGround) ?? 1;
    if (!Number.isFinite(roofY)) {
      const tagH = tagNum(b.heightTag);
      const storey = /apartments|residential|hotel/.test(b.building) ? 3.2 : 3.6;
      const h = override?.height ?? tagH ?? Math.max(3, levels * storey + 0.6);
      roofY = groundY + h;
      topY = roofY;
      heightSource = override?.source ?? (tagH ? "osm" : "estimate");
    }

    const parts = (b.parts ?? [])
      .map((p) => {
        const ring = outer(p.polygon);
        if (!ring) return null;
        return {
          id: osmKey(p.id),
          osmId: num(p.id),
          ...(p.levels != null ? { levels: p.levels } : {}),
          ...(p.minLevel != null ? { minLevel: p.minLevel } : {}),
          ...(p.roofHeight != null ? { height: p.roofHeight } : {}),
          ...(p.minHeight ? { minHeight: r1(p.minHeight) } : {}),
          ...(p.colour ? { colour: p.colour } : {}),
          ...(p.material ? { material: p.material } : {}),
          polygon: ring,
        };
      })
      .filter(Boolean);

    // Canopies: a slab under the roof, open below.
    const canopy = b.building === "roof";
    const baseY = canopy ? Math.max(groundY + CANOPY_MIN_CLEARANCE, roofY - CANOPY_SLAB) : undefined;

    buildings.push({
      id: osmKey(b.id),
      osmId: num(b.id),
      ...(b.name ? { name: b.name } : b.addr ? { name: b.addr } : {}),
      role,
      levels,
      height: r1(roofY - groundY),
      ...(canopy ? { minHeight: r1(baseY - groundY) } : b.minHeight ? { minHeight: r1(b.minHeight) } : {}),
      polygon,
      ...(b.addr ? { addr: b.addr } : {}),
      use: b.building,
      groundY: r2(groundY),
      roofY: r2(roofY),
      topY: r2(Math.max(topY, roofY)),
      heightSource,
      ...(canopy ? { baseY: r2(baseY) } : {}),
      ...(recs.length ? { lod2: recs.map(lod2Id) } : {}),
      ...(b.colour ? { colour: b.colour } : {}),
      ...(b.material ? { material: b.material } : {}),
      ...(b.roofShape ? { roofShape: b.roofShape } : {}),
      ...(b.year && Number.isFinite(parseInt(b.year, 10)) ? { year: parseInt(b.year, 10) } : {}),
      ...(parts.length ? { parts } : {}),
    });
  }

  // ── Roads and paths.
  const crossingNodes = osm.crossings;
  const roads = [];
  const addWay = (w, kindIn, extra) => {
    let kind = kindIn;
    let link = false;
    if (kind.endsWith("_link")) {
      kind = kind.slice(0, -5);
      link = true;
    }
    if (!ROAD_KINDS.has(kind)) return;
    const tags = w.tags ?? w;
    if (yes(tags.indoor)) return;
    const pieces = clipLineToRect(w.centerline, bounds);
    pieces.forEach((piece, k) => {
      const centerline = piece
        .map(([x, z]) => [r1(x), r1(z)])
        .filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
      if (centerline.length < 2 || lineLength(centerline) < 1) return;
      const widthTag = tagNum(tags.width);
      const width = widthTag ?? (extra.width || PATH_WIDTH[kind] || 6);
      const road = {
        id: pieces.length > 1 ? `${osmKey(w.id)}-${k + 1}` : osmKey(w.id),
        ...(tags.name || w.name ? { name: tags.name ?? w.name } : {}),
        kind,
        width: r1(width),
        ...(extra.lanes ? { lanes: extra.lanes } : {}),
        ...(tags.oneway === "yes" || tags.oneway === "-1" ? { oneway: true } : {}),
        ...(tagNum(tags.layer) ? { layer: tagNum(tags.layer) } : {}),
        ...(yes(tags.bridge) ? { bridge: true } : {}),
        ...(yes(tags.tunnel) || tags.tunnel === "building_passage" ? { tunnel: true } : {}),
        centerline,
        ...(link ? { link: true } : {}),
        ...(tags.service ? { service: tags.service } : {}),
        ...(tags.surface ? { surface: tags.surface } : {}),
        ...(extra.footway ? { footway: extra.footway } : {}),
        ...(yes(tags.covered) ? { covered: true } : {}),
        ...(tags.lit === "yes" ? { lit: true } : {}),
        ...(tagNum(tags.maxspeed) ? { maxspeed: tagNum(tags.maxspeed) } : {}),
        ...(kind === "steps" && (tags.incline === "up" || tags.incline === "down") ? { incline: tags.incline } : {}),
        ...(kind === "steps" && tagNum(tags.step_count) ? { stepCount: tagNum(tags.step_count) } : {}),
        widthTagged: widthTag != null,
      };
      if (extra.footway === "crossing") {
        // Crossing type from the OSM crossing node on the way.
        const node = crossingNodes.find((n) => nearestOnLine([n.x, n.z], w.centerline).d < 0.6);
        const c2 = node?.crossing;
        const marks = node?.markings ?? "";
        road.crossing =
          c2 === "traffic_signals" ? "traffic_signals" : c2 === "unmarked" || marks === "no" ? "unmarked" : "zebra";
      }
      roads.push(road);
    });
  };
  for (const r of osm.roads) {
    if (r.highway === "construction") continue;
    addWay(r, r.highway, { width: r.widthEstimate, lanes: r.lanes ? Math.round(r.lanes) : undefined });
  }
  for (const p of osm.paths) {
    if (p.highway === "construction" || p.highway === "corridor" || yes(p.indoor)) continue;
    const footway = p.kind === "sidewalk" || p.kind === "crossing" ? p.kind : undefined;
    const width = p.kind === "crossing" ? 3 : undefined;
    addWay(p, p.highway, { footway, width });
  }

  // ── Areas.
  const areas = [];
  for (const a of osm.areas) {
    const kind = AREA_KIND[a.kind];
    if (!kind) continue;
    if (a.id.startsWith("r") && kind !== "pedestrian") continue; // multipolygon outer rings without their holes
    const clipped = clipRingToRect(a.polygon, bounds);
    const polygon = outer(clipped);
    if (!polygon || ringArea(polygon) < 1) continue;
    const area = {
      id: a.id.startsWith("est-") ? a.id : osmKey(a.id),
      kind,
      ...(a.name ? { name: a.name } : {}),
      polygon,
      ...(a.surface ? { surface: a.surface } : {}),
      ...(tagNum(a.layer) ? { layer: tagNum(a.layer) } : {}),
      ...(a.elevN2000 ? { y: r2(a.elevN2000 - DATUM) } : {}),
      ...(yes(a.covered) ? { covered: true } : {}),
      ...(tagNum(a.capacity) ? { capacity: tagNum(a.capacity) } : {}),
    };
    if (a.id === "est-jussin-aukio") area.name = "Jussin aukio (lower plaza)";
    areas.push(area);
  }
  // Road and foot bridges: their deck level from the street register (the terrain below is the railway cutting).
  for (const area of areas) {
    if (area.kind !== "bridge" || !area.name) continue;
    const decks = streetAreas
      .filter((s) => s.part === "bridge" && s.street === area.name && Number.isFinite(s.deckY))
      .map((s) => s.deckY)
      .sort((a, b) => a - b);
    if (decks.length) area.y = decks[Math.floor(decks.length / 2)];
  }
  // Jussin aukio's upper plaza / campus deck is OSM w1212594779 (layer 1): walking level from the DTM.
  const deck = areas.find((x) => x.id === "osm-1212594779");
  if (deck) deck.name = "Jussin aukio upper plaza and campus deck";

  // ── Entrances.
  const replaced = new Set(EVENT_ENTRANCES.flatMap((e) => e.replaces));
  const entrances = [];
  for (const e of EVENT_ENTRANCES) {
    entrances.push({
      id: e.id,
      kind: e.kind,
      name: e.name,
      building: osmKey(e.building),
      at: e.at,
      y: e.y,
      facing: e.facing,
      target: e.id,
      ...(e.replaces.find((r) => r.startsWith("n")) ? { osmId: num(e.replaces.find((r) => r.startsWith("n"))) } : {}),
    });
  }
  for (const e of osm.entrances) {
    if (replaced.has(e.id) || e.id.startsWith("est-")) continue;
    const at = [r1(e.x), r1(e.z)];
    if (!inBounds(at)) continue;
    const buildingId = e.buildingId ?? e.buildingIds?.[0];
    entrances.push({
      id: osmKey(e.id),
      kind: e.kind,
      ...(e.name ? { name: e.name } : e.ref ? { name: e.ref } : {}),
      ...(buildingId ? { building: osmKey(buildingId) } : {}),
      at,
      osmId: num(e.id),
      ...(e.access ? { access: e.access } : {}),
      ...(e.wheelchair ? { wheelchair: e.wheelchair } : {}),
      ...(e.door ? { door: e.door } : {}),
    });
  }

  // ── Railway (real lines only; the proposed tramway is left out).
  const railway = [];
  for (const r of osm.railway) {
    if (r.railway === "proposed" || r.railway === "construction") continue;
    for (const piece of clipLineToRect(r.line, bounds)) {
      railway.push({
        kind: r.railway,
        ...(r.name ? { name: r.name } : {}),
        line: piece.map(([x, z]) => [r1(x), r1(z)]),
      });
    }
  }

  // ── Outdoor route legs (2D) — routes.json has the heights and the indoor legs.
  const routes = {};
  for (const [id, pts] of Object.entries(outdoorLegs)) routes[id] = pts.map(([x, z]) => [r1(x), r1(z)]);

  const out = {
    version: 1,
    generated,
    attribution: "Map data © OpenStreetMap contributors, ODbL 1.0 · © Turun kaupunki, käyttölupa CC BY 4.0",
    origin: { lat: 60.44932, lon: 22.29326 },
    bounds: { minX: r2(bounds.minX), maxX: r2(bounds.maxX), minZ: r2(bounds.minZ), maxZ: r2(bounds.maxZ) },
    buildings,
    roads,
    areas,
    entrances,
    trees: trees.map((t) => t.at),
    lamps: lamps.map((l) => l.at),
    railway,
    routes,
  };
  log(
    `campus: ${buildings.length} buildings, ${roads.length} roads/paths, ${areas.length} areas, ${entrances.length} entrances, ${out.trees.length} trees, ${out.lamps.length} lamps, ${railway.length} rail lines, ${Object.keys(routes).length} route legs`,
  );
  return out;
}

/** lod2.json id of a heights.json record. */
export function lod2Id(rec) {
  return rec.prt ? `lod2-${rec.prt}` : `lod2-k${rec.citygml_index}`;
}
