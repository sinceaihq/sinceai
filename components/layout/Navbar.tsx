"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/brand/logo";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { ORG } from "@/lib/org";

const NAV_LINKS = [
  { label: "Hackathon", href: "/hackathon" },
  { label: "Builders", href: "/for-builders" },
  { label: "Partners", href: "/partners" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

/** Shown in the mobile menu under the main links. */
const MORE_LINKS = [
  { label: "Events", href: "/events" },
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blog" },
  { label: "Impact", href: "/impact" },
  { label: "FAQ", href: "/faq" },
] as const;

export const Navbar = () => {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  // The mobile menu is a modal: focus moves in, Escape closes it, the page behind does not scroll,
  // and focus returns to the menu button when it closes.
  useEffect(() => {
    if (!menuOpen) return;
    const opener = openerRef.current;
    closeRef.current?.focus();
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = previous;
      opener?.focus();
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <>
      <header
        className={[
          "fixed top-0 left-0 right-0 z-50 w-full px-6 py-4 md:py-5 transition-[background-color,backdrop-filter,border-color] duration-300 border-b",
          scrolled ? "bg-black/75 backdrop-blur-md border-white/10" : "bg-transparent border-transparent",
        ].join(" ")}
      >
        <div className="flex items-center justify-between mx-auto w-full max-w-6xl">
          <Link
            href="/"
            aria-label="Since AI — home"
            className="-ml-2 inline-flex min-h-11 items-center px-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <Logo />
          </Link>

          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={[
                  "text-[13px] font-normal no-underline transition-colors duration-300",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                  isActive(href) ? "text-white" : "text-neutral-400 hover:text-white",
                ].join(" ")}
              >
                {label}
              </Link>
            ))}
          </nav>

          <TrackedLink
            href="https://sinceai.app/sign-up"
            analyticsEvent="register_click"
            className="hidden md:inline-block text-[13px] font-bold text-black bg-white rounded-none px-4 py-2 border border-white whitespace-nowrap transition-colors duration-300 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Apply →<span className="sr-only"> (opens in a new tab)</span>
          </TrackedLink>

          <button
            ref={openerRef}
            type="button"
            className="md:hidden -mr-2 inline-flex h-11 w-11 items-center justify-center cursor-pointer text-neutral-300 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white bg-transparent border-none"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
              <line x1="0" y1="1" x2="20" y2="1" stroke="currentColor" strokeWidth="1.5" />
              <line x1="0" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.5" />
              <line x1="0" y1="13" x2="20" y2="13" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="menu-in fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-black px-6 pt-4 pb-10"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="Since AI — home" className="-ml-2 inline-flex min-h-11 items-center px-2" onClick={() => setMenuOpen(false)}>
              <Logo />
            </Link>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="-mr-2 inline-flex h-11 w-11 items-center justify-center cursor-pointer text-neutral-300 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white bg-transparent border-none"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <line x1="1" y1="1" x2="15" y2="15" stroke="currentColor" strokeWidth="1.5" />
                <line x1="15" y1="1" x2="1" y2="15" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>

          <nav className="mt-12 flex flex-col" aria-label="Mobile navigation">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(href) ? "page" : undefined}
                className={[
                  "border-b border-white/10 py-4 text-4xl font-bold tracking-tight leading-none no-underline",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-white",
                  isActive(href) ? "text-white" : "text-neutral-300",
                ].join(" ")}
              >
                {label}
              </Link>
            ))}
            <ul className="mt-8 grid grid-cols-2 gap-x-6">
              {MORE_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive(href) ? "page" : undefined}
                    className="flex min-h-11 items-center text-base text-neutral-400 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-auto flex flex-col gap-3 pt-10">
            <TrackedLink
              href="https://sinceai.app/sign-up"
              analyticsEvent="register_click"
              className="inline-flex min-h-12 items-center justify-center text-sm font-bold text-black bg-white rounded-none px-5 py-3 transition-colors hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              Apply for Hackathon 2026 →<span className="sr-only"> (opens in a new tab)</span>
            </TrackedLink>
            <TrackedLink
              href={ORG.social.discord}
              analyticsEvent="discord_join_click"
              className="inline-flex min-h-12 items-center justify-center text-sm font-semibold text-white border border-white/20 rounded-none px-5 py-3 transition-colors hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              Join the community on Discord<span className="sr-only"> (opens in a new tab)</span>
            </TrackedLink>
          </div>
        </div>
      )}
    </>
  );
};
