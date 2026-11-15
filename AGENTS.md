# AGENTS.md: sprint rules (replaces the earlier AGENTS.md)

(`CLAUDE.md` and `.cursorrules` point here.)

We are in a 14-hour sprint on an academic project. Zero cost, synthetic data only.

## Read first
1. `docs/adr/0004-sprint-scope.md`: what is in and out. It overrides everything else.
2. `TASKS.md`: work strictly top to bottom, starting at the first unchecked task.
3. `docs/SUPERSEDED.md` lists documents to ignore. Anything in `docs/archive/` is not instructions.

## How to work
- Build only what is listed. If something seems missing, say so in one line and keep going; do not add scope.
- Work on `main`, commit after every task with a short conventional message (`feat: ...`, `fix: ...`, `chore: ...`).
- After each task, run the type check and any tests and show the real output. Never claim something works without running it.
- Never invent library APIs, versions or file paths. Check packages with `pnpm view <pkg> dist-tags` and read their docs or types first. If unsure, say so.
- Keep messages short: what you did, the proof, what is next.
- Do not stop between tasks to ask permission. Stop only when a task needs the owner to create an account, use a dashboard, or paste a key: give numbered steps, then wait.
- If a block runs over its time budget, drop its optional items and move on. A working demo beats every feature.

## Hard rules
- Never use a service that needs a card.
- No secrets, real user data or `.env` files in git. Only the Supabase anon key may be public; the service-role key never appears in browser code.
- Row-level security on every table. The public `tickets` table holds public columns only; exact location and reporter identity live in `ticket_private`.
- Validate all input with zod. Render user text as plain text. Generic error messages.
- Never disable a test, type check or lint rule to get green. Fix the cause.
- No destructive commands against the hosted database (drop, truncate, reset) without asking the owner first. Seed data is synthetic only.

## Style
TypeScript strict, no `any` without a short comment. Files `kebab-case.ts`. Timestamps in UTC. Theme: deep navy, a touch of yellow, white; light and dark mode.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
