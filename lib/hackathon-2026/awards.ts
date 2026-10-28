import { GUIDE_LINKS } from "./facts";
import { RESOURCES_PATH } from "./resources";

/**
 * Optional awards — Since AI Hackathon 2026. Awards a team can win with
 * the project it builds for its company challenge (and, for FIWARE only, with
 * a separate prototype). None of them replaces the company challenge, uses its
 * places or changes its evaluation.
 *
 * Sources:
 * - MLH: the official event prize page, mlh.com/events/since-ai-hackathon/prizes
 *   (checked 27 Oct 2026) — seven categories, titles, prizes and links as MLH
 *   publishes them. MLH asked for all of them to be published and for entries
 *   to be non-exclusive with the company challenges. Prize codes are never
 *   published here.
 * - Red Hat OpenShift AI Technology Award: organiser, 27 Oct 2026 — €1,000
 *   subject to the partnership terms; rubric 35/30/25/10. The reviewer is not
 *   named publicly.
 * - FIWARE Open Innovation Award: FIWARE Foundation's Builder Pack for Since AI
 *   Hackathon 2026 (October 2026), which grants Since AI the right to use the
 *   name and publish its technical resources. Its contact emails and phone
 *   numbers are organiser-only and never reproduced here.
 *
 * `__tests__/awards.test.ts` guards these rules.
 */

export const AWARDS_ANCHOR = "awards";
export const AWARDS_HREF = `${RESOURCES_PATH}#${AWARDS_ANCHOR}`;
export const FIWARE_RESOURCES_ANCHOR = "fiware";
export const CONFIDENTIAL_ANCHOR = "confidential";
/** The MLH categories block inside the awards section. */
export const MLH_AWARDS_ANCHOR = "mlh-awards";

export const MLH_PRIZE_PAGE = "https://www.mlh.com/events/since-ai-hackathon/prizes";

export interface MlhAward {
  /** Stable id, the same one sinceai.app stores for the category. */
  id: string;
  title: string;
  /** The prize as MLH lists it. */
  prize: string;
  /** MLH's own one-line description. */
  description: string;
  href: string;
}

const mlhLink = (slug: string, title: string) =>
  `https://mlh.link/${slug}?utm_source=mlh&utm_medium=referral&utm_content=${title.replace(/ /g, "+")}`;

/** The seven MLH categories, in MLH's order. */
export const MLH_AWARDS: readonly MlhAward[] = [
  {
    id: "mlh-elevenlabs",
    title: "Best Use of ElevenLabs",
    prize: "Wireless Earbuds",
    description: "Deploy natural, human-sounding audio with ElevenLabs.",
    href: mlhLink("elevenlabs", "Best Use of ElevenLabs"),
  },
  {
    id: "mlh-gemini",
    title: "Best Use of Gemini API",
    prize: "MLH Swag Kits",
    description: "It's time to push the boundaries of what's possible with AI using Google Gemini.",
    href: mlhLink("gemini", "Best Use of Gemini API"),
  },
  {
    id: "mlh-solana",
    title: "Best Use of Solana",
    prize: "Unruggable Hardware Wallets",
    description: "The world of development is evolving fast and Solana is leading the charge.",
    href: mlhLink("solana", "Best Use of Solana"),
  },
  {
    id: "mlh-tiger-data",
    title: "Best Use of Tiger Data",
    prize: "Stream Deck Mini",
    description: "Building high-performance apps under hackathon deadlines shouldn't mean spending half your weekend configuring complex databases or learning obscure query languages.",
    href: mlhLink("tigerdata", "Best Use of Tiger Data"),
  },
  {
    id: "mlh-vultr",
    title: "Best Use of Vultr",
    prize: "M5Stack Official Tab5",
    description: "Vultr empowers hackers to bring their high-performance projects to life instantly.",
    href: mlhLink("vultr", "Best Use of Vultr"),
  },
  {
    id: "mlh-snowflake",
    title: "Best Use of Snowflake API",
    prize: "Arduino Student Kit",
    description: "Play with industry-leading LLMs on a single account using the Snowflake APIs.",
    href: mlhLink("snowflake", "Best Use of Snowflake API"),
  },
  {
    id: "mlh-mongodb-atlas",
    title: "Best Use of MongoDB Atlas",
    prize: "M5Stack IoT Kit",
    description: "MongoDB Atlas takes the leading modern database and makes it accessible in the cloud!",
    href: mlhLink("mongodb", "Best Use of MongoDB Atlas"),
  },
];

/** Where to ask about the MLH categories — MLH's own introduction and prize page, no new contacts. */
export const MLH_QUESTIONS =
  "Come to MLH's introduction at 16:45 on Friday, on the Taidon portaat stage, or see MLH's prize page.";

export const MLH_AWARDS_NOTE =
  "Prizes provided through Major League Hacking (MLH) and its sponsors; MLH runs these categories and their judging. Tick any categories that fit on your team's submission in sinceai.app: zero, one or several, with the same project. MLH's prize page has the full details.";

export interface TechnologyAward {
  id: "red-hat-openshift-ai" | "fiware-open-innovation";
  title: string;
  provider: string;
  /** The prize or benefit, exactly as confirmed. */
  prize: string;
  /** A few words for compact places (resource cards, at a glance). */
  prizeShort: string;
  eligibility: readonly string[];
  /** What the team submits as evidence. */
  evidence: readonly string[];
  criteria: readonly { name: string; weight: number; text?: string }[];
  evaluation: string;
  /** Where to ask — only support already published elsewhere in the guide. */
  questions: { text: string; link: { label: string; href: string } };
  docs: readonly { label: string; href: string }[];
}

export const RED_HAT_AWARD: TechnologyAward = {
  id: "red-hat-openshift-ai",
  title: "Red Hat OpenShift AI Technology Award",
  provider: "Red Hat",
  prize: "€1,000, subject to the partnership terms.",
  prizeShort: "€1,000",
  eligibility: [
    "Only a solution built for an official company challenge — your team's submission in sinceai.app. It is not an extra company challenge, and a standalone app built for this award alone is not eligible.",
    "The solution must meaningfully use Red Hat OpenShift AI — for example to build, serve or monitor the model your solution relies on.",
  ],
  evidence: [
    "A short description of how and where your solution uses OpenShift AI.",
    "Technical evidence of real use: screenshots, a short screen recording, configuration or deployment files, or the relevant part of your repository.",
    "Nothing confidential: no restricted challenge data, keys or credentials.",
  ],
  criteria: [
    { name: "OpenShift AI use", weight: 35 },
    { name: "Practical business value", weight: 30 },
    { name: "Technical reliability", weight: 25 },
    { name: "Documentation and clarity", weight: 10 },
  ],
  evaluation: "A Red Hat reviewer evaluates the eligible entries in sinceai.app; Since AI confirms the winner.",
  questions: {
    text: "Red Hat supports builders remotely during the event. Any session or office hours are announced in the event channels.",
    link: { label: "Red Hat in Builder Resources", href: `${RESOURCES_PATH}#resource-red-hat` },
  },
  docs: [
    { label: "Developer Sandbox (free for 30 days)", href: "https://developers.redhat.com/developer-sandbox" },
    { label: "Red Hat OpenShift AI", href: "https://www.redhat.com/en/products/ai/openshift-ai" },
  ],
};

export const FIWARE_AWARD: TechnologyAward & {
  routes: readonly { letter: string; title: string; text: string }[];
  benefits: readonly { title: string; text: string }[];
  conditions: readonly string[];
  mentor: string;
} = {
  id: "fiware-open-innovation",
  title: "FIWARE Open Innovation Award",
  provider: "FIWARE Foundation",
  prize: "A non-cash prize package from FIWARE Foundation — membership, a Global Summit invitation, mentorship, recognition and iHub introductions.",
  prizeShort: "non-cash package",
  routes: [
    {
      letter: "A",
      title: "Your company challenge solution",
      text: "Your team's company challenge solution uses FIWARE technology — enter the same project for the award in sinceai.app.",
    },
    {
      letter: "B",
      title: "A separate FIWARE prototype",
      text: "Your team builds an additional prototype on a problem of its own choosing. It is an extra award entry only: it never enters the company challenge rankings or the selection of the five finalists, and your company challenge entry still comes first. Enter it in sinceai.app by the deadline shown there and demo it live to the FIWARE evaluator; evaluation is on Sunday 8 November during judging.",
    },
  ],
  eligibility: [
    "At least one FIWARE technology meaningfully integrated — NGSI-LD, Smart Data Models, a FIWARE Context Broker or another FIWARE Generic Enabler. Merely mentioning FIWARE is not enough.",
    "A working prototype demonstrated live at the hackathon — a working demo, not slides.",
    "Sharing your code as open source during the event is strongly encouraged.",
  ],
  evidence: [
    "Which FIWARE technologies you used and how they fit your architecture.",
    "A link to your repository or demo showing the integration working.",
    "Nothing confidential: no restricted challenge data in public code, videos or evidence.",
  ],
  criteria: [
    { name: "FIWARE integration", weight: 35, text: "Meaningful use of NGSI-LD, Smart Data Models, a Context Broker or FIWARE GEs — not superficial." },
    { name: "Technical quality", weight: 30, text: "Working demo, clean architecture, appropriate use of open standards." },
    { name: "Innovation", weight: 20, text: "Novel application of FIWARE technologies; original problem framing." },
    { name: "Practical value", weight: 15, text: "Clear real-world impact; an understandable use case." },
  ],
  evaluation:
    "Jason Fox, FIWARE expert and trainer, is the sole evaluator of this award. He evaluates the eligible entries on Sunday 8 November, and the award is announced at the closing ceremony.",
  questions: {
    text: "Ask Jason Fox, the FIWARE technical mentor, on site at EduCity all three days — or the FIWARE mentors on the Since AI Discord.",
    link: { label: "Since AI Discord", href: GUIDE_LINKS.discord },
  },
  mentor:
    "Jason Fox is also the primary FIWARE technical mentor, on site at EduCity all three days, 6–8 November. Bring him your NGSI-LD design questions, entity modelling and architecture reviews.",
  benefits: [
    { title: "FIWARE Foundation membership for one year", text: "Access to the FIWARE member network, working groups and technical roadmaps." },
    { title: "Invitation to FIWARE Global Summit 2027", text: "A personal invitation and recognition for the team lead at FIWARE's flagship annual event." },
    { title: "Technical mentorship, training or architecture support", text: "Direct access to senior FIWARE architects for technical review, architecture guidance and feedback on the winning solution." },
    { title: "Recognition across FIWARE channels", text: "A feature in FIWARE's newsletter, LinkedIn and website, and a press release to the FIWARE community." },
    { title: "iHub network introduction", text: "An introduction to FIWARE's European iHub network for follow-on development, pilot deployment and potential Horizon Europe collaboration." },
  ],
  conditions: [
    "One prize package per winning team, whatever its size.",
    "The FIWARE Foundation membership covers the team lead or their organisation.",
    "The Global Summit invitation is for the team lead; travel and accommodation are not included.",
    "The mentorship package begins within 30 days of the hackathon.",
    "Recognition content is published only with the team's approval.",
    "The prize is valid for 12 months from the award date.",
  ],
  docs: [
    { label: "FIWARE", href: "https://www.fiware.org/" },
    { label: "NGSI-LD step-by-step tutorials", href: "https://fiware-tutorials.readthedocs.io/en/latest/" },
  ],
};

/** How entering works, in sinceai.app — the main submission stays the source of truth. */
export const HOW_TO_ENTER = [
  {
    title: "Submit your company challenge project",
    text: "One submission per team in sinceai.app by Sunday 10:00. It is your entry to your company challenge and to the participant vote.",
  },
  {
    title: "Tick the MLH categories that fit",
    text: "On the same submission, select zero, one or several MLH categories. Gemini API entries add their Gemini project number — never an API key.",
  },
  {
    title: "Enter Red Hat or FIWARE in the app",
    text: "Enter the same project for the Red Hat or FIWARE award under optional awards in sinceai.app, with the evidence it asks for. A separate FIWARE prototype (route B) is its own extra entry.",
  },
] as const;

export const HOW_TO_ENTER_LINK = { label: "Open your sinceai.app dashboard", href: GUIDE_LINKS.appDashboard } as const;

export const TECHNOLOGY_AWARDS = [RED_HAT_AWARD, FIWARE_AWARD] as const;

/** The in-page anchor of a technology award's card. */
export const awardAnchor = (id: TechnologyAward["id"]) => `award-${id}`;
/** A technology award's card, from anywhere on the site. */
export const awardHref = (id: TechnologyAward["id"]) => `${RESOURCES_PATH}#${awardAnchor(id)}`;
/** The technology award a partner resource names (by its title). */
export const technologyAwardByTitle = (title: string) => TECHNOLOGY_AWARDS.find((a) => a.title === title);

export interface AwardGlanceRow {
  id: "mlh" | TechnologyAward["id"];
  name: string;
  /** In-page anchor of the award's card or block. */
  href: string;
  win: string;
  enter: string;
  /** Only what is already confirmed — otherwise "announced in the event channels". */
  decided: string;
  ask: string;
}

/** The three optional awards side by side, at the top of the awards section. */
export const AWARDS_AT_A_GLANCE: readonly AwardGlanceRow[] = [
  {
    id: "mlh",
    name: `MLH prize categories (${MLH_AWARDS.length})`,
    href: `#${MLH_AWARDS_ANCHOR}`,
    win: "A prize provided through MLH in each category.",
    enter: "Tick the categories that fit on your team's submission in sinceai.app.",
    decided: "MLH runs the judging. Winners are announced in the event channels.",
    ask: "MLH's introduction, Fri 16:45 on the Taidon portaat stage, and MLH's prize page.",
  },
  {
    id: RED_HAT_AWARD.id,
    name: RED_HAT_AWARD.title,
    href: `#${awardAnchor(RED_HAT_AWARD.id)}`,
    win: RED_HAT_AWARD.prize,
    enter: "Enter the same project under optional awards in sinceai.app, with evidence.",
    decided: "A Red Hat reviewer evaluates; Since AI confirms the winner. Announced in the event channels.",
    ask: "Red Hat's remote support during the event.",
  },
  {
    id: FIWARE_AWARD.id,
    name: FIWARE_AWARD.title,
    href: `#${awardAnchor(FIWARE_AWARD.id)}`,
    win: "A non-cash prize package from FIWARE Foundation.",
    enter: "Under optional awards in sinceai.app: the same project (route A) or a separate prototype (route B).",
    decided: "Evaluated on Sunday 8 November during judging; announced at the closing ceremony.",
    ask: "Jason Fox on site at EduCity, and the Since AI Discord.",
  },
];

export interface FiwareResourceGroup {
  title: string;
  items: readonly { label: string; href?: string; text?: string; code?: string }[];
}

/**
 * From the FIWARE Builder Pack — public technical resources only. Orion-LD
 * needs a MongoDB to start, so step 1 runs both on one Docker network. Run
 * end to end on 27 Oct 2026 (mongo:4.4, fiware/orion-ld latest): the POST
 * answers 201 Created and the GET returns the entity.
 */
export const FIWARE_QUICK_START = [
  {
    step: "Run a Context Broker (Orion-LD with its MongoDB)",
    code: [
      "docker network create fiware",
      "docker run -d --name mongo-db --network fiware mongo:4.4",
      "docker run -d --name orion-ld --network fiware -p 1026:1026 fiware/orion-ld -dbhost mongo-db",
    ].join("\n"),
  },
  {
    step: "Create your first NGSI-LD entity (201 Created)",
    code: [
      "curl -i -X POST http://localhost:1026/ngsi-ld/v1/entities \\",
      "  -H 'Content-Type: application/ld+json' \\",
      "  -d '{",
      '    "id": "urn:ngsi-ld:Building:001",',
      '    "type": "Building",',
      '    "name": {"type": "Property", "value": "My first building"},',
      '    "@context": "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.9.jsonld"',
      "  }'",
    ].join("\n"),
  },
  {
    step: "Read it back",
    code: "curl http://localhost:1026/ngsi-ld/v1/entities/urn:ngsi-ld:Building:001 -H 'Accept: application/ld+json'",
  },
  { step: "Pick a Smart Data Model for your domain", code: "https://smartdatamodels.org/" },
] as const;

export const FIWARE_NO_SETUP =
  "No Docker? Use the Antares live demo broker — no setup required.";

export const FIWARE_RESOURCE_GROUPS: readonly FiwareResourceGroup[] = [
  {
    title: "Learn NGSI-LD",
    items: [
      { label: "FIWARE step-by-step tutorials (NGSI-LD)", href: "https://fiware-tutorials.readthedocs.io/en/latest/" },
      { label: "NGSI-LD Hello World (linked data)", href: "https://fiware-tutorials.readthedocs.io/en/latest/linked-data.html" },
      { label: "NGSI-LD tutorials with Docker Compose", href: "https://github.com/FIWARE/tutorials.NGSI-LD" },
      { label: "FIWARE Academy — free video courses", href: "https://fiware-academy.readthedocs.io/en/latest/" },
      { label: "NGSI-LD v1.9.1 specification, part 1 (API and data model)", href: "https://ngsild.org/ts104175/html/index.html" },
      { label: "NGSI-LD v1.9.1 specification, part 2 (operations and semantics)", href: "https://ngsild.org/ts104176/html/index.html" },
    ],
  },
  {
    title: "Smart Data Models",
    items: [
      { label: "Browse 1,000+ Smart Data Models", href: "https://smartdatamodels.org/" },
      { label: "Validate your entity", href: "https://smartdatamodels.org/index.php/check-a-schema-validates-a-payload/" },
      { label: "Smart Data Models on GitHub", href: "https://github.com/smart-data-models/data-models" },
    ],
  },
  {
    title: "Context Brokers — all implement NGSI-LD",
    items: [
      { label: "Orion-LD", href: "https://github.com/FIWARE/context.Orion-LD", text: "C++, the FIWARE reference implementation." },
      { label: "Scorpio", href: "https://github.com/ScorpioBroker/ScorpioBroker", text: "Java/Spring, multi-tenant." },
      { label: "Stellio", href: "https://github.com/stellio-hub/stellio-context-broker", text: "Kotlin, with federation support." },
      {
        label: "Antares",
        href: "https://antaresbroker.joinedcontext.com/",
        text: "Rust, high-performance, with a live demo instance — its builder supports teams on the Since AI Discord.",
      },
      {
        label: "coraine",
        href: "https://coraine.readthedocs.io/",
        text: "C, lightweight and plugin-driven, with bridges for ROS 2 / DDS, Modbus TCP and MQTT — SEAMWARE supports teams on the Since AI Discord.",
      },
    ],
  },
  {
    title: "Connect, store and show your data",
    items: [
      { label: "FIWARE IoT Agents — connect devices and sensors", href: "https://github.com/FIWARE/catalogue#iot-agents" },
      { label: "FIWARE Draco — data pipelines and history", href: "https://github.com/ging/fiware-draco" },
      { label: "FIWARE WireCloud — dashboards", href: "https://github.com/Wirecloud/wirecloud" },
      { label: "FIWARE Catalogue — all Generic Enablers", href: "https://www.fiware.org/catalogue/" },
      { label: "FIWARE on GitHub", href: "https://github.com/FIWARE" },
    ],
  },
  {
    title: "AI on top of FIWARE",
    items: [
      { label: "Hugging Face PEFT — LoRA fine-tuning", href: "https://github.com/huggingface/peft" },
      { label: "Model Context Protocol", href: "https://modelcontextprotocol.io/" },
      { label: "MCP SDKs — Python, TypeScript and more", href: "https://github.com/modelcontextprotocol" },
    ],
  },
];

export const FIWARE_ANTARES_DEMO = "https://antaresbroker.joinedcontext.com/demo/";

/** Example projects from the Builder Pack, summarised. Teams may also bring their own idea. */
export const FIWARE_EXAMPLES = [
  { title: "AI agents for manufacturing digital twins", text: "Agents that generate NGSI-LD digital twins of industrial equipment and orchestrate production routines — broker instances and an AR/VR demo environment from the iHub cluster." },
  { title: "Indoor location for emergency responders", text: "Model buildings and floor plans in NGSI-LD and add a floor-level location layer where GPS fails — with IndoorSOS mapping data and a synthetic dataset." },
  { title: "Smart city mobility and public space", text: "Bring mobility, footfall and public space sensor data into a Context Broker for real-time dashboards or predictive services — with the City of The Hague." },
  { title: "Water network monitoring", text: "Model pipes, pumps and sensors as NGSI-LD entities, detect anomalies and share quality data between operators — with XAMK." },
  { title: "Sovereign AI data pipeline", text: "Collect data as NGSI-LD entities, export a training set with provenance, fine-tune a small open model with LoRA and deploy it as a FIWARE-aware agent." },
  { title: "MCP-powered industrial AI on coraine", text: "An MCP server on the coraine broker so AI assistants can query live industrial context — with a human approving every physical action." },
] as const;

export const FIWARE_HELP =
  "FIWARE mentors — Jason Fox on site, and the Antares and coraine teams — help on the Since AI Discord. Ask there for example datasets and sandbox access.";
