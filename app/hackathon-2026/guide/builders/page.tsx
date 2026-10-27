import Link from "next/link";
import {
  AccommodationSection,
  BriefingRoomTable,
  BuildingSection,
  ChallengeRules,
  CalendarButton,
  Checklist,
  ComputingCallout,
  ComputingNote,
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
  TeamFormationRoutes,
  VenueCards,
  VenueExplorer,
  WifiSection,
  ghostButtonClass,
  primaryButtonClass,
  ParkingNote,
} from "@/components/guide";
import { TwinTeaser } from "@/components/guide/twin/TwinTeaser";
import {
  AWARDS_HREF,
  BRIEFING_ROOMS_ANCHOR,
  CHECKLISTS,
  CRITICAL_PATH,
  DETAILS,
  getGuide,
  getScheduleItem,
  GUIDE_BASE_PATH,
  GUIDE_LINKS,
  scheduleFor,
  VOTE_COMPARISONS,
  VOTING,
} from "@/lib/hackathon-2026";

const AUDIENCE = "builders" as const;
const guide = getGuide(AUDIENCE);
const schedule = scheduleFor(AUDIENCE);

const APP_STEPS = [
  {
    title: "Read the summaries",
    who: "Everyone",
    when: "From Thu 5 Nov 15:00",
    text: "Public-safe summaries of all 15 company challenges. Choose from these only — agree on at least three with your team.",
  },
  {
    title: "Your team",
    who: "Everyone",
    when: "Before the event · by Fri 16:45",
    text: "Create or join your team — up to five members. Every member must appear in the same team: that is what you show at Team Check. Team formation closes at 16:45.",
  },
  {
    title: "Ready, then select",
    who: "Your team lead",
    when: "Fri 15:00–17:30",
    text: "The lead confirms Mark team as ready — the roster is then fixed — and selects one company challenge for the whole team. Final; places are limited.",
  },
  {
    title: "Where to go",
    who: "Everyone",
    when: "From Fri 17:30",
    text: "The app shows your team's route: challenge, departure time, room and floor. The full challenge opens in the app at 19:30, for your team only.",
  },
  {
    title: "Submission",
    who: "Any team member",
    when: "Before Sun 10:00",
    text: "Submit your team's final solution and tick any MLH award categories. A confidential challenge also needs a public-safe summary. The deadline is fixed — submit early, not at 09:59.",
  },
  {
    title: "Voting",
    who: "Everyone",
    when: "Sun 10:00–12:00",
    text: `Two solutions at a time — pick the stronger one. Complete all ${VOTE_COMPARISONS} comparisons. ${VOTING.finalistsShort}`,
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
            { label: "Challenge summaries", value: "Thu 15:00", sub: "In sinceai.app · choose from these" },
            { label: "Registration", value: "Fri 15:00", sub: "EduCity · every member in person", strong: true },
            { label: "Ready · select", value: "Fri 15:00–17:30", sub: "Team lead · final · places limited", strong: true },
            { label: "Build spaces", value: "BioCity + Joki", sub: "From Fri 19:30, around the clock" },
            { label: "Submission deadline", value: "Sun 10:00", sub: "In sinceai.app · fixed", strong: true },
            { label: "Finals", value: "Sun 14:00", sub: "Five teams, five challenges · ends around 15:30" },
          ]}
        />
        <ComputingCallout />
        <NowNext items={schedule} audience={AUDIENCE} firstMoment={getScheduleItem(guide.firstMomentId)} />
      </GuideHero>

      <SectionNav
        items={[
          { id: "steps", label: "Steps" },
          { id: "rules", label: "Challenge rules" },
          { id: "team-formation", label: "Team formation" },
          { id: BRIEFING_ROOMS_ANCHOR, label: "Briefing rooms" },
          { id: "schedule", label: "Schedule" },
          { id: "app", label: "sinceai.app" },
          { id: "building", label: "Build & submit" },
          { id: "venues", label: "Venues" },
          { id: "wifi", label: "Wi-Fi" },
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
          eyebrow="// your weekend in eight moves"
          title="Eight moves, check-in to the vote."
        />
        <CriticalPath label="Builder steps" steps={CRITICAL_PATH.builders ?? []} />
      </GuideSection>

      <GuideSection id="rules">
        <SectionHeading
          id="rules-title"
          eyebrow="// company challenge · team · friday"
          title="One company challenge per team. Ready, select — final."
          lede="The rules for choosing your challenge, in one place. The app enforces the same times; your guide and sinceai.app say the same thing."
        />
        <ChallengeRules />
      </GuideSection>

      <GuideSection id="team-formation">
        <SectionHeading
          id="team-formation-title"
          eyebrow="// friday · team formation · educity floor 1"
          title="Route A: you have a team. Route B: find one."
          lede="Straight after registration, from 15:00, beside Taidon portaat. Team formation closes at 16:45. Everyone leaves through Team Check on the left."
        />
        <TeamFormationRoutes />
        <p className="mt-6 max-w-3xl text-sm text-neutral-300 leading-relaxed">
          <span className="font-semibold text-white">At Team Check</span> you show on your phone that you belong to your
          team in sinceai.app. It is not the same as your team lead marking the team as ready — the lead does that in the
          app, and only then can the team select its challenge.
        </p>
        <div className="mt-8">
          <VenueExplorer mapIds={["educity-team-formation"]} label="Team formation" />
        </div>
        <p className="mt-4 max-w-3xl text-xs text-white/55 leading-relaxed">
          This plan shows the team formation flow only — it is not the building&rsquo;s emergency exit plan. In an
          emergency, follow the exit signs and staff instructions.
        </p>
      </GuideSection>

      <GuideSection id={BRIEFING_ROOMS_ANCHOR}>
        <SectionHeading
          id={`${BRIEFING_ROOMS_ANCHOR}-title`}
          eyebrow="// friday · briefing rooms · educity floors 1–3"
          title="Your company's briefing room."
          lede="Your route in sinceai.app names your room from 17:30. Stay for the opening and Jason Mayes' programme; from 18:30 the teams leave in turn, at the departure time in their route, with volunteers showing the way. Briefings run 18:50–19:30."
        />
        <div className="max-w-3xl">
          <BriefingRoomTable />
          <p className="mt-4 text-sm text-neutral-400 leading-relaxed">
            Floors 2 and 3: take the stairs up from Taidon portaat or the lifts on either side of the lobby. Floor 3
            rooms are on the east side. After your briefing, a volunteer walks your team to BioCity.
          </p>
        </div>
        <div className="mt-10">
          <VenueExplorer mapIds={["educity-1", "educity-2", "educity-3"]} syncHash label="Briefing room maps" />
        </div>
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
          lede="Your team, your challenge and your submission all live in sinceai.app. Your team lead marks the team as ready and selects its challenge on Friday 15:00–17:30; any team member can submit."
        />
        <ol className="grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">
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
          <Link href={AWARDS_HREF} className={ghostButtonClass}>
            Optional awards: MLH, Red Hat, FIWARE{" "}
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
        </div>
      </GuideSection>

      <BuildingSection />

      <GuideSection id="venues">
        <SectionHeading
          id="venues-title"
          eyebrow="// where"
          title="Start at EduCity. Build at BioCity and Joki."
          lede="After the briefing (18:50–19:30), move with your team to BioCity or Joki, eat when it suits you and pick a workspace. Both stay open around the clock. Sunday's closing is back at EduCity."
        />
        <VenueCards venues={["educity", "biocity", "joki"]} />
        <ParkingNote className="mt-6" />
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

      <WifiSection />

      <AccommodationSection />

      <GuideSection id="bring">
        <SectionHeading id="bring-title" eyebrow="// checklist" title="Bring and do." />
        <Checklist storageKey="builders" groups={CHECKLISTS.builders} />
        <ComputingNote className="mt-6 max-w-3xl" />
      </GuideSection>

      <GuideSection id="maps">
        <SectionHeading
          id="maps-title"
          eyebrow="// maps"
          title="Find your way."
          lede="Friday team formation and briefing rooms at EduCity, then the build spaces. Tap a map to zoom."
        />
        <VenueExplorer
          mapIds={[
            "educity-team-formation",
            "educity-1",
            "educity-2",
            "educity-3",
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
