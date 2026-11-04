import Link from "next/link";
import {
  ComputingSection,
  FeaturedToolCard,
  GuideHero,
  GuideSection,
  HelpSection,
  MlhOnSite,
  SectionHeading,
  SectionNav,
  ToolCard,
  Workshops,
} from "@/components/guide";
import {
  AwardsAtAGlance,
  ConfidentialRules,
  FiwareResources,
  HowToEnter,
  MlhAwards,
  TechnologyAwards,
} from "@/components/guide/Awards";
import { OnSitePartners } from "@/components/guide/Resources";
import {
  AWARDS_ANCHOR,
  BUILDING_HREF,
  CONFIDENTIAL_ANCHOR,
  FEATURED_TOOLS,
  FIWARE_RESOURCES_ANCHOR,
  GUIDE_BASE_PATH,
  MLH_ANCHOR,
  MLH_AWARDS,
  MLH_AWARDS_ANCHOR,
  MLH_NOTE,
  PARTNER_CORNER,
  RESOURCES_GUIDE,
  RESOURCES_INTRO,
  TOOL_CATEGORIES,
  toolAnchor,
  toolsIn,
  WORKSHOPS_ANCHOR,
} from "@/lib/hackathon-2026";

const inlineLink =
  "text-white underline decoration-white/30 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const NAV_LABEL: Record<string, string> = {
  coding: "Coding & apps",
  models: "Models & APIs",
  cloud: "Cloud & data",
  advanced: "Advanced",
};

/**
 * AI Tools & Resources (organiser, 4 Nov 2026): recognisable tools first, then
 * everything else by what a builder wants to do, then MLH on site, then the
 * optional awards. Every card comes from lib/hackathon-2026/tools.ts.
 */
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
      />

      <SectionNav
        items={[
          { id: "start", label: "Start here" },
          ...TOOL_CATEGORIES.map((c) => ({ id: c.id, label: NAV_LABEL[c.id] ?? c.title })),
          { id: MLH_ANCHOR, label: "MLH on site" },
          { id: AWARDS_ANCHOR, label: "Optional awards" },
          { id: CONFIDENTIAL_ANCHOR, label: "Confidential" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="start" className="border-t-0 pt-8 md:pt-12">
        <SectionHeading
          id="start-title"
          eyebrow="// start here"
          title="Start building with AI."
          lede="Explore AI coding assistants, models, cloud credits and free resources to help you build your hackathon project."
        />
        <ul
          className="grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3"
          data-featured-tools
        >
          {FEATURED_TOOLS.map((tool) => (
            <FeaturedToolCard key={tool.id} tool={tool} />
          ))}
        </ul>
        <div className="mt-8 grid max-w-4xl grid-cols-1 gap-4 text-sm leading-relaxed md:grid-cols-3" data-resources-intro>
          <p className="border-l-2 border-(--color-event) pl-4 text-neutral-300">{RESOURCES_INTRO.start}</p>
          <p className="border-l-2 border-white/15 pl-4 text-neutral-400">
            {RESOURCES_INTRO.freedom}{" "}
            <Link href={BUILDING_HREF} className={inlineLink}>
              The AI tools policy
            </Link>
            .
          </p>
          <p className="border-l-2 border-white/15 pl-4 text-neutral-400" data-resources-security>
            <span className="font-semibold text-white">Keep it safe.</span> {RESOURCES_INTRO.security}
          </p>
        </div>
      </GuideSection>

      {TOOL_CATEGORIES.map((category) => {
        const tools = toolsIn(category.id);
        const others = tools.filter((t) => !t.featured);
        const featured = tools.filter((t) => t.featured);
        return (
          <GuideSection key={category.id} id={category.id}>
            {/* Earlier links to the sections this one replaced still land here. */}
            {category.formerAnchors.map((a) => (
              <span key={a} id={a} className="block scroll-mt-32" />
            ))}
            <SectionHeading
              id={`${category.id}-title`}
              eyebrow={`// ${category.title.toLowerCase()}`}
              title={`${category.title}.`}
              lede={category.lede}
            />
            {featured.length > 0 && (
              <p className="mb-4 text-sm text-neutral-400">
                Also here, at the top of the page:{" "}
                {featured.map((t, i) => (
                  <span key={t.id}>
                    {i > 0 && ", "}
                    <a href={`#${toolAnchor(t.id)}`} className={inlineLink}>
                      {t.name}
                    </a>
                  </span>
                ))}
                .
              </p>
            )}
            {others.length > 0 && (
              <ul className="grid grid-cols-1 border-l border-t border-white/10 md:grid-cols-2 lg:grid-cols-3">
                {others.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </ul>
            )}
          </GuideSection>
        );
      })}

      {/* CSC / LUMI in full — eligibility, deadline and what it offers (moved here from the hub). */}
      <ComputingSection />

      <GuideSection id={FIWARE_RESOURCES_ANCHOR}>
        <SectionHeading
          id={`${FIWARE_RESOURCES_ANCHOR}-title`}
          eyebrow="// fiware builder pack"
          title="Build with FIWARE."
          lede="NGSI-LD, Smart Data Models and context brokers — from your first entity to an AI agent on live context data. Beginners welcome."
        />
        <FiwareResources />
      </GuideSection>

      <GuideSection id={MLH_ANCHOR}>
        <SectionHeading id={`${MLH_ANCHOR}-title`} eyebrow="// major league hacking · biocity" title="MLH at Since AI" />
        <MlhOnSite />
        <div id={WORKSHOPS_ANCHOR} className="mt-14 scroll-mt-32">
          <h3 id={`${WORKSHOPS_ANCHOR}-title`} className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            Workshops
          </h3>
          <p className="mb-6 mt-2 max-w-2xl text-neutral-300">
            Two optional, hands-on MLH sessions on Friday evening to get you building with AI tools.
          </p>
          <Workshops />
        </div>
        <p className="mt-10 max-w-3xl text-sm text-neutral-400 leading-relaxed" data-mlh-note>
          {MLH_NOTE}
        </p>
      </GuideSection>

      <GuideSection id={AWARDS_ANCHOR}>
        <SectionHeading
          id={`${AWARDS_ANCHOR}-title`}
          eyebrow="// optional awards"
          title="Win more with the same project."
          lede="Optional awards on top of your company challenge. They never replace it, never use its places and never change its evaluation — enter as many as fit."
        />
        <h3 className="mb-4 text-xl font-bold tracking-tight text-white">At a glance</h3>
        <AwardsAtAGlance />
        <div id="how-to-enter" className="mt-12">
          <h3 className="mb-4 text-xl font-bold tracking-tight text-white">How to enter</h3>
          <HowToEnter />
        </div>
        <div id={MLH_AWARDS_ANCHOR} className="mt-12 scroll-mt-32">
          <h3 id={`${MLH_AWARDS_ANCHOR}-title`} className="mb-4 text-xl font-bold tracking-tight text-white">
            MLH prize categories ({MLH_AWARDS.length})
          </h3>
          <MlhAwards />
        </div>
        <h3 className="mb-4 mt-12 text-xl font-bold tracking-tight text-white">Technology awards</h3>
        <TechnologyAwards />
      </GuideSection>

      <GuideSection id={CONFIDENTIAL_ANCHOR}>
        <SectionHeading
          id={`${CONFIDENTIAL_ANCHOR}-title`}
          eyebrow="// confidential challenges · nda"
          title="Confidential data stays confidential."
        />
        <ConfidentialRules />
      </GuideSection>

      <GuideSection id="on-site">
        <SectionHeading
          id="on-site-title"
          eyebrow={`// biocity · ${PARTNER_CORNER.toLowerCase()}`}
          title="Partners on site."
          lede="Seven partner stands are planned in BioCity's main lobby, beside the build hall. Solita and BearingPoint also mentor builders."
        />
        <OnSitePartners />
      </GuideSection>

      <GuideSection id="help">
        <SectionHeading id="help-title" eyebrow="// help" title="Questions?" />
        <HelpSection />
      </GuideSection>
    </>
  );
}
