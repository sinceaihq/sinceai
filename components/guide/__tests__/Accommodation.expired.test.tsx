import { render, screen, within } from "@testing-library/react";
import { Accommodation } from "@/components/guide/Accommodation";

// Its own file: the guide clock is shared per page (module state), so a later moment needs a fresh module.
function at(now: string) {
  window.history.replaceState(null, "", `/hackathon-2026/guide?now=${encodeURIComponent(now)}`);
}

describe("Accommodation after the Sokos deadline", () => {
  it("marks the Sokos rate as ended after its deadline instead of offering the code", () => {
    at("2026-10-06T16:31");
    render(<Accommodation />);
    const sokos = document.querySelector('[data-offer="sokos-kupittaa"]') as HTMLElement;
    expect(within(sokos).getByText("Ended")).toBeInTheDocument();
    expect(within(sokos).queryByText("BSINCEAI")).toBeNull();
    expect(within(sokos).queryByRole("link", { name: /^Book Original Sokos/ })).toBeNull();
    // The others are unaffected.
    expect(screen.getAllByText("SINCEAI2026")).toHaveLength(2);
  });
});
