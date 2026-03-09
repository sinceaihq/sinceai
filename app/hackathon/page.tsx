"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TrustBar } from "@/components/sections/homepage/TrustBar";
import { CountdownTimer } from "@/components/countdown-timer";

// FAQ data — visible in DOM and mirrored in JSON-LD
const hackathonFaqs = [
  {
    q: "What is Since AI Hackathon?",
    a: "Since AI Hackathon is the flagship annual event of Since AI — Europe's leading AI builders community based in Turku, Finland. It is one of Europe's largest hackathons, expecting 1000+ participants in 2026, and is an official MLH (Major League Hacking) partner event. Builders from across the world gather to solve real industry challenges and ship AI products in 72 hours.",
  },
  {
    q: "When is Since AI Hackathon 2026?",
    a: "Since AI Hackathon 2026 is scheduled for November 2026 in Turku, Finland. Exact dates will be announced soon. Join our Discord (discord.gg/6PC74zW68v) or Telegram (t.me/sinceaihq) to be the first to know.",
  },
  {
    q: "Is Since AI Hackathon an official MLH event?",
    a: "Yes. Since AI Hackathon 2026 is an official Major League Hacking (MLH) Member Event for the 2026 season, making it part of the global MLH hackathon league.",
  },
  {
    q: "Who can participate in Since AI Hackathon?",
    a: "Since AI Hackathon is open to builders worldwide — students, professionals, researchers, and entrepreneurs. The event is held in English. Participants have previously come from Finland, across Europe, and internationally.",
  },
  {
    q: "Where is Since AI Hackathon held?",
    a: "Since AI Hackathon is held at EduCity, Turku University of Applied Sciences (Turku AMK) campus in Turku, Finland.",
  },
  {
    q: "How do I register for Since AI Hackathon 2026?",
    a: "Registration for Since AI Hackathon 2026 will be announced soon. Join our Discord at discord.gg/6PC74zW68v or Telegram at t.me/sinceaihq to receive the registration announcement as soon as it opens.",
  },
  {
    q: "What companies sponsor Since AI Hackathon?",
    a: "Since AI Hackathon is sponsored and supported by leading industrial and tech companies including Valmet, Sandvik, Kongsberg, ElevenLabs, Antler, the City of Turku, and the University of Turku.",
  },
  {
    q: "Is Since AI Hackathon free to attend?",
    a: "Since AI Hackathon is free to participate in for builders. Sponsorship opportunities are available for companies — see sinceai.fi/partners for details.",
  },
];

// JSON-LD schemas
const eventSchema = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Since AI Hackathon 2026",
  alternateName: ["Since AI Hackathon", "SinceAI Hackathon 2026"],
  description:
    "Europe's largest annual AI hackathon organized by Since AI community. Featuring industry challenges from top industrial and tech companies, official MLH partnership, and 1000+ participants from Finland, Europe, and worldwide.",
  url: "https://sinceai.fi/hackathon",
  startDate: "2026-11",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  image: "https://sinceai.fi/api/og/hackathon",
  location: {
    "@type": "Place",
    name: "EduCity, Turku University of Applied Sciences",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Joukahaisenkatu 3",
      addressLocality: "Turku",
      addressCountry: "FI",
    },
  },
  organizer: {
    "@type": "Organization",
    name: "Since AI",
    url: "https://sinceai.fi",
    sameAs: ["https://discord.gg/6PC74zW68v", "https://t.me/sinceaihq"],
  },
  sponsor: [
    { "@type": "Organization", name: "Valmet", url: "https://www.valmet.com" },
    {
      "@type": "Organization",
      name: "Sandvik",
      url: "https://www.sandvik.com",
    },
    {
      "@type": "Organization",
      name: "Kongsberg",
      url: "https://www.kongsberg.com",
    },
    {
      "@type": "Organization",
      name: "ElevenLabs",
      url: "https://elevenlabs.io",
    },
    { "@type": "Organization", name: "Antler", url: "https://www.antler.co" },
    {
      "@type": "Organization",
      name: "Major League Hacking",
      url: "https://mlh.io",
    },
  ],
  audience: {
    "@type": "Audience",
    audienceType:
      "AI developers, software engineers, data scientists, entrepreneurs, students",
  },
  maximumAttendeeCapacity: 1000,
  isAccessibleForFree: true,
  inLanguage: "en",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://sinceai.fi",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Since AI Hackathon 2026",
      item: "https://sinceai.fi/hackathon",
    },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: hackathonFaqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

const heroStats = [
  { value: "1,000+", label: "Participants Expected" },
  { value: "72 Hours", label: "Build Sprint" },
  { value: "MLH Official", label: "Partner Event" },
  { value: "Nov 2026", label: "Turku, Finland" },
];

const whyCards = [
  {
    title: "Real Industry Challenges",
    text: "Solve actual problems set by Valmet, Sandvik, Kongsberg, and other leading companies. The best solutions get noticed — and hired.",
  },
  {
    title: "Official MLH Partner Event",
    text: "Since AI Hackathon 2026 is part of the global Major League Hacking league. Gain MLH recognition, prizes, and connect with the worldwide hacker community.",
  },
  {
    title: "Build Your European Network",
    text: "Join 500+ Since AI community members across Europe. Past participants have been hired, founded startups, and built lasting professional connections.",
  },
  {
    title: "Ship Real AI Products",
    text: "No slide decks. No mockups. Since AI Hackathon rewards teams that build and demo working AI products within the 72-hour sprint.",
  },
];

const keyFacts = [
  { label: "Event Name", value: "Since AI Hackathon 2026" },
  { label: "Type", value: "In-person AI Hackathon" },
  {
    label: "Date",
    value: "November 2026 (exact dates to be announced)",
  },
  {
    label: "Location",
    value: "EduCity, Turku AMK, Turku, Finland",
  },
  { label: "Duration", value: "72 hours" },
  { label: "Expected Participants", value: "1,000+" },
  {
    label: "Open To",
    value: "Builders worldwide — students and professionals",
  },
  { label: "Language", value: "English" },
  {
    label: "MLH Partner",
    value: "Yes — Official 2026 Season Member Event",
  },
  {
    label: "Past Sponsors",
    value: "Valmet, Sandvik, Kongsberg, ElevenLabs, Antler",
  },
  { label: "Organized By", value: "Since AI (sinceai.fi)" },
  { label: "Participation Fee", value: "Free" },
];

export default function HackathonPage() {
  return (
    <SmoothScroll>
      <Navbar />

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="flex flex-col w-full bg-black min-h-screen">
        {/* SECTION 1 — Hero */}
        <section className="relative w-full min-h-[90vh] flex items-center justify-center">
          {/* Background image */}
          <Image
            src="/assets/images/educity.png"
            alt="EduCity building at Turku University of Applied Sciences"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-x-0 bottom-0 h-40 md:h-64 bg-linear-to-t from-black to-transparent" />

          <div className="relative z-10 max-w-5xl mx-auto px-6 py-32 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-8xl font-bold text-white mb-6 tracking-tight leading-tight">
                Since AI Hackathon 2026
              </h1>

              <p className="text-xl md:text-2xl text-neutral-300 max-w-3xl mx-auto mb-10">
                Europe&apos;s Premier Annual AI Hackathon — Turku, Finland
              </p>

              {/* Event: Nov 6-8, 2026. Starts 16:00, ends midnight Nov 8 */}
              <CountdownTimer
                startDate="2026-11-06T16:00:00"
                endDate="2026-11-09T00:00:00"
              />

              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-12 max-w-4xl mx-auto">
                {heroStats.map((stat) => (
                  <div key={stat.label}>
                    <div className="text-2xl md:text-3xl font-bold text-white mb-1">
                      {stat.value}
                    </div>
                    <div className="text-xs md:text-sm text-neutral-500 font-medium">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="#registration"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full hover:bg-neutral-100 transition-all duration-300"
                >
                  Get Notified — Registration Opening Soon
                </a>
                <Link
                  href="/partners"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-full hover:bg-white/15 border border-white/20 hover:border-white/30 transition-all duration-300 group"
                >
                  Become a Partner
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 2 — What is Since AI Hackathon? */}
        <section className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
                What is Since AI Hackathon?
              </h2>

              <div className="space-y-6 text-lg text-neutral-300 leading-relaxed">
                <p>
                  Since AI Hackathon is the flagship annual event organized by
                  Since AI — the leading AI builders community in Europe, based
                  in Turku, Finland. Founded in 2025, Since AI has grown to 500+
                  members across Europe with partners including Valmet, Sandvik,
                  Kongsberg, and the University of Turku.
                </p>
                <p>
                  The hackathon brings together AI developers, engineers,
                  researchers, and entrepreneurs for an intensive 72-hour
                  building sprint. Participants form teams and tackle real
                  industry challenges set by partner companies, shipping working
                  AI prototypes by the end of the event.
                </p>
                <p>
                  The inaugural edition in 2025 saw 260 participants ship 30+
                  projects. The 2026 edition, now an official MLH partner event,
                  is expected to welcome 1,000+ participants from Finland,
                  Europe, and worldwide.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 3 — Why Participate */}
        <section className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 tracking-tight text-center">
                Why Participate
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {whyCards.map((card, index) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                      {card.title}
                    </h3>
                    <p className="text-neutral-400 leading-relaxed">
                      {card.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 4 — Key Facts */}
        <section className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 tracking-tight">
                Since AI Hackathon 2026 — Key Facts
              </h2>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                <dl>
                  {keyFacts.map((fact, index) => (
                    <div
                      key={fact.label}
                      className={`flex flex-col sm:flex-row sm:items-center px-8 py-5 ${
                        index !== keyFacts.length - 1
                          ? "border-b border-white/5"
                          : ""
                      }`}
                    >
                      <dt className="text-sm font-semibold text-neutral-500 uppercase tracking-wider sm:w-56 flex-shrink-0 mb-1 sm:mb-0">
                        {fact.label}
                      </dt>
                      <dd className="text-base text-neutral-300">
                        {fact.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 5 — Venue */}
        <section className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
                Venue: EduCity, Turku
              </h2>

              <div className="relative w-full h-64 md:h-96 rounded-2xl overflow-hidden mb-8">
                <Image
                  src="/assets/images/educity.jpg"
                  alt="EduCity building at Turku University of Applied Sciences — venue for Since AI Hackathon 2026"
                  fill
                  className="object-cover"
                />
              </div>

              <p className="text-lg text-neutral-300 leading-relaxed mb-6 max-w-3xl">
                Since AI Hackathon 2026 takes place at EduCity — the modern
                campus of Turku University of Applied Sciences (Turku AMK).
                Located in the heart of Turku, Finland, EduCity provides
                state-of-the-art facilities for 1,000+ builders to collaborate,
                build, and compete.
              </p>

              <a
                href="https://maps.google.com/?q=EduCity+Turku+AMK+Joukahaisenkatu+3+Turku"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white hover:text-neutral-300 transition-colors group"
              >
                <span className="text-base font-medium">
                  View on Google Maps
                </span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </motion.div>
          </div>
        </section>

        {/* SECTION 6 — Partners & Sponsors */}
        <section className="relative w-full border-t border-white/5">
          <div className="max-w-5xl mx-auto px-6 pt-24 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Hackathon Partners & Sponsors
              </h2>
              <p className="text-lg text-neutral-400 max-w-2xl mx-auto mb-4">
                Since AI Hackathon attracts Finland and Europe&apos;s leading
                industrial, technology, and investment companies as sponsors and
                challenge providers.
              </p>
            </motion.div>
          </div>

          <TrustBar />

          <div className="max-w-5xl mx-auto px-6 pb-24 pt-8 text-center">
            <Link
              href="/partners"
              className="inline-flex items-center gap-2 text-white hover:text-neutral-300 transition-colors group text-base font-medium"
            >
              Interested in sponsoring?
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </section>

        {/* SECTION 7 — MLH Partnership */}
        <section className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">
                Official Major League Hacking Partner Event
              </h2>

              <div className="space-y-6 text-lg text-neutral-300 leading-relaxed">
                <p>
                  Since AI Hackathon 2026 is an official Major League Hacking
                  (MLH) Member Event for the 2026 season. MLH is the
                  world&apos;s largest hackathon league, supporting hundreds of
                  events annually across North America, Europe, and Asia.
                </p>
                <p>
                  As an official MLH partner event, Since AI Hackathon
                  participants gain access to the global MLH hacker community,
                  MLH-sponsored prizes and API credits, and official recognition
                  as part of the worldwide hackathon movement.
                </p>
              </div>

              <a
                href="https://mlh.io/eu"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white hover:text-neutral-300 transition-colors group mt-6"
              >
                <span className="text-base font-medium">
                  Learn more about MLH
                </span>
                <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </motion.div>
          </div>
        </section>

        {/* SECTION 8 — Past Editions */}
        <section className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 tracking-tight">
                Previous Since AI Hackathons
              </h2>

              <div className="border border-white/10 rounded-3xl p-8 md:p-12 bg-white/[0.02]">
                <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                  Since AI Hackathon 2025
                </h3>

                <p className="text-lg text-neutral-400 mb-6">
                  260 Participants — 30+ Projects Shipped — 10+ Partner Companies — Turku, Finland
                </p>

                <p className="text-base text-neutral-300 leading-relaxed mb-8">
                  The inaugural Since AI Hackathon brought together 260 builders
                  from across Finland and Europe. Teams tackled real industry
                  challenges from Kongsberg, Sandvik, Valmet, and 10+ other
                  partner companies, shipping over 30 AI prototypes in 72 hours.
                </p>

                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/projects"
                    className="inline-flex items-center gap-2 text-white hover:text-neutral-300 transition-colors group"
                  >
                    <span className="text-base font-medium">View projects</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                  <Link
                    href="/events"
                    className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors group"
                  >
                    <span className="text-base font-medium">All events</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 9 — Registration */}
        <section
          id="registration"
          className="relative w-full px-6 py-24 border-t border-white/5 scroll-mt-20"
        >
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Join Since AI Hackathon 2026
              </h2>

              <p className="text-2xl text-neutral-300 mb-6 font-semibold">
                Registration Opening Soon
              </p>

              <p className="text-lg text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                Since AI Hackathon 2026 registration will be announced soon. To
                be among the first to know when applications open — and to
                connect with other builders ahead of the event — join our
                community channels.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <a
                  href="https://discord.gg/6PC74zW68v"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full hover:bg-neutral-100 transition-all duration-300"
                >
                  Join Discord
                </a>
                <a
                  href="https://t.me/sinceaihq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-full hover:bg-white/15 border border-white/20 hover:border-white/30 transition-all duration-300"
                >
                  Join Telegram
                </a>
              </div>

              <p className="text-sm text-neutral-500 mb-12">
                Registration, dates, and partner challenges will be announced
                first in these channels.
              </p>

              <div className="border-t border-white/10 pt-8">
                <p className="text-neutral-400">
                  Are you a company interested in sponsoring or setting a
                  challenge?{" "}
                  <Link
                    href="/partners"
                    className="text-white hover:text-neutral-300 underline inline-flex items-center gap-1"
                  >
                    Partner with us
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SECTION 10 — FAQ */}
        <section className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-12 tracking-tight">
                Frequently Asked Questions
              </h2>

              <Accordion type="single" collapsible className="w-full space-y-2">
                {hackathonFaqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`faq-${index}`}
                    className="rounded-xl px-6 border border-white/5 data-[state=open]:bg-white/[0.03] transition-colors duration-200"
                  >
                    <AccordionTrigger className="text-left text-white font-semibold hover:no-underline py-5 text-lg">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-neutral-400 font-normal leading-relaxed pb-5 text-base">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </div>
        </section>

        <Footer discordUrl="https://discord.gg/6PC74zW68v" />
      </main>
    </SmoothScroll>
  );
}
