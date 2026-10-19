import { readFileSync } from "node:fs";
import path from "node:path";
import counts from "@/lib/reach-counts.json";
import { REACH, fmt } from "@/lib/reach";
import { ORG } from "@/lib/org";
import { WORLD_MAP } from "@/lib/world-map.generated";
import { CITIES, HQ } from "@/lib/ecosystem-cities.generated";
import cities from "@/lib/ecosystem-cities.json";

describe("global reach data", () => {
  it("is aggregated counts only — country names and whole numbers, no personal fields", () => {
    for (const layer of [counts.members, counts.applicants]) {
      for (const [name, n] of Object.entries(layer)) {
        expect(name).toMatch(/^[A-Z][A-Za-z .,'()-]+$/);
        expect(Number.isInteger(n) && n > 0).toBe(true);
      }
    }
    expect(Object.keys(counts).sort()).toEqual(
      ["_comment", "applicants", "applicantsTotal", "applicantsTravelling", "asOf", "members", "membersTotal"].sort(),
    );
  });

  it("adds up: totals cover the per-country counts, ranked largest first", () => {
    for (const layer of [REACH.members, REACH.applicants]) {
      const sum = layer.ranked.reduce((n, c) => n + c.count, 0);
      expect(sum).toBeLessThanOrEqual(layer.total);
      expect(layer.total - sum).toBeLessThan(layer.total * 0.1);
      expect(layer.ranked.map((c) => c.count)).toEqual([...layer.ranked.map((c) => c.count)].sort((a, b) => b - a));
    }
    expect(REACH.applicants.travelling).toBeLessThan(REACH.applicants.total);
  });

  it("backs the published country figure", () => {
    const floor = Number(ORG.stats.countries.replace(/\D/g, ""));
    expect(REACH.members.countries).toBeGreaterThanOrEqual(floor);
    expect(REACH.members.countries).toBeLessThan(floor + 20);
  });

  it("puts every member country on the ecosystem map, except the ones the brand does not light", () => {
    const hidden = new Set(["Russia", "Belarus", "Iran", "North Korea"]);
    const onMap = new Set(cities.cities.map((c) => c[1] as string));
    for (const c of REACH.members.ranked) expect(onMap.has(c.name) || hidden.has(c.name)).toBe(true);
    for (const n of hidden) expect(CITIES.some(([, country]) => country === n)).toBe(false);
    expect(WORLD_MAP.glow).toHaveLength(3);
    expect(WORLD_MAP.cities).toHaveLength(4);
    for (const d of [...WORLD_MAP.glow, ...WORLD_MAP.cities]) expect(d).toMatch(/^M[\d.]+ [\d.]+h0/);
    // Turku is the headquarters, on its own dot.
    expect(CITIES.find(([, , x, y]) => x === HQ[0] && y === HQ[1])?.[0]).toBe("Turku");
  });

  it("keeps the city list aggregated — names, coordinates and a size tier, no counts", () => {
    for (const row of cities.cities) {
      expect(row).toHaveLength(5);
      const [city, country, lat, lon, tier] = row as [string, string, number, number, number];
      expect(city.length).toBeGreaterThan(1);
      expect(country.length).toBeGreaterThan(2);
      expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(lon)).toBeLessThanOrEqual(180);
      expect([1, 2, 3, 4]).toContain(tier);
    }
    expect(Object.keys(cities).sort()).toEqual(["_comment", "asOf", "cities"]);
  });

  it("is quoted the same in the files written for AI assistants", () => {
    for (const f of ["public/llms-full.txt", "public/ai.txt"]) {
      const text = readFileSync(path.join(process.cwd(), f), "utf8");
      expect(text).toContain(`${fmt(REACH.applicants.total)}`);
      expect(text).toContain(`${REACH.applicants.countries} countries`);
      expect(text).toContain(`${REACH.members.countries} on sinceai.app profiles`);
    }
  });
});
