import { HACKATHON_2026_CHALLENGE_LIST, HACKATHON_2026_PARTNERS } from "@/lib/sinceai";
import { NAMED_CHALLENGE_PARTNERS, STAND_PARTNERS, TBA_CHALLENGE_PLACES } from "@/lib/hackathon-2026";

describe("marketing partner lists follow the Field Guide data", () => {
  it("names the same 13 challenge partners and the 15-challenge target", () => {
    expect([...HACKATHON_2026_PARTNERS.challengePartners].sort()).toEqual(NAMED_CHALLENGE_PARTNERS.map((c) => c.name).sort());
    expect(HACKATHON_2026_PARTNERS.challengeTarget).toBe(NAMED_CHALLENGE_PARTNERS.length + TBA_CHALLENGE_PLACES.length);
    expect(HACKATHON_2026_CHALLENGE_LIST).toMatch(/^Valmet, Bayer, .* and Fonecta$/);
  });

  it("names the same six visibility / technology partners", () => {
    expect([...HACKATHON_2026_PARTNERS.visibilityPartners].sort()).toEqual(STAND_PARTNERS.map((p) => p.name).sort());
  });

  it("never lists a former or unconfirmed company as a 2026 challenge partner", () => {
    const text = JSON.stringify(HACKATHON_2026_PARTNERS);
    for (const name of ["Revvity", "Bo LKV", "Saarioinen", "Sandvik", "Kongsberg"]) expect(text).not.toContain(name);
  });
});
