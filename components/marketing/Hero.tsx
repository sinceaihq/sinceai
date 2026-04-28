import Link from "next/link";
import { PartnerMarquee } from "./PartnerMarquee";

export function Hero() {
  return (
    <section className="relative flex flex-col min-h-[85vh] md:min-h-screen bg-black">
      <div
        className="mx-auto w-full"
        style={{ maxWidth: "1200px", padding: "150px var(--space-lg) 0" }}
      >
          {/* H1 */}
          <h1
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-headline-lg)",
              fontWeight: 500,
              lineHeight: 1.0,
              letterSpacing: "-0.02em",
              maxWidth: "900px",
              margin: 0,
              color: "#fff",
            }}
          >
            Global execution-focused AI innovation ecosystem.
          </h1>

          {/* Tagline */}
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-sm)",
              color: "var(--color-fg-muted)",
              marginTop: "var(--space-md)",
              letterSpacing: "0.01em",
              lineHeight: 1.6,
            }}
          >
            where frontier AI becomes shipped products.
          </p>

          {/* Hackathon teaser */}
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-sm)",
              color: "var(--color-fg-muted)",
              marginTop: "var(--space-lg)",
              marginBottom: "var(--space-sm)",
              letterSpacing: "0.01em",
            }}
          >
            <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", marginRight: "8px", verticalAlign: "middle" }} />
            Since AI Hackathon 2026 &thinsp;·&thinsp; €50,000 cash prize pool &thinsp;·&thinsp; Registration open
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row"
            style={{ gap: "12px" }}
          >
            {/* Primary — hackathon */}
            <Link
              href="/hackathon"
              style={{
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
              }}
            >
              Learn more →
            </Link>
            {/* Secondary — outlined */}
            <Link
              href="/partners"
              className="hero-cta-secondary"
              style={{
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
              }}
            >
              Partner with Since AI →
            </Link>

          </div>
      </div>

      <div className="flex-1" />

      {/* ── Partner marquee — bottom-docked ─────────────────── */}
      <div className="h-10 shrink-0" />
      <PartnerMarquee />
    </section>
  );
}
