import Link from "next/link";
import {
  formatMoment,
  getScheduleItem,
  GUIDES,
  guidePath,
  titleFor,
} from "@/lib/hackathon-2026";

/** Hub: pick your role. Each card shows that role's first moment. */
export function GuideCards() {
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
                <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">{guide.forWho}</p>
                <h3 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight text-white">
                  {guide.name}
                </h3>
                <p className="mt-3 max-w-xl text-sm text-neutral-400 leading-relaxed">{guide.lede}</p>
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-4">
                <p className="text-sm">
                  <span className="block font-mono text-[11px] uppercase tracking-widest text-(--color-event)">
                    {formatMoment(first.start, first.approx)}
                  </span>
                  <span className="mt-1 block text-neutral-300">{titleFor(first, guide.audience)}</span>
                </p>
                <span
                  aria-hidden="true"
                  className="text-2xl text-neutral-500 transition-colors group-hover:text-white"
                >
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
