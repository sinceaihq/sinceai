import { FeaturedSpeakers } from "@/components/sections/homepage/FeaturedSpeakers";

// ── Partner data ───────────────────────────────────────────────────────────

const STRATEGIC = [
  { name: "Google for Developers", url: "https://developers.google.com/" },
  { name: "ElevenLabs",            url: "https://elevenlabs.io/" },
  { name: "LUMI AI Factory",       url: "https://lumi-ai-factory.eu/" },
  { name: "Aiven",                 url: "https://aiven.io/" },
  { name: "Lovable",               url: "https://lovable.dev/" },
  { name: "n8n",                   url: "https://n8n.io/" },
  { name: "Bayer",                 url: "https://www.bayer.com/" },
  { name: "Sandvik",               url: "https://www.sandvik.com/" },
  { name: "Kongsberg",             url: "https://www.kongsberg.com/" },
  { name: "Valmet",                url: "https://www.valmet.com/" },
  { name: "Featherless.ai",        url: "https://featherless.ai/" },
];

const CAPITAL = [
  { name: "Antler",              url: "https://www.antler.co/" },
  { name: "Inventure",           url: "https://www.inventure.vc/" },
  { name: "Wave Ventures",       url: "https://www.wave.ventures/" },
  { name: "Redstone VC",         url: "https://redstone.vc/" },
  { name: "Aalto AI",            url: "https://www.aaltoai.com/" },
  { name: "Maria 01",            url: "https://maria.io/" },
];

const COMMUNITY = [
  { name: "AI Mad Lab",             url: "https://www.aimadlab.com/" },
  { name: "Founders House",         url: "https://founders-house.fi/" },
  { name: "Helsinki Think Company", url: "https://www.thinkcompany.fi" },
  { name: "Boost Turku",            url: "https://www.boostturku.com/" },
  { name: "AI Eesti",               url: "https://aieesti.ee/en" },
  { name: "Turku AMK",              url: "https://www.turkuamk.fi/" },
  { name: "Business Turku",         url: "https://businessturku.fi/" },
  { name: "Skillio",                url: "https://skillio.ai/" },
  { name: "A’Pelago",          url: "https://www.apelago.fi/" },
  { name: "Tamperees",              url: "https://tamperees.com/" },
  { name: "HankenES",               url: "https://hankenes.org" },
];

// ── Main component ─────────────────────────────────────────────────────────

export function BelowHero() {
  return (
    <div className="w-full bg-black">

      {/* ── SECTION 1: Definition ──────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/10">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
            {"// what is since ai"}
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-6">
            The execution layer of Global AI.
          </h2>
          <p className="text-sm text-white leading-relaxed max-w-[780px]">
            Since AI is a{" "}
            <strong className="font-semibold">registered nonprofit association</strong>{" "}
            running a global execution-focused AI innovation
            ecosystem — where frontier AI becomes shipped products. We connect
            10,000+ AI builders globally with leading AI companies, research
            groups, and investors. Partners include Google for Developers, ElevenLabs, Aiven,
            Lovable, Antler, LUMI AI Factory, and Redstone VC.
          </p>
        </div>
      </section>

      {/* ── SECTION 2: Stats ───────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/10">
        <div className="mx-auto max-w-6xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {[
            {
              label: "// network",
              value: "10,000+",
              desc: "AI builders globally",
            },
            {
              label: "// hackathon 2026",
              value: "1,000+",
              desc: "Builders targeted at flagship event, Nov 6–8 Turku",
            },
            {
              label: "// partners",
              value: "50+",
              desc: "Strategic, capital, and research partners",
            },
            {
              label: "// reach",
              value: "50+",
              desc: "Countries represented in our network",
            },
          ].map((stat) => (
            <div key={stat.label} className="border-l border-white/10 pl-6">
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-2">
                {stat.label}
              </p>
              <p className="text-4xl md:text-5xl font-bold text-white leading-none">
                {stat.value}
              </p>
              <p className="text-sm text-neutral-400 leading-relaxed mt-2 max-w-[180px]">
                {stat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 3: Three pillars ───────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/10">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
            {"// how since ai works"}
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-12">
            From idea to shipped product.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                title: "Build",
                body: "High-intensity hackathons and applied AI projects where builders go from idea to prototype. Flagship: Hackathon 2026, Turku — 1,000+ builders targeted.",
              },
              {
                num: "02",
                title: "Ship",
                body: "Production support for strong teams: deployment help, compute credits from ecosystem partners, code review, infrastructure.",
              },
              {
                num: "03",
                title: "Scale",
                body: "Capital introductions through Antler, Redstone VC and Inventure. Commercialization pathway via Since AI’s Research to Market program.",
              },
            ].map((pillar) => (
              <div
                key={pillar.num}
                className="border border-white/5 p-6 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-300"
              >
                <p className="text-4xl font-bold text-neutral-600 mb-4 leading-none" aria-hidden="true">
                  {pillar.num}
                </p>
                <h3 className="text-lg font-bold text-white mb-2">
                  {pillar.title}
                </h3>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {pillar.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Partner tiers ───────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/10">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-3">
            {"// ecosystem"}
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-12">
            Backed by global AI leaders and world-class capital{" "}
            <br className="hidden md:block" />
            and research.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {(
              [
                { header: "// strategic",          partners: STRATEGIC },
                { header: "// capital & research", partners: CAPITAL },
                { header: "// community",          partners: COMMUNITY },
              ] as const
            ).map(({ header, partners }) => (
              <div key={header}>
                <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-4">
                  {header}
                </p>
                <div className="text-sm leading-loose text-white">
                  {partners.map((p, i) => (
                    <span key={p.name}>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-neutral-400 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                      >
                        {p.name}
                      </a>
                      {i < partners.length - 1 && (
                        <span className="text-neutral-500">, </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: Featured Speakers ─────────────────────── */}
      <FeaturedSpeakers />

    </div>
  );
}
