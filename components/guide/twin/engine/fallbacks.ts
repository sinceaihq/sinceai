import { bearingVector } from "./frame";
import type { CameraView, LevelId, V2 } from "./types";

/**
 * What the engine shows before — or without — the module that models a place
 * (DESIGN §10): a camera view for every view of lib PLACES_3D, the event
 * targets it can frame from outside, and where walk mode starts. A module's
 * own views and targets replace these when it loads. Also the walking level of
 * a tour's route points. Pure data and maths, unit-tested against the campus
 * data (no camera inside a building, every start on open ground).
 */

// ── Views and targets ───────────────────────────────────────────────────────

/** Camera views until the modules provide their own (every view of lib PLACES_3D has one). */
export const FALLBACK_VIEWS: Record<string, CameraView> = {
  // High oblique from the south-west, the low sun behind the camera's shoulder: BioCity, Joki (in the
  // courtyard between BioCity and DataCity), DataCity, ICT-City, EduCity, ParkCity and the station.
  "campus:default": {
    position: [-140, 280, 235],
    target: [120, 0, 38],
    hfov: 58,
    fit: 175,
    portrait: { position: [-40, 360, 260], target: [110, 0, 30] },
    labels: true,
    open: null,
  },
  "campus:top": {
    position: [118, 620, 104],
    target: [118, 0, 24],
    fov: 38,
    fit: 200,
    labels: true,
    open: null,
  },
  // Tykistökatu at the BioCity partner entrance: from across the street, eye height.
  "campus:arrival": {
    position: [-62, 7, -50],
    target: [-27, 4, -15],
    hfov: 68,
    open: null,
  },
  "campus:courtyard": {
    position: [92, 22, -42],
    target: [44, 2, 6],
    hfov: 64,
    open: null,
  },
  "biocity:default": {
    position: [-92, 48, -82],
    target: [-2, 10, 2],
    hfov: 58,
    fit: 70,
    open: null,
  },
  // Every other view of lib PLACES_3D gets an exterior stand-in, so no view chip is ever dead while a
  // building module is missing; the module's own (interior) views replace these when it loads.
  // Tykistökatu from the far pavement: the recess, the glass corner tower and the crown bridge.
  "biocity:entrance": { position: [-60, 12, -47], target: [-26, 5, -14], hfov: 64, open: null },
  // Along the courtyard to the curved Aulagalleria and the event entrance at its apex.
  "biocity:gallery": { position: [50, 12, 4], target: [16, 3, -8], hfov: 66, open: null },
  // The stands are inside the lobby and the gallery: the whole footprint and the courtyard from above.
  "biocity:stands": { position: [36, 110, -58], target: [6, 0, 6], hfov: 52, fit: 60, open: null },
  // The round tower from Jussin aukio (north-east), DataCity's brick behind it.
  "joki:default": {
    position: [84, 30, -36],
    target: [56, 4, 18],
    hfov: 60,
    fit: 40,
    open: null,
  },
  // Floor 1 is the drum below the deck: seen from Pihakansi on its west side.
  "joki:showroom": { position: [38, 10, 26], target: [58.9, 1.5, 15.9], hfov: 60, fit: 26, open: null },
  "joki:lounge": { position: [80, 10, 30], target: [62, 1.5, 18], hfov: 60, fit: 26, open: null },
  // Floors 2–3: the glass storeys behind the fin screen, from the NE deck.
  "joki:floors": { position: [74, 9, 0], target: [58.9, 6, 15.9], hfov: 62, fit: 26, open: null },
  "educity:default": {
    position: [128, 52, 178],
    target: [212, 10, 98],
    hfov: 58,
    fit: 70,
    open: null,
  },
  // The briefing rooms line the north-east facade on Joukahaisenkatu (floors 1 and 2).
  "educity:rooms1": { position: [262, 22, 40], target: [230, 6, 74], hfov: 60, fit: 50, open: null },
  "educity:rooms2": { position: [268, 34, 30], target: [228, 12, 76], hfov: 60, fit: 50, open: null },
  // Both main entrances are in the glass pavilion at deck level, on the south-west side.
  "educity:entrance": { position: [172, 20, 162], target: [192, 5, 124], hfov: 62, fit: 45, open: null },
};

/** Engine fallbacks for event targets (overridden by the modules that model them). */
export const FALLBACK_TARGETS: Record<string, CameraView> = {
  // SPEC §5.5: from the opposite (north-west) pavement — the cars, flagpoles, glass tower and bridge band.
  supercars: { position: [-49, 1.65, -28.1], target: [-27.5, 1, -16.5], hfov: 70, open: null },
  "entrance-biocity-tykistokatu": { position: [-46, 9, -35], target: [-25, 2, -12], hfov: 62, open: null },
  // The courtyard is only ≈12 m wide here (Electrocity opposite): look along it from its east end.
  "entrance-biocity-courtyard": { position: [47, 7, 3], target: [22.7, 1.5, -8], hfov: 60, open: null },
  "entrance-educity-west": { position: [150, 16, 128], target: [177.8, 4.5, 115.1], hfov: 62, open: null },
  "entrance-educity-east": { position: [196, 16, 168], target: [204, 4.5, 136.5], hfov: 62, open: null },
  // Door B in its brick portal on the south-east walkway (deck level).
  "entrance-educity-b": { position: [248.2, 8.4, 117.8], target: [237.3, 4.6, 109], hfov: 62, open: null },
  // Street level in the passage between ICT-City and EduCity, from Joukahaisenkatu.
  "entrance-educity-gateway": { position: [218, 2.5, 41], target: [196.9, 0, 76.8], hfov: 60, open: null },
  "entrance-joki-street": { position: [-14, 8, 74], target: [8.6, 0, 51], hfov: 62, open: null },
  "jussin-aukio": { position: [86, 34, -42], target: [52, 1.5, 4], hfov: 62, open: null },
  // Over the railway cutting from the south-east: the platform, the station hall on its bridge.
  "kupittaa-station": { position: [250, 50, -90], target: [205, 2, -128], hfov: 60, open: null },
  parkcity: { position: [170, 50, 40], target: [223, 10, -14], hfov: 60, open: null },
};

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * Level of a route point, so a tour frames indoors exactly from the door and
 * the chase camera collides with the right floor's walls: outdoor legs walk the
 * campus; indoor legs are named after their building (int-bio-*, int-joki-*,
 * int-edu-*), and BioCity's legs end down the passage stair on Joki's floor 1
 * (y −1.70). Unknown indoor legs → null (the tour then infers levels itself).
 */
export function legLevel(legId: string, outdoor: boolean, y: number): LevelId | null {
  if (outdoor) return "outdoor";
  if (legId.startsWith("int-edu-")) return y > 5.9 ? "educity-2" : "educity-1";
  if (legId.startsWith("int-joki-")) return y > 4.9 ? "joki-3" : y > 0.9 ? "joki-2" : "joki-1";
  if (legId.startsWith("int-bio-")) return y < -0.8 ? "joki-1" : "biocity-1";
  return null;
}

// ── Walk starts ─────────────────────────────────────────────────────────────

/**
 * Where walk mode starts for a place whose building module is not loaded (and for the campus
 * overviews, whose look-at points are rooftops): on the ground, facing something worth walking to.
 */
export const WALK_STARTS: Record<string, { position: V2; yawDeg: number }> = {
  // Jussin aukio at the foot of the stair down from the campus deck, facing BioCity's event entrance.
  campus: { position: [50.5, 6], yawDeg: 296 },
  // The far (north-west) pavement of Tykistökatu, opposite the partner entrance recess (SPEC §5.5).
  "campus:arrival": { position: [-49, -28.1], yawDeg: 118 },
  // The drop-off kerb on Tykistökatu, facing BioCity's partner entrance (route out-co-kerb-bio-main).
  biocity: { position: [-35.6, -22], yawDeg: 132 },
  // Jussin aukio, facing the Joki tower.
  joki: { position: [40, 1], yawDeg: 128 },
  // On the campus deck (the builders' route), 11 m from EduCity's west main entrance, facing it.
  educity: { position: [165.6, 99.5], yawDeg: 131.5 },
};

/** Move a point inside a footprint ring out through its nearest wall, `margin` m beyond it. */
export function pushOutOfRing(p: V2, ring: readonly V2[], margin = 0.6): V2 {
  let best = Infinity;
  let nx = p[0];
  let nz = p[1];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, az] = ring[j];
    const ex = ring[i][0] - ax;
    const ez = ring[i][1] - az;
    const l2 = ex * ex + ez * ez || 1;
    const u = Math.min(1, Math.max(0, ((p[0] - ax) * ex + (p[1] - az) * ez) / l2));
    const d = Math.hypot(ax + ex * u - p[0], az + ez * u - p[1]);
    if (d < best) {
      best = d;
      nx = ax + ex * u;
      nz = az + ez * u;
    }
  }
  const dx = nx - p[0];
  const dz = nz - p[1];
  const len = Math.hypot(dx, dz) || 1;
  return [nx + (dx / len) * margin, nz + (dz / len) * margin];
}

/**
 * Where to stand in front of a door: out along its facing (compass bearing,
 * outwards) until clear of the building, then up to 8 m more while the ground
 * stays within 0.6 m of the threshold — walkways and decks end in banks and
 * stairs. At least 1.5 m clear of the wall.
 */
export function doorStart(
  at: V2,
  facing: number,
  opts: { blocked(p: V2): boolean; groundAt(p: V2): number; doorY?: number },
): V2 {
  const [ux, uz] = bearingVector(facing);
  const point = (d: number): V2 => [at[0] + ux * d, at[1] + uz * d];
  let d = 1;
  while (d < 20 && opts.blocked(point(d))) d += 0.5;
  const level = opts.doorY ?? opts.groundAt(point(d));
  const clear = d;
  while (d < clear + 8 && Math.abs(opts.groundAt(point(d + 0.5)) - level) < 0.6 && !opts.blocked(point(d + 0.5))) d += 0.5;
  return point(Math.max(clear + 1.5, d - 1));
}
