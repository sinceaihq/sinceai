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

  it("publishes no network name, password or portal for BioCity and Joki until confirmed", () => {
    const text = JSON.stringify(WIFI.buildSpaces);
    expect(text).toMatch(/once they are confirmed/);
    expect(text).not.toMatch(/password|SSID|login:|portal|“|"[A-Z][\w-]+ ?(Guest|WiFi|Wi-Fi)"/i);
    expect(WIFI.buildSpaces.title).toBe("BioCity & Visitor Center Joki");
  });

  it("promises no speed or uninterrupted service, and forbids testing the networks", () => {
    const text = JSON.stringify(WIFI);
    expect(text).not.toMatch(/unlimited|guaranteed|Mbit|Gbit|24\/7 connectivity/i);
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
