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

export interface RoomModel {
  /** "box": half extents x/z; "cylinder": radius. */
  shape: "box" | "cylinder";
  halfX: number;
  halfZ: number;
  radius: number;
  height: number;
  eye: number;
  /** Radiance of a surface point. `n` = surface: 0 floor, 1 ceiling, 2 wall; (x, y, z) relative to the room centre at floor level; bearing for walls (rad, atan2(x, −z)). */
  shade(surface: 0 | 1 | 2, x: number, y: number, z: number, bearing: number): Radiance;
}

/** Trace a room into an equirect probe (rgba half floats), then scale so the floor gets `floorKlux`. */
export function roomProbe(room: RoomModel, floorKlux: number, size: [number, number] = [128, 64], rotationY = 0): THREE.DataTexture {
  const [W, H] = size;
  const rgb = new Float32Array(W * H * 3);
  const cosR = Math.cos(rotationY);
  const sinR = Math.sin(rotationY);
  let up = 0;
  let solid = 0;
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
      const r = trace(room, dx, dy, dz);
      const k = (j * W + i) * 3;
      rgb[k] = r[0];
      rgb[k + 1] = r[1];
      rgb[k + 2] = r[2];
      if (dy > 0) {
        up += (0.2126 * r[0] + 0.7152 * r[1] + 0.0722 * r[2]) * dy * dOmega;
        solid += dy * dOmega;
      }
    }
  }
  // Irradiance on an upward surface = ∫ L cosθ dω over the upper hemisphere (≈ π · mean).
  const scale = up > 1e-9 ? floorKlux / up : 1;
  void solid;
  const data = new Uint16Array(W * H * 4);
  for (let p = 0; p < W * H; p++) {
    data[p * 4] = THREE.DataUtils.toHalfFloat(Math.min(6e4, rgb[p * 3] * scale));
    data[p * 4 + 1] = THREE.DataUtils.toHalfFloat(Math.min(6e4, rgb[p * 3 + 1] * scale));
    data[p * 4 + 2] = THREE.DataUtils.toHalfFloat(Math.min(6e4, rgb[p * 3 + 2] * scale));
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

function trace(room: RoomModel, dx: number, dy: number, dz: number): Radiance {
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

/** The Aula: white acoustic ceiling with downlights and LED lines, light floor, concrete and black slats, the NW glazing. */
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
          return mul3(lin("#e6e4df"), scale3(light, 0.065));
        }
        if (s === 0) {
          const pool = Math.exp(-((x % 2.4) ** 2 + (z % 2.4) ** 2) * 0.6);
          return mul3(lin("#d3cec6"), scale3(light, 0.1 + 0.05 * pool));
        }
        // Walls: NW glazing on one long side (daylight), concrete / black slats elsewhere.
        if (x < -7.9 && y > 0.2 && y < 2.9) return add3(scale3(cct(6500), 0.25 + 1.6 * daylight), [0, 0, 0]);
        if (x > 7.9) return mul3(lin("#26282b"), scale3(light, 0.08));
        return mul3(lin("#8f8a82"), scale3(light, 0.08));
      },
    },
    0.3,
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

/** Company Lounge: dark board-formed concrete scalloped by warm spots, black ceiling, birch tiers, grey carpet. */
export function loungeProbe(): THREE.DataTexture {
  const warm = cct(3000);
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
          const sp = Math.hypot(x, z);
          if (Math.abs(sp - 2.3) < 0.07 && Math.abs(((bearing * 8) / Math.PI) % 2) < 0.08) return scale3(warm, 8);
          return mul3(lin("#121214"), scale3(warm, 0.05));
        }
        if (s === 0) return Math.hypot(x, z) < 2.8 ? mul3(lin("#d9c9a8"), scale3(warm, 0.16)) : mul3(lin("#5d5f63"), scale3(warm, 0.1));
        // Wall scallops under the spots.
        const sc = Math.max(0, Math.cos(bearing * 4)) * Math.exp(-((y - 2.2) ** 2) * 0.8);
        return mul3(lin("#6e6a63"), scale3(warm, 0.05 + 0.18 * sc));
      },
    },
    0.2,
  );
}

/** Floors 2–3: round room, full-height glazing all round (daylight), wood-wool ceiling with spots, grey carpet. */
export function towerProbe(skyKlux: number, night: number): THREE.DataTexture {
  const light = cct(3600);
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
        if (core) return mul3(lin("#787c82"), scale3(light, 0.09));
        const fin = 0.6 + 0.4 * Math.cos(bearing * 448);
        return add3(scale3(sky, window * fin), scale3(light, 0.004 * night));
      },
    },
    0.38 + Math.min(1.6, skyKlux * 0.1) * (1 - night),
  );
}
