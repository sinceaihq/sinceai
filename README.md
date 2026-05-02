# Since AI

Global AI builders community. Turku-based, globally connected.

## About

Since AI brings together builders, researchers, and founders working on artificial intelligence. We run high-signal hackathons where teams ship real solutions — code, demos, and measurable outcomes — in collaboration with partner companies bringing real-world challenges.

260 builders. 30+ projects. 15+ partner companies. Founded 2025.

## Stack

Built with Next.js 16, React 19, and TypeScript 5. Styled with Tailwind CSS v4 and Framer Motion. Deployed on Vercel with continuous integration via GitHub Actions.

- **Framework**: Next.js 16.2 (App Router, React Server Components)
- **UI**: React 19, Tailwind CSS v4, shadcn/ui, Radix UI primitives
- **Animation**: Framer Motion 12, Motion primitives
- **Type Safety**: TypeScript 5, Zod validation
- **Forms**: React Hook Form with resolver integration
- **Testing**: Jest 30, React Testing Library
- **Deployment**: Vercel (production), GitHub Actions (CI)

## Development

```bash
npm ci --legacy-peer-deps
npm run dev
```

Visit `http://localhost:3000`

## Structure

```
app/                    # Next.js App Router pages
├── api/                # API routes (contact form, OG images)
├── blog/               # Blog posts and articles
└── [page]/             # Marketing pages

components/
├── sections/           # Page-specific section components
├── ui/                 # shadcn/ui components (Radix UI)
├── motion-primitives/  # Reusable animation components
└── effects/            # Visual effects and animations

lib/
├── org.ts              # Organization constants (single source of truth)
├── sinceai.ts          # Event data and copy
├── partners.ts         # Partner data
├── projects.ts         # Challenge theme data
└── schema.ts           # JSON-LD structured data
```

## Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run Jest tests
```

## Architecture

Next.js App Router with React Server Components. Pages are statically generated where possible. API routes handle form submissions with rate limiting and validation. All organization data flows from centralized constants in `lib/`.

Path alias `@/*` maps to project root.

## Design System

Dark-first design with OKLCH color space. Typography uses Geist Sans and Geist Mono. Component library built on Radix UI primitives with shadcn/ui styling conventions. Motion design follows natural, physics-based animations.

Add new UI components:

```bash
npx shadcn@latest add <component>
```

## Contributing

Code follows TypeScript strict mode with ESLint enforcement. All PRs require passing lint, type check, and production build. Commit messages use conventional commits format.

Organization constants live in `lib/org.ts`. Never hardcode contact info, social links, or stats.

## Technical Details

- Node.js 20.9.0 or higher required
- Next.js builds to static HTML where possible (SSG)
- API routes use Edge Runtime for low latency
- Rate limiting: IP-based, 5 requests per hour on contact endpoint
- SEO: JSON-LD structured data, dynamic sitemap, OpenGraph metadata
- Font optimization via `next/font` with Geist Sans and Geist Mono

## Standards

Every component is built with performance, accessibility, and type safety in mind. We don't ship code that doesn't meet production standards.

## Community

1000+ AI developers, ML engineers, and researchers. Discord community open to anyone building with AI.

---

**Since AI ry** — Business ID 3593920-2 — Turku, Finland

[sinceai.fi](https://sinceai.ai) · [Discord](https://discord.com/invite/YkqJswRGSW) · [GitHub](https://github.com/sinceaihq)
