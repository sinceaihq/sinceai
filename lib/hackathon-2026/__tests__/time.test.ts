import {
  dayOf,
  formatCountdown,
  formatDayShort,
  formatTime,
  formatTimeRange,
  getNowNext,
  groupByDay,
  scheduleFor,
} from "@/lib/hackathon-2026";

const at = (iso: string) => Date.parse(iso);

describe("time formatting (always Turku time)", () => {
  it("formats times in Europe/Helsinki regardless of the runtime time zone", () => {
    expect(formatTime("2026-11-06T15:00:00Z")).toBe("17:00");
    expect(formatTime("2026-11-06T17:00:00+02:00")).toBe("17:00");
  });

  it("formats ranges and approximate times", () => {
    expect(formatTimeRange({ start: "2026-11-06T18:30:00+02:00", end: "2026-11-06T19:30:00+02:00" })).toBe(
      "18:30–19:30",
    );
    expect(formatTimeRange({ start: "2026-11-08T14:00:00+02:00", approx: true })).toBe("~14:00");
  });

  it("formats days and buckets items per event day", () => {
    expect(formatDayShort("2026-11-06T17:00:00+02:00")).toBe("Fri 6 Nov");
    expect(dayOf("2026-11-07T23:30:00+02:00")).toBe("sat");
    // 00:30 local on Sunday is still Sunday even though it is Saturday in UTC.
    expect(dayOf("2026-11-07T22:30:00Z")).toBe("sun");
    const groups = groupByDay(scheduleFor("builders"));
    expect(groups.map((g) => g.day.id)).toEqual(["fri", "sat", "sun"]);
  });

  it("formats countdowns", () => {
    expect(formatCountdown(33 * 24 * 3600 * 1000)).toBe("33 days");
    expect(formatCountdown(26 * 3600 * 1000)).toBe("1 day 2 h");
    expect(formatCountdown(5 * 3600 * 1000 + 20 * 60 * 1000)).toBe("5 h 20 min");
    expect(formatCountdown(12 * 60 * 1000)).toBe("12 min");
  });
});

describe("now / next", () => {
  const builders = scheduleFor("builders");

  it("counts down before the event", () => {
    const state = getNowNext(builders, at("2026-10-04T12:00:00+03:00"));
    expect(state.phase).toBe("before");
    if (state.phase === "before") expect(state.next?.id).toBe("fri-registration");
  });

  it("shows the live item and what is next during the event", () => {
    const state = getNowNext(builders, at("2026-11-06T18:45:00+02:00"));
    expect(state.phase).toBe("during");
    if (state.phase === "during") {
      expect(state.now.map((i) => i.id)).toContain("fri-briefings");
      expect(state.next?.id).toBe("fri-build-start");
    }
  });

  it("knows the submission deadline is next on Sunday morning", () => {
    const state = getNowNext(builders, at("2026-11-08T09:30:00+02:00"));
    expect(state.phase).toBe("during");
    if (state.phase === "during") expect(state.next?.id).toBe("sun-submission-deadline");
  });

  it("ends after 15:00 on Sunday", () => {
    expect(getNowNext(builders, at("2026-11-08T16:00:00+02:00")).phase).toBe("after");
  });
});
