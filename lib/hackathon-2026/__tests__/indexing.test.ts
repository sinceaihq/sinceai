/**
 * The Field Guide must be reachable by link but never indexed:
 * meta robots on every page, an X-Robots-Tag header for the route family,
 * and no sitemap entry. robots.txt must NOT disallow it (crawlers have to
 * fetch the page to see the noindex).
 */
import type { Metadata } from "next";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import nextConfig from "@/next.config";
import { GUIDE_BASE_PATH, guideMetadata } from "@/lib/hackathon-2026";
import { metadata as rootGuideMetadata } from "@/app/hackathon-2026/guide/layout";
import { metadata as hubMetadata } from "@/app/hackathon-2026/guide/(hub)/layout";
import { metadata as buildersMetadata } from "@/app/hackathon-2026/guide/builders/layout";
import { metadata as challengePartnersMetadata } from "@/app/hackathon-2026/guide/challenge-partners/layout";
import { metadata as partnersMetadata } from "@/app/hackathon-2026/guide/partners/layout";
import { metadata as judgesMetadata } from "@/app/hackathon-2026/guide/judges/layout";
import { metadata as speakersMetadata } from "@/app/hackathon-2026/guide/speakers/layout";
import { metadata as venueMetadata } from "@/app/hackathon-2026/guide/venue/layout";
import { generateMetadata as companyMetadata } from "@/app/hackathon-2026/guide/challenge-partners/[company]/layout";

function expectNoindex(meta: Metadata) {
  const robotsMeta = meta.robots as Exclude<Metadata["robots"], string | null | undefined>;
  expect(robotsMeta).toBeDefined();
  expect(robotsMeta.index).toBe(false);
  expect(robotsMeta.follow).toBe(false);
  const googleBot = robotsMeta.googleBot as { index?: boolean; follow?: boolean };
  expect(googleBot.index).toBe(false);
  expect(googleBot.follow).toBe(false);
  expect((meta.other as Record<string, string>).bingbot).toBe("noindex, nofollow");
}

describe("Field Guide indexing", () => {
  it.each([
    ["root layout", rootGuideMetadata],
    ["hub", hubMetadata],
    ["builders", buildersMetadata],
    ["challenge partners", challengePartnersMetadata],
    ["partners", partnersMetadata],
    ["judges", judgesMetadata],
    ["speakers", speakersMetadata],
    ["venue", venueMetadata],
  ])("%s metadata is noindex, nofollow", (_name, meta) => {
    expectNoindex(meta);
  });

  it("company pages are noindex, nofollow", async () => {
    const meta = await companyMetadata({ params: Promise.resolve({ company: "elisa" }) });
    expectNoindex(meta);
    expect(String(meta.title)).toContain("Elisa");
  });

  it("canonical URLs stay on the guide route family", () => {
    const meta = guideMetadata({ title: "X", description: "Y", path: "/builders" });
    expect(meta.alternates?.canonical).toBe(`https://sinceai.ai${GUIDE_BASE_PATH}/builders`);
  });

  it("is absent from the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.length).toBeGreaterThan(10);
    expect(urls.some((url) => url.includes("/hackathon-2026"))).toBe(false);
  });

  it("is not disallowed in robots.txt (so crawlers can read the noindex)", () => {
    const rules = robots().rules;
    const list = Array.isArray(rules) ? rules : [rules];
    for (const rule of list) {
      const disallow = [rule.disallow ?? []].flat();
      expect(disallow.some((path) => GUIDE_BASE_PATH.startsWith(path) && path !== "")).toBe(false);
    }
  });

  it("sends X-Robots-Tag for the whole route family", async () => {
    const headers = await nextConfig.headers!();
    const guideRules = headers.filter((h) => h.source.startsWith(GUIDE_BASE_PATH));
    expect(guideRules.map((h) => h.source)).toEqual(
      expect.arrayContaining([GUIDE_BASE_PATH, `${GUIDE_BASE_PATH}/:path*`]),
    );
    for (const rule of guideRules) {
      expect(rule.headers).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: "X-Robots-Tag", value: expect.stringContaining("noindex") }),
        ]),
      );
    }
  });
});
