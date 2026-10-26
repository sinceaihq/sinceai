import Link from "next/link";
import {
  BRIEFING_ROOMS_ANCHOR,
  briefingRoomLabel,
  CHALLENGE_COMPANIES,
  CONTENT_STAGES,
  EQUAL_PRIZE,
  GUIDE_BASE_PATH,
  isTbaPlace,
  NDA_LABEL,
  NDA_NOTE,
  SELECTION_RULES,
  SELECTION_TIMELINE,
  SKILL_CARDS,
  TEAM_FORMATION_ROUTES,
  type ChallengeCompany,
} from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";

/** Small, readable "NDA required" label next to a company that runs its own NDA (mobile too). */
export function NdaLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center border border-(--color-event)/60 px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-(--color-event)",
        className,
      )}
      title={NDA_NOTE}
    >
      {NDA_LABEL}
    </span>
  );
}

/** The one equal-prize statement, as a high-visibility lead line. */
export function EqualPrize({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "border-l-4 border-(--color-event) pl-4 text-xl font-bold uppercase tracking-tight text-white md:text-2xl",
        className,
      )}
      data-equal-prize
    >
      {EQUAL_PRIZE}
    </p>
  );
}

/** Builders: the prize statement, the six rules and Thursday → Friday timeline. */
export function ChallengeRules() {
  return (
    <div>
      <EqualPrize />
      <ul className="mt-8 grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {SELECTION_RULES.map((rule) => (
          <li key={rule.title} className="guide-avoid-break border-b border-r border-white/10 p-5">
            <h3 className="text-lg font-bold tracking-tight text-white">{rule.title}</h3>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{rule.text}</p>
          </li>
        ))}
      </ul>
      <h3 id="selection-timeline-title" className="mt-12 text-xl font-bold tracking-tight text-white">
        Thursday preview, Friday selection, full challenge at 19:30.
      </h3>
      <ol
        aria-labelledby="selection-timeline-title"
        className="mt-4 grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-5"
      >
        {SELECTION_TIMELINE.map((moment) => (
          <li key={moment.time} className="guide-avoid-break border-b border-r border-white/10 p-4">
            <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-event)">{moment.time}</p>
            <p className="mt-2 font-semibold text-white">{moment.title}</p>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{moment.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** What is shared when, and with whom — summary, briefing, full challenge (builders and companies). */
export function ContentStages({ audience = "builders" }: { audience?: "builders" | "challenge-partners" }) {
  return (
    <ol className="grid grid-cols-1 border-l border-t border-white/10 md:grid-cols-3">
      {CONTENT_STAGES.map((stage, i) => (
        <li key={stage.title} className="guide-avoid-break border-b border-r border-white/10 p-5">
          <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-event)">
            {String(i + 1).padStart(2, "0")} · {stage.when}
          </p>
          <h3 className="mt-3 text-lg font-bold tracking-tight text-white">{stage.title}</h3>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-white/55">
            {audience === "challenge-partners" && i === 0 ? "Every registered participant" : stage.audience}
          </p>
          <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{stage.text}</p>
        </li>
      ))}
    </ol>
  );
}

/** Route A / B and the skill-card colours of the team formation map, as text. */
export function TeamFormationRoutes() {
  return (
    <div>
      <ol className="grid grid-cols-1 border-l border-t border-white/10 md:grid-cols-2">
        {TEAM_FORMATION_ROUTES.map((route) => (
          <li key={route.id} id={`route-${route.id}`} className="guide-avoid-break border-b border-r border-white/10 p-5">
            <p className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-event) font-bold text-black"
              >
                {route.letter}
              </span>
              <span className="text-lg font-bold tracking-tight text-white">
                <span className="sr-only">Route {route.letter}: </span>
                {route.title}
              </span>
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-neutral-300 leading-relaxed marker:text-white/55">
              {route.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-white/55">Skill cards</p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Skill-card colours">
          {SKILL_CARDS.map((card) => (
            <li key={card.colour} className="flex items-center gap-2 text-sm text-neutral-200">
              <span
                aria-hidden="true"
                className="inline-block h-4 w-4 border border-white/30"
                style={{ backgroundColor: card.swatch }}
              />
              <span>
                <span className="font-semibold text-white">{card.colour}</span> — {card.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const byRoom = (a: ChallengeCompany, b: ChallengeCompany) =>
  a.briefing.floor - b.briefing.floor || a.briefing.room.localeCompare(b.briefing.room, "en", { numeric: true });

/**
 * The Friday briefing rooms as a text table, floor by floor — what the app's
 * selection pop-up points builders to. Held places say so; they are never a company.
 */
export function BriefingRoomTable({ mapHrefPrefix = "#map-" }: { mapHrefPrefix?: string }) {
  const rows = [...CHALLENGE_COMPANIES].sort(byRoom);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[20rem] border-collapse text-left text-sm" id={`${BRIEFING_ROOMS_ANCHOR}-table`}>
        <caption className="sr-only">Company briefing rooms at EduCity, Friday 18:50–19:30</caption>
        <thead>
          <tr className="border-b border-white/20">
            <th scope="col" className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-widest text-white/55">
              Company
            </th>
            <th scope="col" className="py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-widest text-white/55">
              Room
            </th>
            <th scope="col" className="py-2 font-mono text-[11px] font-normal uppercase tracking-widest text-white/55">
              Floor
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const held = isTbaPlace(c);
            return (
              <tr key={c.id} className="border-b border-white/10" data-briefing-room={c.id}>
                <th scope="row" className="py-3 pr-4 font-semibold text-white">
                  <span className="flex flex-wrap items-center gap-2">
                    {held ? (
                      <span className="font-normal text-neutral-400">Held for a partner to be announced</span>
                    ) : (
                      <Link
                        href={`${GUIDE_BASE_PATH}/challenge-partners/${c.id}`}
                        className="underline decoration-white/25 underline-offset-4 hover:decoration-white"
                      >
                        {c.name}
                      </Link>
                    )}
                    {c.ndaRequired && <NdaLabel />}
                  </span>
                </th>
                <td className="py-3 pr-4 text-neutral-200">{briefingRoomLabel(c)}</td>
                <td className="py-3 text-neutral-200">
                  <a
                    href={`${mapHrefPrefix}educity-${c.briefing.floor}`}
                    className="underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white"
                  >
                    {c.briefing.floor}
                    <span className="sr-only"> — show the floor {c.briefing.floor} map</span>
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
