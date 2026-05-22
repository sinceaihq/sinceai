import { FeaturedSpeakers } from "@/components/sections/homepage/FeaturedSpeakers";

// ── Partner data for Section 4 ─────────────────────────────────────────────
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
  { name: "A\u2019Pelago",          url: "https://www.apelago.fi/" },
  { name: "Tamperees",              url: "https://tamperees.com/" },
  { name: "HankenES",               url: "https://hankenes.org" },
];

// ── Shared sub-components ──────────────────────────────────────────────────

function Eyebrow({ text }: { text: string }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "var(--text-xs)",
        color: "var(--color-fg-muted)",
        letterSpacing: "0.05em",
        marginBottom: "var(--space-sm)",
      }}
    >
      {text}
    </p>
  );
}

function SectionH2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="text-white"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "clamp(24px, 4vw, 36px)",
        fontWeight: 700,
        lineHeight: 1.15,
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function BelowHero() {
  return (
    <div className="w-full bg-black">

      {/* ── SECTION 1: Definition ──────────────────────────────── */}
      <section
        style={{ padding: "var(--space-2xl) var(--space-lg)" }}
      >
        <div className="mx-auto" style={{ maxWidth: "1200px" }}>
          <Eyebrow text="// what is since ai" />
          <SectionH2>The execution layer of Global AI.</SectionH2>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "16px",
              fontWeight: 400,
              lineHeight: 1.7,
              color: "#fff",
              maxWidth: "780px",
              marginTop: "var(--space-md)",
              marginBottom: 0,
            }}
          >
            Since AI is a global execution-focused AI innovation ecosystem — where
            frontier AI becomes shipped products. A non-profit connecting
            10,000+ AI builders globally with leading AI companies, research
            groups, and investors. Partners include Google for Developers, ElevenLabs, Aiven,
            Lovable, Antler, LUMI AI Factory, and Redstone VC.
          </p>
        </div>
      </section>

      {/* ── SECTION 2: Stats ───────────────────────────────────── */}
      <section
        style={{
          padding: "var(--space-xl) var(--space-lg)",
          borderTop: "0.5px solid var(--color-border)",
        }}
      >
        <div
          className="mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          style={{ maxWidth: "1200px", gap: "var(--space-lg)" }}
        >
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
            <div
              key={stat.label}
              style={{
                borderLeft: "0.5px solid var(--color-border)",
                paddingLeft: "var(--space-md)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--color-fg-muted)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: "var(--space-xs)",
                }}
              >
                {stat.label}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "clamp(32px, 5vw, 56px)",
                  fontWeight: 700,
                  lineHeight: 1,
                  color: "#fff",
                  margin: 0,
                }}
              >
                {stat.value}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "13px",
                  color: "var(--color-fg-muted)",
                  maxWidth: "180px",
                  lineHeight: 1.5,
                  marginTop: "var(--space-xs)",
                }}
              >
                {stat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 3: Three pillars ───────────────────────────── */}
      <section
        style={{
          padding: "var(--space-2xl) var(--space-lg)",
          borderTop: "0.5px solid var(--color-border)",
        }}
      >
        <div className="mx-auto" style={{ maxWidth: "1200px" }}>
          <Eyebrow text="// how since ai works" />
          <SectionH2>From idea to shipped product.</SectionH2>

          <div
            className="grid grid-cols-1 md:grid-cols-3 mt-12"
            style={{ gap: "var(--space-xl)" }}
          >
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
                body: "Capital introductions through Antler, Redstone VC and Inventure. Commercialization pathway via Since AI\u2019s Research to Market program.",
              },
            ].map((pillar) => (
              <div key={pillar.num}>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(32px, 4vw, 48px)",
                    fontWeight: 700,
                    lineHeight: 1,
                    color: "var(--color-fg-subtle)",
                    marginBottom: "var(--space-sm)",
                  }}
                  aria-hidden="true"
                >
                  {pillar.num}
                </p>
                <h3
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#fff",
                    margin: 0,
                    marginBottom: "var(--space-sm)",
                  }}
                >
                  {pillar.title}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-base)",
                    color: "var(--color-fg-muted)",
                    lineHeight: 1.6,
                    maxWidth: "320px",
                    margin: 0,
                  }}
                >
                  {pillar.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Partner tiers (text list) ───────────────── */}
      <section
        style={{
          padding: "var(--space-2xl) var(--space-lg)",
          borderTop: "0.5px solid var(--color-border)",
        }}
      >
        <div className="mx-auto" style={{ maxWidth: "1200px" }}>
          <Eyebrow text="// ecosystem" />
          <SectionH2>
            Backed by global AI leaders and world-class capital{" "}
            <br className="hidden md:block" />
            and research.
          </SectionH2>

          <div
            className="grid grid-cols-1 md:grid-cols-3 mt-12"
            style={{ gap: "var(--space-xl)" }}
          >
            {(
              [
                { header: "// strategic",        partners: STRATEGIC },
                { header: "// capital & research", partners: CAPITAL },
                { header: "// community",         partners: COMMUNITY },
              ] as const
            ).map(({ header, partners }) => (
              <div key={header}>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                    color: "var(--color-fg-muted)",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: "var(--space-md)",
                  }}
                >
                  {header}
                </p>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "14px",
                    lineHeight: 1.9,
                    color: "var(--color-fg)",
                  }}
                >
                  {partners.map((p, i) => (
                    <span key={p.name}>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                        style={{
                          color: "inherit",
                          textDecoration: "none",
                        }}
                      >
                        {p.name}
                      </a>
                      {i < partners.length - 1 && (
                        <span style={{ color: "var(--color-fg-subtle)" }}>, </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION: Testimonial slot ───────────────────────── */}
      {/* TODO: Named testimonial with partner attribution once confirmed.
          Format: blockquote in monospace, attribution line with name + role + company.
          Do NOT re-add the anonymous "Head of Talent, Partner Company" quote. */}

      {/* ── SECTION 6: Featured Speaker ─────────────────────── */}
      <FeaturedSpeakers />

    </div>
  );
}
