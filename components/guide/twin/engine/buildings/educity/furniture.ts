import * as THREE from "three";
import { Bucket, box, cylinder, orientedBox, ring, type BoxFaces } from "./geom";

/** Thin frame members (legs, posts, rails) never show their end caps: four sides only. */
const SIDES: BoxFaces = { px: true, nx: true, pz: true, nz: true };

/**
 * EduCity's furniture as low-poly pieces (metres, y 0 = floor, facing −z
 * like props/furniture.ts), baked per material into the level's buckets.
 * Pieces follow the photographs: dark tables on black steel frames, chairs
 * with charcoal seats (birch backs in the cafés), the donut sofa, poufs,
 * high tables with stools, mobile whiteboards.
 */

export type PartKey = "frame" | "top" | "seat" | "birch" | "white" | "fabric" | "metal";

export interface Piece {
  name: string;
  parts: { key: PartKey; geometry: THREE.BufferGeometry }[];
}

function piece(name: string, build: (part: (key: PartKey) => Bucket) => void): Piece {
  const buckets = new Map<PartKey, Bucket>();
  build((key) => {
    let b = buckets.get(key);
    if (!b) {
      b = new Bucket(`${name}:${key}`);
      buckets.set(key, b);
    }
    return b;
  });
  return { name, parts: [...buckets.entries()].map(([key, b]) => ({ key, geometry: b.geometry() })) };
}

/** Classroom/meeting chair: black steel legs, charcoal upholstered seat and back; sitter faces −z. */
export const classroomChair = () =>
  piece("chair", (p) => {
    const f = p("frame");
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      box(f, sx * 0.2 - 0.012, 0, sz * 0.19 - 0.012, sx * 0.2 + 0.012, 0.45, sz * 0.19 + 0.012, SIDES);
    }
    box(f, -0.2, 0.43, 0.19, 0.2, 0.45, 0.21);
    for (const sx of [-1, 1]) box(f, sx * 0.2 - 0.011, 0.45, 0.2, sx * 0.2 + 0.011, 0.84, 0.222, SIDES);
    const s = p("seat");
    box(s, -0.23, 0.45, -0.22, 0.23, 0.5, 0.21);
    box(s, -0.22, 0.56, 0.205, 0.22, 0.86, 0.245);
  });

/** Café chair (ss_007): black legs, charcoal seat, bent birch back; faces −z. */
export const cafeChair = () =>
  piece("cafe-chair", (p) => {
    const f = p("frame");
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      box(f, sx * 0.19 - 0.01, 0, sz * 0.18 - 0.01, sx * 0.19 + 0.01, 0.45, sz * 0.18 + 0.01, SIDES);
    }
    for (const sx of [-1, 1]) box(f, sx * 0.19 - 0.009, 0.45, 0.17, sx * 0.19 + 0.009, 0.66, 0.19, SIDES);
    box(p("seat"), -0.22, 0.45, -0.21, 0.22, 0.5, 0.2);
    // Back: three slanted facets approximating the bent plywood.
    const b = p("birch");
    orientedBox(b, 0, 0.62, 0.21, 0.44, 0.2, 0.025, 0);
    orientedBox(b, -0.25, 0.62, 0.18, 0.08, 0.2, 0.025, -0.6);
    orientedBox(b, 0.25, 0.62, 0.18, 0.08, 0.2, 0.025, 0.6);
  });

/** Rectangular table with a dark laminate top on a black steel frame (long side along x). */
export const darkTable = (length: number, width: number, height = 0.74) =>
  piece(`table-${length}x${width}`, (p) => {
    box(p("top"), -length / 2, height - 0.03, -width / 2, length / 2, height, width / 2);
    const f = p("frame");
    const lx = length / 2 - 0.06;
    const lz = width / 2 - 0.06;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) box(f, sx * lx - 0.02, 0, sz * lz - 0.02, sx * lx + 0.02, height - 0.03, sz * lz + 0.02, SIDES);
      box(f, sx * lx - 0.015, height - 0.09, -lz, sx * lx + 0.015, height - 0.03, lz);
    }
    box(f, -lx, height - 0.09, -0.015, lx, height - 0.05, 0.015);
  });

/** Round café table on a black pedestal (birch or dark top). */
export const roundTable = (r: number, height: number, top: "birch" | "top") =>
  piece(`round-table-${r}-${height}-${top}`, (p) => {
    const t = p(top);
    cylinder(t, 0, 0, r, height - 0.03, height, 20);
    ring(t, 0, 0, 0, r, height, 20, true);
    const f = p("frame");
    cylinder(f, 0, 0, 0.035, 0.02, height - 0.03, 6);
    cylinder(f, 0, 0, r * 0.62, 0, 0.025, 14);
    ring(f, 0, 0, 0, r * 0.62, 0.025, 14, true);
  });

/** Bar stool with a round birch seat and a black frame. */
export const barStool = () =>
  piece("bar-stool", (p) => {
    const f = p("frame");
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      orientedBox(f, Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15, 0.022, 0.72, 0.022, 0);
    }
    const ringY = 0.28;
    box(f, -0.16, ringY, -0.012, 0.16, ringY + 0.02, 0.012);
    box(f, -0.012, ringY, -0.16, 0.012, ringY + 0.02, 0.16);
    const s = p("birch");
    cylinder(s, 0, 0, 0.19, 0.72, 0.76, 14);
    ring(s, 0, 0, 0, 0.19, 0.76, 14, true);
  });

/** Donut sofa (ring seat round a central back), dark grey upholstery. */
export const donutSofa = (r = 1.55) =>
  piece(`donut-${r}`, (p) => {
    const s = p("fabric");
    const ri = r * 0.5;
    cylinder(s, 0, 0, r, 0, 0.42, 28);
    ring(s, 0, 0, ri, r, 0.42, 28, true);
    cylinder(s, 0, 0, ri, 0.42, 0.78, 20);
    ring(s, 0, 0, 0, ri, 0.78, 20, true);
  });

/** Pouf (instance colour). */
export const pouf = (r = 0.24, h = 0.42) =>
  piece(`pouf-${r}`, (p) => {
    const s = p("fabric");
    cylinder(s, 0, 0, r, 0, h, 12);
    ring(s, 0, 0, 0, r, h, 12, true);
  });

/** Seat cushion for Taidon portaat (instance colour), 1 m long; scale along x for longer ones. */
export const cushion = () =>
  piece("cushion", (p) => {
    box(p("fabric"), -0.5, 0, -0.24, 0.5, 0.075, 0.24);
  });

/** Birch-plywood box table / stool (0.6 × 0.45 × 0.6). */
export const boxTable = () =>
  piece("box-table", (p) => {
    box(p("birch"), -0.3, 0, -0.3, 0.3, 0.45, 0.3);
  });

/** Mobile whiteboard (1.5 × 1.0 m board on a black steel frame with castors). */
export const whiteboard = () =>
  piece("whiteboard", (p) => {
    box(p("white"), -0.75, 0.85, -0.015, 0.75, 1.85, 0.015);
    const f = p("frame");
    box(f, -0.79, 0.81, -0.025, 0.79, 0.85, 0.025);
    box(f, -0.79, 1.85, -0.025, 0.79, 1.89, 0.025);
    for (const sx of [-1, 1]) {
      box(f, sx * 0.77 - 0.02, 0.06, -0.02, sx * 0.77 + 0.02, 1.89, 0.02);
      box(f, sx * 0.77 - 0.02, 0.04, -0.3, sx * 0.77 + 0.02, 0.08, 0.3);
    }
  });

/** High table (bar height 1.05 m) with a black steel frame and a dark top, 1.8 × 0.7. */
export const highTable = () =>
  piece("high-table", (p) => {
    box(p("top"), -0.9, 1.02, -0.35, 0.9, 1.05, 0.35);
    const f = p("frame");
    for (const sx of [-1, 1]) {
      box(f, sx * 0.84 - 0.02, 0, -0.3, sx * 0.84 + 0.02, 1.02, -0.26);
      box(f, sx * 0.84 - 0.02, 0, 0.26, sx * 0.84 + 0.02, 1.02, 0.3);
      box(f, sx * 0.84 - 0.02, 0.0, -0.3, sx * 0.84 + 0.02, 0.04, 0.3);
    }
    box(f, -0.84, 0.25, -0.02, 0.84, 0.29, 0.02);
  });

/** Roll-up banner stand (cassette, pole, top bar); the printed panel is drawn separately with atlas UVs. */
export const rollupStand = () =>
  piece("rollup-stand", (p) => {
    const m = p("metal");
    box(m, -0.43, 0, -0.1, 0.43, 0.09, 0.1);
    box(m, -0.01, 0.09, 0.07, 0.01, 2.1, 0.09);
    box(m, -0.43, 2.08, -0.012, 0.43, 2.1, 0.012);
  });

/** A placement in the E frame (y = floor). */
export interface Place {
  x: number;
  y: number;
  z: number;
  ry?: number;
  /** Non-uniform scale (x, y, z). */
  s?: [number, number, number];
  color?: THREE.ColorRepresentation;
}

/**
 * Collects placements per piece and level group, then bakes them into the
 * module's buckets: static furniture merged per material and level is one
 * draw call (instancing would cost one per piece and part). Per-placement
 * colours go to the vertex colours of the fabric bucket.
 */
export class Furnisher {
  private sets = new Map<string, { piece: Piece; group: string; places: Place[] }>();

  add(group: string, p: Piece, place: Place): void {
    const key = `${group}|${p.name}`;
    let set = this.sets.get(key);
    if (!set) {
      set = { piece: p, group, places: [] };
      this.sets.set(key, set);
    }
    set.places.push(place);
  }

  /** Number of placements (tests). */
  get count(): number {
    let n = 0;
    for (const s of this.sets.values()) n += s.places.length;
    return n;
  }

  /**
   * Bake every placement into `bucket(key, group)`; returns the triangle count.
   * Fabric buckets must carry a "color" attribute (the placement colour).
   */
  bake(bucket: (key: PartKey, group: string) => Bucket): number {
    let tris = 0;
    const m = new THREE.Matrix4();
    const nm = new THREE.Matrix3();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (const { piece: pc, group, places } of this.sets.values()) {
      for (const { key, geometry } of pc.parts) {
        const b = bucket(key, group);
        const P = geometry.getAttribute("position");
        const N = geometry.getAttribute("normal");
        const U = geometry.getAttribute("uv");
        for (const pl of places) {
          e.set(0, pl.ry ?? 0, 0);
          q.setFromEuler(e);
          pos.set(pl.x, pl.y, pl.z);
          scl.set(pl.s?.[0] ?? 1, pl.s?.[1] ?? 1, pl.s?.[2] ?? 1);
          m.compose(pos, q, scl);
          nm.getNormalMatrix(m);
          if (key === "fabric") b.color(pl.color ?? "#3f464e");
          for (let i = 0; i < P.count; i++) {
            v.fromBufferAttribute(P, i).applyMatrix4(m);
            n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
            b.vertex([v.x, v.y, v.z], [n.x, n.y, n.z], [U.getX(i), U.getY(i)]);
          }
          tris += P.count / 3;
        }
      }
    }
    for (const { piece: pc } of this.sets.values()) for (const part of pc.parts) part.geometry.dispose();
    this.sets.clear();
    return tris;
  }
}
