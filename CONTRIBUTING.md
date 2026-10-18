# Contributing to Since AI

Thank you for helping build [sinceai.ai](https://sinceai.ai). This guide covers how to propose a change and get
it merged. Setup and architecture are in [README.md](README.md); coding conventions are in [CLAUDE.md](CLAUDE.md).

By taking part you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug or an outdated fact:** [open an issue](https://github.com/sinceaihq/sinceai/issues/new/choose)
  using the bug report or content correction form.
- **Suggest an improvement:** open a feature request and describe the problem it solves.
- **Send a pull request:** for anything beyond a small fix, open an issue first so we can agree on the approach.
- **Security issues:** never in public. Follow [SECURITY.md](SECURITY.md).

## Workflow

1. Fork the repository (or branch, if you have write access) from the latest `main`.
2. Name the branch after the change: `feat/…`, `fix/…`, `copy/…`, `docs/…`, `chore/…`.
3. Keep each pull request focused on one concern, and link the issue it closes (`Closes #123`).
4. Fill in the pull request template, including screenshots for visible changes.
5. CI must be green, and a maintainer must approve, before a change is merged.
6. Merging to `main` deploys to production automatically, so `main` must always be releasable.

## Before you open a pull request

```bash
npm run lint          # ESLint, zero errors
npx tsc --noEmit      # Type check, zero errors
npm test              # Unit and component tests (Jest)
npm run build         # Production build
npm run test:e2e      # Browser tests; required for Field Guide changes (after npm run build)
```

CI runs lint, type check, unit tests, a production build and a Cloudflare build on every pull request.
Warnings are acceptable; errors block the merge. Add or update tests whenever you add logic.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(guide): add the weekend food menu
fix: correct the event date on /hackathon
copy(partners): update a partner description
docs: explain the deployment pipeline
chore: update dependencies
```

## Where content lives

Facts are data, never hardcoded in components.

| What you're changing | Where it lives |
|---|---|
| Organisation name, legal details, contact emails, social links, stats | `lib/org.ts` |
| Event dates and site-wide copy | `lib/sinceai.ts` |
| Blog articles and their metadata | `content/blog/*.mdx`, `lib/blog.ts` |
| FAQ content | `lib/faqs.ts` |
| Partners | `lib/partners.ts` |
| Challenge themes | `lib/projects.ts` |
| Hackathon 2026 Field Guide: schedule, venues, food, companies, maps, guide copy | `lib/hackathon-2026/` |

## Adding a page

1. Create `app/<route>/page.tsx`.
2. Create `app/<route>/layout.tsx` with the `metadata` export (`title`, `description`, `openGraph`,
   `alternates.canonical`). Metadata always goes in `layout.tsx`, even for `"use client"` pages.
3. Add a breadcrumb JSON-LD schema with the `StructuredData` component in the layout.
4. Add the route to `app/sitemap.ts` (Field Guide pages are the exception: they are intentionally not indexed).

## Adding a UI component

Follow the design conventions in [CLAUDE.md](CLAUDE.md): sharp corners, the two button styles and the design
tokens. For a new shadcn/ui primitive:

```bash
npx shadcn@latest add <component-name>
```

## Licensing of contributions

The code in this repository is MIT-licensed. By submitting a pull request, you agree that your contribution is
licensed under the [MIT License](LICENSE), and you confirm that you have the right to submit it. Do not add
images, logos or text you do not have permission to publish. See [NOTICE.md](NOTICE.md) for the material that
is not MIT-licensed.
