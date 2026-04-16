import Link from "next/link";

const DISCORD_URL = "https://discord.com/invite/YkqJswRGSW";

// ── Partner data for Section 4 ─────────────────────────────────────────────
const STRATEGIC = [
  { name: "Google for Developers", url: "https://developers.google.com/" },
  { name: "ElevenLabs",            url: "https://elevenlabs.io/" },
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
  { name: "Aalto AI",            url: "https://www.aaltoai.com/" },
  { name: "University of Turku", url: "https://www.utu.fi" },
  { name: "HankenAI",            url: "https://hankai.info/" },
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
  { name: "Eisko",                  url: "https://www.eisko.fi/" },
  { name: "Tamperees",              url: "https://tamperees.com/" },
  { name: "HankenES",               url: "https://hankenes.org" },
  { name: "\u00C5AES",              url: "https://www.aaes.fi/" },
  { name: "VES",                    url: "https://www.ves.fi" },
  { name: "Pories",                 url: "https://www.pories.fi" },
  { name: "City of Turku",          url: "https://www.turku.fi" },
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
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "36px",
        fontWeight: 500,
        lineHeight: 1.15,
        color: "#fff",
        margin: 0,
      }}
    >
      {children}
    </h2>
  );
}

// ── CTA button styles ──────────────────────────────────────────────────────

const ctaPrimary: React.CSSProperties = {
  display: "inline-block",
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  fontWeight: 500,
  color: "#000",
  background: "#fff",
  padding: "12px 20px",
  borderRadius: 0,
  border: "0.5px solid #fff",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

const ctaSecondary: React.CSSProperties = {
  display: "inline-block",
  fontFamily: "var(--font-mono)",
  fontSize: "13px",
  fontWeight: 500,
  color: "#fff",
  background: "transparent",
  padding: "12px 20px",
  borderRadius: 0,
  border: "0.5px solid var(--color-border-strong)",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

// ── Main component ─────────────────────────────────────────────────────────

export function BelowHero() {
  return (
    <div className="w-full bg-black">

      {/* ── SECTION 1: Definition ──────────────────────────────── */}
      <section
        style={{ padding: "var(--space-2xl) var(--space-lg)" }}
      >
        <div className="mx-auto" style={{ maxWidth: "880px" }}>
          <Eyebrow text="// what is since ai" />
          <SectionH2>The execution layer of European AI.</SectionH2>
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
            Since AI is Europe&apos;s execution-focused AI innovation ecosystem — where
            frontier AI becomes shipped products. A non-profit connecting
            10,000+ AI builders across Europe with leading AI companies, research
            groups, and investors. Partners include Google for Developers, Bayer,
            Sandvik, Kongsberg, Valmet, Antler, Inventure, and the University of Turku.
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
              desc: "AI builders in our network across Europe",
            },
            {
              label: "// hackathon 2026",
              value: "1,000+",
              desc: "Builders targeted at flagship event, Nov 6–8 Turku",
            },
            {
              label: "// partners",
              value: "30+",
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
                  fontSize: "56px",
                  fontWeight: 500,
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
                body: "Capital introductions through Antler, Inventure, and Wave Ventures. Commercialization pathway via Since AI\u2019s Research to Market program.",
              },
            ].map((pillar) => (
              <div key={pillar.num}>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "48px",
                    fontWeight: 500,
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
                    fontWeight: 500,
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
            Backed by global AI leaders, European capital,{" "}
            <br className="hidden md:block" />
            and world-class research.
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

      {/* ── SECTION 5: Hackathon 2026 feature ─────────────────── */}
      <section
        style={{
          padding: "var(--space-3xl) var(--space-lg)",
          borderTop: "0.5px solid var(--color-border)",
          borderBottom: "0.5px solid var(--color-border)",
        }}
      >
        <div className="mx-auto" style={{ maxWidth: "1200px" }}>
          <Eyebrow text="// flagship event" />
          <h2
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-headline-sm)",
              fontWeight: 500,
              lineHeight: 1.0,
              color: "#fff",
              margin: 0,
              marginTop: "var(--space-sm)",
            }}
          >
            Hackathon 2026.
          </h2>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "14px",
              color: "var(--color-fg-muted)",
              marginTop: "var(--space-md)",
              letterSpacing: "0.01em",
            }}
          >
            November 6–8, 2026 / Turku, Finland / 72 hours / 1,000+ builders
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-base)",
              color: "#fff",
              lineHeight: 1.6,
              maxWidth: "640px",
              marginTop: "var(--space-md)",
            }}
          >
            Europe&apos;s execution-focused AI hackathon. Partner challenges from Google for
            Developers, Bayer, Sandvik, Kongsberg, Valmet. Open to builders worldwide.
          </p>
          <div
            className="flex flex-col sm:flex-row"
            style={{ marginTop: "var(--space-lg)", gap: "12px" }}
          >
            <Link href="/hackathon" style={ctaPrimary}>
              Apply to build →
            </Link>
            <Link href="/partners" className="hero-cta-secondary" style={ctaSecondary}>
              Partner with us →
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: Testimonial slot ───────────────────────── */}
      {/* TODO: Named testimonial with partner attribution once confirmed.
          Format: blockquote in monospace, attribution line with name + role + company.
          Do NOT re-add the anonymous "Head of Talent, Partner Company" quote. */}

      {/* ── SECTION 7: Dual-track footer CTA ──────────────────── */}
      <section
        style={{
          padding: "var(--space-2xl) var(--space-lg)",
          borderTop: "0.5px solid var(--color-border)",
        }}
      >
        <div
          className="mx-auto grid grid-cols-1 md:grid-cols-2"
          style={{ maxWidth: "1200px", gap: "var(--space-xl)" }}
        >
          {/* Column 1 — For builders */}
          <div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--color-fg-muted)",
                letterSpacing: "0.05em",
                marginBottom: "var(--space-sm)",
              }}
            >
              // for builders
            </p>
            <h3
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "20px",
                fontWeight: 500,
                color: "#fff",
                margin: 0,
                marginBottom: "var(--space-sm)",
              }}
            >
              If you build.
            </h3>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-base)",
                color: "var(--color-fg-muted)",
                lineHeight: 1.6,
                marginBottom: "var(--space-lg)",
                maxWidth: "400px",
              }}
            >
              Join 10,000+ AI builders across Europe. Hackathons, applied projects, startup
              pathways.
            </p>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={ctaPrimary}
            >
              Join the builder network →
            </a>
          </div>

          {/* Column 2 — For partners */}
          <div>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--color-fg-muted)",
                letterSpacing: "0.05em",
                marginBottom: "var(--space-sm)",
              }}
            >
              // for partners
            </p>
            <h3
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "20px",
                fontWeight: 500,
                color: "#fff",
                margin: 0,
                marginBottom: "var(--space-sm)",
              }}
            >
              If you ship with us.
            </h3>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-base)",
                color: "var(--color-fg-muted)",
                lineHeight: 1.6,
                marginBottom: "var(--space-lg)",
                maxWidth: "400px",
              }}
            >
              Sponsor challenges. Recruit AI talent. Run applied AI pilots with proven
              builders.
            </p>
            <Link
              href="/partners"
              className="hero-cta-secondary"
              style={ctaSecondary}
            >
              Partner with Since AI →
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
