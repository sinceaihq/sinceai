import { mulberry32 } from "../../util";
import { BLOCK, BRIDGES, LEVEL, PAVILION, STOREYS, brickTop, massTop } from "./frame";

/**
 * EduCity's square windows (SPEC §3.3.3): Kolumba brick punched with square
 * windows of three sizes at random — S 1.1–1.3 m, M 2.1–2.3 m, L 2.8–3.1 m
 * (outer size incl. the 70 mm black-bronze frame).
 *
 * - North-east facade (Joukahaisenkatu): all 65 windows measured on a
 *   rectified photograph (homography from the facade corners, x ±0.2 m,
 *   heights anchored at the LOD2 parapet ±0.4 m).
 * - South-east facade (the walkway to door B): 71 windows read from the
 *   architect's elevation (research `educity_massing.json`).
 * - North-west and south-west facades: no measured lists — a deterministic
 *   scatter with the same rules (size mix, density per storey, sill rhythm).
 *
 * Openings that sit above a terrace floor behind the brick are holes in a
 * free-standing screen wall (no glass): `open`.
 */

export type Facade = "NE" | "SE" | "SW" | "NW";

export interface WindowSpec {
  facade: Facade;
  /** Centre along the facade axis (E metres): x for NE/SW, z for SE/NW. */
  s: number;
  /** Centre height (y_E). */
  y: number;
  /** Outer size (square), metres. */
  size: number;
  /** A hole in a screen wall with a terrace behind — no frame glass. */
  open?: boolean;
}

/** [x_E, y_E, size] — north-east facade, measured. */
const NE: [number, number, number][] = [
  [50.4, 23.35, 1.15],
  [41.06, 22.52, 2.92],
  [37.01, 23.18, 1.19],
  [30.7, 22.84, 2.23],
  [23.28, 23.17, 1.19],
  [20.56, 22.82, 2.19],
  [14.74, 22.48, 2.86],
  [9.4, 23.11, 1.1],
  [6.98, 22.77, 2.08],
  [2.17, 23.05, 1.15],
  [48.55, 20.03, 1.21],
  [44.4, 18.25, 2.27],
  [41.73, 19.26, 1.2],
  [37.52, 18.95, 2.21],
  [31.02, 18.62, 2.88],
  [23.8, 18.95, 2.21],
  [19.11, 18.6, 2.85],
  [16.06, 19.24, 1.17],
  [9.14, 18.93, 2.15],
  [6.55, 19.23, 1.15],
  [3.88, 18.23, 2.1],
  [50.4, 16.02, 1.18],
  [41.73, 15.32, 1.2],
  [44.4, 14.33, 2.27],
  [36.01, 14.68, 2.94],
  [32.94, 15.32, 1.21],
  [26.26, 14.68, 2.9],
  [23.25, 15.32, 1.17],
  [20.56, 15.05, 2.19],
  [15.54, 14.38, 2.17],
  [7.03, 15.05, 2.1],
  [2.99, 14.68, 2.85],
  [48.44, 11.52, 1.21],
  [44.39, 10.36, 2.23],
  [41.71, 11.39, 1.23],
  [37.52, 11.1, 2.21],
  [30.27, 10.92, 1.25],
  [27.47, 10.44, 2.23],
  [24.83, 11.43, 1.21],
  [19.06, 10.83, 2.88],
  [16.03, 11.44, 1.19],
  [10.72, 11.17, 2.19],
  [8.1, 11.49, 1.19],
  [3.83, 10.52, 2.15],
  [49.67, 8.53, 2.21],
  [44.39, 6.42, 2.23],
  [40.2, 6.97, 1.19],
  [37.17, 6.82, 2.92],
  [32.94, 7.5, 1.21],
  [27.47, 6.55, 2.23],
  [24.83, 7.54, 1.21],
  [20.53, 7.26, 2.19],
  [14.69, 6.97, 2.81],
  [2.95, 6.98, 2.9],
  [50.19, 3.67, 1.17],
  [47.26, 2.22, 1.18],
  [44.39, 1.54, 2.23],
  [41.71, 2.02, 1.23],
  [36.06, 1.95, 2.88],
  [32.5, 2.29, 2.29],
  [26.3, 2.68, 1.19],
  [23.67, 2.35, 2.21],
  [18.28, 2.72, 1.19],
  [13.4, 1.82, 2.8],
  [2.1, 2.57, 2.2],
];

/** [z_E, y_E, size] — south-east facade, from the architect's elevation (±0.15 m). */
const SE: [number, number, number][] = [
  [2.2, 24.0, 1.08],
  [26.7, 24.0, 1.03],
  [9.6, 22.8, 1.08],
  [15.3, 22.8, 1.08],
  [38.2, 22.4, 1.13],
  [29.8, 22.3, 1.08],
  [12.4, 22.2, 2.83],
  [7.0, 21.9, 2.15],
  [32.7, 21.9, 2.05],
  [1.7, 21.2, 2.1],
  [29.0, 19.0, 1.08],
  [13.4, 18.9, 1.08],
  [6.6, 18.9, 1.03],
  [39.5, 18.9, 1.03],
  [43.0, 18.4, 1.17],
  [10.4, 18.3, 2.83],
  [32.7, 18.2, 2.78],
  [4.4, 17.4, 1.03],
  [26.2, 16.5, 2.05],
  [7.3, 14.9, 1.03],
  [45.7, 14.7, 2.2],
  [10.0, 14.6, 2.15],
  [49.8, 14.5, 1.17],
  [37.5, 14.5, 1.08],
  [43.2, 14.5, 1.22],
  [29.8, 14.4, 1.03],
  [14.5, 14.3, 2.83],
  [32.7, 13.9, 2.05],
  [3.9, 13.1, 2.0],
  [25.8, 12.0, 1.08],
  [29.0, 11.1, 1.03],
  [15.3, 11.0, 1.08],
  [46.2, 11.0, 1.08],
  [52.4, 10.7, 2.15],
  [12.7, 10.7, 2.1],
  [43.6, 10.7, 2.1],
  [55.3, 10.5, 1.22],
  [38.3, 10.3, 2.83],
  [4.4, 10.1, 1.03],
  [7.0, 9.9, 2.15],
  [19.3, 9.9, 2.1],
  [32.7, 9.9, 2.05],
  [26.8, 8.1, 1.03],
  [6.6, 7.0, 1.08],
  [13.4, 7.0, 1.08],
  [29.4, 7.0, 2.05],
  [47.5, 7.0, 1.08],
  [50.8, 6.7, 2.15],
  [57.7, 6.7, 2.15],
  [55.2, 6.5, 1.13],
  [17.6, 6.5, 1.08],
  [37.5, 6.5, 1.08],
  [41.7, 6.5, 1.08],
  [60.4, 6.5, 1.17],
  [10.4, 6.3, 2.83],
  [44.6, 6.3, 2.78],
  [32.7, 6.2, 2.78],
  [64.6, 4.5, 0.98],
  [3.9, 4.4, 2.05],
  [26.2, 3.6, 2.0],
  [38.7, 2.0, 2.1],
  [43.6, 2.0, 2.1],
  [50.9, 2.0, 2.05],
  [55.7, 2.0, 2.1],
  [63.2, 2.0, 2.05],
  [7.0, 1.7, 2.1],
  [11.1, 1.5, 1.08],
  [18.4, 1.5, 1.08],
  [46.2, 1.5, 1.08],
  [58.3, 1.5, 1.08],
  [1.7, -0.4, 2.1],
];

/** Door B portal on the south-east facade (z_E) and the single glass door beside it. */
export const DOOR_B = { z0: 31.1, z1: 34.3, top: 3.05, depth: 0.7, side: { z0: 29.2, z1: 30.35, top: 2.75 } } as const;

/** Clear zones on the scattered facades (no windows): bridges, doors. */
interface Keepout {
  facade: Facade;
  s0: number;
  s1: number;
  y0: number;
  y1: number;
}

const KEEPOUT: Keepout[] = [
  // ICT-City link bridges on the north-west facade.
  { facade: "NW", s0: BRIDGES.z0 - 0.5, s1: BRIDGES.z1 + 0.5, y0: BRIDGES.lower.under - 0.3, y1: BRIDGES.lower.roof + 0.4 },
  { facade: "NW", s0: BRIDGES.z0 - 0.5, s1: BRIDGES.z1 + 0.5, y0: BRIDGES.upper.under - 0.3, y1: BRIDGES.upper.roof + 0.4 },
];

/** Window sizes and their share (SPEC §3.3.3). */
const SIZES: [number, number][] = [
  [1.2, 0.5],
  [2.2, 0.33],
  [2.95, 0.17],
];

/** The facade axis length (m). */
export const facadeLength = (f: Facade) => (f === "NE" || f === "SW" ? BLOCK.w : BLOCK.d);

/** Bottom of the brick on a facade at s (y_E): pavilion roof on the south-west, the deck elsewhere. */
function scatterBase(f: Facade, s: number): number {
  if (f === "SW") return s >= PAVILION.x0 && s <= PAVILION.x1 ? PAVILION.roof : LEVEL.f1;
  return LEVEL.f1;
}

/** Brick top over a facade position (y_E). */
export function facadeTop(f: Facade, s: number): number {
  switch (f) {
    case "NE":
      return brickTop(s, 0);
    case "SE":
      return brickTop(BLOCK.w, s);
    case "SW":
      return brickTop(s, BLOCK.d);
    case "NW":
      return brickTop(0, s);
  }
}

/** Plan point just inside a facade at s (for the volume behind it). */
function inside(f: Facade, s: number, d = 0.6): [number, number] {
  switch (f) {
    case "NE":
      return [s, d];
    case "SE":
      return [BLOCK.w - d, s];
    case "SW":
      return [s, BLOCK.d - d];
    case "NW":
      return [d, s];
  }
}

/**
 * Deterministic scatter for a facade with no measured list: per storey a few
 * slots, sizes by the measured mix, sills near the measured rhythm (centre
 * ≈ floor + 1.6…2.2 m), clear of each other, of keep-out zones, of the
 * sloped brick top and of the base.
 */
export function scatterWindows(f: Facade, seed: number, perStorey: number): WindowSpec[] {
  const rnd = mulberry32(seed);
  const len = facadeLength(f);
  const out: WindowSpec[] = [];
  for (const st of STOREYS) {
    const placed: WindowSpec[] = [];
    let tries = 0;
    while (placed.length < perStorey && tries < perStorey * 40) {
      tries++;
      const r = rnd();
      const size = (r < SIZES[0][1] ? SIZES[0][0] : r < SIZES[0][1] + SIZES[1][1] ? SIZES[1][0] : SIZES[2][0]) + (rnd() - 0.5) * 0.12;
      const s = 0.9 + size / 2 + rnd() * (len - 1.8 - size);
      const lift = st.height > 4.5 ? 2.4 : 1.6 + rnd() * 0.6;
      let y = st.floor + lift + (rnd() - 0.5) * 0.3;
      y = Math.min(Math.max(y, st.floor + size / 2 + 0.35), st.floor + st.height - size / 2 - 0.25);
      const lo = y - size / 2;
      const hi = y + size / 2;
      // Fits under the (sloped) brick top at both edges and above the base.
      if (hi > Math.min(facadeTop(f, s - size / 2), facadeTop(f, s + size / 2)) - 0.55) continue;
      // …at both edges too: a window must not hang over the pavilion's roof line (its base steps there).
      if (lo < Math.max(scatterBase(f, s - size / 2), scatterBase(f, s + size / 2), scatterBase(f, s)) + 0.45) continue;
      // Clear of other windows (0.7 m), within this storey and the next.
      const clash = [...placed, ...out].some(
        (w) => Math.abs(w.s - s) < (w.size + size) / 2 + 0.7 && Math.abs(w.y - y) < (w.size + size) / 2 + 0.5,
      );
      if (clash) continue;
      if (KEEPOUT.some((k) => k.facade === f && s + size / 2 > k.s0 && s - size / 2 < k.s1 && hi > k.y0 && lo < k.y1)) continue;
      placed.push({ facade: f, s: round2(s), y: round2(y), size: round2(size) });
    }
    out.push(...placed);
  }
  return out.map((w) => markOpen(w));
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Flag openings above a terrace floor (screen walls). */
function markOpen(w: WindowSpec): WindowSpec {
  const [x, z] = inside(w.facade, w.s);
  const floor = massTop(x, z);
  return w.y - w.size / 2 >= floor - 0.05 ? { ...w, open: true } : w;
}

/** Every window of the brick mantle. */
export function allWindows(): WindowSpec[] {
  const ne = NE.map(([s, y, size]) => markOpen({ facade: "NE", s, y, size }));
  const se = SE.map(([s, y, size]) => markOpen({ facade: "SE", s: Math.min(s, BLOCK.d - size / 2 - 0.3), y, size }));
  const nw = scatterWindows("NW", 7307, 11);
  const sw = scatterWindows("SW", 6511, 5);
  return [...ne, ...se, ...nw, ...sw];
}
