import { scheduleFor } from "./schedule";
import type { ChallengeCompany, ScheduleItem } from "./types";

/**
 * The 15 challenge companies with their Friday briefing room (EduCity) and
 * Saturday Q&A location (Joki).
 *
 * Source: 2 Oct 2026 placement maps, as compiled on 3 Oct 2026. Placements are
 * `working` until production locks them — change a room here and every page,
 * map highlight and 3D label follows.
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
    id: "revvity",
    name: "Revvity",
    logo: { src: "/assets/sponsors/revvity.png", width: 797, height: 261 },
    briefing: { venue: "educity", floor: 1, room: "1090", roomName: "Ringsberg" },
    qa: { venue: "joki", floor: 2, zone: "Floor 2" },
    placementStatus: "working",
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
    briefing: {
      venue: "educity",
      floor: 2,
      room: "2072",
      roomName: "Työkahvila / Aurinkokylpy",
    },
    qa: { venue: "joki", floor: 3, zone: "Floor 3" },
    placementStatus: "working",
  },
  {
    id: "bo-lkv",
    name: "Bo LKV",
    logo: { src: "/assets/sponsors/Bo.png", width: 500, height: 577 },
    briefing: { venue: "educity", floor: 2, room: "2001", roomName: "Elias" },
    qa: { venue: "joki", floor: 3, zone: "Floor 3" },
    placementStatus: "working",
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
    name: "Forcit Group",
    logo: { src: "/assets/sponsors/Forcit-Group.png", width: 500, height: 107 },
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
    id: "saarioinen",
    name: "Saarioinen",
    // No approved logo file in the repository — the UI renders the name.
    briefing: { venue: "educity", floor: 2, room: "2067" },
    qa: { venue: "joki", floor: 3, zone: "Floor 3" },
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
    briefing: { venue: "educity", floor: 2, room: "2029 / 2031" },
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

export function getCompany(id: string): ChallengeCompany | undefined {
  return CHALLENGE_COMPANIES.find((c) => c.id === id);
}

/** "1001 Dromberg", "2006 / 2007" */
export function briefingRoomLabel(company: ChallengeCompany): string {
  const { room, roomName } = company.briefing;
  return roomName ? `${room} ${roomName}` : room;
}

/** "Joki · Floor 1 · Showroom", "Joki · Floor 3" */
export function qaLocationLabel(company: ChallengeCompany): string {
  const { floor, zone } = company.qa;
  return zone.toLowerCase().startsWith("floor") ? `Joki · Floor ${floor}` : `Joki · Floor ${floor} · ${zone}`;
}

/**
 * The challenge partner schedule with this company's own room and stand filled
 * in — used on the company page and in its calendar file.
 */
export function companySchedule(company: ChallengeCompany): ScheduleItem[] {
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

/** Map ids used for a company's briefing room and Q&A stand. */
export function companyMapIds(company: ChallengeCompany): { briefing: string; qa: string } {
  return {
    briefing: company.briefing.floor === 1 ? "educity-1" : "educity-2",
    qa: company.qa.floor === 1 ? "joki-showroom" : "joki-2-3",
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
export function qaStandSentence(company: ChallengeCompany): string {
  const counter = showroomCounter(company);
  if (company.qa.floor === 1) {
    return counter
      ? `Your stand is counter ${counter} of ${SHOWROOM_ORDER.length} along the curved LED wall in the round Showroom on Joki's first floor, counted from the entrance.`
      : "Your stand is in the round Showroom on Joki's first floor, along the curved LED wall.";
  }
  return `Your stand is on floor ${company.qa.floor} of the Joki tower — take the tower stairs or the lift from floor 1.`;
}
