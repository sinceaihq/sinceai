import React from "react";
import Image from "next/image";
import { tier1Partners, tier2Partners, tier3Partners, type Partner } from "@/lib/partners";

function LogoItem({
  partner,
  imgHeight,
  imgWidth,
  sizes,
}: {
  partner: Partner;
  imgHeight: number;
  imgWidth: number;
  sizes: string;
}) {
  return (
    <a
      href={partner.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center"
      aria-label={`${partner.name} — Since AI partner website`}
    >
      <div
        className="relative"
        style={{ height: imgHeight, width: imgWidth }}
      >
        <Image
          src={partner.logo}
          alt={`${partner.name} logo — Since AI partner`}
          fill
          sizes={sizes}
          className="object-contain grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
        />
      </div>
    </a>
  );
}

export function PartnersSection() {
  return (
    <section className="py-32 px-6 bg-black border-t border-white/5">
      <div className="max-w-5xl mx-auto">

        <h2 className="text-center text-2xl font-semibold text-white mb-20 tracking-tight max-w-2xl mx-auto leading-snug">
          Backed by global AI leaders, European VCs, and world-class research groups.
        </h2>

        {/* ── Tier 1: Strategic Partners ── */}
        <div className="mb-20">
          <h3 className="text-xs uppercase tracking-widest text-neutral-600 font-semibold text-center mb-12">
            Strategic Partners
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-x-12 gap-y-12 items-center justify-items-center">
            {tier1Partners.map((partner) => (
              <LogoItem
                key={partner.name}
                partner={partner}
                imgHeight={48}
                imgWidth={128}
                sizes="(max-width: 640px) 96px, 128px"
              />
            ))}
          </div>
        </div>

        <div className="border-t border-white/5 mb-20" />

        {/* ── Tier 2: Capital & Research Partners ── */}
        <div className="mb-16">
          <h3 className="text-xs uppercase tracking-widest text-neutral-600 font-semibold text-center mb-12">
            Capital &amp; Research Partners
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-x-12 gap-y-12 items-center justify-items-center">
            {tier2Partners.map((partner) => (
              <LogoItem
                key={partner.name}
                partner={partner}
                imgHeight={40}
                imgWidth={112}
                sizes="(max-width: 640px) 80px, 112px"
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
            <h3 className="text-xs uppercase tracking-widest text-neutral-600 font-semibold text-center mb-10">
              Community Supporters
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-10 gap-y-10 items-center justify-items-center">
              {tier3Partners.map((partner) => (
                <LogoItem
                  key={partner.name}
                  partner={partner}
                  imgHeight={32}
                  imgWidth={88}
                  sizes="(max-width: 640px) 72px, 88px"
                />
              ))}
            </div>
          </div>
        </details>

      </div>
    </section>
  );
}
