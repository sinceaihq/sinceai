import * as THREE from "three";

/**
 * Smooth sun-shadow filtering for three r186 (replaces its PCF kernel).
 *
 * r186 filters PCF shadows with five Vogel-disk taps rotated per pixel by interleaved gradient
 * noise. That pattern is meant to be resolved by TAA, which this pipeline does not have: sun patches
 * and penumbrae show a fixed screen-door dither. Here instead: Castaño's optimised PCF (2013), a tent
 * filter of 3×3, 5×5 or 7×7 shadow texels from 4, 9 or 16 bilinear hardware-PCF taps with
 * per-pixel weights — smooth, noise free and stable under camera motion. The light's
 * `shadow.radius` picks the kernel: < 1.75 → 3×3 (phones), < 2.25 → 5×5, else 7×7. SunLightShadow
 * insets its cascade tiles by ceil(radius) + 1 texels, which the widest kernel stays inside.
 *
 * Sun cascades also get (1) their normal offset in texels of their own cascade: `shadow.normalBias` ×
 * the cascade's texel size (cascade data .w, written by `trackCascadeTexels`) — one bias in metres sized
 * for the far cascade pushed the sharp near cascade's lookups off thin geometry (fins, mullions,
 * railings), which then shadowed themselves in blotches; and (2) a receiver-plane depth bias per tap
 * (SUN_HELPERS), so a wide kernel on a sloped receiver does not shadow itself.
 */

/** First statement of r186's PCF getShadow body (the built bundle strips the GLSL comments). */
const PCF_MARKER_START = "vec2 texelSize = vec2( 1.0 ) / shadowMapSize;";
const PCF_MARKER_END = ") * 0.2;";

/**
 * Castaño's optimised PCF (tent 3×3 / 5×5 / 7×7 texels) — the body of a getShadow frustum test.
 * `z` is the GLSL expression for the reference depth of the tap at offset (u, v) texels from twBase.
 */
function pcfKernel(z: string): string {
  return /* glsl */ `// Optimised PCF (Castaño 2013): a tent filter from bilinear hardware-PCF taps, no per-pixel noise.
				vec2 twUv = shadowCoord.xy * shadowMapSize;
				vec2 twBase = floor( twUv + 0.5 );
				float twS = twUv.x + 0.5 - twBase.x;
				float twT = twUv.y + 0.5 - twBase.y;
				vec2 twInv = 1.0 / shadowMapSize;
				twBase = ( twBase - 0.5 ) * twInv;
				#define TW_PCF( u, v ) texture( shadowMap, vec3( twBase + vec2( u, v ) * twInv, ${z} ) )
				if ( shadowRadius < 1.75 ) {
					float uw0 = 3.0 - 2.0 * twS;
					float uw1 = 1.0 + 2.0 * twS;
					float u0 = ( 2.0 - twS ) / uw0 - 1.0;
					float u1 = twS / uw1 + 1.0;
					float vw0 = 3.0 - 2.0 * twT;
					float vw1 = 1.0 + 2.0 * twT;
					float v0 = ( 2.0 - twT ) / vw0 - 1.0;
					float v1 = twT / vw1 + 1.0;
					shadow = ( uw0 * vw0 * TW_PCF( u0, v0 ) + uw1 * vw0 * TW_PCF( u1, v0 )
						+ uw0 * vw1 * TW_PCF( u0, v1 ) + uw1 * vw1 * TW_PCF( u1, v1 ) ) * ( 1.0 / 16.0 );
				} else if ( shadowRadius < 2.25 ) {
					float uw0 = 4.0 - 3.0 * twS;
					float uw2 = 1.0 + 3.0 * twS;
					float u0 = ( 3.0 - 2.0 * twS ) / uw0 - 2.0;
					float u1 = ( 3.0 + twS ) / 7.0;
					float u2 = twS / uw2 + 2.0;
					float vw0 = 4.0 - 3.0 * twT;
					float vw2 = 1.0 + 3.0 * twT;
					float v0 = ( 3.0 - 2.0 * twT ) / vw0 - 2.0;
					float v1 = ( 3.0 + twT ) / 7.0;
					float v2 = twT / vw2 + 2.0;
					shadow = ( uw0 * vw0 * TW_PCF( u0, v0 ) + 7.0 * vw0 * TW_PCF( u1, v0 ) + uw2 * vw0 * TW_PCF( u2, v0 )
						+ uw0 * 7.0 * TW_PCF( u0, v1 ) + 49.0 * TW_PCF( u1, v1 ) + uw2 * 7.0 * TW_PCF( u2, v1 )
						+ uw0 * vw2 * TW_PCF( u0, v2 ) + 7.0 * vw2 * TW_PCF( u1, v2 ) + uw2 * vw2 * TW_PCF( u2, v2 ) ) * ( 1.0 / 144.0 );
				} else {
					float uw0 = 5.0 * twS - 6.0;
					float uw1 = 11.0 * twS - 28.0;
					float uw2 = - ( 11.0 * twS + 17.0 );
					float uw3 = - ( 5.0 * twS + 1.0 );
					float u0 = ( 4.0 * twS - 5.0 ) / uw0 - 3.0;
					float u1 = ( 4.0 * twS - 16.0 ) / uw1 - 1.0;
					float u2 = - ( 7.0 * twS + 5.0 ) / uw2 + 1.0;
					float u3 = - twS / uw3 + 3.0;
					float vw0 = 5.0 * twT - 6.0;
					float vw1 = 11.0 * twT - 28.0;
					float vw2 = - ( 11.0 * twT + 17.0 );
					float vw3 = - ( 5.0 * twT + 1.0 );
					float v0 = ( 4.0 * twT - 5.0 ) / vw0 - 3.0;
					float v1 = ( 4.0 * twT - 16.0 ) / vw1 - 1.0;
					float v2 = - ( 7.0 * twT + 5.0 ) / vw2 + 1.0;
					float v3 = - twT / vw3 + 3.0;
					shadow = ( vw0 * ( uw0 * TW_PCF( u0, v0 ) + uw1 * TW_PCF( u1, v0 ) + uw2 * TW_PCF( u2, v0 ) + uw3 * TW_PCF( u3, v0 ) )
						+ vw1 * ( uw0 * TW_PCF( u0, v1 ) + uw1 * TW_PCF( u1, v1 ) + uw2 * TW_PCF( u2, v1 ) + uw3 * TW_PCF( u3, v1 ) )
						+ vw2 * ( uw0 * TW_PCF( u0, v2 ) + uw1 * TW_PCF( u1, v2 ) + uw2 * TW_PCF( u2, v2 ) + uw3 * TW_PCF( u3, v2 ) )
						+ vw3 * ( uw0 * TW_PCF( u0, v3 ) + uw1 * TW_PCF( u1, v3 ) + uw2 * TW_PCF( u2, v3 ) + uw3 * TW_PCF( u3, v3 ) ) ) * ( 1.0 / 2704.0 );
				}
				#undef TW_PCF`;
}

const OPTIMISED_PCF = pcfKernel("shadowCoord.z");

/**
 * Sun cascades: the optimised PCF with a receiver-plane depth bias. Each tap compares against the
 * receiver's plane at that tap (its depth slope from the surface normal and the cascade's orthographic
 * matrix — no screen derivatives, so it is safe inside the cascade loop), plus half a texel of that
 * slope for the bilinear footprint. A wide kernel on a sloped receiver — the far ground under a 12° sun,
 * the sides of thin fins — then no longer shadows itself (acne that the filter averaged into dark
 * blotches and, at the far cascade's edge, into light/dark curtains across the city).
 */
const SUN_HELPERS = /* glsl */ `
		#if defined( SHADOWMAP_TYPE_PCF )
		vec2 twReceiverSlope( mat4 m, vec3 n ) {
			vec3 gu = vec3( m[ 0 ][ 0 ], m[ 1 ][ 0 ], m[ 2 ][ 0 ] );
			vec3 gv = vec3( m[ 0 ][ 1 ], m[ 1 ][ 1 ], m[ 2 ][ 1 ] );
			vec3 gz = vec3( m[ 0 ][ 2 ], m[ 1 ][ 2 ], m[ 2 ][ 2 ] );
			vec3 t1 = normalize( cross( n, abs( n.y ) < 0.99 ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 ) ) );
			vec3 t2 = cross( n, t1 );
			mat2 j = mat2( dot( gu, t1 ), dot( gv, t1 ), dot( gu, t2 ), dot( gv, t2 ) );
			float det = j[ 0 ][ 0 ] * j[ 1 ][ 1 ] - j[ 1 ][ 0 ] * j[ 0 ][ 1 ];
			if ( abs( det ) < 1e-16 ) return vec2( 0.0 );
			vec2 s = transpose( inverse( j ) ) * vec2( dot( gz, t1 ), dot( gz, t2 ) );
			// No steeper than a surface 80° from the light (edge-on receivers would take any bias).
			float lim = 5.67 * length( gz ) / max( length( gu ), 1e-12 );
			float l = length( s );
			return l > lim ? s * ( lim / l ) : s;
		}
		float twSunShadowPCF( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, vec2 twSlope ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float twFoot = 0.5 * dot( abs( twSlope ), 1.0 / shadowMapSize );
				${pcfKernel("( shadowCoord.z + twFoot + dot( twSlope, twBase + vec2( u, v ) * twInv - shadowCoord.xy ) )")}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
		#endif
`;

/** three r186's getSunShadow, with per-cascade normal offsets (texels) and the receiver-plane PCF. */
const SUN_SHADOW = /* glsl */ `float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			vec3 twN = normalize( vSunShadowWorldNormal );
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					mat4 twM = sunShadowMatrix[ cascadeOffset + i ];
					// cascade.w: this cascade's texel size (m) — the normal offset is in its texels.
					float twTexel = cascade.w > 0.0 ? cascade.w : 1.0;
					vec4 twCoord = twM * vec4( vSunShadowWorldPosition.xyz + twN * ( sunLightShadow.shadowNormalBias * twTexel ), 1.0 );
					#if defined( SHADOWMAP_TYPE_PCF )
						float cascadeShadow = twSunShadowPCF( shadowMap, sunLightShadow.shadowMapSize, sunLightShadow.shadowIntensity,
							sunLightShadow.shadowBias, sunLightShadow.shadowRadius, twCoord, twReceiverSlope( twM, twN ) );
					#else
						float cascadeShadow = getShadow( shadowMap, sunLightShadow.shadowMapSize, sunLightShadow.shadowIntensity,
							sunLightShadow.shadowBias, sunLightShadow.shadowRadius, twCoord );
					#endif
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}`;

const SUN_FN_START = "float getSunShadow(";
const SUN_FN_END = "return shadow;";

/** r186 getSunShadow's normal offset (metres) and its use — the fallback per-cascade normal offset. */
const SUN_BIAS_LINE =
  "vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );";
const SUN_MATRIX_USE = "sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition";
const SUN_MATRIX_PER_CASCADE =
  "sunShadowMatrix[ cascadeOffset + i ] * vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * ( sunLightShadow.shadowNormalBias * ( cascade.w > 0.0 ? cascade.w : 1.0 ) ), 1.0 )";

/** The receiver-plane sun PCF (SUN_SHADOW); off = optimised PCF with per-cascade normal offsets only. */
const RECEIVER_PLANE = true;

/** Marker that the chunk has been patched (HMR re-runs module code against the patched string). */
const PATCHED = "/* twin: optimised PCF */";

export interface ShadowChunkPatch {
  source: string;
  /** The PCF kernel was replaced. */
  pcf: boolean;
  /** Sun cascades take their normal bias in texels of their own cascade (cascade data .w). */
  perCascadeBias: boolean;
}

/** Pure: the patched `shadowmap_pars_fragment` chunk (unchanged parts that no longer match are left alone). */
export function patchShadowChunk(source: string, receiverPlane = RECEIVER_PLANE): ShadowChunkPatch {
  if (source.includes(PATCHED)) return { source, pcf: source.includes("TW_PCF"), perCascadeBias: source.includes("cascade.w > 0.0") };
  let out = source;
  let pcf = false;
  const start = out.indexOf(PCF_MARKER_START);
  const end = start >= 0 ? out.indexOf(PCF_MARKER_END, start) : -1;
  if (start >= 0 && end > start) {
    out = out.slice(0, start) + OPTIMISED_PCF + out.slice(end + PCF_MARKER_END.length);
    pcf = true;
  }
  // getSunShadow, from its signature to the closing brace after its `return shadow;`.
  let perCascadeBias = false;
  const s0 = out.indexOf(SUN_FN_START);
  const r = s0 >= 0 ? out.indexOf(SUN_FN_END, s0) : -1;
  const s1 = r >= 0 ? out.indexOf("}", r) : -1;
  if (receiverPlane && pcf && s0 >= 0 && s1 > s0 && out.slice(s0, s1).includes("sunShadowCascade")) {
    out = out.slice(0, s0) + SUN_HELPERS + "\t\t" + SUN_SHADOW + out.slice(s1 + 1);
    perCascadeBias = true;
  } else if (out.includes(SUN_BIAS_LINE) && out.includes(SUN_MATRIX_USE)) {
    out = out.replace(SUN_BIAS_LINE, "").replace(SUN_MATRIX_USE, SUN_MATRIX_PER_CASCADE);
    perCascadeBias = true;
  }
  if (pcf || perCascadeBias) out = `${PATCHED}\n${out}`;
  return { source: out, pcf, perCascadeBias };
}

let installed: ShadowChunkPatch | null = null;

/**
 * Patches three's shared shadow chunk once per page (before any lit material compiles). Returns what
 * was applied, so callers know whether `normalBias` is in cascade texels or in metres.
 */
export function installShadowFilter(): ShadowChunkPatch {
  if (installed) return installed;
  const chunks = THREE.ShaderChunk as unknown as Record<string, string>;
  const patch = patchShadowChunk(chunks.shadowmap_pars_fragment ?? "");
  if (patch.pcf || patch.perCascadeBias) chunks.shadowmap_pars_fragment = patch.source;
  installed = patch;
  return patch;
}

/**
 * Keeps each sun cascade's world texel size (m) in its cascade data .w after every matrix update,
 * for the per-cascade normal bias. Returns false (nothing changed) when SunLightShadow's internals
 * are not as expected.
 */
export function trackCascadeTexels(shadow: THREE.LightShadow): boolean {
  const s = shadow as THREE.LightShadow & {
    _cascadeData?: THREE.Vector4[];
    getViewportCount?: () => number;
    getCamera?: (i: number) => THREE.Camera;
  };
  if (!Array.isArray(s._cascadeData) || typeof s.getCamera !== "function") return false;
  const original = s.updateMatrices.bind(s);
  s.updateMatrices = (light: THREE.Light, viewCamera?: THREE.Camera) => {
    (original as (l: THREE.Light, c?: THREE.Camera) => void)(light, viewCamera);
    const data = s._cascadeData ?? [];
    for (let i = 0; i < data.length; i++) {
      const cam = s.getCamera?.(i) as THREE.OrthographicCamera | undefined;
      if (!cam || !(cam as THREE.OrthographicCamera).isOrthographicCamera) continue;
      data[i].w = Math.max(1e-4, (cam.right - cam.left) / Math.max(1, s.mapSize.x));
    }
  };
  return true;
}

/**
 * One axis of the optimised PCF (pure; mirrors the GLSL for tests): tap offsets in texels from the
 * base texel corner and their weights, for a sub-texel position `s` (0…1) and kernel size 3, 5 or 7.
 */
export function pcfAxis(s: number, size: 3 | 5 | 7): { offsets: number[]; weights: number[]; norm: number } {
  if (size === 3) {
    const w0 = 3 - 2 * s;
    const w1 = 1 + 2 * s;
    return { offsets: [(2 - s) / w0 - 1, s / w1 + 1], weights: [w0, w1], norm: 4 };
  }
  if (size === 5) {
    const w0 = 4 - 3 * s;
    const w2 = 1 + 3 * s;
    return { offsets: [(3 - 2 * s) / w0 - 2, (3 + s) / 7, s / w2 + 2], weights: [w0, 7, w2], norm: 12 };
  }
  const w0 = 5 * s - 6;
  const w1 = 11 * s - 28;
  const w2 = -(11 * s + 17);
  const w3 = -(5 * s + 1);
  return {
    offsets: [(4 * s - 5) / w0 - 3, (4 * s - 16) / w1 - 1, -(7 * s + 5) / w2 + 1, -s / w3 + 3],
    weights: [w0, w1, w2, w3],
    norm: -52,
  };
}
