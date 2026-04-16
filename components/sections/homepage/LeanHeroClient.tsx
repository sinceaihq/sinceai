"use client";
import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface StatItem {
  value: string;
  label: string;
}

interface LeanHeroClientProps {
  h1: string;
  subheading: string;
  pills: string[];
  stats: StatItem[];
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  microText: string;
}

export function LeanHeroClient({
  h1,
  subheading,
  pills,
  stats,
  primaryCtaLabel,
  primaryCtaUrl,
  secondaryCtaLabel,
  secondaryCtaHref,
  microText,
}: LeanHeroClientProps) {
  return (
    <div className="relative z-20 flex flex-col items-center space-y-10 text-center max-w-5xl mx-auto">
      <motion.h1
        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tighter leading-tight text-white"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {h1}
      </motion.h1>

      <motion.p
        className="text-xl sm:text-2xl md:text-3xl font-light text-neutral-400 max-w-3xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {subheading}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap justify-center gap-2"
      >
        {pills.map((pill) => (
          <Badge
            key={pill}
            variant="outline"
            className="border-white/10 bg-white/[0.04] text-neutral-400 text-sm px-3 py-1 font-medium tracking-wide"
          >
            {pill}
          </Badge>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full pt-2"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
              {stat.value}
            </div>
            <div className="text-xs sm:text-sm text-neutral-500 font-medium leading-snug">
              {stat.label}
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        className="flex flex-col sm:flex-row items-center gap-4 pt-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <a
          href={primaryCtaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02]"
        >
          {primaryCtaLabel}
        </a>

        <Link
          href={secondaryCtaHref}
          className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-full transition-all duration-300 hover:bg-white/15 backdrop-blur-xl border border-white/20 hover:border-white/30 hover:scale-[1.02]"
        >
          {secondaryCtaLabel}
        </Link>
      </motion.div>

      <motion.p
        className="text-sm text-neutral-600 font-medium tracking-wide pt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.0, ease: [0.22, 1, 0.36, 1] }}
      >
        {microText}
      </motion.p>
    </div>
  );
}
