import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { CameraView, Collider2D, LightingState, TwinContext, TwinTarget, V2, WorldModule } from "../types";
import { loadCampus, loadLod2, loadTerrain, type CampusBuilding, type Lod2Building } from "../data/campus";
import { makeLabel } from "../labels";
import { FACADE_GLOBALS, facadeSeed } from "../render/facade";
import { TwinMaterialLibrary } from "../render/materials";
import { cleanRing, ensureCCW, hashString, mulberry32, overlapArea, pointInRing, polygonBounds, polygonCentroid, ringArea } from "../util";
import { insetRing, makeSolid, pilasterCentres, SolidIndex, storeyScale, wallSpans, type Solid, type WallSpan } from "./context/envelope";
import { FacadeBuilder, MeshBuilder, box, capRing, column, disc, lin, pipe } from "./context/kit";
import { FAMILIES, makeFamilyMaterial, renderFamily, wallTint } from "./context/styles";
import { recipeFor, type BuildingInfo, type PilasterSpec, type Recipe } from "./context/recipes";
import { debugEnabled } from "../debug";
import { buildDetails, type DetailKit } from "./context/details";
import { assignRoofParts, type RoofPart } from "./context/parts";

/**
 * Context buildings (DESIGN §2 world/context.ts, SPEC §3.4): every campus
 * building that is not BioCity, Joki or EduCity — Electrocity, Eurocity,
 * ICT-City, DataCity, Pharmacity, ParkCity, CivilCity, the station, the
 * hospital, hotel, offices and apartment blocks — from the City of Turku LOD2
 * roofs (real heights, setbacks, plant rooms, sloped glazing), else the OSM
 * outline.
 *
 * - Facades: procedural (render/facade.ts) families per building, part and
 *   wall (world/context/recipes.ts, styles.ts); walls hidden by a neighbour
 *   are not built, walls above a lower roof start there (envelope.ts).
 * - Roofs: parapets with copings, membrane roofs, rooftop plant, sloped glass.
 * - Bespoke details for the buildings that frame the event venues
 *   (world/context/details.ts): Electrocity's arcade and ducts, Eurocity's
 *   skybridge, ICT-City's PV field, DataCity's ducts and sign, ParkCity's tube
 *   facade and decks, the station hall, canopies and entrances.
 * - Night: sparse office lighting from the facade shader (weekend occupancy),
 *   lit signs, entrance downlights and light pools, glowing stair shafts.
 * - claims = the OSM ids modelled here (world/massing.ts skips them).
 */

/** Hero buildings modelled by their own modules. */
const HERO_ROLES = new Set(["biocity", "joki", "educity"]);

/**
 * Buildings that another building's LOD2 record models only in part: their OSM outline stands under
 * the borrowed parts. The round lecture building by Dentalia: the record holds its drum and the
 * higher annulus, not the low outer ring (2025 orthophoto).
 */
const OUTLINE_UNDER_PARTS = new Set([782074008]);

interface Built {
  b: CampusBuilding;
  info: BuildingInfo;
  recipe: Recipe;
  solids: Solid[];
  /** Footprint rings for walk-mode colliders (empty = none). */
  footprints: V2[][];
  /** Storey scale for the facade grid. */
  k: number;
  seed: number;
}

/** Linear-rgb triple. */
type Rgb = [number, number, number];



export async function buildContext(ctx: TwinContext): Promise<WorldModule> {
  const root = new THREE.Group();
  root.name = "context";
  const lib = ctx.materials;
  const tier = ctx.tier;

  const [campus, lod2, terrain] = await Promise.all([
    loadCampus(),
    loadLod2().catch(() => null),
    loadTerrain().catch(() => null),
  ]);
  const heightAt = (x: number, z: number) => (terrain ? terrain.heightAt(x, z) : 0);

  // ── Which buildings ──
  const heroes = campus.buildings.filter((b) => b.role && HERO_ROLES.has(b.role));
  const heroRings = heroes.map((h) => ensureCCW(cleanRing(h.polygon)));
  const touchesHero = (b: CampusBuilding) => {
    const c = polygonCentroid(b.polygon);
    return heroRings.some((r) => pointInRing(c, r) || ringDistance(c, r) < 3);
  };
  const canopies: CampusBuilding[] = [];
  const mine: CampusBuilding[] = [];
  for (const b of campus.buildings) {
    if (b.role && HERO_ROLES.has(b.role)) continue;
    const raised = b.baseY !== undefined || (b.minHeight ?? 0) > 0 || b.use === "roof";
    if (raised && touchesHero(b)) continue; // BioCity's canopies belong to BioCity.
    if (raised) canopies.push(b);
    else mine.push(b);
  }

  // LOD2 records by id; records that no campus building links to are adopted by overlap (as massing does).
  const lod2ById = new Map<string, Lod2Building>();
  for (const r of lod2?.buildings ?? []) lod2ById.set(r.id, r);
  const linked = new Set<string>();
  for (const b of campus.buildings) for (const id of b.lod2 ?? []) linked.add(id);
  const adopted = new Map<string, Lod2Building[]>();
  const standalone: Lod2Building[] = [];
  for (const rec of lod2ById.values()) {
    if (linked.has(rec.id) || rec.claimedBy) continue;
    const ring = rec.footprint[0];
    if (!ring || ring.length < 3) continue;
    const a = Math.abs(ringArea(ring));
    let best: CampusBuilding | null = null;
    let bestOverlap = 0;
    for (const b of mine) {
      if (b.lod2?.length) continue;
      const o = overlapArea(ring, b.polygon, 1);
      if (o > bestOverlap) {
        bestOverlap = o;
        best = b;
      }
    }
    if (best && bestOverlap >= 0.3 * a) adopted.set(best.id, [...(adopted.get(best.id) ?? []), rec]);
    else if (rec.osmId) standalone.push(rec);
  }

  // ── Which building each LOD2 roof part belongs to (context/parts.ts: records spanning several outlines) ──
  const recsOf = new Map<string, Lod2Building[]>();
  for (const b of mine) recsOf.set(b.id, [...(b.lod2 ?? []).map((id) => lod2ById.get(id)).filter((r): r is Lod2Building => !!r), ...(adopted.get(b.id) ?? [])]);
  // LOD2 buildings outside the OSM extract (e.g. Untamonkatu 2).
  const pseudos: CampusBuilding[] = [];
  for (const rec of standalone) {
    if (!rec.osmId) continue;
    const pseudo: CampusBuilding = {
      id: `osm-${rec.osmId}`,
      osmId: rec.osmId,
      name: rec.name ?? rec.address,
      levels: rec.storeys ?? 1,
      height: rec.roofY - rec.groundY,
      polygon: rec.footprint[0],
      groundY: rec.groundY,
      roofY: rec.roofY,
      use: "office",
      year: rec.year,
    };
    pseudos.push(pseudo);
    recsOf.set(pseudo.id, [rec]);
  }
  const { partsOf, splitRecs, claimed: claimedParts } = assignRoofParts([...mine, ...pseudos], mine, recsOf);
  const ghosts: Solid[] = [];
  for (const { rec, roof, k, building } of claimedParts) {
    const g = makeSolid(`${building.id}#${rec.id}#${k}`, roof.claimedBy as string, roof.ring, rec.baseY, roof.ys ? { ys: roof.ys } : (roof.y ?? rec.roofY), { ghost: true });
    if (g) ghosts.push(g);
  }

  // ── Solids ──
  const built: Built[] = [];
  const allMine: Solid[] = [];
  const addBuilding = (b: CampusBuilding, parts: RoofPart[]) => {
    const solids: Solid[] = [];
    const footprints: V2[][] = [];
    let ground = Infinity;
    let roofY = -Infinity;
    let levels: number | undefined;
    let year: number | undefined;
    const recs = [...new Set(parts.map((p) => p.rec))];
    // A whole record keeps its footprint, storeys and main roof; parts of a shared one use the outline.
    const shared = recs.some((r) => splitRecs.has(r));
    for (const rec of recs) {
      ground = Math.min(ground, Math.max(rec.groundY, rec.baseY));
      year = year ?? rec.year;
      if (shared) continue;
      roofY = Math.max(roofY, rec.roofY);
      levels = levels ?? rec.storeys;
      for (const fp of rec.footprint) if (fp.length >= 3) footprints.push(ensureCCW(cleanRing(fp)));
    }
    if (shared) footprints.push(ensureCCW(cleanRing(b.polygon)));
    for (const { rec, roof, k } of parts) {
      const s = makeSolid(`${b.id}#${rec.id}#${k}`, b.id, roof.ring, rec.baseY, roof.ys ? { ys: roof.ys } : (roof.y ?? rec.roofY), { year: rec.year });
      if (s && solidTop(s) - s.base > 0.4) solids.push(s);
    }
    if (shared && solids.length) {
      // Main roof of a shared record's parts: the largest flat roof.
      const main = solids.filter((x) => x.flatY !== null).sort((x, y) => Math.abs(ringArea(y.ring)) - Math.abs(ringArea(x.ring)))[0];
      roofY = main ? (main.flatY as number) : Math.max(...solids.map(solidTop));
    }
    // Borrowed parts only (no records of its own): when they cover little of the outline, the outline
    // stands too, at its OSM / surface-model height.
    const borrowedOnly = parts.length > 0 && !(recsOf.get(b.id) ?? []).length;
    const outline = Math.abs(ringArea(b.polygon));
    const covered = borrowedOnly ? solids.reduce((sum, x) => sum + Math.abs(ringArea(x.ring)), 0) / Math.max(outline, 1) : 1;
    const underParts = borrowedOnly && (covered < 0.6 || OUTLINE_UNDER_PARTS.has(b.osmId));
    if ((!parts.length && !(recsOf.get(b.id) ?? []).length) || underParts) {
      const ring = ensureCCW(cleanRing(b.polygon));
      const g = b.groundY ?? Math.min(...ring.map(([x, z]) => heightAt(x, z)));
      ground = Math.min(Number.isFinite(ground) ? ground : g, g);
      roofY = b.roofY ?? g + Math.max(3, b.height);
      levels = b.levels || undefined;
      // Parts no higher than the outline are inside it (and their roofs would fight its roof).
      for (let i = solids.length - 1; i >= 0; i--) if (solidTop(solids[i]) <= roofY + 0.3) solids.splice(i, 1);
      if (!footprints.length) footprints.push(ring);
      const osmParts = (b.parts ?? []).filter((p) => p.polygon.length >= 3);
      const s = makeSolid(`${b.id}#0`, b.id, ring, g - 0.3, roofY);
      if (s) solids.push(s);
      // OSM parts that rise above the outline (towers on a podium).
      for (const [k, p] of osmParts.entries()) {
        if (!p.height || g + p.height <= roofY + 0.5) continue;
        const ps = makeSolid(`${b.id}#p${k}`, b.id, p.polygon, g - 0.3, g + p.height);
        if (ps) solids.push(ps);
      }
    }
    if (!solids.length) return;
    // Storey reference: the median ground along the footprint (floors are level; on a slope the
    // street cuts in at one end), never below the lowest contact; bridge buildings keep their floor.
    const lowest = Number.isFinite(ground) ? ground : 0;
    const raisedBase = recs.length && recs.every((r) => r.baseY > r.groundY + 1);
    const vRef = raisedBase ? lowest + 1 : Math.min(lowest + 3, Math.max(lowest, medianGround(footprints[0] ?? b.polygon, heightAt)));
    const info: BuildingInfo = {
      b,
      bridge: !!raisedBase,
      ground: vRef,
      roofY,
      levels: levels ?? (b.levels || undefined),
      glassParts: (b.parts ?? [])
        .filter((p) => p.material === "glass")
        .map((p) => ({ ring: ensureCCW(cleanRing(p.polygon)), top: vRef + (p.levels ?? 2) * 3.8 + 0.5 })),
      colouredParts: (b.parts ?? []).map((p) => ({ ring: ensureCCW(cleanRing(p.polygon)), colour: p.colour, material: p.material })),
      overhangs: (b.parts ?? [])
        .filter((p) => (p.minLevel ?? 0) >= 1 && (p.minHeight ?? 0) > 2)
        .map((p) => ({ ring: ensureCCW(cleanRing(p.polygon)), minHeight: p.minHeight ?? 3.6 })),
      year: year ?? b.year,
    };
    const recipe = recipeFor(b, info);
    for (const s of solids) s.tag = recipe.solidFamily?.(s, info) ?? recipe.family;
    const fam = FAMILIES[recipe.family] ?? FAMILIES.office;
    const k = storeyScale(info.roofY - info.ground, info.levels, fam.style.storey, fam.style.groundStorey ?? fam.style.storey, fam.parapet * 0.6);
    built.push({ b, info, recipe, solids, footprints, k, seed: facadeSeed(b.id) });
    allMine.push(...solids);
  };
  for (const b of [...mine, ...pseudos]) addBuilding(b, partsOf.get(b.id) ?? []);
  // Hero buildings hide our walls where they touch (their own records, claimed parts, and outlines).
  for (const rec of lod2ById.values()) {
    if (!rec.claimedBy) continue;
    rec.roofs.forEach((roof, k) => {
      const g = makeSolid(`${rec.id}#${k}`, rec.claimedBy as string, roof.ring, rec.baseY, roof.ys ? { ys: roof.ys } : (roof.y ?? rec.roofY), { ghost: true });
      if (g) ghosts.push(g);
    });
  }
  // (Hero OSM outlines are not used as ghosts: EduCity's includes the ICT-City link-bridge strip and
  // would cut a hole up ICT-City's wall; the hero LOD2 records above are the accurate massing.)
  const index = new SolidIndex([...allMine, ...ghosts]);

  // ── Builders per material ──
  const facades = new Map<string, FacadeBuilder>();
  const facadeFor = (key: string) => {
    let fb = facades.get(key);
    if (!fb) facades.set(key, (fb = new FacadeBuilder()));
    return fb;
  };
  const roofs = new MeshBuilder();
  const trims = new MeshBuilder();
  const solarB = new MeshBuilder();
  const calibrate = (hex: string): Rgb => {
    if (lib instanceof TwinMaterialLibrary) {
      const c = lib.calibrate("concreteFacade", hex);
      return [c.r, c.g, c.b];
    }
    return lin(hex);
  };
  const kit: DetailKit = {
    tier,
    concrete: new MeshBuilder(),
    paint: new MeshBuilder(),
    metal: new MeshBuilder(),
    glazing: new MeshBuilder(),
    clearGlass: new MeshBuilder(),
    emissive: new MeshBuilder(),
    pools: new MeshBuilder(),
    heightAt,
    facadeFor,
    roofs,
    trims,
    calibrate,
    paintCap: (ring, y, color, down) => capRing(kit.paint, ring, y, color, down),
    emissiveCap: (ring, y, color, down) => capRing(kit.emissive, ring, y, color, down),
    solar: (x, y, z, len, depth, along, tilt) => {
      // A tilted slab: local x along the row, tilted about it towards the sun (south-west);
      // UVs in panel metres so the cell grid runs with the row.
      const m = new THREE.Matrix4();
      const yaw = -Math.atan2(along[1], along[0]);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, yaw, 0, "YXZ"));
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
      const g = new THREE.BoxGeometry(len, 0.05, depth);
      const uv = g.getAttribute("uv");
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len, uv.getY(i) * depth);
      solarB.add(g, [1, 1, 1], m, "keep");
      g.dispose();
    },
  };

  // ── Walls, parapets, roofs ──
  let wallSpanCount = 0;
  const arcades: ArcadeSpan[] = [];
  const pilasterRuns: { span: WallSpan; solid: Solid; spec: PilasterSpec; bt: Built; top: number }[] = [];
  /** Walk colliders: the open (not covered by a neighbour or a hero building) ground-level walls. */
  const wallColliders: Collider2D[] = [];
  for (const bt of built) {
    const { info, recipe } = bt;
    const seedFrac = (bt.seed % 9973) / 9973;
    const wanted = (s: Solid) => recipe.solidTint?.(s, info) ?? recipe.tint;
    for (const s of bt.solids) {
      const solidFamilyKey = s.tag ?? recipe.family;
      const spans = wallSpans(s, index);
      const glassSolid = s.flatY === null && !!recipe.glassSlopes;
      const inner = s.flatY !== null ? insetRing(s.ring, 0.32) : null;
      for (const span of spans) {
        if (glassSolid) {
          // Sawtooth / atrium glazing: the vertical faces between sloped panes are glass too.
          glassWall(kit.glazing, span, s);
          continue;
        }
        const baseKey = recipe.spanFamily?.(span, s, info) ?? solidFamilyKey;
        const extraBands = recipe.spanBands?.(span, s, info) ?? [];
        const bands = extraBands.length && extraBands[0].from === -Infinity ? extraBands : [{ from: -Infinity, family: baseKey }, ...extraBands];
        const arcade = recipe.arcade?.(span, s, info) ?? null;
        const onGround = s.base < info.ground + 1.5 && !(info.bridge ?? false);
        if (onGround && span.coverSolid === null && !arcade) {
          wallColliders.push({ level: "outdoor", kind: "segment", a: span.a, b: span.b });
          const off = recipe.colliderOffset ?? 0;
          if (off > 0) {
            // A second line in front of the wall, lengthened by the offset so the corners stay closed.
            const len = Math.hypot(span.b[0] - span.a[0], span.b[1] - span.a[1]) || 1;
            const t: V2 = [(span.b[0] - span.a[0]) / len, (span.b[1] - span.a[1]) / len];
            const a: V2 = [span.a[0] + span.n[0] * off - t[0] * off, span.a[1] + span.n[1] * off - t[1] * off];
            const b: V2 = [span.b[0] + span.n[0] * off + t[0] * off, span.b[1] + span.n[1] * off + t[1] * off];
            wallColliders.push({ level: "outdoor", kind: "segment", a, b });
          }
        }
        let lo = -Infinity;
        if (arcade && span.coverSolid === null) {
          const g = Math.max(heightAt(span.a[0] + span.n[0] * 0.5, span.a[1] + span.n[1] * 0.5), heightAt(span.b[0] + span.n[0] * 0.5, span.b[1] + span.n[1] * 0.5));
          lo = g + arcade.height;
          arcades.push({ span, solid: s, soffit: lo, spec: arcade, family: baseKey, bt });
          if (onGround) wallColliders.push(...arcadeColliders(span, arcade));
        }
        for (let i = 0; i < bands.length; i++) {
          const band = bands[i];
          const famKey = band.family;
          const fam = FAMILIES[famKey] ?? FAMILIES.office;
          const rendered = renderFamily(famKey, tier);
          const emitted = emitSpan(facadeFor(rendered.key), span, s, {
            vRef: info.ground,
            k: bt.k,
            seed: seedFrac,
            tint: wallTint(fam, rendered, wanted(s)),
            parapet: i === bands.length - 1 ? fam.parapet : 0,
            groundAt: heightAt,
            lo: Math.max(lo, band.from),
            hi: i + 1 < bands.length ? bands[i + 1].from : Infinity,
          });
          if (!emitted) continue;
          wallSpanCount++;
          if (emitted.parapet && inner) emitParapet(trims, span, s, inner, emitted.roofY, emitted.topY, lin(fam.coping));
          if (i === bands.length - 1 && span.coverSolid === null && !arcade && s.flatY !== null) {
            const pil = recipe.pilasters?.(span, s, info) ?? null;
            if (pil) pilasterRuns.push({ span, solid: s, spec: pil, bt, top: emitted.topY });
          }
        }
      }
      // Roof surface.
      const roofHex = recipe.solidRoof?.(s, info) ?? recipe.roof ?? (FAMILIES[solidFamilyKey] ?? FAMILIES.office).roof;
      if (s.flatY !== null) {
        capRing(roofs, s.ring, s.flatY, calibrate(roofHex), false);
      } else if (glassSolid) {
        slopedCap(kit.glazing, s, [1, 1, 1]);
      } else {
        slopedCap(roofs, s, calibrate(recipe.pitchedRoof ?? "#4f4d4b"));
      }
    }
  }
  // Arcades: recessed ground storey, soffit, columns.
  for (const a of arcades) {
    const fam = FAMILIES[a.family] ?? FAMILIES.office;
    const rendered = renderFamily(a.family, tier);
    emitArcade(kit, facadeFor(rendered.key), a, {
      vRef: a.bt.info.ground,
      k: a.bt.k,
      seed: (a.bt.seed % 9973) / 9973,
      tint: wallTint(fam, rendered, a.bt.recipe.solidTint?.(a.solid, a.bt.info) ?? a.bt.recipe.tint),
      parapet: 0,
      groundAt: heightAt,
      lo: -Infinity,
      hi: Infinity,
    });
  }

  // Pilasters: brick piers proud of the wall, on the wall line's own rhythm.
  for (const p of pilasterRuns) {
    const fam = FAMILIES[p.spec.family] ?? FAMILIES.office;
    const rendered = renderFamily(p.spec.family, tier);
    const placed = emitPilasters(facadeFor(rendered.key), trims, p.span, p.spec, p.top, lin(fam.coping), {
      vRef: p.bt.info.ground,
      k: p.bt.k,
      seed: (p.bt.seed % 9973) / 9973,
      tint: wallTint(fam, rendered),
      parapet: 0,
      groundAt: heightAt,
      lo: -Infinity,
      hi: Infinity,
    });
    if (p.solid.base < p.bt.info.ground + 1.5 && !p.bt.info.bridge) wallColliders.push(...placed);
  }

  // ── Rooftop plant on the open flat roofs ──
  for (const bt of built) {
    if (bt.recipe.noUnits) continue;
    for (const s of bt.solids) {
      if (s.flatY === null) continue;
      rooftopPlant(kit, s, index, mulberry32(hashString(s.id)));
    }
  }

  // ── Canopies (slabs on posts) ──
  for (const c of canopies) canopy(kit, c, heightAt);

  // ── Bespoke details (hero-adjacent buildings, entrances, signs) ──
  const detail = buildDetails(kit, {
    campus,
    built: built.map((bt) => ({ b: bt.b, info: bt.info, solids: bt.solids, recipe: bt.recipe })),
    index,
    heightAt,
    arcades: arcades.map((a) => ({ a: a.span.a, b: a.span.b, n: a.span.n, depth: a.spec.depth, soffit: a.soffit })),
  });

  // ── Meshes ──
  const owned: { dispose(): void }[] = [];
  const facadeMaterials = new Map<string, THREE.MeshStandardMaterial>();
  const pickIds: Record<string, string> = { park: "parkcity", lowPark: "parkcity", station: "kupittaa-station" };
  const pickables: THREE.Object3D[] = [];
  for (const [key, fb] of facades) {
    const geo = fb.build();
    if (!geo) continue;
    const fam = FAMILIES[key];
    if (!fam) continue;
    const mat = makeFamilyMaterial(lib, fam, tier);
    facadeMaterials.set(key, mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `context-walls-${key}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (pickIds[key]) {
      mesh.userData.pickId = pickIds[key];
      pickables.push(mesh);
    }
    root.add(mesh);
  }
  const roofMat = makeRoofMaterial(lib);
  const trimMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15, name: "context-trim" });
  const concreteMat = makeConcreteDetailMaterial(lib);
  const paintMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, name: "context-paint" });
  const metalMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.85, name: "context-metal" });
  const glazingMat = makeGlazingMaterial(lib);
  const solarMat = makeSolarMaterial();
  const emissiveMat = new THREE.MeshBasicMaterial({ vertexColors: true, name: "context-lights", toneMapped: true });
  const poolMat = makePoolMaterial();
  owned.push(roofMat, trimMat, concreteMat, paintMat, metalMat, glazingMat, emissiveMat, poolMat, solarMat);
  const addMesh = (mb: MeshBuilder, mat: THREE.Material, name: string, cast: boolean, receive = true) => {
    const geo = mb.build();
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    root.add(mesh);
    return mesh;
  };
  addMesh(roofs, roofMat, "context-roofs", true);
  addMesh(trims, trimMat, "context-trims", true);
  addMesh(kit.concrete, concreteMat, "context-concrete", true);
  addMesh(kit.paint, paintMat, "context-paint", true);
  addMesh(kit.metal, metalMat, "context-metal", true);
  addMesh(kit.glazing, glazingMat, "context-glazing", false);
  // Shared library glass (not owned): reflections over a dimmed view through it.
  const clear = addMesh(kit.clearGlass, lib.get("glassInterior"), "context-clear-glass", false, false);
  if (clear) clear.renderOrder = 1;
  addMesh(solarB, solarMat, "context-solar", false);
  const lights = addMesh(kit.emissive, emissiveMat, "context-lights", false, false);
  const pools = addMesh(kit.pools, poolMat, "context-light-pools", false, false);
  if (pools) pools.renderOrder = 2;
  for (const obj of detail.objects) root.add(obj);
  pickables.push(...detail.pickables);

  // ── Labels ──
  const labels: CSS2DObject[] = [];
  for (const bt of built) {
    if (!bt.recipe.label) continue;
    const ring = bt.footprints[0] ?? bt.b.polygon;
    const [lx, lz] = polygonCentroid(ring);
    const top = Math.max(...bt.solids.map(solidTop));
    const label = makeLabel(bt.recipe.label, "building", lx, top + 4, lz, "campus");
    label.userData.osmId = bt.b.osmId;
    labels.push(label);
    root.add(label);
  }

  // ── Walk-mode colliders (outdoor level): open ground-level walls, arcades walkable to their recessed wall ──
  const colliders: Collider2D[] = [...wallColliders, ...detail.extraColliders];

  // ── Targets (lib/hackathon-2026/twin.ts: campus landmarks) ──
  const targets: TwinTarget[] = detail.targets;
  const views: Record<string, CameraView> = {};

  // ── Night ──
  const lightsOn = (state: LightingState) => THREE.MathUtils.smoothstep(state.night, 0.28, 0.62);
  const setLighting = (state: LightingState) => {
    const on = lightsOn(state);
    emissiveMat.color.setScalar(on);
    poolMat.color.setScalar(on);
    if (lights) lights.visible = on > 0.001;
    if (pools) pools.visible = on > 0.001;
    const glazingUniforms = glazingMat.userData.uniforms as { uCtxNight: { value: number } } | undefined;
    if (glazingUniforms) glazingUniforms.uCtxNight.value = on;
    detail.setLighting(on, state);
    ctx.invalidate();
  };
  setLighting(ctx.lighting());

  // Claimed: what is built here, plus buildings whose LOD2 parts other buildings' records model.
  const absorbed = mine.filter((b) => !partsOf.has(b.id) && (recsOf.get(b.id) ?? []).some((r) => splitRecs.has(r)));
  const claims = [...new Set([...built.map((bt) => bt.b.osmId), ...canopies.map((c) => c.osmId), ...absorbed.map((b) => b.osmId)])].filter((id) => id > 0);

  const contextModule: WorldModule & {
    stats(): Record<string, number>;
    buildings(): { id: string; name: string | null; role: string | null; family: string; solids: number; top: number }[];
  } = {
    id: "context",
    root,
    labels,
    pickables,
    targets,
    views,
    colliders,
    claims,
    ready: lib.ready().then(() => detail.ready),
    setLighting,
    tick(_dt, _elapsed, camera) {
      // LOD swaps only (no animation): ask for a frame when something changed, never keep the loop awake.
      if (detail.tick(camera)) ctx.invalidate();
      return false;
    },
    buildings: () =>
      built.map((bt) => ({
        id: bt.b.id,
        name: bt.b.name ?? null,
        role: bt.b.role ?? null,
        family: bt.recipe.family,
        solids: bt.solids.length,
        top: Math.round(Math.max(...bt.solids.map(solidTop)) * 10) / 10,
      })),
    stats: () => ({
      buildings: built.length,
      colliders: colliders.length,
      solids: allMine.length,
      ghosts: ghosts.length,
      spans: wallSpanCount,
      canopies: canopies.length,
      ...meshStats(root),
    }),
    dispose() {
      for (const m of facadeMaterials.values()) m.dispose();
      for (const o of owned) o.dispose();
      detail.dispose();
    },
  };
  // QA hook (debug pages only): window.__twinContext.stats() → this module's draw calls and triangles.
  if (debugEnabled()) (window as Window & { __twinContext?: typeof contextModule }).__twinContext = contextModule;
  return contextModule;
}

/** Draw calls (visible meshes) and triangles under a root (instanced meshes × instances). */
function meshStats(root: THREE.Object3D): { drawCalls: number; triangles: number; meshes: number } {
  let drawCalls = 0;
  let triangles = 0;
  let meshes = 0;
  root.traverseVisible((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshes++;
    drawCalls++;
    const g = mesh.geometry;
    const count = g.index ? g.index.count : g.getAttribute("position").count;
    const inst = (o as THREE.InstancedMesh).isInstancedMesh ? (o as THREE.InstancedMesh).count : 1;
    triangles += (count / 3) * inst;
  });
  return { drawCalls, triangles: Math.round(triangles), meshes };
}

// ── Walls ────────────────────────────────────────────────────────────────────

interface EmitOptions {
  vRef: number;
  k: number;
  seed: number;
  tint: Rgb;
  parapet: number;
  groundAt(x: number, z: number): number;
  /** Clip the wall to [lo, hi] (bands, arcades); the facade grid is unaffected. */
  lo: number;
  hi: number;
}

/**
 * One visible wall span → facade quads (≤ 8 m pieces so the window line follows the ground).
 * Returns the roof level and wall top when a parapet was added (null when nothing is visible).
 */
function emitSpan(fb: FacadeBuilder, span: WallSpan, s: Solid, o: EmitOptions): { parapet: boolean; roofY: number; topY: number } | null {
  const { a, b, n } = span;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len < 0.05) return null;
  const open = span.coverSolid === null;
  const coverAt = (t: number) => (open ? -Infinity : span.cover0 + (span.cover1 - span.cover0) * t);
  const roofAt = (x: number, z: number) => s.top(x, z);
  const roofMid = roofAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  const coverMax = Math.max(coverAt(0), coverAt(1));
  if (coverMax >= Math.max(roofAt(a[0], a[1]), roofAt(b[0], b[1])) - 0.03) return null;
  // A real roof edge gets a parapet; a small step between nearly level roofs only a plain wall.
  const parapet = s.flatY !== null && o.parapet > 0 && roofMid - coverMax > 1.0 && o.hi === Infinity;
  const extra = parapet ? o.parapet : 0;
  const pieces = open ? Math.max(1, Math.ceil(len / 8)) : 1;
  const dx = (b[0] - a[0]) / len;
  const dz = (b[1] - a[1]) / len;
  // u along the wall line: collinear walls share their window rhythm.
  const uLine = (x: number, z: number) => x * dx + z * dz;
  let any = false;
  for (let p = 0; p < pieces; p++) {
    const t0 = p / pieces;
    const t1 = (p + 1) / pieces;
    const x0 = a[0] + (b[0] - a[0]) * t0;
    const z0 = a[1] + (b[1] - a[1]) * t0;
    const x1 = a[0] + (b[0] - a[0]) * t1;
    const z1 = a[1] + (b[1] - a[1]) * t1;
    const c0 = coverAt(t0);
    const c1 = coverAt(t1);
    const fullTop0 = roofAt(x0, z0) + extra;
    const fullTop1 = roofAt(x1, z1) + extra;
    const bottom0 = Math.max(s.base, c0, o.lo);
    const bottom1 = Math.max(s.base, c1, o.lo);
    const top0 = Math.min(fullTop0, o.hi);
    const top1 = Math.min(fullTop1, o.hi);
    if (top0 - bottom0 < 0.02 && top1 - bottom1 < 0.02) continue;
    const g0 = open ? o.groundAt(x0 + n[0] * 0.6, z0 + n[1] * 0.6) : c0;
    const g1 = open ? o.groundAt(x1 + n[0] * 0.6, z1 + n[1] * 0.6) : c1;
    const u0 = uLine(x0, z0);
    const u1 = uLine(x1, z1);
    const f = (y: number) => (y - o.vRef) * o.k;
    const vtx = (x: number, y: number, z: number, u: number, top: number, g: number) => ({
      x,
      y,
      z,
      u,
      v: f(y),
      vt: y - o.vRef,
      top: f(top),
      ground: f(g),
    });
    fb.quad(
      [
        vtx(x0, bottom0, z0, u0, fullTop0, g0),
        vtx(x1, bottom1, z1, u1, fullTop1, g1),
        vtx(x1, Math.max(top1, bottom1), z1, u1, fullTop1, g1),
        vtx(x0, Math.max(top0, bottom0), z0, u0, fullTop0, g0),
      ],
      n,
      o.seed,
      o.tint,
    );
    any = true;
  }
  if (!any) return null;
  return { parapet, roofY: s.flatY ?? roofMid, topY: (s.flatY ?? roofMid) + extra };
}

/** A ground-storey arcade along a wall span (recipe.arcade). */
interface ArcadeSpan {
  span: WallSpan;
  solid: Solid;
  /** Soffit level (y). */
  soffit: number;
  spec: NonNullable<ReturnType<NonNullable<Recipe["arcade"]>>>;
  family: string;
  bt: Built;
}

/** Colliders of an arcade span: the recessed wall, the end returns and the columns. */
function arcadeColliders(span: WallSpan, spec: NonNullable<ReturnType<NonNullable<Recipe["arcade"]>>>): Collider2D[] {
  const d = spec.depth;
  const ia: V2 = [span.a[0] - span.n[0] * d, span.a[1] - span.n[1] * d];
  const ib: V2 = [span.b[0] - span.n[0] * d, span.b[1] - span.n[1] * d];
  const out: Collider2D[] = [{ level: "outdoor", kind: "segment", a: ia, b: ib }];
  if (!span.atStart) out.push({ level: "outdoor", kind: "segment", a: span.a, b: ia });
  if (!span.atEnd) out.push({ level: "outdoor", kind: "segment", a: ib, b: span.b });
  if (spec.radius > 0) {
    const len = Math.hypot(span.b[0] - span.a[0], span.b[1] - span.a[1]);
    const count = Math.max(1, Math.round(len / spec.pitch));
    for (let i = 0; i <= count; i++) {
      const t = (0.35 + (len - 0.7) * (i / count)) / len;
      const x = span.a[0] + (span.b[0] - span.a[0]) * t - span.n[0] * (spec.radius + 0.08);
      const z = span.a[1] + (span.b[1] - span.a[1]) * t - span.n[1] * (spec.radius + 0.08);
      out.push({ level: "outdoor", kind: "circle", c: [x, z], r: spec.radius * (spec.square ? 1.42 : 1) });
    }
  }
  return out;
}

/** Recessed shopfront wall, soffit, end returns and round columns on the facade line. */
function emitArcade(kit: DetailKit, fb: FacadeBuilder, a: ArcadeSpan, o: EmitOptions) {
  const { span, spec } = a;
  const d = spec.depth;
  const ia: V2 = [span.a[0] - span.n[0] * d, span.a[1] - span.n[1] * d];
  const ib: V2 = [span.b[0] - span.n[0] * d, span.b[1] - span.n[1] * d];
  const inner: WallSpan = { ...span, a: ia, b: ib, coverSolid: null, cover0: -Infinity, cover1: -Infinity };
  // The recessed wall uses the facade's ground storey (storefront glazing).
  emitSpan(fb, inner, a.solid, { ...o, lo: -Infinity, hi: a.soffit });
  const soffitColor: Rgb = lin(spec.soffit ?? "#c9cbcb");
  // Soffit (faces down).
  kit.paint.quad([span.a[0], a.soffit, span.a[1]], [ia[0], a.soffit, ia[1]], [ib[0], a.soffit, ib[1]], [span.b[0], a.soffit, span.b[1]], soffitColor);
  // End returns where the arcade stops inside a wall.
  const ret = (p: V2, q: V2, flip: boolean) => {
    const g = Math.min(kit.heightAt(p[0], p[1]), kit.heightAt(q[0], q[1])) - 0.3;
    if (flip) kit.paint.quad([q[0], g, q[1]], [p[0], g, p[1]], [p[0], a.soffit, p[1]], [q[0], a.soffit, q[1]], soffitColor);
    else kit.paint.quad([p[0], g, p[1]], [q[0], g, q[1]], [q[0], a.soffit, q[1]], [p[0], a.soffit, p[1]], soffitColor);
  };
  if (!span.atStart) ret(span.a, ia, false);
  if (!span.atEnd) ret(ib, span.b, false);
  // Columns on the facade line, inset from the ends.
  if (spec.radius <= 0) return;
  const len = Math.hypot(span.b[0] - span.a[0], span.b[1] - span.a[1]);
  const count = Math.max(1, Math.round(len / spec.pitch));
  const colColor: Rgb = lin(spec.color);
  const t: V2 = [(span.b[0] - span.a[0]) / len, (span.b[1] - span.a[1]) / len];
  // Brick piers: walls of a facade family (same brick as the building), else painted / concrete columns.
  const pierFam = spec.square && spec.pierFamily ? (FAMILIES[spec.pierFamily] ?? null) : null;
  const pierRendered = pierFam ? renderFamily(pierFam.key, kit.tier) : null;
  for (let i = 0; i <= count; i++) {
    const tt = (0.35 + (len - 0.7) * (i / count)) / len;
    const x = span.a[0] + (span.b[0] - span.a[0]) * tt - span.n[0] * (spec.radius + 0.08);
    const z = span.a[1] + (span.b[1] - span.a[1]) * tt - span.n[1] * (spec.radius + 0.08);
    const g = kit.heightAt(x, z) - 0.2;
    if (pierFam && pierRendered) {
      facadeBox(kit.facadeFor(pierRendered.key), null, [x, z], t, spec.radius * 2, spec.radius * 2, g - 0.1, a.soffit + 0.01, null, { ...o, tint: wallTint(pierFam, pierRendered) });
    } else if (spec.square) {
      const yaw = -Math.atan2(span.b[1] - span.a[1], span.b[0] - span.a[0]);
      box(kit.concrete, x, (g + a.soffit) / 2, z, spec.radius * 2, a.soffit - g, spec.radius * 2, yaw, colColor);
    } else column(kit.paint, x, z, spec.radius, g, a.soffit + 0.01, colColor, 12);
  }
}

/**
 * Pilasters along an open wall span: on the wall line's global rhythm (collinear spans share it) and
 * at the span's corners, from below the ground to the parapet top. Returns their walk colliders.
 */
function emitPilasters(fb: FacadeBuilder, caps: MeshBuilder, span: WallSpan, spec: PilasterSpec, top: number, cap: Rgb, o: EmitOptions): Collider2D[] {
  const len = Math.hypot(span.b[0] - span.a[0], span.b[1] - span.a[1]);
  const w = spec.width;
  const at = pilasterCentres(span, spec.pitch, w);
  if (!at.length) return [];
  const t: V2 = [(span.b[0] - span.a[0]) / len, (span.b[1] - span.a[1]) / len];
  const d = spec.depth + 0.25;
  const out: Collider2D[] = [];
  for (const s of at) {
    const wx = span.a[0] + t[0] * s;
    const wz = span.a[1] + t[1] * s;
    const c: V2 = [wx + span.n[0] * (spec.depth - d / 2), wz + span.n[1] * (spec.depth - d / 2)];
    const g = Math.min(o.groundAt(wx + span.n[0] * 0.6, wz + span.n[1] * 0.6), o.groundAt(wx, wz)) - 0.3;
    facadeBox(fb, caps, c, t, w, d, g, top, cap, o);
    // Collider: the front and the two sides out from the wall.
    const f0: V2 = [wx - t[0] * (w / 2) + span.n[0] * spec.depth, wz - t[1] * (w / 2) + span.n[1] * spec.depth];
    const f1: V2 = [wx + t[0] * (w / 2) + span.n[0] * spec.depth, wz + t[1] * (w / 2) + span.n[1] * spec.depth];
    out.push(
      { level: "outdoor", kind: "segment", a: f0, b: f1 },
      { level: "outdoor", kind: "segment", a: [wx - t[0] * (w / 2), wz - t[1] * (w / 2)], b: f0 },
      { level: "outdoor", kind: "segment", a: f1, b: [wx + t[0] * (w / 2), wz + t[1] * (w / 2)] },
    );
  }
  return out;
}

/**
 * A box with facade walls (piers, pilasters): four sides as facade quads of the builder's family
 * (u along each face, the facade grid from o.vRef), and a flat cap (null = none).
 * `c` = centre, `t` = unit direction of the width; the front faces (−t.z, t.x).
 */
function facadeBox(fb: FacadeBuilder, caps: MeshBuilder | null, c: V2, t: V2, w: number, d: number, y0: number, y1: number, cap: Rgb | null, o: EmitOptions) {
  const n: V2 = [-t[1], t[0]];
  const P = (sw: number, sd: number): V2 => [c[0] + t[0] * sw * (w / 2) + n[0] * sd * (d / 2), c[1] + t[1] * sw * (w / 2) + n[1] * sd * (d / 2)];
  // Counter-clockwise (the module's convention): front, right side, back, left side.
  const ring: V2[] = [P(-1, 1), P(1, 1), P(1, -1), P(-1, -1)];
  const f = (y: number) => (y - o.vRef) * o.k;
  for (let i = 0; i < 4; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % 4];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-3) continue;
    const e: V2 = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    const nn: V2 = [-e[1], e[0]];
    const u = (p: V2) => p[0] * e[0] + p[1] * e[1];
    const g = f(y0 + 0.3);
    const vtx = (p: V2, y: number) => ({ x: p[0], y, z: p[1], u: u(p), v: f(y), vt: y - o.vRef, top: f(y1), ground: g });
    fb.quad([vtx(a, y0), vtx(b, y0), vtx(b, y1), vtx(a, y1)], nn, o.seed, o.tint);
  }
  if (caps && cap) capRing(caps, ring, y1 + 0.004, cap, false);
}

/** Inner face and coping cap of a parapet along one span (inner line from the mitred inset ring). */
function emitParapet(mb: MeshBuilder, span: WallSpan, s: Solid, inner: V2[], roofY: number, topY: number, color: Rgb) {
  const n = s.ring.length;
  const d = 0.32;
  const ai: V2 = span.atStart ? inner[span.edge] : [span.a[0] - span.n[0] * d, span.a[1] - span.n[1] * d];
  const bi: V2 = span.atEnd ? inner[(span.edge + 1) % n] : [span.b[0] - span.n[0] * d, span.b[1] - span.n[1] * d];
  // Inner face (faces the roof).
  mb.quad([bi[0], roofY, bi[1]], [ai[0], roofY, ai[1]], [ai[0], topY, ai[1]], [bi[0], topY, bi[1]], color);
  // Cap (faces up), a hair above the wall top so it never fights the facade.
  const y = topY + 0.005;
  mb.quad([span.a[0], y, span.a[1]], [span.b[0], y, span.b[1]], [bi[0], y, bi[1]], [ai[0], y, ai[1]], color);
}

/** A vertical glass face of a sloped glazing solid (sawtooth north lights), from what covers it up to the slope. */
function glassWall(mb: MeshBuilder, span: WallSpan, s: Solid) {
  const open = span.coverSolid === null;
  const b0 = Math.max(s.base, open ? -Infinity : span.cover0);
  const b1 = Math.max(s.base, open ? -Infinity : span.cover1);
  const t0 = s.top(span.a[0], span.a[1]);
  const t1 = s.top(span.b[0], span.b[1]);
  if (t0 - b0 < 0.03 && t1 - b1 < 0.03) return;
  mb.quad([span.a[0], b0, span.a[1]], [span.b[0], b1, span.b[1]], [span.b[0], Math.max(t1, b1), span.b[1]], [span.a[0], Math.max(t0, b0), span.a[1]], [1, 1, 1]);
}

/** A sloped LOD2 face (plane through its ring), facing up. */
function slopedCap(mb: MeshBuilder, s: Solid, color: Rgb) {
  const contour = s.ring.map(([x, z]) => new THREE.Vector2(x, -z));
  const faces = THREE.ShapeUtils.triangulateShape(contour, []);
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  // Normal of the plane from three ring points.
  const p0 = s.ring[0];
  const y0 = s.top(p0[0], p0[1]);
  const e1 = new THREE.Vector3(1, s.top(p0[0] + 1, p0[1]) - y0, 0);
  const e2 = new THREE.Vector3(0, s.top(p0[0], p0[1] + 1) - y0, 1);
  const nn = new THREE.Vector3().crossVectors(e2, e1).normalize();
  if (nn.y < 0) nn.negate();
  // UVs along the face's longest edge (metres): the glazing's mullion grid then runs with the building, not
  // diagonally across it (round 1: atrium glazing read as chain-link fencing on the roofs).
  let best = 0;
  let ax: V2 = [1, 0];
  for (let i = 0; i < s.ring.length; i++) {
    const a = s.ring[i];
    const b = s.ring[(i + 1) % s.ring.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l > best) {
      best = l;
      ax = [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
    }
  }
  for (const [x, z] of s.ring) {
    const y = s.top(x, z);
    positions.push(x, y, z);
    normals.push(nn.x, nn.y, nn.z);
    // Along the edge, and across it measured on the slope (so panes keep their size on steep glass).
    const across = -x * ax[1] + z * ax[0];
    uvs.push(x * ax[0] + z * ax[1], across * Math.hypot(1, Math.abs(nn.y) > 1e-3 ? Math.sqrt(1 - nn.y * nn.y) / nn.y : 0));
  }
  const idx: number[] = [];
  for (const [a, b, c] of faces) {
    const [ax, az] = s.ring[a];
    const [bx, bz] = s.ring[b];
    const [cx, cz] = s.ring[c];
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    if (ny > 0) idx.push(a, b, c);
    else idx.push(a, c, b);
  }
  mb.raw(positions, normals, uvs, idx, color);
}

// ── Rooftop plant ────────────────────────────────────────────────────────────

/** Air handling units, condensers with fans, vents and hatches on an open flat roof. */
function rooftopPlant(kit: DetailKit, s: Solid, index: SolidIndex, rnd: () => number) {
  const y = s.flatY as number;
  const a = Math.abs(ringArea(s.ring));
  if (a < 140) return;
  const lowTier = kit.tier === "low";
  // Main axis = longest edge.
  let best = 0;
  let ang = 0;
  for (let i = 0; i < s.ring.length; i++) {
    const p = s.ring[i];
    const q = s.ring[(i + 1) % s.ring.length];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (l > best) {
      best = l;
      ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    }
  }
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const b = polygonBounds(s.ring);
  const free = (cx: number, cz: number, w: number, d: number) => {
    const corners: V2[] = [
      [-w / 2 - 1.2, -d / 2 - 1.2],
      [w / 2 + 1.2, -d / 2 - 1.2],
      [w / 2 + 1.2, d / 2 + 1.2],
      [-w / 2 - 1.2, d / 2 + 1.2],
      [0, 0],
    ].map(([u, v]) => [cx + u * ca - v * sa, cz + u * sa + v * ca] as V2);
    if (!corners.every((p) => pointInRing(p, s.ring))) return false;
    // Nothing taller standing there (plant rooms, the next part up).
    return corners.every((p) => {
      const c = index.coverAt(p, s);
      return c.y < y + 0.3;
    });
  };
  const count = Math.min(lowTier ? 4 : 10, 1 + Math.floor(a / (lowTier ? 600 : 260)));
  const grey: Rgb = lin("#b4b8ba");
  const greyDark: Rgb = lin("#7c8185");
  const fan: Rgb = lin("#2a2c2e");
  const yaw = -ang;
  let placed = 0;
  for (let tries = 0; placed < count && tries < 80; tries++) {
    const cx = b.minX + rnd() * (b.maxX - b.minX);
    const cz = b.minZ + rnd() * (b.maxZ - b.minZ);
    const kind = rnd();
    if (kind < 0.42) {
      // Air handling unit: long box with a darker louvre band and a flue.
      const w = 3 + rnd() * 4.5;
      const d = 1.6 + rnd() * 1.2;
      const h = 1.5 + rnd() * 0.9;
      if (!free(cx, cz, w, d)) continue;
      box(kit.paint, cx, y + h / 2, cz, w, h, d, yaw, grey);
      box(kit.paint, cx + ca * (w / 2 + 0.01), y + h * 0.55, cz + sa * (w / 2 + 0.01), 0.02, h * 0.6, d * 0.8, yaw, greyDark);
      if (!lowTier) box(kit.metal, cx - ca * w * 0.3, y + h + 0.35, cz - sa * w * 0.3, 0.7, 0.7, 0.7, yaw, lin("#a7abae"));
    } else if (kind < 0.7) {
      // Condenser bank: boxes with round fans on top.
      const units = 1 + Math.floor(rnd() * 3);
      const w = 1.25 * units;
      const d = 2.3;
      if (!free(cx, cz, w, d)) continue;
      box(kit.paint, cx, y + 0.65, cz, w, 1.3, d, yaw, grey);
      if (!lowTier) {
        for (let u = 0; u < units; u++) {
          for (const v of [-0.55, 0.55]) {
            const lu = -w / 2 + 0.625 + u * 1.25;
            disc(kit.paint, cx + lu * ca - v * sa, y + 1.31, cz + lu * sa + v * ca, 0.48, fan, false, 10);
          }
        }
      }
    } else if (kind < 0.85) {
      // Exhaust fans (mushroom vents).
      if (!free(cx, cz, 0.8, 0.8)) continue;
      column(kit.metal, cx, cz, 0.32, y, y + 0.55, lin("#a9adb0"), 10, false);
      column(kit.metal, cx, cz, 0.46, y + 0.55, y + 0.75, lin("#b7bbbe"), 10, false);
    } else {
      // Roof hatch with a guard rail, or a vent pipe cluster.
      if (!free(cx, cz, 1.2, 1.2)) continue;
      if (rnd() < 0.5) {
        box(kit.paint, cx, y + 0.35, cz, 1.0, 0.7, 1.2, yaw, greyDark);
      } else {
        for (let i = 0; i < 3; i++) {
          const ox = (rnd() - 0.5) * 1.2;
          const oz = (rnd() - 0.5) * 1.2;
          const h = 0.6 + rnd() * 0.9;
          pipe(kit.metal, [cx + ox, y, cz + oz], [cx + ox, y + h, cz + oz], 0.08 + rnd() * 0.06, lin("#9fa3a6"), 6, false);
        }
      }
    }
    placed++;
  }
}

// ── Canopies ─────────────────────────────────────────────────────────────────

/** A roof on posts (OSM building=roof, raised parts): slab with a fascia, thin posts at the corners. */
function canopy(kit: DetailKit, c: CampusBuilding, heightAt: (x: number, z: number) => number) {
  const ring = ensureCCW(cleanRing(c.polygon));
  if (ring.length < 3) return;
  const ground = c.groundY ?? Math.min(...ring.map(([x, z]) => heightAt(x, z)));
  const top = c.roofY ?? ground + c.height;
  const base = Math.max(c.baseY ?? top - 0.4, top - 0.6);
  // Station platform canopies: only the slab here — their rust-red columns, beams, light soffit and lamps are
  // world/ground.ts's (canopyFrames, the "canopy" lamp specs), so the structure exists once (SPEC §4.5).
  const station = c.osmId === 526090187 || c.osmId === 526090188;
  kit.paint.add(prismGeometry(ring, base, top), lin(station ? "#dfe2e2" : "#c4c7c8"));
  if (station) return;
  const posts: Rgb = lin("#3d4043");
  const a = Math.abs(ringArea(ring));
  if (a < 6) return;
  // Posts along the longest axis, every ~6.5 m on the centre line, or at the ends.
  let best = 0;
  let pa: V2 = ring[0];
  let pb: V2 = ring[1];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i];
    const q = ring[(i + 1) % ring.length];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    if (l > best) {
      best = l;
      pa = p;
      pb = q;
    }
  }
  const [cx, cz] = polygonCentroid(ring);
  const dx = (pb[0] - pa[0]) / best;
  const dz = (pb[1] - pa[1]) / best;
  // Project the ring onto the long axis through the centroid.
  let lo = Infinity;
  let hi = -Infinity;
  for (const [x, z] of ring) {
    const t = (x - cx) * dx + (z - cz) * dz;
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  }
  const steps = Math.max(1, Math.round((hi - lo - 2) / 6.5));
  for (let i = 0; i <= steps; i++) {
    const t = lo + 1 + ((hi - lo - 2) * i) / steps;
    const x = cx + dx * t;
    const z = cz + dz * t;
    if (!pointInRing([x, z], ring)) continue;
    const g = heightAt(x, z);
    if (base - g < 1.8 || base - g > 12) continue;
    column(kit.paint, x, z, 0.08, g, base, posts, 8);
  }
}

function prismGeometry(ring: readonly V2[], y0: number, y1: number): THREE.BufferGeometry {
  const mb = new MeshBuilder();
  const n = ring.length;
  const white: Rgb = [1, 1, 1];
  for (let i = 0; i < n; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % n];
    mb.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], white);
  }
  capRing(mb, ring, y1, white, false);
  capRing(mb, ring, y0, white, true);
  return mb.build() as THREE.BufferGeometry;
}

// ── Materials ────────────────────────────────────────────────────────────────

/** Roof membranes: concrete-like texture × per-roof colour, stains and seams (procedural). */
function makeRoofMaterial(lib: TwinContext["materials"]): THREE.MeshStandardMaterial {
  const base = lib.get("concreteFacade");
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: base.map,
    normalMap: base.normalMap,
    roughnessMap: base.roughnessMap,
    roughness: 1,
    metalness: 0,
    name: "context-roofs",
  });
  m.normalScale.set(0.5, 0.5);
  m.customProgramCacheKey = () => "context-roofs";
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCtxRoofW;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvCtxRoofW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vCtxRoofW;
float ctxRH( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
float ctxRN( vec2 p ) { vec2 i = floor( p ); vec2 f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f );
	return mix( mix( ctxRH( i ), ctxRH( i + vec2( 1, 0 ) ), u.x ), mix( ctxRH( i + vec2( 0, 1 ) ), ctxRH( i + vec2( 1, 1 ) ), u.x ), u.y ); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
	{
		// Weathering: ponding stains, lighter dry patches, membrane seams every 1 m.
		vec2 p = vCtxRoofW.xz;
		float stain = ctxRN( p / 6.0 ) * 0.6 + ctxRN( p / 2.1 ) * 0.4;
		diffuseColor.rgb *= 0.82 + 0.3 * stain;
		vec2 fw = max( fwidth( p ), vec2( 1e-3 ) );
		float sx = abs( fract( p.x ) - 0.5 ) * 2.0;
		float seam = ( 1.0 - smoothstep( 0.9, 0.97, sx ) ) * ( 1.0 - smoothstep( 0.15, 0.4, fw.x ) );
		diffuseColor.rgb *= 1.0 - 0.07 * ( 1.0 - seam ) * ( 1.0 - smoothstep( 0.15, 0.4, fw.x ) );
	}`,
      );
  };
  return m;
}

/** Concrete details (columns, slabs, plinths): the facade concrete texture × vertex colour. */
function makeConcreteDetailMaterial(lib: TwinContext["materials"]): THREE.MeshStandardMaterial {
  const base = lib.get("concreteFacade");
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: base.map,
    normalMap: base.normalMap,
    roughnessMap: base.roughnessMap,
    roughness: 1,
    metalness: 0,
    name: "context-concrete",
  });
  m.normalScale.set(0.6, 0.6);
  return m;
}

/**
 * Sloped glazing (atria, sawtooth roofs, glass drums): smooth coated glass with a
 * mullion grid, glowing warm from the lit space below after dusk.
 */
function makeGlazingMaterial(lib: TwinContext["materials"]): THREE.MeshStandardMaterial {
  const m = lib.variant("glassFacade", { color: "#1d2a35", roughness: 0.06, envMapIntensity: 1.3 });
  m.vertexColors = false;
  m.name = "context-glazing";
  const uniforms = { uCtxNight: { value: 0 } };
  m.userData.uniforms = uniforms;
  m.customProgramCacheKey = () => "context-glazing-v2";
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    // Lit share of offices for the time of day (weekend nights are mostly dark).
    shader.uniforms.uFcOccupancy = FACADE_GLOBALS.uFcOccupancy;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCtxGW;\nvarying float vCtxUp;\nvarying vec2 vCtxUv;")
      .replace(
        "#include <worldpos_vertex>",
        "#include <worldpos_vertex>\nvCtxGW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\nvCtxUp = normalize( mat3( modelMatrix ) * objectNormal ).y;\nvCtxUv = uv;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vCtxGW;
varying float vCtxUp;
varying vec2 vCtxUv;
uniform float uCtxNight;
uniform vec4 uFcOccupancy;
float ctxGrid;
float ctxGH( vec3 p ) { p = fract( p * vec3( 0.1031, 0.1030, 0.0973 ) ); p += dot( p, p.yxz + 33.33 ); return fract( ( p.x + p.y ) * p.z ); }`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
	{
		// Mullion grid ≈ 1.2 × 1.5 m on the pane's own metre UVs (aligned with the building), box-filtered.
		vec2 g = vCtxUv / vec2( 1.2, 1.5 );
		vec2 fw = max( fwidth( g ), vec2( 1e-3 ) );
		vec2 w = vec2( 0.05 );
		vec2 a = clamp( ( w - abs( fract( g ) - 0.5 ) * 2.0 * 0.5 + 0.5 * fw ) / fw, 0.0, 1.0 );
		ctxGrid = max( a.x, a.y ) * ( 1.0 - smoothstep( 0.3, 0.8, max( fw.x, fw.y ) ) );
		diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.55, 0.57, 0.6 ), ctxGrid );
	}`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
	{
		// The space below glows through the glass after dusk: soft pools where it is in use (the share in use
		// follows office occupancy: Friday evening busy, weekend nights almost dark), faint emergency light elsewhere.
		float occ = clamp( uFcOccupancy.x, 0.0, 1.0 );
		vec2 q = vCtxGW.xz / 9.0;
		vec2 i = floor( q );
		vec2 f = fract( q );
		vec2 u = f * f * ( 3.0 - 2.0 * f );
		float n = mix( mix( ctxGH( vec3( i, 1.0 ) ), ctxGH( vec3( i + vec2( 1.0, 0.0 ), 1.0 ) ), u.x ),
			mix( ctxGH( vec3( i + vec2( 0.0, 1.0 ), 1.0 ) ), ctxGH( vec3( i + vec2( 1.0, 1.0 ), 1.0 ) ), u.x ), u.y );
		float lit = smoothstep( 1.0 - occ - 0.12, 1.0 - occ + 0.12, n );
		// Roof lights and sloped glazing are seen from above: the room below shows as a faint glow, not a lit
		// disc (round 1: DataCity's round skylights read as 10 m landing pads in every night aerial). Only a
		// share of them is lit (per 4 m cell), dimmer towards the edges of each cell.
		float roofK = smoothstep( 0.45, 0.8, vCtxUp );
		vec2 rc = floor( vCtxGW.xz / 4.0 );
		vec2 rf = fract( vCtxGW.xz / 4.0 ) - 0.5;
		float roofLit = step( 0.62, ctxGH( vec3( rc, 7.0 ) ) ) * ( 1.0 - smoothstep( 0.15, 0.5, length( rf ) ) );
		float wallGlow = 0.0012 + 0.014 * lit;
		float roofGlow = 0.0003 + 0.0032 * roofLit * lit;
		totalEmissiveRadiance += vec3( 1.0, 0.87, 0.7 ) * uCtxNight * mix( wallGlow, roofGlow, roofK ) * ( 1.0 - ctxGrid );
	}`,
      );
  };
  return m;
}

/** Solar panels: dark blue-black cells in silver frames (procedural from the box UV, box-filtered). */
function makeSolarMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.15, name: "context-solar", vertexColors: true });
  m.customProgramCacheKey = () => "context-solar";
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vCtxSUv;")
      .replace("#include <uv_vertex>", "#include <uv_vertex>\nvCtxSUv = uv;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec2 vCtxSUv;")
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
	{
		// Cells ≈ 0.16 m in 1.0 × 1.7 m modules with silver frames, in panel metres; faded with distance.
		vec2 p = vCtxSUv;
		vec2 fw = max( fwidth( p ), vec2( 1e-3 ) );
		vec2 cell = abs( fract( p / 0.166 ) - 0.5 );
		float lines = 1.0 - smoothstep( 0.42, 0.5, max( cell.x, cell.y ) );
		float fade = 1.0 - smoothstep( 0.03, 0.12, max( fw.x, fw.y ) );
		vec2 mod2 = abs( fract( p / vec2( 1.0, 1.7 ) ) - 0.5 );
		float frame = smoothstep( 0.46, 0.49, max( mod2.x, mod2.y ) ) * ( 1.0 - smoothstep( 0.2, 0.6, max( fw.x, fw.y ) ) );
		vec3 cellC = vec3( 0.018, 0.028, 0.05 );
		vec3 c = mix( cellC * 1.6, cellC, mix( 1.0, lines, fade ) );
		c = mix( c, vec3( 0.55, 0.57, 0.6 ), frame );
		diffuseColor.rgb = c;
	}`,
      );
  };
  return m;
}

/** Additive light pools on the ground under entrance downlights (radial falloff from the UV). */
function makePoolMaterial(): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    name: "context-light-pools",
  });
  m.customProgramCacheKey = () => "context-pools";
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
	{
		// UV in [-1, 1]: soft radial pool.
		float r = length( vMapUv * 2.0 - 1.0 );
		diffuseColor.rgb *= pow( max( 0.0, 1.0 - r ), 2.2 );
	}`,
    );
  };
  // vMapUv needs a map define: use a 1×1 white map.
  const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  tex.needsUpdate = true;
  m.map = tex;
  return m;
}

/** Highest point of a solid's roof (sloped roofs: over the ring's corners, not the bounding box's). */
function solidTop(s: Solid): number {
  if (s.flatY !== null) return s.flatY;
  let y = -Infinity;
  for (const [x, z] of s.ring) y = Math.max(y, s.top(x, z));
  return y;
}

/** Median terrain height along a ring (samples every 2 m). */
function medianGround(ring: readonly V2[], heightAt: (x: number, z: number) => number): number {
  const ys: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.ceil(len / 2));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      ys.push(heightAt(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t));
    }
  }
  if (!ys.length) return 0;
  ys.sort((p, q) => p - q);
  return ys[Math.floor(ys.length / 2)];
}

/** Distance from a point to a ring's edges. */
function ringDistance(p: V2, ring: readonly V2[]): number {
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
    best = Math.min(best, Math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1]));
  }
  return best;
}
