"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";

import SmoothScroll from "@/components/smoothScroll";
import Preloader from "@/components/utils/Preloader";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections";
import { challengeThemes } from "@/lib/projects";

import { Hero } from "@/components/marketing/Hero";
import { BelowHero } from "@/components/marketing/BelowHero";
import { ProjectSpotlight } from "@/components/sections/homepage/ProjectSpotlight";
import { LatestPosts } from "@/components/sections/homepage/LatestPosts";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  }, []);

  const config = {
    discordUrl: "https://discord.com/invite/YkqJswRGSW",
  };

  // Get top 2 challenge themes for spotlight (Kongsberg and Sandvik)
  const spotlightThemes = challengeThemes.slice(0, 2);

  return (
    <>
      <Navbar />
      <SmoothScroll>
        <AnimatePresence mode="wait">
          {isLoading && <Preloader />}
        </AnimatePresence>

        <main className="flex flex-col w-full overflow-hidden">
          {/* A) Hero */}
          <Hero />

          {/* A2) Below-hero: definition, stats, pillars, partners, hackathon CTA */}
          <BelowHero />

          {/* B) Project Spotlight - challenge themes */}
          <ProjectSpotlight themes={spotlightThemes} />

          {/* C) Latest Blog Posts */}
          <LatestPosts />

          {/* Footer */}
          <Footer discordUrl={config.discordUrl} />
        </main>
      </SmoothScroll>
    </>
  );
}
