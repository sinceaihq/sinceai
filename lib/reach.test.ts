import { readFileSync } from "node:fs";
import path from "node:path";
import counts from "@/lib/reach-counts.json";
import { REACH, fmt } from "@/lib/reach";
import { ORG } from "@/lib/org";
import { WORLD_MAP } from "@/lib/world-map.generated";

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

  it("has map dots for every country in both layers, and a world map that matches the data", () => {
    for (const layer of ["members", "applicants"] as const) {
      expect(Object.keys(WORLD_MAP.layers[layer]).sort()).toEqual(Object.keys(counts[layer]).sort());
      for (const d of Object.values(WORLD_MAP.layers[layer])) expect(d).toMatch(/^M[\d.]+ [\d.]+h0/);
    }
    for (const c of REACH.applicants.ranked) expect(WORLD_MAP.centroids[c.name]).toHaveLength(2);
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
