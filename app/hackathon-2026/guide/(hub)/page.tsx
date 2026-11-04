import Link from "next/link";
import {
  AddToCalendar,
  AccommodationSection,
  BuildingHubLink,
  ComputingCallout,
  FactsStrip,
  FeaturedToolStrip,
  FoodSummary,
  ParkingHubSection,
  GuideCards,
  GuideHero,
  GuideSection,
  HelpSection,
  MlhOnSite,
  NowNext,
  QuickLinks,
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
  COMPUTING_HREF,
  RESOURCES_PATH,
  DISCORD_GUIDE,
  DISCORD_GUIDE_PATH,
  EVENT_2026,
  getScheduleItem,
  GUIDE_BASE_PATH,
  HUB,
  HUB_MILESTONE_IDS,
  WINNING_ANCHOR,
} from "@/lib/hackathon-2026";

const milestones = HUB_MILESTONE_IDS.map(getScheduleItem);
/** "What's next" for everyone: Thursday's summaries, MLH's introduction and the shared milestones. */
const nowNextItems = [getScheduleItem("thu-challenge-summaries"), getScheduleItem("fri-mlh-intro"), ...milestones].sort(
  (a, b) => Date.parse(a.start) - Date.parse(b.start),
);

export default function FieldGuideHubPage() {
  return (
    <>
      <GuideHero
        crumbs={[{ label: "Hackathon 2026", href: "/hackathon" }, { label: "Field Guide" }]}
        title="Since AI Hackathon 2026"
        lede={HUB.lede}
      >
        <NowNext items={nowNextItems} firstMoment={getScheduleItem("fri-registration")} />
        <QuickLinks />
        <AddToCalendar />
        {/* Renders only before the CSC / LUMI registration deadline (30 Oct 2026). */}
        <ComputingCallout />
      </GuideHero>

      <SectionNav
        items={[
          { id: "ai-tools", label: "AI tools" },
          { id: "guides", label: "Your guide" },
          { id: "weekend", label: "Schedule" },
          { id: "venues", label: "Venues" },
          { id: "wifi", label: "Wi-Fi" },
          { id: "food", label: "Food" },
          { id: "parking", label: "Parking" },
          { id: "accommodation", label: "Hotels" },
          { id: "preview", label: "3D campus" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="ai-tools">
        {/* Earlier links to the hub's CSC / LUMI section land here; its full content is on AI Tools & Resources. */}
        <span id={COMPUTING_ANCHOR} className="block scroll-mt-32" />
        <SectionHeading
          id="ai-tools-title"
          eyebrow="// ai tools & resources"
          title="Start building with AI."
          lede="AI coding assistants, models, cloud credits and free resources — what each one is, what you get and how to start."
        />
        <FeaturedToolStrip resourcesPath={RESOURCES_PATH} />
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href={RESOURCES_PATH} className={primaryButtonClass}>
            Open AI Tools &amp; Resources
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
          <p className="text-sm text-neutral-400">
            CSC / LUMI supercomputer access was for those who registered by Fri 30 Oct —{" "}
            <Link href={COMPUTING_HREF} className="text-white underline underline-offset-4">
              details
            </Link>
            .
          </p>
        </div>
      </GuideSection>

      <GuideSection id="guides">
        <SectionHeading
          id="guides-title"
          eyebrow="// choose your guide"
          title="Who are you?"
          lede="Your guide has your arrival time, your next step and where to get help."
        />
        <GuideCards compact />
        <p className="mt-4 text-sm">
          <Link
            href={`${GUIDE_BASE_PATH}/builders#${WINNING_ANCHOR}`}
            className="inline-flex min-h-11 items-center font-semibold text-white underline underline-offset-4 decoration-white/40 hover:decoration-white"
          >
            Builders: how to build a project that wins
            <span aria-hidden="true" className="ml-1.5">
              →
            </span>
          </Link>
        </p>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
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
        </div>
      </GuideSection>

      <GuideSection id="weekend">
        <SectionHeading
          id="weekend-title"
          eyebrow="// schedule"
          title="Friday to Sunday."
          lede={`The moments everyone shares. Your guide has your role's times. All times ${EVENT_2026.timezoneLabel}.`}
        />
        <div className="mb-10">
          <FactsStrip
            label="Key times"
            facts={[
              { label: "Registration", value: "Fri 15:00", sub: "EduCity" },
              { label: "Official opening", value: "Fri 17:00", sub: "EduCity", strong: true },
              { label: "Build", value: "Fri 19:30 →", sub: "BioCity + Joki, around the clock" },
              { label: "Submissions close", value: "Sun 10:00", sub: "Hard deadline · sinceai.app", strong: true },
              { label: "Closing ceremony", value: "Sun 13:15", sub: "EduCity · top three per challenge 13:30" },
              { label: "Finals", value: "Sun 14:00", sub: "Five teams on stage · ends around 15:30" },
            ]}
          />
        </div>
        <Schedule items={milestones} idPrefix="hub" />
        <div className="mt-12">
          <MlhOnSite compact />
        </div>
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

      <FoodSummary />


      <ParkingHubSection />

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
