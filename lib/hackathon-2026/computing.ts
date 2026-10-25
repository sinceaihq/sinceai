import { GUIDE_BASE_PATH, GUIDE_LINKS } from "./facts";

/**
 * CSC / LUMI AI Factory computing resources — Since AI Hackathon 2026.
 *
 * Facts from CSC's instructions to the organiser (19 Oct 2026): eligible
 * participants can request access to LUMI and Aitta through a shared hackathon
 * project; registration closes on Friday 30 October 2026 and nobody can newly
 * join after it; account approval and activation can take several days; access
 * is limited to participants affiliated with organisations in EU Member States
 * or Horizon Europe-associated countries; new CSC accounts need an individual
 * institutional email address; the project is for hackathon work only; LUMI AI
 * Factory experts are on site. Using the resources is optional.
 *
 * Privacy: the project-specific joining instructions (invitation link, project
 * number, project manager) reach accepted participants privately by email and
 * never belong in this repository or on the public site — only the public pages
 * in `links` are linked. `lib/hackathon-2026/__tests__/computing.test.ts` guards
 * this.
 */

export const COMPUTING_ANCHOR = "ai-resources";
/** The hub section, linked from the builder guide and the hero callouts. */
export const COMPUTING_HREF = `${GUIDE_BASE_PATH}#${COMPUTING_ANCHOR}`;

export interface ComputingResource {
  name: string;
  /** What it is, in one plain sentence. */
  text: string;
  href: string;
}

export const COMPUTING = {
  title: "CSC / LUMI AI Factory computing resources",
  /** End of Friday 30 October 2026, Turku time; the UI shows registration as closed after this. */
  deadline: "2026-10-30T23:59:59+02:00",
  deadlineLabel: "Friday 30 October 2026",
  deadlineShort: "Fri 30 Oct",
  intro:
    "Eligible participants can request access to the LUMI supercomputer and the Aitta inference service for Since AI Hackathon 2026 — computing power and open AI models for building and experimentation. Using them is optional; you can take part in the hackathon without them.",
  resources: [
    {
      name: "LUMI supercomputer",
      text: "One of Europe's most powerful supercomputers, with GPU nodes for training and running AI models.",
      href: "https://lumi-supercomputer.eu/",
    },
    {
      name: "Aitta inference service",
      text: "Curated open AI models running on LUMI, through a web interface and an OpenAI-compatible API.",
      href: "https://aitta.csc.fi/",
    },
  ] satisfies readonly ComputingResource[],
  register:
    "If you plan to use them, complete your registration by Friday 30 October 2026. Account approval and activation can take several days, so register as early as possible. Nobody can newly join the hackathon project after the deadline.",
  eligibility: [
    "You are affiliated with an organisation in an EU Member State or a Horizon Europe-associated country.",
    "A new CSC account needs your own institutional email address — generic or shared addresses are not accepted.",
    "The shared project is for hackathon work only.",
  ],
  whereTitle: "Where are the registration instructions?",
  where:
    "In your Since AI acceptance or welcome email, or the email of 25 October with “SUPERCOMPUTER” in the subject.",
  privateNote: "The project-specific joining instructions are sent privately and are not published on this website.",
  cantFindTitle: "Can't find them?",
  cantFind: "Search your inbox and spam folder for “Since AI”, “LUMI” or “SUPERCOMPUTER”. Still nothing? Email",
  supportEmail: GUIDE_LINKS.contactEmail,
  onSite: "LUMI AI Factory experts are on site during the hackathon.",
  closed:
    "Registration closed on Friday 30 October 2026, and nobody can newly join the hackathon project. If you registered, use the access CSC confirmed to you.",
  links: [
    { label: "LUMI AI Factory onboarding guide", href: "https://lumi-ai-factory.github.io/LUMI_AIF_Onboarding/" },
  ],
} as const;

/** Whether participants can still register at `nowMs`. */
export function computingRegistrationOpen(nowMs: number): boolean {
  return nowMs <= Date.parse(COMPUTING.deadline);
}
