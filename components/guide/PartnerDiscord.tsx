import {
  DISCORD_CHECKLIST,
  DISCORD_INVITE,
  DISCORD_ROLE_GUIDES,
  discordSetupSteps,
  type DiscordAudience,
} from "@/lib/hackathon-2026";
import { Checklist } from "./Checklist";
import { Arrow, primaryButtonClass } from "./primitives";

/**
 * Partner onboarding to the Since AI Discord: join and set up before the event (checklist, a
 * beginner's walkthrough), then how this kind of partner uses it during the hackathon.
 */
export function PartnerDiscord({ audience, company }: { audience: DiscordAudience; company?: string }) {
  const guide = DISCORD_ROLE_GUIDES[audience];
  const example = `Anna | ${company ?? (audience === "challenge-partners" ? "Valmet" : "Solita")}`;
  const invite = DISCORD_INVITE.replace(/^https?:\/\//, "");
  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <div className="guide-avoid-break border border-(--color-event)/40 bg-(--color-event)/[0.05] p-6">
          <h3 className="text-2xl font-bold tracking-tight text-white">Join before you travel</h3>
          <p className="mt-3 text-sm text-neutral-300 leading-relaxed">
            Every representative coming on site: join the Since AI Discord, verify your account and check that your
            company role is in place before you arrive in Turku.
          </p>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className={`${primaryButtonClass} mt-6 w-full sm:w-auto`}
          >
            Join the Since AI Discord
            <Arrow external />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <p className="mt-3 font-mono text-xs text-white/55 break-all">{invite}</p>
          <details className="guide-details group mt-6 border-t border-white/10">
            <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 pt-4 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              First time using Discord?
              <svg
                aria-hidden="true"
                width="12"
                height="12"
                viewBox="0 0 12 12"
                className="guide-chevron shrink-0 text-white/55 transition-transform duration-200"
              >
                <path d="M1.5 4l4.5 4.5L10.5 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </summary>
            <ol className="mt-4 space-y-3 text-sm text-neutral-300 leading-relaxed">
              {discordSetupSteps(example).map((step, i) => (
                <li key={step} className="grid grid-cols-[1.75rem_1fr] gap-2">
                  <span className="font-mono tabular-nums text-white/55">{String(i + 1).padStart(2, "0")}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </details>
        </div>
        <Checklist
          single
          storageKey={`discord-${audience}`}
          groups={[{ title: "Before you arrive in Turku", items: DISCORD_CHECKLIST }]}
        />
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-[3fr_2fr]">
        <div className="guide-avoid-break">
          <h3 className="text-2xl font-bold tracking-tight text-white">{guide.title}</h3>
          <ul className="mt-4 border-t border-white/10">
            {guide.points.map((point) => (
              <li key={point} className="border-b border-white/10 py-3 text-sm text-neutral-300 leading-relaxed">
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="guide-avoid-break">
          <h3 className="text-2xl font-bold tracking-tight text-white">Notifications</h3>
          <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
            Right-click a channel (desktop) or long-press it (phone) and open its notification settings.
          </p>
          <dl className="mt-4 border-t border-white/10">
            {guide.notifications.map((n) => (
              <div key={n.where} className="border-b border-white/10 py-3">
                <dt className="text-sm text-neutral-300">{n.where}</dt>
                <dd className="mt-1 font-mono text-xs uppercase tracking-widest text-white">{n.level}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-neutral-400 leading-relaxed">
            At least one onsite representative keeps phone notifications on during the event.
          </p>
        </div>
      </div>
    </div>
  );
}
