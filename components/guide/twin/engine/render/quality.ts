import type { Tier } from "../types";

/**
 * Rendering tiers (DESIGN §4):
 * - ultra: Apple M-series / discrete GPU — DPR ≤ 2, 2×2048² sun cascades, GTAO, bloom, SMAA, 2K textures.
 * - high: integrated laptop GPU — DPR ≤ 1.5, 2×1536² cascades, half-resolution GTAO, bloom, SMAA.
 * - low: phones/tablets/software — DPR ≤ 1.25, 2×1024² cascades near the camera, no GTAO, light bloom, MSAA.
 * The tier comes from ?quality=, else from the GPU string, screen and memory;
 * it drops one step at runtime when frames stay slow (createFrameMonitor).
 */

export interface TierSettings {
  tier: Tier;
  maxDpr: number;
  /** Size of each of the two sun shadow cascades (px). */
  shadowMapSize: number;
  /** Shadow range from the camera (m); farther ground is unshadowed (and in haze). */
  shadowDistance: number;
  /** PCF filter radius in texels. */
  shadowRadius: number;
  gtao: boolean;
  /** GTAO buffer scale relative to the drawing buffer. */
  gtaoScale: number;
  gtaoSamples: number;
  bloom: boolean;
  bloomStrength: number;
  bloomRadius: number;
  smaa: boolean;
  /** MSAA samples on the HDR target (used where SMAA is off). */
  msaa: number;
  /** Texture resolution for colour/normal maps where 2K exists. */
  textureRes: "1k" | "2k";
  /** Decode 1K files down to this size (phones). 0 = native. */
  textureDecodeSize: number;
  /** Load ambient-occlusion maps. */
  aoMaps: boolean;
  /** Parallax rooms behind facade windows. */
  interiorMapping: boolean;
  /** Multiplier for instance counts (trees, people, cars). */
  instanceScale: number;
  /** Physical extras (sheen, clearcoat, anisotropy, transmission on hero glass). */
  physicalExtras: boolean;
  lensflare: boolean;
}

export const TIER_SETTINGS: Record<Tier, TierSettings> = {
  ultra: {
    tier: "ultra",
    maxDpr: 2,
    shadowMapSize: 2048,
    shadowDistance: 700,
    shadowRadius: 2.5,
    gtao: true,
    gtaoScale: 1,
    gtaoSamples: 16,
    bloom: true,
    bloomStrength: 0.2,
    bloomRadius: 0.14,
    smaa: true,
    msaa: 0,
    textureRes: "2k",
    textureDecodeSize: 0,
    aoMaps: true,
    interiorMapping: true,
    instanceScale: 1,
    physicalExtras: true,
    lensflare: true,
  },
  high: {
    tier: "high",
    maxDpr: 1.5,
    shadowMapSize: 1536,
    shadowDistance: 550,
    shadowRadius: 2,
    gtao: true,
    gtaoScale: 0.5,
    gtaoSamples: 12,
    bloom: true,
    bloomStrength: 0.18,
    bloomRadius: 0.14,
    smaa: true,
    msaa: 0,
    textureRes: "1k",
    textureDecodeSize: 0,
    aoMaps: true,
    interiorMapping: true,
    instanceScale: 0.7,
    physicalExtras: true,
    lensflare: false,
  },
  low: {
    tier: "low",
    maxDpr: 1.25,
    shadowMapSize: 1024,
    shadowDistance: 260,
    shadowRadius: 1.5,
    gtao: false,
    gtaoScale: 0.5,
    gtaoSamples: 8,
    bloom: true,
    bloomStrength: 0.15,
    bloomRadius: 0.12,
    smaa: false,
    msaa: 4,
    textureRes: "1k",
    textureDecodeSize: 512,
    aoMaps: false,
    interiorMapping: false,
    instanceScale: 0.35,
    physicalExtras: false,
    lensflare: false,
  },
};

export interface DeviceInfo {
  /** UNMASKED_RENDERER_WEBGL (or RENDERER when masked). */
  renderer: string;
  vendor: string;
  userAgent: string;
  /** CSS pixels. */
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
  /** navigator.deviceMemory (GB) when exposed. */
  deviceMemory?: number;
  hardwareConcurrency?: number;
  maxTouchPoints?: number;
  /**
   * WEBGL_compressed_texture_astc is exposed. Only Apple-family GPUs (Apple silicon, iPhone/iPad)
   * have ASTC among Macs — Intel and AMD Macs do not — so it separates Safari's generic "Apple GPU".
   */
  astc?: boolean;
}

export interface TierDecision {
  tier: Tier;
  reason: string;
}

const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|PlayBook/i;
const MOBILE_GPU = /Adreno|Mali|PowerVR|Apple A\d|Immortalis|Xclipse|Tegra|Vivante|VideoCore/i;
const SOFTWARE_GPU = /SwiftShader|llvmpipe|Software|Microsoft Basic Render|softpipe/i;
const DISCRETE_GPU =
  /NVIDIA|GeForce|Quadro|RTX|GTX|Radeon(?!.*(Vega \d|Graphics))|Radeon Pro|AMD Radeon RX|Arc A\d|Intel\(R\) Arc|Apple M\d/i;
/** Chrome, Edge and Firefox name the chip on Apple silicon ("Apple M2 Pro"). */
const APPLE_SILICON = /Apple M\d/i;
/** Safari reports this on every Mac — Apple silicon, Intel and AMD alike — with an "Intel Mac OS X" UA. */
const APPLE_GENERIC = /Apple GPU/i;
const INTEGRATED = /Intel|UHD|Iris|HD Graphics|Radeon(\(TM\))? Graphics|Vega \d|Mali-G\d+ MC|Adreno \(TM\) 6[89]\d/i;

/**
 * Pure tier choice from the device description (unit-tested).
 * Order: software → low; phones/tablets → low; memory limits; GPU family.
 */
export function classifyDevice(d: DeviceInfo): TierDecision {
  const gpu = `${d.vendor} ${d.renderer}`;
  if (SOFTWARE_GPU.test(gpu)) return { tier: "low", reason: "software renderer" };
  // iPadOS reports a Mac user agent; touch points give it away.
  const ipadDesktopUa = /Macintosh/.test(d.userAgent) && (d.maxTouchPoints ?? 0) > 1;
  const mobile = MOBILE_UA.test(d.userAgent) || ipadDesktopUa || MOBILE_GPU.test(gpu);
  if (mobile) return { tier: "low", reason: "phone or tablet" };
  if (d.deviceMemory !== undefined && d.deviceMemory <= 2) return { tier: "low", reason: "≤ 2 GB memory" };
  const cores = d.hardwareConcurrency ?? 8;
  if (/Mac/.test(d.userAgent)) {
    if (APPLE_SILICON.test(gpu)) return { tier: "ultra", reason: "Apple silicon" };
    // Safari: the generic name is Apple silicon only if the GPU has ASTC; otherwise it is an
    // Intel or AMD Mac (DPR 2, full-resolution GTAO and 2K maps would crawl on Iris graphics).
    if (APPLE_GENERIC.test(gpu)) {
      return d.astc === true
        ? { tier: "ultra", reason: "Apple silicon (Safari, ASTC)" }
        : { tier: "high", reason: "Mac GPU without ASTC (Intel/AMD)" };
    }
  }
  if (DISCRETE_GPU.test(gpu)) {
    if (d.deviceMemory !== undefined && d.deviceMemory <= 4) return { tier: "high", reason: "discrete GPU, ≤ 4 GB memory" };
    return { tier: "ultra", reason: "discrete GPU" };
  }
  if (INTEGRATED.test(gpu)) {
    if (cores <= 2) return { tier: "low", reason: "integrated GPU, 2 cores" };
    return { tier: "high", reason: "integrated GPU" };
  }
  // Unknown (masked) desktop GPU: be conservative but not pessimistic.
  if (cores >= 8 && (d.deviceMemory === undefined || d.deviceMemory >= 8)) return { tier: "high", reason: "unknown GPU, capable CPU" };
  return { tier: "high", reason: "unknown GPU" };
}

/** ?quality=ultra|high|low (also "medium" → high, "auto" → null). */
export function tierFromParam(search: string): Tier | null {
  const q = new URLSearchParams(search).get("quality")?.toLowerCase();
  if (q === "ultra" || q === "high" || q === "low") return q;
  if (q === "medium") return "high";
  return null;
}

/** Reads the GPU string from a throwaway WebGL2 context. */
export function readDeviceInfo(): DeviceInfo {
  let renderer = "";
  let vendor = "";
  let astc: boolean | undefined;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false });
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      renderer = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
      vendor = String(gl.getParameter(ext ? ext.UNMASKED_VENDOR_WEBGL : gl.VENDOR) ?? "");
      astc = gl.getSupportedExtensions()?.includes("WEBGL_compressed_texture_astc") ?? false;
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    // Unknown GPU — classifyDevice falls back to the screen and CPU.
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    renderer,
    vendor,
    userAgent: navigator.userAgent,
    screenWidth: window.screen?.width ?? window.innerWidth,
    screenHeight: window.screen?.height ?? window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints,
    astc,
  };
}

/** Tier for this device: explicit override → ?quality → detection. */
export function detectTier(override?: Tier): TierDecision & { device: DeviceInfo | null } {
  if (override) return { tier: override, reason: "option", device: null };
  const fromParam = typeof window !== "undefined" ? tierFromParam(window.location.search) : null;
  if (fromParam) return { tier: fromParam, reason: "?quality", device: null };
  const device = readDeviceInfo();
  return { ...classifyDevice(device), device };
}

export function lowerTier(tier: Tier): Tier | null {
  return tier === "ultra" ? "high" : tier === "high" ? "low" : null;
}

/**
 * Watches frame times while the scene animates and asks for a downgrade
 * when the median of the last `window` frames stays above `budgetMs`.
 * Idle (on-demand) frames are not sampled, so a paused tab never downgrades.
 */
export function createFrameMonitor(opts: { budgetMs?: number; window?: number; onSlow(): void }) {
  const budget = opts.budgetMs ?? 40;
  const size = opts.window ?? 90;
  const samples: number[] = [];
  let cooldown = 0;
  return {
    sample(frameMs: number) {
      if (cooldown > 0) {
        cooldown--;
        return;
      }
      // Ignore huge gaps (tab switch, breakpoint) — they are not render cost.
      if (frameMs > 1000) return;
      samples.push(frameMs);
      if (samples.length < size) return;
      const sorted = samples.slice().sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      samples.length = 0;
      if (median > budget) {
        cooldown = size * 2;
        opts.onSlow();
      }
    },
    reset() {
      samples.length = 0;
    },
  };
}
