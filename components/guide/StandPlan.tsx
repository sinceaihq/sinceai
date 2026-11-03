import { BIOCITY_STANDS, getStandPartner, keepDots } from "@/lib/hackathon-2026";
import { CompanyLogo } from "./CompanyLogo";
import { VenueExplorer } from "./maps/VenueExplorer";

/**
 * BioCity visibility / tech partner stands — seven, all in the partner corner of
 * the main lobby — ranked by visibility, each with the partner and its role. The
 * map rings the corner once (the stands are too close together for a ring each).
 */
export function StandPlan() {
  const stands = [...BIOCITY_STANDS].sort((a, b) => a.rank - b.rank);
  return (
    <div className="space-y-10">
      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stands.map((stand) => {
          const partner = getStandPartner(stand);
          return (
            <li
              key={stand.id}
              id={`stand-${stand.id}`}
              className="guide-target guide-avoid-break flex flex-col border border-(--color-event)/40 bg-(--color-event)/[0.05] p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-xs uppercase tracking-widest text-white/55">
                  Stand {stand.rank}
                  {stand.rank === 1 && "\u00a0· most visible"}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-widest text-white/55">BioCity</span>
              </div>
              <div className="mt-4 flex h-10 items-center">
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
              </div>
              {partner.role && (
                <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-(--color-event)">{partner.role}</p>
              )}
              <p className="mt-4 font-semibold text-white">{keepDots(stand.area)}</p>
              <p className="text-sm text-neutral-300">{stand.location}</p>
              <p className="mt-2 text-sm text-white/55 leading-relaxed">{stand.visibility}</p>
              {partner.note && <p className="mt-2 text-sm text-white/55 leading-relaxed">{partner.note}</p>}
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-white/55 leading-relaxed">
        All seven stands are together in the partner corner at the south-east end of BioCity&rsquo;s main lobby, by the
        passage to Joki: a row of five facing the walkway, one facing the build hall and one behind it facing the walkway
        to Joki. Those in the row and behind Solita are planned at about 1.6 × 1.0 m. The layout is provisional until the venue approves it, and footprints are confirmed at setup so that
        walkways, the side door and exit routes stay clear.
      </p>
      <VenueExplorer mapIds={["biocity-lobby"]} highlight={["bio-partner-corner"]} label="BioCity stand plan" />
    </div>
  );
}
