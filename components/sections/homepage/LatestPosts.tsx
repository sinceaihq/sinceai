import Link from "next/link";
import { getLatestPosts } from "@/lib/blog";
import { FadeInView } from "@/components/motion-primitives/fade-in";
import { SectionIntro } from "./SectionIntro";

const latestPosts = getLatestPosts(3);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

export function LatestPosts() {
  return (
    <section aria-labelledby="home-blog-title" className="py-24 md:py-32 px-6 border-t border-white/10">
      <FadeInView className="mx-auto max-w-6xl">
        <SectionIntro
          id="home-blog-title"
          eyebrow="// from the blog"
          title="Playbooks for builders."
          lede="How to win an AI hackathon, form a team and ship a demo that works — from the Since AI community."
        />
        <ul className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {latestPosts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="group flex h-full flex-col border border-white/10 p-7 transition-colors hover:border-white/25 hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <p className="text-xs font-mono uppercase tracking-widest text-white/55">{post.tags.slice(0, 2).join(" · ")}</p>
                <h3 className="mt-4 text-xl font-bold tracking-tight text-white text-balance">{post.title}</h3>
                <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{post.excerpt}</p>
                <p className="mt-auto flex items-center justify-between gap-4 pt-6 text-xs text-white/55">
                  <span>
                    <time dateTime={post.datePublished}>{formatDate(post.datePublished)}</time> · {post.readingTime} min read
                  </span>
                  <span aria-hidden="true" className="text-white transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8">
          <Link
            href="/blog"
            className="inline-flex min-h-11 items-center text-sm text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white transition-colors"
          >
            All articles <span aria-hidden="true" className="ml-1">→</span>
          </Link>
        </p>
      </FadeInView>
    </section>
  );
}
