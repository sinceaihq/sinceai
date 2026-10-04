import {
  CalendarButton,
  Checklist,
  CriticalPath,
  Details,
  FactsStrip,
  GuideHero,
  GuideSection,
  HelpSection,
  NowNext,
  RouteCard,
  Schedule,
  SectionHeading,
  SectionNav,
  StandPlan,
  VenueCards,
} from "@/components/guide";
import { Venue3DTeaser } from "@/components/guide/venue3d/Venue3DTeaser";
import {
  CHECKLISTS,
  CRITICAL_PATH,
  DETAILS,
  getGuide,
  getScheduleItem,
  GUIDE_BASE_PATH,
  scheduleFor,
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
            { label: "Official opening", value: "Fri 17:00", sub: "EduCity · Taidon portaat" },
            { label: "Stand setup", value: "Fri 18:00", sub: "BioCity · window confirmed with you", strong: true },
            { label: "Stands open", value: "All weekend", sub: "BioCity" },
            { label: "Submissions close", value: "Sun 10:00", sub: "Stands stay open" },
            { label: "Closing ceremony", value: "Sun 13:00", sub: "EduCity · awards ~14:00" },
            { label: "Teardown", value: "After 15:00", sub: "Agreed post-event window", strong: true },
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
          { id: "venues", label: "Venues" },
          { id: "details", label: "Details" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="stands">
        <SectionHeading
          id="stands-title"
          eyebrow="// biocity stand plan"
          title="Visibility & tech partner stands."
          lede="Stands are in BioCity and stay open for the whole event — where every builder passes on the way in, to meals and to Joki."
        />
        <StandPlan />
        <div className="mt-10">
          <Venue3DTeaser focus="biocity" />
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

      <GuideSection id="venues">
        <SectionHeading
          id="venues-title"
          eyebrow="// where"
          title="BioCity all weekend. EduCity for the opening and closing."
        />
        <VenueCards venues={["biocity", "educity", "joki"]} />
        <div className="mt-8">
          <RouteCard />
        </div>
      </GuideSection>

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
