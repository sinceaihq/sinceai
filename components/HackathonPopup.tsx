"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "hackathon2026_popup_v1";

// Module-level so the same reference is used for add and remove
let _preventScroll: ((e: Event) => void) | null = null;

let _scrollY = 0;

function lockScroll() {
  if (_preventScroll) return;
  _preventScroll = (e: Event) => e.preventDefault();
  window.addEventListener("wheel", _preventScroll, { passive: false, capture: true });
  window.addEventListener("touchmove", _preventScroll, { passive: false, capture: true });
  _scrollY = window.scrollY;
  // Use setProperty with 'important' to beat Radix's injected
  // "body[data-scroll-locked] { position: relative !important }"
  document.body.style.setProperty("position", "fixed", "important");
  document.body.style.setProperty("top", `-${_scrollY}px`, "important");
  document.body.style.setProperty("width", "100%", "important");
  document.body.style.setProperty("overflow", "hidden", "important");
  document.documentElement.style.setProperty("overflow", "hidden", "important");
  document.documentElement.style.setProperty("scroll-behavior", "auto", "important");
}

function unlockScroll() {
  if (!_preventScroll) return;
  window.removeEventListener("wheel", _preventScroll, { capture: true });
  window.removeEventListener("touchmove", _preventScroll, { capture: true });
  _preventScroll = null;
  document.body.style.removeProperty("position");
  document.body.style.removeProperty("top");
  document.body.style.removeProperty("width");
  document.body.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("scroll-behavior");
  window.scrollTo(0, _scrollY);
}

export function HackathonPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed && Date.now() - Number(dismissed) < 24 * 60 * 60 * 1000) return;
    const t = setTimeout(() => {
      lockScroll();
      setOpen(true);
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    unlockScroll();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="rounded-none border-0 p-0 gap-0 sm:max-w-md"
        style={{ background: "#000", border: "2px solid var(--color-brand)" }}
      >
        <DialogTitle className="sr-only">Since AI Innovation Event 2026</DialogTitle>

        <DialogClose
          onClick={dismiss}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#fff",
            padding: "4px",
            lineHeight: 0,
            zIndex: 10,
          }}
        >
          <X size={20} strokeWidth={2.5} />
        </DialogClose>

        <div style={{ padding: "clamp(24px, 4vw, 36px)", position: "relative", overflow: "hidden" }}>
          {/* Ghost logo watermark */}
          <img
            src="/assets/logo/sinceai-white.png"
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "85%",
              opacity: 0.10,
              pointerEvents: "none",
              userSelect: "none",
              zIndex: 0,
            }}
          />
          {/* Logo + heading row */}
          <div style={{ marginBottom: "20px" }}>
            <h2
              style={{
                fontSize: "clamp(20px, 4vw, 28px)",
                fontWeight: 700,
                lineHeight: 1.05,
                color: "#fff",
                margin: 0,
              }}
            >
              Since AI<br />Innovation Event 2026.
            </h2>
          </div>

          {/* Prize */}
          <p
            style={{
              fontSize: "clamp(20px, 4vw, 28px)",
              fontWeight: 700,
              color: "var(--color-brand)",
              margin: "0 0 20px",
              lineHeight: 1,
            }}
          >
            €50,000 prize pool
          </p>

          {/* Date */}
          <p
            style={{
              fontSize: "13px",
              color: "#fff",
              letterSpacing: "0.01em",
              marginBottom: "20px",
            }}
          >
            November 6–8, 2026 · Turku, Finland
          </p>

          {/* Tagline */}
          <p
            style={{
              fontSize: "13px",
              color: "#fff",
              lineHeight: 1.6,
              marginBottom: "20px",
            }}
          >
            Join 1,000+ AI engineers, researchers, and founders from across the globe. Build something real in 72 hours, with pathway to production support.
          </p>

          {/* Body */}
          <p
            className="text-neutral-400"
            style={{
              fontSize: "13px",
              lineHeight: 1.6,
              marginBottom: "20px",
            }}
          >
Backed by Google for Developers, AMD, ElevenLabs, Aiven, LUMI supercomputer, and more. Open to builders worldwide.
          </p>

          {/* CTA */}
          <Link
            href="https://sinceai.app/events/since-ai-hackathon-2026"
            onClick={dismiss}
            className="popup-apply-btn"
            style={{
              position: "relative",
              zIndex: 1,
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              padding: "12px 20px",
              textDecoration: "none",
              textAlign: "center",
              margin: 0,
            }}
          >
            Apply →
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
