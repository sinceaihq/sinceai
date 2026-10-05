import * as THREE from "three";
import type { MaterialLibrary, MaterialName, TwinContext } from "../../types";
import { FACADE_GLOBALS } from "../../render/facade";
import { LUMINANCE } from "../../sky/sky";

/**
 * EduCity materials. Library materials for the plain surfaces; small shader
 * patches (onBeforeCompile on MeshStandardMaterial) for the things that make
 * the building recognisable and that no texture in the library has:
 *
 * - Kolumba brick: long, low hand-made units (528 × 37 mm, 13 mm joints) in
 *   a wild bond, dark grey-brown mix with light speckled units — drawn from
 *   the metre UV, box-filtered (no moiré at any distance), recessed joints.
 * - Window glass with interior mapping: every square window shows a room
 *   behind it (floor, ceiling lights, desks, monitors, blinds) at the real
 *   storey height, lit per room after dark — the night photograph's glow.
 * - Fritted atrium roof glass, the Bolon triangle floor, birch slats, the
 *   ceiling grid with LED panels and the satin plant-room cladding (uplit at
 *   night).
 *
 * Everything here is owned by the module (disposed with it); library
 * textures stay shared.
 */

type Uniforms = Record<string, THREE.IUniform>;

interface PatchSpec {
  key: string;
  uniforms?: Uniforms;
  vertexPars?: string;
  vertexMain?: string;
  fragmentPars?: string;
  /** Replace a chunk include with code (the chunk itself is dropped unless the code includes it). */
  replace?: Record<string, string>;
  defines?: Record<string, string | number>;
}

/** Install shader patches on a material (unique program per key). */
export function patch<T extends THREE.MeshStandardMaterial>(m: T, spec: PatchSpec): T {
  m.customProgramCacheKey = () => `edu-${spec.key}`;
  m.onBeforeCompile = (shader) => {
    if (spec.uniforms) Object.assign(shader.uniforms, spec.uniforms);
    if (spec.defines) shader.defines = { ...(shader.defines ?? {}), ...spec.defines };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${spec.vertexPars ?? ""}`)
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>\n${spec.vertexMain ?? ""}`);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\n${COMMON}\n${spec.fragmentPars ?? ""}`);
    for (const [chunk, code] of Object.entries(spec.replace ?? {})) {
      shader.fragmentShader = shader.fragmentShader.replace(`#include <${chunk}>`, code);
    }
  };
  m.needsUpdate = true;
  return m;
}

const COMMON = /* glsl */ `
float edHash( vec2 p ) {
	vec3 p3 = fract( vec3( p.xyx ) * 0.1031 );
	p3 += dot( p3, p3.yzx + 33.33 );
	return fract( ( p3.x + p3.y ) * p3.z );
}
float edHash3( vec3 p ) {
	p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) );
	p += dot( p, p.yxz + 33.33 );
	return fract( ( p.x + p.y ) * p.z );
}
float edNoise( vec2 p ) {
	vec2 i = floor( p );
	vec2 f = fract( p );
	vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( edHash( i ), edHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( edHash( i + vec2( 0.0, 1.0 ) ), edHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}
// Integral of a pulse train (1 inside [a, b) of every period p) from 0 to x.
float edPulseInt( float x, float p, float a, float b ) {
	float w = b - a;
	float k = floor( ( x - a ) / p );
	float r = x - a - k * p;
	return k * w + clamp( r, 0.0, w );
}
// Box-filtered pulse train: exact coverage over the footprint fw.
float edPulse( float x, float fw, float p, float a, float b ) {
	fw = max( fw, 1e-5 );
	return ( edPulseInt( x + 0.5 * fw, p, a, b ) - edPulseInt( x - 0.5 * fw, p, a, b ) ) / fw;
}
float edBox( float x, float fw, float a, float b ) {
	fw = max( fw, 1e-5 );
	return clamp( ( min( x + 0.5 * fw, b ) - max( x - 0.5 * fw, a ) ) / fw, 0.0, 1.0 );
}
// Bump mapping from a screen-space height gradient (Mikkelsen) — as three's perturbNormalArb, but
// NaN-safe: derivatives are taken first (uniform control flow) and every normalisation is guarded,
// so an edge-on or degenerate pixel returns the plain normal instead of poisoning bloom.
vec3 edPerturb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir ) {
	vec3 dx = dFdx( surf_pos.xyz );
	vec3 dy = dFdy( surf_pos.xyz );
	vec3 vSigmaX = dx * inversesqrt( max( dot( dx, dx ), 1e-24 ) );
	vec3 vSigmaY = dy * inversesqrt( max( dot( dy, dy ), 1e-24 ) );
	vec3 R1 = cross( vSigmaY, surf_norm );
	vec3 R2 = cross( surf_norm, vSigmaX );
	float fDet = dot( vSigmaX, R1 ) * faceDir;
	vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
	vec3 r = abs( fDet ) * surf_norm - vGrad;
	float l2 = dot( r, r );
	return l2 > 1e-12 ? r * inversesqrt( l2 ) : surf_norm;
}
// A horizontal unit vector to the right of a wall normal (fallback for horizontal normals).
vec3 edRight( vec3 n ) {
	vec3 r = cross( vec3( 0.0, 1.0, 0.0 ), n );
	float l2 = dot( r, r );
	return l2 > 1e-8 ? r * inversesqrt( l2 ) : vec3( 1.0, 0.0, 0.0 );
}
`;

const UV_VARYING = /* glsl */ `varying vec2 vEdUv;`;
const UV_MAIN = /* glsl */ `vEdUv = uv;`;

const lin = (hex: string) => new THREE.Color(hex);

// ── Kolumba brick ───────────────────────────────────────────────────────────

/**
 * Brick palette (sRGB) and shares. Petersen Kolumba as built on EduCity: a
 * grey-taupe mix (photographs: ≈ #656262 in shade, ≈ #9f9794 in low sun; the
 * low November sun adds the warmth, so the albedo stays nearly neutral), mostly
 * mid tones within a narrow range — a calm fine linear grain, light units a
 * shade lighter rather than white planks (close-up p95/p50 ≈ 1.4).
 */
export const BRICK_TONES: [string, number][] = [
  ["#7a736d", 0.22],
  ["#857d77", 0.3],
  ["#8f8780", 0.24],
  ["#9a928b", 0.14],
  ["#a89f98", 0.07],
  ["#b9b0a9", 0.03],
];

/** Mortar: dark grey, recessed (SPEC §3.3.3) — close to the darker units, so joints read as fine lines. */
export const BRICK_MORTAR = "#66615c";

/** Average albedo of the wall (linear): units and the 13 mm joints (26 % of a 50 mm course). */
export function brickAverage(): THREE.Color {
  const avg = new THREE.Color(0, 0, 0);
  for (const [hex, p] of BRICK_TONES) avg.add(lin(hex).multiplyScalar(p));
  const jointShare = 0.013 / 0.05 + (0.013 / 0.541) * (1 - 0.013 / 0.05);
  return avg.multiplyScalar(1 - jointShare).add(lin(BRICK_MORTAR).multiplyScalar(jointShare));
}

/**
 * After dark the brick is not black: the street lights on Joukahaisenkatu, the walkway's wall lamps
 * and the deck lanterns wash its lower storeys (≈15 lux at the foot, fading upwards) and the city's
 * sky glow keeps the rest a dark grey-brown (SPEC §8.3: ≈ #3c3429 under street light). As E/π
 * multipliers of the albedo (klux → scene luminance), warm 3000 K LED light.
 */
export const BRICK_NIGHT = { foot: 0.0048, falloff: 4.0, sky: 0.0006 } as const;

export function makeBrickMaterial(night: { value: number } = { value: 0 }): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  m.name = "educity:kolumba";
  const tones = BRICK_TONES.map(([hex]) => lin(hex));
  let acc = 0;
  const cdf = BRICK_TONES.map(([, p]) => (acc += p));
  // Average unit tone for far distances (linear).
  const avg = new THREE.Color(0, 0, 0);
  BRICK_TONES.forEach(([, p], i) => avg.add(tones[i].clone().multiplyScalar(p)));
  return patch(m, {
    key: "brick",
    uniforms: {
      uBrT0: { value: tones[0] },
      uBrT1: { value: tones[1] },
      uBrT2: { value: tones[2] },
      uBrT3: { value: tones[3] },
      uBrT4: { value: tones[4] },
      uBrT5: { value: tones[5] },
      uBrCdf: { value: new THREE.Vector4(cdf[0], cdf[1], cdf[2], cdf[3]) },
      uBrCdf2: { value: cdf[4] },
      uBrAvg: { value: avg },
      uBrMortar: { value: lin(BRICK_MORTAR) },
      uBrNight: night,
    },
    vertexPars: UV_VARYING,
    vertexMain: UV_MAIN,
    fragmentPars: /* glsl */ `
${UV_VARYING}
uniform vec3 uBrT0; uniform vec3 uBrT1; uniform vec3 uBrT2; uniform vec3 uBrT3; uniform vec3 uBrT4; uniform vec3 uBrT5;
uniform vec4 uBrCdf; uniform float uBrCdf2;
uniform vec3 uBrAvg; uniform vec3 uBrMortar; uniform float uBrNight;
const float BR_COURSE = 0.05;
const float BR_BED = 0.013;
const float BR_UNIT = 0.541;
const float BR_HEAD = 0.013;
vec3 brTone( float h ) {
	if ( h < uBrCdf.x ) return uBrT0;
	if ( h < uBrCdf.y ) return uBrT1;
	if ( h < uBrCdf.z ) return uBrT2;
	if ( h < uBrCdf.w ) return uBrT3;
	if ( h < uBrCdf2 ) return uBrT4;
	return uBrT5;
}
float brCover; float brFar; float brRough;
`,
    replace: {
      map_fragment: /* glsl */ `
	{
		vec2 bp = vEdUv;
		vec2 bfw = max( fwidth( bp ), vec2( 1e-5 ) );
		float course = floor( bp.y / BR_COURSE );
		// Wild bond: every course starts at a random offset; some units are a little shorter.
		float bx = bp.x + edHash( vec2( course, 3.17 ) ) * BR_UNIT;
		float unit = floor( bx / BR_UNIT );
		float cy = edPulse( bp.y, bfw.y, BR_COURSE, BR_BED, BR_COURSE );
		float cx = edPulse( bx, bfw.x, BR_UNIT, BR_HEAD, BR_UNIT );
		brCover = cx * cy;
		float h1 = edHash( vec2( unit * 1.37, course ) );
		float h2 = edHash( vec2( unit + 17.0, course * 1.31 ) );
		vec3 tone = brTone( h1 );
		// Hand-made units: a gentle tone drift along each brick and a few small light flecks.
		float along = fract( bx / BR_UNIT );
		float drift = edNoise( vec2( bx * 5.0 + h2 * 40.0, course * 3.0 ) );
		tone *= 0.94 + 0.12 * drift;
		float fleck = step( 0.965, edNoise( bp * vec2( 120.0, 260.0 ) ) );
		tone = mix( tone, uBrT5, fleck * 0.22 );
		tone *= 0.97 + 0.06 * h2 - 0.03 * smoothstep( 0.88, 1.0, along );
		// Units resolve below ≈ 2 cm a pixel; further out they average — through a faint course
		// banding (±4 %, gone before it could alias) instead of a flat paint.
		float unitFar = smoothstep( 0.015, 0.07, max( bfw.x, bfw.y ) );
		float band = 1.0 + 0.08 * ( edHash( vec2( course, 7.7 ) ) - 0.5 ) * ( 1.0 - smoothstep( 0.02, 0.045, bfw.y ) );
		tone = mix( tone, uBrAvg * band, unitFar );
		// Large-scale mottling of the hand-made batches (metres: it never aliases).
		float mott = edNoise( bp * vec2( 0.45, 1.3 ) + 3.1 ) * 0.6 + edNoise( bp * vec2( 1.7, 4.0 ) ) * 0.4;
		tone *= 0.95 + 0.1 * mott;
		brFar = smoothstep( 0.006, 0.03, max( bfw.x, bfw.y ) );
		// brCover is box-filtered (edPulse): it averages to the joint share at any distance.
		vec3 brick = mix( uBrMortar * ( 0.95 + 0.1 * mott ), tone, brCover );
		diffuseColor.rgb *= brick;
		brRough = mix( 1.0, 0.86 + 0.1 * h2, brCover );
	}
`,
      roughnessmap_fragment: /* glsl */ `
	float roughnessFactor = roughness * brRough;
`,
      emissivemap_fragment: /* glsl */ `
	{
		float wash = ${BRICK_NIGHT.foot} * exp( - max( vEdUv.y, 0.0 ) / ${BRICK_NIGHT.falloff.toFixed(1)} ) + ${BRICK_NIGHT.sky};
		totalEmissiveRadiance += diffuseColor.rgb * vec3( 1.0, 0.84, 0.66 ) * wash * uBrNight;
	}
`,
      normal_fragment_maps: /* glsl */ `
	{
		// Joints recessed ≈ 8 mm; fades out where a joint is under a pixel.
		float hgt = -0.008 * ( 1.0 - brCover ) * ( 1.0 - brFar );
		normal = edPerturb( - vViewPosition, normal, vec2( dFdx( hgt ), dFdy( hgt ) ), faceDirection );
	}
`,
    },
  });
}

// ── Window glass with interior mapping ──────────────────────────────────────

/** Shared per-module window uniforms (lit fraction follows the time of day). */
export interface WindowUniforms {
  uEdLit: { value: number };
  /** Scale of the rooms' own light seen from outside (the street exposure; see windowScale). */
  uEdWinK: { value: number };
}

/**
 * Glass of the square windows. Per-vertex attributes:
 *   aWinA = (lx, ly, w, h): metres from the glass's lower-left (seen from outside) and the glass size;
 *   aWinB = (floor, storey, seed, kind): storey floor relative to the glass bottom (m), floor-to-floor
 *   height, a random seed and the room kind (0 office/classroom, 1 corridor or stair, 2 lobby, 3 unlit).
 */
export function makeWindowGlassMaterial(shared: WindowUniforms, tier: TwinContext["tier"]): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: "#0a0d10", roughness: 0.05, metalness: 0 });
  m.name = "educity:window-glass";
  const detailed = tier !== "low";
  return patch(m, {
    key: `window-${detailed ? 1 : 0}`,
    uniforms: { ...FACADE_GLOBALS, uEdLit: shared.uEdLit, uEdWinK: shared.uEdWinK },
    defines: detailed ? { ED_ROOM_DETAIL: 1 } : {},
    vertexPars: /* glsl */ `
attribute vec4 aWinA;
attribute vec4 aWinB;
varying vec4 vWinA;
varying vec4 vWinB;
varying vec3 vWinPos;
varying vec3 vWinNor;
`,
    vertexMain: /* glsl */ `
	vWinA = aWinA;
	vWinB = aWinB;
	{
		vec4 wp = modelMatrix * vec4( transformed, 1.0 );
		vWinPos = wp.xyz;
		vWinNor = normalize( mat3( modelMatrix ) * objectNormal );
	}
`,
    fragmentPars: /* glsl */ `
varying vec4 vWinA;
varying vec4 vWinB;
varying vec3 vWinPos;
varying vec3 vWinNor;
uniform float uFcNight;
uniform float uFcDaylight;
uniform float uEdLit;
uniform float uEdWinK;
`,
    replace: {
      normal_fragment_maps: /* glsl */ `
	{
		// Every pane is a little out of plane: reflections break up like real glazing.
		vec2 tilt = vec2( edHash( vec2( vWinB.z * 91.0, 3.1 ) ), edHash( vec2( vWinB.z * 57.0, 8.3 ) ) ) - 0.5;
		vec3 Nw = normalize( vWinNor );
		vec3 Tw = edRight( Nw );
		// ±1.2° about both axes: neighbouring panes mirror different parts of the sky gradient.
		vec3 tw = Tw * tilt.x * 0.042 + vec3( 0.0, 1.0, 0.0 ) * tilt.y * 0.036;
		normal = normalize( normal + ( viewMatrix * vec4( tw, 0.0 ) ).xyz );
	}
`,
      emissivemap_fragment: /* glsl */ `
	{
		vec3 Nw = normalize( vWinNor );
		vec3 Rw = edRight( Nw );
		vec3 Vw = normalize( vWinPos - cameraPosition );
		vec3 d = vec3( dot( Vw, Rw ), Vw.y, -dot( Vw, Nw ) );
		d.z = max( d.z, 0.03 );
		float lx = vWinA.x;
		float ly = vWinA.y;
		float W = vWinA.z;
		float storeyH = max( vWinB.y, 2.5 );
		float seed = vWinB.z;
		float kind = vWinB.w;
		vec2 fw = max( fwidth( vWinA.xy ), vec2( 1e-4 ) );
		// Wide glazing is split into 3.6 m rooms.
		float cellW = W > 4.5 ? 3.6 : W;
		float cell = floor( lx / cellW );
		float cx = lx - cell * cellW;
		float yRel = ly - vWinB.x;
		float sIdx = floor( yRel / storeyH );
		float yIn = yRel - sIdx * storeyH;
		float roomH = storeyH - 0.65;
		vec3 roomId = vec3( seed * 113.0, cell, sIdx );
		float r1 = edHash3( roomId + 1.7 );
		float r2 = edHash3( roomId + 5.3 );
		// Lit rooms vary (dimmed, a lamp or two, daylight-white panels): ±30 % and 3500–4500 K.
		float r3 = edHash3( roomId + 3.3 );
		float lit = kind > 2.5 ? 0.0 : step( r1, uEdLit * ( kind > 0.5 ? 1.15 : 1.0 ) ) * ( 0.7 + 0.6 * r3 ) * uEdWinK;
		vec3 lightCol = mix( vec3( 1.02, 1.0, 0.97 ), vec3( 1.12, 0.98, 0.84 ), r2 );
		// ≈ LUMINANCE.windowLit seen from outside (rooms at ≈ 250–300 lux, light walls).
		float art = kind > 1.5 ? 0.3 : ( kind > 0.5 ? 0.21 : 0.24 );
		float day = uFcDaylight;
		vec3 radiance;
		if ( yIn > roomH ) {
			// Slab edge and ceiling void behind a window that crosses a floor.
			radiance = vec3( 0.32, 0.32, 0.33 ) * ( day * 0.3 + art * lit * 0.15 ) / 3.14159;
		} else {
			float marginX = max( 0.7, ( 3.6 - cellW ) * 0.5 );
			float xMin = -marginX;
			float xMax = cellW + marginX;
			float D = 4.5 + 3.5 * r2;
			vec3 o = vec3( cx, yIn, 0.0 );
			vec3 surf;
			float emissive = 0.0;
			float artK = 1.0;
			vec3 hp;
			float t;
			#ifdef ED_ROOM_DETAIL
			{
				// Exact zeros would give 0/0: treat them as "never hits that pair of walls".
				float tx = abs( d.x ) > 1e-5 ? ( d.x > 0.0 ? xMax - o.x : xMin - o.x ) / d.x : 1e6;
				float ty = abs( d.y ) > 1e-5 ? ( d.y > 0.0 ? roomH - o.y : 0.0 - o.y ) / d.y : 1e6;
				float tz = ( D - o.z ) / d.z;
				t = min( tx, min( ty, tz ) );
				hp = o + d * t;
				vec3 wallTone = mix( vec3( 0.72, 0.72, 0.7 ), vec3( 0.62, 0.64, 0.66 ), r2 );
				if ( kind > 1.5 ) wallTone = vec3( 0.66, 0.6, 0.52 );
				if ( t == tz ) {
					surf = wallTone;
					// A door, a whiteboard or a bookshelf on the back wall.
					float dx0 = xMin + 0.6 + r1 * max( xMax - xMin - 2.0, 0.1 );
					float door = step( dx0, hp.x ) * step( hp.x, dx0 + 0.95 ) * step( hp.y, 2.1 );
					surf = mix( surf, vec3( 0.5, 0.42, 0.33 ), door * step( 0.5, r2 ) );
					float board = step( dx0 + 1.3, hp.x ) * step( hp.x, dx0 + 3.0 ) * step( 0.9, hp.y ) * step( hp.y, 2.0 );
					surf = mix( surf, vec3( 0.86 ), board * step( r2, 0.5 ) );
				} else if ( t == ty ) {
					if ( d.y > 0.0 ) {
						surf = vec3( 0.82 );
						artK = 0.35;
						// Linear lights / panels across the ceiling.
						float rows = edPulse( hp.z, 0.02, 2.4, 0.9, 1.15 );
						emissive = rows * edBox( hp.x, 0.02, xMin + 0.4, xMax - 0.4 );
					} else {
						surf = kind > 0.5 ? vec3( 0.42, 0.42, 0.42 ) : mix( vec3( 0.28, 0.3, 0.33 ), vec3( 0.36, 0.33, 0.3 ), r2 );
						artK = 0.95;
					}
				} else {
					surf = wallTone * 0.9;
				}
				if ( kind < 0.5 ) {
					// Desks (0.74 m) with black task chairs and dark monitors.
					if ( d.y < 0.0 ) {
						float td = ( 0.74 - o.y ) / d.y;
						vec3 dp = o + d * td;
						if ( td > 0.0 && td < t && dp.z > 1.0 && dp.z < 1.8 && edHash( vec2( floor( dp.x / 1.6 ), seed * 7.0 + sIdx ) ) > 0.25 ) {
							surf = vec3( 0.78, 0.77, 0.74 );
							t = td; hp = dp; emissive = 0.0; artK = 1.1;
						}
					}
					float tf = ( 1.0 - o.z ) / d.z;
					vec3 fp = o + d * tf;
					if ( tf > 0.0 && tf < t && fp.y > 0.05 && fp.y < 0.74 && edHash( vec2( floor( fp.x / 1.6 ), seed * 7.0 + sIdx ) ) > 0.25 ) {
						surf = vec3( 0.12, 0.12, 0.13 );
						t = tf; hp = fp; emissive = 0.0;
					}
					float tm = ( 1.5 - o.z ) / d.z;
					vec3 mp = o + d * tm;
					float mx = fract( mp.x / 1.6 );
					if ( tm > 0.0 && tm < t && mp.y > 0.86 && mp.y < 1.25 && mx > 0.22 && mx < 0.72 && edHash( vec2( floor( mp.x / 1.6 ), seed * 7.0 + sIdx ) ) > 0.25 ) {
						surf = vec3( 0.04 );
						t = tm; hp = mp;
						emissive = 0.05 * lit;
					}
				}
				vec3 edge = min( hp - vec3( xMin, 0.0, 0.0 ), vec3( xMax, roomH, D ) - hp );
				float ao = 0.7 + 0.3 * smoothstep( 0.0, 0.8, min( edge.x, min( edge.y, edge.z ) ) );
				float dayFall = mix( 1.0, 0.3, clamp( hp.z / D, 0.0, 1.0 ) );
				vec3 E = vec3( day * dayFall ) + lightCol * art * artK * lit;
				radiance = surf * E * ao / 3.14159 + lightCol * emissive * lit * 0.8;
				// Far away: the room averages out (no sparkle).
				float far = smoothstep( 0.12, 0.5, max( fw.x, fw.y ) );
				vec3 avg = mix( wallTone, vec3( 0.32 ), 0.4 ) * ( vec3( day * 0.6 ) + lightCol * art * lit ) * 0.85 / 3.14159 + lightCol * lit * 0.018;
				radiance = mix( radiance, avg, far );
			}
			#else
			{
				float g = clamp( yIn / roomH, 0.0, 1.0 );
				vec3 wallTone = vec3( 0.66 );
				radiance = wallTone * ( vec3( day * 0.6 ) + lightCol * art * lit * ( 0.75 + 0.5 * g ) ) * 0.85 / 3.14159 + lightCol * lit * 0.018;
			}
			#endif
			// Roller blinds on some windows (white fabric, glowing when the room is lit).
			if ( edHash3( roomId + 9.1 ) < 0.14 ) {
				float drop = 0.2 + 0.75 * edHash3( roomId + 2.9 );
				float yb = ly + d.y * ( 0.08 / d.z );
				float covered = step( vWinA.w * ( 1.0 - drop ), yb );
				vec3 bl = vec3( 0.85, 0.85, 0.83 ) * ( vec3( day * 0.9 ) + lightCol * art * lit * 0.9 ) / 3.14159;
				radiance = mix( radiance, bl, covered );
			}
		}
		vec3 Vv = normalize( vViewPosition );
		float cosT = clamp( abs( dot( Vv, normal ) ), 0.0, 1.0 );
		float F = 0.05 + 0.95 * pow( 1.0 - cosT, 5.0 );
		// By day the sky reflection dominates (rooms behind glass read dark, as in the photographs).
		totalEmissiveRadiance += radiance * mix( 0.72, 0.3, uFcDaylight ) * ( 1.0 - F );
	}
`,
      lights_physical_fragment: /* glsl */ `
	#include <lights_physical_fragment>
	// Coated triple glazing: F0 ≈ 0.11, full Fresnel against the sky (scene.environment).
	material.specularColor = vec3( 0.11 );
	material.specularColorBlended = vec3( 0.11 );
	material.diffuseContribution *= 0.15;
`,
    },
  });
}

// ── Clear glass (in front of the modelled interiors) ────────────────────────

/**
 * Transparent glazing that shows the real interior: reflections at full strength over a dimmed view.
 * Facade and door glass is clean float glass (uniform roughness, no normal map — the library's
 * smudge read as swirls and cracks in every room close-up); `smudge` keeps it for low-coverage
 * interior partitions.
 */
export function makeClearGlass(lib: MaterialLibrary, coverage = 0.16, tint = "#0e1418", smudge = false): THREE.MeshStandardMaterial {
  // glass_smudge has no colour map: set the albedo directly (a calibrated override would exceed 1).
  const m = lib.variant("glassInterior", {});
  m.color.set(tint);
  m.opacity = coverage;
  m.name = "educity:clear-glass";
  if (!smudge) {
    m.normalMap = null;
    m.roughnessMap = null;
    m.roughness = 0.03;
  }
  m.needsUpdate = true;
  return m;
}

// ── Fritted atrium roof ─────────────────────────────────────────────────────

/** Atrium roof glass with white silk-screen dashes (≈40 % coverage). UV: metres across / up the slope. */
export function makeFritGlass(lib: MaterialLibrary): THREE.MeshStandardMaterial {
  const m = lib.variant("glassInterior", {});
  m.color.set("#10171c");
  m.name = "educity:frit-glass";
  m.opacity = 1;
  return patch(m, {
    key: "frit",
    vertexPars: UV_VARYING,
    vertexMain: UV_MAIN,
    fragmentPars: /* glsl */ `${UV_VARYING}\nfloat edFrit;`,
    replace: {
      map_fragment: /* glsl */ `
	{
		vec2 p = vEdUv;
		vec2 fw = max( fwidth( p ), vec2( 1e-5 ) );
		float row = floor( p.y / 0.07 );
		float bar = edPulse( p.y, fw.y, 0.07, 0.0, 0.035 );
		// Dashes of random length along each row.
		float seg = floor( ( p.x + edHash( vec2( row, 1.3 ) ) * 3.0 ) / 0.42 );
		float on = step( 0.42, edHash( vec2( seg, row ) ) );
		float coverage = mix( bar * on, 0.29, smoothstep( 0.02, 0.06, fw.y ) );
		edFrit = coverage;
		diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.78, 0.8, 0.8 ), coverage );
		diffuseColor.a = mix( 0.07, 0.86, coverage );
	}
`,
      lights_physical_fragment: /* glsl */ `
	#include <lights_physical_fragment>
	material.diffuseContribution = diffuseColor.rgb * edFrit;
`,
    },
  });
}

// ── Bolon "Studio Triangle" floor ───────────────────────────────────────────

export const CARPET_TONES = ["#cdd3d6", "#b9c0c4", "#9aa2a8", "#77838b", "#2f5a74", "#a9bfd3", "#e2c8c6", "#d8dcde"];
const CARPET_SHARES = [0.2, 0.17, 0.13, 0.1, 0.13, 0.1, 0.09, 0.08];

/** Triangle-patterned woven vinyl floor (≈1.2 m triangles), plan UV in metres. */
export function makeCarpetMaterial(ctx: Pick<TwinContext, "envInterior">): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0 });
  m.name = "educity:triangle-floor";
  interior(m, ctx);
  let acc = 0;
  const cdf = CARPET_SHARES.map((p) => (acc += p));
  const tones = CARPET_TONES.map(lin);
  const avg = new THREE.Color(0, 0, 0);
  CARPET_SHARES.forEach((p, i) => avg.add(tones[i].clone().multiplyScalar(p)));
  return patch(m, {
    key: "carpet",
    uniforms: {
      uCpT: { value: tones },
      uCpCdfA: { value: new THREE.Vector4(cdf[0], cdf[1], cdf[2], cdf[3]) },
      uCpCdfB: { value: new THREE.Vector4(cdf[4], cdf[5], cdf[6], cdf[7]) },
      uCpAvg: { value: avg },
    },
    vertexPars: UV_VARYING,
    vertexMain: UV_MAIN,
    fragmentPars: /* glsl */ `
${UV_VARYING}
uniform vec3 uCpT[ 8 ];
uniform vec4 uCpCdfA;
uniform vec4 uCpCdfB;
uniform vec3 uCpAvg;
vec3 cpTone( float h ) {
	if ( h < uCpCdfA.x ) return uCpT[ 0 ];
	if ( h < uCpCdfA.y ) return uCpT[ 1 ];
	if ( h < uCpCdfA.z ) return uCpT[ 2 ];
	if ( h < uCpCdfA.w ) return uCpT[ 3 ];
	if ( h < uCpCdfB.x ) return uCpT[ 4 ];
	if ( h < uCpCdfB.y ) return uCpT[ 5 ];
	if ( h < uCpCdfB.z ) return uCpT[ 6 ];
	return uCpT[ 7 ];
}
`,
    replace: {
      map_fragment: /* glsl */ `
	{
		vec2 p = vEdUv / 1.2;
		// Triangular lattice: skew to (i, j) cells, each split into an up and a down triangle.
		vec2 q = vec2( p.x - p.y * 0.57735, p.y * 1.1547 );
		vec2 c = floor( q );
		vec2 f = q - c;
		float up = step( f.x + f.y, 1.0 );
		vec3 tone = cpTone( edHash( c * vec2( 1.0, 1.7 ) + up * 13.1 ) );
		// Woven texture: fine diagonal weave and a little mottling.
		float weave = edPulse( vEdUv.x + vEdUv.y, fwidth( vEdUv.x + vEdUv.y ), 0.006, 0.0, 0.003 );
		tone *= 0.95 + 0.06 * weave + 0.05 * ( edNoise( vEdUv * 6.0 ) - 0.5 );
		float far = smoothstep( 0.05, 0.25, max( fwidth( p.x ), fwidth( p.y ) ) );
		diffuseColor.rgb *= mix( tone, uCpAvg, far );
	}
`,
    },
  });
}

// ── Birch slats ─────────────────────────────────────────────────────────────

/**
 * Light birch slats (45 mm, 20 mm gaps on a dark backing) drawn on the surface:
 * `vertical` runs the slats up the wall (u = across), else along u.
 */
export function makeSlatMaterial(ctx: Pick<TwinContext, "materials" | "envInterior">, vertical = true, interiorLit = true): THREE.MeshStandardMaterial {
  const m = ctx.materials.variant("birch", { color: "#d8ccb9", roughness: 0.8 });
  m.name = `educity:slats-${vertical ? "v" : "h"}`;
  if (interiorLit) interior(m, ctx);
  return patch(m, {
    key: `slats-${vertical ? 1 : 0}`,
    vertexPars: UV_VARYING,
    vertexMain: UV_MAIN,
    fragmentPars: `${UV_VARYING}\nfloat edSlat; float edSlatFar;`,
    replace: {
      map_fragment: /* glsl */ `
	#include <map_fragment>
	{
		float s = ${vertical ? "vEdUv.x" : "vEdUv.y"};
		float fws = max( fwidth( s ), 1e-5 );
		edSlat = edPulse( s, fws, 0.065, 0.0, 0.045 );
		edSlatFar = smoothstep( 0.01, 0.04, fws );
		float cover = mix( edSlat, 0.69, edSlatFar );
		float slatId = floor( s / 0.065 );
		vec3 gap = vec3( 0.06, 0.055, 0.05 );
		diffuseColor.rgb = mix( gap, diffuseColor.rgb * ( 0.93 + 0.12 * edHash( vec2( slatId, 2.0 ) ) ), cover );
	}
`,
      normal_fragment_maps: /* glsl */ `
	#include <normal_fragment_maps>
	{
		float hgt = 0.02 * edSlat * ( 1.0 - edSlatFar );
		normal = edPerturb( - vViewPosition, normal, vec2( dFdx( hgt ), dFdy( hgt ) ), faceDirection );
	}
`,
    },
  });
}

// ── Suspended ceiling with LED panels ───────────────────────────────────────

/** White 600 mm tiles with square LED panels on a 1.8 × 2.4 m pitch. Plan UV (metres). */
export function makeCeilingMaterial(ctx: Pick<TwinContext, "envInterior">, pitch: [number, number] = [1.8, 2.4]): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: "#e9e8e4", roughness: 0.92, emissive: "#ffffff", emissiveIntensity: 1 });
  m.name = "educity:ceiling";
  interior(m, ctx);
  // The panels' luminance (switched with the building's use: see lighting.ts).
  const lum = { value: LUMINANCE.ceilingPanel };
  m.userData.edPanelLum = lum;
  return patch(m, {
    key: "ceiling",
    uniforms: { uCePitch: { value: new THREE.Vector2(pitch[0], pitch[1]) }, uCeLum: lum },
    vertexPars: UV_VARYING,
    vertexMain: UV_MAIN,
    fragmentPars: `${UV_VARYING}\nuniform vec2 uCePitch; uniform float uCeLum;`,
    replace: {
      map_fragment: /* glsl */ `
	{
		vec2 p = vEdUv;
		vec2 fw = max( fwidth( p ), vec2( 1e-5 ) );
		float jx = edPulse( p.x, fw.x, 0.6, 0.0, 0.012 );
		float jy = edPulse( p.y, fw.y, 0.6, 0.0, 0.012 );
		diffuseColor.rgb *= 1.0 - 0.25 * max( jx, jy ) * ( 1.0 - smoothstep( 0.01, 0.04, max( fw.x, fw.y ) ) );
	}
`,
      emissivemap_fragment: /* glsl */ `
	{
		vec2 p = vEdUv;
		vec2 fw = max( fwidth( p ), vec2( 1e-5 ) );
		float px = edPulse( p.x, fw.x, uCePitch.x, 0.03, 0.57 );
		float py = edPulse( p.y, fw.y, uCePitch.y, 0.03, 0.57 );
		totalEmissiveRadiance = vec3( 1.0, 0.98, 0.95 ) * px * py * uCeLum;
	}
`,
    },
  });
}

// ── Plant room cladding ─────────────────────────────────────────────────────

/** Satin Al-Mg panels (≈1.2 m module), uplit warm after dark (SPEC §8.3). Attribute aEdUp = 0 at the base … 1 at the top. */
export function makePlantMaterial(night: { value: number }): THREE.MeshStandardMaterial {
  // Satin aluminium-magnesium (SPEC §3.3.2 #c9d0d2): mostly diffuse, a soft sheen.
  const m = new THREE.MeshStandardMaterial({ color: "#c9d0d2", roughness: 0.52, metalness: 0.22, emissive: "#ffffff", emissiveIntensity: 1 });
  m.name = "educity:plant-cladding";
  return patch(m, {
    key: "plant",
    uniforms: { uEdNight: night },
    vertexPars: `${UV_VARYING}\nattribute float aEdUp;\nvarying float vEdUp;`,
    vertexMain: `${UV_MAIN}\nvEdUp = aEdUp;`,
    fragmentPars: `${UV_VARYING}\nvarying float vEdUp;\nuniform float uEdNight;`,
    replace: {
      map_fragment: /* glsl */ `
	{
		vec2 p = vEdUv;
		vec2 fw = max( fwidth( p ), vec2( 1e-5 ) );
		// 1.2 m panels with a shadow-gap joint, each panel folded into four shallow vertical ribs.
		float joint = max( edPulse( p.x + 0.008, fw.x, 1.2, 0.0, 0.016 ), edPulse( p.y + 0.006, fw.y, 4.47, 0.0, 0.012 ) );
		float rib = edPulse( p.x, fw.x, 0.3, 0.0, 0.12 ) * ( 1.0 - smoothstep( 0.02, 0.08, fw.x ) );
		float panel = edHash( vec2( floor( p.x / 1.2 ), floor( p.y / 4.47 ) ) );
		diffuseColor.rgb *= ( 0.93 + 0.1 * panel ) * ( 1.0 - 0.75 * joint ) * ( 1.0 - 0.07 * rib );
	}
`,
      roughnessmap_fragment: /* glsl */ `
	float roughnessFactor = roughness * ( 0.85 + 0.3 * edHash( vec2( floor( vEdUv.x / 1.2 ), 4.0 ) ) );
`,
      emissivemap_fragment: /* glsl */ `
	{
		// Uplights at the base: warm, falling off upwards (≈25 → 8 cd/m²).
		// #e7d2b8 at the base → #bc9d7c higher up (SPEC §8.3), falling off with the distance to the lights.
		vec3 warm = mix( vec3( 0.80, 0.64, 0.48 ), vec3( 0.50, 0.34, 0.21 ), vEdUp );
		float fall = mix( 1.0, 0.18, smoothstep( 0.0, 1.0, sqrt( vEdUp ) ) );
		totalEmissiveRadiance = warm * fall * 0.026 * uEdNight;
	}
`,
    },
  });
}

// ── Railing infill ──────────────────────────────────────────────────────────

/** Bar pitch (m) and flat-bar width of the galvanised railings (photos: thinglink terrace / fence views). */
export const RAILING_PITCH = 0.13;
export const RAILING_BAR = 0.05;

/**
 * The flat-bar infill of a railing as one textured quad: alpha from a
 * mipmapped bar pattern (u = metres along the run), so a railing seen from
 * afar fades to the translucent grey band it really is instead of aliasing
 * into moiré — and costs two triangles instead of hundreds. Double-sided,
 * no shadow casting (DESIGN §3: tiny parts never cast).
 */
export function makeRailingMaterial(color = "#9aa1a4"): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.5,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  m.name = "educity:railing";
  if (typeof document !== "undefined") {
    const w = 64;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = 4;
    const g = canvas.getContext("2d");
    if (g) {
      g.clearRect(0, 0, w, 4);
      g.fillStyle = "#ffffff";
      const bar = Math.round((RAILING_BAR / RAILING_PITCH) * w);
      g.fillRect(Math.round((w - bar) / 2), 0, bar, 4);
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1 / RAILING_PITCH, 1);
      tex.anisotropy = 8;
      tex.colorSpace = THREE.NoColorSpace;
      m.alphaMap = tex;
      m.needsUpdate = true;
    }
  }
  return m;
}

// ── "Uber" material: vertex colour + per-vertex roughness / metalness ──────

/**
 * One material for many plain surfaces (render, frames, railings, roofs,
 * fascias, interior walls…): colour from the vertex colour (target albedo),
 * roughness and metalness from the aEdRM attribute. Optional library texture
 * for fine surface variation (its average is calibrated to white, so the
 * vertex colour stays the albedo).
 */
export function makeUberMaterial(
  lib: MaterialLibrary,
  opts: { textured?: MaterialName; name: string; env?: THREE.Texture | null },
): THREE.MeshStandardMaterial {
  const m = opts.textured ? lib.variant(opts.textured, { color: "#ffffff" }) : new THREE.MeshStandardMaterial({ color: "#ffffff" });
  m.vertexColors = true;
  m.name = `educity:${opts.name}`;
  if (opts.env) {
    m.envMap = opts.env;
    m.envMapIntensity = 1;
  }
  const prev = m.onBeforeCompile;
  const prevKey = m.customProgramCacheKey();
  m.customProgramCacheKey = () => `${prevKey}|edu-uber`;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 aEdRM;\nvarying vec2 vEdRM;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvEdRM = aEdRM;");
    // Override after any library patch has set them (they declare the factors).
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vEdRM;")
      .replace(
        "#include <lights_physical_fragment>",
        "roughnessFactor = clamp( vEdRM.x, 0.03, 1.0 );\nmetalnessFactor = clamp( vEdRM.y, 0.0, 1.0 );\n#include <lights_physical_fragment>",
      );
  };
  m.needsUpdate = true;
  return m;
}

// ── Interior light control ──────────────────────────────────────────────────

/** Shared uniforms of every interior material (see interiorLight). */
export interface InteriorLightUniforms {
  /** Scale of the direct sun (1 closed; lower while the dollhouse is open). */
  uEdSun: { value: number };
  /** Tint × intensity of the image-based light (the interior environment). */
  uEdEnv: { value: THREE.Vector3 };
}

export function interiorLightUniforms(): InteriorLightUniforms {
  return { uEdSun: { value: 1 }, uEdEnv: { value: new THREE.Vector3(1, 1, 1) } };
}

/**
 * Patch a material so its direct sun and its image-based light follow shared
 * uniforms. While the dollhouse is open the cut-away shell no longer shades
 * the rooms (a 4° November sun would rake straight across them) and the
 * engine blends the exposure halfway to the interior's, so the interior light
 * is rescaled to read as designed; the tint shifts the engine's 3500 K
 * office environment to EduCity's 4000 K LEDs (SPEC §8.3).
 */
export function interiorLight<T extends THREE.Material>(m: T, u: InteriorLightUniforms): T {
  if (m.userData.edInteriorLight) return m;
  m.userData.edInteriorLight = true;
  const prev = m.onBeforeCompile;
  const prevKey = m.customProgramCacheKey();
  m.customProgramCacheKey = () => `${prevKey}|edu-light`;
  m.onBeforeCompile = (shader, renderer) => {
    prev.call(m, shader, renderer);
    shader.uniforms.uEdSun = u.uEdSun;
    shader.uniforms.uEdEnv = u.uEdEnv;
    // Chunks are resolved after onBeforeCompile: inline the lights chunk with the scale in it
    // (the twin's sun is a SunLight — its own loop — and directional lights are scaled too).
    const begin = THREE.ShaderChunk.lights_fragment_begin
      .replace("getSunLightInfo( sunLight, directLight );", "getSunLightInfo( sunLight, directLight );\n\t\tdirectLight.color *= uEdSun;")
      .replace(
        "getDirectionalLightInfo( directionalLight, directLight );",
        "getDirectionalLightInfo( directionalLight, directLight );\n\t\tdirectLight.color *= uEdSun;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uEdSun;\nuniform vec3 uEdEnv;")
      .replace("#include <lights_fragment_begin>", begin)
      .replace(
        "#include <lights_fragment_maps>",
        "#include <lights_fragment_maps>\n\tiblIrradiance *= uEdEnv;\n\tradiance *= uEdEnv;",
      );
  };
  m.needsUpdate = true;
  return m;
}

// ── Vertex-coloured emissive ────────────────────────────────────────────────

/**
 * One emissive material for every small light of a level (LED lines, step
 * lights, coves): the per-vertex attribute aEdEm is the emitted radiance
 * (linear colour × luminance, scene units); emissiveIntensity dims them all.
 */
export function makeEmissiveVC(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: "#050505", roughness: 0.6, emissive: "#ffffff", emissiveIntensity: 1 });
  m.name = "educity:emissive-vc";
  m.customProgramCacheKey = () => "edu-emissive-vc";
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 aEdEm;\nvarying vec3 vEdEm;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvEdEm = aEdEm;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vEdEm;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vEdEm;");
  };
  m.needsUpdate = true;
  return m;
}

/** aEdEm value for a colour (sRGB) at a luminance (scene units). */
export function emission(color: THREE.ColorRepresentation, luminance: number): [number, number, number] {
  const c = new THREE.Color(color);
  return [c.r * luminance, c.g * luminance, c.b * luminance];
}

// ── Simple helpers ──────────────────────────────────────────────────────────

/** Light an owned material with the interior environment (≈400 lux office light). */
export function interior<T extends THREE.MeshStandardMaterial>(m: T, ctx: Pick<TwinContext, "envInterior">, intensity = 1): T {
  if (ctx.envInterior) {
    m.envMap = ctx.envInterior;
    m.envMapIntensity = intensity;
  }
  m.needsUpdate = true;
  return m;
}

/** Owned library variant lit indoors. */
export function interiorVariant(
  ctx: Pick<TwinContext, "materials" | "envInterior">,
  name: MaterialName,
  overrides: Parameters<MaterialLibrary["variant"]>[1] = {},
): THREE.MeshStandardMaterial {
  return interior(ctx.materials.variant(name, overrides), ctx, overrides.envMapIntensity ?? 1);
}

/** A flat-colour emissive material (lights, LED lines, lit signs). */
export function emissiveMaterial(color: THREE.ColorRepresentation, luminance: number): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: "#050505", roughness: 0.6, emissive: color, emissiveIntensity: luminance });
  m.name = "educity:emissive";
  return m;
}

/** Vertex-coloured variant (the vertex colour is the target linear albedo). */
export function vertexColored(lib: MaterialLibrary, name: MaterialName, overrides: Parameters<MaterialLibrary["variant"]>[1] = {}): THREE.MeshStandardMaterial {
  const m = lib.variant(name, { color: "#ffffff", ...overrides });
  m.vertexColors = true;
  m.needsUpdate = true;
  return m;
}
