import type { Metadata } from "next";
import { GuideBreadcrumbSchema } from "@/components/guide/GuideBreadcrumbSchema";
import { DISCORD_GUIDE, guideMetadata } from "@/lib/hackathon-2026";

export const metadata: Metadata = guideMetadata({
  title: DISCORD_GUIDE.name,
  description: DISCORD_GUIDE.metaDescription,
  path: "/discord",
});

export default function DiscordGuideLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GuideBreadcrumbSchema trail={[{ name: DISCORD_GUIDE.name, path: "/discord" }]} />
      {children}
    </>
  );
}
