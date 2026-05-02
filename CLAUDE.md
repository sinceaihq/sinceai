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

No test framework is configured.

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
- Fonts: Geist Sans and Geist Mono (Google Fonts via `next/font`)

### SEO

- JSON-LD schemas injected in root `layout.tsx`
- Dynamic `sitemap.ts` and `robots.ts`
- OpenGraph and Twitter metadata on each page
- Canonical URL: `https://sinceai.ai`

### Deployment

GitHub Actions workflows deploy to both GitHub Pages and Firebase Hosting. PRs get Firebase preview deployments.

## Conventions

- Use `"use client"` directive only on components that need client-side interactivity
- Organization data (name, stats, social links) always comes from `lib/org.ts` — never hardcode
- Event dates and copy come from `lib/sinceai.ts`
- Import path alias: `@/components/...`, `@/lib/...`, `@/hooks/...`
- Node.js >= 20.9.0 required
