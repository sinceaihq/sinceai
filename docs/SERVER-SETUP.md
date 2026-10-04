# Fresh Ubuntu server setup (development & testing)

For continuing the Hackathon 2026 Field Guide / campus twin work on a new Ubuntu (22.04 / 24.04) server.

## Requirements

- **Node.js 22 LTS** (CI uses 22; `package.json` engines: `>=20.9.0`) and **npm 10+** (lockfile: `package-lock.json`;
  always install with `--legacy-peer-deps`).
- **git**. No Docker, database or other service is needed to develop, build, test or run the site.
- For browser tests: Playwright's Chromium with its system libraries (`npx playwright install --with-deps chromium`).
  The 3D renders with SwiftShader on a GPU-less server — correct but slow; real-GPU visual checks need a Mac
  (`scripts/twin/qa/gpu.mjs` picks Metal on macOS, SwiftShader on Linux).
- RAM: 8 GB+ recommended (Next build ~3 GB peak; each 3D test browser ~1 GB).

## Environment variables (names only)

None are needed for `dev`, `build`, `start` or the tests.

- Deploy (GitHub Actions secrets, not needed on the server): `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`.
- Optional QA tooling: `BASE`, `TWIN_BASE`, `E2E_PORT`, `SKIP3D`, `TWIN_RESEARCH_DIR`, `GPU_SLOTS`,
  `GPU_MIN_FREE_PCT`, `GPU_WAIT_MS`, `POSTER_GPU`.

## Commands

```bash
# 1. Node 22 + git (NodeSource)
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Code (this exact branch)
git clone --branch feature/hackathon-2026-field-guide https://github.com/sinceaihq/sinceai.git
cd sinceai
npm ci --legacy-peer-deps

# 3. Sanity checks
npx tsc --noEmit -p .
npm run lint
npx jest --maxWorkers=2

# 4. Run
npm run dev -- -H 0.0.0.0 -p 3000          # development, http://<server>:3000/hackathon-2026/guide
# or production:
npm run build && npm start -- -H 0.0.0.0 -p 3000

# 5. Browser tests (production build on port 3100)
npx playwright install --with-deps chromium
npm run build && (npx next start -p 3100 &) && npm run test:e2e

# 6. Cloudflare Workers build (same as CI)
npm run build:cloudflare
```

Regenerate the 3D campus data (deterministic): `node scripts/twin/build-campus-data.mjs --src data/campus-twin/sources
--out public/assets/guide/3d`. Runbook for the 3D: `docs/campus-twin/README.md`; open QA items:
`docs/campus-twin/qa/`.

## Not in git (transfer separately if needed)

- `public/assets/sponsors/*` and `public/assets/supports/*` — the owner's local, intentionally untracked logo files.
- The 3D research reference photos / orthophotos (internal modelling reference only, never shipped).
