/**
 * Geometry helpers for the campus data build (scripts/twin/build-campus-data.mjs).
 *
 * Campus frame (components/guide/twin/engine/types.ts): metres, origin =
 * BioCity's OSM centroid (60.44932 N, 22.29326 E), +x east, +z south,
 * y = h(N2000) − 23.20. Rings are [x, z] lists, counter-clockwise seen from
 * above (+y) — the shoelace sum over (x, z) is negative — and never closed.
 */

export const ORIGIN = { lat: 60.44932, lon: 22.29326 };
/** 111320 · cos(60.44932°) and 110540 m per degree (SPEC §1.1). */
export const KX = 54902.3;
export const KZ = 110540;
/** N2000 height of y = 0 (SPEC §1.2). */
export const DATUM = 23.2;

export const r1 = (v) => Math.round(v * 10) / 10;
export const r2 = (v) => Math.round(v * 100) / 100;
export const yOf = (n2000) => r2(n2000 - DATUM);

export function geoToLocal(lat, lon) {
  return [(lon - ORIGIN.lon) * KX, -(lat - ORIGIN.lat) * KZ];
}

// ── ETRS-GK23 (EPSG:3877) → WGS84/ETRS89 → campus ──────────────────────────
// Transverse Mercator on GRS80, central meridian 23° E, k0 = 1,
// false easting 23 500 000 m. Krüger series (Karney 2011), sub-millimetre.
const A = 6378137;
const F = 1 / 298.257222101;
const N = F / (2 - F);
const A_HAT = (A / (1 + N)) * (1 + (N * N) / 4 + N ** 4 / 64);
const BETA = [
  N / 2 - (2 / 3) * N ** 2 + (37 / 96) * N ** 3 - (1 / 360) * N ** 4,
  (1 / 48) * N ** 2 + (1 / 15) * N ** 3 - (437 / 1440) * N ** 4,
  (17 / 480) * N ** 3 - (37 / 840) * N ** 4,
  (4397 / 161280) * N ** 4,
];
const DELTA = [
  2 * N - (2 / 3) * N ** 2 - 2 * N ** 3 + (116 / 45) * N ** 4,
  (7 / 3) * N ** 2 - (8 / 5) * N ** 3 - (227 / 45) * N ** 4,
  (56 / 15) * N ** 3 - (136 / 35) * N ** 4,
  (4279 / 630) * N ** 4,
];
const LON0 = (23 * Math.PI) / 180;
const FE = 23500000;

/** EPSG:3877 easting/northing → [lat, lon] degrees. */
export function gk23ToGeo(easting, northing) {
  const xi = northing / A_HAT;
  const eta = (easting - FE) / A_HAT;
  let xi1 = xi;
  let eta1 = eta;
  for (let j = 1; j <= 4; j++) {
    xi1 -= BETA[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    eta1 -= BETA[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }
  const chi = Math.asin(Math.sin(xi1) / Math.cosh(eta1));
  let phi = chi;
  for (let j = 1; j <= 4; j++) phi += DELTA[j - 1] * Math.sin(2 * j * chi);
  const lam = LON0 + Math.atan2(Math.sinh(eta1), Math.cos(xi1));
  return [(phi * 180) / Math.PI, (lam * 180) / Math.PI];
}

/** EPSG:3877 → campus [x, z]. */
export function gk23ToLocal(easting, northing) {
  const [lat, lon] = gk23ToGeo(easting, northing);
  return geoToLocal(lat, lon);
}

// ── Rings and polylines ─────────────────────────────────────────────────────

/** Shoelace sum over (x, z); negative = counter-clockwise seen from above. */
export function shoelace(ring) {
  let s = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % n];
    s += x1 * z2 - x2 * z1;
  }
  return s / 2;
}

export const ringArea = (ring) => Math.abs(shoelace(ring));

/** Drop a closing point and consecutive duplicates (after rounding). */
export function cleanRing(ring, round = r1) {
  const out = [];
  for (const [x, z] of ring) {
    const p = [round(x), round(z)];
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  while (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop();
  return out;
}

/** Counter-clockwise from above (outer rings). */
export function ccw(ring) {
  return shoelace(ring) > 0 ? [...ring].reverse() : ring;
}

/** Clockwise from above (holes). */
export function cw(ring) {
  return shoelace(ring) < 0 ? [...ring].reverse() : ring;
}

export function centroid(ring) {
  let a = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, z1] = ring[i];
    const [x2, z2] = ring[(i + 1) % n];
    const f = x1 * z2 - x2 * z1;
    a += f;
    cx += (x1 + x2) * f;
    cz += (z1 + z2) * f;
  }
  if (Math.abs(a) < 1e-9) {
    const m = ring.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]);
    return [m[0] / ring.length, m[1] / ring.length];
  }
  return [cx / (3 * a), cz / (3 * a)];
}

export function bbox(points) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

export function pointInRing([px, pz], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

export function distToSegment([px, pz], [ax, az], [bx, bz]) {
  const dx = bx - ax;
  const dz = bz - az;
  const l2 = dx * dx + dz * dz;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

/** Nearest point on a polyline: { d, point, seg, t }. */
export function nearestOnLine(p, line) {
  let best = { d: Infinity, point: line[0], seg: 0, t: 0 };
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, az] = line[i];
    const [bx, bz] = line[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / l2));
    const q = [ax + t * dx, az + t * dz];
    const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (d < best.d) best = { d, point: q, seg: i, t };
  }
  return best;
}

export function distToRingEdge(p, ring) {
  let d = Infinity;
  for (let i = 0; i < ring.length; i++) d = Math.min(d, distToSegment(p, ring[i], ring[(i + 1) % ring.length]));
  return d;
}

export function lineLength(line) {
  let s = 0;
  for (let i = 1; i < line.length; i++)
    s += Math.hypot(line[i][0] - line[i - 1][0], line[i][line[i].length - 1] - line[i - 1][line[i - 1].length - 1]);
  return s;
}

/** Douglas–Peucker on [x, z] (or [x, y, z]: uses x and the last coordinate). */
export function simplifyLine(line, tol) {
  if (line.length < 3) return line;
  const keep = new Uint8Array(line.length);
  keep[0] = 1;
  keep[line.length - 1] = 1;
  const xz = (p) => [p[0], p[p.length - 1]];
  const stack = [[0, line.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let maxD = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = distToSegment(xz(line[i]), xz(line[a]), xz(line[b]));
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx >= 0 && maxD > tol) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

/** Simplify a closed ring (keeps at least a triangle). */
export function simplifyRing(ring, tol) {
  if (ring.length <= 4) return ring;
  // Split at the vertex farthest from the first one so both halves are open lines.
  let far = 0;
  let farD = -1;
  for (let i = 1; i < ring.length; i++) {
    const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]);
    if (d > farD) {
      farD = d;
      far = i;
    }
  }
  const a = simplifyLine(ring.slice(0, far + 1), tol);
  const b = simplifyLine([...ring.slice(far), ring[0]], tol);
  const out = [...a, ...b.slice(1, -1)];
  return out.length >= 3 ? out : ring;
}

// ── Clipping to the data extent ─────────────────────────────────────────────

/** Sutherland–Hodgman clip of a ring against an axis-aligned rectangle. */
export function clipRingToRect(ring, { minX, maxX, minZ, maxZ }) {
  const edges = [(p) => p[0] >= minX, (p) => p[0] <= maxX, (p) => p[1] >= minZ, (p) => p[1] <= maxZ];
  const cut = [
    (a, b) => [minX, a[1] + ((b[1] - a[1]) * (minX - a[0])) / (b[0] - a[0])],
    (a, b) => [maxX, a[1] + ((b[1] - a[1]) * (maxX - a[0])) / (b[0] - a[0])],
    (a, b) => [a[0] + ((b[0] - a[0]) * (minZ - a[1])) / (b[1] - a[1]), minZ],
    (a, b) => [a[0] + ((b[0] - a[0]) * (maxZ - a[1])) / (b[1] - a[1]), maxZ],
  ];
  let out = ring;
  for (let e = 0; e < 4 && out.length; e++) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      const prev = input[(i + input.length - 1) % input.length];
      const inCur = edges[e](cur);
      const inPrev = edges[e](prev);
      if (inCur) {
        if (!inPrev) out.push(cut[e](prev, cur));
        out.push(cur);
      } else if (inPrev) {
        out.push(cut[e](prev, cur));
      }
    }
  }
  return out;
}

/** Clip a polyline to a rectangle; returns the pieces inside (Liang–Barsky per segment). */
export function clipLineToRect(line, { minX, maxX, minZ, maxZ }) {
  const pieces = [];
  let cur = null;
  const inside = (p) => p[0] >= minX && p[0] <= maxX && p[1] >= minZ && p[1] <= maxZ;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i];
    const b = line[i + 1];
    let t0 = 0;
    let t1 = 1;
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const tests = [
      [-dx, a[0] - minX],
      [dx, maxX - a[0]],
      [-dz, a[1] - minZ],
      [dz, maxZ - a[1]],
    ];
    let visible = true;
    for (const [p, q] of tests) {
      if (p === 0) {
        if (q < 0) visible = false;
      } else {
        const t = q / p;
        if (p < 0) t0 = Math.max(t0, t);
        else t1 = Math.min(t1, t);
      }
    }
    if (!visible || t0 > t1) {
      if (cur) pieces.push(cur);
      cur = null;
      continue;
    }
    const pa = t0 === 0 ? a : [a[0] + dx * t0, a[1] + dz * t0];
    const pb = t1 === 1 ? b : [a[0] + dx * t1, a[1] + dz * t1];
    if (!cur) cur = [pa];
    cur.push(pb);
    if (t1 < 1 || !inside(b)) {
      pieces.push(cur);
      cur = null;
    }
  }
  if (cur) pieces.push(cur);
  return pieces.filter((p) => p.length >= 2);
}

/** Inward offset test: is p inside the ring and at least `margin` m from its edges? */
export function insideWithMargin(p, ring, margin) {
  return pointInRing(p, ring) && distToRingEdge(p, ring) >= margin;
}

/** Compass bearing (0 = north, clockwise) of a ground direction. */
export function bearing(dx, dz) {
  return ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
}

/** Densify a polyline so no segment is longer than `step` (keeps every vertex). */
export function densify(line, step) {
  const out = [line[0]];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const len = Math.hypot(b[0] - a[0], b[b.length - 1] - a[a.length - 1]);
    const n = Math.max(1, Math.ceil(len / step - 1e-9));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      out.push(a.map((v, j) => v + (b[j] - v) * t));
    }
  }
  return out;
}
