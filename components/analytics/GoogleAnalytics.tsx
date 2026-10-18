import Script from "next/script";

/**
 * Google Analytics 4, loaded after the page has finished loading (lazyOnload)
 * so it never competes with the page's own rendering. The consent defaults
 * (app/layout.tsx) define window.gtag first; events sent before gtag.js
 * arrives wait in dataLayer, and GA4's enhanced measurement records
 * client-side page views.
 */
export function GoogleAnalytics({ gaId }: { gaId: string }) {
  return (
    <>
      <Script id="ga-config" strategy="lazyOnload">
        {`window.gtag && gtag('js', new Date()); window.gtag && gtag('config', '${gaId}');`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="lazyOnload" />
    </>
  );
}
