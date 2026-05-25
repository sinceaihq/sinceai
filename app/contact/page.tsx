"use client";
import React, { Suspense } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaLinkedin } from "react-icons/fa";

import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import ContactForm from "@/components/forms/ContactForm";
import { ButtonPair } from "@/components/ui/ButtonPair";

// Team members data organized by department
const teamSections = [
  {
    department: "Operations",
    members: [
      {
        name: "Riku Lauttia",
        role: "Operations Lead",
        email: "riku.lauttia@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/rikulauttia/",
        image: "/assets/team/riku.webp",
      },
    ],
  },
  {
    department: "Sales & Partnerships",
    members: [
      {
        name: "Tuomas Rikkonen",
        role: "Sales Lead",
        email: "tuomas.rikkonen@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/tuomas-rikkonen-8664421a9/",
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
        name: "Kasper Turunen",
        role: "Sales & Partnerships",
        email: "kasper@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/kasperturunen/",
      },
      {
        name: "Roope Kantola",
        role: "Sales & Partnerships",
        email: "roope.kantola@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/roope-kantola-131b23320/",
      },
    ],
  },
  {
    department: "Production",
    members: [
      {
        name: "Toki Mohammad Tahmid",
        role: "Production Lead",
        email: "toki@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/toki-mohammad-tahmid-a7b334159/",
        image: "/assets/team/toki.webp",
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
        name: "Eero Paloheimo",
        role: "Production",
        email: "eero@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/eero-paloheimo-6407883aa/",
      },
      {
        name: "Emil Erkkilä",
        role: "Production",
        email: "emil@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/emil-erkkila-302995349/",
      },
      {
        name: "Henrique Nunez",
        role: "Production",
        email: "henrique@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/henrique-nunez/",
      },
      {
        name: "Joan Iovchik",
        role: "Production",
        email: "joan@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/joan-iovchik-8b5b48314/",
      },
      {
        name: "Tzu Tai Huang",
        role: "Production",
        email: "tzu@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/tzu-tai-huang/",
      },
      {
        name: "Venla Raassina",
        role: "Production",
        email: "venla.raassina@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/venlaraassina/",
        image: "/assets/team/venla.webp",
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
    department: "Technology",
    members: [
      {
        name: "Otso Saarinen",
        role: "Technical Lead",
        email: "otso.saarinen@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/otsosaarinen/",
        image: "/assets/team/otso.webp",
        imagePosition: "40% center",
      },
      {
        name: "Abel Alem",
        role: "Technology",
        email: "abel@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/abel-alem-25420b263",
        image: "/assets/team/abel.webp",
      },
      {
        name: "Theo Wilenius",
        role: "Technology",
        email: "theo.wilenius@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/tabw/",
        image: "/assets/team/theo.webp",
      },
      {
        name: "Georg Wahlroos",
        role: "Technology",
        email: "georg@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/georg-wahlroos-689267180/",
      },
      {
        name: "Joonatan Laato",
        role: "Technology",
        email: "joonatan.laato@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/joonatan-laato-19b3521b4/",
      },
      {
        name: "Lehel Denes",
        role: "Technology",
        email: "lehel@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/lehel-d-4a20a634b/",
      },
      {
        name: "Ville Tuuli",
        role: "Technology",
        email: "ville@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/ville-tuuli-67abab289/",
      },
      {
        name: "Zain Taufique",
        role: "Technology",
        email: "zain@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/zain-taufique-20273179/",
      },
    ],
  },
  {
    department: "Marketing",
    members: [
      {
        name: "Aarne Ollila",
        role: "Marketing Lead",
        email: "aarne.ollila@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/aarneollila/",
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
      {
        name: "Shanuri Perera",
        role: "Social Media & Content",
        email: "shanuri@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/shanuri-perera-19a3483b3/",
      },
    ],
  },
  {
    department: "Community",
    members: [
      {
        name: "Hasnain Ajmal",
        role: "Community Lead",
        email: "hasnain@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/hasnaynajmal/",
        image: "/assets/team/hasnain.webp",
      },
    ],
  },
  {
    department: "Finance",
    members: [
      {
        name: "Arttu Karonen",
        role: "Finance Lead",
        email: "arttu.karonen@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/arttu-karonen-526872261/",
        image: "/assets/team/arttu-k.webp",
      },
      {
        name: "Ville Vanhala",
        role: "Finance",
        email: "ville.vanhala@sinceai.fi",
        linkedin: "https://www.linkedin.com/in/ville-vanhala-99b816398/",
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

// Sort non-lead members: by role title A-Z, then images first within each role, then name A-Z
function sortMembers(members: TeamMember[]): TeamMember[] {
  return [...members].sort((a, b) => {
    const roleCompare = a.role.localeCompare(b.role);
    if (roleCompare !== 0) return roleCompare;
    const aHasImg = a.image ? 0 : 1;
    const bHasImg = b.image ? 0 : 1;
    if (aHasImg !== bHasImg) return aHasImg - bHasImg;
    return a.name.localeCompare(b.name);
  });
}

// Featured lead card — full width, horizontal layout
const LeadCard: React.FC<{ person: TeamMember }> = ({ person }) => (
  <div className="flex items-center gap-4 sm:gap-6 p-4 sm:p-6 border border-white/15 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05] transition-all duration-300">
    <div className="relative w-16 h-16 sm:w-24 sm:h-24 shrink-0 overflow-hidden bg-white/5">
      {person.image ? (
        <Image
          src={person.image}
          alt={person.name}
          fill
          className="object-cover"
          style={{ objectPosition: person.imagePosition ?? "center" }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Image
            src="/assets/logo/SINCE AI white.png"
            alt={person.name}
            width={36}
            height={36}
            className="object-contain opacity-30"
          />
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-white font-semibold text-xl tracking-tight leading-tight">{person.name}</h3>
      <p className="text-neutral-400 text-sm mt-0.5">{person.role}</p>
      <div className="mt-3 space-y-2">
        {person.email && (
          <a href={`mailto:${person.email}`} className="text-sm text-neutral-500 hover:text-white transition-colors break-all block">
            {person.email}
          </a>
        )}
        {person.linkedin && (
          <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-white transition-colors inline-block">
            <FaLinkedin size={15} />
          </a>
        )}
      </div>
    </div>
  </div>
);

// Compact member card — photo, name, role only
const MemberCard: React.FC<{ person: TeamMember }> = ({ person }) => (
  <div className="flex items-center gap-3 p-4 border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-300">
    <div className="relative w-14 h-14 shrink-0 overflow-hidden bg-white/5">
      {person.image ? (
        <Image
          src={person.image}
          alt={person.name}
          fill
          className="object-cover"
          style={{ objectPosition: person.imagePosition ?? "center" }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Image
            src="/assets/logo/SINCE AI white.png"
            alt={person.name}
            width={20}
            height={20}
            className="object-contain opacity-25"
          />
        </div>
      )}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-white text-sm font-medium tracking-tight truncate">{person.name}</p>
      <p className="text-neutral-500 text-xs truncate">{person.role}</p>
      {person.email && (
        <a href={`mailto:${person.email}`} className="text-neutral-600 text-xs hover:text-white transition-colors break-all block mt-0.5">
          {person.email}
        </a>
      )}
    </div>
    {person.linkedin && (
      <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 self-start text-neutral-600 hover:text-white transition-colors">
        <FaLinkedin size={15} />
      </a>
    )}
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
            transition={{ duration: 0.8, delay: 0, ease: [0.22, 1, 0.36, 1] }}
          >
            Let&apos;s build together.
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-neutral-400 max-w-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0, ease: [0.22, 1, 0.36, 1] }}
          >
            Questions about partnerships, events, or community? We typically respond within 24 hours.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center gap-4 pt-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0, ease: [0.22, 1, 0.36, 1] }}
          >
            <ButtonPair
              primaryLabel="Join Discord"
              primaryHref={config.discordUrl}
              secondaryLabel="Email Us"
              secondaryHref="mailto:info@sinceai.fi"
            />
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
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Team
            </h2>
            <p className="text-lg text-neutral-400 max-w-xl mx-auto">
              Reach out directly to the right person.
            </p>
          </motion.div>

          <div className="space-y-12">
            {teamSections.map((section, sectionIndex) => (
              <motion.div
                key={section.department}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: sectionIndex * 0.06, ease: "easeOut" }}
              >
                <p className="text-xs font-mono uppercase tracking-widest text-neutral-300 mb-4">
                  {section.department}
                </p>
                {/* Lead */}
                <LeadCard person={section.members[0]} />
                {/* Rest of team */}
                {section.members.length > 1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {sortMembers(section.members.slice(1)).map((person, i) => (
                      <MemberCard key={i} person={person} />
                    ))}
                  </div>
                )}
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
            transition={{ duration: 0.6, ease: "easeOut" }}
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
                transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                className="border border-white/5 p-6 hover:border-white/10 transition-colors"
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
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          >
            <a
              href="/faq"
              className="inline-flex items-center gap-2 text-neutral-400 hover:text-white transition-colors text-sm"
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
