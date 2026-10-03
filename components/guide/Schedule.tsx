import {
  detailFor,
  formatTime,
  groupByDay,
  noteFor,
  placeDetailFor,
  titleFor,
  type Audience,
  type ScheduleItem,
} from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";
import { PlaceChip } from "./primitives";

function spokenTime(item: ScheduleItem): string {
  if (item.allDay) return "All day";
  const start = `${item.approx ? "Around " : ""}${formatTime(item.start)}`;
  if (item.end) return `${start} to ${formatTime(item.end)}`;
  return item.endPending ? `${start}, end time to be confirmed` : start;
}

function TimeCell({ item }: { item: ScheduleItem }) {
  return (
    <span className="block">
      <span className="sr-only">{spokenTime(item)}</span>
      {item.allDay ? (
        <span aria-hidden="true" className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          All day
        </span>
      ) : (
        <span aria-hidden="true" className="block">
          <span className="block font-mono text-base font-bold tabular-nums text-white">
            {item.approx ? "~" : ""}
            {formatTime(item.start)}
          </span>
          {item.end && (
            <span className="block font-mono text-xs tabular-nums text-neutral-500">
              –{formatTime(item.end)}
            </span>
          )}
          {item.endPending && (
            <span className="block font-mono text-[11px] uppercase tracking-widest text-neutral-500">
              end TBC
            </span>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * Day-by-day schedule for one audience. Stacked days (not tabs) so it reads
 * top-to-bottom on a phone, prints in full and works without JavaScript.
 */
export function Schedule({
  items,
  audience,
  idPrefix = "schedule",
}: {
  items: readonly ScheduleItem[];
  audience?: Audience;
  idPrefix?: string;
}) {
  const days = groupByDay(items);
  return (
    <div className="space-y-12">
      {days.map(({ day, items: dayItems }) => (
        <section key={day.id} aria-labelledby={`${idPrefix}-${day.id}`} className="guide-avoid-break">
          <h3
            id={`${idPrefix}-${day.id}`}
            className="mb-2 flex items-baseline gap-3 text-xl font-bold tracking-tight text-white"
          >
            {day.label}
          </h3>
          <ol>
            {dayItems.map((item) => {
              const deadline = item.kind === "deadline";
              const detail = detailFor(item, audience);
              const placeDetail = placeDetailFor(item, audience);
              const note = noteFor(item, audience);
              return (
                <li
                  key={item.id}
                  id={`${idPrefix}-item-${item.id}`}
                  className={cn(
                    "guide-avoid-break grid grid-cols-[4.75rem_1fr] gap-x-4 border-t border-white/10 py-4 sm:grid-cols-[6.5rem_1fr]",
                    deadline && "border-l-2 border-l-(--color-event) pl-3 -ml-3 sm:pl-4 sm:-ml-4",
                  )}
                >
                  <TimeCell item={item} />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold text-white">
                      <span>{titleFor(item, audience)}</span>
                      {deadline && (
                        <span className="text-[11px] font-mono uppercase tracking-widest text-(--color-event)">
                          Deadline
                        </span>
                      )}
                    </p>
                    {detail && (
                      <p className="mt-1 text-sm text-neutral-400 leading-relaxed">{detail}</p>
                    )}
                    <p className="mt-2 flex flex-wrap items-center gap-2">
                      <PlaceChip place={item.place} />
                      {placeDetail && <span className="text-xs text-neutral-500">{placeDetail}</span>}
                    </p>
                    {note && (
                      <p className="mt-2 text-xs text-(--color-event) leading-relaxed">
                        <span className="sr-only">Note: </span>
                        {note}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
