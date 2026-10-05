/**
 * three (and its addons) are ESM; this Jest setup runs CommonJS. Node 24 can require() ES modules
 * natively, so the mocks below hand over the real modules through Node's own loader — the tests run
 * against real three.js.
 */
function nodeRequire(): NodeJS.Require {
  const mod = process.getBuiltinModule("module") as typeof import("module");
  return mod.createRequire(`${process.cwd()}/package.json`);
}
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));
jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));

import * as THREE from "three";
import {
  INTERIOR_EXPOSURE,
  NIGHT_EV,
  adaptToward,
  blendExposure,
  domeLuminance,
  domeTerms,
  exposureFor,
  exposureValue,
  interiorExposureFor,
  lightingFor,
  lowSunStops,
  sunSampleDirections,
  twilightAmbient,
  twilightTarget,
  viewFill,
  type DomeTerms,
} from "../sky";
import { nightFactor } from "../sun";

const terms = (): DomeTerms => ({
  twiZenith: new THREE.Vector3(),
  twiHorizon: new THREE.Vector3(),
  twiGlow: new THREE.Vector3(),
  nightZenith: new THREE.Vector3(),
  nightHorizon: new THREE.Vector3(),
  cityGlow: new THREE.Vector3(),
});

/** Friday 6 Nov from 16:00 to Saturday 02:00 in 5-minute steps (sunset 16:20, night from ≈ 17:40). */
const evening = Array.from({ length: 121 }, (_, i) => {
  const t = 16 * 60 + i * 5;
  const day = t >= 24 * 60 ? 7 : 6;
  const m = t % (24 * 60);
  return `2026-11-0${day}T${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

describe("exterior exposure after sunset", () => {
  it("never makes the image brighter as the night deepens (ambient-lit ground and the sky)", () => {
    let ground = Infinity;
    let zenith = Infinity;
    let horizon = Infinity;
    let towardsSun = Infinity;
    const t = terms();
    for (const iso of evening) {
      const l = lightingFor(iso);
      const e = exposureFor(l.sunElevationDeg);
      // Unlit ground: twilight sky + the urban floor (street lights excluded).
      const g = twilightAmbient(l.sunElevationDeg) * e;
      expect(g).toBeLessThanOrEqual(ground * (1 + 1e-9));
      ground = g;
      if (l.sunElevationDeg > -2.5) continue; // the daylight dome is still fading in the shader
      domeTerms(l.sunElevationDeg, l.night, t);
      const z = domeLuminance(t, 1) * e;
      const h = domeLuminance(t, 0) * e;
      const s = domeLuminance(t, 0.02, 1) * e;
      expect(z).toBeLessThanOrEqual(zenith * (1 + 1e-9));
      expect(h).toBeLessThanOrEqual(horizon * (1 + 1e-9));
      expect(s).toBeLessThanOrEqual(towardsSun * (1 + 1e-9));
      zenith = z;
      horizon = h;
      towardsSun = s;
    }
  });

  it("holds a street-lit night exposure once the lamps take over", () => {
    expect(exposureValue(-12)).toBe(NIGHT_EV);
    expect(exposureValue(-45)).toBe(NIGHT_EV);
    // 17:30 and 20:00 expose alike (the old table opened up 0.6 EV more over the evening).
    const a = exposureFor(lightingFor("2026-11-06T17:30").sunElevationDeg);
    const b = exposureFor(lightingFor("2026-11-06T20:00").sunElevationDeg);
    expect(b / a).toBeCloseTo(1, 6);
  });

  it("keeps dusk 1–2 EV below the 15:30 daylight for surfaces in shade (16:45, sun −3°)", () => {
    const day = lightingFor("2026-11-06T15:30").sunElevationDeg;
    const dusk = lightingFor("2026-11-06T16:45").sunElevationDeg;
    // In shade: the diffuse sky light of the calibrated daylight look (twilightTarget) vs the dusk ambient.
    const shadeDay = twilightTarget(day) * exposureFor(day);
    const shadeDusk = twilightAmbient(dusk) * exposureFor(dusk);
    const stops = Math.log2(shadeDay / shadeDusk);
    expect(stops).toBeGreaterThan(1);
    expect(stops).toBeLessThan(2.2);
  });

  it("lets the lamps dominate only once civil twilight is nearly over", () => {
    // Pools of ≈ 15 lux under the lamps (SPEC §8.3).
    expect(twilightAmbient(-3) * 1000).toBeGreaterThan(15 * 2);
    expect(twilightAmbient(-6) * 1000).toBeLessThan(15 / 2.5);
    // At night the pools stand far above the unlit ground.
    expect(15 / (twilightAmbient(-20) * 1000)).toBeGreaterThan(5);
  });
});

describe("interior exposure", () => {
  it("is the calibrated 3.2 at night and about a stop lower at Saturday noon", () => {
    expect(interiorExposureFor(-20)).toBeCloseTo(INTERIOR_EXPOSURE, 3);
    const noon = interiorExposureFor(lightingFor("2026-11-07T11:00").sunElevationDeg);
    expect(Math.log2(INTERIOR_EXPOSURE / noon)).toBeGreaterThan(0.6);
    expect(Math.log2(INTERIOR_EXPOSURE / noon)).toBeLessThan(1.4);
    const arrival = interiorExposureFor(lightingFor("2026-11-06T15:30").sunElevationDeg);
    expect(arrival).toBeGreaterThan(noon);
    expect(arrival).toBeLessThan(INTERIOR_EXPOSURE);
  });

  it("keeps the street through a lobby's glazing within ≈ 2 stops of its own exposure by day", () => {
    for (const iso of ["2026-11-06T11:00", "2026-11-07T11:00", "2026-11-08T13:00", "2026-11-06T15:30"]) {
      const el = lightingFor(iso).sunElevationDeg;
      expect(Math.log2(interiorExposureFor(el) / exposureFor(el))).toBeLessThanOrEqual(2.2 + 1e-9);
    }
  });

  it("blends exterior and interior in log space, leaning to the interior after dark", () => {
    expect(blendExposure(1.5, 3.2, 0, 0)).toBeCloseTo(1.5, 9);
    expect(blendExposure(1.5, 3.2, 1, 1)).toBeCloseTo(3.2, 9);
    // By day an opened building keeps the 55 % blend.
    expect(blendExposure(1.5, 3.2, 0.55, 0)).toBeCloseTo(Math.exp(Math.log(1.5) * 0.45 + Math.log(3.2) * 0.55), 9);
    // At night the opened interior is within about half a stop of its own exposure.
    const night = exposureFor(-30);
    expect(Math.abs(Math.log2(blendExposure(night, INTERIOR_EXPOSURE, 0.55, 1) / INTERIOR_EXPOSURE))).toBeLessThan(0.6);
    // Monotonic in the indoor weight.
    let prev = blendExposure(night, INTERIOR_EXPOSURE, 0, 1);
    for (let w = 0.05; w <= 1.0001; w += 0.05) {
      const e = blendExposure(night, INTERIOR_EXPOSURE, w, 1);
      expect(e).toBeLessThanOrEqual(prev + 1e-9);
      prev = e;
    }
  });

  it("fills an opened building's dark surroundings only after dusk", () => {
    const dayEl = lightingFor("2026-11-07T11:00").sunElevationDeg;
    const dayExp = blendExposure(exposureFor(dayEl), interiorExposureFor(dayEl), 0.55, nightFactor(dayEl));
    expect(viewFill(dayExp, twilightAmbient(dayEl))).toBe(0);
    const nightExp = blendExposure(exposureFor(-30), INTERIOR_EXPOSURE, 0.55, 1);
    const fill = viewFill(nightExp, twilightAmbient(-30));
    expect(fill).toBeGreaterThan(0.01); // ≥ 10 lux: legible streets around the dollhouse
    expect(fill).toBeLessThan(0.1); // still a quarter of the interior's 400 lux at most
  });
});

describe("low-sun metering", () => {
  it("stops down only facing a low, visible sun, in proportion to the unhidden share", () => {
    expect(lowSunStops(1, 4.5, 1)).toBeCloseTo(0.8, 9);
    expect(lowSunStops(1, 4.5, 0.5)).toBeCloseTo(0.4, 9);
    expect(lowSunStops(1, 4.5, 0)).toBe(0);
    expect(lowSunStops(-1, 4.5, 1)).toBe(0);
    expect(lowSunStops(1, 30, 1)).toBe(0);
    expect(lowSunStops(1, -5, 1)).toBe(0);
    expect(lowSunStops(1, 4.5, 1, 0.06)).toBe(0); // overcast: no disc
  });

  it("adapts smoothly: walking past building edges never jumps the exposure in one frame", () => {
    // Sun sliding in and out behind buildings every ~1 s while walking at 60 fps.
    let stops = 0;
    let maxStep = 0;
    for (let f = 0; f < 600; f++) {
      const target = Math.floor(f / 60) % 2 === 0 ? 0.8 : 0.1;
      const next = adaptToward(stops, target, 1 / 60, 1.5);
      maxStep = Math.max(maxStep, Math.abs(next - stops));
      stops = next;
    }
    expect(maxStep).toBeLessThan(0.03); // EV per frame (was 0.55–0.6 EV in one frame)
    // …and settles: 3 s after a change it is within 0.01 EV.
    let s = 0;
    for (let f = 0; f < 180; f++) s = adaptToward(s, 0.6, 1 / 60, 1.5);
    expect(Math.abs(s - 0.6)).toBeLessThan(0.01);
  });

  it("samples the sun disc and its aureole around the sun direction", () => {
    const sun = new THREE.Vector3(-0.7, 0.08, 0.7).normalize();
    const dirs = sunSampleDirections(sun, 2, 6);
    expect(dirs).toHaveLength(7);
    for (const d of dirs) {
      expect(d.length()).toBeCloseTo(1, 9);
      const deg = (Math.acos(Math.min(1, d.dot(sun))) * 180) / Math.PI;
      expect(deg).toBeLessThan(2.01);
    }
  });
});
