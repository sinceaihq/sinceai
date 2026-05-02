import React from "react";
import Link from "next/link";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { FadeIn } from "@/components/motion-primitives/fade-in";
import { getBreadcrumbSchema } from "@/lib/schema";
import { ORG } from "@/lib/org";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "European AI Sovereignty Through Open Source | Since AI",
  description:
    "Since AI drives European AI sovereignty through community-driven open-source projects, European AI alternatives, privacy-first tools, and collaborative development aligned with EU values.",
  keywords: [
    "European AI sovereignty",
    "open source AI Europe",
    "European AI alternatives",
    "GDPR AI",
    "privacy-first AI",
    "European AI community",
    "AI independence Europe",
    "Since AI",
  ],
  openGraph: {
    title: "European AI Sovereignty Through Open Source | Since AI",
    description:
      "Building European AI independence through community-driven open-source projects, privacy-first tools, and collaborative development.",
    url: "https://sinceai.ai/european-ai",
    type: "website",
  },
};

export default function EuropeanAIPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "European AI", url: `${ORG.baseUrl}/european-ai` },
  ]);

  return (
    <SmoothScroll>
      <Navbar />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="flex flex-col w-full bg-black min-h-screen">
        <div className="max-w-4xl mx-auto px-6 py-32 md:py-40">
          <FadeIn>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">
              European AI Sovereignty Through Open Source
            </h1>

            <div className="prose prose-invert prose-neutral max-w-none">
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-8">
                Europe currently depends heavily on US and Chinese AI providers. Since AI is building
                European AI alternatives through community-driven open source — ensuring Europe has strong,
                independent AI capabilities.
              </p>

              <p className="text-lg text-neutral-400 leading-relaxed mb-12">
                Our community of 1000+ AI developers, researchers, and builders actively contributes to
                open-source projects that advance European AI sovereignty, privacy, and independence.
              </p>

              {/* Why It Matters */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Why European AI Independence Matters
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">Without European AI</h3>
                    <ul className="text-neutral-400 text-sm space-y-2 leading-relaxed">
                      <li>• Dependence on US/China providers</li>
                      <li>• Data sovereignty risks</li>
                      <li>• Strategic vulnerability</li>
                      <li>• Less European innovation</li>
                    </ul>
                  </div>
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.03]">
                    <h3 className="text-lg font-bold text-white mb-2">With Strong European AI</h3>
                    <ul className="text-neutral-300 text-sm space-y-2 leading-relaxed">
                      <li>• Independent capabilities</li>
                      <li>• Data stays in Europe</li>
                      <li>• European jobs and innovation</li>
                      <li>• Aligned with European values</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Open Source Initiatives */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Our Open-Source AI Initiatives
                </h2>

                <div className="space-y-6">
                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">European AI Model Alternatives</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Community-developed models trained with European data considerations.
                      Privacy-first approach aligned with GDPR. Open weights, reproducible training.
                      European language and cultural context.
                    </p>
                  </div>

                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">Privacy-Preserving AI Tools</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      On-premise deployment options. GDPR-compliant by design.
                      European data sovereignty — no data leaving EU borders.
                      Community-maintained and supported.
                    </p>
                  </div>

                  <div className="p-6 rounded-xl border border-white/10 bg-white/[0.02]">
                    <h3 className="text-lg font-bold text-white mb-2">European AI Infrastructure</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">
                      Open-source deployment tools. European cloud integration.
                      Cost-effective alternatives to hyperscalers.
                      Community-maintained and supported.
                    </p>
                  </div>
                </div>
              </section>

              {/* European Values */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  European Values in AI
                </h2>
                <p className="text-neutral-400 leading-relaxed mb-6">
                  Our projects prioritize values that align with the European approach to technology:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                    <div className="text-white font-bold mb-1">Privacy</div>
                    <div className="text-neutral-500 text-sm">GDPR-first design</div>
                  </div>
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                    <div className="text-white font-bold mb-1">Transparency</div>
                    <div className="text-neutral-500 text-sm">Open source, explainable AI</div>
                  </div>
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                    <div className="text-white font-bold mb-1">Sovereignty</div>
                    <div className="text-neutral-500 text-sm">European data stays in Europe</div>
                  </div>
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                    <div className="text-white font-bold mb-1">Inclusivity</div>
                    <div className="text-neutral-500 text-sm">Multilingual, multicultural</div>
                  </div>
                  <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center">
                    <div className="text-white font-bold mb-1">Sustainability</div>
                    <div className="text-neutral-500 text-sm">Efficient models, green AI</div>
                  </div>
                </div>
              </section>

              {/* How to Contribute */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  How Community Members Contribute
                </h2>
                <p className="text-neutral-400 leading-relaxed mb-6">
                  Open challenges are posted in Discord with clear specifications. Community members pick up
                  and contribute collaboratively with shared ownership and credits. All skill levels welcome:
                </p>
                <ul className="space-y-3 text-neutral-300">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span><strong className="text-white">Beginners:</strong> Documentation, testing, examples</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span><strong className="text-white">Intermediate:</strong> Feature development, bug fixes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">•</span>
                    <span><strong className="text-white">Advanced:</strong> Architecture, core algorithms, optimization</span>
                  </li>
                </ul>
              </section>

              {/* CTA */}
              <section className="p-8 rounded-2xl border border-white/10 bg-white/[0.02]">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  Join European AI Development
                </h2>
                <p className="text-neutral-300 mb-6">
                  Join our Discord to browse open challenges, collaborate with the community,
                  and help build Europe&apos;s AI future.
                </p>
                <div className="flex flex-wrap gap-4">
                  <a
                    href={ORG.social.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-neutral-100 transition-colors"
                  >
                    Join Discord
                  </a>
                  <a
                    href={ORG.social.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-white/10 text-white rounded-full font-semibold hover:bg-white/15 transition-colors border border-white/20"
                  >
                    GitHub
                  </a>
                </div>
                <p className="text-sm text-neutral-500 mt-4">
                  Also explore:{" "}
                  <Link href="/about" className="text-neutral-400 hover:text-white underline">About Since AI</Link>
                  {" "}|{" "}
                  <Link href="/production-support" className="text-neutral-400 hover:text-white underline">Production Support</Link>
                  {" "}|{" "}
                  <Link href="/research-to-market" className="text-neutral-400 hover:text-white underline">Research to Market</Link>
                </p>
              </section>

              <p className="text-xs text-neutral-600 mt-16 pt-6 border-t border-white/5">
                Last updated: February 2026
              </p>
            </div>
          </FadeIn>
        </div>

        <Footer discordUrl={ORG.social.discord} />
      </main>
    </SmoothScroll>
  );
}
