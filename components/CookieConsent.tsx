"use client";

import { useEffect, useState } from "react";
import { updateConsent } from "@/lib/gtag";

export const COOKIE_CONSENT_KEY = "cookie_consent";

type ConsentState = "granted" | "denied" | null;

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentState | null;
    if (stored) {
      updateConsent(stored);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(!stored);
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "granted");
    updateConsent("granted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "denied");
    updateConsent("denied");
    setVisible(false);
  }

  return (
    <>
      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4">
          <div className="mx-auto w-full max-w-6xl flex flex-col sm:flex-row items-start sm:items-center gap-4 px-6 py-3 bg-[rgba(10,10,10,0.95)] backdrop-blur-[12px] border border-white/25">
            <p className="flex-1 text-sm text-neutral-400 leading-relaxed">
              We use analytics and advertising cookies to understand site usage and measure our campaigns.
              Declined visits are measured without cookies.{" "}
              <a href="/privacy" className="text-white underline underline-offset-[3px]">
                Privacy policy
              </a>
            </p>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={decline}
                className="text-sm font-medium text-neutral-400 bg-transparent border border-white/25 px-4 py-2 rounded-none cursor-pointer transition-colors duration-300 hover:text-white hover:border-white"
              >
                Decline
              </button>
              <button
                onClick={accept}
                className="text-sm font-medium text-black bg-white border border-white px-4 py-2 rounded-none cursor-pointer hover:bg-neutral-100 transition-colors"
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
