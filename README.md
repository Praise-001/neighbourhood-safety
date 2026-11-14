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

## Stack
- **Monorepo:** pnpm + Turborepo, TypeScript everywhere
- **Web:** Next.js 15 (App Router), Tailwind, shadcn/ui, MapLibre GL
- **Mobile:** React Native + Expo (EAS Build)
- **API:** NestJS, REST + OpenAPI, Socket.IO/SSE
- **Data:** PostgreSQL + PostGIS, Redis, BullMQ, S3-compatible storage
- **Push:** FCM + APNs
- **Observability:** Sentry, PostHog, OpenTelemetry, pino

## Repo layout
```
apps/
  web/        Next.js: landing, guest tickets, business portal, moderation
  mobile/     Expo app
  api/        NestJS backend + workers
packages/
  ui-tokens/  design tokens (web + mobile)
  shared/     zod schemas, types, constants
  config/     eslint, tsconfig, prettier
infra/        docker-compose, terraform, deploy scripts
docs/         PRD, architecture, ADRs, runbooks, OpenAPI export
```

## Quick start (target: under 10 minutes)
```bash
corepack enable
pnpm install
cp .env.example .env            # fill the required values
docker compose -f infra/docker-compose.yml up -d   # Postgres+PostGIS, Redis, MinIO, Mailpit
pnpm db:migrate && pnpm db:seed
pnpm dev                        # api + web
pnpm --filter mobile start      # Expo
```

## Common commands
| Command | What it does |
|---|---|
| `pnpm dev` | Run api + web with hot reload |
| `pnpm lint` / `pnpm typecheck` | Static checks |
| `pnpm test` | Unit + integration tests |
| `pnpm test:e2e` | Playwright (web) |
| `pnpm db:migrate` | Apply migrations |
| `pnpm openapi:export` | Write `docs/openapi.json` |
| `pnpm audit:security` | Dependency + secret scans |

## Contributing
Read [`docs/WORKFLOW.md`](./docs/WORKFLOW.md). Security issues: see `SECURITY.md`.
