/**
 * EduCity's lights follow the building's real use (lib/hackathon-2026/venues.ts:
 * openAroundTheClock false; schedule.ts): a university building on weekdays,
 * the hackathon's venue on Friday 6 Nov from 15:00 (registration, opening,
 * briefings until ≈20:15) and on Sunday 8 Nov from 08:15 (evaluation, winners
 * 13:30, finals 14:00, end 15:00) — and closed in between: the night build
 * runs in BioCity and Joki. After dark the night photograph shows nearly every
 * square window lit (≈60 of 65 on Joukahaisenkatu) while the building is in
 * use; closed, only corridors, stairs and a few offices stay lit.
 * Pure, unit-tested.
 */

/** Hours (local, fractional) the building is in use on a date: [from, to) ranges. */
const EVENT_HOURS: Record<string, [number, number][]> = {
  // Friday: a normal university day, then the hackathon (registration 15:00 … partner debrief 20:15).
  "2026-11-06": [[7.5, 21.0]],
  // Saturday: closed (the night build and the Q&A are in BioCity and Joki).
  "2026-11-07": [],
  // Sunday: evaluators 08:15, evaluation 10–13, winners 13:30, finals 14:00, end 15:00 (+ clearing up).
  "2026-11-08": [[7.75, 16.5]],
};

/** Weekday university hours for any other date. */
const WEEKDAY_HOURS: [number, number][] = [[7.5, 21.0]];

/** Minutes over which the lights come on / go off (no hard switch while dragging the time slider). */
const RAMP_H = 0.5;

/** "2026-11-07T01:00" → date and fractional hour; a bare "HH:MM" is Friday (as the engine's normaliseTime). */
function parse(iso: string): { date: string; hour: number } {
  const full = /^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})/.exec(iso);
  if (full) return { date: full[1], hour: Number(full[2]) + Number(full[3]) / 60 };
  const short = /^(\d{1,2}):(\d{2})$/.exec(iso.trim());
  if (short) return { date: "2026-11-06", hour: Number(short[1]) + Number(short[2]) / 60 };
  return { date: "2026-11-06", hour: 12 };
}

function hoursFor(date: string): [number, number][] {
  const known = EVENT_HOURS[date];
  if (known) return known;
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6 || Number.isNaN(day) ? [] : WEEKDAY_HOURS;
}

/**
 * Occupancy 0 (closed) … 1 (in use) at a Turku wall-clock time ("2026-11-06T15:30";
 * "HH:MM" = Friday), ramping over half an hour at opening and closing.
 */
export function edInUse(iso: string): number {
  const { date, hour } = parse(iso);
  let best = 0;
  for (const [a, b] of hoursFor(date)) {
    const up = Math.min(1, Math.max(0, (hour - (a - RAMP_H)) / RAMP_H));
    const down = Math.min(1, Math.max(0, (b + RAMP_H - hour) / RAMP_H));
    best = Math.max(best, Math.min(up, down));
  }
  return best;
}

/** Share of rooms lit while closed (corridors, stairs, a few offices) and while in use after dark. */
export const LIT_CLOSED = 0.12;
const LIT_IN_USE_DARK = 0.9;
const LIT_IN_USE_DAY = 0.55;

/** Share of rooms behind the windows with the lights on, for a Turku wall-clock time and night factor (0 day … 1 night). */
export function edLitFraction(iso: string, night: number): number {
  const use = edInUse(iso);
  const t = Math.min(1, Math.max(0, night));
  const open = LIT_IN_USE_DAY + (LIT_IN_USE_DARK - LIT_IN_USE_DAY) * t;
  // Closed by day nobody needs the lights; at night a few stay on.
  const closed = LIT_CLOSED * (0.4 + 0.6 * t);
  return closed + (open - closed) * use;
}

/** Interior light level (0…1) of the lobby, rooms and event lights: full in use, corridor / emergency light closed. */
export function edInteriorLevel(iso: string): number {
  const use = edInUse(iso);
  return 0.1 + 0.9 * use;
}
