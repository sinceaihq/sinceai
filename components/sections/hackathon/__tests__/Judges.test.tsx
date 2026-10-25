import { render, screen, within } from "@testing-library/react";
import { Judges } from "@/components/sections/hackathon/Judges";

describe("Judges", () => {
  it("shows four equal cards: three confirmed judges and one place to be announced", () => {
    render(<Judges />);
    const section = screen.getByRole("region", { name: "Meet the judges." });
    const cards = within(section).getAllByRole("listitem");
    expect(cards).toHaveLength(4);
    expect(within(cards[0]).getByRole("heading", { name: "Sarita Runeberg" })).toBeInTheDocument();
    expect(within(cards[1]).getByRole("heading", { name: "Niko Elers" })).toBeInTheDocument();
    expect(within(cards[2]).getByRole("heading", { name: "Tuomas Mäkilä" })).toBeInTheDocument();
    for (const card of cards.slice(3)) {
      expect(within(card).getByRole("heading", { name: "Judge to be announced" })).toBeInTheDocument();
      expect(within(card).getByText("More judges will be announced soon.")).toBeInTheDocument();
      expect(within(card).queryByRole("link")).not.toBeInTheDocument();
    }
  });

  it("shows every judge's portrait, with the source credit where one is required", () => {
    render(<Judges />);
    expect(screen.getByRole("img", { name: "Portrait of Sarita Runeberg, CEO of Maria 01" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Portrait of Niko Elers, Investment Director at Voima Ventures" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Portrait of Tuomas Mäkilä, Associate Professor at the University of Turku" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Photo: Voima Ventures")).toBeInTheDocument();
    expect(screen.getByText("Photo: University of Turku")).toBeInTheDocument();
    for (const fallback of ["SR", "NE", "TM"]) expect(screen.queryByText(fallback)).not.toBeInTheDocument();
  });

  it("links each organisation and profile safely in a new tab", () => {
    render(<Judges />);
    expect(screen.getByRole("link", { name: /^Maria 01/ })).toHaveAttribute("href", "https://maria.io/");
    expect(screen.getByRole("link", { name: /^Voima Ventures/ })).toHaveAttribute("href", "https://voimaventures.com/");
    const profile = screen.getByRole("link", { name: "Niko Elers on LinkedIn (opens in a new tab)" });
    expect(profile).toHaveAttribute("href", "https://www.linkedin.com/in/niko-elers-7a87a941/");
    expect(screen.getByRole("link", { name: /^University of Turku/ })).toHaveAttribute("href", "https://www.utu.fi/en");
    expect(screen.getByRole("link", { name: "Tuomas Mäkilä on LinkedIn (opens in a new tab)" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/mckila/",
    );
    expect(
      screen.getByRole("link", { name: "Tuomas Mäkilä on the University of Turku website (opens in a new tab)" }),
    ).toHaveAttribute("href", "https://www.utu.fi/en/people/tuomas-makila");
    expect(screen.getByRole("link", { name: "Tuomas Mäkilä on Google Scholar (opens in a new tab)" })).toHaveAttribute(
      "href",
      "https://scholar.google.com/citations?user=fhE_eJYAAAAJ",
    );
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
