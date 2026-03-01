"use client";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Users, Briefcase } from "lucide-react";

interface DualCTAProps {
  discordUrl: string;
}

export function DualCTA({ discordUrl }: DualCTAProps) {
  return (
    <section className="py-32 px-6 bg-gradient-to-b from-black via-neutral-950 to-black">
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Partner CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="group relative p-10 rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-all duration-500"
          >
            <div className="flex flex-col h-full">
              <div className="mb-8">
                <div className="inline-flex p-3 rounded-xl bg-white/5 border border-white/10 mb-6">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                  For Companies
                </h2>
                <p className="text-base text-neutral-400 leading-relaxed">
                  Recruit top AI talent, sponsor challenges, and build your brand with 500+ builders.
                </p>
              </div>
              
              <Link
                href="/partners"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold text-black bg-white rounded-full hover:bg-neutral-100 transition-all duration-300 group-hover:scale-[1.02] mt-auto"
              >
                Partner with us
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          {/* Join CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="group relative p-10 rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-all duration-500"
          >
            <div className="flex flex-col h-full">
              <div className="mb-8">
                <div className="inline-flex p-3 rounded-xl bg-white/5 border border-white/10 mb-6">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
                  For Builders
                </h2>
                <p className="text-base text-neutral-400 leading-relaxed">
                  Join 500+ AI builders in hackathons, meetups, and workshops. Ship real projects.
                </p>
              </div>
              
              <a
                href={discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-semibold text-white bg-white/10 rounded-full hover:bg-white/15 border border-white/20 hover:border-white/30 transition-all duration-300 group-hover:scale-[1.02] mt-auto"
              >
                Join Discord
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </motion.div>
        </div>

        {/* Upcoming Event Notice */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-12 text-center"
        >
          <Link
            href="/hackathon"
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/[0.08] transition-all group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors">
              Since AI Hackathon 2026 — November in Turku
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
