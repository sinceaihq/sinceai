"use client";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Clock } from "lucide-react";
import { getLatestPosts } from "@/lib/blog";

const latestPosts = getLatestPosts(3);

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function LatestPosts() {
  return (
    <section className="py-24 px-6 border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
            Latest from the blog
          </h2>
          <p className="text-neutral-400 mt-3 text-base">
            Playbooks and guides from the Since AI community.
          </p>
        </motion.div>

        {/* Post Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {latestPosts.map((post, index) => (
            <motion.a
              key={post.slug}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
              className="group flex flex-col justify-between p-8 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/20 transition-all duration-300"
            >
              <div>
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs font-medium text-neutral-300 bg-white/5 border border-white/10 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h3 className="text-xl md:text-2xl font-bold text-white mb-3 tracking-tight group-hover:text-neutral-200 transition-colors">
                  {post.title}
                </h3>

                {/* Excerpt */}
                <p className="text-sm text-neutral-400 leading-relaxed mb-4">
                  {post.excerpt}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-neutral-500 mb-6">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readingTime} min
                  </span>
                  <time dateTime={post.datePublished}>
                    {formatDate(post.datePublished)}
                  </time>
                </div>
              </div>

              {/* CTA */}
              <div className="flex items-center gap-2 text-sm text-white font-semibold group-hover:gap-3 transition-all duration-300">
                <span>Read on Medium</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </motion.a>
          ))}
        </div>

        {/* All posts link */}
        <div className="mt-10 text-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors group"
          >
            All posts
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
