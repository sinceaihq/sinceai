# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Since AI community website (sinceai.fi) — a Next.js 16 marketing site for an AI developers and hackathon community based in Turku, Finland. Built with React 19, TypeScript 5, and Tailwind CSS v4.

## Commands

- `npm run dev` — Start development server
- `npm run build` — Production build
- `npm run lint` — Run ESLint
- `npm start` — Start production server
- `npm ci --legacy-peer-deps` — Install dependencies (legacy-peer-deps required for CI)

Jest is configured (`npm run test`). No tests currently exist — add them when introducing testable logic.

## Architecture

**Next.js App Router** with the `@/*` path alias mapping to the project root.

### Key directories

- `app/` — Pages and API routes (App Router). Each page has its own directory with `page.tsx`.
- `components/sections/` — Page-specific section components, organized by page (e.g., `homepage/`, `contact/`). Each subdirectory has a barrel `index.ts`.
- `components/ui/` — shadcn/ui components (new-york style, RSC-enabled, lucide icons). Add new ones via `npx shadcn@latest add <component>`.
- `components/motion-primitives/` — Reusable animation components (Framer Motion wrappers).
- `components/effects/` — Visual effects (lamp, number ticker, timeline).
- `lib/org.ts` — Single source of truth for organization constants (name, contact info, social links, stats).
- `lib/sinceai.ts` — Site-wide constants (event dates, copy, links).
- `lib/projects.ts` — Challenge theme data with typed `ChallengeTheme` interface.
- `lib/schema.ts` — JSON-LD structured data generators (Organization, Event, FAQ schemas).
- `lib/utils.ts` — `cn()` helper (clsx + tailwind-merge).
- `hooks/` — Custom hooks (e.g., `use-mobile.ts` with 768px breakpoint).

### API Routes

- Contact submissions are handled client-side from the contact page; there is no server-side contact API route in this deployment.

### Styling & Theming

- Tailwind CSS v4 via PostCSS (`@tailwindcss/postcss`)
- OKLCH color space with CSS custom properties in `app/globals.css`
- Dark-first design (black background, `bg-black` on body)
- Fonts: JetBrains Mono (`--font-mono`) and Inter (`--font-sans`) via `next/font/google`

### SEO

- JSON-LD schemas injected in root `layout.tsx`
- Dynamic `sitemap.ts` and `robots.ts`
- OpenGraph and Twitter metadata on each page
- Canonical URL: `https://sinceai.ai`

### Deployment

Production runs on Cloudflare Workers via the OpenNext adapter. GitHub Actions runs CI (lint, typecheck, build) on every PR and deploys to Cloudflare on merge to `main`.

## Conventions

- Use `"use client"` directive only on components that need client-side interactivity
- Organization data (name, stats, social links) always comes from `lib/org.ts` — never hardcode
- Event dates and copy come from `lib/sinceai.ts`
- Import path alias: `@/components/...`, `@/lib/...`, `@/hooks/...`
- Node.js >= 20.9.0 required

## Spacing & Typography

These are the established conventions. Follow them when building new pages or sections so the site feels consistent.

### Section padding

| Use case | Classes |
|---|---|
| Regular content section | `py-24 px-6` |
| Hero / page intro section | `py-24 md:py-32 px-6` |
| Major CTA or registration section | `py-40 px-6` |

### Container widths

| Page type | Class |
|---|---|
| Prose/content pages (about, faq, partners) | `max-w-4xl mx-auto` |
| Listing/medium pages (blog, events) | `max-w-5xl mx-auto` |
| Grid pages (projects) | `max-w-6xl mx-auto` |
| Hackathon event page | `max-w-[1200px] mx-auto` |

### Typography

| Element | Classes |
|---|---|
| Page H1 | `text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight` |
| Section H2 (content pages) | `text-3xl font-bold tracking-tight` |
| Section H2 (within-page headers) | `text-4xl md:text-5xl font-bold tracking-tight` |
| Card / item H3 | `text-2xl font-bold tracking-tight` |
| Body / secondary text | `text-neutral-400 leading-relaxed` |
| Slightly emphasized body | `text-neutral-300 leading-relaxed` |

### SEO & schema

- Page metadata (`title`, `description`, `openGraph`, `alternates.canonical`) always goes in the route's `layout.tsx` — never in `page.tsx`
- This applies to `"use client"` pages too: metadata must be in the server `layout.tsx`
- JSON-LD schemas are injected via the `StructuredData` component in `layout.tsx` — never use inline `<script dangerouslySetInnerHTML>` in pages
- Breadcrumb schema should be present on every page except the homepage
