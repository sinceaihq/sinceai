import Link from "next/link";
import { EVENT_2026, GUIDE_BASE_PATH, GUIDE_LINKS } from "@/lib/hackathon-2026";
import { PrintButton } from "./PrintButton";

export function GuideFooter() {
  return (
    <footer className="border-t border-white/10 px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-bold text-white">{EVENT_2026.name} · Field Guide</p>
          <p className="text-xs text-white/55">
            {EVENT_2026.dateLabel} · {EVENT_2026.city}
          </p>
          <p className="text-xs text-white/55">
            Updated {EVENT_2026.lastUpdatedLabel} · All times {EVENT_2026.timezoneLabel}
          </p>
          <p className="text-xs text-white/55">
            Questions:{" "}
            <a
              className="text-neutral-300 underline underline-offset-4 hover:text-white"
              href={`mailto:${GUIDE_LINKS.contactEmail}`}
            >
              {GUIDE_LINKS.contactEmail}
            </a>
          </p>
        </div>
        <div className="guide-no-print flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
          <Link href={GUIDE_BASE_PATH} className="text-neutral-400 hover:text-white">
            Field Guide home
          </Link>
          <Link href="/hackathon" className="text-neutral-400 hover:text-white">
            Hackathon 2026
          </Link>
          <Link href="/code-of-conduct" className="text-neutral-400 hover:text-white">
            Code of conduct
          </Link>
          <Link href="/privacy" className="text-neutral-400 hover:text-white">
            Privacy
          </Link>
          <PrintButton />
        </div>
      </div>
    </footer>
  );
}
