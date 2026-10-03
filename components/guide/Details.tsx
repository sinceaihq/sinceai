import type { GuideDetail } from "@/lib/hackathon-2026";
import { StatusTag } from "./primitives";

/** Edge cases behind native disclosure — short page, details on demand. */
export function Details({ items }: { items: readonly GuideDetail[] }) {
  const visible = items.filter((item) => item.status !== "do_not_publish");
  return (
    <div className="border-t border-white/10">
      {visible.map((item) => (
        <details key={item.q} className="guide-details guide-avoid-break group border-b border-white/10">
          <summary className="flex min-h-14 items-center justify-between gap-4 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <span className="flex flex-wrap items-center gap-3 font-semibold text-white">
              {item.q}
              {item.status === "pending" && <StatusTag status="pending" />}
            </span>
            <svg
              aria-hidden="true"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              className="guide-chevron shrink-0 text-neutral-500 transition-transform duration-200"
            >
              <path d="M1.5 4l4.5 4.5L10.5 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </summary>
          <p className="max-w-3xl pb-5 text-sm text-neutral-400 leading-relaxed">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
