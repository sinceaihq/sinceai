import { render, screen } from "@testing-library/react";
import { PartnerDiscord } from "@/components/guide/PartnerDiscord";

describe("PartnerDiscord", () => {
  it("challenge partners: invite, nickname example, the challenge channel and the Discord Guide", () => {
    render(<PartnerDiscord audience="challenge-partners" company="Elisa" />);
    const join = screen.getByRole("link", { name: /Join the Since AI Discord/ });
    expect(join).toHaveAttribute("href", "https://discord.gg/vMWdrVUPws");
    expect(join).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText(/“Anna \| Elisa”/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your challenge channel" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /step-by-step Discord Guide/ })).toHaveAttribute(
      "href",
      "/hackathon-2026/guide/discord#setup",
    );
    expect(screen.getByRole("link", { name: "here's how" })).toHaveAttribute(
      "href",
      "/hackathon-2026/guide/discord#notifications",
    );
  });

  it("tech / visibility partners: same onboarding, no challenge channel or judging", () => {
    const { container } = render(<PartnerDiscord audience="partners" />);
    expect(screen.getByRole("heading", { name: "Your partner channel" })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/challenge channel|judg|evaluat/i);
    expect(container.textContent).toMatch(/office hours/);
  });
});
