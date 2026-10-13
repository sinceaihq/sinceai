import {
  AccommodationSection,
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
  RouteLinks,
  Schedule,
  SectionHeading,
  SectionNav,
  VenueCards,
  VenueExplorer,
  ghostButtonClass,
  primaryButtonClass,
} from "@/components/guide";
import { TwinTeaser } from "@/components/guide/twin/TwinTeaser";
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
    when: "Fri from 15:00",
    text: "Create or join your team — up to five members. Every member must appear in the same team: that list is what the volunteer checks at Team check.",
  },
  {
    title: "Challenge selection",
    who: "Team owner",
    when: "Before Fri 17:00",
    text: "Select one challenge for the whole team. Places per challenge are limited; event staff and the app announce when selection opens.",
  },
  {
    title: "Where to go",
    who: "Everyone",
    when: "From Fri 17:50",
    text: "Go to your challenge company's briefing room when volunteers call it. Its page in this guide shows the room, floor and map.",
  },
  {
    title: "Submission",
    who: "Any team member",
    when: "Before Sun 10:00",
    text: "Submit your team's final solution. The deadline is fixed — submit early, not at 09:59.",
  },
  {
    title: "Voting",
    who: "Everyone",
    when: "Sun 10:00–12:00",
    text: "Give your 10 votes to 10 different solutions. The teams behind the five most-voted present live in the finals at 14:00.",
  },
] as const;

/** The organiser's team formation plan (EduCity floor 1, beside Taidon portaat), as text. */
const TEAM_FORMATION_STEPS = [
  {
    title: "Choose your zone",
    text: "Go to the zone that matches the number of open places in your team: 4, 3, 2 or 1 open places. The zones run through the lobby and room 1091 next to it.",
  },
  {
    title: "Build your team",
    text: "Meet builders and fill the open places. A team has at most five members.",
  },
  {
    title: "Join in the app",
    text: "Create your team in sinceai.app. Every member must join and appear in the team member list.",
  },
  {
    title: "Leave via the other side",
    text: "You came in from registration on the right; leave on the opposite side. At Team check, show the full team member list in the app to the volunteer — every member is checked before the team continues to the opening ceremony.",
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
            { label: "Build spaces", value: "BioCity + Joki", sub: "From Fri 18:45, around the clock" },
            { label: "Submission deadline", value: "Sun 10:00", sub: "In sinceai.app · fixed", strong: true },
            { label: "Company winners", value: "Sun 13:30", sub: "EduCity" },
            { label: "Finals", value: "Sun 14:00", sub: "Five teams live on stage · ends ~15:00" },
          ]}
        />
        <NowNext items={schedule} audience={AUDIENCE} firstMoment={getScheduleItem(guide.firstMomentId)} />
      </GuideHero>

      <SectionNav
        items={[
          { id: "steps", label: "Steps" },
          { id: "team-formation", label: "Team formation" },
          { id: "schedule", label: "Schedule" },
          { id: "app", label: "sinceai.app" },
          { id: "venues", label: "Venues" },
          { id: "accommodation", label: "Hotels" },
          { id: "bring", label: "Checklist" },
          { id: "maps", label: "Maps" },
          { id: "details", label: "Details" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="steps">
        <SectionHeading
          id="steps-title"
          eyebrow="// your weekend in seven moves"
          title="Seven moves, check-in to submission."
        />
        <CriticalPath label="Builder steps" steps={CRITICAL_PATH.builders ?? []} />
      </GuideSection>

      <GuideSection id="team-formation">
        <SectionHeading
          id="team-formation-title"
          eyebrow="// friday · team formation"
          title="Find a team. Join in the app. Show your team at the exit."
          lede="EduCity floor 1, beside Taidon portaat — from 15:00, straight after registration. Team formation and challenge selection are both done before the 17:00 opening ceremony."
        />
        <ol className="grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM_FORMATION_STEPS.map((step, i) => (
            <li key={step.title} className="guide-avoid-break border-b border-r border-white/10 p-5">
              <p className="font-mono text-[11px] uppercase tracking-widest text-(--color-event)">Step {i + 1}</p>
              <h3 className="mt-3 text-lg font-bold tracking-tight text-white">{step.title}</h3>
              <p className="mt-3 text-sm text-neutral-400 leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 max-w-3xl text-sm text-neutral-300 leading-relaxed">
          <span className="font-semibold text-white">Already have a team?</span> You pass Team check too — every member
          must be in the team in sinceai.app.
        </p>
        <div className="mt-8">
          <VenueExplorer mapIds={["educity-team-formation"]} label="Team formation area" />
        </div>
        <p className="mt-4 max-w-3xl text-xs text-white/55 leading-relaxed">
          This plan shows the team formation flow only — it is not the building&rsquo;s emergency exit plan. In an
          emergency, follow the exit signs and staff instructions.
        </p>
      </GuideSection>

      <GuideSection id="schedule">
        <SectionHeading
          id="schedule-title"
          eyebrow="// schedule"
          title="Friday to Sunday."
          lede="Local Turku time (EET, UTC+2)."
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
          lede="Your team, your challenge and your submission all live in sinceai.app. The team owner selects the challenge; any team member can submit."
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
          lede="After the briefing (18:15–18:45), move with your team to BioCity or Joki, eat when it suits you and pick a workspace. Both stay open around the clock. Sunday's closing is back at EduCity."
        />
        <VenueCards venues={["educity", "biocity", "joki"]} />
        <div className="mt-8">
          <RouteCard />
        </div>
        <div className="mt-10">
          <RouteLinks
            title="Your routes, step by step in 3D"
            ids={[
              "builders-train-checkin",
              "builders-station-hall-checkin",
              "builders-transfer-to-build",
              "builders-build-to-joki",
              "builders-back-to-educity",
            ]}
          />
        </div>
      </GuideSection>

      <AccommodationSection />

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
            "educity-team-formation",
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
          <TwinTeaser />
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
