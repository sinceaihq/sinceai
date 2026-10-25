<div align="center">

<a href="https://sinceai.ai">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/assets/logo/SINCE%20AI%20full%20white.png">
    <img src="public/assets/logo/SINCE%20AI%20full%20black.png" alt="Since AI" width="260">
  </picture>
</a>

### Where frontier AI becomes shipped products.

The open-source website of **Since AI**, a global, execution-focused AI innovation ecosystem.

[**sinceai.ai**](https://sinceai.ai) · [Hackathon 2026](https://sinceai.ai/hackathon) · [Discord](https://discord.gg/vMWdrVUPws) · [LinkedIn](https://www.linkedin.com/company/sinceai) · [Hugging Face](https://huggingface.co/sinceaihq) · [Contact](https://sinceai.ai/contact)

[![CI](https://github.com/sinceaihq/sinceai/actions/workflows/nextjs.yml/badge.svg)](https://github.com/sinceaihq/sinceai/actions/workflows/nextjs.yml)
[![Deploy](https://github.com/sinceaihq/sinceai/actions/workflows/cloudflare.yml/badge.svg)](https://github.com/sinceaihq/sinceai/actions/workflows/cloudflare.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## About Since AI

Since AI connects AI builders with leading AI companies, research groups and investors, and turns those
connections into working products. We run high-intensity hackathons with real industry challenges, applied AI
projects and community events, open to builders worldwide.

Since AI is run by **Since AI ry**, a registered non-profit association in Finland. Our mission is to advance AI
education, practical skills, technological literacy and open collaboration for the broader community.

**Flagship event:** [Since AI Hackathon 2026](https://sinceai.ai/hackathon), 6–8 November 2026, Turku, Finland.

## Why this repository is open source

We are a non-profit, and we believe progress compounds when work is shared. Everything that runs
[sinceai.ai](https://sinceai.ai) is public: the site, the event Field Guide and its to-scale 3D campus model.
Anyone can learn from it, reuse it and build on where we left off. Issues and pull requests are welcome.

## What's inside

| Area | What it is |
|---|---|
| **Website** | The public site: home, hackathon, partners, projects, events, blog, press and more. |
| **Hackathon 2026 Field Guide** | `/hackathon-2026/guide`: role-based guides for builders, challenge partners, partners, judges and speakers, with schedules and calendar export, venue floor plans, food and accessibility information. Shared by direct link and intentionally not indexed by search engines. |
| **Campus 3D model** | A to-scale three.js model of the event campus (EduCity, BioCity, Joki), built from City of Turku and OpenStreetMap open data and loaded only on demand. See [`docs/campus-twin/`](docs/campus-twin/README.md). |
| **Discoverability** | Per-page metadata, JSON-LD structured data, a sitemap, robots rules and `llms.txt` files for AI assistants. |

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router, React Server Components), [React 19](https://react.dev/) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) (strict) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/) on [Radix UI](https://www.radix-ui.com/) |
| Motion and 3D | CSS animations (first-paint and scroll-driven, no JavaScript), [three.js](https://threejs.org/) for the campus model |
| Content | MDX blog articles (`@next/mdx`) |
| Forms | React Hook Form + Zod, EmailJS |
| Testing | [Jest](https://jestjs.io/) + Testing Library, [Playwright](https://playwright.dev/) with axe accessibility checks |
| Hosting | [Cloudflare Workers](https://workers.cloudflare.com/) via the [OpenNext](https://opennext.js.org/cloudflare) adapter |
| CI/CD | GitHub Actions |

## Quick start

**Requirements:** Node.js 20.9 or newer (the deploy pipeline uses Node 22) and npm 10+.

```bash
git clone https://github.com/sinceaihq/sinceai.git
cd sinceai
npm ci --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables or external services are needed
to develop, build or test the site.

> `--legacy-peer-deps` is required because some packages have not yet declared React 19 as a peer. Use it for every install.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build (webpack, for a smaller worker bundle) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm test` | Unit and component tests (Jest) |
| `npm run test:e2e` | Browser tests (Playwright, desktop and mobile). Run `npm run build` first. |
| `npm run build:cloudflare` | Build the Cloudflare Worker locally |
| `npm run preview:cloudflare` | Build and preview the Worker locally |

`E2E_BASE=https://sinceai.ai npm run test:e2e` runs the browser tests against the live site.

## Project structure

```
app/                     Routes (App Router). Each page has page.tsx + layout.tsx; metadata lives in layout.tsx
  hackathon-2026/guide/  The Field Guide: hub, role guides, venue explorer, calendar (.ics) routes
components/
  layout/                Navbar and footer
  sections/              Page sections (homepage, hackathon)
  guide/                 Field Guide UI; guide/twin/ is the campus 3D model
  ui/                    shadcn/ui primitives
  motion-primitives/     FadeIn / FadeInView — CSS-only entrance motion
content/blog/            Blog articles (MDX)
lib/
  org.ts                 Organisation facts: name, legal details, contacts, social links
  sinceai.ts             Event dates and site-wide copy
  schema.ts              JSON-LD generators
  hackathon-2026/        Single source of truth for the Field Guide: schedule, venues, food, companies, maps
data/campus-twin/        Open-data inputs of the 3D model, with sources and licences
public/                  Static assets, llms.txt, ai.txt
scripts/                 Build patches, QA tooling, the 3D data pipeline and poster rendering
e2e/                     Playwright tests
docs/                    Server setup and campus 3D documentation
```

## How we build

- **Data first.** Facts live in typed data in `lib/`, never in components. Changing a time, room or partner is a
  one-line edit, and tests guard the published facts.
- **Server-rendered by default.** `"use client"` only where a component needs browser APIs or state.
- **Accessible.** Semantic HTML, keyboard support and automated axe checks in the browser tests.
- **Fast.** Static pre-rendering, optimised images, and heavy features such as the 3D model loaded only on demand.
- **Consistent design.** One dark design system, with its conventions documented in [`CLAUDE.md`](CLAUDE.md).

## Deployment

Production runs on Cloudflare Workers through OpenNext.

1. Every pull request runs **lint, type check, unit tests and a production build** (`nextjs.yml`) and a
   **Cloudflare build check** (`cloudflare.yml`).
2. A merge to `main` deploys to [sinceai.ai](https://sinceai.ai) automatically.

The deploy job uses the `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` repository secrets.

## Contributing

We welcome contributions, from typo fixes to new features. Start with [`CONTRIBUTING.md`](CONTRIBUTING.md),
and please follow our [Code of Conduct](CODE_OF_CONDUCT.md).

- Found a bug or an outdated fact? [Open an issue](https://github.com/sinceaihq/sinceai/issues/new/choose).
- Found a security issue? Report it privately, as described in [`SECURITY.md`](SECURITY.md).

## License

The source code is released under the [MIT License](LICENSE).

The Since AI name and logos, the site's written content, partner logos and photographs are **not** covered by
the MIT License. See [`NOTICE.md`](NOTICE.md) for what you may and may not reuse.

---

<div align="center">

**Since AI ry** · Registered non-profit association in Finland · Business ID 3593920-2

[sinceai.ai](https://sinceai.ai) · [info@sinceai.fi](mailto:info@sinceai.fi) · [GitHub](https://github.com/sinceaihq) · [Hugging Face](https://huggingface.co/sinceaihq)

</div>
