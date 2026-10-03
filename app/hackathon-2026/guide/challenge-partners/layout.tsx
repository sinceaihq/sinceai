import type { Metadata } from "next";
import { GuideBreadcrumbSchema } from "@/components/guide/GuideBreadcrumbSchema";
import { getGuide, guideMetadata } from "@/lib/hackathon-2026";

const guide = getGuide("challenge-partners");

export const metadata: Metadata = guideMetadata({
  title: guide.name,
  description: guide.metaDescription,
  path: `/${guide.slug}`,
});

export default function ChallengePartnerGuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GuideBreadcrumbSchema trail={[{ name: guide.name, path: `/${guide.slug}` }]} />
      {children}
    </>
  );
}
