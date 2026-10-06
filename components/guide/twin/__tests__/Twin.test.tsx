import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DEFAULT_TIME,
  getPlace3D,
  PLACES_3D,
  TARGETS_3D,
  TIME_PRESETS,
  TOURS_3D,
  type Target3D,
  type Tour3D,
} from "@/lib/hackathon-2026/twin";
import {
  DEFAULT_PLACE,
  defaultView,
  describeIntent,
  describeTime,
  readTwinParams,
  resolveTimeParam,
  sliderIso,
  sliderMinutes,
  stepAnnouncement,
  TARGET_GROUPS,
  tourFacts,
  tourForTarget,
  Twin,
  viewKey,
} from "@/components/guide/twin/Twin";
import type { TwinEngine, TwinOptions } from "@/components/guide/twin/engine";

/* ── A scriptable stand-in for the three.js engine ── */

type MockEngine = { [K in keyof TwinEngine]: jest.Mock };
interface Created {
  engine: MockEngine;
  opts: TwinOptions;
  host: HTMLElement;
}
const mockCreated: Created[] = [];
const mockWebGL = { available: true, checks: 0 };
let mockLoad: () => Promise<void> = async () => undefined;
/** Textures and the first frames (engine.whenReady); resolves at once unless a test holds it. */
let mockWhenReady: () => Promise<void> = async () => undefined;

function deferred() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

/** Behaves like the real engine: reports mode changes, and ending a route reports onTour(null). */
function mockMakeEngine(opts: TwinOptions): MockEngine {
  let mode: "orbit" | "walk" | "tour" = "orbit";
  const setMode = (next: typeof mode) => {
    mode = next;
    opts.onMode?.(next);
  };
  const endTour = () => {
    if (mode !== "tour") return;
    opts.onTour?.(null);
    setMode("orbit");
  };
  return {
    load: jest.fn(() => mockLoad()),
    goto: jest.fn(() => {
      endTour();
      return true;
    }),
    focus: jest.fn(() => {
      endTour();
      return true;
    }),
    setTime: jest.fn(),
    setLabels: jest.fn(),
    walk: jest.fn((on: boolean) => {
      if (on) {
        endTour();
        setMode("walk");
      } else if (mode === "walk") {
        opts.onConnector?.(null);
        setMode("orbit");
      }
    }),
    useConnector: jest.fn(),
    tour: jest.fn((id: string | null) => {
      endTour();
      if (id !== null) setMode("tour");
      return true;
    }),
    pauseTour: jest.fn(),
    zoom: jest.fn(),
    resize: jest.fn(),
    whenReady: jest.fn(() => mockWhenReady()),
    dispose: jest.fn(),
  };
}

jest.mock("@/components/guide/twin/engine", () => ({
  isWebGL2Available: () => {
    mockWebGL.checks++;
    return mockWebGL.available;
  },
  createTwinEngine: (host: HTMLElement, opts: TwinOptions) => {
    const engine = mockMakeEngine(opts);
    mockCreated.push({ engine, opts, host });
    return engine;
  },
}));

/* ── Environment ── */

const MEDIA_OFF = { coarse: false, reduced: false, narrow: false, short: false };
const media = { ...MEDIA_OFF };
const mediaListeners = new Set<() => void>();

function setMedia(next: Partial<typeof media> = {}) {
  Object.assign(media, MEDIA_OFF, next);
  window.matchMedia = ((query: string) => ({
    get matches() {
      return (
        (query.includes("pointer: coarse") && media.coarse) ||
        (query.includes("reduced-motion") && media.reduced) ||
        (query.includes("max-width") && media.narrow) ||
        (query.includes("max-height") && media.short)
      );
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, fn: () => void) => mediaListeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => mediaListeners.delete(fn),
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

/** The device changes a setting while the page is open (e.g. Reduce Motion). */
function changeMedia(next: Partial<typeof media>) {
  Object.assign(media, next);
  act(() => mediaListeners.forEach((fn) => fn()));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The always-present status region the twin announces through. */
const announcer = () => screen.getByRole("status");
const sceneHost = (place = DEFAULT_PLACE) => screen.getByRole("group", { name: getPlace3D(place).alt });

function setUrl(query = "") {
  window.history.replaceState({}, "", `/hackathon-2026/guide/venue${query}`);
}

const last = () => mockCreated[mockCreated.length - 1];

async function startEngine() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Explore in 3D/ }));
  await screen.findByRole("button", { name: "Show names" });
  return { user, ...last() };
}

const firstWith = <T,>(list: readonly T[], pred: (x: T) => boolean): T => {
  const found = list.find(pred);
  if (!found) throw new Error("fixture not found in lib data");
  return found;
};

beforeEach(() => {
  mockCreated.length = 0;
  mockWebGL.available = true;
  mockWebGL.checks = 0;
  mockLoad = async () => undefined;
  mockWhenReady = async () => undefined;
  mediaListeners.clear();
  setMedia();
  setUrl();
  // jsdom has no layout; treat every element as rendered for the focus trap.
  jest.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(
    () => [{ width: 1, height: 1 }] as unknown as DOMRectList,
  );
});

afterEach(() => {
  jest.restoreAllMocks();
  delete (window as unknown as { __twin?: unknown }).__twin;
});

/* ── Pure helpers ── */

describe("time helpers", () => {
  it("resolves ?time= values", () => {
    expect(resolveTimeParam("17:00")).toBe("2026-11-06T17:00");
    expect(resolveTimeParam("9:05")).toBe("2026-11-06T09:05");
    // The build night: small hours belong to Saturday.
    expect(resolveTimeParam("01:00")).toBe("2026-11-07T01:00");
    expect(resolveTimeParam(TIME_PRESETS[0].id)).toBe(TIME_PRESETS[0].iso);
    expect(resolveTimeParam("2026-11-08T13:00")).toBe("2026-11-08T13:00");
    for (const bad of ["25:00", "12:60", "noon", "2026-11-31T10:00", "", null, undefined]) {
      expect(resolveTimeParam(bad)).toBeNull();
    }
  });

  it("describes the time and the sun", () => {
    expect(describeTime("2026-11-06T15:30").short).toBe("Fri 15:30 · low sun");
    expect(describeTime("2026-11-06T18:00").short).toBe("Fri 18:00 · dark");
    expect(describeTime("2026-11-06T16:30").short).toBe("Fri 16:30 · dusk");
    expect(describeTime("2026-11-06T16:15").short).toBe("Fri 16:15 · sunset");
    expect(describeTime("2026-11-07T08:00").short).toBe("Sat 08:00 · dawn");
    expect(describeTime("2026-11-07T11:00").short).toBe("Sat 11:00 · daylight");
    expect(describeTime("2026-11-06T15:30").long).toBe(
      "Friday 6 November, 15:30 — the sun is 5° above the horizon",
    );
    expect(describeTime("2026-11-06T18:00").long).toMatch(/12° below the horizon$/);
  });

  it("maps the Friday afternoon slider", () => {
    expect(sliderMinutes("2026-11-06T15:30")).toBe(15 * 60 + 30);
    expect(sliderMinutes("2026-11-06T13:55")).toBeNull();
    expect(sliderMinutes("2026-11-07T15:30")).toBeNull();
    expect(sliderIso(17 * 60 + 5)).toBe("2026-11-06T17:05");
  });
});

describe("readTwinParams", () => {
  it("has no intent without parameters", () => {
    expect(readTwinParams("").intent).toBeNull();
    expect(readTwinParams("?time=16:30")).toMatchObject({ intent: null, time: "2026-11-06T16:30" });
  });

  it("reads place and view, with or without the place prefix", () => {
    const p = PLACES_3D[PLACES_3D.length - 1];
    const v = p.views[p.views.length - 1];
    expect(readTwinParams(`?place=${p.id}&view=${v.id}`).intent).toMatchObject({ place: p.id, view: v.id });
    expect(readTwinParams(`?view=${p.id}:${v.id}`).intent).toMatchObject({ place: p.id, view: v.id });
    expect(readTwinParams(`?place=${p.id}&view=nope`).intent?.view).toBeUndefined();
    expect(readTwinParams("?place=moon").intent).toBeNull();
    // A view id that only one place has names that place.
    expect(readTwinParams("?view=showroom").intent).toMatchObject({ place: "joki", view: "showroom" });
    expect(readTwinParams("?view=default").intent).toBeNull();
  });

  it("normalises focus targets (partners → their stand, place names → places)", () => {
    const stand = firstWith(TARGETS_3D, (t) => t.kind === "stand");
    expect(readTwinParams("?focus=red-hat").intent).toMatchObject({ focus: "bc-1", place: "biocity" });
    expect(readTwinParams(`?focus=${stand.id}`).intent).toMatchObject({ focus: stand.id, place: stand.place });
    expect(readTwinParams("?focus=biocity").intent).toMatchObject({ place: "biocity", focus: undefined });
  });

  it("keeps the legacy ?scene= links", () => {
    expect(readTwinParams("?scene=showroom").intent).toMatchObject({ place: "joki", view: "showroom" });
    expect(readTwinParams("?scene=biocity").intent?.place).toBe("biocity");
  });

  it("reads tours, walk, quality and debug", () => {
    const tour = TOURS_3D[0];
    expect(readTwinParams(`?tour=${tour.id}`).intent).toMatchObject({ tour: tour.id, place: tour.place });
    expect(readTwinParams("?tour=nope").intent).toBeNull();
    expect(readTwinParams("?walk=1").intent).toMatchObject({ walk: true, place: DEFAULT_PLACE });
    expect(readTwinParams("?quality=low").tier).toBe("low");
    expect(readTwinParams("?quality=extreme").tier).toBeUndefined();
    expect(readTwinParams("?twin=debug")).toMatchObject({ debug: true, intent: { place: DEFAULT_PLACE } });
  });
});

describe("tourForTarget", () => {
  const target = (over: Partial<Target3D>): Target3D => ({
    id: "x",
    label: "X",
    detail: "",
    place: "joki",
    kind: "area",
    ...over,
  });
  const tour = (over: Partial<Tour3D>): Tour3D => ({
    id: "t",
    label: "T",
    audience: "Builders",
    summary: "",
    place: "joki",
    legs: [],
    to: "x",
    distanceM: 100,
    minutes: 2,
    steps: [],
    ...over,
  });

  const jokiArea = TARGETS_3D.find((t) => t.place === "joki" && t.kind === "area")!.id;
  const jokiDoor = TARGETS_3D.find((t) => t.place === "joki" && t.kind === "entrance")!.id;

  it("prefers a route that ends at the target, then the audience, then event order", () => {
    const exact = tour({ id: "exact", to: "x" });
    const near = tour({ id: "near", to: jokiArea });
    expect(tourForTarget(target({}), [near, exact])?.id).toBe("exact");

    const forPartners = tour({ id: "companies-a", audience: "Companies", to: "x" });
    const forBuilders = tour({ id: "builders-a", audience: "Builders", to: "x" });
    expect(tourForTarget(target({ kind: "company" }), [forBuilders, forPartners])?.id).toBe("companies-a");
    expect(tourForTarget(target({ kind: "area" }), [forPartners, forBuilders])?.id).toBe("builders-a");

    const first = tour({ id: "first", to: jokiArea, minutes: 6 });
    const second = tour({ id: "second", to: jokiArea, minutes: 2 });
    expect(tourForTarget(target({}), [first, second])?.id).toBe("first");
  });

  it("ranks routes that stop at a door below routes that go inside", () => {
    const door = tour({ id: "door", to: jokiDoor });
    const inside = tour({ id: "inside", to: jokiArea });
    expect(tourForTarget(target({}), [door, inside])?.id).toBe("inside");
    expect(tourForTarget(target({ id: jokiDoor, kind: "entrance" }), [inside, door])?.id).toBe("door");
  });

  it("uses a route named by the target when there is one", () => {
    const named = { ...target({}), tour: "named" } as Target3D;
    expect(tourForTarget(named, [tour({ id: "other", to: "x" }), tour({ id: "named", to: jokiArea })])?.id).toBe(
      "named",
    );
  });

  it("returns null when no route reaches the target's building", () => {
    expect(tourForTarget(target({ place: "joki" }), [tour({ to: "nowhere-at-all", place: "campus" })])).toBeNull();
  });

  it("picks the expected routes in the real data", () => {
    const pick = (id: string) => tourForTarget(TARGETS_3D.find((t) => t.id === id)!)?.id;
    for (const t of TARGETS_3D.filter((x) => x.kind === "company" || x.kind === "room" || x.kind === "stand")) {
      expect(tourForTarget(t)).not.toBeNull();
    }
    expect(pick("elisa")).toBe("companies-tykistokatu-to-showroom");
    expect(pick("room-bayer")).toBe("partners-fri-parkcity-edu");
    expect(pick("bc-2")).toBe("partners-tykistokatu-to-stands");
    expect(pick("supercars")).toBe("partners-tykistokatu-to-stands");
    expect(pick("registration")).toBe("builders-train-checkin");
    expect(pick("entrance-biocity-courtyard")).toBe("builders-transfer-to-build");
    expect(pick("entrance-educity-b")).toBe("partners-fri-parkcity-edu");
    expect(pick("cave")).toBe("builders-build-to-joki");
  });
});

describe("Go to groups", () => {
  it("lists every target exactly once", () => {
    const ids = TARGET_GROUPS.flatMap((g) => g.targets.map((t) => t.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(TARGETS_3D.map((t) => t.id).sort());
    expect(TARGET_GROUPS[0].label).toBe("Companies · Saturday Q&A stand (Joki)");
    expect(TARGET_GROUPS[1].label).toBe("Companies · Friday briefing room (EduCity)");
  });
});

/* ── The component ── */

describe("Twin", () => {
  it("shows the poster first and loads nothing until asked", () => {
    render(<Twin />);
    const place = getPlace3D(DEFAULT_PLACE);
    const host = screen.getByRole("group", { name: place.alt });
    expect(host).toHaveAttribute("aria-roledescription", "3D scene");
    const help = document.getElementById(host.getAttribute("aria-describedby")!);
    expect(help).toHaveTextContent(/up and down arrows walk, A and D step sideways, the left and right arrows turn/);
    // The orbit keys too (the scene's only keyboard documentation).
    expect(help).toHaveTextContent(/the arrow keys move the map, Shift \+ the arrow keys turn and tilt it/);
    expect(screen.getByRole("button", { name: /Explore in 3D/ })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(PLACES_3D.length);
    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent(place.tab);
    expect(mockCreated).toHaveLength(0);
  });

  it("shows build progress, then the controls on the default view", async () => {
    let finish: () => void = () => undefined;
    mockLoad = () => new Promise<void>((resolve) => (finish = resolve));
    render(<Twin />);
    await userEvent.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    expect(await screen.findByText("Building the campus…")).toBeInTheDocument();
    const { engine, opts } = last();
    expect(opts.time).toBe(DEFAULT_TIME);
    expect(opts.reducedMotion).toBe(false);
    act(() => opts.onProgress?.({ loaded: 4, total: 10 }));
    expect(screen.getByText("4/10")).toBeInTheDocument();
    // One bar for the whole wait: the code, the modules (here 4 of 10 → 8 + 72 × 0.4 %), then light.
    const bar = screen.getByRole("progressbar", { name: "Loading the 3D campus" });
    expect(bar).toHaveAttribute("aria-valuenow", "37");
    expect(bar).toHaveAttribute("aria-valuetext", "Building the campus… 4 of 10 parts");
    await act(async () => finish());
    await screen.findByRole("button", { name: "Show names" });
    expect(engine.goto).toHaveBeenCalledWith(viewKey(DEFAULT_PLACE, defaultView(getPlace3D(DEFAULT_PLACE))), false);
    expect(screen.getByRole("group", { name: getPlace3D(DEFAULT_PLACE).alt })).toHaveAttribute("tabindex", "0");
  });

  it("switches places and views", async () => {
    render(<Twin />);
    const { user, engine } = await startEngine();
    const p = PLACES_3D[2];
    await user.click(screen.getByRole("tab", { name: p.tab }));
    expect(engine.goto).toHaveBeenLastCalledWith(viewKey(p.id, defaultView(p)), true);
    expect(screen.getByRole("tab", { name: p.tab })).toHaveAttribute("aria-selected", "true");
    const views = screen.getByRole("group", { name: `${p.tab} views` });
    const v = p.views[1];
    await user.click(within(views).getByRole("button", { name: v.label }));
    expect(engine.goto).toHaveBeenLastCalledWith(viewKey(p.id, v.id), true);
    expect(within(views).getByRole("button", { name: v.label })).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to the place's default view when the engine cannot show a view", async () => {
    render(<Twin />);
    const { user, engine } = await startEngine();
    const p = PLACES_3D[2];
    await user.click(screen.getByRole("tab", { name: p.tab }));
    // Only the default views exist (e.g. a building module that has not loaded).
    engine.goto.mockImplementation((key: string) => key.endsWith(":default"));
    const v = p.views[2];
    await user.click(within(screen.getByRole("group", { name: `${p.tab} views` })).getByRole("button", { name: v.label }));
    expect(engine.goto).toHaveBeenNthCalledWith(engine.goto.mock.calls.length - 1, viewKey(p.id, v.id), true);
    expect(engine.goto).toHaveBeenLastCalledWith(viewKey(p.id, defaultView(p)), true);
  });

  it("moves between place tabs with the arrow keys", async () => {
    render(<Twin />);
    const tabs = screen.getAllByRole("tab");
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    expect(screen.getAllByRole("tab")[1]).toHaveFocus();
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getAllByRole("tab")[1], { key: "End" });
    expect(screen.getAllByRole("tab")[PLACES_3D.length - 1]).toHaveFocus();
  });

  it("finds a target with Go to and shows its card", async () => {
    render(<Twin />);
    const { user, engine } = await startEngine();
    const select = screen.getByLabelText("Go to");
    const groups = within(select).getAllByRole("group");
    expect(groups.map((g) => g.getAttribute("label"))).toEqual(TARGET_GROUPS.map((g) => g.label));
    const company = firstWith(TARGETS_3D, (t) => t.kind === "company" && !!t.href);
    await user.selectOptions(select, company.id);
    expect(engine.focus).toHaveBeenLastCalledWith(company.id, true);
    expect(screen.getByText(company.detail)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Details/ })).toHaveAttribute("href", company.href);
    expect(screen.getByRole("tab", { name: getPlace3D(company.place).tab })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText(company.detail)).not.toBeInTheDocument();
  });

  it("copies a link that opens the 3D on the selected target", async () => {
    render(<Twin />);
    const { user } = await startEngine();
    const writeText = jest.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const stand = firstWith(TARGETS_3D, (t) => t.kind === "stand");
    await user.selectOptions(screen.getByLabelText("Go to"), stand.id);
    await user.click(screen.getByRole("button", { name: `Copy a link to ${stand.label}` }));
    expect(writeText).toHaveBeenCalledWith(`http://localhost/hackathon-2026/guide/venue?focus=${stand.id}#preview-3d`);
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
  });

  it("selects what the engine picks", async () => {
    render(<Twin />);
    const { opts } = await startEngine();
    const stand = firstWith(TARGETS_3D, (t) => t.kind === "stand");
    act(() => opts.onSelect?.(stand.id));
    expect(screen.getByText(stand.detail)).toBeInTheDocument();
    expect(screen.getByLabelText("Go to")).toHaveValue(stand.id);
    act(() => opts.onSelect?.(null));
    expect(screen.queryByText(stand.detail)).not.toBeInTheDocument();
  });

  it("walks to a target: plays the route, then settles on the target", async () => {
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    const company = firstWith(TARGETS_3D, (t) => t.kind === "company" && !!tourForTarget(t));
    const route = tourForTarget(company)!;
    await user.selectOptions(screen.getByLabelText("Go to"), company.id);
    await user.click(screen.getByRole("button", { name: /Walk me there/ }));
    expect(engine.tour).toHaveBeenLastCalledWith(route.id, "chase");
    expect(screen.getByText(route.label, { selector: "p" })).toBeInTheDocument();

    const step = route.steps[1].text;
    act(() => opts.onTour?.({ id: route.id, t: 0.5, caption: step }));
    // The card shows the step as plain text; the status region announces it, numbered.
    expect(screen.getByText(step, { selector: "p" })).not.toHaveAttribute("aria-live");
    expect(screen.getByText(`Step 2 of ${route.steps.length}`)).toBeInTheDocument();
    expect(announcer()).toHaveTextContent(`Step 2 of ${route.steps.length}: ${step}`);
    expect(screen.getByRole("progressbar", { name: "Route progress" })).toHaveAttribute("aria-valuenow", "50");

    await user.click(screen.getAllByRole("button", { name: "Pause the route" })[0]);
    expect(engine.pauseTour).toHaveBeenLastCalledWith(true);
    await user.click(screen.getAllByRole("button", { name: "Resume the route" })[0]);
    expect(engine.pauseTour).toHaveBeenLastCalledWith(false);

    act(() => opts.onTour?.({ id: route.id, t: 1, caption: null }));
    await act(async () => opts.onTour?.(null));
    expect(engine.focus).toHaveBeenLastCalledWith(company.id, true);
    expect(screen.getByText(company.detail)).toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "Route progress" })).not.toBeInTheDocument();
  });

  it("stopping a route does not jump to the target", async () => {
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    const tour = TOURS_3D[0];
    await user.click(screen.getByRole("button", { name: "Routes" }));
    const sheet = screen.getByRole("region", { name: "Walking routes" });
    await user.click(within(sheet).getByRole("button", { name: new RegExp(tour.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }));
    expect(engine.tour).toHaveBeenLastCalledWith(tour.id, "chase");
    act(() => opts.onTour?.({ id: tour.id, t: 0.3, caption: null }));
    const focusCalls = engine.focus.mock.calls.length;
    await user.click(screen.getAllByRole("button", { name: "Stop the route" })[0]);
    expect(engine.tour).toHaveBeenLastCalledWith(null);
    act(() => opts.onTour?.(null));
    expect(engine.focus.mock.calls.length).toBe(focusCalls);
    expect(screen.getByRole("group", { name: /views$/ })).toBeInTheDocument();
  });

  it("restarting a paused route plays it again, unpaused", async () => {
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    const tour = TOURS_3D[0];
    await user.click(screen.getByRole("button", { name: "Routes" }));
    await user.click(within(screen.getByRole("region", { name: "Walking routes" })).getAllByRole("button")[1]);
    act(() => opts.onTour?.({ id: tour.id, t: 0.4, caption: null }));
    await user.click(screen.getByRole("button", { name: "Pause the route" }));
    expect(screen.getByRole("button", { name: "Resume the route" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restart the route" }));
    expect(engine.tour).toHaveBeenLastCalledWith(tour.id, "chase");
    expect(screen.getByRole("button", { name: "Pause the route" })).toBeInTheDocument();
  });

  it("only leaves walk mode or a route when one is running", async () => {
    render(<Twin />);
    const { user, engine } = await startEngine();
    await user.click(screen.getByRole("tab", { name: PLACES_3D[1].tab }));
    await user.selectOptions(screen.getByLabelText("Go to"), TARGETS_3D[0].id);
    expect(engine.walk).not.toHaveBeenCalled();
    expect(engine.tour).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Walk mode" }));
    await user.click(screen.getByRole("tab", { name: PLACES_3D[2].tab }));
    expect(engine.walk).toHaveBeenLastCalledWith(false);
    expect(engine.tour).not.toHaveBeenCalled();
  });

  it("settles on a route's destination when it finishes", async () => {
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    const tour = TOURS_3D[0];
    const dest = TARGETS_3D.find((t) => t.id === tour.to)!;
    await user.click(screen.getByRole("button", { name: "Routes" }));
    await user.click(within(screen.getByRole("region", { name: "Walking routes" })).getAllByRole("button")[1]);
    act(() => opts.onTour?.({ id: tour.id, t: 1, caption: null }));
    await act(async () => opts.onTour?.(null));
    expect(engine.focus).toHaveBeenLastCalledWith(dest.id, true);
    expect(screen.getByText(dest.detail)).toBeInTheDocument();
    expect(announcer()).toHaveTextContent(`You have arrived: ${dest.label}.`);
  });

  it("steps through a route as stills with reduced motion", async () => {
    setMedia({ reduced: true });
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    expect(opts.reducedMotion).toBe(true);
    await user.click(screen.getByRole("button", { name: "Routes" }));
    await user.click(within(screen.getByRole("region", { name: "Walking routes" })).getAllByRole("button")[1]);
    expect(screen.queryByRole("button", { name: "Pause the route" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Next step/ }));
    expect(engine.pauseTour).toHaveBeenLastCalledWith(false);
  });

  it("explains when walk mode is not available", async () => {
    render(<Twin />);
    const { user, engine } = await startEngine();
    engine.walk.mockImplementation(() => undefined);
    await user.click(screen.getByRole("button", { name: "Walk mode" }));
    expect(screen.getByRole("button", { name: "Walk mode" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Walk mode isn't available on this device")).toBeInTheDocument();
  });

  it("plays routes with the chosen camera", async () => {
    render(<Twin />);
    const { user, engine } = await startEngine();
    await user.click(screen.getByRole("button", { name: "Routes" }));
    await user.click(screen.getByRole("radio", { name: "Eye level" }));
    const tour = TOURS_3D[TOURS_3D.length - 1];
    const sheet = screen.getByRole("region", { name: "Walking routes" });
    await user.click(within(sheet).getAllByRole("button")[TOURS_3D.length]);
    expect(engine.tour).toHaveBeenLastCalledWith(tour.id, "first");
  });

  it("shows a route as text steps when the engine cannot animate it", async () => {
    render(<Twin />);
    const { user, engine } = await startEngine();
    engine.tour.mockReturnValue(false);
    const tour = TOURS_3D[0];
    await user.click(screen.getByRole("button", { name: "Routes" }));
    const sheet = screen.getByRole("region", { name: "Walking routes" });
    await user.click(within(sheet).getAllByRole("button")[1]);
    expect(engine.focus).toHaveBeenLastCalledWith(tour.to, true);
    expect(screen.getByText(/Follow these steps/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause the route" })).not.toBeInTheDocument();
    for (const step of tour.steps) expect(screen.getAllByText(step.text).length).toBeGreaterThan(0);
  });

  it("changes the time of day with presets and the slider", async () => {
    render(<Twin />);
    const { user, engine } = await startEngine();
    const pill = screen.getByRole("button", { name: /change the time of day/ });
    expect(pill).toHaveTextContent(describeTime(DEFAULT_TIME).short);
    await user.click(pill);
    const panel = screen.getByRole("group", { name: "Time of day" });
    const preset = TIME_PRESETS[TIME_PRESETS.length - 1];
    await user.click(within(panel).getByRole("button", { name: preset.label }));
    expect(engine.setTime).toHaveBeenLastCalledWith(preset.iso);
    expect(within(panel).getByRole("button", { name: preset.label })).toHaveAttribute("aria-pressed", "true");
    expect(pill).toHaveTextContent(describeTime(preset.iso).short);

    const slider = within(panel).getByRole("slider", { name: "Friday 6 Nov" });
    fireEvent.change(slider, { target: { value: String(17 * 60) } });
    expect(pill).toHaveTextContent("Fri 17:00 · dusk");
    expect(slider).toHaveAttribute("aria-valuetext", describeTime("2026-11-06T17:00").long);
    await waitFor(() => expect(engine.setTime).toHaveBeenLastCalledWith("2026-11-06T17:00"));

    fireEvent.keyDown(slider, { key: "Escape" });
    expect(screen.queryByRole("group", { name: "Time of day" })).not.toBeInTheDocument();
    expect(pill).toHaveFocus();
  });

  it("walks at eye level with a hint and floor connectors", async () => {
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    await user.click(screen.getByRole("button", { name: "Walk mode" }));
    expect(engine.walk).toHaveBeenLastCalledWith(true, viewKey(DEFAULT_PLACE, defaultView(getPlace3D(DEFAULT_PLACE))));
    expect(screen.getByRole("button", { name: "Walk mode" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("W S / ↑ ↓ walk · A D step · ← → turn")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: getPlace3D(DEFAULT_PLACE).alt })).toHaveFocus();

    act(() => opts.onConnector?.({ id: "joki-stair-1-2", label: "Go up to floor 2" }));
    await user.click(screen.getByRole("button", { name: "Go up to floor 2" }));
    expect(engine.useConnector).toHaveBeenCalledWith("joki-stair-1-2");
    act(() => opts.onConnector?.(null));
    expect(screen.queryByRole("button", { name: "Go up to floor 2" })).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("group", { name: getPlace3D(DEFAULT_PLACE).alt }), { key: "Escape" });
    expect(engine.walk).toHaveBeenLastCalledWith(false);
    expect(screen.queryByText("W S / ↑ ↓ walk · A D step · ← → turn")).not.toBeInTheDocument();
  });

  it("leaves a plain wheel to the page and says what Ctrl + scroll does (zoom, or a step when walking)", async () => {
    render(<Twin />);
    const { user } = await startEngine();
    const host = screen.getByRole("group", { name: getPlace3D(DEFAULT_PLACE).alt });
    fireEvent.wheel(host, { deltaY: 100 });
    expect(screen.getByText("Use Ctrl + scroll to zoom the 3D")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Walk mode" }));
    fireEvent.wheel(host, { deltaY: 100 });
    expect(screen.getByText("Use Ctrl + scroll to take a step")).toBeInTheDocument();
  });

  it("toggles names, zooms and resets from buttons and keys", async () => {
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    // The engine starts with the names on, and says so only when a view changes them.
    expect(screen.getByRole("button", { name: "Show names" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Show names" }));
    expect(engine.setLabels).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("button", { name: "Show names" })).toHaveAttribute("aria-pressed", "false");
    act(() => opts.onLabels?.(true));
    expect(screen.getByRole("button", { name: "Show names" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(engine.zoom).toHaveBeenLastCalledWith(1.25);
    await user.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(engine.zoom).toHaveBeenLastCalledWith(0.8);

    const host = screen.getByRole("group", { name: getPlace3D(DEFAULT_PLACE).alt });
    fireEvent.keyDown(host, { key: "+" });
    expect(engine.zoom).toHaveBeenLastCalledWith(1.25);
    fireEvent.keyDown(host, { key: "-" });
    expect(engine.zoom).toHaveBeenLastCalledWith(0.8);
    engine.goto.mockClear();
    fireEvent.keyDown(host, { key: "0" });
    expect(engine.goto).toHaveBeenCalledWith(viewKey(DEFAULT_PLACE, defaultView(getPlace3D(DEFAULT_PLACE))), true);
  });

  it("opens full screen as a modal dialog that traps focus and closes on Escape", async () => {
    render(<Twin />);
    const { user, engine } = await startEngine();
    const button = screen.getByRole("button", { name: "Full screen" });
    await user.click(button);
    const dialog = screen.getByRole("dialog", { name: getPlace3D(DEFAULT_PLACE).title });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    await waitFor(() => expect(engine.resize).toHaveBeenCalled());

    const focusables = within(dialog)
      .getAllByRole("button")
      .filter((b) => b.tabIndex >= 0);
    const lastButton = screen.getByRole("button", { name: "Routes" });
    lastButton.focus();
    await user.tab();
    expect(focusables[0]).toHaveFocus();
    await user.tab({ shift: true });
    expect(lastButton).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Full screen" })).toHaveFocus());
    expect(engine.dispose).not.toHaveBeenCalled();
  });

  it("opens deep links on desktop straight away (partner ids map to their stand)", async () => {
    setUrl("?focus=red-hat#preview-3d");
    render(<Twin />);
    await screen.findByRole("button", { name: "Show names" });
    const { engine } = last();
    expect(engine.focus).toHaveBeenCalledWith("bc-1", false);
    expect(screen.getByRole("tab", { name: getPlace3D("biocity").tab })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Go to")).toHaveValue("bc-1");
  });

  it("applies ?view, ?time, ?quality and ?walk", async () => {
    const p = PLACES_3D[1];
    setUrl(`?place=${p.id}&view=${p.views[1].id}&time=17:00&quality=low&walk=1`);
    render(<Twin />);
    await screen.findByRole("button", { name: "Show names" });
    const { engine, opts } = last();
    expect(opts.time).toBe("2026-11-06T17:00");
    expect(opts.tier).toBe("low");
    expect(engine.goto).toHaveBeenCalledWith(viewKey(p.id, p.views[1].id), false);
    expect(engine.walk).toHaveBeenCalledWith(true, viewKey(p.id, p.views[1].id));
  });

  it("starts a route from ?tour", async () => {
    const tour = TOURS_3D[1] ?? TOURS_3D[0];
    setUrl(`?tour=${tour.id}`);
    render(<Twin />);
    await screen.findByRole("button", { name: "Show names" });
    expect(last().engine.tour).toHaveBeenCalledWith(tour.id, "chase");
    expect(screen.getByText(tour.label, { selector: "p" })).toBeInTheDocument();
  });

  it("on phones, waits for a tap and then opens full screen; closing frees the engine", async () => {
    setMedia({ coarse: true });
    setUrl("?scene=showroom");
    render(<Twin />);
    await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))));
    expect(mockCreated).toHaveLength(0);
    expect(screen.getByRole("tab", { name: getPlace3D("joki").tab })).toHaveAttribute("aria-selected", "true");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await screen.findByRole("button", { name: "Show names" });
    const { engine } = last();
    expect(engine.goto).toHaveBeenCalledWith("joki:showroom", false);
    expect(screen.queryByRole("button", { name: "Zoom in" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Full screen" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Walk mode" }));
    expect(screen.getByText("Joystick to walk, drag to look")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close the 3D view" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(engine.dispose).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: /Explore in 3D/ })).toHaveFocus());
  });

  it("in a narrow window, opens like on a phone but keeps the keyboard hint", async () => {
    setMedia({ narrow: true });
    setUrl("?focus=elisa");
    render(<Twin />);
    await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))));
    expect(mockCreated).toHaveLength(0); // deep links wait for a click on small screens
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    const dialog = screen.getByRole("dialog");
    await screen.findByRole("button", { name: "Show names" });
    expect(last().engine.focus).toHaveBeenCalledWith("elisa", false);
    expect(within(dialog).queryByRole("button", { name: "Zoom in" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Full screen" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Walk mode" }));
    expect(screen.getByText("W S / ↑ ↓ walk · A D step · ← → turn")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close the 3D view" }));
    expect(last().engine.dispose).toHaveBeenCalled();
  });

  it("auto-starts with ?twin=debug, also on phones, and keeps window.__twin available", async () => {
    setMedia({ coarse: true });
    setUrl("?twin=debug");
    render(<Twin />);
    await screen.findByRole("button", { name: "Show names" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const twin = (window as unknown as { __twin?: { ready: () => Promise<void> } }).__twin;
    expect(typeof twin?.ready).toBe("function");
    await expect(twin!.ready()).resolves.toBeUndefined();
  });

  it("explains when the device has no WebGL 2", async () => {
    mockWebGL.available = false;
    render(<Twin />);
    await userEvent.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    expect(await screen.findByText(/can't show the 3D model/, { selector: "p:not([role])" })).toBeInTheDocument();
    expect(announcer()).toHaveTextContent("No 3D on this device: showing the text version.");
    expect(mockCreated).toHaveLength(0);
  });

  it("offers a retry when the engine fails", async () => {
    mockLoad = async () => {
      throw new Error("boom");
    };
    render(<Twin />);
    await userEvent.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    await screen.findByRole("button", { name: "Try again" });
    expect(announcer()).toHaveTextContent(/3D stopped — showing the text version/);
    expect(last().engine.dispose).toHaveBeenCalled();
    mockLoad = async () => undefined;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("button", { name: "Show names" });
    expect(mockCreated).toHaveLength(2);
  });

  it("goes to the error state when the WebGL context is lost", async () => {
    render(<Twin />);
    const { opts } = await startEngine();
    act(() => opts.onContextLost?.());
    expect(screen.getByText(/The 3D model stopped/, { selector: "p:not([role])" })).toBeInTheDocument();
    expect(announcer()).toHaveTextContent(/3D stopped — showing the text version/);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("lists everything in the 3D as text, with routes and credits", async () => {
    render(<Twin />);
    const user = userEvent.setup();
    const p = firstWith(PLACES_3D, (x) => TARGETS_3D.some((t) => t.place === x.id));
    await user.click(screen.getByRole("tab", { name: p.tab }));
    expect(screen.getByText(p.caption)).toBeInTheDocument();
    const inPlace = TARGETS_3D.filter((t) => t.place === p.id);
    expect(screen.getByText(`In ${p.tab} (${inPlace.length})`)).toBeInTheDocument();
    for (const t of inPlace) expect(screen.getByRole("button", { name: `Show ${t.label} in 3D` })).toBeInTheDocument();
    expect(screen.getByText(`Walking routes (${TOURS_3D.length})`)).toBeInTheDocument();
    for (const t of TOURS_3D) {
      expect(screen.getByRole("heading", { name: t.label, level: 3 })).toBeInTheDocument();
      // Facts use non-breaking spaces; Testing Library normalises them to plain spaces.
      expect(screen.getAllByText(new RegExp(tourFacts(t).replace(/\u00a0/g, " "))).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("link", { name: "OpenStreetMap contributors" })).toHaveAttribute(
      "href",
      "https://www.openstreetmap.org/copyright",
    );
    expect(screen.getByText(/Turun kaupunki/, { selector: "p" })).toBeInTheDocument();

    // "Show" from the list starts the 3D on that target.
    await user.click(screen.getByRole("button", { name: `Show ${inPlace[0].label} in 3D` }));
    await screen.findByRole("button", { name: "Show names" });
    expect(last().engine.focus).toHaveBeenCalledWith(inPlace[0].id, false);
  });

  it("disposes the engine when unmounted", async () => {
    const { unmount } = render(<Twin />);
    const { engine } = await startEngine();
    unmount();
    expect(engine.dispose).toHaveBeenCalled();
  });
});

/* ── Review fixes: loading, routes, focus, full screen ── */

/** Open the routes sheet and play a route from it. */
async function playFromSheet(user: ReturnType<typeof userEvent.setup>, tour: Tour3D) {
  await user.click(screen.getByRole("button", { name: "Routes" }));
  const sheet = screen.getByRole("region", { name: "Walking routes" });
  await user.click(within(sheet).getByRole("button", { name: new RegExp(escapeRe(tour.label)) }));
}

describe("Twin while the 3D loads", () => {
  it("applies a request made while the textures load once the scene is ready", async () => {
    const ready = deferred();
    mockWhenReady = () => ready.promise;
    render(<Twin />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    await waitFor(() => expect(last()?.engine.whenReady).toHaveBeenCalled());
    const { engine } = last();
    // Still "Building the campus…": the routes sheet works, and the route waits.
    const tour = TOURS_3D[2];
    await playFromSheet(user, tour);
    expect(engine.tour).not.toHaveBeenCalled();
    await act(async () => ready.resolve());
    await screen.findByRole("button", { name: "Show names" });
    expect(engine.tour).toHaveBeenCalledWith(tour.id, "chase");
    expect(screen.getByText(tour.label, { selector: "p" })).toBeInTheDocument();
  });

  it("shows the target picked in Go to while loading, not the first request", async () => {
    const ready = deferred();
    mockWhenReady = () => ready.promise;
    render(<Twin />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    await waitFor(() => expect(last()?.engine.whenReady).toHaveBeenCalled());
    const stand = firstWith(TARGETS_3D, (t) => t.kind === "stand");
    await user.selectOptions(screen.getByLabelText("Go to"), stand.id);
    expect(screen.getByRole("group", { name: "Building the 3D campus" })).toHaveTextContent(stand.label);
    expect(describeIntent({ place: stand.place })).toBeNull();
    await act(async () => ready.resolve());
    await screen.findByRole("button", { name: "Show names" });
    expect(last().engine.focus).toHaveBeenLastCalledWith(stand.id, true);
    expect(screen.getByText(stand.detail)).toBeInTheDocument();
    expect(announcer()).toHaveTextContent(`The 3D model is ready: ${stand.label} — ${stand.detail}`);
  });

  it("keeps a place tab chosen while the engine code still downloads", async () => {
    let finish: () => void = () => undefined;
    mockLoad = () => new Promise<void>((resolve) => (finish = resolve));
    render(<Twin />);
    // Both clicks before the engine module has even arrived.
    fireEvent.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    fireEvent.click(screen.getByRole("tab", { name: getPlace3D("biocity").tab }));
    await waitFor(() => expect(mockCreated).toHaveLength(1));
    await act(async () => finish());
    await screen.findByRole("button", { name: "Show names" });
    expect(last().engine.goto).toHaveBeenLastCalledWith(viewKey("biocity", "default"), false);
    expect(screen.getByRole("tab", { name: getPlace3D("biocity").tab })).toHaveAttribute("aria-selected", "true");
  });

  it("starts a deep-linked route only when the scene shows, not behind the loading panel", async () => {
    const ready = deferred();
    mockWhenReady = () => ready.promise;
    const tour = TOURS_3D[5];
    setUrl(`?tour=${tour.id}`);
    render(<Twin />);
    await waitFor(() => expect(last()?.engine.whenReady).toHaveBeenCalled());
    const { engine } = last();
    expect(engine.goto).toHaveBeenCalledWith(viewKey(tour.place, "default"), false);
    expect(engine.tour).not.toHaveBeenCalled();
    // Meanwhile the loading panel says what is coming.
    expect(screen.getByRole("group", { name: "Building the 3D campus" })).toHaveTextContent(`Route: ${tour.label}`);
    await act(async () => ready.resolve());
    await screen.findByRole("button", { name: "Show names" });
    expect(engine.tour).toHaveBeenCalledWith(tour.id, "chase");
  });

  it("stays in the error state when the WebGL context is lost while loading", async () => {
    let finish: () => void = () => undefined;
    mockLoad = () => new Promise<void>((resolve) => (finish = resolve));
    const ready = deferred();
    mockWhenReady = () => ready.promise;
    render(<Twin />);
    await userEvent.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    await waitFor(() => expect(mockCreated).toHaveLength(1));
    act(() => last().opts.onContextLost?.());
    await act(async () => finish());
    await act(async () => ready.resolve());
    expect(screen.queryByRole("button", { name: "Show names" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();

    // Lost during the texture wait (after load) ends the same way.
    mockLoad = async () => undefined;
    const ready2 = deferred();
    mockWhenReady = () => ready2.promise;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(last().engine.whenReady).toHaveBeenCalled());
    act(() => last().opts.onContextLost?.());
    await act(async () => ready2.resolve());
    expect(screen.queryByRole("button", { name: "Show names" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("ignores an engine that was closed (its late progress and picks change nothing)", async () => {
    setMedia({ coarse: true });
    render(<Twin />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    await screen.findByRole("button", { name: "Show names" });
    const first = last();
    await user.click(screen.getByRole("button", { name: "Close the 3D view" }));
    let finish: () => void = () => undefined;
    mockLoad = () => new Promise<void>((resolve) => (finish = resolve));
    await user.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    await waitFor(() => expect(mockCreated).toHaveLength(2));
    act(() => first.opts.onProgress?.({ loaded: 9, total: 11 }));
    expect(screen.queryByText("9/11")).not.toBeInTheDocument();
    act(() => last().opts.onProgress?.({ loaded: 3, total: 11 }));
    expect(screen.getByText("3/11")).toBeInTheDocument();
    await act(async () => finish());
    await screen.findByRole("button", { name: "Show names" });
    const stand = firstWith(TARGETS_3D, (t) => t.kind === "stand");
    act(() => first.opts.onSelect?.(stand.id));
    expect(screen.queryByText(stand.detail)).not.toBeInTheDocument();
  });

  it("announces loading and ready through the status region", async () => {
    let finish: () => void = () => undefined;
    mockLoad = () => new Promise<void>((resolve) => (finish = resolve));
    render(<Twin />);
    await userEvent.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    expect(announcer()).toHaveTextContent("Loading the 3D model…");
    await act(async () => finish());
    await screen.findByRole("button", { name: "Show names" });
    expect(announcer()).toHaveTextContent("The 3D model is ready.");
  });

  it("without WebGL 2, does not try again or open full screen for every Show, Go to or route", async () => {
    mockWebGL.available = false;
    setMedia({ coarse: true });
    render(<Twin />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    await screen.findByText(/can't show the 3D model/, { selector: "p:not([role])" });
    await user.click(screen.getByRole("button", { name: "Close the 3D view" }));
    // The poster keeps saying so, and the 3D is not offered again.
    expect(screen.getByText(/can't show the 3D model/, { selector: "p:not([role])" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Explore in 3D/ })).not.toBeInTheDocument();
    const t0 = TARGETS_3D[0];
    await user.click(screen.getByRole("tab", { name: getPlace3D(t0.place).tab }));
    // Show and Go to answer with the target's card over the poster, as text.
    await user.click(screen.getByRole("button", { name: `Show ${t0.label} in 3D` }));
    expect(screen.getByText(t0.detail, { selector: "p" })).toBeInTheDocument();
    const stand = firstWith(TARGETS_3D, (t) => t.kind === "stand");
    await user.selectOptions(screen.getByLabelText("Go to"), stand.id);
    expect(screen.getByText(stand.detail, { selector: "p" })).toBeInTheDocument();
    // A route shows its steps as text.
    await user.click(screen.getByRole("button", { name: new RegExp(`^Play in 3D.*${escapeRe(TOURS_3D[0].label)}$`) }));
    expect(screen.getByText(`Route: ${TOURS_3D[0].label}`, { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockWebGL.checks).toBe(1);
    expect(mockCreated).toHaveLength(0);
  });

  it("tries again with what the 3D showed when it stopped", async () => {
    setUrl(`?tour=${TOURS_3D[0].id}`);
    render(<Twin />);
    await screen.findByRole("button", { name: "Show names" });
    const user = userEvent.setup();
    const stand = firstWith(TARGETS_3D, (t) => t.kind === "stand");
    await user.selectOptions(screen.getByLabelText("Go to"), stand.id);
    act(() => last().opts.onContextLost?.());
    await user.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("button", { name: "Show names" });
    expect(mockCreated).toHaveLength(2);
    expect(last().engine.focus).toHaveBeenCalledWith(stand.id, false);
    expect(last().engine.tour).not.toHaveBeenCalled(); // not the route the page was opened with
  });
});

describe("Twin routes", () => {
  it("leaving a route in its last metres is not an arrival: Go to shows what was picked", async () => {
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    const tour = TOURS_3D[0];
    await playFromSheet(user, tour);
    act(() => opts.onTour?.({ id: tour.id, t: 1, caption: tour.steps[tour.steps.length - 1].text }));
    const other = firstWith(TARGETS_3D, (t) => t.id !== tour.to && t.kind === "company");
    await user.selectOptions(screen.getByLabelText("Go to"), other.id);
    await act(async () => undefined);
    expect(engine.focus).toHaveBeenLastCalledWith(other.id, true);
    expect(screen.getByLabelText("Go to")).toHaveValue(other.id);
    expect(screen.getByText(other.detail)).toBeInTheDocument();
    expect(announcer()).not.toHaveTextContent(/You have arrived/);
  });

  it("Stop at the very end of a route stays where it is", async () => {
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    const tour = TOURS_3D[1];
    await playFromSheet(user, tour);
    act(() => opts.onTour?.({ id: tour.id, t: 0.99, caption: null }));
    const focusCalls = engine.focus.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Stop the route" }));
    await act(async () => undefined);
    expect(engine.focus.mock.calls.length).toBe(focusCalls);
    expect(announcer()).toHaveTextContent("Route stopped.");
  });

  it("settles on the destination after the engine is back in orbit mode, so the camera flies there", async () => {
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    const tour = TOURS_3D[0];
    await playFromSheet(user, tour);
    act(() => opts.onTour?.({ id: tour.id, t: 1, caption: null }));
    const order: string[] = [];
    engine.focus.mockImplementation((id: string) => {
      order.push(`focus ${id}`);
      return true;
    });
    // The real engine reports the end, then switches back to orbit mode.
    await act(async () => {
      opts.onTour?.(null);
      order.push("orbit");
      opts.onMode?.("orbit");
    });
    expect(order).toEqual(["orbit", `focus ${tour.to}`]);
  });

  it("announces every step once, numbered, starting with step 1", async () => {
    render(<Twin />);
    const { user, opts } = await startEngine();
    const tour = TOURS_3D[2];
    const n = tour.steps.length;
    await playFromSheet(user, tour);
    expect(announcer()).toHaveTextContent(`Route: ${tour.label}. Playing.`);
    act(() => opts.onTour?.({ id: tour.id, t: 0, caption: tour.steps[0].text }));
    expect(announcer()).toHaveTextContent(`Route: ${tour.label}. Step 1 of ${n}: ${tour.steps[0].text}`);
    expect(screen.getByText(`Step 1 of ${n}`)).toBeInTheDocument();
    act(() => opts.onTour?.({ id: tour.id, t: 0.4, caption: tour.steps[1].text }));
    expect(announcer()).toHaveTextContent(`Step 2 of ${n}: ${tour.steps[1].text}`);
    expect(document.querySelector('li[aria-current="step"]')).toHaveTextContent(tour.steps[1].text);
    expect(stepAnnouncement(tour, "Not a step of this route.")).toBe("Not a step of this route.");
  });

  it("with reduced motion, asks for Next step and announces the step it shows", async () => {
    setMedia({ reduced: true });
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    const tour = TOURS_3D[0];
    await playFromSheet(user, tour);
    expect(announcer()).toHaveTextContent(`Route: ${tour.label}. Press Next step to go through it.`);
    // The first still comes before the first step: the card shows the route's summary (the list below has it too).
    act(() => opts.onTour?.({ id: tour.id, t: 0, caption: null }));
    expect(screen.getAllByText(tour.summary, { selector: "p" })).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: /Next step/ }));
    expect(engine.pauseTour).toHaveBeenLastCalledWith(false);
    act(() => opts.onTour?.({ id: tour.id, t: 0.1, caption: tour.steps[0].text }));
    expect(announcer()).toHaveTextContent(`Step 1 of ${tour.steps.length}: ${tour.steps[0].text}`);
  });

  it("keeps a route's controls as the engine runs it when Reduce Motion changes mid-route", async () => {
    render(<Twin />);
    const { user } = await startEngine();
    await playFromSheet(user, TOURS_3D[0]);
    expect(screen.getByRole("button", { name: "Pause the route" })).toBeInTheDocument();
    changeMedia({ reduced: true });
    // The engine still animates (it was made without reduced motion): Pause stays, no Next step.
    expect(screen.getByRole("button", { name: "Pause the route" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Next step/ })).not.toBeInTheDocument();
  });

  it("brings the 3D into view when a route is played from the list before it has started", async () => {
    const scrolled: Element[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };
    try {
      render(<Twin />);
      const tour = TOURS_3D[3];
      await userEvent.click(screen.getByRole("button", { name: new RegExp(`^Play in 3D.*${escapeRe(tour.label)}$`) }));
      expect(scrolled.length).toBeGreaterThan(0);
      await screen.findByRole("button", { name: "Show names" });
      expect(last().engine.tour).toHaveBeenCalledWith(tour.id, "chase");
    } finally {
      Element.prototype.scrollIntoView = original;
    }
  });

  it("plays a route again when a link to the very same URL is followed", async () => {
    const tour = TOURS_3D[6];
    setUrl(`?tour=${tour.id}#preview-3d`);
    render(
      <>
        <Twin />
        <a href={`/hackathon-2026/guide/venue?tour=${tour.id}#preview-3d`}>Walk the route in 3D</a>
        <a href="#preview-3d">3D preview</a>
      </>,
    );
    await screen.findByRole("button", { name: "Show names" });
    const { engine } = last();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Stop the route" }));
    const calls = engine.tour.mock.calls.length;
    // An in-page link without the 3D's parameters only scrolls.
    await user.click(screen.getByRole("link", { name: "3D preview" }));
    expect(engine.tour.mock.calls.length).toBe(calls);
    await user.click(screen.getByRole("link", { name: "Walk the route in 3D" }));
    await waitFor(() => expect(engine.tour).toHaveBeenLastCalledWith(tour.id, "chase"));
    expect(screen.getByText(tour.label, { selector: "p" })).toBeInTheDocument();
  });
});

describe("Twin keyboard focus", () => {
  it("moves focus to the scene when a target's card is closed", async () => {
    render(<Twin />);
    const { user } = await startEngine();
    const stand = firstWith(TARGETS_3D, (t) => t.kind === "stand");
    await user.selectOptions(screen.getByLabelText("Go to"), stand.id);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(sceneHost(stand.place)).toHaveFocus();
  });

  it("continues on the route card after Walk me there", async () => {
    render(<Twin />);
    const { user } = await startEngine();
    const company = firstWith(TARGETS_3D, (t) => t.kind === "company" && !!tourForTarget(t));
    await user.selectOptions(screen.getByLabelText("Go to"), company.id);
    await user.click(screen.getByRole("button", { name: /Walk me there/ }));
    expect(screen.getByRole("button", { name: "Pause the route" })).toHaveFocus();
  });

  it("in full screen, keeps focus in the dialog when a route is picked from the sheet (Next step with reduced motion)", async () => {
    setMedia({ reduced: true });
    render(<Twin />);
    const { user } = await startEngine();
    await user.click(screen.getByRole("button", { name: "Full screen" }));
    const dialog = screen.getByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Routes" }));
    const sheet = screen.getByRole("region", { name: "Walking routes" });
    within(sheet).getByRole("button", { name: new RegExp(escapeRe(TOURS_3D[0].label)) }).focus();
    await user.keyboard("{Enter}");
    const next = screen.getByRole("button", { name: /Next step/ });
    expect(next).toHaveFocus();
    expect(dialog).toContainElement(next);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps focus on the route's row when it is stopped from the routes sheet", async () => {
    render(<Twin />);
    const { user } = await startEngine();
    const tour = TOURS_3D[0];
    await playFromSheet(user, tour);
    await user.click(screen.getByRole("button", { name: "Routes" }));
    const sheet = screen.getByRole("region", { name: "Walking routes" });
    await user.click(within(sheet).getByRole("button", { name: "Stop the route" }));
    expect(within(sheet).getByRole("button", { name: new RegExp(escapeRe(tour.label)) })).toHaveFocus();
  });

  it("returns focus to Walk mode when walking is stopped from its card", async () => {
    render(<Twin />);
    const { user } = await startEngine();
    await user.click(screen.getByRole("button", { name: "Walk mode" }));
    await user.click(screen.getByRole("button", { name: "Stop walking" }));
    expect(screen.getByRole("button", { name: "Walk mode" })).toHaveFocus();
  });

  it("follows a route that arrives to the destination's card", async () => {
    render(<Twin />);
    const { user, opts } = await startEngine();
    const tour = TOURS_3D[0];
    const dest = TARGETS_3D.find((t) => t.id === tour.to)!;
    await playFromSheet(user, tour);
    expect(screen.getByRole("button", { name: "Pause the route" })).toHaveFocus();
    act(() => opts.onTour?.({ id: tour.id, t: 1, caption: null }));
    await act(async () => opts.onTour?.(null));
    expect(screen.getByRole("group", { name: dest.label })).toHaveFocus();
  });

  it("takes focus from Explore to the loading panel, then to the scene", async () => {
    let finish: () => void = () => undefined;
    mockLoad = () => new Promise<void>((resolve) => (finish = resolve));
    render(<Twin />);
    await userEvent.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    expect(screen.getByRole("group", { name: "Building the 3D campus" })).toHaveFocus();
    await act(async () => finish());
    await screen.findByRole("button", { name: "Show names" });
    expect(sceneHost()).toHaveFocus();
  });

  it("leaves focus alone when a deep link starts the 3D by itself", async () => {
    setUrl("?focus=red-hat");
    render(<Twin />);
    await screen.findByRole("button", { name: "Show names" });
    expect(document.body).toHaveFocus();
  });

  it("pulls focus that lands outside the full-screen dialog back in", async () => {
    render(
      <>
        <button type="button">Outside</button>
        <Twin />
      </>,
    );
    const { user } = await startEngine();
    await user.click(screen.getByRole("button", { name: "Full screen" }));
    act(() => screen.getByRole("button", { name: "Outside", hidden: true }).focus());
    expect(sceneHost()).toHaveFocus();
  });
});

describe("Twin full screen and sharing", () => {
  it("closes full screen before following a Details link to this page, then goes to the section", async () => {
    render(
      <>
        <Twin />
        <section id="maps" aria-label="Maps" />
        <section id="venues" aria-label="Venues" />
        <section id="route" aria-label="Route" />
      </>,
    );
    const { user } = await startEngine();
    const local = firstWith(TARGETS_3D, (t) => !!t.href?.startsWith("/hackathon-2026/guide/venue#"));
    await user.click(screen.getByRole("button", { name: "Full screen" }));
    await user.selectOptions(screen.getByLabelText("Go to"), local.id);
    await user.click(screen.getByRole("link", { name: /Details/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe(new URL(local.href!, "http://x").hash));
  });

  it("does nothing when the share sheet is dismissed, and copies when sharing fails otherwise", async () => {
    setMedia({ coarse: true });
    setUrl("?twin=debug");
    render(<Twin />);
    await screen.findByRole("button", { name: "Show names" });
    const user = userEvent.setup();
    const stand = firstWith(TARGETS_3D, (t) => t.kind === "stand");
    await user.selectOptions(screen.getByLabelText("Go to"), stand.id);
    const writeText = jest.fn(async () => undefined);
    const prompt = jest.spyOn(window, "prompt").mockImplementation(() => null);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const share = jest.fn(async () => {
      throw new DOMException("Share canceled", "AbortError");
    });
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    try {
      await user.click(screen.getByRole("button", { name: `Share ${stand.label}` }));
      expect(share).toHaveBeenCalled();
      expect(writeText).not.toHaveBeenCalled();
      expect(prompt).not.toHaveBeenCalled();
      share.mockImplementation(async () => {
        throw new DOMException("Not allowed", "NotAllowedError");
      });
      await user.click(screen.getByRole("button", { name: `Share ${stand.label}` }));
      expect(writeText).toHaveBeenCalledWith(`http://localhost/hackathon-2026/guide/venue?focus=${stand.id}#preview-3d`);
    } finally {
      delete (navigator as unknown as { share?: unknown }).share;
    }
  });

  it("on short screens (phones in landscape), puts the place tabs in the full-screen header", async () => {
    setMedia({ coarse: true, short: true });
    render(<Twin />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    await screen.findByRole("button", { name: "Show names" });
    const header = screen.getByRole("button", { name: "Close the 3D view" }).parentElement!;
    expect(within(header).getByRole("tablist", { name: "Places in the 3D model" })).toBeInTheDocument();
    expect(within(header).getByRole("button", { name: "Show names" })).toBeInTheDocument();
    // The dialog keeps its name (the title is still there for screen readers).
    expect(screen.getByRole("dialog", { name: getPlace3D(DEFAULT_PLACE).title })).toBeInTheDocument();
  });
});

/* ── Round 2: wayfinding, the text version, live engine settings ── */

type Extras = TwinOptions & {
  onSlow?(): void;
  onTime?(iso: string): void;
  onConnectors?(list: { id: string; label: string }[]): void;
};

describe("Twin wayfinding", () => {
  it("shows a company's Friday room and Saturday stand side by side, and switches between them", async () => {
    render(<Twin />);
    const { user, engine } = await startEngine();
    await user.selectOptions(screen.getByLabelText("Go to"), "elisa");
    const pair = screen.getByRole("group", { name: "Elisa: Friday room and Saturday stand" });
    const [fri, sat] = within(pair).getAllByRole("button");
    expect(fri).toHaveTextContent("Fri · briefing");
    expect(fri).toHaveTextContent("EduCity · room 1001");
    expect(sat).toHaveTextContent("Sat · Q&A stand");
    expect(sat).toHaveAttribute("aria-pressed", "true");
    await user.click(fri);
    expect(engine.focus).toHaveBeenLastCalledWith("room-elisa", true);
    expect(screen.getByText("Elisa briefing room", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "EduCity" })).toHaveAttribute("aria-selected", "true");
    // Both are in Go to, saying where.
    expect(screen.getByRole("option", { name: "Elisa — Joki · Showroom counter 4" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Elisa — EduCity · room 1001" })).toBeInTheDocument();
  });

  it("links a target to its floor plan on this page", async () => {
    render(<Twin />);
    const { user } = await startEngine();
    await user.selectOptions(screen.getByLabelText("Go to"), "showroom");
    expect(screen.getByRole("link", { name: "Floor plan" })).toHaveAttribute("href", "#map-joki-showroom");
    // The area's own link is that floor plan: no second "Details" link to the same place.
    expect(screen.queryByRole("link", { name: /Details/ })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Go to"), "takomo-golf");
    expect(screen.getByRole("link", { name: "Floor plan" })).toHaveAttribute("href", "#map-joki-2-3");
    expect(screen.getByRole("link", { name: /Details/ })).toHaveAttribute(
      "href",
      "/hackathon-2026/guide/challenge-partners/takomo-golf",
    );
  });

  it("on phones, keeps the target card to one row of actions (plan and details as named icon buttons)", async () => {
    setMedia({ coarse: true });
    render(<Twin />);
    const { user } = await startEngine();
    await user.selectOptions(screen.getByLabelText("Go to"), "elisa");
    expect(screen.getByRole("link", { name: "Floor plan" })).toHaveAttribute("href", "#map-joki-showroom");
    expect(screen.getByRole("link", { name: "Details: Elisa" })).toHaveAttribute(
      "href",
      "/hackathon-2026/guide/challenge-partners/elisa",
    );
    expect(screen.getByRole("button", { name: /Walk me there/ })).toBeInTheDocument();
  });

  it("walks a company to its own stand, saying where it is now and what comes next", async () => {
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    await user.selectOptions(screen.getByLabelText("Go to"), "takomo-golf");
    await user.click(screen.getByRole("button", { name: /Walk me there/ }));
    const tour = TOURS_3D.find((t) => t.id === "companies-tykistokatu-to-showroom")!;
    expect(engine.tour).toHaveBeenLastCalledWith(tour.id, "chase");
    // The engine reports its captions in the route's own words; the card shows Takomo Golf's version.
    act(() => opts.onTour?.({ id: tour.id, t: 0.2, caption: tour.steps[1].text }));
    expect(screen.getByText(/Step 2 of 5/, { selector: "p:not([role])" })).toHaveTextContent("Entrance recess");
    expect(screen.getByText(/^To/, { selector: "p" })).toHaveTextContent("To Takomo Golf · Joki · floor 3");
    expect(screen.getByText(/^Next/, { selector: "p" })).toHaveTextContent("Next → Build hall");
    const lastStep = tour.steps[tour.steps.length - 1].text;
    act(() => opts.onTour?.({ id: tour.id, t: 0.9, caption: lastStep }));
    expect(screen.getAllByText(/go up to floor 3, where your stand is ready/).length).toBeGreaterThan(0);
    // Only the text list of all routes below the 3D still has the general wording.
    expect(screen.getAllByText(lastStep)).toHaveLength(1);
    expect(screen.getByText(/^Arriving/, { selector: "p" })).toHaveTextContent("Arriving → Takomo Golf");
    expect(announcer()).toHaveTextContent(/Step 5 of 5: .*floor 3, where your stand is ready/);
    // Arriving shows the stand's card.
    act(() => opts.onTour?.({ id: tour.id, t: 1, caption: lastStep }));
    await act(async () => opts.onTour?.(null));
    expect(screen.getByText(getTarget("takomo-golf").detail, { selector: "p" })).toBeInTheDocument();
    expect(announcer()).toHaveTextContent("You have arrived: Takomo Golf.");
  });

  it("plays a company's route from a link and settles on that company's room", async () => {
    const tour = TOURS_3D.find((t) => t.id === "partners-fri-train-edu")!;
    setUrl(`?tour=${tour.id}&focus=room-elisa`);
    render(<Twin />);
    await screen.findByRole("button", { name: "Show names" });
    const { engine, opts } = last();
    expect(engine.goto).toHaveBeenCalledWith(viewKey(tour.place, "default"), false);
    expect(engine.tour).toHaveBeenLastCalledWith(tour.id, "chase");
    expect(screen.getByText(/^To/, { selector: "p" })).toHaveTextContent("To Elisa briefing room · EduCity · room 1001");
    // The steps end at Elisa's own room, not at another company's.
    expect(screen.getByText(/your briefing room for 18:15 is room 1001 Dromberg, on this floor/)).toBeInTheDocument();
    act(() => opts.onTour?.({ id: tour.id, t: 1, caption: null }));
    await act(async () => opts.onTour?.(null));
    expect(engine.focus).toHaveBeenLastCalledWith("room-elisa", true);
  });

  it("names a deep-linked route and where it leads on the poster", () => {
    setMedia({ coarse: true }); // phones wait for a tap
    setUrl("?tour=companies-train-to-biocity&focus=elisa");
    render(<Twin />);
    expect(screen.getByText(/Route: Kupittaa station → BioCity main entrance/)).toHaveTextContent(
      "counter 4 of 6 in the Showroom",
    );
    expect(describeIntent({ place: "biocity", tour: "companies-train-to-biocity", focus: "elisa" })).toBe(
      "Route: Kupittaa station → BioCity main entrance → Elisa",
    );
  });
});

const getTarget = (id: string) => firstWith(TARGETS_3D, (t) => t.id === id);

describe("Twin text version", () => {
  afterEach(() => jest.useRealTimers());

  it("offers the text version when loading takes long, then works without the 3D", async () => {
    jest.useFakeTimers({ advanceTimers: true });
    mockLoad = () => new Promise<void>(() => undefined);
    render(<Twin />);
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await user.click(screen.getByRole("button", { name: /Explore in 3D/ }));
    await waitFor(() => expect(mockCreated).toHaveLength(1));
    expect(screen.queryByRole("button", { name: "Show as text" })).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(20_000));
    await user.click(screen.getByRole("button", { name: "Show as text" }));
    expect(last().engine.dispose).toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Text version" })).toHaveFocus();
    // Go to and Routes answer as text over the poster.
    const stand = firstWith(TARGETS_3D, (t) => t.kind === "stand");
    await user.selectOptions(screen.getByLabelText("Go to"), stand.id);
    expect(screen.getByText(stand.detail, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Floor plan" })).toHaveAttribute("href", "#map-biocity-lobby");
    await user.click(screen.getByRole("button", { name: /Route there/ }));
    const route = tourForTarget(stand)!;
    expect(screen.getByText(`Route: ${route.label}`, { selector: "p" })).toBeInTheDocument();
    for (const s of route.steps) expect(screen.getAllByText(s.text).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /on the floor plan/ })).toHaveAttribute("href", "#map-biocity-lobby");
    expect(mockCreated).toHaveLength(1);
    // And back to the 3D.
    mockLoad = async () => undefined;
    await user.click(screen.getByRole("button", { name: "Try the 3D again" }));
    await screen.findByRole("button", { name: "Show names" });
    expect(mockCreated).toHaveLength(2);
  });

  it("after the WebGL context is lost, keeps finding things as text", async () => {
    render(<Twin />);
    const { user, opts } = await startEngine();
    act(() => opts.onContextLost?.());
    const t = getTarget("room-bayer");
    await user.selectOptions(screen.getByLabelText("Go to"), t.id);
    expect(screen.getByText(t.detail, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Floor plan" })).toHaveAttribute("href", "#map-educity-1");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("Twin engine extras", () => {
  it("follows a time set on the engine from elsewhere", async () => {
    render(<Twin />);
    const { opts } = await startEngine();
    act(() => (opts as Extras).onTime?.("2026-11-07T11:00"));
    expect(screen.getByRole("button", { name: /change the time of day/ })).toHaveTextContent(
      describeTime("2026-11-07T11:00").short,
    );
  });

  it("offers every floor a lift reaches in walk mode", async () => {
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    await user.click(screen.getByRole("button", { name: "Walk mode" }));
    act(() =>
      (opts as Extras).onConnectors?.([
        { id: "lift-1-2", label: "Lift to floor 2" },
        { id: "lift-1-3", label: "Lift to floor 3" },
      ]),
    );
    const group = screen.getByRole("group", { name: "Change level" });
    expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual(["Lift to floor 2", "Lift to floor 3"]);
    await user.click(within(group).getByRole("button", { name: "Lift to floor 3" }));
    expect(engine.useConnector).toHaveBeenCalledWith("lift-1-3");
  });

  it("tells a running engine when Reduce Motion changes; routes started after it are stills", async () => {
    render(<Twin />);
    const { user, engine } = await startEngine();
    engine.setReducedMotion = jest.fn();
    await playFromSheet(user, TOURS_3D[0]);
    changeMedia({ reduced: true });
    expect(engine.setReducedMotion).toHaveBeenLastCalledWith(true);
    // The running route keeps moving…
    expect(screen.getByRole("button", { name: "Pause the route" })).toBeInTheDocument();
    // …the next one is a series of stills.
    await playFromSheet(user, TOURS_3D[1]);
    expect(screen.getByRole("button", { name: /Next step/ })).toBeInTheDocument();
    changeMedia({ reduced: false });
    expect(engine.setReducedMotion).toHaveBeenLastCalledWith(false);
  });

  it("tells the engine which edges of the scene the controls cover", async () => {
    jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0 }) as DOMRect,
    );
    render(<Twin />);
    const { user, engine } = await startEngine();
    const setInsets = jest.fn();
    (engine as unknown as { setInsets: jest.Mock }).setInsets = setInsets;
    await user.selectOptions(screen.getByLabelText("Go to"), "elisa");
    expect(setInsets).toHaveBeenCalled();
    const insets = setInsets.mock.calls.at(-1)[0];
    expect(Object.keys(insets).sort()).toEqual(["bottom", "left", "right", "top"]);
    for (const v of Object.values(insets)) expect(typeof v).toBe("number");
  });

  it("offers the text version when the engine says the 3D is far too slow here", async () => {
    render(<Twin />);
    const { user, engine, opts } = await startEngine();
    act(() => (opts as Extras).onSlow?.());
    expect(announcer()).toHaveTextContent(/runs slowly on this device/);
    const offer = screen.getByRole("group", { name: "The 3D is slow" });
    await user.click(within(offer).getByRole("button", { name: "Keep the 3D" }));
    expect(screen.queryByRole("group", { name: "The 3D is slow" })).not.toBeInTheDocument();
    act(() => (opts as Extras).onSlow?.());
    await user.click(screen.getByRole("button", { name: "Show as text" }));
    expect(engine.dispose).toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Text version" })).toBeInTheDocument();
  });
});

describe("Twin without WebGL 2, from a link", () => {
  it("on a desktop, opens the linked route as text directions to the company's own room", async () => {
    mockWebGL.available = false;
    const tour = TOURS_3D.find((t) => t.id === "partners-fri-train-edu")!;
    setUrl(`?tour=${tour.id}&focus=room-elisa#preview-3d`);
    render(<Twin />);
    expect(await screen.findByText(`Route: ${tour.label}`, { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText(/your briefing room for 18:15 is room 1001 Dromberg, on this floor/, { selector: "span" })).toBeInTheDocument();
    expect(announcer()).toHaveTextContent(`Route: ${tour.label}.`);
    // The visible notice and the announcement never say the same sentence (no echo for screen readers).
    expect(announcer().textContent).not.toContain("This device can't show the 3D model");
    // The route list below marks it.
    expect(screen.getByRole("heading", { level: 3, name: tour.label }).closest("li")).toHaveAttribute("aria-current", "true");
    expect(mockCreated).toHaveLength(0);
  });

  it("on a phone, shows the linked target as text without waiting for a tap", async () => {
    mockWebGL.available = false;
    setMedia({ coarse: true });
    setUrl("?focus=elisa#preview-3d");
    render(<Twin />);
    const t = getTarget("elisa");
    expect(await screen.findByText(t.detail, { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Explore in 3D/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Show ${t.label} in 3D` }).closest("li")).toHaveAttribute("aria-current", "true");
    expect(mockCreated).toHaveLength(0);
  });

  it("on a phone with WebGL 2, still waits for the tap", async () => {
    setMedia({ coarse: true });
    setUrl("?focus=elisa#preview-3d");
    render(<Twin />);
    await waitFor(() => expect(mockWebGL.checks).toBe(1));
    expect(screen.getByRole("button", { name: /Explore in 3D/ })).toBeInTheDocument();
    expect(mockCreated).toHaveLength(0);
  });
});
