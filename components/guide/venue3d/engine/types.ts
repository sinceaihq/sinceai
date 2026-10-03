import type * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { CameraView, V3 } from "./util";

export type Quality = "high" | "low";

export interface SceneContext {
  quality: Quality;
}

export interface BuiltScene {
  root: THREE.Group;
  /** Named camera views; `default` is used on load. */
  views: Record<string, CameraView>;
  /** Fly-to targets (companies, stands, areas). */
  focus: Record<string, CameraView>;
  /** Objects that can be clicked; each carries userData.pickId. */
  pickables: THREE.Object3D[];
  labels: CSS2DObject[];
  controls: {
    minDistance: number;
    maxDistance: number;
    maxPolarAngle: number;
    minPolarAngle?: number;
  };
  background: number;
  fogDensity?: number;
  exposure?: number;
  bloom?: { strength: number; radius: number; threshold: number };
  /** Resolves when async textures (logos) are drawn. */
  ready: Promise<unknown>;
  /** Called whenever a named view or focus is applied (e.g. cut away upper floors). */
  onView?: (view: CameraView) => void;
  /** Per-frame hook (e.g. hide the ceiling from above). Return true to keep rendering. */
  tick?: (camera: THREE.PerspectiveCamera) => boolean | void;
}

export type { CameraView, V3 };
