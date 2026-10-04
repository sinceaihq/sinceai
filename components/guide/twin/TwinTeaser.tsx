import Image from "next/image";
import Link from "next/link";
import { GUIDE_BASE_PATH } from "@/lib/hackathon-2026/route";
import {
  getPlace3D,
  getTarget3D,
  getTour3D,
  isPlaceId,
  normaliseTarget,
  placeForTarget,
  PLACES_3D,
  type Place3D,
  type PlaceId,
} from "@/lib/hackathon-2026/twin";

/**
 * Poster per place — the one constant to update when posters change.
 *
 * The twin's own posters (`Place3D.poster`) are rendered with
 * scripts/render-guide-posters.mjs. Until a place has one, its entry here
 * points at a poster of the previous 3D preview; set the entry to `null` once
 * the new file exists and `Place3D.poster` is used.
 */
export const TWIN_POSTERS: Readonly<Record<PlaceId, string | null>> = {
  campus: "/assets/guide/3d/showroom-poster.webp",
  educity: "/assets/guide/3d/showroom-poster.webp",
  biocity: "/assets/guide/3d/biocity-poster.webp",
  joki: "/assets/guide/3d/showroom-poster.webp",
};

/** Poster image for a place (see TWIN_POSTERS). */
export function posterFor(place: Place3D): string {
  return TWIN_POSTERS[place.id] ?? place.poster;
}

/** Resolve a teaser's `focus` / `place` props to what the 3D opens on. */
export function teaserTarget({ focus, place }: { focus?: string; place?: PlaceId }) {
  // `focus` may name a place ("biocity"), a target, or a partner ("red-hat" → its stand).
  const lower = focus?.trim().toLowerCase();
  const focusPlace = isPlaceId(lower) ? lower : undefined;
  const id = focus && !focusPlace ? normaliseTarget(focus) : null;
  const target = id ? getTarget3D(id) : undefined;
  const placeId: PlaceId = place ?? target?.place ?? focusPlace ?? (id ? placeForTarget(id) : PLACES_3D[0].id);
  return { place: getPlace3D(placeId), target, focusId: target?.id ?? id ?? undefined };
}

/** A place's view by id — undefined for its default view or an unknown id. */
function teaserView(place: Place3D, view?: string) {
  const found = view ? place.views.find((v) => v.id === view) : undefined;
  return found && found.id !== place.views[0].id ? found : undefined;
}

/** Link into the 3D section of the venue page, opened on a place (and view), a target or a route. */
export function twinHref({
  focus,
  place,
  view,
  tour,
}: { focus?: string; place?: PlaceId; view?: string; tour?: string } = {}): string {
  const route = tour ? getTour3D(tour) : undefined;
  if (route) return `${GUIDE_BASE_PATH}/venue?tour=${encodeURIComponent(route.id)}#preview-3d`;
  const { place: p, focusId } = teaserTarget({ focus, place });
  const v = focusId ? undefined : teaserView(p, view);
  const params = new URLSearchParams();
  if (focusId) params.set("focus", focusId);
  else if (place || focus || v) params.set("place", p.id);
  if (v) params.set("view", v.id);
  const query = params.toString();
  return `${GUIDE_BASE_PATH}/venue${query ? `?${query}` : ""}#preview-3d`;
}

/**
 * Static poster of the campus twin that links to the 3D on the venue page —
 * no WebGL cost until someone asks for it. With `focus` (a company, stand,
 * room or partner id) the 3D opens on that target; with `place` (and `view`)
 * on a place.
 */
export function TwinTeaser({ focus, place, view }: { focus?: string; place?: PlaceId; view?: string }) {
  const { place: p, target } = teaserTarget({ focus, place });
  const v = target ? undefined : teaserView(p, view);
  return (
    <Link
      href={twinHref({ focus, place, view })}
      className="group guide-no-print relative block overflow-hidden border border-white/10 transition-colors hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <div className="relative aspect-[4/3] w-full bg-(--color-scene) sm:aspect-[16/9]">
        <Image
          src={posterFor(p)}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/0" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-6">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-event)">
              Interactive 3D · built to scale
            </p>
            <p className="mt-2 text-lg font-bold tracking-tight text-white sm:text-xl md:text-2xl">
              {target ? target.label : v ? `${p.tab} · ${v.label}` : p.title}
            </p>
            {target && <p className="mt-1 text-sm text-neutral-300">{target.detail}</p>}
          </div>
          <span className="hidden shrink-0 border border-white/30 bg-black/60 px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:border-white sm:inline-block">
            Explore in 3D
            <span aria-hidden="true" className="ml-1">
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
