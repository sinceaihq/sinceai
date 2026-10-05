"use client";

import { useSyncExternalStore } from "react";

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
    if (/[zZ]|[+-]\d\d:?\d\d$/.test(raw)) {
      const ms = Date.parse(raw);
      return Number.isNaN(ms) ? null : ms;
    }
    // A plain wall-clock time is Turku time: winter (+02:00) or summer (+03:00).
    for (const offset of ["+02:00", "+03:00"]) {
      const ms = Date.parse(`${raw}${offset}`);
      if (Number.isNaN(ms)) return null;
      const wall = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Europe/Helsinki",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(ms);
      if (raw.slice(11, 16) === wall || raw.length <= 10) return ms;
    }
    return null;
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

/**
 * The guide's clock (ms), shared by every live element on the page; null on the server and before
 * hydration. `?now=` previews any moment.
 */
export function useGuideNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

