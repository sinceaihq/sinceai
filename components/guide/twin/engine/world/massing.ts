import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { Collider2D, TwinContext, V2, WorldModule } from "../types";
import {
  loadCampus,
  loadLod2,
  loadStreets,
  loadTerrain,
  type CampusBuilding,
  type CampusData,
  type Lod2Building,
  type Lod2Data,
  type StreetsData,
  type Terrain,
} from "../data/campus";
import { makeLabel } from "../labels";
import { boxUV } from "../render/uv";
import { FACADE_PRESETS, facadeSeed, facadeStyle, facadeWalls, flatRoofGeometry, makeFacadeMaterial, type FacadeStyle } from "../render/facade";
import {
  cleanRing,
  ensureCCW,
  hashString,
  mulberry32,
  overlapArea,
  pointInRing,
  polygonBounds,
  polygonCentroid,
  ringArea,
} from "../util";
import { CAMPUS_BOUNDS } from "../frame";

/**
 * Fallback massing + provisional terrain (temporary; DESIGN §11).
 *
 * Every campus building that no loaded module claims (WorldModule.claims =
 * OSM way ids) is extruded with a facade style for its family: from the City
 * of Turku LOD2 roof parts where measured (stepped roofs, plant rooms,
 * sloped glazing), else from the OSM outline and height. Walls start 0.3 m
 * under the lowest ground contact; storeys count from that ground.
 * Flat roofs get rooftop units. The terrain is the 2021 laser DTM with a
 * surface splat (asphalt / paving / grass) from the street register and OSM,
 * a ring of far ground to the horizon and a hazy far-city backdrop.
 *
 * The engine calls applyClaims() whenever the set of loaded modules changes;
 * the terrain is dropped when world/ground.ts is loaded.
 */

export interface MassingModule extends WorldModule {
  /** Rebuild without the buildings other modules model; drop the terrain when "ground" is loaded. */
  applyClaims(claimed: ReadonlySet<number>, opts: { ground: boolean; context: boolean }): void;
  /** Terrain height (DTM; 0 where the DTM is missing). */
  heightAt(x: number, z: number): number;
  /** Data that could not be loaded (shown in the engine's errors()). */
  warnings: string[];
}

export interface StyleChoice {
  key: string;
  style: FacadeStyle;
  roof: "membrane" | "bitumen" | "sedum" | "metal";
}

const RESIDENTIAL_TINTS = ["#d9d2c3", "#e4e1da", "#cfc6b4", "#c9b79c", "#b9ab98", "#d8cdb8", "#a8664f"];

/** Facade family per building (SPEC §3.4 colours, OSM tags for the rest). */
export function styleFor(b: CampusBuilding): StyleChoice {
  const role = b.role ?? "other";
  const use = (b.use ?? "").toLowerCase();
  const name = (b.name ?? "").toLowerCase();
  const material = (b.material ?? "").toLowerCase();
  const seed = hashString(b.id);
  switch (role) {
    case "biocity":
      return { key: "biocity", style: facadeStyle("blackPanelRibbon"), roof: "membrane" };
    case "educity":
      return { key: "educity", style: facadeStyle("darkBrickScatter", { occupancy: 1.4 }), roof: "sedum" };
    case "joki":
      return {
        key: "joki",
        style: facadeStyle("curtainWall", { wall: "metalWhite", wallColor: "#dcdfe2", frameColor: "#c9ccd0", glassColor: "#26313a" }),
        roof: "membrane",
      };
    case "electrocity":
      return { key: "electrocity", style: facadeStyle("whitePanelGrid", { wallColor: "#e6e7e4", bay: 1.8, window: [1.5, 1.45] }), roof: "membrane" };
    case "eurocity":
      return {
        key: "eurocity",
        style: facadeStyle("whitePanelGrid", { wallColor: "#d8dcdf", glassColor: "#21364a", bay: 2.7, window: [2.3, 1.7] }),
        roof: "membrane",
      };
    case "ict-city":
      return { key: "ict", style: facadeStyle("whitePanelGrid", { wall: "panelGrey", wallColor: "#b8bec2", bay: 2.4 }), roof: "membrane" };
    case "datacity":
      return { key: "datacity", style: facadeStyle("brickGrid"), roof: "bitumen" };
    case "pharmacity":
      return { key: "pharmacity", style: facadeStyle("concreteGrid", { wallColor: "#d2d0c9", glassColor: "#22303b" }), roof: "membrane" };
    case "parkcity":
      return { key: "parkcity", style: facadeStyle("parkingDecks"), roof: "bitumen" };
    case "civilcity":
      return { key: "civilcity", style: facadeStyle("concreteGrid", { wallColor: "#c99a85", bay: 2.7 }), roof: "membrane" };
    case "station":
      return { key: "station", style: facadeStyle("whitePanelGrid", { wallColor: "#e3e5e4", bay: 3, window: [2.6, 2.2], sill: 0.4 }), roof: "metal" };
    default:
      break;
  }
  if (/garage|shed|roof|service|construction|outbuilding|kiosk/.test(use) || b.height < 4.5) {
    return { key: "plain", style: facadeStyle("plain", { wallColor: "#a7a49d" }), roof: "bitumen" };
  }
  if (use === "parking") return { key: "parkcity", style: facadeStyle("parkingDecks"), roof: "bitumen" };
  if (/apartments|residential|house|dormitory|hotel/.test(use)) {
    const tint = b.colour && /^#?[0-9a-f]{6}$/i.test(b.colour) ? `#${b.colour.replace("#", "")}` : RESIDENTIAL_TINTS[seed % RESIDENTIAL_TINTS.length];
    const brick = material.includes("brick") || tint === "#a8664f";
    if (brick) return { key: "res-brick", style: facadeStyle("brickGrid", { interior: "residential", warmth: 0.85, storey: 2.9, bay: 3.2, window: [1.4, 1.45], blinds: 0.45 }), roof: "bitumen" };
    return { key: `res-${tint}`, style: facadeStyle("residentialRender", { wallColor: tint }), roof: "bitumen" };
  }
  if (material.includes("brick") || /teutori|verstas|sanitas/.test(name)) return { key: "brick", style: facadeStyle("brickGrid"), roof: "bitumen" };
  if (/sports|hall/.test(use)) {
    return { key: "hall", style: facadeStyle("concreteGrid", { wallColor: "#c4c2bb", bay: 6, window: [4.5, 1.2], sill: 4.2, storey: 8 }), roof: "metal" };
  }
  if (/hospital|clinic/.test(use) || /sairaala|mehiläinen|kompassi/.test(name)) {
    return { key: "hospital", style: facadeStyle("concreteGrid", { wallColor: "#e1ded6" }), roof: "membrane" };
  }
  if (/office|commercial|retail/.test(use)) {
    return { key: "office", style: facadeStyle("whitePanelGrid", { wallColor: "#cfd3d5" }), roof: "membrane" };
  }
  return { key: "concrete", style: facadeStyle("concreteGrid"), roof: "membrane" };
}

/** Per-building geometry, kept separately so claims can re-merge without it. */
export interface BuiltBuilding {
  osmId: number;
  hero: "biocity" | "joki" | "educity" | null;
  styleKey: string;
  walls: THREE.BufferGeometry[];
  roofs: THREE.BufferGeometry[];
  roofKind: StyleChoice["roof"];
  units: THREE.BufferGeometry[];
  colliders: Collider2D[];
  label?: CSS2DObject;
}

const LABELLED: Record<string, string> = {
  biocity: "BioCity",
  joki: "Joki",
  educity: "EduCity",
  electrocity: "Electrocity",
  eurocity: "Eurocity",
  "ict-city": "ICT-City",
  datacity: "DataCity",
  pharmacity: "Pharmacity",
  parkcity: "ParkCity",
  civilcity: "CivilCity",
  station: "Kupittaa station",
};

/** Sloped LOD2 roof face → y at (x, z) via the plane through its vertices (least squares). */
export function planeThrough(ring: V2[], ys: number[]): (x: number, z: number) => number {
  // Solve y = a x + b z + c.
  let sx = 0, sz = 0, sy = 0, sxx = 0, szz = 0, sxz = 0, sxy = 0, szy = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x, z] = ring[i];
    const y = ys[i];
    sx += x;
    sz += z;
    sy += y;
    sxx += x * x;
    szz += z * z;
    sxz += x * z;
    sxy += x * y;
    szy += z * y;
  }
  const m = new THREE.Matrix3().set(sxx, sxz, sx, sxz, szz, sz, sx, sz, n);
  const det = m.determinant();
  if (Math.abs(det) < 1e-9) {
    const avg = sy / n;
    return () => avg;
  }
  const inv = m.clone().invert();
  const v = new THREE.Vector3(sxy, szy, sy).applyMatrix3(inv);
  return (x, z) => v.x * x + v.y * z + v.z;
}

/** Rooftop units on a flat roof: deterministic boxes kept inside the part. */
function rooftopUnits(ring: V2[], y: number, seed: number): THREE.BufferGeometry[] {
  const area = Math.abs(ringArea(ring));
  if (area < 260) return [];
  const rnd = mulberry32(seed);
  const b = polygonBounds(ring);
  const count = Math.min(7, 1 + Math.floor(area / 650));
  const out: THREE.BufferGeometry[] = [];
  // Align units with the longest edge so they sit square on the roof.
  let best = 0;
  let angle = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const c = ring[(i + 1) % ring.length];
    const l = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (l > best) {
      best = l;
      angle = Math.atan2(c[1] - a[1], c[0] - a[0]);
    }
  }
  for (let k = 0, tries = 0; k < count && tries < 60; tries++) {
    const w = 2 + rnd() * 4.5;
    const d = 1.6 + rnd() * 2.6;
    const h = 1.1 + rnd() * 1.6;
    const cx = b.minX + rnd() * (b.maxX - b.minX);
    const cz = b.minZ + rnd() * (b.maxZ - b.minZ);
    const ca = Math.cos(angle);
    const sa = Math.sin(angle);
    const corners: V2[] = [
      [-w / 2 - 1.5, -d / 2 - 1.5],
      [w / 2 + 1.5, -d / 2 - 1.5],
      [w / 2 + 1.5, d / 2 + 1.5],
      [-w / 2 - 1.5, d / 2 + 1.5],
    ].map(([u, v]) => [cx + u * ca - v * sa, cz + u * sa + v * ca] as V2);
    if (!corners.every((p) => pointInRing(p, ring))) continue;
    const box = new THREE.BoxGeometry(w, h, d);
    box.rotateY(-angle);
    box.translate(cx, y + h / 2, cz);
    boxUV(box);
    out.push(box.toNonIndexed());
    box.dispose();
    k++;
  }
  return out;
}

function ringColliders(ring: V2[]): Collider2D[] {
  const out: Collider2D[] = [];
  for (let i = 0; i < ring.length; i++) {
    out.push({ level: "outdoor", kind: "segment", a: ring[i], b: ring[(i + 1) % ring.length] });
  }
  return out;
}

/** A raised part starts this far (m) or more above its ground: a slab on posts, a hall on a deck. */
const RAISED = 2;

/**
 * Underside of a raised part (a canopy, the station hall over the tracks): the outline facing down at
 * its base. Without it the slab is hollow seen from below — and casts no shadow, since the shadow pass
 * draws the back faces of front-sided materials and an up-facing roof alone has none towards the sun.
 */
export function soffitGeometry(ring: V2[], holes: V2[][], y: number): THREE.BufferGeometry {
  const g = flatRoofGeometry(ring, holes, y);
  const index = g.getIndex();
  if (index) {
    const a = index.array;
    const flipped: number[] = [];
    for (let i = 0; i + 2 < a.length; i += 3) flipped.push(a[i], a[i + 2], a[i + 1]);
    g.setIndex(flipped);
  }
  const n = g.getAttribute("normal");
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  n.needsUpdate = true;
  return g;
}

/**
 * A building from LOD2 roof parts. `parts` = the roofs that belong to this
 * building: its own records' roofs, minus parts another hero claims (Joki's
 * hall and tower inside DataCity's record), plus parts claimed by its role.
 * Exported for tests.
 */
export function buildFromLod2(
  b: CampusBuilding,
  parts: { rec: Lod2Building; roof: Lod2Building["roofs"][number] }[],
  choice: StyleChoice,
  terrain: Terrain | null,
): BuiltBuilding {
  const walls: THREE.BufferGeometry[] = [];
  const roofs: THREE.BufferGeometry[] = [];
  const units: THREE.BufferGeometry[] = [];
  const colliders: Collider2D[] = [];
  const seed = facadeSeed(b.id);
  const groundAt = terrain ? (x: number, z: number) => terrain.heightAt(x, z) : undefined;
  const recs = [...new Set(parts.map((p) => p.rec))];
  const raised = (rec: Lod2Building) => rec.baseY > rec.groundY + RAISED;
  for (const rec of recs) {
    // Footprint colliders only for records the building owns (not a host record such as DataCity's), and
    // none for a raised record — the station hall stands on its deck over the platform people walk on.
    if (rec.osmId === b.osmId && !raised(rec)) for (const ring of rec.footprint) colliders.push(...ringColliders(ensureCCW(cleanRing(ring))));
  }
  const outlineRaised = b.baseY !== undefined || (b.minHeight ?? 0) > RAISED;
  if (!colliders.length && !outlineRaised && !recs.some((rec) => rec.osmId === b.osmId && raised(rec))) {
    colliders.push(...ringColliders(ensureCCW(cleanRing(b.polygon))));
  }
  for (const { rec, roof } of parts) {
    const ring = cleanRing(roof.ring);
    if (ring.length < 3) continue;
    if (roof.ys && roof.ys.length === roof.ring.length) {
      const plane = planeThrough(roof.ring, roof.ys);
      const top = Math.max(...roof.ys);
      walls.push(facadeWalls(ring, rec.baseY, top, { vRef: rec.groundY, topAt: plane, groundAt, seed }));
      roofs.push(flatRoofGeometry(ring, [], plane));
    } else {
      const y = roof.y ?? rec.roofY;
      if (y - rec.baseY < 0.5) continue;
      walls.push(facadeWalls(ring, rec.baseY, y, { vRef: rec.groundY, groundAt, seed }));
      roofs.push(flatRoofGeometry(ring, [], y));
      if (choice.roof !== "metal") units.push(...rooftopUnits(ensureCCW(ring), y, seed + roofs.length));
    }
    if (raised(rec)) roofs.push(soffitGeometry(ring, [], rec.baseY));
  }
  return { osmId: b.osmId, hero: heroOf(b), styleKey: choice.key, walls, roofs, roofKind: choice.roof, units, colliders };
}

/** OSM building parts (no LOD2): each part extruded between its own min height and height. */
function buildFromParts(b: CampusBuilding, choice: StyleChoice, terrain: Terrain | null): BuiltBuilding | null {
  const parts = (b.parts ?? []).filter((p) => (p.height ?? 0) > 0.5 && p.polygon.length >= 3);
  if (!parts.length) return null;
  const ring = ensureCCW(cleanRing(b.polygon));
  let ground = b.groundY;
  if (ground === undefined && terrain) ground = Math.min(...ring.map(([x, z]) => terrain.heightAt(x, z)));
  ground ??= 0;
  const seed = facadeSeed(b.id);
  const groundAt = terrain ? (x: number, z: number) => terrain.heightAt(x, z) : undefined;
  const walls: THREE.BufferGeometry[] = [];
  const roofs: THREE.BufferGeometry[] = [];
  const units: THREE.BufferGeometry[] = [];
  for (const part of parts) {
    const pr = ensureCCW(cleanRing(part.polygon));
    const base = part.minHeight ? ground + part.minHeight : ground - 0.3;
    const top = ground + (part.height ?? b.height);
    if (top - base < 0.5) continue;
    walls.push(facadeWalls(pr, base, top, { vRef: ground, groundAt, seed }));
    roofs.push(flatRoofGeometry(pr, [], top));
    if (choice.roof !== "metal") units.push(...rooftopUnits(pr, top, seed + roofs.length));
    if ((part.minHeight ?? 0) > RAISED) roofs.push(soffitGeometry(pr, [], base));
  }
  if (!walls.length) return null;
  return {
    osmId: b.osmId,
    hero: heroOf(b),
    styleKey: choice.key,
    walls,
    roofs,
    roofKind: choice.roof,
    units,
    colliders: ringColliders(ring),
  };
}

/**
 * A building from its outline (no LOD2, no parts). Raised parts — canopies (use "roof", a slab on
 * posts with `baseY`), overhangs and bridges (`minHeight`) — start at their base, not buried in the
 * ground, carry no rooftop plant and don't block walking underneath. Exported for tests.
 */
export function buildFromOutline(b: CampusBuilding, choice: StyleChoice, terrain: Terrain | null): BuiltBuilding {
  const ring = ensureCCW(cleanRing(b.polygon));
  const holes = (b.holes ?? []).map((h) => cleanRing(h));
  let ground = b.groundY;
  if (ground === undefined && terrain) {
    ground = Math.min(...ring.map(([x, z]) => terrain.heightAt(x, z)));
  }
  ground ??= 0;
  const top = b.roofY ?? ground + Math.max(3, b.height);
  const raised = b.baseY !== undefined || (b.minHeight ?? 0) > 0;
  const base = b.baseY ?? (raised ? ground + (b.minHeight ?? 0) : ground - 0.3);
  const seed = facadeSeed(b.id);
  const groundAt = terrain ? (x: number, z: number) => terrain.heightAt(x, z) : undefined;
  const walls = [facadeWalls(ring, base, top, { holes, vRef: ground, groundAt, seed })];
  const roofs = [flatRoofGeometry(ring, holes, top)];
  if (raised) roofs.push(soffitGeometry(ring, holes, base));
  const units = choice.roof === "metal" || raised || b.use === "roof" ? [] : rooftopUnits(ring, top, seed);
  const colliders = raised ? [] : [ring, ...holes].flatMap((r) => ringColliders(r));
  return { osmId: b.osmId, hero: heroOf(b), styleKey: choice.key, walls, roofs, roofKind: choice.roof, units, colliders };
}

function heroOf(b: CampusBuilding): BuiltBuilding["hero"] {
  return b.role === "biocity" || b.role === "joki" || b.role === "educity" ? b.role : null;
}

// ── Terrain ─────────────────────────────────────────────────────────────────

/** Rasterise surfaces into a splat (R asphalt, G paving, B footway asphalt; rest grass) at 0.5 m. */
function buildSplat(campus: CampusData | null, streets: StreetsData | null, ext: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  const res = 0.5;
  const w = Math.ceil((ext.maxX - ext.minX) / res);
  const h = Math.ceil((ext.maxZ - ext.minZ) / res);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  const px = (x: number) => (x - ext.minX) / res;
  const pz = (z: number) => (z - ext.minZ) / res;
  const fillPoly = (poly: V2[], color: string) => {
    if (poly.length < 3) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    poly.forEach(([x, z], i) => (i ? ctx.lineTo(px(x), pz(z)) : ctx.moveTo(px(x), pz(z))));
    ctx.closePath();
    ctx.fill();
  };
  const strokeLine = (line: V2[], width: number, color: string) => {
    if (line.length < 2) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = width / res;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    line.forEach(([x, z], i) => (i ? ctx.lineTo(px(x), pz(z)) : ctx.moveTo(px(x), pz(z))));
    ctx.stroke();
  };
  const ASPHALT = "#ff0000";
  const PAVING = "#00ff00";
  const FOOT = "#0000ff";
  if (campus) {
    // Hard areas first (parking, squares, platforms), then roads and paths on top.
    for (const a of campus.areas) {
      if (/parking|construction|brownfield/.test(a.kind)) fillPoly(a.polygon, ASPHALT);
      else if (/pedestrian|square|platform|bridge|traffic_island|bicycle_parking|recycling|shelter/.test(a.kind)) fillPoly(a.polygon, PAVING);
    }
    // Under buildings: paving (plinths, arcades) rather than grass.
    for (const b of campus.buildings) fillPoly(b.polygon, PAVING);
    for (const r of campus.roads) {
      if (r.tunnel) continue;
      if (/footway|path|pedestrian|steps|cycleway|track/.test(r.kind)) strokeLine(r.centerline, Math.max(1.5, r.width), r.kind === "cycleway" ? FOOT : PAVING);
      else strokeLine(r.centerline, r.width + 1, ASPHALT);
    }
    for (const a of campus.areas) if (/grass|park|garden|meadow|scrub|wood|flowerbed|playground/.test(a.kind)) fillPoly(a.polygon, "#000000");
  }
  if (streets) {
    for (const a of streets.areas) {
      const s = a.surface;
      const color =
        a.part === "verge" ? "#000000" : s === "asphalt" || s === "asphalt_red" ? (a.part === "carriageway" || a.part === "driveway" ? ASPHALT : FOOT) : PAVING;
      fillPoly(a.poly, color);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Ground material blending grass, asphalt, paving and footway asphalt by the splat. */
function makeGroundMaterial(ctx: TwinContext, splat: THREE.Texture | null, ext: { minX: number; maxX: number; minZ: number; maxZ: number }) {
  const lib = ctx.materials;
  const grass = lib.get("grass");
  const asphalt = lib.get("asphalt");
  const pavers = lib.get("pavers");
  const foot = lib.get("asphaltFootway");
  // Base: the grass material (keeps its own blend/anti-tiling patch off: we drive everything here).
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: grass.map,
    normalMap: grass.normalMap,
    roughnessMap: grass.roughnessMap,
    roughness: 1,
    metalness: 0,
  });
  m.name = "provisional-ground";
  const uniforms: Record<string, THREE.IUniform> = {
    uSplat: { value: splat },
    uSplatOn: { value: splat ? 1 : 0 },
    uExt: { value: new THREE.Vector4(ext.minX, ext.minZ, ext.maxX - ext.minX, ext.maxZ - ext.minZ) },
    uGrassC: { value: grass.color.clone() },
    uAsphaltMap: { value: asphalt.map },
    uAsphaltN: { value: asphalt.normalMap },
    uAsphaltR: { value: asphalt.roughnessMap },
    uAsphaltC: { value: asphalt.color.clone() },
    uAsphaltRep: { value: new THREE.Vector2(1 / 2, 1 / 2) },
    uPaverMap: { value: pavers.map },
    uPaverN: { value: pavers.normalMap },
    uPaverR: { value: pavers.roughnessMap },
    uPaverC: { value: pavers.color.clone() },
    uPaverRep: { value: new THREE.Vector2(1 / 1.2, 1 / 1.2) },
    uFootMap: { value: foot.map },
    uFootC: { value: foot.color.clone() },
    uFootRep: { value: new THREE.Vector2(1 / 2.1, 1 / 2.1) },
    uGrassRep: { value: new THREE.Vector2(1 / 2, 1 / 2) },
  };
  m.customProgramCacheKey = () => "provisional-ground";
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vGWorld;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvGWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vGWorld;
uniform sampler2D uSplat; uniform float uSplatOn; uniform vec4 uExt;
uniform vec3 uGrassC; uniform vec2 uGrassRep;
uniform sampler2D uAsphaltMap; uniform sampler2D uAsphaltN; uniform sampler2D uAsphaltR; uniform vec3 uAsphaltC; uniform vec2 uAsphaltRep;
uniform sampler2D uPaverMap; uniform sampler2D uPaverN; uniform sampler2D uPaverR; uniform vec3 uPaverC; uniform vec2 uPaverRep;
uniform sampler2D uFootMap; uniform vec3 uFootC; uniform vec2 uFootRep;
float gHash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
float gNoise( vec2 p ) { vec2 i = floor( p ); vec2 f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( gHash( i ), gHash( i + vec2( 1, 0 ) ), u.x ), mix( gHash( i + vec2( 0, 1 ) ), gHash( i + vec2( 1, 1 ) ), u.x ), u.y ); }
vec4 gWeights;`,
      )
      .replace(
        "#include <map_fragment>",
        `
	vec2 gp = vec2( vGWorld.x, -vGWorld.z );
	vec4 sp = uSplatOn > 0.5 ? texture2D( uSplat, ( vGWorld.xz - uExt.xy ) / uExt.zw ) : vec4( 0.0 );
	// Soften the 0.5 m raster edges with a little noise.
	float jitter = ( gNoise( vGWorld.xz * 1.7 ) - 0.5 ) * 0.25;
	vec3 sw = clamp( sp.rgb + jitter * step( 0.05, sp.rgb ) * step( sp.rgb, vec3( 0.95 ) ), 0.0, 1.0 );
	float total = sw.r + sw.g + sw.b;
	if ( total > 1.0 ) sw /= total;
	gWeights = vec4( sw, max( 0.0, 1.0 - sw.r - sw.g - sw.b ) );
	vec3 cGrass = texture2D( map, gp * uGrassRep ).rgb * uGrassC;
	vec3 cAsph = texture2D( uAsphaltMap, gp * uAsphaltRep ).rgb * uAsphaltC;
	vec3 cPave = texture2D( uPaverMap, gp * uPaverRep ).rgb * uPaverC;
	vec3 cFoot = texture2D( uFootMap, gp * uFootRep ).rgb * uFootC;
	float macro = gNoise( vGWorld.xz / 23.0 ) * 0.6 + gNoise( vGWorld.xz / 7.0 ) * 0.4;
	vec3 col = cAsph * gWeights.r + cPave * gWeights.g + cFoot * gWeights.b + cGrass * gWeights.a;
	diffuseColor.rgb *= col * ( 0.86 + 0.28 * macro );
`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `
	float rG = texture2D( roughnessMap, gp * uGrassRep ).g;
	float rA = texture2D( uAsphaltR, gp * uAsphaltRep ).g * 0.92;
	float rP = texture2D( uPaverR, gp * uPaverRep ).g * 0.82;
	float roughnessFactor = clamp( rA * gWeights.r + rP * gWeights.g + 0.62 * gWeights.b + min( rG * 1.2, 1.0 ) * gWeights.a, 0.05, 1.0 );
`,
      )
      .replace(
        "vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;",
        `vec3 mapN = normalize(
		( texture2D( normalMap, gp * uGrassRep ).xyz * 2.0 - 1.0 ) * gWeights.a
		+ ( texture2D( uAsphaltN, gp * uAsphaltRep ).xyz * 2.0 - 1.0 ) * gWeights.r
		+ ( texture2D( uPaverN, gp * uPaverRep ).xyz * 2.0 - 1.0 ) * gWeights.g
		+ vec3( 0.0, 0.0, 1.0 ) * gWeights.b + vec3( 0.0, 0.0, 0.001 ) );`,
      );
  };
  return m;
}

/** Terrain grid from the DTM (or a flat plane when the DTM is missing). */
function terrainMesh(terrain: Terrain | null, step: number, material: THREE.Material): THREE.Mesh {
  const ext = terrain?.extent ?? CAMPUS_BOUNDS;
  const nx = Math.ceil((ext.maxX - ext.minX) / step) + 1;
  const nz = Math.ceil((ext.maxZ - ext.minZ) / step) + 1;
  const positions = new Float32Array(nx * nz * 3);
  const normals = new Float32Array(nx * nz * 3);
  const uvs = new Float32Array(nx * nz * 2);
  for (let j = 0; j < nz; j++) {
    const z = Math.min(ext.maxZ, ext.minZ + j * step);
    for (let i = 0; i < nx; i++) {
      const x = Math.min(ext.maxX, ext.minX + i * step);
      const k = j * nx + i;
      positions[k * 3] = x;
      positions[k * 3 + 1] = terrain ? terrain.heightAt(x, z) : 0;
      positions[k * 3 + 2] = z;
      const n = terrain ? terrain.normalAt(x, z) : [0, 1, 0];
      normals[k * 3] = n[0];
      normals[k * 3 + 1] = n[1];
      normals[k * 3 + 2] = n[2];
      uvs[k * 2] = x;
      uvs[k * 2 + 1] = -z;
    }
  }
  const index: number[] = [];
  for (let j = 0; j < nz - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      const b = a + 1;
      const c = a + nx;
      const d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = "provisional-terrain";
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Far ground: a ring from the terrain border out to the horizon (6 km),
 * meeting the DTM edge heights so there is no step, sinking gently outwards.
 */
function farGround(terrain: Terrain | null, material: THREE.Material): THREE.Mesh {
  const ext = terrain?.extent ?? CAMPUS_BOUNDS;
  const border: V2[] = [];
  const stepAlong = 8;
  const push = (x: number, z: number) => border.push([x, z]);
  for (let x = ext.minX; x < ext.maxX; x += stepAlong) push(x, ext.minZ);
  for (let z = ext.minZ; z < ext.maxZ; z += stepAlong) push(ext.maxX, z);
  for (let x = ext.maxX; x > ext.minX; x -= stepAlong) push(x, ext.maxZ);
  for (let z = ext.maxZ; z > ext.minZ; z -= stepAlong) push(ext.minX, z);
  const cx = (ext.minX + ext.maxX) / 2;
  const cz = (ext.minZ + ext.maxZ) / 2;
  const rings = [0, 40, 160, 600, 2000, 6000];
  const positions: number[] = [];
  const uvs: number[] = [];
  const n = border.length;
  for (const r of rings) {
    for (const [bx, bz] of border) {
      const dx = bx - cx;
      const dz = bz - cz;
      const len = Math.hypot(dx, dz) || 1;
      const x = bx + (dx / len) * r;
      const z = bz + (dz / len) * r;
      const edgeY = terrain ? terrain.heightAt(bx, bz) - 0.05 : -0.05;
      // Blend from the edge height to a gentle regional level.
      const k = Math.min(1, r / 400);
      const y = edgeY * (1 - k) + (-3.5) * k;
      positions.push(x, y, z);
      uvs.push(x, -z);
    }
  }
  const index: number[] = [];
  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let i = 0; i < n; i++) {
      const a = ri * n + i;
      const b = ri * n + ((i + 1) % n);
      const c = (ri + 1) * n + i;
      const d = (ri + 1) * n + ((i + 1) % n);
      index.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const nrm = geo.getAttribute("normal");
  let up = 0;
  for (let i = 0; i < nrm.count; i++) up += nrm.getY(i);
  if (up < 0) {
    for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
    geo.setIndex(index);
    geo.computeVertexNormals();
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = "far-ground";
  mesh.receiveShadow = true;
  return mesh;
}

/** Value noise in [0, 1] for the backdrop (CPU, deterministic). */
function noise2(x: number, z: number, seed: number): number {
  const h = (i: number, j: number) => {
    const n = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
  };
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = h(ix, iz);
  const b = h(ix + 1, iz);
  const c = h(ix, iz + 1);
  const d = h(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

/**
 * A hazy city backdrop beyond the modelled ring (generic massing — it only has
 * to read as "Turku" through the haze): perimeter blocks and slabs on the two
 * campus street grids, denser and taller towards the city centre (west),
 * with park gaps and the railway corridor left open. Exported for tests.
 */
export function farCity(ext: { minX: number; maxX: number; minZ: number; maxZ: number }, seed: number) {
  const rnd = mulberry32(seed);
  const families: THREE.BufferGeometry[][] = [[], [], []];
  const roofs: THREE.BufferGeometry[] = [];
  const cx = (ext.minX + ext.maxX) / 2;
  const cz = (ext.minZ + ext.maxZ) / 2;
  const margin = 25;
  const cell = 72;
  /** Signed distance (m) from the Rantarata track through the station (direction (−0.57, −0.82), bearing ≈ 325°). */
  const railSide = (x: number, z: number) => (x - 217) * 0.82 - (z + 128) * 0.57;
  const addSlab = (x0: number, z0: number, w: number, d: number, ang: number, h: number, family: number) => {
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const ring: V2[] = [
      [-w / 2, -d / 2],
      [w / 2, -d / 2],
      [w / 2, d / 2],
      [-w / 2, d / 2],
    ].map(([u, v]) => [x0 + u * ca - v * sa, z0 + u * sa + v * ca] as V2);
    // Nothing on the tracks: the two tracks lie 0 … −15.5 m off that line; keep 12 m clear either side.
    const sides = ring.map(([x, z]) => railSide(x, z));
    if (Math.max(...sides) > -27.5 && Math.min(...sides) < 12) return;
    const base = -4.5;
    families[family].push(facadeWalls(ring, base, base + h + 1, { vRef: base + 1, seed: Math.floor(rnd() * 9000) }));
    roofs.push(flatRoofGeometry(ring, [], base + h + 1));
  };
  for (let gx = -1900; gx <= 1900; gx += cell) {
    for (let gz = -1900; gz <= 1900; gz += cell) {
      const x0 = cx + gx;
      const z0 = cz + gz;
      if (x0 > ext.minX - margin && x0 < ext.maxX + margin && z0 > ext.minZ - margin && z0 < ext.maxZ + margin) continue;
      const r = Math.hypot(x0 - cx, z0 - cz);
      if (r > 1900) continue;
      // Kupittaa park (south-west), the railway cutting (north-east), noise parks elsewhere.
      const park = x0 < cx - 120 && z0 > cz + 120 && x0 > cx - 950 && z0 < cz + 760;
      // The railway cutting along the Rantarata line (the block's centre within 45 m of it).
      const rail = Math.abs(railSide(x0, z0)) < 45;
      if (park || rail || noise2(x0 / 260, z0 / 260, seed) < 0.27) continue;
      const west = x0 < cx - 150;
      const fill = (west ? 0.92 : 0.78) - Math.min(0.3, r / 6000);
      if (rnd() > fill) continue;
      const ang = ((rnd() < (west ? 0.75 : 0.5) ? 145.3 : 128.8) - 90) * (Math.PI / 180);
      const storeys = west ? 5 + Math.floor(rnd() * 4) : 3 + Math.floor(rnd() * 4);
      const h = storeys * 3.1;
      const family = rnd() < (west ? 0.35 : 0.15) ? 1 : rnd() < 0.3 ? 2 : 0;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const at = (u: number, v: number): V2 => [x0 + u * ca - v * sa, z0 + u * sa + v * ca];
      if (west && rnd() < 0.55) {
        // Perimeter block round a courtyard (city-centre "umpikortteli").
        const s2 = cell - 14;
        const depth = 12;
        const half = s2 / 2;
        for (const [u, v, w, d] of [
          [0, -half + depth / 2, s2, depth],
          [0, half - depth / 2, s2, depth],
          [-half + depth / 2, 0, depth, s2 - 2 * depth],
          [half - depth / 2, 0, depth, s2 - 2 * depth],
        ] as [number, number, number, number][]) {
          if (rnd() < 0.12) continue;
          const [px, pz] = at(u, v);
          addSlab(px, pz, w, d, ang, h + (rnd() < 0.3 ? 3.1 : 0), family);
        }
      } else {
        // One or two slabs (1960s–80s apartments, offices).
        const count = rnd() < 0.45 ? 2 : 1;
        for (let k = 0; k < count; k++) {
          const w = 26 + rnd() * 30;
          const d = 11 + rnd() * 4;
          const off = count === 2 ? (k ? 1 : -1) * (14 + rnd() * 6) : (rnd() - 0.5) * 10;
          const [px, pz] = at((rnd() - 0.5) * 8, off);
          addSlab(px, pz, w, d, ang, h, family);
        }
      }
    }
  }
  return { families, roofs };
}

/** Urban fabric for the far ring: asphalt, paving and lawn patches and street grids on the campus bearings. */
function makeFarGroundMaterial(ext: { minX: number; maxX: number; minZ: number; maxZ: number }): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  m.name = "far-ground";
  m.customProgramCacheKey = () => "far-ground";
  const uExt = { value: new THREE.Vector4(ext.minX, ext.minZ, ext.maxX, ext.maxZ) };
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uFgExt = uExt;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vFgWorld;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvFgWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vFgWorld;
uniform vec4 uFgExt;
float fgHash( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
float fgNoise( vec2 p ) { vec2 i = floor( p ); vec2 f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( fgHash( i ), fgHash( i + vec2( 1, 0 ) ), u.x ), mix( fgHash( i + vec2( 0, 1 ) ), fgHash( i + vec2( 1, 1 ) ), u.x ), u.y ); }
// Box-filtered street lines along one grid (bearing θ), spacing s, width w.
float fgStreets( vec2 p, float theta, float s, float w ) {
	vec2 a = vec2( cos( theta ), sin( theta ) );
	vec2 q = vec2( dot( p, a ), dot( p, vec2( -a.y, a.x ) ) );
	vec2 fw = max( fwidth( q ), vec2( 1e-3 ) );
	vec2 r = abs( fract( q / s + 0.5 ) - 0.5 ) * s;
	vec2 c = clamp( ( w * 0.5 - r ) / fw + 0.5, 0.0, 1.0 );
	return max( c.x, c.y );
}`,
      )
      .replace(
        "#include <map_fragment>",
        `
	vec2 p = vFgWorld.xz;
	float n1 = fgNoise( p / 48.0 ) * 0.6 + fgNoise( p / 17.0 ) * 0.4;
	float lawn = smoothstep( 0.55, 0.75, fgNoise( p / 140.0 + 3.1 ) );
	vec3 paved = mix( vec3( 0.075, 0.075, 0.072 ), vec3( 0.16, 0.155, 0.145 ), n1 );
	vec3 grassC = mix( vec3( 0.07, 0.085, 0.045 ), vec3( 0.11, 0.115, 0.07 ), n1 );
	vec3 col = mix( paved, grassC, lawn * 0.85 );
	// Streets on the two campus grids, warped a little so they are not ruler-straight.
	vec2 warp = vec2( fgNoise( p / 300.0 ), fgNoise( p / 300.0 + 7.0 ) ) * 30.0;
	float st = max( fgStreets( p + warp, radians( 55.3 ), 96.0, 14.0 ), fgStreets( p - warp, radians( 38.8 ), 112.0, 12.0 ) );
	col = mix( col, vec3( 0.06, 0.061, 0.063 ), st * 0.6 );
	// Next to the modelled ground: blend into a neutral lawn-and-paving tone (no seam at the DTM edge).
	vec2 outside = max( max( uFgExt.xy - p, p - uFgExt.zw ), vec2( 0.0 ) );
	float edge = smoothstep( 0.0, 90.0, length( outside ) );
	col = mix( mix( vec3( 0.085, 0.09, 0.065 ), vec3( 0.12, 0.118, 0.11 ), n1 * 0.5 ), col, edge );
	diffuseColor.rgb *= col;
`,
      );
  };
  return m;
}

// ── The module ──────────────────────────────────────────────────────────────

export async function buildMassing(ctx: TwinContext): Promise<MassingModule> {
  const root = new THREE.Group();
  root.name = "massing";
  const lib = ctx.materials;
  const errors: string[] = [];
  const settle = <T>(p: Promise<T>, what: string) =>
    p.then(
      (v) => v,
      (e: unknown) => {
        errors.push(`${what}: ${e instanceof Error ? e.message : String(e)}`);
        return null;
      },
    );
  const [campus, lod2, terrain, streets] = await Promise.all([
    settle(loadCampus(), "campus.json"),
    settle(loadLod2(), "lod2.json"),
    settle(loadTerrain(), "terrain"),
    settle(loadStreets(), "streets.json"),
  ]);
  const lod2ById = new Map<string, Lod2Building>();
  for (const r of (lod2 as Lod2Data | null)?.buildings ?? []) lod2ById.set(r.id, r);

  // Facade materials per style key (shared by every building of the family).
  const facadeMats = new Map<string, THREE.MeshStandardMaterial>();
  const materialFor = (choice: StyleChoice) => {
    let m = facadeMats.get(choice.key);
    if (!m) {
      m = makeFacadeMaterial(lib, choice.style, { tier: ctx.tier });
      facadeMats.set(choice.key, m);
    }
    return m;
  };
  const roofMats: Record<StyleChoice["roof"], THREE.MeshStandardMaterial> = {
    membrane: lib.variant("concreteFacade", { color: "#97968f", roughness: 1.6 }),
    bitumen: lib.variant("asphalt", { color: "#4a4a49", roughness: 2.1 }),
    sedum: lib.variant("grass", { color: "#7a5a46" }),
    metal: lib.variant("metalWhite", { color: "#a9adb0", roughness: 0.55 }),
  };
  const unitMat = lib.variant("metalWhite", { color: "#b3b7ba", roughness: 0.6 });

  // LOD2 records no campus building links to: match them to OSM outlines by footprint
  // overlap (≥ 30 % of the record), else build them on their own (canopies, sheds).
  const linked = new Set<string>();
  for (const b of campus?.buildings ?? []) for (const id of b.lod2 ?? []) linked.add(id);
  const adopted = new Map<string, Lod2Building[]>();
  const standalone: Lod2Building[] = [];
  for (const rec of lod2ById.values()) {
    if (linked.has(rec.id) || rec.claimedBy) continue;
    const ring = rec.footprint[0];
    if (!ring || ring.length < 3) continue;
    const area = Math.abs(ringArea(ring));
    let best: CampusBuilding | null = null;
    let bestOverlap = 0;
    for (const b of campus?.buildings ?? []) {
      if (b.lod2?.length) continue;
      if (rec.osmId && b.osmId === rec.osmId) {
        best = b;
        break;
      }
      const o = overlapArea(ring, b.polygon, 1);
      if (o > bestOverlap) {
        bestOverlap = o;
        best = b;
      }
    }
    if (best && (bestOverlap >= 0.3 * area || (rec.osmId && best.osmId === rec.osmId))) {
      const list = adopted.get(best.id) ?? [];
      list.push(rec);
      adopted.set(best.id, list);
    } else standalone.push(rec);
  }

  const built: BuiltBuilding[] = [];
  const labels: CSS2DObject[] = [];
  if (campus) {
    for (const b of campus.buildings) {
      try {
        const choice = styleFor(b);
        materialFor(choice);
        // Roofs of this building: its own records (minus parts another hero claims) plus parts
        // other records hand to its role (Joki's hall and tower sit in DataCity's record).
        const parts: { rec: Lod2Building; roof: Lod2Building["roofs"][number] }[] = [];
        for (const id of b.lod2 ?? []) {
          const rec = lod2ById.get(id);
          if (!rec) continue;
          for (const roof of rec.roofs) if (!roof.claimedBy || roof.claimedBy === b.role) parts.push({ rec, roof });
        }
        if (b.role === "biocity" || b.role === "joki" || b.role === "educity") {
          for (const rec of lod2ById.values()) {
            if ((b.lod2 ?? []).includes(rec.id)) continue;
            for (const roof of rec.roofs) if (roof.claimedBy === b.role) parts.push({ rec, roof });
          }
        }
        for (const rec of adopted.get(b.id) ?? []) for (const roof of rec.roofs) if (!roof.claimedBy) parts.push({ rec, roof });
        const bb = parts.length
          ? buildFromLod2(b, parts, choice, terrain)
          : (buildFromParts(b, choice, terrain) ?? buildFromOutline(b, choice, terrain));
        const labelText = b.role ? LABELLED[b.role] : undefined;
        if (labelText) {
          const [lx, lz] = polygonCentroid(b.polygon);
          const top = b.topY ?? b.roofY ?? (b.groundY ?? 0) + b.height;
          const label = makeLabel(labelText, "building", lx, top + 4, lz, "campus");
          label.userData.osmId = b.osmId;
          labels.push(label);
          root.add(label);
          bb.label = label;
        }
        built.push(bb);
      } catch (e) {
        errors.push(`building ${b.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // Unmatched LOD2 records: plain massing that no module claims.
  for (const rec of standalone) {
    try {
      const ring = rec.footprint[0];
      const pseudo: CampusBuilding = {
        id: rec.id,
        osmId: rec.osmId ?? -1,
        levels: rec.storeys ?? 1,
        height: rec.roofY - rec.groundY,
        polygon: ring,
        groundY: rec.groundY,
        roofY: rec.roofY,
        topY: rec.topY,
      };
      const choice = styleFor(pseudo);
      materialFor(choice);
      built.push(buildFromLod2(pseudo, rec.roofs.filter((r) => !r.claimedBy).map((roof) => ({ rec, roof })), choice, terrain));
    } catch (e) {
      errors.push(`lod2 ${rec.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Merged meshes per style; rebuilt when claims change.
  const merged = new THREE.Group();
  merged.name = "massing-buildings";
  root.add(merged);
  let colliders: Collider2D[] = [];

  function clearMerged() {
    for (const child of [...merged.children]) {
      const mesh = child as THREE.Mesh;
      mesh.geometry.dispose();
      merged.remove(mesh);
    }
  }

  function rebuild(claimed: ReadonlySet<number>, skipHeroes: Set<string>) {
    clearMerged();
    const byStyle = new Map<string, THREE.BufferGeometry[]>();
    const byRoof = new Map<StyleChoice["roof"], THREE.BufferGeometry[]>();
    const units: THREE.BufferGeometry[] = [];
    colliders = [];
    for (const bb of built) {
      const hidden = claimed.has(bb.osmId) || (bb.hero !== null && skipHeroes.has(bb.hero));
      // The engine shows/hides labels; it skips those flagged hidden.
      if (bb.label) bb.label.userData.hidden = hidden;
      if (hidden) continue;
      const list = byStyle.get(bb.styleKey) ?? [];
      list.push(...bb.walls);
      byStyle.set(bb.styleKey, list);
      const roofs = byRoof.get(bb.roofKind) ?? [];
      roofs.push(...bb.roofs);
      byRoof.set(bb.roofKind, roofs);
      units.push(...bb.units);
      colliders.push(...bb.colliders);
    }
    for (const [key, geos] of byStyle) {
      if (!geos.length) continue;
      const g = mergeGeometries(geos, false);
      if (!g) continue;
      const mat = facadeMats.get(key);
      if (!mat) continue;
      const mesh = new THREE.Mesh(g, mat);
      mesh.name = `massing-walls-${key}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      merged.add(mesh);
    }
    for (const [kind, geos] of byRoof) {
      if (!geos.length) continue;
      const g = mergeGeometries(geos, false);
      if (!g) continue;
      const mesh = new THREE.Mesh(g, roofMats[kind]);
      mesh.name = `massing-roofs-${kind}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      merged.add(mesh);
    }
    if (units.length) {
      const g = mergeGeometries(units, false);
      if (g) {
        const mesh = new THREE.Mesh(g, unitMat);
        mesh.name = "massing-rooftop-units";
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        merged.add(mesh);
      }
    }
    ctx.invalidate();
  }

  // Terrain, far ground and far city.
  const ext = terrain?.extent ?? (campus?.bounds ?? CAMPUS_BOUNDS);
  const splat = campus || streets ? buildSplat(campus, streets, ext) : null;
  const groundMat = makeGroundMaterial(ctx, splat, ext);
  const terrainStep = ctx.tier === "low" ? 3 : ctx.tier === "high" ? 2 : 1.5;
  const terrainGroup = new THREE.Group();
  terrainGroup.name = "provisional-ground";
  terrainGroup.add(terrainMesh(terrain, terrainStep, groundMat));
  const farMat = makeFarGroundMaterial(ext);
  terrainGroup.add(farGround(terrain, farMat));
  root.add(terrainGroup);

  const city = farCity(ext, 4242);
  const cityGroup = new THREE.Group();
  cityGroup.name = "far-city";
  const cityStyles: FacadeStyle[] = [
    FACADE_PRESETS.residentialRender,
    facadeStyle("brickGrid", { interior: "residential", warmth: 0.85, storey: 3.1, bay: 3.3, window: [1.4, 1.45], blinds: 0.45 }),
    facadeStyle("concreteGrid", { wallColor: "#aeaba4", storey: 3.1 }),
  ];
  const cityMats: THREE.Material[] = [];
  city.families.forEach((geos, i) => {
    if (!geos.length) return;
    const g = mergeGeometries(geos, false);
    geos.forEach((x) => x.dispose());
    if (!g) return;
    const mat = makeFacadeMaterial(lib, cityStyles[i], { tier: ctx.tier === "ultra" ? "high" : ctx.tier });
    cityMats.push(mat);
    const mesh = new THREE.Mesh(g, mat);
    mesh.name = `far-city-walls-${i}`;
    mesh.receiveShadow = true;
    cityGroup.add(mesh);
  });
  if (city.roofs.length) {
    const r = mergeGeometries(city.roofs, false);
    city.roofs.forEach((x) => x.dispose());
    if (r) {
      const mesh = new THREE.Mesh(r, roofMats.bitumen);
      mesh.name = "far-city-roofs";
      cityGroup.add(mesh);
    }
  }
  root.add(cityGroup);

  rebuild(new Set(), new Set());

  const heightAt = (x: number, z: number) => (terrain ? terrain.heightAt(x, z) : 0);

  const massing: MassingModule = {
    id: "massing",
    root,
    labels,
    pickables: [],
    targets: [],
    get colliders() {
      return colliders;
    },
    ready: lib.ready(),
    applyClaims(claimed, opts) {
      terrainGroup.visible = !opts.ground;
      // The far-city backdrop lies beyond the data extent: it stays even when world/context.ts is loaded.
      rebuild(claimed, new Set());
    },
    heightAt,
    warnings: [],
    dispose() {
      clearMerged();
      for (const bb of built) {
        bb.walls.forEach((g) => g.dispose());
        bb.roofs.forEach((g) => g.dispose());
        bb.units.forEach((g) => g.dispose());
      }
      facadeMats.forEach((m) => m.dispose());
      cityMats.forEach((m) => m.dispose());
      Object.values(roofMats).forEach((m) => m.dispose());
      unitMat.dispose();
      groundMat.dispose();
      farMat.dispose();
      splat?.dispose();
    },
  };
  massing.warnings = errors;
  return massing;
}
