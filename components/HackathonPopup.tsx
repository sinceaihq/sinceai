"use client";

import Image from "next/image";
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


export function HackathonPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed && Date.now() - Number(dismissed) < 24 * 60 * 60 * 1000) return;
    function onScroll() {
      if (window.scrollY > 0) {
        setOpen(true);
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
        window.removeEventListener("scroll", onScroll);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function dismiss() {
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
        style={{ background: "#000", border: "2px solid #FF2D78" }}
      >
        <DialogTitle className="sr-only">Since AI Hackathon 2026</DialogTitle>

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
            color: "var(--color-fg-muted)",
            padding: "4px",
            lineHeight: 0,
            zIndex: 10,
          }}
        >
          <X size={16} />
        </DialogClose>

        <div style={{ padding: "clamp(24px, 4vw, 36px)" }}>
          {/* Logo + heading row */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <h2
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(20px, 4vw, 28px)",
                fontWeight: 700,
                lineHeight: 1.05,
                color: "#fff",
                margin: 0,
              }}
            >
              Since AI<br />Hackathon 2026.
            </h2>
            <Image
              src="/assets/logo/SINCE AI white.png"
              alt="Since AI"
              width={64}
              height={64}
              style={{ objectFit: "contain", flexShrink: 0 }}
            />
          </div>

          {/* Prize */}
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(20px, 4vw, 28px)",
              fontWeight: 700,
              color: "#FF2D78",
              margin: "0 0 20px",
              lineHeight: 1,
            }}
          >
            €50,000 prize pool
          </p>

          {/* Date */}
          <p
            style={{
              fontFamily: "var(--font-mono)",
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
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "#fff",
              lineHeight: 1.6,
              marginBottom: "20px",
            }}
          >
            Compete alongside 1,000+ AI engineers, researchers, and founders from across the globe. Ship something real in 72 hours.
          </p>

          {/* Body */}
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "var(--color-fg-muted)",
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
              display: "block",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              fontWeight: 500,
              padding: "12px 20px",
              border: "none",
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
