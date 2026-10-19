"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { CITIES, HQ, MAP_GRID } from "@/lib/ecosystem-cities.generated";

const { cols, rows } = MAP_GRID;
const HQ_INDEX = CITIES.findIndex(([, , x, y]) => x === HQ[0] && y === HQ[1]);

/** Where the idle tour starts — recognisable hubs on every continent — before the rest of the cities. */
const OPENING = ["London", "Bengaluru", "Lagos", "Paris", "Singapore", "Nairobi", "Berlin", "New York", "Tallinn", "Amman", "Stockholm", "Tokyo", "Zurich", "São Paulo", "Tashkent", "Sydney"];

/** The cities the idle tour visits: the opening hubs, then every other city of size 2+, spread across the map. */
const TOUR = (() => {
  const index = (name: string) => CITIES.findIndex((c) => c[0] === name);
  const first = OPENING.map(index).filter((i) => i >= 0);
  const rest = CITIES.flatMap((c, i) => (c[4] >= 2 && i !== HQ_INDEX && !first.includes(i) ? [i] : []));
  // Alternate west and east so consecutive stops are far apart.
  rest.sort((a, b) => CITIES[a][2] - CITIES[b][2]);
  const spread: number[] = [];
  for (let l = 0, r = rest.length - 1; l <= r; l++, r--) spread.push(rest[l], ...(l < r ? [rest[r]] : []));
  return [...first, ...spread];
})();

const TOUR_MS = 2600;

const pct = (v: number, of: number) => `${((v + 0.5) / of) * 100}%`;

/** A gentle arc from a city to the HQ, bowed north like a flight path. */
function arc(x1: number, y1: number, x2: number, y2: number) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.18 - 1.5;
  return `M${x1 + 0.5} ${y1 + 0.5}Q${mx + 0.5} ${my + 0.5} ${x2 + 0.5} ${y2 + 0.5}`;
}

/** Nearest city to a point on the grid, within `reach` dots. */
function nearest(gx: number, gy: number, reach: number) {
  let best = -1;
  let bestD = reach * reach;
  CITIES.forEach(([, , x, y], i) => {
    const d = (x + 0.5 - gx) ** 2 + (y + 0.5 - gy) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

/**
 * Hover (or tap) a light to see the city; while nobody is pointing, the map
 * slowly tours the community's cities and draws each one's line to the HQ.
 */
export function EcosystemMapLive() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActiveIndex] = useState(-1);
  // Which way the label opens, from where the dot is on screen — on phones the
  // map is wider than its frame, so the map's own edges are not the screen's.
  const [side, setSide] = useState<"left" | "mid" | "right">("mid");
  const pointing = useRef(false);
  const tipRef = useRef<HTMLSpanElement>(null);
  const resume = useRef(0);

  // Keep the label inside the map's frame (and so on screen), however close to the edge the dot is.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    const frame = ref.current?.closest(".eco-map-frame")?.getBoundingClientRect();
    if (!tip || !frame) return;
    tip.style.marginLeft = "0px";
    const r = tip.getBoundingClientRect();
    const pad = 8;
    const shift = r.left < frame.left + pad ? frame.left + pad - r.left : r.right > frame.right - pad ? frame.right - pad - r.right : 0;
    tip.style.marginLeft = `${shift}px`;
  }, [active]);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = false;
    let k = 0;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    const tick = () => {
      if (pointing.current || !visible || document.hidden) return;
      const r = el.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      // On phones the map is wider than the screen: only visit cities in view.
      for (let n = 0; n < TOUR.length; n++) {
        const i = TOUR[k++ % TOUR.length];
        const sx = r.left + ((CITIES[i][2] + 0.5) / cols) * r.width;
        if (sx > 72 && sx < vw - 72) {
          setActive(i);
          return;
        }
      }
    };
    const first = window.setTimeout(tick, 900);
    const timer = window.setInterval(tick, TOUR_MS);
    return () => {
      window.clearTimeout(resume.current);
      window.clearTimeout(first);
      window.clearInterval(timer);
      io.disconnect();
    };
  }, []);

  const setActive = (i: number) => {
    const el = ref.current;
    const frame = el?.closest(".eco-map-frame")?.getBoundingClientRect();
    if (el && frame) {
      const r = el.getBoundingClientRect();
      const sx = r.left + ((CITIES[i][2] + 0.5) / cols) * r.width;
      setSide(sx - frame.left < 110 ? "left" : frame.right - sx < 110 ? "right" : "mid");
    }
    setActiveIndex(i);
  };

  const pick = (clientX: number, clientY: number, reach: number) => {
    const r = ref.current!.getBoundingClientRect();
    return nearest(((clientX - r.left) / r.width) * cols, ((clientY - r.top) / r.height) * rows, reach);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const i = pick(e.clientX, e.clientY, 3.2);
    pointing.current = i >= 0;
    if (i >= 0) setActive(i);
  };
  const onPointerLeave = () => {
    pointing.current = false;
  };
  // Taps (touch) — a slightly larger target, and it pauses the tour on that city.
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const i = pick(e.clientX, e.clientY, 5);
    if (i >= 0) {
      pointing.current = true;
      setActive(i);
      // Each tap restarts the pause, so an earlier tap's timer cannot hand the map back to the tour.
      window.clearTimeout(resume.current);
      resume.current = window.setTimeout(() => (pointing.current = false), TOUR_MS * 2);
    }
  };

  const city = active >= 0 ? CITIES[active] : null;
  const isHq = active === HQ_INDEX;

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
    >
      {city && !isHq && (
        <>
          <svg viewBox={`0 0 ${cols} ${rows}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {Math.hypot(city[2] - HQ[0], city[3] - HQ[1]) > 3 && (
              <path key={`a${active}`} d={arc(city[2], city[3], HQ[0], HQ[1])} pathLength={1} className="eco-arc" />
            )}
            <g transform={`translate(${city[2] + 0.5} ${city[3] + 0.5})`}>
              <circle key={`r${active}`} r="2.2" className="eco-ring" />
              <circle r="0.62" className="fill-white" />
            </g>
          </svg>
          <span
            key={`t${active}`}
            ref={tipRef}
            className="eco-tip"
            data-x={side}
            data-y={city[3] < rows * 0.42 ? "below" : "above"}
            style={{ left: pct(city[2], cols), top: pct(city[3], rows) }}
          >
            <span className="font-semibold text-white">{city[0]}</span>
            <span className="text-white/55">{city[1]}</span>
          </span>
        </>
      )}
    </div>
  );
}
