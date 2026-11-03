import { WIFI, WIFI_ANCHOR } from "@/lib/hackathon-2026";

describe("event Wi-Fi", () => {
  it("gives EduCity's TUAS Guest steps as Turku UAS describes them, plus eduroam", () => {
    expect(WIFI_ANCHOR).toBe("wifi");
    expect(WIFI.educity.network).toBe("TUAS Guest");
    expect(WIFI.educity.steps).toHaveLength(4);
    expect(WIFI.educity.steps[1]).toBe("Select TUAS Guest.");
    expect(WIFI.educity.steps[3]).toMatch(/valid email address/);
    expect(WIFI.educity.eduroam).toMatch(/existing institutional credentials/);
    expect(WIFI.educity.when).toBe("Friday opening and Sunday finals");
  });

  it("names the Hackathon network at BioCity and Joki and says where to get the password", () => {
    expect(WIFI.title).toBe("Wi-Fi & Internet");
    expect(WIFI.answer).toBe("Free Wi-Fi is available for hackathon participants at the event venues.");
    expect(WIFI.buildSpaces.title).toBe("BioCity & Visitor Center Joki");
    expect(WIFI.buildSpaces.network).toBe("Hackathon");
    // This is all the public guide says about the password: its value stays out of this repository.
    expect(WIFI.buildSpaces.password).toBe("Available at check-in and in the Since AI participant app.");
    expect(WIFI.problems).toBe("If you experience connectivity issues, please contact our on-site support team.");
  });

  it("promises no speed or uninterrupted service, and forbids testing the networks", () => {
    const text = JSON.stringify(WIFI);
    expect(text).not.toMatch(/unlimited|guaranteed|Mbit|Gbit|24\/7 connectivity/i);
    // The build-space network is not load-verified yet: no promise of capacity for the crowd.
    expect(WIFI.buildSpaces.text).not.toMatch(/more capacity|enough capacity|for the number of developers/i);
    expect(WIFI.buildSpaces.text).toMatch(/capacity is shared/);
    expect(WIFI.beforeArriving.join(" ")).toMatch(/Do not scan, attack or run unauthorised security tests/);
    expect(WIFI.beforeArriving.join(" ")).toMatch(/mobile hotspot/);
  });

  it("links Turku UAS' own pages", () => {
    expect(WIFI.links.map((l) => l.href)).toEqual([
      "https://www.turkuamk.fi/en/about-us/campuses/",
      "https://www.turkuamk.fi/en/about-us/contact-us/it-services/",
    ]);
  });
});
