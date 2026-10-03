import type { ConsoleMessage, Page } from "@playwright/test";

export const GUIDE = "/hackathon-2026/guide";

export const GUIDE_ROUTES = [
  GUIDE,
  `${GUIDE}/builders`,
  `${GUIDE}/challenge-partners`,
  `${GUIDE}/partners`,
  `${GUIDE}/judges`,
  `${GUIDE}/speakers`,
  `${GUIDE}/venue`,
] as const;

export const COMPANY_IDS = [
  "elisa",
  "bayer",
  "revvity",
  "traficom",
  "business-turku",
  "bo-lkv",
  "takomo-golf",
  "forcit-group",
  "lindstrom",
  "saarioinen",
  "valmet",
  "dna",
  "turku-energia",
  "meyer-turku",
  "apetit",
] as const;

/** Third-party noise that is not ours (analytics blocked offline, etc.). */
const IGNORED = [
  /googletagmanager/i,
  /google-analytics/i,
  /GPU stall/i,
  /GL Driver Message/i,
  /preloaded using link preload/i,
];

/** Collects console errors and warnings for a page. */
export function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on("console", (msg: ConsoleMessage) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    const text = msg.text();
    if (IGNORED.some((re) => re.test(text))) return;
    problems.push(`${msg.type()}: ${text}`);
  });
  page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
  return problems;
}

/** Hide the cookie banner so it never covers what we test. */
export async function acceptNoCookies(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("cookie_consent", "denied");
    } catch {}
  });
}

export async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}
