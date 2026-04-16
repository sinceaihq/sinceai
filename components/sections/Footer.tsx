import Link from "next/link";
import { ORG } from "@/lib/org";

interface FooterProps {
  discordUrl?: string;
}

const NAV_COLUMNS = [
  {
    label: "// build",
    links: [
      { name: "Hackathon 2026",   href: "/hackathon" },
      { name: "Events",           href: "/events" },
      { name: "Projects",         href: "/projects" },
      { name: "For Builders",     href: "/for-builders" },
      { name: "Blog",             href: "/blog" },
      { name: "Resources",        href: "/resources" },
    ],
  },
  {
    label: "// organization",
    links: [
      { name: "About",            href: "/about" },
      { name: "Partners",         href: "/partners" },
      { name: "Press",            href: "/press" },
      { name: "Impact & Numbers", href: "/impact" },
      { name: "FAQ",              href: "/faq" },
      { name: "Contact",          href: "/contact" },
    ],
  },
  {
    label: "// explore",
    links: [
      { name: "European AI Ecosystem",  href: "/europe-ai" },
      { name: "AI Hackathons",          href: "/ai-hackathons" },
      { name: "Finland AI",             href: "/finland-ai" },
      { name: "Turku",                  href: "/turku" },
      { name: "European AI Hub",        href: "/european-ai" },
      { name: "Production Support",     href: "/production-support" },
      { name: "Research to Market",     href: "/research-to-market" },
    ],
  },
];

const SOCIAL_LINKS = [
  { name: "Discord",   href: "https://discord.com/invite/YkqJswRGSW" },
  { name: "LinkedIn",  href: ORG.social.linkedin },
  { name: "X",         href: ORG.social.x },
  { name: "GitHub",    href: ORG.social.github },
  { name: "Instagram", href: ORG.social.instagram },
  { name: "YouTube",   href: ORG.social.youtube },
  { name: "Telegram",  href: ORG.social.telegram },
  { name: "Medium",    href: ORG.social.medium },
  { name: "Substack",  href: ORG.social.substack },
  { name: "Reddit",    href: ORG.social.reddit },
  { name: "TikTok",    href: ORG.social.tiktok },
  { name: "Facebook",  href: ORG.social.facebook },
];

const LEGAL_LINKS = [
  { name: "Code of Conduct", href: "/code-of-conduct" },
  { name: "Privacy Policy",  href: "/privacy" },
  { name: "Terms",           href: "/terms" },
];

const linkStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-sm)",
  color: "var(--color-fg-muted)",
  textDecoration: "none",
  lineHeight: 2,
  display: "block",
  transition: "color 0.15s",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "var(--text-xs)",
  color: "var(--color-fg-subtle)",
  letterSpacing: "0.05em",
  marginBottom: "var(--space-md)",
  display: "block",
};

export const Footer: React.FC<FooterProps> = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        borderTop: "0.5px solid var(--color-border)",
        background: "#000",
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: "1200px",
          padding: "var(--space-2xl) var(--space-lg)",
        }}
      >
        {/* ── Top row: wordmark + tagline + email ─────────────── */}
        <div
          className="flex flex-col md:flex-row md:items-start md:justify-between"
          style={{ marginBottom: "var(--space-2xl)", gap: "var(--space-lg)" }}
        >
          <div style={{ maxWidth: "360px" }}>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "15px",
                fontWeight: 500,
                color: "#fff",
                marginBottom: "var(--space-xs)",
              }}
            >
              Since AI
            </p>
            <p
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-sm)",
                color: "var(--color-fg-muted)",
                lineHeight: 1.6,
                marginBottom: "var(--space-sm)",
              }}
            >
              Europe&apos;s execution-focused AI innovation ecosystem.
              <br />
              Turku-based, globally connected.
            </p>
            <a
              href={`mailto:${ORG.contact.infoEmail}`}
              className="hover:text-white transition-colors"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-sm)",
                color: "var(--color-fg-muted)",
                textDecoration: "none",
              }}
            >
              {ORG.contact.infoEmail}
            </a>
          </div>

          {/* ── Social links — text-based, right-aligned ──────── */}
          <div style={{ maxWidth: "320px" }}>
            <span style={labelStyle}>// community</span>
            <div className="flex flex-wrap" style={{ gap: "0 var(--space-md)", rowGap: "0" }}>
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-sm)",
                    color: "var(--color-fg-muted)",
                    textDecoration: "none",
                    lineHeight: 2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.name} ↗
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── Navigation columns ──────────────────────────────── */}
        <div
          className="grid grid-cols-2 md:grid-cols-3"
          style={{
            gap: "var(--space-xl)",
            paddingTop: "var(--space-xl)",
            borderTop: "0.5px solid var(--color-border)",
            marginBottom: "var(--space-xl)",
          }}
        >
          {NAV_COLUMNS.map((col) => (
            <nav key={col.label} aria-label={col.label}>
              <span style={labelStyle}>{col.label}</span>
              {col.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  style={linkStyle}
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        {/* ── Bottom bar ──────────────────────────────────────── */}
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
          style={{
            paddingTop: "var(--space-lg)",
            borderTop: "0.5px solid var(--color-border)",
            gap: "var(--space-sm)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--color-fg-subtle)",
              lineHeight: 1.8,
            }}
          >
            {ORG.legalName} · Business ID {ORG.businessId} · Vähä Hämeenkatu 1, Turku,
            Finland
            <br />
            © {year} Since AI. All rights reserved.
          </p>

          {/* Legal links */}
          <div className="flex flex-wrap items-center" style={{ gap: "var(--space-md)" }}>
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--color-fg-subtle)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {l.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
