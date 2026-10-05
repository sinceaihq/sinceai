import type { Collider2D, Connector, V2, WalkArea } from "../../types";
import {
  COLUMN_ROWS,
  COLUMN_X,
  ENTRANCE_TYK,
  FLAGPOLES,
  GABLE_W_X,
  GALLERY_COLUMNS,
  ISLANDS,
  JOKI_PASSAGE,
  LEVEL,
  LOBBY_FRONTS,
  MAUNO,
  OVAL_COLUMNS,
  RETAIL_FRONT,
  ROUND_COLUMNS,
  STANDS,
  SW_FACADE_Z,
  VESTIBULE,
  VESTIBULE_DOOR,
  bToLocal,
  buildTables,
  groundFloorRing,
  round2,
  vestibuleLeaves,
  wingOutline,
} from "./plan";
import { GF_WALLS } from "./walls";
import { DOOR } from "./door";

/**
 * Walking in BioCity (DESIGN §6, §12): the ground floor is level "biocity-1"
 * (y 0.06) — one walk area over the whole floor plus the passage stair down
 * to Joki as a ramp (0.06 → −1.70) and a landing that reaches into Joki's
 * Aula. Colliders: the TTK plan's walls, the columns, the glazed unit fronts,
 * the lift/stair islands, the kiosk, the build tables (with their chairs),
 * the stands and counters, and the building's ground-storey envelope with
 * gaps at the real doors (the Tykistökatu revolving door — its curved walls
 * and centre post; the wings turn with the walker, door.ts — and the
 * event-entrance vestibule) so a walker comes in from the street or the
 * courtyard and the level switches automatically. Pure data (unit-tested).
 */

const LEVEL_ID = "biocity-1" as const;

const loc = (p: V2): V2 => {
  const [x, z] = bToLocal(p[0], p[1]);
  return [round2(x), round2(z)];
};

function seg(a: V2, b: V2): Collider2D {
  return { level: LEVEL_ID, kind: "segment", a: loc(a), b: loc(b) };
}

function circle(c: V2, r: number): Collider2D {
  return { level: LEVEL_ID, kind: "circle", c: loc(c), r };
}

function rect(x0: number, z0: number, x1: number, z1: number): Collider2D[] {
  return [seg([x0, z0], [x1, z0]), seg([x1, z0], [x1, z1]), seg([x1, z1], [x0, z1]), seg([x0, z1], [x0, z0])];
}

/** Polyline as segments, skipping the parts inside gaps (intervals along the line, metres). */
function polyline(points: V2[], gaps: [number, number][] = []): Collider2D[] {
  const out: Collider2D[] = [];
  let s0 = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 1e-3) continue;
    // Split [s0, s0 + len] by the gaps.
    let cuts: [number, number][] = [[s0, s0 + len]];
    for (const [g0, g1] of gaps) {
      const next: [number, number][] = [];
      for (const [c0, c1] of cuts) {
        if (g1 <= c0 || g0 >= c1) next.push([c0, c1]);
        else {
          if (g0 > c0) next.push([c0, g0]);
          if (g1 < c1) next.push([g1, c1]);
        }
      }
      cuts = next;
    }
    for (const [c0, c1] of cuts) {
      if (c1 - c0 < 0.05) continue;
      const t0 = (c0 - s0) / len;
      const t1 = (c1 - s0) / len;
      out.push(seg([a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1]));
    }
    s0 += len;
  }
  return out;
}

export interface BiocityWalk {
  colliders: Collider2D[];
  walkAreas: WalkArea[];
  connectors: Connector[];
}

/** Every walking constraint of BioCity's ground floor, in the campus frame. */
export function biocityWalk(): BiocityWalk {
  const colliders: Collider2D[] = [];
  const P = JOKI_PASSAGE;

  // Walls of the TTK plan.
  for (const flat of GF_WALLS) {
    const ring: V2[] = [];
    for (let i = 0; i + 1 < flat.length; i += 2) ring.push([flat[i], flat[i + 1]]);
    if (ring.length < 2) continue;
    colliders.push(...polyline([...ring, ring[0]]));
  }

  // Columns.
  for (const z of [COLUMN_ROWS.lobbyNE, COLUMN_ROWS.lobbySW]) for (const x of COLUMN_X) if (x < 30.5) colliders.push(circle([x, z], 0.27));
  for (const p of GALLERY_COLUMNS) colliders.push(circle(p, 0.27));
  for (const p of OVAL_COLUMNS) colliders.push(circle(p, 0.62));
  for (const c of ROUND_COLUMNS) colliders.push(circle([c.x, c.z], c.d / 2));
  for (const f of FLAGPOLES) if (f.pole) colliders.push(circle([f.x, f.z], 0.1));

  // Glazed unit fronts round the lobby and the lean-to.
  for (const f of LOBBY_FRONTS) colliders.push(seg([f.x0, f.z], [f.x1, f.z]));
  colliders.push(seg([RETAIL_FRONT.x0, RETAIL_FRONT.z], [RETAIL_FRONT.x1, RETAIL_FRONT.z]));
  colliders.push(seg([RETAIL_FRONT.x0, RETAIL_FRONT.z], [RETAIL_FRONT.x0, RETAIL_FRONT.back]));
  colliders.push(seg([RETAIL_FRONT.x1, RETAIL_FRONT.z], [RETAIL_FRONT.x1, RETAIL_FRONT.back]));

  // Islands: lift towers, stairs, kiosk.
  for (const k of ["liftsA", "liftsB", "stairA", "stairB", "kiosk"] as const) {
    const r = ISLANDS[k];
    colliders.push(...rect(r.x0 - 0.1, r.z0 - 0.1, r.x1 + 0.1, r.z1 + 0.1));
  }

  // Build tables with their chairs (long side along z; chairs on the ±x sides).
  for (const t of buildTables()) colliders.push(...rect(t.x - 0.85, t.z - 0.92, t.x + 0.85, t.z + 0.92));

  // Stands (footprint) and the restaurant counters.
  for (const s of STANDS) {
    const hw = (Math.abs(s.face[0]) > 0.5 ? s.depth : s.width) / 2;
    const hd = (Math.abs(s.face[0]) > 0.5 ? s.width : s.depth) / 2;
    colliders.push(...rect(s.x - hw, s.z - hd, s.x + hw, s.z + hd));
  }
  for (const r of [MAUNO.line1, MAUNO.line2, MAUNO.hood]) colliders.push(...rect(r.x0, r.z0, r.x1, r.z1));
  const B = MAUNO.bar;
  colliders.push(...rect(B.x0, B.z0, B.x1, B.z1));

  // Ground-storey envelope with the doors left open.
  // Tykistökatu gable: glass from the white wall to the tile wall, open in front of the revolving door.
  const D = ENTRANCE_TYK.drum;
  const O = ENTRANCE_TYK.opening;
  colliders.push(seg([GABLE_W_X, -4.62], [GABLE_W_X, O.z0]));
  colliders.push(seg([GABLE_W_X, O.z1], [GABLE_W_X, 5.6]));
  // Glass cheeks from the gable to the drum's mouth.
  const mouthX = D.x - D.r * Math.sin((62 * Math.PI) / 180);
  colliders.push(seg([GABLE_W_X, O.z0], [mouthX, O.z0]));
  colliders.push(seg([GABLE_W_X, O.z1], [mouthX, O.z1]));
  // Revolving drum: the two curved side walls of the enclosure (open towards the street and the lobby).
  for (const [b0, b1] of [
    [-62, 62],
    [118, 242],
  ]) {
    const pts: V2[] = [];
    for (let i = 0; i <= 8; i++) {
      const b = ((b0 + ((b1 - b0) * i) / 8) * Math.PI) / 180;
      pts.push([D.x + Math.sin(b) * D.r, D.z - Math.cos(b) * D.r]);
    }
    colliders.push(...polyline(pts));
  }
  // Centre post + wing hub. Set 3 cm towards −z, so a walker heading dead-centre slides round on the
  // +z side (keep right; the side the route takes and the wings turn for).
  colliders.push(circle([DOOR.x, DOOR.z - 0.03], DOOR.post));
  colliders.push(seg([-30.0, 5.6], [-30.0, 14.6]));
  colliders.push(seg([-30.0, 14.6], [36.6, 14.6]));
  colliders.push(seg([-43.3, -4.62], [GABLE_W_X, -4.62]));
  colliders.push(seg([-52.3, -31.7], [-41.4, -4.9]));
  // Arcade edge (railing) along Lemminkäisenkatu, open at the steps by Joki's portal.
  colliders.push(seg([-29.7, SW_FACADE_Z + 0.1], [32.6, SW_FACADE_Z + 0.1]));
  // The one-storey wing with the vestibule's outer doors open.
  const wing = wingOutline().points;
  const doorMid: V2 = [(VESTIBULE.x0 + VESTIBULE.x1) / 2, VESTIBULE.z0];
  let s = 0;
  let doorAt = -1;
  for (let i = 0; i + 1 < wing.length; i++) {
    const a = wing[i];
    const b = wing[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const t = ((doorMid[0] - a[0]) * (b[0] - a[0]) + (doorMid[1] - a[1]) * (b[1] - a[1])) / (len * len);
    const px = a[0] + (b[0] - a[0]) * t;
    const pz = a[1] + (b[1] - a[1]) * t;
    if (t >= 0 && t <= 1 && Math.hypot(px - doorMid[0], pz - doorMid[1]) < 0.05) doorAt = s + t * len;
    s += len;
  }
  colliders.push(...polyline(wing, doorAt >= 0 ? [[doorAt - VESTIBULE_DOOR.half, doorAt + VESTIBULE_DOOR.half]] : []));
  // Its open door leaves and the inner screen beside the inner doors.
  for (const [a, b] of vestibuleLeaves()) colliders.push(seg(a, b));
  colliders.push(seg([VESTIBULE.x0, VESTIBULE_DOOR.innerZ], [-VESTIBULE_DOOR.innerHalf, VESTIBULE_DOOR.innerZ]));
  colliders.push(seg([VESTIBULE_DOOR.innerHalf, VESTIBULE_DOOR.innerZ], [VESTIBULE.x1, VESTIBULE_DOOR.innerZ]));
  // East side: kitchen and the Joki wall, open at the passage.
  colliders.push(seg([36.2, -31.85], [36.2, -12.75]));
  colliders.push(seg([36.2, -12.75], [36.92, -12.75]));
  colliders.push(seg([36.92, -12.75], [36.92, P.z0]));
  colliders.push(seg([36.92, P.z1], [36.92, 14.55]));
  // Passage walls and the stair's side walls.
  colliders.push(seg([P.threshold, P.z0], [P.wallX1 + 0.6, P.z0]));
  colliders.push(seg([P.threshold, P.z1], [P.wallX1 + 0.6, P.z1]));

  // Walk areas.
  const floor = groundFloorRing().map(loc);
  const walkAreas: WalkArea[] = [
    { level: LEVEL_ID, polygon: floor, y: LEVEL.gf },
    {
      level: LEVEL_ID,
      polygon: [
        [P.stairX0 - 0.02, P.z0],
        [36.0, P.z0],
        [36.0, P.z1],
        [P.stairX0 - 0.02, P.z1],
      ].map((p) => loc(p as V2)),
      y: LEVEL.gf,
      slope: { from: loc([P.stairX0, 0.5]), to: loc([36.0, 0.5]), y0: LEVEL.gf, y1: P.bottom },
    },
    {
      level: LEVEL_ID,
      polygon: [
        [36.0, P.z0],
        [P.wallX1 + 0.5, P.z0],
        [P.wallX1 + 0.5, P.z1],
        [36.0, P.z1],
      ].map((p) => loc(p as V2)),
      y: P.bottom,
    },
  ];

  const connectors: Connector[] = [
    {
      id: "biocity-stair-to-joki",
      label: "Go down to Joki (10 steps)",
      from: LEVEL_ID,
      to: "joki-1",
      at: loc([P.stairX0 - 0.8, 0.5]),
      arrive: loc([P.wallX1 + 1.0, 0.5]),
    },
    {
      id: "joki-stair-to-biocity",
      label: "Go up to BioCity",
      from: "joki-1",
      to: LEVEL_ID,
      at: loc([P.wallX1 + 0.7, 0.5]),
      arrive: loc([P.stairX0 - 1.2, 0.5]),
    },
  ];
  return { colliders, walkAreas, connectors };
}
