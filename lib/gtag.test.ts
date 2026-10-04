/**
 * @jest-environment jsdom
 */
import fs from "node:fs";
import path from "node:path";
import { ensureConsentDefaults, updateConsent } from "@/lib/gtag";

describe("consent defaults for browser-only pages", () => {
  beforeEach(() => {
    delete window.gtag;
    delete window.dataLayer;
  });

  const entries = () => (window.dataLayer ?? []).map((e) => Array.from(e as ArrayLike<unknown>));

  it("sets everything to denied before analytics can start", () => {
    ensureConsentDefaults();
    const [first, ...rest] = entries();
    expect(first[0]).toBe("consent");
    expect(first[1]).toBe("default");
    expect(first[2]).toMatchObject({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      wait_for_update: 500,
    });
    expect(rest).toEqual([
      ["set", "url_passthrough", true],
      ["set", "ads_data_redaction", true],
    ]);
  });

  it("lets a stored choice update it afterwards", () => {
    ensureConsentDefaults();
    updateConsent("granted");
    expect(entries().at(-1)?.slice(0, 2)).toEqual(["consent", "update"]);
  });

  it("does nothing when the root layout script already ran", () => {
    const gtag = jest.fn();
    window.gtag = gtag;
    ensureConsentDefaults();
    expect(window.gtag).toBe(gtag);
    expect(gtag).not.toHaveBeenCalled();
  });

  it("matches the root layout's consent-default script", () => {
    const layout = fs.readFileSync(path.join(process.cwd(), "app/layout.tsx"), "utf8");
    for (const key of ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"]) {
      expect(layout).toContain(`${key}: 'denied'`);
    }
    expect(layout).toContain("wait_for_update: 500");
    expect(layout).toContain("gtag('set', 'url_passthrough', true)");
    expect(layout).toContain("gtag('set', 'ads_data_redaction', true)");
  });
});
