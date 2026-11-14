# WORKFLOW

How code moves from idea to production.

## 1. Branching and commits
- Trunk-based. `main` is always deployable and protected (PR + passing CI + review required; no direct pushes, no force-push).
- Branch name: `<type>/<task-id>-<slug>`, e.g. `feat/P3-02-create-ticket`.
- Conventional Commits: `feat(api): …`, `fix(web): …`, `chore(infra): …`, `docs: …`, `test: …`, `refactor: …`. Scope = lane or package.
- Small PRs (aim < 400 changed lines). One task, one PR.
- Agent commits end with the repository's required attribution trailer if the tooling mandates one.

## 2. Pull requests
Use `.github/PULL_REQUEST_TEMPLATE.md`. Required: task ID, what/why, screenshots for UI, test evidence, security/privacy impact, checklist rows updated, migration notes, rollback plan if risky.
Review: CODEOWNERS required for auth, RBAC/RLS, crypto, privacy (coarsening/anonymity), migrations, infra. Reviewers check the Definition of Done, not just style.

## 3. Definition of Done (every task)
- [ ] Acceptance criteria met; behaviour matches `docs/PRD.md`
- [ ] Unit + integration tests written; abuse-case tests where relevant
- [ ] `pnpm lint && pnpm typecheck && pnpm test` green
- [ ] No new high/critical findings in dependency, secret, SAST scans
- [ ] Endpoint checklist passed (auth, authz/IDOR, validation, rate limit, OpenAPI, audit)
- [ ] No PII/secrets/coordinates in logs
- [ ] `docs/STANDARDS_CHECKLIST.md` rows updated with path + test
- [ ] Docs updated (OpenAPI, README, ADR if a decision was made)
- [ ] Accessibility checked for UI changes (axe + keyboard)
- [ ] Migration is additive/expand-contract and reversible or documented
- [ ] `TASKS.md` updated, handoff note written if incomplete

## 3a. Phase gate
A phase is closed only when all its tasks are `[x]`, the **Gate** line in `TASKS.md` is met, relevant checklist rows are done, and a human approves in the PR/thread.

## 4. CI pipeline (GitHub Actions)
On every PR: install (frozen lockfile) → lint → typecheck → unit tests → integration tests (Testcontainers: Postgres+PostGIS, Redis) → build → OpenAPI export + diff check → migration check on fresh DB → gitleaks → dependency audit + Trivy → CodeQL/Semgrep → web: Playwright + axe + Lighthouse CI budgets → mobile: typecheck + unit tests.
On `main`: all of the above + build images → push to registry → deploy to staging → smoke tests + ZAP baseline.
Production: manual approval → migrations step (separate, logged) → blue/green or canary → health-gated rollout → automatic rollback on failure.
Mobile: EAS Build per tag; OTA updates only for JS-safe changes following the OTA policy.

## 5. Releases and versions
SemVer for apps and packages, changesets/release-please for changelogs, git tags per release. API version in URL (`/v1`); breaking changes require `/v2` and a deprecation window with `Deprecation`/`Sunset` headers.

## 6. Environments and config
Env vars validated at boot (zod). Local uses `.env` (gitignored); staging/prod secrets come from the secret manager. No prod data outside prod. Feature flags guard risky features and provide kill switches.

## 7. Database changes
New migration for every schema change; never edit applied ones. Use expand → migrate → contract. Backfills run as jobs. Review query plans for new queries. Destructive changes need human approval.

## 8. Incident response (summary; full runbooks in `docs/runbooks/`)
Detect (alert) → triage severity → mitigate (flag off, rollback, scale) → communicate (status page) → fix → post-mortem within 5 working days (blameless, with action items added to `TASKS.md`). Data breach: follow `docs/runbooks/breach.md` (legal notification timelines under NDPR/GDPR).

## 9. Dependencies
Add deliberately: check maintenance, licence, size, and security. Renovate/Dependabot weekly; security updates immediately. No unmaintained packages.

## 10. Technical debt
Log in `docs/tech-debt.md` (owner, severity, plan). `TODO` comments must reference a task ID. Reserve ~15% capacity per phase for debt.

## 11. Decision records
Any significant decision gets `docs/adr/NNNN-title.md` (Context, Decision, Consequences, Alternatives). Link it in `TASKS.md` Decisions log.

## 12. Working with multiple agents
Follow lanes and claim rules in `AGENTS.md`. Contract-first changes: `packages/shared` + OpenAPI merge before consumers. Handoffs go to `docs/HANDOFF.md`.
