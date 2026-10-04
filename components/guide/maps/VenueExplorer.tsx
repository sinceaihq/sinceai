"use client";

import { Maximize2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getMap, getVenue, keepDots, type VenueMap } from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";
import { MapImage } from "./MapImage";
import { MapViewer } from "./MapViewer";

function tabLabel(map: VenueMap) {
  return `${getVenue(map.venue).name} · ${map.label}`;
}

/**
 * 2D Venue Explorer: floor tabs, contained preview, full-screen zoom/pan and a
 * text list of every location (the map is an enhancement, not the only way in).
 *
 * With `syncHash`, #map-<id> and #maps-<venue> select a map (deep links from
 * venue cards and other guides).
 */
export function VenueExplorer({
  mapIds,
  highlight = [],
  initialMapId,
  syncHash = false,
  label = "Venue maps",
}: {
  mapIds: readonly string[];
  highlight?: readonly string[];
  initialMapId?: string;
  syncHash?: boolean;
  label?: string;
}) {
  const mapKey = mapIds.join(",");
  const maps = useMemo(
    () =>
      mapKey
        .split(",")
        .map(getMap)
        .filter((m) => m.status !== "do_not_publish"),
    [mapKey],
  );
  const [activeId, setActiveId] = useState(initialMapId ?? maps[0]?.id);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  const active = maps.find((m) => m.id === activeId) ?? maps[0];

  useEffect(() => {
    if (!syncHash) return;
    const selectFromHash = () => {
      const hash = window.location.hash.slice(1);
      const byMap = hash.startsWith("map-") ? maps.find((m) => m.id === hash.slice(4)) : undefined;
      const byVenue = hash.startsWith("maps-") ? maps.find((m) => m.venue === hash.slice(5)) : undefined;
      const target = byMap ?? byVenue;
      if (target) {
        setActiveId(target.id);
        rootRef.current?.scrollIntoView({ block: "start" });
      }
    };
    const raf = requestAnimationFrame(selectFromHash);
    window.addEventListener("hashchange", selectFromHash);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("hashchange", selectFromHash);
    };
  }, [syncHash, maps]);

  if (!active) return null;

  const onTabKey = (e: React.KeyboardEvent, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % maps.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + maps.length) % maps.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = maps.length - 1;
    else return;
    e.preventDefault();
    setActiveId(maps[next].id);
    tabRefs.current[next]?.focus();
  };

  const highlighted = active.hotspots.filter(
    (h) => highlight.includes(h.id) || (h.refId !== undefined && highlight.includes(h.refId)),
  );
  const others = active.hotspots.filter((h) => !highlighted.includes(h));

  return (
    <div ref={rootRef} className="scroll-mt-32">
      {/* Anchors for deep links into this explorer. */}
      {maps.map((m) => (
        <span key={m.id} id={syncHash ? `map-${m.id}` : undefined} />
      ))}
      {syncHash && [...new Set(maps.map((m) => m.venue))].map((v) => <span key={v} id={`maps-${v}`} />)}

      {maps.length > 1 && (
        <div
          role="tablist"
          aria-label={label}
          className="guide-no-print -mx-6 mb-4 flex gap-1 overflow-x-auto px-6 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {maps.map((m, i) => {
            const selected = m.id === active.id;
            return (
              <button
                key={m.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                id={`${uid}-tab-${m.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`${uid}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveId(m.id)}
                onKeyDown={(e) => onTabKey(e, i)}
                className={cn(
                  "min-h-11 shrink-0 border px-3 text-[11px] font-mono uppercase tracking-widest transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  selected
                    ? "border-white bg-white text-black"
                    : "border-white/15 text-neutral-400 hover:border-white/40 hover:text-white",
                )}
              >
                {tabLabel(m)}
              </button>
            );
          })}
        </div>
      )}

      <div
        id={`${uid}-panel`}
        role={maps.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={maps.length > 1 ? `${uid}-tab-${active.id}` : undefined}
        className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      >
        <figure className="guide-avoid-break min-w-0">
          <button
            type="button"
            onClick={(e) => {
              setOpener(e.currentTarget);
              setViewerOpen(true);
            }}
            className="group relative block w-full cursor-zoom-in border border-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            aria-label={`Open ${active.title} full screen`}
          >
            <MapImage map={active} highlight={highlight} />
            {/* Below the image, so it never covers a plan's title block or date. */}
            <span className="guide-no-print flex items-center justify-end gap-2 border-t border-white/10 bg-black px-3 py-2 text-[11px] font-mono uppercase tracking-widest text-neutral-300 transition-colors group-hover:text-white">
              <Maximize2 aria-hidden="true" className="h-3.5 w-3.5" />
              Zoom
            </span>
          </button>
          <figcaption className="mt-3 text-xs text-white/55 leading-relaxed">
            <span className="text-neutral-300">{keepDots(active.title)}.</span> {active.caption}{" "}
            <span>Source: {active.source}.</span>
          </figcaption>
        </figure>

        <div className="min-w-0">
          <h3 className="text-[11px] font-mono uppercase tracking-widest text-white/55">Locations on this map</h3>
          <ul className="mt-3 border-t border-white/10">
            {[...highlighted, ...others].map((h) => {
              const isHl = highlighted.includes(h);
              return (
                <li key={h.id} className="flex items-baseline gap-3 border-b border-white/10 py-2.5 text-sm">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full border-2",
                      isHl ? "border-(--color-event) bg-(--color-event)" : "border-(--color-event)/60",
                    )}
                  />
                  <span className="min-w-0">
                    <span className={isHl ? "font-semibold text-white" : "text-neutral-200"}>{keepDots(h.label)}</span>
                    {h.description && <span className="text-white/55"> — {keepDots(h.description)}</span>}
                    {isHl && <span className="sr-only"> (highlighted)</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          {active.glossary && active.glossary.length > 0 && (
            <details className="guide-details mt-4">
              <summary className="flex min-h-11 items-center gap-2 text-xs text-neutral-400 hover:text-white">
                Finnish words on this map
                <svg
                  aria-hidden="true"
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  className="guide-chevron transition-transform"
                >
                  <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              </summary>
              <dl className="mt-2 space-y-1 text-xs">
                {active.glossary.map((g) => (
                  <div key={g.fi} className="flex flex-wrap gap-x-2">
                    <dt className="text-neutral-300">{g.fi}</dt>
                    <dd className="text-white/55">= {g.en}</dd>
                  </div>
                ))}
              </dl>
            </details>
          )}
          <p className="guide-no-print mt-4 text-xs text-white/55">
            <a href={active.srcLarge} className="underline underline-offset-4 hover:text-white">
              Open the full-resolution image
            </a>
          </p>
        </div>
      </div>

      <MapViewer
        map={active}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        highlight={highlight}
        returnFocusTo={opener}
      />
    </div>
  );
}
