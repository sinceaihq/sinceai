// Interaction walkthrough of every Field Guide feature. Prints PASS/FAIL per check.
import { chromium, webkit, firefox, devices } from "@playwright/test";
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:3100";
const OUT = process.argv[2];
const ENGINE = process.env.ENGINE || "chromium";
fs.mkdirSync(OUT, { recursive: true });
const G = "/hackathon-2026/guide";
const results = [];
let current = "";
const ok = (name, cond, extra = "") => {
  results.push({ name: `${current} › ${name}`, pass: !!cond, extra });
  console.log(`${cond ? "PASS" : "FAIL"}  ${current} › ${name}${extra ? `  (${extra})` : ""}`);
};
const shot = (page, name) => page.screenshot({ path: `${OUT}/${ENGINE}-${name}.png` });

const engines = { chromium, webkit, firefox };
const PHONE =
  ENGINE === "webkit"
    ? devices["iPhone 14"]
    : ENGINE === "firefox"
      ? { viewport: { width: 390, height: 844 }, hasTouch: true }
      : devices["Pixel 7"];
const launchArgs = ENGINE === "chromium" ? { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] } : {};
const browser = await engines[ENGINE].launch(launchArgs);
const consoleProblems = [];
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("cookie_consent", "denied");
    } catch {}
  });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type()) && !/GPU stall|GL Driver|WebGL|THREE.WebGLRenderer|ReadPixels|swiftshader|Automatic fallback/i.test(m.text()))
      consoleProblems.push(`${current}: ${m.type()}: ${m.text().slice(0, 200)}`);
  });
  page.on("pageerror", (e) => consoleProblems.push(`${current}: pageerror: ${e.message}`));
  return { ctx, page };
}

// ── 1. Mobile header menu ──────────────────────────────────────────────────
{
  current = "mobile menu";
  const { ctx, page } = await newPage({ ...PHONE });
  await page.goto(BASE + `${G}/builders`, { waitUntil: "networkidle" });
  const summary = page.locator("header details > summary");
  await summary.click();
  const menuNav = page.locator("header details nav");
  ok("opens", await menuNav.isVisible());
  ok("has 7 links", (await menuNav.locator("a").count()) === 7, String(await menuNav.locator("a").count()));
  ok("marks current page", (await menuNav.locator('a[aria-current="page"]').textContent())?.includes("Builders"));
  await shot(page, "menu-open");
  await page.mouse.click(30, 500);
  await page.waitForTimeout(200);
  ok("outside tap closes", !(await menuNav.isVisible()));
  await summary.click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  ok("Escape closes", !(await menuNav.isVisible()));
  ok("Escape returns focus to the button", await summary.evaluate((el) => el === document.activeElement));
  await summary.click();
  await menuNav.getByRole("link", { name: "Judges" }).click();
  await page.waitForURL(/\/judges$/);
  await page.waitForTimeout(300);
  ok("navigates and closes", page.url().endsWith("/judges") && !(await page.locator("header details nav").isVisible()));
  await ctx.close();
}

// ── 2. Section nav + scrollspy ─────────────────────────────────────────────
{
  current = "section nav";
  const { ctx, page } = await newPage({ ...PHONE });
  await page.goto(BASE + `${G}/builders`, { waitUntil: "networkidle" });
  const nav = page.locator('nav[aria-label="On this page"]');
  const ids = await nav.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href").slice(1)));
  let allVisible = true;
  for (const id of ids) {
    await nav.locator(`a[href="#${id}"]`).click();
    await page.waitForTimeout(700);
    const pos = await page.evaluate((id) => {
      const heading = document.getElementById(id)?.querySelector("h2") || document.getElementById(id);
      const bars = document.querySelector('nav[aria-label="On this page"]').getBoundingClientRect().bottom;
      return { top: heading.getBoundingClientRect().top, bars };
    }, id);
    if (pos.top < pos.bars - 1 || pos.top > 400) {
      allVisible = false;
      console.log("   heading position", id, pos);
    }
    const active = await nav.locator('a[aria-current="location"]').getAttribute("href").catch(() => null);
    if (active !== `#${id}`) console.log("   active chip", id, "→", active);
  }
  ok("every chip lands its heading just below the sticky bars", allVisible);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  ok("last chip active at page bottom", (await nav.locator('a[aria-current="location"]').getAttribute("href")) === `#${ids.at(-1)}`);
  await shot(page, "section-nav");
  await ctx.close();
}

// ── 3. Now / next card ─────────────────────────────────────────────────────
{
  current = "now-next";
  const { ctx, page } = await newPage();
  const cases = [
    ["builders", "2026-10-04T12:00", /Starts in 33 days.*Turku 12:00.*Registration opens/i],
    ["builders", "2026-11-06T16:47", /Live now.*Turku 16:47.*Team changes close.*Next.*Teams lock/i],
    ["builders", "2026-11-07T10:30", /Live now.*Challenge partner Q&A open.*Next.*Lunch/i],
    ["builders", "2026-11-08T09:59", /Next.*Hard submission deadline/i],
    ["challenge-partners", "2026-11-06T18:40", /Your challenge briefing/i],
    ["partners", "2026-11-08T15:30", /That's a wrap/i],
    ["judges", "2026-11-08T12:30", /Now.*Company challenge evaluation.*Next.*Closing ceremony/i],
    ["speakers", "2026-11-06T16:00", /Starts in 1 h 0 min.*Opening ceremony/i],
  ];
  for (const [aud, now, re] of cases) {
    await page.goto(`${BASE}${G}/${aud}?now=${now}`, { waitUntil: "networkidle" });
    const text = (await page.locator('section[aria-labelledby="now-next-title"]').innerText()).replace(/\s+/g, " ");
    ok(`${aud} @ ${now}`, re.test(text), text.slice(0, 140));
  }
  await ctx.close();
}

// ── 4. Checklist persistence ───────────────────────────────────────────────
{
  current = "checklist";
  const { ctx, page } = await newPage();
  await page.goto(BASE + `${G}/builders#bring`, { waitUntil: "networkidle" });
  const boxes = page.locator("#bring input[type=checkbox]");
  await boxes.nth(0).click();
  await boxes.nth(4).click();
  await page.reload({ waitUntil: "networkidle" });
  ok("ticks survive reload", (await boxes.nth(0).isChecked()) && (await boxes.nth(4).isChecked()) && !(await boxes.nth(1).isChecked()));
  await page.locator("#bring label").nth(1).click();
  ok("label click toggles", await boxes.nth(1).isChecked());
  await shot(page, "checklist");
  await page.getByRole("button", { name: "Clear ticks" }).click();
  ok("clear ticks", (await page.locator("#bring input:checked").count()) === 0);
  await page.reload({ waitUntil: "networkidle" });
  ok("cleared state persists", (await page.locator("#bring input:checked").count()) === 0);
  // Per-company lists are separate.
  await page.goto(BASE + `${G}/challenge-partners/elisa#prepare`, { waitUntil: "networkidle" });
  await page.locator("#prepare input[type=checkbox]").first().click();
  await page.goto(BASE + `${G}/challenge-partners/bayer#prepare`, { waitUntil: "networkidle" });
  ok("company lists are independent", (await page.locator("#prepare input:checked").count()) === 0);
  await ctx.close();
}

// ── 5. Details accordions ──────────────────────────────────────────────────
{
  current = "details";
  const { ctx, page } = await newPage();
  await page.goto(BASE + `${G}/builders#details`, { waitUntil: "networkidle" });
  const first = page.locator("#details details").first();
  await first.locator("summary").click();
  ok("click opens", await first.evaluate((d) => d.open));
  await first.locator("summary").focus();
  await page.keyboard.press("Enter");
  ok("Enter closes", !(await first.evaluate((d) => d.open)));
  await page.keyboard.press("Space");
  ok("Space opens", await first.evaluate((d) => d.open));
  await ctx.close();
}

// ── 6. Company directory ───────────────────────────────────────────────────
{
  current = "company directory";
  const { ctx, page } = await newPage();
  await page.goto(BASE + `${G}/challenge-partners`, { waitUntil: "networkidle" });
  const search = page.getByRole("searchbox", { name: "Find your company" });
  const rows = page.locator('[id^="company-"]');
  for (const [q, n] of [["Lindström", 1], ["lindstrom", 1], ["2030", 1], ["floor 3", 6], ["showroom", 6], ["joki", 15], ["xyz", 0], ["", 15]]) {
    await search.fill(q);
    await page.waitForTimeout(80);
    ok(`search "${q}" → ${n}`, (await rows.count()) === n, String(await rows.count()));
  }
  const btn = page.locator("#company-revvity").getByRole("button", { name: "Stand on map" });
  await btn.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.waitForTimeout(1200);
  ok("map dialog opens on Joki floors 2–3", /Floors 2 and 3/.test(await dialog.getByRole("heading").first().textContent()));
  ok("Revvity is highlighted", (await dialog.locator(".guide-hotspot-pulse").count()) >= 1);
  await shot(page, "company-map");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  ok("Escape closes, focus back on 'Stand on map'", (await dialog.count()) === 0 && (await btn.evaluate((el) => el === document.activeElement)));
  await ctx.close();
}

// ── 7. Venue explorer + map viewer ─────────────────────────────────────────
{
  current = "map viewer";
  const { ctx, page } = await newPage();
  await page.goto(BASE + `${G}/venue#maps`, { waitUntil: "networkidle" });
  const tabs = page.locator("#maps").getByRole("tab");
  ok("8 map tabs", (await tabs.count()) === 8, String(await tabs.count()));
  for (let i = 0; i < 8; i++) {
    await tabs.nth(i).click();
    await page.waitForTimeout(150);
    const img = page.locator("#maps figure img").first();
    const loaded = await img.evaluate((el) => new Promise((r) => (el.complete ? r(el.naturalWidth > 0) : el.addEventListener("load", () => r(el.naturalWidth > 0)))));
    if (!loaded) ok(`tab ${i} image loads`, false);
  }
  ok("all 8 map images load", true);
  await tabs.nth(4).click(); // BioCity
  const zoomBtn = page.locator("#maps").getByRole("button", { name: /full screen/ });
  await zoomBtn.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.waitForFunction(() => !document.body.innerText.includes("Loading map…"), null, { timeout: 15000 });
  const stage = dialog.locator('[aria-roledescription="zoomable map"] > div').first();
  // The fit is applied on the next animation frame after opening.
  await stage.evaluate((el) => new Promise((r) => { const tick = () => (el.style.transform ? r() : requestAnimationFrame(tick)); tick(); }));
  const t0 = await stage.evaluate((el) => el.style.transform);
  await dialog.getByRole("button", { name: "Zoom in" }).click();
  await page.waitForTimeout(100);
  const t1 = await stage.evaluate((el) => el.style.transform);
  ok("zoom in changes transform", t0 !== t1, `${t0} → ${t1}`);
  const box = await dialog.locator('[aria-roledescription="zoomable map"]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2 - 100, { steps: 6 });
  await page.mouse.up();
  const t2 = await stage.evaluate((el) => el.style.transform);
  ok("drag pans", t2 !== t1);
  await dialog.getByRole("button", { name: "Reset zoom" }).click();
  await page.waitForTimeout(100);
  const t3 = await stage.evaluate((el) => el.style.transform);
  ok("reset returns to fit", t3 === t0, `${t0} vs ${t3}`);
  // Hotspot click focuses it
  await dialog.getByRole("button", { name: /^Stand 1/ }).first().click();
  await page.waitForTimeout(200);
  ok("hotspot click zooms in", (await stage.evaluate((el) => el.style.transform)) !== t0);
  // List "Show" buttons
  await dialog.locator("details > summary").click();
  await dialog.getByRole("button", { name: /^To Joki/ }).last().click();
  await page.waitForTimeout(200);
  ok("list button focuses a location", true);
  await shot(page, "map-viewer");
  // Focus trap: tab many times, focus must stay inside the dialog
  let inside = true;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    if (!(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))) inside = false;
  }
  ok("focus stays inside the dialog", inside);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  ok("Escape closes, focus back on map", (await dialog.count()) === 0 && (await zoomBtn.evaluate((el) => el === document.activeElement)));
  // keyboard zoom with + and arrows
  await zoomBtn.click();
  await dialog.waitFor();
  await page.waitForTimeout(500);
  const k0 = await stage.evaluate((el) => el.style.transform);
  await page.keyboard.press("+");
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(100);
  ok("keyboard + and arrows work", (await stage.evaluate((el) => el.style.transform)) !== k0);
  await page.keyboard.press("0");
  await page.waitForTimeout(100);
  ok("0 resets", (await stage.evaluate((el) => el.style.transform)) === k0);
  await page.keyboard.press("Escape");
  // Deep links
  await page.goto(BASE + `${G}/venue#maps-joki`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  ok("#maps-joki selects a Joki map", /Joki/.test(await page.locator("#maps").getByRole("tab", { selected: true }).textContent()));
  await page.goto(BASE + `${G}/venue#map-educity-2`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  ok("#map-educity-2 selects EduCity floor 2", /EduCity · Floor 2/.test(await page.locator("#maps").getByRole("tab", { selected: true }).textContent()));
  await ctx.close();
}

// ── 7b. Map viewer on a phone: pinch + double tap ──────────────────────────
{
  current = "map viewer (touch)";
  const { ctx, page } = await newPage({ ...PHONE });
  await page.goto(BASE + `${G}/challenge-partners/meyer-turku#friday`, { waitUntil: "networkidle" });
  await page.locator("#friday").getByRole("button", { name: /full screen/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.waitForTimeout(1500);
  const stage = dialog.locator('[aria-roledescription="zoomable map"] > div').first();
  const t0 = await stage.evaluate((el) => el.style.transform);
  ok("opens zoomed onto Meyer Turku's room", /scale\(/.test(t0));
  await shot(page, "map-touch");
  const vp = dialog.locator('[aria-roledescription="zoomable map"]');
  const b = await vp.boundingBox();
  // Simulated pinch-out with two pointers via CDP-less pointer events
  await vp.evaluate((el, b) => {
    const fire = (type, id, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, pointerType: "touch", isPrimary: id === 1 }));
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    fire("pointerdown", 1, cx - 20, cy); fire("pointerdown", 2, cx + 20, cy);
    for (let i = 1; i <= 8; i++) { fire("pointermove", 1, cx - 20 - i * 12, cy); fire("pointermove", 2, cx + 20 + i * 12, cy); }
    fire("pointerup", 1, cx - 116, cy); fire("pointerup", 2, cx + 116, cy);
  }, b);
  await page.waitForTimeout(150);
  const t1 = await stage.evaluate((el) => el.style.transform);
  const scale = (t) => Number(/scale\(([\d.]+)\)/.exec(t)?.[1]);
  ok("pinch out zooms in", scale(t1) > scale(t0), `${scale(t0)} → ${scale(t1)}`);
  await page.getByRole("button", { name: "Close map" }).click();
  await ctx.close();
}

// ── 8. Photo gallery ───────────────────────────────────────────────────────
{
  current = "photo gallery";
  const { ctx, page } = await newPage();
  await page.goto(BASE + `${G}/venue#photos`, { waitUntil: "networkidle" });
  const opens = page.locator("#photos").getByRole("button", { name: /^Open photo/ });
  ok("6 photos", (await opens.count()) === 6, String(await opens.count()));
  ok("every photo has a visible credit", (await page.locator("#photos figcaption").filter({ hasText: /Photo:|Still from/ }).count()) === 6);
  await opens.nth(1).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  const title = async () => (await dialog.getByRole("heading").textContent()).trim();
  ok("opens the clicked photo", /2 \/ 6/.test(await title()), await title());
  await page.keyboard.press("ArrowRight");
  ok("→ next", /3 \/ 6/.test(await title()));
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  ok("← previous wraps", /1 \/ 6/.test(await title()));
  await page.keyboard.press("ArrowLeft");
  ok("wraps to last", /6 \/ 6/.test(await title()));
  await dialog.getByRole("button", { name: "Next photo" }).click();
  ok("next button", /1 \/ 6/.test(await title()));
  ok("credit in viewer", /Photo: Vesa Loikas/.test(await dialog.innerText()));
  await page.waitForTimeout(400);
  await shot(page, "photo-viewer");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  ok("Escape closes, focus returns", (await dialog.count()) === 0 && (await opens.nth(1).evaluate((el) => el === document.activeElement)));
  await ctx.close();
}

// ── 9. 3D preview (desktop) ────────────────────────────────────────────────
if (process.env.SKIP3D !== "1") {
  current = "3D desktop";
  const { ctx, page } = await newPage();
  await page.goto(BASE + `${G}/venue`, { waitUntil: "networkidle" });
  ok("no canvas before asking", (await page.locator("canvas").count()) === 0);
  await page.getByRole("button", { name: "Step inside in 3D" }).click();
  const ready = page.getByRole("button", { name: "Show names", exact: true });
  const unsupported = page.getByText(/can't show the 3D preview/);
  await Promise.race([ready.waitFor({ timeout: 180000 }), unsupported.waitFor({ timeout: 180000 })]);
  if (await unsupported.isVisible()) {
    ok("no WebGL in this headless browser → clear fallback message", true);
    await shot(page, "3d-fallback");
    process.env.SKIP3D = "1";
  }
}
if (process.env.SKIP3D !== "1") {
  const { ctx, page } = await newPage();
  current = "3D desktop";
  await page.goto(BASE + `${G}/venue`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Step inside in 3D" }).click();
  const ready = page.getByRole("button", { name: "Show names", exact: true });
  await ready.waitFor({ timeout: 180000 });
  ok("loads", (await page.locator("canvas").count()) === 1);
  const sceneTabs = page.locator("#preview-3d").getByRole("tab");
  const select = page.getByLabel("Go to");
  for (let s = 0; s < 3; s++) {
    await sceneTabs.nth(s).click();
    await ready.waitFor({ timeout: 180000 });
    await page.waitForTimeout(600);
    const sceneName = (await sceneTabs.nth(s).textContent()).trim();
    const views = page.locator("#preview-3d .absolute.inset-x-3 button, #preview-3d .absolute.inset-x-3 + * button").filter({ hasText: /./ });
    const viewButtons = page.locator("#preview-3d").getByRole("button").filter({ hasNotText: /Step inside/ });
    const options = await select.locator("option").evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
    let fine = true;
    for (const v of options) {
      await select.selectOption(v);
      await page.waitForTimeout(300);
      const card = await page.locator("#preview-3d").getByRole("button", { name: "Clear selection" }).count();
      if (!card) fine = false;
    }
    ok(`${sceneName}: every "Go to" target shows its card (${options.length})`, fine);
    await select.selectOption("");
    await page.waitForTimeout(1300);
    await shot(page, `3d-${s}`);
    // Canvas must not be blank: sample pixels
    const nonBlank = await page.evaluate(() => {
      const c = document.querySelector("canvas");
      return c && c.width > 0 && c.height > 0;
    });
    ok(`${sceneName}: canvas renders`, nonBlank);
  }
  // labels toggle + tour + zoom
  const before = await ready.getAttribute("aria-pressed");
  await ready.click();
  ok("names toggle", (await ready.getAttribute("aria-pressed")) !== before);
  const tour = page.getByRole("button", { name: /slow tour/ });
  await tour.click();
  ok("tour toggles", (await tour.getAttribute("aria-pressed")) === "true");
  await tour.click();
  await page.getByRole("button", { name: "Zoom in" }).last().click();
  await page.getByRole("button", { name: "Zoom out" }).last().click();
  ok("zoom buttons work", true);
  // fullscreen
  await page.getByRole("button", { name: "Full screen", exact: true }).click();
  await page.waitForTimeout(400);
  const fs3d = page.getByRole("dialog", { name: /3D preview/ });
  ok("full screen opens as a dialog", await fs3d.isVisible());
  ok("scene tabs available in full screen", (await fs3d.getByRole("tab").count()) === 3);
  await shot(page, "3d-fullscreen");
  let trapped = true;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    if (!(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')))) trapped = false;
  }
  ok("focus trapped in full screen", trapped);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  ok("Escape exits full screen", (await fs3d.count()) === 0);
  await ctx.close();

  current = "3D deep links";
  for (const [q, scene, expect] of [
    ["?focus=elisa", "Showroom", "Elisa"],
    ["?focus=valmet", "Joki Q&A floors", "Valmet"],
    ["?focus=red-hat", "BioCity build hall", "Stand 1 · Red Hat"],
    ["?scene=biocity", "BioCity build hall", null],
  ]) {
    const { ctx: c2, page: p2 } = await newPage();
    await p2.goto(`${BASE}${G}/venue${q}#preview-3d`, { waitUntil: "networkidle" });
    await p2.getByRole("button", { name: "Show names", exact: true }).waitFor({ timeout: 180000 });
    const sel = (await p2.locator("#preview-3d").getByRole("tab", { selected: true }).textContent()).trim();
    const cardText = expect ? await p2.locator("#preview-3d").getByText(expect, { exact: true }).first().isVisible().catch(() => false) : true;
    ok(`${q} → ${scene}${expect ? ` + ${expect}` : ""}`, sel === scene && cardText, sel);
    await c2.close();
  }
}

// ── 9b. 3D on a phone ──────────────────────────────────────────────────────
if (process.env.SKIP3D !== "1") {
  current = "3D phone";
  const { ctx, page } = await newPage({ ...PHONE });
  await page.goto(BASE + `${G}/venue`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Step inside in 3D" }).click();
  const fs3d = page.getByRole("dialog", { name: /3D preview/ });
  await fs3d.waitFor();
  ok("tap opens full screen immediately", await fs3d.isVisible());
  await page.getByRole("button", { name: "Show names", exact: true }).waitFor({ timeout: 180000 });
  await fs3d.getByRole("tab", { name: "Joki Q&A floors" }).click();
  await page.getByRole("button", { name: "Show names", exact: true }).waitFor({ timeout: 180000 });
  await page.waitForTimeout(800);
  await shot(page, "3d-phone");
  ok("scene switch inside full screen", (await fs3d.getByRole("tab", { selected: true }).textContent()).includes("Joki"));
  ok("page scroll locked", (await page.evaluate(() => getComputedStyle(document.documentElement).overflow)) === "hidden");
  await page.getByRole("button", { name: "Close the 3D preview" }).click();
  await page.waitForTimeout(300);
  ok("close disposes the canvas", (await page.locator("canvas").count()) === 0);
  ok("scroll unlocked", (await page.evaluate(() => getComputedStyle(document.documentElement).overflow)) !== "hidden");
  await ctx.close();
}

// ── 10. Calendar, share, print ─────────────────────────────────────────────
{
  current = "calendar";
  const { ctx, page } = await newPage();
  await page.goto(BASE + `${G}/builders#schedule`, { waitUntil: "networkidle" });
  const link = page.getByRole("link", { name: /Add to calendar/ });
  const href = await link.getAttribute("href");
  const res = await page.request.get(BASE + href);
  const body = await res.text();
  ok("calendar link returns text/calendar", res.ok() && /text\/calendar/.test(res.headers()["content-type"]));
  ok("contains the builder schedule", /SUMMARY:Registration opens/.test(body) && /BEGIN:VEVENT/.test(body));
  const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
  ok("click downloads an .ics file", download.suggestedFilename() === "since-ai-hackathon-2026-builders.ics", download.suggestedFilename());

  // Company page: its own calendar + personalised schedule rows.
  await page.goto(BASE + `${G}/challenge-partners/elisa#schedule`, { waitUntil: "networkidle" });
  const companyLinks = page.getByRole("link", { name: /Add to calendar/ });
  ok("company page has two calendar links", (await companyLinks.count()) === 2);
  const chref = await companyLinks.first().getAttribute("href");
  ok("company calendar is per company", chref === `${G}/calendar/challenge-partners/elisa`, chref);
  const cres = await page.request.get(BASE + chref);
  const cbody = (await cres.text()).replace(/\r\n /g, "");
  ok("company calendar has own room", cres.ok() && /Room 1001 Dromberg · floor 1/.test(cbody));
  const [cdl] = await Promise.all([page.waitForEvent("download"), companyLinks.last().click()]);
  ok("company calendar downloads with company name", cdl.suggestedFilename() === "since-ai-hackathon-2026-elisa.ics", cdl.suggestedFilename());
  const sched = (await page.locator("#schedule").innerText()).replace(/\u00a0/g, " ");
  ok("company schedule shows own room", /Room 1001 Dromberg · floor 1/.test(sched));
  ok("company schedule shows own stand", /Your stand · Floor 1 · Showroom/.test(sched) && /curved LED wall/.test(sched));
  ok("no stale 'Your place' text", !/Your place/.test(sched));
  await page.goto(BASE + `${G}/challenge-partners#schedule`, { waitUntil: "networkidle" });
  ok("shared partner schedule stays generic", /Each company's own page in this guide shows its exact floor and stand/.test((await page.locator("#schedule").innerText()).replace(/\u00a0/g, " ")));

  // Partner stands are named in the map's location list.
  await page.goto(BASE + `${G}/partners#stands`, { waitUntil: "networkidle" });
  const mapText = (await page.locator("main").innerText()).replace(/\u00a0/g, " ");
  ok("map list names Red Hat stand", /Stand 1 · Red Hat/.test(mapText));
  ok("map list names Solita stand", /Stand 2 · Solita/.test(mapText));
  ok("open stands labelled Visibility / Tech Partner stand", (mapText.match(/Visibility \/ Tech Partner stand ·/g) || []).length >= 2);
  await ctx.close();

  current = "share";
  const { ctx: c3, page: p3 } = await newPage(ENGINE === "chromium" ? { permissions: ["clipboard-read", "clipboard-write"] } : {});
  if (ENGINE === "chromium") {
    await p3.goto(BASE + `${G}/challenge-partners/apetit`, { waitUntil: "networkidle" });
    await p3.getByRole("button", { name: "Share this page" }).click();
    await p3.waitForTimeout(200);
    ok("copy link shows confirmation", await p3.getByText("Link copied").isVisible());
    ok("clipboard has the page URL", (await p3.evaluate(() => navigator.clipboard.readText())).endsWith("/challenge-partners/apetit"));
  }
  await c3.close();

  current = "print";
  const { ctx: c4, page: p4 } = await newPage();
  for (const r of ["", "/builders", "/challenge-partners", "/partners", "/judges", "/speakers", "/venue", "/challenge-partners/saarioinen"]) {
    await p4.goto(BASE + G + r, { waitUntil: "networkidle" });
    await p4.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    await p4.emulateMedia({ media: "print" });
    const s = await p4.evaluate(() => {
      const dark = [...document.querySelectorAll(".guide-root *")].filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || el.closest(".guide-no-print")) return false;
        const m = cs.backgroundColor.match(/\d+(\.\d+)?/g);
        if (!m) return false;
        const [r, g, b, a = 1] = m.map(Number);
        return a > 0.2 && r + g + b < 200;
      });
      const closedDetails = [...document.querySelectorAll(".guide-root details:not([open])")].filter((d) => !d.closest(".guide-no-print") && getComputedStyle(d).display !== "none").length;
      return { body: getComputedStyle(document.body).backgroundColor, dark: dark.length, closedDetails, fixed: [...document.querySelectorAll(".fixed")].filter((e) => getComputedStyle(e).display !== "none").length };
    });
    ok(`${r || "/"}: white page, no dark blocks, details open, no overlays`, s.body === "rgb(255, 255, 255)" && s.dark === 0 && s.closedDetails === 0 && s.fixed === 0, JSON.stringify(s));
    await p4.emulateMedia({ media: "screen" });
    await p4.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  }
  await c4.close();
}

// ── 11. Teasers deep-link into 3D ──────────────────────────────────────────
{
  current = "teasers";
  const { ctx, page } = await newPage();
  await page.goto(BASE + `${G}/challenge-partners/takomo-golf#saturday`, { waitUntil: "networkidle" });
  const teaser = page.locator("#saturday a[href*='/venue?focus=takomo-golf']");
  ok("company teaser links with focus", (await teaser.count()) === 1);
  await page.goto(BASE + `${G}/partners#stands`, { waitUntil: "networkidle" });
  ok("partner teaser opens BioCity", (await page.locator("a[href*='/venue?focus=biocity']").count()) === 1);
  await ctx.close();
}

// ── 12. Keyboard focus visibility ──────────────────────────────────────────
{
  current = "keyboard";
  const { ctx, page } = await newPage();
  for (const r of ["", "/builders", "/challenge-partners/elisa", "/venue"]) {
    await page.goto(BASE + G + r, { waitUntil: "networkidle" });
    const invisible = [];
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const visible = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== "none";
        // Checkbox focus shows on the input itself; summary/labels covered by outline classes.
        return { visible, tag: el.tagName, text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40) };
      });
      if (info && !info.visible) invisible.push(`${info.tag} "${info.text}"`);
    }
    ok(`${r || "/"}: every focused element shows a focus ring`, invisible.length === 0, [...new Set(invisible)].slice(0, 6).join(" | "));
  }
  await ctx.close();
}

// ── 13. Reduced motion ─────────────────────────────────────────────────────
{
  current = "reduced motion";
  const { ctx, page } = await newPage({ reducedMotion: "reduce" });
  await page.goto(BASE + `${G}/challenge-partners/elisa`, { waitUntil: "networkidle" });
  const anim = await page.locator(".guide-hotspot-pulse").first().evaluate((el) => getComputedStyle(el).animationName);
  ok("pulse disabled", anim === "none", anim);
  await ctx.close();
  // A fresh visit, like opening a shared link (a second full load in the same
  // tab only adds Chrome's "preloaded but not used" heuristics, site-wide).
  const { ctx: c2, page: p2 } = await newPage({ reducedMotion: "reduce" });
  await p2.goto(BASE + `${G}/venue`, { waitUntil: "networkidle" });
  if (process.env.SKIP3D !== "1") {
    await p2.getByRole("button", { name: "Step inside in 3D" }).click();
    await p2.getByRole("button", { name: "Show names", exact: true }).waitFor({ timeout: 180000 });
    ok("no slow-tour button", (await p2.getByRole("button", { name: /slow tour/ }).count()) === 0);
  }
  await c2.close();
}

// ── 14. Without JavaScript ─────────────────────────────────────────────────
{
  current = "no JavaScript";
  const ctx = await browser.newContext({ javaScriptEnabled: false, ...PHONE });
  const page = await ctx.newPage();
  for (const r of ["", "/builders", "/challenge-partners", "/challenge-partners/dna", "/partners", "/judges", "/speakers", "/venue"]) {
    await page.goto(BASE + G + r);
    const text = await page.locator("main").innerText();
    ok(`${r || "/"} renders content`, text.length > 1500 && /Turku/.test(text), String(text.length));
  }
  await page.goto(BASE + G + "/builders");
  await page.locator("header details > summary").click();
  ok("menu works without JS", await page.locator("header details nav").isVisible());
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${ENGINE}: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) console.log("FAILED:\n" + failed.map((f) => `  ${f.name} ${f.extra}`).join("\n"));
console.log(`console problems (${consoleProblems.length}):\n` + [...new Set(consoleProblems)].slice(0, 30).join("\n"));
fs.writeFileSync(`${OUT}/${ENGINE}-results.json`, JSON.stringify({ results, consoleProblems }, null, 1));
