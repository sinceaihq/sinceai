import type { CameraView, TwinTarget, V3 } from "../../types";
import { ENTRANCE_TYK, MAUNO, STANDS, STAND_LABEL_GROUP, VESTIBULE, bToLocal, bToLocal3, round2 } from "./plan";

/**
 * Camera views and "Go to" targets of BioCity (lib/hackathon-2026/twin.ts ids):
 * poses are written in plan frame B (easier to reason about against the plan)
 * and converted to the campus frame. Interior views open the dollhouse at the
 * ground floor (cut at 4.5 m); the partner-entrance view stays outside.
 */

const OPEN = { building: "biocity", level: "biocity-1" } as const;

function pose(p: V3, t: V3): Pick<CameraView, "position" | "target"> {
  return { position: bToLocal3(p[0], p[1], p[2]), target: bToLocal3(t[0], t[1], t[2]) };
}

/**
 * Dollhouse close-ups of the stands in the partner corner, from over the walkway (roof lifted): the
 * row's stands from in front and a little to the west (the way builders come along the hall),
 * Solita from over the hall's central walkway.
 */
const rowCamera = (x: number): { p: V3; t: V3; open: boolean } => ({ p: [x - 2.2, 5.6, -0.4], t: [x + 0.3, 1.3, -7.1], open: true });
const STAND_CAMERAS: Record<string, { p: V3; t: V3; open: boolean }> = {
  "bc-1": rowCamera(22.15),
  "bc-3": rowCamera(24.35),
  "bc-4": rowCamera(26.55),
  "bc-5": rowCamera(28.75),
  "bc-2": { p: [16.4, 6.4, -1.2], t: [26.2, 1.1, -2.7], open: true },
};

function standView(id: string): CameraView {
  const s = STANDS.find((x) => x.id === id);
  const c = STAND_CAMERAS[id];
  if (!s || !c) throw new Error(`biocity: no stand ${id}`);
  return { ...pose(c.p, c.t), hfov: c.open ? 62 : 58, fit: 6, labels: true, open: c.open ? OPEN : null };
}

export const BIOCITY_VIEWS: Record<string, CameraView> = {
  // The build hall down its length from over the Tykistökatu end, the roof lifted: the 56 tables, the
  // partner corner at the far end and the passage to Joki beyond (the hall leads, not the walls round it).
  "biocity:default": {
    ...pose([-40, 12, 2.5], [4, 0, -0.5]),
    hfov: 62,
    fit: 32,
    portrait: { ...pose([-42, 30, 0.4], [2, 0, -0.4]), fit: 14 },
    labels: true,
    open: OPEN,
  },
  // Partner entrance: in the recess mouth on Tykistökatu, looking at the revolving door and up the glass gable.
  "biocity:entrance": {
    ...pose([-45.4, 1.8, -0.9], [-29.6, 4.4, 0.7]),
    hfov: 72,
    portrait: { ...pose([-46.5, 1.8, -0.6], [-29.6, 7.0, 0.6]), fit: 7 },
    labels: true,
    open: null,
  },
  // The curved Aulagalleria from over the courtyard: the builders' event entrance and the way to the meals.
  "biocity:gallery": {
    ...pose([0.5, 30, -51], [2, 0, -27]),
    hfov: 62,
    fit: 20,
    // Phones: steeper, from over the courtyard (Electrocity's roof would fill the foreground).
    portrait: { ...pose([0.5, 43, -44], [0.5, 0, -28.5]), fit: 13 },
    labels: true,
    open: OPEN,
  },
  // The partner corner: all five stand positions from over the build hall's east end, the walkway to
  // Joki in front of them (roof lifted).
  "biocity:stands": {
    ...pose([13.2, 11.5, 4.2], [25.6, 0.6, -4.6]),
    hfov: 62,
    fit: 12,
    // Phones: steeper, from over the walkway, the row running across the screen.
    portrait: { ...pose([24.2, 21, 6.5], [25.4, 0, -4.4]), fit: 9 },
    labels: true,
    // All stand labels, open positions included, also on phones (which drop "open" labels elsewhere).
    labelGroup: STAND_LABEL_GROUP,
    open: OPEN,
  },
};

/** Where "Walk me there" ends: in front of the thing, on the ground floor. */
function walkTo(x: number, z: number): [number, number] {
  const [lx, lz] = bToLocal(x, z);
  return [round2(lx), round2(lz)];
}

export function biocityTargets(): TwinTarget[] {
  const out: TwinTarget[] = [];
  for (const s of STANDS) {
    // 3.6 m out: the whole stand (wall graphic, counter, roll-up) in view, not a counter in the face —
    // or the stand's own clear spot in the partner corner (the row has a column and Solita in front).
    const w = s.walk ? walkTo(s.walk[0], s.walk[1]) : walkTo(s.x + s.face[0] * 3.6, s.z + s.face[1] * 3.6);
    out.push({ id: s.id, view: standView(s.id), level: "biocity-1", walkTo: w });
  }
  // From across Tykistökatu straight down the revolving door's axis (the walk-mode heading comes from
  // this view): "Walk me there" starts 5.5 m out in the recess, on the door's keep-right side.
  out.push({
    id: "entrance-biocity-tykistokatu",
    view: {
      ...pose([-58.5, 5.2, ENTRANCE_TYK.drum.z + 0.25], [-31.0, 3.2, ENTRANCE_TYK.drum.z + 0.25]),
      hfov: 54,
      labels: true,
      open: null,
    },
    walkTo: walkTo(ENTRANCE_TYK.threshold[0] - 5.5, ENTRANCE_TYK.drum.z + 0.25),
  });
  out.push({
    id: "entrance-biocity-courtyard",
    view: { ...pose([4.0, 4.4, -51.5], [0.0, 2.2, -35.6]), hfov: 66, labels: true, open: null },
    walkTo: walkTo((VESTIBULE.x0 + VESTIBULE.x1) / 2, VESTIBULE.z0 - 3.2),
  });
  out.push({
    id: "build-hall",
    view: BIOCITY_VIEWS["biocity:default"],
    level: "biocity-1",
    walkTo: walkTo(-17.5, -0.3),
  });
  // Looking at serving line 1 across its open (+z) side, Maunon sali beyond; walking ends on that
  // side, clear of the gallery columns, facing the counter (the view's direction).
  const L1 = MAUNO.line1;
  const servingX = (L1.x0 + L1.x1) / 2;
  out.push({
    id: "serving-lines",
    view: {
      ...pose([servingX + 0.6, 11.5, -15.5], [servingX - 0.4, 0.6, -31.0]),
      hfov: 62,
      fit: 12,
      labels: true,
      open: OPEN,
    },
    level: "biocity-1",
    walkTo: walkTo(servingX, L1.z1 + 1.45),
  });
  return out;
}

