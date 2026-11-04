import { MLH_AWARDS, type MlhAward } from "./awards";
import { PARTNER_RESOURCES, type PartnerResource } from "./resources";
import { WORKSHOPS } from "./workshops";

/**
 * AI Tools & Resources — the one directory of everything a builder can use,
 * organised by what they want to do (organiser, 4 Nov 2026). It adds the
 * order, the one-line summaries, the access labels and the buttons; every
 * benefit, limit and access route still comes from its one source:
 *
 * - Since AI's technology partners → PARTNER_RESOURCES (resources.ts)
 * - MLH's eight sponsor technologies → MLH_AWARDS (awards.ts), shown here as
 *   tools with "Benefit provided through Major League Hacking (MLH)"; their
 *   prize categories are listed separately, after the tools.
 * - Everything else is a public tool anyone may use, with no event credits.
 *
 * Public terms checked on the providers' own pages, 4 Nov 2026:
 * - GitHub Copilot: a Free plan (2,000 completions a month, limited chat and
 *   agent use) and a free Copilot Student plan for verified students
 *   (github.com/features/copilot/plans).
 * - Claude: a Free plan; Claude Code is not in it — it needs a paid plan or an
 *   Anthropic Console account (claude.com/pricing, code.claude.com).
 * - Cursor: a Free plan with limited AI usage; no student plan is stated
 *   (cursor.com/pricing, cursor.com/students).
 * - Lovable: a free plan with daily build credits (lovable.dev/pricing).
 * - Gemini API / Google AI Studio: a free tier for some models, with limits
 *   (aistudio.google.com/docs/pricing).
 * None of these providers (GitHub, Google, Anthropic, Cursor, OpenAI) is a
 * Since AI sponsor; listing a tool is not a partnership claim.
 *
 * Marks for the tools without a local logo are from Simple Icons 16.36.0
 * (CC0-1.0), recoloured for the dark page; the trademarks are their owners'.
 */

export type ToolCategoryId = "coding" | "models" | "cloud" | "advanced";

export const TOOL_CATEGORIES: readonly {
  id: ToolCategoryId;
  title: string;
  lede: string;
  /** Anchors of the sections this one replaced, kept so old links still land here. */
  formerAnchors: readonly string[];
}[] = [
  {
    id: "coding",
    title: "AI coding & app building",
    lede: "Write code with an AI assistant, or describe an app and let AI build it.",
    formerAnchors: ["building", "tools"],
  },
  {
    id: "models",
    title: "AI models & APIs",
    lede: "Add language, voice, image and video AI to your project through an API.",
    formerAnchors: [],
  },
  {
    id: "cloud",
    title: "Cloud, data & deployment",
    lede: "Host your app, store your data and run your model.",
    formerAnchors: ["computing"],
  },
  {
    id: "advanced",
    title: "Advanced computing & specialised tools",
    lede: "Supercomputer GPUs, open standards for real-world data, Web3 and AI coding workflows.",
    formerAnchors: ["standards"],
  },
];

/**
 * How a tool is available, from the participant's point of view. Each one is
 * a different promise, so each gets its own label.
 */
export type AccessKind =
  | "free-plan" // the provider's public free plan or free tier
  | "student" // a student offer, subject to the provider's verification
  | "event" // a Since AI participant benefit
  | "mlh" // a benefit supplied through MLH
  | "limited" // limited redemptions or promotional credit
  | "trial" // a trial
  | "preregistered" // access only for those who registered in advance
  | "open-source" // free to use, open source
  | "paid"; // a paid tool, no event credits

export const ACCESS_LABEL: Record<AccessKind, string> = {
  "free-plan": "Free plan",
  student: "Student offer",
  event: "Since AI benefit",
  mlh: "Via MLH",
  limited: "Limited",
  trial: "Trial",
  preregistered: "Pre-registered only",
  "open-source": "Open source",
  paid: "Paid plans",
};

export interface ToolLogo {
  src: string;
  width: number;
  height: number;
  /** A square mark shown beside the name; otherwise a wordmark that already spells it. */
  mark?: boolean;
}

export interface AiTool {
  id: string;
  name: string;
  logo?: ToolLogo;
  category: ToolCategoryId;
  /** One of the six at the top of the page. */
  featured?: boolean;
  /** What it is — one sentence. */
  summary: string;
  /** What you get, in a few words, with its condition — shown on the card. */
  access: readonly { kind: AccessKind; text: string }[];
  /** The one obvious button. */
  cta: { label: string; href: string };
  /** A second link, only when it genuinely helps. */
  setup?: { label: string; href: string };
  /** Since AI technology partner whose benefit, access route and help this card shows. */
  partnerId?: string;
  /** MLH sponsor technology whose free offers and first steps this card shows. */
  mlhAwardId?: string;
  /** A workshop that sets it up (workshops.ts), never required. */
  workshopId?: string;
  /** Extra plain facts for the details, e.g. a provider's own student route. */
  more?: readonly string[];
}

const mark = (slug: string): ToolLogo => ({ src: `/assets/guide/tools/${slug}.svg`, width: 24, height: 24, mark: true });

/** The order inside each category is the order a typical first-time builder would try them. */
export const AI_TOOLS: readonly AiTool[] = [
  // ── AI coding & app building ──────────────────────────────────────────────
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    logo: mark("githubcopilot"),
    category: "coding",
    featured: true,
    summary: "Get AI coding assistance inside your editor.",
    access: [
      { kind: "free-plan", text: "Free plan with monthly limits" },
      { kind: "student", text: "Copilot Student free for verified students" },
    ],
    cta: { label: "Get GitHub Copilot", href: "https://github.com/features/copilot/plans" },
    setup: { label: "Students: GitHub Student Developer Pack", href: "https://mlh.link/github" },
    workshopId: "mlh-github-copilot",
    more: [
      "GitHub's Free plan includes 2,000 code completions a month and limited chat and agent use.",
      "Verified students get the Copilot Student plan free — GitHub decides who is eligible. MLH's link starts you on the GitHub Student Developer Pack.",
    ],
  },
  {
    id: "claude",
    name: "Claude & Claude Code",
    logo: mark("claude"),
    category: "coding",
    featured: true,
    summary: "Chat with Claude, or let Claude Code write and change code in your project.",
    access: [
      { kind: "free-plan", text: "Free Claude plan" },
      { kind: "paid", text: "Claude Code needs a paid plan or API credit" },
    ],
    cta: { label: "Get started with Claude", href: "https://claude.ai" },
    setup: { label: "Claude Code docs", href: "https://code.claude.com/docs/en/overview" },
    more: ["Anthropic's Free plan does not include Claude Code; Pro and higher plans, or an Anthropic Console account, do. No event credits."],
  },
  {
    id: "cursor",
    name: "Cursor",
    logo: mark("cursor"),
    category: "coding",
    featured: true,
    summary: "A code editor built around AI: ask for changes and review them in place.",
    access: [
      { kind: "free-plan", text: "Free plan with limited AI use" },
      { kind: "paid", text: "Paid plans for more" },
    ],
    cta: { label: "Get Cursor", href: "https://cursor.com" },
    setup: { label: "Cursor docs", href: "https://cursor.com/docs" },
    more: ["No event credits. Cursor's pricing page lists its current plans."],
  },
  {
    id: "lovable",
    name: "Lovable",
    category: "coding",
    featured: true,
    partnerId: "lovable",
    summary: "Describe an app in plain language and get a working full-stack web app.",
    access: [
      { kind: "event", text: "100 credits per participant" },
      { kind: "free-plan", text: "Free plan with daily credits" },
    ],
    cta: { label: "Get started with Lovable", href: "https://lovable.dev" },
    setup: { label: "Lovable docs", href: "https://docs.lovable.dev/introduction/welcome" },
  },
  {
    id: "n8n",
    name: "n8n",
    category: "coding",
    partnerId: "n8n",
    summary: "Automate workflows with AI agents that call your APIs, data and tools.",
    access: [{ kind: "limited", text: "1 month of Cloud Pro · 200 redemptions" }],
    cta: { label: "Get started with n8n", href: "https://docs.n8n.io/" },
    setup: { label: "How to redeem", href: "https://n8n.notion.site/voucher-code" },
  },
  {
    id: "entire",
    name: "Entire",
    category: "coding",
    mlhAwardId: "mlh-entire",
    summary: "A Git forge built for AI agents and people working on the same code.",
    access: [{ kind: "mlh", text: "Free account" }],
    cta: { label: "Sign up for Entire", href: "https://mlh.link/entire-signup" },
    setup: { label: "Entire quickstart", href: "https://mlh.link/entire-quickstart" },
  },

  // ── AI models & APIs ─────────────────────────────────────────────────────
  {
    id: "gemini",
    name: "Google Gemini & AI Studio",
    logo: mark("googlegemini"),
    category: "models",
    featured: true,
    mlhAwardId: "mlh-gemini",
    summary: "Try Google's Gemini models in your browser, then call them from your app with an API key.",
    access: [
      { kind: "free-plan", text: "Free tier for some models, with limits" },
      { kind: "student", text: "Google student offers" },
    ],
    cta: { label: "Open Google AI Studio", href: "https://mlh.link/gemini-aistudio" },
    setup: { label: "Your first API request", href: "https://mlh.link/gemini-quickstart" },
    workshopId: "mlh-google-ai-studio",
  },
  {
    id: "openai",
    name: "ChatGPT & OpenAI API",
    logo: mark("openai"),
    category: "models",
    summary: "OpenAI's models in ChatGPT and through the OpenAI API.",
    access: [{ kind: "paid", text: "Provider pricing · no event credits" }],
    cta: { label: "OpenAI API docs", href: "https://developers.openai.com/api/docs" },
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    category: "models",
    partnerId: "elevenlabs",
    mlhAwardId: "mlh-elevenlabs",
    summary: "Voice AI: text to speech, speech to text, dubbing and voice agents.",
    access: [{ kind: "event", text: "1 free month of Creator" }],
    cta: { label: "Get started with ElevenLabs", href: "https://elevenlabs.io/docs/quickstart" },
  },
  {
    id: "featherless",
    name: "Featherless AI",
    category: "models",
    partnerId: "featherless",
    summary: "Open-weight models — Qwen, Llama, Mistral, DeepSeek and more — through one OpenAI-style API.",
    access: [{ kind: "limited", text: "$25 credit · up to 1,200 redemptions" }],
    cta: { label: "Get started with Featherless", href: "https://featherless.ai/docs/quickstart-guide" },
  },
  {
    id: "pruna-ai",
    name: "Pruna AI",
    category: "models",
    partnerId: "pruna-ai",
    summary: "Fast image and video generation and editing behind one API.",
    access: [{ kind: "event", text: "Shared hackathon API key" }],
    cta: { label: "Get started with Pruna", href: "https://docs.api.pruna.ai/guides/quickstart" },
    setup: { label: "Building with Pruna at Since AI", href: "https://pruna.notion.site/building-with-pruna-at-since-ai-hackathon" },
  },

  // ── Cloud, data & deployment ─────────────────────────────────────────────
  {
    id: "google-cloud",
    name: "Google Cloud",
    logo: mark("googlecloud"),
    category: "cloud",
    featured: true,
    summary: "Run your app, your data and AI services on Google's cloud.",
    access: [
      { kind: "trial", text: "Free trial for new accounts" },
      { kind: "student", text: "Student credits from Google" },
    ],
    cta: { label: "Get started with Google Cloud", href: "https://docs.cloud.google.com/docs" },
    setup: { label: "Free trial terms", href: "https://docs.cloud.google.com/free/docs/free-cloud-features#free-trial" },
    more: [
      "Google's own public offers: Google decides who qualifies. Since AI has no Google credits of its own for this event — the student and new-account offers are listed under Google Gemini & AI Studio.",
    ],
  },
  {
    id: "red-hat",
    name: "Red Hat OpenShift",
    category: "cloud",
    partnerId: "red-hat",
    summary: "Deploy your app and serve your model on Kubernetes with OpenShift and OpenShift AI.",
    access: [{ kind: "trial", text: "Developer Sandbox free for 30 days" }],
    cta: { label: "Get the Developer Sandbox", href: "https://developers.redhat.com/developer-sandbox" },
    setup: { label: "Red Hat OpenShift AI", href: "https://www.redhat.com/en/products/ai/openshift-ai" },
  },
  {
    id: "mongodb-atlas",
    name: "MongoDB Atlas",
    logo: mark("mongodb"),
    category: "cloud",
    mlhAwardId: "mlh-mongodb-atlas",
    summary: "A managed database in the cloud, with vector search for AI apps.",
    access: [
      { kind: "mlh", text: "Free forever tier" },
      { kind: "student", text: "$50 credit for students" },
    ],
    cta: { label: "Get MongoDB Atlas free", href: "https://mlh.link/mongodb-free" },
  },
  {
    id: "snowflake",
    name: "Snowflake",
    logo: mark("snowflake"),
    category: "cloud",
    mlhAwardId: "mlh-snowflake",
    summary: "Use leading LLMs on your data through the Snowflake APIs.",
    access: [{ kind: "mlh", text: "120-day free trial" }],
    cta: { label: "Start the Snowflake trial", href: "https://mlh.link/snowflake-signup" },
  },
  {
    id: "tiger-data",
    name: "Tiger Data",
    category: "cloud",
    mlhAwardId: "mlh-tiger-data",
    summary: "Managed PostgreSQL built for time series, events and AI workloads.",
    access: [{ kind: "mlh", text: "$1,000 credit for new signups · 30 days" }],
    cta: { label: "Get started with Tiger Data", href: "https://mlh.link/tigerdata-quickstart" },
  },
  {
    id: "vultr",
    name: "Vultr",
    logo: mark("vultr"),
    category: "cloud",
    mlhAwardId: "mlh-vultr",
    summary: "Cloud servers and GPUs to host your app or run a model.",
    access: [{ kind: "mlh", text: "$100 credit with an MLH code" }],
    cta: { label: "Register for a Vultr code", href: "https://mlh.link/vultr-discover" },
  },

  // ── Advanced computing & specialised tools ───────────────────────────────
  {
    id: "csc-lumi",
    name: "CSC / LUMI AI Factory",
    category: "advanced",
    partnerId: "csc-lumi",
    summary: "The LUMI supercomputer's GPUs and the Aitta inference service — optional, for heavy AI work.",
    access: [{ kind: "preregistered", text: "Registered by Fri 30 Oct only" }],
    cta: { label: "LUMI AI Factory onboarding", href: "https://lumi-ai-factory.github.io/LUMI_AIF_Onboarding/" },
    setup: { label: "Eligibility and deadline", href: "#ai-resources" },
    more: [
      "Registration closed on Friday 30 October 2026. Only eligible participants who registered by then have access.",
      "You do not need LUMI to take part — every challenge can be built with ordinary tools.",
    ],
  },
  {
    id: "fiware",
    name: "FIWARE",
    category: "advanced",
    partnerId: "fiware",
    summary: "Open-source building blocks and the NGSI-LD standard for real-world context data and digital twins.",
    access: [{ kind: "open-source", text: "Free and open source" }],
    cta: { label: "Start with FIWARE", href: "#fiware" },
    setup: { label: "Step-by-step tutorials", href: "https://fiware-tutorials.readthedocs.io/en/latest/" },
  },
  {
    id: "solana",
    name: "Solana",
    logo: mark("solana"),
    category: "advanced",
    mlhAwardId: "mlh-solana",
    summary: "A fast blockchain for payments, tokens and on-chain apps.",
    access: [{ kind: "mlh", text: "Free DevNet and faucet" }],
    cta: { label: "Get started with Solana", href: "https://mlh.link/solana-quickstart" },
  },
] as const;

export const FEATURED_TOOLS = AI_TOOLS.filter((t) => t.featured);

export const toolsIn = (category: ToolCategoryId) => AI_TOOLS.filter((t) => t.category === category);

export const toolAnchor = (id: string) => `tool-${id}`;

export const partnerFor = (tool: AiTool): PartnerResource | undefined =>
  tool.partnerId ? PARTNER_RESOURCES.find((p) => p.id === tool.partnerId) : undefined;

export const mlhAwardFor = (tool: AiTool): MlhAward | undefined =>
  tool.mlhAwardId ? MLH_AWARDS.find((a) => a.id === tool.mlhAwardId) : undefined;

export const workshopFor = (tool: AiTool) => (tool.workshopId ? WORKSHOPS.find((w) => w.id === tool.workshopId) : undefined);

/** The logo a card shows: its own mark, or the partner's wordmark. */
export const logoFor = (tool: AiTool): ToolLogo | undefined => tool.logo ?? partnerFor(tool)?.logo;

/** Attribution under an MLH-supplied benefit. */
export const MLH_ATTRIBUTION = "Benefit provided through Major League Hacking (MLH).";

/** The tool card that covers an MLH category's technology. */
export const toolForMlhAward = (awardId: string) => AI_TOOLS.find((t) => t.mlhAwardId === awardId);
