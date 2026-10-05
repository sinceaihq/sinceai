# IMPLEMENTATION REPORT — Since AI Hackathon 2026 Field Guide

## Git

- Branch: `feature/hackathon-2026-field-guide` (from `main` @ `6ea8234`)
- Commits: `d24332e` feature · `c75c775` tests + a11y fixes · `169ac2e` mobile 3D, print, polish · `6b02748` report · `589bb89` photos, calendars, personalised company pages · `83ab13d` campus twin (3D of the whole campus) · `ec50481` twin docs + reproducible data · `1ab7bab` Sunday programme + Joki stand setup · `ba9e882` previous 3D removed — see `git log`
- Remote branch: `origin/feature/hackathon-2026-field-guide` — pushed, **not merged**. CI deploys only on pushes to `main`, so pushing this branch deploys nothing.
- Untouched: the user's untracked files in `public/assets/sponsors/` and `public/assets/supports/` were left as they were and are not in any commit.

## Routes built

All public by direct link, `noindex`, not in the sitemap or the marketing nav/footer.

| Route | Page |
|---|---|
| `/hackathon-2026/guide` | Hackathon 2026 / Field Guide (hub) |
| `/hackathon-2026/guide/builders` | Builder Guide |
| `/hackathon-2026/guide/challenge-partners` | Challenge Partner Guide (all 15 companies, searchable) |
| `/hackathon-2026/guide/challenge-partners/[company]` | One page per company (15, statically generated) — its own room, stand, schedule and calendar |
| `/hackathon-2026/guide/partners` | Partner & Tech Guide (BioCity stand plan) |
| `/hackathon-2026/guide/judges` | Judge Guide (overall jury vs. company evaluators) |
| `/hackathon-2026/guide/speakers` | Speaker & Guest Guide |
| `/hackathon-2026/guide/venue` | Venue Explorer: the 3D campus (places, views, Go to, walking routes, walk mode, time of day), venue photos, floor plans, route, text list of all locations |
| `/hackathon-2026/guide/calendar/[guide]` | `.ics` calendar per guide (5) |
| `/hackathon-2026/guide/calendar/challenge-partners/[company]` | `.ics` calendar per company (15) with its own room and stand |
| any other `/hackathon-2026/guide/…` | Guide-styled 404 with links to every guide |
| `/hackathon-2026` | Temporary (307) redirect to the hub — a common truncation of shared links |

## Decisions taken

Owner instructions 3–4 Oct 2026:

- **BioCity visibility & tech partner stands:** Stand 1 (most visible — Aulagalleria, facing the event entrance, on the route to every meal) = **Red Hat**. Stand 2 (main lobby east end, where the build hall meets the passage to Joki) = **Solita**. Stands 3 and 4 stay in the plan, marked **“Visibility / Tech Partner stand”** — on the stand cards, in the map location lists, in the 3D scene and in the text version. Edit in `lib/hackathon-2026/partners.ts`.
- **BioCity event entrance (builders):** the courtyard-side entrance from Jussin aukio (the official plan’s “Sisäänkäynti Jussinaukiolta”). Measured on the City of Turku base map, the walk from EduCity is **about 200 m / 3 min** along the raised campus deck (the earlier “approx. 50 m” organiser estimate is corrected everywhere), with a walking-directions link to the entrance itself.
- **Companies and partners** come in through BioCity’s main entrance on Tykistökatu, through the open entrance recess where a G-Class supercar display stands (owner’s plan); Joki is reached indoors down a 10-step stair at the far end of BioCity’s lobby. Joki’s step-free street door is closed for the event, so step-free visitors are asked to email info@sinceai.fi.
- **Campus twin (owner 4 Oct 2026):** the illustrative 3D preview is replaced by a to-scale 3D model of the whole event campus — EduCity, BioCity, Joki (incl. the round tower floors 2–3), the streets and the arrival routes — built from City of Turku open data (CC BY 4.0), OpenStreetMap (ODbL) and the venue owner’s floor plans; details below and in `docs/campus-twin/`.
- **Sunday programme (organiser 4 Oct 2026):** company evaluation 10:00–13:00, the winners of all 15 company challenges published at 13:30, finals at 14:00 (the five most-voted solutions present, the jury picks the overall winner, about an hour), end around 15:00. Builders give 10 votes to 10 different solutions.
- **Joki Q&A stands (organiser 4 Oct 2026):** companies bring their stand materials to EduCity on Friday; Since AI sets the stands up at Joki, ready when the companies arrive on Saturday.
- **Venue photos and official plans are published with credits** (owner instruction 4 Oct 2026, see *Images and credits*).

## Architecture

- **Shared data source:** `lib/hackathon-2026/`
  - `facts.ts` (event times, verified links) · `route.ts` (route constants, used by `next.config.ts`)
  - `schedule.ts` (one schedule, audience tags, audience-specific wording, publishability, `endPending`, `approx`, all-day items)
  - `venues.ts` (addresses, roles, entrances with status, transfer route) · `companies.ts` (15 companies → EduCity room + Joki Q&A, Showroom counter order, `companySchedule()` — the partner schedule with the company’s own room and stand) · `partners.ts` (stand plan)
  - `maps.ts` (maps, normalised hotspots — stand and Showroom counter labels derived from the data above — Finnish→English glossaries) · `guides.ts` (role copy, checklists, details) · `venue3d.ts` (3D scene metadata + text alternative)
  - `photos.ts` (venue photos, captions, credits) · `calendar.ts` (RFC 5545 export: UTC times, 75-octet folding, no DTEND where the end is not confirmed)
  - `seo.ts` (shared metadata) · `time.ts` (Europe/Helsinki formatting, now/next) · `types.ts`
- **Components:** `components/guide/` — shell/header/footer (image credits), hero, facts strip, critical path, schedule, live now/next card, venue cards, route card + isometric campus schematic, checklist (ticks saved on device), details (native `<details>`), help, company directory, stand plan, photo gallery with lightbox, calendar and share buttons, section nav with scrollspy.
- **Map viewer:** `components/guide/maps/` — floor tabs (arrow keys), contained preview with highlighted rooms, full-screen dialog (Radix) with pinch/drag/wheel/keyboard zoom & pan, focus trap, Escape, focus return, hotspot list + glossary. Deep links `#maps-joki`, `#map-educity-2`.
- **Campus twin (3D):** `components/guide/twin/` — poster first; `three` and the engine load only after “Explore in 3D”. Places (campus, EduCity, BioCity, Joki) with views, a “Go to” list of every company stand, briefing room, partner stand, entrance and area, 12 walking routes played by an avatar with captions (every arrival and move of the weekend), walk mode at eye level with collisions, stairs and lifts, the real sun for Turku at any hour of the weekend, labels, full screen and a complete text alternative. Physically based rendering (AgX, GTAO from the depth buffer, bloom, SMAA, two-cascade sun shadows, NaN-safe), three tiers with runtime downgrade, renders on demand. Teasers and “Walk it in 3D” route cards on the hub, builder, partner, challenge-partner and every company page. Runbook: `docs/campus-twin/README.md`; data pipeline `scripts/twin/` (inputs in `data/campus-twin/sources/`, reproduces the runtime data byte for byte). Posters/OG image regenerate with `scripts/render-guide-posters.mjs`.
- **Live card:** “Starts in … / Live now / Next / That’s a wrap”, all-day items count for their whole day, only the rows are an ARIA live region (not the ticking clock). Preview any moment with `?now=2026-11-07T10:30` (Turku time).
- **noindex / sitemap:** `<meta name="robots" content="noindex, nofollow, nocache">` + `googlebot` + `bingbot` on every page; `X-Robots-Tag: noindex, nofollow, noimageindex` for the route family, the calendars and `/assets/guide/*` (`next.config.ts` + `public/_headers` for Cloudflare static assets); excluded from `app/sitemap.ts`; robots.txt deliberately does **not** disallow it (crawlers must see the noindex). The marketing “Apply” popup is suppressed on guide pages.
- **Dependencies added:** `three` (runtime, code-split to the 3D chunk only), `@types/three`, `@playwright/test`, `@axe-core/playwright` (dev). Textures are CC0 (ambientCG, Poly Haven — `public/assets/guide/3d/tex/LICENSES.md`).

## Images and credits

Published on the owner’s instruction (4 Oct 2026): use the venue images and official plans, credit their owners in the metadata, keep everything lawful. Every image is credited where it is shown, in the guide footer, inside the files (EXIF `Artist`/`Copyright` + XMP `dc:creator`, `dc:rights`, `photoshop:Credit`) and in `ImageObject` structured data on the venue page.

| Image | Credit | Source |
|---|---|---|
| EduCity interior photos (Taidon portaat, atrium) | Photo: Vesa Loikas (© Vesa Loikas Photography, from the files’ own EXIF) | User-supplied event pack |
| BioCity exterior, Joki tower at dusk | Photo: Turun Teknologiakiinteistöt Oy | Venue owner’s website |
| Joki lobby, Joki amphitheatre (Company Lounge) | Still from the Joki video · Turun Teknologiakiinteistöt Oy | Joki video in the event pack; frames chosen without people |
| BioCity and Joki floor 1 floor plans | Turun Teknologiakiinteistöt Oy (4 Jun 2026) | Official plans supplied for the event, used as-is |
| EduCity and Joki event maps | Since AI (2 Oct 2026) | Since AI |
| 3D campus and its posters | Since AI — built from City of Turku open data (© Turun kaupunki, käyttölupa CC BY 4.0), © OpenStreetMap contributors (ODbL) and TTK floor plans; textures ambientCG, Poly Haven (CC0) | Original; open data |
| EduCity exterior (venue card) | — | Existing site asset already used on `/hackathon` |

**Before production:** confirm the usage terms for the EduCity photos (photographer / Turku AMK media bank) and the TTK photos and video stills (TTK is the venue owner and a partner). Removing any photo is a one-line change in `lib/hackathon-2026/photos.ts` or `venues.ts`.

Still not published: Pentagon Design and Sarc+Sigge portfolio images (“all rights reserved”, not needed), the 2025 venue maps, and the internal production plans (emergency routes, volunteer spaces, power and furniture planning).

## Verification

Final run on the last build (`next build` + `next start`), 4 Oct 2026:

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 errors (1 pre-existing warning in `components/HackathonPopup.tsx`) |
| `npx tsc --noEmit` | ✅ |
| `npm test` (whole repo, Jest) | ✅ 92/92 — also under `TZ=UTC`, `TZ=America/Los_Angeles` and `TZ=Pacific/Kiritimati`. `components/countdown-timer.test.tsx` was failing on `main` too (labels changed in `c6a78a0`); its expectations were updated to the current component. |
| `npm run build` | ✅ all guide routes static; 15 company pages and 20 calendars SSG |
| `npm run build:cloudflare` (OpenNext) | ✅ |
| `npm run test:e2e` (Playwright, desktop 1440×900 + Pixel 7) | ✅ 103 passed, 1 skipped by design (phone-only menu test on desktop) |
| Same e2e suite against the Cloudflare Workers preview (`opennextjs-cloudflare preview`) | ✅ 103 passed, 1 skipped; `X-Robots-Tag` on pages, calendars, 404s and guide assets, absent on `/hackathon` |
| Page audit — 23 pages (incl. the 404) × 320, 390, 768, 1280, 1920 px | ✅ 0 findings |
| Interaction walkthrough — Chromium / WebKit (iPhone 14) / Firefox | ✅ 125/125 · 123/123 · 123/123 |
| Time states (`?now=` before / during / after, per role), first-visit cookie banner, landscape phone | ✅ 26/26 |
| Console after 7 s idle — 11 URLs × 3 engines | ✅ 0 on every guide page, except WebKit’s analytics-preload timing note on the browser-rendered 404 page; Firefox also notes the site-wide Inter preload during the heavy 3D test — both explained in *Notes for the wider site* |
| Print (A4 PDF) — company, partner, venue and builder pages | ✅ white, readable, maps scaled, no overlays |

The e2e suite covers: every route 200 + `noindex` meta + `X-Robots-Tag`; guide 404s; the `/hackathon-2026` redirect; calendar files per guide and per company (headers, content, 404s); sitemap exclusion; robots.txt not blocking; no guide links in public nav/footer; no console errors/warnings; no horizontal overflow; canonical times on the hub; 15-company mapping; company search; Red Hat 1st / Solita 2nd / open stands labelled; personalised company schedule; credited photos + lightbox keyboard paging and focus return; section-nav scrollspy; mobile menu closing on outside tap; map viewer keyboard zoom, Escape and focus return; floor tabs with arrow keys; deep links; 3D loads on demand and flies to a company; axe (WCAG 2.1 A/AA, no serious/critical); skip link; reduced motion; print view; critical content with JavaScript disabled; all internal links resolve.

The audit checks every page at every width for horizontal overflow, heading order, duplicate ids, broken images, missing alt text, unnamed controls, tap targets under 44 px, `target=_blank` without `noopener`, layout shift, `noindex`, console errors, failed requests and axe violations. The interaction walkthrough exercises the header menu, scrollspy, live card, checklist persistence, accordions, company search and focus, all 8 map tabs and the full-screen viewer (zoom, pan, pinch, double tap, reset, Escape), the photo lightbox, all three 3D scenes (views, fly-to, labels, full screen, focus trap, deep links, phone framing), calendar downloads, the share button, print view of 8 pages, teaser deep links, keyboard focus visibility, reduced motion and the no-JavaScript fallback.

## QA rounds — issues found and fixed

Round 1 (3 Oct):

- Muted micro-text at 4.42:1 contrast → site token `--color-fg-muted` (6.2:1); axe now clean.
- Map dialog did not return focus to its trigger → fixed.
- Phone: 3D scene tabs were hidden behind the full-screen view → moved inside it.
- 3D: labels from the previous scene stayed on screen after switching (CSS2D DOM not removed) → fixed; overview views re-framed for portrait; phone-specific hall view; compact labels on narrow screens.
- Print: cookie banner printed on every page, highlight rings drifted off their rooms, white logos invisible on paper → fixed.
- Stand cards showed Solita only as an image → name added; duplicate wordmark for companies without a logo removed; single venue card too narrow on tablet; map tabs now wrap on desktop; campus schematic redrawn from the north-east so it matches the real layout.

Round 2 (4 Oct):

- 320 px: a map caption overflowed the screen; the header’s “2026” was cut to “2” → fixed.
- Tap targets under 44 px (breadcrumbs, footer links, text links, “Clear ticks”, logo) → enlarged.
- Header title lost its space (“Field Guide2026”) → fixed.
- Map pinch threw “No active pointer” on some touch sequences; Radix dialogs missed descriptions → fixed.
- `?now=` preview was an hour off for summer-time dates → parsed as Turku wall-clock time.
- 3D full screen did not close with Escape while a button had focus → handled at the overlay.
- Firefox warned about unused preloads from prefetching marketing pages → no prefetch on links that leave the guide; 0 console warnings in all three engines.
- Unknown guide URLs showed the marketing 404 → guide 404 page.
- Proofreading against the sources: the company-page schedule pointed to a section that does not exist there; BioCity stands were nameless (“Stand 1…4”) in map lists; “Takomo” vs “Takomo Golf” and room 2072’s name differed between map and directory; the stand-setup and route copy read awkwardly for some roles → all fixed. Times re-checked against the participant and challenge-partner schedules (incl. Sunday lunch 10–12, Joki as the Saturday Q&A location).
- 3D teasers always showed the Showroom, even when they opened BioCity or the Joki tower → each shows its own scene.
- Live card: said “Building time” to partners and judges, ignored the partners’ all-day stand, and announced the ticking clock to screen readers every minute → fixed.
- Company pages now show the company’s own room and stand inside the schedule, the Showroom counter number (1–6 from the entrance), and offer their own calendar file.
- Facts that wrapped in narrow cells started a line with “·” or split “09–12” → fixed.
- Section nav stayed scrolled to the end after returning to the top → scrolls back.
- Hard-coded colours in the guide replaced with CSS tokens.

Round 3 (4 Oct, final verification):

- **Privacy:** the guide’s 404 page set Google Analytics cookies even after a visitor had declined. Next.js renders nested not-found pages only in the browser, so the root layout’s `consent-default` script never ran before Google Analytics. Fixed with `ensureConsentDefaults()` (`lib/gtag.ts`, mirrors the root script, unit-tested against it) called from `components/guide/ConsentDefaults.tsx` in the guide shell; it runs before the analytics script loads and does nothing on server-rendered pages. Verified in Chromium, WebKit and Firefox for declined / accepted / first visit: identical behaviour to every other page.
- Desktop photo grid left a lone photo on the last row → even 3 × 2 grid of 4:3 photos.
- The map “Zoom” label sat on top of the image and covered the event maps’ date and, on the venue owner’s plans, their title block → moved to a bar below the map.
- 404 page skipped a heading level → section heading added.
- Text separated by “·” could wrap with the dot at the start of a line (hero date line, “Q&A stand: Floor 1 · Showroom.”, map and schedule labels) → `keepDots()` keeps the dot at the end of the line everywhere it is shown.
- 3D teaser, now/next, facts and copy changes from round 2 re-verified at all widths.

Round 4 (5 Oct, on the Netcup server — campus twin round 2 and release hardening):

- **Live first:** the guide went to production in the morning (4bccd6b) so partners could get their links; an intermediate release (d0c1eee) added the copy below. Every release since passes `scripts/release-check.sh` in a clean worktree and the full e2e suite against https://sinceai.ai afterwards.
- **Confirmed operations reflected everywhere:** 13:30 is "company challenge winners announced" (no "Closing"/"published" wording), finals 14:00 for about an hour, stands brought to EduCity on Friday and set up in Joki by the Since AI team; open-ended meals show "onwards" instead of "end TBC".
- **Campus twin round 2** (`docs/campus-twin/qa/round2/BRIEF.md`; eight owners in parallel against the 133 round-1 issues): walkable entrances in all three buildings (BioCity's revolving door, EduCity's main doors and door B, the Joki ramp), event-critical labels pinned and readable, chase cameras out of roofs, photographic day/dusk/night light, one correct Kalevansilta, premium display cars instead of black silhouettes, company logos in every briefing room and stand, a text version that keeps every deep link working without WebGL, a 300 MB phone memory budget, posters per place for wide screens and phones. Owner reports and screenshots were reviewed by the lead; the commits name each owner's changes.
- **Public site:** blog Open Graph images returned 500 on Cloudflare (`runtime = "edge"`); 18 content pages overflowed on iPhone Safari (shrink-to-fit containers around nowrap tables) — both fixed. Production builds use webpack (Turbopack duplicated framer-motion three times): 25–35 % less JavaScript on public pages, pixel-identical screenshots on all 32 routes at 1440 and 390 px, smaller worker.
- **Tests:** `e2e/site.spec.ts` guards every public route (200, indexable, h1, no console errors, no overflow, never loads the 3D); WebKit (iPhone 15, desktop Safari) and Firefox run in Playwright's Docker image (`scripts/e2e-browsers.sh`); the 3D tests accept the text fallback on engines without WebGL 2.
- **QA tooling for a GPU-less server:** Mesa lavapipe without root (`scripts/twin/qa/setup-mesa.sh`, ≈7× SwiftShader), many shots per page load (`shots.mjs`), posters rendered with sharp.

## Notes for the wider site (not changed)

- The root layout preloads the Inter font on every page although nothing renders it (`font-sans` is only used by two unused UI components); Firefox may log “preloaded but not used” for it. `preload: false` would fix that, but it made the Turbopack production build fail intermittently in Next.js 16.2.6 (`next/font/google queries have exactly one entry`), so `app/layout.tsx` is unchanged.
- Browser console messages that are not caused by the guide and also appear on marketing pages: Chrome’s “preloaded but not used” for the body font after a **second full page load in the same tab** (marketing pages show more of these; client-side navigation inside the guide is clean); Firefox’s “expires overwritten” for the `_ga` cookie once analytics is **accepted** (Firefox caps cookie lifetimes); WebKit’s “gtag.js preloaded but not used” on browser-rendered 404 pages.
- The site has no `app/not-found.tsx`, so unknown marketing URLs show Next.js’s default 404. Any page Next.js renders only in the browser (e.g. a future nested not-found or error page) would skip the consent defaults — reuse `ensureConsentDefaults()` there.

## Operational content still pending

Modelled in data as *Current plan* / *To be confirmed* (or left out), easy to change without UI work:

- Production lock of the 2 Oct room and stand placements (status `working` in `companies.ts`).
- Red Hat’s approved logo file (the repo has none; the UI shows the name). Add it to `public/assets/sponsors/`, set `logo` in `partners.ts`, re-run the poster script.
- Exact BioCity stand footprints vs. exit routes (stands 1 and 3 sit close to the curved glass, stand 4 inside the reserved restaurant terrace); a step-free route into Joki during the event (the BioCity passage has 10 steps and Joki’s street door is closed).
- Friday dinner end (22:15 vs 22:30) and Sunday breakfast end (09:00 vs 10:00) — start times only.
- Visibility-partner setup window vs. all-weekend opening; teardown window.
- Approved 2026 judging criteria (old 30/25/25/10/10 weighting **not** published); jury roster; personal call times.
- Challenge-selection change/rounding/no-selection rules (copy points to the app and event staff).
- Supercar display: number and models beyond the G-Class; BioCity build-hall tables (52 in the drawing vs 56 in its legend — the 3D uses 56).
- Speaker run sheets (Jason Mayes’ sample times **not** published), slide deadlines, hotels.
- Wi-Fi instructions, named public contacts (guide uses `info@sinceai.fi`, Discord and `sinceai.app/report`), minors policy, final challenge briefs (none are linked).

## Public-site mismatches intentionally not changed

- ~~`lib/sinceai.ts` 16:00 start / Sun 17:00 end~~ — aligned on 4 Oct 2026 with the operational schedule (Fri 15:00 – Sun 15:00; drives `/hackathon`, its countdown and Event JSON-LD).
- “72 hours / 72-hour” across `/hackathon` (metadata, hero, FAQ), `HackathonPopup`, `/for-builders`, `/partners`, `/press`, `/stats`, `/turku`, `/ai-hackathons`, `/production-support`, `lib/faqs.ts`, `lib/schema.ts` and blog posts.
- `/hackathon` venue copy and JSON-LD name EduCity only; building happens in BioCity + Joki.
- `/hackathon` metadata/FAQ list “Google for Developers, Bayer, Sandvik, Kongsberg, Valmet” as challenge partners; the 2026 challenge companies are the 15 in this guide.

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
- http://localhost:3000/hackathon-2026/guide/venue — 3D preview at the top, photos below it
- Preview the live “now / next” card at any moment: append `?now=2026-11-07T10:30`
- 3D deep links: `/venue?focus=elisa`, `/venue?focus=valmet`, `/venue?focus=red-hat`
- Calendars: `/hackathon-2026/guide/calendar/builders`, `/hackathon-2026/guide/calendar/challenge-partners/elisa`

Re-run the checks: `npx jest` · `npm run test:e2e` (starts or reuses a production server on port 3100).
