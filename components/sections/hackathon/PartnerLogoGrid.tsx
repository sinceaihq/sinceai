import React from "react";
import Link from "next/link";
import Image from "next/image";
import { PARTNERS, type Partner } from "@/lib/partners";

/**
 * Partner logo grid for /hackathon.
 *
 * Mirrors the tier-grid markup of the homepage PartnersSection, but renders
 * logos at full colour (no grayscale) — the partner roster is a large part of
 * the pitch on the page paid traffic lands on.
 *
 * Groups are curated by hand rather than reused from the tier fields, because
 * the hackathon story is "who sets the challenges" rather than "who backs us".
 */

function byName(name: string): Partner {
  const partner = PARTNERS.find((p) => p.name === name);
  if (!partner) throw new Error(`PartnerLogoGrid: unknown partner "${name}"`);
  return partner;
}

const groups: { label: string; names: string[]; boxClass: string; sizes: string; note?: string }[] = [
  {
    label: "Tech partners",
    names: [
      "Google For Developers",
      "ElevenLabs",
      "LUMI AI Factory",
      "Aiven",
      "Lovable",
      "n8n",
      "Featherless.ai",
      "JetBrains",
      "Atlassian",
      "Pruna AI",
    ],
    boxClass: "w-28 h-10 sm:w-32 sm:h-11 lg:w-36 lg:h-12",
    sizes: "(max-width: 640px) 112px, (max-width: 1024px) 128px, 144px",
  },
  {
    label: "Challenge partners",
    names: [
      "Bayer",
      "Sandvik",
      "Kongsberg",
      "Valmet",
      "Turun Teknologiakiinteistöt",
      "Revvity",
      "Traficom",
      "Meyer Turku",
      "Elisa",
      "Solita",
      "Takomo Golf",
      "Turku Energia",
      "Apetit",
      "Lindström",
      "Bo",
    ],
    boxClass: "w-32 h-12 sm:w-36 sm:h-14 lg:w-40 lg:h-16",
    sizes: "(max-width: 640px) 128px, (max-width: 1024px) 144px, 160px",
    note: "More challenge partners coming soon...",
  },
  {
    label: "Funding partners",
    names: ["Antler", "Tesi", "Icebreaker VC", "Inventure", "Wave Ventures", "Redstone VC", "MAKI VC"],
    boxClass: "w-24 h-9 sm:w-28 sm:h-10 lg:w-32 lg:h-11",
    sizes: "(max-width: 640px) 96px, (max-width: 1024px) 112px, 128px",
  },
  {
    label: "Capital & ecosystem",
    names: ["University of Turku", "AI Finland", "Maria 01", "City of Turku", "Turku AMK"],
    boxClass: "w-24 h-9 sm:w-28 sm:h-10 lg:w-32 lg:h-11",
    sizes: "(max-width: 640px) 96px, (max-width: 1024px) 112px, 128px",
  },
];

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
      aria-label={`${partner.name} — Since AI Hackathon 2026 partner website`}
    >
      {/* Fixed-size bounding box — every logo renders inside the same rectangle */}
      <div className={`relative flex-shrink-0 ${boxClass}`}>
        <Image
          src={partner.logo}
          alt={`${partner.name} logo — Since AI Hackathon 2026 partner`}
          fill
          className="object-contain object-center transition-transform duration-300"
          sizes={sizes}
        />
      </div>
    </a>
  );
}

export function PartnerLogoGrid() {
  return (
    <section className="py-24 px-6 border-t border-white/10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
          {"// challenge partners"}
        </p>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
          Real problems from real companies.
        </h2>
        <p className="text-sm text-neutral-400 leading-relaxed max-w-[640px] mb-14">
          Every challenge at Since AI Hackathon 2026 is set by a company that
          actually needs it solved. Build something they can use — and get in
          front of the people who do the hiring.
        </p>

        {groups.map((group, i) => (
          <div key={group.label} className={i > 0 ? "mt-14 pt-14 border-t border-white/5" : ""}>
            <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-8">
              {group.label}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-2 gap-x-2">
              {group.names.map((name) => (
                <LogoItem
                  key={name}
                  partner={byName(name)}
                  boxClass={group.boxClass}
                  sizes={group.sizes}
                />
              ))}
            </div>
            {group.note && (
              <p className="mt-4 text-sm text-neutral-400">{group.note}</p>
            )}
          </div>
        ))}

        <div className="border-t border-white/10 pt-6 mt-14">
          <Link
            href="/partners"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Interested in setting a challenge or sponsoring? → sinceai.ai/partners
          </Link>
        </div>
      </div>
    </section>
  );
}
