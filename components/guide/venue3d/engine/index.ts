import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { Scene3DId } from "@/lib/hackathon-2026";
import type { BuiltScene, Quality } from "./types";
import { disposeDeep, type CameraView } from "./util";

/**
 * Venue 3D engine. Loaded only when someone opens the 3D preview.
 * Renders on demand (idle = no frames), pauses off-screen, honours reduced
 * motion, and disposes everything on unmount.
 */

const BUILDERS: Record<Scene3DId, (q: Quality) => Promise<BuiltScene>> = {
  showroom: async (q) => (await import("./scenes/showroom")).buildShowroomScene(q),
  "joki-tower": async (q) => (await import("./scenes/jokiTower")).buildJokiTowerScene(q),
  biocity: async (q) => (await import("./scenes/biocity")).buildBioCityScene(q),
};

export interface EngineOptions {
  quality: Quality;
  reducedMotion: boolean;
  onSelect?: (id: string | null) => void;
  onLabelsChange?: (visible: boolean) => void;
  onContextLost?: () => void;
  /** Keep the drawing buffer (screenshots / posters). */
  preserveDrawingBuffer?: boolean;
}

export interface VenueEngine {
  load(id: Scene3DId): Promise<void>;
  view(id: string, animate?: boolean): boolean;
  focus(id: string, animate?: boolean): boolean;
  zoom(factor: number): void;
  setAutoRotate(on: boolean): void;
  setLabels(on: boolean): void;
  resize(): void;
  /** Resolves once the current scene's textures are drawn and a frame rendered. */
  whenReady(): Promise<void>;
  dispose(): void;
}

export function isWebGL2Available(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createVenueEngine(container: HTMLElement, opts: EngineOptions): VenueEngine {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
  });
  const maxDpr = opts.quality === "high" ? 2 : 1.5;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "none";
  container.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  Object.assign(labelRenderer.domElement.style, {
    position: "absolute",
    inset: "0",
    pointerEvents: "none",
    overflow: "hidden",
  });
  container.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.7;
  controls.screenSpacePanning = true;
  controls.autoRotateSpeed = 0.6;
  controls.listenToKeyEvents(container);

  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  if (opts.quality === "high") {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, target);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.5, 0.6);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  let current: BuiltScene | null = null;
  let loadToken = 0;
  let dirty = true;
  let inView = true;
  let disposed = false;
  let labelsOn = true;
  let tween: {
    fromP: THREE.Vector3;
    toP: THREE.Vector3;
    fromT: THREE.Vector3;
    toT: THREE.Vector3;
    fromFov: number;
    toFov: number;
    t: number;
    dur: number;
  } | null = null;
  let readyResolve: (() => void) | null = null;
  let readyPromise: Promise<void> = new Promise((r) => (readyResolve = r));
  let framesSinceReady = -1;
  let lastTime = performance.now();

  function render() {
    if (composer) composer.render();
    else renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  let labelGroup: string | undefined;

  function refreshLabels() {
    // On narrow screens an overview shows only the essentials; the focused
    // views (entrance, hall, floors) show the rest.
    const compact = !labelGroup && container.clientWidth < 640;
    current?.labels.forEach((l) => {
      const group = l.userData.group as string | undefined;
      const kind = l.userData.kind as string;
      if (kind === "floor") {
        l.visible = !labelGroup;
        return;
      }
      if (compact && (kind === "open" || kind === "landmark")) {
        l.visible = false;
        return;
      }
      l.visible = labelsOn && (!labelGroup || !group || group === labelGroup);
    });
    dirty = true;
  }

  function setLabels(on: boolean) {
    labelsOn = on;
    refreshLabels();
    opts.onLabelsChange?.(on);
  }

  let activeView: CameraView | null = null;

  function fovFor(v: CameraView): number {
    if (v.hfov) {
      const aspect = Math.max(camera.aspect, 0.3);
      const vfov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(v.hfov) / 2) / aspect));
      return THREE.MathUtils.clamp(vfov, 30, 92);
    }
    return v.fov ?? camera.fov;
  }

  let userMoved = false;

  /** Final camera pose for a view on the current screen shape. */
  function resolveView(input: CameraView) {
    const portrait = camera.aspect < 1;
    const v: CameraView = portrait && input.portrait ? { ...input, ...input.portrait } : input;
    const target = new THREE.Vector3(...v.target);
    const position = new THREE.Vector3(...v.position);
    if (!portrait || !v.fit) return { position, target, fov: fovFor(v) };
    const vfov = 62;
    const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(vfov) / 2) * Math.max(camera.aspect, 0.3));
    const offset = position.clone().sub(target);
    const distance = Math.max(offset.length(), v.fit / Math.sin(hfov / 2));
    return { position: target.clone().add(offset.setLength(distance)), target, fov: vfov };
  }

  function placeCamera(pose: ReturnType<typeof resolveView>) {
    camera.position.copy(pose.position);
    controls.target.copy(pose.target);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
    controls.update();
    dirty = true;
  }

  function applyView(v: CameraView, animate: boolean) {
    activeView = v;
    userMoved = false;
    labelGroup = v.labelGroup;
    current?.onView?.(v);
    if (v.labels !== undefined) setLabels(v.labels);
    else refreshLabels();
    const pose = resolveView(v);
    if (!animate || opts.reducedMotion) {
      tween = null;
      placeCamera(pose);
      return;
    }
    tween = {
      fromP: camera.position.clone(),
      toP: pose.position,
      fromT: controls.target.clone(),
      toT: pose.target,
      fromFov: camera.fov,
      toFov: pose.fov,
      t: 0,
      dur: 1.1,
    };
  }

  function frame() {
    if (disposed) return;
    requestAnimationFrame(frame);
    const nowTime = performance.now();
    const dt = Math.min((nowTime - lastTime) / 1000, 0.1);
    lastTime = nowTime;
    if (!inView || document.hidden) return;
    let animating = false;
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.dur);
      const k = easeInOutCubic(tween.t);
      camera.position.lerpVectors(tween.fromP, tween.toP, k);
      controls.target.lerpVectors(tween.fromT, tween.toT, k);
      camera.fov = THREE.MathUtils.lerp(tween.fromFov, tween.toFov, k);
      camera.updateProjectionMatrix();
      animating = true;
      if (tween.t >= 1) tween = null;
    }
    if (controls.update()) dirty = true;
    if (current?.tick?.(camera)) dirty = true;
    // After textures land, render a few frames before reporting "ready".
    if (framesSinceReady >= 0 && readyResolve) dirty = true;
    if (dirty || animating || controls.autoRotate) {
      render();
      dirty = false;
      if (framesSinceReady >= 0 && ++framesSinceReady > 2 && readyResolve) {
        readyResolve();
        readyResolve = null;
      }
    }
  }
  requestAnimationFrame(frame);

  function resize() {
    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    labelRenderer.setSize(w, h);
    if (composer) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(w, h);
    }
    // Re-frame the current view for the new screen shape unless the user moved.
    if (activeView && !tween && !userMoved) placeCamera(resolveView(activeView));
    refreshLabels();
    dirty = true;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const io = new IntersectionObserver((entries) => {
    inView = entries.some((e) => e.isIntersecting);
    if (inView) dirty = true;
  });
  io.observe(container);
  const onVisibility = () => {
    if (!document.hidden) dirty = true;
  };
  document.addEventListener("visibilitychange", onVisibility);

  // User input cancels camera flights.
  const cancelTween = () => {
    tween = null;
    userMoved = true;
  };
  controls.addEventListener("start", cancelTween);
  controls.addEventListener("change", () => {
    dirty = true;
  });

  // ── Picking ──────────────────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = { x: 0, y: 0 };
  function pick(clientX: number, clientY: number): string | null {
    if (!current) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(current.pickables, true);
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.pickId) o = o.parent;
      if (o) return o.userData.pickId as string;
    }
    return null;
  }
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    const id = pick(e.clientX, e.clientY);
    if (id && current?.focus[id]) applyView(current.focus[id], true);
    opts.onSelect?.(id);
  };
  let hoverQueued = false;
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || hoverQueued) return;
    hoverQueued = true;
    requestAnimationFrame(() => {
      hoverQueued = false;
      renderer.domElement.style.cursor = pick(e.clientX, e.clientY) ? "pointer" : "grab";
    });
  };
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);
  renderer.domElement.addEventListener("pointermove", onMove);
  const onContextLost = (e: Event) => {
    e.preventDefault();
    opts.onContextLost?.();
  };
  renderer.domElement.addEventListener("webglcontextlost", onContextLost);

  function unload() {
    if (!current) return;
    // CSS2D labels live in the DOM; removing the scene root does not remove them.
    current.labels.forEach((label) => {
      label.element.remove();
      label.removeFromParent();
    });
    scene.remove(current.root);
    disposeDeep(current.root);
    current = null;
  }

  async function load(id: Scene3DId) {
    const token = ++loadToken;
    readyPromise = new Promise((r) => (readyResolve = r));
    framesSinceReady = -1;
    const built = await BUILDERS[id](opts.quality);
    if (disposed || token !== loadToken) {
      disposeDeep(built.root);
      return;
    }
    unload();
    current = built;
    built.labels.forEach((l) => built.root.add(l));
    scene.add(built.root);
    scene.background = new THREE.Color(built.background);
    scene.fog = built.fogDensity ? new THREE.FogExp2(built.background, built.fogDensity) : null;
    renderer.toneMappingExposure = built.exposure ?? 1;
    if (bloom && built.bloom) {
      bloom.strength = built.bloom.strength;
      bloom.radius = built.bloom.radius;
      bloom.threshold = built.bloom.threshold;
    }
    controls.minDistance = built.controls.minDistance;
    controls.maxDistance = built.controls.maxDistance;
    controls.maxPolarAngle = built.controls.maxPolarAngle;
    controls.minPolarAngle = built.controls.minPolarAngle ?? 0;
    applyView(built.views.default, false);
    dirty = true;
    built.ready.then(() => {
      if (token !== loadToken) return;
      dirty = true;
      framesSinceReady = 0;
    });
  }

  function dispose() {
    disposed = true;
    ro.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    renderer.domElement.removeEventListener("pointerdown", onDown);
    renderer.domElement.removeEventListener("pointerup", onUp);
    renderer.domElement.removeEventListener("pointermove", onMove);
    renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
    controls.removeEventListener("start", cancelTween);
    controls.stopListenToKeyEvents();
    controls.dispose();
    unload();
    composer?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    labelRenderer.domElement.remove();
  }

  return {
    load,
    view(id, animate = true) {
      const v = current?.views[id];
      if (!v) return false;
      applyView(v, animate);
      return true;
    },
    focus(id, animate = true) {
      const v = current?.focus[id];
      if (!v) return false;
      applyView(v, animate);
      return true;
    },
    zoom(factor) {
      userMoved = true;
      const offset = camera.position.clone().sub(controls.target);
      const len = THREE.MathUtils.clamp(offset.length() / factor, controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(offset.setLength(len));
      controls.update();
      dirty = true;
    },
    setAutoRotate(on) {
      controls.autoRotate = on && !opts.reducedMotion;
      dirty = true;
    },
    setLabels,
    resize,
    whenReady: () => readyPromise,
    dispose,
  };
}
