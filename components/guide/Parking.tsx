import Link from "next/link";
import {
  CAR_ARRIVAL,
  drivingDirections,
  getParking,
  GUIDE_BASE_PATH,
  NOT_EVENT_PARKING,
  PARKING,
  parkingIn3D,
  STREET_PARKING,
  type ParkingFacility,
} from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";
import { Arrow, ghostButtonClass, GuideSection, SectionHeading, TextLink } from "./primitives";

const PARKING_HREF = `${GUIDE_BASE_PATH}/venue#parking`;

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-white/10 py-2.5 text-sm">
      <dt className="font-mono text-[11px] uppercase tracking-widest text-white/55">{label}</dt>
      <dd className="mt-1 text-neutral-300 leading-relaxed">{children}</dd>
    </div>
  );
}

function ParkingCard({ p }: { p: ParkingFacility }) {
  const directions = drivingDirections(p);
  const recommended = p.role === "Recommended";
  return (
    <li
      id={`parking-${p.id}`}
      data-parking={p.id}
      className={cn(
        "guide-avoid-break flex flex-col border p-5",
        recommended ? "border-(--color-event)/50 bg-(--color-event)/[0.05]" : "border-white/10",
      )}
    >
      <p
        className={cn(
          "font-mono text-[11px] uppercase tracking-widest",
          recommended ? "text-(--color-event)" : "text-white/55",
        )}
      >
        {p.role}
      </p>
      <h3 className="mt-2 text-xl font-bold tracking-tight text-white">{p.name}</h3>
      <p className="mt-1 text-sm text-neutral-400">
        {p.operator} · {p.kind}
      </p>
      <dl className="mt-4">
        <Fact label="Address">
          <address className="not-italic">{p.address}</address>
          {p.vehicleEntrance && <span className="block text-neutral-400">Cars: {p.vehicleEntrance}</span>}
        </Fact>
        <Fact label="Price">
          {p.prices.join(" · ")}
          {p.zone && <span className="block text-neutral-400">{p.zone}</span>}
        </Fact>
        <Fact label="Open">{p.access}</Fact>
        {p.heightLimit && <Fact label="Height">Max {p.heightLimit}</Fact>}
        <Fact label="On foot">
          {p.walk.map((w) => (
            <span key={w} className="block">
              {w}
            </span>
          ))}
        </Fact>
      </dl>
      {(p.notes.length > 0 || p.serviceFee) && (
        <ul className="mt-3 space-y-1 text-xs text-neutral-400 leading-relaxed">
          {p.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
          {p.serviceFee && <li>{p.serviceFee}</li>}
        </ul>
      )}
      <div className="guide-no-print mt-auto flex flex-wrap gap-x-5 pt-4">
        {directions && (
          <TextLink href={directions}>
            Driving directions<span className="sr-only"> to {p.name}</span>
          </TextLink>
        )}
        <TextLink href={p.officialUrl}>
          {p.operator} page<span className="sr-only"> for {p.name}</span>
        </TextLink>
        {p.target3d && (
          // A plain link on purpose: a client-side push from /venue#parking kept the old fragment
          // (…?focus=parkcity#parking#preview-3d); a real navigation lands on the 3D, which reads ?focus.
          <a
            href={parkingIn3D(p.target3d)}
            className="inline-flex min-h-11 items-center text-sm text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Show in 3D<span className="sr-only">: {p.name}</span>
            <Arrow />
          </a>
        )}
      </div>
    </li>
  );
}

/** "Is parking free?" — the City of Turku street-parking rule, without promising a free space. */
function StreetParking() {
  return (
    <div className="guide-avoid-break border border-white/10 p-5">
      <h3 className="text-lg font-bold tracking-tight text-white">Free street parking?</h3>
      <p className="mt-2 text-sm text-neutral-300 leading-relaxed">{STREET_PARKING.notice}</p>
      <p className="mt-2 text-xs text-neutral-400 leading-relaxed">{STREET_PARKING.hours}</p>
      <TextLink href={STREET_PARKING.officialUrl} className="mt-1">
        City of Turku parking rules
      </TextLink>
    </div>
  );
}

/** Full parking guide — Venue Explorer, section id `parking`. */
export function ParkingSection() {
  return (
    <GuideSection id="parking">
      <SectionHeading
        id="parking-title"
        eyebrow="// parking & arriving by car"
        title="Parking & arriving by car."
        lede="Park in ParkCity, across the street from EduCity — or at P-Station Kupittaa, open around the clock. Every car park here is paid; prices are the operators' regular rates."
      />
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PARKING.map((p) => (
          <ParkingCard key={p.id} p={p} />
        ))}
      </ul>
      <div className="mt-6 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        <StreetParking />
        <div className="guide-avoid-break border border-white/10 p-5">
          <h3 className="text-lg font-bold tracking-tight text-white">Before you drive</h3>
          <ul className="mt-2 space-y-2 text-sm text-neutral-300 leading-relaxed">
            {[CAR_ARRIVAL.lateArrival, CAR_ARRIVAL.dropOff, CAR_ARRIVAL.accessible, CAR_ARRIVAL.unloading].map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <h4 className="mt-4 font-mono text-[11px] uppercase tracking-widest text-white/55">Not event parking</h4>
          <ul className="mt-2 space-y-1 text-sm text-neutral-400 leading-relaxed">
            {NOT_EVENT_PARKING.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-6 max-w-3xl text-xs text-white/55 leading-relaxed">{CAR_ARRIVAL.disclaimer}</p>
    </GuideSection>
  );
}

/** Compact version for the hub and partner guides: the recommendation, the 24/7 back-up, a link to the rest. */
export function ParkingSummary({ lede, extra }: { lede?: string; extra?: readonly string[] }) {
  const cards = [getParking("parkcity"), getParking("p-station-kupittaa")];
  return (
    <div>
      {lede && <p className="mb-6 max-w-2xl text-sm text-neutral-300 leading-relaxed">{lede}</p>}
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((p) => (
          <ParkingCard key={p.id} p={p} />
        ))}
      </ul>
      {extra && extra.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm text-neutral-300 leading-relaxed">
          {extra.map((t) => (
            <li key={t} className="flex gap-2">
              <span aria-hidden="true" className="text-white/55">
                —
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-neutral-400 leading-relaxed">{STREET_PARKING.notice}</p>
      <div className="guide-no-print mt-6">
        <Link href={PARKING_HREF} className={cn(ghostButtonClass, "w-full sm:w-auto")}>
          All parking options, prices and the 3D view
          <Arrow />
        </Link>
      </div>
    </div>
  );
}

/** Hub section — section id `parking`. */
export function ParkingHubSection() {
  return (
    <GuideSection id="parking">
      <SectionHeading
        id="parking-title"
        eyebrow="// arriving by car"
        title="Parking & arriving by car."
        lede="The campus is a short walk from both car parks below. Prices are the operators' regular rates; the signs on site always prevail."
      />
      <ParkingSummary />
    </GuideSection>
  );
}

/** One line for the builder, judge and speaker guides. */
export function ParkingNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-neutral-400 leading-relaxed", className)}>
      <span className="font-semibold text-white">Coming by car?</span> Park in ParkCity (Joukahaisenkatu 8), across
      the street from EduCity, or at P-Station Kupittaa, open 24/7. Both are paid.{" "}
      <Link
        href={PARKING_HREF}
        className="text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Prices, hours and directions
      </Link>
      .
    </p>
  );
}
