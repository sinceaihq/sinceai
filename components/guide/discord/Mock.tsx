import type { ReactNode } from "react";
import type { DiscordIllustration } from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";

/**
 * Simplified drawings of Discord's screens for the Discord Guide. Drawn (not
 * screenshots) so they stay legible at every width, follow the guide's dark
 * theme and survive Discord's small UI changes. Everything inside scales with
 * the frame width (container query units), so a phone shows the same picture,
 * smaller. The frame carries the accessible description; the drawing itself
 * is hidden from assistive tech.
 */

const HOT_LABEL_SIDE = {
  top: "-top-[1.9em] right-0",
  right: "left-[calc(100%+0.7em)] top-1/2 -translate-y-1/2",
  left: "right-[calc(100%+0.7em)] top-1/2 -translate-y-1/2",
} as const;

/** Pink ring + label pointing at the thing to click. */
function Hot({
  children,
  label,
  side = "top",
  className,
}: {
  children: ReactNode;
  label?: string;
  side?: keyof typeof HOT_LABEL_SIDE;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-block", className)}>
      <span className="block rounded-[0.35em] outline outline-[0.18em] outline-offset-[0.2em] outline-(--color-brand)">
        {children}
      </span>
      {label && (
        <span
          className={cn(
            "absolute z-10 whitespace-nowrap rounded-[0.3em] bg-(--color-brand) px-[0.5em] py-[0.1em] text-[0.75em] font-bold text-white",
            HOT_LABEL_SIDE[side],
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}

function Frame({
  label,
  caption,
  children,
  className,
  textClass = "text-[clamp(8px,2.4cqw,14px)]",
}: {
  label: string;
  caption?: string;
  children: ReactNode;
  className?: string;
  /** Base text size; everything inside is sized in em. */
  textClass?: string;
}) {
  return (
    <figure className="guide-avoid-break m-0">
      <div
        role="img"
        aria-label={label}
        className={cn(
          "overflow-hidden border border-white/10 bg-(--color-discord-rail) [container-type:inline-size]",
          className,
        )}
      >
        <div aria-hidden="true" className={cn("select-none leading-[1.35] text-(--color-discord-text)", textClass)}>
          {children}
        </div>
      </div>
      {caption && <figcaption className="mt-2 text-xs text-white/55">{caption}</figcaption>}
    </figure>
  );
}

const Button = ({ children, muted }: { children: ReactNode; muted?: boolean }) => (
  <span
    className={cn(
      "block rounded-[0.3em] px-[1em] py-[0.55em] text-center font-semibold text-white",
      muted ? "bg-(--color-discord-input)" : "bg-(--color-discord-blurple)",
    )}
  >
    {children}
  </span>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <span className="mt-[0.7em] block">
    <span className="block text-[0.7em] font-bold uppercase tracking-wide text-(--color-discord-muted)">{label}</span>
    <span className="mt-[0.25em] block rounded-[0.25em] bg-(--color-discord-rail) px-[0.6em] py-[0.4em]">{value}</span>
  </span>
);

function ServerIcon({ size = "2.6em" }: { size?: string }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[30%] bg-black"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/logo/sinceai-white.png" alt="" className="h-[55%] w-[55%]" />
    </span>
  );
}

const Channel = ({ name, active, dim }: { name: string; active?: boolean; dim?: boolean }) => (
  <span
    className={cn(
      "block truncate rounded-[0.25em] px-[0.5em] py-[0.2em]",
      active ? "bg-(--color-discord-input) text-white" : dim ? "text-(--color-discord-muted)/70" : "text-(--color-discord-muted)",
    )}
  >
    <span className="mr-[0.35em] opacity-70">#</span>
    {name}
  </span>
);

const Category = ({ children }: { children: ReactNode }) => (
  <span className="mt-[0.9em] block px-[0.3em] text-[0.7em] font-bold uppercase tracking-wide text-(--color-discord-muted)">
    ⌄ {children}
  </span>
);

/** Discord's three-column app layout: server rail, channel list, conversation. */
function AppShell({ sidebar, chat, header }: { sidebar: ReactNode; chat: ReactNode; header?: ReactNode }) {
  return (
    <span className="flex aspect-[16/10] w-full">
      <span className="flex w-[9%] flex-col items-center gap-[0.6em] pt-[0.7em]">
        <ServerIcon />
        <span className="h-[2.6em] w-[2.6em] rounded-full bg-(--color-discord-chat)" />
        <span className="h-[2.6em] w-[2.6em] rounded-full bg-(--color-discord-chat)" />
      </span>
      <span className="relative flex w-[30%] flex-col bg-(--color-discord-sidebar)">
        {header ?? (
          <span className="block border-b border-black/30 px-[0.7em] py-[0.65em] font-bold text-white">Since AI ⌄</span>
        )}
        <span className="block px-[0.4em]">{sidebar}</span>
      </span>
      <span className="flex flex-1 flex-col bg-(--color-discord-chat)">{chat}</span>
    </span>
  );
}

function Message({ name, text, color = "text-white" }: { name: string; text: string; color?: string }) {
  return (
    <span className="flex gap-[0.6em] px-[0.9em] py-[0.45em]">
      <span className="h-[2.2em] w-[2.2em] shrink-0 rounded-full bg-(--color-discord-input)" />
      <span className="min-w-0">
        <span className={cn("block font-semibold", color)}>{name}</span>
        <span className="block text-(--color-discord-text)">{text}</span>
      </span>
    </span>
  );
}

const ChatHeader = ({ name }: { name: string }) => (
  <span className="block border-b border-black/30 px-[0.9em] py-[0.65em] font-semibold text-white">
    <span className="mr-[0.35em] text-(--color-discord-muted)">#</span>
    {name}
  </span>
);

const MessageBox = ({ name }: { name: string }) => (
  <span className="mx-[0.9em] mb-[0.9em] mt-auto block rounded-[0.4em] bg-(--color-discord-input) px-[0.8em] py-[0.6em] text-(--color-discord-muted)">
    Message #{name}
  </span>
);

const COMPANY_CHANNEL = "your-company";

function DefaultSidebar({ highlight }: { highlight?: boolean }) {
  return (
    <>
      <Category>Start here</Category>
      <Channel name="start-here" />
      <Channel name="announcements" />
      <Category>Your company</Category>
      {highlight ? (
        <Hot label="Your channel" className="mt-[0.2em] block">
          <Channel name={COMPANY_CHANNEL} active />
        </Hot>
      ) : (
        <Channel name={COMPANY_CHANNEL} active />
      )}
      <Category>Help</Category>
      <Channel name="help" dim />
    </>
  );
}

function CenteredCard({ children, width = "62%" }: { children: ReactNode; width?: string }) {
  return (
    <span className="flex min-h-[62.5cqw] w-full items-center justify-center py-[4%] bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--color-discord-blurple)_35%,transparent),transparent_60%)]">
      <span className="block rounded-[0.6em] bg-(--color-discord-chat) p-[1.4em] shadow-none" style={{ width }}>
        {children}
      </span>
    </span>
  );
}

const Num = ({ n }: { n: string }) => (
  <span className="absolute z-10 flex h-[1.8em] w-[1.8em] items-center justify-center rounded-full bg-(--color-brand) text-[0.85em] font-bold text-white">
    {n}
  </span>
);

export function DiscordAnatomy() {
  const labels = ["1", "2", "3", "4"];
  return (
    <Frame label="The Discord window: on the far left the list of servers, then the channel list of the Since AI server, the conversation in the selected channel, and the message box at the bottom.">
      <span className="relative block">
        <AppShell
          sidebar={<DefaultSidebar />}
          chat={
            <>
              <ChatHeader name={COMPANY_CHANNEL} />
              <Message name="Team Aurora" text="Hi! Can we use our own dataset for the challenge?" />
              <Message name="Anna | Valmet" text="Yes — anything you have the rights to use is fine." color="text-(--color-discord-green)" />
              <MessageBox name={COMPANY_CHANNEL} />
            </>
          }
        />
        <span className="absolute left-[2.6%] top-[42%]">
          <Num n={labels[0]} />
        </span>
        <span className="absolute left-[33%] top-[42%]">
          <Num n={labels[1]} />
        </span>
        <span className="absolute right-[6%] top-[2.2%]">
          <Num n={labels[2]} />
        </span>
        <span className="absolute bottom-[9%] right-[5%]">
          <Num n={labels[3]} />
        </span>
      </span>
    </Frame>
  );
}

function InviteMock() {
  return (
    <Frame label="Discord's invite page in a web browser: “You've been invited to join Since AI”, with the Accept Invite button highlighted.">
      <CenteredCard width="58%">
        <span className="flex flex-col items-center text-center">
          <ServerIcon size="3.6em" />
          <span className="mt-[0.8em] block text-[0.85em] text-(--color-discord-muted)">You&apos;ve been invited to join</span>
          <span className="mt-[0.2em] block text-[1.5em] font-bold text-white">Since AI</span>
          <span className="mt-[0.5em] flex items-center gap-[0.4em] text-[0.8em] text-(--color-discord-muted)">
            <span className="h-[0.6em] w-[0.6em] rounded-full bg-(--color-discord-green)" /> Online
            <span className="ml-[0.6em] h-[0.6em] w-[0.6em] rounded-full bg-(--color-discord-muted)" /> Members
          </span>
          <Hot label="Click" className="mt-[1.4em] block w-full">
            <Button>Accept Invite</Button>
          </Hot>
        </span>
      </CenteredCard>
    </Frame>
  );
}

function AccountMock() {
  return (
    <Frame label="Discord's Create an account form with fields for email, display name, username, password and date of birth, and the Continue button highlighted.">
      <CenteredCard width="56%">
        <span className="block text-center text-[1.25em] font-bold text-white">Create an account</span>
        <Field label="Email" value="anna@company.com" />
        <Field label="Display name" value="Anna" />
        <Field label="Username" value="anna.company" />
        <Field label="Password" value="••••••••••" />
        <Field label="Date of birth" value="Day · Month · Year" />
        <Hot label="Click" className="mt-[1.2em] block w-full">
          <Button>Continue</Button>
        </Hot>
      </CenteredCard>
    </Frame>
  );
}

function EmailMock() {
  return (
    <Frame label="An email from Discord in your inbox asking you to verify your email address, with the Verify Email button highlighted.">
      <span className="flex aspect-[16/10] w-full flex-col bg-white text-neutral-800">
        <span className="flex items-center gap-[0.6em] border-b border-neutral-200 px-[1.2em] py-[0.8em]">
          <span className="h-[2.2em] w-[2.2em] rounded-full bg-(--color-discord-blurple)" />
          <span>
            <span className="block font-semibold">Discord</span>
            <span className="block text-[0.85em] text-neutral-500">Verify Email Address for Discord</span>
          </span>
        </span>
        <span className="flex flex-1 flex-col items-center justify-center px-[2em] text-center">
          <span className="block text-[1.3em] font-bold">Hey Anna,</span>
          <span className="mt-[0.5em] block max-w-[80%] text-neutral-600">
            Thanks for registering for an account on Discord! Before we get started, we just need to confirm that this is you.
          </span>
          <Hot label="Click" className="mt-[1.3em] block">
            <Button>Verify Email</Button>
          </Hot>
        </span>
      </span>
    </Frame>
  );
}

const Choice = ({ children, selected }: { children: ReactNode; selected?: boolean }) => (
  <span
    className={cn(
      "mt-[0.6em] block rounded-[0.35em] border px-[0.8em] py-[0.55em]",
      selected ? "border-(--color-discord-blurple) bg-(--color-discord-blurple)/20 text-white" : "border-white/10",
    )}
  >
    {children}
  </span>
);

function WelcomeMock() {
  return (
    <Frame label="The Since AI server's welcome questions: a list of answers, with the company or partner representative option highlighted.">
      <CenteredCard width="60%">
        <span className="flex items-center gap-[0.6em]">
          <ServerIcon size="2.2em" />
          <span className="font-bold text-white">Welcome to Since AI</span>
        </span>
        <span className="mt-[1em] block text-[0.85em] text-(--color-discord-muted)">Tell us a little about yourself</span>
        <Choice>Builder / participant</Choice>
        <Hot label="Choose" className="mt-[0.6em] block">
          <Choice selected>Company or partner representative</Choice>
        </Hot>
        <Choice>Something else</Choice>
        <span className="mt-[1em] block">
          <Button>Next</Button>
        </span>
      </CenteredCard>
    </Frame>
  );
}

const Item = ({ children }: { children: ReactNode }) => (
  <span className="block px-[0.7em] py-[0.35em] text-(--color-discord-text)">{children}</span>
);

function NicknameMock({ example }: { example: string }) {
  return (
    <Frame
      label={`The Since AI menu opened from the top of the channel list, with Edit Server Profile highlighted, and the nickname set to ${example}.`}
    >
      <AppShell
        header={
          <span className="block border-b border-black/30 px-[0.7em] py-[0.65em] font-bold text-white">
            <Hot label="1. Click" side="right">Since AI ⌄</Hot>
          </span>
        }
        sidebar={
          <span className="relative mt-[0.4em] block rounded-[0.35em] bg-(--color-discord-rail) py-[0.3em]">
            <Item>Invite People</Item>
            <Item>Notification Settings</Item>
            <Item>Privacy Settings</Item>
            <Hot label="2. Click" side="right" className="block">
              <span className="block bg-(--color-discord-blurple) px-[0.7em] py-[0.35em] text-white">Edit Server Profile</span>
            </Hot>
            <Item>Hide Muted Channels</Item>
          </span>
        }
        chat={
          <span className="flex flex-1 flex-col justify-center px-[1.6em]">
            <span className="block text-[1.1em] font-bold text-white">Server Profile</span>
            <Field label="Server nickname" value={example} />
            <span className="mt-[1.2em] flex justify-end">
              <Hot label="3. Click">
                <span className="block rounded-[0.3em] bg-(--color-discord-green) px-[1em] py-[0.5em] font-semibold text-white">
                  Save Changes
                </span>
              </Hot>
            </span>
          </span>
        }
      />
    </Frame>
  );
}

function ChannelsMock() {
  return (
    <Frame label="The Since AI server once your company role is in place: your company's channel appears in the channel list on the left and is highlighted.">
      <AppShell
        sidebar={<DefaultSidebar highlight />}
        chat={
          <>
            <ChatHeader name={COMPANY_CHANNEL} />
            <Message name="Since AI team" text="Welcome! Teams will ask their questions about your company here." color="text-(--color-discord-blurple)" />
            <MessageBox name={COMPANY_CHANNEL} />
          </>
        }
      />
    </Frame>
  );
}

const Row = ({ children, radio, on }: { children: ReactNode; radio?: boolean; on?: boolean }) => (
  <span className="flex items-center justify-between gap-[1em] px-[0.7em] py-[0.35em]">
    <span>{children}</span>
    {radio && (
      <span
        className={cn(
          "h-[0.9em] w-[0.9em] rounded-full border-[0.15em]",
          on ? "border-white bg-(--color-discord-blurple)" : "border-(--color-discord-muted)",
        )}
      />
    )}
  </span>
);

export function NotificationsMock() {
  return (
    <Frame label="Right-click menu of your company's channel: Notification Settings opened, with All Messages selected and highlighted.">
      <AppShell
        sidebar={<DefaultSidebar />}
        chat={
          <span className="relative flex flex-1">
            <span className="absolute left-[8%] top-[30%] flex gap-[0.5em]">
              <span className="block w-[10em] rounded-[0.35em] bg-(--color-discord-rail) py-[0.3em]">
                <Row>Mark As Read</Row>
                <Row>Mute Channel</Row>
                <Hot label="1" side="left" className="block">
                  <span className="block bg-(--color-discord-blurple) px-[0.7em] py-[0.35em] text-white">
                    Notification Settings ›
                  </span>
                </Hot>
                <Row>Copy Link</Row>
              </span>
              <span className="mt-[1.6em] block w-[10em] rounded-[0.35em] bg-(--color-discord-rail) py-[0.3em]">
                <Row radio>Use Category Default</Row>
                <Hot label="2" side="right" className="block">
                  <Row radio on>
                    <span className="font-semibold text-white">All Messages</span>
                  </Row>
                </Hot>
                <Row radio>Only @mentions</Row>
                <Row radio>Nothing</Row>
              </span>
            </span>
          </span>
        }
      />
    </Frame>
  );
}

const PhoneNotification = ({ title, text, time }: { title: string; text: string; time: string }) => (
  <span className="block rounded-[0.8em] bg-white/15 p-[0.9em] text-white">
    <span className="flex items-center gap-[0.5em] text-[0.8em] text-white/70">
      <span className="h-[1.3em] w-[1.3em] rounded-[0.35em] bg-(--color-discord-blurple)" /> DISCORD · {time}
    </span>
    <span className="mt-[0.4em] block font-semibold">{title}</span>
    <span className="block text-white/85">{text}</span>
  </span>
);

export function PhoneMock() {
  return (
    <Frame
      label="A phone lock screen with Discord notifications: a team asks a question in your company's channel."
      className="mx-auto max-w-[20rem] rounded-[2rem]"
      textClass="text-[clamp(10px,4.6cqw,16px)]"
    >
      <span className="flex aspect-[9/16] w-full flex-col items-center bg-[linear-gradient(160deg,color-mix(in_srgb,var(--color-event-strong)_40%,black),var(--color-scene))] px-[6%] pt-[14%]">
        <span className="block text-[3.4em] font-light leading-none text-white tabular-nums">10:24</span>
        <span className="mt-[0.4em] block text-white/70">Saturday 7 November</span>
        <span className="mt-[2.4em] block w-full">
          <Hot label="New question" className="block w-full">
            <PhoneNotification
              time="now"
              title={`Team Aurora in #${COMPANY_CHANNEL}`}
              text="Can we use our own dataset for the challenge?"
            />
          </Hot>
        </span>
        <span className="mt-[0.8em] block w-full opacity-80">
          <PhoneNotification time="9 min ago" title="Since AI team in #announcements" text="Lunch is served at BioCity from 10:30." />
        </span>
        <span className="mb-[4%] mt-auto block h-[0.35em] w-[35%] rounded-full bg-white/60" />
      </span>
    </Frame>
  );
}

/** The drawing for one setup step. */
export function StepIllustration({ kind, example }: { kind: DiscordIllustration; example: string }) {
  switch (kind) {
    case "invite":
      return <InviteMock />;
    case "account":
      return <AccountMock />;
    case "email":
      return <EmailMock />;
    case "welcome":
      return <WelcomeMock />;
    case "nickname":
      return <NicknameMock example={example} />;
    case "channels":
      return <ChannelsMock />;
  }
}
