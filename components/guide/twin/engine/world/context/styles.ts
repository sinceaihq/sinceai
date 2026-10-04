import * as THREE from "three";
import type { MaterialLibrary, Tier } from "../../types";
import { facadeStyle, makeFacadeMaterial, type FacadeStyle } from "../../render/facade";
import { TwinMaterialLibrary } from "../../render/materials";

/**
 * Facade families of the context ring (SPEC §3.4 colours, research photos).
 *
 * Each family = a procedural facade style (render/facade.ts) plus optional
 * shader extensions this module adds on top of it:
 *   tint     per-vertex wall tint (attribute `ctxTint`) — lets many buildings share one draw call
 *   ribs     corrugated / ribbed cladding (normal + shading, box-filtered)
 *   stripes  coloured horizontal bands in the spandrels (Electrocity's courtyard faces)
 *   glow     translucent channel glass lit from inside at night (ICT-City's stair shafts)
 * Families used by many far buildings share one material; on the low tier
 * families collapse onto `low` (tinted) to save draw calls.
 */

export interface RibSpec {
  /** 0 = horizontal ribs (profile varies with height), 1 = vertical ribs. */
  axis: 0 | 1;
  /** Rib pitch (m). */
  pitch: number;
  /** Normal tilt amplitude (0…1). */
  depth: number;
  /** Albedo darkening in the grooves (0…1). */
  shade: number;
}

/**
 * "Barcode" bands (Electrocity, SPEC §3.4): thin horizontal stripes in runs of
 * random length — `top` colours densest under the roof, `bottom` colours
 * densest near the ground over a solid `base` band.
 */
export interface StripeSpec {
  /** Two colours (sRGB) near the top and two near the bottom. */
  top: [string, string];
  bottom: [string, string];
  /** Solid base colour and its height above the ground (m). */
  base: string;
  baseHeight: number;
  /** Depth of the top and bottom stripe zones (m). */
  topZone: number;
  bottomZone: number;
}

/** Window subdivision (grid windows): lights across and up, bar width (m). */
export interface LightsSpec {
  cols: number;
  rows: number;
  bar: number;
}

export interface Family {
  key: string;
  style: FacadeStyle;
  ribs?: RibSpec;
  stripes?: StripeSpec;
  lights?: LightsSpec;
  /** Channel glass: glow colour (sRGB) and night luminance (scene units). */
  glow?: { color: string; luminance: number };
  /** Parapet height above the roof (m) and its coping/inner-face colour. */
  parapet: number;
  coping: string;
  /** Roof membrane / covering colour (sRGB). */
  roof: string;
  /** Family used instead on the low tier (merged draw call; wall colour kept via the tint). */
  low?: string;
  /** Wall tile override for the library texture (m per tile), e.g. standard bricks. */
  tile?: [number, number];
}

const fam = (key: string, f: Omit<Family, "key">): Family => ({ key, ...f });

/** Every family. Colours are albedo targets (sRGB) measured from photos (SPEC §3.4) or estimated. */
export const FAMILIES: Record<string, Family> = {
  // ── Electrocity (Tykistökatu 4): white panels, 2×2-light windows in white frames, pink and green barcode bands ──
  electro: fam("electro", {
    style: facadeStyle("whitePanelGrid", {
      wallColor: "#e6e7e4",
      storey: 3.55,
      groundStorey: 4.3,
      bay: 2.05,
      window: [1.55, 1.5],
      sill: 0.95,
      frame: 0.07,
      frameColor: "#eef0ef",
      glassColor: "#243443",
      glassTransmittance: 0.52,
      panelJoints: { w: 2.05, h: 0.6, width: 0.008, color: "#cfd2d2" },
      coping: { height: 0.55, color: "#b0307a" },
      groundFloor: { kind: "same" },
      blinds: 0.3,
      streaks: 0.2,
    }),
    stripes: {
      top: ["#b5306f", "#e283b1"],
      bottom: ["#7db33a", "#4f9a55"],
      base: "#2f6b55",
      baseHeight: 7.6,
      topZone: 6.0,
      bottomZone: 6.5,
    },
    lights: { cols: 2, rows: 2, bar: 0.06 },
    parapet: 0.7,
    coping: "#b0307a",
    roof: "#8f908c",
    // Kept on phones too: the stripe bands are how people recognise Electrocity.
  }),
  /** Rooftop plant rooms: light corrugated metal with a dark louvre band. */
  plantLight: fam("plantLight", {
    style: facadeStyle("whitePanelGrid", {
      pattern: "ribbon",
      wall: "metalWhite",
      wallColor: "#d4d7d8",
      storey: 6,
      groundStorey: 6,
      bay: 2.4,
      window: [2.4, 1.1],
      sill: 1.4,
      frame: 0.0,
      mullion: 0.1,
      frameColor: "#5a5f63",
      glassColor: "#2f3438",
      glassTransmittance: 0.02,
      ribbonGroups: { units: 2, gap: 2.4 },
      coping: { height: 0.25, color: "#b0307a" },
      groundFloor: { kind: "same" },
      blinds: 0,
    }),
    ribs: { axis: 1, pitch: 0.2, depth: 0.3, shade: 0.1 },
    parapet: 0,
    coping: "#b0307a",
    roof: "#8a8b88",
    low: "lowPlain",
  }),
  /** Electrocity's stair towers: dark grey vertical corrugated metal. */
  electroTower: fam("electroTower", {
    style: facadeStyle("plain", { wall: "metalDark", wallColor: "#3c3a42", coping: { height: 0.3, color: "#2c2b31" } }),
    ribs: { axis: 1, pitch: 0.25, depth: 0.35, shade: 0.12 },
    parapet: 0.2,
    coping: "#2c2b31",
    roof: "#7c7d7a",
    low: "lowPlain",
  }),
  // ── Eurocity (Joukahaisenkatu 1): white/light grey metal, blue glass ──
  euro: fam("euro", {
    style: facadeStyle("whitePanelGrid", {
      pattern: "ribbon",
      wallColor: "#d6dadd",
      storey: 3.7,
      groundStorey: 4.4,
      bay: 1.5,
      window: [1.5, 1.6],
      sill: 0.95,
      frame: 0.05,
      mullion: 0.06,
      frameColor: "#7d868e",
      glassColor: "#1d3550",
      glassTransmittance: 0.48,
      panelJoints: { w: 3.0, h: 3.7, width: 0.012, color: "#b2b8bc" },
      coping: { height: 0.35, color: "#c4cacd" },
      groundFloor: { kind: "storefront" },
      blinds: 0.25,
    }),
    parapet: 0.8,
    coping: "#c4cacd",
    roof: "#8b8c88",
    low: "lowRibbon",
  }),
  euroGlass: fam("euroGlass", {
    style: facadeStyle("curtainWall", {
      wall: "metalWhite",
      wallColor: "#9aa3aa",
      storey: 3.7,
      groundStorey: 4.4,
      bay: 1.5,
      frameColor: "#8f99a1",
      glassColor: "#1e4268",
      glassTransmittance: 0.42,
      mullion: 0.07,
      transoms: [1.0],
      spandrel: { height: 0.8, color: "#1c3550" },
    }),
    parapet: 0.4,
    coping: "#a9b2b8",
    roof: "#8b8c88",
    low: "lowCurtain",
  }),
  // ── ICT-City (Joukahaisenkatu 3, 2006): red-brown ribbed metal, silver panels, channel-glass shafts ──
  ictRed: fam("ictRed", {
    style: facadeStyle("whitePanelGrid", {
      pattern: "ribbon",
      wall: "metalWhite",
      wallColor: "#7e3127",
      storey: 3.9,
      groundStorey: 4.6,
      bay: 1.2,
      window: [1.2, 1.15],
      sill: 1.05,
      frame: 0.04,
      mullion: 0.05,
      frameColor: "#3a2724",
      glassColor: "#1b232b",
      glassTransmittance: 0.5,
      ribbonGroups: { units: 9, gap: 2.4 },
      panelJoints: undefined,
      coping: { height: 0.25, color: "#6c2a22" },
      groundFloor: { kind: "storefront" },
      blinds: 0.2,
    }),
    ribs: { axis: 0, pitch: 0.22, depth: 0.32, shade: 0.12 },
    parapet: 0.6,
    coping: "#5e2822",
    roof: "#8d8e8b",
    low: "lowRibbon",
  }),
  ictTop: fam("ictTop", {
    style: facadeStyle("plain", {
      wall: "metalWhite",
      wallColor: "#a8432c",
      coping: { height: 0.25, color: "#8a3826" },
    }),
    ribs: { axis: 0, pitch: 0.2, depth: 0.35, shade: 0.14 },
    parapet: 0.3,
    coping: "#8a3826",
    roof: "#8d8e8b",
    low: "lowPlain",
  }),
  ictSilver: fam("ictSilver", {
    style: facadeStyle("whitePanelGrid", {
      wall: "metalWhite",
      wallColor: "#b9bfc3",
      storey: 3.9,
      groundStorey: 4.6,
      bay: 3.0,
      window: [2.3, 1.55],
      sill: 0.95,
      frame: 0.05,
      frameColor: "#6f777e",
      glassColor: "#1c2731",
      panelJoints: { w: 3.0, h: 1.95, width: 0.014, color: "#8f969b" },
      coping: { height: 0.25, color: "#a7aeb2" },
      groundFloor: { kind: "storefront" },
    }),
    parapet: 0.6,
    coping: "#a7aeb2",
    roof: "#8d8e8b",
    low: "lowGrid",
  }),
  ictWhite: fam("ictWhite", {
    style: facadeStyle("whitePanelGrid", {
      pattern: "ribbon",
      wallColor: "#e1e3e1",
      storey: 3.9,
      groundStorey: 4.6,
      bay: 1.3,
      window: [1.3, 1.45],
      sill: 1.0,
      frame: 0.05,
      mullion: 0.06,
      frameColor: "#4f565c",
      glassColor: "#20334a",
      ribbonGroups: { units: 7, gap: 1.0 },
      panelJoints: { w: 2.6, h: 3.9, width: 0.012, color: "#b9bdbf" },
      coping: { height: 0.25, color: "#cfd2d2" },
      groundFloor: { kind: "storefront" },
    }),
    parapet: 0.6,
    coping: "#cfd2d2",
    roof: "#8d8e8b",
    low: "lowRibbon",
  }),
  ictDark: fam("ictDark", {
    style: facadeStyle("whitePanelGrid", {
      pattern: "ribbon",
      wall: "metalDark",
      wallColor: "#3d4146",
      storey: 3.9,
      groundStorey: 4.6,
      bay: 1.2,
      window: [1.2, 0.9],
      sill: 1.25,
      frame: 0.04,
      mullion: 0.05,
      frameColor: "#8a3a2c",
      glassColor: "#1a2026",
      louvre: { height: 0.16, gap: 0.12, color: "#93412f" },
      coping: { height: 0.2, color: "#2c2f33" },
      groundFloor: { kind: "storefront" },
    }),
    parapet: 0.5,
    coping: "#2c2f33",
    roof: "#8d8e8b",
    low: "lowRibbon",
  }),
  ictPlinth: fam("ictPlinth", {
    style: facadeStyle("whitePanelGrid", {
      wall: "metalWhite",
      wallColor: "#c7cbce",
      storey: 3.9,
      groundStorey: 4.6,
      bay: 3.2,
      window: [2.6, 1.7],
      sill: 0.8,
      frame: 0.05,
      frameColor: "#5f676d",
      glassColor: "#1c2731",
      panelJoints: { w: 1.6, h: 4.6, width: 0.012, color: "#a3a9ad" },
      coping: { height: 0.25, color: "#b5bbbe" },
      groundFloor: { kind: "storefront" },
    }),
    parapet: 0.5,
    coping: "#b5bbbe",
    roof: "#7d7e7b",
    low: "lowGrid",
  }),
  /** The spine's own key (its walls use spanFamily/spanBands; kept for roof colours). */
  ictSpine: fam("ictSpine", {
    style: facadeStyle("whitePanelGrid", { wall: "metalWhite", wallColor: "#b9bfc3", storey: 3.9, groundStorey: 4.6 }),
    parapet: 0.6,
    coping: "#8a3826",
    roof: "#8d8e8b",
    low: "lowGrid",
  }),
  /** Full-height glazing of ICT-City's stair shafts (stairs lit in the evening). */
  ictShaftGlass: fam("ictShaftGlass", {
    style: facadeStyle("curtainWall", {
      wall: "metalWhite",
      wallColor: "#aab1b5",
      storey: 3.9,
      groundStorey: 4.6,
      bay: 1.0,
      frameColor: "#8c9499",
      glassColor: "#1f2b35",
      mullion: 0.06,
      transoms: [1.95],
      spandrel: { height: 0.5, color: "#2b333a" },
      occupancy: 3,
      warmth: 0.2,
    }),
    parapet: 0.2,
    coping: "#9aa2a7",
    roof: "#8d8e8b",
    low: "lowCurtain",
  }),
  /** Glazed entrance halls between ICT-City's wings (two storeys). */
  ictLobby: fam("ictLobby", {
    style: facadeStyle("curtainWall", {
      wall: "metalWhite",
      wallColor: "#c4cacd",
      storey: 4.5,
      groundStorey: 4.5,
      bay: 1.5,
      frameColor: "#b7bdc1",
      glassColor: "#20303b",
      glassTransmittance: 0.6,
      mullion: 0.07,
      transoms: [2.2],
      spandrel: { height: 0.4, color: "#9aa2a7" },
      interior: "retail",
    }),
    parapet: 0.3,
    coping: "#b0b6ba",
    roof: "#8d8e8b",
    low: "lowCurtain",
  }),
  ictShaft: fam("ictShaft", {
    style: facadeStyle("plain", {
      wall: "metalWhite",
      wallColor: "#c9cfd2",
      wallRoughness: 0.55,
      coping: { height: 0.2, color: "#9aa2a7" },
    }),
    ribs: { axis: 1, pitch: 0.27, depth: 0.25, shade: 0.08 },
    glow: { color: "#fff1e2", luminance: 0.03 },
    parapet: 0.3,
    coping: "#9aa2a7",
    roof: "#8d8e8b",
    low: "lowPlain",
  }),
  // ── DataCity (Lemminkäisenkatu 14, 1988): red-brown brick, punched windows ──
  data: fam("data", {
    style: facadeStyle("brickGrid", {
      wallColor: "#874a3b",
      storey: 3.45,
      groundStorey: 4.2,
      bay: 2.6,
      window: [1.25, 1.55],
      sill: 0.95,
      frame: 0.07,
      frameColor: "#2c2a2a",
      glassColor: "#1c232a",
      coping: { height: 0.35, color: "#3e3a39" },
      groundFloor: { kind: "storefront" },
      streaks: 0.35,
      blinds: 0.35,
    }),
    tile: [2.0, 2.0],
    parapet: 0.9,
    coping: "#4a4442",
    roof: "#5e5d5a",
    low: "lowBrick",
  }),
  /**
   * DataCity's two-storey front on Lemminkäisenkatu: plain brick panels between the piers (recipe
   * pilasters) above shop windows at street level.
   */
  dataBase: fam("dataBase", {
    style: facadeStyle("brickGrid", {
      pattern: "none",
      wallColor: "#874a3b",
      storey: 3.6,
      groundStorey: 4.1,
      bay: 5.4,
      window: [3.4, 2.8],
      sill: 0.45,
      frame: 0.1,
      frameColor: "#2a2828",
      glassColor: "#1c232a",
      interior: "retail",
      warmth: 0.7,
      coping: { height: 0.4, color: "#3e3a39" },
      groundFloor: { kind: "storefront" },
      streaks: 0.3,
    }),
    tile: [2.0, 2.0],
    parapet: 0.9,
    coping: "#4a4442",
    roof: "#5e5d5a",
    // No low-tier merge: lowBrick would punch windows into the plain panels.
  }),
  /** DataCity's brick piers (pilasters and arcade piers): brick all the way up, a dark stone cap. */
  dataPier: fam("dataPier", {
    style: facadeStyle("brickGrid", {
      pattern: "none",
      wallColor: "#7f4436",
      storey: 3.6,
      groundStorey: 4.1,
      coping: { height: 0.3, color: "#3e3a39" },
      groundFloor: { kind: "same" },
      streaks: 0.2,
    }),
    tile: [2.0, 2.0],
    parapet: 0,
    coping: "#3e3a39",
    roof: "#5e5d5a",
  }),
  dataGlass: fam("dataGlass", {
    style: facadeStyle("curtainWall", {
      wall: "metalDark",
      wallColor: "#3a3d40",
      storey: 3.45,
      groundStorey: 4.2,
      bay: 1.5,
      frameColor: "#2d3034",
      glassColor: "#1d2a35",
      mullion: 0.08,
      transoms: [2.4],
      spandrel: { height: 0.7, color: "#2a2f35" },
    }),
    parapet: 0.4,
    coping: "#2f3236",
    roof: "#5e5d5a",
    low: "lowCurtain",
  }),
  dataPlant: fam("dataPlant", {
    style: facadeStyle("plain", {
      wall: "metalDark",
      wallColor: "#202226",
      coping: { height: 0.25, color: "#2a2c30" },
    }),
    ribs: { axis: 0, pitch: 0.35, depth: 0.3, shade: 0.15 },
    parapet: 0.3,
    coping: "#2a2c30",
    roof: "#4f4f4d",
    low: "lowPlain",
  }),
  // ── Pharmacity (2001): white panels with long ribbon windows, recessed arcade (photos 2008/2017/2020) ──
  pharma: fam("pharma", {
    style: facadeStyle("whitePanelGrid", {
      pattern: "ribbon",
      wall: "metalWhite",
      wallColor: "#dfe1e0",
      storey: 3.6,
      groundStorey: 4.4,
      bay: 1.35,
      window: [1.35, 1.45],
      sill: 0.95,
      frame: 0.05,
      mullion: 0.06,
      frameColor: "#7a8187",
      glassColor: "#22384c",
      glassTransmittance: 0.5,
      ribbonGroups: { units: 7, gap: 1.0 },
      panelJoints: { w: 2.7, h: 3.6, width: 0.012, color: "#c3c7c8" },
      coping: { height: 0.4, color: "#c9cdcd" },
      groundFloor: { kind: "storefront" },
      blinds: 0.3,
      streaks: 0.25,
    }),
    parapet: 0.8,
    coping: "#c9cdcd",
    roof: "#8c8c88",
    low: "lowRibbon",
  }),
  pharmaGlass: fam("pharmaGlass", {
    style: facadeStyle("curtainWall", {
      wall: "metalWhite",
      wallColor: "#9aa1a6",
      storey: 3.6,
      groundStorey: 4.4,
      bay: 1.5,
      frameColor: "#5f666c",
      glassColor: "#1d2a35",
      mullion: 0.07,
      transoms: [1.2],
      spandrel: { height: 0.6, color: "#2a323a" },
    }),
    parapet: 0.3,
    coping: "#8e959a",
    roof: "#8c8c88",
    low: "lowCurtain",
  }),
  // ── ParkCity (2023): open decks behind the tube "barcode" ──
  park: fam("park", {
    style: facadeStyle("parkingDecks", {
      wallColor: "#8f8c86",
      storey: 3.25,
      groundStorey: 3.6,
      bay: 7.5,
      window: [7.5, 2.05],
      sill: 0.95,
      mullion: 0.5,
      coping: { height: 0.15, color: "#a9a69f" },
    }),
    parapet: 1.1,
    coping: "#9d9a93",
    roof: "#3e3f40",
    low: "lowPark",
  }),
  // ── CivilCity (2022): terracotta panels, dark window bands ──
  civil: fam("civil", {
    style: facadeStyle("whitePanelGrid", {
      pattern: "ribbon",
      wall: "concreteFacade",
      wallColor: "#c06a4c",
      storey: 3.8,
      groundStorey: 4.6,
      bay: 1.5,
      window: [1.5, 1.75],
      sill: 0.85,
      frame: 0.05,
      mullion: 0.06,
      frameColor: "#2b2c2e",
      glassColor: "#1b232b",
      panelJoints: { w: 3.0, h: 1.9, width: 0.014, color: "#9b5640" },
      coping: { height: 0.3, color: "#a85d43" },
      groundFloor: { kind: "storefront" },
    }),
    parapet: 0.7,
    coping: "#9b5640",
    roof: "#8a8a86",
    low: "lowRibbon",
  }),
  // ── Joukahaisenkatu 9 (2018): white panels, paired tall windows, dark strips ──
  j9: fam("j9", {
    style: facadeStyle("whitePanelGrid", {
      wall: "plasterWhite",
      wallColor: "#e4e4df",
      storey: 3.7,
      groundStorey: 4.5,
      bay: 2.7,
      window: [1.0, 2.3],
      sill: 0.55,
      frame: 0.05,
      frameColor: "#3b3f43",
      glassColor: "#1e2730",
      panelJoints: { w: 2.7, h: 3.7, width: 0.014, color: "#c9c9c4" },
      coping: { height: 0.3, color: "#cfd0cc" },
      groundFloor: { kind: "storefront" },
    }),
    parapet: 0.8,
    coping: "#cfd0cc",
    roof: "#8f8f8b",
    low: "lowGrid",
  }),
  // ── Original Sokos Hotel Kupittaa (Joukahaisenkatu 6): dark bands, big windows; bronze ends ──
  hotel: fam("hotel", {
    style: facadeStyle("whitePanelGrid", {
      pattern: "ribbon",
      wall: "metalDark",
      wallColor: "#2f2c2a",
      storey: 3.2,
      groundStorey: 5.0,
      bay: 1.55,
      window: [1.55, 1.75],
      mullion: 0.08,
      sill: 0.7,
      frame: 0.05,
      frameColor: "#1d1c1b",
      glassColor: "#1e2731",
      interior: "residential",
      warmth: 0.8,
      blinds: 0.55,
      coping: { height: 0.3, color: "#232120" },
      groundFloor: { kind: "storefront" },
    }),
    parapet: 0.8,
    coping: "#262422",
    roof: "#5a5a58",
    low: "lowGrid",
  }),
  hotelBronze: fam("hotelBronze", {
    style: facadeStyle("whitePanelGrid", {
      wall: "metalWhite",
      wallColor: "#8a5b3c",
      storey: 3.2,
      groundStorey: 5.0,
      bay: 4.0,
      window: [0.9, 1.2],
      sill: 1.0,
      frame: 0.05,
      frameColor: "#3a2a20",
      glassColor: "#1e2731",
      interior: "residential",
      warmth: 0.8,
      panelJoints: { w: 1.0, h: 0.8, width: 0.01, color: "#6c4630" },
      coping: { height: 0.3, color: "#6c4630" },
      groundFloor: { kind: "storefront" },
    }),
    parapet: 0.8,
    coping: "#6c4630",
    roof: "#5a5a58",
    low: "lowGrid",
  }),
  // ── Intelligate I/II, Neo (Joukahaisenkatu 6): grey metal, ribbons, silver drums ──
  intelli: fam("intelli", {
    style: facadeStyle("whitePanelGrid", {
      pattern: "ribbon",
      wall: "metalWhite",
      wallColor: "#a3aaaf",
      storey: 3.7,
      groundStorey: 4.4,
      bay: 1.5,
      window: [1.5, 1.35],
      sill: 1.0,
      frame: 0.05,
      mullion: 0.06,
      frameColor: "#3f454b",
      glassColor: "#1f2c37",
      ribbonGroups: { units: 8, gap: 1.5 },
      panelJoints: { w: 3.0, h: 1.85, width: 0.012, color: "#868d92" },
      coping: { height: 0.3, color: "#8d9499" },
      groundFloor: { kind: "storefront" },
    }),
    parapet: 0.7,
    coping: "#8d9499",
    roof: "#8b8b87",
    low: "lowRibbon",
  }),
  neo: fam("neo", {
    style: facadeStyle("whitePanelGrid", {
      pattern: "ribbon",
      wall: "metalWhite",
      wallColor: "#878e94",
      storey: 4.6,
      groundStorey: 4.6,
      bay: 1.8,
      window: [1.8, 1.3],
      sill: 1.6,
      frame: 0.05,
      mullion: 0.07,
      frameColor: "#3d4349",
      glassColor: "#1d2833",
      ribbonGroups: { units: 10, gap: 3.6 },
      coping: { height: 0.3, color: "#71787d" },
      groundFloor: { kind: "same" },
    }),
    ribs: { axis: 1, pitch: 0.2, depth: 0.25, shade: 0.08 },
    parapet: 0.6,
    coping: "#71787d",
    roof: "#8b8b87",
    low: "lowRibbon",
  }),
  // ── Kupittaa station hall on its bridge: white panel band, green-tinted glazing ──
  station: fam("station", {
    style: facadeStyle("curtainWall", {
      wall: "metalWhite",
      wallColor: "#d9dcdc",
      storey: 4.9,
      groundStorey: 4.9,
      bay: 1.6,
      frameColor: "#3c4246",
      glassColor: "#1c3a33",
      glassTransmittance: 0.55,
      mullion: 0.08,
      transoms: [2.3],
      spandrel: { height: 1.3, color: "#dadddd" },
      interior: "retail",
    }),
    parapet: 0.35,
    coping: "#c9cdcd",
    roof: "#9a9b98",
    low: "lowCurtain",
  }),
  // ── If-talo (Kalevantie 3): dark glass bands and brick ──
  ifGlass: fam("ifGlass", {
    style: facadeStyle("whitePanelGrid", {
      pattern: "ribbon",
      wall: "metalDark",
      wallColor: "#3a3e43",
      storey: 3.6,
      groundStorey: 4.3,
      bay: 1.35,
      window: [1.35, 1.8],
      sill: 0.75,
      frame: 0.04,
      mullion: 0.05,
      frameColor: "#2a2e32",
      glassColor: "#20323f",
      coping: { height: 0.25, color: "#2f3236" },
      groundFloor: { kind: "storefront" },
    }),
    parapet: 0.6,
    coping: "#2f3236",
    roof: "#7c7c79",
    low: "lowRibbon",
  }),
  /** Modern dark extension: black panels and large glazing (Teutori library). */
  darkGlass: fam("darkGlass", {
    style: facadeStyle("curtainWall", {
      wall: "metalDark",
      wallColor: "#232427",
      storey: 3.8,
      groundStorey: 4.2,
      bay: 1.8,
      frameColor: "#1c1d20",
      glassColor: "#1b2530",
      mullion: 0.06,
      transoms: [],
      spandrel: { height: 1.0, color: "#202125" },
      interior: "retail",
    }),
    parapet: 0.4,
    coping: "#26272a",
    roof: "#5d5d5b",
    low: "lowCurtain",
  }),
  /** 1960s–70s offices: light grey corrugated panels, long ribbon windows. */
  ribbonGrey: fam("ribbonGrey", {
    style: facadeStyle("whitePanelGrid", {
      pattern: "ribbon",
      wall: "metalWhite",
      wallColor: "#c4c7c8",
      storey: 3.6,
      groundStorey: 4.2,
      bay: 1.4,
      window: [1.4, 1.3],
      sill: 1.0,
      frame: 0.05,
      mullion: 0.07,
      frameColor: "#4c5156",
      glassColor: "#1d2933",
      coping: { height: 0.35, color: "#a9adaf" },
      groundFloor: { kind: "same" },
    }),
    ribs: { axis: 1, pitch: 0.15, depth: 0.25, shade: 0.07 },
    parapet: 0.5,
    coping: "#a9adaf",
    roof: "#7f807d",
    low: "lowRibbon",
  }),
  // ── Generic families (tinted per building) ──
  office: fam("office", {
    style: facadeStyle("whitePanelGrid", {
      wall: "metalWhite",
      wallColor: "#ffffff",
      storey: 3.6,
      groundStorey: 4.2,
      bay: 2.7,
      window: [1.9, 1.5],
      sill: 0.9,
      frame: 0.06,
      frameColor: "#4c5257",
      glassColor: "#1e2a35",
      panelJoints: { w: 2.7, h: 3.6, width: 0.012, color: "#b8bcbf" },
      coping: { height: 0.3, color: "#c3c7c9" },
      groundFloor: { kind: "storefront" },
      streaks: 0.3,
    }),
    parapet: 0.7,
    coping: "#c3c7c9",
    roof: "#8e8e8a",
    low: "lowGrid",
  }),
  res: fam("res", {
    style: facadeStyle("residentialRender", {
      wallColor: "#ffffff",
      storey: 3.0,
      groundStorey: 3.4,
      bay: 3.3,
      window: [1.5, 1.5],
      sill: 0.8,
      frameColor: "#e9e7e2",
      glassColor: "#1f262c",
      coping: { height: 0.3, color: "#a9a59e" },
      streaks: 0.45,
    }),
    parapet: 0.6,
    coping: "#9e9a93",
    roof: "#58585a",
    low: "lowRes",
  }),
  resBrick: fam("resBrick", {
    style: facadeStyle("brickGrid", {
      wallColor: "#8e4a37",
      storey: 3.0,
      groundStorey: 3.4,
      bay: 3.3,
      window: [1.5, 1.5],
      sill: 0.8,
      frame: 0.07,
      frameColor: "#dedbd5",
      glassColor: "#1f262c",
      interior: "residential",
      warmth: 0.85,
      blinds: 0.45,
      coping: { height: 0.3, color: "#5e4a43" },
    }),
    tile: [2.0, 2.0],
    parapet: 0.6,
    coping: "#5e4a43",
    roof: "#58585a",
    low: "lowRes",
  }),
  oldRender: fam("oldRender", {
    style: facadeStyle("residentialRender", {
      wallColor: "#ffffff",
      storey: 3.7,
      groundStorey: 4.0,
      bay: 2.8,
      window: [1.2, 1.9],
      sill: 0.9,
      frame: 0.08,
      frameColor: "#ece9e2",
      glassColor: "#1f262c",
      interior: "office",
      warmth: 0.6,
      coping: { height: 0.35, color: "#c9c3b7" },
      streaks: 0.5,
    }),
    parapet: 0.3,
    coping: "#bdb6a8",
    roof: "#6d4a3c",
    low: "lowRes",
  }),
  oldBrick: fam("oldBrick", {
    style: facadeStyle("brickGrid", {
      wallColor: "#97543f",
      storey: 3.8,
      groundStorey: 4.0,
      bay: 2.9,
      window: [1.3, 2.0],
      sill: 0.95,
      frame: 0.08,
      frameColor: "#e5e1d8",
      glassColor: "#1f262c",
      coping: { height: 0.35, color: "#6e5148" },
      streaks: 0.4,
    }),
    tile: [2.0, 2.0],
    parapet: 0.4,
    coping: "#6e5148",
    roof: "#5d5b58",
    low: "lowBrick",
  }),
  plain: fam("plain", {
    style: facadeStyle("plain", { wall: "concreteFacade", wallColor: "#ffffff" }),
    parapet: 0.3,
    coping: "#9c9993",
    roof: "#5a5a58",
    low: "lowPlain",
  }),
  // ── Low-tier merges (wall colour from the per-vertex tint) ──
  lowGrid: fam("lowGrid", {
    style: facadeStyle("whitePanelGrid", { wall: "plasterWhite", wallColor: "#ffffff", panelJoints: undefined }),
    parapet: 0.7,
    coping: "#c3c7c9",
    roof: "#8e8e8a",
  }),
  lowRibbon: fam("lowRibbon", {
    style: facadeStyle("whitePanelGrid", {
      pattern: "ribbon",
      wall: "plasterWhite",
      wallColor: "#ffffff",
      bay: 1.4,
      window: [1.4, 1.45],
      mullion: 0.06,
      panelJoints: undefined,
    }),
    parapet: 0.7,
    coping: "#c3c7c9",
    roof: "#8e8e8a",
  }),
  lowCurtain: fam("lowCurtain", {
    style: facadeStyle("curtainWall", { wall: "plasterWhite", wallColor: "#ffffff" }),
    parapet: 0.4,
    coping: "#9aa3aa",
    roof: "#8b8c88",
  }),
  lowBrick: fam("lowBrick", {
    style: facadeStyle("brickGrid", { wallColor: "#ffffff" }),
    tile: [2.0, 2.0],
    parapet: 0.8,
    coping: "#4a4442",
    roof: "#5e5d5a",
  }),
  lowRes: fam("lowRes", {
    style: facadeStyle("residentialRender", { wallColor: "#ffffff" }),
    parapet: 0.6,
    coping: "#9e9a93",
    roof: "#58585a",
  }),
  lowPark: fam("lowPark", {
    style: facadeStyle("parkingDecks", { wallColor: "#8f8c86" }),
    parapet: 1.1,
    coping: "#9d9a93",
    roof: "#3e3f40",
  }),
  lowPlain: fam("lowPlain", {
    style: facadeStyle("plain", { wall: "plasterWhite", wallColor: "#ffffff" }),
    parapet: 0.3,
    coping: "#9c9993",
    roof: "#5a5a58",
  }),
};

export type FamilyKey = keyof typeof FAMILIES;

/** The family that actually renders a family on a tier. */
export function renderFamily(key: string, tier: Tier): Family {
  const f = FAMILIES[key] ?? FAMILIES.office;
  if (tier === "low" && f.low && FAMILIES[f.low]) return FAMILIES[f.low];
  return f;
}

/**
 * Per-vertex wall tint for a building drawn with `family` on a tier: the
 * ratio of the wanted wall colour to the rendered family's wall colour
 * (linear), so a merged low-tier family keeps every building's colour.
 */
export function wallTint(family: Family, rendered: Family, wanted?: string): [number, number, number] {
  const target = new THREE.Color(wanted ?? family.style.wallColor ?? "#ffffff");
  const base = new THREE.Color(rendered.style.wallColor ?? "#ffffff");
  const r = (a: number, b: number) => Math.min(4, a / Math.max(b, 1e-3));
  return [r(target.r, base.r), r(target.g, base.g), r(target.b, base.b)];
}

// ── Materials ────────────────────────────────────────────────────────────────

const EXT_VERTEX_PARS = /* glsl */ `
attribute vec3 ctxTint;
varying vec3 vCtxTint;
`;
const EXT_VERTEX_MAIN = /* glsl */ `
	vCtxTint = ctxTint;
`;

const EXT_FRAGMENT_PARS = /* glsl */ `
varying vec3 vCtxTint;
uniform vec4 uCtxRib;          // axis (0 horizontal ribs, 1 vertical), pitch, depth, shade
uniform vec3 uCtxStripe[ 4 ];     // top a, top b, bottom a, bottom b
uniform vec3 uCtxStripeBase;
uniform vec4 uCtxStripeParams;    // top zone, bottom zone, base height, -
uniform vec4 uCtxLights;          // cols, rows, bar width, on
uniform vec4 uCtxGlow;         // rgb, luminance
`;

/** Inserted after the facade's surface code (color_fragment): tint, rib shading, stripes. */
const EXT_SURFACE = /* glsl */ `
	{
		// Per-building wall tint (wall coverage only).
		float ctxWall = clamp( fcWallCov + fc.reveal, 0.0, 1.0 );
		diffuseColor.rgb *= mix( vec3( 1.0 ), vCtxTint, ctxWall );
		#ifdef CTX_RIBS
		{
			// Ribbed cladding: darker grooves, faded out where the ribs get smaller than a pixel.
			float ctxCoord = ( uCtxRib.x < 0.5 ? fcV : fcU ) / uCtxRib.y;
			float ctxFw = ( uCtxRib.x < 0.5 ? fcFw.y : fcFw.x ) / uCtxRib.y;
			float ctxFade = 1.0 - smoothstep( 0.25, 0.7, ctxFw );
			float ctxPhase = fract( ctxCoord );
			float ctxGroove = smoothstep( 0.0, 0.18, ctxPhase ) * ( 1.0 - smoothstep( 0.82, 1.0, ctxPhase ) );
			diffuseColor.rgb *= mix( 1.0, 1.0 - uCtxRib.w * ( 1.0 - ctxGroove ), ctxFade * fcWallCov );
		}
		#endif
		#ifdef CTX_STRIPES
		{
			// Barcode bands: rows of thin stripes, runs of random length per row (box-filtered).
			float rowH = 0.32;
			float row = floor( fcV / rowH );
			float runLen = 1.4 + 3.2 * fcHash( vec3( row, 7.0, 3.1 ) );
			float runOff = fcHash( vec3( row, 3.0, 5.3 ) ) * 11.0;
			float run = floor( ( fcU + runOff ) / runLen );
			float hOn = fcHash( vec3( run, row, 11.0 ) );
			float hCol = fcHash( vec3( run, row, 19.0 ) );
			float stripe = fcPulse( fcV, fcFw.y, rowH, 0.0, rowH * 0.62 ) * fcPulse( fcU + runOff, fcFw.x, runLen, 0.0, runLen - 0.25 );
			float dTop = fcTop - fcV;
			// Bottom zones follow the storey grid (level bands), not the sloping ground.
			float dBot = fcV;
			float topD = 1.0 - smoothstep( 0.0, uCtxStripeParams.x, dTop - 0.6 );
			float botD = 1.0 - smoothstep( uCtxStripeParams.z, uCtxStripeParams.z + uCtxStripeParams.y, dBot );
			float onTop = step( hOn, topD * 0.95 );
			float onBot = step( hOn, botD * 0.95 );
			vec3 cTop = mix( uCtxStripe[ 0 ], uCtxStripe[ 1 ], step( 0.55, hCol ) );
			vec3 cBot = mix( uCtxStripe[ 2 ], uCtxStripe[ 3 ], step( 0.5, hCol ) );
			// Far away: the bands' average colour (no shimmer).
			float far = smoothstep( 0.08, 0.3, max( fcFw.x, fcFw.y ) );
			vec3 avgTop = mix( uCtxStripe[ 0 ], uCtxStripe[ 1 ], 0.45 );
			vec3 avgBot = mix( uCtxStripe[ 2 ], uCtxStripe[ 3 ], 0.5 );
			float wTop = mix( stripe * onTop, topD * 0.85 * 0.5, far );
			float wBot = mix( stripe * onBot * ( 1.0 - onTop ), botD * 0.9 * 0.5, far );
			vec3 wallC = diffuseColor.rgb;
			wallC = mix( wallC, cTop, clamp( wTop, 0.0, 1.0 ) * fcWallCov );
			wallC = mix( wallC, mix( cBot, avgBot, far ), clamp( wBot, 0.0, 1.0 ) * fcWallCov );
			// Solid base band up to the first-floor sills (level, on the storey grid).
			float base = 1.0 - fcBox( fcV, fcFw.y, uCtxStripeParams.z, 1e4 );
			wallC = mix( wallC, uCtxStripeBase, base * fcWallCov );
			diffuseColor.rgb = wallC;
		}
		#endif
		#ifdef CTX_LIGHTS
		if ( fc.glass > 0.001 && !fcGroundFloor ) {
			// Window lights: glazing bars inside the frame (2×2 lights …), as frame colour.
			vec2 q = fc.local / max( fc.cell, vec2( 0.2 ) );
			vec2 fwq = max( fcFw / max( fc.cell, vec2( 0.2 ) ), vec2( 1e-4 ) );
			vec2 bw = vec2( uCtxLights.z ) / max( fc.cell, vec2( 0.2 ) );
			float bx = 0.0;
			float by = 0.0;
			if ( uCtxLights.x > 1.5 ) bx = fcPulse( q.x + 0.5 * bw.x, fwq.x, 1.0 / uCtxLights.x, 0.0, bw.x ) * step( 1.0 / uCtxLights.x * 0.5, q.x ) * step( q.x, 1.0 - 1.0 / uCtxLights.x * 0.5 );
			if ( uCtxLights.y > 1.5 ) by = fcBox( q.y, fwq.y, 0.62 - 0.5 * bw.y, 0.62 + 0.5 * bw.y );
			float bars = clamp( bx + by, 0.0, 1.0 ) * ( 1.0 - smoothstep( 0.04, 0.1, max( fcFw.x, fcFw.y ) ) );
			float moved = fc.glass * bars;
			diffuseColor.rgb += ( uFcFrameColor - uFcGlassColor * 0.08 ) * moved;
			fc.glass -= moved;
			fc.frame += moved;
		}
		#endif
	}
`;

/** Inserted after normal_fragment_maps: flat glass (no wall bumps on the panes), ribs (view space). */
const EXT_NORMAL = /* glsl */ `
	// Panes are flat: the wall texture's normal map stops at the frames (the facade adds its pane tilt after this).
	normal = normalize( mix( normal, nonPerturbedNormal, clamp( fc.glass, 0.0, 1.0 ) ) );
	#ifdef CTX_RIBS
	{
		float ctxC = ( uCtxRib.x < 0.5 ? vFc.y : vFc.x ) / uCtxRib.y;
		float ctxF = 1.0 - smoothstep( 0.25, 0.7, ( uCtxRib.x < 0.5 ? fcFw.y : fcFw.x ) / uCtxRib.y );
		float ctxS = sin( 6.2831853 * ctxC ) * uCtxRib.z * ctxF * fcWallCov;
		vec3 ctxDir = uCtxRib.x < 0.5 ? ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz : ( viewMatrix * vec4( fcT, 0.0 ) ).xyz;
		normal = normalize( normal + ctxDir * ctxS );
	}
	#endif
`;

/** Inserted after emissivemap_fragment: unlit rooms keep a trace of light; channel glass lit from inside after dusk. */
const EXT_EMISSIVE = /* glsl */ `
	// Dark rooms at night are not pure black: corridor and emergency light, the city reflected in the panes.
	totalEmissiveRadiance += vec3( 0.62, 0.68, 0.8 ) * 0.0005 * uFcNight * fc.glass * ( 1.0 - fc.lit );
	#ifdef CTX_GLOW
	{
		float ctxRib = 0.75 + 0.25 * smoothstep( 0.1, 0.5, abs( fract( vFc.x / max( uCtxRib.y, 0.05 ) ) - 0.5 ) * 2.0 );
		// Stairwells stay lit (dimmed on quiet nights), brighter where landings are.
		float ctxLand = 0.7 + 0.3 * smoothstep( 0.3, 0.0, abs( fract( fcV / uFcStorey ) - 0.15 ) );
		float ctxOn = smoothstep( 0.15, 0.6, uFcNight ) * mix( 0.35, 1.0, clamp( uFcOccupancy.x * 1.6, 0.0, 1.0 ) ) * ctxLand;
		totalEmissiveRadiance += uCtxGlow.rgb * uCtxGlow.a * ctxOn * ctxRib * fcWallCov;
	}
	#endif
`;

const linear = (hex: string) => new THREE.Color(hex);

/** A facade material for a family (owned; shares the library textures). */
export function makeFamilyMaterial(lib: MaterialLibrary, family: Family, tier: Tier): THREE.MeshStandardMaterial {
  const m = makeFacadeMaterial(lib, family.style, { tier });
  if (family.tile && lib instanceof TwinMaterialLibrary && family.style.wall === "brickDark") {
    // Standard bricks (DataCity, apartments) instead of EduCity's long Kolumba format.
    m.map = lib.texture("brick_dark", "color", family.tile);
    m.normalMap = lib.texture("brick_dark", "normal", family.tile);
    m.roughnessMap = lib.texture("brick_dark", "rough", family.tile);
    if (m.aoMap) m.aoMap = lib.texture("brick_dark", "ao", family.tile);
  }
  m.name = `context:${family.key}`;
  const stripes = family.stripes;
  const uniforms: Record<string, THREE.IUniform> = {
    uCtxRib: {
      value: new THREE.Vector4(family.ribs?.axis ?? 0, family.ribs?.pitch ?? 0.27, family.ribs?.depth ?? 0, family.ribs?.shade ?? 0),
    },
    uCtxStripe: {
      value: stripes
        ? [stripes.top[0], stripes.top[1], stripes.bottom[0], stripes.bottom[1]].map((c) => linear(c))
        : [0, 1, 2, 3].map(() => linear("#ffffff")),
    },
    uCtxStripeBase: { value: linear(stripes?.base ?? "#ffffff") },
    uCtxStripeParams: { value: new THREE.Vector4(stripes?.topZone ?? 4, stripes?.bottomZone ?? 6, stripes?.baseHeight ?? 0, 0) },
    uCtxLights: { value: new THREE.Vector4(family.lights?.cols ?? 1, family.lights?.rows ?? 1, family.lights?.bar ?? 0.05, family.lights ? 1 : 0) },
    uCtxGlow: {
      value: (() => {
        const c = linear(family.glow?.color ?? "#ffffff");
        return new THREE.Vector4(c.r, c.g, c.b, family.glow?.luminance ?? 0);
      })(),
    },
  };
  const flags = `${family.ribs ? "r" : ""}${family.stripes ? "s" : ""}${family.glow ? "g" : ""}${family.lights ? "l" : ""}`;
  const baseCompile = m.onBeforeCompile;
  const baseKey = m.customProgramCacheKey();
  m.userData.contextUniforms = uniforms;
  m.onBeforeCompile = (shader, renderer) => {
    baseCompile.call(m, shader, renderer);
    Object.assign(shader.uniforms, uniforms);
    shader.defines = { ...(shader.defines ?? {}) };
    if (family.ribs) shader.defines.CTX_RIBS = "";
    if (family.stripes) shader.defines.CTX_STRIPES = "";
    if (family.glow) shader.defines.CTX_GLOW = "";
    if (family.lights) shader.defines.CTX_LIGHTS = "";
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${EXT_VERTEX_PARS}`)
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>\n${EXT_VERTEX_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${EXT_FRAGMENT_PARS}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${EXT_SURFACE}`)
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n${EXT_NORMAL}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${EXT_EMISSIVE}`);
  };
  // Families with the same pattern, interior and extensions share one program (constants are uniforms).
  m.customProgramCacheKey = () => `${baseKey}|ctx-${flags}`;
  return m;
}
