import { CONFIDENTIAL_ANCHOR } from "./awards";
import { RESOURCES_PATH } from "./resources";
import { getScheduleItem } from "./schedule";
import { formatTimeRange } from "./time";

/**
 * "Build a project that wins" — advice for builders, not a rule (organiser,
 * 4 Nov 2026). It adds no requirement, criterion, length limit or language
 * rule: the submission rules are in submission.ts (a YouTube demo video is
 * required, ideally under two minutes), judging is each company's
 * and the jury's. Company contact goes through the official routes only: the
 * Friday briefing, the Saturday Q&A windows at Joki (times from schedule.ts)
 * and the support route each company gives at its briefing.
 */

const qaMorning = getScheduleItem("sat-qa-morning");
const qaAfternoon = getScheduleItem("sat-qa-afternoon");
const briefing = getScheduleItem("fri-briefings");

export const WINNING_ANCHOR = "win";

export const WINNING = {
  title: "Build a project that wins.",
  intro: "Great hackathon projects solve a real problem — and make their value easy to understand.",
  closing: "Build what matters. Show why it matters.",
  company: {
    title: "Talk to your challenge company.",
    text: "Ask questions, test your assumptions and show your progress. The best solution isn't the most complicated one — it's the one that solves the right problem.",
    where: `At your briefing (Fri ${formatTimeRange(briefing)}), at the Q&A at Joki (Sat ${formatTimeRange(qaMorning)} and ${formatTimeRange(qaAfternoon)}) and through the support route your company gives you. Representatives aren't available all the time — plan your questions.`,
    questionsLabel: "5 questions to ask your company",
    questions: [
      "What is the biggest problem you need solved?",
      "Who would use this solution?",
      "What would make this valuable to your business?",
      "What would stop you from actually using it?",
      "Can we show you our prototype and get feedback?",
    ],
  },
  demo: {
    title: "Make your demo impossible to misunderstand.",
    text: "Show your solution working. Record a clear screen demo, explain it in English and add captions if you can. Make the business value obvious — voters compare two projects at a time, and your video is on every vote card.",
    howLabel: "How to make a great demo",
    steps: [
      {
        title: "Start with the problem",
        text: "One or two sentences: who has the problem, why it matters, and what is slow, costly or hard today.",
      },
      {
        title: "Show it working",
        text: "Record your screen, not slides. Walk through it step by step: what the user does, what the AI does, and the result they get. Move the cursor deliberately and cut the loading time.",
      },
      {
        title: "Explain the value",
        text: "Saved time, less manual work, better decisions, more safety, lower cost — only what your prototype or evidence supports. Never invent numbers.",
      },
      {
        title: "Make it easy to follow",
        text: "Narrate in English, add captions (people watch without sound in a noisy hall), zoom in on what matters and edit out pauses. About two minutes is plenty.",
      },
    ],
    tools:
      "No studio needed: a screen recorder, a voice-over and simple editing do it. Use any tool you already know — OBS Studio, Loom, CapCut, Descript or similar.",
    honesty:
      "Mock data, simulations and clickable prototypes are fine — say so. Keep clear what works, what is simulated and what is a future idea.",
    confidential:
      "Confidential challenge? Show only what your company allows: synthetic or approved examples, never restricted data, credentials or confidential screens.",
    confidentialLink: { label: "What is confidential", href: `${RESOURCES_PATH}#${CONFIDENTIAL_ANCHOR}` },
  },
  stages: [
    { when: "Friday", text: "Understand the challenge. Ask your company what matters before you build." },
    { when: "Saturday", text: "Show an early version at the Q&A. Refine it around real business value." },
    {
      when: "Before Sun 10:00",
      text: "Record the demo. Check your video, slides and links — and that everything you share is allowed. Submit early.",
    },
  ],
} as const;
