import Link from "next/link";
import { PartnerMarquee } from "./PartnerMarquee";

export function Hero() {
  return (
    <section className="relative flex flex-col bg-black" style={{ paddingLeft: "var(--space-lg)", paddingRight: "var(--space-lg)" }}>
      <div
        className="mx-auto w-full pt-20 md:pt-[clamp(100px,15vh,150px)]"
        style={{ maxWidth: "1200px" }}
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
            {/* Discord */}
            <a
              href="https://discord.com/invite/YkqJswRGSW"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Discord
            </a>

          </div>
      </div>

      {/* ── Partner marquee — bottom-docked ─────────────────── */}
      <div className="h-16 shrink-0" />
      <PartnerMarquee />
    </section>
  );
}
