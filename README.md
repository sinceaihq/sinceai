# Since AI

Global AI builders community — Turku-based, globally connected.

[![CI](https://github.com/sinceaihq/sinceai/actions/workflows/nextjs.yml/badge.svg)](https://github.com/sinceaihq/sinceai/actions/workflows/nextjs.yml)
[![Cloudflare Deploy](https://github.com/sinceaihq/sinceai/actions/workflows/cloudflare.yml/badge.svg)](https://github.com/sinceaihq/sinceai/actions/workflows/cloudflare.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node](https://img.shields.io/badge/Node.js-%3E%3D20.9.0-green?logo=node.js&logoColor=white)](https://nodejs.org/)

Marketing website for Since AI — a non-profit AI builders community running hackathons, applied AI projects, and community events.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Commands](#commands)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Key Data Files](#key-data-files)
- [Styling](#styling)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Quick Start

**Requirements:** Node.js >= 20.9.0

```bash
# Clone and install
git clone https://github.com/sinceaihq/sinceai.git
cd sinceai
npm ci --legacy-peer-deps   # --legacy-peer-deps is required

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> The `--legacy-peer-deps` flag is required due to peer dependency conflicts between React 19 and some packages. Always use it when installing or adding dependencies.

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start local development server |
| `npm run build` | Production build (Next.js) |
| `npm run start` | Start production server locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Jest tests |
| `npm run test:watch` | Run Jest in watch mode |
| `npm run test:coverage` | Run Jest with coverage report |
| `npm run build:cloudflare` | Build for Cloudflare Workers deployment |
| `npm run preview:cloudflare` | Build and preview Cloudflare Workers locally |
| `npm run deploy:cloudflare` | Build and deploy to Cloudflare Workers |

---

## Project Structure

```
sinceai/
├── app/                          # Next.js App Router — pages and routes
│   ├── layout.tsx                # Root layout: fonts, global metadata, JSON-LD schemas
│   ├── page.tsx                  # Homepage (/)
│   ├── globals.css               # Global styles, OKLCH color tokens, Tailwind imports
│   ├── sitemap.ts                # Dynamic sitemap generation
│   ├── robots.ts                 # robots.txt generation
│   │
│   ├── blog/
│   │   ├── page.tsx              # Blog index (/blog)
│   │   └── [slug]/page.tsx       # Blog post pages — 308 redirect to Medium
│   │
│   ├── hackathon/                # /hackathon — flagship event page
│   ├── partners/                 # /partners — company partnership info
│   ├── for-builders/             # /for-builders — builder community info
│   ├── about/                    # /about — org info, team, legal
│   ├── faq/                      # /faq — frequently asked questions
│   ├── events/                   # /events — event listings
│   ├── contact/                  # /contact — contact form and team directory
│   ├── press/                    # /press — press kit and media info
│   ├── stats/                    # /stats — community metrics
│   ├── impact/                   # /impact — impact and methodology
│   ├── resources/                # /resources — guides and tools
│   ├── projects/                 # /projects — shipped AI projects
│   ├── blog/                     # /blog — blog index + post redirects
│   ├── europe-ai/                # /europe-ai — European AI ecosystem
│   ├── european-ai/              # /european-ai — European AI sovereignty
│   ├── finland-ai/               # /finland-ai — Finland AI community
│   ├── turku/                    # /turku — Turku AI scene
│   ├── ai-hackathons/            # /ai-hackathons — global AI hackathon guide
│   ├── production-support/       # /production-support — post-hackathon support program
│   ├── research-to-market/       # /research-to-market — academic-to-industry bridge
│   ├── privacy/                  # /privacy — privacy policy
│   ├── terms/                    # /terms — terms of service
│   └── code-of-conduct/          # /code-of-conduct
│
├── components/
│   ├── navbar.tsx                # Site-wide navigation bar
│   ├── ContactForm.tsx           # EmailJS-powered contact form
│   ├── HackathonCountdown.tsx    # Live countdown to next hackathon
│   ├── CookieConsent.tsx         # Cookie consent banner
│   ├── StructuredData.tsx        # JSON-LD injection helper
│   ├── SocialShare.tsx           # Social sharing buttons
│   │
│   ├── sections/                 # Page-specific section components
│   │   ├── Footer.tsx            # Site-wide footer
│   │   ├── homepage/             # Homepage sections (Hero, Partners, etc.)
│   │   │   ├── index.ts          # Barrel export
│   │   │   ├── LeanHero.tsx      # Main hero section
│   │   │   ├── PartnersSection.tsx
│   │   │   ├── HackathonFeature.tsx
│   │   │   ├── FeaturedSpeakers.tsx
│   │   │   ├── LatestPosts.tsx
│   │   │   ├── ProjectSpotlight.tsx
│   │   │   ├── ThreePillars.tsx
│   │   │   ├── TrustBar.tsx
│   │   │   ├── ProofStrip.tsx
│   │   │   └── DualCTA.tsx
│   │   └── contact/              # Contact page sections
│   │       ├── index.ts
│   │       ├── ContactHero.tsx
│   │       ├── ContactFAQ.tsx
│   │       ├── DirectContact.tsx
│   │       └── ResponseTime.tsx
│   │
│   ├── ui/                       # shadcn/ui components (new-york style)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...                   # Add new ones via: npx shadcn@latest add <component>
│   │
│   ├── motion-primitives/        # Reusable Framer Motion wrappers
│   │   ├── fade-in.tsx           # FadeIn wrapper
│   │   ├── in-view.tsx           # Trigger animations on scroll into view
│   │   ├── infinite-slider.tsx   # Infinite scroll marquee
│   │   ├── text-effect.tsx       # Animated text reveals
│   │   └── ...
│   │
│   └── effects/                  # Standalone visual effects
│       ├── lamp.tsx              # Lamp spotlight effect
│       ├── number_ticker.tsx     # Animated number counter
│       └── timeline.tsx          # Timeline component
│
├── lib/                          # Shared utilities and constants
│   ├── org.ts                    # ← Single source of truth for org info
│   ├── sinceai.ts                # Event dates, copy strings, helper functions
│   ├── blog.ts                   # Blog post metadata (titles, slugs, Medium URLs)
│   ├── partners.ts               # Partner company data
│   ├── projects.ts               # Challenge theme data (ChallengeTheme type)
│   ├── schema.ts                 # JSON-LD structured data generators
│   └── utils.ts                  # cn() helper (clsx + tailwind-merge)
│
├── hooks/
│   └── use-mobile.ts             # Mobile breakpoint hook (768px)
│
├── data/
│   └── faqs.ts                   # FAQ content for /faq and structured data
│
├── public/
│   ├── assets/
│   │   ├── logo/                 # Since AI logo variants (black/white, full/mark)
│   │   ├── og/                   # OpenGraph images (hero.png)
│   │   ├── sponsors/             # Partner and sponsor logos
│   │   ├── speakers/             # Speaker photos
│   │   └── supports/             # Supporting org logos
│   ├── ai.txt                    # AI crawler discovery file
│   ├── llms.txt                  # LLM context file (short)
│   └── llms-full.txt             # LLM context file (full)
│
├── .github/
│   └── workflows/
│       ├── nextjs.yml            # CI: lint, typecheck, build
│       └── cloudflare.yml        # CD: deploy to Cloudflare Workers
│
├── next.config.ts                # Next.js config (security headers, image settings)
├── open-next.config.ts           # OpenNext Cloudflare Workers adapter config
├── tailwind.config.ts            # Tailwind CSS v4 config
├── tsconfig.json                 # TypeScript config (@/* path alias)
└── CLAUDE.md                     # Instructions for Claude Code AI assistant
```

---

## Architecture

**Next.js 16 App Router** with React Server Components. Pages are server-rendered by default — `"use client"` is only added when a component needs browser APIs, state, or event handlers.

### Routing

Each page lives in `app/<route>/page.tsx`. Pages that need shared metadata or layout wrappers use a sibling `layout.tsx`. The `app/layout.tsx` root layout applies globally: fonts, body styles, cookie consent, and Organization + WebSite JSON-LD schemas.

### Data Flow

All organization constants flow from `lib/org.ts` — never hardcode contact info, social links, or stats anywhere else. Event dates and copy come from `lib/sinceai.ts`. This ensures a single edit updates the whole site.

### Blog

Blog posts live on Medium. The `app/blog/[slug]/page.tsx` route exists only to issue a **308 permanent redirect** to the Medium URL. The blog index (`/blog`) renders post metadata from `lib/blog.ts` and links out to Medium.

### Path Alias

`@/*` maps to the project root. Use it for all imports:

```ts
import { ORG } from "@/lib/org";
import { FadeIn } from "@/components/motion-primitives/fade-in";
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, RSC) |
| UI | React 19, Tailwind CSS v4, shadcn/ui, Radix UI |
| Animation | Framer Motion 12, custom motion primitives |
| Scroll | Lenis smooth scroll (`@studio-freight/lenis`) |
| Forms | React Hook Form + Zod validation, EmailJS for delivery |
| Type Safety | TypeScript 5 (strict mode) |
| Testing | Jest 30, React Testing Library |
| Linting | ESLint 9 with Next.js config |
| Deployment | Cloudflare Workers (via OpenNext adapter) |
| CI/CD | GitHub Actions |

---

## Key Data Files

These are the files you'll edit most often for content changes:

### `lib/org.ts`
Organization constants — name, contact emails, social links, stats. **Never hardcode these values in components.**

### `lib/sinceai.ts`
Event data (past hackathon dates, upcoming event info), UI copy strings, and helper functions (`hasEventOccurred()`, `getEventStatus()`).

### `lib/blog.ts`
Blog post metadata: title, description, slug, Medium URL, publish date, tags, keywords. Adding a new post here automatically adds it to the blog index and sitemap.

### `data/faqs.ts`
FAQ content used on the `/faq` page and injected as `FAQPage` JSON-LD structured data.

### `lib/partners.ts`
Partner company data used in the partner marquee and partner sections.

---

## Styling

- **Tailwind CSS v4** via PostCSS (`@tailwindcss/postcss`)
- **OKLCH color space** with CSS custom properties defined in `app/globals.css`
- **Dark-first design** — `bg-black` on body, light text
- **Fonts:** JetBrains Mono (`--font-mono`) and Inter (`--font-sans`) loaded via `next/font/google`
- **Component library:** shadcn/ui (new-york style, RSC-enabled, Lucide icons)

Add a new shadcn component:

```bash
npx shadcn@latest add <component>
```

---

## Deployment

Production runs on **Cloudflare Workers** using the [OpenNext](https://opennext.js.org/) adapter.

### How it works

1. `npm run build:cloudflare` compiles the Next.js app via OpenNext for the Workers runtime
2. `opennextjs-cloudflare deploy` pushes the Worker to Cloudflare
3. Cloudflare handles CDN, caching, SSL, and `www` → root domain redirects

### CI/CD pipelines

**`nextjs.yml`** — runs on every push and PR to `main`:
- Lint (`eslint`)
- Type check (`tsc --noEmit`)
- Build (`next build`)

**`cloudflare.yml`** — runs on every push and PR to `main`:
- Lint + Cloudflare build (PRs: check only)
- Deploy to Cloudflare Workers (pushes to `main` only)

### Environment variables

Cloudflare deployment requires these secrets in GitHub Actions:

| Secret | Description |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | API token with Workers deployment permissions |

---

## Contributing

### Rules

- **Organization data** always comes from `lib/org.ts` — never hardcode names, emails, or links
- **Event data** always comes from `lib/sinceai.ts`
- Use `"use client"` only when strictly necessary (browser APIs, state, event handlers)
- All PRs must pass lint, type check, and build before merging
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.)

### Adding a new page

1. Create `app/<route>/page.tsx`
2. Export a `metadata` object with `title`, `description`, and `alternates.canonical`
3. Add the route to `app/sitemap.ts`

### Adding a new UI component

```bash
npx shadcn@latest add <component-name>
```

Components land in `components/ui/` automatically.

---

**Since AI ry** — Business ID 3593920-2 — Turku, Finland

[sinceai.ai](https://sinceai.ai) · [Discord](https://discord.com/invite/YkqJswRGSW) · [GitHub](https://github.com/sinceaihq)
