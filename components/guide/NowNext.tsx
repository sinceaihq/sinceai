"use client";

import { useSyncExternalStore } from "react";
import {
  formatCountdown,
  formatDayShort,
  formatTime,
  formatTimeRange,
  getNowNext,
  titleFor,
  type Audience,
  type ScheduleItem,
} from "@/lib/hackathon-2026";
import { PlaceChip } from "./primitives";

// ── Shared clock ────────────────────────────────────────────────────────────
// One interval for every live card on the page. `?now=2026-11-07T10:30` lets
// organisers preview the card at any moment.

let clockNow: number | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function readOverride(): number | null {
  try {
    const raw = new URLSearchParams(window.location.search).get("now");
    if (!raw) return null;
    const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(raw) ? raw : `${raw}+02:00`;
    const ms = Date.parse(iso);
    return Number.isNaN(ms) ? null : ms;
  } catch {
    return null;
  }
}

function tick() {
  clockNow = readOverride() ?? Date.now();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (clockNow === null) clockNow = readOverride() ?? Date.now();
  if (!timer) timer = setInterval(tick, 30_000);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getSnapshot = () => clockNow;
const getServerSnapshot = () => null;

function Row({
  label,
  item,
  audience,
  emphasis,
}: {
  label: string;
  item: ScheduleItem;
  audience: Audience;
  emphasis?: boolean;
}) {
  return (
    <div className="grid grid-cols-[3.75rem_1fr] gap-x-4 sm:grid-cols-[4.5rem_1fr]">
      <span className="pt-0.5 font-mono text-[11px] uppercase tracking-widest text-neutral-500">
        {label}
      </span>
      <div className="min-w-0">
        <p className={emphasis ? "text-lg font-bold text-white leading-snug" : "font-semibold text-white"}>
          {titleFor(item, audience)}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
          <span className="font-mono tabular-nums">
            {formatDayShort(item.start)} · {formatTimeRange(item)}
          </span>
          <PlaceChip place={item.place} />
        </p>
      </div>
    </div>
  );
}

/**
 * Live "now / next" card. The server renders the role's first moment, so the
 * card is useful without JavaScript; the client then switches to live state.
 */
export function NowNext({
  items,
  audience,
  firstMoment,
}: {
  items: ScheduleItem[];
  audience: Audience;
  firstMoment: ScheduleItem;
}) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const state = now === null ? null : getNowNext(items, now);

  let heading = "First up";
  let body: React.ReactNode = <Row label="First" item={firstMoment} audience={audience} emphasis />;

  if (state?.phase === "before") {
    heading = `Starts in ${formatCountdown(state.msUntilStart)}`;
    body = state.next ? <Row label="First" item={state.next} audience={audience} emphasis /> : body;
  } else if (state?.phase === "during") {
    heading = "Live now";
    body = (
      <div className="space-y-4">
        {state.now.length > 0 ? (
          state.now.slice(0, 2).map((item) => (
            <Row key={item.id} label="Now" item={item} audience={audience} emphasis />
          ))
        ) : (
          <p className="text-sm text-neutral-400">Building time — nothing scheduled right now.</p>
        )}
        {state.next && <Row label="Next" item={state.next} audience={audience} />}
      </div>
    );
  } else if (state?.phase === "after") {
    heading = "That's a wrap";
    body = (
      <p className="text-sm text-neutral-300">
        Since AI Hackathon 2026 has ended. Thank you for building with us.
      </p>
    );
  }

  return (
    <section
      aria-labelledby="now-next-title"
      aria-live="polite"
      className="guide-no-print relative overflow-hidden border border-white/10 bg-(--color-surface-raised) p-5 sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-(--color-event-glow) blur-3xl"
      />
      <div className="relative mb-4 flex items-center justify-between gap-4">
        <h2 id="now-next-title" className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neutral-400">
          <span
            aria-hidden="true"
            className={
              state?.phase === "during"
                ? "inline-block h-2 w-2 rounded-full bg-(--color-event) guide-hotspot-pulse"
                : "inline-block h-2 w-2 rounded-full bg-neutral-600"
            }
          />
          {heading}
        </h2>
        {now !== null && (
          <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-500">
            Turku {formatTime(new Date(now).toISOString())}
          </span>
        )}
      </div>
      <div className="relative min-h-[4.5rem]">{body}</div>
    </section>
  );
}
