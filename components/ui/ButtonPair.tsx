"use client";

import Link from "next/link";
import { trackEvent, type AnalyticsEvent } from "@/lib/gtag";

interface ButtonPairProps {
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  className?: string;
  primaryAnalyticsEvent?: AnalyticsEvent;
  secondaryAnalyticsEvent?: AnalyticsEvent;
}

export function ButtonPair({
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  className,
  primaryAnalyticsEvent,
  secondaryAnalyticsEvent,
}: ButtonPairProps) {
  const isExternalPrimary = primaryHref.startsWith("http");
  const isExternalSecondary = secondaryHref.startsWith("http");

  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className ?? ""}`}>
      {isExternalPrimary ? (
        <a
          href={primaryHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => primaryAnalyticsEvent && trackEvent(primaryAnalyticsEvent)}
          className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-none transition-all duration-300 hover:bg-neutral-100"
        >
          {primaryLabel}
        </a>
      ) : (
        <Link
          href={primaryHref}
          onClick={() => primaryAnalyticsEvent && trackEvent(primaryAnalyticsEvent)}
          className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-none transition-all duration-300 hover:bg-neutral-100"
        >
          {primaryLabel}
        </Link>
      )}

      {isExternalSecondary ? (
        <a
          href={secondaryHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => secondaryAnalyticsEvent && trackEvent(secondaryAnalyticsEvent)}
          className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white rounded-none transition-colors duration-300 border border-white/20 hover:border-white"
        >
          {secondaryLabel}
        </a>
      ) : (
        <Link
          href={secondaryHref}
          onClick={() => secondaryAnalyticsEvent && trackEvent(secondaryAnalyticsEvent)}
          className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white rounded-none transition-colors duration-300 border border-white/20 hover:border-white"
        >
          {secondaryLabel}
        </Link>
      )}
    </div>
  );
}
