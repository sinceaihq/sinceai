import Link from "next/link";
import { GuideHero, GuideSection, HelpSection, SectionHeading, SectionNav } from "@/components/guide";
import { ConfidentialRules, FiwareResources, HowToEnter, MlhAwards, TechnologyAwards } from "@/components/guide/Awards";
import { OnSitePartners, ResourceCard, ToolItem } from "@/components/guide/Resources";
import {
  AWARDS_ANCHOR,
  BUILDING_HREF,
  CONFIDENTIAL_ANCHOR,
  DEVELOPER_TOOLS,
  DEVELOPER_TOOLS_NOTE,
  FIWARE_RESOURCES_ANCHOR,
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
  standards: "Open standards",
};

/** The page at a glance: what a new builder needs to find within seconds. */
const AT_A_GLANCE = [
  { href: "#computing", label: "Tools & benefits", text: "Partner technologies, credits and quickstarts." },
  { href: `#${AWARDS_ANCHOR}`, label: "Extra prizes", text: "7 MLH categories, Red Hat and FIWARE awards." },
  { href: "#how-to-enter", label: "How to enter", text: "All in sinceai.app — one submission, tick the awards." },
  { href: `#${FIWARE_RESOURCES_ANCHOR}`, label: "Start with FIWARE", text: "A context broker running in ten minutes." },
  { href: `#${CONFIDENTIAL_ANCHOR}`, label: "What is confidential", text: "FORCIT's NDA challenge and public-safe summaries." },
  { href: "#help", label: "Get help", text: "Discord, email and people on site." },
] as const;

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
        <nav aria-label="This page at a glance" className="mt-8" data-at-a-glance>
          <ul className="grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {AT_A_GLANCE.map((item) => (
              <li key={item.href} className="border-b border-r border-white/10">
                <a
                  href={item.href}
                  className="flex h-full flex-col p-4 transition-colors hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
                >
                  <span className="font-semibold text-white">
                    {item.label} <span aria-hidden="true">→</span>
                  </span>
                  <span className="mt-1 text-sm text-neutral-400">{item.text}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </GuideHero>

      <SectionNav
        items={[
          ...RESOURCE_CATEGORIES.map((c) => ({ id: c.id, label: NAV_LABEL[c.id] ?? c.title })),
          { id: AWARDS_ANCHOR, label: "Optional awards" },
          { id: FIWARE_RESOURCES_ANCHOR, label: "FIWARE resources" },
          { id: CONFIDENTIAL_ANCHOR, label: "Confidential" },
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

      <GuideSection id={AWARDS_ANCHOR}>
        <SectionHeading
          id={`${AWARDS_ANCHOR}-title`}
          eyebrow="// optional awards · extra prizes"
          title="Win more with the same project."
          lede="Optional awards on top of your company challenge. They never replace it, never use its places and never change its evaluation — enter as many as fit."
        />
        <div id="how-to-enter" className="scroll-mt-28">
          <h3 className="mb-4 text-xl font-bold tracking-tight text-white">How to enter</h3>
          <HowToEnter />
        </div>
        <h3 className="mb-4 mt-12 text-xl font-bold tracking-tight text-white">Technology awards</h3>
        <TechnologyAwards />
        <h3 className="mb-4 mt-12 text-xl font-bold tracking-tight text-white">MLH prize categories</h3>
        <MlhAwards />
      </GuideSection>

      <GuideSection id={FIWARE_RESOURCES_ANCHOR}>
        <SectionHeading
          id={`${FIWARE_RESOURCES_ANCHOR}-title`}
          eyebrow="// fiware builder pack"
          title="Build with FIWARE."
          lede="NGSI-LD, Smart Data Models and context brokers — from your first entity to an AI agent on live context data. Beginners welcome."
        />
        <FiwareResources />
      </GuideSection>

      <GuideSection id={CONFIDENTIAL_ANCHOR}>
        <SectionHeading
          id={`${CONFIDENTIAL_ANCHOR}-title`}
          eyebrow="// confidential challenges · nda"
          title="Confidential data stays confidential."
        />
        <ConfidentialRules />
      </GuideSection>

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
