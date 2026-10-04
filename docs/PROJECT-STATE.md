# BazaarLink Project State

## Sources of truth

1. Product Specification V1 — defines intended product scope and behavior.
2. Actual repository — defines current implementation reality.
3. Software Development Workflow V5 — defines implementation process.

## Repository baseline

- Repository: Alisina137/bazaar-
- Local project root: existing user folder named `bazaar`
- Default branch: main
- Active product phase: Phase 1 — Foundation
- Phase branch: phase-01-foundation
- Initial repository state: empty before Phase 1 planning
- Phase baseline commit: 536d7b575182988cfb31ee9c483fe5f50f19f228
- Package manager: pnpm 12.6
- Minimum Node.js: 22.13

## Phase 1 — Foundation

### Product outcomes

- Monorepo/application foundation
- Design system
- Dari, Pashto, and English localization with RTL/LTR behavior
- Authentication
- Account roles
- Core PostgreSQL database layer

### Phase acceptance

The application boots reliably and users can authenticate in all supported languages.

### Task plan

- [ ] 1.1 Repository and monorepo foundation
- [ ] 1.2 Shared design system and mobile application shell
- [ ] 1.3 Localization, RTL/LTR, and AFN formatting foundation
- [ ] 1.4 Core PostgreSQL data layer and database tooling
- [ ] 1.5 Authentication and secure session foundation
- [ ] 1.6 Account roles, authorization boundaries, and Phase 1 integration/regression

## Task 1.1 — Repository and monorepo foundation

### Scope

- pnpm workspace and shared TypeScript baseline
- Expo mobile app foundation
- Fastify API foundation with a health route
- Next.js administration foundation
- Next.js public storefront companion foundation
- shared package boundaries for contracts, design tokens, localization, and database
- environment example and Git-safe ignore rules
- repository verification scripts
- GitHub Actions verification workflow
- project README and run commands

### Verification

Implementation committed. Automated verification is pending the first CI run and/or local dependency installation.

## Current task

Task 1.1 — Repository and monorepo foundation.

## Known external requirements

No external credentials are required for Task 1.1.

Database credentials will be required when Task 1.4 reaches live PostgreSQL integration.
