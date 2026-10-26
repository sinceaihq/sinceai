import Link from "next/link";
import { GuideHero, GuideSection, HelpSection, SectionHeading, SectionNav } from "@/components/guide";
import { OnSitePartners, ResourceCard, ToolItem } from "@/components/guide/Resources";
import {
  BUILDING_HREF,
  DEVELOPER_TOOLS,
  DEVELOPER_TOOLS_NOTE,
  GUIDE_BASE_PATH,
  MLH_NOTE,
  PARTNER_CORNER,
  RESOURCE_CATEGORIES,
  RESOURCES_GUIDE,
  RESOURCES_INTRO,
  resourcesIn,
} from "@/lib/hackathon-2026";

const inlineLink =
  "text-white underline decoration-white/30 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const NAV_LABEL: Record<string, string> = {
  computing: "Computing",
  models: "AI models",
  building: "App building",
};

export default function ResourcesGuidePage() {
  return (
    <>
      <GuideHero
        crumbs={[
          { label: "Hackathon 2026", href: "/hackathon" },
          { label: "Field Guide", href: GUIDE_BASE_PATH },
          { label: RESOURCES_GUIDE.name },
        ]}
        title={RESOURCES_GUIDE.name}
        lede={RESOURCES_GUIDE.lede}
      >
        <div className="grid max-w-4xl grid-cols-1 gap-4 text-sm leading-relaxed md:grid-cols-2" data-resources-intro>
          <p className="border-l-2 border-(--color-event) pl-4 text-neutral-300">{RESOURCES_INTRO.start}</p>
          <p className="border-l-2 border-white/15 pl-4 text-neutral-400">
            {RESOURCES_INTRO.freedom}{" "}
            <Link href={BUILDING_HREF} className={inlineLink}>
              The AI tools policy
            </Link>
            .
          </p>
        </div>
      </GuideHero>

      <SectionNav
        items={[
          ...RESOURCE_CATEGORIES.map((c) => ({ id: c.id, label: NAV_LABEL[c.id] ?? c.title })),
          { id: "tools", label: "Developer tools" },
          { id: "on-site", label: "On site" },
          { id: "help", label: "Help" },
        ]}
      />

      {RESOURCE_CATEGORIES.map((category, i) => (
        <GuideSection key={category.id} id={category.id}>
          <SectionHeading
            id={`${category.id}-title`}
            eyebrow={`// ${category.title.toLowerCase()}`}
            title={`${category.title}.`}
            lede={category.lede}
          />
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {resourcesIn(category.id).map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </ul>
          {i === RESOURCE_CATEGORIES.length - 1 && (
            <p className="mt-6 max-w-3xl text-sm text-neutral-300 leading-relaxed">
              <span className="font-semibold text-white">Keep it safe.</span> {RESOURCES_INTRO.security}
            </p>
          )}
        </GuideSection>
      ))}

      <GuideSection id="tools">
        <SectionHeading
          id="tools-title"
          eyebrow="// additional developer tools"
          title="Additional developer tools."
          lede={DEVELOPER_TOOLS_NOTE}
        />
        <ul className="grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {DEVELOPER_TOOLS.map((t) => (
            <ToolItem key={t.name} tool={t} />
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="on-site">
        <SectionHeading
          id="on-site-title"
          eyebrow={`// biocity · ${PARTNER_CORNER.toLowerCase()}`}
          title="Partners on site."
          lede="Six partner stands are planned in BioCity's main lobby, beside the build hall. Solita and BearingPoint also mentor builders."
        />
        <OnSitePartners />
        <p className="mt-6 max-w-3xl text-sm text-neutral-400 leading-relaxed" data-mlh-note>
          {MLH_NOTE}
        </p>
      </GuideSection>

      <GuideSection id="help">
        <SectionHeading id="help-title" eyebrow="// help" title="Questions?" />
        <HelpSection />
      </GuideSection>
    </>
  );
}
