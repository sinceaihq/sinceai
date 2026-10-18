import { getScheduleItem } from "./schedule";
import type { DayId } from "./types";
import { dayOf } from "./time";

/**
 * Food at Since AI Hackathon 2026 — the official menu and meal times
 * (organiser, 18 Oct 2026). Show only what is confirmed here: no invented
 * dishes, no extra dietary labels, no internal catering prices.
 *
 * Every meal takes its time from SCHEDULE (one source of truth for times);
 * the two breakfasts are approximate and their menus are not confirmed yet.
 * When a breakfast is confirmed, fill in its `main` here (and `servedAtMauno`
 * only if Restaurant Mauno serves it) and its `detail` in schedule.ts — the
 * guide then shows the dish instead of "Menu coming soon".
 */

/** Only labels the caterer has confirmed for a dish. */
export type DietaryLabel = "lactose-free" | "gluten-free";

export const DIETARY_LABELS: Record<DietaryLabel, string> = {
  "lactose-free": "Lactose-free",
  "gluten-free": "Gluten-free",
};

export interface Dish {
  name: string;
  labels: readonly DietaryLabel[];
}

export interface Meal {
  id: string;
  course: "Breakfast" | "Lunch" | "Dinner";
  /** ISO 8601 with the Helsinki offset. */
  start: string;
  end?: string;
  /** "Around 07:00". */
  approx?: boolean;
  /** Undefined until the menu is confirmed — shown as "Menu coming soon". */
  main?: Dish;
  dessert?: Dish;
  /** A confirmed main meal at the Restaurant Mauno buffet (warm main, bread and spread, water). */
  servedAtMauno: boolean;
}

/** A meal's times straight from the schedule. */
function scheduled(id: string): Pick<Meal, "id" | "start" | "end" | "approx"> {
  const { start, end, approx } = getScheduleItem(id);
  return { id, start, end, approx };
}

const LF: readonly DietaryLabel[] = ["lactose-free"];
const LF_GF: readonly DietaryLabel[] = ["lactose-free", "gluten-free"];

/** Every meal of the weekend, in chronological order. */
export const MEALS: readonly Meal[] = [
  {
    ...scheduled("fri-dinner"),
    course: "Dinner",
    main: { name: "Chicken pasta bake", labels: LF },
    servedAtMauno: true,
  },
  {
    ...scheduled("sat-breakfast"),
    course: "Breakfast",
    servedAtMauno: false,
  },
  {
    ...scheduled("sat-lunch"),
    course: "Lunch",
    main: { name: "Macaroni casserole", labels: LF },
    servedAtMauno: true,
  },
  {
    ...scheduled("sat-dinner"),
    course: "Dinner",
    main: { name: "Kebab and potato casserole", labels: LF_GF },
    servedAtMauno: true,
  },
  {
    ...scheduled("sun-breakfast"),
    course: "Breakfast",
    servedAtMauno: false,
  },
  {
    ...scheduled("sun-lunch"),
    course: "Lunch",
    main: { name: "Chicken tikka masala with rice", labels: LF_GF },
    dessert: { name: "Mango quark dessert", labels: LF_GF },
    servedAtMauno: true,
  },
];

export const mealsOn = (day: DayId) => MEALS.filter((meal) => dayOf(meal.start) === day);

/** The caterer of the main meals. */
export const CATERING = {
  restaurant: "Restaurant Mauno",
  venue: "biocity",
  /** Full postal address, for visitors from abroad. */
  address: "Tykistökatu 6, 20520 Turku, Finland",
  serviceStyle: "Buffet",
  /** What every confirmed main meal includes. */
  includes: ["Warm main course", "Bread and spread", "Water"],
  /** Sold separately by the restaurant — never show prices here. */
  forSale: ["sandwiches", "pastries", "coffee", "soft drinks", "energy drinks", "snacks"],
} as const;

/** Special diets: the caterer needs them in advance. */
export const DIETARY = {
  /** The caterer's last day for dietary requirements (Turku time). */
  deadline: "2026-10-30",
  deadlineLabel: "Friday 30 October 2026",
  arranged:
    "Vegetarian, vegan, gluten-free and other special dietary meals are arranged based on dietary requirements communicated to the organisers in advance.",
  collect:
    "If you have a pre-arranged special dietary meal, please collect it directly from Restaurant Mauno's open kitchen rather than the regular buffet.",
  allergies:
    "If you have food allergies or are uncertain whether a meal is suitable for you, always ask the restaurant staff before eating.",
  notGuaranteed: "Dietary requirements that were not communicated in advance cannot be guaranteed.",
  labelsNote:
    "Labels show only what the caterer has confirmed for the standard buffet. For a vegetarian, vegan or other special meal, see Special diets and allergies.",
} as const;
