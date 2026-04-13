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
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
          <div className="max-w-2xl mx-auto bg-neutral-950 border border-white/10 rounded-xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-2xl">
            <p className="text-neutral-400 text-sm flex-1 leading-relaxed">
              We use analytics cookies to understand how visitors use our site.
              Your data stays anonymous.{" "}
              <a
                href="/privacy"
                className="text-neutral-300 underline underline-offset-2 hover:text-white transition-colors"
              >
                Privacy policy
              </a>
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={decline}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all"
              >
                Decline
              </button>
              <button
                onClick={accept}
                className="px-4 py-2 text-sm text-white bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-lg transition-all"
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
