"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  FileText,
  Footprints,
  Link2,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Minus,
  Moon,
  Navigation,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Route,
  Square,
  Sun,
  Sunset,
  Tag,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
} from "react";
import {
  DEFAULT_TIME,
  getPlace3D,
  getTarget3D,
  getTour3D,
  isPlaceId,
  legacyScene,
  normaliseTarget,
  placeForTarget,
  PLACES_3D,
  TARGETS_3D,
  targetsForPlace,
  TIME_PRESETS,
  TOURS_3D,
  tourFacts,
  tourForCompany,
  TWIN_CREDITS,
  type Place3D,
  type PlaceId,
  type Target3D,
  type Tour3D,
} from "@/lib/hackathon-2026/twin";
import { cn } from "@/lib/utils";
import type { TwinEngine, TwinOptions } from "./engine";
import { nightFactor, sunAtTurku } from "./engine/sky/sun";
import type { Tier } from "./engine/types";
import { PosterImage, twinHref } from "./TwinTeaser";

/**
 * Campus twin UI — the interactive 3D model of the event campus (EduCity,
 * BioCity, Joki and the streets between them).
 *
 * Contract (other code, the e2e tests and the QA scripts rely on it):
 * - The canvas host is role="group" aria-roledescription="3D scene" with the
 *   place's description as aria-label and help text via aria-describedby.
 * - Poster first: three.js loads only when someone asks for it ("Explore in
 *   3D", a target, a route or a deep link). Phones open full screen so the
 *   scene never hijacks page scrolling; closing frees the GPU.
 * - `?twin=debug` starts the engine immediately (phones too, full screen) and
 *   the engine exposes window.__twin (a minimal fallback is installed if not).
 * - Deep links: ?place ?view ?focus (also legacy ?scene and partner ids)
 *   ?time (HH:MM or a preset id) ?tour ?walk=1 ?quality=ultra|high|low.
 * - Everything in the 3D is also available as text below the canvas.
 * - Works against any TwinEngine: methods that are no-ops (or return false)
 *   degrade to text (routes as step lists, targets as cards).
 */

/**
 * idle = poster · loading · ready = the 3D runs · unsupported = no WebGL 2 · error = it stopped (load failed,
 * context lost) · text = the person chose the text version (a slow device). The last three show the same
 * places, targets and routes as text over the poster.
 */
type Status = "idle" | "loading" | "ready" | "unsupported" | "error" | "text";
type Mode = "orbit" | "walk" | "tour";
type Sheet = "routes" | "time" | null;
type TourCamera = "chase" | "first";

interface TourState {
  id: string;
  caption: string | null;
  paused: boolean;
  /** False when the engine could not animate the route — the card shows the steps as text. */
  live: boolean;
  /** Step-by-step stills (reduced motion when the route started) instead of a moving camera. */
  stills: boolean;
  /** Where "Walk me there" (or a company's route link) leads: the camera settles on it at the end. */
  arrival?: string;
}

/** What someone asked to see; applied as soon as the engine has loaded. */
export interface TwinIntent {
  place: PlaceId;
  view?: string;
  focus?: string;
  tour?: string;
  walk?: boolean;
}

/** Everything the URL can ask of the twin. */
export interface TwinParams {
  /** An explicit request to open the 3D (place, view, focus, scene, tour or walk); null when there is none. */
  intent: TwinIntent | null;
  time: string | null;
  tier?: Tier;
  debug: boolean;
}

/** The parts of the scene the controls cover, in CSS px from each edge. */
export interface SceneInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Optional engine additions this UI already speaks; an engine without them simply never calls or offers
 * them. onTime: the engine's time changed from outside the UI (window.__twin.setTime). onConnectors:
 * every way to another level within reach (a lift offers each floor). onSlow: even the low tier is far too
 * slow here (the UI offers the text version). setInsets: the scene's edges the
 * controls cover — frame views, targets and the walker on a route in the free part, keep labels out of it.
 */
interface EngineEvents {
  onTime?(iso: string): void;
  onConnectors?(list: { id: string; label: string }[]): void;
  /** Even the lowest tier stays far too slow on this device: the UI offers the text version. */
  onSlow?(): void;
}
type EngineWithExtras = TwinEngine & { setInsets?(insets: SceneInsets): void };

/* ── Pure helpers (exported for tests) ─────────────────────────────────── */

export const DEFAULT_PLACE: PlaceId = PLACES_3D[0].id;

export const viewKey = (place: PlaceId, view: string) => `${place}:${view}`;

/** First view of a place = its default ("<place>:default"). */
export const defaultView = (place: Place3D) => place.views[0]?.id ?? "default";

/** "showroom" or "joki:showroom" → that view of `place`, if it has it. */
function placeView(place: PlaceId, raw: string): string | undefined {
  const id = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
  return getPlace3D(place).views.some((v) => v.id === id) ? id : undefined;
}

/** The event Friday — the time slider covers its afternoon. */
const FRIDAY = "2026-11-06";
/** The build night (00:00–05:59 in ?time= means Saturday morning). */
const NIGHT_DATE = "2026-11-07";
export const SLIDER_MIN = 14 * 60;
export const SLIDER_MAX = 19 * 60;
const SLIDER_STEP = 5;

const pad = (n: number) => String(n).padStart(2, "0");
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * ?time= → a Turku wall-clock time ("2026-11-06T15:30"). Accepts a preset id,
 * "HH:MM" (Friday 6 Nov; 00:00–05:59 is the build night, Saturday 7 Nov) or a
 * full local time. Anything else → null.
 */
export function resolveTimeParam(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  const preset = TIME_PRESETS.find((p) => p.id === v);
  if (preset) return preset.iso;
  const hm = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (hm) {
    const h = Number(hm[1]);
    const m = Number(hm[2]);
    if (h > 23 || m > 59) return null;
    return `${h < 6 ? NIGHT_DATE : FRIDAY}T${pad(h)}:${pad(m)}`;
  }
  const iso = ISO_RE.exec(v);
  if (!iso) return null;
  const [y, mo, d, h, mi] = iso.slice(1).map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  const valid = date.getUTCMonth() === mo - 1 && date.getUTCDate() === d && h <= 23 && mi <= 59;
  return valid ? v : null;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface TimeInfo {
  /** "Fri 15:30 · sun 5°" */
  short: string;
  /** "Friday 6 November, 15:30 — the sun is 5° above the horizon" */
  long: string;
  elevation: number;
}

const weekdayOf = (y: string, mo: string, d: string) =>
  DAYS[new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getUTCDay()];

/** "2026-11-06T15:30" → "Fri 15:30". */
export function dayTime(iso: string): string {
  const m = ISO_RE.exec(iso);
  return m ? `${weekdayOf(m[1], m[2], m[3]).slice(0, 3)} ${m[4]}:${m[5]}` : iso;
}

/** Day, time and sun height for a Turku local time. */
/** Plain words for the light at a sun elevation (degrees): "daylight", "low sun", "dusk", "dark"… */
export function lightPhase(elevation: number, hour: number): string {
  const morning = hour < 12;
  if (elevation > 10) return "daylight";
  if (elevation > 2) return "low sun";
  if (elevation > -0.833) return morning ? "sunrise" : "sunset";
  if (elevation > -6) return morning ? "dawn" : "dusk";
  return "dark";
}

export function describeTime(iso: string): TimeInfo {
  const m = ISO_RE.exec(iso);
  if (!m) return { short: iso, long: iso, elevation: 0 };
  const [, y, mo, d, h, mi] = m;
  const weekday = weekdayOf(y, mo, d);
  const elevation = sunAtTurku(iso).elevation;
  const deg = Math.round(elevation);
  const abs = Math.abs(deg);
  const sun = abs === 0 ? "on the horizon" : `${abs}° ${deg < 0 ? "below" : "above"} the horizon`;
  return {
    short: `${dayTime(iso)} · ${lightPhase(elevation, Number(h))}`,
    long: `${weekday} ${Number(d)} ${MONTHS[Number(mo) - 1]}, ${h}:${mi} — the sun is ${sun}`,
    elevation,
  };
}

/** Minutes after midnight when `iso` lies on the slider's Friday afternoon, else null. */
export function sliderMinutes(iso: string): number | null {
  const m = ISO_RE.exec(iso);
  if (!m || `${m[1]}-${m[2]}-${m[3]}` !== FRIDAY) return null;
  const minutes = Number(m[4]) * 60 + Number(m[5]);
  return minutes >= SLIDER_MIN && minutes <= SLIDER_MAX ? minutes : null;
}

export const sliderIso = (minutes: number) => `${FRIDAY}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** The "Go to" list: every target, grouped. */
export const TARGET_GROUPS: readonly { label: string; targets: readonly Target3D[] }[] = (
  [
    { label: "Companies · Saturday Q&A stand (Joki)", kinds: ["company"] },
    { label: "Companies · Friday briefing room (EduCity)", kinds: ["room"] },
    { label: "Partner stands", kinds: ["stand"] },
    { label: "Entrances", kinds: ["entrance"] },
    { label: "Places", kinds: ["area", "landmark"] },
  ] as const
)
  .map((g) => ({
    label: g.label,
    targets: TARGETS_3D.filter((t) => (g.kinds as readonly string[]).includes(t.kind)),
  }))
  .filter((g) => g.targets.length > 0);

/** A "Go to" option: companies say where (their stand and their room are two options). */
export function optionText(t: Target3D): string {
  if (!t.company || !t.where) return t.label;
  const name = t.kind === "room" ? (getTarget3D(t.company)?.label ?? t.label) : t.label;
  return `${name} — ${t.where}`;
}

/** A company's other place: its Friday briefing room for its Saturday stand, and the other way round. */
export function pairedTarget(t: Target3D): Target3D | null {
  if (!t.company) return null;
  const other = getTarget3D(t.kind === "room" ? t.company : `room-${t.company}`);
  return other && other.id !== t.id ? other : null;
}

/**
 * A route as the person following it sees it: a challenge company's arrival route ends at that
 * company's own room or stand (when it leads to one of them), never at another company's room.
 */
export function routeFor(tour: Tour3D, arrival?: string | null): Tour3D {
  const company = arrival ? getTarget3D(arrival)?.company : undefined;
  return (company ? tourForCompany(tour, company) : null) ?? tour;
}

const PARTNER_RE = /partner|compan/i;
const isPartnerTour = (tour: Tour3D) => PARTNER_RE.test(`${tour.id} ${tour.audience}`);
const isPartnerTarget = (t: Target3D) =>
  t.kind === "company" || t.kind === "room" || t.kind === "stand" || PARTNER_RE.test(`${t.label} ${t.detail}`);

/**
 * The route "Walk me there" plays (the camera settles on the target after it):
 * the target's own `tour` when the data names one; else a route that ends at
 * the target; else one that ends in the target's building — routes for the
 * target's audience first (companies and partners for stands, rooms and
 * partner places; builders for the rest), routes that stop at a door last
 * (unless the target is a door), then the earliest in event order.
 */
export function tourForTarget(target: Target3D, tours: readonly Tour3D[] = TOURS_3D): Tour3D | null {
  const named = (target as Target3D & { tour?: string }).tour;
  if (named) {
    const tour = tours.find((t) => t.id === named);
    if (tour) return tour;
  }
  let best: Tour3D | null = null;
  let bestScore = 0;
  for (const tour of tours) {
    const end = getTarget3D(tour.to);
    let score: number;
    if (tour.to === target.id) score = 1000;
    else if ((end?.place ?? placeForTarget(tour.to)) === target.place) score = 100;
    else continue;
    if (isPartnerTour(tour) === isPartnerTarget(target)) score += 10;
    if (tour.to !== target.id && end?.kind === "entrance" && target.kind !== "entrance") score -= 20;
    // Strictly greater: on a tie the earlier route (event order) wins.
    if (score > bestScore) {
      best = tour;
      bestScore = score;
    }
  }
  return best;
}

/** Read the twin's URL parameters (see the contract above). */
export function readTwinParams(search: string): TwinParams {
  const params = new URLSearchParams(search);
  const rawFocus = params.get("focus")?.trim() || null;
  const focusAsPlace = rawFocus?.toLowerCase() ?? null;
  const focusIsPlace = isPlaceId(focusAsPlace);
  const normalised = rawFocus && !focusIsPlace ? normaliseTarget(rawFocus) : null;
  const focus = normalised ?? undefined;
  const scene = legacyScene(params.get("scene"));
  const viewParam = params.get("view")?.trim() || null;
  const viewPlace = viewParam?.includes(":") ? viewParam.slice(0, viewParam.indexOf(":")) : null;
  const placeParam = params.get("place");
  const tour = getTour3D(params.get("tour") ?? "");
  const walk = params.get("walk") === "1";

  // A bare view id ("showroom") names its place when only one place has that view.
  const viewOwners = viewParam && !viewPlace ? PLACES_3D.filter((p) => p.views.some((v) => v.id === viewParam)) : [];

  let place: PlaceId | null = null;
  if (isPlaceId(placeParam)) place = placeParam;
  else if (isPlaceId(viewPlace)) place = viewPlace;
  else if (viewOwners.length === 1 && viewParam !== "default") place = viewOwners[0].id;
  else if (scene) place = scene.place;
  else if (focusIsPlace) place = focusAsPlace as PlaceId;
  // A route starts in its own place; a focus next to it is where the route leads (its arrival).
  else if (tour) place = tour.place;
  else if (focus) place = placeForTarget(focus);

  const rawView = viewParam ?? scene?.view ?? null;
  const view = place && rawView ? placeView(place, rawView) : undefined;
  const q = params.get("quality");
  const debug = params.get("twin") === "debug";
  const explicit = !!(place || tour || walk);
  return {
    intent:
      explicit || debug ? { place: place ?? DEFAULT_PLACE, view, focus, tour: tour?.id, walk: walk || undefined } : null,
    time: resolveTimeParam(params.get("time")),
    tier: q === "ultra" || q === "high" || q === "low" ? q : undefined,
    debug,
  };
}

/** What the 3D is opening, for the loading panel: "Route: …" or the target's name (a plain place: nothing). */
export function describeIntent(intent: TwinIntent): string | null {
  const tour = intent.tour ? getTour3D(intent.tour) : undefined;
  const arrival = intent.focus ? getTarget3D(intent.focus) : undefined;
  if (tour) return arrival && arrival.id !== tour.to ? `Route: ${tour.label} → ${arrival.label}` : `Route: ${tour.label}`;
  const target = intent.focus ? getTarget3D(intent.focus) : undefined;
  return target ? target.label : null;
}

/**
 * What a screen reader hears when a route reaches a step: "Step 2 of 5: …" (the step number keeps two
 * steps with the same words apart). The first step also names the route.
 */
export function stepAnnouncement(tour: Tour3D, caption: string, shown: Tour3D = tour): string {
  const i = tour.steps.findIndex((s) => s.text === caption);
  if (i < 0) return caption;
  const step = `Step ${i + 1} of ${tour.steps.length}: ${shown.steps[i]?.text ?? caption}`;
  return i === 0 ? `Route: ${tour.label}. ${step}` : step;
}

/** Micro-label for a target card: what it is. */
export const KIND_LABEL: Readonly<Record<Target3D["kind"], string>> = {
  company: "Q&A stand",
  room: "Friday briefing room",
  stand: "Partner stand",
  entrance: "Entrance",
  area: "Area",
  landmark: "Landmark",
};

export { tourFacts };

/* ── Browser state as external stores (no effects needed) ──────────────── */

function mediaStore(query: string) {
  return {
    subscribe(onChange: () => void) {
      if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    get: () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia(query).matches,
    server: () => false,
  };
}
const COARSE = mediaStore("(pointer: coarse)");
/** Below the `sm` breakpoint the 3D gets the whole window, like on a phone. */
const NARROW = mediaStore("(max-width: 639px)");
/** Phones in landscape (and other short windows): the full-screen chrome shares one row. */
const SHORT = mediaStore("(max-height: 500px)");
const REDUCED = mediaStore("(prefers-reduced-motion: reduce)");
/** Layout effects only in the browser (the component also renders on the server). */
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const SEARCH = {
  subscribe: () => () => undefined,
  get: () => window.location.search,
  server: () => null,
};

/* ── Styles ────────────────────────────────────────────────────────────── */

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
const microLabel = "font-mono text-[11px] uppercase tracking-widest";
const panel = "border border-white/15 bg-black/85 backdrop-blur";
const chipBase = cn(
  "inline-flex min-h-11 shrink-0 items-center justify-center border px-3 text-center backdrop-blur transition-colors cursor-pointer",
  microLabel,
  focusRing,
);
const chipOn = "border-white bg-white text-black";
const chipOff = "border-white/20 bg-black/70 text-white hover:border-white";
const primarySmall = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-neutral-100 cursor-pointer",
  focusRing,
);
const ghostSmall = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:border-white cursor-pointer",
  focusRing,
);
/** Icon-only buttons in cards and sheets: a 44 px touch target, like every other control in the 3D. */
const quietButton = cn(
  "inline-flex h-11 w-11 shrink-0 items-center justify-center text-neutral-400 transition-colors hover:text-white cursor-pointer",
  focusRing,
);

/* ── Small parts ───────────────────────────────────────────────────────── */

function IconButton({
  label,
  pressed,
  onClick,
  children,
  className,
  ref,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "group relative inline-flex h-11 w-11 items-center justify-center border backdrop-blur transition-colors cursor-pointer",
        focusRing,
        pressed ? "border-white bg-white text-black" : "border-white/20 bg-black/70 text-white hover:border-white",
        className,
      )}
    >
      {children}
      {/* Mouse/keyboard hint; the accessible name is aria-label. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-full top-1/2 mr-2 hidden -translate-y-1/2 whitespace-nowrap border border-white/15 bg-black px-2 py-1 text-white group-hover:block group-focus-visible:block",
          microLabel,
        )}
      >
        {label}
      </span>
    </button>
  );
}

/** Fade the edges of a horizontal scroller that have more content, so the row reads as scrollable. */
function fadeEdges(el: HTMLElement) {
  const more = el.scrollWidth - el.clientWidth;
  const left = more > 1 && el.scrollLeft > 1;
  const right = more > 1 && el.scrollLeft < more - 1;
  const mask =
    left || right
      ? `linear-gradient(to right, ${left ? "transparent, #000 2rem" : "#000"}, ${right ? "#000 calc(100% - 2rem), transparent" : "#000"})`
      : "";
  el.style.maskImage = mask;
  el.style.setProperty("-webkit-mask-image", mask);
}

function ScrollRow({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  // No dependency list: the row's content changes with the place, so re-measure after every render.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => fadeEdges(el);
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  });
  return (
    <div
      ref={ref}
      className={cn("overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

function Chevron({ open }: { open?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className={cn("guide-chevron shrink-0 transition-transform", open && "rotate-180")}
    >
      <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function SunIcon({ elevation, className }: { elevation: number; className?: string }) {
  const Icon = elevation > 6 ? Sun : elevation > -6 ? Sunset : Moon;
  return <Icon aria-hidden="true" className={className} />;
}

/** Light over the slider's afternoon, from the sun model: day → twilight (event violet) → night. */
function skyTrack(): string {
  const stops: string[] = [];
  for (let m = SLIDER_MIN; m <= SLIDER_MAX; m += 10) {
    const night = nightFactor(sunAtTurku(sliderIso(m)).elevation);
    const twilight = Math.max(0, 1 - Math.abs(night - 0.45) / 0.45);
    const light = Math.round(70 - night * 58);
    const pct = (((m - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100).toFixed(1);
    stops.push(
      `color-mix(in oklab, var(--color-event) ${Math.round(twilight * 55)}%, color-mix(in oklab, var(--color-fg) ${light}%, var(--color-scene))) ${pct}%`,
    );
  }
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

const SLIDER_TICKS = ["14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

function TimePanel({
  id,
  time,
  info,
  onPick,
  onSlide,
  onClose,
}: {
  id: string;
  time: string;
  info: TimeInfo;
  onPick: (iso: string) => void;
  onSlide: (iso: string) => void;
  onClose: () => void;
}) {
  const sliderId = useId();
  const track = useMemo(() => skyTrack(), []);
  const minutes = sliderMinutes(time);
  // Off the Friday scale (Saturday/Sunday presets): the thumb is drawn hollow at the scale's start.
  const value = minutes ?? SLIDER_MIN;
  return (
    <div
      id={id}
      role="group"
      aria-label="Time of day"
      className={cn(panel, "min-h-0 w-[26rem] max-w-full overflow-y-auto overscroll-contain p-4 pt-3")}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={cn(microLabel, "text-white/55")}>Time of day</p>
        <button type="button" onClick={onClose} className={quietButton} aria-label="Close time of day">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {TIME_PRESETS.map((p) => {
          const on = time === p.iso;
          return (
            <button
              key={p.id}
              type="button"
              aria-label={p.label}
              aria-pressed={on}
              onClick={() => onPick(p.iso)}
              className={cn(
                "flex min-h-11 min-w-0 flex-col items-start justify-center border px-2.5 py-1.5 text-left transition-colors cursor-pointer",
                focusRing,
                on ? chipOn : chipOff,
              )}
            >
              <span className={cn(microLabel, "max-w-full truncate text-[10px]")}>{p.label.split(" · ")[0]}</span>
              <span className={cn("font-mono text-[10px] tabular-nums", on ? "text-black/60" : "text-white/55")}>
                {dayTime(p.iso)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <label htmlFor={sliderId} className={cn(microLabel, "text-white/55")}>
          Friday 6 Nov
        </label>
        <p aria-hidden="true" className={cn(microLabel, "tabular-nums text-white max-sm:hidden")}>
          {info.short}
        </p>
      </div>
      <input
        id={sliderId}
        type="range"
        min={SLIDER_MIN}
        max={SLIDER_MAX}
        step={SLIDER_STEP}
        value={value}
        aria-valuetext={minutes === null ? `${info.long}. Friday afternoon scale` : info.long}
        onChange={(e) => onSlide(sliderIso(Number(e.target.value)))}
        style={{ "--twin-sky": track } as CSSProperties}
        className={cn(
          "mt-1 block h-11 w-full cursor-pointer appearance-none bg-transparent",
          focusRing,
          "[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:[background:var(--twin-sky)]",
          "[&::-moz-range-track]:h-1 [&::-moz-range-track]:[background:var(--twin-sky)]",
          "[&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white",
          "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white",
          minutes === null
            ? "[&::-moz-range-thumb]:bg-black [&::-webkit-slider-thumb]:bg-black"
            : "[&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:bg-white",
        )}
      />
      <div aria-hidden="true" className="flex justify-between font-mono text-[10px] tabular-nums text-white/40">
        {SLIDER_TICKS.map((t, i) => (
          <span key={t} className={cn(i > 0 && i < SLIDER_TICKS.length - 1 && "max-sm:hidden")}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Names in TWIN_CREDITS that link to their source or licence. */
const CREDIT_LINKS: readonly (readonly [string, string])[] = [
  ["OpenStreetMap contributors", "https://www.openstreetmap.org/copyright"],
  ["CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"],
  ["ambientCG", "https://ambientcg.com/"],
  ["Poly Haven", "https://polyhaven.com/"],
];

/** The credit line from lib (single source of truth), with the credited names linked. */
function Credits({ className }: { className?: string }) {
  const parts: ReactNode[] = [];
  let rest = TWIN_CREDITS;
  for (;;) {
    let hit: { at: number; phrase: string; href: string } | null = null;
    for (const [phrase, href] of CREDIT_LINKS) {
      const at = rest.indexOf(phrase);
      if (at >= 0 && (!hit || at < hit.at)) hit = { at, phrase, href };
    }
    if (!hit) break;
    parts.push(rest.slice(0, hit.at));
    parts.push(
      <a
        key={parts.length}
        href={hit.href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-white/25 underline-offset-2 transition-colors hover:text-white hover:decoration-white"
      >
        {hit.phrase}
      </a>,
    );
    rest = rest.slice(hit.at + hit.phrase.length);
  }
  parts.push(rest);
  return <p className={cn("text-[11px] text-white/55 leading-relaxed", className)}>{parts}</p>;
}

function ConnectorIcon({ label }: { label: string }) {
  const Icon = /\bdown\b/i.test(label) ? ArrowDown : /\bup\b/i.test(label) ? ArrowUp : ArrowRight;
  return <Icon className="h-4 w-4" aria-hidden="true" />;
}

/** Said when the 3D stops (not the visible notice's words, so a screen reader does not hear them twice). */
const STOPPED_ANNOUNCEMENT = "3D stopped — showing the text version. Try again reloads it.";

const HELP_TEXT =
  "Drag to look around, right-drag or drag with two fingers to move, scroll or pinch to zoom. Keys: the arrow keys move the map, Shift + the arrow keys turn and tilt it, plus and minus zoom, 0 resets the view. In walk mode W and S or the up and down arrows walk, A and D step sideways, the left and right arrows turn, Shift runs, scrolling takes a step (Ctrl or ⌘ + scroll while the model is on the page), drag to look and Escape stops walking. Every place, stand and route in this model is also listed below as text.";

/** Walk-mode key hint (the walk controller: W/S ↑/↓ walk, A/D step sideways, ←/→ turn). */
const WALK_KEYS_HINT = "W S / ↑ ↓ walk · A D step · ← → turn";

/* ── The component ─────────────────────────────────────────────────────── */

export function Twin() {
  const uid = useId();
  const search = useSyncExternalStore(SEARCH.subscribe, SEARCH.get, SEARCH.server);
  const touch = useSyncExternalStore(COARSE.subscribe, COARSE.get, COARSE.server);
  const narrow = useSyncExternalStore(NARROW.subscribe, NARROW.get, NARROW.server);
  const short = useSyncExternalStore(SHORT.subscribe, SHORT.get, SHORT.server);
  /** Phones and narrow windows: the 3D opens as a full-window overlay with its tools in the header. */
  const compact = touch || narrow;
  const reducedMotion = useSyncExternalStore(REDUCED.subscribe, REDUCED.get, REDUCED.server);
  const urlParams = useMemo(() => (search === null ? null : readTwinParams(search)), [search]);

  // User choices override what the URL asked for (null = not chosen yet).
  const [placeChoice, setPlaceChoice] = useState<PlaceId | null>(null);
  const [timeChoice, setTimeChoice] = useState<string | null>(null);
  const placeId = placeChoice ?? urlParams?.intent?.place ?? DEFAULT_PLACE;
  const time = timeChoice ?? urlParams?.time ?? DEFAULT_TIME;
  const place = getPlace3D(placeId);

  const [viewChoice, setViewChoice] = useState<string | null>(null);
  const viewId = viewChoice && place.views.some((v) => v.id === viewChoice) ? viewChoice : defaultView(place);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  /** What the loading 3D will open (the latest request), named on the loading panel. */
  const [opening, setOpening] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  // The engine starts with the names on (views may switch them and report it through onLabels).
  const [labels, setLabels] = useState(true);
  /** What the 3D is doing while it loads: downloading its code, building the modules, lighting the first frame. */
  const [loadPhase, setLoadPhase] = useState<"code" | "build" | "light">("code");
  /** Loading takes long (a slow device or connection): offer the text version. */
  const [slowLoad, setSlowLoad] = useState(false);
  /** The running 3D is far too slow here (engine onSlow): offer the text version, once. */
  const [slowRun, setSlowRun] = useState(false);
  const [mode, setMode] = useState<Mode>("orbit");
  /** Walk mode's way to another level (a stair, a door; a lift may offer several floors). */
  const [connectors, setConnectors] = useState<readonly { id: string; label: string }[]>([]);
  const [tour, setTour] = useState<TourState | null>(null);
  const [tourCamera, setTourCamera] = useState<TourCamera>("chase");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [announcement, setAnnouncement] = useState("");
  /** A short message over the scene ("Use ⌘ + scroll to zoom", "Walk mode isn't available here"). */
  const [notice, setNotice] = useState<string | null>(null);

  const engineRef = useRef<TwinEngine | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const timeButtonRef = useRef<HTMLButtonElement>(null);
  const routesButtonRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  /** The overlay also holds the browser's Fullscreen API (desktop "Full screen" button). */
  const realFullscreenRef = useRef(false);
  const statusRef = useRef<Status>("idle");
  const modeRef = useRef<Mode>("orbit");
  const genRef = useRef(0);
  const intentRef = useRef<TwinIntent | null>(null);
  const lastIntentRef = useRef<TwinIntent | null>(null);
  const paramsRef = useRef<TwinParams | null>(null);
  const timeRef = useRef(DEFAULT_TIME);
  const tourCameraRef = useRef<TourCamera>("chase");
  const expandedRef = useRef(false);
  const tourFrame = useRef<{ id: string | null; caption: string | null; t: number }>({ id: null, caption: null, t: 0 });
  const arrivalRef = useRef<{ tourId: string; target: string } | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const barTrackRef = useRef<HTMLDivElement | null>(null);
  const timeTimer = useRef<number | null>(null);
  const pendingTime = useRef<string | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const sheetRef = useRef<HTMLElement | null>(null);
  const loadingPanelRef = useRef<HTMLDivElement>(null);
  const retryButtonRef = useRef<HTMLButtonElement>(null);
  /** The text version's notice over the poster (takes focus when the text version is chosen). */
  const textPanelRef = useRef<HTMLDivElement>(null);
  const walkButtonRef = useRef<HTMLButtonElement>(null);
  const tourCardRef = useRef<HTMLDivElement>(null);
  const targetCardRef = useRef<HTMLDivElement>(null);
  /** Keyboard focus is (or was, until its control disappeared) somewhere in the 3D. */
  const focusInsideRef = useRef(false);
  /** Where focus goes after the next render, when an action removes the control that has it. */
  const focusNextRef = useRef<(() => HTMLElement | null | undefined) | null>(null);
  /** Routes started now run as stills: the engine's reduced-motion setting (made with, or set live). */
  const stepwiseRef = useRef(false);
  /** The engine reports every connector within reach (onConnectors), not just one (onConnector). */
  const connectorListRef = useRef(false);
  /** The HUD's footprint last sent to the engine (setInsets), to send only changes. */
  const insetsRef = useRef("");
  const topLeftRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  /** Re-run a twin link to this very page (see the click listener below); updated every render. */
  const replayRef = useRef<((intent: TwinIntent, opener: HTMLElement, hash: string) => void) | null>(null);

  /** The running route is a series of stills (reduced motion when it started). */
  const stepwise = tour?.stills ?? false;
  /** No 3D here (no WebGL 2, it stopped, or the text version was chosen): the same content as text over the poster. */
  const textMode = status === "unsupported" || status === "error" || status === "text";
  const shortOverlay = expanded && short;
  const timeInfo = useMemo(() => describeTime(time), [time]);
  const target = selected ? (getTarget3D(selected) ?? null) : null;
  const activeTour = tour ? (getTour3D(tour.id) ?? null) : null;
  /** The route as its card shows it: a company's route ends at that company's own room or stand. */
  const shownTour = activeTour ? routeFor(activeTour, tour?.arrival) : null;
  const route = target ? tourForTarget(target) : null;
  const placeTargets = targetsForPlace(placeId);
  // A deep-linked route (and where it leads), named on the poster while the 3D waits for a tap.
  const introTour =
    status === "idle" && !placeChoice && urlParams?.intent?.tour ? (getTour3D(urlParams.intent.tour) ?? null) : null;
  // A deep link's target, named the same way.
  const introTarget =
    status === "idle" && !placeChoice && !introTour && urlParams?.intent?.focus
      ? (getTarget3D(urlParams.intent.focus) ?? null)
      : null;

  useEffect(() => {
    paramsRef.current = urlParams;
    timeRef.current = time;
    tourCameraRef.current = tourCamera;
    expandedRef.current = expanded;
  }, [urlParams, time, tourCamera, expanded]);

  const setStatusNow = useCallback((next: Status) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  /** Mode in state (for rendering) and in a ref (for engine callbacks and handlers). */
  const setModeNow = useCallback((next: Mode) => {
    modeRef.current = next;
    setMode(next);
  }, []);

  const debugLog = useCallback((err: unknown) => {
    if (paramsRef.current?.debug) console.error("[twin]", err);
  }, []);

  /** Call into the engine without letting a failing method break the UI. */
  const call = useCallback(
    <T,>(fn: (engine: TwinEngine) => T): T | undefined => {
      const engine = engineRef.current;
      if (!engine) return undefined;
      try {
        return fn(engine);
      } catch (err) {
        debugLog(err);
        return undefined;
      }
    },
    [debugLog],
  );

  /** Show a view of a place; a view the engine cannot show (yet) falls back to the place's default view. */
  const gotoView = useCallback(
    (place: PlaceId, view: string, animate: boolean) =>
      call((e) => e.goto(viewKey(place, view), animate)) === true ||
      call((e) => e.goto(viewKey(place, defaultView(getPlace3D(place))), animate)) === true,
    [call],
  );

  const flashNotice = useCallback((text: string, ms = 1400) => {
    setNotice(text);
    if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), ms);
  }, []);

  const paintTour = useCallback((t: number) => {
    const clamped = Math.min(1, Math.max(0, t));
    if (barRef.current) barRef.current.style.transform = `scaleX(${clamped})`;
    barTrackRef.current?.setAttribute("aria-valuenow", String(Math.round(clamped * 100)));
  }, []);

  /** Back to the plain orbit camera: ends walk mode and any route. */
  const leaveModes = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const touring = !!tourFrame.current.id || modeRef.current === "tour";
    // A route someone leaves is not an arrival, however close to its end: forget it before the
    // engine reports the end (onTour(null) then has nothing to settle on).
    tourFrame.current = { id: null, caption: null, t: 0 };
    arrivalRef.current = null;
    if (touring) call((e) => e.tour(null));
    if (modeRef.current === "walk") call((e) => e.walk(false));
    setTour(null);
    setModeNow("orbit");
    setConnectors([]);
  }, [call, setModeNow]);

  /** Start a route; `arrival` = the target the camera settles on when it ends. */
  const runTour = useCallback(
    (id: string, arrival?: string) => {
      const t = getTour3D(id);
      if (!t) return;
      if (modeRef.current === "walk") call((e) => e.walk(false));
      // Replacing (or restarting) a route is not an arrival either: the engine ends the previous
      // run (onTour(null)) before this one starts.
      tourFrame.current = { id: null, caption: null, t: 0 };
      arrivalRef.current = null;
      paintTour(0);
      const ok = call((e) => e.tour(id, tourCameraRef.current)) === true;
      if (ok) {
        if (tourFrame.current.id !== id) tourFrame.current = { id, caption: null, t: 0 };
        arrivalRef.current = arrival ? { tourId: id, target: arrival } : null;
      } else {
        // No animated route here: show the destination and the steps as text.
        const dest = arrival ?? t.to;
        if (!call((e) => e.focus(dest, true))) {
          call((e) => e.goto(viewKey(t.place, defaultView(getPlace3D(t.place))), true));
        }
      }
      // Keep a caption the engine may already have reported for this run; a (re)start is never paused.
      const caption = ok && tourFrame.current.id === id ? tourFrame.current.caption : null;
      setTour({ id, caption, paused: false, live: ok, stills: ok && stepwiseRef.current, arrival });
      setModeNow(ok ? "tour" : "orbit");
      setConnectors([]);
      setSelected(null);
      setSheet(null);
      setPlaceChoice(t.place);
      // The steps are announced as the route reaches them (onTour); stills wait for "Next step".
      setAnnouncement(
        `Route: ${t.label}. ${ok ? (stepwiseRef.current ? "Press Next step to go through it." : "Playing.") : "Follow the steps."}`,
      );
    },
    [call, paintTour, setModeNow],
  );

  /** Show the place, view or target an intent asks for (not its route or walk). */
  const applyScene = useCallback(
    (intent: TwinIntent, animate: boolean) => {
      const p = getPlace3D(intent.place);
      const view = intent.view ?? defaultView(p);
      setPlaceChoice(intent.place);
      setViewChoice(view);
      // With a route, the focus is where it leads: the route shows it at the end.
      if (intent.focus && !intent.tour) {
        if (!call((e) => e.focus(intent.focus!, animate))) gotoView(intent.place, view, animate);
        setSelected(getTarget3D(intent.focus) ? intent.focus : null);
      } else {
        setSelected(null);
        gotoView(intent.place, view, animate);
      }
    },
    [call, gotoView],
  );

  /** Start the route or the walk an intent asks for. */
  const applyMotion = useCallback(
    (intent: TwinIntent) => {
      if (intent.tour) runTour(intent.tour, intent.focus);
      // Walk mode is on only when the engine says so (onMode); it may not be available.
      else if (intent.walk) {
        const view = intent.view ?? defaultView(getPlace3D(intent.place));
        call((e) => e.walk(true, intent.focus ?? viewKey(intent.place, view)));
      }
    },
    [call, runTour],
  );

  const applyIntent = useCallback(
    (intent: TwinIntent, animate: boolean) => {
      leaveModes();
      applyScene(intent, animate);
      applyMotion(intent);
    },
    [applyMotion, applyScene, leaveModes],
  );

  const teardown = useCallback(() => {
    genRef.current += 1;
    const engine = engineRef.current;
    engineRef.current = null;
    try {
      engine?.dispose();
    } catch {
      // Already gone (context lost) — nothing left to free.
    }
    // A request that never got applied must not come back on the next start.
    intentRef.current = null;
    tourFrame.current = { id: null, caption: null, t: 0 };
    arrivalRef.current = null;
    // A device without WebGL 2 stays one: the poster keeps saying so instead of offering the 3D again.
    setStatusNow(statusRef.current === "unsupported" ? "unsupported" : "idle");
    setProgress(null);
    setOpening(null);
    setModeNow("orbit");
    setTour(null);
    setConnectors([]);
    setLabels(true);
    setLoadPhase("code");
    setSlowLoad(false);
    setSlowRun(false);
    setSheet(null);
  }, [setModeNow, setStatusNow]);

  /**
   * No WebGL 2 on this device: the text version, opened on what was asked for — a deep link's route
   * (its steps as text, ending at the company's own room or stand) or target (its card), named at once.
   */
  const showWithoutWebGL = useCallback(
    (intent: TwinIntent | null, fromLink = false) => {
      intentRef.current = null;
      setStatusNow("unsupported");
      // A link opened the page: bring its directions (the card over the poster) into view.
      if (fromLink && (intent?.tour || intent?.focus)) {
        requestAnimationFrame(() =>
          stageRef.current?.scrollIntoView?.({ block: "start", behavior: REDUCED.get() ? "auto" : "smooth" }),
        );
      }
      const route = intent?.tour ? getTour3D(intent.tour) : undefined;
      const target = !route && intent?.focus ? getTarget3D(intent.focus) : undefined;
      if (intent) setPlaceChoice(intent.place);
      if (route) runTour(route.id, intent?.focus);
      else if (target) {
        setSelected(target.id);
        setPlaceChoice(target.place);
      }
      // Not the visible notice's words (a screen reader would read the same sentence twice).
      setAnnouncement(
        route
          ? `No 3D on this device, so here is the route as text. Route: ${routeFor(route, intent?.focus).label}.`
          : target
            ? `No 3D on this device, so here it is as text: ${target.label} — ${target.detail}.`
            : "No 3D on this device: showing the text version.",
      );
    },
    [runTour, setStatusNow],
  );

  /**
   * Start the engine, or apply the intent right away when it runs. While it loads, the latest
   * request waits and is applied once the scene shows.
   */
  const begin = useCallback(
    async (intent: TwinIntent) => {
      const status = statusRef.current;
      if (status === "unsupported") return;
      if (engineRef.current && status === "ready") {
        intentRef.current = null;
        applyIntent(intent, true);
        return;
      }
      // "Try again" (after an error) replays the latest request.
      lastIntentRef.current = intent;
      if (status === "error") return;
      intentRef.current = intent;
      setOpening(describeIntent(intent));
      if (status === "loading" || engineRef.current) return;
      const host = hostRef.current;
      if (!host) return;
      const gen = ++genRef.current;
      setStatusNow("loading");
      setProgress(null);
      setLoadPhase("code");
      setSlowLoad(false);
      setAnnouncement("Loading the 3D model…");
      let markReady: () => void = () => undefined;
      const readyForDebug = new Promise<void>((resolve) => (markReady = resolve));
      /** Callbacks of an engine that has since been replaced or disposed change nothing. */
      const live =
        <A extends unknown[]>(fn: (...args: A) => void) =>
        (...args: A) => {
          if (gen === genRef.current) fn(...args);
        };
      try {
        const mod = await import("./engine");
        if (gen !== genRef.current) return;
        if (!mod.isWebGL2Available()) {
          showWithoutWebGL(intentRef.current ?? intent, !!paramsRef.current?.intent && intent === paramsRef.current.intent);
          return;
        }
        const params = paramsRef.current;
        const reduced = REDUCED.get();
        connectorListRef.current = false;
        const options: TwinOptions & EngineEvents = {
          tier: params?.tier,
          reducedMotion: reduced,
          time: timeRef.current,
          onTime: live((iso) => {
            // The engine's time changed from elsewhere (window.__twin.setTime): the time chip follows.
            const next = iso.slice(0, 16);
            if (next === timeRef.current) return;
            timeRef.current = next;
            setTimeChoice(next);
          }),
          onSelect: live((raw) => {
            const id = raw ? (normaliseTarget(raw) ?? raw) : null;
            const t = id ? getTarget3D(id) : undefined;
            setSelected(t ? t.id : null);
            if (t) {
              setPlaceChoice(t.place);
              setAnnouncement(`${t.label} — ${t.detail}`);
            }
          }),
          onPlace: live((p) => setPlaceChoice(p)),
          onMode: live((m) => {
            setModeNow(m);
            if (m !== "walk") setConnectors([]);
          }),
          onTour: live((s) => {
            const f = tourFrame.current;
            if (s) {
              f.t = s.t;
              paintTour(s.t);
              if (f.id !== s.id || f.caption !== s.caption) {
                const newCaption = s.caption !== null && (f.id !== s.id || f.caption !== s.caption);
                f.id = s.id;
                f.caption = s.caption;
                const same = (prev: TourState | null): prev is TourState => prev?.id === s.id;
                const arrival = arrivalRef.current?.tourId === s.id ? arrivalRef.current.target : undefined;
                setTour((prev) => ({
                  id: s.id,
                  caption: s.caption,
                  paused: same(prev) ? prev.paused : false,
                  live: true,
                  stills: same(prev) ? prev.stills : stepwiseRef.current,
                  arrival: same(prev) ? prev.arrival : arrival,
                }));
                setModeNow("tour");
                // Each step is announced once, with its number (the card shows it as plain text).
                const t = getTour3D(s.id);
                if (newCaption && s.caption)
                  setAnnouncement(t ? stepAnnouncement(t, s.caption, routeFor(t, arrival)) : s.caption);
              }
              return;
            }
            // The route ended: finished, stopped, or replaced by another one.
            const endedId = f.id;
            const finished = f.t >= 0.98;
            tourFrame.current = { id: null, caption: null, t: 0 };
            if (!endedId) return;
            setTour((prev) => (prev?.id === endedId ? null : prev));
            if (modeRef.current === "tour") setModeNow("orbit");
            const arrival = arrivalRef.current;
            if (arrival?.tourId === endedId) arrivalRef.current = null;
            if (!finished) return;
            // Settle on where the route leads: the "Walk me there" target, else the route's end.
            const dest = getTarget3D(arrival?.tourId === endedId ? arrival.target : (getTour3D(endedId)?.to ?? ""));
            if (dest) {
              setSelected(dest.id);
              setPlaceChoice(dest.place);
              setAnnouncement(`You have arrived: ${dest.label}.`);
              // Keyboard focus on the route card follows the route to the destination's card.
              if (tourCardRef.current?.contains(document.activeElement)) {
                focusNextRef.current = () => targetCardRef.current;
              }
              // The engine reports the end before it is back in orbit mode, where the camera can
              // fly: settle on the destination right after (unless something else started).
              queueMicrotask(() => {
                if (gen !== genRef.current || tourFrame.current.id || modeRef.current !== "orbit") return;
                call((e) => e.focus(dest.id, true));
              });
            } else {
              setAnnouncement("Route finished.");
            }
          }),
          onConnector: live((c) => {
            // An engine that reports the whole list (onConnectors) has the final word.
            if (connectorListRef.current) return;
            setConnectors(c ? [c] : []);
            if (c) setAnnouncement(`${c.label} — button available.`);
          }),
          onConnectors: live((list) => {
            connectorListRef.current = true;
            setConnectors(list);
            if (list.length) setAnnouncement(`${list.map((c) => c.label).join(", ")} — ${list.length > 1 ? "buttons" : "button"} available.`);
          }),
          onLabels: live((on) => setLabels(on)),
          onSlow: live(() => {
            setSlowRun(true);
            setAnnouncement("The 3D model runs slowly on this device. The text version shows the same rooms, stands and routes.");
          }),
          onProgress: live((p) => {
            setLoadPhase((phase) => (phase === "code" ? "build" : phase));
            setProgress({ loaded: p.loaded, total: p.total });
          }),
          onContextLost: live(() => {
            setStatusNow("error");
            setAnnouncement(
              STOPPED_ANNOUNCEMENT,
            );
          }),
        };
        const engine = mod.createTwinEngine(host, options);
        engineRef.current = engine;
        stepwiseRef.current = reduced;
        setLoadPhase("build");
        /** The WebGL context was lost while loading: stay in the error state ("Try again"). */
        const lost = () => statusRef.current === "error";
        await engine.load();
        if (gen !== genRef.current) return;
        if (lost()) {
          markReady();
          return;
        }
        setLoadPhase("light");
        if (params?.debug) {
          const w = window as unknown as { __twin?: Record<string, unknown> };
          w.__twin ??= {
            ready: () => readyForDebug,
            stats: () => ({}),
            errors: () => [],
            camera: () => null,
            setCamera: () => undefined,
            goto: (key: string) => engine.goto(key, false),
            focus: (id: string) => engine.focus(id, false),
            setTime: (iso: string) => engine.setTime(iso),
            setLabels: (on: boolean) => engine.setLabels(on),
          };
        }
        const pending = intentRef.current ?? intent;
        intentRef.current = null;
        // The place, view and target now, so the poster fades into them; a route or walk starts
        // once the scene shows (not behind the loading panel).
        applyScene(pending, false);
        let timer = 0;
        await Promise.race([
          engine.whenReady(),
          new Promise<void>((resolve) => (timer = window.setTimeout(resolve, 8000))),
        ]).finally(() => window.clearTimeout(timer));
        if (gen !== genRef.current) return;
        if (lost()) {
          markReady();
          return;
        }
        setStatusNow("ready");
        setOpening(null);
        // From here on "Try again" rebuilds what the 3D shows.
        lastIntentRef.current = null;
        markReady();
        // A request made while the textures loaded (a tab, Go to, a route) is the latest: it wins.
        const late = intentRef.current;
        intentRef.current = null;
        const now = late ?? pending;
        const focus = now.focus ? getTarget3D(now.focus) : undefined;
        setAnnouncement(focus ? `The 3D model is ready: ${focus.label} — ${focus.detail}` : "The 3D model is ready.");
        if (late) applyIntent(late, true);
        else applyMotion(pending);
      } catch (err) {
        if (gen !== genRef.current) return;
        debugLog(err);
        teardown();
        setStatusNow("error");
        setAnnouncement(
          STOPPED_ANNOUNCEMENT,
        );
        markReady();
      }
    },
    [applyIntent, applyMotion, applyScene, call, debugLog, paintTour, setModeNow, setStatusNow, showWithoutWebGL, teardown],
  );

  /* ── Full screen ── */

  /** Open the full-window overlay; `real` also asks the browser for full screen (desktop button). */
  const openExpanded = useCallback((opener: HTMLElement | null, real = false) => {
    returnFocusRef.current = opener ?? (document.activeElement as HTMLElement | null);
    setExpanded(true);
    const stage = stageRef.current;
    if (real && stage?.requestFullscreen && document.fullscreenEnabled) {
      realFullscreenRef.current = true;
      stage.requestFullscreen({ navigationUI: "hide" }).catch(() => {
        realFullscreenRef.current = false;
      });
    }
  }, []);

  /**
   * Close the overlay (and the browser's full screen) and give focus back to what opened it — or,
   * with `after`, run that instead once the page is back (scrolled and sized as before).
   */
  const exitExpanded = useCallback(
    (after?: () => void) => {
      const real = !!document.fullscreenElement;
      realFullscreenRef.current = false;
      if (real) document.exitFullscreen().catch(() => undefined);
      setExpanded(false);
      setSheet(null);
      if (compact) teardown(); // Phones and narrow windows: free the GPU when the overlay closes.
      const back = returnFocusRef.current;
      returnFocusRef.current = null;
      const finish = () =>
        requestAnimationFrame(() => {
          if (after) after();
          else (back?.isConnected ? back : startButtonRef.current)?.focus({ preventScroll: true });
        });
      if (!(real && after)) {
        finish();
        return;
      }
      // Leaving the browser's full screen is asynchronous: carry on when the page has its size back.
      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        document.removeEventListener("fullscreenchange", go);
        finish();
      };
      document.addEventListener("fullscreenchange", go);
      window.setTimeout(go, 600);
    },
    [compact, teardown],
  );

  /** The control that should have focus when focus in the 3D has nowhere to go. */
  const rescueFocus = useCallback(() => {
    const s = statusRef.current;
    const el =
      s === "ready"
        ? hostRef.current
        : s === "loading"
          ? loadingPanelRef.current
          : s === "error"
            ? retryButtonRef.current
            : s === "idle"
              ? startButtonRef.current
              : textPanelRef.current;
    (el ?? stageRef.current)?.focus({ preventScroll: true });
  }, []);

  // Leaving the browser's full screen (Esc, F11) also leaves the overlay, and focus goes back.
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement && realFullscreenRef.current && expandedRef.current) {
        realFullscreenRef.current = false;
        setExpanded(false);
        setSheet(null);
        const back = returnFocusRef.current;
        returnFocusRef.current = null;
        requestAnimationFrame(() => {
          if (back?.isConnected) back.focus({ preventScroll: true });
          else if (focusInsideRef.current) rescueFocus();
        });
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [rescueFocus]);

  // Overlay: lock page scroll, move focus in (and keep it in: it is a modal dialog), keep the canvas sized.
  useEffect(() => {
    if (!expanded) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => {
      engineRef.current?.resize();
      if (statusRef.current === "ready") hostRef.current?.focus({ preventScroll: true });
      else (loadingPanelRef.current ?? stageRef.current)?.focus({ preventScroll: true });
    });
    // Focus that lands outside the dialog (Safari's Tab from the page top, a script) comes back in.
    const onFocusIn = (e: FocusEvent) => {
      const stage = stageRef.current;
      if (stage && e.target instanceof Node && !stage.contains(e.target)) rescueFocus();
    };
    document.addEventListener("focusin", onFocusIn);
    return () => {
      html.style.overflow = prev;
      cancelAnimationFrame(raf);
      document.removeEventListener("focusin", onFocusIn);
      requestAnimationFrame(() => engineRef.current?.resize());
    };
  }, [expanded, rescueFocus]);

  // When an action removed the control that had focus (a card's Close, "Walk me there", Stop…),
  // move focus where the action asked, else to the scene (or the panel showing instead of it):
  // never to <body>, where screen readers lose their place and the dialog's keys stop working.
  // Focus only moves if it was in the 3D, so a deep link that starts the 3D by itself never takes it.
  useBrowserLayoutEffect(() => {
    const want = focusNextRef.current;
    focusNextRef.current = null;
    const active = document.activeElement;
    const lost = !active || active === document.body;
    if (want && (lost || stageRef.current?.contains(active))) {
      const el = want();
      if (el?.isConnected) {
        if (el !== active) el.focus({ preventScroll: true });
        return;
      }
    }
    if (lost && focusInsideRef.current) rescueFocus();
  });

  /** Focus entered the 3D. */
  const onStageFocus = () => {
    focusInsideRef.current = true;
  };

  /** Focus left the 3D — unless its control was just removed (the effect above puts it back). */
  const onStageBlur = (e: ReactFocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget;
    if (next instanceof Node && stageRef.current?.contains(next)) return;
    if (next) {
      focusInsideRef.current = false;
      return;
    }
    // Focus is going nowhere: a removed control (still tracked), or a click outside or another
    // window (the control is still there — focus really left).
    const from = e.target;
    queueMicrotask(() => {
      if (from.isConnected && document.activeElement !== from) focusInsideRef.current = false;
    });
  };

  // Inline on the page, a plain mouse wheel scrolls the page instead of zooming the scene (no scroll
  // hijacking); Ctrl/⌘ + wheel and trackpad pinch zoom. Full screen passes every wheel to the scene.
  useEffect(() => {
    const host = hostRef.current;
    if (status !== "ready" || !host) return;
    const mac = /Mac|iPhone|iPad/.test(navigator.platform);
    const onWheel = (e: WheelEvent) => {
      if (expandedRef.current || e.ctrlKey || e.metaKey) return;
      e.stopImmediatePropagation();
      // In walk mode the wheel takes a step instead of zooming.
      const action = modeRef.current === "walk" ? "take a step" : "zoom the 3D";
      flashNotice(mac ? `Use ⌘ + scroll to ${action}` : `Use Ctrl + scroll to ${action}`);
    };
    host.addEventListener("wheel", onWheel, { capture: true, passive: true });
    return () => host.removeEventListener("wheel", onWheel, { capture: true });
  }, [status, flashNotice]);

  // The routes sheet sits before the dock in the tab order: take focus to its first route when it opens.
  useEffect(() => {
    if (sheet !== "routes") return;
    const raf = requestAnimationFrame(() =>
      sheetRef.current?.querySelector<HTMLElement>("ul button")?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(raf);
  }, [sheet]);

  // Deep links are an explicit intent: open the 3D (phones wait for a tap, which opens full screen).
  useEffect(() => {
    const intent = urlParams?.intent;
    const debug = urlParams?.debug ?? false;
    if (!intent) return;
    intentRef.current = intent;
    let cancelled = false;
    const raf = requestAnimationFrame(() => {
      const small = COARSE.get() || NARROW.get();
      if (small && !debug) {
        // Phones wait for a tap — unless they cannot run the 3D at all: then the text version opens on the
        // link's route or target straight away (a partner's "Walk it in 3D" still lands on the directions).
        import("./engine")
          .then((mod) => {
            if (!cancelled && statusRef.current === "idle" && !mod.isWebGL2Available()) showWithoutWebGL(intent, true);
          })
          .catch(() => undefined);
        return;
      }
      if (small) {
        returnFocusRef.current = null;
        setExpanded(true);
      }
      void begin(intent);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [urlParams, begin, showWithoutWebGL]);

  // A link to this very page with the 3D's parameters ("Walk the route in 3D" further down) leaves
  // the URL as it is, so the deep link above does not run again: ask the 3D directly.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      // Only links that name the 3D's parameters ("#preview-3d" alone just scrolls).
      if (!a.getAttribute("href")?.includes("?") || stageRef.current?.contains(a)) return;
      const url = new URL(a.href, window.location.href);
      const here = window.location;
      if (url.origin !== here.origin || url.pathname !== here.pathname || url.search !== here.search) return;
      const intent = readTwinParams(url.search).intent;
      if (intent) replayRef.current?.(intent, a, url.hash);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // Unmount: dispose the engine and pending timers.
  useEffect(
    () => () => {
      genRef.current += 1;
      try {
        engineRef.current?.dispose();
      } catch {
        // Nothing left to free.
      }
      engineRef.current = null;
      if (timeTimer.current !== null) window.clearTimeout(timeTimer.current);
      if (noticeTimer.current !== null) window.clearTimeout(noticeTimer.current);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    },
    [],
  );

  // The device's Reduce Motion setting changed while the 3D runs: tell the engine (camera moves, ambient
  // animation). Routes started from now on follow it; a running route keeps how it started.
  useEffect(() => {
    const engine = engineRef.current;
    if (status !== "ready" || !engine?.setReducedMotion || stepwiseRef.current === reducedMotion) return;
    try {
      engine.setReducedMotion(reducedMotion);
      stepwiseRef.current = reducedMotion;
    } catch (err) {
      debugLog(err);
    }
  }, [status, reducedMotion, debugLog]);

  // Loading for long (a slow device or connection): offer the text version instead of a long wait.
  useEffect(() => {
    if (status !== "loading") return;
    const timer = window.setTimeout(() => setSlowLoad(true), 20_000);
    return () => window.clearTimeout(timer);
  }, [status]);

  // Tell the engine which edges of the scene the controls cover (optional engine API), so it frames
  // views, targets and the walker on a route in the free part and keeps labels out from under them.
  // Measured after every render (cards and chips come and go) and when anything changes size.
  useEffect(() => {
    if (status !== "ready") {
      insetsRef.current = "";
      return;
    }
    const send = () => {
      const engine = engineRef.current as EngineWithExtras | null;
      const box = hostRef.current?.getBoundingClientRect();
      if (!engine?.setInsets || !box || box.width === 0) return;
      const edge = (el: Element | null | undefined) => el?.getBoundingClientRect();
      const topRow = edge(topLeftRef.current?.firstElementChild);
      const tools = edge(toolsRef.current);
      const stackTop = Math.min(
        box.bottom,
        ...Array.from(stackRef.current?.children ?? [])
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.height > 0)
          .map((r) => r.top),
      );
      const insets: SceneInsets = {
        top: topRow ? Math.max(0, Math.round(topRow.bottom - box.top)) : 0,
        right: tools && tools.height > 0 ? Math.max(0, Math.round(box.right - tools.left)) : 0,
        bottom: Math.max(0, Math.round(box.bottom - stackTop)),
        left: 0,
      };
      const key = JSON.stringify(insets);
      if (key === insetsRef.current) return;
      insetsRef.current = key;
      call((e) => (e as EngineWithExtras).setInsets?.(insets));
    };
    send();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(send);
    for (const el of [hostRef.current, topLeftRef.current, toolsRef.current, stackRef.current]) if (el) ro.observe(el);
    return () => ro.disconnect();
  });

  /* ── Actions ── */

  const ready = status === "ready";

  /** Use the 3D for `intent`: start it if needed (phones open full screen). */
  const show = useCallback(
    (intent: TwinIntent, opener?: HTMLElement | null) => {
      // No WebGL 2 here, or the text version was chosen: the cards and lists are the 3D's text version —
      // no overlay, no second try.
      if (statusRef.current === "unsupported" || statusRef.current === "text") return;
      if (!engineRef.current && compact && !expandedRef.current) openExpanded(opener ?? null);
      void begin(intent);
    },
    [begin, compact, openExpanded],
  );

  /** On the page (not full screen), scroll the 3D into view when a control below it was used. */
  const bringIntoView = (opener?: HTMLElement | null) => {
    if (compact || expanded || !opener || stageRef.current?.contains(opener)) return;
    stageRef.current?.scrollIntoView?.({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  };

  const onExplore = () => {
    const intent = intentRef.current ?? { place: placeId, view: viewId, focus: selected ?? undefined };
    // The button gives way to the loading panel: keyboard focus goes there, then to the scene.
    focusNextRef.current = () => loadingPanelRef.current;
    if (compact) openExpanded(startButtonRef.current);
    // Desktop: bring the whole stage into view, clear of the sticky header (scroll-margin on [id]).
    else panelRef.current?.scrollIntoView?.({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
    void begin(intent);
  };

  const choosePlace = (p: PlaceId) => {
    const next = getPlace3D(p);
    setPlaceChoice(p);
    setViewChoice(defaultView(next));
    setSelected(null);
    setSheet(null);
    if (statusRef.current === "loading") {
      // Shown when the scene is ready (see begin), even while the engine code still downloads.
      intentRef.current = { place: p };
      lastIntentRef.current = { place: p };
      setOpening(null);
      return;
    }
    if (!engineRef.current || statusRef.current !== "ready") {
      intentRef.current = null; // the poster follows the tabs; Explore opens this place
      return;
    }
    leaveModes();
    call((e) => e.goto(viewKey(p, defaultView(next)), true));
  };

  const onTabKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % PLACES_3D.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + PLACES_3D.length) % PLACES_3D.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = PLACES_3D.length - 1;
    else return;
    e.preventDefault();
    choosePlace(PLACES_3D[next].id);
    tabRefs.current[next]?.focus();
  };

  const chooseView = (v: string) => {
    setViewChoice(v);
    setSelected(null);
    setSheet(null);
    leaveModes();
    gotoView(placeId, v, true);
  };

  /** No 3D (no WebGL 2, it stopped, or the text version): cards and routes show as text over the poster. */
  const inTextMode = () => ["unsupported", "error", "text"].includes(statusRef.current);

  const chooseTarget = (id: string, opener?: HTMLElement | null) => {
    const t = getTarget3D(id);
    if (!t) return;
    setSheet(null);
    setPlaceChoice(t.place);
    setViewChoice(defaultView(getPlace3D(t.place)));
    setSelected(id);
    setAnnouncement(`${t.label} — ${t.detail}`);
    if (inTextMode()) {
      // The card over the poster is the answer (a route card it replaces goes).
      setTour(null);
      bringIntoView(opener);
      return;
    }
    if (!engineRef.current || statusRef.current !== "ready") {
      show({ place: t.place, focus: id }, opener);
      return;
    }
    leaveModes();
    if (!call((e) => e.focus(id, true))) call((e) => e.goto(viewKey(t.place, defaultView(getPlace3D(t.place))), true));
  };

  const clearTarget = () => {
    setSelected(null);
    leaveModes();
    gotoView(placeId, viewId, true);
  };

  /** From the text list below the canvas: bring the 3D into view, then fly there. */
  const showFromList = (id: string, opener: HTMLElement) => {
    bringIntoView(opener);
    chooseTarget(id, opener);
  };

  const playTour = (id: string, opener?: HTMLElement | null, arrival?: string) => {
    const t = getTour3D(id);
    if (!t) return;
    setSheet(null);
    // Also when the 3D still has to start: the loading panel shows where the route will play.
    bringIntoView(opener);
    if (inTextMode()) {
      runTour(id, arrival); // the steps as text
      return;
    }
    if (!engineRef.current || statusRef.current !== "ready") {
      show({ place: t.place, tour: id }, opener);
      return;
    }
    runTour(id, arrival);
  };

  /** The route card's main control: "Next step" for stills, else Pause (Stop for a text-only route). */
  const routeControl = () => tourCardRef.current?.querySelector<HTMLElement>("[data-primary]");

  /** Send someone straight to a target: the share sheet on phones, otherwise copy the link. */
  const shareTarget = async (t: Target3D) => {
    const url = new URL(twinHref({ focus: t.id }), window.location.origin).toString();
    if (touch && navigator.share) {
      try {
        await navigator.share({ title: `${t.label} · Since AI Hackathon 2026`, url });
        return;
      } catch (err) {
        // Dismissed: nothing to copy, nothing to ask. Otherwise (not allowed, no share target) copy instead.
        if ((err as { name?: string } | null)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      flashNotice("Link copied");
      setAnnouncement(`Link to ${t.label} copied.`);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  const walkMeThere = (t: Target3D) => {
    const r = tourForTarget(t);
    if (!r) return;
    focusNextRef.current = routeControl; // the card gives way to the route card
    runTour(r.id, t.id);
  };

  const closeTarget = () => {
    focusNextRef.current = () => hostRef.current;
    setSelected(null);
  };

  const togglePause = () => {
    if (!tour) return;
    const next = !tour.paused;
    call((e) => e.pauseTour(next));
    setTour({ ...tour, paused: next });
  };

  const nextStep = () => call((e) => e.pauseTour(false));

  /** Stop the route; focus goes to `refocus` (default: the scene) when the Stop button disappears. */
  const stopTour = (refocus: () => HTMLElement | null | undefined = () => hostRef.current) => {
    focusNextRef.current = refocus;
    leaveModes();
    setAnnouncement("Route stopped.");
  };

  const restartTour = () => {
    if (!tour) return;
    runTour(tour.id, arrivalRef.current?.tourId === tour.id ? arrivalRef.current.target : undefined);
  };

  const startWalk = () => {
    if (modeRef.current === "tour") leaveModes();
    setSheet(null);
    call((e) => e.walk(true, selected ?? viewKey(placeId, viewId)));
    // The engine reports the switch through onMode; without it, walking is not available here.
    if (modeRef.current !== "walk") {
      flashNotice("Walk mode isn't available on this device", 2200);
      setAnnouncement("Walk mode isn't available on this device.");
      return;
    }
    setAnnouncement(
      touch
        ? "Walk mode. Joystick to walk, drag to look."
        : "Walk mode. W and S or the up and down arrows walk, A and D step sideways, the left and right arrows turn, drag to look, Escape stops walking.",
    );
    // Keyboard walking listens on the scene, so it needs focus.
    hostRef.current?.focus({ preventScroll: true });
  };

  /** Leave walk mode; `refocus` when the button used disappears with it (focus goes to the Walk mode button). */
  const stopWalk = (refocus = false) => {
    if (refocus) focusNextRef.current = () => walkButtonRef.current;
    call((e) => e.walk(false));
    setModeNow("orbit");
    setConnectors([]);
    setAnnouncement("Walk mode off.");
  };

  const takeConnector = (id: string) => {
    call((e) => e.useConnector(id));
    hostRef.current?.focus({ preventScroll: true });
  };

  const toggleLabels = () => {
    const next = !labels;
    setLabels(next);
    call((e) => e.setLabels(next));
  };

  const zoom = (factor: number) => call((e) => e.zoom(factor));

  const resetView = () => {
    const keep = selected;
    leaveModes();
    if (keep && call((e) => e.focus(keep, true))) return;
    setSelected(null);
    gotoView(placeId, viewId, true);
  };

  /** Time changes reach the engine at most every 120 ms while dragging (it rebuilds the sky light). */
  const pushTime = (iso: string, immediate: boolean) => {
    setTimeChoice(iso);
    timeRef.current = iso;
    pendingTime.current = iso;
    const flush = () => {
      timeTimer.current = null;
      const next = pendingTime.current;
      pendingTime.current = null;
      if (next) call((e) => e.setTime(next));
    };
    if (immediate) {
      if (timeTimer.current !== null) window.clearTimeout(timeTimer.current);
      flush();
    } else if (timeTimer.current === null) {
      timeTimer.current = window.setTimeout(flush, 120);
    }
  };

  const toggleSheet = (next: Exclude<Sheet, null>) => setSheet((s) => (s === next ? null : next));

  const closeSheet = () => {
    const which = sheet;
    setSheet(null);
    (which === "time" ? timeButtonRef.current : routesButtonRef.current)?.focus({ preventScroll: true });
  };

  const retry = () => {
    // The request that was loading when it failed, else what the 3D showed when it stopped.
    const intent = lastIntentRef.current ?? {
      place: placeId,
      view: viewId,
      focus: selected ?? tour?.arrival,
      tour: tour?.id,
    };
    // The button gives way to the loading panel.
    focusNextRef.current = () => loadingPanelRef.current;
    teardown(); // also leaves the text version
    void begin(intent);
  };

  /** A slow device: stop building the 3D and show the same campus as text over the poster. */
  const showTextVersion = () => {
    focusNextRef.current = () => textPanelRef.current;
    teardown();
    setStatusNow("text");
    setAnnouncement("Showing the text version: pick a company, room or route with Go to and Routes, or in the lists below.");
  };

  /** "Details" on a target that lives on this page (#maps, #route…): close full screen first, then go there. */
  const followDetails = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!expanded || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const url = new URL(e.currentTarget.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) return;
    e.preventDefault();
    exitExpanded(() => {
      const el = url.hash.length > 1 ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null;
      if (!el) return;
      // A real fragment navigation: it scrolls clear of the sticky header and moves the keyboard's
      // starting point to the section.
      if (window.location.hash === url.hash) el.scrollIntoView({ block: "start" });
      else window.location.hash = url.hash;
      const active = document.activeElement;
      if (active instanceof HTMLElement && stageRef.current?.contains(active)) active.blur();
    });
  };

  // Same-page twin links (see the click listener above): show what they ask for, again.
  useEffect(() => {
    replayRef.current = (intent, opener, hash) => {
      if (!hash) bringIntoView(opener);
      show(intent, opener);
    };
  });

  /* ── Keyboard ── */

  const onHostKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!ready || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "+" || e.key === "=") zoom(1.25);
    else if (e.key === "-" || e.key === "_") zoom(0.8);
    else if ((e.key === "0" || e.key === "Home") && mode !== "walk") resetView();
    else return;
    e.preventDefault();
  };

  const onStageKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      if (sheet) closeSheet();
      else if (mode === "walk") stopWalk();
      else if (expanded) exitExpanded();
      else return;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (!expanded || e.key !== "Tab") return;
    // Keep keyboard focus inside the full-screen view.
    const nodes = Array.from(
      stageRef.current?.querySelectorAll<HTMLElement>("button, select, input, summary, a[href], [tabindex]") ?? [],
    ).filter((el) => el.tabIndex >= 0 && !el.hasAttribute("disabled") && el.getClientRects().length > 0);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === stageRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  /* ── Render ── */

  const routesId = `${uid}-routes`;
  const timeId = `${uid}-time`;
  const helpId = `${uid}-help`;
  const titleId = `${uid}-title`;
  const showViews = ready && mode === "orbit" && !tour;
  const hint = touch ? "Joystick to walk, drag to look" : WALK_KEYS_HINT;
  // Phones: the tools live in the full-screen header, so cards and panels get the whole stage.
  const toolsInHeader = compact && expanded;
  // Zoom has pinch and Ctrl/⌘ + wheel; the header (phones, narrow windows) keeps only the essentials.
  const fullTools = !touch && !toolsInHeader;
  // Phones (portrait, full screen) while a route plays: its card goes to the top, so the walker the
  // camera follows in the lower half of the scene stays in view.
  const tourOnTop = toolsInHeader && !short && !!tour?.live;
  // Phones in landscape while a route plays: the card keeps to the left, under the time of day, so the
  // walker in the middle of the scene stays in view.
  const tourAside = toolsInHeader && short && !!tour?.live;
  /** Either way the route card keeps to its essentials: the step and its place first, no title line. */
  const compactRoute = tourOnTop || tourAside;
  const [titleMain, ...titleRest] = place.title.split(" · ");
  const tools = (
    <>
      {fullTools && (
        <IconButton
          label={expanded ? "Exit full screen" : "Full screen"}
          onClick={() => (expanded ? exitExpanded() : openExpanded(null, true))}
        >
          {expanded ? <Minimize2 className="h-4 w-4" aria-hidden="true" /> : <Maximize2 className="h-4 w-4" aria-hidden="true" />}
        </IconButton>
      )}
      <IconButton label="Show names" pressed={labels} onClick={toggleLabels}>
        <Tag className="h-4 w-4" aria-hidden="true" />
      </IconButton>
      <IconButton
        ref={walkButtonRef}
        label="Walk mode"
        pressed={mode === "walk"}
        onClick={() => (mode === "walk" ? stopWalk() : startWalk())}
      >
        <Footprints className="h-4 w-4" aria-hidden="true" />
      </IconButton>
      {fullTools && (
        <>
          <IconButton label="Zoom in" onClick={() => zoom(1.25)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton label="Zoom out" onClick={() => zoom(0.8)}>
            <Minus className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </>
      )}
      <IconButton label="Reset view" onClick={resetView}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </IconButton>
    </>
  );
  // Walk mode: a button per way to another level within reach (a lift offers each of its floors).
  const connectorButtons = connectors.length > 0 && mode === "walk" && (
    <div role="group" aria-label="Change level" className="flex flex-wrap gap-2">
      {connectors.map((c) => (
        <button key={c.id} type="button" onClick={() => takeConnector(c.id)} className={cn(primarySmall, "min-h-12 px-5")}>
          <ConnectorIcon label={c.label} />
          {c.label}
        </button>
      ))}
    </div>
  );
  // The step the route card shows (stills start before the first step; a moving route starts on it).
  const stepIndex = activeTour
    ? tour?.caption
      ? activeTour.steps.findIndex((s) => s.text === tour.caption)
      : stepwise
        ? -1
        : 0
    : -1;
  /** The step as its card shows it (a company's route names its own room or stand). */
  const shownStep = shownTour && stepIndex >= 0 ? shownTour.steps[stepIndex] : undefined;
  const upcoming = shownTour ? shownTour.steps[stepIndex + 1] : undefined;
  /** Where the running route leads: the "Walk me there" target, else the route's own end. */
  const tourDest = activeTour ? (getTarget3D(tour?.arrival ?? activeTour.to) ?? null) : null;
  const pair = target ? pairedTarget(target) : null;
  const targetPlan = target?.map ? `#map-${target.map}` : null;
  // "Details" only when it leads somewhere else than the floor plan.
  const targetDetails = target?.href && !target.href.includes("#map-") ? target.href : null;
  /** Text version: the lists below mark what the card over the poster shows (a deep link's route or target). */
  const listCurrent = textMode ? (tour?.id ?? selected) : null;
  const currentItem = "border-l-2 border-l-(--color-event) pl-3";
  // Each scroll row leaves room around its buttons for their focus ring (2 px outline, 2 px offset).
  const placeTabs = (
    <ScrollRow
      role="tablist"
      aria-label="Places in the 3D model"
      className={cn(
        "flex gap-1",
        shortOverlay
          ? "min-w-0 flex-1 p-1"
          : expanded
            ? "shrink-0 border-b border-white/10 px-3 py-2"
            : "-mx-6 -mt-1 mb-2 px-6 py-1 sm:-mx-1 sm:px-1",
      )}
    >
      {PLACES_3D.map((p, i) => {
        const on = p.id === placeId;
        return (
          <button
            key={p.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${p.id}`}
            aria-selected={on}
            aria-controls={`${uid}-panel`}
            tabIndex={on ? 0 : -1}
            onClick={() => choosePlace(p.id)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            className={cn(
              "min-h-11 shrink-0 border px-3 transition-colors cursor-pointer sm:px-4",
              microLabel,
              focusRing,
              on ? "border-white bg-white text-black" : "border-white/15 text-neutral-400 hover:border-white/40 hover:text-white",
            )}
          >
            {p.tab}
          </button>
        );
      })}
    </ScrollRow>
  );

  // Loading: the engine's code, then the modules (counted), then light and textures for the first frame.
  const builtShare = progress && progress.total > 0 ? Math.min(1, progress.loaded / progress.total) : 0;
  const loadPct = loadPhase === "code" ? 6 : loadPhase === "build" ? 8 + 72 * builtShare : 97;
  const loadLabel =
    loadPhase === "code"
      ? "Loading the 3D engine…"
      : loadPhase === "build"
        ? "Building the campus…"
        : "Adding light and textures…";

  const routeCard = tour && activeTour && shownTour && (
    <div
      ref={tourCardRef}
      className={cn(
        panel,
        "min-h-0 w-full overflow-y-auto overscroll-contain p-3 sm:max-w-md",
        tourOnTop && "max-h-[60%]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pt-1">
          <p className={cn(microLabel, "text-[10px] text-(--color-event)")}>
            {compactRoute && shownStep
              ? `Step ${stepIndex + 1} of ${shownTour.steps.length}${shownStep.where ? ` · ${shownStep.where}` : ""}`
              : `${tour.live ? "Route" : "Directions"} · ${tourFacts(shownTour)}`}
          </p>
          {!compactRoute && (
            <p className="mt-1.5 text-sm font-semibold text-white">
              {tour.live ? shownTour.label : `Route: ${shownTour.label}`}
            </p>
          )}
          {/* "Walk me there" (or a company's own route link) goes on past the route's end: say where. */}
          {tour.arrival && tour.arrival !== activeTour.to && tourDest && (
            <p className={cn("text-xs text-white/55", compactRoute ? "mt-1" : "mt-0.5")}>
              To <span className="text-white/80">{tourDest.label}</span>
              {tourDest.where && ` · ${tourDest.where}`}
            </p>
          )}
        </div>
        {/* 44 px buttons with a gap, so a tap meant for Stop does not restart the route. */}
        <div className="-mr-2 -mt-1 flex shrink-0 items-center gap-1">
          {tour.live && (
            <>
              {!stepwise && (
                <button
                  type="button"
                  data-primary=""
                  className={quietButton}
                  onClick={togglePause}
                  aria-label={tour.paused ? "Resume the route" : "Pause the route"}
                >
                  {tour.paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
                </button>
              )}
              <button type="button" className={quietButton} onClick={restartTour} aria-label="Restart the route">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          )}
          <button
            type="button"
            data-primary={tour.live ? undefined : ""}
            className={quietButton}
            onClick={() => stopTour()}
            aria-label={tour.live ? "Stop the route" : "Close the route"}
          >
            {tour.live ? <Square className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {tour.live && (
        <div
          ref={(el) => {
            barTrackRef.current = el;
            el?.setAttribute("aria-valuenow", String(Math.round(tourFrame.current.t * 100)));
          }}
          role="progressbar"
          aria-label="Route progress"
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-2 h-0.5 w-full bg-white/10"
        >
          <div
            ref={(el) => {
              barRef.current = el;
              if (el) el.style.transform = `scaleX(${Math.min(1, Math.max(0, tourFrame.current.t))})`;
            }}
            className="h-full w-full origin-left bg-(--color-event)"
          />
        </div>
      )}
      {tour.live ? (
        // Plain text: each step is announced once, with its number, through the status region.
        <>
          {!compactRoute && shownStep && (
            <p className={cn(microLabel, "mt-3 text-[10px] text-white/55")}>
              Step {stepIndex + 1} of {shownTour.steps.length}
              {shownStep.where && <span className="text-white"> · {shownStep.where}</span>}
            </p>
          )}
          <p className={cn("text-sm text-neutral-200 leading-snug", shownStep && !compactRoute ? "mt-1" : "mt-3", compactRoute && "mt-2")}>
            {shownStep?.text ?? tour.caption ?? (stepwise ? shownTour.summary : (shownTour.steps[0]?.text ?? shownTour.summary))}
          </p>
          {/* What comes next: the next place on the way, or where the route ends. */}
          {(upcoming?.where || (stepIndex === shownTour.steps.length - 1 && tourDest)) && (
            <p className={cn(microLabel, "mt-2 text-[10px] text-white/55")}>
              {upcoming?.where ? (
                <>
                  Next <span aria-hidden="true">→</span> <span className="text-white/80">{upcoming.where}</span>
                </>
              ) : (
                <>
                  Arriving <span aria-hidden="true">→</span> <span className="text-white/80">{tourDest?.label}</span>
                </>
              )}
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-neutral-200 leading-snug">
          {shownTour.summary}{" "}
          <span className="text-white/55">
            {textMode ? "Follow these steps:" : "Follow these steps — the destination is shown in the model."}
          </span>
        </p>
      )}
      {tour.live && stepwise && (
        // Reduced motion: the route is a series of stills; the engine advances on "play".
        <button type="button" data-primary="" onClick={nextStep} className={cn(primarySmall, "mt-3 px-3")}>
          Next step
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <details className="guide-details mt-2" open={!tour.live}>
        <summary
          className={cn(microLabel, "flex min-h-11 items-center gap-2 text-[10px] text-neutral-400 hover:text-white")}
        >
          All steps ({shownTour.steps.length})
          <Chevron />
        </summary>
        <ol className="mt-1 space-y-2 text-xs text-neutral-300 leading-relaxed">
          {shownTour.steps.map((s, i) => (
            <li
              key={i}
              aria-current={tour.live && i === stepIndex ? "step" : undefined}
              className={cn("grid grid-cols-[1.5rem_1fr]", tour.live && i === stepIndex && "text-white")}
            >
              <span aria-hidden="true" className="font-mono text-[10px] text-(--color-event) pt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>
                {s.where && <span className={cn(microLabel, "block text-[10px] text-white/55")}>{s.where}</span>}
                <span className="sr-only">Step {i + 1}: </span>
                {s.text}
              </span>
            </li>
          ))}
        </ol>
      </details>
      {!tour.live && tourDest?.map && (
        <a href={`#map-${tourDest.map}`} onClick={followDetails} className={cn(ghostSmall, "mt-2 px-3 text-xs")}>
          <MapIcon className="h-4 w-4" aria-hidden="true" />
          {tourDest.label} on the floor plan
        </a>
      )}
    </div>
  );

  const targetCard = target && (
    // Focusable as a whole: keyboard focus lands here when a route arrives at it.
    <div
      ref={targetCardRef}
      tabIndex={-1}
      role="group"
      aria-labelledby={`${uid}-target`}
      className={cn(panel, focusRing, "min-h-0 w-full overflow-y-auto overscroll-contain p-3 sm:max-w-md")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn(microLabel, "text-[10px] text-(--color-event)")}>
            {KIND_LABEL[target.kind]} · {getPlace3D(target.place).tab}
            {target.day && ` · ${target.day}`}
          </p>
          <p id={`${uid}-target`} className="mt-1 font-semibold text-white">
            {target.label}
          </p>
          <p className="mt-0.5 text-xs text-neutral-400 leading-relaxed">{target.detail}</p>
        </div>
        <div className="-mr-2 -mt-2 flex shrink-0 items-center">
          <button
            type="button"
            className={quietButton}
            aria-label={touch ? `Share ${target.label}` : `Copy a link to ${target.label}`}
            title={touch ? "Share" : "Copy link"}
            onClick={() => void shareTarget(target)}
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" className={quietButton} aria-label="Close" onClick={closeTarget}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {pair && target.company && (
        // A company is in two places: its Friday briefing room (EduCity) and its Saturday Q&A stand (Joki).
        <div
          role="group"
          aria-label={`${getTarget3D(target.company)?.label ?? target.label}: Friday room and Saturday stand`}
          className="mt-3 grid grid-cols-2 gap-1.5"
        >
          {[target, pair]
            .sort((a, b) => (a.kind === "room" ? -1 : b.kind === "room" ? 1 : 0))
            .map((t) => {
              const on = t.id === target.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => !on && chooseTarget(t.id)}
                  className={cn(
                    "flex min-h-11 min-w-0 flex-col items-start justify-center border px-2.5 py-1.5 text-left transition-colors cursor-pointer",
                    focusRing,
                    on ? chipOn : chipOff,
                  )}
                >
                  <span className={cn(microLabel, "text-[10px]", on ? "text-black/60" : "text-(--color-event)")}>
                    {t.kind === "room" ? "Fri · briefing" : "Sat · Q&A stand"}
                  </span>
                  <span className="mt-0.5 text-[11px] leading-snug">{t.where}</span>
                </button>
              );
            })}
        </div>
      )}
      {(route || targetPlan || targetDetails) && (
        // Phones: one row (the plan and the details as icon buttons), so the card leaves the target in view.
        <div className={cn("mt-3 flex items-center gap-2", !compact && "flex-wrap")}>
          {route && (
            <button type="button" onClick={() => walkMeThere(target)} className={cn(primarySmall, "px-3")}>
              <Navigation className="h-4 w-4" aria-hidden="true" />
              {ready ? "Walk me there" : "Route there"}
            </button>
          )}
          {targetPlan && (
            <a
              href={targetPlan}
              onClick={followDetails}
              aria-label={compact ? "Floor plan" : undefined}
              title={compact ? "Floor plan" : undefined}
              className={cn(ghostSmall, compact ? "w-11 shrink-0 px-0" : "px-3")}
            >
              <MapIcon className="h-4 w-4" aria-hidden="true" />
              {!compact && "Floor plan"}
            </a>
          )}
          {targetDetails && (
            <Link
              href={targetDetails}
              onClick={followDetails}
              aria-label={compact ? `Details: ${target.label}` : undefined}
              title={compact ? "Details" : undefined}
              className={cn(ghostSmall, compact ? "w-11 shrink-0 px-0" : "px-3")}
            >
              {!compact && "Details"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
      {route && (
        <p className={cn("mt-2 text-xs text-white/55 [@media(max-height:600px)]:hidden", compact && "hidden")}>
          {routeFor(route, target.id).label} · {tourFacts(route)}
        </p>
      )}
    </div>
  );

  const textNotice = textMode && (
    // Announced through the status region below (a live region inserted with its text often is not).
    <div ref={textPanelRef} tabIndex={-1} role="group" aria-label="Text version" className={cn(panel, "w-full p-3 outline-none sm:max-w-md")}>
      <p className={cn(microLabel, "flex items-center gap-2 text-[10px] text-(--color-event)")}>
        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        {status === "error"
          ? "3D stopped · text version"
          : status === "unsupported"
            ? "Text version · no 3D on this device"
            : "Text version"}
      </p>
      {/* With a card open below, the notice keeps to its label (and its button): the card has the room. */}
      <p className={cn("mt-1.5 text-sm text-neutral-200 leading-relaxed", (target || tour) && "sr-only")}>
        {status === "unsupported"
          ? "This device can't show the 3D model. Everything in it is here as text: find a company, room or route with Go to and Routes, with the floor plans one tap away."
          : status === "error"
            ? "The 3D model stopped. The floor plans and the lists below show every room, stand and route — or find them with Go to and Routes."
            : "The same campus as text: find a company, room or route with Go to and Routes, with the floor plans one tap away."}
      </p>
      {status !== "unsupported" && (
        <button ref={retryButtonRef} type="button" onClick={retry} className={cn(ghostSmall, "mt-3 px-3")}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {status === "error" ? "Try again" : "Try the 3D again"}
        </button>
      )}
    </div>
  );

  return (
    <div className="guide-no-print">
      <div
        ref={stageRef}
        tabIndex={-1}
        onKeyDown={onStageKeyDown}
        onFocus={onStageFocus}
        onBlur={onStageBlur}
        {...(expanded ? { role: "dialog", "aria-modal": true, "aria-labelledby": titleId } : {})}
        className={cn("outline-none", expanded ? "fixed inset-0 z-[80] flex h-[100dvh] flex-col bg-black" : "relative")}
      >
        {expanded && (
          // Short screens (phones in landscape): the place tabs share the header row, so the scene keeps its height.
          <div
            className={cn(
              // box-content: the safe-area padding (notch, rounded corners) comes on top of the row's height.
              "box-content flex shrink-0 items-center justify-between border-b border-white/10 pt-[env(safe-area-inset-top)] pr-[max(0.5rem,env(safe-area-inset-right))]",
              shortOverlay
                ? "h-[3.25rem] gap-2 pl-[max(0.5rem,env(safe-area-inset-left))]"
                : "h-14 gap-3 pl-[max(1rem,env(safe-area-inset-left))]",
            )}
          >
            <div className={cn("min-w-0", shortOverlay && "sr-only")}>
              <p className={cn(microLabel, "truncate text-[10px] text-(--color-event)")}>Campus in 3D</p>
              <h2 id={titleId} className="truncate text-sm font-bold text-white">
                {titleMain}
                {titleRest.length > 0 && <span className={cn(compact && "sr-only")}> · {titleRest.join(" · ")}</span>}
              </h2>
            </div>
            {shortOverlay && placeTabs}
            {toolsInHeader && ready && <div className="ml-auto flex shrink-0 items-center gap-1.5">{tools}</div>}
            <button
              type="button"
              onClick={() => exitExpanded()}
              className={cn(
                "inline-flex h-11 w-11 shrink-0 items-center justify-center border border-white/20 text-white transition-colors hover:border-white cursor-pointer",
                focusRing,
              )}
              aria-label={compact ? "Close the 3D view" : "Exit full screen"}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {!shortOverlay && placeTabs}

        <div
          ref={panelRef}
          id={`${uid}-panel`}
          role="tabpanel"
          aria-labelledby={`${uid}-tab-${placeId}`}
          className={cn(expanded && "flex min-h-0 flex-1 flex-col")}
        >
          <div
            className={cn(
              "relative w-full overflow-hidden bg-(--color-scene)",
              expanded ? "min-h-0 flex-1" : "aspect-[4/5] border border-white/10 sm:aspect-[3/2] lg:aspect-[16/10]",
            )}
          >
            {/* Poster — until the 3D has rendered its first full frame; it fades into the scene. */}
            <div
              aria-hidden="true"
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-out motion-reduce:transition-none",
                ready ? "pointer-events-none opacity-0" : "opacity-100",
              )}
            >
              {/* Usually the page's largest paint: load it eagerly. */}
              <PosterImage place={place} eager className="object-cover" />
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/30 transition-colors duration-500 motion-reduce:transition-none",
                  (status === "loading" || textMode) && "bg-black/55",
                )}
              />
            </div>

            <div
              ref={hostRef}
              tabIndex={ready ? 0 : -1}
              role="group"
              aria-roledescription="3D scene"
              aria-label={place.alt}
              aria-describedby={helpId}
              onKeyDown={onHostKeyDown}
              onPointerDown={() => sheet && setSheet(null)}
              className={cn(
                // isolate: the engine's CSS2D labels carry z-indexes; keep them under the controls.
                "absolute inset-0 isolate touch-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--color-event)",
                ready ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            />
            <p id={helpId} className="sr-only">
              {HELP_TEXT}
            </p>

            {status === "idle" && (
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
                <div className="min-w-0">
                  <p className={cn(microLabel, "text-(--color-event)")}>Interactive 3D · built to scale</p>
                  <p className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">{place.title}</p>
                  <p className="mt-2 max-w-md text-sm text-neutral-300 leading-relaxed">
                    {introTarget
                      ? `${introTarget.label} — ${introTarget.detail}`
                      : introTour
                        ? `Route: ${routeFor(introTour, urlParams?.intent?.focus).label} · ${tourFacts(introTour)} — ${routeFor(introTour, urlParams?.intent?.focus).summary}`
                        : "Find your room or stand, walk the arrival routes and see the campus at any hour."}
                  </p>
                </div>
                <button
                  ref={startButtonRef}
                  type="button"
                  onClick={onExplore}
                  className={cn(primarySmall, "shrink-0 px-6 py-3")}
                >
                  Explore in 3D
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}

            {status === "loading" && (
              <div className="absolute inset-0 flex items-center justify-center p-6">
                {/* Takes keyboard focus while "Explore in 3D" is gone; the status itself is announced below. */}
                <div
                  ref={loadingPanelRef}
                  tabIndex={-1}
                  role="group"
                  aria-label="Building the 3D campus"
                  className={cn(panel, "w-full max-w-xs p-4 outline-none")}
                >
                  <p className={cn(microLabel, "flex items-center justify-between gap-3 text-white")}>
                    <span>{loadLabel}</span>
                    {loadPhase === "build" && progress && progress.total > 0 && (
                      <span aria-hidden="true" className="tabular-nums text-white/55">
                        {progress.loaded}/{progress.total}
                      </span>
                    )}
                  </p>
                  <div
                    role="progressbar"
                    aria-label="Loading the 3D campus"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(loadPct)}
                    aria-valuetext={
                      loadPhase === "build" && progress?.total
                        ? `${loadLabel} ${progress.loaded} of ${progress.total} parts`
                        : loadLabel
                    }
                    className="relative mt-3 h-0.5 w-full overflow-hidden bg-white/10"
                  >
                    {/* The last stretch (light and textures) eases towards the end while the first frame renders. */}
                    <div
                      className={cn(
                        "h-full w-full origin-left bg-(--color-event) transition-transform ease-out motion-reduce:transition-none",
                        loadPhase === "light" ? "duration-[8000ms]" : "duration-500",
                      )}
                      style={{ transform: `scaleX(${loadPct / 100})` }}
                    />
                  </div>
                  {opening && <p className="mt-3 text-sm text-neutral-300 leading-snug">{opening}</p>}
                  {slowLoad && (
                    <div className="mt-3 border-t border-white/10 pt-3">
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Taking a while on this device? Everything in the 3D is also here as text.
                      </p>
                      <button type="button" onClick={showTextVersion} className={cn(ghostSmall, "mt-2 px-3 text-xs")}>
                        <FileText className="h-4 w-4" aria-hidden="true" />
                        Show as text
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {ready && (
              <>
                {/* Top left: time of day (+ the walk hint on phones, clear of the joystick). */}
                <div
                  ref={topLeftRef}
                  className={cn(
                    "pointer-events-none absolute inset-y-3 left-3 z-20 flex flex-col items-start gap-2 [&>*]:pointer-events-auto",
                    toolsInHeader ? "max-w-[calc(100%-1.5rem)]" : "max-w-[calc(100%-5rem)]",
                  )}
                >
                  <button
                    ref={timeButtonRef}
                    type="button"
                    aria-expanded={sheet === "time"}
                    aria-controls={timeId}
                    onClick={() => toggleSheet("time")}
                    className={cn(
                      chipBase,
                      "max-w-full gap-2",
                      sheet === "time" ? "border-white bg-black/85 text-white" : chipOff,
                    )}
                  >
                    <SunIcon elevation={timeInfo.elevation} className="h-4 w-4 shrink-0" />
                    <span className="truncate whitespace-nowrap tabular-nums">{timeInfo.short}</span>
                    <span className="sr-only">— change the time of day</span>
                    <Chevron open={sheet === "time"} />
                  </button>
                  {sheet === "time" && (
                    <TimePanel
                      id={timeId}
                      time={time}
                      info={timeInfo}
                      onPick={(iso) => pushTime(iso, true)}
                      onSlide={(iso) => pushTime(iso, false)}
                      onClose={closeSheet}
                    />
                  )}
                  {mode === "walk" && toolsInHeader && sheet !== "time" && (
                    <div className={cn(panel, "flex max-w-xs items-start gap-2 py-2 pl-3 pr-1")}>
                      <div className="min-w-0">
                        <p className={cn(microLabel, "text-[10px] text-(--color-event)")}>Walk mode · eye level</p>
                        <p className="mt-1 text-sm text-neutral-200">{hint}</p>
                      </div>
                      <button type="button" onClick={() => stopWalk(true)} className={quietButton} aria-label="Stop walking">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Top right: view tools (in the header on phones). */}
                {!toolsInHeader && (
                  <div ref={toolsRef} className="absolute right-3 top-3 z-10 flex flex-col gap-2">
                    {tools}
                  </div>
                )}
              </>
            )}

            {(ready || textMode) && (
              // Bottom: what is happening now (route, walk, selection) above the views. Phones in landscape:
              // beside the time of day (its widest label ends at 14.6rem), so a card gets the scene's full
              // height. Phones while a route plays: at the top (see tourOnTop). Text version: the whole stage.
              <div
                ref={stackRef}
                className={cn(
                  "pointer-events-none absolute bottom-4 z-10 flex flex-col items-start gap-2 [&>*]:pointer-events-auto",
                  tourOnTop || tourAside ? "justify-start" : "justify-end",
                  textMode
                    ? "left-3 right-3 top-3"
                    : tourAside
                      ? "left-3 top-[4.25rem] w-[min(22rem,45%)]"
                      : !toolsInHeader
                      ? "left-3 right-[4.25rem] top-[4.25rem]"
                      : short
                        ? "left-[15.5rem] right-3 top-3"
                        : "left-3 right-3 top-[4.25rem]",
                )}
              >
                {textNotice}
                {slowRun && ready && (
                  <div role="group" aria-label="The 3D is slow" className={cn(panel, "flex w-full flex-wrap items-center gap-2 p-3 sm:max-w-md")}>
                    <p className="min-w-0 flex-1 text-sm text-neutral-200 leading-snug">
                      The 3D runs slowly on this device. The text version has every room, stand and route.
                    </p>
                    <button type="button" onClick={showTextVersion} className={cn(ghostSmall, "px-3 text-xs")}>
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      Show as text
                    </button>
                    <button type="button" onClick={() => setSlowRun(false)} className={quietButton} aria-label="Keep the 3D">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
                {routeCard ? (
                  routeCard
                ) : mode === "walk" && ready ? (
                  !toolsInHeader && (
                    <div className={cn(panel, "min-h-0 max-w-md overflow-y-auto p-3")}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className={cn(microLabel, "text-[10px] text-(--color-event)")}>Walk mode · eye level</p>
                          <p className="mt-1 text-sm text-neutral-200">{hint}</p>
                          <p className="mt-0.5 text-xs text-white/55">Drag to look · Shift to run · Esc to stop walking</p>
                        </div>
                        <button type="button" onClick={() => stopWalk(true)} className={cn(ghostSmall, "shrink-0 px-3 text-xs")}>
                          Stop walking
                        </button>
                      </div>
                      {connectorButtons && <div className="mt-3">{connectorButtons}</div>}
                    </div>
                  )
                ) : (
                  targetCard
                )}

                {/* Short screens: a target's card gets the room the view chips would take. */}
                {showViews && !(short && target) && (
                  <ScrollRow
                    role="group"
                    aria-label={`${place.tab} views`}
                    className="-m-1 flex max-w-[calc(100%+0.5rem)] shrink-0 gap-1 p-1"
                  >
                    {place.views.map((v) => {
                      const on = !selected && v.id === viewId;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => chooseView(v.id)}
                          className={cn(chipBase, on ? chipOn : chipOff)}
                        >
                          {v.label}
                        </button>
                      );
                    })}
                  </ScrollRow>
                )}
              </div>
            )}

            {ready && (
              <>
                {toolsInHeader && connectorButtons && <div className="absolute bottom-4 right-3 z-20">{connectorButtons}</div>}

                {notice && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/45 p-6"
                  >
                    <p className={cn(panel, microLabel, "px-4 py-3 text-center text-white")}>{notice}</p>
                  </div>
                )}

                {!sheet && (
                  // On a backing, so it stays readable (≥ 4.5:1) over any facade or sky.
                  <p className="pointer-events-none absolute bottom-0 right-0 z-10 bg-black/70 px-1.5 py-0.5 font-mono text-[10px] leading-tight text-white/80">
                    © OpenStreetMap · © Turun kaupunki
                  </p>
                )}
              </>
            )}

            {sheet === "routes" && (
              <section
                ref={sheetRef}
                id={routesId}
                aria-label="Walking routes"
                className={cn(
                  panel,
                  "absolute inset-x-0 bottom-0 z-30 flex max-h-[78%] flex-col bg-black sm:inset-x-auto sm:bottom-3 sm:right-3 sm:max-h-[calc(100%-1.5rem)] sm:w-[25rem]",
                )}
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/10 py-1 pl-4 pr-1">
                  <p className={cn(microLabel, "text-white/55")}>Walking routes</p>
                  <button type="button" onClick={closeSheet} className={quietButton} aria-label="Close routes">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {!textMode && (
                  <fieldset className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
                    <legend className="sr-only">Camera during a route</legend>
                    <span aria-hidden="true" className={cn(microLabel, "mr-1 text-[10px] text-white/55")}>
                      Camera
                    </span>
                    {(
                      [
                        ["chase", "Follow"],
                        ["first", "Eye level"],
                      ] as const
                    ).map(([value, label]) => (
                      <label
                        key={value}
                        className={cn(
                          chipBase,
                          "px-2.5 text-[10px] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-white",
                          tourCamera === value ? chipOn : chipOff,
                        )}
                      >
                        <input
                          type="radio"
                          name={`${uid}-camera`}
                          value={value}
                          checked={tourCamera === value}
                          onChange={() => setTourCamera(value)}
                          className="sr-only"
                        />
                        {label}
                      </label>
                    ))}
                  </fieldset>
                )}
                <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {TOURS_3D.map((t) => {
                    const playing = tour?.id === t.id && tour.live;
                    return (
                      <li key={t.id} className="flex items-start gap-1 border-b border-white/10 pr-2 last:border-b-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            // The sheet closes: keyboard focus continues on the route card.
                            focusNextRef.current = routeControl;
                            playTour(t.id, e.currentTarget);
                          }}
                          className={cn(
                            "flex min-w-0 flex-1 items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04] cursor-pointer",
                            focusRing,
                            "focus-visible:-outline-offset-2",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center border",
                              playing ? "border-(--color-event) text-(--color-event)" : "border-white/20 text-white",
                            )}
                          >
                            {textMode ? <FileText className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </span>
                          <span className="min-w-0">
                            <span className={cn(microLabel, "block truncate text-[10px] text-(--color-event)")}>
                              {t.audience}
                            </span>
                            <span className="mt-0.5 block text-sm font-semibold text-white">{t.label}</span>
                            <span className="mt-0.5 line-clamp-2 text-xs text-neutral-400 leading-relaxed">
                              <span className="tabular-nums text-neutral-300">{tourFacts(t)}</span> — {t.summary}
                            </span>
                          </span>
                        </button>
                        {playing && (
                          <span className="flex shrink-0 items-center gap-1 pt-1.5">
                            {!stepwise && (
                              <button
                                type="button"
                                className={quietButton}
                                onClick={togglePause}
                                aria-label={tour?.paused ? "Resume the route" : "Pause the route"}
                              >
                                {tour?.paused ? (
                                  <Play className="h-4 w-4" aria-hidden="true" />
                                ) : (
                                  <Pause className="h-4 w-4" aria-hidden="true" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              className={quietButton}
                              // The row's controls go with the route: focus stays on its play button.
                              onClick={(e) => {
                                const row = e.currentTarget.closest("li")?.querySelector<HTMLElement>("button");
                                stopTour(() => row);
                              }}
                              aria-label="Stop the route"
                            >
                              <Square className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <p role="status" className="sr-only">
              {announcement}
            </p>
          </div>

          {/* Dock: find anything, or follow a route — the 3D's way in, and in the text version its way through. */}
          <div
            className={cn(
              "flex items-center gap-2",
              expanded
                ? cn(
                    "shrink-0 border-t border-white/10 bg-black pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]",
                    shortOverlay
                      ? "pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
                      : "pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
                  )
                : "mt-3",
            )}
          >
            <label className="flex min-w-0 flex-1 items-center gap-3">
              <span className={cn(microLabel, "shrink-0 text-white/55", expanded ? "sr-only" : "sr-only sm:not-sr-only")}>
                Go to
              </span>
              <span className="relative min-w-0 flex-1">
                {/* 16 px on touch screens: iOS zooms the page into any smaller field it focuses. */}
                <select
                  value={selected ?? ""}
                  onChange={(e) => (e.target.value ? chooseTarget(e.target.value, e.target) : clearTarget())}
                  className={cn(
                    "h-11 w-full min-w-0 cursor-pointer appearance-none truncate rounded-none border border-white/20 bg-black pl-3 pr-9 text-sm text-white transition-colors hover:border-white/40 focus:border-white [@media(pointer:coarse)]:text-[16px]",
                    focusRing,
                  )}
                >
                  {/* Phones: short enough to read in full beside Routes (the label "Go to" names the field). */}
                  <option value="">{compact ? "Where to?" : "Find a company or place"}</option>
                  {TARGET_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.targets.map((t) => (
                        <option key={t.id} value={t.id}>
                          {optionText(t)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55"
                />
              </span>
            </label>
            <button
              ref={routesButtonRef}
              type="button"
              aria-expanded={sheet === "routes"}
              aria-controls={routesId}
              onClick={() => toggleSheet("routes")}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2 border px-3 transition-colors cursor-pointer sm:px-4",
                microLabel,
                focusRing,
                sheet === "routes" ? "border-white bg-white text-black" : "border-white/20 text-white hover:border-white",
              )}
            >
              <Route className="h-4 w-4" aria-hidden="true" />
              Routes
            </button>
          </div>
        </div>
      </div>

      {/* Text version of everything in the 3D (open when there is no 3D). */}
      <div className="mt-6">
        <p className="max-w-3xl text-sm text-neutral-400 leading-relaxed">{place.caption}</p>
        <div className="mt-4 grid grid-cols-1 gap-x-10 md:grid-cols-2">
          <details className="guide-details border-t border-white/10" open={textMode}>
            <summary className="flex min-h-11 items-center justify-between gap-2 text-xs text-neutral-400 hover:text-white">
              <span>
                In {place.tab} ({placeTargets.length})
              </span>
              <Chevron />
            </summary>
            <ul className="pb-2">
              {placeTargets.map((t) => (
                <li
                  key={t.id}
                  aria-current={listCurrent === t.id ? "true" : undefined}
                  className={cn(
                    "flex items-start justify-between gap-3 border-b border-white/10 py-2.5 text-sm",
                    listCurrent === t.id && currentItem,
                  )}
                >
                  <span className="min-w-0">
                    <span className="text-white">{t.label}</span>
                    <span className="text-white/55"> — {t.detail}</span>
                    {t.map && (
                      <>
                        {" "}
                        <a
                          href={`#map-${t.map}`}
                          className={cn(
                            "whitespace-nowrap text-white/55 underline decoration-white/25 underline-offset-2 transition-colors hover:text-white hover:decoration-white",
                            focusRing,
                          )}
                        >
                          floor plan<span className="sr-only"> for {t.label}</span>
                        </a>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => showFromList(t.id, e.currentTarget)}
                    className={cn(
                      microLabel,
                      "-my-1.5 inline-flex min-h-11 shrink-0 items-center px-2 text-neutral-400 transition-colors hover:text-white cursor-pointer",
                      focusRing,
                    )}
                  >
                    Show<span className="sr-only"> {t.label} in 3D</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <details className="guide-details border-t border-white/10" open={textMode}>
            <summary className="flex min-h-11 items-center justify-between gap-2 text-xs text-neutral-400 hover:text-white">
              <span>Walking routes ({TOURS_3D.length})</span>
              <Chevron />
            </summary>
            <ol className="pb-2">
              {TOURS_3D.map((t) => (
                <li
                  key={t.id}
                  aria-current={listCurrent === t.id ? "true" : undefined}
                  className={cn("border-b border-white/10 py-4", listCurrent === t.id && currentItem)}
                >
                  <h3 className="text-sm font-semibold text-white">{t.label}</h3>
                  <p className={cn(microLabel, "mt-1 text-[10px] text-white/55")}>
                    {t.audience} · {tourFacts(t)}
                  </p>
                  <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{t.summary}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-300 leading-relaxed">
                    {t.steps.map((s, i) => (
                      <li key={i}>{s.text}</li>
                    ))}
                  </ol>
                  <button
                    type="button"
                    onClick={(e) => playTour(t.id, e.currentTarget)}
                    className={cn(ghostSmall, "mt-3 px-3 text-xs")}
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden="true" />
                    Play in 3D<span className="sr-only">: {t.label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </details>
        </div>
        <Credits className="mt-6" />
      </div>
    </div>
  );
}
