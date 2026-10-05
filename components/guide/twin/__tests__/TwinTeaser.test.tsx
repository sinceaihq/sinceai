import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { getPlace3D, PLACES_3D, TARGETS_3D } from "@/lib/hackathon-2026/twin";
import { portraitPosterFor, posterFor, TWIN_POSTERS, twinHref, TwinTeaser } from "@/components/guide/twin/TwinTeaser";

const VENUE = "/hackathon-2026/guide/venue";

describe("TwinTeaser", () => {
  it("links a company to its place in the 3D and names it", () => {
    const company = TARGETS_3D.find((t) => t.kind === "company")!;
    render(<TwinTeaser focus={company.id} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `${VENUE}?focus=${company.id}#preview-3d`);
    expect(link).toHaveTextContent(company.label);
    expect(link).toHaveTextContent(company.detail);
    expect(link).toHaveTextContent("Explore in 3D");
    const img = link.querySelector("img")!;
    expect(img).toHaveAttribute("alt", "");
    expect(img.getAttribute("src")).toContain(posterFor(getPlace3D(company.place)));
  });

  it("maps partner ids to their stand", () => {
    expect(twinHref({ focus: "red-hat" })).toBe(`${VENUE}?focus=bc-1#preview-3d`);
  });

  it("opens a place", () => {
    render(<TwinTeaser place="biocity" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", `${VENUE}?place=biocity#preview-3d`);
    expect(screen.getByRole("link")).toHaveTextContent(getPlace3D("biocity").title);
    // The old teaser was used as <Venue3DTeaser focus="biocity" /> — a place name works as focus too.
    expect(twinHref({ focus: "biocity" })).toBe(`${VENUE}?place=biocity#preview-3d`);
  });

  it("opens a place on one of its views", () => {
    render(<TwinTeaser place="biocity" view="stands" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", `${VENUE}?place=biocity&view=stands#preview-3d`);
    expect(screen.getByRole("link")).toHaveTextContent("BioCity · Partner stands");
    // The default view and unknown views keep the plain place link.
    expect(twinHref({ place: "biocity", view: "default" })).toBe(`${VENUE}?place=biocity#preview-3d`);
    expect(twinHref({ place: "biocity", view: "nope" })).toBe(`${VENUE}?place=biocity#preview-3d`);
    // A target wins over a view.
    expect(twinHref({ focus: "elisa", view: "stands" })).toBe(`${VENUE}?focus=elisa#preview-3d`);
  });

  it("links a route", () => {
    expect(twinHref({ tour: "builders-transfer-to-build" })).toBe(`${VENUE}?tour=builders-transfer-to-build#preview-3d`);
    // With where it leads: a company's own room or stand (the route's own end adds nothing).
    expect(twinHref({ tour: "partners-fri-train-edu", focus: "room-elisa" })).toBe(
      `${VENUE}?tour=partners-fri-train-edu&focus=room-elisa#preview-3d`,
    );
    expect(twinHref({ tour: "partners-fri-train-edu", focus: "company-arrival" })).toBe(
      `${VENUE}?tour=partners-fri-train-edu#preview-3d`,
    );
    // Unknown routes fall back to the plain link.
    expect(twinHref({ tour: "nope" })).toBe(`${VENUE}#preview-3d`);
  });

  it("opens the default view without props", () => {
    render(<TwinTeaser />);
    expect(screen.getByRole("link")).toHaveAttribute("href", `${VENUE}#preview-3d`);
    expect(screen.getByRole("link")).toHaveTextContent(PLACES_3D[0].title);
  });

  it("uses one poster per place, falling back to the place's own poster", () => {
    for (const p of PLACES_3D) {
      expect(posterFor(p)).toBe(TWIN_POSTERS[p.id] ?? p.poster);
      expect(posterFor(p)).toMatch(/^\/assets\/guide\/3d\/.+\.(webp|png|jpg)$/);
      // The twin's own posters come with a portrait framing for phones; previous-preview posters do not.
      expect(portraitPosterFor(p)).toBe(TWIN_POSTERS[p.id] ? null : p.poster.replace(".webp", "-portrait.webp"));
      // Every poster the page asks for is in public/ (a missing one would show an empty box before the 3D).
      for (const src of [posterFor(p), portraitPosterFor(p)].filter((x): x is string => !!x)) {
        expect(fs.existsSync(path.join(process.cwd(), "public", src))).toBe(true);
      }
    }
  });
});
