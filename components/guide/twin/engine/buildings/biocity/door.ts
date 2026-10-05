import type { V2 } from "../../types";
import { ENTRANCE_TYK } from "./plan";

/**
 * The Tykistökatu revolving door ("BioCity A", SPEC §3.1.4): a Ø2.9 m three-wing door inside two
 * curved glass walls with a 1.36 m mouth towards the recess and one towards the lobby. A static
 * three-wing door always seals (that is the point of it), so the model turns like the real one:
 * the wings follow whoever walks through (walk mode or a route's avatar), who always stands in the
 * middle of a compartment. Pure maths in plan frame B (degrees are plan bearings: 0 = −z, 90 = +x).
 */

export const DOOR = {
  x: ENTRANCE_TYK.drum.x,
  z: ENTRANCE_TYK.drum.z,
  /** Inner radius of the curved walls (wing tips run just inside). */
  r: ENTRANCE_TYK.drum.r,
  wings: 3,
  /** The curved walls: bearing ranges (the mouths are the gaps between them). */
  walls: [
    [-62, 62],
    [118, 242],
  ] as [number, number][],
  /** Radius of the centre post + wing hub as a walk collider. */
  post: 0.1,
  /** An actor further away than this does not move the door. */
  reach: 4.5,
} as const;

const RAD = Math.PI / 180;
const wrap = (d: number) => ((d % 360) + 360) % 360;

/** Plan bearing (deg) of p seen from the drum centre. */
export function bearingFromDoor(p: V2): number {
  return wrap(Math.atan2(p[0] - DOOR.x, -(p[1] - DOOR.z)) / RAD);
}

/**
 * Wing angle (bearing of wing 0) that puts an actor at plan point p in the middle of a compartment,
 * chosen as the equivalent (mod 120°) nearest to `current`; null when the actor is out of reach or
 * on the centre post (no defined side).
 */
export function doorTargetAngle(p: V2 | null, current: number): number | null {
  if (!p) return null;
  const d = Math.hypot(p[0] - DOOR.x, p[1] - DOOR.z);
  if (d > DOOR.reach || d < 0.05) return null;
  const step = 360 / DOOR.wings;
  const base = bearingFromDoor(p) + step / 2;
  // Nearest equivalent of `base` (mod 120°) to the current angle.
  const k = Math.round((current - base) / step);
  return base + k * step;
}

/** Ease the wings towards the target (rate per second); returns the new angle. */
export function stepDoorAngle(current: number, target: number | null, dt: number, rate = 14): number {
  if (target === null) return current;
  const f = 1 - Math.exp(-rate * Math.max(0, dt));
  const next = current + (target - current) * f;
  return Math.abs(target - next) < 0.05 ? target : next;
}

/** Plan-B direction of a bearing. */
export function bearingDir(b: number): V2 {
  return [Math.sin(b * RAD), -Math.cos(b * RAD)];
}

/** Shortest distance (m) from p to the three wings at wing angle `angle` (wing tips at r − 0.03). */
export function wingClearance(p: V2, angle: number): number {
  let best = Infinity;
  const L = DOOR.r - 0.03;
  for (let i = 0; i < DOOR.wings; i++) {
    const [dx, dz] = bearingDir(angle + (i * 360) / DOOR.wings);
    const px = p[0] - DOOR.x;
    const pz = p[1] - DOOR.z;
    const t = Math.max(0, Math.min(L, px * dx + pz * dz));
    best = Math.min(best, Math.hypot(px - dx * t, pz - dz * t));
  }
  return best;
}
