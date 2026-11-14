# SUPERSEDED.md: what the 14-hour sprint replaces

Authority: `docs/adr/0004-sprint-scope.md`. Where documents disagree, ADR-0004 wins.

## Status of every earlier file

| File | Status | Action |
|---|---|---|
| `TASKS.md` | **REPLACED** | Overwrite with the sprint version |
| `AGENTS.md` | **REPLACED** | Overwrite with the sprint version (old claim/PR/handoff/gate routines removed) |
| `docs/adr/0004-sprint-scope.md` | **NEW** | Add |
| `SPRINT_PROMPT.md` | **NEW** | Paste into the agent |
| `docs/SUPERSEDED.md` | **NEW** | This file |
| `RUN_PROMPT.md`, `RUN_PROMPT_LEAN.md`, `KICKOFF_PROMPT.md` | Superseded | Archive |
| `docs/PRD.md` | Superseded (business, guest-return, push, roles all cut) | Archive |
| `docs/ARCHITECTURE.md` | Superseded (queues, Redis, API server removed) | Archive |
| `docs/DATA_MODEL.md` | Superseded (the sprint schema is in TASKS.md S1-01) | Archive |
| `docs/API_CONVENTIONS.md` | Superseded (no separate API server) | Archive |
| `docs/STANDARDS_CHECKLIST.md` | Superseded (no checklist upkeep) | Archive |
| `docs/WORKFLOW.md` | Superseded (no PR/CI ceremony) | Archive |
| `docs/PLAN.md` | Superseded | Archive |
| `docs/MASTER_BRIEF.md` | Original brief, reference only | Archive (keep for the report) |
| `docs/data-classification.md`, `docs/threat-model.md` | Reference only | Archive |
| `docs/HANDOFF.md`, `docs/tech-debt.md`, `docs/runbooks/` | Not used in the sprint | Archive |
| `docs/adr/0001-stack.md`, `docs/adr/0003-zero-cost-student-scope.md` | Superseded | Archive |
| `docs/adr/0002-dependency-versioning-policy.md` | **Still applies** (check versions with `pnpm view`) | Keep |
| `docs/DESIGN_SYSTEM.md` | **Still useful for colours and contrast** (ignore the component list) | Keep |
| `CLAUDE.md`, `.cursorrules` | Point to `AGENTS.md` | Keep |
| `SECURITY.md`, `.github/*`, `.gitignore`, `.env.example` | Harmless | Keep |

## Feature map: old plan to sprint

| Earlier feature | Sprint decision |
|---|---|
| Business registration, portal, roles, assignment | **Cut** |
| Guest return flow (reference + email, guest magic link, merge) | **Cut**, replaced by a plain public status page: type the code, see the ticket |
| Guest ticket creation | **Kept, simplified**: email field + reference code shown on screen |
| Roles (resident, guest, business, moderator, admin) | **Two roles only**: `user`, `admin` |
| Phone/SMS OTP, passkeys, SSO, TOTP, API keys, webhooks | **Cut** |
| Email sign-in | **Optional**, magic link only (S3-04) |
| Web Push, quiet hours, batching, per-category settings | **Cut**, replaced by in-app Realtime banner (S4-02) |
| Geo-fanout service, BullMQ, Redis | **Cut**, replaced by client-side radius check on Realtime events |
| NestJS API server | **Cut**, replaced by Next.js + Supabase (RLS + Postgres functions) |
| Expo mobile app | **Cut** (responsive web only) |
| Scheduled expiry job | **Replaced** by a query filter on `expires_at` |
| Reputation, duplicate merging, heat map, video, PWA | **Cut** |
| Moderation dashboard + audit log | **Reduced** to one admin page (S5-02) |
| STANDARDS_CHECKLIST (about 90 rows) | **Replaced** by the 7-point security floor in ADR-0004 |
| PR template, CODEOWNERS, phase gates, handoffs | **Cut** |
| Docker, Terraform, CDN, WAF, tracing, load tests | **Cut** |

## Apply it (PowerShell, from the repo root)

1. Unzip this kit and copy its contents into the repo root, replacing `TASKS.md` and `AGENTS.md` when asked.
2. Check the branch with `git branch --show-current`. The sprint works on `main`. If your latest work is on a branch such as `docs/scope-zero-cost`, merge it first: `git switch main` then `git merge docs/scope-zero-cost`.
3. Archive the superseded files. If a line errors with "pathspec did not match", that file isn't in your repo: skip it and run the rest.

```powershell
mkdir docs\archive
git mv RUN_PROMPT.md docs/archive/
git mv RUN_PROMPT_LEAN.md docs/archive/
git mv KICKOFF_PROMPT.md docs/archive/
git mv docs/PRD.md docs/archive/
git mv docs/ARCHITECTURE.md docs/archive/
git mv docs/DATA_MODEL.md docs/archive/
git mv docs/API_CONVENTIONS.md docs/archive/
git mv docs/STANDARDS_CHECKLIST.md docs/archive/
git mv docs/WORKFLOW.md docs/archive/
git mv docs/PLAN.md docs/archive/
git mv docs/MASTER_BRIEF.md docs/archive/
git mv docs/data-classification.md docs/archive/
git mv docs/threat-model.md docs/archive/
git mv docs/HANDOFF.md docs/archive/
git mv docs/tech-debt.md docs/archive/
git mv docs/runbooks docs/archive/runbooks
git mv docs/adr/0001-stack.md docs/archive/
git mv docs/adr/0003-zero-cost-student-scope.md docs/archive/
git add -A
git commit -m "docs: switch to 14-hour sprint scope (ADR-0004)"
git status
```

4. `git status` should say the working tree is clean. Then paste the prompt from `SPRINT_PROMPT.md` into the agent.

Nothing is deleted. Everything in `docs/archive/` stays in git history for your report.
