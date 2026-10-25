import { COMPUTING, COMPUTING_HREF } from "./computing";
import { GUIDE_BASE_PATH, GUIDE_LINKS } from "./facts";

/**
 * Builder Resources — tools, computing and partner benefits for Since AI Hackathon 2026.
 *
 * Only what is verified is published (organiser and partners, 25–26 Oct 2026):
 *
 * - CSC / LUMI AI Factory: confirmed compute partner — public facts in ./computing.
 * - Pruna AI: confirmed technology partner. Its public onepager (checked 26 Oct
 *   2026) says every team shares one hackathon API key, added to that page on
 *   Friday 6 November, and that the Pruna team helps in the Pruna channel on the
 *   Since AI Discord. Credit amounts and prizes are Pruna's to state; not repeated.
 * - ElevenLabs: one free month of the Creator plan, redeemed through
 *   ElevenLabs' own Discord bot (its Hacker Guide, checked 26 Oct 2026). The
 *   bot's activation for this event is NOT yet confirmed.
 * - Featherless AI: confirmed inference sponsor — $25 of credit, no credit
 *   card. Featherless requires its redemption instructions to reach
 *   participants only 1–2 days before the event and never on a public page:
 *   no code, link, QR code or PDF of it belongs in this repository. Since AI
 *   sends them separately on 4–5 November 2026.
 * - Aiven: organisation-level technology partner; no event-specific benefit
 *   or on-site presence is confirmed — public documentation only.
 * - Lovable, n8n, Gemini API: tools anyone can use; no confirmed event
 *   benefit, so they are listed as tools, not as event sponsors.
 *
 * `__tests__/resources.test.ts` guards the restrictions.
 */

export const RESOURCES_PATH = `${GUIDE_BASE_PATH}/resources`;

export const RESOURCES_GUIDE = {
  name: "Builder Resources",
  navLabel: "Resources",
  lede: "Computing, models and partner tools for your build — what each one does, whether there is event access, where your instructions are and who can help.",
  metaDescription:
    "Since AI Hackathon 2026 Builder Resources: CSC / LUMI AI Factory computing, Pruna AI, ElevenLabs and Featherless AI for builders — access, deadlines, quickstarts and help.",
} as const;

export type AccessState = "ready" | "scheduled" | "pending" | "closing";
export type HelpKind = "on-site" | "online" | "external" | "docs-only";

export interface ResourceLink {
  label: string;
  href: string;
}

export interface BuilderResource {
  id: string;
  name: string;
  logo: { src: string; width: number; height: number };
  /** What it is, in one sentence. */
  what: string;
  /** Hackathon uses, short. */
  useCases: readonly string[];
  access: {
    state: AccessState;
    /** Short status label for the card's tag. */
    label: string;
    text: string;
  };
  /** Where an eligible builder finds the instructions. */
  instructions: string;
  help: { kind: HelpKind; text: string };
  quickstart: ResourceLink;
  docs: ResourceLink;
  more?: readonly ResourceLink[];
}

export const HELP_LABEL: Record<HelpKind, string> = {
  "on-site": "On site",
  online: "Online",
  external: "Partner's own channels",
  "docs-only": "Documentation",
};

/** Event resources: a confirmed partner and something builders can use at this hackathon. */
export const EVENT_RESOURCES: readonly BuilderResource[] = [
  {
    id: "csc-lumi",
    name: "CSC / LUMI AI Factory",
    logo: { src: "/assets/sponsors/Lumi.svg", width: 1815, height: 337 },
    what: "The LUMI supercomputer's GPUs and the Aitta inference service — open AI models through a web interface and an OpenAI-compatible API.",
    useCases: ["Fine-tuning or training a model", "Running open models at scale", "Heavy data processing"],
    access: {
      state: "closing",
      label: `Register by ${COMPUTING.deadlineShort}`,
      text: `Optional, for eligible participants: register by ${COMPUTING.deadlineLabel}. Approval and activation can take several days, and nobody can newly join after the deadline.`,
    },
    instructions:
      "In your Since AI acceptance or welcome email, or the email of 25 October with “SUPERCOMPUTER” in the subject. The joining instructions are private.",
    help: { kind: "on-site", text: "LUMI AI Factory experts are on site during the hackathon." },
    quickstart: { label: "LUMI AI Factory onboarding", href: "https://lumi-ai-factory.github.io/LUMI_AIF_Onboarding/" },
    docs: { label: "LUMI documentation", href: "https://docs.lumi-supercomputer.eu/" },
    more: [
      { label: "Aitta", href: "https://aitta.csc.fi/" },
      { label: "Eligibility and deadline", href: COMPUTING_HREF },
    ],
  },
  {
    id: "pruna-ai",
    name: "Pruna AI",
    logo: { src: "/assets/sponsors/Pruna.svg", width: 608, height: 181 },
    what: "Fast image and video generation and editing models behind one API — most images come back in about a second.",
    useCases: ["Product visuals and UI assets", "Image editing and try-on", "Short video clips and talking avatars"],
    access: {
      state: "scheduled",
      label: "Shared key Fri 6 Nov",
      text: "Pruna covers usage with one shared hackathon API key — no sign-up or billing. Pruna adds the key to its onepager on Friday 6 November. Keep it in your backend, never in browser or mobile code.",
    },
    instructions: "Pruna's onepager for this hackathon: models, a two-minute quickstart and the fair-use rules for the shared key.",
    help: {
      kind: "online",
      text: "The Pruna team answers in the Pruna channel on the Since AI Discord during the hackathon; a Pruna stand is planned in BioCity's partner corner.",
    },
    quickstart: { label: "Building with Pruna at Since AI", href: "https://pruna.notion.site/building-with-pruna-at-since-ai-hackathon" },
    docs: { label: "Pruna API docs", href: "https://docs.api.pruna.ai/guides/quickstart" },
    more: [{ label: "All models", href: "https://www.pruna.ai/all-models" }],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    logo: { src: "/assets/sponsors/elevenlabs.png", width: 480, height: 62 },
    what: "Voice AI: text to speech and speech to text in 32 languages, music and sound effects, dubbing, and conversational voice agents.",
    useCases: ["Voice interfaces and agents", "Narration and accessibility", "Transcribing meetings or calls"],
    access: {
      state: "pending",
      label: "Activation pending",
      text: "One free month of the Creator plan, redeemed through ElevenLabs' own Discord bot. The bot is not yet confirmed as active for Since AI Hackathon 2026 — the free plan works meanwhile.",
    },
    instructions:
      "ElevenLabs' Hacker Guide: products, quickstarts and the redemption steps. Its optional Showcase is ElevenLabs' own — your official submission is always in sinceai.app.",
    help: { kind: "external", text: "#hackathon-support in ElevenLabs' Discord, where its moderators help with products and redemption." },
    quickstart: {
      label: "ElevenLabs Hacker Guide",
      href: "https://docs.google.com/document/d/1mCh5MtOzBw0aJpurQVUmIVFfPMAHW3MjNemE-LNiMto/edit?usp=sharing",
    },
    docs: { label: "ElevenLabs docs", href: "https://elevenlabs.io/docs/quickstart" },
  },
  {
    id: "featherless",
    name: "Featherless AI",
    logo: { src: "/assets/sponsors/featherless.svg", width: 790, height: 137 },
    what: "Serverless inference for a growing library of open-weight models — Qwen, Llama, Mistral, DeepSeek and more — through an OpenAI-style API, plus text to speech.",
    useCases: ["Trying many open models quickly", "LLM features without your own GPUs", "Swapping models behind one API"],
    access: {
      state: "scheduled",
      label: "Instructions 4–5 Nov",
      text: "$25 of inference credit for eligible participants, no credit card needed, while the event's redemptions last. Since AI sends the redemption instructions separately on 4–5 November — they are never published on this website.",
    },
    instructions: "Sent to eligible participants by Since AI on 4–5 November. Until then, the public docs show how the API works.",
    help: { kind: "docs-only", text: "Featherless' public documentation; no event-specific support is confirmed." },
    quickstart: { label: "Featherless quickstart", href: "https://featherless.ai/docs/quickstart-guide" },
    docs: { label: "Featherless docs", href: "https://featherless.ai/docs/overview" },
  },
];

export interface ToolLink {
  name: string;
  logo?: { src: string; width: number; height: number };
  text: string;
  docs: ResourceLink;
}

/** A technology partner with public documentation and no confirmed event benefit. */
export const PARTNER_DOCS: readonly ToolLink[] = [
  {
    name: "Aiven",
    logo: { src: "/assets/sponsors/aiven.png", width: 480, height: 160 },
    text: "Managed open-source data services — PostgreSQL, Kafka, Valkey, OpenSearch and more — when your project needs a real database or stream. No event-specific benefit.",
    docs: { label: "Aiven: get started", href: "https://aiven.io/docs/get-started" },
  },
];

/** Tools anyone may use; listed for convenience, not as event sponsors. */
export const OTHER_TOOLS: readonly ToolLink[] = [
  {
    name: "Lovable",
    text: "Build web apps from a prompt.",
    docs: { label: "Lovable docs", href: "https://docs.lovable.dev/" },
  },
  {
    name: "n8n",
    text: "Workflow automation with AI nodes.",
    docs: { label: "n8n docs", href: "https://docs.n8n.io/" },
  },
  {
    name: "Gemini API",
    text: "Google's models through an API. MLH runs a Best Use of Gemini API prize category — the submission form asks for your project number.",
    docs: { label: "Gemini API docs", href: "https://ai.google.dev/gemini-api/docs" },
  },
];

export const RESOURCES_NOTES = {
  anyTool:
    "Any AI tool is welcome — these are resources with something extra for this event, not a list of permitted tools.",
  security:
    "Keep keys and credits to yourself: never commit them, never put them in browser code, and never share them outside your team.",
  discord: GUIDE_LINKS.discord,
} as const;
