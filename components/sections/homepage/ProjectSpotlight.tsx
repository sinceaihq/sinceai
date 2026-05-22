"use client";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { type ChallengeTheme } from "@/lib/projects";

interface ProjectSpotlightProps {
  themes: ChallengeTheme[];
}

export function ProjectSpotlight({ themes }: ProjectSpotlightProps) {
  return (
    <section className="py-24 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Built around real challenges
          </h2>
          <p className="text-lg text-neutral-400">
            High-signal prototypes from partner challenge themes.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {themes.map((theme, index) => (
            <motion.article
              key={theme.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
              className="group relative overflow-hidden rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300 bg-black hover:bg-white/[0.02]"
            >
              <div className="p-8 md:p-10 flex flex-col gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                        {theme.sponsor}
                      </div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">
                        {theme.title}
                      </h3>
                    </div>
                    <span className="text-xs text-neutral-600 px-2 py-1 rounded bg-white/5 whitespace-nowrap">
                      {theme.industry}
                    </span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed text-base line-clamp-2">
                    {theme.summary}
                  </p>
                </div>
                
                <div className="flex flex-col gap-4">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {theme.tags.slice(0, 4).map(tag => (
                      <span
                        key={tag}
                        className="text-xs text-neutral-500 font-medium px-2.5 py-1 rounded-md bg-white/5"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        {/* View All Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          className="text-center"
        >
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-base font-semibold text-white hover:text-neutral-300 transition-colors group"
          >
            View all challenge themes
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
