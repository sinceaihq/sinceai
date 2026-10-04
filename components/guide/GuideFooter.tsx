import Link from "next/link";
import { EVENT_2026, GUIDE_BASE_PATH, GUIDE_LINKS, IMAGE_CREDITS } from "@/lib/hackathon-2026";
import { PrintButton } from "./PrintButton";

export function GuideFooter() {
  return (
    <footer className="border-t border-white/10 px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-bold text-white">{EVENT_2026.name}&nbsp;· Field Guide</p>
          <p className="text-xs text-white/55">
            {EVENT_2026.dateLabel}&nbsp;· {EVENT_2026.city}
          </p>
          <p className="text-xs text-white/55">
            Updated {EVENT_2026.lastUpdatedLabel}&nbsp;· All times {EVENT_2026.timezoneLabel}
          </p>
          <p className="max-w-xl text-[11px] leading-relaxed text-white/55">
            Images: {IMAGE_CREDITS.map((c) => `${c.what} — ${c.credit}`).join("\u00a0· ")}.
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
        <div className="guide-no-print flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
          <Link href={GUIDE_BASE_PATH} className="inline-flex min-h-11 items-center text-neutral-400 hover:text-white">
            Field Guide home
          </Link>
          <Link href="/hackathon" prefetch={false} className="inline-flex min-h-11 items-center text-neutral-400 hover:text-white">
            Hackathon 2026
          </Link>
          <Link href="/code-of-conduct" prefetch={false} className="inline-flex min-h-11 items-center text-neutral-400 hover:text-white">
            Code of conduct
          </Link>
          <Link href="/privacy" prefetch={false} className="inline-flex min-h-11 items-center text-neutral-400 hover:text-white">
            Privacy
          </Link>
          <PrintButton />
        </div>
      </div>
    </footer>
  );
}
