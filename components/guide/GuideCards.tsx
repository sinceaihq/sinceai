import Link from "next/link";
import { formatMoment, getScheduleItem, GUIDES, guidePath, titleFor } from "@/lib/hackathon-2026";

/** One line per role: the role, who it is for and its first moment — the hub's role chooser. */
function CompactGuideCards() {
  return (
    <ul className="border-t border-white/10">
      {GUIDES.map((guide) => {
        const first = getScheduleItem(guide.firstMomentId);
        return (
          <li key={guide.slug} className="border-b border-white/10">
            <Link
              href={guidePath(guide.audience)}
              className="group flex min-h-16 items-center justify-between gap-4 py-4 transition-colors hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="min-w-0">
                <span className="block text-lg font-bold tracking-tight text-white md:text-xl">{guide.name}</span>
                <span className="mt-0.5 block text-sm text-neutral-400">{guide.forWho}</span>
              </span>
              <span className="flex shrink-0 items-center gap-4">
                <span className="hidden text-right text-sm sm:block">
                  <span className="block font-mono text-[11px] uppercase tracking-widest text-(--color-event)">
                    {formatMoment(first.start, first.approx)}
                  </span>
                  <span className="mt-0.5 block text-neutral-300">{titleFor(first, guide.audience)}</span>
                </span>
                <span aria-hidden="true" className="text-2xl text-white/55 transition-colors group-hover:text-white">
                  →
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Hub: pick your role. Each card shows that role's first moment; `compact` is one line per role. */
export function GuideCards({ compact = false }: { compact?: boolean } = {}) {
  if (compact) return <CompactGuideCards />;
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {GUIDES.map((guide, i) => {
        const first = getScheduleItem(guide.firstMomentId);
        return (
          <li key={guide.slug} className={i === 0 ? "md:col-span-2" : undefined}>
            <Link
              href={guidePath(guide.audience)}
              className="group flex h-full flex-col justify-between gap-8 border border-white/10 p-6 transition-colors hover:border-white/30 hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:p-8"
            >
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-white/55">{guide.forWho}</p>
                <h3 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight text-white">{guide.name}</h3>
                <p className="mt-3 max-w-xl text-sm text-neutral-400 leading-relaxed">{guide.lede}</p>
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-4">
                <p className="text-sm">
                  <span className="block font-mono text-[11px] uppercase tracking-widest text-(--color-event)">
                    {formatMoment(first.start, first.approx)}
                  </span>
                  <span className="mt-1 block text-neutral-300">{titleFor(first, guide.audience)}</span>
                </p>
                <span aria-hidden="true" className="text-2xl text-white/55 transition-colors group-hover:text-white">
                  →
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
