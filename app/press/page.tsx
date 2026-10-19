import React from "react";
import Link from "next/link";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FadeIn } from "@/components/motion-primitives/fade-in";
import { Download, Mail } from "lucide-react";
import { ORG } from "@/lib/org";

export default function PressPage() {
  const stats = [
    { label: "AI builders in our network", value: ORG.stats.network },
    { label: "Builders targeted at Hackathon 2026", value: ORG.stats.hackathon2026Target },
    { label: "Partners & supporters", value: ORG.stats.partners },
    { label: "Builders at Hackathon 2025", value: ORG.stats.hackathonParticipants },
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
        <div className="w-full max-w-4xl mx-auto px-6 py-24 md:py-32">
          <FadeIn>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
              Press & Media
            </h1>
            
            <div className="prose prose-invert prose-neutral max-w-none">
              <p className="text-xl text-neutral-300 leading-relaxed mb-8">
                Since AI is a global, execution-focused AI innovation ecosystem with 10,000+ AI builders in
                its network and 1,000+ community members, run by the Finnish non-profit Since AI ry. We support
                AI projects from challenge ideation through hackathon building to production deployment and
                commercialization.
              </p>

              <p className="text-lg text-neutral-400 leading-relaxed mb-12">
                <strong className="text-white">In one sentence: </strong> Since AI turns frontier AI into shipped
                products — supporting AI projects end to end, from challenge ideation through hackathons to
                production deployment and commercialization.
              </p>

              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Quick Facts
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  {stats.map((stat, index) => (
                    <div key={index} className="text-center p-6 border border-white/10 bg-white/[0.02]">
                      <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                        {stat.value}
                      </div>
                      <div className="text-sm text-white/55">
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
                  <a href="https://sinceai.ai" className="text-white hover:text-neutral-300 underline">
                    sinceai.ai
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-neutral-400">
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
                    <span>Organized the first Since AI Hackathon in 2025 with {ORG.stats.hackathonParticipants} builders and 30+ AI projects</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span>Since AI Hackathon 2026 (6–8 November): {ORG.stats.hackathon2026Target} builders, 15 company challenges and a €50,000 prize pool</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span>Grew to a {ORG.stats.network} builder network and {ORG.stats.members} community members since 2025</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span>Works with {ORG.stats.partners} partners and supporters, including Google for Developers, ElevenLabs, Valmet and Bayer</span>
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
                      className="flex items-center gap-3 p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
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
                <div className="p-6 border border-white/10 bg-white/[0.02]">
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
                    href="https://discord.gg/vMWdrVUPws"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>Discord</strong>
                    <br />
                    <span className="text-sm text-white/55">1,000+ members</span>
                  </a>
                  <a
                    href="https://t.me/sinceaihq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>Telegram</strong>
                    <br />
                    <span className="text-sm text-white/55">@sinceaihq</span>
                  </a>
                  <a
                    href="https://www.linkedin.com/company/sinceai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>LinkedIn</strong>
                    <br />
                    <span className="text-sm text-white/55">@sinceai</span>
                  </a>
                  <a
                    href="https://www.instagram.com/sinceaihq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>Instagram</strong>
                    <br />
                    <span className="text-sm text-white/55">@sinceaihq</span>
                  </a>
                  <a
                    href="https://x.com/sinceaihq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>X (Twitter)</strong>
                    <br />
                    <span className="text-sm text-white/55">@sinceaihq</span>
                  </a>
                  <a
                    href="https://github.com/sinceaihq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>GitHub</strong>
                    <br />
                    <span className="text-sm text-white/55">@sinceaihq</span>
                  </a>
                  <a
                    href="https://www.youtube.com/@sinceaihq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>YouTube</strong>
                    <br />
                    <span className="text-sm text-white/55">@sinceaihq</span>
                  </a>
                  <a
                    href="https://www.tiktok.com/@sinceaihq"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>TikTok</strong>
                    <br />
                    <span className="text-sm text-white/55">@sinceaihq</span>
                  </a>
                  <a
                    href="https://www.facebook.com/sinceai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-neutral-300 hover:text-white"
                  >
                    <strong>Facebook</strong>
                    <br />
                    <span className="text-sm text-white/55">@sinceai</span>
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
                  <div className="p-6 border border-white/10 bg-white/[0.02]">
                    <h3 className="text-sm font-semibold text-white/55 uppercase tracking-wider mb-3">Short (50 words)</h3>
                    <p className="text-neutral-300 leading-relaxed italic">
                      Since AI is a global, execution-focused AI innovation ecosystem, run by the Finnish
                      non-profit Since AI ry. We support AI projects end to end — from challenge ideation
                      through hackathon building to production deployment and commercialization. 10,000+ AI
                      builders in the network and 100+ partners and supporters, including Google for Developers,
                      ElevenLabs, Valmet and Bayer.
                    </p>
                  </div>

                  <div className="p-6 border border-white/10 bg-white/[0.02]">
                    <h3 className="text-sm font-semibold text-white/55 uppercase tracking-wider mb-3">Medium (100 words)</h3>
                    <p className="text-neutral-300 leading-relaxed italic">
                      Since AI is a global, execution-focused AI innovation ecosystem, founded in 2025 and run by
                      the Finnish non-profit Since AI ry. Since AI runs high-intensity hackathons on real challenges
                      from industry partners and supports the strongest teams after the event, with eight weeks of
                      production support. Its network counts 10,000+ AI builders in 100+ countries and 100+ partners
                      and supporters, including Google for Developers, ElevenLabs, Valmet, Bayer and Antler. The
                      flagship event, Since AI Hackathon 2026, brings 1,000+ builders to Turku, Finland on 6–8
                      November 2026. Learn more: sinceai.ai
                    </p>
                  </div>

                  <div className="p-6 border border-white/10 bg-white/[0.02]">
                    <h3 className="text-sm font-semibold text-white/55 uppercase tracking-wider mb-3">Long (150 words)</h3>
                    <p className="text-neutral-300 leading-relaxed italic">
                      Since AI is a global, execution-focused AI innovation ecosystem that turns frontier AI into
                      shipped products. Founded in 2025 and run by the Finnish non-profit Since AI ry (Business ID
                      3593920-2), it connects 10,000+ AI builders in 100+ countries with leading companies,
                      research groups and investors. Since AI works across the whole path: it designs hackathon
                      challenges together with companies, runs high-intensity hackathons, gives the strongest teams
                      eight weeks of production support, and connects founders with capital partners such as
                      Antler. Projects from Since AI Hackathon 2025 run in production with Kongsberg and Sandvik.
                      Since AI Hackathon 2026, on 6–8 November 2026 in Turku, Finland, brings together 1,000+
                      builders, 15 company challenges and a €50,000 prize pool, and is an MLH 2027 Season Member
                      Event. Learn more: sinceai.ai
                    </p>
                  </div>
                </div>

                <p className="text-xs text-white/55 mt-4">
                  Feel free to use these boilerplates in articles and press materials about Since AI.
                </p>
              </section>

              <section className="p-8 border border-white/10 bg-white/[0.02]">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Learn More
                </h2>
                <div className="space-y-3 text-neutral-300">
                  <p>
                    <Link href="/about" className="text-white hover:text-neutral-300 underline">About Since AI</Link> — full story, mission, and differentiators
                  </p>
                  <p>
                    <Link href="/impact" className="text-white hover:text-neutral-300 underline">Impact &amp; Numbers</Link> — published metrics, methodology and case studies
                  </p>
                  <p>
                    <Link href="/production-support" className="text-white hover:text-neutral-300 underline">Production Support</Link> — our unique post-hackathon deployment program
                  </p>
                  <p>
                    <Link href="/europe-ai#open-source" className="text-white hover:text-neutral-300 underline">Open source &amp; European AI</Link> — open source and European AI sovereignty
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

              <p className="text-xs text-white/55 mt-16 pt-6 border-t border-white/5">
                Last updated: February 2026
              </p>
            </div>
          </FadeIn>
        </div>

        <Footer discordUrl="https://discord.gg/vMWdrVUPws" />
      </main>
    </SmoothScroll>
  );
}
