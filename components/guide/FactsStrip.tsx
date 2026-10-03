import { cn } from "@/lib/utils";

export interface Fact {
  label: string;
  value: string;
  sub?: string;
  /** Emphasise (deadline / critical moment). */
  strong?: boolean;
}

/** "At a glance" — the facts a person must not miss, as a scannable grid. */
export function FactsStrip({ facts, label = "At a glance" }: { facts: Fact[]; label?: string }) {
  return (
    <dl
      aria-label={label}
      className={cn(
        "grid grid-cols-2 border-l border-t border-white/10",
        facts.length % 3 === 0 ? "md:grid-cols-3" : "md:grid-cols-4",
        facts.length === 6 && "lg:grid-cols-6",
      )}
    >
      {facts.map((fact) => (
        <div
          key={fact.label}
          className={cn(
            "guide-avoid-break flex flex-col justify-between gap-2 border-b border-r border-white/10 p-4",
            fact.strong && "bg-(--color-event)/[0.07]",
          )}
        >
          <dt className="text-[11px] font-mono uppercase tracking-widest text-white/55">{fact.label}</dt>
          <dd>
            <span className={cn("block font-bold text-white leading-snug", fact.strong ? "text-lg" : "text-base")}>
              {fact.value}
            </span>
            {fact.sub && <span className="mt-1 block text-xs text-neutral-400">{fact.sub}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
