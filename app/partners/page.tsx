"use client";
import React from "react";
import Link from "next/link";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { motion } from "framer-motion";
import { Users, Briefcase, Trophy, Megaphone, ArrowRight, Calendar, CheckCircle } from "lucide-react";
import { UPCOMING_EVENT_2026 } from "@/lib/sinceai";
import { partnerCompanies, supportingPartners } from "@/lib/partners";

export default function PartnersPage() {
  const stats = [
    { value: "1000+", label: "AI Developers", description: "In our Discord community" },
    { value: "200+", label: "Hackathon Participants", description: "Per major event" },
    { value: "80%", label: "Placement Rate", description: "Partners hired our members" },
    { value: "30+", label: "Projects Built", description: "Real AI solutions delivered" },
  ];

  const valueProps = [
    {
      icon: Users,
      title: "Access Top AI Talent",
      description: "Connect with 1000+ AI developers, ML engineers, researchers, and founders. 80% of our partner companies have successfully hired from our community.",
      outcomes: [
        "Direct access to pre-vetted developers",
        "Recruiting events with 200+ attendees",
        "Job board access for 1000+ Discord members",
        "Resume database from hackathon participants",
      ],
    },
    {
      icon: Briefcase,
      title: "Solve Real Business Challenges",
      description: "Present your AI/ML challenges at hackathons. Get 10-15 teams building solutions over 48 hours with fresh perspectives and cutting-edge approaches.",
      outcomes: [
        "10-15 solution prototypes in 48 hours",
        "Access to innovative AI approaches",
        "POCs ready for internal testing",
        "Technical reports and documentation",
      ],
    },
    {
      icon: Megaphone,
      title: "Build Brand Awareness",
      description: "Position your company as an AI innovation leader. Reach 1000+ developers through hackathons, social media, and community engagement.",
      outcomes: [
        "Logo placement on website & materials",
        "Social media mentions (3,000+ reach)",
        "Speaking opportunities at events",
        "Blog posts and case studies",
      ],
    },
    {
      icon: Trophy,
      title: "Support the AI Ecosystem",
      description: "Invest in the future of AI in Finland. Help build a thriving community that advances the field and creates opportunities for everyone.",
      outcomes: [
        "CSR and community impact",
        "Pipeline for future talent",
        "Advance AI research and applications",
        "Strengthen regional tech ecosystem",
      ],
    },
  ];

  const testimonials = [
    {
      quote: "We met highly capable builders and moved from introductions to interviews fast. The quality was senior-level—clear thinking, clean implementation, and strong communication.",
      author: "Partner, Engineering",
      company: "",
      result: "Recruiting + collaboration outcomes",
    },
    {
      quote: "In one weekend we saw more solution diversity than we typically get in months. Multiple teams delivered demo-ready prototypes we could immediately test internally.",
      author: "Partner, Product & Technology",
      company: "",
      result: "Prototype-ready deliverables",
    },
    {
      quote: "The biggest surprise was execution speed. Teams didn't just generate ideas—they shipped working systems, explained trade-offs, and presented like a professional product team.",
      author: "Partner, Innovation / Talent",
      company: "",
      result: "High-signal brand + talent pipeline",
    },
  ];

  return (
    <SmoothScroll>
      <Navbar />
      
      <main className="flex flex-col w-full bg-black min-h-screen">
        {/* Hero Section */}
        <section className="relative w-full px-6 py-32 md:py-40">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-4xl"
            >
              <div className="text-xs md:text-sm font-medium text-neutral-500 tracking-wider uppercase mb-6">
                Partner With Us
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
                Access 1000+ AI Developers.
                <br />
                <span className="bg-gradient-to-b from-white to-neutral-500 bg-clip-text text-transparent">
                  Build Real Solutions.
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-neutral-400 leading-relaxed mb-8">
                Partner with Since AI to recruit top talent, solve technical challenges, and build 
                your brand in Finland&apos;s largest AI community. 80% of our partners have successfully 
                hired developers from our hackathons.
              </p>

              {/* Upcoming Event Notice */}
              <Link
                href="/hackathon"
                className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/5 border border-white/10 mb-12 hover:border-white/20 hover:bg-white/[0.08] transition-all group"
              >
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span className="text-sm font-medium text-neutral-400">
                  Sponsor <span className="text-white group-hover:text-neutral-200 transition-colors">Since AI Hackathon 2026</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </Link>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/contact?subject=Partnership%20Inquiry"
                  className="px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-neutral-100 transition-colors inline-flex items-center gap-2"
                >
                  Become a Partner
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="relative w-full px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="p-6 rounded-2xl border border-white/10 bg-white/[0.02]"
                >
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm font-semibold text-neutral-300 mb-1">
                    {stat.label}
                  </div>
                  <div className="text-xs text-neutral-600">
                    {stat.description}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Current Partners */}
        <section className="relative w-full px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Trusted by Leading Companies
              </h2>
              <p className="text-lg text-neutral-400">
                Join 15+ companies investing in Finland&apos;s AI community
              </p>
            </div>

            {/* Sponsors */}
            <p className="text-xs uppercase tracking-widest text-neutral-600 font-semibold text-center mb-10">
              Partners
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-16 gap-y-10 items-center justify-items-center mb-16">
              {partnerCompanies.map((partner, index) => (
                <motion.div
                  key={partner.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <a
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center min-w-[120px] h-16"
                  >
                    <img
                      src={partner.logo}
                      alt={`${partner.name} logo`}
                      style={{ height: '64px', width: 'auto' }}
                      className="object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                    />
                  </a>
                </motion.div>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-white/5 my-14" />

            {/* Supporting Partners */}
            <p className="text-xs uppercase tracking-widest text-neutral-600 font-semibold text-center mb-10">
              Supporting Partners
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-16 gap-y-10 items-center justify-items-center">
              {supportingPartners.map((partner, index) => (
                <motion.div
                  key={partner.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                >
                  <a
                    href={partner.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-center min-w-[120px] h-16"
                  >
                    <img
                      src={partner.logo}
                      alt={`${partner.name} logo`}
                      style={{ height: '64px', width: 'auto' }}
                      className="object-contain grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                    />
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Value Propositions */}
        <section className="relative w-full px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                Why Partner With Since AI?
              </h2>
              <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
                Concrete outcomes that drive business value
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {valueProps.map((prop, index) => (
                <motion.div
                  key={prop.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="p-8 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <prop.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                        {prop.title}
                      </h3>
                      <p className="text-neutral-400 leading-relaxed">
                        {prop.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pl-4 border-l-2 border-white/10">
                    {prop.outcomes.map((outcome, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-neutral-400">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="relative w-full px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                What Partners Say
              </h2>
              <p className="text-xl text-neutral-400">
                Real outcomes from real collaborations
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="p-8 rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col"
                >
                  <p className="text-neutral-300 leading-relaxed mb-6 flex-1 italic">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="space-y-3 pt-6 border-t border-white/10">
                    <div>
                      <div className="font-semibold text-white">{testimonial.author}</div>
                    </div>
                    <div className="inline-block px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold">
                      {testimonial.result}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* What surprised partners most */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto"
            >
              <div className="p-8 md:p-10 rounded-2xl border border-white/10 bg-white/[0.02]">
                <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  What surprised partners most
                </h3>
                <div className="space-y-4 text-neutral-300 leading-relaxed">
                  <p>
                    Many partners came in expecting early-stage concepts. Instead, they were genuinely surprised by how far teams could push a solution in 72 hours—not just prototypes, but testable, demo-ready systems with clear reasoning and trade-offs.
                  </p>
                  <p>
                    What made the difference was team composition: several teams naturally formed like real startups—a strong software engineer, an AI/ML engineer, a commercially minded builder, and a confident presenter. The result wasn&apos;t &ldquo;hackathon theater&rdquo;; for many partners, the output was already good enough for a first internal pilot right after the event.
                  </p>
                </div>
                <p className="text-sm text-neutral-500 mt-6 italic">
                  Company names and exact numbers are shared privately.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative w-full px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="p-12 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent text-center"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Ready to Partner With Since AI?
              </h2>
              <p className="text-lg text-neutral-400 mb-8 max-w-2xl mx-auto">
                Join Valmet, Sandvik, Kongsberg, ElevenLabs, and 10+ other leading companies 
                investing in Finland&apos;s AI community. Let&apos;s discuss how we can help you achieve 
                your goals.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href="/contact?subject=Partnership%20Inquiry"
                  className="px-8 py-4 rounded-full bg-white text-black font-semibold hover:bg-neutral-100 transition-colors inline-flex items-center gap-2"
                >
                  Become a Partner
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/events"
                  className="px-8 py-4 rounded-full bg-white/10 text-white font-semibold hover:bg-white/15 transition-colors border border-white/20"
                >
                  View Past Events
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        <Footer discordUrl="https://discord.com/invite/YkqJswRGSW" />
      </main>
    </SmoothScroll>
  );
}
