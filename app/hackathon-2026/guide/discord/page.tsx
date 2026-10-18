import {
  Checklist,
  Details,
  FactsStrip,
  GuideHero,
  GuideSection,
  HelpSection,
  SectionHeading,
  SectionNav,
  Arrow,
  ghostButtonClass,
  primaryButtonClass,
} from "@/components/guide";
import { DiscordAnatomy, NotificationsMock, PhoneMock, StepIllustration } from "@/components/guide/discord/Mock";
import { RichText } from "@/components/guide/discord/RichText";
import {
  DISCORD_CHECKLIST,
  DISCORD_DOWNLOADS,
  DISCORD_GLOSSARY,
  DISCORD_GUIDE,
  DISCORD_INVITE,
  DISCORD_NOTIFICATION_STEPS,
  DISCORD_PHONE_STEPS,
  DISCORD_ROLE_GUIDES,
  DISCORD_TROUBLESHOOTING,
  discordSteps,
  getGuide,
  GUIDE_BASE_PATH,
  guidePath,
  type DiscordAudience,
} from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";

const EXAMPLE = "Anna | Valmet";
const steps = discordSteps(EXAMPLE);
const external = { target: "_blank", rel: "noopener noreferrer" } as const;

const ANATOMY: readonly { title: string; text: string }[] = [
  { title: "Servers", text: "Each community is a server. Since AI is one of them — you only need this one." },
  { title: "Channels", text: "The topics of the Since AI server. Your company's channel appears here." },
  { title: "Conversation", text: "Messages in the channel you have open, newest at the bottom." },
  { title: "Message box", text: "Type here and press Enter to send." },
];

const ROLES: readonly DiscordAudience[] = ["challenge-partners", "partners"];

function JoinButton({ className }: { className?: string }) {
  return (
    <a href={DISCORD_INVITE} {...external} className={cn(primaryButtonClass, className)}>
      Join the Since AI Discord
      <Arrow external />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** "1 / 2 / 3" list with Discord's labels in bold. */
function NumberedSteps({ items }: { items: readonly string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={item} className="grid grid-cols-[2rem_1fr] gap-3 text-sm text-neutral-300 leading-relaxed">
          <span className="flex h-7 w-7 items-center justify-center border border-white/20 font-mono text-xs tabular-nums text-white">
            {i + 1}
          </span>
          <span className="pt-1">
            <RichText text={item} />
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function DiscordGuidePage() {
  return (
    <>
      <GuideHero
        crumbs={[
          { label: "Hackathon 2026", href: "/hackathon" },
          { label: "Field Guide", href: GUIDE_BASE_PATH },
          { label: DISCORD_GUIDE.name },
        ]}
        title={DISCORD_GUIDE.name}
        lede={DISCORD_GUIDE.lede}
      >
        <FactsStrip
          facts={[
            { label: "Time needed", value: "About 10 min", sub: "One-time setup" },
            { label: "Cost", value: "Free", sub: "No subscription needed" },
            { label: "Works in", value: "Your browser", sub: "Or the phone and computer apps" },
            { label: "When", value: "Before you travel", sub: "Every onsite representative", strong: true },
          ]}
        />
        <div className="guide-no-print flex flex-col gap-3 sm:flex-row sm:items-center">
          <JoinButton className="w-full sm:w-auto" />
          <a href="#setup" className={cn(ghostButtonClass, "w-full sm:w-auto")}>
            Show me how, step by step
            <Arrow />
          </a>
        </div>
      </GuideHero>

      <SectionNav
        items={[
          { id: "what", label: "What it is" },
          { id: "setup", label: "Set up" },
          { id: "channel", label: "Your channel" },
          { id: "notifications", label: "Notifications" },
          { id: "phone", label: "Phone" },
          { id: "checklist", label: "Checklist" },
          { id: "problems", label: "Problems?" },
          { id: "help", label: "Help" },
        ]}
      />

      <GuideSection id="what" className="border-t-0 pt-8 md:pt-12">
        <SectionHeading
          id="what-title"
          eyebrow="// discord in one minute"
          title="What Discord is."
          lede="A chat app organised into rooms, called channels. If you have used Microsoft Teams or Slack, you already know most of it."
        />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[3fr_2fr] lg:items-start">
          <DiscordAnatomy />
          <ol className="space-y-4">
            {ANATOMY.map((part, i) => (
              <li key={part.title} className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-(--color-brand) font-mono text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span>
                  <span className="block font-semibold text-white">{part.title}</span>
                  <span className="block text-sm text-neutral-400 leading-relaxed">{part.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <h3 className="mt-14 text-xl font-bold tracking-tight text-white">Words you will see</h3>
        <dl className="mt-4 grid grid-cols-1 border-t border-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {DISCORD_GLOSSARY.map((entry) => (
            <div key={entry.term} className="border-b border-white/10 py-4 sm:pr-6">
              <dt className="font-mono text-xs uppercase tracking-widest text-white">{entry.term}</dt>
              <dd className="mt-1 text-sm text-neutral-400 leading-relaxed">{entry.meaning}</dd>
            </div>
          ))}
        </dl>
      </GuideSection>

      <GuideSection id="setup">
        <SectionHeading
          id="setup-title"
          eyebrow="// set up in six steps"
          title="From invite to your company channel."
          lede="Do this once, before you travel. The pink outline in each picture shows where to click."
        />
        <ol className="space-y-6">
          {steps.map((step, i) => (
            <li
              key={step.id}
              id={`step-${step.id}`}
              className="guide-avoid-break grid grid-cols-1 gap-6 border border-white/10 p-5 md:grid-cols-[1fr_1.15fr] md:gap-10 md:p-8"
            >
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-(--color-event)">
                  Step {i + 1} of {steps.length}
                </p>
                <h3 className="mt-2 text-2xl font-bold tracking-tight text-white">{step.title}</h3>
                <p className="mt-3 text-base text-neutral-300 leading-relaxed">
                  <RichText text={step.text} />
                </p>
                {step.id === "invite" && <JoinButton className="guide-no-print mt-5 w-full sm:w-auto" />}
                {step.tip && (
                  <p className="mt-4 border-l-2 border-white/20 pl-3 text-sm text-neutral-400 leading-relaxed">
                    <span className="font-semibold text-white">Tip: </span>
                    <RichText text={step.tip} />
                  </p>
                )}
              </div>
              <StepIllustration kind={step.illustration} example={EXAMPLE} />
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-white/55">
          The pictures are simplified drawings. Discord&apos;s own screens may look slightly different, and the
          words on the Since AI server may vary.
        </p>
      </GuideSection>

      <GuideSection id="channel">
        <SectionHeading
          id="channel-title"
          eyebrow="// during the hackathon"
          title="How to use your channel."
          lede="Answer in the channel where you can, so everyone gets the same answer. To reply to one message, hover over it (on a phone: press and hold) and choose Reply — or Create Thread for a longer conversation."
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {ROLES.map((audience) => {
            const role = DISCORD_ROLE_GUIDES[audience];
            return (
              <section
                key={audience}
                id={`role-${audience}`}
                aria-labelledby={`role-${audience}-title`}
                className="guide-avoid-break border border-white/10 p-5 md:p-6"
              >
                <p className="font-mono text-xs uppercase tracking-widest text-white/55">{getGuide(audience).forWho}</p>
                <h3 id={`role-${audience}-title`} className="mt-2 text-xl font-bold tracking-tight text-white">
                  {role.title}
                </h3>
                <ul className="mt-4 border-t border-white/10">
                  {role.points.map((point) => (
                    <li key={point} className="border-b border-white/10 py-3 text-sm text-neutral-300 leading-relaxed">
                      {point}
                    </li>
                  ))}
                </ul>
                <a
                  href={guidePath(audience)}
                  className="mt-4 inline-flex min-h-11 items-center text-sm text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {getGuide(audience).name}
                  <Arrow />
                </a>
              </section>
            );
          })}
        </div>
      </GuideSection>

      <GuideSection id="notifications">
        <SectionHeading
          id="notifications-title"
          eyebrow="// don't miss a question"
          title="Turn on notifications for your channel."
          lede="Then every new message in your company's channel reaches you. The rest of the server can stay quiet."
        />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_3fr] lg:items-start">
          <div>
            <NumberedSteps items={DISCORD_NOTIFICATION_STEPS} />
            <dl className="mt-8 border-t border-white/10">
              {DISCORD_ROLE_GUIDES["challenge-partners"].notifications.map((n, i) => (
                <div key={n.where} className="border-b border-white/10 py-3">
                  <dt className="text-sm text-neutral-300">{i === 0 ? "Your company's channel" : n.where}</dt>
                  <dd className="mt-1 font-mono text-xs uppercase tracking-widest text-white">{n.level}</dd>
                </div>
              ))}
            </dl>
          </div>
          <NotificationsMock />
        </div>
      </GuideSection>

      <GuideSection id="phone">
        <SectionHeading
          id="phone-title"
          eyebrow="// on the move"
          title="Put Discord on your phone."
          lede="At the event you will be walking between rooms. With the app on your phone, questions reach you wherever you are. At least one onsite representative per company keeps phone notifications on."
        />
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[3fr_2fr] md:items-center">
          <div>
            <NumberedSteps items={DISCORD_PHONE_STEPS} />
            <div className="guide-no-print mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {[
                { label: "App Store (iPhone)", href: DISCORD_DOWNLOADS.ios },
                { label: "Google Play (Android)", href: DISCORD_DOWNLOADS.android },
                { label: "Computer app", href: DISCORD_DOWNLOADS.desktop },
              ].map((link) => (
                <a key={link.href} href={link.href} {...external} className={cn(ghostButtonClass, "w-full sm:w-auto")}>
                  {link.label}
                  <Arrow external />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ))}
            </div>
          </div>
          <PhoneMock />
        </div>
      </GuideSection>

      <GuideSection id="checklist">
        <SectionHeading
          id="checklist-title"
          eyebrow="// before you arrive in turku"
          title="Your Discord checklist."
          lede="Tick each item off. Your ticks are saved in this browser only."
        />
        <div className="max-w-2xl">
          <Checklist single storageKey="discord-guide" groups={[{ title: "Before you arrive in Turku", items: DISCORD_CHECKLIST }]} />
        </div>
      </GuideSection>

      <GuideSection id="problems">
        <SectionHeading id="problems-title" eyebrow="// troubleshooting" title="Something not working?" />
        <Details items={DISCORD_TROUBLESHOOTING} />
      </GuideSection>

      <GuideSection id="help">
        <SectionHeading
          id="help-title"
          eyebrow="// help"
          title="Still stuck?"
          lede="Email us and we will sort out your access — or ask any Since AI volunteer on site."
        />
        <HelpSection />
      </GuideSection>
    </>
  );
}
