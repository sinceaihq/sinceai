import { createJoystick, type Joystick, type JoystickVector } from "../joystick";

function pointer(type: string, init: { id?: number; x: number; y: number; pointerType?: string }) {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: init.x, clientY: init.y });
  Object.defineProperty(e, "pointerId", { value: init.id ?? 1 });
  Object.defineProperty(e, "pointerType", { value: init.pointerType ?? "touch" });
  return e;
}

describe("createJoystick", () => {
  let host: HTMLDivElement;
  let stick: Joystick;
  let changes: JoystickVector[];

  beforeEach(() => {
    host = document.createElement("div");
    host.getBoundingClientRect = () =>
      ({ left: 100, top: 50, width: 800, height: 500, right: 900, bottom: 550, x: 100, y: 50, toJSON: () => ({}) }) as DOMRect;
    document.body.appendChild(host);
    changes = [];
    stick = createJoystick(host, { radius: 50, onChange: (v) => changes.push(v) });
  });

  afterEach(() => {
    stick.dispose();
    host.remove();
  });

  it("is a decorative, aria-hidden overlay with a thumb-sized knob", () => {
    const root = stick.element;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    expect(root.style.pointerEvents).toBe("none");
    const base = root.firstElementChild as HTMLElement;
    const knob = base.firstElementChild as HTMLElement;
    expect(parseFloat(base.style.width)).toBeGreaterThan(parseFloat(knob.style.width));
    expect(parseFloat(knob.style.width)).toBeGreaterThanOrEqual(44);
    expect(parseFloat(knob.style.height)).toBeGreaterThanOrEqual(44);
  });

  it("drops under a thumb on the left half and reads forward / right", () => {
    host.dispatchEvent(pointer("pointerdown", { id: 3, x: 300, y: 400 }));
    expect(stick.active()).toBe(true);
    expect(stick.owns(3)).toBe(true);
    expect(stick.owns(4)).toBe(false);
    // Thumb straight up by half the travel (just outside the 12 % dead zone → rescaled).
    host.dispatchEvent(pointer("pointermove", { id: 3, x: 300, y: 375 }));
    let v = stick.vector();
    expect(v.x).toBeCloseTo(0, 9);
    expect(v.y).toBeCloseTo((0.5 - 0.12) / 0.88, 9);
    // Far right and beyond the rim: clamped to length 1.
    host.dispatchEvent(pointer("pointermove", { id: 3, x: 600, y: 400 }));
    v = stick.vector();
    expect(v.x).toBeCloseTo(1, 9);
    expect(v.y).toBeCloseTo(0, 9);
    // Diagonal back-left.
    host.dispatchEvent(pointer("pointermove", { id: 3, x: 200, y: 500 }));
    v = stick.vector();
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 9);
    expect(v.x).toBeLessThan(0);
    expect(v.y).toBeLessThan(0);
    host.dispatchEvent(pointer("pointerup", { id: 3, x: 200, y: 500 }));
    expect(stick.active()).toBe(false);
    expect(stick.vector()).toEqual({ x: 0, y: 0 });
    expect(changes[changes.length - 1]).toEqual({ x: 0, y: 0 });
  });

  it("ignores tiny movements inside the dead zone", () => {
    host.dispatchEvent(pointer("pointerdown", { x: 300, y: 400 }));
    host.dispatchEvent(pointer("pointermove", { x: 304, y: 397 }));
    expect(stick.vector()).toEqual({ x: 0, y: 0 });
  });

  it("leaves the right half, mice, pens and second fingers alone", () => {
    host.dispatchEvent(pointer("pointerdown", { id: 1, x: 700, y: 400 }));
    expect(stick.active()).toBe(false);
    host.dispatchEvent(pointer("pointerdown", { id: 2, x: 200, y: 400, pointerType: "mouse" }));
    expect(stick.active()).toBe(false);
    // A pen drags to look, like a mouse (desktop tablets).
    host.dispatchEvent(pointer("pointerdown", { id: 9, x: 200, y: 400, pointerType: "pen" }));
    expect(stick.active()).toBe(false);
    host.dispatchEvent(pointer("pointerdown", { id: 3, x: 200, y: 400 }));
    host.dispatchEvent(pointer("pointerdown", { id: 4, x: 250, y: 400 }));
    expect(stick.owns(3)).toBe(true);
    expect(stick.owns(4)).toBe(false);
  });

  it("lets go when the finger lifts outside the scene or the page hides", () => {
    host.dispatchEvent(pointer("pointerdown", { id: 5, x: 200, y: 400 }));
    host.dispatchEvent(pointer("pointermove", { id: 5, x: 200, y: 300 }));
    window.dispatchEvent(pointer("pointercancel", { id: 5, x: 0, y: 0 }));
    expect(stick.active()).toBe(false);
    host.dispatchEvent(pointer("pointerdown", { id: 6, x: 200, y: 400 }));
    stick.release();
    expect(stick.vector()).toEqual({ x: 0, y: 0 });
  });

  it("shows a resting hint only when asked, and keeps the stick inside the scene", () => {
    const base = stick.element.firstElementChild as HTMLElement;
    expect(base.style.opacity).toBe("0");
    stick.setVisible(true);
    expect(base.style.opacity).toBe("0.45");
    // A thumb landing at the very corner still gets the whole stick on screen.
    host.dispatchEvent(pointer("pointerdown", { x: 101, y: 549 }));
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(base.style.transform);
    expect(Number(m?.[1])).toBeGreaterThanOrEqual(0);
    expect(Number(m?.[2]) + parseFloat(base.style.height)).toBeLessThanOrEqual(500);
    expect(base.style.opacity).toBe("1");
  });

  it("reads zero under a resting thumb, even where the stick is drawn moved in from an edge", () => {
    const base = stick.element.firstElementChild as HTMLElement;
    // Corners and edges: the base is kept on screen, the input starts where the thumb is.
    for (const [x, y] of [
      [101, 549],
      [130, 520],
      [110, 300],
      [300, 545],
    ]) {
      host.dispatchEvent(pointer("pointerdown", { id: 11, x, y }));
      expect(stick.vector()).toEqual({ x: 0, y: 0 });
      // The knob is drawn under the thumb, inside the base.
      const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec((base.firstElementChild as HTMLElement).style.transform);
      expect(Math.hypot(Number(m?.[1]), Number(m?.[2]))).toBeLessThanOrEqual(50 + 1e-9);
      // Pushing up from there still walks forward.
      host.dispatchEvent(pointer("pointermove", { id: 11, x, y: y - 40 }));
      expect(stick.vector().y).toBeGreaterThan(0.5);
      expect(Math.abs(stick.vector().x)).toBeLessThan(1e-9);
      host.dispatchEvent(pointer("pointerup", { id: 11, x, y: y - 40 }));
    }
  });

  it("stops answering touches while disabled (walk mode ended) and lets go of its finger", () => {
    host.dispatchEvent(pointer("pointerdown", { id: 12, x: 300, y: 400 }));
    host.dispatchEvent(pointer("pointermove", { id: 12, x: 300, y: 350 }));
    expect(stick.active()).toBe(true);
    stick.setEnabled(false);
    expect(stick.active()).toBe(false);
    expect(stick.vector()).toEqual({ x: 0, y: 0 });
    const base = stick.element.firstElementChild as HTMLElement;
    host.dispatchEvent(pointer("pointerdown", { id: 13, x: 300, y: 400 }));
    host.dispatchEvent(pointer("pointermove", { id: 13, x: 340, y: 360 }));
    expect(stick.active()).toBe(false);
    expect(base.style.opacity).toBe("0");
    host.dispatchEvent(pointer("pointerup", { id: 13, x: 340, y: 360 }));
    stick.setEnabled(true);
    host.dispatchEvent(pointer("pointerdown", { id: 14, x: 300, y: 400 }));
    expect(stick.active()).toBe(true);
  });

  it("removes its overlay and listeners on dispose", () => {
    stick.dispose();
    expect(host.querySelector("[data-twin-joystick]")).toBeNull();
    host.dispatchEvent(pointer("pointerdown", { x: 200, y: 400 }));
    expect(stick.active()).toBe(false);
  });
});
