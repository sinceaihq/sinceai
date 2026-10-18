import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import sitemap from "@/app/sitemap";
import { ORG } from "@/lib/org";
import { CONSOLIDATED_ROUTES } from "@/lib/redirects";

const root = process.cwd();
const routeExists = (pathname: string) =>
  pathname === "/" ? existsSync(path.join(root, "app/page.tsx")) : existsSync(path.join(root, "app", pathname, "page.tsx"));
const GEO_FILES = ["public/llms.txt", "public/llms-full.txt", "public/ai.txt"];

describe("content consolidation (#28)", () => {
  it("redirects each merged page to a page that exists, and removes the old route", () => {
    for (const { source, destination } of CONSOLIDATED_ROUTES) {
      expect(routeExists(source)).toBe(false);
      expect(routeExists(new URL(destination, ORG.baseUrl).pathname)).toBe(true);
    }
  });

  it("keeps merged pages out of the sitemap", () => {
    const paths = sitemap().map((e) => new URL(e.url).pathname);
    for (const { source } of CONSOLIDATED_ROUTES) expect(paths).not.toContain(source);
  });

  it("lists only routes that exist", () => {
    for (const entry of sitemap()) {
      const { pathname } = new URL(entry.url);
      if (pathname.startsWith("/blog/")) continue;
      expect(routeExists(pathname)).toBe(true);
    }
  });

  it("gives static pages no build-time lastmod, and blog posts their real dates", () => {
    for (const entry of sitemap()) {
      if (new URL(entry.url).pathname.startsWith("/blog/")) expect(entry.lastModified).toBeInstanceOf(Date);
      else expect(entry.lastModified).toBeUndefined();
    }
  });
});

describe("files for AI assistants", () => {
  const texts = GEO_FILES.map((f) => [f, readFileSync(path.join(root, f), "utf8")] as const);

  it("never point to merged URLs", () => {
    for (const [file, text] of texts) {
      for (const { source } of CONSOLIDATED_ROUTES) {
        expect({ file, hit: new RegExp(`sinceai\\.ai${source}(?![\\w-])`).test(text) }).toEqual({ file, hit: false });
      }
    }
  });

  it("publish the same figures as lib/org.ts and the /impact page", () => {
    const full = texts.find(([f]) => f.endsWith("llms-full.txt"))![1];
    const ai = texts.find(([f]) => f.endsWith("ai.txt"))![1];
    for (const text of [full, ai]) {
      expect(text).toContain(ORG.stats.network);
      expect(text).toContain(ORG.stats.members);
      expect(text).toContain(ORG.stats.projects);
      expect(text).toContain(ORG.stats.countries);
      expect(text).toContain("https://sinceai.ai/impact");
      expect(text).not.toMatch(/Europe's only|10\+ countries|15\+ (partner|industry)/i);
    }
  });

  it("carry a current Last-Updated date", () => {
    for (const [, text] of texts) expect(text).toMatch(/Last-Updated: 2026-(1[0-2])-\d{2}/);
  });
});

describe("structured data basics", () => {
  it("uses a valid, encoded logo URL that exists", () => {
    expect(ORG.logoUrl).not.toMatch(/\s/);
    const file = decodeURIComponent(new URL(ORG.logoUrl).pathname);
    expect(existsSync(path.join(root, "public", file))).toBe(true);
  });

  it("lists every social profile in the Organization sameAs", () => {
    const layout = readFileSync(path.join(root, "app/layout.tsx"), "utf8");
    for (const key of Object.keys(ORG.social)) expect(layout).toContain(`ORG.social.${key}`);
    expect(layout).not.toContain("nonprofitStatus");
  });
});
