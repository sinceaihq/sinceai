import type { Metadata } from "next";
import { GuideBreadcrumbSchema } from "@/components/guide/GuideBreadcrumbSchema";
import { guideMetadata, HUB } from "@/lib/hackathon-2026";

export const metadata: Metadata = guideMetadata({
  title: "Field Guide",
  description: HUB.metaDescription,
  path: "",
});

export default function FieldGuideHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GuideBreadcrumbSchema />
      {children}
    </>
  );
}
