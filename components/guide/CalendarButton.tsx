import { CalendarPlus } from "lucide-react";
import {
  calendarFileName,
  calendarPath,
  companyCalendarFileName,
  companyCalendarPath,
  type Audience,
  type ChallengeCompany,
} from "@/lib/hackathon-2026";

/**
 * Plain download link — works without JavaScript, opens in the phone's
 * calendar. A company page gets its own file with its room and stand.
 */
export function CalendarButton(props: { audience: Audience } | { company: ChallengeCompany }) {
  const [href, fileName] =
    "company" in props
      ? [companyCalendarPath(props.company), companyCalendarFileName(props.company)]
      : [calendarPath(props.audience), calendarFileName(props.audience)];
  return (
    <a
      href={href}
      download={fileName}
      className="guide-no-print inline-flex min-h-11 items-center gap-2 border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <CalendarPlus aria-hidden="true" className="h-4 w-4" />
      Add to calendar
      <span className="font-normal text-white/55">.ics</span>
    </a>
  );
}
