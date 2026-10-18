import { GUIDE_BASE_PATH, GUIDE_LINKS } from "./facts";

/**
 * Partner onboarding to the Since AI Discord — the main channel between partner
 * representatives and the organisers during the hackathon. Channel names on the
 * live server are company-specific, so the copy names channels by purpose
 * ("your company's challenge channel"), never by an exact name.
 */

export const DISCORD_INVITE = GUIDE_LINKS.discord;

/** The step-by-step Discord Guide page. */
export const DISCORD_GUIDE_PATH = `${GUIDE_BASE_PATH}/discord`;

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

/**
 * The Discord Guide page (`/discord`): written for people who have never used
 * Discord. Facts about the live server (checked through its public invite,
 * 18 Oct 2026): the invite never expires and opens #start-here; the server
 * has onboarding questions and a rules screen, and its "Medium" verification
 * level lets an account post once its email is verified and it is at least
 * five minutes old. Discord's own labels are quoted exactly (bold in the UI).
 */
export const DISCORD_GUIDE = {
  name: "Discord Guide",
  navLabel: "Discord",
  lede: "Discord is a free chat app, much like Microsoft Teams or Slack. During the hackathon, it is where teams ask you questions and where the Since AI team reaches you. Setting it up takes about ten minutes.",
  metaDescription:
    "Since AI Hackathon 2026 Discord Guide: join the Since AI Discord step by step with pictures — account, email, nickname, your company channel, notifications and the phone app.",
} as const;

export const DISCORD_DOWNLOADS = {
  desktop: "https://discord.com/download",
  ios: "https://apps.apple.com/app/discord/id985746746",
  android: "https://play.google.com/store/apps/details?id=com.discord",
} as const;

/** Discord words, explained with the tools people already know. */
export const DISCORD_GLOSSARY: readonly { term: string; meaning: string }[] = [
  { term: "Server", meaning: "The Since AI community on Discord — like a Teams or Slack workspace." },
  { term: "Channel", meaning: "A room for one topic, such as your company's channel. Channel names start with #." },
  { term: "Thread", meaning: "A side conversation under one message. It keeps the channel tidy." },
  { term: "@mention", meaning: "Type @ and a name to notify that person, just like in Teams." },
  { term: "Direct message", meaning: "A private one-to-one chat." },
  { term: "Role", meaning: "Your access. Your company role opens your company's channels." },
];

export type DiscordIllustration = "invite" | "account" | "email" | "welcome" | "nickname" | "channels";

export interface DiscordStep {
  id: string;
  title: string;
  /** Plain-language instructions; `**Label**` marks Discord's own button labels. */
  text: string;
  tip?: string;
  illustration: DiscordIllustration;
}

/** Joining, from the invite link to your company channels. */
export function discordSteps(example: string): DiscordStep[] {
  return [
    {
      id: "invite",
      title: "Open the Since AI invite",
      text: "Click **Join the Since AI Discord** on this page. The invite opens in your web browser — you don't need to install anything. Click **Accept Invite**.",
      tip: "Prefer an app? Discord also has free apps for computers and phones.",
      illustration: "invite",
    },
    {
      id: "account",
      title: "Create your free account",
      text: "Discord asks for your email, a display name, a username, a password and your date of birth. Use your work email, then click **Continue**.",
      tip: "Already have a Discord account? Click **Log In** instead and use it.",
      illustration: "account",
    },
    {
      id: "email",
      title: "Confirm your email",
      text: "Open the email from Discord and click **Verify Email**. You can't write messages until your email is confirmed.",
      tip: "No email after a few minutes? Check your spam folder.",
      illustration: "email",
    },
    {
      id: "welcome",
      title: "Answer the welcome questions",
      text: "The Since AI server asks a few short questions when you join. Choose the company or partner representative option where it is offered, then read the server rules and accept them.",
      illustration: "welcome",
    },
    {
      id: "nickname",
      title: "Show your name and company",
      text: `Click **Since AI** at the top of the channel list and choose **Edit Server Profile**. Set your nickname to First name | Company — for example “${example}” — and click **Save Changes**.`,
      tip: "Your nickname applies only in the Since AI server. Your Discord account elsewhere stays as it is.",
      illustration: "nickname",
    },
    {
      id: "channels",
      title: "Find your company channel",
      text: "The Since AI team gives your account your company role. Your company's channels then appear in the channel list on the left. Click a channel to open it.",
      tip: "Channels still missing a day before you travel? Tell us — see Help below.",
      illustration: "channels",
    },
  ];
}

/** Turning on notifications for the channel that matters. */
export const DISCORD_NOTIFICATION_STEPS: readonly string[] = [
  "Right-click your company's channel (on a phone: press and hold it).",
  "Choose **Notification Settings**.",
  "Select **All Messages**.",
];

export const DISCORD_PHONE_STEPS: readonly string[] = [
  "Install Discord from the App Store or Google Play — it is free.",
  "Log in with the same email and password.",
  "When your phone asks, allow notifications.",
];

/** Common problems for first-time users, in the order people hit them. */
export const DISCORD_TROUBLESHOOTING: readonly { q: string; a: string }[] = [
  {
    q: "The confirmation email didn't arrive",
    a: "Check your spam or junk folder. In Discord, the banner at the top of the window has a link to resend the email. Still nothing? Make sure the email address in your account is spelled correctly.",
  },
  {
    q: "I can't type in a channel",
    a: "For everyone's safety, the Since AI server lets an account post once its email is confirmed and it is at least five minutes old. Also check that you answered the welcome questions and accepted the server rules.",
  },
  {
    q: "I can't see my company's channel",
    a: "Your company role is not in place yet. The Since AI team assigns it — tell us if it's missing (see Help below).",
  },
  {
    q: "Discord is blocked on my work laptop or network",
    a: "This is common on corporate networks. Use the Discord app on your phone (on mobile data), or ask your IT team to allow discord.com.",
  },
  {
    q: "I already have a personal Discord account",
    a: "You can use it. Set your nickname for the Since AI server only (Edit Server Profile) — nothing changes in your other servers.",
  },
  {
    q: "Can other people see my email or date of birth?",
    a: "No. Other members see only your display name, nickname and profile picture. Discord asks for your date of birth to meet age rules; it is not shown to anyone.",
  },
  {
    q: "Do I need to pay for anything?",
    a: "No. Discord is free. You can ignore any offers for Discord Nitro, its paid upgrade.",
  },
  {
    q: "I forgot my password",
    a: "On the Discord login screen, click “Forgot your password?” and follow the email.",
  },
];

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
