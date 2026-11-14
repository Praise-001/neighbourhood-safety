# API_CONVENTIONS

## Basics
- Base path `/v1`. JSON only (`application/json`; errors `application/problem+json`). UTC ISO-8601 timestamps. IDs are UUIDv7 strings; ticket `reference` for human lookup.
- Resource-oriented REST; plural nouns; no verbs except actions (`/tickets/{id}/confirm`).
- Every request gets `X-Request-Id` (generated if absent) echoed in responses and logs.

## Auth
`Authorization: Bearer <access>` for mobile/integrations; HttpOnly cookie + CSRF token for web. Guest sessions use a scoped token limited to the guest's own tickets. Business API keys: `Authorization: Bearer csa_live_…` with scopes.

## Idempotency
All create endpoints require `Idempotency-Key` (UUID). Same key + same body → replay stored response; same key + different body → `409`. Keys expire after 24 h.

## Pagination, filtering, sorting
Cursor pagination: `?limit=50&cursor=…` (max 100). Filters via query params (`category`, `severity`, `status`, `since`, `bbox=minLng,minLat,maxLng,maxLat`, `lat`, `lng`, `radius_m`). Sort `?sort=-created_at`.

## Errors (RFC 7807)
```json
{ "type": "https://docs.example.com/errors/validation", "title": "Validation failed",
  "status": 422, "code": "VALIDATION_FAILED", "detail": "…",
  "request_id": "…", "errors": [{ "field": "category", "message": "…" }] }
```
Stable `code` values live in `packages/shared/errors.ts`. Never leak stack traces, SQL, or whether an account exists.

## Status codes
200 OK · 201 Created (with `Location`) · 202 Accepted (async) · 204 No Content · 400 Malformed · 401 Unauthenticated · 403 Forbidden · 404 Not Found (also used to hide existence) · 409 Conflict/duplicate · 410 Gone · 413 Too Large · 415 Unsupported Media Type · 422 Validation · 429 Too Many Requests (+ `Retry-After`) · 500 · 502 · 503 (+ `Retry-After`) · 504.

## Rate-limit headers
`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After` on 429.

## Versioning and deprecation
Breaking change → new major path. Deprecated endpoints send `Deprecation` and `Sunset` headers and are listed in the changelog.

## Endpoint checklist (copy into PRs)
Auth · authorization incl. IDOR check · zod validation (allow-list) · rate limit · idempotency (if create) · audit log (if sensitive) · OpenAPI with examples + error schemas · unit + integration + abuse tests · no PII in logs.

## Initial endpoint map (refine in plan)
- Auth: `POST /v1/auth/otp/request`, `/otp/verify`, `/token/refresh`, `/logout`, `/logout-all`, `/guest/magic-link`, `/guest/verify`, `/2fa/*`, `/passkeys/*`
- Tickets: `POST /v1/tickets`, `GET /v1/tickets/{id}`, `GET /v1/tickets?bbox=…`, `POST /v1/tickets/{id}/confirm`, `POST /v1/tickets/{id}/flag`, `GET|POST /v1/tickets/{id}/comments`, `GET|POST /v1/tickets/{id}/updates`
- Guest: `POST /v1/guest/lookup` (reference + email), `GET /v1/guest/tickets`
- Media: `POST /v1/media/upload-url`, `POST /v1/media/{id}/complete`
- Me: `GET|PATCH /v1/me`, `GET|PUT /v1/me/alert-settings`, `GET|PUT /v1/me/notification-prefs`, `POST /v1/me/devices`, `POST /v1/me/export`, `DELETE /v1/me`
- Businesses: `POST /v1/businesses`, `GET /v1/businesses/search`, `GET|PATCH /v1/businesses/{id}`, `/members`, `/invitations`, `/inbox`, `/webhooks`, `/api-keys`
- Moderation: `GET /v1/mod/queue`, `POST /v1/mod/actions`, `GET /v1/mod/audit`
- Realtime: `GET /v1/stream?geohash=…` (SSE) or WebSocket namespace `/live`
- Ops: `GET /health/live`, `GET /health/ready`
