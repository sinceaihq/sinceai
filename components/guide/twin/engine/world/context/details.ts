import * as THREE from "three";
import type { Collider2D, LightingState, Tier, TwinTarget, V2 } from "../../types";
import type { CampusBuilding, CampusData } from "../../data/campus";
import { cleanRing, ensureCCW, pointInRing } from "../../util";
import { vectorBearing } from "../../frame";
import { LUMINANCE } from "../../sky/sky";
import type { Solid, SolidIndex } from "./envelope";
import { box, lin, type FacadeBuilder, type MeshBuilder } from "./kit";
import type { BuildingInfo, Recipe } from "./recipes";
import { datacity, electrocity, eurocitySkybridge, ictBridgePortals, ictSolar, station, STATION_STAIRS, type BespokeOut } from "./bespoke";
import { buildParkCity, PARKCITY_OSM } from "./parkcity";
import { kalevansilta } from "./bridges";
import { makeSignAtlas, SignBuilder, type SignWord } from "./signs";

/**
 * Details of the context buildings beyond their envelopes: entrances
 * (portals, canopies, downlights and light pools), the bespoke parts of the
 * buildings around the venues (bespoke.ts, parkcity.ts), building-name
 * lettering (signs.ts), and the "Go to" targets this module owns
 * (lib/hackathon-2026/twin.ts: kupittaa-station, parkcity).
 */

type Rgb = [number, number, number];

export interface DetailKit {
  tier: Tier;
  /** Concrete (textured) details: columns, slabs, plinths — colours via calibrate(). */
  concrete: MeshBuilder;
  /** Painted metal / render details: canopies, frames, plant. */
  paint: MeshBuilder;
  /** Shiny metal: ducts, rails, galvanised parts. */
  metal: MeshBuilder;
  /** Sloped and flat glazing (glows warm after dusk). */
  glazing: MeshBuilder;
  /** Clear, see-through glass (footbridge sides, balustrades): reflections over what is behind it. */
  clearGlass: MeshBuilder;
  /** Night lights (vertex colour = luminance in scene units). */
  emissive: MeshBuilder;
  /** Additive light pools on the ground (vertex colour = radiance at the centre). */
  pools: MeshBuilder;
  roofs: MeshBuilder;
  trims: MeshBuilder;
  heightAt(x: number, z: number): number;
  facadeFor(key: string): FacadeBuilder;
  /** Vertex colour that makes the concrete detail material show `hex`. */
  calibrate(hex: string): Rgb;
  /** Flat caps of a ring into the paint / emissive builders. */
  paintCap(ring: readonly V2[], y: number, color: Rgb, down: boolean): void;
  emissiveCap(ring: readonly V2[], y: number, color: Rgb, down: boolean): void;
  /** A tilted solar panel row (centre, length along `along`, depth, tilt in rad). */
  solar(x: number, y: number, z: number, len: number, depth: number, along: V2, tilt: number): void;
}

export interface DetailInput {
  campus: CampusData;
  built: { b: CampusBuilding; info: BuildingInfo; solids: Solid[]; recipe: Recipe }[];
  index: SolidIndex;
  heightAt(x: number, z: number): number;
  /** Ground-storey arcades (facade line a→b, outward n, recess depth, soffit y): doors stand at their back wall. */
  arcades: { a: V2; b: V2; n: V2; depth: number; soffit: number }[];
}

export interface DetailResult {
  objects: THREE.Object3D[];
  pickables: THREE.Object3D[];
  /** Replacement footprint colliders per OSM id (arcades, colonnades). */
  colliders: Map<number, Collider2D[]>;
  extraColliders: Collider2D[];
  targets: TwinTarget[];
  ready: Promise<unknown>;
  setLighting(on: number, state: LightingState): void;
  /** Per frame (LOD swaps); true when the scene changed. */
  tick(camera: THREE.Camera): boolean;
  dispose(): void;
}

/** Outward facing (compass) and the wall point of a door: the nearest footprint edge. */
export function doorOnWall(at: V2, ring: readonly V2[]): { p: V2; n: V2; facing: number; dist: number } {
  let best = Infinity;
  let p: V2 = at;
  let n: V2 = [0, -1];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l2 = dx * dx + dz * dz;
    if (l2 < 1e-6) continue;
    const t = Math.max(0, Math.min(1, ((at[0] - a[0]) * dx + (at[1] - a[1]) * dz) / l2));
    const qx = a[0] + dx * t;
    const qz = a[1] + dz * t;
    const d = Math.hypot(at[0] - qx, at[1] - qz);
    if (d < best) {
      best = d;
      p = [qx, qz];
      const l = Math.sqrt(l2);
      n = [-dz / l, dx / l];
    }
  }
  return { p, n, facing: vectorBearing(n[0], n[1]), dist: best };
}

/**
 * The wall a door is in: the nearest open (not covered by a neighbour) ground-level wall of the
 * building's own solids — the LOD2 walls, which can sit a metre or more off the OSM outline.
 */
export function doorOnSolids(at: V2, solids: readonly Solid[], index: SolidIndex, ground: number): { p: V2; n: V2; dist: number } | null {
  let best: { p: V2; n: V2; dist: number } | null = null;
  for (const s of solids) {
    if (s.base > ground + 1.5) continue;
    if (at[0] < s.minX - 5 || at[0] > s.maxX + 5 || at[1] < s.minZ - 5 || at[1] > s.maxZ + 5) continue;
    const ring = s.ring;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const l2 = dx * dx + dz * dz;
      if (l2 < 0.25) continue;
      const t = Math.max(0.02, Math.min(0.98, ((at[0] - a[0]) * dx + (at[1] - a[1]) * dz) / l2));
      const q: V2 = [a[0] + dx * t, a[1] + dz * t];
      const d = Math.hypot(at[0] - q[0], at[1] - q[1]);
      if (best && d >= best.dist) continue;
      const l = Math.sqrt(l2);
      const n: V2 = [-dz / l, dx / l];
      // Open air outside (a neighbour standing against the wall would hide the door).
      if (index.coverAt([q[0] + n[0] * 0.3, q[1] + n[1] * 0.3], s).solid) continue;
      best = { p: q, n, dist: d };
    }
  }
  return best;
}

const SIGN_WORDS: SignWord[] = [
  // Lit colours are the emissive at full sign luminance: saturated colours dimmed so they stay coloured.
  { key: "datacity", text: "DATACITY", color: "#f4f5f2", lit: "#d9e6ff", weight: 700 },
  { key: "kupittaa", text: "Kupittaa  Kuppis", color: "#ffffff", board: "#1d2f5c", lit: "#b4b8c4", litBoard: "#0a1226", weight: 600 },
  { key: "electrocity", text: "ELECTROCITY", color: "#3f7fca", lit: "#1d4f9e", vertical: true, weight: 700 },
];

export function buildDetails(kit: DetailKit, input: DetailInput): DetailResult {
  const objects: THREE.Object3D[] = [];
  const pickables: THREE.Object3D[] = [];
  const colliders = new Map<number, Collider2D[]>();
  const extraColliders: Collider2D[] = [];
  const targets: TwinTarget[] = [];
  const disposers: (() => void)[] = [];
  const lightHooks: ((on: number, state: LightingState) => void)[] = [];
  const tickers: ((camera: THREE.Camera) => boolean)[] = [];
  const out: BespokeOut = { colliders: [] };

  // ── Lettering atlas (one draw call) ──
  const atlas = makeSignAtlas(SIGN_WORDS);
  const signs = atlas ? new SignBuilder() : null;

  // ── Entrances ──
  const byId = new Map(input.built.map((x) => [x.b.id, x]));
  for (const e of input.campus.entrances) {
    if (!e.building) continue;
    const bt = byId.get(e.building);
    if (!bt) continue;
    if (/parking_entrance|emergency|service|garage|staircase/.test(e.kind)) continue;
    // ParkCity's street doors, portals and footbridge door are its own (parkcity.ts).
    if (bt.b.osmId === PARKCITY_OSM) continue;
    // Stair heads of the station hall are the glazed tubes (bespoke.ts), not doors.
    if (STATION_STAIRS.some((t) => Math.hypot(t.top[0] - e.at[0], t.top[1] - e.at[1]) < 3.5)) continue;
    const onSolid = doorOnSolids(e.at, bt.solids, input.index, bt.info.ground);
    const door = onSolid && onSolid.dist <= 4 ? onSolid : doorOnWall(e.at, ensureCCW(cleanRing(bt.b.polygon)));
    if (door.dist > 4) continue;
    // In an arcade the door is in the recessed wall, under the soffit (no canopy of its own).
    const arc = input.arcades.find((a) => onSegment(door.p, a.a, a.b, 1.0));
    if (arc) {
      const p: V2 = [door.p[0] - arc.n[0] * arc.depth, door.p[1] - arc.n[1] * arc.depth];
      entrance(kit, p, arc.n, false, undefined, arc.soffit);
      continue;
    }
    // Doors of a building on a bridge open at its floor, not on the ground far below.
    entrance(kit, door.p, door.n, e.kind === "main", bt.info.bridge ? bt.info.ground : undefined);
  }

  // ── Bespoke buildings ──
  const byRole = (role: string) => input.built.find((x) => x.b.role === role);
  const asBespoke = (x: (typeof input.built)[number]) => ({ role: x.b.role, osmId: x.b.osmId, solids: x.solids, polygon: x.b.polygon });
  const electro = byRole("electrocity");
  if (electro) electrocity(kit, asBespoke(electro), signs, atlas, out);
  const sky = input.campus.areas.find((a) => a.id === "osm-782074004");
  if (sky) eurocitySkybridge(kit, ensureCCW(cleanRing(sky.polygon)));
  const ict = byRole("ict-city");
  if (ict) {
    ictSolar(kit, asBespoke(ict));
    ictBridgePortals(kit);
  }
  const data = byRole("datacity");
  if (data) datacity(kit, asBespoke(data), signs, atlas);
  const st = byRole("station");
  if (st) station(kit, asBespoke(st), signs, atlas);
  // The covered footbridge and its stairs (platform ↔ ParkCity ↔ Joukahaisenkatu).
  extraColliders.push(...kalevansilta(kit));
  const park = input.built.find((x) => x.b.osmId === PARKCITY_OSM);
  if (park) {
    const ring = ensureCCW(cleanRing(park.b.polygon));
    const colonnade = park.info.overhangs[0]?.ring ?? null;
    const soffit = kit.heightAt(205, -2) + (park.info.overhangs[0]?.minHeight ?? 7.2);
    const parts = buildParkCity(kit, ring, park.info.roofY, colonnade, soffit);
    objects.push(...parts.objects);
    pickables.push(...parts.pickables);
    tickers.push((camera) => parts.tick(camera));
    for (const c of parts.columns) extraColliders.push({ level: "outdoor", kind: "circle", c: c.c, r: c.r });
    disposers.push(() => parts.dispose());
  }
  for (const c of out.colliders) extraColliders.push({ level: "outdoor", kind: "segment", a: c.a, b: c.b });

  // ── Sign mesh ──
  if (atlas && signs) {
    const geo = signs.build();
    if (geo) {
      const mat = new THREE.MeshStandardMaterial({
        map: atlas.texture,
        emissiveMap: atlas.emissive,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0,
        transparent: false,
        alphaTest: 0.5,
        roughness: 0.45,
        metalness: 0.1,
        side: THREE.DoubleSide,
        name: "context-signs",
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = "context-signs";
      mesh.receiveShadow = true;
      objects.push(mesh);
      lightHooks.push((on) => {
        mat.emissiveIntensity = on * LUMINANCE.signLit * 0.35;
      });
      disposers.push(() => {
        geo.dispose();
        mat.dispose();
        atlas.texture.dispose();
        atlas.emissive.dispose();
      });
    } else {
      atlas.texture.dispose();
      atlas.emissive.dispose();
    }
  }

  // ── Targets (campus landmarks) ──
  targets.push(
    {
      id: "parkcity",
      // From over the car park by EduCity's north corner: the tube facade on both street faces,
      // the colonnade along Joukahaisenkatu and the Kalevansilta door (the YLE photo's angle).
      view: { position: [258, 22, 70], target: [212, 12, -10], hfov: 66, fit: 48, open: null, labels: true },
      walkTo: [213.4, 8.6],
    },
    {
      id: "kupittaa-station",
      // Over the railway cutting from the south-east: the platform, its canopy and the hall on the bridge.
      view: { position: [246, 26, -96], target: [202, -2, -132], hfov: 64, fit: 40, open: null, labels: true },
      walkTo: [192.4, -121.4],
    },
  );

  return {
    objects,
    pickables,
    colliders,
    extraColliders,
    targets,
    ready: Promise.resolve(),
    setLighting(on, state) {
      for (const h of lightHooks) h(on, state);
    },
    tick(camera) {
      let changed = false;
      for (const t of tickers) changed = t(camera) || changed;
      return changed;
    },
    dispose() {
      for (const d of disposers) d();
    },
  };
}

/** True when p lies within `tol` m of the segment a→b (between its ends). */
function onSegment(p: V2, a: V2, b: V2, tol: number): boolean {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz;
  if (l2 < 1e-6) return false;
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2;
  if (t < 0 || t > 1) return false;
  return Math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1]) <= tol;
}

/**
 * A door portal on the wall, a canopy over main doors, a downlight and its pool of light.
 * `soffit` = the ceiling above the door (an arcade): downlights there instead of a canopy.
 */
function entrance(kit: DetailKit, p: V2, n: V2, main: boolean, floor?: number, soffit?: number) {
  const [nx, nz] = n;
  const tx = nz;
  const tz = -nx;
  const g = floor ?? kit.heightAt(p[0] + nx * 1.2, p[1] + nz * 1.2);
  const yaw = -Math.atan2(tz, tx);
  const w = main ? 2.4 : 1.8;
  const h = main ? 2.7 : 2.4;
  const frame: Rgb = lin("#2e3236");
  // Portal frame proud of the wall: jambs and head.
  const ox = p[0] + nx * 0.06;
  const oz = p[1] + nz * 0.06;
  box(kit.paint, ox + tx * (w / 2), g + h / 2, oz + tz * (w / 2), 0.12, h, 0.14, yaw, frame);
  box(kit.paint, ox - tx * (w / 2), g + h / 2, oz - tz * (w / 2), 0.12, h, 0.14, yaw, frame);
  box(kit.paint, ox, g + h + 0.08, oz, w + 0.12, 0.16, 0.14, yaw, frame);
  // The doors themselves: dark glass (the glazing material glows warm from the lobby at night).
  box(kit.glazing, ox, g + h / 2, oz, w, h, 0.03, yaw, [1, 1, 1]);
  if (soffit !== undefined) {
    // Downlights in the arcade soffit in front of the door.
    const lamp: Rgb = lin("#ffe4c4").map((c) => c * LUMINANCE.bollard) as Rgb;
    for (const s of [-0.5, 0.5]) {
      box(kit.emissive, p[0] + nx * 1.0 + tx * s * w * 0.6, soffit - 0.01, p[1] + nz * 1.0 + tz * s * w * 0.6, 0.18, 0.01, 0.18, yaw, lamp);
    }
  } else if (main) {
    const depth = 1.8;
    const cy = g + h + 0.55;
    box(kit.paint, p[0] + nx * (depth / 2), cy, p[1] + nz * (depth / 2), w + 1.4, 0.22, depth, yaw, lin("#3a3e42"));
    // Downlights in the soffit.
    const lamp: Rgb = lin("#ffe4c4").map((c) => c * LUMINANCE.bollard) as Rgb;
    for (const s of [-0.5, 0.5]) {
      const lx = p[0] + nx * (depth * 0.55) + tx * s * w * 0.6;
      const lz = p[1] + nz * (depth * 0.55) + tz * s * w * 0.6;
      box(kit.emissive, lx, cy - 0.115, lz, 0.18, 0.01, 0.18, yaw, lamp);
    }
  }
  // Pool of light on the ground in front of the door.
  const r = main ? 3.2 : 2.2;
  const px = p[0] + nx * (main ? 1.4 : 0.9);
  const pz = p[1] + nz * (main ? 1.4 : 0.9);
  const gy = (floor ?? kit.heightAt(px, pz)) + 0.03;
  const pool: Rgb = lin("#ffd7a8").map((c) => c * (main ? 0.006 : 0.004)) as Rgb;
  // Corners ordered so the quad faces up.
  kit.pools.quad(
    [px - tx * r - nx * r, gy, pz - tz * r - nz * r],
    [px - tx * r + nx * r, gy, pz - tz * r + nz * r],
    [px + tx * r + nx * r, gy, pz + tz * r + nz * r],
    [px + tx * r - nx * r, gy, pz + tz * r - nz * r],
    pool,
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ],
  );
}

/** True when the point is inside any of the rings. */
export function insideAny(p: V2, rings: readonly V2[][]): boolean {
  return rings.some((r) => pointInRing(p, r));
}
