"use client";
import React, { useState } from "react";
import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/sections/Footer";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock, ChevronRight } from "lucide-react";
import {
  blogPosts,
  BLOG_CATEGORIES,
  type BlogCategory,
} from "@/lib/blog";
import { getBlogSchema, getBlogItemListSchema, getBreadcrumbSchema, getBlogFAQSchema } from "@/lib/schema";
import Link from "next/link";
import { ORG } from "@/lib/org";
import NewsletterSignup from "@/components/NewsletterSignup";

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

  const blogSchema = getBlogSchema();
  const itemListSchema = getBlogItemListSchema();
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "Blog", url: `${ORG.baseUrl}/blog` },
  ]);
  const faqSchema = getBlogFAQSchema();

  const filteredPosts =
    activeFilter === ALL_FILTER
      ? blogPosts
      : blogPosts.filter((post) => post.category === activeFilter);

  return (
    <SmoothScroll>
      <Navbar />

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="flex flex-col w-full bg-black min-h-screen">
        {/* Hero */}
        <section className="relative w-full px-6 py-24 md:py-32">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
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
              transition={{ duration: 0.4, delay: 0.2 }}
              className="flex flex-wrap gap-2 justify-center"
            >
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setActiveFilter(option.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-full border transition-all duration-200 ${
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
        <section className="relative w-full px-6 py-16 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPosts.map((post, index) => (
                <motion.a
                  key={post.slug}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group flex flex-col justify-between p-8 md:p-10 rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300"
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
                    <span>Read on Medium</span>
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </motion.a>
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
        <section className="relative w-full px-6 py-16 border-t border-white/5">
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
              transition={{ duration: 0.6 }}
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
                  href="https://sinceai.substack.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-black bg-white rounded-full hover:bg-neutral-100 transition-all duration-300 group"
                >
                  Subscribe on Substack
                  <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
                <a
                  href="https://medium.com/@sinceai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-white/10 rounded-full hover:bg-white/15 border border-white/20 hover:border-white/30 transition-all duration-300 group"
                >
                  Follow on Medium
                  <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </SmoothScroll>
  );
}
