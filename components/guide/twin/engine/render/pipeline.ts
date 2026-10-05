import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "three/addons/postprocessing/SMAAPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import type { TierSettings } from "./quality";

/**
 * Renderer + post-processing (DESIGN §4):
 *   RenderPass (HDR, half float, depth texture) → GTAO from that depth (ultra/high) →
 *   Unreal bloom with an exposure-relative threshold (only emissives and the sun bloom) →
 *   OutputPass (AgX tone mapping, sRGB) → SMAA (ultra/high; on display values
 *   where its edge detection works) — MSAA on the HDR target on low.
 * The bloom high pass and GTAO's colour copy drop NaN/Inf from the HDR image (FINITE_GLSL): one
 * bad pixel from a module shader must never black out the frame through the bloom blur.
 *
 * For module authors — ambient occlusion needs no flags: GTAO works from the main pass's depth
 * buffer, so it sees exactly what is drawn (vertex-shader animation, alpha-tested cut-outs and
 * instancing included). Surfaces with depthWrite: false (glass, glows, light pools) get no AO and
 * cast none. There is no override-material pass, so userData.noAO-style opt-outs are unnecessary.
 */

/** Display-referred luminance above which things bloom (after exposure). */
const BLOOM_THRESHOLD = 3.0;
/**
 * …but never below this scene luminance (1 = 1000 cd/m², sky/sky.ts LUMINANCE): at night the
 * exposure is ≈ 20× the daytime one, and lit windows and shopfronts (0.12–0.25) would bloom as a
 * veil over the whole facade. Real light sources — LED walls (0.6), signs, bollards, lamp heads,
 * ceiling panels — still glow.
 */
const BLOOM_MIN_LUMINANCE = 0.4;
/**
 * Most a pixel feeds into the bloom above the threshold (display-referred; with the tiers' tight bloom
 * radius a lamp head at night glows to about 1.5× its size, not a halo across the street). Without a cap an
 * LED panel at 70× white, or a whole facade of lit windows at night (when the exposure is ≈ 20×
 * the daytime one), floods the frame with a milky veil instead of a few soft glows.
 */
const BLOOM_CAP = 2.5;

/**
 * Photographic look after AgX (OutputPass): AgX's base curve keeps four stops under mid-grey at
 * ≈ sRGB 18 and holds colour back — the "milky", low-contrast CG daylight. An S-curve about mid-grey
 * in display space (fixed ends, slope `twContrast` at the pivot) gives deeper blacks and crisper
 * light without clipping more, and a little colour comes back (`twSaturation`, on luminance).
 * Operates on AgX's own display encoding (γ 2.2), returns linear like AgXToneMapping.
 */
export const LOOK_GLSL = /* glsl */ `
uniform float twContrast;
uniform float twSaturation;
vec3 twLook( vec3 linearColor ) {
	vec3 d = pow( max( linearColor, vec3( 0.0 ) ), vec3( 1.0 / 2.2 ) );
	const float pivot = 0.5;
	vec3 lo = pivot * pow( d / pivot, vec3( twContrast ) );
	vec3 hi = 1.0 - ( 1.0 - pivot ) * pow( max( ( 1.0 - d ) / ( 1.0 - pivot ), vec3( 0.0 ) ), vec3( twContrast ) );
	d = mix( lo, hi, step( pivot, d ) );
	float l = dot( d, vec3( 0.2126, 0.7152, 0.0722 ) );
	d = clamp( mix( vec3( l ), d, twSaturation ), 0.0, 1.0 );
	return pow( d, vec3( 2.2 ) );
}
`;

/** Contrast (slope at mid-grey) and saturation of the look. */
export const LOOK = { contrast: 1.25, saturation: 1.12 } as const;

/** The OutputPass fragment shader with the look after AgX; null when the shader no longer matches. */
export function withLook(fragmentShader: string): string | null {
  const call = "gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );";
  const pars = "#include <tonemapping_pars_fragment>";
  if (!fragmentShader.includes(call) || !fragmentShader.includes(pars)) return null;
  return fragmentShader.replace(pars, `${pars}\n${LOOK_GLSL}`).replace(call, "gl_FragColor.rgb = twLook( AgXToneMapping( gl_FragColor.rgb ) );");
}

/** Pure JS mirror of twLook on one display-encoded channel (tests, tools). */
export function lookCurve(display: number, contrast: number = LOOK.contrast): number {
  const p = 0.5;
  const d = Math.min(1, Math.max(0, display));
  return d < p ? p * Math.pow(d / p, contrast) : 1 - (1 - p) * Math.pow((1 - d) / (1 - p), contrast);
}

/**
 * GLSL ES 3.0: an HDR colour made safe for post-processing. NaN → 0, +∞ → the largest half
 * float (a sun glint on glass stays a bright glint), −∞ and negatives → 0. Bit tests instead of
 * isnan()/isinf(): fast-math shader compilers (Metal, some mobile drivers) may fold those to false.
 * GLSL ES 3.00 only (uint, floatBitsToUint): use it in ShaderMaterials, which three compiles as
 * "#version 300 es" — never in a RawShaderMaterial (GLSL ES 1.00 unless glslVersion is set).
 */
export const FINITE_GLSL = /* glsl */ `
float twFinite( highp float x ) {
	highp uint bits = floatBitsToUint( x );
	highp uint mag = bits & 0x7fffffffu;
	if ( mag > 0x7f800000u ) return 0.0;
	if ( mag == 0x7f800000u ) return bits == mag ? 65504.0 : 0.0;
	return clamp( x, 0.0, 65504.0 );
}
vec3 twFinite( vec3 c ) {
	return vec3( twFinite( c.r ), twFinite( c.g ), twFinite( c.b ) );
}
`;

/**
 * Bloom high pass with a soft knee: only the light above the threshold blooms, at most `bloomCap`.
 * The input is sanitised first — a single NaN would otherwise spread through the five blur mips
 * over the whole frame, and an Inf (a glint above the half-float range) turns into NaN in `feed`.
 */
export const BLOOM_HIGH_PASS = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec3 defaultColor;
uniform float defaultOpacity;
uniform float luminosityThreshold;
uniform float smoothWidth;
uniform float bloomCap;
varying vec2 vUv;
${FINITE_GLSL}
void main() {
	vec3 c = twFinite( texture2D( tDiffuse, vUv ).rgb );
	float v = luminance( c );
	float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );
	float feed = min( max( v - luminosityThreshold, 0.0 ), bloomCap ) / max( v, 1e-6 );
	gl_FragColor = mix( vec4( defaultColor.rgb, defaultOpacity ), vec4( c * feed, 1.0 ), alpha );
}`;

/**
 * Inserts the NaN/Inf guard into a full-screen ShaderMaterial right after it samples `tDiffuse`
 * (`marker` is that line). Returns null when the shader no longer contains the marker.
 */
export function guardSampledColor(fragmentShader: string, marker: string, variable: string): string | null {
  const main = "void main() {";
  if (!fragmentShader.includes(marker) || !fragmentShader.includes(main)) return null;
  return fragmentShader
    .replace(main, `${FINITE_GLSL}\n${main}`)
    .replace(marker, `${marker}\n\t${variable}.rgb = twFinite( ${variable}.rgb );`);
}

/** RenderPass that remembers how many draw calls/triangles the main scene took. */
class CountingRenderPass extends RenderPass {
  calls = 0;
  triangles = 0;
  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean,
  ) {
    const c0 = renderer.info.render.calls;
    const t0 = renderer.info.render.triangles;
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    this.calls = renderer.info.render.calls - c0;
    this.triangles = renderer.info.render.triangles - t0;
  }
}

/**
 * View-space normals reconstructed from depth (the GTAO addon's own best-of-both-sides
 * reconstruction), packed to RGB. Computed once per AO pixel here instead of inside GTAO and
 * its denoiser, which would otherwise rebuild them for every one of their samples.
 */
const DEPTH_NORMAL_FRAGMENT = /* glsl */ `
uniform highp sampler2D tDepth;
uniform mat4 cameraProjectionMatrixInverse;
varying vec2 vUv;
#include <packing>
vec3 viewPosition( const in vec2 uv, const in float depth ) {
	vec4 view = cameraProjectionMatrixInverse * vec4( vec3( uv, depth ) * 2.0 - 1.0, 1.0 );
	return view.xyz / view.w;
}
float depthAt( const in ivec2 p ) {
	return texelFetch( tDepth, p, 0 ).x;
}
void main() {
	vec2 size = vec2( textureSize( tDepth, 0 ) );
	ivec2 p = ivec2( vUv * size );
	float c0 = depthAt( p );
	if ( c0 >= 1.0 ) {
		gl_FragColor = vec4( 0.5, 0.5, 1.0, 1.0 );
		return;
	}
	float l2 = depthAt( p - ivec2( 2, 0 ) );
	float l1 = depthAt( p - ivec2( 1, 0 ) );
	float r1 = depthAt( p + ivec2( 1, 0 ) );
	float r2 = depthAt( p + ivec2( 2, 0 ) );
	float b2 = depthAt( p - ivec2( 0, 2 ) );
	float b1 = depthAt( p - ivec2( 0, 1 ) );
	float t1 = depthAt( p + ivec2( 0, 1 ) );
	float t2 = depthAt( p + ivec2( 0, 2 ) );
	// Extrapolate from each side and take the side that continues the surface (no smearing across edges).
	float dl = abs( ( 2.0 * l1 - l2 ) - c0 );
	float dr = abs( ( 2.0 * r1 - r2 ) - c0 );
	float db = abs( ( 2.0 * b1 - b2 ) - c0 );
	float dt = abs( ( 2.0 * t1 - t2 ) - c0 );
	vec2 uv = ( vec2( p ) + 0.5 ) / size;
	vec3 ce = viewPosition( uv, c0 );
	vec3 dpdx = ( dl < dr ) ? ce - viewPosition( uv - vec2( 1.0 / size.x, 0.0 ), l1 ) : viewPosition( uv + vec2( 1.0 / size.x, 0.0 ), r1 ) - ce;
	vec3 dpdy = ( db < dt ) ? ce - viewPosition( uv - vec2( 0.0, 1.0 / size.y ), b1 ) : viewPosition( uv + vec2( 0.0, 1.0 / size.y ), t1 ) - ce;
	gl_FragColor = vec4( packNormalToRGB( normalize( cross( dpdx, dpdy ) ) ), 1.0 );
}`;

/**
 * GTAO computed from the main pass's depth buffer instead of the addon's own G-buffer pass. That
 * pass re-rendered the whole scene with MeshNormalMaterial, which (a) re-drew every shadow caster
 * into both sun cascades each frame (WebGLRenderer.render always updates shadow maps) and (b) saw
 * a different scene than the camera: alpha-tested cards, glass and glow quads became solid,
 * vertex-animated meshes stood still and the lens flare drew into the normals — dark AO squares
 * and halos. The main depth is exactly what is on screen; normals come from it (one cheap
 * full-screen pass). The composer ping-pongs its targets, so the depth input is re-bound every frame.
 */
class SceneDepthGTAOPass extends GTAOPass {
  private readonly normalTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
  });
  private readonly depthNormalMaterial = new THREE.ShaderMaterial({
    uniforms: { tDepth: { value: null }, cameraProjectionMatrixInverse: { value: new THREE.Matrix4() } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }",
    fragmentShader: DEPTH_NORMAL_FRAGMENT,
    depthTest: false,
    depthWrite: false,
  });
  private readonly normalQuad = new FullScreenQuad(this.depthNormalMaterial);

  constructor(scene: THREE.Scene, camera: THREE.Camera, depth: THREE.DepthTexture) {
    super(scene, camera, 1, 1);
    // Depth + packed normals: no scene re-render (the addon only draws its G-buffer without one).
    this.setGBuffer(depth, this.normalTarget.texture);
  }

  setSize(width: number, height: number) {
    super.setSize(width, height);
    this.normalTarget.setSize(width, height);
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean,
  ) {
    const depth = readBuffer.depthTexture;
    if (depth) {
      this.gtaoMaterial.uniforms.tDepth.value = depth;
      this.pdMaterial.uniforms.tDepth.value = depth;
      const u = this.depthNormalMaterial.uniforms;
      u.tDepth.value = depth;
      (u.cameraProjectionMatrixInverse.value as THREE.Matrix4).copy(this.camera.projectionMatrixInverse);
      renderer.setRenderTarget(this.normalTarget);
      this.normalQuad.render(renderer);
    }
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  }

  dispose() {
    super.dispose();
    this.normalTarget.dispose();
    this.depthNormalMaterial.dispose();
    this.normalQuad.dispose();
  }
}

export interface PipelineStats {
  drawCalls: number;
  triangles: number;
  /** Every call this frame (shadows, post). */
  totalCalls: number;
  textures: number;
  geometries: number;
  programs: number;
  pixelRatio: number;
}

export interface Pipeline {
  readonly renderer: THREE.WebGLRenderer;
  readonly canvas: HTMLCanvasElement;
  settings(): TierSettings;
  /** CSS size of the drawing area (also re-reads the device pixel ratio). */
  setSize(width: number, height: number): void;
  setExposure(exposure: number): void;
  /** World-space AO radius (m) — grows with the view distance. */
  setAoRadius(radius: number): void;
  render(): void;
  /** Apply other tier settings at runtime (downgrade). */
  apply(settings: TierSettings): void;
  stats(): PipelineStats;
  /** Debug: switch passes on/off and scale the exposure (null = back to the tier settings). */
  debugPost(opts: { bloom?: boolean; gtao?: boolean; smaa?: boolean; exposureScale?: number } | null): void;
  /** Frees everything, including the WebGL context (only when the engine is being destroyed). */
  dispose(): void;
}

/** Drawing-buffer pixel ratio for a device ratio and a tier cap. */
export function pixelRatioFor(devicePixelRatio: number, maxDpr: number): number {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(dpr, maxDpr);
}

export function createPipeline(
  container: HTMLElement,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  initial: TierSettings,
  opts: {
    preserveDrawingBuffer?: boolean;
    /** Called after the device pixel ratio changed (window moved to another screen); the pipeline has re-rendered. */
    onPixelRatio?: () => void;
  } = {},
): Pipeline {
  let settings = initial;
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    stencil: false,
    depth: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.info.autoReset = false;
  renderer.setClearColor(0x000000, 1);
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";
  canvas.setAttribute("aria-hidden", "true");
  container.appendChild(canvas);

  let width = 1;
  let height = 1;
  const devicePixelRatio = () => (typeof window !== "undefined" ? window.devicePixelRatio : 1);
  let pixelRatio = pixelRatioFor(devicePixelRatio(), settings.maxDpr);
  renderer.setPixelRatio(pixelRatio);

  // HDR target with a depth texture (GTAO reads it). The composer clones it (with its own depth
  // texture) for the second ping-pong target. With MSAA three resolves depth into the texture —
  // it blits depth on resolve anyway, so the texture costs nothing extra on low.
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: settings.msaa,
    colorSpace: THREE.LinearSRGBColorSpace,
    depthTexture: new THREE.DepthTexture(1, 1),
  });
  const composer = new EffectComposer(renderer, target);
  const renderPass = new CountingRenderPass(scene, camera);
  composer.addPass(renderPass);

  const gtao = new SceneDepthGTAOPass(scene, camera, composer.renderTarget1.depthTexture as THREE.DepthTexture);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.85;
  gtao.updateGtaoMaterial({
    radius: 1.2,
    distanceExponent: 1.6,
    thickness: 2.5,
    scale: 1,
    samples: settings.gtaoSamples,
    distanceFallOff: 1,
    screenSpaceRadius: false,
  });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1.5, rings: 2, samples: 16 });
  // The colour copy under the AO is the first full-screen read of the HDR image: sanitise it there.
  const gtaoCopy = guardSampledColor(gtao.copyMaterial.fragmentShader, "vec4 texel = texture2D( tDiffuse, vUv );", "texel");
  if (gtaoCopy) gtao.copyMaterial.fragmentShader = gtaoCopy;
  gtao.enabled = settings.gtao;
  composer.addPass(gtao);

  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), settings.bloomStrength, settings.bloomRadius, BLOOM_THRESHOLD);
  bloom.enabled = settings.bloom;
  const highPass = bloom.materialHighPassFilter;
  highPass.uniforms.bloomCap = { value: BLOOM_CAP };
  highPass.fragmentShader = BLOOM_HIGH_PASS;
  highPass.needsUpdate = true;
  composer.addPass(bloom);

  // Not guarded: OutputPass is a RawShaderMaterial and compiles as GLSL ES 1.00 (no uint bit tests).
  // It needs no guard either — tone mapping is per pixel, and on ultra/high the GTAO copy has
  // already sanitised the image. It does get the photographic look after AgX (LOOK_GLSL).
  const output = new OutputPass();
  const looked = withLook(output.material.fragmentShader);
  if (looked) {
    output.uniforms.twContrast = { value: LOOK.contrast };
    output.uniforms.twSaturation = { value: LOOK.saturation };
    output.material.fragmentShader = looked;
    output.material.needsUpdate = true;
  }
  composer.addPass(output);

  const smaa = new SMAAPass();
  smaa.enabled = settings.smaa;
  composer.addPass(smaa);

  function resizePasses() {
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    // GTAO at a fraction of the drawing buffer on "high".
    const s = settings.gtaoScale;
    gtao.setSize(Math.max(1, Math.round(width * pixelRatio * s)), Math.max(1, Math.round(height * pixelRatio * s)));
  }

  /** Re-reads the device pixel ratio (zoom, another screen); true when it changed. */
  function syncPixelRatio(): boolean {
    const next = pixelRatioFor(devicePixelRatio(), settings.maxDpr);
    if (next === pixelRatio) return false;
    pixelRatio = next;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    resizePasses();
    return true;
  }

  // Moving the window to a screen with another pixel ratio changes no CSS size (no ResizeObserver
  // callback): watch the resolution media query, re-armed for each new ratio.
  let disposed = false;
  let resolutionQuery: MediaQueryList | null = null;
  const onResolutionChange = () => {
    watchResolution();
    if (disposed || !syncPixelRatio()) return;
    // Resizing the canvas cleared it: draw the current frame again right away.
    renderer.info.reset();
    composer.render();
    opts.onPixelRatio?.();
  };
  function watchResolution() {
    resolutionQuery?.removeEventListener("change", onResolutionChange);
    resolutionQuery = null;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    resolutionQuery = window.matchMedia(`(resolution: ${devicePixelRatio()}dppx)`);
    resolutionQuery.addEventListener("change", onResolutionChange);
  }
  watchResolution();

  let exposureScale = 1;
  let baseExposure = 1;

  return {
    renderer,
    canvas,
    settings: () => settings,
    setSize(w: number, h: number) {
      width = Math.max(1, Math.floor(w));
      height = Math.max(1, Math.floor(h));
      // Browser zoom changes the device pixel ratio together with the CSS size.
      pixelRatio = pixelRatioFor(devicePixelRatio(), settings.maxDpr);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      resizePasses();
    },
    setExposure(exposure: number) {
      baseExposure = exposure;
      const e = exposure * exposureScale;
      renderer.toneMappingExposure = e;
      bloom.threshold = Math.max(BLOOM_THRESHOLD / Math.max(e, 1e-3), BLOOM_MIN_LUMINANCE);
      highPass.uniforms.bloomCap.value = BLOOM_CAP / Math.max(e, 1e-3);
    },
    setAoRadius(radius: number) {
      const u = gtao.gtaoMaterial.uniforms;
      u.radius.value = radius;
      u.thickness.value = Math.max(1, radius * 2);
    },
    render() {
      renderer.info.reset();
      composer.render();
    },
    apply(next: TierSettings) {
      settings = next;
      syncPixelRatio();
      gtao.enabled = settings.gtao;
      bloom.enabled = settings.bloom;
      bloom.strength = settings.bloomStrength;
      bloom.radius = settings.bloomRadius;
      smaa.enabled = settings.smaa;
      if (settings.gtao) gtao.updateGtaoMaterial({ samples: settings.gtaoSamples });
      // A tier without SMAA anti-aliases with MSAA on the HDR targets (re-created on next use).
      for (const rt of [composer.renderTarget1, composer.renderTarget2]) {
        if (rt.samples !== settings.msaa) {
          rt.samples = settings.msaa;
          rt.dispose();
        }
      }
      resizePasses();
    },
    stats() {
      return {
        drawCalls: renderPass.calls,
        triangles: renderPass.triangles,
        totalCalls: renderer.info.render.calls,
        textures: renderer.info.memory.textures,
        geometries: renderer.info.memory.geometries,
        programs: renderer.info.programs?.length ?? 0,
        pixelRatio,
      };
    },
    debugPost(o) {
      if (!o) {
        gtao.enabled = settings.gtao;
        bloom.enabled = settings.bloom;
        smaa.enabled = settings.smaa;
        exposureScale = 1;
      } else {
        if (o.bloom !== undefined) bloom.enabled = o.bloom;
        if (o.gtao !== undefined) gtao.enabled = o.gtao;
        if (o.smaa !== undefined) smaa.enabled = o.smaa;
        if (o.exposureScale !== undefined) exposureScale = o.exposureScale;
      }
      this.setExposure(baseExposure);
    },
    dispose() {
      disposed = true;
      resolutionQuery?.removeEventListener("change", onResolutionChange);
      resolutionQuery = null;
      gtao.dispose();
      bloom.dispose();
      smaa.dispose();
      output.dispose();
      composer.dispose();
      target.dispose();
      const gl = renderer.getContext();
      renderer.dispose();
      // Release the context now rather than at GC: phones tear the engine down on every close and
      // build a new one on every open (browsers cap live contexts and keep their drawing buffers).
      // The engine has removed its context-lost listener by now, so this raises no error UI.
      if (!gl.isContextLost()) renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
