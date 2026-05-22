import React from "react";

import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FadeIn } from "@/components/motion-primitives/fade-in";

export default function CodeOfConductPage() {
  return (
    <SmoothScroll>
      <Navbar />
      
      <main className="flex flex-col w-full bg-black min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-32 md:py-40">
          <FadeIn>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
              Code of Conduct
            </h1>
            
            <div className="prose prose-invert prose-neutral max-w-none">
              <p className="text-xl text-neutral-300 leading-relaxed mb-8">
                Since AI is committed to providing a safe, inclusive, and welcoming environment for all members 
                of our community. With 1000+ members across Finland and beyond, we maintain these standards to 
                ensure everyone can participate, learn, and collaborate effectively.
              </p>

              <p className="text-lg text-neutral-400 leading-relaxed mb-12">
                This Code of Conduct applies to all Since AI spaces, including hackathons, workshops, Discord 
                community, social media, and any other community interactions. All participants—attendees, 
                speakers, sponsors, volunteers, and organizers—are expected to follow these guidelines.
              </p>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Our Pledge
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  We pledge to make participation in Since AI a harassment-free experience for everyone, 
                  regardless of age, body size, disability, ethnicity, gender identity and expression, 
                  level of experience, nationality, personal appearance, race, religion, or sexual identity 
                  and orientation.
                </p>
                <p className="text-neutral-300 leading-relaxed">
                  We are committed to building a community where diverse perspectives are valued and everyone 
                  feels empowered to contribute.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Expected Behavior
                </h2>
                <ul className="space-y-3 text-neutral-300">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span><strong className="text-white">Be respectful:</strong> Treat all community members with respect. Disagree constructively and focus on ideas, not people.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span><strong className="text-white">Be inclusive:</strong> Welcome newcomers. Use inclusive language. Make space for diverse voices and perspectives.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span><strong className="text-white">Be collaborative:</strong> Share knowledge freely. Help others learn. Give credit where it&apos;s due.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span><strong className="text-white">Be professional:</strong> Maintain professional standards in all interactions, especially when representing the community.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span><strong className="text-white">Be mindful:</strong> Consider the impact of your words and actions. If someone asks you to stop a behavior, respect that request.</span>
                  </li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Unacceptable Behavior
                </h2>
                <p className="text-neutral-300 mb-4">
                  The following behaviors are considered harassment and are unacceptable:
                </p>
                <ul className="space-y-3 text-neutral-300 mb-6">
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold mt-1">✗</span>
                    <span>Violence, threats of violence, or violent language directed against another person</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold mt-1">✗</span>
                    <span>Sexist, racist, homophobic, transphobic, ableist, or otherwise discriminatory jokes and language</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold mt-1">✗</span>
                    <span>Posting or displaying sexually explicit or violent material</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold mt-1">✗</span>
                    <span>Personal insults, particularly those related to protected characteristics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold mt-1">✗</span>
                    <span>Unwelcome sexual attention or advances</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold mt-1">✗</span>
                    <span>Deliberate intimidation, stalking, or following (online or in person)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold mt-1">✗</span>
                    <span>Harassing photography or recording</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold mt-1">✗</span>
                    <span>Sustained disruption of talks, events, or community discussions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-red-400 font-bold mt-1">✗</span>
                    <span>Advocating for, or encouraging, any of the above behavior</span>
                  </li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Consequences
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  Unacceptable behavior will not be tolerated. Anyone asked to stop unacceptable behavior 
                  is expected to comply immediately.
                </p>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  If a community member engages in unacceptable behavior, organizers may take any action 
                  they deem appropriate, including:
                </p>
                <ul className="space-y-2 text-neutral-300 mb-4">
                  <li>• Warning the offender</li>
                  <li>• Temporary ban from the community or event</li>
                  <li>• Permanent ban from the community and all events</li>
                  <li>• Reporting to appropriate authorities if illegal behavior is involved</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Reporting
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  If you experience or witness unacceptable behavior, or have any other concerns, please 
                  report it as soon as possible:
                </p>
                <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02] mb-6">
                  <p className="text-neutral-300 mb-2">
                    <strong className="text-white">Email:</strong> info@sinceai.fi
                  </p>
                  <p className="text-neutral-300 mb-2">
                    <strong className="text-white">During events:</strong> Contact any organizer (identifiable by Since AI staff badges)
                  </p>
                  <p className="text-neutral-300">
                    <strong className="text-white">Discord:</strong> Direct message any moderator or use the @moderators tag
                  </p>
                </div>
                <p className="text-neutral-400 leading-relaxed mb-4">
                  All reports will be handled with discretion. We will respect confidentiality requests 
                  to protect victims of abuse. We may publicly name a person about whom we&apos;ve received 
                  harassment complaints, or privately warn third parties about them, if we believe that 
                  doing so will increase the safety of our members or the general public.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Scope
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  This Code of Conduct applies to all Since AI community spaces, including:
                </p>
                <ul className="space-y-2 text-neutral-300">
                  <li>• In-person hackathons and events in Turku and other locations</li>
                  <li>• Discord community (all channels and direct messages)</li>
                  <li>• Social media (LinkedIn, Instagram, X/Twitter, Facebook)</li>
                  <li>• Email communications</li>
                  <li>• GitHub repositories and discussions</li>
                  <li>• Any other Since AI-affiliated spaces</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Attribution
                </h2>
                <p className="text-neutral-400 leading-relaxed">
                  This Code of Conduct is adapted from the Contributor Covenant (version 2.1) and the 
                  Conference Code of Conduct. We thank those communities for their work in establishing 
                  community standards.
                </p>
              </section>

              <section className="mb-12 p-8 rounded-xl border border-white/10 bg-white/[0.02]">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  Questions?
                </h2>
                <p className="text-neutral-300 mb-4">
                  If you have questions about this Code of Conduct, please contact us at{" "}
                  <a href="mailto:info@sinceai.fi" className="text-white hover:text-neutral-300 underline">
                    info@sinceai.fi
                  </a>.
                </p>
                <p className="text-neutral-400 text-sm">
                  Last updated: January 20, 2026
                </p>
              </section>
            </div>
          </FadeIn>
        </div>

        <Footer discordUrl="https://discord.com/invite/YkqJswRGSW" />
      </main>
    </SmoothScroll>
  );
}
