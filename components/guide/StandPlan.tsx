import { BIOCITY_STANDS, getStandPartner, OPEN_STAND_LABEL } from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";
import { CompanyLogo } from "./CompanyLogo";
import { VenueExplorer } from "./maps/VenueExplorer";

/**
 * BioCity visibility / tech partner stands, ranked by visibility. Assigned
 * stands show the partner; open positions keep the generic label.
 */
export function StandPlan() {
  const stands = [...BIOCITY_STANDS].sort((a, b) => a.rank - b.rank);
  const assigned = stands.filter((s) => s.partnerId).map((s) => s.id);
  return (
    <div className="space-y-10">
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stands.map((stand) => {
          const partner = getStandPartner(stand);
          return (
            <li
              key={stand.id}
              id={`stand-${stand.id}`}
              className={cn(
                "guide-target guide-avoid-break flex flex-col border p-5",
                partner ? "border-(--color-event)/40 bg-(--color-event)/[0.05]" : "border-white/10",
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-xs uppercase tracking-widest text-white/55">
                  Stand {stand.rank}
                  {stand.rank === 1 && " · most visible"}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-widest text-white/55">BioCity</span>
              </div>
              <div className="mt-4 flex h-10 items-center">
                {partner ? (
                  <span className="flex items-center gap-4">
                    {partner.logo && (
                      <span className="guide-no-print block h-8 w-32">
                        <CompanyLogo name={partner.name} logo={partner.logo} sizes="128px" decorative />
                      </span>
                    )}
                    <span
                      className={
                        partner.logo
                          ? "sr-only print:not-sr-only print:text-xl print:font-bold"
                          : "text-2xl font-bold tracking-tight text-white"
                      }
                    >
                      {partner.name}
                    </span>
                  </span>
                ) : (
                  <span className="text-base font-semibold text-neutral-300">{OPEN_STAND_LABEL}</span>
                )}
              </div>
              <p className="mt-4 font-semibold text-white">{stand.area}</p>
              <p className="text-sm text-neutral-300">{stand.location}</p>
              <p className="mt-2 text-sm text-white/55 leading-relaxed">{stand.visibility}</p>
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-white/55 leading-relaxed">
        Stand footprints are confirmed with the venue at setup so that exit routes stay clear. Open positions are marked
        “{OPEN_STAND_LABEL}”.
      </p>
      <VenueExplorer mapIds={["biocity-lobby"]} highlight={assigned} label="BioCity stand plan" />
    </div>
  );
}
