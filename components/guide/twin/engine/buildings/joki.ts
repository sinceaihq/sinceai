import * as THREE from "three";
import type { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type {
  BuildingModule,
  CameraView,
  Collider2D,
  Connector,
  LevelId,
  LightingState,
  TwinContext,
  TwinTarget,
  V2,
  V3,
  WalkArea,
} from "../types";
import { CHALLENGE_COMPANIES, SHOWROOM_ORDER } from "@/lib/hackathon-2026/companies";
import { planGroupTransform } from "../frame";
import { makeLabel } from "../labels";
import { skyIlluminance } from "../sky/sky";
import { aulaProbe, caveProbe, loungeProbe, towerProbe } from "./joki/probes";
import { DEG, J, R, Y, arcStrip, bearingOf, jl, jv3, merge, polar, rectCorners } from "./joki/kit";
import { JokiMaterials } from "./joki/mats";
import { AULA_COLUMNS, AULA_FIXTURES, AULA_OUTLINE, ROUTE_J, buildLayout, counterPose, type Layout } from "./joki/layout";
import { buildTowerShell } from "./joki/shell";
import { buildLowWing, PORTAL } from "./joki/lowwing";
import { CAVE, LOUNGE, RAMP, buildFloor1 } from "./joki/floor1";
import { F1_AULA, F1_COLUMN, F1_TOWER } from "./joki/walls";
import { buildShowroom, SHOWROOM_POLY, LED } from "./showroom";
import { CORE, STAIRWELL, TOWER_STANDS, buildJokiTower, standPose } from "./jokiTower";

/**
 * Joki — visitor and innovation centre (Lemminkäisenkatu 12b; OSM
 * w625297895 + tower part w1244050596) as a BuildingModule (DESIGN §10–§12,
 * SPEC §3.2 and §7.2–7.3):
 *
 *  - exterior: the round tower (board-formed drum, curtain wall, 16 columns,
 *    448-element fin screen with its cut-outs, roof and plant), the floor-2
 *    door steps and the external floor-3 stair; the low wing with the hall
 *    roof and its public walkway, the Aula glazing, the stepped ramp to
 *    Pihakansi, the Lemminkäisenkatu portal (canopy, sliding doors — cordoned
 *    for the event) and the rainbow stair;
 *  - floor 1 (joki-1): Aula and Cave as build areas (33 + 42 tables), the ramp,
 *    the Showroom (showroom.ts), the Company Lounge amphitheatre, stair and lift;
 *  - floors 2–3 (jokiTower.ts): company stands and the Chill Zone.
 *
 * setOpen(level) cuts the building like a dollhouse: joki-1 lifts the hall
 * roof and the tower off; joki-2 and joki-3 clip the tower above that floor,
 * and joki-3 also opens the half of floor 2's glazing that faces the camera
 * (it follows the orbit) so both Q&A floors read in one view.
 */

const CLAIMS = [625297895, 1244050596];

export async function buildJoki(ctx: TwinContext): Promise<BuildingModule> {
  const root = new THREE.Group();
  root.name = "joki";
  const jRoot = new THREE.Group();
  jRoot.name = "joki-J";
  const tr = planGroupTransform(J);
  jRoot.position.set(tr.position[0], 0, tr.position[2]);
  jRoot.rotation.y = tr.rotationY;
  root.add(jRoot);
  root.updateMatrixWorld(true);
  const toWorld = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(jRoot.matrixWorld);
  const labelRoot = new THREE.Group();
  labelRoot.name = "joki-labels";
  root.add(labelRoot);
  const lblExt = new THREE.Group();
  const lblF1 = new THREE.Group();
  /** Counter labels: shown with floor 1 when the camera can see into the drum. */
  const lblSR = new THREE.Group();
  const lblBuilding = new THREE.Group();
  labelRoot.add(lblExt, lblF1, lblSR, lblBuilding);

  const mats = new JokiMaterials(ctx);
  const layout: Layout = buildLayout();

  // ── Build the parts ──
  const shell = buildTowerShell(ctx, mats);
  jRoot.add(shell.ext, shell.shell, shell.roof);
  const wing = buildLowWing(ctx, mats);
  jRoot.add(wing.ext, wing.roof);
  const f1 = buildFloor1(ctx, mats, layout, shell.drumInner);
  jRoot.add(f1.group, f1.core);
  const showroom = await buildShowroom(ctx, mats, { labelParent: lblSR, toWorld });
  f1.drum.add(showroom.group);
  const tower = buildJokiTower(ctx, mats, { toWorld, labelRoot });
  jRoot.add(tower.f2, tower.f3);

  // Stand-ins while the interior is unloaded (far away): lit floors behind the glass.
  const standinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.045, 0.04) });
  standinMat.name = "joki-standin";
  const standin = new THREE.Mesh(
    merge([
      arcStrip(8.95, 0, 360, Y.f2, Y.f2Ceil, { inward: true, seg: 64 }),
      arcStrip(8.95, 0, 360, Y.f3, Y.f3Ceil, { inward: true, seg: 64 }),
    ]),
    standinMat,
  );
  standin.name = "joki:standin";
  standin.visible = false;
  jRoot.add(standin);

  // ── Labels ──
  const labels: CSS2DObject[] = [...showroom.labels, ...tower.labels];
  const addLabel = (parent: THREE.Object3D, text: string, kind: Parameters<typeof makeLabel>[1], p: V3, detail?: string) => {
    const w = toWorld(p[0], p[1], p[2]);
    const l = makeLabel(text, kind, w.x, w.y, w.z, "joki", detail);
    parent.add(l);
    labels.push(l);
    return l;
  };
  addLabel(lblBuilding, "Joki", "building", [0, Y.finTop + 2.2, 0]);
  // Just outside the canopy (so the building hides the label from the far side).
  const door = jl(-17.1, 63.6);
  {
    const l = makeLabel("Joki street door", "entrance", door[0], Y.street + 3.4, door[1], undefined, "closed during the event");
    lblExt.add(l);
    labels.push(l);
  }
  addLabel(lblF1, "Aula", "area", [-5.2, Y.aula + 1.5, 37.0], "build area");
  addLabel(lblF1, "Cave", "area", [9.6, Y.aula + 1.5, 19.5], "build area");
  addLabel(lblF1, "Showroom", "landmark", [-5.6, Y.f1 + 2.0, -1.6], "Q&A · 6 counters");
  addLabel(lblF1, "Company Lounge", "landmark", [LOUNGE.c[0], Y.f1 + 1.4, LOUNGE.c[1]]);
  addLabel(lblF1, "Ramp", "area", [-0.4, Y.aula + 1.2, 13.4], "up to the Showroom");
  addLabel(lblF1, "To BioCity", "entrance", [-17.2, Y.aula + 2.2, 49.6], "passage, 10 steps up");
  addLabel(lblF1, "Stairs & lift", "area", [0.5, Y.f1 + 2.8, 3.2], "floors 2–3");

  // ── Pickables ──
  const pickables: THREE.Object3D[] = [...f1.pickables, ...showroom.pickables, ...tower.pickables];
  {
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 4.2), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.set((PORTAL.x0 + PORTAL.x1) / 2, Y.street + 2.25, 60.8);
    proxy.userData.pickId = "entrance-joki-street";
    jRoot.add(proxy);
    pickables.push(proxy);
  }

  // ── Views ──
  const view = (pos: V3, target: V3, extra: Partial<CameraView>): CameraView => ({
    position: jv3(...pos),
    target: jv3(...target),
    labels: true,
    labelGroup: "joki",
    ...extra,
  });
  const openAt = (level: LevelId): CameraView["open"] => ({ building: "joki", level });
  const views: Record<string, CameraView> = {
    // High over the north-east deck, looking down floor 1 on the diagonal: the open drum
    // (Showroom, lounge) in front, the ramp, the Cave and the Aula beyond — every build area in
    // one frame. Phones look down the long axis from the north instead.
    "joki:default": view([15, 56, -15], [-1.5, -1.7, 21], {
      hfov: 58,
      // Portrait: the 30 m-wide floor plate must fit the narrow screen; look down the long axis.
      fit: 18,
      open: openAt("joki-1"),
      portrait: { position: jv3(-3, 52, -16), target: jv3(1, -1.7, 22) },
    }),
    // Just inside the Showroom entrance at eye height, the LED wall ahead.
    "joki:showroom": view([0.35, Y.f1 + 1.62, 6.2], [-6.2, Y.f1 + 1.25, -1.2], {
      hfov: 92,
      labelGroup: "joki-showroom",
      open: openAt("joki-1"),
      portrait: { position: jv3(0.4, Y.f1 + 1.62, 7.6), target: jv3(-5.4, Y.f1 + 1.3, -1.6), hfov: 100 },
    }),
    // Standing at the amphitheatre's south rim (photo viewpoint), looking north across the pit.
    "joki:lounge": view([5.3, Y.f1 + 1.72, 1.45], [5.15, Y.f1 - 0.7, -3.6], { hfov: 88, open: openAt("joki-1") }),
    // The tower from the north-east deck side: floor 3 from above, floor 2 through the opened glazing.
    "joki:floors": view([25, 17.5, -10], [1.0, 4.4, 0.5], {
      hfov: 54,
      fit: 11,
      labelGroup: "joki-floors",
      open: openAt("joki-3"),
      portrait: { position: jv3(22, 22, -12), target: jv3(0.5, 4.6, 0.5) },
    }),
  };

  // ── Targets ──
  const targets: TwinTarget[] = [];
  SHOWROOM_ORDER.forEach((id, i) => {
    const c = counterPose(i);
    const [px, pz] = polar(3.0, c.bearing);
    // Walk mode starts a few steps back, with the counter, its stools and the logo above in view.
    const [wx, wz] = polar(4.4, c.bearing);
    targets.push({
      id,
      level: "joki-1",
      walkTo: jl(wx, wz),
      view: view([px, Y.f1 + 1.68, pz], [c.x, Y.f1 + 1.25, c.z], { hfov: 78, labelGroup: "joki-showroom", open: openAt("joki-1") }),
    });
  });
  for (const c of CHALLENGE_COMPANIES.filter((x) => x.qa.floor !== 1)) {
    const s = standPose(c.id);
    const y = s.floor === 2 ? Y.f2 : Y.f3;
    const r = Math.hypot(s.x, s.z) || 1;
    const ux = s.x / r;
    const uz = s.z / r;
    // From the room side, above the cut floor, looking out at the stand and its roll-up.
    const cam: V3 = [s.x - ux * 4.6 - uz * 1.4, y + 4.4, s.z - uz * 4.6 + ux * 1.4];
    targets.push({
      id: c.id,
      level: s.floor === 2 ? "joki-2" : "joki-3",
      walkTo: jl(s.x - ux * 1.7, s.z - uz * 1.7),
      view: view(cam, [s.x, y + 1.0, s.z], { hfov: 70, labelGroup: "joki-floors", open: openAt(s.floor === 2 ? "joki-2" : "joki-3") }),
    });
  }
  targets.push({ id: "showroom", level: "joki-1", walkTo: jl(-3.0, 1.0), view: views["joki:showroom"] });
  targets.push({ id: "lounge", level: "joki-1", walkTo: jl(3.4, 1.0), view: views["joki:lounge"] });
  targets.push({
    id: "aula",
    level: "joki-1",
    walkTo: jl(-1.2, 34.2),
    view: view([-9, 26, 6], [-3.5, -1.7, 34], { hfov: 62, fit: 16, open: openAt("joki-1") }),
  });
  targets.push({
    id: "cave",
    level: "joki-1",
    walkTo: jl(0.6, 22.0),
    view: view([-8.5, 15, 6.5], [8.0, -1.7, 18.5], { hfov: 64, fit: 12, open: openAt("joki-1") }),
  });
  targets.push({
    id: "chill-zone",
    level: "joki-2",
    walkTo: jl(-2.6, -0.4),
    view: view([6.0, Y.f2 + 5.6, 3.5], [-4.6, Y.f2 + 0.6, -0.4], { hfov: 70, labelGroup: "joki-floors", open: openAt("joki-2") }),
  });
  {
    // Across Lemminkäisenkatu from the door, eye height (the street falls to ≈ −2.2 here).
    const b = 219.5 * DEG;
    const d0 = jl(-17.1, 58.8);
    const cam: V3 = [d0[0] + Math.sin(b) * 15 - Math.cos(b) * 3, Y.street + 1.7, d0[1] - Math.cos(b) * 15 - Math.sin(b) * 3];
    targets.push({
      id: "entrance-joki-street",
      view: { position: cam, target: [d0[0], Y.street + 2.2, d0[1]], hfov: 66, labels: true, open: null },
    });
  }

  // ── Walking: areas, colliders, connectors ──
  const walk = walkData(layout);

  // ── Route leg (DESIGN §12): passage stair foot → Aula → ramp → Showroom ──
  const routeLegs: Record<string, V3[]> = { "int-joki-aula-to-showroom": ROUTE_J.map(([x, y, z]) => jv3(x, y, z)) };

  // ── Room probes (neutral, calibrated light per interior; joki/probes.ts) ──
  const rot = J.theta * DEG;
  mats.setZoneEnv("cave", caveProbe(rot));
  mats.setZoneEnv("lounge", loungeProbe());
  let towerProbeKey = "";

  // ── State ──
  /** The level the engine asked to open (dollhouse), and what is drawn (closed when the camera stands inside). */
  let open: LevelId | null = null;
  let drawn: LevelId | null = null;
  let interiorOn = true;
  let night = 0;
  let f1Wanted = true;
  /** The camera is within Joki's footprint below floor 2's ceiling: the drum rooms may be in sight. */
  let drumWanted = true;
  /** Low tier, outside and over 22 m from the tower: floors 2–3 drawn as the lit stand-in bands. */
  let towerFar = false;
  const lowTier = ctx.tier === "low";
  const camJ = new THREE.Vector3();
  const inv = new THREE.Matrix4();
  const lastCam = new THREE.Vector3(1e6, 1e6, 1e6);
  /** The camera's screen-right (J frame, horizontal), for the floor tags. */
  const rightJ = new THREE.Vector3();
  const lastRight = new THREE.Vector3(1, 0, 0);
  const leftJ = new THREE.Vector3();

  /** The level the camera stands in while the building is drawn whole (null outside). */
  let insideNow: LevelId | null = null;

  function apply() {
    const show = interiorOn || drawn !== null;
    // Standing inside a level, what cannot be seen is skipped: floor 1 is enclosed (floors 2–3
    // are out of sight), and from the tower floors nobody sees into floor 1. Floor 3 stays
    // with floor 2 (the stairwell), the stair core with floors 1 and 2.
    const inside = insideNow;
    f1.group.visible = show && (drawn === null || drawn === "joki-1") && (f1Wanted || drawn !== null) && inside !== "joki-2" && inside !== "joki-3";
    f1.core.visible = f1.group.visible || inside === "joki-2";
    // The Showroom and the lounge sit inside the concrete drum: nothing outside looks into them.
    f1.drum.visible = drumWanted || drawn === "joki-1";
    tower.f2.visible = show && drawn !== "joki-1" && inside !== "joki-1" && !towerFar;
    tower.f3.visible = show && (drawn === null || drawn === "joki-3") && inside !== "joki-1" && !towerFar;
    shell.roof.visible = drawn === null && inside === null;
    wing.roof.visible = drawn !== "joki-1";
    // Floors 2–3 seen from below the Aula glazing while hidden: lit bands behind the glass.
    standin.visible = !show || inside === "joki-1" || towerFar;
    lblBuilding.visible = open === null;
    // Standing inside, the street door's label would float through the walls.
    lblExt.visible = inside === null;
    ctx.invalidate();
  }

  /** The camera stands inside Joki below a ceiling: draw the building whole, as when walking. */
  function insideLevel(cam: THREE.Vector3): LevelId | null {
    if (!insideJoki(cam.x, cam.z)) return null;
    if (cam.y < Y.showroomCeil) return "joki-1";
    if (cam.y > Y.f2 && cam.y < Y.f2Ceil) return "joki-2";
    if (cam.y > Y.f3 && cam.y < Y.f3Ceil) return "joki-3";
    return null;
  }

  function setDrawn(level: LevelId | null) {
    if (level === drawn) return;
    drawn = level;
    shell.setOpen(level);
    // The dollhouse shows the cut floors as lit inside (no low sun pouring over the clipped screen).
    mats.sunTower.value = level === "joki-2" || level === "joki-3" ? 0 : 1;
    apply();
  }

  /** Which labels show: the open level's, or (inside) the level the camera stands on. */
  function updateLabels(cam: THREE.Vector3) {
    let l1 = false;
    let l2 = false;
    let l3 = false;
    const inside = drawn === null ? insideLevel(cam) : null;
    if (inside) {
      l1 = inside === "joki-1";
      l2 = inside === "joki-2";
      l3 = inside === "joki-3";
    } else if (open === "joki-1") l1 = true;
    else if (open === "joki-2") l2 = true;
    else if (open === "joki-3") {
      // Floor 2 shows below floor 3: each of its labels hides where the floor-3 slab covers it.
      l2 = true;
      l3 = true;
    }
    // Counter labels only where the counters can be seen: inside the drum, or into the open floor from above.
    const lsr = l1 && (drawn === "joki-1" || Math.hypot(cam.x, cam.z) < R.drumIn + 0.3);
    if (lblF1.visible !== l1 || lblSR.visible !== lsr || tower.labels2.visible !== l2 || tower.labels3.visible !== l3) {
      lblF1.visible = l1;
      lblSR.visible = lsr;
      tower.labels2.visible = l2;
      tower.labels3.visible = l3;
      // Let the engine declutter the labels that just appeared once the view has settled.
      if (typeof window !== "undefined") window.setTimeout(() => ctx.invalidate(), 260);
    }
  }

  const LEVEL_ORDER: Record<string, number> = { "joki-1": 1, "joki-2": 2, "joki-3": 3 };
  /** Standing inside at or below the open level (eye-level interior views) → draw the building whole. */
  function wantDrawn(cam: THREE.Vector3): LevelId | null {
    if (!open) return null;
    const inside = insideLevel(cam);
    return inside && LEVEL_ORDER[inside] <= LEVEL_ORDER[open] ? null : open;
  }

  let coreKey = "";

  function onCamera(cam: THREE.Vector3): boolean {
    let changed = false;
    const want = wantDrawn(cam);
    if (want !== drawn) {
      setDrawn(want);
      changed = true;
    }
    const inside = drawn === null ? insideLevel(cam) : null;
    if (inside !== insideNow) {
      insideNow = inside;
      apply();
      changed = true;
    }
    // Dollhouse from above: the open floor's core walls are cut to 1.3 m so the stands read.
    const cut2 = drawn === "joki-2" && cam.y > Y.f2Ceil;
    const cut3 = drawn === "joki-3" && cam.y > Y.f3Ceil;
    const key = `${cut2}|${cut3}`;
    if (key !== coreKey) {
      coreKey = key;
      tower.cutCore(2, cut2);
      tower.cutCore(3, cut3);
      changed = true;
    }
    if (drawn) {
      // Ceilings disappear when looking down into the open floors.
      const vis = (g: THREE.Object3D, on: boolean) => {
        if (g.visible !== on) {
          g.visible = on;
          changed = true;
        }
      };
      vis(f1.ceil, cam.y < Y.showroomCeil + 0.2);
      vis(showroom.ceil, cam.y < Y.showroomCeil + 0.2);
      vis(tower.f2Ceil, cam.y < Y.f2Ceil);
      vis(tower.f3Ceil, cam.y < Y.f3Ceil);
      if (shell.update(cam)) changed = true;
    } else {
      for (const g of [f1.ceil, showroom.ceil, tower.f2Ceil, tower.f3Ceil]) {
        if (!g.visible) {
          g.visible = true;
          changed = true;
        }
      }
    }
    // Floor 1 is enclosed: from outside it can only be seen through the Aula's north-west
    // glazing (from Pihakansi) or the street door, from low and near.
    const inJ = insideJoki(cam.x, cam.z);
    const wanted = inJ || f1Visible(cam);
    const drumNow = inJ && cam.y < Y.f2Ceil;
    // Phones: from outside, beyond 22 m, floors 2–3 are a small glimpse through the glass — the lit
    // bands stand in for them (the low tier's draw-call budget). Open views always draw them.
    const farNow = lowTier && drawn === null && !inJ && Math.hypot(cam.x, cam.z) > 22;
    if (wanted !== f1Wanted || drumNow !== drumWanted || farNow !== towerFar) {
      f1Wanted = wanted;
      drumWanted = drumNow;
      towerFar = farNow;
      apply();
      changed = true;
    }
    updateLabels(cam);
    leftJ.copy(lastRight).negate();
    if (tower.updateLabels(cam, leftJ, { f3: tower.f3.visible, inside: insideNow !== null })) changed = true;
    return changed;
  }

  const ready = Promise.all([shell.ready, wing.ready, f1.ready, showroom.ready, tower.ready]);
  // Textures letter themselves once the web fonts arrive (and logos once loaded): draw a frame then.
  void ready.then(
    () => ctx.invalidate(),
    () => undefined,
  );

  const joki: BuildingModule = {
    id: "joki",
    building: "joki",
    root,
    labels,
    pickables,
    targets,
    views,
    colliders: walk.colliders,
    walkAreas: walk.walkAreas,
    connectors: walk.connectors,
    claims: CLAIMS,
    routeLegs,
    levels: [
      { id: "joki-1", name: "Floor 1 · Aula, Cave, Showroom", y: Y.f1, group: f1.group },
      { id: "joki-2", name: "Floor 2 · Q&A, Chill Zone", y: Y.f2, group: tower.f2 },
      { id: "joki-3", name: "Floor 3 · Q&A", y: Y.f3, group: tower.f3 },
    ],
    shell: shell.shell,
    setOpen(level) {
      open = level;
      setDrawn(wantDrawn(lastCam));
      onCamera(lastCam);
    },
    setInterior(on) {
      interiorOn = on;
      apply();
    },
    setLighting(state: LightingState) {
      night = state.night;
      shell.setNight(night);
      wing.setNight(night);
      // Floors 2–3: daylight through the glazing — rebuild the room probe when the light changes.
      const sky = skyIlluminance(state.sunElevationDeg);
      const key = `${Math.round(Math.log10(Math.max(1e-4, sky)) * 8)}|${Math.round(night * 10)}`;
      if (key !== towerProbeKey) {
        towerProbeKey = key;
        mats.setZoneEnv("tower", towerProbe(sky, night));
        mats.setZoneEnv("aula", aulaProbe(THREE.MathUtils.clamp(sky / 5, 0, 1) * (1 - night), rot));
      }
      const lum = 0.03 + 0.2 * THREE.MathUtils.smoothstep(night, 0.05, 0.6);
      standinMat.color.setRGB(lum, lum * 0.9, lum * 0.76);
      ctx.invalidate();
    },
    tick(_dt, _elapsed, camera) {
      debugCamera = camera;
      camera.updateMatrixWorld();
      inv.copy(jRoot.matrixWorld).invert();
      camJ.copy(camera.position).applyMatrix4(inv);
      rightJ.setFromMatrixColumn(camera.matrixWorld, 0).transformDirection(inv);
      rightJ.y = 0;
      if (rightJ.lengthSq() > 1e-8) rightJ.normalize();
      else rightJ.copy(lastRight);
      if (camJ.distanceToSquared(lastCam) < 1e-6 && rightJ.distanceToSquared(lastRight) < 1e-6) return false;
      lastCam.copy(camJ);
      lastRight.copy(rightJ);
      if (onCamera(camJ)) ctx.invalidate();
      return false;
    },
    ready,
    dispose() {
      shell.dispose();
      wing.dispose();
      f1.dispose();
      showroom.dispose();
      tower.dispose();
      standinMat.dispose();
      mats.dispose();
      if (debugHook) delete (window as unknown as { __joki?: unknown }).__joki;
    },
  };
  apply();
  // QA hook (debug pages only): lets the screenshot scripts inspect and toggle Joki's parts.
  const debugHook = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("twin") === "debug";
  let debugCamera: THREE.PerspectiveCamera | null = null;
  if (debugHook) {
    const raycaster = new THREE.Raycaster();
    (window as unknown as { __joki?: unknown }).__joki = {
      root,
      jRoot,
      shell,
      wing,
      f1,
      showroom,
      tower,
      standin,
      /** Visible objects of the whole scene under a screen point (normalised device coordinates). */
      pick(x: number, y: number) {
        if (!debugCamera) return [];
        raycaster.setFromCamera(new THREE.Vector2(x, y), debugCamera);
        let scene: THREE.Object3D = root;
        while (scene.parent) scene = scene.parent;
        const shown = (o: THREE.Object3D | null): boolean => !o || (o.visible && shown(o.parent));
        return raycaster
          .intersectObject(scene, true)
          .filter((h) => (h.object as THREE.Mesh).isMesh && shown(h.object))
          .slice(0, 5)
          .map((h) => {
            let top: THREE.Object3D = h.object;
            while (top.parent && top.parent !== scene) top = top.parent;
            return {
              module: top.name,
              name: h.object.name,
              material: (h.object as THREE.Mesh).material instanceof THREE.Material ? ((h.object as THREE.Mesh).material as THREE.Material).name : "",
              distance: Math.round(h.distance * 100) / 100,
              point: h.point.toArray().map((v) => Math.round(v * 100) / 100),
            };
          });
      },
    };
  }
  lblF1.visible = false;
  lblSR.visible = false;
  tower.labels2.visible = false;
  tower.labels3.visible = false;
  return joki;
}

/** Can a camera outside Joki (J frame) see floor 1? Through the NW glazing or the street door, from low and near. */
export function f1Visible(cam: { x: number; y: number; z: number }): boolean {
  if (cam.y > Y.hallEdge + 1.5) return false;
  const throughGlazing = cam.x < -1.0 && cam.z > -12 && cam.z < 46 && Math.hypot(cam.x + 4, cam.z - 20) < 70;
  const throughDoor = cam.z > 54 && Math.hypot(cam.x + 17, cam.z - 59) < 55;
  return throughGlazing || throughDoor;
}

/** Point (J frame) inside Joki: the drum, the ramp, the Aula or the Cave. */
function insideJoki(x: number, z: number): boolean {
  if (Math.hypot(x, z) < R.glassOut) return true;
  if (x > CAVE.x0 - 0.3 && x < CAVE.x1 + 0.8 && z > CAVE.z0 - 0.3 && z < 45) return true;
  return pointIn([x, z], AULA_OUTLINE) || pointIn([x, z], RAMP.poly);
}

function pointIn(p: V2, poly: V2[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

/**
 * Walk areas, colliders and connectors of floors 1–3 in the shared frame.
 * Pure data (exported for tests through walkData()).
 */
export function walkData(layout: Layout): { walkAreas: WalkArea[]; colliders: Collider2D[]; connectors: Connector[] } {
  const W = (p: V2): V2 => {
    const [x, z] = jl(p[0], p[1]);
    return [Math.round(x * 100) / 100, Math.round(z * 100) / 100];
  };
  const walkAreas: WalkArea[] = [];
  const colliders: Collider2D[] = [];
  const seg = (level: LevelId, a: V2, b: V2) => colliders.push({ level, kind: "segment", a: W(a), b: W(b) });
  const ring = (level: LevelId, poly: V2[]) => {
    for (let i = 0; i < poly.length; i++) seg(level, poly[i], poly[(i + 1) % poly.length]);
  };
  const circle = (level: LevelId, c: V2, r: number) => colliders.push({ level, kind: "circle", c: W(c), r });

  // ── Floor 1 ──
  walkAreas.push({ level: "joki-1", y: Y.aula, polygon: AULA_OUTLINE.map(W) });
  walkAreas.push({
    level: "joki-1",
    y: Y.aula,
    polygon: (
      [
        [CAVE.x0, CAVE.z0],
        [CAVE.x1, CAVE.z0],
        [CAVE.x1, CAVE.stageZ],
        [CAVE.x0 - 0.35, CAVE.stageZ],
        [CAVE.x0 - 0.35, 18.35],
        [CAVE.x0, 18.35],
      ] as V2[]
    ).map(W),
  });
  {
    const a = W([0.15, RAMP.z0]);
    const b = W([0.15, RAMP.z1]);
    walkAreas.push({ level: "joki-1", y: Y.aula, polygon: RAMP.poly.map(W), slope: { from: a, to: b, y0: Y.aula, y1: Y.f1 } });
  }
  walkAreas.push({ level: "joki-1", y: Y.f1, polygon: SHOWROOM_POLY.map(W) });
  walkAreas.push({
    level: "joki-1",
    y: Y.f1,
    polygon: (
      [
        [-1.0, 8.6],
        [1.3, 8.6],
        [1.3, 3.59],
        [-0.4, 3.59],
        [-0.4, 1.59],
        [-1.0, 1.59],
      ] as V2[]
    ).map(W),
  });
  walkAreas.push({
    level: "joki-1",
    y: Y.f1,
    polygon: (
      [
        [1.5, -8.5],
        [2.38, -8.4],
        [2.38, -6.01],
        [1.5, -6.01],
      ] as V2[]
    ).map(W),
  });
  {
    const pts: V2[] = [[2.38, 1.59], [2.38, -8.3]];
    for (let b = 14; b <= 96; b += 6) pts.push(polar(8.5, b));
    pts.push([8.5, 1.72], [6.06, 1.72], [6.06, 3.55], [1.35, 3.55], [1.35, 1.59]);
    walkAreas.push({ level: "joki-1", y: Y.f1, polygon: pts.map(W) });
  }
  // Walls (CAD) as segments; columns as circles.
  for (const poly of F1_TOWER) ring("joki-1", poly);
  for (const poly of F1_AULA) ring("joki-1", poly);
  for (const poly of F1_COLUMN) {
    const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length;
    const cz = poly.reduce((s, p) => s + p[1], 0) / poly.length;
    circle("joki-1", [cx, cz], 0.3);
  }
  for (const c of AULA_COLUMNS) circle("joki-1", c.c, c.r + 0.02);
  // Outline of the Aula (glazing, the shared wall, the frosted DataCity wall) — except the BioCity passage.
  for (let i = 0; i < AULA_OUTLINE.length; i++) {
    const a = AULA_OUTLINE[i];
    const b = AULA_OUTLINE[(i + 1) % AULA_OUTLINE.length];
    if (a[0] === -19.56 && b[0] === -14.5) {
      // Shared wall: leave the passage open.
      seg("joki-1", a, [-18.56, 51.1]);
      seg("joki-1", [-17.66, 48.01], b);
      continue;
    }
    seg("joki-1", a, b);
  }
  // Drum inner wall and the LED wall face.
  for (const [b0, b1] of [
    [186.7, 368.7],
  ] as [number, number][]) {
    for (let b = b0; b < b1; b += 6) seg("joki-1", polar(LED.r - 0.05, b), polar(LED.r - 0.05, Math.min(b1, b + 6)));
  }
  for (let b = 8.7; b < 84; b += 6) seg("joki-1", polar(R.drumIn, b), polar(R.drumIn, Math.min(84, b + 6)));
  // Stair (F1 → F2) is not walkable on floor 1 beyond its foot; the amphitheatre is sunken.
  ring("joki-1", [
    [-0.4, 0.8],
    [1.3, 0.8],
    [1.3, -6.1],
    [-0.4, -6.1],
  ]);
  circle("joki-1", LOUNGE.c, LOUNGE.rim[1] - 0.05);
  // Furniture: tables, chairs, counters, stools, fixtures.
  for (const t of [...layout.aula, ...layout.cave]) {
    ring("joki-1", rectCorners(t.x, t.z, t.length, t.width, t.angle));
    for (const s of t.seats) circle("joki-1", [s.x, s.z], 0.24);
  }
  for (let i = 0; i < SHOWROOM_ORDER.length; i++) {
    const c = counterPose(i);
    ring("joki-1", rectCorners(c.x, c.z, 1.86, 0.66, Math.atan2(c.x, -c.z) + Math.PI / 2));
  }
  {
    const c = AULA_FIXTURES.counter;
    ring("joki-1", [
      [c.x0, c.z0],
      [c.x1, c.z0],
      [c.x1, c.z1],
      [c.x0, c.z1],
    ]);
    circle("joki-1", AULA_FIXTURES.sofa.c, AULA_FIXTURES.sofa.r);
  }
  // Cave stage edge (route goes round it) and the cordoned street vestibule.
  seg("joki-1", [CAVE.x0, CAVE.stageZ], [12.4, CAVE.stageZ]);
  seg("joki-1", [-20.25, PORTAL.innerZ], [-14.83, PORTAL.innerZ]);

  // ── Floors 2 and 3 ──
  for (const [level, y] of [
    ["joki-2", Y.f2],
    ["joki-3", Y.f3],
  ] as [LevelId, number][]) {
    const disc: V2[] = [];
    for (let k = 0; k < 64; k++) disc.push(polar(R.glassIn - 0.1, (360 * k) / 64));
    walkAreas.push({ level, y, polygon: disc.map(W) });
    ring(level, disc);
    for (let k = 0; k < 16; k++) circle(level, polar(R.column, 33.76 + 22.5 * k), 0.14);
    for (const poly of CORE) ring(level, poly);
    ring(level, STAIRWELL);
    for (const [id, s] of Object.entries(TOWER_STANDS)) {
      if ((s.floor === 2) !== (level === "joki-2")) continue;
      const p = standPose(id);
      ring(level, rectCorners(p.x, p.z, 1.9, 1.5, -p.yaw));
    }
  }
  // Floor 2 Chill Zone furniture; floor 3 bleachers.
  ring("joki-2", [
    [-6.5, 2.55],
    [-1.95, 2.55],
    [-1.95, 2.7],
    [-6.5, 2.7],
  ]);
  for (const [x, z, r] of [
    [-5.58, 1.86, 0.7],
    [-5.75, -6.27, 0.75],
    [-7.63, -3.41, 0.75],
    [-3.2, -5.6, 0.62],
    [-6.9, 0.1, 0.62],
    [-3.4, 0.3, 0.75],
  ] as [number, number, number][])
    circle("joki-2", [x, z], r);
  for (const b of [315, 293, 270, 247]) circle("joki-3", polar(7.75, b), 0.9);

  // ── Connectors: tower stair and lift, the passage to BioCity ──
  const conn = (id: string, label: string, from: LevelId, to: LevelId, at: V2, arrive: V2): Connector => ({
    id,
    label,
    from,
    to,
    at: W(at),
    arrive: W(arrive),
  });
  const connectors: Connector[] = [
    conn("joki-stair-1-2", "Stairs up to floor 2", "joki-1", "joki-2", [0.45, 2.3], [0.55, -6.95]),
    conn("joki-stair-2-1", "Stairs down to floor 1", "joki-2", "joki-1", [0.55, -6.6], [0.45, 2.45]),
    conn("joki-stair-2-3", "Stairs up to floor 3", "joki-2", "joki-3", [0.55, 2.3], [0.55, -6.95]),
    conn("joki-stair-3-2", "Stairs down to floor 2", "joki-3", "joki-2", [0.55, -6.6], [0.55, 2.45]),
    conn("joki-lift-1-2", "Lift to floor 2", "joki-1", "joki-2", [0.85, 4.75], [2.5, 6.65]),
    conn("joki-lift-1-3", "Lift to floor 3", "joki-1", "joki-3", [0.85, 4.75], [2.5, 6.65]),
    conn("joki-lift-2-1", "Lift to floor 1", "joki-2", "joki-1", [2.5, 6.65], [0.85, 4.75]),
    conn("joki-lift-2-3", "Lift to floor 3", "joki-2", "joki-3", [2.5, 6.65], [2.5, 6.65]),
    conn("joki-lift-3-1", "Lift to floor 1", "joki-3", "joki-1", [2.5, 6.65], [0.85, 4.75]),
    conn("joki-lift-3-2", "Lift to floor 2", "joki-3", "joki-2", [2.5, 6.65], [2.5, 6.65]),
  ];
  // Up the passage stair into BioCity's lobby (arrive by the stair top, routes.json).
  connectors.push({ id: "joki-passage-biocity", label: "Stairs up to BioCity", from: "joki-1", to: "biocity-1", at: W([-16.9, 49.7]), arrive: [10.4, 38.4] });
  void bearingOf;
  return { walkAreas, colliders, connectors };
}
