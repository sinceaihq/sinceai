import type { BuildingId, V2, V3 } from "../types";

/**
 * Campus data for the twin — open geodata, prepared offline and fetched at
 * runtime (nothing here is bundled with the page).
 *
 *   Map data © OpenStreetMap contributors, ODbL 1.0 · © Turun kaupunki, käyttölupa CC BY 4.0
 *
 * (OSM: buildings, paths, areas, entrances. City of Turku: CityGML LOD2 roofs,
 * 2021 laser-scanning DTM, base map, street and tree registers.) Both credits
 * must stay visible in the UI — `DATA_ATTRIBUTION` below.
 *
 * Files in public/assets/guide/3d/:
 *   data/campus.json   buildings, roads & paths, areas, entrances, trees, lamps, railway, outdoor route legs
 *   data/lod2.json     LOD2 roof parts of every building — massing for the context ring
 *   data/streets.json  street areas + surface materials, kerbs with heights, lamps, trees, furniture, signs,
 *                      stairs, walls, fences, crossings, bus stops, spot heights
 *   data/routes.json   walking route legs (outdoor + indoor, with heights) and the audience tours
 *   terrain/dtm.png    0.5 m bare-earth heightfield, 16-bit grey (terrain/dtm.json = metadata)
 *
 * Regenerate after a source change (writes all of the above):
 *   node scripts/twin/build-campus-data.mjs --src <research folder>
 * The research folder holds the extracts named in the script header
 * (campus.json, spec_routes.json, turku/, street/, educity/).
 *
 * Frame (types.ts): metres; origin BioCity's OSM centroid (60.44932 N,
 * 22.29326 E); +x east, +z south, +y up; y = h(N2000) − 23.20 (Tykistökatu
 * sidewalk at BioCity's entrance = 0). Coordinates are rounded to 0.1 m
 * (0.01 m for heights, route points and the City's street polygons and
 * kerbs). Rings are counter-clockwise seen from above (+y) — their shoelace
 * sum over (x, z) is negative — and never repeat the first point; holes run
 * the other way.
 */

export const DATA_ATTRIBUTION =
  "Map data © OpenStreetMap contributors, ODbL 1.0 · © Turun kaupunki, käyttölupa CC BY 4.0";

/** Where the generated files are served from. */
export const TWIN_ASSET_BASE = "/assets/guide/3d";

/** Bumped by the build script when a file format changes; loaders reject other versions. */
export const CAMPUS_DATA_VERSION = 1;

// ── campus.json (DESIGN §10) ─────────────────────────────────────────────────

export type BuildingRole =
  | "biocity"
  | "joki"
  | "educity"
  | "electrocity"
  | "eurocity"
  | "pharmacity"
  | "datacity"
  | "ict-city"
  | "parkcity"
  | "civilcity"
  | "station"
  | "other";

export interface CampusBuildingPart {
  id: string;
  osmId: number;
  levels?: number;
  /** building:min_level — the part starts above this many storeys (arcades, overhangs). */
  minLevel?: number;
  height?: number;
  minHeight?: number;
  colour?: string;
  material?: string;
  polygon: V2[];
}

export interface CampusBuilding {
  id: string; // "osm-48381050"
  osmId: number;
  name?: string; // "Biocity", "Joukahaisenkatu 7" …
  role?: BuildingRole;
  levels: number;
  /** Main roof above `groundY` (m): the City's LOD2/LOD1 model, else the 2021 laser DSM, an OSM tag or a storey estimate. */
  height: number;
  minHeight?: number;
  /** Outer ring, counter-clockwise seen from above (+y), no repeated last point. */
  polygon: V2[];
  holes?: V2[][];
  // — optional extras —
  addr?: string;
  /** OSM building=* value ("commercial", "apartments", "train_station" …). */
  use?: string;
  /** Lowest ground along the footprint (y). Walls start here (minus a little to bury the base). */
  groundY?: number;
  /** Main roof (y) = groundY + height. */
  roofY?: number;
  /** Highest point (y): plant rooms, vaults, chimneys. */
  topY?: number;
  /** Where `height` comes from: City LOD2/LOD1 model, the 2021 laser DSM, an OSM tag, or a storey estimate. */
  heightSource?: "lod2" | "lod1" | "dsm" | "osm" | "estimate";
  /** Bottom of the massing (y) when it is not the ground — canopies (use "roof") are slabs on posts. */
  baseY?: number;
  /**
   * lod2.json records that model this building. The context ring builds those
   * instead of extruding this outline; a building without records is extruded
   * from `groundY` to `roofY`.
   */
  lod2?: string[];
  colour?: string;
  material?: string;
  roofShape?: string;
  year?: number;
  /** OSM building:part ways inside the outline (glass corner tower, arcades, the Joki tower). */
  parts?: CampusBuildingPart[];
}

export type CampusRoadKind =
  | "trunk"
  | "secondary"
  | "tertiary"
  | "unclassified"
  | "residential"
  | "service"
  | "living_street"
  | "pedestrian"
  | "footway"
  | "cycleway"
  | "path"
  | "steps"
  | "track";

/**
 * An OSM road or path. Where streets.json has the City's street-area polygons
 * and kerb lines, build the surfaces from those: OSM centrelines can sit
 * metres off the kerbs (Tykistökatu at BioCity: 2.8–6.4 m, SPEC §4.1) and
 * width tags are rough.
 */
export interface CampusRoad {
  id: string; // "osm-4068497"
  name?: string;
  kind: CampusRoadKind;
  /** Carriageway or path width (m) — tag, lanes × lane width, or a default per kind. */
  width: number;
  lanes?: number;
  oneway?: boolean;
  layer?: number;
  bridge?: boolean;
  tunnel?: boolean;
  centerline: V2[];
  // — optional extras —
  /** highway=*_link (e.g. trunk_link). */
  link?: boolean;
  /** service=* (driveway, parking_aisle …). */
  service?: string;
  surface?: string;
  /** footway=* for footways: "sidewalk" or "crossing". */
  footway?: "sidewalk" | "crossing";
  /** Crossing type for crossing ways: "zebra", "traffic_signals", "unmarked". */
  crossing?: "zebra" | "traffic_signals" | "unmarked";
  covered?: boolean;
  lit?: boolean;
  maxspeed?: number;
  /** Steps: OSM incline relative to the way direction, and the step count when tagged. */
  incline?: "up" | "down";
  stepCount?: number;
  /** Width from a width=* tag (true) or estimated (false). */
  widthTagged?: boolean;
}

export interface CampusArea {
  id: string;
  /**
   * Normalised kind: parking, parking_space, grass, grassland, meadow, scrub, wood, flowerbed,
   * pedestrian, square, platform, bridge, traffic_island, playground, pitch, water, construction,
   * brownfield, railway, bicycle_parking, shelter, bleachers, fitness, recycling, shingle.
   * (Administrative areas — campus, landuse, city blocks, parks without their holes — are left out.)
   */
  kind: string;
  name?: string;
  polygon: V2[];
  // — optional extras —
  surface?: string;
  layer?: number;
  /** Known walking level (y) where the DTM is not the surface: bridge decks, the estimated lower Jussin aukio. */
  y?: number;
  covered?: boolean;
  capacity?: number;
}

export interface CampusEntrance {
  id: string; // "osm-11432405620" or a twin target id ("entrance-biocity-tykistokatu")
  /** OSM entrance=* value ("main", "yes", "service" …), "event" for the builders' entrance. */
  kind: string;
  name?: string;
  /** CampusBuilding id. */
  building?: string;
  at: V2;
  // — optional extras —
  /** Threshold level (y). */
  y?: number;
  /** Compass bearing the door faces (outwards), degrees. */
  facing?: number;
  /** Twin target id (lib/hackathon-2026/twin.ts) for the event entrances. */
  target?: string;
  osmId?: number;
  access?: string;
  wheelchair?: string;
  door?: string;
}

export interface CampusData {
  version: number;
  generated: string;
  attribution: string;
  origin: { lat: number; lon: number };
  /** Extent of the data and of the terrain (outer pixel edges of dtm.png). */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  buildings: CampusBuilding[];
  roads: CampusRoad[];
  areas: CampusArea[];
  entrances: CampusEntrance[];
  /** Every tree (register, base map and OSM merged) — streets.json `trees` has species and size. */
  trees: V2[];
  /** Every street/path lamp (base map and OSM merged) — streets.json `lamps` has details. */
  lamps: V2[];
  railway: { kind: string; name?: string; line: V2[] }[];
  /** Outdoor arrival routes (walking polylines), keyed by tour leg id. routes.json has heights and indoor legs. */
  routes: Record<string, V2[]>;
}

// ── lod2.json ────────────────────────────────────────────────────────────────

export interface Lod2Roof {
  /** Roof part outline (CCW from above). Parts of one building do not overlap, except sloped faces. */
  ring: V2[];
  /** Flat part: roof level (y). */
  y?: number;
  /** Sloped (planar) face: y of every ring vertex, same order and length as `ring`. */
  ys?: number[];
  /** A hero module models this part; the context ring skips it (Joki inside DataCity's record). */
  claimedBy?: BuildingId;
}

export interface Lod2Building {
  id: string; // "lod2-103454370R" (permanent building id) or "lod2-k46"
  prt?: string;
  address?: string;
  year?: number;
  storeys?: number;
  lod: 1 | 2;
  osmId?: number;
  role?: BuildingRole;
  name?: string;
  /** A hero module models the whole record (BioCity, EduCity) — the context ring skips it. */
  claimedBy?: BuildingId;
  /** Lowest terrain contact (y). */
  groundY: number;
  /** Bottom of the massing: groundY − 0.3 (SPEC §3.4), or a raised base (the station on its bridge). */
  baseY: number;
  /** Main roof (area-weighted) and highest point (y). */
  roofY: number;
  topY: number;
  footprint: V2[][];
  roofs: Lod2Roof[];
}

export interface Lod2Data {
  version: number;
  source: string;
  licence: string;
  buildings: Lod2Building[];
}

// ── streets.json ─────────────────────────────────────────────────────────────

export type StreetPart =
  | "carriageway"
  | "footway"
  | "shared_path"
  | "verge"
  | "driveway"
  | "bridge"
  | "waiting"
  | "cycle_lane"
  | "steps"
  | "other";

export type StreetSurface =
  | "asphalt"
  | "asphalt_red"
  | "concrete_slab"
  | "concrete_pavers"
  | "fieldstone"
  | "setts"
  | "cobbles"
  | "concrete"
  | "natural_stone"
  | "wood"
  | "metal"
  | "unknown";

export interface StreetArea {
  street: string;
  part: StreetPart;
  surface: StreetSurface;
  /** Street class from the register: main, collector, local, light_traffic, parking. */
  class: string;
  poly: V2[];
  /** Year of the last renovation, when known. */
  renovated?: number;
  /** Bridge decks: walking level (y). The terrain below is not the surface. */
  deckY?: number;
}

export interface StreetEdge {
  /** kerb = carriageway edge; path = footway/cycleway edge. */
  kind: "kerb" | "path";
  /** Under a bridge or in a tunnel. */
  under?: boolean;
  /** [x, y, z]; y = surveyed edge height, or the terrain where the survey has none (`surveyed: false`). */
  line: V3[];
  surveyed?: false;
}

export interface StreetLamp {
  at: V2;
  /** Ground level at the pole (y). */
  y: number;
  /** street = within 7 m of a kerb (≈ 10 m mast with an arm over the road), path = park/path light (≈ 4–5 m). */
  kind: "street" | "path";
  /** Compass bearing and distance (m) to the nearest kerb — the arm points that way. */
  road?: { bearing: number; distance: number };
  source: "turku" | "osm";
}

export interface StreetTree {
  at: V2;
  kind: "deciduous" | "conifer";
  /** Latin genus ("Tilia", "Sorbus" …) when known. */
  genus?: string;
  /** Full species name from the tree register. */
  species?: string;
  size?: "small" | "medium" | "large";
  /** Crown radius (m) measured on the 2022 summer orthophoto (rough). */
  crownR?: number;
  planted?: number;
  source: "register" | "basemap" | "osm";
}

export type FurnitureKind =
  | "bench"
  | "bin"
  | "bike_rack"
  | "bike_share"
  | "scooter_bay"
  | "ashtray"
  | "info_pylon"
  | "info_board"
  | "signpost"
  | "flagpole"
  | "bollard"
  | "gate"
  | "artwork"
  | "vending_machine"
  | "bike_repair"
  | "parking_machine"
  | "furniture_group"
  | "other";

export interface StreetFurniture {
  at: V2;
  kind: FurnitureKind;
  name?: string;
  /** Bike racks / share stations: number of places. */
  capacity?: number;
  /** Free-text detail (model, artist …). */
  note?: string;
  /** Under a roof: a bike hall, an arcade or the EduCity link bridges. */
  covered?: true;
  source: "turku" | "osm";
}

export interface SignPlate {
  /** Finnish traffic sign code ("E1", "C38", "H23.2"); H = additional panel under the main sign. */
  code: string;
  /** Finnish name from the register ("Suojatie"). */
  name: string;
  /** Plain English meaning for the common codes. */
  en?: string;
}

/** One sign post: the plates registered at the same spot, main signs first. */
export interface StreetSign {
  at: V2;
  plates: SignPlate[];
  /** Compass bearing and distance (m) to the nearest kerb — face the plates to the carriageway. */
  road?: { bearing: number; distance: number };
}

export interface StreetStairs {
  /** Step edges (nosing lines) of one flight. */
  steps: V2[][];
  /** Oriented outline of the flight. */
  outline: V2[];
  /** Bottom and top levels (y) from the DTM, and the compass bearing pointing up the flight. */
  yBottom: number;
  yTop: number;
  upBearing: number;
}

export interface StreetWall {
  kind: "retaining" | "wall";
  /** Top line [x, yTop, z]. */
  line: V3[];
  /** Ground at the foot (y) per vertex. */
  base: number[];
  material?: "stone" | "concrete" | "metal" | "wood";
  source: "turku" | "osm";
}

export interface StreetFence {
  kind: "fence" | "hedge" | "railing" | "guard_rail" | "wall";
  material?: "wood" | "stone" | "metal";
  line: V2[];
  source: "turku" | "osm";
}

export interface StreetCrossing {
  /** Kerb-to-kerb line of the crossing. */
  line: V2[];
  kind: "zebra" | "signals" | "unmarked";
  island?: boolean;
  /** Carriageway width crossed (m). */
  width?: number;
}

export interface BusStop {
  at: V2;
  name: string;
  ref?: string;
  shelter?: boolean;
  bench?: boolean;
}

export interface StreetsData {
  version: number;
  source: string;
  licence: string;
  areas: StreetArea[];
  edges: StreetEdge[];
  lamps: StreetLamp[];
  trees: StreetTree[];
  furniture: StreetFurniture[];
  signs: StreetSign[];
  stairs: StreetStairs[];
  walls: StreetWall[];
  fences: StreetFence[];
  crossings: StreetCrossing[];
  busStops: BusStop[];
  /** Surveyed spot heights [x, y, z]. */
  spotHeights: V3[];
}

// ── routes.json ──────────────────────────────────────────────────────────────

export interface RouteLeg {
  id: string;
  title: string;
  /** outdoor = follows the walkable surface (terrain, decks, bridges); indoor = explicit floor levels. */
  mode: "outdoor" | "indoor";
  lengthM: number;
  /** length / walking speed, no stair or traffic-light penalty. */
  minutes: number;
  /** Stair flights on the way (outdoor legs). */
  stepFlights?: number;
  /**
   * [x, y, z], y = walking surface (no eye height). Outdoor legs are densified to ≤ 2 m and y comes
   * from the terrain or a known structure (deck, bridge, platform, stairs) — the engine may refine it by
   * raycasting onto the modelled surfaces. Building modules may provide their own version of an indoor
   * leg (WorldModule.routeLegs) — theirs wins.
   */
  points: V3[];
  /** Generated as the reverse of another leg. */
  reverseOf?: string;
  source: string;
}

export interface RouteTour {
  id: string;
  audience: string;
  when: string;
  legs: string[];
  to: string;
  distanceM: number;
  minutes: number;
  summary: string;
}

export interface RoutesData {
  version: number;
  /** Walking speed used for the times (m/s). */
  walkSpeed: number;
  legs: Record<string, RouteLeg>;
  tours: RouteTour[];
}

// ── terrain ──────────────────────────────────────────────────────────────────

/** terrain/dtm.json */
export interface TerrainMeta {
  version: number;
  file: string;
  width: number;
  height: number;
  /** Metres per sample. */
  resolution: number;
  /** Outer edges of the grid; sample (i, j) sits at x = minX + (i + ½)·res, z = minZ + (j + ½)·res. */
  extent: { minX: number; maxX: number; minZ: number; maxZ: number };
  /** y = value · scale + offset (value = 16-bit sample, big-endian in the PNG). */
  scale: number;
  offset: number;
  minY: number;
  maxY: number;
  source: string;
  licence: string;
}

export interface Terrain {
  /** Ground height (y) at (x, z), bilinear between samples, clamped at the edges. */
  heightAt(x: number, z: number): number;
  /** Unit surface normal [x, y, z] at (x, z). */
  normalAt(x: number, z: number): V3;
  extent: { minX: number; maxX: number; minZ: number; maxZ: number };
  resolution: number;
  /** Grid size (samples). */
  width: number;
  height: number;
  /** y per sample, row-major from north (minZ) to south, west to east. */
  heights: Float32Array;
  minY: number;
  maxY: number;
}

/** A terrain over a decoded height grid (exported for tests and offline tools). */
export function createTerrain(meta: TerrainMeta, values: ArrayLike<number>): Terrain {
  const { width: w, height: h, resolution: res } = meta;
  if (values.length !== w * h) throw new Error(`Terrain: expected ${w * h} samples, got ${values.length}`);
  const heights = new Float32Array(w * h);
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < heights.length; i++) {
    const y = values[i] * meta.scale + meta.offset;
    heights[i] = y;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const { minX, minZ } = meta.extent;
  const inv = 1 / res;

  const heightAt = (x: number, z: number): number => {
    // Continuous sample coordinates (sample centres at integers).
    let u = (x - minX) * inv - 0.5;
    let v = (z - minZ) * inv - 0.5;
    if (!(u > 0))
      u = 0; // also catches NaN
    else if (u > w - 1) u = w - 1;
    if (!(v > 0)) v = 0;
    else if (v > h - 1) v = h - 1;
    const i0 = Math.min(Math.floor(u), w - 2);
    const j0 = Math.min(Math.floor(v), h - 2);
    const fu = u - i0;
    const fv = v - j0;
    const k = j0 * w + i0;
    const a = heights[k];
    const b = heights[k + 1];
    const c = heights[k + w];
    const d = heights[k + w + 1];
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
  };

  const normalAt = (x: number, z: number): V3 => {
    const e = res;
    const dx = heightAt(x + e, z) - heightAt(x - e, z);
    const dz = heightAt(x, z + e) - heightAt(x, z - e);
    // Normal of y = f(x, z): (−∂f/∂x, 1, −∂f/∂z), scaled by 2e.
    const nx = -dx;
    const ny = 2 * e;
    const nz = -dz;
    const len = Math.hypot(nx, ny, nz);
    return [nx / len, ny / len, nz / len];
  };

  return { heightAt, normalAt, extent: { ...meta.extent }, resolution: res, width: w, height: h, heights, minY, maxY };
}

// ── PNG (16-bit grey) and zlib ───────────────────────────────────────────────

export interface DecodedPng {
  width: number;
  height: number;
  bitDepth: number;
  /** Channels per pixel (1 grey, 2 grey+alpha, 3 RGB, 4 RGBA). */
  channels: number;
  /** Samples, row-major, channels interleaved; 16-bit samples are already combined. */
  data: Uint8Array | Uint16Array;
}

type Inflate = (zlib: Uint8Array, expectedSize: number) => Promise<Uint8Array> | Uint8Array;

/**
 * Decode a non-interlaced PNG (grey, grey+alpha, RGB, RGBA; 8 or 16 bit).
 * Our own decoder, not a canvas: a canvas would round 16-bit samples to 8
 * bits and may colour-manage them.
 */
export async function decodePng(png: Uint8Array, inflate: Inflate = inflateBrowser): Promise<DecodedPng> {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i++) if (png[i] !== sig[i]) throw new Error("Not a PNG file");
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Uint8Array[] = [];
  while (pos + 8 <= png.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(png[pos + 4], png[pos + 5], png[pos + 6], png[pos + 7]);
    const body = png.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = view.getUint32(pos + 8);
      height = view.getUint32(pos + 12);
      bitDepth = body[8];
      colorType = body[9];
      if (body[12] !== 0) throw new Error("Interlaced PNGs are not supported");
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + len;
  }
  const channels = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[colorType];
  if (!width || !height || !channels || (bitDepth !== 8 && bitDepth !== 16)) {
    throw new Error(`Unsupported PNG (colour type ${colorType}, ${bitDepth} bit)`);
  }
  const zlib = concat(idat);
  const bpp = (channels * bitDepth) / 8;
  const stride = width * bpp;
  const raw = await inflate(zlib, height * (stride + 1));
  if (raw.length < height * (stride + 1)) throw new Error("PNG image data is truncated");

  // Undo the per-row filters in place, into `pixels`.
  const pixels = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const up = dst - stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? pixels[dst + x - bpp] : 0;
      const b = y > 0 ? pixels[up + x] : 0;
      const c = x >= bpp && y > 0 ? pixels[up + x - bpp] : 0;
      let v = raw[src + x];
      switch (filter) {
        case 0:
          break;
        case 1:
          v += a;
          break;
        case 2:
          v += b;
          break;
        case 3:
          v += (a + b) >> 1;
          break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default:
          throw new Error(`Bad PNG filter ${filter}`);
      }
      pixels[dst + x] = v & 255;
    }
  }
  if (bitDepth === 8) return { width, height, bitDepth, channels, data: pixels };
  const data = new Uint16Array(width * height * channels);
  for (let i = 0; i < data.length; i++) data[i] = (pixels[2 * i] << 8) | pixels[2 * i + 1];
  return { width, height, bitDepth, channels, data };
}

function concat(parts: Uint8Array[]): Uint8Array {
  if (parts.length === 1) return parts[0];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** zlib inflate: the browser's DecompressionStream, else the small decoder below (Safari < 16.4). */
async function inflateBrowser(zlib: Uint8Array, expectedSize: number): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "undefined" && typeof Response !== "undefined") {
    try {
      const stream = new Blob([zlib.slice()]).stream().pipeThrough(new DecompressionStream("deflate"));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch {
      // Fall through to the JS decoder.
    }
  }
  return inflateZlib(zlib, expectedSize);
}

// Static tables for DEFLATE (RFC 1951 §3.2.5).
const LEN_BASE = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258,
];
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577,
];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const CL_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

interface Huffman {
  counts: Uint16Array;
  symbols: Uint16Array;
}

function huffman(lengths: ArrayLike<number>, n: number): Huffman {
  const counts = new Uint16Array(16);
  for (let i = 0; i < n; i++) counts[lengths[i]]++;
  counts[0] = 0;
  const offs = new Uint16Array(16);
  for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + counts[i - 1];
  const symbols = new Uint16Array(n);
  for (let i = 0; i < n; i++) if (lengths[i]) symbols[offs[lengths[i]]++] = i;
  return { counts, symbols };
}

let fixedLit: Huffman | null = null;
let fixedDist: Huffman | null = null;

/**
 * zlib (RFC 1950) inflate in plain JS — canonical-Huffman decoding after
 * Mark Adler's "puff". Used where DecompressionStream is missing; also lets
 * unit tests decode without browser APIs.
 */
export function inflateZlib(input: Uint8Array, expectedSize = input.length * 4): Uint8Array {
  if ((input[0] & 0x0f) !== 8 || ((input[0] << 8) | input[1]) % 31 !== 0) throw new Error("Not a zlib stream");
  let pos = 2;
  let bitBuf = 0;
  let bitCnt = 0;
  let out = new Uint8Array(Math.max(expectedSize, 1024));
  let outLen = 0;

  const bits = (need: number): number => {
    let v = bitBuf;
    while (bitCnt < need) {
      if (pos >= input.length) throw new Error("zlib stream is truncated");
      v |= input[pos++] << bitCnt;
      bitCnt += 8;
    }
    bitBuf = v >>> need;
    bitCnt -= need;
    return v & ((1 << need) - 1);
  };
  const ensure = (extra: number) => {
    if (outLen + extra <= out.length) return;
    const bigger = new Uint8Array(Math.max(out.length * 2, outLen + extra));
    bigger.set(out.subarray(0, outLen));
    out = bigger;
  };
  const decode = (h: Huffman): number => {
    let code = 0;
    let first = 0;
    let index = 0;
    for (let len = 1; len < 16; len++) {
      code |= bits(1);
      const count = h.counts[len];
      if (code - first < count) return h.symbols[index + code - first];
      index += count;
      first += count;
      first <<= 1;
      code <<= 1;
    }
    throw new Error("Bad Huffman code");
  };
  const codes = (lit: Huffman, dist: Huffman) => {
    for (;;) {
      let sym = decode(lit);
      if (sym < 256) {
        ensure(1);
        out[outLen++] = sym;
      } else if (sym === 256) {
        return;
      } else {
        sym -= 257;
        if (sym >= 29) throw new Error("Bad length symbol");
        const len = LEN_BASE[sym] + bits(LEN_EXTRA[sym]);
        const ds = decode(dist);
        if (ds >= 30) throw new Error("Bad distance symbol");
        const d = DIST_BASE[ds] + bits(DIST_EXTRA[ds]);
        if (d > outLen) throw new Error("Distance too far back");
        ensure(len);
        for (let i = 0; i < len; i++, outLen++) out[outLen] = out[outLen - d];
      }
    }
  };

  let last = 0;
  while (!last) {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      bitBuf = 0;
      bitCnt = 0;
      if (pos + 4 > input.length) throw new Error("zlib stream is truncated");
      const len = input[pos] | (input[pos + 1] << 8);
      pos += 4;
      if (pos + len > input.length) throw new Error("zlib stream is truncated");
      ensure(len);
      out.set(input.subarray(pos, pos + len), outLen);
      outLen += len;
      pos += len;
    } else if (type === 1) {
      if (!fixedLit || !fixedDist) {
        const l = new Uint8Array(288);
        l.fill(8, 0, 144);
        l.fill(9, 144, 256);
        l.fill(7, 256, 280);
        l.fill(8, 280, 288);
        fixedLit = huffman(l, 288);
        fixedDist = huffman(new Uint8Array(30).fill(5), 30);
      }
      codes(fixedLit, fixedDist);
    } else if (type === 2) {
      const nlen = bits(5) + 257;
      const ndist = bits(5) + 1;
      const ncode = bits(4) + 4;
      const lengths = new Uint8Array(320);
      for (let i = 0; i < ncode; i++) lengths[CL_ORDER[i]] = bits(3);
      const cl = huffman(lengths, 19);
      lengths.fill(0);
      for (let i = 0; i < nlen + ndist;) {
        const sym = decode(cl);
        if (sym < 16) {
          lengths[i++] = sym;
        } else {
          let rep = 0;
          let val = 0;
          if (sym === 16) {
            if (i === 0) throw new Error("Repeat with no first length");
            val = lengths[i - 1];
            rep = 3 + bits(2);
          } else if (sym === 17) rep = 3 + bits(3);
          else rep = 11 + bits(7);
          if (i + rep > nlen + ndist) throw new Error("Too many code lengths");
          while (rep--) lengths[i++] = val;
        }
      }
      codes(huffman(lengths, nlen), huffman(lengths.subarray(nlen), ndist));
    } else {
      throw new Error("Bad block type");
    }
  }
  return out.subarray(0, outLen);
}

// ── Loaders (cached, one fetch per file) ─────────────────────────────────────

const cache = new Map<string, Promise<unknown>>();
let campusLoaded: CampusData | null = null;

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let promise = cache.get(key) as Promise<T> | undefined;
  if (!promise) {
    promise = load();
    // A failed load is retried on the next call (e.g. after a flaky connection).
    promise.catch(() => cache.delete(key));
    cache.set(key, promise);
  }
  return promise;
}

/** A request that receives nothing for this long (ms) is abandoned — a stalled mobile connection. */
export const FETCH_STALL_MS = 20_000;
/** Hard limit per file (ms), however slowly the bytes still trickle in. */
export const FETCH_TOTAL_MS = 120_000;

/**
 * fetch() with a deadline: rejects with a readable error when the server or the connection stalls
 * (no response, or no bytes for FETCH_STALL_MS) or the file takes longer than FETCH_TOTAL_MS, and
 * aborts the request. The rejection evicts the file from the cache, so "Try again" fetches it anew.
 */
async function fetchWithDeadline<T>(path: string, read: (res: Response, alive: () => void, deadline: Promise<never>) => Promise<T>): Promise<T> {
  const url = `${TWIN_ASSET_BASE}/${path}`;
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  let fail: (e: Error) => void = () => undefined;
  const deadline = new Promise<never>((_, reject) => (fail = reject));
  // The deadline may fire after the race is over; that rejection is expected and handled here.
  deadline.catch(() => undefined);
  const stop = (message: string) => {
    const error = new Error(message);
    // Settle with this message first, whatever the aborted fetch then rejects with.
    fail(error);
    controller?.abort(error);
  };
  let stall: ReturnType<typeof setTimeout> | undefined;
  const alive = () => {
    if (stall !== undefined) clearTimeout(stall);
    stall = setTimeout(() => stop(`Twin data: ${path} stalled (nothing received for ${FETCH_STALL_MS / 1000} s)`), FETCH_STALL_MS);
  };
  const total = setTimeout(() => stop(`Twin data: ${path} timed out after ${FETCH_TOTAL_MS / 1000} s`), FETCH_TOTAL_MS);
  try {
    alive();
    const res = await Promise.race([fetch(url, controller ? { signal: controller.signal } : undefined), deadline]);
    if (!res.ok) throw new Error(`Twin data: ${path} → HTTP ${res.status}`);
    alive();
    return await read(res, alive, deadline);
  } finally {
    if (stall !== undefined) clearTimeout(stall);
    clearTimeout(total);
  }
}

/** The body as bytes; every chunk that arrives keeps the request alive. */
async function readBytes(res: Response, alive: () => void, deadline: Promise<never>): Promise<Uint8Array> {
  const reader = res.body && typeof res.body.getReader === "function" ? res.body.getReader() : null;
  if (!reader) return new Uint8Array(await Promise.race([res.arrayBuffer(), deadline]));
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      if (value) {
        chunks.push(value);
        size += value.length;
        alive();
      }
    }
  } catch (e) {
    reader.cancel().catch(() => undefined);
    throw e;
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

async function fetchJson<T extends { version: number }>(path: string): Promise<T> {
  const json = await fetchWithDeadline(path, async (res, alive, deadline) => {
    if (res.body && typeof res.body.getReader === "function" && typeof TextDecoder === "function") {
      return JSON.parse(new TextDecoder().decode(await readBytes(res, alive, deadline))) as T;
    }
    return (await Promise.race([res.json(), deadline])) as T;
  });
  if (json.version !== CAMPUS_DATA_VERSION) {
    throw new Error(`Twin data: ${path} has format v${json.version}, expected v${CAMPUS_DATA_VERSION}`);
  }
  return json;
}

/** OSM campus: buildings, roads, paths, areas, entrances, trees, lamps, railway, outdoor route legs. */
export function loadCampus(): Promise<CampusData> {
  return cached("campus", async () => {
    const data = await fetchJson<CampusData>("data/campus.json");
    campusLoaded = data;
    return data;
  });
}

/** City of Turku LOD2 roof parts of every building in the context ring. */
export function loadLod2(): Promise<Lod2Data> {
  return cached("lod2", () => fetchJson<Lod2Data>("data/lod2.json"));
}

/** Street areas, kerbs, lamps, trees, furniture, signs, stairs, walls, fences, crossings, bus stops. */
export function loadStreets(): Promise<StreetsData> {
  return cached("streets", () => fetchJson<StreetsData>("data/streets.json"));
}

/** Route legs (with heights) and the audience tours. */
export function loadRoutes(): Promise<RoutesData> {
  return cached("routes", () => fetchJson<RoutesData>("data/routes.json"));
}

/** The 0.5 m bare-earth heightfield (2021 laser DTM, holes filled, see terrain/dtm.json). */
export function loadTerrain(): Promise<Terrain> {
  return cached("terrain", async () => {
    const meta = await fetchJson<TerrainMeta>("terrain/dtm.json");
    const bytes = await fetchWithDeadline(`terrain/${meta.file}`, readBytes);
    const png = await decodePng(bytes);
    if (png.width !== meta.width || png.height !== meta.height || png.channels !== 1 || png.bitDepth !== 16) {
      throw new Error("Twin data: dtm.png does not match dtm.json");
    }
    return createTerrain(meta, png.data);
  });
}

/** Forget every cached file (tests, hot reload). */
export function resetCampusDataCache(): void {
  cache.clear();
  campusLoaded = null;
}

/**
 * The campus building with a role — from the loaded campus (after
 * `loadCampus()` resolved) or from the data you pass.
 */
export function campusBuilding(role: BuildingRole): CampusBuilding | undefined;
export function campusBuilding(campus: CampusData, role: BuildingRole): CampusBuilding | undefined;
export function campusBuilding(a: BuildingRole | CampusData, b?: BuildingRole): CampusBuilding | undefined {
  const campus = typeof a === "string" ? campusLoaded : a;
  const role = typeof a === "string" ? a : b;
  if (!campus) throw new Error("campusBuilding(role): call loadCampus() first");
  return campus.buildings.find((x) => x.role === role);
}

/** A closed building as a camera volume: a footprint prism, or one LOD2 roof part of it. */
export interface BuildingVolume {
  /** CampusBuilding id and role. */
  building: string;
  role?: BuildingRole;
  polygon: V2[];
  /** Roof of this part (y). */
  top: number;
  /** Underside (y): below the ground, or the deck a raised part stands on. */
  bottom: number;
}

/**
 * The campus buildings as volumes the camera keeps out of: one per LOD2 roof part where the City's
 * model has them (Joki's low hall and its round tower, BioCity's stepped wings…), else the footprint
 * up to the main roof — never the highest point (a plant room, the Joki tower) over the whole
 * footprint. Raised structures (canopies on posts, bridges, overhangs with a min_height) are left out:
 * the camera may pass under them.
 */
export function buildingVolumes(campus: CampusData, lod2?: Lod2Data | null): BuildingVolume[] {
  const records = new Map<string, Lod2Building>();
  for (const r of lod2?.buildings ?? []) records.set(r.id, r);
  const out: BuildingVolume[] = [];
  for (const b of campus.buildings) {
    if ((b.minHeight ?? 0) > 2 || b.baseY !== undefined) continue;
    const ground = b.groundY ?? 0;
    const parts: { rec: Lod2Building; roof: Lod2Roof }[] = [];
    for (const id of b.lod2 ?? []) {
      const rec = records.get(id);
      if (rec) for (const roof of rec.roofs) if (!roof.claimedBy || roof.claimedBy === b.role) parts.push({ rec, roof });
    }
    if (b.role === "biocity" || b.role === "joki" || b.role === "educity") {
      for (const rec of records.values()) {
        if ((b.lod2 ?? []).includes(rec.id)) continue;
        for (const roof of rec.roofs) if (roof.claimedBy === b.role) parts.push({ rec, roof });
      }
    }
    let added = 0;
    for (const { rec, roof } of parts) {
      if (roof.ring.length < 3) continue;
      const top = roof.y ?? (roof.ys?.length ? Math.max(...roof.ys) : rec.roofY);
      const raised = rec.baseY > rec.groundY + 2;
      const bottom = raised ? rec.baseY : Math.min(ground, rec.groundY) - 1;
      if (top - bottom < 1) continue;
      out.push({ building: b.id, role: b.role, polygon: roof.ring, top, bottom });
      added++;
    }
    if (!added) out.push({ building: b.id, role: b.role, polygon: b.polygon, top: b.roofY ?? ground + b.height, bottom: ground - 1 });
  }
  return out;
}

/** Even-odd point in polygon (kept here so the data module needs no geometry library). */
function insideRing(x: number, z: number, ring: readonly V2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * The building volume that contains (x, y, z) — inside one of its parts, between its bottom and its
 * roof; for a building opened as a dollhouse, below `ceilings[role]` (the open level's ceiling: the
 * cut-away above it is open air). `roles` limits the search (e.g. the hero buildings). null = outdoors.
 */
export function volumeAt(
  volumes: readonly BuildingVolume[],
  x: number,
  y: number,
  z: number,
  opts: { roles?: readonly BuildingRole[]; ceilings?: Partial<Record<BuildingRole, number>> } = {},
): BuildingVolume | null {
  for (const v of volumes) {
    if (opts.roles && !(v.role && opts.roles.includes(v.role))) continue;
    const ceiling = v.role ? opts.ceilings?.[v.role] : undefined;
    if (y < v.bottom || y > Math.min(v.top, ceiling ?? Infinity)) continue;
    if (insideRing(x, z, v.polygon)) return v;
  }
  return null;
}

/** Every route leg of a list (tour order), resolved from routes.json; unknown ids are skipped. */
export function routeLegs(routes: RoutesData, ids: readonly string[]): RouteLeg[] {
  return ids.map((id) => routes.legs[id]).filter((leg): leg is RouteLeg => !!leg);
}

/**
 * Where tour captions start: each step's ground anchor (TourStep.at in
 * lib/hackathon-2026/twin.ts) projected onto the tour path (in plan), as a
 * fraction 0…1 of the path's 3D length — the measure of the tour controller's
 * progress t (nav/tour.ts), so stairs count as walked. Projections only move
 * forward, so a path that passes the same spot twice keeps the steps in order.
 * A step without an anchor (or more than `maxOffset` m off the path) is spread
 * evenly between its anchored neighbours (from the start; up to 0.96 at the end).
 */
export function anchorFractions(
  path: readonly V3[],
  anchors: readonly ([number, number] | undefined)[],
  maxOffset = 4,
): number[] {
  const n = anchors.length;
  const even = (i: number) => (n > 1 ? (i / n) * 0.96 : 0);
  if (path.length < 2) return anchors.map((_, i) => even(i));
  const cum = [0];
  for (let i = 1; i < path.length; i++) {
    const [ax, ay, az] = path[i - 1];
    const [bx, by, bz] = path[i];
    cum.push(cum[i - 1] + Math.hypot(bx - ax, by - ay, bz - az));
  }
  const total = cum[cum.length - 1] || 1;
  // Anchored steps, forward only.
  const out: (number | null)[] = [];
  let from = 0;
  for (const at of anchors) {
    if (!at) {
      out.push(null);
      continue;
    }
    let best = Infinity;
    let along = from;
    for (let i = 1; i < path.length; i++) {
      if (cum[i] < from) continue;
      const [ax, , az] = path[i - 1];
      const [bx, , bz] = path[i];
      const dx = bx - ax;
      const dz = bz - az;
      const l2 = dx * dx + dz * dz;
      const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((at[0] - ax) * dx + (at[1] - az) * dz) / l2));
      const s = cum[i - 1] + t * (cum[i] - cum[i - 1]);
      if (s < from) continue;
      const d = Math.hypot(at[0] - (ax + t * dx), at[1] - (az + t * dz));
      if (d < best - 1e-9) {
        best = d;
        along = s;
      }
    }
    if (best > maxOffset) out.push(null);
    else {
      from = along;
      out.push(along / total);
    }
  }
  // The rest, evenly between their anchored neighbours (a leading run starts at 0).
  for (let i = 0; i < n; ) {
    if (out[i] !== null) {
      i++;
      continue;
    }
    let j = i;
    while (j < n && out[j] === null) j++;
    const lo = i > 0 ? (out[i - 1] as number) : 0;
    const hi = j < n ? (out[j] as number) : Math.max(lo, 0.96);
    const m = j - i;
    for (let k = i; k < j; k++) out[k] = i === 0 ? lo + ((hi - lo) * (k - i)) / m : lo + ((hi - lo) * (k - i + 1)) / (m + 1);
    i = j;
  }
  return out as number[];
}
