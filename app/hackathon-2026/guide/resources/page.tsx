import Link from "next/link";
import {
  FactsStrip,
  GuideHero,
  GuideSection,
  HelpSection,
  SectionHeading,
  SectionNav,
} from "@/components/guide";
import { OnSitePartners, ResourceCard, ToolItem } from "@/components/guide/Resources";
import {
  BUILDING_HREF,
  COMPUTING,
  EVENT_RESOURCES,
  GUIDE_BASE_PATH,
  OTHER_TOOLS,
  PARTNER_CORNER,
  PARTNER_DOCS,
  RESOURCES_GUIDE,
  RESOURCES_NOTES,
} from "@/lib/hackathon-2026";

const inlineLink =
  "text-white underline decoration-white/30 underline-offset-4 hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

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
        <FactsStrip
          facts={[
            { label: "CSC / LUMI", value: COMPUTING.deadlineShort, sub: "Registration deadline", strong: true },
            { label: "Featherless AI", value: "4–5 Nov", sub: "Instructions sent separately" },
            { label: "Pruna AI", value: "Fri 6 Nov", sub: "Shared API key on Pruna's onepager" },
            { label: "ElevenLabs", value: "Pending", sub: "Redemption activation" },
          ]}
        />
        <p className="max-w-3xl text-sm text-neutral-400 leading-relaxed">
          {RESOURCES_NOTES.anyTool}{" "}
          <Link href={BUILDING_HREF} className={inlineLink}>
            The AI tools policy
          </Link>
          .
        </p>
      </GuideHero>

      <SectionNav
        items={[
          { id: "event", label: "Event resources" },
          { id: "on-site", label: "On site" },
          { id: "tools", label: "More tools" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="event">
        <SectionHeading
          id="event-title"
          eyebrow="// event resources"
          title="Computing, models and credits."
          lede="Each card says whether there is event access, when it opens, where your instructions are and who helps. Links go to each partner's own pages."
        />
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {EVENT_RESOURCES.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </ul>
        <p className="mt-6 max-w-3xl text-sm text-neutral-300 leading-relaxed">
          <span className="font-semibold text-white">Keep it safe.</span> {RESOURCES_NOTES.security}
        </p>
      </GuideSection>

      <GuideSection id="on-site">
        <SectionHeading
          id="on-site-title"
          eyebrow={`// biocity · ${PARTNER_CORNER.toLowerCase()}`}
          title="Partners on site."
          lede="Six partner stands are planned in BioCity's main lobby, beside the build hall. Solita and BearingPoint also mentor builders."
        />
        <OnSitePartners />
      </GuideSection>

      <GuideSection id="tools">
        <SectionHeading
          id="tools-title"
          eyebrow="// more tools"
          title="Documentation for other tools."
          lede="No event-specific credits or support are confirmed for these — use them like any other tool."
        />
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...PARTNER_DOCS, ...OTHER_TOOLS].map((t) => (
            <ToolItem key={t.name} tool={t} />
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="help">
        <SectionHeading id="help-title" eyebrow="// help" title="Questions?" />
        <HelpSection />
      </GuideSection>
    </>
  );
}
