import * as THREE from "three";
import type { MaterialLibrary, MaterialName, Tier } from "../types";
import { markShared } from "../util";
import { LUMINANCE } from "../sky/sky";
import { TIER_SETTINGS, type TierSettings } from "./quality";
import { makeGravelCanvases } from "./canvas";

/**
 * Shared PBR materials built from the CC0 texture sets in
 * public/assets/guide/3d/tex/ (see LICENSES.md there).
 *
 * - Meshes need metre UVs (render/uv.ts); each texture repeats every
 *   `tileSize` metres (texture.repeat = 1 / tile).
 * - Textures start as 1×1 placeholders in the set's average colour and swap
 *   to the real image when it arrives, so nothing ever renders black/white
 *   and no shader recompiles when images land.
 * - Albedo is calibrated to measured colours (SPEC §3, §9.1): the material
 *   colour is target / texture-average in linear space.
 * - Ground materials get world-space macro variation and anti-tiling so a
 *   2 m texture does not repeat visibly across a 300 m campus.
 */

const TEX_BASE = "/assets/guide/3d/tex";

export type MapKind = "color" | "normal" | "rough" | "ao" | "metal";

interface TextureSet {
  tile: [number, number];
  maps: MapKind[];
  has2k: boolean;
  /** Average sRGB colour of the colour map (manifest). */
  avg: string;
  /** Alternative colour file suffix (e.g. carpet "color_anthracite"). */
  colorFile?: string;
  alpha?: boolean;
}

/** Texture sets from research/assets/manifest.json. */
const SETS = {
  asphalt_road_wet: { tile: [2.0, 2.0], maps: ["color", "normal", "rough", "ao"], has2k: true, avg: "#2b2b29" },
  asphalt_footway: { tile: [2.1, 2.1], maps: ["color", "normal", "rough", "ao"], has2k: false, avg: "#444546" },
  bark_birch: { tile: [1.0, 1.0], maps: ["color", "normal", "rough", "ao"], has2k: false, avg: "#959495" },
  bark_pine: { tile: [2.0, 2.0], maps: ["color", "normal", "rough", "ao"], has2k: false, avg: "#665340" },
  brick_dark: { tile: [1.91, 1.91], maps: ["color", "normal", "rough", "ao"], has2k: true, avg: "#4b4139" },
  carpet_dark: {
    tile: [0.5, 0.5],
    maps: ["color", "normal", "rough", "ao"],
    has2k: false,
    avg: "#3a3a3a",
    colorFile: "color_anthracite",
  },
  concrete_polished: { tile: [3.0, 3.0], maps: ["color", "normal", "rough", "ao"], has2k: true, avg: "#565754" },
  fabric_upholstery: { tile: [0.3, 0.3], maps: ["color", "normal", "rough", "ao"], has2k: false, avg: "#bababa" },
  glass_smudge: { tile: [1.0, 0.74], maps: ["normal", "rough"], has2k: false, avg: "#121212" },
  granite_kerb: { tile: [0.4, 0.4], maps: ["color", "normal", "rough"], has2k: false, avg: "#b5b1ad" },
  grass_autumn: { tile: [2.0, 2.0], maps: ["color", "normal", "rough", "ao"], has2k: false, avg: "#978359" },
  grass_worn: { tile: [2.51, 2.51], maps: ["color", "normal", "rough", "ao"], has2k: false, avg: "#6e603e" },
  leaves_autumn_yellow: { tile: [0.2, 0.2], maps: ["color", "normal", "rough"], has2k: false, avg: "#a48c3c", alpha: true },
  leaves_scattered_ground: {
    tile: [1.0, 1.0],
    maps: ["color", "normal", "rough", "ao"],
    has2k: false,
    avg: "#6b5232",
    alpha: true,
  },
  manhole_cover: { tile: [0.85, 0.85], maps: ["color", "normal", "rough", "ao", "metal"], has2k: false, avg: "#3d3b38", alpha: true },
  metal_black_panel: { tile: [0.5, 0.5], maps: ["color", "normal", "rough"], has2k: false, avg: "#1e2221" },
  metal_brushed_steel: { tile: [0.5, 0.5], maps: ["color", "normal", "rough"], has2k: false, avg: "#929597" },
  metal_white_painted: { tile: [0.5, 0.5], maps: ["color", "normal", "rough"], has2k: false, avg: "#eaeae8" },
  mulch_bark: { tile: [2.0, 2.0], maps: ["color", "normal", "rough", "ao"], has2k: false, avg: "#50381a" },
  pavers_concrete_slab: { tile: [3.0, 3.0], maps: ["color", "normal", "rough", "ao"], has2k: true, avg: "#7c786c" },
  pavers_granite_setts: { tile: [2.2, 1.1], maps: ["color", "normal", "rough", "ao"], has2k: true, avg: "#7c7e7e" },
  road_marking_paint: { tile: [0.22, 0.89], maps: ["color", "normal", "rough", "ao"], has2k: false, avg: "#e8e8e3", alpha: true },
  soil_dark: { tile: [2.0, 2.0], maps: ["color", "normal", "rough", "ao"], has2k: false, avg: "#58442e" },
  terrazzo: { tile: [0.6, 0.6], maps: ["color", "normal", "rough"], has2k: false, avg: "#bfbbbe" },
  wood_birch_lamella: { tile: [1.4, 1.4], maps: ["color", "normal", "rough", "ao"], has2k: true, avg: "#d1a976" },
  wood_oak_pale: { tile: [1.0, 1.0], maps: ["color", "normal", "rough", "ao"], has2k: true, avg: "#e2cbb4" },
  /** Procedural (render/canvas.ts) — the manifest has no gravel set. */
  gravel: { tile: [1.0, 1.0], maps: ["color", "normal", "rough"], has2k: false, avg: "#7f7a72" },
} satisfies Record<string, TextureSet>;

export type TextureSetName = keyof typeof SETS;

/** Materials that started as library extras; now part of MaterialName (kept for older call sites). */
export type ExtraMaterialName = Extract<
  MaterialName,
  "asphaltFootway" | "asphaltRed" | "setts" | "barkBirch" | "mulch" | "leafLitter" | "manhole" | "roadLineDecal"
>;

type AnyMaterialName = MaterialName;

interface PatchSpec {
  /** World-space macro albedo variation (amplitude 0..1, scale in metres). */
  macro?: { amp: number; scale: number; rough?: number };
  /** Blend two differently rotated samples of the colour/normal/roughness maps. */
  antiTile?: boolean;
  /** Desaturate the colour map (1 = unchanged). */
  saturation?: number;
  /** Floor tile grout grid (size in metres, line width in metres, grout colour sRGB). */
  grout?: { size: number; width: number; color: string };
  /** Blend a second colour set by world noise (grass: autumn + worn). */
  blend?: { set: TextureSetName; scale: number; amount: number };
}

interface MaterialSpec {
  set?: TextureSetName;
  tile?: [number, number];
  /** Target average albedo (sRGB) — or the flat colour when there is no set. */
  color: string;
  roughness: number;
  metalness?: number;
  normalScale?: number;
  aoIntensity?: number;
  envMapIntensity?: number;
  kind?: "standard" | "physical";
  physical?: Partial<{
    clearcoat: number;
    clearcoatRoughness: number;
    sheen: number;
    sheenRoughness: number;
    sheenColor: string;
    ior: number;
    specularIntensity: number;
    anisotropy: number;
  }>;
  /** Glass: reflections at full strength over a dimmed background (premultiplied blend). */
  glass?: { coverage: number };
  emissive?: { color: string; intensity: number };
  alphaTest?: number;
  doubleSided?: boolean;
  polygonOffset?: number;
  patch?: PatchSpec;
}

const SPECS: Record<AnyMaterialName, MaterialSpec> = {
  // ── ground ──
  asphalt: {
    set: "asphalt_road_wet",
    color: "#474745",
    roughness: 0.92,
    normalScale: 0.85,
    aoIntensity: 0.6,
    patch: { macro: { amp: 0.16, scale: 23, rough: 0.12 }, antiTile: true },
  },
  roadMarking: {
    color: "#d9d9d3",
    roughness: 0.48,
    polygonOffset: -2,
    patch: { macro: { amp: 0.14, scale: 2.5, rough: 0.2 } },
  },
  pavers: {
    set: "pavers_concrete_slab",
    tile: [1.2, 1.2],
    color: "#96928b",
    roughness: 0.82,
    aoIntensity: 0.8,
    patch: { macro: { amp: 0.1, scale: 17, rough: 0.08 } },
  },
  granite: { set: "granite_kerb", color: "#aaa6a1", roughness: 1, normalScale: 0.5 },
  kerb: { set: "granite_kerb", color: "#9e9b97", roughness: 1.05, normalScale: 0.5, patch: { macro: { amp: 0.08, scale: 6 } } },
  grass: {
    set: "grass_autumn",
    color: "#7a7350",
    roughness: 1.2,
    aoIntensity: 0.7,
    patch: {
      macro: { amp: 0.2, scale: 9, rough: 0.05 },
      antiTile: true,
      blend: { set: "grass_worn", scale: 14, amount: 0.55 },
    },
  },
  soil: { set: "soil_dark", color: "#4d3d2b", roughness: 0.98, patch: { macro: { amp: 0.12, scale: 6 }, antiTile: true } },
  gravel: { set: "gravel", color: "#8a857c", roughness: 1, patch: { macro: { amp: 0.1, scale: 8 }, antiTile: true } },
  // ── facades ──
  brickDark: {
    set: "brick_dark",
    tile: [4.8, 1.1],
    color: "#5f5854",
    roughness: 1,
    aoIntensity: 0.9,
    patch: { saturation: 0.42, macro: { amp: 0.06, scale: 11 } },
  },
  panelBlack: { set: "metal_black_panel", color: "#2b2a2e", roughness: 1.15, patch: { macro: { amp: 0.05, scale: 7 } } },
  panelGrey: { set: "metal_white_painted", color: "#c8ccce", roughness: 1.45 },
  concreteFacade: { set: "concrete_polished", color: "#8f8a82", roughness: 1.45, patch: { macro: { amp: 0.08, scale: 9 } } },
  metalDark: { set: "metal_black_panel", color: "#1e1e22", roughness: 1.3 },
  metalWhite: { set: "metal_white_painted", color: "#dcdfe2", roughness: 1.15 },
  glassFacade: {
    kind: "physical",
    color: "#151b22",
    roughness: 0.04,
    envMapIntensity: 1.25,
    physical: { ior: 1.52, specularIntensity: 1.35 },
  },
  // ── interiors ──
  glassInterior: {
    kind: "physical",
    set: "glass_smudge",
    color: "#0d0f10",
    roughness: 0.1,
    normalScale: 0.04,
    glass: { coverage: 0.07 },
    physical: { ior: 1.5 },
  },
  concreteFloor: { set: "concrete_polished", color: "#c4c3be", roughness: 0.62, patch: { macro: { amp: 0.06, scale: 7 } } },
  terrazzo: { set: "terrazzo", color: "#bfbbbe", roughness: 1 },
  stoneFloor: {
    set: "concrete_polished",
    color: "#cfcdc8",
    roughness: 0.85,
    normalScale: 0.4,
    patch: { grout: { size: 0.6, width: 0.004, color: "#8e8c87" } },
  },
  birch: { set: "wood_birch_lamella", color: "#d6c3a0", roughness: 1.1 },
  oak: { set: "wood_oak_pale", color: "#dcc4aa", roughness: 1 },
  carpetDark: { set: "carpet_dark", color: "#3e4146", roughness: 1.05, normalScale: 0.8 },
  carpetGrey: { set: "carpet_dark", color: "#8a8b8f", roughness: 1.05, normalScale: 0.8 },
  plasterWhite: { color: "#e6e6e8", roughness: 0.9, patch: { macro: { amp: 0.025, scale: 2.5 } } },
  plasterGrey: { color: "#787c82", roughness: 0.85, patch: { macro: { amp: 0.03, scale: 2.5 } } },
  ceiling: { color: "#e6e4df", roughness: 0.95 },
  fabricPink: {
    kind: "physical",
    set: "fabric_upholstery",
    color: "#c08080",
    roughness: 1,
    physical: { sheen: 0.45, sheenRoughness: 0.8, sheenColor: "#ffd0d0" },
  },
  fabricTeal: {
    kind: "physical",
    set: "fabric_upholstery",
    color: "#0a5a6e",
    roughness: 1,
    physical: { sheen: 0.4, sheenRoughness: 0.8, sheenColor: "#8fd6e6" },
  },
  fabricDark: {
    kind: "physical",
    set: "fabric_upholstery",
    color: "#2c2e33",
    roughness: 1,
    physical: { sheen: 0.35, sheenRoughness: 0.8, sheenColor: "#9aa0aa" },
  },
  leather: {
    kind: "physical",
    set: "fabric_upholstery",
    tile: [0.12, 0.12],
    color: "#2a2421",
    roughness: 0.6,
    normalScale: 0.35,
    physical: { clearcoat: 0.15, clearcoatRoughness: 0.4 },
  },
  // ── objects ──
  steel: {
    kind: "physical",
    set: "metal_brushed_steel",
    color: "#c9cbcc",
    roughness: 0.85,
    metalness: 1,
    physical: { anisotropy: 0.6 },
  },
  chrome: { color: "#d6d8da", roughness: 0.06, metalness: 1 },
  blackMatte: { color: "#151617", roughness: 0.75 },
  rubber: { color: "#1a1a1a", roughness: 0.92 },
  carPaintBlack: {
    kind: "physical",
    color: "#0b0c0e",
    roughness: 0.35,
    metalness: 0.6,
    physical: { clearcoat: 1, clearcoatRoughness: 0.04 },
  },
  carGlass: { kind: "physical", color: "#0e1216", roughness: 0.02, glass: { coverage: 0.55 }, physical: { ior: 1.52 } },
  bark: { set: "bark_pine", color: "#58514b", roughness: 1.2, patch: { saturation: 0.45 } },
  foliage: { set: "leaves_autumn_yellow", color: "#a48c3c", roughness: 1.1, alphaTest: 0.5, doubleSided: true },
  screen: { color: "#050505", roughness: 0.22, emissive: { color: "#ffffff", intensity: LUMINANCE.ledWall } },
  // ── extras ──
  asphaltFootway: {
    set: "asphalt_footway",
    color: "#4c4c4b",
    roughness: 0.85,
    aoIntensity: 0.6,
    patch: { macro: { amp: 0.12, scale: 15, rough: 0.1 }, antiTile: true },
  },
  asphaltRed: {
    set: "asphalt_footway",
    color: "#6e4a42",
    roughness: 0.85,
    patch: { macro: { amp: 0.14, scale: 12, rough: 0.1 }, antiTile: true },
  },
  setts: { set: "pavers_granite_setts", color: "#7c7d7c", roughness: 0.9, aoIntensity: 0.8, patch: { macro: { amp: 0.08, scale: 10 } } },
  barkBirch: { set: "bark_birch", color: "#959495", roughness: 1 },
  mulch: { set: "mulch_bark", color: "#4a3520", roughness: 1, patch: { antiTile: true } },
  leafLitter: { set: "leaves_scattered_ground", color: "#6b5232", roughness: 1, alphaTest: 0.5, polygonOffset: -1 },
  manhole: { set: "manhole_cover", color: "#3d3b38", roughness: 1, metalness: 1, alphaTest: 0.5, polygonOffset: -1 },
  roadLineDecal: { set: "road_marking_paint", color: "#d9d9d3", roughness: 1, alphaTest: 0.5, polygonOffset: -2 },
};

// ── Colour maths ────────────────────────────────────────────────────────────

/** Whether a material's texture set has a colour map (only then is its colour a calibration multiplier). */
function hasColorMap(set: TextureSetName | undefined): set is TextureSetName {
  return set !== undefined && (SETS[set].maps as readonly MapKind[]).includes("color");
}

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

/** Linear multiplier that maps a texture's average colour onto a target colour. */
export function albedoMultiplier(target: string, average: string, saturation = 1): THREE.Color {
  tmpA.set(target); // linear (ColorManagement converts the sRGB hex)
  tmpB.set(average);
  if (saturation !== 1) {
    const l = 0.2126 * tmpB.r + 0.7152 * tmpB.g + 0.0722 * tmpB.b;
    tmpB.setRGB(l + (tmpB.r - l) * saturation, l + (tmpB.g - l) * saturation, l + (tmpB.b - l) * saturation);
  }
  return new THREE.Color(tmpA.r / Math.max(tmpB.r, 1e-4), tmpA.g / Math.max(tmpB.g, 1e-4), tmpA.b / Math.max(tmpB.b, 1e-4));
}

// ── Texture store ───────────────────────────────────────────────────────────

interface FileEntry {
  /** One Source per file: every material/tile using it shares one GPU upload. */
  source: THREE.TextureSource<unknown>;
  textures: Map<string, THREE.Texture>;
  promise: Promise<void>;
  /** Upload orientation of the current image (see load()). */
  flipY: boolean;
}

function placeholderCanvas(rgba: [number, number, number, number]): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = `rgba(${rgba[0]},${rgba[1]},${rgba[2]},${rgba[3] / 255})`;
  ctx.fillRect(0, 0, 1, 1);
  return c;
}

/**
 * Major iOS/iPadOS version for browsers on Apple mobile devices, else null. Every iOS browser
 * (Safari, Chrome "CriOS", Firefox "FxiOS", Edge "EdgiOS") runs the system WebKit, so the OS
 * version — not the browser brand — says what createImageBitmap supports. iPadOS asks for
 * desktop pages with a Mac user agent; its touch points give it away.
 */
export function iosVersion(ua: string, maxTouchPoints = 0): number | null {
  if (/iPhone|iPad|iPod/.test(ua)) return Number(/OS (\d+)[_.]/.exec(ua)?.[1] ?? 0);
  if (/Macintosh/.test(ua) && maxTouchPoints > 1) return Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0);
  return null;
}

/**
 * Whether createImageBitmap honours imageOrientation/premultiplyAlpha (WebKit 17+, Firefox 98+,
 * Chromium). Older engines ignore the flip, which would turn every texture upside down.
 */
export function imageBitmapOptionsSupported(ua: string, maxTouchPoints = 0, hasCreateImageBitmap = true): boolean {
  if (!hasCreateImageBitmap) return false;
  const ios = iosVersion(ua, maxTouchPoints);
  if (ios !== null) return ios >= 17;
  const safari = /^((?!chrome|chromium|android|crios|fxios|edgios).)*safari/i.test(ua);
  if (safari) return Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0) >= 17;
  const firefox = /Firefox\/(\d+)/.exec(ua);
  if (firefox) return Number(firefox[1]) >= 98;
  return true;
}

function supportsImageBitmapOptions(): boolean {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  return imageBitmapOptionsSupported(nav?.userAgent ?? "", nav?.maxTouchPoints ?? 0, typeof createImageBitmap !== "undefined");
}

/**
 * Size a decoded image is drawn down to on tiers with a decode budget (square, like the
 * ImageBitmap resize), or null when it already fits.
 */
export function decodeTarget(width: number, height: number, decodeSize: number): number | null {
  if (decodeSize <= 0 || (width <= decodeSize && height <= decodeSize)) return null;
  return decodeSize;
}

/**
 * Draws an image into a smaller square canvas (keeps its row order — the caller keeps the flip).
 * Canvas storage is premultiplied, so fully transparent texels lose their colour; only the
 * alpha-tested cut-out sets have such texels, and the alpha test discards them.
 */
function downscaled(image: ImageBitmap | HTMLImageElement, size: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, size, size);
  return canvas;
}

/**
 * 1×1 placeholder texel (sRGB bytes + alpha) shown until a map arrives: the set's average colour,
 * a flat normal, neutral roughness/AO/metal. Colour maps of cut-out sets (decals, leaves) start
 * fully transparent so their alpha test discards them — never solid average-colour quads.
 */
export function placeholderTexel(set: TextureSetName, map: MapKind): [number, number, number, number] {
  if (map === "normal") return [128, 128, 255, 255];
  if (map === "ao" || map === "metal") return [255, 255, 255, 255];
  if (map === "rough") return [180, 180, 180, 255];
  const meta: TextureSet = SETS[set];
  const c = new THREE.Color(meta.avg).convertLinearToSRGB();
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255), meta.alpha ? 0 : 255];
}

class TextureStore {
  private files = new Map<string, FileEntry>();
  private pending = new Set<Promise<void>>();
  private bitmapLoader: THREE.ImageBitmapLoader | null = null;
  private imageLoader = new THREE.ImageLoader();
  private disposed = false;
  /** Called after an image lands (request a frame). */
  onLoad: (() => void) | null = null;

  constructor(
    private settings: TierSettings,
    private anisotropy: number,
  ) {
    if (supportsImageBitmapOptions()) {
      this.bitmapLoader = new THREE.ImageBitmapLoader();
      const decode = settings.textureDecodeSize;
      this.bitmapLoader.setOptions({
        imageOrientation: "flipY",
        premultiplyAlpha: "none",
        ...(decode > 0 ? { resizeWidth: decode, resizeHeight: decode, resizeQuality: "high" } : {}),
      });
    }
  }

  private url(set: TextureSetName, map: MapKind): string {
    const meta: TextureSet = SETS[set];
    const res = meta.has2k && this.settings.textureRes === "2k" && (map === "color" || map === "normal") ? "2k" : "1k";
    const suffix = map === "color" && meta.colorFile ? meta.colorFile : map;
    return `${TEX_BASE}/${set}/${set}_${res}_${suffix}.webp`;
  }

  /** The texture for a map of a set at a tile size (shared; one image upload per file). */
  get(set: TextureSetName, map: MapKind, tile: [number, number]): THREE.Texture {
    const key = `${set}/${map}`;
    let entry = this.files.get(key);
    if (!entry) {
      const placeholder = placeholderCanvas(placeholderTexel(set, map));
      const created: FileEntry = {
        source: new THREE.TextureSource(placeholder),
        textures: new Map(),
        promise: Promise.resolve(),
        flipY: false,
      };
      this.files.set(key, created);
      created.promise = this.load(set, map, created);
      this.pending.add(created.promise);
      void created.promise.finally(() => this.pending.delete(created.promise));
      entry = created;
    }
    const tileKey = `${tile[0]}x${tile[1]}`;
    const existing = entry.textures.get(tileKey);
    if (existing) return existing;
    const tex = new THREE.Texture();
    tex.source = entry.source;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1 / tile[0], 1 / tile[1]);
    tex.anisotropy = this.anisotropy;
    tex.flipY = entry.flipY;
    if (map === "color") tex.colorSpace = THREE.SRGBColorSpace;
    tex.name = `${set}_${map}`;
    if (entry.source.data) tex.needsUpdate = true;
    markShared(tex);
    entry.textures.set(tileKey, tex);
    return tex;
  }

  private async load(set: TextureSetName, map: MapKind, entry: FileEntry): Promise<void> {
    let image: ImageBitmap | HTMLImageElement | HTMLCanvasElement | null = null;
    // ImageBitmaps are flipped at decode and the gravel canvases are drawn for flipY = false;
    // plain images (old WebKit/Firefox path) flip on upload.
    let flipY = false;
    try {
      if (set === "gravel") {
        image = gravelCanvas(map, this.settings.textureDecodeSize || 512);
      } else if (this.bitmapLoader) {
        image = await this.bitmapLoader.loadAsync(this.url(set, map));
      } else {
        image = await this.imageLoader.loadAsync(this.url(set, map));
        flipY = true;
      }
    } catch {
      // Keep the placeholder: the surface still reads right.
      return;
    }
    if (this.disposed || !image) {
      if (image && typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) image.close();
      return;
    }
    // Decode budget (phones): where the browser ignored the resize options or had to take the
    // HTMLImageElement path, draw the image down so the GPU never gets the full 1K map. The canvas
    // keeps the image's row order, so the flip stays as it was.
    if (!(image instanceof HTMLCanvasElement)) {
      const natural = image instanceof HTMLImageElement ? [image.naturalWidth, image.naturalHeight] : [image.width, image.height];
      const size = decodeTarget(natural[0], natural[1], this.settings.textureDecodeSize);
      const small = size ? downscaled(image, size) : null;
      if (small) {
        if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) image.close();
        image = small;
      }
    }
    const source = new THREE.TextureSource(image);
    entry.source = source;
    entry.flipY = flipY;
    for (const tex of entry.textures.values()) {
      // Dispose first: the GPU texture was allocated 1×1 (immutable storage).
      tex.dispose();
      tex.source = source;
      tex.flipY = flipY;
      tex.needsUpdate = true;
    }
    this.onLoad?.();
  }

  async ready(): Promise<void> {
    // Loop: textures requested while waiting are awaited too.
    while (this.pending.size > 0) {
      await Promise.allSettled([...this.pending]);
    }
  }

  dispose() {
    this.disposed = true;
    for (const entry of this.files.values()) {
      for (const t of entry.textures.values()) t.dispose();
      const img = entry.source.data as unknown;
      if (typeof ImageBitmap !== "undefined" && img instanceof ImageBitmap) img.close();
    }
    this.files.clear();
  }
}

const gravelCache = new Map<number, ReturnType<typeof makeGravelCanvases>>();
function gravelCanvas(map: MapKind, size: number): HTMLCanvasElement | null {
  let set = gravelCache.get(size);
  if (!set) {
    set = makeGravelCanvases(size, 1, 97);
    gravelCache.set(size, set);
  }
  if (map === "color") return set.color;
  if (map === "normal") return set.normal;
  if (map === "rough") return set.rough;
  return null;
}

// ── Shader patches ──────────────────────────────────────────────────────────

const PATCH_COMMON = /* glsl */ `
varying vec3 vTwWorldPos;
float twHash12( vec2 p ) {
	vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
	p3 += dot( p3, p3.yzx + 33.33 );
	return fract( ( p3.x + p3.y ) * p3.z );
}
float twNoise( vec2 p ) {
	vec2 i = floor( p );
	vec2 f = fract( p );
	vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( twHash12( i ), twHash12( i + vec2( 1.0, 0.0 ) ), u.x ),
		mix( twHash12( i + vec2( 0.0, 1.0 ) ), twHash12( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}
float twFbm( vec2 p ) {
	return 0.5 * twNoise( p ) + 0.25 * twNoise( p * 2.03 + 7.1 ) + 0.125 * twNoise( p * 4.01 + 3.7 ) + 0.0625 * twNoise( p * 8.07 + 1.3 );
}
// Second sampling frame for anti-tiling: rotated 37° and offset.
const mat2 TW_ROT = mat2( 0.7986, 0.6018, -0.6018, 0.7986 );
const vec2 TW_OFF = vec2( 0.371, 0.713 );
`;

const NORMAL_SAMPLE = "vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;";

/** normal_fragment_maps with a second, rotated normal-map sample blended in where the colour/roughness are (TW_ANTITILE). */
export const ANTITILE_NORMAL_CHUNK = THREE.ShaderChunk.normal_fragment_maps.replace(
  NORMAL_SAMPLE,
  `${NORMAL_SAMPLE}
	#ifdef TW_ANTITILE
		vec3 mapN2 = texture2D( normalMap, TW_ROT * vNormalMapUv + TW_OFF ).xyz * 2.0 - 1.0;
		// Rotate the second sample back into the original tangent frame.
		mapN2.xy = transpose( TW_ROT ) * mapN2.xy;
		mapN = normalize( mix( mapN, mapN2, twTileMix ) );
	#endif`,
);

function patchKey(spec: PatchSpec | undefined): string {
  if (!spec) return "";
  return [
    spec.macro ? "m" : "",
    spec.antiTile ? "a" : "",
    spec.saturation !== undefined ? "s" : "",
    spec.grout ? "g" : "",
    spec.blend ? "b" : "",
  ].join("");
}

interface PatchUniforms {
  [name: string]: THREE.IUniform;
}

/** Installs the shader patches for a material (also used on variants). */
function installPatch(
  material: THREE.MeshStandardMaterial,
  spec: PatchSpec | undefined,
  extraTextures: { blendMap?: THREE.Texture; blendRough?: THREE.Texture; tile?: [number, number] },
) {
  if (!spec || patchKey(spec) === "") return;
  const uniforms: PatchUniforms = {
    uTwMacroAmp: { value: spec.macro?.amp ?? 0 },
    uTwMacroScale: { value: spec.macro?.scale ?? 10 },
    uTwMacroRough: { value: spec.macro?.rough ?? 0 },
    uTwSaturation: { value: spec.saturation ?? 1 },
    uTwGroutSize: { value: spec.grout?.size ?? 0.6 },
    uTwGroutWidth: { value: spec.grout?.width ?? 0.004 },
    uTwGroutColor: { value: new THREE.Color(spec.grout?.color ?? "#888888") },
    uTwTile: { value: new THREE.Vector2(extraTextures.tile?.[0] ?? 1, extraTextures.tile?.[1] ?? 1) },
    uTwBlendMap: { value: extraTextures.blendMap ?? null },
    uTwBlendRough: { value: extraTextures.blendRough ?? null },
    uTwBlendScale: { value: spec.blend?.scale ?? 10 },
    uTwBlendAmount: { value: spec.blend?.amount ?? 0 },
    uTwBlendRepeat: {
      value: new THREE.Vector2(
        spec.blend ? 1 / SETS[spec.blend.set].tile[0] : 1,
        spec.blend ? 1 / SETS[spec.blend.set].tile[1] : 1,
      ),
    },
  };
  const key = patchKey(spec);
  material.userData.twPatch = { spec, uniforms };
  material.customProgramCacheKey = () => `tw-${key}`;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    const defines = shader.defines ?? (shader.defines = {});
    if (spec.macro) defines.TW_MACRO = "";
    if (spec.antiTile) defines.TW_ANTITILE = "";
    if (spec.saturation !== undefined) defines.TW_SATURATION = "";
    if (spec.grout) defines.TW_GROUT = "";
    if (spec.blend && extraTextures.blendMap) defines.TW_BLEND = "";

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vTwWorldPos;")
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
	{
		vec4 twWp = vec4( transformed, 1.0 );
		#ifdef USE_BATCHING
			twWp = batchingMatrix * twWp;
		#endif
		#ifdef USE_INSTANCING
			twWp = instanceMatrix * twWp;
		#endif
		vTwWorldPos = ( modelMatrix * twWp ).xyz;
	}`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
${PATCH_COMMON}
uniform float uTwMacroAmp;
uniform float uTwMacroScale;
uniform float uTwMacroRough;
uniform float uTwSaturation;
uniform float uTwGroutSize;
uniform float uTwGroutWidth;
uniform vec3 uTwGroutColor;
uniform vec2 uTwTile;
uniform float uTwBlendScale;
uniform float uTwBlendAmount;
uniform vec2 uTwBlendRepeat;
#ifdef TW_BLEND
uniform sampler2D uTwBlendMap;
uniform sampler2D uTwBlendRough;
#endif`,
      )
      .replace(
        "#include <map_fragment>",
        `
	float twTileMix = 0.0;
	#ifdef TW_ANTITILE
		twTileMix = smoothstep( 0.3, 0.7, twNoise( vTwWorldPos.xz / 6.3 + 11.0 ) );
	#endif
	float twBlendMix = 0.0;
	#ifdef TW_BLEND
		twBlendMix = smoothstep( 0.35, 0.75, twFbm( vTwWorldPos.xz / uTwBlendScale ) ) * uTwBlendAmount;
	#endif
	#ifdef USE_MAP
		vec4 sampledDiffuseColor = texture2D( map, vMapUv );
		#ifdef TW_ANTITILE
			sampledDiffuseColor = mix( sampledDiffuseColor, texture2D( map, TW_ROT * vMapUv + TW_OFF ), twTileMix );
		#endif
		#ifdef TW_BLEND
			vec2 twBlendUv = vTwWorldPos.xz * uTwBlendRepeat;
			sampledDiffuseColor = mix( sampledDiffuseColor, texture2D( uTwBlendMap, twBlendUv ), twBlendMix );
		#endif
		#ifdef TW_SATURATION
			float twLuma = dot( sampledDiffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
			sampledDiffuseColor.rgb = mix( vec3( twLuma ), sampledDiffuseColor.rgb, uTwSaturation );
		#endif
		diffuseColor *= sampledDiffuseColor;
	#endif
	float twMacro = 0.0;
	#ifdef TW_MACRO
		twMacro = twFbm( vTwWorldPos.xz / uTwMacroScale ) * 2.133 - 1.0;
		diffuseColor.rgb *= 1.0 + uTwMacroAmp * twMacro;
	#endif
	#ifdef TW_GROUT
	{
		// Box-filtered grout grid: no moiré at any distance.
		// Metre UVs (vMapUv carries repeat = 1 / tile) keep the grid aligned with the building.
		vec2 g = vTwWorldPos.xz / max( uTwGroutSize, 1e-3 );
		#ifdef USE_MAP
			g = vMapUv * uTwTile / max( uTwGroutSize, 1e-3 );
		#endif
		vec2 fw = max( fwidth( g ), vec2( 1e-4 ) );
		float w = uTwGroutWidth / uTwGroutSize;
		vec2 a = ( floor( g + 0.5 * fw ) * w + min( fract( g + 0.5 * fw ), vec2( w ) )
			- floor( g - 0.5 * fw ) * w - min( fract( g - 0.5 * fw ), vec2( w ) ) ) / fw;
		float grout = clamp( a.x + a.y - a.x * a.y, 0.0, 1.0 );
		diffuseColor.rgb = mix( diffuseColor.rgb, uTwGroutColor, grout );
	}
	#endif
`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `
	float roughnessFactor = roughness;
	#ifdef USE_ROUGHNESSMAP
		vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
		#ifdef TW_ANTITILE
			texelRoughness = mix( texelRoughness, texture2D( roughnessMap, TW_ROT * vRoughnessMapUv + TW_OFF ), twTileMix );
		#endif
		#ifdef TW_BLEND
			texelRoughness = mix( texelRoughness, texture2D( uTwBlendRough, vTwWorldPos.xz * uTwBlendRepeat ), twBlendMix );
		#endif
		roughnessFactor *= texelRoughness.g;
	#endif
	#ifdef TW_MACRO
		roughnessFactor *= 1.0 + uTwMacroRough * twMacro;
	#endif
	roughnessFactor = clamp( roughnessFactor, 0.03, 1.0 );
`,
      )
      // The normal-map sample lives inside the normal_fragment_maps chunk, which is not expanded
      // yet at this point: patch the chunk's own text in place of its #include.
      .replace("#include <normal_fragment_maps>", ANTITILE_NORMAL_CHUNK);
  };
  material.needsUpdate = true;
}

// ── The library ─────────────────────────────────────────────────────────────

export class TwinMaterialLibrary implements MaterialLibrary {
  private cache = new Map<AnyMaterialName, THREE.MeshStandardMaterial>();
  private store: TextureStore;
  readonly settings: TierSettings;

  constructor(
    readonly tier: Tier,
    opts: { maxAnisotropy: number; onTexture?: () => void },
  ) {
    this.settings = TIER_SETTINGS[tier];
    const aniso = Math.min(opts.maxAnisotropy, tier === "ultra" ? 16 : tier === "high" ? 8 : 4);
    this.store = new TextureStore(this.settings, aniso);
    this.store.onLoad = opts.onTexture ?? null;
  }

  set onTexture(fn: (() => void) | null) {
    this.store.onLoad = fn;
  }

  get(name: MaterialName): THREE.MeshStandardMaterial {
    return this.getAny(name);
  }

  /** Extra named materials (asphalt footway, red cycle lane, setts, birch bark, mulch, leaf litter…). */
  extra(name: ExtraMaterialName): THREE.MeshStandardMaterial {
    return this.getAny(name);
  }

  private getAny(name: AnyMaterialName): THREE.MeshStandardMaterial {
    let m = this.cache.get(name);
    if (!m) {
      m = this.build(name, SPECS[name], undefined);
      m.name = name;
      markShared(m);
      this.cache.set(name, m);
    }
    return m;
  }

  variant(
    name: MaterialName,
    overrides: Partial<{
      color: THREE.ColorRepresentation;
      roughness: number;
      metalness: number;
      emissive: THREE.ColorRepresentation;
      emissiveIntensity: number;
      opacity: number;
      envMapIntensity: number;
      tile: [number, number];
    }>,
  ): THREE.MeshStandardMaterial {
    const spec = SPECS[name];
    const { tile, ...rest } = overrides;
    const m = this.build(name, spec, tile);
    m.name = tile ? `${name}@${tile[0]}x${tile[1]}*` : `${name}*`;
    this.applyOverrides(m, spec, rest);
    return m;
  }

  /**
   * A material with a different texture tile (e.g. DataCity's standard
   * bricks from brickDark, or a larger paving grid). Owned by the caller.
   */
  withTile(
    name: AnyMaterialName,
    tileU: number,
    tileV = tileU,
    overrides: Parameters<TwinMaterialLibrary["variant"]>[1] = {},
  ): THREE.MeshStandardMaterial {
    const spec = SPECS[name];
    const m = this.build(name, spec, [tileU, tileV]);
    m.name = `${name}@${tileU}x${tileV}`;
    this.applyOverrides(m, spec, overrides);
    return m;
  }

  /** Raw library texture (for custom shaders such as facades). Shared — do not dispose. */
  texture(set: TextureSetName, map: MapKind, tile?: [number, number]): THREE.Texture {
    return this.store.get(set, map, tile ?? SETS[set].tile);
  }

  /** Texture set + calibrated colour of a material (for the facade shader's wall). */
  describe(name: AnyMaterialName): { set?: TextureSetName; tile: [number, number]; color: THREE.Color; roughness: number } {
    const spec = SPECS[name];
    const tile = spec.tile ?? (spec.set ? (SETS[spec.set].tile as [number, number]) : [1, 1]);
    const color = hasColorMap(spec.set)
      ? albedoMultiplier(spec.color, SETS[spec.set].avg, spec.patch?.saturation ?? 1)
      : new THREE.Color(spec.color);
    return { set: spec.set, tile, color, roughness: spec.roughness };
  }

  /** Linear colour that makes `target` (sRGB) the average albedo of a material's texture. */
  calibrate(name: AnyMaterialName, target: string): THREE.Color {
    const spec = SPECS[name];
    return hasColorMap(spec.set) ? albedoMultiplier(target, SETS[spec.set].avg, spec.patch?.saturation ?? 1) : new THREE.Color(target);
  }

  tileSize(name: MaterialName): number {
    const spec = SPECS[name];
    const tile = spec.tile ?? (spec.set ? SETS[spec.set].tile : [1, 1]);
    return tile[0];
  }

  ready(): Promise<void> {
    return this.store.ready();
  }

  dispose() {
    for (const m of this.cache.values()) m.dispose();
    this.cache.clear();
    this.store.dispose();
  }

  private applyOverrides(
    m: THREE.MeshStandardMaterial,
    spec: MaterialSpec,
    o: Parameters<TwinMaterialLibrary["variant"]>[1],
  ) {
    if (o.color !== undefined) {
      // Overrides are target albedos too: keep textured materials calibrated.
      if (hasColorMap(spec.set)) {
        const hex = new THREE.Color(o.color).getHexString();
        m.color.copy(albedoMultiplier(`#${hex}`, SETS[spec.set].avg, spec.patch?.saturation ?? 1));
      } else m.color.set(o.color);
    }
    if (o.roughness !== undefined) m.roughness = o.roughness;
    if (o.metalness !== undefined) m.metalness = o.metalness;
    if (o.emissive !== undefined) m.emissive.set(o.emissive);
    if (o.emissiveIntensity !== undefined) m.emissiveIntensity = o.emissiveIntensity;
    if (o.envMapIntensity !== undefined) m.envMapIntensity = o.envMapIntensity;
    if (o.opacity !== undefined) {
      m.opacity = o.opacity;
      if (o.opacity < 1 && !m.transparent) {
        m.transparent = true;
        m.depthWrite = false;
      }
    }
    m.needsUpdate = true;
  }

  private build(name: AnyMaterialName, spec: MaterialSpec, tileOverride: [number, number] | undefined): THREE.MeshStandardMaterial {
    const extras = this.settings.physicalExtras;
    const physicalNeeded =
      spec.kind === "physical" &&
      (extras || name === "carPaintBlack" || name === "carGlass" || name === "glassFacade" || name === "glassInterior");
    const m: THREE.MeshStandardMaterial = physicalNeeded ? new THREE.MeshPhysicalMaterial() : new THREE.MeshStandardMaterial();
    const set = spec.set;
    const tile = tileOverride ?? spec.tile ?? (set ? (SETS[set].tile as [number, number]) : [1, 1]);
    if (set) {
      const meta: TextureSet = SETS[set];
      // Without a colour map there is no texture average to divide out (glass_smudge: normal and
      // roughness only) — the spec colour is the albedo itself.
      if (hasColorMap(set)) m.color.copy(albedoMultiplier(spec.color, meta.avg, spec.patch?.saturation ?? 1));
      else m.color.set(spec.color);
      if (meta.maps.includes("color")) m.map = this.store.get(set, "color", tile);
      if (meta.maps.includes("normal")) {
        m.normalMap = this.store.get(set, "normal", tile);
        const s = spec.normalScale ?? 1;
        m.normalScale.set(s, s);
      }
      if (meta.maps.includes("rough")) m.roughnessMap = this.store.get(set, "rough", tile);
      if (meta.maps.includes("ao") && this.settings.aoMaps) {
        m.aoMap = this.store.get(set, "ao", tile);
        m.aoMapIntensity = spec.aoIntensity ?? 1;
      }
      if (meta.maps.includes("metal")) m.metalnessMap = this.store.get(set, "metal", tile);
    } else {
      m.color.set(spec.color);
    }
    m.roughness = spec.roughness;
    m.metalness = spec.metalness ?? 0;
    m.envMapIntensity = spec.envMapIntensity ?? 1;
    if (spec.emissive) {
      m.emissive.set(spec.emissive.color);
      m.emissiveIntensity = spec.emissive.intensity;
    }
    if (spec.alphaTest) {
      m.alphaTest = spec.alphaTest;
      m.alphaToCoverage = this.settings.msaa > 0;
    }
    if (spec.doubleSided) {
      m.side = THREE.DoubleSide;
      m.shadowSide = THREE.DoubleSide;
    }
    if (spec.polygonOffset) {
      m.polygonOffset = true;
      m.polygonOffsetFactor = spec.polygonOffset;
      m.polygonOffsetUnits = spec.polygonOffset;
    }
    if (m instanceof THREE.MeshPhysicalMaterial && spec.physical) {
      const p = spec.physical;
      if (p.ior !== undefined) m.ior = p.ior;
      if (p.specularIntensity !== undefined) m.specularIntensity = p.specularIntensity;
      if (p.clearcoat !== undefined) m.clearcoat = p.clearcoat;
      if (p.clearcoatRoughness !== undefined) m.clearcoatRoughness = p.clearcoatRoughness;
      if (extras && p.sheen !== undefined) {
        m.sheen = p.sheen;
        m.sheenRoughness = p.sheenRoughness ?? 0.8;
        m.sheenColor.set(p.sheenColor ?? "#ffffff");
      }
      if (extras && p.anisotropy !== undefined) m.anisotropy = p.anisotropy;
    }
    if (spec.glass) {
      // Reflections at full strength, the background dimmed by the pane's coverage.
      m.transparent = true;
      m.opacity = spec.glass.coverage;
      m.blending = THREE.CustomBlending;
      m.blendSrc = THREE.OneFactor;
      m.blendDst = THREE.OneMinusSrcAlphaFactor;
      m.blendSrcAlpha = THREE.OneFactor;
      m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
      m.depthWrite = false;
      m.side = THREE.DoubleSide;
    }
    const patch = spec.patch;
    if (patch) {
      const blendTex =
        patch.blend !== undefined
          ? {
              blendMap: this.store.get(patch.blend.set, "color", SETS[patch.blend.set].tile as [number, number]),
              blendRough: this.store.get(patch.blend.set, "rough", SETS[patch.blend.set].tile as [number, number]),
            }
          : {};
      installPatch(m, patch, { ...blendTex, tile });
    }
    return m;
  }
}

/** Library extras through the shared interface (falls back to the closest MaterialName). */
export function extraMaterial(lib: MaterialLibrary, name: ExtraMaterialName): THREE.MeshStandardMaterial {
  if (lib instanceof TwinMaterialLibrary) return lib.extra(name);
  const fallback: Record<ExtraMaterialName, MaterialName> = {
    asphaltFootway: "asphalt",
    asphaltRed: "asphalt",
    setts: "pavers",
    barkBirch: "bark",
    mulch: "soil",
    leafLitter: "soil",
    manhole: "metalDark",
    roadLineDecal: "roadMarking",
  };
  return lib.get(fallback[name]);
}

/** A material at another tile size through the shared interface. Owned by the caller. */
export function materialWithTile(
  lib: MaterialLibrary,
  name: MaterialName | ExtraMaterialName,
  tileU: number,
  tileV = tileU,
  overrides: Parameters<MaterialLibrary["variant"]>[1] = {},
): THREE.MeshStandardMaterial {
  if (lib instanceof TwinMaterialLibrary) return lib.withTile(name, tileU, tileV, overrides);
  return lib.variant(name as MaterialName, overrides);
}

export const MATERIAL_NAMES = Object.keys(SPECS) as MaterialName[];

/** Texture-set metadata (tests, tools). */
export function textureSets(): Readonly<Record<TextureSetName, TextureSet>> {
  return SETS;
}
