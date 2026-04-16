import React from "react";
import { LeanHeroClient } from "./LeanHeroClient";

interface LeanHeroProps {
  discordUrl: string;
}

const H1 = "Europe's execution-focused AI innovation ecosystem.";

const SUBHEADING =
  "Where frontier AI becomes shipped products. Since AI connects 10,000+ AI builders in our network across Europe with leading AI companies, research groups, and investors — through hackathons, open-source collaboration, and applied AI projects. Based in Finland. Open globally.";

const PILLS = [
  "Non-profit · Since AI ry",
  "Europe-wide · Based in Finland",
  "Flagship: Hackathon 2026 · 1,000+ builders targeted",
];

const STATS = [
  { value: "10,000+", label: "AI builders in our network across Europe" },
  { value: "1,000+", label: "Builders targeted at Hackathon 2026" },
  { value: "30+", label: "Partners & supporters" },
  { value: "50+", label: "Countries represented in our network" },
];

const MICRO_TEXT =
  "Open to world-class builders, researchers, and partners. Rolling applications.";

export function LeanHero({ discordUrl }: LeanHeroProps) {
  return (
    <section className="relative w-full min-h-[75vh] flex flex-col items-center justify-center px-6 py-24">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_65%)]" />
      </div>

      <LeanHeroClient
        h1={H1}
        subheading={SUBHEADING}
        pills={PILLS}
        stats={STATS}
        primaryCtaLabel="Join the builder network →"
        primaryCtaUrl={discordUrl}
        secondaryCtaLabel="Partner with Since AI →"
        secondaryCtaHref="/partners"
        microText={MICRO_TEXT}
      />
    </section>
  );
}
