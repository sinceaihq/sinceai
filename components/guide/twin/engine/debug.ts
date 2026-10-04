import type * as THREE from "three";
import type { V3 } from "./types";

/**
 * window.__twin — the QA/debug surface used by the screenshot scripts and
 * the other module authors (DESIGN §9). Installed when the page runs with
 * ?twin=debug or outside production builds.
 */

export interface TwinStats {
  fps: number;
  frameMs: number;
  drawCalls: number;
  totalCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
  programs: number;
  tier: string;
  tierReason: string;
  modules: string[];
  pixelRatio: number;
  exposure: number;
  time: string;
  sun: { elevation: number; azimuth: number };
  mode: string;
  /** What asked for the last rendered frame ("flight", "orbit", "walk", "tour", "exposure", "camera", "dirty", module ids…). */
  busy?: string[];
  /** Frames the engine has rendered so far (idle = it stops counting). */
  frames?: number;
}

export interface TwinDebugApi {
  /** Resolves when everything is built, textures are in and frames were rendered. */
  ready(): Promise<void>;
  stats(): TwinStats;
  goto(view: string): boolean;
  focus(id: string): boolean;
  /** ISO local time or "HH:MM" (Friday 6 Nov 2026). */
  setTime(time: string): void;
  setLabels(on: boolean): void;
  /** Render a subset of modules (builds missing ones); [] or null = all. */
  only(ids: string[] | null): Promise<string[]>;
  errors(): { module: string; message: string }[];
  camera(): { position: V3; target: V3; fov: number };
  setCamera(position: V3, target: V3, fov?: number): void;
  /** lib TARGETS_3D ids that no loaded module provides. */
  missingTargets(): string[];
  seekTour(t: number): void;
  /** Walk mode on (from a target id or view key) or off — as the UI's walk button does. */
  walk(on: boolean, start?: string): void;
  /** Start a route (lib TOURS_3D id) or stop it (null); false when it cannot play. */
  tour(id: string | null, mode?: "chase" | "first"): boolean;
  /** The running route's captions (at = progress 0…1) and levels, for QA. */
  tourPath(): { id: string; captions: { at: number; text: string }[]; levels: string[] | null } | null;
  views(): string[];
  targets(): string[];
  modules(): string[];
  /** Force a frame (e.g. after changing a uniform by hand). */
  invalidate(): void;
  /** Switch post passes / scale exposure for diagnosis (null resets). */
  post(opts: { bloom?: boolean; gtao?: boolean; smaa?: boolean; exposureScale?: number } | null): void;
  /** Sky look preset: "default" (broken overcast, low sun break), "clear", "overcast". */
  setLook(look: "default" | "clear" | "overcast"): void;
  /** Render continuously for `seconds` (slow orbit) and report frame times. */
  bench(seconds?: number): Promise<{ fps: number; frameMs: number; p95Ms: number; frames: number }>;
  /** A loaded module's scene graph (by its id: "ground", "biocity", "routes"…), for QA scripts; null when not loaded. */
  root?(moduleId: string): THREE.Group | null;
  /** Pause or resume the running route (reduced motion: "resume" steps to the next still). */
  pauseTour?(on: boolean): void;
  /** Zoom by a factor (> 1 = closer), as the +/− buttons do. */
  zoom?(factor: number): void;
  /** What a click at a client point picks (null = nothing, or hidden behind a wall), and how long it took. */
  pick?(x: number, y: number): { id: string | null; ms: number };
  /** Where a double-click at a client point would fly to. */
  groundPoint?(x: number, y: number): V3 | null;
  /**
   * Walk a route leg (routes.json) with the real walk world, steering along it: how closely the floor
   * follows the route's heights, how far it got, and where it got stuck.
   */
  walkRoute?(legId: string): WalkRouteReport | null;
  /** Fly every ordered pair of views and targets as the engine would: flights that pass inside a closed building. */
  flightAudit?(): FlightAuditReport;
}

export interface WalkRouteReport {
  leg: string;
  length: number;
  /** Fraction of the route walked before the end or getting stuck. */
  reached: number;
  /** Largest |floor − route height| (m), where it happened, and the mean. */
  maxFloorError: number;
  worstAt: V3 | null;
  meanFloorError: number;
  stuckAt: [number, number] | null;
  levels: string[];
}

export interface FlightAuditReport {
  flights: number;
  /** Flights with any sample inside a closed building (endpoint buildings excluded). */
  through: number;
  /** The same with the plain arc the engine used before (for comparison). */
  throughPlainArc: number;
  cuts: number;
  cranes: number;
  worst: { from: string; to: string; frames: number }[];
}

declare global {
  interface Window {
    __twin?: TwinDebugApi | Record<string, unknown>;
  }
}

export function debugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const param = new URLSearchParams(window.location.search).get("twin");
  return param === "debug" || process.env.NODE_ENV !== "production";
}

/** "15:30" → "2026-11-06T15:30"; ISO strings pass through. */
export function normaliseTime(time: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(time)) return time.slice(0, 16);
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (m) return `2026-11-06T${m[1].padStart(2, "0")}:${m[2]}`;
  return time;
}

/** Install the API; returns an uninstaller that only removes our own object. */
export function installDebug(api: TwinDebugApi): () => void {
  if (!debugEnabled()) return () => undefined;
  window.__twin = api;
  return () => {
    if (window.__twin === api) delete window.__twin;
  };
}
