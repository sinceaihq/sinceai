import { render, screen, within } from "@testing-library/react";
import { RouteLinks } from "@/components/guide/RouteLinks";
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
});
