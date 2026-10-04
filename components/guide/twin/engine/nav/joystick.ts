/**
 * Touch joystick for walk mode. A floating stick: a finger landing anywhere in
 * the zone (default: the left half of the scene) drops the stick under the
 * thumb; it rests faintly in the bottom-left corner as a hint. Pointer Events
 * only (touch; mouse and pen keep drag-to-look). The overlay is
 * aria-hidden and never takes pointer events itself — keyboard and screen
 * reader users have the arrow keys and the text alternative under the canvas.
 *
 * Listens on the host in the capture phase, so it claims its pointer before
 * other handlers on the host see the event; they ask `owns(pointerId)`.
 */

export interface JoystickVector {
  /** −1 (left) … 1 (right). */
  x: number;
  /** −1 (back) … 1 (forward = thumb pushed up). */
  y: number;
}

export interface Joystick {
  /** The overlay root (aria-hidden). */
  readonly element: HTMLElement;
  /** Current deflection; length ≤ 1, 0 inside the dead zone. */
  vector(): JoystickVector;
  /** A finger is driving the stick. */
  active(): boolean;
  /** The stick has claimed this pointer (other handlers should ignore it). */
  owns(pointerId: number): boolean;
  /** Show the resting hint (touch screens in walk mode). The stick answers touches either way. */
  setVisible(on: boolean): void;
  /**
   * Answer touches at all (default on). Off — walk mode ended — it lets go of its finger and ignores
   * new ones, so orbit drags and tours never grab a ghost stick.
   */
  setEnabled(on: boolean): void;
  /** Let go of the current finger (e.g. walk mode ended). */
  release(): void;
  dispose(): void;
}

export interface JoystickOptions {
  /** Where a finger may start the stick (client px). Default: the left half of the host. */
  zone?(x: number, y: number, rect: DOMRect): boolean;
  /** Stick travel in CSS px (default 52). */
  radius?: number;
  /** Fraction of the travel that counts as "no input" (default 0.12). */
  deadZone?: number;
  /** Pointer types that drive the stick (default touch; a pen drags to look, like a mouse). */
  pointerTypes?: readonly string[];
  onChange?(v: JoystickVector): void;
}

/** Knob diameter (px): above the 44 px minimum touch target. */
const KNOB = 56;
/** Gap between the resting stick and the scene's corner (px). */
const INSET = 20;

export function createJoystick(host: HTMLElement, opts: JoystickOptions = {}): Joystick {
  const radius = opts.radius ?? 52;
  const dead = Math.min(0.9, Math.max(0, opts.deadZone ?? 0.12));
  const types = opts.pointerTypes ?? ["touch"];
  const zone = opts.zone ?? ((x: number, _y: number, rect: DOMRect) => x - rect.left < rect.width / 2);
  const baseSize = radius * 2 + 16;

  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.dataset.twinJoystick = "";
  Object.assign(root.style, {
    position: "absolute",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
    userSelect: "none",
    zIndex: "2",
  });
  const base = document.createElement("div");
  Object.assign(base.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: `${baseSize}px`,
    height: `${baseSize}px`,
    borderRadius: "50%",
    boxSizing: "border-box",
    border: "1.5px solid color-mix(in srgb, var(--color-fg, #fff) 40%, transparent)",
    background: "color-mix(in srgb, var(--color-bg, #000) 35%, transparent)",
    backdropFilter: "blur(6px)",
    opacity: "0",
    willChange: "transform, opacity",
  });
  const knob = document.createElement("div");
  Object.assign(knob.style, {
    position: "absolute",
    left: `${(baseSize - KNOB) / 2}px`,
    top: `${(baseSize - KNOB) / 2}px`,
    width: `${KNOB}px`,
    height: `${KNOB}px`,
    borderRadius: "50%",
    background: "color-mix(in srgb, var(--color-fg, #fff) 85%, transparent)",
    willChange: "transform",
  });
  base.appendChild(knob);
  root.appendChild(base);
  host.appendChild(root);

  let visible = false;
  let enabled = true;
  let pointer: number | null = null;
  /** Where the finger landed (client px): the input reads zero there, wherever the stick is drawn. */
  let ox = 0;
  let oy = 0;
  /** Offset (px) of the touch point from the drawn base centre — non-zero when the base was kept on screen. */
  let kx = 0;
  let ky = 0;
  const v: JoystickVector = { x: 0, y: 0 };

  const hostRect = () => host.getBoundingClientRect();

  // Reads the phone's safe-area insets (notch, home indicator) — they matter in full screen.
  const probe = document.createElement("div");
  Object.assign(probe.style, {
    position: "absolute",
    visibility: "hidden",
    paddingLeft: "env(safe-area-inset-left, 0px)",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  });
  root.appendChild(probe);
  const inset = (value: string) => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  };

  /** Resting place: the bottom-left corner of the host, clear of the safe area. */
  function rest() {
    const rect = hostRect();
    const style = getComputedStyle(probe);
    const cx = INSET + inset(style.paddingLeft) + baseSize / 2;
    const cy = Math.max(baseSize / 2, rect.height - INSET - inset(style.paddingBottom) - baseSize / 2);
    place(cx, cy);
    knob.style.transform = "translate(0px, 0px)";
    base.style.opacity = visible ? "0.45" : "0";
  }

  /** Centre the base at host-relative (cx, cy). */
  function place(cx: number, cy: number) {
    base.style.transform = `translate(${cx - baseSize / 2}px, ${cy - baseSize / 2}px)`;
  }

  function set(x: number, y: number) {
    if (x === v.x && y === v.y) return;
    v.x = x;
    v.y = y;
    opts.onChange?.({ x, y });
  }

  function track(clientX: number, clientY: number) {
    const dx = clientX - ox;
    const dy = clientY - oy;
    const len = Math.hypot(dx, dy);
    const reach = Math.min(len, radius);
    const ux = len > 1e-6 ? dx / len : 0;
    const uy = len > 1e-6 ? dy / len : 0;
    // The knob sits under the thumb (inside the base's travel), even when the base had to move in from an edge.
    let kxp = kx + ux * reach;
    let kyp = ky + uy * reach;
    const kl = Math.hypot(kxp, kyp);
    if (kl > radius) {
      kxp *= radius / kl;
      kyp *= radius / kl;
    }
    knob.style.transform = `translate(${kxp}px, ${kyp}px)`;
    const m = reach / radius;
    const k = m <= dead ? 0 : (m - dead) / (1 - dead);
    set(ux * k, -uy * k);
  }

  function onDown(e: PointerEvent) {
    if (!enabled || pointer !== null || !types.includes(e.pointerType)) return;
    const rect = hostRect();
    if (!zone(e.clientX, e.clientY, rect)) return;
    pointer = e.pointerId;
    // Keep the whole stick inside the scene even when the thumb lands near an edge; the input still
    // starts at the thumb, so a finger resting where it landed never walks.
    const half = baseSize / 2;
    const cx = Math.min(Math.max(e.clientX - rect.left, half), Math.max(half, rect.width - half));
    const cy = Math.min(Math.max(e.clientY - rect.top, half), Math.max(half, rect.height - half));
    ox = e.clientX;
    oy = e.clientY;
    kx = e.clientX - (rect.left + cx);
    ky = e.clientY - (rect.top + cy);
    place(cx, cy);
    base.style.opacity = "1";
    track(e.clientX, e.clientY);
  }

  function onMove(e: PointerEvent) {
    if (e.pointerId === pointer) track(e.clientX, e.clientY);
  }

  function onUp(e: PointerEvent) {
    if (e.pointerId === pointer) release();
  }

  function release() {
    if (pointer === null) return;
    pointer = null;
    set(0, 0);
    rest();
  }

  const onHidden = () => {
    if (document.hidden) release();
  };

  // Keep the resting hint in its corner when the scene changes size (full screen, rotation).
  const resize =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          if (pointer === null) rest();
        })
      : null;
  resize?.observe(host);

  host.addEventListener("pointerdown", onDown, true);
  host.addEventListener("pointermove", onMove, true);
  host.addEventListener("pointerup", onUp, true);
  host.addEventListener("pointercancel", onUp, true);
  // A finger lifted outside the host (no capture) must not leave the stick stuck.
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onUp, true);
  window.addEventListener("blur", release);
  document.addEventListener("visibilitychange", onHidden);
  rest();

  return {
    element: root,
    vector: () => ({ x: v.x, y: v.y }),
    active: () => pointer !== null,
    owns: (id) => pointer !== null && id === pointer,
    setVisible(on) {
      visible = on;
      if (pointer === null) rest();
    },
    setEnabled(on) {
      enabled = on;
      if (!on) release();
    },
    release,
    dispose() {
      release();
      resize?.disconnect();
      host.removeEventListener("pointerdown", onDown, true);
      host.removeEventListener("pointermove", onMove, true);
      host.removeEventListener("pointerup", onUp, true);
      host.removeEventListener("pointercancel", onUp, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", onHidden);
      root.remove();
    },
  };
}
