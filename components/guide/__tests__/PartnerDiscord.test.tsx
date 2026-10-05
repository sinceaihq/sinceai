import { render, screen } from "@testing-library/react";
import { PartnerDiscord } from "@/components/guide/PartnerDiscord";

describe("PartnerDiscord", () => {
  it("challenge partners: invite, checklist, beginner steps and the challenge channel", () => {
    render(<PartnerDiscord audience="challenge-partners" company="Elisa" />);
    expect(screen.getByRole("link", { name: /Join the Since AI Discord/ })).toHaveAttribute("href", "https://discord.gg/vMWdrVUPws");
    expect(screen.getByRole("link", { name: /Join the Since AI Discord/ })).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("First time using Discord?")).toBeInTheDocument();
    expect(screen.getByText(/“Anna \| Elisa”/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Join the Since AI Discord" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your challenge channel" })).toBeInTheDocument();
  });

  it("tech / visibility partners: same onboarding, no challenge channel or judging", () => {
    const { container } = render(<PartnerDiscord audience="partners" />);
    expect(screen.getByRole("heading", { name: "How partners use Discord" })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/challenge channel|judg|evaluat/i);
    expect(container.textContent).toMatch(/office hours/);
  });
});
