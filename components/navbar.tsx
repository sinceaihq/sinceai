"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./logo";

const DISCORD_URL = "https://discord.com/invite/YkqJswRGSW";

const NAV_LINKS = [
  { label: "Hackathon", href: "/hackathon" },
  { label: "Partners",  href: "/partners" },
  { label: "Builders",  href: "/for-builders" },
  { label: "Contact",   href: "/contact" },
] as const;

export const Navbar = () => {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close overlay on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <>
      {/* ── Desktop / sticky header ─────────────────────────── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 w-full"
        style={{
          padding: "var(--space-md) var(--space-lg)",
          background: scrolled ? "rgba(0,0,0,0.75)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          transition: "background 0.2s, backdrop-filter 0.2s, -webkit-backdrop-filter 0.2s",
        }}
      >
        <div
          className="flex items-center justify-between mx-auto w-full"
          style={{ maxWidth: "1200px" }}
        >
          {/* Logo */}
          <Link href="/" aria-label="Since AI — home">
            <Logo />
          </Link>

          {/* Desktop nav links */}
          <nav
            className="hidden md:flex items-center"
            style={{ gap: "2rem" }}
            aria-label="Main navigation"
          >
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={[
                  "text-[13px] font-normal no-underline transition-colors duration-150",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  isActive(href)
                    ? "text-white"
                    : "text-[var(--color-fg-muted)] hover:text-white",
                ].join(" ")}
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-block text-[13px] font-medium no-underline text-black bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{
              fontFamily: "var(--font-mono)",
              padding: "8px 16px",
              borderRadius: 0,
              border: "0.5px solid #fff",
              whiteSpace: "nowrap",
            }}
          >
            Join →
          </a>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-[var(--color-fg-muted)] hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
              <line x1="0" y1="1"  x2="18" y2="1"  stroke="currentColor" strokeWidth="1.5" />
              <line x1="0" y1="7"  x2="18" y2="7"  stroke="currentColor" strokeWidth="1.5" />
              <line x1="0" y1="13" x2="18" y2="13" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Mobile fullscreen overlay ────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black flex flex-col"
          style={{ padding: "var(--space-md) var(--space-lg)" }}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Top row */}
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-3xl)" }}>
            <Logo />
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="text-[var(--color-fg-muted)] hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <line x1="1" y1="1" x2="15" y2="15" stroke="currentColor" strokeWidth="1.5" />
                <line x1="15" y1="1" x2="1"  y2="15" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>

          {/* Links — large monospace */}
          <nav
            className="flex flex-col"
            style={{ gap: "var(--space-lg)" }}
            aria-label="Mobile navigation"
          >
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(href) ? "page" : undefined}
                className={[
                  "no-underline font-medium leading-none",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
                  isActive(href) ? "text-white" : "text-[var(--color-fg-muted)]",
                ].join(" ")}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-headline-sm)",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* CTA — pinned to bottom */}
          <div className="mt-auto">
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[13px] font-medium no-underline text-black bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              style={{
                fontFamily: "var(--font-mono)",
                padding: "12px 20px",
                borderRadius: 0,
                border: "0.5px solid #fff",
              }}
            >
              Join →
            </a>
          </div>
        </div>
      )}
    </>
  );
};
