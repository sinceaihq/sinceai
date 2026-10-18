import Link from "next/link";
import { DISCORD_GUIDE_PATH, DISCORD_INVITE, DISCORD_ROLE_GUIDES, type DiscordAudience } from "@/lib/hackathon-2026";
import { Arrow, ghostButtonClass, primaryButtonClass } from "./primitives";

/**
 * Partner Discord on a role page, kept short: join before the event, how this
 * kind of partner uses it, and the illustrated step-by-step Discord Guide
 * (its own page) for everything else.
 */
export function PartnerDiscord({ audience, company }: { audience: DiscordAudience; company?: string }) {
  const guide = DISCORD_ROLE_GUIDES[audience];
  const example = `Anna | ${company ?? (audience === "challenge-partners" ? "Valmet" : "Solita")}`;
  const invite = DISCORD_INVITE.replace(/^https?:\/\//, "");
  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
      <div className="guide-avoid-break border border-(--color-event)/40 bg-(--color-event)/[0.05] p-6 md:self-start">
        <h3 className="text-2xl font-bold tracking-tight text-white">Join before you travel</h3>
        <p className="mt-3 text-sm text-neutral-300 leading-relaxed">
          Every representative coming on site: join the Since AI Discord, confirm your email and set your nickname
          to First name | Company — for example “{example}”. The Since AI team then opens your company&apos;s
          channels.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className={`${primaryButtonClass} w-full sm:w-auto sm:self-start`}
          >
            Join the Since AI Discord
            <Arrow external />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <p className="font-mono text-xs text-white/55 break-all">{invite}</p>
        </div>
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="font-semibold text-white">New to Discord?</p>
          <p className="mt-1 text-sm text-neutral-400 leading-relaxed">
            Our Discord Guide walks you through it with pictures: account, nickname, your channel, notifications and
            the phone app. About ten minutes.
          </p>
          <Link href={`${DISCORD_GUIDE_PATH}#setup`} className={`${ghostButtonClass} mt-4 w-full sm:w-auto`}>
            Open the step-by-step Discord Guide
            <Arrow />
          </Link>
        </div>
      </div>

      <div className="guide-avoid-break">
        <h3 className="text-2xl font-bold tracking-tight text-white">{guide.title}</h3>
        <ul className="mt-4 border-t border-white/10">
          {guide.points.map((point) => (
            <li key={point} className="border-b border-white/10 py-3 text-sm text-neutral-300 leading-relaxed">
              {point}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-neutral-400 leading-relaxed">
          Set your channel&apos;s notifications to <span className="font-semibold text-white">All Messages</span>, and
          keep phone notifications on for at least one onsite representative —{" "}
          <Link
            href={`${DISCORD_GUIDE_PATH}#notifications`}
            className="text-neutral-300 underline decoration-white/25 underline-offset-4 hover:text-white hover:decoration-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            here&apos;s how
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
