import Link from "next/link";
import { getTour3D, tourFacts, type Tour3D } from "@/lib/hackathon-2026/twin";
import { twinHref } from "./twin/TwinTeaser";

/**
 * Walking routes as cards: who it is for, where it goes, how far — each opens
 * the 3D campus with that route ready to play.
 */
export function RouteLinks({ title, ids }: { title: string; ids: readonly string[] }) {
  const tours = ids.map((id) => getTour3D(id)).filter((t): t is Tour3D => !!t);
  if (!tours.length) return null;
  return (
    <div>
      <h3 className="font-mono text-[11px] uppercase tracking-widest text-white/55">{title}</h3>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tours.map((t) => (
          <li key={t.id}>
            <Link
              href={twinHref({ tour: t.id })}
              className="group flex h-full cursor-pointer flex-col gap-1 border border-white/10 p-4 transition-colors hover:border-white/20 hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="font-mono text-[11px] uppercase tracking-widest text-(--color-event)">{t.audience}</span>
              <span className="font-semibold text-white">{t.label}</span>
              <span className="text-sm text-neutral-400 leading-relaxed">{t.summary}</span>
              <span className="mt-auto pt-2 text-xs text-white/55">
                <span className="tabular-nums">{tourFacts(t)}</span> ·{" "}
                <span className="text-white underline-offset-4 group-hover:underline">Walk it in 3D</span>
                <span aria-hidden="true"> →</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
