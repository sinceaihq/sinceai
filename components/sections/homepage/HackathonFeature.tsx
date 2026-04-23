import React from "react";
import Image from "next/image";
import Link from "next/link";

export function HackathonFeature() {
  return (
    <section className="relative w-full overflow-hidden border-y border-white/5">
      {/* Background — EduCity venue photo */}
      <Image
        src="/assets/images/educity-hero.webp"
        alt="EduCity, Turku — venue for Since AI Hackathon 2026"
        fill
        sizes="100vw"
        className="object-cover"
      />

      {/* Layered overlays: base dark + top/bottom fade to black */}
      <div className="absolute inset-0 bg-black/78" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black to-transparent" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-28 md:py-40">

        {/* Eyebrow */}
        <p className="text-xs uppercase tracking-[0.2em] font-semibold text-neutral-500 mb-5">
          Flagship Event
        </p>

        {/* Heading */}
        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tighter leading-tight mb-6">
          Since AI Hackathon 2026
        </h2>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:text-base font-medium text-neutral-400 mb-8">
          <span>November 6–8, 2026</span>
          <span className="text-neutral-700" aria-hidden="true">·</span>
          <span>Turku, Finland</span>
          <span className="text-neutral-700" aria-hidden="true">·</span>
          <span>72 hours</span>
          <span className="text-neutral-700" aria-hidden="true">·</span>
          <span>1,000+ builders targeted</span>
        </div>

        {/* Body */}
        <p className="text-base sm:text-lg text-neutral-300 max-w-2xl leading-relaxed mb-10">
          Europe&apos;s execution-focused AI hackathon. Partner challenges from Google
          for Developers, Bayer, Sandvik, Kongsberg, Valmet, and more. Open to
          builders worldwide.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/hackathon"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02]"
          >
            Apply to build →
          </Link>
          <Link
            href="/partners"
            className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-full transition-all duration-300 hover:bg-white/15 backdrop-blur-xl border border-white/20 hover:border-white/30 hover:scale-[1.02]"
          >
            Partner with us →
          </Link>
        </div>

      </div>
    </section>
  );
}
