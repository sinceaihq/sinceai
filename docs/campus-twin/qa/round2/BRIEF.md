# Campus twin — round 2 brief (read fully before you start)

You own one part of the "campus twin": the photoreal, to-scale, interactive three.js (r186) model of the Since AI
Hackathon 2026 campus (EduCity, BioCity, Joki, the streets between them, arrival routes, the G-Class display in BioCity's
Tykistökatu entrance recess) inside the Next.js 16 repo `/srv/sinceai/sinceai-web` (branch
`feature/hackathon-2026-field-guide`). The Field Guide is live on https://sinceai.ai/hackathon-2026/guide and partners
are using it now; the twin is on `/hackathon-2026/guide/venue#preview-3d` and behind every "Walk it in 3D" card.

## The bar

The owner's words: *world-class product from an exceptionally capable global technology organization — surprising that
a small team built it.* Not a showroom demo: a coherent campus experience that makes arriving and finding your room or
stand unusually easy for people who have never been there. Visitors must recognise the real places (entrances, facades,
lobbies, the Showroom, the streets) from the model. Where a fact can be verified (plans, `docs/campus-twin/SITE-FACTS.md`,
`data/campus-twin/sources/`, public photos/maps), use it — never invent venue facts. Decorative elements (event
vehicles, people, flags) must never reduce navigational clarity or suggest false operational information (e.g. a door
that is closed during the event must not read as open).

Confirmed operational facts (do not contradict them anywhere): challenge partners bring their stand materials to EduCity
on Friday; the Since AI team moves and sets up the stands in Joki; on Saturday partners arrive at Joki to a ready stand.
Sunday: challenge evaluation 10:00–13:00; the 15 company challenge winners are announced from 13:30; participant voting
picks the five finalists; the final stage starts 14:00 (five finalist presentations, judges evaluate, about an hour).

## Read first

`docs/campus-twin/README.md`, `docs/campus-twin/DESIGN.md` (contract; §11–§12 override earlier sections),
`docs/campus-twin/SITE-FACTS.md`, `components/guide/twin/engine/types.ts`, the round-1 verdicts
(`docs/campus-twin/qa/round1/verdicts.json`) and YOUR round-1 issue list(s) in `docs/campus-twin/qa/round1/<owner>.json`
(fields: impact, what, where, fix, critic). Every critical/high issue there is yours to fix; mediums too where they are
visible to users. Then go beyond the list: look at your area at the views people actually use and raise it to the bar.

Engine facts: `CameraView.indoor?: number` overrides the exposure blend. With `?twin=debug`, `window.__twin` has ready,
stats (fps, drawCalls, triangles, programs, tier, busy, frames…), goto, focus, setTime, setLabels, setLook, walk, tour,
seekTour, pauseTour, camera, setCamera, errors, missingTargets, views, targets, modules, root(moduleId), pick(x,y),
groundPoint(x,y), walkRoute(legId), flightAudit(), zoom(f), bench(s), post(opts), invalidate(). GTAO reads the main depth
buffer; labels declutter on camera motion and a focused target's label wins.

## This server (not the old 16 GB Mac)

- 16 cores, 62 GB RAM, **no GPU**. WebGL runs on Mesa lavapipe (software, multi-threaded), set up already in
  `~/mesa-local`; `scripts/twin/qa/gpu.mjs` uses it automatically. Output is pixel-identical to a GPU, just slow
  (≈1–2 fps at 1280×800 high). **fps numbers here mean nothing** — judge performance by drawCalls, triangles, programs
  and textures against the budgets in DESIGN §5. The engine's error list may contain `assets timed out after 20000 ms`
  — a software-GL artefact on this server, ignore it. Every other module error, console error or warning is a bug.
- Shared dev server: **http://127.0.0.1:3200** (Turbopack, hot reload). It is already running — never start, stop or
  restart it, never run `next build`, `npm run build`, `next start`, e2e or any other server.
- Screenshots — ALWAYS with these env vars: `TWIN_BASE=http://127.0.0.1:3200 GPU_SLOTS=5 LP_NUM_THREADS=6`.
  - Many shots from one page load (preferred; load ≈1 min, then seconds per shot):
    `node scripts/twin/qa/shots.mjs --spec=<shots.json> --outdir=<dir> --size=1280x800 --quality=high [--mobile]`
    where shots.json is an array like
    `[{"name":"bio-entrance","view":"biocity:entrance","time":"15:30","labels":true},
      {"name":"elisa","focus":"elisa"}, {"name":"cam","camera":[[x,y,z],[tx,ty,tz]]},
      {"name":"tour","tour":"partners-fri-train-edu","tourAt":0.4}, {"name":"walk","walk":"red-hat"},
      {"name":"night","view":"joki:default","time":"01:00","look":"clear"}]`.
    It prints one JSON line per shot (stats, module errors, console problems).
  - One shot: `node scripts/twin/qa/shot.mjs --place=<p> --view=<v> --time=HH:MM --size=1280x800 --out=<png>
    [--camera=x,y,z:tx,ty,tz] [--focus=<target>] [--tour=<id> --tourAt=0..1] [--walk=1] [--mobile]
    [--quality=low|high|ultra] [--labels=0|1] [--full] [--stats]`.
  - For your own Playwright scripts: `import { launchGpu } from "/srv/sinceai/sinceai-web/scripts/twin/qa/gpu.mjs"`
    (machine-wide slot limit — never call chromium.launch directly), one browser per script, close it in try/finally,
    reuse one page for many shots.
  - Use `?quality=` explicitly (high while iterating, ultra to confirm, low for the phone tier). An explicit tier is no
    longer auto-downgraded.
  - **LOOK at every screenshot** (Read the PNG). Judge it as a demanding art director comparing with the real place.
- Checks: `npx tsc --noEmit -p .`, `npx eslint <your files>`, `npx jest --maxWorkers=2 <your test paths>`.
- Scratch files (screenshots, scripts, notes) only under
  `/tmp/claude-1000/-srv-sinceai-sinceai-web/b2558667-5730-40a2-90dc-a2ad996a408f/scratchpad/qa-r2/<owner>/`.
- **Git is the lead's job.** Never run git commands that change anything (add, commit, stash, checkout, reset, restore,
  rebase, clean). Read-only git (status, diff, log, show) is fine.
- Eight owners edit this tree at the same time against one dev server. Keep every edit complete and compiling (no
  half-written files). If the twin fails to load because of a file you don't own, wait a minute and retry — never fix
  another owner's file. Reference research photos are not on this server; use SITE-FACTS, the data in
  `data/campus-twin/sources/`, the guide photos in `public/assets/guide/` and public sources (WebSearch/WebFetch) when a
  fact is needed.

## Ownership (edit ONLY your files)

| Owner | Files |
|---|---|
| core-engine | engine/index.ts (except the exposure/metering code in frame()), types.ts (optional fields only), nav/*, labels.ts, util.ts, frame.ts, fallbacks.ts, debug.ts, world/massing.ts, data/campus.ts, scripts/twin/* except scripts/twin/qa/* (+ the route data it generates) |
| core-render | engine/render/*, sky/*, and the exposure/metering code in engine/index.ts frame() |
| core-ui | components/guide/twin/Twin.tsx, TwinTeaser.tsx, components/guide/RouteLinks.tsx, lib/hackathon-2026/twin.ts (texts/data only — never rename ids) |
| ground-context | engine/world/ground.ts, world/landscape.ts, props/trees.ts, world/context.ts, world/context/* |
| biocity | engine/buildings/biocity.ts, buildings/biocity/*, props/furniture.ts |
| joki | engine/buildings/joki.ts, showroom.ts, jokiTower.ts, buildings/joki/* |
| educity | engine/buildings/educity.ts, buildings/educity/* |
| vehicles-event | engine/props/vehicles.ts, props/people.ts, engine/world/event.ts, world/routes.ts |

(paths under `components/guide/twin/`; + each owner's own `__tests__`). If a fix needs another owner's file, do not
edit it: put the exact change (file, function, what to change, why) in your report's `requests` — the lead applies them.
core-engine and core-render both touch engine/index.ts: keep to your regions and re-read the file before each edit.

## Definition of done for every issue

Reproduce it (same view/time/device), fix it properly (no hacks that break other views, tiers or times), re-shoot the
same view and LOOK at it, check neighbouring views and the phone tier (`--mobile --quality=low`) for regressions, keep
tsc, eslint and your unit tests green, add a unit test for pure logic you change. Prefer real-world accuracy over
guesses. Don't change place/view/target/tour ids (they are deep links partners already have).

## Final answer (plain text, concise)

1. For EVERY issue in your list: `fixed` (what you did + screenshot path) or `not fixed` (precise reason).
2. What else you improved beyond the list (+ screenshot paths).
3. Files changed; tests added/changed; tsc/eslint/jest status.
4. `requests` for other owners (exact changes).
5. Remaining weaknesses you would fix next, ranked.
