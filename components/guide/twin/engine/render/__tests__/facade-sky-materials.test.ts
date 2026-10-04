/**
 * three (and its addons) are ESM; this Jest setup runs CommonJS. Node 24 can
 * require() ES modules natively, so the mocks below hand over the real
 * modules through Node's own loader (process.getBuiltinModule bypasses
 * Jest's module registry) — the tests run against real three.js.
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () =>
  nodeRequire()(
    `${process.cwd()}/node_modules/three/build/three.module.js`,
  ),
);
jest.mock("three/addons/objects/Sky.js", () =>
  nodeRequire()("three/addons/objects/Sky.js"),
);
jest.mock("three/addons/lights/SunLight.js", () =>
  nodeRequire()("three/addons/lights/SunLight.js"),
);
jest.mock("three/addons/objects/Lensflare.js", () =>
  nodeRequire()("three/addons/objects/Lensflare.js"),
);

import fs from "fs";
import path from "path";
import * as THREE from "three";
import type { MaterialName } from "../../types";
import {
  airMass,
  exposureFor,
  exposureValue,
  kelvinToLinear,
  lightingFor,
  preethamRadiance,
  skyIlluminance,
  sunColorTemperature,
  sunDirection,
  sunIlluminance,
} from "../../sky/sky";
import { FACADE_PRESETS, facadeWalls, flatRoofGeometry, occupancyFor } from "../facade";
import { MATERIAL_NAMES, albedoMultiplier, textureSets } from "../materials";

describe("photometry", () => {
  it("has a sane air mass and direct beam", () => {
    expect(airMass(90)).toBeCloseTo(1, 2);
    expect(airMass(5)).toBeGreaterThan(9);
    expect(airMass(-0.4)).toBeLessThan(45);
    // Friday 15:30: a low sun break, a few klux; Saturday noon: tens of klux.
    const arrival = sunIlluminance(4.5, 10);
    expect(arrival).toBeGreaterThan(2);
    expect(arrival).toBeLessThan(8);
    expect(sunIlluminance(12, 10)).toBeGreaterThan(20);
    expect(sunIlluminance(-2)).toBe(0);
  });

  it("follows measured twilight illuminance", () => {
    expect(skyIlluminance(0) * 1000).toBeGreaterThan(300); // lux at sunset
    expect(skyIlluminance(0) * 1000).toBeLessThan(800);
    expect(skyIlluminance(-6) * 1000).toBeGreaterThan(1); // end of civil twilight ≈ 3 lux
    expect(skyIlluminance(-6) * 1000).toBeLessThan(10);
    expect(skyIlluminance(-30) * 1000).toBeLessThan(0.01);
  });

  it("exposes like a photographer: darker scenes get more exposure, monotonically", () => {
    let prev = Infinity;
    for (let el = -30; el <= 40; el += 1) {
      const e = exposureFor(el);
      expect(e).toBeLessThanOrEqual(prev + 1e-9);
      prev = e;
    }
    expect(exposureFor(4.52, -0.3)).toBeCloseTo(1.5, 1); // the default look (−0.3 EV)
    expect(exposureValue(-40)).toBeGreaterThanOrEqual(5.5);
  });

  it("warms the low sun and keeps colours luminance-normalised", () => {
    expect(sunColorTemperature(2)).toBeLessThan(sunColorTemperature(12));
    const c = kelvinToLinear(6500);
    expect(0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b).toBeCloseTo(1, 5);
    const warm = kelvinToLinear(2700);
    expect(warm.r).toBeGreaterThan(warm.b);
  });

  it("puts the sun where the NOAA model says (Fri 15:30: 4.5° at 226.6°)", () => {
    const l = lightingFor("2026-11-06T15:30");
    expect(l.sunElevationDeg).toBeCloseTo(4.5, 0);
    expect(l.sunAzimuthDeg).toBeCloseTo(226.6, 0);
    const d = sunDirection(l.sunElevationDeg, l.sunAzimuthDeg);
    expect(d.y).toBeCloseTo(Math.sin((l.sunElevationDeg * Math.PI) / 180), 6);
    expect(d.x).toBeLessThan(0); // south-west: −x, +z
    expect(d.z).toBeGreaterThan(0);
    expect(lightingFor("2026-11-07T01:00").night).toBe(1);
  });

  it("evaluates the Preetham sky to finite, positive radiance", () => {
    const sun = sunDirection(4.5, 226.6);
    const p = { turbidity: 6, rayleigh: 2.6, mieCoefficient: 0.0012, mieDirectionalG: 0.85 };
    const zenith = preethamRadiance(new THREE.Vector3(0, 1, 0), sun, p);
    const nearSun = preethamRadiance(sun.clone().setY(sun.y + 0.05).normalize(), sun, p);
    for (const v of [zenith, nearSun]) {
      expect(Number.isFinite(v.x) && v.x > 0).toBe(true);
    }
    expect(zenith.z).toBeGreaterThan(zenith.x); // blue zenith
    expect(nearSun.y).toBeGreaterThan(zenith.y * 5); // bright aureole
  });
});

describe("facade geometry", () => {
  const square: [number, number][] = [
    [0, 0],
    [0, 20],
    [30, 20],
    [30, 0],
  ];

  it("extrudes walls with outward normals and continuous u round the building", () => {
    for (const ring of [square, square.slice().reverse()]) {
      const g = facadeWalls(ring, -0.3, 18, { vRef: 0, seed: 7 });
      const pos = g.getAttribute("position");
      const nor = g.getAttribute("normal");
      const fac = g.getAttribute("facade");
      expect(fac.itemSize).toBe(4);
      expect(g.getAttribute("facadeGround")).toBeTruthy();
      let maxU = 0;
      for (let i = 0; i < pos.count; i++) {
        // Outward: the normal points away from the centre (15, 10).
        const ox = pos.getX(i) - 15;
        const oz = pos.getZ(i) - 10;
        expect(ox * nor.getX(i) + oz * nor.getZ(i)).toBeGreaterThan(0);
        maxU = Math.max(maxU, fac.getX(i));
        // v counts from the reference level; top = wall top above it.
        expect(fac.getY(i)).toBeCloseTo(pos.getY(i));
        expect(fac.getW(i)).toBeCloseTo(18);
      }
      expect(maxU).toBeCloseTo(100); // perimeter
    }
  });

  it("faces courtyard walls into the courtyard", () => {
    const hole: [number, number][] = [
      [10, 5],
      [10, 15],
      [20, 15],
      [20, 5],
    ];
    const g = facadeWalls(square, 0, 10, { holes: [hole] });
    const pos = g.getAttribute("position");
    const nor = g.getAttribute("normal");
    let inward = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      if (x >= 10 && x <= 20 && z >= 5 && z <= 15) {
        // Courtyard wall vertices: normal points towards the courtyard centre (15, 10).
        expect((15 - x) * nor.getX(i) + (10 - z) * nor.getZ(i)).toBeGreaterThan(0);
        inward++;
      }
    }
    expect(inward).toBeGreaterThan(0);
  });

  it("triangulates flat roofs facing up", () => {
    const g = flatRoofGeometry(square, [], 12);
    const n = g.getAttribute("normal");
    for (let i = 0; i < n.count; i++) expect(n.getY(i)).toBeGreaterThan(0.99);
    expect(g.getIndex()?.count).toBe(6);
  });

  it("has presets for BioCity and EduCity", () => {
    expect(FACADE_PRESETS.blackPanelRibbon.pattern).toBe("ribbon");
    expect(FACADE_PRESETS.darkBrickScatter.pattern).toBe("scatter");
    const probs = FACADE_PRESETS.darkBrickScatter.scatter.sizes.reduce((s, [, , p]) => s + p, 0);
    expect(probs).toBeCloseTo(1, 5);
  });

  it("lights offices on a dark Friday afternoon, not at 1 a.m. on Saturday", () => {
    const fri = occupancyFor("2026-11-06T15:30");
    const night = occupancyFor("2026-11-07T01:00");
    expect(fri.office).toBeGreaterThan(0.5);
    expect(night.office).toBeLessThan(0.1);
    expect(occupancyFor("2026-11-06T20:00").residential).toBeGreaterThan(0.4);
  });
});

describe("material library", () => {
  it("names every MaterialName", () => {
    const all: Record<MaterialName, true> = {
      asphalt: true, roadMarking: true, pavers: true, granite: true, kerb: true, grass: true, soil: true, gravel: true,
      brickDark: true, panelBlack: true, panelGrey: true, concreteFacade: true, metalDark: true, metalWhite: true,
      glassFacade: true, glassInterior: true, concreteFloor: true, terrazzo: true, stoneFloor: true, birch: true, oak: true,
      carpetDark: true, carpetGrey: true, plasterWhite: true, plasterGrey: true, ceiling: true, fabricPink: true,
      fabricTeal: true, fabricDark: true, leather: true, steel: true, chrome: true, blackMatte: true, rubber: true,
      carPaintBlack: true, carGlass: true, bark: true, foliage: true, screen: true,
      asphaltFootway: true, asphaltRed: true, setts: true, mulch: true, leafLitter: true, manhole: true,
      roadLineDecal: true, barkBirch: true,
    };
    expect([...MATERIAL_NAMES].sort()).toEqual(Object.keys(all).sort());
  });

  it("calibrates texture averages to target albedos", () => {
    const m = albedoMultiplier("#5f5854", "#4b4139");
    const avg = new THREE.Color("#4b4139");
    const target = new THREE.Color("#5f5854");
    expect(avg.r * m.r).toBeCloseTo(target.r, 6);
    expect(avg.b * m.b).toBeCloseTo(target.b, 6);
  });

  it("ships every texture file the library asks for (1K, and 2K where listed)", () => {
    const base = path.join(process.cwd(), "public/assets/guide/3d/tex");
    for (const [name, set] of Object.entries(textureSets())) {
      if (name === "gravel") continue; // procedural
      for (const map of set.maps) {
        const suffix = map === "color" && "colorFile" in set && set.colorFile ? set.colorFile : map;
        expect(fs.existsSync(path.join(base, name, `${name}_1k_${suffix}.webp`))).toBe(true);
        if (set.has2k && (map === "color" || map === "normal")) {
          expect(fs.existsSync(path.join(base, name, `${name}_2k_${suffix}.webp`))).toBe(true);
        }
      }
    }
    expect(fs.existsSync(path.join(base, "LICENSES.md"))).toBe(true);
  });
});
