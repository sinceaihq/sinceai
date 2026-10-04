/**
 * Terrain heightfield for the twin: the City of Turku 2021 laser DTM (0.5 m,
 * bare earth, gaps already filled by neighbour averaging in the research
 * extract) with three corrections where the laser saw no ground:
 *
 *  1. Kupittaa island platform under the canopy: the fill there came from the
 *     tracks, ~0.2 m too low → the measured platform surface (fitted along the
 *     platform, it falls 0.16 % to the north-west).
 *  2. EduCity's south-east walkway and outdoor Main Stairs (a deck over the
 *     lower storey, classified as building) → deck level −0.15 m, so a modelled
 *     deck sits on top without z-fighting.
 *  3. Inside the hero buildings (BioCity, Joki, EduCity) the averaged fill
 *     can rise above the floors → capped at floor − 0.25 m so the ground never
 *     shows through an opened (dollhouse) floor. Ground under overhangs and
 *     arcades (OSM building:part with min_level ≥ 1) is left alone.
 *
 * Output: dtm.png (16-bit grey, y = value / 1000 − 8.20, same coding as the
 * research extract: N2000 = 15 + value / 1000) and dtm.json (TerrainMeta).
 */
import fs from "node:fs";
import path from "node:path";
import { decodePng, encodePng } from "./png.mjs";
import { DATUM, distToRingEdge, pointInRing, r2 } from "./geo.mjs";

const SCALE = 0.001;
const OFFSET = 15 - DATUM; // −8.20

/** Hero ground-floor levels (SPEC §7.0) and the cap below them. */
const HERO_FLOORS = { biocity: 0.06, joki: -1.7, educity: 3.4 };
const CAP_BELOW_FLOOR = 0.25;
const CAP_EDGE_MARGIN = 0.6;
/** Deck structures missing from the DTM sit this much above the filled ground. */
const DECK_CLEARANCE = 0.15;
/**
 * EduCity's deck-level plaza at the pavilion's south-east door, between the
 * pavilion, the end of the south-east walkway and the stairs down to the lower
 * lot (traced on the 2022 true ortho; SPEC §2.2 "plaza at pavilion SE door").
 */
export const EDUCITY_SE_PLAZA = [
  [214.17, 132.18],
  [216.31, 134.93],
  [221.14, 138.81],
  [219.4, 141.8],
  [211.5, 147.5],
  [204.77, 143.74],
];

export function buildTerrain({ research, campusOsm, heights, educityMassing, outDir, log }) {
  const meta = JSON.parse(fs.readFileSync(path.join(research, "turku/terrain_dtm2021_050m_uint16.json"), "utf8"));
  const dtm = decodePng(fs.readFileSync(path.join(research, "turku/terrain_dtm2021_050m_uint16.png")));
  const mask = decodePng(fs.readFileSync(path.join(research, "turku/terrain_dtm2021_050m_measuredmask.png")));
  const W = dtm.width;
  const H = dtm.height;
  const res = meta.pixel_size_m;
  const [minX, minZ] = meta["pixel(0,0)_top_left_corner_local"];
  if (dtm.bitDepth !== 16 || dtm.channels !== 1 || mask.width !== W || mask.height !== H) {
    throw new Error("terrain: unexpected DTM/mask format");
  }
  const y = new Float64Array(W * H);
  const measured = new Uint8Array(W * H);
  for (let i = 0; i < y.length; i++) {
    y[i] = dtm.data[i] * SCALE + OFFSET;
    measured[i] = mask.data[i] > 127 ? 1 : 0;
  }
  const cx = (i) => minX + (i + 0.5) * res;
  const cz = (j) => minZ + (j + 0.5) * res;
  const sampleAt = (x, z) => {
    const i = Math.min(W - 1, Math.max(0, Math.round((x - minX) / res - 0.5)));
    const j = Math.min(H - 1, Math.max(0, Math.round((z - minZ) / res - 0.5)));
    return y[j * W + i];
  };
  /** Visit the pixel centres inside a ring. */
  const eachInside = (ring, fn) => {
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (const [x, z] of ring) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
    const i0 = Math.max(0, Math.floor((x0 - minX) / res));
    const i1 = Math.min(W - 1, Math.ceil((x1 - minX) / res));
    const j0 = Math.max(0, Math.floor((z0 - minZ) / res));
    const j1 = Math.min(H - 1, Math.ceil((z1 - minZ) / res));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const p = [cx(i), cz(j)];
        if (pointInRing(p, ring)) fn(j * W + i, p);
      }
  };
  const notes = [];

  /**
   * Fill unmeasured cells inside a ring with `level(x, z)`, blending over
   * ±0.35 m of the edge so a deck edge reads as a straight line, not a
   * staircase of 0.5 m cells.
   */
  const fillAntialiased = (ring, level) => {
    const pad = 0.35;
    const grown = ring; // bbox scan below includes the margin
    let x0 = Infinity;
    let x1 = -Infinity;
    let z0 = Infinity;
    let z1 = -Infinity;
    for (const [x, z] of grown) {
      x0 = Math.min(x0, x - 1);
      x1 = Math.max(x1, x + 1);
      z0 = Math.min(z0, z - 1);
      z1 = Math.max(z1, z + 1);
    }
    const i0 = Math.max(0, Math.floor((x0 - minX) / res));
    const i1 = Math.min(W - 1, Math.ceil((x1 - minX) / res));
    const j0 = Math.max(0, Math.floor((z0 - minZ) / res));
    const j1 = Math.min(H - 1, Math.ceil((z1 - minZ) / res));
    let n = 0;
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const k = j * W + i;
        if (measured[k]) continue;
        const p = [cx(i), cz(j)];
        const d = (pointInRing(p, ring) ? 1 : -1) * distToRingEdge(p, ring);
        if (d < -pad) continue;
        const t = Math.min(1, (d + pad) / (2 * pad));
        const target = level(p[0], p[1]);
        y[k] = y[k] + (target - y[k]) * (t * t * (3 - 2 * t));
        n++;
      }
    return n;
  };

  // 1 ── Platform under the canopy.
  const platforms = campusOsm.areas.filter((a) => a.kind === "platform" && a.ref);
  {
    // Platform axis from the polygon's long direction (bearing ≈ 145°).
    const all = platforms.flatMap((p) => p.polygon);
    let mx = 0;
    let mz = 0;
    for (const [x, z] of all) {
      mx += x;
      mz += z;
    }
    mx /= all.length;
    mz /= all.length;
    let sxx = 0;
    let sxz = 0;
    let szz = 0;
    for (const [x, z] of all) {
      sxx += (x - mx) ** 2;
      sxz += (x - mx) * (z - mz);
      szz += (z - mz) ** 2;
    }
    const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz);
    const ax = [Math.cos(ang), Math.sin(ang)];
    const s = (x, z) => (x - mx) * ax[0] + (z - mz) * ax[1];
    // Median of measured platform pixels per 10 m along the axis, then a line fit.
    const bins = new Map();
    for (const p of platforms)
      eachInside(p.polygon, (k, [x, z]) => {
        if (!measured[k]) return;
        const b = Math.floor(s(x, z) / 10);
        if (!bins.has(b)) bins.set(b, []);
        bins.get(b).push(y[k]);
      });
    const pts = [];
    for (const [b, v] of bins) {
      if (v.length < 20) continue;
      v.sort((a, c) => a - c);
      pts.push([(b + 0.5) * 10, v[Math.floor(v.length / 2)]]);
    }
    const n = pts.length;
    const ms = pts.reduce((a, p) => a + p[0], 0) / n;
    const my = pts.reduce((a, p) => a + p[1], 0) / n;
    const slope =
      pts.reduce((a, p) => a + (p[0] - ms) * (p[1] - my), 0) / pts.reduce((a, p) => a + (p[0] - ms) ** 2, 0);
    const fit = (x, z) => my + slope * (s(x, z) - ms);
    let raised = 0;
    for (const p of platforms)
      eachInside(p.polygon, (k, [x, z]) => {
        if (measured[k]) return;
        const v = fit(x, z);
        if (v > y[k]) {
          y[k] = v;
          raised++;
        }
      });
    notes.push(
      `Kupittaa platform: ${raised} unmeasured cells under the canopy raised to the measured platform surface (y ${r2(
        fit(218.9, -111.5),
      )} at the station building, ${r2(fit(265.7, -47.9))} at the Kalevansilta stairs).`,
    );
    log(`terrain: platform fit from ${n} bins, slope ${(slope * 100).toFixed(3)} %/m, raised ${raised} cells`);
  }

  // 2 ── EduCity south-east walkway, plaza and Main Stairs (deck level y 3.40).
  {
    const E0 = 3.4;
    let filled = 0;
    for (const ring of [educityMassing.SE_walkway.poly, EDUCITY_SE_PLAZA]) {
      filled += fillAntialiased(ring, () => E0 - DECK_CLEARANCE);
    }
    // Main stairs: centreline foot → top (y_E −5 → 0), ≈6 m wide.
    const [[fx, fz, fy], [tx, tz, ty]] = educityMassing.main_stairs_SE.centreline;
    const len = Math.hypot(tx - fx, tz - fz);
    const ux = (tx - fx) / len;
    const uz = (tz - fz) / len;
    const half = (educityMassing.main_stairs_SE.width_m_estimate ?? 6) / 2;
    const ring = [
      [fx - uz * half, fz + ux * half],
      [tx - uz * half, tz + ux * half],
      [tx + uz * half, tz - ux * half],
      [fx + uz * half, fz - ux * half],
    ];
    const stairs = fillAntialiased(ring, (x, z) => {
      const t = Math.min(1, Math.max(0, ((x - fx) * ux + (z - fz) * uz) / len));
      return E0 + fy + (ty - fy) * t - DECK_CLEARANCE;
    });
    notes.push(
      `EduCity south-east walkway and pavilion plaza (${filled} cells) and outdoor Main Stairs (${stairs} cells): unmeasured deck filled at deck level − ${DECK_CLEARANCE} m, edges anti-aliased over one cell.`,
    );
  }

  // 3 ── Hero interiors: never above floor − 0.25 m.
  {
    const byId = new Map(campusOsm.buildings.map((b) => [b.id, b]));
    const overhangs = [];
    const caps = [];
    const heroes = { biocity: "w48381050", joki: "w625297895", educity: "w731925812" };
    for (const [hero, osmId] of Object.entries(heroes)) {
      const b = byId.get(osmId);
      caps.push({ hero, ring: b.polygon });
      for (const part of b.parts ?? []) {
        if ((part.minLevel ?? 0) >= 1) overhangs.push(part.polygon);
        else caps.push({ hero, ring: part.polygon });
      }
    }
    // Joki's hall and tower roofs from the City LOD2 (inside DataCity's record) — the true F1 extent.
    const datacity = heights.buildings_all.find((b) => b.prt === "103454371S");
    for (const level of datacity.roof_levels) {
      if (level.z_n2000 !== 35.31 && level.z_n2000 !== 26.42) continue;
      for (const ring of level.polygons_local ?? []) caps.push({ hero: "joki", ring });
    }
    const counts = {};
    for (const { hero, ring } of caps) {
      const cap = HERO_FLOORS[hero] - CAP_BELOW_FLOOR;
      eachInside(ring, (k, p) => {
        if (y[k] <= cap) return;
        if (distToRingEdge(p, ring) < CAP_EDGE_MARGIN) return;
        if (overhangs.some((o) => pointInRing(p, o))) return;
        y[k] = cap;
        counts[hero] = (counts[hero] ?? 0) + 1;
      });
    }
    notes.push(
      `Inside BioCity, Joki and EduCity the filled ground is capped ${CAP_BELOW_FLOOR} m below the ground floor (${Object.entries(
        counts,
      )
        .map(([h, n]) => `${h} ${n} cells`)
        .join(", ")}); arcades and overhangs are untouched.`,
    );
  }

  // Encode.
  const values = new Uint16Array(W * H);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < y.length; i++) {
    const v = Math.round((y[i] - OFFSET) / SCALE);
    if (v < 0 || v > 65535) throw new Error(`terrain: value out of range at ${i}: y ${y[i]}`);
    values[i] = v;
    const q = v * SCALE + OFFSET;
    lo = Math.min(lo, q);
    hi = Math.max(hi, q);
  }
  const png = encodePng({ width: W, height: H, channels: 1, bitDepth: 16, data: values });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "dtm.png"), png);
  const out = {
    version: 1,
    file: "dtm.png",
    width: W,
    height: H,
    resolution: res,
    extent: { minX: r2(minX), maxX: r2(minX + W * res), minZ: r2(minZ), maxZ: r2(minZ + H * res) },
    scale: SCALE,
    offset: OFFSET,
    minY: r2(lo),
    maxY: r2(hi),
    decoding:
      "16-bit grey PNG, big-endian samples, rows north (minZ) → south, columns west (minX) → east. y = value × scale + offset (N2000 = 15 + value / 1000; y = N2000 − 23.20). Sample (col, row) lies at x = minX + (col + 0.5) × resolution, z = minZ + (row + 0.5) × resolution; interpolate bilinearly between sample centres.",
    source:
      "City of Turku laser scanning 18 Apr 2021 (≥ 30 pts/m², ground classes 2 and 8 averaged per 0.5 m cell; cells without ground returns filled by iterative neighbour averaging)",
    measuredFraction: r2(measured.reduce((a, v) => a + v, 0) / measured.length),
    corrections: notes,
    caveat:
      "State of April 2021: areas rebuilt later (ParkCity 2022–23, CivilCity 2022, the station blocks 2023+, Jussin aukio edge works) may differ by a few decimetres. Decks, bridges and stairs other than those corrected above are objects, not terrain.",
    licence: "© Turun kaupunki, käyttölupa CC BY 4.0",
  };
  fs.writeFileSync(path.join(outDir, "dtm.json"), `${JSON.stringify(out, null, 2)}\n`);
  log(`terrain: ${W}×${H} @ ${res} m, y ${out.minY}…${out.maxY}, dtm.png ${(png.length / 1024).toFixed(0)} KB`);

  // Sampler for the other builders (same values as the shipped PNG).
  const heightsY = new Float32Array(W * H);
  for (let i = 0; i < values.length; i++) heightsY[i] = values[i] * SCALE + OFFSET;
  return makeSampler({ minX, minZ, W, H, res, heights: heightsY, measured, sampleAt });
}

function makeSampler({ minX, minZ, W, H, res, heights, measured }) {
  const heightAt = (x, z) => {
    let u = (x - minX) / res - 0.5;
    let v = (z - minZ) / res - 0.5;
    u = Math.min(W - 1, Math.max(0, u));
    v = Math.min(H - 1, Math.max(0, v));
    const i0 = Math.min(Math.floor(u), W - 2);
    const j0 = Math.min(Math.floor(v), H - 2);
    const fu = u - i0;
    const fv = v - j0;
    const k = j0 * W + i0;
    const a = heights[k];
    const b = heights[k + 1];
    const c = heights[k + W];
    const d = heights[k + W + 1];
    return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
  };
  const isMeasured = (x, z) => {
    const i = Math.round((x - minX) / res - 0.5);
    const j = Math.round((z - minZ) / res - 0.5);
    if (i < 0 || j < 0 || i >= W || j >= H) return false;
    return measured[j * W + i] === 1;
  };
  return {
    heightAt,
    isMeasured,
    extent: { minX, minZ, maxX: minX + W * res, maxZ: minZ + H * res },
  };
}
