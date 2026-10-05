import type { V2, V3 } from "../../types";
import { PLAN_FRAMES, localToPlan, planToLocal } from "../../frame";

/**
 * BioCity in plan frame B (SPEC §1.3): metres, origin on the lobby centre
 * line, −z = plan up = compass 55.1° (NE, Jussin aukio), +x = compass 145.1°
 * (SE, towards Joki), +z = SW (Lemminkäisenkatu), −x = NW (Tykistökatu).
 * The module builds everything in this frame inside one group
 * (rotation.y = −θ, position (tx, 0, tz)); data handed to the engine
 * (colliders, walk areas, route legs, views) is converted with bToLocal.
 *
 * Sources (SPEC §3.1, §5, §7.1): the TTK vector plan (interiors.json /
 * interiors-walls.json), City of Turku LOD2 roofs + 2021 laser, photos
 * (Haroma 2020, TTK, Commons 2022). Pure data and maths — unit-tested.
 */

export const FRAME_B = PLAN_FRAMES.B;

export const bToLocal = (x: number, z: number): V2 => planToLocal(FRAME_B, x, z);
export const localToB = (x: number, z: number): V2 => localToPlan(FRAME_B, x, z);
/** A plan point at floor height y → campus V3. */
export const bToLocal3 = (x: number, y: number, z: number): V3 => {
  const [lx, lz] = bToLocal(x, z);
  return [round2(lx), y, round2(lz)];
};

export const round2 = (v: number) => Math.round(v * 100) / 100;

// ── Levels (SPEC §3.1.1 storey levels; §1.2 datum) ──────────────────────────

export const LEVEL = {
  /** Lobby floor (TTK level mark +23.264). */
  gf: 0.06,
  f2: 4.2,
  f3: 7.85,
  f4: 11.5,
  f5: 15.15,
  f6: 18.8,
  f7: 22.45,
  /** Roof membrane of the office wings (main roof). */
  roof: 26.15,
  /** Top of the facades / glass crown band. */
  parapet: 26.8,
  /** Rooftop technical storey roof and parapet. */
  tech: 30.68,
  techParapet: 30.95,
  /** Atrium barrel vault: eaves and crown. */
  vaultEaves: 30.64,
  vaultCrown: 33.87,
  /** Under-side of the arcade soffits (≈3.1 m clear above the walkways). */
  arcadeSoffit: 3.45,
  /** Top of the ground-storey fascia band = floor 2. */
  gfTop: 4.2,
  /** Ceilings of the ground-floor side bays under the office wings. */
  sideCeiling: 3.5,
  /** Ceiling of the one-storey wing (Aulagalleria, Maunon sali). */
  wingCeiling: 3.95,
  /** One-storey wing roofs (LOD2). */
  wingRoof: 4.57,
  auditoriumRoof: 5.39,
  vestibuleRoof: 3.14,
  connectorRoof: 3.5,
  /** Underside of the glass tower over its open ground floor (pilotis). */
  towerSoffit: 5.8,
  /** The dollhouse cut (setOpen): everything above is hidden. */
  cut: 4.5,
} as const;

/** Storey heights for the facade shader (ground storey 0.06 → 4.20, then 3.65 m). */
export const STOREY = 3.65;
export const GROUND_STOREY = 4.14;

/** Floor levels F2…F7 (for atrium walls, bridges, lift landings). */
export const UPPER_FLOORS = [LEVEL.f2, LEVEL.f3, LEVEL.f4, LEVEL.f5, LEVEL.f6, LEVEL.f7] as const;

// ── Geometry helpers ────────────────────────────────────────────────────────

const RAD = Math.PI / 180;

/** Point at plan bearing b (degrees clockwise from plan up, −z) and radius r around (cx, cz). */
export function polar(cx: number, cz: number, r: number, bearingDeg: number): V2 {
  const b = bearingDeg * RAD;
  return [cx + r * Math.sin(b), cz - r * Math.cos(b)];
}

/** Arc from bearing b0 to b1 (either direction) with about `step` metres between points (ends included). */
export function arcPoints(cx: number, cz: number, r: number, b0: number, b1: number, step = 1): V2[] {
  const len = Math.abs(b1 - b0) * RAD * r;
  const n = Math.max(1, Math.ceil(len / step));
  const out: V2[] = [];
  for (let i = 0; i <= n; i++) out.push(polar(cx, cz, r, b0 + ((b1 - b0) * i) / n));
  return out;
}

export function lerp2(a: V2, b: V2, t: number): V2 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

export function dist2(a: V2, b: V2): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** Point along a segment at distance s from a. */
export function along(a: V2, b: V2, s: number): V2 {
  return lerp2(a, b, s / dist2(a, b));
}

/** Outward normal of a facade run a→b (left → right seen from outside): (−dz, dx). */
export function runNormal(a: V2, b: V2): V2 {
  const l = dist2(a, b) || 1;
  return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
}

// ── Massing (SPEC §3.1.1, LOD2 in B) ────────────────────────────────────────

/** Key corners of the street (Tykistökatu) frontage. */
export const CORNER = {
  /** North corner of the N-block (Tykistökatu × the BioCity–Electrocity yard). */
  north: [-55.5, -31.63] as V2,
  /** N-block corner at the recess mouth (upper floors and the column at the GF). */
  recessN: [-43.57, -4.67] as V2,
  /** Glass-tower corner at the recess mouth. */
  recessS: [-37.84, 8.46] as V2,
  /** West corner (Tykistökatu × Lemminkäisenkatu). */
  west: [-34.03, 17.45] as V2,
  /** South corner (Lemminkäisenkatu, towards Joki). */
  south: [35.7, 17.45] as V2,
  /** East corners of the SW and NE wings. */
  eastSW: [35.98, 5.53] as V2,
  eastNE: [36.1, -4.45] as V2,
  /** NE wing's east corner on the courtyard side. */
  eastN: [36.12, -31.42] as V2,
} as const;

/** NE office wing (+ N-block + E end), upper floors: the courtyard facade line. */
export const NE_FACADE_Z = -31.55;
/** Atrium side of the NE wing / N-block's recess wall. */
export const ATRIUM_NE_Z = -4.75;
/** Atrium side of the SW wing. */
export const ATRIUM_SW_Z = 5.95;
/** SW (Lemminkäisenkatu) facade line of the upper floors. */
export const SW_FACADE_Z = 17.45;
/** The atrium: lobby floor between the column rows, vault from end to end. */
export const ATRIUM = { x0: -29.8, x1: 29.5, z0: -4.6, z1: 6.3 } as const;
/** Glazed atrium gables: Tykistökatu (west) on the recess, east over the Joki connector. */
export const GABLE_W_X = -30.05;
export const GABLE_E_X = 29.5;

/** Footprint of the north half above the ground storey (N-block + NE wing + E end), CCW from above. */
export const NORTH_UPPER: V2[] = [
  CORNER.north,
  CORNER.recessN,
  [GABLE_W_X, ATRIUM_NE_Z],
  [ATRIUM.x1, ATRIUM_NE_Z],
  [29.8, CORNER.eastNE[1]],
  CORNER.eastNE,
  CORNER.eastN,
  [-29.12, NE_FACADE_Z],
];

/** Footprint of the SW wing above the ground storey (incl. the glass tower), CCW from above. */
export const SOUTH_UPPER: V2[] = [
  [-30.18, 5.51],
  CORNER.recessS,
  CORNER.west,
  CORNER.south,
  CORNER.eastSW,
  [29.5, 5.6],
  [ATRIUM.x1, ATRIUM_SW_Z],
  [GABLE_W_X, ATRIUM_SW_Z],
];

/** Glass corner tower (W corner) and its open ground floor (pilotis) — upper floors from the soffit. */
export const TOWER: V2[] = [[-30.18, 5.51], CORNER.recessS, CORNER.west, [-24.0, SW_FACADE_Z], [-24.0, 14.6], [-30.3, 14.6]];

/** Rooftop technical storeys (26.15 → 30.68): NE bar with a notch, SW bar with a notch. */
export const TECH_NE: V2[] = [
  [-40.3, -31.5],
  [-40.3, -8.3],
  [-30.6, -8.3],
  [-30.6, ATRIUM_NE_Z],
  [30.0, ATRIUM_NE_Z],
  [30.0, -31.5],
];
export const TECH_SW: V2[] = [
  [-24.6, 15.1],
  [23.6, 15.1],
  [23.6, ATRIUM_SW_Z],
  [-21.6, ATRIUM_SW_Z],
  [-21.6, 11.0],
  [-24.6, 11.0],
];

/** Penthouses on the NE technical storey (to y 33.7). */
export const PENTHOUSES: { poly: V2[]; top: number }[] = [
  { poly: [[-22.3, -27.0], [-22.3, -21.7], [-17.8, -21.7], [-17.8, -27.0]], top: 33.76 },
  { poly: [[19.4, -26.9], [19.4, -21.5], [23.9, -21.5], [23.9, -26.9]], top: 33.71 },
];

/** Atrium vault: segmental arch across z, crown line along x (SPEC: span 10.9 m, rise 3.23 m). */
export const VAULT = (() => {
  const half = (ATRIUM.z1 - ATRIUM.z0) / 2;
  const rise = LEVEL.vaultCrown - LEVEL.vaultEaves;
  const radius = (half * half + rise * rise) / (2 * rise);
  const cz = (ATRIUM.z0 + ATRIUM.z1) / 2;
  const cy = LEVEL.vaultCrown - radius;
  /** Half-angle of the arch (rad). */
  const halfAngle = Math.asin(half / radius);
  return { x0: ATRIUM.x0, x1: ATRIUM.x1, cz, cy, radius, halfAngle, half, rise };
})();

/** Height of the vault's intrados at plan z (eaves outside the span). */
export function vaultY(z: number): number {
  const d = z - VAULT.cz;
  if (Math.abs(d) >= VAULT.half) return LEVEL.vaultEaves;
  return VAULT.cy + Math.sqrt(VAULT.radius * VAULT.radius - d * d);
}

/** Recessed full-height glazed slots in the SW facade (low roofs 3.13 / 1.85, open above). */
export const SW_SLOTS: { x0: number; x1: number; back: number; roof: number }[] = [
  { x0: -24.0, x1: -18.9, back: 15.0, roof: 3.13 },
  { x0: 17.6, x1: 22.9, back: 15.1, roof: 1.85 },
];

/** N-block Tykistökatu face, measured from the north corner (m along the face). */
export const NBLOCK_FACE = {
  length: dist2(CORNER.north, CORNER.recessN),
  /** Corner band with the vertical BIOCITY letters (SPEC ≈7 m). */
  band: [0, 7.6] as const,
  /** Curtain-wall field over F2–F6 (8 modules of 1.2 m). */
  field: [8.0, 17.6] as const,
  /** Blank black mesh sign panel (tenant logos not reproduced), ≈7.6 × 15 m. */
  sign: [18.6, 26.2] as const,
  /** Vertical BIOCITY sign: centre (m from the corner), width, bottom, top (Haroma 01). */
  letters: { at: 2.6, width: 1.1, y0: 5.4, y1: 20.9 },
} as const;

// ── One-storey NE wing (Aulagalleria, Maunon sali, auditorium) ─────────────

/** Aulagalleria curved glass: centre and radii (glass mid-line), exterior between ±20.9°. */
export const GALLERY = { cx: 0, cz: -14.4, rInner: 19.82, rGlass: 20.2, rOuter: 20.56, extBearing: 20.9 } as const;

/** Event entrance vestibule (Jussin aukio), glazed box. */
export const VESTIBULE = { x0: -1.75, x1: 1.8, z0: -36.1, z1: -34.55, roof: LEVEL.vestibuleRoof } as const;

/**
 * The vestibule's doors (TTK plan): a double door pair in its front (≈1.8–1.9 m clear) and double
 * doors into the Aulagalleria (2.4 m) at innerZ. Both stand open for the event.
 */
export const VESTIBULE_DOOR = { half: 0.95, head: 2.43, innerZ: -34.6, innerHalf: 1.2, leaf: 0.92, innerLeaf: 1.15 } as const;

/** The open door leaves (plan B, hinge → free edge): the outer pair swung out 92°, the inner pair in. */
export function vestibuleLeaves(): [V2, V2][] {
  const out: [V2, V2][] = [];
  const swing = (92 * Math.PI) / 180;
  for (const side of [-1, 1]) {
    const hx = side * VESTIBULE_DOOR.half;
    // Outwards = −z; a leaf turns from lying along the opening (towards x = 0) out of the vestibule.
    out.push([
      [hx, VESTIBULE.z0 - 0.04],
      [hx - side * VESTIBULE_DOOR.leaf * Math.cos(swing), VESTIBULE.z0 - 0.04 - VESTIBULE_DOOR.leaf * Math.sin(swing)],
    ]);
    const ix = side * VESTIBULE_DOOR.innerHalf;
    out.push([
      [ix, VESTIBULE_DOOR.innerZ + 0.04],
      [ix - side * VESTIBULE_DOOR.innerLeaf * Math.cos(swing), VESTIBULE_DOOR.innerZ + 0.04 + VESTIBULE_DOOR.innerLeaf * Math.sin(swing)],
    ]);
  }
  return out;
}

/** Auditorium fan: outer back-wall arc around this centre. */
export const AUDITORIUM = { cx: -11.31, cz: -29.87, r: 18.3 } as const;

/** Exterior outline of the one-storey wing, from Maunon sali's east curve round to the auditorium's west end. */
export function wingOutline(): { points: V2[]; height: number[] } {
  const pts: V2[] = [];
  const h: number[] = [];
  const push = (p: V2, height: number) => {
    const last = pts[pts.length - 1];
    if (last && dist2(last, p) < 0.05) return;
    pts.push(p);
    h.push(height);
  };
  // Maunon sali: east curve, north wall, west diagonal.
  for (const p of [[27.83, -31.59], [27.55, -33.6], [27.24, -35.29], [26.57, -37.83], [25.06, -39.86], [11.52, -40.02], [7.03, -33.4]] as V2[])
    push(p, LEVEL.wingRoof);
  // Aulagalleria east arc to the vestibule.
  for (const p of arcPoints(GALLERY.cx, GALLERY.cz, GALLERY.rOuter, GALLERY.extBearing, 5.0, 1.2)) push(p, LEVEL.wingRoof);
  // Vestibule.
  for (const p of [[VESTIBULE.x1, VESTIBULE.z1], [VESTIBULE.x1, VESTIBULE.z0], [VESTIBULE.x0, VESTIBULE.z0], [VESTIBULE.x0, VESTIBULE.z1]] as V2[])
    push(p, LEVEL.vestibuleRoof);
  for (const p of arcPoints(GALLERY.cx, GALLERY.cz, GALLERY.rOuter, -5.0, -GALLERY.extBearing, 1.2)) push(p, LEVEL.wingRoof);
  // Takatila diagonal and the auditorium.
  push([-7.13, -33.3], LEVEL.wingRoof);
  push([-11.61, -40.05], LEVEL.auditoriumRoof);
  push([-11.67, -48.05], LEVEL.auditoriumRoof);
  for (const p of arcPoints(AUDITORIUM.cx, AUDITORIUM.cz, AUDITORIUM.r, -1.6, -84.5, 1.5)) push(p, LEVEL.auditoriumRoof);
  push([-29.12, NE_FACADE_Z], LEVEL.auditoriumRoof);
  return { points: pts, height: h };
}

// ── Ground floor (SPEC §7.1, interiors.json) ────────────────────────────────

/** Main lobby / build hall. */
export const LOBBY = { x0: -30.05, x1: 30.1, z0: -4.96, z1: 6.0 } as const;

/** Columns: lobby edge rows (0.38 m square, black), x = 0.16 + 6k. */
export const COLUMN_X = [-29.84, -23.84, -17.84, -11.84, -6.04, -5.65, 0.16, 6.16, 12.16, 18.16, 24.16, 30.16, 36.16] as const;
export const COLUMN_ROWS = { lobbyNE: -4.95, lobbySW: 6.15, gallery: -30.95, arcade: 17.05 } as const;

/** Round black arcade/pilotis columns (Ø0.5–0.6): SW arcade, Tykistökatu overhang, glass-tower corners. */
export const ROUND_COLUMNS: { x: number; z: number; d: number }[] = [
  ...[-23.84, -17.84, -11.84, -5.84, 0.16, 6.16, 12.16, 18.16, 24.16, 30.16, 36.16].map((x) => ({ x, z: COLUMN_ROWS.arcade, d: 0.5 })),
  // Tykistökatu overhang of the N-block (pairs at two spots).
  { x: -54.44, z: -30.95, d: 0.5 },
  { x: -51.44, z: -24.15, d: 0.5 },
  { x: -51.04, z: -23.25, d: 0.5 },
  { x: -48.71, z: -17.95, d: 0.5 },
  { x: -46.37, z: -12.65, d: 0.5 },
  { x: -45.97, z: -11.75, d: 0.5 },
  { x: -42.99, z: -4.94, d: 0.55 },
  // Glass-tower pilotis: recess corner, west corner, SW edge.
  { x: -36.8, z: 9.03, d: 0.6 },
  { x: -33.18, z: 16.95, d: 0.6 },
  { x: -29.73, z: 16.9, d: 0.6 },
];

/** Large black oval columns of the meeting-room block (0.85 × 1.3 m). */
export const OVAL_COLUMNS: V2[] = [
  ...[-17.84, -11.84, -5.84, 0.16, 6.16, 12.16, 18.16].map((x): V2 => [x, -12.2]),
  ...[-11.84, -5.84, 0.16, 6.16, 12.16, 18.16].map((x): V2 => [x, -23.7]),
];

/** Square columns in the Aulagalleria / Maunon sali (0.4 m) and the gallery's double columns (0.38 m). */
export const GALLERY_COLUMNS: V2[] = [
  [-23.84, -30.95],
  [-17.84, -30.95],
  [-11.84, -30.95],
  [-6.04, -30.95],
  [-5.65, -30.95],
  [0.16, -30.95],
  [5.97, -30.95],
  [6.35, -30.95],
  [12.16, -30.95],
  [18.16, -30.95],
  [24.16, -30.95],
  [-2.0, -33.91],
  [2.32, -33.91],
  [-7.13, -32.8],
  [7.45, -32.8],
  [12.12, -39.43],
  [18.16, -39.45],
  [24.16, -39.45],
];

/** Vertical circulation islands in the lobby (SPEC §7.1). */
export const ISLANDS = {
  stairA: { x0: -25.55, x1: -20.6, z0: 1.6, z1: 5.15 },
  liftsA: { x0: -18.0, x1: -15.45, z0: 0.93, z1: 5.38 },
  kiosk: { x0: 14.57, x1: 17.92, z0: 2.92, z1: 5.28 },
  liftsB: { x0: 18.4, x1: 21.2, z0: 0.9, z1: 5.9 },
  stairB: { x0: 23.9, x1: 28.7, z0: 1.6, z1: 5.15 },
} as const;

/** Retail glass front (with the glazed lean-to) on the lobby's SW side. */
export const RETAIL_FRONT = { x0: -11.05, x1: 13.95, z: 4.05, back: 6.0 } as const;

/** Restaurant indoor terrace reserved on the 3 Oct setup plan (no build tables). */
export const TERRACE = { x0: -30.05, x1: -20.6, z0: -4.96, z1: -0.5 } as const;

/** Tykistökatu entrance ("BioCity A"): glass line, revolving drum, canopy (SPEC §3.1.4). */
export const ENTRANCE_TYK = {
  /** Threshold on the gable glass line. */
  threshold: [GABLE_W_X, 0.5] as V2,
  /** Automatic revolving door just inside the gable glass (TTK plan); its mouth opens in the glass. */
  drum: { x: -27.98, z: 0.58, r: 1.45, enclosure: 1.725 },
  /** Opening in the gable glass in front of the drum (between its curved side walls). */
  opening: { z0: -0.1, z1: 1.26 },
  canopy: { x0: -31.6, x1: -30.0, z0: -1.47, z1: 2.04, under: 2.6, top: 2.9 },
} as const;

/** Passage to Joki: lobby threshold, stair (10 treads × 0.30 m, 0.06 → −1.70) and the wall opening. */
export const JOKI_PASSAGE = {
  threshold: 30.1,
  stairX0: 33.0,
  stairX1: 36.41,
  z0: -1.08,
  z1: 2.13,
  wallX0: 36.41,
  wallX1: 36.92,
  treads: 10,
  bottom: -1.7,
} as const;

/** The passage corridor's mouth on the lobby (between the TTK plan's wall stubs at x 30.11–30.21). */
export const PASSAGE_MOUTH = { x: 30.16, z0: -0.53, z1: 1.58 } as const;

/** Maunon sali (meals) and the serving lines (SPEC §7.1). */
export const MAUNO = {
  hall: [
    [7.1, -33.0],
    [11.3, -40.05],
    [25.6, -40.05],
    [26.6, -39.0],
    [27.5, -37.3],
    [28.0, -35.0],
    [28.4, -33.0],
    [28.4, -30.95],
    [12.16, -30.78],
  ] as V2[],
  /** Serving line 1: a counter run in the zone south of the hall. */
  line1: { x0: 16.0, x1: 20.3, z0: -29.75, z1: -28.85 },
  /** Serving line 2: island counter + wall counter under the hood. */
  line2: { x0: 26.9, x1: 28.2, z0: -21.6, z1: -17.6 },
  hood: { x0: 29.5, x1: 30.5, z0: -21.6, z1: -17.6 },
  /** Bistro U-bar (closed area of the café). */
  bar: { x0: 21.4, x1: 26.4, z0: -15.3, z1: -8.5 },
} as const;

/** The open-to-sky Tykistökatu recess (syvänne) floor, CAD. */
export const RECESS: V2[] = [
  [-42.8, -4.6],
  [-30.05, -4.9],
  [-30.05, 5.6],
  [-30.6, 5.6],
  [-37.5, 8.3],
];

/** Flag poles at the recess mouth: five sockets at 2 m, poles at 1, 3 and 5 (SPEC §5.2). */
export const FLAGPOLES: { x: number; z: number; pole: boolean }[] = [
  { x: -38.58, z: 5.46, pole: true },
  { x: -39.39, z: 3.63, pole: false },
  { x: -40.19, z: 1.8, pole: true },
  { x: -40.99, z: -0.04, pole: false },
  { x: -41.79, z: -1.87, pole: true },
];
export const FLAGPOLE_HEIGHT = 10;

// ── Build tables (SPEC §7.1 [D] layout: 56 tables, 280 seats) ───────────────

export interface TableSpot {
  x: number;
  z: number;
}

/**
 * Table centres (plan B): 1.8 × 0.8 m tables with the long side along z, rows at
 * z −3.74, −1.94 | central walkway | 1.30, 3.10; columns x = −13.4 + 2.2k
 * (k = 0…12) on all four rows plus x −15.6 and +15.2 on the two −z rows.
 */
export function buildTables(): TableSpot[] {
  const out: TableSpot[] = [];
  const rowsNE = [-3.74, -1.94];
  const rowsSW = [1.3, 3.1];
  for (let k = 0; k <= 12; k++) {
    const x = round2(-13.4 + 2.2 * k);
    for (const z of [...rowsNE, ...rowsSW]) out.push({ x, z });
  }
  for (const x of [-15.6, 15.2]) for (const z of rowsNE) out.push({ x, z });
  return out;
}

/** Chair spots for a table: 3 on its −x side, 2 on its +x side; yaw so the sitter faces the table. */
export function chairsFor(t: TableSpot): { x: number; z: number; ry: number }[] {
  const out: { x: number; z: number; ry: number }[] = [];
  // A chair's sitter faces −z at ry = 0; facing +x needs ry = −π/2, facing −x ry = +π/2.
  for (const dz of [-0.6, 0, 0.6]) out.push({ x: t.x - 0.62, z: t.z + dz, ry: -Math.PI / 2 });
  for (const dz of [-0.45, 0.45]) out.push({ x: t.x + 0.62, z: t.z + dz, ry: Math.PI / 2 });
  return out;
}

// ── Visibility / tech partner stands (SPEC §7.1) ────────────────────────────

export interface StandPose {
  id: string;
  /** Centre (plan B). */
  x: number;
  z: number;
  /** Plan direction the stand's front faces (unit). */
  face: V2;
  /** Long side (m) and depth (m). */
  width: number;
  depth: number;
  /** Render as an open spot marker only (no counter) — bc-4 sits in the reserved terrace. */
  markerOnly?: boolean;
}

/** Stands 1 and 3 turn 12° from the curved glass towards the event entrance (all that fits: column behind, glass in front). */
const TURN = (12 * Math.PI) / 180;

export const STANDS: StandPose[] = [
  // Red Hat: back to the double column, front turned towards the event-entrance vestibule (glass ≈0.3–0.9 m away).
  { id: "bc-1", x: 6.45, z: -31.82, face: [-Math.sin(TURN), -Math.cos(TURN)], width: 2.0, depth: 1.0 },
  // Solita: lobby east end by the Joki passage, facing the build hall.
  { id: "bc-2", x: 26.35, z: -2.81, face: [-1, 0], width: 2.0, depth: 1.0 },
  // Open stand mirrored at the west side of the event entrance.
  { id: "bc-3", x: -6.45, z: -31.82, face: [Math.sin(TURN), -Math.cos(TURN)], width: 2.0, depth: 1.0 },
  // Open stand at the lobby's west end (inside the reserved restaurant terrace — organiser to resolve).
  { id: "bc-4", x: -24.46, z: -3.62, face: [1, 0], width: 2.0, depth: 1.0, markerOnly: true },
];

/** Label group of the four stand labels: the biocity:stands view shows the group in full (phones too). */
export const STAND_LABEL_GROUP = "biocity-stands";

// ── Event route legs inside BioCity (DESIGN §12) ────────────────────────────

/** The build hall's central walkway between the table blocks (plan z). */
export const WALKWAY_Z = -0.32;

/**
 * Indoor route legs in plan B at floor height (y). First/last points are where routes.json joins
 * (Tykistökatu threshold, event-entrance vestibule, Joki Aula); the corridor path round the
 * meeting-room block follows the research team's wall-checked line (SPEC §6.3).
 */
/**
 * Through the revolving door: in at the recess mouth, round the centre post on its +z side (keep
 * right; the wings turn with the walker, door.ts), out at the lobby mouth. ≥ 0.3 m from the curved
 * walls and the mouths' edges, ≥ 0.8 m from the post.
 */
export const DOOR_PATH_B: V3[] = [
  [-30.05, LEVEL.gf, 0.5],
  [-29.35, LEVEL.gf, 0.85],
  [-28.6, LEVEL.gf, 1.3],
  [-27.98, LEVEL.gf, 1.42],
  [-27.36, LEVEL.gf, 1.3],
  [-26.61, LEVEL.gf, 0.85],
  [-25.8, LEVEL.gf, 0.45],
];

export const ROUTE_LEGS_B: Record<string, V3[]> = {
  // Tykistökatu threshold → revolving door → the build hall's central walkway → passage stair → Joki Aula.
  "int-bio-tyk-to-joki": [
    ...DOOR_PATH_B,
    [-24.8, LEVEL.gf, WALKWAY_Z],
    [29.2, LEVEL.gf, WALKWAY_Z],
    [30.6, LEVEL.gf, 0.5],
    [33.0, LEVEL.gf, 0.5],
    [36.0, JOKI_PASSAGE.bottom, 0.5],
    [37.4, JOKI_PASSAGE.bottom, 0.5],
  ],
  // Tykistökatu → build hall → east ring corridor → Aulagalleria → beside Red Hat's stand (bc-1).
  "int-bio-tyk-to-gallery": [
    ...DOOR_PATH_B,
    [-24.8, LEVEL.gf, WALKWAY_Z],
    [18.4, LEVEL.gf, WALKWAY_Z],
    [19.9, LEVEL.gf, -1.8],
    [19.9, LEVEL.gf, -20.0],
    [20.1, LEVEL.gf, -26.3],
    [15.0, LEVEL.gf, -28.0],
    [10.01, LEVEL.gf, -29.6],
    [8.3, LEVEL.gf, -31.55],
  ],
  // Event entrance (Jussin aukio) → Aulagalleria → east ring corridor → the build hall's walkway.
  "int-bio-event-to-lobby": [
    [0.02, LEVEL.gf, -35.3],
    [0.0, LEVEL.gf, -32.8],
    [3.0, LEVEL.gf, -30.2],
    [10.01, LEVEL.gf, -29.6],
    [15.0, LEVEL.gf, -28.0],
    [20.1, LEVEL.gf, -26.3],
    [19.9, LEVEL.gf, -20.0],
    [19.9, LEVEL.gf, -1.8],
    [18.4, LEVEL.gf, WALKWAY_Z],
    [14.0, LEVEL.gf, WALKWAY_Z],
  ],
};

/** Every indoor leg in the campus frame (rounded), plus the reverse of the event leg. */
export function routeLegsLocal(): Record<string, V3[]> {
  const out: Record<string, V3[]> = {};
  for (const [id, pts] of Object.entries(ROUTE_LEGS_B)) out[id] = pts.map(([x, y, z]) => bToLocal3(x, y, z));
  out["int-bio-lobby-to-event"] = [...out["int-bio-event-to-lobby"]].reverse();
  return out;
}

// ── Ground-floor surfaces ────────────────────────────────────────────────────

/** Interior floor of the ground storey (lobby level 0.06), with a cut-out for the Joki passage stair. */
export function groundFloorRing(): V2[] {
  const wing = wingOutline().points;
  return [
    ...wing,
    [-52.3, -31.6],
    [-41.4, -4.75],
    [GABLE_W_X, -4.62],
    [GABLE_W_X, 5.6],
    [-30.0, 5.6],
    [-30.0, 14.6],
    [36.6, 14.6],
    [36.92, 14.55],
    [36.92, JOKI_PASSAGE.z1],
    [JOKI_PASSAGE.stairX0, JOKI_PASSAGE.z1],
    [JOKI_PASSAGE.stairX0, JOKI_PASSAGE.z0],
    [36.92, JOKI_PASSAGE.z0],
    [36.92, -12.75],
    [36.2, -12.75],
    [36.2, -31.85],
  ];
}

/** Dark 600 mm tiles of the Mauno restaurant: the hall, the serving-line zones and the bistro. */
export const MAUNO_FLOORS: V2[][] = [
  MAUNO.hall,
  [
    [12.3, -30.95],
    [28.4, -30.95],
    [30.3, -30.95],
    [30.3, -15.2],
    [20.6, -15.2],
    [17.0, -26.9],
  ],
  [
    [20.4, -15.2],
    [36.2, -15.2],
    [36.2, -5.0],
    [20.4, -5.0],
  ],
];

/** Ceilings: side bays under the office wings (3.5 m) and the one-storey wing (3.95 m). */
export function ceilingRings(): { ring: V2[]; y: number }[] {
  const wing = wingOutline().points;
  return [
    {
      ring: [
        [-52.3, -31.6],
        [36.2, -31.85],
        [36.2, -4.96],
        [LOBBY.x0, -4.96],
        [GABLE_W_X, -4.62],
        [-41.4, -4.75],
      ],
      y: LEVEL.sideCeiling,
    },
    { ring: ([...wing, [-29.12, NE_FACADE_Z], [27.83, NE_FACADE_Z]] as V2[]).filter((p, i, a) => i === 0 || dist2(p, a[i - 1]) > 0.05), y: LEVEL.wingCeiling },
    {
      ring: [
        [-30.0, 6.2],
        [RETAIL_FRONT.x0, 6.2],
        [RETAIL_FRONT.x0, RETAIL_FRONT.back],
        [RETAIL_FRONT.x1, RETAIL_FRONT.back],
        [RETAIL_FRONT.x1, 5.8],
        [30.1, 5.8],
        [36.6, 5.8],
        [36.6, 14.6],
        [-30.0, 14.6],
      ],
      y: LEVEL.sideCeiling,
    },
  ];
}

export type FrontKind = "shop" | "glass" | "office" | "wall";

/** Fronts of the units round the lobby (TTK plan): NE side faces +z, SW side faces −z. */
export const LOBBY_FRONTS: { x0: number; x1: number; z: number; side: "ne" | "sw"; kind: FrontKind }[] = [
  { x0: -29.65, x1: -24.03, z: -4.97, side: "ne", kind: "shop" },
  { x0: -23.65, x1: -20.81, z: -4.97, side: "ne", kind: "shop" },
  { x0: -17.62, x1: -9.6, z: -4.97, side: "ne", kind: "glass" },
  { x0: -9.39, x1: -6.25, z: -4.97, side: "ne", kind: "shop" },
  { x0: -5.45, x1: -0.03, z: -4.97, side: "ne", kind: "shop" },
  { x0: 0.35, x1: 5.78, z: -4.97, side: "ne", kind: "shop" },
  { x0: 6.54, x1: 11.92, z: -4.97, side: "ne", kind: "office" },
  { x0: 12.35, x1: 15.93, z: -4.97, side: "ne", kind: "office" },
  { x0: -29.68, x1: -17.65, z: 6.2, side: "sw", kind: "shop" },
  { x0: -17.65, x1: -11.94, z: 5.99, side: "sw", kind: "shop" },
  { x0: 13.95, x1: 18.2, z: 5.8, side: "sw", kind: "shop" },
  { x0: 18.2, x1: 24.1, z: 6.0, side: "sw", kind: "wall" },
  { x0: 24.1, x1: 30.1, z: 5.9, side: "sw", kind: "office" },
];

/** Bridges across the atrium (glass balustrades): east end on F2/F4/F6, west end on F3/F5. */
export const BRIDGES: { x0: number; x1: number; y: number }[] = [
  { x0: 28.0, x1: 29.35, y: LEVEL.f2 },
  { x0: 28.0, x1: 29.35, y: LEVEL.f4 },
  { x0: 28.0, x1: 29.35, y: LEVEL.f6 },
  { x0: -29.65, x1: -28.3, y: LEVEL.f3 },
  { x0: -29.65, x1: -28.3, y: LEVEL.f5 },
];
