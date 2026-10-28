import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PARTNERS, tier1Partners, tier2Partners, tier3Partners } from "@/lib/partners";
import { HACKATHON_2026_PARTNERS } from "@/lib/sinceai";

const IOL = "Insinööriopiskelijaliitto IOL ry";

describe("partners", () => {
  it("lists every partner once, each with a logo file that exists", () => {
    const names = PARTNERS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const p of PARTNERS) expect(existsSync(path.join(process.cwd(), "public", p.logo))).toBe(true);
  });

  it("shows IOL among the Community Supporters only, linked to its official page", () => {
    const iol = PARTNERS.filter((p) => p.name === IOL);
    expect(iol).toHaveLength(1);
    expect(iol[0]).toMatchObject({
      tier: 3,
      logo: "/assets/supports/iol.svg",
      url: "https://www.ilry.fi/opiskelijat/insinooriopiskelijaliitto-iol/",
      surface: "light",
    });
    expect(tier3Partners.map((p) => p.name)).toContain(IOL);
    expect([...tier1Partners, ...tier2Partners].map((p) => p.name)).not.toContain(IOL);
    expect(JSON.stringify(HACKATHON_2026_PARTNERS)).not.toContain("IOL");
  });

  it("keeps IOL's logo the official artwork: purple, vector-only, no scripts or external references", () => {
    const svg = readFileSync(path.join(process.cwd(), "public/assets/supports/iol.svg"), "utf8");
    expect(svg).toContain("#3c1053");
    expect(svg).not.toMatch(/<script|<image|<foreignObject|\son\w+=|href=/i);
  });
});
