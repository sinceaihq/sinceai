import Image from "next/image";
import type { VenueMap } from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";

/**
 * A supplied map with its highlighted locations ringed. The plan's own labels
 * stay readable — rings are transparent in the middle.
 */
export function MapImage({
  map,
  highlight = [],
  priority = false,
  sizes = "(max-width: 768px) 100vw, 768px",
  className,
}: {
  map: VenueMap;
  /** Hotspot refIds or ids to ring. */
  highlight?: readonly string[];
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const rings = map.hotspots.filter(
    (h) => highlight.includes(h.id) || (h.refId !== undefined && highlight.includes(h.refId)),
  );
  return (
    <div
      className={cn("relative w-full overflow-hidden bg-white", className)}
      style={{ aspectRatio: `${map.width} / ${map.height}` }}
    >
      <Image
        src={map.src}
        alt={map.alt}
        width={map.width}
        height={map.height}
        sizes={sizes}
        priority={priority}
        className="absolute inset-0 h-full w-full object-contain"
      />
      {rings.map((h) => (
        <span
          key={h.id}
          aria-hidden="true"
          className="guide-hotspot-pulse absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-(--color-event-strong) bg-(--color-event)/10 sm:h-12 sm:w-12"
          style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%` }}
        />
      ))}
    </div>
  );
}
