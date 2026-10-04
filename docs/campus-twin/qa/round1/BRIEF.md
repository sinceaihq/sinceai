# Campus twin — QA round 1 fix brief (read fully before you start)

You fix issues found by independent art directors / QA critics in the "campus twin": a photoreal, to-scale,
interactive three.js (r186) model of the Since AI Hackathon 2026 campus (EduCity, BioCity, Joki, streets, arrival
routes, a G-Class display in BioCity's Tykistökatu entrance recess) inside the Next.js 16 repo
`<repo>` (branch `feature/hackathon-2026-field-guide`). Owner's bar: so real people
think it cost a million euros; trivially easy to move around; partners find their way effortlessly. This goes to
production after QA — every fix must be solid.

Read first: `docs/campus-twin/README.md`, `docs/campus-twin/DESIGN.md` (contract; §11–§12 override earlier sections),
`docs/campus-twin/SITE-FACTS.md` (site facts; reference photos live in
`<scratch>/research/ref/**`),
`components/guide/twin/engine/types.ts`. Engine facts: `CameraView.indoor?: number` overrides the exposure blend;
`window.__twin` (with `?twin=debug`) has ready, stats, goto, focus, setTime, setLabels, walk, tour, seekTour, pauseTour,
camera, setCamera, errors, missingTargets, views, targets, modules, root(moduleId), pick(x,y), groundPoint(x,y),
walkRoute(legId), flightAudit(), zoom(f), bench(s); GTAO reads the main depth buffer; labels declutter on camera motion
and a focused target's label wins.

## Tools and HARD memory rules (16 GB Mac shared with the owner's other projects and Docker)

- Dev server: http://localhost:3200 (running — never start/stop it, never run `next build`, e2e, or any server).
- Screenshots on the real GPU: `node <scratch>/twin/shot.mjs --place=<p> --view=<v> --time=HH:MM --size=1280x800 --out=<png> [--camera=x,y,z:tx,ty,tz] [--only=<modules>] [--focus=<target>] [--tour=<id> --tourAt=0..1] [--walk=1] [--mobile] [--quality=low|high|ultra] [--labels=0|1] [--full] [--stats]`.
  It prints stats, module errors and console messages — any error or warning is a bug. LOOK at every screenshot.
- Every browser goes through `import { launchGpu } from "<scratch>/twin/gpu.mjs"`
  (machine-wide max 2 GPU browsers; it waits for a slot and for free memory). Never call chromium.launch directly,
  never run webkit/firefox, one browser per script, close it in try/finally, reuse one page for many shots, 1280×800
  while iterating, `--quality=high` while iterating and ultra only to confirm. A memory guard kills this project's
  browsers below 15 % free memory — if a script dies with "Target closed", wait a minute and retry.
- Jest only as `npx jest --maxWorkers=2 <paths>`. Typecheck `npx tsc --noEmit -p .`; lint `npx eslint <files>`.
- Write scratch files under `<scratch>/qa-r1/<your-owner-key>/`. Never commit.

## Ownership (edit ONLY your files; other owners work in parallel)

| Owner | Files |
|---|---|
| core-engine | engine/index.ts (except the exposure/metering code in frame()), types.ts (optional fields only), nav/*, labels.ts, util.ts, frame.ts, fallbacks.ts, debug.ts, world/massing.ts, data/campus.ts, scripts/twin/* (+ the route data it generates) |
| core-render | engine/render/*, sky/*, and the exposure/metering code in engine/index.ts frame() (only after core-engine has finished) |
| core-ui | components/guide/twin/Twin.tsx, TwinTeaser.tsx, lib/hackathon-2026/twin.ts (texts/data only — never rename ids) |
| ground | engine/world/ground.ts, world/landscape.ts, props/trees.ts |
| context | engine/world/context.ts, world/context/* |
| biocity | engine/buildings/biocity.ts, buildings/biocity/*, props/furniture.ts |
| joki | engine/buildings/joki.ts, showroom.ts, jokiTower.ts, buildings/joki/* |
| educity | engine/buildings/educity.ts, buildings/educity/* |
| vehicles | engine/props/vehicles.ts, props/people.ts |
| event | engine/world/event.ts, world/routes.ts |

(+ each owner's own `__tests__`). If a fix needs another owner's file, do not edit it: put the exact change (file,
function, what to change, why) in your report's `requests`.

## Definition of done for every issue

Reproduce it (same view/time/device as the critic), fix it properly (no hacks that break other views/tiers/times),
re-shoot the same view and look at it, check the neighbouring views and the phone tier for regressions, keep tsc,
eslint and your unit tests green, add a unit test for any pure logic you change. Prefer real-world accuracy (plans,
photos, SITE-FACTS) over guesses. Don't change place/view/target/tour ids.

Final answer (plain text): for EVERY issue — fixed (what you did + screenshot path) or not fixed (precise reason);
files changed; tests; requests for other owners.
