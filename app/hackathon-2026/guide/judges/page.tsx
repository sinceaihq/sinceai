import {
  Checklist,
  CriticalPath,
  Details,
  FactsStrip,
  GuideHero,
  GuideSection,
  HelpSection,
  NowNext,
  Schedule,
  SectionHeading,
  SectionNav,
  VenueCards,
  VenueExplorer,
} from "@/components/guide";
import {
  CHECKLISTS,
  CRITICAL_PATH,
  DETAILS,
  getGuide,
  getScheduleItem,
  GUIDE_BASE_PATH,
  scheduleFor,
} from "@/lib/hackathon-2026";

const AUDIENCE = "judges" as const;
const guide = getGuide(AUDIENCE);
const schedule = scheduleFor(AUDIENCE);

const ROLES = [
  {
    eyebrow: "Role A",
    title: "Overall hackathon jury",
    points: [
      "Builders vote 10:00–12:00; the five most-voted solutions become the finalists.",
      "The finalists present during the 13:00 closing ceremony at EduCity.",
      "The jury selects the overall winner of Since AI Hackathon 2026.",
      "Be ready before 13:00 — your call time comes in your personal briefing.",
    ],
  },
  {
    eyebrow: "Role B",
    title: "Company challenge evaluator",
    points: [
      "Reviews the submissions to one company's challenge.",
      "Evaluation briefing at EduCity from 08:15; reviewing starts when submissions close at 10:00.",
      "Uses the company's agreed criteria and decides that challenge's result.",
      "Hands results over in time for the company challenge awards (~14:00).",
    ],
  },
] as const;

const PERSONAL = [
  "Your role (overall jury, company evaluator — or both) and your organisation",
  "Arrival and check-in time, meeting point and host",
  "The projects or challenge assigned to you",
  "Project access and login instructions",
  "Approved criteria, weighting and scoring method",
  "How and when you hand over results",
  "Conflict-of-interest guidance",
  "Food, accessibility and — if arranged — travel and hotel",
] as const;

export default function JudgeGuidePage() {
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
            { label: "Submissions close", value: "Sun 10:00", sub: "Hard deadline", strong: true },
            { label: "Company evaluation", value: "From 10:00", sub: "Briefing 08:15 · EduCity" },
            { label: "Builder voting", value: "10:00–12:00", sub: "Top five become finalists" },
            { label: "Closing + finalists", value: "Sun 13:00", sub: "EduCity · jury decides", strong: true },
            { label: "Company awards", value: "~14:00", sub: "EduCity" },
            { label: "Event ends", value: "Sun 15:00", sub: "EduCity" },
          ]}
        />
        <NowNext items={schedule} audience={AUDIENCE} firstMoment={getScheduleItem(guide.firstMomentId)} />
      </GuideHero>

      <SectionNav
        items={[
          { id: "roles", label: "Two roles" },
          { id: "sunday", label: "Sunday" },
          { id: "prepare", label: "Prepare" },
          { id: "personal", label: "Your briefing" },
          { id: "venue", label: "Venue" },
          { id: "details", label: "Details" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="roles">
        <SectionHeading
          id="roles-title"
          eyebrow="// two roles"
          title="Jury and evaluator are different jobs."
          lede="One person can hold both roles — the responsibilities stay separate."
        />
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {ROLES.map((role) => (
            <li key={role.title} className="guide-avoid-break border border-white/10 p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-(--color-event)">{role.eyebrow}</p>
              <h3 className="mt-3 text-2xl font-bold tracking-tight text-white">{role.title}</h3>
              <ul className="mt-4 space-y-2">
                {role.points.map((p) => (
                  <li key={p} className="flex gap-2 text-sm text-neutral-400 leading-relaxed">
                    <span aria-hidden="true" className="text-white/55">
                      —
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="sunday">
        <SectionHeading
          id="sunday-title"
          eyebrow="// sunday 8 november"
          title="Deadline to winner."
          lede="Local Turku time (EET, UTC+2)."
        />
        <div className="mb-12">
          <CriticalPath label="Judging steps" steps={CRITICAL_PATH.judges ?? []} />
        </div>
        <Schedule items={schedule} audience={AUDIENCE} />
      </GuideSection>

      <GuideSection id="prepare">
        <SectionHeading id="prepare-title" eyebrow="// prepare" title="Before and on Sunday." />
        <Checklist storageKey="judges" groups={CHECKLISTS.judges} />
      </GuideSection>

      <GuideSection id="personal">
        <SectionHeading
          id="personal-title"
          eyebrow="// your personal briefing"
          title="Personal details never live on this page."
          lede="This guide is shared by link, so everything personal comes to you directly from Since AI. Your briefing covers:"
        />
        <ul className="grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2">
          {PERSONAL.map((item) => (
            <li key={item} className="border-b border-r border-white/10 p-4 text-sm text-neutral-300">
              {item}
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="venue">
        <SectionHeading
          id="venue-title"
          eyebrow="// where"
          title="EduCity on Sunday."
          lede="The closing ceremony and the five finalist presentations are at EduCity."
        />
        <VenueCards venues={["educity"]} />
        <div className="mt-8">
          <VenueExplorer mapIds={["educity-1", "educity-2"]} label="EduCity maps" />
        </div>
      </GuideSection>

      <GuideSection id="details">
        <SectionHeading id="details-title" eyebrow="// details" title="Good to know." />
        <Details items={DETAILS.judges} />
      </GuideSection>

      <GuideSection id="help">
        <SectionHeading id="help-title" eyebrow="// help" title="Questions?" />
        <HelpSection />
      </GuideSection>
    </>
  );
}
