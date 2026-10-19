import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { challengeThemes } from "@/lib/projects";
import { ORG } from "@/lib/org";

import { Hero } from "@/components/sections/homepage/Hero";
import { BelowHero } from "@/components/sections/homepage/BelowHero";
import { ProjectSpotlight } from "@/components/sections/homepage/ProjectSpotlight";
import { LatestPosts } from "@/components/sections/homepage/LatestPosts";
import { FinalCta } from "@/components/sections/homepage/FinalCta";

/** The homepage renders on the server: content is in the HTML from the first byte, no intro animation. */
export default function HomePage() {
  // The two challenge themes for the spotlight (Kongsberg and Sandvik).
  const spotlightThemes = challengeThemes.slice(0, 2);

  return (
    <>
      <Navbar />
      <SmoothScroll>
        <main className="flex flex-col w-full overflow-hidden">
          <Hero />
          <BelowHero />
          <ProjectSpotlight themes={spotlightThemes} />
          <LatestPosts />
          <FinalCta />
          <Footer discordUrl={ORG.social.discord} />
        </main>
      </SmoothScroll>
    </>
  );
}
