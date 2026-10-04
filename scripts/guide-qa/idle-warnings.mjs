import { firefox, chromium, webkit } from "@playwright/test";
const engines = { firefox, chromium, webkit };
for (const name of ["firefox", "chromium", "webkit"]) {
  const b = await engines[name].launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem("cookie_consent", "denied"); } catch {} });
  const G = "/hackathon-2026/guide";
  for (const path of [G, `${G}/builders`, `${G}/challenge-partners`, `${G}/partners`, `${G}/judges`, `${G}/speakers`, `${G}/venue`, `${G}/challenge-partners/elisa`, `${G}/challenge-partners/saarioinen`, `${G}/no-such-page`, "/hackathon-2026"]) {
    const p = await ctx.newPage();
    const msgs = [];
    p.on("console", (m) => { if (["warning", "error"].includes(m.type()) && !(path.includes("no-such-page") && /404/.test(m.text()))) msgs.push(m.text().slice(0, 150)); });
    await p.goto((process.env.BASE || "http://localhost:3100") + path, { waitUntil: "networkidle" });
    await p.waitForTimeout(Number(process.env.IDLE || 7000));
    console.log(`${name} ${path}: ${msgs.length} ${msgs.map((m) => "\n    " + m).join("")}`);
    await p.close();
  }
  await b.close();
}
