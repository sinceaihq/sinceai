"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

/**
 * Share this page: the native share sheet on phones, otherwise copy the link.
 */
export function ShareButton({ title, label = "Share this page" }: { title: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href.split("#")[0];
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Cancelled or unavailable — fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className="guide-no-print inline-flex min-h-11 items-center gap-2 border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:border-white cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Link2 aria-hidden="true" className="h-4 w-4" />}
      <span aria-live="polite">{copied ? "Link copied" : label}</span>
    </button>
  );
}
