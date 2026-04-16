# sinceai.fi — Baseline Technical Audit

> Generated: 2026-04-16. Read-only reconnaissance — no files modified.

---

## 1. Framework & Version

| Property | Value |
|---|---|
| Framework | **Next.js ^16.1.6** (App Router) |
| React | 19.2.3 |
| TypeScript | ^5 |
| Node requirement | ≥ 20.9.0 |
| Router | **App Router** — all pages live under `app/` |
| Rendering strategy | Hybrid, but mostly **client-side** (see Red Flags) |
| Font | **Space Grotesk** via `next/font/google` (Note: CLAUDE.md incorrectly documents "Geist Sans/Mono") |
| Styling | Tailwind CSS v4 via PostCSS + shadcn/ui (new-york style) |
| Animation | Framer Motion v12 + `motion` package |

---

## 2. Route Structure

All routes are under `app/` (App Router). The `layout.tsx` at each level provides the metadata wrapper.

| File path | Route | Notes |
|---|---|---|
| `app/page.tsx` | `/` | Homepage — **`"use client"`** |
| `app/layout.tsx` | (root layout) | Org JSON-LD, metadata, CookieConsent |
| `app/hackathon/page.tsx` | `/hackathon` | **`"use client"`**, inline JSON-LD |
| `app/about/page.tsx` | `/about` | |
| `app/events/page.tsx` | `/events` | |
| `app/projects/page.tsx` | `/projects` | |
| `app/partners/page.tsx` | `/partners` | |
| `app/blog/page.tsx` | `/blog` | |
| `app/blog/[slug]/page.tsx` | `/blog/:slug` | Dynamic route |
| `app/faq/page.tsx` | `/faq` | |
| `app/contact/page.tsx` | `/contact` | |
| `app/press/page.tsx` | `/press` | |
| `app/resources/page.tsx` | `/resources` | |
| `app/stats/page.tsx` | `/stats` | |
| `app/production-support/page.tsx` | `/production-support` | |
| `app/research-to-market/page.tsx` | `/research-to-market` | |
| `app/european-ai/page.tsx` | `/european-ai` | Programmatic SEO page |
| `app/europe-ai/page.tsx` | `/europe-ai` | Programmatic SEO page |
| `app/finland-ai/page.tsx` | `/finland-ai` | Programmatic SEO page |
| `app/turku/page.tsx` | `/turku` | Programmatic SEO page |
| `app/code-of-conduct/page.tsx` | `/code-of-conduct` | |
| `app/privacy/page.tsx` | `/privacy` | |
| `app/terms/page.tsx` | `/terms` | |
| `app/api/contact/route.ts` | `/api/contact` | POST, Zod validation, IP rate-limiting |
| `app/api/og/hackathon/route.tsx` | `/api/og/hackathon` | Dynamic OG image |
| `app/robots.ts` | `/robots.txt` | Next.js MetadataRoute |
| `app/sitemap.ts` | `/sitemap.xml` | Next.js MetadataRoute |

---

## 3. Key Content Locations

### 3a. Homepage Hero — H1, Subheading, CTAs

**Component:** `components/sections/homepage/LeanHero.tsx` (marked `"use client"`)  
**Rendered from:** `app/page.tsx` as `<LeanHero discordUrl={...} />`

| Element | Value | How specified |
|---|---|---|
| H1 | `"Europe's AI builders community."` | Hardcoded string in JSX |
| Subheading | `"From challenge ideation to production deployment. Hackathons, real AI projects, and a global developer network. Based in Turku, Finland."` | Hardcoded string |
| Primary CTA | "Join the Discord" → `https://discord.com/invite/YkqJswRGSW` | Prop passed from `app/page.tsx` |
| Secondary CTA | "Partner with Since AI" → `/partners` | Hardcoded `<Link>` |
| Micro-line | `"Open to top builders worldwide."` | Hardcoded |

All hero text is animated via `framer-motion` (`motion.h1`, `motion.p`). **The H1 is not present in the initial server-rendered HTML** — it requires JavaScript to appear (see Red Flags §6).

### 3b. Stats Row — "1000+ members | 260 builders | 30+ projects | 15+ partners"

The stats row appears in **two locations**:

**Location 1 — Hero inline stats** (`components/sections/homepage/LeanHero.tsx`, lines 72–89):
```
1000+ members · 260+ builders · 30+ shipped projects · 15+ partners
```
These are **hardcoded strings** directly in JSX — they do **not** reference `lib/org.ts`.

**Location 2 — ProofStrip** (`components/sections/homepage/ProofStrip.tsx`, lines 8–13):
```
Founded: FOUNDING_YEAR (from lib/sinceai.ts)
1000+ Community Members — hardcoded string
260 Hackathon Builders — from FIRST_EVENT.attendance (lib/sinceai.ts)
30+ Projects Shipped — hardcoded string
```
Mixed sourcing: some values come from constants, some are hardcoded.

**Data inconsistency detected:** `lib/org.ts` declares `hackathonParticipants: "200+"` but the actual figure used everywhere in the UI is 260. The `ORG.stats` object is stale/mismatched.

### 3c. Partner Logos Section

| Component | File | Data source |
|---|---|---|
| `TrustBar` (infinite scroll strip) | `components/sections/homepage/TrustBar.tsx` | `lib/partners.ts` → `partnerLogos` |
| `PartnersSection` (grid with tiers) | `components/sections/homepage/PartnersSection.tsx` | `lib/partners.ts` → `partnerCompanies`, `supportingPartners` |

**Data source:** `lib/partners.ts` — a **TypeScript array** of `Partner` objects with `name`, `logo`, `url`, and `tier` fields. There is no external CMS, no JSON file, no API call. Logos are static assets in `public/assets/sponsors/` and `public/assets/supports/`.

Current partner count: **14 partners** + **16 supporting partners** = 30 total entries.

### 3d. Anonymous Testimonial

**Component:** `components/sections/homepage/ProofStrip.tsx` (lines 47–51)  
**Quote:** `"We hired 3 exceptional developers. Best recruiting investment we made this year."`  
**Attribution:** `"Head of Talent, Partner Company"` — deliberately anonymous  
**Location in page:** Rendered in the ProofStrip section between the metrics grid and a "Read more partner stories →" link.

### 3e. Hackathon 2026 Mention

Multiple locations — it is a primary content theme:

| Location | Content |
|---|---|
| `app/hackathon/page.tsx` | Dedicated page. H1: "Since AI Hackathon 2026". Dates: Nov 2026 (TBA, but CountdownTimer hardcodes `2026-11-06T16:00:00` as start). FAQs, Key Facts table, Registration section. |
| `lib/sinceai.ts` | `UPCOMING_EVENT_2026` constant with `month: "November"`, `year: 2026`, `dateNote: "Exact dates will be announced soon."` |
| `lib/schema.ts` | `getOrganizationSchema()` embeds a nested `event` object with `startDate: "2026-11"` |
| `lib/schema.ts` | `getUpcoming2026EventSchema()` for full Event schema |
| `public/llms.txt` | `"Since AI Hackathon 2026: Planned for November 2026 in Turku. Dates TBA."` |

**Note:** The `CountdownTimer` component in `hackathon/page.tsx` has a hardcoded `startDate="2026-11-06T16:00:00"` that does **not** come from any constant in `lib/sinceai.ts` — it will silently drift out of sync if dates change.

### 3f. Meta Tags / Metadata Exports

**Root layout** (`app/layout.tsx`) exports a `metadata` object covering:
- `title`, `description`, `keywords`, `authors`, `creator`, `publisher`
- `alternates.canonical: "/"`
- `openGraph` (title, description, url, siteName, locale, type, images)
- `twitter` (card, site, creator, title, description, images)
- `robots` (index, follow, googleBot rules)
- `category: "technology"`

**Per-page metadata:** Most pages export their own `metadata` via `layout.tsx` files in each route directory (e.g., `app/hackathon/layout.tsx`, `app/about/layout.tsx`).

**OG image:** Root metadata points to `/assets/logo/SINCE AI full black.png` (a static PNG, 1200×630). The `/hackathon` route has a dynamic OG image endpoint at `/api/og/hackathon`.

### 3g. JSON-LD / Structured Data

| Schema type | Location | Notes |
|---|---|---|
| `Organization` | `app/layout.tsx` (root) | Injected globally via `dangerouslySetInnerHTML`. Well-structured with `sameAs`, `contactPoint`, `foundingDate`, `knowsAbout`. |
| `Event` (2026) | `app/hackathon/page.tsx` | **Client-side injection** inside a `"use client"` page — bots may not see it. |
| `FAQPage` | `app/hackathon/page.tsx` | Same — client-side only. |
| `BreadcrumbList` | `app/hackathon/page.tsx` | Same — client-side only. |
| `FAQPage`, `Blog`, `BlogPosting`, `ItemList`, `BreadcrumbList` generators | `lib/schema.ts` | Utility functions available but usage varies by page. |
| `Event` (2025, first hackathon) | `lib/schema.ts` → `getFirstEventSchema()` | Defined but check per-page adoption. |

### 3h. robots.txt and llms.txt

| File | Status | Location |
|---|---|---|
| `robots.txt` | **Present** | `app/robots.ts` (Next.js MetadataRoute). Allows all AI crawlers explicitly: GPTBot, ChatGPT-User, Google-Extended, anthropic-ai, Claude-Web, CCBot, PerplexityBot, Diffbot, cohere-ai, Applebot-Extended, Bytespider. Points to `https://sinceai.fi/sitemap.xml`. |
| `llms.txt` | **Present** | `public/llms.txt` — well-structured Markdown with org summary, stats, events, blog links, pages index, social, and reference to `llms-full.txt`. |
| `llms-full.txt` | **Present** | `public/llms-full.txt` — extended context document for AI systems (stats dated February 2026). |
| `ai.txt` | **Referenced but missing** | `llms.txt` references `https://sinceai.fi/ai.txt` but no such file exists in the repo. |

### 3i. sitemap.xml

**Present** via `app/sitemap.ts` (Next.js MetadataRoute).  
Covers 22 static pages + all blog posts dynamically. Priority scores are well-calibrated (homepage and hackathon at 1.0, legal pages at 0.3).  
**Gap:** The `europe-ai` route exists in the sitemap but `european-ai` also exists — two closely related programmatic SEO pages that may be creating keyword cannibalization.

---

## 4. Cloudflare

**No Cloudflare configuration found in the repository.** There is no `wrangler.toml`, `_worker.js`, `cloudflare.json`, or any Cloudflare-specific file.

The CI/CD workflow (`.github/workflows/nextjs.yml`) runs lint → typecheck → build, but does **not** deploy to Cloudflare. No Firebase deploy config file (`firebase.json`) was found either, despite CLAUDE.md mentioning Firebase Hosting. The deploy step may be in a separate, possibly gitignored, workflow or managed via the Cloudflare/Firebase dashboard directly.

**Action required:** Check the Cloudflare dashboard manually to verify DNS, proxy status, caching rules, and whether Pages or Workers are in use.

---

## 5. Design System

### UI Component Library
- **shadcn/ui** (new-york style, RSC-enabled) — Radix UI primitives under the hood
- All shadcn components live in `components/ui/`
- Icons: **lucide-react** (^0.562.0) + **react-icons** (^5.5.0)

### Fonts
- **Space Grotesk** — loaded via `next/font/google`, weights 300–700
- CSS variable: `--font-space-grotesk`
- Applied globally as `font-sans` on `<body>`
- *(Note: CLAUDE.md says "Geist Sans and Geist Mono" — this is incorrect documentation)*

### Color System
- **OKLCH color space** with CSS custom properties in `app/globals.css`
- Dark-first: `bg-black` body, black backgrounds throughout
- Primary palette (actual site usage):

| Role | Value |
|---|---|
| Background | `#000000` (black) |
| Primary text | `text-white` |
| Secondary text | `text-neutral-400`, `text-neutral-500`, `text-neutral-600` |
| Primary CTA | `bg-white text-black` (pill/rounded-full) |
| Secondary CTA | `bg-white/10 border border-white/20` (glassmorphism) |
| Borders/dividers | `border-white/5`, `border-white/10` |
| Card surfaces | `bg-white/[0.02]`, `bg-white/[0.04]` |

- shadcn CSS variables use OKLCH (e.g., `--primary: oklch(0.205 0 0)`) but these are mostly used inside shadcn components (dialogs, form elements), not the primary marketing design.
- Base radius: `--radius: 1.25rem` (20px), with computed sizes down to `--radius-sm` and up to `--radius-4xl`

### Spacing & Layout
- Tailwind CSS v4 default spacing scale
- Max-width containers: `max-w-5xl` (1024px) and `max-w-7xl` (1280px)
- Section padding convention: `py-20 px-6` to `py-32 px-6`

### Animation
- Framer Motion `motion.*` components for entrance animations
- Easing: `[0.22, 1, 0.36, 1]` custom cubic-bezier (consistent across hero staggered reveals)
- `whileInView` with `viewport={{ once: true }}` for scroll-triggered animations
- Smooth scroll: custom `SmoothScroll` wrapper using `@studio-freight/lenis`
- Preloader component with `AnimatePresence` on homepage

---

## 6. Technical Red Flags

### 🔴 CRITICAL — Homepage is fully client-rendered

**File:** `app/page.tsx` — line 1: `"use client"`

The root homepage page component is marked as a Client Component. This means:
- The `<LeanHero>` H1 (`"Europe's AI builders community."`) is **not in the initial HTML** delivered to crawlers
- All homepage sections (`TrustBar`, `ThreePillars`, `ProofStrip`, `ProjectSpotlight`, `LatestPosts`, `DualCTA`, `PartnersSection`) require JavaScript to render
- Google can eventually crawl JS-rendered content on second passes, but it is slower and less reliable
- The Preloader state machine (`useState(true)` → `setTimeout 300ms`) adds an extra render-blocking delay

### 🔴 CRITICAL — `/hackathon` page is fully client-rendered with JS-dependent JSON-LD

**File:** `app/hackathon/page.tsx` — line 1: `"use client"`

- The Event, FAQ, and Breadcrumb JSON-LD schemas are injected via `dangerouslySetInnerHTML` inside the client component's render function — **they are not present in the server-rendered HTML**
- The H1 `"Since AI Hackathon 2026"` is also client-rendered
- Rich result eligibility (Event cards, FAQ dropdowns in SERPs) requires JSON-LD to be in the initial HTML

### 🔴 CRITICAL — Individual homepage sections are also `"use client"`

- `LeanHero.tsx` → `"use client"` (Framer Motion)
- `ProofStrip.tsx` → `"use client"` (Framer Motion)
- `TrustBar.tsx` → `"use client"` (CSS animation via `style jsx`)

Even if `app/page.tsx` were converted to a Server Component, these sections would need their client boundaries scoped more tightly (e.g., only the animation wrapper is client, the text content is server-rendered).

### 🟡 HIGH — Stats in `lib/org.ts` are stale/mismatched

`ORG.stats.hackathonParticipants` = `"200+"` — but the actual figure is **260**, sourced from `FIRST_EVENT.attendance` in `lib/sinceai.ts`. The hero and proof strip both use the correct 260, but any component that reads from `ORG.stats` directly would display the wrong number. `lib/org.ts` needs to be updated.

### 🟡 HIGH — Hero stats are hardcoded, not sourced from constants

In `LeanHero.tsx`, the four stat pills (`"1000+ members"`, `"260+ builders"`, etc.) are raw JSX strings — they do **not** reference `ORG.stats` or `FIRST_EVENT`. If stats change, this section will silently go stale.

### 🟡 HIGH — CountdownTimer date hardcoded outside constants

`app/hackathon/page.tsx` passes `startDate="2026-11-06T16:00:00"` to `CountdownTimer` as a hardcoded string literal. This date does not exist in `lib/sinceai.ts` (`UPCOMING_EVENT_2026` only has `month` and `year`). When exact dates are announced, this needs a separate manual update with no single source of truth enforcing consistency.

### 🟡 MEDIUM — `ai.txt` referenced but missing

`public/llms.txt` links to `https://sinceai.fi/ai.txt` but no such file exists in the repo or `public/` directory. This creates a 404 for any AI crawler or user following that reference.

### 🟡 MEDIUM — OG image is a static black-background logo PNG

Root metadata OG image: `/assets/logo/SINCE AI full black.png` — a plain logo on a black background. This is unlikely to drive click-throughs on social shares. The hackathon page has a dynamic OG (`/api/og/hackathon`) but the homepage, about, events, blog index, and all other pages share this same static fallback.

### 🟡 MEDIUM — `european-ai` vs `europe-ai` route duplication

Two programmatic SEO pages exist: `/european-ai` and `/europe-ai`. Both are in the sitemap. This is likely intentional keyword targeting but risks duplicate content penalties without explicit canonical tags pointing to a primary URL.

### 🟢 LOW — `style jsx` inside TrustBar may behave unexpectedly

`TrustBar.tsx` uses `<style jsx>` (styled-jsx syntax) for the scroll animation keyframes. This requires styled-jsx to be configured — it is typically bundled with Next.js Pages Router but behavior in App Router with Turbopack can vary. If the keyframes don't apply, the logo strip will be static (not scrolling).

### 🟢 LOW — Documentation mismatch in CLAUDE.md

CLAUDE.md states `"Fonts: Geist Sans and Geist Mono (Google Fonts via next/font)"` — the actual font is **Space Grotesk**. This will mislead future contributors.

### 🟢 LOW — `numberOfEmployees` schema value uses 500, not 1000+

In `lib/schema.ts`, `getOrganizationSchema()` sets `numberOfEmployees.value: 500` with `unitText: "community members"`. The actual member count is 1000+. This is mislabeled (employees ≠ community members) and the number is outdated.

---

## Summary Table

| Area | Status | Priority |
|---|---|---|
| Framework detected correctly | ✅ Next.js 16 App Router | — |
| Route map complete | ✅ 24 routes mapped | — |
| Hero H1 location found | ✅ `LeanHero.tsx` | — |
| Stats row location found | ✅ `LeanHero.tsx` + `ProofStrip.tsx` | — |
| Partner logos location found | ✅ `lib/partners.ts` (TypeScript array) | — |
| Anonymous testimonial found | ✅ `ProofStrip.tsx` | — |
| Hackathon 2026 mentions found | ✅ Multiple locations | — |
| Metadata exports found | ✅ Root layout + per-page layouts | — |
| JSON-LD found | ✅ But client-rendered on key pages | 🔴 |
| robots.txt | ✅ Present, AI crawlers whitelisted | — |
| llms.txt | ✅ Present (+ llms-full.txt) | — |
| ai.txt | ❌ Referenced but missing | 🟡 |
| sitemap.xml | ✅ Present, dynamic | — |
| Cloudflare config | ❌ Not in repo — check dashboard | — |
| Homepage SSR | ❌ Fully client-rendered | 🔴 |
| Hackathon page SSR | ❌ Fully client-rendered + JS JSON-LD | 🔴 |
| Stats consistency | ❌ `ORG.stats` stale (200+ vs 260) | 🟡 |
| Hero stats sourced from constants | ❌ Hardcoded strings | 🟡 |
| OG images | ⚠️ Static PNG on most pages | 🟡 |
| Font documentation | ❌ CLAUDE.md says Geist, actual is Space Grotesk | 🟢 |
