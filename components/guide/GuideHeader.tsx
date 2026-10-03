"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { GUIDE_BASE_PATH, GUIDES, guidePath } from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";

const NAV = [
  ...GUIDES.map((g) => ({ href: guidePath(g.audience), label: g.navLabel })),
  { href: `${GUIDE_BASE_PATH}/venue`, label: "Venue & 3D" },
];

/**
 * Field Guide header. Deliberately not the marketing navbar: no "Apply" CTA,
 * just the guides. The mobile menu is a native <details> so it also works
 * without JavaScript; JS only closes it after navigation.
 */
export function GuideHeader() {
  const pathname = usePathname();
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (menuRef.current) menuRef.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && menuRef.current?.open) {
        menuRef.current.open = false;
        menuRef.current.querySelector("summary")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <header className="guide-no-print sticky top-0 z-40 h-(--guide-header-h) border-b border-white/10 bg-black/85 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label="Since AI — home"
            className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/logo/sinceai-white.png" alt="" width={24} height={24} className="h-6 w-6" />
          </Link>
          <span aria-hidden="true" className="h-5 w-px bg-white/15" />
          <Link
            href={GUIDE_BASE_PATH}
            className="truncate text-[13px] font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            aria-current={pathname === GUIDE_BASE_PATH ? "page" : undefined}
          >
            Field Guide <span className="font-normal text-white/55">2026</span>
          </Link>
        </div>

        <nav aria-label="Field Guide" className="hidden lg:block">
          <ul className="flex items-center gap-6">
            {NAV.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={cn(
                    "text-[13px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white",
                    isActive(href) ? "text-white" : "text-neutral-400 hover:text-white",
                  )}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <details ref={menuRef} className="guide-details relative lg:hidden">
          <summary className="flex min-h-11 items-center gap-2 border border-white/20 px-4 text-[13px] text-white hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Guides
            <svg
              aria-hidden="true"
              width="10"
              height="10"
              viewBox="0 0 10 10"
              className="guide-chevron transition-transform"
            >
              <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </summary>
          <nav
            aria-label="Field Guide"
            className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(20rem,calc(100vw-3rem))] border border-white/15 bg-black p-2 shadow-none"
          >
            <ul>
              <li>
                <Link
                  href={GUIDE_BASE_PATH}
                  aria-current={pathname === GUIDE_BASE_PATH ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center px-3 text-sm",
                    pathname === GUIDE_BASE_PATH ? "text-white" : "text-neutral-400 hover:text-white",
                  )}
                >
                  Overview
                </Link>
              </li>
              {NAV.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center justify-between px-3 text-sm",
                      isActive(href) ? "text-white" : "text-neutral-400 hover:text-white",
                    )}
                  >
                    {label}
                    {isActive(href) && (
                      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-(--color-event)" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </details>
      </div>
    </header>
  );
}
