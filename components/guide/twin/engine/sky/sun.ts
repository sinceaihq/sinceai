/**
 * Solar position (NOAA General Solar Position, Spencer/Meeus series) for the
 * campus — accurate to a fraction of a degree, which is plenty for shadows.
 * Pure functions, no three.js, so they are unit-tested.
 */

/** Kupittaa campus (BioCity). */
export const CAMPUS_LAT = 60.4493;
export const CAMPUS_LON = 22.2933;

/** Turku is UTC+2 in winter (EET) and UTC+3 in summer (EEST). */
export function helsinkiOffsetHours(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Helsinki",
    hour: "2-digit",
    hourCycle: "h23",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    minute: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((local - Math.floor(utcMs / 60000) * 60000) / 3600000);
}

/** "2026-11-06T15:30" (Turku wall-clock time) → UTC milliseconds. */
export function turkuLocalToUtc(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) throw new Error(`Bad local time: ${iso}`);
  const [, y, mo, d, h, mi] = m.map(Number);
  const naive = Date.UTC(y, mo - 1, d, h, mi);
  // Try winter then summer offset; keep the one that maps back to the same wall clock.
  for (const offset of [2, 3]) {
    const utc = naive - offset * 3600000;
    if (helsinkiOffsetHours(utc) === offset) return utc;
  }
  return naive - 2 * 3600000;
}

export interface SunPosition {
  /** Degrees above the horizon (refraction-corrected). */
  elevation: number;
  /** Compass bearing, 0 = north, 90 = east. */
  azimuth: number;
}

const rad = Math.PI / 180;

/** Sun position for a UTC time at a latitude/longitude (degrees, east positive). */
export function sunPosition(utcMs: number, lat = CAMPUS_LAT, lon = CAMPUS_LON): SunPosition {
  const date = new Date(utcMs);
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((utcMs - start) / 86400000) + 1;
  const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const leap = new Date(Date.UTC(date.getUTCFullYear(), 1, 29)).getUTCMonth() === 1;
  // Fractional year (radians).
  const g = ((2 * Math.PI) / (leap ? 366 : 365)) * (dayOfYear - 1 + (hours - 12) / 24);

  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  const trueSolarMinutes = hours * 60 + eqTime + 4 * lon;
  const hourAngle = (trueSolarMinutes / 4 - 180) * rad;
  const phi = lat * rad;

  const cosZenith = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(hourAngle);
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith)));
  const geometric = 90 - zenith / rad;

  // Azimuth measured clockwise from north.
  const azRaw = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi),
  );
  const azimuth = (azRaw / rad + 180 + 360) % 360;

  return { elevation: geometric + refraction(geometric), azimuth };
}

/** Atmospheric refraction (degrees) for an apparent elevation (NOAA approximation). */
function refraction(elev: number): number {
  if (elev > 85) return 0;
  const te = Math.tan(elev * rad);
  let arcsec: number;
  if (elev > 5) arcsec = 58.1 / te - 0.07 / te ** 3 + 0.000086 / te ** 5;
  else if (elev > -0.575) arcsec = 1735 + elev * (-518.2 + elev * (103.4 + elev * (-12.79 + elev * 0.711)));
  else arcsec = -20.774 / te;
  return arcsec / 3600;
}

/** Sun position for a Turku wall-clock time ("2026-11-06T15:30"). */
export function sunAtTurku(iso: string): SunPosition {
  return sunPosition(turkuLocalToUtc(iso));
}

/**
 * 0 = full day … 1 = night. Civil twilight (sun 0° … −6°) blends; above +4°
 * is full daylight.
 */
export function nightFactor(elevation: number): number {
  const t = (4 - elevation) / 10;
  const clamped = Math.min(1, Math.max(0, t));
  return clamped * clamped * (3 - 2 * clamped);
}
