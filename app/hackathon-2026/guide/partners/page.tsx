import {
  AccommodationSection,
  CalendarButton,
  Checklist,
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
  StandPlan,
  VenueCards,
  ParkingSummary,
} from "@/components/guide";
import { TwinTeaser } from "@/components/guide/twin/TwinTeaser";
import {
  CHECKLISTS,
  CRITICAL_PATH,
  DETAILS,
  getGuide,
  getScheduleItem,
  GUIDE_BASE_PATH,
  scheduleFor,
  CAR_ARRIVAL,
} from "@/lib/hackathon-2026";

const AUDIENCE = "partners" as const;
const guide = getGuide(AUDIENCE);
const schedule = scheduleFor(AUDIENCE);

const PARTNER_TYPES = [
  {
    title: "Visibility partner",
    text: "A stand at BioCity, open for the whole event, plus any visibility agreed with you.",
  },
  {
    title: "Tech partner",
    text: "APIs, compute, credits, hardware or mentors for builders — with or without a stand.",
  },
  {
    title: "Ecosystem partner",
    text: "Community, investor or institutional presence — formats agreed individually.",
  },
] as const;

export default function PartnerGuidePage() {
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
            { label: "Arrive", value: "Fri 16:20–17:00", sub: "Since AI welcomes you", strong: true },
            { label: "Official opening", value: "Fri 17:00", sub: "EduCity · Taidon portaat" },
            { label: "Stand setup", value: "Fri 18:30", sub: "BioCity · arrangement confirmed with you", strong: true },
            { label: "Stands open", value: "All weekend", sub: "BioCity · until the event ends" },
            { label: "Submissions close", value: "Sun 10:00", sub: "Stands stay open" },
            { label: "Closing · finals", value: "Sun 13:15 · 14:00", sub: "EduCity" },
            { label: "Teardown", value: "Around 15:30", sub: "After the event · agreed window", strong: true },
          ]}
        />
        <NowNext items={schedule} audience={AUDIENCE} firstMoment={getScheduleItem(guide.firstMomentId)} />
      </GuideHero>

      <SectionNav
        items={[
          { id: "stands", label: "Stand plan" },
          { id: "steps", label: "Steps" },
          { id: "schedule", label: "Schedule" },
          { id: "prepare", label: "Prepare" },
          { id: "discord", label: "Discord" },
          { id: "venues", label: "Venues" },
          { id: "parking", label: "Parking" },
          { id: "accommodation", label: "Hotels" },
          { id: "details", label: "Details" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="stands">
        <SectionHeading
          id="stands-title"
          eyebrow="// biocity stand plan"
          title="Visibility & tech partner stands."
          lede="The visibility and tech partner stands — Solita, Pruna AI, BearingPoint, CSC / LUMI AI Factory and Major League Hacking, with one open position — are together in BioCity’s partner corner, at the far end of the build hall by the passage to Joki, on the way to the meals and to Joki. They stay open for the whole event."
        />
        <StandPlan />
        <div className="mt-10">
          <TwinTeaser place="biocity" view="stands" />
        </div>
      </GuideSection>

      <GuideSection id="steps">
        <SectionHeading id="steps-title" eyebrow="// your weekend" title="Open, set up, be seen, close." />
        <CriticalPath label="Partner steps" steps={CRITICAL_PATH.partners ?? []} />
        <ul className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PARTNER_TYPES.map((t) => (
            <li key={t.title} className="border border-white/10 p-5">
              <h3 className="text-lg font-bold tracking-tight text-white">{t.title}</h3>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{t.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-white/55">
          Your agreement defines your exact benefits — this guide covers the shared logistics.
        </p>
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
          title="Tell us what your stand needs."
          lede={
            <>
              One reply to{" "}
              <a className="text-white underline underline-offset-4" href="mailto:info@sinceai.fi">
                info@sinceai.fi
              </a>{" "}
              covers it.
            </>
          }
        />
        <Checklist storageKey="partners" groups={CHECKLISTS.partners} />
      </GuideSection>

      <DiscordSection audience={AUDIENCE} />

      <GuideSection id="venues">
        <SectionHeading
          id="venues-title"
          eyebrow="// where"
          title="BioCity all weekend. EduCity for the opening and Sunday’s finals."
        />
        <VenueCards venues={["biocity", "educity", "joki"]} />
        <div className="mt-10">
          <RouteLinks
            title="Getting to your stand, step by step in 3D"
            ids={["partners-tykistokatu-to-stands", "companies-train-to-biocity", "companies-parkcity-to-biocity"]}
          />
        </div>
        <div className="mt-8">
          <RouteCard />
        </div>
      </GuideSection>

      <GuideSection id="parking">
        <SectionHeading
          id="parking-title"
          eyebrow="// arriving by car"
          title="Parking & arriving by car."
        />
        <ParkingSummary
          lede="Park in ParkCity and walk about 360 m to BioCity's main entrance on Tykistökatu — or use P-Station Kupittaa, open 24/7, if you arrive or leave at night."
          extra={[CAR_ARRIVAL.unloading, CAR_ARRIVAL.dropOff]}
        />
      </GuideSection>

      <AccommodationSection />

      <GuideSection id="details">
        <SectionHeading id="details-title" eyebrow="// details" title="Good to know." />
        <Details items={DETAILS.partners} />
      </GuideSection>

      <GuideSection id="help">
        <SectionHeading id="help-title" eyebrow="// help" title="Questions?" />
        <HelpSection />
      </GuideSection>
    </>
  );
}
