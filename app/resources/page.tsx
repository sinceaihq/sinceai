import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { FadeIn } from "@/components/motion-primitives/fade-in";
import { getBreadcrumbSchema } from "@/lib/schema";
import { ORG } from "@/lib/org";
import { blogPosts } from "@/lib/blog";
import NewsletterSignup from "@/components/NewsletterSignup";

export const metadata: Metadata = {
  title: "AI Development Resources | Since AI Community Guides & Tools",
  description:
    "Comprehensive AI development resources from Since AI. Hackathon guides, tech stack recommendations, project ideas, and curated tools for AI builders.",
  keywords:
    "ai resources, ai development tools, ai learning, hackathon resources, ai guides, ai tools, ai development resources",
  alternates: {
    canonical: "https://sinceai.ai/resources",
  },
  openGraph: {
    title: "AI Development Resources | Since AI Community Guides & Tools",
    description:
      "Comprehensive AI development resources from Since AI. Hackathon guides, tech stack recommendations, project ideas, and curated tools for AI builders.",
    url: "https://sinceai.ai/resources",
    siteName: "Since AI",
    type: "website",
  },
};

export default function ResourcesPage() {
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "Resources", url: `${ORG.baseUrl}/resources` },
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
              AI Development Resources
            </h1>

            <div className="prose prose-invert prose-neutral max-w-none">
              <p className="text-xl md:text-2xl text-neutral-300 leading-relaxed mb-8">
                Curated resources from the Since AI community to help you build better
                AI applications, win hackathons, and ship production systems.
              </p>

              {/* Our Guides */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Our Published Guides
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {blogPosts.map((post) => (
                    <div key={post.slug} className="p-6 rounded-xl border border-white/5 bg-white/[0.02]">
                      <h3 className="text-lg font-bold text-white mb-2">{post.title}</h3>
                      <p className="text-neutral-400 text-sm leading-relaxed mb-3">
                        {post.excerpt}
                      </p>
                      <p className="text-neutral-500 text-xs mb-3">
                        {post.readingTime} min read
                      </p>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="text-white hover:text-neutral-300 underline text-sm"
                      >
                        Read Guide &rarr;
                      </Link>
                    </div>
                  ))}
                </div>
              </section>

              {/* Tools & Frameworks */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Tools &amp; Frameworks We Recommend
                </h2>

                <h3 className="text-2xl font-bold text-white mb-4">AI Development</h3>
                <div className="space-y-3 mb-8">
                  {[
                    { name: "OpenAI API", desc: "Industry-standard LLM API for prototyping and production" },
                    { name: "Anthropic Claude", desc: "Production-grade AI with strong safety and reasoning" },
                    { name: "LangChain", desc: "Framework for building LLM-powered applications" },
                    { name: "LlamaIndex", desc: "Data framework for RAG applications" },
                    { name: "Hugging Face", desc: "Model hub, datasets, and deployment platform" },
                  ].map((tool) => (
                    <div key={tool.name} className="flex items-start gap-3 text-neutral-300">
                      <span className="text-white font-bold mt-1">&bull;</span>
                      <span><strong className="text-white">{tool.name}:</strong> {tool.desc}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">Web Development</h3>
                <div className="space-y-3 mb-8">
                  {[
                    { name: "Next.js", desc: "React framework, ideal for hackathon speed and production apps" },
                    { name: "FastAPI", desc: "Python web framework, perfect for AI backends" },
                    { name: "Tailwind CSS", desc: "Utility-first CSS for rapid UI development" },
                    { name: "Vercel", desc: "One-click deployment for Next.js applications" },
                    { name: "Railway", desc: "Easy backend and database deployment" },
                  ].map((tool) => (
                    <div key={tool.name} className="flex items-start gap-3 text-neutral-300">
                      <span className="text-white font-bold mt-1">&bull;</span>
                      <span><strong className="text-white">{tool.name}:</strong> {tool.desc}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">Data &amp; Vector Stores</h3>
                <div className="space-y-3 mb-8">
                  {[
                    { name: "Pinecone", desc: "Managed vector database for RAG applications" },
                    { name: "Weaviate", desc: "Open-source vector database with multi-modal support" },
                    { name: "ChromaDB", desc: "Lightweight embeddings database for prototyping" },
                    { name: "Supabase", desc: "PostgreSQL with pgvector for hybrid applications" },
                  ].map((tool) => (
                    <div key={tool.name} className="flex items-start gap-3 text-neutral-300">
                      <span className="text-white font-bold mt-1">&bull;</span>
                      <span><strong className="text-white">{tool.name}:</strong> {tool.desc}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">Development Tools</h3>
                <div className="space-y-3 mb-8">
                  {[
                    { name: "Cursor", desc: "AI-powered code editor for rapid development" },
                    { name: "GitHub Copilot", desc: "AI pair programmer integrated in your editor" },
                    { name: "Postman", desc: "API testing and documentation" },
                    { name: "Sentry", desc: "Error monitoring and performance tracking" },
                  ].map((tool) => (
                    <div key={tool.name} className="flex items-start gap-3 text-neutral-300">
                      <span className="text-white font-bold mt-1">&bull;</span>
                      <span><strong className="text-white">{tool.name}:</strong> {tool.desc}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* External Resources */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  External Resources We Trust
                </h2>

                <h3 className="text-2xl font-bold text-white mb-4">Learning AI</h3>
                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-3 text-neutral-300">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">DeepLearning.AI:</strong> Andrew Ng&apos;s courses on machine learning and AI</span>
                  </div>
                  <div className="flex items-start gap-3 text-neutral-300">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Hugging Face Course:</strong> NLP and transformers hands-on training</span>
                  </div>
                  <div className="flex items-start gap-3 text-neutral-300">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Full Stack Deep Learning:</strong> Production ML engineering course</span>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">AI News &amp; Research</h3>
                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-3 text-neutral-300">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">arXiv:</strong> Latest AI and ML research papers</span>
                  </div>
                  <div className="flex items-start gap-3 text-neutral-300">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Papers With Code:</strong> Research papers with open-source implementations</span>
                  </div>
                  <div className="flex items-start gap-3 text-neutral-300">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span><strong className="text-white">Import AI Newsletter:</strong> Weekly curated AI news and analysis</span>
                  </div>
                </div>
              </section>

              {/* Project Showcase */}
              <section className="mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
                  Since AI Project Showcase
                </h2>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  Learn from real projects built at Since AI hackathons — 30+ production-deployed
                  AI systems with technical deep-dives and case studies.
                </p>
                <ul className="space-y-3 text-neutral-300 mb-4">
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span>Technical architecture decisions and lessons learned</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span>Production deployment case studies (Kongsberg, Sandvik)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white font-bold mt-1">&bull;</span>
                    <span>Open-source code where available</span>
                  </li>
                </ul>
                <p className="text-neutral-400">
                  <Link href="/projects" className="text-white hover:text-neutral-300 underline">
                    View all 30+ projects &rarr;
                  </Link>
                </p>
              </section>

              {/* CTA */}
              <section className="mb-12 p-8 rounded-2xl border border-white/10 bg-white/[0.03]">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  Want to Contribute?
                </h2>
                <p className="text-neutral-300 mb-4">
                  Have a resource to share with the Since AI community? We welcome
                  contributions from developers, researchers, and builders.
                </p>
                <div className="space-y-2 text-neutral-400 text-sm">
                  <p>&bull; Share in Discord:{" "}
                    <a href={ORG.social.discord} target="_blank" rel="noopener noreferrer" className="text-white hover:text-neutral-300 underline">
                      discord.gg/6PC74zW68v
                    </a>
                  </p>
                  <p>&bull; Submit via email:{" "}
                    <a href={`mailto:${ORG.contact.infoEmail}`} className="text-white hover:text-neutral-300 underline">
                      {ORG.contact.infoEmail}
                    </a>
                  </p>
                  <p>&bull; Contribute to our{" "}
                    <a href={ORG.social.github} target="_blank" rel="noopener noreferrer" className="text-white hover:text-neutral-300 underline">
                      open-source repos on GitHub
                    </a>
                  </p>
                </div>
              </section>

              {/* Newsletter */}
              <section className="mb-12">
                <NewsletterSignup />
              </section>

              {/* Cross-links */}
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">
                  Explore More
                </h2>
                <div className="flex flex-wrap gap-3">
                  <Link href="/blog" className="text-neutral-400 hover:text-white underline">Blog</Link>
                  <span className="text-neutral-600">&bull;</span>
                  <Link href="/projects" className="text-neutral-400 hover:text-white underline">Projects</Link>
                  <span className="text-neutral-600">&bull;</span>
                  <Link href="/production-support" className="text-neutral-400 hover:text-white underline">Production Support</Link>
                  <span className="text-neutral-600">&bull;</span>
                  <Link href="/events" className="text-neutral-400 hover:text-white underline">Events</Link>
                  <span className="text-neutral-600">&bull;</span>
                  <Link href="/faq" className="text-neutral-400 hover:text-white underline">FAQ</Link>
                </div>
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
