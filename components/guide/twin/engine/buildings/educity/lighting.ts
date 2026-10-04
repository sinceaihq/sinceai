/**
 * EduCity after dark (SPEC §8.3): the night photograph shows nearly every
 * square window lit (≈60 of 65 on Joukahaisenkatu) — the building is open
 * and busy during the hackathon. Pure, unit-tested.
 */

/** Share of rooms behind the windows with the lights on, for a Turku wall-clock time and night factor (0 day … 1 night). */
export function edLitFraction(iso: string, night: number): number {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  const hour = m ? Number(m[1]) + Number(m[2]) / 60 : 12;
  let dark: number;
  if (hour >= 16 && hour < 23.5) dark = 0.9;
  else if (hour >= 23.5 || hour < 5.5) dark = 0.74;
  else if (hour < 8) dark = 0.62;
  else dark = 0.85;
  const day = 0.55;
  const t = Math.min(1, Math.max(0, night));
  return day + (dark - day) * t;
}

/** Interior light level (0…1) of the lobby and rooms: always on during the event, a little dimmer late at night. */
export function edInteriorLevel(iso: string): number {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  const hour = m ? Number(m[1]) + Number(m[2]) / 60 : 12;
  return hour >= 1 && hour < 6 ? 0.8 : 1;
}
