import Link from "next/link";
import { ORG } from "@/lib/org";
import { TrackedDiscordLink } from "@/components/analytics/TrackedDiscordLink";

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
  { name: "Discord",   href: ORG.social.discord },
  { name: "LinkedIn",  href: ORG.social.linkedin },
  { name: "X",         href: ORG.social.x },
  { name: "GitHub",    href: ORG.social.github },
  { name: "Instagram", href: ORG.social.instagram },
  { name: "YouTube",   href: ORG.social.youtube },
  { name: "Telegram",  href: ORG.social.telegram },
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

export const Footer: React.FC<FooterProps> = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto max-w-6xl py-24 px-6">

        {/* ── Top row: wordmark + tagline + social ──────────────── */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 mb-24">
          <div className="max-w-[360px]">
            <p className="text-[15px] font-medium text-white mb-2">
              Since AI
            </p>
            <p className="text-sm text-neutral-400 leading-relaxed mb-4">
              A global execution-focused AI innovation ecosystem.
              <br />
              Turku-based, globally connected.
            </p>
            <p className="text-sm text-white font-medium mb-4">
              Since AI is a registered nonprofit association (ry) in Finland.
            </p>
            <a
              href={`mailto:${ORG.contact.infoEmail}`}
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              {ORG.contact.infoEmail}
            </a>
          </div>

          {/* ── Social links ─────────────────────────────────── */}
          <div className="max-w-[320px]">
            <span className="text-xs font-mono uppercase tracking-widest text-neutral-500 block mb-4">
              {"// community"}
            </span>
            <div className="flex flex-wrap gap-x-6">
              {SOCIAL_LINKS.map((s) =>
                s.name === "Discord" ? (
                  <TrackedDiscordLink
                    key={s.name}
                    href={s.href}
                    analyticsEvent="discord_join_click"
                    className="text-sm text-neutral-400 hover:text-white transition-colors leading-loose focus-visible:outline focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap"
                  >
                    {s.name} ↗
                  </TrackedDiscordLink>
                ) : (
                  <a
                    key={s.name}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-400 hover:text-white transition-colors leading-loose focus-visible:outline focus-visible:outline-2 focus-visible:outline-white whitespace-nowrap"
                  >
                    {s.name} ↗
                  </a>
                )
              )}
            </div>
          </div>
        </div>

        {/* ── Navigation columns ──────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-16 pt-16 border-t border-white/10 mb-16">
          {NAV_COLUMNS.map((col) => (
            <nav key={col.label} aria-label={col.label}>
              <span className="text-xs font-mono uppercase tracking-widest text-neutral-500 block mb-6">
                {col.label}
              </span>
              {col.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-neutral-400 hover:text-white transition-colors leading-loose block focus-visible:outline focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                >
                  {link.name}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        {/* ── Bottom bar ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-10 border-t border-white/10 gap-4">
          <p className="text-xs text-neutral-500 leading-relaxed">
            {ORG.legalName} is a registered Finnish nonprofit association · Business ID {ORG.businessId} · Haukilahdenkatu 1 A 89, 02200 Espoo, Finland
            <br />
            © {year} Since AI. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-6">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs text-neutral-500 hover:text-white transition-colors whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
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
