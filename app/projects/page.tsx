"use client";
import React, { useState } from "react";
import Link from "next/link";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import {
  getIndustries,
  getModalities,
  getSponsors,
  filterChallengeThemes,
} from "@/lib/projects";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/gtag";

export default function ProjectsPage() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>("All");
  const [selectedModality, setSelectedModality] = useState<string>("All");
  const [selectedSponsor, setSelectedSponsor] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const config = {
    discordUrl: "https://discord.gg/vMWdrVUPws",
  };

  const industries = ["All", ...getIndustries()];
  const modalities = ["All", ...getModalities()];
  const sponsors = ["All", ...getSponsors()];

  const filteredThemes = filterChallengeThemes(
    selectedIndustry === "All" ? undefined : selectedIndustry,
    selectedModality === "All" ? undefined : selectedModality,
    selectedSponsor === "All" ? undefined : selectedSponsor,
    searchQuery || undefined
  );

  return (
    <SmoothScroll>
      <Navbar />

      <main className="flex flex-col w-full bg-black min-h-screen">
        {/* Hero Section - Minimal */}
        <section className="relative w-full px-6 py-24 md:py-32">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center"
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
                Projects
              </h1>

              <p className="text-xl md:text-2xl text-neutral-400 max-w-3xl mx-auto mb-6">
                High-signal prototypes built around real partner challenge themes.
              </p>

              <p className="text-sm text-neutral-500 max-w-2xl mx-auto">
                Public summaries only. Full challenge materials and solutions are not published.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Filters Section */}
        <section className="relative w-full px-6 py-8 border-t border-white/5">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Search themes, tags, or technologies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-none text-white placeholder-neutral-500 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>
              </div>

              {/* Filter Chips */}
              <div className="space-y-4">
                {/* Industry */}
                <div>
                  <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">
                    Industry
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {industries.map((industry) => (
                      <button
                        key={industry}
                        onClick={() => setSelectedIndustry(industry)}
                        className={`px-4 py-2 text-sm font-medium rounded-none transition-all cursor-pointer ${
                          selectedIndustry === industry
                            ? "bg-white text-black"
                            : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/10"
                        }`}
                      >
                        {industry}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Modality */}
                <div>
                  <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">
                    Modality
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {modalities.map((modality) => (
                      <button
                        key={modality}
                        onClick={() => setSelectedModality(modality)}
                        className={`px-4 py-2 text-sm font-medium rounded-none transition-all cursor-pointer ${
                          selectedModality === modality
                            ? "bg-white text-black"
                            : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/10"
                        }`}
                      >
                        {modality}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sponsor */}
                <div>
                  <label className="text-xs text-neutral-500 uppercase tracking-wider mb-2 block">
                    Sponsor
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sponsors.map((sponsor) => (
                      <button
                        key={sponsor}
                        onClick={() => setSelectedSponsor(sponsor)}
                        className={`px-4 py-2 text-sm font-medium rounded-none transition-all cursor-pointer ${
                          selectedSponsor === sponsor
                            ? "bg-white text-black"
                            : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white border border-white/10"
                        }`}
                      >
                        {sponsor}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Challenge Themes Grid */}
        <section className="relative w-full px-6 py-24">
          <div className="max-w-6xl mx-auto">
            {filteredThemes.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-neutral-500 text-lg">
                  No themes match your filters. Try adjusting your selection.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredThemes.map((theme, index) => (
                  <motion.div
                    key={theme.slug}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.05, ease: "easeOut" }}
                    className="border border-white/10 p-8 bg-white/[0.02] hover:border-white/20 transition-all duration-300 group"
                  >
                    {/* Sponsor */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                        {theme.sponsor}
                      </span>
                      <span className="text-xs text-neutral-600 px-2 py-1 rounded bg-white/5">
                        {theme.industry}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-neutral-200 transition-colors">
                      {theme.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-neutral-400 mb-4 leading-relaxed">
                      {theme.summary}
                    </p>

                    {/* What teams explored */}
                    <div className="mb-4">
                      <p className="text-xs text-neutral-600 uppercase tracking-wider mb-2">
                        What teams explored
                      </p>
                      <ul className="space-y-1.5">
                        {theme.bullets.map((bullet, i) => (
                          <li key={i} className="text-sm text-neutral-400 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-neutral-600">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Why it matters */}
                    <div className="mb-6 p-4 bg-white/5 border border-white/5">
                      <p className="text-xs text-neutral-600 uppercase tracking-wider mb-1">
                        Why it matters
                      </p>
                      <p className="text-sm text-neutral-300">
                        {theme.whyItMatters}
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {theme.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs font-medium text-neutral-400 bg-white/5 border border-white/10 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* CTAs */}
                    <div className="flex gap-3 pt-4 border-t border-white/5">
                      <a
                        href={config.discordUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackEvent(ANALYTICS_EVENTS.DISCORD_JOIN_CLICK)}
                        className="text-sm text-neutral-400 hover:text-white transition-colors"
                      >
                        Join builders →
                      </a>
                      <Link
                        href="/partners"
                        className="text-sm text-neutral-400 hover:text-white transition-colors"
                      >
                        Sponsor a challenge →
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Credibility Strip */}
        <section className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <p className="text-neutral-400 mb-4">
                <span className="text-white font-semibold">Since AI Hackathon 2025</span> — Nov 21–23, 2025 • EduCity, Turku • 260+ builders
              </p>
              <p className="text-neutral-500 text-sm">
                <span className="text-neutral-300">Next:</span> Hackathon 2026 — November 2026 (dates TBA)
              </p>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Build with the Best
              </h3>
              <p className="text-lg text-neutral-400 mb-8 max-w-xl mx-auto">
                Join 1000+ AI builders or partner with Since AI for your next challenge.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={config.discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-black bg-white rounded-none hover:bg-neutral-100 transition-all duration-300"
                >
                  Join the Community
                </a>

                <Link
                  href="/partners"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white border border-white/20 rounded-none hover:bg-white/5 transition-all duration-300"
                >
                  Partner with Since AI
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer discordUrl={config.discordUrl} />
    </SmoothScroll>
  );
}
