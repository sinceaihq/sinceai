import { keepDots } from "@/lib/hackathon-2026";

const NBSP = "\u00a0";

describe("keepDots", () => {
  it("binds every separator dot to the text before it", () => {
    expect(keepDots("Joki · Lift · Showroom")).toBe(`Joki${NBSP}· Lift${NBSP}· Showroom`);
  });

  it("keeps floor, stand and counter numbers with their word", () => {
    expect(keepDots("EduCity · floor 1")).toBe(`EduCity${NBSP}· floor${NBSP}1`);
    expect(keepDots("Stand 2 · Solita")).toBe(`Stand${NBSP}2${NBSP}· Solita`);
    expect(keepDots("Counter 4 of 6")).toBe(`Counter${NBSP}4 of 6`);
  });

  it("leaves other text alone", () => {
    expect(keepDots("Room 1001 Dromberg")).toBe("Room 1001 Dromberg");
    expect(keepDots("a·b")).toBe("a·b");
  });
});
