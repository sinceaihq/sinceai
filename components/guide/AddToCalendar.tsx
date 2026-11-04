import { CalendarPlus } from "lucide-react";
import {
  calendarFileName,
  calendarPath,
  CALENDAR_SUBSCRIBE_NOTE,
  calendarSubscribeUrl,
  calendarWebcalUrl,
  type Audience,
} from "@/lib/hackathon-2026";
import { CopyCode } from "./CopyCode";

const rowClass = "grid grid-cols-1 gap-2 border-t border-white/10 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4";
const actionClass =
  "inline-flex min-h-11 items-center justify-center border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/**
 * "Add weekend schedule": one obvious action that opens the options for the
 * common calendar apps. Honest about each: Apple Calendar subscribes from a
 * webcal link; Google and Outlook subscribe from the pasted link or import the
 * downloaded file — there is no one-click import for them. The file is the
 * standards-compliant .ics from lib/hackathon-2026/calendar.ts. No JavaScript
 * needed except for the Copy button.
 */
export function AddToCalendar({
  audience = "builders",
  label = "Add weekend schedule",
  sub = "Opening, workshops, deadlines and finals — all in one place.",
}: {
  audience?: Audience;
  label?: string;
  sub?: string;
}) {
  const file = calendarPath(audience);
  const fileName = calendarFileName(audience);
  const subscribeUrl = calendarSubscribeUrl(audience);
  const download = (
    <a href={file} download={fileName} className={actionClass}>
      Download .ics
    </a>
  );
  return (
    <details data-add-calendar className="guide-details guide-no-print group border border-white/10">
      <summary className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 hover:bg-white/[0.03]">
        <CalendarPlus aria-hidden="true" className="h-5 w-5 shrink-0 text-(--color-event)" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-white">{label}</span>
          <span className="block text-xs text-neutral-400">{sub}</span>
        </span>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 10 10" className="guide-chevron shrink-0 text-white/70 transition-transform">
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </summary>
      <div className="px-4 pb-4">
        <ul>
          <li data-calendar-app="apple" className={rowClass}>
            <p className="font-semibold text-white">Apple Calendar</p>
            <div>
              <a href={calendarWebcalUrl(audience)} className={actionClass}>
                Subscribe in Apple Calendar
              </a>
              <p className="mt-2 text-xs text-neutral-400">iPhone, iPad and Mac. Stays up to date.</p>
            </div>
          </li>
          <li data-calendar-app="google" className={rowClass}>
            <p className="font-semibold text-white">Google Calendar</p>
            <div className="text-xs text-neutral-400 leading-relaxed">
              <p>
                On a computer: <span className="text-neutral-200">Other calendars + → From URL</span>, paste the link below.
                Or download the file and use <span className="text-neutral-200">Settings → Import &amp; export</span>.
              </p>
              <div className="mt-2">{download}</div>
            </div>
          </li>
          <li data-calendar-app="outlook" className={rowClass}>
            <p className="font-semibold text-white">Outlook</p>
            <div className="text-xs text-neutral-400 leading-relaxed">
              <p>
                Open the downloaded file in Outlook — or in Outlook on the web,{" "}
                <span className="text-neutral-200">Add calendar → Subscribe from web</span> and paste the link below.
              </p>
              <div className="mt-2">{download}</div>
            </div>
          </li>
          <li data-calendar-app="other" className={rowClass}>
            <p className="font-semibold text-white">Other calendars</p>
            <div className="text-xs text-neutral-400 leading-relaxed">
              <p>Any app that opens .ics files.</p>
              <div className="mt-2">{download}</div>
            </div>
          </li>
        </ul>
        <div className="border-t border-white/10 pt-4">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-white/55">Calendar link</p>
          <CopyCode code={subscribeUrl} context="calendar link" long />
          <p className="mt-3 text-xs text-white/55 leading-relaxed">{CALENDAR_SUBSCRIBE_NOTE}</p>
        </div>
      </div>
    </details>
  );
}
