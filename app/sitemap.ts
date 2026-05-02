import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://sinceai.ai";
  const now = new Date();

  // Note: /blog/[slug] pages are excluded — they redirect to Medium (301).
  // Note: /impact does not exist → /stats used instead.
  // Note: /research and /europe do not exist → excluded.
  // Note: /european-ai is a separate page from /europe-ai — both included.
  const staticPages: {
    path: string;
    priority: number;
    changeFreq: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "/", priority: 1.0, changeFreq: "weekly" },
    { path: "/hackathon", priority: 0.95, changeFreq: "weekly" },
    { path: "/partners", priority: 0.9, changeFreq: "weekly" },
    { path: "/for-builders", priority: 0.9, changeFreq: "weekly" },
    { path: "/europe-ai", priority: 0.85, changeFreq: "monthly" },
    { path: "/ai-hackathons", priority: 0.85, changeFreq: "monthly" },
    { path: "/about", priority: 0.8, changeFreq: "monthly" },
    { path: "/faq", priority: 0.8, changeFreq: "monthly" },
    { path: "/press", priority: 0.7, changeFreq: "monthly" },
    { path: "/stats", priority: 0.7, changeFreq: "monthly" },
    { path: "/impact", priority: 0.7, changeFreq: "monthly" },
    { path: "/production-support", priority: 0.7, changeFreq: "monthly" },
    { path: "/research-to-market", priority: 0.7, changeFreq: "monthly" },
    { path: "/events", priority: 0.7, changeFreq: "weekly" },
    { path: "/projects", priority: 0.7, changeFreq: "weekly" },
    { path: "/blog", priority: 0.75, changeFreq: "weekly" },
    { path: "/resources", priority: 0.6, changeFreq: "monthly" },
    { path: "/contact", priority: 0.5, changeFreq: "yearly" },
    { path: "/turku", priority: 0.6, changeFreq: "monthly" },
    { path: "/finland-ai", priority: 0.7, changeFreq: "monthly" },
    { path: "/european-ai", priority: 0.7, changeFreq: "monthly" },
    { path: "/code-of-conduct", priority: 0.3, changeFreq: "yearly" },
    { path: "/privacy", priority: 0.3, changeFreq: "yearly" },
    { path: "/terms", priority: 0.3, changeFreq: "yearly" },
  ];

  return staticPages.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFreq,
    priority: p.priority,
  }));
}
