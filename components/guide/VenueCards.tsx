import Image from "next/image";
import Link from "next/link";
import { GUIDE_BASE_PATH, getVenue, venueAddressLine, type VenueId } from "@/lib/hackathon-2026";
import { Arrow, StatusTag, TextLink } from "./primitives";

/** Venue cards: address first, then what happens there, then the way in. */
export function VenueCards({ venues }: { venues: readonly VenueId[] }) {
  return (
    <ul className={venues.length === 1 ? "grid max-w-xl grid-cols-1 gap-4" : "grid grid-cols-1 gap-4 md:grid-cols-3"}>
      {venues.map((id) => {
        const venue = getVenue(id);
        return (
          <li
            key={id}
            className="guide-avoid-break flex flex-col border border-white/10 transition-colors hover:border-white/20"
          >
            {venue.image && (
              <figure className="guide-no-print relative aspect-[16/9] overflow-hidden border-b border-white/10">
                <Image
                  src={venue.image.src}
                  alt={venue.image.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
                {venue.image.credit && (
                  <figcaption className="absolute bottom-0 right-0 bg-black/70 px-2 py-1 text-[10px] leading-none text-white/80">
                    {venue.image.credit}
                  </figcaption>
                )}
              </figure>
            )}
            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-2xl font-bold tracking-tight text-white">{venue.name}</h3>
              {venue.fullName !== venue.name && <p className="mt-1 text-xs text-white/55">{venue.fullName}</p>}
              <address className="mt-3 not-italic text-sm text-neutral-300">{venueAddressLine(venue)}</address>
              <ul className="mt-4 space-y-1.5 text-sm text-neutral-400">
                {venue.roles.map((role) => (
                  <li key={role} className="flex gap-2">
                    <span aria-hidden="true" className="text-white/55">
                      —
                    </span>
                    <span>{role}</span>
                  </li>
                ))}
              </ul>
              {venue.entrances.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                  {venue.entrances
                    .filter((entrance) => entrance.status !== "do_not_publish")
                    .map((entrance) => (
                      <p key={entrance.label} className="text-sm text-neutral-400">
                        <span className="font-semibold text-white">{entrance.label}: </span>
                        {entrance.detail}
                        {entrance.status === "working" && (
                          <span className="ml-2 align-middle">
                            <StatusTag status="working" />
                          </span>
                        )}
                      </p>
                    ))}
                </div>
              )}
              {venue.openAroundTheClock && (
                <p className="mt-4">
                  <StatusTag status="confirmed" label="Open around the clock" />
                </p>
              )}
              <div className="guide-no-print mt-auto flex flex-wrap gap-x-5 pt-3">
                <TextLink href={venue.mapsUrl}>Directions</TextLink>
                <Link
                  href={`${GUIDE_BASE_PATH}/venue#maps-${venue.id}`}
                  className="inline-flex min-h-11 items-center text-sm text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Floor plans
                  <Arrow />
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
