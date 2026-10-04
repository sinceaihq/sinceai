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
 * Create a label at (x, y, z). `group` ties it to views with a labelGroup;
 * `detail` is appended after a dot and hidden on small screens.
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
  el.className = CLASS[kind];
  if (kind === "entrance") {
    // Small violet door mark before the text.
    const mark = document.createElement("span");
    mark.className = "inline-block h-2 w-2 shrink-0 bg-(--color-event)";
    el.appendChild(mark);
  }
  el.appendChild(document.createTextNode(text));
  if (detail) {
    const span = document.createElement("span");
    span.className = "max-sm:hidden opacity-70";
    span.textContent = ` · ${detail}`;
    el.appendChild(span);
  }
  el.setAttribute("aria-hidden", "true");
  const label = new CSS2DObject(el);
  label.position.set(x, y, z);
  label.userData.kind = kind;
  if (group) label.userData.group = group;
  label.userData.text = text;
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
