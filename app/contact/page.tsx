"use client";
import React, { Suspense } from "react";
import Image from "next/image";
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
        name: "Riku Lauttia",
        role: "Sales & Operations",
        email: "riku.lauttia@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/rikulauttia/",
        image: "/assets/team/riku.webp",
      },
      {
        name: "Aarne Ollila",
        role: "Sales & Partnerships",
        email: "aarne.ollila@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/aarneollila/",
      },
      {
        name: "Aman Vyas",
        role: "Sales & Partnerships",
        email: "aman@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/aman--vyas/",
      },
      {
        name: "Arttu Myyryläinen",
        role: "Sales & Partnerships",
        email: "arttu.myyrylainen@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/arttumyyrylainen/",
      },
      {
        name: "Axel Eriksson",
        role: "Sales & Partnerships",
        email: "axel.eriksson@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/axel-eriksson-360796365/",
      },
      {
        name: "Eemil Ketonen",
        role: "Sales & Partnerships",
        email: "eemil.ketonen@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/eemil-ketonen-398a792b3/",
      },
      {
        name: "Henri Mäki",
        role: "Sales & Partnerships",
        email: "henri.maki@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/henri-m%C3%A4ki-4409192b7/",
      },
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
        name: "Roope Kantola",
        role: "Sales & Partnerships",
        email: "roope.kantola@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/roope-kantola-131b23320/",
      },
      {
        name: "Tuomas Rikkonen",
        role: "Sales & Partnerships",
        email: "tuomas.rikkonen@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/tuomas-rikkonen-8664421a9/",
      },
      {
        name: "Kasper Turunen",
        role: "Sales & Partnerships",
        email: "kasper@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/kasperturunen/",
      },
    ],
  },
  
  {
    department: "Community & Content",
    members: [
      {
        name: "Hasnain Ajmal",
        role: "Community & Content",
        email: "hasnain@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/hasnaynajmal/",
        image: "/assets/team/hasnain.webp",
      },
      {
        name: "Abdul Wasay",
        role: "Marketing",
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
        name: "Juuso Pörsti",
        role: "Marketing",
        email: "juuso@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/juusoporsti/",
      },
      {
        name: "Manu Kankaanniemi",
        role: "Marketing & Content",
        email: "manu@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/manu-kankaanniemi-38718b312/",
      },
      {
        name: "Taneli Hautala",
        role: "Marketing & Content",
        email: "taneli@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/taneli-hautala-797192312/",
      },
      {
        name: "Hafiza Munawar",
        role: "Social Media & Content",
        email: "hafiza@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/hafiza-aqsa-munawar/",
      },
    ],
  },
  {
    department: "Tech & Development",
    members: [
      {
        name: "Abel Alem",
        role: "Development",
        email: "abel@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/abel-alem-25420b263",
        image: "/assets/team/abel.webp",
      },
      {
        name: "Otso Saarinen",
        role: "Development",
        email: "otso.saarinen@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/otsosaarinen/",
        image: "/assets/team/otso.webp",
        imagePosition: "40% center",
      },
      {
        name: "Theo Wilenius",
        role: "Development",
        email: "theo.wilenius@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/tabw/",
        image: "/assets/team/theo.webp",
      },
      {
        name: "Zain Taufique",
        role: "Tech & Development",
        email: "zain@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/zain-taufique-20273179/",
      },
    ],
  },
  {
    department: "Production",
    members: [
      {
        name: "Toki Mohammad Tahmid",
        role: "Production",
        email: "toki@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/toki-mohammad-tahmid-a7b334159/",
        image: "/assets/team/toki.webp",
      },
      {
        name: "Venla Raassina",
        role: "Production",
        email: "venla.raassina@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/venlaraassina/",
        image: "/assets/team/venla.webp",
      },
      {
        name: "Anniina Kankaanpää",
        role: "Production",
        email: "anniina.kankaanpaa@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/anniina-kankaanpää-4b5023358/",
      },
      {
        name: "Christian Lairikko",
        role: "Production",
        email: "christian.lairikko@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/christian-lairikko-943657376/",
      },
      {
        name: "Joan Iovchik",
        role: "Production",
        email: "joan@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/joan-iovchik-8b5b48314/",
      },
      {
        name: "Tzu Tai Huang",
        role: "Production & Volunteers",
        email: "tzu@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/tzu-tai-huang/",
      },
      {
        name: "Emil Erkkilä",
        role: "Production",
        email: "emil@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/emil-erkkila-302995349/",
      },
      {
        name: "Eero Paloheimo",
        role: "Production",
        email: "eero@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/eero-paloheimo-6407883aa/",
      },
      {
        name: "Radin Dabbagh",
        role: "Production & Marketing",
        email: "radin@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/radin-dabbagh-rezeiyeh-b64687225/",
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
        image: "/assets/team/arttu-k.webp",
      },
    ],
  },
];

// Configuration
const config = {
  discordUrl: "https://discord.com/invite/YkqJswRGSW",
};

// Team member type
interface TeamMember {
  name: string;
  role: string;
  email?: string;
  number?: string;
  linkedin?: string;
  instagram?: string;
  image?: string;
  imagePosition?: string;
}

// Team Card Component - Lean & Premium
const TeamCard: React.FC<{ person: TeamMember }> = ({ person }) => (
  <div
    className="group relative border border-white/5 rounded-xl p-6 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-300 text-center"
  >
    <div className="flex justify-center mb-4">
      <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-white/5 border border-white/10">
        {person.image ? (
          <Image
            src={person.image}
            alt={person.name}
            fill
            className="object-cover"
            style={{ objectPosition: person.imagePosition ?? "center" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-4">
            <Image
              src="/assets/logo/SINCE AI white.png"
              alt={person.name}
              width={64}
              height={64}
              className="object-contain opacity-40"
            />
          </div>
        )}
      </div>
    </div>
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
  </div>
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
            Let&apos;s build together.
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
                      <TeamCard person={person} />
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
                a: "All events are in Turku, Finland. We're building a global AI community with strong local roots."
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
