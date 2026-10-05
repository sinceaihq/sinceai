#!/bin/bash
# Run the Playwright suite on WebKit (iPhone 15 + desktop Safari) and Firefox inside Playwright's Docker image,
# which ships every browser with its system libraries (the host needs only Docker, no root).
#   scripts/e2e-browsers.sh [playwright args…]      e.g. scripts/e2e-browsers.sh e2e/site.spec.ts
# Targets E2E_BASE (default: a local next start on E2E_PORT, 3100) over the host network.
set -euo pipefail
VERSION=$(node -p 'require("@playwright/test/package.json").version')
PORT=${E2E_PORT:-3100}
exec docker run --rm --network host --ipc=host --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI= \
  -e E2E_ALL_BROWSERS=1 -e E2E_PORT="$PORT" -e E2E_BASE="${E2E_BASE:-http://localhost:$PORT}" \
  -v "$PWD":/work -w /work "mcr.microsoft.com/playwright:v$VERSION-noble" \
  npx playwright test --project=iphone --project=safari --project=firefox "$@"
