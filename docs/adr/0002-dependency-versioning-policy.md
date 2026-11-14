# ADR-0002: Dependency Versioning and Pinning Policy

Status: Accepted · Date: 2026-11-14

## Context
When building a production-grade platform with modern monorepo tooling (pnpm, Turborepo, Next.js, NestJS, Expo), dependencies frequently evolve. Picking arbitrary older versions or anchoring to historic documentation text leads to stale dependencies, premature technical debt, and missing out on security and performance patches. Conversely, blindly adopting experimental or unproven versions can cause build or runtime instability.

A clear, objective policy is required for establishing baseline versions and updating packages.

## Decision
1. **Default to Current Stable `latest`**:
   Every package in the monorepo matrix must default to the current stable `latest` major/minor release as reported by `pnpm view <pkg> dist-tags.latest`.
2. **Proving Incompatibility with Evidence**:
   An agent or engineer may only recommend or pin an older line (such as a previous major or LTS/backport branch) if they can prove an incompatibility with verifiable evidence.
   - Proof requires:
     - Documented peer dependency conflict via `pnpm view <pkg> peerDependencies`,
     - Node engine incompatibility against the host/target Node runtime via `pnpm view <pkg> engines`, OR
     - Reproducible build/test failure with command output and error logs.
3. **Comprehensive dist-tags Inspection**:
   When evaluating versions, always query `pnpm view <pkg> dist-tags` (never single uncontextualized `version` queries) to inspect `latest`, `next`, `beta`, `rc`, and major release tags.
4. **Exact Pinning in Manifests**:
   Once resolved, versions must be strictly pinned in root and workspace `package.json` files to guarantee reproducible builds across local machines and CI.

## Consequences
+ **Pros**: Eliminates stale pins; guarantees alignment with active upstream documentation and security maintenance; provides an unambiguous evidence-based standard for upgrades.
− **Cons**: Requires verifying breaking changes and release notes when adopting newer major lines (e.g. Next.js 16 async APIs, NestJS 12).

## Alternatives considered
- *Anchor to initial prompt text (e.g., Next.js 15)*: Rejected because documentation templates age quickly; adopting older lines without proven necessity creates immediate technical debt.
- *Use unpinned wildcards (`*` or `^` everywhere)*: Rejected because non-deterministic dependency resolution breaks CI builds and introduces unpredictable drift.
