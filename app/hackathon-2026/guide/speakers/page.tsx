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
  TextLink,
  VenueCards,
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

const AUDIENCE = "speakers" as const;
const guide = getGuide(AUDIENCE);
const schedule = scheduleFor(AUDIENCE);

const RUN_SHEET = [
  "Talk title, duration and language",
  "Arrival place and time at EduCity",
  "Your named host and how to reach them",
  "AV, sound and slide check",
  "Backstage / ready time",
  "Stage start and end, and the exact room or stage",
  "Slide deadline, format and how to send it",
  "Laptop, adapters, microphone, clicker, video and audio needs",
  "Travel and hotel — only when confirmed for you",
  "Meals, dietary and accessibility needs",
  "Recording and photo permissions",
] as const;

const AV_PRINCIPLES = [
  {
    title: "Send early, bring a backup",
    text: "Send slides by the agreed deadline and carry an offline copy on your laptop or a USB stick.",
  },
  {
    title: "Test before the doors open",
    text: "Your AV check time is in your run sheet — plan to arrive before it, not at it.",
  },
  {
    title: "No internet dependency",
    text: "Live demos should have an offline fallback in case of network load during the opening.",
  },
] as const;

export default function SpeakerGuidePage() {
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
            { label: "Venue", value: "EduCity", sub: "Joukahaisenkatu 7, Turku" },
            { label: "Opening programme", value: "Fri 17:00", sub: "Opening + keynote", strong: true },
            { label: "Your times", value: "Run sheet", sub: "Confirmed by your host" },
            { label: "Company winners", value: "Sun 13:30", sub: "Announced at EduCity" },
            { label: "Finals", value: "Sun 14:00", sub: "Five finalists" },
            { label: "Event ends", value: "Sun ~15:00", sub: "EduCity" },
          ]}
        />
        <NowNext items={schedule} audience={AUDIENCE} firstMoment={getScheduleItem(guide.firstMomentId)} />
      </GuideHero>

      <SectionNav
        items={[
          { id: "run-sheet", label: "Run sheet" },
          { id: "programme", label: "Programme" },
          { id: "stage", label: "Stage & AV" },
          { id: "travel", label: "Travel" },
          { id: "bring", label: "Checklist" },
          { id: "venue", label: "Venue" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="run-sheet">
        <SectionHeading
          id="run-sheet-title"
          eyebrow="// your personal run sheet"
          title="Your exact times come from your host."
          lede="This page is shared by link, so it carries the general plan only. Your personal run sheet — sent to you directly — covers:"
        />
        <ul className="grid grid-cols-1 border-l border-t border-white/10 sm:grid-cols-2">
          {RUN_SHEET.map((item) => (
            <li key={item} className="border-b border-r border-white/10 p-4 text-sm text-neutral-300">
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <CriticalPath label="Speaker steps" steps={CRITICAL_PATH.speakers ?? []} />
        </div>
      </GuideSection>

      <GuideSection id="programme">
        <SectionHeading
          id="programme-title"
          eyebrow="// programme"
          title="The shared moments."
          lede="Local Turku time (EET, UTC+2). If your run sheet differs, your run sheet wins."
        />
        <div className="mb-8 flex flex-wrap gap-3">
          <CalendarButton audience={AUDIENCE} />
        </div>
        <Schedule items={schedule} audience={AUDIENCE} />
      </GuideSection>

      <GuideSection id="stage">
        <SectionHeading id="stage-title" eyebrow="// stage & av" title="Calm on stage." />
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {AV_PRINCIPLES.map((p) => (
            <li key={p.title} className="guide-avoid-break border border-white/10 p-5">
              <h3 className="text-lg font-bold tracking-tight text-white">{p.title}</h3>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">{p.text}</p>
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="travel">
        <SectionHeading
          id="travel-title"
          eyebrow="// getting here"
          title="Turku in November."
          lede="Your booked itinerary is the source of truth. If you can, arrive in Turku the day before your call time."
        />
        <Details items={DETAILS.speakers} />
        <div className="guide-no-print mt-4 flex flex-wrap gap-x-6">
          <TextLink href="https://www.vr.fi/en">VR trains</TextLink>
          <TextLink href="https://www.foli.fi/en">Föli local transport</TextLink>
          <TextLink href="https://www.finavia.fi/en/airports/turku">Turku Airport</TextLink>
        </div>
      </GuideSection>

      <GuideSection id="bring">
        <SectionHeading id="bring-title" eyebrow="// checklist" title="Before you travel." />
        <Checklist storageKey="speakers" groups={CHECKLISTS.speakers} />
      </GuideSection>

      <GuideSection id="venue">
        <SectionHeading
          id="venue-title"
          eyebrow="// where"
          title="EduCity — and the build spaces nearby."
          lede="Stage moments are at EduCity. If you mentor or visit the build, BioCity and Joki are a 3-minute walk away."
        />
        <VenueCards venues={["educity", "biocity", "joki"]} />
        <div className="mt-8">
          <RouteCard />
        </div>
      </GuideSection>

      <GuideSection id="help">
        <SectionHeading id="help-title" eyebrow="// help" title="Questions?" />
        <HelpSection onSiteNote="Your host is your first contact on site. Any Since AI volunteer or staff member can also reach the programme team." />
      </GuideSection>
    </>
  );
}
