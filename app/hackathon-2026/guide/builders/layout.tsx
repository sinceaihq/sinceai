import type { Metadata } from "next";
import { GuideBreadcrumbSchema } from "@/components/guide/GuideBreadcrumbSchema";
import { getGuide, guideMetadata } from "@/lib/hackathon-2026";

const guide = getGuide("builders");

export const metadata: Metadata = guideMetadata({
  title: guide.name,
  description: guide.metaDescription,
  path: `/${guide.slug}`,
});

export default function BuildersGuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GuideBreadcrumbSchema trail={[{ name: guide.name, path: `/${guide.slug}` }]} />
      {children}
    </>
  );
}
