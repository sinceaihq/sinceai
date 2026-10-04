"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky in-page navigation. Plain anchor links — works without JavaScript and
 * keeps every section one tap away while walking between buildings. With
 * JavaScript it also marks the section you are reading and keeps that chip in
 * view on narrow screens.
 */
export function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  // Scrollspy: the active section is the last one whose top has passed the
  // sticky bars.
  useEffect(() => {
    const ids = items.map((i) => i.id);
    let raf = 0;
    const update = () => {
      raf = 0;
      const offset = 140;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top - offset <= 0) current = id;
      }
      // At the very bottom, the last section is the one being read.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = ids[ids.length - 1];
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [items]);

  // Keep the active chip visible inside the horizontally scrolling bar.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    // Back above the first section: show the bar from its start again.
    if (!active) {
      if (list.scrollLeft > 0) list.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    const chip = list.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!chip) return;
    const { offsetLeft, offsetWidth } = chip;
    if (offsetLeft < list.scrollLeft || offsetLeft + offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: offsetLeft - 16, behavior: "smooth" });
    }
  }, [active]);

  // Fade the edges only where there is more to scroll.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const update = () =>
      setEdges({
        start: list.scrollLeft > 2,
        end: list.scrollLeft + list.clientWidth < list.scrollWidth - 2,
      });
    update();
    list.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      list.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const mask =
    edges.start && edges.end
      ? "linear-gradient(to right, transparent, #000 2rem, #000 calc(100% - 2rem), transparent)"
      : edges.end
        ? "linear-gradient(to right, #000 calc(100% - 2.5rem), transparent)"
        : edges.start
          ? "linear-gradient(to right, transparent, #000 2.5rem)"
          : undefined;

  return (
    <nav
      aria-label="On this page"
      className="guide-no-print sticky top-(--guide-header-h) z-30 border-y border-white/10 bg-black/90 backdrop-blur-md"
    >
      <ul
        ref={listRef}
        style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
        className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                data-section={item.id}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "relative flex min-h-11 items-center px-3 text-[11px] font-mono uppercase tracking-widest transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white",
                  isActive ? "text-white" : "text-neutral-400 hover:text-white",
                )}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3 bottom-1.5 h-px transition-opacity",
                    isActive ? "bg-(--color-event) opacity-100" : "opacity-0",
                  )}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
