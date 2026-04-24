import React from "react";
import Image from "next/image";
import { tier1Partners, tier2Partners, tier3Partners, type Partner } from "@/lib/partners";

function LogoItem({
  partner,
  boxClass,
  sizes,
}: {
  partner: Partner;
  boxClass: string;
  sizes: string;
}) {
  return (
    <a
      href={partner.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center justify-center w-full py-3 sm:py-4"
      aria-label={`${partner.name} — Since AI partner website`}
    >
      {/* Fixed-size bounding box — every logo renders inside the same rectangle */}
      <div className={`relative flex-shrink-0 ${boxClass}`}>
        <Image
          src={partner.logo}
          alt={`${partner.name} logo — Since AI partner`}
          fill
          className="object-contain object-center grayscale opacity-45 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
          sizes={sizes}
        />
      </div>
    </a>
  );
}

export function PartnersSection() {
  return (
    <section className="py-20 sm:py-28 lg:py-32 px-4 sm:px-6 bg-black border-t border-white/5">
      <div className="max-w-6xl mx-auto">

        <h2 className="text-center text-xl sm:text-2xl font-semibold text-white mb-14 sm:mb-20 tracking-tight max-w-2xl mx-auto leading-snug">
          Backed by global AI leaders, VCs, and world-class research groups.
        </h2>

        {/* ── Tier 1: Strategic Partners ── */}
        <div className="mb-14 sm:mb-20">
          <h3 className="text-xs uppercase tracking-widest text-neutral-600 font-semibold text-center mb-8 sm:mb-12">
            Strategic Partners
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-2 gap-x-2">
            {tier1Partners.map((partner) => (
              <LogoItem
                key={partner.name}
                partner={partner}
                boxClass="w-28 h-10 sm:w-32 sm:h-11 lg:w-36 lg:h-12"
                sizes="(max-width: 640px) 112px, (max-width: 1024px) 128px, 144px"
              />
            ))}
          </div>
        </div>

        <div className="border-t border-white/5 mb-14 sm:mb-20" />

        {/* ── Tier 2: Capital & Research Partners ── */}
        <div className="mb-12 sm:mb-16">
          <h3 className="text-xs uppercase tracking-widest text-neutral-600 font-semibold text-center mb-8 sm:mb-12">
            Capital &amp; Research Partners
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-2 gap-x-2">
            {tier2Partners.map((partner) => (
              <LogoItem
                key={partner.name}
                partner={partner}
                boxClass="w-24 h-9 sm:w-28 sm:h-10 lg:w-32 lg:h-11"
                sizes="(max-width: 640px) 96px, (max-width: 1024px) 112px, 128px"
              />
            ))}
          </div>
        </div>

        <div className="border-t border-white/5 mb-4" />

        {/* ── Tier 3: Community Supporters (collapsed by default) ── */}
        <details className="group">
          <summary className="flex items-center justify-center gap-2 cursor-pointer select-none py-5 text-sm font-medium text-neutral-500 hover:text-white transition-colors [&::-webkit-details-marker]:hidden [&::marker]:hidden list-none">
            <span className="group-open:hidden">
              + Show all {tier3Partners.length} community supporters
            </span>
            <span className="hidden group-open:inline">
              − Hide community supporters
            </span>
          </summary>

          <div className="mt-10">
            <h3 className="text-xs uppercase tracking-widest text-neutral-600 font-semibold text-center mb-8 sm:mb-10">
              Community Supporters
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-y-2 gap-x-2">
              {tier3Partners.map((partner) => (
                <LogoItem
                  key={partner.name}
                  partner={partner}
                  boxClass="w-20 h-8 sm:w-24 sm:h-9 lg:w-28 lg:h-10"
                  sizes="(max-width: 640px) 80px, (max-width: 1024px) 96px, 112px"
                />
              ))}
            </div>
          </div>
        </details>

      </div>
    </section>
  );
}
