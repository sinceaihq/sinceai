import { render, screen, within } from "@testing-library/react";
import { Schedule } from "@/components/guide/Schedule";
import { scheduleFor, type ScheduleItem } from "@/lib/hackathon-2026";

describe("Schedule", () => {
  it("renders the builder weekend day by day in Turku time", () => {
    render(<Schedule items={scheduleFor("builders")} audience="builders" />);
    expect(screen.getByRole("heading", { name: "Friday 6 November" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Saturday 7 November" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sunday 8 November" })).toBeInTheDocument();

    const deadline = document.getElementById("schedule-item-sun-submission-deadline")!;
    expect(within(deadline).getByText("Hard submission deadline")).toBeInTheDocument();
    // Visible time (aria-hidden) + its spoken equivalent.
    expect(within(deadline).getAllByText("10:00")).toHaveLength(2);
    expect(within(deadline).getByText("Deadline")).toBeInTheDocument();
  });

  it("uses the audience-specific title", () => {
    render(<Schedule items={scheduleFor("challenge-partners")} audience="challenge-partners" />);
    expect(screen.getAllByText("Your challenge briefing").length).toBeGreaterThan(0);
  });

  it("shows start-only times with 'end TBC' when the end is unresolved", () => {
    render(<Schedule items={scheduleFor("builders")} audience="builders" />);
    const dinner = document.getElementById("schedule-item-fri-dinner")!;
    expect(within(dinner).getByText("21:00", { selector: ".font-bold" })).toBeInTheDocument();
    expect(within(dinner).getByText("end TBC")).toBeInTheDocument();
    expect(within(dinner).getByText("21:00, end time to be confirmed")).toHaveClass("sr-only");
  });

  it("marks approximate times", () => {
    render(<Schedule items={scheduleFor("builders")} audience="builders" />);
    const awards = document.getElementById("schedule-item-sun-challenge-awards")!;
    expect(within(awards).getByText("Around 14:00")).toHaveClass("sr-only");
  });

  it("does not render items that are not for the audience", () => {
    const items: ScheduleItem[] = scheduleFor("partners");
    render(<Schedule items={items} audience="partners" />);
    expect(screen.queryByText("Team formation")).not.toBeInTheDocument();
    expect(screen.getByText("Stand teardown")).toBeInTheDocument();
  });
});
