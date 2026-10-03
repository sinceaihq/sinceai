import StructuredData from "@/components/StructuredData";
import { getBreadcrumbSchema } from "@/lib/schema";
import { ORG } from "@/lib/org";
import { GUIDE_BASE_URL } from "@/lib/hackathon-2026";

/** BreadcrumbList JSON-LD: Home → Field Guide → …trail. */
export function GuideBreadcrumbSchema({ trail = [] }: { trail?: { name: string; path: string }[] }) {
  return (
    <StructuredData
      data={getBreadcrumbSchema([
        { name: "Home", url: ORG.baseUrl },
        { name: "Hackathon 2026 Field Guide", url: GUIDE_BASE_URL },
        ...trail.map((t) => ({ name: t.name, url: `${GUIDE_BASE_URL}${t.path}` })),
      ])}
    />
  );
}
