"use client";

import { COOKIE_CONSENT_KEY } from "@/components/CookieConsent";

export function ManageCookies() {
  function resetConsent() {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    window.location.reload();
  }

  return (
    <button
      onClick={resetConsent}
      className="mt-2 px-4 py-2 text-sm text-neutral-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all"
    >
      Manage cookie preferences
    </button>
  );
}
