import { render, screen, waitFor, act } from "@testing-library/react";
import { CountdownTimer } from "./countdown-timer";

// Helper to get text content from an element
const getTextContent = (element: HTMLElement) => element.textContent || "";

describe("CountdownTimer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("Initial render", () => {
    it("renders countdown with calculated values before event starts", () => {
      // Set current time to a fixed point (before event)
      const mockNow = new Date("2026-01-01T00:00:00Z").getTime();
      jest.spyOn(Date, "now").mockReturnValue(mockNow);

      const startDate = "2026-01-11T05:30:45Z";
      const endDate = "2026-01-13T00:00:00Z";
      render(<CountdownTimer startDate={startDate} endDate={endDate} />);

      // Component should show the actual countdown immediately
      expect(screen.getByText(/^10$/)).toBeInTheDocument(); // Days
      expect(screen.getByText(/^05$/)).toBeInTheDocument(); // Hours
      expect(screen.getByText(/^30$/)).toBeInTheDocument(); // Minutes
      expect(screen.getByText(/^45$/)).toBeInTheDocument(); // Seconds

      // Check labels
      expect(screen.getByText("Days")).toBeInTheDocument();
      expect(screen.getByText("Hours")).toBeInTheDocument();
      expect(screen.getByText("Minutes")).toBeInTheDocument();
      expect(screen.getByText("Seconds")).toBeInTheDocument();
    });
  });

  describe("Event states", () => {
    it('shows "Event is Live!" when event is ongoing', () => {
      // Set current time to be DURING the event
      const mockNow = new Date("2026-01-07T12:00:00Z").getTime();
      jest.spyOn(Date, "now").mockReturnValue(mockNow);

      const startDate = "2026-01-06T16:00:00Z";
      const endDate = "2026-01-09T00:00:00Z";
      render(<CountdownTimer startDate={startDate} endDate={endDate} />);

      expect(screen.getByText("Event is Live!")).toBeInTheDocument();
      expect(screen.queryByText("Days")).not.toBeInTheDocument();
    });

    it('shows "Event ended" when event has finished', () => {
      // Set current time to be AFTER the event
      const mockNow = new Date("2026-01-10T12:00:00Z").getTime();
      jest.spyOn(Date, "now").mockReturnValue(mockNow);

      const startDate = "2026-01-06T16:00:00Z";
      const endDate = "2026-01-09T00:00:00Z";
      render(<CountdownTimer startDate={startDate} endDate={endDate} />);

      expect(screen.getByText(/Event ended/)).toBeInTheDocument();
      expect(screen.queryByText("Days")).not.toBeInTheDocument();
    });
  });

  describe("Live countdown updates", () => {
    it("updates countdown values every second", async () => {
      // Use a mutable variable that we can update
      let currentTime = new Date("2026-01-01T00:00:00Z").getTime();
      jest.spyOn(Date, "now").mockImplementation(() => currentTime);

      const startDate = "2026-01-02T00:00:00Z";
      const endDate = "2026-01-03T00:00:00Z";
      render(<CountdownTimer startDate={startDate} endDate={endDate} />);

      // Initial render should show 1 day
      expect(screen.getByText(/^01$/)).toBeInTheDocument();

      // Advance time by 1 second and update the mock
      act(() => {
        currentTime += 1000;
        jest.advanceTimersByTime(1000);
      });

      // Wait for update - now should show 23:59:59
      await waitFor(() => {
        // Check that we still have 4 time units displayed
        const timeValues = screen.getAllByText(/^\d{2,3}$/);
        expect(timeValues).toHaveLength(4);
      });

      // Should have hours=23, minutes=59, seconds=59
      expect(screen.getByText(/^23$/)).toBeInTheDocument();
      const instancesOf59 = screen.getAllByText(/^59$/);
      expect(instancesOf59.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Time calculation", () => {
    it("calculates correct time for dates far in the future", () => {
      const mockNow = new Date("2026-01-01T00:00:00Z").getTime();
      jest.spyOn(Date, "now").mockReturnValue(mockNow);

      const startDate = "2026-11-01T00:00:00Z";
      const endDate = "2026-11-03T00:00:00Z";
      render(<CountdownTimer startDate={startDate} endDate={endDate} />);

      // Should show 304 days (or close to it depending on exact calculation)
      const daysValue = screen.getByText((content, element) => {
        const text = getTextContent(element as HTMLElement);
        const num = parseInt(text);
        return num >= 300 && num <= 310 && element?.tagName.toLowerCase() === "span";
      });
      expect(daysValue).toBeInTheDocument();
    });

    it("handles leap year calculations correctly", () => {
      // Use a leap year date: February 28, 2024 to March 1, 2024 (2 days including Feb 29)
      const leapMockDate = new Date("2024-02-28T00:00:00Z").getTime();
      jest.spyOn(Date, "now").mockReturnValue(leapMockDate);

      const startDate = "2024-03-01T00:00:00Z";
      const endDate = "2024-03-03T00:00:00Z";
      render(<CountdownTimer startDate={startDate} endDate={endDate} />);

      // Should show 02 days
      expect(screen.getByText(/^02$/)).toBeInTheDocument();
    });

    it("handles month boundaries correctly", () => {
      // January 31, 23:59:59 to February 1, 00:00:00
      const boundaryMockDate = new Date("2026-01-31T23:59:59Z").getTime();
      jest.spyOn(Date, "now").mockReturnValue(boundaryMockDate);

      const startDate = "2026-02-01T00:00:00Z";
      const endDate = "2026-02-03T00:00:00Z";
      render(<CountdownTimer startDate={startDate} endDate={endDate} />);

      // Should show 00 days, 00 hours, 00 minutes, 01 second
      const zeros = screen.getAllByText(/^00$/);
      expect(zeros.length).toBe(3);
      expect(screen.getByText(/^01$/)).toBeInTheDocument();
    });
  });

  describe("Component cleanup", () => {
    it("clears interval on unmount", () => {
      const mockNow = new Date("2026-01-01T00:00:00Z").getTime();
      jest.spyOn(Date, "now").mockReturnValue(mockNow);

      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      const startDate = "2026-12-01T00:00:00Z";
      const endDate = "2026-12-03T00:00:00Z";
      const { unmount } = render(<CountdownTimer startDate={startDate} endDate={endDate} />);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe("Edge cases", () => {
    it("handles exact start time (zero difference before event)", () => {
      const exactTime = new Date("2026-06-15T12:30:00Z").getTime();
      jest.spyOn(Date, "now").mockReturnValue(exactTime);

      const startDate = "2026-06-15T12:30:00Z";
      const endDate = "2026-06-17T00:00:00Z";
      render(<CountdownTimer startDate={startDate} endDate={endDate} />);

      // At exact start time, should show "Event is Live!"
      expect(screen.getByText("Event is Live!")).toBeInTheDocument();
    });

    it("handles exact end time (zero difference after event)", () => {
      const exactTime = new Date("2026-06-15T00:00:00Z").getTime();
      jest.spyOn(Date, "now").mockReturnValue(exactTime);

      const startDate = "2026-06-13T16:00:00Z";
      const endDate = "2026-06-15T00:00:00Z";
      render(<CountdownTimer startDate={startDate} endDate={endDate} />);

      // At exact end time, should show "Event ended"
      expect(screen.getByText(/Event ended/)).toBeInTheDocument();
    });

    it("pads single digit values with leading zeros", () => {
      const mockNow = new Date("2026-01-01T00:00:00Z").getTime();
      jest.spyOn(Date, "now").mockReturnValue(mockNow);

      // Target: 5 days, 3 hours, 7 minutes, 9 seconds from mock
      const startDate = "2026-01-06T03:07:09Z";
      const endDate = "2026-01-08T00:00:00Z";
      render(<CountdownTimer startDate={startDate} endDate={endDate} />);

      // Should show values with leading zeros
      expect(screen.getByText(/^05$/)).toBeInTheDocument(); // Days
      expect(screen.getByText(/^03$/)).toBeInTheDocument(); // Hours
      expect(screen.getByText(/^07$/)).toBeInTheDocument(); // Minutes
      expect(screen.getByText(/^09$/)).toBeInTheDocument(); // Seconds
    });

    it("handles very large time differences (years)", () => {
      const mockNow = new Date("2026-01-01T00:00:00Z").getTime();
      jest.spyOn(Date, "now").mockReturnValue(mockNow);

      const startDate = "2027-01-01T00:00:00Z";
      const endDate = "2027-01-03T00:00:00Z";
      render(<CountdownTimer startDate={startDate} endDate={endDate} />);

      // Should show approximately 365 days
      const allNumbers = screen.getAllByText(/^\d+$/);
      const daysElement = allNumbers.find((el) => {
        const num = parseInt(el.textContent || "0");
        return num >= 365 && num <= 366;
      });
      expect(daysElement).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("renders timer with proper semantic structure", () => {
      const mockNow = new Date("2026-01-01T00:00:00Z").getTime();
      jest.spyOn(Date, "now").mockReturnValue(mockNow);

      const startDate = "2026-12-01T00:00:00Z";
      const endDate = "2026-12-03T00:00:00Z";
      const { container } = render(<CountdownTimer startDate={startDate} endDate={endDate} />);

      // Ensure the component renders with flex container
      const timerContainer = container.querySelector(
        ".flex.items-center.justify-center"
      );
      expect(timerContainer).toBeInTheDocument();

      // Ensure all labels are present
      expect(screen.getByText("Days")).toBeInTheDocument();
      expect(screen.getByText("Hours")).toBeInTheDocument();
      expect(screen.getByText("Minutes")).toBeInTheDocument();
      expect(screen.getByText("Seconds")).toBeInTheDocument();
    });
  });
});
