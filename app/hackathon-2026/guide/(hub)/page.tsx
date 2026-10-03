import Link from "next/link";
import {
  CriticalPath,
  FactsStrip,
  GuideCards,
  GuideHero,
  GuideSection,
  HelpSection,
  RouteCard,
  Schedule,
  SectionHeading,
  SectionNav,
  VenueCards,
  primaryButtonClass,
} from "@/components/guide";
import { Venue3DTeaser } from "@/components/guide/venue3d/Venue3DTeaser";
import {
  EVENT_2026,
  getScheduleItem,
  GUIDE_BASE_PATH,
  HUB,
  HUB_MILESTONE_IDS,
} from "@/lib/hackathon-2026";

const milestones = HUB_MILESTONE_IDS.map(getScheduleItem);

export default function FieldGuideHubPage() {
  return (
    <>
      <GuideHero
        crumbs={[{ label: "Hackathon 2026", href: "/hackathon" }, { label: "Field Guide" }]}
        title="Field Guide"
        lede={HUB.lede}
      >
        <FactsStrip
          facts={[
            { label: "Dates", value: "6–8 Nov 2026", sub: "Turku, Finland" },
            { label: "Official opening", value: "Fri 17:00", sub: "EduCity", strong: true },
            { label: "Build spaces", value: "BioCity + Joki", sub: "Around the clock" },
            { label: "Submissions close", value: "Sun 10:00", sub: "Hard deadline", strong: true },
            { label: "Closing ceremony", value: "Sun 13:00", sub: "EduCity" },
            { label: "Event ends", value: "Sun 15:00", sub: "Awards ~14:00" },
          ]}
        />
        <p className="text-sm text-neutral-400">{HUB.openingNote}</p>
      </GuideHero>

      <SectionNav
        items={[
          { id: "guides", label: "Your guide" },
          { id: "weekend", label: "Weekend" },
          { id: "venues", label: "Venues" },
          { id: "preview", label: "3D preview" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="guides">
        <SectionHeading
          id="guides-title"
          eyebrow="// choose your guide"
          title="One page per role."
          lede="Each guide puts your next action first: where to be, when, what to bring — and where to get help."
        />
        <GuideCards />
        <div className="mt-4">
          <Link
            href={`${GUIDE_BASE_PATH}/venue`}
            className="group flex items-center justify-between gap-6 border border-white/10 p-6 transition-colors hover:border-white/30 hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:p-8"
          >
            <span>
              <span className="block font-mono text-xs uppercase tracking-widest text-neutral-500">
                Everyone
              </span>
              <span className="mt-3 block text-2xl md:text-3xl font-bold tracking-tight text-white">
                Venue Explorer
              </span>
              <span className="mt-3 block max-w-xl text-sm text-neutral-400 leading-relaxed">
                Zoomable floor plans for EduCity, BioCity and Joki — and a 3D preview of the event spaces.
              </span>
            </span>
            <span aria-hidden="true" className="text-2xl text-neutral-500 transition-colors group-hover:text-white">
              →
            </span>
          </Link>
        </div>
      </GuideSection>

      <GuideSection id="weekend">
        <SectionHeading
          id="weekend-title"
          eyebrow="// the weekend at a glance"
          title="Friday to Sunday."
          lede={`Shared milestones for everyone. Role-specific times are in your guide. All times ${EVENT_2026.timezoneLabel}.`}
        />
        <div className="mb-12">
          <CriticalPath
            label="Event flow"
            steps={[
              { label: "Arrive", time: "Fri afternoon", text: "EduCity — role-specific arrival times." },
              { label: "Opening", time: "Fri 17:00", text: "EduCity lobby, Taidon portaat." },
              { label: "Briefings", time: "Fri 18:30", text: "Company rooms at EduCity." },
              { label: "Build", time: "Fri 19:30 →", text: "BioCity + Joki, around the clock." },
              { label: "Closing", time: "Sun 13:00", text: "EduCity — finalists and awards." },
            ]}
          />
        </div>
        <Schedule items={milestones} idPrefix="hub" />
      </GuideSection>

      <GuideSection id="venues">
        <SectionHeading
          id="venues-title"
          eyebrow="// three venues, one event flow"
          title="EduCity, BioCity, Joki."
          lede="All three are on the Turku Science Park campus in Kupittaa, a short walk apart. Kupittaa railway station is next to the campus."
        />
        <VenueCards venues={["educity", "biocity", "joki"]} />
        <div className="mt-8">
          <RouteCard />
        </div>
      </GuideSection>

      <GuideSection id="preview">
        <SectionHeading
          id="preview-title"
          eyebrow="// preview the space"
          title="Walk the Showroom before you arrive."
          lede="An illustrative 3D preview of the Joki Showroom, the Q&A floors and the BioCity build hall — dark, focused and lit in violet."
        />
        <Venue3DTeaser />
        <div className="mt-6">
          <Link href={`${GUIDE_BASE_PATH}/venue#preview-3d`} className={primaryButtonClass}>
            Open the 3D preview
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
        </div>
      </GuideSection>

      <GuideSection id="help">
        <SectionHeading id="help-title" eyebrow="// help" title="Questions?" />
        <HelpSection />
      </GuideSection>
    </>
  );
}
