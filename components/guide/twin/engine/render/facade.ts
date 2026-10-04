import * as THREE from "three";
import type { LightingState, MaterialLibrary, MaterialName, Tier, V2 } from "../types";
import { cleanRing, ensureCCW, hashString, ringArea } from "../util";
import { TwinMaterialLibrary } from "./materials";
import { kelvinToLinear, skyIlluminance, sunIlluminance } from "../sky/sky";
import { turkuLocalToUtc } from "../sky/sun";

/**
 * Procedural facades: thousands of windows with no geometry.
 *
 * facadeWalls() extrudes a footprint into walls whose vertices carry
 *   uv      = (u, v) metres along the wall / above the reference level (library textures tile on it)
 *   facade  = (u, v, seed, top) — top = height of the wall's upper edge above the reference
 *   facadeGround = local ground above the reference (no windows below it)
 * u runs continuously round the building (left → right seen from outside).
 *
 * makeFacadeMaterial() draws windows, frames, mullions, spandrels, louvres
 * and panel joints from that UV (box-filtered: no moiré at any distance) and,
 * behind every window, a parallax room (interior mapping on ultra/high):
 * floor, ceiling with light panels, back and side walls, desks and monitors,
 * blinds. Rooms light up per a hash, by occupancy for the time of day
 * (setFacadeLighting, driven by the engine on every time change).
 */

export type FacadePattern = "grid" | "ribbon" | "curtain" | "scatter" | "none";
export type InteriorKind = "office" | "residential" | "retail" | "parking";

export interface FacadeStyle {
  pattern: FacadePattern;
  /** Wall material from the library (texture set + calibrated albedo). */
  wall: MaterialName;
  /** Wall albedo override (sRGB). */
  wallColor?: string;
  wallRoughness?: number;
  /** Storey height (m); the ground storey can be taller. */
  storey: number;
  groundStorey?: number;
  /** Window pitch along the wall (grid/scatter: bay; ribbon/curtain: mullion pitch). */
  bay: number;
  /** Window width and height (grid); ribbon/curtain use the height only. */
  window: [number, number];
  /** Sill height above the storey floor. */
  sill: number;
  /** Frame width (m). */
  frame: number;
  frameColor: string;
  /** Glass body tint (sRGB) and transmittance of the glazing (0..1). */
  glassColor: string;
  glassTransmittance: number;
  /** Mullion width (ribbon/curtain). */
  mullion?: number;
  /** Curtain wall: transom heights within a storey (m above the floor), up to 3. */
  transoms?: number[];
  /** Curtain wall: opaque spandrel band centred on each slab. */
  spandrel?: { height: number; color: string };
  /** Ribbon: dark blade louvre above every ribbon. */
  louvre?: { height: number; gap: number; color: string };
  /** Ribbon: `units` mullion bays of glass, then `gap` metres of wall. */
  ribbonGroups?: { units: number; gap: number };
  /** Panel joints (seams) on the wall. */
  panelJoints?: { w: number; h: number; width: number; color: string };
  /** Scatter (EduCity): window sizes [w, h, probability], slot occupancy, sill jitter. */
  scatter?: { sizes: [number, number, number][]; occupancy: number; jitter: number };
  /** Light coping band along the top edge. */
  coping?: { height: number; color: string };
  /** Ground storey treatment. */
  groundFloor?: { kind: "storefront" | "same" | "solid"; color?: string };
  /** Interior behind the glass. */
  interior: InteriorKind;
  roomDepth: number;
  /** Multiplies the time-of-day occupancy (EduCity during the event: 1.6). */
  occupancy?: number;
  /** 0 = cool 4000 K … 1 = warm 2700 K. */
  warmth: number;
  /** Fraction of windows with blinds partly down. */
  blinds: number;
  /** Rain-streak weathering under sills (render/concrete). */
  streaks?: number;
}

const BASE: Omit<FacadeStyle, "pattern" | "wall"> = {
  storey: 3.6,
  bay: 3.6,
  window: [1.8, 1.5],
  sill: 0.9,
  frame: 0.06,
  frameColor: "#2a2b2e",
  glassColor: "#1b232b",
  glassTransmittance: 0.62,
  interior: "office",
  roomDepth: 5,
  warmth: 0.3,
  blinds: 0.25,
};

/** Presets: BioCity, EduCity and the context ring (SPEC §3). */
export const FACADE_PRESETS = {
  /** BioCity 2020 recladding: satin black panels, ribbon windows in 1.2 m units, blade louvres. */
  blackPanelRibbon: {
    ...BASE,
    pattern: "ribbon",
    wall: "panelBlack",
    storey: 3.65,
    groundStorey: 4.14,
    bay: 1.2,
    window: [1.2, 1.4],
    sill: 0.9,
    frame: 0.05,
    frameColor: "#1e1e22",
    glassColor: "#1c252e",
    glassTransmittance: 0.42,
    mullion: 0.06,
    louvre: { height: 0.18, gap: 0.08, color: "#1e1e22" },
    ribbonGroups: { units: 8, gap: 1.2 },
    panelJoints: { w: 3.6, h: 3.65, width: 0.012, color: "#151518" },
    coping: { height: 0.25, color: "#2a292d" },
    groundFloor: { kind: "storefront" },
    roomDepth: 5.5,
    warmth: 0.25,
  },
  /** EduCity: dark grey-brown Kolumba brick, square windows of several sizes at random. */
  darkBrickScatter: {
    ...BASE,
    pattern: "scatter",
    wall: "brickDark",
    storey: 4.0,
    groundStorey: 5.0,
    bay: 4.0,
    window: [2.2, 2.2],
    sill: 0.8,
    frame: 0.07,
    frameColor: "#1c1716",
    glassColor: "#1d2328",
    glassTransmittance: 0.66,
    scatter: {
      sizes: [
        [1.2, 1.2, 0.5],
        [2.2, 2.2, 0.33],
        [3.0, 3.0, 0.17],
      ],
      occupancy: 0.92,
      jitter: 0.5,
    },
    coping: { height: 0.12, color: "#4a4441" },
    groundFloor: { kind: "storefront" },
    roomDepth: 6,
    warmth: 0.15,
    blinds: 0.12,
  },
  /** Full-height glazing, 1.2 m mullions, three rows per storey, dark spandrels. */
  curtainWall: {
    ...BASE,
    pattern: "curtain",
    wall: "metalDark",
    storey: 3.65,
    bay: 1.2,
    window: [1.2, 3.65],
    sill: 0,
    frame: 0.05,
    frameColor: "#2b2f34",
    glassColor: "#1f2b36",
    glassTransmittance: 0.45,
    mullion: 0.06,
    transoms: [1.05, 2.35],
    spandrel: { height: 0.9, color: "#1a2027" },
    roomDepth: 6,
  },
  /** Red-brown brick with punched windows (DataCity, older campus blocks). */
  brickGrid: {
    ...BASE,
    pattern: "grid",
    wall: "brickDark",
    wallColor: "#8a4b3c",
    storey: 3.5,
    bay: 2.7,
    window: [1.5, 1.6],
    sill: 0.85,
    frame: 0.07,
    frameColor: "#3a2f2a",
    coping: { height: 0.3, color: "#6f5b52" },
    streaks: 0.4,
  },
  /** Precast concrete grid (labs, hospitals, older offices). */
  concreteGrid: {
    ...BASE,
    pattern: "grid",
    wall: "concreteFacade",
    wallColor: "#b9b6ae",
    storey: 3.6,
    bay: 3.0,
    window: [1.9, 1.6],
    sill: 0.9,
    frame: 0.06,
    frameColor: "#3b3d40",
    panelJoints: { w: 6, h: 3.6, width: 0.015, color: "#8d8a83" },
    coping: { height: 0.3, color: "#c9c6bf" },
    streaks: 0.6,
  },
  /** Rendered apartment block: punched windows, warm interiors, curtains. */
  residentialRender: {
    ...BASE,
    pattern: "grid",
    wall: "plasterWhite",
    wallColor: "#d9d2c3",
    storey: 2.9,
    bay: 3.3,
    window: [1.4, 1.45],
    sill: 0.85,
    frame: 0.06,
    frameColor: "#e8e6e0",
    glassColor: "#20262c",
    interior: "residential",
    roomDepth: 4,
    warmth: 0.85,
    blinds: 0.45,
    coping: { height: 0.25, color: "#a7a39b" },
    streaks: 0.5,
  },
  /** Light metal panels with ribbon-ish windows (Electrocity, ICT-City, Eurocity). */
  whitePanelGrid: {
    ...BASE,
    pattern: "grid",
    wall: "metalWhite",
    wallColor: "#d8dcdf",
    storey: 3.6,
    bay: 2.4,
    window: [2.0, 1.55],
    sill: 0.9,
    frame: 0.05,
    frameColor: "#5a6066",
    glassColor: "#1f2c38",
    glassTransmittance: 0.55,
    panelJoints: { w: 1.2, h: 3.6, width: 0.01, color: "#b9bec2" },
    coping: { height: 0.25, color: "#c4c9cc" },
  },
  /** Open parking decks (ParkCity): slab edges with dark open bays, lit at night. */
  parkingDecks: {
    ...BASE,
    pattern: "ribbon",
    wall: "concreteFacade",
    wallColor: "#9a978f",
    storey: 3.1,
    groundStorey: 3.6,
    bay: 8,
    window: [8, 1.9],
    sill: 0.95,
    frame: 0,
    frameColor: "#7d7a73",
    glassColor: "#14171a",
    glassTransmittance: 1,
    mullion: 0.45,
    interior: "parking",
    roomDepth: 14,
    warmth: 0.05,
    blinds: 0,
    coping: { height: 0.2, color: "#b2afa7" },
  },
  /** Windowless walls (garages, plant rooms, sheds). */
  plain: {
    ...BASE,
    pattern: "none",
    wall: "concreteFacade",
    coping: { height: 0.2, color: "#9c9993" },
  },
} satisfies Record<string, FacadeStyle>;

export type FacadePresetName = keyof typeof FACADE_PRESETS;

// ── Geometry ────────────────────────────────────────────────────────────────

export interface FacadeWallOptions {
  /** Courtyard rings (walls face into the courtyard). */
  holes?: V2[][];
  /** v = 0 level (default heightFrom): storeys count from here. */
  vRef?: number;
  /** Top height per point (sloped roofs); default heightTo. */
  topAt?: (x: number, z: number) => number;
  /** Ground height per point (no windows below it); default heightFrom. */
  groundAt?: (x: number, z: number) => number;
  /** Seed for window randomness (e.g. hashString(building id)). */
  seed?: number;
  /** Split walls longer than this (m) so the ground follows the terrain. */
  maxSegment?: number;
  /** Start of u (lets neighbouring walls continue a rhythm). */
  uOffset?: number;
}

/**
 * Walls of a footprint from `heightFrom` to `heightTo` with facade attributes
 * and outward normals. The ring may be in either orientation.
 */
export function facadeWalls(polygon: V2[], heightFrom: number, heightTo: number, opts: FacadeWallOptions = {}): THREE.BufferGeometry {
  const rings: V2[][] = [];
  const outer = ensureCCW(cleanRing(polygon));
  if (outer.length >= 3) rings.push(outer);
  for (const hole of opts.holes ?? []) {
    const h = cleanRing(hole);
    if (h.length >= 3) rings.push(ringArea(h) > 0 ? h.slice().reverse() : h);
  }
  const vRef = opts.vRef ?? heightFrom;
  const seed = ((opts.seed ?? 0) % 9973) / 9973;
  const maxSeg = opts.maxSegment ?? 10;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const facade: number[] = [];
  const ground: number[] = [];
  const index: number[] = [];
  let u = opts.uOffset ?? 0;
  for (const ring of rings) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const len = Math.hypot(dx, dz);
      if (len < 1e-3) continue;
      const tx = dx / len;
      const tz = dz / len;
      // Outward normal for CCW rings (and CW holes): N = (−T.z, 0, T.x).
      const nx = -tz;
      const nz = tx;
      const pieces = Math.max(1, Math.ceil(len / maxSeg));
      for (let p = 0; p < pieces; p++) {
        const s0 = p / pieces;
        const s1 = (p + 1) / pieces;
        const x0 = a[0] + dx * s0;
        const z0 = a[1] + dz * s0;
        const x1 = a[0] + dx * s1;
        const z1 = a[1] + dz * s1;
        const u0 = u + len * s0;
        const u1 = u + len * s1;
        const top0 = opts.topAt ? opts.topAt(x0, z0) : heightTo;
        const top1 = opts.topAt ? opts.topAt(x1, z1) : heightTo;
        const g0 = opts.groundAt ? opts.groundAt(x0, z0) : heightFrom;
        const g1 = opts.groundAt ? opts.groundAt(x1, z1) : heightFrom;
        const base = positions.length / 3;
        // Bottom-left, bottom-right, top-right, top-left (seen from outside).
        const verts: [number, number, number, number, number, number][] = [
          [x0, heightFrom, z0, u0, top0, g0],
          [x1, heightFrom, z1, u1, top1, g1],
          [x1, top1, z1, u1, top1, g1],
          [x0, top0, z0, u0, top0, g0],
        ];
        for (const [x, y, z, uu, top, g] of verts) {
          positions.push(x, y, z);
          normals.push(nx, 0, nz);
          uvs.push(uu, y - vRef);
          facade.push(uu, y - vRef, seed, top - vRef);
          ground.push(g - vRef);
        }
        index.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
      u += len;
    }
    // Gap between rings so courtyards don't continue the outer rhythm exactly.
    u += 7.3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute("facade", new THREE.Float32BufferAttribute(facade, 4));
  geo.setAttribute("facadeGround", new THREE.Float32BufferAttribute(ground, 1));
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}

/** Flat roof (or floor) polygon with holes at height y, plan-metre UVs (u = x, v = −z). */
export function flatRoofGeometry(ring: V2[], holes: V2[][], y: number | ((x: number, z: number) => number)): THREE.BufferGeometry {
  const outer = ensureCCW(cleanRing(ring));
  const hs = holes.map((h) => cleanRing(h)).filter((h) => h.length >= 3);
  // ShapeUtils works in a y-up 2D plane: use (x, −z) so CCW-from-above stays CCW.
  const contour = outer.map(([x, z]) => new THREE.Vector2(x, -z));
  const holeVs = hs.map((h) => (ringArea(h) > 0 ? h.slice().reverse() : h).map(([x, z]) => new THREE.Vector2(x, -z)));
  const faces = THREE.ShapeUtils.triangulateShape(contour, holeVs);
  const all = [...contour, ...holeVs.flat()];
  const positions: number[] = [];
  const uvs: number[] = [];
  for (const v of all) {
    const x = v.x;
    const z = -v.y;
    positions.push(x, typeof y === "number" ? y : y(x, z), z);
    uvs.push(x, -z);
  }
  const index: number[] = [];
  for (const [a, b, c] of faces) index.push(a, b, c);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  // Faces must point up.
  const n = geo.getAttribute("normal");
  let up = 0;
  for (let i = 0; i < n.count; i++) up += n.getY(i);
  if (up < 0) {
    for (let i = 0; i < index.length; i += 3) [index[i + 1], index[i + 2]] = [index[i + 2], index[i + 1]];
    geo.setIndex(index);
    geo.computeVertexNormals();
  }
  return geo;
}

// ── Lighting shared by every facade material ────────────────────────────────

/** Global uniforms: updated once per time change for all facades. */
export const FACADE_GLOBALS = {
  /** 0 = day … 1 = night. */
  uFcNight: { value: 0 },
  /** Daylight reaching room interiors (klux). */
  uFcDaylight: { value: 0.08 },
  /** Lit fraction by interior kind: office, residential, retail, parking. */
  uFcOccupancy: { value: new THREE.Vector4(0.6, 0.3, 0.9, 1) },
};

/** Occupancy (share of lit rooms) for a Turku wall-clock time — pure, unit-tested. */
export function occupancyFor(iso: string): { office: number; residential: number; retail: number; parking: number } {
  const utc = turkuLocalToUtc(iso);
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  const hour = m ? Number(m[1]) + Number(m[2]) / 60 : 12;
  // Day of week of the local date (0 = Sunday).
  const dow = new Date(utc + 2 * 3600000).getUTCDay();
  const weekday = dow >= 1 && dow <= 5;
  const ramp = (h: number, a: number, b: number) => Math.min(1, Math.max(0, (h - a) / (b - a)));
  let office: number;
  if (weekday) {
    if (hour < 6) office = 0.05;
    else if (hour < 8) office = 0.05 + 0.55 * ramp(hour, 6, 8);
    else if (hour < 16.5) office = 0.62;
    else if (hour < 19) office = 0.62 - 0.4 * ramp(hour, 16.5, 19);
    else if (hour < 23) office = 0.22 - 0.14 * ramp(hour, 19, 23);
    else office = 0.06;
  } else {
    office = hour > 8 && hour < 18 ? 0.1 : 0.05;
  }
  let residential: number;
  if (hour < 1) residential = 0.35;
  else if (hour < 6) residential = 0.08;
  else if (hour < 9) residential = 0.3;
  else if (hour < 15) residential = 0.12;
  else if (hour < 17) residential = 0.12 + 0.33 * ramp(hour, 15, 17);
  else if (hour < 22.5) residential = 0.55;
  else residential = 0.55 - 0.2 * ramp(hour, 22.5, 24);
  const retail = hour >= 7 && hour < 21 ? 0.95 : 0.18;
  return { office, residential, retail, parking: 1 };
}

/** Update every facade for a new time of day (called by the engine). */
export function setFacadeLighting(state: LightingState, sunThrough = 1): void {
  FACADE_GLOBALS.uFcNight.value = state.night;
  const el = state.sunElevationDeg;
  const exterior = skyIlluminance(el) + sunThrough * sunIlluminance(el, 10) * Math.max(0, Math.sin((el * Math.PI) / 180));
  // A few percent of the exterior daylight reaches the middle of a room.
  FACADE_GLOBALS.uFcDaylight.value = 0.045 * exterior;
  const o = occupancyFor(state.iso);
  FACADE_GLOBALS.uFcOccupancy.value.set(o.office, o.residential, o.retail, o.parking);
}

// ── Material ────────────────────────────────────────────────────────────────

const PATTERN_ID: Record<FacadePattern, number> = { none: 0, grid: 1, ribbon: 2, curtain: 3, scatter: 4 };
const INTERIOR_ID: Record<InteriorKind, number> = { office: 0, residential: 1, retail: 2, parking: 3 };

const FACADE_VERTEX_PARS = /* glsl */ `
attribute vec4 facade;
attribute float facadeGround;
varying vec4 vFc;
varying float vFcGround;
varying vec3 vFcWorldPos;
varying vec3 vFcWorldNormal;
`;

const FACADE_VERTEX_MAIN = /* glsl */ `
	vFc = facade;
	vFcGround = facadeGround;
	{
		vec4 fcWp = vec4( transformed, 1.0 );
		#ifdef USE_INSTANCING
			fcWp = instanceMatrix * fcWp;
		#endif
		fcWp = modelMatrix * fcWp;
		vFcWorldPos = fcWp.xyz;
		mat3 fcNm = mat3( modelMatrix );
		#ifdef USE_INSTANCING
			fcNm = fcNm * mat3( instanceMatrix );
		#endif
		vFcWorldNormal = normalize( fcNm * objectNormal );
	}
`;

const FACADE_FRAGMENT_PARS = /* glsl */ `
varying vec4 vFc;
varying float vFcGround;
varying vec3 vFcWorldPos;
varying vec3 vFcWorldNormal;

uniform float uFcNight;
uniform float uFcDaylight;
uniform vec4 uFcOccupancy;

uniform float uFcStorey;
uniform float uFcGroundStorey;
uniform float uFcBay;
uniform vec2 uFcWin;
uniform float uFcSill;
uniform float uFcFrame;
uniform vec3 uFcFrameColor;
uniform vec3 uFcGlassColor;
uniform float uFcTrans;
uniform float uFcMullion;
uniform vec3 uFcTransoms;
uniform vec4 uFcSpandrel;      // height, rgb
uniform vec4 uFcLouvre;        // height, gap, (unused), on
uniform vec3 uFcLouvreColor;
uniform vec3 uFcGroups;        // units, gap, on
uniform vec4 uFcJoints;        // w, h, width, on
uniform vec3 uFcJointColor;
uniform vec4 uFcScatterA;      // w0, h0, p0, occupancy
uniform vec4 uFcScatterB;      // w1, h1, p1, jitter
uniform vec4 uFcScatterC;      // w2, h2, p2, -
uniform vec4 uFcCoping;        // height, rgb
uniform float uFcGroundKind;   // 0 same, 1 storefront, 2 solid
uniform float uFcRoomDepth;
uniform float uFcOccScale;
uniform float uFcWarmth;
uniform float uFcBlinds;
uniform float uFcStreaks;

float fcHash( vec3 p ) {
	p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) );
	p += dot( p, p.yxz + 33.33 );
	return fract( ( p.x + p.y ) * p.z );
}
float fcHash2( vec2 p ) { return fcHash( vec3( p, 7.31 ) ); }

// Integral of a pulse train (1 inside [a, b) of every period p) from 0 to x.
float fcPulseInt( float x, float p, float a, float b ) {
	float w = b - a;
	float k = floor( ( x - a ) / p );
	float r = x - a - k * p;
	return k * w + clamp( r, 0.0, w );
}
// Box-filtered pulse train over a footprint fw: exact coverage, no moiré.
float fcPulse( float x, float fw, float p, float a, float b ) {
	fw = max( fw, 1e-4 );
	return ( fcPulseInt( x + 0.5 * fw, p, a, b ) - fcPulseInt( x - 0.5 * fw, p, a, b ) ) / fw;
}
// Box-filtered single interval [a, b].
float fcBox( float x, float fw, float a, float b ) {
	fw = max( fw, 1e-4 );
	return clamp( ( min( x + 0.5 * fw, b ) - max( x - 0.5 * fw, a ) ) / fw, 0.0, 1.0 );
}

vec3 fcKelvin( float warmth ) {
	// 4000 K → 2700 K (normalised to luminance 1).
	return mix( vec3( 1.06, 0.99, 0.90 ), vec3( 1.22, 0.93, 0.66 ), warmth );
}

struct FcCell {
	float glass;     // glass coverage 0..1
	float frame;     // frame/mullion coverage 0..1
	float louvre;    // louvre blade coverage
	float spandrel;  // opaque spandrel coverage
	float reveal;    // masonry return of a recessed window (tone factor in revealTone)
	float revealTone;
	vec2 room;       // room id (x, storey)
	vec2 local;      // position inside the room cell (x from cell start, y above floor)
	vec2 cell;       // room cell size (w, h)
	float lit;       // room lit 0/1
	float kind;      // interior kind
};

// Recessed window: trace from the facade plane to the glass plane \`depth\` behind it.
// fc.local = position in the opening (outer rect [0, size]); updates glass/frame/reveal at the glass plane.
void fcRecess( inout FcCell fc, vec2 size, float frame, float depth, vec3 d, vec2 fw, float openCov ) {
	vec2 q = fc.local + d.xy * ( depth / max( d.z, 0.05 ) );
	float outer = fcBox( q.x, fw.x, 0.0, size.x ) * fcBox( q.y, fw.y, 0.0, size.y );
	float inner = fcBox( q.x, fw.x, frame, size.x - frame ) * fcBox( q.y, fw.y, frame, size.y - frame );
	fc.glass = openCov * inner;
	fc.frame = openCov * max( outer - inner, 0.0 );
	fc.reveal = openCov * ( 1.0 - outer );
	// Head in shade, jambs half lit, sill catches the sky.
	fc.revealTone = q.y < 0.0 ? 0.85 : ( q.y > size.y ? 0.4 : 0.62 );
	fc.local = q;
}
`;

/** The facade fragment: pattern → cell, then interior + glass (inserted after map/roughness/normal/emissive). */
const FACADE_FRAGMENT_PATTERN = /* glsl */ `
	FcCell fc;
	fc.glass = 0.0; fc.frame = 0.0; fc.louvre = 0.0; fc.spandrel = 0.0; fc.reveal = 0.0; fc.revealTone = 0.6;
	fc.room = vec2( 0.0 ); fc.local = vec2( 0.0 ); fc.cell = vec2( 1.0 ); fc.lit = 0.0; fc.kind = float( FC_INTERIOR );
	// View direction in facade space: x along the wall (u), y up, z into the building.
	vec3 fcN = normalize( vFcWorldNormal );
	vec3 fcT = normalize( vec3( fcN.z, 0.0, -fcN.x ) );
	vec3 fcV3 = normalize( vFcWorldPos - cameraPosition );
	vec3 fcD = vec3( dot( fcV3, fcT ), fcV3.y, -dot( fcV3, fcN ) );
	float fcU = vFc.x;
	float fcV = vFc.y;
	float fcSeed = vFc.z * 97.0;
	float fcTop = vFc.w;
	vec2 fcFw = max( fwidth( vFc.xy ), vec2( 1e-4 ) );
	float fcGs = uFcGroundStorey;
	bool fcGroundFloor = fcV < fcGs;
	float fcStoreyIdx = fcGroundFloor ? 0.0 : floor( ( fcV - fcGs ) / uFcStorey ) + 1.0;
	float fcFloorV = fcGroundFloor ? 0.0 : fcGs + ( fcStoreyIdx - 1.0 ) * uFcStorey;
	float fcVs = fcV - fcFloorV;
	float fcStoreyH = fcGroundFloor ? fcGs : uFcStorey;
	// Windows must clear the local ground and the top edge.
	float fcAllowed = smoothstep( vFcGround + 0.25, vFcGround + 0.45, fcFloorV + uFcSill )
		* ( 1.0 - smoothstep( fcTop - 0.55, fcTop - 0.35, fcFloorV + uFcSill + uFcWin.y ) );

	#if FC_PATTERN == 1
	{
		// Grid of punched windows.
		float p = uFcBay;
		float a = 0.5 * ( p - uFcWin.x );
		float b = a + uFcWin.x;
		float vOuter = fcPulse( fcV - fcGs, fcFw.y, uFcStorey, uFcSill, uFcSill + uFcWin.y );
		float vInner = fcPulse( fcV - fcGs, fcFw.y, uFcStorey, uFcSill + uFcFrame, uFcSill + uFcWin.y - uFcFrame );
		float uOuter = fcPulse( fcU, fcFw.x, p, a, b );
		float uInner = fcPulse( fcU, fcFw.x, p, a + uFcFrame, b - uFcFrame );
		float outer = uOuter * vOuter;
		float inner = uInner * vInner;
		fc.glass = inner;
		fc.frame = max( outer - inner, 0.0 );
		fc.room = vec2( floor( fcU / p ), fcStoreyIdx );
		fc.local = vec2( fcU - fc.room.x * p - a, fcVs - uFcSill );
		fc.cell = vec2( uFcWin.x, uFcWin.y );
		// Close up: the glass sits 0.14 m behind the wall face (far away the filtered pattern above is right).
		if ( max( fcFw.x, fcFw.y ) < 0.08 ) fcRecess( fc, fc.cell, uFcFrame, 0.14, fcD, fcFw, outer );
	}
	#elif FC_PATTERN == 2
	{
		// Ribbon windows: continuous glass bands, mullions every bay, groups with solid gaps, louvre above.
		float groupP = uFcGroups.z > 0.5 ? uFcGroups.x * uFcBay + uFcGroups.y : 1e6;
		float groupGlass = uFcGroups.z > 0.5 ? fcPulse( fcU, fcFw.x, groupP, 0.0, uFcGroups.x * uFcBay ) : 1.0;
		float band = fcPulse( fcV - fcGs, fcFw.y, uFcStorey, uFcSill, uFcSill + uFcWin.y );
		float bandInner = fcPulse( fcV - fcGs, fcFw.y, uFcStorey, uFcSill + uFcFrame, uFcSill + uFcWin.y - uFcFrame );
		float mull = fcPulse( fcU + 0.5 * uFcMullion, fcFw.x, uFcBay, 0.0, uFcMullion );
		fc.glass = groupGlass * bandInner * ( 1.0 - mull );
		fc.frame = groupGlass * max( band - bandInner * ( 1.0 - mull ), 0.0 );
		if ( uFcLouvre.w > 0.5 ) {
			float l0 = uFcSill + uFcWin.y + uFcLouvre.y;
			fc.louvre = groupGlass * fcPulse( fcV - fcGs, fcFw.y, uFcStorey, l0, l0 + uFcLouvre.x );
		}
		// Rooms: 3.6 m office modules (or one wide bay for parking).
		float rw = FC_INTERIOR == 3 ? uFcBay : 3.6;
		fc.room = vec2( floor( fcU / rw ), fcStoreyIdx );
		fc.local = vec2( fcU - fc.room.x * rw, fcVs - uFcSill );
		fc.cell = vec2( rw, uFcWin.y );
	}
	#elif FC_PATTERN == 3
	{
		// Curtain wall: glazed down to the ground — clear per fragment, not per window.
		fcAllowed = smoothstep( vFcGround + 0.05, vFcGround + 0.2, fcV ) * ( 1.0 - smoothstep( fcTop - 0.3, fcTop - 0.12, fcV ) );
		// Mullions, transoms, spandrel band across each slab.
		float mull = fcPulse( fcU + 0.5 * uFcMullion, fcFw.x, uFcBay, 0.0, uFcMullion );
		float tr = 0.0;
		float tw = uFcMullion * 0.8;
		if ( uFcTransoms.x > 0.0 ) tr = max( tr, fcPulse( fcV - fcGs + 0.5 * tw, fcFw.y, uFcStorey, uFcTransoms.x, uFcTransoms.x + tw ) );
		if ( uFcTransoms.y > 0.0 ) tr = max( tr, fcPulse( fcV - fcGs + 0.5 * tw, fcFw.y, uFcStorey, uFcTransoms.y, uFcTransoms.y + tw ) );
		if ( uFcTransoms.z > 0.0 ) tr = max( tr, fcPulse( fcV - fcGs + 0.5 * tw, fcFw.y, uFcStorey, uFcTransoms.z, uFcTransoms.z + tw ) );
		float sh = uFcSpandrel.x;
		float spand = sh > 0.0 ? fcPulse( fcV - fcGs + 0.5 * sh, fcFw.y, uFcStorey, 0.0, sh ) : 0.0;
		float grid = max( mull, tr );
		fc.frame = grid;
		fc.spandrel = ( 1.0 - grid ) * spand;
		fc.glass = ( 1.0 - grid ) * ( 1.0 - spand );
		float rw = 3.6;
		fc.room = vec2( floor( fcU / rw ), fcStoreyIdx );
		fc.local = vec2( fcU - fc.room.x * rw, fcVs - 0.5 * sh );
		fc.cell = vec2( rw, max( fcStoreyH - sh, 1.0 ) );
	}
	#elif FC_PATTERN == 4
	{
		// Scatter: one window per slot and storey, size by probability, random position.
		float slot = uFcBay;
		float sid = floor( fcU / slot );
		vec3 hsrc = vec3( sid, fcStoreyIdx, fcSeed );
		float present = step( fcHash( hsrc ), uFcScatterA.w );
		float pick = fcHash( hsrc + 13.7 );
		vec2 size = vec2( uFcScatterA.x, uFcScatterA.y );
		if ( pick > uFcScatterA.z ) size = vec2( uFcScatterB.x, uFcScatterB.y );
		if ( pick > uFcScatterA.z + uFcScatterB.z ) size = vec2( uFcScatterC.x, uFcScatterC.y );
		size = min( size, vec2( slot - 0.5, fcStoreyH - 0.6 ) );
		float x0 = 0.25 + fcHash( hsrc + 5.1 ) * max( slot - size.x - 0.5, 0.0 );
		float y0 = uFcSill + ( fcHash( hsrc + 9.3 ) - 0.5 ) * uFcScatterB.w;
		y0 = clamp( y0, 0.3, max( fcStoreyH - size.y - 0.3, 0.3 ) );
		float lx = fcU - sid * slot;
		float outer = fcBox( lx, fcFw.x, x0, x0 + size.x ) * fcBox( fcVs, fcFw.y, y0, y0 + size.y );
		float inner = fcBox( lx, fcFw.x, x0 + uFcFrame, x0 + size.x - uFcFrame ) * fcBox( fcVs, fcFw.y, y0 + uFcFrame, y0 + size.y - uFcFrame );
		// Clear the ground and the (possibly sloped) top edge.
		float ok = smoothstep( vFcGround + 0.2, vFcGround + 0.4, fcFloorV + y0 )
			* ( 1.0 - smoothstep( fcTop - 0.6, fcTop - 0.4, fcFloorV + y0 + size.y ) );
		// Far away: blend to the expected coverage so slot edges never shimmer.
		float expected = uFcScatterA.w * ( uFcScatterA.z * uFcScatterA.x * uFcScatterA.y + uFcScatterB.z * uFcScatterB.x * uFcScatterB.y
			+ uFcScatterC.z * uFcScatterC.x * uFcScatterC.y ) / ( slot * fcStoreyH );
		float far = smoothstep( 0.6, 2.0, max( fcFw.x, fcFw.y ) );
		fc.glass = mix( present * inner * ok, expected * 0.85 * fcAllowed, far );
		fc.frame = mix( present * max( outer - inner, 0.0 ) * ok, expected * 0.15 * fcAllowed, far );
		fc.room = vec2( sid, fcStoreyIdx );
		fc.local = vec2( lx - x0, fcVs - y0 );
		fc.cell = size;
		if ( far < 0.01 && max( fcFw.x, fcFw.y ) < 0.08 ) fcRecess( fc, size, uFcFrame, 0.16, fcD, fcFw, present * outer * ok );
		fcAllowed = 1.0;
	}
	#endif

	// Ground storey.
	if ( fcGroundFloor && uFcGroundKind > 0.5 ) {
		if ( uFcGroundKind < 1.5 ) {
			// Storefront: tall glazing from 0.3 m to 0.6 m under the slab, mullions every 2.4 m.
			float sf0 = vFcGround + 0.3;
			float sf1 = fcGs - 0.65;
			float band = fcBox( fcV, fcFw.y, sf0, sf1 );
			float mull = fcPulse( fcU + 0.04, fcFw.x, 2.4, 0.0, 0.08 );
			fc.glass = band * ( 1.0 - mull );
			fc.frame = band * mull + fcBox( fcV, fcFw.y, sf1, sf1 + 0.08 ) + fcBox( fcV, fcFw.y, sf0 - 0.06, sf0 );
			fc.louvre = 0.0;
			fc.spandrel = 0.0;
			fc.kind = 2.0;
			fc.room = vec2( floor( fcU / 7.2 ), 0.0 );
			fc.local = vec2( fcU - fc.room.x * 7.2, fcV - sf0 );
			fc.cell = vec2( 7.2, sf1 - sf0 );
		} else {
			fc.glass = 0.0; fc.frame = 0.0; fc.louvre = 0.0; fc.spandrel = 0.0;
		}
		fcAllowed = 1.0;
	}
	fc.glass *= fcAllowed;
	fc.frame *= fcAllowed;
	fc.louvre *= fcAllowed;

	// Room lighting decision (hash per room), by the occupancy of its interior kind.
	{
		float occ = fc.kind < 0.5 ? uFcOccupancy.x : fc.kind < 1.5 ? uFcOccupancy.y : fc.kind < 2.5 ? uFcOccupancy.z : uFcOccupancy.w;
		occ = clamp( occ * uFcOccScale, 0.0, 1.0 );
		float h = fcHash( vec3( fc.room, fcSeed + 3.0 ) );
		fc.lit = step( h, occ );
		// Far away the lit pattern averages out instead of sparkling.
		float far = smoothstep( 1.0, 3.5, fcFw.x / max( fc.cell.x, 0.5 ) );
		fc.lit = mix( fc.lit, occ, far );
	}
`;

/** Wall surface: joints, coping, streaks, frames/louvres/spandrels; glass gets dark diffuse. */
const FACADE_FRAGMENT_SURFACE = /* glsl */ `
	float fcWallCov = clamp( 1.0 - fc.glass - fc.frame - fc.louvre - fc.spandrel - fc.reveal, 0.0, 1.0 );
	{
		vec3 wall = diffuseColor.rgb;
		if ( uFcJoints.w > 0.5 ) {
			float jw = uFcJoints.z;
			float j = max( fcPulse( fcU + 0.5 * jw, fcFw.x, uFcJoints.x, 0.0, jw ), fcPulse( fcV + 0.5 * jw, fcFw.y, uFcJoints.y, 0.0, jw ) );
			wall = mix( wall, uFcJointColor, j * 0.85 );
		}
		if ( uFcStreaks > 0.0 && fc.room.y > 0.0 ) {
			// Rain streaks under sills: darker, fading down over ~1.5 m.
			float under = clamp( 1.0 - ( uFcSill - fcVs ) / 1.6, 0.0, 1.0 ) * step( fcVs, uFcSill );
			float across = fcBox( fc.local.x, fcFw.x, 0.1, fc.cell.x - 0.1 );
			float streak = under * across * ( 0.6 + 0.4 * fcHash2( vec2( floor( fcU * 6.0 ), fcSeed ) ) );
			wall *= 1.0 - uFcStreaks * 0.12 * streak;
		}
		if ( uFcCoping.x > 0.0 ) {
			float c = fcBox( fcV, fcFw.y, fcTop - uFcCoping.x, fcTop + 1.0 );
			wall = mix( wall, uFcCoping.yzw, c );
		}
		// Grime at the base of the wall.
		wall *= 1.0 - 0.18 * ( 1.0 - smoothstep( vFcGround, vFcGround + 0.6, fcV ) );
		vec3 frameC = uFcFrameColor;
		diffuseColor.rgb = wall * fcWallCov + frameC * fc.frame + uFcLouvreColor * fc.louvre + uFcSpandrel.yzw * fc.spandrel
			+ uFcGlassColor * 0.08 * fc.glass + wall * fc.revealTone * fc.reveal;
	}
`;

/** Interior mapping + glass; adds the room radiance as emission. */
const FACADE_FRAGMENT_INTERIOR = /* glsl */ `
	if ( fc.glass > 0.001 ) {
		vec3 Nw = fcN;
		vec3 Vw = fcV3;
		vec3 d = fcD;
		d.z = max( d.z, 0.02 );
		float rnd = fcHash( vec3( fc.room, fcSeed + 11.0 ) );
		float rnd2 = fcHash( vec3( fc.room, fcSeed + 23.0 ) );
		bool parking = fc.kind > 2.5;
		bool retail = fc.kind > 1.5 && fc.kind < 2.5;
		bool home = fc.kind > 0.5 && fc.kind < 1.5;
		float W = max( fc.cell.x, 0.6 );
		// Room box: the window sits inside a bigger room (sill below, ceiling above).
		float H = parking ? 2.6 : ( retail ? fc.cell.y + 0.6 : 2.75 );
		float yOff = parking ? 0.3 : ( retail ? 0.0 : uFcSill );
		float D = uFcRoomDepth * ( 0.8 + 0.5 * rnd2 );
		vec3 o = vec3( clamp( fc.local.x, 0.0, W ), clamp( fc.local.y + yOff, 0.0, H ), 0.0 );
		// Widen the room beyond the window so side walls are not right at the frame.
		float xMin = -0.6;
		float xMax = W + 0.6;
		vec3 wallTone = home ? mix( vec3( 0.72, 0.66, 0.58 ), vec3( 0.55, 0.58, 0.62 ), rnd ) : mix( vec3( 0.7 ), vec3( 0.6, 0.62, 0.64 ), rnd );
		// Shops: shelving and displays make the back of the room much darker than an office wall.
		if ( retail ) wallTone *= mix( 0.45, 0.7, rnd2 );
		vec3 floorTone = home ? vec3( 0.42, 0.32, 0.24 ) : ( parking ? vec3( 0.30 ) : mix( vec3( 0.22, 0.24, 0.27 ), vec3( 0.36, 0.33, 0.30 ), rnd2 ) );
		vec3 ceilTone = parking ? vec3( 0.45 ) : vec3( 0.86 );
		vec3 lightCol = fcKelvin( clamp( uFcWarmth + ( rnd - 0.5 ) * 0.35, 0.0, 1.0 ) );
		// Artificial light on the room surfaces (klux): offices ≈ 300 lux, homes ≈ 120, shops ≈ 600.
		float art = parking ? 0.07 : ( retail ? 0.25 : ( home ? 0.12 : 0.3 ) );
		float day = uFcDaylight;
		vec3 radiance;
		#ifdef FC_INTERIOR_MAPPING
		{
			float tx = d.x > 0.0 ? ( xMax - o.x ) / d.x : ( xMin - o.x ) / d.x;
			float ty = d.y > 0.0 ? ( H - o.y ) / d.y : ( 0.0 - o.y ) / d.y;
			float tz = ( D - o.z ) / d.z;
			float t = min( tx, min( ty, tz ) );
			vec3 hp = o + d * t;
			vec3 surf;
			float emissive = 0.0;
			// Share of the artificial light a surface gets: recessed panels light the floor, the desks
			// and the walls towards the ceiling; the ceiling between the panels only gets bounce light.
			float artK = mix( 0.5, 1.2, smoothstep( 0.1, H, hp.y ) );
			if ( t == tz ) {
				surf = wallTone;
				// Skirting + a door / whiteboard on some back walls.
				surf *= 0.85 + 0.15 * smoothstep( 0.08, 0.12, hp.y );
				if ( !parking && rnd2 > 0.55 ) {
					float dx0 = 0.4 + rnd * max( W - 1.4, 0.1 );
					float door = step( dx0, hp.x ) * step( hp.x, dx0 + 0.9 ) * step( hp.y, 2.1 );
					surf = mix( surf, home ? vec3( 0.55, 0.45, 0.36 ) : vec3( 0.55, 0.57, 0.6 ), door );
				}
			} else if ( t == ty ) {
				if ( d.y > 0.0 ) {
					surf = ceilTone;
					artK = parking ? 0.6 : 0.32;
					// Light panels / linear lights.
					vec2 cp = vec2( hp.x, hp.z );
					float panel = parking
						? fcPulse( cp.y, 0.02, 2.5, 0.0, 0.12 ) * fcBox( cp.x, 0.02, xMin + 0.3, xMax - 0.3 )
						: fcPulse( cp.x + 0.3, 0.02, 1.8, 0.0, 0.6 ) * fcPulse( cp.y - 0.6, 0.02, 2.4, 0.0, 1.2 );
					emissive = panel * ( home ? 0.0 : 1.0 );
				} else {
					surf = floorTone;
					artK = 0.9;
				}
			} else {
				surf = wallTone * 0.92;
			}
			// Furniture: desks at 0.74 m with dark monitors (offices), a sofa block (homes).
			if ( !parking && !retail ) {
				float deskZ0 = 0.9;
				float deskZ1 = 1.7;
				if ( d.y < 0.0 ) {
					float td = ( 0.74 - o.y ) / d.y;
					vec3 dp = o + d * td;
					if ( td > 0.0 && td < t && dp.z > deskZ0 && dp.z < deskZ1 && fcHash( vec3( floor( dp.x / 1.6 ), fc.room ) ) > ( home ? 0.75 : 0.3 ) ) {
						surf = home ? vec3( 0.5, 0.38, 0.28 ) : vec3( 0.82, 0.82, 0.8 );
						t = td;
						emissive = 0.0;
						artK = 1.1;
					}
				}
				float tf = ( deskZ0 - o.z ) / d.z;
				vec3 fp = o + d * tf;
				if ( tf > 0.0 && tf < t && fp.y < 0.74 && fp.y > 0.05 && fcHash( vec3( floor( fp.x / 1.6 ), fc.room ) ) > ( home ? 0.75 : 0.3 ) ) {
					surf = home ? vec3( 0.3, 0.25, 0.22 ) : vec3( 0.32, 0.33, 0.35 );
					t = tf;
					emissive = 0.0;
				}
				if ( !home ) {
					float tm = ( 1.35 - o.z ) / d.z;
					vec3 mp = o + d * tm;
					float mx = fract( mp.x / 1.6 );
					if ( tm > 0.0 && tm < t && mp.y > 0.86 && mp.y < 1.22 && mx > 0.25 && mx < 0.7
						&& fcHash( vec3( floor( mp.x / 1.6 ), fc.room ) ) > 0.3 ) {
						surf = vec3( 0.05, 0.055, 0.06 );
						t = tm;
						emissive = 0.06 * fc.lit;
					}
				}
			}
			// Daylight falls off into the room; artificial light is even. Corners darker.
			vec3 edge = min( hp - vec3( xMin, 0.0, 0.0 ), vec3( xMax, H, D ) - hp );
			float ao = 0.72 + 0.28 * smoothstep( 0.0, 0.7, min( edge.x, min( edge.y, edge.z ) ) );
			float dayFall = mix( 1.0, 0.3, clamp( hp.z / D, 0.0, 1.0 ) );
			vec3 E = vec3( day * dayFall ) + lightCol * art * artK * fc.lit;
			// Panel luminance ≈ 700 cd/m² (diffused LED panels / linear lights).
			radiance = surf * E * ao / 3.14159 + lightCol * emissive * fc.lit * ( parking ? 0.3 : 0.7 );
			// Far away the parallax detail averages out (no sparkle).
			float far = smoothstep( 0.18, 0.6, max( fcFw.x, fcFw.y ) );
			// Ceiling lights seen at a glance from afar: a small share of the panel luminance.
			float panels = parking ? 0.006 : ( retail ? 0.02 : ( home ? 0.0 : 0.012 ) );
			vec3 avg = mix( wallTone, floorTone, 0.4 ) * ( vec3( day * 0.6 ) + lightCol * art * fc.lit ) * 0.8 / 3.14159
				+ lightCol * fc.lit * panels;
			radiance = mix( radiance, avg, far );
		}
		#else
		{
			// Flat interior (low tier): brighter near the ceiling when lit.
			float g = clamp( fc.local.y / max( fc.cell.y, 0.5 ), 0.0, 1.0 );
			radiance = mix( wallTone, floorTone, 0.4 ) * ( vec3( day * 0.6 ) + lightCol * art * fc.lit * ( 0.8 + 0.4 * g ) ) * 0.8 / 3.14159;
		}
		#endif
		// Blinds: a slatted plane just behind the glass, glowing softly when the room is lit.
		if ( uFcBlinds > 0.0 && !parking ) {
			float bh = fcHash( vec3( fc.room, fcSeed + 41.0 ) );
			if ( bh < uFcBlinds ) {
				float drop = 0.25 + 0.7 * fcHash( vec3( fc.room, fcSeed + 43.0 ) );
				float yb = fc.local.y + d.y * ( 0.06 / d.z );
				float covered = step( fc.cell.y * ( 1.0 - drop ), yb );
				float slats = 0.85 + 0.15 * fcPulse( yb, fcFw.y, 0.05, 0.0, 0.035 );
				vec3 blind = ( home ? vec3( 0.86, 0.8, 0.7 ) : vec3( 0.82, 0.83, 0.84 ) ) * slats;
				vec3 bl = blind * ( vec3( day * 0.9 ) + lightCol * art * fc.lit * 0.9 ) / 3.14159;
				radiance = mix( radiance, bl, covered );
			}
		}
		// Glass: tinted transmission, less at grazing angles (Fresnel).
		float cosT = clamp( dot( -Vw, Nw ), 0.0, 1.0 );
		float F = 0.05 + 0.95 * pow( 1.0 - cosT, 5.0 );
		vec3 tint = mix( vec3( 1.0 ), normalize( uFcGlassColor + 0.05 ) * 1.7, 0.35 );
		totalEmissiveRadiance += radiance * tint * uFcTrans * ( 1.0 - F ) * fc.glass;
	}
`;

/** Per-pane flatness variation: tiny normal tilts break reflections up like real glazing. */
const FACADE_FRAGMENT_NORMAL = /* glsl */ `
	if ( fc.glass > 0.001 ) {
		vec3 Nw = normalize( vFcWorldNormal );
		vec3 Tw = normalize( vec3( Nw.z, 0.0, -Nw.x ) );
		vec2 pane = vec2( floor( vFc.x / max( uFcBay, 0.6 ) ), floor( ( vFc.y - uFcGroundStorey ) / max( uFcStorey * 0.5, 0.5 ) ) );
		vec2 tilt = vec2( fcHash( vec3( pane, 3.1 ) ), fcHash( vec3( pane, 5.7 ) ) ) - 0.5;
		vec3 tiltW = Tw * tilt.x * 0.016 + vec3( 0.0, 1.0, 0.0 ) * tilt.y * 0.012;
		vec3 tiltV = ( viewMatrix * vec4( tiltW, 0.0 ) ).xyz;
		normal = normalize( mix( normal, normalize( normal + tiltV ), fc.glass ) );
	}
`;

/** Glass is a smooth dielectric with a coated-glass F0; frames/louvres are satin. */
const FACADE_FRAGMENT_SPECULAR = /* glsl */ `
	{
		float g = fc.glass;
		material.roughness = mix( material.roughness, 0.055, g );
		material.roughness = mix( material.roughness, 0.42, clamp( fc.frame + fc.louvre, 0.0, 1.0 ) * ( 1.0 - g ) );
		material.roughness = mix( material.roughness, 0.08, fc.spandrel );
		// Coated double glazing reflects more than bare glass.
		vec3 F0 = vec3( 0.085 );
		material.specularColor = mix( material.specularColor, F0, max( g, fc.spandrel ) );
		material.specularColorBlended = mix( material.specularColorBlended, F0, max( g, fc.spandrel ) );
		material.diffuseContribution *= 1.0 - g * 0.97;
	}
`;

function srgb(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

/** Wall textures, calibrated albedo and map adjustments for a style's wall material. */
function wallInfo(lib: MaterialLibrary, style: FacadeStyle) {
  const base = lib.get(style.wall);
  const patch = base.userData.twPatch as { spec?: { saturation?: number; macro?: { amp: number; scale: number } } } | undefined;
  const saturation = patch?.spec?.saturation ?? 1;
  const macro = patch?.spec?.macro ?? null;
  let color = base.color.clone();
  if (style.wallColor) {
    color = lib instanceof TwinMaterialLibrary ? lib.calibrate(style.wall, style.wallColor) : srgb(style.wallColor);
  }
  return { base, color, saturation, macro };
}

/**
 * A facade material for a style. Shares the wall textures with the library;
 * owned by the caller (disposeDeep disposes it, not the textures).
 */
export function makeFacadeMaterial(lib: MaterialLibrary, style: FacadeStyle, opts: { tier?: Tier } = {}): THREE.MeshStandardMaterial {
  const tier: Tier = opts.tier ?? (lib instanceof TwinMaterialLibrary ? lib.tier : "high");
  const { base, color, saturation, macro } = wallInfo(lib, style);
  const m = new THREE.MeshStandardMaterial({
    color,
    map: base.map,
    normalMap: base.normalMap,
    normalScale: base.normalScale.clone(),
    roughnessMap: base.roughnessMap,
    roughness: style.wallRoughness ?? base.roughness,
    aoMap: base.aoMap,
    aoMapIntensity: base.aoMapIntensity,
    metalness: 0,
  });
  m.name = `facade:${style.pattern}:${style.wall}`;
  const s = style;
  const sc = s.scatter?.sizes ?? [
    [1.2, 1.2, 1],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const tr = s.transoms ?? [];
  const uniforms: Record<string, THREE.IUniform> = {
    uFcStorey: { value: s.storey },
    uFcGroundStorey: { value: s.groundStorey ?? s.storey },
    uFcBay: { value: s.bay },
    uFcWin: { value: new THREE.Vector2(s.window[0], s.window[1]) },
    uFcSill: { value: s.sill },
    uFcFrame: { value: s.frame },
    uFcFrameColor: { value: srgb(s.frameColor) },
    uFcGlassColor: { value: srgb(s.glassColor) },
    uFcTrans: { value: s.glassTransmittance },
    uFcMullion: { value: s.mullion ?? 0.06 },
    uFcTransoms: { value: new THREE.Vector3(tr[0] ?? 0, tr[1] ?? 0, tr[2] ?? 0) },
    uFcSpandrel: { value: spandrelVec(s) },
    uFcLouvre: { value: new THREE.Vector4(s.louvre?.height ?? 0, s.louvre?.gap ?? 0, 0, s.louvre ? 1 : 0) },
    uFcLouvreColor: { value: srgb(s.louvre?.color ?? "#1e1e22") },
    uFcGroups: { value: new THREE.Vector3(s.ribbonGroups?.units ?? 0, s.ribbonGroups?.gap ?? 0, s.ribbonGroups ? 1 : 0) },
    uFcJoints: {
      value: new THREE.Vector4(s.panelJoints?.w ?? 1, s.panelJoints?.h ?? 1, s.panelJoints?.width ?? 0, s.panelJoints ? 1 : 0),
    },
    uFcJointColor: { value: srgb(s.panelJoints?.color ?? "#000000") },
    uFcScatterA: { value: new THREE.Vector4(sc[0][0], sc[0][1], sc[0][2], s.scatter?.occupancy ?? 0.9) },
    uFcScatterB: { value: new THREE.Vector4(sc[1]?.[0] ?? 0, sc[1]?.[1] ?? 0, sc[1]?.[2] ?? 0, s.scatter?.jitter ?? 0) },
    uFcScatterC: { value: new THREE.Vector4(sc[2]?.[0] ?? 0, sc[2]?.[1] ?? 0, sc[2]?.[2] ?? 0, 0) },
    uFcCoping: { value: copingVec(s) },
    uFcGroundKind: { value: s.groundFloor?.kind === "storefront" ? 1 : s.groundFloor?.kind === "solid" ? 2 : 0 },
    uFcRoomDepth: { value: s.roomDepth },
    uFcOccScale: { value: s.occupancy ?? 1 },
    uFcWarmth: { value: s.warmth },
    uFcBlinds: { value: s.blinds },
    uFcStreaks: { value: s.streaks ?? 0 },
    uFcSaturation: { value: saturation },
    uFcMacroAmp: { value: macro?.amp ?? 0 },
    uFcMacroScale: { value: macro?.scale ?? 10 },
  };
  const interiorMapping = tier !== "low";
  const defines = {
    FC_PATTERN: PATTERN_ID[s.pattern],
    FC_INTERIOR: INTERIOR_ID[s.interior],
  };
  m.userData.facade = { style, uniforms };
  m.customProgramCacheKey = () => `facade-${defines.FC_PATTERN}-${defines.FC_INTERIOR}-${interiorMapping ? 1 : 0}`;
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, FACADE_GLOBALS);
    shader.defines = { ...(shader.defines ?? {}), ...defines };
    if (interiorMapping) shader.defines.FC_INTERIOR_MAPPING = "";
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${FACADE_VERTEX_PARS}`)
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>\n${FACADE_VERTEX_MAIN}`);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>\n${FACADE_FRAGMENT_PARS}\nuniform float uFcSaturation;\nuniform float uFcMacroAmp;\nuniform float uFcMacroScale;`,
      )
      .replace(
        "#include <map_fragment>",
        `${FACADE_FRAGMENT_PATTERN}
	#ifdef USE_MAP
		vec4 sampledDiffuseColor = texture2D( map, vMapUv );
		float fcLuma = dot( sampledDiffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
		sampledDiffuseColor.rgb = mix( vec3( fcLuma ), sampledDiffuseColor.rgb, uFcSaturation );
		diffuseColor *= sampledDiffuseColor;
	#endif
	if ( uFcMacroAmp > 0.0 ) {
		vec2 mp = vFcWorldPos.xz / uFcMacroScale + vFcWorldPos.y / ( uFcMacroScale * 1.7 );
		float n = fcHash2( floor( mp ) ) * 0.5 + fcHash2( floor( mp * 2.03 ) ) * 0.3 + fcHash2( floor( mp * 4.1 ) ) * 0.2;
		diffuseColor.rgb *= 1.0 + uFcMacroAmp * ( n - 0.5 ) * 1.2;
	}
${FACADE_FRAGMENT_SURFACE}`,
      )
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n${FACADE_FRAGMENT_NORMAL}`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n${FACADE_FRAGMENT_INTERIOR}`)
      .replace("#include <lights_physical_fragment>", `#include <lights_physical_fragment>\n${FACADE_FRAGMENT_SPECULAR}`);
  };
  return m;
}

function spandrelVec(s: FacadeStyle): THREE.Vector4 {
  const c = srgb(s.spandrel?.color ?? "#1a2027");
  return new THREE.Vector4(s.spandrel?.height ?? 0, c.r, c.g, c.b);
}

function copingVec(s: FacadeStyle): THREE.Vector4 {
  const c = srgb(s.coping?.color ?? "#999999");
  return new THREE.Vector4(s.coping?.height ?? 0, c.r, c.g, c.b);
}

/** A style from a preset with overrides. */
export function facadeStyle(preset: FacadePresetName, overrides: Partial<FacadeStyle> = {}): FacadeStyle {
  return { ...(FACADE_PRESETS[preset] as FacadeStyle), ...overrides };
}

/** Light colour used for lit windows (for modules that add their own glow). */
export function windowLightColor(warmth: number, target = new THREE.Color()): THREE.Color {
  return kelvinToLinear(4000 - 1300 * warmth, target);
}

/** Stable per-building seed for facade randomness. */
export const facadeSeed = (id: string) => hashString(id) % 9973;
