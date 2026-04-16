import React from "react";
import Link from "next/link";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { FadeIn } from "@/components/motion-primitives/fade-in";
import { Download, Mail } from "lucide-react";

export default function PressPage() {
  const stats = [
    { label: "Community Members", value: "1000+" },
    { label: "Hackathon Participants", value: "200+" },
    { label: "Partner Companies", value: "15+" },
    { label: "AI Projects Built", value: "30+" },
  ];

  const pressKit = [
    { name: "Since AI Full Logo (Black)", file: "/assets/logo/SINCE AI full black.png" },
    { name: "Since AI Full Logo (White)", file: "/assets/logo/SINCE AI full white.png" },
    { name: "Since AI Logo Mark (Black)", file: "/assets/logo/SINCE AI black.png" },
    { name: "Since AI Logo Mark (White)", file: "/assets/logo/SINCE AI white.png" },
  ];

  return (
    <SmoothScroll>
      <Navbar />
      
      <main className="flex flex-col w-full bg-black min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-32 md:py-40">
          <FadeIn>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
              Press & Media
            </h1>
            
            <div className="prose prose-invert prose-neutral max-w-none">
              <p className="text-xl text-neutral-300 leading-relaxed mb-8">
                Since AI is Europe&apos;s only full-lifecycle AI innovation ecosystem with 1000+ members,
                based in Turku, Finland. We support AI projects from challenge ideation through hackathon
                building to production deployment and commercialization.
              </p>

              <p className="text-lg text-neutral-400 leading-relaxed mb-12">
                <strong className="text-white">In one sentence: </strong> Since AI is Europe&apos;s only AI community
                providing end-to-end support from challenge ideation through hackathon building to production
                deployment and commercialization.
              </p>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Quick Facts
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                      <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                        {stat.value}
                      </div>
                      <div className="text-sm text-neutral-500">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  About Since AI
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  <strong className="text-white">Name:</strong> Since AI
                  <br />
                  <strong className="text-white">Legal Entity:</strong> Since AI ry (Business ID: 3593920-2)
                  <br />
                  <strong className="text-white">Founded:</strong> 2025
                  <br />
                  <strong className="text-white">Location:</strong> Turku, Finland
                  <br />
                  <strong className="text-white">Website:</strong>{" "}
                  <a href="https://sinceai.fi" className="text-white hover:text-neutral-300 underline">
                    sinceai.fi
                  </a>
                </p>
                <p className="text-neutral-400 leading-relaxed mb-4">
                  Since AI brings together AI developers, researchers, and companies to collaborate on 
                  real-world challenges. Our hackathons have produced projects in maritime safety, customer 
                  support automation, computer vision, and more. We&apos;re supported by leading organizations 
                  including the University of Turku, Turku University of Applied Sciences, City of Turku, 
                  and Business Turku.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Partner Companies
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  Since AI partners with leading companies including:
                </p>
                <div className="grid grid-cols-2 gap-3 text-neutral-400">
                  <div>
                    <strong className="text-white">• Valmet</strong> - Industrial technology
                  </div>
                  <div>
                    <strong className="text-white">• Sandvik</strong> - Engineering
                  </div>
                  <div>
                    <strong className="text-white">• Kongsberg</strong> - Maritime technology
                  </div>
                  <div>
                    <strong className="text-white">• ElevenLabs</strong> - AI voice technology
                  </div>
                  <div>
                    <strong className="text-white">• Antler</strong> - Venture capital
                  </div>
                  <div>
                    <strong className="text-white">• Featherless.ai</strong> - AI infrastructure
                  </div>
                </div>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Recent Highlights
                </h2>
                <ul className="space-y-4 text-neutral-300">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span>Organized flagship AI hackathon with 260 builders in 2025</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span>Built 30+ AI projects addressing real company challenges</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span>Grew community from 0 to 1000+ members in 18 months</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span>Partnered with 15+ companies including Fortune 500 enterprises</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span>Created pathways for developers to access jobs and career opportunities</span>
                  </li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Press Kit
                </h2>
                <p className="text-neutral-400 mb-6">
                  Download our logos and brand assets for media use:
                </p>
                <div className="space-y-3">
                  {pressKit.map((item, index) => (
                    <a
                      key={index}
                      href={item.file}
                      download
                      className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
                    >
                      <Download className="w-5 h-5 text-neutral-400" />
                      <span className="text-neutral-300">{item.name}</span>
                    </a>
                  ))}
                </div>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Media Contact
                </h2>
                <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                  <p className="text-neutral-300 mb-4">
                    For press inquiries, interviews, or media partnerships:
                  </p>
                  <div className="space-y-3">
                    <p className="text-neutral-300">
                      <Mail className="inline w-4 h-4 mr-2" />
                      <strong className="text-white">Press:</strong>{" "}
                      <a href="mailto:press@sinceai.fi" className="text-white hover:text-neutral-300 underline">
                        press@sinceai.fi
                      </a>
                    </p>
                    <p className="text-neutral-300">
                      <Mail className="inline w-4 h-4 mr-2" />
                      <strong className="text-white">General:</strong>{" "}
                      <a href="mailto:info@sinceai.fi" className="text-white hover:text-neutral-300 underline">
                        info@sinceai.fi
                      </a>
                    </p>
                    <p className="text-neutral-300">
                      <strong className="text-white">Response time:</strong> Within 24 hours
                    </p>
                  </div>
                </div>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Social Media
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <a
                    href="https://discord.com/invite/YkqJswRGSW"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>Discord</strong>
                    <br />
                    <span className="text-sm text-neutral-500">1000+ members</span>
                  </a>
                  <a
                    href="https://t.me/sinceaihq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>Telegram</strong>
                    <br />
                    <span className="text-sm text-neutral-500">@sinceaihq</span>
                  </a>
                  <a
                    href="https://www.linkedin.com/company/sinceai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>LinkedIn</strong>
                    <br />
                    <span className="text-sm text-neutral-500">@sinceai</span>
                  </a>
                  <a
                    href="https://www.instagram.com/sinceaihq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>Instagram</strong>
                    <br />
                    <span className="text-sm text-neutral-500">@sinceaihq</span>
                  </a>
                  <a
                    href="https://x.com/sinceaihq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>X (Twitter)</strong>
                    <br />
                    <span className="text-sm text-neutral-500">@sinceaihq</span>
                  </a>
                  <a
                    href="https://github.com/sinceaihq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>GitHub</strong>
                    <br />
                    <span className="text-sm text-neutral-500">@sinceaihq</span>
                  </a>
                  <a
                    href="https://www.youtube.com/@sinceaihq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>YouTube</strong>
                    <br />
                    <span className="text-sm text-neutral-500">@sinceaihq</span>
                  </a>
                  <a
                    href="https://www.tiktok.com/@sinceaihq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>TikTok</strong>
                    <br />
                    <span className="text-sm text-neutral-500">@sinceaihq</span>
                  </a>
                  <a
                    href="https://www.facebook.com/sinceai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>Facebook</strong>
                    <br />
                    <span className="text-sm text-neutral-500">@sinceai</span>
                  </a>
                </div>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Key Differentiators
                </h2>
                <ul className="space-y-4 text-neutral-300">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">1.</span>
                    <span><strong className="text-white">Full Innovation Lifecycle:</strong> Only community supporting ideation → hackathon → production → commercialization</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">2.</span>
                    <span><strong className="text-white">Production Focus:</strong> 8+ weeks of post-hackathon deployment support for winning projects</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">3.</span>
                    <span><strong className="text-white">European AI Sovereignty:</strong> Active open-source initiatives for European AI independence</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">4.</span>
                    <span><strong className="text-white">Research-Market Bridge:</strong> Helping academics commercialize AI research through university partnerships</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">5.</span>
                    <span><strong className="text-white">Entrepreneurship Support:</strong> Partnership with Antler for startup formation and investor connections</span>
                  </li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Media Boilerplate
                </h2>

                <div className="space-y-6">
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Short (50 words)</h3>
                    <p className="text-neutral-300 leading-relaxed italic">
                      Since AI is Europe&apos;s leading AI innovation ecosystem based in Turku, Finland.
                      We provide end-to-end support from challenge ideation through hackathon building
                      to production deployment and commercialization. With 1000+ members and 15+ partner
                      companies including Valmet, Sandvik, and Kongsberg, we&apos;re building Europe&apos;s AI future.
                    </p>
                  </div>

                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Medium (100 words)</h3>
                    <p className="text-neutral-300 leading-relaxed italic">
                      Since AI is Europe&apos;s only full-lifecycle AI innovation ecosystem, founded in 2025
                      in Turku, Finland. Unlike traditional hackathons, we support projects from challenge
                      ideation through production deployment to commercialization. With 1000+ developers,
                      researchers, and builders, we&apos;ve shipped 30+ AI projects with partner companies including
                      Valmet, Sandvik, Kongsberg, and ElevenLabs. Our unique approach includes post-hackathon
                      production support (8+ weeks), entrepreneurship assistance through Antler partnership,
                      European AI sovereignty initiatives, and research-to-market bridges with the University
                      of Turku and Turku AMK. Learn more: sinceai.fi
                    </p>
                  </div>

                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider mb-3">Long (150 words)</h3>
                    <p className="text-neutral-300 leading-relaxed italic">
                      Since AI is Europe&apos;s premier AI innovation ecosystem, transforming how AI research
                      becomes commercial reality. Founded in 2025 in Turku, Finland, we serve 1000+ developers,
                      researchers, and builders across Europe and beyond. Our unique full-lifecycle approach
                      supports projects from challenge ideation (working with companies to design viable
                      challenges) through intensive 72-hour hackathons to production deployment (8+ weeks
                      of technical support) and commercialization (startup formation with Antler partnership).
                      We&apos;ve shipped 30+ AI projects to production, with partner companies including Valmet,
                      Sandvik, Kongsberg, ElevenLabs, and Antler. Beyond individual projects, we advance
                      European AI sovereignty through open-source initiatives and bridge academic research
                      to market through partnerships with University of Turku and Turku AMK. Since AI is
                      a registered non-profit (Since AI ry, Business ID: 3593920-2). Learn more: sinceai.fi
                    </p>
                  </div>
                </div>

                <p className="text-xs text-neutral-500 mt-4">
                  Feel free to use these boilerplates in articles and press materials about Since AI.
                </p>
              </section>

              <section className="p-8 rounded-2xl border border-white/10 bg-white/[0.02]">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Learn More
                </h2>
                <div className="space-y-3 text-neutral-300">
                  <p>
                    <Link href="/about" className="text-white hover:text-neutral-300 underline">About Since AI</Link> — full story, mission, and differentiators
                  </p>
                  <p>
                    <Link href="/stats" className="text-white hover:text-neutral-300 underline">Statistics & Impact</Link> — community metrics and case studies
                  </p>
                  <p>
                    <Link href="/production-support" className="text-white hover:text-neutral-300 underline">Production Support</Link> — our unique post-hackathon deployment program
                  </p>
                  <p>
                    <Link href="/european-ai" className="text-white hover:text-neutral-300 underline">European AI Sovereignty</Link> — open-source initiatives
                  </p>
                  <p>
                    <Link href="/research-to-market" className="text-white hover:text-neutral-300 underline">Research to Market</Link> — academic commercialization
                  </p>
                  <p>
                    <Link href="/faq" className="text-white hover:text-neutral-300 underline">FAQ</Link> — common questions answered
                  </p>
                  <p>
                    <Link href="/contact" className="text-white hover:text-neutral-300 underline">Contact</Link> — partnerships and collaboration
                  </p>
                </div>
              </section>

              <p className="text-xs text-neutral-600 mt-16 pt-6 border-t border-white/5">
                Last updated: February 2026
              </p>
            </div>
          </FadeIn>
        </div>

        <Footer discordUrl="https://discord.com/invite/YkqJswRGSW" />
      </main>
    </SmoothScroll>
  );
}
