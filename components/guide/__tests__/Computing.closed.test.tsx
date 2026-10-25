import { render, screen } from "@testing-library/react";
import { ComputingCallout, ComputingSection } from "@/components/guide/Computing";

// Its own file: the guide clock is shared per page (module state), so a later moment needs a fresh module.
window.history.replaceState(null, "", "/hackathon-2026/guide?now=2026-10-31T00:01");

describe("CSC / LUMI computing resources, after the deadline", () => {
  it("says registration has closed instead of asking people to register", () => {
    render(<ComputingSection />);
    const section = screen.getByRole("region", { name: /CSC \/ LUMI AI Factory/ });
    expect(section.querySelector('[data-computing-status="open"]')).toBeNull();
    expect(section.querySelector('[data-computing-status="closed"]')).toHaveTextContent(
      /Registration closed on Friday 30 October 2026, and nobody can newly join/,
    );
    expect(section).not.toHaveTextContent("Register by");
    // Help and the public pages stay.
    expect(screen.getByRole("link", { name: "info@sinceai.fi" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^LUMI supercomputer/ })).toBeInTheDocument();
  });

  it("removes the hero callout", () => {
    const { container } = render(<ComputingCallout />);
    expect(container).toBeEmptyDOMElement();
  });
});
