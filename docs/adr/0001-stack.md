# ADR-0001: Technology stack

Status: Proposed (confirm at P0-02) · Date: 2026-11-14

## Context
Small team, three client surfaces (web, mobile, business/moderation portal), geospatial queries, real-time alerts, strict privacy and security needs, Nigerian market (poor networks, mid-range Android, NDPR).

## Decision
- Monorepo: pnpm + Turborepo, TypeScript everywhere (shared zod contracts).
- Web: Next.js 15 App Router, Tailwind, shadcn/ui, MapLibre GL.
- Mobile: React Native + Expo (EAS).
- API: NestJS, REST + OpenAPI, WebSocket/SSE via Socket.IO with Redis adapter.
- Data: PostgreSQL + PostGIS, Redis + BullMQ, S3-compatible storage (R2/S3), CDN.
- Push: FCM + APNs. SMS: Termii (NG) with Twilio fallback. Email: Resend.
- Observability: Sentry, OpenTelemetry, pino, PostHog (consent-aware).
- Infra: Docker, Terraform, GitHub Actions.

## Consequences
+ One language, shared types, fast iteration, auto-generated API docs.
+ PostGIS gives indexed radius queries and polygons for business service areas.
− Node single-thread: CPU-heavy media work runs in separate worker processes.
− Expo limits some native location features; use development builds and config plugins for background location.

## Alternatives considered
- Java/Spring Boot backend: strong, but slower for a small team and loses shared types.
- MongoDB geo indexes: simpler start, weaker relational integrity and joins for RLS/tenancy.
- Flutter: viable, but splits language from web/backend.
