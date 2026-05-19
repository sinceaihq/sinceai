# Contributing to Since AI

Setup and architecture are covered in [README.md](README.md). Coding conventions and AI assistant guidance are in [CLAUDE.md](CLAUDE.md). This document covers the workflow for contributing.

## Getting started

```bash
git clone https://github.com/sinceaihq/sinceai.git
cd sinceai
npm ci --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Always use `--legacy-peer-deps` when installing or adding packages.

## Branch and PR workflow

1. Branch off `main` with a descriptive name: `feat/thing`, `fix/thing`, `chore/thing`
2. Keep PRs focused — one concern per PR
3. Open a PR against `main`; CI runs lint, type check, and build automatically
4. All three checks must pass before merging
5. Labels are applied automatically based on which files changed — no manual action needed

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add partner logo to marquee
fix: correct event date in sinceai.ts
chore: update dependencies
docs: update README deployment section
```

## Content changes

| What you're changing | Where it lives |
|---|---|
| Org name, contact emails, social links, stats | `lib/org.ts` |
| Event dates, copy strings | `lib/sinceai.ts` |
| Blog post metadata | `lib/blog.ts` |
| FAQ content | `lib/faqs.ts` |
| Partner data | `lib/partners.ts` |
| Challenge themes | `lib/projects.ts` |

Never hardcode these values directly in components.

## Adding a new page

1. Create `app/<route>/page.tsx`
2. Create `app/<route>/layout.tsx` with `metadata` export (`title`, `description`, `openGraph`, `alternates.canonical`)
3. Add the route to `app/sitemap.ts`
4. Add a breadcrumb JSON-LD schema via the `StructuredData` component in the layout

Metadata always goes in `layout.tsx`, never in `page.tsx` — even for `"use client"` pages.

## Adding a UI component

```bash
npx shadcn@latest add <component-name>
```

Components land in `components/ui/` automatically.

## What CI checks

```bash
npm run lint        # ESLint — must pass with zero errors
npm run build       # Next.js build — must complete without errors
```

Type checking runs as part of the build. Fix all errors before pushing — warnings in CI are fine, errors are not.
