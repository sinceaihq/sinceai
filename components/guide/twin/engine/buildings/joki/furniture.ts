import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { merge, metreUV, pbr, rod } from "./kit";

/**
 * Furniture for Joki (built facing +z, standing on y = 0, centred on x/z;
 * the caller places them, usually as InstancedMesh). Split by material so
 * each piece is one draw call per material for any number of copies.
 * Dimensions are real (m).
 */

/** Rounded box with metre UVs, bottom at y0. */
export function softBox(w: number, h: number, d: number, radius: number, x = 0, y0 = 0, z = 0, seg = 2): THREE.BufferGeometry {
  const g = new RoundedBoxGeometry(w, h, d, seg, Math.min(radius, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  g.translate(x, y0 + h / 2, z);
  return metreUV(g);
}

/** Plain box (12 triangles) with metre UVs, bottom at y0. */
export function slab(w: number, h: number, d: number, x = 0, y0 = 0, z = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y0 + h / 2, z);
  return metreUV(g);
}

/**
 * Banquet table, long axis along x, as one geometry for a zone's uber
 * material (light laminate top, dark steel legs and aprons) — 84 triangles.
 * Built 1 × 1 m in plan: instances scale x/z to the table's size.
 */
export function table(height = 0.74, topColor = "#e9e8e4", frameColor = "#2a2b2e"): THREE.BufferGeometry {
  const top = pbr(slab(1, 0.028, 1, 0, height - 0.028, 0), topColor, 0.42, 0);
  const frame: THREE.BufferGeometry[] = [];
  // Legs 9 cm in from the ends of a 1.8 m table (scaled with it), aprons along the long sides.
  const lx = 0.45;
  const lz = 0.41;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) frame.push(slab(0.018, height - 0.03, 0.04, sx * lx, 0, sz * lz));
  frame.push(slab(0.9, 0.05, 0.025, 0, height - 0.08, -lz));
  frame.push(slab(0.9, 0.05, 0.025, 0, height - 0.08, lz));
  return merge([top, pbr(merge(frame), frameColor, 0.45, 0.7)], ["color", "jkRM"]);
}

/** Stacking chair facing +z: black shell (seat + back) on a light steel frame, one geometry for an uber material. */
export function chair(shellColor = "#18191b", frameColor = "#9a9da0"): THREE.BufferGeometry {
  // ≈ 72 triangles: hundreds of these fill the build areas.
  const seat = slab(0.46, 0.035, 0.44, 0, 0.445, 0.01);
  const back = slab(0.44, 0.3, 0.025, 0, 0, 0);
  back.rotateX(-0.16);
  back.translate(0, 0.53, -0.21);
  const legs: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    legs.push(rod([sx * 0.2, 0, 0.2], [sx * 0.19, 0.445, 0.18], 0.009, 4));
    legs.push(rod([sx * 0.2, 0, -0.2], [sx * 0.19, 0.445, -0.18], 0.009, 4));
    legs.push(rod([sx * 0.19, 0.445, -0.18], [sx * 0.19, 0.75, -0.25], 0.008, 4));
  }
  return merge([pbr(merge([seat, back]), shellColor, 0.55, 0), pbr(merge(legs), frameColor, 0.3, 1)], ["color", "jkRM"]);
}

/** Open laptop: aluminium body (uber paint) and the lit screen (separate for the emissive material). */
export function laptop(): { body: THREE.BufferGeometry; screen: THREE.BufferGeometry } {
  const base = slab(0.31, 0.014, 0.215);
  const lid = slab(0.31, 0.205, 0.008);
  lid.rotateX(-0.32);
  lid.translate(0, 0.012, -0.104);
  const screen = new THREE.PlaneGeometry(0.28, 0.17);
  screen.rotateX(-0.32);
  screen.translate(0, 0.012 + 0.1 * Math.cos(0.32), -0.104 + 0.1 * Math.sin(0.32) + 0.0055);
  // Screen: the plane's 0…1 UVs (the screen image once over the panel).
  return { body: pbr(merge([base, lid]), "#a9adb2", 0.32, 0.9), screen };
}

/** High counter (Showroom / stands), front facing +z: body, glossy top and the violet kick light. */
export function counter(width = 1.8, height = 1.05, depth = 0.6): {
  body: THREE.BufferGeometry;
  top: THREE.BufferGeometry;
  glow: THREE.BufferGeometry;
  front: THREE.BufferGeometry;
} {
  const body = softBox(width, height - 0.04, depth, 0.012, 0, 0, 0, 2);
  const top = softBox(width + 0.06, 0.04, depth + 0.08, 0.008, 0, height - 0.04, 0.02, 2);
  // Recessed kick (the light strip sits in it) — a thin emissive line along the front base
  // and a line under the top's front edge.
  const kick = new THREE.BoxGeometry(width - 0.04, 0.012, 0.012);
  kick.translate(0, 0.03, depth / 2 + 0.004);
  const under = new THREE.BoxGeometry(width + 0.02, 0.01, 0.01);
  under.translate(0, height - 0.048, depth / 2 + 0.05);
  // Logo panel on the front (company counter front texture).
  const front = new THREE.PlaneGeometry(width * 0.62, (width * 0.62) / 3);
  front.translate(0, height * 0.55, depth / 2 + 0.002);
  return { body, top, glow: merge([metreUV(kick), metreUV(under)]), front };
}

/** Bar stool for an uber material: black seat with a low back ring, chrome legs and foot ring (one geometry). */
export function barStoolPbr(): THREE.BufferGeometry {
  const s = barStool();
  return merge([pbr(s.seat, "#121214", 0.42, 0), pbr(s.frame, "#d6d8da", 0.12, 1)], ["color", "jkRM"]);
}

/** Bar stool: black seat with a low back ring, chrome legs and foot ring. */
export function barStool(): { seat: THREE.BufferGeometry; frame: THREE.BufferGeometry } {
  const seatTop = new THREE.CylinderGeometry(0.19, 0.18, 0.06, 28);
  seatTop.translate(0, 0.77, 0);
  const back = new THREE.CylinderGeometry(0.19, 0.19, 0.12, 28, 1, true, Math.PI * 0.65, Math.PI * 0.7);
  back.translate(0, 0.86, 0);
  const seat = merge([metreUV(seatTop), metreUV(back)]);
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    parts.push(rod([Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2], [Math.cos(a) * 0.13, 0.75, Math.sin(a) * 0.13], 0.011, 6));
  }
  const ring = new THREE.TorusGeometry(0.17, 0.008, 6, 32);
  ring.rotateX(Math.PI / 2);
  ring.translate(0, 0.3, 0);
  parts.push(metreUV(ring));
  return { seat, frame: merge(parts) };
}

/** Upholstered pouf / ottoman (round, soft edge). */
export function pouf(radius: number, height: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const e = Math.min(0.06, height * 0.3);
  pts.push(new THREE.Vector2(0, 0));
  pts.push(new THREE.Vector2(radius - e, 0));
  for (let i = 0; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(radius - e + Math.cos(a) * e, e + Math.sin(a) * e));
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(radius - e + Math.cos(a) * e, height - e + Math.sin(a) * e));
  }
  pts.push(new THREE.Vector2(0, height));
  const g = new THREE.LatheGeometry(pts, 36);
  return metreUV(g);
}

/** Three-step dark timber bleacher (floor 3 workshop): steps rise towards −z (the back). */
export function bleacher(width = 1.6, stepDepth = 0.45, stepRise = 0.42): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const h = stepRise * (i + 1);
    parts.push(softBox(width, h, stepDepth, 0.01, 0, 0, stepDepth * (1 - i)));
  }
  return merge(parts);
}

/** Ceiling track spot: black can + bright lens (separate geometries), hanging 0.25 m. */
export function trackSpot(): { body: THREE.BufferGeometry; lens: THREE.BufferGeometry } {
  const can = new THREE.CylinderGeometry(0.045, 0.05, 0.16, 14);
  can.rotateX(0.5);
  can.translate(0, -0.16, 0.03);
  const stem = new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6);
  stem.translate(0, -0.04, 0);
  const lens = new THREE.CircleGeometry(0.035, 14);
  lens.rotateX(Math.PI / 2 + 0.5);
  lens.translate(0, -0.23, 0.067);
  return { body: merge([metreUV(can), metreUV(stem)]), lens: metreUV(lens) };
}

/** Projector hung from the ceiling (box + lens barrel). */
export function projector(): THREE.BufferGeometry {
  return merge([softBox(0.45, 0.16, 0.5, 0.02, 0, -0.3, 0), rod([0, -0.22, 0.25], [0, -0.22, 0.31], 0.05, 14), rod([0, -0.14, 0], [0, 0, 0], 0.02, 6)]);
}

/** Round ceiling downlight disc (lens), facing down. */
export function downlightDisc(r = 0.075): THREE.BufferGeometry {
  const g = new THREE.CircleGeometry(r, 16);
  g.rotateX(Math.PI / 2);
  return metreUV(g);
}

/** VR "egg" chair (Futurescapes): white shell and the blue upholstered inside. */
export function eggChair(): { shell: THREE.BufferGeometry; inner: THREE.BufferGeometry } {
  const shell = new THREE.SphereGeometry(0.62, 28, 18, Math.PI * 0.15, Math.PI * 1.7, 0.05 * Math.PI, 0.75 * Math.PI);
  shell.scale(1, 1.15, 0.95);
  shell.translate(0, 0.95, 0);
  const inner = new THREE.SphereGeometry(0.58, 28, 18, Math.PI * 0.15, Math.PI * 1.7, 0.07 * Math.PI, 0.72 * Math.PI);
  inner.scale(1, 1.15, 0.95);
  inner.translate(0, 0.95, 0.005);
  // Inner faces point inwards.
  const idx = inner.getIndex();
  if (idx) {
    const a = idx.array as Uint16Array | Uint32Array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = t;
    }
  }
  const nor = inner.getAttribute("normal");
  for (let i = 0; i < nor.count; i++) nor.setXYZ(i, -nor.getX(i), -nor.getY(i), -nor.getZ(i));
  const base = new THREE.CylinderGeometry(0.28, 0.3, 0.04, 24);
  base.translate(0, 0.02, 0);
  const stem = new THREE.CylinderGeometry(0.05, 0.05, 0.36, 10);
  stem.translate(0, 0.2, 0);
  shell.rotateY(Math.PI);
  inner.rotateY(Math.PI);
  return { shell: merge([metreUV(shell), metreUV(base), metreUV(stem)]), inner: metreUV(inner) };
}

/**
 * Wall-mounted screen (TV / display): black bezel box + screen plane facing +z, both hanging from
 * the origin (top edge at y 0) — place them at the same point.
 */
export function wallScreen(w: number, h: number): { bezel: THREE.BufferGeometry; screen: THREE.BufferGeometry } {
  const bezel = softBox(w, h, 0.05, 0.008, 0, -h, 0);
  // The panel keeps the plane's 0…1 UVs: screen images are drawn once over the whole panel.
  const screen = new THREE.PlaneGeometry(w - 0.03, h - 0.03);
  screen.translate(0, -h / 2, 0.0255);
  return { bezel, screen };
}
