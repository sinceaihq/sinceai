import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { blogPosts } from "@/lib/blog";
import { slugify } from "@/lib/utils";

/**
 * A post's table of contents links to its headings by id. The ids are typed by
 * hand in lib/blog.ts, while the heading ids are generated from the heading
 * text (mdx-components.tsx) — so a typo is a link that silently goes nowhere.
 */
describe("blog tables of contents", () => {
  const headingsOf = (slug: string): string[] => {
    const file = path.join(process.cwd(), "content/blog", `${slug}.mdx`);
    if (!existsSync(file)) return [];
    return [...readFileSync(file, "utf8").matchAll(/^##\s+(.+)$/gm)].map((m) => slugify(m[1].trim()));
  };

  it("has an article file for every post", () => {
    for (const post of blogPosts) expect([post.slug, headingsOf(post.slug).length > 0]).toEqual([post.slug, true]);
  });

  it("links every entry to a heading that exists in the article", () => {
    for (const post of blogPosts) {
      const headings = headingsOf(post.slug);
      for (const item of post.toc) expect({ post: post.slug, id: item.id, found: headings.includes(item.id) }).toEqual({ post: post.slug, id: item.id, found: true });
    }
  });
});
