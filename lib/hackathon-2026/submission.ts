import { AWARDS_HREF, CONFIDENTIAL_ANCHOR } from "./awards";
import { GUIDE_BASE_PATH, GUIDE_LINKS } from "./facts";
import { RESOURCES_PATH } from "./resources";

/**
 * Building with AI and submitting a project — Since AI Hackathon 2026.
 *
 * The final submission form and vote card (organiser, 4 Nov 2026), as built in
 * sinceai-platform PR #488 (`feat/submission-rework`) and reconciled with PR
 * #487 (NDA-safe ballot):
 * - Required: project name, tagline (≤ 140), About (≤ 5,000), Built with, a
 *   repository link, a YouTube demo video and the source code as one .zip
 *   (≤ 100 MB), plus MLH's three questions and the challenge terms.
 * - The demo video is a YouTube link only — no MP4 or WebM upload. On a
 *   confidential (NDA) challenge it is required too, unless the company or the
 *   organisers make it optional for that challenge; the form says so.
 * - Optional: a demo URL, one pitch deck, up to two supporting documents,
 *   partner technologies (Red Hat and FIWARE ticks enter their awards), MLH
 *   prize categories and MLH's optional questions.
 * - The vote card is the same for every challenge: project identity, tagline,
 *   the first lines of the description, the demo video, the pitch deck, up to
 *   five Built-with chips, Vote. Never repository or demo links, never an NDA
 *   label. On a confidential challenge it shows only what the team confirmed
 *   public-safe.
 * Size limits other than the source zip are server configuration, so they are
 * not quoted here — the upload form shows them.
 *
 * The legacy Devpost page describes a different process; sinceai.app is the
 * only official submission platform.
 */

export const BUILDING_ANCHOR = "building";
export const SUBMIT_ANCHOR = "submit";
/** The builder guide section, linked from the hub. */
export const BUILDING_HREF = `${GUIDE_BASE_PATH}/builders#${BUILDING_ANCHOR}`;

export const AI_POLICY = {
  headline: "Build with AI. We encourage it.",
  message:
    "Use the best tools available to turn real problems into working solutions — and be ready to explain, demonstrate and stand behind what you build.",
  /** Examples, never an exclusive list. */
  tools: ["ChatGPT", "Claude and Claude Code", "Google Gemini", "GitHub Copilot", "Cursor", "Lovable", "OpenCode"],
  toolsNote: "…or any other AI assistant, coding agent, model, framework or developer platform.",
  uses: "Ideation, research, architecture, code, debugging, data analysis, testing, UI/UX, documentation, prototyping, model training and inference, deployment — all of it.",
  notRequired: "AI is a choice, not a requirement — you don't need a paid subscription to compete.",
  responsibilities: [
    "Understand your solution and verify generated code — you are responsible for its security, reliability and behaviour.",
    "Be ready to explain your engineering decisions.",
    "Disclose the main AI tools you used — the submission form asks. No need to label AI-written lines.",
    "Separate pre-existing code and assets from what you built at the event.",
    "Licences, the challenge's rules and its data restrictions still apply.",
  ],
} as const;

export interface SubmissionField {
  name: string;
  note?: string;
  /** A guide page that explains the field further. */
  link?: { label: string; href: string };
}

export const SUBMISSION = {
  platform: "sinceai.app",
  /** Sunday 8 November 2026, 10:00 Turku time (EET, UTC+2). */
  deadline: "2026-11-08T10:00:00+02:00",
  deadlineLabel: "Sunday 8 November, 10:00 EET",
  notDevpost:
    "The official submission platform is sinceai.app, not Devpost. An entry on Devpost alone is not a submission.",
  whereToSubmit:
    "On your sinceai.app dashboard, the event card shows Submit project while submissions are open (Edit submission once you have submitted).",
  /** Required to submit, in the form's order. */
  required: [
    { name: "Challenge", note: "Your team's Friday selection, filled in for you; only the organisers can change it." },
    { name: "Project name", note: "Up to 80 characters." },
    { name: "Tagline", note: "One sentence on what your project does, up to 140 characters. Voters read it first on every vote card." },
    {
      name: "About the project",
      note: "The problem, your solution, how you built it, what you met on the way and what comes next — up to 5,000 characters. Judges read all of it; voters see the first lines.",
    },
    { name: "Built with", note: "Technologies you used, comma-separated. The first five appear as chips on your vote card." },
    { name: "Repository", note: "A link to your code, public or private. If it is private, judges use your source-code .zip." },
    {
      name: "Demo video",
      note: "A public or unlisted YouTube link, ideally under two minutes. YouTube is the only accepted format — no video file uploads.",
    },
    { name: "Source code", note: "One .zip of your code as it stands at the deadline, up to 100 MB." },
    {
      name: "MLH questions",
      note: "Technology feedback, the GenAI tools you used (or “I did not use GenAI”) and whether you implemented a generative AI model or API.",
    },
    {
      name: "Challenge terms",
      note: "Accepted by submitting. On a challenge that transfers ownership, every team member ticks them personally first.",
    },
    {
      name: "Public summary (confidential challenges only)",
      note: "A public-safe summary, and your confirmation that the project name, tagline, summary and Built with contain no confidential data.",
      link: { label: "What is confidential", href: `${RESOURCES_PATH}#${CONFIDENTIAL_ANCHOR}` },
    },
  ] satisfies readonly SubmissionField[],
  optional: [
    { name: "Demo URL", note: "A link where your project can be tried, if it is deployed. Judges see it; voters don't." },
    { name: "Pitch deck", note: "One PDF or PowerPoint. Voters can open it from your vote card." },
    { name: "Supporting documents", note: "Up to two, for the judges." },
    {
      name: "Partner technologies",
      note: "Tick the partner technologies you used and say how in a sentence or two. Ticking Red Hat OpenShift AI or FIWARE also enters that award, with the evidence it asks for.",
      link: { label: "Optional awards", href: AWARDS_HREF },
    },
    {
      name: "MLH prize categories",
      note: "Tick the MLH categories that fit — zero, one or several.",
      link: { label: "Optional awards", href: AWARDS_HREF },
    },
    { name: "Domain name and schools of team members", note: "Optional MLH questions." },
    { name: "Gemini API project number", note: "Leave it blank unless a prize category you enter asks for it." },
  ] satisfies readonly SubmissionField[],
  /** What a team attaches. The demo video is a YouTube link, never a file. */
  files: [
    { kind: "Source code", formats: ["ZIP"], required: true, note: "One file, up to 100 MB. Leave out dependencies such as node_modules, and data files." },
    { kind: "Pitch deck", formats: ["PDF", "PPT", "PPTX"], required: false, note: "One file." },
    { kind: "Supporting documents", formats: ["PDF", "PPT", "PPTX", "DOC", "DOCX", "TXT", "Markdown"], required: false, note: "Up to two." },
    { kind: "Demo video", formats: ["YouTube link"], required: true, note: "Public or unlisted. No MP4 or WebM uploads." },
  ],
  filesNote:
    "Files can be added before your first submit and are saved with it. The upload form shows the other size limits.",
  steps: [
    {
      title: "Prepare the details",
      text: "Write the tagline and description, list your Built with and keep your repository up to date while you build — not at 09:50 on Sunday.",
    },
    {
      title: "Upload your demo video to YouTube",
      text: "Record a short demo, ideally under two minutes, and upload it as public or unlisted. Open the link logged out to check it plays.",
    },
    {
      title: "Zip your source code",
      text: "One .zip, up to 100 MB, without node_modules or data files. Judges use it if your repository or demo can't be opened.",
    },
    {
      title: "Fill in the form and add files",
      text: "Any team member submits — one entry per team. Add the zip, and a pitch deck if you have one, in the same go.",
    },
    {
      title: "Everyone accepts the terms",
      text: "On a challenge that transfers ownership, each team member ticks the challenge terms for their own work — do it as soon as your team has its challenge.",
    },
    {
      title: "Check before 10:00",
      text: "Review the entry, the video and every file. You can edit until submissions close.",
    },
  ],
  strongEntry: [
    "A working prototype — the product is the pitch.",
    "A tagline a voter understands in five seconds.",
    "A demo video that shows it working in the first 20 seconds, under two minutes in all.",
    "A repository with a README and setup instructions.",
    "A concise deck only if it helps; it never replaces a working prototype.",
  ],
  /** The vote card, top to bottom — the same for every challenge. */
  voteCard: [
    { name: "Project", text: "Challenge, project name and team." },
    { name: "Tagline", text: "Your one sentence, in full." },
    { name: "Description", text: "The first few lines of About the project, with Read more." },
    { name: "Demo video", text: "Your YouTube video, playable on the card. Voters can vote without watching to the end." },
    { name: "Pitch deck", text: "When you added one." },
    { name: "Built with", text: "The first five technologies, as small chips." },
  ],
  voteCardNotes: [
    "Never on the card: your repository, your demo URL or other links. Voters compare about 20 pairs quickly and don't clone or deploy anything; judges and organisers still see your links.",
    "Confidential (NDA) challenges get the same card, with only what your team confirmed public-safe: the project name, tagline, public summary and Built with — and the video and deck unless the company has turned them off. Until you confirm, voters see a neutral placeholder. The card shows no confidentiality label.",
  ],
  dashboardHref: GUIDE_LINKS.appDashboard,
} as const;
