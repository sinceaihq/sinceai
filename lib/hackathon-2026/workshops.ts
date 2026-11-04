import { GUIDE_BASE_PATH, GUIDE_LINKS } from "./facts";
import type { Publishability } from "./types";

/**
 * MLH's two Friday-evening workshops — the one place for their times, words,
 * room and links. The schedule (and so the calendar files and "now / next"),
 * the Builder Guide, Builder Resources and the hub all read from here.
 *
 * Source: Quinn Dines (MLH), 3 Nov 2026 — GitHub Copilot 20:30–21:00 and
 * Google AI Studio 21:00–21:30 on Friday; organiser, 4 Nov 2026 — add both to
 * the programme, recommend one person per team. They are separate from MLH's
 * ten-minute introduction at 16:45–16:55 on the EduCity stage (schedule.ts).
 *
 * Room: BioCity's Presidenttiauditorio, Tykistökatu 6 — confirmed by the
 * organiser on 4 Nov 2026. 258 seats on Turun Teknologiakiinteistöt's plan of
 * 4 Jun 2026; never more is advertised, and no seat is guaranteed (the room's
 * safe capacity applies). Setting status back to anything but "confirmed"
 * makes every page say "room to be confirmed" and link to the BioCity plan.
 */
export const WORKSHOP_ROOM: {
  status: Publishability;
  name: string;
  seats: number;
  /** maps.ts hotspot on the BioCity lobby plan. */
  hotspotId: string;
} = {
  status: "confirmed",
  name: "Presidenttiauditorio",
  seats: 258,
  hotspotId: "bio-presidenttiauditorio",
};

export const WORKSHOP_ROOM_CONFIRMED = WORKSHOP_ROOM.status === "confirmed";

const VENUE_PATH = `${GUIDE_BASE_PATH}/venue`;

/** "Presidenttiauditorio" once confirmed; until then "Room to be confirmed". */
export const WORKSHOP_PLACE = WORKSHOP_ROOM_CONFIRMED ? WORKSHOP_ROOM.name : "Room to be confirmed";

/** The map link from a workshop: the room once confirmed, otherwise the BioCity plan. */
export const WORKSHOP_MAP_LINK = WORKSHOP_ROOM_CONFIRMED
  ? { label: "View room on map", href: `${VENUE_PATH}#place-${WORKSHOP_ROOM.hotspotId}` }
  : { label: "BioCity map", href: `${VENUE_PATH}#map-biocity-lobby` };

export const WORKSHOPS_ANCHOR = "workshops";
export const WORKSHOPS_HREF = `${GUIDE_BASE_PATH}/builders#${WORKSHOPS_ANCHOR}`;

export interface Workshop {
  id: string;
  /** schedule.ts item. */
  scheduleId: string;
  start: string;
  end: string;
  title: string;
  host: string;
  text: string;
  /** How to get the tool without attending, with its eligibility — accurate, never a promise. */
  access: string;
  link: { label: string; href: string };
}

export const WORKSHOPS: readonly Workshop[] = [
  {
    id: "mlh-github-copilot",
    scheduleId: "fri-mlh-copilot",
    start: "2026-11-06T20:30:00+02:00",
    end: "2026-11-06T21:00:00+02:00",
    title: "GitHub Copilot Workshop",
    host: "Major League Hacking (MLH)",
    text: "Learn how to activate and use GitHub Copilot in your hackathon project, including an introduction to MCPs.",
    access:
      "Students can get GitHub Copilot free with the GitHub Student Developer Pack, once GitHub approves them — GitHub decides who is eligible. Start with MLH's link.",
    link: { label: "Get GitHub Copilot", href: "https://mlh.link/github" },
  },
  {
    id: "mlh-google-ai-studio",
    scheduleId: "fri-mlh-ai-studio",
    start: "2026-11-06T21:00:00+02:00",
    end: "2026-11-06T21:30:00+02:00",
    title: "Google AI Studio Workshop",
    host: "Major League Hacking (MLH)",
    text: "Get started with Google AI Studio and Gemini. Learn how to create an API key, explore models and build AI features into your hackathon project.",
    access:
      "Sign in to Google AI Studio with a Google account and create an API key there. Google's terms, usage limits and regional availability apply; there are no special credits for this event.",
    link: { label: "Open Google AI Studio", href: "https://mlh.link/gemini-aistudio" },
  },
] as const;

/** The seating recommendation — a recommendation, never a rule, a booking or a guaranteed seat. */
export const WORKSHOP_SEATING =
  "Seats are limited. We recommend one person per team — share what you learn with your teammates. You don't need to attend to access the tools and setup guides.";

export const WORKSHOP_BRING = "Bring your laptop. Beginners are welcome.";

/** What attending does not give: seats are first come, within the room's safe capacity. */
export const WORKSHOP_SEATS_NOTE = WORKSHOP_ROOM_CONFIRMED
  ? `${WORKSHOP_ROOM.name} has ${WORKSHOP_ROOM.seats} seats — fewer than there are builders. Seats are not reserved, and the room's safe capacity applies.`
  : "The room has fewer seats than there are builders. Seats are not reserved, and the room's safe capacity applies.";

/** The alternative to attending: the same tools, and where MLH answers. No promised hours or posts. */
export const WORKSHOP_CANT_ATTEND = {
  title: "Can't attend?",
  text: "Follow the setup guides or ask the MLH team for help.",
  help: [
    { label: "Setup guides", text: "The two links above — the same tools the workshops use." },
    {
      label: "The MLH area",
      text: "MLH's team in BioCity's partner corner.",
      href: `${VENUE_PATH}#place-stand-bc-6`,
    },
    {
      label: "Since AI Discord",
      text: "Ask in MLH's support channel once it opens; MLH may share links and setup help there during the event.",
      href: GUIDE_LINKS.discord,
      external: true,
    },
  ],
} as const;

/** One line where the MLH introduction is mentioned, so the two are never confused. */
export const WORKSHOPS_VS_INTRO =
  "Separate from MLH's ten-minute introduction at 16:45 on the EduCity stage.";

/**
 * MLH at Since AI — one summary of everything MLH brings, shown where builders
 * look (Builder Guide, Builder Resources, the hub) with links to the details.
 *
 * Organiser, 4 Nov 2026: two MLH representatives on site; MLH brings its
 * Hardware Lab; at least 50 Arduino UNO Q boards to give away to participants
 * (corrected from ten the same day). How they are given away is deliberately
 * not stated (not decided): no
 * eligibility, schedule, draw or queue is published. MLH's hardware page lists
 * MLH's general catalogue of borrowable devices — not this event's inventory —
 * and lab hardware is borrowed, never a giveaway.
 *
 * Location: "BioCity · MLH area" — MLH's stand in the partner corner (Stand 6,
 * a working layout). The lab's exact table is not separately allocated, so no
 * other position is claimed. Internal (not published): MLH's guidance has
 * devices picked up "at the MLH table"; confirm the lab's table and whether MLH
 * wants volunteer help with lending and returns.
 */
export const MLH_ANCHOR = "mlh";
export const MLH_HREF = `${GUIDE_BASE_PATH}/builders#${MLH_ANCHOR}`;
export const MLH_MAP_LINK = { label: "Find MLH on the map", href: `${VENUE_PATH}#place-stand-bc-6` } as const;
export const MLH_HARDWARE_LINK = {
  label: "Explore hardware resources",
  href: "https://www.mlh.com/resources/hardware",
} as const;

export const MLH_ON_SITE = {
  title: "MLH at Since AI",
  lede: "Try hardware, explore new technologies and get hands-on help from the MLH team.",
  location: "BioCity · MLH area",
  representatives: 2,
  /** At least this many — never "exactly". */
  giveawayMinimum: 50,
  items: [
    {
      id: "hardware",
      label: "Hardware",
      text: "Explore hardware and prototype with the MLH Hardware Lab. Lab hardware is on loan for your project.",
    },
    {
      id: "giveaways",
      label: "Giveaways",
      text: "At least 50 Arduino UNO Q boards to give away during the event — free, and separate from the lab's loan hardware.",
    },
    {
      id: "workshops",
      label: "Workshops",
      text: `Friday 20:30 — GitHub Copilot · 21:00 — Google AI Studio${WORKSHOP_ROOM_CONFIRMED ? `, in ${WORKSHOP_ROOM.name}` : ""}.`,
    },
    {
      id: "help",
      label: "Help",
      text: "Two MLH team members are on site in BioCity: hardware, developer tools and help getting started.",
    },
  ],
} as const;
