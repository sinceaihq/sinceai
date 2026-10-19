import {
  CAR_ARRIVAL,
  drivingDirections,
  getParking,
  getTarget3D,
  getTour3D,
  NOT_EVENT_PARKING,
  PARKING,
  STREET_PARKING,
} from "@/lib/hackathon-2026";

const text = (v: unknown) => JSON.stringify(v);

describe("parking (operators' published terms, 18–19 Oct 2026)", () => {
  it("lists the five car parks, ParkCity first as the recommendation", () => {
    expect(PARKING.map((p) => p.id)).toEqual([
      "parkcity",
      "p-station-kupittaa",
      "biocity-guest",
      "educity-guest",
      "p-lemminkaisenkatu-24",
    ]);
    expect(PARKING[0].role).toBe("Recommended");
  });

  it("matches the official prices, hours and limits", () => {
    const pc = getParking("parkcity");
    expect(pc.prices).toEqual(["€1.60 per started 30 min", "Maximum €15 per 24 h"]);
    expect(pc.access).toBe("Entry daily 06:00–00:00 · exit 24 h");
    expect(pc.heightLimit).toBe("2.2 m");
    expect(pc.zone).toContain("785");
    const ps = getParking("p-station-kupittaa");
    expect(ps.prices).toEqual(["€2.00 per started hour", "Maximum €15 per 24 h"]);
    expect(ps.access).toBe("Entry and exit 24/7");
    expect(ps.heightLimit).toBe("2.1 m");
    expect(ps.zone).toContain("P1");
    expect(getParking("biocity-guest").prices).toEqual(["€2.10 per started 30 min", "Maximum €18 per 12 h"]);
    expect(getParking("educity-guest").prices).toEqual(["€1.10 per started 20 min", "Maximum €15 per 12 h"]);
    expect(getParking("p-lemminkaisenkatu-24").prices).toEqual(["€2.50 per hour", "€15 per 24 h"]);
  });

  it("discloses Aimo Park's service fee on every Aimo car park, and only there", () => {
    for (const p of PARKING) {
      if (p.operator === "Aimo Park") expect(p.serviceFee).toMatch(/10%.*€0\.49.*€4/);
      else expect(p.serviceFee).toBeUndefined();
    }
  });

  it("never presents a price as a Since AI rate, and never promises free parking", () => {
    expect(CAR_ARRIVAL.disclaimer).toMatch(/not Since AI discounts/);
    expect(STREET_PARKING.notice).toMatch(/^Free parking may be available/);
    expect(STREET_PARKING.notice).toMatch(/Always check the traffic signs/);
    expect(text(PARKING)).not.toMatch(/free (parking|of charge)|parking is free|\bno charge\b/i);
  });

  it("keeps hotel-only and shopper parking out of the recommendations", () => {
    expect(text(PARKING)).not.toMatch(/Intelligate/);
    expect(NOT_EVENT_PARKING.join(" ")).toMatch(/P-Intelligate.*hotel/i);
    expect(NOT_EVENT_PARKING.join(" ")).toMatch(/1-hour disc parking/);
  });

  it("drives people to the verified entrance, never to a venue address", () => {
    for (const p of PARKING) {
      const url = drivingDirections(p);
      if (!p.coords) {
        expect(url).toBeUndefined();
        continue;
      }
      const dest = new URL(url!).searchParams.get("destination")!;
      expect(dest).toMatch(/^60\.4[45]\d+,22\.29\d+$/);
      expect(new URL(url!).searchParams.get("travelmode")).toBe("driving");
    }
    expect(drivingDirections(getParking("educity-guest"))).toBeUndefined();
  });

  it("puts 3D markers only on verified positions, and they exist in the model", () => {
    const marked = PARKING.filter((p) => p.target3d).map((p) => p.id);
    expect(marked).toEqual(["parkcity", "biocity-guest"]);
    for (const p of PARKING) if (p.target3d) expect(getTarget3D(p.target3d)?.kind).toBe("parking");
  });

  it("takes walking distances from the measured 3D routes", () => {
    const walk = getParking("parkcity").walk.join(" ");
    expect(getTour3D("partners-fri-parkcity-edu")!.distanceM).toBeGreaterThan(185);
    expect(walk).toMatch(/door B[^:]*: about 190 m, 3 min/);
    expect(walk).toMatch(/BioCity's main entrance[^:]*: about 360 m, 5 min/);
  });
});
