import { TRANSFER_ROUTE } from "@/lib/hackathon-2026";
import { CampusSchematic } from "./CampusSchematic";
import { TextLink } from "./primitives";

/** EduCity → BioCity / Joki: the organiser route, with a map fallback. */
export function RouteCard() {
  return (
    <div className="grid grid-cols-1 gap-8 border border-white/10 p-5 md:grid-cols-[1fr_1.2fr] md:p-8">
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-white">EduCity → BioCity &amp; Joki</h3>
        <p className="mt-2 text-sm text-neutral-300">{TRANSFER_ROUTE.summary}</p>
        <p className="mt-1 text-xs text-neutral-500">{TRANSFER_ROUTE.approxOutdoorDistance}</p>
        <ol className="mt-6 space-y-3">
          {TRANSFER_ROUTE.steps.map((step, i) => (
            <li key={step} className="grid grid-cols-[2rem_1fr] text-sm text-neutral-400 leading-relaxed">
              <span aria-hidden="true" className="font-mono text-xs text-(--color-event) pt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="guide-no-print mt-6 flex flex-col gap-2">
          {TRANSFER_ROUTE.fallbacks.map((f) => (
            <TextLink key={f.href} href={f.href}>
              {f.label}
            </TextLink>
          ))}
        </div>
      </div>
      <CampusSchematic />
    </div>
  );
}
