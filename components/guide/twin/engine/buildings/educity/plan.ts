import type { V2 } from "../../types";
import { type Rect, rect } from "./frame";

/**
 * Floor plans of EduCity floors 1–2 in the E frame, read from the Since AI
 * event maps (EDUCITY · Yritysten briiffaushuoneet, 1. and 2. kerros; scale
 * fitted to the OSM outline, ±0.3 m) and the TUAS wayfinding maps
 * (research interiors.json). Walls are axis-aligned segments with door
 * openings; "blocks" are closed rooms that are not part of the event (WCs,
 * stairs, lifts, kitchens) drawn as solid volumes so the plan reads like the
 * map.
 */

export interface Door {
  /** Position along the wall from its start (m). */
  at: number;
  w: number;
  h: number;
}

export type WallStyle = "plaster" | "movable" | "glass" | "core";

export interface WallSpec {
  a: V2;
  b: V2;
  style: WallStyle;
  doors?: Door[];
  /** Thickness (m); default by style. */
  t?: number;
}

export interface BlockSpec extends Rect {
  /** Label for debugging / maps. */
  name: string;
  /** Wall colour (sRGB). */
  color?: string;
  /** Doors in the block's sides: side, position along it (from the low coordinate). */
  doors?: { side: "x0" | "x1" | "z0" | "z1"; at: number }[];
}

export interface FloorPlan {
  /** Floor level (y_E) and clear height to the suspended ceiling. */
  y: number;
  ceiling: number;
  walls: WallSpec[];
  blocks: BlockSpec[];
  /** Exposed concrete columns (centres). */
  columns: V2[];
}

const D = (at: number, w = 1.0, h = 2.2): Door => ({ at, w, h });
const wall = (a: V2, b: V2, style: WallStyle, doors: Door[] = [], t?: number): WallSpec => ({ a, b, style, doors, t });
const blk = (r: Rect, name: string, doors: BlockSpec["doors"] = [], color?: string): BlockSpec => ({ ...r, name, doors, color });

/** Glass line of the pavilion's north-west face (outdoor.ts draws it). */
export const PAVILION_GLASS_NW = 5.4;

/** Inner faces of the mantle (the brick is 0.45 m thick). */
export const IN = { x0: 0.45, x1: 51.35, z0: 0.45, z1: 64.75 } as const;

// ── Floor 1 (y_E 0) ─────────────────────────────────────────────────────────

export const F1: FloorPlan = {
  y: 0,
  ceiling: 3.9,
  walls: [
    // North-east band: 1001 Dromberg | 1002 Moriaberg | 1003 (south wall on the corridor).
    wall([IN.x0, 8.5], [43.5, 8.5], "plaster", [D(8.3 - IN.x0), D(26.7 - IN.x0), D(41.5 - IN.x0)]),
    wall([17.5, IN.z0], [17.5, 8.5], "movable"),
    wall([39.4, IN.z0], [39.4, 8.5], "plaster"),
    wall([43.5, IN.z0], [43.5, 8.5], "plaster"),
    // The glass pop-up box: 1090 Ringsberg (north half), 1091 Hammarbacka (south half).
    wall([17.5, 10.2], [34.1, 10.2], "glass", [D(19.85 - 17.5, 1.0, 2.25), D(31.9 - 17.5, 1.0, 2.25)]),
    wall([17.5, 24.8], [34.1, 24.8], "glass", [D(19.85 - 17.5, 1.0, 2.25), D(32.1 - 17.5, 1.0, 2.25)]),
    wall([17.5, 10.2], [17.5, 24.8], "glass"),
    wall([34.1, 10.2], [34.1, 24.8], "glass"),
    wall([17.5, 16.56], [34.1, 16.56], "movable"),
    // East column: rooms 1005–1007, the east stair, door B lobby, lifts, student services.
    wall([46.0, IN.z0], [46.0, 24.6], "core", [D(3.0 - IN.z0), D(7.0 - IN.z0), D(12.5 - IN.z0), D(19.0 - IN.z0)]),
    wall([46.0, 5.34], [IN.x1, 5.34], "core"),
    wall([46.0, 8.66], [IN.x1, 8.66], "plaster"),
    wall([46.0, 21.7], [IN.x1, 21.7], "plaster"),
    wall([46.0, 24.6], [IN.x1, 24.6], "core"),
    wall([46.0, 24.6], [46.0, 30.8], "core", [D(29.6 - 24.6, 1.2)]),
    wall([46.0, 30.8], [IN.x1, 30.8], "core"),
    wall([46.0, 36.5], [46.0, IN.z1], "plaster", [D(40.0 - 36.5), D(47.5 - 36.5), D(55.5 - 36.5), D(62.0 - 36.5)]),
    wall([46.0, 36.5], [IN.x1, 36.5], "core"),
    wall([46.0, 44.0], [IN.x1, 44.0], "plaster"),
    wall([46.0, 52.0], [IN.x1, 52.0], "plaster"),
    wall([46.0, 59.0], [IN.x1, 59.0], "plaster"),
    // Pavilion side of the block: glazed, with the two wide openings into Kisälli / the lobby.
    wall([13.0, 65.2], [46.0, 65.2], "glass", [D(14.8 - 13.0, 2.6, 2.6), D(37.2 - 13.0, 3.2, 2.6)]),
    // Kaivomestari pub in the pavilion's north-west corner (glazed towards the hall).
    wall([13.0, 65.2], [13.0, 72.2], "glass", [D(68.6 - 65.2, 1.4, 2.3)]),
    wall([PAVILION_GLASS_NW, 72.2], [13.0, 72.2], "glass"),
  ],
  blocks: [
    blk(rect(IN.x0, 7.26, 8.5, 16.4), "1089 Maskulin", [{ side: "x1", at: 12.5 }]),
    blk(rect(IN.x0, 5.6, 16.4, 24.5), "rooms 1083–1085", [{ side: "x1", at: 20.5 }]),
    blk(rect(8.9, 13.0, 10.2, 23.1), "rooms 1081–1087", [{ side: "x1", at: 13.5 }, { side: "x1", at: 19.0 }]),
    blk(rect(8.9, 13.0, 24.8, 30.9), "WC", [{ side: "x1", at: 27.0 }]),
    blk(rect(IN.x0, 5.6, 24.5, 30.8), "west stair", [{ side: "x1", at: 29.6 }], "#d7d8d5"),
    blk(rect(IN.x0, 5.4, 34.4, 36.5), "west lifts", [], "#b9bdc0"),
    blk(rect(IN.x0, 11.0, 36.6, 59.9), "Kisälli kitchen", [{ side: "x1", at: 46.0 }]),
    blk(rect(IN.x0, 5.6, 59.9, IN.z1), "south-west stair", [], "#d7d8d5"),
    blk(rect(5.6, 13.0, 60.6, IN.z1), "WC", [{ side: "x1", at: 62.5 }]),
    blk(rect(39.3, 43.3, 10.2, 23.2), "WC / rooms 1008–1017", [{ side: "x0", at: 14.0 }, { side: "x1", at: 19.0 }]),
    blk(rect(39.3, 43.3, 37.3, 44.0), "WC", [{ side: "x0", at: 40.5 }]),
    blk(rect(39.3, 43.3, 48.6, 61.4), "service centre", [{ side: "x0", at: 52.0 }, { side: "x0", at: 57.5 }]),
    blk(rect(46.2, 51.0, 34.43, 36.5), "east lifts", [], "#b9bdc0"),
    blk(rect(13.0, 15.0, 77.5, 79.5), "pavilion lift", [], "#b9bdc0"),
  ],
  columns: [
    [17.3, 30.0],
    [22.3, 30.0],
    [29.3, 30.0],
    [34.2, 30.0],
    [5.4, 30.0],
    [17.3, 54.1],
    [22.3, 54.1],
    [29.3, 54.1],
    [34.2, 54.1],
    [17.3, 59.5],
    [22.3, 59.5],
    [29.3, 59.5],
    [34.2, 59.5],
    [17.3, 71.2],
    [33.0, 71.2],
  ],
};

// ── Floor 2 (y_E 5.0) ───────────────────────────────────────────────────────

export const F2: FloorPlan = {
  y: 5.0,
  ceiling: 3.2,
  walls: [
    // 2001 Elias | 2002 Ivar | 2003 Erik | 2004 Johannes along the north-east facade.
    wall([IN.x0, 8.58], [42.5, 8.58], "plaster", [D(8.1 - IN.x0), D(18.3 - IN.x0), D(27.7 - IN.x0), D(38.1 - IN.x0)]),
    wall([12.38, IN.z0], [12.38, 8.58], "movable"),
    wall([22.34, IN.z0], [22.34, 8.58], "plaster"),
    wall([32.07, IN.z0], [32.07, 8.58], "movable"),
    wall([42.5, IN.z0], [42.5, 8.58], "plaster"),
    // 2067 (Saarioinen).
    wall([7.4, 8.58], [7.4, 20.7], "plaster", [D(11.0 - 8.58)]),
    wall([IN.x0, 20.7], [7.4, 20.7], "plaster"),
    // 2006 / 2007 (Valmet), L-shaped round the north-east stair.
    wall([44.2, 8.9], [44.2, 20.7], "plaster", [D(12.0 - 8.9)]),
    wall([44.2, 8.9], [46.0, 8.9], "plaster"),
    wall([46.0, 5.4], [46.0, 8.9], "plaster"),
    wall([46.0, 5.4], [IN.x1, 5.4], "core"),
    wall([44.2, 20.7], [IN.x1, 20.7], "plaster"),
    // 2072 Työkahvila / Aurinkokylpy (Business Turku): movable glass walls at its sides.
    wall([14.15, 16.8], [14.15, 35.3], "glass", [D(20.5 - 16.8, 2.4, 2.4), D(31.0 - 16.8, 2.4, 2.4)]),
    wall([37.2, 16.8], [37.2, 35.3], "glass", [D(20.5 - 16.8, 2.4, 2.4), D(32.6 - 16.8, 2.4, 2.4)]),
    // Kerttu (2065.1), a small glass room in the aula.
    wall([14.15, 25.4], [17.4, 25.4], "glass"),
    wall([17.4, 25.4], [17.4, 29.2], "glass", [D(1.9, 0.9, 2.2)]),
    wall([14.15, 29.2], [17.4, 29.2], "glass"),
    // Rooms round the atrium void: 2049, 2048 (west), 2023 / 2024 (east).
    wall([14.23, 35.41], [17.6, 35.41], "plaster"),
    wall([17.6, 35.41], [17.6, 41.0], "glass"),
    wall([14.32, 41.0], [19.48, 41.0], "plaster"),
    wall([19.48, 41.0], [19.48, 45.4], "glass"),
    wall([14.32, 45.4], [19.48, 45.4], "plaster"),
    wall([34.21, 35.53], [42.6, 35.53], "plaster", [D(36.0 - 34.21)]),
    wall([34.21, 35.53], [34.21, 48.7], "glass"),
    wall([37.25, 35.53], [37.25, 41.05], "plaster"),
    wall([34.21, 41.2], [42.6, 41.2], "plaster"),
    // 2026 Orvokki (DNA): L-shape; door from the lift lobby at the notch.
    wall([42.6, 35.53], [46.0, 35.53], "plaster", [D(44.3 - 42.6)]),
    wall([42.6, 35.53], [42.6, 41.2], "plaster"),
    wall([46.0, 35.53], [46.0, 36.6], "plaster"),
    wall([46.0, 36.6], [IN.x1, 36.6], "core"),
    wall([34.21, 48.7], [IN.x1, 48.7], "glass"),
    // 2029 / 2031 (Turku Energia), south of the void; door from the west corridor.
    wall([17.6, 48.9], [34.93, 48.9], "glass"),
    wall([34.93, 48.9], [34.93, 55.21], "glass"),
    wall([14.23, 55.21], [34.93, 55.21], "plaster"),
    wall([14.23, 45.42], [14.23, 55.21], "plaster", [D(50.0 - 45.42)]),
    wall([14.23, 45.42], [17.6, 45.42], "plaster"),
    wall([17.6, 45.42], [17.6, 48.9], "plaster"),
    // 2030 Evert (Meyer Turku) | 2028 | 2027 Frans (Apetit) on the south-west side.
    wall([9.16, 56.84], [34.78, 56.84], "plaster", [D(13.3 - 9.16), D(25.2 - 9.16)]),
    wall([9.16, 56.84], [9.16, IN.z1], "plaster"),
    wall([20.74, 56.84], [20.74, IN.z1], "plaster"),
    wall([24.5, 56.84], [24.5, IN.z1], "plaster"),
    wall([34.78, 56.84], [34.78, IN.z1], "glass"),
  ],
  blocks: [
    blk(rect(42.5, 46.0, IN.z0, 8.58), "stair landing"),
    blk(rect(46.0, IN.x1, IN.z0, 5.4), "north-east stair", [], "#d7d8d5"),
    blk(rect(14.15, 37.2, 10.3, 16.8), "rooms 2068–2070", [{ side: "z1", at: 17.0 }, { side: "z1", at: 30.0 }]),
    blk(rect(9.0, 13.0, 13.9, 31.1), "WC", [{ side: "x1", at: 16.0 }, { side: "x1", at: 27.0 }]),
    blk(rect(9.0, 13.0, 34.5, 42.4), "rooms", [{ side: "x1", at: 38.0 }]),
    blk(rect(9.0, 13.0, 48.6, 55.2), "WC", [{ side: "x1", at: 52.0 }]),
    blk(rect(38.65, 42.65, 10.3, 23.2), "WC", [{ side: "x0", at: 14.0 }, { side: "x1", at: 19.0 }]),
    blk(rect(38.65, 42.65, 27.2, 31.1), "2018", [{ side: "x0", at: 29.0 }]),
    blk(rect(IN.x0, 5.5, 20.7, 24.7), "rooms"),
    blk(rect(IN.x0, 5.5, 24.7, 30.9), "west stair", [], "#d7d8d5"),
    blk(rect(IN.x0, 5.4, 34.5, 36.5), "west lifts", [], "#b9bdc0"),
    blk(rect(IN.x0, 5.5, 37.6, 43.3), "rooms", [{ side: "x1", at: 40.0 }]),
    blk(rect(IN.x0, 7.11, 43.4, 48.46), "2042", [{ side: "x1", at: 46.0 }]),
    blk(rect(IN.x0, 5.67, 48.6, 52.1), "rooms", [{ side: "x1", at: 50.0 }]),
    blk(rect(IN.x0, 5.67, 52.23, 59.92), "2033", [{ side: "x1", at: 56.0 }]),
    blk(rect(IN.x0, 5.5, 59.92, IN.z1), "south-west stair", [], "#d7d8d5"),
    blk(rect(21.07, 24.17, 56.84, IN.z1), "2028"),
    blk(rect(46.0, IN.x1, 24.7, 30.9), "east stair", [], "#d7d8d5"),
    blk(rect(46.26, 51.12, 34.51, 36.38), "east lifts", [], "#b9bdc0"),
  ],
  columns: [
    [17.3, 30.0],
    [34.2, 30.0],
    [22.3, 16.4],
    [29.3, 16.4],
  ],
};

/** The atrium void through floor 2 over Taidon portaat and the stage (E). */
export const VOID_F2: V2[] = [
  [17.75, 35.3],
  [17.75, 41.0],
  [19.48, 41.0],
  [19.48, 45.4],
  [17.63, 45.4],
  [17.63, 48.87],
  [34.06, 48.87],
  [34.06, 35.3],
];

/** Outdoor floor-2 terrace (not walkable in the twin). */
export const TERRACE_F2: Rect = rect(34.93, IN.x1, 48.7, IN.z1);
