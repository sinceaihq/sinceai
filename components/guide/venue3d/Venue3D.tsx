"use client";

import Image from "next/image";
import Link from "next/link";
import { Maximize2, Minimize2, Minus, Pause, Play, Plus, Tag, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  getScene3D,
  normaliseTarget,
  sceneForTarget,
  SCENES_3D,
  type Scene3DId,
} from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";
import type { VenueEngine } from "./engine";

type Status = "idle" | "loading" | "ready" | "unsupported" | "error";

const iconButton =
  "inline-flex h-11 w-11 items-center justify-center border border-white/20 bg-black/70 text-white backdrop-blur transition-colors hover:border-white cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-40";

/**
 * Interactive 3D preview of the event spaces. Poster first; three.js loads
 * only when someone asks for it. On touch devices the preview opens full
 * screen so it never hijacks page scrolling. Illustrative, not to scale — the
 * floor plans stay the reference.
 */
export function Venue3D() {
  const uid = useId();
  const [sceneId, setSceneId] = useState<Scene3DId>("showroom");
  const [status, setStatus] = useState<Status>("idle");
  const [expanded, setExpanded] = useState(false);
  const [labels, setLabels] = useState(false);
  const [touring, setTouring] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const engineRef = useRef<VenueEngine | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const touchRef = useRef(false);
  const startedFromParams = useRef(false);

  const scene = getScene3D(sceneId);
  const target = scene.targets.find((t) => t.id === selected) ?? null;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    touchRef.current = window.matchMedia("(pointer: coarse)").matches;
    return () => mq.removeEventListener("change", update);
  }, []);

  const stop = useCallback(() => {
    engineRef.current?.dispose();
    engineRef.current = null;
    setStatus("idle");
    setTouring(false);
    setSelected(null);
  }, []);

  const start = useCallback(
    async (id: Scene3DId, focusId?: string | null) => {
      const host = hostRef.current;
      if (!host) return;
      const { createVenueEngine, isWebGL2Available } = await import("./engine");
      if (!isWebGL2Available()) {
        setStatus("unsupported");
        return;
      }
      setStatus("loading");
      try {
        if (!engineRef.current) {
          const small = Math.min(window.screen.width, window.screen.height) < 700;
          const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
          engineRef.current = createVenueEngine(host, {
            quality: (touchRef.current && small) || (memory !== undefined && memory <= 4) ? "low" : "high",
            reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
            onSelect: (pick) => setSelected(pick),
            onLabelsChange: setLabels,
            onContextLost: () => setStatus("error"),
          });
        }
        const engine = engineRef.current;
        await engine.load(id);
        if (focusId) {
          engine.focus(focusId, false);
          setSelected(focusId);
        }
        await Promise.race([engine.whenReady(), new Promise((r) => setTimeout(r, 6000))]);
        if (engineRef.current === engine) setStatus("ready");
      } catch {
        setStatus("error");
      }
    },
    [],
  );

  // Deep links (?focus=elisa, ?scene=biocity) are an explicit intent — open the 3D.
  useEffect(() => {
    if (startedFromParams.current) return;
    startedFromParams.current = true;
    const params = new URLSearchParams(window.location.search);
    const focusParam = params.get("focus");
    const sceneParam = params.get("scene") as Scene3DId | null;
    if (!focusParam && !sceneParam) return;
    const id = sceneParam && SCENES_3D.some((s) => s.id === sceneParam) ? sceneParam : sceneForTarget(focusParam);
    const focusId = normaliseTarget(focusParam);
    const raf = requestAnimationFrame(() => {
      setSceneId(id);
      if (touchRef.current) return; // on phones, wait for a tap (opens full screen)
      void start(id, focusId);
    });
    return () => cancelAnimationFrame(raf);
  }, [start]);

  useEffect(() => () => engineRef.current?.dispose(), []);

  // Full-screen mode: lock page scroll, move focus in, Escape exits.
  useEffect(() => {
    if (!expanded) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    stageRef.current?.focus();
    const raf = requestAnimationFrame(() => engineRef.current?.resize());
    return () => {
      html.style.overflow = prev;
      cancelAnimationFrame(raf);
      requestAnimationFrame(() => engineRef.current?.resize());
    };
  }, [expanded]);

  const exitExpanded = useCallback(() => {
    setExpanded(false);
    if (touchRef.current) stop();
    requestAnimationFrame(() => enterRef.current?.focus());
  }, [stop]);

  const onEnter = () => {
    if (touchRef.current) setExpanded(true);
    void start(sceneId, selected);
  };

  const switchScene = (id: Scene3DId) => {
    setSceneId(id);
    setSelected(null);
    setTouring(false);
    engineRef.current?.setAutoRotate(false);
    if (engineRef.current) void start(id);
  };

  const onStageKey = (e: React.KeyboardEvent) => {
    const engine = engineRef.current;
    if (e.key === "Escape" && expanded) {
      e.preventDefault();
      exitExpanded();
      return;
    }
    if (!engine || status !== "ready") return;
    if (e.key === "+" || e.key === "=") engine.zoom(1.25);
    else if (e.key === "-" || e.key === "_") engine.zoom(0.8);
    else if (e.key === "0" || e.key === "Home") engine.view("default");
    else return;
    e.preventDefault();
  };

  // Keep keyboard focus inside the full-screen overlay.
  const onOverlayKeyDown = (e: React.KeyboardEvent) => {
    if (!expanded || e.key !== "Tab") return;
    const nodes = stageRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), select, a[href], [tabindex="0"]',
    );
    if (!nodes || nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const active = status === "loading" || status === "ready";

  return (
    <div className="guide-no-print">
      <div
        role="tablist"
        aria-label="3D scenes"
        className="-mx-6 mb-4 flex gap-1 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SCENES_3D.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`${uid}-tab-${s.id}`}
            aria-selected={s.id === sceneId}
            aria-controls={`${uid}-panel`}
            onClick={() => switchScene(s.id)}
            className={cn(
              "min-h-11 shrink-0 border px-3 font-mono text-[11px] uppercase tracking-widest transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
              s.id === sceneId
                ? "border-white bg-white text-black"
                : "border-white/15 text-neutral-400 hover:border-white/40 hover:text-white",
            )}
          >
            {s.tab}
          </button>
        ))}
      </div>

      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${sceneId}`}>
        <div
          ref={stageRef}
          tabIndex={-1}
          onKeyDown={onOverlayKeyDown}
          {...(expanded ? { role: "dialog", "aria-modal": true, "aria-label": `3D preview: ${scene.title}` } : {})}
          className={cn(
            "outline-none",
            expanded ? "fixed inset-0 z-[80] flex h-[100dvh] flex-col bg-black" : "relative",
          )}
        >
          {expanded && (
            <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 pl-4 pr-2">
              <p className="min-w-0 truncate text-sm font-bold text-white">{scene.title}</p>
              <button type="button" onClick={exitExpanded} className={iconButton} aria-label="Close the 3D preview">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}

          <div
            className={cn(
              "relative w-full overflow-hidden bg-[#050409]",
              expanded ? "min-h-0 flex-1" : "aspect-[4/5] border border-white/10 sm:aspect-[16/9]",
            )}
          >
            {/* Poster — visible until the 3D scene has rendered. */}
            <div
              aria-hidden={status === "ready"}
              className={cn(
                "absolute inset-0 transition-opacity duration-500 motion-reduce:transition-none",
                status === "ready" ? "pointer-events-none opacity-0" : "opacity-100",
              )}
            >
              <Image
                src={scene.poster}
                alt={status === "ready" ? "" : scene.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30" />
            </div>

            <div
              ref={hostRef}
              tabIndex={active ? 0 : -1}
              role="group"
              aria-roledescription="3D scene"
              aria-label={scene.alt}
              aria-describedby={`${uid}-help`}
              onKeyDown={onStageKey}
              className={cn(
                "absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-event)",
                status === "ready" ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            />
            <p id={`${uid}-help`} className="sr-only">
              Drag to look around, scroll or pinch to zoom, arrow keys to move, plus and minus to zoom, 0 to reset.
              Everything in this scene is also listed below as text.
            </p>

            {status === "idle" && (
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-event)">
                    Interactive 3D · illustrative
                  </p>
                  <p className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">{scene.title}</p>
                </div>
                <button
                  ref={enterRef}
                  type="button"
                  onClick={onEnter}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-100 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Step inside in 3D
                  <span aria-hidden="true" className="ml-2">
                    →
                  </span>
                </button>
              </div>
            )}

            {status === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center" role="status">
                <span className="flex items-center gap-3 border border-white/15 bg-black/70 px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-white">
                  <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-(--color-event) motion-reduce:animate-none" />
                  Building the space…
                </span>
              </div>
            )}

            {(status === "unsupported" || status === "error") && (
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6" role="status">
                <p className="max-w-md border border-white/15 bg-black/80 p-4 text-sm text-neutral-300">
                  {status === "unsupported"
                    ? "This device can't show the 3D preview. The floor plans below show every room and stand."
                    : "The 3D preview stopped. Reload the page to try again — the floor plans below show every room and stand."}
                </p>
              </div>
            )}

            {status === "ready" && (
              <>
                <div className="absolute right-3 top-3 flex flex-col gap-2">
                  {!touchRef.current && (
                    <button
                      type="button"
                      className={iconButton}
                      onClick={() => (expanded ? exitExpanded() : setExpanded(true))}
                      aria-label={expanded ? "Exit full screen" : "Full screen"}
                    >
                      {expanded ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  )}
                  <button
                    type="button"
                    className={iconButton}
                    aria-pressed={labels}
                    aria-label="Show names"
                    onClick={() => engineRef.current?.setLabels(!labels)}
                  >
                    <Tag className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {!reducedMotion && (
                    <button
                      type="button"
                      className={iconButton}
                      aria-pressed={touring}
                      aria-label={touring ? "Stop the slow tour" : "Start a slow tour"}
                      onClick={() => {
                        engineRef.current?.setAutoRotate(!touring);
                        setTouring(!touring);
                      }}
                    >
                      {touring ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  )}
                  <button type="button" className={cn(iconButton, "hidden sm:inline-flex")} aria-label="Zoom in" onClick={() => engineRef.current?.zoom(1.25)}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className={cn(iconButton, "hidden sm:inline-flex")} aria-label="Zoom out" onClick={() => engineRef.current?.zoom(0.8)}>
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="absolute inset-x-3 bottom-3 flex flex-col gap-2 sm:inset-x-4 sm:bottom-4">
                  {target && (
                    <div className="flex max-w-md items-start justify-between gap-4 border border-(--color-event)/50 bg-black/80 p-3 backdrop-blur">
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{target.label}</p>
                        <p className="text-xs text-neutral-400">{target.detail}</p>
                        {target.href && (
                          <Link href={target.href} className="mt-1 inline-flex min-h-9 items-center text-xs text-white underline underline-offset-4">
                            Details
                            <span aria-hidden="true" className="ml-1">
                              →
                            </span>
                          </Link>
                        )}
                      </div>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                        aria-label="Clear selection"
                        onClick={() => setSelected(null)}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {scene.views.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelected(null);
                          engineRef.current?.view(v.id);
                        }}
                        className="min-h-11 shrink-0 border border-white/20 bg-black/70 px-3 font-mono text-[11px] uppercase tracking-widest text-white backdrop-blur transition-colors hover:border-white cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className={cn("mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", expanded && "m-0 border-t border-white/10 p-3")}>
            <label className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="font-mono uppercase tracking-widest">Go to</span>
              <select
                value={selected ?? ""}
                disabled={status !== "ready"}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setSelected(id);
                  if (id) engineRef.current?.focus(id);
                  else engineRef.current?.view("default");
                }}
                className="h-11 min-w-0 flex-1 rounded-none border border-white/20 bg-black px-3 text-sm text-white focus:border-white focus:outline-none disabled:opacity-50 sm:w-72 sm:flex-none"
              >
                <option value="">Start view</option>
                {scene.targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            {!expanded && (
              <p className="text-xs text-neutral-500">Illustrative, not to scale — the floor plans are the reference.</p>
            )}
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-sm text-neutral-400 leading-relaxed">{scene.caption}</p>
        <details className="guide-details mt-4">
          <summary className="flex min-h-11 items-center gap-2 text-xs text-neutral-400 hover:text-white">
            In this scene ({scene.targets.length})
            <svg aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" className="guide-chevron transition-transform">
              <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </summary>
          <ul className="mt-2 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {scene.targets.map((t) => (
              <li key={t.id} className="border-b border-white/10 py-2 text-sm">
                <span className="text-white">{t.label}</span>
                <span className="text-neutral-500"> — {t.detail}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
