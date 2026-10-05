import * as THREE from "three";
import { kelvinToLinear } from "../../sky/sky";

/**
 * Per-room light probes for Joki's interiors, rendered on the CPU as small
 * equirectangular HDR maps (three.js converts them to PMREM on first use).
 * A probe is a simple model of the room seen from its middle — floor,
 * walls, ceiling, light fittings, glazing — in scene units (1 = 1000 cd/m²),
 * normalised so the floor receives a target illuminance. This keeps the
 * interiors' light neutral-white (as the reference photos, white-balanced)
 * and at the right level, independent of the engine's generic office probe.
 */

export type Radiance = [number, number, number];

/**
 * What a ray from the probe's eye sees: an emitter (lamp, glazing — radiance in relative units, scaled
 * with the lamps so the floor gets its target), or a surface lit to a known level (`albedo`, irradiance
 * `e` as a fraction of the floor's): radiance = albedo · e · floorKlux / π. Surfaces make the probe
 * physically consistent — a light floor brightens the ceiling, a dark ceiling stays dark — whatever the
 * size of the lamps. A plain Radiance is an emitter.
 */
export type Shade = Radiance | { emit?: Radiance; albedo?: Radiance; e?: number };

export interface RoomModel {
  /** "box": half extents x/z; "cylinder": radius. */
  shape: "box" | "cylinder";
  halfX: number;
  halfZ: number;
  radius: number;
  height: number;
  eye: number;
  /** Radiance of a surface point. `n` = surface: 0 floor, 1 ceiling, 2 wall; (x, y, z) relative to the room centre at floor level; bearing for walls (rad, atan2(x, −z)). */
  shade(surface: 0 | 1 | 2, x: number, y: number, z: number, bearing: number): Shade;
}

/** Trace a room into an equirect probe (rgba half floats), scaled so the floor gets `floorKlux`. */
export function roomProbe(room: RoomModel, floorKlux: number, size: [number, number] = [128, 64], rotationY = 0): THREE.DataTexture {
  const [W, H] = size;
  const emit = new Float32Array(W * H * 3);
  const refl = new Float32Array(W * H * 3);
  const cosR = Math.cos(rotationY);
  const sinR = Math.sin(rotationY);
  const lum = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let upEmit = 0;
  let upRefl = 0;
  for (let j = 0; j < H; j++) {
    const lat = ((j + 0.5) / H - 0.5) * Math.PI;
    const cl = Math.cos(lat);
    const dOmega = ((2 * Math.PI) / W) * (Math.PI / H) * cl;
    for (let i = 0; i < W; i++) {
      const lon = ((i + 0.5) / W - 0.5) * 2 * Math.PI;
      // three.js equirect directions (world), then into the room's frame.
      const wx = Math.cos(lon) * cl;
      const wz = Math.sin(lon) * cl;
      const dy = Math.sin(lat);
      const dx = wx * cosR + wz * sinR;
      const dz = -wx * sinR + wz * cosR;
      const sh = trace(room, dx, dy, dz);
      const k = (j * W + i) * 3;
      const e = Array.isArray(sh) ? sh : (sh.emit ?? [0, 0, 0]);
      const a = Array.isArray(sh) ? null : sh.albedo ? scale3(sh.albedo, ((sh.e ?? 1) * floorKlux) / Math.PI) : null;
      emit[k] = e[0];
      emit[k + 1] = e[1];
      emit[k + 2] = e[2];
      if (a) {
        refl[k] = a[0];
        refl[k + 1] = a[1];
        refl[k + 2] = a[2];
      }
      if (dy > 0) {
        upEmit += lum(e[0], e[1], e[2]) * dy * dOmega;
        if (a) upRefl += lum(a[0], a[1], a[2]) * dy * dOmega;
      }
    }
  }
  // Irradiance on an upward surface = ∫ L cosθ dω over the upper hemisphere: the lamps make up what the
  // lit surfaces above the floor don't give.
  const scale = upEmit > 1e-9 ? Math.max(0, floorKlux - upRefl) / upEmit : 0;
  const data = new Uint16Array(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    for (let c = 0; c < 3; c++) data[p * 4 + c] = THREE.DataUtils.toHalfFloat(Math.min(6e4, emit[p * 3 + c] * scale + refl[p * 3 + c]));
    data[p * 4 + 3] = THREE.DataUtils.toHalfFloat(1);
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function trace(room: RoomModel, dx: number, dy: number, dz: number): Shade {
  const ey = room.eye;
  let tWall = Infinity;
  if (room.shape === "cylinder") {
    const a = dx * dx + dz * dz;
    if (a > 1e-8) tWall = room.radius / Math.sqrt(a);
  } else {
    const tx = Math.abs(dx) > 1e-8 ? room.halfX / Math.abs(dx) : Infinity;
    const tz = Math.abs(dz) > 1e-8 ? room.halfZ / Math.abs(dz) : Infinity;
    tWall = Math.min(tx, tz);
  }
  const tFloor = dy < -1e-6 ? -ey / dy : Infinity;
  const tCeil = dy > 1e-6 ? (room.height - ey) / dy : Infinity;
  const t = Math.min(tWall, tFloor, tCeil);
  const x = dx * t;
  const y = ey + dy * t;
  const z = dz * t;
  const surface: 0 | 1 | 2 = t === tFloor ? 0 : t === tCeil ? 1 : 2;
  return room.shade(surface, x, y, z, Math.atan2(x, -z));
}

/** Linear RGB of a colour (sRGB hex) times a factor. */
export function lin(hex: string, k = 1): Radiance {
  const c = new THREE.Color(hex);
  return [c.r * k, c.g * k, c.b * k];
}

/**
 * Light colour of an interior lamp CCT as the reference photos show it: the
 * camera is white-balanced for indoor light, so warm-white lamps read near
 * white (≈ +1300 K). Luminance-normalised, times k.
 */
export function cct(kelvin: number, k = 1): Radiance {
  const c = kelvinToLinear(interiorWB(kelvin));
  return [c.r * k, c.g * k, c.b * k];
}

/** Indoor white balance: shift a lamp CCT towards neutral (see cct). */
export function interiorWB(kelvin: number): number {
  return Math.min(6500, kelvin + 1300);
}

export const mix3 = (a: Radiance, b: Radiance, t: number): Radiance => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mul3 = (a: Radiance, b: Radiance): Radiance => [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
export const add3 = (a: Radiance, b: Radiance): Radiance => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const scale3 = (a: Radiance, k: number): Radiance => [a[0] * k, a[1] * k, a[2] * k];

/** Soft grid of round light fittings on a ceiling: 1 inside a disc of radius r at every grid node. */
export function gridSpot(x: number, z: number, spacing: number, r: number): number {
  const gx = x / spacing - Math.round(x / spacing);
  const gz = z / spacing - Math.round(z / spacing);
  const d = Math.hypot(gx, gz) * spacing;
  return d < r ? 1 : 0;
}

// ── Joki's rooms ─────────────────────────────────────────────────────────────

/**
 * The Aula (photos: Arosuo / Vesa Loikas — a bright white lobby): white acoustic ceiling with downlights
 * and LED lines, the light satin floor, white columns, concrete piers and black slats, the 11.5 m NW
 * glazing. Floor ≈ 0.7 klux at night, ≈ 1.6 by day, the ceiling lit by the light floor and the glazing.
 */
export function aulaProbe(daylight: number, rotationY = 0): THREE.DataTexture {
  const light = cct(4000);
  return roomProbe(
    {
      shape: "box",
      halfX: 8,
      halfZ: 18,
      radius: 0,
      height: 3.1,
      eye: 1.6,
      shade(s, x, y, z) {
        if (s === 1) {
          if (gridSpot(x, z, 2.4, 0.09)) return scale3(light, 18);
          if (Math.abs(x - 2.0) < 0.03) return scale3(light, 3);
          return { albedo: lin("#e6e4df"), e: 0.5 + 0.15 * daylight };
        }
        if (s === 0) {
          const pool = Math.exp(-((x % 2.4) ** 2 + (z % 2.4) ** 2) * 0.6);
          return { albedo: lin("#d3cec6"), e: 0.92 + 0.16 * pool };
        }
        // Walls: NW glazing on one long side (daylight), concrete piers / black slats elsewhere.
        if (x < -7.9 && y > 0.2 && y < 2.9) return scale3(cct(6500), 0.6 + 2.2 * daylight);
        if (x > 7.9) return { albedo: lin("#26282b"), e: 0.6 };
        return { albedo: lin(Math.abs(z) % 6 < 1 ? "#8f8a82" : "#e8e6e1"), e: 0.6 };
      },
    },
    // Lamps ≈ 0.7 klux; by day the long glazed wall and the light finishes add as much again.
    0.7 + 0.9 * daylight,
    [128, 64],
    rotationY,
  );
}

/** The Cave: black box, light floor under downlights, the projection over the stage. */
export function caveProbe(rotationY = 0): THREE.DataTexture {
  const light = cct(3800);
  return roomProbe(
    {
      shape: "box",
      halfX: 6.5,
      halfZ: 9,
      radius: 0,
      height: 3.1,
      eye: 1.6,
      shade(s, x, y, z) {
        if (s === 1) {
          if (gridSpot(x, z, 2.35, 0.09)) return scale3(light, 14);
          return mul3(lin("#141416"), scale3(light, 0.05));
        }
        if (s === 0) return mul3(lin("#a4a29d"), scale3(light, 0.09));
        if (z > 8.9 && Math.abs(x) < 5.5 && y > 0.7 && y < 2.9) return mul3(lin("#4a3fb0"), [0.3, 0.3, 0.35]);
        return mul3(lin("#2b2c30"), scale3(light, 0.05));
      },
    },
    0.18,
    [128, 64],
    rotationY,
  );
}

/**
 * Company Lounge (photo: wb2018 Joki amfiteatteri): board-formed concrete drum scalloped by the track
 * spots, black ceiling, birch-ply tiers and grey carpet — neutral-warm (the photos are balanced for
 * the warm spots: the concrete reads grey, the birch honey), not orange.
 */
export function loungeProbe(): THREE.DataTexture {
  const spot = cct(4000);
  return roomProbe(
    {
      shape: "cylinder",
      halfX: 0,
      halfZ: 0,
      radius: 4.2,
      height: 3.4,
      eye: 1.7,
      shade(s, x, y, z, bearing) {
        if (s === 1) {
          // Eight spots on a ring of r 2.3 (a soft band, so the coarse probe always catches them).
          const sp = Math.hypot(x, z);
          const k = Math.exp(-(((sp - 2.3) / 0.12) ** 2)) * Math.max(0, Math.cos(4 * bearing - Math.PI / 2)) ** 8;
          return { emit: scale3(spot, 6 * k), albedo: lin("#121214"), e: 0.35 };
        }
        if (s === 0) return Math.hypot(x, z) < 2.8 ? { albedo: lin("#d9c9a8"), e: 1.0 } : { albedo: lin("#a49e95"), e: 0.9 };
        // Wall scallops under the spots.
        const sc = Math.max(0, Math.cos(bearing * 4)) * Math.exp(-((y - 2.2) ** 2) * 0.8);
        return { albedo: lin("#8f8a82"), e: 0.45 + 0.7 * sc };
      },
    },
    0.5,
  );
}

/** Floors 2–3: round room, full-height glazing all round (daylight), wood-wool ceiling with spots, grey carpet. */
export function towerProbe(skyKlux: number, night: number): THREE.DataTexture {
  // 3000–3500 K spots under a camera balanced for them: near neutral (the photos read grey, not brown).
  const light = cct(4200);
  const sky = cct(6800);
  // Window luminance ≈ the sky seen through the fins (≈ 55 % open) and glass (≈ 80 %).
  const window = (skyKlux / Math.PI) * 0.44;
  return roomProbe(
    {
      shape: "cylinder",
      halfX: 0,
      halfZ: 0,
      radius: 9.0,
      height: 3.4,
      eye: 1.6,
      shade(s, x, y, z, bearing) {
        if (s === 1) {
          if (Math.abs(Math.hypot(x, z) - 5.6) < 0.08 && Math.abs(Math.sin(bearing * 6)) < 0.05) return scale3(light, 14);
          return mul3(lin("#d0d2d2"), scale3(light, 0.05 + 0.08 * (1 - night)));
        }
        if (s === 0) return mul3(lin("#8a8b8f"), add3(scale3(light, 0.08), scale3(sky, window * 0.3)));
        // Glass ring: sky through the fins (striped), dark at night; core walls where the plan has them.
        const core = Math.abs(x) < 1.8 && Math.abs(z) < 6;
        if (core) return mul3(lin("#3f3d3e"), scale3(light, 0.09));
        const fin = 0.6 + 0.4 * Math.cos(bearing * 448);
        return add3(scale3(sky, window * fin), scale3(light, 0.004 * night));
      },
    },
    0.38 + Math.min(1.6, skyKlux * 0.1) * (1 - night),
  );
}
