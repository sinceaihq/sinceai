import { cn } from "@/lib/utils";

/** "Check in → Team → Select → Briefing → Build" — the first view of a role. */
export function CriticalPath({
  steps,
  label,
}: {
  steps: readonly { label: string; time: string; text: string }[];
  label: string;
}) {
  return (
    <ol
      aria-label={label}
      className={cn(
        "grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2",
        steps.length >= 6 ? "lg:grid-cols-6" : steps.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4",
      )}
    >
      {steps.map((step, i) => (
        <li
          key={step.label}
          className="guide-avoid-break relative flex gap-4 border-b border-r border-white/10 p-4 sm:flex-col sm:gap-3 sm:p-5"
        >
          <span aria-hidden="true" className="font-mono text-xs text-neutral-500">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <p className="text-lg font-bold tracking-tight text-white">{step.label}</p>
            <p className="mt-1 font-mono text-xs uppercase tracking-widest text-(--color-event)">
              {step.time}
            </p>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
