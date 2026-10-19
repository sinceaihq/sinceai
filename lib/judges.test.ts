import { existsSync } from "node:fs";
import path from "node:path";
import { initials, JUDGE_PANEL_SIZE, judges } from "@/lib/judges";

describe("judging panel data", () => {
  it("lists exactly the two confirmed judges, with their organisations' own titles", () => {
    expect(judges.map((j) => [j.name, j.title, j.organization])).toEqual([
      ["Sarita Runeberg", "Chief Executive Officer", "Maria 01"],
      ["Niko Elers", "Investment Director", "Voima Ventures"],
    ]);
    expect(JUDGE_PANEL_SIZE).toBe(4);
  });

  it("never describes Niko Elers as a partner or CEO, nor names unconfirmed candidates", () => {
    const niko = judges.find((j) => j.name === "Niko Elers")!;
    expect(`${niko.title} ${niko.bio}`).not.toMatch(/partner|CEO|chief executive/i);
    expect(JSON.stringify(judges)).not.toMatch(/Soumah|Eshaan|Jain|Senger|Ondrej|sponsor/i);
  });

  it("links the verified organisation sites and profiles", () => {
    expect(judges.map((j) => j.organizationUrl)).toEqual(["https://maria.io/", "https://voimaventures.com/"]);
    for (const judge of judges) expect(judge.profileUrl).toMatch(/^https:\/\/www\.linkedin\.com\/in\/[\w-]+\/$/);
  });

  it("gives every confirmed judge a local, optimised portrait with real alt text", () => {
    for (const judge of judges) {
      expect(judge.portrait).toBeDefined();
      expect(judge.portrait!.src).toMatch(/^\/assets\/judges\/.+\.webp$/);
      expect(existsSync(path.join(process.cwd(), "public", judge.portrait!.src))).toBe(true);
      expect(judge.portrait!.alt).toContain(judge.name);
      if (judge.portrait!.credit) expect(judge.portrait!.credit).toMatch(/^Photo: /);
    }
    // Initials remain the fallback for a judge announced before a portrait is cleared.
    expect(initials("Niko Elers")).toBe("NE");
  });
});
