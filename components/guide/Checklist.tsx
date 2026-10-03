"use client";

import { useEffect, useId, useRef } from "react";
import type { ChecklistGroup } from "@/lib/hackathon-2026";

/**
 * Checklist with ticks remembered on this device (localStorage, best-effort).
 * Uncontrolled inputs: it works and prints without JavaScript; JS only
 * restores and saves state.
 */
export function Checklist({ storageKey, groups }: { storageKey: string; groups: readonly ChecklistGroup[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const uid = useId();
  const key = `sinceai-guide-checklist:${storageKey}`;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    try {
      const saved: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
      root.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((input) => {
        input.checked = saved.includes(input.value);
      });
    } catch {
      /* storage unavailable — the list still works */
    }
  }, [key]);

  const save = () => {
    const root = ref.current;
    if (!root) return;
    const ticked = Array.from(root.querySelectorAll<HTMLInputElement>("input[type=checkbox]:checked")).map(
      (i) => i.value,
    );
    try {
      localStorage.setItem(key, JSON.stringify(ticked));
    } catch {
      /* ignore */
    }
  };

  const reset = () => {
    ref.current?.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((i) => (i.checked = false));
    save();
  };

  return (
    <div ref={ref}>
      <div className="grid grid-cols-1 gap-x-10 gap-y-10 md:grid-cols-2">
        {groups.map((group, gi) => (
          <fieldset key={group.title} className="guide-avoid-break min-w-0">
            <legend className="mb-3 text-lg font-bold tracking-tight text-white">{group.title}</legend>
            <ul className="border-t border-white/10">
              {group.items.map((item, ii) => {
                const id = `${uid}-${gi}-${ii}`;
                const value = `${gi}:${ii}:${item.slice(0, 24)}`;
                return (
                  <li key={item} className="border-b border-white/10">
                    <label
                      htmlFor={id}
                      className="flex min-h-11 cursor-pointer items-start gap-3 py-3 text-sm text-neutral-300 leading-relaxed has-[:checked]:text-neutral-500 has-[:checked]:line-through"
                    >
                      <span className="relative mt-0.5 h-4 w-4 shrink-0">
                        <input
                          id={id}
                          type="checkbox"
                          value={value}
                          onChange={save}
                          className="peer absolute inset-0 h-4 w-4 cursor-pointer appearance-none rounded-none border border-white/40 bg-transparent checked:border-(--color-event) checked:bg-(--color-event) focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white print:border-black"
                        />
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 16 16"
                          className="pointer-events-none absolute inset-0 hidden h-4 w-4 text-black peer-checked:block"
                        >
                          <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </span>
                      <span>{item}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
      <p className="guide-no-print mt-6 flex flex-wrap items-center gap-4 text-xs text-neutral-500">
        Ticks are saved on this device only.
        <button type="button" onClick={reset} className="cursor-pointer underline underline-offset-4 hover:text-white">
          Clear ticks
        </button>
      </p>
    </div>
  );
}
