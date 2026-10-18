import Link from "next/link";
import {
  CATERING,
  DAYS,
  DIETARY,
  DIETARY_LABELS,
  EVENT_2026,
  formatDayShort,
  formatTime,
  getVenue,
  GUIDE_BASE_PATH,
  GUIDE_LINKS,
  MEALS,
  mealsOn,
  type DietaryLabel,
  type Meal,
} from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";
import { Arrow, Eyebrow, ghostButtonClass, GuideSection, SectionHeading, StatusTag, TextLink } from "./primitives";

const MAUNO_PLACE = `${CATERING.restaurant} · ${getVenue(CATERING.venue).name}`;

function spokenTime(meal: Meal): string {
  const start = `${meal.approx ? "Around " : ""}${formatTime(meal.start)}`;
  return meal.end ? `${start} to ${formatTime(meal.end)}` : start;
}

/** "18:30–21:30" or "~07:00", read out as "18:30 to 21:30" / "Around 07:00". */
function MealTime({ meal, className }: { meal: Meal; className?: string }) {
  return (
    <time dateTime={meal.start} className={cn("font-mono font-bold tabular-nums text-white", className)}>
      <span className="sr-only">{spokenTime(meal)}</span>
      <span aria-hidden="true">
        {meal.approx ? "~" : ""}
        {formatTime(meal.start)}
        {meal.end && `–${formatTime(meal.end)}`}
      </span>
    </time>
  );
}

function Labels({ labels, className }: { labels: readonly DietaryLabel[]; className?: string }) {
  if (labels.length === 0) return null;
  return (
    <ul aria-label="Dietary labels" className={cn("flex flex-wrap gap-2", className)}>
      {labels.map((label) => (
        <li
          key={label}
          className="border border-white/15 px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-neutral-300"
        >
          {DIETARY_LABELS[label]}
        </li>
      ))}
    </ul>
  );
}

function MealCard({ meal }: { meal: Meal }) {
  const titleId = `meal-${meal.id}-title`;
  return (
    <li
      id={`meal-${meal.id}`}
      data-meal={meal.id}
      aria-labelledby={titleId}
      className={cn(
        "guide-avoid-break flex flex-col border p-5",
        meal.main ? "border-white/10" : "border-dashed border-white/20",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 id={titleId} className="font-mono text-xs uppercase tracking-widest text-white/55">
          {meal.course}
        </h4>
        <MealTime meal={meal} />
      </div>
      {meal.main ? (
        <>
          <p className="mt-3 text-lg font-bold tracking-tight text-white leading-snug">{meal.main.name}</p>
          <Labels labels={meal.main.labels} className="mt-3" />
          {meal.dessert && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-white/55">Dessert</p>
              <p className="mt-1 font-semibold text-white">{meal.dessert.name}</p>
              <Labels labels={meal.dessert.labels} className="mt-2" />
            </div>
          )}
          {meal.servedAtMauno && (
            <p className="mt-auto pt-4 text-xs text-white/55">
              {MAUNO_PLACE} · {CATERING.serviceStyle}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="mt-3 text-lg font-bold tracking-tight text-white">Menu coming soon</p>
          <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
            The time is approximate. The breakfast menu will be published here once it is confirmed.
          </p>
          <p className="mt-auto pt-4">
            <StatusTag status="pending" label="Menu to be announced" />
          </p>
        </>
      )}
    </li>
  );
}

/** Day-by-day meal cards, chronological. */
export function MealSchedule({ idPrefix = "food" }: { idPrefix?: string }) {
  return (
    <div className="space-y-10">
      {DAYS.map((day) => {
        const meals = mealsOn(day.id);
        if (meals.length === 0) return null;
        return (
          <section key={day.id} aria-labelledby={`${idPrefix}-${day.id}`}>
            <h3 id={`${idPrefix}-${day.id}`} className="mb-4 text-xl font-bold tracking-tight text-white">
              {day.label}
            </h3>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {meals.map((meal) => (
                <MealCard key={meal.id} meal={meal} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** Special diets and allergies — the safety notice, always in full. */
export function DietaryNotice({ idPrefix = "food" }: { idPrefix?: string }) {
  const titleId = `${idPrefix}-dietary-title`;
  return (
    <aside
      id={`${idPrefix}-dietary`}
      aria-labelledby={titleId}
      className="guide-avoid-break border border-(--color-event)/50 bg-(--color-event-glow) p-5 md:p-6"
    >
      <Eyebrow className="mb-2 text-(--color-event)">Important</Eyebrow>
      <h3 id={titleId} className="text-xl font-bold tracking-tight text-white">
        Special diets and allergies
      </h3>
      <p className="mt-3 text-sm text-neutral-300 leading-relaxed">{DIETARY.arranged}</p>
      <ul className="mt-4 space-y-3">
        {[DIETARY.collect, DIETARY.allergies].map((text) => (
          <li key={text} className="flex gap-3 text-sm font-semibold text-white leading-relaxed">
            <span aria-hidden="true" className="mt-[0.55em] inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-(--color-event)" />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 border-t border-white/15 pt-4">
        <p className="text-sm text-white">
          <span className="font-mono text-[11px] uppercase tracking-widest text-white/55">Deadline </span>
          <time dateTime={DIETARY.deadline} className="font-semibold">
            {DIETARY.deadlineLabel}
          </time>
        </p>
        <p className="mt-2 text-sm text-neutral-300 leading-relaxed">
          Builders: use the Meal RSVP on your{" "}
          <a
            href={GUIDE_LINKS.appDashboard}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            sinceai.app dashboard
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          . Partners, judges and speakers: tell your Since AI contact, or email{" "}
          <a
            href={`mailto:${GUIDE_LINKS.contactEmail}`}
            className="underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {GUIDE_LINKS.contactEmail}
          </a>
          .
        </p>
        <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{DIETARY.notGuaranteed}</p>
      </div>
    </aside>
  );
}

/** Where the main meals are served and what they include. */
export function CateringInfo() {
  const venue = getVenue(CATERING.venue);
  return (
    <div className="guide-avoid-break grid grid-cols-1 border border-white/10 md:grid-cols-2">
      <div className="p-5 md:p-6">
        <Eyebrow className="mb-2">Main meals</Eyebrow>
        <h3 className="text-xl font-bold tracking-tight text-white">
          {CATERING.restaurant} — {venue.name}
        </h3>
        <address className="mt-2 not-italic text-sm text-neutral-300">{CATERING.address}</address>
        <div className="guide-no-print mt-2 flex flex-wrap gap-x-5">
          <TextLink href={venue.mapsUrl}>Directions</TextLink>
          <Link
            href={`${GUIDE_BASE_PATH}/venue#maps-${venue.id}`}
            className="inline-flex min-h-11 items-center text-sm text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            BioCity floor plan
            <Arrow />
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 p-5 md:border-l md:border-t-0 md:p-6">
        <p className="text-sm font-semibold text-white">Every main meal is served buffet-style and includes:</p>
        <ul className="mt-3 space-y-1.5 text-sm text-neutral-300">
          {CATERING.includes.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="text-white/55">
                —
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-neutral-400 leading-relaxed">
          {CATERING.restaurant} also sells {joinList(CATERING.forSale)} — paid separately.
        </p>
      </div>
    </div>
  );
}

function joinList(items: readonly string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}` : items.join("");
}

/** "Food & meals" for the Venue Explorer — section id `food`. */
export function FoodSection() {
  return (
    <GuideSection id="food">
      <SectionHeading
        id="food-title"
        eyebrow="// food & meals"
        title="Meals at Restaurant Mauno."
        lede={`Four warm buffet meals at ${CATERING.restaurant} in BioCity, plus breakfast on Saturday and Sunday. All times ${EVENT_2026.timezoneLabel}.`}
      />
      <DietaryNotice />
      <div className="mt-12">
        <MealSchedule />
      </div>
      <p className="mt-6 max-w-2xl text-xs text-white/55 leading-relaxed">{DIETARY.labelsNote}</p>
      <div className="mt-10">
        <CateringInfo />
      </div>
    </GuideSection>
  );
}

/** Compact weekend menu for the hub, linking to the full food section. */
export function FoodSummary() {
  return (
    <GuideSection id="food">
      <SectionHeading
        id="food-title"
        eyebrow="// food"
        title="Meals all weekend."
        lede={`Main meals are served at ${CATERING.restaurant}, BioCity. All times ${EVENT_2026.timezoneLabel}.`}
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_minmax(0,26rem)]">
        <div>
          <ol className="border-b border-white/10">
            {MEALS.map((meal) => (
              <li
                key={meal.id}
                data-meal={meal.id}
                className="grid grid-cols-[5.5rem_1fr] gap-x-4 border-t border-white/10 py-3 sm:grid-cols-[6rem_8.5rem_1fr]"
              >
                <span className="font-mono text-xs uppercase tracking-widest text-white/55 sm:pt-0.5">
                  {formatDayShort(meal.start)}
                </span>
                <span className="min-w-0 sm:contents">
                  <MealTime meal={meal} className="block text-sm" />
                  <span className="mt-1 block min-w-0 sm:mt-0">
                    <span className="text-sm font-semibold text-white">{meal.course}</span>
                    <span className="text-sm text-neutral-400">
                      {" — "}
                      {meal.main ? meal.main.name : "menu coming soon"}
                    </span>
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-6">
            <Link href={`${GUIDE_BASE_PATH}/venue#food`} className={cn(ghostButtonClass, "w-full sm:w-auto")}>
              Full menu, dietary labels and location
              <Arrow />
            </Link>
          </div>
        </div>
        <DietaryNotice idPrefix="hub-food" />
      </div>
    </GuideSection>
  );
}
