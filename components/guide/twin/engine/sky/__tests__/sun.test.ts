import { nightFactor, sunAtTurku, turkuLocalToUtc } from "../sun";

// Reference values: PyEphem (VSOP87, refraction at 1010 hPa / 5 °C) for 60.4493 N, 22.2933 E.
const REFERENCE: [string, number, number][] = [
  ["2026-11-06T15:00", 6.709, 219.754],
  ["2026-11-06T15:30", 4.235, 226.53],
  ["2026-11-06T16:00", 1.56, 233.163],
  ["2026-11-07T11:00", 11.845, 161.756],
  ["2026-11-08T13:00", 12.437, 191.139],
  ["2026-06-21T13:00", 52.566, 167.637],
];

describe("sun position for the campus", () => {
  it.each(REFERENCE)("%s matches the ephemeris", (iso, elevation, azimuth) => {
    const sun = sunAtTurku(iso);
    expect(Math.abs(sun.elevation - elevation)).toBeLessThan(0.3);
    expect(Math.abs(sun.azimuth - azimuth)).toBeLessThan(0.5);
  });

  it("sets around 16:21 on Friday 6 November", () => {
    expect(sunAtTurku("2026-11-06T16:18").elevation).toBeGreaterThan(0);
    expect(sunAtTurku("2026-11-06T16:24").elevation).toBeLessThan(0);
  });

  it("reads Turku wall-clock time in winter and summer", () => {
    expect(new Date(turkuLocalToUtc("2026-11-06T15:30")).toISOString()).toBe("2026-11-06T13:30:00.000Z");
    expect(new Date(turkuLocalToUtc("2026-06-21T13:00")).toISOString()).toBe("2026-06-21T10:00:00.000Z");
  });

  it("blends day into night through civil twilight", () => {
    expect(nightFactor(10)).toBe(0);
    expect(nightFactor(-6)).toBe(1);
    const mid = nightFactor(-1);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
  });
});
