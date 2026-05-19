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

const ctaPrimary: React.CSSProperties = {
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
};

const ctaSecondary: React.CSSProperties = {
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
};

export function HackathonPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setOpen(true), 3000);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) dismiss(); }}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="rounded-none border-0 p-0 gap-0 sm:max-w-xl"
        style={{ background: "#000", border: "0.5px solid var(--color-border)" }}
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
          }}
        >
          <X size={16} />
        </DialogClose>

        <div style={{ padding: "clamp(32px, 5vw, 48px)" }}>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--color-fg-muted)",
              letterSpacing: "0.05em",
              marginBottom: "var(--space-sm)",
            }}
          >
            {"// flagship event · 2026"}
          </p>

          <h2
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(28px, 5vw, 48px)",
              fontWeight: 500,
              lineHeight: 1.05,
              color: "#fff",
              margin: 0,
              marginBottom: "var(--space-md)",
            }}
          >
            Hackathon 2026.
          </h2>

          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              color: "var(--color-fg-muted)",
              letterSpacing: "0.01em",
              marginBottom: "var(--space-md)",
            }}
          >
            November 6–8, 2026 · Turku, Finland · 72 hours · 1,000+ builders · 50,000€ prize pool
          </p>

          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-base)",
              color: "var(--color-fg-muted)",
              lineHeight: 1.6,
              marginBottom: "var(--space-lg)",
            }}
          >
            A global execution-focused AI hackathon. Partner challenges from
            Google for Developers, ElevenLabs, Aiven, and more. Open to
            builders worldwide.
          </p>

          <div className="flex flex-col sm:flex-row" style={{ gap: "12px" }}>
            <Link href="/hackathon" style={ctaPrimary} onClick={dismiss}>
              Apply to build →
            </Link>
            <Link href="/partners" style={ctaSecondary} onClick={dismiss}>
              Partner with us →
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
