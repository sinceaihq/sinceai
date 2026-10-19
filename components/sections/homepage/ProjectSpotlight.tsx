import Link from "next/link";
import { type ChallengeTheme } from "@/lib/projects";
import { FadeInView } from "@/components/motion-primitives/fade-in";
import { SectionIntro } from "./SectionIntro";

interface ProjectSpotlightProps {
  themes: ChallengeTheme[];
}

/** Two challenge themes from Since AI Hackathon 2025 that went on to production with the challenge company. */
export function ProjectSpotlight({ themes }: ProjectSpotlightProps) {
  return (
    <section aria-labelledby="home-projects-title" className="py-24 md:py-32 px-6 bg-black border-t border-white/10">
      <FadeInView className="mx-auto max-w-6xl">
        <SectionIntro
          id="home-projects-title"
          eyebrow="// from since ai hackathon 2025"
          title="Real challenges. Running in production."
          lede="Built at the hackathon on problems set by the challenge companies — then taken to production use with Since AI's production support."
        />
        <ul className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
          {themes.map((theme) => (
            <li key={theme.slug} className="flex flex-col border border-white/10 p-8 transition-colors hover:border-white/20 md:p-10">
              <div className="flex items-start justify-between gap-4">
                <p className="text-xs font-mono uppercase tracking-widest text-white/55">{theme.sponsor}</p>
                <span className="shrink-0 border border-white/15 px-2 py-0.5 text-[11px] font-mono uppercase tracking-widest text-neutral-300">
                  {theme.industry}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-bold tracking-tight text-white">{theme.title}</h3>
              <p className="mt-3 text-neutral-400 leading-relaxed">{theme.summary}</p>
              <ul aria-label="Technologies" className="mt-6 flex flex-wrap gap-2">
                {theme.tags.slice(0, 4).map((tag) => (
                  <li key={tag} className="bg-white/5 px-2.5 py-1 text-xs text-neutral-300">
                    {tag}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          <Link
            href="/projects"
            className="inline-flex min-h-11 items-center text-sm text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white transition-colors"
          >
            All challenge themes <span aria-hidden="true" className="ml-1">→</span>
          </Link>
        </p>
      </FadeInView>
    </section>
  );
}
