import type { ReactNode } from "react";
import { ConsentDefaults } from "./ConsentDefaults";
import { GuideHeader } from "./GuideHeader";
import { GuideFooter } from "./GuideFooter";

/** Chrome for every Field Guide page: event-layer atmosphere, header, footer. */
export function GuideShell({ children }: { children: ReactNode }) {
  return (
    <div className="guide-root relative min-h-screen bg-black text-white">
      <ConsentDefaults />
      <div aria-hidden="true" className="guide-ambient pointer-events-none absolute inset-x-0 top-0 h-[44rem]" />
      <div aria-hidden="true" className="guide-grid pointer-events-none absolute inset-x-0 top-0 h-[44rem]" />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-black"
      >
        Skip to content
      </a>
      <GuideHeader />
      <main id="main" className="relative">
        {children}
      </main>
      <GuideFooter />
    </div>
  );
}
