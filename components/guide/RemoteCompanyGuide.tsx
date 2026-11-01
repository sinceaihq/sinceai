import Link from "next/link";
import {
  briefingRoomLabel,
  companySchedule,
  DISCORD_GUIDE_PATH,
  DISCORD_INVITE,
  getGuide,
  GUIDE_BASE_PATH,
  REMOTE_PARTNER_CHECKLIST,
  remoteSupportStatement,
} from "@/lib/hackathon-2026";
import type { ChallengeCompany } from "@/lib/hackathon-2026/types";
import { CalendarButton } from "./CalendarButton";
import { Checklist } from "./Checklist";
import { CompanyLogo } from "./CompanyLogo";
import { FactsStrip } from "./FactsStrip";
import { GuideHero } from "./GuideHero";
import { HelpSection } from "./HelpSection";
import { VenueExplorer } from "./maps/VenueExplorer";
import { NowNext } from "./NowNext";
import { ghostButtonClass, GuideSection, SectionHeading, StatusTag, TextLink } from "./primitives";
import { Schedule } from "./Schedule";
import { SectionNav } from "./SectionNav";
import { ShareButton } from "./ShareButton";
import { TwinTeaser } from "./twin/TwinTeaser";

const AUDIENCE = "challenge-partners" as const;
const guide = getGuide(AUDIENCE);

function Points({ title, items }: { title: string; items: readonly string[] }) {
  return (
    <div className="border-t border-white/10 pt-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-relaxed text-neutral-300">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The company page of a partner with nobody on site: no arrival, stand or
 * meals, only what it and the teams that choose it actually need.
 */
export function RemoteCompanyGuide({ company }: { company: ChallengeCompany }) {
  const schedule = companySchedule(company);
  const room = briefingRoomLabel(company);
  const support = remoteSupportStatement(company);
  const name = company.name;

  return (
    <>
      <GuideHero
        crumbs={[
          { label: "Field Guide", href: GUIDE_BASE_PATH },
          { label: guide.name, href: `${GUIDE_BASE_PATH}/${guide.slug}` },
          { label: name },
        ]}
        title={name}
        titleAddon={
          company.logo ? (
            <span className="guide-no-print mb-2 block h-10 w-32 md:h-12 md:w-40">
              <CompanyLogo name={name} logo={company.logo} sizes="160px" />
            </span>
          ) : undefined
        }
        lede={`${name} takes part in Since AI Hackathon 2026 remotely: no travel and no stand. Share this page with everyone representing ${name}. It has the room, the times and the support route, and it tells teams where to find you.`}
      >
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-300">{company.remote?.about}</p>
        <p className="flex flex-wrap items-center gap-3 text-sm text-neutral-300">
          {company.url && <TextLink href={company.url}>{company.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</TextLink>}
          {company.remote && <TextLink href={company.remote.coordinator.url}>{`Coordinator: ${company.remote.coordinator.name}`}</TextLink>}
        </p>
        <FactsStrip
          facts={[
            { label: "Taking part", value: "Remotely", sub: "No travel · no stand", strong: true },
            {
              label: "Briefing room",
              value: room,
              sub: `EduCity · floor ${company.briefing.floor} · Since AI host on site`,
              strong: true,
            },
            { label: "Briefing", value: "Fri 18:50–19:30", sub: "Your experts join by video" },
            { label: "Technical support", value: "Discord", sub: support },
            { label: "Evaluate", value: "Sun 10:00–13:00", sub: "Remotely, in sinceai.app" },
            { label: "Top three", value: "By Sun 13:00", sub: "Announced from 13:30 at EduCity" },
          ]}
        />
        <p className="flex flex-wrap items-center gap-3 text-xs text-white/55">
          <StatusTag status={company.placementStatus} />
          The briefing room follows the organiser&rsquo;s final EduCity map. The experts, support hours and evaluator
          are being confirmed with {name}, and this page updates when they are.
        </p>
        <div className="flex flex-wrap gap-3">
          <ShareButton title={`${name} · Since AI Hackathon 2026`} />
          <CalendarButton company={company} />
        </div>
        <NowNext items={schedule} audience={AUDIENCE} firstMoment={schedule[0]} />
      </GuideHero>

      <SectionNav
        items={[
          { id: "friday", label: "Friday room" },
          { id: "support", label: "Discord support" },
          { id: "sunday", label: "Sunday" },
          { id: "schedule", label: "Schedule" },
          { id: "prepare", label: "Prepare" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="friday">
        <SectionHeading
          id="friday-title"
          eyebrow="// friday · educity"
          title={`Briefing room ${room}, with ${name} on video.`}
          lede={`Teams that chose ${name} come to room ${room} on EduCity floor ${company.briefing.floor}, up the stairs from Taidon portaat or by lift. The briefing runs 18:50–19:30 EET, and 19:30 is a hard end for every briefing.`}
        />
        <div className="mb-10 grid gap-6 md:grid-cols-2">
          <Points
            title="Since AI in the room"
            items={[
              "A host receives the teams and introduces the challenge",
              `The host shows ${name}'s approved brief on screen`,
              "Since AI provides and runs the screen, speakers, microphone and video call",
            ]}
          />
          <Points
            title={`${name} on the call`}
            items={[
              `${name}'s technical experts join by video to give context`,
              "Teams ask their questions in the room, through the room's AV",
              "Since AI sends the call link directly to the named experts",
            ]}
          />
        </div>
        <VenueExplorer mapIds={[`educity-${company.briefing.floor}`]} highlight={[company.id]} label={`${name} briefing room`} />
        <div className="mt-10">
          <TwinTeaser focus={`room-${company.id}`} />
        </div>
      </GuideSection>

      <GuideSection id="support">
        <SectionHeading
          id="support-title"
          eyebrow="// saturday · discord"
          title="No stand at Joki. Technical help on Discord."
          lede={`${name} has no physical stand on Saturday. Teams ask their technical questions in ${name}'s challenge channel on the Since AI Discord, and its experts answer remotely.`}
        />
        <p className="mb-6 border-l-4 border-(--color-event) pl-4 text-lg font-semibold text-white">{support}.</p>
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-neutral-300">
          Follow the official announcements on the Since AI Discord for the channel and the agreed hours.
        </p>
        <div className="guide-no-print flex flex-wrap gap-3">
          <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className={ghostButtonClass}>
            Join the Since AI Discord
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <Link href={DISCORD_GUIDE_PATH} className={ghostButtonClass}>
            Discord Guide
          </Link>
        </div>
      </GuideSection>

      <GuideSection id="sunday">
        <SectionHeading
          id="sunday-title"
          eyebrow="// sunday · remote"
          title="Evaluation from wherever you are."
          lede={`${name}'s approved evaluator reviews the submissions to its challenge remotely in sinceai.app from 10:00, when submissions close, and confirms the top three teams to Since AI by 13:00 EET. There is no need to travel to EduCity. Since AI sets up the evaluator's access in advance and announces the top three from 13:30.`}
        />
      </GuideSection>

      <GuideSection id="schedule">
        <SectionHeading
          id="schedule-title"
          eyebrow="// schedule"
          title="Your timeline."
          lede="Local Turku time (EET, UTC+2). Only what applies to a remote partner: Discord support hours are added when they are confirmed."
        />
        <div className="mb-8 flex flex-wrap gap-3">
          <CalendarButton company={company} />
        </div>
        <Schedule items={schedule} audience={AUDIENCE} />
      </GuideSection>

      <GuideSection id="prepare">
        <SectionHeading id="prepare-title" eyebrow="// prepare" title="Before the event." />
        <Checklist storageKey={`challenge-partners:${company.id}`} groups={REMOTE_PARTNER_CHECKLIST} />
      </GuideSection>

      <GuideSection id="help">
        <SectionHeading id="help-title" eyebrow="// help" title="Questions?" />
        <HelpSection onSiteNote="On Friday, the Since AI host in the room and the event staff help the teams on site." />
      </GuideSection>
    </>
  );
}
