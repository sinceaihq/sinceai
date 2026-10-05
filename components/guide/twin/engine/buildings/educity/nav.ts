import type { CameraView, Collider2D, Connector, LevelId, TwinTarget, V2, V3, WalkArea } from "../../types";
import { CHALLENGE_COMPANIES } from "@/lib/hackathon-2026/companies";
import { BLOCK, MAIN_DOORS, PAVILION, PAVILION_STAIR, TAIDON, Y0, eToLocal, eToLocal3, type Rect } from "./frame";
import { BRIEFING_ROOMS, POINTS, mainRect, type BriefingRoom } from "./rooms";
import { F1, F2, IN, type FloorPlan, type WallSpec } from "./plan";
import { DOOR_B } from "./data";

/**
 * Navigation data of EduCity in the campus frame: camera views and "Go to"
 * targets (lib/hackathon-2026/twin.ts ids), walk areas and colliders of
 * floors 1–2 (and the building's outline outdoors), lifts / Taidon portaat /
 * the step-free gateway as connectors, and the three indoor route legs
 * (DESIGN §12). Authored in the plan frame E and converted. Pure — tested.
 */

const OPEN1 = { building: "educity", level: "educity-1" } as const;
const OPEN2 = { building: "educity", level: "educity-2" } as const;

/** Floor y (campus) of the two walk levels. */
export const FLOOR_Y = { "educity-1": Y0, "educity-2": Y0 + 5 } as const;

const r2 = (v: number) => Math.round(v * 100) / 100;
const P2 = (x: number, z: number): V2 => {
  const [a, b] = eToLocal(x, z);
  return [r2(a), r2(b)];
};
const P3 = (x: number, y: number, z: number): V3 => {
  const [a, b, c] = eToLocal3(x, y, z);
  return [r2(a), r2(b), r2(c)];
};

function pose(p: V3, t: V3): Pick<CameraView, "position" | "target"> {
  return { position: P3(p[0], p[1], p[2]), target: P3(t[0], t[1], t[2]) };
}

// ── Views ───────────────────────────────────────────────────────────────────

export const EDUCITY_VIEWS: Record<string, CameraView> = {
  // Floor 1 from above the entrance pavilion, the roof lifted: both entrances, registration, Kisälli,
  // the stage and Taidon portaat, the team formation area beyond.
  "educity:default": {
    ...pose([18, 40, 100], [27, 0, 44]),
    hfov: 62,
    fit: 34,
    portrait: { ...pose([24, 64, 92], [26, 0, 46]), fit: 26 },
    labels: true,
    labelGroup: "edu-lobby",
    open: OPEN1,
  },
  // Floor 1's briefing rooms on the north-east side: 1001, 1002 and the glass box 1090 / 1091, door B
  // (company arrivals) and the corridor from it on the right.
  "educity:rooms1": {
    ...pose([20, 40, 58], [32, 0, 18]),
    hfov: 60,
    fit: 30,
    portrait: { ...pose([30, 62, 54], [30, 0, 17]), fit: 28 },
    labels: true,
    labelGroup: "edu-rooms1",
    open: OPEN1,
  },
  // All of floor 2 from above the south-west: eleven rooms round the atrium.
  // Steep enough that the four rooms along the north-east facade keep their labels apart.
  "educity:rooms2": {
    ...pose([22, 86, 88], [26, 5, 33]),
    hfov: 60,
    fit: 36,
    portrait: { ...pose([24, 104, 80], [26, 5, 34]), fit: 30 },
    labels: true,
    labelGroup: "edu-rooms2",
    open: OPEN2,
  },
  // The glass entrance pavilion from the south, over the corner of the surface lot: the east entrance
  // (the walkway from the station stairs; registration just inside) in front on the right, the west
  // entrance (towards the campus deck and BioCity) at the far end, the brick building above.
  "educity:entrance": {
    ...pose([64, 22, 110], [32, 1.5, 74]),
    hfov: 64,
    fit: 36,
    // Portrait: higher and further back so both entrance labels (≈54 m apart) stay on screen.
    portrait: { ...pose([44, 60, 120], [26, 1, 72]), fit: 40 },
    labels: true,
    labelGroup: "edu-entrance",
    open: null,
  },
};

// ── Targets ─────────────────────────────────────────────────────────────────

/** Briefing room of a company room number. */
const roomByNumber = (n: string): BriefingRoom | undefined => BRIEFING_ROOMS.find((r) => r.number === n);

/**
 * Dollhouse close-up of a room: from the corridor side, up and back, looking into it — at its main
 * rectangle (an L-shaped room's notch holds lifts and stairs, not the room).
 */
export function roomView(room: BriefingRoom): CameraView {
  const r = mainRect(room);
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  const y = room.level === "f1" ? F1.y : F2.y;
  const span = Math.max(r.x1 - r.x0, r.z1 - r.z0);
  const back = Math.max(9, span * 0.62);
  // Look from the side the door opens to, a little sideways.
  const [ox, oz] = room.out;
  const p: V3 = [cx + ox * back - oz * 3, y + 8 + span * 0.18, cz + oz * back + ox * 3];
  const t: V3 = [cx, y + 0.6, cz];
  return {
    ...pose(p, t),
    hfov: 62,
    fit: Math.max(6, span * 0.55),
    labels: true,
    labelGroup: room.level === "f1" ? "edu-rooms1" : "edu-rooms2",
    open: room.level === "f1" ? OPEN1 : OPEN2,
  };
}

export function educityTargets(): TwinTarget[] {
  const out: TwinTarget[] = [];
  for (const c of CHALLENGE_COMPANIES) {
    const room = roomByNumber(c.briefing.room);
    if (!room) continue;
    const level: LevelId = room.level === "f1" ? "educity-1" : "educity-2";
    // Open plan (the work café): start inside it, past its sign totem, looking into the room.
    const walk = room.open ? P2(room.door[0] + 2.5, room.door[1] - 1.6) : P2(room.door[0] + room.out[0] * 1.1, room.door[1] + room.out[1] * 1.1);
    out.push({ id: `room-${c.id}`, view: roomView(room), level, walkTo: walk });
  }
  const lobby = (p: V3, t: V3, group = "edu-lobby", fit = 10): CameraView => ({ ...pose(p, t), hfov: 62, fit, labels: true, labelGroup: group, open: OPEN1 });
  out.push({
    id: "taidon-portaat",
    view: lobby([26, 10.5, 58], [26, 2.0, 40], "edu-lobby", 11),
    level: "educity-1",
    // At the foot of the seating tiers, in front of the stage, looking up the steps.
    walkTo: P2(26, 44.35),
  });
  out.push({
    id: "registration",
    // From the south-west over Kisälli: the desks with their LED edge and both roll-ups, the east
    // opening in front (where builders come in), the service centre beyond the desks.
    view: lobby([25, 10.5, 71], [38.0, 0.8, 56.5], "edu-lobby", 9),
    level: "educity-1",
    walkTo: P2(38.3, 54.4),
  });
  out.push({
    id: "team-formation",
    view: lobby([26, 15, 47], [26, 0.6, 30], "edu-lobby", 11),
    level: "educity-1",
    walkTo: P2(POINTS.teamFormation[0], POINTS.teamFormation[1] + 1),
  });
  out.push({
    id: "restaurant-kisalli",
    view: lobby([25, 17, 79], [25, 0.5, 56], "edu-lobby", 14),
    level: "educity-1",
    walkTo: P2(15.6, 52.0),
  });
  out.push({
    id: "company-arrival",
    // Room 1002 and its door from the corridor partners come along from door B (look-at at the door,
    // so the "Company arrival" label is this target's own).
    view: lobby([42, 13, 26], [31.0, 0.6, 9.2], "edu-rooms1", 12),
    level: "educity-1",
    walkTo: P2(26.7, 9.4),
  });
  // Entrances (exterior, deck level).
  const ext = (p: V3, t: V3, fov = 66, group = "edu-entrance"): CameraView => ({ ...pose(p, t), hfov: fov, labels: true, labelGroup: group, open: null });
  // From the campus deck, nearly square to the revolving door (clear of the lamp and the info totem).
  out.push({ id: "entrance-educity-west", view: ext([-6.5, 1.9, 77.6], [5.4, 2.0, 74.6], 70, "edu-entrance-west"), walkTo: P2(1.6, 74.6) });
  // On the walkway's plaza, south-east of the doors (the way builders arrive from the Main Stairs).
  out.push({ id: "entrance-educity-east", view: ext([60.5, 2.2, 78.4], [47.1, 2.3, 75.0], 70, "edu-entrance-east"), walkTo: P2(50.5, 74.95) });
  // Square to door B from the walkway's railing: walk mode starts facing the portal.
  out.push({ id: "entrance-educity-b", view: ext([60, 2.2, 33.5], [51.6, 1.6, 32.7], 70, "edu-entrance-b"), walkTo: P2(54.6, 32.7) });
  // In the passage, north of the bridges (the way the step-free route comes), facing the door and its
  // lift lobby; walk mode starts within reach of the "Step-free lift up" button.
  out.push({
    id: "entrance-educity-gateway",
    view: ext([-7.5, -3.2, 22.5], [0.3, -3.6, 32.6], 70, "edu-gateway"),
    walkTo: P2(-1.7, 30.4),
  });
  return out;
}

// ── Walk areas ──────────────────────────────────────────────────────────────

/** Outdoor deck-level floors round the building (E rectangles; see educityWalkAreas). */
export const DECK_AREAS: readonly Rect[] = [
  // North-west canopy and the deck in front of the revolving door.
  { x0: 1.0, x1: PAVILION.glassNW + 0.05, z0: BLOCK.d + 0.05, z1: PAVILION.wallSW },
  // South-east walkway (Main Stairs' top → the plaza) and the plaza under the south-east canopy.
  { x0: BLOCK.w, x1: 58.0, z0: 14.2, z1: PAVILION.z1 },
  { x0: PAVILION.glassSE - 0.05, x1: BLOCK.w + 0.05, z0: BLOCK.d, z1: PAVILION.z1 },
  // Door B's portal and the side door's recess, to their glass.
  { x0: BLOCK.w - DOOR_B.depth, x1: BLOCK.w + 0.05, z0: DOOR_B.z0, z1: DOOR_B.z1 },
  { x0: BLOCK.w - 0.3, x1: BLOCK.w + 0.05, z0: DOOR_B.side.z0, z1: DOOR_B.side.z1 },
];

const ring = (x0: number, x1: number, z0: number, z1: number): V2[] => [
  P2(x0, z0),
  P2(x0, z1),
  P2(x1, z1),
  P2(x1, z0),
];

export function educityWalkAreas(): WalkArea[] {
  const y1 = FLOOR_Y["educity-1"];
  const y2 = FLOOR_Y["educity-2"];
  const f1 = (x0: number, x1: number, z0: number, z1: number): WalkArea => ({ level: "educity-1", y: y1, polygon: ring(x0, x1, z0, z1) });
  const f2 = (x0: number, x1: number, z0: number, z1: number): WalkArea => ({ level: "educity-2", y: y2, polygon: ring(x0, x1, z0, z1) });
  return [
    // Floor 1: the main block minus Taidon portaat, door B's portal, the pavilion.
    f1(IN.x0, IN.x1, IN.z0, TAIDON.zTop),
    f1(IN.x0, TAIDON.x0, TAIDON.zTop, TAIDON.zFoot),
    f1(TAIDON.x1, IN.x1, TAIDON.zTop, TAIDON.zFoot),
    f1(IN.x0, IN.x1, TAIDON.zFoot, IN.z1),
    // Door B's portal counts as inside (the walker changes level at the facade line).
    f1(BLOCK.w - 0.8, BLOCK.w + 0.02, DOOR_B.z0, DOOR_B.z1),
    // The pavilion: the level changes at the glass line, where the doors are.
    f1(PAVILION.glassNW - 0.05, PAVILION.glassSE + 0.05, IN.z1 - 0.05, PAVILION.wallSW - 0.1),
    // Floor 2: round the atrium void (the terrace is outside).
    f2(IN.x0, IN.x1, IN.z0, TAIDON.zTop),
    f2(IN.x0, 17.75, TAIDON.zTop, IN.z1),
    f2(34.21, IN.x1, TAIDON.zTop, 48.7),
    f2(17.6, 34.93, 48.87, IN.z1),
    // Outdoors at deck level (y 3.40): the threshold under the north-west canopy and the deck before it,
    // the south-east walkway with the plaza at the east entrance and door B's portal. The campus
    // outline (and the ground's surface) stops 1.3 m outside the glass; these keep the floor there.
    ...DECK_AREAS.map((r): WalkArea => ({ level: "outdoor", y: y1, polygon: ring(r.x0, r.x1, r.z0, r.z1) })),
    // Taidon portaat: a ramp in walk mode from the lobby (y 3.4) to floor 2 (y 8.4).
    {
      level: "educity-2",
      y: y1,
      polygon: ring(TAIDON.x0, TAIDON.x1, TAIDON.zTop, TAIDON.zFoot),
      slope: { from: P2(26, TAIDON.zFoot), to: P2(26, TAIDON.zTop), y0: y1, y1: y2 },
    },
  ];
}

// ── Colliders ───────────────────────────────────────────────────────────────

function seg(level: LevelId, a: V2, b: V2): Collider2D {
  return { level, kind: "segment", a: P2(a[0], a[1]), b: P2(b[0], b[1]) };
}

/** Wall centre line minus its door openings. */
function wallSegments(level: LevelId, w: WallSpec): Collider2D[] {
  const alongX = Math.abs(w.b[1] - w.a[1]) < 1e-6;
  const s0 = alongX ? w.a[0] : w.a[1];
  const s1 = alongX ? w.b[0] : w.b[1];
  const dir = s1 >= s0 ? 1 : -1;
  const lo = Math.min(s0, s1);
  const hi = Math.max(s0, s1);
  const gaps = (w.doors ?? []).map((d) => [s0 + dir * d.at - d.w / 2, s0 + dir * d.at + d.w / 2] as const).sort((a, b) => a[0] - b[0]);
  const out: Collider2D[] = [];
  let cur = lo;
  const k = alongX ? w.a[1] : w.a[0];
  const pt = (s: number): V2 => (alongX ? [s, k] : [k, s]);
  for (const [g0, g1] of gaps) {
    if (g0 > cur + 0.05) out.push(seg(level, pt(cur), pt(g0)));
    cur = Math.max(cur, g1);
  }
  if (hi > cur + 0.05) out.push(seg(level, pt(cur), pt(hi)));
  return out;
}

function rectSegments(level: LevelId, r: Rect): Collider2D[] {
  return [
    seg(level, [r.x0, r.z0], [r.x1, r.z0]),
    seg(level, [r.x1, r.z0], [r.x1, r.z1]),
    seg(level, [r.x1, r.z1], [r.x0, r.z1]),
    seg(level, [r.x0, r.z1], [r.x0, r.z0]),
  ];
}

/** A plan polyline with gaps [s0, s1] along its length. */
function lineWithGaps(level: LevelId, pts: V2[], gaps: [number, number][]): Collider2D[] {
  const out: Collider2D[] = [];
  let along = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / len;
    const uz = (b[1] - a[1]) / len;
    let cur = 0;
    const local = gaps
      .map(([g0, g1]) => [g0 - along, g1 - along] as [number, number])
      .filter(([g0, g1]) => g1 > 0 && g0 < len)
      .sort((p, q) => p[0] - q[0]);
    for (const [g0, g1] of local) {
      if (g0 > cur + 0.05) out.push(seg(level, [a[0] + ux * cur, a[1] + uz * cur], [a[0] + ux * g0, a[1] + uz * g0]));
      cur = Math.max(cur, g1);
    }
    if (len > cur + 0.05) out.push(seg(level, [a[0] + ux * cur, a[1] + uz * cur], b));
    along += len;
  }
  return out;
}

/** The building's outline (outer faces) with its doors, for a level. */
function outline(level: LevelId, includeStreetDoor: boolean): Collider2D[] {
  const out: Collider2D[] = [];
  const P = PAVILION;
  // Main block: NE, SE (door B), SW stubs beside the pavilion, NW (bridges at deck level are glazed walls of ICT-City).
  out.push(...lineWithGaps(level, [[0, 0], [BLOCK.w, 0]], []));
  out.push(...lineWithGaps(level, [[BLOCK.w, 0], [BLOCK.w, BLOCK.d]], [[DOOR_B.z0, DOOR_B.z1]]));
  out.push(seg(level, [BLOCK.w, BLOCK.d], [P.glassSE, BLOCK.d]));
  out.push(seg(level, [P.glassNW, BLOCK.d], [0, BLOCK.d]));
  out.push(...lineWithGaps(level, [[0, BLOCK.d], [0, 0]], includeStreetDoor ? [[BLOCK.d - 34.0, BLOCK.d - 31.5]] : []));
  // Pavilion: west face with the revolving door, south-west wall, east face with the sliding door.
  const W = MAIN_DOORS.west;
  const Ed = MAIN_DOORS.east;
  out.push(...lineWithGaps(level, [[P.glassNW, BLOCK.d], [P.glassNW, P.wallSW]], [[W.z - W.r - BLOCK.d, W.z + W.r - BLOCK.d]]));
  out.push(seg(level, [P.glassNW, P.wallSW], [P.glassSE, P.wallSW]));
  out.push(...lineWithGaps(level, [[P.glassSE, P.wallSW], [P.glassSE, BLOCK.d]], [[P.wallSW - Ed.z1, P.wallSW - Ed.z0]]));
  out.push(...drum(level));
  return out;
}

/**
 * The revolving door: its two curved glass walls (open towards the deck and the hall) and the centre
 * post. The wings turn, so they are no obstacle — a walker passes on either side of the post.
 */
export function drum(level: LevelId): Collider2D[] {
  const W = MAIN_DOORS.west;
  const out: Collider2D[] = [];
  for (const a0 of [Math.PI * 0.25, Math.PI * 1.25]) {
    const pts: V2[] = [0, 1, 2, 3].map((k) => {
      const a = a0 + (k / 3) * (Math.PI / 2);
      return [W.x + Math.cos(a) * W.r, W.z + Math.sin(a) * W.r];
    });
    for (let k = 0; k < 3; k++) out.push(seg(level, pts[k], pts[k + 1]));
  }
  out.push({ level, kind: "circle", c: P2(W.x, W.z), r: 0.08 });
  return out;
}

function planColliders(level: LevelId, plan: FloorPlan): Collider2D[] {
  const out: Collider2D[] = [];
  for (const w of plan.walls) out.push(...wallSegments(level, w));
  for (const b of plan.blocks) out.push(...rectSegments(level, b));
  for (const [x, z] of plan.columns) out.push({ level, kind: "circle", c: P2(x, z), r: 0.32 });
  return out;
}

export function educityColliders(): Collider2D[] {
  const out: Collider2D[] = [];
  // Outdoors: the outline with the deck doors (and the street-level gateway door).
  out.push(...outline("outdoor", true));
  // Floor 1: outline, walls, cores, columns, the stage, the registration desks, Taidon portaat's sides above the foot.
  out.push(...outline("educity-1", false));
  out.push(...planColliders("educity-1", F1));
  const S = POINTS.stage;
  out.push(...rectSegments("educity-1", S));
  const [rx, rz] = POINTS.registration;
  out.push(...rectSegments("educity-1", { x0: rx - 0.4, x1: rx + 0.4, z0: rz - 1.85, z1: rz + 1.85 }));
  // Sermi (dividers) behind the stage.
  out.push(seg("educity-1", POINTS.screen.a, POINTS.screen.b));
  // The stair well down to the lower lobby in the pavilion (balustrades; its open top end too: the
  // lower lobby is not part of the twin).
  out.push(...rectSegments("educity-1", PAVILION_STAIR));
  // Floor 2.
  out.push(...outline("educity-2", false));
  out.push(...planColliders("educity-2", F2));
  // The stair's sides (walk mode: no stepping off the ramp's sides above the foot).
  out.push(seg("educity-2", [TAIDON.x0, TAIDON.zTop], [TAIDON.x0, TAIDON.zFoot - 1.2]));
  out.push(seg("educity-2", [TAIDON.x1, TAIDON.zTop], [TAIDON.x1, TAIDON.zFoot - 1.2]));
  return out;
}

// ── Connectors ──────────────────────────────────────────────────────────────

export function educityConnectors(): Connector[] {
  return [
    { id: "edu-lift-w-up", label: "Lift up to floor 2", from: "educity-1", to: "educity-2", at: P2(4.4, 33.7), arrive: P2(4.4, 33.4) },
    { id: "edu-lift-w-down", label: "Lift down to floor 1", from: "educity-2", to: "educity-1", at: P2(4.4, 33.4), arrive: P2(4.4, 33.7) },
    { id: "edu-lift-e-up", label: "Lift up to floor 2", from: "educity-1", to: "educity-2", at: P2(48.6, 33.4), arrive: P2(48.6, 33.4) },
    { id: "edu-lift-e-down", label: "Lift down to floor 1", from: "educity-2", to: "educity-1", at: P2(48.6, 33.4), arrive: P2(48.6, 33.4) },
    { id: "edu-taidon-up", label: "Up Taidon portaat to floor 2", from: "educity-1", to: "educity-2", at: P2(18.6, 45.0), arrive: P2(18.6, 34.6) },
    { id: "edu-taidon-down", label: "Down Taidon portaat to floor 1", from: "educity-2", to: "educity-1", at: P2(18.6, 34.6), arrive: P2(18.6, 45.0) },
    // The street-level door's hotspot sits at its north jamb, within reach of the passage walk start.
    { id: "edu-gateway-up", label: "Step-free lift up to EduCity floor 1", from: "outdoor", to: "educity-1", at: P2(-1.4, 31.7), arrive: P2(2.6, 31.6) },
    { id: "edu-gateway-down", label: "Lift down to the street (ICT-City gateway)", from: "educity-1", to: "outdoor", at: P2(2.6, 31.6), arrive: P2(-1.6, 32.75) },
  ];
}

// ── Route legs (DESIGN §12) ─────────────────────────────────────────────────

const leg = (pts: [number, number][], y = 0): V3[] => pts.map(([x, z]) => P3(x, y, z));

export function educityRouteLegs(): Record<string, V3[]> {
  return {
    // East main entrance → through the pavilion and the east opening → registration: the walk ends at
    // the desks (west side of the service centre), turned towards them — the check-in tour's goal.
    "int-edu-east-to-registration": leg([
      [43.19, 74.73],
      [42.0, 72.4],
      [38.6, 67.2],
      [37.6, 65.2],
      [38.3, 60.0],
      [38.6, 55.2],
      [37.85, 54.4],
    ]),
    // West main entrance → round the pub → the west opening → the snack counter → the foot of Taidon portaat.
    "int-edu-west-to-taidon": leg([
      [9.33, 74.58],
      [11.4, 72.9],
      [13.7, 72.8],
      [14.8, 67.0],
      [14.8, 65.2],
      [15.0, 58.0],
      [15.2, 51.0],
      [17.0, 47.4],
      [18.6, 45.2],
    ]),
    // Door B (south-east walkway) → the lift lobby → the east corridor → the north corridor → room 1002.
    "int-edu-doorB-to-1002": leg([
      [51.81, 32.7],
      [50.4, 32.7],
      [47.4, 32.7],
      [44.7, 31.0],
      [44.7, 11.0],
      [43.2, 9.4],
      [26.7, 9.4],
      [26.7, 7.4],
    ]),
  };
}

export interface EduNav {
  targets: TwinTarget[];
  views: Record<string, CameraView>;
  colliders: Collider2D[];
  walkAreas: WalkArea[];
  connectors: Connector[];
  routeLegs: Record<string, V3[]>;
}

export function buildNav(): EduNav {
  return {
    targets: educityTargets(),
    views: EDUCITY_VIEWS,
    colliders: educityColliders(),
    walkAreas: educityWalkAreas(),
    connectors: educityConnectors(),
    routeLegs: educityRouteLegs(),
  };
}

/** Floor plans (tests). */
export const PLANS = { F1, F2 } as const;
