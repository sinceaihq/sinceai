/**
 * routes.json — walking route legs with heights, and the audience tours.
 *
 * Legs come from research/spec_routes.json (SPEC §6: OSM/base-map routing by
 * the geo team, indoor legs from the CAD plans, wall-checked) plus a few
 * derived legs (reverses, the step-free leg over the zebra, the partner-stand
 * leg) built only from those vertices.
 *
 * Outdoor legs are densified to ≤ 2 m. Their walking level y comes from the
 * terrain, except on structures the terrain does not carry: bridge decks
 * (surveyed deck level of the street register's bridge polygons; Kalevansilta
 * by estimate), stairs (interpolated between the levels at their ends),
 * EduCity's deck-level walkway (y 3.40) and the hero buildings' ground floors
 * where a leg starts or ends at a door inside the outline (BioCity 0.06,
 * EduCity 3.40, Joki's hall −1.70; overhangs such as the glass link bridges
 * over the street-level ICT-City passage keep the terrain).
 */
import { EVENT_ENTRANCES } from "./campus.mjs";
import { EDUCITY_SE_PLAZA } from "./terrain.mjs";
import { densify, nearestOnLine, pointInRing, r1, r2 } from "./geo.mjs";

export const WALK_SPEED = 1.3;
const STEP = 2;
const EDUCITY_DECK_Y = 3.4;
/** SPEC §7.0 ground floors reached from the outdoor legs. */
const HERO_FLOOR = { w48381050: 0.06, w731925812: 3.4 };
const JOKI_HALL_FLOOR = -1.7;
/** SPEC §7.1: Stand 1 (bc-1) centre — the partner-stand leg ends in front of it. */
const STAND_1 = [22.78, -0.28];

/** Tours (ids, legs and end targets match lib/hackathon-2026/twin.ts TOURS_3D; a unit test checks it). */
export const TOURS = [
  [
    "builders-train-checkin",
    "builders",
    "Fri 6 Nov from 15:00",
    ["out-arr-train-edu-east", "int-edu-east-to-registration"],
    "registration",
  ],
  [
    "builders-station-hall-checkin",
    "builders (station hall / bus 3)",
    "Fri 6 Nov from 15:00",
    ["out-arr-stdoor-edu-east", "int-edu-east-to-registration"],
    "registration",
  ],
  [
    "partners-fri-parkcity-edu",
    "challenge partners (car)",
    "Fri 6 Nov 15:30",
    ["out-arr-parkcity-edu-b", "int-edu-doorB-to-1002"],
    "company-arrival",
  ],
  [
    "partners-fri-train-edu",
    "challenge partners (train)",
    "Fri 6 Nov 15:30",
    ["out-arr-train-edu-b", "int-edu-doorB-to-1002"],
    "company-arrival",
  ],
  [
    "partners-fri-stepfree-edu",
    "step-free access to EduCity",
    "Fri",
    ["out-parkcity-gw-zebra"],
    "entrance-educity-gateway",
  ],
  [
    "partners-tykistokatu-to-stands",
    "visibility and tech partners",
    "Fri 6 Nov from 18:00",
    ["out-co-kerb-bio-main", "int-bio-tyk-to-gallery"],
    "bc-1",
  ],
  [
    "builders-transfer-to-build",
    "builders",
    "Fri 6 Nov ~19:30",
    ["out-xfer-edu-west-bio-event", "int-bio-event-to-lobby"],
    "build-hall",
  ],
  [
    "companies-tykistokatu-to-showroom",
    "challenge partners",
    "Sat 7 Nov from 08:30",
    ["out-co-kerb-bio-main", "int-bio-tyk-to-joki", "int-joki-aula-to-showroom"],
    "showroom",
  ],
  [
    "companies-parkcity-to-biocity",
    "companies and partners (car)",
    "Sat/Sun",
    ["out-co-parkcity-bio-main"],
    "entrance-biocity-tykistokatu",
  ],
  [
    "companies-train-to-biocity",
    "companies and partners (train/bus)",
    "Sat/Sun",
    ["out-co-stdoor-bio-main"],
    "entrance-biocity-tykistokatu",
  ],
  [
    "builders-build-to-joki",
    "builders",
    "Sat 7 Nov Q&A",
    ["int-bio-tyk-to-joki", "int-joki-aula-to-showroom"],
    "showroom",
  ],
  [
    "builders-back-to-educity",
    "everyone",
    "Sun 8 Nov before 13:00",
    ["int-bio-lobby-to-event", "out-xfer-bio-event-edu-west", "int-edu-west-to-taidon"],
    "taidon-portaat",
  ],
];

const len2 = (pts) => {
  let s = 0;
  for (let i = 1; i < pts.length; i++)
    s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][pts[i].length - 1] - pts[i - 1][pts[i - 1].length - 1]);
  return s;
};

/**
 * The routed legs reach BioCity's event entrance with a straight "access
 * segment" across the timber terrace from the Electrocity passage; it runs
 * through the glazed box on the terrace (LOD1 record at (29.3, −6.7), visible
 * on the 2022 true ortho) and clips a planter. Walk south of the box instead.
 */
/**
 * Legs routed under the Ströget deck (OSM layer −1): the laser DTM there is the
 * deck surface above them, so their heights cannot be resolved — left out
 * (no tour uses them).
 */
const UNDER_DECK_LEGS = new Set(["out-arr-train-edu-west", "out-xfer-edu-east-bio-event"]);

const TERRACE_FROM = [43.6, -2.15];
const TERRACE_DOOR = [22.4, -7.8];
const TERRACE_DETOUR = [
  [29.0, -3.6],
  [25.4, -5.6],
];

function correctLeg(points) {
  const near = (p, q, d) => Math.hypot(p[0] - q[0], p[1] - q[1]) < d;
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (near(a, TERRACE_FROM, 1) && near(b, TERRACE_DOOR, 1)) out.push(...TERRACE_DETOUR);
    else if (near(a, TERRACE_DOOR, 1) && near(b, TERRACE_FROM, 1)) out.push(...[...TERRACE_DETOUR].reverse());
    out.push(b);
  }
  return out;
}

export function buildRoutes({ specRoutes, osm, heights, streets, terrain, educityMassing, log }) {
  const spec = structuredClone(specRoutes.legs);
  for (const leg of Object.values(spec)) {
    if (leg.yMode === "snap") {
      const fixed = correctLeg(leg.points_xz);
      if (fixed.length !== leg.points_xz.length) {
        leg.points_xz = fixed;
        leg.length_m = Math.round(len2(fixed) * 10) / 10;
        leg.source += "; terrace access rerouted around the glazed box";
      }
    }
  }

  // ── Derived legs.
  const derived2d = {};
  const derived3d = {};
  derived3d["int-bio-lobby-to-event"] = {
    title: "BioCity main lobby → Aulagalleria → event entrance (reverse)",
    points: [...spec["int-bio-event-to-lobby"].points_xyz].reverse(),
    reverseOf: "int-bio-event-to-lobby",
  };
  derived2d["out-xfer-bio-event-edu-west"] = {
    title: "BioCity event entrance → Jussin aukio stair (up) → campus deck → EduCity west main entrance (reverse)",
    points: [...spec["out-xfer-edu-west-bio-event"].points_xz].reverse(),
    reverseOf: "out-xfer-edu-west-bio-event",
    stepFlights: spec["out-xfer-edu-west-bio-event"].stepFlights,
  };
  {
    // Step-free ParkCity → gateway over the zebra at (236, 47) (the routed leg walks 8 m along the carriageway).
    const a = spec["out-arr-parkcity-edu-b"].points_xz;
    const b = spec["out-b-sw2-gw"].points_xz;
    const zebraEnd = a.findIndex(([x, z]) => x === 227.2 && z === 57.2);
    const gw = b.findIndex(([x, z]) => x === 213.0 && z === 45.8);
    if (zebraEnd < 0 || gw < 0) throw new Error("routes: zebra/gateway vertices not found");
    derived2d["out-parkcity-gw-zebra"] = {
      title: "ParkCity street door → zebra crossing → EduCity NE sidewalk → ICT-City gateway (step-free lifts)",
      points: [...a.slice(0, zebraEnd + 1), ...b.slice(gw)],
      stepFlights: 0,
    };
  }
  {
    // Tykistökatu door → lobby walkway → east ring corridor → Aulagalleria, ending in front of Stand 1.
    const tyk = spec["int-bio-tyk-to-joki"].points_xyz;
    const ev = [...spec["int-bio-event-to-lobby"].points_xyz].reverse();
    const join = ev[0]; // (1.44, 0.06, 23.85) lies on the lobby walkway segment of the Tykistökatu leg
    const hit = nearestOnLine(
      [join[0], join[2]],
      [tyk[2], tyk[3]].map(([x, , z]) => [x, z]),
    );
    if (hit.d > 0.05) throw new Error("routes: the event leg does not join the lobby walkway");
    // Last segment: stop at the point nearest to Stand 1.
    const k = ev.findIndex(([x, , z]) => x === 19.57 && z === -2.18);
    const last = nearestOnLine(
      STAND_1,
      [ev[k - 1], ev[k]].map(([x, , z]) => [x, z]),
    ).point;
    derived3d["int-bio-tyk-to-gallery"] = {
      title: "BioCity Tykistökatu door → main lobby → east ring corridor → Aulagalleria (Stand 1)",
      points: [...tyk.slice(0, 3), ...ev.slice(0, k), [r2(last[0]), ev[k][1], r2(last[1])]],
    };
  }

  // ── Structure context for outdoor heights.
  const ways = [...osm.paths, ...osm.roads];
  const wayOf = (a, b) => {
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let best = null;
    for (const w of ways) {
      const hit = nearestOnLine(m, w.centerline);
      if (hit.d < 0.8 && (!best || hit.d < best.d)) best = { d: hit.d, w };
    }
    return best?.w ?? null;
  };
  const bridgeAreas = streets.areas.filter((s) => s.part === "bridge" && Number.isFinite(s.deckY));
  const deckAt = (p) => {
    const inside = bridgeAreas.find((s) => pointInRing(p, s.poly));
    if (inside) return inside.deckY;
    let best = null;
    for (const s of bridgeAreas) {
      for (let i = 0; i < s.poly.length; i++) {
        const hit = nearestOnLine(p, [s.poly[i], s.poly[(i + 1) % s.poly.length]]);
        if (hit.d < 6 && (!best || hit.d < best.d)) best = { d: hit.d, y: s.deckY };
      }
    }
    return best?.y;
  };
  const walkway = educityMassing.SE_walkway.poly;
  // Hero floors: outline minus overhang parts (min_level ≥ 1); Joki by its LOD2 hall roof (the tower door is at deck level).
  const floors = [];
  for (const [id, y] of Object.entries(HERO_FLOOR)) {
    const b = osm.buildings.find((x) => x.id === id);
    floors.push({
      ring: b.polygon,
      y,
      holes: (b.parts ?? []).filter((p) => (p.minLevel ?? 0) >= 1).map((p) => p.polygon),
    });
  }
  const hall = heights.buildings_all
    .find((b) => b.prt === "103454371S")
    .roof_levels.find((l) => l.z_n2000 === 26.42).polygons_local;
  for (const ring of hall) floors.push({ ring, y: JOKI_HALL_FLOOR, holes: [] });
  const floorAt = (p) => floors.find((f) => pointInRing(p, f.ring) && !f.holes.some((h) => pointInRing(p, h)))?.y;

  const resolveOutdoor = (pts2) => {
    // Per original segment: is it a bridge deck or stairs?
    const segKind = [];
    for (let i = 0; i < pts2.length - 1; i++) {
      const w = wayOf(pts2[i], pts2[i + 1]);
      const tag = (k) => w?.[k] ?? w?.tags?.[k];
      const bridge = tag("bridge") === "yes" && Number(tag("layer") ?? 1) >= 1;
      segKind.push(w?.highway === "steps" ? "steps" : bridge ? "bridge" : "ground");
    }
    const out = [];
    for (let i = 0; i < pts2.length - 1; i++) {
      const piece = densify([pts2[i], pts2[i + 1]], STEP);
      piece.forEach((p, k) => {
        if (i > 0 && k === 0) return;
        out.push({ p, kind: segKind[i], seg: i });
      });
    }
    for (const o of out) {
      const [x, z] = o.p;
      let y = terrain.heightAt(x, z);
      if (o.kind === "bridge") {
        const d = deckAt(o.p);
        if (d !== undefined) y = d;
      }
      if (pointInRing(o.p, walkway) || pointInRing(o.p, EDUCITY_SE_PLAZA)) y = EDUCITY_DECK_Y;
      const floor = floorAt(o.p);
      if (floor !== undefined) y = floor;
      // Door thresholds win (the ICT-City gateway door is at street level inside EduCity's outline).
      const door = EVENT_ENTRANCES.find((e) => Math.hypot(e.at[0] - x, e.at[1] - z) < 1.5);
      if (door) y = door.y;
      o.y = y;
    }
    // Stairs: straight between the levels just before and after.
    for (let i = 0; i < out.length; i++) {
      if (out[i].kind !== "steps") continue;
      let j = i;
      while (j < out.length && out[j].kind === "steps") j++;
      const a = Math.max(0, i - 1);
      const b = Math.min(out.length - 1, j);
      const ya = out[a].y;
      const yb = out[b].y;
      const da = Math.hypot(out[a].p[0] - out[b].p[0], out[a].p[1] - out[b].p[1]) || 1;
      for (let k = i; k < j; k++) {
        const t = Math.hypot(out[k].p[0] - out[a].p[0], out[k].p[1] - out[a].p[1]) / da;
        out[k].y = ya + (yb - ya) * t;
      }
      i = j;
    }
    return out.map((o) => [r2(o.p[0]), r2(o.y), r2(o.p[1])]);
  };

  // ── Legs.
  const legs = {};
  const outdoor2d = {};
  const addLeg = (id, def, mode) => {
    if (mode === "outdoor") outdoor2d[id] = def.points;
    const points =
      mode === "outdoor" ? resolveOutdoor(def.points) : def.points.map(([x, y, z]) => [r2(x), r2(y), r2(z)]);
    const lengthM = r1(len2(mode === "outdoor" ? def.points : def.points.map(([x, , z]) => [x, z])));
    legs[id] = {
      id,
      title: def.title,
      mode,
      lengthM,
      minutes: r1(lengthM / WALK_SPEED / 60),
      ...(def.stepFlights !== undefined ? { stepFlights: def.stepFlights } : {}),
      points,
      ...(def.reverseOf ? { reverseOf: def.reverseOf } : {}),
      source: def.source ?? (def.reverseOf ? `reverse of ${def.reverseOf}` : "derived from the spec legs' vertices"),
    };
  };
  for (const [id, leg] of Object.entries(spec)) {
    if (UNDER_DECK_LEGS.has(id)) {
      log(`routes: ${id} left out (walks under the campus deck; the DTM has the deck surface there)`);
      continue;
    }
    const mode = leg.yMode === "snap" ? "outdoor" : "indoor";
    addLeg(
      id,
      {
        title: leg.title,
        points: mode === "outdoor" ? leg.points_xz : leg.points_xyz,
        stepFlights: leg.stepFlights,
        source: leg.source,
      },
      mode,
    );
    const specLen = leg.length_m;
    if (Math.abs(legs[id].lengthM - specLen) > 0.6)
      log(`routes: WARNING ${id} length ${legs[id].lengthM} vs spec ${specLen}`);
  }
  for (const [id, def] of Object.entries(derived2d)) addLeg(id, def, "outdoor");
  for (const [id, def] of Object.entries(derived3d)) addLeg(id, def, "indoor");

  // ── Tours.
  const tours = TOURS.map(([id, audience, when, legIds, to]) => {
    const missing = legIds.filter((l) => !legs[l]);
    if (missing.length) throw new Error(`routes: tour ${id} has unknown legs ${missing}`);
    const distanceM = Math.round(legIds.reduce((s, l) => s + legs[l].lengthM, 0));
    const specTour = specRoutes.tours.find((t) => t.id === id);
    return {
      id,
      audience,
      when,
      legs: legIds,
      to,
      distanceM,
      minutes: r1(distanceM / WALK_SPEED / 60),
      summary: specTour?.summary ?? legIds.map((l) => legs[l].title).join(" → "),
    };
  });
  for (const t of tours) log(`routes: tour ${t.id}: ${t.distanceM} m, ${t.minutes} min → ${t.to}`);

  // Gaps between consecutive legs of a tour (should be ~0).
  for (const t of tours) {
    for (let i = 1; i < t.legs.length; i++) {
      const a = legs[t.legs[i - 1]].points.at(-1);
      const b = legs[t.legs[i]].points[0];
      const gap = Math.hypot(a[0] - b[0], a[2] - b[2]);
      if (gap > 0.6) log(`routes: WARNING ${t.id}: ${t.legs[i - 1]} → ${t.legs[i]} gap ${gap.toFixed(2)} m`);
    }
  }
  const nPts = Object.values(legs).reduce((n, l) => n + l.points.length, 0);
  log(`routes: ${Object.keys(legs).length} legs (${nPts} points), ${tours.length} tours`);
  return {
    out: { version: 1, walkSpeed: WALK_SPEED, legs, tours },
    outdoor2d,
  };
}
