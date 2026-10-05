import * as THREE from "three";
import type { MaterialName, TwinContext } from "../../types";
import { LUMINANCE, kelvinToLinear } from "../../sky/sky";
import { markShared } from "../../util";
import { sunMask, uberPatch } from "./kit";

type Overrides = Parameters<TwinContext["materials"]["variant"]>[1];

/**
 * Where a material is used. Exteriors take the sky (scene.environment) and
 * the sun; each interior zone gets its own light probe (joki/probes.ts):
 *   aula, cave, lounge, showroom — enclosed rooms on floor 1: no sun;
 *   tower — floors 2–3: daylight through the glass and the real sun with
 *           the fin shadows.
 */
export type Zone = "ext" | "aula" | "cave" | "lounge" | "showroom" | "tower";

const ENCLOSED: ReadonlySet<Zone> = new Set(["aula", "cave", "lounge", "showroom"]);

/**
 * Material factory for the Joki modules: owned variants of the shared
 * library (so they can carry an envMap and shader patches), cached by key so
 * merged meshes share materials, grouped by zone so a probe swap reaches
 * every material of a room.
 */
export class JokiMaterials {
  /** 0 = enclosed rooms never see the sun. Shared by every enclosed-zone material. */
  readonly sunOff: THREE.IUniform<number> = { value: 0 };
  /**
   * Sun reaching floors 2–3: 1 normally (the real fins and glass cast their own shadows);
   * reduced in the dollhouse cut, where the clipped fins no longer shade the plates.
   */
  readonly sunTower: THREE.IUniform<number> = { value: 1 };
  private owned: THREE.Material[] = [];
  private byZone = new Map<Zone, THREE.MeshStandardMaterial[]>();
  private cache = new Map<string, THREE.MeshStandardMaterial>();
  private env = new Map<Zone, THREE.Texture>();
  private glows = new Map<string, THREE.MeshBasicMaterial>();
  private zoneScale = new Map<Zone, number>();
  private emissives = new Map<Zone, { m: THREE.MeshBasicMaterial; base: THREE.Color }[]>();

  constructor(private ctx: TwinContext) {
    // The engine owns the generic interior probe; never let disposeDeep() of our meshes free it.
    if (ctx.envInterior) markShared(ctx.envInterior);
  }

  /** A library variant for a zone; `key` caches identical requests. */
  get(name: MaterialName, zone: Zone, overrides: Overrides = {}, key?: string): THREE.MeshStandardMaterial {
    const k = key ? `${key}|${zone}` : `${name}|${zone}|${JSON.stringify(overrides)}`;
    const hit = this.cache.get(k);
    if (hit) return hit;
    const m = this.ctx.materials.variant(name, overrides);
    m.name = `joki-${key ?? name}-${zone}`;
    this.setup(m, zone, overrides.envMapIntensity);
    this.cache.set(k, m);
    return m;
  }

  /**
   * Clear glass (glassInterior, premultiplied "coverage" blending): reflections at full strength over
   * a slightly dimmed background. Joki's panes are closed thin boxes or single quads, so front
   * faces only — one pass per pane set.
   */
  glass(zone: Zone, overrides: Overrides = {}, key?: string): THREE.MeshStandardMaterial {
    const m = this.get("glassInterior", zone, overrides, key);
    m.side = THREE.FrontSide;
    return m;
  }

  /** A plain material (flat colours, vertex colours, own maps) in a zone. */
  plain(
    key: string,
    zone: Zone,
    params: THREE.MeshStandardMaterialParameters & { physical?: THREE.MeshPhysicalMaterialParameters },
  ): THREE.MeshStandardMaterial {
    const ck = `plain|${key}|${zone}`;
    const hit = this.cache.get(ck);
    if (hit) return hit;
    const { physical, ...rest } = params;
    const m = physical ? new THREE.MeshPhysicalMaterial({ ...rest, ...physical }) : new THREE.MeshStandardMaterial(rest);
    m.name = `joki-${key}`;
    this.setup(m, zone, params.envMapIntensity);
    this.cache.set(ck, m);
    return m;
  }

  /**
   * An emissive light surface (lamp lens, LED line, lit sign) — luminance in scene units (1 = 1000 cd/m²).
   * `kelvin` = lamp CCT; interior lamps are shown white-balanced (probes.ts interiorWB) unless `outdoor`.
   */
  light(key: string, luminance: number, color: THREE.ColorRepresentation = "#ffffff", kelvin?: number, outdoor = false): THREE.MeshBasicMaterial {
    const c = kelvin ? kelvinToLinear(outdoor ? kelvin : Math.min(6500, kelvin + 1300)) : new THREE.Color(color);
    const m = new THREE.MeshBasicMaterial({ color: c.multiplyScalar(luminance) });
    m.name = `joki-light-${key}`;
    this.owned.push(m);
    return m;
  }

  /**
   * Shared unlit material for static light fittings (lenses, LED lines, exit
   * signs): each fitting carries its own HDR colour × luminance as vertex
   * colours (kit glow()), so a whole floor of fittings is one draw call.
   */
  glow(key: string): THREE.MeshBasicMaterial {
    const k = `glow|${key}`;
    const hit = this.glows.get(k);
    if (hit) return hit;
    const m = new THREE.MeshBasicMaterial({ vertexColors: true });
    m.name = `joki-glow-${key}`;
    this.glows.set(k, m);
    this.owned.push(m);
    return m;
  }

  /** HDR colour of a lamp: CCT (white-balanced indoors unless `outdoor`) or an sRGB colour, times luminance. */
  lampColor(luminance: number, kelvin?: number, color: THREE.ColorRepresentation = "#ffffff", outdoor = false): THREE.Color {
    const c = kelvin ? kelvinToLinear(outdoor ? kelvin : Math.min(6500, kelvin + 1300)) : new THREE.Color(color);
    return c.multiplyScalar(luminance);
  }

  /**
   * The zone's material for flat-coloured surfaces: colour, roughness and
   * metalness per vertex (kit pbr()), so a whole room of painted steel, black
   * counters, plaster and upholstery is one draw call per visibility group.
   */
  uber(zone: Zone): THREE.MeshStandardMaterial {
    const ck = `uber|${zone}`;
    const hit = this.cache.get(ck);
    if (hit) return hit;
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1 });
    m.name = `joki-uber-${zone}`;
    uberPatch(m);
    this.setup(m, zone);
    this.cache.set(ck, m);
    return m;
  }

  /** A room's own light source (LED wall, screens, lamp lenses) that follows setZoneScale with the room. */
  zoneEmissive(zone: Zone, m: THREE.MeshBasicMaterial): THREE.MeshBasicMaterial {
    const list = this.emissives.get(zone) ?? [];
    if (!list.some((e) => e.m === m)) list.push({ m, base: m.color.clone() });
    this.emissives.set(zone, list);
    const k = this.zoneScale.get(zone) ?? 1;
    m.color.copy(list.find((e) => e.m === m)!.base).multiplyScalar(k);
    return m;
  }

  /** Give every material of an interior zone its room probe. */
  setZoneEnv(zone: Zone, texture: THREE.Texture) {
    const prev = this.env.get(zone);
    this.env.set(zone, texture);
    const k = this.zoneScale.get(zone) ?? 1;
    for (const m of this.byZone.get(zone) ?? []) {
      m.envMap = texture;
      m.envMapIntensity = ((m.userData.jkEnvBase as number | undefined) ?? 1) * k;
    }
    if (prev && prev !== texture) prev.dispose();
  }

  /**
   * Scale a zone's probe light (1 = as built). Seen from outside after dark the exterior exposure is
   * far higher than the interior one: the rooms are dimmed so the floors read through the glass instead
   * of clipping white. True when anything changed.
   */
  setZoneScale(zone: Zone, k: number): boolean {
    if (Math.abs((this.zoneScale.get(zone) ?? 1) - k) < 1e-3) return false;
    this.zoneScale.set(zone, k);
    for (const e of this.emissives.get(zone) ?? []) e.m.color.copy(e.base).multiplyScalar(k);
    for (const m of this.byZone.get(zone) ?? []) {
      m.envMapIntensity = ((m.userData.jkEnvBase as number | undefined) ?? 1) * k;
      // Baked floor light (lightMap) dims with the room.
      if (m.lightMap) {
        m.userData.jkLightBase ??= m.lightMapIntensity;
        m.lightMapIntensity = (m.userData.jkLightBase as number) * k;
      }
    }
    return true;
  }

  private setup(m: THREE.MeshStandardMaterial, zone: Zone, envIntensity?: number) {
    m.userData.jkEnvBase = envIntensity ?? 1;
    if (zone !== "ext") {
      const env = this.env.get(zone) ?? this.ctx.envInterior;
      if (env) {
        m.envMap = env;
        m.envMapIntensity = envIntensity ?? 1;
      }
    }
    if (ENCLOSED.has(zone)) sunMask(m, this.sunOff);
    else if (zone === "tower") sunMask(m, this.sunTower);
    const list = this.byZone.get(zone) ?? [];
    list.push(m);
    this.byZone.set(zone, list);
    this.owned.push(m);
  }

  dispose() {
    for (const m of this.owned) m.dispose();
    for (const t of this.env.values()) t.dispose();
    this.owned = [];
    this.cache.clear();
    this.byZone.clear();
    this.env.clear();
    this.glows.clear();
    this.emissives.clear();
  }
}

/** Emissive presets used by the Joki modules (scene units; see sky/sky.ts LUMINANCE). */
export const JOKI_LUMINANCE = {
  // Recessed LED downlight behind its diffuser (≈ 3000 cd/m²): blooms indoors, a point from outside.
  downlight: LUMINANCE.ceilingPanel * 1.2,
  linearLed: LUMINANCE.ceilingPanel,
  trackSpot: LUMINANCE.ceilingPanel * 6,
  ledWall: LUMINANCE.ledWall,
  violetLine: LUMINANCE.eventLight * 0.55,
  screen: 0.18,
  exitSign: 0.3,
} as const;
