import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

export type LabelKind = "company" | "area" | "floor" | "stand" | "open";

const CLASS: Record<LabelKind, string> = {
  company:
    "pointer-events-none whitespace-nowrap border border-white/25 bg-black/75 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white sm:text-[11px]",
  stand:
    "pointer-events-none whitespace-nowrap border border-[#8b7bff]/70 bg-black/80 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white sm:text-[11px]",
  open: "pointer-events-none whitespace-nowrap border border-white/15 bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-neutral-400 sm:text-[11px]",
  area: "pointer-events-none whitespace-nowrap px-1 font-mono text-[10px] uppercase tracking-widest text-[#b9adff] [text-shadow:0_1px_6px_#000] sm:text-[11px]",
  floor:
    "pointer-events-none whitespace-nowrap border-l-2 border-[#8b7bff] bg-black/70 py-1 pl-2 pr-3 font-mono text-[11px] font-bold uppercase tracking-widest text-white sm:text-xs",
};

/** Floating DOM label (aria-hidden — the text list under the canvas is the accessible version). */
export function makeLabel(text: string, kind: LabelKind, x: number, y: number, z: number, group?: string) {
  const el = document.createElement("div");
  el.className = CLASS[kind];
  el.textContent = text;
  el.setAttribute("aria-hidden", "true");
  const label = new CSS2DObject(el);
  label.position.set(x, y, z);
  label.userData.kind = kind;
  if (group) label.userData.group = group;
  return label;
}
