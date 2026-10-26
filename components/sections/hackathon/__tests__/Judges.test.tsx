import { render, screen, within } from "@testing-library/react";
import { Judges } from "@/components/sections/hackathon/Judges";

describe("Judges", () => {
  it("shows the complete five-judge panel, with no place left to be announced", () => {
    render(<Judges />);
    const section = screen.getByRole("region", { name: "Meet the judges." });
    const cards = within(section).getAllByRole("listitem");
    expect(cards).toHaveLength(5);
    expect(within(cards[0]).getByRole("heading", { name: "Sarita Runeberg" })).toBeInTheDocument();
    expect(within(cards[1]).getByRole("heading", { name: "Niko Elers" })).toBeInTheDocument();
    expect(within(cards[2]).getByRole("heading", { name: "Tuomas Mäkilä" })).toBeInTheDocument();
    expect(within(cards[3]).getByRole("heading", { name: "Rasmus Harmaala" })).toBeInTheDocument();
    expect(within(cards[4]).getByRole("heading", { name: "Chandra Challagonda" })).toBeInTheDocument();
    expect(within(cards[4]).getByText("Chief Executive Officer")).toBeInTheDocument();
    expect(within(section).queryByRole("heading", { name: "Judge to be announced" })).not.toBeInTheDocument();
    expect(within(section).queryByText("Coming soon")).not.toBeInTheDocument();
  });

  it("shows every judge's portrait, with the source credit where one is required", () => {
    render(<Judges />);
    expect(screen.getByRole("img", { name: "Portrait of Sarita Runeberg, CEO of Maria 01" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Portrait of Niko Elers, Investment Director at Voima Ventures" })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Portrait of Tuomas Mäkilä, Associate Professor at the University of Turku" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Portrait of Rasmus Harmaala, deep tech investor at Inovexus" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Portrait of Chandra Challagonda, CEO of FIWARE Foundation" })).toBeInTheDocument();
    expect(screen.getByText("Photo: Voima Ventures")).toBeInTheDocument();
    expect(screen.getByText("Photo: University of Turku")).toBeInTheDocument();
    for (const fallback of ["SR", "NE", "TM", "RH", "CC"]) expect(screen.queryByText(fallback)).not.toBeInTheDocument();
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
    expect(screen.getByRole("link", { name: /^Inovexus/ })).toHaveAttribute("href", "https://inovexus.com/");
    expect(screen.getByRole("link", { name: "Rasmus Harmaala on LinkedIn (opens in a new tab)" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/rasmus-harmaala/",
    );
    expect(screen.getByRole("link", { name: /^FIWARE Foundation/ })).toHaveAttribute("href", "https://fiware.org/");
    expect(screen.getByRole("link", { name: "Chandra Challagonda on LinkedIn (opens in a new tab)" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/challagonda/",
    );
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("lays five cards out without a lone card at the left of a row", () => {
    render(<Judges />);
    const list = screen.getByRole("region", { name: "Meet the judges." }).querySelector("ul")!;
    expect(list).toHaveClass("grid-cols-1", "sm:grid-cols-4", "lg:grid-cols-6", "xl:grid-cols-5");
    const cards = within(list).getAllByRole("listitem");
    for (const card of cards) expect(card).toHaveClass("sm:col-span-2", "xl:col-span-1", "xl:col-start-auto");
    // Tablet 2 + 2 + 1 with the last card centred; laptop 3 + 2 with the second row centred.
    expect(cards[4]).toHaveClass("sm:col-start-2");
    expect(cards[4]).not.toHaveClass("lg:col-start-2");
    expect(cards[3]).toHaveClass("lg:col-start-2");
    for (const card of cards.slice(0, 3)) expect(card.className).not.toMatch(/col-start-[1-9]/);
  });

  it("keeps the panel separate from company evaluation", () => {
    render(<Judges />);
    expect(screen.getByText(/Company challenges are evaluated separately/)).toBeInTheDocument();
  });
});
