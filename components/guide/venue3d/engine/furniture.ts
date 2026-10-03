import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { ReadyTexture } from "./textures";

/** Shared materials — created once per scene build and disposed with it. */
export function makeMaterials() {
  return {
    black: new THREE.MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.5, metalness: 0.1 }),
    blackTop: new THREE.MeshStandardMaterial({ color: 0x141419, roughness: 0.32, metalness: 0.15 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.35, metalness: 0.7 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x121215, roughness: 0.6, metalness: 0.05 }),
    tableTop: new THREE.MeshStandardMaterial({ color: 0x8f897f, roughness: 0.7, metalness: 0 }),
    tableLeg: new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.5, metalness: 0.6 }),
    chair: new THREE.MeshStandardMaterial({ color: 0x24242b, roughness: 0.7 }),
    laptop: new THREE.MeshStandardMaterial({ color: 0x6f7480, roughness: 0.35, metalness: 0.8 }),
    screen: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.62, 1.1) }),
    violet: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.15, 4.2) }),
    violetSoft: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.42, 1.4) }),
    warmLamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.9) }),
  };
}
export type Materials = ReturnType<typeof makeMaterials>;

/** Black high counter (1.4 × 1.05 × 0.6 m) in the event render style. */
export function counterGeometry(width = 1.4, height = 1.05, depth = 0.6) {
  const body = new RoundedBoxGeometry(width, height - 0.04, depth, 2, 0.015);
  body.translate(0, (height - 0.04) / 2, 0);
  const top = new RoundedBoxGeometry(width + 0.06, 0.04, depth + 0.06, 2, 0.01);
  top.translate(0, height - 0.02, 0);
  return { body, top };
}

/** Bar stool: round seat with a low back, four splayed legs and a foot ring. */
export function stoolGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const seat = new THREE.CylinderGeometry(0.2, 0.19, 0.06, 28);
  seat.translate(0, 0.77, 0);
  parts.push(seat);
  const back = new THREE.CylinderGeometry(0.2, 0.2, 0.16, 28, 1, true, Math.PI * 0.6, Math.PI * 0.8);
  back.translate(0, 0.88, 0);
  parts.push(back);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.CylinderGeometry(0.012, 0.014, 0.78, 6);
    leg.rotateZ(0.08);
    leg.rotateY(-a);
    leg.translate(Math.cos(a) * 0.16, 0.38, Math.sin(a) * 0.16);
    parts.push(leg);
  }
  const ring = new THREE.TorusGeometry(0.17, 0.008, 6, 28);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, 0.3, 0);
  parts.push(ring);
  return mergeGeometries(parts)!;
}

/** Folding work table 1.8 × 0.8 m (or custom), with two side frames. */
export function tableGeometry(length = 1.8, width = 0.8, height = 0.74) {
  const top = new THREE.BoxGeometry(width, 0.03, length);
  top.translate(0, height - 0.015, 0);
  const legs: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    const frame = new THREE.BoxGeometry(width * 0.86, 0.03, 0.03);
    frame.translate(0, 0.08, s * (length / 2 - 0.12));
    legs.push(frame);
    for (const t of [-1, 1]) {
      const leg = new THREE.BoxGeometry(0.035, height - 0.03, 0.035);
      leg.translate(t * (width / 2 - 0.08), (height - 0.03) / 2, s * (length / 2 - 0.12));
      legs.push(leg);
    }
  }
  return { top, legs: mergeGeometries(legs)! };
}

/** Simple stacking chair facing +z. */
export function chairGeometry() {
  const parts: THREE.BufferGeometry[] = [];
  const seat = new THREE.BoxGeometry(0.44, 0.04, 0.42);
  seat.translate(0, 0.46, 0);
  parts.push(seat);
  const back = new THREE.BoxGeometry(0.44, 0.36, 0.03);
  back.rotateX(-0.12);
  back.translate(0, 0.7, -0.2);
  parts.push(back);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.CylinderGeometry(0.012, 0.012, 0.46, 6);
      leg.translate(sx * 0.19, 0.23, sz * 0.18);
      parts.push(leg);
    }
  }
  return mergeGeometries(parts)!;
}

/** Open laptop: base + screen (screen as a separate geometry so it can glow). */
export function laptopGeometry() {
  const base = new THREE.BoxGeometry(0.32, 0.012, 0.22);
  base.translate(0, 0.006, 0);
  const screen = new THREE.BoxGeometry(0.32, 0.21, 0.008);
  screen.rotateX(-0.28);
  screen.translate(0, 0.11, -0.13);
  return { base, screen };
}

/** Place many copies of a geometry as one draw call. */
export function instanced(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  transforms: { x: number; y?: number; z: number; ry?: number; s?: number }[],
) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  transforms.forEach((t, i) => {
    e.set(0, t.ry ?? 0, 0);
    q.setFromEuler(e);
    p.set(t.x, t.y ?? 0, t.z);
    s.setScalar(t.s ?? 1);
    m.compose(p, q, s);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/**
 * Partner booth: lit back wall with the partner's mark, counter, two stools,
 * violet base line. Built facing +z; the caller rotates/positions it.
 */
export function buildBooth(
  mats: Materials,
  sign: ReadyTexture,
  stool: THREE.BufferGeometry,
  opts: { width?: number; height?: number; open?: boolean } = {},
) {
  const width = opts.width ?? 3;
  const height = opts.height ?? 2.4;
  const g = new THREE.Group();

  const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.08), mats.black);
  wall.position.set(0, height / 2, -0.6);
  g.add(wall);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.08, height - 0.08),
    new THREE.MeshBasicMaterial({ map: sign.texture, color: new THREE.Color(1.15, 1.15, 1.2) }),
  );
  face.position.set(0, height / 2, -0.555);
  g.add(face);

  const bar = new THREE.Mesh(new THREE.BoxGeometry(width, 0.035, 0.05), opts.open ? mats.violetSoft : mats.violet);
  bar.position.set(0, height + 0.02, -0.56);
  g.add(bar);
  const base = new THREE.Mesh(new THREE.BoxGeometry(width, 0.025, 0.04), opts.open ? mats.violetSoft : mats.violet);
  base.position.set(0, 0.015, -0.52);
  g.add(base);

  const { body, top } = counterGeometry(1.6, 1.05, 0.55);
  const counter = new THREE.Mesh(body, mats.black);
  const counterTop = new THREE.Mesh(top, mats.blackTop);
  counter.position.z = 0.35;
  counterTop.position.z = 0.35;
  g.add(counter, counterTop);

  for (const s of [-0.42, 0.42]) {
    const st = new THREE.Mesh(stool, mats.metal);
    st.position.set(s, 0, 1.0);
    st.rotation.y = Math.PI;
    g.add(st);
  }
  return g;
}
