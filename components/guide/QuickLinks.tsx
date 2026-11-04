import { CalendarClock, LifeBuoy, Map as MapIcon, MapPin } from "lucide-react";
import Link from "next/link";
import { GUIDE_BASE_PATH } from "@/lib/hackathon-2026";

const LINKS = [
  { href: "#weekend", label: "Schedule", sub: "Fri–Sun, Turku time", Icon: CalendarClock },
  { href: `${GUIDE_BASE_PATH}/venue#maps`, label: "Find a place", sub: "Rooms, stands, food", Icon: MapPin },
  { href: `${GUIDE_BASE_PATH}/venue#route`, label: "Campus map", sub: "Walk between venues", Icon: MapIcon },
  { href: "#help", label: "Help", sub: "Who to ask", Icon: LifeBuoy },
] as const;

/** The hub's four ways in: big, obvious tap targets in the first screen. */
export function QuickLinks() {
  return (
    <nav aria-label="Quick links">
      <ul className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 md:grid-cols-4">
        {LINKS.map(({ href, label, sub, Icon }) => (
          <li key={label}>
            <Link
              href={href}
              className="group flex h-full min-h-[4.75rem] items-center gap-3 bg-black p-4 transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
            >
              <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-(--color-event)" />
              <span className="min-w-0">
                <span className="block font-semibold text-white">{label}</span>
                <span className="block text-xs text-neutral-400">{sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
