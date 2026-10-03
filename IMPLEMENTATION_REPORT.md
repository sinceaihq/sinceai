# IMPLEMENTATION REPORT — Since AI Hackathon 2026 Field Guide

## Git

- Branch: `feature/hackathon-2026-field-guide` (from `main` @ `6ea8234`)
- Commits: `d24332e` feature · `c75c775` tests + a11y fixes · `169ac2e` mobile 3D, print, polish · this report
- Remote branch: `origin/feature/hackathon-2026-field-guide` — pushed, **not merged**. CI deploys only on pushes to `main`, so pushing this branch deploys nothing.
- Untouched: the user's untracked files in `public/assets/sponsors/` and `public/assets/supports/` were left as they were and are not in any commit.

## Routes built

All public by direct link, `noindex`, not in the sitemap or the marketing nav/footer.

| Route | Page |
|---|---|
| `/hackathon-2026/guide` | Hackathon 2026 / Field Guide (hub) |
| `/hackathon-2026/guide/builders` | Builder Guide |
| `/hackathon-2026/guide/challenge-partners` | Challenge Partner Guide (all 15 companies, searchable) |
| `/hackathon-2026/guide/challenge-partners/[company]` | One page per company (15, statically generated; unknown ids 404) |
| `/hackathon-2026/guide/partners` | Partner & Tech Guide (BioCity stand plan) |
| `/hackathon-2026/guide/judges` | Judge Guide (overall jury vs. company evaluators) |
| `/hackathon-2026/guide/speakers` | Speaker & Guest Guide |
| `/hackathon-2026/guide/venue` | Venue Explorer: floor plans, route, 3D preview, text list of all locations |

## Decisions taken (owner instruction 3 Oct 2026)

- **BioCity visibility & tech partner stands:** Stand 1 (most visible — Aulagalleria, facing the event entrance, on the route to every meal) = **Red Hat**. Stand 2 (main lobby east end, where the build hall meets the passage to Joki) = **Solita**. Stands 3 and 4 stay in the plan, marked **“Visibility / Tech Partner stand”**. Edit in `lib/hackathon-2026/partners.ts`.
- **BioCity event entrance:** the courtyard-side entrance from Jussin aukio (the official plan’s “Sisäänkäynti Jussinaukiolta”), shown as *Current plan*. Distance shown as “approx. 50 m outdoors (organiser estimate)” with Google Maps fallbacks between the official addresses.
- **3D preview** (owner request): lazy-loaded three.js scenes of the Joki Showroom (dark room, violet light, black counters and bar stools, partner logos on the curved LED wall — after the supplied event render), the Joki Q&A floors 1–3, and the BioCity build hall (56 tables / 280 seats from the 3 Oct furniture plan, stands, route to Joki). Labelled “illustrative, not to scale”; the 2D floor plans remain the reference and every location is also listed as text.

## Architecture

- **Shared data source:** `lib/hackathon-2026/`
  - `facts.ts` (event times, verified links) · `route.ts` (route constants, used by `next.config.ts`)
  - `schedule.ts` (one schedule, audience tags, audience-specific wording, publishability, `endPending`, `approx`)
  - `venues.ts` (addresses, roles, entrances with status, transfer route) · `companies.ts` (15 companies → EduCity room + Joki Q&A) · `partners.ts` (stand plan)
  - `maps.ts` (maps, normalised hotspots, Finnish→English glossaries) · `guides.ts` (role copy, checklists, details) · `venue3d.ts` (3D scene metadata + text alternative)
  - `seo.ts` (shared metadata) · `time.ts` (Europe/Helsinki formatting, now/next) · `types.ts`
- **Components:** `components/guide/` — shell/header/footer, hero, facts strip, critical path, schedule, live now/next card, venue cards, route card + isometric campus schematic, checklist (ticks saved on device), details (native `<details>`), help, company directory, stand plan.
- **Map viewer:** `components/guide/maps/` — floor tabs (arrow keys), contained preview with highlighted rooms, full-screen dialog (Radix) with pinch/drag/wheel/keyboard zoom & pan, focus trap, Escape, focus return, hotspot list + glossary. Deep links `#maps-joki`, `#map-educity-2`.
- **3D:** `components/guide/venue3d/` — poster first; `three` loads only after “Step inside”; renders on demand, pauses off-screen, honours reduced motion, disposes on unmount, adapts framing to portrait phones, opens full screen on touch devices. Posters/OG image regenerate with `scripts/render-guide-posters.mjs`.
- **noindex / sitemap:** `<meta name="robots" content="noindex, nofollow, nocache">` + `googlebot` + `bingbot` on every page; `X-Robots-Tag: noindex, nofollow, noimageindex` for the route family and `/assets/guide/*` (`next.config.ts` + `public/_headers` for Cloudflare static assets); excluded from `app/sitemap.ts`; robots.txt deliberately does **not** disallow it (crawlers must see the noindex). The marketing “Apply” popup is suppressed on guide pages.
- **Dependencies added:** `three` (runtime, code-split to the 3D chunk only), `@types/three`, `@playwright/test`, `@axe-core/playwright` (dev).

## Verification

| Command | Result |
|---|---|
| `npm install --legacy-peer-deps` (lockfile updated) | ✅ |
| `npm run lint` | ✅ 0 errors (1 pre-existing warning in `components/HackathonPopup.tsx`) |
| `npx tsc --noEmit` | ✅ |
| `npx jest lib/hackathon-2026 components/guide` | ✅ 55/55 — also under `TZ=UTC` and `TZ=America/Los_Angeles` |
| `npm test` (whole repo) | ⚠️ 64/68 — the 4 failures are `components/countdown-timer.test.tsx`, failing identically on a clean `main` worktree (component labels changed in `c6a78a0`, test not updated). Not touched. |
| `npm run build` | ✅ all guide routes static; 15 company pages SSG |
| `npm run build:cloudflare` (OpenNext) | ✅ |
| `npm run test:e2e` (Playwright, desktop 1440×900 + Pixel 7) | ✅ 90/90 |
| e2e against the Cloudflare Workers preview (`opennextjs-cloudflare preview`) | ✅ 45/45 desktop; `x-robots-tag` present on pages and guide assets, absent on `/hackathon` |
| External links in the guide (11) | ✅ all 200 |

The e2e suite covers: every route 200 + `noindex` meta + `X-Robots-Tag`; unknown company 404; sitemap exclusion; robots.txt not blocking; no guide links in public nav/footer; no console errors/warnings; no horizontal overflow; canonical times on the hub; 15-company mapping; company search; Red Hat 1st / Solita 2nd / open stands labelled; map viewer keyboard zoom, Escape and focus return; floor tabs with arrow keys; deep links; 3D loads on demand and flies to a company; axe (WCAG 2.1 A/AA, no serious/critical); skip link; reduced motion; print view; critical content with JavaScript disabled; all internal links resolve.

## Screenshot review

Saved locally (git-ignored) in `qa-screenshots/field-guide-2026/`: `first-view/` (8 pages × 390×844, 430×932, 768×1024, 1440×900, 1920×1080), `full-page/` (390 and 1440), `3d/` (desktop + phone, all scenes and views), `print/elisa-company-page.pdf`.

Issues found and fixed during review:

- Muted micro-text at 4.42:1 contrast → site token `--color-fg-muted` (6.2:1); axe now clean.
- Map dialog did not return focus to its trigger → fixed.
- Phone: 3D scene tabs were hidden behind the full-screen view → moved inside it.
- 3D: labels from the previous scene stayed on screen after switching (CSS2D DOM not removed) → fixed; overview views re-framed for portrait; phone-specific hall view; compact labels on narrow screens.
- Print: cookie banner printed on every page, highlight rings drifted off their rooms, white logos invisible on paper → fixed.
- Stand cards showed Solita only as an image → name added; duplicate wordmark for companies without a logo removed; single venue card too narrow on tablet; map tabs now wrap on desktop; campus schematic redrawn from the north-east so it matches the real layout.

## Operational content still pending

Modelled in data as *Current plan* / *To be confirmed* (or left out), easy to change without UI work:

- Production lock of the 2 Oct room and stand placements (status `working` in `companies.ts`).
- Red Hat’s approved logo file (the repo has none; the UI shows the name). Add it to `public/assets/sponsors/`, set `logo` in `partners.ts`, re-run the poster script.
- Exact BioCity stand footprints vs. exit routes; the event doors and the accessible route EduCity → BioCity/Joki; which Joki street doors are open.
- Friday dinner end (22:15 vs 22:30) and Sunday breakfast end (09:00 vs 10:00) — start times only.
- Visibility-partner setup window vs. all-weekend opening; teardown window.
- Whether Since AI or the company sets up the Joki Q&A stand (Fri night vs Sat 08:30).
- Company result hand-over deadline on Sunday; approved 2026 judging criteria (old 30/25/25/10/10 weighting **not** published); jury roster; personal call times.
- Participant voting rules; challenge-selection change/rounding/no-selection rules (copy points to the app and event staff).
- Speaker run sheets (Jason Mayes’ sample times **not** published), slide deadlines, hotels.
- Wi-Fi instructions, named public contacts (guide uses `info@sinceai.fi`, Discord and `sinceai.app/report`), minors policy, final challenge briefs (none are linked).

## Public-site mismatches intentionally not changed

- `lib/sinceai.ts` `UPCOMING_EVENT_2026`: 16:00 start / Sun 17:00 end and “November 6 16:00 – November 8 17:00” (drives `/hackathon`, its countdown and Event JSON-LD). Operational: registration 15:00, opening 17:00, end Sun 15:00.
- “72 hours / 72-hour” across `/hackathon` (metadata, hero, FAQ), `HackathonPopup`, `/for-builders`, `/partners`, `/press`, `/stats`, `/turku`, `/ai-hackathons`, `/production-support`, `lib/faqs.ts`, `lib/schema.ts` and blog posts.
- `/hackathon` venue copy and JSON-LD name EduCity only; building happens in BioCity + Joki.
- `/hackathon` metadata/FAQ list “Google for Developers, Bayer, Sandvik, Kongsberg, Valmet” as challenge partners; the 2026 challenge companies are the 15 in this guide.

## Rights-sensitive assets kept as research only

Not published: the EduCity photographs in the pack (Vesa Loikas / Leena Arola credits), the Joki video and its frames, Pentagon Design and Sarc+Sigge web images, the 2025 venue maps, and the internal production plans (emergency routes, volunteer spaces, power and furniture planning). Published: the Since AI 2026 event maps, the venue’s official floor plans for BioCity and Joki floor 1 (as supplied for the event), approved partner logos already in the repo, and the EduCity night photo already used on `/hackathon`. The 3D scenes and posters are original renders.

## Local review

```bash
git checkout feature/hackathon-2026-field-guide
npm ci --legacy-peer-deps
npm run build && npm start          # http://localhost:3000
```

- http://localhost:3000/hackathon-2026/guide
- http://localhost:3000/hackathon-2026/guide/builders
- http://localhost:3000/hackathon-2026/guide/challenge-partners
- http://localhost:3000/hackathon-2026/guide/challenge-partners/elisa (any of the 15 company ids)
- http://localhost:3000/hackathon-2026/guide/partners
- http://localhost:3000/hackathon-2026/guide/judges
- http://localhost:3000/hackathon-2026/guide/speakers
- http://localhost:3000/hackathon-2026/guide/venue — 3D preview at the top
- Preview the live “now / next” card at any moment: append `?now=2026-11-07T10:30`
