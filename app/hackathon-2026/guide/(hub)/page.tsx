import Link from "next/link";
import {
  AccommodationSection,
  BuildingHubLink,
  ResourcesHubLink,
  ComputingCallout,
  ComputingSection,
  CriticalPath,
  FactsStrip,
  FoodSummary,
  ParkingHubSection,
  GuideCards,
  GuideHero,
  GuideSection,
  HelpSection,
  RouteCard,
  Schedule,
  SectionHeading,
  SectionNav,
  VenueCards,
  WifiSection,
  primaryButtonClass,
} from "@/components/guide";
import { TwinTeaser } from "@/components/guide/twin/TwinTeaser";
import {
  COMPUTING_ANCHOR,
  DISCORD_GUIDE,
  DISCORD_GUIDE_PATH,
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
            { label: "Closing ceremony", value: "Sun 13:15", sub: "EduCity · top three per challenge 13:30" },
            { label: "Finals", value: "Sun 14:00", sub: "Five teams live on stage · ends around 15:30" },
          ]}
        />
        <p className="text-sm text-neutral-400">{HUB.openingNote}</p>
        <ComputingCallout inPage />
      </GuideHero>

      <SectionNav
        items={[
          { id: "guides", label: "Your guide" },
          { id: COMPUTING_ANCHOR, label: "AI resources" },
          { id: "weekend", label: "Weekend" },
          { id: "venues", label: "Venues" },
          { id: "wifi", label: "Wi-Fi" },
          { id: "parking", label: "Parking" },
          { id: "food", label: "Food" },
          { id: "accommodation", label: "Hotels" },
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
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href={`${GUIDE_BASE_PATH}/venue`}
            className="group flex h-full items-center justify-between gap-6 border border-white/10 p-6 transition-colors hover:border-white/30 hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:p-8"
          >
            <span>
              <span className="block font-mono text-xs uppercase tracking-widest text-white/55">Everyone</span>
              <span className="mt-3 block text-2xl md:text-3xl font-bold tracking-tight text-white">
                Venue Explorer
              </span>
              <span className="mt-3 block max-w-xl text-sm text-neutral-400 leading-relaxed">
                Zoomable floor plans for EduCity, BioCity and Joki, the weekend menu — and a 3D preview of the event spaces.
              </span>
            </span>
            <span aria-hidden="true" className="text-2xl text-white/55 transition-colors group-hover:text-white">
              →
            </span>
          </Link>
          <Link
            href={DISCORD_GUIDE_PATH}
            className="group flex h-full items-center justify-between gap-6 border border-white/10 p-6 transition-colors hover:border-white/30 hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:p-8"
          >
            <span>
              <span className="block font-mono text-xs uppercase tracking-widest text-white/55">Partners · new to Discord</span>
              <span className="mt-3 block text-2xl md:text-3xl font-bold tracking-tight text-white">
                {DISCORD_GUIDE.name}
              </span>
              <span className="mt-3 block max-w-xl text-sm text-neutral-400 leading-relaxed">
                How partners use the Since AI Discord, step by step with pictures — no Discord experience needed.
              </span>
            </span>
            <span aria-hidden="true" className="text-2xl text-white/55 transition-colors group-hover:text-white">
              →
            </span>
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <BuildingHubLink />
          <ResourcesHubLink />
        </div>
      </GuideSection>

      <ComputingSection />

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
              { label: "Opening", time: "Fri 17:00", text: "EduCity lobby, Taidon portaat — challenge selection until 17:30, then Jason Mayes." },
              { label: "Briefings", time: "Fri 18:50", text: "Company rooms at EduCity, until 19:30." },
              { label: "Build", time: "Fri 19:30 →", text: "Dinner, then BioCity + Joki around the clock." },
              { label: "Closing · finals", time: "Sun 13:15", text: "EduCity — closing ceremony, each challenge's top three, then the finals at 14:00." },
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

      <WifiSection />

      <ParkingHubSection />

      <FoodSummary />

      <AccommodationSection />

      <GuideSection id="preview">
        <SectionHeading
          id="preview-title"
          eyebrow="// the whole campus in 3D"
          title="Walk the campus before you arrive."
          lede="EduCity, BioCity and Joki in 3D, built to scale from City of Turku open data: find your room or stand, follow the arrival routes and see the campus at the hour you arrive."
        />
        <TwinTeaser />
        <div className="mt-6">
          <Link href={`${GUIDE_BASE_PATH}/venue#preview-3d`} className={primaryButtonClass}>
            Open the 3D campus
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
