import type { Metadata } from "next";
import { GuideBreadcrumbSchema } from "@/components/guide/GuideBreadcrumbSchema";
import { guideMetadata, RESOURCES_GUIDE } from "@/lib/hackathon-2026";

export const metadata: Metadata = guideMetadata({
  title: RESOURCES_GUIDE.name,
  description: RESOURCES_GUIDE.metaDescription,
  path: "/resources",
});

export default function ResourcesGuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GuideBreadcrumbSchema trail={[{ name: RESOURCES_GUIDE.name, path: "/resources" }]} />
      {children}
    </>
  );
}
