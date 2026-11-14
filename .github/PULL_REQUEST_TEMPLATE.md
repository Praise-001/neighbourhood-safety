## Task
Task ID(s): P_-__   Lane: infra / api / web / mobile / shared

## What and why
<!-- 2–5 lines -->

## How to test
<!-- commands, URLs, screenshots/video for UI -->

## Security and privacy impact
- [ ] None
- [ ] Touches auth / authz / crypto / privacy rules (CODEOWNERS review needed)
- Notes:

## Definition of Done (see docs/WORKFLOW.md)
- [ ] Tests added/updated (unit + integration; abuse-case where relevant)
- [ ] `pnpm lint`, `typecheck`, `test` pass
- [ ] Endpoint checklist: auth, authz/IDOR, validation, rate limit, OpenAPI, audit log
- [ ] No PII, tokens, OTPs or coordinates in logs
- [ ] `docs/STANDARDS_CHECKLIST.md` rows updated
- [ ] Docs / OpenAPI / ADR updated
- [ ] Accessibility checked (UI)
- [ ] Migration safe (additive, reversible or documented)
- [ ] `TASKS.md` updated

## Rollback plan
<!-- how to undo if this goes wrong -->

## Assumptions made
<!-- anything decided without asking -->
