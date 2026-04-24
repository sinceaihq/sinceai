"use client";
import React from "react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  discordUrl?: string;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  discordUrl = "https://discord.com/invite/YkqJswRGSW",
}) => {
  return (
    <>

      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center px-6 py-24 overflow-visible">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_65%)]" />
        </div>

        {/* Content */}
        <div className="relative z-20 flex flex-col items-center space-y-6 text-center max-w-6xl mx-auto overflow-visible">
          {/* Main Headline - Elite positioning */}
          <motion.div
            className="flex flex-col items-center space-y-4 pb-8 overflow-visible"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tighter leading-[1.15] overflow-visible">
              <span className="block text-white pb-2">The AI builders&apos; community</span>
              <span className="block text-white pb-2">globally —</span>
              <span className="block bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent pb-6">
                Turku-based, globally connected.
              </span>
            </h1>
          </motion.div>

          {/* Subheading - Mission statement */}
          <motion.div
            className="text-lg sm:text-xl md:text-2xl font-normal text-neutral-300 max-w-4xl mt-6 leading-relaxed space-y-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <p>
              Since AI brings together <strong className="text-white font-semibold">1000+ AI builders, researchers, and founders</strong> globally — and we&apos;re building bridges to the world&apos;s best talent from places like Stanford, Tsinghua, and top labs worldwide.
            </p>
            <p className="text-neutral-400">
              We run high-signal hackathons, meetups, and builder programs where teams ship real AI products: <span className="text-neutral-300">code, demos, deployments, and measurable outcomes</span> — in collaboration with partner companies that bring real-world problems and hiring opportunities.
            </p>
          </motion.div>

          {/* Proof line - Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-wrap justify-center gap-4 text-sm sm:text-base font-medium text-neutral-500"
          >
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
              1000+ members
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
              200+ hackathon participants
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
              30+ shipped projects
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
              15+ partner companies
            </span>
          </motion.div>

          {/* CTA Buttons - Primary + Secondary */}
          <motion.div
            className="pt-10 flex flex-col items-center gap-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => window.open(discordUrl, "_blank")}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02] transform"
                aria-label="Join Discord Community"
              >
                <span className="relative z-10">
                  Join the Discord
                </span>
              </button>
              
              <button
                type="button"
                onClick={() => window.location.href = "/partners"}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-full transition-all duration-300 hover:bg-white/15 backdrop-blur-xl border border-white/20 hover:border-white/30 hover:scale-[1.02] transform"
                aria-label="Partner with Since AI"
              >
                <span className="relative z-10">
                  Partner with Since AI
                </span>
              </button>
            </div>
            
            {/* Micro-line qualifier */}
            <p className="text-sm text-neutral-500 font-medium tracking-wide">
              If you&apos;re building serious AI, you&apos;ll fit in here.
            </p>
          </motion.div>
        </div>

        {/* Scroll indicator - More minimal */}
        <motion.div
          className="absolute bottom-12 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: [0.22, 1, 0.36, 1]
            }}
            className="w-5 h-8 rounded-full border border-neutral-700 flex items-start justify-center p-1.5"
          >
            <div className="w-1 h-2 bg-neutral-600 rounded-full" />
          </motion.div>
        </motion.div>
      </section>
    </>
  );
};

export default HeroSection;
