import * as THREE from "three";
import type { V2 } from "../../types";
import {
  ATRIUM,
  ATRIUM_NE_Z,
  ATRIUM_SW_Z,
  AUDITORIUM,
  CORNER,
  ENTRANCE_TYK,
  FLAGPOLES,
  FLAGPOLE_HEIGHT,
  GABLE_E_X,
  GABLE_W_X,
  GALLERY,
  LEVEL,
  NBLOCK_FACE,
  NE_FACADE_Z,
  NORTH_UPPER,
  PENTHOUSES,
  ROUND_COLUMNS,
  SOUTH_UPPER,
  SW_FACADE_Z,
  SW_SLOTS,
  TECH_NE,
  TECH_SW,
  VAULT,
  VESTIBULE,
  along,
  arcPoints,
  dist2,
  lerp2,
  runNormal,
  vaultY,
  wingOutline,
} from "./plan";
import {
  Buckets,
  bar,
  box,
  cylinder,

  facadeRunSplit,
  flatPolygon,
  mergeAll,
  polylineWall,
  prism,
  segmentBox,
  wallQuad,
  type FacadeRunOptions,
  type Layer,
} from "./geom";
import { mulberry32 } from "../../util";

/**
 * BioCity's exterior shell (SPEC §3.1): the black ribbon facades with blade
 * louvres, the reflective glass corner tower and crown band that bridges the
 * Tykistökatu recess (the black "portal"), the white recess wall, the glazed
 * atrium gables and barrel vault, the rooftop technical storeys, the arcades
 * on Lemminkäisenkatu and Tykistökatu, the one-storey courtyard wing with the
 * curved Aulagalleria and the event-entrance vestibule, the pilotis under the
 * tower with the black tile wall, the Tykistökatu entrance (canopy, revolving
 * door) and the flag poles. Geometry goes into Buckets in plan frame B.
 */

export interface ExteriorEnv {
  /** Terrain height (campus y) at a plan-B point. */
  groundB(x: number, z: number): number;
  tier: "ultra" | "high" | "low";
}

const L = LEVEL;
const CUT = L.cut;

/** Add a facade run split at the dollhouse cut into shell / upper. */
function addFacade(b: Buckets, key: string, points: V2[], y0: number, y1: number, o: FacadeRunOptions): number {
  const r = facadeRunSplit(points, y0, y1, CUT, o);
  if (r.below) b.add("shell", key, r.below);
  if (r.above) b.add("upper", key, r.above);
  return r.uEnd;
}

/** Split any vertical-prism-like part at the cut: below → shell, above → upper. */
function layerFor(y0: number): Layer {
  return y0 >= CUT - 1e-6 ? "upper" : "shell";
}

/** A z on the NE facade line for a plan x (the line is straight from the E corner to the N corner). */
function neZ(x: number): number {
  const a = CORNER.eastN;
  const c = CORNER.north;
  const t = (x - a[0]) / (c[0] - a[0]);
  return a[1] + (c[1] - a[1]) * t;
}

/** Points on the Tykistökatu face of the N-block at distances s from the north corner. */
function nFace(s: number): V2 {
  return along(CORNER.north, CORNER.recessN, s);
}

/**
 * Blade louvres over ribbon windows: five slats (seen from below as a grille)
 * on brackets, 0.6 m deep, sloping slightly down from the facade.
 */
function louvres(b: Buckets, a: V2, c: V2, floors: number[], opts: { layerSplit?: boolean; slats?: number } = {}) {
  const slats = opts.slats ?? 5;
  const n = runNormal(a, c);
  const len = dist2(a, c);
  if (len < 0.8) return;
  const ux = (c[0] - a[0]) / len;
  const uz = (c[1] - a[1]) / len;
  for (const floor of floors) {
    const y = floor + 0.9 + 1.4 + 0.12;
    const parts: THREE.BufferGeometry[] = [];
    const pitch = 0.6 / slats;
    for (let k = 0; k < slats; k++) {
      const out = 0.08 + k * pitch;
      const yy = y - out * 0.12;
      parts.push(segmentBox(a, c, 0.06, yy - 0.012, yy + 0.012, { offset: out + 0.03, extend: -0.05 }));
    }
    // Brackets every 2.4 m.
    for (let s = 0.3; s < len - 0.2; s += 2.4) {
      const p: V2 = [a[0] + ux * s, a[1] + uz * s];
      const q: V2 = [p[0] + n[0] * 0.66, p[1] + n[1] * 0.66];
      parts.push(segmentBox(p, q, 0.012, y - 0.1, y + 0.03));
    }
    const geo = mergeAll(parts);
    b.add(opts.layerSplit === false ? "shell" : layerFor(y), "blackSteel", geo);
  }
}

/** Vertical mullion/transom grid on a plane between a and c (thin boxes, proud of the plane). */
function glazingGrid(
  a: V2,
  c: V2,
  y0: number,
  topAt: (s: number) => number,
  opts: { pitch: number; rowPitch: number; width?: number; depth?: number; offset?: number; rows?: number[] },
): THREE.BufferGeometry[] {
  const len = dist2(a, c);
  const w = opts.width ?? 0.06;
  const d = opts.depth ?? 0.12;
  const off = opts.offset ?? 0;
  const parts: THREE.BufferGeometry[] = [];
  const n = Math.max(1, Math.round(len / opts.pitch));
  for (let i = 0; i <= n; i++) {
    const s = (len * i) / n;
    const p = along(a, c, s);
    const top = topAt(s);
    if (top - y0 < 0.05) continue;
    const dir = runNormal(a, c);
    const q: V2 = [p[0] + dir[0] * off, p[1] + dir[1] * off];
    const t: V2 = [(c[0] - a[0]) / len, (c[1] - a[1]) / len];
    parts.push(segmentBox([q[0] - t[0] * w * 0.5, q[1] - t[1] * w * 0.5], [q[0] + t[0] * w * 0.5, q[1] + t[1] * w * 0.5], d, y0, top));
  }
  const rows: number[] = opts.rows ?? [];
  if (!opts.rows) for (let y = y0 + opts.rowPitch; y < Math.max(topAt(0), topAt(len / 2), topAt(len)) - 0.1; y += opts.rowPitch) rows.push(y);
  for (const y of rows) {
    // Clip the transom to where the top is above it.
    const steps = 24;
    let start = -1;
    for (let i = 0; i <= steps; i++) {
      const s = (len * i) / steps;
      const inside = topAt(s) > y + 0.04;
      if (inside && start < 0) start = s;
      if ((!inside || i === steps) && start >= 0) {
        const end = inside ? len : s - len / steps / 2;
        if (end - start > 0.2) {
          const p0 = along(a, c, start);
          const p1 = along(a, c, end);
          parts.push(segmentBox(p0, p1, d, y - w * 0.5, y + w * 0.5, { offset: off }));
        }
        start = -1;
      }
    }
  }
  return parts;
}

/** A glass pane polygon in a vertical plane a→c from y0 up to topAt(s) (sampled), facing the run normal. */
function glassPane(a: V2, c: V2, y0: number, topAt: (s: number) => number, samples = 16): THREE.BufferGeometry {
  const len = dist2(a, c);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const s = (len * i) / samples;
    const p = along(a, c, s);
    const top = topAt(s);
    pos.push(p[0], y0, p[1], p[0], top, p[1]);
    uv.push(s, y0, s, top);
    if (i > 0) {
      const k = i * 2;
      idx.push(k - 2, k, k + 1, k - 2, k + 1, k - 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export interface ExteriorResult {
  /** Meshes with their own (canvas) materials, added by the caller to layer groups. */
  extra: { layer: Layer; object: THREE.Object3D }[];
  /** Downlight discs on soffits (emissive) — positions for night pools. */
  soffitLights: V2[];
}

export function buildExterior(b: Buckets, env: ExteriorEnv): ExteriorResult {
  const extra: ExteriorResult["extra"] = [];
  const soffitLights: V2[] = [];
  const low = env.tier === "low";
  // Blade louvres: five slats, three on phones.
  const lv = (a: V2, c: V2, floors: number[]): void => louvres(b, a, c, floors, { slats: low ? 3 : 5 });

  // ── 1. Courtyard (NE) facade of the north half ──────────────────────────────
  {
    const e = CORNER.eastN;
    const xs = [e[0], 30.0, 27.83, -29.12, -40.3, CORNER.north[0]];
    const P = (x: number): V2 => [x, neZ(x)];
    const vRef = L.gf;
    // E corner: kitchen ground storey, ribbons F2–F6, glass box at F7.
    let u = addFacade(b, "ribbonBlack", [P(xs[0]), P(xs[1])], 0, L.f7, { vRef, top: L.parapet, seed: 0.11 });
    addFacade(b, "crown", [P(xs[0]), P(xs[1])], L.f7, L.parapet, { vRef: L.f7, fitBay: 1.2, seed: 0.21 });
    // Middle (over the one-storey wing from 27.83 to −29.12): ribbons F2–F7, tech storey flush above.
    u = addFacade(b, "ribbonBlack", [P(xs[1]), P(xs[2])], 0, L.roof, { vRef, uOffset: u, seed: 0.11 });
    u = addFacade(b, "ribbonBlack", [P(xs[2]), P(xs[3])], L.wingRoof - 0.02, L.roof, { vRef, uOffset: u, seed: 0.11, ground: L.wingRoof });
    u = addFacade(b, "ribbonBlack", [P(xs[3]), P(xs[4])], L.gfTop, L.roof, { vRef, uOffset: u, seed: 0.11 });
    // N-block: ribbons F2–F6 + crown.
    addFacade(b, "ribbonBlack", [P(xs[4]), P(xs[5])], L.gfTop, L.f7, { vRef, uOffset: u, seed: 0.13, top: L.parapet });
    addFacade(b, "crown", [P(xs[4]), P(xs[5])], L.f7, L.parapet, { vRef: L.f7, fitBay: 1.2, seed: 0.23 });
    // Ground storey of the west wing (shopfronts, mostly blinds) and its fascia.
    addFacade(b, "shopfront", [P(xs[3]), P(-52.1)], 0, L.arcadeSoffit + 0.4, { vRef, seed: 0.31 });
    b.add("shell", "blackPanel", segmentBox(P(xs[3]), P(CORNER.north[0]), 0.3, L.arcadeSoffit + 0.4, L.gfTop, { offset: 0.1 }));
    // Louvres over every ribbon.
    lv(P(xs[0]), P(xs[1]), [L.f2, L.f3, L.f4, L.f5, L.f6]);
    lv(P(xs[1]), P(xs[4]), [L.f2, L.f3, L.f4, L.f5, L.f6, L.f7]);
    lv(P(xs[4]), P(xs[5]), [L.f2, L.f3, L.f4, L.f5, L.f6]);
  }

  // ── 2. N-block Tykistökatu face ─────────────────────────────────────────────
  {
    const F = NBLOCK_FACE;
    const vRef = L.gf;
    const pts = (s0: number, s1: number): V2[] => [nFace(s0), nFace(s1)];
    // Black fascia over the arcade, then: corner band | field (black frame round it) | sign panel zone | margin.
    const fTop = 21.45;
    const fBot = L.gfTop + 0.4;
    addFacade(b, "panelBlack", pts(0, F.length), L.arcadeSoffit, L.gfTop, { vRef: 0.55, seed: 0.4 });
    addFacade(b, "panelBlack", pts(0, F.field[0]), L.gfTop, L.f7, { vRef: 0.55, seed: 0.4 });
    addFacade(b, "panelBlack", pts(F.field[0], F.field[1]), L.gfTop, fBot, { vRef: 0.55, seed: 0.4 });
    addFacade(b, "field", pts(F.field[0], F.field[1]), fBot, fTop, { vRef: fBot, fitBay: 1.2, seed: 0.51 });
    addFacade(b, "panelBlack", pts(F.field[0], F.field[1]), fTop, L.f7, { vRef: 0.55, seed: 0.4 });
    addFacade(b, "panelBlack", pts(F.field[1], F.length), L.gfTop, L.f7, { vRef: 0.55, seed: 0.41 });
    addFacade(b, "crown", pts(0, F.length), L.f7, L.parapet, { vRef: L.f7, fitBay: 1.2, seed: 0.22 });
    // Black frame round the curtain-wall field (proud of the panels).
    const fr = (s0: number, s1: number, y0: number, y1: number) => segmentBox(nFace(s0), nFace(s1), 0.18, y0, y1, { offset: 0.09 });
    b.add(
      "upper",
      "blackPanel",
      fr(F.field[0] - 0.4, F.field[0], fBot - 0.4, fTop + 0.4),
      fr(F.field[1], F.field[1] + 0.4, fBot - 0.4, fTop + 0.4),
      fr(F.field[0] - 0.4, F.field[1] + 0.4, fTop, fTop + 0.4),
    );
    b.add("shell", "blackPanel", fr(F.field[0] - 0.4, F.field[1] + 0.4, fBot - 0.4, fBot));
    // Ground storey: shop glazing set back under the overhang, black soffit.
    const g0: V2 = [-52.3, -31.7];
    const g1: V2 = [-41.4, -4.9];
    addFacade(b, "shopfront", [g0, g1], -0.3, L.arcadeSoffit, { vRef, seed: 0.33, ground: 0 });
    b.add("ceiling", "soffitExt", flatPolygon([CORNER.north, CORNER.recessN, g1, g0], L.arcadeSoffit, { down: true }));
    for (let s = 2; s < F.length - 1; s += 3.4) {
      const p = lerp2(along(CORNER.north, CORNER.recessN, s), lerp2(g0, g1, s / F.length), 0.5);
      soffitLights.push(p);
    }
  }

  // ── 3. Bridge over the recess mouth (crown band) and the black portal ──────
  {
    const a = CORNER.recessN;
    const c = CORNER.recessS;
    const n = runNormal(a, c);
    const depth = 1.3;
    const ia: V2 = [a[0] - n[0] * depth, a[1] - n[1] * depth];
    const ic: V2 = [c[0] - n[0] * depth, c[1] - n[1] * depth];
    addFacade(b, "crown", [a, c], L.f7, L.parapet, { vRef: L.f7, fitBay: 1.2, seed: 0.24 });
    // Inner face (towards the recess): walk it c → a so it faces inwards.
    addFacade(b, "crown", [ic, ia], L.f7, L.parapet, { vRef: L.f7, fitBay: 1.2, seed: 0.25 });
    // Black portal beam under the glass, soffit and coping.
    b.add("upper", "blackPanel", segmentBox(a, c, depth + 0.1, 21.45, L.f7, { offset: -depth / 2 }));
    b.add("upper", "coping", segmentBox(a, c, depth + 0.1, L.parapet, L.parapet + 0.08, { offset: -depth / 2 }));
    // Notch of the portal: the beam steps down into the corner of the black margin on the N-block side.
    const t: V2 = [(c[0] - a[0]) / dist2(a, c), (c[1] - a[1]) / dist2(a, c)];
    const k0: V2 = [a[0] + t[0] * 0.2, a[1] + t[1] * 0.2];
    const k1: V2 = [a[0] + t[0] * 1.6, a[1] + t[1] * 1.6];
    b.add("upper", "blackPanel", segmentBox(k0, k1, depth + 0.1, 20.6, 21.45, { offset: -depth / 2 }));
  }

  // ── 4. White recess wall (N-block's SW face) ───────────────────────────────
  {
    const a: V2 = [-43.3, -4.62];
    const c: V2 = [GABLE_W_X - 0.02, -4.62];
    addFacade(b, "shopfront", [a, c], 0, 3.75, { vRef: L.gf, seed: 0.35 });
    addFacade(b, "ribbonWhite", [a, c], 3.75, L.f7, { vRef: L.gf, uOffset: 0.9, seed: 0.6 });
    addFacade(b, "crown", [a, c], L.f7, L.parapet, { vRef: L.f7, fitBay: 1.2, seed: 0.26 });
    b.add("shell", "blackPanel", segmentBox(a, c, 0.25, 3.62, 3.86, { offset: 0.1 }));
    lv([a[0] + 0.9, a[1]], [c[0] - 1.2, c[1]], [L.f2, L.f3, L.f4, L.f5, L.f6]);
  }

  // ── 5. Glass corner tower (W corner) over the pilotis ──────────────────────
  {
    const vRef = L.towerSoffit;
    const ne: V2[] = [[-30.18, 5.51], CORNER.recessS];
    const nw: V2[] = [CORNER.recessS, CORNER.west];
    const sw: V2[] = [CORNER.west, [-24.0, SW_FACADE_Z]];
    addFacade(b, "tower", ne, L.towerSoffit, L.parapet, { vRef, fitBay: 1.2, seed: 0.71 });
    addFacade(b, "tower", nw, L.towerSoffit, L.parapet, { vRef, fitBay: 1.2, seed: 0.72 });
    addFacade(b, "tower", sw, L.towerSoffit, L.parapet, { vRef, fitBay: 1.2, seed: 0.73 });
    // Black edge band at the soffit and the top.
    for (const [p, q] of [ne, nw, sw] as V2[][]) {
      b.add("upper", "blackPanel", segmentBox(p, q, 0.25, L.towerSoffit - 0.45, L.towerSoffit + 0.05, { offset: 0.05, extend: 0.05 }));
      b.add("upper", "coping", segmentBox(p, q, 0.3, L.parapet, L.parapet + 0.08, { offset: -0.1, extend: 0.05 }));
    }
    // Soffit (black, downlights) over the open ground floor.
    const soffit: V2[] = [[-30.0, 5.58], CORNER.recessS, CORNER.west, [-24.0, SW_FACADE_Z], [-24.0, 14.6], [-30.0, 14.6]];
    b.add("ceiling", "soffitExt", flatPolygon(soffit, L.towerSoffit - 0.45, { down: true }));
    for (const p of [[-33.5, 9.6], [-32.0, 12.4], [-33.6, 14.9], [-31.2, 16.2], [-27.0, 16.0], [-35.2, 11.3]] as V2[]) soffitLights.push(p);
    // Black tile wall (ground storey of the SW wing towards the recess) with the plinth.
    b.add("shell", "tileWall", wallQuad([-30.0, 5.6], [-30.0, 14.6], 0, L.towerSoffit - 0.45));
    b.add("shell", "granite", segmentBox([-30.0, 5.6], [-30.0, 14.6], 0.12, -0.3, 0.3, { offset: 0.06 }));
  }

  // ── 6. Lemminkäisenkatu (SW) facade, slots, arcade ─────────────────────────
  {
    const vRef = L.gf;
    const z = SW_FACADE_Z;
    const [s1, s2] = SW_SLOTS;
    const runs: [number, number][] = [
      [s1.x1, s2.x0],
      [s2.x1, CORNER.south[0]],
    ];
    let u = 0;
    for (const [x0, x1] of runs) {
      u = addFacade(b, "ribbonBlack", [[x0, z], [x1, z]], L.arcadeSoffit, L.f7, { vRef, top: L.parapet, uOffset: u, seed: 0.15 });
      lv([x0 + 0.3, z], [x1 - 0.3, z], [L.f2, L.f3, L.f4, L.f5, L.f6]);
    }
    // Crown band over the whole facade (bridging the slots).
    addFacade(b, "crown", [[-24.0, z], CORNER.south], L.f7, L.parapet, { vRef: L.f7, fitBay: 1.2, seed: 0.27 });
    b.add("upper", "blackPanel", segmentBox([s1.x0, z], [s1.x1, z], 0.5, 21.45, L.f7, { offset: -0.2 }));
    b.add("upper", "blackPanel", segmentBox([s2.x0, z], [s2.x1, z], 0.5, 21.45, L.f7, { offset: -0.2 }));
    // Slots: glazed back, black side walls, glass canopy.
    for (const s of SW_SLOTS) {
      addFacade(b, "slotGlass", [[s.x0, s.back], [s.x1, s.back]], s.roof, L.f7, { vRef: s.roof, fitBay: 1.25, seed: 0.81 });
      addFacade(b, "panelBlack", [[s.x0, z], [s.x0, s.back]], L.arcadeSoffit, L.parapet, { vRef: 0.55 });
      addFacade(b, "panelBlack", [[s.x1, s.back], [s.x1, z]], L.arcadeSoffit, L.parapet, { vRef: 0.55 });
      b.add("shell", "whiteSteel", box(s.x0, s.roof - 0.12, s.back, s.x1, s.roof, z));
    }
    // Arcade: shopfronts set back at z 14.6, soffit at the arcade height, fascia band.
    addFacade(b, "shopfront", [[-30.0, 14.6], [CORNER.south[0] + 0.3, 14.6]], 0, L.arcadeSoffit, { vRef, seed: 0.37 });
    b.add("ceiling", "soffitExt", flatPolygon([[-24.0, 14.6], [CORNER.south[0] + 0.3, 14.6], [CORNER.south[0] + 0.3, z], [-24.0, z]], L.arcadeSoffit, { down: true }));
    for (let x = -21; x < 35; x += 3) soffitLights.push([x, 16.0]);
    // Arcade floor (level with the lobby) on a granite plinth with a black railing where the street falls away.
    const x0 = -24.0;
    const x1 = CORNER.south[0] + 0.3;
    b.add("shell", "paving", flatPolygon([[x0, 14.6], [x1, 14.6], [x1, z + 0.15], [x0, z + 0.15]], L.gf - 0.005));
    const step = 1.5;
    const plinth: THREE.BufferGeometry[] = [];
    const rail: THREE.BufferGeometry[] = [];
    for (let x = x0; x < x1 - 0.01; x += step) {
      const xe = Math.min(x1, x + step);
      const g = Math.min(env.groundB(x, z + 0.5), env.groundB(xe, z + 0.5));
      if (L.gf - g > 0.18) {
        plinth.push(box(x, g - 0.3, z - 0.05, xe, L.gf, z + 0.25));
        // Railing: top rail, mid rail, posts.
        rail.push(box(x, 1.02, z + 0.06, xe, 1.06, z + 0.12));
        rail.push(box(x, 0.5, z + 0.08, xe, 0.52, z + 0.1));
        rail.push(box(x, 0.06, z + 0.07, x + 0.04, 1.04, z + 0.11));
      }
    }
    if (plinth.length) b.add("shell", "granite", mergeAll(plinth));
    if (rail.length) b.add("shell", "blackSteel", mergeAll(rail));
    // Steps down to the street at the SE end (next to Joki's portal).
    const gS = env.groundB(34.5, z + 1.5);
    const rise = L.gf - gS;
    if (rise > 0.3) {
      const n = Math.max(2, Math.round(rise / 0.16));
      const steps: THREE.BufferGeometry[] = [];
      for (let i = 0; i < n; i++) {
        const top = L.gf - (rise * (i + 1)) / n;
        steps.push(box(32.6, gS - 0.3, z + 0.25 + i * 0.32, 36.0, top, z + 0.25 + (i + 1) * 0.32));
      }
      b.add("shell", "granite", mergeAll(steps));
    }
  }

  // ── 7. South-east end (towards Joki) ───────────────────────────────────────
  {
    const vRef = L.gf;
    // SW wing's SE face (Haroma 07): ribbons for 8 m from the south corner, then black panels with a
    // full-height glass strip near the east end; crown on top.
    {
      const a = CORNER.south;
      const c = CORNER.eastSW;
      const len = dist2(a, c);
      const r1 = 8.0;
      const g0 = len - 2.7;
      const g1 = len - 1.5;
      addFacade(b, "ribbonBlack", [a, along(a, c, r1)], 3.2, L.f7, { vRef, top: L.parapet, seed: 0.17 });
      addFacade(b, "panelBlack", [along(a, c, r1), along(a, c, g0)], 3.2, L.f7, { vRef: 0.55, seed: 0.5 });
      addFacade(b, "slotGlass", [along(a, c, g0), along(a, c, g1)], L.gfTop, L.f7, { vRef: L.gfTop, fitBay: 1.2, seed: 0.83 });
      addFacade(b, "panelBlack", [along(a, c, g1), c], 3.2, L.f7, { vRef: 0.55, seed: 0.5 });
      addFacade(b, "crown", [a, c], L.f7, L.parapet, { vRef: L.f7, fitBay: 1.2, seed: 0.28 });
      lv(along(a, c, 0.4), along(a, c, r1 - 0.2), [L.f2, L.f3, L.f4, L.f5, L.f6]);
    }
    // The two white end walls facing the gap over the one-storey Joki connector.
    addFacade(b, "whiteGrid", [CORNER.eastSW, [29.5, 5.6]], L.connectorRoof, 26.36, { vRef, seed: 0.42 });
    addFacade(b, "whiteGrid", [[29.8, CORNER.eastNE[1]], CORNER.eastNE], L.connectorRoof, 26.1, { vRef, seed: 0.43 });
    b.add("upper", "coping", segmentBox(CORNER.eastSW, [29.5, 5.6], 0.35, 26.36, 26.46, { offset: -0.15 }));
    b.add("upper", "coping", segmentBox([29.8, CORNER.eastNE[1]], CORNER.eastNE, 0.35, 26.1, 26.2, { offset: -0.15 }));
    // Connector roof (Joki side, 1 storey).
    b.add("shell", "roof", flatPolygon([[29.5, CORNER.eastNE[1]], [CORNER.eastSW[0], CORNER.eastNE[1]], CORNER.eastSW, [29.5, 5.6]], L.connectorRoof));
    b.add("shell", "coping", box(29.5, L.connectorRoof, CORNER.eastNE[1], CORNER.eastSW[0] + 0.15, L.connectorRoof + 0.25, CORNER.eastNE[1] + 0.25));
    // NE wing's SE face (Haroma 09): black 3.6 m panels, a glass field 7 modules wide from the ground
    // to F6 next to the three duct cylinders at the north end, a black band, the crown band on top.
    const a = CORNER.eastNE;
    const c = CORNER.eastN;
    const len = dist2(a, c);
    const f1 = len - 5.2;
    const f0 = f1 - 8.4;
    const fieldTop = 19.25;
    addFacade(b, "panelBlack", [a, along(a, c, f0)], 0, L.f7, { vRef: 0.55, seed: 0.5 });
    addFacade(b, "field", [along(a, c, f0), along(a, c, f1)], 0.45, fieldTop, { vRef: 0.45, fitBay: 1.2, seed: 0.52 });
    addFacade(b, "panelBlack", [along(a, c, f0), along(a, c, f1)], fieldTop, L.f7, { vRef: 0.55, seed: 0.5 });
    addFacade(b, "panelBlack", [along(a, c, f0), along(a, c, f1)], -0.3, 0.45, { vRef: 0.55, seed: 0.5 });
    addFacade(b, "panelBlack", [along(a, c, f1), c], 0, L.f7, { vRef: 0.55, seed: 0.5 });
    addFacade(b, "crown", [a, c], L.f7, L.parapet, { vRef: L.f7, fitBay: 1.2, seed: 0.29 });
    // Three black corrugated duct cylinders (Ø 1.5 m) rising above the roof under a white louvred box.
    const nrm = runNormal(a, c);
    const ducts: THREE.BufferGeometry[] = [];
    for (const sd of [len - 4.15, len - 2.6, len - 1.05]) {
      const p = along(a, c, sd);
      ducts.push(cylinder(p[0] + nrm[0] * 0.8, p[1] + nrm[1] * 0.8, 0.75, -0.3, 28.9, low ? 12 : 24, true));
    }
    b.add("upper", "ductBlack", mergeAll(ducts));
    const pa = along(a, c, len - 5.0);
    const pc = along(a, c, len - 0.1);
    b.add("upper", "whiteSteel", segmentBox(pa, pc, 2.0, 28.9, 30.5, { offset: 0.9 }));
    // Louvre bands on the white box.
    const boxBands: THREE.BufferGeometry[] = [];
    for (let y = 29.1; y < 30.4; y += 0.18) boxBands.push(segmentBox(pa, pc, 0.05, y, y + 0.06, { offset: 1.92 }));
    b.add("upper", "silver", mergeAll(boxBands));
  }

  // ── 8. One-storey courtyard wing: Maunon sali, Aulagalleria, vestibule, auditorium ──
  {
    const wing = wingOutline();
    const pts = wing.points;
    // Opaque walls: auditorium + takatila (black panels); Maunon sali and the gallery are glazed.
    const isGlass = (i: number) => {
      const p = pts[i];
      const q = pts[i + 1];
      const mid = lerp2(p, q, 0.5);
      if (mid[0] > 7.3 && mid[1] < -31) return "mauno";
      const r = Math.hypot(mid[0] - GALLERY.cx, mid[1] - GALLERY.cz);
      if (Math.abs(r - GALLERY.rOuter) < 0.6) return "gallery";
      if (mid[0] > VESTIBULE.x0 - 0.1 && mid[0] < VESTIBULE.x1 + 0.1 && mid[1] < VESTIBULE.z1 + 0.1) return "vestibule";
      return "solid";
    };
    const glassParts: THREE.BufferGeometry[] = [];
    const mull: THREE.BufferGeometry[] = [];
    const fascia: THREE.BufferGeometry[] = [];
    const solid: V2[][] = [];
    let current: V2[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const kind = isGlass(i);
      const p = pts[i];
      const q = pts[i + 1];
      const h = Math.min(wing.height[i], wing.height[i + 1]);
      if (kind === "solid") {
        if (!current.length) current.push(p);
        current.push(q);
        continue;
      }
      if (current.length) {
        solid.push(current);
        current = [];
      }
      const top = kind === "vestibule" ? L.vestibuleRoof - 0.25 : L.wingRoof - 0.55;
      glassParts.push(wallQuad(p, q, L.gf, top, { doubleSided: false }));
      fascia.push(segmentBox(p, q, 0.22, top, h + 0.08, { offset: -0.08, extend: 0.02 }));
      // Mullions at the segment start and a transom at door height for the gallery.
      mull.push(segmentBox(p, along(p, q, 0.07), 0.14, L.gf, top, { offset: -0.04 }));
      if (kind !== "mauno") mull.push(segmentBox(p, q, 0.1, 2.55, 2.62, { offset: -0.04 }));
      mull.push(segmentBox(p, q, 0.14, L.gf - 0.05, L.gf + 0.08, { offset: -0.04 }));
    }
    if (current.length) solid.push(current);
    for (const run of solid) {
      const h = run.length > 2 ? L.auditoriumRoof : L.wingRoof;
      addFacade(b, "panelBlack", run, 0, h, { vRef: 0.55, seed: 0.45 });
      b.add("shell", "coping", polylineWall(run, h, h + 0.1));
    }
    b.add("shell", "glassLow", mergeAll(glassParts));
    b.add("shell", "blackSteel", mergeAll(mull), mergeAll(fascia));
    // Event-entrance vestibule doors (double doors, silver frames) on its outer face.
    const door: THREE.BufferGeometry[] = [];
    door.push(box(-0.92, L.gf, VESTIBULE.z0 - 0.06, 0.92, 2.35, VESTIBULE.z0 - 0.02));
    b.add("shell", "glassDoor", mergeAll(door));
    const dframe: THREE.BufferGeometry[] = [];
    for (const x of [-0.95, 0, 0.95]) dframe.push(box(x - 0.04, L.gf, VESTIBULE.z0 - 0.09, x + 0.04, 2.4, VESTIBULE.z0));
    dframe.push(box(-0.95, 2.35, VESTIBULE.z0 - 0.09, 0.95, 2.43, VESTIBULE.z0));
    for (const x of [-0.45, 0.45]) dframe.push(box(x - 0.012, 0.95, VESTIBULE.z0 - 0.12, x + 0.012, 1.25, VESTIBULE.z0 - 0.08));
    b.add("shell", "silver", mergeAll(dframe));
    // Roofs: gallery + Maunon sali at 4.57, auditorium at 5.39, vestibule at 3.14.
    const gallRoof: V2[] = [];
    for (const p of pts) if (p[0] > -7.3 && !(p[1] < VESTIBULE.z1 + 0.05 && p[0] > VESTIBULE.x0 - 0.05 && p[0] < VESTIBULE.x1 + 0.05)) gallRoof.push(p);
    gallRoof.push([-7.13, NE_FACADE_Z], [27.83, NE_FACADE_Z]);
    b.add("upper", "roof", flatPolygon(gallRoof, L.wingRoof));
    b.add("shell", "roof", flatPolygon([[VESTIBULE.x0, VESTIBULE.z0], [VESTIBULE.x1, VESTIBULE.z0], [VESTIBULE.x1, VESTIBULE.z1 + 0.3], [VESTIBULE.x0, VESTIBULE.z1 + 0.3]], L.vestibuleRoof));
    b.add("shell", "blackSteel", box(VESTIBULE.x0 - 0.05, L.vestibuleRoof - 0.3, VESTIBULE.z0 - 0.08, VESTIBULE.x1 + 0.05, L.vestibuleRoof + 0.05, VESTIBULE.z0 + 0.1));
    // The vestibule's own ceiling (with two downlights) under its roof.
    b.add("ceiling", "ceiling", flatPolygon([[VESTIBULE.x0, VESTIBULE.z0], [VESTIBULE.x1, VESTIBULE.z0], [VESTIBULE.x1, VESTIBULE.z1], [VESTIBULE.x0, VESTIBULE.z1]], 2.86, { down: true }));
    soffitLights.push([-0.6, (VESTIBULE.z0 + VESTIBULE.z1) / 2], [0.6, (VESTIBULE.z0 + VESTIBULE.z1) / 2]);
    const audRoof: V2[] = [[-7.13, -33.3], [-11.61, -40.05], [-11.67, -48.05], ...arcPoints(AUDITORIUM.cx, AUDITORIUM.cz, AUDITORIUM.r, -1.6, -84.5, 1.5), [-29.12, NE_FACADE_Z], [-7.13, NE_FACADE_Z]];
    b.add("upper", "roof", flatPolygon(audRoof, L.auditoriumRoof));
    // Roof deck on the wing (timber decking, planters, the PV skylight box, round roof lights).
    if (!low) {
      const deck: V2[] = [[9.5, -38.8], [24.2, -38.8], [26.4, -33.0], [26.6, -32.3], [9.5, -32.3]];
      b.add("upper", "decking", flatPolygon(deck, L.wingRoof + 0.06));
      b.add("upper", "planter", box(10.0, L.wingRoof, -33.4, 23.5, L.wingRoof + 0.55, -32.6));
      b.add("upper", "soil", flatPolygon([[10.1, -33.3], [23.4, -33.3], [23.4, -32.7], [10.1, -32.7]], L.wingRoof + 0.5));
      // Skylight box with PV panels on its top (2025 aerial).
      b.add("upper", "silver", box(2.0, L.wingRoof, -32.4, 5.6, L.wingRoof + 1.0, -29.6));
      b.add("upper", "glassVault", box(2.15, L.wingRoof + 1.0, -32.25, 5.45, L.wingRoof + 1.05, -29.75));
    }
  }

  // ── 9. Roofs, parapets, technical storeys, penthouses, vault ───────────────
  {
    b.add("upper", "roof", flatPolygon(NORTH_UPPER, L.roof), flatPolygon(SOUTH_UPPER, 26.3));
    // Parapets with coping along the street and courtyard edges of the main roof.
    const edges: [V2, V2, number][] = [
      [CORNER.north, CORNER.recessN, L.roof],
      [CORNER.recessS, CORNER.west, 26.3],
      [CORNER.west, CORNER.south, 26.3],
      [CORNER.south, CORNER.eastSW, 26.3],
      [CORNER.eastNE, CORNER.eastN, L.roof],
      [[30.0, NE_FACADE_Z], [-40.3, NE_FACADE_Z], L.roof],
      [[-40.3, NE_FACADE_Z], CORNER.north, L.roof],
    ];
    for (const [p, q, base] of edges) {
      b.add("upper", "blackPanel", segmentBox(p, q, 0.25, base, L.parapet, { offset: -0.16 }));
      b.add("upper", "coping", segmentBox(p, q, 0.42, L.parapet, L.parapet + 0.06, { offset: -0.17 }));
    }
    // Technical storeys: light-grey corrugated cladding, parapet, roof.
    const techWalls = (ring: V2[], skipAtrium: number) => {
      const loop = [...ring, ring[0]];
      const parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i + 1 < loop.length; i++) {
        const p = loop[i];
        const q = loop[i + 1];
        if (Math.abs(p[1] - skipAtrium) < 0.01 && Math.abs(q[1] - skipAtrium) < 0.01) continue;
        parts.push(wallQuad(p, q, L.roof - 0.02, L.techParapet));
      }
      return mergeAll(parts);
    };
    b.add("upper", "techStorey", techWalls(TECH_NE, ATRIUM_NE_Z), techWalls(TECH_SW, ATRIUM_SW_Z));
    b.add("upper", "roof", flatPolygon(TECH_NE, L.tech), flatPolygon(TECH_SW, L.tech));
    for (const ring of [TECH_NE, TECH_SW]) {
      const loop = [...ring, ring[0]];
      for (let i = 0; i + 1 < loop.length; i++) b.add("upper", "coping", segmentBox(loop[i], loop[i + 1], 0.35, L.techParapet, L.techParapet + 0.06, { offset: -0.17 }));
    }
    for (const ph of PENTHOUSES) b.add("upper", "techStorey", prism(ph.poly, L.tech - 0.02, ph.top));
    // Rooftop plant: fan banks and boxes (DSM), condenser rows on the N-block roof.
    const rnd = mulberry32(4711);
    const units: THREE.BufferGeometry[] = [];
    const fans: THREE.BufferGeometry[] = [];
    const unitBox = (x0: number, z0: number, x1: number, z1: number, y: number, h: number, fanRows = 2) => {
      units.push(box(x0, y, z0, x1, y + h, z1));
      const nx = Math.max(1, Math.floor((x1 - x0) / 1.1));
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < fanRows; j++) {
          const fx = x0 + ((i + 0.5) * (x1 - x0)) / nx;
          const fz = z0 + ((j + 0.5) * (z1 - z0)) / fanRows;
          fans.push(cylinder(fx, fz, Math.min(0.42, (z1 - z0) / fanRows / 2.4), y + h, y + h + 0.06, 14));
        }
      }
    };
    unitBox(-38, -30, -24, -26.6, L.tech, 1.6);
    unitBox(-37.2, -25.6, -26.4, -24.2, L.tech, 1.4, 1);
    unitBox(-15, -11.2, -12, -9.8, L.tech, 1.8, 1);
    unitBox(6, -11.2, 10, -9.8, L.tech, 1.8, 1);
    unitBox(-8, 8.2, 2, 10.6, L.tech, 1.2);
    // Condenser rows on the N-block roof, ≥ 1 m inside its parapets (the Tykistökatu face slants).
    for (let i = 0; i < 3; i++) {
      const x = -51.8 + i * 3.4 + rnd() * 0.3;
      unitBox(x, -29.0, x + 2.6, -26.9, L.roof, 1.25);
    }
    for (let i = 0; i < 2; i++) {
      const x = -49.0 + i * 3.4 + rnd() * 0.3;
      unitBox(x, -22.5, x + 2.4, -20.5, L.roof, 1.25);
    }
    unitBox(-44.4, -14.5, -41.4, -11.6, L.roof, 1.1);
    b.add("upper", "plantGrey", mergeAll(units));
    b.add("upper", "blackSteel", mergeAll(fans));
  }

  // ── 10. Atrium vault and the glazed gables ─────────────────────────────────
  {
    const segs = low ? 10 : 18;
    const ribs: THREE.BufferGeometry[] = [];
    const purl: THREE.BufferGeometry[] = [];
    const glass: number[] = [];
    const angles: number[] = [];
    for (let i = 0; i <= segs; i++) angles.push(-VAULT.halfAngle + (2 * VAULT.halfAngle * i) / segs);
    const pt = (x: number, a: number) => new THREE.Vector3(x, VAULT.cy + VAULT.radius * Math.cos(a), VAULT.cz + VAULT.radius * Math.sin(a));
    const nRibs = Math.round((VAULT.x1 - VAULT.x0) / 1.2);
    for (let r = 0; r <= nRibs; r++) {
      const x = VAULT.x0 + ((VAULT.x1 - VAULT.x0) * r) / nRibs;
      const heavy = r % 5 === 0;
      for (let i = 0; i < segs; i++) ribs.push(bar(pt(x, angles[i]), pt(x, angles[i + 1]), heavy ? 0.12 : 0.06, heavy ? 0.26 : 0.14));
    }
    // Purlins every ≈1.35 m along the arch.
    const arcLen = 2 * VAULT.halfAngle * VAULT.radius;
    const nP = Math.max(4, Math.round(arcLen / 1.35));
    for (let j = 0; j <= nP; j++) {
      const a = -VAULT.halfAngle + (2 * VAULT.halfAngle * j) / nP;
      purl.push(bar(pt(VAULT.x0, a), pt(VAULT.x1, a), 0.07, 0.09));
    }
    // Glass skin (slightly above the bars' outer face).
    const R = VAULT.radius + 0.02;
    for (let i = 0; i < segs; i++) {
      const a0 = angles[i];
      const a1 = angles[i + 1];
      const p = (x: number, a: number) => [x, VAULT.cy + R * Math.cos(a), VAULT.cz + R * Math.sin(a)];
      const q00 = p(VAULT.x0, a0);
      const q01 = p(VAULT.x0, a1);
      const q10 = p(VAULT.x1, a0);
      const q11 = p(VAULT.x1, a1);
      glass.push(...q00, ...q11, ...q10, ...q00, ...q01, ...q11);
    }
    const gGeo = new THREE.BufferGeometry();
    gGeo.setAttribute("position", new THREE.Float32BufferAttribute(glass, 3));
    gGeo.computeVertexNormals();
    // Make normals point outwards (up).
    const nAttr = gGeo.getAttribute("normal");
    if (nAttr.getY(0) < 0) {
      const arr = gGeo.getAttribute("position").array as Float32Array;
      for (let i = 0; i < arr.length; i += 9) {
        for (let k = 0; k < 3; k++) {
          const t = arr[i + 3 + k];
          arr[i + 3 + k] = arr[i + 6 + k];
          arr[i + 6 + k] = t;
        }
      }
      gGeo.computeVertexNormals();
    }
    const pos = gGeo.getAttribute("position");
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i);
      uv[i * 2 + 1] = pos.getZ(i);
    }
    gGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    b.add("upper", "whiteSteel", mergeAll(ribs), mergeAll(purl));
    b.add("upper", "glassVault", gGeo);
    // Eaves gutters along both sides.
    b.add("upper", "whiteSteel", box(VAULT.x0, L.vaultEaves - 0.25, VAULT.cz - VAULT.half - 0.3, VAULT.x1, L.vaultEaves + 0.05, VAULT.cz - VAULT.half + 0.05));
    b.add("upper", "whiteSteel", box(VAULT.x0, L.vaultEaves - 0.25, VAULT.cz + VAULT.half - 0.05, VAULT.x1, L.vaultEaves + 0.05, VAULT.cz + VAULT.half + 0.3));

    // Gables: silver-framed glass from the floor (west) / the connector roof (east) up to the arch.
    const gable = (x: number, y0: number, zA: number, zB: number, facing: 1 | -1) => {
      const a: V2 = facing < 0 ? [x, zA] : [x, zB];
      const c: V2 = facing < 0 ? [x, zB] : [x, zA];
      const top = (s: number) => {
        const z = a[1] + ((c[1] - a[1]) * s) / dist2(a, c);
        return Math.max(y0 + 0.1, vaultY(z) - 0.05);
      };
      const glassGeo = glassPane(a, c, y0, top, 24);
      const frames = glazingGrid(a, c, y0, top, { pitch: 1.2, rowPitch: 1.35, width: 0.07, depth: 0.16, offset: 0.08 });
      // Floor-level transoms: heavier bands at every storey.
      const bands = glazingGrid(a, c, y0, top, { pitch: 1e6, rowPitch: 1e6, width: 0.22, depth: 0.22, offset: 0.1, rows: [L.f2, L.f3, L.f4, L.f5, L.f6, L.f7, L.roof].filter((y) => y > y0 + 0.5) });
      // The arch over the roof line is braced with diagonal bars (diamond pattern, Haroma 05).
      const diag: THREE.BufferGeometry[] = [];
      const len = dist2(a, c);
      const yb = L.roof;
      const nrm = runNormal(a, c);
      const off = 0.1;
      const P3 = (sv: number, y: number) => {
        const p = along(a, c, sv);
        return new THREE.Vector3(p[0] + nrm[0] * off, y, p[1] + nrm[1] * off);
      };
      for (const dir of low ? [] : [1, -1]) {
        for (let k = -12; k <= 12; k++) {
          // Line y = yb + dir·(s − s0) through s0 = k·1.35 (45°), clipped to [yb, top(s)].
          const s0 = k * 1.35;
          let prev: THREE.Vector3 | null = null;
          for (let i = 0; i <= 48; i++) {
            const sv = (len * i) / 48;
            const y = yb + dir * (sv - s0);
            const inside = y >= yb - 1e-6 && y <= top(sv) - 0.05;
            const p = inside ? P3(sv, y) : null;
            if (p && prev) diag.push(bar(prev, p, 0.05, 0.08));
            prev = p;
          }
        }
      }
      return { glassGeo, frames: [...frames, ...bands, ...diag] };
    };
    // West gable (Tykistökatu, in the recess): faces −x.
    {
      const g = gable(GABLE_W_X, L.gf, ATRIUM.z0, 5.5, -1);
      // Split the glass at the cut for the dollhouse.
      b.add("upper", "glassClear", g.glassGeo);
      b.add("upper", "silver", mergeAll(g.frames));
      // Ground storey of the gable stays with the shell (the entrance), as a separate low pane.
      b.add("shell", "blackPanel", box(GABLE_W_X - 0.3, 26.36, 5.5, GABLE_W_X + 0.2, L.vaultEaves, 6.4));
    }
    // East gable over the Joki connector: faces +x.
    {
      const g = gable(GABLE_E_X, L.connectorRoof, ATRIUM_NE_Z, 5.6, 1);
      b.add("upper", "glassClear", g.glassGeo);
      b.add("upper", "silver", mergeAll(g.frames));
    }
  }

  // ── 11. Columns: arcades, Tykistökatu overhang, pilotis ────────────────────
  {
    const cols: THREE.BufferGeometry[] = [];
    const tall: THREE.BufferGeometry[] = [];
    for (const c of ROUND_COLUMNS) {
      const underTower = c.x < -29 && c.z > 5;
      const top = underTower ? L.towerSoffit - 0.45 : L.arcadeSoffit;
      const g = Math.min(env.groundB(c.x, c.z), 0);
      (underTower ? tall : cols).push(cylinder(c.x, c.z, c.d / 2, g - 0.2, top, low ? 10 : 20));
    }
    b.add("shell", "blackSteel", mergeAll(cols), mergeAll(tall));
  }

  // ── 12. Tykistökatu entrance: canopy, revolving door, side door, threshold ──
  {
    const C = ENTRANCE_TYK.canopy;
    b.add("shell", "blackSteel", box(C.x0, C.under, C.z0, C.x1, C.top, C.z1));
    // White LED line along the canopy's front edge and downlights under it.
    b.add("shell", "lightStrip", box(C.x0 - 0.01, C.under + 0.02, C.z0 + 0.05, C.x0 + 0.01, C.under + 0.07, C.z1 - 0.05));
    for (const z of [C.z0 + 0.8, (C.z0 + C.z1) / 2, C.z1 - 0.8]) soffitLights.push([(C.x0 + C.x1) / 2, z]);
    // Recess floor (light-grey slabs, level access) and the pilotis paving.
    const D = ENTRANCE_TYK.drum;
    const r = D.r;
    const drum: THREE.BufferGeometry[] = [];
    const drumFrame: THREE.BufferGeometry[] = [];
    // Curved glass enclosure (two arcs, open towards ±x), canopy disc and floor ring.
    for (const [b0, b1] of [
      [-62, 62],
      [118, 242],
    ]) {
      const arc = arcPoints(D.x, D.z, r, b0, b1, 0.35);
      for (let i = 0; i + 1 < arc.length; i++) drum.push(wallQuad(arc[i], arc[i + 1], L.gf, 2.35, { doubleSided: true }));
      for (const p of [arc[0], arc[arc.length - 1]]) drumFrame.push(cylinder(p[0], p[1], 0.04, L.gf, 2.4, 8));
    }
    drumFrame.push(cylinder(D.x, D.z, r + 0.06, 2.35, 2.62, 32));
    drumFrame.push(cylinder(D.x, D.z, r + 0.02, L.gf - 0.01, L.gf + 0.03, 32));
    // Three wings (120°), at rest with one wing across the door's axis.
    for (let i = 0; i < 3; i++) {
      const a = ((i * 120) * Math.PI) / 180;
      const end: V2 = [D.x + Math.sin(a) * (r - 0.03), D.z - Math.cos(a) * (r - 0.03)];
      drum.push(wallQuad([D.x, D.z], end, L.gf + 0.04, 2.3, { doubleSided: true }));
      drumFrame.push(bar({ x: D.x, y: 2.3, z: D.z }, { x: end[0], y: 2.3, z: end[1] }, 0.05));
      drumFrame.push(bar({ x: end[0], y: L.gf + 0.04, z: end[1] }, { x: end[0], y: 2.3, z: end[1] }, 0.05));
    }
    drumFrame.push(cylinder(D.x, D.z, 0.06, L.gf, 2.35, 10));
    // The drum stands inside the gable: interior glass (lit like the lobby, no sun glare in the dollhouse).
    b.add("shell", "glassIn", mergeAll(drum));
    b.add("shell", "silver", mergeAll(drumFrame));
    // Glass cheeks from the gable opening to the drum's mouth, with a lintel over the opening.
    const O = ENTRANCE_TYK.opening;
    const mouthX = D.x - D.r * Math.sin((62 * Math.PI) / 180);
    b.add("shell", "glassIn", wallQuad([mouthX, O.z0], [GABLE_W_X, O.z0], L.gf, 2.45, { doubleSided: true }), wallQuad([GABLE_W_X, O.z1], [mouthX, O.z1], L.gf, 2.45, { doubleSided: true }));
    b.add(
      "shell",
      "silver",
      box(GABLE_W_X - 0.06, L.gf, O.z0 - 0.06, mouthX, 2.5, O.z0),
      box(GABLE_W_X - 0.06, L.gf, O.z1, mouthX, 2.5, O.z1 + 0.06),
      box(GABLE_W_X - 0.08, 2.45, O.z0 - 0.06, mouthX, 2.62, O.z1 + 0.06),
    );
    // Green "A" sign by the door (lettering is a canvas plane added by the caller).
    // Threshold strip.
    b.add("shell", "silver", box(GABLE_W_X - 0.5, L.gf - 0.01, -1.2, GABLE_W_X + 0.3, L.gf + 0.012, 2.3));
    // Ground-storey gable glass (separate from the tall upper pane, stays in the dollhouse), open at the drum.
    const top = CUT;
    const panes: [V2, V2][] = [
      [[GABLE_W_X, 5.5], [GABLE_W_X, O.z1]],
      [[GABLE_W_X, O.z0], [GABLE_W_X, ATRIUM.z0]],
    ];
    for (const [a, c] of panes) {
      b.add("shell", "glassLow", wallQuad(a, c, L.gf, top));
      b.add("shell", "silver", mergeAll(glazingGrid(a, c, L.gf, () => top, { pitch: 1.2, rowPitch: 2.45, width: 0.08, depth: 0.16, offset: 0.08 })));
    }
    // Over the opening: glass above the lintel.
    b.add("shell", "glassLow", wallQuad([GABLE_W_X, O.z1], [GABLE_W_X, O.z0], 2.62, top));
  }

  // ── 13. Recess paving (syvänne) and the pilotis floor ──────────────────────
  // Flat at +0.03 (the supercars stand at ≥ +0.015, props/vehicles.ts) with a 0.6 m bevel down to the
  // sidewalk along the street edges, so the recess stays flush with Tykistökatu.
  const RECESS_Y = 0.03;
  {
    const street: V2[] = [CORNER.recessN, CORNER.recessS, CORNER.west, [-24.0, SW_FACADE_Z]];
    const inset = 0.6;
    // Inset the street polyline (towards the building, i.e. against each segment's outward normal).
    const offsetLine = (pts: V2[], d: number): V2[] => {
      const out: V2[] = [];
      for (let i = 0; i < pts.length; i++) {
        const nPrev = i > 0 ? runNormal(pts[i - 1], pts[i]) : null;
        const nNext = i + 1 < pts.length ? runNormal(pts[i], pts[i + 1]) : null;
        let nx = (nPrev?.[0] ?? 0) + (nNext?.[0] ?? 0);
        let nz = (nPrev?.[1] ?? 0) + (nNext?.[1] ?? 0);
        const l = Math.hypot(nx, nz) || 1;
        nx /= l;
        nz /= l;
        // Mitre: scale by 1/cos(half angle).
        const ref = nNext ?? nPrev ?? [nx, nz];
        const cos = Math.max(0.5, nx * ref[0] + nz * ref[1]);
        out.push([pts[i][0] - (nx * d) / cos, pts[i][1] - (nz * d) / cos]);
      }
      return out;
    };
    const inner = offsetLine(street, inset);
    // Keep the ends on the walls they start/end at.
    inner[0] = [CORNER.recessN[0] + 0.25, -4.62 - 0.0];
    inner[inner.length - 1] = [-24.0, SW_FACADE_Z - inset];
    const flat: V2[] = [
      ...inner,
      [-24.0, 14.6],
      [-30.0, 14.6],
      [-30.0, 5.6],
      [GABLE_W_X, 5.6],
      [GABLE_W_X, -4.62],
    ];
    b.add("shell", "paving", flatPolygon(flat, RECESS_Y));
    // Bevel quads between the inner (0.015) and street (sidewalk) edges.
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const ySt = (p: V2) => Math.min(0.012, env.groundB(p[0], p[1]) + 0.004);
    const outer: V2[] = [[CORNER.recessN[0] + 0.25, -4.62 + 0.0], ...street.slice(1)];
    outer[0] = [CORNER.recessN[0], CORNER.recessN[1]];
    for (let i = 0; i + 1 < outer.length; i++) {
      const a0 = outer[i];
      const a1 = outer[i + 1];
      const b0 = inner[i];
      const b1 = inner[i + 1];
      const k = pos.length / 3;
      for (const [p, y] of [
        [a0, ySt(a0)],
        [a1, ySt(a1)],
        [b1, RECESS_Y],
        [b0, RECESS_Y],
      ] as [V2, number][]) {
        pos.push(p[0], y, p[1]);
        uv.push(p[0], -p[1]);
      }
      idx.push(k, k + 2, k + 1, k, k + 3, k + 2);
    }
    const bevel = new THREE.BufferGeometry();
    bevel.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    bevel.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    bevel.setIndex(idx);
    bevel.computeVertexNormals();
    if ((bevel.getAttribute("normal") as THREE.BufferAttribute).getY(0) < 0) {
      const arr = bevel.getIndex()!.array as Uint16Array | Uint32Array;
      for (let i = 0; i < arr.length; i += 3) [arr[i + 1], arr[i + 2]] = [arr[i + 2], arr[i + 1]];
      bevel.computeVertexNormals();
    }
    b.add("shell", "paving", bevel);
  }

  // ── 14. Flag poles (three white poles, two flush sockets) ──────────────────
  {
    const poles: THREE.BufferGeometry[] = [];
    for (const f of FLAGPOLES) {
      const g = env.groundB(f.x, f.z);
      if (f.pole) {
        const p = new THREE.CylinderGeometry(0.045, 0.07, FLAGPOLE_HEIGHT, 12, 1, true);
        p.translate(f.x, g + FLAGPOLE_HEIGHT / 2, f.z);
        poles.push(p);
        poles.push(cylinder(f.x, f.z, 0.07, g + FLAGPOLE_HEIGHT, g + FLAGPOLE_HEIGHT + 0.1, 10));
        poles.push(cylinder(f.x, f.z, 0.12, g - 0.02, g + 0.08, 12));
      } else {
        poles.push(cylinder(f.x, f.z, 0.1, g - 0.02, g + 0.02, 12));
      }
    }
    b.add("shell", "flagpole", mergeAll(poles.map((g) => (g.getAttribute("uv") ? g : g))));
  }

  // Downlights in the soffits (arcades, pilotis, canopy).
  {
    const discs: THREE.BufferGeometry[] = [];
    for (const [x, z] of soffitLights) {
      const pilotis = x < -29.5 && z > 5;
      const canopy = x < -29.9 && x > -31.7 && z > -1.6 && z < 2.1;
      const vestibule = x > VESTIBULE.x0 && x < VESTIBULE.x1 && z > VESTIBULE.z0 && z < VESTIBULE.z1;
      const y = canopy ? ENTRANCE_TYK.canopy.under : pilotis ? L.towerSoffit - 0.45 : vestibule ? 2.86 : L.arcadeSoffit;
      const g = new THREE.CircleGeometry(canopy ? 0.06 : 0.09, 12);
      g.rotateX(Math.PI / 2);
      g.translate(x, y - 0.006, z);
      discs.push(g);
    }
    if (discs.length) b.add("ceiling", "lightWarm", mergeAll(discs));
  }
  return { extra, soffitLights };
}
