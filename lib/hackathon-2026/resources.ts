import { COMPUTING_HREF } from "./computing";
import { GUIDE_BASE_PATH } from "./facts";

/**
 * Builder Resources — technology partners, tools and participant benefits for
 * Since AI Hackathon 2026. The one place to add or change a resource.
 *
 * Evergreen by design: the page says what exists, why it is useful, where to
 * start, where event-specific access details are communicated and where to get
 * help. Restricted coupons, keys and redemption steps are never published here —
 * they reach participants through official Since AI participant messages and
 * designated event channels, so this file does not change when a coupon arrives.
 *
 * Verified with the organiser (26 Oct 2026):
 * - CSC / LUMI AI Factory: compute partner; private instructions already sent.
 * - Red Hat: technology partner; the Developer Sandbox is free for 30 days
 *   (developers.redhat.com/developer-sandbox, checked 26 Oct 2026). No booth:
 *   remote support Fri–Sat (Red Hat, 21 Oct 2026). Nothing beyond the sandbox
 *   and public docs is published until the organiser confirms it.
 * - FIWARE: technology partner and provider of the FIWARE Open Innovation
 *   Award; its Builder Pack (Oct 2026) grants publication of its technical
 *   resources — see awards.ts. Red Hat's OpenShift AI Technology Award and the
 *   seven MLH categories are there too.
 * - Aiven: organisation-level technology partner; no event-specific benefit.
 * - Pruna AI: shared hackathon API key and help on Discord (Pruna's public
 *   onepager). The key is never reproduced here.
 * - Featherless AI: $25 inference credit, up to 1,200 redemptions, no card;
 *   private instructions only, never public.
 * - ElevenLabs: one free month of Creator through ElevenLabs' own Discord
 *   process; its Showcase is separate from the official submission. No other
 *   ElevenLabs prize is published until its arrangements are confirmed.
 * - Lovable: 100 credits per participant (Lovable Community Team, 23 Apr 2026).
 *   Its community playbook is for event hosts only and is not linked.
 * - n8n: 200 n8n Cloud Pro licences, one month each (n8n, 10 Mar 2026).
 * - Google Cloud promotional credits for this event were revoked (20 May 2026);
 *   Gemini and Google Cloud appear as ordinary tools only. "Best Use of Gemini
 *   API" is an MLH prize category (MLH swag kits), not Google credits.
 *
 * `__tests__/resources.test.ts` guards these rules.
 */

export const RESOURCES_PATH = `${GUIDE_BASE_PATH}/resources`;

export const RESOURCES_GUIDE = {
  name: "Builder Resources",
  navLabel: "Resources",
  lede: "Explore the technologies available for your build. Since AI works with technology partners to provide computing resources, development tools, learning materials and selected participant benefits — and you can win optional awards with the same project.",
  metaDescription:
    "Since AI Hackathon 2026 Builder Resources: computing, AI models, app builders, FIWARE and developer tools — quickstarts, participant benefits, optional MLH, Red Hat and FIWARE awards and where to get help.",
} as const;

/** Shown under the hero: how access works, and the freedom to choose tools. */
export const RESOURCES_INTRO = {
  start:
    "Start with the public quickstarts below. Event-specific access details — limited credits, coupons and redemption steps — are shared through official Since AI participant messages and designated event channels when available.",
  freedom:
    "You are free to use the AI tools and development platforms that fit your project best. Always follow your challenge's rules, licences and data-security requirements.",
  security:
    "Keep keys, coupons and credits to yourself: never commit them, never put them in browser code and never share them outside your team.",
} as const;

/** The default access route for a benefit with restricted details. */
export const EVENT_ACCESS =
  "Access details are shared through official Since AI participant messages and designated event channels — never on this website.";

export type ResourceCategoryId = "computing" | "models" | "building" | "standards";

export const RESOURCE_CATEGORIES: readonly { id: ResourceCategoryId; title: string; lede: string }[] = [
  {
    id: "computing",
    title: "Computing & infrastructure",
    lede: "GPUs, cloud platforms and managed data services for heavier builds.",
  },
  {
    id: "models",
    title: "AI models & inference",
    lede: "Image, video, voice and open-weight language models behind simple APIs.",
  },
  {
    id: "building",
    title: "Application building & automation",
    lede: "Go from prompt to working app, and connect services, data and workflows.",
  },
  {
    id: "standards",
    title: "Open standards & context data",
    lede: "Open-source building blocks for real-world data — with an optional award of their own.",
  },
];

export interface ResourceLink {
  label: string;
  href: string;
}

export interface PartnerResource {
  id: string;
  name: string;
  logo: { src: string; width: number; height: number };
  category: ResourceCategoryId;
  /** The confirmed relationship, as agreed. */
  relationship: string;
  /** What it is, in one sentence. */
  description: string;
  /** What builders can make with it. */
  buildIdeas: readonly string[];
  /** The first place to go. */
  getStarted: ResourceLink;
  /** A partner-approved public onepager or guide, when there is one. */
  partnerGuide?: ResourceLink;
  docs?: ResourceLink;
  /** A confirmed participant benefit, described generally and with its limits. */
  benefit?: string;
  /** Where event-specific access details come from. */
  access: string;
  /** Where to get help. */
  help: string;
  /** The optional award this partner provides, shown as a link to the awards section. */
  award?: string;
}

export const PARTNER_RESOURCES: readonly PartnerResource[] = [
  // ── Computing & infrastructure ───────────────────────────────────────────
  {
    id: "csc-lumi",
    name: "CSC / LUMI AI Factory",
    logo: { src: "/assets/sponsors/Lumi.svg", width: 1815, height: 337 },
    category: "computing",
    relationship: "Compute partner",
    description:
      "The LUMI supercomputer's GPUs and the Aitta inference service — open AI models through a web interface and an OpenAI-compatible API.",
    buildIdeas: ["Fine-tune or train a model", "Run open models at scale", "Process large datasets"],
    getStarted: { label: "LUMI AI Factory onboarding", href: "https://lumi-ai-factory.github.io/LUMI_AIF_Onboarding/" },
    partnerGuide: { label: "Eligibility and deadline", href: COMPUTING_HREF },
    docs: { label: "LUMI documentation", href: "https://docs.lumi-supercomputer.eu/" },
    benefit: "Optional access for eligible participants who registered by Friday 30 October 2026.",
    access: "Registered participants received private instructions by email from Since AI.",
    help: "LUMI AI Factory experts are on site during the hackathon.",
  },
  {
    id: "red-hat",
    name: "Red Hat",
    logo: { src: "/assets/sponsors/red-hat.svg", width: 613, height: 145 },
    category: "computing",
    relationship: "Technology partner",
    description:
      "Red Hat OpenShift and OpenShift AI — a Kubernetes application platform with tools to build, serve and monitor AI models.",
    buildIdeas: ["Deploy your app and model together", "Serve a model behind an API", "Try a production-style setup"],
    getStarted: { label: "Developer Sandbox", href: "https://developers.redhat.com/developer-sandbox" },
    docs: { label: "Red Hat OpenShift AI", href: "https://www.redhat.com/en/products/ai/openshift-ai" },
    benefit:
      "The Developer Sandbox is free for 30 days for anyone. Set it up before the event, so your account and sandbox are ready when you start building.",
    access: "Self-service from Red Hat's Developer Sandbox page — no event code needed.",
    help: "Red Hat supports builders remotely during the event. Any session or office hours are announced in the event channels.",
    award: "Red Hat OpenShift AI Technology Award",
  },
  {
    id: "aiven",
    name: "Aiven",
    logo: { src: "/assets/sponsors/aiven.png", width: 480, height: 160 },
    category: "computing",
    relationship: "Technology partner",
    description: "Managed open-source data services — PostgreSQL, Kafka, Valkey, OpenSearch and more.",
    buildIdeas: ["A real database behind your demo", "Event streams between services", "Search over your data"],
    getStarted: { label: "Aiven: get started", href: "https://aiven.io/docs/get-started" },
    access: "Sign up on Aiven's own site; there is no event-specific benefit.",
    help: "Aiven's public documentation.",
  },

  // ── AI models & inference ────────────────────────────────────────────────
  {
    id: "pruna-ai",
    name: "Pruna AI",
    logo: { src: "/assets/sponsors/Pruna.svg", width: 608, height: 181 },
    category: "models",
    relationship: "Technology partner",
    description: "Fast image and video generation and editing models behind one API — most images come back in about a second.",
    buildIdeas: ["Product visuals and UI assets", "Image editing and virtual try-on", "Short video clips and talking avatars"],
    getStarted: { label: "Pruna API quickstart", href: "https://docs.api.pruna.ai/guides/quickstart" },
    partnerGuide: { label: "Building with Pruna at Since AI", href: "https://pruna.notion.site/building-with-pruna-at-since-ai-hackathon" },
    docs: { label: "All Pruna models", href: "https://www.pruna.ai/all-models" },
    benefit:
      "Pruna covers usage during the hackathon through a shared hackathon API key — use it from your backend only, never in browser or mobile code.",
    access: EVENT_ACCESS,
    help: "The Pruna team answers in the Pruna channel on the Since AI Discord; a Pruna stand is planned in BioCity's partner corner.",
  },
  {
    id: "featherless",
    name: "Featherless AI",
    logo: { src: "/assets/sponsors/featherless.svg", width: 790, height: 137 },
    category: "models",
    relationship: "Technology partner",
    description:
      "Serverless inference for a growing library of open-weight models — Qwen, Llama, Mistral, DeepSeek and more — through an OpenAI-style API, plus text to speech.",
    buildIdeas: ["Compare open models quickly", "Add LLM features without your own GPUs", "Swap models behind one API"],
    getStarted: { label: "Featherless quickstart", href: "https://featherless.ai/docs/quickstart-guide" },
    docs: { label: "Featherless docs", href: "https://featherless.ai/docs/overview" },
    benefit:
      "$25 of inference credit per eligible participant, no credit card needed, for a limited number of redemptions (up to 1,200).",
    access: EVENT_ACCESS,
    help: "Featherless' public documentation.",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    logo: { src: "/assets/sponsors/elevenlabs.png", width: 480, height: 62 },
    category: "models",
    relationship: "Technology partner",
    description:
      "Voice AI: text to speech and speech to text in 32 languages, music and sound effects, dubbing and conversational voice agents.",
    buildIdeas: ["Voice interfaces and agents", "Narration and accessibility", "Transcribing meetings or calls"],
    getStarted: { label: "ElevenLabs quickstart", href: "https://elevenlabs.io/docs/quickstart" },
    partnerGuide: {
      label: "ElevenLabs Hacker Guide",
      href: "https://docs.google.com/document/d/1mCh5MtOzBw0aJpurQVUmIVFfPMAHW3MjNemE-LNiMto/edit?usp=sharing",
    },
    benefit:
      "One free month of the Creator plan for participants, claimed through ElevenLabs' own Discord process. ElevenLabs' optional Showcase is separate from your official submission in sinceai.app.",
    access: `${EVENT_ACCESS} Claim the month once those details say the event's redemption is open.`,
    help: "#hackathon-support in ElevenLabs' Discord.",
  },

  // ── Application building & automation ────────────────────────────────────
  {
    id: "lovable",
    name: "Lovable",
    logo: { src: "/assets/sponsors/lovable.png", width: 480, height: 82 },
    category: "building",
    relationship: "Technology partner",
    description: "Build full-stack web apps by describing them in plain language, then refine the code.",
    buildIdeas: ["A working front end in minutes", "Internal tools and dashboards", "Clickable demos of your idea"],
    getStarted: { label: "Lovable docs", href: "https://docs.lovable.dev/introduction/welcome" },
    benefit: "100 Lovable credits per participant, shared as a coupon shortly before the event.",
    access: EVENT_ACCESS,
    help: "Lovable's documentation and in-product help.",
  },
  {
    id: "fiware",
    name: "FIWARE",
    logo: { src: "/assets/sponsors/FIWARE.png", width: 480, height: 115 },
    category: "standards",
    relationship: "Technology partner",
    description:
      "FIWARE Foundation is the independent, neutral guardian of NGSI-LD — the open standard for context data management — with open-source Generic Enablers, Smart Data Models and a European iHub network.",
    buildIdeas: ["Real-time context data for your app", "Digital twins of places or machines", "Sovereign AI on your own data"],
    getStarted: { label: "FIWARE builder resources", href: "#fiware" },
    docs: { label: "Step-by-step tutorials", href: "https://fiware-tutorials.readthedocs.io/en/latest/" },
    access: "Open source — free to use, no event code needed.",
    help: "Jason Fox, FIWARE's primary technical mentor, is on site all three days; FIWARE's mentors also answer on the Since AI Discord.",
    award: "FIWARE Open Innovation Award",
  },
  {
    id: "n8n",
    name: "n8n",
    logo: { src: "/assets/sponsors/n8n.svg", width: 576, height: 160 },
    category: "building",
    relationship: "Technology partner",
    description: "Workflow automation with AI agent and LLM nodes — connect APIs, databases and models without glue code.",
    buildIdeas: ["AI agents that call your tools", "Automated data pipelines", "Connect your app to chat, email or sheets"],
    getStarted: { label: "n8n docs", href: "https://docs.n8n.io/" },
    partnerGuide: { label: "How to redeem an n8n voucher", href: "https://n8n.notion.site/voucher-code" },
    benefit: "One month of n8n Cloud Pro per redemption, limited to 200 redemptions.",
    access: EVENT_ACCESS,
    help: "n8n's documentation and community forum.",
  },
];

export interface ToolLink {
  name: string;
  text: string;
  href: string;
}

/** Popular tools anyone may use. Not partners, no event benefits — free tiers and pricing are the provider's. */
export const DEVELOPER_TOOLS: readonly ToolLink[] = [
  { name: "GitHub", text: "Repositories, Copilot and Actions.", href: "https://docs.github.com/en/get-started" },
  { name: "Cursor", text: "AI code editor.", href: "https://cursor.com/docs" },
  { name: "Claude", text: "Claude and Claude Code.", href: "https://code.claude.com/docs/en/overview" },
  { name: "ChatGPT & OpenAI API", text: "OpenAI's models and API.", href: "https://developers.openai.com/api/docs" },
  { name: "Gemini API", text: "Google's Gemini models through an API.", href: "https://ai.google.dev/gemini-api/docs" },
  { name: "Google Cloud", text: "Cloud infrastructure and AI services.", href: "https://docs.cloud.google.com/docs" },
];

export const DEVELOPER_TOOLS_NOTE =
  "Popular tools you are free to use. They are not event partners and come with no event credits — free tiers and pricing are set by each provider.";

/** The MLH relationship; its seven prize categories are in awards.ts. */
export const MLH_NOTE =
  "Since AI Hackathon 2026 is an official Major League Hacking 2027 Season Member Event. MLH introduces its tools, sponsor technologies and award categories at 16:50 on Friday, at Taidon portaat — the seven MLH categories are under Optional awards on this page.";

export const resourcesIn = (category: ResourceCategoryId) => PARTNER_RESOURCES.filter((r) => r.category === category);
