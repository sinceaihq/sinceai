import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarButton,
  Checklist,
  CompanyLogo,
  Details,
  FactsStrip,
  GuideHero,
  GuideSection,
  HelpSection,
  NowNext,
  RouteLinks,
  Schedule,
  SectionHeading,
  SectionNav,
  ShareButton,
  StatusTag,
  VenueExplorer,
  ghostButtonClass,
} from "@/components/guide";
import { TwinTeaser } from "@/components/guide/twin/TwinTeaser";
import {
  briefingRoomLabel,
  CHECKLISTS,
  companyMapIds,
  companySchedule,
  DETAILS,
  getCompany,
  getGuide,
  getScheduleItem,
  GUIDE_BASE_PATH,
  keepDots,
  qaLocationLabel,
  qaStandSentence,
} from "@/lib/hackathon-2026";

const AUDIENCE = "challenge-partners" as const;
const guide = getGuide(AUDIENCE);

export default async function CompanyGuidePage({ params }: { params: Promise<{ company: string }> }) {
  const { company: id } = await params;
  const company = getCompany(id);
  if (!company) notFound();

  const maps = companyMapIds(company);
  const schedule = companySchedule(company);
  const room = briefingRoomLabel(company);
  const qa = qaLocationLabel(company);
  const showroom = company.qa.floor === 1;

  return (
    <>
      <GuideHero
        crumbs={[
          { label: "Field Guide", href: GUIDE_BASE_PATH },
          { label: guide.name, href: `${GUIDE_BASE_PATH}/${guide.slug}` },
          { label: company.name },
        ]}
        title={company.name}
        titleAddon={
          company.logo ? (
            <span className="guide-no-print mb-2 block h-10 w-32 md:h-12 md:w-40">
              <CompanyLogo name={company.name} logo={company.logo} sizes="160px" />
            </span>
          ) : undefined
        }
        lede={`Your rooms, times and maps for Since AI Hackathon 2026 — share this page with everyone representing ${company.name}.`}
      >
        <FactsStrip
          facts={[
            { label: "Arrive", value: "Fri 15:30", sub: "EduCity · briefing 15:40" },
            {
              label: "Your briefing room",
              value: room,
              sub: `EduCity · floor ${company.briefing.floor}`,
              strong: true,
            },
            { label: "Your briefing", value: "Fri 18:30–19:30", sub: "Teams arrive 18:00–18:25" },
            {
              label: "Your Q&A stand",
              value: showroom ? "Joki Showroom" : `Joki Floor ${company.qa.floor}`,
              sub: showroom ? "Floor 1 · Sat 09–12 · 14–18" : "Sat 09–12 · 14–18",
              strong: true,
            },
            { label: "Evaluate", value: "Sun 10:00–13:00", sub: "Briefing 08:15 · EduCity" },
            { label: "Winners · finals", value: "Sun 13:30 · 14:00", sub: "EduCity" },
          ]}
        />
        <p className="flex flex-wrap items-center gap-3 text-xs text-white/55">
          <StatusTag status={company.placementStatus} />
          Room and stand follow the 2 Oct 2026 venue maps; production does a final lock — this page updates if anything
          moves.
        </p>
        <div className="flex flex-wrap gap-3">
          <ShareButton title={`${company.name} · Since AI Hackathon 2026`} />
          <CalendarButton company={company} />
        </div>
        <NowNext items={schedule} audience={AUDIENCE} firstMoment={getScheduleItem(guide.firstMomentId)} />
      </GuideHero>

      <SectionNav
        items={[
          { id: "friday", label: "Friday room" },
          { id: "saturday", label: "Saturday stand" },
          { id: "schedule", label: "Schedule" },
          { id: "prepare", label: "Prepare" },
          { id: "details", label: "Details" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="friday">
        <SectionHeading
          id="friday-title"
          eyebrow="// friday · educity"
          title={`Briefing room ${room}.`}
          lede={`EduCity floor ${company.briefing.floor}. Teams are released from the opening in groups from 18:00 and guided to your room — stay put, they come to you. Brief from 18:30 to 19:30.`}
        />
        <VenueExplorer mapIds={[maps.briefing]} highlight={[company.id]} label={`${company.name} briefing room`} />
        <div className="mt-10">
          <RouteLinks
            title="Getting to EduCity, step by step in 3D"
            ids={["partners-fri-parkcity-edu", "partners-fri-train-edu", "partners-fri-stepfree-edu"]}
            company={company.id}
          />
        </div>
      </GuideSection>

      <GuideSection id="saturday">
        <SectionHeading
          id="saturday-title"
          eyebrow="// saturday · joki"
          title={keepDots(`Q&A stand: ${qa.replace("Joki · ", "")}.`)}
          lede={`${qaStandSentence(company)} ${
            showroom ? "The Company Lounge is right next to it." : "The Company Lounge is on floor 1, next to the Showroom."
          }`}
        />
        <VenueExplorer mapIds={[maps.qa]} highlight={[company.id]} label={`${company.name} Q&A stand`} />
        <div className="mt-10">
          <RouteLinks
            title="Getting to Joki, step by step in 3D"
            ids={["companies-tykistokatu-to-showroom", "companies-train-to-biocity", "companies-parkcity-to-biocity"]}
            company={company.id}
          />
        </div>
        <div className="mt-10">
          <TwinTeaser focus={company.id} />
        </div>
      </GuideSection>

      <GuideSection id="schedule">
        <SectionHeading
          id="schedule-title"
          eyebrow="// schedule"
          title="Your timeline."
          lede="Local Turku time (EET, UTC+2). Meals are optional — food is reserved for company representatives."
        />
        <div className="mb-8 flex flex-wrap gap-3">
          <CalendarButton company={company} />
        </div>
        <Schedule items={schedule} audience={AUDIENCE} />
      </GuideSection>

      <GuideSection id="prepare">
        <SectionHeading id="prepare-title" eyebrow="// prepare" title="Before the event." />
        <Checklist storageKey={`challenge-partners:${company.id}`} groups={CHECKLISTS["challenge-partners"]} />
      </GuideSection>

      <GuideSection id="details">
        <SectionHeading id="details-title" eyebrow="// details" title="Good to know." />
        <Details items={DETAILS["challenge-partners"]} />
        <div className="guide-no-print mt-10">
          <Link href={`${GUIDE_BASE_PATH}/${guide.slug}`} className={ghostButtonClass}>
            Full Challenge Partner Guide
            <span aria-hidden="true" className="ml-2">
              →
            </span>
          </Link>
        </div>
      </GuideSection>

      <GuideSection id="help">
        <SectionHeading id="help-title" eyebrow="// help" title="Questions?" />
        <HelpSection onSiteNote="Event staff guide challenge partners at EduCity on Friday. All weekend, any Since AI volunteer or staff member can reach the company team." />
      </GuideSection>
    </>
  );
}
