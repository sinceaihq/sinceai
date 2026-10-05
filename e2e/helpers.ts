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
  // The host's network interfaces changed mid-request (e.g. a container started) — never the site's fault.
  /ERR_NETWORK_CHANGED/,
  // A browser without WebGL says so when the 3D probes for it; the guide then shows its text fallback.
  /Failed to create WebGL context/,
  // Network-level failures are reported without their URL; requestfailed below catches ours with the URL.
  /Failed to load resource: net::ERR_/,
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
  // Our own requests must not fail; a third party's network hiccup is not the site's fault.
  page.on("requestfailed", (req) => {
    const failure = req.failure()?.errorText ?? "";
    if (/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(failure)) return; // navigation or unmount cancelled it
    const pageUrl = page.url();
    if (pageUrl.startsWith("http") && new URL(req.url()).origin === new URL(pageUrl).origin)
      problems.push(`requestfailed: ${failure} ${req.url()}`);
  });
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
  // Measure the settled layout: text set in a fallback font can be a pixel wider until the web fonts swap in.
  return page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return document.documentElement.scrollWidth - window.innerWidth;
  });
}
