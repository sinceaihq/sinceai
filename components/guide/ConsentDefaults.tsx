"use client";

import { useLayoutEffect } from "react";
import { ensureConsentDefaults } from "@/lib/gtag";

/**
 * Guide pages that Next.js renders only in the browser (the guide's 404) skip
 * the root layout's consent script. Layout effects run before the analytics
 * script loads (a passive effect), so consent mode is always set first.
 */
export function ConsentDefaults() {
  useLayoutEffect(ensureConsentDefaults, []);
  return null;
}
