import { CalendarClock, LifeBuoy, MapPin, Send, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { BUILDING_HREF, RESOURCES_PATH } from "@/lib/hackathon-2026";

const LINKS = [
  { href: RESOURCES_PATH, label: "AI Tools & Resources", sub: "Copilot, Gemini & more", Icon: Sparkles, lead: true },
  { href: "#weekend", label: "Schedule", sub: "Fri–Sun, Turku time", Icon: CalendarClock },
  { href: "#guides", label: "Your guide", sub: "By role", Icon: Users },
  { href: "/hackathon-2026/guide/venue#maps", label: "Venue & food", sub: "Rooms, maps, meals", Icon: MapPin },
  { href: BUILDING_HREF, label: "Submission", sub: "By Sun 10:00", Icon: Send },
  { href: "#help", label: "Help", sub: "Who to ask", Icon: LifeBuoy },
] as const;

/** The hub's four ways in: big, obvious tap targets in the first screen. */
export function QuickLinks() {
  return (
    <nav aria-label="Quick links">
      <ul className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 md:grid-cols-3">
        {LINKS.map(({ href, label, sub, Icon, ...rest }) => (
          <li key={label}>
            <Link
              href={href}
              className={`group flex h-full min-h-[4.75rem] items-center gap-3 p-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
                "lead" in rest ? "bg-(--color-event)/[0.12] hover:bg-(--color-event)/[0.2]" : "bg-black hover:bg-white/[0.04]"
              }`}
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
