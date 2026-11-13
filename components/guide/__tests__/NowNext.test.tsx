import { renderToString } from "react-dom/server";
import { NowNextLive } from "@/components/guide/NowNextLive";
import { EVENT_2026, getScheduleItem, isEventOver, scheduleFor } from "@/lib/hackathon-2026";

const items = scheduleFor("builders");
const firstMoment = getScheduleItem("fri-registration");

describe("isEventOver", () => {
  it("turns true shortly after the published end of the event, and stays true", () => {
    const end = Date.parse(EVENT_2026.eventEnd);
    expect(isEventOver(Date.parse(EVENT_2026.window.start))).toBe(false);
    expect(isEventOver(end)).toBe(false);
    expect(isEventOver(end + 15 * 60 * 1000)).toBe(true);
    expect(isEventOver(Date.parse("2026-11-13T12:00:00+02:00"))).toBe(true);
  });
});

describe("the now / next card in the server HTML (no JavaScript)", () => {
  it("says the event has ended once it is over, instead of announcing the first moment", () => {
    const html = renderToString(<NowNextLive items={items} audience="builders" firstMoment={firstMoment} endedAtBuild />);
    expect(html).toContain("Since AI Hackathon 2026 has ended");
    expect(html).toContain("That&#x27;s a wrap");
    expect(html).not.toContain("First up");
  });

  it("shows the first moment while the event is still ahead", () => {
    const html = renderToString(<NowNextLive items={items} audience="builders" firstMoment={firstMoment} />);
    expect(html).toContain("First up");
    expect(html).not.toContain("has ended");
  });
});
