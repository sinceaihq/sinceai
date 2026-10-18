import { render, screen, within } from "@testing-library/react";
import DiscordGuidePage from "@/app/hackathon-2026/guide/discord/page";

describe("Discord Guide page", () => {
  it("walks through the six setup steps, each with a described picture", () => {
    const { container } = render(<DiscordGuidePage />);
    const steps = container.querySelectorAll("#setup ol > li");
    expect(steps).toHaveLength(6);
    for (const step of steps) {
      const picture = within(step as HTMLElement).getByRole("img");
      expect(picture.getAttribute("aria-label")?.length).toBeGreaterThan(40);
    }
    expect(within(steps[0] as HTMLElement).getByText("Accept Invite", { selector: "strong" })).toBeInTheDocument();
    expect(within(steps[4] as HTMLElement).getByText(/“Anna \| Valmet”/)).toBeInTheDocument();
  });

  it("links the official invite and app stores in new tabs", () => {
    render(<DiscordGuidePage />);
    const joins = screen.getAllByRole("link", { name: /Join the Since AI Discord/ });
    expect(joins.length).toBeGreaterThanOrEqual(2);
    for (const join of joins) {
      expect(join).toHaveAttribute("href", "https://discord.gg/vMWdrVUPws");
      expect(join).toHaveAttribute("target", "_blank");
    }
    expect(screen.getByRole("link", { name: /App Store/ })).toHaveAttribute("href", "https://apps.apple.com/app/discord/id985746746");
    expect(screen.getByRole("link", { name: /Google Play/ })).toHaveAttribute(
      "href",
      "https://play.google.com/store/apps/details?id=com.discord",
    );
  });

  it("explains Discord in familiar words and covers both partner roles", () => {
    render(<DiscordGuidePage />);
    expect(screen.getByText(/Microsoft Teams or Slack, you already know most of it/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your challenge channel" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your partner channel" })).toBeInTheDocument();
    expect(screen.getByText("Discord is blocked on my work laptop or network")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Join the Since AI Discord" })).toBeInTheDocument();
  });
});
