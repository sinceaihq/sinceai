"use client";

import React, { useEffect, useState } from "react";
import { TrackedLink } from "@/components/analytics/TrackedLink";

/**
 * Persistent Apply bar for /hackathon.
 *
 * /hackathon is the landing page for paid search, so a visitor who scrolls past
 * the hero should never be more than one tap from the application form. The bar
 * appears once the hero is out of view and hides again over the registration
 * section, so it never covers the real CTA or the footer.
 *
 * Visibility is driven by IntersectionObserver on the two anchor sections rather
 * than a scroll listener — no work on the scroll thread, which matters because
 * Lenis smooth-scroll already owns it.
 */
export function StickyApplyBar() {
  const [pastHero, setPastHero] = useState(false);
  const [atRegistration, setAtRegistration] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hackathon-hero");
    const registration = document.getElementById("registration");

    const observers: IntersectionObserver[] = [];

    if (hero) {
      const heroObserver = new IntersectionObserver(
        ([entry]) => setPastHero(!entry.isIntersecting),
        { threshold: 0 }
      );
      heroObserver.observe(hero);
      observers.push(heroObserver);
    }

    if (registration) {
      const registrationObserver = new IntersectionObserver(
        ([entry]) => setAtRegistration(entry.isIntersecting),
        { threshold: 0 }
      );
      registrationObserver.observe(registration);
      observers.push(registrationObserver);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const visible = pastHero && !atRegistration;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 backdrop-blur-sm transition-[opacity,transform] duration-300 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-full pointer-events-none"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between gap-4">
        <p className="text-xs sm:text-sm text-white leading-tight">
          <span className="font-semibold" style={{ color: "var(--color-brand)" }}>
            €50,000
          </span>
          <span className="text-neutral-400">
            {" "}
            · Nov 6–8, 2026 · Turku · Free
          </span>
        </p>

        <TrackedLink
          href="https://sinceai.app/sign-up"
          analyticsEvent="register_click"
          className="shrink-0 inline-block bg-white text-black rounded-none px-5 py-2.5 font-semibold hover:bg-neutral-100 transition-colors cursor-pointer text-sm"
        >
          Apply now →
        </TrackedLink>
      </div>
    </div>
  );
}
