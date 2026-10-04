import Link from "next/link";
import { GuideCards, primaryButtonClass, SectionHeading } from "@/components/guide";
import { GUIDE_BASE_PATH } from "@/lib/hackathon-2026";

/** Shared links get mistyped — send people to the right guide instead of a dead end. */
export default function GuideNotFound() {
  return (
    <section aria-labelledby="page-title" className="px-6 pt-12 pb-20 md:pt-20">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-mono uppercase tracking-widest text-white/55">404 · Field Guide</p>
        <h1 id="page-title" className="mt-4 text-5xl md:text-6xl font-bold tracking-tight text-white leading-[0.95]">
          This page isn&apos;t in the guide.
        </h1>
        <p className="mt-6 max-w-2xl text-base text-neutral-300 leading-relaxed">
          The link may have a typo. Pick your guide below — every role, room and time is there.
        </p>
        <div className="mt-8">
          <Link href={GUIDE_BASE_PATH} className={primaryButtonClass}>
            Field Guide home
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
        </div>
        <div className="mt-14">
          <SectionHeading id="guides-title" eyebrow="// choose your guide" title="One page per role." />
          <GuideCards />
        </div>
      </div>
    </section>
  );
}
