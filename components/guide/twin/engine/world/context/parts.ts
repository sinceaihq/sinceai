import type { CampusBuilding, Lod2Building } from "../../data/campus";
import { pointInRing, polygonCentroid, ringArea } from "../../util";

/**
 * Which context building each City of Turku LOD2 roof part belongs to (pure, unit-tested).
 *
 * A LOD2 record is linked to one OSM building, but some records span several:
 * Intelligate II's holds Intelligate I and the Original Sokos Hotel tower,
 * Dentalia's holds the round lecture building. Built as one, the hotel tower
 * would wear Intelligate's facade and the outlines of the other buildings
 * would stand inside it (hidden walls, no walk colliders). So a part goes to
 * the smallest other outline containing its centre — unless that building has
 * LOD2 records of its own (they model it; the part is dropped). Parts no
 * outline contains stay with the record's building.
 */

/** One roof part of a record (a prism up to that roof). */
export interface RoofPart {
  rec: Lod2Building;
  roof: Lod2Building["roofs"][number];
  k: number;
}

export interface PartAssignment {
  /** Unclaimed roof parts per building id. */
  partsOf: Map<string, RoofPart[]>;
  /** Records whose parts went to more than one building. */
  splitRecs: Set<Lod2Building>;
  /** Parts claimed by a hero module (they hide walls but are not built here), with the building that held them. */
  claimed: (RoofPart & { building: CampusBuilding })[];
}

/**
 * `buildings` = every context building with its records in `recsOf` (OSM buildings and pseudo
 * buildings of standalone records); `outlines` = the OSM buildings a part may move to.
 */
export function assignRoofParts(
  buildings: readonly CampusBuilding[],
  outlines: readonly CampusBuilding[],
  recsOf: ReadonlyMap<string, readonly Lod2Building[]>,
): PartAssignment {
  const partsOf = new Map<string, RoofPart[]>();
  const splitRecs = new Set<Lod2Building>();
  const claimed: PartAssignment["claimed"] = [];
  const area = new Map(outlines.map((o) => [o.id, Math.abs(ringArea(o.polygon))]));
  for (const b of buildings) {
    const ownArea = Math.abs(ringArea(b.polygon));
    for (const rec of recsOf.get(b.id) ?? []) {
      rec.roofs.forEach((roof, k) => {
        if (roof.claimedBy) {
          claimed.push({ rec, roof, k, building: b });
          return;
        }
        const c = polygonCentroid(roof.ring);
        let to: CampusBuilding = b;
        let best = pointInRing(c, b.polygon) ? ownArea : Infinity;
        for (const o of outlines) {
          if (o.id === b.id) continue;
          const a = area.get(o.id) ?? Infinity;
          if (a >= best || !pointInRing(c, o.polygon)) continue;
          best = a;
          to = o;
        }
        if (to.id !== b.id) {
          splitRecs.add(rec);
          if ((recsOf.get(to.id) ?? []).length) return;
        }
        const list = partsOf.get(to.id) ?? [];
        list.push({ rec, roof, k });
        partsOf.set(to.id, list);
      });
    }
  }
  return { partsOf, splitRecs, claimed };
}
