"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

/**
 * Prints the page. Closed <details> hide their content in print, so they are
 * opened for printing and restored afterwards.
 */
export function PrintButton({ label = "Print this guide" }: { label?: string }) {
  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];
    const before = () => {
      opened = Array.from(
        document.querySelectorAll<HTMLDetailsElement>(".guide-root details:not([open])"),
      ).filter((d) => !d.closest(".guide-no-print"));
      opened.forEach((d) => (d.open = true));
    };
    const after = () => {
      opened.forEach((d) => (d.open = false));
      opened = [];
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center gap-2 border border-white/20 px-4 text-xs text-white transition-colors hover:border-white cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <Printer aria-hidden="true" className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
