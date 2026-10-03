import type { Metadata } from "next";
import { GuideBreadcrumbSchema } from "@/components/guide/GuideBreadcrumbSchema";
import { guideMetadata, VENUE_GUIDE } from "@/lib/hackathon-2026";

export const metadata: Metadata = guideMetadata({
  title: VENUE_GUIDE.name,
  description: VENUE_GUIDE.metaDescription,
  path: "/venue",
});

export default function VenueGuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GuideBreadcrumbSchema trail={[{ name: VENUE_GUIDE.name, path: "/venue" }]} />
      {children}
    </>
  );
}
