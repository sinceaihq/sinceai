"use client";
import React, { useState } from "react";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import StructuredData from "@/components/StructuredData";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Clock, ChevronRight } from "lucide-react";
import {
  blogPosts,
  BLOG_CATEGORIES,
  type BlogCategory,
} from "@/lib/blog";
import {
  getBlogSchema,
  getBlogItemListSchema,
  getBlogFAQSchema,
  getBreadcrumbSchema,
} from "@/lib/schema";
import { ORG } from "@/lib/org";
import Link from "next/link";
import NewsletterSignup from "@/components/forms/NewsletterSignup";

const ALL_FILTER = "all" as const;
type FilterValue = typeof ALL_FILTER | BlogCategory;

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: ALL_FILTER, label: "All Posts" },
  ...Object.entries(BLOG_CATEGORIES).map(([key, { label }]) => ({
    value: key as BlogCategory,
    label,
  })),
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>(ALL_FILTER);

  const filteredPosts =
    activeFilter === ALL_FILTER
      ? blogPosts
      : blogPosts.filter((post) => post.category === activeFilter);

  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "Blog", url: `${ORG.baseUrl}/blog` },
  ]);

  return (
    <SmoothScroll>
      <Navbar />

      <StructuredData data={getBlogSchema()} />
      <StructuredData data={getBlogItemListSchema()} />
      <StructuredData data={breadcrumbSchema} />
      <StructuredData data={getBlogFAQSchema()} />

      <main className="flex flex-col w-full bg-black min-h-screen">
        {/* Hero */}
        <section className="relative w-full px-6 py-24 md:py-32">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center"
            >
              {/* Breadcrumb */}
              <nav aria-label="Breadcrumb" className="mb-8">
                <ol className="flex items-center justify-center gap-1 text-sm text-neutral-500">
                  <li>
                    <Link
                      href="/"
                      className="hover:text-neutral-300 transition-colors"
                    >
                      Home
                    </Link>
                  </li>
                  <li>
                    <ChevronRight className="w-3 h-3" />
                  </li>
                  <li>
                    <span className="text-neutral-300">Blog</span>
                  </li>
                </ol>
              </nav>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
                AI Hackathon Guides &amp; Community Resources
              </h1>
              <p className="text-xl md:text-2xl text-neutral-400 max-w-3xl mx-auto leading-relaxed">
                Comprehensive guides from the leading global AI builders
                community. Learn hackathon strategies, AI development
                techniques, and discover the best developer events globally.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Category Filter */}
        <section className="relative w-full px-6 pb-4">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              className="flex flex-wrap gap-2 justify-center"
            >
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-none border transition-all duration-300 cursor-pointer ${
                    activeFilter === option.value
                      ? "bg-white text-black border-white"
                      : "bg-transparent text-neutral-400 border-white/10 hover:border-white/30 hover:text-neutral-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Blog Cards */}
        <section className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPosts.map((post, index) => (
                <motion.div
                  key={post.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                >
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col justify-between h-full p-8 md:p-10 border border-white/10 bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/20 transition-all duration-300"
                >
                  <article>
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 text-xs font-medium text-neutral-300 bg-white/5 border border-white/10 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight group-hover:text-neutral-200 transition-colors">
                      {post.title}
                    </h2>

                    {/* Excerpt */}
                    <p className="text-base text-neutral-400 leading-relaxed mb-4">
                      {post.excerpt}
                    </p>

                    {/* Key Takeaway — citable content for AI engines */}
                    <p className="text-sm text-neutral-500 italic leading-relaxed mb-6">
                      {post.keyTakeaway}
                    </p>

                    {/* Meta: Reading time + Date */}
                    <div className="flex items-center gap-4 text-sm text-neutral-500 mb-8">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {post.readingTime} min read
                      </span>
                      <time dateTime={post.datePublished}>
                        {formatDate(post.datePublished)}
                      </time>
                    </div>
                  </article>

                  {/* CTA */}
                  <div className="flex items-center gap-2 text-white font-semibold group-hover:gap-3 transition-all duration-300">
                    <span>Read article</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
                </motion.div>
              ))}
            </div>

            {/* Empty state */}
            {filteredPosts.length === 0 && (
              <div className="text-center py-16">
                <p className="text-neutral-400 text-lg">
                  No posts in this category yet. Check back soon!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Newsletter */}
        <section className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-3xl mx-auto">
            <NewsletterSignup />
          </div>
        </section>

        {/* Follow CTA */}
        <section className="relative w-full px-6 py-24 border-t border-white/5">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
                Follow Since AI
              </h3>
              <p className="text-lg text-neutral-400 mb-8 max-w-xl mx-auto">
                More guides and insights from the Since AI community, published
                regularly.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href={ORG.social.substack}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-black bg-white rounded-none hover:bg-neutral-100 transition-all duration-300 group"
                >
                  Subscribe on Substack
                  <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
                <a
                  href={ORG.social.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white rounded-none border border-white/20 hover:border-white transition-colors duration-300 group"
                >
                  Join the Discord
                  <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
              <p className="mt-6 text-sm text-neutral-500">
                Prefer a reader? Subscribe via{" "}
                <a
                  href="/blog/feed.xml"
                  className="text-neutral-300 hover:text-white underline underline-offset-4 transition-colors"
                >
                  RSS
                </a>
                .
              </p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </SmoothScroll>
  );
}
