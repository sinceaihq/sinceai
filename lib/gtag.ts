export const GA_ID = "G-1WG6MNLS9M";

/** Single source of truth for analytics event names. */
export const ANALYTICS_EVENTS = {
  DISCORD_JOIN_CLICK: "discord_join_click",
  REGISTER_CLICK: "register_click",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

type ConsentValue = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function consentPayload(state: ConsentValue) {
  return {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
  };
}

/**
 * The consent defaults of the `consent-default` script in app/layout.tsx —
 * keep the two in sync. That script runs before anything else on
 * server-rendered pages. A page Next.js renders only in the browser (e.g. a
 * nested not-found page) never runs it, so Google Analytics would start
 * without consent mode; call this before it loads in that case. No-op when
 * the defaults are already in place.
 */
export function ensureConsentDefaults(): void {
  if (typeof window === "undefined" || typeof window.gtag === "function") return;
  const dataLayer = (window.dataLayer = window.dataLayer || []);
  window.gtag = function gtag() {
    // gtag.js reads the arguments object itself, not an array.
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  };
  window.gtag("consent", "default", { ...consentPayload("denied"), wait_for_update: 500 });
  window.gtag("set", "url_passthrough", true);
  window.gtag("set", "ads_data_redaction", true);
}

export function updateConsent(state: ConsentValue): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", consentPayload(state));
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params ?? {});
}
