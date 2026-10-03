import { HELP } from "@/lib/hackathon-2026";
import { Arrow } from "./primitives";

/** Public, verified help routes only — no personal phone numbers. */
export function HelpSection({ onSiteNote }: { onSiteNote?: string }) {
  const cards = [
    {
      title: "Before the event",
      body: "Questions about your role, access or logistics.",
      cta: HELP.email,
      href: `mailto:${HELP.email}`,
    },
    {
      title: "On site",
      body: onSiteNote ?? "Find a Since AI volunteer or staff member — they can reach the right person fast.",
    },
    {
      title: "Community",
      body: "Updates, teammates and questions in the Since AI Discord.",
      cta: "Open Discord",
      href: HELP.discord,
    },
    {
      title: "Report an incident",
      body: "Anything against the Code of Conduct — report it in sinceai.app.",
      cta: "sinceai.app/report",
      href: HELP.reportIncident,
    },
  ];
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <li key={card.title} className="guide-avoid-break flex flex-col border border-white/10 p-5">
          <h3 className="text-lg font-bold tracking-tight text-white">{card.title}</h3>
          <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{card.body}</p>
          {card.href && (
            <a
              href={card.href}
              {...(card.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="mt-auto inline-flex min-h-11 items-center pt-4 text-sm font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {card.cta}
              <Arrow external={card.href.startsWith("http")} />
              {card.href.startsWith("http") && <span className="sr-only"> (opens in a new tab)</span>}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
