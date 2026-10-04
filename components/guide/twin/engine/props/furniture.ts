import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { MaterialLibrary, MaterialName, TwinContext } from "../types";
import { boxUV } from "../render/uv";
import { LUMINANCE } from "../sky/sky";

/**
 * Shared interior furniture for the campus twin (DESIGN §2 props/furniture.ts):
 * work tables, stacking and café chairs, bar stools, laptops, counters, roll-up
 * banners and café tables. Low-poly pieces with metre UVs, built once and
 * drawn with InstancedMesh (one draw call per part and material).
 *
 * Created by the BioCity module; other modules import it but never edit it —
 * ask for additions in the final report instead.
 *
 * Conventions (all pieces):
 * - metres, y up from the floor (y 0 = floor), centred on the origin in plan;
 * - every piece "faces" −z: a chair's sitter looks towards −z (backrest on +z),
 *   a counter's visitor side is −z, a roll-up's printed side faces −z;
 * - a laptop is used from its +z side (screen at its −z edge, facing +z), so a
 *   laptop placed in front of a chair takes the chair's yaw;
 * - tables have their long side along z.
 * Rotate with Placement.ry (radians, three.js rotation.y): ry = 0 keeps −z.
 */

// ── Geometry helpers ─────────────────────────────────────────────────────────

/** A box with metre UVs, its min corner at (x0, y0, z0). */
export function boxAt(x0: number, y0: number, z0: number, w: number, h: number, d: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x0 + w / 2, y0 + h / 2, z0 + d / 2);
  return boxUV(g);
}

/** A box with metre UVs centred at (x, y, z). */
export function boxCentered(x: number, y: number, z: number, w: number, h: number, d: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return boxUV(g);
}

/** Vertical tube (open ends) from y0 to y1 at (x, z). */
export function tube(x: number, z: number, y0: number, y1: number, r: number, segments = 6): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, segments, 1, true);
  g.translate(x, (y0 + y1) / 2, z);
  return boxUV(g);
}

/** Tube between two points (open ends). */
export function tubeBetween(a: THREE.Vector3Like, b: THREE.Vector3Like, r: number, segments = 6): THREE.BufferGeometry {
  const pa = new THREE.Vector3(a.x, a.y, a.z);
  const pb = new THREE.Vector3(b.x, b.y, b.z);
  const dir = pb.clone().sub(pa);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r, r, len, segments, 1, true);
  g.translate(0, len / 2, 0);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  g.applyQuaternion(q);
  g.translate(pa.x, pa.y, pa.z);
  return boxUV(g);
}

/** Merge geometries that share a material (all must be indexed with position/normal/uv). Disposes the inputs. */
export function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error("furniture: could not merge parts");
  for (const p of parts) p.dispose();
  merged.computeBoundingSphere();
  return merged;
}

// ── Pieces ───────────────────────────────────────────────────────────────────

export interface TableParts {
  top: THREE.BufferGeometry;
  frame: THREE.BufferGeometry;
}

/**
 * Folding work/banquet table: laminate top with a thin edge band, square steel
 * legs at the corners with a long stretcher. Long side along z.
 */
export function workTableGeometry(opts: { length?: number; width?: number; height?: number } = {}): TableParts {
  const L = opts.length ?? 1.8;
  const W = opts.width ?? 0.8;
  const H = opts.height ?? 0.74;
  const t = 0.025;
  const top = boxCentered(0, H - t / 2, 0, W, t, L);
  const frame: THREE.BufferGeometry[] = [];
  const leg = 0.035;
  const inset = 0.06;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      frame.push(boxCentered(sx * (W / 2 - inset), (H - t) / 2, sz * (L / 2 - inset - 0.04), leg, H - t, leg));
    }
    // Long apron under each long edge and a low stretcher between the legs.
    frame.push(boxCentered(sx * (W / 2 - inset), H - t - 0.04, 0, 0.02, 0.06, L - 2 * inset - 0.08));
  }
  for (const sz of [-1, 1]) frame.push(boxCentered(0, 0.12, sz * (L / 2 - inset - 0.04), W - 2 * inset, 0.025, 0.025));
  return { top, frame: mergeParts(frame) };
}

export interface ChairParts {
  /** Steel tube frame (legs, back posts). */
  frame: THREE.BufferGeometry;
  /** Seat and backrest shell (plastic or upholstered). */
  shell: THREE.BufferGeometry;
}

/** Stackable conference chair (black frame + shell); the sitter faces −z. */
export function stackingChairGeometry(): ChairParts {
  const seatY = 0.46;
  const frame: THREE.BufferGeometry[] = [];
  const r = 0.011;
  // 11 mm tubes: four sides are plenty (hundreds of chairs share this geometry).
  const n = 4;
  for (const sx of [-1, 1]) {
    // Front leg, rear leg rising into the back post.
    frame.push(tube(sx * 0.2, -0.19, 0, seatY - 0.02, r, n));
    frame.push(tubeBetween({ x: sx * 0.2, y: 0, z: 0.21 }, { x: sx * 0.2, y: seatY - 0.02, z: 0.18 }, r, n));
    frame.push(tubeBetween({ x: sx * 0.2, y: seatY - 0.02, z: 0.18 }, { x: sx * 0.2, y: 0.86, z: 0.24 }, r, n));
    // Side rail under the seat.
    frame.push(tubeBetween({ x: sx * 0.2, y: seatY - 0.03, z: -0.19 }, { x: sx * 0.2, y: seatY - 0.03, z: 0.18 }, r * 0.9, n));
  }
  const shell: THREE.BufferGeometry[] = [];
  const seat = boxCentered(0, seatY, -0.005, 0.45, 0.035, 0.43);
  shell.push(seat);
  const back = new THREE.BoxGeometry(0.44, 0.3, 0.025);
  back.rotateX(-0.16);
  back.translate(0, 0.7, 0.215);
  shell.push(boxUV(back));
  return { frame: mergeParts(frame), shell: mergeParts(shell) };
}

/** Café chair with a one-piece shell on four splayed legs (Maunon sali style); faces −z. */
export function cafeChairGeometry(): ChairParts {
  const seatY = 0.45;
  const frame: THREE.BufferGeometry[] = [];
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ]) {
    frame.push(tubeBetween({ x: sx * 0.22, y: 0, z: sz * 0.22 }, { x: sx * 0.15, y: seatY - 0.02, z: sz * 0.15 }, 0.012, 4));
  }
  const shell: THREE.BufferGeometry[] = [];
  shell.push(boxCentered(0, seatY, 0, 0.46, 0.03, 0.44));
  const back = new THREE.BoxGeometry(0.46, 0.34, 0.03);
  back.rotateX(-0.22);
  back.translate(0, 0.66, 0.2);
  shell.push(boxUV(back));
  return { frame: mergeParts(frame), shell: mergeParts(shell) };
}

export interface StoolParts {
  frame: THREE.BufferGeometry;
  seat: THREE.BufferGeometry;
}

/** Bar stool: round seat with a low back, four splayed legs and a foot ring (seat 0.77 m). */
export function barStoolGeometry(): StoolParts {
  const frame: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    frame.push(
      tubeBetween(
        { x: Math.cos(a) * 0.22, y: 0, z: Math.sin(a) * 0.22 },
        { x: Math.cos(a) * 0.14, y: 0.75, z: Math.sin(a) * 0.14 },
        0.012,
      ),
    );
  }
  const ring = new THREE.TorusGeometry(0.18, 0.008, 4, 20);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, 0.28, 0);
  frame.push(boxUV(ring));
  const seatParts: THREE.BufferGeometry[] = [];
  const seat = new THREE.CylinderGeometry(0.2, 0.19, 0.05, 20);
  seat.translate(0, 0.775, 0);
  seatParts.push(boxUV(seat));
  const back = new THREE.CylinderGeometry(0.2, 0.2, 0.14, 20, 1, true, Math.PI * 0.6, Math.PI * 0.8);
  back.translate(0, 0.87, 0);
  seatParts.push(boxUV(back));
  return { frame: mergeParts(frame), seat: mergeParts(seatParts) };
}

export interface LaptopParts {
  /** Aluminium base and lid back. */
  body: THREE.BufferGeometry;
  /** The display face (give it an emissive material). */
  screen: THREE.BufferGeometry;
}

/** Open 14" laptop on a desk (y 0 = desk top); used from its +z side, screen at −z facing +z. */
export function laptopGeometry(): LaptopParts {
  const w = 0.32;
  const d = 0.22;
  const body: THREE.BufferGeometry[] = [];
  body.push(boxCentered(0, 0.007, 0, w, 0.014, d));
  // Lid opened ~110°: hinge at the base's −z edge.
  const tilt = -0.33;
  const lid = new THREE.BoxGeometry(w, 0.21, 0.006);
  lid.translate(0, 0.105, -0.003);
  lid.rotateX(tilt);
  lid.translate(0, 0.014, -d / 2);
  body.push(boxUV(lid));
  const screen = new THREE.PlaneGeometry(w - 0.02, 0.185);
  screen.translate(0, 0.11, 0.0005);
  screen.rotateX(tilt);
  screen.translate(0, 0.014, -d / 2);
  return { body: mergeParts(body), screen: boxUV(screen) };
}

export interface CounterParts {
  body: THREE.BufferGeometry;
  top: THREE.BufferGeometry;
  /** Front panel (−z side) with 0…1 UVs for a logo/sign texture. */
  front: THREE.BufferGeometry;
}

/** Exhibition / service counter; visitor side −z. */
export function counterGeometry(width = 1.8, height = 1.05, depth = 0.6): CounterParts {
  const body = boxCentered(0, (height - 0.04) / 2, 0, width, height - 0.04, depth);
  const top = boxCentered(0, height - 0.02, 0, width + 0.05, 0.04, depth + 0.05);
  const front = new THREE.PlaneGeometry(width - 0.12, height - 0.24);
  front.rotateY(Math.PI);
  front.translate(0, (height - 0.04) / 2 + 0.02, -depth / 2 - 0.002);
  return { body, top, front };
}

export interface RollupParts {
  /** Foot cassette and pole. */
  stand: THREE.BufferGeometry;
  /** Printed panel (−z side) with 0…1 UVs. */
  panel: THREE.BufferGeometry;
}

/** Roll-up banner (default 0.85 × 2.0 m); printed side faces −z. */
export function rollupGeometry(width = 0.85, height = 2.0): RollupParts {
  const stand: THREE.BufferGeometry[] = [];
  stand.push(boxCentered(0, 0.045, 0.02, width + 0.02, 0.09, 0.22));
  stand.push(tube(0, 0.06, 0.09, height + 0.08, 0.008));
  stand.push(boxCentered(0, height + 0.085, 0, width, 0.02, 0.025));
  const panel = new THREE.PlaneGeometry(width, height);
  panel.rotateY(Math.PI);
  panel.translate(0, 0.09 + height / 2, -0.005);
  // Back of the print (grey) so it is never invisible from behind.
  const back = new THREE.PlaneGeometry(width, height);
  back.translate(0, 0.09 + height / 2, 0.005);
  stand.push(boxUV(back));
  return { stand: mergeParts(stand), panel };
}

export interface CafeTableParts {
  top: THREE.BufferGeometry;
  base: THREE.BufferGeometry;
}

/** Rectangular café/restaurant table on a central pedestal (default 1.2 × 0.8 m). */
export function cafeTableGeometry(opts: { length?: number; width?: number; height?: number } = {}): CafeTableParts {
  const L = opts.length ?? 1.2;
  const W = opts.width ?? 0.8;
  const H = opts.height ?? 0.74;
  const top = boxCentered(0, H - 0.015, 0, W, 0.03, L);
  const base: THREE.BufferGeometry[] = [];
  base.push(tube(0, -L * 0.25, 0.02, H - 0.03, 0.03, 8));
  base.push(tube(0, L * 0.25, 0.02, H - 0.03, 0.03, 8));
  base.push(boxCentered(0, 0.01, -L * 0.25, W * 0.7, 0.02, 0.06));
  base.push(boxCentered(0, 0.01, L * 0.25, W * 0.7, 0.02, 0.06));
  return { top, base: mergeParts(base) };
}

// ── Placement ────────────────────────────────────────────────────────────────

export interface Placement {
  x: number;
  z: number;
  /** Floor height (m). */
  y?: number;
  /** rotation.y (radians). */
  ry?: number;
  /** Uniform scale. */
  s?: number;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpP = new THREE.Vector3();
const tmpS = new THREE.Vector3();

/** Matrix for a placement. */
export function placementMatrix(p: Placement, target = new THREE.Matrix4()): THREE.Matrix4 {
  tmpE.set(0, p.ry ?? 0, 0);
  tmpQ.setFromEuler(tmpE);
  tmpP.set(p.x, p.y ?? 0, p.z);
  tmpS.setScalar(p.s ?? 1);
  return target.compose(tmpP, tmpQ, tmpS);
}

/** Many copies of one geometry as a single draw call. */
export function placeInstanced(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  placements: readonly Placement[],
  opts: { name?: string; castShadow?: boolean; receiveShadow?: boolean } = {},
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, placements.length));
  placements.forEach((p, i) => mesh.setMatrixAt(i, placementMatrix(p, tmpM)));
  mesh.count = placements.length;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  mesh.castShadow = opts.castShadow ?? false;
  mesh.receiveShadow = opts.receiveShadow ?? true;
  if (opts.name) mesh.name = opts.name;
  return mesh;
}

// ── Materials ────────────────────────────────────────────────────────────────

/**
 * An owned copy of a library material for use indoors: lit by the interior
 * environment (ctx.envInterior, ≈400 lux office light) instead of the sky.
 */
export function interiorMaterial(
  ctx: Pick<TwinContext, "materials" | "envInterior">,
  name: MaterialName,
  overrides: Parameters<MaterialLibrary["variant"]>[1] = {},
): THREE.MeshStandardMaterial {
  const m = ctx.materials.variant(name, overrides);
  if (ctx.envInterior) {
    m.envMap = ctx.envInterior;
    m.envMapIntensity = overrides.envMapIntensity ?? 1;
  }
  m.needsUpdate = true;
  return m;
}

export interface FurnitureMaterials {
  /** Light laminate table top. */
  tableTop: THREE.MeshStandardMaterial;
  /** Black powder-coated steel (frames, legs). */
  frame: THREE.MeshStandardMaterial;
  /** Black polypropylene shell. */
  shell: THREE.MeshStandardMaterial;
  /** Brushed aluminium (laptops). */
  aluminium: THREE.MeshStandardMaterial;
  /** Laptop display (emissive). */
  screen: THREE.MeshStandardMaterial;
  /** Black counter body and top. */
  counter: THREE.MeshStandardMaterial;
  counterTop: THREE.MeshStandardMaterial;
  /** Grey print back of roll-ups. */
  rollupBack: THREE.MeshStandardMaterial;
}

/** The common furniture materials (owned by the caller; dispose with the module). */
export function furnitureMaterials(ctx: Pick<TwinContext, "materials" | "envInterior">): FurnitureMaterials {
  return {
    tableTop: interiorMaterial(ctx, "plasterWhite", { color: "#e4e3df", roughness: 0.45 }),
    frame: interiorMaterial(ctx, "blackMatte", { color: "#1b1c1e", roughness: 0.45, metalness: 0.6 }),
    shell: interiorMaterial(ctx, "blackMatte", { color: "#202124", roughness: 0.55 }),
    aluminium: interiorMaterial(ctx, "steel", { color: "#a9adb2", roughness: 0.35 }),
    screen: interiorMaterial(ctx, "screen", {
      color: "#05070a",
      emissive: "#cfd8ff",
      emissiveIntensity: LUMINANCE.ledWall * 0.35,
      roughness: 0.15,
    }),
    counter: interiorMaterial(ctx, "blackMatte", { color: "#0e0e10", roughness: 0.4 }),
    counterTop: interiorMaterial(ctx, "blackMatte", { color: "#17171a", roughness: 0.25 }),
    rollupBack: interiorMaterial(ctx, "plasterGrey", { color: "#8d9095", roughness: 0.8 }),
  };
}
