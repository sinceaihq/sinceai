import { render, screen, within } from "@testing-library/react";
import { Judges } from "@/components/sections/hackathon/Judges";

describe("Judges", () => {
  it("shows four equal cards: two confirmed judges and two places to be announced", () => {
    render(<Judges />);
    const section = screen.getByRole("region", { name: "Meet the judges." });
    const cards = within(section).getAllByRole("listitem");
    expect(cards).toHaveLength(4);
    expect(within(cards[0]).getByRole("heading", { name: "Sarita Runeberg" })).toBeInTheDocument();
    expect(within(cards[1]).getByRole("heading", { name: "Niko Elers" })).toBeInTheDocument();
    for (const card of cards.slice(2)) {
      expect(within(card).getByRole("heading", { name: "Judge to be announced" })).toBeInTheDocument();
      expect(within(card).getByText("More judges will be announced soon.")).toBeInTheDocument();
      expect(within(card).queryByRole("link")).not.toBeInTheDocument();
    }
  });

  it("shows both judges' portraits, with the source credit where one is required", () => {
    render(<Judges />);
    expect(screen.getByRole("img", { name: "Portrait of Sarita Runeberg, CEO of Maria 01" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Portrait of Niko Elers, Investment Director at Voima Ventures" })).toBeInTheDocument();
    expect(screen.getByText("Photo: Voima Ventures")).toBeInTheDocument();
    expect(screen.queryByText("NE")).not.toBeInTheDocument();
  });

  it("links each organisation and profile safely in a new tab", () => {
    render(<Judges />);
    expect(screen.getByRole("link", { name: /^Maria 01/ })).toHaveAttribute("href", "https://maria.io/");
    expect(screen.getByRole("link", { name: /^Voima Ventures/ })).toHaveAttribute("href", "https://voimaventures.com/");
    const profile = screen.getByRole("link", { name: "Niko Elers on LinkedIn (opens in a new tab)" });
    expect(profile).toHaveAttribute("href", "https://www.linkedin.com/in/niko-elers-7a87a941/");
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("keeps the panel separate from company evaluation", () => {
    render(<Judges />);
    expect(screen.getByText(/Company challenges are evaluated separately/)).toBeInTheDocument();
  });
});
