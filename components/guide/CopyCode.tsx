"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const noop = () => () => undefined;

/**
 * A booking / discount code that is easy to copy: the code is selectable text (works without
 * JavaScript); the Copy button appears once the page is interactive.
 */
export function CopyCode({
  code,
  context,
  long = false,
  kind = "code",
}: {
  code: string;
  context: string;
  /** A long value (a link): smaller type that wraps on a phone. */
  long?: boolean;
  /** What the value is, for screen readers: a booking code or a password. */
  kind?: "code" | "password";
}) {
  // True once hydrated (false on the server): the button only works with JavaScript.
  const ready = useSyncExternalStore(noop, () => true, () => false);
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // No clipboard access: select the code so it can be copied by hand.
      const el = codeRef.current;
      const sel = window.getSelection();
      if (el && sel) {
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  };

  return (
    <div className={long ? "flex items-stretch" : "flex flex-wrap items-stretch"}>
      <code
        ref={codeRef}
        className={
          long
            ? "flex min-h-11 min-w-0 flex-1 select-all items-center break-all border border-white/20 px-3 py-2 font-mono text-xs text-white"
            : "flex min-h-11 select-all items-center border border-white/20 px-3 font-mono text-base font-bold tracking-wider text-white"
        }
      >
        {code}
      </code>
      {ready && (
        <button
          type="button"
          onClick={copy}
          aria-label={long ? `Copy the ${context}` : `Copy the ${kind} ${code} for ${context}`}
          className="min-h-11 cursor-pointer border border-l-0 border-white/20 px-4 font-mono text-[11px] uppercase tracking-widest text-white/70 transition-colors hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      )}
      <span className="sr-only" aria-live="polite">
        {copied ? (long ? "Link copied" : `${kind === "password" ? "Password" : "Code"} ${code} copied`) : ""}
      </span>
    </div>
  );
}
