import { EVENT_2026 } from "./facts";
import type { DayId, ScheduleItem } from "./types";

const TZ = EVENT_2026.timezone;

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const weekdayShort = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" });
const weekdayLong = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long" });
const dayMonth = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
});
const dayMonthLong = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "numeric",
  month: "long",
});
const isoDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "17:00" — always in Turku time, whatever the device or server time zone. */
export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

/** "17:00", "~14:00", "17:00–17:30" */
export function formatTimeRange(item: Pick<ScheduleItem, "start" | "end" | "approx">): string {
  const start = `${item.approx ? "~" : ""}${formatTime(item.start)}`;
  return item.end ? `${start}–${formatTime(item.end)}` : start;
}

/** "Fri 6 Nov" */
export function formatDayShort(iso: string): string {
  const d = new Date(iso);
  return `${weekdayShort.format(d)} ${dayMonth.format(d)}`;
}

/** "Friday 6 November" */
export function formatDayLong(iso: string): string {
  const d = new Date(iso);
  return `${weekdayLong.format(d)} ${dayMonthLong.format(d)}`;
}

/** "Fri 6 Nov · 17:00" */
export function formatMoment(iso: string, approx = false): string {
  return `${formatDayShort(iso)} · ${approx ? "~" : ""}${formatTime(iso)}`;
}

/** Local (Turku) calendar date, "2026-11-06". */
export function localDate(iso: string | number | Date): string {
  return isoDate.format(new Date(iso));
}

const DAY_BY_DATE: Record<string, DayId> = {
  "2026-11-06": "fri",
  "2026-11-07": "sat",
  "2026-11-08": "sun",
};

export function dayOf(iso: string): DayId {
  const day = DAY_BY_DATE[localDate(iso)];
  if (!day) throw new Error(`Date outside the event: ${iso}`);
  return day;
}

export const DAYS: readonly { id: DayId; label: string; date: string }[] = [
  { id: "fri", label: "Friday 6 November", date: "2026-11-06" },
  { id: "sat", label: "Saturday 7 November", date: "2026-11-07" },
  { id: "sun", label: "Sunday 8 November", date: "2026-11-08" },
];

export function groupByDay<T extends Pick<ScheduleItem, "start">>(
  items: readonly T[],
): { day: (typeof DAYS)[number]; items: T[] }[] {
  return DAYS.map((day) => ({
    day,
    items: items.filter((item) => dayOf(item.start) === day.id),
  })).filter((group) => group.items.length > 0);
}

/** Default length of a point-in-time item when computing "now". */
const POINT_DURATION_MS = 15 * 60 * 1000;

export type NowNextState =
  | { phase: "before"; next: ScheduleItem | null; msUntilStart: number }
  | { phase: "during"; now: ScheduleItem[]; next: ScheduleItem | null }
  | { phase: "after" };

/**
 * Pure "now / next" calculation used by the live card. `items` must be one
 * audience's sorted schedule.
 */
export function getNowNext(items: readonly ScheduleItem[], nowMs: number): NowNextState {
  const timed = items.filter((i) => !i.allDay);
  const eventStart = Date.parse(EVENT_2026.window.start);
  const eventEnd = Date.parse(EVENT_2026.eventEnd);
  const firstStart = timed.length ? Math.min(...timed.map((i) => Date.parse(i.start))) : eventStart;

  if (nowMs >= eventEnd + POINT_DURATION_MS) return { phase: "after" };

  const upcoming = timed.filter((i) => Date.parse(i.start) > nowMs);
  const next = upcoming.length ? upcoming[0] : null;

  if (nowMs < firstStart) {
    return { phase: "before", next, msUntilStart: firstStart - nowMs };
  }

  // All-day items (e.g. a partner stand open all Saturday) are current for
  // their whole Turku calendar day.
  const today = localDate(nowMs);
  const allDay = items.filter((i) => i.allDay && localDate(i.start) === today);
  const now = timed.filter((i) => {
    const start = Date.parse(i.start);
    const end = i.end ? Date.parse(i.end) : start + POINT_DURATION_MS;
    return start <= nowMs && nowMs < end;
  });

  return { phase: "during", now: [...allDay, ...now], next };
}

/** "33 days", "5 h 20 min", "12 min" */
export function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days >= 2) return `${days} days`;
  if (days === 1) return `1 day ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}
