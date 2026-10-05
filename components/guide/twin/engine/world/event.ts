import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { LightingState, TwinContext, V2, V3, WorldModule } from "../types";
import { loadTerrain, type Terrain } from "../data/campus";
import { canvasTexture, makeCanvas } from "../render/canvas";
import { boxUV } from "../render/uv";
import { loadImage, monoFont, mulberry32, pointInRing } from "../util";
import { PLAN_FRAMES, bearingVector, planToLocal } from "../frame";
import { LUMINANCE } from "../sky/sky";
import { PROBE_IGNORE, surfaceService } from "./routes";
import { EVENT_2026 } from "@/lib/hackathon-2026/facts";
import { formatTime } from "@/lib/hackathon-2026/time";

/**
 * Since AI event dressing (DESIGN §1, §2, SPEC §5.5, §6, §8.3): banners on
 * BioCity's recess flagpoles (one names the partners' entrance), feather flags
 * (one marks the builders' entrance), wayfinding totems, floor stickers, a
 * violet line light across the partner recess, black stanchions with violet
 * belts at Joki's closed street door, a registration sign hung over EduCity's
 * desks and violet uplights — tasteful, like a premium tech event, and only in
 * the event violets.
 *
 * - Prints (flags, banners, totem faces, signs, stickers) are drawn once into
 *   two canvas atlases with the Since AI marks from /assets/logo and the
 *   guide's mono type; arrows and texts are baked per face.
 * - Everything static is merged per material: frames (graphite powder-coat),
 *   prints (lit, backlit at night), stickers, glows — and the flag sails and
 *   pole banners are two InstancedMeshes that flutter in a vertex shader (still
 *   with reduced motion). 6 draw calls, ≈ 13k triangles.
 * - Every item stands on the surface the ground and building modules modelled
 *   (the shared surface probe in world/routes.ts), else on the DTM or its
 *   known floor level.
 * - Text, times and places come from lib/hackathon-2026 (EVENT_2026).
 */

// ── Colours ──────────────────────────────────────────────────────────────────

const VIOLET = "#8b7bff";
const VIOLET_STRONG = "#6d4dff";
const VIOLET_DEEP = "#2a1a8c";
const INK = "#0b0a12";
const LAVENDER = "#cfc7ff";
const GREY_TEXT = "#9a98a8";

// ── Atlas layout (base 2048 px; low tier draws at half size) ─────────────────

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ATLAS = 2048;
const DECAL_ATLAS = 1024;

/** Totem face i (0–14): 0.56 × 1.88 m faces, 192 × 640 px. */
function faceRegion(i: number): Region {
  if (i < 10) return { x: 1024 + (i % 5) * 192, y: Math.floor(i / 5) * 640, w: 192, h: 640 };
  return { x: (i - 10) * 192, y: 1280, w: 192, h: 640 };
}

const REGIONS = {
  /** Feather flags (0.85 × 3.4 m sails). */
  featherViolet: { x: 0, y: 0, w: 320, h: 1280 },
  featherBuilders: { x: 320, y: 0, w: 320, h: 1280 },
  /** Flagpole banners (1.0 × 3.33 m). */
  bannerBrand: { x: 640, y: 0, w: 288, h: 960 },
  bannerPartners: { x: 640, y: 960, w: 288, h: 960 },
  /** Hanging sign over EduCity's registration desk (1.96 × 0.7 m), both sides. */
  hangFront: { x: 1024, y: 1280, w: 448, h: 160 },
  hangBack: { x: 1024, y: 1440, w: 448, h: 160 },
  belt: { x: 1472, y: 1280, w: 128, h: 32 },
  beltPlain: { x: 1472, y: 1344, w: 128, h: 32 },
  edge: { x: 1600, y: 1280, w: 32, h: 128 },
} satisfies Record<string, Region>;

const DECAL_REGIONS: Record<DecalId, Region> = {
  partners: { x: 0, y: 0, w: 512, h: 512 },
  builders: { x: 512, y: 0, w: 512, h: 512 },
  registration: { x: 0, y: 512, w: 512, h: 512 },
  doorB: { x: 512, y: 512, w: 512, h: 512 },
};

/** UV rectangle of a region (CanvasTexture flipY: v = 0 at the canvas bottom). */
export function regionUV(r: Region, size = ATLAS): { u0: number; v0: number; u1: number; v1: number } {
  return { u0: r.x / size, u1: (r.x + r.w) / size, v0: 1 - (r.y + r.h) / size, v1: 1 - r.y / size };
}

// ── Signage content ──────────────────────────────────────────────────────────

type Arrow = "up" | "left" | "right" | "upLeft" | "upRight" | "down";

interface FaceRow {
  title: string;
  sub?: string;
  arrow?: Arrow;
}

/** A totem face: header (Since AI marks), a hero message with one big arrow, or a list of destinations. */
export interface FaceDesign {
  /** A plain information notice: light face, dark type, no event violet and no Since AI marks. */
  notice?: boolean;
  kicker?: string;
  title?: string[];
  sub?: string[];
  detail?: string[];
  arrow?: Arrow;
  rows?: FaceRow[];
}

const t = (iso: string) => formatTime(iso);

/** Every totem face (ids index the atlas). Texts in the guide's voice, times from lib EVENT_2026. */
export const FACES = {
  partnersLeft: {
    kicker: "Welcome",
    title: ["Partners", "& companies"],
    sub: ["Main entrance"],
    detail: ["BioCity · Tykistökatu 6", "Joki Showroom inside"],
    arrow: "left",
  },
  partnersRight: {
    kicker: "Welcome",
    title: ["Partners", "& companies"],
    sub: ["Main entrance"],
    detail: ["BioCity · Tykistökatu 6", "Joki Showroom inside"],
    arrow: "right",
  },
  buildHallAhead: {
    kicker: "Builders",
    title: ["Build hall"],
    sub: ["BioCity event", "entrance"],
    detail: ["Open around the clock"],
    arrow: "up",
  },
  buildHallDown: {
    kicker: "Builders",
    title: ["Build hall"],
    sub: ["Down the stairs", "to BioCity"],
    detail: ["Event entrance 50 m"],
    arrow: "up",
  },
  educityBack: {
    kicker: "This way",
    title: ["EduCity"],
    sub: ["Up the stairs,", "along the deck"],
    detail: ["Taidon portaat · 200 m"],
    arrow: "up",
  },
  registrationUp: {
    kicker: `Fri from ${t(EVENT_2026.builderRegistration)}`,
    rows: [
      { title: "Registration", sub: "East main entrance", arrow: "up" },
      { title: "Challenge partners", sub: `Door B · from ${t(EVENT_2026.challengePartnerArrival)}`, arrow: "up" },
    ],
  },
  doorBRight: {
    kicker: `Fri from ${t(EVENT_2026.challengePartnerArrival)}`,
    title: ["Challenge", "partners"],
    sub: ["Door B", "Room 1002"],
    detail: ["Arrival & briefings"],
    arrow: "right",
  },
  doorBLeft: {
    kicker: `Fri from ${t(EVENT_2026.challengePartnerArrival)}`,
    title: ["Challenge", "partners"],
    sub: ["Door B", "Room 1002"],
    detail: ["Arrival & briefings"],
    arrow: "left",
  },
  transferAhead: {
    kicker: "Builders",
    title: ["Build hall"],
    sub: ["BioCity", "along the deck"],
    detail: ["200 m · 3 min"],
    arrow: "up",
  },
  stepFree: {
    kicker: "Accessible",
    title: ["Step-free", "entrance"],
    sub: ["Lifts to", "EduCity floor 1"],
    detail: ["Registration · rooms"],
    arrow: "up",
  },
  jokiClosed: {
    notice: true,
    kicker: "Joki",
    title: ["Door closed", "during the", "event"],
    sub: ["Enter via BioCity", "Tykistökatu 6"],
    detail: ["110 m · round the corner"],
    arrow: "left",
  },
  jokiClosedBack: {
    notice: true,
    kicker: "Joki",
    title: ["Door closed", "during the", "event"],
    sub: ["Enter via BioCity", "Tykistökatu 6"],
    detail: ["110 m · round the corner"],
    arrow: "right",
  },
  parkcity: {
    kicker: "Since AI Hackathon",
    rows: [
      { title: "EduCity", sub: "Cross at the zebra · 2 min", arrow: "upLeft" },
      { title: "BioCity", sub: "Partners · 5 min", arrow: "right" },
    ],
  },
  brand: {
    kicker: "6–8 Nov 2026",
    title: ["Hackathon", "2026"],
    sub: ["Turku"],
  },
} satisfies Record<string, FaceDesign>;

export type FaceId = keyof typeof FACES;
const FACE_ORDER = Object.keys(FACES) as FaceId[];

type DecalId = "partners" | "builders" | "registration" | "doorB";

const DECALS: Record<DecalId, { top: string; bottom: string }> = {
  partners: { top: "WELCOME · PARTNERS & COMPANIES", bottom: "SINCE AI HACKATHON 2026" },
  builders: { top: "BUILDERS · BUILD HALL", bottom: "OPEN AROUND THE CLOCK" },
  registration: { top: "REGISTRATION · CHECK IN", bottom: "SINCE AI HACKATHON 2026" },
  doorB: { top: "CHALLENGE PARTNERS · ROOM 1002", bottom: "SINCE AI HACKATHON 2026" },
};

// ── Placements (campus frame; SPEC §3.1.4, §3.2.3, §3.3.4, §5, §6) ──────────

/** Point `out` m along a door's facing and `right` m to its right (seen from outside, looking at the door: left). */
export function fromDoor(door: V2, facing: number, out: number, right = 0): V2 {
  const [fx, fz] = bearingVector(facing);
  const [rx, rz] = bearingVector(facing + 90);
  return [door[0] + fx * out + rx * right, door[1] + fz * out + rz * right];
}

/** BioCity's Tykistökatu recess mouth (SPEC §5.2): SW corner → NE corner, and the inward normal. */
const RECESS_SW: V2 = [-35.17, -13.41];
const RECESS_NE: V2 = [-27.62, -25.13];
const MOUTH_DIR: V2 = (() => {
  const dx = RECESS_NE[0] - RECESS_SW[0];
  const dz = RECESS_NE[1] - RECESS_SW[1];
  const l = Math.hypot(dx, dz);
  return [dx / l, dz / l];
})();
const MOUTH_IN: V2 = [-MOUTH_DIR[1], MOUTH_DIR[0]];
/** Point `along` m from the SW mouth corner, `inside` m into the recess. */
const recessAt = (along: number, inside: number): V2 => [
  RECESS_SW[0] + MOUTH_DIR[0] * along + MOUTH_IN[0] * inside,
  RECESS_SW[1] + MOUTH_DIR[1] * along + MOUTH_IN[1] * inside,
];
const MOUTH_LEN = Math.hypot(RECESS_NE[0] - RECESS_SW[0], RECESS_NE[1] - RECESS_SW[1]);
/** Compass bearing along the mouth (≈ Tykistökatu), SW → NE. */
const MOUTH_BEARING = (Math.atan2(MOUTH_DIR[0], -MOUTH_DIR[1]) * 180) / Math.PI;

const BIO_TYK_DOOR: V2 = [-24.51, -11.75];
const BIO_EVENT_DOOR: V2 = [22.69, -8.01];
const EDU_DOOR_B: V2 = [237.3, 109.0];
const EDU_GATEWAY: V2 = [196.9, 76.8];
const JOKI_DOOR: V2 = [8.58, 50.94];
/** EduCity plan frame (SPEC §1.3 E): +x towards the south-east facade, +z towards the pavilion; deck y 3.40. */
const eAt = (x: number, z: number): V2 => planToLocal(PLAN_FRAMES.E, x, z);
/** Compass bearings of the E frame's axes. */
const E_PLUS_X = PLAN_FRAMES.E.theta + 90;
const E_MINUS_X = PLAN_FRAMES.E.theta - 90 + 360;
/** BioCity's three recess flagpoles (SPEC §5.2; modelled 10 m tall by buildings/biocity). */
const RECESS_POLES: V2[] = [
  [-33.46, -15.92],
  [-31.37, -19.33],
  [-29.28, -22.74],
];
const POLE_HEIGHT = 10;
/** BioCity plan frame (SPEC §1.3 B): the white N-block recess wall is the line z_B = −4.62, facing +z_B. */
const bAt = (x: number, z: number): V2 => planToLocal(PLAN_FRAMES.B, x, z);
const RECESS_WALL_Z = -4.62;
/** Compass bearing from the recess floor towards the white wall (−z_B). */
const TO_RECESS_WALL = (PLAN_FRAMES.B.theta + 360) % 360;
/**
 * 3000 K wall-washers at the foot of the white recess wall (SPEC §5.5): one either side of car A,
 * one in the gap behind it (the car stands out against the lit wall) and one by the gable.
 */
export const WALL_WASHERS: number[] = [-41.4, -37.1, -33.6, -31.0];

/** A placed thing. `y` = known floor level (decks, interiors); else the ground under it. */
export type Item =
  | {
      kind: "totem";
      id: string;
      at: V2;
      facing: number;
      front: FaceId;
      back: FaceId;
      y?: number;
      pick?: string;
      uplights?: boolean;
      /** "notice": a plain information sign (no violet light) — e.g. at a door closed during the event. */
      style?: "event" | "notice";
    }
  | {
      kind: "wallWash";
      id: string;
      /** Floor fixture position, the compass bearing it shines towards (the wall) and its distance to the wall. */
      at: V2;
      facing: number;
      wallDist: number;
      /** Height the wash fades out at (m above the floor) and its width at the top. */
      height: number;
      width: number;
      y?: number;
    }
  | { kind: "flag"; id: string; at: V2; facing: number; variant: FlagVariant; y?: number; pick?: string }
  | { kind: "decal"; id: string; at: V2; facing: number; decal: DecalId; size: number; y?: number }
  | { kind: "lineLight"; id: string; from: V2; to: V2; y?: number }
  | { kind: "stanchions"; id: string; points: V2[]; y?: number }
  | { kind: "hangSign"; id: string; at: V2; facing: number; y: number; bottom: number; ceiling: number }
  | { kind: "poleBanner"; id: string; at: V2; facing: number; top: number; print: "brand" | "partners"; y?: number };

/** Feather flag prints: the Since AI brand, or the builders' entrance. */
export type FlagVariant = "violet" | "builders";

/**
 * The dressing, entrance by entrance. Facing = compass bearing the printed
 * front looks towards (the people it speaks to come from there).
 */
export const ITEMS: Item[] = [
  // BioCity, Tykistökatu: the partner entrance recess with the supercars (SPEC §5).
  {
    kind: "totem",
    id: "bio-recess-totem",
    at: recessAt(MOUTH_LEN - 0.9, 0.7),
    facing: MOUTH_BEARING,
    front: "partnersLeft",
    back: "partnersRight",
    pick: "entrance-biocity-tykistokatu",
    uplights: true,
  },
  { kind: "lineLight", id: "bio-recess-line", from: recessAt(0.7, 0.3), to: recessAt(MOUTH_LEN - 2.3, 0.3) },
  ...WALL_WASHERS.map(
    (x, i): Item => ({
      kind: "wallWash",
      id: `bio-recess-wash-${i + 1}`,
      at: bAt(x, RECESS_WALL_Z + 0.32),
      facing: TO_RECESS_WALL,
      wallDist: 0.32,
      height: 11,
      width: 4.2,
    }),
  ),
  // Since AI banners on the recess's three white flagpoles, facing the street.
  // The middle one names the entrance for the partners arriving on Tykistökatu.
  ...RECESS_POLES.map(
    (at, i): Item => ({
      kind: "poleBanner",
      id: `bio-recess-banner-${i + 1}`,
      at,
      facing: MOUTH_BEARING - 90 + 360,
      top: POLE_HEIGHT - 0.35,
      print: i === 1 ? "partners" : "brand",
    }),
  ),
  { kind: "decal", id: "bio-recess-decal", at: fromDoor(BIO_TYK_DOOR, 325, 2.75), facing: 325, decal: "partners", size: 1.7 },
  // BioCity, Jussin aukio: the builders' event entrance.
  { kind: "flag", id: "bio-event-flag-l", at: fromDoor(BIO_EVENT_DOOR, 55, 1.55, -1.95), facing: 100, variant: "violet", pick: "entrance-biocity-courtyard" },
  { kind: "flag", id: "bio-event-flag-r", at: fromDoor(BIO_EVENT_DOOR, 55, 1.3, 1.6), facing: 100, variant: "builders", pick: "entrance-biocity-courtyard" },
  { kind: "decal", id: "bio-event-decal", at: fromDoor(BIO_EVENT_DOOR, 55, 2.75, -0.15), facing: 55, decal: "builders", size: 1.4 },
  // Jussin aukio: the foot of the wide stair down from the campus deck, and its top on the deck.
  { kind: "totem", id: "jussi-stair-foot", at: [54.6, 1.9], facing: 98, front: "buildHallAhead", back: "educityBack", pick: "jussin-aukio", uplights: true },
  { kind: "totem", id: "jussi-stair-top", at: [66.2, 3.9], facing: 128, front: "buildHallDown", back: "brand", pick: "jussin-aukio", uplights: true },
  // EduCity: the outdoor Main Stairs from Joukahaisenkatu (everyone from the station and ParkCity).
  { kind: "totem", id: "edu-stairs-totem", at: eAt(60.6, -2.2), facing: 39, front: "registrationUp", back: "brand", pick: "registration", uplights: true },
  { kind: "flag", id: "edu-stairs-flag-a", at: eAt(59.4, -3.4), facing: 20, variant: "violet" },
  { kind: "flag", id: "edu-stairs-flag-b", at: eAt(62.0, -3.4), facing: 60, variant: "violet" },
  // EduCity door B (challenge partners → room 1002), on the south-east walkway at deck level.
  { kind: "totem", id: "edu-doorb-totem", at: eAt(54.4, 28.6), facing: 39, front: "doorBRight", back: "doorBLeft", y: 3.4, pick: "entrance-educity-b", uplights: true },
  { kind: "decal", id: "edu-doorb-decal", at: fromDoor(EDU_DOOR_B, E_PLUS_X, 3.0), facing: E_PLUS_X, decal: "doorB", size: 1.4, y: 3.4 },
  // EduCity east main entrance: pavilion south-east end (glass line x_E 47.1, canopy edge 48.5).
  // Both sails face the walk in from the Main Stairs (people arrive from the north-east, bearing ≈ 39°).
  { kind: "flag", id: "edu-east-flag-a", at: eAt(50.2, 70.6), facing: 40, variant: "violet", y: 3.4, pick: "entrance-educity-east" },
  { kind: "flag", id: "edu-east-flag-b", at: eAt(50.2, 79.0), facing: 55, variant: "violet", y: 3.4, pick: "entrance-educity-east" },
  { kind: "decal", id: "edu-east-decal", at: eAt(51.4, 74.8), facing: E_PLUS_X, decal: "registration", size: 1.5, y: 3.4 },
  // EduCity west main entrance: pavilion north-west end → the transfer along the deck to BioCity.
  { kind: "flag", id: "edu-west-flag-a", at: eAt(2.1, 68.4), facing: 300, variant: "violet", y: 3.4, pick: "entrance-educity-west" },
  { kind: "flag", id: "edu-west-flag-b", at: eAt(2.1, 77.6), facing: 320, variant: "violet", y: 3.4, pick: "entrance-educity-west" },
  { kind: "totem", id: "edu-west-totem", at: eAt(-5.6, 70.3), facing: E_PLUS_X, front: "transferAhead", back: "brand", y: 3.4, pick: "entrance-educity-west", uplights: true },
  // ICT-City gateway: the step-free street-level door and lifts.
  { kind: "totem", id: "edu-gateway-totem", at: fromDoor(EDU_GATEWAY, E_MINUS_X, 3.4, 2.2), facing: E_PLUS_X, front: "stepFree", back: "brand", pick: "entrance-educity-gateway", uplights: true },
  // EduCity lobby (floor 1, y 3.40): a sign hung over the registration desks (buildings/educity builds the
  // desks and roll-up stands at E (36.8, 54.0)), facing the walk in from the east main entrance; the
  // floor-1 ceiling is 3.9 m up.
  { kind: "hangSign", id: "edu-reg-hang", at: eAt(37.4, 55.2), facing: (PLAN_FRAMES.E.theta + 180) % 360, y: 3.4, bottom: 2.7, ceiling: 3.9 },
  // Joki street door: closed for the event (SPEC §3.2.3, organiser's map: "Ei ulos-/sisäänkäyntiä") — plain
  // black belts across and a plain notice sending people to BioCity: nothing violet, no lights, so it never
  // reads as an entrance.
  { kind: "stanchions", id: "joki-belts", points: [fromDoor(JOKI_DOOR, 219.5, 1.25, -4.2), fromDoor(JOKI_DOOR, 219.5, 1.25, -1.4), fromDoor(JOKI_DOOR, 219.5, 1.25, 1.4), fromDoor(JOKI_DOOR, 219.5, 1.25, 4.0)] },
  { kind: "totem", id: "joki-totem", at: fromDoor(JOKI_DOOR, 219.5, 3.0, -2.6), facing: 219.5, front: "jokiClosed", back: "jokiClosedBack", pick: "entrance-joki-street", style: "notice" },
  // ParkCity: on the pavement outside the colonnade, where the walk from the street door turns.
  { kind: "totem", id: "parkcity-totem", at: [207.6, 11.0], facing: 39, front: "parkcity", back: "brand", pick: "parkcity", uplights: true },
];

// ── Canvas drawing ───────────────────────────────────────────────────────────

const LOGO_MARK = "/assets/logo/sinceai-white.png";
const LOGO_FULL = "/assets/logo/SINCE%20AI%20full%20white.png";
/** Horizontal part of the full logo that is the wordmark (the mark is left of it). */
const WORDMARK_FROM = 0.205;

interface Marks {
  mark: HTMLImageElement | null;
  full: HTMLImageElement | null;
}

/** Monospace text with tracking, left/centre aligned. */
function tracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, opts: { weight?: number; color?: string; track?: number; align?: "left" | "center"; maxW?: number } = {}) {
  ctx.save();
  let px = size;
  const track = opts.track ?? 0.08;
  const measure = () => {
    ctx.font = `${opts.weight ?? 700} ${px}px ${monoFont()}`;
    return [...text].reduce((w, c) => w + ctx.measureText(c).width, 0) + px * track * Math.max(0, text.length - 1);
  };
  let width = measure();
  if (opts.maxW && width > opts.maxW) {
    px = Math.max(6, px * (opts.maxW / width));
    width = measure();
  }
  ctx.fillStyle = opts.color ?? "#ffffff";
  ctx.textBaseline = "alphabetic";
  let cx = opts.align === "center" ? x - width / 2 : x;
  for (const c of text) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + px * track;
  }
  ctx.restore();
  return px;
}

/** Bold geometric arrow (shaft + head) in a box of `size`, rotated to a direction. */
function arrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, dir: Arrow, color = "#ffffff") {
  const angle = { up: 0, right: 90, down: 180, left: -90, upRight: 45, upLeft: -45 }[dir];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angle * Math.PI) / 180);
  const s = size / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.78, -s * 0.2);
  ctx.lineTo(s * 0.24, -s * 0.2);
  ctx.lineTo(s * 0.24, s);
  ctx.lineTo(-s * 0.24, s);
  ctx.lineTo(-s * 0.24, -s * 0.2);
  ctx.lineTo(-s * 0.78, -s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The Since AI wordmark (without the mark), contained in a box, optionally rotated −90° (reading upwards). */
function wordmark(ctx: CanvasRenderingContext2D, full: HTMLImageElement | null, cx: number, cy: number, maxW: number, maxH: number, rotate = false) {
  if (!full) {
    ctx.save();
    ctx.translate(cx, cy);
    if (rotate) ctx.rotate(-Math.PI / 2);
    tracked(ctx, "SINCE AI", 0, maxH * 0.32, Math.min(maxH, maxW / 5), { align: "center", track: 0.04 });
    ctx.restore();
    return;
  }
  const sx = full.naturalWidth * WORDMARK_FROM;
  const sw = full.naturalWidth - sx;
  const sh = full.naturalHeight;
  const boxW = rotate ? maxH : maxW;
  const boxH = rotate ? maxW : maxH;
  const k = Math.min(boxW / sw, boxH / sh);
  ctx.save();
  ctx.translate(cx, cy);
  if (rotate) ctx.rotate(-Math.PI / 2);
  ctx.drawImage(full, sx, 0, sw, sh, (-sw * k) / 2, (-sh * k) / 2, sw * k, sh * k);
  ctx.restore();
}

function mark(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, cx: number, cy: number, size: number) {
  if (img) ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  else {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - size * 0.3, cy - size * 0.4, size * 0.6, size * 0.8);
  }
}

/** Soft diagonal light streaks in the brand's parallelogram angle (deterministic). */
function streaks(ctx: CanvasRenderingContext2D, r: Region, seed: number, alpha: number) {
  const rnd = mulberry32(seed);
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  for (let i = 0; i < 5; i++) {
    const y = r.y + rnd() * r.h;
    const h = r.h * (0.03 + rnd() * 0.06);
    const g = ctx.createLinearGradient(r.x, y, r.x + r.w, y - r.w * 0.27);
    g.addColorStop(0, `rgba(255,255,255,0)`);
    g.addColorStop(0.5, `rgba(255,255,255,${alpha * (0.4 + rnd() * 0.6)})`);
    g.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(r.x, y);
    ctx.lineTo(r.x + r.w, y - r.w * 0.27);
    ctx.lineTo(r.x + r.w, y - r.w * 0.27 + h);
    ctx.lineTo(r.x, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawFeather(ctx: CanvasRenderingContext2D, r: Region, variant: FlagVariant, m: Marks) {
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  if (variant === "violet") {
    g.addColorStop(0, VIOLET);
    g.addColorStop(0.38, VIOLET_STRONG);
    g.addColorStop(0.8, "#3b23c0");
    g.addColorStop(1, VIOLET_DEEP);
  } else {
    g.addColorStop(0, "#15122a");
    g.addColorStop(0.6, INK);
    g.addColorStop(1, "#120d2c");
  }
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  streaks(ctx, r, variant === "violet" ? 31 : 37, variant === "violet" ? 0.12 : 0.06);
  if (variant === "builders") {
    // Violet sleeve stripe along the pole edge.
    const s = ctx.createLinearGradient(r.x, 0, r.x + r.w * 0.16, 0);
    s.addColorStop(0, VIOLET_STRONG);
    s.addColorStop(1, "rgba(109,77,255,0)");
    ctx.fillStyle = s;
    ctx.fillRect(r.x, r.y, r.w * 0.16, r.h);
  }
  // The sail is cut from this rectangle: keep the art inside the feather (narrower at the bottom, round top).
  mark(ctx, m.mark, r.x + r.w * 0.44, r.y + r.h * 0.13, r.w * 0.42);
  // Text reads upwards: rotated −90° about its centre, the baseline offset by ≈ half the cap height.
  const vertical = (text: string, cx: number, size: number, opts: Parameters<typeof tracked>[5]) => {
    ctx.save();
    ctx.translate(cx, r.y + r.h * 0.52);
    ctx.rotate(-Math.PI / 2);
    tracked(ctx, text, 0, size * 0.36, size, { align: "center", ...opts });
    ctx.restore();
  };
  if (variant === "violet") {
    wordmark(ctx, m.full, r.x + r.w * 0.5, r.y + r.h * 0.52, r.w * 0.5, r.h * 0.5, true);
    vertical("HACKATHON · 6–8 NOV 2026", r.x + r.w * 0.83, r.w * 0.075, { color: "rgba(255,255,255,0.86)", track: 0.16, maxW: r.h * 0.6 });
  } else {
    // The builders' entrance: the word large, its purpose small beside it.
    vertical("BUILDERS", r.x + r.w * 0.47, r.w * 0.3, { track: 0.06, maxW: r.h * 0.58 });
    vertical("ENTRANCE · BUILD HALL", r.x + r.w * 0.83, r.w * 0.075, { color: LAVENDER, track: 0.16, maxW: r.h * 0.6 });
  }
}

function drawPoleBanner(ctx: CanvasRenderingContext2D, r: Region, print: "brand" | "partners", m: Marks) {
  const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  g.addColorStop(0, "#14102c");
  g.addColorStop(0.22, VIOLET_DEEP);
  g.addColorStop(0.62, VIOLET_STRONG);
  g.addColorStop(1, VIOLET);
  ctx.fillStyle = g;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  streaks(ctx, r, print === "brand" ? 41 : 43, 0.1);
  mark(ctx, m.mark, r.x + r.w / 2, r.y + r.h * 0.12, r.w * 0.48);
  if (print === "brand") {
    wordmark(ctx, m.full, r.x + r.w * 0.44, r.y + r.h * 0.56, r.w * 0.56, r.h * 0.56, true);
    ctx.save();
    ctx.translate(r.x + r.w * 0.82, r.y + r.h * 0.56);
    ctx.rotate(-Math.PI / 2);
    tracked(ctx, "HACKATHON 2026 · TURKU", 0, 0, r.w * 0.07, { align: "center", color: "rgba(255,255,255,0.88)", track: 0.18, maxW: r.h * 0.56 });
    ctx.restore();
    return;
  }
  // "Partners & companies — main entrance": two lines reading upwards, the entrance under them.
  ctx.save();
  ctx.translate(r.x + r.w * 0.5, r.y + r.h * 0.58);
  ctx.rotate(-Math.PI / 2);
  tracked(ctx, "PARTNERS &", 0, -r.w * 0.12, r.w * 0.26, { align: "center", track: 0.03, maxW: r.h * 0.6 });
  tracked(ctx, "COMPANIES", 0, r.w * 0.18, r.w * 0.26, { align: "center", track: 0.03, maxW: r.h * 0.6 });
  tracked(ctx, "MAIN ENTRANCE · HACKATHON 2026", 0, r.w * 0.38, r.w * 0.07, { align: "center", color: "rgba(255,255,255,0.88)", track: 0.16, maxW: r.h * 0.6 });
  ctx.restore();
}

/** Totem face: header with the marks, then a hero message + arrow, or destination rows. */
export function drawFace(ctx: CanvasRenderingContext2D, r: Region, d: FaceDesign, m: Marks) {
  if (d.notice) {
    drawNotice(ctx, r, d);
    return;
  }
  const W = r.w;
  const H = r.h;
  const x0 = r.x;
  const y0 = r.y;
  const pad = W * 0.09;
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + H);
  bg.addColorStop(0, "#0e0d16");
  bg.addColorStop(1, "#08080c");
  ctx.fillStyle = bg;
  ctx.fillRect(x0, y0, W, H);
  // Header: mark + wordmark, violet rule.
  mark(ctx, m.mark, x0 + pad + W * 0.08, y0 + H * 0.055, W * 0.16);
  wordmark(ctx, m.full, x0 + pad + W * 0.2 + W * 0.27, y0 + H * 0.055, W * 0.54, W * 0.11);
  ctx.fillStyle = VIOLET_STRONG;
  ctx.fillRect(x0 + pad, y0 + H * 0.1, W - pad * 2, Math.max(2, H * 0.005));
  const maxW = W - pad * 2;
  let y = y0 + H * 0.155;
  if (d.kicker) {
    tracked(ctx, d.kicker.toUpperCase(), x0 + pad, y, W * 0.055, { color: VIOLET, track: 0.12, maxW, weight: 700 });
    y += H * 0.045;
  }
  if (d.rows) {
    y += H * 0.02;
    for (const row of d.rows) {
      const s = W * 0.2;
      if (row.arrow) {
        ctx.fillStyle = VIOLET_STRONG;
        ctx.fillRect(x0 + pad, y, s, s);
        arrow(ctx, x0 + pad + s / 2, y + s / 2, s * 0.68, row.arrow);
      }
      const tx = x0 + pad + s + W * 0.05;
      const tw = maxW - s - W * 0.05;
      tracked(ctx, row.title.toUpperCase(), tx, y + s * 0.42, W * 0.068, { maxW: tw, track: 0.04 });
      if (row.sub) tracked(ctx, row.sub, tx, y + s * 0.82, W * 0.05, { maxW: tw, color: LAVENDER, weight: 500, track: 0.02 });
      y += s + H * 0.05;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x0 + pad, y - H * 0.025, maxW, 1);
    }
  } else {
    for (const line of d.title ?? []) {
      y += W * 0.115;
      tracked(ctx, line.toUpperCase(), x0 + pad, y, W * 0.105, { maxW, track: 0.02 });
    }
    y += H * 0.02;
    for (const line of d.sub ?? []) {
      y += W * 0.085;
      tracked(ctx, line.toUpperCase(), x0 + pad, y, W * 0.07, { maxW, color: LAVENDER, track: 0.06 });
    }
    y += H * 0.015;
    for (const line of d.detail ?? []) {
      y += W * 0.07;
      tracked(ctx, line, x0 + pad, y, W * 0.056, { maxW, color: GREY_TEXT, weight: 500, track: 0.02 });
    }
    if (d.arrow) {
      const s = W * 0.5;
      const ay = y0 + H * 0.74;
      ctx.strokeStyle = VIOLET;
      ctx.lineWidth = Math.max(2, W * 0.012);
      ctx.strokeRect(x0 + (W - s) / 2, ay - s / 2, s, s);
      arrow(ctx, x0 + W / 2, ay, s * 0.62, d.arrow);
    } else if (!d.rows) {
      // Brand face: a large mark.
      mark(ctx, m.mark, x0 + W / 2, y0 + H * 0.72, W * 0.42);
    }
  }
  // Foot: violet bar with the dates.
  ctx.fillStyle = VIOLET_STRONG;
  ctx.fillRect(x0, y0 + H * 0.935, W, H * 0.065);
  tracked(ctx, "SINCE AI HACKATHON 2026", x0 + W / 2, y0 + H * 0.978, W * 0.048, { align: "center", track: 0.08, maxW: W - pad * 2 });
}

/** Plain notice face (a door closed during the event): light grey, black type, a black arrow — no event look. */
function drawNotice(ctx: CanvasRenderingContext2D, r: Region, d: FaceDesign) {
  const W = r.w;
  const H = r.h;
  const x0 = r.x;
  const y0 = r.y;
  const pad = W * 0.09;
  const maxW = W - pad * 2;
  ctx.fillStyle = "#e4e4e0";
  ctx.fillRect(x0, y0, W, H);
  // A no-entry disc (red ring, white bar) at the top: closed, at a glance.
  const cx = x0 + W / 2;
  const cy = y0 + H * 0.12;
  const rr = W * 0.2;
  ctx.fillStyle = "#c8282d";
  ctx.beginPath();
  ctx.arc(cx, cy, rr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(cx - rr * 0.68, cy - rr * 0.17, rr * 1.36, rr * 0.34);
  let y = y0 + H * 0.27;
  if (d.kicker) {
    tracked(ctx, d.kicker.toUpperCase(), x0 + pad, y, W * 0.06, { color: "#5a5a60", track: 0.12, maxW });
    y += H * 0.02;
  }
  for (const line of d.title ?? []) {
    y += W * 0.115;
    tracked(ctx, line.toUpperCase(), x0 + pad, y, W * 0.1, { maxW, track: 0.02, color: "#111114" });
  }
  y += H * 0.02;
  for (const line of d.sub ?? []) {
    y += W * 0.085;
    tracked(ctx, line.toUpperCase(), x0 + pad, y, W * 0.068, { maxW, color: "#2a2a30", track: 0.04 });
  }
  y += H * 0.015;
  for (const line of d.detail ?? []) {
    y += W * 0.07;
    tracked(ctx, line, x0 + pad, y, W * 0.056, { maxW, color: "#55555c", weight: 500, track: 0.02 });
  }
  if (d.arrow) {
    const sz = W * 0.42;
    const ay = y0 + H * 0.8;
    ctx.fillStyle = "#111114";
    ctx.fillRect(x0 + (W - sz) / 2, ay - sz / 2, sz, sz);
    arrow(ctx, x0 + W / 2, ay, sz * 0.62, d.arrow, "#ffffff");
  }
  ctx.fillStyle = "#3a3a40";
  ctx.fillRect(x0, y0 + H * 0.955, W, H * 0.045);
}

/** Hanging sign: "REGISTRATION" with the mark; the front says what happens here, the back when. */
function drawHangSign(ctx: CanvasRenderingContext2D, r: Region, back: boolean, m: Marks) {
  ctx.fillStyle = INK;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = VIOLET_STRONG;
  ctx.fillRect(r.x, r.y + r.h * 0.88, r.w, r.h * 0.12);
  mark(ctx, m.mark, r.x + r.h * 0.45, r.y + r.h * 0.44, r.h * 0.52);
  const x = r.x + r.h * 0.88;
  const maxW = r.w - r.h * 1.05;
  tracked(ctx, "REGISTRATION", x, r.y + r.h * 0.53, r.h * 0.28, { maxW, track: 0.04 });
  const line = back ? `FRI 6 NOV FROM ${t(EVENT_2026.builderRegistration)}` : "CHECK IN · SINCE AI HACKATHON 2026";
  tracked(ctx, line, x, r.y + r.h * 0.75, r.h * 0.1, { maxW, color: LAVENDER, track: 0.1 });
}

/** Round floor sticker: dark disc, violet rings, the mark, text round the rim. */
function drawDecal(ctx: CanvasRenderingContext2D, r: Region, d: { top: string; bottom: string }, m: Marks) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const R = r.w / 2 - 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(11,10,20,0.92)";
  ctx.fill();
  ctx.lineWidth = R * 0.05;
  ctx.strokeStyle = VIOLET_STRONG;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.955, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = R * 0.012;
  ctx.strokeStyle = VIOLET;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  mark(ctx, m.mark, cx, cy - R * 0.08, R * 0.62);
  ctx.restore();
  const arcText = (text: string, radius: number, top: boolean, size: number, color: string) => {
    ctx.save();
    ctx.font = `700 ${size}px ${monoFont()}`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const chars = [...text];
    const step = (size * 0.74) / radius;
    const total = step * (chars.length - 1);
    chars.forEach((c, i) => {
      const a = top ? -Math.PI / 2 - total / 2 + i * step : Math.PI / 2 + total / 2 - i * step;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
      ctx.rotate(top ? a + Math.PI / 2 : a - Math.PI / 2);
      ctx.fillText(c, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  };
  arcText(d.top, R * 0.8, true, R * 0.1, "#ffffff");
  arcText(d.bottom, R * 0.8, false, R * 0.075, LAVENDER);
}

/** The print atlas and the sticker atlas; resolves when the marks and fonts are in. */
function makeAtlases(scale: number): { prints: THREE.CanvasTexture; decals: THREE.CanvasTexture; ready: Promise<void> } {
  const a = makeCanvas(Math.round(ATLAS * scale), Math.round(ATLAS * scale));
  const d = makeCanvas(Math.round(DECAL_ATLAS * scale), Math.round(DECAL_ATLAS * scale));
  // Placeholder: dark everywhere, violet swatches — never white or black while images load.
  a.ctx.fillStyle = "#121018";
  a.ctx.fillRect(0, 0, a.canvas.width, a.canvas.height);
  d.ctx.clearRect(0, 0, d.canvas.width, d.canvas.height);
  const prints = canvasTexture(a.canvas, { anisotropy: 8 });
  const decals = canvasTexture(d.canvas, { anisotropy: 8 });
  const ready = (async () => {
    const [markImg, fullImg] = await Promise.all([loadImage(LOGO_MARK), loadImage(LOGO_FULL)]);
    try {
      await document.fonts.load(`700 32px ${monoFont()}`);
      await document.fonts.load(`500 32px ${monoFont()}`);
    } catch {
      // Fall back to the system monospace.
    }
    const m: Marks = { mark: markImg, full: fullImg };
    const ctx = a.ctx;
    ctx.save();
    ctx.scale(scale, scale);
    drawFeather(ctx, REGIONS.featherViolet, "violet", m);
    drawFeather(ctx, REGIONS.featherBuilders, "builders", m);
    drawPoleBanner(ctx, REGIONS.bannerBrand, "brand", m);
    drawPoleBanner(ctx, REGIONS.bannerPartners, "partners", m);
    FACE_ORDER.forEach((id, i) => drawFace(ctx, faceRegion(i), FACES[id], m));
    drawHangSign(ctx, REGIONS.hangFront, false, m);
    drawHangSign(ctx, REGIONS.hangBack, true, m);
    // Belt: violet webbing with a lighter weave line.
    ctx.fillStyle = VIOLET_STRONG;
    ctx.fillRect(REGIONS.belt.x, REGIONS.belt.y, REGIONS.belt.w, REGIONS.belt.h);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(REGIONS.belt.x, REGIONS.belt.y + REGIONS.belt.h * 0.45, REGIONS.belt.w, REGIONS.belt.h * 0.1);
    // Plain black webbing (a closed door's cordon: not the event's colour).
    ctx.fillStyle = "#18181c";
    ctx.fillRect(REGIONS.beltPlain.x, REGIONS.beltPlain.y, REGIONS.beltPlain.w, REGIONS.beltPlain.h);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(REGIONS.beltPlain.x, REGIONS.beltPlain.y + REGIONS.beltPlain.h * 0.45, REGIONS.beltPlain.w, REGIONS.beltPlain.h * 0.1);
    // Edge light: bright violet core.
    const eg = ctx.createLinearGradient(REGIONS.edge.x, 0, REGIONS.edge.x + REGIONS.edge.w, 0);
    eg.addColorStop(0, VIOLET_STRONG);
    eg.addColorStop(0.5, "#e6e1ff");
    eg.addColorStop(1, VIOLET_STRONG);
    ctx.fillStyle = eg;
    ctx.fillRect(REGIONS.edge.x, REGIONS.edge.y, REGIONS.edge.w, REGIONS.edge.h);
    ctx.restore();
    d.ctx.save();
    d.ctx.scale(scale, scale);
    (Object.keys(DECALS) as DecalId[]).forEach((id) => drawDecal(d.ctx, DECAL_REGIONS[id], DECALS[id], m));
    d.ctx.restore();
    prints.needsUpdate = true;
    decals.needsUpdate = true;
  })();
  return { prints, decals, ready };
}

// ── Geometry ─────────────────────────────────────────────────────────────────

/** Remap a geometry's 0..1 UVs into an atlas region (mirror = flip u). */
function mapUV(geo: THREE.BufferGeometry, r: Region, size: number, mirror = false): THREE.BufferGeometry {
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  const { u0, u1, v0, v1 } = regionUV(r, size);
  for (let i = 0; i < uv.count; i++) {
    const u = mirror ? 1 - uv.getX(i) : uv.getX(i);
    uv.setXY(i, u0 + (u1 - u0) * u, v0 + (v1 - v0) * uv.getY(i));
  }
  uv.needsUpdate = true;
  return geo;
}

/** A print quad (front faces +z) of w × h centred at the origin, mapped to a region. */
function printQuad(w: number, h: number, r: Region, size = ATLAS): THREE.BufferGeometry {
  return mapUV(new THREE.PlaneGeometry(w, h), r, size);
}

/** Collects transformed pieces and merges them (one draw call per material). */
class Pieces {
  private list: THREE.BufferGeometry[] = [];
  add(geo: THREE.BufferGeometry, m: THREE.Matrix4): void {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    g.applyMatrix4(m);
    for (const name of Object.keys(g.attributes)) if (name !== "position" && name !== "normal" && name !== "uv") g.deleteAttribute(name);
    if (!g.getAttribute("uv")) g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute("position").count * 2), 2));
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    this.list.push(g);
  }
  merge(): THREE.BufferGeometry {
    const out = this.list.length ? mergeGeometries(this.list, false) : null;
    this.list.forEach((g) => g.dispose());
    this.list = [];
    return out ?? new THREE.BufferGeometry();
  }
}

/** Item transform: at (x, y, z), front (+z) facing a compass bearing. */
function placeMatrix(x: number, y: number, z: number, facing: number): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI - (facing * Math.PI) / 180),
    new THREE.Vector3(1, 1, 1),
  );
}

const local = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));

/** Feather sail outline (x across from the pole, y up): pole/leading edge and trailing edge at t ∈ [0, 1]. */
export function featherEdges(width: number, height: number, bottom: number) {
  const W = width;
  const H = height;
  const y0 = bottom;
  const qb = (a: V2, b: V2, c: V2, s: number): V2 => [
    (1 - s) * (1 - s) * a[0] + 2 * (1 - s) * s * b[0] + s * s * c[0],
    (1 - s) * (1 - s) * a[1] + 2 * (1 - s) * s * b[1] + s * s * c[1],
  ];
  const cb = (a: V2, b: V2, c: V2, d: V2, s: number): V2 => {
    const k = 1 - s;
    return [
      k * k * k * a[0] + 3 * k * k * s * b[0] + 3 * k * s * s * c[0] + s * s * s * d[0],
      k * k * k * a[1] + 3 * k * k * s * b[1] + 3 * k * s * s * c[1] + s * s * s * d[1],
    ];
  };
  const tip: V2 = [0.8 * W, y0 + 0.975 * H];
  const straight = 0.7;
  const lead = (t: number): V2 => {
    if (t <= straight) return [0, y0 + (H * 0.7 * t) / straight];
    return qb([0, y0 + 0.7 * H], [0, y0 + 1.03 * H], tip, (t - straight) / (1 - straight));
  };
  const trail = (t: number): V2 => cb([0.6 * W, y0 + 0.035 * H], [1.02 * W, y0 + 0.26 * H], [1.06 * W, y0 + 0.86 * H], tip, t);
  return { lead, trail, tip, width: 1.06 * W, height: 1.03 * H, y0 };
}

/**
 * Feather-flag sail (pole along the left edge, +z front): a ruled grid between
 * the pole edge and the trailing edge, front and back layers (the back's
 * print mirrored so both sides read), attributes for the wind shader.
 */
export function featherSailGeometry(width = 0.8, height = 3.3, bottom = 0.75, nu = 7, nv = 26): THREE.BufferGeometry {
  const e = featherEdges(width, height, bottom);
  const pos: number[] = [];
  const uv: number[] = [];
  const flex: number[] = [];
  const index: number[] = [];
  const nor: number[] = [];
  for (const layer of [1, -1]) {
    const base = pos.length / 3;
    for (let j = 0; j <= nv; j++) {
      const tt = j / nv;
      const a = e.lead(tt);
      const b = e.trail(tt);
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        const x = a[0] + (b[0] - a[0]) * u;
        const y = a[1] + (b[1] - a[1]) * u;
        pos.push(x, y, layer * 0.0015);
        nor.push(0, 0, layer);
        const pu = x / e.width;
        uv.push(layer > 0 ? pu : 1 - pu, (y - e.y0) / e.height);
        flex.push(u, tt);
      }
    }
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const a = base + j * (nu + 1) + i;
        const b = a + 1;
        const c = a + nu + 1;
        const d = c + 1;
        if (layer > 0) index.push(a, b, c, b, d, c);
        else index.push(a, c, b, b, c, d);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("aFlex", new THREE.Float32BufferAttribute(flex, 2));
  g.setIndex(index);
  return g;
}

/** Pole for a feather sail: up from the base and along the leading edge to the tip. */
function featherPole(width: number, height: number, bottom: number): THREE.BufferGeometry {
  const e = featherEdges(width, height, bottom);
  const pts: THREE.Vector3[] = [new THREE.Vector3(-0.012, 0.05, 0)];
  for (let i = 0; i <= 24; i++) {
    const p = e.lead(i / 24);
    pts.push(new THREE.Vector3(p[0] - 0.012, p[1], 0));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, 30, 0.013, 6, false);
}

/** Front (+z) and back (−z, print mirrored so it reads) layers of a flat print, 1.5 mm apart. */
function twoLayer(front: THREE.BufferGeometry): THREE.BufferGeometry {
  const back = front.clone();
  const pos = back.getAttribute("position") as THREE.BufferAttribute;
  const nor = back.getAttribute("normal") as THREE.BufferAttribute;
  const uv = back.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, pos.getZ(i) - 0.0015);
    nor.setXYZ(i, -nor.getX(i), -nor.getY(i), -nor.getZ(i));
    uv.setX(i, 1 - uv.getX(i));
  }
  const idx = back.getIndex();
  if (idx) {
    const arr = idx.array as Uint16Array | Uint32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const tmp = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = tmp;
    }
  }
  const merged = mergeGeometries([front, back], false);
  front.dispose();
  back.dispose();
  if (!merged) throw new Error("event: could not build a two-layer print");
  return merged;
}

/** Banner on a flagpole arm: 1.0 × 3.33 m hanging from the arm (y 0 down), pole edge at x 0.05. */
export function bannerGeometry(width = 1.0, height = 3.33): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(width, height, 4, 12);
  g.translate(width / 2 + 0.05, -height / 2, 0);
  const p = g.getAttribute("position");
  const flex = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    flex[i * 2] = (p.getX(i) - 0.05) / width;
    flex[i * 2 + 1] = 1 + p.getY(i) / height;
  }
  g.setAttribute("aFlex", new THREE.BufferAttribute(flex, 2));
  return twoLayer(g);
}

// ── Materials ────────────────────────────────────────────────────────────────

interface WindUniforms {
  uTime: THREE.IUniform<number>;
  uWind: THREE.IUniform<number>;
  uUplight: THREE.IUniform<number>;
}

/** Sail material: atlas print, flutter in the vertex shader, violet uplight wash at night. */
function sailMaterial(map: THREE.Texture, uniforms: WindUniforms): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.86, metalness: 0, side: THREE.FrontSide });
  m.name = "event-sail";
  m.emissive.set(VIOLET);
  m.emissiveMap = map;
  m.emissiveIntensity = 1;
  // Knitted polyester: matte.
  m.envMapIntensity = 0.4;
  m.customProgramCacheKey = () => "event-sail";
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uWind = uniforms.uWind;
    shader.uniforms.uUplight = uniforms.uUplight;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
attribute vec2 aFlex;
attribute vec4 aRegion;
attribute vec2 aPhase;
uniform float uTime;
uniform float uWind;
varying float vLift;
float twSailWave( vec2 f ) {
	float k = pow( f.x, 1.4 );
	return k * ( sin( uTime * 2.3 + aPhase.x + f.x * 3.1 + f.y * 2.2 ) * 0.055 + sin( uTime * 4.1 + aPhase.x * 1.7 + f.x * 5.0 - f.y * 3.0 ) * 0.018 );
}`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
	{
		float h = 0.02;
		float dz = ( twSailWave( aFlex + vec2( h, 0.0 ) ) - twSailWave( aFlex - vec2( h, 0.0 ) ) ) * uWind * aPhase.y / ( 2.0 * h );
		objectNormal = normalize( objectNormal + vec3( -dz * sign( objectNormal.z ) * 1.2, 0.0, 0.0 ) );
	}`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
	transformed.z += twSailWave( aFlex ) * uWind * aPhase.y;
	vLift = aFlex.y;`,
      )
      .replace(
        "#include <uv_vertex>",
        `#include <uv_vertex>
	#ifdef USE_MAP
		vMapUv = aRegion.xy + uv * aRegion.zw;
	#endif
	#ifdef USE_EMISSIVEMAP
		vEmissiveMapUv = aRegion.xy + uv * aRegion.zw;
	#endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uUplight;
varying float vLift;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
	// Uplight from the fixture at the foot: strong low, fading up the sail.
	totalEmissiveRadiance *= uUplight * ( 0.25 + 1.6 * exp( -vLift * 2.6 ) );`,
      );
  };
  return m;
}

/** Glow: additive violet light (fixture lenses, ground pools, the recess line light). */
const GLOW_VERTEX = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec3 aGlow;
varying vec2 vUv;
varying vec3 vGlow;
void main() {
	vec4 world = modelMatrix * vec4( position, 1.0 );
	float dist = max( distance( cameraPosition, world.xyz ), 0.05 );
	vec4 mvPosition = viewMatrix * world;
	mvPosition.xyz *= 1.0 - min( 0.0008 + 0.01 / dist, 0.4 );
	gl_Position = projectionMatrix * mvPosition;
	vUv = uv;
	vGlow = aGlow;
	#include <fog_vertex>
}
`;

const GLOW_FRAGMENT = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
uniform vec3 uHot;
uniform vec3 uWarm;
uniform float uNight;
varying vec2 vUv;
varying vec3 vGlow;
void main() {
	vec2 p = vUv * 2.0 - 1.0;
	float kind = vGlow.x;
	float a = 0.0;
	vec3 c = uColor;
	if ( kind > 3.5 ) {
		c = uWarm;
		if ( kind < 4.5 ) {
			// Wall wash from a floor uplight (uv.y = 0 at the fixture … 1 at the top): a scallop that starts
			// just above the fixture, widens with height and fades out towards the top (night only).
			float h = vUv.y;
			float spread = 0.16 + 0.84 * sqrt( h );
			float across = 1.0 - smoothstep( 0.35 * spread, spread, abs( p.x ) );
			float rise = smoothstep( 0.0, 0.06, h );
			float fall = pow( 1.0 - h, 1.6 );
			a = across * rise * fall * ( 0.55 + 0.45 * exp( -h * 6.0 ) ) * uNight;
		} else {
			// Warm fixture lens.
			float r = length( p );
			a = ( 1.0 - smoothstep( 0.6, 1.0, r ) ) * uNight;
			c = mix( uWarm, vec3( 1.0 ), 0.4 );
		}
	} else if ( kind < 0.5 ) {
		// Ground pool round an uplight (night only).
		float r = length( p );
		a = exp( -r * r * 4.5 ) * ( 1.0 - smoothstep( 0.85, 1.0, r ) ) * uNight;
	} else if ( kind < 1.5 ) {
		// Fixture lens: a hot disc.
		float r = length( p );
		a = 1.0 - smoothstep( 0.7, 1.0, r );
		c = mix( uColor, uHot, 0.55 );
	} else if ( kind < 2.5 ) {
		// Line light core (flush LED strip, totem edge light), on day and night: brighter by day so it reads
		// against daylight, dimmer at night where the exposure lifts it into a glow.
		a = ( 1.0 - smoothstep( 0.45, 1.0, abs( p.y ) ) ) * mix( 0.6, 0.28, uNight );
		c = mix( uColor, uHot, 0.4 );
	} else {
		// Line light spill on the ground (night).
		float d = abs( p.y );
		a = exp( -d * d * 6.0 ) * ( 1.0 - smoothstep( 0.8, 1.0, abs( p.x ) ) ) * uNight;
	}
	gl_FragColor = vec4( c * a * vGlow.y, 1.0 );
	#include <fog_fragment>
}
`;

// ── The module ───────────────────────────────────────────────────────────────

/** world/event.ts — the Since AI event dressing at every event entrance. */
export async function buildEvent(ctx: TwinContext): Promise<WorldModule> {
  const root = new THREE.Group();
  root.name = "event";
  root.userData[PROBE_IGNORE] = true;
  const terrain = await loadTerrain().catch(() => null as Terrain | null);
  const groundAt = (x: number, z: number) => (terrain ? terrain.heightAt(x, z) : 0);
  const scale = ctx.tier === "low" ? 0.5 : 1;
  const atlas = makeAtlases(scale);
  const shadows = ctx.tier !== "low";

  // Materials.
  const frameMat = new THREE.MeshStandardMaterial({ color: "#1b1a21", roughness: 0.48, metalness: 0.35, envMapIntensity: 0.8 });
  frameMat.name = "event-frame";
  // Matte prints (textile and matt vinyl): little sheen, so a dark face stays dark facing a bright sky.
  const printMat = new THREE.MeshStandardMaterial({ map: atlas.prints, roughness: 0.88, metalness: 0, envMapIntensity: 0.3 });
  printMat.name = "event-print";
  printMat.emissive.set("#ffffff");
  printMat.emissiveMap = atlas.prints;
  printMat.emissiveIntensity = 0;
  const decalMat = new THREE.MeshStandardMaterial({
    map: atlas.decals,
    roughness: 0.7,
    metalness: 0,
    envMapIntensity: 0.5,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  decalMat.name = "event-sticker";
  const wind: WindUniforms = { uTime: { value: 0 }, uWind: { value: ctx.reducedMotion ? 0.35 : 1 }, uUplight: { value: 0 } };
  const sailMat = sailMaterial(atlas.prints, wind);
  const glowUniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    uColor: { value: new THREE.Color(VIOLET_STRONG) },
    uHot: { value: new THREE.Color("#efeaff") },
    // 3000 K (wall-washers).
    uWarm: { value: new THREE.Color().setRGB(1.0, 0.71, 0.42, THREE.SRGBColorSpace) },
    uNight: { value: 0 },
  };
  const glowMat = new THREE.ShaderMaterial({
    uniforms: glowUniforms,
    vertexShader: GLOW_VERTEX,
    fragmentShader: GLOW_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    // Quads come in either winding (ground strips along any direction, edge lights on either side).
    side: THREE.DoubleSide,
    forceSinglePass: true,
  });
  glowMat.name = "event-glow";

  const frameMesh = new THREE.Mesh(new THREE.BufferGeometry(), frameMat);
  frameMesh.name = "event-frames";
  frameMesh.castShadow = shadows;
  frameMesh.receiveShadow = true;
  const printMesh = new THREE.Mesh(new THREE.BufferGeometry(), printMat);
  printMesh.name = "event-prints";
  printMesh.receiveShadow = true;
  const decalMesh = new THREE.Mesh(new THREE.BufferGeometry(), decalMat);
  decalMesh.name = "event-stickers";
  decalMesh.receiveShadow = true;
  decalMesh.renderOrder = -2;
  const glowMesh = new THREE.Mesh(new THREE.BufferGeometry(), glowMat);
  glowMesh.name = "event-glow";
  glowMesh.renderOrder = 3;
  glowMesh.frustumCulled = false;

  // Sails: one instance per flag (feather flags) + the pole banners.
  const flags = ITEMS.filter((i): i is Extract<Item, { kind: "flag" }> => i.kind === "flag");
  const sailGeo = featherSailGeometry();
  const regionAttr = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, flags.length) * 4), 4);
  const phaseAttr = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, flags.length) * 2), 2);
  sailGeo.setAttribute("aRegion", regionAttr);
  sailGeo.setAttribute("aPhase", phaseAttr);
  const sails = new THREE.InstancedMesh(sailGeo, sailMat, Math.max(1, flags.length));
  sails.name = "event-sails";
  sails.castShadow = shadows;
  sails.receiveShadow = true;
  sails.count = flags.length;
  sails.frustumCulled = false;
  const rnd = mulberry32(2026);
  flags.forEach((f, i) => {
    const uvr = regionUV(f.variant === "violet" ? REGIONS.featherViolet : REGIONS.featherBuilders, ATLAS);
    regionAttr.setXYZW(i, uvr.u0, uvr.v0, uvr.u1 - uvr.u0, uvr.v1 - uvr.v0);
    phaseAttr.setXY(i, rnd() * Math.PI * 2, 0.75 + rnd() * 0.5);
  });

  // Banners on BioCity's recess flagpoles: the same print material, a calmer flutter (held by two arms).
  const banners = ITEMS.filter((i): i is Extract<Item, { kind: "poleBanner" }> => i.kind === "poleBanner");
  const bannerGeo = bannerGeometry();
  const bannerRegion = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, banners.length) * 4), 4);
  const bannerPhase = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, banners.length) * 2), 2);
  bannerGeo.setAttribute("aRegion", bannerRegion);
  bannerGeo.setAttribute("aPhase", bannerPhase);
  const bannerMesh = new THREE.InstancedMesh(bannerGeo, sailMat, Math.max(1, banners.length));
  bannerMesh.name = "event-banners";
  bannerMesh.castShadow = shadows;
  bannerMesh.receiveShadow = true;
  bannerMesh.count = banners.length;
  bannerMesh.frustumCulled = false;
  banners.forEach((b, i) => {
    const uvr = regionUV(b.print === "partners" ? REGIONS.bannerPartners : REGIONS.bannerBrand, ATLAS);
    bannerRegion.setXYZW(i, uvr.u0, uvr.v0, uvr.u1 - uvr.u0, uvr.v1 - uvr.v0);
    bannerPhase.setXY(i, rnd() * Math.PI * 2, 0.3);
  });

  root.add(frameMesh, printMesh, decalMesh, glowMesh, sails, bannerMesh);

  // Pick proxies (invisible boxes): clicking a totem or flag focuses its entrance.
  const pickables: THREE.Object3D[] = [];
  const pickMat = new THREE.MeshBasicMaterial({ visible: false });
  pickMat.name = "event-pick";
  const pickGeo = new THREE.BoxGeometry(1, 1, 1);
  const proxies = new Map<string, THREE.Mesh>();
  for (const it of ITEMS) {
    if (!("pick" in it) || !it.pick) continue;
    const proxy = new THREE.Mesh(pickGeo, pickMat);
    proxy.name = `pick-${it.id}`;
    proxy.userData.pickId = it.pick;
    proxies.set(it.id, proxy);
    pickables.push(proxy);
    root.add(proxy);
  }

  /** Ground under an item: its known level, the probed surface, else the DTM. */
  const heights = new Map<string, number>();
  /** Lowest surface within ≈ 1 m of an item (its uplights' ground pools lie there). */
  const lows = new Map<string, number>();
  const baseY = (it: Item, at: V2): number => {
    const key = `${it.id}@${at[0].toFixed(2)},${at[1].toFixed(2)}`;
    const known = heights.get(key);
    if (known !== undefined) return known;
    return it.y ?? groundAt(at[0], at[1]);
  };

  const build = () => {
    const frame = new Pieces();
    const print = new Pieces();
    const decal = new Pieces();
    const glowPos: number[] = [];
    const glowUv: number[] = [];
    const glowAttr: number[] = [];
    const glowQuad = (corners: [V3, V3, V3, V3], kind: number, intensity: number) => {
      // corners: (−,−) (+,−) (+,+) (−,+) in uv
      const uvs = [0, 0, 1, 0, 1, 1, 0, 1];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        glowPos.push(...corners[k]);
        glowUv.push(uvs[k * 2], uvs[k * 2 + 1]);
        glowAttr.push(kind, intensity, 0);
      }
    };
    const groundQuad = (x: number, y: number, z: number, r: number, kind: number, intensity: number) =>
      glowQuad(
        [
          [x - r, y, z + r],
          [x + r, y, z + r],
          [x + r, y, z - r],
          [x - r, y, z - r],
        ],
        kind,
        intensity,
      );
    const uplight = (it: Item, m: THREE.Matrix4, lx: number, lz: number, y: number) => {
      // Small black can, tilted up at the object; lens and ground pool glow at night.
      const can = new THREE.CylinderGeometry(0.06, 0.07, 0.15, 10);
      frame.add(can, m.clone().multiply(local(lx, 0.075, lz, 0, lz > 0 ? -0.18 : 0.18)));
      const p = new THREE.Vector3(lx, 0.152, lz).applyMatrix4(m);
      groundQuad(p.x, p.y + 0.002, p.z, 0.065, 1, LUMINANCE.eventLight * 0.45);
      // The pool is a flat quad: lay it on the lowest surface round the item (a deck's fall, a step
      // beside it), so it never floats over the ground or a route ribbon there.
      const low = lows.get(it.id) ?? y;
      groundQuad(p.x, Math.min(y, low) + 0.012, p.z, 1.1, 0, 0.012);
    };

    for (const it of ITEMS) {
      if (it.kind === "totem") {
        const y = baseY(it, it.at);
        const m = placeMatrix(it.at[0], y, it.at[1], it.facing);
        // Body: graphite monolith on a plinth.
        frame.add(boxUV(new THREE.BoxGeometry(0.6, 2.1, 0.14)), m.clone().multiply(local(0, 0.06 + 1.05, 0)));
        frame.add(boxUV(new THREE.BoxGeometry(0.68, 0.06, 0.24)), m.clone().multiply(local(0, 0.03, 0)));
        // Printed faces (front +z, back −z), proud of the body by 2 mm.
        const fi = FACE_ORDER.indexOf(it.front);
        const bi = FACE_ORDER.indexOf(it.back);
        print.add(printQuad(0.56, 1.866, faceRegion(fi)), m.clone().multiply(local(0, 0.17 + 0.933, 0.072)));
        print.add(printQuad(0.56, 1.866, faceRegion(bi)), m.clone().multiply(local(0, 0.17 + 0.933, -0.072, Math.PI)));
        // Violet edge lights down both narrow sides: the diffuser (print) and its light (glow). A notice has none.
        for (const sx of it.style === "notice" ? [] : [-1, 1]) {
          const strip = printQuad(0.03, 1.98, REGIONS.edge);
          print.add(strip, m.clone().multiply(local(sx * 0.3015, 0.08 + 0.99, 0, (sx * Math.PI) / 2)));
          const c = (lx: number, ly: number): V3 => {
            const v = new THREE.Vector3(sx * 0.3035, ly, lx).applyMatrix4(m);
            return [v.x, v.y, v.z];
          };
          glowQuad([c(-0.011, 0.09), c(-0.011, 2.07), c(0.011, 2.07), c(0.011, 0.09)], 2, 1);
        }
        if (it.uplights && it.style !== "notice") {
          uplight(it, m, 0, 0.55, y);
          uplight(it, m, 0, -0.55, y);
        }
        const proxy = proxies.get(it.id);
        if (proxy) {
          proxy.matrix.copy(m).multiply(new THREE.Matrix4().compose(new THREE.Vector3(0, 1.1, 0), new THREE.Quaternion(), new THREE.Vector3(0.7, 2.2, 0.3)));
          proxy.matrixAutoUpdate = false;
          proxy.matrixWorldNeedsUpdate = true;
        }
      } else if (it.kind === "flag") {
        const y = baseY(it, it.at);
        const m = placeMatrix(it.at[0], y, it.at[1], it.facing);
        frame.add(featherPole(0.8, 3.3, 0.75), m);
        // Cross base with a water weight.
        frame.add(new THREE.CylinderGeometry(0.27, 0.29, 0.07, 16), m.clone().multiply(local(-0.012, 0.035, 0)));
        frame.add(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), m.clone().multiply(local(-0.012, 0.15, 0)));
        for (const a of [0, Math.PI / 2]) frame.add(new THREE.BoxGeometry(0.62, 0.025, 0.04), m.clone().multiply(local(-0.012, 0.085, 0, a)));
        const i = flags.indexOf(it);
        sails.setMatrixAt(i, m);
        uplight(it, m, 0.35, 0.45, y);
        const proxy = proxies.get(it.id);
        if (proxy) {
          proxy.matrix.copy(m).multiply(new THREE.Matrix4().compose(new THREE.Vector3(0.4, 2.2, 0), new THREE.Quaternion(), new THREE.Vector3(0.9, 4.2, 0.3)));
          proxy.matrixAutoUpdate = false;
          proxy.matrixWorldNeedsUpdate = true;
        }
      } else if (it.kind === "decal") {
        const y = baseY(it, it.at);
        const g = mapUV(new THREE.CircleGeometry(it.size / 2, 48), DECAL_REGIONS[it.decal], DECAL_ATLAS);
        // Flat on the ground, the text's top towards the door (reads when walking in).
        const m = placeMatrix(it.at[0], y + 0.012, it.at[1], it.facing + 180).multiply(local(0, 0, 0, 0, -Math.PI / 2));
        decal.add(g, m);
      } else if (it.kind === "lineLight") {
        const ya = baseY(it, it.from);
        const yb = baseY(it, it.to);
        const dx = it.to[0] - it.from[0];
        const dz = it.to[1] - it.from[1];
        const len = Math.hypot(dx, dz);
        const nx = -dz / len;
        const nz = dx / len;
        const strip = (w: number, lift: number, kind: number, intensity: number) =>
          glowQuad(
            [
              [it.from[0] - nx * w, ya + lift, it.from[1] - nz * w],
              [it.to[0] - nx * w, yb + lift, it.to[1] - nz * w],
              [it.to[0] + nx * w, yb + lift, it.to[1] + nz * w],
              [it.from[0] + nx * w, ya + lift, it.from[1] + nz * w],
            ],
            kind,
            intensity,
          );
        strip(0.03, 0.006, 2, 1);
        strip(0.7, 0.012, 3, 0.02);
        // Aluminium channel the strip sits in.
        const ch = new THREE.BoxGeometry(len, 0.012, 0.075);
        frame.add(ch, new THREE.Matrix4().compose(new THREE.Vector3((it.from[0] + it.to[0]) / 2, (ya + yb) / 2 + 0.0, (it.from[1] + it.to[1]) / 2), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(dz, dx)), new THREE.Vector3(1, 1, 1)));
      } else if (it.kind === "stanchions") {
        const pts = it.points.map((p) => [p[0], baseY(it, p), p[1]] as V3);
        for (const p of pts) {
          const m = new THREE.Matrix4().makeTranslation(p[0], p[1], p[2]);
          frame.add(new THREE.CylinderGeometry(0.16, 0.17, 0.025, 20), m.clone().multiply(local(0, 0.0125, 0)));
          frame.add(new THREE.CylinderGeometry(0.028, 0.028, 0.9, 10), m.clone().multiply(local(0, 0.47, 0)));
          frame.add(new THREE.CylinderGeometry(0.036, 0.036, 0.07, 12), m.clone().multiply(local(0, 0.93, 0)));
        }
        for (let k = 0; k + 1 < pts.length; k++) {
          const a = pts[k];
          const b = pts[k + 1];
          const len = Math.hypot(b[0] - a[0], b[2] - a[2]) - 0.07;
          const mid = new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.875, (a[2] + b[2]) / 2);
          const yaw = -Math.atan2(b[2] - a[2], b[0] - a[0]);
          for (const side of [0, Math.PI]) {
            const belt = printQuad(len, 0.05, REGIONS.beltPlain);
            print.add(belt, new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw + side), new THREE.Vector3(1, 1, 1)));
          }
        }
      } else if (it.kind === "hangSign") {
        const m = placeMatrix(it.at[0], it.y, it.at[1], it.facing);
        const w = 1.96;
        const h = 0.7;
        const top = it.bottom + h;
        // Slim graphite frame, prints both sides, two wires up to the ceiling.
        frame.add(boxUV(new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.035)), m.clone().multiply(local(0, it.bottom + h / 2, 0)));
        print.add(printQuad(w, h, REGIONS.hangFront), m.clone().multiply(local(0, it.bottom + h / 2, 0.019)));
        print.add(printQuad(w, h, REGIONS.hangBack), m.clone().multiply(local(0, it.bottom + h / 2, -0.019, Math.PI)));
        for (const sx of [-0.78, 0.78]) {
          const len = Math.max(0.05, it.ceiling - top - 0.02);
          frame.add(new THREE.CylinderGeometry(0.004, 0.004, len, 4), m.clone().multiply(local(sx, top + 0.02 + len / 2, 0)));
        }
      } else if (it.kind === "wallWash") {
        const y = baseY(it, it.at);
        const m = placeMatrix(it.at[0], y, it.at[1], it.facing + 180);
        // Low black linear fixture on the paving (front −z of m faces the wall), warm lens on top.
        frame.add(boxUV(new THREE.BoxGeometry(0.42, 0.09, 0.16)), m.clone().multiply(local(0, 0.045, 0)));
        const lens = new THREE.Vector3(0, 0.092, 0).applyMatrix4(m);
        glowQuad(
          [
            [lens.x - 0.17, lens.y, lens.z - 0.17],
            [lens.x + 0.17, lens.y, lens.z - 0.17],
            [lens.x + 0.17, lens.y, lens.z + 0.17],
            [lens.x - 0.17, lens.y, lens.z + 0.17],
          ],
          5,
          LUMINANCE.eventLight * 0.12,
        );
        // The wash on the wall, 3 cm in front of it: the quad is wide at the top (the scallop spreads).
        const [fx, fz] = bearingVector(it.facing);
        const wx = it.at[0] + fx * (it.wallDist - 0.03);
        const wz = it.at[1] + fz * (it.wallDist - 0.03);
        const rx = -fz;
        const rz = fx;
        const half = it.width / 2;
        glowQuad(
          [
            [wx - rx * half, y + 0.08, wz - rz * half],
            [wx + rx * half, y + 0.08, wz + rz * half],
            [wx + rx * half, y + it.height, wz + rz * half],
            [wx - rx * half, y + it.height, wz - rz * half],
          ],
          4,
          0.035,
        );
      } else if (it.kind === "poleBanner") {
        const y = baseY(it, it.at);
        const m = placeMatrix(it.at[0], y + it.top, it.at[1], it.facing);
        bannerMesh.setMatrixAt(banners.indexOf(it), m);
        // Top and bottom arms (aluminium tube) from the pole.
        for (const dy of [0, -3.33]) frame.add(new THREE.CylinderGeometry(0.014, 0.014, 1.12, 8), m.clone().multiply(local(0.56, dy, 0, 0, 0, Math.PI / 2)));
      }
    }
    frameMesh.geometry.dispose();
    frameMesh.geometry = frame.merge();
    printMesh.geometry.dispose();
    printMesh.geometry = print.merge();
    decalMesh.geometry.dispose();
    decalMesh.geometry = decal.merge();
    const glow = new THREE.BufferGeometry();
    glow.setAttribute("position", new THREE.Float32BufferAttribute(glowPos, 3));
    glow.setAttribute("uv", new THREE.Float32BufferAttribute(glowUv, 2));
    glow.setAttribute("aGlow", new THREE.Float32BufferAttribute(glowAttr, 3));
    glowMesh.geometry.dispose();
    glowMesh.geometry = glow;
    sails.instanceMatrix.needsUpdate = true;
    bannerMesh.instanceMatrix.needsUpdate = true;
    bannerMesh.computeBoundingSphere();
    regionAttr.needsUpdate = true;
    phaseAttr.needsUpdate = true;
    sails.computeBoundingSphere();
    for (const p of proxies.values()) p.updateMatrixWorld(true);
  };
  build();

  // Settle onto the modelled ground once the other modules are in (shared probe in world/routes.ts).
  const footprints: V2[] = [];
  for (const it of ITEMS) {
    if (it.kind === "lineLight") footprints.push(it.from, it.to);
    else if (it.kind === "stanchions") footprints.push(...it.points);
    else footprints.push(it.at);
  }
  surfaceService.attach(root);
  surfaceService.request(footprints, 2);
  const unlisten = surfaceService.listen((index) => {
    heights.clear();
    lows.clear();
    for (const it of ITEMS) {
      if (it.kind === "hangSign") continue;
      if (it.kind === "totem" || it.kind === "flag") {
        const hint = it.y ?? groundAt(it.at[0], it.at[1]);
        let low: number | null = null;
        for (let k = 0; k < 9; k++) {
          const a = (k / 8) * Math.PI * 2;
          const r = k === 8 ? 0 : 1.0;
          const yy = index.heightAt(it.at[0] + Math.cos(a) * r, it.at[1] + Math.sin(a) * r, hint, 0.6, 0.45);
          if (yy !== null && (low === null || yy < low)) low = yy;
        }
        if (low !== null) lows.set(it.id, low);
      }
      const pts: V2[] = it.kind === "lineLight" ? [it.from, it.to] : it.kind === "stanchions" ? it.points : [it.at];
      for (const at of pts) {
        const hint = it.y ?? groundAt(at[0], at[1]);
        // Highest surface under the footprint (a few points round the foot), so nothing sinks into a step.
        let best: number | null = null;
        for (const [ox, oz] of [
          [0, 0],
          [0.25, 0],
          [-0.25, 0],
          [0, 0.25],
          [0, -0.25],
        ] as V2[]) {
          const yy = index.heightAt(at[0] + ox, at[1] + oz, hint, 0.6, 0.45);
          if (yy !== null && (best === null || yy > best)) best = yy;
        }
        if (best !== null) heights.set(`${it.id}@${at[0].toFixed(2)},${at[1].toFixed(2)}`, best);
      }
    }
    build();
    ctx.invalidate();
  });

  // Day ↔ night.
  const setLighting = (state: LightingState) => {
    const n = state.night;
    // Prints are lit by the scene by day; at night the faces glow softly (backlit fabric ≈ 40 cd/m² on white).
    printMat.emissiveIntensity = 0.004 + 0.04 * n;
    wind.uUplight.value = 0.002 + 0.03 * n;
    glowUniforms.uNight.value = n;
    ctx.invalidate();
  };
  setLighting(ctx.lighting());

  // Wind: only while flags are near and on screen.
  const frustum = new THREE.Frustum();
  const pm = new THREE.Matrix4();
  const cam = new THREE.Vector3();
  const flagPoints = flags.map((f) => new THREE.Vector3(f.at[0], (f.y ?? groundAt(f.at[0], f.at[1])) + 2, f.at[1]));
  const tick = (dt: number, _elapsed: number, camera: THREE.PerspectiveCamera): boolean => {
    if (ctx.reducedMotion || !flags.length) return false;
    camera.getWorldPosition(cam);
    pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pm);
    const near = flagPoints.some((p) => p.distanceTo(cam) < 140 && frustum.containsPoint(p));
    if (!near) return false;
    wind.uTime.value += dt;
    return true;
  };

  const dispose = () => {
    unlisten();
    surfaceService.detach(root);
    atlas.prints.dispose();
    atlas.decals.dispose();
    pickGeo.dispose();
  };

  const ready = Promise.all([atlas.ready, surfaceService.settled()]).then(() => ctx.invalidate());

  return {
    id: "event",
    root,
    labels: [],
    pickables,
    // Entrance targets come from the building modules; the totems and flags pick them.
    targets: [],
    setLighting,
    tick,
    ready,
    dispose,
  };
}

/** Items that stand inside a building footprint (only the EduCity lobby signs should). */
export function itemsInside(items: readonly Item[], buildings: readonly { polygon: V2[]; holes?: V2[][] }[]): string[] {
  const out: string[] = [];
  for (const it of items) {
    const pts: V2[] = it.kind === "lineLight" ? [it.from, it.to] : it.kind === "stanchions" ? it.points : [it.at];
    if (pts.some((p) => buildings.some((b) => pointInRing(p, b.polygon) && !(b.holes ?? []).some((h) => pointInRing(p, h))))) out.push(it.id);
  }
  return out;
}
