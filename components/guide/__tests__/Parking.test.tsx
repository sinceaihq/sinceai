import { render, screen, within } from "@testing-library/react";
import { ParkingNote, ParkingSection, ParkingSummary } from "@/components/guide/Parking";

describe("Parking", () => {
  it("shows every car park with price, hours, walk and safe external links", () => {
    const { container } = render(<ParkingSection />);
    expect(container.querySelectorAll("[data-parking]")).toHaveLength(5);
    const pc = container.querySelector<HTMLElement>("#parking-parkcity")!;
    expect(within(pc).getByRole("heading", { name: "ParkCity" })).toBeInTheDocument();
    expect(within(pc).getByText(/Entry daily 06:00–00:00/)).toBeInTheDocument();
    expect(within(pc).getByText(/service fee/)).toBeInTheDocument();
    expect(within(pc).getByRole("link", { name: "Driving directions to ParkCity (opens in a new tab)" })).toHaveAttribute(
      "href",
      expect.stringContaining("destination=60.449441%2C22.297308"),
    );
    expect(within(pc).getByRole("link", { name: /Show in 3D/ })).toHaveAttribute("href", "/hackathon-2026/guide/venue?focus=parkcity#preview-3d");
    const edu = container.querySelector<HTMLElement>("#parking-educity-guest")!;
    expect(within(edu).queryByRole("link", { name: /Driving directions/ })).not.toBeInTheDocument();
    expect(within(edu).queryByRole("link", { name: /Show in 3D/ })).not.toBeInTheDocument();
    for (const a of container.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')) {
      expect(a).toHaveAttribute("target", "_blank");
      expect(a).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(screen.getByRole("heading", { name: "Free street parking?" })).toBeInTheDocument();
    expect(screen.getByText(/P-Intelligate .* hotel/i)).toBeInTheDocument();
  });

  it("summary: the recommendation and the 24/7 back-up, linking to the full guide", () => {
    const { container } = render(<ParkingSummary extra={["Drop-off note."]} />);
    expect([...container.querySelectorAll("[data-parking]")].map((e) => e.getAttribute("data-parking"))).toEqual([
      "parkcity",
      "p-station-kupittaa",
    ]);
    expect(screen.getByText("Drop-off note.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All parking options/ })).toHaveAttribute("href", "/hackathon-2026/guide/venue#parking");
  });

  it("note: one line for the other guides", () => {
    render(<ParkingNote />);
    expect(screen.getByRole("link", { name: "Prices, hours and directions" })).toHaveAttribute("href", "/hackathon-2026/guide/venue#parking");
  });
});
