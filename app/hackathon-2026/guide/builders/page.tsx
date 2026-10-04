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
  VenueCards,
  VenueExplorer,
  ghostButtonClass,
  primaryButtonClass,
} from "@/components/guide";
import { Venue3DTeaser } from "@/components/guide/venue3d/Venue3DTeaser";
import {
  CHECKLISTS,
  CRITICAL_PATH,
  DETAILS,
  getGuide,
  getScheduleItem,
  GUIDE_BASE_PATH,
  GUIDE_LINKS,
  scheduleFor,
} from "@/lib/hackathon-2026";

const AUDIENCE = "builders" as const;
const guide = getGuide(AUDIENCE);
const schedule = scheduleFor(AUDIENCE);

const APP_STEPS = [
  {
    title: "Your team",
    who: "Everyone",
    when: "Before Fri 16:45",
    text: "Create or join your team. Every member must appear in the same team — that is what counts at the 16:50 lock.",
  },
  {
    title: "Challenge selection",
    who: "Team owner",
    when: "Fri 17:00–17:30",
    text: "Pick one available challenge for the whole team. First come, first served, with limited places per challenge.",
  },
  {
    title: "Where to go",
    who: "Everyone",
    when: "From Fri 17:30",
    text: "Your team view shows your challenge, departure time, room, floor and map for the briefing.",
  },
  {
    title: "Submission",
    who: "Team owner",
    when: "Before Sun 10:00",
    text: "Submit the final solution. The deadline is fixed — submit early, not at 09:59.",
  },
  {
    title: "Voting",
    who: "Everyone",
    when: "Sun 10:00–12:00",
    text: "Vote for your favourite. The five most-voted solutions present at the closing ceremony.",
  },
] as const;

export default function BuilderGuidePage() {
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
            { label: "Registration", value: "Fri 15:00", sub: "EduCity", strong: true },
            { label: "Official opening", value: "Fri 17:00", sub: "EduCity · Taidon portaat" },
            { label: "Build spaces", value: "BioCity + Joki", sub: "From Fri 19:30, around the clock" },
            { label: "Submission deadline", value: "Sun 10:00", sub: "Team owner, in sinceai.app", strong: true },
            { label: "Closing ceremony", value: "Sun 13:00", sub: "EduCity" },
            { label: "Event ends", value: "Sun 15:00", sub: "Awards ~14:00" },
          ]}
        />
        <NowNext items={schedule} audience={AUDIENCE} firstMoment={getScheduleItem(guide.firstMomentId)} />
      </GuideHero>

      <SectionNav
        items={[
          { id: "steps", label: "Steps" },
          { id: "schedule", label: "Schedule" },
          { id: "app", label: "sinceai.app" },
          { id: "venues", label: "Venues" },
          { id: "bring", label: "Checklist" },
          { id: "maps", label: "Maps" },
          { id: "details", label: "Details" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="steps">
        <SectionHeading
          id="steps-title"
          eyebrow="// your weekend in six moves"
          title="Six moves, check-in to submission."
        />
        <CriticalPath label="Builder steps" steps={CRITICAL_PATH.builders ?? []} />
      </GuideSection>

      <GuideSection id="schedule">
        <SectionHeading
          id="schedule-title"
          eyebrow="// schedule"
          title="Friday to Sunday."
          lede="Local Turku time (EET, UTC+2). Times marked “end TBC” have a confirmed start only."
        />
        <div className="mb-8 flex flex-wrap gap-3">
          <CalendarButton audience={AUDIENCE} />
        </div>
        <Schedule items={schedule} audience={AUDIENCE} />
      </GuideSection>

      <GuideSection id="app">
        <SectionHeading
          id="app-title"
          eyebrow="// sinceai.app"
          title="The app runs your weekend."
          lede="Your team, your challenge, your room and your submission all live in sinceai.app. Only the team owner selects the challenge and submits."
        />
        <ol className="grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-5">
          {APP_STEPS.map((step) => (
            <li key={step.title} className="guide-avoid-break border-b border-r border-white/10 p-5">
              <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-event)">{step.when}</p>
              <h3 className="mt-3 text-lg font-bold tracking-tight text-white">{step.title}</h3>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-white/55">{step.who}</p>
              <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
        <div className="guide-no-print mt-8 flex flex-col gap-3 sm:flex-row">
          <a href={GUIDE_LINKS.appTeams} target="_blank" rel="noopener noreferrer" className={primaryButtonClass}>
            Open your team in sinceai.app{" "}
            <span aria-hidden="true" className="ml-2">
              ↗
            </span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a href={GUIDE_LINKS.discord} target="_blank" rel="noopener noreferrer" className={ghostButtonClass}>
            Join the Discord{" "}
            <span aria-hidden="true" className="ml-2">
              ↗
            </span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </GuideSection>

      <GuideSection id="venues">
        <SectionHeading
          id="venues-title"
          eyebrow="// where"
          title="Start at EduCity. Build at BioCity and Joki."
          lede="After the 18:30 briefing, move with your team to BioCity or Joki and pick a workspace. Both stay open around the clock. Sunday's closing is back at EduCity."
        />
        <VenueCards venues={["educity", "biocity", "joki"]} />
        <div className="mt-8">
          <RouteCard />
        </div>
      </GuideSection>

      <GuideSection id="bring">
        <SectionHeading id="bring-title" eyebrow="// checklist" title="Bring and do." />
        <Checklist storageKey="builders" groups={CHECKLISTS.builders} />
      </GuideSection>

      <GuideSection id="maps">
        <SectionHeading
          id="maps-title"
          eyebrow="// maps"
          title="Find your way."
          lede="Friday arrival and briefing rooms at EduCity, then the build spaces. Tap a map to zoom."
        />
        <VenueExplorer
          mapIds={[
            "educity-flow-1",
            "educity-flow-2",
            "educity-1",
            "educity-2",
            "biocity-lobby",
            "joki-1",
            "joki-showroom",
            "joki-2-3",
          ]}
          label="Builder maps"
        />
        <div className="mt-10">
          <Venue3DTeaser />
        </div>
      </GuideSection>

      <GuideSection id="details">
        <SectionHeading id="details-title" eyebrow="// details & edge cases" title="Good to know." />
        <Details items={DETAILS.builders} />
      </GuideSection>

      <GuideSection id="help">
        <SectionHeading id="help-title" eyebrow="// help" title="Stuck? Ask." />
        <HelpSection />
      </GuideSection>
    </>
  );
}
