# Campus twin — the 3D campus of the Hackathon 2026 Field Guide

An interactive, to-scale 3D model of the Since AI Hackathon 2026 campus in Turku — EduCity, BioCity, Joki and the
streets between them — on the Field Guide venue page (`/hackathon-2026/guide/venue#preview-3d`), with teasers and
"Walk it in 3D" route cards on the other guide pages. People use it to find their room or stand, walk the arrival
routes (companies and partners come in from Tykistökatu, past the G-Class display in BioCity's entrance recess) and see
the campus at the hour they arrive.

- Engineering contract: [`DESIGN.md`](DESIGN.md) · site facts and measurements: [`SITE-FACTS.md`](SITE-FACTS.md)
- Data inputs and licences: [`data/campus-twin/sources/README.md`](../../data/campus-twin/sources/README.md)
- Textures (all CC0): [`public/assets/guide/3d/tex/LICENSES.md`](../../public/assets/guide/3d/tex/LICENSES.md)

## Run it on a fresh machine

```bash
git clone https://github.com/sinceaihq/sinceai.git && cd sinceai
git checkout feature/hackathon-2026-field-guide
npm ci --legacy-peer-deps          # Node >= 20.9 (tested on 22 and 24)
npm run dev                        # http://localhost:3000/hackathon-2026/guide/venue
# production: npm run build && npm start · Cloudflare Workers: npm run build:cloudflare
```

The 3D needs WebGL 2. Without it the page shows the same places, targets and routes as text.

### Deep links

| Parameter | Example | Opens |
|---|---|---|
| `place` | `?place=biocity` | a place: `campus`, `educity`, `biocity`, `joki` |
| `view` | `?place=joki&view=showroom` | a view of that place (see `PLACES_3D` in `lib/hackathon-2026/twin.ts`) |
| `focus` | `?focus=elisa`, `?focus=red-hat`, `?focus=room-1002` | a company's Q&A stand, a partner's stand, a briefing room, an entrance or area |
| `tour` | `?tour=companies-tykistokatu-to-showroom` | a walking route, ready to play |
| `time` | `?time=16:45` or `?time=night` | the campus at that Turku time (presets in `TIME_PRESETS`) |
| `walk` | `?walk=1` | walk mode at eye level |
| `quality` | `?quality=low` | force a rendering tier (`ultra`, `high`, `low`) |
| `twin` | `?twin=debug` | start at once and expose `window.__twin` (see `engine/debug.ts`) |

Links from the previous 3D preview (`?scene=showroom|joki-tower|biocity`) still work.

## How it is built

```
lib/hackathon-2026/twin.ts          places, views, targets, routes (tours), time presets, credits — texts only
components/guide/twin/
  Twin.tsx                          UI: poster → "Explore in 3D", tabs, view chips, Go to, cards, routes, walk, time
  TwinTeaser.tsx                    poster links used on other pages (+ twinHref for deep links)
  engine/
    index.ts                        createTwinEngine(): modules, views/targets, picking, labels, flights, walk,
                                    tours, exposure, render-on-demand loop, context loss, debug API
    types.ts                        contracts: WorldModule / BuildingModule, CameraView, materials, light units
    data/campus.ts                  loaders for public/assets/guide/3d/data/*.json and the terrain heightfield
    render/                         pipeline (GTAO, bloom, SMAA, NaN-safe), tiers, PBR material library,
                                    facade shader (windows + interiors), canvas textures, metre UVs
    sky/                            NOAA sun for Turku, sky, exposure, shadows, environment probes
    nav/                            orbit + planned flights, walk mode (collision, levels, connectors), tours,
                                    touch joystick
    world/                          ground (terrain, roads, kerbs, paving), landscape, context buildings,
                                    event dressing (flags, totems, signs), route ribbons, fallback massing
    buildings/                      BioCity, Joki (+ Showroom, tower floors 2–3), EduCity — exteriors + interiors
    props/                          furniture, G-Class display + traffic, people, trees
components/guide/RouteLinks.tsx     "Walk it in 3D" route cards on the guide pages
scripts/twin/                       data pipeline (build-campus-data.mjs) and QA tools (qa/)
data/campus-twin/sources/           pipeline inputs (open data, with licences)
public/assets/guide/3d/             runtime data, terrain, CC0 textures, partner logos, posters
```

One shared frame: metres, origin at BioCity's OSM centroid (60.44932 N, 22.29326 E), +x east, +z south, +y up;
heights are N2000 − 23.20 m. Modules build in that frame (or in a documented plan frame) so everything lines up with the
map. The engine loads modules lazily and renders only when something moves.

### Change content

- Times, rooms, stands, companies: `lib/hackathon-2026/*` (never in components). The 3D reads targets from there.
- A view or target text: `lib/hackathon-2026/twin.ts`. Its camera pose lives in the module that models it.
- A walking route: add the tour to `TOURS` in `scripts/twin/routes.mjs`, regenerate (below), then add the same id
  with its steps to `TOURS_3D` in `lib/hackathon-2026/twin.ts` — the unit tests check that distances, legs, step
  anchors and turn directions match the route data.
- Regenerate the runtime data (deterministic, byte-identical for the same inputs):

  ```bash
  node scripts/twin/build-campus-data.mjs --src data/campus-twin/sources --out public/assets/guide/3d
  ```

## Check it

```bash
npx tsc --noEmit -p .
npm run lint
npx jest --maxWorkers=2                     # unit + component tests (engine, modules, UI, data)
npm run build && npm run test:e2e           # Playwright, desktop + Pixel 7, against next start on :3100
```

GPU screenshots (macOS, real Apple GPU through ANGLE/Metal):

```bash
npm run dev -- -p 3200 &
TWIN_BASE=http://localhost:3200 node scripts/twin/qa/shot.mjs --place=biocity --view=entrance --time=15:30 \
  --size=1280x800 --stats --out=/tmp/biocity.png
```

`?twin=debug` exposes `window.__twin`: `ready()`, `stats()` (fps, draw calls, triangles, tier), `goto()`,
`focus()`, `setTime()`, `walk()`, `tour()`, `seekTour()`, `bench(seconds)`, `missingTargets()`, `errors()`, …

**Shared 16 GB machine:** every QA browser goes through `scripts/twin/qa/gpu.mjs` (`launchGpu()` — at most 2 GPU
browsers at once and none while free memory is under 25 %); `scripts/twin/qa/memguard.sh` stops this repo's test
browsers if free memory falls under 15 %. Run Jest with `--maxWorkers=2`, and never run `next build` while a dev
server and test browsers are busy.

### Budgets

60 fps on an M-series Mac (ultra), ≥ 30 fps on a mid laptop (high), ≥ 24 fps on a 2022+ phone (low, 1K→512 px
textures, fewer instances). Per-module draw-call and triangle budgets are in `DESIGN.md` §5; `window.__twin.stats()`
reports them live.

## Posters and social image

The poster shown before the 3D loads (and in the teasers) and the guide's Open Graph image come from the real scene:

```bash
npm run build && npx next start -p 3100 &
node scripts/render-guide-posters.mjs http://localhost:3100
```

## Credits

3D model: Since AI, built from City of Turku open data (© Turun kaupunki, käyttölupa CC BY 4.0), © OpenStreetMap
contributors (ODbL) and the venue owner's floor plans · Textures: ambientCG, Poly Haven (CC0). No car-maker or tenant
trademarks; partner logos only where the partner supplied them.
