# AGENTS.md: Operating rules for AI agents in this repo

(If your tool reads `CLAUDE.md`, `.cursorrules` or similar, point it at this file.)

## Mission
Build the platform described in `docs/PRD.md` to the standards in `docs/STANDARDS_CHECKLIST.md`. This is a safety product handling locations, media and personal data. Correctness, security and privacy beat speed.

## Start-of-session routine (every session, every agent)
1. Read `README.md`, this file, then `TASKS.md`.
2. Find the **first unchecked task in the current phase** that is not claimed by another agent.
3. Claim it: change `[ ]` to `[~]` and add `(agent: <name>, branch: <branch>)` on that line.
4. Read the docs relevant to that task (PRD section, architecture section, checklist rows).
5. Restate the task, your plan, and the files you'll touch in 5 lines or fewer, then start.

## End-of-task routine
1. Tests + lint + typecheck pass locally.
2. Update `docs/STANDARDS_CHECKLIST.md` rows your task affects (location + test name).
3. Update docs/OpenAPI if you changed an API.
4. Mark the task `[x]` in `TASKS.md` and add a one-line note.
5. Open a PR using the template. Never push directly to `main`.
6. Write a handoff note (below) if anything is half-done.

## Hard rules (never break)
- **Never** commit secrets, real user data or `.env` files. Use `.env.example`.
- **Never** trust client input. Validate server-side with zod; allow-list DTO fields.
- **Never** expose user IDs on anonymous reports, exact coordinates for sensitive categories, or home addresses.
- **Never** log PII, tokens, OTPs or full coordinates.
- **Never** edit an already-applied migration. Add a new one.
- **Never** disable lint, type, test or security checks to get green. Fix the cause.
- **Never** invent library APIs. Read the official docs and the full error message.
- **Never** add a paid third-party service without asking. Offer free-tier options first.
- **Never** do destructive operations (drop tables, force-push, delete branches/buckets) without explicit human approval.
- Every route handler, server action, RPC and table: authorization/RLS, validation, rate limit where relevant, tests.

## Coding conventions
- TypeScript strict mode, no `any` without a justifying comment.
- Small functions, explicit return types on public functions, no floating promises.
- Files: `kebab-case.ts`; classes `PascalCase`; constants `UPPER_SNAKE`.
- API errors: RFC 7807 problem+json with stable `code`.
- Timestamps UTC `timestamptz`; IDs UUIDv7/ULID; money none (no payments in scope).
- Conventional commits: `feat(app): ...`, `fix(db): ...`, `chore(infra): ...`.
- Shared contracts live in `src/shared` (or shared library directory).
- Tests live next to code (`*.spec.ts`) or in `test/` for integration/e2e.

## Multi-agent coordination
Work lanes (agents may run in parallel in different lanes):

| Lane | Owns | Do not edit without coordination |
|---|---|---|
| `app` | `src/` (Next.js app, UI, server actions, route handlers) | `supabase/` |
| `db` | `supabase/` (migrations, RLS policies, seeds) | `src/` |
| `infra` | CI, root configs, deployment | `src/`, `supabase/` |

- One task, one branch (`feat/P3-04-ticket-create`), one PR.
- If you need a change in another lane, add a task for it under "Cross-lane requests" in `TASKS.md` instead of editing it.
- Contract first: change `packages/shared` schemas and OpenAPI before consumers.
- Rebase on `main` daily; resolve conflicts, never overwrite another agent's work.

## Handoff note format (append to `docs/HANDOFF.md`)
```
### <date> <agent> <task id>
Done: ...
Not done: ...
Gotchas: ...
Next step: ...
```

## When to stop and ask a human
- Ambiguity affecting security, privacy, legal (NDPR/GDPR) or data retention.
- A requirement conflict between docs.
- Needing a paid service, new cloud resource or production access.
- Any test you cannot make pass without weakening it.
Otherwise: state your assumption in the PR and continue.

## Definition of Done
See `docs/WORKFLOW.md`. A task is not done until tests, security checks, docs and checklist rows are updated.
