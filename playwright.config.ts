import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Browser tests for the Hackathon 2026 Field Guide and the public site.
 *
 *   npm run build
 *   npm run test:e2e
 *
 * Runs against the production build (`next start`). An already running server
 * on E2E_PORT is reused. E2E_BASE=https://sinceai.ai runs the same tests
 * against a deployed site (no local server).
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE = process.env.E2E_BASE;

// Software WebGL so the 3D renders headless: Mesa lavapipe when scripts/twin/qa/setup-mesa.sh has unpacked it
// (several times faster, so the 3D tests hold under load), else SwiftShader.
const MESA_LIB = path.join(process.env.TWIN_MESA ?? path.join(os.homedir(), "mesa-local", "root"), "usr/lib/x86_64-linux-gnu");
const lavapipe = process.platform === "linux" && fs.existsSync(path.join(MESA_LIB, "libEGL_mesa.so.0"));
const webglArgs = lavapipe
  ? ["--use-gl=egl", "--enable-gpu", "--ignore-gpu-blocklist"]
  : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];
const webglEnv = lavapipe
  ? {
      ...Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined)),
      LD_LIBRARY_PATH: [MESA_LIB, process.env.LD_LIBRARY_PATH].filter(Boolean).join(":"),
      VK_ICD_FILENAMES: path.join(MESA_LIB, "../../../../lvp_icd.json"),
      __EGL_VENDOR_LIBRARY_FILENAMES: path.join(MESA_LIB, "../../../../50_mesa.json"),
      LP_NUM_THREADS: process.env.LP_NUM_THREADS ?? "8",
    }
  : undefined;
const launchOptions = { args: webglArgs, env: webglEnv };

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: BASE
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}/hackathon-2026/guide`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, launchOptions },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], launchOptions },
    },
    // Safari engine (iPhone) and Firefox need system libraries; run them in Playwright's image:
    //   scripts/e2e-browsers.sh  (docker, --network host, same tests)
    ...(process.env.E2E_ALL_BROWSERS
      ? [
          { name: "iphone", use: { ...devices["iPhone 15"] } },
          { name: "safari", use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } } },
          { name: "firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1440, height: 900 } } },
        ]
      : []),
  ],
});
