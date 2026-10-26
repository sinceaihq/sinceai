import { render, screen, within } from "@testing-library/react";
import { WifiSection } from "@/components/guide/Wifi";

describe("WifiSection", () => {
  it("is a labelled section with the wifi anchor", () => {
    render(<WifiSection />);
    expect(screen.getByRole("region", { name: "Is free Wi-Fi available at the event?" })).toHaveAttribute("id", "wifi");
  });

  it("numbers the EduCity steps and marks BioCity and Joki as to be confirmed", () => {
    render(<WifiSection />);
    const educity = document.querySelector('[data-wifi="educity"]') as HTMLElement;
    expect(within(educity).getAllByRole("listitem")).toHaveLength(4);
    expect(educity).toHaveTextContent("TUAS Guest");
    expect(educity).toHaveTextContent(/eduroam/);
    const build = document.querySelector('[data-wifi="build-spaces"]') as HTMLElement;
    expect(within(build).getByText("Instructions to be confirmed")).toBeInTheDocument();
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
