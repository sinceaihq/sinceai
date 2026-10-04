# Campus twin — QA notes

- `round1/` — the first independent art-direction / QA review of the integrated campus twin (4 Oct 2026): seven
  critics (campus exterior, BioCity, Joki, EduCity, time of day, tours & walk mode, mobile & low tier) produced the
  issue lists here, routed by owner (`core-engine`, `core-render`, `core-ui`, `ground`, `context`, `biocity`, `joki`,
  `educity`, `vehicles`, `event`; ownership table in `round1/BRIEF.md`). Critical/high/medium issues are still open —
  fixing them is the next step. Screenshot paths (`<scratch>/…`) refer to the original workstation and are not in the
  repository. The mobile & low-tier critique had not finished when work moved to the server — run it again.
- Harnesses for the whole guide (Playwright): `scripts/guide-qa/` — `audit.mjs` (every route × 5 widths: overflow,
  headings, ids, images, alt, names, tap targets, noindex, console, axe), `interact.mjs` (every interaction; its 3D
  section still drives the previous preview — update it for the campus twin or run with `SKIP3D=1`), `states.mjs`
  (`?now=` time states), `idle-warnings.mjs`, `print.mjs`, `perf.mjs` (marketing-site JS/CSS/LCP/CLS snapshot for
  before/after comparisons). Run them against a production build: `BASE=http://localhost:3100 node
  scripts/guide-qa/audit.mjs /tmp/audit-out`.
- 3D screenshots: `scripts/twin/qa/shot.mjs` (real GPU on macOS, SwiftShader on Linux servers), memory-safe through
  `scripts/twin/qa/gpu.mjs`.
