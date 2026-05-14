import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { blogPosts } from "@/lib/blog";
import { ORG } from "@/lib/org";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

function getPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  return {
    title: `${post.title} | Since AI - AI Builders Community`,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: "Since AI" }],
    alternates: {
      canonical: `${ORG.baseUrl}/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${ORG.baseUrl}/blog/${post.slug}`,
      siteName: "Since AI",
      locale: "en_US",
      type: "article",
      publishedTime: post.datePublished,
      authors: ["Since AI"],
      tags: post.tags,
      images: [
        {
          url: "/assets/logo/SINCE AI full black.png",
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
      images: ["/assets/logo/SINCE AI full black.png"],
    },
    other: {
      "article:published_time": post.datePublished,
      "article:author": "Since AI",
      "article:section": "AI & Technology",
      ...Object.fromEntries(
        post.tags.map((tag, i) => [`article:tag:${i}`, tag])
      ),
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  redirect(post.url);
}
