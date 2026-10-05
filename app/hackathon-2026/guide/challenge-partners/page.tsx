import {
  AccommodationSection,
  CalendarButton,
  Checklist,
  CompanyDirectory,
  CriticalPath,
  Details,
  DiscordSection,
  FactsStrip,
  GuideHero,
  GuideSection,
  HelpSection,
  NowNext,
  RouteCard,
  RouteLinks,
  Schedule,
  SectionHeading,
  SectionNav,
  StatusTag,
  VenueCards,
  VenueExplorer,
} from "@/components/guide";
import {
  CHALLENGE_COMPANIES,
  CHECKLISTS,
  CRITICAL_PATH,
  DETAILS,
  getGuide,
  getScheduleItem,
  GUIDE_BASE_PATH,
  scheduleFor,
} from "@/lib/hackathon-2026";

const AUDIENCE = "challenge-partners" as const;
const guide = getGuide(AUDIENCE);
const schedule = scheduleFor(AUDIENCE);

export default function ChallengePartnerGuidePage() {
  return (
    <>
      <GuideHero
        crumbs={[
          { label: "Hackathon 2026", href: "/hackathon" },
          { label: "Field Guide", href: GUIDE_BASE_PATH },
          { label: guide.name },
        ]}
        title={guide.name}
        lede={guide.lede}
      >
        <FactsStrip
          facts={[
            { label: "Arrive", value: "Fri 15:30", sub: "EduCity · briefing 15:40", strong: true },
            { label: "Official opening", value: "Fri 17:00", sub: "EduCity" },
            { label: "Your briefing", value: "Fri 18:30–19:30", sub: "Your EduCity room", strong: true },
            { label: "Q&A at Joki", value: "Sat 09–12 · 14–18", sub: "At least 2 h of presence" },
            { label: "Evaluation", value: "Sun 10:00–13:00", sub: "Briefing 08:15 at EduCity" },
            { label: "Winners · finals", value: "Sun 13:30 · 14:00", sub: "EduCity" },
          ]}
        />
        <NowNext items={schedule} audience={AUDIENCE} firstMoment={getScheduleItem(guide.firstMomentId)} />
      </GuideHero>

      <SectionNav
        items={[
          { id: "your-place", label: "Your place" },
          { id: "steps", label: "Steps" },
          { id: "schedule", label: "Schedule" },
          { id: "prepare", label: "Prepare" },
          { id: "discord", label: "Discord" },
          { id: "venues", label: "Venues" },
          { id: "accommodation", label: "Hotels" },
          { id: "maps", label: "Maps" },
          { id: "details", label: "Details" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="your-place">
        <SectionHeading
          id="your-place-title"
          eyebrow="// your place"
          title="Your room and your stand."
          lede="Friday briefing room at EduCity and Saturday Q&A stand at Joki for all 15 challenge companies. Open your company page for a one-link summary to share with your team."
        />
        <p className="mb-6 flex flex-wrap items-center gap-3 text-xs text-white/55">
          <StatusTag status="working" />
          Placements follow the 2 Oct 2026 venue maps; production does a final lock — this page updates if anything
          moves.
        </p>
        <CompanyDirectory companies={CHALLENGE_COMPANIES} />
      </GuideSection>

      <GuideSection id="steps">
        <SectionHeading id="steps-title" eyebrow="// your weekend" title="Arrive, brief, support, evaluate." />
        <CriticalPath label="Challenge partner steps" steps={CRITICAL_PATH["challenge-partners"] ?? []} />
      </GuideSection>

      <GuideSection id="schedule">
        <SectionHeading
          id="schedule-title"
          eyebrow="// schedule"
          title="Your timeline."
          lede="Local Turku time (EET, UTC+2). Food will be reserved for company representatives at the scheduled meal times — joining the meals is entirely optional."
        />
        <div className="mb-8 flex flex-wrap gap-3">
          <CalendarButton audience={AUDIENCE} />
        </div>
        <Schedule items={schedule} audience={AUDIENCE} />
      </GuideSection>

      <GuideSection id="prepare">
        <SectionHeading
          id="prepare-title"
          eyebrow="// prepare"
          title="What we need — and what teams need from you."
          lede={
            <>
              Send everything in one reply to{" "}
              <a className="text-white underline underline-offset-4" href="mailto:info@sinceai.fi">
                info@sinceai.fi
              </a>
              . All live challenge content and support must be available in English.
            </>
          }
        />
        <Checklist storageKey="challenge-partners" groups={CHECKLISTS["challenge-partners"]} />
      </GuideSection>

      <DiscordSection audience={AUDIENCE} />

      <GuideSection id="venues">
        <SectionHeading
          id="venues-title"
          eyebrow="// where"
          title="EduCity on Friday and Sunday. Joki on Saturday."
          lede="The Company Lounge in Joki (floor 1, next to the Showroom) is yours all weekend."
        />
        <VenueCards venues={["educity", "joki", "biocity"]} />
        <div className="mt-10 space-y-10">
          <RouteLinks
            title="Friday · getting to EduCity, step by step in 3D"
            ids={["partners-fri-parkcity-edu", "partners-fri-train-edu", "partners-fri-stepfree-edu"]}
          />
          <RouteLinks
            title="Saturday · getting to Joki, step by step in 3D"
            ids={["companies-tykistokatu-to-showroom", "companies-train-to-biocity", "companies-parkcity-to-biocity"]}
          />
        </div>
        <div className="mt-8">
          <RouteCard />
        </div>
      </GuideSection>

      <AccommodationSection />

      <GuideSection id="maps">
        <SectionHeading
          id="maps-title"
          eyebrow="// maps"
          title="Rooms and stands."
          lede="EduCity briefing rooms, then the Joki Showroom and floors 2–3. Tap a map to zoom."
        />
        <VenueExplorer
          mapIds={["educity-1", "educity-2", "educity-flow-1", "joki-showroom", "joki-2-3", "joki-1"]}
          label="Challenge partner maps"
        />
      </GuideSection>

      <GuideSection id="details">
        <SectionHeading id="details-title" eyebrow="// details" title="Good to know." />
        <Details items={DETAILS["challenge-partners"]} />
      </GuideSection>

      <GuideSection id="help">
        <SectionHeading id="help-title" eyebrow="// help" title="Questions?" />
        <HelpSection onSiteNote="Event staff guide challenge partners at EduCity on Friday. All weekend, any Since AI volunteer or staff member can reach the company team." />
      </GuideSection>
    </>
  );
}
