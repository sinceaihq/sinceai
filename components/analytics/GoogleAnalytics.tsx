import Script from "next/script";

/** First signs of a person on the page; any one of them loads gtag.js. */
const ENGAGEMENT_EVENTS = ["pointerdown", "pointermove", "touchstart", "keydown", "scroll", "wheel"];

/** A visitor who stays without touching anything is still counted after this long. */
const IDLE_FALLBACK_MS = 15_000;

/**
 * Google Analytics 4, kept off the critical path.
 *
 * gtag.js is ~200 KB and costs two long main-thread tasks on a mid-range
 * phone, so it is only fetched once the visitor engages with the page
 * (pointer, touch, key, scroll), or after 15 s on the page, and then in an
 * idle period. The page view itself is queued right away: the consent
 * defaults (app/layout.tsx) define window.gtag first, `js` and `config` go
 * into dataLayer with the real start time, and gtag.js replays them when it
 * arrives. Client-side navigations are recorded by GA4's enhanced
 * measurement.
 */
export function GoogleAnalytics({ gaId }: { gaId: string }) {
  const src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  const loader = `(function () {
  if (typeof window.gtag === "function") { gtag("js", new Date()); gtag("config", ${JSON.stringify(gaId)}); }
  var events = ${JSON.stringify(ENGAGEMENT_EVENTS)};
  var opts = { capture: true, passive: true };
  var done = false, timer;
  function inject() {
    var s = document.createElement("script");
    s.async = true;
    s.src = ${JSON.stringify(src)};
    document.head.appendChild(s);
  }
  function load() {
    if (done) return;
    done = true;
    clearTimeout(timer);
    events.forEach(function (e) { window.removeEventListener(e, load, opts); });
    if ("requestIdleCallback" in window) window.requestIdleCallback(inject, { timeout: 2000 });
    else setTimeout(inject, 1);
  }
  events.forEach(function (e) { window.addEventListener(e, load, opts); });
  timer = setTimeout(load, ${IDLE_FALLBACK_MS});
})();`;

  return (
    <Script id="ga-loader" strategy="afterInteractive">
      {loader}
    </Script>
  );
}
