import { render, screen, within } from "@testing-library/react";
import { WifiSection } from "@/components/guide/Wifi";

describe("WifiSection", () => {
  it("is a labelled section with the wifi anchor", () => {
    render(<WifiSection />);
    expect(screen.getByRole("region", { name: "Wi-Fi & Internet" })).toHaveAttribute("id", "wifi");
  });

  it("names the Hackathon network first, with where to get the password, then the EduCity steps", () => {
    render(<WifiSection />);
    const build = document.querySelector('[data-wifi="build-spaces"]') as HTMLElement;
    const educity = document.querySelector('[data-wifi="educity"]') as HTMLElement;
    expect(build.compareDocumentPosition(educity) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(build).toHaveTextContent("BioCity & Visitor Center Joki");
    expect(within(build).getByText("Hackathon")).toBeInTheDocument();
    expect(within(build).getByText("Available at check-in and in the Since AI participant app.")).toBeInTheDocument();
    expect(within(educity).getAllByRole("listitem")).toHaveLength(4);
    expect(educity).toHaveTextContent("TUAS Guest");
    expect(educity).toHaveTextContent(/eduroam/);
  });

  it("sends connection problems to the on-site support team", () => {
    render(<WifiSection />);
    expect(screen.getByText("If you experience connectivity issues, please contact our on-site support team.")).toBeInTheDocument();
  });

  it("opens the official Turku UAS pages in a new tab", () => {
    render(<WifiSection />);
    for (const name of [/Turku UAS visitor Wi-Fi/, /eduroam setup/]) {
      const link = screen.getByRole("link", { name });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
