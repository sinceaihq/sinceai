import type { CameraView, TwinTarget, V3 } from "../../types";
import { ENTRANCE_TYK, MAUNO, STANDS, VESTIBULE, bToLocal, bToLocal3, round2 } from "./plan";

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
 * Dollhouse close-ups of the stands. Stands 1 and 3 face the curved glass of the Aulagalleria
 * (0.9 m away), so their camera looks in over the glass from the event entrance side.
 */
const STAND_CAMERAS: Record<string, { p: V3; t: V3; open: boolean }> = {
  // Stands 1 and 3 from above the event entrance, roof lifted: the way you meet them coming in.
  "bc-1": { p: [-3.5, 7.5, -34.6], t: [6.45, 1.2, -31.8], open: true },
  "bc-3": { p: [3.5, 7.5, -34.6], t: [-6.45, 1.2, -31.8], open: true },
  // Stands 2 and 4 from above the build hall's central walkway (roof lifted).
  "bc-2": { p: [16.4, 6.4, -1.2], t: [26.2, 1.1, -2.7], open: true },
  "bc-4": { p: [-12.6, 6.4, -0.6], t: [-24.4, 1.0, -3.4], open: true },
};

function standView(id: string): CameraView {
  const s = STANDS.find((x) => x.id === id);
  const c = STAND_CAMERAS[id];
  if (!s || !c) throw new Error(`biocity: no stand ${id}`);
  return { ...pose(c.p, c.t), hfov: c.open ? 62 : 58, fit: 6, labels: true, open: c.open ? OPEN : null };
}

export const BIOCITY_VIEWS: Record<string, CameraView> = {
  // The build hall from above its Tykistökatu end, the roof lifted: tables, stands bc-2/bc-4, the stair to Joki.
  "biocity:default": {
    ...pose([-37, 16.5, 9.5], [3, 0, -1.2]),
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
  // The curved Aulagalleria from over the courtyard: the event entrance and stands 1 and 3.
  "biocity:gallery": {
    ...pose([0.5, 30, -51], [2, 0, -27]),
    hfov: 62,
    fit: 20,
    // Phones: steeper, from over the courtyard (Electrocity's roof would fill the foreground).
    portrait: { ...pose([0.5, 43, -44], [0.5, 0, -28.5]), fit: 13 },
    labels: true,
    open: OPEN,
  },
  // All four stands: the gallery (1, 3) and both ends of the build hall (2, 4).
  "biocity:stands": {
    ...pose([1, 40, -60], [1, 0, -16]),
    hfov: 64,
    fit: 30,
    // Phones: nearly straight down with the hall running up the screen (all four stands in view).
    portrait: { ...pose([-22, 76, -17], [1.5, 0, -17]), fit: 17 },
    labels: true,
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
    // Stand 1 and 3 have ≈0.9 m to the curved glass: walk to their open end, not their front.
    // Stands 1 and 3 have the curved glass close in front: walking ends just inside the event
    // entrance, looking at the stand (the view's direction); 2 and 4 in front of the stand.
    const gallery = s.id === "bc-1" || s.id === "bc-3";
    const w = gallery ? walkTo(Math.sign(s.x) * 0.4, -32.9) : walkTo(s.x + s.face[0] * 1.6, s.z + s.face[1] * 1.6);
    out.push({ id: s.id, view: standView(s.id), level: "biocity-1", walkTo: w });
  }
  out.push({
    id: "entrance-biocity-tykistokatu",
    view: { ...pose([-58.5, 5.6, 5.5], [-31.0, 4.6, 0.2]), hfov: 66, labels: true, open: null },
    walkTo: walkTo(ENTRANCE_TYK.threshold[0] - 4.5, 0.4),
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
  out.push({
    id: "serving-lines",
    view: {
      ...pose([8.0, 13.5, -45.5], [21.5, 0.5, -26.5]),
      hfov: 62,
      fit: 12,
      labels: true,
      open: OPEN,
    },
    level: "biocity-1",
    walkTo: walkTo((MAUNO.line1.x0 + MAUNO.line1.x1) / 2, MAUNO.line1.z0 - 1.3),
  });
  return out;
}

