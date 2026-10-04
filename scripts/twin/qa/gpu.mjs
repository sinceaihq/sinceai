// Memory-safe GPU browser launcher for the campus twin's QA scripts (macOS + Apple GPU via ANGLE/Metal).
//
//   import { launchGpu } from "./gpu.mjs";
//   const browser = await launchGpu();            // waits for a free slot (max GPU_SLOTS machine-wide)
//   try { ... } finally { await browser.close(); } // closing frees the slot
//
// The machine has 16 GB shared between the GPU and everything else, and the owner runs other
// projects (Docker, another dev server) at the same time. So: at most GPU_SLOTS (default 2)
// headless Chromium instances at once across ALL agents, and none while free memory is low.
import { chromium } from "@playwright/test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const LOCKS = path.join(os.tmpdir(), "sinceai-twin-gpu-locks");
const SLOTS = Number(process.env.GPU_SLOTS ?? 2);
const MIN_FREE_PCT = Number(process.env.GPU_MIN_FREE_PCT ?? 25);
const WAIT_MS = Number(process.env.GPU_WAIT_MS ?? 15 * 60 * 1000);
// macOS: the real Apple GPU through ANGLE/Metal. Linux servers without a GPU: SwiftShader (slow, but correct).
const GPU_ARGS =
  process.platform === "darwin"
    ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"]
    : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"];

fs.mkdirSync(LOCKS, { recursive: true });

const alive = (pid) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

function freePct() {
  if (process.platform === "linux") {
    try {
      const info = fs.readFileSync("/proc/meminfo", "utf8");
      const kb = (k) => Number(new RegExp(`${k}:\\s+(\\d+)`).exec(info)?.[1] ?? 0);
      return Math.round((100 * kb("MemAvailable")) / Math.max(1, kb("MemTotal")));
    } catch {
      return 100;
    }
  }
  try {
    const out = execSync("memory_pressure 2>/dev/null | grep 'free percentage'", { encoding: "utf8", timeout: 5000 });
    const m = /(\d+)%/.exec(out);
    return m ? Number(m[1]) : 100;
  } catch {
    return 100;
  }
}

function tryAcquire() {
  for (let i = 0; i < SLOTS; i++) {
    const dir = path.join(LOCKS, `gpu-slot-${i}`);
    try {
      fs.mkdirSync(dir);
      fs.writeFileSync(path.join(dir, "pid"), String(process.pid));
      return dir;
    } catch {
      // Taken — reclaim it if its owner died without releasing.
      try {
        const pid = Number(fs.readFileSync(path.join(dir, "pid"), "utf8"));
        if (pid && !alive(pid)) fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // Owner is still writing its pid; leave it.
      }
    }
  }
  return null;
}

const held = new Set();
function releaseAll() {
  for (const dir of held) fs.rmSync(dir, { recursive: true, force: true });
  held.clear();
}
process.on("exit", releaseAll);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    releaseAll();
    process.exit(130);
  });
}

/** Wait for a GPU slot (and enough free memory), then launch headless Chromium on the real GPU. */
export async function launchGpu(options = {}) {
  const start = Date.now();
  let slot = null;
  let warned = false;
  for (;;) {
    if (freePct() >= MIN_FREE_PCT) slot = tryAcquire();
    if (slot) break;
    if (Date.now() - start > WAIT_MS) throw new Error(`launchGpu: no GPU slot / memory after ${WAIT_MS / 1000}s`);
    if (!warned) {
      console.error(`[gpu] waiting for a GPU slot (max ${SLOTS}) and >= ${MIN_FREE_PCT}% free memory…`);
      warned = true;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  held.add(slot);
  let browser;
  try {
    browser = await chromium.launch({ ...options, args: [...GPU_ARGS, ...(options.args ?? [])] });
  } catch (e) {
    held.delete(slot);
    fs.rmSync(slot, { recursive: true, force: true });
    throw e;
  }
  const close = browser.close.bind(browser);
  browser.close = async (...a) => {
    try {
      await close(...a);
    } finally {
      held.delete(slot);
      fs.rmSync(slot, { recursive: true, force: true });
    }
  };
  browser.on("disconnected", () => {
    held.delete(slot);
    fs.rmSync(slot, { recursive: true, force: true });
  });
  return browser;
}
