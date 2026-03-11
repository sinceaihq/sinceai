import React from "react";

const partners = [
  { name: "Bayer",          logo: "/assets/sponsors/Bayer.svg",         url: "https://www.bayer.com/" },
  { name: "Valmet",         logo: "/assets/sponsors/valmet.png",        url: "https://www.valmet.com/" },
  { name: "Sandvik",        logo: "/assets/sponsors/sandvik.png",       url: "https://www.sandvik.com/" },
  { name: "Kongsberg",      logo: "/assets/sponsors/kongsberg.png",     url: "https://www.kongsberg.com/" },
  { name: "ElevenLabs",     logo: "/assets/sponsors/elevenlabs.png",    url: "https://elevenlabs.io/" },
  { name: "Antler",         logo: "/assets/sponsors/antler.png",        url: "https://www.antler.co/" },
  { name: "Featherless.ai", logo: "/assets/sponsors/featherless.svg",   url: "https://featherless.ai/" },
  { name: "Skillio",        logo: "/assets/sponsors/Skillio.png",       url: "https://skillio.ai/" },
  { name: "Eisko",          logo: "/assets/sponsors/eisko.svg",         url: "https://www.eisko.fi/" },
  { name: "A'Pelago",       logo: "/assets/sponsors/apelago.png",       url: "https://www.apelago.fi/" },
  { name: "Business Turku", logo: "/assets/sponsors/businessturku.png", url: "https://businessturku.fi/" },
  { name: "n8n",            logo: "/assets/sponsors/n8n.svg",           url: "https://n8n.io/" },
];

const supporters = [
  { name: "University of Turku", logo: "/assets/supports/universityofturku.png", url: "https://www.utu.fi" },
  { name: "Turku AMK",           logo: "/assets/supports/turkuamk.png",          url: "https://www.turkuamk.fi/" },
  { name: "City of Turku",       logo: "/assets/supports/cityofturku.png",       url: "https://www.turku.fi" },
  { name: "Boost Turku",         logo: "/assets/supports/boost.svg",             url: "https://www.boostturku.com/" },
  { name: "AI Mad Lab",          logo: "/assets/supports/aimadlab.svg",          url: "https://www.aimadlab.com/" },
  { name: "Aalto AI",            logo: "/assets/supports/aaltoai.png",           url: "https://www.aaltoai.com/" },
];

function LogoGrid({
  items,
  gridClass,
  logoHeight,
  imgHeight,
}: {
  items: typeof partners;
  gridClass: string;
  logoHeight: string;
  imgHeight: number;
}) {
  return (
    <div className={gridClass}>
      {items.map((item) => (
        <a
          key={item.name}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center justify-center min-w-[120px] ${logoHeight}`}
        >
          <img
            src={item.logo}
            alt={`${item.name} logo`}
            style={{ height: `${imgHeight}px`, width: 'auto' }}
            className="object-contain opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300"
          />
        </a>
      ))}
    </div>
  );
}

export function PartnersSection() {
  return (
    <section className="py-32 px-6 bg-black border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-center text-3xl font-semibold text-white mb-16 tracking-tight">
          Partners &amp; Supporters
        </h2>

        {/* Subsection 1: Partners — 11 logos, 5 columns per row */}
        <div className="mb-14">
          <p className="text-xs uppercase tracking-widest text-neutral-600 font-semibold text-center mb-10">
            Partners
          </p>
          <LogoGrid
            items={partners}
            gridClass="grid grid-cols-2 sm:grid-cols-5 gap-x-16 gap-y-14 items-center justify-items-center"
            logoHeight="h-20"
            imgHeight={80}
          />
        </div>

        {/* Divider */}
        <div className="border-t border-white/5 my-14" />

        {/* Subsection 2: Supporting Partners — 6 logos, 3 columns = 2 clean rows */}
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-600 font-semibold text-center mb-10">
            Supporting Partners
          </p>
          <LogoGrid
            items={supporters}
            gridClass="grid grid-cols-2 sm:grid-cols-3 gap-x-16 gap-y-14 items-center justify-items-center"
            logoHeight="h-16"
            imgHeight={64}
          />
        </div>
      </div>
    </section>
  );
}
