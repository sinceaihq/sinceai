import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideBreadcrumbSchema } from "@/components/guide/GuideBreadcrumbSchema";
import {
  briefingRoomLabel,
  CHALLENGE_COMPANIES,
  getCompany,
  getGuide,
  guideMetadata,
  qaLocationLabel,
} from "@/lib/hackathon-2026";

interface Props {
  params: Promise<{ company: string }>;
  children: React.ReactNode;
}

const guide = getGuide("challenge-partners");

// Only the 15 known companies exist; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return CHALLENGE_COMPANIES.map((c) => ({ company: c.id }));
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { company: id } = await params;
  const company = getCompany(id);
  if (!company) return {};
  return guideMetadata({
    title: `${company.name} · ${guide.name}`,
    description: `${company.name} at Since AI Hackathon 2026: Friday briefing in EduCity ${briefingRoomLabel(company)}, Saturday Q&A at ${qaLocationLabel(company)}.`,
    path: `/${guide.slug}/${company.id}`,
  });
}

export default async function CompanyGuideLayout({ params, children }: Props) {
  const { company: id } = await params;
  const company = getCompany(id);
  if (!company) notFound();
  return (
    <>
      <GuideBreadcrumbSchema
        trail={[
          { name: guide.name, path: `/${guide.slug}` },
          { name: company.name, path: `/${guide.slug}/${company.id}` },
        ]}
      />
      {children}
    </>
  );
}
