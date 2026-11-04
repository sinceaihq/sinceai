import { render, screen, within } from "@testing-library/react";
import { BuildingHubLink, BuildingSection } from "@/components/guide/Building";
import { Details } from "@/components/guide/Details";

describe("Build & submit section", () => {
  it("is a labelled section with the building anchor and a submit sub-anchor", () => {
    render(<BuildingSection />);
    const section = screen.getByRole("region", { name: "Build with AI. Submit in sinceai.app." });
    expect(section).toHaveAttribute("id", "building");
    expect(section.querySelector("#submit")).not.toBeNull();
    expect(within(section).getByRole("heading", { name: "How to submit your project" })).toBeInTheDocument();
  });

  it("shows the AI policy without opening anything", () => {
    render(<BuildingSection />);
    const policy = document.querySelector("[data-ai-policy]") as HTMLElement;
    expect(policy.closest("details")).toBeNull();
    expect(within(policy).getByRole("heading", { name: "Build with AI. We encourage it." })).toBeVisible();
    const tools = within(within(policy).getByRole("list", { name: "Examples of AI tools you can use" })).getAllByRole("listitem");
    expect(tools.map((t) => t.textContent)).toEqual([
      "ChatGPT",
      "Claude and Claude Code",
      "Google Gemini",
      "GitHub Copilot",
      "Cursor",
      "Lovable",
      "OpenCode",
    ]);
    expect(policy).toHaveTextContent(/Disclose the main AI tools you used/);
    expect(policy).toHaveTextContent(/not a requirement/);
  });

  it("puts the platform and the deadline first, with no Devpost alternative", () => {
    render(<BuildingSection />);
    const submit = document.getElementById("submit")!;
    expect(submit).toHaveTextContent(/Official platformsinceai\.app/);
    expect(submit).toHaveTextContent(/not Devpost/);
    const deadline = within(submit).getByText("Sunday 8 November, 10:00 EET");
    expect(deadline.tagName).toBe("TIME");
    expect(deadline).toHaveAttribute("dateTime", "2026-11-08T10:00:00+02:00");
    expect(within(submit).queryByRole("link", { name: /devpost/i })).toBeNull();
  });

  it("separates required and optional fields, and lists the real file formats", () => {
    render(<BuildingSection />);
    const required = screen.getByRole("heading", { name: "Required" }).parentElement!;
    for (const name of ["Tagline", "Repository", "Demo video", "Source code", "MLH questions"]) expect(required).toHaveTextContent(name);
    expect(required).toHaveTextContent(/YouTube is the only accepted format/);
    expect(required).toHaveTextContent(/every team member ticks them personally/);
    const optional = screen.getByRole("heading", { name: "Optional" }).parentElement!;
    for (const name of ["Demo URL", "Pitch deck", "Partner technologies", "MLH prize categories"]) expect(optional).toHaveTextContent(name);
    const file = (kind: string) => document.querySelector(`[data-file-kind="${kind}"]`)!;
    expect(file("Demo video")).toHaveTextContent("YouTube link");
    expect(file("Demo video")).not.toHaveTextContent(/MP4, WebM/);
    expect(file("Source code")).toHaveTextContent("ZIP");
    expect(file("Source code").querySelector("[data-file-required]")).toHaveAttribute("data-file-required", "yes");
    expect(file("Pitch deck")).toHaveTextContent("PDF, PPT, PPTX");
    expect(file("Pitch deck").querySelector("[data-file-required]")).toHaveAttribute("data-file-required", "no");
  });

  it("shows what voters see: one card for every challenge, no links", () => {
    render(<BuildingSection />);
    const card = document.querySelector("[data-vote-card-guide]")!;
    expect(card).toHaveTextContent("What voters see");
    expect(Array.from(card.querySelectorAll("[data-vote-card-row]")).map((r) => r.getAttribute("data-vote-card-row"))).toEqual([
      "Project",
      "Tagline",
      "Description",
      "Demo video",
      "Pitch deck",
      "Built with",
    ]);
    expect(card).toHaveTextContent(/Never on the card: your repository, your demo URL or other links/);
  });

  it("numbers the six submission steps and links the dashboard safely", () => {
    render(<BuildingSection />);
    expect(screen.getByText("Everyone accepts the terms")).toBeInTheDocument();
    expect(screen.getAllByText(/^Step \d$/)).toHaveLength(6);
    // The button, and the same link in the Devpost answer.
    const links = screen.getAllByRole("link", { name: /Open your sinceai\.app dashboard \(opens in a new tab\)/ });
    expect(links.length).toBeGreaterThanOrEqual(1);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "https://sinceai.app/dashboard");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("includes the building FAQ as disclosures", () => {
    render(<BuildingSection />);
    for (const q of [
      "Can we use ChatGPT, Claude, Cursor, GitHub Copilot, Gemini, Lovable and other AI tools?",
      "Will using AI-generated code hurt our judging score?",
      "Can we use our own GitHub repositories and let AI coding agents modify the code?",
      "Where do we submit? Do we need Devpost?",
      "What should my team complete before arriving?",
    ]) {
      expect(screen.getByText(q).closest("details")).not.toBeNull();
    }
  });

  it("the hub card links to the section", () => {
    render(<BuildingHubLink />);
    expect(screen.getByRole("link", { name: /Build with AI\. Submit in sinceai\.app\./ })).toHaveAttribute(
      "href",
      "/hackathon-2026/guide/builders#building",
    );
  });
});

describe("Details", () => {
  it("renders an answer's points and links", () => {
    render(
      <Details
        items={[
          {
            q: "Question?",
            a: "Answer.",
            points: ["First", "Second"],
            links: [
              { label: "Inside", href: "/hackathon-2026/guide/venue#food" },
              { label: "Outside", href: "https://example.org/" },
            ],
          },
        ]}
      />,
    );
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["—First", "—Second"]);
    expect(screen.getByRole("link", { name: "Inside" })).not.toHaveAttribute("target");
    expect(screen.getByRole("link", { name: "Outside (opens in a new tab)" })).toHaveAttribute("target", "_blank");
  });
});
