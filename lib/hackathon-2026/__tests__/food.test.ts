import {
  CATERING,
  DIETARY,
  formatDayShort,
  formatTimeRange,
  getScheduleItem,
  MEALS,
  mealsOn,
  SCHEDULE,
} from "@/lib/hackathon-2026";

const summary = (id: string) => {
  const meal = MEALS.find((m) => m.id === id)!;
  return {
    when: `${formatDayShort(meal.start)} ${formatTimeRange(meal)}`,
    course: meal.course,
    main: meal.main && [meal.main.name, ...meal.main.labels],
    dessert: meal.dessert && [meal.dessert.name, ...meal.dessert.labels],
    mauno: meal.servedAtMauno,
  };
};

describe("Hackathon 2026 food (organiser, 18 Oct 2026)", () => {
  it("publishes exactly the official menu, in order", () => {
    expect(MEALS.map((m) => summary(m.id))).toEqual([
      { when: "Fri 6 Nov 18:30–21:30", course: "Dinner", main: ["Chicken pasta bake", "lactose-free"], dessert: undefined, mauno: true },
      { when: "Sat 7 Nov ~07:00", course: "Breakfast", main: undefined, dessert: undefined, mauno: false },
      { when: "Sat 7 Nov 10:30–13:30", course: "Lunch", main: ["Macaroni casserole", "lactose-free"], dessert: undefined, mauno: true },
      {
        when: "Sat 7 Nov 17:00–20:00",
        course: "Dinner",
        main: ["Kebab and potato casserole", "lactose-free", "gluten-free"],
        dessert: undefined,
        mauno: true,
      },
      { when: "Sun 8 Nov ~07:00", course: "Breakfast", main: undefined, dessert: undefined, mauno: false },
      {
        when: "Sun 8 Nov 10:00–13:00",
        course: "Lunch",
        main: ["Chicken tikka masala with rice", "lactose-free", "gluten-free"],
        dessert: ["Mango quark dessert", "lactose-free", "gluten-free"],
        mauno: true,
      },
    ]);
  });

  it("is chronological and grouped into the three event days", () => {
    const starts = MEALS.map((m) => Date.parse(m.start));
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    expect([mealsOn("fri"), mealsOn("sat"), mealsOn("sun")].map((d) => d.length)).toEqual([1, 3, 2]);
  });

  it("takes every meal time from the schedule, so they can never disagree", () => {
    expect(MEALS.map((m) => m.id)).toEqual(SCHEDULE.filter((i) => i.kind === "meal").map((i) => i.id));
    for (const meal of MEALS) {
      const item = getScheduleItem(meal.id);
      expect([meal.start, meal.end, meal.approx]).toEqual([item.start, item.end, item.approx]);
    }
  });

  it("keeps both breakfasts approximate, without a menu or a serving place", () => {
    for (const id of ["sat-breakfast", "sun-breakfast"]) {
      const meal = MEALS.find((m) => m.id === id)!;
      expect(meal.approx).toBe(true);
      expect(meal.main).toBeUndefined();
      expect(meal.servedAtMauno).toBe(false);
      expect(meal.start).toMatch(/T07:00:00\+02:00$/);
      expect(getScheduleItem(id).detail).toMatch(/^Menu coming soon/);
      expect(getScheduleItem(id).detail).not.toMatch(/Mauno/);
    }
  });

  it("never labels a standard meal vegetarian or vegan, and shows no prices", () => {
    const menu = JSON.stringify({ MEALS, CATERING });
    expect(menu).not.toMatch(/vegetarian|vegan/i);
    expect(menu).not.toMatch(/€|eur\b|\d+[.,]\d{2}/i);
  });

  it("sends pre-arranged special meals to Mauno's open kitchen", () => {
    expect(CATERING.address).toBe("Tykistökatu 6, 20520 Turku, Finland");
    expect(DIETARY.collect).toMatch(/Restaurant Mauno's open kitchen rather than the regular buffet/);
    expect(DIETARY.allergies).toMatch(/always ask the restaurant staff before eating/);
    expect(DIETARY.deadline).toBe("2026-10-30");
    expect(new Date(`${DIETARY.deadline}T12:00:00+02:00`).getUTCDay()).toBe(5); // Friday
  });
});
