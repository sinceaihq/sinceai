import { render, screen, within } from "@testing-library/react";
import { Judges } from "@/components/sections/hackathon/Judges";

describe("Judges", () => {
  it("shows the complete six-judge panel, with no place left to be announced", () => {
    render(<Judges />);
    const section = screen.getByRole("region", { name: "Meet the judges." });
    const cards = within(section).getAllByRole("listitem");
    expect(cards).toHaveLength(6);
    expect(within(cards[0]).getByRole("heading", { name: "Sarita Runeberg" })).toBeInTheDocument();
    expect(within(cards[1]).getByRole("heading", { name: "Niko Elers" })).toBeInTheDocument();
    expect(within(cards[2]).getByRole("heading", { name: "Tuomas Mäkilä" })).toBeInTheDocument();
    expect(within(cards[3]).getByRole("heading", { name: "Rasmus Harmaala" })).toBeInTheDocument();
    expect(within(cards[4]).getByRole("heading", { name: "Chandra Challagonda" })).toBeInTheDocument();
    expect(within(cards[4]).getByText("CEO of FIWARE Foundation & Group DPO at Adfinis AG")).toBeInTheDocument();
    expect(within(cards[5]).getByRole("heading", { name: "Matyas Karel Stoch" })).toBeInTheDocument();
    expect(within(cards[5]).getByText("Founding Engineer")).toBeInTheDocument();
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
    expect(screen.getByRole("img", { name: "Portrait of Matyas Karel Stoch, Founding Engineer at Cloudroom" })).toBeInTheDocument();
    expect(screen.getByText("Photo: Voima Ventures")).toBeInTheDocument();
    expect(screen.getByText("Photo: University of Turku")).toBeInTheDocument();
    for (const fallback of ["SR", "NE", "TM", "RH", "CC", "MK"]) expect(screen.queryByText(fallback)).not.toBeInTheDocument();
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
    expect(screen.getByRole("link", { name: /^Cloudroom/ })).toHaveAttribute("href", "https://www.cloudroom.dev/");
    expect(screen.getByRole("link", { name: "Matyas Karel Stoch on LinkedIn (opens in a new tab)" })).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/matyas-stoch-a77328389/",
    );
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("lays six cards out in even rows, with no lone card", () => {
    render(<Judges />);
    const list = screen.getByRole("region", { name: "Meet the judges." }).querySelector("ul")!;
    expect(list).toHaveClass("grid-cols-1", "sm:grid-cols-4", "lg:grid-cols-6");
    expect(list.className).not.toMatch(/xl:grid-cols/);
    // Tablet 2 + 2 + 2; laptop and wider 3 + 3: nothing needs centring.
    const cards = within(list).getAllByRole("listitem");
    for (const card of cards) {
      expect(card).toHaveClass("sm:col-span-2");
      expect(card.className).not.toMatch(/col-start-/);
    }
  });

  it("keeps the panel separate from company evaluation", () => {
    render(<Judges />);
    expect(screen.getByText(/Company challenges were evaluated separately/)).toBeInTheDocument();
  });
});
