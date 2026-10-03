import type { Metadata } from "next";
import { GuideShell } from "@/components/guide";
import { guideMetadata, HUB } from "@/lib/hackathon-2026";

// Public by direct link, never indexed (meta robots + X-Robots-Tag header +
// sitemap exclusion — see lib/hackathon-2026/seo.ts). Every page below sets
// its own metadata with the same robots rules.
export const metadata: Metadata = guideMetadata({
  title: "Field Guide",
  description: HUB.metaDescription,
  path: "",
});

export default function FieldGuideLayout({ children }: { children: React.ReactNode }) {
  return <GuideShell>{children}</GuideShell>;
}
