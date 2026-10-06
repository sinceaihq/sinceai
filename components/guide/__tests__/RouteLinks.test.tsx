import { render, screen, within } from "@testing-library/react";
import { RouteLinks } from "@/components/guide/RouteLinks";
import { briefingRoomLabel, CHALLENGE_COMPANIES, showroomCounter } from "@/lib/hackathon-2026/companies";
import { getTour3D, tourFacts } from "@/lib/hackathon-2026/twin";

const VENUE = "/hackathon-2026/guide/venue";

describe("RouteLinks", () => {
  it("lists each route with its audience, facts and a link that plays it in the 3D", () => {
    const ids = ["partners-fri-parkcity-edu", "partners-fri-train-edu", "partners-fri-stepfree-edu"];
    render(<RouteLinks title="Getting to EduCity" ids={ids} />);
    expect(screen.getByRole("heading", { level: 3, name: "Getting to EduCity" })).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    links.forEach((link, i) => {
      const tour = getTour3D(ids[i])!;
      expect(link).toHaveAttribute("href", `${VENUE}?tour=${tour.id}#preview-3d`);
      expect(within(link).getByText(tour.label)).toBeInTheDocument();
      expect(within(link).getByText(tour.audience)).toBeInTheDocument();
      expect(link.textContent).toContain(tourFacts(tour));
      expect(link).toHaveTextContent("Walk it in 3D");
    });
  });

  it("skips unknown routes and renders nothing without any", () => {
    const { container, rerender } = render(<RouteLinks title="Routes" ids={["nope", "builders-train-checkin"]} />);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    rerender(<RouteLinks title="Routes" ids={["nope"]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("never names one company's room as everyone's destination", () => {
    const ids = ["partners-fri-parkcity-edu", "partners-fri-train-edu", "partners-fri-stepfree-edu"];
    render(<RouteLinks title="Getting to EduCity" ids={ids} />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.textContent).not.toMatch(/\b[12]0\d\d\b/);
    }
    expect(screen.getAllByRole("link")[0]).toHaveTextContent("the company briefing rooms on floors 1–2");
  });

  it("on a company's page, leads each route to that company's own room or stand (text and 3D)", () => {
    const fri = ["partners-fri-parkcity-edu", "partners-fri-train-edu", "partners-fri-stepfree-edu"];
    const sat = ["companies-tykistokatu-to-showroom", "companies-train-to-biocity", "companies-parkcity-to-biocity"];
    for (const c of CHALLENGE_COMPANIES) {
      const { unmount } = render(
        <>
          <RouteLinks title="Friday" ids={fri} company={c.id} />
          <RouteLinks title="Saturday" ids={sat} company={c.id} />
        </>,
      );
      const links = screen.getAllByRole("link");
      links.slice(0, 3).forEach((link, i) => {
        expect(link).toHaveAttribute("href", `${VENUE}?tour=${fri[i]}&focus=room-${c.id}#preview-3d`);
        expect(link).toHaveTextContent(`your briefing room for 18:15 is room ${briefingRoomLabel(c)}`);
        expect(link).toHaveTextContent("event staff meet");
        // No other company's room number.
        for (const other of CHALLENGE_COMPANIES.filter((o) => o.briefing.room !== c.briefing.room)) {
          for (const room of other.briefing.room.split(/\s*\/\s*/)) expect(link.textContent).not.toContain(room);
        }
      });
      links.slice(3).forEach((link, i) => {
        expect(link).toHaveAttribute("href", `${VENUE}?tour=${sat[i]}&focus=${c.id}#preview-3d`);
        const counter = showroomCounter(c);
        expect(link).toHaveTextContent(counter ? `counter ${counter} of 6` : `floor ${c.qa.floor}`);
      });
      unmount();
    }
  });
});
