import { blogPosts } from "@/lib/blog";
import { getAuthor } from "@/lib/authors";
import { ORG } from "@/lib/org";

export const dynamic = "force-static";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const base = ORG.baseUrl;
  const feedUrl = `${base}/blog/feed.xml`;
  const lastBuild = new Date().toUTCString();

  const items = blogPosts
    .map((post) => {
      const url = `${base}/blog/${post.slug}`;
      const author = getAuthor(post.author);
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.excerpt)}</description>
      <pubDate>${new Date(post.datePublished).toUTCString()}</pubDate>
      <dc:creator>${escapeXml(author.name)}</dc:creator>
      <category>${escapeXml(post.category)}</category>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(`${ORG.name} Blog`)}</title>
    <link>${base}/blog</link>
    <description>AI hackathon guides and community resources from the Since AI builders community.</description>
    <language>en</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  });
}
