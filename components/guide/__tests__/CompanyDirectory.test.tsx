import { act, render, screen, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import { CompanyDirectory } from "@/components/guide/CompanyDirectory";
import { CHALLENGE_COMPANIES } from "@/lib/hackathon-2026";

describe("CompanyDirectory", () => {
  it("lists all 15 challenge companies with their room and Q&A floor", () => {
    render(<CompanyDirectory companies={CHALLENGE_COMPANIES} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(15);

    const elisa = document.getElementById("company-elisa")!;
    expect(within(elisa).getByText("1001 Dromberg")).toBeInTheDocument();
    expect(within(elisa).getByText("Joki · Floor 1 · Showroom")).toBeInTheDocument();
    expect(within(elisa).getByRole("link", { name: /Elisa page/ })).toHaveAttribute(
      "href",
      "/hackathon-2026/guide/challenge-partners/elisa",
    );
  });

  it("filters by company name, ignoring accents", async () => {
    render(<CompanyDirectory companies={CHALLENGE_COMPANIES} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Find your company" }), "lindstrom");
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByText("2004 Johannes")).toBeInTheDocument();
  });

  it("filters by room number", async () => {
    render(<CompanyDirectory companies={CHALLENGE_COMPANIES} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Find your company" }), "2030");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Meyer Turku")).toBeInTheDocument();
  });

  it("explains an empty result", async () => {
    render(<CompanyDirectory companies={CHALLENGE_COMPANIES} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Find your company" }), "zzz");
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByText(/No match/)).toBeInTheDocument();
  });

  it("keeps text typed before hydration (slow phones)", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<CompanyDirectory companies={CHALLENGE_COMPANIES} />);
    document.body.appendChild(container);
    (container.querySelector('input[type="search"]') as HTMLInputElement).value = "traficom";
    await act(async () => {
      hydrateRoot(container, <CompanyDirectory companies={CHALLENGE_COMPANIES} />);
    });
    expect(container.querySelectorAll('[id^="company-"]')).toHaveLength(1);
    expect(container.querySelector("#company-traficom")).not.toBeNull();
    container.remove();
  });
});
