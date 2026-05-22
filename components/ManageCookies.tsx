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
      className="font-mono text-[13px] font-medium text-neutral-500 bg-transparent border border-white/20 px-5 py-3 rounded-none cursor-pointer transition-colors duration-300 hover:text-white hover:border-white mt-2"
    >
      Manage cookie preferences
    </button>
  );
}
