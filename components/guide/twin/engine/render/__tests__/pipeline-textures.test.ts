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
jest.mock("three", () => nodeRequire()(`${process.cwd()}/node_modules/three/build/three.module.js`));
// jest.mock calls must be literal top-level statements (babel-jest hoists them).
jest.mock("three/addons/postprocessing/EffectComposer.js", () => nodeRequire()("three/addons/postprocessing/EffectComposer.js"));
jest.mock("three/addons/postprocessing/RenderPass.js", () => nodeRequire()("three/addons/postprocessing/RenderPass.js"));
jest.mock("three/addons/postprocessing/GTAOPass.js", () => nodeRequire()("three/addons/postprocessing/GTAOPass.js"));
jest.mock("three/addons/postprocessing/UnrealBloomPass.js", () => nodeRequire()("three/addons/postprocessing/UnrealBloomPass.js"));
jest.mock("three/addons/postprocessing/SMAAPass.js", () => nodeRequire()("three/addons/postprocessing/SMAAPass.js"));
jest.mock("three/addons/postprocessing/OutputPass.js", () => nodeRequire()("three/addons/postprocessing/OutputPass.js"));
jest.mock("three/addons/postprocessing/Pass.js", () => nodeRequire()("three/addons/postprocessing/Pass.js"));
jest.mock("three/addons/shaders/CopyShader.js", () => nodeRequire()("three/addons/shaders/CopyShader.js"));
jest.mock("three/addons/shaders/OutputShader.js", () => nodeRequire()("three/addons/shaders/OutputShader.js"));
jest.mock("three/addons/objects/Sky.js", () => nodeRequire()("three/addons/objects/Sky.js"));
jest.mock("three/addons/lights/SunLight.js", () => nodeRequire()("three/addons/lights/SunLight.js"));
jest.mock("three/addons/objects/Lensflare.js", () => nodeRequire()("three/addons/objects/Lensflare.js"));

import * as THREE from "three";
import { CopyShader } from "three/addons/shaders/CopyShader.js";
import { OutputShader } from "three/addons/shaders/OutputShader.js";
import { BLOOM_HIGH_PASS, FINITE_GLSL, LOOK, guardSampledColor, lookCurve, pixelRatioFor, withLook } from "../pipeline";
import {
  ANTITILE_NORMAL_CHUNK,
  TwinMaterialLibrary,
  decodeTarget,
  imageBitmapOptionsSupported,
  iosVersion,
  placeholderTexel,
} from "../materials";

/** Float32 reference of the shader's twFinite() bit tests (keeps the constants honest). */
function finiteRef(x: number): number {
  const bits = new Uint32Array(new Float32Array([x]).buffer)[0];
  const mag = bits & 0x7fffffff;
  if (mag > 0x7f800000) return 0;
  if (mag === 0x7f800000) return bits === mag ? 65504 : 0;
  return Math.min(Math.max(x, 0), 65504);
}

describe("post-processing NaN/Inf guard", () => {
  it("maps NaN to black, +∞ to the largest half float, −∞ and negatives to 0", () => {
    expect(finiteRef(NaN)).toBe(0);
    expect(finiteRef(Infinity)).toBe(65504);
    expect(finiteRef(-Infinity)).toBe(0);
    expect(finiteRef(-3)).toBe(0);
    expect(finiteRef(2.5)).toBeCloseTo(2.5, 6);
    expect(finiteRef(1e6)).toBe(65504);
    // The shader uses exactly these bit patterns.
    expect(FINITE_GLSL).toContain("0x7fffffffu");
    expect(FINITE_GLSL).toContain("0x7f800000u");
    expect(FINITE_GLSL).toContain("highp uint");
  });

  it("sanitises the bloom high-pass input before anything else reads it", () => {
    const sample = BLOOM_HIGH_PASS.indexOf("twFinite( texture2D( tDiffuse, vUv ).rgb )");
    expect(sample).toBeGreaterThan(0);
    expect(BLOOM_HIGH_PASS.indexOf("luminance(")).toBeGreaterThan(sample);
    expect(BLOOM_HIGH_PASS).not.toMatch(/texel\.a/);
  });

  it("patches the GTAO colour copy (a GLSL ES 3.00 ShaderMaterial) right after its sample", () => {
    const copy = guardSampledColor(CopyShader.fragmentShader, "vec4 texel = texture2D( tDiffuse, vUv );", "texel");
    expect(copy).not.toBeNull();
    const c = copy as string;
    expect(c.indexOf("float twFinite(")).toBeLessThan(c.indexOf("void main() {"));
    expect(c).toMatch(/vec4 texel = texture2D\( tDiffuse, vUv \);\s*texel\.rgb = twFinite\( texel\.rgb \);/);
    expect(c.indexOf("texel.rgb = twFinite")).toBeLessThan(c.indexOf("gl_FragColor = opacity * texel;"));
    expect(guardSampledColor("void main() { gl_FragColor = vec4(1.0); }", "texture2D( tDiffuse", "x")).toBeNull();
  });

  it("follows the device pixel ratio up to the tier cap", () => {
    expect(pixelRatioFor(2, 1.5)).toBe(1.5);
    expect(pixelRatioFor(1, 2)).toBe(1);
    expect(pixelRatioFor(1.25, 2)).toBe(1.25);
    expect(pixelRatioFor(Number.NaN, 2)).toBe(1);
    expect(pixelRatioFor(0, 2)).toBe(1);
  });
});

describe("photographic look after AgX", () => {
  it("patches the OutputPass shader: the look wraps AgX", () => {
    const fs = withLook(OutputShader.fragmentShader);
    expect(fs).not.toBeNull();
    expect(fs).toContain("twLook( AgXToneMapping( gl_FragColor.rgb ) )");
    expect(fs).toContain("uniform float twContrast;");
    expect(withLook("void main() {}")).toBeNull();
  });

  it("is an S-curve about mid-grey: ends and pivot fixed, deeper shadows, crisper highlights, monotonic", () => {
    expect(lookCurve(0)).toBe(0);
    expect(lookCurve(0.5)).toBeCloseTo(0.5, 12);
    expect(lookCurve(1)).toBe(1);
    expect(LOOK.contrast).toBeGreaterThan(1);
    // AgX puts −4 EV under mid-grey at ≈ sRGB 18 (0.07): the look takes it to ≈ 0.04.
    expect(lookCurve(0.071)).toBeLessThan(0.05);
    expect(lookCurve(0.84)).toBeGreaterThan(0.84);
    let prev = -1;
    for (let d = 0; d <= 1.0001; d += 0.01) {
      const v = lookCurve(d);
      expect(v).toBeGreaterThan(prev);
      prev = v;
    }
  });
});

describe("texture decoding on phones", () => {
  const ua = {
    safariIos16: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    safariIos17: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    chromeIos18: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
    firefoxIos17: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/131.0 Mobile/15E148 Safari/605.1.15",
    edgeIos16: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 EdgiOS/120.0 Mobile/15E148 Safari/605.1.15",
    ipadDesktop17: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    safariMac16: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
    safariMac17: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
    chromeMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
    chromeAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36",
    firefox97: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:97.0) Gecko/20100101 Firefox/97.0",
    firefox131: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0",
  };

  it("reads the iOS version whatever the browser brand", () => {
    expect(iosVersion(ua.chromeIos18)).toBe(18);
    expect(iosVersion(ua.firefoxIos17)).toBe(17);
    expect(iosVersion(ua.safariIos16)).toBe(16);
    expect(iosVersion(ua.ipadDesktop17, 5)).toBe(17);
    expect(iosVersion(ua.safariMac17, 0)).toBeNull();
    expect(iosVersion(ua.chromeAndroid)).toBeNull();
  });

  it("uses ImageBitmap options on every iOS 17+ browser (so the 512 decode applies), not on old WebKit", () => {
    expect(imageBitmapOptionsSupported(ua.chromeIos18)).toBe(true);
    expect(imageBitmapOptionsSupported(ua.firefoxIos17)).toBe(true);
    expect(imageBitmapOptionsSupported(ua.safariIos17)).toBe(true);
    expect(imageBitmapOptionsSupported(ua.safariIos16)).toBe(false);
    expect(imageBitmapOptionsSupported(ua.edgeIos16)).toBe(false);
    expect(imageBitmapOptionsSupported(ua.ipadDesktop17, 5)).toBe(true);
    expect(imageBitmapOptionsSupported(ua.safariMac16)).toBe(false);
    expect(imageBitmapOptionsSupported(ua.safariMac17)).toBe(true);
    expect(imageBitmapOptionsSupported(ua.chromeMac)).toBe(true);
    expect(imageBitmapOptionsSupported(ua.chromeAndroid)).toBe(true);
    expect(imageBitmapOptionsSupported(ua.firefox97)).toBe(false);
    expect(imageBitmapOptionsSupported(ua.firefox131)).toBe(true);
    expect(imageBitmapOptionsSupported(ua.chromeMac, 0, false)).toBe(false);
  });

  it("draws oversized images down to the decode budget (also where the resize option was ignored)", () => {
    expect(decodeTarget(1024, 1024, 512)).toBe(512);
    expect(decodeTarget(1024, 4096, 512)).toBe(512);
    expect(decodeTarget(512, 512, 512)).toBeNull();
    expect(decodeTarget(1024, 1024, 0)).toBeNull();
  });

  it("starts cut-out colour maps transparent so the alpha test discards them until they load", () => {
    for (const set of ["road_marking_paint", "manhole_cover", "leaves_autumn_yellow", "leaves_scattered_ground"] as const) {
      expect(placeholderTexel(set, "color")[3]).toBe(0);
      expect(placeholderTexel(set, "normal")).toEqual([128, 128, 255, 255]);
    }
    expect(placeholderTexel("asphalt_road_wet", "color")[3]).toBe(255);
    expect(placeholderTexel("asphalt_road_wet", "rough")).toEqual([180, 180, 180, 255]);
  });
});

describe("material colours", () => {
  beforeAll(() => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => null);
  });
  afterAll(() => jest.restoreAllMocks());

  it("uses the spec colour as is for sets without a colour map (glass: no milky calibration)", () => {
    const lib = new TwinMaterialLibrary("low", { maxAnisotropy: 1 });
    const glass = lib.get("glassInterior");
    expect(glass.map).toBeNull();
    expect(glass.color.getHexString()).toBe("0d0f10");
    expect(lib.calibrate("glassInterior", "#203040").getHexString()).toBe("203040");
    expect(lib.describe("glassInterior").color.getHexString()).toBe("0d0f10");
    expect(lib.variant("glassInterior", { color: "#101418" }).color.getHexString()).toBe("101418");
    // Textured sets still divide out the texture average.
    const brick = lib.get("brickDark");
    expect(brick.color.getHexString()).not.toBe("5f5854");
    lib.dispose();
  });
});

describe("anti-tiling of normal maps", () => {
  // jsdom has no 2D canvas: the 1×1 placeholders fall back to empty sources quietly.
  beforeAll(() => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => null);
  });
  afterAll(() => jest.restoreAllMocks());

  it("patches the expanded normal_fragment_maps chunk", () => {
    expect(THREE.ShaderLib.standard.fragmentShader).not.toContain("vec3 mapN = texture2D(");
    expect(ANTITILE_NORMAL_CHUNK).toContain("vec3 mapN2 = texture2D( normalMap, TW_ROT * vNormalMapUv + TW_OFF )");
    // The blend happens before normalScale and the TBN transform.
    expect(ANTITILE_NORMAL_CHUNK.indexOf("mapN = normalize( mix( mapN, mapN2, twTileMix ) );")).toBeLessThan(
      ANTITILE_NORMAL_CHUNK.indexOf("mapN.xy *= normalScale;"),
    );
  });

  it("puts the second normal sample into anti-tiled ground materials", () => {
    const lib = new TwinMaterialLibrary("low", { maxAnisotropy: 1 });
    for (const name of ["asphalt", "grass", "mulch"] as const) {
      const m = lib.get(name);
      const shader = {
        uniforms: {} as Record<string, THREE.IUniform>,
        defines: {} as Record<string, string>,
        vertexShader: THREE.ShaderLib.physical.vertexShader,
        fragmentShader: THREE.ShaderLib.physical.fragmentShader,
      };
      m.onBeforeCompile(shader as unknown as Parameters<THREE.Material["onBeforeCompile"]>[0], {} as THREE.WebGLRenderer);
      // Set on the material at patch time (stable program cache key), not inside onBeforeCompile.
      expect(m.defines?.TW_ANTITILE).toBe("");
      expect(shader.defines.TW_ANTITILE).toBeUndefined();
      expect(shader.fragmentShader).not.toContain("#include <normal_fragment_maps>");
      expect(shader.fragmentShader).toContain("mapN2.xy = transpose( TW_ROT ) * mapN2.xy;");
      // twTileMix is declared (map_fragment patch) before the normal chunk uses it.
      expect(shader.fragmentShader.indexOf("float twTileMix")).toBeLessThan(shader.fragmentShader.indexOf("mapN2"));
    }
    lib.dispose();
  });
});
