/**
 * lod2.json — City of Turku CityGML LOD2 massing for every building in the
 * terrain extent (SPEC §3.4): footprint, base and roof parts.
 *
 * Flat roof parts are the research extract's "exposed" roof levels (each
 * level minus the levels above it, simplified to 0.15 m) — they partition the
 * roof, so extruding every part from the base never doubles a facade.
 * Sloped parts are rebuilt from the raw CityGML roof surfaces (one planar
 * face each, heights per vertex): the extract merges faces that share a
 * height range, which would flatten a gable's ridge.
 */
import { ccw, centroid, cleanRing, DATUM, gk23ToLocal, pointInRing, r2, ringArea, simplifyRing } from "./geo.mjs";
import { HERO_BY_OSM, lod2Id, ROLE_BY_OSM } from "./campus.mjs";

const SLOPED_DEG = 3;
/** Kupittaa station hall stands on a deck over the tracks (street level +2.9): its massing starts above them [E]. */
const RAISED_BASE = { "103430220P": 1.9 };

/** Least-squares plane y = a·x + b·z + c through 3D points [x, y, z]. */
function fitPlane(pts) {
  let sx = 0;
  let sz = 0;
  let sy = 0;
  let sxx = 0;
  let szz = 0;
  let sxz = 0;
  let sxy = 0;
  let szy = 0;
  const n = pts.length;
  for (const [x, y, z] of pts) {
    sx += x;
    sz += z;
    sy += y;
    sxx += x * x;
    szz += z * z;
    sxz += x * z;
    sxy += x * y;
    szy += z * y;
  }
  // Normal equations (centred for stability).
  const mx = sx / n;
  const mz = sz / n;
  const my = sy / n;
  const cxx = sxx / n - mx * mx;
  const czz = szz / n - mz * mz;
  const cxz = sxz / n - mx * mz;
  const cxy = sxy / n - mx * my;
  const czy = szy / n - mz * my;
  const det = cxx * czz - cxz * cxz;
  if (Math.abs(det) < 1e-9) return [0, 0, my];
  const a = (cxy * czz - czy * cxz) / det;
  const b = (czy * cxx - cxy * cxz) / det;
  return [a, b, my - a * mx - b * mz];
}

function slopeDeg(ring3) {
  // Newell normal of the 3D ring (x, y-up, z).
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < ring3.length; i++) {
    const [x1, y1, z1] = ring3[i];
    const [x2, y2, z2] = ring3[(i + 1) % ring3.length];
    nx += (y1 - y2) * (z1 + z2);
    ny += (z1 - z2) * (x1 + x2);
    nz += (x1 - x2) * (y1 + y2);
  }
  const len = Math.hypot(nx, ny, nz) || 1;
  return (Math.acos(Math.min(1, Math.abs(ny) / len)) * 180) / Math.PI;
}

export function buildLod2({ heights, raw, campusOsm, terrain, bounds, skipOsm, log }) {
  const osmById = new Map(campusOsm.buildings.map((b) => [b.id, b]));
  const joki = osmById.get("w625297895").polygon;
  const jokiTower = { c: [58.894, 15.934], r: 10.4 };
  const inJoki = (p) => pointInRing(p, joki) || Math.hypot(p[0] - jokiTower.c[0], p[1] - jokiTower.c[1]) < jokiTower.r;

  const buildings = [];
  let faces = 0;
  for (const rec of heights.buildings_all) {
    const osmKey = rec.osm_match?.id?.replace(/^way\//, "w");
    if (osmKey && skipOsm.has(osmKey)) continue;
    const footprint = rec.footprint_local
      .map((r) => ccw(cleanRing(r)))
      .filter((r) => r.length >= 3 && ringArea(r) >= 2);
    if (!footprint.length) continue;
    const c = centroid(footprint[0]);
    if (c[0] < bounds.minX || c[0] > bounds.maxX || c[1] < bounds.minZ || c[1] > bounds.maxZ) continue;
    let groundN = rec.ground_n2000?.min;
    if (!Number.isFinite(groundN)) {
      groundN = Math.min(...footprint[0].map(([x, z]) => terrain.heightAt(x, z))) + DATUM;
    }
    if (!(rec.roof_max_n2000 > groundN + 1)) continue; // broken record (roof below or at the ground)
    const groundY = groundN - DATUM;
    const isDatacity = rec.prt === "103454371S";

    const roofs = [];
    // Flat parts.
    for (const level of rec.roof_levels) {
      if (level.slope_deg >= SLOPED_DEG || !level.polygons_local) continue;
      const y = (level.z_n2000 ?? level.zmax_n2000) - DATUM;
      const claim = isDatacity && (level.z_n2000 === 35.31 || level.z_n2000 === 26.42) ? "joki" : undefined;
      for (const poly of level.polygons_local) {
        const ring = ccw(cleanRing(poly));
        if (ring.length < 3 || ringArea(ring) < 1) continue;
        roofs.push({ ring, y: r2(y), ...(claim ? { claimedBy: claim } : {}) });
      }
    }
    // Sloped parts: raw planar faces whose height range belongs to an exposed sloped level
    // (the extract grouped faces by height range rounded to 0.1 m).
    const slopedLevels = rec.roof_levels
      .filter((l) => l.slope_deg >= SLOPED_DEG && l.polygons_local)
      .map((l) => [l.zmin_n2000, l.zmax_n2000]);
    const exposed = (lo, hi) => slopedLevels.some(([a, b]) => Math.abs(lo - a) <= 0.1 && Math.abs(hi - b) <= 0.1);
    const src = raw[rec.citygml_index];
    for (const surface of src?.roofs ?? []) {
      const ring3 = surface.rings[0].map(([E, N, h]) => {
        const [x, z] = gk23ToLocal(E, N);
        return [x, h, z];
      });
      if (ring3.length > 1) {
        const a = ring3[0];
        const b = ring3[ring3.length - 1];
        if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) ring3.pop();
      }
      if (ring3.length < 3 || slopeDeg(ring3) < SLOPED_DEG) continue;
      const hs = ring3.map((p) => p[1]);
      if (!exposed(Math.min(...hs), Math.max(...hs))) continue;
      const plane = fitPlane(ring3.map(([x, h, z]) => [x, h - DATUM, z]));
      const ring = ccw(simplifyRing(cleanRing(ring3.map(([x, , z]) => [x, z])), 0.05));
      if (ring.length < 3 || ringArea(ring) < 0.5) continue;
      const ys = ring.map(([x, z]) => r2(plane[0] * x + plane[1] * z + plane[2]));
      const claim = isDatacity && inJoki(centroid(ring)) ? "joki" : undefined;
      roofs.push({ ring, ys, ...(claim ? { claimedBy: claim } : {}) });
      faces++;
    }
    if (!roofs.length) continue;

    const base = RAISED_BASE[rec.prt];
    const storeys = parseInt(rec.storeysAboveGround ?? rec.floors_registry, 10);
    const year = parseInt(rec.year_of_construction, 10);
    const osmB = osmKey ? osmById.get(osmKey) : undefined;
    buildings.push({
      id: lod2Id(rec),
      ...(rec.prt ? { prt: rec.prt } : {}),
      ...(rec.address ? { address: rec.address.replace(/, 20520 TURKU$/, "") } : {}),
      ...(year > 1000 ? { year } : {}),
      ...(storeys > 0 ? { storeys } : {}),
      lod: rec.lod === "LOD2" ? 2 : 1,
      ...(osmKey ? { osmId: Number(osmKey.slice(1)) } : {}),
      ...(osmKey && ROLE_BY_OSM[osmKey] ? { role: ROLE_BY_OSM[osmKey] } : {}),
      ...(osmB?.name ? { name: osmB.name } : {}),
      ...(osmKey && HERO_BY_OSM[osmKey] ? { claimedBy: HERO_BY_OSM[osmKey] } : {}),
      groundY: r2(groundY),
      baseY: r2(base ?? groundY - 0.3),
      roofY: r2(rec.main_roof_n2000 - DATUM),
      topY: r2(rec.roof_max_n2000 - DATUM),
      footprint,
      roofs,
    });
  }
  log(
    `lod2: ${buildings.length} buildings, ${buildings.reduce((n, b) => n + b.roofs.length, 0)} roof parts (${faces} sloped faces)`,
  );
  return {
    version: 1,
    source:
      "City of Turku 3D city model (CityGML 2.0 LOD2, roofs from the 2021 laser scanning; LOD1 boxes for buildings modelled after it), WFS bldg:Building_LOD2, retrieved 4 Oct 2026",
    licence: "© Turun kaupunki, käyttölupa CC BY 4.0",
    buildings,
  };
}
