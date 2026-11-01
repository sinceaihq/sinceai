import { scheduleFor } from "./schedule";
import type { ChallengeCompany, ScheduleItem } from "./types";

/** A company with a Saturday Q&A stand at Joki. */
export type StandCompany = ChallengeCompany & { qa: NonNullable<ChallengeCompany["qa"]> };

/**
 * The 15 company challenges with their Friday briefing room (EduCity) and
 * Saturday Q&A location (Joki).
 *
 * Friday briefing rooms: the organiser's final EduCity maps (supplied 26 Oct
 * 2026, "Yritysten briiffaushuoneet" floors 1–2 and the floor 3 plan). They
 * supersede the 2 Oct placement maps. Floor 1: Elisa 1001 Dromberg, Bayer 1002
 * Moriaberg, Europress 1090 Ringsberg, Traficom 1091 Hammarbacka. Floor 2:
 * Fonecta 2001, Takomo Golf 2002, FORCIT Group 2003, Lindström 2004, TrustED 2067,
 * Valmet 2006/2007, DNA 2026, Meyer Turku 2030, Apetit 2027. Floor 3: Turku
 * Energia 3006 and Business Turku 3027 (their earlier floor-2 rooms 2029/2031
 * and 2072 are no longer used).
 *
 * Roster: the organiser roster of 13 Oct 2026 (13 named) plus Europress Group,
 * confirmed as a 2026 company challenge on 23 Oct 2026 — it fills the place
 * held as "To be announced (1)". Its challenge brief and data are not public.
 * TrustED, the EU-funded project coordinated by Gradiant, fills the last place
 * (room 2067, organiser 1 Nov 2026): 15 named partners, none still to come.
 * TrustED takes part remotely, so it has no stand: see `remote` below. Its old
 * URL, challenge-partners/tba-2, redirects (lib/redirects.ts).
 *
 * Saturday Q&A stands still follow the 2 Oct Joki maps (unchanged); Europress
 * takes the floor-2 stand held for the place it fills, provisional (`pending`)
 * until production confirms it. Change a room here and every page, map
 * highlight and 3D label follows.
 */
export const CHALLENGE_COMPANIES: readonly ChallengeCompany[] = [
  {
    id: "elisa",
    name: "Elisa",
    logo: { src: "/assets/sponsors/elisa.png", width: 1200, height: 468 },
    briefing: { venue: "educity", floor: 1, room: "1001", roomName: "Dromberg" },
    qa: { venue: "joki", floor: 1, zone: "Showroom" },
    placementStatus: "working",
  },
  {
    id: "bayer",
    name: "Bayer",
    logo: { src: "/assets/sponsors/Bayer.png", width: 495, height: 495 },
    briefing: { venue: "educity", floor: 1, room: "1002", roomName: "Moriaberg" },
    qa: { venue: "joki", floor: 1, zone: "Showroom" },
    placementStatus: "working",
  },
  {
    id: "europress",
    name: "Europress",
    // Official logo pack supplied by the organiser (white RGB variant for the dark site).
    logo: { src: "/assets/sponsors/europress.svg", width: 802, height: 215 },
    url: "https://europressgroup.com/",
    briefing: { venue: "educity", floor: 1, room: "1090", roomName: "Ringsberg" },
    // The Joki stand held for the place Europress fills — provisional until production confirms it.
    qa: { venue: "joki", floor: 2, zone: "Floor 2" },
    placementStatus: "pending",
  },
  {
    id: "traficom",
    name: "Traficom",
    logo: { src: "/assets/sponsors/traficom.png", width: 866, height: 288 },
    briefing: { venue: "educity", floor: 1, room: "1091", roomName: "Hammarbacka" },
    qa: { venue: "joki", floor: 2, zone: "Floor 2" },
    placementStatus: "working",
  },
  {
    id: "business-turku",
    name: "Business Turku",
    logo: { src: "/assets/sponsors/businessturku.png", width: 2902, height: 938 },
    briefing: { venue: "educity", floor: 3, room: "3027" },
    qa: { venue: "joki", floor: 3, zone: "Floor 3" },
    placementStatus: "working",
  },
  {
    id: "fonecta",
    name: "Fonecta",
    // Official white logo (yrityksille.fonecta.fi footer artwork, 13 Oct 2026).
    logo: { src: "/assets/sponsors/fonecta.svg", width: 1105, height: 276 },
    briefing: { venue: "educity", floor: 2, room: "2001", roomName: "Elias" },
    // Joki stand: Bo LKV's former position (13 Oct 2026) — provisional until production confirms.
    qa: { venue: "joki", floor: 3, zone: "Floor 3" },
    placementStatus: "pending",
  },
  {
    id: "takomo-golf",
    name: "Takomo Golf",
    logo: { src: "/assets/sponsors/takomo-golf.png", width: 820, height: 124 },
    briefing: { venue: "educity", floor: 2, room: "2002", roomName: "Ivar" },
    qa: { venue: "joki", floor: 3, zone: "Floor 3" },
    placementStatus: "working",
  },
  {
    id: "forcit-group",
    name: "FORCIT Group",
    logo: { src: "/assets/sponsors/Forcit-Group.png", width: 500, height: 107 },
    // FORCIT Group (Oy Forcit Ab): Drill and Blast Cycle Intelligence requires FORCIT's paper NDA, signed on site,
    // before its detailed data is shared (organiser, 27 Oct 2026) — see confidential.ts. Its prize pot is in prizes.ts.
    ndaRequired: true,
    briefing: { venue: "educity", floor: 2, room: "2003", roomName: "Erik" },
    qa: { venue: "joki", floor: 3, zone: "Floor 3" },
    placementStatus: "working",
  },
  {
    id: "lindstrom",
    name: "Lindström",
    logo: { src: "/assets/sponsors/Lindstrom.svg", width: 212, height: 43 },
    briefing: { venue: "educity", floor: 2, room: "2004", roomName: "Johannes" },
    qa: { venue: "joki", floor: 3, zone: "Floor 3" },
    placementStatus: "working",
  },
  {
    id: "trusted",
    name: "TrustED",
    // The official white artwork from trustedproject.eu, for the dark site.
    logo: { src: "/assets/sponsors/trusted.webp", width: 1200, height: 279 },
    url: "https://trustedproject.eu/",
    briefing: { venue: "educity", floor: 2, room: "2067" },
    remote: {
      coordinator: { name: "Gradiant", url: "https://gradiant.org/" },
      about:
        "TrustED is an EU-funded Horizon Europe project on secure, private digital identity and trusted data exchange, coordinated by Gradiant.",
      supportWindows: [],
    },
    placementStatus: "working",
  },
  {
    id: "valmet",
    name: "Valmet",
    logo: { src: "/assets/sponsors/valmet.png", width: 480, height: 172 },
    briefing: { venue: "educity", floor: 2, room: "2006 / 2007" },
    qa: { venue: "joki", floor: 2, zone: "Floor 2" },
    placementStatus: "working",
  },
  {
    id: "dna",
    name: "DNA",
    logo: { src: "/assets/sponsors/DNA.png", width: 600, height: 600 },
    briefing: { venue: "educity", floor: 2, room: "2026", roomName: "Orvokki" },
    qa: { venue: "joki", floor: 1, zone: "Showroom" },
    placementStatus: "working",
  },
  {
    id: "turku-energia",
    name: "Turku Energia",
    logo: { src: "/assets/sponsors/turku-energia.png", width: 820, height: 510 },
    briefing: { venue: "educity", floor: 3, room: "3006" },
    qa: { venue: "joki", floor: 1, zone: "Showroom" },
    placementStatus: "working",
  },
  {
    id: "meyer-turku",
    name: "Meyer Turku",
    logo: { src: "/assets/sponsors/meyer-turku.png", width: 1058, height: 304 },
    briefing: { venue: "educity", floor: 2, room: "2030", roomName: "Evert" },
    qa: { venue: "joki", floor: 1, zone: "Showroom" },
    placementStatus: "working",
  },
  {
    id: "apetit",
    name: "Apetit",
    logo: { src: "/assets/sponsors/Apetit.png", width: 220, height: 100 },
    briefing: { venue: "educity", floor: 2, room: "2027", roomName: "Frans" },
    qa: { venue: "joki", floor: 1, zone: "Showroom" },
    placementStatus: "working",
  },
] as const;

/** Whether the company has a Saturday stand at Joki. A remote partner has none. */
export function hasStand(company: ChallengeCompany): company is StandCompany {
  return company.qa !== undefined;
}

/** The companies with a stand at Joki: every challenge partner except a remote one. */
export const STAND_COMPANIES: readonly StandCompany[] = CHALLENGE_COMPANIES.filter(hasStand);

export function getCompany(id: string): ChallengeCompany | undefined {
  return CHALLENGE_COMPANIES.find((c) => c.id === id);
}

/** "1001 Dromberg", "2006 / 2007", "3006" */
export function briefingRoomLabel(company: ChallengeCompany): string {
  const { room, roomName } = company.briefing;
  return roomName ? `${room} ${roomName}` : room;
}

/** "Joki · Floor 1 · Showroom", "Joki · Floor 3", "Remote · Discord" */
export function qaLocationLabel(company: ChallengeCompany): string {
  if (!hasStand(company)) return "Remote · Discord";
  const { floor, zone } = company.qa;
  return zone.toLowerCase().startsWith("floor") ? `Joki · Floor ${floor}` : `Joki · Floor ${floor} · ${zone}`;
}

/**
 * The challenge partner schedule with this company's own room and stand filled
 * in — used on the company page and in its calendar file.
 */
export function companySchedule(company: ChallengeCompany): ScheduleItem[] {
  if (!hasStand(company)) return remoteCompanySchedule(company);
  const room = `Room ${briefingRoomLabel(company)} · floor ${company.briefing.floor}`;
  const stand = `Your stand · ${qaLocationLabel(company).replace("Joki · ", "")}`;
  const standDetail = qaStandSentence(company);
  const own: Record<string, { detail?: string; placeDetail?: string }> = {
    "fri-move-to-briefings": { placeDetail: room },
    "fri-briefings": { placeDetail: room },
    "sat-cp-arrival": { detail: standDetail, placeDetail: stand },
    "sat-qa-morning": { placeDetail: stand },
    "sat-qa-afternoon": { placeDetail: stand },
  };
  return scheduleFor("challenge-partners").map((item) => {
    const patch = own[item.id];
    if (!patch) return item;
    return {
      ...item,
      detailFor: patch.detail ? { ...item.detailFor, "challenge-partners": patch.detail } : item.detailFor,
      placeDetailFor: patch.placeDetail
        ? { ...item.placeDetailFor, "challenge-partners": patch.placeDetail }
        : item.placeDetailFor,
    };
  });
}

/**
 * A remote partner's timeline: only what it does itself, with the on-site
 * partner's arrivals, stands, meals and briefings left out.
 */
function remoteCompanySchedule(company: ChallengeCompany): ScheduleItem[] {
  const room = `Room ${briefingRoomLabel(company)} · floor ${company.briefing.floor}`;
  const own: Record<string, Partial<ScheduleItem>> = {
    "fri-move-to-briefings": {
      titleFor: { "challenge-partners": `Teams arrive at room ${briefingRoomLabel(company)}` },
      detailFor: {
        "challenge-partners": "From 18:30 volunteers guide the teams to the rooms in turn. A Since AI host receives them.",
      },
      placeDetailFor: { "challenge-partners": room },
    },
    "fri-briefings": {
      detailFor: {
        "challenge-partners": `A Since AI host in the room introduces the challenge, shows your approved brief on screen and runs the AV and the video call. Your experts join by video to give context and answer questions, which the teams ask in the room. Share materials only with the teams that chose ${company.name}. 19:30 is a hard end for every briefing.`,
      },
      placeDetailFor: { "challenge-partners": `${room} · by video` },
    },
    "sun-evaluation": {
      place: "app",
      detailFor: {
        "challenge-partners":
          "Your evaluator reviews the submissions to your challenge remotely in sinceai.app and confirms your top three teams to Since AI by 13:00 at the latest. There is no need to travel to EduCity.",
      },
      placeDetailFor: { "challenge-partners": "Remote" },
    },
    "sun-closing": {
      detailFor: {
        "challenge-partners": "Since AI announces your top three teams at EduCity. There is no need to travel.",
      },
    },
  };
  const saturday: ScheduleItem = {
    id: "sat-remote-support",
    start: "2026-11-07T00:00:00+02:00",
    allDay: true,
    title: "Remote technical support on Discord",
    detail: `No stand at Joki. ${company.name}'s experts answer teams' technical questions in its Discord channel. ${remoteSupportStatement(company)}.`,
    place: "app",
    placeDetail: "Discord",
    audiences: ["challenge-partners"],
    kind: "note",
    status: company.remote?.supportWindows.length ? "confirmed" : "pending",
  };
  const items = scheduleFor("challenge-partners")
    .filter((item) => item.id === "sun-submission-deadline" || item.id in own)
    .map((item) => ({ ...item, ...own[item.id] }));
  const firstSunday = items.findIndex((item) => item.start.startsWith("2026-11-08"));
  return [...items.slice(0, firstSunday), saturday, ...items.slice(firstSunday)];
}

/** A remote partner's Discord hours, only once it has confirmed them. */
export function remoteSupportStatement(company: ChallengeCompany): string {
  const windows = company.remote?.supportWindows ?? [];
  return windows.length ? `Remote support: ${windows.join(", ")} (EET)` : "Remote support schedule to be confirmed";
}

/** The map id of a company's Q&A stand. */
export function standMapId(company: StandCompany): string {
  return company.qa.floor === 1 ? "joki-showroom" : "joki-2-3";
}

/** Map ids used for a company's briefing room and Q&A stand (null without a stand). */
export function companyMapIds(company: ChallengeCompany): { briefing: string; qa: string | null } {
  return {
    briefing: `educity-${company.briefing.floor}`,
    qa: hasStand(company) ? standMapId(company) : null,
  };
}

/**
 * Showroom stand order along the curved LED wall, entrance → north
 * (from the 2 Oct Joki showroom map).
 */
export const SHOWROOM_ORDER = ["meyer-turku", "dna", "apetit", "elisa", "turku-energia", "bayer"] as const;

/** Counter number along the Showroom LED wall, counted from the entrance (1–6). */
export function showroomCounter(company: ChallengeCompany): number | undefined {
  const index = (SHOWROOM_ORDER as readonly string[]).indexOf(company.id);
  return index === -1 ? undefined : index + 1;
}

/** One sentence on where the company's Saturday Q&A stand is. */
export function qaStandSentence(company: StandCompany): string {
  const counter = showroomCounter(company);
  if (company.qa.floor === 1) {
    return counter
      ? `Your stand is counter ${counter} of ${SHOWROOM_ORDER.length} along the curved LED wall in the round Showroom on Joki floor 1 (up the ramp from the Aula), counted from the entrance.`
      : "Your stand is in the round Showroom on Joki floor 1 (up the ramp from the Aula), along the curved LED wall.";
  }
  return `Your stand is on floor ${company.qa.floor} of the Joki tower — take the tower stairs or the lift from floor 1.`;
}
