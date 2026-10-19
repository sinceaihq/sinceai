import Image from "next/image";
import { Linkedin } from "lucide-react";
import { initials, JUDGE_PANEL_SIZE, judges, type Judge } from "@/lib/judges";

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/** Square portrait area shared by every card, so all four line up. */
function Portrait({ judge }: { judge?: Judge }) {
  if (judge?.portrait) {
    return (
      <figure className="relative m-0 aspect-square overflow-hidden border-b border-white/10 bg-neutral-950">
        <Image
          src={judge.portrait.src}
          alt={judge.portrait.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
          className="object-cover grayscale transition-[filter] duration-500 group-hover:grayscale-0"
        />
        {judge.portrait.credit && (
          <figcaption className="absolute bottom-0 right-0 bg-black/70 px-2 py-1 text-[10px] leading-none text-white/80">
            {judge.portrait.credit}
          </figcaption>
        )}
      </figure>
    );
  }
  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_50%_35%,var(--color-event-glow),transparent_70%)] ${judge ? "aspect-square" : "aspect-[5/2] sm:aspect-square"}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(color-mix(in_srgb,var(--color-fg)_4%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--color-fg)_4%,transparent)_1px,transparent_1px)] bg-[size:24px_24px]" />
      {judge ? (
        <span className="relative font-mono text-5xl font-bold tracking-tight text-white/80">{initials(judge.name)}</span>
      ) : (
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-white/25 font-mono text-2xl text-white/55">
          ?
        </span>
      )}
    </div>
  );
}

function JudgeCard({ judge }: { judge: Judge }) {
  return (
    <li className="group flex flex-col border border-white/10 transition-colors hover:border-white/20">
      <Portrait judge={judge} />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl font-bold tracking-tight text-white">{judge.name}</h3>
        <p className="mt-1 text-sm text-neutral-300">{judge.title}</p>
        <a
          href={judge.organizationUrl}
          {...external}
          className={`mt-0.5 inline-flex min-h-8 items-center self-start text-sm text-neutral-400 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white ${focusRing}`}
        >
          {judge.organization}
          <span aria-hidden="true" className="ml-1">
            ↗
          </span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <p className="mt-4 text-sm text-neutral-400 leading-relaxed">{judge.bio}</p>
        <div className="mt-auto pt-5">
          <a
            href={judge.profileUrl}
            {...external}
            aria-label={`${judge.name} on LinkedIn (opens in a new tab)`}
            className={`inline-flex h-11 w-11 items-center justify-center border border-white/15 text-neutral-400 transition-colors hover:border-white hover:text-white ${focusRing}`}
          >
            <Linkedin size={18} strokeWidth={1.5} aria-hidden="true" />
          </a>
        </div>
      </div>
    </li>
  );
}

function OpenPlaceCard() {
  return (
    <li className="flex flex-col border border-dashed border-white/15">
      <Portrait />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl font-bold tracking-tight text-white">Judge to be announced</h3>
        <p className="mt-1 text-sm text-neutral-400 leading-relaxed">More judges will be announced soon.</p>
        <p className="mt-auto pt-5">
          <span className="inline-flex items-center gap-1.5 border border-white/15 px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest text-neutral-400">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
            Coming soon
          </span>
        </p>
      </div>
    </li>
  );
}

/** "Meet the judges": the four-judge panel of the Sunday finals. */
export function Judges() {
  if (judges.length === 0) return null;
  const open = Math.max(0, JUDGE_PANEL_SIZE - judges.length);

  return (
    <section aria-labelledby="judges-title" className="py-24 px-6 border-t border-white/10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-mono uppercase tracking-widest text-white/55 mb-3">{"// judging panel"}</p>
        <h2 id="judges-title" className="text-3xl font-bold tracking-tight text-white">
          Meet the judges.
        </h2>
        <p className="mt-4 mb-10 max-w-2xl text-sm text-neutral-400 leading-relaxed">
          The judging panel selects the overall winner of Since AI Hackathon 2026 at the finals in Turku on Sunday
          8 November. Company challenges are evaluated separately, by each challenge company.
        </p>

        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {judges.map((judge) => (
            <JudgeCard key={judge.name} judge={judge} />
          ))}
          {Array.from({ length: open }, (_, i) => (
            <OpenPlaceCard key={`open-${i}`} />
          ))}
        </ul>
      </div>
    </section>
  );
}
