#!/bin/bash
# Release gate: everything that must be green before a commit goes to main (and so to production).
# Run it in a clean checkout of the exact commit to release, e.g. a git worktree:
#
#   git worktree add ../release <sha> && cd ../release && cp -al ../sinceai-web/node_modules node_modules
#   scripts/release-check.sh
#
# Steps: clean tree → tsc → eslint → jest → next build → e2e (desktop + Pixel 7, guide + public site, 3D on
# software GL) against next start → Cloudflare build → the worker in workerd (wrangler dev): every route,
# headers and the OG image. Exits non-zero on the first failure. Logs go to $OUT.
set -euo pipefail
OUT=${OUT:-${TMPDIR:-/tmp}/sinceai-release-check}
PORT=${E2E_PORT:-3300}
WPORT=${WRANGLER_PORT:-8799}
mkdir -p "$OUT"
step() { printf '\n== %s\n' "$*"; }
cleanup() { [ -n "${NEXT_PID:-}" ] && kill "$NEXT_PID" 2>/dev/null || true; [ -n "${WR_PID:-}" ] && kill "$WR_PID" 2>/dev/null || true; }
trap cleanup EXIT

step "clean tree at $(git rev-parse --short HEAD)"
test -z "$(git status --porcelain --untracked-files=no)" || { git status --short; echo "tracked changes present"; exit 1; }

step "typecheck";  npx tsc --noEmit -p . > "$OUT/tsc.log" 2>&1 || { tail -30 "$OUT/tsc.log"; exit 1; }
step "lint";       npm run lint > "$OUT/eslint.log" 2>&1 || { tail -30 "$OUT/eslint.log"; exit 1; }
grep -E "^✖|error" "$OUT/eslint.log" | tail -3 || true
step "unit tests"; npx jest --maxWorkers=${JEST_WORKERS:-6} > "$OUT/jest.log" 2>&1 || { grep -E "●|FAIL" "$OUT/jest.log" | head -40; exit 1; }
grep -E "^Tests:" "$OUT/jest.log"

step "next build"; npm run build > "$OUT/build.log" 2>&1 || { tail -40 "$OUT/build.log"; exit 1; }
npx next start -p "$PORT" > "$OUT/next.log" 2>&1 &
NEXT_PID=$!
for _ in $(seq 1 60); do curl -sf -o /dev/null "http://localhost:$PORT/hackathon-2026/guide" && break; sleep 1; done
step "e2e on :$PORT"
E2E_PORT=$PORT npx playwright test --workers=${E2E_WORKERS:-6} > "$OUT/e2e.log" 2>&1 || { grep -E "✘|failed|Error:" "$OUT/e2e.log" | head -40; exit 1; }
grep -E "passed|skipped|flaky" "$OUT/e2e.log" | tail -3
kill "$NEXT_PID"; NEXT_PID=

step "cloudflare build"; npm run build:cloudflare > "$OUT/cf-build.log" 2>&1 || { tail -40 "$OUT/cf-build.log"; exit 1; }
npx wrangler dev --port "$WPORT" --ip 127.0.0.1 > "$OUT/wrangler.log" 2>&1 &
WR_PID=$!
for _ in $(seq 1 90); do curl -sf -o /dev/null "http://127.0.0.1:$WPORT/" && break; sleep 1; done
step "worker routes on :$WPORT"
fail=0
check() { # path expected-status [header-substring]
  local code hdr
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$WPORT$1")
  hdr=$(curl -sI "http://127.0.0.1:$WPORT$1" | tr -d '\r' | tr 'A-Z' 'a-z')
  if [ "$code" != "$2" ] || { [ -n "${3:-}" ] && ! grep -q "$3" <<<"$hdr"; }; then echo "FAIL $1 → $code"; fail=1; else echo "ok   $1 → $code"; fi
}
for p in / /about /partners /hackathon /blog /blog/ai-hackathon-project-ideas /contact /faq /events /projects; do check "$p" 200; done
check /api/og/blog 200 "content-type: image/png"
check "/api/og/blog?slug=ai-hackathon-project-ideas" 200 "content-type: image/png"
for p in "" /builders /challenge-partners /partners /judges /speakers /venue /challenge-partners/elisa /challenge-partners/meyer-turku; do
  check "/hackathon-2026/guide$p" 200 "x-robots-tag: noindex"
done
check /hackathon-2026/guide/calendar/challenge-partners/elisa 200 "content-type: text/calendar"
check /hackathon-2026/guide/no-such-page 404 "x-robots-tag: noindex"
check /assets/guide/3d/data/campus.json 200
check /sitemap.xml 200
check /robots.txt 200
[ "$fail" = 0 ] || exit 1
echo; echo "RELEASE CHECK GREEN at $(git rev-parse HEAD)"
