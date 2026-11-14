# Kickoff prompts (paste into your IDE agent)

## Session 1: Phase 0 (plan only, no code)
```
Read README.md, AGENTS.md, docs/PRD.md, docs/ARCHITECTURE.md, docs/DATA_MODEL.md,
docs/DESIGN_SYSTEM.md, docs/STANDARDS_CHECKLIST.md, docs/WORKFLOW.md and TASKS.md.
Your job is task P0-01 only: do NOT write application code.
Produce docs/PLAN.md containing: (1) architecture summary and any changes you propose to
ARCHITECTURE.md with reasons, (2) final monorepo folder structure, (3) risks and assumptions,
(4) answers/proposals for the open questions in PRD.md section 10, (5) anything in TASKS.md you
would reorder or split, (6) the list of third-party accounts I must create (with free tiers).
Mark P0-01 done and stop. Wait for me to say "go" (P0-02).
```

## Every later session
```
Follow the start-of-session routine in AGENTS.md. Claim the first unclaimed task in the current
phase, restate the plan in 5 lines, implement it to the Definition of Done in docs/WORKFLOW.md,
update the checklist rows and TASKS.md, open a PR, and write a handoff note if anything is
unfinished. Stop and ask me for anything listed under "When to stop and ask a human".
```

## Parallel agents
Run one agent per lane (`infra`, `api`, `web`, `mobile`) on different tasks in the same phase. Each claims a task in `TASKS.md` first. Cross-lane needs go in "Cross-lane requests", not into another lane's code.
