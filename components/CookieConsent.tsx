"use client";

import { useEffect, useState } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";

export const COOKIE_CONSENT_KEY = "cookie_consent";
const GA_ID = "G-1WG6MNLS9M";

type ConsentState = "granted" | "denied" | null;

interface State {
  consent: ConsentState;
  visible: boolean;
}

export function CookieConsent() {
  const [{ consent, visible }, setState] = useState<State>({
    consent: null,
    visible: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentState | null;
    const hasDecided = stored === "granted" || stored === "denied";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ consent: stored, visible: !hasDecided });
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "granted");
    setState({ consent: "granted", visible: false });
  }

  function decline() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "denied");
    setState({ consent: "denied", visible: false });
  }

  return (
    <>
      {consent === "granted" && <GoogleAnalytics gaId={GA_ID} />}

      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-[var(--space-lg)] py-[var(--space-sm)]">
          <div className="mx-auto w-full max-w-[1200px] flex flex-col sm:flex-row items-start sm:items-center gap-4 px-[var(--space-lg)] py-3 bg-[rgba(10,10,10,0.95)] backdrop-blur-[12px] border-[0.5px] border-[var(--color-border-strong)]">
            <p className="flex-1 font-mono text-[13px] leading-relaxed text-[var(--color-fg-muted)]">
              We use analytics cookies to understand how visitors use our site.
              Your data stays anonymous.{" "}
              <a href="/privacy" className="text-white underline underline-offset-[3px]">
                Privacy policy
              </a>
            </p>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={decline}
                className="font-mono text-[13px] font-medium text-[var(--color-fg-muted)] bg-transparent border-[0.5px] border-[var(--color-border-strong)] px-4 py-2 rounded-none cursor-pointer transition-[color,border-color] duration-300 hover:text-white hover:border-white"
              >
                Decline
              </button>
              <button
                onClick={accept}
                className="font-mono text-[13px] font-medium text-black bg-white border-[0.5px] border-white px-4 py-2 rounded-none cursor-pointer"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
