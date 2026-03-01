"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { motion } from "framer-motion";
import { Calendar, MapPin, Users, ExternalLink, ArrowRight } from "lucide-react";
import { FIRST_EVENT, UPCOMING_EVENT_2026, COPY, LINKS } from "@/lib/sinceai";
import { getFirstEventSchema, getUpcoming2026EventSchema, getBreadcrumbSchema } from "@/lib/schema";
import { ORG } from "@/lib/org";

export default function EventsPage() {
  const config = {
    discordUrl: "https://discord.gg/6PC74zW68v",
    lumaOrgUrl: LINKS.lumaOrg, // General events/calendar page
    lumaHackathon2025Url: LINKS.lumaHackathon2025, // Specific 2025 event page
  };

  const firstEventSchema = getFirstEventSchema();
  const upcoming2026Schema = getUpcoming2026EventSchema();
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "Events", url: `${ORG.baseUrl}/events` },
  ]);

  return (
    <SmoothScroll>
      <Navbar />

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(firstEventSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(upcoming2026Schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="flex flex-col w-full bg-black min-h-screen">
        {/* Hero Section - Minimal */}
        <section className="relative w-full px-6 py-24 md:py-32">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
                Events
              </h1>
              
              <p className="text-xl md:text-2xl text-neutral-400 max-w-2xl mx-auto">
                High-signal hackathons and meetups for builders who ship.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Upcoming Event - Most Prominent */}
        <section className="relative w-full px-6 py-16 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {/* Label */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-semibold text-white">Upcoming</span>
              </div>

              {/* Card */}
              <div className="border border-white/10 rounded-3xl p-8 md:p-12 bg-white/[0.02] hover:border-white/20 transition-all duration-300">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
                  {/* Content */}
                  <div className="flex-1">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                      Since AI Hackathon 2026
                    </h2>
                    
                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 mb-6 text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">November 2026 • Dates TBA</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">Turku, Finland</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-lg text-neutral-300 mb-8 max-w-2xl">
                      Our flagship build weekend for real partner challenges.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Link
                        href="/hackathon"
                        className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-black bg-white rounded-full hover:bg-neutral-100 transition-all duration-300 group"
                      >
                        Since AI Hackathon 2026
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                      </Link>

                      <Link
                        href="/partners"
                        className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white border border-white/20 rounded-full hover:bg-white/5 transition-all duration-300 group"
                      >
                        Partner for Hackathon 2026
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Past Event */}
        <section className="relative w-full px-6 py-16 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {/* Label */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
                <span className="text-sm font-semibold text-neutral-400">Past Events</span>
              </div>

              {/* Card */}
              <div className="border border-white/10 rounded-3xl p-8 md:p-12 bg-white/[0.02] hover:border-white/20 transition-all duration-300">
                <div className="flex flex-col gap-6">
                  {/* Header */}
                  <div>
                    <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                      Since AI Hackathon 2025
                    </h3>
                    
                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 mb-4 text-neutral-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">{COPY.eventDateRange}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm font-medium">{FIRST_EVENT.locationName}, {FIRST_EVENT.addressLocality}</span>
                      </div>
                    </div>

                    {/* Proof Line */}
                    <p className="text-lg text-neutral-300 mb-6">
                      260+ builders • 30+ AI projects • 6 partner companies
                    </p>
                  </div>

                  {/* Image */}
                  <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden bg-neutral-900/50">
                    <Image
                      src="/assets/images/educity.jpg"
                      alt="Since AI Hackathon 2025 — 260+ AI builders collaborating at EduCity campus in Turku, Finland"
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                    <div className="text-center sm:text-left">
                      <div className="text-3xl font-bold text-white mb-1">260+</div>
                      <div className="text-sm text-neutral-500">Builders</div>
                    </div>
                    <div className="text-center sm:text-left">
                      <div className="text-3xl font-bold text-white mb-1">30+</div>
                      <div className="text-sm text-neutral-500">Projects Shipped</div>
                    </div>
                    <div className="text-center sm:text-left">
                      <div className="text-3xl font-bold text-white mb-1">€10K+</div>
                      <div className="text-sm text-neutral-500">In Awards</div>
                    </div>
                  </div>

                  {/* Partner Companies */}
                  <div className="pt-6 border-t border-white/5">
                    <p className="text-sm text-neutral-500 mb-3">Partner Companies</p>
                    <div className="flex flex-wrap gap-3">
                      {["Valmet", "Sandvik", "Kongsberg", "ElevenLabs", "Featherless.ai", "Antler"].map((partner) => (
                        <span
                          key={partner}
                          className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-white/5 border border-white/10 rounded-full"
                        >
                          {partner}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* CTAs */}
                  <div className="pt-4 flex flex-wrap gap-4">
                    <Link
                      href="/projects"
                      className="inline-flex items-center gap-2 text-white hover:text-neutral-300 transition-colors group"
                    >
                      <span className="text-base font-medium">View projects</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    
                    <a
                      href={config.lumaHackathon2025Url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group"
                    >
                      <span className="text-base font-medium">View on Luma</span>
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Subscribe Section - Minimal */}
        <section className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Stay Updated
              </h3>
              <p className="text-lg text-neutral-400 mb-4 max-w-xl mx-auto">
                Join our Discord or Telegram to get notified about upcoming events, meetups, and hackathons.
              </p>
              <p className="text-sm text-neutral-500 mb-8 max-w-xl mx-auto">
                New to hackathons? Read our{" "}
                <Link href="/blog" className="text-neutral-300 hover:text-white underline">
                  AI hackathon guides
                </Link>{" "}
                or explore{" "}
                <Link href="/projects" className="text-neutral-300 hover:text-white underline">
                  past projects
                </Link>{" "}
                for inspiration.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <a
                  href={config.discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-black bg-white rounded-full hover:bg-neutral-100 transition-all duration-300"
                >
                  Join Discord
                </a>
                <a
                  href="https://t.me/sinceaihq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-white/10 rounded-full hover:bg-white/15 border border-white/20 hover:border-white/30 transition-all duration-300"
                >
                  Join Telegram
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer discordUrl={config.discordUrl} />
    </SmoothScroll>
  );
}
