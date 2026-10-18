"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/gtag";
import { GUIDE_BASE_PATH } from "@/lib/hackathon-2026/route";

const STORAGE_KEY = "hackathon2026_popup_v1";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
/** Show once the visitor has read this share of the page — or after a while on it. */
const SCROLL_SHARE = 0.35;
const IDLE_MS = 25_000;

function snoozed(): boolean {
  try {
    const at = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* private mode: it simply may show again */
  }
}

/**
 * The Hackathon 2026 announcement: a small card at the edge of the screen,
 * never a modal. It appears only after the visitor has engaged with the page
 * (scrolled a third of it, or stayed a while), never blocks scrolling or
 * steals focus, closes with Escape, and stays away for a week once closed —
 * no intrusive interstitial on arrival (Google's page-experience guidance),
 * and never the page's largest paint.
 */
export function HackathonPopup() {
  const pathname = usePathname() ?? "";
  const titleId = useId();
  const [open, setOpen] = useState(false);
  // The Field Guide is an operational tool, and /hackathon has its own Apply bar.
  const suppressed = pathname.startsWith(GUIDE_BASE_PATH) || pathname === "/hackathon";

  const dismiss = useCallback(() => {
    snooze();
    setOpen(false);
  }, []);

  useEffect(() => {
    if (suppressed || snoozed()) return;
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setOpen(true);
      cleanup();
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= SCROLL_SHARE) show();
    };
    const timer = window.setTimeout(show, IDLE_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    function cleanup() {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    }
    return cleanup;
  }, [suppressed]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open || suppressed) return null;

  return (
    <aside
      aria-labelledby={titleId}
      className="announce-in fixed inset-x-4 bottom-4 z-50 border border-(--color-brand)/60 bg-black p-5 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[22rem]"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close the Since AI Hackathon 2026 announcement"
        className="absolute top-2 right-2 inline-flex h-11 w-11 items-center justify-center text-neutral-400 transition-colors hover:text-white cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <X size={18} strokeWidth={2} aria-hidden="true" />
      </button>
      <p className="text-xs font-mono uppercase tracking-widest text-(--color-brand)">6–8 Nov 2026 · Turku, Finland</p>
      <h2 id={titleId} className="mt-2 pr-8 text-xl font-bold tracking-tight text-white">
        Since AI Hackathon 2026
      </h2>
      <p className="mt-2 text-sm text-neutral-300 leading-relaxed">
        1,000+ builders, real company challenges and a €50,000 prize pool — with 8 weeks of production support for the
        strongest teams.
      </p>
      <div className="mt-4 flex gap-3">
        <Link
          href="https://sinceai.app/sign-up"
          onClick={() => {
            trackEvent(ANALYTICS_EVENTS.REGISTER_CLICK);
            dismiss();
          }}
          className="inline-flex flex-1 items-center justify-center bg-white text-black rounded-none px-4 py-2.5 text-sm font-semibold hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          Apply →
        </Link>
        <Link
          href="/hackathon"
          onClick={snooze}
          className="inline-flex flex-1 items-center justify-center border border-white/20 text-white rounded-none px-4 py-2.5 text-sm font-semibold hover:border-white transition-colors cursor-pointer"
        >
          Learn more
        </Link>
      </div>
    </aside>
  );
}
