import { render, screen } from "@testing-library/react";
import { Accommodation } from "@/components/guide/Accommodation";

function at(now: string) {
  window.history.replaceState(null, "", `/hackathon-2026/guide?now=${encodeURIComponent(now)}`);
}

describe("Accommodation", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("shows the five offers with copyable codes and safe external links", () => {
    at("2026-10-06T10:00");
    render(<Accommodation />);
    const offers = screen.getAllByRole("listitem");
    expect(offers).toHaveLength(5);
    expect(screen.getByText("BSINCEAI")).toBeInTheDocument();
    expect(screen.getByText("BOBWSINCEAI26")).toBeInTheDocument();
    expect(screen.getAllByText("SINCEAI2026")).toHaveLength(2);
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(screen.getByRole("link", { name: /View discounted Scandic rates/ })).toHaveAttribute(
      "href",
      "https://www.scandichotels.com/fi?bookingCode=CGRO",
    );
    expect(screen.getByRole("button", { name: /Copy the code BSINCEAI/ })).toBeInTheDocument();
  });
});
