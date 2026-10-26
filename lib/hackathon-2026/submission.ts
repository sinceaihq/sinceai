import { GUIDE_BASE_PATH, GUIDE_LINKS } from "./facts";

/**
 * Building with AI and submitting a project — Since AI Hackathon 2026.
 *
 * The submission facts follow sinceai.app as built (sinceai-platform `main`,
 * checked 25 Oct 2026): `frontend/app/submit/` (form, required fields, team IP
 * terms), `backend/src/submission/submission.dto.ts` and
 * `backend/src/upload/attachment.constants.ts` (file types). Size and count
 * limits are server configuration, so they are not quoted here — the upload
 * form shows them. Re-check these files before changing a field, a format or
 * the flow.
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
  /** Marked required (*) on the form, in its order. */
  required: [
    { name: "Challenge", note: "Your team's Friday selection, filled in for you; only the organisers can change it." },
    { name: "Project name" },
    { name: "Submission URL", note: "Where the project can be viewed after the event." },
    { name: "About the project", note: "The problem and your solution — up to 5,000 characters." },
    { name: "Repository / demo link", note: "Your code or a working demo." },
    { name: "Built with", note: "Technologies used, comma-separated." },
    { name: "Technology feedback", note: "Feedback on the tech you used this weekend." },
    { name: "GenAI tools used", note: "Select every tool you used — or “I did not use GenAI”." },
    { name: "Generative AI in your project", note: "Did you implement a generative AI model or API? How and why — or N/A." },
    { name: "Challenge IP terms", note: "Every team member accepts them personally." },
  ] satisfies readonly SubmissionField[],
  optional: [
    { name: "Submission video URL", note: "A YouTube video link." },
    { name: "Files", note: "Pitch deck, supporting documents and an uploaded demo video." },
    { name: "Domain name, opt-in prizes and schools of team members" },
    { name: "Gemini API project number", note: "Leave it blank unless a prize category you enter asks for it." },
  ] satisfies readonly SubmissionField[],
  /** The attachment allow-list (attachment.constants.ts). */
  files: [
    { kind: "Pitch deck", formats: ["PDF", "PPT", "PPTX"] },
    { kind: "Supporting documents", formats: ["PDF", "PPT", "PPTX", "DOC", "DOCX", "TXT", "Markdown"] },
    { kind: "Demo video", formats: ["MP4", "WebM"], note: "Or a YouTube link in the video URL field." },
  ],
  filesNote:
    "All files are optional. ZIP archives are not accepted — share code through your repository link. The upload form shows the current size and count limits.",
  steps: [
    {
      title: "Prepare the details",
      text: "Collect the required fields while you build — not at 09:50 on Sunday.",
    },
    {
      title: "Check your links",
      text: "Open your submission URL and repository / demo link logged out. A private repository works only if judges and evaluators can open it.",
    },
    {
      title: "Everyone accepts the IP terms",
      text: "Each team member opens the submission page and ticks the challenge IP terms for their own work. The entry goes through once everyone has.",
    },
    {
      title: "Submit and save",
      text: "Any team member submits — one entry per team. Files attach to a saved submission, so this comes first.",
    },
    {
      title: "Add files",
      text: "Then add a pitch deck, documents or a demo video if you want to. Each upload is saved as it finishes.",
    },
    {
      title: "Check before 10:00",
      text: "Review the entry and every file. You can edit and add files until submissions close.",
    },
  ],
  strongEntry: [
    "A working prototype, a live demo or clear steps to run it — the product is the pitch.",
    "A repository with the actual project, a README and setup instructions.",
    "A short demo video, about two minutes — recommended, not required.",
    "A concise deck only if it helps; it never replaces a working prototype.",
  ],
  dashboardHref: GUIDE_LINKS.appDashboard,
} as const;
