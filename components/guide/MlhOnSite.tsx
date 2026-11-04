import { MapPin } from "lucide-react";
import Link from "next/link";
import { MLH_HARDWARE_LINK, MLH_HREF, MLH_MAP_LINK, MLH_ON_SITE } from "@/lib/hackathon-2026";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;
const linkClass =
  "inline-flex min-h-11 items-center text-sm font-semibold text-white underline underline-offset-4 decoration-white/40 hover:decoration-white";

/**
 * "MLH at Since AI": hardware, giveaways, workshops and help in one place.
 * `compact` is the short version for other pages, linking to the full one.
 * Copy and links: lib/hackathon-2026/workshops.ts.
 */
export function MlhOnSite({ compact = false }: { compact?: boolean }) {
  const Heading = compact ? "h3" : "p";
  return (
    <div data-mlh-on-site className={compact ? "border border-white/10 p-5 md:p-6" : undefined}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <Heading className={compact ? "text-xl font-bold tracking-tight text-white" : "sr-only"}>{MLH_ON_SITE.title}</Heading>
          <p className={compact ? "mt-1 text-sm text-neutral-300" : "max-w-2xl text-base text-neutral-300 leading-relaxed"}>
            {MLH_ON_SITE.lede}
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-white">
          <MapPin aria-hidden="true" className="h-4 w-4 text-(--color-event)" />
          {MLH_ON_SITE.location}
        </p>
      </div>
      <dl className="mt-5 grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {MLH_ON_SITE.items.map((item) => (
          <div key={item.id} data-mlh-item={item.id} className="border-b border-r border-white/10 p-4">
            <dt className="font-mono text-[11px] uppercase tracking-widest text-(--color-event)">{item.label}</dt>
            <dd className="mt-2 text-sm text-neutral-300 leading-relaxed">
              {item.text}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 flex flex-wrap gap-x-6">
        {compact ? (
          <Link href={MLH_HREF} className={linkClass}>
            MLH, workshops and hardware
            <span aria-hidden="true" className="ml-1.5">
              →
            </span>
          </Link>
        ) : (
          <>
            <Link href={MLH_MAP_LINK.href} className={linkClass}>
              {MLH_MAP_LINK.label}
              <span aria-hidden="true" className="ml-1.5">
                →
              </span>
            </Link>
            <a href={MLH_HARDWARE_LINK.href} {...external} className={linkClass}>
              {MLH_HARDWARE_LINK.label}
              <span aria-hidden="true" className="ml-1.5">
                ↗
              </span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </>
        )}
      </p>
    </div>
  );
}
