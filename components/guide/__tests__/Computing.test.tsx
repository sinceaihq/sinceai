import { render, screen, within } from "@testing-library/react";
import { ComputingCallout, ComputingNote, ComputingSection } from "@/components/guide/Computing";

// A fixed moment before CSC's deadline, so the test does not change with the calendar.
window.history.replaceState(null, "", "/hackathon-2026/guide?now=2026-10-26T12:00");

describe("CSC / LUMI computing resources, before the deadline", () => {
  it("is a labelled section with the ai-resources anchor", () => {
    render(<ComputingSection />);
    const section = screen.getByRole("region", { name: "CSC / LUMI AI Factory computing resources." });
    expect(section).toHaveAttribute("id", "ai-resources");
  });

  it("answers the six questions: what, optional, who, when, where, help", () => {
    render(<ComputingSection />);
    const section = screen.getByRole("region", { name: /CSC \/ LUMI AI Factory/ });
    // What
    expect(within(section).getByRole("link", { name: /^LUMI supercomputer/ })).toHaveAttribute("href", "https://lumi-supercomputer.eu/");
    expect(within(section).getByRole("link", { name: /^Aitta inference service/ })).toHaveAttribute("href", "https://aitta.csc.fi/");
    // Optional
    expect(within(section).getByText("Optional")).toBeInTheDocument();
    expect(section).toHaveTextContent(/you can take part in the hackathon without them/);
    // When
    const status = section.querySelector('[data-computing-status="open"]') as HTMLElement;
    expect(status).toHaveTextContent("Register by");
    expect(within(status).getByText("Friday 30 October 2026")).toBeInTheDocument();
    expect(status).toHaveTextContent(/several days/);
    // Who
    expect(within(section).getByRole("heading", { name: "Who can register" })).toBeInTheDocument();
    expect(section).toHaveTextContent(/EU Member State or a Horizon Europe-associated country/);
    expect(section).toHaveTextContent(/own institutional email address/);
    // Where
    expect(within(section).getByRole("heading", { name: "Where are the registration instructions?" })).toBeInTheDocument();
    expect(section).toHaveTextContent(/acceptance or welcome email, or the email of 25 October with “SUPERCOMPUTER” in the subject/);
    expect(section).toHaveTextContent(/not published on this website/);
    // Help
    expect(within(section).getByRole("link", { name: "info@sinceai.fi" })).toHaveAttribute("href", "mailto:info@sinceai.fi");
    expect(section).toHaveTextContent(/LUMI AI Factory experts are on site/);
  });

  it("opens every external link safely and offers no way to join the project directly", () => {
    render(<ComputingSection />);
    const section = screen.getByRole("region", { name: /CSC \/ LUMI AI Factory/ });
    const links = within(section).getAllByRole("link");
    for (const link of links) {
      const href = link.getAttribute("href")!;
      if (href.startsWith("mailto:")) continue;
      expect(new URL(href).hostname).toMatch(/^(lumi-supercomputer\.eu|aitta\.csc\.fi|lumi-ai-factory\.github\.io)$/);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveTextContent("(opens in a new tab)");
    }
    expect(within(section).queryByRole("link", { name: /join|register now|invitation/i })).toBeNull();
  });

  it("the hero callout links to the hub section with the deadline", () => {
    render(<ComputingCallout />);
    const link = screen.getByRole("link", { name: /Register by Fri 30 Oct/ });
    expect(link).toHaveAttribute("href", "/hackathon-2026/guide#ai-resources");
    expect(link).toHaveTextContent(/Optional/);
    expect(link).toHaveTextContent(/instructions are in your Since AI email/);
  });

  it("on the hub the callout is a plain in-page link, so it keeps the query and works without JavaScript", () => {
    render(<ComputingCallout inPage />);
    expect(screen.getByRole("link", { name: /Register by Fri 30 Oct/ })).toHaveAttribute("href", "#ai-resources");
  });

  it("the builder guide note links to the same section", () => {
    render(<ComputingNote />);
    expect(screen.getByRole("link", { name: "AI resources in the Field Guide" })).toHaveAttribute(
      "href",
      "/hackathon-2026/guide#ai-resources",
    );
    expect(screen.getByText(/Friday 30 October 2026 deadline/)).toBeInTheDocument();
  });
});
