/**
 * three (and its addons) are ESM; this Jest setup runs CommonJS. Node 24 can
 * require() ES modules natively, so the mocks hand over the real modules
 * through Node's own loader (as the other twin tests do).
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));
jest.mock("three/addons/utils/BufferGeometryUtils.js", () => nodeRequire()("three/addons/utils/BufferGeometryUtils.js"));
jest.mock("three/addons/renderers/CSS2DRenderer.js", () => nodeRequire()("three/addons/renderers/CSS2DRenderer.js"));
jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));

import * as THREE from "three";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BLOCK, LEVEL, MASS, PAVILION, TAIDON, atriumRoofY, brickTop, eBearing, eToLocal, eToLocal3, localToE, massTop } from "../frame";
import { allWindows, facadeLength, facadeTop, scatterWindows, type Facade } from "../data";
import { Bucket, box, splitBands } from "../geom";
import { BAND_COUNT, CUTS, Kit, concatGeometries } from "../kit";
import { Furnisher, classroomChair, pouf } from "../furniture";
import { exposed } from "../volumes";
import { doorOpenings, facadeStrips } from "../mantle";
import { BRIEFING_ROOMS, modelledRoomAt, pointIn } from "../rooms";
import { F1, F2, VOID_F2 } from "../plan";
import { EDUCITY_VIEWS, buildNav, educityRouteLegs } from "../nav";
import { LIT_CLOSED, edInUse, edInteriorLevel, edLitFraction } from "../lighting";
import { BRICK_TONES, brickAverage } from "../materials";
import { TIER_D, TIERS, tierTopAt } from "../taidon";
import { galleryZMax } from "../atrium";
import { CHALLENGE_COMPANIES } from "@/lib/hackathon-2026/companies";
import { TARGETS_3D, PLACES_3D } from "@/lib/hackathon-2026/twin";
import { pointInPolygon } from "../../../nav/collision";
import { daylight, exteriorViewScale, interiorScale, windowScale } from "../../educity";
import { INTERIOR_EXPOSURE, exposureFor } from "../../../sky/sky";
import type { V2 } from "../../../types";

const close = (a: number, b: number, eps = 0.05) => Math.abs(a - b) <= eps;

describe("EduCity frame E", () => {
  it("maps the plan corners onto the OSM/LOD2 corners (SPEC §3.3.2)", () => {
    const n = eToLocal(0, 0);
    expect(close(n[0], 217.47) && close(n[1], 51.22)).toBe(true);
    const e = eToLocal(BLOCK.w, 0);
    expect(close(e[0], 257.75, 0.3) && close(e[1], 83.81, 0.3)).toBe(true);
    const s = eToLocal(BLOCK.w, BLOCK.d);
    expect(close(s[0], 216.73, 0.3) && close(s[1], 134.5, 0.3)).toBe(true);
  });

  it("round-trips local ↔ E", () => {
    for (const [x, z] of [
      [0, 0],
      [12.3, 45.6],
      [51.8, 65.2],
      [-7, 90],
    ] as V2[]) {
      const [lx, lz] = eToLocal(x, z);
      const [bx, bz] = localToE(lx, lz);
      expect(close(bx, x, 1e-6) && close(bz, z, 1e-6)).toBe(true);
    }
  });

  it("puts the doors where routes.json and campus.json have them", () => {
    // Door B (OSM n7884070178 ≈ (237.3, 109.0)), east entrance (204.0, 136.5), west entrance (177.8, 115.1).
    const b = eToLocal(51.81, 32.7);
    expect(close(b[0], 237.17, 0.1) && close(b[1], 109.23, 0.1)).toBe(true);
    const east = eToLocal3(43.19, 0, 74.73);
    expect(close(east[0], 204.03, 0.1) && close(east[2], 136.48, 0.1) && close(east[1], 3.4, 1e-6)).toBe(true);
    const west = eToLocal(9.33, 74.58);
    expect(close(west[0], 177.81, 0.1) && close(west[1], 115.06, 0.1)).toBe(true);
  });

  it("gives the facades their compass bearings (NE facade faces 309°, SE 129°…)", () => {
    expect(close(eBearing(0, -1), 39, 0.1)).toBe(true); // outward of the NE facade = −z_E
    expect(close(eBearing(1, 0), 129, 0.1)).toBe(true); // outward of the SE facade = +x_E
  });
});

describe("EduCity massing", () => {
  it("cuts the brick with one inclined plane, flat at the parapet (SPEC §3.3.2)", () => {
    expect(brickTop(10, 0)).toBeCloseTo(LEVEL.parapet, 5);
    expect(brickTop(BLOCK.w, BLOCK.d)).toBeCloseTo(65.2 - 0.726 * 65.2 - 0.245 * 51.8, 5);
    // SE facade: flat to z ≈ 36.5, then sloping 36° down to ≈ +5.2 at the south corner.
    expect(brickTop(BLOCK.w, 30)).toBeCloseTo(LEVEL.parapet, 5);
    expect(close(brickTop(BLOCK.w, BLOCK.d), 5.2, 0.2)).toBe(true);
    // SW facade: ≈ 17.9 at the west corner.
    expect(close(brickTop(0, BLOCK.d), 17.9, 0.2)).toBe(true);
  });

  it("covers the block with massing cells without gaps or overlaps", () => {
    let area = 0;
    for (const c of MASS) area += (c.x1 - c.x0) * (c.z1 - c.z0);
    expect(close(area, BLOCK.w * BLOCK.d, 0.5)).toBe(true);
    for (let x = 0.5; x < BLOCK.w; x += 2.3) {
      for (let z = 0.5; z < BLOCK.d; z += 2.1) {
        const n = MASS.filter((c) => x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1).length;
        expect(n).toBe(1);
      }
    }
  });

  it("slopes the atrium glass from 28.39 to 13.22 and steps the galleries under it", () => {
    expect(atriumRoofY(17.2)).toBeCloseTo(28.39, 2);
    expect(close(atriumRoofY(49.35), 13.22, 0.01)).toBe(true);
    expect(massTop(25, 30)).toBeCloseTo(atriumRoofY(30), 5);
    expect(galleryZMax(9)).toBeGreaterThan(galleryZMax(13));
    expect(galleryZMax(13)).toBeGreaterThan(galleryZMax(17));
    expect(atriumRoofY(galleryZMax(17))).toBeGreaterThanOrEqual(17 + 3 - 1e-6);
  });

  it("measures the visible part of a wall above a neighbour (exposed polygon)", () => {
    expect(exposed(5, 5, 0, 4)).toBeNull();
    const p = exposed(2, 6, 0, 4);
    expect(p).not.toBeNull();
    // The visible region starts at the neighbour's top and ends at the wall's top.
    expect(Math.min(...(p ?? []).map(([, y]) => y))).toBeCloseTo(2, 5);
  });
});

describe("EduCity windows", () => {
  const windows = allWindows();

  it("keeps the measured counts (65 north-east, 71 south-east) and the size mix", () => {
    expect(windows.filter((w) => w.facade === "NE")).toHaveLength(65);
    expect(windows.filter((w) => w.facade === "SE")).toHaveLength(71);
    const sizes = windows.map((w) => w.size);
    const small = sizes.filter((s) => s < 1.6).length / sizes.length;
    const large = sizes.filter((s) => s > 2.6).length / sizes.length;
    expect(small).toBeGreaterThan(0.3);
    expect(small).toBeLessThan(0.7);
    expect(large).toBeGreaterThan(0.05);
    expect(large).toBeLessThan(0.3);
  });

  it("fits every window inside its facade: under the sloped top, over the base", () => {
    for (const w of windows) {
      const len = facadeLength(w.facade);
      expect(w.s - w.size / 2).toBeGreaterThan(-1e-6);
      expect(w.s + w.size / 2).toBeLessThan(len + 1e-6);
      const top = Math.min(facadeTop(w.facade, w.s - w.size / 2), facadeTop(w.facade, w.s + w.size / 2));
      expect(w.y + w.size / 2).toBeLessThan(top + 0.02);
    }
  });

  it("never overlaps windows on the same facade", () => {
    for (const f of ["NE", "SE", "SW", "NW"] as Facade[]) {
      const list = windows.filter((w) => w.facade === f);
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          const overlap = Math.abs(a.s - b.s) < (a.size + b.size) / 2 - 0.05 && Math.abs(a.y - b.y) < (a.size + b.size) / 2 - 0.05;
          expect(overlap).toBe(false);
        }
      }
    }
  });

  it("is deterministic (the same scatter every time)", () => {
    expect(scatterWindows("NW", 7307, 11)).toEqual(scatterWindows("NW", 7307, 11));
  });

  it("marks screen-wall openings in front of terraces as open (no glass)", () => {
    // The south corner terraces (9.1 and 5.2) sit behind the south-east facade's last metres.
    const open = windows.filter((w) => w.open);
    expect(open.length).toBeGreaterThan(0);
    for (const w of open) expect(w.y - w.size / 2).toBeGreaterThan(5.0);
  });
});

describe("EduCity rooms and plans", () => {
  it("has a briefing room for every company's room number", () => {
    for (const c of CHALLENGE_COMPANIES) {
      const room = BRIEFING_ROOMS.find((r) => r.number === c.briefing.room);
      expect(room).toBeDefined();
      expect(room?.level).toBe(c.briefing.floor === 1 ? "f1" : "f2");
    }
  });

  it("puts every room door on its polygon's edge, opening outwards", () => {
    for (const r of BRIEFING_ROOMS.filter((x) => !x.open)) {
      const [dx, dz] = r.door;
      const inside: V2 = [dx - r.out[0] * 0.3, dz - r.out[1] * 0.3];
      const outside: V2 = [dx + r.out[0] * 0.3, dz + r.out[1] * 0.3];
      expect(pointIn(inside, r.polygon)).toBe(true);
      expect(pointIn(outside, r.polygon)).toBe(false);
    }
  });

  it("finds the furnished room behind a facade point", () => {
    expect(modelledRoomAt("f1", 8, 2)?.number).toBe("1001");
    expect(modelledRoomAt("f1", 30, 3)?.number).toBe("1002");
    expect(modelledRoomAt("f2", 30, 3)?.number).toBe("2003");
    expect(modelledRoomAt("f1", 45, 30)).toBeNull();
  });

  it("keeps blocks inside the building and off the main walking lines", () => {
    for (const plan of [F1, F2]) {
      for (const b of plan.blocks) {
        expect(b.x0).toBeGreaterThanOrEqual(0.4);
        expect(b.x1).toBeLessThanOrEqual(BLOCK.w);
        expect(b.z1).toBeLessThanOrEqual(PAVILION.wallSW);
      }
    }
    expect(pointIn([26, 40], VOID_F2)).toBe(true);
    expect(pointIn([16, 40], VOID_F2)).toBe(false);
  });
});

describe("EduCity navigation", () => {
  const nav = buildNav();

  it("provides every view and target lib/hackathon-2026/twin.ts lists for EduCity", () => {
    const place = PLACES_3D.find((p) => p.id === "educity");
    for (const v of place?.views ?? []) expect(EDUCITY_VIEWS[`educity:${v.id}`]).toBeDefined();
    const ids = new Set(nav.targets.map((t) => t.id));
    for (const t of TARGETS_3D.filter((x) => x.place === "educity")) expect(ids.has(t.id)).toBe(true);
  });

  it("frames interiors with the dollhouse open at the right level", () => {
    expect(EDUCITY_VIEWS["educity:default"].open?.level).toBe("educity-1");
    expect(EDUCITY_VIEWS["educity:rooms2"].open?.level).toBe("educity-2");
    expect(EDUCITY_VIEWS["educity:entrance"].open).toBeNull();
    for (const t of nav.targets.filter((x) => x.id.startsWith("room-"))) {
      const c = CHALLENGE_COMPANIES.find((x) => `room-${x.id}` === t.id);
      expect(t.level).toBe(c?.briefing.floor === 1 ? "educity-1" : "educity-2");
      expect(t.view.open?.level).toBe(t.level);
    }
  });

  it("puts every walkTo on its level's walk area", () => {
    for (const t of nav.targets) {
      if (!t.walkTo || !t.level) continue;
      const areas = nav.walkAreas.filter((a) => a.level === t.level);
      expect(areas.some((a) => pointInPolygon(t.walkTo as V2, a.polygon))).toBe(true);
    }
  });

  it("keeps the route legs' joining points where the outdoor legs end (routes.json)", () => {
    const routes = JSON.parse(readFileSync(join(process.cwd(), "public/assets/guide/3d/data/routes.json"), "utf8")) as {
      legs: Record<string, { points: [number, number, number][] }>;
    };
    const legs = educityRouteLegs();
    for (const id of ["int-edu-east-to-registration", "int-edu-west-to-taidon", "int-edu-doorB-to-1002"]) {
      const mine = legs[id];
      const theirs = routes.legs[id].points;
      expect(close(mine[0][0], theirs[0][0], 0.15) && close(mine[0][2], theirs[0][2], 0.15)).toBe(true);
      for (const p of mine) expect(p[1]).toBeCloseTo(3.4, 5);
    }
  });

  it("walks every indoor leg on walk areas of floor 1, clear of the walls", () => {
    const legs = educityRouteLegs();
    const f1 = nav.walkAreas.filter((a) => a.level === "educity-1");
    const walls = nav.colliders.filter((c) => c.level === "educity-1" && c.kind === "segment");
    const cross = (a: V2, b: V2, c: V2, d: V2) => {
      const o = (p: V2, q: V2, r: V2) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
      return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
    };
    for (const [id, pts] of Object.entries(legs)) {
      for (let i = 1; i < pts.length; i++) {
        const a: V2 = [pts[i - 1][0], pts[i - 1][2]];
        const b: V2 = [pts[i][0], pts[i][2]];
        // Sample the segment: on floor 1 (the first point may sit on the threshold outside).
        for (let t = 0.2; t <= 1; t += 0.2) {
          const p: V2 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
          expect([id, f1.some((ar) => pointInPolygon(p, ar.polygon))]).toEqual([id, true]);
        }
        for (const w of walls) {
          if (w.kind !== "segment") continue;
          expect([id, i, cross(a, b, w.a, w.b)]).toEqual([id, i, false]);
        }
      }
    }
  });

  it("connects floors 1 and 2 by lifts and Taidon portaat in both directions", () => {
    const ids = nav.connectors.map((c) => `${c.from}>${c.to}`);
    expect(ids.filter((s) => s === "educity-1>educity-2").length).toBeGreaterThanOrEqual(2);
    expect(ids.filter((s) => s === "educity-2>educity-1").length).toBeGreaterThanOrEqual(2);
    expect(ids).toContain("outdoor>educity-1");
  });
});

describe("Taidon portaat", () => {
  it("rises 5.0 m in ten tiers of 0.5 m over the stair's length", () => {
    expect(TIERS * 0.5).toBeCloseTo(5, 6);
    expect(TIER_D * TIERS).toBeCloseTo(TAIDON.zFoot - TAIDON.zTop, 6);
    expect(tierTopAt(TAIDON.zFoot - 0.1)).toBeCloseTo(0.5, 6);
    expect(tierTopAt(TAIDON.zTop + 0.1)).toBeCloseTo(5, 6);
  });
});

describe("EduCity brick faces", () => {
  it("triangulate exactly: brick only where the facade is, never over the pavilion's glass", () => {
    const area = (pts: THREE.Vector2[]) => Math.abs(THREE.ShapeUtils.area(pts));
    for (const f of ["NE", "SE", "SW", "NW"] as Facade[]) {
      const holes = [
        ...allWindows()
          .filter((w) => w.facade === f)
          .map((w) => ({ s0: w.s - w.size / 2, s1: w.s + w.size / 2, y0: w.y - w.size / 2, y1: w.y + w.size / 2 })),
        ...doorOpenings(f),
      ];
      for (const strip of facadeStrips(f, holes)) {
        const contour = strip.outline.map(([x, y]) => new THREE.Vector2(x, y));
        const hs = strip.holes.map((h) => h.map(([x, y]) => new THREE.Vector2(x, y)));
        const tris = THREE.ShapeUtils.triangulateShape(contour, hs);
        const all = [...contour, ...hs.flat()];
        const got = tris.reduce((a, [i, j, k]) => a + area([all[i], all[j], all[k]]), 0);
        const expected = area(contour) - hs.reduce((a, h) => a + area(h), 0);
        expect([f, Math.abs(got - expected) < 0.01]).toEqual([f, true]);
      }
    }
    // Under the south-west facade the pavilion's roof is the base: no brick at deck level there.
    const sw = facadeStrips("SW", []);
    const covering = sw.filter((st) => pointIn([30, 2], st.outline));
    expect(covering.length).toBe(0);
  });
});

describe("Kolumba brick", () => {
  it("is a calm grey-taupe: mid tones in a narrow range, nearly neutral, not black paint", () => {
    const avg = brickAverage().clone().convertLinearToSRGB();
    const [r, g, b] = [avg.r * 255, avg.g * 255, avg.b * 255];
    // A mid-dark taupe wall (the black-bronze #1c1716 frames must read against it).
    expect(g).toBeGreaterThan(100);
    expect(g).toBeLessThan(150);
    // Warm, barely: the low November sun adds the rest (no pink in sunlight).
    expect(r - b).toBeGreaterThan(4);
    expect(r - b).toBeLessThan(16);
    // Lightest unit at most ≈ 1.6 × the darkest (sRGB) — light units, not white planks.
    const lum = (hex: string) => {
      const c = new THREE.Color(hex).convertLinearToSRGB();
      return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    };
    const ls = BRICK_TONES.map(([hex]) => lum(hex));
    expect(Math.max(...ls) / Math.min(...ls)).toBeLessThan(1.6);
    // Shares add up.
    expect(BRICK_TONES.reduce((a, [, p]) => a + p, 0)).toBeCloseTo(1, 6);
  });
});

describe("EduCity lighting", () => {
  it("lights nearly every window after dark while the building is in use, fewer by day", () => {
    const night = edLitFraction("2026-11-06T18:00", 1);
    const day = edLitFraction("2026-11-06T13:00", 0);
    expect(night).toBeGreaterThan(0.85);
    expect(day).toBeLessThan(night);
    expect(day).toBeGreaterThan(0.5);
  });

  it("follows the event schedule: open Friday from 15:00 and Sunday until the finals, closed in between", () => {
    // Friday registration, opening, briefings (venues.ts / schedule.ts).
    for (const t of ["2026-11-06T15:30", "2026-11-06T17:00", "2026-11-06T19:30"]) expect(edInUse(t)).toBe(1);
    // The night build and Saturday's Q&A are in BioCity and Joki: EduCity is closed.
    for (const t of ["2026-11-07T01:00", "2026-11-07T11:00", "2026-11-06T23:30"]) expect(edInUse(t)).toBe(0);
    // Sunday: evaluation, winners 13:30, finals 14:00.
    for (const t of ["2026-11-08T10:00", "2026-11-08T13:30", "2026-11-08T14:30"]) expect(edInUse(t)).toBe(1);
    expect(edInUse("2026-11-08T20:00")).toBe(0);
    // Closed at night: only corridors and a few offices.
    expect(edLitFraction("2026-11-07T01:00", 1)).toBeLessThanOrEqual(LIT_CLOSED + 1e-9);
    expect(edLitFraction("2026-11-07T01:00", 1)).toBeGreaterThan(0.05);
    expect(edInteriorLevel("2026-11-07T01:00")).toBeCloseTo(0.1, 6);
    expect(edInteriorLevel("2026-11-06T15:30")).toBe(1);
    // Lights ramp over half an hour (no hard switch while dragging the time).
    const mid = edInUse("2026-11-06T21:15");
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    // A bare "HH:MM" is Friday, as the engine reads it.
    expect(edInUse("18:00")).toBe(1);
  });
});

describe("interior light seen from outside", () => {
  it("takes back most of the street exposure after dark, never brightens by day", () => {
    expect(exteriorViewScale(12)).toBe(1);
    expect(exteriorViewScale(4.5)).toBe(1);
    const dusk = exteriorViewScale(-4.6);
    const night = exteriorViewScale(-45);
    expect(dusk).toBeLessThan(1);
    expect(night).toBeLessThan(dusk);
    expect(night).toBeGreaterThanOrEqual(0.05);
    // Seen from the street at night the rooms still read brighter than from inside (≤ ≈ 2 stops).
    const ext = exposureFor(-45);
    expect(night * ext).toBeGreaterThan(INTERIOR_EXPOSURE);
    expect(night * ext).toBeLessThan(INTERIOR_EXPOSURE * 4);
    // Square windows: dimmed after dark, never by day.
    expect(windowScale(12)).toBe(1);
    expect(windowScale(-45)).toBeLessThan(1);
    expect(windowScale(-45)).toBeGreaterThanOrEqual(0.1);
  });

  it("measures daylight in closed rooms from the sun's height", () => {
    expect(daylight(-30)).toBe(0);
    expect(daylight(12)).toBe(1);
    expect(daylight(0)).toBeGreaterThan(0);
    expect(daylight(0)).toBeLessThan(1);
  });
});

describe("band splitting (dollhouse cuts)", () => {
  it("clips triangles at the cuts and keeps the total area", () => {
    const b = new Bucket("t", { aWinA: 4 });
    b.set("aWinA", [1, 2, 3, 4]);
    box(b, 0, 0, 0, 2, 10, 1);
    const g = b.geometry();
    const area = (geo: THREE.BufferGeometry | null) => {
      if (!geo) return 0;
      const p = geo.getAttribute("position");
      let s = 0;
      const A = new THREE.Vector3();
      const B = new THREE.Vector3();
      const C = new THREE.Vector3();
      for (let i = 0; i < p.count; i += 3) {
        A.fromBufferAttribute(p, i);
        B.fromBufferAttribute(p, i + 1);
        C.fromBufferAttribute(p, i + 2);
        s += B.clone().sub(A).cross(C.clone().sub(A)).length() / 2;
      }
      return s;
    };
    const bands = splitBands(g, [4.2, 8.6]);
    expect(bands).toHaveLength(3);
    const total = bands.reduce((s, x) => s + area(x), 0);
    expect(total).toBeCloseTo(area(g), 4);
    // Band A holds nothing above the first cut.
    const pa = bands[0]?.getAttribute("position");
    for (let i = 0; i < (pa?.count ?? 0); i++) expect(pa?.getY(i)).toBeLessThanOrEqual(4.2 + 1e-6);
    // Extra attributes survive the clipping.
    expect(bands[1]?.getAttribute("aWinA").getX(0)).toBe(1);
  });
});

describe("Kit bands and furniture baking", () => {
  it("draws a banded shell bottom-up and cuts it by draw range", () => {
    const root = new THREE.Group();
    const kit = new Kit(root);
    const m = new THREE.MeshBasicMaterial();
    const b = kit.bucket("wall", m, { group: "shell", split: true });
    box(b, 0, 0, 0, 1, 12, 0.2);
    kit.finish();
    const mesh = kit.group("shell").children[0] as THREE.Mesh;
    const total = mesh.geometry.getAttribute("position").count;
    kit.setBands("shell", 1);
    const r1 = mesh.geometry.drawRange.count;
    const p = mesh.geometry.getAttribute("position");
    for (let i = 0; i < r1; i++) expect(p.getY(i)).toBeLessThanOrEqual(CUTS[0] + 1e-6);
    kit.setBands("shell", BAND_COUNT);
    expect(mesh.geometry.drawRange.count).toBe(total);
    kit.setBands("shell", 0);
    expect(mesh.visible).toBe(false);
  });

  it("merges buckets that share a material and a group into one mesh", () => {
    const root = new THREE.Group();
    const kit = new Kit(root);
    const m = new THREE.MeshBasicMaterial();
    box(kit.bucket("a", m, { group: "f1" }), 0, 0, 0, 1, 1, 1);
    box(kit.bucket("b", m, { group: "f1" }), 2, 0, 0, 3, 1, 1);
    box(kit.bucket("c", new THREE.MeshBasicMaterial(), { group: "f1" }), 4, 0, 0, 5, 1, 1);
    kit.finish();
    expect(kit.group("f1").children).toHaveLength(2);
  });

  it("concatenates band geometries keeping cumulative ends", () => {
    const a = new Bucket("a");
    box(a, 0, 0, 0, 1, 1, 1);
    const { geometry, ends } = concatGeometries([a.geometry(), null, a.geometry()]);
    expect(ends).toEqual([36, 36, 72]);
    expect(geometry.getAttribute("position").count).toBe(72);
  });

  it("bakes placements with transformed vertices and per-piece fabric colours", () => {
    const fur = new Furnisher();
    fur.add("f1", classroomChair(), { x: 10, y: 0, z: 5, ry: Math.PI / 2 });
    fur.add("f1", pouf(), { x: 0, y: 5, z: 0, color: "#ff0000" });
    const buckets = new Map<string, Bucket>();
    const tris = fur.bake((key) => {
      const k = key === "fabric" ? "fabric" : "other";
      let b = buckets.get(k);
      if (!b) buckets.set(k, (b = new Bucket(k, k === "fabric" ? { color: 3 } : {})));
      return b;
    });
    expect(tris).toBeGreaterThan(0);
    const other = buckets.get("other")?.geometry();
    other?.computeBoundingBox();
    // The chair moved to x ≈ 10 (± its half width).
    expect(other?.boundingBox?.min.x).toBeGreaterThan(9.4);
    const fabric = buckets.get("fabric")?.geometry();
    const col = fabric?.getAttribute("color");
    expect(col?.getX(0)).toBeCloseTo(1, 3);
    expect(col?.getY(0)).toBeCloseTo(0, 3);
    fabric?.computeBoundingBox();
    expect(fabric?.boundingBox?.min.y).toBeGreaterThanOrEqual(5 - 1e-6);
  });
});

describe("interior light while the dollhouse is open", () => {
  it("brightens the rooms by day, keeps them calmer at night, within bounds", () => {
    const day = interiorScale(12);
    const night = interiorScale(-30);
    expect(day).toBeGreaterThan(night);
    for (const v of [day, night, interiorScale(4.5), interiorScale(-5)]) {
      expect(v).toBeGreaterThanOrEqual(0.3);
      expect(v).toBeLessThanOrEqual(2.2);
    }
  });
});
