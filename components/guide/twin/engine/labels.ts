import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { LabelKind } from "./types";

/**
 * Floating DOM labels (CSS2DRenderer). aria-hidden — the text alternative
 * under the canvas (lib/hackathon-2026/twin.ts) is the accessible version.
 * Styles follow the guide: mono, uppercase micro labels, sharp corners,
 * violet (the --color-event token) only for event things (stands, entrances, landmarks).
 */

const BOX = "pointer-events-none whitespace-nowrap font-mono uppercase tracking-widest";
const WRAP_SM = "max-sm:max-w-[9.5rem] max-sm:whitespace-normal max-sm:text-center max-sm:leading-snug";
/** Tight dark halo (plus a soft drop) for labels drawn straight on the scene, without a box. */
const HALO = "[text-shadow:0_0_2px_#000,0_0_2px_#000,0_0_1px_#000,0_1px_4px_#000]";

const CLASS: Record<LabelKind, string> = {
  company: `${BOX} border border-white/25 bg-black/75 px-2 py-1 text-[10px] text-white sm:text-[11px]`,
  stand: `${BOX} border border-(--color-event)/70 bg-black/80 px-2 py-1 text-[10px] text-white ${WRAP_SM} sm:text-[11px]`,
  landmark: `${BOX} border border-(--color-event)/70 bg-black/80 px-2 py-1 text-[10px] text-[color-mix(in_oklab,var(--color-event)_45%,white)] ${WRAP_SM} sm:text-[11px]`,
  // neutral-300 on the black/70 box stays ≥ 4.5:1 even over a white facade (≈ 5.7:1; neutral-400 fell to 3.4).
  open: `${BOX} border border-white/15 bg-black/70 px-2 py-1 text-[10px] text-neutral-300 ${WRAP_SM} sm:text-[11px]`,
  // Context labels are hidden on small screens to keep phones uncluttered. Without a box, a tight dark
  // halo round every glyph keeps them legible over light pavement and pale facades.
  area: `${BOX} px-1 text-[10px] text-[color-mix(in_oklab,var(--color-event)_60%,white)] ${HALO} max-sm:hidden sm:text-[11px]`,
  floor: `${BOX} border-l-2 border-(--color-event) bg-black/70 py-1 pl-2 pr-3 text-[11px] font-bold text-white sm:text-xs`,
  entrance: `${BOX} flex items-center gap-1.5 border border-(--color-event) bg-black/85 px-2 py-1 text-[10px] text-white ${WRAP_SM} sm:text-[11px]`,
  building: `${BOX} px-1 text-[11px] font-bold tracking-[0.2em] text-white [text-shadow:0_1px_8px_#000,0_0_2px_#000] sm:text-[13px]`,
  street: `${BOX} px-1 text-[9px] tracking-[0.25em] text-white/85 ${HALO} max-sm:hidden sm:text-[10px]`,
};

/**
 * A door that is shut during the event: never styled like an event entrance (no violet), and the
 * word "closed" is part of the label on every screen size — a phone must not show a bare door name.
 */
const CLOSED_ENTRANCE = `${BOX} flex items-center gap-1.5 border border-white/25 bg-black/80 px-2 py-1 text-[10px] text-neutral-300 ${WRAP_SM} sm:text-[11px]`;

/** The three event venues: their name labels are wayfinding anchors in every overview. */
const VENUE_NAME = /^(biocity|joki|educity)$/i;

/** True when a label text or detail says the door is closed (during the event). */
export function saysClosed(...texts: (string | undefined)[]): boolean {
  return texts.some((t) => !!t && /\bclosed\b/i.test(t));
}

/**
 * Create a label at (x, y, z). `group` ties it to views with a labelGroup;
 * `detail` is appended after a dot and hidden on small screens (except a "closed" notice).
 */
export function makeLabel(
  text: string,
  kind: LabelKind,
  x: number,
  y: number,
  z: number,
  group?: string,
  detail?: string,
): CSS2DObject {
  const el = document.createElement("div");
  const closed = kind === "entrance" && saysClosed(text, detail);
  el.className = closed ? CLOSED_ENTRANCE : CLASS[kind];
  if (kind === "entrance") {
    // Small door mark before the text: violet for an event entrance, a grey bar for a closed door.
    const mark = document.createElement("span");
    mark.className = closed ? "inline-block h-0.5 w-2 shrink-0 bg-neutral-400" : "inline-block h-2 w-2 shrink-0 bg-(--color-event)";
    el.appendChild(mark);
  }
  el.appendChild(document.createTextNode(text));
  if (detail) {
    const span = document.createElement("span");
    span.className = closed ? "opacity-80" : "max-sm:hidden opacity-70";
    span.textContent = ` · ${detail}`;
    el.appendChild(span);
  }
  el.setAttribute("aria-hidden", "true");
  const label = new CSS2DObject(el);
  label.position.set(x, y, z);
  label.userData.kind = kind;
  if (group) label.userData.group = group;
  label.userData.text = text;
  if (closed) label.userData.closed = true;
  return label;
}

/** Label priority for decluttering (higher wins when two overlap). */
export const LABEL_PRIORITY: Record<LabelKind, number> = {
  entrance: 9,
  stand: 8,
  company: 8,
  landmark: 7,
  floor: 6,
  building: 5,
  open: 4,
  area: 3,
  street: 2,
};

/** What the engine knows about a label when it ranks it (userData of makeLabel, plus its text). */
export interface LabelInfo {
  kind: LabelKind | string | undefined;
  text?: string;
  group?: string;
  /** A door that is closed during the event (makeLabel sets userData.closed). */
  closed?: boolean;
  /** A module asks for it to be treated as event-critical (userData.pinned). */
  pinned?: boolean;
}

export interface LabelRank {
  /** Declutter priority: higher wins an overlap. */
  prio: number;
  /**
   * Event-critical (the venues, the event entrances, the arrival points): in the map views a building
   * in front only dims it (drawn in an "occluded" style), it never hides it.
   */
  pinned: boolean;
  /** Only in close views: a closed door, never in an overview. */
  closeOnly: boolean;
}

/**
 * Wayfinding rank of a label. Venue names and event entrances outrank everything; arrival points
 * (the route network's start labels: drop-off, station hall, platform, car park doors) come next,
 * then stands and landmarks, street names, and last the names of the other campus buildings and the
 * route distance markers — so in the overviews the places people must find win every overlap.
 */
export function labelRank(info: LabelInfo): LabelRank {
  const kind = (info.kind ?? "area") as LabelKind;
  const text = (info.text ?? "").trim();
  if (kind === "entrance") {
    if (info.closed) return { prio: 3.5, pinned: false, closeOnly: true };
    return { prio: 10, pinned: true, closeOnly: false };
  }
  if (kind === "building") {
    // Below the event entrances: their labels name the venue too ("BioCity event entrance").
    if (VENUE_NAME.test(text)) return { prio: 9.5, pinned: true, closeOnly: false };
    // Other campus buildings: context for the map, below the street names.
    return { prio: 4, pinned: false, closeOnly: false };
  }
  if (info.pinned) return { prio: Math.max(8.5, LABEL_PRIORITY[kind] ?? 0), pinned: true, closeOnly: false };
  // The route network's start points (group "routes") are where people arrive.
  if (kind === "landmark" && info.group === "routes") return { prio: 8.5, pinned: true, closeOnly: false };
  if (kind === "street") return { prio: 5, pinned: false, closeOnly: false };
  // Distance markers on the route network.
  if (kind === "area" && info.group === "routes") return { prio: 2.5, pinned: false, closeOnly: false };
  return { prio: LABEL_PRIORITY[kind] ?? 0, pinned: false, closeOnly: false };
}

/**
 * How far (m) a label of each kind reads at eye level (walking, routes): beyond this it is map
 * clutter — a building name 100 m away over a gallery ceiling, a street name behind a block.
 */
export function eyeLevelReach(info: LabelInfo): number {
  const kind = (info.kind ?? "area") as LabelKind;
  if (kind === "building") return VENUE_NAME.test((info.text ?? "").trim()) ? 260 : 70;
  if (kind === "entrance") return info.closed ? 40 : 120;
  if (kind === "landmark") return 80;
  if (kind === "street") return 45;
  if (kind === "stand" || kind === "company") return 35;
  if (kind === "floor") return 40;
  return 28;
}

/**
 * Pick the labels to show at eye level: at most `cap`, the most useful first — the nearest, with
 * important kinds counting as closer. `must` (the focused target's label) is always kept.
 */
export function eyeLevelPick<T>(items: { item: T; distance: number; prio: number }[], cap: number, must: T | null = null): Set<T> {
  const ranked = items
    .map((x) => ({ ...x, score: x.item === must ? -Infinity : x.distance / (1 + 0.5 * Math.max(0, x.prio)) }))
    .sort((a, b) => a.score - b.score);
  return new Set(ranked.slice(0, Math.max(0, cap)).map((x) => x.item));
}

/** A label's box on screen (DOMRect-like), and the free part of the screen (inside the UI's controls). */
export interface LabelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * The shift that brings a label's box inside the free part — null when it can't be: its anchor (the
 * box's centre) lies more than a few px outside the free part, or the label is bigger than it. A
 * label is never drawn partly off the canvas or under the controls: nudged in, or hidden.
 */
export function nudgeInto(
  r: LabelBox,
  f: { left: number; right: number; top: number; bottom: number },
): { dx: number; dy: number } | null {
  if (r.width > f.right - f.left || r.height > f.bottom - f.top) return null;
  let dx = 0;
  let dy = 0;
  if (r.left < f.left) dx = f.left - r.left;
  else if (r.right > f.right) dx = f.right - r.right;
  if (r.top < f.top) dy = f.top - r.top;
  else if (r.bottom > f.bottom) dy = f.bottom - r.bottom;
  if (Math.abs(dx) > r.width / 2 + 6 || Math.abs(dy) > r.height / 2 + 6) return null;
  return { dx, dy };
}
