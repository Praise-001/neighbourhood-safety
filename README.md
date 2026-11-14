# SafeNeighbour: Community Safety & Incident Ticket Platform

> Working name. Rename freely (search/replace `SafeNeighbour`).

Neighbours report incidents ("tickets"), and people nearby are alerted instantly. Guests can report without an account and return with their ticket reference + email. Businesses (security firms, estates, utilities) register so users can address tickets to them.

## Status
See [`TASKS.md`](./TASKS.md) for current phase and progress.

## Read this first (humans and agents)
| Order | File | Purpose |
|---|---|---|
| 1 | [`AGENTS.md`](./AGENTS.md) | How agents must behave in this repo |
| 2 | [`docs/PRD.md`](./docs/PRD.md) | What we are building and for whom |
| 3 | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | How it is built |
| 4 | [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) | Colors, theming, accessibility |
| 5 | [`docs/STANDARDS_CHECKLIST.md`](./docs/STANDARDS_CHECKLIST.md) | Security and reliability gates |
| 6 | [`docs/WORKFLOW.md`](./docs/WORKFLOW.md) | Git, PRs, CI/CD, definition of done |
| 7 | [`TASKS.md`](./TASKS.md) | What to do next |
| Ref | [`docs/MASTER_BRIEF.md`](./docs/MASTER_BRIEF.md) | Original full brief (source of truth if files disagree) |

## Stack (Lean Academic Scope — see docs/adr/0003-zero-cost-student-scope.md)
- **App:** Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui, MapLibre GL, installable PWA
- **Database, Auth & Storage:** Supabase Free Tier (PostgreSQL + PostGIS, Supabase Auth, Storage, Realtime, RLS)
- **Alerts:** PostGIS spatial queries (`ST_DWithin`), Supabase Realtime, Web Push (VAPID)
- **Maps & Geocoding:** MapLibre GL + OpenStreetMap / CARTO tiles, Nominatim (with debounce)
- **Hosting & CI:** Vercel Hobby + GitHub Actions

## Repo layout
```
src/
  app/            Next.js App Router (pages, route handlers, server actions)
  components/     UI components (shadcn/ui, map, forms)
  lib/            Supabase client/server helpers, geo utils, validators
  shared/         Zod schemas, types, error formats
supabase/
  migrations/     SQL migrations & RLS policies
  seeds/          Synthetic demo seed script
docs/             PRD, ADRs, checklist, plan
```

## Quick start (target: under 5 minutes — no Docker needed)
```bash
pnpm install
cp .env.example .env.local       # add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
pnpm dev                         # run Next.js at http://localhost:3000
```

## Common commands
| Command | What it does |
|---|---|
| `pnpm dev` | Run Next.js with hot reload |
| `pnpm lint` / `pnpm typecheck` | Static code & type checks |
| `pnpm test` | Unit + integration tests |
| `pnpm test:e2e` | Playwright tests |
| `pnpm db:seed` | Populate synthetic demo data |
| `pnpm audit:security` | Dependency + secret audit |

## Contributing
Read [`docs/WORKFLOW.md`](./docs/WORKFLOW.md). Security issues: see `SECURITY.md`.
