/**
 * @jest-environment node
 */
import { existsSync } from "node:fs";
import path from "node:path";
import {
  AI_TOOLS,
  DEVELOPER_TOOLS,
  FEATURED_TOOLS,
  logoFor,
  MLH_AWARDS,
  mlhAwardFor,
  PARTNER_RESOURCES,
  partnerFor,
  TOOL_CATEGORIES,
  toolForMlhAward,
  toolsIn,
} from "@/lib/hackathon-2026";

const all = JSON.stringify(AI_TOOLS);

describe("AI Tools & Resources directory", () => {
  it("leads with six recognisable tools, each with a logo and one button", () => {
    expect(FEATURED_TOOLS.map((t) => t.name)).toEqual([
      "GitHub Copilot",
      "Claude & Claude Code",
      "Cursor",
      "Lovable",
      "Google Gemini & AI Studio",
      "Google Cloud",
    ]);
    for (const t of FEATURED_TOOLS) {
      expect(logoFor(t)).toBeDefined();
      expect(t.cta.label).toMatch(/^(Get|Open|Get started)/);
      expect(t.summary.split(/[.!?]\s/).length).toBe(1);
    }
    expect(FEATURED_TOOLS.find((t) => t.id === "github-copilot")!.cta.label).toBe("Get GitHub Copilot");
  });

  it("covers every Since AI technology partner and every MLH technology exactly once", () => {
    const partners = AI_TOOLS.flatMap((t) => (t.partnerId ? [t.partnerId] : []));
    expect([...partners].sort()).toEqual(PARTNER_RESOURCES.map((p) => p.id).sort());
    const mlh = AI_TOOLS.flatMap((t) => (t.mlhAwardId ? [t.mlhAwardId] : []));
    expect([...mlh].sort()).toEqual(MLH_AWARDS.map((a) => a.id).sort());
    for (const a of MLH_AWARDS) expect(toolForMlhAward(a.id)).toBeDefined();
    for (const t of AI_TOOLS) {
      if (t.partnerId) expect(partnerFor(t)).toBeDefined();
      if (t.mlhAwardId) expect(mlhAwardFor(t)).toBeDefined();
    }
    expect(new Set(AI_TOOLS.map((t) => t.id)).size).toBe(AI_TOOLS.length);
    // The earlier "popular tools" are all here as tools.
    for (const name of ["GitHub", "Cursor", "Claude", "OpenAI", "Gemini", "Google Cloud"]) {
      expect(DEVELOPER_TOOLS.some((d) => d.name.includes(name.split(" ")[0]))).toBe(true);
      expect(AI_TOOLS.some((t) => t.name.includes(name.split(" ")[0]))).toBe(true);
    }
  });

  it("puts every tool in one of the four categories, the most approachable first", () => {
    expect(TOOL_CATEGORIES.map((c) => c.id)).toEqual(["coding", "models", "cloud", "advanced"]);
    expect(toolsIn("coding")[0].id).toBe("github-copilot");
    expect(toolsIn("models")[0].id).toBe("gemini");
    expect(toolsIn("cloud")[0].id).toBe("google-cloud");
    expect(TOOL_CATEGORIES.flatMap((c) => toolsIn(c.id)).length).toBe(AI_TOOLS.length);
  });

  it("never promises unlimited access, guaranteed credits or a partnership it does not have", () => {
    expect(all).not.toMatch(/unlimited|guaranteed|automatically approved|official (Since AI )?(sponsor|partner)/i);
    for (const id of ["github-copilot", "claude", "cursor", "openai", "google-cloud", "gemini"]) {
      const t = AI_TOOLS.find((x) => x.id === id)!;
      expect(t.partnerId).toBeUndefined();
      expect(t.access.some((a) => a.kind === "event")).toBe(false);
    }
    // What the providers' own pages say (4 Nov 2026).
    const claude = AI_TOOLS.find((t) => t.id === "claude")!;
    expect(claude.access.map((a) => a.text)).toEqual(["Free Claude plan", "Claude Code needs a paid plan or API credit"]);
    const copilot = AI_TOOLS.find((t) => t.id === "github-copilot")!;
    expect(copilot.access.map((a) => a.text)).toEqual(["Free plan with monthly limits", "Copilot Student free for verified students"]);
    expect(AI_TOOLS.find((t) => t.id === "cursor")!.access.some((a) => a.kind === "student")).toBe(false);
  });

  it("shows CSC / LUMI as optional and for those who registered by 30 October only", () => {
    const lumi = AI_TOOLS.find((t) => t.id === "csc-lumi")!;
    expect(lumi.access).toEqual([{ kind: "preregistered", text: "Registered by Fri 30 Oct only" }]);
    expect(lumi.more!.join(" ")).toMatch(/Registration closed on Friday 30 October 2026/);
    expect(lumi.more!.join(" ")).toMatch(/You do not need LUMI to take part/);
  });

  it("has a local logo file for every mark", () => {
    for (const t of AI_TOOLS) {
      const logo = logoFor(t);
      if (logo) expect(existsSync(path.join(process.cwd(), "public", logo.src))).toBe(true);
    }
  });
});
