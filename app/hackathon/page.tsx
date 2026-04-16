import React from "react";
import Link from "next/link";
import Image from "next/image";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { CountdownTimer } from "@/components/countdown-timer";
import StructuredData from "@/components/StructuredData";

// ── Schemas ────────────────────────────────────────────────────────────────

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home",              item: "https://sinceai.fi" },
    { "@type": "ListItem", position: 2, name: "Since AI Hackathon 2026", item: "https://sinceai.fi/hackathon" },
  ],
};

const hackathonFaqs = [
  {
    q: "What is Since AI Hackathon?",
    a: "Since AI Hackathon is the flagship annual event of Since AI — Europe's execution-focused AI innovation ecosystem based in Turku, Finland. It is an official MLH (Major League Hacking) partner event. Builders from across the world gather to solve real industry challenges and ship AI products in 72 hours.",
  },
  {
    q: "When is Since AI Hackathon 2026?",
    a: "Since AI Hackathon 2026 runs November 6–8, 2026 at EduCity, Joukahaisenkatu 7, Turku, Finland. Registrations opening soon — join Discord or Telegram to be notified first.",
  },
  {
    q: "Is Since AI Hackathon an official MLH event?",
    a: "Yes. Since AI Hackathon 2026 is an official Major League Hacking (MLH) Member Event for the 2026 season. MLH is the world's largest hackathon league, supporting hundreds of events annually across North America, Europe, and Asia. Participants gain MLH recognition, prizes, and API credits.",
  },
  {
    q: "Who can participate?",
    a: "Since AI Hackathon is open to builders worldwide — developers, researchers, designers, and entrepreneurs. Students and professionals both welcome. The event is held in English.",
  },
  {
    q: "Where is the event held?",
    a: "EduCity, Joukahaisenkatu 7, Turku, Finland — the modern campus of Turku University of Applied Sciences (Turku AMK).",
  },
  {
    q: "Is registration free?",
    a: "Yes. Since AI Hackathon is free to attend for builders. Sponsorship and challenge partner opportunities are available for companies — see sinceai.fi/partners.",
  },
  {
    q: "How do I register?",
    a: "Registrations are opening soon for Since AI Hackathon 2026. Join our Discord (discord.com/invite/YkqJswRGSW) or Telegram (t.me/sinceaihq) to receive the registration announcement as soon as it opens.",
  },
  {
    q: "What companies set challenges?",
    a: "Challenge partners for 2026 include Google for Developers, Bayer, Sandvik, Kongsberg, and Valmet. Past edition partners also included ElevenLabs, Antler, and the University of Turku.",
  },
  {
    q: "What happens during the 72 hours?",
    a: "Teams form, select a partner challenge or open track, build a working AI product, and present it to judges. No slide decks — working demos only. Mentors from partner companies are available throughout.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: hackathonFaqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

// ── Content data ──────────────────────────────────────────────────────────

const keyFacts = [
  { label: "Event",          value: "Since AI Hackathon 2026" },
  { label: "Date",           value: "November 6–8, 2026" },
  { label: "Venue",          value: "EduCity, Joukahaisenkatu 7, Turku, Finland" },
  { label: "Duration",       value: "72 hours" },
  { label: "Expected",       value: "1,000+ builders" },
  { label: "Format",         value: "In-person" },
  { label: "Open to",        value: "Builders worldwide — students and professionals" },
  { label: "Language",       value: "English" },
  { label: "Participation",  value: "Free" },
  { label: "MLH",            value: "Official 2026 Season Member Event" },
  { label: "Organised by",   value: "Since AI (sinceai.fi)" },
];

const whyItems = [
  {
    num: "01",
    title: "Real industry challenges",
    body: "Solve actual problems set by Bayer, Sandvik, Kongsberg, Valmet, Google for Developers. The best solutions get noticed — and hired.",
  },
  {
    num: "02",
    title: "Official MLH partner event",
    body: "Since AI Hackathon 2026 is an official Major League Hacking (MLH) Member Event. Gain MLH recognition, prizes, API credits, and connect with the worldwide hacker community.",
  },
  {
    num: "03",
    title: "European builder network",
    body: "Join 10,000+ Since AI community members across Europe. Past participants have been hired, founded startups, and built lasting professional connections.",
  },
  {
    num: "04",
    title: "Working demos only",
    body: "No slide decks. No mockups. Since AI Hackathon rewards teams that build and demo working AI products within the 72-hour sprint.",
  },
];

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

// ── Page ──────────────────────────────────────────────────────────────────

export default function HackathonPage() {
  return (
    <SmoothScroll>
      <Navbar />
      <StructuredData data={breadcrumbSchema} />
      <StructuredData data={faqSchema} />

      <main className="flex flex-col w-full bg-black min-h-screen">

        {/* ── SECTION 1: Hero ─────────────────────────────────── */}
        <section className="relative w-full min-h-[90vh] flex items-end">
          <Image
            src="/assets/images/educity.png"
            alt="EduCity, Turku — venue for Since AI Hackathon 2026"
            fill
            className="object-cover"
            priority
          />
          {/* Overlays */}
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: "60%",
              background: "linear-gradient(to top, #000 0%, transparent 100%)",
            }}
          />

          <div
            className="relative z-10 mx-auto w-full"
            style={{
              maxWidth: "1200px",
              padding: "var(--space-3xl) var(--space-lg) var(--space-2xl)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-xs)",
                color: "var(--color-fg-muted)",
                letterSpacing: "0.05em",
                marginBottom: "var(--space-sm)",
              }}
            >
              // flagship event
            </p>

            <h1
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-headline-lg)",
                fontWeight: 500,
                lineHeight: 1.0,
                letterSpacing: "-0.02em",
                color: "#fff",
                margin: 0,
                marginBottom: "var(--space-md)",
                maxWidth: "820px",
              }}
            >
              Since AI Hackathon 2026.
            </h1>

            <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "14px",
              color: "var(--color-fg-muted)",
              marginBottom: "var(--space-lg)",
              letterSpacing: "0.01em",
            }}
          >
            November 6–8, 2026 &nbsp;/&nbsp; EduCity, Turku, Finland &nbsp;/&nbsp; 72 hours &nbsp;/&nbsp; 1,000+ builders &nbsp;/&nbsp; MLH Official Partner Event
          </p>

            {/* Countdown */}
            <div style={{ marginBottom: "var(--space-lg)" }}>
              <CountdownTimer
                startDate="2026-11-06T09:00:00"
                endDate="2026-11-08T23:59:00"
              />
            </div>

            {/* Registration status */}
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-sm)",
                color: "var(--color-fg-muted)",
                marginBottom: "var(--space-lg)",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "#f59e0b",
                  marginRight: "8px",
                  verticalAlign: "middle",
                }}
                aria-hidden="true"
              />
              Registrations opening soon — join Discord to be notified
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row" style={{ gap: "12px" }}>
              <a
                href="https://discord.com/invite/YkqJswRGSW"
                target="_blank"
                rel="noopener noreferrer"
                style={ctaPrimary}
              >
                Get notified when registration opens →
              </a>
              <Link href="/partners" className="hero-cta-secondary" style={ctaSecondary}>
                Partner with us →
              </Link>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: What is it ────────────────────────────── */}
        <section
          style={{
            padding: "var(--space-2xl) var(--space-lg)",
            borderTop: "0.5px solid var(--color-border)",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: "880px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-fg-muted)", letterSpacing: "0.05em", marginBottom: "var(--space-sm)" }}>
              // what is it
            </p>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "36px",
                fontWeight: 500,
                lineHeight: 1.15,
                color: "#fff",
                margin: 0,
                marginBottom: "var(--space-md)",
              }}
            >
              72 hours. Real challenges. Shipped products.
            </h2>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-base)",
                color: "var(--color-fg-muted)",
                lineHeight: 1.7,
                maxWidth: "720px",
              }}
            >
              <p style={{ marginBottom: "var(--space-md)" }}>
                Since AI Hackathon is the flagship annual event of Since AI — Europe&apos;s
                execution-focused AI innovation ecosystem based in Turku, Finland. The inaugural
                edition in November 2025 brought together 260 builders who shipped 30+ AI
                projects in 72 hours.
              </p>
              <p style={{ marginBottom: "var(--space-md)" }}>
                The 2026 edition targets 1,000+ builders. Partner challenges come from Google
                for Developers, Bayer, Sandvik, Kongsberg, and Valmet. Open to developers,
                researchers, and entrepreneurs worldwide.
              </p>
              <p style={{ margin: 0 }}>
                No slide decks. No mockups. Only working demos.
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: Why participate ──────────────────────── */}
        <section
          style={{
            padding: "var(--space-2xl) var(--space-lg)",
            borderTop: "0.5px solid var(--color-border)",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: "1200px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-fg-muted)", letterSpacing: "0.05em", marginBottom: "var(--space-sm)" }}>
              // why participate
            </p>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "36px",
                fontWeight: 500,
                color: "#fff",
                margin: 0,
                marginBottom: "var(--space-xl)",
              }}
            >
              Built for builders who ship.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-lg)" }}>
              {whyItems.map((item) => (
                <div
                  key={item.num}
                  style={{
                    borderLeft: "0.5px solid var(--color-border)",
                    paddingLeft: "var(--space-md)",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--color-fg-subtle)",
                      letterSpacing: "0.1em",
                      marginBottom: "var(--space-xs)",
                    }}
                    aria-hidden="true"
                  >
                    {item.num}
                  </p>
                  <h3
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "16px",
                      fontWeight: 500,
                      color: "#fff",
                      margin: 0,
                      marginBottom: "var(--space-xs)",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-sm)",
                      color: "var(--color-fg-muted)",
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: Key facts ─────────────────────────────── */}
        <section
          style={{
            padding: "var(--space-2xl) var(--space-lg)",
            borderTop: "0.5px solid var(--color-border)",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: "880px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-fg-muted)", letterSpacing: "0.05em", marginBottom: "var(--space-sm)" }}>
              // key facts
            </p>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "36px",
                fontWeight: 500,
                color: "#fff",
                margin: 0,
                marginBottom: "var(--space-lg)",
              }}
            >
              Since AI Hackathon 2026 — at a glance.
            </h2>

            <div style={{ borderTop: "0.5px solid var(--color-border)" }}>
              {keyFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex flex-col sm:flex-row sm:items-baseline"
                  style={{
                    padding: "var(--space-sm) 0",
                    borderBottom: "0.5px solid var(--color-border)",
                    gap: "var(--space-sm)",
                  }}
                >
                  <dt
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--color-fg-subtle)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      flexShrink: 0,
                      width: "160px",
                    }}
                  >
                    {fact.label}
                  </dt>
                  <dd
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-sm)",
                      color: "#fff",
                      margin: 0,
                    }}
                  >
                    {fact.value}
                  </dd>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: Venue ─────────────────────────────────── */}
        <section
          style={{
            padding: "var(--space-2xl) var(--space-lg)",
            borderTop: "0.5px solid var(--color-border)",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: "1200px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-fg-muted)", letterSpacing: "0.05em", marginBottom: "var(--space-sm)" }}>
              // venue
            </p>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "36px",
                fontWeight: 500,
                color: "#fff",
                margin: 0,
                marginBottom: "var(--space-lg)",
              }}
            >
              EduCity, Turku.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "var(--space-xl)", alignItems: "start" }}>
              <div>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-base)",
                    color: "var(--color-fg-muted)",
                    lineHeight: 1.7,
                    marginBottom: "var(--space-md)",
                  }}
                >
                  Since AI Hackathon 2026 takes place at EduCity — the modern campus of Turku
                  University of Applied Sciences (Turku AMK), Joukahaisenkatu 7, 20520 Turku,
                  Finland. State-of-the-art facilities for 1,000+ builders to collaborate, build,
                  and present.
                </p>
                <a
                  href="https://maps.google.com/?q=EduCity+Joukahaisenkatu+7+Turku"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-fg-muted)",
                    textDecoration: "none",
                  }}
                >
                  View on Google Maps ↗
                </a>
              </div>

              <div
                className="relative w-full overflow-hidden"
                style={{ height: "280px" }}
              >
                <Image
                  src="/assets/images/educity.jpg"
                  alt="EduCity building — venue for Since AI Hackathon 2026, Turku, Finland"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 6: Partners ──────────────────────────────── */}
        <section
          style={{
            padding: "var(--space-2xl) var(--space-lg)",
            borderTop: "0.5px solid var(--color-border)",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: "1200px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-fg-muted)", letterSpacing: "0.05em", marginBottom: "var(--space-sm)" }}>
              // challenge partners
            </p>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "36px",
                fontWeight: 500,
                color: "#fff",
                margin: 0,
                marginBottom: "var(--space-lg)",
              }}
            >
              Real problems from real companies.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "var(--space-xl)", marginBottom: "var(--space-xl)" }}>
              {[
                {
                  label: "// 2026 challenge partners",
                  partners: [
                    { name: "Google for Developers", url: "https://developers.google.com/" },
                    { name: "Bayer",    url: "https://www.bayer.com/" },
                    { name: "Sandvik",  url: "https://www.sandvik.com/" },
                    { name: "Kongsberg", url: "https://www.kongsberg.com/" },
                    { name: "Valmet",   url: "https://www.valmet.com/" },
                  ],
                },
                {
                  label: "// technology partners",
                  partners: [
                    { name: "ElevenLabs",     url: "https://elevenlabs.io/" },
                    { name: "Aiven",          url: "https://aiven.io/" },
                    { name: "Lovable",        url: "https://lovable.dev/" },
                    { name: "n8n",            url: "https://n8n.io/" },
                    { name: "Featherless.ai", url: "https://featherless.ai/" },
                  ],
                },
                {
                  label: "// capital & ecosystem",
                  partners: [
                    { name: "Antler",              url: "https://www.antler.co/" },
                    { name: "Inventure",           url: "https://www.inventure.vc/" },
                    { name: "Wave Ventures",       url: "https://www.wave.ventures/" },
                    { name: "University of Turku", url: "https://www.utu.fi" },
                    { name: "City of Turku",       url: "https://www.turku.fi" },
                  ],
                },
              ].map(({ label, partners }) => (
                <div key={label}>
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-xs)",
                      color: "var(--color-fg-subtle)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      marginBottom: "var(--space-md)",
                    }}
                  >
                    {label}
                  </p>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "14px", lineHeight: 2, color: "#fff" }}>
                    {partners.map((p, i) => (
                      <span key={p.name}>
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          style={{ color: "inherit", textDecoration: "none" }}
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

            <div style={{ borderTop: "0.5px solid var(--color-border)", paddingTop: "var(--space-lg)" }}>
              <Link
                href="/partners"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-fg-muted)",
                  textDecoration: "none",
                }}
                className="hover:text-white transition-colors"
              >
                Interested in setting a challenge or sponsoring? → sinceai.fi/partners
              </Link>
            </div>
          </div>
        </section>

        {/* ── SECTION 7: Past edition ──────────────────────────── */}
        <section
          style={{
            padding: "var(--space-2xl) var(--space-lg)",
            borderTop: "0.5px solid var(--color-border)",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: "880px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-fg-muted)", letterSpacing: "0.05em", marginBottom: "var(--space-sm)" }}>
              // previous editions
            </p>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "36px",
                fontWeight: 500,
                color: "#fff",
                margin: 0,
                marginBottom: "var(--space-lg)",
              }}
            >
              Since AI Hackathon 2025.
            </h2>

            <div style={{ borderLeft: "0.5px solid var(--color-border)", paddingLeft: "var(--space-md)" }}>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-fg-muted)",
                  marginBottom: "var(--space-sm)",
                  letterSpacing: "0.02em",
                }}
              >
                260 builders &nbsp;·&nbsp; 30+ projects shipped &nbsp;·&nbsp; 10+ partner companies &nbsp;·&nbsp; Nov 21–23, 2025 &nbsp;·&nbsp; EduCity, Turku
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-base)",
                  color: "var(--color-fg-muted)",
                  lineHeight: 1.7,
                  marginBottom: "var(--space-lg)",
                  maxWidth: "640px",
                }}
              >
                The inaugural Since AI Hackathon brought together 260 builders from across
                Finland and Europe. Teams tackled real industry challenges from Kongsberg,
                Sandvik, Valmet, and other partner companies, shipping 30+ AI prototypes
                in 72 hours.
              </p>

              <div className="flex flex-wrap" style={{ gap: "var(--space-lg)" }}>
                <Link
                  href="/projects"
                  className="hover:text-white transition-colors"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-fg-muted)", textDecoration: "none" }}
                >
                  View shipped projects →
                </Link>
                <Link
                  href="/events"
                  className="hover:text-white transition-colors"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--color-fg-muted)", textDecoration: "none" }}
                >
                  All events →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 8: MLH partnership ───────────────────────── */}
        <section
          style={{
            padding: "var(--space-2xl) var(--space-lg)",
            borderTop: "0.5px solid var(--color-border)",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: "880px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-fg-muted)", letterSpacing: "0.05em", marginBottom: "var(--space-sm)" }}>
              // mlh partnership
            </p>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "36px",
                fontWeight: 500,
                color: "#fff",
                margin: 0,
                marginBottom: "var(--space-lg)",
              }}
            >
              Official Major League Hacking partner event.
            </h2>

            <div
              style={{
                borderLeft: "0.5px solid var(--color-border)",
                paddingLeft: "var(--space-md)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-base)",
                  color: "var(--color-fg-muted)",
                  lineHeight: 1.7,
                  marginBottom: "var(--space-md)",
                  maxWidth: "640px",
                }}
              >
                Since AI Hackathon 2026 is an official Major League Hacking (MLH) Member
                Event for the 2026 season. MLH is the world&apos;s largest hackathon league,
                supporting hundreds of events annually across North America, Europe, and Asia.
              </p>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-base)",
                  color: "var(--color-fg-muted)",
                  lineHeight: 1.7,
                  marginBottom: "var(--space-lg)",
                  maxWidth: "640px",
                }}
              >
                As an official MLH partner event, participants gain access to the global MLH
                hacker community, MLH-sponsored prizes and API credits, and official recognition
                as part of the worldwide hackathon movement.
              </p>
              <a
                href="https://mlh.io/eu"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-fg-muted)",
                  textDecoration: "none",
                }}
              >
                Learn more about MLH ↗
              </a>
            </div>
          </div>
        </section>

        {/* ── SECTION 9: Registration ──────────────────────────── */}
        <section
          id="registration"
          style={{
            padding: "var(--space-3xl) var(--space-lg)",
            borderTop: "0.5px solid var(--color-border)",
            borderBottom: "0.5px solid var(--color-border)",
            scrollMarginTop: "80px",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: "880px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-fg-muted)", letterSpacing: "0.05em", marginBottom: "var(--space-sm)" }}>
              // registrations
            </p>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-headline-sm)",
                fontWeight: 500,
                lineHeight: 1.0,
                color: "#fff",
                margin: 0,
                marginBottom: "var(--space-md)",
              }}
            >
              Opening soon.
            </h2>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-base)",
                color: "var(--color-fg-muted)",
                lineHeight: 1.7,
                maxWidth: "560px",
                marginBottom: "var(--space-lg)",
              }}
            >
              Registration for Since AI Hackathon 2026 (November 6–8, Turku) opens soon. 
              Join our community channels to be notified the moment applications go live —
              and to connect with other builders before the event.
            </p>

            <div className="flex flex-col sm:flex-row" style={{ gap: "12px", marginBottom: "var(--space-xl)" }}>
              <a
                href="https://discord.com/invite/YkqJswRGSW"
                target="_blank"
                rel="noopener noreferrer"
                style={ctaPrimary}
              >
                Join Discord — get notified →
              </a>
              <a
                href="https://t.me/sinceaihq"
                target="_blank"
                rel="noopener noreferrer"
                className="hero-cta-secondary"
                style={ctaSecondary}
              >
                Join Telegram →
              </a>
            </div>

            <div style={{ borderTop: "0.5px solid var(--color-border)", paddingTop: "var(--space-lg)" }}>
              <p
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-fg-muted)",
                }}
              >
                Setting a challenge or sponsoring?{" "}
                <Link
                  href="/partners"
                  className="hover:text-white transition-colors"
                  style={{ color: "inherit", textDecoration: "underline" }}
                >
                  Partner with Since AI →
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* ── SECTION 9: FAQ ───────────────────────────────────── */}
        <section
          style={{
            padding: "var(--space-2xl) var(--space-lg)",
            borderTop: "0.5px solid var(--color-border)",
          }}
        >
          <div className="mx-auto" style={{ maxWidth: "880px" }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-fg-muted)", letterSpacing: "0.05em", marginBottom: "var(--space-sm)" }}>
              // faq
            </p>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "36px",
                fontWeight: 500,
                color: "#fff",
                margin: 0,
                marginBottom: "var(--space-xl)",
              }}
            >
              Frequently asked questions.
            </h2>

            <div style={{ borderTop: "0.5px solid var(--color-border)" }}>
              {hackathonFaqs.map((faq) => (
                <div
                  key={faq.q}
                  style={{
                    padding: "var(--space-lg) 0",
                    borderBottom: "0.5px solid var(--color-border)",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-base)",
                      fontWeight: 500,
                      color: "#fff",
                      margin: 0,
                      marginBottom: "var(--space-sm)",
                    }}
                  >
                    {faq.q}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-sm)",
                      color: "var(--color-fg-muted)",
                      lineHeight: 1.7,
                      margin: 0,
                    }}
                  >
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "var(--space-xl)" }}>
              <Link
                href="/faq"
                className="hover:text-white transition-colors"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-sm)",
                  color: "var(--color-fg-muted)",
                  textDecoration: "none",
                }}
              >
                More questions? See our full FAQ →
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </SmoothScroll>
  );
}
