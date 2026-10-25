import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  CHECKLISTS,
  COMPUTING,
  COMPUTING_ANCHOR,
  COMPUTING_HREF,
  computingRegistrationOpen,
  GUIDE_BASE_PATH,
} from "@/lib/hackathon-2026";

/** Every link the section may show: CSC's and LUMI's own public pages, nothing else. */
const PUBLIC_HOSTS = new Set(["lumi-supercomputer.eu", "aitta.csc.fi", "lumi-ai-factory.github.io"]);

/**
 * Shapes of private joining details — never the values themselves. A MyCSC link, a CSC / LUMI project
 * identifier or an invitation-style URL has no place in the public repository.
 */
const PRIVATE_DETAIL_PATTERNS: readonly [string, RegExp][] = [
  ["MyCSC link", /\bmy\.csc\.fi\b/i],
  ["CSC project identifier", /\bproject_\d{5,}\b/i],
  ["LUMI project number", /\b46[25]\d{6}\b/],
  [
    "invitation-style URL",
    /https?:\/\/[^\s"'`)<>]*(?:[?&](?:invite|invitation|invitation_?code|invite_?code|token|join)=|\/(?:invite|invitations?|join)\/[\w-]{6,})/i,
  ],
];

const SCANNED_DIRS = ["app", "components", "lib", "content", "public", "docs", "e2e", "data", "hooks", "types"];
const TEXT_FILE = /\.(tsx?|mjs|cjs|js|json|mdx?|txt|xml|html|css|svg|ics|webmanifest|ya?ml)$/i;

function textFiles(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "node_modules" ? [] : textFiles(full);
    return TEXT_FILE.test(name) ? [full] : [];
  });
}

describe("CSC / LUMI AI Factory computing resources", () => {
  it("states CSC's registration deadline: Friday 30 October 2026, end of day in Turku", () => {
    expect(COMPUTING.deadlineLabel).toBe("Friday 30 October 2026");
    expect(COMPUTING.deadlineShort).toBe("Fri 30 Oct");
    const day = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Helsinki",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(Date.parse(COMPUTING.deadline));
    expect(day.replace(",", "")).toBe(COMPUTING.deadlineLabel);
    expect(computingRegistrationOpen(Date.parse("2026-10-30T23:59:00+02:00"))).toBe(true);
    expect(computingRegistrationOpen(Date.parse("2026-10-31T00:00:00+02:00"))).toBe(false);
    expect(computingRegistrationOpen(Date.parse("2026-10-25T12:00:00+02:00"))).toBe(true);
  });

  it("says the resources are optional and activation takes several days", () => {
    expect(COMPUTING.intro).toMatch(/optional/i);
    expect(COMPUTING.intro).toMatch(/without them/);
    expect(COMPUTING.register).toContain("Friday 30 October 2026");
    expect(COMPUTING.register).toMatch(/several days/);
    expect(COMPUTING.register).toMatch(/Nobody can newly join .* after the deadline/);
  });

  it("states eligibility, the institutional email rule and hackathon-only use", () => {
    const text = COMPUTING.eligibility.join(" ");
    expect(text).toContain("EU Member State");
    expect(text).toContain("Horizon Europe-associated country");
    expect(text).toMatch(/institutional email/);
    expect(text).toMatch(/generic or shared addresses are not accepted/);
    expect(text).toMatch(/hackathon work only/);
  });

  it("points to the private emails instead of publishing the joining details", () => {
    expect(COMPUTING.where).toMatch(/acceptance or welcome email/);
    expect(COMPUTING.where).toContain("25 October");
    expect(COMPUTING.where).toContain("SUPERCOMPUTER");
    expect(COMPUTING.privateNote).toMatch(/not published on this website/);
    expect(COMPUTING.cantFind).toMatch(/spam/);
    expect(COMPUTING.supportEmail).toBe("info@sinceai.fi");
  });

  it("links only CSC's and LUMI's public pages, over https", () => {
    const hrefs = [...COMPUTING.resources.map((r) => r.href), ...COMPUTING.links.map((l) => l.href)];
    expect(hrefs).toEqual([
      "https://lumi-supercomputer.eu/",
      "https://aitta.csc.fi/",
      "https://lumi-ai-factory.github.io/LUMI_AIF_Onboarding/",
    ]);
    for (const href of hrefs) {
      const url = new URL(href);
      expect(url.protocol).toBe("https:");
      expect(PUBLIC_HOSTS.has(url.hostname)).toBe(true);
      expect(url.search).toBe("");
      expect(url.hash).toBe("");
    }
  });

  it("anchors the hub section, which the builder guide links to", () => {
    expect(COMPUTING_ANCHOR).toBe("ai-resources");
    expect(COMPUTING_HREF).toBe(`${GUIDE_BASE_PATH}#ai-resources`);
    const before = CHECKLISTS.builders.find((g) => g.title === "Before you arrive")!;
    expect(before.items.some((i) => i.includes("CSC / LUMI") && i.includes("Friday 30 October 2026"))).toBe(true);
  });
});

describe("no private CSC project details in the public repository", () => {
  // This file holds only synthetic examples of the shapes.
  const files = SCANNED_DIRS.flatMap((dir) => textFiles(path.join(process.cwd(), dir))).filter((f) => f !== __filename);

  it("scans the site's source and public assets", () => {
    expect(files.length).toBeGreaterThan(200);
    expect(files.some((f) => f.endsWith(path.join("lib", "hackathon-2026", "computing.ts")))).toBe(true);
  });

  it("finds no MyCSC links, project identifiers or invitation-style URLs", () => {
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const [label, pattern] of PRIVATE_DETAIL_PATTERNS) {
        if (pattern.test(text)) hits.push(`${path.relative(process.cwd(), file)}: ${label}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("would catch each shape (synthetic examples)", () => {
    const [mycsc, project, lumi, invite] = PRIVATE_DETAIL_PATTERNS.map(([, p]) => p);
    expect(mycsc!.test("see my.csc.fi for details")).toBe(true);
    expect(project!.test("project_1234567")).toBe(true);
    expect(lumi!.test("LUMI project 465000000")).toBe(true);
    expect(invite!.test("https://example.org/accept?invitation=abc")).toBe(true);
    expect(invite!.test("https://example.org/join/AbCdEf123")).toBe(true);
    // Public pages pass.
    for (const href of ["https://aitta.csc.fi/", "https://discord.gg/sinceai", "https://lumi-supercomputer.eu/"]) {
      expect(PRIVATE_DETAIL_PATTERNS.some(([, p]) => p.test(href))).toBe(false);
    }
  });
});
