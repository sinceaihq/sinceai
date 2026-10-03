import Image from "next/image";
import Link from "next/link";
import { GUIDE_BASE_PATH } from "@/lib/hackathon-2026";

/** Static poster of the 3D Showroom — no WebGL cost until someone asks for it. */
export function Venue3DTeaser({ focus }: { focus?: string }) {
  const href = `${GUIDE_BASE_PATH}/venue${focus ? `?focus=${encodeURIComponent(focus)}` : ""}#preview-3d`;
  return (
    <Link
      href={href}
      className="group guide-no-print relative block overflow-hidden border border-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <div className="relative aspect-[16/9] w-full bg-[#06050c]">
        <Image
          src="/assets/guide/3d/showroom-poster.webp"
          alt="Illustrative 3D render of the Joki Showroom: six challenge partner counters with bar stools in front of a curved, violet-lit LED wall with partner logos."
          fill
          sizes="(max-width: 1024px) 100vw, 1024px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-event)">
              Interactive 3D · illustrative
            </p>
            <p className="mt-2 text-xl md:text-2xl font-bold tracking-tight text-white">
              Joki Showroom — challenge partner Q&amp;A
            </p>
          </div>
          <span className="hidden shrink-0 border border-white/30 bg-black/60 px-4 py-2 text-sm font-semibold text-white transition-colors group-hover:border-white sm:inline-block">
            Step inside →
          </span>
        </div>
      </div>
    </Link>
  );
}
