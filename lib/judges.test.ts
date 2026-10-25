import { existsSync } from "node:fs";
import path from "node:path";
import { initials, JUDGE_PANEL_SIZE, judges, profileLabel } from "@/lib/judges";

const PROFILE_URL = {
  linkedin: /^https:\/\/www\.linkedin\.com\/in\/[\w-]+\/$/,
  university: /^https:\/\/www\.utu\.fi\/en\/people\/[\w-]+$/,
  scholar: /^https:\/\/scholar\.google\.com\/citations\?user=[\w-]+$/,
};

describe("judging panel data", () => {
  it("lists exactly the three confirmed judges, with their organisations' own titles", () => {
    expect(judges.map((j) => [j.name, j.title, j.organization])).toEqual([
      ["Sarita Runeberg", "Chief Executive Officer", "Maria 01"],
      ["Niko Elers", "Investment Director", "Voima Ventures"],
      ["Tuomas Mäkilä", "Associate Professor, Software Engineering", "University of Turku"],
    ]);
    expect(JUDGE_PANEL_SIZE).toBe(4);
    expect(judges.length).toBeLessThanOrEqual(JUDGE_PANEL_SIZE);
  });

  it("never describes Niko Elers as a partner or CEO, nor names unconfirmed candidates", () => {
    const niko = judges.find((j) => j.name === "Niko Elers")!;
    expect(`${niko.title} ${niko.bio}`).not.toMatch(/partner|CEO|chief executive/i);
    expect(JSON.stringify(judges)).not.toMatch(/Soumah|Eshaan|Jain|Senger|Ondrej|sponsor/i);
  });

  it("never gives Tuomas Mäkilä a title his university does not state", () => {
    const tuomas = judges.find((j) => j.name === "Tuomas Mäkilä")!;
    expect(`${tuomas.title} ${tuomas.bio}`).not.toMatch(/full professor|\bdean\b|\bhead of department\b|\bdirector\b/i);
  });

  it("links the verified organisation sites and profiles", () => {
    expect(judges.map((j) => j.organizationUrl)).toEqual([
      "https://maria.io/",
      "https://voimaventures.com/",
      "https://www.utu.fi/en",
    ]);
    for (const judge of judges) {
      expect(judge.profiles.length).toBeGreaterThan(0);
      for (const profile of judge.profiles) expect(profile.url).toMatch(PROFILE_URL[profile.kind]);
    }
    expect(judges[2]!.profiles.map((p) => p.url)).toEqual([
      "https://www.linkedin.com/in/mckila/",
      "https://www.utu.fi/en/people/tuomas-makila",
      "https://scholar.google.com/citations?user=fhE_eJYAAAAJ",
    ]);
  });

  it("names each profile link after its site", () => {
    const [sarita, , tuomas] = judges;
    expect(profileLabel(sarita!, sarita!.profiles[0]!)).toBe("Sarita Runeberg on LinkedIn");
    expect(tuomas!.profiles.map((p) => profileLabel(tuomas!, p))).toEqual([
      "Tuomas Mäkilä on LinkedIn",
      "Tuomas Mäkilä on the University of Turku website",
      "Tuomas Mäkilä on Google Scholar",
    ]);
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
    expect(initials("Tuomas Mäkilä")).toBe("TM");
  });
});
