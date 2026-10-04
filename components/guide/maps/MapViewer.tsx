"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Maximize2, Minus, Plus, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MapHotspot, VenueMap } from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";

const MAX_ZOOM = 8;
const KEY_PAN = 80;

interface View {
  scale: number;
  x: number;
  y: number;
}

function isHighlighted(h: MapHotspot, highlight: readonly string[]) {
  return highlight.includes(h.id) || (h.refId !== undefined && highlight.includes(h.refId));
}

/**
 * Full-screen map viewer: pinch / drag / wheel / keyboard zoom and pan.
 * Transform updates go straight to the DOM (no React render per frame).
 * Radix Dialog provides the focus trap, Escape and focus return.
 */
export function MapViewer({
  map,
  open,
  onOpenChange,
  highlight = [],
  returnFocusTo,
}: {
  map: VenueMap;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlight?: readonly string[];
  /** Element that opened the viewer; focus returns to it on close. */
  returnFocusTo?: HTMLElement | null;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ scale: 1, x: 0, y: 0 });
  const fit = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{
    kind: "pan" | "pinch";
    start: View;
    p0: { x: number; y: number };
    dist0?: number;
  } | null>(null);
  const lastTap = useRef(0);
  const [loaded, setLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const apply = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const { scale, x, y } = view.current;
    stage.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    stage.style.setProperty("--inv-scale", String(1 / scale));
    stage.style.opacity = "1";
  }, []);

  const clamp = useCallback(
    (v: View): View => {
      const vp = viewportRef.current;
      if (!vp) return v;
      const vw = vp.clientWidth;
      const vh = vp.clientHeight;
      const scale = Math.min(Math.max(v.scale, fit.current * 0.8), fit.current * MAX_ZOOM);
      const w = map.width * scale;
      const h = map.height * scale;
      const x = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, v.x));
      const y = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, v.y));
      return { scale, x, y };
    },
    [map.width, map.height],
  );

  const set = useCallback(
    (v: View) => {
      view.current = clamp(v);
      apply();
    },
    [apply, clamp],
  );

  const reset = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    fit.current = Math.min(vp.clientWidth / map.width, vp.clientHeight / map.height);
    set({ scale: fit.current, x: 0, y: 0 });
  }, [map.width, map.height, set]);

  const zoomAt = useCallback(
    (factor: number, px?: number, py?: number) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const cx = px ?? vp.clientWidth / 2;
      const cy = py ?? vp.clientHeight / 2;
      const { scale, x, y } = view.current;
      const next = Math.min(Math.max(scale * factor, fit.current * 0.8), fit.current * MAX_ZOOM);
      set({ scale: next, x: cx - (cx - x) * (next / scale), y: cy - (cy - y) * (next / scale) });
    },
    [set],
  );

  const focusOn = useCallback(
    (h: MapHotspot) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const scale = Math.max(view.current.scale, fit.current * 2.4);
      set({
        scale,
        x: vp.clientWidth / 2 - h.x * map.width * scale,
        y: vp.clientHeight / 2 - h.y * map.height * scale,
      });
      setActiveId(h.id);
    },
    [map.width, map.height, set],
  );

  // Fit on open and on resize; focus a highlighted spot if there is one.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      reset();
      const target = map.hotspots.find((h) => isHighlighted(h, highlight));
      if (target) focusOn(target);
    });
    const onResize = () => set(view.current);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [open, map, highlight, reset, focusOn, set]);

  // Wheel needs a non-passive listener to prevent page zoom/scroll.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!open || !vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const delta = e.ctrlKey ? e.deltaY * 0.01 : e.deltaY * 0.0015;
      zoomAt(Math.exp(-delta), e.clientX - rect.left, e.clientY - rect.top);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [open, zoomAt, loaded]);

  const local = (e: React.PointerEvent) => {
    const rect = viewportRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startGesture = () => {
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      gesture.current = { kind: "pan", start: { ...view.current }, p0: pts[0] };
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      gesture.current = {
        kind: "pinch",
        start: { ...view.current },
        p0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        dist0: Math.hypot(a.x - b.x, a.y - b.y),
      };
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    try {
      viewportRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // The pointer may already be gone (fast taps, synthetic events) — panning still works.
    }
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 1) {
      const now = performance.now();
      if (now - lastTap.current < 280) {
        if (view.current.scale > fit.current * 3) reset();
        else zoomAt(2, p.x, p.y);
        lastTap.current = 0;
      } else {
        lastTap.current = now;
      }
    }
    startGesture();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, local(e));
    const g = gesture.current;
    if (!g) return;
    const pts = [...pointers.current.values()];
    if (g.kind === "pan" && pts.length === 1) {
      set({ scale: g.start.scale, x: g.start.x + pts[0].x - g.p0.x, y: g.start.y + pts[0].y - g.p0.y });
    } else if (g.kind === "pinch" && pts.length >= 2 && g.dist0) {
      const [a, b] = pts;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const scale = Math.min(
        Math.max(g.start.scale * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist0), fit.current * 0.8),
        fit.current * MAX_ZOOM,
      );
      const cx = (g.p0.x - g.start.x) / g.start.scale;
      const cy = (g.p0.y - g.start.y) / g.start.scale;
      set({ scale, x: mid.x - cx * scale, y: mid.y - cy * scale });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) startGesture();
    else gesture.current = null;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const { scale, x, y } = view.current;
    switch (e.key) {
      case "+":
      case "=":
        zoomAt(1.4);
        break;
      case "-":
      case "_":
        zoomAt(1 / 1.4);
        break;
      case "0":
        reset();
        break;
      case "ArrowLeft":
        set({ scale, x: x + KEY_PAN, y });
        break;
      case "ArrowRight":
        set({ scale, x: x - KEY_PAN, y });
        break;
      case "ArrowUp":
        set({ scale, x, y: y + KEY_PAN });
        break;
      case "ArrowDown":
        set({ scale, x, y: y - KEY_PAN });
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const controlClass =
    "inline-flex h-11 w-11 items-center justify-center border border-white/20 text-white transition-colors hover:border-white cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  const listed = [...map.hotspots].sort(
    (a, b) => Number(isHighlighted(b, highlight)) - Number(isHighlighted(a, highlight)),
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/95" />
        <Dialog.Content
          className="fixed inset-0 z-[71] flex flex-col bg-black text-white outline-none"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            viewportRef.current?.focus();
          }}
          onCloseAutoFocus={(e) => {
            if (!returnFocusTo) return;
            e.preventDefault();
            returnFocusTo.focus();
          }}
        >
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 pl-4 pr-2 sm:px-4">
            <Dialog.Title className="min-w-0 truncate text-sm font-bold">{map.title}</Dialog.Title>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                className={cn(controlClass, "hidden sm:inline-flex")}
                onClick={() => zoomAt(1 / 1.4)}
                aria-label="Zoom out"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={cn(controlClass, "hidden sm:inline-flex")}
                onClick={() => zoomAt(1.4)}
                aria-label="Zoom in"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" className={controlClass} onClick={reset} aria-label="Reset zoom">
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <Dialog.Close className={controlClass} aria-label="Close map">
                <X className="h-5 w-5" aria-hidden="true" />
              </Dialog.Close>
            </div>
          </div>

          <Dialog.Description className="sr-only">
            Drag or use the arrow keys to move. Pinch, scroll or press plus and minus to zoom. Press 0 to reset and
            Escape to close. The locations on this map are listed below the map.
          </Dialog.Description>

          <div
            ref={viewportRef}
            tabIndex={0}
            role="group"
            aria-roledescription="zoomable map"
            aria-label={map.alt}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
            className="relative min-h-0 flex-1 cursor-grab touch-none select-none overflow-hidden bg-neutral-950 active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-event)"
          >
            <div
              ref={stageRef}
              className="absolute left-0 top-0 origin-top-left will-change-transform"
              style={{ width: map.width, height: map.height, opacity: 0 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={map.srcLarge}
                alt=""
                width={map.width}
                height={map.height}
                draggable={false}
                onLoad={() => setLoaded(true)}
                className="block h-full w-full bg-white"
              />
              {map.hotspots.map((h) => {
                const hl = isHighlighted(h, highlight);
                const active = activeId === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => focusOn(h)}
                    aria-label={`${h.label}${h.description ? ` — ${h.description}` : ""}`}
                    className="group absolute flex h-11 w-11 items-center justify-center focus-visible:outline-none"
                    style={{
                      left: `${h.x * 100}%`,
                      top: `${h.y * 100}%`,
                      transform: "translate(-50%, -50%) scale(var(--inv-scale, 1))",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "block rounded-full border-[3px] transition-[width,height]",
                        hl || active
                          ? "guide-hotspot-pulse h-9 w-9 border-(--color-event-strong) bg-(--color-event)/15"
                          : "h-6 w-6 border-(--color-event-strong)/70 bg-white/0 group-hover:h-8 group-hover:w-8 group-focus-visible:h-8 group-focus-visible:w-8",
                        "group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-black",
                      )}
                    />
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap bg-black px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-white",
                        hl || active ? "block" : "hidden group-hover:block group-focus-visible:block",
                      )}
                    >
                      {h.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {!loaded && (
              <p className="absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-white/55">
                Loading map…
              </p>
            )}
          </div>

          <details className="guide-details shrink-0 border-t border-white/10 bg-black">
            <summary className="flex min-h-12 items-center justify-between px-4 text-xs font-mono uppercase tracking-widest text-neutral-400">
              <span>
                Locations on this map ({map.hotspots.length})&nbsp;· {map.source}
              </span>
              <svg
                aria-hidden="true"
                width="10"
                height="10"
                viewBox="0 0 10 10"
                className="guide-chevron rotate-180 transition-transform"
              >
                <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </summary>
            <div className="max-h-[38vh] overflow-y-auto px-4 pb-4">
              <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                {listed.map((h) => (
                  <li key={h.id} className="border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => focusOn(h)}
                      className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-sm cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                    >
                      <span>
                        <span
                          className={isHighlighted(h, highlight) ? "font-semibold text-(--color-event)" : "text-white"}
                        >
                          {h.label}
                        </span>
                        {h.description && <span className="text-neutral-400"> — {h.description}</span>}
                      </span>
                      <span
                        aria-hidden="true"
                        className="font-mono text-[11px] uppercase tracking-widest text-white/55"
                      >
                        Show
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {map.glossary && map.glossary.length > 0 && (
                <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                  {map.glossary.map((g) => (
                    <div key={g.fi} className="flex gap-2">
                      <dt className="text-neutral-300">{g.fi}</dt>
                      <dd className="text-white/55">= {g.en}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </details>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
