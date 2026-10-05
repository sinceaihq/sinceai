/**
 * @jest-environment jsdom
 */
import { eyeLevelPick, eyeLevelReach, labelRank, makeLabel, nudgeInto, saysClosed } from "../labels";

// three's addons are ESM-only (Jest runs CommonJS): a stand-in CSS2DObject.
jest.mock("three/addons/renderers/CSS2DRenderer.js", () => {
  class CSS2DObject {
    element: HTMLElement;
    position = { x: 0, y: 0, z: 0, set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; } };
    userData: Record<string, unknown> = {};
    constructor(el: HTMLElement) {
      this.element = el;
    }
  }
  return { CSS2DObject };
});

describe("label ranks (wayfinding first)", () => {
  it("puts the event entrances and the venues above everything in the overviews", () => {
    const entrance = labelRank({ kind: "entrance", text: "BioCity main entrance" });
    const venue = labelRank({ kind: "building", text: "BioCity" });
    const context = labelRank({ kind: "building", text: "Pharmacity" });
    const street = labelRank({ kind: "street", text: "Tykistökatu" });
    const arrival = labelRank({ kind: "landmark", text: "Drop-off · Tykistökatu", group: "routes" });
    const distance = labelRank({ kind: "area", text: "290 m · 3.8 min", group: "routes" });
    expect(entrance.pinned && venue.pinned && arrival.pinned).toBe(true);
    expect(context.pinned || street.pinned || distance.pinned).toBe(false);
    expect(entrance.prio).toBeGreaterThan(venue.prio);
    expect(venue.prio).toBeGreaterThan(arrival.prio);
    expect(arrival.prio).toBeGreaterThan(street.prio);
    expect(street.prio).toBeGreaterThan(context.prio);
    expect(context.prio).toBeGreaterThan(distance.prio);
  });

  it("never lets a closed door be the most prominent entrance label", () => {
    const closed = labelRank({ kind: "entrance", text: "Joki street door", closed: true });
    expect(closed.pinned).toBe(false);
    expect(closed.closeOnly).toBe(true);
    expect(closed.prio).toBeLessThan(labelRank({ kind: "entrance", text: "Door B" }).prio);
    expect(closed.prio).toBeLessThan(labelRank({ kind: "building", text: "Pharmacity" }).prio);
    expect(saysClosed("Joki street door", "closed during the event")).toBe(true);
    expect(saysClosed("EduCity east main entrance", "registration")).toBe(false);
  });

  it("says “closed” on a closed door's label on every screen (not hidden on phones) and drops the event violet", () => {
    const l = makeLabel("Joki street door", "entrance", 0, 0, 0, undefined, "closed during the event");
    expect(l.userData.closed).toBe(true);
    const detail = l.element.querySelector("span:last-child") as HTMLElement;
    expect(detail.textContent).toContain("closed");
    expect(detail.className).not.toContain("max-sm:hidden");
    expect(l.element.className).not.toContain("--color-event");
    const open = makeLabel("Door B", "entrance", 0, 0, 0, undefined, "company arrivals → 1002");
    expect(open.userData.closed).toBeUndefined();
    expect((open.element.querySelector("span:last-child") as HTMLElement).className).toContain("max-sm:hidden");
  });
});

describe("eye-level labels", () => {
  it("read only within each kind's reach", () => {
    expect(eyeLevelReach({ kind: "building", text: "Pharmacity" })).toBeLessThan(100);
    expect(eyeLevelReach({ kind: "building", text: "EduCity" })).toBeGreaterThan(200);
    expect(eyeLevelReach({ kind: "entrance", text: "Joki street door", closed: true })).toBeLessThan(eyeLevelReach({ kind: "entrance", text: "Door B" }));
    expect(eyeLevelReach({ kind: "stand" })).toBeLessThanOrEqual(40);
  });

  it("keep the few nearest useful ones, the focused label always", () => {
    const items = [
      { item: "far stand", distance: 30, prio: 8 },
      { item: "near area", distance: 6, prio: 3 },
      { item: "entrance", distance: 20, prio: 10 },
      { item: "street", distance: 12, prio: 5 },
      { item: "focused", distance: 80, prio: 3 },
    ];
    const keep = eyeLevelPick(items, 3, "focused");
    expect(keep.has("focused")).toBe(true);
    expect(keep.size).toBe(3);
    expect(keep.has("near area")).toBe(true);
    expect(keep.has("entrance")).toBe(true);
    expect(keep.has("far stand")).toBe(false);
  });
});

describe("nudgeInto (labels stay inside the free part of the scene)", () => {
  const free = { left: 0, right: 360, top: 60, bottom: 600 };
  const box = (cx: number, cy: number, w = 120, h = 24) => ({ left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2, width: w, height: h });

  it("leaves a label well inside alone", () => {
    expect(nudgeInto(box(180, 300), free)).toEqual({ dx: 0, dy: 0 });
  });

  it("nudges a label cut by the right edge back in (the phone walk view's TAKOMO GOLF)", () => {
    const n = nudgeInto(box(330, 300), free);
    expect(n).toEqual({ dx: -30, dy: 0 });
  });

  it("nudges a label down from under the top controls while its anchor is still free", () => {
    expect(nudgeInto(box(180, 66), free)).toEqual({ dx: 0, dy: 6 });
  });

  it("hides a label whose anchor has left the free part, or that is wider than it", () => {
    expect(nudgeInto(box(380, 300), free)).toBeNull();
    expect(nudgeInto(box(180, 640), free)).toBeNull();
    expect(nudgeInto(box(180, 300, 400), free)).toBeNull();
  });
});
