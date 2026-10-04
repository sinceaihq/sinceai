/**
 * streets.json — the street scene from the City of Turku registers and base
 * map (with OSM where the city has nothing): street-area polygons with their
 * surface material, kerb and path edges with surveyed heights, lamps, trees,
 * furniture, sign posts, stair flights, retaining walls, fences, crossings,
 * bus stops and spot heights. Duplicates between sources are merged (the city
 * register wins, OSM fills gaps).
 */
import {
  bearing,
  ccw,
  centroid,
  cleanRing,
  clipRingToRect,
  DATUM,
  distToSegment,
  nearestOnLine,
  pointInRing,
  r1,
  r2,
  ringArea,
} from "./geo.mjs";

const PART = {
  Ajorata: "carriageway",
  Jalkakäytävä: "footway",
  "Yhdistetty kevyen liikenteen väylä": "shared_path",
  Välikaista: "verge",
  Tonttiliittymä: "driveway",
  Silta: "bridge",
  Odotustila: "waiting",
  Pyöräkaista: "cycle_lane",
  Portaat: "steps",
  "Muu liikennealue": "other",
};
const SURFACE = {
  Asfalttibetoni: "asphalt",
  "Asfalttibetoni, punainen (AB 16, rautaoksidi FeO2)": "asphalt_red",
  Betonilaatta: "concrete_slab",
  Betonikivi: "concrete_pavers",
  Kenttäkivi: "fieldstone",
  Noppakivi: "setts",
  Nupukivi: "cobbles",
  Betoni: "concrete",
  Luonnonkivi: "natural_stone",
  Puu: "wood",
  Metalli: "metal",
  "Ei tietoa": "unknown",
};
const CLASS = {
  Pääkatu: "main",
  Kokoojakatu: "collector",
  Tonttikatu: "local",
  "Kevyen liikenteen raitti": "light_traffic",
  Pysäköintialue: "parking",
};
/** Kalevansilta's deck is not in the survey: SPEC §4.5 estimate. */
const KALEVANSILTA_DECK_Y = 4.3;

const GENUS_FI = {
  pihlaja: "Sorbus",
  lehmus: "Tilia",
  jalava: "Ulmus",
  vaahtera: "Acer",
  omenapuu: "Malus",
  tammi: "Quercus",
  saarni: "Fraxinus",
  kuusi: "Picea",
  mänty: "Pinus",
  kirsikkapuu: "Prunus",
  tuija: "Thuja",
  rauduskoivu: "Betula",
  koivu: "Betula",
  haapa: "Populus",
  tuomi: "Prunus",
  poppeli: "Populus",
  hevoskastanja: "Aesculus",
  sembramänty: "Pinus",
};
const CONIFERS = new Set(["Picea", "Pinus", "Thuja", "Abies", "Juniperus", "Taxus", "Pseudotsuga"]);
const SIZE_FI = { pieni: "small", keskikokoinen: "medium", suuri: "large" };

/** Plain-English meanings of the Finnish sign codes used around the campus. */
const SIGN_EN = {
  E1: "Pedestrian crossing",
  C38: "No parking",
  C37: "No stopping",
  C39: "No-parking zone",
  C40: "End of no-parking zone",
  "D3.1": "Keep right",
  "D3.3": "Pass either side",
  D6: "Shared path for cyclists and pedestrians",
  "D7.1": "Cycle path and footpath side by side",
  "D7.2": "Cycle path and footpath side by side",
  E2: "Parking",
  "E4.1": "Parking position",
  "E4.3": "Parking position",
  E6: "Bus stop",
  "E14.1": "One-way street",
  E20: "End of tunnel",
  "F46.1": "Parking",
  F47: "Railway station",
  B6: "Stop",
  C32: "Speed limit",
  C34: "Speed limit zone",
  C35: "End of speed limit zone",
  H12: "Disabled parking",
  H17: "Times of validity",
  H18: "Time limit",
  H19: "Parking disc required",
  H20: "Pay parking",
  "H23.1": "Two-way cycle path",
  "H23.2": "Two-way cycle path",
  H24: "Text panel",
  H25: "Text panel",
  T1: "Parking ticket machine",
};

const yN = (z) => r2(z - DATUM);

export function buildStreets({ street, osm, terrain, bounds, log }) {
  const inB = ([x, z]) => x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;

  // ── Kerb and path edges: chain the surveyed 2-point segments into lines.
  const segs = [];
  for (const e of street.edge_lines) {
    const z1 = parseFloat(e.z1);
    const z2 = parseFloat(e.z2);
    const surveyed = z1 > 1 && z2 > 1;
    const kind = e.type === "carriageway_edge" ? "kerb" : "path";
    const under = /sillan alla|tunne|alla/.test(e.name);
    const line = e.line;
    const n = line.length;
    const pts = line.map(([x, z], i) => {
      const t = n > 1 ? i / (n - 1) : 0;
      const yv = surveyed ? z1 + (z2 - z1) * t - DATUM : terrain.heightAt(x, z);
      return [r2(x), r2(yv), r2(z)];
    });
    const mid = line[Math.floor((n - 1) / 2)];
    if (!inB(mid)) continue;
    segs.push({ kind, under, surveyed, pts });
  }
  const edges = chainSegments(segs);

  // Nearest kerb (carriageway edge, not under a bridge) for lamps and signs.
  const kerbs = edges.filter((e) => e.kind === "kerb" && !e.under).map((e) => e.line.map(([x, , z]) => [x, z]));
  const nearestKerb = (p, maxD) => {
    let best = null;
    for (const line of kerbs) {
      const hit = nearestOnLine(p, line);
      if (hit.d <= maxD && (!best || hit.d < best.d)) best = hit;
    }
    return best
      ? { bearing: r1(bearing(best.point[0] - p[0], best.point[1] - p[1])), distance: r1(best.d) }
      : undefined;
  };

  // ── Street-area polygons.
  const areas = [];
  for (const a of street.street_area_polygons) {
    const clipped = clipRingToRect(a.poly, bounds);
    const poly = ccw(cleanRing(clipped, r2));
    if (poly.length < 3 || ringArea(poly) < 0.5) continue;
    const area = {
      street: a.street,
      part: PART[a.part] ?? "other",
      surface: SURFACE[a.material] ?? "unknown",
      class: CLASS[a.func_class] ?? "local",
      poly,
      ...(parseInt(a.renovated, 10) > 1900 ? { renovated: parseInt(a.renovated, 10) } : {}),
    };
    if (area.part === "bridge") {
      if (a.street.startsWith("Kalevansil")) {
        // Footbridge: no survey on the deck (the edges inside it are the streets below).
        area.deckY = KALEVANSILTA_DECK_Y;
      } else {
        // Road bridge: median of the surveyed edges on the deck (not those marked as under it).
        const ys = segs
          .filter((s) => s.surveyed && !s.under)
          .flatMap((s) => s.pts)
          .filter(([x, , z]) => pointInRing([x, z], poly))
          .map(([, yv]) => yv)
          .sort((p, q) => p - q);
        if (ys.length >= 3) area.deckY = ys[Math.floor(ys.length / 2)];
      }
    }
    areas.push(area);
  }
  // Bridge parts without survey points take their bridge's median deck level.
  for (const area of areas) {
    if (area.part !== "bridge" || Number.isFinite(area.deckY)) continue;
    const decks = areas
      .filter((o) => o.part === "bridge" && o.street === area.street && Number.isFinite(o.deckY))
      .map((o) => o.deckY)
      .sort((p, q) => p - q);
    area.deckY = decks.length ? decks[Math.floor(decks.length / 2)] : r2(terrain.heightAt(...centroid(area.poly)));
  }

  // ── Lamps: city register first, OSM-only poles where the city has none within 1.5 m.
  const lamps = [];
  const addLamp = (x, z, groundZ, source) => {
    const at = [r1(x), r1(z)];
    if (!inB(at)) return;
    if (lamps.some((l) => Math.hypot(l.at[0] - at[0], l.at[1] - at[1]) < 1.5)) return;
    const road = nearestKerb(at, 8);
    lamps.push({
      at,
      y: r2(Number.isFinite(groundZ) && groundZ > 1 ? groundZ - DATUM : terrain.heightAt(x, z)),
      // Street masts stand at most a footway and a cycle path behind the kerb (≈ 5–6 m on Tykistökatu).
      kind: road && road.distance <= 7 ? "street" : "path",
      ...(road ? { road } : {}),
      source,
    });
  };
  for (const l of street.light_poles) addLamp(l.x, l.z, l.ground_z, "turku");
  for (const l of street.light_poles_osm_only) addLamp(l.x, l.z, NaN, "osm");
  for (const [x, z] of osm.lamps) addLamp(x, z, NaN, "osm");

  // ── Trees: register > base map > OSM, attributes merged.
  const trees = [];
  const addTree = (t) => {
    const at = [r1(t.at[0]), r1(t.at[1])];
    if (!inB(at)) return;
    const twin = trees.find((o) => Math.hypot(o.at[0] - at[0], o.at[1] - at[1]) < 1.5);
    if (twin) {
      for (const k of ["genus", "species", "size", "crownR", "planted"])
        if (twin[k] === undefined && t[k] !== undefined) twin[k] = t[k];
      if (t.kind === "conifer" && !twin.genus) twin.kind = "conifer";
      return;
    }
    trees.push({ ...t, at });
  };
  for (const t of street.trees) {
    const register = t.src.includes("register");
    const latin = t.species ? t.species.split(/[ (']/)[0] : undefined;
    const genus = latin && /^[A-Z][a-z]+$/.test(latin) ? latin : undefined;
    const crown = t.crown_r_2022 > 0 && t.crown_r_2022 < 9 ? r1(t.crown_r_2022) : undefined;
    const planted = parseInt(t.planted, 10);
    addTree({
      at: [t.x, t.z],
      kind: (genus && CONIFERS.has(genus)) || t.src.includes("havupuu") ? "conifer" : "deciduous",
      ...(genus ? { genus } : {}),
      ...(register && t.species ? { species: t.species } : {}),
      ...(crown ? { crownR: crown, size: crown < 2.5 ? "small" : crown < 5 ? "medium" : "large" } : {}),
      ...(planted > 1800 ? { planted } : {}),
      source: register ? "register" : "basemap",
    });
  }
  const tb = osm.turkuBaseMap.trees;
  for (const row of tb.rows) {
    const [x, z, kind, sizeFi, genusFi] = row;
    const genus = GENUS_FI[genusFi];
    addTree({
      at: [x, z],
      kind: kind === "conifer" || (genus && CONIFERS.has(genus)) ? "conifer" : "deciduous",
      ...(genus ? { genus } : {}),
      ...(SIZE_FI[sizeFi] ? { size: SIZE_FI[sizeFi] } : {}),
      source: "basemap",
    });
  }
  for (const t of osm.treeDetails) {
    addTree({ at: [t.x, t.z], kind: t.leaf_type === "needleleaved" ? "conifer" : "deciduous", source: "osm" });
  }
  for (const [x, z] of osm.trees) addTree({ at: [x, z], kind: "deciduous", source: "osm" });

  // ── Furniture.
  const furniture = [];
  const addFurniture = (f) => {
    const at = [r1(f.at[0]), r1(f.at[1])];
    if (!inB(at)) return;
    if (furniture.some((o) => o.kind === f.kind && Math.hypot(o.at[0] - at[0], o.at[1] - at[1]) < 1.2)) return;
    furniture.push({ ...f, at });
  };
  const signsExtra = [];
  for (const f of street.furniture) {
    const a = f.attrs;
    const at = [f.x, f.z];
    if (f.layer === "GIS_Varusteet") {
      const kind =
        {
          Roskakori: "bin",
          Kiintopenkki: "bench",
          Tuhkakuppi: "ashtray",
          Opastuspyloni: "info_pylon",
          Kalusteryhma: "furniture_group",
          "Opastetaulu/tiedote": "info_board",
          Opasteviitta: "signpost",
        }[a.Varustelaji] ?? "other";
      addFurniture({ at, kind, ...(a.Malli && a.Malli !== "Ei tietoa" ? { note: a.Malli } : {}), source: "turku" });
    } else if (f.layer === "GIS_Skuutti_pysakointipaikka") {
      addFurniture({ at, kind: "scooter_bay", source: "turku" });
    } else if (f.layer === "GIS_Polkupyoraparkki") {
      const cap = parseInt(a.Pyorapaikkojen_lukumaara, 10);
      addFurniture({ at, kind: "bike_rack", ...(cap > 0 ? { capacity: cap } : {}), source: "turku" });
    } else if (f.layer === "GIS_Follariasemat") {
      const cap = parseInt(a.Pysakointipaikkojen_maara, 10);
      addFurniture({
        at,
        kind: "bike_share",
        name: "Föllärit",
        ...(cap > 0 ? { capacity: cap } : {}),
        source: "turku",
      });
    } else if (f.layer === "GIS_Polkupyoran_huoltopiste") {
      addFurniture({ at, kind: "bike_repair", source: "turku" });
    } else if (f.layer === "GIS_Liikennemerkit_invapaikat") {
      signsExtra.push({ x: f.x, z: f.z, sign: a.Varustelaji ?? "H12.7 Invalidin ajoneuvo" });
    } else if (f.layer === "OSM") {
      const kind =
        a.amenity === "bicycle_parking"
          ? "bike_rack"
          : a.amenity === "bench"
            ? "bench"
            : a.amenity === "waste_basket"
              ? "bin"
              : a.man_made === "flagpole"
                ? "flagpole"
                : a.barrier === "bollard"
                  ? "bollard"
                  : a.tourism === "artwork"
                    ? "artwork"
                    : a.amenity === "vending_machine"
                      ? "vending_machine"
                      : a.amenity === "bicycle_rental"
                        ? "bike_share"
                        : a.amenity === "bicycle_repair_station"
                          ? "bike_repair"
                          : a.tourism === "information"
                            ? "info_board"
                            : null;
      if (!kind || a.indoor === "yes") continue;
      const cap = parseInt(a.capacity, 10);
      addFurniture({
        at,
        kind,
        ...(a.name ? { name: a.name } : {}),
        ...(cap > 0 ? { capacity: cap } : {}),
        ...(a.covered === "yes" ? { covered: true } : {}),
        ...(a.artist_name
          ? { note: `${a.artist_name.replace(/;/g, " & ")}${a.start_date ? `, ${a.start_date}` : ""}` }
          : {}),
        source: "osm",
      });
    }
  }
  for (const [x, z] of osm.benches) addFurniture({ at: [x, z], kind: "bench", source: "osm" });
  for (const b of osm.bicycleParkingPoints) {
    const cap = parseInt(b.capacity, 10);
    addFurniture({
      at: [b.x, b.z],
      kind: "bike_rack",
      ...(cap > 0 ? { capacity: cap } : {}),
      ...(b.covered === "yes" ? { covered: true } : {}),
      source: "osm",
    });
  }
  for (const b of osm.barrierPoints) {
    if (b.barrier === "bollard" || b.barrier === "gate")
      addFurniture({ at: [b.x, b.z], kind: b.barrier, source: "osm" });
  }
  for (const o of osm.other) {
    const kind = { "man_made=flagpole": "flagpole", "tourism=artwork": "artwork", "amenity=waste_basket": "bin" }[
      o.kind
    ];
    if (kind) addFurniture({ at: [o.x, o.z], kind, ...(o.name ? { name: o.name } : {}), source: "osm" });
  }

  // Items under an overhang or in a bike hall (inside a building outline) are covered.
  const solids = osm.buildings.filter((b) => b.building !== "roof").map((b) => b.polygon);
  for (const f of furniture) {
    if (f.covered || solids.some((ring) => pointInRing(f.at, ring))) f.covered = true;
  }

  // ── Sign posts (plates at the same spot share a post).
  const signs = [];
  for (const s of [...street.traffic_signs, ...signsExtra]) {
    const at = [r1(s.x), r1(s.z)];
    if (!inB(at)) continue;
    const m = /^(\S+)\s+(.*)$/.exec(s.sign.trim());
    const code = m ? m[1] : s.sign;
    const name = m ? m[2] : s.sign;
    const base = code.replace(/_\d+$/, "");
    const en = SIGN_EN[base] ?? SIGN_EN[base.replace(/\.\d+$/, "")];
    const speed = /\((\d+)\s*km\/h\)/.exec(name);
    const plate = { code: base, name, ...(en ? { en: speed ? `${en} ${speed[1]} km/h` : en } : {}) };
    let post = signs.find((p) => Math.hypot(p.at[0] - at[0], p.at[1] - at[1]) < 0.3);
    if (!post) {
      post = { at, plates: [] };
      const road = nearestKerb(at, 8);
      if (road) post.road = road;
      signs.push(post);
    }
    if (!post.plates.some((p) => p.code === plate.code && p.name === plate.name)) post.plates.push(plate);
  }
  for (const post of signs) post.plates.sort((a, b) => Number(a.code.startsWith("H")) - Number(b.code.startsWith("H")));

  // ── Stair flights from the base map step edges.
  const stepLines = dedupeLines([
    ...street.structures.filter((s) => s.type === "porras").map((s) => s.line),
    ...osm.turkuBaseMap.steps.map((s) => s.line),
  ]).filter((l) => inB(l[0]));
  const stairs = clusterStairs(stepLines, terrain);

  // ── Retaining walls (top line with the DTM's top and foot), and fences.
  const wallLines = dedupeLines([
    ...street.structures.filter((s) => s.type === "tukimuurin yläreuna").map((s) => s.line),
    ...osm.turkuBaseMap.retainingWallTops.map((s) => s.line),
  ]);
  const walls = [];
  for (const line of wallLines) {
    if (!line.some(inB)) continue;
    walls.push(wallProfile(line, terrain, "turku"));
  }
  for (const b of osm.barriers) {
    if (b.barrier !== "retaining_wall" || !b.line.some(inB)) continue;
    if (isDuplicateLine(b.line, wallLines, 1.2)) continue;
    walls.push(wallProfile(b.line, terrain, "osm"));
  }

  const fences = [];
  const turkuFences = [];
  for (const f of osm.turkuBaseMap.walls_fences) {
    if (!f.line.some(inB)) continue;
    const material = { puu: "wood", kivi: "stone", metalli: "metal" }[f.materiaali];
    turkuFences.push(f.line);
    fences.push({
      kind: "fence",
      ...(material ? { material } : {}),
      line: f.line.map(([x, z]) => [r1(x), r1(z)]),
      source: "turku",
    });
  }
  for (const s of street.structures) {
    if (s.type !== "aita" || !s.line.some(inB)) continue;
    if (isDuplicateLine(s.line, turkuFences, 0.6)) continue;
    turkuFences.push(s.line);
    fences.push({ kind: "fence", line: s.line.map(([x, z]) => [r1(x), r1(z)]), source: "turku" });
  }
  for (const b of osm.barriers) {
    const kind = { fence: "fence", hedge: "hedge", wall: "wall", guard_rail: "guard_rail", railing: "railing" }[
      b.barrier
    ];
    if (!kind || !b.line.some(inB)) continue;
    if (isDuplicateLine(b.line, turkuFences, 1.2)) continue;
    const material =
      b.material === "wood"
        ? "wood"
        : b.material === "stone" || b.material === "brick"
          ? "stone"
          : b.material === "metal"
            ? "metal"
            : undefined;
    fences.push({
      kind,
      ...(material ? { material } : {}),
      line: b.line.map(([x, z]) => [r1(x), r1(z)]),
      source: "osm",
    });
  }

  // ── Crossings: OSM crossing ways, plus a kerb-to-kerb line at crossing nodes without a way.
  const crossings = [];
  const crossingWays = osm.paths.filter((p) => p.kind === "crossing");
  for (const w of crossingWays) {
    if (!w.centerline.some(inB)) continue;
    const node = osm.crossings.find((n) => nearestOnLine([n.x, n.z], w.centerline).d < 0.6);
    crossings.push({
      line: w.centerline.map(([x, z]) => [r1(x), r1(z)]),
      kind: crossingKind(node),
      ...(node?.island === "yes" ? { island: true } : {}),
      width: r1(w.length_m),
    });
  }
  const carriageways = osm.roads.filter((r) => !["construction", "service"].includes(r.highway));
  for (const n of osm.crossings) {
    const p = [n.x, n.z];
    if (!inB(p)) continue;
    if (crossingWays.some((w) => nearestOnLine(p, w.centerline).d < 2.5)) continue;
    let best = null;
    for (const r of carriageways) {
      const hit = nearestOnLine(p, r.centerline);
      if (hit.d < 2 && (!best || hit.d < best.hit.d)) best = { hit, r };
    }
    if (!best) continue;
    const a = best.r.centerline[best.hit.seg];
    const b = best.r.centerline[best.hit.seg + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const nz = (b[0] - a[0]) / len;
    const half = (best.r.widthEstimate ?? 7) / 2 + 0.5;
    crossings.push({
      line: [
        [r1(p[0] - nx * half), r1(p[1] - nz * half)],
        [r1(p[0] + nx * half), r1(p[1] + nz * half)],
      ],
      kind: crossingKind(n),
      ...(n.island === "yes" ? { island: true } : {}),
      width: r1(half * 2),
    });
  }

  // ── Bus stops and spot heights.
  const busStops = osm.busStops
    .filter((b) => inB([b.x, b.z]))
    .map((b) => ({
      at: [r1(b.x), r1(b.z)],
      name: b.name,
      ...(b.ref ? { ref: b.ref } : {}),
      ...(b.shelter === "yes" ? { shelter: true } : {}),
      ...(b.bench === "yes" ? { bench: true } : {}),
    }));
  const spotHeights = [];
  for (const [x, z, h] of [...street.spot_heights.map((s) => [s.x, s.z, s.z_n2000]), ...osm.turkuBaseMap.spotHeights]) {
    if (!inB([x, z])) continue;
    if (spotHeights.some(([px, , pz]) => Math.hypot(px - x, pz - z) < 0.5)) continue;
    spotHeights.push([r1(x), yN(h), r1(z)]);
  }

  log(
    `streets: ${areas.length} areas, ${edges.length} edges, ${lamps.length} lamps, ${trees.length} trees, ${furniture.length} furniture, ${signs.length} sign posts, ${stairs.length} stair flights, ${walls.length} walls, ${fences.length} fences, ${crossings.length} crossings, ${busStops.length} bus stops, ${spotHeights.length} spot heights`,
  );
  return {
    version: 1,
    source:
      "City of Turku street register (GIS:Katualueet), base map (kerbs and path edges with heights, stairs, retaining walls, fences, spot heights, trees), street furniture and tree registers, traffic signs, retrieved 4 Oct 2026; OpenStreetMap where the city data has no record",
    licence: "© Turun kaupunki, käyttölupa CC BY 4.0 · © OpenStreetMap contributors, ODbL 1.0",
    areas,
    edges,
    lamps,
    trees,
    furniture,
    signs,
    stairs,
    walls,
    fences,
    crossings,
    busStops,
    spotHeights,
  };
}

function crossingKind(node) {
  if (!node) return "zebra";
  if (node.crossing === "traffic_signals") return "signals";
  if (node.crossing === "unmarked" || node.markings === "no") return "unmarked";
  return "zebra";
}

/** Join 2-point survey segments that share end points into polylines (same kind / under / surveyed). */
function chainSegments(segs) {
  const key = (p) => `${p[0].toFixed(2)},${p[2].toFixed(2)}`;
  const groups = new Map();
  for (const s of segs) {
    const g = `${s.kind}|${s.under}|${s.surveyed}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(s);
  }
  const out = [];
  for (const list of groups.values()) {
    const ends = new Map();
    const used = new Uint8Array(list.length);
    list.forEach((s, i) => {
      for (const p of [s.pts[0], s.pts[s.pts.length - 1]]) {
        const k = key(p);
        if (!ends.has(k)) ends.set(k, []);
        ends.get(k).push(i);
      }
    });
    const take = (k, except) => (ends.get(k) ?? []).find((i) => i !== except && !used[i]);
    for (let i = 0; i < list.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      let line = [...list[i].pts];
      // Grow at the end…
      for (;;) {
        const endPt = line[line.length - 1];
        const j = take(key(endPt), -1);
        if (j === undefined) break;
        used[j] = 1;
        const pts = key(list[j].pts[0]) === key(endPt) ? list[j].pts : [...list[j].pts].reverse();
        line = [...line, ...pts.slice(1)];
      }
      // …then at the start.
      for (;;) {
        const startPt = line[0];
        const j = take(key(startPt), -1);
        if (j === undefined) break;
        used[j] = 1;
        const pts =
          key(list[j].pts[list[j].pts.length - 1]) === key(startPt) ? list[j].pts : [...list[j].pts].reverse();
        line = [...pts.slice(0, -1), ...line];
      }
      const s = list[i];
      out.push({
        kind: s.kind,
        ...(s.under ? { under: true } : {}),
        line: dedupeConsecutive(line),
        ...(s.surveyed ? {} : { surveyed: false }),
      });
    }
  }
  return out;
}

function dedupeConsecutive(line) {
  return line.filter((p, i) => i === 0 || p[0] !== line[i - 1][0] || p[2] !== line[i - 1][2]);
}

/** Drop lines that repeat another (same end points within 0.2 m, either direction). */
function dedupeLines(lines) {
  const out = [];
  for (const l of lines) {
    if (l.length < 2) continue;
    const a = l[0];
    const b = l[l.length - 1];
    const dup = out.some((o) => {
      const oa = o[0];
      const ob = o[o.length - 1];
      const same = Math.hypot(oa[0] - a[0], oa[1] - a[1]) < 0.2 && Math.hypot(ob[0] - b[0], ob[1] - b[1]) < 0.2;
      const rev = Math.hypot(oa[0] - b[0], oa[1] - b[1]) < 0.2 && Math.hypot(ob[0] - a[0], ob[1] - a[1]) < 0.2;
      return same || rev;
    });
    if (!dup) out.push(l);
  }
  return out;
}

/** True when ≥ 80 % of the line's sample points lie within `tol` of one of `others`. */
function isDuplicateLine(line, others, tol) {
  const samples = [];
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i];
    const [bx, bz] = line[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 1));
    for (let k = 0; k < n; k++) samples.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  samples.push(line[line.length - 1]);
  const near = samples.filter((p) => others.some((o) => nearestOnLine(p, o).d < tol)).length;
  return near / samples.length >= 0.8;
}

/** Group step edges into flights: near-parallel lines ≤ 0.8 m apart that overlap. */
function clusterStairs(lines, terrain) {
  const items = lines.map((l) => {
    const a = l[0];
    const b = l[l.length - 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const dir = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    return { line: l, a, b, len, dir, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
  });
  const parent = items.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const p = items[i];
      const q = items[j];
      const cos = Math.abs(p.dir[0] * q.dir[0] + p.dir[1] * q.dir[1]);
      if (cos < 0.95) continue;
      // Perpendicular gap between the lines and their overlap along the direction.
      const gap = distToSegment(q.mid, p.a, p.b);
      if (gap > 0.9) continue;
      const along = (pt) => (pt[0] - p.a[0]) * p.dir[0] + (pt[1] - p.a[1]) * p.dir[1];
      const lo = Math.min(along(q.a), along(q.b));
      const hi = Math.max(along(q.a), along(q.b));
      if (hi < -0.3 || lo > p.len + 0.3) continue;
      parent[find(i)] = find(j);
    }
  const groups = new Map();
  items.forEach((it, i) => {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(it);
  });
  const flights = [];
  for (const g of groups.values()) {
    // Frame: u along the steps, v across (the walking direction).
    const u = g.reduce(
      (s, it) => {
        const sign = it.dir[0] * g[0].dir[0] + it.dir[1] * g[0].dir[1] < 0 ? -1 : 1;
        return [s[0] + it.dir[0] * sign, s[1] + it.dir[1] * sign];
      },
      [0, 0],
    );
    const ul = Math.hypot(u[0], u[1]) || 1;
    u[0] /= ul;
    u[1] /= ul;
    const v = [-u[1], u[0]];
    const o = centroid(g.flatMap((it) => [it.a, it.b]));
    const pu = (p) => (p[0] - o[0]) * u[0] + (p[1] - o[1]) * u[1];
    const pv = (p) => (p[0] - o[0]) * v[0] + (p[1] - o[1]) * v[1];
    const pts = g.flatMap((it) => [it.a, it.b]);
    let u0 = Math.min(...pts.map(pu));
    let u1 = Math.max(...pts.map(pu));
    let v0 = Math.min(...pts.map(pv)) - 0.15;
    let v1 = Math.max(...pts.map(pv)) + 0.15;
    if (u1 - u0 < 0.5) {
      u0 -= 0.25;
      u1 += 0.25;
    }
    const at = (uu, vv) => [o[0] + u[0] * uu + v[0] * vv, o[1] + u[1] * uu + v[1] * vv];
    const um = (u0 + u1) / 2;
    // Ground beyond each end of the flight.
    const yA = terrain.heightAt(...at(um, v0 - 0.5));
    const yB = terrain.heightAt(...at(um, v1 + 0.5));
    const upV = yB >= yA ? 1 : -1;
    const outline = ccw([at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)].map(([x, z]) => [r1(x), r1(z)]));
    const steps = g.sort((p, q) => pv(p.mid) - pv(q.mid)).map((it) => it.line.map(([x, z]) => [r1(x), r1(z)]));
    const vb = [v[0] * upV, v[1] * upV];
    flights.push({
      steps,
      outline,
      yBottom: r2(Math.min(yA, yB)),
      yTop: r2(Math.max(yA, yB)),
      upBearing: r1(bearing(vb[0], vb[1])),
    });
  }
  return flights;
}

/** Retaining wall: top line from the higher side of the DTM, foot from the lower side. */
function wallProfile(line, terrain, source) {
  const pts = [];
  const base = [];
  for (let i = 0; i < line.length; i++) {
    const [x, z] = line[i];
    const a = line[Math.max(0, i - 1)];
    const b = line[Math.min(line.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const nz = (b[0] - a[0]) / len;
    const y1 = terrain.heightAt(x + nx * 1.0, z + nz * 1.0);
    const y2 = terrain.heightAt(x - nx * 1.0, z - nz * 1.0);
    const top = Math.max(y1, y2);
    const foot = Math.min(y1, y2);
    pts.push([r1(x), r2(Math.max(top, foot + 0.3)), r1(z)]);
    base.push(r2(foot));
  }
  return { kind: "retaining", line: pts, base, source };
}
