import type { V2 } from "../../types";
import type { CampusBuilding } from "../../data/campus";
import { hashString, pointInRing, polygonCentroid, ringArea } from "../../util";
import { vectorBearing } from "../../frame";
import type { Solid, WallSpan } from "./envelope";

/**
 * Which facade family each context building, part and wall gets (SPEC §3.4,
 * research photos in research/ref/street, ref/joki, ref/educity):
 *
 * - Electrocity: white metal panels; ribbon windows along Tykistökatu, a punched
 *   end block with the vertical ELECTROCITY letters at the Joukahaisenkatu
 *   junction, magenta / violet / green stripes on the yard and courtyard faces.
 * - Eurocity: white panels with blue ribbon glazing, round glass corner drums,
 *   a sawtooth glass roof over its atrium.
 * - ICT-City: oxblood ribbed-metal wings with long ribbons, silver panel
 *   in-fills between them, a red-orange corrugated band on the spine, channel-glass
 *   stair shafts, a white ribbon-window end towards Jussin aukio, light plinths.
 * - DataCity: red-brown brick with punched windows, glazed bays on
 *   Lemminkäisenkatu (OSM glass parts), a black plant volume towards Joki,
 *   sawtooth glass over its two atria.
 * - Everything else: styles by use, year and OSM colour/material.
 */

export interface BuildingInfo {
  b: CampusBuilding;
  /** Stands on a bridge (the station hall): no ground colliders. */
  bridge?: boolean;
  /** Storey reference (lowest ground, or the raised base of a bridge building). */
  ground: number;
  /** Main roof (y). */
  roofY: number;
  /** Storeys for the facade grid. */
  levels?: number;
  /** OSM building parts with material "glass" (DataCity's glazed bays, If-talo) and their top (y). */
  glassParts: { ring: V2[]; top: number }[];
  /** OSM parts with their colour (If-talo). */
  colouredParts: { ring: V2[]; colour?: string; material?: string }[];
  /** OSM parts that start above the ground (min_level ≥ 1): overhangs over a recessed ground floor. */
  overhangs: { ring: V2[]; minHeight: number }[];
  /** Year of the main LOD2 record. */
  year?: number;
}

export interface ArcadeSpec {
  /** Recess depth behind the facade line (m). */
  depth: number;
  /** Clear height above the ground at the facade (m). */
  height: number;
  /** Column spacing (m), radius (m) and colour. */
  pitch: number;
  radius: number;
  color: string;
  /** Soffit colour. */
  soffit?: string;
  /** Square piers instead of round columns. */
  square?: boolean;
  /** Square piers built as walls of this facade family (brick piers) instead of painted concrete. */
  pierFamily?: string;
}

/** Piers standing proud of a wall (brick pilasters), every `pitch` m along the wall line and at its corners. */
export interface PilasterSpec {
  pitch: number;
  /** Width along the wall and projection in front of it (m). */
  width: number;
  depth: number;
  /** Facade family of the piers (no windows). */
  family: string;
}

export interface Recipe {
  /** Main family (storey grid of the building). */
  family: string;
  /** Wanted wall colour for tinted generic families. */
  tint?: string;
  /** Family per solid. */
  solidFamily?(s: Solid, info: BuildingInfo): string;
  /** Family per wall span (null = the solid's). */
  spanFamily?(span: WallSpan, s: Solid, info: BuildingInfo): string | null;
  /** Wall colour per solid for tinted families. */
  solidTint?(s: Solid, info: BuildingInfo): string | undefined;
  /** Families of horizontal bands up a wall span: above `from` (y) the wall uses `family`. */
  spanBands?(span: WallSpan, s: Solid, info: BuildingInfo): { from: number; family: string }[];
  /** A recessed ground-storey arcade with columns along this span. */
  arcade?(span: WallSpan, s: Solid, info: BuildingInfo): ArcadeSpec | null;
  /** Pilasters up an open wall span (from the ground to the parapet). */
  pilasters?(span: WallSpan, s: Solid, info: BuildingInfo): PilasterSpec | null;
  /** Roof colour per solid (courtyards, terraces). */
  solidRoof?(s: Solid, info: BuildingInfo): string | null;
  /** Sloped LOD2 faces are glazing (atria) rather than a pitched roof covering. */
  glassSlopes?: boolean;
  /** Pitched-roof covering colour (sloped faces that are not glass). */
  pitchedRoof?: string;
  /** Roof colour override. */
  roof?: string;
  /** No generic rooftop plant. */
  noUnits?: boolean;
  /** Something stands in front of the walls down to the ground (ParkCity's tubes): walk colliders this far out too (m). */
  colliderOffset?: number;
  /** Label shown over the building (kind "building"). */
  label?: string;
}

/** Compass bearing a wall span faces (outwards). */
export function spanFacing(span: WallSpan): number {
  return vectorBearing(span.n[0], span.n[1]);
}

/** Smallest angle between two bearings (degrees). */
export function bearingDiff(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 540) % 360 - 180);
  return d;
}

const area = (s: Solid) => Math.abs(ringArea(s.ring));
const centre = (s: Solid) => polygonCentroid(s.ring);
const spanMid = (span: WallSpan): V2 => [(span.a[0] + span.b[0]) / 2, (span.a[1] + span.b[1]) / 2];
const inside = (span: WallSpan, d = 1.2): V2 => {
  const m = spanMid(span);
  return [m[0] - span.n[0] * d, m[1] - span.n[1] * d];
};

const pick = <T>(list: readonly T[], seed: number): T => list[seed % list.length];

/** Unit direction of the longest edge of a ring. */
function longAxis(ring: readonly V2[]): V2 {
  let best = 0;
  let axis: V2 = [1, 0];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l > best) {
      best = l;
      axis = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    }
  }
  return axis;
}

// ── Hero-adjacent buildings ──────────────────────────────────────────────────

const ELECTROCITY: Recipe = {
  family: "electro",
  label: "Electrocity",
  solidFamily(s) {
    const top = s.flatY ?? 0;
    // The white plant box on the end block, the dark stair-tower head at the south-east end.
    if (top > 33) return "plantLight";
    if (top > 30.5 && area(s) < 60) return "electroTower";
    return "electro";
  },
};

const EUROCITY: Recipe = {
  family: "euro",
  label: "Eurocity",
  glassSlopes: true,
  solidFamily(s) {
    // The two round glass drums (31.1 m).
    if (s.flatY !== null && s.flatY > 30.5 && area(s) < 60) return "euroGlass";
    return "euro";
  },
  spanFamily(span, s) {
    if (s.tag === "euroGlass") return null;
    // Narrow chamfered corners facing the Tykistökatu–Joukahaisenkatu junction: blue glass strips (2008 photo).
    const len = Math.hypot(span.b[0] - span.a[0], span.b[1] - span.a[1]);
    if (len < 9 && bearingDiff(spanFacing(span), 340) < 50) return "euroGlass";
    return null;
  },
};

/** ICT-City: the wing ends on the streets are red, everything facing a courtyard silver. */
function ictStreetFacing(span: WallSpan): boolean {
  const f = spanFacing(span);
  return bearingDiff(f, 38.8) < 30 || bearingDiff(f, 218.8) < 30;
}

const ICT_CITY: Recipe = {
  family: "ictRed",
  label: "ICT-City",
  solidFamily(s) {
    const top = s.flatY ?? 0;
    const a = area(s);
    const [cx, cz] = centre(s);
    if (a < 25 && top > 20) return "ictShaft";
    if (top > 28) return "ictSpine";
    if (top > 20) {
      // The north-west end towards Jussin aukio: white ribbon windows.
      if (cx < 112 && cz < 25) return "ictWhite";
      return "ictRed";
    }
    if (top > 12) return "ictSilver";
    // Two-storey glazed entrance halls between the wings; the rest of the plinth is panelled.
    if (top > 6 && a < 200) return "ictLobby";
    return "ictPlinth";
  },
  spanFamily(span, s) {
    const fam = s.tag ?? "ictRed";
    if (fam === "ictRed") return ictStreetFacing(span) ? "ictRed" : "ictSilver";
    if (fam === "ictShaft") return ictStreetFacing(span) ? "ictShaftGlass" : "ictShaft";
    if (fam === "ictSpine") {
      // Below the red top band: the north-west end white, the south-east end (towards EduCity) dark, courtyard sides silver.
      const f = spanFacing(span);
      if (bearingDiff(f, 308.8) < 40) return "ictWhite";
      if (bearingDiff(f, 128.8) < 40) return "ictDark";
      return "ictSilver";
    }
    return null;
  },
  spanBands(span, s) {
    // The spine's top storey and a half: red corrugated band above the wings.
    if (s.tag === "ictSpine") return [{ from: 23.3, family: "ictTop" }];
    // Wing ends on the streets: two light panelled storeys under the red ribbed box (Commons 2017 photo).
    if (s.tag === "ictRed" && ictStreetFacing(span)) return [{ from: -Infinity, family: "ictPlinth" }, { from: 7.1, family: "ictRed" }];
    return [];
  },
  solidRoof(s) {
    // Courtyard floors at deck level (≈ +2.3 … +2.7): pavers and planting, not membrane.
    if (s.flatY !== null && s.flatY < 3.2) return "#6f6a5f";
    return null;
  },
};

const DATACITY: Recipe = {
  family: "data",
  label: "DataCity",
  glassSlopes: true,
  solidFamily(s) {
    const [cx, cz] = centre(s);
    // The black plant volume above the north-west end, facing Joki.
    if (s.flatY !== null && s.flatY > 24 && s.flatY < 25 && cx < 60 && cz < 65) return "dataPlant";
    // The two-storey front on Lemminkäisenkatu (tall recessed bays).
    if (s.flatY !== null && s.flatY < 10 && s.flatY > 5) return "dataBase";
    return "data";
  },
  spanFamily(span, s, info) {
    const fam = s.tag ?? "data";
    if (fam !== "data" && fam !== "dataBase") return null;
    // Glazed parts of the low front (OSM building:part material=glass): only walls of solids
    // no taller than the part — the tall brick block behind keeps its brick above them.
    const p = inside(span, 0.6);
    const top = s.flatY ?? s.top(p[0], p[1]);
    if (info.glassParts.some((g) => pointInRing(p, g.ring) && top <= g.top + 1.5)) return "dataGlass";
    return null;
  },
  arcade(span, s, info) {
    // Brick bays that start one storey up (OSM min_level 1) stand on a recessed glazed ground floor.
    if ((s.tag !== "data" && s.tag !== "dataBase") || span.coverSolid !== null || bearingDiff(spanFacing(span), 218.8) > 40) return null;
    const p = inside(span, 0.8);
    if (!info.overhangs.some((o) => pointInRing(p, o.ring))) return null;
    return { depth: 2.4, height: 3.6, pitch: 5.4, radius: 0.42, color: "#8a4a3b", soffit: "#b9b3aa", square: true, pierFamily: "dataPier" };
  },
  pilasters(span, s) {
    // The two-storey front on Lemminkäisenkatu: brick piers every 5.4 m framing tall recessed panels,
    // shop windows between them at street level (Commons photo).
    if (s.tag !== "dataBase" || bearingDiff(spanFacing(span), 218.8) > 40) return null;
    return { pitch: 5.4, width: 0.9, depth: 0.35, family: "dataPier" };
  },
};

const PHARMACITY: Recipe = {
  family: "pharma",
  label: "Pharmacity",
  glassSlopes: true,
  solidFamily(s) {
    // The raised middle volume carries the glass gable; its walls are glazed.
    if (s.flatY !== null && s.flatY > 29 && area(s) < 2000) return "pharmaGlass";
    return "pharma";
  },
  arcade(span, s, info) {
    if (s.tag !== "pharma" || span.coverSolid !== null) return null;
    const p = inside(span, 0.8);
    if (!info.overhangs.some((o) => pointInRing(p, o.ring))) return null;
    return { depth: 2.2, height: 3.6, pitch: 6.0, radius: 0.25, color: "#4a5056", soffit: "#c4c7c9" };
  },
};
const PARKCITY: Recipe = {
  family: "park",
  label: "ParkCity",
  noUnits: true,
  // The tube screen stands 0.45 m in front of the slab edges, down to the ground (parkcity.ts).
  colliderOffset: 0.55,
  roof: "#3c3d3e",
  arcade(span, s, info) {
    // The two-storey colonnade along Joukahaisenkatu (OSM part min 7.2 m): 5.5 m deep; columns in parkcity.ts.
    if (span.coverSolid !== null || bearingDiff(spanFacing(span), 219) > 20) return null;
    const p = inside(span, 1.2);
    if (!info.overhangs.some((o) => pointInRing(p, o.ring))) return null;
    return { depth: 5.5, height: 7.2, pitch: 8.2, radius: 0, color: "#a3a19b", soffit: "#b8b6b0" };
  },
};
const CIVILCITY: Recipe = { family: "civil", label: "CivilCity" };
// No building label: the "Kupittaa station" landmark label (lib target) marks it.
const STATION: Recipe = { family: "station", noUnits: true };

// ── The rest ─────────────────────────────────────────────────────────────────

const RENDER_TINTS = ["#e2e0d9", "#d9d6cd", "#ece9e2", "#cfccc4", "#dcd8cf"];
const OLD_TINTS = ["#d9bf8f", "#e2d4a8", "#d8b4a2", "#cdc6b6", "#e0cfa0"];
const BRICK_TINTS = ["#8e4a37", "#9a5641", "#7f4232"];

function recipeForOther(b: CampusBuilding, info: BuildingInfo): Recipe {
  const name = (b.name ?? "").toLowerCase();
  const use = (b.use ?? "").toLowerCase();
  const seed = hashString(b.id);
  const year = info.year ?? b.year;
  if (name.includes("intelligate")) return { family: "intelli" };
  if (name.includes("neo")) return { family: "neo" };
  if (b.osmId === 731925814) {
    // Original Sokos Hotel Kupittaa: dark banded long faces, bronze end walls (across the long axis).
    const axis = longAxis(b.polygon);
    return {
      family: "hotel",
      spanFamily(span) {
        const along = Math.abs(span.n[0] * axis[0] + span.n[1] * axis[1]);
        return along > 0.7 ? "hotelBronze" : null;
      },
    };
  }
  if (b.osmId === 50823715) return { family: "j9" };
  if (name.startsWith("if-talo")) {
    return {
      family: "ifGlass",
      solidFamily(s) {
        const p = centre(s);
        const part = info.colouredParts.find((cp) => pointInRing(p, cp.ring));
        if (!part) return "ifGlass";
        if (part.material === "glass") return "ifGlass";
        if (part.colour === "whitesmoke") return "office";
        return "resBrick";
      },
      solidTint(s) {
        const p = centre(s);
        const part = info.colouredParts.find((cp) => pointInRing(p, cp.ring));
        if (part?.colour === "whitesmoke") return "#e9e9e6";
        if (part?.colour === "#332922") return "#4a3a33";
        if (part?.colour === "#b04735") return "#a24f3c";
        return undefined;
      },
    };
  }
  if (/apartments|residential|dormitory|hotel/.test(use)) {
    if (year && year < 1930) return { family: "oldRender", tint: pick(OLD_TINTS, seed), pitchedRoof: "#5b4038" };
    if (year && year >= 2005) {
      // The new blocks south of DataCity: white render and red brick (Lemminkäisenkatu photo).
      return seed % 5 < 2 ? { family: "resBrick", tint: pick(BRICK_TINTS, seed >> 3) } : { family: "res", tint: pick(RENDER_TINTS, seed >> 3) };
    }
    return { family: "res", tint: pick(RENDER_TINTS, seed >> 2) };
  }
  if (name === "teutori") {
    // The 1891 hospital building (ochre render) with the 2012–13 library extension in glass and black panels.
    return {
      family: "oldRender",
      tint: "#d9bf8f",
      pitchedRoof: "#5b4038",
      solidFamily(s) {
        return (s.year ?? 0) >= 2000 ? "darkGlass" : "oldRender";
      },
      solidTint(s) {
        return (s.year ?? 0) >= 2000 ? undefined : "#d9bf8f";
      },
    };
  }
  if (name === "sanitas" || (b.material ?? "").includes("brick")) {
    if (name === "sanitas") return { family: "oldBrick", tint: "#c2ab86" };
    return { family: "oldBrick" };
  }
  if (name.startsWith("dentalia")) {
    // 1960s teaching clinic: light grey corrugated panels and long ribbon windows (Teutori photo, KartaView).
    return { family: "ribbonGrey" };
  }
  if (name === "villa medica" || name === "verstas" || (year && year < 1945)) {
    return { family: "oldRender", tint: pick(OLD_TINTS, seed), pitchedRoof: "#5b4038" };
  }
  if (use === "parking") return { family: "plain", tint: "#a19e97", noUnits: true };
  if (use === "pavilion") return { family: "res", tint: "#b8cfdc" };
  if (/shed|service|garage|outbuilding|roof/.test(use) || b.height < 4.6) return { family: "plain", tint: "#a7a49d", noUnits: true };
  if (b.osmId === 1228228108) return { family: "res", tint: "#e6e5e0" };
  return { family: "office", tint: pick(["#d5d7d6", "#c9cbca", "#dad6cc", "#c4c7c9"], seed) };
}

/** The recipe of a context building. */
export function recipeFor(b: CampusBuilding, info: BuildingInfo): Recipe {
  switch (b.role) {
    case "electrocity":
      return ELECTROCITY;
    case "eurocity":
      return EUROCITY;
    case "ict-city":
      return ICT_CITY;
    case "datacity":
      return DATACITY;
    case "pharmacity":
      return PHARMACITY;
    case "parkcity":
      return PARKCITY;
    case "civilcity":
      return CIVILCITY;
    case "station":
      return STATION;
    default:
      return recipeForOther(b, info);
  }
}
