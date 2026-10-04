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

import * as THREE from "three";
import { TIER_SETTINGS, classifyDevice, createFrameMonitor, lowerTier, tierFromParam, type DeviceInfo } from "../quality";
import { boxUV, pathUV, planarUV, ribbonGeometry } from "../uv";

const mac: DeviceInfo = {
  renderer: "ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)",
  vendor: "Google Inc. (Apple)",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36",
  screenWidth: 1728,
  screenHeight: 1117,
  devicePixelRatio: 2,
  deviceMemory: 8,
  hardwareConcurrency: 12,
  maxTouchPoints: 0,
};

describe("rendering tiers", () => {
  it("puts Apple silicon and discrete GPUs on ultra", () => {
    expect(classifyDevice(mac).tier).toBe("ultra");
    expect(
      classifyDevice({ ...mac, renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)", userAgent: "Windows NT 10.0" })
        .tier,
    ).toBe("ultra");
  });

  it("tells Apple silicon from Intel/AMD Macs in Safari (both report \"Apple GPU\" and an Intel Mac UA)", () => {
    const safari = {
      ...mac,
      renderer: "Apple GPU",
      vendor: "Apple Inc.",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
      deviceMemory: undefined,
      hardwareConcurrency: 8,
    };
    expect(classifyDevice({ ...safari, astc: true }).tier).toBe("ultra");
    expect(classifyDevice({ ...safari, astc: false }).tier).toBe("high");
    expect(classifyDevice({ ...safari, astc: undefined }).tier).toBe("high");
    // Chrome names the chip; an Intel Mac in Chrome names the Intel GPU.
    expect(classifyDevice({ ...mac, astc: false }).tier).toBe("ultra");
    expect(
      classifyDevice({ ...mac, renderer: "ANGLE (Intel Inc., Intel(R) Iris(TM) Plus Graphics 655, OpenGL 4.1)", vendor: "Google Inc. (Intel Inc.)" })
        .tier,
    ).toBe("high");
    // An iPad asking for the desktop site stays on low.
    expect(classifyDevice({ ...safari, astc: true, maxTouchPoints: 5 }).tier).toBe("low");
  });

  it("puts integrated laptop GPUs on high", () => {
    expect(
      classifyDevice({ ...mac, renderer: "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)", userAgent: "Windows NT 10.0" })
        .tier,
    ).toBe("high");
  });

  it("puts phones, tablets and software renderers on low", () => {
    expect(classifyDevice({ ...mac, renderer: "Apple GPU", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" }).tier).toBe("low");
    expect(classifyDevice({ ...mac, renderer: "Adreno (TM) 740", userAgent: "Linux; Android 14" }).tier).toBe("low");
    expect(classifyDevice({ ...mac, renderer: "Apple GPU", maxTouchPoints: 5 }).tier).toBe("low");
    expect(classifyDevice({ ...mac, renderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)" }).tier).toBe("low");
  });

  it("reads ?quality and steps down", () => {
    expect(tierFromParam("?quality=low")).toBe("low");
    expect(tierFromParam("?quality=medium")).toBe("high");
    expect(tierFromParam("?quality=auto")).toBeNull();
    expect(lowerTier("ultra")).toBe("high");
    expect(lowerTier("low")).toBeNull();
    expect(TIER_SETTINGS.low.maxDpr).toBeLessThanOrEqual(1.25);
    expect(TIER_SETTINGS.ultra.gtao && !TIER_SETTINGS.low.gtao).toBe(true);
  });

  it("asks for a downgrade only when frames stay slow", () => {
    const onSlow = jest.fn();
    const m = createFrameMonitor({ budgetMs: 40, window: 10, onSlow });
    for (let i = 0; i < 10; i++) m.sample(16);
    expect(onSlow).not.toHaveBeenCalled();
    for (let i = 0; i < 10; i++) m.sample(60);
    expect(onSlow).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 2000; i++) m.sample(5000); // tab switches are ignored
    expect(onSlow).toHaveBeenCalledTimes(1);
  });
});

describe("metre UVs", () => {
  it("box-projects walls in metres without mirroring", () => {
    const g = boxUV(new THREE.BoxGeometry(4, 3, 2));
    const uv = g.getAttribute("uv");
    let maxU = -Infinity;
    let minU = Infinity;
    for (let i = 0; i < uv.count; i++) {
      maxU = Math.max(maxU, uv.getX(i));
      minU = Math.min(minU, uv.getX(i));
    }
    expect(maxU - minU).toBeCloseTo(4);
    // +z face: u grows with x.
    const pos = g.getAttribute("position");
    const nor = g.getAttribute("normal");
    for (let i = 0; i < pos.count; i++) {
      if (nor.getZ(i) > 0.9) expect(uv.getX(i)).toBeCloseTo(pos.getX(i));
      if (nor.getZ(i) < -0.9) expect(uv.getX(i)).toBeCloseTo(-pos.getX(i));
    }
  });

  it("projects a plan view (u = x, v = −z) with a scale", () => {
    const g = planarUV(new THREE.PlaneGeometry(10, 10).rotateX(-Math.PI / 2), "y", 2);
    const uv = g.getAttribute("uv");
    const pos = g.getAttribute("position");
    for (let i = 0; i < uv.count; i++) {
      expect(uv.getX(i)).toBeCloseTo(pos.getX(i) * 2);
      expect(uv.getY(i)).toBeCloseTo(-pos.getZ(i) * 2);
    }
  });

  it("builds ribbons facing up with u = metres along the path", () => {
    const g = ribbonGeometry(
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
      2,
      { lift: 0.02 },
    );
    const n = g.getAttribute("normal");
    for (let i = 0; i < n.count; i++) expect(n.getY(i)).toBeGreaterThan(0.99);
    const uv = g.getAttribute("uv");
    expect(uv.getX(uv.count - 1)).toBeCloseTo(20);
    expect(g.getAttribute("position").getY(0)).toBeCloseTo(0.02);
    // Re-projecting onto the same path keeps u and puts v in [−1, 1].
    pathUV(g, [
      [0, 0],
      [10, 0],
      [10, 10],
    ]);
    const uv2 = g.getAttribute("uv");
    for (let i = 0; i < uv2.count; i++) expect(Math.abs(uv2.getY(i))).toBeLessThanOrEqual(1.5);
  });
});
