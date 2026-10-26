import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { initials, JUDGE_PANEL_SIZE, judges, profileLabel } from "@/lib/judges";

const PROFILE_URL = {
  linkedin: /^https:\/\/www\.linkedin\.com\/in\/[\w-]+\/$/,
  university: /^https:\/\/www\.utu\.fi\/en\/people\/[\w-]+$/,
  scholar: /^https:\/\/scholar\.google\.com\/citations\?user=[\w-]+$/,
};

describe("judging panel data", () => {
  it("lists exactly the five confirmed judges, with their organisations' own titles", () => {
    expect(judges.map((j) => [j.name, j.title, j.organization])).toEqual([
      ["Sarita Runeberg", "Chief Executive Officer", "Maria 01"],
      ["Niko Elers", "Investment Director", "Voima Ventures"],
      ["Tuomas Mäkilä", "Associate Professor, Software Engineering", "University of Turku"],
      ["Rasmus Harmaala", "Deep Tech Investor & Founder", "Inovexus"],
      ["Chandra Challagonda", "Chief Executive Officer", "FIWARE Foundation"],
    ]);
    // The panel is complete: five judges and no open place left.
    expect(JUDGE_PANEL_SIZE).toBe(5);
    expect(judges).toHaveLength(JUDGE_PANEL_SIZE);
    expect(new Set(judges.map((j) => j.name)).size).toBe(judges.length);
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

  it("presents Chandra Challagonda as an overall-jury judge, never as a sponsor, partner or award", () => {
    const chandra = judges.find((j) => j.name === "Chandra Challagonda")!;
    expect(chandra.profiles).toEqual([{ kind: "linkedin", url: "https://www.linkedin.com/in/challagonda/" }]);
    expect(chandra.bio).toMatch(/^CEO of FIWARE Foundation/);
    // FIWARE's optional open track is separate and unpublished until its terms are confirmed.
    expect(`${chandra.title} ${chandra.bio}`).not.toMatch(/sponsor|partner|challenge|evaluat|award|prize|track/i);
    expect(chandra.portrait).toEqual({
      src: "/assets/judges/chandra-challagonda.webp",
      alt: "Portrait of Chandra Challagonda, CEO of FIWARE Foundation",
    });
  });

  it("presents Rasmus Harmaala as an overall-jury judge, never as a sponsor or company evaluator", () => {
    const rasmus = judges.find((j) => j.name === "Rasmus Harmaala")!;
    expect(rasmus.profiles).toEqual([{ kind: "linkedin", url: "https://www.linkedin.com/in/rasmus-harmaala/" }]);
    expect(rasmus.bio).toMatch(/final jury/);
    expect(`${rasmus.title} ${rasmus.bio}`).not.toMatch(/sponsor|partner|challenge|evaluat/i);
    expect(rasmus.portrait).toEqual({
      src: "/assets/judges/rasmus-harmaala.webp",
      alt: "Portrait of Rasmus Harmaala, deep tech investor at Inovexus",
    });
  });

  it("links the verified organisation sites and profiles", () => {
    expect(judges.map((j) => j.organizationUrl)).toEqual([
      "https://maria.io/",
      "https://voimaventures.com/",
      "https://www.utu.fi/en",
      "https://inovexus.com/",
      "https://fiware.org/",
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
      const file = path.join(process.cwd(), "public", judge.portrait!.src);
      expect(existsSync(file)).toBe(true);
      // Served as is (images are unoptimised on Cloudflare), so keep each one small.
      expect(statSync(file).size).toBeLessThan(100_000);
      expect(judge.portrait!.alt).toContain(judge.name);
      if (judge.portrait!.credit) expect(judge.portrait!.credit).toMatch(/^Photo: /);
    }
    // Initials remain the fallback for a judge announced before a portrait is cleared.
    expect(initials("Niko Elers")).toBe("NE");
    expect(initials("Tuomas Mäkilä")).toBe("TM");
    expect(initials("Rasmus Harmaala")).toBe("RH");
    expect(initials("Chandra Challagonda")).toBe("CC");
  });
});
