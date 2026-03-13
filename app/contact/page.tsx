"use client";
import React, { Suspense } from "react";
import { motion } from "framer-motion";
import { FaLinkedin } from "react-icons/fa";

import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import ContactForm from "@/components/ContactForm";

// Team members data organized by department
const teamSections = [
  {
    department: "Sales & Partnerships",
    members: [
      {
        name: "Joonas Ukkonen",
        role: "Sales & Partnerships",
        email: "joonas.ukkonen@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/joonas-ukkonen-29844022b/",
      },
      {
        name: "Juho Salmi",
        role: "Sales & Partnerships",
        email: "juho.salmi@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/juho-salmi-381609370/",
      },
      {
        name: "Tuomas Rikkonen",
        role: "Sales & Partnerships",
        email: "tuomas.rikkonen@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/tuomas-rikkonen-8664421a9/",
      },
      {
        name: "Aarne Ollila",
        role: "Sales & Partnerships",
        email: "aarne.ollila@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/aarneollila/",
      },
      {
        name: "Arttu Myyryläinen",
        role: "Sales & Partnerships",
        email: "arttu.myyrylainen@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/arttumyyrylainen/",
      },
      {
        name: "Aman Vyas",
        role: "Sales & Partnerships",
        email: "aman@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/aman--vyas/",
      },
      {
        name: "Riku Lauttia",
        role: "Sales & Operations",
        email: "riku.lauttia@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/rikulauttia/",
      },
    ],
  },
  
  {
    department: "Community & Content",
    members: [
      {
        name: "Abdul Wasay",
        role: "Content",
        email: "abdul@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/abdulwasaymuhammad/",
      },
      {
        name: "Adeelia Koponen",
        role: "Marketing",
        email: "adeelia.koponen@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/adeelia-koponen-37a492379/",
      },
      {
        name: "Vishaka Salpiumi",
        role: "Social Media",
        linkedin: "https://www.linkedin.com/in/vishaka-salpiumi-3b6578349/",
      },
    ],
  },
  {
    department: "Technology",
    members: [
      {
        name: "Abel Alem",
        role: "Web & Tech",
        email: "abel@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/abel-alem-25420b263",
      },
      {
        name: "Otso Saarinen",
        role: "Tech",
        email: "otso.saarinen@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/otsosaarinen/",
      },
      {
        name: "Theo Wilenius",
        role: "Tech",
        email: "theo.wilenius@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/tabw/",
      },
    ],
  },
  {
    department: "Production",
    members: [
      {
        name: "Venla Raassina",
        role: "Production",
        email: "venla.raassina@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/venlaraassina/",
      },
      {
        name: "Toki Mohammad Tahmid",
        role: "Production",
        email: "toki@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/toki-mohammad-t-a7b334159/",
      },
      {
        name: "Tzu Tai Huang",
        role: "Production & Volunteers",
        email: "tzu@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/tzu-tai-huang/",
      },
    ],
  },
  {
    department: "Finance",
    members: [
      {
        name: "Arttu Karonen",
        role: "Finance",
        email: "arttu.karonen@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/arttu-karonen-526872261/",
      },
      {
        name: "Roope Kantola",
        role: "Finance",
        email: "roope.kantola@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/roope-kantola-131b23320/",
      },
    ],
  },
];

// Configuration
const config = {
  discordUrl: "https://discord.gg/6PC74zW68v",
};

// Team member type
interface TeamMember {
  name: string;
  role: string;
  email?: string;
  number?: string;
  linkedin?: string;
  instagram?: string;
}

// Team Card Component - Lean & Premium
const TeamCard: React.FC<{ person: TeamMember; index: number }> = ({ person, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.05 }}
    className="group relative border border-white/5 rounded-xl p-6 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-300 text-center"
  >
    <div className="space-y-3">
      <div>
        <h3 className="text-white font-semibold text-lg tracking-tight">
          {person.name}
        </h3>
        <p className="text-neutral-500 text-sm mt-1">
          {person.role}
        </p>
      </div>

      {person.email && (
        <a
          href={`mailto:${person.email}`}
          className="text-sm text-neutral-600 hover:text-white transition-colors block"
        >
          {person.email}
        </a>
      )}

      {person.linkedin && (
        <a
          href={person.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 text-sm text-neutral-600 hover:text-white transition-colors w-full"
        >
          <FaLinkedin size={16} />
          <span>LinkedIn</span>
        </a>
      )}
    </div>
  </motion.div>
);

// Contact Page Content Component (uses useSearchParams)
function ContactPageContent() {
  return (
    <>
      {/* Hero Section - Lean & Minimal */}
      <section className="relative w-full min-h-[70vh] flex flex-col items-center justify-center px-6 py-32">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-neutral-950 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_65%)]" />
        </div>

        <div className="relative z-20 flex flex-col items-center space-y-8 text-center max-w-4xl mx-auto">
          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tighter leading-tight text-white"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            Let's build together.
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-neutral-400 max-w-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            Questions about partnerships, events, or community? We typically respond within 24 hours.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center gap-4 pt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <a
              href={config.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-black bg-white rounded-full transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02]"
            >
              Join Discord
            </a>
            <a
              href="mailto:info@sinceai.fi"
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-full transition-all duration-300 hover:bg-white/15 backdrop-blur-xl border border-white/20 hover:border-white/30 hover:scale-[1.02]"
            >
              Email Us
            </a>
          </motion.div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="w-full bg-black py-24 px-6 border-t border-white/5">
        <div className="max-w-2xl mx-auto">
          <ContactForm />
        </div>
      </section>

      {/* Team Section - Organized by Department */}
      <section className="w-full bg-black py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Team
            </h2>
            <p className="text-lg text-neutral-400 max-w-xl mx-auto">
              Reach out directly to the right person.
            </p>
          </motion.div>

          <div className="space-y-16">
            {teamSections.map((section, sectionIndex) => (
              <motion.div
                key={section.department}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: sectionIndex * 0.1 }}
              >
                <h3 className="text-2xl font-bold text-white mb-6 tracking-tight">
                  {section.department}
                </h3>
                <div className="flex flex-wrap justify-start gap-6">
                  {section.members.map((person, index) => (
                    <div key={index} className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                      <TeamCard person={person} index={index} />
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick FAQ - Minimal */}
      <section className="w-full bg-black py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Quick answers
            </h2>
            <p className="text-lg text-neutral-400">
              Common questions about Since AI.
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                q: "How do I join the community?",
                a: "Join our Discord server. That's where everything happens — events, projects, and daily discussions."
              },
              {
                q: "Can companies partner with Since AI?",
                a: "Yes. We offer challenge partnerships, recruiting access, and workshops. Email aarne.ollila@sinceai.fi or visit our /partners page."
              },
              {
                q: "Where are your events held?",
                a: "All events are in Turku, Finland. We're building Europe's strongest AI community from one city, with global reach."
              },
              {
                q: "Is Since AI only for students?",
                a: "No. We welcome builders, researchers, founders, and professionals working on AI projects."
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors"
              >
                <h3 className="text-white font-semibold text-lg mb-2">
                  {faq.q}
                </h3>
                <p className="text-neutral-400 leading-relaxed">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <a
              href="/faq"
              className="inline-flex items-center gap-2 text-neutral-600 hover:text-white transition-colors text-sm"
            >
              View all FAQs →
            </a>
          </motion.div>
        </div>
      </section>
    </>
  );
}

// Main Contact Page Component
export default function ContactPage() {
  return (
    <SmoothScroll>
      <Navbar />
      
      <main className="flex flex-col w-full bg-black min-h-screen">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        }>
          <ContactPageContent />
        </Suspense>

        {/* Footer */}
        <Footer discordUrl={config.discordUrl} />
      </main>
    </SmoothScroll>
  );
}
