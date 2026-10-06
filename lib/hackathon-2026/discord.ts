import { GUIDE_LINKS } from "./facts";

/**
 * Partner onboarding to the Since AI Discord — the main channel between partner
 * representatives and the organisers during the hackathon. Channel names on the
 * live server are company-specific, so the copy names channels by purpose
 * ("your company's challenge channel"), never by an exact name.
 */

export const DISCORD_INVITE = GUIDE_LINKS.discord;

export type DiscordAudience = "challenge-partners" | "partners";

/** Before arriving in Turku — the same for every partner. */
export const DISCORD_CHECKLIST: readonly string[] = [
  "Join the Since AI Discord",
  "Verify your Discord account (email)",
  "Set a recognisable display name: First name | Company",
  "Confirm your company role and access",
  "Check your company and partner channels",
  "Turn on notifications on at least one onsite representative’s phone",
];

/** First time on Discord: the whole setup, step by step. */
export function discordSetupSteps(example: string): string[] {
  return [
    "Open Discord in your browser (discord.com), the desktop app or the mobile app.",
    "Create an account if you don’t have one yet.",
    "Verify your email address — Discord sends the link when you sign up.",
    `Set your display name as First name | Company, for example “${example}”, so builders and organisers know who you are.`,
    "Join the Since AI Discord with the invite link above.",
    "During onboarding, choose the company / challenge partner representative option where it is offered.",
    "The Since AI team then assigns your company or partner role.",
    "Once the role is in place, your company and partner channels appear in your channel list.",
    "Access missing or wrong? Tell the Since AI team in the partner help / check-in channel, or email info@sinceai.fi.",
  ];
}

export interface DiscordRoleGuide {
  title: string;
  points: readonly string[];
  /** Notification settings, channel → level. */
  notifications: readonly { where: string; level: string }[];
}

const NO_MASS_PINGS =
  "Please don’t use @everyone or @here. If something truly has to reach the whole server, ask the Since AI team to post it.";

export const DISCORD_ROLE_GUIDES: Record<DiscordAudience, DiscordRoleGuide> = {
  "challenge-partners": {
    title: "Your challenge channel",
    points: [
      "Your company’s challenge channel is where teams ask about your challenge — the primary place for their questions during the hackathon. Keep it monitored throughout the event.",
      "Answer in the channel where you can, so every team gets the same information. Use Reply or a thread for longer back-and-forth.",
      "Share and pin the key material there: challenge documents, APIs, datasets and a short FAQ.",
      "Coordination with the Since AI team happens in a private company / partner area, where one is set up for you.",
      "Urgent operational updates and schedule changes reach you on Discord.",
      NO_MASS_PINGS,
    ],
    notifications: [
      { where: "Your company’s challenge channel", level: "All Messages" },
      { where: "The rest of the server", level: "Only @mentions is fine" },
    ],
  },
  partners: {
    title: "Your partner channel",
    points: [
      "Your company has its own partner channel on the Since AI Discord, where builders ask about your technology — APIs, developer credits, tooling and technical support. Keep it monitored throughout the event.",
      "Answer in the channel where you can, so every builder gets the same information. Use Reply or a thread for longer back-and-forth.",
      "Share and pin the key material there: docs, how to get API access and credits, examples and a short FAQ.",
      "Post when your representatives are at your stand — and any technical session, workshop or office hours you run.",
      "Stand, setup and onsite logistics questions go to the Since AI team in your private company / partner area.",
      "Urgent event announcements and schedule changes reach you on Discord.",
      NO_MASS_PINGS,
    ],
    notifications: [
      { where: "Your company’s partner channel", level: "All Messages" },
      { where: "The rest of the server", level: "Only @mentions is fine" },
    ],
  },
};
