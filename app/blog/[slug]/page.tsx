import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, Calendar } from "lucide-react";

import SmoothScroll from "@/components/smoothScroll";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import StructuredData from "@/components/StructuredData";
import {
  blogPosts,
  getPostBySlug,
  getAdjacentPosts,
  BLOG_CATEGORIES,
} from "@/lib/blog";
import { blogContent } from "@/content/blog/registry";
import { getAuthor } from "@/lib/authors";
import { getArticleBody } from "@/lib/blog";
import {
  getArticleSchema,
  getPostFAQSchema,
  getBreadcrumbSchema,
  getPostUrl,
} from "@/lib/schema";
import { ORG } from "@/lib/org";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

// Only the known slugs are valid; unknown slugs 404 instead of attempting a
// runtime filesystem read (important for the Cloudflare/OpenNext deployment).
export const dynamicParams = false;

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return { title: "Post not found | Since AI" };
  }

  const url = getPostUrl(post.slug);
  const title = `${post.title} | Since AI`;
  const ogImage = `/api/og/blog?slug=${post.slug}`;
  const author = getAuthor(post.author);

  return {
    title,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: author.name, url: author.linkedin }],
    alternates: {
      canonical: url,
      types: {
        "application/rss+xml": `${ORG.baseUrl}/blog/feed.xml`,
      },
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: "Since AI",
      locale: "en_US",
      type: "article",
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
      authors: [author.name],
      tags: post.tags,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const Body = blogContent[slug];

  if (!post || !Body) {
    notFound();
  }

  const toc = post.toc;
  const articleBody = getArticleBody(post);
  const { previous, next } = getAdjacentPosts(slug);
  const category = BLOG_CATEGORIES[post.category];
  const author = getAuthor(post.author);

  const articleSchema = getArticleSchema(post, { articleBody });
  const faqSchema = getPostFAQSchema(post);
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: "Home", url: ORG.baseUrl },
    { name: "Blog", url: `${ORG.baseUrl}/blog` },
    { name: post.title, url: getPostUrl(post.slug) },
  ]);

  return (
    <SmoothScroll>
      <Navbar />

      <StructuredData data={articleSchema} />
      {faqSchema && <StructuredData data={faqSchema} />}
      <StructuredData data={breadcrumbSchema} />

      <main className="flex flex-col w-full bg-black min-h-screen">
        <article className="w-full px-6 py-24 md:py-32">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-10">
              <ol className="flex items-center gap-1.5 text-sm text-neutral-500">
                <li>
                  <Link href="/" className="hover:text-neutral-300 transition-colors">
                    Home
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href="/blog" className="hover:text-neutral-300 transition-colors">
                    Blog
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li className="text-neutral-300 truncate max-w-[200px] sm:max-w-none">
                  {category.label}
                </li>
              </ol>
            </nav>

            {/* Header */}
            <header className="mb-12">
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-3 py-1 text-xs font-medium text-neutral-300 bg-white/5 border border-white/10 rounded-full">
                  {category.label}
                </span>
                {post.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-xs font-medium text-neutral-400 bg-white/[0.02] border border-white/5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight mb-6">
                {post.title}
              </h1>

              <p className="text-lg md:text-xl text-neutral-400 leading-relaxed mb-6">
                {post.excerpt}
              </p>

              <div className="flex flex-wrap items-center gap-5 text-sm text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <time dateTime={post.datePublished}>
                    {formatDate(post.datePublished)}
                  </time>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {post.readingTime} min read
                </span>
                <span>
                  By{" "}
                  <a
                    href={author.linkedin}
                    target="_blank"
                    rel="noopener noreferrer author"
                    className="text-neutral-300 hover:text-white transition-colors"
                  >
                    {author.name}
                  </a>
                </span>
              </div>
            </header>

            {/* TL;DR — citable key takeaway for AI engines */}
            <aside className="mb-12 border-l-2 border-white/20 bg-white/[0.02] p-6">
              <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-2">
                Key takeaway
              </p>
              <p className="text-lg text-neutral-200 leading-relaxed">
                {post.keyTakeaway}
              </p>
            </aside>

            {/* Table of contents */}
            {toc.length > 2 && (
              <nav
                aria-label="Table of contents"
                className="mb-12 border border-white/10 bg-white/[0.02] p-6"
              >
                <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-4">
                  On this page
                </p>
                <ol className="space-y-2">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="text-sm text-neutral-400 hover:text-white transition-colors"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}

            {/* Article body */}
            <div>
              <Body />
            </div>

            {/* FAQ */}
            {post.faqs.length > 0 && (
              <section className="mt-16 pt-12 border-t border-white/10">
                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-8">
                  Frequently asked questions
                </h2>
                <div className="space-y-6">
                  {post.faqs.map((faq) => (
                    <div
                      key={faq.question}
                      className="border border-white/5 bg-white/[0.02] p-6"
                    >
                      <h3 className="text-lg font-bold text-white mb-3">
                        {faq.question}
                      </h3>
                      <p className="text-neutral-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Author */}
            <section className="mt-16 pt-12 border-t border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div
                  aria-hidden
                  className="shrink-0 w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white font-bold"
                >
                  {author.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1">
                    Written by
                  </p>
                  <p className="text-white font-bold">{author.name}</p>
                  <p className="text-sm text-neutral-500 mb-2">{author.role}</p>
                  <p className="text-neutral-400 leading-relaxed mb-3">
                    {author.bio}
                  </p>
                  <a
                    href={author.linkedin}
                    target="_blank"
                    rel="noopener noreferrer author"
                    className="text-sm text-white underline decoration-white/30 underline-offset-4 hover:decoration-white transition-colors"
                  >
                    Connect on LinkedIn
                  </a>
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="mt-16 border border-white/10 bg-white/[0.02] p-8">
              <h2 className="text-2xl font-bold text-white tracking-tight mb-3">
                Build it at the Since AI Hackathon
              </h2>
              <p className="text-neutral-400 leading-relaxed mb-6">
                Put these playbooks into practice with serious teams on real
                company challenges in Turku, Finland.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/hackathon"
                  className="bg-white text-black rounded-none px-6 py-3 font-semibold hover:bg-neutral-100 transition-colors cursor-pointer text-center"
                >
                  Explore the Hackathon
                </Link>
                <Link
                  href="/for-builders"
                  className="border border-white/20 text-white rounded-none px-6 py-3 font-semibold hover:border-white transition-colors cursor-pointer text-center"
                >
                  Join as a Builder
                </Link>
              </div>
            </section>

            {/* Prev / Next */}
            {(previous || next) && (
              <nav
                aria-label="More posts"
                className="mt-16 pt-12 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {previous ? (
                  <Link
                    href={`/blog/${previous.slug}`}
                    className="group flex flex-col p-6 border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Previous
                    </span>
                    <span className="text-white font-semibold group-hover:text-neutral-200 transition-colors">
                      {previous.title}
                    </span>
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link
                    href={`/blog/${next.slug}`}
                    className="group flex flex-col p-6 border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.03] transition-colors sm:text-right"
                  >
                    <span className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2 sm:justify-end">
                      Next
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-white font-semibold group-hover:text-neutral-200 transition-colors">
                      {next.title}
                    </span>
                  </Link>
                )}
              </nav>
            )}

            {/* Back to blog */}
            <div className="mt-12 text-center">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                All posts
              </Link>
            </div>
          </div>
        </article>

        <Footer discordUrl={ORG.social.discord} />
      </main>
    </SmoothScroll>
  );
}
