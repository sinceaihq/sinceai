import Link from "next/link";
import { PartnerMarquee } from "./PartnerMarquee";

const DISCORD_URL = "https://discord.com/invite/YkqJswRGSW";

export function Hero() {
  return (
    <section className="relative flex flex-col min-h-[85vh] md:min-h-screen bg-black pt-[100px]">
      {/* ── Vertically-centred content ─────────────────────── */}
      <div className="flex-1 flex items-center">
        <div
          className="mx-auto w-full px-6"
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
            Europe&apos;s execution-focused AI innovation ecosystem.
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

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row"
            style={{ marginTop: "var(--space-lg)", gap: "12px" }}
          >
            {/* Primary — inverted */}
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
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
              Join the builder network →
            </a>

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
      </div>

      {/* ── Partner marquee — bottom-docked ─────────────────── */}
      <PartnerMarquee />
    </section>
  );
}
